export declare function parsedRequestsUserClarification(parsed: any): boolean;
export declare function runClarificationTurnSelfTest(): {
    pass: boolean;
    checks: {
        nativeAskMapsClarify: boolean;
        ordinaryReplyStaysFalse: boolean;
        dispatchNotClarify: boolean;
    };
};
