export declare class MathUtility {
    /**
     * Evaluates interpolating line/lines at the set of numbers for the function y=f(x)
     * Ported from: https://github.com/BorisChumichev/everpolate/blob/master/everpolate.browserified.js
     * @param pointsToEvaluate number or set of numbers for which polynomial is calculated
     * @param functionValuesX set of distinct x values
     * @param functionValuesY set of distinct y=f(x) values
     * @param extrapolateIfNeeded perform extrapolation if point is outside givn intervals.
     */
    static linearInterpolate(pointsToEvaluate: number[], functionValuesX: number[], functionValuesY: number[], extrapolateIfNeeded: boolean): number[];
    /**
     * Get the median value for an array of sorted numbers.
     * @param values
     */
    static median(values: number[]): number;
    /**
     * Compute standard deviation.
     * @param values
     */
    static std(values: number[]): number;
}
