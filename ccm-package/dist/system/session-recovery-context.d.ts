export declare function buildVerifiedSessionRecoveryContext(input: {
    rootDir?: string;
    fileReferences?: any[];
    skills?: any[];
}): {
    schema: string;
    files: any[];
    skills: any[];
    budgets: {
        fileLimit: number;
        fileTokenLimit: number;
        fileTotalTokenLimit: number;
        skillTokenLimit: number;
        skillTotalTokenLimit: number;
    };
    tokens: {
        files: number;
        skills: number;
        total: number;
    };
};
