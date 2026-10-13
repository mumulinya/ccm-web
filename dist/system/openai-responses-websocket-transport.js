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
exports.responsesWebSocketUrl = responsesWebSocketUrl;
exports.responsesWebSocketUrlFingerprint = responsesWebSocketUrlFingerprint;
exports.requestResponsesWebSocket = requestResponsesWebSocket;
exports.openResponsesWebSocket = openResponsesWebSocket;
exports.sendResponsesCreate = sendResponsesCreate;
exports.closeResponsesWebSocket = closeResponsesWebSocket;
exports.isResponsesWebSocketSupported = isResponsesWebSocketSupported;
exports.probeResponsesWebSocket = probeResponsesWebSocket;
exports.runResponsesWebSocketSelfTest = runResponsesWebSocketSelfTest;
const undici_1 = require("undici");
const crypto = __importStar(require("crypto"));
const provider_request_diagnostics_1 = require("./provider-request-diagnostics");
const cache_validation_budget_1 = require("./cache-validation-budget");
function safeError(value) {
    return String(value?.message || value || "Responses WebSocket failed").replace(/[\r\n\t]+/g, " ").slice(0, 300);
}
function responsesWebSocketUrl(endpoint, configured) {
    const value = String(configured || endpoint || "").trim();
    if (!value)
        return "";
    try {
        const url = new URL(value);
        if (url.username || url.password)
            return "";
        if (/(?:^|\.)anthropic\.com$|(?:^|\.)googleapis\.com$/i.test(url.hostname))
            return "";
        if (url.protocol === "wss:") {
            if (!/\/responses$/i.test(url.pathname) || /chat\/completions|anthropic|generateContent/i.test(url.pathname))
                return "";
            return url.toString().replace(/\/$/, "");
        }
        if (url.protocol !== "https:")
            return "";
        if (/chat\/completions|messages|anthropic|generateContent/i.test(url.pathname))
            return "";
        url.protocol = "wss:";
        if (!/\/responses$/i.test(url.pathname)) {
            url.pathname = /\/v1$/i.test(url.pathname) ? `${url.pathname}/responses` : `${url.pathname.replace(/\/$/, "")}/v1/responses`;
        }
        return url.toString().replace(/\/$/, "");
    }
    catch {
        return "";
    }
}
function responsesWebSocketUrlFingerprint(value) {
    try {
        const url = new URL(String(value || ""));
        url.username = "";
        url.password = "";
        url.search = "";
        url.hash = "";
        return crypto.createHash("sha256").update(url.toString().replace(/\/$/, "")).digest("hex").slice(0, 64);
    }
    catch {
        return "";
    }
}
class EventQueue {
    values = [];
    waiters = [];
    ended = false;
    push(value) {
        const bytes = new TextEncoder().encode(`data: ${JSON.stringify(value)}\n\n`);
        const waiter = this.waiters.shift();
        if (waiter)
            waiter({ value: bytes, done: false });
        else
            this.values.push(bytes);
    }
    end() { this.ended = true; for (const waiter of this.waiters.splice(0))
        waiter({ value: undefined, done: true }); }
    [Symbol.asyncIterator]() {
        return { next: () => {
                if (this.values.length)
                    return Promise.resolve({ value: this.values.shift(), done: false });
                if (this.ended)
                    return Promise.resolve({ value: undefined, done: true });
                return new Promise(resolve => this.waiters.push(resolve));
            } };
    }
}
async function requestResponsesWebSocket(endpoint, init = {}, meta) {
    if (!responsesWebSocketUrl(endpoint, init.responsesWebSocketUrl))
        throw new Error('Responses WebSocket URL is invalid');
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    if (!Array.isArray(body?.input))
        throw new Error('Responses WebSocket input must be a list');
    return (0, provider_request_diagnostics_1.auditedProviderFetch)(sendResponsesWebSocketRequest, endpoint, init, meta || { options: (0, provider_request_diagnostics_1.withRequestDiagnostics)(init.requestOptions || {}, init.config), config: init.config || {}, protocol: 'responses' });
}
async function sendResponsesWebSocketRequest(endpoint, init = {}) {
    const url = responsesWebSocketUrl(endpoint, init.responsesWebSocketUrl);
    if (!url)
        throw new Error("Responses WebSocket URL is invalid");
    const body = typeof init.body === "string" ? JSON.parse(init.body) : (init.body || {});
    if (!Array.isArray(body.input))
        throw new Error("Responses WebSocket input must be a list");
    body.store = false;
    const headers = {};
    for (const [key, value] of Object.entries(init.headers || {}))
        headers[key] = String(value);
    const ws = new undici_1.WebSocket(url, { headers });
    const queue = new EventQueue();
    let opened = false;
    let settled = false;
    let rejectOpen = () => { };
    const openPromise = new Promise((resolve, reject) => { rejectOpen = reject; ws.addEventListener("open", () => { opened = true; resolve(); }); });
    ws.addEventListener("message", (event) => {
        try {
            const value = typeof event.data === "string" ? JSON.parse(event.data) : JSON.parse(Buffer.from(event.data).toString("utf8"));
            queue.push(value);
            if (["response.completed", "response.incomplete", "response.failed", "error"].includes(String(value?.type || "")) || value?.error) {
                settled = true;
                queue.end();
                ws.close();
            }
        }
        catch (error) {
            queue.push({ type: "error", error: { message: safeError(error) } });
            settled = true;
            queue.end();
            ws.close();
        }
    });
    ws.addEventListener("error", (event) => {
        const error = new Error(safeError(event));
        if (!opened)
            rejectOpen(error);
        if (!settled) {
            queue.push({ type: "error", error: { message: error.message } });
            queue.end();
        }
    });
    ws.addEventListener("close", () => { if (!settled)
        queue.end(); });
    let timeoutHandle;
    try {
        await Promise.race([openPromise, new Promise((_, reject) => {
                timeoutHandle = setTimeout(() => reject(new Error("Responses WebSocket handshake timeout")), Number(init.timeoutMs || 30000));
            })]);
    }
    catch (error) {
        try {
            ws.close();
        }
        catch { }
        throw error;
    }
    finally {
        if (timeoutHandle)
            clearTimeout(timeoutHandle);
    }
    ws.send(JSON.stringify({ type: "response.create", ...body }));
    return { ok: true, status: 200, headers: { get: (name) => String(name).toLowerCase() === "content-type" ? "text/event-stream" : "" }, body: queue, close: () => { try {
            ws.close();
        }
        catch { } } };
}
/** Low-level names kept intentionally thin so HTTP and WebSocket callers share one request body. */
async function openResponsesWebSocket(endpoint, init = {}) {
    return requestResponsesWebSocket(endpoint, init);
}
function sendResponsesCreate(connection, body) {
    if (!connection || typeof connection.send !== "function")
        throw new Error("Responses WebSocket connection is not writable");
    if (!Array.isArray(body?.input))
        throw new Error("Responses WebSocket input must be a list");
    const config = connection.config || {}, options = (0, provider_request_diagnostics_1.withRequestDiagnostics)(connection.requestOptions || {}, config);
    options._cacheValidationPermit = (0, cache_validation_budget_1.reserveCacheValidationRequest)(options, config, 'responses', 'websocket');
    const request = { ...body, store: false };
    (0, provider_request_diagnostics_1.startProviderAttempt)(options, config, request, 'responses', connection.url);
    let closed = false;
    const finish = (ok, usage, error) => {
        if (closed)
            return;
        closed = true;
        (0, provider_request_diagnostics_1.finishProviderAttempt)(options, { ok, usage, error });
        connection.removeEventListener?.('message', message);
        connection.removeEventListener?.('error', failed);
        connection.removeEventListener?.('close', ended);
    };
    const message = (event) => {
        let value;
        try {
            value = JSON.parse(String(event.data));
        }
        catch {
            return;
        }
        if (value.type === 'response.completed')
            finish(true, value.response?.usage);
        else if (['response.failed', 'response.incomplete', 'error'].includes(value.type) || value.error)
            finish(false, value.response?.usage, { code: 'CCM_RESPONSES_WEBSOCKET_FAILED' });
    };
    const failed = () => finish(false, undefined, { code: 'CCM_RESPONSES_WEBSOCKET_FAILED' });
    const ended = () => finish(false, undefined, { code: 'CCM_RESPONSES_WEBSOCKET_CLOSED' });
    connection.addEventListener?.('message', message);
    connection.addEventListener?.('error', failed);
    connection.addEventListener?.('close', ended);
    try {
        connection.send(JSON.stringify({ type: 'response.create', ...request }));
    }
    catch (error) {
        finish(false, undefined, error);
        throw error;
    }
}
function closeResponsesWebSocket(connection) {
    try {
        connection?.close?.();
    }
    catch { }
}
function isResponsesWebSocketSupported(config = {}) {
    if (String(process.env.CCM_RESPONSES_WEBSOCKET || "").trim().toLowerCase() === "off")
        return false;
    return !!responsesWebSocketUrl(String(config?.apiUrl || ""), config?.responsesWebSocketUrl);
}
async function probeResponsesWebSocket(config, options = {}) {
    const endpoint = String(config?.apiUrl || "");
    const auditOptions = (0, provider_request_diagnostics_1.withRequestDiagnostics)({ requestAttribution: { purpose: 'responses_websocket_probe', requestClass: 'probe' } }, config);
    try {
        const response = await requestResponsesWebSocket(endpoint, {
            timeoutMs: options.timeoutMs || 15000,
            responsesWebSocketUrl: config?.responsesWebSocketUrl,
            headers: { Authorization: `Bearer ${config?.apiKey || ""}` },
            body: JSON.stringify({ model: config?.model, input: [{ role: "user", content: [{ type: "input_text", text: "Reply with OK" }] }], max_output_tokens: 8, store: false }),
        }, { options: auditOptions, config, protocol: 'responses' });
        let completed = false;
        let usageReported = false;
        const eventTypes = new Set();
        let responseId = "";
        for await (const chunk of response.body) {
            const text = new TextDecoder().decode(chunk);
            for (const line of text.split("\n"))
                if (line.startsWith("data: ")) {
                    try {
                        const event = JSON.parse(line.slice(6));
                        const eventType = String(event?.type || "");
                        if (eventType)
                            eventTypes.add(eventType);
                        if (["response.completed", "response.incomplete"].includes(eventType))
                            completed = true;
                        if (event?.response?.usage || event?.usage)
                            usageReported = true;
                        responseId = responseId || String(event?.response?.id || event?.id || "");
                    }
                    catch { }
                }
        }
        (0, provider_request_diagnostics_1.finishProviderAttempt)(auditOptions, { ok: completed });
        return {
            handshake: true,
            responseCreate: completed,
            usageReported,
            responseIdPresent: !!responseId,
            eventTypes: Array.from(eventTypes).sort(),
            urlFingerprint: responsesWebSocketUrlFingerprint(responsesWebSocketUrl(endpoint, config?.responsesWebSocketUrl)),
        };
    }
    catch (error) {
        (0, provider_request_diagnostics_1.finishProviderAttempt)(auditOptions, { ok: false, error });
        throw error;
    }
}
function runResponsesWebSocketSelfTest() {
    const https = responsesWebSocketUrl("https://gateway.example/v1/responses");
    return { pass: https === "wss://gateway.example/v1/responses" && !responsesWebSocketUrl("https://gateway.example/v1/chat/completions"), https };
}
//# sourceMappingURL=openai-responses-websocket-transport.js.map