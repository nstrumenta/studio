export declare namespace PdrLog {
    const enum Names {
        START_DOM = "START_DOM",
        STOP_DOM = "STOP_DOM",
        DOM = "DOM",
        GPS = "GPS",
        DS_IN = "DS_IN",
        DS_IN_MCAL = "DS_IN_MCAL",
        DS_IN_Q = "DS_IN_Q",
        TIMESTAMP_FULL = "TIMESTAMP_FULL",
        DISCONNECTED = "DISCONNECTED",
        RECONNECTED = "RECONNECTED",
        ERROR = "ERROR",
        START_VIDEO = "START_VIDEO",
        TRUTH_POSITION = "TRUTH_POSITION",
        FUSED_LOCATION = "FUSED_LOCATION",
        WAYPOINT = "WAYPOINT",
        AR = "AR",
        AR2 = "AR2",
        MAG_RAW = "MAG_RAW",
        MAG_AUTOCAL = "MAG_AUTOCAL",
        ACCEL_RAW = "ACCEL_RAW",
        ACCEL_AUTOCAL = "ACCEL_AUTOCAL",
        GYRO_RAW = "GYRO_RAW",
        GYRO_AUTOCAL = "GYRO_AUTOCAL",
        Q_MAG_ACCEL = "Q_MAG_ACCEL",
        Q_9AXIS = "Q_9AXIS",
        LINEAR_ACCEL = "LINEAR_ACCEL",
        GYRO_BIAS = "GYRO_BIAS",
        TEMPERATURE = "TEMPERATURE",
        PRESSURE = "PRESSURE"
    }
    /** These are the native data types found in a PdrLog */
    type NativeData = StartDom | StopDom | Dom | Gps | DsLinearAccel | DsMcal | DsQ | TimestampFull | Disconnected | Reconnected | PdrError | StartVideo | Ar | Ar2;
    /** These are the data types that can be added by merging a PdrLog with a HsLog */
    type MergedData = MagRawLog | MagAutocalLog | AccelRawLog | AccelAutocalLog | GyroRawLog | GyroAutocalLog | QMagAccelLog | Q9AxisLog | LinearAccelLog | GyroBiasLog | TemperatureLog | PressureLog;
    type Data = NativeData | MergedData;
    type PlaybackSettings = {
        videoTimeOffset: number;
        replaceStartWithTruth?: boolean;
    };
    type Json = {
        firmware: string;
        serialNumber: string;
        appVersion: string;
        deviceModel: string;
        osVersion: string;
        data: Data[];
        truthPositions?: Truth[];
        fusedLocations: Fusion[];
        waypoints: Waypoint[];
        playbackSettings?: PlaybackSettings;
        electronAppVersion?: string;
        merged?: number;
        iosDeviceModel?: string;
        iosVersion?: string;
    };
    type StartDom = {
        ts: number;
        appTs: string;
        name: Names.START_DOM;
        coordinate: Coordinate;
        gpsTs: string;
        values: GpsValues;
        batteryLevel?: number;
        userLabel: string;
        tester?: string;
        declination: number;
        temperature: TemperatureValues;
        gyroBias: Sensor3Axis;
        settings: Settings;
        configFile: ConfigFile | null;
        locationSource: 'manual' | 'gps';
        devicePosition: string;
        deviceHeading?: [magneticHeading: number, trueHeading: number, headingAccuracy: number];
    };
    type StopDom = {
        ts: number;
        appTs: string;
        name: Names.STOP_DOM;
        temperature: TemperatureValues;
        batteryLevel?: number;
        gyroBias: Sensor3Axis;
    };
    type Dom = {
        ts: number;
        appTs: string;
        name: Names.DOM;
        coordinate: Coordinate;
        temperature: TemperatureValues;
        domInfo: DomInfo;
        rssi: number;
    };
    type Gps = {
        ts: number;
        appTs: string;
        name: Names.GPS;
        coordinate: Coordinate;
        gpsTs: string;
        values: GpsValues;
    };
    /** DOM Downsampled Linear Accel. */
    type DsLinearAccel = {
        ts: number;
        appTs: string;
        name: Names.DS_IN;
        values: Sensor3Axis;
    };
    /** DOM Downsampled Mag Autocal. */
    type DsMcal = {
        ts: number;
        appTs: string;
        name: Names.DS_IN_MCAL;
        values: Sensor3Axis;
    };
    /** DOM Downsampled Quaternion. */
    type DsQ = {
        ts: number;
        appTs: string;
        name: Names.DS_IN_Q;
        values: Q4Axis;
    };
    type TimestampFull = {
        ts: number;
        appTs: string;
        name: Names.TIMESTAMP_FULL;
        values: [upperBytes: number];
    };
    type Disconnected = {
        ts: number;
        appTs: string;
        name: Names.DISCONNECTED;
        batteryLevel?: number;
    };
    type Reconnected = {
        ts: number;
        appTs: string;
        name: Names.RECONNECTED;
    };
    type PdrError = {
        ts: number;
        appTs: string;
        name: Names.ERROR;
        message: string;
    };
    type StartVideo = {
        ts: number;
        appTs: string;
        name: Names.START_VIDEO;
    };
    type Fusion = {
        ts: number;
        appTs: string;
        name: Names.FUSED_LOCATION;
        coordinate: Coordinate;
        temperature: TemperatureValues;
        refUncertainty: number;
        domInfo: DomInfo;
    };
    type Waypoint = {
        ts: number;
        appTs: string;
        name: Names.WAYPOINT;
        coordinate: Coordinate;
        tsUnwrapped: number;
    };
    type Ar = {
        ts: number;
        appTs: string;
        name: Names.AR;
        trackingState: 'unknown' | 'limited (insufficientFeatures)' | 'limited (excessiveMotion)' | 'limited (initializing)' | 'normal' | 'notAvailable' | 'limited (relocalizing)';
        accuracy?: number;
        values: Sensor3Axis;
        dbg?: ArDebug;
    };
    type Ar2 = {
        ts: number;
        appTs: string;
        name: Names.AR2;
        values: Sensor3Axis;
    };
    type Truth = {
        name: Names.TRUTH_POSITION;
        appTs: string;
        ts: number;
        coordinate: [lat: number, lon: number];
        keyTruthPoint: boolean;
    };
    /**
     * Terms:
     *  - "pov":  Point of view. See https://developer.apple.com/documentation/scenekit/scnscenerenderer/1523982-pointofview
     *    Basically, this represents the position and rotation of the iPhone's forward facing camera.
     *  - "camera": An alternative way to get position and rotation of the iPhone's forward
     *    facing camera. This is not used currently. See https://developer.apple.com/documentation/arkit/arframe/2867980-camera
     *  - "anchor": In this case this will refer to the starting anchor. When the user taps
     *    "Start Walk", the transformation matrix from the "pov" at that current time is first
     *    grabbed. The rotation of the this matrix is then adjusted to ypr of (0, 0, 0). ARKit is
     *    then instructed to place an anchor using that transformation. Future points are then
     *    calculated by converting their transformation from its own space to that of the anchor.
     */
    type ArDebug = {
        /**
         * The "point of view" object. This object is obtained from `sceneView.pointPfView` in
         * ARKit. Apple's documentation is available here: https://developer.apple.com/documentation/scenekit/scnscenerenderer/1523982-pointofview
         *
         * This is currently the primary object resposible for calculating position.
         */
        pov: {
            /**
             * 4x4 transformation matrix. This is the raw transformation matrix. */
            T: Transform4x4;
            /**
             * 4x4 transformation matrix. This is the trasnformation after converting from its own space
             * to that of the starting node/anchor.
             * The math for this I believe is `start.rootNodeT * inverse(start.anchorT) * pov.T` */
            convT: Transform4x4;
        };
        /**
         * The current AR frame's camera object. This object is obtained from
         * `sceneView.session.currentFrame.camera`. Timestamp values are calculated using
         * `sceneView.session.currentFrame.timestamp`.
         * Apple's documentation for currentFrame is here: https://developer.apple.com/documentation/arkit/arsession/2865621-currentframe
         * while camera is here: https://developer.apple.com/documentation/arkit/arframe/2867980-camera
         */
        camera: null | {
            /**
             * 4x4 transformation matrix. This is the raw transformation matrix. */
            T: Transform4x4;
            /**
             * 4x4 transformation matrix. This is the trasnformation after converting from its own space
             * to that of the starting node/anchor.
             * The math for this I believe is `start.rootNodeT * inverse(start.anchorT) * pov.T` */
            convT: Transform4x4;
            /**
             * Final camera position. This is calculated by taking [m41, m42, m43] from `convT`,
             * rotating to NED, then rotating x/y to `dbg.start.facingAngle`. */
            pos: [x: number, y: number, z: number];
            /**
             * The ISO date-string of the current AR frame. */
            arTs: string;
            /**
             * UInt32 LPOM timestamp based off of arTs. */
            ts: number;
        };
        /**
         * Starting AR states. This is only present on the first AR sample. */
        start: ArDebugStart | null;
    };
    type Transform4x4 = [
        [
            m11: number,
            m21: number,
            m31: number,
            m41: number
        ],
        [
            m12: number,
            m22: number,
            m32: number,
            m42: number
        ],
        [
            m13: number,
            m23: number,
            m33: number,
            m43: number
        ],
        [
            m14: number,
            m24: number,
            m34: number,
            m44: number
        ]
    ];
    type ArDebugStart = {
        /**
         * The 4x4 transformation matrix at walk start. This is used to construct anchorT/nodeT.
         * This is done by setting the rotation portion of povT to 3x3 identity.
         */
        povT: Transform4x4;
        /**
         * The 4x4 transformation matrix of the starting anchor. If this is null, then
         * something internal is corrupt. */
        anchorT: null | Transform4x4;
        /**
         * The 4x4 transformation matrix of the starting node. The starting node is placed at the
         * position of the starting anchor. This is less important than anchorT. */
        nodeT: null | Transform4x4;
        /**
         * The 4x4 transformation matrix of the root node in ARKit.
         * This will most likely be the identity matrix. */
        rootNodeT: Transform4x4;
        /**
         * The orientation when the user starts their walk. */
        ypr: [yaw: number, pich: number, roll: number];
        /**
         * The orientation when the ARKit worldTrackingSession first starts and `trackingState`
         * reads `normal`. It is possible to start a walk prior to the state reading `normal`.
         * In that case this property is null. */
        sessionStartYpr: null | [yaw: number, pich: number, roll: number];
        /**
         * The device facing angle at walk start. This is different than `sessionStartYpr[0]` (yaw).
         * It is calculated by taking `-atan2(m31, m33)` from `start.povT`.
         * If ARKit orient to north is `disabled`, then position x/y are rotated to this value. */
        facingAngle: number;
    };
    type Coordinate = [lat: number, lon: number];
    type GpsValues = [
        horizontalAccuracy: number,
        altitude: number,
        verticalAccuracy: number,
        speed: number,
        course: number,
        speedAccuracy: number,
        courseAccuracy: number
    ];
    type TemperatureValues = [ts: number, degrees: number];
    type Sensor3Axis = [x: number, y: number, z: number];
    type Q4Axis = [x: number, y: number, z: number, w: number];
    type Settings = {
        mode: 'DOM' | 'DOM with Downsampled' | 'High Speed Log to Flash';
        startAlignedToMag: boolean;
    };
    type ConfigFile = {
        magAnomaly: 0 | 1 | 2 | 3 | 4 | null;
        sensorFlags: [mag: boolean, accel: boolean, gyro: boolean] | null;
        timeConstants: [
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
        sensorFusionFlags: [mag: boolean, accel: boolean, gyro: boolean] | null;
        gyroBiasMode: 0 | 1 | 3 | null;
        qmaFlag: boolean | null;
        factoryMode: boolean | null;
        flushFilters: boolean | null;
        reinitializeAlgorithms: boolean | null;
        bufferLengths: [mag: number, accel: number, gyro: number] | null;
        noiseMult: [mag: number, accel: number, gyro: number] | null;
        noiseMin: [mag: number, accel: number, gyro: number] | null;
    };
    type DomInfo = {
        stepNum: number;
        heading: number;
        confidence: number;
        length: number;
    };
    type MagRawLog = {
        ts: number;
        appTs: string;
        name: Names.MAG_RAW;
        values: Sensor3Axis;
    };
    type MagAutocalLog = {
        ts: number;
        appTs: string;
        name: Names.MAG_AUTOCAL;
        values: Sensor3Axis;
    };
    type AccelRawLog = {
        ts: number;
        appTs: string;
        name: Names.ACCEL_RAW;
        values: Sensor3Axis;
    };
    type AccelAutocalLog = {
        ts: number;
        appTs: string;
        name: Names.ACCEL_AUTOCAL;
        values: Sensor3Axis;
    };
    type GyroRawLog = {
        ts: number;
        appTs: string;
        name: Names.GYRO_RAW;
        values: Sensor3Axis;
    };
    type GyroAutocalLog = {
        ts: number;
        appTs: string;
        name: Names.GYRO_AUTOCAL;
        values: Sensor3Axis;
    };
    type QMagAccelLog = {
        ts: number;
        appTs: string;
        name: Names.Q_MAG_ACCEL;
        values: Q4Axis;
    };
    type Q9AxisLog = {
        ts: number;
        appTs: string;
        name: Names.Q_9AXIS;
        values: Q4Axis;
    };
    type LinearAccelLog = {
        ts: number;
        appTs: string;
        name: Names.LINEAR_ACCEL;
        values: Sensor3Axis;
    };
    type GyroBiasLog = {
        ts: number;
        appTs: string;
        name: Names.GYRO_BIAS;
        values: Sensor3Axis;
    };
    type TemperatureLog = {
        ts: number;
        appTs: string;
        name: Names.TEMPERATURE;
        values: [degrees: number];
    };
    type PressureLog = {
        ts: number;
        appTs: string;
        name: Names.PRESSURE;
        values: [hPa: number];
    };
}
