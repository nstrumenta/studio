declare type CrcErr = {
    expected: number;
    actual: number;
};
/**
 * Generic SULPOM HighSpeed log decoder. It is up to the caller to register callbacks for the
 * types of frames they wish to consume.
 */
export declare class HsLogDecoder {
    onEntryStart?: (frame: Frames.EntryStart) => void;
    onMagRaw?: (frame: Frames.Axis3d) => void;
    onTemperature?: (frame: Frames.Temperature) => void;
    onAccelRaw?: (frame: Frames.Axis3d) => void;
    onGyroRaw?: (frame: Frames.Axis3d) => void;
    onQma?: (frame: Frames.Quaternion) => void;
    onMagAutocal?: (frame: Frames.Axis3d) => void;
    onAccelAutocal?: (frame: Frames.Axis3d) => void;
    onGyroAutocal?: (frame: Frames.Axis3d) => void;
    onTimestampFull?: (frame: Frames.TimestampFull) => void;
    onLinearAccel?: (frame: Frames.Axis3d) => void;
    onQ9Axis?: (frame: Frames.Quaternion) => void;
    onGyroBias?: (frame: Frames.Axis3d) => void;
    onPressure?: (frame: Frames.Pressure) => void;
    onDomStepInfo?: (frame: Frames.DomStepInfo) => void;
    onDomDsLinAccel?: (frame: Frames.Axis3d) => void;
    onDomDsQ?: (frame: Frames.Quaternion) => void;
    onDomDsMcal?: (frame: Frames.Axis3d) => void;
    onNandBlock?: (frame: Frames.NandBlock) => void;
    isProcessing: boolean;
    private unprocessedBytes;
    skipCrcErr: boolean;
    count: number;
    crcErrCount: number;
    reset(): void;
    decode(bytes: Uint8Array): void;
    private decodeRawAccelGyro;
    private decodeRawMag;
    private crc8Check;
    private decodeFrame;
}
export declare namespace Frames {
    type Base = {
        id: number;
        /** 32 bit frame timestamp. Multiply by 1e-6 to convert to seconds. */
        ts: number;
        /** If not null, then the crc8 check failed on this frame. */
        crcErr: CrcErr | null;
    };
    type EntryStart = Base & {
        serialNumber: number;
        epochSeconds: number;
    };
    type Axis3d = Base & {
        x: number;
        y: number;
        z: number;
    };
    type Quaternion = Base & {
        x: number;
        y: number;
        z: number;
        w: number;
    };
    type TimestampFull = Base & {
        upperBytes: number;
    };
    type Temperature = Base & {
        degrees: number;
    };
    type Pressure = Base & {
        hPa: number;
    };
    type DomStepInfo = Base & {
        stepNum: number;
        heading: number;
        confidence: number;
        stepLength: number;
    };
    type NandBlock = Base & {
        value: number;
    };
}
export {};
