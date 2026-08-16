import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../core/utils";
import { isWorkspaceToolResultReference } from "../system/context-source-tool-result-projection";

export const DEFAULT_MAX_RESULT_SIZE_CHARS = 50_000;
export const MAX_TOOL_RESULTS_PER_MESSAGE_CHARS = 200_000;
export const PREVIEW_SIZE_BYTES = 2_000;
export const PERSISTED_OUTPUT_TAG = "<persisted-output>";
export const PERSISTED_OUTPUT_CLOSING_TAG = "</persisted-output>";
export const TOOL_RESULT_CLEARED_MESSAGE = "[Old tool result content cleared]";
export const PERSISTED_TOOL_RESULT_SCHEMA = "ccm-persisted-tool-result-v1";

const SKIP_PERSIST_TOOLS = /(?:^|_)(?:read_files?|read_file)$/i;
const IMAGE_HINT = /data:(?:image|application\/pdf)\/[a-z0-9.+-]+;base64,/i;

export type ToolResultPersistContext = {
  scope: string;
  sessionId: string;
};

export type PersistedToolResultV1 = {
  schema: typeof PERSISTED_TOOL_RESULT_SCHEMA;
  version: 1;
  toolCallId: string;
  toolName: string;
  preview: string;
  originalChars: number;
  bytes: number;
  checksum: string;
  locator: string;
  path: string;
  contentStored: true;
};

type ReplacementStore = {
  schema: "ccm-tool-result-replacement-state-v1";
  replacements: Record<string, string>;
  seenUnreplaced: string[];
};

function safePart(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "unknown";
}

function serialize(value: any) {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value ?? null); }
  catch { return String(value ?? ""); }
}

function resultsDir(context: ToolResultPersistContext) {
  return path.join(CCM_DIR, "tool-results", safePart(context.scope), safePart(context.sessionId));
}

function replacementFile(context: ToolResultPersistContext) {
  return path.join(resultsDir(context), "replacements.json");
}

function resultFile(context: ToolResultPersistContext, toolCallId: string) {
  return path.join(resultsDir(context), `${safePart(toolCallId)}.json`);
}

function readReplacementStore(context: ToolResultPersistContext): ReplacementStore {
  const fallback: ReplacementStore = { schema: "ccm-tool-result-replacement-state-v1", replacements: {}, seenUnreplaced: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(replacementFile(context), "utf8"));
    if (parsed?.schema !== fallback.schema) return fallback;
    return {
      schema: fallback.schema,
      replacements: parsed.replacements && typeof parsed.replacements === "object" ? parsed.replacements : {},
      seenUnreplaced: Array.isArray(parsed.seenUnreplaced) ? parsed.seenUnreplaced.map(String) : [],
    };
  } catch {
    return fallback;
  }
}

function writeReplacementStore(context: ToolResultPersistContext, store: ReplacementStore) {
  fs.mkdirSync(resultsDir(context), { recursive: true });
  const file = replacementFile(context);
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(store, null, 2), "utf8");
  fs.renameSync(temp, file);
}

function freezeReplacement(context: ToolResultPersistContext, toolCallId: string, preview: string) {
  const store = readReplacementStore(context);
  if (store.replacements[toolCallId] === preview) return preview;
  if (store.replacements[toolCallId]) return store.replacements[toolCallId];
  store.replacements[toolCallId] = preview;
  store.seenUnreplaced = store.seenUnreplaced.filter(id => id !== toolCallId);
  writeReplacementStore(context, store);
  return preview;
}

export function markToolResultSeenUnreplaced(context: ToolResultPersistContext, toolCallId: string) {
  const id = String(toolCallId || "").trim();
  if (!id) return;
  const store = readReplacementStore(context);
  if (store.replacements[id] || store.seenUnreplaced.includes(id)) return;
  store.seenUnreplaced = [...store.seenUnreplaced, id].slice(-2_000);
  writeReplacementStore(context, store);
}

export function frozenToolResultPreview(context: ToolResultPersistContext, toolCallId: string) {
  return readReplacementStore(context).replacements[String(toolCallId || "")] || "";
}

export function wasToolResultSentUnreplaced(context: ToolResultPersistContext, toolCallId: string) {
  return readReplacementStore(context).seenUnreplaced.includes(String(toolCallId || ""));
}

export function isPersistedToolResult(value: any): value is PersistedToolResultV1 {
  return !!value && typeof value === "object" && value.schema === PERSISTED_TOOL_RESULT_SCHEMA && value.contentStored === true;
}

export function shouldSkipToolResultPersist(toolName: string, value: any) {
  if (SKIP_PERSIST_TOOLS.test(String(toolName || ""))) return true;
  if (isPersistedToolResult(value) || isPersistedToolResult(value?.observation)) return true;
  if (isWorkspaceToolResultReference(value) || isWorkspaceToolResultReference(value?.observation)) return true;
  if (value?.contentStored === false && /ccm-context-source-tool-result-reference/.test(String(value?.schema || ""))) return true;
  const text = serialize(value);
  return IMAGE_HINT.test(text);
}

function previewFrom(text: string) {
  const buffer = Buffer.from(text, "utf8");
  if (buffer.length <= PREVIEW_SIZE_BYTES) return text;
  let cut = PREVIEW_SIZE_BYTES;
  while (cut > 0 && (buffer[cut] & 0xc0) === 0x80) cut -= 1;
  let slice = buffer.slice(0, cut).toString("utf8");
  const newline = slice.lastIndexOf("\n");
  if (newline > PREVIEW_SIZE_BYTES / 2) slice = slice.slice(0, newline);
  return slice;
}

export function modelVisiblePersistedToolResult(value: PersistedToolResultV1 | string) {
  if (typeof value === "string") return value;
  if (value?.preview) return value.preview;
  return serialize(value);
}

export function modelVisibleToolResultValue(value: any) {
  if (isPersistedToolResult(value)) return modelVisiblePersistedToolResult(value);
  if (isPersistedToolResult(value?.observation)) return modelVisiblePersistedToolResult(value.observation);
  return value;
}

function buildPreviewMessage(input: {
  toolCallId: string;
  toolName: string;
  originalChars: number;
  bytes: number;
  checksum: string;
  locator: string;
  filePath: string;
  body: string;
}) {
  const head = previewFrom(input.body);
  return [
    head,
    "",
    PERSISTED_OUTPUT_TAG,
    `path=${input.filePath}`,
    `tool_call_id=${input.toolCallId}`,
    `tool=${input.toolName}`,
    `bytes=${input.bytes}`,
    `original_chars=${input.originalChars}`,
    `checksum=${input.checksum}`,
    `locator=${input.locator}`,
    PERSISTED_OUTPUT_CLOSING_TAG,
  ].join("\n");
}

export function persistToolResultIfNeeded(input: {
  toolName: string;
  toolCallId: string;
  payload: any;
  context?: ToolResultPersistContext | null;
  thresholdChars?: number;
}): any {
  const payload = input.payload;
  const context = input.context;
  if (!context?.scope || !context?.sessionId) return payload;
  if (shouldSkipToolResultPersist(input.toolName, payload)) return payload;
  const toolCallId = String(input.toolCallId || "").trim();
  if (!toolCallId) return payload;
  const frozen = frozenToolResultPreview(context, toolCallId);
  if (frozen) {
    const existing = isPersistedToolResult(payload) ? payload : null;
    return {
      schema: PERSISTED_TOOL_RESULT_SCHEMA,
      version: 1,
      toolCallId,
      toolName: String(existing?.toolName || input.toolName || "tool"),
      preview: frozen,
      originalChars: Number(existing?.originalChars || serialize(payload).length),
      bytes: Number(existing?.bytes || Buffer.byteLength(serialize(payload))),
      checksum: String(existing?.checksum || ""),
      locator: String(existing?.locator || `tool-results:${context.scope}:${context.sessionId}:${toolCallId}`),
      path: String(existing?.path || resultFile(context, toolCallId)),
      contentStored: true as const,
    } satisfies PersistedToolResultV1;
  }
  if (wasToolResultSentUnreplaced(context, toolCallId)) return payload;
  const body = serialize(payload);
  const threshold = Math.max(1, Number(input.thresholdChars || DEFAULT_MAX_RESULT_SIZE_CHARS));
  if (body.length <= threshold) return payload;
  const filePath = resultFile(context, toolCallId);
  const checksum = crypto.createHash("sha256").update(body).digest("hex");
  const locator = `tool-results:${context.scope}:${context.sessionId}:${toolCallId}`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  try {
    fs.writeFileSync(filePath, body, { encoding: "utf8", flag: "wx" });
  } catch (error: any) {
    if (error?.code !== "EEXIST") return payload;
  }
  const preview = freezeReplacement(context, toolCallId, buildPreviewMessage({
    toolCallId,
    toolName: String(input.toolName || "tool"),
    originalChars: body.length,
    bytes: Buffer.byteLength(body),
    checksum,
    locator,
    filePath,
    body,
  }));
  return {
    schema: PERSISTED_TOOL_RESULT_SCHEMA,
    version: 1,
    toolCallId,
    toolName: String(input.toolName || "tool"),
    preview,
    originalChars: body.length,
    bytes: Buffer.byteLength(body),
    checksum,
    locator,
    path: filePath,
    contentStored: true as const,
  } satisfies PersistedToolResultV1;
}

export function persistPayloadObservation(input: {
  toolName: string;
  toolCallId: string;
  payload: any;
  context?: ToolResultPersistContext | null;
  thresholdChars?: number;
}) {
  const payload = input.payload;
  if (payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "observation")) {
    const observation = persistToolResultIfNeeded({
      ...input,
      payload: payload.observation,
    });
    return observation === payload.observation ? payload : { ...payload, observation };
  }
  return persistToolResultIfNeeded(input);
}

function resultChars(value: any) {
  if (isPersistedToolResult(value)) return String(value.preview || "").length;
  return serialize(value).length;
}

export function enforceToolResultBudget<T extends { callId?: string; toolCallId?: string; name?: string; output?: any }>(
  rows: T[],
  context: ToolResultPersistContext,
  maxChars = MAX_TOOL_RESULTS_PER_MESSAGE_CHARS,
): { rows: T[]; changed: boolean } {
  const next = (Array.isArray(rows) ? rows : []).map(row => ({ ...row }));
  let changed = false;
  const total = () => next.reduce((sum, row) => sum + resultChars(row.output), 0);
  if (total() <= maxChars) return { rows: next, changed };
  const ranked = [...next.keys()].sort((left, right) => resultChars(next[right].output) - resultChars(next[left].output));
  for (const index of ranked) {
    if (total() <= maxChars) break;
    const row = next[index];
    const toolCallId = String(row.callId || row.toolCallId || "");
    const persisted = persistToolResultIfNeeded({
      toolName: String(row.name || "tool"),
      toolCallId,
      payload: row.output,
      context,
      thresholdChars: 1,
    });
    if (persisted !== row.output) {
      next[index] = { ...row, output: persisted };
      changed = true;
    }
  }
  return { rows: next, changed };
}

export function persistNativeToolResultRows<T extends { callId?: string; toolCallId?: string; name?: string; output?: any }>(
  rows: T[],
  context?: ToolResultPersistContext | null,
): { rows: T[]; changed: boolean } {
  if (!context?.scope || !context?.sessionId) return { rows: Array.isArray(rows) ? rows.slice() : [], changed: false };
  let changed = false;
  const next = (Array.isArray(rows) ? rows : []).map(row => {
    const persisted = persistToolResultIfNeeded({
      toolName: String(row.name || "tool"),
      toolCallId: String(row.callId || row.toolCallId || ""),
      payload: row.output,
      context,
    });
    if (persisted === row.output) return { ...row };
    changed = true;
    return { ...row, output: persisted };
  });
  const budgeted = enforceToolResultBudget(next, context);
  return { rows: budgeted.rows, changed: changed || budgeted.changed };
}

export function runToolResultStorageSelfTest() {
  const context = { scope: "group", sessionId: `gcs_persist_${Date.now()}_${process.pid}` };
  try {
    const bulky = { lines: Array.from({ length: 4_000 }, (_, index) => `row-${index}-${"x".repeat(20)}`) };
    const first = persistToolResultIfNeeded({
      toolName: "grep_text",
      toolCallId: "call_persist_1",
      payload: bulky,
      context,
    });
    const second = persistToolResultIfNeeded({
      toolName: "grep_text",
      toolCallId: "call_persist_1",
      payload: bulky,
      context,
    });
    const tiny = persistToolResultIfNeeded({
      toolName: "list_directory",
      toolCallId: "call_small",
      payload: { ok: true },
      context,
    });
    const skippedRead = persistToolResultIfNeeded({
      toolName: "read_file",
      toolCallId: "call_read",
      payload: { content: "y".repeat(DEFAULT_MAX_RESULT_SIZE_CHARS + 10) },
      context,
    });
    markToolResultSeenUnreplaced(context, "call_small");
    const frozenAfterFull = persistToolResultIfNeeded({
      toolName: "grep_text",
      toolCallId: "call_small",
      payload: { lines: Array.from({ length: 8_000 }, (_, index) => `later-${index}`) },
      context,
    });
    const checks = {
      persistedSchema: isPersistedToolResult(first) === true,
      previewStable: isPersistedToolResult(first) && isPersistedToolResult(second) && first.preview === second.preview,
      fileExists: isPersistedToolResult(first) && fs.existsSync(first.path),
      previewHasTag: isPersistedToolResult(first) && first.preview.includes(PERSISTED_OUTPUT_TAG),
      smallUnchanged: tiny?.ok === true,
      readFileSkipped: typeof skippedRead?.content === "string",
      alreadySentFullNotReplaced: Array.isArray(frozenAfterFull?.lines) === true
        && frozenAfterFull.lines.length === 8_000
        && isPersistedToolResult(frozenAfterFull) === false,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
  } finally {
    try { fs.rmSync(resultsDir(context), { recursive: true, force: true }); } catch {}
  }
}
