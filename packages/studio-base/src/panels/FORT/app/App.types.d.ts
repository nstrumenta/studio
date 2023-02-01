import type { LoadRemoteRow } from './components/LoadRemoteTable';
import type { MergeFields } from './components/MergeHsLog';
import type { RotateAndScalePath, TruthPointGenMethod } from './MapManager';
import type { PdrLogManager } from './PdrLogManager';
export interface IProps {
}
export interface IState {
    isOnline: boolean;
    errorMsg: string;
    isErrorShown: boolean;
    startupStatus: string;
    isStartingUp: boolean;
    menuOpen: boolean;
    loadDiscOpen: boolean;
    logName: string;
    logOpen: boolean;
    loading: boolean;
    loadRemoteOpen: boolean;
    loadRemoteRows: LoadRemoteRow[];
    paramsOpen: boolean;
    pathLength: string;
    linAccelRMS: string;
    down: string;
    posErrRMS: string;
    truthOpen: boolean;
    truthMethod: TruthPointGenMethod;
    sepTime: number;
    rotScale: RotateAndScalePath;
    mergeOpen: boolean;
    mergeModalFields: MergeFields | null;
    pdrLogManager: PdrLogManager | null;
    genOpen: boolean;
    saveRemoteOpen: boolean;
    saveRemoteMetaOnly: boolean;
    tester: string;
    tags: string;
    notes: string;
    userLabel: string;
    devPos: string;
}
