import type { NativeQueryLoopInput, NativeQueryExecuteContext } from './native-query-loop';
import type { ProviderToolCall } from '../system/provider-native-tools';
import type { NativeToolResult } from './native-query-messages';
import { runReadonlyToolsAdaptive } from '../system/readonly-tool-concurrency';
export type NativeReadonlyRunner = typeof runReadonlyToolsAdaptive;
/** A complete model batch is the scheduling boundary, never an SSE arrival. */
export declare function createNativeToolExecution(input: NativeQueryLoopInput, save: (rows: NativeToolResult[]) => NativeToolResult[]): ((calls: ProviderToolCall[], ctx: NativeQueryExecuteContext) => Promise<NativeToolResult[]>) & {
    markModelRetry: () => void;
};
