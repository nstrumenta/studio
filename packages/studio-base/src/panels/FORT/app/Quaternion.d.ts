export declare class Quaternion {
    /**
     * Convert quaternion to dcm.
     * Down is `[dcm[2], dcm[5], dcm[8]]`
     */
    static q2dcm(x: number, y: number, z: number, w: number): number[];
    static q2ypr2(q: {
        x: number;
        y: number;
        z: number;
        w: number;
    }): {
        yaw: number;
        pitch: number;
        roll: number;
    };
}
