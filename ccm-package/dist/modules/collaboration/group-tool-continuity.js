"use strict";
// Behavior-freeze module extracted mechanically from the former facade.
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
exports.getGroupToolContinuityDir = getGroupToolContinuityDir;
exports.getGroupToolContinuitySnapshotFile = getGroupToolContinuitySnapshotFile;
exports.getGroupToolContinuityMarkdownFile = getGroupToolContinuityMarkdownFile;
exports.normalizeToolContinuitySkill = normalizeToolContinuitySkill;
exports.compactToolContinuityStatus = compactToolContinuityStatus;
exports.compactToolContinuityReadiness = compactToolContinuityReadiness;
exports.buildGroupToolContinuityConfigSources = buildGroupToolContinuityConfigSources;
exports.renderGroupToolContinuityMarkdown = renderGroupToolContinuityMarkdown;
exports.buildGroupToolContinuitySnapshot = buildGroupToolContinuitySnapshot;
exports.summarizeGroupToolContinuitySnapshot = summarizeGroupToolContinuitySnapshot;
exports.persistGroupToolContinuitySnapshot = persistGroupToolContinuitySnapshot;
exports.readGroupToolContinuitySnapshotSummary = readGroupToolContinuitySnapshotSummary;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../../core/db");
const tool_authorization_1 = require("../../tools/tool-authorization");
const storage_1 = require("./storage");
const group_memory_shared_1 = require("./group-memory-shared");
function getGroupToolContinuityDir(groupId) {
    return path.join(group_memory_shared_1.GROUP_TOOL_CONTINUITY_DIR, String(groupId || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 160) || "unknown");
}
function getGroupToolContinuitySnapshotFile(groupId) {
    return path.join(getGroupToolContinuityDir(groupId), "snapshot.json");
}
function getGroupToolContinuityMarkdownFile(groupId) {
    return path.join(getGroupToolContinuityDir(groupId), "summary.md");
}
function normalizeToolContinuitySkill(value, source = "", at = "") {
    if (!value)
        return null;
    if (typeof value === "string") {
        const text = value.replace(/^Skill\s*[:：]\s*/i, "").trim();
        if (!text)
            return null;
        const [name, contentHash] = text.split("#");
        return {
            name: (0, group_memory_shared_1.compactMemoryText)(name, 160),
            contentHash: (0, group_memory_shared_1.compactMemoryText)(contentHash || "", 80),
            source,
            lastSeenAt: at,
        };
    }
    if (typeof value !== "object")
        return null;
    const name = String(value.name || value.skill || value.id || value.shortId || "").replace(/^Skill\s*[:：]\s*/i, "").trim();
    if (!name)
        return null;
    return {
        name: (0, group_memory_shared_1.compactMemoryText)(name, 160),
        contentHash: (0, group_memory_shared_1.compactMemoryText)(value.contentHash || value.content_hash || value.hash || "", 80),
        sourcePath: (0, group_memory_shared_1.compactMemoryText)(value.sourcePath || value.source_path || value.file || "", 260),
        source: (0, group_memory_shared_1.compactMemoryText)(source || value.source || "", 120),
        lastSeenAt: String(at || value.lastSeenAt || value.last_seen_at || value.timestamp || ""),
    };
}
function compactToolContinuityStatus(row = {}, kind = "mcp", source = "") {
    if (!row || typeof row !== "object")
        return null;
    if (kind === "skill") {
        const name = String(row.name || row.skill || row.id || "").trim();
        if (!name)
            return null;
        return {
            name: (0, group_memory_shared_1.compactMemoryText)(name, 160),
            state: (0, group_memory_shared_1.compactMemoryText)(row.state || row.status || "unknown", 80),
            contentHash: (0, group_memory_shared_1.compactMemoryText)(row.contentHash || row.content_hash || row.hash || "", 80),
            source,
        };
    }
    const raw = String(row.raw || row.name || row.server || row.serverName || row.server_name || "").trim();
    const server = String(row.server || row.name || raw || "").trim();
    const tool = String(row.tool || row.toolName || row.tool_name || "").trim();
    if (!raw && !server && !tool)
        return null;
    return {
        raw: (0, group_memory_shared_1.compactMemoryText)(raw || (tool ? `${server}/${tool}` : server), 180),
        server: (0, group_memory_shared_1.compactMemoryText)(server, 120),
        serverName: (0, group_memory_shared_1.compactMemoryText)(row.serverName || row.server_name || "", 120),
        tool: (0, group_memory_shared_1.compactMemoryText)(tool, 120),
        state: (0, group_memory_shared_1.compactMemoryText)(row.state || row.status || "unknown", 80),
        missingTools: Array.isArray(row.missingTools || row.missing_tools) ? (row.missingTools || row.missing_tools).map((item) => (0, group_memory_shared_1.compactMemoryText)(item, 120)).slice(0, 20) : [],
        availableTools: Array.isArray(row.availableTools || row.available_tools) ? (row.availableTools || row.available_tools).map((item) => (0, group_memory_shared_1.compactMemoryText)(item, 120)).slice(0, 20) : [],
        source,
    };
}
function compactToolContinuityReadiness(readiness = {}, source = "") {
    if (!readiness || typeof readiness !== "object")
        return null;
    return {
        schema: readiness.schema || "ccm-tool-authorization-readiness-v1",
        source,
        dispatchReady: readiness.dispatchReady !== false,
        status: (0, group_memory_shared_1.compactMemoryText)(readiness.status || (readiness.dispatchReady === false ? "needs_attention" : "ready"), 80),
        requested: readiness.requested || {},
        available: readiness.available || {},
        missing: readiness.missing || {},
        invalid_mcp_grants: Number(readiness.invalid_mcp_grants || 0),
        unavailable: readiness.unavailable || {},
    };
}
function buildGroupToolContinuityConfigSources(groupId, memory = {}) {
    const sources = [];
    const addSource = (source, scope, id, tools) => {
        const normalized = (0, group_memory_shared_1.mergeToolGrantSets)(tools || {});
        if (!(0, group_memory_shared_1.hasToolGrantSet)(normalized))
            return;
        sources.push({
            source,
            scope,
            id: (0, group_memory_shared_1.compactMemoryText)(id || groupId, 160),
            tools: normalized,
            counts: { mcp: normalized.mcp.length, skill: normalized.skill.length },
        });
    };
    addSource("group_memory", "group", groupId, memory.tools || memory.allowedTools || memory.allowed_tools || {});
    let group = null;
    try {
        group = (0, storage_1.loadGroups)().find((item) => String(item?.id || "") === String(groupId));
    }
    catch { }
    if (group)
        addSource("group_config", "group", groupId, group.tools || {});
    let projectConfigs = {};
    try {
        projectConfigs = (0, db_1.loadProjectConfigs)();
    }
    catch { }
    for (const member of Array.isArray(group?.members) ? group.members : []) {
        const project = String(member?.project || member?.name || "").trim();
        if (!project)
            continue;
        addSource("group_member", "member", project, member.tools || {});
        addSource("project_config", "project", project, projectConfigs?.[project]?.tools || {});
    }
    const configuredTools = (0, group_memory_shared_1.mergeToolGrantSets)(...sources.map(source => source.tools));
    return {
        groupFound: !!group,
        memberCount: Array.isArray(group?.members) ? group.members.length : 0,
        configuredTools,
        configuredSources: sources.slice(0, 40),
    };
}
function renderGroupToolContinuityMarkdown(snapshot = {}) {
    const lines = [
        "# CCM Group Tool Continuity",
        "",
        `- groupId: ${snapshot.groupId || ""}`,
        `- generatedAt: ${snapshot.generatedAt || ""}`,
        `- strategy: cc-tool-skill-continuity-context-v1`,
        `- status: ${snapshot.status || "empty"}`,
        `- shouldReuseAsContext: ${snapshot.shouldReuseAsContext === true}`,
        `- shouldBypassAuthorization: ${snapshot.shouldBypassAuthorization === true}`,
        "",
        "## Use Policy",
        "- Treat this as continuity context for the group chat and fresh third-party child Agent sessions.",
        "- This snapshot never grants tools and never bypasses CCM runtime authorization.",
        "- Real dispatch must still pass the current runtime tool gate, MCP config sync, and authorization readiness checks.",
    ];
    const addGrantSet = (title, set = {}) => {
        if (!(0, group_memory_shared_1.hasToolGrantSet)(set))
            return;
        lines.push("", `## ${title}`);
        if (Array.isArray(set.mcp) && set.mcp.length)
            lines.push(`- MCP: ${set.mcp.slice(0, 24).join(", ")}`);
        if (Array.isArray(set.skill) && set.skill.length)
            lines.push(`- Skill: ${set.skill.slice(0, 24).join(", ")}`);
    };
    addGrantSet("Configured Tools", snapshot.configuredTools || {});
    addGrantSet("Continuity Allowed Tools", snapshot.allowedTools || {});
    addGrantSet("Requested Tools", snapshot.requested || {});
    addGrantSet("Synced Tools", snapshot.synced || {});
    addGrantSet("Missing Tools", snapshot.missing || {});
    if (Array.isArray(snapshot.invokedSkills) && snapshot.invokedSkills.length) {
        lines.push("", "## Invoked Skills");
        for (const skill of snapshot.invokedSkills.slice(0, 24)) {
            lines.push(`- ${skill.name || "unknown"}${skill.contentHash ? `#${skill.contentHash}` : ""}${skill.source ? ` (${skill.source})` : ""}`);
        }
    }
    if (Array.isArray(snapshot.configuredSources) && snapshot.configuredSources.length) {
        lines.push("", "## Configured Sources");
        for (const source of snapshot.configuredSources.slice(0, 16)) {
            lines.push(`- ${source.source}/${source.scope}/${source.id}: MCP ${source.counts?.mcp || 0}, Skill ${source.counts?.skill || 0}`);
        }
    }
    if (Array.isArray(snapshot.dispatchGates) && snapshot.dispatchGates.length) {
        lines.push("", "## Runtime Gates");
        for (const gate of snapshot.dispatchGates.slice(0, 12)) {
            lines.push(`- ${gate.dispatch_gate_id || gate.gateId || gate.id || "gate"}: dispatchReady=${gate.dispatchReady !== false}; blockers=${(gate.blockers || []).slice(0, 6).join(", ")}`);
        }
    }
    if (Array.isArray(snapshot.warnings) && snapshot.warnings.length) {
        lines.push("", "## Warnings");
        for (const warning of snapshot.warnings.slice(0, 12))
            lines.push(`- ${warning}`);
    }
    if (Array.isArray(snapshot.errors) && snapshot.errors.length) {
        lines.push("", "## Errors");
        for (const error of snapshot.errors.slice(0, 12))
            lines.push(`- ${error}`);
    }
    return (0, group_memory_shared_1.compactPreserveLines)(lines.join("\n"), 16_000);
}
function buildGroupToolContinuitySnapshot(groupId, memory = {}, options = {}) {
    const generatedAt = String(options.generatedAt || options.generated_at || new Date().toISOString());
    const snapshotFile = getGroupToolContinuitySnapshotFile(groupId);
    const summaryFile = getGroupToolContinuityMarkdownFile(groupId);
    const config = buildGroupToolContinuityConfigSources(groupId, memory);
    const allowedSets = [config.configuredTools];
    const requestedSets = [config.configuredTools];
    const syncedSets = [];
    const missingSets = [];
    const mcpStatuses = [];
    const skillStatuses = [];
    const invokedSkills = [];
    const authorizationReadiness = [];
    const dispatchGates = [];
    const permissionRules = [];
    const warnings = new Set();
    const errors = new Set();
    const snapshotIds = new Set();
    const snapshotPaths = new Set();
    const mcpConfigPaths = new Set();
    const catalogRevisions = new Set();
    const sourceMessageIds = new Set();
    const sourceTaskIds = new Set();
    const sourceProjects = new Set();
    let runtimeSnapshotCount = 0;
    let runtimeAuditCount = 0;
    let receiptCount = 0;
    let lastRuntimeAt = "";
    const markMeta = (meta = {}) => {
        if (meta.messageId)
            sourceMessageIds.add(String(meta.messageId));
        if (meta.taskId)
            sourceTaskIds.add(String(meta.taskId));
        if (meta.project)
            sourceProjects.add(String(meta.project));
        if (meta.at && String(meta.at).localeCompare(lastRuntimeAt) > 0)
            lastRuntimeAt = String(meta.at);
    };
    const addInvoked = (values, source = "", at = "") => {
        for (const value of Array.isArray(values) ? values : []) {
            const skill = normalizeToolContinuitySkill(value, source, at);
            if (skill)
                invokedSkills.push(skill);
        }
    };
    const addSnapshot = (snapshot, meta = {}) => {
        if (!snapshot || typeof snapshot !== "object")
            return;
        runtimeSnapshotCount += 1;
        markMeta(meta);
        const allowed = (0, group_memory_shared_1.extractToolGrantSet)(snapshot.allowedTools || snapshot.allowed_tools || {});
        if ((0, group_memory_shared_1.hasToolGrantSet)(allowed)) {
            allowedSets.push(allowed);
            requestedSets.push(allowed);
        }
        if (snapshot.snapshotId || snapshot.snapshot_id)
            snapshotIds.add(String(snapshot.snapshotId || snapshot.snapshot_id));
        if (snapshot.snapshotPath || snapshot.snapshot_path)
            snapshotPaths.add(String(snapshot.snapshotPath || snapshot.snapshot_path));
        if (snapshot.mcpConfigPath || snapshot.mcp_config_path)
            mcpConfigPaths.add(String(snapshot.mcpConfigPath || snapshot.mcp_config_path));
        if (snapshot.catalogRevision || snapshot.catalog_revision)
            catalogRevisions.add(String(snapshot.catalogRevision || snapshot.catalog_revision));
        if (Array.isArray(snapshot.permissionRules || snapshot.permission_rules))
            permissionRules.push(...(snapshot.permissionRules || snapshot.permission_rules).slice(0, 50));
        const readiness = compactToolContinuityReadiness(snapshot.authorizationReadiness || snapshot.authorization_readiness, "runtime_snapshot");
        if (readiness)
            authorizationReadiness.push(readiness);
        const gate = snapshot.dispatchGate || snapshot.dispatch_gate;
        if (gate && typeof gate === "object")
            dispatchGates.push({ ...gate, source: "runtime_snapshot" });
    };
    const addAudit = (audit, meta = {}) => {
        if (!audit || typeof audit !== "object")
            return;
        runtimeAuditCount += 1;
        markMeta({ ...meta, at: meta.at || audit.timestamp || audit.at || "" });
        requestedSets.push((0, group_memory_shared_1.extractToolGrantSet)(audit.requested || audit.requestedTools || audit.requested_tools || {}));
        syncedSets.push((0, group_memory_shared_1.extractToolGrantSet)(audit.synced || audit.syncedTools || audit.synced_tools || {}));
        missingSets.push((0, group_memory_shared_1.extractToolGrantSet)(audit.missing || audit.missingTools || audit.missing_tools || {}));
        for (const row of Array.isArray(audit.mcp_statuses) ? audit.mcp_statuses : []) {
            const status = compactToolContinuityStatus(row, "mcp", "runtime_audit");
            if (status)
                mcpStatuses.push(status);
        }
        for (const row of Array.isArray(audit.skill_statuses) ? audit.skill_statuses : []) {
            const status = compactToolContinuityStatus(row, "skill", "runtime_audit");
            if (status)
                skillStatuses.push(status);
        }
        for (const rule of Array.isArray(audit.permission_rules) ? audit.permission_rules : [])
            permissionRules.push(rule);
        addInvoked(audit.invoked_skills || audit.invokedSkills || [], "runtime_audit", audit.timestamp || audit.at || meta.at || "");
        const readiness = compactToolContinuityReadiness(audit.authorization_readiness || audit.authorizationReadiness, "runtime_audit");
        if (readiness)
            authorizationReadiness.push(readiness);
        const gate = audit.dispatch_gate || audit.dispatchGate;
        if (gate && typeof gate === "object")
            dispatchGates.push({ ...gate, source: "runtime_audit" });
        if (audit.snapshotId || audit.snapshot_id)
            snapshotIds.add(String(audit.snapshotId || audit.snapshot_id));
        if (audit.snapshotPath || audit.snapshot_path)
            snapshotPaths.add(String(audit.snapshotPath || audit.snapshot_path));
        if (audit.mcpConfigPath || audit.mcp_config_path)
            mcpConfigPaths.add(String(audit.mcpConfigPath || audit.mcp_config_path));
        if (audit.catalogRevision || audit.catalog_revision)
            catalogRevisions.add(String(audit.catalogRevision || audit.catalog_revision));
        for (const warning of Array.isArray(audit.warnings) ? audit.warnings : [])
            warnings.add((0, group_memory_shared_1.compactMemoryText)(warning, 220));
        for (const error of Array.isArray(audit.errors) ? audit.errors : [])
            errors.add((0, group_memory_shared_1.compactMemoryText)(error, 220));
    };
    const visitRuntimeCarrier = (carrier, meta = {}) => {
        if (!carrier || typeof carrier !== "object")
            return;
        markMeta({
            messageId: meta.messageId || carrier.messageId || carrier.message_id || carrier.id || carrier.uuid || "",
            taskId: meta.taskId || carrier.taskId || carrier.task_id || "",
            project: meta.project || carrier.project || carrier.agent || carrier.target_project || carrier.target || "",
            at: meta.at || carrier.time || carrier.timestamp || carrier.generated_at || carrier.generatedAt || "",
        });
        if (carrier.runtimeToolSnapshot || carrier.runtime_tool_snapshot)
            addSnapshot(carrier.runtimeToolSnapshot || carrier.runtime_tool_snapshot, meta);
        if (carrier.runtimeToolSync || carrier.runtime_tool_sync)
            addAudit(carrier.runtimeToolSync || carrier.runtime_tool_sync, meta);
        if (carrier.runtime_tooling || carrier.runtimeTooling)
            addAudit(carrier.runtime_tooling || carrier.runtimeTooling, meta);
        if (carrier.allowedTools || carrier.allowed_tools) {
            const allowed = (0, group_memory_shared_1.extractToolGrantSet)(carrier.allowedTools || carrier.allowed_tools);
            if ((0, group_memory_shared_1.hasToolGrantSet)(allowed)) {
                allowedSets.push(allowed);
                requestedSets.push(allowed);
            }
        }
        addInvoked(carrier.invokedSkills || carrier.invoked_skills || [], "receipt", meta.at || carrier.time || carrier.timestamp || "");
        if (carrier.receipt && typeof carrier.receipt === "object") {
            receiptCount += 1;
            visitRuntimeCarrier(carrier.receipt, meta);
        }
        const deliveryRuntime = carrier.delivery_summary?.runtime_tooling || carrier.deliverySummary?.runtime_tooling || carrier.deliverySummary?.runtimeTooling;
        if (deliveryRuntime)
            addAudit(deliveryRuntime, meta);
        for (const event of Array.isArray(carrier.workEvents) ? carrier.workEvents : []) {
            addAudit(event.runtimeToolSync || event.runtime_tool_sync || event.data?.runtime_tool_sync || event.data?.runtimeToolSync, {
                ...meta,
                at: event.at || event.timestamp || meta.at,
            });
            addInvoked(event.invokedSkills || event.invoked_skills || event.data?.invoked_skills || [], "work_event", event.at || event.timestamp || meta.at || "");
        }
    };
    for (const item of Array.isArray(memory.workerLedger) ? memory.workerLedger.slice(-80) : []) {
        visitRuntimeCarrier(item, {
            taskId: item.taskId || item.task_id || "",
            project: item.project || item.agent || "",
            at: item.time || item.timestamp || "",
        });
    }
    for (const message of (0, storage_1.getGroupMessages)(groupId, String(memory?.groupSessionId || "")).slice(-160)) {
        visitRuntimeCarrier(message, {
            messageId: message.id || message.uuid || "",
            taskId: message.task_id || message.taskId || "",
            project: message.agent || message.target || "",
            at: message.timestamp || message.time || "",
        });
    }
    try {
        const payload = (0, tool_authorization_1.buildToolAuthorizationPayload)(config.configuredTools);
        requestedSets.push(payload.tools);
        const readiness = compactToolContinuityReadiness(payload.authorization_readiness, "current_authorization");
        if (readiness)
            authorizationReadiness.push(readiness);
        for (const row of Array.isArray(payload.tool_audit?.mcp) ? payload.tool_audit.mcp : []) {
            const status = compactToolContinuityStatus(row, "mcp", "current_authorization");
            if (status)
                mcpStatuses.push(status);
        }
        for (const row of Array.isArray(payload.tool_audit?.skills) ? payload.tool_audit.skills : []) {
            const status = compactToolContinuityStatus(row, "skill", "current_authorization");
            if (status)
                skillStatuses.push(status);
        }
        const unavailable = payload.authorization_readiness?.unavailable || {};
        missingSets.push({
            mcp: (Array.isArray(unavailable.mcp) ? unavailable.mcp : []).map((row) => row.raw || (row.tool ? `${row.server}/${row.tool}` : row.server)).filter(Boolean),
            skill: (Array.isArray(unavailable.skill) ? unavailable.skill : []).map((row) => row.name).filter(Boolean),
        });
    }
    catch (error) {
        warnings.add(`current_authorization_audit_failed: ${(0, group_memory_shared_1.compactMemoryText)(error?.message || String(error), 180)}`);
    }
    const configuredTools = config.configuredTools;
    const allowedTools = (0, group_memory_shared_1.mergeToolGrantSets)(...allowedSets);
    const requested = (0, group_memory_shared_1.mergeToolGrantSets)(...requestedSets);
    const synced = (0, group_memory_shared_1.mergeToolGrantSets)(...syncedSets);
    const missing = (0, group_memory_shared_1.mergeToolGrantSets)(...missingSets);
    const uniqueInvokedSkills = (0, group_memory_shared_1.uniqueByKey)(invokedSkills, (item) => `${item.name || ""}#${item.contentHash || ""}`, 50);
    const uniqueMcpStatuses = (0, group_memory_shared_1.uniqueByKey)(mcpStatuses, (item) => `${item.raw || item.server || ""}/${item.tool || ""}/${item.state || ""}/${item.source || ""}`, 80);
    const uniqueSkillStatuses = (0, group_memory_shared_1.uniqueByKey)(skillStatuses, (item) => `${item.name || ""}/${item.state || ""}/${item.source || ""}`, 80);
    const hasMissing = (0, group_memory_shared_1.hasToolGrantSet)(missing);
    const hasRuntimeEvidence = runtimeSnapshotCount > 0 || runtimeAuditCount > 0 || uniqueInvokedSkills.length > 0;
    const status = errors.size ? "fail"
        : hasMissing ? "needs_attention"
            : (0, group_memory_shared_1.hasToolGrantSet)(allowedTools) || hasRuntimeEvidence ? "ready"
                : "empty";
    const base = {
        schema: "ccm-group-tool-continuity-snapshot-v1",
        version: group_memory_shared_1.GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION,
        groupId,
        generatedAt,
        reason: String(options.reason || "save_group_memory"),
        status,
        snapshotFile,
        summaryFile,
        strategy: "cc-tool-skill-continuity-context-v1",
        configuredTools,
        allowedTools,
        requested,
        synced,
        missing,
        invokedSkills: uniqueInvokedSkills,
        mcpStatuses: uniqueMcpStatuses,
        skillStatuses: uniqueSkillStatuses,
        permissionRules: (0, group_memory_shared_1.uniqueByKey)(permissionRules, (item) => JSON.stringify(item || {}), 80),
        authorizationReadiness: (0, group_memory_shared_1.uniqueByKey)(authorizationReadiness, (item) => `${item.source || ""}/${item.status || ""}/${JSON.stringify(item.missing || {})}`, 20),
        dispatchGates: (0, group_memory_shared_1.uniqueByKey)(dispatchGates, (item) => `${item.dispatch_gate_id || item.gateId || item.id || ""}/${item.source || ""}`, 20),
        configuredSources: config.configuredSources,
        sourceSummary: {
            groupFound: config.groupFound,
            memberCount: config.memberCount,
            configuredSourceCount: config.configuredSources.length,
            runtimeSnapshotCount,
            runtimeAuditCount,
            receiptCount,
        },
        sourceMessageIds: Array.from(sourceMessageIds).filter(Boolean).slice(-60),
        sourceTaskIds: Array.from(sourceTaskIds).filter(Boolean).slice(-60),
        sourceProjects: Array.from(sourceProjects).filter(Boolean).slice(-30),
        snapshotIds: Array.from(snapshotIds).filter(Boolean).slice(-30),
        snapshotPaths: Array.from(snapshotPaths).filter(Boolean).slice(-30),
        mcpConfigPaths: Array.from(mcpConfigPaths).filter(Boolean).slice(-30),
        catalogRevisions: Array.from(catalogRevisions).filter(Boolean).slice(-30),
        warnings: Array.from(warnings).filter(Boolean).slice(-30),
        errors: Array.from(errors).filter(Boolean).slice(-30),
        lastRuntimeAt,
        hasRuntimeEvidence,
        shouldReuseAsContext: true,
        shouldBypassAuthorization: false,
    };
    const markdown = renderGroupToolContinuityMarkdown(base);
    const markdownChecksum = (0, group_memory_shared_1.hashSessionMemoryText)(markdown, 24);
    const snapshotChecksum = (0, group_memory_shared_1.hashSessionMemoryText)({ ...base, markdownChecksum }, 24);
    return {
        ...base,
        snapshotChecksum,
        markdownChecksum,
        markdownChars: markdown.length,
        markdownExcerpt: (0, group_memory_shared_1.compactPreserveLines)(markdown, 1200),
        markdown,
    };
}
function summarizeGroupToolContinuitySnapshot(snapshot = {}) {
    if (!snapshot?.schema)
        return null;
    const { markdown, ...rest } = snapshot;
    return {
        ...rest,
        markdownExcerpt: (0, group_memory_shared_1.compactPreserveLines)(snapshot.markdownExcerpt || markdown || "", 1200),
    };
}
function persistGroupToolContinuitySnapshot(groupId, memory = {}, options = {}) {
    const snapshot = buildGroupToolContinuitySnapshot(groupId, memory, options);
    (0, group_memory_shared_1.writeTextAtomic)(snapshot.summaryFile, snapshot.markdown);
    (0, group_memory_shared_1.writeJsonAtomic)(snapshot.snapshotFile, summarizeGroupToolContinuitySnapshot(snapshot));
    return summarizeGroupToolContinuitySnapshot(snapshot);
}
function readGroupToolContinuitySnapshotSummary(groupId) {
    const snapshotFile = getGroupToolContinuitySnapshotFile(groupId);
    const summaryFile = getGroupToolContinuityMarkdownFile(groupId);
    try {
        const parsed = JSON.parse(fs.readFileSync(snapshotFile, "utf-8"));
        const markdown = fs.existsSync(summaryFile) ? fs.readFileSync(summaryFile, "utf-8") : "";
        return {
            ...parsed,
            schema: "ccm-group-tool-continuity-snapshot-v1",
            version: group_memory_shared_1.GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION,
            groupId,
            snapshotFile,
            summaryFile,
            markdownExists: !!markdown,
            markdownChecksumMatches: markdown ? (0, group_memory_shared_1.hashSessionMemoryText)(markdown, 24) === parsed.markdownChecksum : false,
            markdownExcerpt: (0, group_memory_shared_1.compactPreserveLines)(parsed.markdownExcerpt || markdown, 1200),
        };
    }
    catch {
        return {
            schema: "ccm-group-tool-continuity-snapshot-v1",
            version: group_memory_shared_1.GROUP_TOOL_CONTINUITY_SNAPSHOT_VERSION,
            groupId,
            snapshotFile,
            summaryFile,
            markdownExists: fs.existsSync(summaryFile),
            markdownChecksumMatches: false,
            shouldReuseAsContext: true,
            shouldBypassAuthorization: false,
            status: "empty",
            generatedAt: "",
            configuredTools: { mcp: [], skill: [] },
            allowedTools: { mcp: [], skill: [] },
            requested: { mcp: [], skill: [] },
            synced: { mcp: [], skill: [] },
            missing: { mcp: [], skill: [] },
            invokedSkills: [],
            hasRuntimeEvidence: false,
        };
    }
}
//# sourceMappingURL=group-tool-continuity.js.map