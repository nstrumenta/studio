export declare class TimestampUnwrap {
    private static readonly UINT32_MAX;
    private static readonly WRAP_AMOUNT;
    private static readonly WRAP_THRESHOLD;
    prevTs: number | null;
    wrapCnt: number;
    /**
     * Unwrap LPOM timestamp and convert to seconds.
     */
    process(currentTs: number): number;
}
