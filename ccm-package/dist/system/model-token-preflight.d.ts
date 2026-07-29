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
export declare function estimateModelTextTokens(value: any, config?: any): {
    schema: string;
    version: number;
    providerFamily: string;
    model: string;
    strategy: string;
    rawTokens: number;
    calibrationFactor: number;
    calibrationSamples: number;
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
}): TokenCalibration;
export declare function recordModelTokenCalibrationForIdentity(identityChecksum: string, input: {
    estimatedTokens?: number;
    observedTokens?: number;
}): TokenCalibration;
export declare function readModelTokenCalibration(config: any): {
    identityChecksum: string;
    calibration: TokenCalibration;
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
