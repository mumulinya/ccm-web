export declare function executeSkillFork(input: {
    skill: any;
    parent: {
        scope: string;
        scopeId: string;
        exactSessionId: string;
        generation: number;
        turn?: number | string;
    };
    modelVisibleContext: string;
    tools: any[];
    executeTool: (name: string, args: any) => Promise<any>;
}): Promise<{
    ok: boolean;
    name: string;
    contentHash: string;
    executionMode: string;
    result: string;
    resultChecksum: string;
    invokedAt: string;
    receipt: {
        schema: string;
        receiptId: string;
        communicationMessageId: any;
        parent: {
            scope: string;
            scopeId: string;
            exactSessionId: string;
            generation: number;
            turn?: number | string;
        };
        skillName: string;
        skillHash: string;
        usage: {
            inputTokens: number;
            outputTokens: number;
            totalTokens: number;
        };
        toolEvidenceRefs: string[];
        resultChecksum: string;
        durationMs: number;
        completedAt: string;
        contentStored: boolean;
    };
}>;
