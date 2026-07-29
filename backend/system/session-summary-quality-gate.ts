import * as crypto from "crypto";

type SummaryQualityScope = "global" | "group" | "project" | "music" | "other";

function checksum(value: any) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}

function text(value: any): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join("\n");
  if (value && typeof value === "object") return Object.entries(value)
    .filter(([key]) => !/sourceMessageIds|source_message_ids/i.test(key))
    .map(([, item]) => text(item)).filter(Boolean).join("\n");
  return "";
}

function normalized(value: any) {
  return text(value).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function terms(value: any) {
  return new Set(text(value).toLowerCase().match(/[\p{Script=Han}]{2,}|[a-z0-9_.\-/]{3,}/gu) || []);
}

function represented(anchor: string, summaryText: string, summaryTerms: Set<string>) {
  const exact = normalized(anchor);
  const target = normalized(summaryText);
  if (!exact) return true;
  if (target.includes(exact)) return true;
  const anchorTerms = terms(anchor);
  if (!anchorTerms.size) return false;
  let hits = 0;
  for (const term of anchorTerms) if (summaryTerms.has(term)) hits += 1;
  return hits / anchorTerms.size >= 0.72;
}

function anchorValues(reference: any) {
  if (!reference || typeof reference !== "object") return [] as string[];
  const durableKeys = [
    "userAnchors", "feedback", "authorization", "decisions", "references", "unresolved",
    "filesAndResources", "preferences", "dislikes", "artistsAndGenres", "playbackDecisions",
    "persistentRequirements", "blockedItems", "constraints",
  ];
  return [...new Set(durableKeys.flatMap(key => Array.isArray(reference[key]) ? reference[key].map(String) : []))].filter(Boolean);
}

export function evaluateSessionSummaryQuality(input: {
  scope: SummaryQualityScope;
  scopeId?: string;
  sessionId: string;
  summary: any;
  reference?: any;
  previousSummary?: any;
  sourceMessages?: any[];
  sourceMessageIds?: string[];
}) {
  const sourceIds = (input.sourceMessageIds || []).map(String);
  const actualIds = Array.isArray(input.summary?.sourceMessageIds) ? input.summary.sourceMessageIds.map(String) : [];
  const summaryText = text(input.summary);
  const sourceText = text(input.sourceMessages || []);
  const summaryTerms = terms(summaryText);
  const sourceTerms = terms(sourceText);
  const anchors = anchorValues(input.reference);
  const missingAnchors = anchors.filter(anchor => !represented(anchor, summaryText, summaryTerms));
  const issues: string[] = [];

  if (!input.summary || typeof input.summary !== "object" || Array.isArray(input.summary)) issues.push("summary_not_object");
  if (sourceIds.length && (actualIds.length !== sourceIds.length || actualIds.some((id, index) => id !== sourceIds[index]))) issues.push("source_boundary_mismatch");
  if (sourceIds.length && !summaryText.trim()) issues.push("summary_core_empty");
  if (missingAnchors.length) issues.push("durable_anchor_missing");

  const meaningfulSummaryTerms = [...summaryTerms].filter(term => term.length >= 3);
  const groundedTerms = meaningfulSummaryTerms.filter(term => sourceTerms.has(term) || terms(input.reference).has(term));
  const groundingRatio = meaningfulSummaryTerms.length ? groundedTerms.length / meaningfulSummaryTerms.length : 1;
  if (sourceText && meaningfulSummaryTerms.length >= 8 && groundingRatio < 0.18) issues.push("summary_weakly_grounded");

  const previousAnchors = anchorValues(input.previousSummary);
  const previousContinuityCount = previousAnchors.filter(anchor => represented(anchor, summaryText, summaryTerms)).length;
  const continuityRatio = previousAnchors.length ? previousContinuityCount / previousAnchors.length : 1;
  if (previousAnchors.length >= 3 && continuityRatio < 0.5) issues.push("previous_summary_continuity_low");

  const score = Math.max(0, Math.min(100, Math.round(
    100
    - missingAnchors.length * 10
    - (issues.includes("source_boundary_mismatch") ? 35 : 0)
    - (issues.includes("summary_core_empty") ? 35 : 0)
    - (issues.includes("summary_weakly_grounded") ? 15 : 0)
    - (issues.includes("previous_summary_continuity_low") ? 15 : 0)
  )));
  const receipt: any = {
    schema: "ccm-session-summary-quality-gate-v1",
    version: 1,
    scope: input.scope,
    scopeId: String(input.scopeId || input.sessionId || ""),
    sessionId: String(input.sessionId || ""),
    sourceMessageCount: sourceIds.length,
    sourceBoundaryChecksum: checksum(sourceIds),
    summaryChecksum: checksum(input.summary),
    anchorCount: anchors.length,
    missingAnchorCount: missingAnchors.length,
    missingAnchorChecksums: missingAnchors.map(checksum).slice(0, 24),
    groundingRatio: Math.round(groundingRatio * 10_000) / 10_000,
    previousContinuityRatio: Math.round(continuityRatio * 10_000) / 10_000,
    score,
    valid: issues.length === 0,
    issues: [...new Set(issues)],
    contentStored: false,
    evaluatedAt: new Date().toISOString(),
    checksum: "",
  };
  receipt.checksum = checksum(receipt);
  return receipt;
}

export function runSessionSummaryQualityGateSelfTest() {
  const sourceMessageIds = ["m1", "m2"];
  const reference = { authorization: ["只能修改项目目录"], unresolved: ["登录测试仍待处理"] };
  const pass = evaluateSessionSummaryQuality({
    scope: "project", sessionId: "p1", sourceMessageIds, reference,
    sourceMessages: [{ content: "只能修改项目目录，登录测试仍待处理" }],
    summary: { authorization: ["只能修改项目目录"], unresolved: ["登录测试仍待处理"], sourceMessageIds },
  });
  const fail = evaluateSessionSummaryQuality({
    scope: "project", sessionId: "p1", sourceMessageIds, reference,
    sourceMessages: [{ content: "只能修改项目目录，登录测试仍待处理" }],
    summary: { latestOutcome: "全部完成并通过验收", sourceMessageIds },
  });
  return {
    pass: pass.valid && !fail.valid && fail.issues.includes("durable_anchor_missing"),
    checks: { validSummaryAccepted: pass.valid, lossySummaryRejected: !fail.valid, contentStored: pass.contentStored === false },
  };
}
