import { Component } from 'react';
import type { UpdateFields } from '../PdrRepoApi';
import type { PdrTrackingItem } from '../PdrTracking';
import './SaveRemote.css';
export declare type OnStartRes = {
    fields: UpdateFields | null;
    err: string | null;
};
export declare type OnMetaStartRes = {
    dataId: string;
    trackingItem: PdrTrackingItem;
    remoteFilepath: string;
};
export declare type SaveChange = {
    tester?: string;
    tags?: string;
    notes?: string;
    userLabel?: string;
    devPos?: string;
};
interface IProps {
    onClose: () => void;
    isOpen: boolean;
    metaOnly: boolean;
    onSaveStart: () => Promise<OnStartRes>;
    onMetaStart: () => Promise<OnMetaStartRes>;
    onDone: () => void;
    onChange: (fields: SaveChange) => void;
    tester: string;
    tags: string;
    notes: string;
    userLabel: string;
    devPos: string;
}
interface IState {
    msg: string;
    saveDisabled: boolean;
}
export declare class SaveRemote extends Component<IProps, IState> {
    constructor(props: IProps);
    testerEvt(evt: React.FormEvent<HTMLInputElement>): void;
    tagsEvt(evt: React.FormEvent<HTMLInputElement>): void;
    notesEvt(evt: React.FormEvent<HTMLInputElement>): void;
    userLabelEvt(evt: React.FormEvent<HTMLInputElement>): void;
    devPosEvt(evt: React.FormEvent<HTMLInputElement>): void;
    saveHandle(): void;
    afterClose(): void;
    private makeInitialState;
    render(): JSX.Element;
}
export {};
