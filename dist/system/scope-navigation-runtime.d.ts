export declare const navigationTargets: (store: any, job: any) => any;
export declare function navigationResultNeedsRefresh(row: any, documentValid: () => boolean, config: any): boolean;
export declare function enqueueNavigation(store: any, input: any): any;
export declare function recoverNavigationJobs(store: any): void;
export type NavigationRuntime = {
    transaction: <T>(operation: (store: any) => T) => T;
    prepare: (job: any) => any;
    config: () => any;
    documentValid: (row: any) => boolean;
    send: (prepared: any, job: any, config: any) => Promise<any>;
    commit: (job: any, output: any) => void;
    fail: (job: any, error: any) => void;
};
export declare function runNextScopeNavigation(runtime: NavigationRuntime, selectedKey?: string): Promise<{
    outcome: string;
    taskId: any;
    requestIds?: undefined;
} | {
    outcome: string;
    taskId: any;
    requestIds: any;
} | {
    outcome: string;
}>;
export declare function recordNavigationCompletion(store: any, job: any, outcome: string, reason?: string): void;
export declare function stopNavigationValidationJobs(store: any, validationId: string, reason: string): any;
