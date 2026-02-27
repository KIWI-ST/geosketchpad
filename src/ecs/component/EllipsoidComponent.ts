import { GeodeticCoordinate, QuadtreeTile, webMercatorTileSchema, type Ellipsoid, type QuadtreeTileSchema } from "@pipegpu/geography";
import { Camera } from "@pipegpu/camera";
import { vec3d, type Vec3d } from "wgpu-matrix";

import { BaseComponent } from "../BaseComponent";

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

    /**
     * 
     */
    private quadtreeTileSchema_: QuadtreeTileSchema;

    /**
     * 
     */
    private geometricErrors_: number[] = [];

    /**
     * 
     */
    private maximumCameraHeights_: number[] = [];

    /**
     * 
     */
    private zeroLevelTiles_?: QuadtreeTile[];

    /**
     * 
     */
    private level_: number = 0;

    /**
     * 
     */
    private visualRevealTiles_: QuadtreeTile[] = [];

    public get Level(): number {
        return this.level_;
    }

    public get VisualRevealTiles(): QuadtreeTile[] {
        return this.visualRevealTiles_;
    }

    /**
     * 
     * @param ellipsoid 
     * @param quadtreeTileSchema 
     */
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

    private pickZeroLevelQuadtreeTiles(position: Vec3d): QuadtreeTile[] {
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

    /**
     * ref: https://github.com/CesiumGS/cesium/blob/main/packages/engine/Source/Scene/QuadtreePrimitive.js
     * @param quadtreeTile 
     * @param camera 
     * @param {number} ch client height of canvas in pixel format.
     * @returns 
     */
    private computeSpaceError = (quadtreeTile: QuadtreeTile, camera: Camera, ch: number): number => {
        const level = quadtreeTile.Level,
            maxGeometricError = this.geometricErrors_[level],
            sseDenominator = camera.getSseDenominator(),
            height = ch;
        const positionCartographic = this.ellipsoid_.spaceToGeographic(camera.Position);
        const distance = positionCartographic.Altitude;
        return (maxGeometricError * height!) / (distance * sseDenominator!);
    }

    /**
     * @param sseDenominator frustum sseDernmoinator
     * @param ch client height in pixel format. without device ratio.
     */
    private refreshQuadTree(sseDenominator: number, ch: number) {
        for (let i = 0; i <= 20; i++) {
            const geometricError = this.computeMaximumGeometricError(i);
            this.geometricErrors_[i] = geometricError;
            this.maximumCameraHeights_[i] = geometricError * ch / (sseDenominator * MAXIMUM_SCREEN_SPACEERROR);
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

    /**
     * 
     * @param camera 
     * @param {number} cw client widht in pixel. 
     * @param {number} ch client height in pixel. 
     * @returns 
     */
    private updateQuadtreeTileByDistanceError(camera: Camera, cw: number, ch: number) {
        const cameraPosition = vec3d.clone(camera.Position);
        let level = 0;
        const rootTiles = this.pickZeroLevelQuadtreeTiles(cameraPosition);
        const rawQuadtreeTiles: QuadtreeTile[] = [];
        const renderingQuadtreeTiles: QuadtreeTile[] = [];
        const viewRect = camera.ComputeViewRectangle(this.ellipsoid_, cw, ch);

        // no valid view rect area.
        if (!viewRect) {
            return;
        }

        const IntersectQuadtreeTile = (qTile: QuadtreeTile): boolean => {
            return viewRect.Intersect(qTile.Boundary);
        };

        const liter = (quadtreeTile: QuadtreeTile) => {
            const distance = this.computeTileDistanceToCamera(quadtreeTile, camera);
            const positionCartographic = this.ellipsoid_.spaceToGeographic(camera.Position);
            if (distance > positionCartographic.Altitude * 20.0) {
                return;
            }
            const error = this.computeSpaceError(quadtreeTile, camera, ch);
            if (error > MAXIMUM_SCREEN_SPACEERROR) {
                for (let i = 0; i < 4; i++) {
                    const child = quadtreeTile.Children[i];
                    if (IntersectQuadtreeTile(child)) {
                        liter(child);
                    }
                }
            }
            else {
                const litLevel = quadtreeTile.Level;
                level = litLevel > level ? litLevel : level;
                rawQuadtreeTiles.push(quadtreeTile);
            }
        };
        //calcute from root tile
        for (let i = 0, len = rootTiles.length; i < len; i++) {
            liter(rootTiles[i]);
        }
        //filter level of tile
        for (let i = 0, len = rawQuadtreeTiles.length; i < len; i++) {
            const quadtreeTile = rawQuadtreeTiles[i];
            if (quadtreeTile.Level === level) {
                renderingQuadtreeTiles.push(quadtreeTile);
            }
        }
        this.level_ = level;
        this.visualRevealTiles_ = renderingQuadtreeTiles;
    }

    /**
    * @description
    * @param b 
    */
    public override async enable(b: boolean): Promise<void> {
        this.enabled_ = b;
    }

    /**
     * @param {Camera} args[0], instance of camera. main camera component.
     * @param {number} args[1], client width, canvas client width of pixel, without device ratio. e.g as '600'
     * @param {number} args[2], client height, canvas client width of pixel, without device ratio. e.g as '600'
     */
    public override async update(...args: any[]): Promise<void> {
        if (!args || (args && !(args[0] instanceof Camera))) {
            console.warn(`[W][EllipsoidComponent] invalid main camera, skip update.`);
        }
        const camera: Camera = args[0] as Camera;

        // geometricError and maximumCameraHeight init.
        const cw: number = (args[1]) as number;
        const ch: number = (args[2]) as number;
        if (this.geometricErrors_.length === 0 && this.maximumCameraHeights_.length === 0) {
            this.refreshQuadTree(camera.getSseDenominator(), ch);
        }

        // 
        this.updateQuadtreeTileByDistanceError(camera, cw, ch);
    }
}

export {
    EllipsoidComponent
}