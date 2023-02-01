import { Component } from 'react';
import type { CreatePathsFields } from '../PdrLogManager';
import { PdrLogManager } from '../PdrLogManager';
import type { TruthPoint } from '../TruthPoint';
import { MapManager } from '../MapManager';
import type { PdrLog } from '../PdrLog';
import type { PathPoint } from '../PathPoint';
import '../split.css';
import './Playback.css';
import '../playButton.css';
interface IProps {
    onLoadStart: () => void;
    onLoadEnd: (err: string | null) => void;
    onError: (msg: string) => void;
    onReqConfirm: (msg: string) => Promise<boolean>;
}
interface IState {
    showStart: boolean;
    showDom: boolean;
    showGps: boolean;
    showFusion: boolean;
    showAr: boolean;
    showWaypoints: boolean;
    showTruth: boolean;
    trackingMode: string;
}
export declare type Visible = {
    start: boolean;
    gps: boolean;
    dom: boolean;
    fusion: boolean;
    ar: boolean;
    waypoints: boolean;
    truth: boolean;
};
export declare type Export = {
    json: PdrLog.Json;
    name: string;
};
export declare type Params = {
    pathLength: string;
    linAccelRMS: string;
    down: string;
    posErrRMS: string;
};
export declare type SaveNstFields = {
    videoTimeOffset: number;
    truth: TruthPoint[];
    posErrRMS?: number;
    imgPromise: Promise<Blob | null>;
};
export declare class Playback extends Component<IProps, IState> {
    static readonly defaultVisibility: Visible;
    private mapVideoSplit;
    private plotSplit;
    private mapSplit;
    private videoSplit;
    private mapRef;
    private readonly trackPathRef;
    private readonly shownPathsParentRef;
    private readonly showPathsBtnRef;
    private readonly shownPathsDropdownRef;
    private timeWrap;
    private currentTime;
    private totalTime;
    private otherCtrlsBtn;
    private otherCtrlsDrop;
    private plotlyRef;
    slider: import("react").RefObject<HTMLInputElement>;
    sliderTitle: import("react").RefObject<HTMLSpanElement>;
    startBtn: import("react").RefObject<HTMLButtonElement>;
    playSpeed: import("react").RefObject<HTMLInputElement>;
    timeZoom: import("react").RefObject<HTMLInputElement>;
    videoOffset: import("react").RefObject<HTMLInputElement>;
    videoEl: import("react").RefObject<HTMLVideoElement>;
    init: boolean;
    pdrLogManager: PdrLogManager | null;
    mapMng: MapManager | null;
    private paused;
    private nextIdx;
    private zoomStartIdx;
    private zoomNextIdx;
    private zoomEndIdx;
    private posErrRange;
    private resizeCb;
    constructor(props: IProps);
    componentDidMount(): void;
    componentWillUnmount(): void;
    handleNewPdrLogManager(pdrLogManager: PdrLogManager, videoUrl?: string): void;
    generateInitialPaths(options: CreatePathsFields): void;
    regeneratePaths(fusionOn: boolean, truthStart: boolean, ignoreWay: boolean): void;
    removePaths(): void;
    applyTimeZoomToSlider(earliestIndex: number | null, latestIndex: number | null): void;
    resizePlot(): void;
    export(): Export | null;
    fieldsForSaveNst(): {
        videoTimeOffset: number;
        truth: TruthPoint[];
        posErrRMS: number;
        imgPromise: Promise<Blob | null>;
        way: PathPoint[];
    };
    fetchParams(): Params | null;
    takeMapScreenshot(): Promise<Blob | null>;
    /**
     * The main playback loop. Iterates over each path point and updates the UI appropriately.
     * The path point index is updated and the function calls itself after pausing for the correct
     * amount of time to give a real-time feel.
     */
    private playback;
    private endOfPlayback;
    private createPaths;
    private updateSlider;
    private calcPosError;
    private changeTimeZoom;
    private updatePlotHover;
    truthUpdated(): void;
    private updateFusedVsTruthInPlot;
    trackingModeUpdated(evt: React.ChangeEvent<HTMLSelectElement>): void;
    showStartChanged(evt: React.ChangeEvent<HTMLInputElement>): void;
    showDomChanged(evt: React.ChangeEvent<HTMLInputElement>): void;
    showGpsChanged(evt: React.ChangeEvent<HTMLInputElement>): void;
    showFusedChanged(evt: React.ChangeEvent<HTMLInputElement>): void;
    showArChanged(evt: React.ChangeEvent<HTMLInputElement>): void;
    showTruthChanged(evt: React.ChangeEvent<HTMLInputElement>): void;
    showWaypointsChanged(evt: React.ChangeEvent<HTMLInputElement>): void;
    private htmlToImage;
    private videoError;
    render(): JSX.Element;
}
export {};
