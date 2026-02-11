import { GeodeticCoordinate, QuadtreeTile, Rectangle, webMercatorTileSchema, type Ellipsoid, type QuadtreeTileSchema } from "@pipegpu/geography";
import { BaseComponent } from "../BaseComponent";
import { utils, vec3, vec4, type Vec3, type Vec4 } from "wgpu-matrix";
import { Camera, PerspectiveCamera } from "@pipegpu/camera";
import type { CullingVolume } from "@pipegpu/camera/src/frustum/CullingVolume";

const MAXIMUM_SCREEN_SPACEERROR = 2.0;

/**
 * @class EllipsoidComponent
 * @description 
 */
class EllipsoidComponent extends BaseComponent {
    /**
     * 
     */
    private ellipsoid_: Ellipsoid;

    private quadtreeTileSchema_: QuadtreeTileSchema;

    private geometricErrors_: number[] = [];

    private maximumCameraHeights_: number[] = [];

    private viewportHeight_?: number;

    private zeroLevelTiles_?: QuadtreeTile[];

    private level_?: number;

    private visualRevealTiles_?: QuadtreeTile[];

    private sseDenominator_?: number;

    constructor(ellipsoid: Ellipsoid, quadtreeTileSchema: QuadtreeTileSchema) {
        super('EllipsoidComponent');
        this.ellipsoid_ = ellipsoid;
        this.quadtreeTileSchema_ = quadtreeTileSchema;
    }

    private computeMaximumGeometricError(level: number) {
        return this.ellipsoid_.MaximumRadius * Math.PI * 0.5 / (65 * this.quadtreeTileSchema_.getNumberOfXTilesAtLevel(level));
    }

    private computeLevelTilesZero() {
        const level: number = 0;
        const numberOfLevelZeroTilesX = this.quadtreeTileSchema_.getNumberOfXTilesAtLevel(level),
            numberOfLevelZeroTilesY = this.quadtreeTileSchema_.getNumberOfYTilesAtLevel(level),
            zeroLevelTiles: QuadtreeTile[] = [];
        let seed = 0;
        for (let y = 0; y < numberOfLevelZeroTilesY; ++y) {
            for (let x = 0; x < numberOfLevelZeroTilesX; ++x) {
                zeroLevelTiles[seed++] = new QuadtreeTile(this.quadtreeTileSchema_, x, y, 0);
            }
        }
        return zeroLevelTiles;
    }

    private pickZeroLevelQuadtreeTiles(position: Vec3): QuadtreeTile[] {
        if (this.quadtreeTileSchema_ === webMercatorTileSchema) {
            return this.zeroLevelTiles_!;
        }
        const zeroLevelQuadtreeTiles = this.zeroLevelTiles_;
        const pickedZeroLevelQuadtreeTiles: QuadtreeTile[] = [];
        const geodeticCoordinate = this.ellipsoid_.spaceToGeographic(position);
        zeroLevelQuadtreeTiles?.forEach((quadtreeTile) => {
            quadtreeTile.Boundary.Contain(geodeticCoordinate) ? pickedZeroLevelQuadtreeTiles.push(quadtreeTile) : null;
        });
        return pickedZeroLevelQuadtreeTiles;
    }

    private computeSpaceError = (quadtreeTile: QuadtreeTile, camera: Camera): number => {
        const level = quadtreeTile.Level,
            maxGeometricError = this.geometricErrors_[level],
            sseDenominator = this.sseDenominator_,
            height = this.viewportHeight_;
        // const distance = this.camera.positionCartographic.height
        const distance = 0.1;
        return (maxGeometricError * height!) / (distance * sseDenominator!);
    }

    /**
     * @param sseDenominator frustum sseDernmoinator
     * @param viewportHeight viewport height, in pixel.
     */
    private refreshQuadTree(sseDenominator: number, viewportHeight: number) {
        // const sseDenominator = this.SseDenominator = (this.camera as any).frustum.sseDenominator;
        for (let i = 0; i <= 20; i++) {
            const geometricError = this.computeMaximumGeometricError(i);
            this.geometricErrors_[i] = geometricError;
            this.maximumCameraHeights_[i] = geometricError * viewportHeight / (sseDenominator * MAXIMUM_SCREEN_SPACEERROR);
        }
        this.zeroLevelTiles_ = this.computeLevelTilesZero();
    }

    private computeTileDistanceToCamera(quadtreeTile: QuadtreeTile, camera: Camera): number {
        const tileGeoCoord = new GeodeticCoordinate(
            quadtreeTile.SphereBoundary[0],
            quadtreeTile.SphereBoundary[1],
            quadtreeTile.SphereBoundary[2]
        );
        //quadtreeTile.Boundary.Center.Longitude
        const boundary = this.ellipsoid_.geographicToSpace(tileGeoCoord);
        const a: number = camera.Position[0] - boundary[0];
        const b: number = camera.Position[1] - boundary[1];
        const c: number = camera.Position[2] - boundary[2];
        return Math.sqrt(a * a + b * b + c * c) - quadtreeTile.SphereBoundary[3];
    }

    private computeHorizonQuad(camera: Camera): Vec3[] {
        const radii = this.ellipsoid_.Radii;
        const p = camera.Position;
        const q = vec3.multiply(radii, p);
        const qMagnitude = vec3.len(q);
        const qUnit = vec3.normalize(q);
        const UNIT_Z = vec3.create(0.0, 0.0, 1.0);

        let eUnit: Vec3;
        let nUnit: Vec3;
        if (vec3.equals(qUnit, UNIT_Z)) {
            eUnit = vec3.create(0, 1, 0);
            nUnit = vec3.create(0, 0, 1);
        } else {
            eUnit = vec3.normalize(vec3.cross(UNIT_Z, qUnit));
            nUnit = vec3.normalize(vec3.cross(qUnit, eUnit));
        }

        const wMagnitude = Math.sqrt(vec3.lenSq(q) - 1.0);
        const center = vec3.mulScalar(qUnit, 1.0 / qMagnitude);
        const scalar = wMagnitude / qMagnitude;
        const eastOffset = vec3.mulScalar(eUnit, scalar);
        const northOffset = vec3.mulScalar(nUnit, scalar);

        const horizonPoints = [vec3.create(), vec3.create(), vec3.create(), vec3.create()];
        const upperLeft = vec3.add(center, northOffset, horizonPoints[0]);
        vec3.subtract(upperLeft, eastOffset, upperLeft);
        vec3.mul(radii, upperLeft, upperLeft);

        const lowerLeft = vec3.subtract(center, northOffset, horizonPoints[1]);
        vec3.subtract(lowerLeft, eastOffset, lowerLeft);
        vec3.mul(radii, lowerLeft, lowerLeft);

        const lowerRight = vec3.subtract(center, northOffset, horizonPoints[2]);
        vec3.add(lowerRight, eastOffset, lowerRight);
        vec3.mul(radii, lowerRight, lowerRight);

        const upperRight = vec3.add(center, northOffset, horizonPoints[3]);
        vec3.add(upperRight, eastOffset, upperRight);
        vec3.mul(radii, upperRight, upperRight);

        return horizonPoints;
    }

    private computeViewRectangle(camera: Camera) {
        let cullingVolume: CullingVolume;
        if (camera instanceof PerspectiveCamera) {
            cullingVolume = camera.Frustum.ComputeCullingVolume(camera.Position, camera.Direction, camera.Up);
        } else {
            throw new Error(`[E][EllipsoidComponent][updateQuadtreeTileByDistanceError] only support perspectiveCamera compute culling volume.`);
        }
        let bInsect: boolean = true;
        // TODO:: set 0,0,0 to ellipsoid position.
        const sphere: Vec4 = vec4.create(0, 0, 0, this.ellipsoid_.MaximumRadius);
        cullingVolume.Planes.forEach((plane: Vec4) => {
            const center = vec3.create(sphere[0], sphere[1], sphere[2]);
            const radius = sphere[3];
            const planeNormal = vec3.create(plane[0], plane[1], plane[2]);
            const planeDistance = plane[3];
            const distance = vec3.dot(planeNormal, center) + planeDistance;
            if (distance < -radius) {
                bInsect = false;
                return;
            }
        });
        // visible
        if (bInsect) {

            const computedHorizonQuad = this.computeHorizonQuad(camera);
            let successfulPickCount = 0;
            // successfulPickCount += addToResult(
            //     0,
            //     0,
            //     0,
            //     this,
            //     ellipsoid,
            //     computedHorizonQuad,
            // );


        }

    }

    private updateQuadtreeTileByDistanceError(camera: Camera) {
        const position = vec3.clone(camera.Position);
        let level = 0;
        const rootTiles = this.pickZeroLevelQuadtreeTiles(position);
        const rawQuadtreeTiles: QuadtreeTile[] = [];
        const renderingQuadtreeTiles: QuadtreeTile[] = [];

        const viewRawRect = this.computeViewRectangle(camera);

        // const viewRect: Rectangle = new Rectangle(
        //     new GeodeticCoordinate(utils.radToDeg(viewRawRect.west), utils.radToDeg(viewRawRect.south)),
        //     new GeodeticCoordinate(utils.radToDeg(viewRawRect.east), utils.radToDeg(viewRawRect.north)),
        // );
        // const IntersectQuadtreeTile = (qTile: QuadtreeTile): boolean => {
        //     return viewRect.Intersect(qTile.Boundary);
        // };
        // const liter = (quadtreeTile: QuadtreeTile) => {
        //     const distance = this.computeTileDistanceToCamera(quadtreeTile, camera);
        //     if (distance > this.camera.positionCartographic.height * 20.0) {
        //         return;
        //     }
        //     const error = this.computeSpaceError(quadtreeTile);
        //     if (error > MAXIMUM_SCREEN_SPACEERROR) {
        //         for (let i = 0; i < 4; i++) {
        //             const child = quadtreeTile.Children[i];
        //             if (IntersectQuadtreeTile(child)) {
        //                 liter(child);
        //             }
        //         }
        //     }
        //     else {
        //         const litLevel = quadtreeTile.Level;
        //         level = litLevel > level ? litLevel : level;
        //         rawQuadtreeTiles.push(quadtreeTile);
        //     }
        // };
        // //calcute from root tile
        // for (let i = 0, len = rootTiles.length; i < len; i++) {
        //     liter(rootTiles[i]);
        // }
        // //filter level of tile
        // for (let i = 0, len = rawQuadtreeTiles.length; i < len; i++) {
        //     const quadtreeTile = rawQuadtreeTiles[i];
        //     if (quadtreeTile.Level === level) {
        //         renderingQuadtreeTiles.push(quadtreeTile);
        //     }
        // }
        // this.level_ = level;
        // this.visualRevealTiles_ = renderingQuadtreeTiles;
    }

    /**
    * @description
    * @param b 
    */
    public override async enable(b: boolean): Promise<void> {
        this.enabled_ = b;
    }

    /**
     * 
     */
    public override async update(...args: any[]): Promise<void> {
        if (!args || (args && !(args[0] instanceof Camera))) {
            console.warn(`[W][EllipsoidComponent] invalid main camera, skip update.`);
        }

        const camera: Camera = args[0] as Camera;
        // geometricError and maximumCameraHeight init.
        if (!this.geometricErrors_ && !this.maximumCameraHeights_) {
            this.refreshQuadTree(camera.SseDenominator(), camera.ViewportHeight);
        }

        this.updateQuadtreeTileByDistanceError(camera);
    }
}

export {
    EllipsoidComponent
}