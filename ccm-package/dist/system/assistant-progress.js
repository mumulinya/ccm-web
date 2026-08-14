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
exports.USER_VISIBLE_PROGRESS_MAX_CHARS = void 0;
exports.normalizeAssistantProgressKind = normalizeAssistantProgressKind;
exports.sanitizeAssistantProgressText = sanitizeAssistantProgressText;
exports.assistantProgressToolFamily = assistantProgressToolFamily;
exports.buildAssistantProgressFallback = buildAssistantProgressFallback;
exports.buildToolBatchOutcomeProgress = buildToolBatchOutcomeProgress;
exports.validateAssistantProgressKind = validateAssistantProgressKind;
exports.assistantProgressMilestoneChecksum = assistantProgressMilestoneChecksum;
exports.assistantProgressBatchId = assistantProgressBatchId;
exports.assistantProgressNarrationEnabled = assistantProgressNarrationEnabled;
const crypto = __importStar(require("crypto"));
exports.USER_VISIBLE_PROGRESS_MAX_CHARS = 120;
const PROGRESS_KINDS = new Set([
    "before_tools", "key_finding", "direction_change", "blocker",
    "rework", "verification", "before_summary",
]);
const SECRET_VALUE = /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret|credential)\s*[:=]\s*["']?)[^\s,"'}]{6,}/gi;
const INTERNAL_PROTOCOL = /(?:CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|scratchpad|system[_ -]?prompt|native[_ -]?session|lease[_ -]?id|generation[_ -]?fence|trace[_ -]?id|workflowDecision|workflow_decision|dispatchPolicy|dispatch_policy|authorizationDirective|selectedSkills|requiresCodeChanges|requiresIndependentReview|memoryPolicy)/i;
const RAW_JSON = /^\s*[\[{][\s\S]*[\]}]\s*$/;
const RAW_OR_TRUNCATED_STRUCTURE = /^\s*[\[{](?=[\s\S]{0,160}["']?[A-Za-z_$][\w$-]*["']?\s*:)/;
function normalizeAssistantProgressKind(value, fallback = "before_tools") {
    const kind = String(value || "").trim().toLowerCase();
    return PROGRESS_KINDS.has(kind) ? kind : fallback;
}
function firstSentences(value, maxSentences = 2) {
    let sentenceCount = 0;
    for (let index = 0; index < value.length; index += 1) {
        if (!/[。！？!?]/.test(value[index]))
            continue;
        sentenceCount += 1;
        if (sentenceCount >= maxSentences)
            return value.slice(0, index + 1).trim();
    }
    return value;
}
function sanitizeAssistantProgressText(value, max = exports.USER_VISIBLE_PROGRESS_MAX_CHARS) {
    const safeMax = Math.max(1, Math.min(exports.USER_VISIBLE_PROGRESS_MAX_CHARS, Number(max || exports.USER_VISIBLE_PROGRESS_MAX_CHARS)));
    let text = String(value ?? "")
        .replace(/```[\s\S]*?```/g, " ")
        .replace(SECRET_VALUE, "$1[redacted]")
        .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
        .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/g, "[redacted]")
        .replace(/[\0\r\n\t]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
    if (!text || RAW_JSON.test(text) || RAW_OR_TRUNCATED_STRUCTURE.test(text) || INTERNAL_PROTOCOL.test(text))
        return "";
    text = text.replace(/^(?:thinking|reasoning|analysis)\s*[:：]\s*/i, "").trim();
    return firstSentences(text).slice(0, safeMax).trim();
}
function assistantProgressToolFamily(nameInput) {
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
function safeSubject(value, max = 42) {
    return sanitizeAssistantProgressText(value, max)
        .replace(/^[“”"'「」『』]+|[“”"'「」『』]+$/g, "")
        .replace(/[。！？!?]+$/g, "")
        .trim();
}
function buildAssistantProgressFallback(requests, context = {}) {
    const rows = Array.isArray(requests) ? requests : [];
    const families = new Set(rows.map(row => assistantProgressToolFamily(row?.name || row?.toolName || row?.tool)));
    const target = safeSubject(context.target, 36);
    const goal = safeSubject(context.goal, 44);
    const subject = target ? `“${target}”` : goal ? `“${goal}”` : "当前任务";
    if (families.has("agent"))
        return sanitizeAssistantProgressText(`我先整理${subject}的目标和验收边界，再交给对应项目 Agent 执行。`);
    if (families.has("verify"))
        return sanitizeAssistantProgressText(`我先验证${subject}的当前结果，确认是否满足验收要求。`);
    if (families.has("knowledge"))
        return sanitizeAssistantProgressText(`我先检索${subject}相关的知识和来源，核对回答所需事实。`);
    if (families.has("git"))
        return sanitizeAssistantProgressText(`我先检查${subject}的代码状态和变更记录，确认实际影响范围。`);
    if (families.has("search"))
        return sanitizeAssistantProgressText(`我先定位${subject}相关的代码、符号和配置，再根据结果继续判断。`);
    if (families.has("read"))
        return sanitizeAssistantProgressText(`我先检查${subject}的项目结构和当前配置。`);
    return sanitizeAssistantProgressText(`我先核对完成${subject}所需的信息。`);
}
function buildToolBatchOutcomeProgress(results, context = {}) {
    const rows = Array.isArray(results) ? results : [];
    const succeeded = rows.filter(row => row?.ok === true);
    const failed = rows.length - succeeded.length;
    if (!succeeded.length)
        return "";
    const families = new Set(succeeded.map(row => assistantProgressToolFamily(row?.name || row?.toolName || row?.tool)));
    const target = safeSubject(context.target, 32);
    const scope = target ? `“${target}”` : "项目";
    const partial = succeeded.some(row => {
        const value = row?.output || row?.rawOutput || row?.result || {};
        return value?.truncated === true || value?.status === "partial" || value?.safeReceipt?.truncated === true
            || Number(value?.continuation?.pendingCount || value?.continuation?.remainingLines || 0) > 0;
    });
    let result = "已取得检查结果";
    if (families.has("search") && families.has("read"))
        result = `已定位并读取${scope}的相关入口与配置`;
    else if (families.has("search"))
        result = `已找到${scope}的相关代码和配置位置`;
    else if (families.has("read"))
        result = `已读取${scope}的项目入口和配置`;
    else if (families.has("knowledge"))
        result = `已取得${scope}相关的知识来源`;
    else if (families.has("git"))
        result = `已检查${scope}的代码状态和变更记录`;
    else if (families.has("verify"))
        result = `已取得${scope}的验证结果`;
    const tail = partial
        ? "，部分内容仍需续读；我会先缩小范围再继续检查。"
        : failed
            ? `；${failed} 项未返回有效结果，我会调整检查方向。`
            : "，正在根据结果确定下一步。";
    return sanitizeAssistantProgressText(`${result}${tail}`);
}
function validateAssistantProgressKind(value, context = {}) {
    const requested = normalizeAssistantProgressKind(value, context.firstBatch ? "before_tools" : "key_finding");
    if (context.terminal)
        return null;
    if (requested === "before_tools")
        return context.firstBatch ? requested : (context.hasSuccessfulObservation ? "key_finding" : null);
    if (requested === "blocker")
        return context.hasFailure ? requested : (context.hasSuccessfulObservation ? "key_finding" : null);
    if (requested === "direction_change")
        return context.directionChanged ? requested : (context.hasSuccessfulObservation ? "key_finding" : null);
    if (requested === "rework")
        return Number(context.attempt || 1) > 1 || context.hasFailure ? requested : null;
    if (requested === "verification")
        return context.verificationActive ? requested : (context.hasSuccessfulObservation ? "key_finding" : null);
    if (requested === "before_summary")
        return context.summaryReady ? requested : null;
    if (requested === "key_finding")
        return context.hasSuccessfulObservation ? requested : null;
    return requested;
}
function assistantProgressMilestoneChecksum(input) {
    return crypto.createHash("sha256").update(JSON.stringify({
        kind: input.kind,
        text: input.text,
        modelCallIndex: Math.max(0, Number(input.modelCallIndex || 0)),
        relatedToolCallIds: [...new Set(input.relatedToolCallIds || [])].sort(),
        batchId: String(input.batchId || "").trim(),
    })).digest("hex");
}
function assistantProgressBatchId(input) {
    const toolIds = [...new Set(input.relatedToolCallIds || [])].filter(Boolean).sort();
    return `batch_${crypto.createHash("sha256").update(JSON.stringify({
        turnId: String(input.turnId || "turn").trim(),
        generation: Math.max(0, Number(input.generation || 0)),
        modelCallIndex: Math.max(0, Number(input.modelCallIndex || 0)),
        toolIds,
    })).digest("hex").slice(0, 24)}`;
}
function assistantProgressNarrationEnabled(config) {
    return config?.ccStyleAgentProgressNarrationEnabled !== false
        && config?.cc_style_agent_progress_narration_enabled !== false;
}
//# sourceMappingURL=assistant-progress.js.map