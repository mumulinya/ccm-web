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
exports.PREVIOUS_APPEND_ONLY_V10_WIRE_LAYOUT_VERSION = exports.PREVIOUS_APPEND_ONLY_V9_WIRE_LAYOUT_VERSION = exports.PREVIOUS_APPEND_ONLY_V8_WIRE_LAYOUT_VERSION = exports.PREVIOUS_APPEND_ONLY_V7_WIRE_LAYOUT_VERSION = exports.PREVIOUS_APPEND_ONLY_V6_WIRE_LAYOUT_VERSION = exports.PREVIOUS_APPEND_ONLY_V5_WIRE_LAYOUT_VERSION = exports.PREVIOUS_APPEND_ONLY_V4_WIRE_LAYOUT_VERSION = exports.PREVIOUS_APPEND_ONLY_V3_WIRE_LAYOUT_VERSION = exports.PREVIOUS_PROVIDER_CACHE_WIRE_LAYOUT_VERSION = exports.LEGACY_PROVIDER_CACHE_WIRE_LAYOUT_VERSION = exports.PROVIDER_CACHE_WIRE_LAYOUT_VERSION = void 0;
exports.normalizeProviderCacheWireLayoutVersion = normalizeProviderCacheWireLayoutVersion;
exports.buildAppendOnlyProviderTranscript = buildAppendOnlyProviderTranscript;
exports.isAppendOnlyProviderRuntimeMessage = isAppendOnlyProviderRuntimeMessage;
const crypto = __importStar(require("crypto"));
/**
 * The provider cache contract is append-only.  Mutable runtime controls must
 * never be inserted into the leading system run because doing so changes the
 * bytes of every previously committed turn.  Keep this policy in one small
 * module so all three main-agent surfaces use the same wire layout.
 */
// v11 keeps the complete deterministic public instruction run in the
// Responses `instructions` field. A later private/tool result
// must follow that snapshot, not push it to a new tail position.
exports.PROVIDER_CACHE_WIRE_LAYOUT_VERSION = "ccm-append-only-v11";
exports.LEGACY_PROVIDER_CACHE_WIRE_LAYOUT_VERSION = "ccm-append-only-v1";
exports.PREVIOUS_PROVIDER_CACHE_WIRE_LAYOUT_VERSION = "ccm-append-only-v2";
exports.PREVIOUS_APPEND_ONLY_V3_WIRE_LAYOUT_VERSION = "ccm-append-only-v3";
exports.PREVIOUS_APPEND_ONLY_V4_WIRE_LAYOUT_VERSION = "ccm-append-only-v4";
exports.PREVIOUS_APPEND_ONLY_V5_WIRE_LAYOUT_VERSION = "ccm-append-only-v5";
exports.PREVIOUS_APPEND_ONLY_V6_WIRE_LAYOUT_VERSION = "ccm-append-only-v6";
exports.PREVIOUS_APPEND_ONLY_V7_WIRE_LAYOUT_VERSION = "ccm-append-only-v7";
exports.PREVIOUS_APPEND_ONLY_V8_WIRE_LAYOUT_VERSION = "ccm-append-only-v8";
exports.PREVIOUS_APPEND_ONLY_V9_WIRE_LAYOUT_VERSION = "ccm-append-only-v9";
exports.PREVIOUS_APPEND_ONLY_V10_WIRE_LAYOUT_VERSION = "ccm-append-only-v10";
/** New requests always use the current layout; old checkpoints remain readable. */
function normalizeProviderCacheWireLayoutVersion(value) {
    const version = String(value || "").trim();
    return !version
        || version === exports.LEGACY_PROVIDER_CACHE_WIRE_LAYOUT_VERSION
        || version === exports.PREVIOUS_PROVIDER_CACHE_WIRE_LAYOUT_VERSION
        || version === exports.PREVIOUS_APPEND_ONLY_V3_WIRE_LAYOUT_VERSION
        || version === exports.PREVIOUS_APPEND_ONLY_V4_WIRE_LAYOUT_VERSION
        || version === exports.PREVIOUS_APPEND_ONLY_V5_WIRE_LAYOUT_VERSION
        || version === exports.PREVIOUS_APPEND_ONLY_V6_WIRE_LAYOUT_VERSION
        || version === exports.PREVIOUS_APPEND_ONLY_V7_WIRE_LAYOUT_VERSION
        || version === exports.PREVIOUS_APPEND_ONLY_V8_WIRE_LAYOUT_VERSION
        || version === exports.PREVIOUS_APPEND_ONLY_V9_WIRE_LAYOUT_VERSION
        || version === exports.PREVIOUS_APPEND_ONLY_V10_WIRE_LAYOUT_VERSION
        ? exports.PROVIDER_CACHE_WIRE_LAYOUT_VERSION
        : version;
}
const RUNTIME_PROMPT_PARTS = new Set([
    "tool_catalog_update",
    "session",
    "scope_instructions",
    "skills",
    "availability",
    "planning_control",
    "runtime_context",
]);
function text(value) {
    if (typeof value === "string")
        return value;
    try {
        return JSON.stringify(value ?? "");
    }
    catch {
        return String(value ?? "");
    }
}
function checksum(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex").slice(0, 64);
}
function isRuntimeSystemMessage(message) {
    if (message?.runtimeContextCommitted === true)
        return false;
    const role = String(message?.role || "").toLowerCase();
    const contextType = String(message?.contextBlockType || message?.context_block_type || "").toLowerCase();
    const promptPart = String(message?.promptPart || message?.prompt_part || "").toLowerCase();
    // The wire projection represents the mutable runtime controls as a
    // synthetic `user` message.  A subsequent prepare pass receives that
    // already-projected message, so it must be recognized as dynamic too.
    // Otherwise the old runtime suffix is retained as conversation history
    // and a fresh suffix is appended, which changes an existing byte prefix
    // during a tool loop (the observed fallback to the 192-token baseline).
    if (role === "system")
        return contextType === "dynamic_context" || RUNTIME_PROMPT_PARTS.has(promptPart);
    return contextType === "runtime_context"
        && (message?.isMeta === true || promptPart === "runtime_context");
}
function runtimeMessage(rows, dynamic, turnId) {
    const content = dynamic.map(row => {
        const contextType = String(row?.contextBlockType || row?.context_block_type || "").toLowerCase();
        // Preserve an already materialized runtime suffix byte-for-byte.  This
        // makes the normalization idempotent when the neutral cache layer calls
        // the transcript builder a second time.
        if (contextType === "runtime_context" && String(row?.role || "").toLowerCase() === "user") {
            return text(row?.content ?? "").trim();
        }
        const part = String(row?.promptPart || row?.prompt_part || row?.contextBlockType || "runtime_context");
        return `【运行时上下文:${part}】\n${text(row?.content ?? "").trim()}`;
    }).filter(Boolean).join("\n\n").trim();
    if (!content)
        return null;
    return {
        id: `runtime-context:${turnId || 'unbound'}:${rows.length}:${checksum(content)}`,
        role: "user",
        content,
        isMeta: true,
        contextBlockType: "runtime_context",
        promptPart: "runtime_context",
        runtimeContextCommitted: true,
        wireLayoutVersion: exports.PROVIDER_CACHE_WIRE_LAYOUT_VERSION,
        contentStored: false,
    };
}
/**
 * Move mutable system controls to a non-prefix suffix of the current
 * request. The persisted session transcript remains authoritative; this is
 * only a wire projection and therefore does not create a second history
 * entry. Keeping the suffix after the committed conversation is important:
 * rebuilding a dynamic system block at the head would change byte 1 on every
 * turn and leave the provider with only its small baseline cache fragment.
 */
function buildAppendOnlyProviderTranscript(messagesInput, options = {}) {
    const input = Array.isArray(messagesInput) ? messagesInput : [];
    const mutable = input.filter(isRuntimeSystemMessage);
    // A v7 projection may be present in an old checkpoint. Prefer the current
    // source controls, and never treat the old uncommitted tail as prior wire.
    const currentControls = mutable.filter(message => String(message?.role || '').toLowerCase() === 'system');
    const dynamic = currentControls.length ? currentControls : mutable;
    const base = input.filter(message => !isRuntimeSystemMessage(message));
    const runtime = runtimeMessage(base, dynamic, String(options.turnId || ''));
    let messages = base.slice();
    const lastCommittedRuntime = [...base].reverse().find(message => message?.runtimeContextCommitted === true);
    if (runtime && lastCommittedRuntime?.content !== runtime.content)
        messages.push(runtime);
    let currentUser = -1;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (String(messages[index]?.role || "").toLowerCase() === "user"
            && !isAppendOnlyProviderRuntimeMessage(messages[index])) {
            currentUser = index;
            break;
        }
    }
    const committed = currentUser >= 0 ? messages.slice(0, currentUser) : messages;
    const lastCommitted = [...committed].reverse().find(message => String(message?.id || message?.uuid || message?.messageId || "").trim());
    return {
        messages,
        wireLayoutVersion: exports.PROVIDER_CACHE_WIRE_LAYOUT_VERSION,
        movedDynamicBlockCount: mutable.length,
        messageOrderChecksum: checksum(messages.map(message => ({
            id: String(message?.id || message?.uuid || message?.messageId || ""),
            role: String(message?.role || ""),
            type: String(message?.type || ""),
            content: checksum(message?.content ?? message?.text ?? null),
        }))),
        committedPrefixChecksum: checksum(committed.map(message => ({
            role: String(message?.role || ""),
            type: String(message?.type || ""),
            content: checksum(message?.content ?? message?.text ?? null),
        }))),
        lastCommittedMessageId: String(lastCommitted?.id || lastCommitted?.uuid || lastCommitted?.messageId || ""),
        contentStored: false,
    };
}
function isAppendOnlyProviderRuntimeMessage(message) {
    return String(message?.contextBlockType || message?.context_block_type || "").toLowerCase() === "runtime_context";
}
//# sourceMappingURL=provider-cache-transcript.js.map