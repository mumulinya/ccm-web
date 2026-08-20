import * as crypto from "crypto";
import type { CcmUnifiedSessionSummaryV1 } from "./unified-session-compaction-types";

const SUMMARY_KEYS: Array<keyof CcmUnifiedSessionSummaryV1> = [
  "userGoals", "corrections", "decisions", "authorizationBoundaries",
  "completedWork", "pendingWork", "risksAndBlockers", "fileReferences",
  "verificationEvidence", "attachmentReferences", "nextActions", "sourceMessageIds",
];

function clean(value: unknown, max = 1000) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

function list(value: unknown, max = 48) {
  const values = Array.isArray(value) ? value : value == null || value === "" ? [] : [value];
  return [...new Set(values.map(item => clean(typeof item === "string" ? item : item?.path || item?.file || item?.summary || item?.title || item?.id || item, 1000)).filter(Boolean))].slice(-max);
}

export function unifiedSummaryChecksum(summary: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(summary ?? null)).digest("hex");
}

export function normalizeCcmUnifiedSummary(value: any, sourceMessageIds: string[] = []): CcmUnifiedSessionSummaryV1 {
  const candidate = value?.summary && typeof value.summary === "object" ? value.summary : value || {};
  const aliases: Record<string, keyof CcmUnifiedSessionSummaryV1> = {
    userGoals: "userGoals", user_goals: "userGoals", primaryRequest: "userGoals", userRequests: "userGoals",
    corrections: "corrections", feedback: "corrections",
    decisions: "decisions",
    authorizationBoundaries: "authorizationBoundaries", authorization: "authorizationBoundaries", permissions: "authorizationBoundaries",
    completedWork: "completedWork", keyOutcomes: "completedWork", completed: "completedWork",
    pendingWork: "pendingWork", unresolved: "pendingWork", currentWork: "pendingWork",
    risksAndBlockers: "risksAndBlockers", risks: "risksAndBlockers", errors: "risksAndBlockers", blockers: "risksAndBlockers",
    fileReferences: "fileReferences", filesAndResources: "fileReferences", files: "fileReferences",
    verificationEvidence: "verificationEvidence", verification: "verificationEvidence", tests: "verificationEvidence",
    attachmentReferences: "attachmentReferences", attachments: "attachmentReferences",
    nextActions: "nextActions", nextSteps: "nextActions", next_actions: "nextActions",
    sourceMessageIds: "sourceMessageIds", source_message_ids: "sourceMessageIds",
  };
  const output: Record<string, any> = {
    schema: "ccm-unified-session-summary-v1",
    userGoals: [], corrections: [], decisions: [], authorizationBoundaries: [], completedWork: [],
    pendingWork: [], risksAndBlockers: [], fileReferences: [], verificationEvidence: [],
    attachmentReferences: [], nextActions: [], sourceMessageIds: [...new Set(sourceMessageIds.map(String).filter(Boolean))],
    contentStored: false,
  };
  for (const [key, target] of Object.entries(aliases)) {
    if (candidate[key] !== undefined) output[target] = [...output[target], ...list(candidate[key])];
  }
  for (const key of SUMMARY_KEYS) output[key] = [...new Set((output[key] || []).map(String).filter(Boolean))].slice(-64);
  if (sourceMessageIds.length) output.sourceMessageIds = [...new Set(sourceMessageIds.map(String).filter(Boolean))];
  return output as CcmUnifiedSessionSummaryV1;
}

export function buildUnifiedSummaryReference(snapshot: { messages?: any[]; executionEvents?: any[]; activeSummary?: any }) {
  const messages = Array.isArray(snapshot.messages) ? snapshot.messages : [];
  const events = Array.isArray(snapshot.executionEvents) ? snapshot.executionEvents : [];
  const sourceMessageIds = messages.map((message, index) => String(message?.id || message?.uuid || message?.messageId || `message-${index}`));
  const text = messages.map(message => typeof message?.content === "string" ? message.content : JSON.stringify(message?.content ?? "")).join("\n");
  const files = [...text.matchAll(/(?:[A-Za-z]:[\\/]|\.\.?[\\/]|src[\\/]|backend[\\/]|frontend[\\/])[A-Za-z0-9_./\\-]+/g)].map(match => match[0]);
  const toolFiles = events.flatMap(event => {
    const payload = event?.payload || event?.result || {};
    return list(payload?.path || payload?.file || payload?.files || [], 20);
  });
  return normalizeCcmUnifiedSummary({
    ...(snapshot.activeSummary || {}),
    userGoals: messages.filter(message => message?.role === "user").slice(-8).map(message => message.content),
    fileReferences: [...files, ...toolFiles],
    sourceMessageIds,
  }, sourceMessageIds);
}

export const UNIFIED_COMPACTION_SYSTEM_PROMPT = [
  "You are the CCM unified session compactor.",
  "Summarize only observed session facts for safe continuation.",
  "Preserve user goals, corrections, decisions, authorization boundaries, completed and pending work, risks, file references, verification evidence, attachments, and next actions.",
  "Do not expose hidden reasoning. Do not invent files, commands, results, permissions, or task state.",
  "Return one JSON object with the exact ccm-unified-session-summary-v1 fields.",
  "The source message boundary is authoritative and must be copied exactly.",
].join("\n");

export function buildUnifiedSummaryPrompt(input: { snapshot: any; previousSummary?: any; reason?: string; customInstructions?: string }) {
  const messages = (Array.isArray(input.snapshot?.messages) ? input.snapshot.messages : []).map((message: any) => ({
    id: message?.id || message?.uuid || message?.messageId,
    role: message?.role,
    content: typeof message?.content === "string" ? message.content : message?.content ?? null,
  }));
  return JSON.stringify({
    reason: input.reason || "automatic",
    customInstructions: clean(input.customInstructions, 2000),
    previousSummary: input.previousSummary || null,
    sourceMessageIds: messages.map((message: any) => String(message.id || "")),
    messages,
    executionEventCount: Array.isArray(input.snapshot?.executionEvents) ? input.snapshot.executionEvents.length : 0,
    recoveryContextPresent: Boolean(input.snapshot?.recoveryContext),
    PRESERVATION_REFERENCE: buildUnifiedSummaryReference(input.snapshot),
  });
}

export function runUnifiedSummaryShapeCheck(summary: any) {
  const required = SUMMARY_KEYS.every(key => Array.isArray(summary?.[key]));
  return {
    valid: summary?.schema === "ccm-unified-session-summary-v1" && required && summary?.contentStored === false,
    missing: SUMMARY_KEYS.filter(key => !Array.isArray(summary?.[key])).map(String),
  };
}
