"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleToolsAndMetricsApi = handleToolsAndMetricsApi;
// Behavior-freeze split from tools.ts (part 2/2).
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const storage_1 = require("../collaboration/storage");
const runtime_tool_sync_1 = require("../../tools/runtime-tool-sync");
const tool_authorization_1 = require("../../tools/tool-authorization");
const runtime_tool_real_cli_matrix_1 = require("../../tools/runtime-tool-real-cli-matrix");
const terminal_1 = require("./terminal");
const marketplace_1 = require("./marketplace");
const tool_catalog_management_1 = require("../../tools/tool-catalog-management");
const internal_mcp_registry_1 = require("../../tools/internal-mcp-registry");
const { toolManager } = require("../../tools/tool-manager");
const tools_part_01_1 = require("./tools-part-01");
function handleToolsAndMetricsApi(pathname, req, res, parsed) {
    if ((0, terminal_1.handleTerminalApi)(pathname, req, res))
        return true;
    // === MCP/Skills API ===
    if (pathname === "/api/tools/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, ...toolManager.getToolList() });
        return true;
    }
    if (pathname === "/api/tools/internal-mcp" && req.method === "GET") {
        const runtime = toolManager.getToolList();
        (0, utils_1.sendJson)(res, (0, internal_mcp_registry_1.buildInternalMcpCatalog)({ feishuConfig: (0, db_1.loadFeishuConfig)(), runtimeServers: runtime.servers || [] }));
        return true;
    }
    if (pathname === "/api/tools/authorization-options" && req.method === "GET") {
        (0, utils_1.sendJson)(res, (0, tool_authorization_1.buildToolAuthorizationOptions)({
            mcpTools: (0, db_1.loadMcpTools)(),
            skills: (0, db_1.loadSkills)(),
            status: toolManager.getToolList(),
        }));
        return true;
    }
    if (pathname === "/api/tools/authorization-inventory" && req.method === "GET") {
        try {
            const includeRuntime = !["0", "false", "no"].includes(String(parsed?.query?.runtime || "1").toLowerCase());
            const runtimeReadiness = includeRuntime
                ? (0, tools_part_01_1.loadLatestRuntimeToolReadiness)(240, { businessOnly: true })
                : [];
            const inventory = (0, tool_authorization_1.buildToolAuthorizationInventory)({
                projects: (0, db_1.loadProjectConfigs)(),
                groups: (0, storage_1.loadGroups)(),
                runtimeReadiness,
            });
            (0, utils_1.sendJson)(res, { success: true, ...inventory });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/tools/invocation-audit" && req.method === "GET") {
        (0, utils_1.sendJson)(res, (0, tools_part_01_1.buildToolInvocationAudit)(parsed?.query || { limit: 80 }));
        return true;
    }
    if (pathname === "/api/tools/chain-verification" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, (0, tools_part_01_1.buildToolChainVerification)(parsed?.query || {}));
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/tools/mcp-skill-goal-audit" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, (0, tools_part_01_1.buildMcpSkillGoalCompletionAudit)(parsed?.query || {}));
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/tools/runtime-readiness" && req.method === "GET") {
        const deep = ["1", "true", "yes"].includes(String(parsed?.query?.deep || "").toLowerCase());
        const includeHistory = ["1", "true", "yes"].includes(String(parsed?.query?.history || "").toLowerCase());
        const historicalAudits = (0, runtime_tool_sync_1.listRecentRuntimeToolAudits)(240);
        const audits = includeHistory ? historicalAudits : (0, tools_part_01_1.selectLatestRuntimeToolAudits)(historicalAudits);
        const readiness = audits.map(audit => (0, runtime_tool_sync_1.probeRuntimeToolReadiness)(audit, { deep }));
        (0, utils_1.sendJson)(res, {
            success: true,
            deep,
            includeHistory,
            historicalTotal: historicalAudits.length,
            readiness,
            summary: {
                total: readiness.length,
                ready: readiness.filter(item => item.overallReady).length,
                deliveryReady: readiness.filter(item => item.deliveryReady).length,
                runtimeReady: readiness.filter(item => item.runtimeReady).length,
            },
        });
        return true;
    }
    if (pathname === "/api/tools/runtime-real-cli-matrix" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, ...(0, runtime_tool_real_cli_matrix_1.getRuntimeToolRealCliMatrixStatus)() });
        return true;
    }
    if (pathname === "/api/tools/runtime-real-cli-matrix" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const started = (0, runtime_tool_real_cli_matrix_1.startRuntimeToolRealCliMatrix)(payload);
                (0, utils_1.sendJson)(res, { success: true, ...started }, started.accepted ? 202 : 200);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tools/runtime-resync" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const resync = (0, runtime_tool_sync_1.resyncRecentRuntimeToolSnapshots)(payload);
                const includeMissing = (0, tools_part_01_1.normalizeTruthFlag)(payload.includeMissing ?? payload.include_missing);
                const missing = includeMissing ? (0, runtime_tool_sync_1.resyncMissingRuntimeToolSnapshots)(payload) : null;
                (0, utils_1.sendJson)(res, { success: true, ...resync, missing });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tools/catalog-impact" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const type = payload.type === "skill" ? "skill" : "mcp";
                const name = (0, tool_catalog_management_1.normalizeToolCatalogName)(payload.name);
                (0, utils_1.sendJson)(res, { success: true, ...(0, marketplace_1.previewToolCatalogMutationImpact)({ action: payload.action || "preview", type, name }) });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tools/test" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const name = payload.name ? (0, tool_catalog_management_1.normalizeToolCatalogName)(payload.name) : "connection-test";
                const existing = (0, db_1.loadMcpTools)().find(item => String(item.name) === name);
                const candidate = (0, tool_catalog_management_1.mergeMcpToolUpdate)(existing, { ...payload, name }, { create: !existing });
                toolManager.testConnection(candidate.command, candidate.env, candidate.args || [])
                    .then((result) => (0, utils_1.sendJson)(res, { ...result, tested: (0, tool_catalog_management_1.redactMcpToolForDisplay)(candidate) }))
                    .catch((e) => (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tools/reload" && req.method === "POST") {
        toolManager.disconnect();
        toolManager.loadTools().then(() => (0, utils_1.sendJson)(res, { success: true, ...toolManager.getToolList() }));
        return true;
    }
    if (pathname === "/api/tools/skills/discover" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, skills: toolManager.discoverSkills() });
        return true;
    }
    if (pathname === "/api/tools/skills/invoke" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const result = toolManager.invokeSkill(payload.name || payload.skill, payload.input || payload.context || "", payload.scope);
                (0, utils_1.sendJson)(res, { success: !!result.ok, result });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // === MCP 工具管理 API ===
    if (pathname === "/api/mcp" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, tools: (0, db_1.loadMcpTools)().filter(tool => !(0, internal_mcp_registry_1.isInternalMcpName)(tool?.name)).map(tool_catalog_management_1.redactMcpToolForDisplay) });
        return true;
    }
    if (pathname === "/api/mcp" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = JSON.parse(body || "{}");
                const name = (0, tool_catalog_management_1.normalizeToolCatalogName)(payload.name);
                if ((0, internal_mcp_registry_1.isInternalMcpName)(name))
                    return (0, utils_1.sendJson)(res, { success: false, error: "内部 MCP 随项目安装并由系统管理，不能在外部 MCP 连接中心编辑" }, 409);
                const previous = (0, db_1.loadMcpTools)().find(item => String(item.name) === name) || null;
                if (payload.createOnly === true && previous)
                    return (0, utils_1.sendJson)(res, { success: false, error: "同名 MCP 服务器已存在" }, 409);
                const tool = (0, tool_catalog_management_1.mergeMcpToolUpdate)(previous, { ...payload, name }, { create: !previous });
                (0, db_1.saveMcpTool)(tool);
                let reload;
                try {
                    reload = await (0, tools_part_01_1.reloadToolManagerAfterCatalogMutation)({
                        action: previous ? (previous.enabled !== tool.enabled && Object.keys(payload).every(key => ["name", "enabled"].includes(key)) ? "toggle" : "update") : "create",
                        type: "mcp",
                        name,
                    });
                }
                catch (error) {
                    await (0, tools_part_01_1.rollbackCatalogMutation)("mcp", name, previous);
                    throw error;
                }
                (0, utils_1.sendJson)(res, { success: true, tool: (0, tool_catalog_management_1.redactMcpToolForDisplay)(tool), reload });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/mcp/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { name: rawName } = JSON.parse(body || "{}");
                const name = (0, tool_catalog_management_1.normalizeToolCatalogName)(rawName);
                if ((0, internal_mcp_registry_1.isInternalMcpName)(name))
                    return (0, utils_1.sendJson)(res, { success: false, error: "内部 MCP 是项目运行链路的一部分，不能删除" }, 409);
                const previous = (0, db_1.loadMcpTools)().find(item => String(item.name) === name) || null;
                const impact = (0, marketplace_1.previewToolCatalogMutationImpact)({ action: "delete", type: "mcp", name });
                (0, db_1.deleteMcpTool)(name);
                let reload;
                try {
                    reload = await (0, tools_part_01_1.reloadToolManagerAfterCatalogMutation)({
                        action: "delete",
                        type: "mcp",
                        name,
                        changed: !!previous,
                    });
                }
                catch (error) {
                    await (0, tools_part_01_1.rollbackCatalogMutation)("mcp", name, previous);
                    throw error;
                }
                (0, utils_1.sendJson)(res, { success: true, removed: !!previous, impact, reload });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // === Skills API ===
    if (pathname === "/api/skills/manual" && req.method === "GET") {
        try {
            const skill = (0, tools_part_01_1.readSkillManual)(parsed.query.name);
            if (!skill) {
                (0, utils_1.sendJson)(res, { success: false, error: "Skill 不存在" }, 404);
                return true;
            }
            (0, utils_1.sendJson)(res, { success: true, skill });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
        }
        return true;
    }
    if (pathname === "/api/skills/customizations" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, skills: (0, tools_part_01_1.loadCustomSkills)() });
        return true;
    }
    if (pathname === "/api/skills" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { skills: (0, db_1.loadSkills)() });
        return true;
    }
    if (pathname === "/api/skills" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = JSON.parse(body || "{}");
                const name = (0, tool_catalog_management_1.normalizeToolCatalogName)(payload.name);
                const previous = (0, db_1.loadSkills)().find(item => String(item.name) === name) || null;
                if (payload.createOnly === true && previous)
                    return (0, utils_1.sendJson)(res, { success: false, error: "同名 Prompt Skill 已存在" }, 409);
                const skill = {
                    ...(0, tool_catalog_management_1.mergeSkillUpdate)(previous, { ...payload, name }, { create: !previous }),
                    origin: previous?.origin || (previous?.marketplace ? "external" : "user"),
                    scope: previous?.scope || (previous?.marketplace ? "external" : "user"),
                    sourceType: previous?.sourceType || (previous?.marketplace ? "marketplace" : "prompt"),
                    immutable: false,
                    deletable: true,
                    editable: true,
                    disableable: true,
                    systemManaged: false,
                    roleSkill: false,
                };
                (0, db_1.saveSkill)(skill);
                let reload;
                try {
                    reload = await (0, tools_part_01_1.reloadToolManagerAfterCatalogMutation)({
                        action: previous ? "update" : "create",
                        type: "skill",
                        name,
                    });
                }
                catch (error) {
                    await (0, tools_part_01_1.rollbackCatalogMutation)("skill", name, previous);
                    throw error;
                }
                (0, utils_1.sendJson)(res, { success: true, skill, reload });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message, code: e.code }, Number(e.statusCode || 400));
            }
        });
        return true;
    }
    if (pathname === "/api/skills/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { name: rawName } = JSON.parse(body || "{}");
                const name = (0, tool_catalog_management_1.normalizeToolCatalogName)(rawName);
                const previous = (0, db_1.loadSkills)().find(item => String(item.name) === name) || null;
                const impact = (0, marketplace_1.previewToolCatalogMutationImpact)({ action: "delete", type: "skill", name });
                (0, db_1.deleteSkill)(name);
                let reload;
                try {
                    reload = await (0, tools_part_01_1.reloadToolManagerAfterCatalogMutation)({
                        action: "delete",
                        type: "skill",
                        name,
                        changed: !!previous,
                    });
                }
                catch (error) {
                    await (0, tools_part_01_1.rollbackCatalogMutation)("skill", name, previous);
                    throw error;
                }
                (0, utils_1.sendJson)(res, { success: true, removed: !!previous, impact, reload });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message, code: e.code }, Number(e.statusCode || 400));
            }
        });
        return true;
    }
    // === 性能监控指标 ===
    if (pathname === "/api/metrics" && req.method === "GET") {
        const metrics = (0, db_1.loadMetrics)();
        const groups = (0, storage_1.loadGroups)().map((group) => {
            const members = Array.isArray(group.members) ? group.members : [];
            const coordinator = members.find((member) => member.role === "coordinator") || members[0] || {};
            return {
                id: String(group.id || ""),
                name: String(group.name || group.id || "未命名群聊"),
                coordinator: String(coordinator.project || "coordinator"),
                members: members.map((member) => ({
                    project: String(member.project || ""),
                    role: String(member.role || (member.project === coordinator.project ? "coordinator" : "member")),
                })).filter((member) => member.project),
            };
        });
        (0, utils_1.sendJson)(res, {
            metrics,
            catalog: {
                groups,
                global: {
                    id: "global",
                    name: "全局助手",
                    agent: "global-agent",
                    scopeKey: "global:global",
                },
                legacyUnscoped: {
                    agentCount: Object.keys(metrics.agents || {}).length,
                    latestAt: Object.values(metrics.agents || {}).reduce((latest, item) => {
                        const at = String(item?.lastCall || "");
                        return at > latest ? at : latest;
                    }, ""),
                },
            },
            system: (0, tools_part_01_1.buildLivePerformanceSnapshot)(),
        });
        return true;
    }
    if (pathname === "/api/metrics/reset" && req.method === "POST") {
        (0, db_1.saveMetrics)({ version: 2, agents: {}, daily: {}, scopes: {}, events: [], updatedAt: null });
        (0, utils_1.sendJson)(res, { success: true });
        return true;
    }
    // === 共享上下文 API ===
    if (pathname === "/api/shared" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { files: (0, tools_part_01_1.listSharedFiles)() });
        return true;
    }
    if (pathname === "/api/shared/read" && req.method === "GET") {
        const name = parsed.query.name;
        const data = (0, tools_part_01_1.readSharedFile)(name);
        if (!data) {
            (0, utils_1.sendJson)(res, { error: "文件不存在" }, 404);
            return true;
        }
        (0, utils_1.sendJson)(res, { name, ...data });
        return true;
    }
    // 下载文件
    if (pathname === "/api/shared/download" && req.method === "GET") {
        const name = parsed.query.name;
        const filePath = (0, utils_1.getSharedFilePath)(name);
        if (!filePath || !fs.existsSync(filePath)) {
            res.writeHead(404);
            res.end("Not Found");
            return true;
        }
        const ext = path.extname(name).toLowerCase();
        const types = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".svg": "image/svg+xml"
        };
        res.writeHead(200, {
            "Content-Type": types[ext] || "application/octet-stream",
            "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
        });
        fs.createReadStream(filePath).pipe(res);
        return true;
    }
    // 上传文件（multipart）
    if (pathname === "/api/shared/upload" && req.method === "POST") {
        const ct = req.headers["content-type"] || "";
        if (ct.includes("multipart/form-data")) {
            const chunks = [];
            req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            req.on("end", () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const boundary = (0, utils_1.getMultipartBoundary)(ct);
                    if (!boundary)
                        return (0, utils_1.sendJson)(res, { error: "无效请求" }, 400);
                    const { files } = (0, utils_1.parseMultipart)(buffer, boundary);
                    const uploaded = files.map(f => (0, tools_part_01_1.saveSharedUpload)(f.filename, fs.readFileSync(f.savedPath)));
                    try {
                        files.forEach(f => fs.unlinkSync(f.savedPath));
                    }
                    catch { }
                    (0, utils_1.sendJson)(res, { success: true, files: uploaded });
                }
                catch (e) {
                    (0, utils_1.sendJson)(res, { error: e.message }, 400);
                }
            });
            return true;
        }
        (0, utils_1.sendJson)(res, { error: "需要 multipart/form-data" }, 400);
        return true;
    }
    if (pathname === "/api/shared/write" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name, content } = JSON.parse(body);
                (0, tools_part_01_1.writeSharedFile)(name, content);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/shared/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name } = JSON.parse(body);
                (0, tools_part_01_1.deleteSharedFile)(name);
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === 原生文件夹选择 API ===
    if (pathname === "/api/filesystem/native-browse" && req.method === "GET") {
        try {
            const psCommand = `
        Add-Type -AssemblyName System.Windows.Forms
        $d = New-Object System.Windows.Forms.FolderBrowserDialog
        $d.Description = 'Select Project Directory'
        $d.ShowNewFolderButton = $true
        if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
          Write-Output $d.SelectedPath
        }
      `.replace(/\n/g, '; ');
            const out = (0, child_process_1.execSync)(`powershell -WindowStyle Normal -Sta -NoProfile -Command "${psCommand}"`, { encoding: 'utf-8' }).trim();
            if (out && require('fs').existsSync(out)) {
                (0, utils_1.sendJson)(res, { success: true, path: out });
            }
            else {
                (0, utils_1.sendJson)(res, { success: false, error: 'No directory selected' });
            }
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    // === 文件浏览器 API ===
    if (pathname === "/api/filesystem/directory" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
            body += String(chunk || "");
            if (Buffer.byteLength(body, "utf-8") > 16 * 1024)
                req.destroy();
        });
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const parentInput = String(payload.parent || "").trim();
                const name = String(payload.name || "").trim();
                const reserved = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
                if (!parentInput)
                    return (0, utils_1.sendJson)(res, { success: false, error: "缺少当前目录" }, 400);
                const parent = path.resolve(parentInput);
                if (!path.isAbsolute(parent) || !fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "当前目录不存在或不可用" }, 400);
                }
                if (!name || name.length > 120 || name === "." || name === ".." || /[<>:\"/\\|?*\x00-\x1F]/.test(name) || /[. ]$/.test(name) || reserved.test(name)) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "文件夹名称无效" }, 400);
                }
                const target = path.resolve(parent, name);
                if (path.dirname(target) !== parent)
                    return (0, utils_1.sendJson)(res, { success: false, error: "文件夹必须创建在当前目录下" }, 400);
                if (fs.existsSync(target))
                    return (0, utils_1.sendJson)(res, { success: false, error: "同名文件或文件夹已经存在" }, 409);
                fs.mkdirSync(target, { recursive: false });
                (0, utils_1.sendJson)(res, { success: true, path: target, parent, name });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message || "创建文件夹失败" }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/filesystem/browse" && req.method === "GET") {
        const dir = parsed.query.dir || os.homedir();
        try {
            const items = fs.readdirSync(dir, { withFileTypes: true })
                .filter(item => !item.name.startsWith('.'))
                .map(item => ({
                name: item.name,
                path: path.join(dir, item.name),
                isDirectory: item.isDirectory(),
                isFile: item.isFile()
            }))
                .sort((a, b) => {
                if (a.isDirectory && !b.isDirectory)
                    return -1;
                if (!a.isDirectory && b.isDirectory)
                    return 1;
                return a.name.localeCompare(b.name);
            })
                .slice(0, 100);
            (0, utils_1.sendJson)(res, { success: true, path: dir, items });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
        }
        return true;
    }
    // 获取系统磁盘列表
    if (pathname === "/api/filesystem/drives" && req.method === "GET") {
        try {
            let drives = [];
            if (process.platform === 'win32') {
                for (let i = 65; i <= 90; i++) {
                    const letter = String.fromCharCode(i);
                    const drivePath = `${letter}:\\`;
                    try {
                        fs.accessSync(drivePath);
                        drives.push({ name: letter, path: drivePath });
                    }
                    catch { }
                }
            }
            else {
                drives.push({ name: '/', path: '/' });
            }
            (0, utils_1.sendJson)(res, { success: true, drives, home: os.homedir() });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
        }
        return true;
    }
    // === 终端 API ===
    if (pathname === "/api/terminal/exec" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { command, cwd } = JSON.parse(body);
                if (!command)
                    return (0, utils_1.sendJson)(res, { error: "命令不能为空" }, 400);
                const workDir = cwd || os.homedir();
                console.log(`[终端] 执行命令: ${command} (目录: ${workDir})`);
                try {
                    const result = (0, tools_part_01_1.runTerminalCommand)(command, workDir);
                    (0, utils_1.sendJson)(res, { success: true, output: result.output, cwd: result.cwd, error: result.error || undefined });
                }
                catch (e) {
                    const text = (e.stdout || "") + (e.stderr || e.message);
                    (0, utils_1.sendJson)(res, {
                        success: true,
                        output: text,
                        cwd: workDir,
                        error: e.status ? `Exit code: ${e.status}` : e.message
                    });
                }
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // 获取当前系统信息
    if (pathname === "/api/terminal/info" && req.method === "GET") {
        (0, utils_1.sendJson)(res, {
            success: true,
            platform: process.platform,
            home: os.homedir(),
            cwd: process.cwd(),
            user: os.userInfo().username,
            shell: process.platform === 'win32' ? 'powershell' : 'bash'
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=tools-part-02.js.map