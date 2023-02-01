import { Component } from 'react';
import { PdrLogManager } from '../PdrLogManager';
import type { TruthPoint } from '../TruthPoint';
import type { PathPoint } from '../PathPoint';
import type { PdrTrackingItem } from '../PdrTracking';
import './MergeHsLog.css';
export declare type MergeFields = {
    truthChanged: boolean;
    pendingTruth: TruthPoint[];
    wayChanged: boolean;
    pendingWay: PathPoint[];
    nst: null | {
        trackingItem: PdrTrackingItem;
        remoteFilepath: string;
        dataId: string;
    };
};
/**
 * I am going to assume that this feature won't be used much. I will also assume that
 * the open json isn't merged and the user has the bin file they wish to merge to.
 * Maybe in the future these assumptions could change and the app could attempt to pull
 * the src json and bin from nstrumenta, but that seems like a lot...
 */
interface IProps {
    onClose: () => void;
    isOpen: boolean;
    isOnline: boolean;
    pdrLogManager: PdrLogManager | null;
    fields: MergeFields | null;
    onStart: () => void;
    onDone: (pdrLogManager: PdrLogManager | null) => void;
}
interface IState {
    msg: string;
    binName: string;
    mergeDisabled: boolean;
    modTruth: boolean;
    modWay: boolean;
}
export declare class MergeHsLog extends Component<IProps, IState> {
    private binInput;
    private bin;
    constructor(props: IProps);
    shouldComponentUpdate(nextProps: IProps, nextState: IState): boolean;
    componentDidUpdate(prevProps: Readonly<IProps>): void;
    chooseBin(): void;
    binInputChange(evt: React.FormEvent<HTMLInputElement>): void;
    clearBinInput(): void;
    mergeHandle(): void;
    afterClose(): void;
    private makeInitialState;
    private modTruthEvt;
    private modWayEvt;
    render(): JSX.Element;
}
export {};
