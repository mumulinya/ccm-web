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
exports.CCM_SKILL_MARKER = exports.CCM_MCP_PREFIX = void 0;
exports.uniqueNames = uniqueNames;
exports.cleanRuntimeResyncText = cleanRuntimeResyncText;
exports.getAuthorizationReadiness = getAuthorizationReadiness;
exports.formatAuthorizationReadinessNotice = formatAuthorizationReadinessNotice;
exports.buildRuntimeToolDispatchGate = buildRuntimeToolDispatchGate;
exports.appendJsonlBounded = appendJsonlBounded;
exports.readJsonFile = readJsonFile;
exports.stableHash = stableHash;
exports.getRuntimeToolCatalogRevision = getRuntimeToolCatalogRevision;
exports.listRecentRuntimeToolAudits = listRecentRuntimeToolAudits;
exports.probeRuntimeToolReadiness = probeRuntimeToolReadiness;
exports.normalizeMcpKey = normalizeMcpKey;
exports.parseMcpGrant = parseMcpGrant;
exports.mcpGrantsForServer = mcpGrantsForServer;
exports.mcpGrantToolsForServer = mcpGrantToolsForServer;
exports.shouldExposeMcpServerNatively = shouldExposeMcpServerNatively;
exports.requestedMcpServers = requestedMcpServers;
exports.nativeMcpNamesFromAudit = nativeMcpNamesFromAudit;
exports.proxyOnlyMcpNamesFromAudit = proxyOnlyMcpNamesFromAudit;
exports.toMcpServer = toMcpServer;
exports.safeSlug = safeSlug;
exports.readJsonObject = readJsonObject;
exports.writeJsonAtomic = writeJsonAtomic;
exports.resolveSkillPackage = resolveSkillPackage;
exports.syncManagedSkills = syncManagedSkills;
exports.writeSessionPlugin = writeSessionPlugin;
exports.buildPermissionRules = buildPermissionRules;
exports.writeRuntimeSnapshot = writeRuntimeSnapshot;
exports.pruneManagedMcpSnapshots = pruneManagedMcpSnapshots;
exports.tomlString = tomlString;
exports.loadCodexGatewayConfig = loadCodexGatewayConfig;
exports.loadCodexLocalAccessConfig = loadCodexLocalAccessConfig;
exports.loadCodexProviderConfig = loadCodexProviderConfig;
// Behavior-freeze split from runtime-tool-sync.ts (part 1/2).
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const db_1 = require("../core/db");
const runtime_1 = require("../agents/runtime");
const utils_1 = require("../core/utils");
const group_orchestrator_1 = require("../modules/collaboration/group-orchestrator");
exports.CCM_MCP_PREFIX = "ccm__";
exports.CCM_SKILL_MARKER = ".ccm-managed.json";
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
            .map((item) => item.serverName || (item.name ? `${exports.CCM_MCP_PREFIX}${safeSlug(item.name)}` : "")));
    }
    return nativeMcpNamesFromAudit(audit).map(name => `${exports.CCM_MCP_PREFIX}${safeSlug(name)}`);
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
        const directoryName = `${exports.CCM_MCP_PREFIX.replace(/_+$/g, "-")}${safeSlug(skill.name)}`;
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
        writeJsonAtomic(path.join(directory, exports.CCM_SKILL_MARKER), { source: "ccm", name: skill.name });
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
        if (fs.existsSync(path.join(directory, exports.CCM_SKILL_MARKER)))
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
        const server = `${exports.CCM_MCP_PREFIX}${safeSlug(grant.server)}`;
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
//# sourceMappingURL=runtime-tool-sync-part-01.js.map