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
exports.normalizePrePlanQuestions = normalizePrePlanQuestions;
exports.buildPrePlanClarification = buildPrePlanClarification;
exports.formatPrePlanAnswers = formatPrePlanAnswers;
exports.formatPrePlanClarificationText = formatPrePlanClarificationText;
exports.runPrePlanClarificationSelfTest = runPrePlanClarificationSelfTest;
const crypto = __importStar(require("crypto"));
function clean(value, max = 240) {
    return String(value || "")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/(?:prompt|trace[_-]?id|native[_-]?session|raw[_-]?(?:stdout|output)|api[_-]?key)\s*[:=][^\n]*/gi, "")
        .replace(/\s+/g, " ").trim().slice(0, max);
}
function stableId(prefix, value, index) {
    const digest = crypto.createHash("sha256").update(`${prefix}:${value}:${index}`).digest("hex").slice(0, 10);
    return `${prefix}_${digest}`;
}
function normalizePrePlanQuestions(value, fallback = []) {
    const source = Array.isArray(value) && value.length ? value : Array.isArray(fallback) ? fallback : [];
    const seen = new Set();
    const questions = [];
    for (const [index, raw] of source.entries()) {
        const object = raw && typeof raw === "object" ? raw : { label: raw, question: raw, type: "text" };
        const label = clean(object.label || object.question || object.title, 160);
        if (!label)
            continue;
        const signature = label.toLocaleLowerCase().replace(/[\s?？。！!，,：:]/g, "");
        if (!signature || seen.has(signature))
            continue;
        seen.add(signature);
        const rawType = clean(object.type || object.kind, 24).toLowerCase();
        let type = rawType === "single" || rawType === "multiple" ? rawType : "text";
        const options = (Array.isArray(object.options) ? object.options : []).slice(0, 4).map((item, optionIndex) => {
            const option = item && typeof item === "object" ? item : { label: item };
            const optionLabel = clean(option.label || option.title || option.value, 100);
            if (!optionLabel)
                return null;
            return {
                id: clean(option.id, 80) || stableId("option", optionLabel, optionIndex),
                label: optionLabel,
                description: clean(option.description || option.reason, 160),
                recommended: option.recommended === true,
                safeDefault: option.safeDefault === true || option.safe_default === true,
            };
        }).filter(Boolean);
        if ((type === "single" || type === "multiple") && options.length < 2)
            type = "text";
        questions.push({
            id: clean(object.id, 80) || stableId("question", label, index),
            label,
            reason: clean(object.reason || object.description, 180) || "该选择会影响业务流程、实施范围或验收结果。",
            type,
            required: object.required !== false,
            ...(type === "text" ? {} : { options }),
        });
        if (questions.length >= 3)
            break;
    }
    return questions;
}
function buildPrePlanClarification(input) {
    const questions = normalizePrePlanQuestions(input.questions, input.fallbackQuestions);
    const safeDefaultsAvailable = questions.length > 0 && questions.every(question => (question.type === "text" ? question.required === false : question.options?.some((option) => option.safeDefault)));
    const scope = ["project", "group"].includes(String(input.scope)) ? input.scope : "global";
    const scopeId = clean(input.scopeId || (scope === "global" ? "global" : ""), 180);
    const exactSessionId = clean(input.exactSessionId, 180);
    const anchorMessageId = clean(input.anchorMessageId, 180);
    const id = clean(input.id, 180) || `preplan:${scope}:${scopeId}:${anchorMessageId || exactSessionId}`;
    const generation = Math.max(0, Number(input.generation || 0));
    const revision = Math.max(1, Number(input.revision || 1));
    const round = Math.max(1, Math.min(2, Number(input.round || 1)));
    return {
        schema: "ccm-pre-plan-clarification-v1",
        id, scope, scopeId, exactSessionId, anchorMessageId,
        status: ["resolved", "cancelled"].includes(String(input.status)) ? input.status : "pending",
        revision, generation, round,
        title: clean(input.title, 120) || `制定计划前，需要确认 ${questions.length} 项`,
        headline: clean(input.headline, 220) || "这些选择会影响业务流程和验收范围。",
        questions,
        allowAdditionalNote: input.allowAdditionalNote !== false,
        safeDefaultsAvailable,
        originalRequestChecksum: clean(input.originalRequestChecksum, 128),
        contentStored: false,
    };
}
function formatPrePlanAnswers(clarification, answers = {}, additionalNote = "") {
    const lines = [];
    for (const question of clarification?.questions || []) {
        const raw = answers?.[question.id];
        const selected = Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw];
        const labels = selected.map((value) => {
            const option = question.options?.find((item) => item.id === value);
            return clean(option?.label || value, 160);
        }).filter(Boolean);
        if (labels.length)
            lines.push(`${question.label}：${labels.join("、")}`);
    }
    const note = clean(additionalNote, 600);
    if (note)
        lines.push(`补充说明：${note}`);
    return lines.join("\n");
}
function formatPrePlanClarificationText(clarification) {
    const questions = Array.isArray(clarification?.questions) ? clarification.questions : [];
    if (!questions.length)
        return "请补充会影响实施方案或验收结果的业务信息。";
    return [
        clarification.title || `制定计划前，需要确认 ${questions.length} 项`,
        ...questions.map((question, index) => {
            const options = Array.isArray(question.options) && question.options.length
                ? `\n${question.options.map((option, optionIndex) => `   ${optionIndex + 1}. ${clean(option.label, 100)}${option.recommended ? "（推荐）" : ""}`).join("\n")}`
                : "";
            return `${index + 1}. ${clean(question.label, 160)}${options}`;
        }),
        "请按“问题序号：选项序号/补充文字”回复。回答后我会先生成详细计划，等待你确认后再执行。",
    ].join("\n");
}
function runPrePlanClarificationSelfTest() {
    const projection = buildPrePlanClarification({
        scope: "project", scopeId: "demo", exactSessionId: "session-1", anchorMessageId: "message-1",
        questions: [
            { label: "审核方式", type: "single", options: [{ label: "人工审核", recommended: true, safeDefault: true }, { label: "自动退款" }] },
            { label: "实施范围", type: "multiple", options: ["后端接口", "管理端页面"] },
            "请补充验收要求",
            "请补充验收要求",
        ],
    });
    return {
        pass: projection.questions.length === 3 && projection.safeDefaultsAvailable === false && projection.contentStored === false,
        checks: { cappedAndDeduped: projection.questions.length === 3, structuredOptions: projection.questions[0]?.options?.length === 2, safeProjection: projection.contentStored === false },
    };
}
//# sourceMappingURL=pre-plan-clarification.js.map