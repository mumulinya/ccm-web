export declare function prepareLocalKnowledgeModelAtStartup(options?: {
    enabled?: boolean;
    rebuild?: boolean;
}): Promise<any>;
export declare function scheduleLocalKnowledgeModelStartupPreparation(delayMs?: number): {
    scheduled: boolean;
    reason: string;
};
export declare function resetLocalKnowledgeModelStartupForTest(): void;
