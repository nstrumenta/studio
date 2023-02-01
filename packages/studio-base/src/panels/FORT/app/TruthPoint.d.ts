import { PathPoint } from './PathPoint';
export declare type TruthPointCtrParams = {
    isKey: boolean;
    lat: number;
    lon: number;
    date: Date;
    ts: number;
    tsUnwrapped: number;
    timeFromStart: number;
};
export declare class TruthPoint extends PathPoint {
    isKey: boolean;
    constructor(params: TruthPointCtrParams, i: number);
}
