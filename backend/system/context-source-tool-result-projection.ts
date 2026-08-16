import * as crypto from "crypto";
import { estimateTextTokens } from "./context-budget";

export type ContextSourceToolResultReferenceV1 = {
  schema: "ccm-context-source-tool-result-reference-v1";
  version: 1;
  toolName: string;
  sourceKinds: Array<"knowledge" | "shared_file" | "web">;
  sources: Array<{
    sourceKind: "knowledge" | "shared_file" | "web";
    sourceId: string;
    documentName: string;
    chunkIds: string[];
    revision: string;
    checksum: string;
    citations: string[];
    tokenCount: number;
  }>;
  queryChecksum: string;
  resultChecksum: string;
  tokenCount: number;
  truncated: boolean;
  complete: boolean;
  contentStored: false;
};

const SOURCE_TOOL_NAMES = new Set([
  "query_knowledge",
  "search_knowledge",
  "read_knowledge_document",
  "read_shared_files",
  "read_global_shared_files",
  "web_fetch",
  "web_search",
]);

function checksum(value: any) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}

function clean(value: any, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function unique(values: any[], max = 200) {
  return [...new Set(values.map(value => clean(value)).filter(Boolean))].slice(0, max);
}

function parseValue(value: any) {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text || !["{", "["].includes(text[0])) return value;
  try { return JSON.parse(text); } catch { return value; }
}

function nestedCandidates(value: any) {
  const root = parseValue(value);
  if (!root || typeof root !== "object") return [root];
  return [
    root,
    parseValue(root.observation),
    parseValue(root.result),
    parseValue(root.output),
    parseValue(root.rawOutput || root.raw_output),
    parseValue(root.result?.result),
    parseValue(root.modelPayload || root.model_payload),
  ].filter(candidate => candidate != null);
}

function detectedToolName(toolName: any, value: any) {
  const direct = clean(toolName, 240);
  if (SOURCE_TOOL_NAMES.has(direct)) return direct;
  const candidates = nestedCandidates(value);
  for (const candidate of candidates) {
    const names = [candidate?.toolName, candidate?.tool_name, candidate?.name, candidate?.canonicalName, candidate?.canonical_name, candidate?.tool]
      .map(item => clean(item, 240));
    const matched = names.find(name => SOURCE_TOOL_NAMES.has(name) || /(?:^|__)(search_knowledge|read_knowledge_document)$/.test(name));
    if (matched) return matched.includes("search_knowledge") ? "search_knowledge" : matched.includes("read_knowledge_document") ? "read_knowledge_document" : matched;
  }
  return "";
}

function knowledgeSources(candidates: any[]) {
  const rows: any[] = [];
  for (const candidate of candidates) {
    const results = [
      ...(Array.isArray(candidate?.results) ? candidate.results : []),
      ...(Array.isArray(candidate?.sourceReferences) ? candidate.sourceReferences : []),
      ...(Array.isArray(candidate?.source_references) ? candidate.source_references : []),
      ...(Array.isArray(candidate?.contextSourceRefs) ? candidate.contextSourceRefs : []),
      ...(Array.isArray(candidate?.context_source_refs) ? candidate.context_source_refs : []),
    ];
    for (const result of results) {
      const sourceKind = clean(result?.sourceKind || result?.source_kind);
      if (sourceKind && sourceKind !== "knowledge") continue;
      const sourceId = clean(result?.filename || result?.documentName || result?.document_name || result?.sourceId || result?.source_id);
      if (!sourceId) continue;
      const citation = clean(result?.citation || result?.chunkId || result?.chunk_id);
      rows.push({
        sourceKind: "knowledge" as const,
        sourceId,
        documentName: sourceId,
        chunkIds: unique([citation]),
        revision: clean(result?.revision),
        checksum: clean(result?.checksum, 300),
        citations: unique([citation]),
        tokenCount: Math.max(0, Math.floor(Number(result?.tokenCount || result?.token_count || 0))),
      });
    }
    const filename = clean(candidate?.filename);
    if (filename) {
      const citations = unique(Array.isArray(candidate?.citations) ? candidate.citations : []);
      rows.push({
        sourceKind: "knowledge" as const,
        sourceId: filename,
        documentName: filename,
        chunkIds: citations,
        revision: clean(candidate?.revision),
        checksum: clean(candidate?.checksum, 300),
        citations,
        tokenCount: Math.max(0, Math.floor(Number(candidate?.tokenCount || candidate?.token_count || 0))),
      });
    }
  }
  return rows;
}

function sharedFileSources(candidates: any[]) {
  const rows: any[] = [];
  for (const candidate of candidates) {
    const files = new Map((Array.isArray(candidate?.files) ? candidate.files : []).map((file: any) => [clean(file?.id), file]));
    for (const selected of Array.isArray(candidate?.selected_chunks) ? candidate.selected_chunks : []) {
      const sourceId = clean(selected?.file_id);
      const file: any = files.get(sourceId) || {};
      if (!sourceId) continue;
      const chunkId = clean(selected?.chunk_id);
      rows.push({
        sourceKind: "shared_file" as const,
        sourceId,
        documentName: clean(selected?.file_name || file?.name || sourceId),
        chunkIds: unique([chunkId]),
        revision: clean(file?.revision),
        checksum: clean(file?.checksum || selected?.checksum, 300),
        citations: unique([chunkId]),
        tokenCount: Math.max(0, Math.floor(Number(selected?.token_count || 0))),
      });
    }
    const sourceId = clean(candidate?.file_id);
    if (sourceId) {
      const chunkId = clean(candidate?.chunk?.id || candidate?.chunk_id);
      rows.push({
        sourceKind: "shared_file" as const,
        sourceId,
        documentName: clean(candidate?.file_name || sourceId),
        chunkIds: unique([chunkId]),
        revision: clean(candidate?.revision),
        checksum: clean(candidate?.checksum || candidate?.chunk?.checksum, 300),
        citations: unique([chunkId]),
        tokenCount: Math.max(0, Math.floor(Number(candidate?.tokenCount || candidate?.token_count || candidate?.chunk?.token_count || 0))),
      });
    }
    const references = [
      ...(Array.isArray(candidate?.sourceReferences) ? candidate.sourceReferences : []),
      ...(Array.isArray(candidate?.source_references) ? candidate.source_references : []),
      ...(Array.isArray(candidate?.contextSourceRefs) ? candidate.contextSourceRefs : []),
      ...(Array.isArray(candidate?.context_source_refs) ? candidate.context_source_refs : []),
    ];
    for (const reference of references) {
      const sourceKind = clean(reference?.sourceKind || reference?.source_kind);
      if (sourceKind && sourceKind !== "shared_file") continue;
      const referenceSourceId = clean(reference?.sourceId || reference?.source_id || reference?.file_id);
      if (!referenceSourceId || sourceKind !== "shared_file") continue;
      const chunkIds = unique([
        ...(Array.isArray(reference?.chunkIds) ? reference.chunkIds : []),
        ...(Array.isArray(reference?.chunk_ids) ? reference.chunk_ids : []),
        reference?.chunkId,
        reference?.chunk_id,
      ]);
      rows.push({
        sourceKind: "shared_file" as const,
        sourceId: referenceSourceId,
        documentName: clean(reference?.documentName || reference?.document_name || reference?.file_name || referenceSourceId),
        chunkIds,
        revision: clean(reference?.revision),
        checksum: clean(reference?.checksum, 300),
        citations: unique([...(Array.isArray(reference?.citations) ? reference.citations : []), ...chunkIds]),
        tokenCount: Math.max(0, Math.floor(Number(reference?.tokenCount || reference?.token_count || 0))),
      });
    }
  }
  return rows;
}

function webSources(candidates: any[]) {
  const rows: any[] = [];
  for (const candidate of candidates) {
    const results = [candidate, ...(Array.isArray(candidate?.results) ? candidate.results : [])];
    for (const result of results) {
      const url = clean(result?.finalUrl || result?.final_url || result?.citation || result?.url, 2000);
      if (!/^https:\/\//i.test(url)) continue;
      rows.push({ sourceKind: "web" as const, sourceId: url, documentName: clean(result?.title || url), chunkIds: [], revision: clean(result?.publishedAt || result?.published_at), checksum: clean(result?.contentChecksum || result?.content_checksum || result?.resultChecksum, 300), citations: [url], tokenCount: Math.max(0, Math.floor(Number(result?.tokenCount || result?.token_count || 0))) });
    }
  }
  return rows;
}

function mergeSources(rows: any[]) {
  const merged = new Map<string, any>();
  for (const row of rows) {
    const key = `${row.sourceKind}\0${row.sourceId}\0${row.revision}\0${row.checksum}`;
    const previous = merged.get(key);
    if (!previous) merged.set(key, row);
    else merged.set(key, {
      ...previous,
      chunkIds: unique([...(previous.chunkIds || []), ...(row.chunkIds || [])]),
      citations: unique([...(previous.citations || []), ...(row.citations || [])]),
      tokenCount: Math.max(Number(previous.tokenCount || 0), Number(row.tokenCount || 0)),
    });
  }
  return [...merged.values()].slice(0, 200);
}

export function isContextSourceToolResult(toolName: any, value?: any) {
  return !!detectedToolName(toolName, value);
}

export function buildContextSourceToolResultReference(toolNameInput: any, value: any, query: any = ""): ContextSourceToolResultReferenceV1 | null {
  const toolName = detectedToolName(toolNameInput, value);
  if (!toolName) return null;
  const candidates = nestedCandidates(value);
  const sources = mergeSources([...knowledgeSources(candidates), ...sharedFileSources(candidates), ...webSources(candidates)]);
  let serialized = "";
  try { serialized = JSON.stringify(value ?? null); } catch { serialized = String(value ?? ""); }
  const complete = candidates.every(candidate => candidate?.complete !== false && candidate?.has_more !== true);
  const truncated = candidates.some(candidate => candidate?.truncated === true || candidate?.complete === false || candidate?.has_more === true);
  return {
    schema: "ccm-context-source-tool-result-reference-v1",
    version: 1,
    toolName,
    sourceKinds: unique(sources.map(row => row.sourceKind), 3) as Array<"knowledge" | "shared_file" | "web">,
    sources,
    queryChecksum: query ? checksum(String(query)) : "",
    resultChecksum: checksum(serialized),
    tokenCount: estimateTextTokens(serialized),
    truncated,
    complete,
    contentStored: false,
  };
}

const WORKSPACE_PERSISTENCE_TOOLS = new Set([
  "read_file", "read_files", "grep_text", "glob_files", "list_directory", "inspect_notebook",
  "read_project_config", "read_git_status", "read_git_diff", "read_git_history",
  "read_runtime_status", "read_runtime_logs",
  "workspace_symbols", "document_symbols",
  "find_definition", "find_references", "find_implementations", "find_type_definition",
  "find_incoming_calls", "find_outgoing_calls", "read_code_diagnostics",
]);

const WORKSPACE_RECEIPT_KIND: Record<string, string> = {
  read_file: "text", read_files: "text", grep_text: "grep", glob_files: "glob",
  list_directory: "glob", inspect_notebook: "notebook",
};

export function normalizedWorkspacePersistenceToolName(toolName: any) {
  return clean(toolName, 240)
    .replace(/^mcp__ccm__ccm_workspace_readonly__/, "")
    .replace(/^mcp__ccm__ccm_workspace_edit__/, "");
}

export function isWorkspaceToolResultReference(value: any) {
  return !!value && typeof value === "object"
    && value.schema === "ccm-workspace-tool-result-reference-v1"
    && value.contentStored === false;
}

export function projectContextSourceToolResultForPersistence(toolName: any, value: any, query: any = "") {
  if (isWorkspaceToolResultReference(value)) return value;
  const normalizedTool = normalizedWorkspacePersistenceToolName(toolName);
  if (WORKSPACE_PERSISTENCE_TOOLS.has(normalizedTool)) {
    const candidates = nestedCandidates(value);
    const nestedReference = candidates.find(candidate => isWorkspaceToolResultReference(candidate));
    if (nestedReference) return nestedReference;
    const source = candidates.find(candidate => candidate && typeof candidate === "object" && (
      candidate.safeReceipt || candidate.safe_receipt || candidate.toolContractVersion || /^ccm-workspace-/.test(String(candidate.schema || ""))
    )) || candidates.find(candidate => candidate && typeof candidate === "object") || {};
    const receipt = source?.safeReceipt || source?.safe_receipt || {};
    const body = source?.modelPayload && typeof source.modelPayload === "object" ? source.modelPayload : source;
    const files = Array.isArray(body?.files) ? body.files : Array.isArray(source?.files) ? source.files : [];
    const kind = clean(receipt.kind || WORKSPACE_RECEIPT_KIND[normalizedTool] || "text", 40);
    const itemCount = Number(receipt.itemCount ?? body?.item_count ?? body?.read_count ?? source?.numFiles ?? source?.numLines ?? files.length ?? body?.items?.length ?? body?.lines?.length ?? 0);
    const truncated = receipt.truncated === true || body?.truncated === true || source?.truncated === true;
    return {
      schema: "ccm-workspace-tool-result-reference-v1",
      toolName: normalizedTool,
      toolContractVersion: Number(source?.toolContractVersion || 2),
      kind,
      path: clean(receipt.path || body?.path || files[0]?.path, 1200),
      checksum: clean(receipt.checksum || source?.checksum || source?.result_checksum || body?.checksum || checksum(value), 300),
      itemCount: Math.max(0, itemCount),
      lineCount: Math.max(0, Number(receipt.lineCount || body?.line_count || source?.numLines || body?.lines?.length || 0)),
      pageCount: Math.max(0, Number(receipt.pageCount || body?.selected_pages?.length || source?.selected_pages?.length || 0)),
      truncated,
      rehydratable: true,
      contentStored: false,
    };
  }
  return buildContextSourceToolResultReference(toolName, value, query) || value;
}

export function contextSourceToolResultProjectionSelfTest() {
  const sentinel = "CONTEXT_SOURCE_BODY_MUST_NOT_PERSIST";
  const knowledge = projectContextSourceToolResultForPersistence("query_knowledge", {
    context: sentinel,
    results: [{ filename: "guide.md", citation: "guide.md#0", text: sentinel, revision: "2", checksum: "abc", tokenCount: 42 }],
    citations: ["guide.md#0"],
  });
  const shared = projectContextSourceToolResultForPersistence("read_shared_files", {
    context: sentinel,
    files: [{ id: "file-1", name: "shared.md", revision: 3, checksum: "def" }],
    selected_chunks: [{ file_id: "file-1", file_name: "shared.md", chunk_id: "file-1#0", checksum: "ghi", token_count: 12 }],
    complete: true,
  });
  const ordinary = { content: sentinel };
  const batch = projectContextSourceToolResultForPersistence("read_files", {
    schema: "ccm-workspace-tool-envelope-v3",
    toolContractVersion: 3,
    modelPayload: {
      type: "text_batch",
      files: [{ path: "src/app.ts", lines: [{ line: 1, text: sentinel }] }],
    },
    safeReceipt: { kind: "text", checksum: "batch-checksum", itemCount: 1, lineCount: 1, truncated: false, contentStored: false },
  });
  const nestedBatch = projectContextSourceToolResultForPersistence("mcp__ccm__ccm_workspace_readonly__read_files", {
    observation: {
      schema: "ccm-workspace-tool-envelope-v3",
      modelPayload: { type: "text_batch", files: [{ path: "src/app.ts", lines: [{ line: 1, text: sentinel }] }] },
    },
  });
  return {
    pass: JSON.stringify(knowledge).includes(sentinel) === false
      && JSON.stringify(shared).includes(sentinel) === false
      && projectContextSourceToolResultForPersistence("read_file", ordinary)?.contentStored === false
      && knowledge?.contentStored === false
      && shared?.contentStored === false
      && batch?.schema === "ccm-workspace-tool-result-reference-v1"
      && batch?.contentStored === false
      && JSON.stringify(batch).includes(sentinel) === false
      && nestedBatch?.contentStored === false
      && nestedBatch?.path === "src/app.ts"
      && JSON.stringify(nestedBatch).includes(sentinel) === false,
    knowledge,
    shared,
    read_files: batch,
  };
}
