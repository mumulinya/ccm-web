export const CCM_COMPLETION_SUMMARY_SCHEMA = "ccm-completion-summary-v1" as const;

export type CcmCompletionSummaryStatus =
  | "success"
  | "failed"
  | "blocked"
  | "cancelled"
  | "interrupted"
  | "waiting"
  | "partial";

export type CcmCompletionSummaryV1 = {
  schema: typeof CCM_COMPLETION_SUMMARY_SCHEMA;
  status: CcmCompletionSummaryStatus;
  headline: string;
  detail?: string;
  filesChanged: number;
  additions?: number;
  deletions?: number;
  verificationPassed: number;
  verificationFailed: number;
  nextAction?: string;
  blockers: string[];
  durationMs?: number;
  source: "terminal_gate" | "query_projection";
  contentStored: false;
};

const MAX_TEXT = 240;
const SECRET_PATTERN = /(?:api[_ -]?key|password|secret|authorization|bearer|token)\s*[:=]/i;
const INTERNAL_PATTERN = /(?:CCM_AGENT_RECEIPT|trace[_ -]?id|session[_ -]?id|lease[_ -]?id|generation|prompt|stdout|raw payload)/i;

function safeText(value: unknown, max = MAX_TEXT) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text || SECRET_PATTERN.test(text) || INTERNAL_PATTERN.test(text)) return "";
  return text.slice(0, max);
}

function list(value: unknown, max = 12) {
  const source = Array.isArray(value) ? value : value == null ? [] : [value];
  return [...new Set(source.map(item => safeText(typeof item === "object" ? (item as any)?.label || (item as any)?.title || (item as any)?.message : item, 180)).filter(Boolean))].slice(0, max);
}

function numeric(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? Math.floor(result) : 0;
}

function verificationCounts(value: unknown) {
  const rows = Array.isArray(value) ? value : [];
  let passed = 0;
  let failed = 0;
  for (const row of rows) {
    const ok = typeof row === "boolean"
      ? row
      : (row as any)?.ok === true
        || (row as any)?.passed === true
        || ["passed", "pass", "success", "completed", "done"].includes(String((row as any)?.status || "").toLowerCase());
    const bad = (row as any)?.ok === false
      || (row as any)?.passed === false
      || (row as any)?.failed === true
      || ["failed", "fail", "blocked", "error", "cancelled"].includes(String((row as any)?.status || "").toLowerCase());
    if (ok) passed += 1;
    else if (bad) failed += 1;
  }
  return { passed, failed };
}

function normalizeStatus(input: any, gatePassed: boolean | undefined): CcmCompletionSummaryStatus {
  const raw = String(input?.status || "").toLowerCase();
  if (input?.source === "terminal_gate") {
    if (gatePassed === true) return "success";
    if (["failed", "fail", "error"].includes(raw)) return "failed";
    if (raw === "blocked") return "blocked";
    if (["cancelled", "canceled"].includes(raw)) return "cancelled";
    if (raw === "interrupted") return "interrupted";
    if (raw === "waiting") return "waiting";
    if (raw === "partial") return "partial";
    return "blocked";
  }
  if (raw === "success" || raw === "completed" || raw === "done") return "success";
  if (raw === "blocked") return "blocked";
  if (raw === "partial") return "partial";
  if (["cancelled", "canceled"].includes(raw)) return "cancelled";
  if (raw === "interrupted") return "interrupted";
  if (raw === "waiting" || raw === "clarify") return "waiting";
  return "failed";
}

export function buildCcmCompletionSummary(input: any = {}): CcmCompletionSummaryV1 {
  const source: CcmCompletionSummaryV1["source"] = input?.source === "terminal_gate" ? "terminal_gate" : "query_projection";
  const gate = input?.terminalGate || input?.terminal_gate;
  const gatePassed = gate && typeof gate === "object"
    ? (gate.passed === true || gate.accepted === true || gate.pass === true)
    : undefined;
  const status = normalizeStatus({ ...input, source }, gatePassed);
  const fileInput = input?.fileChanges || input?.file_changes || (Array.isArray(input?.filesChanged) ? input.filesChanged : []);
  const files = Array.isArray(fileInput)
    ? fileInput
    : [];
  const filePaths = new Set(files.map((file: any) => safeText(typeof file === "string" ? file : file?.path || file?.file, 300)).filter(Boolean));
  const counts = input?.schema === CCM_COMPLETION_SUMMARY_SCHEMA
    ? { passed: numeric(input?.verificationPassed), failed: numeric(input?.verificationFailed) }
    : verificationCounts(input?.verification || input?.verificationResults || input?.verification_results);
  const blockers = list(input?.blockers || input?.unfinished || input?.incomplete);
  const failedChecks = list(gate?.failed_checks || gate?.failedChecks);
  const allBlockers = [...new Set([...blockers, ...failedChecks])].slice(0, 12);
  const headline = safeText(input?.headline || input?.summary || input?.text, 180)
    || (status === "success" ? (source === "terminal_gate" ? "任务已完成，验收通过" : "查询已完成")
      : status === "partial" ? "任务部分完成，仍有事项待处理"
        : status === "waiting" ? "任务正在等待补充信息"
          : status === "cancelled" ? "任务已停止，未正式交付"
            : status === "interrupted" ? "任务已中断，未正式交付"
              : status === "blocked" ? "任务未通过验收，暂未交付"
                : "本轮任务未完成");
  const detail = safeText(input?.detail || input?.statusDetail || input?.status_detail, 240);
  const nextAction = safeText(input?.nextAction || input?.next_action, 180);
  const additions = files.reduce((sum: number, file: any) => sum + numeric(file?.additions), 0);
  const deletions = files.reduce((sum: number, file: any) => sum + numeric(file?.deletions), 0);
  return {
    schema: CCM_COMPLETION_SUMMARY_SCHEMA,
    status,
    headline,
    ...(detail && detail !== headline ? { detail } : {}),
    filesChanged: input?.schema === CCM_COMPLETION_SUMMARY_SCHEMA ? numeric(input?.filesChanged) : filePaths.size || files.length,
    ...((input?.schema === CCM_COMPLETION_SUMMARY_SCHEMA ? numeric(input?.additions) : additions) ? { additions: input?.schema === CCM_COMPLETION_SUMMARY_SCHEMA ? numeric(input?.additions) : additions } : {}),
    ...((input?.schema === CCM_COMPLETION_SUMMARY_SCHEMA ? numeric(input?.deletions) : deletions) ? { deletions: input?.schema === CCM_COMPLETION_SUMMARY_SCHEMA ? numeric(input?.deletions) : deletions } : {}),
    verificationPassed: counts.passed,
    verificationFailed: counts.failed + failedChecks.length,
    ...(nextAction ? { nextAction } : {}),
    blockers: allBlockers,
    ...(numeric(input?.durationMs || input?.duration_ms) ? { durationMs: numeric(input?.durationMs || input?.duration_ms) } : {}),
    source,
    contentStored: false,
  };
}
