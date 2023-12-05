import { GLMatrix,Vec3 } from 'kiwi.matrix';

import { GeodeticCoordinate } from './GeodeticCoordinate';
import { sin, log, atan, exp } from '../util/fixed';
import { Ellipsoid, PSEUDOMERCATOR } from './Ellipsoid';

/**
 * 投影类
 * @class
 */
abstract class Projection {
    /**
     * 参考椭球
     */
    protected ellipsoid: Ellipsoid;

    /**
     * 
     */
    protected semimajorAxis: number;
    /**
     * 
     */
    protected oneOverSemimajorAxis: number;

    /**
     * 
     * @param options 
     */
    constructor(ellipsoid: Ellipsoid) {
        this.ellipsoid = ellipsoid;
        this.semimajorAxis = this.ellipsoid.MaximumRadius;
        this.oneOverSemimajorAxis = 1.0 / this.semimajorAxis;
    }

    /**
     * @type {Ellipsoid}
     */
    get Ellipsoid() {
        return this.ellipsoid;
    }

    /**
     * 
     * @param geographic geographic in radius
     */
    abstract project(geographic: GeodeticCoordinate): Vec3;

    /**
     * 
     * @param v3 
     */
    abstract unproject(v3: Vec3): GeodeticCoordinate;

    abstract getResolution(zoomLevel: number): number;

    abstract getMaxZoomResolution(): number;
}

/**
 * Web墨卡托投影
 * @author axmand
 */
class WebMercatorProjection extends Projection {

    /**
     * 
     */
    private maximumLatitude: number = 85.0511287798;

    private maxZoom: number = 23;

    protected resolutions: number[] = [];

    private tilePixelSize: number = 256;

    constructor() {
        super(PSEUDOMERCATOR);
        const resolutions: number[] = [];
        const d = 2 * this.semimajorAxis * Math.PI;
        for (let i = 0; i < this.maxZoom; i++)
            resolutions[i] = d / (this.tilePixelSize * Math.pow(2, i));
        this.resolutions = resolutions;
    }

    /**
     * Converts a Mercator angle, in the range -PI to PI, to a geodetic latitude in the range -PI/2 to PI/2.
     * @param mercatorAngle in radius
     */
    private mercatorAngleToGeodeticLatitude(mercatorAngle: number): number {
        return Math.PI / 2 - (2.0 * atan(exp(-mercatorAngle)));
    }

    /**
     * 地理坐标转球面墨卡托夹角
     * @param latitude 
     */
    private geodeticLatitudeToMercatorAngle(latitude: number): number {
        const maximumLatitude = this.maximumLatitude;
        if (latitude > maximumLatitude)
            latitude = maximumLatitude;
        else if (latitude < -maximumLatitude)
            latitude = -maximumLatitude;
        const sinLatitude = sin(latitude);
        return 0.5 * log((1.0 + sinLatitude) / (1.0 - sinLatitude));
    }

    /**
     * 大地坐标转投影坐标
     * @param geographic 
     */
    public project(geographic: GeodeticCoordinate): Vec3 {
        const semimajorAxis = this.semimajorAxis;
        const x = GLMatrix.toRadian(geographic.Longitude) * semimajorAxis,
            y = this.geodeticLatitudeToMercatorAngle(GLMatrix.toRadian(geographic.Latitude)) * semimajorAxis,
            z = geographic.Altitude;
        return new Vec3().set(x, y, z);
    }

    /**
     * 投影坐标转大地坐标
     * @param v3 
     */
    public unproject(v3: Vec3): GeodeticCoordinate {
        const oneOverEarthSemimajorAxis = this.oneOverSemimajorAxis,
            longitude = v3.x * oneOverEarthSemimajorAxis,
            latitude = this.mercatorAngleToGeodeticLatitude(v3.y * oneOverEarthSemimajorAxis),
            height = v3.z;
        return new GeodeticCoordinate(GLMatrix.toDegree(longitude), GLMatrix.toDegree(latitude), height);
    }

    /**
     * 获取指定缩放层级地理分辨率
     * @param zoomLevel 
     * @returns 
     */
    public getResolution(zoomLevel: number): number {
        return this.resolutions[zoomLevel];
    }

    /**
     * 获取最大缩放层级对应的地理分辨率
     * @returns 
     */
    public getMaxZoomResolution(): number {
        const maxZoom = this.maxZoom - 1;
        return this.resolutions[maxZoom];
    }
}

export { Projection, WebMercatorProjection }