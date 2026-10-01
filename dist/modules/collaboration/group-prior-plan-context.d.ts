export declare function extractPriorGroupPlanDraft(context: any): string;
export declare function formatPriorGroupPlanBlock(draft: any): string;
export declare function runGroupPriorPlanContextSelfTest(): {
    pass: boolean;
    checks: {
        extractsLastAssistant: boolean;
        formatsBlock: boolean;
        emptyContext: boolean;
        skipsEmptyFallback: boolean;
        prefersPresentedPlan: boolean;
    };
};
