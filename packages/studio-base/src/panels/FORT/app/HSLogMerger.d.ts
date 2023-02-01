import { PdrLog } from './PdrLog';
export declare class HSLogMerger {
    static dbg: boolean;
    static process(pdrLogJson: PdrLog.Json, hslogBuffer: ArrayBuffer): PdrLog.Json;
}
