/// <reference types="google.maps" />
import type { PathPoint } from './PathPoint';
import type { Paths } from './PdrLogManager';
import { TruthPoint } from './TruthPoint';
declare type MapItem = {
    path: PathPoint[];
    pathIndex: number;
    polyline: google.maps.Polyline;
    currentMarker: Marker | null;
    pathMarkers: Marker[];
    visible: boolean;
};
declare type TruthItem = {
    path: TruthPoint[];
    pathIndex: number;
    polyline: google.maps.Polyline;
    currentMarker: Marker | null;
    pathMarkers: TruthMarker[];
    visible: boolean;
    changed: boolean;
};
declare type WaypointItem = {
    path: PathPoint[];
    markers: Marker[];
    visible: boolean;
    changed: boolean;
};
declare type StartItem = {
    point: PathPoint | null;
    marker: Marker | null;
    visible: boolean;
};
declare type Combined = {
    path: PathPoint[];
    pathIndex: number;
    initial: PathPoint[];
};
declare type Marker = google.maps.Marker & {
    info?: google.maps.InfoWindow;
};
declare type TruthMarker = Marker & {
    truthListener?: google.maps.MapsEventListener;
};
export declare const enum TruthPointGenMethod {
    none = "0",
    linearInterpolate = "1",
    rotateAndScale = "2"
}
export declare const enum RotateAndScalePath {
    gps = "GPS",
    dom = "DOM",
    fusion = "Fusion",
    ar = "AR"
}
interface MapCtrFields {
    map: HTMLElement;
    shownPaths: HTMLElement | null;
    trackPath: HTMLElement | null;
    visible: Visible;
}
declare type Visible = {
    start: boolean;
    gps: boolean;
    dom: boolean;
    truth: boolean;
    fusion: boolean;
    ar: boolean;
    ar2: boolean;
    waypoints: boolean;
};
export declare const enum TrackingMode {
    none = "none",
    gps = "gps",
    dom = "dom",
    fused = "fused",
    ar = "ar",
    truth = " truth"
}
declare type TruthDefaultsType = {
    method: TruthPointGenMethod;
    seperationTime: number;
    rotateAndScalePath: RotateAndScalePath;
};
export declare const TruthDefaults: Readonly<TruthDefaultsType>;
export declare class MapManager {
    private static readonly ACTIVE_MARKER_Z;
    private static readonly INACTIVE_MARKER_Z;
    private static readonly INACTIVE_START_Z;
    readonly map: google.maps.Map;
    private readonly icons;
    /** If this is true, then `timeZoomCb` will be invoked when the maps bounds are updated. */
    timeZoomEnabled: boolean;
    onTimeZoom: ((earliestIndex: number | null, latestIndex: number | null) => void) | null;
    onGpsMarkerUpdated: (() => void) | null;
    onTruthMarkerUpdated: (() => void) | null;
    onTruthUpdated: (() => void) | null;
    onRotateAndScaleErr: ((err: string) => void) | null;
    onWayUpdate: ((idx: number) => Promise<boolean>) | null;
    onWayRemove: ((idx: number) => Promise<boolean>) | null;
    truth: TruthItem;
    gps: MapItem;
    dom: MapItem;
    fusion: MapItem;
    ar: MapItem;
    ar2: MapItem;
    waypoint: WaypointItem;
    start: StartItem;
    combined: Combined;
    private pathPointTimeSpanListener;
    truthMethod: TruthPointGenMethod;
    seperationTime: number;
    rotateAndScalePath: string;
    private activeMarker;
    private trackingMode;
    containsChanges: boolean;
    constructor(fields: MapCtrFields);
    generatePaths(paths: Paths): void;
    private updateCombinedPath;
    setCheckPathPointsTimespan(enabled: boolean): void;
    updateTracking(newMode: string): void;
    centerMapOnSelectedPath(): void;
    /**
     * Returns an array withthe PathPoint indicies for all points currently shown
     * on the visible portion of the map.
     */
    private getPathPointTimespan;
    fitAllPathsInBounds(): void;
    updateCurrent(index: number, findPrevious?: boolean): number;
    /**
     * Update the appropriate map markers based on the passed point.
     * @param index Combined path index.
     * @param findPrevious If the user uses the slider, then make sure to update the other point type.
     */
    updateMarkers(index: number, findPrevious: boolean): void;
    private updatePriorMarkers;
    private updateStartMarker;
    /**
     * @param latLng
     * @param index Path point index.
     */
    private updateDomMarker;
    /**
     * @param latLng
     * @param index Path point index.
     */
    private updateGpsMarker;
    private updateTruthMarker;
    private updateFusionMarker;
    /**
     * @param latLng
     * @param index Path point index.
     */
    private updateArMarker;
    private updateAr2Marker;
    private setMouseOverInfoWindow;
    clearAllMarkersAndLines(): void;
    private pushTruthPoint;
    private insertTruthPointAt;
    private updateTruthPointAt;
    /**
     * Removes a truth point at the given idex. This is removed from the array, polyline, and markers.
     */
    private removeTruthPointAt;
    private removeTruthUntilNextKeyIsFound;
    private removeTruthUntilPriorKeyIsFound;
    private generateAndInsertTruthPoints;
    /**
     * Removes all truth points from the array, their polylines, and their markers.
     */
    private removeAllTruthPoints;
    private makeTruthPointMarker;
    private promotTruthPointAndMarker;
    private makeTruthParams;
    /**
     * Handles Adding new key truth points. Points are added betwee
     * key points via linear interpolation.
     */
    private truthPathClickHandler;
    private addTruthPointMarkerHandlers;
    setStartMarkerVisible(isVisible: boolean): void;
    setDomPathVisible(isVisible: boolean): void;
    setGpsPathVisible(isVisible: boolean): void;
    setTruthPathVisible(isVisible: boolean): void;
    setFusionPathVisible(isVisible: boolean): void;
    setArPathVisible(isVisible: boolean): void;
    setAr2PathVisible(isVisible: boolean): void;
    setWaypointMarkersVisible(isVisible: boolean): void;
    private waypointInfoText;
    private waypointUpdate;
    private waypointRemove;
    private generateTruthPoints;
    private linearInterpolate;
    private pathFit2Ref;
}
export {};
