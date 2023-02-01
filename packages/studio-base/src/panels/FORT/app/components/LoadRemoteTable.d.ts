import { Component } from 'react';
import { Tabulator } from 'tabulator-tables';
import type { PdrTrackingItem } from '../PdrTracking';
import 'tabulator-tables/dist/css/tabulator.min.css';
import './LoadRemoteTable.css';
export interface LoadRemoteRow {
    name: string;
    date: Date | null;
    tester: string;
    pathLength: number;
    posErrRMS: number;
    linAccelRMS: number;
    truth: boolean;
    trackingItem: PdrTrackingItem;
    remoteFilepath: string;
    dataId: string;
}
export declare type SelectedRow = {
    trackingItem: PdrTrackingItem;
    remoteFilepath: string;
    dataId: string;
};
interface IProps {
    rows: LoadRemoteRow[];
    onRowSelected: (row: SelectedRow) => void;
}
export declare class LoadRemoteTable extends Component<IProps> {
    private tableRef;
    private table;
    private tableBuilt;
    private currRows;
    componentDidMount(): void;
    componentDidUpdate(): void;
    componentWillUnmount(): void;
    rowSelected(row: Tabulator.RowComponent): void;
    render(): JSX.Element;
}
export {};
