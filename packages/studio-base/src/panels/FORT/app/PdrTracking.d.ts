export declare type RemoteFile = {
    /** The name of the remote file. */
    name: string;
    /** The path of the remote file. */
    path: string;
    /** The unique id of the file. Used for replacing an uploaded file. */
    dataId: string;
};
export interface PdrTrackingItem {
    pdrWorkFile: RemoteFile;
    pdrMergeSrcFile: RemoteFile | null;
    hsLogFile: RemoteFile | null;
    videoFile: RemoteFile | null;
    imageFile: RemoteFile | null;
    miscFiles: RemoteFile[];
    DateTime: string;
    TruthPath: number;
    FusedPath: number;
    StartLatLng: [lat: number, lon: number];
    TimeZone: string;
    firmware: string;
    serialNumber: string;
    appVersion: string;
    deviceModel: string;
    osVersion: string;
    sensorFusionFlags: [mag: number, accel: number, gyro: number];
    gyroBiasMode: number;
    timeConstants: (number | null)[] | [
        magX_qeX: number | null,
        magY_qeY: number | null,
        magZ_qeZ: number | null,
        accelX: number | null,
        accelY: number | null,
        accelZ: number | null,
        gbiasX: number | null,
        gbiasY: number | null,
        gBiasZ: number | null,
        aDm: number | null,
        aR: number | null,
        mR: number | null,
        beoff: number | null,
        md: number | null,
        ad: number | null
    ];
    temperature: number;
    userLabel: string;
    gyroBias: [x: number, y: number, z: number];
    devicePosition?: string;
    PathLength: number;
    LinAccelRMS: number;
    Down: [x: number, y: number, z: number];
    PosErrRMS: number;
    Tester: string;
    VideoTimeOffset: number;
    VideoRotation: number;
    LatLngOffsetMeters: [lat: number, lon: number];
    Tags: string;
    Notes: string;
}
export declare const enum Tags {
    TRACKING_ITEM = "TRACKING_ITEM"
}
