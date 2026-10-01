export type CcmProviderStreamActivityKind = "reasoning_summary_delta" | "tool_call_declared" | "output_text_delta";
export type CcmProviderStreamActivityV1 = {
    kind: CcmProviderStreamActivityKind;
    modelCallIndex: number;
    round: number;
    sequence: number;
    toolCallId?: string;
    toolName?: string;
    text?: string;
    done?: boolean;
    receivedAt?: string;
    contentStored: boolean;
};
export type CcmProviderStreamTimingV1 = {
    requestDispatchedAt?: string;
    responseStartedAt?: string;
    firstSseEventAt?: string;
    firstReasoningSummaryAt?: string;
    firstOutputTextAt?: string;
    firstToolDeclaredAt?: string;
    firstToolReadyAt?: string;
    maxProjectionDelayMs: number;
    diagnosticReasons: Array<"provider_or_relay_stream_buffering" | "no_user_visible_stream_event" | "ccm_projection_delay">;
    contentStored: false;
};
export declare function recordProviderStreamRequestDispatched(options: object): void;
export declare function recordProviderStreamResponseStarted(options: object): void;
export declare function recordProviderStreamSseEvent(options: object): void;
export declare function recordProviderStreamToolReady(options: object): void;
export declare function emitProviderStreamActivity(options: {
    onProviderStreamActivity?: (activity: CcmProviderStreamActivityV1) => void;
}, input: Omit<CcmProviderStreamActivityV1, "modelCallIndex" | "round" | "sequence" | "contentStored">): CcmProviderStreamActivityV1;
export declare function providerStreamTiming(options: object): CcmProviderStreamTimingV1;
