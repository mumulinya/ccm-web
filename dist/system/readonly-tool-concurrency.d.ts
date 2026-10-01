export declare const CCM_READONLY_TOOL_CONCURRENCY_MAX = 10;
export declare const CCM_READONLY_TOOL_CONCURRENCY_DEFAULT = 10;
export declare const CCM_GROUP_READONLY_PER_PROJECT_MAX = 2;
export type ReadonlyToolConcurrencyClass = "light" | "medium" | "heavy";
type ToolLike = {
    name?: string;
    arguments?: Record<string, any>;
};
export declare function clampReadonlyToolConcurrency(value: unknown, fallback?: number): number;
export declare function classifyReadonlyToolConcurrency(tool: ToolLike): ReadonlyToolConcurrencyClass;
export declare function readonlyToolConcurrencyLimit(tool: ToolLike, configuredLimit?: number): number;
export declare function groupReadonlyProjectKey(tool: ToolLike): string | undefined;
/**
 * Runs a proven-read-only batch with a CC-aligned ceiling and CCM resource
 * guards. Results retain model request order even when completion order differs.
 */
export declare function runReadonlyToolsAdaptive<T extends ToolLike, R>(input: {
    items: T[];
    worker: (item: T, index: number) => Promise<R>;
    configuredLimit?: number;
    keyForItem?: (item: T) => string | undefined;
    perKeyLimit?: number;
    signal?: AbortSignal;
}): Promise<R[]>;
export declare function createReadonlyToolScheduler(configuredLimit?: number): {
    run<T extends ToolLike, R>(item: T, worker: () => Promise<R>): Promise<R>;
};
export {};
