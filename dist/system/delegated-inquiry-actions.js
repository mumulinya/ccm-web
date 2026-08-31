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
exports.performDelegatedInquiryAction = performDelegatedInquiryAction;
const crypto = __importStar(require("crypto"));
const storage_1 = require("../modules/collaboration/storage");
const delegated_inquiry_projections_1 = require("./delegated-inquiry-projections");
const delegated_inquiry_recovery_1 = require("./delegated-inquiry-recovery");
function digest(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function safeText(value, max) {
    return String(value || "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, max);
}
function navigationFor(projection, action) {
    const subject = projection.questionSummary || "此前的源码核对事项";
    const evidence = projection.evidenceReferenceChecksum ? `证据引用校验：${projection.evidenceReferenceChecksum.slice(0, 16)}。` : "";
    const draftMessage = action === "promote_to_development"
        ? `请把此前的只读核对事项转为正式开发需求：${subject}。${evidence}请重新判断目标、风险和证据策略，并按正式计划与派发链路执行。`
        : `请基于此前已取得的证据继续回答：${subject}。${evidence}请明确区分已经确认和仍待核对的部分。`;
    return { kind: "navigate", tab: "global-agent", context: { sessionId: projection.sourceSessionId, draftMessage } };
}
async function performDelegatedInquiryAction(input) {
    const projection = (0, delegated_inquiry_projections_1.getDelegatedInquiryProjection)(input.inquiryId);
    if (!projection)
        throw Object.assign(new Error("协作记录不存在"), { code: "DELEGATED_INQUIRY_NOT_FOUND" });
    if (!projection.availableActions.includes(input.action))
        throw Object.assign(new Error("当前协作记录不允许执行该操作"), { code: "DELEGATED_INQUIRY_ACTION_NOT_ALLOWED" });
    const clarification = safeText(input.clarification, 2_000);
    if (input.action === "provide_clarification" && !clarification) {
        throw Object.assign(new Error("请先填写需要补充的信息"), { code: "DELEGATED_INQUIRY_CLARIFICATION_REQUIRED" });
    }
    const actionKey = `inq_action_${digest([input.inquiryId, input.revision, input.action, clarification]).slice(0, 28)}`;
    const claim = (0, delegated_inquiry_projections_1.updateDelegatedInquiryProjection)({
        inquiryId: input.inquiryId,
        expectedRevision: input.revision,
        actionKey,
        patch: ["supplement_check", "provide_clarification"].includes(input.action)
            ? { status: "running", outcome: undefined, availableActions: [] }
            : {},
    });
    if (claim.replayed)
        return { projection: claim.projection, replayed: true, ...(input.action === "continue_with_current" || input.action === "promote_to_development" ? { navigation: navigationFor(claim.projection, input.action) } : {}) };
    if (input.action === "continue_with_current" || input.action === "promote_to_development") {
        return { projection: claim.projection, replayed: false, navigation: navigationFor(claim.projection, input.action) };
    }
    const question = clarification
        ? `${projection.questionSummary}\n用户补充：${clarification}`
        : projection.questionSummary;
    try {
        const result = projection.targetScope === "project"
            ? await (0, delegated_inquiry_recovery_1.requestRecoverableProjectSourceInquiry)({
                requestScope: "global",
                exactSessionId: projection.sourceSessionId,
                project: projection.targetId,
                question,
                readDepth: "broad",
                automaticSupplement: false,
                signal: input.signal,
            })
            : await (async () => {
                const group = (0, storage_1.loadGroups)().find((item) => String(item?.id || "") === projection.targetId);
                if (!group)
                    throw Object.assign(new Error("目标群聊不存在"), { code: "DELEGATED_INQUIRY_TARGET_NOT_FOUND" });
                return (0, delegated_inquiry_recovery_1.requestRecoverableGroupSourceInquiry)({
                    group,
                    exactSessionId: projection.sourceSessionId,
                    question,
                    readDepth: "broad",
                    automaticSupplement: false,
                    signal: input.signal,
                });
            })();
        const evidenceIds = result.planningEvidenceEntries.map(item => item.evidenceId);
        const next = (0, delegated_inquiry_projections_1.finishDelegatedInquiryProjection)({
            inquiryId: projection.inquiryId,
            status: result.receipt.sufficient ? "completed" : result.needsUserInput ? "needs_input" : "partial",
            evidenceCount: evidenceIds.length,
            evidenceIds,
            missingEvidenceSummaries: result.missingEvidenceSummaries,
            conclusion: result.answer || result.receipt.reason,
        });
        return { projection: next, replayed: false };
    }
    catch (error) {
        (0, delegated_inquiry_projections_1.finishDelegatedInquiryProjection)({ inquiryId: projection.inquiryId, status: "failed", conclusion: error?.message || "补充核对失败" });
        throw error;
    }
}
//# sourceMappingURL=delegated-inquiry-actions.js.map