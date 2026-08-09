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
exports.normalizeAssistantProgressKind = normalizeAssistantProgressKind;
exports.sanitizeAssistantProgressText = sanitizeAssistantProgressText;
exports.buildAssistantProgressFallback = buildAssistantProgressFallback;
exports.assistantProgressMilestoneChecksum = assistantProgressMilestoneChecksum;
exports.assistantProgressNarrationEnabled = assistantProgressNarrationEnabled;
const crypto = __importStar(require("crypto"));
const PROGRESS_KINDS = new Set([
    "before_tools", "key_finding", "direction_change", "blocker",
    "rework", "verification", "before_summary",
]);
const SECRET_VALUE = /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret|credential)\s*[:=]\s*["']?)[^\s,"'}]{6,}/gi;
const INTERNAL_PROTOCOL = /(?:CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|scratchpad|system[_ -]?prompt|native[_ -]?session|lease[_ -]?id|generation[_ -]?fence|trace[_ -]?id)/i;
const RAW_JSON = /^\s*[\[{][\s\S]*[\]}]\s*$/;
function normalizeAssistantProgressKind(value, fallback = "before_tools") {
    const kind = String(value || "").trim().toLowerCase();
    return PROGRESS_KINDS.has(kind) ? kind : fallback;
}
function sanitizeAssistantProgressText(value, max = 600) {
    let text = String(value ?? "")
        .replace(/```[\s\S]*?```/g, " ")
        .replace(SECRET_VALUE, "$1[redacted]")
        .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
        .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/g, "[redacted]")
        .replace(/[\0\r\n\t]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
    if (!text || RAW_JSON.test(text) || INTERNAL_PROTOCOL.test(text))
        return "";
    text = text.replace(/^(?:thinking|reasoning|analysis)\s*[:：]\s*/i, "").trim();
    return text.slice(0, Math.max(1, max));
}
function toolFamily(nameInput) {
    const name = String(nameInput || "").toLowerCase();
    if (/grep|glob|search|find_|symbol|diagnostic/.test(name))
        return "search";
    if (/read|list_directory|workspace/.test(name))
        return "read";
    if (/knowledge/.test(name))
        return "knowledge";
    if (/git|diff|history/.test(name))
        return "git";
    if (/dispatch|agent|skill_fork/.test(name))
        return "agent";
    if (/test|verify|lint|build|typecheck/.test(name))
        return "verify";
    return "tool";
}
function buildAssistantProgressFallback(requests) {
    const rows = Array.isArray(requests) ? requests : [];
    const families = new Set(rows.map(row => toolFamily(row?.name || row?.toolName || row?.tool)));
    if (families.has("agent"))
        return "我先整理当前目标和验收边界，再把需要执行的部分交给对应项目 Agent。";
    if (families.has("verify"))
        return "我先运行相关检查，确认当前结果是否满足验收要求。";
    if (families.has("knowledge"))
        return "我先检索当前作用域的知识与来源，核对回答所需的事实。";
    if (families.has("git"))
        return "我先检查当前代码状态和变更记录，确认实际影响范围。";
    if (families.has("search"))
        return "我先定位相关代码、符号和配置，再根据结果继续判断。";
    if (families.has("read"))
        return "我先检查相关项目结构和当前配置。";
    return "我先核对完成当前请求所需的信息。";
}
function assistantProgressMilestoneChecksum(input) {
    return crypto.createHash("sha256").update(JSON.stringify({
        kind: input.kind,
        text: input.text,
        modelCallIndex: Math.max(0, Number(input.modelCallIndex || 0)),
        relatedToolCallIds: [...new Set(input.relatedToolCallIds || [])].sort(),
    })).digest("hex");
}
function assistantProgressNarrationEnabled(config) {
    return config?.ccStyleAgentProgressNarrationEnabled !== false
        && config?.cc_style_agent_progress_narration_enabled !== false;
}
//# sourceMappingURL=assistant-progress.js.map