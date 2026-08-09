type TokenCalibration = {
    schema: "ccm-model-token-calibration-v1";
    identityChecksum: string;
    samples: number;
    factor: number;
    lastEstimatedTokens: number;
    lastObservedTokens: number;
    updatedAt: string;
    checksum: string;
};
type TokenCalibrationSampleV2 = {
    estimatedTokens: number;
    observedTokens: number;
    ratio: number;
    positiveDriftTokens: number;
    recordedAt: string;
};
type TokenCalibrationV2 = {
    schema: "ccm-model-token-calibration-v2";
    version: 2;
    identityChecksum: string;
    providerIdentityChecksum: string;
    estimatorVersion: 2;
    samples: number;
    rejectedSamples: number;
    factor: number;
    p95Ratio: number;
    p95PositiveDriftTokens: number;
    recentSamples: TokenCalibrationSampleV2[];
    lastEstimatedTokens: number;
    lastObservedTokens: number;
    lastAcceptedAt: string;
    updatedAt: string;
    contentStored: false;
    checksum: string;
};
export declare function estimateModelTextTokens(value: any, config?: any): {
    schema: string;
    version: number;
    providerFamily: string;
    model: string;
    strategy: string;
    rawTokens: number;
    calibrationFactor: number;
    calibrationSamples: number;
    calibrationRejectedSamples: number;
    calibrationP95Ratio: number;
    calibrationP95PositiveDriftTokens: number;
    calibratedTokens: number;
    safetyAdjustedTokens: number;
    safetyMargin: number;
    confidence: string;
    contentStored: boolean;
};
export declare function estimateModelMessagesTokens(messagesInput: any[], config?: any): {
    schema: string;
    version: number;
    providerFamily: string;
    model: string;
    strategy: string;
    messageCount: number;
    rawTokens: number;
    calibratedTokens: number;
    safetyAdjustedTokens: number;
    calibrationSamples: number;
    confidence: string;
    contentStored: boolean;
};
export declare function recordModelTokenCalibration(config: any, input: {
    estimatedTokens?: number;
    observedTokens?: number;
}): TokenCalibrationV2;
export declare function recordModelTokenCalibrationForIdentity(identityChecksum: string, input: {
    estimatedTokens?: number;
    observedTokens?: number;
}): TokenCalibrationV2;
export declare function readModelTokenCalibration(config: any): {
    identityChecksum: string;
    providerIdentityChecksum: string;
    calibration: TokenCalibration | TokenCalibrationV2;
    contentStored: boolean;
};
export declare function runModelTokenPreflightSelfTest(): {
    pass: boolean;
    checks: {
        openAiUsesLocalTokenizer: boolean;
        genericUsesSafeFamilyEstimate: boolean;
        safetyMarginApplied: boolean;
        noContentStored: boolean;
    };
};
export {};
