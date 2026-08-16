"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presentedPlanFromProjectFirstTurn = presentedPlanFromProjectFirstTurn;
exports.projectFirstTurnShouldEnterTask = projectFirstTurnShouldEnterTask;
exports.projectFirstTurnMessageMode = projectFirstTurnMessageMode;
exports.projectFirstTurnVisiblePresentation = projectFirstTurnVisiblePresentation;
exports.projectFirstTurnVisibleCompletion = projectFirstTurnVisibleCompletion;
exports.runProjectMainTurnCompleteSelfTest = runProjectMainTurnCompleteSelfTest;
const workflow_decision_1 = require("../../agents/workflow-decision");
const group_coordinator_visible_reply_1 = require("../collaboration/group-coordinator-visible-reply");
const group_presented_plan_1 = require("../collaboration/group-presented-plan");
function presentedPlanFromProjectFirstTurn(firstTurn) {
    if (firstTurn?.presentedPlan && typeof firstTurn.presentedPlan === "object" && Array.isArray(firstTurn.presentedPlan.steps) && firstTurn.presentedPlan.steps.length) {
        return firstTurn.presentedPlan;
    }
    if (!(0, group_presented_plan_1.hasPresentedGroupPlan)(firstTurn?.parsed))
        return null;
    return (0, group_presented_plan_1.presentedPlanFromParsed)({
        parsed: firstTurn.parsed,
        planId: firstTurn?.turnDecision?.turnId || firstTurn?.turnReceipt?.turnId || "project-plan",
        goalFallback: firstTurn?.reply || firstTurn?.turnDecision?.reply,
    });
}
function projectFirstTurnShouldEnterTask(firstTurn, options = {}) {
    return options.treatAsTask === true || (0, workflow_decision_1.isDevelopmentTaskWorkflowDecision)(firstTurn?.workflowDecision);
}
function projectFirstTurnMessageMode(firstTurn) {
    return String(firstTurn?.workflowDecision?.mode || firstTurn?.parsed?.workflowDecision?.mode || "") === "project_analysis"
        ? "project_analysis"
        : "conversation";
}
function projectFirstTurnVisiblePresentation(firstTurn, options = {}) {
    const responseKind = String(firstTurn?.responseType || firstTurn?.turnDecision?.responseKind || "");
    const presentedPlan = presentedPlanFromProjectFirstTurn(firstTurn);
    const parsed = {
        ...(firstTurn?.parsed && typeof firstTurn.parsed === "object" ? firstTurn.parsed : {}),
        reply: firstTurn?.reply || firstTurn?.turnDecision?.reply || firstTurn?.parsed?.reply,
        responseType: responseKind || firstTurn?.parsed?.responseType,
        workflowDecision: firstTurn?.workflowDecision || firstTurn?.parsed?.workflowDecision,
    };
    const reply = (0, group_coordinator_visible_reply_1.coordinatorVisibleFallbackContent)({
        parsed,
        observationCount: Array.isArray(firstTurn?.toolResults) ? firstTurn.toolResults.length : 0,
        analysis: { workflowDecision: parsed.workflowDecision },
    }) || group_coordinator_visible_reply_1.COORDINATOR_EMPTY_REPLY_FALLBACK;
    if (projectFirstTurnShouldEnterTask(firstTurn, options)) {
        return { present: false, messageMode: "conversation", reply: "", presentedPlan: null, responseKind };
    }
    return {
        present: true,
        messageMode: projectFirstTurnMessageMode(firstTurn),
        reply,
        presentedPlan,
        responseKind,
    };
}
/** @deprecated use projectFirstTurnVisiblePresentation */
function projectFirstTurnVisibleCompletion(firstTurn, options = {}) {
    const visible = projectFirstTurnVisiblePresentation(firstTurn, options);
    return {
        complete: visible.present,
        mode: visible.present ? visible.messageMode : "",
        reply: visible.reply,
        presentedPlan: visible.presentedPlan,
        responseKind: visible.responseKind,
    };
}
function runProjectMainTurnCompleteSelfTest() {
    const replyTurn = { responseType: "reply", reply: "这是问候。", workflowDecision: { mode: "answer", actionRequired: false } };
    const clarifyTurn = { responseType: "clarify", reply: "首版范围是什么？", workflowDecision: { mode: "answer", actionRequired: false } };
    const planTurn = {
        responseType: "plan",
        reply: "请看计划",
        turnDecision: { turnId: "turn-plan-1", responseKind: "plan", reply: "请看计划" },
        parsed: { responseType: "plan", plan: { title: "登录", goal: "修好登录过期", steps: [{ title: "改 auth.ts" }] } },
        workflowDecision: { mode: "plan_task", actionRequired: false, requiresCodeChanges: false },
    };
    const emptyAnalysis = { responseType: "reply", reply: "", workflowDecision: { mode: "project_analysis", actionRequired: false } };
    const devTask = {
        responseType: "plan",
        reply: "请看计划",
        parsed: { plan: { title: "登录", goal: "修好登录", steps: [{ title: "改 auth.ts" }] } },
        workflowDecision: { mode: "plan_task", actionRequired: true, requiresCodeChanges: true },
    };
    const replyVisible = projectFirstTurnVisiblePresentation(replyTurn);
    const clarifyVisible = projectFirstTurnVisiblePresentation(clarifyTurn);
    const planVisible = projectFirstTurnVisiblePresentation(planTurn);
    const empty = projectFirstTurnVisiblePresentation(emptyAnalysis);
    const task = projectFirstTurnVisiblePresentation(devTask);
    const parentTaskPlan = projectFirstTurnVisiblePresentation(planTurn, { treatAsTask: true });
    const checks = {
        replyPresents: replyVisible.present === true && replyVisible.reply === "这是问候。" && replyVisible.messageMode === "conversation",
        clarifyPresents: clarifyVisible.present === true && clarifyVisible.responseKind === "clarify",
        planCardPresents: planVisible.present === true && planVisible.presentedPlan?.steps?.[0]?.title === "改 auth.ts",
        emptyAnalysisPresentsFallback: empty.present === true
            && empty.messageMode === "project_analysis"
            && empty.reply === group_coordinator_visible_reply_1.COORDINATOR_EMPTY_REPLY_FALLBACK,
        developmentTaskDoesNotPresent: task.present === false,
        parentTaskPlanDoesNotPresent: parentTaskPlan.present === false,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=project-main-turn-complete.js.map