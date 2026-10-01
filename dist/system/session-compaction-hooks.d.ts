export declare function initializeBuiltInSessionCompactionHooks(): {
    initialized: boolean;
    reason: string;
    phases?: undefined;
} | {
    initialized: boolean;
    phases: string[];
    reason?: undefined;
};
