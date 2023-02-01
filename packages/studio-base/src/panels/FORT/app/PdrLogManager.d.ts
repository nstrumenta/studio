import { PdrLog } from './PdrLog';
import { PathPoint } from './PathPoint';
import { TruthPoint } from './TruthPoint';
import type { PdrTrackingItem } from './PdrTracking';
declare type GpsTimeSeriePoint = {
    tsUnwrapped: number;
    timeFromStart: number;
    accuracy: number;
    speed: number;
};
declare type DataPointFields = {
    tsUnwrapped: number;
    timeFromStart: number;
    isAddedPoint?: boolean;
};
export declare type DataPoint = (PdrLog.Data | PdrLog.Waypoint) & DataPointFields;
export declare type CreatePathsFields = {
    currTruth: TruthPoint[];
    currWaypoint?: PathPoint[];
    fusionOn: boolean;
    useTruthAsStart: boolean;
    noWaypointFusion: boolean;
};
declare type NstFields = {
    remoteFilepath: string;
    dataId: string;
    trackingItem: PdrTrackingItem;
};
export declare type ExportFields = {
    truth: TruthPoint[];
    waypoints?: PathPoint[];
    videoOffset: number;
};
export declare type Paths = {
    combined: PathPoint[];
    dom: PathPoint[];
    gps: PathPoint[];
    fusion: PathPoint[];
    waypoints: PathPoint[];
    ar: PathPoint[];
    truth: TruthPoint[];
    ar2: PathPoint[];
};
/**
 * Class that takes LPOM-Comms-App json file and generates the paths to be shown
 * on google maps.
 */
export declare class PdrLogManager {
    static readonly videoOffsetDefault = 0;
    readonly pdrLog: PdrLog.Json;
    readonly filename: string;
    startPoint: PdrLog.StartDom | null;
    private dataPoints;
    private initialTruthPoints;
    private fusionDataPoints;
    private domDataPoints;
    replaceStartWithTruth: boolean;
    gpsPathLength: number | null;
    fusionPathLength: number | null;
    linearAccelRMS: number;
    down: {
        x: number;
        y: number;
        z: number;
    };
    gpsTimeSeries: GpsTimeSeriePoint[];
    nstFields: NstFields | null;
    /**
     * @throws
     */
    constructor(pdrLog: PdrLog.Json | null, filename: string);
    createPaths(fields: CreatePathsFields): Paths;
    export(fields: ExportFields): PdrLog.Json;
    static formatTruthForExport(truth: TruthPoint[]): PdrLog.Truth[];
    static formatWayForExport(way: PathPoint[]): PdrLog.Waypoint[];
    private getAccuracy;
    private getSpeed;
}
export {};
