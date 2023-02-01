import type { PdrTrackingItem } from './PdrTracking';
export declare type UploadFields = {
    name: string;
    data: Blob;
    tags?: string[];
    dataId?: string;
    overwrite?: boolean;
};
export declare type UploadRes = {
    dataId: string;
    remoteFilePath: string;
};
export declare type UpdateMetadataFields = {
    dataId: string;
    meta: {
        [key: string]: any;
    };
};
export declare type QueryFields = {
    tags?: string[];
    metadata?: {
        [key: string]: any;
    };
};
export declare type QueryResult = {
    id: string;
    size: number;
    filePath: string;
    lastModified: number;
    name: string;
    dataId: string;
    tags?: string[];
    trackingItem?: PdrTrackingItem;
};
declare class NstFileClientClass {
    endpoints: {
        ADMIN_UTILS: string;
        GET_MACHINES: string;
        GET_UPLOAD_URL: string;
        GET_UPLOAD_DATA_URL: string;
        REGISTER_AGENT: string;
        LIST_AGENTS: string;
        SET_AGENT_ACTION: string;
        GET_AGENT_ID_BY_TAG: string;
        CLEAN_AGENT_ACTIONS: string;
        GET_DOWNLOAD_URL: string;
        GET_PROJECT_DOWNLOAD_URL: string;
        GENERATE_DATA_ID: string;
        LIST_MODULES: string;
        GET_TOKEN: string;
        VERIFY_TOKEN: string;
        VERIFY_API_KEY: string;
        SET_STORAGE_OBJECT: string;
        SET_DATA_METADATA: string;
        LIST_STORAGE_OBJECTS: string;
        QUERY_DATA: string;
        v2: {
            LIST_MODULES: string;
        };
    };
    apiKey: string | null;
    upload(fields: UploadFields): Promise<UploadRes>;
    updateMetadata(fields: UpdateMetadataFields): Promise<void>;
    query(fields: QueryFields): Promise<QueryResult[]>;
    getDownloadUrl(remoteFilePath: string): Promise<string>;
    makeError(ex: unknown, baseMsg: string): string;
}
declare const client: NstFileClientClass;
export { client as NstFileClient };
