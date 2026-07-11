import {
  AdversarialEvidenceStatus,
  AdversarialEvidenceSummary,
  AdversarialEvidenceSummaryItem,
  BrowserCheckResult,
  HttpCheckResult,
} from "./types";
import { buildAdversarialEvidenceRelevance } from "./adversarial-relevance";

function text(value: any) {
  return String(value || "").trim();
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function resultItems(input: {
  originalUserGoal?: string;
  acceptanceCriteria?: string[];
  httpResults: HttpCheckResult[];
  browserResults: BrowserCheckResult[];
}) {
  const http: AdversarialEvidenceSummaryItem[] = input.httpResults
    .filter(item => item.adversarial === true)
    .map(item => {
      const name = item.name || "HTTP adversarial probe";
      const target = `${String(item.method || "GET").toUpperCase()} ${item.url}`;
      return {
        project: item.project,
        surface: "http",
        name,
        target,
        status: item.status,
        ...(item.probeType ? { probeType: item.probeType } : {}),
        ...buildAdversarialEvidenceRelevance({
          name,
          target,
          probeType: item.probeType,
          context: item.context,
          originalUserGoal: input.originalUserGoal,
          acceptanceCriteria: input.acceptanceCriteria,
        }),
      };
    });
  const browser: AdversarialEvidenceSummaryItem[] = input.browserResults
    .filter(item => item.adversarial === true)
    .map(item => {
      const target = item.url;
      return {
        project: item.project,
        surface: "browser",
        name: item.name,
        target,
        status: item.status,
        ...(item.probeType ? { probeType: item.probeType } : {}),
        ...(item.provider ? { provider: item.provider } : {}),
        ...buildAdversarialEvidenceRelevance({
          name: item.name,
          target,
          probeType: item.probeType,
          context: item.context,
          originalUserGoal: input.originalUserGoal,
          acceptanceCriteria: input.acceptanceCriteria,
        }),
      };
    });
  return [...http, ...browser];
}

function statusFor(
  required: boolean,
  waived: boolean,
  counts: Record<"passed" | "failed" | "blocked" | "skipped", number>,
  passedRelevant: number,
): AdversarialEvidenceStatus {
  if (counts.failed > 0) return "failed";
  if (counts.blocked > 0) return "blocked";
  if (passedRelevant > 0) return "verified";
  if (!required && waived) return "waived";
  if (counts.passed > 0) return "unlinked";
  return "missing";
}

export function buildAdversarialEvidenceSummary(input: {
  required: boolean;
  waiverReason?: string;
  originalUserGoal?: string;
  acceptanceCriteria?: string[];
  httpResults: HttpCheckResult[];
  browserResults: BrowserCheckResult[];
}): AdversarialEvidenceSummary {
  const required = input.required === true;
  const waiverReason = required ? "" : text(input.waiverReason);
  const waived = !required && Boolean(waiverReason);
  const items = resultItems(input);
  const counts = {
    passed: items.filter(item => item.status === "passed").length,
    failed: items.filter(item => item.status === "failed").length,
    blocked: items.filter(item => item.status === "blocked").length,
    skipped: items.filter(item => item.status === "skipped").length,
  };
  const relevantItems = items.filter(item => item.relevance !== "none");
  const passedRelevant = relevantItems.filter(item => item.status === "passed").length;
  const criteriaCovered = (input.acceptanceCriteria || [])
    .filter(criterion => relevantItems.some(item => item.linkedCriteria.includes(criterion)));
  return {
    required,
    waived,
    ...(waiverReason ? { waiverReason } : {}),
    status: statusFor(required, waived, counts, passedRelevant),
    total: items.length,
    ...counts,
    http: items.filter(item => item.surface === "http").length,
    browser: items.filter(item => item.surface === "browser").length,
    relevant: relevantItems.length,
    unlinked: items.length - relevantItems.length,
    passedRelevant,
    goalLinked: relevantItems.filter(item => item.goalLinked).length,
    criteriaCovered,
    probeTypes: uniqueSorted(items.map(item => text(item.probeType))),
    items,
  };
}

export function formatAdversarialEvidenceSummaryLine(summary: AdversarialEvidenceSummary | undefined) {
  if (!summary) {
    return "status=missing; required=yes; waived=no; total=0; passed=0; failed=0; blocked=0; skipped=0; http=0; browser=0; relevant=0; unlinked=0; passedRelevant=0";
  }
  return [
    `status=${summary.status}`,
    `required=${summary.required ? "yes" : "no"}`,
    `waived=${summary.waived ? "yes" : "no"}`,
    `total=${summary.total}`,
    `passed=${summary.passed}`,
    `failed=${summary.failed}`,
    `blocked=${summary.blocked}`,
    `skipped=${summary.skipped}`,
    `http=${summary.http}`,
    `browser=${summary.browser}`,
    `relevant=${summary.relevant}`,
    `unlinked=${summary.unlinked}`,
    `passedRelevant=${summary.passedRelevant}`,
    `goalLinked=${summary.goalLinked}`,
    summary.criteriaCovered.length ? `criteriaCovered=${summary.criteriaCovered.length}` : "",
    summary.probeTypes.length ? `probeTypes=${summary.probeTypes.join(",")}` : "",
    summary.waiverReason ? `waiver=${summary.waiverReason}` : "",
  ].filter(Boolean).join("; ");
}

export function adversarialEvidenceSummaryErrors(
  summary: AdversarialEvidenceSummary | Record<string, any> | undefined,
  httpResults?: HttpCheckResult[],
  browserResults?: BrowserCheckResult[],
  originalUserGoal = "",
  acceptanceCriteria: string[] = [],
  label = "adversarial evidence summary",
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return [`${label} must be an object.`];
  }
  const errors: string[] = [];
  const allowedKeys = new Set([
    "required",
    "waived",
    "waiverReason",
    "status",
    "total",
    "passed",
    "failed",
    "blocked",
    "skipped",
    "http",
    "browser",
    "relevant",
    "unlinked",
    "passedRelevant",
    "goalLinked",
    "criteriaCovered",
    "probeTypes",
    "items",
  ]);
  const allowedItemKeys = new Set([
    "project",
    "surface",
    "name",
    "target",
    "status",
    "probeType",
    "provider",
    "relevance",
    "linkedCriteria",
    "goalLinked",
    "matchScore",
  ]);
  for (const key of Object.keys(summary)) {
    if (!allowedKeys.has(key)) errors.push(`${label}.${key} is not permitted.`);
  }
  const items = Array.isArray(summary.items) ? summary.items : [];
  for (const [index, item] of items.entries()) {
    for (const key of Object.keys(item || {})) {
      if (!allowedItemKeys.has(key)) errors.push(`${label}.items[${index}].${key} is not permitted.`);
    }
  }
  if (summary.required === true && summary.waived === true) {
    errors.push(`${label} cannot be both required and waived.`);
  }
  if (summary.required === true && text(summary.waiverReason)) {
    errors.push(`${label}.waiverReason is not permitted when the probe is required.`);
  }
  if (summary.required === false && summary.waived !== true) {
    errors.push(`${label}.waived must be true when the probe requirement is disabled.`);
  }
  if (summary.waived === true && !text(summary.waiverReason)) {
    errors.push(`${label}.waiverReason is required for a waiver.`);
  }
  if (httpResults && browserResults) {
    const expected = buildAdversarialEvidenceSummary({
      required: summary.required === true,
      waiverReason: text(summary.waiverReason),
      originalUserGoal,
      acceptanceCriteria,
      httpResults,
      browserResults,
    });
    if (JSON.stringify(summary) !== JSON.stringify(expected)) {
      errors.push(`${label} does not match adversarial HTTP/browser results.`);
    }
  }
  return errors;
}
