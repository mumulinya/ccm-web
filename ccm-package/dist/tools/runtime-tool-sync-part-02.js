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
exports.getRuntimeExecutionEnv = getRuntimeExecutionEnv;
exports.runRuntimeToolSyncSelfTest = runRuntimeToolSyncSelfTest;
exports.syncRuntimeToolsWithCatalog = syncRuntimeToolsWithCatalog;
exports.syncRuntimeTools = syncRuntimeTools;
exports.resyncMissingRuntimeToolSnapshots = resyncMissingRuntimeToolSnapshots;
exports.resyncRecentRuntimeToolSnapshots = resyncRecentRuntimeToolSnapshots;
exports.buildRuntimeToolSyncPrompt = buildRuntimeToolSyncPrompt;
exports.detectInvokedSkillsFromText = detectInvokedSkillsFromText;
exports.recordRuntimeToolSyncAudit = recordRuntimeToolSyncAudit;
// Behavior-freeze split from runtime-tool-sync.ts (part 2/2).
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const db_1 = require("../core/db");
const runtime_1 = require("../agents/runtime");
const utils_1 = require("../core/utils");
const storage_1 = require("../modules/collaboration/storage");
const agent_provider_settings_1 = require("../modules/system/agent-provider-settings");
const tool_authorization_1 = require("./tool-authorization");
const runtime_tool_sync_part_01_1 = require("./runtime-tool-sync-part-01");
function getRuntimeExecutionEnv(agentType) {
    const configured = (0, agent_provider_settings_1.getConfiguredDevelopmentAgentEnv)(agentType);
    if ((0, runtime_1.normalizeAgentRuntimeId)(agentType) !== "codex")
        return configured;
    const provider = (0, runtime_tool_sync_part_01_1.loadCodexProviderConfig)();
    return {
        ...configured,
        ...(provider ? { [provider.envKey || "CCM_CODEX_API_KEY"]: provider.apiKey } : {}),
    };
}
function buildCodexConfigToml(mcpServers, gateway, skillPaths = []) {
    const lines = ["# Managed by CCM. This CODEX_HOME contains only tools authorized for this invocation.", ""];
    if (gateway) {
        const providerId = gateway.providerId || "ccm";
        lines.push(`model_provider = ${(0, runtime_tool_sync_part_01_1.tomlString)(providerId)}`, `model = ${(0, runtime_tool_sync_part_01_1.tomlString)(gateway.model)}`, `web_search = ${(0, runtime_tool_sync_part_01_1.tomlString)("disabled")}`, "", `[model_providers.${providerId}]`, `name = ${(0, runtime_tool_sync_part_01_1.tomlString)(gateway.providerName || "CCM Unified Gateway")}`, `base_url = ${(0, runtime_tool_sync_part_01_1.tomlString)(gateway.apiUrl)}`, `env_key = ${(0, runtime_tool_sync_part_01_1.tomlString)(gateway.envKey || "CCM_CODEX_API_KEY")}`, `wire_api = ${(0, runtime_tool_sync_part_01_1.tomlString)(gateway.wireApi || "responses")}`, `requires_openai_auth = ${gateway.requiresOpenAiAuth === true ? "true" : "false"}`, "");
    }
    for (const [name, server] of Object.entries(mcpServers)) {
        lines.push(`[mcp_servers.${(0, runtime_tool_sync_part_01_1.tomlString)(name)}]`);
        if (server.url) {
            lines.push(`url = ${(0, runtime_tool_sync_part_01_1.tomlString)(server.url)}`);
        }
        else {
            lines.push(`command = ${(0, runtime_tool_sync_part_01_1.tomlString)(server.command)}`);
            lines.push(`args = [${(server.args || []).map((item) => (0, runtime_tool_sync_part_01_1.tomlString)(item)).join(", ")}]`);
        }
        if (server.env && Object.keys(server.env).length) {
            lines.push("", `[mcp_servers.${(0, runtime_tool_sync_part_01_1.tomlString)(name)}.env]`);
            for (const [key, value] of Object.entries(server.env))
                lines.push(`${(0, runtime_tool_sync_part_01_1.tomlString)(key)} = ${(0, runtime_tool_sync_part_01_1.tomlString)(value)}`);
        }
        lines.push("");
    }
    for (const skillPath of skillPaths) {
        lines.push("[[skills.config]]", `path = ${(0, runtime_tool_sync_part_01_1.tomlString)(skillPath)}`, "enabled = true", "");
    }
    return lines.join("\n");
}
function toOpenCodeMcpServer(server) {
    const url = String(server?.url || "").trim();
    if (url)
        return {
            type: "remote",
            url,
            enabled: true,
            ...(server?.headers && typeof server.headers === "object" ? { headers: server.headers } : {}),
        };
    const command = String(server?.command || "").trim();
    if (!command)
        throw new Error("OpenCode MCP 缺少 command");
    return {
        type: "local",
        command: [command, ...(Array.isArray(server?.args) ? server.args.map(String) : [])],
        enabled: true,
        ...(server?.env && typeof server.env === "object" ? { environment: server.env } : {}),
    };
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
        const snapshot = audit.snapshotPath ? (0, runtime_tool_sync_part_01_1.readJsonFile)(audit.snapshotPath) : null;
        const skillPath = (audit.skill_statuses || []).find(item => item.name === "release-notes" && item.state === "synced")?.skillPath || "";
        const packageSkillStatus = (audit.skill_statuses || []).find(item => item.name === "market-package-skill" && item.state === "synced");
        const packageSkillPath = String(packageSkillStatus?.skillPath || "");
        const packageSkillRoot = packageSkillPath ? path.dirname(packageSkillPath) : "";
        const packageSkillBody = packageSkillPath && fs.existsSync(packageSkillPath) ? fs.readFileSync(packageSkillPath, "utf-8") : "";
        const claudePluginRoot = String(claudeAudit.pluginDirPath || "");
        const claudeManifestPath = claudePluginRoot ? path.join(claudePluginRoot, ".claude-plugin", "plugin.json") : "";
        const claudeManifest = claudeManifestPath && fs.existsSync(claudeManifestPath) ? (0, runtime_tool_sync_part_01_1.readJsonFile)(claudeManifestPath) : null;
        const claudePluginMcpPath = claudePluginRoot ? path.join(claudePluginRoot, ".mcp.json") : "";
        const claudePluginMcp = claudePluginMcpPath && fs.existsSync(claudePluginMcpPath) ? (0, runtime_tool_sync_part_01_1.readJsonFile)(claudePluginMcpPath) : null;
        const claudePluginMcpServers = claudePluginMcp?.mcpServers || {};
        const claudePluginMcpText = claudePluginMcpPath && fs.existsSync(claudePluginMcpPath) ? fs.readFileSync(claudePluginMcpPath, "utf-8") : "";
        const claudeStrictMcpText = claudeAudit.mcpConfigPath && fs.existsSync(claudeAudit.mcpConfigPath)
            ? fs.readFileSync(claudeAudit.mcpConfigPath, "utf-8")
            : "";
        const claudeSnapshot = claudeAudit.snapshotPath ? (0, runtime_tool_sync_part_01_1.readJsonFile)(claudeAudit.snapshotPath) : null;
        const claudeReadiness = (0, runtime_tool_sync_part_01_1.probeRuntimeToolReadiness)(claudeAudit, { catalogRevision: claudeAudit.catalogRevision });
        const cursorPluginRoot = String(cursorAudit.pluginDirPath || "");
        const cursorManifestPath = cursorPluginRoot ? path.join(cursorPluginRoot, ".cursor-plugin", "plugin.json") : "";
        const cursorManifest = cursorManifestPath && fs.existsSync(cursorManifestPath) ? (0, runtime_tool_sync_part_01_1.readJsonFile)(cursorManifestPath) : null;
        const cursorPluginMcpPath = cursorPluginRoot ? path.join(cursorPluginRoot, ".mcp.json") : "";
        const cursorPluginMcp = cursorPluginMcpPath && fs.existsSync(cursorPluginMcpPath) ? (0, runtime_tool_sync_part_01_1.readJsonFile)(cursorPluginMcpPath) : null;
        const cursorPluginMcpServers = cursorPluginMcp?.mcpServers || {};
        const cursorPluginMcpText = cursorPluginMcpPath && fs.existsSync(cursorPluginMcpPath) ? fs.readFileSync(cursorPluginMcpPath, "utf-8") : "";
        const cursorSnapshot = cursorAudit.snapshotPath ? (0, runtime_tool_sync_part_01_1.readJsonFile)(cursorAudit.snapshotPath) : null;
        const cursorReadiness = (0, runtime_tool_sync_part_01_1.probeRuntimeToolReadiness)(cursorAudit, { catalogRevision: cursorAudit.catalogRevision });
        const staleCatalogReadiness = (0, runtime_tool_sync_part_01_1.probeRuntimeToolReadiness)({ ...claudeAudit, catalogRevision: "stale-catalog-revision" }, { catalogRevision: claudeAudit.catalogRevision });
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
        const blockedAuthorizationGate = (0, runtime_tool_sync_part_01_1.buildRuntimeToolDispatchGate)(blockedAuthorizationAudit);
        const blockedAuthorizationPrompt = buildRuntimeToolSyncPrompt(blockedAuthorizationAudit);
        const blockedAuthorizationRuntimeReadiness = (0, runtime_tool_sync_part_01_1.probeRuntimeToolReadiness)(blockedAuthorizationAudit, { catalogRevision: claudeAudit.catalogRevision });
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
            marketplacePackageSkillRegistered: configText.includes("market-package-skill") && configText.includes((0, runtime_tool_sync_part_01_1.tomlString)(packageSkillPath)),
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
    const rules = (0, runtime_tool_sync_part_01_1.buildPermissionRules)({ mcp: ["payments/createInvoice", "search"], skill: ["release-notes"] });
    const toolScopedMcpStaysProxyOnly = !(0, runtime_tool_sync_part_01_1.shouldExposeMcpServerNatively)(["payments/createInvoice"], "payments");
    const nativeStyleToolScopedMcpStaysProxyOnly = !(0, runtime_tool_sync_part_01_1.shouldExposeMcpServerNatively)(["mcp__ccm__payments__createInvoice"], "payments");
    const nativeStyleGrantServerMatchingKeepsToolGrant = (0, runtime_tool_sync_part_01_1.mcpGrantsForServer)(["mcp__ccm__payments__createInvoice"], "payments")[0] === "mcp__ccm__payments__createInvoice";
    const fullServerMcpCanUseNative = (0, runtime_tool_sync_part_01_1.shouldExposeMcpServerNatively)(["search"], "search")
        && (0, runtime_tool_sync_part_01_1.shouldExposeMcpServerNatively)(["search/*"], "search");
    const grantServerMatchingKeepsToolGrant = (0, runtime_tool_sync_part_01_1.mcpGrantsForServer)(["payments/createInvoice"], "payments")[0] === "payments/createInvoice";
    const nativeAuditNames = (0, runtime_tool_sync_part_01_1.nativeMcpNamesFromAudit)({ mcp_statuses: [{ name: "search", state: "synced" }] });
    const proxyOnlyAuditNames = (0, runtime_tool_sync_part_01_1.proxyOnlyMcpNamesFromAudit)({ mcp_statuses: [{ name: "payments", state: "proxy_only" }] });
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
    const nativeSupported = ["claudecode", "cursor", "gemini", "codex", "opencode", "qoder"].includes(runtime);
    const requested = { mcp: (0, runtime_tool_sync_part_01_1.uniqueNames)(allowedTools?.mcp), skill: (0, runtime_tool_sync_part_01_1.uniqueNames)(allowedTools?.skill) };
    const requestedServers = (0, runtime_tool_sync_part_01_1.requestedMcpServers)(allowedTools?.mcp);
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
        permission_rules: (0, runtime_tool_sync_part_01_1.buildPermissionRules)(requested),
        authorization_readiness: (0, runtime_tool_sync_part_01_1.getAuthorizationReadiness)(options.authorizationReadiness) || undefined,
        internal_mcp: [],
        errors: [],
        warnings: [],
        timestamp: new Date().toISOString(),
    };
    const catalogMcpTools = Array.isArray(catalog.mcpTools) ? catalog.mcpTools : (0, db_1.loadMcpTools)();
    const catalogSkills = Array.isArray(catalog.skills) ? catalog.skills : (0, db_1.loadSkills)();
    const catalogRevision = (0, runtime_tool_sync_part_01_1.getRuntimeToolCatalogRevision)({
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
        const grant = (0, runtime_tool_sync_part_01_1.parseMcpGrant)(name);
        return !grant.server || !enabledMcp.has(grant.server);
    });
    audit.missing.skill = requested.skill.filter(name => !enabledSkills.has(name));
    audit.skill_statuses = [
        ...(audit.skill_statuses || []),
        ...audit.missing.skill.map(name => ({ name, state: "missing" })),
    ];
    if (!nativeSupported) {
        audit.isolation = "proxy";
        audit.dispatch_gate = (0, runtime_tool_sync_part_01_1.buildRuntimeToolDispatchGate)(audit);
        return audit;
    }
    if (!workDir || !fs.existsSync(workDir) || !fs.statSync(workDir).isDirectory()) {
        audit.mode = "failed";
        audit.errors.push(`工作目录不存在或不可用: ${workDir || "<empty>"}`);
        audit.dispatch_gate = (0, runtime_tool_sync_part_01_1.buildRuntimeToolDispatchGate)(audit);
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
                : (0, runtime_tool_sync_part_01_1.loadCodexProviderConfig)())
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
                sourceMtimeMs: (0, runtime_tool_sync_part_01_1.resolveSkillPackage)(skill, skillPackagesDir)
                    ? fs.statSync((0, runtime_tool_sync_part_01_1.resolveSkillPackage)(skill, skillPackagesDir).skillPath).mtimeMs
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
                if (!name.startsWith(runtime_tool_sync_part_01_1.CCM_MCP_PREFIX))
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
            const serverName = `${runtime_tool_sync_part_01_1.CCM_MCP_PREFIX}${(0, runtime_tool_sync_part_01_1.safeSlug)(tool.name)}`;
            const grants = (0, runtime_tool_sync_part_01_1.mcpGrantsForServer)(requested.mcp, tool.name);
            const tools = (0, runtime_tool_sync_part_01_1.mcpGrantToolsForServer)(requested.mcp, tool.name);
            if (!(0, runtime_tool_sync_part_01_1.shouldExposeMcpServerNatively)(requested.mcp, tool.name)) {
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
                mcpServers[serverName] = (0, runtime_tool_sync_part_01_1.toMcpServer)(tool);
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
            const grant = (0, runtime_tool_sync_part_01_1.parseMcpGrant)(missing);
            audit.mcp_statuses?.push({
                name: grant.server || missing,
                serverName: grant.server ? `${runtime_tool_sync_part_01_1.CCM_MCP_PREFIX}${(0, runtime_tool_sync_part_01_1.safeSlug)(grant.server)}` : "",
                state: "missing",
                grants: [missing],
                tools: grant.tool ? [grant.tool] : [],
            });
        }
        if (runtime === "claudecode") {
            const runtimeRoot = path.join(runtimeStorageRoot, "claudecode", authorizationId);
            const mcpConfigPath = path.join(runtimeRoot, `mcp-${authorizationId}.json`);
            const pluginRoot = path.join(runtimeRoot, "plugin");
            (0, runtime_tool_sync_part_01_1.writeJsonAtomic)(mcpConfigPath, { mcpServers });
            audit.mcpConfigPath = mcpConfigPath;
            audit.runtimeHomePath = runtimeRoot;
            audit.configFormat = "claude-strict-mcp-plus-session-plugin";
            audit.isolation = "strict";
            (0, runtime_tool_sync_part_01_1.writeSessionPlugin)(pluginRoot, "claudecode", authorizationId, mcpServers, selectedSkills, audit, skillPackagesDir);
            (0, runtime_tool_sync_part_01_1.pruneManagedMcpSnapshots)(runtimeRoot, mcpConfigPath);
            (0, runtime_tool_sync_part_01_1.writeRuntimeSnapshot)(runtimeRoot, audit);
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
            (0, runtime_tool_sync_part_01_1.syncManagedSkills)(skillRoot, selectedSkills, audit, skillPackagesDir);
            fs.writeFileSync(configPath, buildCodexConfigToml(mcpServers, codexGateway, (audit.skill_statuses || []).filter(item => item.state === "synced" && item.skillPath).map(item => String(item.skillPath))), "utf-8");
            (0, runtime_tool_sync_part_01_1.writeRuntimeSnapshot)(runtimeHome, audit);
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
            (0, runtime_tool_sync_part_01_1.writeSessionPlugin)(pluginRoot, "cursor", authorizationId, mcpServers, selectedSkills, audit, skillPackagesDir);
            (0, runtime_tool_sync_part_01_1.writeRuntimeSnapshot)(runtimeRoot, audit);
        }
        else if (runtime === "opencode") {
            const runtimeRoot = path.join(runtimeStorageRoot, "opencode", authorizationId);
            const configPath = path.join(runtimeRoot, "opencode.json");
            const skillRoot = path.join(runtimeRoot, "skills");
            const settings = (0, runtime_tool_sync_part_01_1.readJsonObject)(configPath);
            const existingServers = settings.mcp && typeof settings.mcp === "object" && !Array.isArray(settings.mcp) ? settings.mcp : {};
            settings.$schema = settings.$schema || "https://opencode.ai/config.json";
            settings.mcp = {
                ...Object.fromEntries(Object.entries(existingServers).filter(([name]) => !name.startsWith(runtime_tool_sync_part_01_1.CCM_MCP_PREFIX))),
                ...Object.fromEntries(Object.entries(mcpServers).map(([name, server]) => [name, toOpenCodeMcpServer(server)])),
            };
            (0, runtime_tool_sync_part_01_1.writeJsonAtomic)(configPath, settings);
            audit.mcpConfigPath = configPath;
            audit.runtimeHomePath = runtimeRoot;
            audit.skillRoot = skillRoot;
            audit.configFormat = "opencode-isolated-config";
            audit.isolation = "strict";
            (0, runtime_tool_sync_part_01_1.syncManagedSkills)(skillRoot, selectedSkills, audit, skillPackagesDir);
            (0, runtime_tool_sync_part_01_1.writeRuntimeSnapshot)(runtimeRoot, audit);
        }
        else {
            const runtimeSpec = runtime === "gemini"
                ? { root: ".gemini", config: "settings.json", skillDir: "skills", format: "gemini-project-settings" }
                : { root: ".qoder", config: "settings.local.json", skillDir: "skills", format: "qoder-local-settings" };
            const runtimeRoot = path.join(workDir, runtimeSpec.root);
            const configPath = path.join(runtimeRoot, runtimeSpec.config);
            const skillRoot = path.join(runtimeRoot, runtimeSpec.skillDir);
            const settings = (0, runtime_tool_sync_part_01_1.readJsonObject)(configPath);
            const existingServers = settings.mcpServers && typeof settings.mcpServers === "object" ? settings.mcpServers : {};
            settings.mcpServers = {
                ...Object.fromEntries(Object.entries(existingServers).filter(([name]) => !name.startsWith(runtime_tool_sync_part_01_1.CCM_MCP_PREFIX))),
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
            (0, runtime_tool_sync_part_01_1.writeJsonAtomic)(configPath, settings);
            audit.mcpConfigPath = configPath;
            audit.skillRoot = skillRoot;
            audit.configFormat = runtimeSpec.format;
            (0, runtime_tool_sync_part_01_1.syncManagedSkills)(skillRoot, selectedSkills, audit, skillPackagesDir);
            (0, runtime_tool_sync_part_01_1.writeRuntimeSnapshot)(runtimeRoot, audit);
        }
        if (audit.errors.length)
            audit.mode = "failed";
    }
    catch (error) {
        audit.mode = "failed";
        audit.errors.push(error?.message || String(error));
    }
    audit.dispatch_gate = (0, runtime_tool_sync_part_01_1.buildRuntimeToolDispatchGate)(audit);
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
            mcp: (0, runtime_tool_sync_part_01_1.uniqueNames)(audit.requested?.mcp),
            skill: (0, runtime_tool_sync_part_01_1.uniqueNames)(audit.requested?.skill),
        },
        synced: {
            mcp: (0, runtime_tool_sync_part_01_1.uniqueNames)(audit.synced?.mcp),
            skill: (0, runtime_tool_sync_part_01_1.uniqueNames)(audit.synced?.skill),
        },
        missing: {
            mcp: (0, runtime_tool_sync_part_01_1.uniqueNames)(audit.missing?.mcp),
            skill: (0, runtime_tool_sync_part_01_1.uniqueNames)(audit.missing?.skill),
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
    const snapshotIds = new Set((0, runtime_tool_sync_part_01_1.uniqueNames)([
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
    const scope = (0, runtime_tool_sync_part_01_1.cleanRuntimeResyncText)(options.scope || "", 40);
    const projectName = (0, runtime_tool_sync_part_01_1.cleanRuntimeResyncText)(options.projectName || options.project || "", 160);
    const groupId = (0, runtime_tool_sync_part_01_1.cleanRuntimeResyncText)(options.groupId || options.group_id || "", 160);
    if (scope && row.scope !== scope)
        return false;
    if (projectName && !(row.scope === "project" && row.id === projectName))
        return false;
    if (groupId && !(row.scope === "group" && row.id === groupId))
        return false;
    return true;
}
function normalizeRuntimeToolName(value) {
    return (0, runtime_tool_sync_part_01_1.cleanRuntimeResyncText)(value, 180).replace(/^ccm__/, "").toLowerCase();
}
function runtimeMissingScopeRequestsMarketplaceItem(row, options = {}) {
    const type = (0, runtime_tool_sync_part_01_1.cleanRuntimeResyncText)(options.type || options.toolType || "", 40).toLowerCase();
    const name = normalizeRuntimeToolName(options.name || options.toolName || "");
    if (!type || !name)
        return true;
    const tools = row?.tools || {};
    if (type === "mcp") {
        return (0, runtime_tool_sync_part_01_1.uniqueNames)(tools?.mcp).some(grant => normalizeRuntimeToolName((0, runtime_tool_sync_part_01_1.parseMcpGrant)(grant).server) === name);
    }
    if (type === "skill") {
        return (0, runtime_tool_sync_part_01_1.uniqueNames)(tools?.skill).some(skill => normalizeRuntimeToolName(skill) === name);
    }
    return true;
}
function getProjectRuntimeConfig(projectName, options = {}) {
    const cleanProjectName = (0, runtime_tool_sync_part_01_1.cleanRuntimeResyncText)(projectName, 160);
    if (!cleanProjectName)
        return null;
    const runtimeTargets = Array.isArray(options.runtimeTargets) ? options.runtimeTargets : [];
    const explicitTarget = runtimeTargets.find((item) => (0, runtime_tool_sync_part_01_1.cleanRuntimeResyncText)(item?.projectName || item?.project || "", 160) === cleanProjectName);
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
        const projectName = (0, runtime_tool_sync_part_01_1.cleanRuntimeResyncText)(member?.project || member?.projectName || "", 160);
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
        : (0, runtime_tool_sync_part_01_1.listRecentRuntimeToolAudits)(120)
            .map(audit => (0, runtime_tool_sync_part_01_1.probeRuntimeToolReadiness)(audit, { record: false, catalog: options.catalog || {} }))
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
            const readiness = (0, runtime_tool_sync_part_01_1.probeRuntimeToolReadiness)(audit, { record: false, catalog: options.catalog || {} });
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
        : (0, runtime_tool_sync_part_01_1.listRecentRuntimeToolAudits)(requestedSnapshotIds.length ? 240 : Math.max(limit * 2, 30));
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
        const readiness = (0, runtime_tool_sync_part_01_1.probeRuntimeToolReadiness)(audit, { record: false, catalog: options.catalog || {} });
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
            mcp: (0, runtime_tool_sync_part_01_1.uniqueNames)(audit?.requested?.mcp),
            skill: (0, runtime_tool_sync_part_01_1.uniqueNames)(audit?.requested?.skill),
        };
        const authorizationPayload = (0, tool_authorization_1.buildToolAuthorizationPayload)(requested);
        const nextAudit = syncRuntimeToolsWithCatalog(workDir, runtime, requested, options.catalog || {}, {
            authorizationReadiness: authorizationPayload.authorization_readiness,
        });
        nextAudit.projectName = String(audit?.projectName || "");
        nextAudit.groupId = String(audit?.groupId || "");
        recordRuntimeToolSyncAudit(nextAudit, String(audit?.projectName || ""), String(audit?.groupId || ""));
        const afterReadiness = (0, runtime_tool_sync_part_01_1.probeRuntimeToolReadiness)(nextAudit, { record: false, catalog: options.catalog || {} });
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
    const authorizationNotice = (0, runtime_tool_sync_part_01_1.formatAuthorizationReadinessNotice)(audit);
    if (audit.mode === "native-and-proxy") {
        const missingNotice = missing.length ? ` 未找到或未启用：${missing.join("、")}。` : "";
        const warningNotice = audit.warnings.length ? ` 运行提示：${audit.warnings.join("；")}。` : "";
        const skillAliasNotice = formatSkillAliasNotice(audit);
        const scoped = (audit.permission_rules || []).filter(rule => rule.kind === "mcp" && rule.scope === "tool").length;
        const nativeMcp = (0, runtime_tool_sync_part_01_1.nativeMcpNamesFromAudit)(audit).length;
        const proxyOnlyMcp = (0, runtime_tool_sync_part_01_1.proxyOnlyMcpNamesFromAudit)(audit).length;
        return `\n[CCM Runtime 工具同步]\n已将授权工具交付给 ${audit.runtime}（隔离：${audit.isolation || "project-scope"}）：原生 MCP ${nativeMcp} 个，代理 MCP ${proxyOnlyMcp} 个，Skill ${audit.synced.skill.length} 个，工具级授权 ${scoped} 条。snapshot=${audit.snapshotId || ""}${audit.reusedSnapshot ? "（复用）" : ""}。${missingNotice}${authorizationNotice}${warningNotice}${skillAliasNotice}工具级 MCP 授权必须通过 CCM 平台代执行协议调用，不得绕过授权快照或调用未授权 MCP/Skill。若使用 Skill，请在 CCM_AGENT_RECEIPT.memoryUsed 中写入 Skill:<name>。\n`;
    }
    if (audit.mode === "ccm-proxy-only") {
        const skillAliasNotice = formatSkillAliasNotice(audit);
        return `\n[CCM Runtime 工具同步]\n当前 ${audit.runtime} 使用 CCM 平台代执行协议；仅可调用本提示中授权的 MCP/Skill，不得自行扩展权限。${authorizationNotice}${skillAliasNotice}若使用 Skill，请在 CCM_AGENT_RECEIPT.memoryUsed 中写入 Skill:<name>。\n`;
    }
    return `\n[CCM Runtime 工具同步失败]\n原生工具配置未完成，请仅使用 CCM 平台代执行协议。${audit.errors.join("；")}${missing.length ? `；缺失：${missing.join("、")}` : ""}${authorizationNotice}\n`;
}
function detectInvokedSkillsFromText(text, allowedTools = {}, skills = (0, db_1.loadSkills)()) {
    const allowed = new Set((0, runtime_tool_sync_part_01_1.uniqueNames)(allowedTools?.skill));
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
//# sourceMappingURL=runtime-tool-sync-part-02.js.map