const TOOL_DISPLAY_SCHEMA = "ccm-tool-display-detail-v1" as const;
const AUDIT_KEYS = new Set([
  "schema", "contentStored", "toolKind", "source", "loaded", "scope", "aliases",
  "resultChecksum", "outputChecksum", "sourceChecksum", "queryChecksum", "repoStateIdentity",
  "evidenceId", "indexGeneration", "durationMs", "outputTokens", "reason", "ok", "name", "itemName",
]);
const BODY_KEYS = /^(?:content|text|body|output|rawOutput|raw_output|context|html|sourceCode|source_code|notebookOutput|notebook_output|old_text|new_text|replacement|file_data)$/i;
const SECRET_KEYS = /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret|credential|private[_-]?key)/i;
export type ToolDisplayFamily = "read" | "search" | "symbol" | "git" | "verify" | "terminal" | "agent" | "external" | "other";

export type ToolDisplayDetailV1 = {
  schema: typeof TOOL_DISPLAY_SCHEMA;
  tool: { name?: string; label: string; userLabel?: string; family?: ToolDisplayFamily; category: "builtin" | "mcp" | "skill" | "agent"; serverLabel?: string; target?: string };
  sensitiveCommand?: string;
  arguments: Array<{ label: string; value: unknown }>;
  result: {
    kind: "summary" | "list" | "table" | "text" | "locations" | "diagnostics" | "diff" | "empty" | "error";
    summary: string;
    rows?: unknown[];
    fileRows?: Array<{
      path: string;
      status: "completed" | "partial" | "unchanged";
      from: number;
      to: number;
      totalLines: number;
      nextOffset?: number;
      checksum?: string;
      lines: Array<{ line: number; text: string }>;
    }>;
    preview?: string;
    total?: number;
    truncated: boolean;
    nextCursor?: string;
    continuation?: {
      kind: "read_files";
      pendingCount: number;
      files: Array<{ path: string; nextOffset: number; checksum: string }>;
    };
    rehydratable?: boolean;
    freshness?: "current" | "drifted" | "deleted" | "permission_revoked";
    authoritativeRevision?: string;
    searchExecution?: { engine: "bundled_rg" | "system_rg" | "node_fallback"; timedOut: boolean; cancelled: boolean; partial: boolean };
  };
  contentStored: false;
};

const cleanText = (value: any, max = 1500) => String(value ?? "")
  .replace(/((?:api[_-]?key|access[_-]?token|authorization|cookie|password|secret|credential)\s*[:=]\s*["']?)[^\s,"'}]{6,}/gi, "$1[redacted]")
  .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
  .replace(/[\0\r\t]+/g, " ")
  .trim()
  .slice(0, max);

function parseToolName(input: any) {
  const canonicalName = cleanText(input, 240) || "tool";
  const parts = canonicalName.split("__").filter(Boolean);
  let operation = canonicalName;
  let serverLabel = "";
  if (parts[0] === "mcp" && parts.length >= 3) {
    operation = parts.at(-1) || canonicalName;
    serverLabel = parts.at(-2) || "";
  }
  const internalWorkspaceTool = canonicalName.startsWith("mcp__ccm__ccm_workspace_readonly__")
    || canonicalName.startsWith("mcp__ccm__ccm_workspace_edit__");
  const rawNormalized = operation.toLowerCase();
  const nativeAliases: Record<string, string> = {
    read: "read_file", fileread: "read_file", readfile: "read_file",
    glob: "glob_files", fileglob: "glob_files", findfiles: "glob_files",
    grep: "grep_text", searchtext: "grep_text", codesearch: "grep_text",
    ls: "list_directory", listdirectory: "list_directory",
  };
  const normalized = nativeAliases[rawNormalized.replace(/[_\s-]+/g, "")] || rawNormalized;
  const labels: Record<string, string> = {
    list_directory: "List directory", glob_files: "Find files", grep_text: "Search",
    read_file: "Read", read_files: "Read files", apply_patch: "Edit file", write_file: "Write file", move_path: "Move file", delete_path: "Delete file",
    read_project_config: "Read project config", read_git_status: "Git status",
    read_git_diff: "Git diff", read_git_history: "Git history", read_runtime_status: "Runtime status",
    read_runtime_logs: "Runtime logs", workspace_symbols: "Workspace symbols", document_symbols: "Document symbols",
    find_definition: "Find definition", find_references: "Find references", find_implementations: "Find implementations",
    find_type_definition: "Find type definition", find_incoming_calls: "Incoming calls", find_outgoing_calls: "Outgoing calls",
    read_code_diagnostics: "Diagnostics", query_knowledge: "Search knowledge", tool_search: "Tool search", invoke_skill: "Skill",
    inspect_notebook: "Inspect notebook", web_search: "Web search", web_fetch: "Web fetch",
    run_command: "Run command", get_command_output: "Command output", stop_command: "Stop command",
  };
  const label = labels[normalized] || operation.replace(/[_-]+/g, " ").replace(/^./, character => character.toUpperCase());
  const userLabels: Record<string, string> = {
    list_directory: "查找目录", glob_files: "查找文件", grep_text: "搜索代码", read_file: "读取文件", read_files: "批量读取文件",
    apply_patch: "修改文件", write_file: "写入文件", move_path: "移动文件", delete_path: "删除文件",
    read_project_config: "读取项目配置", read_git_status: "检查 Git 状态", read_git_diff: "查看 Git 差异", read_git_history: "查看 Git 历史",
    read_runtime_status: "读取运行状态", read_runtime_logs: "读取项目日志", workspace_symbols: "查找工作区符号", document_symbols: "查找文件符号",
    find_definition: "查找定义", find_references: "查找引用", find_implementations: "查找实现", find_type_definition: "查找类型定义",
    find_incoming_calls: "查找调用方", find_outgoing_calls: "查找被调用项", read_code_diagnostics: "读取代码诊断",
    query_knowledge: "搜索知识库", tool_search: "搜索工具", invoke_skill: "运行技能", inspect_notebook: "检查 Notebook",
    web_search: "搜索网页", web_fetch: "读取网页",
    run_command: "运行项目命令", get_command_output: "读取命令状态", stop_command: "停止项目命令",
  };
  let family: ToolDisplayFamily = "other";
  if (/dispatch|test_agent|agent_/i.test(canonicalName)) family = "agent";
  else if (/test|build|lint|typecheck|verify|verification|maven|gradle/.test(normalized)) family = "verify";
  else if (/git|diff|commit|branch|status/.test(normalized)) family = "git";
  else if (/find_definition|find_references|find_implementations|find_type_definition|find_incoming_calls|find_outgoing_calls|workspace_symbols|document_symbols|diagnostic/.test(normalized)) family = "symbol";
  else if (/glob|grep|search|find_files|query_knowledge|tool_search/.test(normalized)) family = "search";
  else if (/read|list|inspect_notebook/.test(normalized)) family = "read";
  else if (/bash|powershell|shell|command|terminal|exec|run_terminal/.test(normalized)) family = "terminal";
  else if (/mcp|http|request|external|browser|web_/.test(normalized) || serverLabel) family = "external";
  const userLabel = userLabels[normalized]
    || (family === "verify" ? (/maven/.test(normalized) ? "运行 Maven 构建" : /gradle/.test(normalized) ? "运行 Gradle 构建" : `运行 ${label}`)
      : family === "terminal" ? "运行项目命令"
        : family === "git" ? "检查 Git 状态"
          : family === "agent" ? "执行 Agent 操作"
            : family === "external" ? "调用外部工具" : label);
  const category: ToolDisplayDetailV1["tool"]["category"] = /dispatch|test_agent|agent_/i.test(canonicalName)
    ? "agent" : normalized === "invoke_skill" ? "skill" : serverLabel && !internalWorkspaceTool ? "mcp" : "builtin";
  return {
    canonicalName: internalWorkspaceTool ? operation : canonicalName,
    operation: normalized,
    label,
    userLabel,
    family,
    serverLabel: internalWorkspaceTool ? "" : serverLabel,
    category,
  };
}

function redactedCommand(args: Record<string, any>) {
  const value = args.command ?? args.script ?? args.shellCommand ?? args.shell_command ?? args.cmd;
  if (value == null) return "";
  let result = cleanText(value, 1_000)
    .replace(/(^|\s)([A-Z_][A-Z0-9_]*(?:=|:))[^\s]+/g, "$1$2[redacted]")
    .replace(/((?:password|passwd|token|secret|api[_-]?key|access[_-]?key)\s*[:=]\s*)[^\s]+/gi, "$1[redacted]");
  // Inline script/code bodies are never persisted, even in technical detail.
  result = result.replace(/(\s(?:-e|--eval|-Command|-EncodedCommand|\/c)\s+)[\s\S]*$/i, "$1[脚本内容已隐藏]");
  result = result.replace(/(?:<<[-~]?\s*['\"]?\w+['\"]?)[\s\S]*$/i, "[内联脚本已隐藏]");
  return result.slice(0, 500);
}

const argumentLabels: Record<string, string> = {
  project_id: "项目", projectId: "项目", path: "路径", pattern: "检索内容", query: "查询",
  symbol: "符号", glob: "文件范围", offset: "起始行", limit: "数量上限", token_budget: "Token预算",
  staged: "暂存区", profile_id: "运行配置", kind: "类型", name: "名称", url: "网址",
  paths: "文件列表", source: "来源路径", destination: "目标路径", expected_checksum: "文件版本",
  work_item_id: "工作项", attempt: "尝试次数", lease_id: "任务租约", replace_all: "替换全部",
};

function safeValue(value: any, depth = 0, allowBody = false): any {
  if (depth > 5) return "[内容过深]";
  if (typeof value === "string") return cleanText(value, allowBody ? 12_000 : 1_500);
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 40).map(item => safeValue(item, depth + 1, allowBody));
  const output: any = {};
  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_KEYS.test(key)) output[key] = "[redacted]";
    else if (AUDIT_KEYS.has(key)) continue;
    else if (BODY_KEYS.test(key) && !allowBody) continue;
    else output[key] = safeValue(nested, depth + 1, allowBody);
  }
  return output;
}

function unwrapResult(value: any) {
  let current = value;
  const visited = new Set<any>();
  for (let depth = 0; depth < 8; depth += 1) {
    if (current == null || visited.has(current)) break;
    if (typeof current === "object") visited.add(current);
    if (typeof current === "string") {
      try { current = JSON.parse(current); continue; } catch { break; }
    }
    if (current?.schema === "ccm-workspace-tool-envelope-v3" && current?.modelPayload != null) {
      current = current.modelPayload;
      continue;
    }
    if (current && typeof current === "object" && [
      "items", "lines", "files", "locations", "diagnostics", "commits", "configs", "snapshot",
      "item_count", "total_count", "page_count", "cells",
    ].some(key => current[key] != null)) break;
    if (current?.rawOutput != null) {
      current = current.rawOutput;
      continue;
    }
    if (current?.output != null) {
      current = current.output;
      continue;
    }
    const textBlock = Array.isArray(current?.content)
      ? current.content.find((item: any) => item?.type === "text" && typeof item?.text === "string")
      : null;
    if (textBlock?.text) {
      current = textBlock.text;
      continue;
    }
    break;
  }
  return current;
}

function targetFromArgs(args: any) {
  return cleanText(args?.path || args?.source || args?.destination || args?.file_path || args?.filePath || args?.symbol || args?.query || args?.pattern
    || args?.name || args?.skill || args?.project_id || args?.projectId || "", 300);
}

function resultProjection(operation: string, rawInput: any, error: any, transientBody: boolean): ToolDisplayDetailV1["result"] {
  if (error) return { kind: "error", summary: cleanText(error, 500) || "工具执行失败", truncated: false };
  const raw = unwrapResult(rawInput);
  if (raw == null || raw === "") return { kind: "empty", summary: "没有返回内容", truncated: false };
  const total = Number(raw?.total ?? raw?.total_count ?? raw?.locations?.length ?? raw?.diagnostics?.length ?? raw?.items?.length ?? 0);
  const truncated = raw?.truncated === true;
  const nextCursor = cleanText(raw?.next_cursor || raw?.nextCursor || "", 300);
  const paging = { ...(Number.isFinite(total) ? { total } : {}), truncated, ...(nextCursor ? { nextCursor } : {}) };
  const searchExecution = raw?.searchExecution && typeof raw.searchExecution === "object" ? {
    engine: ["bundled_rg", "system_rg", "node_fallback"].includes(String(raw.searchExecution.engine)) ? raw.searchExecution.engine : "node_fallback",
    timedOut: raw.searchExecution.timedOut === true,
    cancelled: raw.searchExecution.cancelled === true,
    partial: raw.searchExecution.partial === true,
  } as ToolDisplayDetailV1["result"]["searchExecution"] : undefined;
  const partialSuffix = searchExecution?.cancelled ? " · 搜索已取消，保留已返回结果"
    : searchExecution?.timedOut ? " · 搜索超时，已返回部分结果"
      : searchExecution?.partial ? " · 已返回部分结果" : "";

  if (operation === "list_directory") {
    const rows = (Array.isArray(raw?.items) ? raw.items : []).slice(0, 40).map((item: any) => ({
      name: cleanText(item?.name || item?.path || item, 500), type: cleanText(item?.type || "", 40), path: cleanText(item?.path || "", 800),
    }));
    const directories = rows.filter((row: any) => row.type === "directory").length;
    const files = rows.filter((row: any) => row.type === "file").length;
    return { kind: "list", summary: `发现 ${total || rows.length} 项（${directories} 个目录，${files} 个文件）`, rows, ...paging };
  }
  if (operation === "glob_files") {
    const rows = (Array.isArray(raw?.items) ? raw.items : []).slice(0, 40).map((item: any) => ({ path: cleanText(item?.path || item, 800) }));
    const count = total || rows.length;
    const summary = count > 0 ? `找到 ${count} 个文件${partialSuffix}`
      : searchExecution?.partial ? `暂未返回匹配文件${partialSuffix}，可缩小目录或模式后重试`
        : "未找到匹配文件";
    return { kind: "list", summary, rows, ...(searchExecution ? { searchExecution } : {}), ...paging };
  }
  if (operation === "grep_text") {
    const rows = (Array.isArray(raw?.lines) ? raw.lines : []).slice(0, 40).map((item: any) => {
      const line = typeof item === "string" ? item : String(item?.text || "");
      const match = line.match(/^(.+?):(\d+)(?::|$)/);
      return transientBody ? { location: match ? `${match[1]}:${match[2]}` : "", preview: cleanText(line, 1200) }
        : { location: match ? `${match[1]}:${match[2]}` : cleanText(line.split(":").slice(0, 2).join(":"), 800) };
    });
    const count = total || rows.length;
    const summary = count > 0 ? `找到 ${count} 条匹配${partialSuffix}`
      : searchExecution?.partial ? `暂未返回匹配内容${partialSuffix}，可缩小目录或检索范围后重试`
        : "未找到匹配内容";
    return { kind: "locations", summary, rows, rehydratable: !transientBody, ...(searchExecution ? { searchExecution } : {}), ...paging };
  }
  if (operation === "read_files") {
    const files = Array.isArray(raw?.files) ? raw.files : [];
    const count = Number(raw?.item_count ?? raw?.itemCount ?? raw?.safeReceipt?.itemCount ?? files.length ?? 0);
    const normalizedCount = Number.isFinite(count) ? Math.max(0, count) : 0;
    const pending = files.filter((file: any) => file?.truncated === true && Number(file?.next_cursor || file?.nextCursor || 0) > 0);
    const unchanged = files.filter((file: any) => file?.status === "unchanged" || file?.type === "file_unchanged").length;
    const rows = transientBody ? files.slice(0, 40).map((file: any) => ({
      path: cleanText(file?.path || "文件", 800),
      status: file?.status === "unchanged" || file?.type === "file_unchanged" ? "内容未变化" : file?.truncated === true ? "部分读取" : "已读完",
      lines: Math.max(0, Number(file?.lines?.length || file?.safeReceipt?.lineCount || 0)),
      ...(file?.truncated === true && Number(file?.next_cursor || file?.nextCursor || 0) > 0
        ? { nextLine: Number(file?.next_cursor || file?.nextCursor) } : {}),
    })) : undefined;
    const fileRows = transientBody ? files.slice(0, 40).map((file: any) => {
      const sourceLines = Array.isArray(file?.lines) ? file.lines : [];
      const normalizedLines = sourceLines.slice(0, 2000).map((line: any, index: number) => ({
        line: Math.max(1, Number(line?.line || Number(file?.offset || 1) + index)),
        text: cleanText(line?.text ?? line ?? "", 12_000),
      }));
      const from = Number(normalizedLines[0]?.line || file?.offset || 1);
      const to = Number(normalizedLines.at(-1)?.line || from);
      const nextOffset = Number(file?.next_cursor || file?.nextCursor || 0);
      return {
        path: cleanText(file?.path || "文件", 800),
        status: file?.status === "unchanged" || file?.type === "file_unchanged" ? "unchanged" as const : file?.truncated === true ? "partial" as const : "completed" as const,
        from: Math.max(1, from),
        to: Math.max(Math.max(1, from), to),
        totalLines: Math.max(to, Number(file?.total_lines || file?.totalLines || to)),
        ...(file?.truncated === true && nextOffset > 0 ? { nextOffset } : {}),
        ...(file?.checksum ? { checksum: cleanText(file.checksum, 160) } : {}),
        lines: normalizedLines,
      };
    }) : undefined;
    const continuation = transientBody && pending.length ? {
      kind: "read_files" as const,
      pendingCount: pending.length,
      files: pending.map((file: any) => ({
        path: cleanText(file?.path, 800),
        nextOffset: Math.max(1, Number(file?.next_cursor || file?.nextCursor || 1)),
        checksum: cleanText(file?.checksum, 160),
      })).filter((file: any) => file.path),
    } : undefined;
    return {
      kind: "summary",
      summary: `已读取 ${normalizedCount} 个文件${unchanged ? `，${unchanged} 个内容未变化` : ""}${pending.length ? `，其中 ${pending.length} 个文件仍有内容未读完` : ""}`,
      total: normalizedCount,
      truncated: pending.length > 0,
      rehydratable: true,
      ...(rows ? { rows } : {}),
      ...(fileRows ? { fileRows } : {}),
      ...(continuation?.files.length ? { continuation } : {}),
    };
  }
  if (operation === "read_file") {
    if (raw?.status === "unchanged" || raw?.type === "file_unchanged") {
      return { kind: "summary", summary: `${cleanText(raw?.path || "文件", 500)} 内容未变化，继续使用当前上下文`, rehydratable: false, ...paging };
    }
    if (raw?.kind === "image" || raw?.type === "image") {
      const width = Number(raw?.width || raw?.dimensions?.displayWidth || 0);
      const height = Number(raw?.height || raw?.dimensions?.displayHeight || 0);
      return { kind: "summary", summary: `已读取图片${width && height ? ` · ${width}×${height}` : ""}`, rehydratable: true, ...paging };
    }
    if (raw?.kind === "pdf" || raw?.type === "pdf") {
      const pages = Number(raw?.page_count || raw?.pageCount || raw?.pages?.length || 0);
      return { kind: "summary", summary: `已读取 PDF${pages ? ` · ${pages} 页` : ""}`, rehydratable: true, ...paging };
    }
    if (raw?.kind === "notebook" || raw?.type === "notebook") {
      const cells = Number(raw?.item_count || raw?.itemCount || raw?.cells?.length || raw?.total_cells || 0);
      return { kind: "summary", summary: `已读取 Notebook${cells ? ` · ${cells} 个单元格` : ""}`, rehydratable: true, ...paging };
    }
    const sourceRows = Array.isArray(raw?.lines) ? raw.lines : [];
    const rows = transientBody ? sourceRows.slice(0, 40).map((item: any) => ({ line: Number(item?.line || 0), text: cleanText(item?.text || "", 12_000) })) : undefined;
    const from = Number(raw?.offset || sourceRows[0]?.line || 0);
    const to = Number(sourceRows.at(-1)?.line || from);
    return { kind: transientBody ? "text" : "summary", summary: `读取 ${cleanText(raw?.path || "文件", 500)}${from ? ` 第 ${from}${to > from ? `–${to}` : ""} 行` : ""}`, ...(rows ? { rows } : {}), rehydratable: !transientBody, ...paging };
  }
  if (["run_command", "get_command_output", "stop_command"].includes(operation)) {
    const status = cleanText(raw?.status || "", 40);
    const description = cleanText(raw?.description || "项目命令", 160);
    const summaries: Record<string, string> = {
      running: `${description}仍在运行`, completed: `${description}已完成`, failed: `${description}未通过`,
      cancelled: `${description}已停止`, timed_out: `${description}运行超时`, needs_recheck: `${description}需要重新核验`,
    };
    return { kind: status === "failed" || status === "timed_out" ? "error" : "summary", summary: summaries[status] || `${description}状态已更新`, truncated: Boolean(raw?.truncated), authoritativeRevision: cleanText(raw?.revision || "", 40) };
  }
  if (["apply_patch", "write_file", "move_path", "delete_path"].includes(operation) && raw?.schema === "ccm-workspace-edit-result-v1") {
    const labels: Record<string, string> = { apply_patch: "文件修改已保存", write_file: raw?.created ? "文件已创建" : "文件已写入", move_path: "文件已移动", delete_path: "文件已删除" };
    return { kind: "summary", summary: labels[operation] || "文件变更已保存", truncated: false, authoritativeRevision: cleanText(raw?.afterChecksum || raw?.beforeChecksum || "", 160) };
  }
  if (/find_|workspace_symbols|document_symbols/.test(operation) && Array.isArray(raw?.locations)) {
    const rows = raw.locations.slice(0, 40).map((item: any) => ({ path: cleanText(item?.path, 800), range: safeValue(item?.range), symbol: cleanText(item?.symbol, 300), kind: cleanText(item?.kind, 100) }));
    return { kind: "locations", summary: `找到 ${total || rows.length} 个位置`, rows, ...paging };
  }
  if (operation === "read_code_diagnostics") {
    const sourceRows = Array.isArray(raw?.diagnostics) ? raw.diagnostics : Array.isArray(raw?.locations) ? raw.locations : [];
    return { kind: "diagnostics", summary: `${sourceRows.length} 条诊断`, rows: safeValue(sourceRows), ...paging };
  }
  if (operation === "read_git_diff") {
    const sourceRows = Array.isArray(raw?.lines) ? raw.lines : [];
    return { kind: "diff", summary: sourceRows.length ? `${sourceRows.length} 行差异` : "没有未提交差异", ...(transientBody ? { rows: safeValue(sourceRows, 0, true) } : {}), rehydratable: sourceRows.length > 0 && !transientBody, ...paging };
  }
  if (operation === "read_git_history" && Array.isArray(raw?.commits)) return { kind: "table", summary: `${raw.commits.length} 条提交`, rows: safeValue(raw.commits), ...paging };
  if (Array.isArray(raw?.items)) return { kind: "list", summary: `${total || raw.items.length} 项结果`, rows: safeValue(raw.items), ...paging };
  if (typeof raw === "string") return transientBody
    ? { kind: "text", summary: "工具返回文本结果", preview: cleanText(raw, 12_000), truncated: raw.length > 12_000 }
    : { kind: "summary", summary: "工具已返回文本结果（正文未持久化）", truncated: false };
  const safe = safeValue(raw, 0, transientBody);
  const rows = safe && typeof safe === "object" ? Object.entries(safe).slice(0, 40).map(([label, value]) => ({ label, value })) : [];
  return rows.length ? { kind: "table", summary: `${rows.length} 项结果`, rows, ...paging }
    : { kind: "empty", summary: "工具执行完成", truncated: false };
}

function authoritativeRevision(value: any) {
  const raw = value?.authoritativeRevision || value?.revision || value?.fileRevision || value?.file_revision
    || value?.repoStateIdentity?.gitTreeHash || value?.repo_state_identity?.git_tree_hash
    || value?.indexGeneration || value?.index_generation;
  return cleanText(raw, 160);
}

export function buildToolDisplayDetail(input: {
  toolName: any;
  arguments?: any;
  result?: any;
  error?: any;
  transientBody?: boolean;
  freshness?: ToolDisplayDetailV1["result"]["freshness"];
  authoritativeRevision?: string;
  includeTechnicalCommand?: boolean;
}): ToolDisplayDetailV1 {
  const parsed = parseToolName(input.toolName);
  const args = input.arguments && typeof input.arguments === "object" ? input.arguments : {};
  return {
    schema: TOOL_DISPLAY_SCHEMA,
    tool: {
      name: parsed.canonicalName,
      label: parsed.label,
      userLabel: parsed.userLabel,
      family: parsed.family,
      category: parsed.category,
      ...(parsed.serverLabel ? { serverLabel: parsed.serverLabel } : {}),
      ...(targetFromArgs(args) ? { target: targetFromArgs(args) } : {}),
    },
    ...(input.includeTechnicalCommand && parsed.family === "terminal" && redactedCommand(args)
      ? { sensitiveCommand: redactedCommand(args) } : {}),
    arguments: Object.entries(args).slice(0, 40).map(([key, value]) => ({
      label: argumentLabels[key] || key.replace(/_/g, " "),
      value: SECRET_KEYS.test(key) ? "[redacted]"
        : /^(?:command|cmd|script|shellCommand|shell_command)$/i.test(key) ? "[命令已隐藏]"
          : BODY_KEYS.test(key) ? "[内容已隐藏]"
          : safeValue(value),
    })),
    result: {
      ...resultProjection(parsed.operation, input.result, input.error, input.transientBody === true),
      ...(input.freshness ? { freshness: input.freshness } : {}),
      ...((input.authoritativeRevision || authoritativeRevision(input.result))
        ? { authoritativeRevision: cleanText(input.authoritativeRevision || authoritativeRevision(input.result), 160) }
        : {}),
    },
    contentStored: false,
  };
}

export function isWorkspaceReadonlyToolName(value: any) {
  return String(value || "").startsWith("mcp__ccm__ccm_workspace_readonly__");
}
