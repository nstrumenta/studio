import type { PdrLog } from './PdrLog';
import type { Coord } from './CoreType';
import type { DataPoint } from './PdrLogManager';
export declare type PathPointCtrParams = {
    lat: number;
    lon: number;
    date: Date;
    type: PdrLog.Names;
    typeIndex: number;
    ts: number;
    tsUnwrapped: number;
    timeFromStart: number;
};
export declare class PathPoint {
    lat: number;
    lon: number;
    date: Date;
    type: PdrLog.Names;
    typeIndex: number;
    ts: number;
    tsUnwrapped: number;
    timeFromStart: number;
    constructor(params: PathPointCtrParams);
    static from(point: DataPoint, coord: Coord, i: number): PathPoint;
    clone(): PathPoint;
    setPosition(lat: number, lon: number): void;
}
