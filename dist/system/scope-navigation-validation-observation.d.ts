type ObservationOptions = {
    report: (id: string) => any;
    healthy: () => Promise<boolean>;
    sleep?: (ms: number) => Promise<any>;
    pauseMs?: number;
    intervalMs?: number;
    timeoutMs?: number;
};
/** Advance the cutoff before every read, including the final read; never request a model. */
export declare function observeScopeNavigationValidation(id: string, options: ObservationOptions): Promise<any>;
export {};
