import type { ProviderToolCall } from '../system/provider-native-tools';
import type { NativeToolResult } from './native-query-messages';
/** Re-reads validate freshness through the authorized adapter, not direct I/O here. */
export declare function createNativeToolRepeatPolicy(isReadOnly?: (call: ProviderToolCall) => boolean): {
    select(calls: ProviderToolCall[]): {
        fresh: ProviderToolCall[];
        duplicateResults: NativeToolResult[];
        retrying: boolean;
    };
    record(calls: ProviderToolCall[], rows: NativeToolResult[]): boolean;
};
