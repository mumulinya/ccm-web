// Behavior-freeze split from workchain-part-01.ts (part 1/2).

// Behavior-freeze split from workchain.ts (part 1/2).
import {
  sanitizeMainAgentRoleLanguage,
  sanitizeUserFacingProtocolTerms,
  sanitizeUserFacingTerminology,
} from "./user-facing-text";
import {
  summarizeTestAgentAdversarialEvidence,
  summarizeTestAgentBrowserActionEffects,
  summarizeTestAgentBrowserAuthentication,
  summarizeTestAgentBrowserFlows,
  summarizeTestAgentBrowserRecovery,
  summarizeTestAgentMultiSessionBrowser,
} from "./test-agent-review-bridge";
import { buildPostReviewSpotCheckSummary } from "./post-review-spot-check";

export const INTERNAL_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|scratchpad|trace_id|session_ids|session_id|run_id|native_session|task_agent_session|shouldDelegate|Runtime Kernel|Coordinator|Pipeline|Trace Replay|WorkerContextPacket|task-notification|receipt[-_\s]*status|raw[_\s-]*payload|回执要求|任务级原生会话|execution_lease|workchain/i;
export const WORKCHAIN_USER_VISIBLE_PROTOCOL_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|scratchpad|trace_id|session_ids|session_id|run_id|native_session|task_agent_session|shouldDelegate|Runtime Kernel|Trace Replay|WorkerContextPacket|task-notification|receipt[-_\s]*status|raw[_\s-]*payload|回执要求|任务级原生会话|execution_lease/i;
export const GENERIC_COMPLETION_REPLY_PATTERN = /^(已处理|已完成|完成|ok|done|全局 Agent 已完成本轮处理|任务已建立|任务已派发|已派发|执行完成)[。.!！]?$/i;

export type MainAgentWorkchainSurface = "group" | "global";

export interface MainAgentWorkchainInput {
  surface: MainAgentWorkchainSurface;
  mode?: string;
  status?: string;
  phase?: string;
  userText?: any;
  goal?: any;
  actionIds?: any[];
  steps?: any[];
  workers?: any[];
  executions?: any[];
  summary?: any;
  completion?: any;
  technical?: any;
  traceId?: string;
  taskId?: string;
  runId?: string;
  missionId?: string;
  supervisorId?: string;
  rawEvents?: any[];
}

export function compactText(value: any, max = 240) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export function compactMultilineText(value: any, max = 240) {
  const text = String(value || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(line => line.replace(/[\t\f\v ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export function sanitizeWorkchainTerminology(value: string) {
  return sanitizeMainAgentRoleLanguage(
    sanitizeUserFacingProtocolTerms(
      sanitizeUserFacingTerminology(value),
    ),
  );
}

export function stringList(value: any, limit = 12) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\r?\n|；|;|,/) : [];
  return [...new Set(source.map(item => compactText(item, 220)).filter(Boolean))].slice(0, limit);
}

export function narrativeList(value: any, limit = 12, fallback = "相关技术细节已放入技术详情。") {
  return stringList(value, limit)
    .map(item => sanitizeWorkchainUserText(item, fallback, 260))
    .filter(Boolean);
}

function asList(value: any): any[] {
  return Array.isArray(value) ? value : value === undefined || value === null || value === "" ? [] : [value];
}

function verdictLabel(value: any) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  if (["passed", "pass", "accept", "accepted", "approved", "approve", "done", "ok", "success"].includes(text) || /通过|接受|批准|无阻塞/.test(text)) return "已通过";
  if (["failed", "fail", "rework", "rejected", "reject"].includes(text) || /未通过|失败|返工|拒绝/.test(text)) return "需要返工";
  if (["blocked", "need_human", "needs_human", "human"].includes(text) || /阻塞|人工|确认/.test(text)) return "需要确认";
  if (["missing", "pending", "waiting", "required"].includes(text) || /待|缺|等待/.test(text)) return "待补齐";
  return sanitizeWorkchainUserText(value, "已记录", 80);
}

function scrubWorkchainTestAgentPathText(value: any) {
  return String(value || "")
    .replace(/[A-Za-z]:[\\/][^\s；;，。)）]+/g, "技术详情里的证据文件")
    .replace(/(^|[\s（(])\/[^\s；;，。)）]*(?:test-agent-artifacts|screenshots|browser-artifacts|report\.json|report\.md|verdict\.json|artifact-manifest\.json)[^\s；;，。)）]*/gi, "$1技术详情里的证据文件")
    .replace(/\b(?:report\.json|report\.md|verdict\.json|artifact-manifest\.json)\b/gi, "证据文件");
}

function testAgentFailureTypeLabel(type: any) {
  const value = String(type || "").trim().toLowerCase();
  const labels: Record<string, string> = {
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

export function sanitizeTestAgentFailureText(value: any, fallback = "复核发现待补齐的问题。", max = 220) {
  return sanitizeWorkchainUserText(scrubWorkchainTestAgentPathText(value || fallback), fallback, max);
}

function looksLikeTestAgentFailureItem(item: any) {
  if (!item || typeof item !== "object") return false;
  return !!(item.type || item.title || item.reason || item.nextAction || item.diagnostics);
}

function collectTestAgentFailureItemsFromSource(source: any, depth = 0, seenObjects = new Set<any>()): any[] {
  if (!source || depth > 5) return [];
  if (typeof source !== "object") return [];
  if (seenObjects.has(source)) return [];
  seenObjects.add(source);
  const rows: any[] = [];
  if (Array.isArray(source)) {
    for (const item of source) rows.push(...collectTestAgentFailureItemsFromSource(item, depth + 1, seenObjects));
    return rows;
  }
  const direct = source.failureSummary || source.failure_summary;
  if (Array.isArray(direct)) rows.push(...direct.filter(looksLikeTestAgentFailureItem));
  const verdict = source.verdict || source.testAgentVerdict || source.test_agent_verdict;
  if (verdict && typeof verdict === "object") {
    const verdictFailures = verdict.failureSummary || verdict.failure_summary;
    if (Array.isArray(verdictFailures)) rows.push(...verdictFailures.filter(looksLikeTestAgentFailureItem));
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
    if (source[key]) rows.push(...collectTestAgentFailureItemsFromSource(source[key], depth + 1, seenObjects));
  }
  return rows;
}

function collectTestAgentFailureItems(input: MainAgentWorkchainInput) {
  const summary = input.summary || {};
  const completion = input.completion || {};
  const technical = input.technical || {};
  const rows = [
    ...collectTestAgentFailureItemsFromSource(summary),
    ...collectTestAgentFailureItemsFromSource(completion),
    ...collectTestAgentFailureItemsFromSource(technical),
  ];
  const seen = new Set<string>();
  const result: any[] = [];
  for (const item of rows) {
    const key = [
      item?.type || "",
      item?.project || "",
      item?.title || "",
      item?.reason || "",
      item?.nextAction || "",
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result.slice(0, 8);
}

function testAgentFailureNeedsRework(item: any) {
  return /failed|fail|not_verified|rework|未通过|失败|返工/i.test(String(item?.status || item?.result || item?.recommendation || item?.reason || ""));
}

function testAgentFailureNeedsUser(item: any) {
  return /blocked|unknown|need_human|needs_human|manual|人工|确认|待确认|阻塞/i.test(String(item?.status || item?.result || item?.recommendation || item?.reason || ""));
}

function summarizeTestAgentFailureItem(item: any) {
  const type = testAgentFailureTypeLabel(item?.type);
  const project = sanitizeTestAgentFailureText(item?.project, "", 70);
  const title = sanitizeTestAgentFailureText(item?.title || item?.reason, "复核发现问题", 100);
  const reason = sanitizeTestAgentFailureText(item?.reason || item?.status, "需要补齐或修复后再验收。", 160);
  const prefix = project ? `${project}：${type}` : type;
  return `${prefix}「${title}」未通过：${reason}`;
}

function summarizeTestAgentDiagnosticItem(item: any) {
  const diagnostics = Array.isArray(item?.diagnostics) ? item.diagnostics : [];
  const nextActions = item?.nextAction ? [item.nextAction] : [];
  const first = [...diagnostics, ...nextActions]
    .map(value => sanitizeTestAgentFailureText(value, "", 180))
    .find(Boolean);
  if (!first) return "";
  const title = sanitizeTestAgentFailureText(item?.title || item?.type, "该问题", 70);
  return `${title}：${first}`;
}

function collectTestAgentFailureSummary(input: MainAgentWorkchainInput) {
  const items = collectTestAgentFailureItems(input);
  const failureLines = [...new Set(items.map(summarizeTestAgentFailureItem).filter(Boolean))].slice(0, 5);
  const diagnosticLines = [...new Set(items.map(summarizeTestAgentDiagnosticItem).filter(Boolean))].slice(0, 4);
  const hasRework = items.some(testAgentFailureNeedsRework);
  const hasNeedsUser = items.some(testAgentFailureNeedsUser);
  const primaryLine = failureLines[0] || "";
  return { items, failureLines, diagnosticLines, hasRework, hasNeedsUser, primaryLine };
}

function collectTestAgentReviewSourcesFromSource(source: any, depth = 0, seenObjects = new Set<any>()): any[] {
  if (!source || depth > 5 || typeof source !== "object") return [];
  if (seenObjects.has(source)) return [];
  seenObjects.add(source);
  if (Array.isArray(source)) {
    return source.flatMap(item => collectTestAgentReviewSourcesFromSource(item, depth + 1, seenObjects));
  }
  const rows: any[] = [];
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
    || source.unknownAcceptanceCriteria
    || (Array.isArray(source.browserProviderGaps) && source.browserProviderGaps.length > 0)
    || (Array.isArray(source.browser_provider_gaps) && source.browser_provider_gaps.length > 0);
  if (hasReviewPayload) rows.push(source);
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
    if (source[key]) rows.push(...collectTestAgentReviewSourcesFromSource(source[key], depth + 1, seenObjects));
  }
  return rows;
}

function collectTestAgentReviewSources(input: MainAgentWorkchainInput) {
  const rows = [
    ...collectTestAgentReviewSourcesFromSource(input.summary),
    ...collectTestAgentReviewSourcesFromSource(input.completion),
    ...collectTestAgentReviewSourcesFromSource(input.technical),
    ...collectTestAgentReviewSourcesFromSource(input.rawEvents),
  ];
  const seen = new Set<string>();
  const result: any[] = [];
  for (const item of rows) {
    const key = [
      item?.schema || "",
      item?.id || item?.reportId || "",
      item?.workOrderId || item?.work_order_id || "",
      item?.status || "",
      item?.recommendation || "",
      JSON.stringify(
        item?.requiredCheckSummary
        || item?.acceptanceSummary
        || item?.browserAuthenticationSummary
        || item?.metadata?.browserAuthenticationSummary
        || item?.browserActionEffectSummary
        || item?.browserRecoverySummary
        || item?.adversarialEvidenceSummary
        || item?.failedRequiredChecks
        || item?.failedAcceptanceCriteria
        || ""
      ).slice(0, 180),
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result.slice(0, 12);
}

function testAgentCoverageItemKey(item: any = {}) {
  const evidence = Array.isArray(item.evidence) ? item.evidence.join("|") : "";
  return [item.check || item.criterion || "", item.status || "", item.missingReason || "", evidence].join("|") || JSON.stringify(item || {});
}

function uniqueTestAgentCoverageItems(...lists: any[]) {
  const seen = new Set<string>();
  const result: any[] = [];
  for (const list of lists) {
    for (const item of asList(list)) {
      if (!item || typeof item !== "object") continue;
      const key = testAgentCoverageItemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function testAgentCoverageLabel(type: any) {
  const value = String(type || "").trim().toLowerCase();
  const labels: Record<string, string> = {
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

function testAgentSummaryItems(summary: any, key: string, fallbackStatus: string) {
  return asList(summary?.[key]).map((item: any) => ({ ...item, status: item?.status || fallbackStatus }));
}

function collectTestAgentSummaryItems(source: any, kind: "required" | "acceptance", status: "not_verified" | "unknown") {
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

function collectTestAgentCoverageByStatusFromSource(source: any, kind: "required" | "acceptance", status: "not_verified" | "unknown") {
  const coverageKey = kind === "required" ? "requiredCheckCoverage" : "acceptanceCoverage";
  const coverageSnakeKey = kind === "required" ? "required_check_coverage" : "acceptance_coverage";
  const verdictList = kind === "required"
    ? status === "not_verified" ? source?.failedRequiredChecks : source?.unknownRequiredChecks
    : status === "not_verified" ? source?.failedAcceptanceCriteria : source?.unknownAcceptanceCriteria;
  return uniqueTestAgentCoverageItems(
    verdictList,
    asList(source?.[coverageKey]).filter((item: any) => item?.status === status),
    asList(source?.[coverageSnakeKey]).filter((item: any) => item?.status === status),
    collectTestAgentSummaryItems(source, kind, status),
  );
}

function summarizeTestAgentCoverageGap(item: any, kind: "required" | "acceptance", state: "failed" | "unknown") {
  if (kind === "required") {
    const reason = item?.missingReason ? `：${sanitizeTestAgentFailureText(item.missingReason, "", 140)}` : "";
    return `必检项：${testAgentCoverageLabel(item?.check)}${state === "failed" ? "未覆盖" : "待确认"}${reason}`;
  }
  const criterion = sanitizeTestAgentFailureText(item?.criterion || "未命名验收条件", "未命名验收条件", 180);
  return `验收条件${state === "failed" ? "未通过" : "待确认"}：${criterion}`;
}

function testAgentAcceptanceWeakReason(item: any) {
  const strength = String(item?.matchStrength || item?.match_strength || "").toLowerCase();
  const source = String(item?.evidenceSource || item?.evidence_source || "").toLowerCase();
  const evidence = asList(item?.evidence).filter(Boolean);
  if (strength === "fallback" || source === "single_criterion_report_status") return "只是从整体复核结果推断，建议补一条直接验证证据";
  if (strength === "none" || source === "none") return "缺少可直接对应到该验收条件的证据";
  if (!evidence.length && (strength || source)) return "缺少可展示的验收证据样本";
  return "";
}

function collectTestAgentWeakAcceptanceItemsFromSource(source: any) {
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
  ].filter((item: any) => item?.status === "verified");
  return uniqueTestAgentCoverageItems(summaryItems, coverageItems)
    .filter((item: any) => !!testAgentAcceptanceWeakReason(item));
}

function collectTestAgentCoverageSummary(input: MainAgentWorkchainInput) {
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
  const weakLines = weakAcceptance.map((item: any) => {
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

function collectTestAgentBrowserFlowSummary(input: MainAgentWorkchainInput) {
  const summaries = collectTestAgentReviewSources(input)
    .map(source => summarizeTestAgentBrowserFlows(source))
    .filter(Boolean) as NonNullable<ReturnType<typeof summarizeTestAgentBrowserFlows>>[];
  return {
    summaries,
    evidenceLines: [...new Set(summaries.flatMap(item => item.evidenceLines))].slice(0, 8),
    failedLines: [...new Set(summaries.flatMap(item => item.failedLines))].slice(0, 6),
    incompleteLines: [...new Set(summaries.flatMap(item => item.incompleteLines))].slice(0, 6),
  };
}

function collectTestAgentBrowserMultiSessionSummary(input: MainAgentWorkchainInput) {
  const summaries = collectTestAgentReviewSources(input)
    .map(source => summarizeTestAgentMultiSessionBrowser(source))
    .filter(Boolean) as NonNullable<ReturnType<typeof summarizeTestAgentMultiSessionBrowser>>[];
  return {
    summaries,
    evidenceLines: [...new Set(summaries.flatMap(item => item.evidenceLines))].slice(0, 8),
    failedLines: [...new Set(summaries.flatMap(item => item.failedLines))].slice(0, 6),
    incompleteLines: [...new Set(summaries.flatMap(item => item.incompleteLines))].slice(0, 6),
  };
}

function collectTestAgentBrowserAuthenticationSummary(input: MainAgentWorkchainInput) {
  const summaries = collectTestAgentReviewSources(input)
    .map(source => summarizeTestAgentBrowserAuthentication(source))
    .filter(Boolean) as NonNullable<ReturnType<typeof summarizeTestAgentBrowserAuthentication>>[];
  return {
    summaries,
    evidenceLines: [...new Set(summaries.flatMap(item => item.evidenceLines))].slice(0, 6),
    failedLines: [...new Set(summaries.flatMap(item => item.failedLines))].slice(0, 4),
    incompleteLines: [...new Set(summaries.flatMap(item => item.incompleteLines))].slice(0, 4),
  };
}

function collectTestAgentBrowserActionEffectSummary(input: MainAgentWorkchainInput) {
  const summaries = collectTestAgentReviewSources(input)
    .map(source => summarizeTestAgentBrowserActionEffects(source))
    .filter(Boolean) as NonNullable<ReturnType<typeof summarizeTestAgentBrowserActionEffects>>[];
  return {
    summaries,
    evidenceLines: [...new Set(summaries.flatMap(item => item.evidenceLines))].slice(0, 8),
    failedLines: [...new Set(summaries.flatMap(item => item.failedLines))].slice(0, 6),
    recheckLines: [...new Set(summaries.flatMap(item => item.recheckLines))].slice(0, 6),
  };
}

function collectTestAgentBrowserRecoverySummary(input: MainAgentWorkchainInput) {
  const summaries = collectTestAgentReviewSources(input)
    .map(source => summarizeTestAgentBrowserRecovery(source))
    .filter(Boolean) as NonNullable<ReturnType<typeof summarizeTestAgentBrowserRecovery>>[];
  return {
    summaries,
    evidenceLines: [...new Set(summaries.flatMap(item => item.evidenceLines))].slice(0, 8),
    recheckLines: [...new Set(summaries.flatMap(item => item.recheckLines))].slice(0, 6),
  };
}

function collectTestAgentBrowserProviderGapsSummary(input: MainAgentWorkchainInput) {
  const { summarizeTestAgentBrowserProviderGaps } = require("../modules/collaboration/test-agent-independent-review-decision");
  const lines: string[] = [];
  let count = 0;
  for (const source of collectTestAgentReviewSources(input)) {
    const gaps = summarizeTestAgentBrowserProviderGaps(source, source?.verdict || source);
    count += Number(gaps.count || 0);
    for (const line of gaps.lines || []) {
      if (line && !lines.includes(line)) lines.push(line);
    }
  }
  return {
    count,
    lines: lines.slice(0, 8),
    hasGaps: count > 0 || lines.length > 0,
    recheckLines: lines.slice(0, 8).map(line => `浏览器 Provider 能力缺口：${line}`),
  };
}

function collectTestAgentAdversarialEvidenceSummary(input: MainAgentWorkchainInput) {
  const summaries = collectTestAgentReviewSources(input)
    .map(source => summarizeTestAgentAdversarialEvidence(source))
    .filter(Boolean) as NonNullable<ReturnType<typeof summarizeTestAgentAdversarialEvidence>>[];
  return {
    summaries,
    evidenceLines: [...new Set(summaries.flatMap(item => item.evidenceLines))].slice(0, 8),
    failedLines: [...new Set(summaries.flatMap(item => item.failedLines))].slice(0, 6),
    recheckLines: [...new Set(summaries.flatMap(item => item.recheckLines))].slice(0, 6),
    blockedLines: [...new Set(summaries.flatMap(item => item.blockedLines))].slice(0, 6),
  };
}

function formatReviewEvidence(item: any) {
  if (!item) return "";
  if (typeof item === "string") return sanitizeWorkchainUserText(item, "", 260);
  if (typeof item !== "object") return sanitizeWorkchainUserText(item, "", 260);
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

function collectReceiptReviewEvidence(receipts: any[] = []) {
  const rows: string[] = [];
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

export function getIndependentReviewGateState(input: MainAgentWorkchainInput) {
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
  const testAgentBrowserProviderGaps = collectTestAgentBrowserProviderGapsSummary(input);
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
    || testAgentAdversarialEvidence.summaries.length > 0
    || testAgentBrowserProviderGaps.hasGaps;
  const hasCoverageFailure = testAgentCoverage.failedLines.length > 0
    || testAgentBrowserFlows.failedLines.length > 0
    || testAgentMultiSessionBrowser.failedLines.length > 0
    || testAgentBrowserAuthentication.failedLines.length > 0
    || testAgentBrowserActionEffects.failedLines.length > 0
    || testAgentAdversarialEvidence.failedLines.length > 0;
  const flakyStabilityGroups = Number(
    summary?.test_agent_report?.browserStabilitySummary?.statusCounts?.flaky
    || summary?.test_agent_verdict?.evidenceSummary?.browserFlakyStabilityGroups
    || deliveryReport?.test_agent_report?.browserStabilitySummary?.statusCounts?.flaky
    || 0,
  );
  const hasCoverageNeedsRecheck = testAgentBrowserActionEffects.recheckLines.length > 0
    || testAgentBrowserRecovery.recheckLines.length > 0
    || testAgentAdversarialEvidence.recheckLines.length > 0
    || testAgentBrowserProviderGaps.hasGaps
    || flakyStabilityGroups > 0;
  const hasCoverageEnvironment = testAgentAdversarialEvidence.blockedLines.length > 0
    || testAgentBrowserAuthentication.incompleteLines.length > 0;
  const hasCoverageNeedsUser = testAgentCoverage.unknownLines.length > 0
    || testAgentCoverage.weakLines.length > 0
    || testAgentBrowserFlows.incompleteLines.length > 0
    || testAgentMultiSessionBrowser.incompleteLines.length > 0;
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
  const failed = required && !passed && (
    gate.status === "failed"
    || Number(gate.failed_count || gate.failedCount || 0) > 0
    || failedEvidence.length > 0
    || testAgentFailures.hasRework
    || hasCoverageFailure
  );
  const firstFailure = failedEvidence.find((item: any) => item && typeof item === "object") || {};
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
  const providerGapRecheckText = testAgentBrowserProviderGaps.recheckLines[0] || "";
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
  const needsUser = required && !passed && !failed && (
    hasCoverageNeedsUser
    || !!coverageNeedsUserText
    || !!browserFlowNeedsUserText
    || !!multiSessionNeedsUserText
  );
  const needsRecheck = required && !passed && !failed && hasCoverageNeedsRecheck;
  const needsEnvironment = required && !passed && !failed && !needsRecheck && (
    hasCoverageEnvironment
    || !!authenticationNeedsUserText
  );
  const visiblePendingText = providerGapRecheckText
    || actionEffectRecheckText
    || recoveryRecheckText
    || adversarialRecheckText
    || adversarialEnvironmentText
    || authenticationNeedsUserText
    || coverageNeedsUserText
    || browserFlowNeedsUserText
    || multiSessionNeedsUserText;
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
    testAgentBrowserProviderGaps,
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
        ? (testAgentBrowserProviderGaps.hasGaps
          ? "检测到浏览器 Provider 能力缺口：请改走 Playwright 后重新运行 TestAgent；不要把 MCP/Computer Use 假绿当成验收通过。"
          : "先补齐可观察结果、会话恢复或目标关联的边界检查，再重新运行 TestAgent；不要直接要求原实现成员返工。")
        : needsEnvironment
          ? "先补齐环境、登录或运行条件，再继续 TestAgent 复核和最终总结。"
      : needsUser
        ? "先补齐或确认 TestAgent 标记的待确认验收项，再继续最终总结。"
        : "",
    needsRecheck,
    needsEnvironment,
  };
}

export function getPostReviewSpotCheckState(input: MainAgentWorkchainInput) {
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
    || buildPostReviewSpotCheckSummary(spotCheck);
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
  const failedText = sanitizeWorkchainUserText(
    visibleSummary?.headline || spotCheck?.headline || gate.reason || "",
    failed ? "TestAgent 已通过，但我的完成前抽查尚未一致。" : "",
    260
  );
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
    nextAction: sanitizeWorkchainUserText(
      visibleSummary?.next_action || visibleSummary?.nextAction || spotCheck?.next_action || spotCheck?.nextAction || "",
      failed
        ? "沿用原复核工作单重新运行 TestAgent，并再次抽查关键验证。"
        : needsUser
          ? "确认或补齐抽查条件后再继续最终验收。"
          : "",
      260
    ),
  };
}

function formatAcceptanceEvidence(item: any) {
  if (!item) return "";
  if (typeof item === "string") return sanitizeWorkchainUserText(item, "", 240);
  if (typeof item !== "object") return sanitizeWorkchainUserText(item, "", 240);
  const label = sanitizeWorkchainUserText(item.label || item.title || item.id || item.criterion || "验收项", "验收项", 100);
  const ok = item.ok === true || item.passed === true || /passed|verified|ok|success|通过/i.test(String(item.status || item.result || ""));
  const failed = item.ok === false || item.passed === false || /failed|not_verified|fail|未通过|失败/i.test(String(item.status || item.result || ""));
  const state = ok ? "已通过" : failed ? "未通过" : verdictLabel(item.status || item.result) || "已记录";
  const detail = sanitizeWorkchainUserText(item.detail || item.summary || item.reason || "", "", 140);
  return sanitizeWorkchainUserText(`${label}：${state}${detail ? `（${detail}` : ""}${detail ? "）" : ""}`, "", 260);
}

export function collectAcceptanceEvidence(input: MainAgentWorkchainInput) {
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

export function collectIndependentReviewEvidence(input: MainAgentWorkchainInput) {
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
  const testAgentBrowserProviderGaps = gateState.testAgentBrowserProviderGaps || collectTestAgentBrowserProviderGapsSummary(input);
  return stringList([
    ...asList(deliveryReport.independent_review || deliveryReport.independentReview),
    ...asList(summary.independent_review || summary.independentReview),
    ...asList(summary.independent_review_evidence || summary.independentReviewEvidence).map(formatReviewEvidence),
    ...asList(gate.evidence).map(formatReviewEvidence),
    ...asList(gate.failed_evidence || gate.failedEvidence).map(formatReviewEvidence),
    ...collectReceiptReviewEvidence(asList(summary.receipts)),
    ...collectReceiptReviewEvidence(asList(completion.receipts)),
    ...testAgentFailures.failureLines.map((item: string) => `返工重点：${item}`),
    ...testAgentFailures.diagnosticLines.map((item: string) => `排查建议：${item}`),
    ...testAgentCoverage.failedLines.map((item: string) => `返工重点：${item}`),
    ...testAgentCoverage.unknownLines.map((item: string) => `待确认：${item}`),
    ...testAgentCoverage.weakLines.map((item: string) => `证据强度：${item}`),
    ...testAgentBrowserProviderGaps.recheckLines,
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

function normalizeStepStatus(status: any) {
  const value = String(status || "").toLowerCase();
  if (["done", "completed", "succeeded", "success", "skipped"].includes(value)) return "completed";
  if (["running", "in_progress", "executing", "reviewing", "reworking"].includes(value)) return "in_progress";
  if (["waiting_confirmation", "waiting_clarification", "needs_confirmation", "waiting_user", "paused"].includes(value)) return "needs_confirmation";
  if (["failed", "error"].includes(value)) return "failed";
  if (["cancelled", "canceled"].includes(value)) return "cancelled";
  return "pending";
}

export function checkpointStatus(status: any) {
  const value = normalizeStepStatus(status);
  if (value === "completed") return "done";
  if (value === "in_progress") return "active";
  if (value === "needs_confirmation") return "warning";
  if (value === "failed") return "failed";
  return "pending";
}

const WORKCHAIN_TODO_VERIFICATION_PATTERN = /验证|验收|检查|复核|测试|test|verify|verification|check|qa|build|lint|typecheck/i;

function workchainTodoActiveForm(id: string, content: string, surface: MainAgentWorkchainSurface) {
  if (id === "intake") return "正在理解需求";
  if (id === "plan") return "正在形成计划";
  if (id === "execute") return surface === "global" ? "正在调度执行" : "正在协调执行";
  if (id === "verify") return "正在检查验收";
  if (id === "summarize") return "正在总结交付";
  if (/^正在/.test(content)) return content;
  return content ? `正在${content.replace(/^(确认|形成|调度|协作|检查|总结|生成|读取|等待)/, "$1")}` : "正在处理当前步骤";
}

function normalizeWorkchainTodoStatus(status: any) {
  const value = normalizeStepStatus(status);
  if (value === "completed") return "completed";
  if (value === "in_progress") return "in_progress";
  if (value === "needs_confirmation") return "needs_confirmation";
  if (value === "failed") return "failed";
  if (value === "cancelled") return "cancelled";
  return "pending";
}

function workchainTodoHasVerificationStep(step: any) {
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

export function normalizeWorkchainTodoSteps(input: MainAgentWorkchainInput, stages: any[], terminal: boolean) {
  const source = (Array.isArray(input.steps) && input.steps.length)
    ? input.steps
    : stages.map(stage => ({
        id: stage.id,
        content: stage.label,
        activeForm: workchainTodoActiveForm(stage.id, stage.label, input.surface),
        status: stage.status,
        detail: stage.summary,
      }));
  const steps = source.map((step: any, index: number) => {
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
    if (nextIndex >= 0) steps[nextIndex] = { ...steps[nextIndex], status: "in_progress" };
  }
  return steps;
}

export function buildWorkchainTodoVerificationReminder(input: MainAgentWorkchainInput, steps: any[], evidence: ReturnType<typeof collectCompletionEvidence>, terminal: boolean) {
  const actionable = !(input.mode === "conversation" && !hasExecutableWorkEvidence(input, evidence));
  if (!actionable || steps.length < 3) return null;
  const planSteps = steps.filter(step => step.id !== "quality-followup" && step.source !== "final_summary_quality");
  const hasVerification = planSteps.some(workchainTodoHasVerificationStep) || hasStrongWorkchainVerificationEvidence(evidence);
  const allDone = steps.every(step => step.status === "completed");
  if (hasVerification || (!allDone && !terminal)) return null;
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

function buildWorkchainQualityFollowupTodoStep(qualityFollowup: any) {
  if (!qualityFollowup) return null;
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

export function applyQualityFollowupTodoStep(steps: any[], qualityFollowup: any) {
  const followupStep = buildWorkchainQualityFollowupTodoStep(qualityFollowup);
  if (!followupStep) return steps;
  const normalized = steps
    .filter(step => step.id !== followupStep.id)
    .map(step => step.status === "in_progress" ? { ...step, status: "completed" } : step);
  return [...normalized, followupStep];
}

export function sanitizeWorkchainUserText(value: any, fallback = "我正在处理当前请求。", max = 260) {
  let text = compactMultilineText(value, max);
  if (!text) text = fallback;
  if (INTERNAL_TEXT_PATTERN.test(text)) {
    if (/error|失败|denied|invalid|权限|门禁/i.test(text)) text = "执行时遇到保护或权限问题，我会继续排查；详细信息已放入技术详情。";
    else if (/done|完成|receipt|回执/i.test(text)) text = "执行成员已提交结果说明，我正在汇总验收。";
    else text = fallback;
  }
  return compactMultilineText(sanitizeWorkchainTerminology(text
    .replace(/\bCoordinator\b/g, "我")
    .replace(/\bPipeline\b/g, "协作看板")
    .replace(/\bRuntime Kernel\b/g, "技术运行信息")
    .replace(/\bTrace Replay\b/g, "技术回放")
    .replace(/回执/g, "结果说明")), max);
}

export function collectCompletionEvidence(input: MainAgentWorkchainInput) {
  const summary = input.summary || {};
  const completion = input.completion || {};
  const technical = input.technical || {};
  const acceptance = collectAcceptanceEvidence(input);
  const independentReview = collectIndependentReviewEvidence(input);
  const independentReviewGate = getIndependentReviewGateState(input);
  const postReviewSpotCheck = getPostReviewSpotCheckState(input);
  const files = [
    ...stringList(summary.files_changed, 20),
    ...(Array.isArray(summary.actual_file_changes) ? summary.actual_file_changes.map((item: any) => item?.path || item?.file || item).filter(Boolean) : []),
  ].slice(0, 20);
  const verification = narrativeList(summary.verification_executed || completion.verification || completion.evidence, 12, "验证记录已整理，技术细节已放入技术详情。");
  const receipts = Number(summary.receipt_count || 0);
  const workersDone = (input.workers || []).filter((item: any) => ["done", "completed", "succeeded"].includes(String(item?.status || "").toLowerCase())).length;
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

export function hasExecutableWorkEvidence(input: MainAgentWorkchainInput, evidence: ReturnType<typeof collectCompletionEvidence>) {
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

export function hasStrongWorkchainVerificationEvidence(evidence: ReturnType<typeof collectCompletionEvidence>) {
  return evidence.verification.some(item => !workchainVerificationFailureText(item))
    || evidence.independentReview.length > 0
    || evidence.acceptance.some(item => !isBareWorkchainAcceptanceLine(item) && !workchainAcceptanceFailureText(item));
}

export function workchainVerificationFailureText(item: any) {
  const text = String(item || "").trim();
  if (!text) return false;
  if (/无失败|未发现.*失败|没有.*失败|0\s*项?失败/i.test(text)) return false;
  return /未通过|测试失败|验证失败|执行失败|命令失败|失败|报错|错误|\bfailed\b|\bfailure\b|\berror\b|exit code [1-9]\d*|exit_code [1-9]\d*|exitCode [1-9]\d*/i.test(text);
}

export function isBareWorkchainAcceptanceLine(item: any) {
  return /^最终验收(已通过|未通过)/.test(String(item || "").trim());
}

export function workchainAcceptanceFailureText(item: any) {
  const text = String(item || "").trim();
  if (!text) return false;
  return /未通过|失败|缺口|待处理|需要返工|需返工/i.test(text);
}
