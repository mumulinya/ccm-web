"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildToolDisplayDetail = buildToolDisplayDetail;
exports.isWorkspaceReadonlyToolName = isWorkspaceReadonlyToolName;
const TOOL_DISPLAY_SCHEMA = "ccm-tool-display-detail-v1";
const AUDIT_KEYS = new Set([
    "schema", "contentStored", "toolKind", "source", "loaded", "scope", "aliases",
    "resultChecksum", "outputChecksum", "sourceChecksum", "queryChecksum", "repoStateIdentity",
    "evidenceId", "indexGeneration", "durationMs", "outputTokens", "reason", "ok", "name", "itemName",
]);
const BODY_KEYS = /^(?:content|text|body|output|rawOutput|raw_output|context|html|sourceCode|source_code|notebookOutput|notebook_output)$/i;
const SECRET_KEYS = /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret|credential|private[_-]?key)/i;
const cleanText = (value, max = 1500) => String(value ?? "")
    .replace(/((?:api[_-]?key|access[_-]?token|authorization|cookie|password|secret|credential)\s*[:=]\s*["']?)[^\s,"'}]{6,}/gi, "$1[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/[\0\r\t]+/g, " ")
    .trim()
    .slice(0, max);
function parseToolName(input) {
    const canonicalName = cleanText(input, 240) || "tool";
    const parts = canonicalName.split("__").filter(Boolean);
    let operation = canonicalName;
    let serverLabel = "";
    if (parts[0] === "mcp" && parts.length >= 3) {
        operation = parts.at(-1) || canonicalName;
        serverLabel = parts.at(-2) || "";
    }
    const normalized = operation.toLowerCase();
    const labels = {
        list_directory: "List directory", glob_files: "Find files", grep_text: "Search",
        read_file: "Read", read_project_config: "Read project config", read_git_status: "Git status",
        read_git_diff: "Git diff", read_git_history: "Git history", read_runtime_status: "Runtime status",
        read_runtime_logs: "Runtime logs", workspace_symbols: "Workspace symbols", document_symbols: "Document symbols",
        find_definition: "Find definition", find_references: "Find references", find_implementations: "Find implementations",
        find_type_definition: "Find type definition", find_incoming_calls: "Incoming calls", find_outgoing_calls: "Outgoing calls",
        read_code_diagnostics: "Diagnostics", query_knowledge: "Search knowledge", tool_search: "Tool search", invoke_skill: "Skill",
        inspect_notebook: "Inspect notebook", web_search: "Web search", web_fetch: "Web fetch",
    };
    const label = labels[normalized] || operation.replace(/[_-]+/g, " ").replace(/^./, character => character.toUpperCase());
    const category = /dispatch|test_agent|agent_/i.test(canonicalName)
        ? "agent" : normalized === "invoke_skill" ? "skill" : serverLabel ? "mcp" : "builtin";
    return { canonicalName, operation: normalized, label, serverLabel, category };
}
const argumentLabels = {
    project_id: "项目", projectId: "项目", path: "路径", pattern: "检索内容", query: "查询",
    symbol: "符号", glob: "文件范围", offset: "起始行", limit: "数量上限", token_budget: "Token预算",
    staged: "暂存区", profile_id: "运行配置", kind: "类型", name: "名称", url: "网址",
};
function safeValue(value, depth = 0, allowBody = false) {
    if (depth > 5)
        return "[内容过深]";
    if (typeof value === "string")
        return cleanText(value, allowBody ? 12_000 : 1_500);
    if (value == null || typeof value !== "object")
        return value;
    if (Array.isArray(value))
        return value.slice(0, 40).map(item => safeValue(item, depth + 1, allowBody));
    const output = {};
    for (const [key, nested] of Object.entries(value)) {
        if (SECRET_KEYS.test(key))
            output[key] = "[redacted]";
        else if (AUDIT_KEYS.has(key))
            continue;
        else if (BODY_KEYS.test(key) && !allowBody)
            continue;
        else
            output[key] = safeValue(nested, depth + 1, allowBody);
    }
    return output;
}
function unwrapResult(value) {
    if (value?.rawOutput != null)
        return value.rawOutput;
    if (value && typeof value === "object" && ["items", "lines", "locations", "diagnostics", "commits", "configs", "snapshot"].some(key => value[key] != null))
        return value;
    if (value?.output != null) {
        if (typeof value.output !== "string")
            return value.output;
        try {
            return JSON.parse(value.output);
        }
        catch {
            return value.output;
        }
    }
    return value;
}
function targetFromArgs(args) {
    return cleanText(args?.path || args?.file_path || args?.filePath || args?.symbol || args?.query || args?.pattern
        || args?.name || args?.skill || args?.project_id || args?.projectId || "", 300);
}
function resultProjection(operation, rawInput, error, transientBody) {
    if (error)
        return { kind: "error", summary: cleanText(error, 500) || "工具执行失败", truncated: false };
    const raw = unwrapResult(rawInput);
    if (raw == null || raw === "")
        return { kind: "empty", summary: "没有返回内容", truncated: false };
    const total = Number(raw?.total ?? raw?.total_count ?? raw?.locations?.length ?? raw?.diagnostics?.length ?? raw?.items?.length ?? 0);
    const truncated = raw?.truncated === true;
    const nextCursor = cleanText(raw?.next_cursor || raw?.nextCursor || "", 300);
    const paging = { ...(Number.isFinite(total) ? { total } : {}), truncated, ...(nextCursor ? { nextCursor } : {}) };
    if (operation === "list_directory") {
        const rows = (Array.isArray(raw?.items) ? raw.items : []).slice(0, 40).map((item) => ({
            name: cleanText(item?.name || item?.path || item, 500), type: cleanText(item?.type || "", 40), path: cleanText(item?.path || "", 800),
        }));
        const directories = rows.filter((row) => row.type === "directory").length;
        const files = rows.filter((row) => row.type === "file").length;
        return { kind: "list", summary: `发现 ${total || rows.length} 项（${directories} 个目录，${files} 个文件）`, rows, ...paging };
    }
    if (operation === "glob_files") {
        const rows = (Array.isArray(raw?.items) ? raw.items : []).slice(0, 40).map((item) => ({ path: cleanText(item?.path || item, 800) }));
        return { kind: "list", summary: `找到 ${total || rows.length} 个文件`, rows, ...paging };
    }
    if (operation === "grep_text") {
        const rows = (Array.isArray(raw?.lines) ? raw.lines : []).slice(0, 40).map((item) => {
            const line = typeof item === "string" ? item : String(item?.text || "");
            const match = line.match(/^(.+?):(\d+)(?::|$)/);
            return transientBody ? { location: match ? `${match[1]}:${match[2]}` : "", preview: cleanText(line, 1200) }
                : { location: match ? `${match[1]}:${match[2]}` : cleanText(line.split(":").slice(0, 2).join(":"), 800) };
        });
        return { kind: "locations", summary: `找到 ${total || rows.length} 条匹配`, rows, rehydratable: !transientBody, ...paging };
    }
    if (operation === "read_file") {
        const sourceRows = Array.isArray(raw?.lines) ? raw.lines : [];
        const rows = transientBody ? sourceRows.slice(0, 40).map((item) => ({ line: Number(item?.line || 0), text: cleanText(item?.text || "", 12_000) })) : undefined;
        const from = Number(raw?.offset || sourceRows[0]?.line || 0);
        const to = Number(sourceRows.at(-1)?.line || from);
        return { kind: transientBody ? "text" : "summary", summary: `读取 ${cleanText(raw?.path || "文件", 500)}${from ? ` 第 ${from}${to > from ? `–${to}` : ""} 行` : ""}`, ...(rows ? { rows } : {}), rehydratable: !transientBody, ...paging };
    }
    if (/find_|workspace_symbols|document_symbols/.test(operation) && Array.isArray(raw?.locations)) {
        const rows = raw.locations.slice(0, 40).map((item) => ({ path: cleanText(item?.path, 800), range: safeValue(item?.range), symbol: cleanText(item?.symbol, 300), kind: cleanText(item?.kind, 100) }));
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
    if (operation === "read_git_history" && Array.isArray(raw?.commits))
        return { kind: "table", summary: `${raw.commits.length} 条提交`, rows: safeValue(raw.commits), ...paging };
    if (Array.isArray(raw?.items))
        return { kind: "list", summary: `${total || raw.items.length} 项结果`, rows: safeValue(raw.items), ...paging };
    if (typeof raw === "string")
        return transientBody
            ? { kind: "text", summary: "工具返回文本结果", preview: cleanText(raw, 12_000), truncated: raw.length > 12_000 }
            : { kind: "summary", summary: "工具已返回文本结果（正文未持久化）", truncated: false };
    const safe = safeValue(raw, 0, transientBody);
    const rows = safe && typeof safe === "object" ? Object.entries(safe).slice(0, 40).map(([label, value]) => ({ label, value })) : [];
    return rows.length ? { kind: "table", summary: `${rows.length} 项结果`, rows, ...paging }
        : { kind: "empty", summary: "工具执行完成", truncated: false };
}
function authoritativeRevision(value) {
    const raw = value?.authoritativeRevision || value?.revision || value?.fileRevision || value?.file_revision
        || value?.repoStateIdentity?.gitTreeHash || value?.repo_state_identity?.git_tree_hash
        || value?.indexGeneration || value?.index_generation;
    return cleanText(raw, 160);
}
function buildToolDisplayDetail(input) {
    const parsed = parseToolName(input.toolName);
    const args = input.arguments && typeof input.arguments === "object" ? input.arguments : {};
    return {
        schema: TOOL_DISPLAY_SCHEMA,
        tool: {
            label: parsed.label,
            category: parsed.category,
            ...(parsed.serverLabel ? { serverLabel: parsed.serverLabel } : {}),
            ...(targetFromArgs(args) ? { target: targetFromArgs(args) } : {}),
        },
        arguments: Object.entries(args).slice(0, 40).map(([key, value]) => ({
            label: argumentLabels[key] || key.replace(/_/g, " "),
            value: SECRET_KEYS.test(key) ? "[redacted]" : safeValue(value),
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
function isWorkspaceReadonlyToolName(value) {
    return String(value || "").startsWith("mcp__ccm__ccm_workspace_readonly__");
}
//# sourceMappingURL=tool-display-projection.js.map