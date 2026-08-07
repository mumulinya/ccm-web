import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../core/utils";
import { withFileLock, writeJsonAtomic } from "../core/atomic-json-file";
import { estimateTextTokens } from "./context-budget";
import { toolManager, type ToolScope } from "../tools/tool-manager";

export type MainAgentKind = "global" | "group" | "project";

export type MainAgentContinuityIdentityV1 = {
  agentKind: MainAgentKind;
  scope: MainAgentKind;
  scopeId: string;
  exactSessionId: string;
  generation: number;
};

export type InvokedSkillContinuityV1 = {
  schema: "ccm-invoked-skill-continuity-v1";
  name: string;
  contentHash: string;
  invocationEventId: string;
  sourceMessageId: string;
  invokedAt: string;
  bodyTokens: number;
};

export type LoadedMcpSchemaContinuityV1 = {
  schema: "ccm-loaded-mcp-schema-continuity-v1";
  canonicalName: string;
  server: string;
  schemaChecksum: string;
  loadSource: "tool_search" | "always_load";
  loadEventId: string;
  loadedAt: string;
  schemaTokens: number;
};

export type MainAgentPostCompactRestoreManifestV1 = {
  schema: "ccm-main-agent-post-compact-restore-manifest-v1";
  version: 1;
  identity: MainAgentContinuityIdentityV1;
  boundaryGeneration: number;
  catalogRevision: string;
  authorizationChecksum: string;
  invokedSkills: InvokedSkillContinuityV1[];
  loadedMcpSchemas: LoadedMcpSchemaContinuityV1[];
  createdAt: string;
  checksum: string;
};

export type PostCompactToolRestoreReceiptV1 = {
  schema: "ccm-post-compact-tool-restore-receipt-v1";
  version: 1;
  identity: MainAgentContinuityIdentityV1;
  manifestChecksum: string;
  status: "not_required" | "restored" | "partial" | "rejected";
  loadedToolNames: string[];
  restoredSkillNames: string[];
  dropped: Array<{ kind: "skill" | "mcp" | "manifest"; name: string; reason: string }>;
  restoredSkillTokens: number;
  restoredMcpSchemaTokens: number;
  catalogRevision: string;
  restoredAt: string;
  checksum: string;
};

type ContinuityEvidenceStoreV1 = {
  schema: "ccm-main-agent-dynamic-context-evidence-v1";
  identity: MainAgentContinuityIdentityV1;
  invokedSkills: InvokedSkillContinuityV1[];
  loadedMcpSchemas: LoadedMcpSchemaContinuityV1[];
  latestManifest: MainAgentPostCompactRestoreManifestV1 | null;
  updatedAt: string;
  checksum: string;
};

const CONTINUITY_DIR = path.join(CCM_DIR, "main-agent-context-continuity");
const DEFAULT_PER_SKILL_TOKENS = 5_000;
const DEFAULT_TOTAL_SKILL_TOKENS = 10_000;
const DEFAULT_TOTAL_MCP_SCHEMA_TOKENS = 20_000;

function stableChecksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

function normalizedIdentity(value: any): MainAgentContinuityIdentityV1 {
  const agentKind = String(value?.agentKind || value?.agent_kind || value?.scope || "") as MainAgentKind;
  if (!(["global", "group", "project"] as string[]).includes(agentKind)) throw new Error("main_agent_continuity_scope_invalid");
  const scopeId = String(value?.scopeId || value?.scope_id || "").trim();
  const exactSessionId = String(value?.exactSessionId || value?.exact_session_id || "").trim();
  if (!scopeId || !exactSessionId) throw new Error("main_agent_continuity_exact_session_required");
  return {
    agentKind,
    scope: agentKind,
    scopeId,
    exactSessionId,
    generation: Math.max(0, Math.floor(Number(value?.generation || 0))),
  };
}

function identityMatches(left: MainAgentContinuityIdentityV1, right: MainAgentContinuityIdentityV1, checkGeneration = true) {
  return left.agentKind === right.agentKind
    && left.scope === right.scope
    && left.scopeId === right.scopeId
    && left.exactSessionId === right.exactSessionId
    && (!checkGeneration || left.generation === right.generation);
}

function evidenceFile(identityInput: MainAgentContinuityIdentityV1) {
  const identity = normalizedIdentity(identityInput);
  const digest = stableChecksum([identity.agentKind, identity.scopeId, identity.exactSessionId]).slice(0, 40);
  return path.join(CONTINUITY_DIR, `${identity.agentKind}-${digest}.json`);
}

function emptyStore(identity: MainAgentContinuityIdentityV1): ContinuityEvidenceStoreV1 {
  const core = {
    schema: "ccm-main-agent-dynamic-context-evidence-v1" as const,
    identity,
    invokedSkills: [],
    loadedMcpSchemas: [],
    latestManifest: null,
    updatedAt: "",
  };
  return { ...core, checksum: stableChecksum(core) };
}

function normalizeStore(value: any, expected: MainAgentContinuityIdentityV1) {
  const source = value && typeof value === "object" ? value : {};
  const identity = normalizedIdentity(source.identity || expected);
  if (!identityMatches(identity, expected, false)) return emptyStore(expected);
  const invokedSkills = (Array.isArray(source.invokedSkills) ? source.invokedSkills : [])
    .filter((row: any) => row?.name && row?.contentHash)
    .map((row: any) => ({
      schema: "ccm-invoked-skill-continuity-v1" as const,
      name: String(row.name),
      contentHash: String(row.contentHash),
      invocationEventId: String(row.invocationEventId || ""),
      sourceMessageId: String(row.sourceMessageId || ""),
      invokedAt: String(row.invokedAt || ""),
      bodyTokens: Math.max(0, Number(row.bodyTokens || 0)),
    })).slice(-200);
  const loadedMcpSchemas = (Array.isArray(source.loadedMcpSchemas) ? source.loadedMcpSchemas : [])
    .filter((row: any) => row?.canonicalName && row?.schemaChecksum)
    .map((row: any) => ({
      schema: "ccm-loaded-mcp-schema-continuity-v1" as const,
      canonicalName: String(row.canonicalName),
      server: String(row.server || ""),
      schemaChecksum: String(row.schemaChecksum),
      loadSource: row.loadSource === "always_load" ? "always_load" as const : "tool_search" as const,
      loadEventId: String(row.loadEventId || ""),
      loadedAt: String(row.loadedAt || ""),
      schemaTokens: Math.max(0, Number(row.schemaTokens || 0)),
    })).slice(-400);
  return {
    schema: "ccm-main-agent-dynamic-context-evidence-v1" as const,
    identity,
    invokedSkills,
    loadedMcpSchemas,
    latestManifest: source.latestManifest?.schema === "ccm-main-agent-post-compact-restore-manifest-v1" ? source.latestManifest : null,
    updatedAt: String(source.updatedAt || ""),
    checksum: String(source.checksum || ""),
  };
}

function readStore(identityInput: MainAgentContinuityIdentityV1) {
  const identity = normalizedIdentity(identityInput);
  const file = evidenceFile(identity);
  for (const candidate of [file, `${file}.bak`]) {
    try {
      if (!fs.existsSync(candidate)) continue;
      return normalizeStore(JSON.parse(fs.readFileSync(candidate, "utf-8")), identity);
    } catch {}
  }
  return emptyStore(identity);
}

export function resolveMainAgentContinuityIdentity(identityInput: MainAgentContinuityIdentityV1) {
  const identity = normalizedIdentity(identityInput);
  const latest = readStore(identity).latestManifest;
  if (!latest) return identity;
  const validation = validateMainAgentPostCompactRestoreManifest(latest, {
    agentKind: identity.agentKind,
    scopeId: identity.scopeId,
    exactSessionId: identity.exactSessionId,
  });
  if (!validation.valid) return identity;
  return { ...identity, generation: latest.identity.generation };
}

function commitStore(store: ContinuityEvidenceStoreV1) {
  const core = { ...store, updatedAt: new Date().toISOString(), checksum: "" };
  const next = { ...core, checksum: stableChecksum({ ...core, checksum: undefined }) };
  writeJsonAtomic(evidenceFile(store.identity), next);
  return next;
}

function mutateStore(identityInput: MainAgentContinuityIdentityV1, operation: (store: ContinuityEvidenceStoreV1) => void) {
  const identity = normalizedIdentity(identityInput);
  const file = evidenceFile(identity);
  return withFileLock(file, () => {
    const store = readStore(identity);
    store.identity = identity;
    operation(store);
    return commitStore(store);
  });
}

function toolSchemaChecksum(tool: any) {
  return stableChecksum({
    canonicalName: tool?.canonicalName || tool?.name || "",
    server: tool?.server || tool?.serverName || "",
    inputSchema: tool?.inputSchema || null,
    annotations: tool?.annotations || {},
  });
}

function catalogRevision(scope: ToolScope) {
  const catalog = toolManager.getScopedToolCatalog(scope);
  return stableChecksum({
    tools: catalog.tools.map((tool: any) => ({ name: tool.canonicalName, checksum: toolSchemaChecksum(tool), alwaysLoad: tool.alwaysLoad === true })),
    skills: catalog.skills.map((skill: any) => ({ name: skill.name, contentHash: skill.contentHash })),
  });
}

function authorizationChecksum(scope: ToolScope) {
  return stableChecksum({
    mcp: [...new Set((scope.mcp || []).map(String))].sort(),
    skill: [...new Set((scope.skill || []).map(String))].sort(),
  });
}

export function recordMainAgentInvokedSkill(input: {
  identity: MainAgentContinuityIdentityV1;
  name: string;
  contentHash: string;
  prompt?: string;
  invocationEventId?: string;
  sourceMessageId?: string;
  invokedAt?: string;
}) {
  const identity = normalizedIdentity(input.identity);
  const name = String(input.name || "").trim();
  const contentHash = String(input.contentHash || "").trim();
  if (!name || !contentHash) throw new Error("main_agent_skill_invocation_evidence_invalid");
  const row: InvokedSkillContinuityV1 = {
    schema: "ccm-invoked-skill-continuity-v1",
    name,
    contentHash,
    invocationEventId: String(input.invocationEventId || `skill:${stableChecksum([name, contentHash, input.invokedAt || Date.now()]).slice(0, 20)}`),
    sourceMessageId: String(input.sourceMessageId || ""),
    invokedAt: String(input.invokedAt || new Date().toISOString()),
    bodyTokens: estimateTextTokens(String(input.prompt || "")),
  };
  return mutateStore(identity, store => {
    store.invokedSkills = [...store.invokedSkills.filter(item => item.name !== name), row]
      .sort((a, b) => a.invokedAt.localeCompare(b.invokedAt)).slice(-200);
  });
}

export function recordMainAgentLoadedMcpSchemas(input: {
  identity: MainAgentContinuityIdentityV1;
  tools: any[];
  loadSource?: "tool_search" | "always_load";
  loadEventId?: string;
  loadedAt?: string;
}) {
  const identity = normalizedIdentity(input.identity);
  const loadedAt = String(input.loadedAt || new Date().toISOString());
  const rows = (Array.isArray(input.tools) ? input.tools : []).map((tool: any) => ({
    schema: "ccm-loaded-mcp-schema-continuity-v1" as const,
    canonicalName: String(tool?.canonicalName || tool?.name || ""),
    server: String(tool?.server || tool?.serverName || ""),
    schemaChecksum: toolSchemaChecksum(tool),
    loadSource: input.loadSource === "always_load" ? "always_load" as const : "tool_search" as const,
    loadEventId: String(input.loadEventId || `mcp-load:${stableChecksum([tool?.canonicalName || tool?.name, loadedAt]).slice(0, 20)}`),
    loadedAt,
    schemaTokens: estimateTextTokens(JSON.stringify({ description: tool?.description || "", inputSchema: tool?.inputSchema || null })),
  })).filter(row => row.canonicalName && row.schemaChecksum);
  if (!rows.length) return readStore(identity);
  return mutateStore(identity, store => {
    const names = new Set(rows.map(row => row.canonicalName));
    store.loadedMcpSchemas = [...store.loadedMcpSchemas.filter(item => !names.has(item.canonicalName)), ...rows]
      .sort((a, b) => a.loadedAt.localeCompare(b.loadedAt)).slice(-400);
  });
}

export function recordMainAgentToolContinuityFromResult(input: {
  identity?: MainAgentContinuityIdentityV1 | null;
  requestName: string;
  requestArguments?: any;
  rawOutput?: any;
  loadedTools?: any[];
  eventId?: string;
  sourceMessageId?: string;
}) {
  if (!input.identity) return null;
  const identity = normalizedIdentity(input.identity);
  if (input.requestName === "tool_search") {
    return recordMainAgentLoadedMcpSchemas({ identity, tools: input.loadedTools || [], loadSource: "tool_search", loadEventId: input.eventId });
  }
  if (input.requestName !== "invoke_skill") return null;
  let value = input.rawOutput;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { value = {}; }
  }
  const result = value?.result && typeof value.result === "object" ? value.result : value;
  if (result?.ok !== true || !result?.name || !result?.contentHash) return null;
  return recordMainAgentInvokedSkill({
    identity,
    name: result.name,
    contentHash: result.contentHash,
    prompt: result.prompt,
    invocationEventId: input.eventId,
    sourceMessageId: input.sourceMessageId,
    invokedAt: result.invokedAt,
  });
}

function manifestCore(input: {
  identity: MainAgentContinuityIdentityV1;
  boundaryGeneration: number;
  scope: ToolScope;
  store: ContinuityEvidenceStoreV1;
}) {
  const identity = normalizedIdentity(input.identity);
  const catalog = toolManager.getScopedToolCatalog(input.scope);
  const currentSkills = new Map(catalog.skills.map((skill: any) => [String(skill.name), String(skill.contentHash || "")]));
  const currentTools = new Map(catalog.tools.map((tool: any) => [String(tool.canonicalName || tool.name), toolSchemaChecksum(tool)]));
  const alwaysLoaded = catalog.tools.filter((tool: any) => tool.alwaysLoad === true).map((tool: any) => ({
    schema: "ccm-loaded-mcp-schema-continuity-v1" as const,
    canonicalName: String(tool.canonicalName || tool.name),
    server: String(tool.server || ""),
    schemaChecksum: toolSchemaChecksum(tool),
    loadSource: "always_load" as const,
    loadEventId: `always-load:${String(tool.canonicalName || tool.name)}`,
    loadedAt: new Date().toISOString(),
    schemaTokens: estimateTextTokens(JSON.stringify({ description: tool.description || "", inputSchema: tool.inputSchema || null })),
  }));
  const alwaysNames = new Set(alwaysLoaded.map(item => item.canonicalName));
  return {
    schema: "ccm-main-agent-post-compact-restore-manifest-v1" as const,
    version: 1 as const,
    identity,
    boundaryGeneration: Math.max(0, Math.floor(Number(input.boundaryGeneration || 0))),
    catalogRevision: catalogRevision(input.scope),
    authorizationChecksum: authorizationChecksum(input.scope),
    invokedSkills: input.store.invokedSkills
      .filter(item => currentSkills.get(item.name) === item.contentHash)
      .slice().sort((a, b) => b.invokedAt.localeCompare(a.invokedAt)),
    loadedMcpSchemas: [
      ...input.store.loadedMcpSchemas.filter(item => !alwaysNames.has(item.canonicalName) && currentTools.get(item.canonicalName) === item.schemaChecksum),
      ...alwaysLoaded,
    ].sort((a, b) => b.loadedAt.localeCompare(a.loadedAt)),
    createdAt: new Date().toISOString(),
  };
}

export function buildMainAgentPostCompactRestoreManifest(input: {
  identity: MainAgentContinuityIdentityV1;
  boundaryGeneration: number;
  scope: ToolScope;
}) {
  const identity = normalizedIdentity(input.identity);
  const core = manifestCore({ ...input, identity, store: readStore(identity) });
  return { ...core, checksum: stableChecksum(core) } satisfies MainAgentPostCompactRestoreManifestV1;
}

export function persistMainAgentPostCompactRestoreManifest(manifest: MainAgentPostCompactRestoreManifestV1) {
  const validation = validateMainAgentPostCompactRestoreManifest(manifest);
  if (!validation.valid) throw new Error(`main_agent_restore_manifest_invalid:${validation.issues.join(",")}`);
  return mutateStore(manifest.identity, store => { store.latestManifest = manifest; });
}

export function validateMainAgentPostCompactRestoreManifest(value: any, expected?: Partial<MainAgentContinuityIdentityV1> & { boundaryGeneration?: number }) {
  const issues: string[] = [];
  if (value?.schema !== "ccm-main-agent-post-compact-restore-manifest-v1" || Number(value?.version || 0) !== 1) issues.push("schema_invalid");
  let identity: MainAgentContinuityIdentityV1 | null = null;
  try { identity = normalizedIdentity(value?.identity); } catch { issues.push("identity_invalid"); }
  if (identity && expected) {
    if (expected.agentKind && identity.agentKind !== expected.agentKind) issues.push("agent_kind_mismatch");
    if (expected.scopeId && identity.scopeId !== expected.scopeId) issues.push("scope_id_mismatch");
    if (expected.exactSessionId && identity.exactSessionId !== expected.exactSessionId) issues.push("exact_session_mismatch");
    if (expected.generation !== undefined && identity.generation !== Number(expected.generation)) issues.push("generation_mismatch");
    if (expected.boundaryGeneration !== undefined && Number(value?.boundaryGeneration || 0) !== Number(expected.boundaryGeneration)) issues.push("boundary_generation_mismatch");
  }
  const { checksum, ...core } = value && typeof value === "object" ? value : {};
  if (!checksum || String(checksum) !== stableChecksum(core)) issues.push("checksum_invalid");
  return { valid: issues.length === 0, issues, identity };
}

export function restoreMainAgentPostCompactContext(input: {
  identity: MainAgentContinuityIdentityV1;
  scope: ToolScope;
  manifest?: MainAgentPostCompactRestoreManifestV1 | null;
  maxPerSkillTokens?: number;
  maxTotalSkillTokens?: number;
  maxTotalMcpSchemaTokens?: number;
}) {
  const identity = normalizedIdentity(input.identity);
  const manifest = input.manifest || readStore(identity).latestManifest;
  const dropped: PostCompactToolRestoreReceiptV1["dropped"] = [];
  const currentCatalogRevision = catalogRevision(input.scope);
  const currentAuthorizationChecksum = authorizationChecksum(input.scope);
  if (!manifest) return buildRestoreResult(identity, null, currentCatalogRevision, [], [], dropped, 0, 0, "not_required");
  const validation = validateMainAgentPostCompactRestoreManifest(manifest, identity);
  if (!validation.valid) {
    dropped.push({ kind: "manifest", name: "post_compact_restore", reason: validation.issues.join(",") });
    return buildRestoreResult(identity, manifest, currentCatalogRevision, [], [], dropped, 0, 0, "rejected");
  }
  const catalog = toolManager.getScopedToolCatalog(input.scope);
  const skillsByName = new Map(catalog.skills.map((skill: any) => [String(skill.name), skill]));
  const toolsByName = new Map(catalog.tools.map((tool: any) => [String(tool.canonicalName || tool.name), tool]));
  const maxPerSkill = Math.max(1, Number(input.maxPerSkillTokens || DEFAULT_PER_SKILL_TOKENS));
  const maxSkills = Math.max(maxPerSkill, Number(input.maxTotalSkillTokens || DEFAULT_TOTAL_SKILL_TOKENS));
  const maxMcp = Math.max(1, Number(input.maxTotalMcpSchemaTokens || DEFAULT_TOTAL_MCP_SCHEMA_TOKENS));
  const skillAttachments: any[] = [];
  let skillTokens = 0;
  for (const evidence of manifest.invokedSkills || []) {
    const skill: any = skillsByName.get(evidence.name);
    if (!skill) { dropped.push({ kind: "skill", name: evidence.name, reason: "skill_unavailable_or_unauthorized" }); continue; }
    if (String(skill.contentHash || "") !== String(evidence.contentHash || "")) { dropped.push({ kind: "skill", name: evidence.name, reason: "skill_content_changed" }); continue; }
    const current = toolManager.getSkillContinuitySnapshot(evidence.name, input.scope);
    if (!current?.ok) { dropped.push({ kind: "skill", name: evidence.name, reason: current?.error || "skill_body_unavailable" }); continue; }
    const tokens = estimateTextTokens(String(current.prompt || ""));
    if (tokens > maxPerSkill) { dropped.push({ kind: "skill", name: evidence.name, reason: "per_skill_token_budget_exceeded" }); continue; }
    if (skillTokens + tokens > maxSkills) { dropped.push({ kind: "skill", name: evidence.name, reason: "aggregate_skill_token_budget_exceeded" }); continue; }
    skillTokens += tokens;
    skillAttachments.push({
      schema: "ccm-post-compact-invoked-skill-attachment-v1",
      name: evidence.name,
      body: current.prompt,
      contentHash: current.contentHash,
      invokedAt: evidence.invokedAt,
      invocationEventId: evidence.invocationEventId,
      sourceMessageId: evidence.sourceMessageId,
      tokenCount: tokens,
      loadSource: "post_compact_restored",
    });
  }
  const loadedToolNames: string[] = [];
  let mcpTokens = 0;
  for (const evidence of manifest.loadedMcpSchemas || []) {
    const tool: any = toolsByName.get(evidence.canonicalName);
    if (!tool) { dropped.push({ kind: "mcp", name: evidence.canonicalName, reason: "mcp_unavailable_or_unauthorized" }); continue; }
    if (toolSchemaChecksum(tool) !== evidence.schemaChecksum) { dropped.push({ kind: "mcp", name: evidence.canonicalName, reason: "mcp_schema_changed" }); continue; }
    if (evidence.loadSource === "always_load") continue;
    const tokens = estimateTextTokens(JSON.stringify({ description: tool.description || "", inputSchema: tool.inputSchema || null }));
    if (mcpTokens + tokens > maxMcp) { dropped.push({ kind: "mcp", name: evidence.canonicalName, reason: "aggregate_mcp_schema_token_budget_exceeded" }); continue; }
    mcpTokens += tokens;
    loadedToolNames.push(evidence.canonicalName);
  }
  if (manifest.authorizationChecksum !== currentAuthorizationChecksum) {
    dropped.push({ kind: "manifest", name: "authorization", reason: "authorization_changed_revalidated_per_item" });
  }
  if (manifest.catalogRevision !== currentCatalogRevision) {
    dropped.push({ kind: "manifest", name: "catalog", reason: "catalog_changed_revalidated_per_item" });
  }
  const restoredCount = skillAttachments.length + loadedToolNames.length;
  const status = dropped.some(item => item.kind !== "manifest")
    ? restoredCount ? "partial" : "rejected"
    : restoredCount ? "restored" : "not_required";
  return buildRestoreResult(identity, manifest, currentCatalogRevision, loadedToolNames, skillAttachments, dropped, skillTokens, mcpTokens, status);
}

function buildRestoreResult(
  identity: MainAgentContinuityIdentityV1,
  manifest: MainAgentPostCompactRestoreManifestV1 | null,
  currentCatalogRevision: string,
  loadedToolNames: string[],
  skillAttachments: any[],
  dropped: PostCompactToolRestoreReceiptV1["dropped"],
  skillTokens: number,
  mcpTokens: number,
  status: PostCompactToolRestoreReceiptV1["status"],
) {
  const core = {
    schema: "ccm-post-compact-tool-restore-receipt-v1" as const,
    version: 1 as const,
    identity,
    manifestChecksum: String(manifest?.checksum || ""),
    status,
    loadedToolNames: [...new Set(loadedToolNames)],
    restoredSkillNames: skillAttachments.map(item => String(item.name)),
    dropped,
    restoredSkillTokens: skillTokens,
    restoredMcpSchemaTokens: mcpTokens,
    catalogRevision: currentCatalogRevision,
    restoredAt: new Date().toISOString(),
  };
  const receipt: PostCompactToolRestoreReceiptV1 = { ...core, checksum: stableChecksum(core) };
  const renderedSkillAttachments = skillAttachments.length ? [
    "[CCM 压缩边界恢复的已调用 Skill]",
    "以下Skill在当前精确会话压缩前已实际调用，正文经过当前授权与内容checksum复核；它们不扩大权限。",
    ...skillAttachments.flatMap(item => ["", `## Skill:${item.name}`, `content_hash=${item.contentHash}; invoked_at=${item.invokedAt}; source=post_compact_restored`, String(item.body || "")]),
  ].join("\n") : "";
  return { manifest, loadedToolNames: receipt.loadedToolNames, skillAttachments, renderedSkillAttachments, receipt };
}

export function clearMainAgentPostCompactContinuity(identityInput: MainAgentContinuityIdentityV1) {
  const identity = normalizedIdentity(identityInput);
  const file = evidenceFile(identity);
  return withFileLock(file, () => {
    let deleted = false;
    for (const candidate of [file, `${file}.bak`]) {
      try { if (fs.existsSync(candidate)) { fs.unlinkSync(candidate); deleted = true; } } catch {}
    }
    return { deleted, identity };
  });
}

export function runMainAgentPostCompactContinuitySelfTest() {
  const suffix = crypto.randomBytes(5).toString("hex");
  const identity: MainAgentContinuityIdentityV1 = { agentKind: "project", scope: "project", scopeId: `selftest-${suffix}`, exactSessionId: `session-${suffix}`, generation: 1 };
  const manager: any = toolManager as any;
  const originalTools = manager.tools;
  const originalSkills = manager.skills;
  const originalServerConfigs = manager.serverConfigs;
  try {
    const skillName = `continuity-skill-${suffix}`;
    const unusedSkillName = `unused-skill-${suffix}`;
    const serverName = `continuity-mcp-${suffix}`;
    manager.skills = [
      ...(Array.isArray(originalSkills) ? originalSkills : []),
      { name: skillName, description: "continuity", prompt: "Use the restored continuity instructions.", enabled: true, contentHash: `skill-hash-${suffix}` },
      { name: unusedSkillName, description: "unused", prompt: "Never restored.", enabled: true, contentHash: `unused-hash-${suffix}` },
    ];
    manager.tools = [
      ...(Array.isArray(originalTools) ? originalTools : []),
      { name: "search", description: "read only search", serverName, inputSchema: { type: "object", properties: { query: { type: "string" } } }, annotations: { readOnlyHint: true } },
    ];
    manager.serverConfigs = new Map(originalServerConfigs || []);
    manager.serverConfigs.set(serverName, { name: serverName, enabled: true, trusted_readonly: true });
    const scope: ToolScope = { mcp: [serverName], skill: [skillName, unusedSkillName] };
    const catalog = toolManager.getScopedToolCatalog(scope);
    const skill: any = toolManager.getSkillContinuitySnapshot(skillName, scope);
    recordMainAgentInvokedSkill({ identity: { ...identity, generation: 0 }, name: skillName, contentHash: String(skill.contentHash), prompt: String(skill.prompt), invocationEventId: `event-${suffix}` });
    recordMainAgentLoadedMcpSchemas({ identity: { ...identity, generation: 0 }, tools: catalog.tools, loadSource: "tool_search", loadEventId: `load-${suffix}` });
    const manifest = buildMainAgentPostCompactRestoreManifest({ identity, boundaryGeneration: 1, scope });
    persistMainAgentPostCompactRestoreManifest(manifest);
    const restored = restoreMainAgentPostCompactContext({ identity, scope, manifest });
    const isolated = restoreMainAgentPostCompactContext({ identity: { ...identity, exactSessionId: `${identity.exactSessionId}-other` }, scope, manifest });
    const budgeted = restoreMainAgentPostCompactContext({ identity, scope, manifest, maxPerSkillTokens: 1, maxTotalSkillTokens: 1, maxTotalMcpSchemaTokens: 1 });
    const skillRow = manager.skills.find((item: any) => item.name === skillName);
    skillRow.contentHash = `changed-${suffix}`;
    const changedSkill = restoreMainAgentPostCompactContext({ identity, scope, manifest });
    skillRow.contentHash = `skill-hash-${suffix}`;
    const toolRow = manager.tools.find((item: any) => item.serverName === serverName && item.name === "search");
    toolRow.inputSchema = { type: "object", properties: { changed: { type: "boolean" } } };
    const changedSchema = restoreMainAgentPostCompactContext({ identity, scope, manifest });
    toolRow.inputSchema = { type: "object", properties: { query: { type: "string" } } };
    // 权限维度：压缩后必须按"当前"授权重新加载，而不是照搬压缩前的清单。
    // 用一个收窄到空授权的 scope 复现"权限被撤销"，此时清单里的 skill 与
    // MCP 都必须被拒绝恢复——否则旧清单会成为绕过撤销的越权路径。
    const revokedScope: ToolScope = { mcp: [], skill: [] };
    const revoked = restoreMainAgentPostCompactContext({ identity, scope: revokedScope, manifest });
    clearMainAgentPostCompactContinuity(identity);
    return {
      pass: validateMainAgentPostCompactRestoreManifest(manifest, { ...identity, boundaryGeneration: 1 }).valid
        && restored.receipt.status === "restored"
        && restored.receipt.restoredSkillNames.includes(skillName)
        && restored.receipt.loadedToolNames.length === 1
        && !manifest.invokedSkills.some(item => item.name === unusedSkillName)
        && isolated.receipt.status === "rejected"
        && budgeted.receipt.dropped.some(item => item.reason.includes("token_budget"))
        && changedSkill.receipt.dropped.some(item => item.reason === "skill_content_changed")
        && changedSchema.receipt.dropped.some(item => item.reason === "mcp_schema_changed")
        // 撤销授权后，旧清单里的 skill 与 MCP 都不得复活
        && !revoked.receipt.restoredSkillNames.includes(skillName)
        && revoked.receipt.loadedToolNames.length === 0
        && revoked.receipt.dropped.some(item => item.reason === "skill_unavailable_or_unauthorized")
        && revoked.receipt.dropped.some(item => item.reason === "mcp_unavailable_or_unauthorized"),
      manifest,
      restored: restored.receipt,
      isolated: isolated.receipt,
      budgeted: budgeted.receipt,
      changedSkill: changedSkill.receipt,
      changedSchema: changedSchema.receipt,
      revoked: revoked.receipt,
    };
  } finally {
    manager.tools = originalTools;
    manager.skills = originalSkills;
    manager.serverConfigs = originalServerConfigs;
    try { clearMainAgentPostCompactContinuity(identity); } catch {}
  }
}
