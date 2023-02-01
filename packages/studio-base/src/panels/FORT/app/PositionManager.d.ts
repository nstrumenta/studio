export declare type Coord = {
    lat: number;
    lon: number;
};
export declare class PositionManager {
    private static a;
    private static e2;
    private static d2r;
    private static r2d;
    /** Initial latitude. This is in degrees. */
    ilat: number;
    /** Initial longitude. This is in degrees. */
    ilon: number;
    /** Initial height. Defaults to 0. This is in meters. */
    iheight: number;
    /** Current x position in meters from the origin. */
    x: number;
    /** Current y position in meters from the origin. */
    y: number;
    /**
     * @param ilat Initial latitude. This is in degrees.
     * @param ilon Initial longitude. This is in degrees.
     * @param iheight Initial height. Defaults to 0. This is in meters.
     */
    constructor(ilat: number, ilon: number, iheight?: number);
    /**
     * Update current position using new heading and step length.
     * @param heading New step heading to use to calculate position. This is in degrees.
     * @param declination Heading magnetic declination. This is in degrees.
     * @param stepLength Length of the step in meters.
     */
    headingToLatLon(heading: number, declination: number, stepLength?: number): Coord;
    updatePosition(heading: number, declination: number, stepLength?: number): void;
    currentLatLon(): Coord;
    pointToLatLon(x: number, y: number): Coord;
    /**
     * Finds lat/lon/h in ENU frame using WGS84 ellipsoid.
     * @param x X position in meters.
     * @param y Y position in meters.
     * @param ilat Initial latitude. This is in degrees.
     * @param ilon Initial longitude. This is in degrees.
     * @param iheight Initial height. This is in meters.
     */
    static E2G(x: number, y: number, ilat: number, ilon: number, iheight: number): Coord;
    /**
     * Uses WGS48 Ellipsoid to convert lat/lon/height to XYZ ENU frame.
     * @param lat Current latitude. This is in degrees.
     * @param lon Current longitude. This is in degrees.
     * @param ilat Initial latitude. This is in degrees.
     * @param ilon Initial longitude. This is in degrees.
     * @param iheight Initial height. This is in meters.
     */
    static G2E(lat: number, lon: number, ilat: number, ilon: number, iheight: number): {
        x: number;
        y: number;
    };
}
