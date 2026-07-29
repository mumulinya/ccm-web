export type CcDurableMemoryType = "user" | "feedback" | "project" | "reference";
export declare function ccDurableMemoryType(value: any, fallback?: CcDurableMemoryType): CcDurableMemoryType;
export declare function isCcDurableMemoryCandidate(input: {
    content?: any;
    accepted?: boolean;
    sourceKind?: any;
    transient?: boolean;
    derivableFromCode?: boolean;
    skillOrToolDefinition?: boolean;
}): boolean;
export declare function ccDurableMemoryTaxonomyReceipt(type: any, input?: any): {
    schema: string;
    type: CcDurableMemoryType;
    admitted: boolean;
    excludesTransientProcessState: boolean;
    excludesDerivableCodeFacts: boolean;
    excludesSkillAndToolDefinitions: boolean;
};
