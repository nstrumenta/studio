export declare class PathLength {
    prevLat: number;
    prevLon: number;
    pathLength: number;
    constructor(startLat: number, startLon: number);
    /**
     * Ported from: https://bitbucket.org/pnisensor/event-pdr-project/src/master/SystemFunctions/findPathLength.m
     */
    process(lat: number, lon: number): void;
}
