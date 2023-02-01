import type { PathPoint } from './PathPoint';
import type { TruthPoint } from './TruthPoint';
export declare type PointSet = {
    errors: number[];
    timesFromStart: number[];
};
/**
 * Calculates error metrics by comparing truth and fused path.
 *
 * Ported from: https://bitbucket.org/pnisensor/event-pdr-project/src/master/SystemFunctions/positionErrorVsTruth.m
 */
export declare class PositionErrorVsTruth {
    static getStatistics(truthPathPoints: TruthPoint[], fusedPathPoints: PathPoint[]): {
        mean: number;
        median: number;
        max: number;
        min: number;
        std: number;
        rms: number;
    } | null;
    static getPointSet(truthPathPoints: TruthPoint[], fusedPathPoints: PathPoint[]): PointSet;
}
