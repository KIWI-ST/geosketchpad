enum EARTH {
    /**
    * the radius in x axis of earth in meters
    */
    RADIUS_X = 6378137.0,

    /**
    * the radius in y axis of earth in meters
    */
    RADIUS_Y = 6378137.0,

    /**
    *  the radius in z axis of earth in meters
    */
    RADIUS_Z = 6356752.3142451793,
}

enum LUNAR {
    /**
     * the mean radius of moon in meters
     */
    LUNAR_RADIUS = 1737400.0,
}

enum SOLAR {
    /**
     * the radius of the sun in meters
     */
    SOLAR_RADIUS = 6.955e8,
}

export {
    LUNAR,
    EARTH,
    SOLAR
}