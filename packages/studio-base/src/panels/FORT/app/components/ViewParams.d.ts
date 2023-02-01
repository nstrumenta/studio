import { Component } from 'react';
import './ViewParams.css';
interface IProps {
    onClose: () => void;
    isOpen: boolean;
    pathLength: string;
    linAccelRMS: string;
    down: string;
    posErrRMS: string;
}
interface IState {
}
export declare class ViewParams extends Component<IProps, IState> {
    shouldComponentUpdate(nextProps: Readonly<IProps>): boolean;
    render(): JSX.Element;
}
export {};
