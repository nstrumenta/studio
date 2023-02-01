import { Component } from 'react';
import type { LoadRemoteRow, SelectedRow } from './LoadRemoteTable';
interface IProps {
    onClose: () => void;
    isOpen: boolean;
    rows: LoadRemoteRow[];
    onLoad: (row: SelectedRow) => void;
}
interface IState {
    isLoad: boolean;
}
export declare class LoadRemote extends Component<IProps, IState> {
    constructor(props: IProps);
    shouldComponentUpdate(nextProps: IProps): boolean;
    rowSelected(row: SelectedRow): void;
    afterClose(): void;
    render(): JSX.Element;
}
export {};
