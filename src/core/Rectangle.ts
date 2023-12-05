import { GLMatrix } from 'kiwi.matrix';

import { EPSILON } from '../util/epsilon';
import { GeodeticCoordinate } from './GeodeticCoordinate';

const TWO_PI = 2 * Math.PI;

/**
 * 求公约数
 * @param m 
 * @param n 
 */
const modValue = function (m: number, n: number): number {
    return ((m % n) + n) % n;
};

/**
 * 
 * @param angle in radian
 */
const zeroToTwoPi = function (angle: number) {
    const mod = modValue(angle, TWO_PI);
    return Math.abs(mod) < EPSILON.EPSILON14 && Math.abs(angle) > EPSILON.EPSILON14 ? TWO_PI : mod;
};

/**
 * 
 * @param angle in radian
 */
const negativePiToPi = function (angle: number): number {
    return zeroToTwoPi(angle + Math.PI) - Math.PI;
};

/**
 * 基于大地坐标表示的地理范围
 * @class
 */
class Rectangle {

    /**
     * left side position in meters
     */
    private west: number;

    /**
     * bottom side position in meters
     */
    private south: number;

    /**
     * right side position in meters
     */
    private east: number;

    /**
     * top side position in meters
     */
    private north: number;

    /**
     * -支持使用经纬度表示的地理范围
     * @param sw southwest 经纬度表示(degree)
     * @param ne northeast 经纬度表示(degree)
     */
    constructor(sw: GeodeticCoordinate, ne: GeodeticCoordinate) {
        this.south = sw.Latitude;
        this.west = sw.Longitude;
        this.north = ne.Latitude;
        this.east = ne.Longitude;
    }

    /**
     * 地理范围最大值
     */
    static MAX_VALUE = new Rectangle(new GeodeticCoordinate(-180, -90), new GeodeticCoordinate(180, 90));

    /**
     * range X
     */
    get Width(): number {
        const east = this.east, west = this.west;
        return east < west ? east + Math.PI * 2 - west : east - west;
    }

    /**
     * range Y
     */
    get Height(): number {
        const north = this.north, south = this.south;
        return north - south;
    }

    /**
     * 
     */
    get Bounds(): Array<GeodeticCoordinate> {
        return [this.Southwest, this.Northwest, this.Northeast, this.Southeast];
    }

    /**
     * get southwets in radians
     */
    get Southwest(): GeodeticCoordinate {
        return new GeodeticCoordinate(this.west, this.south, 0.0);
    }

    /**
    * get north west in radians
    */
    get Northwest(): GeodeticCoordinate {
        return new GeodeticCoordinate(this.west, this.north, 0.0);
    }

    /**
     * 
     */
    get Northeast(): GeodeticCoordinate {
        return new GeodeticCoordinate(this.east, this.north, 0.0);
    }

    /**
     * get sourheast in radians
     */
    get Southeast(): GeodeticCoordinate {
        return new GeodeticCoordinate(this.east, this.south, 0.0);
    }

    /**
     * get center of rectangle
     */
    get Center(): GeodeticCoordinate {
        const west = GLMatrix.toRadian(this.west),
            south = GLMatrix.toRadian(this.south),
            north = GLMatrix.toRadian(this.north);
        let east = GLMatrix.toRadian(this.east);
        east = east < west ? east + TWO_PI : east;
        const longitude = negativePiToPi((west + east) * 0.5);
        const latitude = (south + north) * 0.5;
        return new GeodeticCoordinate(GLMatrix.toDegree(longitude), GLMatrix.toDegree(latitude), 0.0);
    }

    /**
     * 计算地理坐标是否在范围内
     * @param geodeticCoordinate 
     */
    public Contain(geodeticCoordinate: GeodeticCoordinate): boolean {
        const lng = GLMatrix.toRadian(geodeticCoordinate.Longitude), lat = GLMatrix.toRadian(geodeticCoordinate.Latitude);
        const west = GLMatrix.toRadian(this.west), south = GLMatrix.toRadian(this.south), north = GLMatrix.toRadian(this.north);
        let east = GLMatrix.toRadian(this.east);
        east = east < west ? east + TWO_PI : east;
        return (lng > west || Math.abs(lng - west) <= EPSILON.EPSILON14) && (lng < east || Math.abs(lng - east) <= EPSILON.EPSILON14) && lat >= south && lat <= north;
    }
}

export { Rectangle }