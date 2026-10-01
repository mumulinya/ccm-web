import type { UnifiedCompactionFence, UnifiedCompactionResult, UnifiedCompactionSnapshot, UnifiedSessionCompactionAdapter } from "./unified-session-compaction-types";
export type UnifiedAdapterHooks = {
    load: (fence: UnifiedCompactionFence) => Promise<UnifiedCompactionSnapshot> | UnifiedCompactionSnapshot;
    acquire?: () => Promise<UnifiedCompactionFence> | UnifiedCompactionFence;
    validate?: (fence: UnifiedCompactionFence, snapshot: UnifiedCompactionSnapshot) => Promise<void> | void;
    commit: (result: UnifiedCompactionResult, fence: UnifiedCompactionFence) => Promise<void> | void;
    failure?: (error: unknown, fence: UnifiedCompactionFence) => Promise<void> | void;
    recovery?: (summary: any, snapshot: UnifiedCompactionSnapshot) => any;
};
export declare function createUnifiedScopeAdapter(hooks: UnifiedAdapterHooks): UnifiedSessionCompactionAdapter;
export declare function runUnifiedScopeCompaction(input: any): Promise<UnifiedCompactionResult>;
