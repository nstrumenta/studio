import { Component } from 'react';
import { RotateAndScalePath, TruthPointGenMethod } from '../MapManager';
import './TruthSettings.css';
interface IProps {
    onChange: (fields: Fields) => void;
    onClose: () => void;
    isOpen: boolean;
    method: TruthPointGenMethod;
    sepTime: number;
    rotScale: RotateAndScalePath;
}
interface IState {
}
export declare type Fields = {
    method?: TruthPointGenMethod;
    sepTime?: number;
    rotScale?: RotateAndScalePath;
};
export declare class TruthSettings extends Component<IProps, IState> {
    constructor(props: IProps);
    shouldComponentUpdate(nextProps: Readonly<IProps>): boolean;
    methodChanged(evt: React.ChangeEvent<HTMLInputElement>): void;
    sepTimeChange(evt: React.ChangeEvent<HTMLInputElement>): void;
    rotScaleChange(evt: React.ChangeEvent<HTMLSelectElement>): void;
    render(): JSX.Element;
}
export {};
