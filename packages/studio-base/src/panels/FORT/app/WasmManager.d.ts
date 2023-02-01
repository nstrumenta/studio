import type { FusionWrapper, RunPathFit2RefType } from './WasmModule';
export declare class WasmManagerClass {
    fusionWrapper: FusionWrapper | null;
    runPathFit2Ref: RunPathFit2RefType | null;
    private isLoading;
    load(): Promise<void>;
    isLoaded(): RunPathFit2RefType | null;
}
declare const WasmManager: WasmManagerClass;
export default WasmManager;
