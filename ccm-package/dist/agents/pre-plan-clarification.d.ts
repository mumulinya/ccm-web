export type PrePlanQuestionType = "single" | "multiple" | "text";
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
    questions: any[];
    allowAdditionalNote: boolean;
    safeDefaultsAvailable: boolean;
    originalRequestChecksum: string;
    contentStored: boolean;
};
export declare function formatPrePlanAnswers(clarification: any, answers?: any, additionalNote?: string): string;
export declare function formatPrePlanClarificationText(clarification: any): string;
export declare function runPrePlanClarificationSelfTest(): {
    pass: boolean;
    checks: {
        cappedAndDeduped: boolean;
        structuredOptions: boolean;
        safeProjection: boolean;
    };
};
