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
exports.resolveMainAgentContinuityIdentity = resolveMainAgentContinuityIdentity;
exports.recordMainAgentInvokedSkill = recordMainAgentInvokedSkill;
exports.recordMainAgentLoadedMcpSchemas = recordMainAgentLoadedMcpSchemas;
exports.recordMainAgentToolContinuityFromResult = recordMainAgentToolContinuityFromResult;
exports.buildMainAgentPostCompactRestoreManifest = buildMainAgentPostCompactRestoreManifest;
exports.persistMainAgentPostCompactRestoreManifest = persistMainAgentPostCompactRestoreManifest;
exports.validateMainAgentPostCompactRestoreManifest = validateMainAgentPostCompactRestoreManifest;
exports.restoreMainAgentPostCompactContext = restoreMainAgentPostCompactContext;
exports.clearMainAgentPostCompactContinuity = clearMainAgentPostCompactContinuity;
exports.runMainAgentPostCompactContinuitySelfTest = runMainAgentPostCompactContinuitySelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const atomic_json_file_1 = require("../core/atomic-json-file");
const context_budget_1 = require("./context-budget");
const tool_manager_1 = require("../tools/tool-manager");
const main_agent_context_source_continuity_1 = require("./main-agent-context-source-continuity");
const CONTINUITY_DIR = path.join(utils_1.CCM_DIR, "main-agent-context-continuity");
const DEFAULT_PER_SKILL_TOKENS = 5_000;
const DEFAULT_TOTAL_SKILL_TOKENS = 25_000;
const DEFAULT_TOTAL_MCP_SCHEMA_TOKENS = 20_000;
function stableChecksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function truncateSkillBodyPreservingEdges(bodyInput, maxTokensInput) {
    const body = String(bodyInput || "");
    const maxTokens = Math.max(1, Math.floor(Number(maxTokensInput || 0)));
    const originalTokens = (0, context_budget_1.estimateTextTokens)(body);
    if (originalTokens <= maxTokens)
        return { body, originalTokens, tokenCount: originalTokens, truncated: false };
    const marker = "\n\n[Skill content truncated by CCM post-compact restore budget]\n\n";
    let low = 0;
    let high = body.length;
    let selected = marker.trim();
    while (low <= high) {
        const keep = Math.floor((low + high) / 2);
        const headLength = Math.ceil(keep * 0.7);
        const tailLength = Math.max(0, keep - headLength);
        const candidate = `${body.slice(0, headLength).trimEnd()}${marker}${tailLength ? body.slice(-tailLength).trimStart() : ""}`.trim();
        if ((0, context_budget_1.estimateTextTokens)(candidate) <= maxTokens) {
            selected = candidate;
            low = keep + 1;
        }
        else
            high = keep - 1;
    }
    return { body: selected, originalTokens, tokenCount: (0, context_budget_1.estimateTextTokens)(selected), truncated: true };
}
function normalizedIdentity(value) {
    const agentKind = String(value?.agentKind || value?.agent_kind || value?.scope || "");
    if (!["global", "group", "project"].includes(agentKind))
        throw new Error("main_agent_continuity_scope_invalid");
    const scopeId = String(value?.scopeId || value?.scope_id || "").trim();
    const exactSessionId = String(value?.exactSessionId || value?.exact_session_id || "").trim();
    if (!scopeId || !exactSessionId)
        throw new Error("main_agent_continuity_exact_session_required");
    return {
        agentKind,
        scope: agentKind,
        scopeId,
        exactSessionId,
        generation: Math.max(0, Math.floor(Number(value?.generation || 0))),
    };
}
function identityMatches(left, right, checkGeneration = true) {
    return left.agentKind === right.agentKind
        && left.scope === right.scope
        && left.scopeId === right.scopeId
        && left.exactSessionId === right.exactSessionId
        && (!checkGeneration || left.generation === right.generation);
}
function evidenceFile(identityInput) {
    const identity = normalizedIdentity(identityInput);
    const digest = stableChecksum([identity.agentKind, identity.scopeId, identity.exactSessionId]).slice(0, 40);
    return path.join(CONTINUITY_DIR, `${identity.agentKind}-${digest}.json`);
}
function emptyStore(identity) {
    const core = {
        schema: "ccm-main-agent-dynamic-context-evidence-v2",
        version: 2,
        identity,
        invokedSkills: [],
        loadedMcpSchemas: [],
        latestManifest: null,
        updatedAt: "",
        contentStored: false,
    };
    return { ...core, checksum: stableChecksum(core) };
}
function normalizeStore(value, expected) {
    const source = value && typeof value === "object" ? value : {};
    const identity = normalizedIdentity(source.identity || expected);
    if (!identityMatches(identity, expected, false))
        return emptyStore(expected);
    const invokedSkills = (Array.isArray(source.invokedSkills) ? source.invokedSkills : [])
        .filter((row) => row?.name && row?.contentHash)
        .map((row) => ({
        schema: "ccm-invoked-skill-continuity-v1",
        name: String(row.name),
        contentHash: String(row.contentHash),
        invocationEventId: String(row.invocationEventId || ""),
        sourceMessageId: String(row.sourceMessageId || ""),
        invokedAt: String(row.invokedAt || ""),
        bodyTokens: Math.max(0, Number(row.bodyTokens || 0)),
    })).slice(-200);
    const loadedMcpSchemas = (Array.isArray(source.loadedMcpSchemas) ? source.loadedMcpSchemas : [])
        .filter((row) => row?.canonicalName && row?.schemaChecksum)
        .map((row) => ({
        schema: "ccm-loaded-mcp-schema-continuity-v1",
        canonicalName: String(row.canonicalName),
        server: String(row.server || ""),
        schemaChecksum: String(row.schemaChecksum),
        loadSource: row.loadSource === "always_load" ? "always_load" : "tool_search",
        loadEventId: String(row.loadEventId || ""),
        loadedAt: String(row.loadedAt || ""),
        schemaTokens: Math.max(0, Number(row.schemaTokens || 0)),
    })).slice(-400);
    return {
        schema: "ccm-main-agent-dynamic-context-evidence-v2",
        version: 2,
        identity,
        invokedSkills,
        loadedMcpSchemas,
        latestManifest: ["ccm-main-agent-post-compact-restore-manifest-v1", "ccm-main-agent-post-compact-restore-manifest-v2", "ccm-main-agent-post-compact-restore-manifest-v3"].includes(String(source.latestManifest?.schema || "")) ? source.latestManifest : null,
        updatedAt: String(source.updatedAt || ""),
        contentStored: false,
        checksum: String(source.checksum || ""),
    };
}
function readStore(identityInput) {
    const identity = normalizedIdentity(identityInput);
    const file = evidenceFile(identity);
    for (const candidate of [file, `${file}.bak`]) {
        try {
            if (!fs.existsSync(candidate))
                continue;
            return normalizeStore(JSON.parse(fs.readFileSync(candidate, "utf-8")), identity);
        }
        catch { }
    }
    return emptyStore(identity);
}
function resolveMainAgentContinuityIdentity(identityInput) {
    const identity = normalizedIdentity(identityInput);
    const latest = readStore(identity).latestManifest;
    if (!latest)
        return identity;
    const validation = validateMainAgentPostCompactRestoreManifest(latest, {
        agentKind: identity.agentKind,
        scopeId: identity.scopeId,
        exactSessionId: identity.exactSessionId,
    });
    if (!validation.valid)
        return identity;
    return { ...identity, generation: latest.identity.generation };
}
function commitStore(store) {
    const core = { ...store, updatedAt: new Date().toISOString(), checksum: "" };
    const next = { ...core, checksum: stableChecksum({ ...core, checksum: undefined }) };
    (0, atomic_json_file_1.writeJsonAtomic)(evidenceFile(store.identity), next);
    return next;
}
function mutateStore(identityInput, operation) {
    const identity = normalizedIdentity(identityInput);
    const file = evidenceFile(identity);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const store = readStore(identity);
        store.identity = identity;
        operation(store);
        return commitStore(store);
    });
}
function toolSchemaChecksum(tool) {
    return stableChecksum({
        canonicalName: tool?.canonicalName || tool?.name || "",
        server: tool?.server || tool?.serverName || "",
        inputSchema: tool?.inputSchema || null,
        annotations: tool?.annotations || {},
    });
}
function catalogRevision(scope) {
    const catalog = tool_manager_1.toolManager.getScopedToolCatalog(scope);
    return stableChecksum({
        tools: catalog.tools.map((tool) => ({ name: tool.canonicalName, checksum: toolSchemaChecksum(tool), alwaysLoad: tool.alwaysLoad === true })),
        skills: catalog.skills.map((skill) => ({ name: skill.name, contentHash: skill.contentHash })),
    });
}
function authorizationChecksum(scope) {
    return stableChecksum({
        mcp: [...new Set((scope.mcp || []).map(String))].sort(),
        skill: [...new Set((scope.skill || []).map(String))].sort(),
    });
}
function recordMainAgentInvokedSkill(input) {
    const identity = normalizedIdentity(input.identity);
    const name = String(input.name || "").trim();
    const contentHash = String(input.contentHash || "").trim();
    if (!name || !contentHash)
        throw new Error("main_agent_skill_invocation_evidence_invalid");
    const row = {
        schema: "ccm-invoked-skill-continuity-v1",
        name,
        contentHash,
        invocationEventId: String(input.invocationEventId || `skill:${stableChecksum([name, contentHash, input.invokedAt || Date.now()]).slice(0, 20)}`),
        sourceMessageId: String(input.sourceMessageId || ""),
        invokedAt: String(input.invokedAt || new Date().toISOString()),
        bodyTokens: (0, context_budget_1.estimateTextTokens)(String(input.prompt || "")),
    };
    return mutateStore(identity, store => {
        store.invokedSkills = [...store.invokedSkills.filter(item => item.name !== name), row]
            .sort((a, b) => a.invokedAt.localeCompare(b.invokedAt)).slice(-200);
    });
}
function recordMainAgentLoadedMcpSchemas(input) {
    const identity = normalizedIdentity(input.identity);
    const loadedAt = String(input.loadedAt || new Date().toISOString());
    const rows = (Array.isArray(input.tools) ? input.tools : []).map((tool) => ({
        schema: "ccm-loaded-mcp-schema-continuity-v1",
        canonicalName: String(tool?.canonicalName || tool?.name || ""),
        server: String(tool?.server || tool?.serverName || ""),
        schemaChecksum: toolSchemaChecksum(tool),
        loadSource: input.loadSource === "always_load" ? "always_load" : "tool_search",
        loadEventId: String(input.loadEventId || `mcp-load:${stableChecksum([tool?.canonicalName || tool?.name, loadedAt]).slice(0, 20)}`),
        loadedAt,
        schemaTokens: (0, context_budget_1.estimateTextTokens)(JSON.stringify({ description: tool?.description || "", inputSchema: tool?.inputSchema || null })),
    })).filter(row => row.canonicalName && row.schemaChecksum);
    if (!rows.length)
        return readStore(identity);
    return mutateStore(identity, store => {
        const names = new Set(rows.map(row => row.canonicalName));
        store.loadedMcpSchemas = [...store.loadedMcpSchemas.filter(item => !names.has(item.canonicalName)), ...rows]
            .sort((a, b) => a.loadedAt.localeCompare(b.loadedAt)).slice(-400);
    });
}
function recordMainAgentToolContinuityFromResult(input) {
    if (!input.identity)
        return null;
    const identity = normalizedIdentity(input.identity);
    if (input.requestName === "tool_search") {
        return recordMainAgentLoadedMcpSchemas({ identity, tools: input.loadedTools || [], loadSource: "tool_search", loadEventId: input.eventId });
    }
    if (input.requestName !== "invoke_skill")
        return null;
    let value = input.rawOutput;
    if (typeof value === "string") {
        try {
            value = JSON.parse(value);
        }
        catch {
            value = {};
        }
    }
    const result = value?.result && typeof value.result === "object" ? value.result : value;
    if (result?.ok !== true || !result?.name || !result?.contentHash)
        return null;
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
function manifestCore(input) {
    const identity = normalizedIdentity(input.identity);
    const catalog = tool_manager_1.toolManager.getScopedToolCatalog(input.scope);
    const currentSkills = new Map(catalog.skills.map((skill) => [String(skill.name), String(skill.contentHash || "")]));
    const currentTools = new Map(catalog.tools.map((tool) => [String(tool.canonicalName || tool.name), toolSchemaChecksum(tool)]));
    const alwaysLoaded = catalog.tools.filter((tool) => tool.alwaysLoad === true).map((tool) => ({
        schema: "ccm-loaded-mcp-schema-continuity-v1",
        canonicalName: String(tool.canonicalName || tool.name),
        server: String(tool.server || ""),
        schemaChecksum: toolSchemaChecksum(tool),
        loadSource: "always_load",
        loadEventId: `always-load:${String(tool.canonicalName || tool.name)}`,
        loadedAt: new Date().toISOString(),
        schemaTokens: (0, context_budget_1.estimateTextTokens)(JSON.stringify({ description: tool.description || "", inputSchema: tool.inputSchema || null })),
    }));
    const alwaysNames = new Set(alwaysLoaded.map(item => item.canonicalName));
    return {
        schema: "ccm-main-agent-post-compact-restore-manifest-v3",
        version: 3,
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
        contextSourceManifest: (0, main_agent_context_source_continuity_1.buildContextSourceManifestReference)(identity),
        contentStored: false,
    };
}
function buildMainAgentPostCompactRestoreManifest(input) {
    const identity = normalizedIdentity(input.identity);
    const core = manifestCore({ ...input, identity, store: readStore(identity) });
    return { ...core, checksum: stableChecksum(core) };
}
function persistMainAgentPostCompactRestoreManifest(manifest) {
    const validation = validateMainAgentPostCompactRestoreManifest(manifest);
    if (!validation.valid)
        throw new Error(`main_agent_restore_manifest_invalid:${validation.issues.join(",")}`);
    return mutateStore(manifest.identity, store => { store.latestManifest = manifest; });
}
function validateMainAgentPostCompactRestoreManifest(value, expected) {
    const issues = [];
    const schemaVersionValid = (value?.schema === "ccm-main-agent-post-compact-restore-manifest-v1" && Number(value?.version || 0) === 1)
        || (value?.schema === "ccm-main-agent-post-compact-restore-manifest-v2" && Number(value?.version || 0) === 2 && value?.contentStored === false)
        || (value?.schema === "ccm-main-agent-post-compact-restore-manifest-v3" && Number(value?.version || 0) === 3 && value?.contentStored === false && value?.contextSourceManifest?.contentStored === false);
    if (!schemaVersionValid)
        issues.push("schema_invalid");
    let identity = null;
    try {
        identity = normalizedIdentity(value?.identity);
    }
    catch {
        issues.push("identity_invalid");
    }
    if (identity && expected) {
        if (expected.agentKind && identity.agentKind !== expected.agentKind)
            issues.push("agent_kind_mismatch");
        if (expected.scopeId && identity.scopeId !== expected.scopeId)
            issues.push("scope_id_mismatch");
        if (expected.exactSessionId && identity.exactSessionId !== expected.exactSessionId)
            issues.push("exact_session_mismatch");
        if (expected.generation !== undefined && identity.generation !== Number(expected.generation))
            issues.push("generation_mismatch");
        if (expected.boundaryGeneration !== undefined && Number(value?.boundaryGeneration || 0) !== Number(expected.boundaryGeneration))
            issues.push("boundary_generation_mismatch");
    }
    const { checksum, ...core } = value && typeof value === "object" ? value : {};
    if (!checksum || String(checksum) !== stableChecksum(core))
        issues.push("checksum_invalid");
    return { valid: issues.length === 0, issues, identity };
}
function restoreMainAgentPostCompactContext(input) {
    const identity = normalizedIdentity(input.identity);
    const manifest = input.manifest || readStore(identity).latestManifest;
    const dropped = [];
    const currentCatalogRevision = catalogRevision(input.scope);
    const currentAuthorizationChecksum = authorizationChecksum(input.scope);
    if (!manifest)
        return buildRestoreResult(identity, null, currentCatalogRevision, [], [], dropped, 0, 0, "not_required");
    const validation = validateMainAgentPostCompactRestoreManifest(manifest, identity);
    if (!validation.valid) {
        dropped.push({ kind: "manifest", name: "post_compact_restore", reason: validation.issues.join(",") });
        return buildRestoreResult(identity, manifest, currentCatalogRevision, [], [], dropped, 0, 0, "rejected");
    }
    const catalog = tool_manager_1.toolManager.getScopedToolCatalog(input.scope);
    const skillsByName = new Map(catalog.skills.map((skill) => [String(skill.name), skill]));
    const toolsByName = new Map(catalog.tools.map((tool) => [String(tool.canonicalName || tool.name), tool]));
    const maxPerSkill = Math.max(1, Number(input.maxPerSkillTokens ?? DEFAULT_PER_SKILL_TOKENS));
    const maxSkills = input.maxTotalSkillTokens === undefined
        ? DEFAULT_TOTAL_SKILL_TOKENS
        : Math.max(0, Number(input.maxTotalSkillTokens));
    const maxMcp = input.maxTotalMcpSchemaTokens === undefined
        ? DEFAULT_TOTAL_MCP_SCHEMA_TOKENS
        : Math.max(0, Number(input.maxTotalMcpSchemaTokens));
    const skillAttachments = [];
    let skillTokens = 0;
    for (const evidence of manifest.invokedSkills || []) {
        const skill = skillsByName.get(evidence.name);
        if (!skill) {
            dropped.push({ kind: "skill", name: evidence.name, reason: "skill_unavailable_or_unauthorized" });
            continue;
        }
        if (String(skill.contentHash || "") !== String(evidence.contentHash || "")) {
            dropped.push({ kind: "skill", name: evidence.name, reason: "skill_content_changed" });
            continue;
        }
        const current = tool_manager_1.toolManager.getSkillContinuitySnapshot(evidence.name, input.scope);
        if (!current?.ok) {
            dropped.push({ kind: "skill", name: evidence.name, reason: current?.error || "skill_body_unavailable" });
            continue;
        }
        const remainingTokens = Math.max(0, maxSkills - skillTokens);
        if (remainingTokens < 1) {
            dropped.push({ kind: "skill", name: evidence.name, reason: "aggregate_skill_token_budget_exceeded" });
            continue;
        }
        const projected = truncateSkillBodyPreservingEdges(current.prompt, Math.min(maxPerSkill, remainingTokens));
        if (!projected.body || projected.tokenCount > remainingTokens) {
            dropped.push({ kind: "skill", name: evidence.name, reason: "aggregate_skill_token_budget_exceeded" });
            continue;
        }
        skillTokens += projected.tokenCount;
        skillAttachments.push({
            schema: "ccm-post-compact-invoked-skill-attachment-v1",
            name: evidence.name,
            body: projected.body,
            contentHash: current.contentHash,
            invokedAt: evidence.invokedAt,
            invocationEventId: evidence.invocationEventId,
            sourceMessageId: evidence.sourceMessageId,
            tokenCount: projected.tokenCount,
            originalTokenCount: projected.originalTokens,
            truncated: projected.truncated,
            loadSource: "post_compact_restored",
        });
    }
    const loadedToolNames = [];
    let mcpTokens = 0;
    for (const evidence of manifest.loadedMcpSchemas || []) {
        const tool = toolsByName.get(evidence.canonicalName);
        if (!tool) {
            dropped.push({ kind: "mcp", name: evidence.canonicalName, reason: "mcp_unavailable_or_unauthorized" });
            continue;
        }
        if (toolSchemaChecksum(tool) !== evidence.schemaChecksum) {
            dropped.push({ kind: "mcp", name: evidence.canonicalName, reason: "mcp_schema_changed" });
            continue;
        }
        if (evidence.loadSource === "always_load")
            continue;
        const tokens = (0, context_budget_1.estimateTextTokens)(JSON.stringify({ description: tool.description || "", inputSchema: tool.inputSchema || null }));
        if (mcpTokens + tokens > maxMcp) {
            dropped.push({ kind: "mcp", name: evidence.canonicalName, reason: "aggregate_mcp_schema_token_budget_exceeded" });
            continue;
        }
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
function buildRestoreResult(identity, manifest, currentCatalogRevision, loadedToolNames, skillAttachments, dropped, skillTokens, mcpTokens, status) {
    const manifestMcp = new Map((manifest?.loadedMcpSchemas || []).map(item => [String(item.canonicalName), item]));
    const core = {
        schema: "ccm-post-compact-tool-restore-receipt-v2",
        version: 2,
        identity,
        manifestChecksum: String(manifest?.checksum || ""),
        status,
        loadedToolNames: [...new Set(loadedToolNames)],
        restoredSkillNames: skillAttachments.map(item => String(item.name)),
        restoredSkills: skillAttachments.map(item => ({
            name: String(item.name),
            contentHash: String(item.contentHash || ""),
            tokens: Math.max(0, Number(item.tokenCount || 0)),
            originalTokens: Math.max(0, Number(item.originalTokenCount || 0)),
            truncated: item.truncated === true,
            drift: "none",
        })),
        restoredMcpSchemas: [...new Set(loadedToolNames)].map(name => ({
            name,
            schemaChecksum: String(manifestMcp.get(name)?.schemaChecksum || ""),
            tokens: Math.max(0, Number(manifestMcp.get(name)?.schemaTokens || 0)),
            drift: "none",
        })),
        dropped,
        restoredSkillTokens: skillTokens,
        restoredMcpSchemaTokens: mcpTokens,
        catalogRevision: currentCatalogRevision,
        restoredAt: new Date().toISOString(),
        contentStored: false,
    };
    const receipt = { ...core, checksum: stableChecksum(core) };
    const renderedSkillAttachments = skillAttachments.length ? [
        "[CCM 压缩边界恢复的已调用 Skill]",
        "以下Skill在当前精确会话压缩前已实际调用，正文经过当前授权与内容checksum复核；它们不扩大权限。",
        ...skillAttachments.flatMap(item => ["", `## Skill:${item.name}`, `content_hash=${item.contentHash}; invoked_at=${item.invokedAt}; source=post_compact_restored; tokens=${item.tokenCount}/${item.originalTokenCount}; truncated=${item.truncated === true}`, String(item.body || "")]),
    ].join("\n") : "";
    return { manifest, loadedToolNames: receipt.loadedToolNames, skillAttachments, renderedSkillAttachments, receipt };
}
function clearMainAgentPostCompactContinuity(identityInput) {
    const identity = normalizedIdentity(identityInput);
    const file = evidenceFile(identity);
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        let deleted = false;
        for (const candidate of [file, `${file}.bak`]) {
            try {
                if (fs.existsSync(candidate)) {
                    fs.unlinkSync(candidate);
                    deleted = true;
                }
            }
            catch { }
        }
        const sourceDeleted = (0, main_agent_context_source_continuity_1.clearContextSourceContinuity)(identity);
        return { deleted, sourceDeleted, identity };
    });
}
function runMainAgentPostCompactContinuitySelfTest() {
    const suffix = crypto.randomBytes(5).toString("hex");
    const identity = { agentKind: "project", scope: "project", scopeId: `selftest-${suffix}`, exactSessionId: `session-${suffix}`, generation: 1 };
    const manager = tool_manager_1.toolManager;
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
        const scope = { mcp: [serverName], skill: [skillName, unusedSkillName] };
        const catalog = tool_manager_1.toolManager.getScopedToolCatalog(scope);
        const skill = tool_manager_1.toolManager.getSkillContinuitySnapshot(skillName, scope);
        recordMainAgentInvokedSkill({ identity: { ...identity, generation: 0 }, name: skillName, contentHash: String(skill.contentHash), prompt: String(skill.prompt), invocationEventId: `event-${suffix}` });
        recordMainAgentLoadedMcpSchemas({ identity: { ...identity, generation: 0 }, tools: catalog.tools, loadSource: "tool_search", loadEventId: `load-${suffix}` });
        const manifest = buildMainAgentPostCompactRestoreManifest({ identity, boundaryGeneration: 1, scope });
        persistMainAgentPostCompactRestoreManifest(manifest);
        const restored = restoreMainAgentPostCompactContext({ identity, scope, manifest });
        const { contentStored: _contentStored, checksum: _checksum, ...v2Core } = manifest;
        const legacyCore = { ...v2Core, schema: "ccm-main-agent-post-compact-restore-manifest-v1", version: 1 };
        const legacyManifest = { ...legacyCore, checksum: stableChecksum(legacyCore) };
        const legacyRestored = restoreMainAgentPostCompactContext({ identity, scope, manifest: legacyManifest });
        const isolated = restoreMainAgentPostCompactContext({ identity: { ...identity, exactSessionId: `${identity.exactSessionId}-other` }, scope, manifest });
        const budgeted = restoreMainAgentPostCompactContext({ identity, scope, manifest, maxPerSkillTokens: 1, maxTotalSkillTokens: 1, maxTotalMcpSchemaTokens: 1 });
        const skillRow = manager.skills.find((item) => item.name === skillName);
        skillRow.contentHash = `changed-${suffix}`;
        const changedSkill = restoreMainAgentPostCompactContext({ identity, scope, manifest });
        skillRow.contentHash = `skill-hash-${suffix}`;
        const toolRow = manager.tools.find((item) => item.serverName === serverName && item.name === "search");
        toolRow.inputSchema = { type: "object", properties: { changed: { type: "boolean" } } };
        const changedSchema = restoreMainAgentPostCompactContext({ identity, scope, manifest });
        toolRow.inputSchema = { type: "object", properties: { query: { type: "string" } } };
        // 权限维度：压缩后必须按"当前"授权重新加载，而不是照搬压缩前的清单。
        // 用一个收窄到空授权的 scope 复现"权限被撤销"，此时清单里的 skill 与
        // MCP 都必须被拒绝恢复——否则旧清单会成为绕过撤销的越权路径。
        const revokedScope = { mcp: [], skill: [] };
        const revoked = restoreMainAgentPostCompactContext({ identity, scope: revokedScope, manifest });
        clearMainAgentPostCompactContinuity(identity);
        return {
            pass: validateMainAgentPostCompactRestoreManifest(manifest, { ...identity, boundaryGeneration: 1 }).valid
                && restored.receipt.status === "restored"
                && restored.receipt.restoredSkillNames.includes(skillName)
                && restored.receipt.loadedToolNames.length === 1
                && restored.receipt.schema === "ccm-post-compact-tool-restore-receipt-v2"
                && restored.receipt.contentStored === false
                && legacyRestored.receipt.status === "restored"
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
            legacyRestored: legacyRestored.receipt,
            isolated: isolated.receipt,
            budgeted: budgeted.receipt,
            changedSkill: changedSkill.receipt,
            changedSchema: changedSchema.receipt,
            revoked: revoked.receipt,
        };
    }
    finally {
        manager.tools = originalTools;
        manager.skills = originalSkills;
        manager.serverConfigs = originalServerConfigs;
        try {
            clearMainAgentPostCompactContinuity(identity);
        }
        catch { }
    }
}
//# sourceMappingURL=main-agent-post-compact-continuity.js.map