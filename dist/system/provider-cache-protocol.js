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
exports.hasConfiguredProviderProxy = hasConfiguredProviderProxy;
exports.resolveProviderTransport = resolveProviderTransport;
exports.assertProviderTransportResolution = assertProviderTransportResolution;
exports.resolveProviderCacheProtocol = resolveProviderCacheProtocol;
exports.runProviderCacheProtocolSelfTest = runProviderCacheProtocolSelfTest;
const crypto = __importStar(require("crypto"));
function hasConfiguredProviderProxy(config = {}) {
    return Boolean(config?.proxyUrl || config?.proxy_url
        || config?.proxyEndpoint || config?.proxy_endpoint
        || config?.httpsProxy || config?.https_proxy
        || config?.httpProxy || config?.http_proxy);
}
function hash(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}
function rawEndpoint(value) {
    return String(value || "").trim().replace(/\/+$/, "");
}
function endpointUrl(value) {
    try {
        return new URL(rawEndpoint(value));
    }
    catch {
        return null;
    }
}
function endpointShape(value) {
    const url = endpointUrl(value);
    if (!url)
        return "invalid-endpoint";
    return `${url.protocol}//${url.hostname.toLowerCase()}${url.port ? `:${url.port}` : ""}${url.pathname.replace(/\/+$/, "") || "/"}`;
}
function protocolFromLegacyFamily(value) {
    return {
        openai: "chat_completions",
        anthropic: "anthropic_messages",
        gemini: "gemini_generate_content",
        compatible: "custom",
    }[String(value || "").trim().toLowerCase()] || "";
}
function protocolFromConfiguredValue(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return {
        "chat_completions": "chat_completions",
        "chat-completions": "chat_completions",
        "openai": "chat_completions",
        "openai-compatible": "chat_completions",
        "responses": "responses",
        "openai-responses": "responses",
        "anthropic_messages": "anthropic_messages",
        "anthropic-messages": "anthropic_messages",
        "anthropic-compatible": "anthropic_messages",
        "gemini_generate_content": "gemini_generate_content",
        "gemini-generate-content": "gemini_generate_content",
        "gemini-compatible": "gemini_generate_content",
        "custom": "custom",
    }[normalized] || "";
}
function exactEndpointProtocol(value) {
    const url = endpointUrl(value);
    if (!url)
        return "";
    const path = `${url.pathname}${url.search}`;
    if (/\/chat\/completions(?:\?|$)/i.test(path))
        return "chat_completions";
    if (/\/responses(?:\?|$)/i.test(path))
        return "responses";
    if (/\/messages(?:\?|$)/i.test(path))
        return "anthropic_messages";
    if (/:generateContent(?:\?|$)|\/generateContent(?:\?|$)/i.test(path))
        return "gemini_generate_content";
    return "";
}
function endpointHostHint(value) {
    const url = endpointUrl(value);
    if (!url)
        return "";
    const host = url.hostname.toLowerCase();
    if (/(?:^|\.)anthropic\.com$/.test(host))
        return "anthropic_messages";
    if (/(?:^|\.)generativelanguage\.googleapis\.com$/.test(host))
        return "gemini_generate_content";
    if (/(?:^|\.)openai\.com$/.test(host))
        return "chat_completions";
    return "";
}
function replaceEndpointPath(value, pathname) {
    const url = endpointUrl(value);
    if (!url)
        return rawEndpoint(value);
    url.pathname = pathname;
    url.hash = "";
    return url.toString().replace(/\/$/, "");
}
function normalizedEndpointFor(protocol, value, model = "") {
    const raw = rawEndpoint(value);
    if (!raw)
        return "";
    const url = endpointUrl(raw);
    if (!url)
        return raw;
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (protocol === "chat_completions") {
        if (/\/chat\/completions$/i.test(path))
            return replaceEndpointPath(raw, path);
        if (/\/responses$|\/messages$/i.test(path) || /:generateContent$/i.test(path))
            return replaceEndpointPath(raw, path);
        if (/\/v1$/i.test(path))
            return replaceEndpointPath(raw, `${path}/chat/completions`);
        if (/\/v1\//i.test(path))
            return replaceEndpointPath(raw, path);
        return replaceEndpointPath(raw, `${path === "/" ? "" : path}/v1/chat/completions`);
    }
    if (protocol === "responses") {
        if (/\/responses$/i.test(path))
            return replaceEndpointPath(raw, path);
        if (/\/chat\/completions$|\/messages$/i.test(path) || /:generateContent$/i.test(path))
            return replaceEndpointPath(raw, path);
        if (/\/v1$/i.test(path))
            return replaceEndpointPath(raw, `${path}/responses`);
        return replaceEndpointPath(raw, `${path === "/" ? "" : path}/v1/responses`);
    }
    if (protocol === "anthropic_messages") {
        if (/\/messages$/i.test(path))
            return replaceEndpointPath(raw, path);
        if (/\/v1$/i.test(path))
            return replaceEndpointPath(raw, `${path}/messages`);
        if (/\/v1\//i.test(path))
            return replaceEndpointPath(raw, path);
        return replaceEndpointPath(raw, `${path === "/" ? "" : path}/v1/messages`);
    }
    if (protocol === "gemini_generate_content") {
        if (/:generateContent$/i.test(path))
            return replaceEndpointPath(raw, path);
        const cleanModel = String(model || "").trim().replace(/^models\//i, "");
        if (!cleanModel)
            return replaceEndpointPath(raw, path);
        if (/\/models\/[^/]+$/i.test(path))
            return replaceEndpointPath(raw, `${path}:generateContent`);
        if (/\/v1(?:beta)?$/i.test(path))
            return replaceEndpointPath(raw, `${path}/models/${encodeURIComponent(cleanModel)}:generateContent`);
        return replaceEndpointPath(raw, `${path === "/" ? "" : path}/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent`);
    }
    return replaceEndpointPath(raw, path);
}
function resolveProviderTransport(config = {}) {
    const format = String(config?.format || "auto").trim().toLowerCase();
    const protocolMode = String(config?.protocolMode || config?.protocol_mode || "auto").trim().toLowerCase() === "manual" ? "manual" : "auto";
    const configuredOverride = protocolFromConfiguredValue(config?.protocolOverride || config?.protocol_override);
    const legacyManualOverride = config?.providerNativeCacheFamilyManual === true
        ? protocolFromLegacyFamily(config?.providerNativeCacheFamily || config?.provider_native_cache_family)
        : "";
    const manualOverride = protocolMode === "manual" ? configuredOverride || legacyManualOverride : "";
    const exact = exactEndpointProtocol(config?.apiUrl);
    const hostHint = endpointHostHint(config?.apiUrl);
    const legacyHint = protocolFromConfiguredValue(format);
    let protocol;
    let source;
    let confidence;
    let conflict;
    if (manualOverride) {
        protocol = manualOverride;
        source = "manual_override";
        confidence = "manual";
        if (manualOverride !== "custom" && exact && exact !== manualOverride)
            conflict = "endpoint_override_mismatch";
    }
    else if (exact) {
        protocol = exact;
        source = "exact_endpoint";
        confidence = "exact";
    }
    else if (hostHint && format === "auto") {
        protocol = hostHint;
        source = "compatibility_default";
        confidence = "inferred";
    }
    else if (legacyHint) {
        protocol = legacyHint;
        source = "legacy_hint";
        confidence = "inferred";
    }
    else {
        protocol = "chat_completions";
        source = "compatibility_default";
        confidence = "inferred";
    }
    const normalizedEndpoint = normalizedEndpointFor(protocol, config?.apiUrl, config?.model);
    const headerNames = Object.keys(config?.headers || config?.customHeaders || config?.custom_headers || {})
        .map(value => value.toLowerCase())
        .sort();
    // Cache capability evidence belongs to the bytes-on-the-wire transport, not
    // to the way CCM arrived at that transport.  A compatibility-inferred Chat
    // Completions endpoint and an explicitly selected Chat Completions endpoint
    // are the same transport when their normalized endpoint and headers match.
    // Including source/confidence here made a successful capability probe
    // invisible to foreground requests that resolved the same endpoint through
    // a different configuration path.
    const transportParametersChecksum = hash({
        protocol,
        endpoint: endpointShape(normalizedEndpoint),
        headerNames,
        proxyConfigured: hasConfiguredProviderProxy(config),
    });
    return {
        schema: "ccm-provider-transport-resolution-v2",
        protocol,
        normalizedEndpoint,
        source,
        confidence,
        ...(conflict ? { conflict } : {}),
        transportIdentityChecksum: transportParametersChecksum,
        transportParametersChecksum,
        contentStored: false,
    };
}
function assertProviderTransportResolution(config = {}) {
    const resolution = resolveProviderTransport(config);
    if (resolution.conflict === "endpoint_override_mismatch") {
        const error = new Error("接口协议高级覆盖与完整 API 端点不一致，请修改端点或关闭人工覆盖");
        error.code = "CCM_PROVIDER_PROTOCOL_ENDPOINT_MISMATCH";
        error.resolution = resolution;
        throw error;
    }
    return resolution;
}
function resolveProviderCacheProtocol(config = {}) {
    return resolveProviderTransport(config);
}
function runProviderCacheProtocolSelfTest() {
    const arbitraryModels = ["gpt-5.6", "claude-custom", "qwen3-coder", "deepseek-v3", "gemini-proxy"];
    const protocols = arbitraryModels.map(model => resolveProviderTransport({
        format: "auto",
        apiUrl: "https://gateway.example/v1/chat/completions",
        model,
    }).protocol);
    const chat = resolveProviderTransport({ format: "openai-responses", apiUrl: "https://gateway.example/v1/chat/completions" });
    const responses = resolveProviderTransport({ format: "openai-compatible", apiUrl: "https://gateway.example/v1/responses" });
    const base = resolveProviderTransport({ format: "auto", apiUrl: "https://gateway.example/v1" });
    const legacyBase = resolveProviderTransport({ format: "openai-responses", apiUrl: "https://gateway.example/v1" });
    const manualResponses = resolveProviderTransport({ protocolMode: "manual", protocolOverride: "responses", apiUrl: "https://gateway.example/v1" });
    const manualChat = resolveProviderTransport({ protocolMode: "manual", protocolOverride: "chat_completions", apiUrl: "https://gateway.example/v1" });
    const conflict = resolveProviderTransport({ protocolMode: "manual", protocolOverride: "responses", apiUrl: "https://gateway.example/v1/chat/completions" });
    const checks = {
        modelNameDoesNotSelectProtocol: protocols.every(value => value === "chat_completions"),
        exactChatEndpointOverridesLegacyFormat: chat.protocol === "chat_completions" && chat.source === "exact_endpoint",
        exactResponsesEndpointOverridesLegacyFormat: responses.protocol === "responses" && responses.source === "exact_endpoint",
        ambiguousBaseDefaultsToChat: base.protocol === "chat_completions" && base.source === "compatibility_default",
        ambiguousLegacyBaseKeepsFormatHint: legacyBase.protocol === "responses" && legacyBase.source === "legacy_hint",
        manualOverrideSupportsAmbiguousBase: manualResponses.protocol === "responses" && manualResponses.source === "manual_override",
        equivalentTransportIgnoresResolutionSource: manualChat.transportIdentityChecksum === base.transportIdentityChecksum,
        manualConflictIsReported: conflict.conflict === "endpoint_override_mismatch",
        endpointNormalizationIsIdempotent: resolveProviderTransport({ format: "auto", apiUrl: responses.normalizedEndpoint }).normalizedEndpoint === responses.normalizedEndpoint,
        responsesUsesPluralEndpoint: /\/v1\/responses$/i.test(manualResponses.normalizedEndpoint),
    };
    return { pass: Object.values(checks).every(Boolean), checks, samples: { chat, responses, base, legacyBase, manualResponses, conflict } };
}
//# sourceMappingURL=provider-cache-protocol.js.map