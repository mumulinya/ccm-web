/** Process readiness is distinct from HTTP port readiness. No execution
 * consumer may run until durable execution records have been reconciled. */
type StartupState = "idle" | "pending" | "recovering" | "ready" | "failed" | "stopped";
export declare function dispatchStartupStatus(): {
    state: StartupState;
    generation: number;
    stage: string;
    failedStage: string;
    startedAt: string;
    finishedAt: string;
};
export declare function prepareDispatchStartup(): number;
export declare function assertDispatchStartupReady(): void;
export declare function afterDispatchStartup<T>(callback: () => T | Promise<T>): Promise<T>;
export declare function stopDispatchStartup(): void;
export declare function failDispatchStartup(error: Error, stage?: string): void;
export declare function runDispatchStartup(stages: Array<{
    name: string;
    run: () => unknown | Promise<unknown>;
}>): Promise<void>;
export {};
