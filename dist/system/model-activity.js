"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelActivityDefaultLabel = modelActivityDefaultLabel;
exports.createModelActivityController = createModelActivityController;
exports.createSafeJsonReplyDeltaExtractor = createSafeJsonReplyDeltaExtractor;
exports.streamDeltaChecksum = streamDeltaChecksum;
const crypto = __importStar(require("crypto"));
const user_visible_agent_events_1 = require("./user-visible-agent-events");
function safeLabel(value, fallback) {
    const text = String(value || "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
    if (!text || /```|<script|\b(prompt|system message|reasoning|thinking)\b/i.test(text))
        return fallback;
    return Array.from(text).slice(0, 120).join("");
}
function modelActivityDefaultLabel(_phase) {
    return "正在思考";
}
function createModelActivityController(input) {
    const startedAt = new Date().toISOString();
    const eventId = `model-activity:${input.scope}:${input.scopeId}:${input.exactSessionId}:${input.turnId}:${input.modelCallIndex}`;
    const fallbackLabel = modelActivityDefaultLabel(input.phase);
    let state = "thinking";
    let firstDeltaAt = "";
    let retryAttempt = 0;
    let maxRetries = 0;
    let retryDelayMs = 0;
    let revision = 0;
    let stopped = false;
    let requestDispatchCount = 0;
    let responseStartedCount = 0;
    let providerRequestIdPresent = false;
    let failureKind = "";
    let lastLabel = safeLabel(input.label, fallbackLabel);
    const publish = (nextState, extra = {}) => {
        revision += 1;
        state = nextState;
        if (extra.label)
            lastLabel = safeLabel(extra.label, fallbackLabel);
        if (Number(extra.retryAttempt) > 0)
            retryAttempt = Number(extra.retryAttempt);
        if (Number(extra.maxRetries) > 0)
            maxRetries = Number(extra.maxRetries);
        if (Number.isFinite(Number(extra.retryDelayMs)) && Number(extra.retryDelayMs) >= 0)
            retryDelayMs = Number(extra.retryDelayMs);
        const activity = {
            state,
            phase: input.phase,
            modelCallIndex: Math.max(1, Number(input.modelCallIndex || 1)),
            revision,
            ...(retryAttempt ? { retryAttempt } : {}),
            ...(maxRetries ? { maxRetries } : {}),
            ...(retryAttempt ? { retryDelayMs } : {}),
            startedAt,
            ...(firstDeltaAt ? { firstDeltaAt } : {}),
            requestDispatched: requestDispatchCount > 0,
            responseStarted: responseStartedCount > 0,
            providerRequestIdPresent,
            requestDispatchCount,
            responseStartedCount,
            ...(failureKind ? { failureKind } : {}),
            safeLabel: lastLabel,
            contentStored: false,
        };
        const event = {
            eventId,
            scope: input.scope,
            scopeId: input.scopeId,
            exactSessionId: input.exactSessionId,
            turnId: input.turnId,
            generation: Math.max(0, Number(input.generation || 0)),
            ...(input.taskId ? { taskId: input.taskId } : {}),
            ...(input.anchorMessageId ? { anchorMessageId: input.anchorMessageId } : {}),
            createdAt: startedAt,
            eventType: "model_activity",
            display: {
                title: "处理进度",
                summary: lastLabel,
                status: ["failed"].includes(state) ? "failed" : ["completed"].includes(state) ? "success" : "running",
            },
            detail: { modelActivity: activity },
        };
        const normalizedEvent = (0, user_visible_agent_events_1.publishEphemeralUserVisibleAgentEvent)(event);
        try {
            input.onActivity?.(activity, normalizedEvent);
        }
        catch { }
        return activity;
    };
    publish("thinking", { label: "正在思考" });
    const finish = (nextState) => {
        if (stopped)
            return;
        stopped = true;
        publish(nextState);
    };
    return {
        eventId,
        onDelta(delta) {
            if (stopped || !String(delta || ""))
                return;
            if (!firstDeltaAt)
                firstDeltaAt = new Date().toISOString();
            if (state !== "streaming")
                publish("streaming", { label: "正在思考" });
        },
        onToolDeclared(toolName) {
            if (stopped)
                return;
            if (!firstDeltaAt)
                firstDeltaAt = new Date().toISOString();
            const name = String(toolName || "工具").replace(/[\r\n\t]+/g, " ").trim().slice(0, 80) || "工具";
            publish("streaming", { label: `正在准备调用〈${name}〉` });
        },
        onRetry(attempt, maximumRetries = 5, delayMs = 0) {
            if (stopped)
                return;
            const visibleAttempt = Math.max(1, Number(attempt || 1));
            const visibleMax = Math.max(visibleAttempt, Number(maximumRetries || 5));
            publish("retrying", {
                retryAttempt: visibleAttempt,
                maxRetries: visibleMax,
                retryDelayMs: Math.max(0, Number(delayMs || 0)),
                label: `模型请求失败，正在重试（${visibleAttempt}/${visibleMax}）`,
            });
        },
        onProviderRequestActivity(activity) {
            if (stopped)
                return;
            if (activity?.phase === "request_dispatched")
                requestDispatchCount += 1;
            if (activity?.phase === "response_started")
                responseStartedCount += 1;
            if (activity?.providerRequestIdPresent === true)
                providerRequestIdPresent = true;
        },
        updateLabel(label) {
            if (!stopped && state === "retrying")
                publish(state, { label });
        },
        complete() { finish("completed"); },
        fail(error) {
            const code = String(error?.code || "");
            failureKind = code === "CCM_MODEL_CALL_CANCELLED"
                ? "user_cancelled"
                : requestDispatchCount < 1
                    ? "preparation_failed"
                    : responseStartedCount < 1
                        ? "connection_timeout"
                        : "provider_error";
            finish("failed");
        },
    };
}
/** Extracts only a JSON string field after an allowed response type is known. */
function createSafeJsonReplyDeltaExtractor(onDelta) {
    let source = "";
    let scanIndex = 0;
    let valueStarted = false;
    let valueEnded = false;
    let escaped = false;
    let unicode = "";
    let emitted = false;
    const responseAllowed = () => /["']response(?:Type|_type)["']\s*:\s*["'](?:reply|clarify)["']/i.test(source)
        || /["']state["']\s*:\s*["'](?:answer|clarify|needs_clarification)["']/i.test(source);
    const locateValue = () => {
        if (valueStarted || !responseAllowed())
            return;
        const match = /["'](?:reply|content|message)["']\s*:\s*"/ig;
        let candidate = null;
        while ((candidate = match.exec(source))) {
            valueStarted = true;
            scanIndex = candidate.index + candidate[0].length;
            break;
        }
    };
    const emit = (value) => {
        if (!value || !onDelta)
            return;
        emitted = true;
        onDelta(value);
    };
    return {
        push(chunk) {
            if (valueEnded || !chunk)
                return;
            source += chunk;
            locateValue();
            if (!valueStarted)
                return;
            let plain = "";
            for (; scanIndex < source.length; scanIndex += 1) {
                const char = source[scanIndex];
                if (unicode) {
                    if (/^[0-9a-f]$/i.test(char))
                        unicode += char;
                    else {
                        unicode = "";
                        escaped = false;
                    }
                    if (unicode.length === 5) {
                        plain += String.fromCharCode(parseInt(unicode.slice(1), 16));
                        unicode = "";
                        escaped = false;
                    }
                    continue;
                }
                if (escaped) {
                    if (char === "u") {
                        unicode = "u";
                        continue;
                    }
                    plain += { "n": "\n", "r": "\r", "t": "\t", "b": "\b", "f": "\f", "\"": "\"", "\\": "\\", "/": "/" }[char] ?? char;
                    escaped = false;
                    continue;
                }
                if (char === "\\") {
                    escaped = true;
                    continue;
                }
                if (char === "\"") {
                    valueEnded = true;
                    break;
                }
                plain += char;
            }
            emit(plain);
        },
        get emitted() { return emitted; },
    };
}
function streamDeltaChecksum(input) {
    return crypto.createHash("sha256").update(`${input.runId}\0${input.modelCallIndex}\0${input.sequence}\0${input.delta}`).digest("hex");
}
//# sourceMappingURL=model-activity.js.map