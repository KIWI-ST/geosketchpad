import { Vec2, Vec4, Vec3 } from "kiwi.matrix";
import { Ellipsoid } from "./Ellipsoid";
import { Projection, WebMercatorProjection } from "./Projection";
import { Rectangle } from './Rectangle';

/**
 * 瓦片组织规范
 * https://github.com/AnalyticalGraphicsInc/cesium/blob/f87fbadb79d8410deeb5c3f66228c235344a44f2/Source/Core/WebMercatorTilingScheme.js#L42
 */
class QuadtreeTileSchema {
    /**
     * 
     */
    private numberOfLevelZeroTilesX: number;

    /**
     * 
     */
    private numberOfLevelZeroTilesY: number;

    /**
     * 
     */
    private projection: Projection;

    /**
     * 
     */
    private ellipsoid: Ellipsoid;

    /**
     * 半轴xPi
     */
    private semimajorAxisTimesPi: number;

    /**
     * 投影坐标表示的地理范围(西南)
     */
    private rectangleSouthwestInMeters: Vec2;

    /**
     * 投影坐标表示的地理范围(东北)
     */
    private rectangleNortheastInMeters: Vec2;

    /**
     * 
     * @param projection 
     * @param xNumber 
     * @param yNumber 
     */
    constructor(projection: Projection, xNumber: number = 1, yNumber: number = 1) {
        this.numberOfLevelZeroTilesX = xNumber | 1;
        this.numberOfLevelZeroTilesY = yNumber | 1;
        this.projection = projection;
        this.ellipsoid = projection.Ellipsoid;
        this.semimajorAxisTimesPi = projection.Ellipsoid.MaximumRadius * Math.PI;
        this.rectangleSouthwestInMeters = new Vec2().set(-this.semimajorAxisTimesPi, -this.semimajorAxisTimesPi);
        this.rectangleNortheastInMeters = new Vec2().set(this.semimajorAxisTimesPi, this.semimajorAxisTimesPi);
    }

    /**
     * 
     * @param level 
     */
    public getNumberOfXTilesAtLevel(level: number): number {
        return this.numberOfLevelZeroTilesX << level;
    }

    /**
     * 
     * @param level 
     */
    public getNumberOfYTilesAtLevel(level: number): number {
        return this.numberOfLevelZeroTilesY << level;
    }

    /**
     * 将瓦片x,y,level编号计算成投影后的坐标范围
     * @param x 
     * @param y 
     * @param level 
     */
    public tileXYToNativeRectangle(x: number, y: number, level: number): Vec4 {
        const xTiles = this.getNumberOfXTilesAtLevel(level),
            yTiles = this.getNumberOfYTilesAtLevel(level),
            xTileWidth = (this.rectangleNortheastInMeters.x - this.rectangleSouthwestInMeters.x) / xTiles;
        const west = this.rectangleSouthwestInMeters.x + x * xTileWidth,
            east = this.rectangleSouthwestInMeters.x + (x + 1) * xTileWidth,
            yTileHeight = (this.rectangleNortheastInMeters.y - this.rectangleSouthwestInMeters.y) / yTiles;
        const north = this.rectangleNortheastInMeters.y - y * yTileHeight,
            south = this.rectangleNortheastInMeters.y - (y + 1) * yTileHeight;
        return new Vec4().set(west, south, east, north);
    }

    /**
     * 
     * @param x 
     * @param y 
     * @param level 
     */
    public tileXYToRectangle(x: number, y: number, level: number): Rectangle {
        const [west, south, east, north] = this.tileXYToNativeRectangle(x, y, level).value;
        const projection = this.projection;
        const sw = projection.unproject(new Vec3().set(west, south, 0));
        const ne = projection.unproject(new Vec3().set(east, north, 0));
        return new Rectangle(sw, ne);
    }
}

//Web墨卡托
const webMercatorTileSchema = new QuadtreeTileSchema(new WebMercatorProjection(), 1, 1);

export {
    webMercatorTileSchema,
    QuadtreeTileSchema
}