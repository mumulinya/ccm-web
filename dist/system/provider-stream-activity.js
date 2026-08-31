"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordProviderStreamRequestDispatched = recordProviderStreamRequestDispatched;
exports.recordProviderStreamResponseStarted = recordProviderStreamResponseStarted;
exports.recordProviderStreamSseEvent = recordProviderStreamSseEvent;
exports.recordProviderStreamToolReady = recordProviderStreamToolReady;
exports.emitProviderStreamActivity = emitProviderStreamActivity;
exports.providerStreamTiming = providerStreamTiming;
const runtime = new WeakMap();
function now() {
    return new Date().toISOString();
}
function stateFor(options) {
    let state = runtime.get(options);
    if (!state) {
        state = {
            sequence: 0,
            requestDispatchedAt: "",
            responseStartedAt: "",
            firstSseEventAt: "",
            firstReasoningSummaryAt: "",
            firstOutputTextAt: "",
            firstToolDeclaredAt: "",
            firstToolReadyAt: "",
            maxProjectionDelayMs: 0,
        };
        runtime.set(options, state);
    }
    return state;
}
function recordProviderStreamRequestDispatched(options) {
    const state = stateFor(options);
    if (!state.requestDispatchedAt)
        state.requestDispatchedAt = now();
}
function recordProviderStreamResponseStarted(options) {
    const state = stateFor(options);
    if (!state.responseStartedAt)
        state.responseStartedAt = now();
}
function recordProviderStreamSseEvent(options) {
    const state = stateFor(options);
    if (!state.firstSseEventAt)
        state.firstSseEventAt = now();
}
function recordProviderStreamToolReady(options) {
    const state = stateFor(options);
    if (!state.firstToolReadyAt)
        state.firstToolReadyAt = now();
}
function emitProviderStreamActivity(options, input) {
    const state = stateFor(options);
    const receivedAt = String(input.receivedAt || now());
    if (input.kind === "reasoning_summary_delta" && !state.firstReasoningSummaryAt)
        state.firstReasoningSummaryAt = receivedAt;
    if (input.kind === "output_text_delta" && !state.firstOutputTextAt)
        state.firstOutputTextAt = receivedAt;
    if (input.kind === "tool_call_declared" && !state.firstToolDeclaredAt)
        state.firstToolDeclaredAt = receivedAt;
    const activity = {
        ...input,
        modelCallIndex: 0,
        round: 0,
        sequence: ++state.sequence,
        receivedAt,
        contentStored: input.kind === "reasoning_summary_delta" && !!input.text,
    };
    const startedAt = Date.now();
    try {
        options.onProviderStreamActivity?.(activity);
    }
    catch { }
    state.maxProjectionDelayMs = Math.max(state.maxProjectionDelayMs, Date.now() - startedAt);
    return activity;
}
function providerStreamTiming(options) {
    const state = stateFor(options);
    const diagnosticReasons = [];
    const responseStartedMs = Date.parse(state.responseStartedAt || "") || 0;
    const firstSseMs = Date.parse(state.firstSseEventAt || "") || 0;
    if (responseStartedMs && firstSseMs && firstSseMs - responseStartedMs > 1_000) {
        diagnosticReasons.push("provider_or_relay_stream_buffering");
    }
    if (state.firstSseEventAt && !state.firstReasoningSummaryAt && !state.firstOutputTextAt && !state.firstToolDeclaredAt) {
        diagnosticReasons.push("no_user_visible_stream_event");
    }
    if (state.maxProjectionDelayMs > 300)
        diagnosticReasons.push("ccm_projection_delay");
    return {
        ...(state.requestDispatchedAt ? { requestDispatchedAt: state.requestDispatchedAt } : {}),
        ...(state.responseStartedAt ? { responseStartedAt: state.responseStartedAt } : {}),
        ...(state.firstSseEventAt ? { firstSseEventAt: state.firstSseEventAt } : {}),
        ...(state.firstReasoningSummaryAt ? { firstReasoningSummaryAt: state.firstReasoningSummaryAt } : {}),
        ...(state.firstOutputTextAt ? { firstOutputTextAt: state.firstOutputTextAt } : {}),
        ...(state.firstToolDeclaredAt ? { firstToolDeclaredAt: state.firstToolDeclaredAt } : {}),
        ...(state.firstToolReadyAt ? { firstToolReadyAt: state.firstToolReadyAt } : {}),
        maxProjectionDelayMs: state.maxProjectionDelayMs,
        diagnosticReasons,
        contentStored: false,
    };
}
//# sourceMappingURL=provider-stream-activity.js.map