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
exports.TEST_AGENT_RECHECK_MAX_PER_SUBJECT = exports.COORDINATOR_REVIEW_MAX_ROUNDS = void 0;
exports.collectTestAgentBrowserNetworkLines = collectTestAgentBrowserNetworkLines;
exports.collectTestAgentBrowserFlowLines = collectTestAgentBrowserFlowLines;
exports.collectTestAgentBrowserMultiSessionLines = collectTestAgentBrowserMultiSessionLines;
exports.collectTestAgentBrowserAuthenticationLines = collectTestAgentBrowserAuthenticationLines;
exports.collectTestAgentBrowserActionEffectLines = collectTestAgentBrowserActionEffectLines;
exports.collectTestAgentBrowserRecoveryLines = collectTestAgentBrowserRecoveryLines;
exports.collectTestAgentAdversarialEvidenceLines = collectTestAgentAdversarialEvidenceLines;
exports.summarizeTestAgentBrowserFailedStep = summarizeTestAgentBrowserFailedStep;
exports.collectTestAgentBrowserTableLines = collectTestAgentBrowserTableLines;
exports.collectTestAgentBrowserUploadLines = collectTestAgentBrowserUploadLines;
exports.collectTestAgentBrowserDownloadLines = collectTestAgentBrowserDownloadLines;
exports.collectTestAgentBrowserEvidenceSummaryLines = collectTestAgentBrowserEvidenceSummaryLines;
exports.collectTestAgentVerificationLines = collectTestAgentVerificationLines;
exports.collectTestAgentEvidenceLines = collectTestAgentEvidenceLines;
exports.getTestAgentReviewedFiles = getTestAgentReviewedFiles;
exports.buildNativeTestAgentReceipt = buildNativeTestAgentReceipt;
exports.buildNativeTestAgentReviewSummary = buildNativeTestAgentReviewSummary;
exports.formatNativeTestAgentOutput = formatNativeTestAgentOutput;
exports.summarizeNativeTestAgentExecutionPlan = summarizeNativeTestAgentExecutionPlan;
exports.buildNativeTestAgentPlanBlockedReceipt = buildNativeTestAgentPlanBlockedReceipt;
exports.formatNativeTestAgentPlanBlockedOutput = formatNativeTestAgentPlanBlockedOutput;
exports.buildNativeTestAgentRuntimeToolContext = buildNativeTestAgentRuntimeToolContext;
exports.buildCoordinatorReworkContinuationFallback = buildCoordinatorReworkContinuationFallback;
exports.stopWrongDirectionWorkerForCoordinatorRoute = stopWrongDirectionWorkerForCoordinatorRoute;
exports.buildCoordinatorReworkFollowUp = buildCoordinatorReworkFollowUp;
exports.buildCoordinatorReworkTask = buildCoordinatorReworkTask;
exports.runCoordinatorReworkProtocolSelfTest = runCoordinatorReworkProtocolSelfTest;
exports.getTestAgentRecheckSubjectKey = getTestAgentRecheckSubjectKey;
exports.isTestAgentRecheckFollowUp = isTestAgentRecheckFollowUp;
exports.applyTestAgentRecheckBudget = applyTestAgentRecheckBudget;
exports.followUpTargetCompleted = followUpTargetCompleted;
exports.scheduleTestAgentRecheckAfterFollowUps = scheduleTestAgentRecheckAfterFollowUps;
exports.filterCoordinatorLlmFollowUpsAgainstHardRoutes = filterCoordinatorLlmFollowUpsAgainstHardRoutes;
const path = __importStar(require("path"));
const memory_1 = require("./memory");
const test_agent_review_bridge_1 = require("../../agents/test-agent-review-bridge");
const agent_notifications_1 = require("./agent-notifications");
const logs_1 = require("./logs");
const execution_kernel_1 = require("../../agents/execution-kernel");
const collaboration_runtime_status_helpers_1 = require("./collaboration-runtime-status-helpers");
const collaboration_runtime_daily_dev_1 = require("./collaboration-runtime-daily-dev");
const collaboration_runtime_cross_agent_runtime_1 = require("./collaboration-runtime-cross-agent-runtime");
const collaboration_runtime_test_agent_handoff_part_01_1 = require("./collaboration-runtime-test-agent-handoff-part-01");
function collectTestAgentBrowserNetworkLines(report, verdict = null) {
    const rows = (0, collaboration_runtime_test_agent_handoff_part_01_1.testAgentSummaryRows)(report, verdict, "browserNetworkSummary");
    if (!rows.length)
        return [];
    const totals = rows.reduce((acc, item) => {
        acc.requests += Number(item?.requestCount || 0);
        acc.responses += Number(item?.responseCount || 0);
        acc.failedRequests += Number(item?.failedRequestCount || 0);
        acc.failedResponses += Number(item?.failedResponseCount || 0);
        acc.errors += Number(item?.errorCount || 0);
        return acc;
    }, { requests: 0, responses: 0, failedRequests: 0, failedResponses: 0, errors: 0 });
    const failures = totals.failedRequests + totals.failedResponses + totals.errors;
    const headline = `浏览器网络：记录 ${totals.requests} 个请求、${totals.responses} 个响应${failures ? `，发现 ${failures} 个网络问题` : "，未发现网络错误"}`;
    const failedChecks = rows
        .filter((item) => Number(item?.failedRequestCount || 0) || Number(item?.failedResponseCount || 0) || Number(item?.errorCount || 0))
        .map((item) => `${item?.project || "项目"}：${item?.name || "浏览器检查"} 网络需关注（失败请求 ${Number(item?.failedRequestCount || 0)}、失败响应 ${Number(item?.failedResponseCount || 0)}、错误 ${Number(item?.errorCount || 0)}）`)
        .slice(0, 3);
    return (0, collaboration_runtime_status_helpers_1.uniqueStrings)([headline, ...failedChecks]).slice(0, 4);
}
function collectTestAgentBrowserFlowLines(report, verdict = null) {
    return (0, test_agent_review_bridge_1.summarizeTestAgentBrowserFlows)(report, verdict)?.evidenceLines || [];
}
function collectTestAgentBrowserMultiSessionLines(report, verdict = null) {
    return (0, test_agent_review_bridge_1.summarizeTestAgentMultiSessionBrowser)(report, verdict)?.evidenceLines || [];
}
function collectTestAgentBrowserAuthenticationLines(report, verdict = null) {
    return (0, test_agent_review_bridge_1.summarizeTestAgentBrowserAuthentication)(report, verdict)?.evidenceLines || [];
}
function collectTestAgentBrowserActionEffectLines(report, verdict = null) {
    return (0, test_agent_review_bridge_1.summarizeTestAgentBrowserActionEffects)(report, verdict)?.evidenceLines || [];
}
function collectTestAgentBrowserRecoveryLines(report, verdict = null) {
    return (0, test_agent_review_bridge_1.summarizeTestAgentBrowserRecovery)(report, verdict)?.evidenceLines || [];
}
function collectTestAgentAdversarialEvidenceLines(report, verdict = null) {
    return (0, test_agent_review_bridge_1.summarizeTestAgentAdversarialEvidence)(report, verdict)?.evidenceLines || [];
}
function testAgentBrowserStepType(step) {
    const name = String(step?.name || "");
    const index = name.indexOf(":");
    return (index >= 0 ? name.slice(index + 1) : name).trim().toLowerCase();
}
const TEST_AGENT_TABLE_ASSERTION_TYPES = new Set(["tablerowincludes", "tablecelltextincludes", "tablecelltextequals"]);
function isTestAgentTableAssertionStep(step) {
    return String(step?.kind || "") === "assertion" && TEST_AGENT_TABLE_ASSERTION_TYPES.has(testAgentBrowserStepType(step));
}
function testAgentTableAssertionLabel(step) {
    const type = testAgentBrowserStepType(step);
    if (type === "tablerowincludes")
        return "表格行内容";
    if (type === "tablecelltextequals")
        return "表格单元格精确内容";
    if (type === "tablecelltextincludes")
        return "表格单元格包含内容";
    return "表格内容";
}
function summarizeTestAgentBrowserFailedStep(step) {
    if (isTestAgentTableAssertionStep(step)) {
        return `断言 ${testAgentTableAssertionLabel(step)} 未通过，定位细节已放入技术详情。`;
    }
    return `${step?.kind === "action" ? "操作" : "断言"} ${(0, memory_1.compactMemoryText)(step?.name || "未命名步骤", 80)} ${(0, collaboration_runtime_test_agent_handoff_part_01_1.testAgentStatusLabel)(step?.status)}${step?.error ? `：${(0, memory_1.compactMemoryText)(step.error, 120)}` : ""}`;
}
function testAgentBrowserSummaryAssertionTypeCount(rows, type) {
    const lower = type.toLowerCase();
    return rows.reduce((sum, item) => {
        const types = item?.assertionTypes || item?.assertion_types || {};
        return sum + Object.entries(types).reduce((inner, [key, value]) => (String(key || "").toLowerCase() === lower ? inner + Number(value || 0) : inner), 0);
    }, 0);
}
function collectTestAgentBrowserTableLines(report, verdict = null) {
    const summaryRows = (0, collaboration_runtime_test_agent_handoff_part_01_1.testAgentSummaryRows)(report, verdict, "browserInteractionSummary");
    const summaryCount = [...TEST_AGENT_TABLE_ASSERTION_TYPES].reduce((sum, type) => sum + testAgentBrowserSummaryAssertionTypeCount(summaryRows, type), 0);
    const resultSteps = (Array.isArray(report.browserResults) ? report.browserResults : [])
        .flatMap((item) => Array.isArray(item?.steps) ? item.steps : [])
        .filter(isTestAgentTableAssertionStep);
    const summaryFailures = summaryRows
        .flatMap((item) => Array.isArray(item?.failedSteps) ? item.failedSteps : [])
        .filter(isTestAgentTableAssertionStep);
    const total = resultSteps.length || summaryCount;
    const failed = resultSteps.filter((step) => String(step?.status || "").toLowerCase() === "failed");
    const failedSteps = failed.length ? failed : summaryFailures;
    if (!total && !failedSteps.length)
        return [];
    const failedCount = failedSteps.length;
    const headline = `表格验证：已核对 ${Math.max(total, failedCount)} 项表格行/单元格断言${failedCount ? `，其中 ${failedCount} 项未通过` : "，未发现失败断言"}`;
    const failures = failedSteps
        .map((step) => `表格断言未通过：${testAgentTableAssertionLabel(step)}未匹配，定位细节已放入技术详情。`)
        .slice(0, 3);
    return (0, collaboration_runtime_status_helpers_1.uniqueStrings)([headline, ...failures]).slice(0, 4);
}
function testAgentUploadFileNames(detail) {
    const text = String(detail || "");
    const match = /(?:^|;\s*)file=([^;]+)/i.exec(text);
    if (!match?.[1])
        return [];
    return match[1]
        .split(/\s*,\s*/)
        .map(item => path.basename(item.trim()))
        .filter(Boolean);
}
function collectTestAgentBrowserUploadLines(report, verdict = null) {
    const summarySteps = (0, collaboration_runtime_test_agent_handoff_part_01_1.testAgentSummaryRows)(report, verdict, "browserInteractionSummary")
        .flatMap((item) => Array.isArray(item?.actionSteps) ? item.actionSteps : []);
    const resultSteps = (Array.isArray(report.browserResults) ? report.browserResults : [])
        .flatMap((item) => Array.isArray(item?.steps) ? item.steps : [])
        .filter((step) => step?.kind === "action");
    const steps = [...summarySteps, ...resultSteps]
        .filter((step) => testAgentBrowserStepType(step) === "uploadfile");
    if (!steps.length)
        return [];
    const failed = steps.filter((step) => String(step?.status || "").toLowerCase() === "failed");
    const fileNames = (0, collaboration_runtime_status_helpers_1.uniqueStrings)(steps.flatMap((step) => testAgentUploadFileNames(step?.detail))).slice(0, 6);
    const count = fileNames.length || steps.length;
    const headline = `文件上传：${failed.length ? `${failed.length} 次上传未通过` : `已验证 ${count} 个上传${fileNames.length ? "文件" : "操作"}`}${fileNames.length ? `（${fileNames.join("、")}）` : ""}`;
    const failures = failed
        .map((step) => `上传步骤未通过：${(0, memory_1.compactMemoryText)(step?.error || step?.detail || "TestAgent 未能完成文件上传验证。", 140)}`)
        .slice(0, 2);
    return (0, collaboration_runtime_status_helpers_1.uniqueStrings)([headline, ...failures]).slice(0, 3);
}
function testAgentDownloadArtifactName(artifact) {
    const title = String(artifact?.title || "").trim();
    const match = /^Download:\s*(.+)$/i.exec(title);
    if (match?.[1])
        return path.basename(match[1].trim());
    return path.basename(String(artifact?.path || "").trim());
}
function testAgentDownloadExpectation(detail) {
    const text = String(detail || "");
    const fileName = /(?:^|;\s*)(?:filename|fileName)=([^;]+)/i.exec(text)?.[1]?.trim();
    const fileNameIncludes = /(?:^|;\s*)filenameIncludes=([^;]+)/i.exec(text)?.[1]?.trim();
    if (fileName)
        return path.basename(fileName);
    if (fileNameIncludes)
        return `包含 ${fileNameIncludes}`;
    return "";
}
function collectTestAgentBrowserDownloadLines(report) {
    const browserResults = Array.isArray(report.browserResults) ? report.browserResults : [];
    const artifacts = browserResults
        .flatMap((item) => Array.isArray(item?.browserArtifacts) ? item.browserArtifacts : [])
        .filter((artifact) => String(artifact?.type || "").toLowerCase() === "download");
    const assertionSteps = browserResults
        .flatMap((item) => Array.isArray(item?.steps) ? item.steps : [])
        .filter((step) => step?.kind === "assertion" && testAgentBrowserStepType(step) === "downloadedfile");
    if (!artifacts.length && !assertionSteps.length)
        return [];
    const failed = assertionSteps.filter((step) => String(step?.status || "").toLowerCase() === "failed");
    const artifactNames = (0, collaboration_runtime_status_helpers_1.uniqueStrings)(artifacts.map(testAgentDownloadArtifactName).filter(Boolean)).slice(0, 6);
    const expectationNames = (0, collaboration_runtime_status_helpers_1.uniqueStrings)(assertionSteps.map((step) => testAgentDownloadExpectation(step?.detail)).filter(Boolean)).slice(0, 6);
    const names = artifactNames.length ? artifactNames : expectationNames;
    const passedAssertions = assertionSteps.filter((step) => String(step?.status || "").toLowerCase() === "passed");
    const count = names.length || artifacts.length || passedAssertions.length || assertionSteps.length;
    const headline = `文件下载：${failed.length ? `${failed.length} 项下载验证未通过` : `已验证 ${count} 个下载${names.length ? "文件" : "结果"}`}${names.length ? `（${names.join("、")}）` : ""}`;
    const failures = failed
        .map((step) => `下载验证未通过：${(0, memory_1.compactMemoryText)(step?.error || step?.detail || "TestAgent 未能确认下载文件。", 140)}`)
        .slice(0, 2);
    return (0, collaboration_runtime_status_helpers_1.uniqueStrings)([headline, ...failures]).slice(0, 3);
}
function collectTestAgentBrowserEvidenceSummaryLines(report, verdict = null) {
    return require("./collaboration-test-agent-runtime").collectTestAgentBrowserEvidenceSummaryLines(report, verdict);
}
function collectTestAgentVerificationLines(report, verdict = (0, collaboration_runtime_test_agent_handoff_part_01_1.resolveTestAgentDecisionVerdict)(report)) {
    return (0, collaboration_runtime_status_helpers_1.uniqueStrings)([
        ...(Array.isArray(report.commandResults) ? report.commandResults.map(collaboration_runtime_test_agent_handoff_part_01_1.summarizeTestAgentCommandResult) : []),
        ...(Array.isArray(report.httpResults) ? report.httpResults.map(collaboration_runtime_test_agent_handoff_part_01_1.summarizeTestAgentHttpResult) : []),
        ...(Array.isArray(report.browserResults) ? report.browserResults.map(collaboration_runtime_test_agent_handoff_part_01_1.summarizeTestAgentBrowserResult) : []),
        ...collectTestAgentBrowserEvidenceSummaryLines(report, verdict),
        ...(Array.isArray(report.requiredCheckCoverage)
            ? report.requiredCheckCoverage.map((item) => `必检项 ${(0, collaboration_runtime_test_agent_handoff_part_01_1.testAgentEvidenceTypeLabel)(item.check)}：${(0, collaboration_runtime_test_agent_handoff_part_01_1.testAgentStatusLabel)(item.status)}${item.missingReason ? `（${item.missingReason}）` : ""}`)
            : []),
    ]).slice(0, 20);
}
function collectTestAgentEvidenceLines(report) {
    return (0, collaboration_runtime_status_helpers_1.uniqueStrings)((Array.isArray(report.evidence) ? report.evidence : []).map((item) => [
        item.project || "",
        item.type || "",
        item.title || "",
        item.status || "",
        item.path || item.detail || "",
    ].filter(Boolean).join(" | "))).slice(0, 20);
}
function getTestAgentReviewedFiles(workOrder, report) {
    const projects = Array.isArray(workOrder?.projects) ? workOrder.projects : [];
    return (0, collaboration_runtime_status_helpers_1.uniqueStrings)([
        ...projects.flatMap((project) => Array.isArray(project?.changedFiles) ? project.changedFiles : (Array.isArray(project?.changed_files) ? project.changed_files : [])),
        ...((Array.isArray(report.metadata?.previousLedger?.filesChanged) ? report.metadata.previousLedger.filesChanged : [])),
    ]).slice(0, 40);
}
function buildNativeTestAgentReceipt(targetName, report, handoff = null, workOrder = null, invocationResult = null) {
    return require("./collaboration-acceptance").buildNativeTestAgentReceipt(targetName, report, handoff, workOrder, invocationResult);
}
function buildNativeTestAgentReviewSummary(targetName, report, receipt) {
    return require("./collaboration-test-agent-runtime").buildNativeTestAgentReviewSummary(targetName, report, receipt);
}
function formatNativeTestAgentOutput(targetName, report, receipt, handoff = null) {
    return require("./collaboration-test-agent-runtime").formatNativeTestAgentOutput(targetName, report, receipt, handoff);
}
function summarizeNativeTestAgentExecutionPlan(plan) {
    return require("./collaboration-test-agent-runtime").summarizeNativeTestAgentExecutionPlan(plan);
}
function buildNativeTestAgentPlanBlockedReceipt(targetName, plan, dispatch = null, handoff = null) {
    return require("./collaboration-acceptance").buildNativeTestAgentPlanBlockedReceipt(targetName, plan, dispatch, handoff);
}
function formatNativeTestAgentPlanBlockedOutput(targetName, plan, receipt, handoff = null) {
    return require("./collaboration-test-agent-runtime").formatNativeTestAgentPlanBlockedOutput(targetName, plan, receipt, handoff);
}
function buildNativeTestAgentRuntimeToolContext(targetName, workDir) {
    return require("./collaboration-test-agent-runtime").buildNativeTestAgentRuntimeToolContext(targetName, workDir);
}
function buildCoordinatorReworkContinuationFallback(input) {
    return require("./collaboration-test-agent-runtime").buildCoordinatorReworkContinuationFallback(input);
}
function stopWrongDirectionWorkerForCoordinatorRoute(input) {
    if (!input.taskId || !(0, collaboration_runtime_cross_agent_runtime_1.coordinatorReworkRouteRequiresStop)(input.route))
        return null;
    const reason = (0, memory_1.compactMemoryText)(input.route?.reason || input.mention?.reason || input.mention?.message || input.mention?.task || "主 Agent 发现子 Agent 可能沿旧方向执行，先停止旧方向。", 360);
    let result = null;
    try {
        result = (0, execution_kernel_1.cancelActiveAgentRun)({
            task_id: input.taskId,
            project: input.targetName,
            execution_id: `${input.taskId}--${input.targetName}`,
            reason,
            actor: "coordinator-rework-route",
            cancel_task: false,
        });
    }
    catch (error) {
        result = { success: false, matched: 0, killed: 0, error: String(error?.message || error || "停止旧方向失败") };
    }
    const userText = result.success === false
        ? `${input.targetName} 旧方向停止检查失败，主 Agent 会在新工作单里明确禁止继续旧方向。`
        : result.matched > 0
            ? `${input.targetName} 的旧方向执行已发送停止请求，准备按新要求继续。`
            : `${input.targetName} 当前没有仍在运行的旧方向进程，准备按新要求继续。`;
    (0, logs_1.addTaskLog)(input.taskId, result.success === false ? "warning" : "info", userText);
    (0, logs_1.appendTaskTimelineEvent)(input.taskId, {
        type: "coordinator_wrong_direction_stop",
        title: `${input.targetName} 旧方向停止检查`,
        detail: userText,
        status: result.success === false ? "warn" : "ok",
        phase: "rework",
        agent: input.targetName,
        data: {
            route: input.route,
            stop_result: result,
            source_project: input.sourceProject,
            cancel_task: false,
        },
    });
    (0, memory_1.updateGroupMemory)(input.groupId, {
        currentPhase: "rework",
        decision: `${input.targetName} 返工前已检查旧方向停止状态`,
        reason,
        nextAction: `按修正后的工作单继续派发 ${input.targetName}`,
    });
    (0, collaboration_runtime_daily_dev_1.writeSse)(input.streamRes, { type: "status", text: userText, agent: input.targetName });
    return result;
}
function buildCoordinatorReworkFollowUp(item, input) {
    return require("./collaboration-test-agent-runtime").buildCoordinatorReworkFollowUp(item, input);
}
function buildCoordinatorReworkTask(item, input) {
    return require("./collaboration-test-agent-runtime").buildCoordinatorReworkTask(item, input);
}
function runCoordinatorReworkProtocolSelfTest() {
    return require("./collaboration-coordination-self-tests").runCoordinatorReworkProtocolSelfTest();
}
// Initial independent review, implementation repair, TestAgent recheck,
// optional spot-check repair, and final acceptance each need their own turn.
exports.COORDINATOR_REVIEW_MAX_ROUNDS = 5;
/** Per review-subject cap for TestAgent rechecks (including provider-gap → Playwright reruns). */
exports.TEST_AGENT_RECHECK_MAX_PER_SUBJECT = 2;
function getTestAgentRecheckSubjectKey(item = {}) {
    return String(item?.reviewSubject || item?.originalTarget || item?.targetName || item?.project || "").trim();
}
function isTestAgentRecheckFollowUp(item = {}) {
    const kind = String(item?.rework_kind || item?.kind || item?.source || "").toLowerCase();
    return item?.testAgentReviewRecheck === true
        || item?.test_agent_review_recheck === true
        || kind === "test_agent_review_recheck"
        || /test_agent_recheck|independent_review_needs_recheck/.test(kind);
}
/**
 * Enforce a per-subject recheck budget. Returns kept follow-ups and blocked subjects.
 * `counts` is mutated so callers can accumulate across coordinator rounds.
 */
function applyTestAgentRecheckBudget(followUps = [], counts = new Map(), maxPerSubject = exports.TEST_AGENT_RECHECK_MAX_PER_SUBJECT) {
    const map = counts instanceof Map ? counts : new Map(Object.entries(counts || {}));
    const kept = [];
    const blocked = [];
    for (const item of followUps || []) {
        if (!isTestAgentRecheckFollowUp(item)) {
            kept.push(item);
            continue;
        }
        const subject = getTestAgentRecheckSubjectKey(item) || "test-agent";
        const used = Number(map.get(subject) || 0);
        if (used >= maxPerSubject) {
            blocked.push({
                subject,
                count: used,
                max: maxPerSubject,
                reason: `TestAgent 对 ${subject} 的复验已达上限 ${maxPerSubject} 次；请改为人工确认或缩小验收范围，避免无限 provider-gap 复验。`,
            });
            continue;
        }
        map.set(subject, used + 1);
        kept.push({
            ...item,
            testAgentRecheckCount: used + 1,
            test_agent_recheck_count: used + 1,
            testAgentRecheckMax: maxPerSubject,
            test_agent_recheck_max: maxPerSubject,
        });
    }
    return { kept, blocked, counts: map };
}
function followUpTargetCompleted(outputs = [], targetName = "") {
    const target = String(targetName || "").trim().toLowerCase();
    if (!target)
        return false;
    const latest = [...(outputs || [])].reverse().find((output) => String((0, agent_notifications_1.getCollectedOutputAgent)(output) || "").trim().toLowerCase() === target);
    return !!latest && (0, agent_notifications_1.getCollectedOutputReceiptStatus)(latest) === "done";
}
function scheduleTestAgentRecheckAfterFollowUps(followUps = [], outputs = []) {
    return require("./collaboration-test-agent-runtime").scheduleTestAgentRecheckAfterFollowUps(followUps, outputs);
}
function filterCoordinatorLlmFollowUpsAgainstHardRoutes(proposed = [], hardReviewFollowUps = [], hasScheduledTestAgentRecheck = false) {
    const hardReviewSubjects = new Set(hardReviewFollowUps.flatMap((item) => [
        item?.reviewSubject,
        item?.originalTarget,
        (0, collaboration_runtime_cross_agent_runtime_1.isCoordinatorTestAgentName)(item?.targetName || item?.project) ? "test-agent" : item?.targetName || item?.project,
    ]).map((value) => String(value || "").trim()).filter(Boolean));
    return (proposed || []).filter((item) => {
        const candidates = [item?.reviewSubject, item?.originalTarget, item?.targetName, item?.project]
            .map((value) => String(value || "").trim())
            .filter(Boolean);
        if (hasScheduledTestAgentRecheck && candidates.some(collaboration_runtime_cross_agent_runtime_1.isCoordinatorTestAgentName))
            return false;
        return !candidates.some((value) => hardReviewSubjects.has(value));
    });
}
//# sourceMappingURL=collaboration-runtime-test-agent-handoff-part-02.js.map