export interface MainAgentBrowserFlowReviewSummary {
  total: number;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  skippedCount: number;
  criteriaCount: number;
  actionCount: number;
  assertionCount: number;
  failedStepCount: number;
  headline: string;
  evidenceLines: string[];
  failedLines: string[];
  incompleteLines: string[];
  raw: any;
}

export interface MainAgentBrowserMultiSessionReviewSummary {
  total: number;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  skippedCount: number;
  sessionCount: number;
  uniqueSessionCount: number;
  parallelGroupCount: number;
  comparisonCount: number;
  failedComparisonCount: number;
  actionCount: number;
  assertionCount: number;
  failedStepCount: number;
  headline: string;
  evidenceLines: string[];
  failedLines: string[];
  incompleteLines: string[];
  raw: any;
}

export interface MainAgentBrowserAuthenticationReviewSummary {
  configuredChecks: number;
  passedChecks: number;
  failedChecks: number;
  blockedChecks: number;
  pendingChecks: number;
  authenticatedSessions: number;
  headline: string;
  evidenceLines: string[];
  failedLines: string[];
  incompleteLines: string[];
  raw: any;
}

export interface MainAgentBrowserActionEffectReviewSummary {
  checks: number;
  actions: number;
  changed: number;
  unchanged: number;
  unavailable: number;
  failed: number;
  crossSession: number;
  headline: string;
  evidenceLines: string[];
  failedLines: string[];
  recheckLines: string[];
  raw: any;
}

export interface MainAgentBrowserRecoveryReviewSummary {
  checks: number;
  attempted: number;
  recovered: number;
  failed: number;
  notRetried: number;
  headline: string;
  evidenceLines: string[];
  recheckLines: string[];
  raw: any;
}

export interface MainAgentAdversarialEvidenceReviewSummary {
  status: "verified" | "failed" | "blocked" | "missing" | "unlinked" | "waived";
  required: boolean;
  waived: boolean;
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  relevant: number;
  unlinked: number;
  passedRelevant: number;
  headline: string;
  evidenceLines: string[];
  failedLines: string[];
  recheckLines: string[];
  blockedLines: string[];
  raw: any;
}

export interface MainAgentSafeBrowserAuthenticationSummary {
  configuredChecks: number;
  passedChecks: number;
  failedChecks: number;
  blockedChecks: number;
  authenticatedSessions: number;
}

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function count(value: any) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function compactVisibleText(value: any, fallback = "", max = 160) {
  const text = String(value || fallback)
    .replace(/[A-Za-z]:[\\/][^\s；;，。)）]+/g, "技术详情里的证据文件")
    .replace(/(^|[\s（(])\/[^\s；;，。)）]*(?:test-agent-artifacts|screenshots|browser-artifacts|report\.json|report\.md|verdict\.json|artifact-manifest\.json)[^\s；;，。)）]*/gi, "$1技术详情里的证据文件")
    .replace(/\b(?:trace_id|session_id|run_id|raw payload|networkLogPath)\b/gi, "技术记录")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function flowTypeLabel(value: any) {
  const type = String(value || "").trim().toLowerCase();
  const labels: Record<string, string> = {
    acceptance_form_flow: "表单流程",
    acceptance_click_flow: "点击流程",
    acceptance_multi_click_flow: "连续操作流程",
    acceptance_repeated_click_flow: "重复操作流程",
    acceptance_popup_flow: "弹窗流程",
    acceptance_dialog_flow: "对话框流程",
    acceptance_drag_flow: "拖放流程",
    acceptance_clipboard_flow: "复制粘贴流程",
    acceptance_keyboard_flow: "键盘操作流程",
    acceptance_hover_flow: "悬停交互流程",
    acceptance_scroll_flow: "滚动查看流程",
    acceptance_history_flow: "浏览器前进后退流程",
    acceptance_network_state_flow: "联网与离线流程",
    acceptance_upload_flow: "文件上传流程",
    acceptance_download_flow: "文件下载流程",
    acceptance_table_flow: "表格操作流程",
    acceptance_navigation_flow: "页面跳转流程",
    acceptance_click_navigation_flow: "点击跳转流程",
  };
  return labels[type] || "浏览器验收流程";
}

function isBrowserFlowSummary(value: any) {
  return !!value
    && typeof value === "object"
    && !Array.isArray(value)
    && value.statusCounts
    && typeof value.statusCounts === "object"
    && Array.isArray(value.items)
    && value.sessionCount === undefined
    && value.uniqueSessionCount === undefined
    && !Array.isArray(value.sessionNames);
}

function isBrowserMultiSessionSummary(value: any) {
  return !!value
    && typeof value === "object"
    && !Array.isArray(value)
    && value.statusCounts
    && typeof value.statusCounts === "object"
    && Array.isArray(value.items)
    && (
      value.sessionCount !== undefined
      || value.uniqueSessionCount !== undefined
      || Array.isArray(value.sessionNames)
      || value.items.some((item: any) => Array.isArray(item?.sessionNames) || Array.isArray(item?.sessions))
  );
}

function isBrowserAuthenticationSummary(value: any) {
  return !!value
    && typeof value === "object"
    && !Array.isArray(value)
    && (
      value.configuredChecks !== undefined
      || value.configured_checks !== undefined
    )
    && (
      value.passedChecks !== undefined
      || value.passed_checks !== undefined
      || value.failedChecks !== undefined
      || value.failed_checks !== undefined
      || value.blockedChecks !== undefined
      || value.blocked_checks !== undefined
    );
}

function isBrowserActionEffectSummary(value: any) {
  return !!value
    && typeof value === "object"
    && !Array.isArray(value)
    && (
      value.actions !== undefined
      || value.changed !== undefined
      || value.unchanged !== undefined
      || value.unavailable !== undefined
    )
    && Array.isArray(value.items)
    && value.attempted === undefined
    && value.recovered === undefined;
}

function isBrowserRecoverySummary(value: any) {
  return !!value
    && typeof value === "object"
    && !Array.isArray(value)
    && (
      value.attempted !== undefined
      || value.recovered !== undefined
      || value.notRetried !== undefined
      || value.not_retried !== undefined
    )
    && Array.isArray(value.items);
}

function isAdversarialEvidenceSummary(value: any) {
  const status = String(value?.status || "").trim().toLowerCase();
  return !!value
    && typeof value === "object"
    && !Array.isArray(value)
    && ["verified", "failed", "blocked", "missing", "unlinked", "waived"].includes(status)
    && (
      value.required !== undefined
      || value.waived !== undefined
      || value.passedRelevant !== undefined
      || value.passed_relevant !== undefined
    )
    && Array.isArray(value.items);
}

function findBrowserFlowSummary(source: any, depth = 0, seen = new Set<any>()): any | null {
  if (!source || typeof source !== "object" || depth > 4 || seen.has(source)) return null;
  seen.add(source);
  if (isBrowserFlowSummary(source)) return source;
  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findBrowserFlowSummary(item, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }
  const direct = source.browserFlowSummary || source.browser_flow_summary;
  if (isBrowserFlowSummary(direct)) return direct;
  const nestedKeys = [
    "verdict",
    "testAgentVerdict",
    "test_agent_verdict",
    "testAgentReport",
    "test_agent_report",
    "receipt",
    "technical",
  ];
  for (const key of nestedKeys) {
    const found = findBrowserFlowSummary(source[key], depth + 1, seen);
    if (found) return found;
  }
  return null;
}

function findBrowserMultiSessionSummary(source: any, depth = 0, seen = new Set<any>()): any | null {
  if (!source || typeof source !== "object" || depth > 4 || seen.has(source)) return null;
  seen.add(source);
  if (isBrowserMultiSessionSummary(source)) return source;
  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findBrowserMultiSessionSummary(item, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }
  const direct = source.browserMultiSessionSummary || source.browser_multi_session_summary;
  if (isBrowserMultiSessionSummary(direct)) return direct;
  const nestedKeys = [
    "verdict",
    "testAgentVerdict",
    "test_agent_verdict",
    "testAgentReport",
    "test_agent_report",
    "receipt",
    "technical",
  ];
  for (const key of nestedKeys) {
    const found = findBrowserMultiSessionSummary(source[key], depth + 1, seen);
    if (found) return found;
  }
  return null;
}

function findBrowserAuthenticationSummary(source: any, depth = 0, seen = new Set<any>()): any | null {
  if (!source || typeof source !== "object" || depth > 5 || seen.has(source)) return null;
  seen.add(source);
  if (isBrowserAuthenticationSummary(source)) return source;
  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findBrowserAuthenticationSummary(item, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }
  const direct = source.browserAuthenticationSummary
    || source.browser_authentication_summary
    || source.metadata?.browserAuthenticationSummary
    || source.metadata?.browser_authentication_summary;
  if (isBrowserAuthenticationSummary(direct)) return direct;
  const nestedKeys = [
    "metadata",
    "verdict",
    "testAgentVerdict",
    "test_agent_verdict",
    "testAgentReport",
    "test_agent_report",
    "receipt",
    "technical",
  ];
  for (const key of nestedKeys) {
    const found = findBrowserAuthenticationSummary(source[key], depth + 1, seen);
    if (found) return found;
  }
  return null;
}

function findBrowserActionEffectSummary(source: any, depth = 0, seen = new Set<any>()): any | null {
  if (!source || typeof source !== "object" || depth > 5 || seen.has(source)) return null;
  seen.add(source);
  if (isBrowserActionEffectSummary(source)) return source;
  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findBrowserActionEffectSummary(item, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }
  const direct = source.browserActionEffectSummary || source.browser_action_effect_summary;
  if (isBrowserActionEffectSummary(direct)) return direct;
  const nestedKeys = [
    "verdict",
    "testAgentVerdict",
    "test_agent_verdict",
    "testAgentReport",
    "test_agent_report",
    "receipt",
    "technical",
  ];
  for (const key of nestedKeys) {
    const found = findBrowserActionEffectSummary(source[key], depth + 1, seen);
    if (found) return found;
  }
  return null;
}

function findBrowserRecoverySummary(source: any, depth = 0, seen = new Set<any>()): any | null {
  if (!source || typeof source !== "object" || depth > 5 || seen.has(source)) return null;
  seen.add(source);
  if (isBrowserRecoverySummary(source)) return source;
  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findBrowserRecoverySummary(item, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }
  const direct = source.browserRecoverySummary || source.browser_recovery_summary;
  if (isBrowserRecoverySummary(direct)) return direct;
  const nestedKeys = [
    "verdict",
    "testAgentVerdict",
    "test_agent_verdict",
    "testAgentReport",
    "test_agent_report",
    "receipt",
    "technical",
  ];
  for (const key of nestedKeys) {
    const found = findBrowserRecoverySummary(source[key], depth + 1, seen);
    if (found) return found;
  }
  return null;
}

function findAdversarialEvidenceSummary(source: any, depth = 0, seen = new Set<any>()): any | null {
  if (!source || typeof source !== "object" || depth > 5 || seen.has(source)) return null;
  seen.add(source);
  if (isAdversarialEvidenceSummary(source)) return source;
  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findAdversarialEvidenceSummary(item, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }
  const direct = source.adversarialEvidenceSummary || source.adversarial_evidence_summary;
  if (isAdversarialEvidenceSummary(direct)) return direct;
  const nestedKeys = [
    "verdict",
    "testAgentVerdict",
    "test_agent_verdict",
    "testAgentReport",
    "test_agent_report",
    "receipt",
    "technical",
  ];
  for (const key of nestedKeys) {
    const found = findAdversarialEvidenceSummary(source[key], depth + 1, seen);
    if (found) return found;
  }
  return null;
}

function flowContext(item: any) {
  const criterion = asArray(item?.criteria)
    .map(value => compactVisibleText(value, "", 90))
    .find(Boolean);
  if (criterion) return `验收目标：${criterion}`;
  const failure = asArray(item?.failures)[0] || {};
  const project = compactVisibleText(failure.project, "", 50);
  const name = compactVisibleText(failure.name, "", 80);
  return [project, name].filter(Boolean).join("：");
}

function sessionRoleLabel(value: any) {
  const text = compactVisibleText(value, "", 50);
  const normalized = text.toLowerCase().replace(/[_\s-]+/g, "");
  const labels: Record<string, string> = {
    sender: "发送方",
    receiver: "接收方",
    author: "操作方",
    observer: "观察方",
    operator: "操作方",
    admin: "管理员",
    member: "成员",
    guest: "访客",
    owner: "负责人",
    reviewer: "复核方",
  };
  return labels[normalized] || (text ? `${text} 会话` : "相关会话");
}

function multiSessionScenarioTitle(item: any) {
  return compactVisibleText(item?.check || item?.name || item?.title, "多人协作场景", 100);
}

function browserCheckTitle(item: any, fallback: string) {
  return compactVisibleText(item?.name || item?.check || item?.title, fallback, 100);
}

export function summarizeTestAgentBrowserActionEffects(...sources: any[]): MainAgentBrowserActionEffectReviewSummary | null {
  let raw: any = null;
  for (const source of sources) {
    raw = findBrowserActionEffectSummary(source);
    if (raw) break;
  }
  if (!raw) return null;

  const checks = count(raw.checks) || asArray(raw.items).length;
  const actions = count(raw.actions);
  const changed = count(raw.changed);
  const unchanged = count(raw.unchanged);
  const unavailable = count(raw.unavailable);
  const failed = count(raw.failed) || unchanged + unavailable;
  const crossSession = count(raw.crossSession ?? raw.cross_session);
  if (!checks && !actions && !asArray(raw.items).length) return null;

  const statusParts = [
    changed ? `${changed} 次产生预期变化` : "",
    unchanged ? `${unchanged} 次没有产生可见效果` : "",
    unavailable ? `${unavailable} 次暂时无法确认效果` : "",
    crossSession ? `${crossSession} 次跨会话生效检查` : "",
  ].filter(Boolean);
  const headline = `操作结果验证：共核对 ${actions || failed || changed} 次页面操作${statusParts.length ? `，${statusParts.join("、")}` : ""}。`;
  const failedLines: string[] = [];
  const recheckLines: string[] = [];

  for (const item of asArray(raw.items)) {
    const title = browserCheckTitle(item, "浏览器操作");
    const itemUnchanged = count(item?.unchanged);
    const itemUnavailable = count(item?.unavailable);
    if (itemUnchanged) {
      failedLines.push(`场景“${title}”中有 ${itemUnchanged} 次操作没有产生可见效果，需要修复交互结果后重新验证。`);
    }
    if (itemUnavailable) {
      recheckLines.push(`场景“${title}”中有 ${itemUnavailable} 次操作暂时无法确认页面效果，需要补齐可观察结果后重新复验。`);
    }
  }

  if (unchanged && !failedLines.length) {
    failedLines.push(`有 ${unchanged} 次页面操作没有产生可见效果，需要修复交互结果后重新验证。`);
  }
  if (unavailable && !recheckLines.length) {
    recheckLines.push(`有 ${unavailable} 次页面操作暂时无法确认效果，需要补齐可观察结果后重新复验。`);
  }
  const uniqueFailed = [...new Set(failedLines)].slice(0, 5);
  const uniqueRecheck = [...new Set(recheckLines)].slice(0, 5);
  return {
    checks,
    actions,
    changed,
    unchanged,
    unavailable,
    failed,
    crossSession,
    headline,
    evidenceLines: [headline, ...uniqueFailed, ...uniqueRecheck].slice(0, 8),
    failedLines: uniqueFailed,
    recheckLines: uniqueRecheck,
    raw,
  };
}

export function summarizeTestAgentBrowserRecovery(...sources: any[]): MainAgentBrowserRecoveryReviewSummary | null {
  let raw: any = null;
  for (const source of sources) {
    raw = findBrowserRecoverySummary(source);
    if (raw) break;
  }
  if (!raw) return null;

  const checks = count(raw.checks) || asArray(raw.items).length;
  const attempted = count(raw.attempted);
  const recovered = count(raw.recovered);
  const failed = count(raw.failed);
  const notRetried = count(raw.notRetried ?? raw.not_retried);
  if (!checks && !attempted && !asArray(raw.items).length) return null;

  const statusParts = [
    recovered ? `${recovered} 次成功恢复` : "",
    failed ? `${failed} 次恢复未成功` : "",
    notRetried ? `${notRetried} 次为避免重复副作用未自动重试` : "",
  ].filter(Boolean);
  const headline = `浏览器会话恢复：共检查 ${attempted || checks} 次恢复过程${statusParts.length ? `，${statusParts.join("、")}` : ""}。`;
  const recheckLines: string[] = [];

  for (const item of asArray(raw.items)) {
    const title = browserCheckTitle(item, "浏览器验收");
    const itemFailed = count(item?.failed);
    const itemNotRetried = count(item?.notRetried ?? item?.not_retried);
    if (itemFailed) {
      recheckLines.push(`场景“${title}”中有 ${itemFailed} 次会话恢复未成功，当前验证还没有闭环，需要重新建立会话后复验。`);
    }
    if (itemNotRetried) {
      recheckLines.push(`场景“${title}”中有 ${itemNotRetried} 次操作为避免重复点击或提交而没有自动重试；这不代表实现失败，需要在安全条件下重新复验。`);
    }
  }

  if (failed && !recheckLines.some(item => item.includes("恢复未成功"))) {
    recheckLines.push(`有 ${failed} 次会话恢复未成功，当前验证还没有闭环，需要重新建立会话后复验。`);
  }
  if (notRetried && !recheckLines.some(item => item.includes("不代表实现失败"))) {
    recheckLines.push(`有 ${notRetried} 次操作为避免重复点击或提交而没有自动重试；这不代表实现失败，需要在安全条件下重新复验。`);
  }
  const uniqueRecheck = [...new Set(recheckLines)].slice(0, 6);
  return {
    checks,
    attempted,
    recovered,
    failed,
    notRetried,
    headline,
    evidenceLines: [headline, ...uniqueRecheck].slice(0, 8),
    recheckLines: uniqueRecheck,
    raw,
  };
}

export function summarizeTestAgentAdversarialEvidence(...sources: any[]): MainAgentAdversarialEvidenceReviewSummary | null {
  let raw: any = null;
  for (const source of sources) {
    raw = findAdversarialEvidenceSummary(source);
    if (raw) break;
  }
  if (!raw) return null;

  const status = String(raw.status || "").trim().toLowerCase() as MainAgentAdversarialEvidenceReviewSummary["status"];
  const required = raw.required === true;
  const waived = raw.waived === true;
  const total = count(raw.total) || asArray(raw.items).length;
  const passed = count(raw.passed);
  const failed = count(raw.failed);
  const blocked = count(raw.blocked);
  const relevant = count(raw.relevant);
  const unlinked = count(raw.unlinked);
  const passedRelevant = count(raw.passedRelevant ?? raw.passed_relevant);
  const waiverReason = compactVisibleText(raw.waiverReason || raw.waiver_reason, "", 120);
  const headline = status === "verified"
    ? `边界与异常验证：已完成 ${total} 项检查，其中 ${passedRelevant || passed} 项与当前目标相关并通过。`
    : status === "waived"
      ? `边界与异常验证：本轮已按明确理由豁免${waiverReason ? `（${waiverReason}）` : ""}。`
      : status === "failed"
        ? `边界与异常验证：已执行 ${total} 项检查，其中 ${failed} 项未通过，需要修复后重新验证。`
        : status === "blocked"
          ? `边界与异常验证：有 ${blocked || total} 项检查受环境或登录条件阻塞，当前还不能完成验收。`
          : status === "unlinked"
            ? `边界与异常验证：已有 ${total} 项检查，但没有与当前目标或验收条件建立有效关联。`
            : "边界与异常验证：本轮缺少与当前目标相关的边界或异常检查。";
  const failedLines: string[] = [];
  const blockedLines: string[] = [];

  for (const item of asArray(raw.items)) {
    const title = browserCheckTitle(item, "边界检查");
    const itemStatus = String(item?.status || "").trim().toLowerCase();
    const criterion = asArray(item?.linkedCriteria || item?.linked_criteria)
      .map(value => compactVisibleText(value, "", 90))
      .find(Boolean);
    if (itemStatus === "failed") {
      failedLines.push(`边界检查“${title}”未通过${criterion ? `（验收目标：${criterion}）` : ""}，需要修复后重新验证。`);
    }
    if (itemStatus === "blocked") {
      blockedLines.push(`边界检查“${title}”执行受阻，需要补齐环境、登录或运行条件后重新验证。`);
    }
  }

  if (failed && !failedLines.length) {
    failedLines.push(`有 ${failed} 项与目标相关的边界或异常检查未通过，需要修复后重新验证。`);
  }
  if (blocked && !blockedLines.length) {
    blockedLines.push(`有 ${blocked} 项边界或异常检查受阻，需要补齐环境、登录或运行条件后重新验证。`);
  }
  const recheckLines = status === "missing"
    ? ["需要在 TestAgent 工作单中补充至少一项与当前目标相关的边界或异常检查，并重新运行复核。"]
    : status === "unlinked"
      ? [`现有 ${unlinked || total} 项边界检查没有关联当前目标，需要补充目标或验收条件关联后重新运行复核。`]
      : [];
  const uniqueFailed = [...new Set(failedLines)].slice(0, 5);
  const uniqueRecheck = [...new Set(recheckLines)].slice(0, 4);
  const uniqueBlocked = [...new Set(blockedLines)].slice(0, 5);
  return {
    status,
    required,
    waived,
    total,
    passed,
    failed,
    blocked,
    relevant,
    unlinked,
    passedRelevant,
    headline,
    evidenceLines: [headline, ...uniqueFailed, ...uniqueRecheck, ...uniqueBlocked].slice(0, 8),
    failedLines: uniqueFailed,
    recheckLines: uniqueRecheck,
    blockedLines: uniqueBlocked,
    raw,
  };
}

export function summarizeTestAgentBrowserAuthentication(...sources: any[]): MainAgentBrowserAuthenticationReviewSummary | null {
  let raw: any = null;
  for (const source of sources) {
    raw = findBrowserAuthenticationSummary(source);
    if (raw) break;
  }
  if (!raw) return null;

  const configuredChecks = count(raw.configuredChecks ?? raw.configured_checks);
  const passedChecks = count(raw.passedChecks ?? raw.passed_checks);
  const failedChecks = count(raw.failedChecks ?? raw.failed_checks);
  const blockedChecks = count(raw.blockedChecks ?? raw.blocked_checks);
  const authenticatedSessions = count(raw.authenticatedSessions ?? raw.authenticated_sessions);
  const pendingChecks = Math.max(configuredChecks - passedChecks - failedChecks - blockedChecks, 0);
  if (!configuredChecks && !passedChecks && !failedChecks && !blockedChecks) return null;

  const total = configuredChecks || passedChecks + failedChecks + blockedChecks + pendingChecks;
  const statusParts = [
    passedChecks ? `${passedChecks} 项通过` : "",
    failedChecks ? `${failedChecks} 项未通过` : "",
    blockedChecks ? `${blockedChecks} 项受阻` : "",
    pendingChecks ? `${pendingChecks} 项尚未确认` : "",
  ].filter(Boolean);
  const headline = `登录态浏览器验收：共执行 ${total} 项登录检查${statusParts.length ? `，${statusParts.join("、")}` : ""}${authenticatedSessions ? `，覆盖 ${authenticatedSessions} 个已登录会话` : ""}。`;
  const failedLines = failedChecks
    ? [`登录态浏览器验收有 ${failedChecks} 项未通过，需要先修复登录流程或会话恢复问题，再重新验证。`]
    : [];
  const incompleteCount = blockedChecks + pendingChecks;
  const incompleteLines = incompleteCount
    ? [`登录态浏览器验收有 ${incompleteCount} 项受阻或尚未确认，需要补齐测试账号或登录条件后重新验证。`]
    : [];
  return {
    configuredChecks: total,
    passedChecks,
    failedChecks,
    blockedChecks,
    pendingChecks,
    authenticatedSessions,
    headline,
    evidenceLines: [headline, ...failedLines, ...incompleteLines],
    failedLines,
    incompleteLines,
    raw,
  };
}

export function compactTestAgentBrowserAuthenticationSummary(
  summary: MainAgentBrowserAuthenticationReviewSummary | null | undefined
): MainAgentSafeBrowserAuthenticationSummary | null {
  if (!summary) return null;
  return {
    configuredChecks: summary.configuredChecks,
    passedChecks: summary.passedChecks,
    failedChecks: summary.failedChecks,
    blockedChecks: summary.blockedChecks,
    authenticatedSessions: summary.authenticatedSessions,
  };
}

export function summarizeTestAgentMultiSessionBrowser(...sources: any[]): MainAgentBrowserMultiSessionReviewSummary | null {
  let raw: any = null;
  for (const source of sources) {
    raw = findBrowserMultiSessionSummary(source);
    if (raw) break;
  }
  if (!raw) return null;

  const passedCount = count(raw.statusCounts?.passed);
  const failedCount = count(raw.statusCounts?.failed);
  const blockedCount = count(raw.statusCounts?.blocked);
  const skippedCount = count(raw.statusCounts?.skipped);
  const total = count(raw.total) || passedCount + failedCount + blockedCount + skippedCount;
  const sessionCount = count(raw.sessionCount);
  const uniqueSessionCount = count(raw.uniqueSessionCount) || asArray(raw.sessionNames).length;
  const parallelGroupCount = count(raw.parallelGroupCount);
  const comparisonCount = count(raw.comparisonCount);
  const failedComparisonCount = count(raw.failedComparisonCount);
  const actionCount = count(raw.actionCount);
  const assertionCount = count(raw.assertionCount);
  const failedStepCount = count(raw.failedStepCount);
  if (!total && !asArray(raw.items).length) return null;

  const statusParts = [
    passedCount ? `${passedCount} 个通过` : "",
    failedCount ? `${failedCount} 个未通过` : "",
    blockedCount ? `${blockedCount} 个受阻` : "",
    skippedCount ? `${skippedCount} 个未执行` : "",
  ].filter(Boolean);
  const roleCount = uniqueSessionCount || sessionCount;
  const headline = `多人协作浏览器验收：共执行 ${total} 个场景${statusParts.length ? `，${statusParts.join("、")}` : ""}${roleCount ? `，覆盖 ${roleCount} 个会话角色` : ""}${parallelGroupCount ? `，包含 ${parallelGroupCount} 组并行动作` : ""}${comparisonCount ? `，核对 ${comparisonCount} 项跨会话结果` : ""}。`;
  const failedLines: string[] = [];
  const incompleteLines: string[] = [];

  for (const item of asArray(raw.items)) {
    const title = multiSessionScenarioTitle(item);
    const status = String(item?.status || "").trim().toLowerCase();
    const failedSessions = asArray(item?.failedSessionNames || item?.failed_session_names)
      .map(sessionRoleLabel)
      .filter(Boolean);
    const failedSteps = count(item?.failedStepCount) || asArray(item?.failedSteps || item?.failed_steps).length;
    const failedComparisons = count(item?.failedComparisonCount || item?.failed_comparison_count);
    if (status === "failed" || failedSessions.length || failedSteps || failedComparisons) {
      failedLines.push(`场景“${title}”中，${failedSessions.length ? `${failedSessions.join("、")}未通过` : "跨会话验证未通过"}，失败步骤已放入技术详情。`);
    }
    if (status === "blocked" || status === "skipped") {
      incompleteLines.push(`场景“${title}”${status === "blocked" ? "执行受阻" : "尚未执行"}，需要补齐登录、环境或运行条件后重新验证。`);
    }
  }

  const uniqueFailed = [...new Set(failedLines)].slice(0, 6);
  const uniqueIncomplete = [...new Set(incompleteLines)].slice(0, 6);
  return {
    total,
    passedCount,
    failedCount,
    blockedCount,
    skippedCount,
    sessionCount,
    uniqueSessionCount,
    parallelGroupCount,
    comparisonCount,
    failedComparisonCount,
    actionCount,
    assertionCount,
    failedStepCount,
    headline,
    evidenceLines: [headline, ...uniqueFailed, ...uniqueIncomplete].slice(0, 8),
    failedLines: uniqueFailed,
    incompleteLines: uniqueIncomplete,
    raw,
  };
}

export function summarizeTestAgentBrowserFlows(...sources: any[]): MainAgentBrowserFlowReviewSummary | null {
  let raw: any = null;
  for (const source of sources) {
    raw = findBrowserFlowSummary(source);
    if (raw) break;
  }
  if (!raw) return null;

  const passedCount = count(raw.statusCounts?.passed);
  const failedCount = count(raw.statusCounts?.failed);
  const blockedCount = count(raw.statusCounts?.blocked);
  const skippedCount = count(raw.statusCounts?.skipped);
  const total = count(raw.total) || passedCount + failedCount + blockedCount + skippedCount;
  const criteriaCount = count(raw.criteriaCount);
  const actionCount = count(raw.actionCount);
  const assertionCount = count(raw.assertionCount);
  const failedStepCount = count(raw.failedStepCount);
  if (!total && !asArray(raw.items).length) return null;

  const statusParts = [
    passedCount ? `${passedCount} 个通过` : "",
    failedCount ? `${failedCount} 个未通过` : "",
    blockedCount ? `${blockedCount} 个受阻` : "",
    skippedCount ? `${skippedCount} 个未执行` : "",
  ].filter(Boolean);
  const headline = `真实浏览器验收：共执行 ${total} 个流程${statusParts.length ? `，${statusParts.join("、")}` : ""}${criteriaCount ? `，覆盖 ${criteriaCount} 条验收条件` : ""}。`;
  const failedLines: string[] = [];
  const incompleteLines: string[] = [];

  for (const item of asArray(raw.items)) {
    const label = flowTypeLabel(item?.flowType || item?.flow_type);
    const failed = count(item?.statusCounts?.failed);
    const blocked = count(item?.statusCounts?.blocked);
    const skipped = count(item?.statusCounts?.skipped);
    const context = flowContext(item);
    if (failed || count(item?.failedStepCount)) {
      failedLines.push(`${label}有 ${Math.max(failed, 1)} 个流程未通过${context ? `（${context}）` : ""}，失败步骤已放入技术详情。`);
    }
    if (blocked || skipped) {
      const parts = [blocked ? `${blocked} 个受阻` : "", skipped ? `${skipped} 个未执行` : ""].filter(Boolean).join("、");
      incompleteLines.push(`${label}有 ${parts}${context ? `（${context}）` : ""}，需要补齐执行条件或验证证据。`);
    }
  }

  const uniqueFailed = [...new Set(failedLines)].slice(0, 6);
  const uniqueIncomplete = [...new Set(incompleteLines)].slice(0, 6);
  return {
    total,
    passedCount,
    failedCount,
    blockedCount,
    skippedCount,
    criteriaCount,
    actionCount,
    assertionCount,
    failedStepCount,
    headline,
    evidenceLines: [headline, ...uniqueFailed, ...uniqueIncomplete].slice(0, 8),
    failedLines: uniqueFailed,
    incompleteLines: uniqueIncomplete,
    raw,
  };
}

export function runTestAgentReviewBridgeSelfTest() {
  const summary = summarizeTestAgentBrowserFlows({
    browserFlowSummary: {
      total: 3,
      statusCounts: { passed: 1, failed: 1, blocked: 1, skipped: 0 },
      flowTypeCount: 2,
      criteriaCount: 3,
      actionCount: 5,
      assertionCount: 6,
      failedStepCount: 1,
      items: [{
        flowType: "acceptance_form_flow",
        total: 2,
        statusCounts: { passed: 1, failed: 1, blocked: 0, skipped: 0 },
        criteria: ["提交登录表单后进入首页"],
        failedStepCount: 1,
        failures: [{ project: "web", name: "登录", status: "failed", failedSteps: ["raw locator"] }],
      }, {
        flowType: "acceptance_network_state_flow",
        total: 1,
        statusCounts: { passed: 0, failed: 0, blocked: 1, skipped: 0 },
        criteria: ["离线时显示网络提示"],
        failedStepCount: 0,
        failures: [],
      }],
    },
  });
  const result = {
    recognized: summary?.total === 3 && summary?.failedCount === 1 && summary?.blockedCount === 1,
    userReadable: summary?.headline.includes("真实浏览器验收")
      && summary?.failedLines.some(item => item.includes("表单流程") && item.includes("未通过"))
      && summary?.incompleteLines.some(item => item.includes("联网与离线流程") && item.includes("受阻")),
    hidesRawSteps: !JSON.stringify(summary?.evidenceLines || []).includes("raw locator"),
  };
  const multiSession = summarizeTestAgentMultiSessionBrowser({
    verdict: {
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
          check: "发送消息后接收方实时看到",
          status: "passed",
          sessionNames: ["sender", "receiver"],
          comparisonCount: 1,
          failedComparisonCount: 0,
          failedSessionNames: [],
          failedSteps: [],
        }, {
          check: "作者更新后观察方同步刷新",
          status: "failed",
          sessionNames: ["author", "observer"],
          comparisonCount: 1,
          failedComparisonCount: 1,
          failedSessionNames: ["observer"],
          failedSteps: [{ name: "session:observer:assert:visible", error: "raw locator #hidden" }],
        }],
      },
    },
  });
  const multiSessionResult = {
    multiSessionRecognized: multiSession?.total === 2
      && multiSession?.failedCount === 1
      && multiSession?.parallelGroupCount === 2
      && multiSession?.comparisonCount === 2
      && multiSession?.failedComparisonCount === 1,
    multiSessionUserReadable: multiSession?.headline.includes("多人协作浏览器验收")
      && multiSession?.headline.includes("4 个会话角色")
      && multiSession?.failedLines.some(item => item.includes("观察方") && item.includes("未通过")),
    multiSessionHidesRawSteps: !JSON.stringify(multiSession?.evidenceLines || []).includes("raw locator")
      && !JSON.stringify(multiSession?.evidenceLines || []).includes("#hidden")
      && !JSON.stringify(multiSession?.evidenceLines || []).includes("session:observer"),
  };
  const authentication = summarizeTestAgentBrowserAuthentication({
    metadata: {
      browserAuthenticationSummary: {
        configuredChecks: 3,
        passedChecks: 1,
        failedChecks: 1,
        blockedChecks: 1,
        authenticatedSessions: 2,
        credentialEnvNames: ["TEST_EMAIL", "TEST_PASSWORD"],
        storageStateCount: 2,
        sensitiveArtifactSuppressionCount: 3,
      },
    },
  });
  const safeAuthentication = compactTestAgentBrowserAuthenticationSummary(authentication);
  const authenticationResult = {
    authenticationRecognized: authentication?.configuredChecks === 3
      && authentication?.passedChecks === 1
      && authentication?.failedChecks === 1
      && authentication?.blockedChecks === 1
      && authentication?.authenticatedSessions === 2,
    authenticationUserReadable: authentication?.headline.includes("登录态浏览器验收")
      && authentication?.failedLines.some(item => item.includes("登录流程或会话恢复"))
      && authentication?.incompleteLines.some(item => item.includes("测试账号或登录条件")),
    authenticationHidesSensitiveMetadata: !/TEST_EMAIL|TEST_PASSWORD|credentialEnvNames|storageState|cookie|token|sha/i.test(JSON.stringify({
      headline: authentication?.headline,
      evidenceLines: authentication?.evidenceLines,
      safeAuthentication,
    })),
  };
  const actionEffects = summarizeTestAgentBrowserActionEffects({
    verdict: {
      browserActionEffectSummary: {
        checks: 2,
        actions: 3,
        changed: 1,
        unchanged: 1,
        unavailable: 1,
        failed: 2,
        detailSuppressed: 1,
        crossSession: 1,
        actionTypes: { click: 2, submit: 1 },
        changedSignals: { page_text: 1 },
        items: [{
          project: "web-app",
          name: "保存设置",
          provider: "playwright",
          status: "failed",
          actions: 2,
          changed: 1,
          unchanged: 1,
          unavailable: 0,
          failed: 1,
          detailSuppressed: 0,
          crossSession: 0,
          actionTypes: { click: 2 },
          changedSignals: { page_text: 1 },
        }, {
          project: "web-app",
          name: "提交订单",
          provider: "playwright",
          status: "blocked",
          actions: 1,
          changed: 0,
          unchanged: 0,
          unavailable: 1,
          failed: 1,
          detailSuppressed: 1,
          crossSession: 1,
          actionTypes: { submit: 1 },
          changedSignals: {},
        }],
      },
    },
  });
  const recovery = summarizeTestAgentBrowserRecovery({
    testAgentReport: {
      browserRecoverySummary: {
        checks: 1,
        attempted: 2,
        recovered: 0,
        failed: 1,
        notRetried: 1,
        items: [{
          project: "web-app",
          name: "保存设置",
          provider: "playwright",
          status: "blocked",
          attempted: 2,
          recovered: 0,
          failed: 1,
          notRetried: 1,
          events: [{ reason: "raw session closed", retrySafe: false }],
        }],
      },
    },
  });
  const adversarialMissing = summarizeTestAgentAdversarialEvidence({
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
  });
  const adversarialFailed = summarizeTestAgentAdversarialEvidence({
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
      criteriaCovered: ["重复提交不能创建重复订单"],
      probeTypes: ["duplicate_submit"],
      items: [{
        project: "web-app",
        surface: "browser",
        name: "重复提交订单",
        target: "http://127.0.0.1:5173/orders/new?token=secret",
        status: "failed",
        provider: "playwright",
        probeType: "duplicate_submit",
        relevance: "explicit",
        linkedCriteria: ["重复提交不能创建重复订单"],
        goalLinked: true,
        matchScore: 100,
      }],
    },
  });
  const latestEvidenceResult = {
    actionEffectsSplitReworkAndRecheck: actionEffects?.unchanged === 1
      && actionEffects?.unavailable === 1
      && actionEffects.failedLines.some(item => item.includes("没有产生可见效果"))
      && actionEffects.recheckLines.some(item => item.includes("重新复验")),
    actionEffectsHideRawDetails: !/playwright|actionTypes|changedSignals/i.test(JSON.stringify(actionEffects?.evidenceLines || [])),
    recoveryRequiresRecheckWithoutCodeRework: recovery?.failed === 1
      && recovery?.notRetried === 1
      && recovery.recheckLines.some(item => item.includes("不代表实现失败"))
      && !/原实现成员返工|代码返工|raw session closed/i.test(JSON.stringify(recovery?.evidenceLines || [])),
    adversarialMissingRequiresNewWorkOrderEvidence: adversarialMissing?.status === "missing"
      && adversarialMissing.recheckLines.some(item => item.includes("TestAgent 工作单") && item.includes("重新运行复核")),
    adversarialFailureShowsBusinessCriterion: adversarialFailed?.status === "failed"
      && adversarialFailed.failedLines.some(item => item.includes("重复提交订单") && item.includes("重复提交不能创建重复订单"))
      && !/127\.0\.0\.1|token=secret|duplicate_submit|playwright/i.test(JSON.stringify(adversarialFailed?.evidenceLines || [])),
  };
  Object.assign(result, multiSessionResult, authenticationResult, latestEvidenceResult);
  return { passed: Object.values(result).every(Boolean), ...result };
}
