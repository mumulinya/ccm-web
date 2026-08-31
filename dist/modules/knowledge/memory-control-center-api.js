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
exports.isCompleteMemoryCenterContextAccounting = isCompleteMemoryCenterContextAccounting;
exports.selectMemoryCenterContextAccounting = selectMemoryCenterContextAccounting;
exports.listJsonFiles = listJsonFiles;
exports.readMemoryFile = readMemoryFile;
exports.groupLabelMap = groupLabelMap;
exports.projectFile = projectFile;
exports.parseGroupMemoryScopeId = parseGroupMemoryScopeId;
exports.listGroupSessionMemoryFiles = listGroupSessionMemoryFiles;
exports.listGroupMemoryScopes = listGroupMemoryScopes;
exports.listMemoryCenterGroupSessionScopes = listMemoryCenterGroupSessionScopes;
exports.groupSessionLabel = groupSessionLabel;
exports.scopeFile = scopeFile;
exports.resolveMemoryCenterTokenState = resolveMemoryCenterTokenState;
exports.healthAlerts = healthAlerts;
exports.memoryCenterMicroCompactState = memoryCenterMicroCompactState;
exports.memorySummary = memorySummary;
exports.collectItems = collectItems;
exports.getMemoryCenterScope = getMemoryCenterScope;
exports.listMemoryAudit = listMemoryAudit;
exports.findMemoryEvidence = findMemoryEvidence;
exports.rollbackMemory = rollbackMemory;
exports.recordMemoryOperation = recordMemoryOperation;
exports.memoryCenterExactGroupSessionScope = memoryCenterExactGroupSessionScope;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const memory_control_center_types_1 = require("./memory-control-center-types");
const memory_control_center_controls_1 = require("./memory-control-center-controls");
const main_agent_context_source_continuity_1 = require("../../system/main-agent-context-source-continuity");
const group_compaction_projections_1 = require("../collaboration/group-compaction-projections");
const group_compaction_strategy_1 = require("../collaboration/group-compaction-strategy");
const group_orchestrator_config_1 = require("../collaboration/group-orchestrator-config");
const group_compaction_activity_1 = require("../collaboration/group-compaction-activity");
const session_compaction_runs_1 = require("../../system/session-compaction-runs");
const session_start_hook_context_1 = require("../../system/session-start-hook-context");
const group_compact_file_references_1 = require("../collaboration/group-compact-file-references");
const group_memory_auto_compact_circuit_policy_1 = require("../collaboration/group-memory-auto-compact-circuit-policy");
const session_model_context_1 = require("../../system/session-model-context");
const provider_neutral_context_cache_1 = require("../../system/provider-neutral-context-cache");
const provider_cache_capability_registry_1 = require("../../system/provider-cache-capability-registry");
const context_engine_observability_1 = require("../../system/context-engine-observability");
const context_engine_recovery_1 = require("../../system/context-engine-recovery");
const internal_skill_catalog_1 = require("../../skills/internal-skill-catalog");
const unified_session_compaction_1 = require("../../system/unified-session-compaction");
const session_compaction_core_1 = require("../../system/session-compaction-core");
const ccm_context_accounting_v2_1 = require("../../system/ccm-context-accounting-v2");
const canonical_context_accounting_1 = require("../../system/canonical-context-accounting");
const session_memory_token_basis_1 = require("../../system/session-memory-token-basis");
const provider_microcompact_1 = require("../../system/provider-microcompact");
const session_compaction_command_hooks_1 = require("../../system/session-compaction-command-hooks");
const session_context_tool_buckets_1 = require("../../system/session-context-tool-buckets");
const post_turn_tool_context_compaction_1 = require("../../system/post-turn-tool-context-compaction");
const pre_request_tool_context_1 = require("../../system/pre-request-tool-context");
const MODEL_VISIBLE_FIXED_BUCKETS = [
    "system",
    "tools",
    "rules",
    "skills",
    "mcpTools",
    "subagentDefinitions",
    "workerBootstrap",
    "hydratedContext",
    "providerEnvelope",
];
function cleanAvailableContextName(value, max = 120) {
    return String(value || "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, max);
}
function normalizeAvailableContextNames(value) {
    const rows = Array.isArray(value) ? value : [];
    return [...new Set(rows.map((item) => cleanAvailableContextName(item && typeof item === "object"
            ? item.name || item.grant || item.server || item.tool
            : item)).filter(Boolean))].slice(0, 100);
}
function scopeConfiguredContextTools(scope, scopeId, memory) {
    try {
        if (scope === "global_session" || scope === "global") {
            const store = require("../global/global-agent-tool-authorization").loadGlobalAgentToolAuthorization();
            return store?.tools || {};
        }
        if (scope === "group") {
            const groupId = parseGroupMemoryScopeId(scopeId, memory).groupId;
            const group = require("../collaboration/storage").loadGroups()
                .find((item) => String(item?.id || "") === String(groupId || ""));
            return group?.tools || {};
        }
        if (scope === "project" || scope === "project_session") {
            const separator = scopeId.indexOf("::");
            const projectId = (0, memory_control_center_types_1.cleanId)(scope === "project_session" && separator >= 0 ? scopeId.slice(0, separator) : memory?.project || scopeId);
            return (0, db_1.loadProjectConfigs)()?.[projectId]?.tools || {};
        }
    }
    catch { }
    return {};
}
function estimateAvailableContextTokens(value) {
    if (!value)
        return 0;
    try {
        return (0, group_compaction_projections_1.estimateGroupMessageTokens)({ role: "system", content: typeof value === "string" ? value : JSON.stringify(value) });
    }
    catch {
        return 0;
    }
}
function buildAvailableContextCatalog(scope, scopeId, memory, modelVisiblePayload) {
    const configured = scopeConfiguredContextTools(scope, scopeId, memory);
    const configuredMcp = normalizeAvailableContextNames(configured?.mcp);
    const configuredSkills = normalizeAvailableContextNames(configured?.skill);
    const mcpCatalog = (0, db_1.loadMcpTools)().filter((item) => item?.enabled !== false);
    const skillCatalog = (0, db_1.loadSkills)().filter((item) => item?.enabled !== false);
    const mcpByName = new Map(mcpCatalog.map((item) => [String(item?.name || ""), item]));
    const skillByName = new Map(skillCatalog.map((item) => [String(item?.name || ""), item]));
    const breakdown = modelVisiblePayload?.tokenBreakdown || modelVisiblePayload?.token_breakdown || {};
    const systemToolTokens = Math.max(0, Number(breakdown.systemTools ?? breakdown.system_tools ?? 0));
    const mcpLoadedTokens = Math.max(0, Number(breakdown.mcpTools ?? breakdown.mcp ?? 0));
    const skillLoadedTokens = Math.max(0, Number(breakdown.skills || 0));
    const loadedEvidence = modelVisiblePayload?.loadedContextItems || modelVisiblePayload?.loaded_context_items || {};
    const evidenceSchema = String(loadedEvidence?.schema || "");
    const evidenceExact = evidenceSchema === "ccm-loaded-context-items-v2";
    const loadedSystemTools = evidenceExact && Array.isArray(loadedEvidence?.systemTools || loadedEvidence?.system_tools)
        ? (loadedEvidence.systemTools || loadedEvidence.system_tools)
        : [];
    const loadedMcp = evidenceExact && Array.isArray(loadedEvidence?.mcp) ? loadedEvidence.mcp : [];
    const loadedSkills = evidenceExact && Array.isArray(loadedEvidence?.skills) ? loadedEvidence.skills : [];
    const invocations = evidenceExact && Array.isArray(loadedEvidence?.invocations) ? loadedEvidence.invocations : [];
    const compaction = memory?.compaction?.v2 || memory?.compaction || {};
    const boundary = memory?.boundary || memory?.compactBoundary || memory?.compact_boundary || {};
    const restoreReceipt = compaction?.dynamicContextRestoreReceipt
        || compaction?.dynamic_context_restore_receipt
        || boundary?.dynamicContextRestoreReceipt
        || boundary?.post_compact_restore?.dynamicContextRestoreReceipt
        || boundary?.post_compact_restore?.dynamic_context_restore_receipt
        || null;
    const normalizedAliases = (item) => Array.from(new Set([
        String(item?.name || ""),
        ...(Array.isArray(item?.aliases) ? item.aliases.map((value) => String(value || "")) : []),
    ].map(value => value.trim().toLowerCase()).filter(Boolean)));
    const evidenceMatches = (item, name, kind) => {
        const itemKind = String(item?.kind || kind);
        if (kind === "system_tool" ? itemKind !== "system_tool" : itemKind !== kind)
            return false;
        const target = String(name || "").trim().toLowerCase();
        if (!target)
            return false;
        return normalizedAliases(item).some(alias => alias === target || (kind !== "skill" && (alias.startsWith(`${target}/`) || target.startsWith(`${alias}/`))));
    };
    const decorateEvidence = (name, kind, available, configured = true) => {
        const loadedRows = kind === "system_tool" ? loadedSystemTools : kind === "mcp" ? loadedMcp : loadedSkills;
        const evidenceRows = loadedRows.filter((item) => evidenceMatches(item, name, kind));
        const carriesCurrentTokens = (item) => Math.max(0, Number(item?.tokens || item?.tokenCount || item?.token_count || 0)) > 0;
        const visible = evidenceRows.filter((item) => ["catalog", "schema", "body"].includes(String(item?.loadLevel || item?.level || "")) && carriesCurrentTokens(item));
        const loaded = evidenceRows.filter((item) => {
            const level = String(item?.loadLevel || item?.level || "");
            return (kind === "skill" ? level === "body" : level === "schema") && carriesCurrentTokens(item);
        });
        const invoked = invocations.filter((item) => evidenceMatches(item, name, kind));
        const currentTokens = evidenceRows
            .filter((item) => String(item?.loadLevel || item?.level || "") !== "result")
            .reduce((sum, item) => sum + Math.max(0, Number(item?.tokens || item?.tokenCount || item?.token_count || 0)), 0);
        const implementation = (() => {
            const explicit = evidenceRows.map((item) => String(item?.implementation || item?.implementationType || item?.implementation_type || ""))
                .find((value) => ["native", "internal_mcp", "extension_mcp", "skill", "unknown"].includes(value));
            if (explicit)
                return explicit;
            if (kind === "skill")
                return "skill";
            if (kind === "mcp")
                return "extension_mcp";
            return (0, session_context_tool_buckets_1.isInternalMcpToolDefinition)({
                name,
                canonicalName: name,
                server: evidenceRows.find((item) => item?.server)?.server,
                source: evidenceRows.flatMap((item) => Array.isArray(item?.aliases) ? item.aliases : []).join(" "),
            }) ? "internal_mcp" : evidenceExact ? "native" : "unknown";
        })();
        return {
            state: !available && !visible.length ? "unavailable" : invoked.length ? "invoked" : loaded.length ? "loaded" : visible.length ? "visible" : "available",
            configured,
            evidenceStatus: evidenceExact ? "exact" : "unproven",
            origin: kind === "system_tool" || (kind === "skill" && (0, internal_skill_catalog_1.isCcmInternalSkillName)(name)) ? "system" : "extension",
            authorizationMode: kind === "system_tool" || (kind === "skill" && (0, internal_skill_catalog_1.isCcmInternalSkillName)(name)) ? "automatic" : "scope_authorized",
            implementation,
            loadLevels: Array.from(new Set(evidenceRows.map((item) => String(item?.loadLevel || "")).filter(Boolean))),
            loadSources: Array.from(new Set(evidenceRows.map((item) => String(item?.loadSource || item?.load_source || "")).filter(Boolean))),
            currentTokens,
            loadedTokens: currentTokens,
            dropReasons: Array.from(new Set(evidenceRows.map((item) => String(item?.dropReason || item?.drop_reason || "")).filter(Boolean))),
            invocationCount: invoked.length,
            invocationSucceeded: invoked.some((item) => item?.ok === true),
            loadedChecksum: String(loadedEvidence?.checksum || modelVisiblePayload?.loadedContextItemsChecksum || modelVisiblePayload?.loaded_context_items_checksum || ""),
        };
    };
    const systemSkillCatalog = skillCatalog.filter((item) => item?.systemManaged === true || item?.roleSkill === true || item?.origin === "internal" || item?.sourceType === "builtin" || (0, internal_skill_catalog_1.isCcmInternalSkillName)(item?.name));
    const systemSkillNames = new Set(systemSkillCatalog.map((item) => String(item?.name || "")));
    const systemTools = loadedSystemTools.map((row) => {
        const name = String(row?.name || "").trim();
        return { name, ...decorateEvidence(name, "system_tool", true, false), estimatedTokens: 0 };
    }).filter((item) => item.name);
    const extensionMcp = configuredMcp.map((grant) => {
        const server = grant.split("/")[0];
        const item = mcpByName.get(server) || null;
        return {
            name: grant,
            ...decorateEvidence(grant, "mcp", !!item),
            estimatedTokens: estimateAvailableContextTokens({
                name: grant,
                description: item?.description || "",
                tools: Array.isArray(item?.tools) ? item.tools : [],
            }),
        };
    });
    const systemSkills = systemSkillCatalog.map((item) => {
        const name = String(item?.name || "").trim();
        return {
            name,
            ...decorateEvidence(name, "skill", true, false),
            origin: "system",
            authorizationMode: "automatic",
            estimatedTokens: 0,
        };
    }).filter((item) => item.name);
    const extensionSkills = configuredSkills.filter(name => !systemSkillNames.has(name)).map((name) => {
        const item = skillByName.get(name) || null;
        return {
            name,
            ...decorateEvidence(name, "skill", !!item),
            estimatedTokens: estimateAvailableContextTokens({
                name,
                description: item?.description || "",
                content: item?.content || item?.prompt || item?.instructions || "",
            }),
        };
    });
    for (const row of loadedMcp) {
        const name = String(row?.name || "").trim();
        if (!name || extensionMcp.some((item) => evidenceMatches(row, item.name, "mcp")))
            continue;
        extensionMcp.push({
            name,
            ...decorateEvidence(name, "mcp", true, false),
            estimatedTokens: 0,
        });
    }
    for (const row of loadedSkills) {
        const name = String(row?.name || "").trim();
        if (!name)
            continue;
        const target = String(row?.origin || "") === "system" || systemSkillNames.has(name) || (0, internal_skill_catalog_1.isCcmInternalSkillName)(name) ? systemSkills : extensionSkills;
        if (target.some((item) => evidenceMatches(row, item.name, "skill")))
            continue;
        target.push({
            name,
            ...decorateEvidence(name, "skill", true, false),
            estimatedTokens: 0,
        });
    }
    const buildGroup = (items, bucketTokens, authorizationMode) => {
        const itemTokens = items.reduce((sum, item) => sum + Math.max(0, Number(item.currentTokens || 0)), 0);
        const evidenceGapTokens = Math.max(0, bucketTokens - itemTokens);
        const summarizeImplementation = (key, label) => {
            const matching = items.filter(item => String(item?.implementation || "unknown") === key);
            return {
                key,
                label,
                available: matching.filter(item => item.state !== "unavailable").length,
                visible: matching.filter(item => ["visible", "loaded", "invoked"].includes(item.state)).length,
                loaded: matching.filter(item => ["loaded", "invoked"].includes(item.state)).length,
                invoked: matching.filter(item => item.state === "invoked").length,
                currentTokens: matching.reduce((sum, item) => sum + Math.max(0, Number(item.currentTokens || 0)), 0),
            };
        };
        const implementationGroups = authorizationMode === "automatic"
            ? [summarizeImplementation("native", "CCM 原生工具"), summarizeImplementation("internal_mcp", "内置 MCP 工具"), summarizeImplementation("unknown", "历史未分类")]
                .filter(group => group.available > 0 || group.currentTokens > 0)
            : [];
        return {
            authorizationMode,
            configured: items.filter(item => item.configured !== false).length,
            available: items.filter(item => item.state !== "unavailable").length,
            visible: items.filter(item => ["visible", "loaded", "invoked"].includes(item.state)).length,
            loaded: items.filter(item => ["loaded", "invoked"].includes(item.state)).length,
            invoked: items.filter(item => item.state === "invoked").length,
            loadedThisTurn: items.some(item => ["visible", "loaded", "invoked"].includes(item.state)),
            currentTokens: bucketTokens,
            loadedTokens: bucketTokens,
            evidenceItemTokens: itemTokens,
            evidenceComplete: evidenceExact && evidenceGapTokens === 0,
            evidenceGapTokens,
            historicalDetailUnavailable: !evidenceExact && bucketTokens > 0,
            estimatedTokensIfLoaded: items.reduce((sum, item) => sum + Number(item.estimatedTokens || 0), 0),
            implementationGroups,
            items,
        };
    };
    return {
        schema: "ccm-context-available-catalog-v3",
        accounting: "per_item_model_payload_evidence",
        postCompactRestore: restoreReceipt ? {
            status: String(restoreReceipt.status || ""),
            restoredSkillTokens: Math.max(0, Number(restoreReceipt.restoredSkillTokens || 0)),
            restoredMcpSchemaTokens: Math.max(0, Number(restoreReceipt.restoredMcpSchemaTokens || 0)),
            restoredSkillNames: Array.isArray(restoreReceipt.restoredSkillNames) ? restoreReceipt.restoredSkillNames : [],
            loadedToolNames: Array.isArray(restoreReceipt.loadedToolNames) ? restoreReceipt.loadedToolNames : [],
            dropped: Array.isArray(restoreReceipt.dropped) ? restoreReceipt.dropped : [],
            checksum: String(restoreReceipt.checksum || ""),
        } : null,
        systemTools: buildGroup(systemTools, systemToolTokens, "automatic"),
        systemSkills: buildGroup(systemSkills, systemSkills.reduce((sum, item) => sum + Number(item.currentTokens || 0), 0), "automatic"),
        extensionMcp: buildGroup(extensionMcp, mcpLoadedTokens, "scope_authorized"),
        extensionSkills: buildGroup(extensionSkills, Math.max(0, skillLoadedTokens - systemSkills.reduce((sum, item) => sum + Number(item.currentTokens || 0), 0)), "scope_authorized"),
    };
}
function modelVisiblePayloadFixedTokens(payload) {
    const breakdown = payload?.tokenBreakdown || payload?.token_breakdown;
    if (!breakdown || typeof breakdown !== "object")
        return 0;
    return MODEL_VISIBLE_FIXED_BUCKETS.reduce((sum, key) => sum + Math.max(0, Number(breakdown[key] || 0)), 0);
}
function isCompleteMemoryCenterContextAccounting(payload) {
    const breakdown = payload?.tokenBreakdown || payload?.token_breakdown;
    const totalTokens = Number(payload?.totalTokens ?? payload?.total_tokens ?? 0);
    const primary = payload?.primaryTokenBreakdown || payload?.primary_token_breakdown;
    const primaryTotal = primary && typeof primary === "object"
        ? Object.values((0, ccm_context_accounting_v2_1.normalizeCcmPrimaryTokenBreakdown)(primary)).reduce((sum, value) => sum + value, 0)
        : 0;
    return !!breakdown
        && typeof breakdown === "object"
        && Number.isFinite(totalTokens)
        && totalTokens > 0
        && (primaryTotal > 0 || modelVisiblePayloadFixedTokens(payload) > 0);
}
function selectMemoryCenterContextAccounting(input) {
    const canonical = input.canonical || null;
    if (canonical?.schema === "ccm-canonical-context-accounting-receipt-v2"
        && canonical?.modelVisiblePayload
        && isCompleteMemoryCenterContextAccounting(canonical.modelVisiblePayload)) {
        return { payload: canonical.modelVisiblePayload, source: "canonical_context_accounting", receipt: canonical };
    }
    return { payload: null, source: "" };
}
function currentCanonicalContextAccounting(scope, scopeId, memory) {
    try {
        if (scope === "global_session") {
            return (0, canonical_context_accounting_1.readCanonicalContextAccounting)("global", "global", scopeId.replace(/^session:/, ""));
        }
        if (scope === "group") {
            const exact = parseGroupMemoryScopeId(scopeId, memory);
            return exact.sessionId.startsWith("gcs_") ? (0, canonical_context_accounting_1.readCanonicalContextAccounting)("group", exact.groupId, exact.sessionId) : null;
        }
        if (scope === "project_session") {
            const separator = scopeId.indexOf("::");
            const projectSessionId = (0, memory_control_center_types_1.cleanId)(separator >= 0 ? scopeId.slice(separator + 2) : "");
            const projectId = (0, memory_control_center_types_1.cleanId)(separator >= 0 ? scopeId.slice(0, separator) : "");
            return projectId && projectSessionId ? (0, canonical_context_accounting_1.readCanonicalContextAccounting)("project", projectId, projectSessionId) : null;
        }
    }
    catch { }
    return null;
}
function currentCompactionActivity(scope, scopeId, memory) {
    try {
        if (scope === "group") {
            const exact = parseGroupMemoryScopeId(scopeId, memory);
            const shared = (0, session_compaction_runs_1.getSessionCompactionRunActivity)("group", `${exact.groupId}:${exact.sessionId}`);
            if (shared.active)
                return shared;
            const ledger = (0, group_compaction_activity_1.readGroupCompactionActivity)(exact.groupId, exact.sessionId);
            const row = ledger?.current;
            const active = row?.status === "running" && Date.parse(String(row?.lease_expires_at || "")) > Date.now();
            return active ? {
                active: true,
                status: "running",
                stage: String(row.stage || "model_compaction"),
                reason: String(row.reason || ""),
                startedAt: String(row.started_at || ""),
                updatedAt: String(row.heartbeat_at || row.started_at || ""),
            } : { active: false, status: "idle", stage: "", reason: "", startedAt: "", updatedAt: String(ledger?.updated_at || "") };
        }
        if (scope === "global_session") {
            return require("../../agents/global/memory").getGlobalAgentSessionCompactionActivity(scopeId.replace(/^session:/, ""));
        }
        if (scope === "project_session") {
            const separator = scopeId.indexOf("::");
            if (separator > 0) {
                return require("../projects/project-session-compaction").getProjectSessionCompactionActivity(scopeId.slice(0, separator), scopeId.slice(separator + 2));
            }
        }
    }
    catch { }
    return { active: false, status: "idle", stage: "", reason: "", startedAt: "", updatedAt: "" };
}
function listJsonFiles(dir) {
    try {
        return fs.readdirSync(dir).filter(name => name.endsWith(".json") && !name.includes(".pre-rollback-")).map(name => path.join(dir, name));
    }
    catch {
        return [];
    }
}
function readMemoryFile(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return null;
    }
}
function groupLabelMap() {
    const groups = (0, memory_control_center_types_1.readJson)(path.join(utils_1.CCM_DIR, "groups.json"), []);
    return new Map((Array.isArray(groups) ? groups : groups?.groups || []).map((item) => [String(item.id), item.name || item.title || item.id]));
}
function projectFile(project) {
    return listJsonFiles(memory_control_center_types_1.PROJECT_MEMORY_DIR).find(file => readMemoryFile(file)?.project === project) || "";
}
function parseGroupMemoryScopeId(scopeId, memory = null) {
    const raw = String(scopeId || "").trim();
    const separator = raw.indexOf("::");
    const explicitGroupId = separator >= 0 ? raw.slice(0, separator) : raw;
    const explicitSessionId = separator >= 0 ? raw.slice(separator + 2) : "";
    const groupId = String(memory?.groupId || explicitGroupId || "").trim();
    const sessionId = String(memory?.groupSessionId || explicitSessionId || "default").trim() || "default";
    return {
        groupId,
        sessionId,
        scopeId: sessionId === "default" ? groupId : `${groupId}::${sessionId}`,
    };
}
function listGroupSessionMemoryFiles() {
    const files = [];
    try {
        for (const groupEntry of fs.readdirSync(memory_control_center_types_1.GROUP_SESSION_SCOPED_MEMORY_DIR, { withFileTypes: true })) {
            if (!groupEntry.isDirectory())
                continue;
            const groupDir = path.join(memory_control_center_types_1.GROUP_SESSION_SCOPED_MEMORY_DIR, groupEntry.name);
            for (const name of fs.readdirSync(groupDir)) {
                if (name.endsWith(".json") && !name.endsWith(".bak") && !name.includes(".pre-rollback-"))
                    files.push(path.join(groupDir, name));
            }
        }
    }
    catch { }
    return files;
}
function listGroupMemoryScopes() {
    const rows = [];
    const seen = new Set();
    for (const file of [...listJsonFiles(memory_control_center_types_1.GROUP_MEMORY_DIR), ...listGroupSessionMemoryFiles()]) {
        const memory = readMemoryFile(file);
        if (!memory)
            continue;
        const parts = parseGroupMemoryScopeId(String(memory.groupId || path.basename(file, ".json")), memory);
        if (!parts.groupId || seen.has(parts.scopeId))
            continue;
        seen.add(parts.scopeId);
        rows.push({ ...parts, file, memory });
    }
    return rows;
}
function listMemoryCenterGroupSessionScopes() {
    const labels = groupLabelMap();
    const stored = listGroupMemoryScopes();
    const storedByScope = new Map(stored.map((entry) => [entry.scopeId, entry]));
    const rows = [];
    const seen = new Set();
    for (const [groupId, groupLabel] of labels.entries()) {
        let sessions = [];
        try {
            sessions = require("../collaboration/storage").listGroupChatSessions(groupId).sessions || [];
        }
        catch { }
        for (const session of sessions) {
            const sessionId = String(session.id || "");
            if (!sessionId)
                continue;
            const scopeId = `${groupId}::${sessionId}`;
            const entry = storedByScope.get(scopeId);
            const memory = entry?.memory || { groupId, groupSessionId: sessionId, compaction: {} };
            rows.push({
                ...memorySummary("group", scopeId, memory, String(session.title || sessionId)),
                groupId,
                groupSessionId: sessionId,
                groupLabel: String(groupLabel || groupId),
                sessionLabel: String(session.title || sessionId),
                memoryKind: "session",
                hasMemoryState: !!entry,
                messageCount: Number(session.messageCount || 0),
            });
            seen.add(scopeId);
        }
    }
    for (const entry of stored) {
        if (seen.has(entry.scopeId) || entry.sessionId === "default")
            continue;
        rows.push({
            ...memorySummary("group", entry.scopeId, entry.memory, groupSessionLabel(entry.groupId, entry.sessionId, labels)),
            groupId: entry.groupId,
            groupSessionId: entry.sessionId,
            groupLabel: String(labels.get(entry.groupId) || entry.groupId),
            sessionLabel: entry.sessionId,
            memoryKind: "session",
            hasMemoryState: true,
        });
    }
    return rows;
}
function groupSessionLabel(groupId, sessionId, labels = groupLabelMap()) {
    const groupLabel = String(labels.get(groupId) || groupId);
    if (sessionId === "default")
        return groupLabel;
    try {
        const { listGroupChatSessions } = require("../collaboration/storage");
        const session = listGroupChatSessions(groupId).sessions.find((item) => String(item.id) === sessionId);
        return `${groupLabel} / ${session?.title || sessionId}`;
    }
    catch {
        return `${groupLabel} / ${sessionId}`;
    }
}
function scopeFile(scope, scopeId) {
    if (scope === "group") {
        const parts = parseGroupMemoryScopeId(scopeId);
        if (parts.sessionId === "default")
            return path.join(memory_control_center_types_1.GROUP_MEMORY_DIR, `${parts.groupId}.json`);
        try {
            const { getGroupMemoryFile } = require("../collaboration/memory");
            return getGroupMemoryFile(parts.groupId, parts.sessionId);
        }
        catch {
            return path.join(memory_control_center_types_1.GROUP_SESSION_SCOPED_MEMORY_DIR, (0, memory_control_center_types_1.cleanId)(parts.groupId), `${(0, memory_control_center_types_1.cleanId)(parts.sessionId)}.json`);
        }
    }
    if (scope === "global_session")
        return memory_control_center_types_1.GLOBAL_MEMORY_FILE;
    if (scope === "project_session") {
        const separator = scopeId.indexOf("::");
        const project = (0, memory_control_center_types_1.cleanId)(separator >= 0 ? scopeId.slice(0, separator) : "");
        const sessionId = (0, memory_control_center_types_1.cleanId)(separator >= 0 ? scopeId.slice(separator + 2) : "");
        return project && sessionId ? path.join(utils_1.CCM_DIR, "web-sessions", project, `${sessionId}.json`) : "";
    }
    if (scope === "task_agent")
        return path.join(utils_1.CCM_DIR, "task-agent-sessions.json");
    if (scope === "project")
        return projectFile(scopeId);
    return memory_control_center_types_1.GLOBAL_MEMORY_FILE;
}
function resolveMemoryCenterTokenState(scope, scopeId, memory, options = {}) {
    const compaction = memory?.compaction?.v2 || memory?.compaction || {};
    const config = options.config || (0, group_orchestrator_config_1.loadOrchestratorConfig)();
    const defaultCapacity = (0, group_compaction_strategy_1.resolveGroupModelContextCapacity)(config);
    const capacity = memory?.compaction?.resolved_model_capacity || compaction.resolvedModelCapacity || compaction.resolved_model_capacity || defaultCapacity;
    const canonicalCapacity = (0, ccm_context_accounting_v2_1.normalizeCcmContextCapacity)({
        ...capacity,
        rawWindowTokens: capacity.rawWindowTokens || capacity.contextWindow || capacity.context_window,
        windowSemantics: capacity.windowSemantics || capacity.window_semantics,
        source: capacity.source === "user_setting" ? "user_setting" : capacity.conservativeFallback ? "conservative_fallback" : "provider_capability",
        confidence: capacity.confidence,
        evidenceId: capacity.evidenceId || capacity.evidence_id,
    });
    const modelVisiblePayload = memory?.compaction?.model_visible_payload || compaction.modelVisiblePayload || compaction.model_visible_payload || compaction.postCompactGate?.model_visible_payload || compaction.post_compact_gate?.model_visible_payload || null;
    const canonicalMeasurement = compaction.tokenMeasurement?.schema === "ccm-context-measurement-v2"
        || compaction.tokenMeasurement?.accountingSchema === "ccm-context-accounting-v2"
        ? compaction.tokenMeasurement
        : compaction.token_measurement?.schema === "ccm-context-measurement-v2"
            || compaction.token_measurement?.accountingSchema === "ccm-context-accounting-v2"
            ? compaction.token_measurement
            : null;
    const canonicalPayload = modelVisiblePayload?.accountingSchema === "ccm-context-accounting-v2"
        || modelVisiblePayload?.primaryTokenBreakdown
        ? modelVisiblePayload
        : null;
    const currentTokens = canonicalPayload
        ? Math.max(0, Number(canonicalPayload.predictedNextRequestTokens || canonicalPayload.predicted_next_request_tokens || canonicalPayload.totalTokens || canonicalPayload.total_tokens || 0))
        : canonicalMeasurement
            ? Math.max(0, Number(canonicalMeasurement.currentInputTokens || 0) + Number(canonicalMeasurement.estimatedNewInputTokens || 0))
            : 0;
    const currentMessageCount = Number((compaction.preservedRecentMessageIds || compaction.preserved_recent_message_ids || []).length || 0);
    const tokenSource = canonicalMeasurement?.source === "provider_reported"
        ? "provider_usage"
        : canonicalPayload || currentTokens > 0 ? "model_visible_payload" : "unavailable";
    const tokenUpdatedAt = String(canonicalMeasurement?.updatedAt || compaction.lastCompactedAt || "");
    const exactCapacityScope = scope === "global_session" || scope === "project_session" || scope === "group" || scope === "task_agent";
    const autoCompactThreshold = exactCapacityScope ? canonicalCapacity.autoCompactThresholdTokens : 0;
    const effectiveContextWindow = exactCapacityScope ? canonicalCapacity.effectiveInputWindowTokens : 0;
    const remainingTokens = Math.max(0, autoCompactThreshold - currentTokens);
    return {
        currentTokens,
        currentMessageCount,
        tokenSource,
        autoCompactThreshold,
        remainingTokens,
        effectiveContextWindow,
        tokenPressure: scope !== "project" && autoCompactThreshold > 0 ? Math.round((currentTokens / autoCompactThreshold) * 1000) / 10 : 0,
        tokenUpdatedAt,
        sampledAutoCompactThreshold: autoCompactThreshold,
        fallbackTokenMeasurement: null,
        capacity: canonicalCapacity,
    };
}
function healthAlerts(scope, scopeId, memory) {
    const alerts = [];
    const add = (severity, code, message) => alerts.push({ id: `${scope}:${scopeId}:${code}`, scope, scopeId, severity, code, message });
    if (memory?.storageRecovery?.failed)
        add("critical", "storage_recovery_failed", "主文件和备份均不可读取");
    else if (memory?.storageRecovery?.recoveredFromBackup)
        add("warning", "storage_recovered", "本次从备份恢复，请检查最近一次写入");
    if (scope === "group") {
        const compaction = memory?.compaction || {};
        if (compaction.health && !["healthy", "empty", "recent-window-only"].includes(String(compaction.health)))
            add("warning", "compaction_health", `压缩健康状态：${compaction.health}`);
        if (compaction.validation?.pass === false)
            add("critical", "summary_validation", "压缩摘要未通过事实保真校验");
        if (Number(compaction.thrashCount || 0) >= 3)
            add("warning", "compaction_thrash", "连续压缩释放空间不足");
        if (Number(compaction.consecutiveFailures || 0) > 0)
            add("warning", "model_compaction_failure", `模型压缩连续失败 ${compaction.consecutiveFailures} 次`);
        const currentPressure = resolveMemoryCenterTokenState(scope, scopeId, memory).tokenPressure;
        if (currentPressure >= 90)
            add("warning", "token_pressure", `当前上下文占用 ${Math.round(currentPressure * 10) / 10}%`);
    }
    else if (scope === "project" || scope === "project_session") {
        if (memory?.integrity?.conclusions?.pass === false || memory?.integrity?.decisions?.pass === false)
            add("critical", "archive_integrity", "项目记忆归档校验失败");
        const compaction = memory?.compaction?.v2 || memory?.compaction || {};
        if (Number(compaction.consecutiveFailures || compaction.consecutive_failures || 0) > 0)
            add("warning", "project_session_compaction_failure", `项目会话压缩连续失败 ${Number(compaction.consecutiveFailures || compaction.consecutive_failures || 0)} 次`);
    }
    else if (scope === "global" || scope === "global_session") {
        const compaction = memory?.compaction?.v2 || memory?.compaction || {};
        if (memory?.integrity?.pass === false)
            add("critical", "global_archive_integrity", `全局记忆归档校验失败：${(memory.integrity.corruptedArchives || []).join("、")}`);
        if (compaction.health && compaction.health !== "healthy")
            add("warning", "global_compaction_health", `全局压缩健康状态：${compaction.health}`);
        if (Number(compaction.consecutiveFailures || 0) >= 3)
            add("critical", "global_compaction_circuit_breaker", "全局记忆压缩连续失败，熔断器已触发");
        if (scope === "global" && memory?.privacy?.encryptedTranscripts !== true)
            add("critical", "global_transcript_encryption", "全局 Agent 原始转录未启用加密");
    }
    else if (scope === "task_agent") {
        const failures = Number(memory?.compaction?.consecutiveFailures || memory?.compaction?.consecutive_failures || memory?.finalDispatchReactiveCompactCircuitBreaker?.consecutive_failures || 0);
        if (failures > 0)
            add(failures >= 3 ? "critical" : "warning", "task_agent_compaction_failure", `任务 Agent 精确会话压缩连续失败 ${failures} 次`);
    }
    return alerts;
}
function memoryCenterMicroCompactState(scope, scopeId, memory) {
    const applicable = ["group", "global_session", "project_session"].includes(scope)
        && !(scope === "group" && !String(scopeId || "").includes("::gcs_"));
    if (!applicable)
        return {
            schema: "ccm-memory-center-microcompact-state-v1",
            applicable: false,
            status: "not_applicable",
            reason: "session_scope_required",
            hasReceipt: false,
            receiptValid: false,
            historicalDataUnrecorded: false,
        };
    const compactionContainer = memory?.compaction || {};
    const compaction = compactionContainer?.v2 || compactionContainer;
    const receipt = compactionContainer.timeBasedToolResultProjection
        || compaction.timeBasedToolResultProjection
        || compaction.time_based_tool_result_projection
        || compactionContainer.microCompactReceipt
        || compactionContainer.micro_compact_receipt
        || compaction.microCompactReceipt
        || compaction.micro_compact_receipt
        || null;
    if (!receipt)
        return {
            schema: "ccm-memory-center-microcompact-state-v1",
            applicable: true,
            status: "historical_unrecorded",
            reason: "receipt_missing",
            hasReceipt: false,
            receiptValid: false,
            historicalDataUnrecorded: true,
            scope,
            scopeId,
            trigger: "",
            clearedToolResultCount: 0,
            keptToolResultCount: 0,
            tokensSaved: 0,
            gapMinutes: 0,
            gapThresholdMinutes: 0,
            evaluatedAt: "",
            rawTranscriptPreserved: true,
            receiptChecksum: "",
        };
    let verification = { valid: false, issues: ["unsupported_receipt_schema"] };
    if (receipt.schema === "ccm-group-time-based-tool-result-projection-v1") {
        const exact = parseGroupMemoryScopeId(scopeId, memory);
        verification = (0, group_compaction_projections_1.verifyGroupTimeBasedToolResultProjectionReceipt)(receipt, { groupId: exact.groupId, groupSessionId: exact.sessionId });
    }
    else if (receipt.schema === "ccm-session-microcompact-receipt-v1") {
        const sessionId = scope === "global_session"
            ? String(scopeId).replace(/^session:/, "")
            : scope === "project_session" ? String(scopeId).split("::").slice(1).join("::") : "";
        verification = (0, session_model_context_1.verifySessionModelMicroCompactReceipt)(receipt, { scope: scope === "global_session" ? "global" : "project", sessionId });
    }
    const sharedReceipt = receipt.schema === "ccm-session-microcompact-receipt-v1";
    return {
        schema: "ccm-memory-center-microcompact-state-v1",
        applicable: true,
        status: verification.valid ? (sharedReceipt ? (receipt.applied === true ? "applied" : "skipped") : String(receipt.status || "skipped")) : "invalid_receipt",
        reason: String(receipt.reason || ""),
        hasReceipt: true,
        receiptValid: verification.valid,
        receiptIssues: verification.issues,
        historicalDataUnrecorded: false,
        scope,
        scopeId,
        groupId: String(receipt.group_id || ""),
        groupSessionId: String(receipt.group_session_id || ""),
        trigger: String(receipt.trigger || "") || (String(receipt.reason || "").includes("gap") ? "time_based" : ""),
        clearedToolResultCount: Math.max(0, Number(receipt.cleared_tool_result_count || receipt.clearedToolResultCount || receipt.clearedToolCallIds?.length || 0)),
        keptToolResultCount: Math.max(0, Number(receipt.kept_tool_count || receipt.keptToolResultCount || receipt.keep_recent || receipt.keepRecent || 0)),
        compactableToolCount: Math.max(0, Number(receipt.compactable_tool_count || receipt.compactableToolCount || 0)),
        tokensSaved: Math.max(0, Number(receipt.tokens_saved || receipt.tokensSaved || receipt.clearedResultTokens || 0)),
        gapMinutes: Math.max(0, Number(receipt.gap_minutes || receipt.gapMinutes || 0)),
        gapThresholdMinutes: Math.max(0, Number(receipt.gap_threshold_minutes || receipt.gapThresholdMinutes || 0)),
        evaluatedAt: String(receipt.evaluated_at || receipt.evaluatedAt || ""),
        lastAssistantAt: String(receipt.last_assistant_at || receipt.lastAssistantAt || ""),
        rawTranscriptPreserved: receipt.raw_transcript_preserved === true || receipt.rawTranscriptPreserved === true || receipt.rawLedgerPreserved === true,
        receiptChecksum: String(receipt.receipt_checksum || receipt.receiptChecksum || ""),
    };
}
function memoryCenterPostCompactUsage(scope, scopeId, memory, microCompactState) {
    const usage = { timeBasedToolResultMicrocompact: microCompactState };
    if (["global_session", "project_session"].includes(scope)) {
        const container = memory?.compaction || {};
        const compaction = container?.v2 || container;
        const receipt = container.toolResultContentReplacementReceipt
            || container.tool_result_content_replacement_receipt
            || compaction.toolResultContentReplacementReceipt
            || compaction.tool_result_content_replacement_receipt
            || null;
        if (receipt) {
            const sessionId = scope === "global_session"
                ? String(scopeId).replace(/^session:/, "")
                : String(scopeId).split("::").slice(1).join("::");
            const verification = (0, session_model_context_1.verifySessionModelContentReplacementReceipt)(receipt, {
                scope: scope === "global_session" ? "global" : "project",
                sessionId,
            });
            usage.toolResultContentReplacement = {
                schema: "ccm-memory-center-tool-result-content-replacement-v1",
                status: verification.valid ? (receipt.applied === true ? "applied" : "skipped") : "invalid_receipt",
                receiptValid: verification.valid,
                receiptIssues: verification.issues,
                replacementCount: Array.isArray(receipt.replacements) ? receipt.replacements.length : 0,
                rawLedgerPreserved: receipt.rawLedgerPreserved === true,
                receipt,
            };
        }
        return usage;
    }
    if (scope !== "group")
        return usage;
    const exact = parseGroupMemoryScopeId(scopeId, memory);
    const nativeProof = (0, group_compact_file_references_1.buildGroupApiMicrocompactNativeApplyProofSummary)(exact.groupId, {
        groupSessionId: exact.sessionId,
        targetProject: String(memory?.compaction?.apiMicroCompactEditPlan?.target_project || memory?.compaction?.apiMicroCompactEditPlan?.targetProject || ""),
        planChecksums: [
            memory?.compaction?.apiMicroCompactEditPlan?.planChecksum,
            memory?.compaction?.apiMicroCompactEditPlan?.plan_checksum,
        ].filter(Boolean),
    });
    const nativeReceiptTotals = nativeProof?.platform_execution_receipts?.totals || {};
    const nativeTelemetry = nativeProof?.request_telemetry || {};
    usage.apiMicrocompactNativeApplyProof = {
        ...nativeProof,
        platformExecutionNativeAppliedCount: Number(nativeReceiptTotals.native_applied || 0),
        platformExecutionRequestAcceptedCount: Number(nativeReceiptTotals.request_accepted || 0),
        platformExecutionNoEditsAppliedCount: Number(nativeReceiptTotals.no_edits_applied || 0),
        platformExecutionFailedCount: Number(nativeReceiptTotals.request_failed || nativeReceiptTotals.failed || 0),
        requestTelemetryStrongCount: Number(nativeTelemetry.strong_verified_count || 0),
    };
    const plan = memory?.compaction?.postCompactReinject
        || memory?.compactBoundary?.post_compact_restore?.reinjectionPlan
        || {};
    const expose = (key, receipt, verification, extra = {}) => {
        if (!receipt)
            return;
        usage[key] = {
            schema: "ccm-memory-center-post-compact-projection-v1",
            status: verification.valid === true ? "applied" : "invalid_receipt",
            receiptValid: verification.valid === true,
            receiptIssues: verification.issues || [],
            groupId: exact.groupId,
            groupSessionId: exact.sessionId,
            receipt,
            ...extra,
        };
    };
    expose("postCompactFileRestoreDedup", plan.preservedFileDedup, (0, group_compaction_projections_1.verifyGroupPostCompactFileRestoreDedupReceipt)(plan.preservedFileDedup, { groupId: exact.groupId, groupSessionId: exact.sessionId }));
    expose("postCompactInvokedSkillAttachment", plan.invokedSkillAttachmentReceipt, (0, group_compaction_projections_1.verifyGroupPostCompactInvokedSkillAttachmentReceipt)(plan.invokedSkillAttachmentReceipt, {
        groupId: exact.groupId,
        groupSessionId: exact.sessionId,
        attachments: plan.invokedSkillAttachments || [],
    }), { attachmentCount: Array.isArray(plan.invokedSkillAttachments) ? plan.invokedSkillAttachments.length : 0 });
    expose("postCompactPlanAttachment", plan.planAttachmentReceipt, (0, group_compaction_projections_1.verifyGroupPostCompactPlanAttachmentReceipt)(plan.planAttachmentReceipt, {
        groupId: exact.groupId,
        groupSessionId: exact.sessionId,
        attachment: plan.planAttachment || null,
    }), { attached: !!plan.planAttachment });
    expose("postCompactDynamicContextDelta", plan.dynamicContextDeltaReceipt, (0, group_compaction_projections_1.verifyGroupPostCompactDynamicContextDeltaReceipt)(plan.dynamicContextDeltaReceipt, {
        groupId: exact.groupId,
        groupSessionId: exact.sessionId,
        attachment: plan.dynamicContextDeltaAttachment || null,
    }), { attached: !!plan.dynamicContextDeltaAttachment });
    const taskStatusReceipt = memory?.compaction?.postCompactTaskStatusProjection
        || memory?.compactBoundary?.post_compact_restore?.postCompactTaskStatusProjection
        || null;
    expose("postCompactTaskStatusProjection", taskStatusReceipt, (0, group_compaction_projections_1.verifyGroupPostCompactTaskStatusProjectionReceipt)(taskStatusReceipt, {
        groupId: exact.groupId,
        groupSessionId: exact.sessionId,
        projectionChecksum: taskStatusReceipt?.projection_checksum || "",
    }), {
        itemCount: Number(taskStatusReceipt?.included_task_count || 0),
        tasks: (Array.isArray(plan.taskStatuses) ? plan.taskStatuses : []).map((row) => ({
            task_id: String(row?.task_id || row?.taskId || ""),
            status: String(row?.status || ""),
            value: String(row?.value || ""),
        })),
    });
    return usage;
}
function memoryCenterProviderContextCacheState(scope, scopeId, memory) {
    let binding = null;
    if (scope === "global_session") {
        const sessionId = String(scopeId || "").replace(/^session:/, "");
        binding = { scope: "global", scopeId: "global", sessionId };
    }
    else if (scope === "project_session") {
        const separator = String(scopeId || "").indexOf("::");
        const project = separator >= 0 ? String(scopeId).slice(0, separator) : "";
        const sessionId = separator >= 0 ? String(scopeId).slice(separator + 2) : "";
        if (project && sessionId)
            binding = { scope: "project", scopeId: project, sessionId };
    }
    else if (scope === "group") {
        const exact = parseGroupMemoryScopeId(scopeId, memory);
        if (exact.groupId && exact.sessionId.startsWith("gcs_"))
            binding = { scope: "group", scopeId: exact.groupId, sessionId: exact.sessionId };
    }
    if (!binding)
        return { applicable: false, status: "not_applicable" };
    const capability = (0, provider_cache_capability_registry_1.readProviderCacheCapabilityState)((0, group_orchestrator_config_1.loadOrchestratorConfig)());
    const state = (0, provider_neutral_context_cache_1.readLatestProviderNeutralContextCacheState)(binding);
    if (!state)
        return { applicable: true, status: "not_recorded", ...binding, capability };
    return {
        applicable: true,
        status: "recorded",
        contextEngineSchema: String(state.schema || "ccm-context-plan-state-v2"),
        contextEngineVersion: Number(state.version || 1),
        ...binding,
        provider: String(state.provider || ""),
        model: String(state.model || ""),
        executionMode: String(state.executionMode || ""),
        adapterKind: String(state.adapterKind || ""),
        capabilitySource: String(state.capabilitySource || ""),
        providerNative: ["native_api_context_management", "provider_prompt_cache", "provider_implicit_cache", "provider_explicit_cache"].includes(String(state.executionMode || "")),
        ccmControlledProjection: ["ccm_controlled_projection", "stable_prefix_cache"].includes(String(state.executionMode || "")),
        blockCount: Number(state.blockCount || 0),
        totalTokens: Number(state.totalTokens || 0),
        reusedBlockCount: Number(state.reusedBlockCount || 0),
        changedBlockCount: Number(state.changedBlockCount || 0),
        stablePrefixBlockCount: Number(state.stablePrefixBlockCount || 0),
        stablePrefixTokens: Number(state.stablePrefixTokens || 0),
        stablePrefixChecksum: String(state.stablePrefixChecksum || ""),
        dynamicSuffixChecksum: String(state.dynamicSuffixChecksum || ""),
        promptSegments: state.promptSegments || null,
        cacheLifecycle: state.cacheLifecycle || null,
        automaticCacheOptimization: state.automaticCacheOptimization || null,
        stableCoreChecksum: String(state.stableCoreChecksum || state.stablePrefixChecksum || ""),
        stableCoreTokens: Number(state.stableCoreTokens || state.stablePrefixTokens || 0),
        agentCacheStageMetrics: state.agentCacheStageMetrics || null,
        promptCacheKeyChecksum: String(state.promptCacheKeyChecksum || ""),
        requestClass: String(state.requestClass || "auxiliary"),
        prefixExtensionEligible: state.prefixExtensionEligible === true,
        prefixExtensionVerified: state.prefixExtensionVerified === true,
        adaptiveStablePrefix: state.adaptiveStablePrefix || null,
        materializationCache: state.materializationCache || null,
        downgradeReason: String(state.downgradeReason || ""),
        projectedContentReplacementDetected: state.projectedContentReplacementDetected === true,
        lastRequestStatus: String(state.lastRequestStatus || "prepared"),
        providerInputTokens: Number(state.providerInputTokens || 0),
        cacheCreationInputTokens: Number(state.cacheCreationInputTokens || 0),
        cacheReadInputTokens: Number(state.cacheReadInputTokens || 0),
        cacheDeletedInputTokens: Number(state.cacheDeletedInputTokens || 0),
        cacheCreation5mInputTokens: Number(state.cacheCreation5mInputTokens || 0),
        cacheCreation1hInputTokens: Number(state.cacheCreation1hInputTokens || 0),
        cacheHitRate: Number(state.cacheHitRate || 0),
        cacheMissReason: String(state.cacheMissReason || ""),
        cacheWarmState: String(state.cacheWarmState || "cold"),
        providerRoutingMissStreak: Number(state.providerRoutingMissStreak || 0),
        stablePrefixChangeReasons: Array.isArray(state.stablePrefixChangeReasons) ? state.stablePrefixChangeReasons.map(String).slice(0, 12) : [],
        breakpointChecksums: Array.isArray(state.breakpointChecksums) ? state.breakpointChecksums.map(String).slice(0, 4) : [],
        cacheStrategy: state.cacheStrategy || null,
        projectionDurationMs: Number(state.projectionDurationMs || 0),
        providerLatencyMs: Number(state.providerLatencyMs || 0),
        reportedCostUsd: Number(state.reportedCostUsd || 0),
        estimatedInputCostUsd: Number(state.estimatedInputCostUsd || 0),
        costSource: String(state.costSource || "unavailable"),
        rollingMetrics: state.rollingMetrics || null,
        cacheRecommendation: state.cacheRecommendation || null,
        tokenGate: state.tokenGate || null,
        blockChanges: state.blockChanges || null,
        capability,
        adapterEvidence: state.adapterEvidence || null,
        lastError: String(state.lastError || ""),
        rawTranscriptPreserved: true,
        contentStored: false,
        planChecksum: String(state.contextPlanChecksum || state.planChecksum || ""),
        contextIdentityChecksum: String(state.contextIdentityChecksum || ""),
        updatedAt: String(state.updatedAt || ""),
    };
}
function memorySummary(scope, scopeId, memory, label, options = {}) {
    const groupScope = scope === "group" ? parseGroupMemoryScopeId(scopeId, memory) : null;
    const controls = (0, memory_control_center_controls_1.scopeControls)(scope, scopeId);
    const alerts = healthAlerts(scope, scopeId, memory);
    const compactionContainer = memory?.compaction || {};
    const compaction = compactionContainer?.v2 || compactionContainer;
    const exactGroupSessionMemoryId = groupScope?.sessionId && groupScope.sessionId !== "default"
        ? `${groupScope.groupId}--${groupScope.sessionId}`
        : groupScope?.groupId || scopeId;
    const sessionMemory = scope === "group"
        ? (0, memory_control_center_types_1.readGroupSessionMemorySnapshotForCenter)(exactGroupSessionMemoryId)
        : compaction.sessionMemoryState || compaction.session_memory_state || null;
    const toolContinuity = scope === "group" ? (0, memory_control_center_types_1.readGroupToolContinuitySnapshotForCenter)(exactGroupSessionMemoryId) : null;
    const microCompactState = memoryCenterMicroCompactState(scope, scopeId, memory);
    const canonicalGroupSessionMemory = scope === "group"
        && sessionMemory?.modelExtracted === true
        && sessionMemory?.hasSummary === true
        && sessionMemory?.markdownExists === true
        && sessionMemory?.markdownChecksumMatches === true;
    const tokenState = resolveMemoryCenterTokenState(scope, scopeId, memory);
    const canonicalAccounting = currentCanonicalContextAccounting(scope, scopeId, memory);
    const selectedAccounting = selectMemoryCenterContextAccounting({
        scope,
        canonical: canonicalAccounting,
    });
    const modelVisiblePayload = selectedAccounting.payload;
    const completeAccounting = isCompleteMemoryCenterContextAccounting(modelVisiblePayload);
    const providerMeasuredInputTokens = canonicalAccounting?.measurementSource === "provider_reported"
        ? Math.max(0, Number(canonicalAccounting?.providerObservedInputTokens || 0))
        : 0;
    const currentTokens = providerMeasuredInputTokens > 0
        ? providerMeasuredInputTokens
        : completeAccounting
            ? Number(modelVisiblePayload.predictedNextRequestTokens || modelVisiblePayload.predicted_next_request_tokens || modelVisiblePayload.totalTokens || modelVisiblePayload.total_tokens || 0)
            : 0;
    const tokenSource = providerMeasuredInputTokens > 0
        ? "provider_usage"
        : completeAccounting ? "canonical_payload_estimate" : "unavailable";
    const tokenUpdatedAt = String(canonicalAccounting?.recordedAt || "");
    const remainingTokens = Math.max(0, tokenState.effectiveContextWindow - currentTokens);
    const tokenPressure = tokenState.effectiveContextWindow > 0
        ? Math.min(100, Math.round((currentTokens / tokenState.effectiveContextWindow) * 1000) / 10)
        : tokenState.tokenPressure;
    const compactionActivity = currentCompactionActivity(scope, scopeId, memory);
    const engineScope = scope === "global_session" ? "global" : scope === "project_session" ? "project" : scope;
    const projectScopeId = String(memory?.project || (scopeId.includes("::") ? scopeId.slice(0, scopeId.indexOf("::")) : scopeId));
    const engineScopeId = scope === "group" ? String(groupScope?.groupId || scopeId) : scope === "project" || scope === "project_session" ? projectScopeId : scopeId;
    const engineSessionId = scope === "group"
        ? String(groupScope?.sessionId || "")
        : scope === "project_session" ? (0, memory_control_center_types_1.cleanId)(scopeId.includes("::") ? scopeId.slice(scopeId.indexOf("::") + 2) : "")
            : scope === "global_session" ? scopeId.replace(/^session:/, "")
                : String(compaction.sessionId || compaction.session_id || memory?.sessionId || memory?.session_id || scopeId);
    const postTurnScopeId = engineScope === "global" ? "global" : engineScopeId;
    const postTurnToolContextState = ["global", "group", "project"].includes(engineScope) && engineSessionId
        ? (0, post_turn_tool_context_compaction_1.loadPostTurnToolContextState)(engineScope, postTurnScopeId, engineSessionId)
        : null;
    const preRequestToolContextState = ["global", "group", "project"].includes(engineScope) && engineSessionId
        ? (0, pre_request_tool_context_1.loadPreRequestToolContextState)(engineScope, postTurnScopeId, engineSessionId)
        : null;
    const preRequestToolContextEvaluation = preRequestToolContextState?.lastEvaluation || null;
    const contextRetentionMetrics = null;
    const retainedNextRequestTokens = preRequestToolContextEvaluation
        ? Math.max(0, Number(preRequestToolContextEvaluation.tokensAfter || canonicalAccounting?.predictedNextRequestTokens || currentTokens))
        : Number(canonicalAccounting?.predictedNextRequestTokens || currentTokens);
    const providerMicrocompact = ["global", "group", "project"].includes(engineScope) && engineSessionId
        ? (0, provider_microcompact_1.readCcmProviderMicrocompactReceipt)(engineScope, engineScopeId, engineSessionId)
        : null;
    const compactionHookReceipts = ["global", "group", "project"].includes(engineScope) && engineSessionId
        ? (0, session_compaction_command_hooks_1.readSessionCompactionCommandHookReceipts)(engineScope, engineScope === "group" ? `${String(groupScope?.groupId || "")}:${engineSessionId}` : engineScope === "project" ? `${String(memory?.project || (scopeId.includes("::") ? scopeId.slice(0, scopeId.indexOf("::")) : engineScopeId) || "")}:${engineSessionId}` : engineSessionId)
        : [];
    const sessionStartHookContext = ["global", "group", "project"].includes(engineScope) && engineSessionId
        ? (0, session_start_hook_context_1.readSessionStartHookContextReceipt)(engineScope, engineScope === "group"
            ? `${String(groupScope?.groupId || "")}:${engineSessionId}`
            : engineScope === "project"
                ? `${String(memory?.project || (scopeId.includes("::") ? scopeId.slice(0, scopeId.indexOf("::")) : engineScopeId) || "")}:${engineSessionId}`
                : engineSessionId)
        : null;
    const tokenBasisSelection = canonicalAccounting && ["global", "group", "project"].includes(engineScope) && engineSessionId
        ? (0, session_memory_token_basis_1.selectCanonicalSessionMemoryTokenBasis)(canonicalAccounting, {
            scope: engineScope,
            exactSessionId: engineSessionId,
            boundaryGeneration: Number(canonicalAccounting.boundaryGeneration || 0),
        })
        : { valid: false, issues: ["canonical_receipt_missing"], basis: null };
    const contextEngineTrends = ["global", "group", "project", "music"].includes(engineScope) && engineSessionId
        ? (0, context_engine_observability_1.readContextEngineTrends)({ scope: engineScope, scopeId: engineScopeId, sessionId: engineSessionId, limit: 100 })
        : null;
    let recoveryPoints = [];
    if (["global", "group", "project", "music"].includes(engineScope) && engineSessionId) {
        try {
            recoveryPoints = (0, context_engine_recovery_1.listContextEngineRecoveryPoints)({ scope: engineScope, scopeId: engineScopeId, sessionId: engineSessionId });
        }
        catch { }
    }
    const unifiedState = ["global", "group", "project"].includes(engineScope)
        ? { receipt: memory?.unifiedSessionCompaction || null, stateV1: (0, unified_session_compaction_1.projectUnifiedSessionCompactionState)(memory?.unifiedSessionCompaction || memory?.unified_session_compaction) }
        : null;
    const unifiedCompaction = (0, unified_session_compaction_1.projectUnifiedCompactionReceipt)(unifiedState?.receipt || null, compaction.summaryQuality || compaction.summary_quality || compactionContainer.summary_quality || null);
    const storedMeasurement = canonicalAccounting || {};
    const estimatedNewInputTokens = tokenSource === "provider_usage"
        ? Math.max(0, Number(storedMeasurement.estimatedNewInputTokens ?? storedMeasurement.estimatedTokensAfterUsage ?? 0))
        : 0;
    const measuredCurrentInputTokens = tokenSource === "provider_usage"
        ? Math.max(0, currentTokens - estimatedNewInputTokens)
        : currentTokens;
    return {
        scope, id: scopeId, label, health: alerts.some(item => item.severity === "critical") ? "critical" : alerts.length ? "warning" : "healthy",
        groupId: groupScope?.groupId || "",
        groupSessionId: groupScope?.sessionId || "",
        alerts: alerts.length,
        pinned: controls.filter((item) => item.pinned && !item.deprecated).length,
        edited: controls.filter((item) => item.editedText !== undefined && !item.deprecated).length,
        deprecated: controls.filter((item) => item.deprecated).length,
        tokenPressure,
        currentTokens,
        currentMessageCount: tokenState.currentMessageCount,
        tokenSource,
        tokenUpdatedAt,
        compacting: compactionActivity.active === true,
        compactionActivity,
        autoCompactThreshold: tokenState.autoCompactThreshold,
        remainingTokens,
        effectiveContextWindow: tokenState.effectiveContextWindow,
        contextCapacity: tokenState.capacity || (0, ccm_context_accounting_v2_1.normalizeCcmContextCapacity)({
            ...tokenState,
            rawWindowTokens: tokenState.effectiveContextWindow,
            source: "conservative_fallback",
        }),
        preCompactPressure: Number(compaction.pressurePercent || 0),
        beforeTokens: Number(compaction.preCompactTokenCount ?? compactionContainer.before_tokens ?? 0),
        afterTokens: Number(compaction.postCompactTokenCount ?? compactionContainer.after_tokens ?? compaction.postCompactGate?.afterTokens ?? 0),
        summarySource: String(memory?.summarySource || compactionContainer?.summary_source || compactionContainer?.summarySource || (compaction.activeSummary ? "model" : canonicalGroupSessionMemory ? "session_memory" : "")),
        preservedRecentTokens: Number(compaction.preservedRecentTokens
            ?? compaction.preserved_recent_token_count
            ?? compaction.compactStrategyDecision?.preservedSegment?.preservedTokenEstimate
            ?? compaction.compact_strategy_decision?.preserved_segment?.preserved_token_estimate
            ?? 0),
        preservedRecentMessages: Number((compaction.preservedRecentMessageIds || compaction.preserved_recent_message_ids || []).length
            || compaction.compactStrategyDecision?.preservedSegment?.preservedMessageCount
            || compaction.compact_strategy_decision?.preserved_segment?.preserved_message_count
            || compaction.preservedRecentMessages
            || 0),
        // circuitOpen 必须反映「真正阻断自动压缩的硬熔断台账」，而不是
        // compaction.consecutiveFailures（那是模型摘要回退确定性算法的软计数，
        // 压缩本身其实成功了）。两者分开上报，避免互相冒充。
        ...(0, group_memory_auto_compact_circuit_policy_1.buildAutoCompactCircuitDisplayState)({
            autoCompactCircuitBreaker: compaction.autoCompactCircuitBreaker
                || compaction.auto_compact_circuit_breaker
                || memory?.finalDispatchReactiveCompactCircuitBreaker
                || {},
            summaryFallbackFailures: Number(compaction.consecutiveFailures ?? compaction.consecutive_failures ?? 0),
            summaryFallbackLimit: 3,
        }),
        consecutiveFailures: Number(compaction.consecutiveFailures ?? compaction.consecutive_failures ?? memory?.finalDispatchReactiveCompactCircuitBreaker?.consecutive_failures ?? 0),
        postCompactGate: compaction.postCompactGate || compaction.post_compact_gate || compactionContainer.post_compact_gate || null,
        tokenMeasurement: compaction.tokenMeasurement || compaction.token_measurement || compactionContainer.token_measurement || tokenState.fallbackTokenMeasurement || null,
        measurement: {
            schema: "ccm-context-measurement-v2",
            source: String(tokenSource === "provider_usage" ? "provider_reported" : tokenSource === "unavailable" ? "unavailable" : "model_visible_estimate"),
            precision: String(canonicalAccounting?.precision || (tokenSource === "unavailable" ? "unavailable" : "estimated")),
            measurementBasis: String(tokenSource === "provider_usage" ? "exact_payload_usage" : tokenSource === "unavailable" ? "unavailable" : "local_payload_prediction"),
            currentInputTokens: measuredCurrentInputTokens,
            outputTokens: Number(canonicalAccounting?.outputTokens || 0),
            estimatedNewInputTokens,
            totalModelVisibleTokens: currentTokens,
            lastProviderObservedTokens: Number(canonicalAccounting?.providerObservedInputTokens || providerMeasuredInputTokens || 0),
            predictedNextRequestTokens: retainedNextRequestTokens,
            providerIdentityChecksum: String(canonicalAccounting?.endpointIdentityChecksum || ""),
            generation: Number(canonicalAccounting?.generation ?? 0),
            boundaryGeneration: Number(canonicalAccounting?.boundaryGeneration ?? 0),
            payloadChecksum: String(canonicalAccounting?.payloadChecksum || modelVisiblePayload?.payloadChecksum || modelVisiblePayload?.payload_checksum || ""),
            updatedAt: tokenUpdatedAt,
        },
        // Never expose the model-visible body through Memory Center. Keep only
        // token buckets, checksums and loaded-item metadata.
        modelVisiblePayload: {
            ...(0, session_compaction_core_1.modelVisiblePayloadAccounting)(modelVisiblePayload),
            ...(preRequestToolContextEvaluation ? { preRequestToolContextEvaluation } : {}),
        },
        contextRetentionMetrics,
        preRequestToolContextEvaluation,
        legacyToolContextEvidence: postTurnToolContextState ? {
            schema: postTurnToolContextState.schema,
            evidenceCount: Array.isArray(postTurnToolContextState.evidence) ? postTurnToolContextState.evidence.length : 0,
            receiptCount: Array.isArray(postTurnToolContextState.receipts) ? postTurnToolContextState.receipts.length : 0,
            compatibilityOnly: true,
            contentStored: false,
        } : null,
        canonicalContextAccounting: canonicalAccounting ? {
            schema: canonicalAccounting.schema,
            scope: canonicalAccounting.scope,
            scopeId: canonicalAccounting.scopeId,
            exactSessionId: canonicalAccounting.exactSessionId,
            provider: canonicalAccounting.provider,
            model: canonicalAccounting.model,
            protocol: canonicalAccounting.protocol,
            endpointIdentityChecksum: canonicalAccounting.endpointIdentityChecksum,
            generation: canonicalAccounting.generation,
            boundaryGeneration: canonicalAccounting.boundaryGeneration,
            payloadChecksum: canonicalAccounting.payloadChecksum,
            fixedContextChecksum: canonicalAccounting.fixedContextChecksum,
            requestPhase: canonicalAccounting.requestPhase,
            measurementSource: canonicalAccounting.measurementSource,
            precision: canonicalAccounting.precision,
            estimatedInputTokens: canonicalAccounting.estimatedInputTokens,
            providerObservedInputTokens: canonicalAccounting.providerObservedInputTokens || 0,
            outputTokens: canonicalAccounting.outputTokens,
            predictedNextRequestTokens: canonicalAccounting.predictedNextRequestTokens,
            recordedAt: canonicalAccounting.recordedAt,
            contentStored: false,
        } : null,
        sessionMemoryTokenBasis: tokenBasisSelection.basis ? {
            ...tokenBasisSelection.basis,
            label: tokenBasisSelection.basis.source === "provider_reported" ? "Provider实测" : "canonical本地估算",
        } : null,
        providerMicrocompact: providerMicrocompact ? {
            schema: providerMicrocompact.schema,
            mode: providerMicrocompact.mode,
            provider: providerMicrocompact.provider,
            payloadChecksum: providerMicrocompact.payloadChecksum,
            requestPatchChecksum: providerMicrocompact.requestPatchChecksum || "",
            providerOutcomeVerified: providerMicrocompact.providerOutcomeVerified,
            clearedToolCallCount: providerMicrocompact.clearedToolCallIds.length,
            scopeId: providerMicrocompact.scopeId,
            baselineCacheDeletedTokens: providerMicrocompact.baselineCacheDeletedTokens,
            cumulativeCacheDeletedTokens: providerMicrocompact.cumulativeCacheDeletedTokens,
            deletedTokensDelta: providerMicrocompact.deletedTokensDelta,
            boundaryEventId: providerMicrocompact.boundaryEventId || "",
            historicalDeltaUnrecorded: false,
            reason: providerMicrocompact.reason,
            recordedAt: providerMicrocompact.recordedAt,
            contentStored: false,
        } : null,
        availableContextCatalog: buildAvailableContextCatalog(scope, scopeId, memory, modelVisiblePayload),
        resolvedModelCapacity: compaction.resolvedModelCapacity || compaction.resolved_model_capacity || compactionContainer.resolved_model_capacity || memory?.model?.modelContextCapacity || null,
        pendingRequestTokens: Number(compaction.pendingRequestTokens ?? compaction.pending_request_tokens ?? compactionContainer.pending_request_tokens ?? 0),
        recoveryContextTokens: Number(compaction.recoveryContextTokens ?? compaction.recovery_context_tokens ?? compactionContainer.recovery_context_tokens ?? 0),
        hookResultTokens: Number(compaction.hookResultTokens ?? compaction.hook_result_tokens ?? compactionContainer.hook_result_tokens ?? 0),
        ptlRecoveryAttempts: Number(compaction.ptlRecoveryAttempts ?? compaction.ptl_recovery_attempts ?? compactionContainer.ptl_recovery_attempts ?? 0),
        boundaryGeneration: Number(compaction.boundaryGeneration ?? compaction.boundary_generation ?? 0),
        microCompact: microCompactState,
        // Safe projection only: no summary body, recovery JSON, prompts, source or stdout.
        unifiedCompaction,
        unifiedCompactionState: unifiedState?.stateV1 || null,
        compactionMode: unifiedState?.stateV1?.compactionMode || "full",
        compactionExecutionPath: unifiedState?.stateV1?.executionPath || "none",
        compactionRunId: unifiedState?.stateV1?.compactionRunId || "",
        partialCompaction: unifiedState?.stateV1?.partialCompaction ? {
            schema: unifiedState.stateV1.partialCompaction.schema,
            direction: unifiedState.stateV1.partialCompaction.direction,
            pivotMessageId: unifiedState.stateV1.partialCompaction.pivotMessageId,
            summarizedMessageCount: unifiedState.stateV1.partialCompaction.summarizedMessageIds?.length || 0,
            preservedMessageCount: unifiedState.stateV1.partialCompaction.preservedMessageIds?.length || 0,
            filteredMessageCount: unifiedState.stateV1.partialCompaction.filteredMessageIds?.length || 0,
            contentStored: false,
        } : null,
        compactionHooks: {
            configuredLifecycle: true,
            runs: compactionHookReceipts.length,
            successCount: compactionHookReceipts.flatMap((row) => row.results || []).filter((row) => row.status === "success").length,
            warningCount: compactionHookReceipts.flatMap((row) => row.results || []).filter((row) => row.status === "warning").length,
            timeoutCount: compactionHookReceipts.flatMap((row) => row.results || []).filter((row) => String(row.reason || "").includes("timeout")).length,
            phases: Array.from(new Set(compactionHookReceipts.map((row) => String(row.phase || "")).filter(Boolean))),
            contentStored: false,
        },
        sessionStartHookContext,
        providerContextCache: memoryCenterProviderContextCacheState(scope, scopeId, memory),
        contextEngineTrends,
        contextEngineRecovery: {
            schema: "ccm-context-engine-recovery-summary-v1",
            count: recoveryPoints.length,
            latest: recoveryPoints[0] || null,
            points: recoveryPoints.slice(0, 10),
            contentStored: false,
        },
        summaryQuality: compaction.summaryQuality || compaction.summary_quality || compactionContainer.summary_quality || compaction.modelMetadata?.summaryQuality || null,
        secondaryReview: compaction.secondaryReview || compaction.secondary_review || compactionContainer.secondary_review || compaction.modelMetadata?.secondaryReview || null,
        postCompactUsage: memoryCenterPostCompactUsage(scope, scopeId, memory, microCompactState),
        longTermMemory: scope === "project" ? {
            schema: memory?.memoryPolicy?.schema || "legacy_project_memory",
            durableCount: Array.isArray(memory?.durableMemories) ? memory.durableMemories.length : 0,
            activeCount: (Array.isArray(memory?.durableMemories) ? memory.durableMemories : []).filter((item) => !["resolved", "superseded"].includes(String(item?.status || "active"))).length,
            taskHistoryCount: Array.isArray(memory?.taskHistory) ? memory.taskHistory.length : 0,
            legacyConclusionCount: (Array.isArray(memory?.conclusions) ? memory.conclusions.length : 0)
                + (Array.isArray(memory?.conclusionArchives) ? memory.conclusionArchives.reduce((sum, item) => sum + Number(item?.count || 0), 0) : 0),
            writePolicy: memory?.memoryPolicy?.durableMemoryRequiresAcceptedDoneReceipt === true ? "accepted_delivery_only" : "legacy",
            taskHistoryInjectedByDefault: memory?.memoryPolicy?.taskHistoryInjectedByDefault === true,
            lastAdmission: memory?.lastMemoryAdmission || null,
        } : null,
        updatedAt: memory?.updated_at || memory?.updatedAt || compaction.lastCompactedAt || "",
        sessionMemory: sessionMemory ? {
            status: scope === "group"
                ? (sessionMemory.modelExtracted === true
                    && sessionMemory.hasSummary === true
                    && sessionMemory.markdownExists === true
                    && sessionMemory.markdownChecksumMatches === true
                    ? "ready"
                    : sessionMemory.modelExtracted === true
                        ? "invalid"
                        : sessionMemory.deterministicFallback === true
                            ? "waiting_model"
                            : sessionMemory.updateCadence?.status || sessionMemory.status || "waiting")
                : (sessionMemory.summary || sessionMemory.hasSummary ? "ready" : sessionMemory.status || "waiting"),
            source: sessionMemory.extractionSource || sessionMemory.sourceType || sessionMemory.source_type || "",
            updatedAt: sessionMemory.updatedAt || sessionMemory.updated_at || "",
            tokensAtLastExtraction: Number(sessionMemory.tokensAtLastExtraction || sessionMemory.tokens_at_last_extraction || 0),
            summaryFile: sessionMemory.summaryFile || sessionMemory.summary_file || "",
            snapshotFile: sessionMemory.snapshotFile || sessionMemory.snapshot_file || "",
            hasSummary: sessionMemory.hasSummary === true,
            canonical: scope === "group"
                ? sessionMemory.modelExtracted === true
                    && sessionMemory.hasSummary === true
                    && sessionMemory.markdownExists === true
                    && sessionMemory.markdownChecksumMatches === true
                : !!(sessionMemory.summary || sessionMemory.hasSummary),
            modelExtracted: sessionMemory.modelExtracted === true,
            sharedExtractionCore: sessionMemory?.rollingSessionMemory?.extractionCore === "ccm_shared" || sessionMemory?.extractionCore === "ccm_shared",
            deterministicFallback: sessionMemory.deterministicFallback === true,
            markdownExists: sessionMemory.markdownExists === true,
            markdownChecksumMatches: sessionMemory.markdownChecksumMatches === true,
        } : null,
        toolContinuity: toolContinuity ? {
            summaryFile: toolContinuity.summaryFile || toolContinuity.summary_file || "",
            snapshotFile: toolContinuity.snapshotFile || toolContinuity.snapshot_file || "",
            status: toolContinuity.status || "empty",
            markdownExists: toolContinuity.markdownExists === true,
            markdownChecksumMatches: toolContinuity.markdownChecksumMatches === true,
            allowedCount: Number((toolContinuity.allowedTools?.mcp || []).length + (toolContinuity.allowedTools?.skill || []).length),
            missingCount: Number((toolContinuity.missing?.mcp || []).length + (toolContinuity.missing?.skill || []).length),
            invokedSkillCount: Number((toolContinuity.invokedSkills || []).length),
            shouldBypassAuthorization: toolContinuity.shouldBypassAuthorization === true,
        } : null,
    };
}
function readableGlobalSessionSummary(value) {
    if (typeof value === "string")
        return value.trim();
    if (!value || typeof value !== "object")
        return "";
    const compactValue = (input, max = 1800) => {
        const text = String(input || "").trim().replace(/^#[a-zA-Z0-9._:-]+\s+/, "");
        return text.length > max ? `${text.slice(0, max)}…` : text;
    };
    const list = (input, limit = 8) => (Array.isArray(input) ? input : [])
        .map(item => compactValue(item, 500))
        .filter(Boolean)
        .slice(-limit)
        .join("；");
    const sections = [
        ["主要目标", compactValue(value.primaryRequest)],
        ["近期要求", list(value.userRequests)],
        ["关键决策", list(value.decisions)],
        ["未完成事项", list(value.unresolved)],
        ["授权", list(value.authorization)],
        ["反馈", list(value.feedback)],
        ["文件与资源", list(value.filesAndResources)],
        ["最新结果", compactValue(value.latestOutcome)],
    ].filter(([, text]) => text);
    if (sections.length)
        return sections.map(([label, text]) => `${label}：${text}`).join("\n");
    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return "结构化会话摘要";
    }
}
function messageTextForMemoryCenter(message) {
    const value = message?.content ?? message?.text ?? message?.message ?? "";
    if (typeof value === "string")
        return value.trim();
    if (Array.isArray(value))
        return value.map(item => {
            if (typeof item === "string")
                return item;
            return String(item?.text || item?.content || "");
        }).filter(Boolean).join("\n").trim();
    try {
        return JSON.stringify(value);
    }
    catch {
        return String(value || "");
    }
}
function recentSessionMessagesForMemoryCenter(scope, scopeId, memory) {
    let messages = [];
    try {
        if (scope === "group") {
            const exact = parseGroupMemoryScopeId(scopeId, memory);
            if (exact.sessionId !== "default")
                messages = require("../collaboration/storage").getGroupMessages(exact.groupId, exact.sessionId) || [];
        }
        else if (scope === "global_session") {
            messages = require("../../agents/global/memory").loadGlobalAgentTranscript(scopeId.replace(/^session:/, ""))?.messages || [];
        }
        else if (scope === "project_session") {
            messages = memory?.history || memory?.messages || [];
        }
        else if (scope === "task_agent") {
            messages = memory?.history || memory?.messages || memory?.transcript || [];
        }
    }
    catch { }
    if (!Array.isArray(messages) || !messages.length)
        return [];
    const compaction = memory?.compaction?.v2 || memory?.compaction || {};
    const preservedIds = compaction.preservedRecentMessageIds
        || compaction.preserved_recent_message_ids
        || compaction.compactStrategyDecision?.preservedSegment?.preservedMessageIds
        || compaction.compact_strategy_decision?.preserved_segment?.preserved_message_ids
        || [];
    let visible = messages;
    if (Array.isArray(preservedIds) && preservedIds.length) {
        const ids = new Set(preservedIds.map((id) => String(id)));
        const selected = messages.filter(message => ids.has(String(message?.id || message?.messageId || message?.uuid || "")));
        if (selected.length)
            visible = selected;
    }
    else {
        const lastCompactedIndex = Number(compaction.lastCompactedIndex ?? memory?.lastCompactedIndex ?? -1);
        if (lastCompactedIndex >= 0)
            visible = messages.slice(lastCompactedIndex + 1);
    }
    return visible.filter(message => messageTextForMemoryCenter(message)).slice(-20);
}
function appendSessionContinuityItems(groups, scope, scopeId, memory) {
    const isExactGroupSession = scope === "group" && parseGroupMemoryScopeId(scopeId, memory).sessionId !== "default";
    if (!isExactGroupSession && !["global_session", "project_session", "task_agent"].includes(scope))
        return;
    const compaction = memory?.compaction?.v2 || memory?.compaction || {};
    let activeSummaryValue = memory?.unifiedSessionSummary || compaction.activeSummary || memory?.summary || memory?.conversationSummary || "";
    let summarySource = String(memory?.summarySource || memory?.summary_source || compaction.summarySource || compaction.summary_source || "").toLowerCase();
    if (isExactGroupSession && !activeSummaryValue) {
        const exact = parseGroupMemoryScopeId(scopeId, memory);
        const sessionMemory = (0, memory_control_center_types_1.readGroupSessionMemorySnapshotForCenter)(`${exact.groupId}--${exact.sessionId}`);
        const canonicalSessionMemory = sessionMemory.modelExtracted === true
            && sessionMemory.hasSummary === true
            && sessionMemory.markdownExists === true
            && sessionMemory.markdownChecksumMatches === true;
        if (canonicalSessionMemory) {
            activeSummaryValue = sessionMemory.markdownExcerpt || "";
            summarySource = "session_memory";
        }
    }
    // Session summaries are model-continuity material, not Memory Center
    // content. Expose only a safe receipt marker; the original transcript and
    // task ledger remain available to the authorized runtime.
    const activeSummary = activeSummaryValue ? "已保留会话压缩摘要（正文按需由运行时恢复）" : "";
    const canonicalSummary = ["model", "session_memory", "session-memory"].includes(summarySource);
    if (activeSummary)
        groups.push({
            type: canonicalSummary ? "sessionSummary" : "legacySessionSummary",
            items: [{
                    itemId: `session-summary:${scopeId}`,
                    type: canonicalSummary ? "sessionSummary" : "legacySessionSummary",
                    text: activeSummary,
                    originalText: "",
                    pinned: false,
                    deprecated: false,
                    readOnly: true,
                    evidence: {
                        sessionId: scope === "global_session" ? scopeId.replace(/^session:/, "") : scopeId,
                        messageId: compaction.lastCompactedMessageId || "",
                        time: compaction.lastCompactedAt || memory?.lastCompactedAt || "",
                    },
                    raw: { checksum: compaction.activeSummaryChecksum || compaction.summaryChecksum || "", summarySource, canonical: canonicalSummary, contentStored: false },
                }],
        });
    const recent = recentSessionMessagesForMemoryCenter(scope, scopeId, memory);
    if (recent.length)
        groups.push({
            type: "recentMessages",
            items: recent.map((message, index) => {
                const role = String(message?.role || message?.type || "message").toLowerCase();
                const actor = role === "user" ? "用户" : role === "assistant" ? "Agent" : role === "system" ? "系统" : role;
                return {
                    itemId: `recent-message:${message?.id || message?.messageId || message?.uuid || index}`,
                    type: "recentMessages",
                    text: `${actor}：${messageTextForMemoryCenter(message)}`,
                    originalText: messageTextForMemoryCenter(message),
                    pinned: false,
                    deprecated: false,
                    readOnly: true,
                    evidence: {
                        groupId: message?.groupId || "",
                        sessionId: scopeId,
                        messageId: message?.id || message?.messageId || message?.uuid || "",
                        time: message?.timestamp || message?.createdAt || message?.created_at || "",
                    },
                    raw: message,
                };
            }),
        });
    if (scope === "global_session")
        groups.push({
            type: "sessionArchives",
            items: (memory?.archives || []).map((archive, index) => ({
                itemId: (0, memory_control_center_controls_1.getMemoryItemId)("sessionArchives", archive, index),
                type: "sessionArchives",
                archived: true,
                archiveId: archive.id,
                text: `会话 ${archive.sessionId}：${archive.summary?.primaryRequest || "历史压缩段"}（${archive.count || 0} 条）`,
                originalText: archive.summary?.latestOutcome || "",
                pinned: false,
                deprecated: false,
                readOnly: true,
                evidence: { sessionId: archive.sessionId, messageId: archive.summary?.sourceMessageIds?.[0] || "", time: archive.from || "" },
                raw: archive,
            })),
        });
}
function collectItems(scope, scopeId, memory) {
    const groupScope = scope === "group" ? parseGroupMemoryScopeId(scopeId, memory) : null;
    const controls = (0, memory_control_center_controls_1.scopeControls)(scope, scopeId);
    const groups = [];
    const exactSessionScope = ["global_session", "project_session", "task_agent"].includes(scope);
    const keys = exactSessionScope ? []
        : scope === "group" ? ["persistentRequirements", "factAnchors", "decisions", "completed", "blocked", "workerLedger", "openQuestions", "nextActions"]
            : scope === "project" ? ["durableMemories"]
                : ["user", "feedback", "authorization", "decisions", "missions", "unresolved", "references"];
    for (const key of keys) {
        const values = Array.isArray(memory?.[key]) ? memory[key] : [];
        groups.push({
            type: key,
            items: values.map((item, index) => {
                const itemId = (0, memory_control_center_controls_1.getMemoryItemId)(key, item, index);
                const control = controls.find((entry) => entry.itemType === key && entry.itemId === itemId);
                return {
                    itemId, type: key, text: control?.editedText !== undefined ? control.editedText : (0, memory_control_center_controls_1.itemText)(key, item),
                    originalText: (0, memory_control_center_controls_1.itemText)(key, item), pinned: !!control?.pinned, deprecated: !!control?.deprecated,
                    reason: control?.reason || "", updatedAt: control?.updatedAt || "",
                    evidence: {
                        groupId: item?.groupId || groupScope?.groupId || "",
                        messageId: item?.messageId || item?.source?.messageIds?.[0] || "",
                        taskId: item?.taskId || item?.source?.taskId || "",
                        sessionId: item?.source?.sessionId || groupScope?.sessionId || "",
                        missionId: item?.source?.missionId || "",
                        time: item?.updatedAt || item?.time || item?.timestamp || item?.source?.timestamp || "",
                    },
                    extraction_source: item?.extractionSource || item?.extraction_source || (scope === "global" ? "legacy_unverified" : ""),
                    evidence_message_ids: item?.evidenceMessageIds || item?.evidence_message_ids || item?.source?.messageIds || [],
                    semantic_status: item?.semanticStatus || item?.semantic_status || (scope === "global" ? "legacy_unverified" : "confirmed"),
                    legacy_unverified: (item?.semanticStatus || item?.semantic_status || (scope === "global" ? "legacy_unverified" : "confirmed")) === "legacy_unverified",
                    semantic_decision_receipt: item?.semanticDecisionReceipt || item?.semantic_decision_receipt || null,
                    raw: item,
                };
            }),
        });
    }
    appendSessionContinuityItems(groups, scope, scopeId, memory);
    return groups;
}
function getMemoryCenterScope(scope, scopeId) {
    const file = scopeFile(scope, scopeId);
    let virtualGroupMemory = null;
    if (scope === "group" && file && !fs.existsSync(file)) {
        const exact = parseGroupMemoryScopeId(scopeId);
        try {
            const session = (require("../collaboration/storage").listGroupChatSessions(exact.groupId).sessions || [])
                .find((item) => String(item.id || "") === exact.sessionId);
            if (session)
                virtualGroupMemory = { groupId: exact.groupId, groupSessionId: exact.sessionId, compaction: {}, virtualSession: true };
        }
        catch { }
    }
    if ((!file || !fs.existsSync(file)) && !virtualGroupMemory)
        throw new Error("记忆不存在");
    let rawMemory;
    if (scope === "global")
        rawMemory = require("../../agents/global/memory").loadGlobalAgentMemory({ recover: false });
    else if (scope === "global_session") {
        const globalMemory = require("../../agents/global/memory").loadGlobalAgentMemory({ recover: false });
        const sessionId = scopeId.replace(/^session:/, "");
        const session = (globalMemory.sessions || []).find((item) => String(item.sessionId) === sessionId);
        if (!session)
            throw new Error("全局会话不存在");
        rawMemory = { ...session, archives: (globalMemory.archives || []).filter((item) => String(item.sessionId) === sessionId), updatedAt: session.transcriptUpdatedAt || session.lastCompactedAt || "" };
    }
    else if (scope === "task_agent") {
        const store = readMemoryFile(file);
        const session = (store?.sessions || []).find((item) => String(item.id) === scopeId);
        if (!session)
            throw new Error("任务 Agent 会话不存在");
        rawMemory = { ...session, compaction: session.compaction || { latestProviderUsage: session.providerContextUsageBaseline, consecutiveFailures: session.finalDispatchReactiveCompactCircuitBreaker?.consecutive_failures || 0 } };
    }
    else
        rawMemory = virtualGroupMemory || readMemoryFile(file);
    if (!rawMemory)
        throw new Error("记忆文件无法读取");
    const policy = scope === "global" || scope === "global_session" ? require("../../agents/global/memory").getGlobalAgentMemoryPolicy() : null;
    const groupScope = scope === "group" ? parseGroupMemoryScopeId(scopeId, rawMemory) : null;
    const microCompactState = memoryCenterMicroCompactState(scope, scopeId, rawMemory);
    let contextSourceContinuity = { budget: {}, receipts: [], latestRestore: null };
    try {
        if (scope === "global_session") {
            const sessionId = scopeId.replace(/^session:/, "");
            contextSourceContinuity = (0, main_agent_context_source_continuity_1.readContextSourceContinuity)({ agentKind: "global", scope: "global", scopeId: "global-agent", exactSessionId: sessionId, generation: Number(rawMemory?.compaction?.boundaryGeneration || 0) });
        }
        else if (scope === "project_session") {
            const separator = scopeId.indexOf("::");
            const project = separator >= 0 ? scopeId.slice(0, separator) : "";
            const sessionId = separator >= 0 ? scopeId.slice(separator + 2) : "";
            if (project && sessionId)
                contextSourceContinuity = (0, main_agent_context_source_continuity_1.readContextSourceContinuity)({ agentKind: "project", scope: "project", scopeId: project, exactSessionId: sessionId, generation: Number(rawMemory?.compaction?.boundaryGeneration || 0) });
        }
        else if (scope === "group" && groupScope?.sessionId && groupScope.sessionId !== "default") {
            contextSourceContinuity = (0, main_agent_context_source_continuity_1.readContextSourceContinuity)({ agentKind: "group", scope: "group", scopeId: groupScope.groupId, exactSessionId: groupScope.sessionId, generation: Number(rawMemory?.compaction?.boundaryGeneration || 0) });
        }
        else if (scope === "task_agent" && rawMemory?.project) {
            contextSourceContinuity = (0, main_agent_context_source_continuity_1.readContextSourceContinuity)({ agentKind: "project", scope: "project", scopeId: String(rawMemory.project), exactSessionId: scopeId, generation: Number(rawMemory?.compaction?.boundaryGeneration || 0) });
        }
    }
    catch { }
    const runtimeSummary = memorySummary(scope, scopeId, rawMemory, scopeId);
    return {
        scope, id: scopeId, file, backupExists: fs.existsSync(`${file}.bak`),
        groupId: groupScope?.groupId || "",
        groupSessionId: groupScope?.sessionId || "",
        policy,
        summary: runtimeSummary, alerts: healthAlerts(scope, scopeId, rawMemory),
        microCompactState: {
            ...microCompactState,
            providerMicrocompact: runtimeSummary.providerMicrocompact || null,
            sessionMemoryTokenBasis: runtimeSummary.sessionMemoryTokenBasis || null,
        },
        postCompactUsage: memoryCenterPostCompactUsage(scope, scopeId, rawMemory, microCompactState),
        providerContextCache: memoryCenterProviderContextCacheState(scope, scopeId, rawMemory),
        contextSourceContinuity,
        memory: (0, memory_control_center_controls_1.applyMemoryControls)(scope, scopeId, rawMemory), rawMemory,
        itemGroups: collectItems(scope, scopeId, rawMemory),
    };
}
function listMemoryAudit(limit = 200, filters = {}) {
    let rows = [];
    try {
        rows = fs.readFileSync(memory_control_center_types_1.AUDIT_FILE, "utf-8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    }
    catch { }
    if (filters.scope)
        rows = rows.filter(item => item.scope === filters.scope);
    if (filters.scopeId)
        rows = rows.filter(item => item.scopeId === filters.scopeId);
    return rows.slice(-Math.max(1, Math.min(1000, limit))).reverse();
}
function findMemoryEvidence(input) {
    if (input.scope === "global" || input.missionId || (input.sessionId && !input.groupId)) {
        const { getGlobalMemoryEvidence } = require("../../agents/global/memory");
        return getGlobalMemoryEvidence(input);
    }
    const groupIds = input.groupId ? [input.groupId] : listJsonFiles(utils_1.GROUP_MESSAGES_DIR).map(file => path.basename(file, ".json"));
    const matches = [];
    for (const groupId of groupIds) {
        let messages = [];
        if (input.sessionId) {
            try {
                messages = require("../collaboration/storage").getGroupMessages(groupId, input.sessionId);
            }
            catch { }
        }
        else {
            messages = (0, memory_control_center_types_1.readJson)(path.join(utils_1.GROUP_MESSAGES_DIR, `${groupId}.json`), []);
        }
        for (const message of Array.isArray(messages) ? messages : []) {
            if (input.messageId && String(message.id || message.uuid || "") !== input.messageId)
                continue;
            if (input.taskId && String(message.task_id || message.taskId || "") !== input.taskId)
                continue;
            matches.push({ groupId, sessionId: input.sessionId || message.group_session_id || message.groupSessionId || "default", messageId: message.id || message.uuid || "", role: message.role || "", agent: message.agent || message.target || "", content: message.content || message.delivery_summary?.headline || "", timestamp: message.timestamp || "", taskId: message.task_id || message.taskId || "", raw: message });
            if (matches.length >= 50)
                return matches;
        }
    }
    return matches;
}
function rollbackMemory(scope, scopeId, reason, actor = "local-user") {
    if (!String(reason || "").trim())
        throw new Error("回滚前必须填写原因");
    const file = scopeFile(scope, scopeId);
    const backup = file ? `${file}.bak` : "";
    if (!file || !fs.existsSync(backup))
        throw new Error("没有可用的记忆备份");
    const backupData = fs.readFileSync(backup, "utf-8");
    JSON.parse(backupData);
    const snapshotDir = path.join(memory_control_center_types_1.CONTROL_DIR, "snapshots");
    fs.mkdirSync(snapshotDir, { recursive: true });
    const snapshot = path.join(snapshotDir, `${scope}-${(0, memory_control_center_types_1.cleanId)(scopeId)}-pre-rollback-${Date.now()}.json`);
    if (fs.existsSync(file))
        fs.copyFileSync(file, snapshot);
    const temp = `${file}.${process.pid}.${Date.now()}.rollback.tmp`;
    fs.writeFileSync(temp, backupData, "utf-8");
    fs.renameSync(temp, file);
    const audit = (0, memory_control_center_types_1.appendAudit)({ type: "memory_rollback", action: "rollback", scope, scopeId, actor, reason, backup, snapshot, restoredHash: (0, memory_control_center_types_1.hash)(backupData, 24) });
    return { restored: true, snapshot, audit, memory: readMemoryFile(file) };
}
function recordMemoryOperation(input) {
    return (0, memory_control_center_types_1.appendAudit)({ type: "memory_operation", ...input });
}
function memoryCenterExactGroupSessionScope(scopeId) {
    const parsed = parseGroupMemoryScopeId(String(scopeId || ""));
    if (!parsed.groupId || !/^gcs_[a-zA-Z0-9._-]+$/.test(parsed.sessionId))
        throw new Error("An exact group::gcs_* session scope is required");
    return { ...parsed, typedScopeId: `${parsed.groupId}--${parsed.sessionId}` };
}
//# sourceMappingURL=memory-control-center-api.js.map