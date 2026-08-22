"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildToolDisplayDetail = buildToolDisplayDetail;
exports.workspaceReadonlyToolShortName = workspaceReadonlyToolShortName;
exports.isWorkspaceReadonlyToolName = isWorkspaceReadonlyToolName;
exports.workspaceReadonlyContractVersion = workspaceReadonlyContractVersion;
const TOOL_DISPLAY_SCHEMA = "ccm-tool-display-detail-v1";
const AUDIT_KEYS = new Set([
    "schema", "contentStored", "toolKind", "source", "loaded", "scope", "aliases",
    "resultChecksum", "outputChecksum", "sourceChecksum", "queryChecksum", "repoStateIdentity",
    "evidenceId", "indexGeneration", "durationMs", "outputTokens", "reason", "ok", "name", "itemName",
]);
const BODY_KEYS = /^(?:content|text|body|output|rawOutput|raw_output|context|html|sourceCode|source_code|notebookOutput|notebook_output|old_text|new_text|replacement|file_data)$/i;
const SECRET_KEYS = /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|password|passwd|secret|credential|private[_-]?key)/i;
function resultPresentation(operation, rows, raw) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const item = (label, options = {}) => ({
        label: cleanText(label, 500),
        ...(options.secondary ? { secondary: cleanText(options.secondary, 500) } : {}),
        ...(options.path ? { path: cleanText(options.path, 800) } : {}),
        ...(Number.isFinite(Number(options.line)) && Number(options.line) > 0 ? { line: Number(options.line) } : {}),
        ...(options.status ? { status: cleanText(options.status, 80) } : {}),
    });
    if (operation === "list_directory") {
        const items = safeRows.map(row => {
            const isDir = row?.type === "directory";
            const name = cleanText(row.name || row.path, 500).replace(/\\/g, "/");
            const base = name.split("/").filter(Boolean).at(-1) || name;
            return item(isDir ? `${base.replace(/\/$/, "")}/` : base, { path: row.path || name, status: isDir ? "directory" : "file" });
        });
        return { layout: "directory", groups: items.length ? [{ id: "listing", label: "", count: items.length, items }] : [] };
    }
    if (operation === "glob_files")
        return { layout: "files", groups: [{ id: "listing", label: "", count: safeRows.length, items: safeRows.map(row => item(row.path || row.name, { path: row.path || row.name, status: "file" })) }] };
    if (operation === "grep_text") {
        const items = safeRows.map(row => {
            const location = cleanText(row?.location || row?.path, 800);
            const match = location.match(/^(.*?):(\d+)$/);
            return item("匹配内容", { path: match?.[1] || location, line: match?.[2], secondary: row?.preview });
        });
        const byPath = new Map();
        for (const row of items) {
            const key = row.path || "其他匹配";
            byPath.set(key, [...(byPath.get(key) || []), row]);
        }
        return { layout: "matches", groups: [...byPath.entries()].map(([path, matches]) => ({ id: `match:${path}`, label: path, count: matches.length, items: matches })) };
    }
    if (/find_|workspace_symbols|document_symbols/.test(operation)) {
        return { layout: "symbols", groups: [{ id: "symbols", label: "符号位置", count: safeRows.length, items: safeRows.map(row => item(row.symbol || row.path || "符号", {
                        path: row.path,
                        line: Number(row?.range?.start?.line ?? row?.line ?? -1) + 1,
                        secondary: row.kind,
                    })) }] };
    }
    if (/^read_(?:file|files)$/.test(operation)) {
        const sourceRows = safeRows.length ? safeRows : raw?.path ? [{
                path: raw.path,
                status: raw.status === "unchanged" || raw.type === "file_unchanged" ? "内容未变化" : raw.truncated ? "部分读取" : "已读完",
                lines: Number(raw?.safeReceipt?.lineCount || raw?.lines?.length || 0),
                from: Number(raw?.offset || raw?.lines?.[0]?.line || 0),
                to: Number(raw?.lines?.at?.(-1)?.line || 0),
                totalLines: Number(raw?.total_lines || raw?.totalLines || 0),
            }] : [];
        return {
            layout: "file_content",
            groups: sourceRows.length ? [{
                    id: "listing",
                    label: "",
                    count: sourceRows.length,
                    items: sourceRows.map(row => {
                        const from = Number(row?.from || 0);
                        const to = Number(row?.to || 0);
                        const totalLines = Number(row?.totalLines || row?.total_lines || 0);
                        const range = from ? `${from}${to > from ? `–${to}` : ""}${totalLines ? `/${totalLines}` : ""}` : "";
                        const status = cleanText(row?.status, 80);
                        const usefulStatus = status && !/已读完|读取范围/.test(status) ? status : "";
                        return item(row?.path || "文件", {
                            path: row?.path,
                            status: status.includes("失败") ? "failed" : status.includes("部分") ? "partial" : "file",
                            secondary: [range, usefulStatus, row?.reason].filter(Boolean).join(" · "),
                        });
                    }),
                }] : [],
        };
    }
    if (/git/.test(operation))
        return { layout: "git", groups: safeRows.length ? [{ id: "git", label: "Git 结果", count: safeRows.length, items: safeRows.map(row => item(row.subject || row.path || row.label || row.name || "记录", { secondary: row.hash || row.status, path: row.path })) }] : [] };
    if (/test|build|lint|typecheck|verify|verification|maven|gradle/.test(operation))
        return { layout: "verification" };
    if (safeRows.length)
        return { layout: "generic", groups: [{ id: "results", label: "结果", count: safeRows.length, items: safeRows.map(row => item(row.label || row.name || row.path || row.location || "记录", { secondary: row.value || row.status, path: row.path })) }] };
    return undefined;
}
const cleanText = (value, max = 1500) => String(value ?? "")
    .replace(/((?:api[_-]?key|access[_-]?token|authorization|cookie|password|secret|credential)\s*[:=]\s*["']?)[^\s,"'}]{6,}/gi, "$1[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/[\0\r\t]+/g, " ")
    .trim()
    .slice(0, max);
// Source rows are transient and need to preserve indentation. Keep tabs and
// spaces intact while applying the same credential redaction boundary.
const cleanSourceLine = (value, max = 12_000) => String(value ?? "")
    .replace(/((?:api[_-]?key|access[_-]?token|authorization|cookie|password|secret|credential)\s*[:=]\s*["']?)[^\s,"'}]{6,}/gi, "$1[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/[\0\r]/g, "")
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
    const internalWorkspaceTool = canonicalName.startsWith("mcp__ccm__ccm_workspace_readonly__")
        || canonicalName.startsWith("mcp__ccm__ccm_workspace_edit__");
    const rawNormalized = operation.toLowerCase();
    const nativeAliases = {
        read: "read_file", fileread: "read_file", readfile: "read_file",
        glob: "glob_files", fileglob: "glob_files", findfiles: "glob_files",
        grep: "grep_text", searchtext: "grep_text", codesearch: "grep_text",
        ls: "list_directory", listdirectory: "list_directory",
    };
    const normalized = nativeAliases[rawNormalized.replace(/[_\s-]+/g, "")] || rawNormalized;
    const labels = {
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
    const userLabels = {
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
    let family = "other";
    if (/dispatch|test_agent|agent_/i.test(canonicalName))
        family = "agent";
    else if (/test|build|lint|typecheck|verify|verification|maven|gradle/.test(normalized))
        family = "verify";
    else if (/git|diff|commit|branch|status/.test(normalized))
        family = "git";
    else if (/find_definition|find_references|find_implementations|find_type_definition|find_incoming_calls|find_outgoing_calls|workspace_symbols|document_symbols|diagnostic/.test(normalized))
        family = "symbol";
    else if (/glob|grep|search|find_files|query_knowledge|tool_search/.test(normalized))
        family = "search";
    else if (/read|list|inspect_notebook/.test(normalized))
        family = "read";
    else if (/bash|powershell|shell|command|terminal|exec|run_terminal/.test(normalized))
        family = "terminal";
    else if (/mcp|http|request|external|browser|web_/.test(normalized) || serverLabel)
        family = "external";
    const userLabel = userLabels[normalized]
        || (family === "verify" ? (/maven/.test(normalized) ? "运行 Maven 构建" : /gradle/.test(normalized) ? "运行 Gradle 构建" : `运行 ${label}`)
            : family === "terminal" ? "运行项目命令"
                : family === "git" ? "检查 Git 状态"
                    : family === "agent" ? "执行 Agent 操作"
                        : family === "external" ? "调用外部工具" : label);
    const category = /dispatch|test_agent|agent_/i.test(canonicalName)
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
function redactedCommand(args) {
    const value = args.command ?? args.script ?? args.shellCommand ?? args.shell_command ?? args.cmd;
    if (value == null)
        return "";
    let result = cleanText(value, 1_000)
        .replace(/(^|\s)([A-Z_][A-Z0-9_]*(?:=|:))[^\s]+/g, "$1$2[redacted]")
        .replace(/((?:password|passwd|token|secret|api[_-]?key|access[_-]?key)\s*[:=]\s*)[^\s]+/gi, "$1[redacted]");
    // Inline script/code bodies are never persisted, even in technical detail.
    result = result.replace(/(\s(?:-e|--eval|-Command|-EncodedCommand|\/c)\s+)[\s\S]*$/i, "$1[脚本内容已隐藏]");
    result = result.replace(/(?:<<[-~]?\s*['\"]?\w+['\"]?)[\s\S]*$/i, "[内联脚本已隐藏]");
    return result.slice(0, 500);
}
const argumentLabels = {
    project_id: "项目", projectId: "项目", path: "路径", pattern: "检索内容", query: "查询",
    symbol: "符号", glob: "文件范围", offset: "起始行", limit: "数量上限",
    staged: "暂存区", profile_id: "运行配置", kind: "类型", name: "名称", url: "网址",
    paths: "文件列表", source: "来源路径", destination: "目标路径", expected_checksum: "文件版本",
    work_item_id: "工作项", attempt: "尝试次数", lease_id: "任务租约", replace_all: "替换全部",
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
    let current = value;
    const visited = new Set();
    for (let depth = 0; depth < 8; depth += 1) {
        if (current == null || visited.has(current))
            break;
        if (typeof current === "object")
            visited.add(current);
        if (typeof current === "string") {
            try {
                current = JSON.parse(current);
                continue;
            }
            catch {
                break;
            }
        }
        if (current?.schema === "ccm-workspace-tool-envelope-v3" && current?.modelPayload != null) {
            current = current.modelPayload;
            continue;
        }
        if (current && typeof current === "object" && [
            "items", "lines", "files", "locations", "diagnostics", "commits", "configs", "snapshot",
            "item_count", "total_count", "page_count", "cells",
        ].some(key => current[key] != null))
            break;
        if (current?.rawOutput != null) {
            current = current.rawOutput;
            continue;
        }
        if (current?.output != null) {
            current = current.output;
            continue;
        }
        const textBlock = Array.isArray(current?.content)
            ? current.content.find((item) => item?.type === "text" && typeof item?.text === "string")
            : null;
        if (textBlock?.text) {
            current = textBlock.text;
            continue;
        }
        break;
    }
    return current;
}
function targetFromArgs(args) {
    return cleanText(args?.path || args?.source || args?.destination || args?.file_path || args?.filePath || args?.symbol || args?.query || args?.pattern
        || args?.name || args?.skill || args?.project_id || args?.projectId || "", 300);
}
function resultProjection(operation, rawInput, error, transientBody) {
    if (error)
        return { kind: "error", summary: cleanText(error, 500) || "工具执行失败", truncated: false };
    const raw = unwrapResult(rawInput);
    if (raw == null || raw === "")
        return { kind: "empty", summary: "没有返回内容", truncated: false };
    if (raw?.status === "needs_project_id" || raw?.schema === "ccm-workspace-project-required-v1") {
        const names = (Array.isArray(raw.available_projects) ? raw.available_projects : [])
            .map((item) => String(item || "").trim())
            .filter(Boolean);
        return {
            kind: "summary",
            summary: names.length ? `请选择要查看的项目：${names.join("、")}` : "请指定要查看的项目",
            truncated: false,
        };
    }
    const total = Number(raw?.total ?? raw?.total_count ?? raw?.locations?.length ?? raw?.diagnostics?.length ?? raw?.items?.length ?? 0);
    const truncated = raw?.truncated === true;
    const nextCursor = cleanText(raw?.next_cursor || raw?.nextCursor || "", 300);
    const paging = { ...(Number.isFinite(total) ? { total } : {}), truncated, ...(nextCursor ? { nextCursor } : {}) };
    const searchExecution = raw?.searchExecution && typeof raw.searchExecution === "object" ? {
        engine: ["bundled_rg", "system_rg", "node_fallback"].includes(String(raw.searchExecution.engine)) ? raw.searchExecution.engine : "node_fallback",
        timedOut: raw.searchExecution.timedOut === true,
        cancelled: raw.searchExecution.cancelled === true,
        partial: raw.searchExecution.partial === true,
    } : undefined;
    const partialSuffix = searchExecution?.cancelled ? " · 搜索已取消，保留已返回结果"
        : searchExecution?.timedOut ? " · 搜索超时，已返回部分结果"
            : searchExecution?.partial ? " · 已返回部分结果" : "";
    if (operation === "list_directory") {
        const rows = (Array.isArray(raw?.items) ? raw.items : []).slice(0, 40).map((item) => ({
            name: cleanText(item?.name || item?.path || item, 500), type: cleanText(item?.type || "", 40), path: cleanText(item?.path || "", 800),
        }));
        const directories = rows.filter((row) => row.type === "directory").length;
        const files = rows.filter((row) => row.type === "file").length;
        return { kind: "list", summary: `发现 ${total || rows.length} 项（${directories} 个目录，${files} 个文件）`, rows, presentation: resultPresentation(operation, rows, raw), ...paging };
    }
    if (operation === "glob_files") {
        const rows = (Array.isArray(raw?.items) ? raw.items : []).slice(0, 40).map((item) => ({ path: cleanText(item?.path || item, 800) }));
        const count = Number(raw?.numFiles ?? raw?.itemCount ?? raw?.safeReceipt?.itemCount ?? rows.length);
        const pageCount = Number.isFinite(count) ? Math.max(0, count) : rows.length;
        const found = total || pageCount;
        const summary = found > 0
            ? (total > pageCount && pageCount > 0
                ? `找到 ${total} 个文件，本页 ${pageCount} 个${partialSuffix}`
                : `找到 ${found} 个文件${partialSuffix}`)
            : searchExecution?.partial ? `暂未返回匹配文件${partialSuffix}，可缩小目录或模式后重试`
                : "未找到匹配文件";
        return { kind: "list", summary, rows, presentation: resultPresentation(operation, rows, raw), ...(searchExecution ? { searchExecution } : {}), ...paging };
    }
    if (operation === "grep_text") {
        const rows = (Array.isArray(raw?.lines) ? raw.lines : []).slice(0, 40).map((item) => {
            const line = typeof item === "string" ? item : String(item?.text || "");
            const match = line.match(/^(.+?):(\d+)(?::|$)/);
            return transientBody ? { location: match ? `${match[1]}:${match[2]}` : "", preview: cleanText(line, 1200) }
                : { location: match ? `${match[1]}:${match[2]}` : cleanText(line.split(":").slice(0, 2).join(":"), 800) };
        });
        const count = total || rows.length;
        const summary = count > 0 ? `找到 ${count} 条匹配${partialSuffix}`
            : searchExecution?.partial ? `暂未返回匹配内容${partialSuffix}，可缩小目录或检索范围后重试`
                : "未找到匹配内容";
        return { kind: "locations", summary, rows, presentation: resultPresentation(operation, rows, raw), rehydratable: !transientBody, ...(searchExecution ? { searchExecution } : {}), ...paging };
    }
    if (operation === "query_knowledge") {
        const sources = [
            ...(Array.isArray(raw?.sources) ? raw.sources : []),
            ...(Array.isArray(raw?.sourceReferences) ? raw.sourceReferences : []),
            ...(Array.isArray(raw?.source_references) ? raw.source_references : []),
            ...(Array.isArray(raw?.results) ? raw.results : []),
        ];
        const names = [...new Set(sources.map((source) => cleanText(source?.documentName || source?.document_name || source?.filename || source?.sourceId || source?.source_id, 500)).filter(Boolean))].slice(0, 20);
        const citationNames = names.length ? names : [...new Set((Array.isArray(raw?.citations) ? raw.citations : [])
                .map((citation) => cleanText(citation, 500).replace(/#\d+$/, ""))
                .filter(Boolean))].slice(0, 20);
        return {
            kind: citationNames.length ? "list" : "empty",
            summary: citationNames.length ? `参考了 ${citationNames.length} 份知识资料` : "未找到与当前范围可靠匹配的知识资料",
            ...(citationNames.length ? { rows: citationNames.map(name => ({ name })) } : {}),
            total: citationNames.length,
            truncated: false,
        };
    }
    if (operation === "read_files") {
        const files = Array.isArray(raw?.files) ? raw.files : [];
        const count = Number(raw?.item_count ?? raw?.itemCount ?? raw?.safeReceipt?.itemCount ?? files.length ?? 0);
        const normalizedCount = Number.isFinite(count) ? Math.max(0, count) : 0;
        const pending = files.filter((file) => file?.truncated === true && Number(file?.next_cursor || file?.nextCursor || 0) > 0);
        const unchanged = files.filter((file) => file?.status === "unchanged" || file?.type === "file_unchanged").length;
        const failed = files.filter((file) => file?.status === "failed" || file?.type === "text_error").length;
        const rows = files.slice(0, 40).map((file) => {
            const sourceLines = Array.isArray(file?.lines) ? file.lines : [];
            const from = Number(sourceLines[0]?.line || file?.offset || 0);
            const to = Number(sourceLines.at(-1)?.line || from);
            return ({
                path: cleanText(file?.path || "文件", 800),
                status: file?.status === "failed" || file?.type === "text_error" ? "读取失败"
                    : file?.status === "unchanged" || file?.type === "file_unchanged" ? "内容未变化"
                        : file?.truncated === true ? "部分读取" : "已读完",
                lines: Math.max(0, Number(file?.lines?.length || file?.safeReceipt?.lineCount || 0)),
                ...(from > 0 ? { from, to: Math.max(from, to) } : {}),
                ...(Number(file?.total_lines || file?.totalLines || 0) > 0 ? { totalLines: Number(file?.total_lines || file?.totalLines) } : {}),
                ...(file?.status === "failed" || file?.type === "text_error" ? { reason: cleanText(file?.error || "文件读取失败", 500) } : {}),
                ...(file?.checksum ? { checksum: cleanText(file.checksum, 160) } : {}),
                ...(file?.truncated === true && Number(file?.next_cursor || file?.nextCursor || 0) > 0
                    ? { nextLine: Number(file?.next_cursor || file?.nextCursor) } : {}),
            });
        });
        const fileRows = transientBody ? files.slice(0, 40).map((file) => {
            const sourceLines = Array.isArray(file?.lines) ? file.lines : [];
            const normalizedLines = sourceLines.slice(0, 2000).map((line, index) => ({
                line: Math.max(1, Number(line?.line || Number(file?.offset || 1) + index)),
                text: cleanSourceLine(line?.text ?? line ?? "", 12_000),
            }));
            const from = Number(normalizedLines[0]?.line || file?.offset || 1);
            const to = Number(normalizedLines.at(-1)?.line || from);
            const nextOffset = Number(file?.next_cursor || file?.nextCursor || 0);
            return {
                path: cleanText(file?.path || "文件", 800),
                status: file?.status === "failed" || file?.type === "text_error" ? "failed"
                    : file?.status === "unchanged" || file?.type === "file_unchanged" ? "unchanged"
                        : file?.truncated === true ? "partial" : "completed",
                from: Math.max(1, from),
                to: Math.max(Math.max(1, from), to),
                totalLines: Math.max(to, Number(file?.total_lines || file?.totalLines || to)),
                ...(file?.truncated === true && nextOffset > 0 ? { nextOffset } : {}),
                ...(file?.checksum ? { checksum: cleanText(file.checksum, 160) } : {}),
                lines: normalizedLines,
            };
        }) : undefined;
        const continuation = transientBody && pending.length ? {
            kind: "read_files",
            pendingCount: pending.length,
            files: pending.map((file) => ({
                path: cleanText(file?.path, 800),
                nextOffset: Math.max(1, Number(file?.next_cursor || file?.nextCursor || 1)),
                checksum: cleanText(file?.checksum, 160),
            })).filter((file) => file.path),
        } : undefined;
        return {
            kind: "summary",
            summary: failed
                ? `已处理 ${normalizedCount} 个文件，成功读取 ${Math.max(0, normalizedCount - failed)} 个，${failed} 个读取失败${pending.length ? `，${pending.length} 个仍有内容未读完` : ""}`
                : `已读取 ${normalizedCount} 个文件${unchanged ? `，${unchanged} 个内容未变化` : ""}${pending.length ? `，其中 ${pending.length} 个文件仍有内容未读完` : ""}`,
            total: normalizedCount,
            truncated: pending.length > 0,
            rehydratable: true,
            presentation: resultPresentation(operation, rows, raw),
            rows,
            ...(fileRows ? { fileRows } : {}),
            ...(continuation?.files.length ? { continuation } : {}),
        };
    }
    if (operation === "read_file") {
        if (raw?.status === "unchanged" || raw?.type === "file_unchanged") {
            return { kind: "summary", summary: `${cleanText(raw?.path || "文件", 500)} 内容未变化，继续使用当前上下文`, presentation: resultPresentation(operation, [], raw), rehydratable: false, ...paging };
        }
        if (raw?.kind === "image" || raw?.type === "image") {
            const width = Number(raw?.width || raw?.dimensions?.displayWidth || 0);
            const height = Number(raw?.height || raw?.dimensions?.displayHeight || 0);
            return { kind: "summary", summary: `已读取图片${width && height ? ` · ${width}×${height}` : ""}`, presentation: resultPresentation(operation, [], raw), rehydratable: true, ...paging };
        }
        if (raw?.kind === "pdf" || raw?.type === "pdf") {
            const pages = Number(raw?.page_count || raw?.pageCount || raw?.pages?.length || 0);
            return { kind: "summary", summary: `已读取 PDF${pages ? ` · ${pages} 页` : ""}`, presentation: resultPresentation(operation, [], raw), rehydratable: true, ...paging };
        }
        if (raw?.kind === "notebook" || raw?.type === "notebook") {
            const cells = Number(raw?.item_count || raw?.itemCount || raw?.cells?.length || raw?.total_cells || 0);
            return { kind: "summary", summary: `已读取 Notebook${cells ? ` · ${cells} 个单元格` : ""}`, presentation: resultPresentation(operation, [], raw), rehydratable: true, ...paging };
        }
        const sourceRows = Array.isArray(raw?.lines) ? raw.lines : [];
        const sourceLines = transientBody ? sourceRows.slice(0, 2000).map((item) => ({ line: Math.max(1, Number(item?.line || 1)), text: cleanSourceLine(item?.text ?? "", 12_000) })) : [];
        const from = Number(raw?.offset || sourceRows[0]?.line || 0);
        const to = Number(sourceRows.at(-1)?.line || from);
        const totalLines = Math.max(to, Number(raw?.total_lines || raw?.totalLines || to));
        const checksum = cleanText(raw?.checksum || raw?.safeReceipt?.checksum || "", 160);
        const metadataRows = [{
                path: cleanText(raw?.path || "文件", 800),
                status: raw?.truncated === true ? "部分读取" : "已读完",
                ...(from > 0 ? { from, to: Math.max(from, to) } : {}),
                ...(totalLines > 0 ? { totalLines } : {}),
                ...(checksum ? { checksum } : {}),
            }];
        const nextOffset = Number(raw?.next_cursor || raw?.nextCursor || 0);
        const fileRows = transientBody ? [{
                path: cleanText(raw?.path || "文件", 800),
                status: raw?.truncated === true ? "partial" : "completed",
                from: Math.max(1, from || 1),
                to: Math.max(1, to || from || 1),
                totalLines,
                ...(raw?.truncated === true && nextOffset > 0 ? { nextOffset } : {}),
                ...(checksum ? { checksum } : {}),
                lines: sourceLines,
            }] : undefined;
        const continuation = transientBody && raw?.truncated === true && nextOffset > 0 && checksum ? {
            kind: "read_file",
            pendingCount: 1,
            files: [{ path: cleanText(raw?.path || "文件", 800), nextOffset, checksum }],
        } : undefined;
        return {
            kind: transientBody ? "text" : "summary",
            summary: `读取 ${cleanText(raw?.path || "文件", 500)}${from ? ` 第 ${from}${to > from ? `–${to}` : ""} 行` : ""}`,
            rows: metadataRows,
            ...(fileRows ? { fileRows } : {}),
            ...(continuation ? { continuation } : {}),
            presentation: resultPresentation(operation, metadataRows, raw),
            rehydratable: !transientBody,
            ...(checksum ? { authoritativeRevision: checksum } : {}),
            ...paging,
        };
    }
    if (["run_command", "get_command_output", "stop_command"].includes(operation)) {
        const status = cleanText(raw?.status || "", 40);
        const description = cleanText(raw?.description || "项目命令", 160);
        const summaries = {
            running: `${description}仍在运行`, completed: `${description}已完成`, failed: `${description}未通过`,
            cancelled: `${description}已停止`, timed_out: `${description}运行超时`, needs_recheck: `${description}需要重新核验`,
        };
        const exitCode = Number(raw?.exitCode ?? raw?.exit_code);
        const durationMs = Number(raw?.durationMs ?? raw?.duration_ms);
        return {
            kind: status === "failed" || status === "timed_out" ? "error" : "summary",
            summary: summaries[status] || `${description}状态已更新`,
            presentation: { layout: "verification" },
            truncated: Boolean(raw?.truncated),
            authoritativeRevision: cleanText(raw?.revision || "", 40),
            commandExecution: {
                status: status || "unknown",
                ...(Number.isFinite(exitCode) ? { exitCode } : {}),
                ...(Number.isFinite(durationMs) && durationMs >= 0 ? { durationMs } : {}),
            },
        };
    }
    if (["apply_patch", "write_file", "move_path", "delete_path"].includes(operation) && raw?.schema === "ccm-workspace-edit-result-v1") {
        const labels = { apply_patch: "文件修改已保存", write_file: raw?.created ? "文件已创建" : "文件已写入", move_path: "文件已移动", delete_path: "文件已删除" };
        return { kind: "summary", summary: labels[operation] || "文件变更已保存", truncated: false, authoritativeRevision: cleanText(raw?.afterChecksum || raw?.beforeChecksum || "", 160) };
    }
    if (/find_|workspace_symbols|document_symbols/.test(operation) && Array.isArray(raw?.locations)) {
        const rows = raw.locations.slice(0, 40).map((item) => ({ path: cleanText(item?.path, 800), range: safeValue(item?.range), symbol: cleanText(item?.symbol, 300), kind: cleanText(item?.kind, 100) }));
        return { kind: "locations", summary: `找到 ${total || rows.length} 个位置`, rows, presentation: resultPresentation(operation, rows, raw), ...paging };
    }
    if (operation === "read_code_diagnostics") {
        const sourceRows = Array.isArray(raw?.diagnostics) ? raw.diagnostics : Array.isArray(raw?.locations) ? raw.locations : [];
        const rows = safeValue(sourceRows);
        return {
            kind: "diagnostics",
            summary: `${sourceRows.length} 条诊断`,
            rows,
            presentation: {
                layout: "verification",
                groups: rows.length ? [{
                        id: "diagnostics",
                        label: "诊断结果",
                        count: rows.length,
                        items: rows.map(row => ({
                            label: cleanText(row?.message || row?.label || "诊断信息", 500),
                            ...(row?.path ? { path: cleanText(row.path, 800) } : {}),
                            ...(Number.isFinite(Number(row?.line)) && Number(row.line) > 0 ? { line: Number(row.line) } : {}),
                            ...(row?.severity ? { status: cleanText(row.severity, 80) } : {}),
                        })),
                    }] : [],
            },
            ...paging,
        };
    }
    if (operation === "read_git_status") {
        const lines = (Array.isArray(raw?.lines) ? raw.lines : []).map((line) => cleanText(line, 900)).filter(Boolean);
        const branch = lines.find((line) => line.startsWith("## "))?.slice(3) || "";
        const changes = lines.filter((line) => !line.startsWith("## ")).map((line) => {
            const code = line.slice(0, 2);
            const label = code.includes("?") ? "未跟踪" : code.includes("A") ? "已新增" : code.includes("D") ? "已删除"
                : code.includes("R") ? "已重命名" : code.includes("U") ? "存在冲突" : "已修改";
            return {
                label: cleanText(line.slice(3) || line, 800),
                secondary: label,
                path: cleanText(line.slice(3) || line, 800),
                status: code.includes("U") ? "conflict" : "changed",
            };
        });
        return {
            kind: "list",
            summary: changes.length ? `当前分支有 ${changes.length} 个文件变化${branch ? ` · ${branch}` : ""}` : `工作区干净${branch ? ` · ${branch}` : ""}`,
            rows: changes,
            presentation: {
                layout: "git",
                groups: changes.length ? [{ id: "changes", label: "文件变化", count: changes.length, items: changes }] : [],
            },
            ...paging,
        };
    }
    if (operation === "read_git_diff") {
        const sourceRows = Array.isArray(raw?.lines) ? raw.lines : [];
        return { kind: "diff", summary: sourceRows.length ? `${sourceRows.length} 行差异` : "没有未提交差异", presentation: { layout: "git" }, ...(transientBody ? { rows: safeValue(sourceRows, 0, true) } : {}), rehydratable: sourceRows.length > 0 && !transientBody, ...paging };
    }
    if (operation === "read_git_history" && Array.isArray(raw?.commits)) {
        const rows = safeValue(raw.commits);
        return { kind: "table", summary: `${raw.commits.length} 条提交`, rows, presentation: resultPresentation(operation, rows, raw), ...paging };
    }
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
const WORKSPACE_READONLY_SHORT_NAMES = new Set([
    "list_directory", "glob_files", "grep_text", "read_file", "read_files",
    "inspect_notebook", "web_fetch", "web_search",
    "find_definition", "find_references", "workspace_symbols", "document_symbols",
    "find_implementations", "find_type_definition", "find_incoming_calls", "find_outgoing_calls",
    "read_code_diagnostics", "read_project_config", "read_project_source",
    "read_git_status", "read_git_diff", "read_git_history",
    "read_runtime_status", "read_runtime_logs", "read_runtime_diagnostics",
]);
function workspaceReadonlyToolShortName(value) {
    return String(value || "").replace(/^mcp__ccm__ccm_workspace_readonly__/, "");
}
function isWorkspaceReadonlyToolName(value) {
    const raw = String(value || "");
    if (!raw)
        return false;
    if (raw.startsWith("mcp__ccm__ccm_workspace_readonly__"))
        return true;
    return WORKSPACE_READONLY_SHORT_NAMES.has(raw);
}
function workspaceReadonlyContractVersion(value, storedVersion) {
    const raw = String(value || "");
    const shortName = workspaceReadonlyToolShortName(raw);
    if (shortName === "read_files")
        return 3;
    if (Number(storedVersion) === 3)
        return 3;
    if (Number(storedVersion) === 2)
        return 2;
    // Main-agent events persist short names and always execute V3.
    return WORKSPACE_READONLY_SHORT_NAMES.has(raw) ? 3 : 2;
}
//# sourceMappingURL=tool-display-projection.js.map