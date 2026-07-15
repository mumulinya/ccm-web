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
exports.buildRuntimeToolDispatchGate = buildRuntimeToolDispatchGate;
exports.getRuntimeToolCatalogRevision = getRuntimeToolCatalogRevision;
exports.listRecentRuntimeToolAudits = listRecentRuntimeToolAudits;
exports.probeRuntimeToolReadiness = probeRuntimeToolReadiness;
exports.getRuntimeExecutionEnv = getRuntimeExecutionEnv;
exports.runRuntimeToolSyncSelfTest = runRuntimeToolSyncSelfTest;
exports.syncRuntimeToolsWithCatalog = syncRuntimeToolsWithCatalog;
exports.syncRuntimeTools = syncRuntimeTools;
exports.resyncMissingRuntimeToolSnapshots = resyncMissingRuntimeToolSnapshots;
exports.resyncRecentRuntimeToolSnapshots = resyncRecentRuntimeToolSnapshots;
exports.buildRuntimeToolSyncPrompt = buildRuntimeToolSyncPrompt;
exports.detectInvokedSkillsFromText = detectInvokedSkillsFromText;
exports.recordRuntimeToolSyncAudit = recordRuntimeToolSyncAudit;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const db_1 = require("../core/db");
const runtime_1 = require("../agents/runtime");
const utils_1 = require("../core/utils");
const group_orchestrator_1 = require("../modules/collaboration/group-orchestrator");
const storage_1 = require("../modules/collaboration/storage");
const tool_authorization_1 = require("./tool-authorization");
const CCM_MCP_PREFIX = "ccm__";
const CCM_SKILL_MARKER = ".ccm-managed.json";
const runtimeCliProbeCache = new Map();
function uniqueNames(value) {
    if (!Array.isArray(value))
        return [];
    return Array.from(new Set(value.map(item => String(item || "").trim()).filter(Boolean)));
}
function cleanRuntimeResyncText(value, max = 240) {
    return String(value || "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, max);
}
function getAuthorizationReadiness(auditOrReadiness = {}) {
    const direct = auditOrReadiness?.schema === "ccm-tool-authorization-readiness-v1"
        ? auditOrReadiness
        : auditOrReadiness?.authorization_readiness;
    return direct && direct.schema === "ccm-tool-authorization-readiness-v1" ? direct : null;
}
function summarizeAuthorizationReadiness(readiness) {
    if (!readiness || readiness.dispatchReady !== false)
        return "";
    const missing = readiness.missing || {};
    const parts = [];
    if (missing.missing_mcp_servers)
        parts.push(`MCP server ${missing.missing_mcp_servers}`);
    if (missing.missing_mcp_tools)
        parts.push(`MCP tool ${missing.missing_mcp_tools}`);
    if (missing.missing_skills)
        parts.push(`Skill ${missing.missing_skills}`);
    if (readiness.invalid_mcp_grants)
        parts.push(`无效 MCP 授权 ${readiness.invalid_mcp_grants}`);
    return parts.length ? parts.join("、") : "存在不可用授权项";
}
function formatAuthorizationReadinessNotice(audit) {
    const summary = summarizeAuthorizationReadiness(getAuthorizationReadiness(audit));
    return summary ? ` 授权可派发性需处理：${summary}；缺失或无效授权不会交付给子 Agent。` : "";
}
function buildRuntimeToolDispatchGate(audit = {}) {
    const blockers = [];
    const missingMcp = uniqueNames(audit?.missing?.mcp);
    const missingSkill = uniqueNames(audit?.missing?.skill);
    const authorizationReadiness = getAuthorizationReadiness(audit);
    if (audit?.mode === "failed") {
        blockers.push({
            id: "runtime_sync_failed",
            detail: `Runtime 工具同步失败：${uniqueNames(audit?.errors).join("；") || "未知错误"}`,
            data: { errors: uniqueNames(audit?.errors) },
        });
    }
    if (missingMcp.length || missingSkill.length) {
        blockers.push({
            id: "runtime_missing_tools",
            detail: `授权工具未能交付：${[
                ...missingMcp.map(name => `MCP:${name}`),
                ...missingSkill.map(name => `Skill:${name}`),
            ].join("、")}`,
            data: { missing: { mcp: missingMcp, skill: missingSkill } },
        });
    }
    if (authorizationReadiness?.dispatchReady === false) {
        blockers.push({
            id: "authorization_readiness",
            detail: `授权可派发性未通过：${summarizeAuthorizationReadiness(authorizationReadiness)}`,
            data: { authorization_readiness: authorizationReadiness },
        });
    }
    const reason = blockers.map(item => item.detail).filter(Boolean).join("；");
    return {
        schema: "ccm-runtime-tool-dispatch-gate-v1",
        dispatchReady: blockers.length === 0,
        status: blockers.length === 0 ? "ready" : "blocked",
        reason: blockers.length === 0 ? "runtime tool authorization is dispatch-ready" : reason,
        blockers,
    };
}
function appendJsonlBounded(file, entry) {
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        if (fs.existsSync(file) && fs.statSync(file).size > 2 * 1024 * 1024) {
            const content = fs.readFileSync(file, "utf-8");
            const tail = content.slice(-1024 * 1024);
            fs.writeFileSync(file, tail.slice(Math.max(0, tail.indexOf("\n") + 1)), "utf-8");
        }
        fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, "utf-8");
    }
    catch { }
}
function runtimeCliCandidates(runtime) {
    if (runtime === "claudecode")
        return ["claude"];
    if (runtime === "cursor")
        return ["cursor-agent", "agent"];
    if (runtime === "codex")
        return ["codex"];
    if (runtime === "gemini")
        return ["gemini"];
    if (runtime === "qoder")
        return ["qoder"];
    return [runtime].filter(Boolean);
}
function commandAvailable(command) {
    const result = process.platform === "win32"
        ? (0, child_process_1.spawnSync)("where.exe", [command], { windowsHide: true, encoding: "utf-8" })
        : (0, child_process_1.spawnSync)("sh", ["-lc", `command -v ${command}`], { encoding: "utf-8" });
    return result.status === 0;
}
function runCliProbe(command, args, env = {}, timeout = 15000) {
    const result = (0, child_process_1.spawnSync)(command, args, {
        windowsHide: true,
        encoding: "utf-8",
        timeout,
        shell: process.platform === "win32",
        env: { ...process.env, ...env },
    });
    const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    return {
        ok: result.status === 0 && !result.error,
        output,
        error: result.error?.message || (result.status === 0 ? "" : `exitCode=${result.status}`),
    };
}
function getRuntimeCliProbe(command) {
    const cached = runtimeCliProbeCache.get(command);
    if (cached && cached.expiresAt > Date.now())
        return cached;
    const available = commandAvailable(command);
    if (!available) {
        const result = { expiresAt: Date.now() + 60_000, available: false, ok: false, version: "", error: `${command} 未安装或不在 PATH` };
        runtimeCliProbeCache.set(command, result);
        return result;
    }
    const versionProbe = runCliProbe(command, ["--version"], {}, 10000);
    const result = {
        expiresAt: Date.now() + 60_000,
        available: true,
        ok: versionProbe.ok,
        version: versionProbe.output.split(/\r?\n/).find(Boolean)?.slice(0, 300) || "",
        error: versionProbe.ok ? "" : versionProbe.error,
    };
    runtimeCliProbeCache.set(command, result);
    return result;
}
function readJsonFile(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8").replace(/^\uFEFF/, ""));
    }
    catch {
        return null;
    }
}
function fileStatFingerprint(file) {
    try {
        const stat = fs.statSync(file);
        return { exists: true, size: stat.size, mtimeMs: Math.round(stat.mtimeMs) };
    }
    catch {
        return { exists: false, size: 0, mtimeMs: 0 };
    }
}
function stableHash(value, length = 16) {
    return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, length);
}
function catalogMcpFingerprint(tool) {
    const filename = String(tool?.filename || "").trim();
    const sourceFile = filename ? path.join(db_1.MCP_DIR, filename) : "";
    return {
        type: "mcp",
        name: String(tool?.name || ""),
        enabled: tool?.enabled !== false,
        version: String(tool?.version || ""),
        updated_at: String(tool?.updated_at || tool?.updatedAt || ""),
        marketplaceItemId: String(tool?.marketplace?.itemId || ""),
        marketplaceSourceId: String(tool?.marketplace?.source?.id || ""),
        filename,
        sourceFile: sourceFile ? fileStatFingerprint(sourceFile) : null,
        materialHash: stableHash({
            command: tool?.command || "",
            args: Array.isArray(tool?.args) ? tool.args : [],
            url: tool?.url || "",
            headers: tool?.headers || {},
            env: tool?.env || "",
        }),
    };
}
function catalogSkillFingerprint(skill, skillPackagesDir = db_1.SKILL_PACKAGES_DIR) {
    const filename = String(skill?.filename || "").trim();
    const sourceFile = filename ? path.join(db_1.SKILLS_DIR, filename) : "";
    const skillPackage = resolveSkillPackage(skill, skillPackagesDir);
    return {
        type: "skill",
        name: String(skill?.name || ""),
        enabled: skill?.enabled !== false,
        version: String(skill?.version || ""),
        updated_at: String(skill?.updated_at || skill?.updatedAt || ""),
        marketplaceItemId: String(skill?.marketplace?.itemId || ""),
        marketplaceSourceId: String(skill?.marketplace?.source?.id || ""),
        filename,
        sourceFile: sourceFile ? fileStatFingerprint(sourceFile) : null,
        packagePath: String(skill?.packagePath || ""),
        packageSkillFile: skillPackage?.skillPath ? fileStatFingerprint(skillPackage.skillPath) : null,
        contentHash: String(skill?.contentHash || ""),
        materialHash: stableHash({
            description: skill?.description || "",
            prompt: skill?.prompt || "",
            packagePath: skill?.packagePath || "",
            skillFile: skill?.skillFile || "",
            packageStats: skill?.packageStats || null,
        }),
    };
}
function getRuntimeToolCatalogRevision(catalog = {}, selection = null) {
    const mcpTools = Array.isArray(catalog.mcpTools) ? catalog.mcpTools : (0, db_1.loadMcpTools)();
    const skills = Array.isArray(catalog.skills) ? catalog.skills : (0, db_1.loadSkills)();
    const skillPackagesDir = catalog.skillPackagesDir || db_1.SKILL_PACKAGES_DIR;
    const requestedServers = selection ? requestedMcpServers(selection?.mcp) : [];
    const requestedSkills = selection ? uniqueNames(selection?.skill) : [];
    const serverSet = new Set(requestedServers);
    const skillSet = new Set(requestedSkills);
    const selectedMcp = requestedServers.length
        ? mcpTools.filter(tool => serverSet.has(String(tool?.name || "")))
        : mcpTools;
    const selectedSkills = requestedSkills.length
        ? skills.filter(skill => skillSet.has(String(skill?.name || "")))
        : skills;
    const payload = {
        schema: "ccm-runtime-tool-catalog-revision-v1",
        requestedServers: requestedServers.slice().sort(),
        requestedSkills: requestedSkills.slice().sort(),
        mcp: selectedMcp.map(catalogMcpFingerprint).sort((a, b) => a.name.localeCompare(b.name)),
        skills: selectedSkills.map(skill => catalogSkillFingerprint(skill, skillPackagesDir)).sort((a, b) => a.name.localeCompare(b.name)),
    };
    return stableHash(payload, 20);
}
function listRecentRuntimeToolAudits(limit = 30) {
    const auditFile = path.join(utils_1.CCM_DIR, "agent-runner", "runtime-tool-sync.jsonl");
    const rows = fs.existsSync(auditFile)
        ? fs.readFileSync(auditFile, "utf-8")
            .split(/\r?\n/)
            .filter(Boolean)
            .slice(-Math.max(1, Math.min(500, limit * 8)))
            .map(line => {
            try {
                return JSON.parse(line);
            }
            catch {
                return null;
            }
        })
            .filter(Boolean)
            .reverse()
        : [];
    const snapshotRows = [];
    const runtimeRoot = path.join(utils_1.CCM_DIR, "agent-runtime");
    if (fs.existsSync(runtimeRoot)) {
        for (const runtimeEntry of fs.readdirSync(runtimeRoot, { withFileTypes: true })) {
            if (!runtimeEntry.isDirectory())
                continue;
            const runtimeDir = path.join(runtimeRoot, runtimeEntry.name);
            for (const snapshotEntry of fs.readdirSync(runtimeDir, { withFileTypes: true })) {
                if (!snapshotEntry.isDirectory())
                    continue;
                const snapshotPath = path.join(runtimeDir, snapshotEntry.name, "runtime-tool-snapshot.json");
                const snapshot = fs.existsSync(snapshotPath) ? readJsonFile(snapshotPath) : null;
                if (!snapshot)
                    continue;
                const matchingAudit = rows.find((row) => (row.snapshotId && row.snapshotId === snapshot.snapshotId)
                    || (row.mcpConfigPath && row.mcpConfigPath === snapshot.mcpConfigPath));
                snapshotRows.push({
                    mode: "native-and-proxy",
                    nativeSupported: true,
                    errors: [],
                    warnings: [],
                    timestamp: snapshot.generatedAt || fs.statSync(snapshotPath).mtime.toISOString(),
                    ...matchingAudit,
                    ...snapshot,
                    snapshotPath,
                    projectName: matchingAudit?.projectName || "",
                    groupId: matchingAudit?.groupId || "",
                });
            }
        }
    }
    snapshotRows.sort((left, right) => String(right.timestamp || "").localeCompare(String(left.timestamp || "")));
    const seen = new Set();
    const result = [];
    for (const row of [...rows, ...snapshotRows]) {
        const key = row.snapshotId
            ? `${row.runtime || ""}:${row.snapshotId}:${row.workDir || ""}:${row.projectName || ""}:${row.groupId || ""}`
            : `${row.projectName || ""}:${row.groupId || ""}:${row.runtime || ""}:${row.mcpConfigPath || ""}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        result.push(row);
        if (result.length >= limit)
            break;
    }
    return result;
}
function probeRuntimeToolReadiness(audit, options = {}) {
    const runtime = (0, runtime_1.normalizeAgentRuntimeId)(audit?.runtime || "");
    const checks = [];
    const add = (id, ok, detail) => checks.push({ id, ok, detail });
    const snapshotPath = String(audit?.snapshotPath || "");
    const configPath = String(audit?.mcpConfigPath || "");
    const pluginDir = String(audit?.pluginDirPath || "");
    const requested = {
        mcp: uniqueNames(audit?.requested?.mcp),
        skill: uniqueNames(audit?.requested?.skill),
    };
    const synced = {
        mcp: uniqueNames(audit?.synced?.mcp),
        skill: uniqueNames(audit?.synced?.skill),
    };
    const nativeSyncedMcp = nativeMcpNamesFromAudit(audit);
    const nativeSyncedMcpServers = nativeMcpServerNamesFromAudit(audit);
    const missing = {
        mcp: uniqueNames(audit?.missing?.mcp),
        skill: uniqueNames(audit?.missing?.skill),
    };
    const snapshot = snapshotPath ? readJsonFile(snapshotPath) : null;
    add("snapshot", !!snapshot, snapshot ? snapshotPath : "运行时授权快照不存在或无法解析");
    const authorizationReadiness = getAuthorizationReadiness(audit) || getAuthorizationReadiness(snapshot);
    const dispatchGateSource = audit && typeof audit === "object" ? audit : (snapshot || {});
    const dispatchGate = buildRuntimeToolDispatchGate({ ...dispatchGateSource, authorization_readiness: authorizationReadiness });
    if (authorizationReadiness) {
        add("authorization_readiness", authorizationReadiness.dispatchReady !== false, authorizationReadiness.dispatchReady !== false
            ? "授权项可派发"
            : summarizeAuthorizationReadiness(authorizationReadiness));
    }
    add("dispatch_gate", dispatchGate.dispatchReady !== false, dispatchGate.dispatchReady !== false ? "运行时工具派发门禁通过" : dispatchGate.reason);
    const catalogRevision = String(audit?.catalogRevision || snapshot?.catalogRevision || "");
    const currentCatalogRevision = String(options.catalogRevision || getRuntimeToolCatalogRevision(options.catalog || {}, requested));
    const catalogFresh = !!catalogRevision && catalogRevision === currentCatalogRevision;
    add("catalog_revision", catalogFresh, catalogFresh
        ? `catalog=${catalogRevision}`
        : (catalogRevision
            ? `快照 catalog=${catalogRevision}，当前 catalog=${currentCatalogRevision}；需要重新同步运行时工具`
            : "快照缺少工具目录 revision；需要重新同步运行时工具"));
    const configExists = !!configPath && fs.existsSync(configPath);
    let configValid = configExists;
    if (configExists && path.extname(configPath).toLowerCase() === ".json")
        configValid = !!readJsonFile(configPath);
    if (configExists && path.extname(configPath).toLowerCase() === ".toml") {
        const text = fs.readFileSync(configPath, "utf-8");
        configValid = nativeSyncedMcp.length === 0 || text.includes("[mcp_servers.");
    }
    add("mcp_config", configValid, configValid ? configPath : "MCP 配置不存在或格式无效");
    if (pluginDir) {
        const manifest = runtime === "cursor"
            ? path.join(pluginDir, ".cursor-plugin", "plugin.json")
            : path.join(pluginDir, ".claude-plugin", "plugin.json");
        const pluginManifest = readJsonFile(manifest);
        add("plugin_manifest", !!pluginManifest, manifest);
        const pluginMcpPath = path.join(pluginDir, ".mcp.json");
        const shouldCheckPluginMcp = (runtime === "claudecode" || runtime === "cursor")
            && (nativeSyncedMcpServers.length > 0 || !!pluginManifest?.mcpServers);
        if (shouldCheckPluginMcp) {
            const pluginMcp = readJsonFile(pluginMcpPath);
            const pluginMcpServers = pluginMcp?.mcpServers && typeof pluginMcp.mcpServers === "object" && !Array.isArray(pluginMcp.mcpServers)
                ? pluginMcp.mcpServers
                : {};
            const missingPluginMcpServers = nativeSyncedMcpServers.filter(name => !pluginMcpServers[name]);
            add("plugin_mcp_config", !!pluginMcp && missingPluginMcpServers.length === 0, !pluginMcp
                ? `${pluginMcpPath} 不存在或无法解析`
                : (missingPluginMcpServers.length
                    ? `插件 MCP 缺失: ${missingPluginMcpServers.join(", ")}`
                    : pluginMcpPath));
        }
    }
    const skillStatuses = Array.isArray(audit?.skill_statuses) ? audit.skill_statuses : [];
    const missingSkillFiles = skillStatuses
        .filter((item) => item?.state === "synced")
        .filter((item) => !item.skillPath || !fs.existsSync(item.skillPath))
        .map((item) => String(item.name || ""));
    add("skill_files", missingSkillFiles.length === 0, missingSkillFiles.length ? `缺失: ${missingSkillFiles.join(", ")}` : `${synced.skill.length} 个 Skill 已落盘`);
    const cliCandidates = runtimeCliCandidates(runtime);
    const command = cliCandidates.find(candidate => getRuntimeCliProbe(candidate).available) || cliCandidates[0] || "";
    const cachedCli = command ? getRuntimeCliProbe(command) : { available: false, ok: false, version: "", error: `${runtime} 未安装或不在 PATH` };
    const available = cachedCli.available;
    const version = cachedCli.version;
    const cliError = cachedCli.error;
    if (available) {
        add("cli_start", cachedCli.ok, cachedCli.ok ? (version || command) : (cliError || "CLI 启动失败"));
    }
    else {
        add("cli_start", false, `${command || runtime} 未安装或不在 PATH`);
    }
    if (options.deep && available && runtime === "claudecode" && pluginDir) {
        const validation = runCliProbe(command, ["plugin", "validate", pluginDir], {}, 20000);
        add("plugin_validation", validation.ok, validation.ok ? "Claude plugin validate 通过" : (validation.output || validation.error));
    }
    if (options.deep && available && runtime === "codex" && audit?.isolatedHomePath) {
        const home = String(audit.isolatedHomePath);
        const validation = runCliProbe(command, ["mcp", "list"], {
            HOME: home,
            USERPROFILE: home,
            CODEX_HOME: home,
        }, 20000);
        const missingServers = nativeSyncedMcp.filter(name => !validation.output.includes(`ccm__${safeSlug(name)}`));
        add("native_mcp_list", validation.ok && missingServers.length === 0, validation.ok
            ? (nativeSyncedMcp.length === 0
                ? "无原生 MCP；工具级 MCP 由 CCM 代理执行"
                : (missingServers.length ? `Codex 未发现: ${missingServers.join(", ")}` : "Codex 原生 MCP 列表与授权快照一致"))
            : (validation.output || validation.error));
    }
    const deliveryCheckIds = new Set(["snapshot", "authorization_readiness", "dispatch_gate", "catalog_revision", "mcp_config", "plugin_manifest", "plugin_mcp_config", "skill_files", "plugin_validation", "native_mcp_list"]);
    const deliveryReady = audit?.mode !== "failed"
        && missing.mcp.length === 0
        && missing.skill.length === 0
        && checks.filter(check => deliveryCheckIds.has(check.id)).every(check => check.ok);
    const runtimeReady = checks.find(check => check.id === "cli_start")?.ok === true;
    const result = {
        runtime,
        snapshotId: String(audit?.snapshotId || ""),
        projectName: String(audit?.projectName || ""),
        groupId: String(audit?.groupId || ""),
        checkedAt: new Date().toISOString(),
        snapshotGeneratedAt: String(audit?.timestamp || snapshot?.generatedAt || ""),
        deliveryReady,
        runtimeReady,
        deepChecked: options.deep === true,
        overallReady: deliveryReady && runtimeReady,
        catalogRevision,
        currentCatalogRevision,
        catalogStale: !catalogFresh,
        authorizationReadiness: authorizationReadiness || undefined,
        dispatchGate,
        cli: { command, available, version: version || undefined, error: cliError || undefined },
        checks,
        requested,
        synced,
        missing,
    };
    if (options.record !== false) {
        appendJsonlBounded(path.join(utils_1.CCM_DIR, "agent-runner", "runtime-tool-readiness.jsonl"), result);
    }
    return result;
}
function normalizeMcpKey(value) {
    return safeSlug(String(value || "").replace(/^ccm__/, ""));
}
function parseMcpGrant(value) {
    const raw = String(value || "").trim();
    if (!raw)
        return { raw, server: "", tool: "" };
    if (raw.startsWith("mcp__")) {
        const body = raw.slice("mcp__".length);
        if (body.startsWith("ccm__")) {
            const rest = body.slice("ccm__".length);
            const separator = rest.lastIndexOf("__");
            if (separator > 0) {
                const tool = rest.slice(separator + 2);
                return { raw, server: `ccm__${rest.slice(0, separator)}`, tool: tool === "*" ? "" : tool };
            }
            return { raw, server: body, tool: "" };
        }
        const separator = body.lastIndexOf("__");
        if (separator > 0) {
            const tool = body.slice(separator + 2);
            return { raw, server: body.slice(0, separator), tool: tool === "*" ? "" : tool };
        }
        return { raw, server: body, tool: "" };
    }
    const match = raw.match(/^([^/:]+)[/:](.+)$/);
    if (match)
        return { raw, server: match[1] || "", tool: match[2] === "*" ? "" : match[2] || "" };
    return { raw, server: raw, tool: "" };
}
function mcpGrantMatchesServer(grant, serverName) {
    const parsed = parseMcpGrant(grant);
    return parsed.server === serverName || normalizeMcpKey(parsed.server) === normalizeMcpKey(serverName);
}
function mcpGrantsForServer(grants, serverName) {
    return uniqueNames(grants).filter(grant => mcpGrantMatchesServer(grant, serverName));
}
function mcpGrantToolsForServer(grants, serverName) {
    return Array.from(new Set(mcpGrantsForServer(grants, serverName)
        .map(grant => parseMcpGrant(grant).tool)
        .filter(Boolean)));
}
function shouldExposeMcpServerNatively(grants, serverName) {
    return mcpGrantsForServer(grants, serverName).some(grant => !parseMcpGrant(grant).tool);
}
function requestedMcpServers(value) {
    return Array.from(new Set(uniqueNames(value).map(item => parseMcpGrant(item).server).filter(Boolean)));
}
function nativeMcpNamesFromAudit(audit) {
    const statuses = Array.isArray(audit?.mcp_statuses) ? audit.mcp_statuses : [];
    if (statuses.length) {
        return uniqueNames(statuses.filter((item) => item?.state === "synced").map((item) => item.name));
    }
    return uniqueNames(audit?.synced?.mcp);
}
function nativeMcpServerNamesFromAudit(audit) {
    const statuses = Array.isArray(audit?.mcp_statuses) ? audit.mcp_statuses : [];
    if (statuses.length) {
        return uniqueNames(statuses
            .filter((item) => item?.state === "synced")
            .map((item) => item.serverName || (item.name ? `${CCM_MCP_PREFIX}${safeSlug(item.name)}` : "")));
    }
    return nativeMcpNamesFromAudit(audit).map(name => `${CCM_MCP_PREFIX}${safeSlug(name)}`);
}
function proxyOnlyMcpNamesFromAudit(audit) {
    const statuses = Array.isArray(audit?.mcp_statuses) ? audit.mcp_statuses : [];
    return uniqueNames(statuses.filter((item) => item?.state === "proxy_only").map((item) => item.name));
}
function tokenizeCommand(commandLine) {
    const tokens = [];
    let current = "";
    let quote = "";
    for (let index = 0; index < commandLine.length; index += 1) {
        const char = commandLine[index];
        if (quote) {
            if (char === quote)
                quote = "";
            else if (char === "\\" && commandLine[index + 1] === quote)
                current += commandLine[++index];
            else
                current += char;
            continue;
        }
        if (char === "\"" || char === "'") {
            quote = char;
        }
        else if (/\s/.test(char)) {
            if (current)
                tokens.push(current);
            current = "";
        }
        else {
            current += char;
        }
    }
    if (current)
        tokens.push(current);
    return tokens;
}
function parseEnvironment(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item ?? "")]));
    }
    const env = {};
    String(value || "").split(/\r?\n/).forEach(line => {
        const separator = line.indexOf("=");
        if (separator <= 0)
            return;
        const key = line.slice(0, separator).trim();
        if (key)
            env[key] = line.slice(separator + 1).trim();
    });
    return env;
}
function toMcpServer(tool) {
    const url = String(tool?.url || "").trim();
    if (url)
        return { url, ...(tool?.headers && typeof tool.headers === "object" ? { headers: tool.headers } : {}) };
    const configuredArgs = Array.isArray(tool?.args) ? tool.args.map((item) => String(item)) : [];
    const commandParts = tokenizeCommand(String(tool?.command || "").trim());
    const command = commandParts.shift() || "";
    if (!command)
        throw new Error("缺少 command");
    const server = { command, args: [...commandParts, ...configuredArgs] };
    const env = parseEnvironment(tool?.env);
    if (Object.keys(env).length)
        server.env = env;
    return server;
}
function safeSlug(value) {
    const slug = String(value || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    return slug || "tool";
}
function readJsonObject(file) {
    if (!fs.existsSync(file))
        return {};
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error(`${file} 必须是 JSON 对象`);
    return parsed;
}
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.ccm-${process.pid}-${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function isPathInside(root, candidate) {
    const relative = path.relative(path.resolve(root), path.resolve(candidate));
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
function resolveSkillPackage(skill, skillPackagesDir = db_1.SKILL_PACKAGES_DIR) {
    const packagePath = String(skill?.packagePath || "").trim();
    if (!packagePath || !isPathInside(skillPackagesDir, packagePath))
        return null;
    const skillPath = path.join(packagePath, "SKILL.md");
    if (!fs.existsSync(skillPath) || !fs.statSync(skillPath).isFile())
        return null;
    return { packagePath, skillPath };
}
function copySkillPackage(source, destination) {
    if (fs.existsSync(destination))
        fs.rmSync(destination, { recursive: true, force: true });
    fs.cpSync(source, destination, {
        recursive: true,
        dereference: false,
        filter: file => !path.basename(file).startsWith(".git"),
    });
}
function syncManagedSkills(skillRoot, skills, audit, skillPackagesDir = db_1.SKILL_PACKAGES_DIR) {
    fs.mkdirSync(skillRoot, { recursive: true });
    const desired = new Set();
    for (const skill of skills) {
        const directoryName = `${CCM_MCP_PREFIX.replace(/_+$/g, "-")}${safeSlug(skill.name)}`;
        desired.add(directoryName);
        const directory = path.join(skillRoot, directoryName);
        const description = String(skill.description || `CCM managed skill: ${skill.name}`).replace(/\r?\n/g, " ").trim();
        const skillPackage = resolveSkillPackage(skill, skillPackagesDir);
        let body = "";
        if (skillPackage) {
            copySkillPackage(skillPackage.packagePath, directory);
            body = fs.readFileSync(path.join(directory, "SKILL.md"), "utf-8");
        }
        else {
            fs.mkdirSync(directory, { recursive: true });
            body = `---\nname: ${JSON.stringify(String(skill.name))}\ndescription: ${JSON.stringify(description)}\n---\n\n${String(skill.prompt || "").trim()}\n`;
            fs.writeFileSync(path.join(directory, "SKILL.md"), body, "utf-8");
        }
        writeJsonAtomic(path.join(directory, CCM_SKILL_MARKER), { source: "ccm", name: skill.name });
        audit.synced.skill.push(skill.name);
        audit.skill_statuses = audit.skill_statuses || [];
        audit.skill_statuses.push({
            name: skill.name,
            state: "synced",
            skillPath: path.join(directory, "SKILL.md"),
            sourcePath: skillPackage?.skillPath || (skill.filename ? path.join(db_1.SKILLS_DIR, skill.filename) : ""),
            sourceMtimeMs: skillPackage
                ? fs.statSync(skillPackage.skillPath).mtimeMs
                : skill.filename && fs.existsSync(path.join(db_1.SKILLS_DIR, skill.filename)) ? fs.statSync(path.join(db_1.SKILLS_DIR, skill.filename)).mtimeMs : 0,
            description,
            contentHash: crypto.createHash("sha256").update(body).digest("hex").slice(0, 16),
            runtimeDirectory: directoryName,
            nativeSkillNames: [directoryName],
            invocationAliases: Array.from(new Set([
                String(skill.name),
                `skill:${String(skill.name)}`,
                directoryName,
                `$${directoryName}`,
            ].filter(Boolean))),
        });
    }
    for (const entry of fs.readdirSync(skillRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || desired.has(entry.name))
            continue;
        const directory = path.join(skillRoot, entry.name);
        if (fs.existsSync(path.join(directory, CCM_SKILL_MARKER)))
            fs.rmSync(directory, { recursive: true, force: true });
    }
}
function writeSessionPlugin(pluginRoot, runtime, snapshotId, mcpServers, skills, audit, skillPackagesDir = db_1.SKILL_PACKAGES_DIR) {
    const pluginName = `ccm-runtime-${snapshotId}`;
    const skillRoot = path.join(pluginRoot, "skills");
    fs.mkdirSync(pluginRoot, { recursive: true });
    const skillStatusStart = audit.skill_statuses?.length || 0;
    syncManagedSkills(skillRoot, skills, audit, skillPackagesDir);
    const addedSkillStatuses = (audit.skill_statuses || []).slice(skillStatusStart);
    for (const status of addedSkillStatuses) {
        if (status.state !== "synced")
            continue;
        const directoryName = status.runtimeDirectory || (status.skillPath ? path.basename(path.dirname(status.skillPath)) : "");
        const nativeName = directoryName ? `${pluginName}:${directoryName}` : "";
        status.nativeSkillNames = Array.from(new Set([
            ...(status.nativeSkillNames || []),
            nativeName,
        ].filter(Boolean)));
        status.invocationAliases = Array.from(new Set([
            ...(status.invocationAliases || []),
            status.name,
            `skill:${status.name}`,
            directoryName,
            nativeName,
            nativeName ? `/${nativeName}` : "",
        ].filter(Boolean)));
    }
    if (runtime === "claudecode") {
        writeJsonAtomic(path.join(pluginRoot, ".claude-plugin", "plugin.json"), {
            name: pluginName,
            version: "1.0.0",
            description: "CCM invocation-scoped MCP and Skill authorization snapshot",
            skills: "./skills/",
            mcpServers: "./.mcp.json",
        });
        writeJsonAtomic(path.join(pluginRoot, ".mcp.json"), { mcpServers });
    }
    else {
        writeJsonAtomic(path.join(pluginRoot, ".cursor-plugin", "plugin.json"), {
            name: pluginName,
            displayName: "CCM Runtime Tools",
            version: "1.0.0",
            description: "CCM invocation-scoped MCP and Skill authorization snapshot",
            skills: "./skills/",
            mcpServers: "./.mcp.json",
        });
        writeJsonAtomic(path.join(pluginRoot, ".mcp.json"), { mcpServers });
    }
    audit.pluginDirPath = pluginRoot;
    audit.skillRoot = skillRoot;
}
function buildPermissionRules(requested) {
    const rules = [];
    for (const raw of requested.mcp || []) {
        const grant = parseMcpGrant(raw);
        if (!grant.server)
            continue;
        const server = `${CCM_MCP_PREFIX}${safeSlug(grant.server)}`;
        rules.push({
            kind: "mcp",
            scope: grant.tool ? "tool" : "server",
            raw,
            server: grant.server,
            tool: grant.tool,
            rule: grant.tool ? `mcp__${server}__${grant.tool}` : `mcp__${server}__*`,
        });
    }
    for (const skill of requested.skill || []) {
        rules.push({ kind: "skill", scope: "skill", raw: skill, skill, rule: `skill:${skill}` });
    }
    return rules;
}
function writeRuntimeSnapshot(runtimeRoot, audit) {
    const snapshotPath = path.join(runtimeRoot, "runtime-tool-snapshot.json");
    const reused = fs.existsSync(snapshotPath);
    audit.dispatch_gate = buildRuntimeToolDispatchGate(audit);
    writeJsonAtomic(snapshotPath, {
        snapshotId: audit.snapshotId,
        runtime: audit.runtime,
        isolation: audit.isolation,
        requested: audit.requested,
        synced: audit.synced,
        missing: audit.missing,
        permission_rules: audit.permission_rules || [],
        authorization_readiness: audit.authorization_readiness || null,
        dispatch_gate: audit.dispatch_gate || null,
        catalogRevision: audit.catalogRevision || "",
        mcp_statuses: audit.mcp_statuses || [],
        skill_statuses: audit.skill_statuses || [],
        mcpConfigPath: audit.mcpConfigPath || "",
        runtimeHomePath: audit.runtimeHomePath || "",
        isolatedHomePath: audit.isolatedHomePath || "",
        pluginDirPath: audit.pluginDirPath || "",
        skillRoot: audit.skillRoot || "",
        generatedAt: audit.timestamp,
    });
    audit.snapshotPath = snapshotPath;
    audit.reusedSnapshot = reused;
}
function pruneManagedMcpSnapshots(runtimeRoot, keepFile) {
    const staleConfigs = fs.readdirSync(runtimeRoot, { withFileTypes: true })
        .filter(entry => entry.isFile() && /^mcp-[a-f0-9]{16}\.json$/.test(entry.name) && path.join(runtimeRoot, entry.name) !== keepFile)
        .map(entry => ({ file: path.join(runtimeRoot, entry.name), mtime: fs.statSync(path.join(runtimeRoot, entry.name)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)
        .slice(20);
    for (const stale of staleConfigs)
        fs.unlinkSync(stale.file);
}
function tomlString(value) {
    return JSON.stringify(String(value ?? ""));
}
function loadCodexGatewayConfig() {
    const config = (0, group_orchestrator_1.loadOrchestratorConfig)();
    const format = String(config?.format || "").trim().toLowerCase();
    const apiUrl = String(config?.apiUrl || "").trim().replace(/\/+$/, "");
    const apiKey = String(config?.apiKey || "").trim();
    const model = String(config?.model || "").trim();
    if (config?.enabled === false || !["openai-compatible", "auto"].includes(format) || !apiUrl || !apiKey || !model)
        return null;
    return { apiUrl, apiKey, model, providerId: "ccm", providerName: "CCM Unified Gateway", envKey: "CCM_CODEX_API_KEY", wireApi: "responses", requiresOpenAiAuth: false, linkAuth: false };
}
function tomlQuotedValue(text, key) {
    const match = text.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, "m"));
    return match ? match[1] : "";
}
function tomlBoolValue(text, key, fallback = false) {
    const match = text.match(new RegExp(`^\\s*${key}\\s*=\\s*(true|false)`, "m"));
    return match ? match[1] === "true" : fallback;
}
function tomlSection(text, section) {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = text.match(new RegExp(`\\[${escaped}\\]([\\s\\S]*?)(?=\\r?\\n\\[|$)`));
    return match ? match[1] : "";
}
function loadCodexLocalAccessConfig() {
    const configPath = path.join(os.homedir(), ".codex", "config.toml");
    try {
        if (!fs.existsSync(configPath))
            return null;
        const text = fs.readFileSync(configPath, "utf-8");
        const section = tomlSection(text, "model_providers.codex_local_access");
        if (!section)
            return null;
        const apiUrl = tomlQuotedValue(section, "base_url").replace(/\/+$/, "");
        const apiKey = tomlQuotedValue(section, "experimental_bearer_token");
        const model = tomlQuotedValue(text, "model") || "gpt5.6-sol";
        if (!apiUrl || !apiKey || !model)
            return null;
        return {
            apiUrl,
            apiKey,
            model,
            providerId: "codex_local_access",
            providerName: "Codex API Service",
            envKey: "CCM_CODEX_LOCAL_ACCESS_TOKEN",
            wireApi: tomlQuotedValue(section, "wire_api") || "responses",
            requiresOpenAiAuth: tomlBoolValue(section, "requires_openai_auth", true),
            linkAuth: true,
        };
    }
    catch {
        return null;
    }
}
function loadCodexProviderConfig() {
    return loadCodexGatewayConfig() || loadCodexLocalAccessConfig();
}
function getRuntimeExecutionEnv(agentType) {
    if ((0, runtime_1.normalizeAgentRuntimeId)(agentType) !== "codex")
        return {};
    const provider = loadCodexProviderConfig();
    return provider ? { [provider.envKey || "CCM_CODEX_API_KEY"]: provider.apiKey } : {};
}
function buildCodexConfigToml(mcpServers, gateway, skillPaths = []) {
    const lines = ["# Managed by CCM. This CODEX_HOME contains only tools authorized for this invocation.", ""];
    if (gateway) {
        const providerId = gateway.providerId || "ccm";
        lines.push(`model_provider = ${tomlString(providerId)}`, `model = ${tomlString(gateway.model)}`, `web_search = ${tomlString("disabled")}`, "", `[model_providers.${providerId}]`, `name = ${tomlString(gateway.providerName || "CCM Unified Gateway")}`, `base_url = ${tomlString(gateway.apiUrl)}`, `env_key = ${tomlString(gateway.envKey || "CCM_CODEX_API_KEY")}`, `wire_api = ${tomlString(gateway.wireApi || "responses")}`, `requires_openai_auth = ${gateway.requiresOpenAiAuth === true ? "true" : "false"}`, "");
    }
    for (const [name, server] of Object.entries(mcpServers)) {
        lines.push(`[mcp_servers.${tomlString(name)}]`);
        if (server.url) {
            lines.push(`url = ${tomlString(server.url)}`);
        }
        else {
            lines.push(`command = ${tomlString(server.command)}`);
            lines.push(`args = [${(server.args || []).map((item) => tomlString(item)).join(", ")}]`);
        }
        if (server.env && Object.keys(server.env).length) {
            lines.push("", `[mcp_servers.${tomlString(name)}.env]`);
            for (const [key, value] of Object.entries(server.env))
                lines.push(`${tomlString(key)} = ${tomlString(value)}`);
        }
        lines.push("");
    }
    for (const skillPath of skillPaths) {
        lines.push("[[skills.config]]", `path = ${tomlString(skillPath)}`, "enabled = true", "");
    }
    return lines.join("\n");
}
function runRuntimeToolSyncIntegrationSelfTest() {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-runtime-sync-"));
    const workDir = path.join(tempRoot, "work");
    const runtimeStorageRoot = path.join(tempRoot, "runtime");
    const skillPackagesDir = path.join(tempRoot, "skill-packages");
    const packageSkillDir = path.join(skillPackagesDir, "market-package-skill");
    fs.mkdirSync(workDir, { recursive: true });
    fs.mkdirSync(path.join(packageSkillDir, "references"), { recursive: true });
    fs.writeFileSync(path.join(packageSkillDir, "SKILL.md"), "---\nname: market-package-skill\ndescription: Marketplace package-backed Skill\n---\n\nUse the packaged instructions.\n", "utf-8");
    fs.writeFileSync(path.join(packageSkillDir, "references", "guide.md"), "Package reference copied into runtime.\n", "utf-8");
    try {
        const integrationCatalog = {
            runtimeStorageRoot,
            skillPackagesDir,
            codexGateway: {
                apiUrl: "https://gateway.example.test/v1",
                apiKey: "ccm-integration-secret-must-not-be-written",
                model: "test-model",
            },
            mcpTools: [
                { name: "payments", enabled: true, command: "node", args: ["payments-mcp.js"] },
                { name: "search", enabled: true, command: "node", args: ["search-mcp.js"] },
            ],
            skills: [
                {
                    name: "release-notes",
                    enabled: true,
                    description: "Write concise release notes",
                    prompt: "Summarize verified changes for release notes.",
                },
                {
                    name: "market-package-skill",
                    enabled: true,
                    description: "Marketplace package-backed Skill",
                    prompt: "This fallback prompt should not be used when packagePath is valid.",
                    packagePath: packageSkillDir,
                },
            ],
        };
        const audit = syncRuntimeToolsWithCatalog(workDir, "codex", { mcp: ["payments/createInvoice", "search"], skill: ["release-notes", "market-package-skill"] }, integrationCatalog);
        const claudeAudit = syncRuntimeToolsWithCatalog(workDir, "claudecode", { mcp: ["payments/createInvoice", "search"], skill: ["release-notes", "market-package-skill"] }, integrationCatalog);
        const cursorAudit = syncRuntimeToolsWithCatalog(workDir, "cursor", { mcp: ["payments/createInvoice", "search"], skill: ["release-notes", "market-package-skill"] }, integrationCatalog);
        const configText = audit.mcpConfigPath && fs.existsSync(audit.mcpConfigPath)
            ? fs.readFileSync(audit.mcpConfigPath, "utf-8")
            : "";
        const snapshot = audit.snapshotPath ? readJsonFile(audit.snapshotPath) : null;
        const skillPath = (audit.skill_statuses || []).find(item => item.name === "release-notes" && item.state === "synced")?.skillPath || "";
        const packageSkillStatus = (audit.skill_statuses || []).find(item => item.name === "market-package-skill" && item.state === "synced");
        const packageSkillPath = String(packageSkillStatus?.skillPath || "");
        const packageSkillRoot = packageSkillPath ? path.dirname(packageSkillPath) : "";
        const packageSkillBody = packageSkillPath && fs.existsSync(packageSkillPath) ? fs.readFileSync(packageSkillPath, "utf-8") : "";
        const claudePluginRoot = String(claudeAudit.pluginDirPath || "");
        const claudeManifestPath = claudePluginRoot ? path.join(claudePluginRoot, ".claude-plugin", "plugin.json") : "";
        const claudeManifest = claudeManifestPath && fs.existsSync(claudeManifestPath) ? readJsonFile(claudeManifestPath) : null;
        const claudePluginMcpPath = claudePluginRoot ? path.join(claudePluginRoot, ".mcp.json") : "";
        const claudePluginMcp = claudePluginMcpPath && fs.existsSync(claudePluginMcpPath) ? readJsonFile(claudePluginMcpPath) : null;
        const claudePluginMcpServers = claudePluginMcp?.mcpServers || {};
        const claudePluginMcpText = claudePluginMcpPath && fs.existsSync(claudePluginMcpPath) ? fs.readFileSync(claudePluginMcpPath, "utf-8") : "";
        const claudeStrictMcpText = claudeAudit.mcpConfigPath && fs.existsSync(claudeAudit.mcpConfigPath)
            ? fs.readFileSync(claudeAudit.mcpConfigPath, "utf-8")
            : "";
        const claudeSnapshot = claudeAudit.snapshotPath ? readJsonFile(claudeAudit.snapshotPath) : null;
        const claudeReadiness = probeRuntimeToolReadiness(claudeAudit, { catalogRevision: claudeAudit.catalogRevision });
        const cursorPluginRoot = String(cursorAudit.pluginDirPath || "");
        const cursorManifestPath = cursorPluginRoot ? path.join(cursorPluginRoot, ".cursor-plugin", "plugin.json") : "";
        const cursorManifest = cursorManifestPath && fs.existsSync(cursorManifestPath) ? readJsonFile(cursorManifestPath) : null;
        const cursorPluginMcpPath = cursorPluginRoot ? path.join(cursorPluginRoot, ".mcp.json") : "";
        const cursorPluginMcp = cursorPluginMcpPath && fs.existsSync(cursorPluginMcpPath) ? readJsonFile(cursorPluginMcpPath) : null;
        const cursorPluginMcpServers = cursorPluginMcp?.mcpServers || {};
        const cursorPluginMcpText = cursorPluginMcpPath && fs.existsSync(cursorPluginMcpPath) ? fs.readFileSync(cursorPluginMcpPath, "utf-8") : "";
        const cursorSnapshot = cursorAudit.snapshotPath ? readJsonFile(cursorAudit.snapshotPath) : null;
        const cursorReadiness = probeRuntimeToolReadiness(cursorAudit, { catalogRevision: cursorAudit.catalogRevision });
        const staleCatalogReadiness = probeRuntimeToolReadiness({ ...claudeAudit, catalogRevision: "stale-catalog-revision" }, { catalogRevision: claudeAudit.catalogRevision });
        const resyncCatalog = {
            ...integrationCatalog,
            mcpTools: [
                { name: "payments", enabled: true, command: "node", args: ["payments-mcp-v2.js"] },
                { name: "search", enabled: true, command: "node", args: ["search-mcp.js"] },
            ],
        };
        const staleResyncAudit = {
            ...audit,
            catalogRevision: "stale-catalog-revision",
            projectName: "runtime-resync-project",
            groupId: "runtime-resync-group",
        };
        const resyncResult = resyncRecentRuntimeToolSnapshots({
            audits: [staleResyncAudit],
            limit: 5,
            staleOnly: true,
            catalog: resyncCatalog,
        });
        const resyncMissResult = resyncRecentRuntimeToolSnapshots({
            audits: [staleResyncAudit],
            limit: 5,
            staleOnly: true,
            catalog: resyncCatalog,
            snapshotId: "missing-snapshot-id",
        });
        const resyncMatchResult = resyncRecentRuntimeToolSnapshots({
            audits: [staleResyncAudit],
            limit: 5,
            staleOnly: true,
            catalog: resyncCatalog,
            snapshotIds: [staleResyncAudit.snapshotId],
        });
        const blockedAuthorizationReadiness = {
            schema: "ccm-tool-authorization-readiness-v1",
            dispatchReady: false,
            status: "needs_attention",
            requested: { mcp: 1, skill: 1 },
            available: { mcp: 0, skill: 0 },
            missing: { missing_mcp_servers: 0, missing_mcp_tools: 1, missing_skills: 1 },
            invalid_mcp_grants: 0,
            unavailable: { mcp: [{ raw: "payments/missingTool", server: "payments", tool: "missingTool", state: "missing_tool" }], skill: [{ name: "missing-skill", state: "missing" }] },
        };
        const blockedAuthorizationAudit = { ...claudeAudit, authorization_readiness: blockedAuthorizationReadiness };
        const blockedAuthorizationGate = buildRuntimeToolDispatchGate(blockedAuthorizationAudit);
        const blockedAuthorizationPrompt = buildRuntimeToolSyncPrompt(blockedAuthorizationAudit);
        const blockedAuthorizationRuntimeReadiness = probeRuntimeToolReadiness(blockedAuthorizationAudit, { catalogRevision: claudeAudit.catalogRevision });
        const claudePackageSkillStatus = (claudeAudit.skill_statuses || []).find(item => item.name === "market-package-skill" && item.state === "synced");
        const claudePackageSkillPath = String(claudePackageSkillStatus?.skillPath || "");
        const claudePackageSkillRoot = claudePackageSkillPath ? path.dirname(claudePackageSkillPath) : "";
        const claudePackageSkillBody = claudePackageSkillPath && fs.existsSync(claudePackageSkillPath)
            ? fs.readFileSync(claudePackageSkillPath, "utf-8")
            : "";
        const claudePackageNativeSkillName = (claudePackageSkillStatus?.nativeSkillNames || [])
            .find(name => String(name).includes(":ccm-market-package-skill")) || "";
        const claudeSyncPrompt = buildRuntimeToolSyncPrompt(claudeAudit);
        const cursorPackageSkillStatus = (cursorAudit.skill_statuses || []).find(item => item.name === "market-package-skill" && item.state === "synced");
        const cursorPackageSkillPath = String(cursorPackageSkillStatus?.skillPath || "");
        const cursorPackageSkillRoot = cursorPackageSkillPath ? path.dirname(cursorPackageSkillPath) : "";
        const cursorPackageSkillBody = cursorPackageSkillPath && fs.existsSync(cursorPackageSkillPath)
            ? fs.readFileSync(cursorPackageSkillPath, "utf-8")
            : "";
        const cursorPackageNativeSkillName = (cursorPackageSkillStatus?.nativeSkillNames || [])
            .find(name => String(name).includes(":ccm-market-package-skill")) || "";
        const cursorSyncPrompt = buildRuntimeToolSyncPrompt(cursorAudit);
        const checks = {
            integrationSyncSucceeded: audit.mode === "native-and-proxy" && audit.errors.length === 0,
            toolScopedMcpIsProxyOnly: (audit.mcp_statuses || []).some(item => item.name === "payments"
                && item.state === "proxy_only"
                && item.delivery === "proxy"
                && item.tools.includes("createInvoice")),
            toolScopedMcpNotInNativeConfig: !configText.includes("ccm__payments"),
            fullServerMcpInNativeConfig: configText.includes("ccm__search"),
            exactPermissionRulePersisted: (audit.permission_rules || []).some(rule => rule.rule === "mcp__ccm__payments__createInvoice"),
            snapshotCarriesCatalogRevision: !!audit.catalogRevision
                && snapshot?.catalogRevision === audit.catalogRevision
                && claudeSnapshot?.catalogRevision === claudeAudit.catalogRevision,
            readinessChecksCatalogRevision: claudeReadiness.checks.some(check => check.id === "catalog_revision" && check.ok),
            staleCatalogRevisionBlocksDelivery: staleCatalogReadiness.deliveryReady === false
                && staleCatalogReadiness.catalogStale === true
                && staleCatalogReadiness.checks.some(check => check.id === "catalog_revision" && !check.ok),
            runtimeResyncRefreshesStaleSnapshot: resyncResult.schema === "ccm-runtime-tool-resync-v1"
                && resyncResult.summary.resynced === 1
                && resyncResult.items[0]?.before?.catalogStale === true
                && resyncResult.items[0]?.after?.catalogStale === false
                && resyncResult.items[0]?.after?.snapshotId
                && resyncResult.items[0]?.after?.snapshotId !== staleResyncAudit.snapshotId,
            runtimeResyncSupportsSnapshotFilter: resyncMissResult.summary.selected === 0
                && resyncMissResult.summary.resynced === 0
                && resyncMatchResult.summary.resynced === 1,
            authorizationReadinessPromptWarnsChildAgent: blockedAuthorizationPrompt.includes("授权可派发性需处理")
                && blockedAuthorizationPrompt.includes("MCP tool 1")
                && blockedAuthorizationPrompt.includes("Skill 1"),
            authorizationReadinessBlocksDelivery: blockedAuthorizationRuntimeReadiness.deliveryReady === false
                && blockedAuthorizationRuntimeReadiness.authorizationReadiness?.dispatchReady === false
                && blockedAuthorizationRuntimeReadiness.checks.some(check => check.id === "authorization_readiness" && !check.ok),
            runtimeReadinessChecksDispatchGate: blockedAuthorizationRuntimeReadiness.dispatchGate?.dispatchReady === false
                && blockedAuthorizationRuntimeReadiness.checks.some(check => check.id === "dispatch_gate" && !check.ok),
            dispatchGateBlocksMissingAuthorization: blockedAuthorizationGate.dispatchReady === false
                && blockedAuthorizationGate.blockers.some(item => item.id === "authorization_readiness"),
            skillSyncedToCodexHome: !!skillPath && fs.existsSync(skillPath) && configText.includes("[[skills.config]]") && configText.includes("release-notes"),
            marketplacePackageSkillCopiedToCodexHome: !!packageSkillPath
                && fs.existsSync(packageSkillPath)
                && packageSkillStatus?.sourcePath === path.join(packageSkillDir, "SKILL.md")
                && packageSkillBody.includes("Use the packaged instructions.")
                && !packageSkillBody.includes("fallback prompt")
                && fs.existsSync(path.join(packageSkillRoot, "references", "guide.md")),
            marketplacePackageSkillRegistered: configText.includes("market-package-skill") && configText.includes(tomlString(packageSkillPath)),
            snapshotPersistsNativeAndProxyDelivery: Array.isArray(snapshot?.mcp_statuses)
                && snapshot.mcp_statuses.some((item) => item.name === "search" && item.delivery === "native")
                && snapshot.mcp_statuses.some((item) => item.name === "payments" && item.delivery === "proxy"),
            snapshotPersistsPackageSkillStatus: Array.isArray(snapshot?.skill_statuses)
                && snapshot.skill_statuses.some((item) => item.name === "market-package-skill" && item.sourcePath === path.join(packageSkillDir, "SKILL.md")),
            snapshotPersistsDispatchGate: snapshot?.dispatch_gate?.schema === "ccm-runtime-tool-dispatch-gate-v1"
                && snapshot?.dispatch_gate?.dispatchReady === true,
            gatewaySecretNotPersisted: !configText.includes("ccm-integration-secret-must-not-be-written"),
            claudeRuntimeSyncSucceeded: claudeAudit.mode === "native-and-proxy" && claudeAudit.errors.length === 0,
            claudePluginManifestDeclaresSkillsAndMcp: claudeManifest?.skills === "./skills/" && claudeManifest?.mcpServers === "./.mcp.json",
            claudePluginMcpContainsOnlyNativeSafeServers: !!claudePluginMcpServers.ccm__search
                && !claudePluginMcpServers.ccm__payments
                && !claudePluginMcpText.includes("ccm__payments"),
            claudeStrictMcpConfigMatchesPluginNativeScope: claudeStrictMcpText.includes("ccm__search")
                && !claudeStrictMcpText.includes("ccm__payments"),
            claudePluginSkillsCopiedForChildAgents: !!claudePackageSkillPath
                && fs.existsSync(claudePackageSkillPath)
                && claudePackageSkillStatus?.sourcePath === path.join(packageSkillDir, "SKILL.md")
                && claudePackageSkillBody.includes("Use the packaged instructions.")
                && !claudePackageSkillBody.includes("fallback prompt")
                && fs.existsSync(path.join(claudePackageSkillRoot, "references", "guide.md")),
            claudeSnapshotPersistsPluginDir: !!claudeSnapshot?.pluginDirPath
                && claudeSnapshot.pluginDirPath === claudeAudit.pluginDirPath,
            claudeReadinessChecksPluginMcpInheritance: claudeReadiness.checks.some(check => check.id === "plugin_mcp_config" && check.ok),
            codexSkillRuntimeAliasPersisted: Array.isArray(packageSkillStatus?.nativeSkillNames)
                && packageSkillStatus.nativeSkillNames.includes("ccm-market-package-skill")
                && packageSkillStatus.invocationAliases?.includes("skill:market-package-skill"),
            claudeSkillRuntimeAliasPersisted: !!claudePackageNativeSkillName
                && claudePackageSkillStatus?.invocationAliases?.includes(claudePackageNativeSkillName)
                && claudePackageSkillStatus?.invocationAliases?.includes(`/${claudePackageNativeSkillName}`),
            runtimePromptIncludesSkillAliasMapping: claudeSyncPrompt.includes("Skill 调用名映射")
                && claudeSyncPrompt.includes("market-package-skill")
                && claudeSyncPrompt.includes(claudePackageNativeSkillName),
            cursorRuntimeSyncSucceeded: cursorAudit.mode === "native-and-proxy" && cursorAudit.errors.length === 0,
            cursorPluginManifestDeclaresSkillsAndMcp: cursorManifest?.skills === "./skills/"
                && cursorManifest?.mcpServers === "./.mcp.json"
                && cursorManifest?.displayName === "CCM Runtime Tools",
            cursorPluginMcpContainsOnlyNativeSafeServers: !!cursorPluginMcpServers.ccm__search
                && !cursorPluginMcpServers.ccm__payments
                && !cursorPluginMcpText.includes("ccm__payments"),
            cursorPluginSkillsCopiedForChildAgents: !!cursorPackageSkillPath
                && fs.existsSync(cursorPackageSkillPath)
                && cursorPackageSkillStatus?.sourcePath === path.join(packageSkillDir, "SKILL.md")
                && cursorPackageSkillBody.includes("Use the packaged instructions.")
                && !cursorPackageSkillBody.includes("fallback prompt")
                && fs.existsSync(path.join(cursorPackageSkillRoot, "references", "guide.md")),
            cursorSnapshotPersistsPluginDir: !!cursorSnapshot?.pluginDirPath
                && cursorSnapshot.pluginDirPath === cursorAudit.pluginDirPath
                && cursorSnapshot?.mcpConfigPath === cursorAudit.mcpConfigPath,
            cursorReadinessChecksPluginMcpInheritance: cursorReadiness.checks.some(check => check.id === "plugin_mcp_config" && check.ok),
            cursorDoesNotPolluteProjectWorkspace: !fs.existsSync(path.join(workDir, ".cursor")),
            cursorSkillRuntimeAliasPersisted: !!cursorPackageNativeSkillName
                && cursorPackageSkillStatus?.invocationAliases?.includes(cursorPackageNativeSkillName)
                && cursorPackageSkillStatus?.invocationAliases?.includes(`/${cursorPackageNativeSkillName}`),
            cursorPromptIncludesSkillAliasMapping: cursorSyncPrompt.includes("Skill 调用名映射")
                && cursorSyncPrompt.includes("market-package-skill")
                && cursorSyncPrompt.includes(cursorPackageNativeSkillName),
        };
        return {
            pass: Object.values(checks).every(Boolean),
            checks,
            audit: {
                mode: audit.mode,
                configFormat: audit.configFormat,
                mcp_statuses: audit.mcp_statuses,
                skill_statuses: audit.skill_statuses?.map(item => ({ name: item.name, state: item.state })),
            },
            claudeAudit: {
                mode: claudeAudit.mode,
                configFormat: claudeAudit.configFormat,
                mcp_statuses: claudeAudit.mcp_statuses,
                skill_statuses: claudeAudit.skill_statuses?.map(item => ({ name: item.name, state: item.state })),
            },
            cursorAudit: {
                mode: cursorAudit.mode,
                configFormat: cursorAudit.configFormat,
                mcp_statuses: cursorAudit.mcp_statuses,
                skill_statuses: cursorAudit.skill_statuses?.map(item => ({ name: item.name, state: item.state })),
            },
        };
    }
    finally {
        try {
            fs.rmSync(tempRoot, { recursive: true, force: true });
        }
        catch { }
    }
}
function runRuntimeToolSyncSelfTest() {
    const fakeSecret = "ccm-test-secret-must-not-be-persisted";
    const config = buildCodexConfigToml({}, {
        apiUrl: "https://gateway.example.test/v1",
        apiKey: fakeSecret,
        model: "test-model",
    }, ["C:\\runtime\\.agents\\skills\\release-notes\\SKILL.md"]);
    const rules = buildPermissionRules({ mcp: ["payments/createInvoice", "search"], skill: ["release-notes"] });
    const toolScopedMcpStaysProxyOnly = !shouldExposeMcpServerNatively(["payments/createInvoice"], "payments");
    const nativeStyleToolScopedMcpStaysProxyOnly = !shouldExposeMcpServerNatively(["mcp__ccm__payments__createInvoice"], "payments");
    const nativeStyleGrantServerMatchingKeepsToolGrant = mcpGrantsForServer(["mcp__ccm__payments__createInvoice"], "payments")[0] === "mcp__ccm__payments__createInvoice";
    const fullServerMcpCanUseNative = shouldExposeMcpServerNatively(["search"], "search")
        && shouldExposeMcpServerNatively(["search/*"], "search");
    const grantServerMatchingKeepsToolGrant = mcpGrantsForServer(["payments/createInvoice"], "payments")[0] === "payments/createInvoice";
    const nativeAuditNames = nativeMcpNamesFromAudit({ mcp_statuses: [{ name: "search", state: "synced" }] });
    const proxyOnlyAuditNames = proxyOnlyMcpNamesFromAudit({ mcp_statuses: [{ name: "payments", state: "proxy_only" }] });
    const integration = runRuntimeToolSyncIntegrationSelfTest();
    const invoked = detectInvokedSkillsFromText("本轮使用 Skill:release-notes 并参考 release-notes", { skill: ["release-notes"] }, [{ name: "release-notes", prompt: "write notes" }]);
    const checks = {
        unifiedGatewayConfigured: config.includes('model_provider = "ccm"') && config.includes('base_url = "https://gateway.example.test/v1"'),
        webSearchDisabled: config.includes('web_search = "disabled"'),
        secretUsesEnvironment: config.includes('env_key = "CCM_CODEX_API_KEY"'),
        secretNotPersisted: !config.includes(fakeSecret),
        codexSkillPathRegistered: config.includes("[[skills.config]]") && config.includes("release-notes"),
        permissionRulesSupportToolScope: rules.some(rule => rule.scope === "tool" && rule.rule.includes("createInvoice")) && rules.some(rule => rule.scope === "server"),
        toolScopedMcpStaysProxyOnly,
        nativeStyleToolScopedMcpStaysProxyOnly,
        fullServerMcpCanUseNative,
        grantServerMatchingKeepsToolGrant,
        nativeStyleGrantServerMatchingKeepsToolGrant,
        nativeAndProxyOnlyAuditNames: nativeAuditNames[0] === "search" && proxyOnlyAuditNames[0] === "payments",
        runtimeSyncIntegration: integration.pass,
        authorizationReadinessPromptWarnsChildAgent: integration.checks.authorizationReadinessPromptWarnsChildAgent === true,
        authorizationReadinessBlocksDelivery: integration.checks.authorizationReadinessBlocksDelivery === true,
        runtimeReadinessChecksDispatchGate: integration.checks.runtimeReadinessChecksDispatchGate === true,
        dispatchGateBlocksMissingAuthorization: integration.checks.dispatchGateBlocksMissingAuthorization === true,
        snapshotPersistsDispatchGate: integration.checks.snapshotPersistsDispatchGate === true,
        runtimeResyncSupportsSnapshotFilter: integration.checks.runtimeResyncSupportsSnapshotFilter === true,
        cursorRuntimeSyncSucceeded: integration.checks.cursorRuntimeSyncSucceeded === true,
        cursorPluginMcpContainsOnlyNativeSafeServers: integration.checks.cursorPluginMcpContainsOnlyNativeSafeServers === true,
        cursorReadinessChecksPluginMcpInheritance: integration.checks.cursorReadinessChecksPluginMcpInheritance === true,
        cursorDoesNotPolluteProjectWorkspace: integration.checks.cursorDoesNotPolluteProjectWorkspace === true,
        invokedSkillDetected: invoked.length === 1 && invoked[0].name === "release-notes",
    };
    return { pass: Object.values(checks).every(Boolean), checks, rules, invoked, integration };
}
function linkCodexAuth(runtimeHome, audit) {
    const source = path.join(os.homedir(), ".codex", "auth.json");
    const target = path.join(runtimeHome, "auth.json");
    if (!fs.existsSync(source)) {
        audit.warnings.push("未找到 ~/.codex/auth.json；Codex 需依赖环境变量或系统凭据完成认证");
        return;
    }
    try {
        if (fs.existsSync(target))
            fs.unlinkSync(target);
        fs.linkSync(source, target);
    }
    catch (error) {
        try {
            fs.copyFileSync(source, target);
            try {
                fs.chmodSync(target, 0o600);
            }
            catch { }
            audit.warnings.push("Codex 认证文件无法硬链接，已回退为 CCM 中央私有目录副本；下次调用会重新同步");
        }
        catch (copyError) {
            audit.warnings.push(`Codex 认证同步失败：${copyError?.message || error?.message || String(copyError)}`);
        }
    }
}
function removeManagedCodexAuth(runtimeHome) {
    const target = path.join(runtimeHome, "auth.json");
    try {
        if (fs.existsSync(target))
            fs.unlinkSync(target);
    }
    catch { }
}
function syncRuntimeToolsWithCatalog(workDir, agentType, allowedTools, catalog = {}, options = {}) {
    const runtime = (0, runtime_1.normalizeAgentRuntimeId)(agentType);
    const nativeSupported = ["claudecode", "cursor", "gemini", "codex", "qoder"].includes(runtime);
    const requested = { mcp: uniqueNames(allowedTools?.mcp), skill: uniqueNames(allowedTools?.skill) };
    const requestedServers = requestedMcpServers(allowedTools?.mcp);
    const audit = {
        runtime,
        mode: nativeSupported ? "native-and-proxy" : "ccm-proxy-only",
        nativeSupported,
        workDir: String(workDir || ""),
        requested,
        synced: { mcp: [], skill: [] },
        missing: { mcp: [], skill: [] },
        mcp_statuses: [],
        skill_statuses: [],
        permission_rules: buildPermissionRules(requested),
        authorization_readiness: getAuthorizationReadiness(options.authorizationReadiness) || undefined,
        internal_mcp: [],
        errors: [],
        warnings: [],
        timestamp: new Date().toISOString(),
    };
    const catalogMcpTools = Array.isArray(catalog.mcpTools) ? catalog.mcpTools : (0, db_1.loadMcpTools)();
    const catalogSkills = Array.isArray(catalog.skills) ? catalog.skills : (0, db_1.loadSkills)();
    const catalogRevision = getRuntimeToolCatalogRevision({
        ...catalog,
        mcpTools: catalogMcpTools,
        skills: catalogSkills,
    }, requested);
    audit.catalogRevision = catalogRevision;
    const enabledMcp = new Map(catalogMcpTools.filter(tool => tool?.enabled !== false).map(tool => [String(tool.name), tool]));
    const enabledSkills = new Map(catalogSkills.filter(skill => skill?.enabled !== false).map(skill => [String(skill.name), skill]));
    const selectedMcp = requestedServers.map(name => enabledMcp.get(name)).filter(Boolean);
    const selectedSkills = requested.skill.map(name => enabledSkills.get(name)).filter(Boolean);
    audit.missing.mcp = requested.mcp.filter(name => {
        const grant = parseMcpGrant(name);
        return !grant.server || !enabledMcp.has(grant.server);
    });
    audit.missing.skill = requested.skill.filter(name => !enabledSkills.has(name));
    audit.skill_statuses = [
        ...(audit.skill_statuses || []),
        ...audit.missing.skill.map(name => ({ name, state: "missing" })),
    ];
    if (!nativeSupported) {
        audit.isolation = "proxy";
        audit.dispatch_gate = buildRuntimeToolDispatchGate(audit);
        return audit;
    }
    if (!workDir || !fs.existsSync(workDir) || !fs.statSync(workDir).isDirectory()) {
        audit.mode = "failed";
        audit.errors.push(`工作目录不存在或不可用: ${workDir || "<empty>"}`);
        audit.dispatch_gate = buildRuntimeToolDispatchGate(audit);
        return audit;
    }
    try {
        const codexGateway = runtime === "codex"
            ? (Object.prototype.hasOwnProperty.call(catalog, "codexGateway")
                ? (catalog.codexGateway ? {
                    providerId: "ccm",
                    providerName: "CCM Unified Gateway",
                    envKey: "CCM_CODEX_API_KEY",
                    wireApi: "responses",
                    requiresOpenAiAuth: false,
                    linkAuth: false,
                    ...catalog.codexGateway,
                } : null)
                : loadCodexProviderConfig())
            : null;
        const runtimeStorageRoot = catalog.runtimeStorageRoot || path.join(utils_1.CCM_DIR, "agent-runtime");
        const skillPackagesDir = catalog.skillPackagesDir || db_1.SKILL_PACKAGES_DIR;
        const authorizationId = crypto.createHash("sha256")
            .update(JSON.stringify({
            runtime,
            requested,
            mcp: selectedMcp,
            skills: selectedSkills.map(skill => ({
                name: skill.name,
                description: skill.description || "",
                prompt: skill.prompt || "",
                filename: skill.filename || "",
                packagePath: skill.packagePath || "",
                sourceMtimeMs: resolveSkillPackage(skill, skillPackagesDir)
                    ? fs.statSync(resolveSkillPackage(skill, skillPackagesDir).skillPath).mtimeMs
                    : skill.filename && fs.existsSync(path.join(db_1.SKILLS_DIR, skill.filename)) ? fs.statSync(path.join(db_1.SKILLS_DIR, skill.filename)).mtimeMs : 0,
            })),
            catalogRevision,
            authorizationReadiness: audit.authorization_readiness
                ? {
                    dispatchReady: audit.authorization_readiness.dispatchReady,
                    status: audit.authorization_readiness.status,
                    requested: audit.authorization_readiness.requested,
                    missing: audit.authorization_readiness.missing,
                    invalid_mcp_grants: audit.authorization_readiness.invalid_mcp_grants,
                }
                : null,
            internalMcpServers: options.internalMcpServers || {},
            codexGateway: codexGateway ? { apiUrl: codexGateway.apiUrl, model: codexGateway.model } : null,
        }))
            .digest("hex")
            .slice(0, 16);
        audit.snapshotId = authorizationId;
        const mcpServers = {};
        for (const [name, server] of Object.entries(options.internalMcpServers || {})) {
            try {
                if (!name.startsWith(CCM_MCP_PREFIX))
                    throw new Error("内部 MCP 名称必须使用 ccm__ 前缀");
                if (!server || typeof server !== "object" || !String(server.command || "").trim())
                    throw new Error("内部 MCP 缺少 command");
                mcpServers[name] = server;
                audit.internal_mcp?.push({ name, protected: true, state: "synced" });
            }
            catch (error) {
                audit.errors.push(`内部 MCP ${name}: ${error?.message || String(error)}`);
                audit.internal_mcp?.push({ name, protected: true, state: "config_error", error: error?.message || String(error) });
            }
        }
        for (const tool of selectedMcp) {
            const serverName = `${CCM_MCP_PREFIX}${safeSlug(tool.name)}`;
            const grants = mcpGrantsForServer(requested.mcp, tool.name);
            const tools = mcpGrantToolsForServer(requested.mcp, tool.name);
            if (!shouldExposeMcpServerNatively(requested.mcp, tool.name)) {
                audit.synced.mcp.push(tool.name);
                audit.mcp_statuses?.push({
                    name: tool.name,
                    serverName,
                    state: "proxy_only",
                    delivery: "proxy",
                    grants,
                    tools,
                });
                audit.warnings.push(`MCP ${tool.name} 仅授权子工具${tools.length ? `：${tools.join(", ")}` : ""}；原生 MCP 无法安全过滤工具列表，已改由 CCM 代理执行`);
                continue;
            }
            try {
                mcpServers[serverName] = toMcpServer(tool);
                audit.synced.mcp.push(tool.name);
                audit.mcp_statuses?.push({
                    name: tool.name,
                    serverName,
                    state: "synced",
                    delivery: "native",
                    grants,
                    tools,
                });
            }
            catch (error) {
                audit.errors.push(`MCP ${tool.name}: ${error?.message || String(error)}`);
                audit.mcp_statuses?.push({
                    name: tool.name,
                    serverName,
                    state: "config_error",
                    grants,
                    tools,
                    error: error?.message || String(error),
                });
            }
        }
        for (const missing of audit.missing.mcp) {
            const grant = parseMcpGrant(missing);
            audit.mcp_statuses?.push({
                name: grant.server || missing,
                serverName: grant.server ? `${CCM_MCP_PREFIX}${safeSlug(grant.server)}` : "",
                state: "missing",
                grants: [missing],
                tools: grant.tool ? [grant.tool] : [],
            });
        }
        if (runtime === "claudecode") {
            const runtimeRoot = path.join(runtimeStorageRoot, "claudecode", authorizationId);
            const mcpConfigPath = path.join(runtimeRoot, `mcp-${authorizationId}.json`);
            const pluginRoot = path.join(runtimeRoot, "plugin");
            writeJsonAtomic(mcpConfigPath, { mcpServers });
            audit.mcpConfigPath = mcpConfigPath;
            audit.runtimeHomePath = runtimeRoot;
            audit.configFormat = "claude-strict-mcp-plus-session-plugin";
            audit.isolation = "strict";
            writeSessionPlugin(pluginRoot, "claudecode", authorizationId, mcpServers, selectedSkills, audit, skillPackagesDir);
            pruneManagedMcpSnapshots(runtimeRoot, mcpConfigPath);
            writeRuntimeSnapshot(runtimeRoot, audit);
        }
        else if (runtime === "codex") {
            const runtimeHome = path.join(runtimeStorageRoot, "codex", authorizationId);
            const configPath = path.join(runtimeHome, "config.toml");
            const skillRoot = path.join(runtimeHome, "skills");
            fs.mkdirSync(runtimeHome, { recursive: true });
            if (codexGateway?.linkAuth)
                linkCodexAuth(runtimeHome, audit);
            else if (codexGateway)
                removeManagedCodexAuth(runtimeHome);
            else
                linkCodexAuth(runtimeHome, audit);
            audit.mcpConfigPath = configPath;
            audit.runtimeHomePath = runtimeHome;
            audit.isolatedHomePath = runtimeHome;
            audit.skillRoot = skillRoot;
            audit.configFormat = "codex-isolated-home-toml";
            audit.isolation = "strict";
            syncManagedSkills(skillRoot, selectedSkills, audit, skillPackagesDir);
            fs.writeFileSync(configPath, buildCodexConfigToml(mcpServers, codexGateway, (audit.skill_statuses || []).filter(item => item.state === "synced" && item.skillPath).map(item => String(item.skillPath))), "utf-8");
            writeRuntimeSnapshot(runtimeHome, audit);
        }
        else if (runtime === "cursor") {
            const runtimeRoot = path.join(runtimeStorageRoot, "cursor", authorizationId);
            const pluginRoot = path.join(runtimeRoot, "plugin");
            const configPath = path.join(pluginRoot, ".mcp.json");
            const isolatedHome = path.join(runtimeRoot, "home");
            fs.mkdirSync(runtimeRoot, { recursive: true });
            audit.mcpConfigPath = configPath;
            audit.runtimeHomePath = runtimeRoot;
            audit.isolatedHomePath = isolatedHome;
            audit.configFormat = "cursor-isolated-session-plugin";
            audit.isolation = "strict";
            writeSessionPlugin(pluginRoot, "cursor", authorizationId, mcpServers, selectedSkills, audit, skillPackagesDir);
            writeRuntimeSnapshot(runtimeRoot, audit);
        }
        else {
            const runtimeSpec = runtime === "gemini"
                ? { root: ".gemini", config: "settings.json", skillDir: "skills", format: "gemini-project-settings" }
                : { root: ".qoder", config: "settings.local.json", skillDir: "skills", format: "qoder-local-settings" };
            const runtimeRoot = path.join(workDir, runtimeSpec.root);
            const configPath = path.join(runtimeRoot, runtimeSpec.config);
            const skillRoot = path.join(runtimeRoot, runtimeSpec.skillDir);
            const settings = readJsonObject(configPath);
            const existingServers = settings.mcpServers && typeof settings.mcpServers === "object" ? settings.mcpServers : {};
            settings.mcpServers = {
                ...Object.fromEntries(Object.entries(existingServers).filter(([name]) => !name.startsWith(CCM_MCP_PREFIX))),
                ...mcpServers,
            };
            if (runtime === "gemini") {
                settings.mcp = settings.mcp && typeof settings.mcp === "object" ? settings.mcp : {};
                settings.mcp.allowed = Object.keys(mcpServers);
                audit.isolation = "allowlist";
            }
            else {
                audit.isolation = "project-scope";
                audit.warnings.push(`${runtime} CLI 没有严格 MCP 快照参数；CCM 已同步项目级配置，仍保留平台代理作为权限兜底`);
            }
            if (runtime === "qoder") {
                settings.permissions = settings.permissions && typeof settings.permissions === "object" ? settings.permissions : {};
                const existingAllow = Array.isArray(settings.permissions.allow)
                    ? settings.permissions.allow.filter((item) => !String(item || "").startsWith("mcp__ccm__"))
                    : [];
                settings.permissions.allow = [...existingAllow, ...Object.keys(mcpServers).map(name => `mcp__${name}__*`)];
            }
            writeJsonAtomic(configPath, settings);
            audit.mcpConfigPath = configPath;
            audit.skillRoot = skillRoot;
            audit.configFormat = runtimeSpec.format;
            syncManagedSkills(skillRoot, selectedSkills, audit, skillPackagesDir);
            writeRuntimeSnapshot(runtimeRoot, audit);
        }
        if (audit.errors.length)
            audit.mode = "failed";
    }
    catch (error) {
        audit.mode = "failed";
        audit.errors.push(error?.message || String(error));
    }
    audit.dispatch_gate = buildRuntimeToolDispatchGate(audit);
    return audit;
}
function syncRuntimeTools(workDir, agentType, allowedTools, options = {}) {
    return syncRuntimeToolsWithCatalog(workDir, agentType, allowedTools, {}, options);
}
function compactRuntimeResyncAudit(audit = {}) {
    return {
        runtime: String(audit.runtime || ""),
        snapshotId: String(audit.snapshotId || ""),
        projectName: String(audit.projectName || ""),
        groupId: String(audit.groupId || ""),
        workDir: String(audit.workDir || ""),
        catalogRevision: String(audit.catalogRevision || ""),
        requested: {
            mcp: uniqueNames(audit.requested?.mcp),
            skill: uniqueNames(audit.requested?.skill),
        },
        synced: {
            mcp: uniqueNames(audit.synced?.mcp),
            skill: uniqueNames(audit.synced?.skill),
        },
        missing: {
            mcp: uniqueNames(audit.missing?.mcp),
            skill: uniqueNames(audit.missing?.skill),
        },
        dispatchReady: audit.dispatch_gate?.dispatchReady !== false,
        mode: String(audit.mode || ""),
        errors: Array.isArray(audit.errors) ? audit.errors.map(String).slice(0, 8) : [],
        warnings: Array.isArray(audit.warnings) ? audit.warnings.map(String).slice(0, 8) : [],
    };
}
function runtimeAuditMatchesResyncFilter(audit, options = {}) {
    const runtime = String(options.runtime || "").trim();
    const projectName = String(options.projectName || options.project || "").trim();
    const groupId = String(options.groupId || options.group_id || "").trim();
    const snapshotIds = new Set(uniqueNames([
        ...((Array.isArray(options.snapshotIds) ? options.snapshotIds : [])),
        ...((Array.isArray(options.snapshot_ids) ? options.snapshot_ids : [])),
        options.snapshotId,
        options.snapshot_id,
    ]));
    if (runtime && (0, runtime_1.normalizeAgentRuntimeId)(audit?.runtime || "") !== (0, runtime_1.normalizeAgentRuntimeId)(runtime))
        return false;
    if (projectName && String(audit?.projectName || "") !== projectName)
        return false;
    if (groupId && String(audit?.groupId || "") !== groupId)
        return false;
    if (snapshotIds.size > 0 && !snapshotIds.has(String(audit?.snapshotId || "")))
        return false;
    return true;
}
function runtimeMissingScopeMatchesFilter(row, options = {}) {
    const scope = cleanRuntimeResyncText(options.scope || "", 40);
    const projectName = cleanRuntimeResyncText(options.projectName || options.project || "", 160);
    const groupId = cleanRuntimeResyncText(options.groupId || options.group_id || "", 160);
    if (scope && row.scope !== scope)
        return false;
    if (projectName && !(row.scope === "project" && row.id === projectName))
        return false;
    if (groupId && !(row.scope === "group" && row.id === groupId))
        return false;
    return true;
}
function normalizeRuntimeToolName(value) {
    return cleanRuntimeResyncText(value, 180).replace(/^ccm__/, "").toLowerCase();
}
function runtimeMissingScopeRequestsMarketplaceItem(row, options = {}) {
    const type = cleanRuntimeResyncText(options.type || options.toolType || "", 40).toLowerCase();
    const name = normalizeRuntimeToolName(options.name || options.toolName || "");
    if (!type || !name)
        return true;
    const tools = row?.tools || {};
    if (type === "mcp") {
        return uniqueNames(tools?.mcp).some(grant => normalizeRuntimeToolName(parseMcpGrant(grant).server) === name);
    }
    if (type === "skill") {
        return uniqueNames(tools?.skill).some(skill => normalizeRuntimeToolName(skill) === name);
    }
    return true;
}
function getProjectRuntimeConfig(projectName, options = {}) {
    const cleanProjectName = cleanRuntimeResyncText(projectName, 160);
    if (!cleanProjectName)
        return null;
    const runtimeTargets = Array.isArray(options.runtimeTargets) ? options.runtimeTargets : [];
    const explicitTarget = runtimeTargets.find((item) => cleanRuntimeResyncText(item?.projectName || item?.project || "", 160) === cleanProjectName);
    if (explicitTarget?.workDir) {
        return {
            projectName: cleanProjectName,
            workDir: String(explicitTarget.workDir || ""),
            agentType: String(explicitTarget.agentType || explicitTarget.agent || "claudecode"),
        };
    }
    for (const config of (0, db_1.getConfigs)()) {
        if (!config?.path || !fs.existsSync(config.path))
            continue;
        const projects = (0, db_1.getConfigInfo)(config.path);
        const info = projects.find((item) => item.name === cleanProjectName)
            || (config.name === cleanProjectName ? projects[0] : null);
        if (!info?.workDir)
            continue;
        return {
            projectName: cleanProjectName,
            workDir: String(info.workDir || ""),
            agentType: String(info.agent || "claudecode"),
        };
    }
    return null;
}
function buildMissingRuntimeTargets(row, groups, options = {}) {
    if (row.scope === "project") {
        const runtime = getProjectRuntimeConfig(row.id, options);
        return runtime ? [{ ...runtime, groupId: "" }] : [];
    }
    if (row.scope !== "group")
        return [];
    const group = groups.find((item) => String(item?.id || "") === String(row.id || ""));
    const members = Array.isArray(group?.members) ? group.members : [];
    return members
        .map((member) => {
        const projectName = cleanRuntimeResyncText(member?.project || member?.projectName || "", 160);
        if (!projectName || projectName === "coordinator")
            return null;
        const runtime = getProjectRuntimeConfig(projectName, options);
        return runtime ? { ...runtime, groupId: row.id, agentType: String(member?.agent || member?.agentType || runtime.agentType || "claudecode") } : null;
    })
        .filter(Boolean);
}
function runtimeWorkDirAvailable(workDir) {
    try {
        return !!workDir && fs.existsSync(workDir) && fs.statSync(workDir).isDirectory();
    }
    catch {
        return false;
    }
}
function resyncMissingRuntimeToolSnapshots(options = {}) {
    const limit = Math.max(1, Math.min(30, Number(options.missingLimit || options.limit || 20) || 20));
    const runtimeReadiness = Array.isArray(options.runtimeReadiness)
        ? options.runtimeReadiness
        : listRecentRuntimeToolAudits(120)
            .map(audit => probeRuntimeToolReadiness(audit, { record: false, catalog: options.catalog || {} }))
            .filter(readiness => !!readiness.projectName || !!readiness.groupId);
    const groups = Array.isArray(options.groups) ? options.groups : (0, storage_1.loadGroups)();
    const projects = options.projects || (0, db_1.loadProjectConfigs)();
    const inventory = (0, tool_authorization_1.buildToolAuthorizationInventory)({
        projects,
        groups,
        runtimeReadiness,
    });
    const configuredRows = (inventory.scopes || [])
        .filter((row) => Number(row.counts?.mcp || 0) + Number(row.counts?.skill || 0) > 0);
    const rows = configuredRows
        .filter((row) => Number(row.runtime?.summary?.total || 0) === 0)
        .filter((row) => runtimeMissingScopeMatchesFilter(row, options))
        .filter((row) => runtimeMissingScopeRequestsMarketplaceItem(row, options))
        .slice(0, limit);
    const items = [];
    for (const row of rows) {
        const targets = buildMissingRuntimeTargets(row, groups, options);
        if (!targets.length) {
            items.push({
                action: "skipped",
                reason: "runtime_target_unavailable",
                scope: row.scope,
                scopeId: row.id,
                tools: row.tools || {},
            });
            continue;
        }
        for (const target of targets) {
            if (!runtimeWorkDirAvailable(target.workDir)) {
                items.push({
                    action: "failed",
                    reason: "workdir_unavailable",
                    scope: row.scope,
                    scopeId: row.id,
                    projectName: target.projectName,
                    groupId: target.groupId,
                    workDir: target.workDir,
                });
                continue;
            }
            const requested = row.tools || {};
            const authorization = (0, tool_authorization_1.buildToolAuthorizationPayload)(requested);
            const audit = syncRuntimeToolsWithCatalog(target.workDir, target.agentType, requested, options.catalog || {}, {
                authorizationReadiness: authorization.authorization_readiness,
            });
            audit.projectName = target.projectName;
            audit.groupId = target.groupId;
            audit.authorization_readiness = authorization.authorization_readiness;
            recordRuntimeToolSyncAudit(audit, target.projectName, target.groupId);
            const readiness = probeRuntimeToolReadiness(audit, { record: false, catalog: options.catalog || {} });
            const after = {
                runtime: readiness.runtime,
                snapshotId: readiness.snapshotId,
                projectName: target.projectName,
                groupId: target.groupId,
                catalogStale: readiness.catalogStale === true,
                deliveryReady: readiness.deliveryReady === true,
                runtimeReady: readiness.runtimeReady === true,
                overallReady: readiness.overallReady === true,
                dispatchReady: readiness.dispatchGate?.dispatchReady !== false,
                catalogRevision: readiness.catalogRevision,
                currentCatalogRevision: readiness.currentCatalogRevision,
            };
            items.push({
                action: audit.mode === "failed" ? "failed" : "created",
                scope: row.scope,
                scopeId: row.id,
                projectName: target.projectName,
                groupId: target.groupId,
                runtime: audit.runtime,
                snapshotId: audit.snapshotId || "",
                after,
                audit: compactRuntimeResyncAudit(audit),
            });
        }
    }
    return {
        schema: "ccm-runtime-tool-missing-snapshot-resync-v1",
        requestedAt: new Date().toISOString(),
        summary: {
            scanned: configuredRows.length,
            selected: rows.length,
            created: items.filter(item => item.action === "created").length,
            skipped: items.filter(item => item.action === "skipped").length,
            failed: items.filter(item => item.action === "failed").length,
        },
        items,
    };
}
function resyncRecentRuntimeToolSnapshots(options = {}) {
    const requestedLimit = Number(options.limit || 30);
    const limit = Math.max(1, Math.min(50, Number.isFinite(requestedLimit) ? requestedLimit : 30));
    const staleOnly = options.staleOnly !== false;
    const requestedSnapshotIds = Array.isArray(options.snapshotIds) ? options.snapshotIds.filter(Boolean) : [];
    const audits = Array.isArray(options.audits)
        ? options.audits
        : listRecentRuntimeToolAudits(requestedSnapshotIds.length ? 240 : Math.max(limit * 2, 30));
    const items = [];
    const seen = new Set();
    let scanned = 0;
    let selected = 0;
    for (const audit of audits) {
        scanned += 1;
        const key = audit?.snapshotId
            ? `${audit.runtime || ""}:${audit.snapshotId}:${audit?.workDir || ""}:${audit?.projectName || ""}:${audit?.groupId || ""}`
            : `${audit?.runtime || ""}:${audit?.workDir || ""}:${JSON.stringify(audit?.requested || {})}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        if (!runtimeAuditMatchesResyncFilter(audit, options))
            continue;
        const readiness = probeRuntimeToolReadiness(audit, { record: false, catalog: options.catalog || {} });
        if (staleOnly && !readiness.catalogStale) {
            items.push({
                action: "skipped",
                reason: "catalog_fresh",
                before: {
                    runtime: readiness.runtime,
                    snapshotId: readiness.snapshotId,
                    projectName: readiness.projectName,
                    groupId: readiness.groupId,
                    catalogStale: readiness.catalogStale,
                },
            });
            continue;
        }
        selected += 1;
        if (selected > limit)
            break;
        const workDir = String(audit?.workDir || "");
        const runtime = String(audit?.runtime || "");
        if (!workDir || !runtime || !fs.existsSync(workDir) || !fs.statSync(workDir).isDirectory()) {
            items.push({
                action: "failed",
                reason: "workdir_unavailable",
                before: {
                    runtime: readiness.runtime,
                    snapshotId: readiness.snapshotId,
                    projectName: readiness.projectName,
                    groupId: readiness.groupId,
                    catalogStale: readiness.catalogStale,
                },
            });
            continue;
        }
        const requested = {
            mcp: uniqueNames(audit?.requested?.mcp),
            skill: uniqueNames(audit?.requested?.skill),
        };
        const authorizationPayload = (0, tool_authorization_1.buildToolAuthorizationPayload)(requested);
        const nextAudit = syncRuntimeToolsWithCatalog(workDir, runtime, requested, options.catalog || {}, {
            authorizationReadiness: authorizationPayload.authorization_readiness,
        });
        nextAudit.projectName = String(audit?.projectName || "");
        nextAudit.groupId = String(audit?.groupId || "");
        recordRuntimeToolSyncAudit(nextAudit, String(audit?.projectName || ""), String(audit?.groupId || ""));
        const afterReadiness = probeRuntimeToolReadiness(nextAudit, { record: false, catalog: options.catalog || {} });
        items.push({
            action: nextAudit.mode === "failed" ? "failed" : "resynced",
            before: {
                runtime: readiness.runtime,
                snapshotId: readiness.snapshotId,
                projectName: readiness.projectName,
                groupId: readiness.groupId,
                catalogStale: readiness.catalogStale,
                deliveryReady: readiness.deliveryReady,
                dispatchReady: readiness.dispatchGate?.dispatchReady !== false,
            },
            after: {
                runtime: afterReadiness.runtime,
                snapshotId: afterReadiness.snapshotId,
                projectName: String(audit?.projectName || ""),
                groupId: String(audit?.groupId || ""),
                catalogStale: afterReadiness.catalogStale,
                deliveryReady: afterReadiness.deliveryReady,
                dispatchReady: afterReadiness.dispatchGate?.dispatchReady !== false,
            },
            audit: compactRuntimeResyncAudit(nextAudit),
        });
    }
    return {
        schema: "ccm-runtime-tool-resync-v1",
        requestedAt: new Date().toISOString(),
        summary: {
            scanned,
            selected,
            resynced: items.filter(item => item.action === "resynced").length,
            skipped: items.filter(item => item.action === "skipped").length,
            failed: items.filter(item => item.action === "failed").length,
        },
        items,
    };
}
function formatSkillAliasNotice(audit) {
    const rows = (audit.skill_statuses || [])
        .filter(status => status.state === "synced")
        .map(status => {
        const aliases = Array.from(new Set([
            ...(status.invocationAliases || []),
            ...(status.nativeSkillNames || []),
        ].filter(Boolean)))
            .filter(alias => alias !== status.name && alias !== `skill:${status.name}`)
            .slice(0, 4);
        return aliases.length ? `${status.name}=>${aliases.join(",")}` : "";
    })
        .filter(Boolean)
        .slice(0, 8);
    return rows.length ? ` Skill 调用名映射：${rows.join("；")}。` : "";
}
function buildRuntimeToolSyncPrompt(audit) {
    const missing = [...audit.missing.mcp.map(name => `MCP:${name}`), ...audit.missing.skill.map(name => `Skill:${name}`)];
    const authorizationNotice = formatAuthorizationReadinessNotice(audit);
    if (audit.mode === "native-and-proxy") {
        const missingNotice = missing.length ? ` 未找到或未启用：${missing.join("、")}。` : "";
        const warningNotice = audit.warnings.length ? ` 运行提示：${audit.warnings.join("；")}。` : "";
        const skillAliasNotice = formatSkillAliasNotice(audit);
        const scoped = (audit.permission_rules || []).filter(rule => rule.kind === "mcp" && rule.scope === "tool").length;
        const nativeMcp = nativeMcpNamesFromAudit(audit).length;
        const proxyOnlyMcp = proxyOnlyMcpNamesFromAudit(audit).length;
        return `\n[CCM Runtime 工具同步]\n已将授权工具交付给 ${audit.runtime}（隔离：${audit.isolation || "project-scope"}）：原生 MCP ${nativeMcp} 个，代理 MCP ${proxyOnlyMcp} 个，Skill ${audit.synced.skill.length} 个，工具级授权 ${scoped} 条。snapshot=${audit.snapshotId || ""}${audit.reusedSnapshot ? "（复用）" : ""}。${missingNotice}${authorizationNotice}${warningNotice}${skillAliasNotice}工具级 MCP 授权必须通过 CCM 平台代执行协议调用，不得绕过授权快照或调用未授权 MCP/Skill。若使用 Skill，请在 CCM_AGENT_RECEIPT.memoryUsed 中写入 Skill:<name>。\n`;
    }
    if (audit.mode === "ccm-proxy-only") {
        const skillAliasNotice = formatSkillAliasNotice(audit);
        return `\n[CCM Runtime 工具同步]\n当前 ${audit.runtime} 使用 CCM 平台代执行协议；仅可调用本提示中授权的 MCP/Skill，不得自行扩展权限。${authorizationNotice}${skillAliasNotice}若使用 Skill，请在 CCM_AGENT_RECEIPT.memoryUsed 中写入 Skill:<name>。\n`;
    }
    return `\n[CCM Runtime 工具同步失败]\n原生工具配置未完成，请仅使用 CCM 平台代执行协议。${audit.errors.join("；")}${missing.length ? `；缺失：${missing.join("、")}` : ""}${authorizationNotice}\n`;
}
function detectInvokedSkillsFromText(text, allowedTools = {}, skills = (0, db_1.loadSkills)()) {
    const allowed = new Set(uniqueNames(allowedTools?.skill));
    if (!allowed.size)
        return [];
    const haystack = String(text || "");
    return skills
        .filter(skill => skill?.enabled !== false && allowed.has(String(skill.name)))
        .filter(skill => {
        const name = String(skill.name || "");
        return new RegExp(`Skill\\s*[:：]\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(haystack)
            || new RegExp(`(?:^|[\\s,，;；])skill:${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[\\s,，;；])`, "i").test(haystack);
    })
        .map(skill => ({
        name: String(skill.name),
        contentHash: crypto.createHash("sha256").update(String(skill.prompt || "")).digest("hex").slice(0, 16),
        invokedAt: new Date().toISOString(),
        source: "receipt",
    }));
}
function recordRuntimeToolSyncAudit(audit, projectName = "", groupId = "") {
    try {
        const auditDir = path.join(utils_1.CCM_DIR, "agent-runner");
        fs.mkdirSync(auditDir, { recursive: true });
        const auditFile = path.join(auditDir, "runtime-tool-sync.jsonl");
        if (fs.existsSync(auditFile) && fs.statSync(auditFile).size > 2 * 1024 * 1024) {
            const content = fs.readFileSync(auditFile, "utf-8");
            const tail = content.slice(-1024 * 1024);
            fs.writeFileSync(auditFile, tail.slice(Math.max(0, tail.indexOf("\n") + 1)), "utf-8");
        }
        fs.appendFileSync(auditFile, `${JSON.stringify({ ...audit, projectName, groupId })}\n`, "utf-8");
    }
    catch {
        // Runtime execution should not fail solely because audit persistence is unavailable.
    }
}
//# sourceMappingURL=runtime-tool-sync.js.map