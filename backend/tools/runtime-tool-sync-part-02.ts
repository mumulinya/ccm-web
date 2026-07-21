// Behavior-freeze split from runtime-tool-sync.ts (part 2/2).
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as os from "os";
import { spawnSync } from "child_process";
import { getConfigInfo, getConfigs, loadMcpTools, loadProjectConfigs, loadSkills, MCP_DIR, SKILLS_DIR, SKILL_PACKAGES_DIR } from "../core/db";
import { normalizeAgentRuntimeId } from "../agents/runtime";
import { CCM_DIR } from "../core/utils";
import { loadOrchestratorConfig } from "../modules/collaboration/group-orchestrator";
import { loadGroups } from "../modules/collaboration/storage";
import { getConfiguredDevelopmentAgentEnv } from "../modules/system/agent-provider-settings";
import { buildToolAuthorizationInventory, buildToolAuthorizationPayload } from "./tool-authorization";
import {
  type RuntimeToolSyncAudit,
  type RuntimeToolSyncOptions,
  type RuntimeToolSyncCatalog,
  type RuntimeToolReadiness,
  type RuntimeToolDispatchGate,
  type RuntimeToolResyncResult,
  type RuntimeMissingToolResyncResult,
  type RuntimeInvokedSkill,
  type RuntimeMcpStatus,
  type RuntimeSkillStatus,
  type RuntimeToolPermissionRule,
  type CodexGatewayConfig,
  CCM_MCP_PREFIX,
  CCM_SKILL_MARKER,
  uniqueNames,
  cleanRuntimeResyncText,
  getAuthorizationReadiness,
  formatAuthorizationReadinessNotice,
  buildRuntimeToolDispatchGate,
  appendJsonlBounded,
  readJsonFile,
  stableHash,
  getRuntimeToolCatalogRevision,
  listRecentRuntimeToolAudits,
  probeRuntimeToolReadiness,
  normalizeMcpKey,
  parseMcpGrant,
  mcpGrantsForServer,
  mcpGrantToolsForServer,
  shouldExposeMcpServerNatively,
  requestedMcpServers,
  nativeMcpNamesFromAudit,
  proxyOnlyMcpNamesFromAudit,
  toMcpServer,
  safeSlug,
  readJsonObject,
  writeJsonAtomic,
  resolveSkillPackage,
  syncManagedSkills,
  writeSessionPlugin,
  buildPermissionRules,
  writeRuntimeSnapshot,
  pruneManagedMcpSnapshots,
  tomlString,
  loadCodexProviderConfig,
  loadCodexGatewayConfig,
  loadCodexLocalAccessConfig,
} from "./runtime-tool-sync-part-01";
export function getRuntimeExecutionEnv(agentType: string): Record<string, string> {
  const configured = getConfiguredDevelopmentAgentEnv(agentType);
  if (normalizeAgentRuntimeId(agentType) !== "codex") return configured;
  const provider = loadCodexProviderConfig();
  return {
    ...configured,
    ...(provider ? { [provider.envKey || "CCM_CODEX_API_KEY"]: provider.apiKey } : {}),
  };
}

function buildCodexConfigToml(
  mcpServers: Record<string, any>,
  gateway: CodexGatewayConfig | null,
  skillPaths: string[] = [],
) {
  const lines = ["# Managed by CCM. This CODEX_HOME contains only tools authorized for this invocation.", ""];
  if (gateway) {
    const providerId = gateway.providerId || "ccm";
    lines.push(
      `model_provider = ${tomlString(providerId)}`,
      `model = ${tomlString(gateway.model)}`,
      `web_search = ${tomlString("disabled")}`,
      "",
      `[model_providers.${providerId}]`,
      `name = ${tomlString(gateway.providerName || "CCM Unified Gateway")}`,
      `base_url = ${tomlString(gateway.apiUrl)}`,
      `env_key = ${tomlString(gateway.envKey || "CCM_CODEX_API_KEY")}`,
      `wire_api = ${tomlString(gateway.wireApi || "responses")}`,
      `requires_openai_auth = ${gateway.requiresOpenAiAuth === true ? "true" : "false"}`,
      "",
    );
  }
  for (const [name, server] of Object.entries(mcpServers)) {
    lines.push(`[mcp_servers.${tomlString(name)}]`);
    if (server.url) {
      lines.push(`url = ${tomlString(server.url)}`);
    } else {
      lines.push(`command = ${tomlString(server.command)}`);
      lines.push(`args = [${(server.args || []).map((item: any) => tomlString(item)).join(", ")}]`);
    }
    if (server.env && Object.keys(server.env).length) {
      lines.push("", `[mcp_servers.${tomlString(name)}.env]`);
      for (const [key, value] of Object.entries(server.env)) lines.push(`${tomlString(key)} = ${tomlString(value)}`);
    }
    lines.push("");
  }
  for (const skillPath of skillPaths) {
    lines.push(
      "[[skills.config]]",
      `path = ${tomlString(skillPath)}`,
      "enabled = true",
      "",
    );
  }
  return lines.join("\n");
}

function toOpenCodeMcpServer(server: any) {
  const url = String(server?.url || "").trim();
  if (url) return {
    type: "remote",
    url,
    enabled: true,
    ...(server?.headers && typeof server.headers === "object" ? { headers: server.headers } : {}),
  };
  const command = String(server?.command || "").trim();
  if (!command) throw new Error("OpenCode MCP 缺少 command");
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
  fs.writeFileSync(
    path.join(packageSkillDir, "SKILL.md"),
    "---\nname: market-package-skill\ndescription: Marketplace package-backed Skill\n---\n\nUse the packaged instructions.\n",
    "utf-8",
  );
  fs.writeFileSync(path.join(packageSkillDir, "references", "guide.md"), "Package reference copied into runtime.\n", "utf-8");
  try {
    const integrationCatalog: RuntimeToolSyncCatalog = {
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
    const audit = syncRuntimeToolsWithCatalog(
      workDir,
      "codex",
      { mcp: ["payments/createInvoice", "search"], skill: ["release-notes", "market-package-skill"] },
      integrationCatalog,
    );
    const claudeAudit = syncRuntimeToolsWithCatalog(
      workDir,
      "claudecode",
      { mcp: ["payments/createInvoice", "search"], skill: ["release-notes", "market-package-skill"] },
      integrationCatalog,
    );
    const cursorAudit = syncRuntimeToolsWithCatalog(
      workDir,
      "cursor",
      { mcp: ["payments/createInvoice", "search"], skill: ["release-notes", "market-package-skill"] },
      integrationCatalog,
    );
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
      toolScopedMcpIsProxyOnly: (audit.mcp_statuses || []).some(item =>
        item.name === "payments"
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
        && snapshot.mcp_statuses.some((item: any) => item.name === "search" && item.delivery === "native")
        && snapshot.mcp_statuses.some((item: any) => item.name === "payments" && item.delivery === "proxy"),
      snapshotPersistsPackageSkillStatus: Array.isArray(snapshot?.skill_statuses)
        && snapshot.skill_statuses.some((item: any) => item.name === "market-package-skill" && item.sourcePath === path.join(packageSkillDir, "SKILL.md")),
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
  } finally {
    try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
  }
}

export function runRuntimeToolSyncSelfTest() {
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

function linkCodexAuth(runtimeHome: string, audit: RuntimeToolSyncAudit) {
  const source = path.join(os.homedir(), ".codex", "auth.json");
  const target = path.join(runtimeHome, "auth.json");
  if (!fs.existsSync(source)) {
    audit.warnings.push("未找到 ~/.codex/auth.json；Codex 需依赖环境变量或系统凭据完成认证");
    return;
  }
  try {
    if (fs.existsSync(target)) fs.unlinkSync(target);
    fs.linkSync(source, target);
  } catch (error: any) {
    try {
      fs.copyFileSync(source, target);
      try { fs.chmodSync(target, 0o600); } catch {}
      audit.warnings.push("Codex 认证文件无法硬链接，已回退为 CCM 中央私有目录副本；下次调用会重新同步");
    } catch (copyError: any) {
      audit.warnings.push(`Codex 认证同步失败：${copyError?.message || error?.message || String(copyError)}`);
    }
  }
}

function removeManagedCodexAuth(runtimeHome: string) {
  const target = path.join(runtimeHome, "auth.json");
  try {
    if (fs.existsSync(target)) fs.unlinkSync(target);
  } catch {}
}

export function syncRuntimeToolsWithCatalog(
  workDir: string,
  agentType: string,
  allowedTools: any,
  catalog: RuntimeToolSyncCatalog = {},
  options: RuntimeToolSyncOptions = {},
): RuntimeToolSyncAudit {
  const runtime = normalizeAgentRuntimeId(agentType);
  const nativeSupported = ["claudecode", "cursor", "gemini", "codex", "opencode", "qoder"].includes(runtime);
  const requested = { mcp: uniqueNames(allowedTools?.mcp), skill: uniqueNames(allowedTools?.skill) };
  const requestedServers = requestedMcpServers(allowedTools?.mcp);
  const audit: RuntimeToolSyncAudit = {
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

  const catalogMcpTools = Array.isArray(catalog.mcpTools) ? catalog.mcpTools : loadMcpTools();
  const catalogSkills = Array.isArray(catalog.skills) ? catalog.skills : loadSkills();
  const catalogRevision = getRuntimeToolCatalogRevision({
    ...catalog,
    mcpTools: catalogMcpTools,
    skills: catalogSkills,
  }, requested);
  audit.catalogRevision = catalogRevision;
  const enabledMcp = new Map(catalogMcpTools.filter(tool => tool?.enabled !== false).map(tool => [String(tool.name), tool]));
  const enabledSkills = new Map(catalogSkills.filter(skill => skill?.enabled !== false).map(skill => [String(skill.name), skill]));
  const selectedMcp = requestedServers.map(name => enabledMcp.get(name)).filter(Boolean) as any[];
  const selectedSkills = requested.skill.map(name => enabledSkills.get(name)).filter(Boolean) as any[];
  audit.missing.mcp = requested.mcp.filter(name => {
    const grant = parseMcpGrant(name);
    return !grant.server || !enabledMcp.has(grant.server);
  });
  audit.missing.skill = requested.skill.filter(name => !enabledSkills.has(name));
  audit.skill_statuses = [
    ...(audit.skill_statuses || []),
    ...audit.missing.skill.map(name => ({ name, state: "missing" as const })),
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
    const runtimeStorageRoot = catalog.runtimeStorageRoot || path.join(CCM_DIR, "agent-runtime");
    const skillPackagesDir = catalog.skillPackagesDir || SKILL_PACKAGES_DIR;
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
            ? fs.statSync(resolveSkillPackage(skill, skillPackagesDir)!.skillPath).mtimeMs
            : skill.filename && fs.existsSync(path.join(SKILLS_DIR, skill.filename)) ? fs.statSync(path.join(SKILLS_DIR, skill.filename)).mtimeMs : 0,
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
    const mcpServers: Record<string, any> = {};
    for (const [name, server] of Object.entries(options.internalMcpServers || {})) {
      try {
        if (!name.startsWith(CCM_MCP_PREFIX)) throw new Error("内部 MCP 名称必须使用 ccm__ 前缀");
        if (!server || typeof server !== "object" || !String((server as any).command || "").trim()) throw new Error("内部 MCP 缺少 command");
        mcpServers[name] = server;
        audit.internal_mcp?.push({ name, protected: true, state: "synced" });
      } catch (error: any) {
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
        audit.warnings.push(
          `MCP ${tool.name} 仅授权子工具${tools.length ? `：${tools.join(", ")}` : ""}；原生 MCP 无法安全过滤工具列表，已改由 CCM 代理执行`,
        );
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
      } catch (error: any) {
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
    } else if (runtime === "codex") {
      const runtimeHome = path.join(runtimeStorageRoot, "codex", authorizationId);
      const configPath = path.join(runtimeHome, "config.toml");
      const skillRoot = path.join(runtimeHome, "skills");
      fs.mkdirSync(runtimeHome, { recursive: true });
      if (codexGateway?.linkAuth) linkCodexAuth(runtimeHome, audit);
      else if (codexGateway) removeManagedCodexAuth(runtimeHome);
      else linkCodexAuth(runtimeHome, audit);
      audit.mcpConfigPath = configPath;
      audit.runtimeHomePath = runtimeHome;
      audit.isolatedHomePath = runtimeHome;
      audit.skillRoot = skillRoot;
      audit.configFormat = "codex-isolated-home-toml";
      audit.isolation = "strict";
      syncManagedSkills(skillRoot, selectedSkills, audit, skillPackagesDir);
      fs.writeFileSync(
        configPath,
        buildCodexConfigToml(
          mcpServers,
          codexGateway,
          (audit.skill_statuses || []).filter(item => item.state === "synced" && item.skillPath).map(item => String(item.skillPath)),
        ),
        "utf-8",
      );
      writeRuntimeSnapshot(runtimeHome, audit);
    } else if (runtime === "cursor") {
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
    } else if (runtime === "opencode") {
      const runtimeRoot = path.join(runtimeStorageRoot, "opencode", authorizationId);
      const configPath = path.join(runtimeRoot, "opencode.json");
      const skillRoot = path.join(runtimeRoot, "skills");
      const settings = readJsonObject(configPath);
      const existingServers = settings.mcp && typeof settings.mcp === "object" && !Array.isArray(settings.mcp) ? settings.mcp : {};
      settings.$schema = settings.$schema || "https://opencode.ai/config.json";
      settings.mcp = {
        ...Object.fromEntries(Object.entries(existingServers).filter(([name]) => !name.startsWith(CCM_MCP_PREFIX))),
        ...Object.fromEntries(Object.entries(mcpServers).map(([name, server]) => [name, toOpenCodeMcpServer(server)])),
      };
      writeJsonAtomic(configPath, settings);
      audit.mcpConfigPath = configPath;
      audit.runtimeHomePath = runtimeRoot;
      audit.skillRoot = skillRoot;
      audit.configFormat = "opencode-isolated-config";
      audit.isolation = "strict";
      syncManagedSkills(skillRoot, selectedSkills, audit, skillPackagesDir);
      writeRuntimeSnapshot(runtimeRoot, audit);
    } else {
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
      } else {
        audit.isolation = "project-scope";
        audit.warnings.push(`${runtime} CLI 没有严格 MCP 快照参数；CCM 已同步项目级配置，仍保留平台代理作为权限兜底`);
      }
      if (runtime === "qoder") {
        settings.permissions = settings.permissions && typeof settings.permissions === "object" ? settings.permissions : {};
        const existingAllow = Array.isArray(settings.permissions.allow)
          ? settings.permissions.allow.filter((item: any) => !String(item || "").startsWith("mcp__ccm__"))
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

    if (audit.errors.length) audit.mode = "failed";
  } catch (error: any) {
    audit.mode = "failed";
    audit.errors.push(error?.message || String(error));
  }
  audit.dispatch_gate = buildRuntimeToolDispatchGate(audit);
  return audit;
}

export function syncRuntimeTools(workDir: string, agentType: string, allowedTools: any, options: RuntimeToolSyncOptions = {}): RuntimeToolSyncAudit {
  return syncRuntimeToolsWithCatalog(workDir, agentType, allowedTools, {}, options);
}

function compactRuntimeResyncAudit(audit: any = {}) {
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

function runtimeAuditMatchesResyncFilter(audit: any, options: any = {}) {
  const runtime = String(options.runtime || "").trim();
  const projectName = String(options.projectName || options.project || "").trim();
  const groupId = String(options.groupId || options.group_id || "").trim();
  const snapshotIds = new Set(uniqueNames([
    ...((Array.isArray(options.snapshotIds) ? options.snapshotIds : [])),
    ...((Array.isArray(options.snapshot_ids) ? options.snapshot_ids : [])),
    options.snapshotId,
    options.snapshot_id,
  ]));
  if (runtime && normalizeAgentRuntimeId(audit?.runtime || "") !== normalizeAgentRuntimeId(runtime)) return false;
  if (projectName && String(audit?.projectName || "") !== projectName) return false;
  if (groupId && String(audit?.groupId || "") !== groupId) return false;
  if (snapshotIds.size > 0 && !snapshotIds.has(String(audit?.snapshotId || ""))) return false;
  return true;
}

function runtimeMissingScopeMatchesFilter(row: any, options: any = {}) {
  const scope = cleanRuntimeResyncText(options.scope || "", 40);
  const projectName = cleanRuntimeResyncText(options.projectName || options.project || "", 160);
  const groupId = cleanRuntimeResyncText(options.groupId || options.group_id || "", 160);
  if (scope && row.scope !== scope) return false;
  if (projectName && !(row.scope === "project" && row.id === projectName)) return false;
  if (groupId && !(row.scope === "group" && row.id === groupId)) return false;
  return true;
}

function normalizeRuntimeToolName(value: any) {
  return cleanRuntimeResyncText(value, 180).replace(/^ccm__/, "").toLowerCase();
}

function runtimeMissingScopeRequestsMarketplaceItem(row: any, options: any = {}) {
  const type = cleanRuntimeResyncText(options.type || options.toolType || "", 40).toLowerCase();
  const name = normalizeRuntimeToolName(options.name || options.toolName || "");
  if (!type || !name) return true;
  const tools = row?.tools || {};
  if (type === "mcp") {
    return uniqueNames(tools?.mcp).some(grant => normalizeRuntimeToolName(parseMcpGrant(grant).server) === name);
  }
  if (type === "skill") {
    return uniqueNames(tools?.skill).some(skill => normalizeRuntimeToolName(skill) === name);
  }
  return true;
}

function getProjectRuntimeConfig(projectName: string, options: any = {}) {
  const cleanProjectName = cleanRuntimeResyncText(projectName, 160);
  if (!cleanProjectName) return null;
  const runtimeTargets = Array.isArray(options.runtimeTargets) ? options.runtimeTargets : [];
  const explicitTarget = runtimeTargets.find((item: any) => cleanRuntimeResyncText(item?.projectName || item?.project || "", 160) === cleanProjectName);
  if (explicitTarget?.workDir) {
    return {
      projectName: cleanProjectName,
      workDir: String(explicitTarget.workDir || ""),
      agentType: String(explicitTarget.agentType || explicitTarget.agent || "claudecode"),
    };
  }
  for (const config of getConfigs()) {
    if (!config?.path || !fs.existsSync(config.path)) continue;
    const projects = getConfigInfo(config.path);
    const info = projects.find((item: any) => item.name === cleanProjectName)
      || (config.name === cleanProjectName ? projects[0] : null);
    if (!info?.workDir) continue;
    return {
      projectName: cleanProjectName,
      workDir: String(info.workDir || ""),
      agentType: String(info.agent || "claudecode"),
    };
  }
  return null;
}

function buildMissingRuntimeTargets(row: any, groups: any[], options: any = {}) {
  if (row.scope === "project") {
    const runtime = getProjectRuntimeConfig(row.id, options);
    return runtime ? [{ ...runtime, groupId: "" }] : [];
  }
  if (row.scope !== "group") return [];
  const group = groups.find((item: any) => String(item?.id || "") === String(row.id || ""));
  const members = Array.isArray(group?.members) ? group.members : [];
  return members
    .map((member: any) => {
      const projectName = cleanRuntimeResyncText(member?.project || member?.projectName || "", 160);
      if (!projectName || projectName === "coordinator") return null;
      const runtime = getProjectRuntimeConfig(projectName, options);
      return runtime ? { ...runtime, groupId: row.id, agentType: String(member?.agent || member?.agentType || runtime.agentType || "claudecode") } : null;
    })
    .filter(Boolean);
}

function runtimeWorkDirAvailable(workDir: string) {
  try {
    return !!workDir && fs.existsSync(workDir) && fs.statSync(workDir).isDirectory();
  } catch {
    return false;
  }
}

export function resyncMissingRuntimeToolSnapshots(options: any = {}): RuntimeMissingToolResyncResult {
  const limit = Math.max(1, Math.min(30, Number(options.missingLimit || options.limit || 20) || 20));
  const runtimeReadiness = Array.isArray(options.runtimeReadiness)
    ? options.runtimeReadiness
    : listRecentRuntimeToolAudits(120)
      .map(audit => probeRuntimeToolReadiness(audit, { record: false, catalog: options.catalog || {} }))
      .filter(readiness => !!readiness.projectName || !!readiness.groupId);
  const groups = Array.isArray(options.groups) ? options.groups : loadGroups();
  const projects = options.projects || loadProjectConfigs();
  const inventory = buildToolAuthorizationInventory({
    projects,
    groups,
    runtimeReadiness,
  });
  const configuredRows = (inventory.scopes || [])
    .filter((row: any) => Number(row.counts?.mcp || 0) + Number(row.counts?.skill || 0) > 0);
  const rows = configuredRows
    .filter((row: any) => Number(row.runtime?.summary?.total || 0) === 0)
    .filter((row: any) => runtimeMissingScopeMatchesFilter(row, options))
    .filter((row: any) => runtimeMissingScopeRequestsMarketplaceItem(row, options))
    .slice(0, limit);
  const items: any[] = [];
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
      const authorization = buildToolAuthorizationPayload(requested);
      const audit = syncRuntimeToolsWithCatalog(target.workDir, target.agentType, requested, options.catalog || {}, {
        authorizationReadiness: authorization.authorization_readiness,
      });
      (audit as any).projectName = target.projectName;
      (audit as any).groupId = target.groupId;
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

export function resyncRecentRuntimeToolSnapshots(options: any = {}): RuntimeToolResyncResult {
  const requestedLimit = Number(options.limit || 30);
  const limit = Math.max(1, Math.min(50, Number.isFinite(requestedLimit) ? requestedLimit : 30));
  const staleOnly = options.staleOnly !== false;
  const requestedSnapshotIds = Array.isArray(options.snapshotIds) ? options.snapshotIds.filter(Boolean) : [];
  const audits = Array.isArray(options.audits)
    ? options.audits
    : listRecentRuntimeToolAudits(requestedSnapshotIds.length ? 240 : Math.max(limit * 2, 30));
  const items: any[] = [];
  const seen = new Set<string>();
  let scanned = 0;
  let selected = 0;
  for (const audit of audits) {
    scanned += 1;
    const key = audit?.snapshotId
      ? `${audit.runtime || ""}:${audit.snapshotId}:${audit?.workDir || ""}:${audit?.projectName || ""}:${audit?.groupId || ""}`
      : `${audit?.runtime || ""}:${audit?.workDir || ""}:${JSON.stringify(audit?.requested || {})}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!runtimeAuditMatchesResyncFilter(audit, options)) continue;
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
    if (selected > limit) break;
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
    const authorizationPayload = buildToolAuthorizationPayload(requested);
    const nextAudit = syncRuntimeToolsWithCatalog(workDir, runtime, requested, options.catalog || {}, {
      authorizationReadiness: authorizationPayload.authorization_readiness,
    });
    (nextAudit as any).projectName = String(audit?.projectName || "");
    (nextAudit as any).groupId = String(audit?.groupId || "");
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

function formatSkillAliasNotice(audit: RuntimeToolSyncAudit) {
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

export function buildRuntimeToolSyncPrompt(audit: RuntimeToolSyncAudit) {
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

export function detectInvokedSkillsFromText(text: string, allowedTools: any = {}, skills: any[] = loadSkills()): RuntimeInvokedSkill[] {
  const allowed = new Set(uniqueNames(allowedTools?.skill));
  if (!allowed.size) return [];
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
      source: "receipt" as const,
    }));
}

export function recordRuntimeToolSyncAudit(audit: RuntimeToolSyncAudit, projectName = "", groupId = "") {
  try {
    const auditDir = path.join(CCM_DIR, "agent-runner");
    fs.mkdirSync(auditDir, { recursive: true });
    const auditFile = path.join(auditDir, "runtime-tool-sync.jsonl");
    if (fs.existsSync(auditFile) && fs.statSync(auditFile).size > 2 * 1024 * 1024) {
      const content = fs.readFileSync(auditFile, "utf-8");
      const tail = content.slice(-1024 * 1024);
      fs.writeFileSync(auditFile, tail.slice(Math.max(0, tail.indexOf("\n") + 1)), "utf-8");
    }
    fs.appendFileSync(auditFile, `${JSON.stringify({ ...audit, projectName, groupId })}\n`, "utf-8");
  } catch {
    // Runtime execution should not fail solely because audit persistence is unavailable.
  }
}
