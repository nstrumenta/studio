import { Component } from 'react';
import type { PdrLog } from '../PdrLog';
import { PdrLogManager } from '../PdrLogManager';
import './LoadDisc.css';
export declare type LoadRes = {
    pdrLogManager: PdrLogManager;
    videoUrl: string;
};
interface IProps {
    onClose: () => void;
    isOpen: boolean;
    isOnline: boolean;
    onLoadStart: () => void;
    onLoadDone: (res: LoadRes | null) => void;
}
interface IState {
    msg: string;
    pdrName: string;
    otherFiles: FileLI[];
    hasBin: boolean;
    isLoading: boolean;
    merge: boolean;
    replace: boolean;
}
declare type CurrentFiles = {
    pdrLog: {
        file: File;
        json: PdrLog.Json;
    } | null;
    video: File | null;
    bin: File | null;
    img: File | null;
    misc: File[];
};
declare const enum FileType {
    video = 0,
    bin = 1,
    img = 2,
    misc = 3
}
declare type FileLI = {
    type: FileType;
    name: string;
    mismatch: boolean;
    closeClick: () => void;
};
export declare class LoadDisc extends Component<IProps, IState> {
    private jsonInput;
    private pattern;
    currentFiles: CurrentFiles;
    constructor(props: IProps);
    componentDidMount(): void;
    shouldComponentUpdate(nextProps: IProps, nextState: IState): boolean;
    private makeInitialState;
    chooseJson(): void;
    jsonInputChange(evt: React.FormEvent<HTMLInputElement>): void;
    clearJsonInput(): void;
    updateOtherFiles(newFiles: File[]): void;
    private fileExt;
    private makeFileLi;
    loadHandle(): void;
    afterClose(): void;
    mergeChanged(evt: React.ChangeEvent<HTMLInputElement>): void;
    replaceEvt(evt: React.ChangeEvent<HTMLInputElement>): void;
    render(): JSX.Element;
}
export {};
