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
exports.validateClarificationAnswerSubmission = validateClarificationAnswerSubmission;
const crypto = __importStar(require("crypto"));
const pre_plan_clarification_1 = require("./pre-plan-clarification");
function clean(value, max) {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}
function fail(message, code, statusCode = 400) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    throw error;
}
function isOtherOption(option) {
    return clean(option?.id, 80).toLowerCase() === pre_plan_clarification_1.PRE_PLAN_OTHER_OPTION_ID
        || /^(其他|other)$/i.test(clean(option?.label, 80));
}
function defaultAnswer(question) {
    const defaults = (Array.isArray(question?.options) ? question.options : [])
        .filter((option) => option?.safeDefault === true && !isOtherOption(option))
        .map((option) => String(option.id));
    if (question?.type === "multiple")
        return defaults;
    if (question?.type === "single")
        return defaults[0] || "";
    return "";
}
function validateClarificationAnswerSubmission(clarification, input, options = {}) {
    const questions = Array.isArray(clarification?.questions) ? clarification.questions.slice(0, 3) : [];
    if (!questions.length)
        fail("当前询问没有可回答的问题，请刷新后重试", "CLARIFICATION_QUESTIONS_MISSING", 409);
    const submittedAnswers = input?.answers && typeof input.answers === "object" && !Array.isArray(input.answers)
        ? input.answers
        : {};
    const submittedNotes = input?.otherNotes && typeof input.otherNotes === "object" && !Array.isArray(input.otherNotes)
        ? input.otherNotes
        : {};
    const questionIds = new Set(questions.map((question) => String(question.id || "")));
    for (const key of Object.keys(submittedAnswers)) {
        if (!questionIds.has(key))
            fail("回答中包含不属于当前询问的问题", "CLARIFICATION_ANSWER_INVALID");
    }
    for (const key of Object.keys(submittedNotes)) {
        if (!questionIds.has(key))
            fail("回答中包含不属于当前询问的补充说明", "CLARIFICATION_ANSWER_INVALID");
    }
    const answers = {};
    const otherNotes = {};
    const completedQuestionIds = [];
    for (const question of questions) {
        const questionId = clean(question?.id, 80);
        if (!questionId)
            fail("询问问题缺少稳定标识", "CLARIFICATION_QUESTIONS_INVALID", 409);
        const type = question?.type === "multiple" || question?.type === "text" ? question.type : "single";
        const raw = submittedAnswers[questionId] ?? (options.useDefaults ? defaultAnswer(question) : undefined);
        if (type === "text") {
            const value = clean(raw, 600);
            if (question.required !== false && !value)
                fail(`请回答：${clean(question.label, 120)}`, "CLARIFICATION_ANSWERS_INCOMPLETE");
            if (value) {
                answers[questionId] = value;
                completedQuestionIds.push(questionId);
            }
            continue;
        }
        const optionsById = new Map((Array.isArray(question.options) ? question.options : [])
            .slice(0, 5)
            .map((option) => [String(option?.id || ""), option]));
        const selected = type === "multiple"
            ? (Array.isArray(raw) ? raw : raw === undefined || raw === null || raw === "" ? [] : [raw])
            : (Array.isArray(raw) ? raw : raw === undefined || raw === null || raw === "" ? [] : [raw]);
        const normalized = [...new Set(selected.map(value => clean(value, 80)).filter(Boolean))];
        if (type === "single" && normalized.length > 1)
            fail(`“${clean(question.label, 120)}”只能选择一项`, "CLARIFICATION_ANSWER_INVALID");
        if (normalized.some(value => !optionsById.has(value)))
            fail(`“${clean(question.label, 120)}”包含无效选项`, "CLARIFICATION_ANSWER_INVALID");
        if (question.required !== false && !normalized.length)
            fail(`请选择：${clean(question.label, 120)}`, "CLARIFICATION_ANSWERS_INCOMPLETE");
        const selectsOther = normalized.some(value => isOtherOption(optionsById.get(value)));
        const note = clean(submittedNotes[questionId], 400);
        if (selectsOther && !note)
            fail(`请说明“${clean(question.label, 120)}”中的其他选择`, "CLARIFICATION_OTHER_NOTE_REQUIRED");
        if (note && !selectsOther)
            fail(`“${clean(question.label, 120)}”未选择其他选项，不能提交其他说明`, "CLARIFICATION_ANSWER_INVALID");
        if (normalized.length) {
            answers[questionId] = type === "multiple" ? normalized : normalized[0];
            completedQuestionIds.push(questionId);
        }
        if (note)
            otherNotes[questionId] = note;
    }
    const additionalNote = clean(input?.additionalNote, 600);
    const answersForFormatting = { ...answers };
    for (const [questionId, note] of Object.entries(otherNotes))
        answersForFormatting[`${questionId}__note`] = note;
    const answerText = (0, pre_plan_clarification_1.formatPrePlanAnswers)(clarification, answersForFormatting, additionalNote);
    if (!answerText)
        fail("请至少完成一项回答", "CLARIFICATION_ANSWERS_INCOMPLETE");
    const answerChecksum = crypto.createHash("sha256").update(JSON.stringify({ answers, otherNotes, additionalNote })).digest("hex");
    return { answers, otherNotes, additionalNote, answerText, answerChecksum, completedQuestionIds, questionCount: questions.length };
}
//# sourceMappingURL=clarification-answer-validation.js.map