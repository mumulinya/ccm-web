"use strict";
// Extracted functional module. The original entry remains a compatibility facade.
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
exports.buildCoordinatorReworkRoutingDecision = buildCoordinatorReworkRoutingDecision;
exports.selectCoordinatorIndependentVerifier = selectCoordinatorIndependentVerifier;
exports.hasConfiguredTestAgentMultiSessionBrowserCheck = hasConfiguredTestAgentMultiSessionBrowserCheck;
exports.buildCoordinatorTestAgentHandoff = buildCoordinatorTestAgentHandoff;
exports.collectTestAgentBrowserEvidenceSummaryLines = collectTestAgentBrowserEvidenceSummaryLines;
exports.buildNativeTestAgentReceipt = buildNativeTestAgentReceipt;
exports.buildNativeTestAgentReviewSummary = buildNativeTestAgentReviewSummary;
exports.formatNativeTestAgentOutput = formatNativeTestAgentOutput;
exports.summarizeNativeTestAgentExecutionPlan = summarizeNativeTestAgentExecutionPlan;
exports.buildNativeTestAgentPlanBlockedReceipt = buildNativeTestAgentPlanBlockedReceipt;
exports.formatNativeTestAgentPlanBlockedOutput = formatNativeTestAgentPlanBlockedOutput;
exports.buildNativeTestAgentRuntimeToolContext = buildNativeTestAgentRuntimeToolContext;
exports.buildCoordinatorReworkContinuationFallback = buildCoordinatorReworkContinuationFallback;
exports.buildCoordinatorReworkFollowUp = buildCoordinatorReworkFollowUp;
exports.buildCoordinatorReworkTask = buildCoordinatorReworkTask;
exports.scheduleTestAgentRecheckAfterFollowUps = scheduleTestAgentRecheckAfterFollowUps;
exports.buildGlobalGroupTestAgentOwnership = buildGlobalGroupTestAgentOwnership;
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
const display_1 = require("./display");
const memory_1 = require("./memory");
const test_agent_review_bridge_1 = require("../../agents/test-agent-review-bridge");
const post_review_spot_check_1 = require("../../agents/post-review-spot-check");
const collaboration_1 = require("./collaboration");
function buildCoordinatorReworkRoutingDecision(item, input = {}) {
    const project = String(item?.targetName || item?.project || item?.agent || "").trim();
    const previous = input.previousLedger || item?.previousLedger || null;
    const text = [
        item?.message,
        item?.task,
        item?.reason,
        item?.summary,
        item?.kind,
        item?.rework_kind,
        previous?.status,
        previous?.receiptStatus,
        ...(Array.isArray(previous?.blockers) ? previous.blockers : []),
        ...(Array.isArray(previous?.needs) ? previous.needs : []),
        ...(Array.isArray(previous?.verification) ? previous.verification : []),
    ].map((value) => String(value || "")).join("\n");
    const route = (strategy, continuationStrategy, userLabel, reason, signals = [], extra = {}) => ({
        schema: "ccm-coordinator-rework-route-v1",
        project,
        strategy,
        continuationStrategy,
        continuation_strategy: continuationStrategy,
        user_label: userLabel,
        reason,
        context_overlap: extra.context_overlap || (previous ? "high" : "medium"),
        requires_stop: !!extra.requires_stop,
        requires_fresh_verifier: !!extra.requires_fresh_verifier,
        signals: (0, collaboration_1.uniqueStrings)(signals.filter(Boolean)).slice(0, 8),
    });
    const wrongDirection = /(?:方向|方案|目标|需求).{0,16}(?:错|不对|调整|改变|变更|改成)|用户.{0,12}(?:改|调整|变更)|不要.{0,40}(?:而是|改为|改成)|停止.{0,24}(?:旧|当前|原|错误)|wrong\s+(?:direction|approach)|user\s+changed|stop\s+worker/i.test(text);
    if (wrongDirection) {
        return route("stop_wrong_direction_then_continue", "stop_wrong_direction_then_continue", "停止旧方向并按新要求继续", "检测到目标或方案方向发生变化，先避免子 Agent 继续旧方向，再交代修正后的执行口径。", ["goal_revision_or_wrong_direction"], { requires_stop: true, context_overlap: previous ? "medium" : "low" });
    }
    const explicitTestAgentReviewRecheck = item?.testAgentReviewRecheck === true
        || item?.test_agent_review_recheck === true;
    const failedReviewRework = !explicitTestAgentReviewRecheck && (item?.reviewFailed === true
        || /test_agent_failed_review_rework|failed_review_rework|review_failed_rework/i.test(text)
        || /(?:TestAgent|复核|验证).{0,40}(?:未通过|不通过|需要返工).{0,40}(?:原实现成员|同一子\s*Agent|修复后重新复核)/i.test(text));
    if (failedReviewRework) {
        return route("continue_same_worker", "same_worker_scratchpad", "继续同一子 Agent 修复", "独立复核已经给出失败结论，下一步应回到原实现成员修复，再重新复核。", ["failed_review_rework", previous ? "has_previous_ledger" : ""]);
    }
    const testAgentEnvironmentPreparation = item?.testAgentEnvironmentPreparation === true
        || item?.test_agent_environment_preparation === true
        || /test_agent_environment_prepare|补齐.{0,16}(?:复核环境|登录条件|运行条件)/i.test(text);
    if (testAgentEnvironmentPreparation) {
        return route("prepare_verification_environment", "same_worker_context", "补齐复核条件后自动复验", "当前缺口属于环境、登录或运行条件，先由原项目补齐可验证条件，再让 TestAgent 重新执行，不把它误判为业务实现返工。", ["test_agent_environment_preparation", previous ? "has_previous_ledger" : ""]);
    }
    const testAgentReviewRecheck = explicitTestAgentReviewRecheck
        || /test_agent_review_recheck|test_agent_recheck|重新运行\s*TestAgent|重新复验.{0,24}TestAgent/i.test(text);
    if (testAgentReviewRecheck) {
        const hasCarriedHandoff = !!(item?.testAgentHandoff || item?.test_agent_handoff || item?.testAgentWorkOrder || item?.test_agent_work_order);
        return route("resume_verifier", hasCarriedHandoff ? "same_verifier_context" : "fresh_verification_worker", hasCarriedHandoff ? "沿用原工作单重新复验" : "重新派独立验证 Agent 复验", hasCarriedHandoff
            ? "上一轮复核证据尚未闭环，沿用同一 TestAgent 工作单并基于最新状态重新执行最能保留验收边界。"
            : "上一轮没有可复用的 TestAgent 工作单，需要重新生成独立复核交接并基于最新状态验证。", ["test_agent_review_recheck", hasCarriedHandoff ? "carried_test_agent_handoff" : "fresh_test_agent_handoff"], { requires_fresh_verifier: !hasCarriedHandoff, context_overlap: hasCarriedHandoff ? "high" : "low" });
    }
    const postReviewSpotCheckReverify = item?.postReviewSpotCheckReverify === true
        || /post_review_spot_check_reverify|spot_check_reverify|完成前抽查.{0,30}(?:不一致|需复验|重新复验)/i.test(text);
    if (postReviewSpotCheckReverify) {
        return route("resume_verifier", "same_verifier_context", "让 TestAgent 重新复验", "TestAgent 已给出通过结论，但主 Agent 的完成前抽查尚未一致，应先让同一个验证器重新执行并重新判断。", ["post_review_spot_check_reverify", previous ? "has_previous_ledger" : ""]);
    }
    const independentVerification = /独立.{0,12}(?:验证|复核|检查)|(?:非|不是)原实现者|另(?:一个|外).{0,12}(?:验证|复核|检查)|交叉复核|只读复核|request_review|fresh\s+verifier|independent\s+(?:verification|review)|code\s+review/i.test(text);
    const failureOrCorrection = /(?:测试|验证|构建|编译|lint|typecheck|npm|pnpm|yarn|pytest|jest|vitest).{0,18}(?:失败|报错|未通过)|(?:失败|报错|错误|异常|blocked|failed|error|file not found|not found|missing_receipt|needs_info|partial)|缺少(?:结果说明|验证|证据|文件|回执)|补(?:齐|跑|充)|修复|继续处理/i.test(text);
    const independentReviewGate = item?.independentReviewGate?.required === true || /independent_review_gate|independent_review_required/i.test(text);
    if ((independentVerification || independentReviewGate) && (!failureOrCorrection || independentReviewGate)) {
        return route("fresh_verification_worker", "fresh_verification_worker", "派独立验证 Agent 复核", "缺口属于独立验证或只读复核，应使用新的验证视角，避免原实现者自证。", [independentReviewGate ? "independent_review_gate" : "independent_verification"], { requires_fresh_verifier: true, context_overlap: "low" });
    }
    const spawnFresh = /重新派发|换(?:一个|给)|新的?子\s*Agent|另(?:一个|外).{0,10}(?:Agent|worker)|fresh\s+worker|spawn\s+fresh|从零(?:实现|处理)|研究.{0,18}(?:后|完).{0,18}(?:实现|修复)/i.test(text);
    if (spawnFresh && !failureOrCorrection) {
        return route("spawn_fresh_worker", "spawn_fresh_worker", "重新派发给新的子 Agent", "缺口更像新的执行分支，使用新的执行上下文更稳。", ["fresh_worker_requested"], { context_overlap: "low" });
    }
    return route("continue_same_worker", "same_worker_scratchpad", "继续同一子 Agent 修复", failureOrCorrection
        ? "失败、阻塞或证据缺口通常要回到同一个子 Agent，它保留了上一轮错误和修改上下文。"
        : "返工内容与上一轮工作高度重叠，优先复用原子 Agent 上下文。", [failureOrCorrection ? "failure_or_evidence_gap" : "same_context_rework", previous ? "has_previous_ledger" : ""]);
}
function selectCoordinatorIndependentVerifier(group, originalTarget = "") {
    const original = String(originalTarget || "").trim();
    const originalKey = original.toLowerCase();
    const candidates = (0, group_orchestrator_1.getRoutableMembers)(group)
        .filter((member) => String(member?.project || "").trim())
        .filter((member) => String(member.project || "").trim().toLowerCase() !== originalKey)
        .map((member) => {
        const profile = [member.project, member.role, member.agent, member.type, member.description, member.tags].map((value) => String(value || "")).join(" ");
        const score = /test[-_\s]*agent|测试\s*agent/i.test(profile)
            ? 120
            : /qa|test|tester|verify|verification|review|reviewer|audit|checker|quality|验|测|审|复核|检查/i.test(profile)
                ? 100
                : 10;
        return { member, score, profile };
    })
        .sort((a, b) => b.score - a.score || String(a.member.project).localeCompare(String(b.member.project)));
    const configuredVerifier = candidates.find((item) => item.score >= 100)?.member || null;
    const originalRuntime = (0, collaboration_1.resolveProjectRuntimeForTestAgentHandoff)(group, original);
    const nativeTestAgentAvailable = !!originalRuntime.workDir;
    const selected = configuredVerifier || (nativeTestAgentAvailable ? { project: "test-agent" } : null);
    return {
        schema: "ccm-independent-verifier-selection-v1",
        available: !!selected,
        originalTarget: original,
        targetName: selected?.project || "",
        reason: selected
            ? `${selected.project} 将以独立视角复核 ${original || "原实现 Agent"} 的交付证据`
            : "当前群聊没有可用的非原实现者 Agent，无法完成独立复核",
        nativeTestAgent: nativeTestAgentAvailable ? { available: true, project: original, workDir: originalRuntime.workDir } : { available: false },
        candidates: [
            ...(nativeTestAgentAvailable ? [{ project: "test-agent", score: 110, native: true }] : []),
            ...candidates.map((item) => ({ project: item.member.project, score: item.score })),
        ].slice(0, 8),
    };
}
function hasConfiguredTestAgentMultiSessionBrowserCheck(...lists) {
    return lists.flat().some((check) => {
        const sessions = Array.isArray(check?.sessions) ? check.sessions : [];
        const sessionSteps = Array.isArray(check?.sessionSteps)
            ? check.sessionSteps
            : Array.isArray(check?.session_steps)
                ? check.session_steps
                : [];
        return sessions.length >= 2 && sessionSteps.length > 0;
    });
}
function buildCoordinatorTestAgentHandoff(item, input) {
    const targetName = String(item?.targetName || item?.project || "").trim();
    const originalTarget = String(item?.reviewSubject || item?.originalTarget || item?.continuationOf || input.previousLedger?.project || "").trim();
    if (!(0, collaboration_1.isCoordinatorTestAgentName)(targetName) || !originalTarget)
        return null;
    const runtime = (0, collaboration_1.resolveProjectRuntimeForTestAgentHandoff)(input.group, originalTarget);
    const task = input.sourceTask || {};
    const previous = input.previousLedger || {};
    const changedFiles = (0, collaboration_1.collectCoordinatorChangedFiles)([
        ...(Array.isArray(previous.filesChanged) ? previous.filesChanged : []),
        task.file_changes?.files || [],
        task.delivery_summary?.actual_file_changes || [],
        task.deliverySummary?.actualFileChanges || [],
        task.delivery_summary?.files_changed || [],
        task.deliverySummary?.filesChanged || [],
    ].flat(), originalTarget);
    const verificationCommands = (0, collaboration_1.collectCoordinatorVerificationCommands)(originalTarget, runtime.workDir, previous);
    const acceptanceCriteria = (0, collaboration_1.buildCoordinatorTestAgentAcceptanceCriteria)(task, verificationCommands);
    const testAgentReviewConfig = (0, collaboration_1.collectConfiguredTestAgentReviewConfig)(originalTarget);
    const completedTasks = (0, collaboration_1.uniqueStrings)([
        previous.summary ? `${originalTarget} 上一轮结果：${previous.summary}` : "",
        ...(Array.isArray(previous.actions) ? previous.actions : []),
        item?.message || item?.task || "",
    ].filter((value) => !(0, collaboration_1.isCoordinatorReviewInstruction)(value))).slice(0, 10);
    const requiredChecks = (0, collaboration_1.uniqueStrings)(verificationCommands.length || !testAgentReviewConfig.hasExecutableSurface ? ["commands"] : [], testAgentReviewConfig.requiredChecks).slice(0, 20);
    const requiresConfiguredAdversarialProbe = requiredChecks.includes("adversarial")
        || testAgentReviewConfig.options.requireAdversarialProbe === true;
    const commandOnlyAdversarialPolicy = !testAgentReviewConfig.hasExecutableSurface && !requiresConfiguredAdversarialProbe
        ? {
            requireAdversarialProbe: false,
            adversarialProbeWaiver: "该变更仅提供静态文件与命令验证，没有已配置的 HTTP、浏览器或用户输入攻击面。",
        }
        : {};
    const warnings = (0, collaboration_1.uniqueStrings)([
        runtime.workDir ? "" : `Project "${originalTarget}" is missing workDir; TestAgent plan preflight will block execution until the project path is configured.`,
        acceptanceCriteria.length ? "" : "No acceptance criteria were supplied; coverage will be weaker.",
    ]);
    return {
        schema: "ccm-test-agent-handoff-v1",
        id: (0, collaboration_1.buildTestAgentHandoffId)(input.taskId || task.id || "", originalTarget),
        taskId: input.taskId || task.id || "",
        groupId: task.group_id || task.groupId || "",
        issuedBy: "group-main-agent",
        originalUserGoal: input.userMessage || task.business_goal || task.businessGoal || task.title || "",
        acceptanceCriteria,
        completedTasks,
        completedByProjectAgents: [originalTarget],
        requiredChecks,
        projects: [{
                name: originalTarget,
                workDir: runtime.workDir,
                ...testAgentReviewConfig.project,
                changedFiles,
                completedTasks,
                acceptanceCriteria,
                verificationCommands,
                agentSummary: previous.summary || item?.summary || item?.reason || "",
                risks: Array.isArray(previous.blockers) ? previous.blockers : [],
            }],
        options: {
            verificationOnly: true,
            browserProvider: input.forcePlaywrightProvider === true || input.providerGapReroute === true
                ? "playwright"
                : "auto",
            autoDiscoverVerificationCommands: true,
            collectBrowserArtifacts: true,
            ...commandOnlyAdversarialPolicy,
            ...testAgentReviewConfig.options,
            ...(input.forcePlaywrightProvider === true || input.providerGapReroute === true
                ? { browserProvider: "playwright" }
                : {}),
        },
        metadata: {
            handoffSource: "group-main-agent-independent-review-gate",
            route: input.reworkRoute || item?.reworkRoute || null,
            reviewSubject: originalTarget,
            verifier: targetName,
            previousLedger: previous,
            coordinatorOutputPreview: (0, memory_1.compactMemoryText)(input.coordinatorOutput || "", 1000),
            projectRuntimeSource: runtime.source,
            reviewInstructions: [
                `独立复核 ${originalTarget} 的交付证据，不得只复述原实现者结论。`,
                changedFiles.length ? "核对改动文件是否覆盖用户目标和验收标准。" : "核对原实现 Agent 的完成声明是否有真实证据。",
                "如果验证无法执行，明确写 blocked/needs，不能写成已通过。",
            ],
            ...(warnings.length ? { handoffWarnings: warnings } : {}),
            ...(input.forcePlaywrightProvider === true || input.providerGapReroute === true
                ? { providerGapReroute: true, providerGapRerouteReason: "handoff_builder_force_playwright" }
                : {}),
        },
        target: targetName,
        review_subject: originalTarget,
        warnings,
        display_policy: {
            user_text_first: false,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
        },
    };
}
function collectTestAgentBrowserEvidenceSummaryLines(report, verdict = null) {
    return (0, collaboration_1.uniqueStrings)([
        ...(0, collaboration_1.collectTestAgentBrowserAuthenticationLines)(report, verdict),
        ...(0, collaboration_1.collectTestAgentBrowserActionEffectLines)(report, verdict),
        ...(0, collaboration_1.collectTestAgentBrowserRecoveryLines)(report, verdict),
        ...(0, collaboration_1.collectTestAgentAdversarialEvidenceLines)(report, verdict),
        ...(0, collaboration_1.collectTestAgentBrowserMultiSessionLines)(report, verdict),
        ...(0, collaboration_1.collectTestAgentBrowserFlowLines)(report, verdict),
        ...(0, collaboration_1.collectTestAgentBrowserUploadLines)(report, verdict),
        ...(0, collaboration_1.collectTestAgentBrowserDownloadLines)(report),
        ...(0, collaboration_1.collectTestAgentBrowserTableLines)(report, verdict),
        ...(0, collaboration_1.collectTestAgentBrowserInteractionLines)(report, verdict),
        ...(0, collaboration_1.collectTestAgentBrowserNetworkLines)(report, verdict),
    ]).slice(0, 16);
}
function buildNativeTestAgentReceipt(targetName, report, handoff = null, workOrder = null, invocationResult = null) {
    const artifactVerdict = invocationResult?.verdict || (0, collaboration_1.readTestAgentVerdictArtifact)(report);
    const verdict = (0, collaboration_1.resolveTestAgentDecisionVerdict)(report, artifactVerdict);
    const reviewSubject = String(handoff?.review_subject || report.metadata?.reviewSubject || report.metadata?.review_subject || "").trim();
    const verification = (0, collaboration_1.collectTestAgentVerificationLines)(report, verdict);
    const evidence = (0, collaboration_1.collectTestAgentEvidenceLines)(report);
    const verdictGaps = (0, collaboration_1.collectTestAgentVerdictGapLines)(verdict);
    const verdictNextActions = (0, collaboration_1.collectTestAgentVerdictNextActions)(verdict);
    const failureSummaryLines = (0, collaboration_1.collectTestAgentFailureSummaryLines)(report, verdict);
    const failureDiagnosticLines = (0, collaboration_1.collectTestAgentFailureDiagnosticLines)(report, verdict);
    const multiSessionBrowser = (0, test_agent_review_bridge_1.summarizeTestAgentMultiSessionBrowser)(report, verdict);
    const browserAuthentication = (0, test_agent_review_bridge_1.summarizeTestAgentBrowserAuthentication)(report, verdict);
    const browserActionEffects = (0, test_agent_review_bridge_1.summarizeTestAgentBrowserActionEffects)(report, verdict);
    const browserRecovery = (0, test_agent_review_bridge_1.summarizeTestAgentBrowserRecovery)(report, verdict);
    const adversarialEvidence = (0, test_agent_review_bridge_1.summarizeTestAgentAdversarialEvidence)(report, verdict);
    const reviewedFiles = (0, collaboration_1.getTestAgentReviewedFiles)(workOrder || handoff?.work_order, report);
    const status = (0, collaboration_1.testAgentDecisionReceiptStatus)(report, verdict);
    const decisionSummary = `TestAgent 独立复核裁决：${(0, collaboration_1.testAgentDecisionLabel)(report, verdict)}。`;
    const blockers = (0, collaboration_1.uniqueStrings)([
        ...failureSummaryLines,
        ...(browserAuthentication?.failedLines || []),
        ...(browserAuthentication?.incompleteLines || []),
        ...(browserActionEffects?.failedLines || []),
        ...(browserActionEffects?.recheckLines || []),
        ...(browserRecovery?.recheckLines || []),
        ...(adversarialEvidence?.failedLines || []),
        ...(adversarialEvidence?.recheckLines || []),
        ...(adversarialEvidence?.blockedLines || []),
        ...(multiSessionBrowser?.failedLines || []),
        ...(multiSessionBrowser?.incompleteLines || []),
        ...verdictGaps,
        ...(Array.isArray(verdict?.blockedReasons) ? verdict.blockedReasons : []),
        ...(Array.isArray(report.blockedReasons) ? report.blockedReasons : []),
        ...((status === "failed" || verdict?.needsRework === true) ? (Array.isArray(verdict?.risks) ? verdict.risks : []) : []),
        ...((status === "failed" || verdict?.needsRework === true) ? (Array.isArray(report.risks) ? report.risks : []) : []),
    ]).slice(0, 12);
    const needs = status === "done"
        ? []
        : (0, collaboration_1.uniqueStrings)([
            verdict?.needsRecheck
                ? "我会先补齐复核工作单或可观察证据，并安排 TestAgent 重新复验"
                : verdict?.needsEnvironment
                    ? "我会先补齐环境、登录或运行条件，再继续 TestAgent 复核"
                    : "我会根据 TestAgent 复核结果决定是否返工原实现成员",
            ...failureDiagnosticLines,
            ...verdictNextActions,
            ...(verdict?.needsRecheck ? ["需要补齐复核证据并重新运行 TestAgent，不会直接要求原实现成员返工"] : []),
            ...(verdict?.needsEnvironment ? ["需要先补齐环境、登录或运行条件，再继续 TestAgent 复核"] : []),
            ...(verdict?.needsHuman && !verdict?.needsRecheck && !verdict?.needsEnvironment
                ? ["需要用户或人工确认 TestAgent 标记的问题"]
                : []),
            ...(Array.isArray(report.risks) ? report.risks : []),
        ]).slice(0, 12);
    return {
        ccm_receipt: true,
        agent: targetName || "test-agent",
        status,
        summary: decisionSummary,
        actions: (0, collaboration_1.uniqueStrings)([
            `按 TestAgent 原生工作单复核${reviewSubject ? ` ${reviewSubject}` : "原实现成员"} 的交付证据`,
            verification.length ? `执行/核对 ${verification.length} 项验证证据` : "",
            verdict ? `${artifactVerdict ? "读取" : "根据报告形成"} TestAgent 裁决：${(0, collaboration_1.testAgentDecisionLabel)(report, verdict)}` : "",
            ...verdictNextActions,
            reviewedFiles.length ? `核对 ${reviewedFiles.length} 个改动文件` : "",
        ]),
        filesChanged: [],
        verification,
        blockers,
        needs,
        independentReview: [{
                reviewer: targetName || "test-agent",
                verdict: (0, collaboration_1.testAgentDecisionReviewVerdict)(report, verdict),
                summary: decisionSummary,
                evidence: (0, collaboration_1.uniqueStrings)([
                    ...(browserAuthentication?.evidenceLines || []),
                    ...(browserActionEffects?.evidenceLines || []),
                    ...(browserRecovery?.evidenceLines || []),
                    ...(adversarialEvidence?.evidenceLines || []),
                    ...(multiSessionBrowser?.evidenceLines || []),
                    ...failureSummaryLines,
                    ...failureDiagnosticLines,
                    ...verdictGaps,
                    ...evidence,
                    ...verification,
                    ...reviewedFiles,
                ]).slice(0, 30),
                reviewSubject,
                workOrderId: report.workOrderId,
                reportId: report.id,
                artifactDir: report.artifactDir,
            }],
        reviewer: targetName || "test-agent",
        role: "independent_verifier",
        testAgentReport: {
            schema: report.schema,
            id: report.id,
            workOrderId: report.workOrderId,
            status: report.status,
            recommendation: report.recommendation,
            artifactDir: report.artifactDir,
            artifactFiles: report.metadata?.artifactFiles || null,
            verdict: (0, collaboration_1.compactTestAgentVerdict)(verdict),
            failureSummary: report.failureSummary || [],
            requiredChecks: report.requiredChecks,
            requiredCheckSummary: verdict?.requiredCheckSummary || null,
            acceptanceSummary: verdict?.acceptanceSummary || null,
            browserFlowSummary: verdict?.browserFlowSummary || report.browserFlowSummary || null,
            browserMultiSessionSummary: verdict?.browserMultiSessionSummary || report.browserMultiSessionSummary || null,
            browserAuthenticationSummary: verdict?.browserAuthenticationSummary
                || (0, test_agent_review_bridge_1.compactTestAgentBrowserAuthenticationSummary)(browserAuthentication),
            browserActionEffectSummary: verdict?.browserActionEffectSummary || report.browserActionEffectSummary || null,
            browserRecoverySummary: verdict?.browserRecoverySummary || report.browserRecoverySummary || null,
            adversarialEvidenceSummary: verdict?.adversarialEvidenceSummary || report.adversarialEvidenceSummary || null,
            acceptanceCoverage: report.acceptanceCoverage,
            requiredCheckCoverage: report.requiredCheckCoverage,
        },
    };
}
function buildNativeTestAgentReviewSummary(targetName, report, receipt) {
    const { deriveIndependentReviewDecision } = require("./test-agent-independent-review-decision");
    const verdict = receipt?.testAgentReport?.verdict || (0, collaboration_1.resolveTestAgentDecisionVerdict)(report);
    const postReviewSpotCheck = receipt?.post_review_spot_check || receipt?.postReviewSpotCheck || null;
    const postReviewSpotCheckSummary = receipt?.post_review_spot_check_summary
        || receipt?.postReviewSpotCheckSummary
        || (0, post_review_spot_check_1.buildPostReviewSpotCheckSummary)(postReviewSpotCheck);
    const reviewer = (0, collaboration_1.isCoordinatorTestAgentName)(targetName) ? "TestAgent" : (0, display_1.sanitizeMainAgentUserText)(targetName, "TestAgent", 60);
    const browserFlows = (0, test_agent_review_bridge_1.summarizeTestAgentBrowserFlows)(report, verdict);
    const multiSessionBrowser = (0, test_agent_review_bridge_1.summarizeTestAgentMultiSessionBrowser)(report, verdict);
    const browserAuthentication = (0, test_agent_review_bridge_1.summarizeTestAgentBrowserAuthentication)(report, verdict);
    const browserActionEffects = (0, test_agent_review_bridge_1.summarizeTestAgentBrowserActionEffects)(report, verdict);
    const browserRecovery = (0, test_agent_review_bridge_1.summarizeTestAgentBrowserRecovery)(report, verdict);
    const adversarialEvidence = (0, test_agent_review_bridge_1.summarizeTestAgentAdversarialEvidence)(report, verdict);
    const { buildTestAgentEnvironmentPrepChecklist, collectTestAgentFailureScreenshotRefs, formatFailureScreenshotTechnicalRows, formatTestAgentEnvironmentPrepUserLines, } = require("./test-agent-environment-prep");
    const decision = deriveIndependentReviewDecision({
        report,
        verdict,
        receiptStatus: receipt?.status,
        postReviewSpotCheck,
        forceReworkSignals: !!browserActionEffects?.failedLines?.length || !!adversarialEvidence?.failedLines?.length,
        forceRecheckSignals: !!browserActionEffects?.recheckLines?.length
            || !!browserRecovery?.recheckLines?.length
            || !!adversarialEvidence?.recheckLines?.length,
        forceEnvironmentSignals: !!adversarialEvidence?.blockedLines?.length
            || !!browserAuthentication?.incompleteLines?.length,
    });
    const status = decision.status;
    const spotCheckNeedsRecheck = decision.spotCheckNeedsRecheck;
    const environmentBlocked = decision.needsEnvironment || status === "needs_environment";
    const environmentPrep = environmentBlocked
        ? buildTestAgentEnvironmentPrepChecklist(report, verdict)
        : null;
    const failureScreenshotRefs = collectTestAgentFailureScreenshotRefs(report);
    const failureLines = (0, collaboration_1.collectTestAgentFailureSummaryLines)(report, verdict);
    const diagnosticLines = (0, collaboration_1.collectTestAgentFailureDiagnosticLines)(report, verdict);
    const gapLines = (0, collaboration_1.collectTestAgentVerdictGapLines)(verdict);
    const statusLabel = status === "passed"
        ? "已通过"
        : status === "needs_recheck"
            ? "需复验"
            : status === "needs_rework"
                ? "需返工"
                : environmentBlocked
                    ? "补条件"
                    : "等你确认";
    const gapPrefix = status === "needs_rework" ? "待返工" : status === "needs_recheck" ? "待复验" : environmentBlocked ? "待补条件" : "待确认";
    const providerGapNext = decision.providerGapCount
        ? "检测到浏览器 Provider 能力缺口，请改走 Playwright 后重新复验。"
        : "";
    const flakyNext = decision.flakyStabilityGroups > 0
        ? `浏览器稳定性有 ${decision.flakyStabilityGroups} 组 flaky，必须重新复验后再验收。`
        : "";
    const prepUserLines = formatTestAgentEnvironmentPrepUserLines(environmentPrep);
    const rows = (0, collaboration_1.uniqueStrings)([
        `${reviewer}：${statusLabel}`,
        ...(Array.isArray(postReviewSpotCheckSummary?.rows) ? postReviewSpotCheckSummary.rows : []),
        ...(browserAuthentication?.evidenceLines || []),
        ...(browserActionEffects?.evidenceLines || []),
        ...(browserRecovery?.evidenceLines || []),
        ...(adversarialEvidence?.evidenceLines || []),
        ...(multiSessionBrowser?.evidenceLines || []),
        ...(browserFlows?.evidenceLines || []),
        ...(environmentBlocked ? prepUserLines.slice(0, 2) : []),
        ...decision.providerGapLines.map(item => `Provider缺口：${item}`),
        flakyNext,
        ...failureLines.map(item => `返工重点：${item}`),
        ...diagnosticLines.map(item => `排查建议：${item}`),
        ...gapLines.map(item => `${gapPrefix}：${item}`),
    ])
        .map(item => (0, display_1.sanitizeMainAgentUserText)(item, "复核结论已整理。", 220))
        .slice(0, 16);
    return {
        schema: "ccm-main-agent-independent-review-summary-v1",
        title: "独立复核",
        status,
        status_label: statusLabel,
        headline: status === "passed"
            ? postReviewSpotCheck?.pass === true
                ? "TestAgent 已完成独立复核，我的关键验证抽查也已通过。"
                : "TestAgent 已完成独立复核，我会继续核对整体交付并给出最终总结。"
            : status === "needs_rework"
                ? "TestAgent 发现未通过项，我会先安排原实现成员返工，再重新验收。"
                : status === "needs_recheck"
                    ? spotCheckNeedsRecheck
                        ? "TestAgent 已通过，但我的完成前抽查尚未一致，我会先重新复验。"
                        : decision.providerGapCount
                            ? "TestAgent 碰到浏览器 Provider 能力缺口，我会改走 Playwright 后重新复验，不会误走代码返工路线。"
                            : decision.flakyStabilityGroups > 0
                                ? "TestAgent 发现浏览器稳定性 flaky，我会先重新复验，不会直接验收。"
                                : "TestAgent 的复核证据还没有闭环，我会先补齐检查并重新复验，不会误走代码返工路线。"
                    : environmentBlocked
                        ? `TestAgent 的复核受环境或登录条件阻塞（${environmentPrep?.userSummary || "缺登录态/运行条件"}），我会先补齐条件再继续验收。`
                        : "TestAgent 还有无法确认的验收项，我会先暂停最终验收。",
        rows,
        next_action: status === "passed"
            ? "继续核对改动、验证证据和验收条件。"
            : status === "needs_rework"
                ? "先让原实现成员修复失败点；返工完成后，我会自动沿用原工作单重新运行 TestAgent 复核。"
                : status === "needs_recheck"
                    ? spotCheckNeedsRecheck
                        ? "沿用原复核工作单重新运行 TestAgent，并再次抽查关键验证。"
                        : providerGapNext || flakyNext || "补齐可观察结果或目标关联的边界检查后，重新运行 TestAgent 复核。"
                    : environmentBlocked
                        ? environmentPrep?.missingEnvNames?.length
                            ? `先补齐环境变量名 ${environmentPrep.missingEnvNames.join("、")} 等条件，再继续 TestAgent 复核和最终验收。`
                            : "先补齐环境、登录或运行条件，再继续 TestAgent 复核和最终验收。"
                        : "先补齐受阻或待确认的验证条件，再继续最终验收。",
        display_policy: {
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            show_for_ordinary_conversation: false,
        },
        review_route: decision.reviewRoute,
        browser_provider_gap_count: decision.providerGapCount,
        test_agent_environment_prep: environmentPrep,
        testAgentEnvironmentPrep: environmentPrep,
        technical: {
            failure_step_screenshots: failureScreenshotRefs,
            failure_step_screenshot_rows: formatFailureScreenshotTechnicalRows(failureScreenshotRefs),
            test_agent_environment_prep: environmentPrep,
        },
    };
}
function formatNativeTestAgentOutput(targetName, report, receipt, handoff = null) {
    const reviewSubject = String(handoff?.review_subject || report.metadata?.reviewSubject || "").trim();
    const verification = Array.isArray(receipt.verification) ? receipt.verification : [];
    const blockers = Array.isArray(receipt.blockers) ? receipt.blockers : [];
    const needs = Array.isArray(receipt.needs) ? receipt.needs : [];
    const verdict = receipt?.testAgentReport?.verdict || null;
    const verdictGaps = (0, collaboration_1.collectTestAgentVerdictGapLines)(verdict);
    const browserEvidence = collectTestAgentBrowserEvidenceSummaryLines(report, verdict);
    const failureSummaryLines = (0, collaboration_1.collectTestAgentFailureSummaryLines)(report, verdict);
    const failureDiagnosticLines = (0, collaboration_1.collectTestAgentFailureDiagnosticLines)(report, verdict);
    const postReviewSpotCheckSummary = receipt?.post_review_spot_check_summary
        || receipt?.postReviewSpotCheckSummary
        || (0, post_review_spot_check_1.buildPostReviewSpotCheckSummary)(receipt?.post_review_spot_check || receipt?.postReviewSpotCheck);
    const artifactFiles = report.metadata?.artifactFiles || {};
    const artifactLabels = (0, collaboration_1.uniqueStrings)([
        report.artifactDir ? "报告目录" : "",
        artifactFiles.reportJsonPath ? "JSON 报告" : "",
        artifactFiles.reportMarkdownPath ? "Markdown 报告" : "",
        artifactFiles.verdictJsonPath ? "复核结论" : "",
        artifactFiles.manifestPath ? "证据清单" : "",
    ]);
    const visibleRecommendation = verdict?.needsRecheck
        ? "重新复验"
        : verdict?.needsEnvironment
            ? "补齐环境条件"
            : (0, collaboration_1.testAgentRecommendationLabel)(verdict?.recommendation || report.recommendation);
    const lines = [
        `TestAgent 独立复核完成：${(0, collaboration_1.testAgentVisibleReviewSummary)(report, verdict)}`,
        reviewSubject ? `- 复核对象：${reviewSubject}` : "",
        `- 结论：${(0, collaboration_1.testAgentStatusLabel)(verdict?.status || report.status)}；建议：${visibleRecommendation}`,
        `- 复核裁决：${(0, collaboration_1.testAgentDecisionLabel)(report, verdict)}`,
        postReviewSpotCheckSummary?.headline ? `- 完成前抽查：${postReviewSpotCheckSummary.headline}` : "",
        verification.length ? `- 验证证据：${verification.slice(0, 6).join("；")}` : "- 验证证据：没有可执行验证，已标记为待补齐。",
        browserEvidence.length ? `- 浏览器证据：${browserEvidence.slice(0, 16).join("；")}` : "",
        failureSummaryLines.length ? `- 返工重点：${failureSummaryLines.slice(0, 4).join("；")}` : "",
        failureDiagnosticLines.length ? `- 排查建议：${failureDiagnosticLines.slice(0, 3).join("；")}` : "",
        verdictGaps.length ? `- 待补齐项：${verdictGaps.slice(0, 4).join("；")}` : "",
        blockers.length ? `- 阻塞/风险：${blockers.slice(0, 5).join("；")}` : "- 阻塞/风险：未发现阻塞项。",
        needs.length ? `- 下一步：${needs.slice(0, 5).join("；")}` : "",
        artifactLabels.length ? `- 证据归档：${artifactLabels.join("、")}已放入技术详情。` : "- 证据归档：复核证据已放入技术详情。",
        "",
        "CCM_AGENT_RECEIPT",
        "```json",
        JSON.stringify(receipt, null, 2),
        "```",
    ];
    return lines.filter(Boolean).join("\n");
}
function summarizeNativeTestAgentExecutionPlan(plan) {
    const summary = plan?.summary || {};
    const parts = [
        `${Number(summary.projects || 0)} 个项目`,
        `${Number(summary.commands || 0)} 个命令`,
        `${Number(summary.httpChecks || 0) + Number(summary.adversarialHttpChecks || 0)} 个 HTTP 检查`,
        `${Number(summary.browserChecks || 0)} 个浏览器检查`,
        Number(summary.browserSessionSteps || 0) ? `${Number(summary.browserSessionSteps)} 个跨会话步骤` : "",
        Number(summary.browserParallelGroups || 0) ? `${Number(summary.browserParallelGroups)} 组并行动作` : "",
    ].filter(Boolean);
    const artifacts = Array.isArray(summary.expectedArtifactTypes) ? summary.expectedArtifactTypes : [];
    return [
        `TestAgent 复核计划：${parts.join("，")}`,
        artifacts.length ? `预期证据：${artifacts.slice(0, 8).map(collaboration_1.testAgentEvidenceTypeLabel).join("、")}` : "",
    ].filter(Boolean).join("；");
}
function buildNativeTestAgentPlanBlockedReceipt(targetName, plan, dispatch = null, handoff = null) {
    const issues = Array.isArray(plan?.issues) ? plan.issues : [];
    const errors = issues.filter((item) => item?.severity === "error");
    const reviewSubject = String(handoff?.review_subject || plan?.metadata?.normalizedWorkOrder?.metadata?.reviewSubject || "").trim();
    const blockers = (0, collaboration_1.uniqueStrings)([
        ...(errors.length ? errors : issues).map((item) => `${item.code || "plan_issue"}${item.project ? ` (${item.project})` : ""}: ${item.message || "TestAgent 工作单预检未通过"}`),
        dispatch?.stderr ? (0, memory_1.compactMemoryText)(dispatch.stderr, 500) : "",
        dispatch?.error ? String(dispatch.error) : "",
    ]).slice(0, 12);
    return {
        ccm_receipt: true,
        agent: targetName || "test-agent",
        status: "blocked",
        summary: "TestAgent 复核计划预检未通过，需要主 Agent 修复交接工作单后再执行。",
        actions: ["调用 TestAgent CLI --plan-only 预检工作单", "阻止启动真实复核，避免无效或昂贵验证"],
        filesChanged: [],
        verification: [],
        blockers: blockers.length ? blockers : ["TestAgent 工作单预检未通过"],
        needs: ["修复 TestAgent handoff/work order 后重新派发独立复核"],
        independentReview: [{
                reviewer: targetName || "test-agent",
                verdict: "blocked",
                summary: "TestAgent 尚未执行复核；工作单预检未通过。",
                evidence: blockers.slice(0, 10),
                reviewSubject,
                workOrderId: plan?.workOrderId || "",
                artifactDir: plan?.artifactDir || "",
            }],
        reviewer: targetName || "test-agent",
        role: "independent_verifier",
    };
}
function formatNativeTestAgentPlanBlockedOutput(targetName, plan, receipt, handoff = null) {
    const reviewSubject = String(handoff?.review_subject || "").trim();
    const blockers = Array.isArray(receipt.blockers) ? receipt.blockers : [];
    return [
        `TestAgent 复核计划未通过：${receipt.summary}`,
        reviewSubject ? `- 复核对象：${reviewSubject}` : "",
        plan?.schema ? `- 计划状态：${plan.valid ? "可执行" : "需要修复后再执行"}` : "",
        blockers.length ? `- 需要修复：${blockers.slice(0, 5).join("；")}` : "",
        "",
        "CCM_AGENT_RECEIPT",
        "```json",
        JSON.stringify(receipt, null, 2),
        "```",
    ].filter(Boolean).join("\n");
}
function buildNativeTestAgentRuntimeToolContext(targetName, workDir) {
    const audit = {
        runtime: "test-agent-native",
        mode: "native-test-agent-runner",
        isolation: "verification-only",
        snapshotId: "",
        snapshotPath: "",
        mcpConfigPath: "",
        skillRoot: "",
        requested: { mcp: [], skill: [] },
        synced: { mcp: [], skill: [] },
        missing: { mcp: [], skill: [] },
        mcp_statuses: [],
        skill_statuses: [],
        permission_rules: [],
        invoked_skills: [],
        authorization_readiness: { dispatchReady: true, mode: "native_test_agent" },
        dispatch_gate: { dispatchReady: true, reason: "TestAgent CLI 边界不需要第三方 Agent 工具注入" },
        catalogRevision: "",
        warnings: [],
        errors: [],
        reusedSnapshot: false,
        timestamp: new Date().toISOString(),
        workDir,
    };
    return {
        audit,
        dispatchGate: audit.dispatch_gate,
        dispatchBlocked: false,
        prompt: "",
        workEvent: {
            id: "we" + Date.now().toString(36) + crypto.randomBytes(2).toString("hex"),
            time: new Date().toISOString(),
            agent: targetName,
            kind: "tool",
            text: `${targetName} 使用 TestAgent CLI 执行独立复核`,
            runtimeToolSync: audit,
        },
    };
}
function buildCoordinatorReworkContinuationFallback(input) {
    const route = input.reworkRoute || (0, collaboration_1.getMentionReworkRoute)(input.mention);
    if (!route)
        return null;
    const mention = input.mention || {};
    const sourceTask = input.sourceTask || {};
    const requiresStop = (0, collaboration_1.coordinatorReworkRouteRequiresStop)(route);
    const requiresFreshVerifier = (0, collaboration_1.coordinatorReworkRouteNeedsFreshVerifier)(route);
    const usesVerifier = (0, collaboration_1.coordinatorReworkRouteUsesVerifier)(route);
    const reviewSubject = String(mention.reviewSubject || mention.review_subject || mention.originalTarget || mention.original_target || mention.continuationOf || mention.continuation_of || "").trim();
    const reason = (0, memory_1.compactMemoryText)(mention.reason || route.reason || mention.summary || mention.message || mention.task || "", 900);
    const previous = mention.previousLedger || {};
    const preserved = (0, collaboration_1.uniqueStrings)([
        previous.summary ? `上一轮结果：${(0, memory_1.compactMemoryText)(previous.summary, 220)}` : "",
        ...(Array.isArray(previous.filesChanged) ? previous.filesChanged.slice(0, 5).map((item) => `已有文件证据：${(0, memory_1.compactMemoryText)(item, 180)}`) : []),
        ...(Array.isArray(previous.verification) ? previous.verification.slice(0, 4).map((item) => `已有验证证据：${(0, memory_1.compactMemoryText)(item, 180)}`) : []),
        input.stopResult?.matched !== undefined ? `旧方向停止结果：匹配 ${input.stopResult.matched || 0} 个运行，终止 ${input.stopResult.killed || 0} 个进程` : "",
    ]);
    const instructions = (0, collaboration_1.uniqueStrings)([
        requiresStop ? "先确认旧方向已经停止或不再采用；本轮只按修正后的目标执行。" : "",
        usesVerifier ? `本轮使用独立验证视角，重新核对${reviewSubject ? ` ${reviewSubject} 的` : ""}目标覆盖、关键风险和最新证据，不要替原实现者补写结论。` : "",
        !requiresStop && !usesVerifier ? "承接上一轮上下文，只处理主 Agent 点名的返工缺口。" : "",
        reason ? `本轮返工原因：${reason}` : "",
        "完成后说明本轮覆盖了哪些缺口、实际动作、文件变化、验证结果和剩余风险。",
    ]);
    const avoid = (0, collaboration_1.uniqueStrings)([
        requiresStop ? "继续旧方向或旧方案中的已废弃实现" : "",
        usesVerifier ? "复用上一轮结论而不重新执行、观察和核对最新证据" : "",
        "把未运行的验证写成已通过",
    ]);
    return {
        schema: "ccm-worker-continuation-handoff-v1",
        kind: requiresStop ? "revise_goal" : usesVerifier ? "independent_review" : "rework",
        kind_label: requiresStop ? "方向修正" : usesVerifier ? "独立复验" : "返工补证据",
        route_label: route.user_label || route.userLabel || "继续处理缺口",
        target: input.targetName,
        latest_user_change: reason,
        current_goal: (0, memory_1.compactMemoryText)(sourceTask.business_goal || sourceTask.businessGoal || sourceTask.title || mention.message || mention.task || "", 1000),
        previous_goal: requiresStop ? (0, memory_1.compactMemoryText)(previous.summary || sourceTask.title || "", 700) : "",
        replan_required: requiresStop,
        interrupt_current_run: requiresStop,
        interruption_status: requiresStop ? "stopped_and_ready_to_replan" : "",
        instructions,
        preserved_context: preserved,
        avoid,
        technical: {
            route_schema: route.schema || "",
            route_strategy: route.strategy || "",
            continuation_strategy: route.continuationStrategy || route.continuation_strategy || "",
            review_subject: reviewSubject,
            verifier_selection: mention.verifierSelection || mention.verifier_selection || null,
            stop_matched: Number(input.stopResult?.matched || 0),
            stop_killed: Number(input.stopResult?.killed || 0),
        },
    };
}
function buildCoordinatorReworkFollowUp(item, input) {
    const originalTarget = String(item?.targetName || item?.project || "").trim();
    const previousLedger = (0, memory_1.findLatestWorkerLedger)(input.memorySnapshot, originalTarget);
    const reworkRoute = buildCoordinatorReworkRoutingDecision(item, {
        previousLedger,
        userMessage: input.userMessage,
        coordinatorOutput: input.coordinatorOutput,
    });
    const needsFreshVerifier = (0, collaboration_1.coordinatorReworkRouteNeedsFreshVerifier)(reworkRoute);
    const verifierSelection = needsFreshVerifier
        ? selectCoordinatorIndependentVerifier(input.group, originalTarget)
        : null;
    const dispatchBlocked = needsFreshVerifier && !verifierSelection?.available;
    const dispatchTarget = needsFreshVerifier && verifierSelection?.available
        ? String(verifierSelection.targetName || "").trim()
        : originalTarget;
    const reviewSubject = needsFreshVerifier
        ? originalTarget
        : String(item?.reviewSubject || item?.originalTarget || item?.continuationOf || "").trim();
    const sourceTask = input.sourceTask || (input.taskId ? (0, db_1.loadTasks)().find((task) => String(task.id || "") === String(input.taskId)) : null);
    const effectiveItem = {
        ...item,
        mention: dispatchTarget ? `@${dispatchTarget}` : item?.mention,
        targetName: dispatchTarget,
        project: dispatchTarget,
        originalTarget,
        reviewSubject,
        verifierSelection,
    };
    const carriedTestAgentHandoff = item?.testAgentHandoff || item?.test_agent_handoff || null;
    const testAgentHandoff = carriedTestAgentHandoff || (needsFreshVerifier
        ? buildCoordinatorTestAgentHandoff(effectiveItem, {
            group: input.group,
            sourceTask,
            taskId: input.taskId,
            previousLedger,
            reworkRoute,
            userMessage: input.userMessage,
            coordinatorOutput: input.coordinatorOutput,
        })
        : null);
    if (testAgentHandoff) {
        effectiveItem.testAgentHandoff = testAgentHandoff;
        effectiveItem.test_agent_handoff = testAgentHandoff;
        effectiveItem.testAgentHandoffWarnings = testAgentHandoff.warnings || [];
        effectiveItem.test_agent_handoff_warnings = testAgentHandoff.warnings || [];
    }
    const explicitUserTaskPreview = (0, display_1.sanitizeMainAgentUserText)(item?.userTaskPreview || item?.user_task_preview || "", "", 120);
    const userTaskPreview = dispatchBlocked
        ? [
            "缺少独立验证 Agent，需要配置 test agent/QA Agent",
            (0, display_1.sanitizeMainAgentUserText)(item?.summary || item?.reason || item?.message || item?.task || "", "需要独立复核交付证据", 90),
        ].filter(Boolean).join("：")
        : needsFreshVerifier
            ? `派独立验证 Agent 复核：复核 ${originalTarget || "原实现 Agent"} 的交付证据`
            : explicitUserTaskPreview || [
                reworkRoute.user_label || "继续补齐缺口",
                (0, display_1.sanitizeMainAgentUserText)(item?.summary || item?.reason || item?.message || item?.task || "", "补齐结果说明和验证证据", 90),
            ].filter(Boolean).join("：");
    const message = dispatchBlocked ? "" : buildCoordinatorReworkTask(effectiveItem, {
        userMessage: input.userMessage,
        coordinatorOutput: input.coordinatorOutput,
        round: input.round,
        maxRounds: input.maxRounds,
        previousLedger,
        reworkRoute,
    });
    return {
        ...effectiveItem,
        continuationOf: reviewSubject || originalTarget || dispatchTarget,
        continuationStrategy: reworkRoute.continuationStrategy || "same_worker_scratchpad",
        reworkRoute,
        routing: reworkRoute,
        previousLedger,
        dispatchBlocked,
        verifierSelection,
        userTaskPreview,
        message,
        testAgentHandoff,
        test_agent_handoff: testAgentHandoff,
        testAgentHandoffWarnings: testAgentHandoff?.warnings || [],
        test_agent_handoff_warnings: testAgentHandoff?.warnings || [],
    };
}
function buildCoordinatorReworkTask(item, input) {
    const project = String(item?.targetName || item?.project || "").trim();
    const rawTask = String(item?.message || item?.task || "").trim();
    const reason = String(item?.reason || "主 Agent 复盘发现仍缺少可验收证据").trim();
    const visibleSummary = (0, display_1.sanitizeMainAgentUserText)(item?.summary || reason || rawTask, "补齐结果说明和验证证据", 80);
    if (/主 Agent 返工工作单|返工轮次|必须再次提交 CCM_AGENT_RECEIPT/i.test(rawTask))
        return rawTask;
    const previous = input.previousLedger || item?.previousLedger || null;
    const previousSummary = previous ? [
        previous.summary ? `摘要：${(0, memory_1.compactMemoryText)(previous.summary, 260)}` : "",
        previous.filesChanged?.length ? `文件：${previous.filesChanged.slice(0, 8).join("、")}` : "",
        previous.verification?.length ? `验证：${previous.verification.slice(0, 8).join("、")}` : "",
        previous.blockers?.length ? `阻塞：${previous.blockers.slice(0, 8).join("、")}` : "",
        previous.needs?.length ? `需要：${previous.needs.slice(0, 8).join("、")}` : "",
    ].filter(Boolean).join("；") : "";
    const reworkRoute = input.reworkRoute || item?.reworkRoute || buildCoordinatorReworkRoutingDecision(item, { previousLedger: previous });
    const usesVerifier = (0, collaboration_1.coordinatorReworkRouteUsesVerifier)(reworkRoute);
    const reviewSubject = String(item?.reviewSubject || item?.originalTarget || item?.continuationOf || "").trim();
    const hasTestAgentHandoff = !!(item?.testAgentHandoff || item?.test_agent_handoff || item?.testAgentWorkOrder || item?.test_agent_work_order);
    return [
        `主 Agent 返工工作单：${project}`,
        `- 用户可见返工摘要：${visibleSummary}`,
        `- 返工轮次：第 ${input.round + 1}/${input.maxRounds} 轮执行；这是主 Agent 验收后派发的补充任务。`,
        `- 返工路由：${reworkRoute.user_label || "继续同一子 Agent 修复"}；${reworkRoute.reason || "按主 Agent 验收缺口继续处理"}`,
        reviewSubject && usesVerifier ? `- 独立复核对象：${reviewSubject}；需要重新核对目标覆盖、关键风险和最新实际证据。` : "",
        usesVerifier
            ? reworkRoute.requires_fresh_verifier
                ? "- 续跑语义：本轮用于独立验证/复核，请用新的验证视角检查目标覆盖、关键风险和实际证据，不要只复述原实现者结论。"
                : "- 续跑语义：沿用原 TestAgent 工作单和验收边界，但必须重新执行验证并根据最新真实输出重新判断，不能复用上一轮结论。"
            : reworkRoute.requires_stop
                ? "- 续跑语义：先停止沿用旧方向的动作，再按本工作单修正后的目标继续；不要把已废弃方案当作完成内容。"
                : "- 续跑语义：优先继续同一个子 Agent 的上下文；系统会把该子 Agent 的上一轮完成通知和上下文摘要注入给你。不要从零开始猜测，也不要重复已完成且已验证的工作。",
        previousSummary ? `- 上一轮执行结果摘要：${previousSummary}` : "- 上一轮执行结果摘要：暂无可用记录；请按本工作单和群聊记忆继续补齐缺口。",
        `- 原始需求：${(0, memory_1.compactMemoryText)(input.userMessage, 500)}`,
        `- 初始协调计划摘要：${(0, memory_1.compactMemoryText)(input.coordinatorOutput, 900)}`,
        `- 返工原因：${reason}`,
        `- 本次返工任务：${rawTask}`,
        "- 你的职责：只处理本项目范围内的代码、配置、验证或说明；如果依赖其他 Agent/用户，写清 blockers/needs。",
        "- 交付要求：补齐主 Agent 点名的缺口，明确实际动作、文件变更、验证结果和剩余风险。",
        "- 验证要求：实际运行与你补充内容相关的最小必要验证；未运行的只能写成建议，不能伪造成已执行。",
        hasTestAgentHandoff ? "- TestAgent 原生复核交接单：已生成并随本次派发进入技术上下文；TestAgent 会按该交接单执行独立验证。" : "",
        "- 回执要求：最后必须再次提交 CCM_AGENT_RECEIPT，status 只有在有证据时才能写 done。",
    ].filter(Boolean).join("\n");
}
function scheduleTestAgentRecheckAfterFollowUps(followUps = [], outputs = []) {
    const scheduled = [];
    for (const followUp of followUps || []) {
        if (followUp?.rerunTestAgentAfterCompletion !== true && followUp?.rerun_test_agent_after_completion !== true)
            continue;
        const targetName = String(followUp?.targetName || followUp?.project || "").trim();
        if (!(0, collaboration_1.followUpTargetCompleted)(outputs, targetName))
            continue;
        const subject = String(followUp?.reviewSubject || followUp?.originalTarget || followUp?.continuationOf || targetName).trim();
        const handoff = followUp?.testAgentRecheckHandoff
            || followUp?.test_agent_recheck_handoff
            || followUp?.testAgentHandoff
            || followUp?.test_agent_handoff
            || null;
        const report = followUp?.testAgentReport
            || followUp?.test_agent_report
            || followUp?.failedReviewEvidence?.[0]?.report
            || null;
        const verdict = followUp?.testAgentVerdict
            || followUp?.test_agent_verdict
            || report?.verdict
            || null;
        const recheck = (0, collaboration_1.buildTestAgentReviewRecheckFollowUp)({
            subject,
            handoff,
            report,
            verdict,
            reason: `${followUp?.summary || "上一轮缺口已处理"}；需要基于最新状态重新运行 TestAgent`,
            source: followUp?.rework_kind || "coordinator_rework_completed",
        });
        if (recheck)
            scheduled.push(recheck);
    }
    return (0, memory_1.uniqueByKey)(scheduled, (item) => `${String(item?.reviewSubject || "").trim()}|test_agent_review_recheck`, 8);
}
function buildGlobalGroupTestAgentOwnership() {
    return {
        schema: "ccm-global-group-test-agent-ownership-v1",
        global_agent: "dispatch_and_relay_only",
        group_main_agent: "plan_dispatch_accept_review_and_summarize",
        project_agent: "execute_and_return_receipt",
        test_agent: "independent_review_after_group_acceptance",
    };
}
//# sourceMappingURL=collaboration-test-agent-runtime.js.map