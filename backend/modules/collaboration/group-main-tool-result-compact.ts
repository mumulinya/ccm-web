import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { estimateTextTokens } from "../../system/context-budget";
import { applyCompactedToolResultsToMessages } from "../../agents/native-query-messages";
import type { LlmChatMessage } from "./group-orchestrator-llm-client";
import {
  DEFAULT_MAX_RESULT_SIZE_CHARS,
  isPersistedToolResult,
  persistNativeToolResultRows,
  type ToolResultPersistContext,
} from "../../tools/tool-result-storage";

function cloneRow(row: any) {
  if (!row || typeof row !== "object") return row;
  const next = { ...row };
  if (row.rawOutput && typeof row.rawOutput === "object") next.rawOutput = Array.isArray(row.rawOutput) ? [...row.rawOutput] : { ...row.rawOutput };
  return next;
}

function payloadBody(raw: any) {
  return raw?.modelPayload && typeof raw.modelPayload === "object" ? raw.modelPayload : raw;
}

function isWorkspaceFileRead(row: any, raw: any) {
  const name = String(row?.name || "");
  if (/(?:^|__)read_files?$/i.test(name)) return true;
  const body = payloadBody(raw) || {};
  const type = String(body?.type || raw?.type || "");
  if (type === "text" || type === "text_batch") return true;
  return /workspace-read-(?:files-)?result|workspace-tool-envelope/.test(String(raw?.schema || body?.schema || ""));
}

function catNLines(rows: any[] = []) {
  return rows.map((row: any) => `${String(row?.line ?? "").padStart(6)}\t${row?.text ?? row ?? ""}`).join("\n");
}

function fileReadCatN(raw: any) {
  const body = payloadBody(raw) || {};
  const files = Array.isArray(body?.files) ? body.files : Array.isArray(body?.lines) ? [body] : [];
  return files.map((file: any) => {
    const pathLabel = String(file?.path || body?.path || "").trim();
    const content = catNLines(Array.isArray(file?.lines) ? file.lines : []);
    return pathLabel ? `${pathLabel}\n${content}` : content;
  }).filter(Boolean).join("\n\n");
}

function compactOne(row: any) {
  const next = cloneRow(row);
  const raw = next.rawOutput && typeof next.rawOutput === "object" && !Array.isArray(next.rawOutput) ? next.rawOutput : null;
  let changed = false;
  if (isWorkspaceFileRead(next, raw)) {
    const catN = fileReadCatN(raw);
    if (catN && catN !== String(next.output || "")) {
      next.output = catN;
      changed = true;
    }
    if (changed) {
      next.outputTokens = estimateTextTokens(String(next.output || ""));
      next.compacted = true;
    }
    return { row: next, changed };
  }
  if (isPersistedToolResult(next.output) || isPersistedToolResult(raw)) {
    return { row: next, changed: false };
  }
  if (raw) {
    next.rawOutput = raw;
    next.output = typeof next.output === "string" ? next.output : JSON.stringify(raw);
  }
  if (changed) {
    next.outputTokens = estimateTextTokens(String(next.output || ""));
    next.compacted = true;
  }
  return { row: next, changed };
}

function stripBody(row: any) {
  if (isPersistedToolResult(row?.output) || isPersistedToolResult(row?.rawOutput)) return row;
  const next = cloneRow(row);
  const summary = String(next.error || next.reason || next.name || "tool").slice(0, 240);
  next.rawOutput = undefined;
  next.output = JSON.stringify({ name: next.name, ok: next.ok !== false, truncated: true, summary });
  next.outputTokens = estimateTextTokens(next.output);
  next.compacted = true;
  return next;
}

function tokenSum(rows: any[]) {
  return rows.reduce((sum, row) => sum + Math.max(0, Number(row?.outputTokens) || estimateTextTokens(String(row?.output || ""))), 0);
}

export function compactGroupMainToolResultsForPayload(rows: any[] = [], budgetTokens = 40_000, persistContext?: ToolResultPersistContext | null) {
  const budget = Math.max(1_000, Number(budgetTokens) || 40_000);
  const persisted = persistNativeToolResultRows(Array.isArray(rows) ? rows : [], persistContext);
  const next = persisted.rows.map(cloneRow);
  const before = tokenSum(next);
  if (before <= budget) return { rows: next, changed: persisted.changed, tokens: before };

  let changed = persisted.changed;
  const ranked = [...next.keys()].sort((left, right) => (
    (Number(next[right]?.outputTokens) || 0) - (Number(next[left]?.outputTokens) || 0)
  ));
  for (const index of ranked) {
    if (tokenSum(next) <= budget) break;
    const compacted = compactOne(next[index]);
    next[index] = compacted.row;
    changed = changed || compacted.changed;
  }
  if (persistContext?.sessionId) {
    const extra = persistNativeToolResultRows(next, persistContext);
    for (let index = 0; index < next.length; index += 1) next[index] = extra.rows[index];
    changed = changed || extra.changed;
  }
  for (const index of ranked) {
    if (tokenSum(next) <= budget) break;
    if (isWorkspaceFileRead(next[index], next[index]?.rawOutput)) continue;
    next[index] = stripBody(next[index]);
    changed = true;
  }
  for (const index of ranked) {
    if (tokenSum(next) <= budget) break;
    next[index] = stripBody(next[index]);
    changed = true;
  }
  return { rows: next, changed, tokens: tokenSum(next) };
}

export function compactGroupNativeTranscript(
  messages: LlmChatMessage[],
  rows: any[] = [],
  budgetTokens = 40_000,
  persistContext?: ToolResultPersistContext | null,
) {
  const compacted = compactGroupMainToolResultsForPayload(rows, Math.max(1_000, Math.min(40_000, Number(budgetTokens) || 40_000)), persistContext);
  if (!compacted.changed) return { messages, rows: compacted.rows, changed: false, tokens: compacted.tokens };
  return {
    messages: applyCompactedToolResultsToMessages(messages, compacted.rows),
    rows: compacted.rows,
    changed: true,
    tokens: compacted.tokens,
  };
}

export function runGroupMainToolResultCompactSelfTest() {
  const bulky = {
    name: "grep_text",
    ok: true,
    outputTokens: 12_000,
    rawOutput: { lines: Array.from({ length: 80 }, (_, index) => `src/a.ts:${index}:recommend`) },
    output: JSON.stringify({ lines: Array.from({ length: 80 }, (_, index) => `src/a.ts:${index}:recommend`) }),
  };
  const result = compactGroupMainToolResultsForPayload([bulky, { name: "list_directory", ok: true, outputTokens: 20, output: "{}" }], 2_000);
  const fileLines = Array.from({ length: 80 }, (_, index) => ({ line: index + 1, text: `export const v${index} = ${index};` }));
  const fileRead = {
    name: "read_file",
    ok: true,
    outputTokens: 18_000,
    rawOutput: {
      schema: "ccm-workspace-tool-envelope-v3",
      modelPayload: { type: "text", path: "src/service.ts", lines: fileLines },
    },
    output: JSON.stringify({ schema: "ccm-workspace-tool-envelope-v3", modelPayload: { type: "text", path: "src/service.ts", lines: fileLines } }),
  };
  const fileResult = compactGroupMainToolResultsForPayload([fileRead, bulky], 8_000);
  const transcript = compactGroupNativeTranscript([
    { role: "assistant", content: "", tool_calls: [{ id: "call_grep", type: "function", function: { name: "grep_text", arguments: "{}" } }] } as any,
    { role: "tool", tool_call_id: "call_grep", name: "grep_text", content: bulky.output },
    { role: "assistant", content: "", tool_calls: [{ id: "call_ls", type: "function", function: { name: "list_directory", arguments: "{}" } }] } as any,
    { role: "tool", tool_call_id: "call_ls", name: "list_directory", content: "{}" },
  ], [
    { ...bulky, toolCallId: "call_grep" },
    { name: "list_directory", ok: true, outputTokens: 20, output: "{}", toolCallId: "call_ls" },
  ], 2_000);
  const rewritten = String((transcript.messages.find((item: any) => item?.tool_call_id === "call_grep") as any)?.content || "");
  const persistContext = { scope: "group", sessionId: `gcs_compact_${Date.now()}_${process.pid}` };
  try {
    const huge = {
      name: "grep_text",
      ok: true,
      toolCallId: "call_huge",
      output: { lines: Array.from({ length: 3_000 }, (_, index) => `row-${index}-${"y".repeat(20)}`) },
    };
    const persisted = compactGroupMainToolResultsForPayload([huge], 40_000, persistContext);
    const checks = {
      reducedTokens: result.tokens < 12_000 && result.changed === true,
      keptGrepPreview: String(result.rows[0]?.output || "").includes("truncated"),
      keptSmallRow: result.rows[1]?.name === "list_directory",
      fileReadKeepsContent: /export const v0/.test(String(fileResult.rows[0]?.output || ""))
        && /export const v79/.test(String(fileResult.rows[0]?.output || ""))
        && Array.isArray(fileResult.rows[0]?.rawOutput?.modelPayload?.lines)
        && fileResult.rows[0].rawOutput.modelPayload.lines.length === 80,
      transcriptRewritesToolResult: transcript.changed === true
        && rewritten.length > 0
        && rewritten.length < bulky.output.length
        && rewritten !== bulky.output,
      persistOversizePreview: isPersistedToolResult(persisted.rows[0]?.output) === true
        && String(persisted.rows[0]?.output?.preview || "").includes("<persisted-output>")
        && JSON.stringify(huge.output).length > DEFAULT_MAX_RESULT_SIZE_CHARS,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
  } finally {
    try { fs.rmSync(path.join(CCM_DIR, "tool-results", "group", persistContext.sessionId), { recursive: true, force: true }); } catch {}
  }
}
