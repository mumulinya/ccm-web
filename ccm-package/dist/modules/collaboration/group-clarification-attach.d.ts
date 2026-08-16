export declare function groupTurnNeedsClarificationCards(input?: {
    dispatchPolicy?: any;
    mainAgentTurnDecision?: any;
    workflowDecision?: any;
    parsed?: any;
}): boolean;
export declare function resolveGroupLiveDispatchPolicy(input: {
    projectAnalysisRequest?: boolean;
    conversationalOnly?: boolean;
    taskIntent?: any;
    coordinatorResult?: any;
}): any;
export declare function runGroupClarificationAttachSelfTest(): {
    pass: boolean;
    checks: {
        clarifyWinsOverConversational: boolean;
        greetingStaysAnswer: boolean;
        nativeAskKept: boolean;
    };
};
