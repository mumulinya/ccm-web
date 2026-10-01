import type { UnifiedCompactionEngineInput, UnifiedCompactionResult } from "./unified-session-compaction-types";
export declare class UnifiedSessionCompactionEngine {
    private readonly input;
    constructor(input: UnifiedCompactionEngineInput);
    run(): Promise<UnifiedCompactionResult>;
}
export declare function createUnifiedSessionCompactionEngine(input: UnifiedCompactionEngineInput): UnifiedSessionCompactionEngine;
