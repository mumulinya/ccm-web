export type PrePlanQuestionType = "single" | "multiple" | "text";
export declare const PRE_PLAN_OTHER_OPTION_ID = "other";
export declare const PRE_PLAN_OTHER_OPTION_LABEL = "\u5176\u4ED6";
export declare function ensureOtherOption(options?: any[]): any[];
export declare function normalizePrePlanQuestions(value: any, fallback?: any[]): any[];
export declare function buildPrePlanClarification(input: any): {
    schema: string;
    id: string;
    scope: any;
    scopeId: string;
    exactSessionId: string;
    anchorMessageId: string;
    status: any;
    revision: number;
    generation: number;
    round: number;
    title: string;
    headline: string;
    purpose: string;
    questions: any[];
    allowAdditionalNote: boolean;
    safeDefaultsAvailable: boolean;
    originalRequestChecksum: string;
    contentStored: boolean;
};
export declare function formatPrePlanAnswers(clarification: any, answers?: any, additionalNote?: string): string;
export declare function buildConversationClarificationSummary(input: {
    schema?: string;
    question?: string;
    reason?: string;
    headline?: string;
    suggestions?: string[];
    nextAction?: string;
    prePlanClarification: any;
}): {
    schema: string;
    title: any;
    status: string;
    status_label: string;
    headline: string;
    question: string;
    reason: string;
    answer_suggestions: string[];
    next_action: string;
    pre_plan_clarification: any;
    prePlanClarification: any;
};
export declare function formatPrePlanClarificationText(clarification: any): string;
export declare function runPrePlanClarificationSelfTest(): {
    pass: any;
    checks: {
        cappedAndDeduped: boolean;
        structuredOptions: boolean;
        otherOption: boolean;
        safeProjection: boolean;
    };
};
