/** Restore selected tools/Skills inside the unified engine's payload gate. */
export declare function buildUnifiedGroupToolRestore(input: any, summary: any, preservedMessages: any[]): {
    schema: string;
    version: number;
    strategy: string;
    budgets: {
        files: number;
        skills: number;
        verification: number;
        taskStatuses: number;
        invokedSkillSingleTokens: any;
        invokedSkillsTotalTokens: any;
        currentPlanTokens: number;
        dynamicContextTokens: number;
    };
    files: any[];
    skills: any[];
    verification: any[];
    blockers: any[];
    taskStatuses: any[];
    preservedFileDedup: any;
    invokedSkillAttachments: any[];
    invokedSkillAttachmentReceipt: any;
    planAttachment: any;
    planAttachmentReceipt: any;
    dynamicContextDeltaAttachment: any;
    dynamicContextDeltaReceipt: any;
    hasCandidates: boolean;
};
export declare function persistUnifiedGroupToolRestore(memory: any, result: any, plan: any): void;
