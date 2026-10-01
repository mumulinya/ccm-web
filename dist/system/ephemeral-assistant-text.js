"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preserveEphemeralAssistantText = preserveEphemeralAssistantText;
/** 只为实时正文保留排版；紧凑摘要和持久化账本仍使用原来的安全投影。 */
function preserveEphemeralAssistantText(event, input) {
    if (event.eventType !== "assistant_text_delta")
        return event;
    const raw = input?.detail?.delta ?? input?.detail?.stream?.text ?? input?.display?.summary ?? "";
    const delta = String(raw)
        .replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret|credential)\s*[:=]\s*["']?)[^\s,"'}]{6,}/gi, "$1[redacted]")
        .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
        .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/g, "[redacted]")
        .replace(/\0/g, "");
    const stream = input?.detail?.stream || {};
    return { ...event, detail: { ...event.detail, delta, stream: {
                sequence: event.detail?.stream?.sequence || 0,
                final: event.detail?.stream?.final === true,
                ...event.detail?.stream,
                modelCallIndex: Math.max(0, Number(stream.modelCallIndex ?? stream.model_call_index ?? 0)),
                round: Math.max(0, Number(stream.round || 0)),
            } } };
}
//# sourceMappingURL=ephemeral-assistant-text.js.map