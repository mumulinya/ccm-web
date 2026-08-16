export declare function isGroupModelRecoveryContinuePhrase(value: any): boolean;
export declare function findUnrecoveredGroupModelFailure(messages?: any[]): {
    failure: any;
    index: number;
};
export declare function groupModelRecoveryAnchorId(failure: any): string;
export declare function resolveGroupModelRecovery(messages?: any[], input?: any): {
    failureMessageId: string;
    anchorMessageId: string;
    originalUserMessageId: string;
    originalMessage: string;
    attempt: number;
};
export declare function runGroupModelRecoverySelfTest(): {
    pass: boolean;
    checks: {
        resumeButtonUsesOriginalTask: boolean;
        typedContinueUsesOriginalTask: boolean;
        newRequestDoesNotBindFailure: boolean;
        recoveredFailureIsClosed: boolean;
        continuePhraseOnly: boolean;
    };
};
