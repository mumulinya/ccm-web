export declare const COORDINATOR_EMPTY_REPLY_FALLBACK = "\u6A21\u578B\u8FD9\u6B21\u6CA1\u6709\u7ED9\u51FA\u53EF\u7528\u56DE\u590D\uFF0C\u672C\u6B21\u8BF7\u6C42\u672A\u5B8C\u6210\u3002\n\u8BF7\u91CD\u8BD5\uFF1B\u8FD9\u4E0D\u662F\u5DE5\u5177\u5931\u8D25\uFF0C\u4E5F\u4E0D\u9700\u8981\u5148\u6539\u6A21\u578B\u914D\u7F6E\u3002";
export declare function coordinatorUsableReply(parsed: any): string;
export declare function coordinatorChoseClarify(parsed: any): boolean;
export declare function shouldSynthesizeCoordinatorVisibleReply(parsed: any): boolean;
export declare function coordinatorShouldFailEmptyVisibleReply(input?: {
    parsed?: any;
    priorPlanDraft?: string;
    observationCount?: number;
}): boolean;
export declare function applySynthesizedCoordinatorReply(parsed: any, synthesized: string): any;
export declare function coordinatorVisibleFallbackContent(input: {
    parsed?: any;
    analysis?: any;
    policyLine?: string;
    priorPlanDraft?: string;
    observationCount?: number;
}): string;
export declare function runGroupCoordinatorVisibleReplySelfTest(): {
    pass: boolean;
    checks: {
        emptyReplyNeedsSynthesis: boolean;
        whitespaceNotUsable: boolean;
        replyFieldIsUsable: boolean;
        synthesisFillsFriendlyResponse: boolean;
        emptyReplyIsNotFakeClarify: boolean;
        clarifyKeepsAsk: boolean;
        dispatchSkipsSynthesis: boolean;
        presentedPlanSkipsSynthesis: boolean;
        presentedPlanHeadline: boolean;
        emptyChatKeepsFallback: boolean;
        priorPlanEmptyIsFailure: boolean;
        toolsEmptyIsFailure: boolean;
        priorPlanFallbackNotSuccess: boolean;
    };
};
