/**
 * represent position in geographic coordinate system
 * 
 *          Z                                          
 *          |                                          
 *          |                                          
 *          |                                          
 *          |__ __ __ __ __ Y      
 *         / o                                        
 *        /                                          
 *       /                                         
 *      /                                          
 *      X                                         
 * 
 * @class
 */
class GeodeticCoordinate {
    /**
     * represent in meters
     */
    private alt: number;

    /**
     * represent in degree
     */
    private lat: number;

    /**
     * represent in degree
     */
    private lng: number;

    /**
     * 
     * @param lng in degree
     * @param lat in degree
     * @param alt in meters
     */
    constructor(lng: number, lat: number, alt: number = 0.0) {
        this.lng = lng;
        this.lat = lat;
        this.alt = alt;
    }

    /**
     * 转换成大地坐标（地球表面）
     * @returns 
     */
    public toGeodetic = () => {
        return new GeodeticCoordinate(this.lng, this.lat, 0);
    }

    /**
     * 判断是否为大地坐标（不带高程）
     * @returns 
     */
    public isGeodetic = (): boolean => {
        return this.alt === 0;
    }

    /**
     * @type {Number} the latitide value in degree
     */
    get Latitude() {
        return this.lat;
    }

    /**
     * @type {Number} the longitude value in degree
     */
    get Longitude() {
        return this.lng;
    }

    /**
     * @type {Number} the height value 
     */
    get Altitude() {
        return this.alt;
    }

    /**
     * 高程
     */
    set Altitude(v: number) {
        this.alt = v;
    }
}

export { GeodeticCoordinate }