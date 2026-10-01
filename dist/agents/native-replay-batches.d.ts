import type { SessionExecutionEvent } from '../system/session-execution-ledger';
import type { ProviderAgentTurn, ProviderToolCall } from '../system/provider-native-tools';
import type { ModelCheckpoint } from './session-model-checkpoint';
export type ReplayPair = {
    use: SessionExecutionEvent;
    result: SessionExecutionEvent;
};
export type ReplayBatch = {
    text: string;
    toolCalls: ProviderToolCall[];
    attemptId?: string;
};
/** Read declarations only, never cached result bodies or obsolete policy. */
export declare function checkpointReplayBatches(saved: ModelCheckpoint | null): ReplayBatch[];
export declare function groupReplayPairs(pairs: ReplayPair[], batches: ReplayBatch[]): {
    pairs: ReplayPair[];
    text: string;
}[];
export declare function replayBatchDeclaration(turn: ProviderAgentTurn, attemptId?: string): ReplayBatch;
