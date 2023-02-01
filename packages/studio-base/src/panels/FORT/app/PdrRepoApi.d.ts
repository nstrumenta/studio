import type { PdrLog } from './PdrLog';
import type { PdrLogManager } from './PdrLogManager';
import type { PdrTrackingItem } from './PdrTracking';
export declare type AddFields = {
    pdrLog: {
        file: File;
        json: PdrLog.Json;
    };
    video: File | null;
    bin: File | null;
    img: File | null;
    misc: File[];
    pdrLogManager: PdrLogManager;
    merged: null | {
        name: string;
        json: PdrLog.Json;
    };
};
export declare type UpdateFields = {
    pdrLog: {
        name: string;
        json: PdrLog.Json;
    };
    image: {
        name: string;
        blob: Blob;
    } | null;
    trackingItem: PdrTrackingItem;
    remoteFilepath: string;
    dataId: string;
};
export declare type MergeUpdateFields = {
    merged: {
        name: string;
        json: PdrLog.Json;
    };
    bin: File;
    trackingItem: PdrTrackingItem;
    remoteFilepath: string;
    dataId: string;
};
export declare type GetTrackingItem = {
    remoteFilepath?: string;
    name?: string;
};
declare class PdrRepoApiClass {
    addPdrLog(fields: AddFields, onProgress: (msg: string) => void): Promise<{
        remoteFilepath: string;
        dataId: string;
        trackingItem: PdrTrackingItem;
    }>;
    updatePdrLog(fields: UpdateFields, onProgress: (msg: string) => void): Promise<void>;
    mergeUpdate(fields: MergeUpdateFields, onProgress: (msg: string) => void): Promise<void>;
    getPdrTrackingFile(): Promise<import("./NstFileClient").QueryResult[]>;
    updateTrackingFile(dataId: string, trackingItem: PdrTrackingItem): Promise<void>;
    getTrackingItemQuery(fields: GetTrackingItem): Promise<import("./NstFileClient").QueryResult[]>;
    getTrackingItem(fields: GetTrackingItem): Promise<{
        trackingItem: PdrTrackingItem;
        dataId: string;
        remoteFilepath: string;
    }>;
    getPdrLogFile(name: string, remoteFilePath: string): Promise<PdrLog.Json>;
}
declare const PdrRepoApi: PdrRepoApiClass;
export { PdrRepoApi };
