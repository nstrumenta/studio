import { Component } from 'react';
import './Confirm.css';
interface IProps {
}
interface IState {
    msg: string;
    open: boolean;
    choice: boolean;
}
export declare class Confirm extends Component<IProps, IState> {
    private resolve;
    constructor(props: IProps);
    open(msg: string): Promise<boolean>;
    private cancelEvt;
    private okEvt;
    private closeEvt;
    render(): JSX.Element;
}
export {};
