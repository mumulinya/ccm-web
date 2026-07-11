import {
  BrowserCheckResult,
  BrowserRecoveryEvidence,
  BrowserRecoveryEvent,
  BrowserRecoverySummary,
} from "../types";
import { buildBrowserRecoverySummary } from "./recovery-summary";

const SAFE_RECOVERY_OPERATIONS = new Set([
  "action:goto",
  "observation:page_text",
  "telemetry:console",
  "telemetry:network",
  "evidence:screenshot",
]);

const FORBIDDEN_RECOVERY_DETAIL_KEYS = new Set([
  "detail",
  "error",
  "message",
  "output",
  "pageid",
  "pagetext",
  "pagetextpreview",
  "rawerror",
  "reason",
  "tabid",
  "title",
  "url",
]);

function sameJson(left: any, right: any) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizedKey(value: string) {
  return value.replace(/[_-]/g, "").toLowerCase();
}

export function browserRecoveryOperationIsSafe(operation: string) {
  return SAFE_RECOVERY_OPERATIONS.has(String(operation || ""));
}

export function browserRecoveryForbiddenDetailPaths(value: any, path = ""): string[] {
  if (!value || typeof value !== "object") return [];
  const paths: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      paths.push(...browserRecoveryForbiddenDetailPaths(item, `${path}[${index}]`));
    });
    return paths;
  }
  for (const [key, item] of Object.entries(value)) {
    const itemPath = path ? `${path}.${key}` : key;
    if (FORBIDDEN_RECOVERY_DETAIL_KEYS.has(normalizedKey(key))) paths.push(itemPath);
    paths.push(...browserRecoveryForbiddenDetailPaths(item, itemPath));
  }
  return paths;
}

export function browserRecoveryEventErrors(
  event: BrowserRecoveryEvent | Record<string, any>,
  maxAttempts: number,
  label: string,
) {
  const errors: string[] = [];
  const raw = event as Record<string, any>;
  const retrySafe = browserRecoveryOperationIsSafe(String(raw.operation || ""));
  const attempt = Number(raw.attempt);
  const forbidden = browserRecoveryForbiddenDetailPaths(raw);

  if (!["claude-in-chrome", "chrome-devtools"].includes(String(raw.provider || ""))) {
    errors.push(`${label}.provider is not a recovery-capable browser provider.`);
  }
  if (!/^[A-Za-z0-9:_-]+$/.test(String(raw.operation || ""))) {
    errors.push(`${label}.operation is invalid.`);
  }
  if (!["stale_tab", "navigation_context_lost", "transport_disconnected"].includes(String(raw.trigger || ""))) {
    errors.push(`${label}.trigger is invalid.`);
  }
  if (!["recovered", "not_retried", "failed"].includes(String(raw.status || ""))) {
    errors.push(`${label}.status is invalid.`);
  }
  if (raw.retrySafe !== retrySafe) {
    errors.push(`${label}.retrySafe does not match the operation replay policy.`);
  }
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > maxAttempts) {
    errors.push(`${label}.attempt must be within 1..${maxAttempts}.`);
  }
  if ((raw.status === "recovered" || raw.status === "failed") && !retrySafe) {
    errors.push(`${label}.${raw.status} is only valid for a safe replay operation.`);
  }
  if (raw.status === "recovered" && (!raw.contextRefreshed || !raw.createdNewTab)) {
    errors.push(`${label}.recovered must prove context refresh and new-tab creation.`);
  }
  if (raw.status === "not_retried" && retrySafe) {
    errors.push(`${label}.not_retried must describe an unsafe operation.`);
  }
  if (forbidden.length) {
    errors.push(`${label} contains forbidden raw browser detail at ${forbidden.join(", ")}.`);
  }
  return errors;
}

export function browserRecoveryEvidenceErrors(
  evidence: BrowserRecoveryEvidence | Record<string, any> | undefined,
  label = "browser recovery evidence",
) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return [`${label} must be an object.`];
  }
  const errors: string[] = [];
  const raw = evidence as Record<string, any>;
  const maxAttempts = Number(raw.maxAttempts);
  const events = Array.isArray(raw.events) ? raw.events : [];
  const counts = {
    recovered: events.filter(event => event?.status === "recovered").length,
    failed: events.filter(event => event?.status === "failed").length,
    notRetried: events.filter(event => event?.status === "not_retried").length,
  };

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3) {
    errors.push(`${label}.maxAttempts must be an integer within 1..3.`);
  }
  if (!Array.isArray(raw.events)) errors.push(`${label}.events must be an array.`);
  if (Number(raw.attempted) !== events.length) {
    errors.push(`${label}.attempted does not match the recovery event count.`);
  }
  for (const key of ["recovered", "failed", "notRetried"] as const) {
    if (Number(raw[key]) !== counts[key]) {
      errors.push(`${label}.${key} does not match the recovery event statuses.`);
    }
  }
  for (const [index, event] of events.entries()) {
    errors.push(...browserRecoveryEventErrors(
      event,
      Number.isInteger(maxAttempts) && maxAttempts > 0 ? maxAttempts : 1,
      `${label}.events[${index}]`,
    ));
  }
  const forbidden = browserRecoveryForbiddenDetailPaths({
    ...raw,
    events: undefined,
  });
  if (forbidden.length) {
    errors.push(`${label} contains forbidden raw browser detail at ${forbidden.join(", ")}.`);
  }
  return errors;
}

export function browserRecoverySummaryErrors(
  summary: BrowserRecoverySummary | Record<string, any> | undefined,
  results: BrowserCheckResult[],
  label = "browser recovery summary",
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return [`${label} must be an object.`];
  }
  const errors: string[] = [];
  const expected = buildBrowserRecoverySummary(results);
  if (!sameJson(summary, expected)) {
    errors.push(`${label} does not match the summary rebuilt from browser results.`);
  }
  const forbidden = browserRecoveryForbiddenDetailPaths(summary);
  if (forbidden.length) {
    errors.push(`${label} contains forbidden raw browser detail at ${forbidden.join(", ")}.`);
  }
  return errors;
}
