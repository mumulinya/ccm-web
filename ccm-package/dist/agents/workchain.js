"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeWorkchainUserText = sanitizeWorkchainUserText;
exports.buildMainAgentWorkchain = buildMainAgentWorkchain;
exports.formatMainAgentCompletionReply = formatMainAgentCompletionReply;
exports.runMainAgentWorkchainSelfTest = runMainAgentWorkchainSelfTest;
const user_facing_text_1 = require("./user-facing-text");
const test_agent_review_bridge_1 = require("./test-agent-review-bridge");
const post_review_spot_check_1 = require("./post-review-spot-check");
const INTERNAL_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|scratchpad|trace_id|session_ids|session_id|run_id|native_session|task_agent_session|shouldDelegate|Runtime Kernel|Coordinator|Pipeline|Trace Replay|WorkerContextPacket|task-notification|receipt[-_\s]*status|raw[_\s-]*payload|回执要求|任务级原生会话|execution_lease|workchain/i;
const WORKCHAIN_USER_VISIBLE_PROTOCOL_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|scratchpad|trace_id|session_ids|session_id|run_id|native_session|task_agent_session|shouldDelegate|Runtime Kernel|Trace Replay|WorkerContextPacket|task-notification|receipt[-_\s]*status|raw[_\s-]*payload|回执要求|任务级原生会话|execution_lease/i;
const GENERIC_COMPLETION_REPLY_PATTERN = /^(已处理|已完成|完成|ok|done|全局 Agent 已完成本轮处理|任务已建立|任务已派发|已派发|执行完成)[。.!！]?$/i;
function compactText(value, max = 240) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= max)
        return text;
    return `${text.slice(0, max)}...`;
}
function sanitizeWorkchainTerminology(value) {
    return (0, user_facing_text_1.sanitizeMainAgentRoleLanguage)((0, user_facing_text_1.sanitizeUserFacingProtocolTerms)((0, user_facing_text_1.sanitizeUserFacingTerminology)(value)));
}
function stringList(value, limit = 12) {
    const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n|；|;|,/) : [];
    return [...new Set(source.map(item => compactText(item, 220)).filter(Boolean))].slice(0, limit);
}
function narrativeList(value, limit = 12, fallback = "相关技术细节已放入技术详情。") {
    return stringList(value, limit)
        .map(item => sanitizeWorkchainUserText(item, fallback, 260))
        .filter(Boolean);
}
function asList(value) {
    return Array.isArray(value) ? value : value === undefined || value === null || value === "" ? [] : [value];
}
function verdictLabel(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text)
        return "";
    if (["passed", "pass", "accept", "accepted", "approved", "approve", "done", "ok", "success"].includes(text) || /通过|接受|批准|无阻塞/.test(text))
        return "已通过";
    if (["failed", "fail", "rework", "rejected", "reject"].includes(text) || /未通过|失败|返工|拒绝/.test(text))
        return "需要返工";
    if (["blocked", "need_human", "needs_human", "human"].includes(text) || /阻塞|人工|确认/.test(text))
        return "需要确认";
    if (["missing", "pending", "waiting", "required"].includes(text) || /待|缺|等待/.test(text))
        return "待补齐";
    return sanitizeWorkchainUserText(value, "已记录", 80);
}
function scrubWorkchainTestAgentPathText(value) {
    return String(value || "")
        .replace(/[A-Za-z]:[\\/][^\s；;，。)）]+/g, "技术详情里的证据文件")
        .replace(/(^|[\s（(])\/[^\s；;，。)）]*(?:test-agent-artifacts|screenshots|browser-artifacts|report\.json|report\.md|verdict\.json|artifact-manifest\.json)[^\s；;，。)）]*/gi, "$1技术详情里的证据文件")
        .replace(/\b(?:report\.json|report\.md|verdict\.json|artifact-manifest\.json)\b/gi, "证据文件");
}
function testAgentFailureTypeLabel(type) {
    const value = String(type || "").trim().toLowerCase();
    const labels = {
        issue: "工作单问题",
        server: "服务启动",
        command: "命令验证",
        http: "接口检查",
        browser: "浏览器检查",
        required_check: "必检项",
        acceptance: "验收条件",
    };
    return labels[value] || "复核问题";
}
function sanitizeTestAgentFailureText(value, fallback = "复核发现待补齐的问题。", max = 220) {
    return sanitizeWorkchainUserText(scrubWorkchainTestAgentPathText(value || fallback), fallback, max);
}
function looksLikeTestAgentFailureItem(item) {
    if (!item || typeof item !== "object")
        return false;
    return !!(item.type || item.title || item.reason || item.nextAction || item.diagnostics);
}
function collectTestAgentFailureItemsFromSource(source, depth = 0, seenObjects = new Set()) {
    if (!source || depth > 5)
        return [];
    if (typeof source !== "object")
        return [];
    if (seenObjects.has(source))
        return [];
    seenObjects.add(source);
    const rows = [];
    if (Array.isArray(source)) {
        for (const item of source)
            rows.push(...collectTestAgentFailureItemsFromSource(item, depth + 1, seenObjects));
        return rows;
    }
    const direct = source.failureSummary || source.failure_summary;
    if (Array.isArray(direct))
        rows.push(...direct.filter(looksLikeTestAgentFailureItem));
    const verdict = source.verdict || source.testAgentVerdict || source.test_agent_verdict;
    if (verdict && typeof verdict === "object") {
        const verdictFailures = verdict.failureSummary || verdict.failure_summary;
        if (Array.isArray(verdictFailures))
            rows.push(...verdictFailures.filter(looksLikeTestAgentFailureItem));
    }
    const nestedKeys = [
        "testAgentReport",
        "test_agent_report",
        "testAgentReceipt",
        "test_agent_receipt",
        "receipt",
        "delivery_report",
        "deliveryReport",
        "independentReview",
        "independent_review",
        "independent_review_summary",
        "independentReviewSummary",
    ];
    for (const key of nestedKeys) {
        if (source[key])
            rows.push(...collectTestAgentFailureItemsFromSource(source[key], depth + 1, seenObjects));
    }
    return rows;
}
function collectTestAgentFailureItems(input) {
    const summary = input.summary || {};
    const completion = input.completion || {};
    const technical = input.technical || {};
    const rows = [
        ...collectTestAgentFailureItemsFromSource(summary),
        ...collectTestAgentFailureItemsFromSource(completion),
        ...collectTestAgentFailureItemsFromSource(technical),
    ];
    const seen = new Set();
    const result = [];
    for (const item of rows) {
        const key = [
            item?.type || "",
            item?.project || "",
            item?.title || "",
            item?.reason || "",
            item?.nextAction || "",
        ].join("|");
        if (seen.has(key))
            continue;
        seen.add(key);
        result.push(item);
    }
    return result.slice(0, 8);
}
function testAgentFailureNeedsRework(item) {
    return /failed|fail|not_verified|rework|未通过|失败|返工/i.test(String(item?.status || item?.result || item?.recommendation || item?.reason || ""));
}
function testAgentFailureNeedsUser(item) {
    return /blocked|unknown|need_human|needs_human|manual|人工|确认|待确认|阻塞/i.test(String(item?.status || item?.result || item?.recommendation || item?.reason || ""));
}
function summarizeTestAgentFailureItem(item) {
    const type = testAgentFailureTypeLabel(item?.type);
    const project = sanitizeTestAgentFailureText(item?.project, "", 70);
    const title = sanitizeTestAgentFailureText(item?.title || item?.reason, "复核发现问题", 100);
    const reason = sanitizeTestAgentFailureText(item?.reason || item?.status, "需要补齐或修复后再验收。", 160);
    const prefix = project ? `${project}：${type}` : type;
    return `${prefix}「${title}」未通过：${reason}`;
}
function summarizeTestAgentDiagnosticItem(item) {
    const diagnostics = Array.isArray(item?.diagnostics) ? item.diagnostics : [];
    const nextActions = item?.nextAction ? [item.nextAction] : [];
    const first = [...diagnostics, ...nextActions]
        .map(value => sanitizeTestAgentFailureText(value, "", 180))
        .find(Boolean);
    if (!first)
        return "";
    const title = sanitizeTestAgentFailureText(item?.title || item?.type, "该问题", 70);
    return `${title}：${first}`;
}
function collectTestAgentFailureSummary(input) {
    const items = collectTestAgentFailureItems(input);
    const failureLines = [...new Set(items.map(summarizeTestAgentFailureItem).filter(Boolean))].slice(0, 5);
    const diagnosticLines = [...new Set(items.map(summarizeTestAgentDiagnosticItem).filter(Boolean))].slice(0, 4);
    const hasRework = items.some(testAgentFailureNeedsRework);
    const hasNeedsUser = items.some(testAgentFailureNeedsUser);
    const primaryLine = failureLines[0] || "";
    return { items, failureLines, diagnosticLines, hasRework, hasNeedsUser, primaryLine };
}
function collectTestAgentReviewSourcesFromSource(source, depth = 0, seenObjects = new Set()) {
    if (!source || depth > 5 || typeof source !== "object")
        return [];
    if (seenObjects.has(source))
        return [];
    seenObjects.add(source);
    if (Array.isArray(source)) {
        return source.flatMap(item => collectTestAgentReviewSourcesFromSource(item, depth + 1, seenObjects));
    }
    const rows = [];
    const hasReviewPayload = source.schema === "ccm-test-agent-report-v1"
        || source.schema === "ccm-test-agent-verdict-v1"
        || source.requiredCheckCoverage
        || source.required_check_coverage
        || source.acceptanceCoverage
        || source.acceptance_coverage
        || source.requiredCheckSummary
        || source.required_check_summary
        || source.acceptanceSummary
        || source.acceptance_summary
        || source.browserFlowSummary
        || source.browser_flow_summary
        || source.browserMultiSessionSummary
        || source.browser_multi_session_summary
        || source.browserAuthenticationSummary
        || source.browser_authentication_summary
        || source.metadata?.browserAuthenticationSummary
        || source.metadata?.browser_authentication_summary
        || source.browserActionEffectSummary
        || source.browser_action_effect_summary
        || source.browserRecoverySummary
        || source.browser_recovery_summary
        || source.adversarialEvidenceSummary
        || source.adversarial_evidence_summary
        || source.failedRequiredChecks
        || source.failedAcceptanceCriteria
        || source.unknownRequiredChecks
        || source.unknownAcceptanceCriteria;
    if (hasReviewPayload)
        rows.push(source);
    const nestedKeys = [
        "verdict",
        "testAgentVerdict",
        "test_agent_verdict",
        "testAgentReport",
        "test_agent_report",
        "testAgentReceipt",
        "test_agent_receipt",
        "receipt",
        "delivery_report",
        "deliveryReport",
        "independentReview",
        "independent_review",
        "independent_review_summary",
        "independentReviewSummary",
    ];
    for (const key of nestedKeys) {
        if (source[key])
            rows.push(...collectTestAgentReviewSourcesFromSource(source[key], depth + 1, seenObjects));
    }
    return rows;
}
function collectTestAgentReviewSources(input) {
    const rows = [
        ...collectTestAgentReviewSourcesFromSource(input.summary),
        ...collectTestAgentReviewSourcesFromSource(input.completion),
        ...collectTestAgentReviewSourcesFromSource(input.technical),
        ...collectTestAgentReviewSourcesFromSource(input.rawEvents),
    ];
    const seen = new Set();
    const result = [];
    for (const item of rows) {
        const key = [
            item?.schema || "",
            item?.id || item?.reportId || "",
            item?.workOrderId || item?.work_order_id || "",
            item?.status || "",
            item?.recommendation || "",
            JSON.stringify(item?.requiredCheckSummary
                || item?.acceptanceSummary
                || item?.browserAuthenticationSummary
                || item?.metadata?.browserAuthenticationSummary
                || item?.browserActionEffectSummary
                || item?.browserRecoverySummary
                || item?.adversarialEvidenceSummary
                || item?.failedRequiredChecks
                || item?.failedAcceptanceCriteria
                || "").slice(0, 180),
        ].join("|");
        if (seen.has(key))
            continue;
        seen.add(key);
        result.push(item);
    }
    return result.slice(0, 12);
}
function testAgentCoverageItemKey(item = {}) {
    const evidence = Array.isArray(item.evidence) ? item.evidence.join("|") : "";
    return [item.check || item.criterion || "", item.status || "", item.missingReason || "", evidence].join("|") || JSON.stringify(item || {});
}
function uniqueTestAgentCoverageItems(...lists) {
    const seen = new Set();
    const result = [];
    for (const list of lists) {
        for (const item of asList(list)) {
            if (!item || typeof item !== "object")
                continue;
            const key = testAgentCoverageItemKey(item);
            if (seen.has(key))
                continue;
            seen.add(key);
            result.push(item);
        }
    }
    return result;
}
function testAgentCoverageLabel(type) {
    const value = String(type || "").trim().toLowerCase();
    const labels = {
        commands: "命令验证",
        command: "命令验证",
        build: "构建检查",
        unit_tests: "单元测试",
        http: "接口检查",
        api: "接口检查",
        browser_e2e: "浏览器流程",
        browser_auth: "登录态浏览器验收",
        browser_authentication: "登录态浏览器验收",
        authenticated_browser: "登录态浏览器验收",
        login_session: "登录态浏览器验收",
        browser_multi_session: "多人协作浏览器验收",
        browser_network: "浏览器网络",
        browser_visual: "视觉检查",
        browser_layout: "布局检查",
        screenshots: "截图证据",
        console_errors: "控制台错误检查",
        independent_review: "独立复核",
    };
    return labels[value] || sanitizeTestAgentFailureText(type || "检查项", "检查项", 80);
}
function testAgentSummaryItems(summary, key, fallbackStatus) {
    return asList(summary?.[key]).map((item) => ({ ...item, status: item?.status || fallbackStatus }));
}
function collectTestAgentSummaryItems(source, kind, status) {
    const summaryKey = kind === "required" ? "requiredCheckSummary" : "acceptanceSummary";
    const summarySnakeKey = kind === "required" ? "required_check_summary" : "acceptance_summary";
    const listKey = status === "not_verified" ? "notVerified" : "unknown";
    const summaries = [
        source?.[summaryKey],
        source?.[summarySnakeKey],
        source?.verdict?.[summaryKey],
        source?.verdict?.[summarySnakeKey],
    ].filter(value => value && typeof value === "object" && !Array.isArray(value));
    return summaries.flatMap(summary => testAgentSummaryItems(summary, listKey, status));
}
function collectTestAgentCoverageByStatusFromSource(source, kind, status) {
    const coverageKey = kind === "required" ? "requiredCheckCoverage" : "acceptanceCoverage";
    const coverageSnakeKey = kind === "required" ? "required_check_coverage" : "acceptance_coverage";
    const verdictList = kind === "required"
        ? status === "not_verified" ? source?.failedRequiredChecks : source?.unknownRequiredChecks
        : status === "not_verified" ? source?.failedAcceptanceCriteria : source?.unknownAcceptanceCriteria;
    return uniqueTestAgentCoverageItems(verdictList, asList(source?.[coverageKey]).filter((item) => item?.status === status), asList(source?.[coverageSnakeKey]).filter((item) => item?.status === status), collectTestAgentSummaryItems(source, kind, status));
}
function summarizeTestAgentCoverageGap(item, kind, state) {
    if (kind === "required") {
        const reason = item?.missingReason ? `：${sanitizeTestAgentFailureText(item.missingReason, "", 140)}` : "";
        return `必检项：${testAgentCoverageLabel(item?.check)}${state === "failed" ? "未覆盖" : "待确认"}${reason}`;
    }
    const criterion = sanitizeTestAgentFailureText(item?.criterion || "未命名验收条件", "未命名验收条件", 180);
    return `验收条件${state === "failed" ? "未通过" : "待确认"}：${criterion}`;
}
function testAgentAcceptanceWeakReason(item) {
    const strength = String(item?.matchStrength || item?.match_strength || "").toLowerCase();
    const source = String(item?.evidenceSource || item?.evidence_source || "").toLowerCase();
    const evidence = asList(item?.evidence).filter(Boolean);
    if (strength === "fallback" || source === "single_criterion_report_status")
        return "只是从整体复核结果推断，建议补一条直接验证证据";
    if (strength === "none" || source === "none")
        return "缺少可直接对应到该验收条件的证据";
    if (!evidence.length && (strength || source))
        return "缺少可展示的验收证据样本";
    return "";
}
function collectTestAgentWeakAcceptanceItemsFromSource(source) {
    const summaries = [
        source?.acceptanceSummary,
        source?.acceptance_summary,
        source?.verdict?.acceptanceSummary,
        source?.verdict?.acceptance_summary,
    ].filter(value => value && typeof value === "object" && !Array.isArray(value));
    const summaryItems = summaries.flatMap(summary => testAgentSummaryItems(summary, "verified", "verified"));
    const coverageItems = [
        ...asList(source?.acceptanceCoverage),
        ...asList(source?.acceptance_coverage),
        ...asList(source?.verdict?.acceptanceCoverage),
        ...asList(source?.verdict?.acceptance_coverage),
    ].filter((item) => item?.status === "verified");
    return uniqueTestAgentCoverageItems(summaryItems, coverageItems)
        .filter((item) => !!testAgentAcceptanceWeakReason(item));
}
function collectTestAgentCoverageSummary(input) {
    const sources = collectTestAgentReviewSources(input);
    const failedRequired = uniqueTestAgentCoverageItems(...sources.map(source => collectTestAgentCoverageByStatusFromSource(source, "required", "not_verified")));
    const unknownRequired = uniqueTestAgentCoverageItems(...sources.map(source => collectTestAgentCoverageByStatusFromSource(source, "required", "unknown")));
    const failedAcceptance = uniqueTestAgentCoverageItems(...sources.map(source => collectTestAgentCoverageByStatusFromSource(source, "acceptance", "not_verified")));
    const unknownAcceptance = uniqueTestAgentCoverageItems(...sources.map(source => collectTestAgentCoverageByStatusFromSource(source, "acceptance", "unknown")));
    const weakAcceptance = uniqueTestAgentCoverageItems(...sources.map(collectTestAgentWeakAcceptanceItemsFromSource));
    const failedLines = [
        ...failedRequired.map(item => summarizeTestAgentCoverageGap(item, "required", "failed")),
        ...failedAcceptance.map(item => summarizeTestAgentCoverageGap(item, "acceptance", "failed")),
    ];
    const unknownLines = [
        ...unknownRequired.map(item => summarizeTestAgentCoverageGap(item, "required", "unknown")),
        ...unknownAcceptance.map(item => summarizeTestAgentCoverageGap(item, "acceptance", "unknown")),
    ];
    const weakLines = weakAcceptance.map((item) => {
        const criterion = sanitizeTestAgentFailureText(item?.criterion || "未命名验收条件", "未命名验收条件", 180);
        const reason = sanitizeTestAgentFailureText(testAgentAcceptanceWeakReason(item), "建议补充直接验证证据。", 180);
        return `验收证据待确认：${criterion}（${reason}）`;
    });
    return {
        sources,
        failedLines: [...new Set(failedLines)].slice(0, 6),
        unknownLines: [...new Set(unknownLines)].slice(0, 6),
        weakLines: [...new Set(weakLines)].slice(0, 6),
    };
}
function collectTestAgentBrowserFlowSummary(input) {
    const summaries = collectTestAgentReviewSources(input)
        .map(source => (0, test_agent_review_bridge_1.summarizeTestAgentBrowserFlows)(source))
        .filter(Boolean);
    return {
        summaries,
        evidenceLines: [...new Set(summaries.flatMap(item => item.evidenceLines))].slice(0, 8),
        failedLines: [...new Set(summaries.flatMap(item => item.failedLines))].slice(0, 6),
        incompleteLines: [...new Set(summaries.flatMap(item => item.incompleteLines))].slice(0, 6),
    };
}
function collectTestAgentBrowserMultiSessionSummary(input) {
    const summaries = collectTestAgentReviewSources(input)
        .map(source => (0, test_agent_review_bridge_1.summarizeTestAgentMultiSessionBrowser)(source))
        .filter(Boolean);
    return {
        summaries,
        evidenceLines: [...new Set(summaries.flatMap(item => item.evidenceLines))].slice(0, 8),
        failedLines: [...new Set(summaries.flatMap(item => item.failedLines))].slice(0, 6),
        incompleteLines: [...new Set(summaries.flatMap(item => item.incompleteLines))].slice(0, 6),
    };
}
function collectTestAgentBrowserAuthenticationSummary(input) {
    const summaries = collectTestAgentReviewSources(input)
        .map(source => (0, test_agent_review_bridge_1.summarizeTestAgentBrowserAuthentication)(source))
        .filter(Boolean);
    return {
        summaries,
        evidenceLines: [...new Set(summaries.flatMap(item => item.evidenceLines))].slice(0, 6),
        failedLines: [...new Set(summaries.flatMap(item => item.failedLines))].slice(0, 4),
        incompleteLines: [...new Set(summaries.flatMap(item => item.incompleteLines))].slice(0, 4),
    };
}
function collectTestAgentBrowserActionEffectSummary(input) {
    const summaries = collectTestAgentReviewSources(input)
        .map(source => (0, test_agent_review_bridge_1.summarizeTestAgentBrowserActionEffects)(source))
        .filter(Boolean);
    return {
        summaries,
        evidenceLines: [...new Set(summaries.flatMap(item => item.evidenceLines))].slice(0, 8),
        failedLines: [...new Set(summaries.flatMap(item => item.failedLines))].slice(0, 6),
        recheckLines: [...new Set(summaries.flatMap(item => item.recheckLines))].slice(0, 6),
    };
}
function collectTestAgentBrowserRecoverySummary(input) {
    const summaries = collectTestAgentReviewSources(input)
        .map(source => (0, test_agent_review_bridge_1.summarizeTestAgentBrowserRecovery)(source))
        .filter(Boolean);
    return {
        summaries,
        evidenceLines: [...new Set(summaries.flatMap(item => item.evidenceLines))].slice(0, 8),
        recheckLines: [...new Set(summaries.flatMap(item => item.recheckLines))].slice(0, 6),
    };
}
function collectTestAgentAdversarialEvidenceSummary(input) {
    const summaries = collectTestAgentReviewSources(input)
        .map(source => (0, test_agent_review_bridge_1.summarizeTestAgentAdversarialEvidence)(source))
        .filter(Boolean);
    return {
        summaries,
        evidenceLines: [...new Set(summaries.flatMap(item => item.evidenceLines))].slice(0, 8),
        failedLines: [...new Set(summaries.flatMap(item => item.failedLines))].slice(0, 6),
        recheckLines: [...new Set(summaries.flatMap(item => item.recheckLines))].slice(0, 6),
        blockedLines: [...new Set(summaries.flatMap(item => item.blockedLines))].slice(0, 6),
    };
}
function formatReviewEvidence(item) {
    if (!item)
        return "";
    if (typeof item === "string")
        return sanitizeWorkchainUserText(item, "", 260);
    if (typeof item !== "object")
        return sanitizeWorkchainUserText(item, "", 260);
    const verdict = item.testAgentReport?.verdict || item.test_agent_report?.verdict || item.verdict_artifact || item.verdictArtifact || null;
    const reviewer = sanitizeWorkchainUserText(item.reviewer || item.agent || item.by || item.reviewedBy || item.reviewed_by || "", "", 80);
    const subject = sanitizeWorkchainUserText(item.reviewSubject || item.review_subject || item.target || item.project || "", "", 90);
    const decision = verdict?.canAccept === true
        ? "可以接受"
        : verdict?.needsRework === true
            ? "需要返工"
            : verdict?.needsHuman === true
                ? "需要人工确认"
                : verdictLabel(item.verdict || item.status || item.result || verdict?.status || verdict?.recommendation);
    const summary = sanitizeWorkchainUserText(item.summary || verdict?.summary || item.note || item.message || "", "", 180);
    const parts = [
        reviewer ? `${reviewer}：` : "",
        subject ? `复核 ${subject}，` : "独立复核：",
        decision || "已记录",
        summary ? ` - ${summary}` : "",
    ];
    return sanitizeWorkchainUserText(parts.join(""), "", 320);
}
function collectReceiptReviewEvidence(receipts = []) {
    const rows = [];
    for (const receipt of receipts || []) {
        rows.push(...asList(receipt?.independentReview).map(formatReviewEvidence));
        rows.push(...asList(receipt?.independent_review).map(formatReviewEvidence));
        rows.push(...asList(receipt?.codeReview).map(formatReviewEvidence));
        rows.push(...asList(receipt?.code_review).map(formatReviewEvidence));
        if (receipt?.testAgentReport?.verdict || receipt?.test_agent_report?.verdict) {
            rows.push(formatReviewEvidence({
                reviewer: receipt.reviewer || receipt.agent || "TestAgent",
                reviewSubject: receipt.independentReview?.[0]?.reviewSubject || receipt.independent_review?.[0]?.review_subject || "",
                summary: receipt.summary,
                testAgentReport: receipt.testAgentReport || receipt.test_agent_report,
            }));
        }
    }
    return stringList(rows, 12);
}
function getIndependentReviewGateState(input) {
    const summary = input.summary || {};
    const completion = input.completion || {};
    const deliveryReport = summary.delivery_report || summary.deliveryReport || completion.delivery_report || completion.deliveryReport || {};
    const gate = summary.independent_review_gate || summary.independentReviewGate || deliveryReport.independent_review_gate || deliveryReport.independentReviewGate || {};
    const testAgentFailures = collectTestAgentFailureSummary(input);
    const testAgentCoverage = collectTestAgentCoverageSummary(input);
    const testAgentBrowserFlows = collectTestAgentBrowserFlowSummary(input);
    const testAgentMultiSessionBrowser = collectTestAgentBrowserMultiSessionSummary(input);
    const testAgentBrowserAuthentication = collectTestAgentBrowserAuthenticationSummary(input);
    const testAgentBrowserActionEffects = collectTestAgentBrowserActionEffectSummary(input);
    const testAgentBrowserRecovery = collectTestAgentBrowserRecoverySummary(input);
    const testAgentAdversarialEvidence = collectTestAgentAdversarialEvidenceSummary(input);
    const failedEvidence = [
        ...asList(gate.failed_evidence || gate.failedEvidence),
        ...asList(deliveryReport.failed_independent_review || deliveryReport.failedIndependentReview),
    ].filter(Boolean);
    const required = summary.independent_review_required === true
        || deliveryReport.independent_review_required === true
        || gate.required === true
        || testAgentFailures.items.length > 0
        || testAgentCoverage.failedLines.length > 0
        || testAgentCoverage.unknownLines.length > 0
        || testAgentCoverage.weakLines.length > 0
        || testAgentBrowserFlows.summaries.length > 0
        || testAgentMultiSessionBrowser.summaries.length > 0
        || testAgentBrowserAuthentication.summaries.length > 0
        || testAgentBrowserActionEffects.summaries.length > 0
        || testAgentBrowserRecovery.summaries.length > 0
        || testAgentAdversarialEvidence.summaries.length > 0;
    const hasCoverageFailure = testAgentCoverage.failedLines.length > 0
        || testAgentBrowserFlows.failedLines.length > 0
        || testAgentMultiSessionBrowser.failedLines.length > 0
        || testAgentBrowserAuthentication.failedLines.length > 0
        || testAgentBrowserActionEffects.failedLines.length > 0
        || testAgentAdversarialEvidence.failedLines.length > 0;
    const hasCoverageNeedsRecheck = testAgentBrowserActionEffects.recheckLines.length > 0
        || testAgentBrowserRecovery.recheckLines.length > 0
        || testAgentAdversarialEvidence.recheckLines.length > 0;
    const hasCoverageEnvironment = testAgentAdversarialEvidence.blockedLines.length > 0;
    const hasCoverageNeedsUser = testAgentCoverage.unknownLines.length > 0
        || testAgentCoverage.weakLines.length > 0
        || testAgentBrowserFlows.incompleteLines.length > 0
        || testAgentMultiSessionBrowser.incompleteLines.length > 0
        || testAgentBrowserAuthentication.incompleteLines.length > 0;
    const rawPassed = summary.independent_review_gate_passed === true
        || deliveryReport.independent_review_gate_passed === true
        || gate.pass === true
        || gate.status === "passed";
    const passed = rawPassed
        && !testAgentFailures.hasRework
        && !testAgentFailures.hasNeedsUser
        && !hasCoverageFailure
        && !hasCoverageNeedsRecheck
        && !hasCoverageEnvironment
        && !hasCoverageNeedsUser;
    const failed = required && !passed && (gate.status === "failed"
        || Number(gate.failed_count || gate.failedCount || 0) > 0
        || failedEvidence.length > 0
        || testAgentFailures.hasRework
        || hasCoverageFailure);
    const firstFailure = failedEvidence.find((item) => item && typeof item === "object") || {};
    const subject = sanitizeWorkchainUserText(firstFailure.reviewSubject || firstFailure.review_subject || firstFailure.subject || firstFailure.requester || "", "", 90);
    const reviewer = sanitizeWorkchainUserText(firstFailure.reviewer || firstFailure.agent || "TestAgent", "TestAgent", 80);
    const coverageFailedText = testAgentCoverage.failedLines[0] || "";
    const coverageNeedsUserText = testAgentCoverage.unknownLines[0] || testAgentCoverage.weakLines[0] || "";
    const browserFlowFailedText = testAgentBrowserFlows.failedLines[0] || "";
    const browserFlowNeedsUserText = testAgentBrowserFlows.incompleteLines[0] || "";
    const multiSessionFailedText = testAgentMultiSessionBrowser.failedLines[0] || "";
    const multiSessionNeedsUserText = testAgentMultiSessionBrowser.incompleteLines[0] || "";
    const authenticationFailedText = testAgentBrowserAuthentication.failedLines[0] || "";
    const authenticationNeedsUserText = testAgentBrowserAuthentication.incompleteLines[0] || "";
    const actionEffectFailedText = testAgentBrowserActionEffects.failedLines[0] || "";
    const actionEffectRecheckText = testAgentBrowserActionEffects.recheckLines[0] || "";
    const recoveryRecheckText = testAgentBrowserRecovery.recheckLines[0] || "";
    const adversarialFailedText = testAgentAdversarialEvidence.failedLines[0] || "";
    const adversarialRecheckText = testAgentAdversarialEvidence.recheckLines[0] || "";
    const adversarialEnvironmentText = testAgentAdversarialEvidence.blockedLines[0] || "";
    const failedText = testAgentFailures.primaryLine
        ? `TestAgent 复核未通过：${testAgentFailures.primaryLine}`
        : coverageFailedText
            ? `TestAgent 复核未通过：${coverageFailedText}`
            : browserFlowFailedText
                ? `TestAgent 真实浏览器验收未通过：${browserFlowFailedText}`
                : multiSessionFailedText
                    ? `TestAgent 多人协作浏览器验收未通过：${multiSessionFailedText}`
                    : authenticationFailedText
                        ? `TestAgent 登录态浏览器验收未通过：${authenticationFailedText}`
                        : actionEffectFailedText
                            ? `TestAgent 操作结果验证未通过：${actionEffectFailedText}`
                            : adversarialFailedText
                                ? `TestAgent 边界与异常验证未通过：${adversarialFailedText}`
                                : subject
                                    ? `${reviewer} 对 ${subject} 的复核未通过，需要原实现成员返工后重新复核`
                                    : "复杂变更独立复核未通过，需要原实现成员返工后重新复核";
    const diagnosticAction = testAgentFailures.diagnosticLines[0]
        ? `先按复核诊断处理：${testAgentFailures.diagnosticLines[0]}；修复后重新运行 TestAgent/独立复核。`
        : "";
    const needsUser = required && !passed && !failed && (hasCoverageNeedsUser
        || !!coverageNeedsUserText
        || !!browserFlowNeedsUserText
        || !!multiSessionNeedsUserText
        || !!authenticationNeedsUserText);
    const needsRecheck = required && !passed && !failed && hasCoverageNeedsRecheck;
    const needsEnvironment = required && !passed && !failed && !needsRecheck && hasCoverageEnvironment;
    const visiblePendingText = actionEffectRecheckText
        || recoveryRecheckText
        || adversarialRecheckText
        || adversarialEnvironmentText
        || coverageNeedsUserText
        || browserFlowNeedsUserText
        || multiSessionNeedsUserText
        || authenticationNeedsUserText;
    return {
        required,
        passed,
        failed,
        missing: required && !passed && !failed,
        needsUser,
        gate,
        failedEvidence,
        testAgentFailures,
        testAgentCoverage,
        testAgentBrowserFlows,
        testAgentMultiSessionBrowser,
        testAgentBrowserAuthentication,
        testAgentBrowserActionEffects,
        testAgentBrowserRecovery,
        testAgentAdversarialEvidence,
        failedText,
        riskText: failed
            ? failedText
            : needsRecheck
                ? `TestAgent 复核需要重新验证：${visiblePendingText}`
                : needsEnvironment
                    ? `TestAgent 复核需要补齐执行条件：${visiblePendingText}`
                    : needsUser
                        ? `TestAgent 复核需要确认：${visiblePendingText}`
                        : "",
        nextAction: failed
            ? diagnosticAction || "先让原实现成员修复复核失败点，修复后重新运行 TestAgent/独立复核。"
            : needsRecheck
                ? "先补齐可观察结果、会话恢复或目标关联的边界检查，再重新运行 TestAgent；不要直接要求原实现成员返工。"
                : needsEnvironment
                    ? "先补齐环境、登录或运行条件，再继续 TestAgent 复核和最终总结。"
                    : needsUser
                        ? "先补齐或确认 TestAgent 标记的待确认验收项，再继续最终总结。"
                        : "",
        needsRecheck,
        needsEnvironment,
    };
}
function getPostReviewSpotCheckState(input) {
    const summary = input.summary || {};
    const completion = input.completion || {};
    const deliveryReport = summary.delivery_report || summary.deliveryReport || completion.delivery_report || completion.deliveryReport || {};
    const gate = summary.post_review_spot_check_gate
        || summary.postReviewSpotCheckGate
        || deliveryReport.post_review_spot_check_gate
        || deliveryReport.postReviewSpotCheckGate
        || completion.post_review_spot_check_gate
        || completion.postReviewSpotCheckGate
        || {};
    const spotCheck = summary.post_review_spot_check
        || summary.postReviewSpotCheck
        || deliveryReport.post_review_spot_check
        || deliveryReport.postReviewSpotCheck
        || completion.post_review_spot_check
        || completion.postReviewSpotCheck
        || gate.latest
        || null;
    const visibleSummary = summary.post_review_spot_check_summary
        || summary.postReviewSpotCheckSummary
        || deliveryReport.post_review_spot_check_summary
        || deliveryReport.postReviewSpotCheckSummary
        || completion.post_review_spot_check_summary
        || completion.postReviewSpotCheckSummary
        || gate.summary
        || (0, post_review_spot_check_1.buildPostReviewSpotCheckSummary)(spotCheck);
    const required = summary.post_review_spot_check_required === true
        || deliveryReport.post_review_spot_check_required === true
        || completion.post_review_spot_check_required === true
        || gate.required === true
        || spotCheck?.required === true;
    const passed = !required
        || summary.post_review_spot_check_gate_passed === true
        || deliveryReport.post_review_spot_check_gate_passed === true
        || completion.post_review_spot_check_gate_passed === true
        || gate.pass === true
        || spotCheck?.pass === true
        || spotCheck?.status === "passed";
    const status = String(spotCheck?.status || gate.status || visibleSummary?.status || "").toLowerCase();
    const needsUser = required && !passed && /needs[_-]?user|waiting[_-]?user|manual|待确认|人工/.test(status);
    const failed = required && !passed && !needsUser;
    const failedText = sanitizeWorkchainUserText(visibleSummary?.headline || spotCheck?.headline || gate.reason || "", failed ? "TestAgent 已通过，但我的完成前抽查尚未一致。" : "", 260);
    return {
        required,
        passed,
        failed,
        needsUser,
        missing: required && !passed && !failed && !needsUser,
        gate,
        spotCheck,
        summary: visibleSummary,
        failedText,
        nextAction: sanitizeWorkchainUserText(visibleSummary?.next_action || visibleSummary?.nextAction || spotCheck?.next_action || spotCheck?.nextAction || "", failed
            ? "沿用原复核工作单重新运行 TestAgent，并再次抽查关键验证。"
            : needsUser
                ? "确认或补齐抽查条件后再继续最终验收。"
                : "", 260),
    };
}
function formatAcceptanceEvidence(item) {
    if (!item)
        return "";
    if (typeof item === "string")
        return sanitizeWorkchainUserText(item, "", 240);
    if (typeof item !== "object")
        return sanitizeWorkchainUserText(item, "", 240);
    const label = sanitizeWorkchainUserText(item.label || item.title || item.id || item.criterion || "验收项", "验收项", 100);
    const ok = item.ok === true || item.passed === true || /passed|verified|ok|success|通过/i.test(String(item.status || item.result || ""));
    const failed = item.ok === false || item.passed === false || /failed|not_verified|fail|未通过|失败/i.test(String(item.status || item.result || ""));
    const state = ok ? "已通过" : failed ? "未通过" : verdictLabel(item.status || item.result) || "已记录";
    const detail = sanitizeWorkchainUserText(item.detail || item.summary || item.reason || "", "", 140);
    return sanitizeWorkchainUserText(`${label}：${state}${detail ? `（${detail}` : ""}${detail ? "）" : ""}`, "", 260);
}
function collectAcceptanceEvidence(input) {
    const summary = input.summary || {};
    const completion = input.completion || {};
    const deliveryReport = summary.delivery_report || summary.deliveryReport || completion.delivery_report || completion.deliveryReport || {};
    const gate = summary.acceptance_gate || summary.acceptanceGate || deliveryReport.acceptance_gate || deliveryReport.acceptanceGate || {};
    const rows = stringList([
        ...asList(deliveryReport.acceptance),
        ...asList(completion.acceptance),
        ...asList(summary.acceptance),
        ...asList(gate.checks).map(formatAcceptanceEvidence),
        ...asList(gate.failed_checks || gate.failedChecks).map(formatAcceptanceEvidence),
        summary.acceptance_gate_passed === true || deliveryReport.acceptance_gate_passed === true ? "最终验收已通过" : "",
        summary.acceptance_gate_passed === false || deliveryReport.acceptance_gate_passed === false ? "最终验收未通过，缺口已整理" : "",
    ], 10);
    return rows;
}
function collectIndependentReviewEvidence(input) {
    const summary = input.summary || {};
    const completion = input.completion || {};
    const deliveryReport = summary.delivery_report || summary.deliveryReport || completion.delivery_report || completion.deliveryReport || {};
    const gate = summary.independent_review_gate || summary.independentReviewGate || deliveryReport.independent_review_gate || deliveryReport.independentReviewGate || {};
    const gateState = getIndependentReviewGateState(input);
    const testAgentFailures = gateState.testAgentFailures || collectTestAgentFailureSummary(input);
    const testAgentCoverage = gateState.testAgentCoverage || collectTestAgentCoverageSummary(input);
    const testAgentBrowserFlows = gateState.testAgentBrowserFlows || collectTestAgentBrowserFlowSummary(input);
    const testAgentMultiSessionBrowser = gateState.testAgentMultiSessionBrowser || collectTestAgentBrowserMultiSessionSummary(input);
    const testAgentBrowserAuthentication = gateState.testAgentBrowserAuthentication || collectTestAgentBrowserAuthenticationSummary(input);
    const testAgentBrowserActionEffects = gateState.testAgentBrowserActionEffects || collectTestAgentBrowserActionEffectSummary(input);
    const testAgentBrowserRecovery = gateState.testAgentBrowserRecovery || collectTestAgentBrowserRecoverySummary(input);
    const testAgentAdversarialEvidence = gateState.testAgentAdversarialEvidence || collectTestAgentAdversarialEvidenceSummary(input);
    return stringList([
        ...asList(deliveryReport.independent_review || deliveryReport.independentReview),
        ...asList(summary.independent_review || summary.independentReview),
        ...asList(summary.independent_review_evidence || summary.independentReviewEvidence).map(formatReviewEvidence),
        ...asList(gate.evidence).map(formatReviewEvidence),
        ...asList(gate.failed_evidence || gate.failedEvidence).map(formatReviewEvidence),
        ...collectReceiptReviewEvidence(asList(summary.receipts)),
        ...collectReceiptReviewEvidence(asList(completion.receipts)),
        ...testAgentFailures.failureLines.map((item) => `返工重点：${item}`),
        ...testAgentFailures.diagnosticLines.map((item) => `排查建议：${item}`),
        ...testAgentCoverage.failedLines.map((item) => `返工重点：${item}`),
        ...testAgentCoverage.unknownLines.map((item) => `待确认：${item}`),
        ...testAgentCoverage.weakLines.map((item) => `证据强度：${item}`),
        ...testAgentBrowserAuthentication.evidenceLines,
        ...testAgentBrowserActionEffects.evidenceLines,
        ...testAgentBrowserRecovery.evidenceLines,
        ...testAgentAdversarialEvidence.evidenceLines,
        ...testAgentMultiSessionBrowser.evidenceLines,
        ...testAgentBrowserFlows.evidenceLines,
        gateState.required
            ? gateState.passed
                ? "复杂变更独立复核已通过"
                : gateState.failed
                    ? gateState.failedText
                    : gateState.needsRecheck
                        ? "复杂变更独立复核需要重新复验"
                        : gateState.needsEnvironment
                            ? "复杂变更独立复核需要补齐环境或登录条件"
                            : "复杂变更独立复核仍需补齐"
            : "",
    ], 16);
}
function normalizeStepStatus(status) {
    const value = String(status || "").toLowerCase();
    if (["done", "completed", "succeeded", "success", "skipped"].includes(value))
        return "completed";
    if (["running", "in_progress", "executing", "reviewing", "reworking"].includes(value))
        return "in_progress";
    if (["waiting_confirmation", "waiting_clarification", "needs_confirmation", "waiting_user", "paused"].includes(value))
        return "needs_confirmation";
    if (["failed", "error"].includes(value))
        return "failed";
    if (["cancelled", "canceled"].includes(value))
        return "cancelled";
    return "pending";
}
function checkpointStatus(status) {
    const value = normalizeStepStatus(status);
    if (value === "completed")
        return "done";
    if (value === "in_progress")
        return "active";
    if (value === "needs_confirmation")
        return "warning";
    if (value === "failed")
        return "failed";
    return "pending";
}
const WORKCHAIN_TODO_VERIFICATION_PATTERN = /验证|验收|检查|复核|测试|test|verify|verification|check|qa|build|lint|typecheck/i;
function workchainTodoActiveForm(id, content, surface) {
    if (id === "intake")
        return "正在理解需求";
    if (id === "plan")
        return "正在形成计划";
    if (id === "execute")
        return surface === "global" ? "正在调度执行" : "正在协调执行";
    if (id === "verify")
        return "正在检查验收";
    if (id === "summarize")
        return "正在总结交付";
    if (/^正在/.test(content))
        return content;
    return content ? `正在${content.replace(/^(确认|形成|调度|协作|检查|总结|生成|读取|等待)/, "$1")}` : "正在处理当前步骤";
}
function normalizeWorkchainTodoStatus(status) {
    const value = normalizeStepStatus(status);
    if (value === "completed")
        return "completed";
    if (value === "in_progress")
        return "in_progress";
    if (value === "needs_confirmation")
        return "needs_confirmation";
    if (value === "failed")
        return "failed";
    if (value === "cancelled")
        return "cancelled";
    return "pending";
}
function workchainTodoHasVerificationStep(step) {
    return WORKCHAIN_TODO_VERIFICATION_PATTERN.test([
        step?.content,
        step?.label,
        step?.title,
        step?.summary,
        step?.detail,
        step?.activeForm,
        step?.active_form,
    ].filter(Boolean).join(" "));
}
function normalizeWorkchainTodoSteps(input, stages, terminal) {
    const source = (Array.isArray(input.steps) && input.steps.length)
        ? input.steps
        : stages.map(stage => ({
            id: stage.id,
            content: stage.label,
            activeForm: workchainTodoActiveForm(stage.id, stage.label, input.surface),
            status: stage.status,
            detail: stage.summary,
        }));
    const steps = source.map((step, index) => {
        const id = String(step?.id || step?.key || `workchain-step-${index + 1}`);
        const content = sanitizeWorkchainUserText(step?.content || step?.label || step?.title || step?.summary || "", `步骤 ${index + 1}`, 120);
        const activeForm = sanitizeWorkchainUserText(step?.activeForm || step?.active_form || workchainTodoActiveForm(id, content, input.surface), content, 140);
        const detail = sanitizeWorkchainUserText(step?.detail || step?.summary || "", "", 180);
        const status = normalizeWorkchainTodoStatus(step?.status || step?.state);
        return {
            id,
            content,
            label: content,
            activeForm,
            active_form: activeForm,
            status,
            detail,
            source: Array.isArray(input.steps) && input.steps.length ? "input_steps" : "workchain_stage",
        };
    }).filter(step => step.content);
    const activeIndexes = steps
        .map((step, index) => step.status === "in_progress" ? index : -1)
        .filter(index => index >= 0);
    if (activeIndexes.length > 1) {
        const keep = activeIndexes[0];
        activeIndexes.slice(1).forEach(index => {
            steps[index] = { ...steps[index], status: index > keep ? "pending" : "completed" };
        });
    }
    const hasActive = steps.some(step => step.status === "in_progress");
    const hasBlocking = steps.some(step => ["needs_confirmation", "failed", "cancelled"].includes(step.status));
    if (!terminal && !hasActive && !hasBlocking) {
        const nextIndex = steps.findIndex(step => step.status === "pending");
        if (nextIndex >= 0)
            steps[nextIndex] = { ...steps[nextIndex], status: "in_progress" };
    }
    return steps;
}
function buildWorkchainTodoVerificationReminder(input, steps, evidence, terminal) {
    const actionable = !(input.mode === "conversation" && !hasExecutableWorkEvidence(input, evidence));
    if (!actionable || steps.length < 3)
        return null;
    const planSteps = steps.filter(step => step.id !== "quality-followup" && step.source !== "final_summary_quality");
    const hasVerification = planSteps.some(workchainTodoHasVerificationStep) || hasStrongWorkchainVerificationEvidence(evidence);
    const allDone = steps.every(step => step.status === "completed");
    if (hasVerification || (!allDone && !terminal))
        return null;
    return {
        schema: "ccm-main-agent-plan-verification-reminder-v1",
        status: "needs_verification_step",
        title: "还缺验收步骤",
        headline: "这组计划已经收尾，但没有看到专门的验证/验收步骤或证据。",
        reason: "参考 Claude Code TodoWrite 的验证推动：3 个以上步骤完成前必须保留真实验收。",
        next_action: "我需要补充验证、独立复核或说明为什么当前不能验证，再给出最终总结。",
        display_policy: {
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            show_for_ordinary_conversation: false,
        },
    };
}
function buildWorkchainQualityFollowupTodoStep(qualityFollowup) {
    if (!qualityFollowup)
        return null;
    const missing = narrativeList(qualityFollowup.missing, 5, "交付总结缺少必要内容。");
    const target = missing.length ? `补齐${missing.slice(0, 3).join("、")}` : "补齐交付总结";
    const nextAction = sanitizeWorkchainUserText(qualityFollowup.next_action || qualityFollowup.nextAction, target, 180);
    return {
        id: "quality-followup",
        content: "补齐交付总结",
        label: "补齐交付总结",
        activeForm: `正在${target}`,
        active_form: `正在${target}`,
        status: "in_progress",
        detail: nextAction,
        source: "final_summary_quality",
        quality_followup: true,
        qualityFollowup: true,
    };
}
function applyQualityFollowupTodoStep(steps, qualityFollowup) {
    const followupStep = buildWorkchainQualityFollowupTodoStep(qualityFollowup);
    if (!followupStep)
        return steps;
    const normalized = steps
        .filter(step => step.id !== followupStep.id)
        .map(step => step.status === "in_progress" ? { ...step, status: "completed" } : step);
    return [...normalized, followupStep];
}
function buildWorkchainTodoPlan(input, stages, evidence, terminal, options = {}) {
    const steps = applyQualityFollowupTodoStep(normalizeWorkchainTodoSteps(input, stages, terminal), options.qualityFollowup);
    const completedCount = steps.filter(step => step.status === "completed").length;
    const current = steps.find(step => step.status === "in_progress")
        || steps.find(step => ["needs_confirmation", "failed"].includes(step.status))
        || steps.find(step => step.status === "pending")
        || steps[steps.length - 1]
        || null;
    const verificationReminder = buildWorkchainTodoVerificationReminder(input, steps, evidence, terminal);
    const hasVerificationEvidence = evidence.verification.length > 0 || evidence.acceptance.length > 0 || evidence.independentReview.length > 0;
    const hasQualityFollowup = Boolean(options.qualityFollowup);
    const archiveCompletedTodo = !hasQualityFollowup
        && terminal
        && steps.length > 0
        && steps.every(step => step.status === "completed")
        && hasVerificationEvidence
        && !verificationReminder;
    const archiveSummary = archiveCompletedTodo
        ? "计划已全部完成，主视图只保留最终总结；完整步骤和底层记录可在技术详情中查看。"
        : "";
    return {
        schema: "ccm-main-agent-workchain-todo-v1",
        source: "workchain",
        title: input.surface === "global" ? "我的当前计划" : "协作群当前计划",
        surface: input.surface,
        mode: input.mode || "",
        task_id: input.taskId || "",
        run_id: input.runId || "",
        mission_id: input.missionId || "",
        steps,
        current_step: current,
        currentStep: current,
        completed_count: completedCount,
        total_count: steps.length,
        progress_label: `${completedCount}/${steps.length}`,
        visible_steps: archiveCompletedTodo ? [] : steps,
        visibleSteps: archiveCompletedTodo ? [] : steps,
        archived_steps_count: archiveCompletedTodo ? steps.length : 0,
        archivedStepsCount: archiveCompletedTodo ? steps.length : 0,
        archive_summary: archiveSummary,
        archiveSummary,
        quality_followup_required: hasQualityFollowup,
        qualityFollowupRequired: hasQualityFollowup,
        quality_followup: options.qualityFollowup || null,
        qualityFollowup: options.qualityFollowup || null,
        verification_nudge: Boolean(verificationReminder),
        verification_reminder: verificationReminder,
        verificationReminder,
        display_policy: {
            user_visible: true,
            hide_for_ordinary_conversation: input.mode === "conversation" && !hasExecutableWorkEvidence(input, evidence),
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            quiet_completed: true,
            archive_completed_todo: archiveCompletedTodo,
            archiveCompletedTodo,
            archived_when_complete: archiveCompletedTodo,
            archivedWhenComplete: archiveCompletedTodo,
            visible_when_completed: !archiveCompletedTodo,
            visibleWhenCompleted: !archiveCompletedTodo,
            max_visible_steps: 5,
        },
    };
}
function eventStatusForCheckpoint(item) {
    const status = String(item?.status || item?.level || "").toLowerCase();
    if (["ok", "done", "success", "succeeded", "completed"].includes(status))
        return "done";
    if (["fail", "failed", "error"].includes(status))
        return "failed";
    if (["warn", "warning", "blocked"].includes(status))
        return "warning";
    if (["active", "running", "in_progress"].includes(status))
        return "active";
    return "pending";
}
function checkpointLabelFromAction(action) {
    const id = String(action || "");
    if (/inspect|read|query|search|analyze|context/i.test(id))
        return "已检查相关上下文";
    if (/plan|reason/i.test(id))
        return "已形成执行计划";
    if (/orchestrate|dispatch|send_group|send_project|child|mission/i.test(id))
        return "已安排执行目标";
    if (/verify|review|acceptance|receipt/i.test(id))
        return "已进入验收检查";
    if (/complete|final|reply|summary|report/i.test(id))
        return "已整理阶段结果";
    return "";
}
function checkpointLabelFromEvent(item, surface) {
    const type = String(item?.type || "");
    const agent = item?.agent ? `${item.agent}：` : "";
    const title = compactText(item?.title || item?.message || "", 96);
    if (type === "queued_group_task")
        return "我已接收任务";
    if (type === "coordinator_plan")
        return "我已制定协作计划";
    if (type === "reasoning_plan" || type === "reasoning_preflight")
        return "我已复核目标与验收";
    if (type === "sandbox_rehearsal")
        return "已完成任务前预演";
    if (type === "conflict_plan")
        return "已启用修改冲突保护";
    if (type === "global_mission_handoff_ready")
        return "我已补齐子任务交接";
    if (type === "worker_handoff_ready")
        return `${agent}工作单已补齐`;
    if (type === "global_mission_plan")
        return "我已制定跨项目计划";
    if (type === "dispatch")
        return "已安排执行成员";
    if (type === "direct_task")
        return "已安排项目执行成员";
    if (type === "child_agent_start")
        return `${agent}开始处理`;
    if (type === "child_agent_rework")
        return `${agent}开始返工`;
    if (type === "child_agent_failed")
        return `${agent}执行遇到问题`;
    if (type === "child_agent_receipt")
        return `${agent}提交结果`;
    if (type === "agent_qa_question")
        return `${agent}向其他 Agent 确认问题`;
    if (type === "agent_qa_waiting")
        return `${agent}等待依赖回答`;
    if (type === "agent_qa_accepted")
        return "我已采纳协作回答";
    if (type === "agent_qa_resume")
        return `${agent}拿到回答并继续执行`;
    if (type === "coordinator_review")
        return "我正在验收";
    if (type === "acceptance_gate")
        return "已检查交付质量";
    if (type === "plan_mode_confirmed")
        return "执行前计划已确认";
    if (type === "plan_mode_revision_requested")
        return "执行前计划已按反馈调整";
    if (type === "next_work_item_dispatch")
        return "下一步工作已接上";
    if (type === "targeted_rework")
        return "我已发起定向补充";
    if (type === "auto_gap_rework")
        return "我已按缺口自动返工";
    if (type === "task_continuation")
        return "补充要求已接收";
    if (type === "reasoning_recovery_check" || type === "startup_manual_recovery")
        return "我已接上恢复任务";
    if (type === "native_session_retry")
        return `${agent}恢复会话继续执行`;
    if (type === "runtime_fallback" || type === "runtime_switch")
        return agent ? `${agent}切换执行通道` : "我已切换执行通道";
    if (type === "permission_drift")
        return agent ? `${agent}权限状态已校正` : "权限状态已校正";
    if (type === "runtime_debt_cleanup")
        return "运行通道已清理";
    if (type === "task_rollback")
        return "已安全撤销改动";
    if (type === "global_supervisor_cycle")
        return "我已检查子任务进展";
    if (type === "global_supervisor_rework")
        return "我已安排子任务返工";
    if (type === "global_supervisor_waiting_user")
        return "我在等待你处理阻塞";
    if (type === "global_supervisor_completed")
        return "全局任务已通过交付验收";
    if (type === "global_direct_dispatch_completion_synced")
        return "全局会话已同步最终总结";
    if (type === "global_direct_dispatch_rollback_synced")
        return "全局会话已同步撤销结果";
    if (type === "global_agent.supervising")
        return "全局任务已进入持续跟踪";
    if (type === "global_agent.run_completed")
        return "我已完成总结";
    if (title)
        return sanitizeWorkchainUserText(title, surface === "global" ? "我更新了处理进展。" : "协作群更新了处理进展。", 96);
    return "";
}
function buildMainAgentProgressCheckpoints(input, stages, evidence, options = {}) {
    const items = [];
    const seen = new Set();
    const push = (item) => {
        const label = sanitizeWorkchainUserText(item.label || item.title, "", 110);
        if (!label)
            return;
        const detail = sanitizeWorkchainUserText(item.detail || "", "", 180);
        const key = `${label}|${detail}|${item.phase || ""}`;
        if (seen.has(key))
            return;
        seen.add(key);
        items.push({
            id: item.id || `checkpoint-${items.length + 1}`,
            label,
            detail,
            status: item.status || "pending",
            phase: item.phase || "",
            at: item.at || "",
            source: item.source || "workchain",
        });
    };
    for (const event of (input.rawEvents || []).filter(Boolean)) {
        const raw = `${event?.title || ""}\n${event?.detail || ""}\n${event?.message || ""}`;
        if (INTERNAL_TEXT_PATTERN.test(raw))
            continue;
        push({
            id: event.id || `${event.at || ""}:${event.type || ""}`,
            label: checkpointLabelFromEvent(event, input.surface),
            detail: compactText(event.detail || event.message || "", 180),
            status: eventStatusForCheckpoint(event),
            phase: event.phase || "",
            at: event.at || "",
            source: "timeline",
        });
    }
    if (items.length < 4) {
        for (const step of (input.steps || []).filter(Boolean)) {
            if (items.length >= 6)
                break;
            const raw = `${step.activeForm || step.active_form || step.summary || step.content || ""}`;
            if (INTERNAL_TEXT_PATTERN.test(raw))
                continue;
            push({
                id: step.id ? `step-${step.id}` : "",
                label: sanitizeWorkchainUserText(step.activeForm || step.active_form || step.summary || step.content, "我更新了当前处理进展。", 110),
                detail: compactText(step.evidence?.[0] || step.detail || "", 160),
                status: checkpointStatus(step.status),
                phase: step.phase || "",
                source: "todo",
            });
        }
    }
    if (!items.length) {
        for (const action of input.actionIds || []) {
            const label = checkpointLabelFromAction(action);
            if (label)
                push({ id: `action-${action}`, label, status: "done", phase: input.phase || input.mode || "", source: "action" });
        }
    }
    if (!items.length) {
        for (const stage of stages) {
            if (!["completed", "in_progress", "needs_confirmation", "failed", "cancelled"].includes(String(stage.status || "")))
                continue;
            push({ id: `stage-${stage.id}`, label: stage.label, detail: stage.summary, status: checkpointStatus(stage.status), phase: stage.id, source: "stage" });
        }
    }
    const terminal = ["completed", "done", "succeeded", "failed", "cancelled", "canceled", "supervising"].includes(String(input.status || "").toLowerCase())
        || ["completed", "failed", "cancelled", "reverted"].includes(String(input.phase || "").toLowerCase());
    if (terminal) {
        const detail = evidence.evidence.length ? evidence.evidence.slice(0, 3).join("，") : "";
        push({
            id: "final-summary-checkpoint",
            label: input.status === "supervising" ? "已进入持续跟踪" : "已整理本轮总结",
            detail,
            status: input.status === "failed" ? "failed" : "done",
            phase: "summarize",
            source: "summary",
        });
    }
    if (options.qualityFollowup) {
        push({
            id: "quality-followup-checkpoint",
            label: "正在补齐交付总结",
            detail: sanitizeWorkchainUserText(options.qualityFollowup.next_action || options.qualityFollowup.nextAction, "我会先补齐缺少的交付总结内容。", 180),
            status: "active",
            phase: "summarize",
            source: "final_summary_quality",
        });
    }
    return {
        schema: "ccm-main-agent-progress-checkpoints-v1",
        title: "关键进展",
        display_policy: {
            user_visible: true,
            hide_for_ordinary_conversation: input.mode === "conversation" && !(input.actionIds || []).length,
            raw_events_default_collapsed: true,
        },
        items: items.slice(-6),
    };
}
function stageStatus(input, stage) {
    const status = String(input.status || "").toLowerCase();
    const phase = String(input.phase || input.mode || "").toLowerCase();
    const terminal = ["completed", "done", "succeeded", "failed", "cancelled", "canceled"].includes(status)
        || ["completed", "failed", "cancelled", "reverted"].includes(phase);
    if (stage === "intake")
        return "completed";
    if (stage === "plan") {
        if (["waiting_confirmation", "waiting_clarification", "needs_user"].includes(status) || phase === "needs_user")
            return "needs_confirmation";
        return terminal || (input.steps || []).length || (input.actionIds || []).length ? "completed" : "in_progress";
    }
    if (stage === "execute") {
        if (["cancelled", "canceled"].includes(status) || phase === "cancelled")
            return "cancelled";
        if (status === "failed" || phase === "failed")
            return "failed";
        if (terminal)
            return "completed";
        if ((input.workers || []).length || (input.executions || []).length || (input.actionIds || []).some(id => /dispatch|create|execute|manage|send|orchestrate/i.test(String(id))))
            return "in_progress";
        return "pending";
    }
    if (stage === "verify") {
        if (status === "failed" || phase === "failed")
            return "failed";
        if (["waiting_confirmation", "waiting_clarification"].includes(status) || phase === "needs_user")
            return "needs_confirmation";
        if (terminal)
            return "completed";
        const summary = input.summary || {};
        if (summary.acceptance_gate_passed === true || stringList(summary.verification_executed).length)
            return "in_progress";
        return "pending";
    }
    if (stage === "summarize") {
        if (terminal || status === "supervising")
            return "completed";
        if (["waiting_confirmation", "waiting_clarification"].includes(status) || phase === "needs_user")
            return "needs_confirmation";
        return "pending";
    }
    return "pending";
}
function sanitizeWorkchainUserText(value, fallback = "我正在处理当前请求。", max = 260) {
    let text = compactText(value, max);
    if (!text)
        text = fallback;
    if (INTERNAL_TEXT_PATTERN.test(text)) {
        if (/error|失败|denied|invalid|权限|门禁/i.test(text))
            text = "执行时遇到保护或权限问题，我会继续排查；详细信息已放入技术详情。";
        else if (/done|完成|receipt|回执/i.test(text))
            text = "执行成员已提交结果说明，我正在汇总验收。";
        else
            text = fallback;
    }
    return compactText(sanitizeWorkchainTerminology(text
        .replace(/\bCoordinator\b/g, "我")
        .replace(/\bPipeline\b/g, "协作看板")
        .replace(/\bRuntime Kernel\b/g, "技术运行信息")
        .replace(/\bTrace Replay\b/g, "技术回放")
        .replace(/回执/g, "结果说明")), max);
}
function collectCompletionEvidence(input) {
    const summary = input.summary || {};
    const completion = input.completion || {};
    const technical = input.technical || {};
    const acceptance = collectAcceptanceEvidence(input);
    const independentReview = collectIndependentReviewEvidence(input);
    const independentReviewGate = getIndependentReviewGateState(input);
    const postReviewSpotCheck = getPostReviewSpotCheckState(input);
    const files = [
        ...stringList(summary.files_changed, 20),
        ...(Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes.map((item) => item?.path || item?.file || item).filter(Boolean) : []),
    ].slice(0, 20);
    const verification = narrativeList(summary.verification_executed || completion.verification || completion.evidence, 12, "验证记录已整理，技术细节已放入技术详情。");
    const receipts = Number(summary.receipt_count || 0);
    const workersDone = (input.workers || []).filter((item) => ["done", "completed", "succeeded"].includes(String(item?.status || "").toLowerCase())).length;
    const evidence = [
        ...narrativeList(completion.evidence, 8, "处理证据已整理，技术细节已放入技术详情。"),
        ...(files.length ? [`修改文件 ${files.length} 个`] : []),
        ...(verification.length ? [`执行检查 ${verification.length} 项`] : []),
        ...(acceptance.length ? [`验收结论：${acceptance[0]}`] : []),
        ...(independentReview.length ? [`独立复核：${independentReview[0]}`] : []),
        ...(postReviewSpotCheck.required && postReviewSpotCheck.passed ? ["我已完成关键验证抽查"] : []),
        ...(receipts ? [`收到执行成员结果说明 ${receipts} 条`] : []),
        ...(workersDone ? [`完成执行目标 ${workersDone} 个`] : []),
    ];
    const risks = [...new Set(stringList([
            ...(summary.risks || []),
            ...(summary.remaining_items || []),
            ...(summary.blockers || []),
            ...(summary.needs || []),
            ...(technical.blockers || []),
            ...(completion.risks || []),
            independentReviewGate.riskText,
            postReviewSpotCheck.failedText,
        ], 12).map(item => sanitizeWorkchainUserText(item, "排障信息已放入技术详情。", 240)).filter(Boolean))].slice(0, 8);
    return { files, verification, acceptance, independentReview, independentReviewGate, postReviewSpotCheck, receipts, workersDone, evidence: [...new Set(evidence)].slice(0, 10), risks };
}
function terminalWorkchain(input) {
    return ["completed", "done", "succeeded", "failed", "cancelled", "canceled", "supervising"].includes(String(input.status || "").toLowerCase())
        || ["completed", "failed", "cancelled", "reverted"].includes(String(input.phase || "").toLowerCase());
}
function hasExecutableWorkEvidence(input, evidence) {
    const actionIds = (input.actionIds || []).map(item => String(item || ""));
    const meaningfulActions = actionIds.filter(id => !["answer", "complete", "generate_final_reply"].includes(id));
    const summary = input.summary || {};
    return evidence.evidence.length > 0
        || evidence.files.length > 0
        || evidence.verification.length > 0
        || evidence.risks.length > 0
        || evidence.receipts > 0
        || evidence.workersDone > 0
        || meaningfulActions.length > 0
        || Array.isArray(input.workers) && input.workers.length > 0
        || Array.isArray(input.executions) && input.executions.length > 0
        || !!(summary.delivery_report || summary.deliveryReport);
}
function isBareWorkchainAcceptanceLine(item) {
    return /^最终验收(已通过|未通过)/.test(String(item || "").trim());
}
function workchainVerificationFailureText(item) {
    const text = String(item || "").trim();
    if (!text)
        return false;
    if (/无失败|未发现.*失败|没有.*失败|0\s*项?失败/i.test(text))
        return false;
    return /未通过|测试失败|验证失败|执行失败|命令失败|失败|报错|错误|\bfailed\b|\bfailure\b|\berror\b|exit code [1-9]\d*|exit_code [1-9]\d*|exitCode [1-9]\d*/i.test(text);
}
function workchainAcceptanceFailureText(item) {
    const text = String(item || "").trim();
    if (!text)
        return false;
    return /未通过|失败|缺口|待处理|需要返工|需返工/i.test(text);
}
function hasStrongWorkchainVerificationEvidence(evidence) {
    return evidence.verification.some(item => !workchainVerificationFailureText(item))
        || evidence.independentReview.length > 0
        || evidence.acceptance.some(item => !isBareWorkchainAcceptanceLine(item) && !workchainAcceptanceFailureText(item));
}
function collectWorkchainVisibleQualityText(value, depth = 0) {
    if (depth > 8 || value === undefined || value === null)
        return [];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
        return [String(value)];
    if (Array.isArray(value))
        return value.flatMap(item => collectWorkchainVisibleQualityText(item, depth + 1));
    if (typeof value !== "object")
        return [];
    return Object.entries(value)
        .filter(([key]) => ![
        "schema",
        "source",
        "surface",
        "mode",
        "task_id",
        "run_id",
        "mission_id",
        "display_policy",
    ].includes(key))
        .flatMap(([, nested]) => collectWorkchainVisibleQualityText(nested, depth + 1));
}
function buildFinalSummaryQuality(input, evidence, terminal, headline, nextAction, options = {}) {
    const summary = input.summary || {};
    const completion = input.completion || {};
    const deliveryReport = summary.delivery_report || summary.deliveryReport || completion.delivery_report || completion.deliveryReport || {};
    const isOrdinaryConversation = input.mode === "conversation" && !hasExecutableWorkEvidence(input, evidence);
    const required = terminal && !isOrdinaryConversation && hasExecutableWorkEvidence(input, evidence);
    const strongVerificationEvidence = hasStrongWorkchainVerificationEvidence(evidence);
    const failedVerificationEvidence = evidence.verification.some(workchainVerificationFailureText);
    const failedAcceptanceEvidence = evidence.acceptance.some(workchainAcceptanceFailureText)
        || summary.acceptance_gate_passed === false
        || deliveryReport.acceptance_gate_passed === false;
    const acceptanceGatePassed = summary.acceptance_gate_passed === true || deliveryReport.acceptance_gate_passed === true;
    const verificationStatus = evidence.verification.length
        ? failedVerificationEvidence
            ? `验证未通过：${evidence.verification.find(workchainVerificationFailureText)}`
            : `已记录 ${evidence.verification.length} 项验证或检查。`
        : failedAcceptanceEvidence
            ? "最终验收未通过，缺口已整理。"
            : strongVerificationEvidence
                ? "已记录验收或独立复核证据。"
                : acceptanceGatePassed
                    ? "最终验收标记为通过，但没有捕获到实际验证、复核或验收明细。"
                    : terminal && required
                        ? "暂无系统捕获的验证命令；这点会明确展示，不会被当作已验证。"
                        : "";
    const riskStatus = evidence.risks.length
        ? `仍有 ${evidence.risks.length} 项需要留意。`
        : required && (!strongVerificationEvidence || failedVerificationEvidence || failedAcceptanceEvidence)
            ? "仍需补齐实际验证、复核或验收明细。"
            : terminal && required
                ? "暂无需要你额外处理的风险。"
                : "";
    const checks = [
        { id: "outcome", label: "完成内容", passed: !!headline, detail: headline },
        { id: "evidence", label: "交付证据", passed: !required || evidence.evidence.length > 0 || evidence.files.length > 0 || evidence.workersDone > 0 || evidence.receipts > 0, detail: evidence.evidence.slice(0, 3).join("；") },
        { id: "verification", label: "验证或验收", passed: !required || (strongVerificationEvidence && !failedVerificationEvidence && !failedAcceptanceEvidence), detail: verificationStatus },
        { id: "independent_review", label: "独立复核", passed: !required || !evidence.independentReviewGate?.required || evidence.independentReviewGate.passed === true, detail: evidence.independentReviewGate?.failed ? evidence.independentReviewGate.failedText : evidence.independentReviewGate?.needsRecheck || evidence.independentReviewGate?.needsEnvironment || evidence.independentReviewGate?.needsUser ? evidence.independentReviewGate.riskText : evidence.independentReviewGate?.missing ? "复杂变更独立复核仍需补齐。" : evidence.independentReviewGate?.passed ? "复杂变更独立复核已通过。" : "" },
        { id: "post_review_spot_check", label: "完成前抽查", passed: !required || !evidence.postReviewSpotCheck?.required || evidence.postReviewSpotCheck.passed === true, detail: evidence.postReviewSpotCheck?.failed || evidence.postReviewSpotCheck?.needsUser ? evidence.postReviewSpotCheck.failedText : evidence.postReviewSpotCheck?.missing ? "TestAgent 通过后我仍需抽查关键验证。" : evidence.postReviewSpotCheck?.passed ? "我已抽查关键验证，结果与 TestAgent 结论一致。" : "" },
        { id: "risk", label: "风险说明", passed: !required || !!riskStatus, detail: riskStatus },
        { id: "next_action", label: "下一步", passed: !required || !!nextAction, detail: nextAction },
    ];
    const visibleText = collectWorkchainVisibleQualityText([
        headline,
        nextAction,
        evidence.evidence,
        evidence.verification,
        evidence.acceptance,
        evidence.independentReview,
        evidence.risks,
        options.todoPlan?.title,
        options.todoPlan?.visible_steps || options.todoPlan?.visibleSteps || [],
        options.todoPlan?.current_step || options.todoPlan?.currentStep || null,
        options.todoPlan?.verification_reminder || options.todoPlan?.verificationReminder || null,
        options.progressCheckpoints?.items || [],
    ]).join("\n");
    checks.push({
        id: "user_visible_protocol_sanitized",
        label: "普通文本不含内部协议",
        passed: !WORKCHAIN_USER_VISIBLE_PROTOCOL_PATTERN.test(visibleText),
        detail: "用户可见总结、计划和关键进展已按普通文本边界检查。",
    });
    return {
        schema: "ccm-main-agent-final-summary-quality-v1",
        required,
        passed: !required || checks.every(item => item.passed),
        checks,
        missing: checks.filter(item => !item.passed).map(item => item.label),
        verification_status: verificationStatus,
        risk_status: riskStatus,
        source: "workchain",
    };
}
function buildWorkchainQualityFollowup(quality) {
    if (!quality?.required || quality?.passed)
        return null;
    const missing = narrativeList(quality.missing, 5, "交付总结缺少必要内容。");
    if (!missing.length)
        return null;
    const independentReviewGap = Array.isArray(quality.checks)
        ? quality.checks.find((item) => item?.id === "independent_review" && item?.passed === false)
        : null;
    const postReviewSpotCheckGap = Array.isArray(quality.checks)
        ? quality.checks.find((item) => item?.id === "post_review_spot_check" && item?.passed === false)
        : null;
    const independentReviewDetail = sanitizeWorkchainUserText(independentReviewGap?.detail || "", "", 220);
    const independentReviewNeedsConfirmation = /需要确认|待确认|证据待确认|人工确认/i.test(independentReviewDetail);
    const independentReviewNeedsRecheck = /需要重新验证|重新复验|复核证据.*没有闭环|会话恢复.*没有闭环/i.test(independentReviewDetail);
    const independentReviewNeedsEnvironment = /需要补齐执行条件|环境|登录条件|运行条件/i.test(independentReviewDetail);
    const postReviewSpotCheckDetail = sanitizeWorkchainUserText(postReviewSpotCheckGap?.detail || "", "", 220);
    const nextAction = postReviewSpotCheckGap
        ? `${postReviewSpotCheckDetail || "TestAgent 通过后我仍需抽查关键验证。"}。沿用原复核工作单重新运行 TestAgent，并再次抽查关键验证；结论一致后再给出最终交付总结。`
        : independentReviewGap
            ? independentReviewDetail && !/复杂变更独立复核仍需补齐/.test(independentReviewDetail)
                ? independentReviewNeedsRecheck
                    ? "先补齐可观察结果、会话恢复或目标关联的边界检查，再重新运行 TestAgent；不要直接要求原实现成员返工。"
                    : independentReviewNeedsConfirmation
                        ? `${independentReviewDetail}。确认或补齐证据后重新运行 TestAgent/独立复核，再给出最终交付总结。`
                        : independentReviewNeedsEnvironment
                            ? "先补齐环境、登录或运行条件，再继续 TestAgent 复核和最终总结。"
                            : "先让原实现成员修复复核失败点，修复后重新运行 TestAgent/独立复核，再给出最终交付总结。"
                : "先让原实现成员修复复核未通过的问题，修复后重新运行 TestAgent/独立复核，再给出最终交付总结。"
            : `先补齐${missing[0]}，再给出最终交付总结。`;
    return {
        schema: "ccm-main-agent-quality-followup-v1",
        title: "交付总结还需补齐",
        headline: `这轮结果还不能当作完整交付总结，缺少：${missing.join("、")}。`,
        missing,
        next_action: nextAction,
        display_policy: {
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            show_for_ordinary_conversation: false,
        },
    };
}
function buildWorkchainQualityFollowupUserVisibleText(baseText, qualityFollowup) {
    if (!qualityFollowup)
        return baseText;
    const missing = narrativeList(qualityFollowup.missing, 3, "交付总结缺少必要内容。");
    const missingText = missing.length ? `，还缺少${missing.join("、")}` : "";
    const nextAction = sanitizeWorkchainUserText(qualityFollowup.next_action || qualityFollowup.nextAction, "", 220);
    const base = GENERIC_COMPLETION_REPLY_PATTERN.test(String(baseText || "").trim()) || /已完成|已处理|任务已处理|处理完成/.test(String(baseText || ""))
        ? "任务已有处理结果"
        : sanitizeWorkchainUserText(baseText, "任务已有处理结果", 180).replace(/[。.!！\s]+$/, "");
    return compactText(`${base}，但最终交付总结还在补齐${missingText}。${nextAction ? `下一步：${nextAction}` : ""}`, 360);
}
function buildUserVisibleText(input, evidence) {
    const status = String(input.status || "").toLowerCase();
    const phase = String(input.phase || input.mode || "").toLowerCase();
    const summary = input.summary || {};
    const completion = input.completion || {};
    const explicit = completion.summary || summary.headline || input.userText;
    if (status === "supervising") {
        const explicitText = sanitizeWorkchainUserText(explicit, "", 420);
        const nextText = sanitizeWorkchainUserText(completion.next_action || completion.nextAction || "", "", 260);
        if (phase === "needs_confirmation" && explicitText)
            return explicitText;
        if (/返工|rework|修复|重新复核|重新运行 TestAgent/i.test(`${explicitText}\n${nextText}`) && explicitText)
            return explicitText;
        return "已受理并进入持续跟踪；最终交付通过验收后，我会再给你完整总结。";
    }
    if (evidence.postReviewSpotCheck?.failed) {
        const failure = sanitizeWorkchainUserText(evidence.postReviewSpotCheck.failedText || "", "", 260);
        return failure
            ? `这轮还不能算完成：${failure}`
            : "这轮还不能算完成：TestAgent 已通过，但我的完成前抽查尚未一致。";
    }
    if (evidence.postReviewSpotCheck?.needsUser) {
        const detail = sanitizeWorkchainUserText(evidence.postReviewSpotCheck.failedText || "", "", 260);
        return detail
            ? `这轮还需要确认：${detail}`
            : "这轮还需要确认：完成前抽查缺少可复跑的验证条件。";
    }
    if (evidence.independentReviewGate?.failed) {
        const failure = sanitizeWorkchainUserText(evidence.independentReviewGate.failedText || "", "", 260);
        return failure
            ? `这轮还不能算完成：${failure}。`
            : "这轮还不能算完成：独立复核未通过，需要原实现成员返工后重新复核。";
    }
    if (evidence.independentReviewGate?.needsRecheck) {
        const detail = sanitizeWorkchainUserText(evidence.independentReviewGate.riskText || "", "", 260);
        return detail
            ? `这轮还不能算完成：${detail}。`
            : "这轮还不能算完成：TestAgent 的复核证据还没有闭环，需要重新复验。";
    }
    if (evidence.independentReviewGate?.needsEnvironment) {
        const detail = sanitizeWorkchainUserText(evidence.independentReviewGate.riskText || "", "", 260);
        return detail
            ? `这轮还不能算完成：${detail}。`
            : "这轮还不能算完成：TestAgent 复核需要先补齐环境或登录条件。";
    }
    if (evidence.independentReviewGate?.needsUser) {
        const detail = sanitizeWorkchainUserText(evidence.independentReviewGate.riskText || "", "", 260);
        return detail
            ? `这轮还需要确认：${detail}。`
            : "这轮还需要确认：TestAgent 标记了待确认的验收项。";
    }
    if (["failed"].includes(status) || phase === "failed")
        return sanitizeWorkchainUserText(explicit, "这次处理没有完成；原因和排障信息已放在技术详情里。");
    if (["cancelled", "canceled"].includes(status) || phase === "cancelled")
        return "本次处理已停止，不会继续执行。";
    if (["completed", "done", "succeeded"].includes(status) || phase === "completed") {
        if (explicit && !GENERIC_COMPLETION_REPLY_PATTERN.test(String(explicit).trim()))
            return sanitizeWorkchainUserText(explicit, "本轮处理已完成。");
        const parts = [];
        if (evidence.files.length)
            parts.push(`修改了 ${evidence.files.length} 个文件`);
        if (evidence.verification.length)
            parts.push(`完成 ${evidence.verification.length} 项检查`);
        if (evidence.independentReview.length
            && !evidence.independentReviewGate?.failed
            && !evidence.independentReviewGate?.needsRecheck
            && !evidence.independentReviewGate?.needsEnvironment
            && !evidence.independentReviewGate?.needsUser)
            parts.push(`完成独立复核`);
        if (evidence.workersDone)
            parts.push(`${evidence.workersDone} 个执行目标已完成`);
        return parts.length
            ? `已完成：${parts.join("，")}。`
            : input.mode === "conversation"
                ? "回复已整理给你。"
                : "处理结果已整理，是否已经交付以验收和最终总结为准。";
    }
    if (["waiting_confirmation", "waiting_clarification"].includes(status) || phase === "needs_user")
        return sanitizeWorkchainUserText(explicit, "我需要你确认目标、范围或授权后再继续。");
    return sanitizeWorkchainUserText(explicit, input.surface === "global" ? "我正在处理你的需求。" : "协作群正在协调处理你的需求。");
}
function buildTechnicalSections(input) {
    const technical = input.technical || {};
    const records = [];
    const troubleshooting = [];
    if (input.traceId)
        records.push({ label: "Trace", value: input.traceId });
    if (input.runId)
        records.push({ label: "Run", value: input.runId });
    if (input.taskId)
        records.push({ label: "Task", value: input.taskId });
    if (input.missionId)
        records.push({ label: "Mission", value: input.missionId });
    if (input.supervisorId)
        records.push({ label: "Supervisor", value: input.supervisorId });
    if (technical.execution_ids?.length)
        records.push({ label: "执行", value: technical.execution_ids.join("、") });
    if (technical.session_ids?.length)
        records.push({ label: "会话", value: technical.session_ids.join("、") });
    if ((input.actionIds || []).length)
        records.push({ label: "动作", value: (input.actionIds || []).join(", ") });
    const technicalContent = technical.technical_content || technical.technicalContent || technical.raw_reply || technical.rawReply || technical.raw_content || technical.rawContent || "";
    if (technicalContent)
        records.push({ label: "原始回复", value: compactText(technicalContent, 1600) });
    const blockers = stringList([...(technical.blockers || []), ...((input.summary || {}).blockers || [])], 6);
    if (blockers.length)
        troubleshooting.push({ label: "阻塞", value: blockers.join("；") });
    if ((input.rawEvents || []).length)
        records.push({ label: "原始事件", value: `${(input.rawEvents || []).length} 条，默认隐藏` });
    return [
        { id: "troubleshooting", title: "排障摘要", items: troubleshooting },
        { id: "records", title: "完整记录", items: records },
    ].filter(section => section.items.length);
}
function buildMainAgentWorkchain(input) {
    const evidence = collectCompletionEvidence(input);
    const userVisibleText = buildUserVisibleText(input, evidence);
    const stages = [
        { id: "intake", label: "理解需求", status: stageStatus(input, "intake"), summary: "确认用户真正想完成什么" },
        { id: "plan", label: "形成计划", status: stageStatus(input, "plan"), summary: "拆成可执行步骤和验收标准" },
        { id: "execute", label: input.surface === "global" ? "调度执行" : "协作执行", status: stageStatus(input, "execute"), summary: "调用工具或安排执行成员落地" },
        { id: "verify", label: "检查验收", status: stageStatus(input, "verify"), summary: "核对文件、结果说明、验证和风险" },
        { id: "summarize", label: "总结交付", status: stageStatus(input, "summarize"), summary: "用用户能看懂的话说明结果" },
    ];
    const terminal = terminalWorkchain(input);
    const baseProgressCheckpoints = buildMainAgentProgressCheckpoints(input, stages, evidence);
    const baseTodoPlan = buildWorkchainTodoPlan(input, stages, evidence, terminal);
    const explicitNextAction = sanitizeWorkchainUserText(input.completion?.next_action, "", 260);
    const provisionalNextAction = explicitNextAction
        || evidence.postReviewSpotCheck?.nextAction
        || evidence.independentReviewGate?.nextAction
        || (evidence.risks.length ? "先处理风险或缺口，再继续交付" : terminal ? "可以查看详情、继续补充要求或保存为知识" : "继续执行并在完成后给出总结");
    const provisionalQuality = buildFinalSummaryQuality(input, evidence, terminal, userVisibleText, provisionalNextAction, { todoPlan: baseTodoPlan, progressCheckpoints: baseProgressCheckpoints });
    const provisionalQualityFollowup = buildWorkchainQualityFollowup(provisionalQuality);
    const todoPlan = provisionalQualityFollowup ? buildWorkchainTodoPlan(input, stages, evidence, terminal, { qualityFollowup: provisionalQualityFollowup }) : baseTodoPlan;
    const progressCheckpoints = provisionalQualityFollowup ? buildMainAgentProgressCheckpoints(input, stages, evidence, { qualityFollowup: provisionalQualityFollowup }) : baseProgressCheckpoints;
    const nextAction = provisionalQualityFollowup?.next_action || provisionalNextAction;
    const provisionalUserVisibleText = provisionalQualityFollowup ? buildWorkchainQualityFollowupUserVisibleText(userVisibleText, provisionalQualityFollowup) : userVisibleText;
    const finalSummaryQuality = provisionalQualityFollowup
        ? buildFinalSummaryQuality(input, evidence, terminal, provisionalUserVisibleText, nextAction, { todoPlan, progressCheckpoints })
        : provisionalQuality;
    const qualityFollowup = buildWorkchainQualityFollowup(finalSummaryQuality);
    const finalUserVisibleText = qualityFollowup ? buildWorkchainQualityFollowupUserVisibleText(userVisibleText, qualityFollowup) : userVisibleText;
    return {
        schema: "ccm-main-agent-workchain-v1",
        surface: input.surface,
        mode: input.mode || "",
        status: input.status || "",
        phase: input.phase || "",
        user_visible_text: finalUserVisibleText,
        stages,
        todo_plan: todoPlan,
        todoPlan,
        progress_checkpoints: progressCheckpoints,
        completion_summary: {
            headline: finalUserVisibleText,
            evidence: evidence.evidence,
            files: evidence.files,
            verification: evidence.verification,
            acceptance: evidence.acceptance,
            independent_review: evidence.independentReview,
            independentReview: evidence.independentReview,
            post_review_spot_check: evidence.postReviewSpotCheck?.spotCheck || null,
            postReviewSpotCheck: evidence.postReviewSpotCheck?.spotCheck || null,
            post_review_spot_check_summary: evidence.postReviewSpotCheck?.summary || null,
            postReviewSpotCheckSummary: evidence.postReviewSpotCheck?.summary || null,
            post_review_spot_check_gate: evidence.postReviewSpotCheck?.gate || null,
            postReviewSpotCheckGate: evidence.postReviewSpotCheck?.gate || null,
            post_review_spot_check_required: evidence.postReviewSpotCheck?.required === true,
            post_review_spot_check_gate_passed: evidence.postReviewSpotCheck?.passed === true,
            risks: evidence.risks,
            next_action: nextAction,
            verification_status: finalSummaryQuality.verification_status,
            risk_status: finalSummaryQuality.risk_status,
            final_summary_quality: finalSummaryQuality,
            quality_followup: qualityFollowup,
            qualityFollowup,
            todo_plan: todoPlan,
            todoPlan,
            terminal,
        },
        display_policy: {
            user_text_first: true,
            technical_default_collapsed: true,
            hide_internal_protocols: true,
            final_summary_required: true,
        },
        technical_details: buildTechnicalSections(input),
    };
}
function completionSummaryHasEvidence(summary) {
    return Array.isArray(summary?.evidence) && summary.evidence.length > 0
        || Array.isArray(summary?.files) && summary.files.length > 0
        || Array.isArray(summary?.verification) && summary.verification.length > 0
        || Array.isArray(summary?.risks) && summary.risks.length > 0
        || !!summary?.delivery_report
        || !!summary?.deliveryReport;
}
function replyAlreadyHasFinalSummaryShape(value) {
    if (!value)
        return false;
    const text = String(value || "");
    const hasOutcome = /完成内容|处理总结|交付|已完成|已处理|结果/.test(text);
    const hasVerification = /验证|验收|检查|证据/.test(text);
    const hasRiskOrNext = /风险|需要留意|下一步|接下来/.test(text);
    return hasOutcome && hasVerification && hasRiskOrNext;
}
function formatMainAgentCompletionReply(options) {
    const original = sanitizeWorkchainUserText(options.reply, "", 1200);
    const generic = !original || GENERIC_COMPLETION_REPLY_PATTERN.test(original);
    const summary = options.workchain?.completion_summary || {};
    const quality = summary.final_summary_quality || {};
    const shouldShape = options.includeDetails === true || quality.required === true || completionSummaryHasEvidence(summary);
    if (!shouldShape && !generic && !options.includeDetails)
        return original;
    if (!generic && shouldShape && replyAlreadyHasFinalSummaryShape(original))
        return original;
    const headline = sanitizeWorkchainUserText(summary.headline, "处理结果已整理，是否已经交付以验收和最终总结为准。", 360);
    const evidenceLines = narrativeList(summary.evidence, 6, "处理证据已整理，技术细节已放入技术详情。");
    const verificationLines = narrativeList(summary.verification, 6, "验证记录已整理，技术细节已放入技术详情。");
    const verificationStatus = sanitizeWorkchainUserText(summary.verification_status, "", 260);
    const reviewLines = [
        ...narrativeList(summary.acceptance, 4, "验收结论已整理，技术细节已放入技术详情。").map(item => `验收：${item}`),
        ...narrativeList(summary.independent_review || summary.independentReview, 4, "复核结论已整理，技术细节已放入技术详情。").map(item => `复核：${item}`),
        ...narrativeList(summary.post_review_spot_check_summary?.rows || summary.postReviewSpotCheckSummary?.rows, 3, "完成前抽查结论已整理。").map(item => `抽查：${item}`),
    ];
    const riskLines = narrativeList(summary.risks, 5, "风险信息已整理，技术细节已放入技术详情。");
    const riskStatus = sanitizeWorkchainUserText(summary.risk_status, "", 260);
    const qualityFollowup = summary.quality_followup || summary.qualityFollowup || null;
    const qualityMissing = qualityFollowup ? narrativeList(qualityFollowup.missing, 5, "交付总结缺少必要内容。") : [];
    const qualityHeadline = qualityFollowup ? sanitizeWorkchainUserText(qualityFollowup.headline, "", 320) : "";
    const nextAction = sanitizeWorkchainUserText(summary.next_action, "", 260);
    const lines = [generic ? headline : original];
    if (shouldShape && evidenceLines.length)
        lines.push(`处理总结：\n- ${evidenceLines.join("\n- ")}`);
    else if (shouldShape && quality.required)
        lines.push(quality.passed === false
            ? "处理总结：本轮已有处理记录，但还缺少可验收的交付证据。"
            : "处理总结：处理结果已整理，但没有更多可展示的业务证据。");
    if (shouldShape && qualityMissing.length) {
        lines.push(`还需补齐：\n- ${qualityMissing.join("\n- ")}${qualityHeadline ? `\n${qualityHeadline}` : ""}`);
    }
    if (shouldShape && verificationLines.length)
        lines.push(`验证与验收：\n- ${verificationLines.join("\n- ")}`);
    else if (shouldShape && verificationStatus)
        lines.push(`验证与验收：${verificationStatus}`);
    if (shouldShape && reviewLines.length)
        lines.push(`复核与验收：\n- ${reviewLines.slice(0, 6).join("\n- ")}`);
    if (shouldShape && riskLines.length)
        lines.push(`需要留意：\n- ${riskLines.join("\n- ")}`);
    else if (shouldShape && riskStatus)
        lines.push(`需要留意：${riskStatus}`);
    if (shouldShape && nextAction)
        lines.push(`下一步：${nextAction}`);
    return lines.filter(Boolean).join("\n\n");
}
function runMainAgentWorkchainSelfTest() {
    const simple = buildMainAgentWorkchain({ surface: "global", status: "completed", mode: "conversation", userText: "已完成。", traceId: "trace-1", runId: "run-1" });
    const group = buildMainAgentWorkchain({
        surface: "group",
        status: "completed",
        mode: "delegation",
        summary: {
            actual_file_changes: [{ path: "src/app.ts" }],
            verification_executed: ["npm test"],
            receipt_count: 2,
            acceptance_gate_passed: true,
            acceptance_gate: { checks: [{ id: "acceptance", label: "用户目标覆盖", ok: true, detail: "核心流程已验证" }] },
            independent_review_required: true,
            independent_review_gate_passed: true,
            independent_review_gate: {
                evidence: [{
                        reviewer: "test-agent",
                        reviewSubject: "web-app",
                        verdict: "passed",
                        summary: "TestAgent 已复核交付证据并给出可以接受的结论。",
                    }],
            },
        },
        technical: { blockers: ["trace_id=hidden"], execution_ids: ["exec-1"] },
        traceId: "trace-2",
        taskId: "task-1",
    });
    const failedReview = buildMainAgentWorkchain({
        surface: "global",
        status: "completed",
        mode: "delegation",
        userText: "已完成。",
        summary: {
            actual_file_changes: [{ path: "src/session.ts" }],
            verification_executed: ["npm test 未通过"],
            receipt_count: 2,
            acceptance_gate_passed: false,
            independent_review_required: true,
            independent_review_gate_passed: false,
            independent_review_gate: {
                required: true,
                status: "failed",
                failed_count: 1,
                failed_evidence: [{
                        reviewer: "test-agent",
                        reviewSubject: "web-app",
                        verdict: "failed",
                        summary: "登录恢复验证仍未通过。",
                        evidence: ["npm test 未通过"],
                    }],
            },
        },
    });
    const failedTestAgentSummary = buildMainAgentWorkchain({
        surface: "global",
        status: "completed",
        mode: "delegation",
        userText: "已完成。",
        summary: {
            actual_file_changes: [{ path: "src/session.ts" }],
            verification_executed: ["npm test"],
            acceptance_gate_passed: true,
            test_agent_report: {
                schema: "ccm-test-agent-report-v1",
                status: "failed",
                recommendation: "rework",
                failureSummary: [{
                        type: "browser",
                        project: "web-app",
                        title: "登录恢复浏览器复核",
                        status: "failed",
                        reason: "会话请求没有恢复登录态；失败截图在 C:/tmp/test-agent-artifacts/workchain/screenshots/login.failure.png。",
                        nextAction: "先修复会话恢复请求，再重新运行浏览器复核。",
                        diagnostics: [
                            "打开失败截图核对页面是否仍停留在登录态。",
                            "检查浏览器网络日志中的 /api/session 请求。",
                        ],
                    }],
                metadata: {
                    artifactFiles: {
                        reportMarkdownPath: "C:/tmp/test-agent-artifacts/workchain/report.md",
                        manifestPath: "C:/tmp/test-agent-artifacts/workchain/artifact-manifest.json",
                    },
                },
            },
        },
    });
    const summaryOnlyTestAgentGap = buildMainAgentWorkchain({
        surface: "group",
        status: "completed",
        mode: "delegation",
        userText: "已完成。",
        summary: {
            actual_file_changes: [{ path: "src/login.ts" }],
            verification_executed: ["npm test"],
            acceptance_gate_passed: true,
            test_agent_report: {
                schema: "ccm-test-agent-report-v1",
                status: "passed",
                recommendation: "accept",
                verdict: {
                    schema: "ccm-test-agent-verdict-v1",
                    status: "passed",
                    recommendation: "accept",
                    canAccept: true,
                    requiredCheckSummary: {
                        total: 1,
                        statusCounts: { verified: 0, not_verified: 1, unknown: 0 },
                        verified: [],
                        notVerified: [{ check: "browser_e2e", status: "not_verified", evidence: [], missingReason: "浏览器流程没有实际执行证据" }],
                        unknown: [],
                    },
                    acceptanceSummary: {
                        total: 1,
                        statusCounts: { verified: 1, not_verified: 0, unknown: 0 },
                        matchStrengthCounts: { direct: 1, token: 0, fallback: 0, none: 0 },
                        evidenceSourceCounts: { matched_evidence: 1, single_criterion_report_status: 0, none: 0 },
                        verified: [{ criterion: "登录恢复可用", status: "verified", evidence: ["浏览器断言通过"], matchStrength: "direct", evidenceSource: "matched_evidence" }],
                        notVerified: [],
                        unknown: [],
                    },
                },
            },
        },
    });
    const weakTestAgentAcceptanceSummary = buildMainAgentWorkchain({
        surface: "global",
        status: "completed",
        mode: "delegation",
        userText: "已完成。",
        summary: {
            actual_file_changes: [{ path: "src/session.ts" }],
            verification_executed: ["npm test"],
            acceptance_gate_passed: true,
            test_agent_report: {
                schema: "ccm-test-agent-report-v1",
                status: "passed",
                recommendation: "accept",
                verdict: {
                    schema: "ccm-test-agent-verdict-v1",
                    status: "passed",
                    recommendation: "accept",
                    canAccept: true,
                    requiredCheckSummary: {
                        total: 1,
                        statusCounts: { verified: 1, not_verified: 0, unknown: 0 },
                        verified: [{ check: "commands", status: "verified", evidence: ["npm test"] }],
                        notVerified: [],
                        unknown: [],
                    },
                    acceptanceSummary: {
                        total: 1,
                        statusCounts: { verified: 1, not_verified: 0, unknown: 0 },
                        matchStrengthCounts: { direct: 0, token: 0, fallback: 1, none: 0 },
                        evidenceSourceCounts: { matched_evidence: 0, single_criterion_report_status: 1, none: 0 },
                        verified: [{
                                criterion: "登录恢复需要真实浏览器证据",
                                status: "verified",
                                evidence: ["整体报告通过"],
                                matchStrength: "fallback",
                                evidenceSource: "single_criterion_report_status",
                            }],
                        notVerified: [],
                        unknown: [],
                    },
                },
            },
        },
    });
    const failedBrowserFlowSummary = buildMainAgentWorkchain({
        surface: "group",
        status: "completed",
        mode: "delegation",
        userText: "已完成。",
        summary: {
            actual_file_changes: [{ path: "src/settings.ts" }],
            verification_executed: ["npm test"],
            acceptance_gate_passed: true,
            test_agent_report: {
                schema: "ccm-test-agent-report-v1",
                status: "passed",
                recommendation: "accept",
                browserFlowSummary: {
                    total: 2,
                    statusCounts: { passed: 1, failed: 1, blocked: 0, skipped: 0 },
                    flowTypeCount: 1,
                    criteriaCount: 2,
                    actionCount: 4,
                    assertionCount: 5,
                    failedStepCount: 1,
                    items: [{
                            flowType: "acceptance_popup_flow",
                            total: 2,
                            statusCounts: { passed: 1, failed: 1, blocked: 0, skipped: 0 },
                            criteria: ["打开设置弹窗后可以保存"],
                            failedStepCount: 1,
                            failures: [{ project: "web", name: "设置弹窗", status: "failed", failedSteps: ["raw locator"] }],
                        }],
                },
            },
        },
    });
    const failedMultiSessionBrowserSummary = buildMainAgentWorkchain({
        surface: "global",
        status: "completed",
        mode: "delegation",
        userText: "已完成。",
        summary: {
            actual_file_changes: [{ path: "src/collaboration.ts" }],
            verification_executed: ["npm test"],
            acceptance_gate_passed: true,
            test_agent_report: {
                schema: "ccm-test-agent-report-v1",
                status: "passed",
                recommendation: "accept",
                browserMultiSessionSummary: {
                    total: 2,
                    statusCounts: { passed: 1, failed: 1, blocked: 0, skipped: 0 },
                    sessionCount: 4,
                    uniqueSessionCount: 4,
                    sessionNames: ["sender", "receiver", "author", "observer"],
                    parallelGroupCount: 2,
                    comparisonCount: 2,
                    failedComparisonCount: 1,
                    actionCount: 7,
                    assertionCount: 8,
                    failedStepCount: 1,
                    items: [{
                            check: "作者更新后观察方同步刷新",
                            status: "failed",
                            sessionNames: ["author", "observer"],
                            failedSessionNames: ["observer"],
                            failedComparisonCount: 1,
                            failedSteps: [{ name: "session:observer:assert:visible", error: "locator=#raw-observer" }],
                        }],
                },
            },
        },
    });
    const failedBrowserAuthenticationSummary = buildMainAgentWorkchain({
        surface: "group",
        status: "completed",
        mode: "delegation",
        userText: "已完成。",
        summary: {
            actual_file_changes: [{ path: "src/session.ts" }],
            verification_executed: ["npm test"],
            acceptance_gate_passed: true,
            independent_review_required: true,
            independent_review_gate_passed: true,
            test_agent_report: {
                schema: "ccm-test-agent-report-v1",
                status: "passed",
                recommendation: "accept",
                metadata: {
                    browserAuthenticationSummary: {
                        configuredChecks: 2,
                        passedChecks: 1,
                        failedChecks: 1,
                        blockedChecks: 0,
                        authenticatedSessions: 2,
                        credentialEnvNames: ["PRIVATE_LOGIN_EMAIL", "PRIVATE_LOGIN_PASSWORD"],
                        storageStateCount: 2,
                        sensitiveArtifactSuppressionCount: 2,
                    },
                },
            },
        },
    });
    const blockedBrowserAuthenticationSummary = buildMainAgentWorkchain({
        surface: "global",
        status: "completed",
        mode: "delegation",
        userText: "已完成。",
        summary: {
            actual_file_changes: [{ path: "src/session.ts" }],
            verification_executed: ["npm test"],
            acceptance_gate_passed: true,
            independent_review_required: true,
            independent_review_gate_passed: true,
            test_agent_report: {
                schema: "ccm-test-agent-report-v1",
                status: "passed",
                recommendation: "accept",
                metadata: {
                    browserAuthenticationSummary: {
                        configuredChecks: 1,
                        passedChecks: 0,
                        failedChecks: 0,
                        blockedChecks: 1,
                        authenticatedSessions: 0,
                        credentialEnvNames: ["PRIVATE_LOGIN_EMAIL", "PRIVATE_LOGIN_PASSWORD"],
                        storageStateCount: 1,
                        sensitiveArtifactSuppressionCount: 1,
                    },
                },
            },
        },
    });
    const failedActionEffectAndAdversarialSummary = buildMainAgentWorkchain({
        surface: "group",
        status: "completed",
        mode: "delegation",
        userText: "已完成。",
        summary: {
            actual_file_changes: [{ path: "src/settings.ts" }],
            verification_executed: ["npm test"],
            acceptance_gate_passed: true,
            independent_review_required: true,
            independent_review_gate_passed: true,
            test_agent_report: {
                schema: "ccm-test-agent-report-v1",
                status: "passed",
                recommendation: "accept",
                verdict: {
                    schema: "ccm-test-agent-verdict-v1",
                    status: "passed",
                    recommendation: "accept",
                    canAccept: true,
                },
                browserActionEffectSummary: {
                    checks: 1,
                    actions: 1,
                    changed: 0,
                    unchanged: 1,
                    unavailable: 0,
                    failed: 1,
                    detailSuppressed: 0,
                    crossSession: 0,
                    actionTypes: { click: 1 },
                    changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
                    items: [{
                            project: "web",
                            name: "保存设置",
                            provider: "playwright",
                            status: "failed",
                            actions: 1,
                            changed: 0,
                            unchanged: 1,
                            unavailable: 0,
                            failed: 1,
                            detailSuppressed: 0,
                            crossSession: 0,
                            actionTypes: { click: 1 },
                            changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
                        }],
                },
                adversarialEvidenceSummary: {
                    required: true,
                    waived: false,
                    status: "failed",
                    total: 1,
                    passed: 0,
                    failed: 1,
                    blocked: 0,
                    skipped: 0,
                    http: 0,
                    browser: 1,
                    relevant: 1,
                    unlinked: 0,
                    passedRelevant: 0,
                    goalLinked: 1,
                    criteriaCovered: ["重复保存不能产生重复记录"],
                    probeTypes: ["duplicate_submit"],
                    items: [{
                            project: "web",
                            surface: "browser",
                            name: "重复保存设置",
                            target: "http://127.0.0.1:5173/settings?token=hidden",
                            status: "failed",
                            probeType: "duplicate_submit",
                            provider: "playwright",
                            relevance: "explicit",
                            linkedCriteria: ["重复保存不能产生重复记录"],
                            goalLinked: true,
                            matchScore: 100,
                        }],
                },
            },
        },
    });
    const needsRecheckLatestEvidenceSummary = buildMainAgentWorkchain({
        surface: "global",
        status: "completed",
        mode: "delegation",
        userText: "已完成。",
        summary: {
            actual_file_changes: [{ path: "src/session.ts" }],
            verification_executed: ["npm test"],
            acceptance_gate_passed: true,
            independent_review_required: true,
            independent_review_gate_passed: true,
            test_agent_report: {
                schema: "ccm-test-agent-report-v1",
                status: "passed",
                recommendation: "accept",
                verdict: {
                    schema: "ccm-test-agent-verdict-v1",
                    status: "passed",
                    recommendation: "accept",
                    canAccept: true,
                },
                browserActionEffectSummary: {
                    checks: 1,
                    actions: 1,
                    changed: 0,
                    unchanged: 0,
                    unavailable: 1,
                    failed: 1,
                    detailSuppressed: 1,
                    crossSession: 0,
                    actionTypes: { click: 1 },
                    changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
                    items: [{
                            project: "web",
                            name: "提交登录表单",
                            provider: "playwright",
                            status: "blocked",
                            actions: 1,
                            changed: 0,
                            unchanged: 0,
                            unavailable: 1,
                            failed: 1,
                            detailSuppressed: 1,
                            crossSession: 0,
                            actionTypes: { click: 1 },
                            changedSignals: { url: 0, title: 0, page_text: 0, dom: 0, network: 0, dialog: 0, popup: 0, download: 0 },
                        }],
                },
                browserRecoverySummary: {
                    checks: 1,
                    attempted: 1,
                    recovered: 0,
                    failed: 0,
                    notRetried: 1,
                    items: [{
                            project: "web",
                            name: "提交登录表单",
                            provider: "playwright",
                            status: "blocked",
                            attempted: 1,
                            recovered: 0,
                            failed: 0,
                            notRetried: 1,
                            events: [{ reason: "unsafe duplicate side effect", sessionId: "hidden-session" }],
                        }],
                },
                adversarialEvidenceSummary: {
                    required: true,
                    waived: false,
                    status: "missing",
                    total: 0,
                    passed: 0,
                    failed: 0,
                    blocked: 0,
                    skipped: 0,
                    http: 0,
                    browser: 0,
                    relevant: 0,
                    unlinked: 0,
                    passedRelevant: 0,
                    goalLinked: 0,
                    criteriaCovered: [],
                    probeTypes: [],
                    items: [],
                },
            },
        },
    });
    const passedPostReviewSpotCheck = buildMainAgentWorkchain({
        surface: "group",
        status: "completed",
        mode: "delegation",
        userText: "已完成。",
        summary: {
            actual_file_changes: [{ path: "src/session.ts" }],
            verification_executed: ["npm test"],
            receipt_count: 2,
            acceptance_gate_passed: true,
            acceptance_gate: { checks: [{ id: "acceptance", label: "用户目标覆盖", ok: true, detail: "核心流程已验证" }] },
            independent_review_required: true,
            independent_review_gate_passed: true,
            independent_review_gate: {
                required: true,
                pass: true,
                status: "passed",
                evidence: [{ reviewer: "test-agent", verdict: "passed", summary: "TestAgent 已通过独立复核。" }],
            },
            post_review_spot_check_required: true,
            post_review_spot_check_gate_passed: true,
            post_review_spot_check_gate: {
                required: true,
                pass: true,
                status: "passed",
                reason: "TestAgent 通过后，我已完成关键验证抽查",
            },
            post_review_spot_check: {
                schema: "ccm-main-agent-post-review-spot-check-v1",
                required: true,
                pass: true,
                status: "passed",
                executed_count: 2,
                passed_count: 2,
                mismatch_count: 0,
                headline: "我已抽查 2 项验证，结果与 TestAgent 的通过结论一致。",
                next_action: "继续完成最终验收。",
            },
            post_review_spot_check_summary: {
                schema: "ccm-main-agent-post-review-spot-check-summary-v1",
                title: "完成前抽查",
                status: "passed",
                status_label: "已通过",
                headline: "我已抽查 2 项验证，结果与 TestAgent 的通过结论一致。",
                rows: ["已抽查 2 项验证，2 项结果一致"],
                next_action: "继续完成最终验收。",
            },
        },
    });
    const failedPostReviewSpotCheck = buildMainAgentWorkchain({
        surface: "global",
        status: "completed",
        mode: "delegation",
        userText: "已完成。",
        summary: {
            actual_file_changes: [{ path: "src/session.ts" }],
            verification_executed: ["npm test"],
            receipt_count: 2,
            acceptance_gate_passed: true,
            acceptance_gate: { checks: [{ id: "acceptance", label: "用户目标覆盖", ok: true, detail: "核心流程已验证" }] },
            independent_review_required: true,
            independent_review_gate_passed: true,
            independent_review_gate: {
                required: true,
                pass: true,
                status: "passed",
                evidence: [{ reviewer: "test-agent", verdict: "passed", summary: "TestAgent 已通过独立复核。" }],
            },
            post_review_spot_check_required: true,
            post_review_spot_check_gate_passed: false,
            post_review_spot_check_gate: {
                required: true,
                pass: false,
                status: "needs_recheck",
                reason: "TestAgent 已通过，但我的完成前抽查有 1 项结果不一致。",
            },
            post_review_spot_check: {
                schema: "ccm-main-agent-post-review-spot-check-v1",
                required: true,
                pass: false,
                status: "needs_recheck",
                executed_count: 2,
                passed_count: 1,
                mismatch_count: 1,
                headline: "TestAgent 已通过，但我的完成前抽查有 1 项结果不一致。",
                next_action: "沿用原复核工作单重新运行 TestAgent，并再次抽查关键验证。",
            },
            post_review_spot_check_summary: {
                schema: "ccm-main-agent-post-review-spot-check-summary-v1",
                title: "完成前抽查",
                status: "needs_recheck",
                status_label: "需复验",
                headline: "TestAgent 已通过，但我的完成前抽查有 1 项结果不一致。",
                rows: ["已抽查 2 项验证，1 项结果一致，1 项不一致"],
                next_action: "沿用原复核工作单重新运行 TestAgent，并再次抽查关键验证。",
            },
        },
    });
    const reply = formatMainAgentCompletionReply({ reply: "已完成。", workchain: group, includeDetails: true });
    const shapedReply = formatMainAgentCompletionReply({ reply: "任务已建立", workchain: group, includeDetails: false });
    const ordinary = buildMainAgentWorkchain({ surface: "global", status: "completed", mode: "conversation", userText: "知识库压缩会按时间和主题整理。", traceId: "trace-3" });
    const ordinaryReply = formatMainAgentCompletionReply({ reply: "知识库压缩会按时间和主题整理。", workchain: ordinary, includeDetails: false });
    const runningTodo = buildMainAgentWorkchain({
        surface: "group",
        status: "running",
        mode: "delegation",
        steps: [
            { id: "read", content: "读取代码上下文", activeForm: "正在读取代码上下文", status: "completed" },
            { id: "edit", content: "修改页面逻辑", activeForm: "正在修改页面逻辑", status: "in_progress" },
            { id: "verify", content: "运行验证", activeForm: "正在运行验证", status: "pending" },
        ],
        summary: { actual_file_changes: [{ path: "src/app.ts" }] },
    });
    const missingVerificationTodo = buildMainAgentWorkchain({
        surface: "group",
        status: "completed",
        mode: "delegation",
        steps: [
            { id: "read", content: "读取代码上下文", activeForm: "正在读取代码上下文", status: "completed" },
            { id: "edit", content: "修改页面逻辑", activeForm: "正在修改页面逻辑", status: "completed" },
            { id: "summarize", content: "整理改动说明", activeForm: "正在整理改动说明", status: "completed" },
        ],
        summary: { actual_file_changes: [{ path: "src/app.ts" }] },
    });
    const incompleteQuality = buildMainAgentWorkchain({
        surface: "group",
        status: "completed",
        mode: "delegation",
        actionIds: ["dispatch_child_agent"],
        userText: "任务已处理。",
    });
    const incompleteQualityReply = formatMainAgentCompletionReply({ reply: "已完成。", workchain: incompleteQuality, includeDetails: true });
    const weakAcceptanceOnly = buildMainAgentWorkchain({
        surface: "group",
        status: "completed",
        mode: "delegation",
        userText: "已完成。",
        summary: {
            actual_file_changes: [{ path: "src/Settings.vue" }],
            acceptance_gate_passed: true,
        },
    });
    const weakAcceptanceOnlyReply = formatMainAgentCompletionReply({ reply: "已完成。", workchain: weakAcceptanceOnly, includeDetails: true });
    const protocolLeak = buildMainAgentWorkchain({
        surface: "group",
        status: "completed",
        mode: "delegation",
        userText: "CCM_AGENT_RECEIPT done raw payload trace_id=abc",
        completion: {
            evidence: ["CCM_AGENT_RECEIPT done raw payload trace_id=abc"],
            verification: ["trace_id raw payload"],
            next_action: "继续查看 raw payload trace_id",
        },
        summary: {
            actual_file_changes: [{ path: "src/app.ts" }],
            verification_executed: ["npm test"],
            acceptance_gate_passed: true,
        },
        rawEvents: [{ type: "child_agent_receipt", status: "ok", message: "CCM_AGENT_RECEIPT raw payload trace_id=abc" }],
    });
    const protocolLeakReply = formatMainAgentCompletionReply({ reply: "已完成。", workchain: protocolLeak, includeDetails: true });
    const legacySummaryReply = formatMainAgentCompletionReply({
        reply: "已完成。",
        includeDetails: true,
        workchain: {
            completion_summary: {
                headline: "CCM_AGENT_RECEIPT done raw payload trace_id=legacy",
                evidence: ["raw payload trace_id=legacy", "src/app.ts"],
                verification: ["session_id=legacy npm test"],
                acceptance: ["CCM_AGENT_RECEIPT done"],
                independent_review: ["task-notification raw payload"],
                risks: ["execution_lease blocked"],
                next_action: "查看 raw payload trace_id",
                final_summary_quality: { required: true },
            },
        },
    });
    const rawLeakQuality = buildFinalSummaryQuality({
        surface: "group",
        status: "completed",
        mode: "delegation",
    }, {
        files: [],
        verification: ["npm test"],
        acceptance: [],
        independentReview: [],
        receipts: 0,
        workersDone: 1,
        evidence: ["trace_id raw payload should fail"],
        risks: [],
    }, true, "已完成", "继续");
    const protectedFailureCopy = sanitizeWorkchainUserText("CCM_AGENT_RECEIPT failed raw payload trace_id=hidden denied");
    const testAgentFailureFallbackCopy = sanitizeTestAgentFailureText(null);
    const checks = {
        protectedFailureCopyUsesInvestigationLanguage: protectedFailureCopy.includes("我会继续排查")
            && protectedFailureCopy.includes("技术详情")
            && !protectedFailureCopy.includes("需要处理")
            && !INTERNAL_TEXT_PATTERN.test(protectedFailureCopy),
        testAgentFailureFallbackUsesGapLanguage: testAgentFailureFallbackCopy.includes("待补齐")
            && !testAgentFailureFallbackCopy.includes("需要处理"),
        simpleHasSummary: simple.user_visible_text.includes("回复已整理给你"),
        groupEvidenceVisible: group.completion_summary.evidence.length >= 5,
        groupCompletionSummaryIncludesReviewEvidence: group.completion_summary.acceptance?.some((item) => item.includes("最终验收已通过"))
            && group.completion_summary.independent_review?.some((item) => item.includes("test-agent"))
            && group.completion_summary.evidence?.some((item) => item.includes("独立复核")),
        finalSummaryQualityRequired: group.completion_summary.final_summary_quality?.required === true && group.completion_summary.final_summary_quality?.passed === true,
        passedPostReviewSpotCheckAllowsCompletion: passedPostReviewSpotCheck.completion_summary.final_summary_quality?.passed === true
            && passedPostReviewSpotCheck.completion_summary.final_summary_quality?.checks?.some((item) => item.id === "post_review_spot_check" && item.passed === true)
            && passedPostReviewSpotCheck.completion_summary.post_review_spot_check_gate_passed === true
            && passedPostReviewSpotCheck.completion_summary.post_review_spot_check_summary?.rows?.some((item) => item.includes("2 项结果一致"))
            && !passedPostReviewSpotCheck.user_visible_text.includes("主 Agent"),
        failedPostReviewSpotCheckBlocksFalseCompletion: failedPostReviewSpotCheck.completion_summary.final_summary_quality?.passed === false
            && failedPostReviewSpotCheck.completion_summary.final_summary_quality?.checks?.some((item) => item.id === "post_review_spot_check" && item.passed === false)
            && failedPostReviewSpotCheck.completion_summary.post_review_spot_check_gate_passed === false
            && failedPostReviewSpotCheck.user_visible_text.includes("不能算完成")
            && failedPostReviewSpotCheck.user_visible_text.includes("完成前抽查")
            && failedPostReviewSpotCheck.completion_summary.next_action?.includes("沿用原复核工作单重新运行 TestAgent")
            && failedPostReviewSpotCheck.todo_plan?.quality_followup_required === true
            && failedPostReviewSpotCheck.todo_plan?.current_step?.id === "quality-followup"
            && !/^已完成/.test(failedPostReviewSpotCheck.user_visible_text || "")
            && !failedPostReviewSpotCheck.user_visible_text.includes("主 Agent"),
        failedReviewBlocksFalseCompletion: failedReview.completion_summary.final_summary_quality?.passed === false
            && failedReview.completion_summary.final_summary_quality?.checks?.some((item) => item.id === "independent_review" && item.passed === false)
            && failedReview.user_visible_text.includes("不能算完成")
            && failedReview.user_visible_text.includes("复核未通过")
            && !/^已完成/.test(failedReview.user_visible_text || ""),
        failedReviewShowsReworkNextAction: failedReview.completion_summary.independent_review?.some((item) => item.includes("需要原实现成员返工"))
            && failedReview.completion_summary.quality_followup?.next_action?.includes("重新运行 TestAgent")
            && failedReview.completion_summary.next_action?.includes("重新运行 TestAgent"),
        failedReviewKeepsTodoActive: failedReview.todo_plan?.quality_followup_required === true
            && failedReview.todo_plan?.current_step?.id === "quality-followup"
            && failedReview.todo_plan?.current_step?.activeForm?.includes("独立复核"),
        testAgentFailureSummaryBlocksFalseCompletion: failedTestAgentSummary.completion_summary.final_summary_quality?.passed === false
            && failedTestAgentSummary.completion_summary.final_summary_quality?.checks?.some((item) => item.id === "independent_review" && item.passed === false)
            && failedTestAgentSummary.user_visible_text.includes("TestAgent 复核未通过")
            && failedTestAgentSummary.user_visible_text.includes("登录恢复浏览器复核")
            && failedTestAgentSummary.completion_summary.independent_review?.some((item) => item.includes("返工重点") && item.includes("浏览器检查"))
            && failedTestAgentSummary.completion_summary.independent_review?.some((item) => item.includes("排查建议") && item.includes("打开失败截图核对页面"))
            && failedTestAgentSummary.completion_summary.next_action?.includes("重新运行 TestAgent")
            && failedTestAgentSummary.todo_plan?.quality_followup_required === true
            && !/^已完成/.test(failedTestAgentSummary.user_visible_text || "")
            && !/test-agent-artifacts|artifact-manifest|report\.md|C:\/tmp|ccm-test-agent-report-v1/i.test(JSON.stringify({
                text: failedTestAgentSummary.user_visible_text,
                review: failedTestAgentSummary.completion_summary.independent_review,
                next: failedTestAgentSummary.completion_summary.next_action,
            })),
        testAgentSummaryOnlyCoverageGapBlocksFalseCompletion: summaryOnlyTestAgentGap.completion_summary.final_summary_quality?.passed === false
            && summaryOnlyTestAgentGap.completion_summary.final_summary_quality?.checks?.some((item) => item.id === "independent_review" && item.passed === false)
            && summaryOnlyTestAgentGap.user_visible_text.includes("TestAgent 复核未通过")
            && summaryOnlyTestAgentGap.user_visible_text.includes("必检项：浏览器流程未覆盖")
            && summaryOnlyTestAgentGap.completion_summary.independent_review?.some((item) => item.includes("返工重点") && item.includes("浏览器流程未覆盖"))
            && summaryOnlyTestAgentGap.completion_summary.next_action?.includes("重新运行 TestAgent")
            && !/^已完成/.test(summaryOnlyTestAgentGap.user_visible_text || ""),
        testAgentWeakAcceptanceSummaryNeedsConfirmation: weakTestAgentAcceptanceSummary.completion_summary.final_summary_quality?.passed === false
            && weakTestAgentAcceptanceSummary.completion_summary.final_summary_quality?.checks?.some((item) => item.id === "independent_review" && item.passed === false)
            && weakTestAgentAcceptanceSummary.user_visible_text.includes("还需要确认")
            && weakTestAgentAcceptanceSummary.user_visible_text.includes("验收证据待确认")
            && weakTestAgentAcceptanceSummary.completion_summary.independent_review?.some((item) => item.includes("证据强度") && item.includes("整体复核结果推断"))
            && weakTestAgentAcceptanceSummary.completion_summary.next_action?.includes("确认或补齐证据")
            && !/fallback|single_criterion_report_status|ccm-test-agent-verdict-v1/i.test(JSON.stringify({
                text: weakTestAgentAcceptanceSummary.user_visible_text,
                review: weakTestAgentAcceptanceSummary.completion_summary.independent_review,
                next: weakTestAgentAcceptanceSummary.completion_summary.next_action,
            })),
        testAgentFailedBrowserFlowBlocksFalseCompletion: failedBrowserFlowSummary.completion_summary.final_summary_quality?.passed === false
            && failedBrowserFlowSummary.user_visible_text.includes("TestAgent 真实浏览器验收未通过")
            && failedBrowserFlowSummary.completion_summary.independent_review?.some((item) => item.includes("真实浏览器验收") && item.includes("1 个未通过"))
            && failedBrowserFlowSummary.completion_summary.independent_review?.some((item) => item.includes("弹窗流程") && item.includes("未通过"))
            && !/acceptance_popup_flow|raw locator|ccm-test-agent/i.test(JSON.stringify({
                text: failedBrowserFlowSummary.user_visible_text,
                review: failedBrowserFlowSummary.completion_summary.independent_review,
            })),
        testAgentFailedMultiSessionBrowserBlocksFalseCompletion: failedMultiSessionBrowserSummary.completion_summary.final_summary_quality?.passed === false
            && failedMultiSessionBrowserSummary.user_visible_text.includes("TestAgent 多人协作浏览器验收未通过")
            && failedMultiSessionBrowserSummary.completion_summary.independent_review?.some((item) => item.includes("多人协作浏览器验收") && item.includes("1 个未通过"))
            && failedMultiSessionBrowserSummary.completion_summary.independent_review?.some((item) => item.includes("观察方") && item.includes("未通过"))
            && failedMultiSessionBrowserSummary.completion_summary.next_action?.includes("重新运行 TestAgent")
            && !/^已完成/.test(failedMultiSessionBrowserSummary.user_visible_text || "")
            && !/session:observer|#raw-observer|locator|browserMultiSessionSummary|ccm-test-agent/i.test(JSON.stringify({
                text: failedMultiSessionBrowserSummary.user_visible_text,
                review: failedMultiSessionBrowserSummary.completion_summary.independent_review,
                next: failedMultiSessionBrowserSummary.completion_summary.next_action,
            })),
        testAgentFailedAuthenticationBlocksLegacyPass: failedBrowserAuthenticationSummary.completion_summary.final_summary_quality?.passed === false
            && failedBrowserAuthenticationSummary.user_visible_text.includes("TestAgent 登录态浏览器验收未通过")
            && failedBrowserAuthenticationSummary.completion_summary.independent_review?.some((item) => item.includes("登录态浏览器验收") && item.includes("1 项未通过"))
            && failedBrowserAuthenticationSummary.completion_summary.next_action?.includes("重新运行 TestAgent")
            && failedBrowserAuthenticationSummary.todo_plan?.quality_followup_required === true
            && !/^已完成/.test(failedBrowserAuthenticationSummary.user_visible_text || "")
            && !/PRIVATE_LOGIN_EMAIL|PRIVATE_LOGIN_PASSWORD|credentialEnvNames|storageState|cookie|token|sha/i.test(JSON.stringify({
                text: failedBrowserAuthenticationSummary.user_visible_text,
                review: failedBrowserAuthenticationSummary.completion_summary.independent_review,
                next: failedBrowserAuthenticationSummary.completion_summary.next_action,
            })),
        testAgentBlockedAuthenticationNeedsConfirmation: blockedBrowserAuthenticationSummary.completion_summary.final_summary_quality?.passed === false
            && blockedBrowserAuthenticationSummary.user_visible_text.includes("还需要确认")
            && blockedBrowserAuthenticationSummary.completion_summary.independent_review?.some((item) => item.includes("测试账号或登录条件"))
            && blockedBrowserAuthenticationSummary.completion_summary.next_action?.includes("确认")
            && blockedBrowserAuthenticationSummary.todo_plan?.quality_followup_required === true
            && !/^已完成/.test(blockedBrowserAuthenticationSummary.user_visible_text || "")
            && !/PRIVATE_LOGIN_EMAIL|PRIVATE_LOGIN_PASSWORD|credentialEnvNames|storageState|cookie|token|sha/i.test(JSON.stringify({
                text: blockedBrowserAuthenticationSummary.user_visible_text,
                review: blockedBrowserAuthenticationSummary.completion_summary.independent_review,
                next: blockedBrowserAuthenticationSummary.completion_summary.next_action,
            })),
        testAgentFailedActionEffectAndAdversarialEvidenceBlockLegacyPass: failedActionEffectAndAdversarialSummary.completion_summary.final_summary_quality?.passed === false
            && failedActionEffectAndAdversarialSummary.user_visible_text.includes("TestAgent 操作结果验证未通过")
            && failedActionEffectAndAdversarialSummary.completion_summary.independent_review?.some((item) => item.includes("操作结果验证") && item.includes("没有产生可见效果"))
            && failedActionEffectAndAdversarialSummary.completion_summary.independent_review?.some((item) => item.includes("边界与异常验证") && item.includes("未通过"))
            && failedActionEffectAndAdversarialSummary.completion_summary.next_action?.includes("原实现成员修复")
            && !/^已完成/.test(failedActionEffectAndAdversarialSummary.user_visible_text || "")
            && !/127\.0\.0\.1|token=hidden|duplicate_submit|playwright|changedSignals/i.test(JSON.stringify({
                text: failedActionEffectAndAdversarialSummary.user_visible_text,
                review: failedActionEffectAndAdversarialSummary.completion_summary.independent_review,
                next: failedActionEffectAndAdversarialSummary.completion_summary.next_action,
            })),
        testAgentIncompleteLatestEvidenceRequiresRecheckWithoutImplementationRework: needsRecheckLatestEvidenceSummary.completion_summary.final_summary_quality?.passed === false
            && needsRecheckLatestEvidenceSummary.user_visible_text.includes("TestAgent 复核需要重新验证")
            && needsRecheckLatestEvidenceSummary.completion_summary.independent_review?.some((item) => item.includes("暂时无法确认页面效果"))
            && needsRecheckLatestEvidenceSummary.completion_summary.independent_review?.some((item) => item.includes("不代表实现失败"))
            && needsRecheckLatestEvidenceSummary.completion_summary.independent_review?.some((item) => item.includes("TestAgent 工作单"))
            && needsRecheckLatestEvidenceSummary.completion_summary.next_action?.includes("重新运行 TestAgent")
            && needsRecheckLatestEvidenceSummary.completion_summary.next_action?.includes("不要直接要求原实现成员返工")
            && needsRecheckLatestEvidenceSummary.todo_plan?.quality_followup_required === true
            && !/^已完成/.test(needsRecheckLatestEvidenceSummary.user_visible_text || "")
            && !/hidden-session|unsafe duplicate side effect|sessionId|actionTypes|changedSignals|playwright/i.test(JSON.stringify({
                text: needsRecheckLatestEvidenceSummary.user_visible_text,
                review: needsRecheckLatestEvidenceSummary.completion_summary.independent_review,
                next: needsRecheckLatestEvidenceSummary.completion_summary.next_action,
            })),
        workchainQualityRequiresProtocolSanitizer: group.completion_summary.final_summary_quality?.checks?.some((item) => item.id === "user_visible_protocol_sanitized" && item.passed === true)
            && protocolLeak.completion_summary.final_summary_quality?.checks?.some((item) => item.id === "user_visible_protocol_sanitized" && item.passed === true),
        workchainVisibleProtocolLeakSanitized: !WORKCHAIN_USER_VISIBLE_PROTOCOL_PATTERN.test(protocolLeak.user_visible_text)
            && !WORKCHAIN_USER_VISIBLE_PROTOCOL_PATTERN.test(protocolLeakReply)
            && !WORKCHAIN_USER_VISIBLE_PROTOCOL_PATTERN.test(collectWorkchainVisibleQualityText([
                protocolLeak.completion_summary.evidence,
                protocolLeak.completion_summary.verification,
                protocolLeak.completion_summary.risks,
                protocolLeak.completion_summary.next_action,
                protocolLeak.todo_plan?.visible_steps || [],
                protocolLeak.progress_checkpoints?.items || [],
            ]).join("\n")),
        legacyCompletionReplySanitizesVisibleSummary: !WORKCHAIN_USER_VISIBLE_PROTOCOL_PATTERN.test(legacySummaryReply)
            && legacySummaryReply.includes("处理总结")
            && legacySummaryReply.includes("技术详情")
            && legacySummaryReply.includes("src/app.ts"),
        workchainQualityGateCatchesRawVisibleProtocol: rawLeakQuality.passed === false
            && rawLeakQuality.checks?.some((item) => item.id === "user_visible_protocol_sanitized" && item.passed === false),
        technicalCollapsedPolicy: group.display_policy.technical_default_collapsed === true,
        noInternalLeakInUserText: !INTERNAL_TEXT_PATTERN.test(group.user_visible_text),
        replyHasSummary: reply.includes("处理总结") && reply.includes("修改文件"),
        shapedReplyAddsRequiredSections: shapedReply.includes("处理总结") && shapedReply.includes("验证与验收") && shapedReply.includes("需要留意") && shapedReply.includes("下一步"),
        shapedReplyIncludesReviewAndAcceptance: shapedReply.includes("复核与验收") && shapedReply.includes("test-agent") && shapedReply.includes("最终验收已通过"),
        shapedReplyHidesTechnicalBlockers: !INTERNAL_TEXT_PATTERN.test(shapedReply) && shapedReply.includes("排障信息已放入技术详情"),
        ordinaryReplyStaysPlain: ordinaryReply === "知识库压缩会按时间和主题整理。" && !ordinaryReply.includes("处理总结"),
        ordinaryTodoHiddenByPolicy: ordinary.todo_plan?.display_policy?.hide_for_ordinary_conversation === true,
        workchainTodoPlanCarriesCcStyleForms: group.todo_plan?.schema === "ccm-main-agent-workchain-todo-v1"
            && group.todo_plan?.steps?.length >= 5
            && group.todo_plan.steps.every((step) => step.content && step.activeForm && step.active_form)
            && group.todo_plan.display_policy?.quiet_completed === true
            && group.todo_plan.display_policy?.archive_completed_todo === true
            && group.todo_plan.visible_steps?.length === 0
            && group.todo_plan.archive_summary?.includes("主视图只保留最终总结"),
        workchainTodoPlanHasSingleActiveStep: runningTodo.todo_plan?.steps?.filter((step) => step.status === "in_progress").length === 1
            && runningTodo.todo_plan?.current_step?.id === "edit",
        workchainTodoVerificationNudge: missingVerificationTodo.todo_plan?.verification_reminder?.schema === "ccm-main-agent-plan-verification-reminder-v1"
            && missingVerificationTodo.todo_plan?.verification_nudge === true
            && missingVerificationTodo.todo_plan?.verification_reminder?.headline.includes("专门的验证/验收步骤")
            && missingVerificationTodo.todo_plan?.display_policy?.archive_completed_todo === false,
        workchainQualityFailureCreatesUserFollowup: incompleteQuality.completion_summary.final_summary_quality?.passed === false
            && incompleteQuality.completion_summary.quality_followup?.schema === "ccm-main-agent-quality-followup-v1"
            && incompleteQuality.completion_summary.quality_followup?.missing?.includes("交付证据")
            && incompleteQuality.completion_summary.next_action?.includes("先补齐交付证据"),
        workchainQualityFailureUserTextAvoidsFalseDone: incompleteQuality.user_visible_text?.includes("最终交付总结还在补齐")
            && incompleteQuality.completion_summary.headline?.includes("最终交付总结还在补齐")
            && !/^任务已处理。?$/.test(incompleteQuality.user_visible_text || "")
            && incompleteQualityReply.startsWith("任务已有处理结果，但最终交付总结还在补齐"),
        workchainQualityFailureKeepsTodoActive: incompleteQuality.todo_plan?.quality_followup_required === true
            && incompleteQuality.todo_plan?.current_step?.id === "quality-followup"
            && incompleteQuality.todo_plan?.current_step?.activeForm?.includes("正在补齐交付证据")
            && incompleteQuality.todo_plan?.display_policy?.archive_completed_todo === false
            && incompleteQuality.progress_checkpoints?.items?.some((item) => item.id === "quality-followup-checkpoint" && item.status === "active"),
        workchainQualityFailureReplyShowsMissingItems: incompleteQualityReply.includes("还需补齐")
            && incompleteQualityReply.includes("交付证据")
            && incompleteQualityReply.includes("先补齐交付证据"),
        workchainGenericCompletionFallbackAvoidsFalseDone: simple.user_visible_text === "回复已整理给你。"
            && !simple.user_visible_text.includes("已完成本轮处理")
            && !incompleteQualityReply.includes("我已完成本轮处理"),
        workchainWeakAcceptanceOnlyBlocksFalseCompletion: weakAcceptanceOnly.completion_summary.final_summary_quality?.passed === false
            && weakAcceptanceOnly.completion_summary.final_summary_quality?.checks?.some((item) => item.id === "verification" && item.passed === false)
            && weakAcceptanceOnly.completion_summary.verification_status?.includes("没有捕获到实际验证")
            && weakAcceptanceOnly.completion_summary.quality_followup?.missing?.includes("验证或验收")
            && weakAcceptanceOnly.completion_summary.next_action?.includes("先补齐验证或验收")
            && weakAcceptanceOnly.todo_plan?.quality_followup_required === true
            && weakAcceptanceOnly.todo_plan?.current_step?.id === "quality-followup"
            && weakAcceptanceOnly.user_visible_text?.includes("最终交付总结还在补齐")
            && !/^已完成/.test(weakAcceptanceOnly.user_visible_text || "")
            && weakAcceptanceOnlyReply.includes("还需补齐")
            && weakAcceptanceOnlyReply.includes("验证或验收"),
        traceInTechnical: group.technical_details.some(section => section.items.some((item) => item.label === "Trace" && item.value === "trace-2")),
        progressCheckpointsVisible: group.progress_checkpoints?.schema === "ccm-main-agent-progress-checkpoints-v1" && group.progress_checkpoints.items.length > 0,
        progressCheckpointsHideRawProtocol: !INTERNAL_TEXT_PATTERN.test(JSON.stringify(group.progress_checkpoints.items)),
    };
    return { pass: Object.values(checks).every(Boolean), checks, simple, group, failedTestAgentSummary, summaryOnlyTestAgentGap, weakTestAgentAcceptanceSummary, passedPostReviewSpotCheck, failedPostReviewSpotCheck, reply, shapedReply, ordinaryReply, runningTodo, missingVerificationTodo, incompleteQuality, incompleteQualityReply, protocolLeak, protocolLeakReply, legacySummaryReply, rawLeakQuality };
}
//# sourceMappingURL=workchain.js.map