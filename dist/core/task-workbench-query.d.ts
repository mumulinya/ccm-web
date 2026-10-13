export declare function listTaskAccessReferences(): any[];
export declare function queryTaskWorkbenchPage(runs: any[], input: any, accessibleIds?: string[], sourceVersion?: string, authorizationKey?: string): {
    ids: any;
    counts: {
        all: any;
        needs_attention: any;
        running: any;
        completed: any;
    };
    pagination: {
        page: number;
        limit: number;
        total: any;
        pages: number;
    };
};
