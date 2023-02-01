import { Component } from 'react';
import './PathGen.css';
export declare type RegenFields = {
    replaceStart: boolean;
    willFuse: boolean;
    ignoreWay: boolean;
};
interface IProps {
    onClose: () => void;
    isOpen: boolean;
    onRegen: (fields: RegenFields) => void;
}
interface IState {
    replaceStart: boolean;
    willFuse: boolean;
    ignoreWay: boolean;
    isRegen: boolean;
}
export declare class PathGen extends Component<IProps, IState> {
    constructor(props: IProps);
    shouldComponentUpdate(nextProps: IProps, nextState: IState): boolean;
    replaceStartEvt(evt: React.FormEvent<HTMLInputElement>): void;
    willFuseEvt(evt: React.FormEvent<HTMLInputElement>): void;
    ignoreWayEvt(evt: React.FormEvent<HTMLInputElement>): void;
    regenClick(): void;
    afterClose(): void;
    render(): JSX.Element;
}
export {};
