/**
 * The provider cache contract is append-only.  Mutable runtime controls must
 * never be inserted into the leading system run because doing so changes the
 * bytes of every previously committed turn.  Keep this policy in one small
 * module so all three main-agent surfaces use the same wire layout.
 */
export declare const PROVIDER_CACHE_WIRE_LAYOUT_VERSION = "ccm-append-only-v11";
export declare const LEGACY_PROVIDER_CACHE_WIRE_LAYOUT_VERSION = "ccm-append-only-v1";
export declare const PREVIOUS_PROVIDER_CACHE_WIRE_LAYOUT_VERSION = "ccm-append-only-v2";
export declare const PREVIOUS_APPEND_ONLY_V3_WIRE_LAYOUT_VERSION = "ccm-append-only-v3";
export declare const PREVIOUS_APPEND_ONLY_V4_WIRE_LAYOUT_VERSION = "ccm-append-only-v4";
export declare const PREVIOUS_APPEND_ONLY_V5_WIRE_LAYOUT_VERSION = "ccm-append-only-v5";
export declare const PREVIOUS_APPEND_ONLY_V6_WIRE_LAYOUT_VERSION = "ccm-append-only-v6";
export declare const PREVIOUS_APPEND_ONLY_V7_WIRE_LAYOUT_VERSION = "ccm-append-only-v7";
export declare const PREVIOUS_APPEND_ONLY_V8_WIRE_LAYOUT_VERSION = "ccm-append-only-v8";
export declare const PREVIOUS_APPEND_ONLY_V9_WIRE_LAYOUT_VERSION = "ccm-append-only-v9";
export declare const PREVIOUS_APPEND_ONLY_V10_WIRE_LAYOUT_VERSION = "ccm-append-only-v10";
/** New requests always use the current layout; old checkpoints remain readable. */
export declare function normalizeProviderCacheWireLayoutVersion(value: unknown): string;
export type AppendOnlyTranscript = {
    messages: any[];
    wireLayoutVersion: string;
    movedDynamicBlockCount: number;
    messageOrderChecksum: string;
    committedPrefixChecksum: string;
    lastCommittedMessageId: string;
    contentStored: false;
};
/**
 * Move mutable system controls to a non-prefix suffix of the current
 * request. The persisted session transcript remains authoritative; this is
 * only a wire projection and therefore does not create a second history
 * entry. Keeping the suffix after the committed conversation is important:
 * rebuilding a dynamic system block at the head would change byte 1 on every
 * turn and leave the provider with only its small baseline cache fragment.
 */
export declare function buildAppendOnlyProviderTranscript(messagesInput: any[], options?: {
    turnId?: string;
}): AppendOnlyTranscript;
export declare function isAppendOnlyProviderRuntimeMessage(message: any): boolean;
