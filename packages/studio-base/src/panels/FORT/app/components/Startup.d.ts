import { Component } from 'react';
import './Startup.css';
export declare type ChangeFields = {
    isOnline: boolean;
};
interface IProps {
    isOnline: boolean;
    status: string;
    onStart: (apiKey: string) => void;
    onChange: (fields: ChangeFields) => void;
}
interface IState {
    showApiKey: boolean;
}
export declare class Startup extends Component<IProps, IState> {
    private apiKey;
    private keyOn;
    private keyOff;
    constructor(props: IProps);
    updateShowApiKey(value: boolean): void;
    apiKeyUpdated(evt: React.ChangeEvent<HTMLInputElement>): void;
    typeChanged(evt: React.ChangeEvent<HTMLInputElement>): void;
    startClick(): void;
    render(): JSX.Element;
}
export {};
