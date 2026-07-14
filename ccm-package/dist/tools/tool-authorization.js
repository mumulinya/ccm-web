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
exports.parseMcpGrant = parseMcpGrant;
exports.buildToolAuthorizationInventory = buildToolAuthorizationInventory;
exports.buildAuthorizationReadiness = buildAuthorizationReadiness;
exports.buildToolConnectionPreflight = buildToolConnectionPreflight;
exports.normalizeToolAuthorization = normalizeToolAuthorization;
exports.buildToolAuthorizationPayload = buildToolAuthorizationPayload;
exports.buildFreshToolAuthorizationPayload = buildFreshToolAuthorizationPayload;
exports.buildToolAuthorizationChangeRecord = buildToolAuthorizationChangeRecord;
exports.recordToolAuthorizationChange = recordToolAuthorizationChange;
exports.buildToolAuthorizationOptions = buildToolAuthorizationOptions;
exports.runToolAuthorizationSelfTest = runToolAuthorizationSelfTest;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const tool_manager_1 = require("./tool-manager");
const TOOL_AUTHORIZATION_AUDIT_FILE = path.join(os.homedir(), ".cc-connect", "agent-runner", "tool-authorization-changes.jsonl");
function asArray(value) {
    if (Array.isArray(value))
        return value;
    if (value === undefined || value === null || value === "")
        return [];
    return [value];
}
function cleanGrant(value) {
    const text = String(value || "").replace(/[\0\r\n\t]+/g, " ").trim();
    if (!text || text.length > 180)
        return "";
    return text;
}
function mcpGrantFromObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return "";
    const raw = cleanGrant(value.raw || value.grant || value.id || value.name);
    if (raw)
        return raw;
    const server = cleanGrant(value.server || value.serverName || value.mcp || value.mcpServer);
    const tool = cleanGrant(value.tool || value.toolName || value.subtool);
    if (!server)
        return "";
    return tool ? `${server}/${tool}` : server;
}
function skillGrantFromObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return "";
    return cleanGrant(value.name || value.skill || value.id || value.raw);
}
function parseMcpGrant(value) {
    const raw = cleanGrant(value);
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
function normalizeList(values, mapper) {
    const seen = new Set();
    const result = [];
    for (const value of values) {
        const grant = mapper(value);
        if (!grant || seen.has(grant))
            continue;
        seen.add(grant);
        result.push(grant);
    }
    return result;
}
function normalizeMcpServerKey(value) {
    return cleanGrant(value).replace(/^ccm__/, "").toLowerCase();
}
function compactMcpGrants(grants) {
    const parsed = grants.map(parseMcpGrant);
    const fullServers = new Set(parsed.filter(item => item.server && !item.tool).map(item => normalizeMcpServerKey(item.server)));
    return parsed
        .filter(item => item.server)
        .filter(item => !item.tool || !fullServers.has(normalizeMcpServerKey(item.server)))
        .map(item => item.raw);
}
function appendJsonlBounded(file, entry) {
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        if (fs.existsSync(file) && fs.statSync(file).size > 2 * 1024 * 1024) {
            const content = fs.readFileSync(file, "utf-8");
            const tail = content.slice(-1024 * 1024);
            fs.writeFileSync(file, tail.slice(Math.max(0, tail.indexOf("\n") + 1)), "utf-8");
        }
        fs.appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, "utf-8");
    }
    catch { }
}
function diffGrantList(before = [], after = []) {
    const prev = new Set(before);
    const next = new Set(after);
    return {
        added: after.filter(item => !prev.has(item)),
        removed: before.filter(item => !next.has(item)),
    };
}
function auditSummary(toolAudit) {
    return {
        missing_mcp_servers: Array.isArray(toolAudit?.missing_mcp_servers) ? toolAudit.missing_mcp_servers.length : 0,
        missing_mcp_tools: Array.isArray(toolAudit?.missing_mcp_tools) ? toolAudit.missing_mcp_tools.length : 0,
        missing_skills: Array.isArray(toolAudit?.missing_skills) ? toolAudit.missing_skills.length : 0,
    };
}
function cleanInventoryText(value, max = 260) {
    return String(value || "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, max);
}
function safeInventoryObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function buildInventoryScopeRow(input) {
    const payload = input.buildPayload(input.tools || {});
    const tools = normalizeToolAuthorization(payload?.tools || input.tools || {});
    const readiness = payload?.authorization_readiness || buildAuthorizationReadiness(payload?.tool_audit, tools);
    const missing = readiness?.missing || auditSummary(payload?.tool_audit);
    const runtime = buildInventoryRuntimeCoverage(input.scope, input.id, input.runtimeReadiness || []);
    return {
        schema: "ccm-tool-authorization-inventory-scope-v1",
        scope: input.scope,
        id: cleanInventoryText(input.id),
        name: cleanInventoryText(input.name || input.id),
        tools,
        counts: {
            mcp: tools.mcp.length,
            skill: tools.skill.length,
        },
        audit_summary: {
            missing_mcp_servers: Number(missing?.missing_mcp_servers || 0),
            missing_mcp_tools: Number(missing?.missing_mcp_tools || 0),
            missing_skills: Number(missing?.missing_skills || 0),
            invalid_mcp_grants: Number(readiness?.invalid_mcp_grants || 0),
        },
        authorization_readiness: readiness,
        runtime,
    };
}
function inventorySnapshotKey(snapshot) {
    const runtime = cleanInventoryText(snapshot?.runtime || "", 80);
    const snapshotId = cleanInventoryText(snapshot?.snapshotId || "", 120);
    const projectName = cleanInventoryText(snapshot?.projectName || "", 180);
    const groupId = cleanInventoryText(snapshot?.groupId || "", 180);
    if (groupId && projectName)
        return `group:${groupId}:${projectName}`;
    if (projectName)
        return `project:${projectName}`;
    if (runtime || snapshotId)
        return `${runtime}:${snapshotId}`;
    return [
        projectName,
        groupId,
        cleanInventoryText(snapshot?.checkedAt || "", 80),
    ].join(":");
}
function sanitizeInventoryRuntimeSnapshot(snapshot) {
    const requested = snapshot?.requested || {};
    const synced = snapshot?.synced || {};
    const dispatchGate = snapshot?.dispatchGate || snapshot?.dispatch_gate || {};
    return {
        runtime: cleanInventoryText(snapshot?.runtime || "", 80),
        snapshotId: cleanInventoryText(snapshot?.snapshotId || "", 120),
        projectName: cleanInventoryText(snapshot?.projectName || "", 240),
        groupId: cleanInventoryText(snapshot?.groupId || "", 180),
        checkedAt: cleanInventoryText(snapshot?.checkedAt || "", 80),
        snapshotGeneratedAt: cleanInventoryText(snapshot?.snapshotGeneratedAt || snapshot?.generatedAt || "", 80),
        deliveryReady: snapshot?.deliveryReady === true,
        runtimeReady: snapshot?.runtimeReady === true,
        overallReady: snapshot?.overallReady === true,
        catalogStale: snapshot?.catalogStale === true,
        dispatchReady: dispatchGate?.dispatchReady !== false,
        dispatchReason: dispatchGate?.dispatchReady === false ? cleanInventoryText(dispatchGate?.reason || "", 260) : "",
        requested: {
            mcp: Array.isArray(requested?.mcp) ? requested.mcp.length : 0,
            skill: Array.isArray(requested?.skill) ? requested.skill.length : 0,
        },
        synced: {
            mcp: Array.isArray(synced?.mcp) ? synced.mcp.length : 0,
            skill: Array.isArray(synced?.skill) ? synced.skill.length : 0,
        },
    };
}
function runtimeMatchesInventoryScope(scope, id, snapshot) {
    const scopeId = cleanInventoryText(id);
    if (!scopeId)
        return false;
    if (scope === "group")
        return cleanInventoryText(snapshot?.groupId) === scopeId;
    return cleanInventoryText(snapshot?.projectName) === scopeId && !cleanInventoryText(snapshot?.groupId);
}
function summarizeInventoryRuntimeSnapshots(snapshots) {
    const total = snapshots.length;
    return {
        total,
        overallReady: snapshots.filter(item => item.overallReady).length,
        deliveryReady: snapshots.filter(item => item.deliveryReady).length,
        runtimeReady: snapshots.filter(item => item.runtimeReady).length,
        catalogStale: snapshots.filter(item => item.catalogStale).length,
        dispatchBlocked: snapshots.filter(item => item.dispatchReady === false).length,
        needsResync: snapshots.filter(item => item.catalogStale || item.dispatchReady === false || !item.deliveryReady).length,
    };
}
function buildInventoryRuntimeCoverage(scope, id, runtimeReadiness) {
    const seen = new Set();
    const snapshots = runtimeReadiness
        .filter(item => runtimeMatchesInventoryScope(scope, id, item))
        .map(sanitizeInventoryRuntimeSnapshot)
        .sort((left, right) => String(right.snapshotGeneratedAt || right.checkedAt || "").localeCompare(String(left.snapshotGeneratedAt || left.checkedAt || "")))
        .filter(item => {
        const key = inventorySnapshotKey(item);
        if (!key || seen.has(key))
            return false;
        seen.add(key);
        return true;
    })
        .slice(0, 12);
    return {
        schema: "ccm-tool-authorization-runtime-coverage-v1",
        summary: summarizeInventoryRuntimeSnapshots(snapshots),
        snapshots,
    };
}
function buildToolAuthorizationInventory(input = {}) {
    const projects = safeInventoryObject(input.projects);
    const groups = Array.isArray(input.groups) ? input.groups : [];
    const runtimeReadiness = Array.isArray(input.runtimeReadiness) ? input.runtimeReadiness : [];
    const buildPayload = typeof input.buildPayload === "function" ? input.buildPayload : buildToolAuthorizationPayload;
    const scopes = [];
    for (const [projectId, config] of Object.entries(projects).sort(([a], [b]) => a.localeCompare(b))) {
        const row = safeInventoryObject(config);
        scopes.push(buildInventoryScopeRow({
            scope: "project",
            id: projectId,
            name: row.name || row.displayName || row.project || projectId,
            tools: row.tools || {},
            runtimeReadiness,
            buildPayload,
        }));
    }
    for (const group of groups) {
        if (!group || typeof group !== "object")
            continue;
        scopes.push(buildInventoryScopeRow({
            scope: "group",
            id: group.id,
            name: group.name || group.title || group.id,
            tools: group.tools || {},
            runtimeReadiness,
            buildPayload,
        }));
    }
    const summary = scopes.reduce((acc, row) => {
        const readiness = row.authorization_readiness || {};
        const missing = row.audit_summary || {};
        acc.totalScopes += 1;
        acc.projects += row.scope === "project" ? 1 : 0;
        acc.groups += row.scope === "group" ? 1 : 0;
        acc.configuredScopes += row.counts.mcp || row.counts.skill ? 1 : 0;
        acc.emptyScopes += row.counts.mcp || row.counts.skill ? 0 : 1;
        acc.ready += readiness.dispatchReady !== false ? 1 : 0;
        acc.needsAttention += readiness.dispatchReady === false ? 1 : 0;
        acc.requestedMcp += row.counts.mcp || 0;
        acc.requestedSkill += row.counts.skill || 0;
        acc.missingMcpServers += Number(missing.missing_mcp_servers || 0);
        acc.missingMcpTools += Number(missing.missing_mcp_tools || 0);
        acc.missingSkills += Number(missing.missing_skills || 0);
        acc.invalidMcpGrants += Number(missing.invalid_mcp_grants || 0);
        acc.scopesWithRuntime += Number(row.runtime?.summary?.total || 0) > 0 ? 1 : 0;
        return acc;
    }, {
        totalScopes: 0,
        projects: 0,
        groups: 0,
        configuredScopes: 0,
        emptyScopes: 0,
        ready: 0,
        needsAttention: 0,
        requestedMcp: 0,
        requestedSkill: 0,
        missingMcpServers: 0,
        missingMcpTools: 0,
        missingSkills: 0,
        invalidMcpGrants: 0,
        scopesWithRuntime: 0,
        scopesWithoutRuntime: 0,
        runtimeSnapshots: 0,
        runtimeOverallReady: 0,
        runtimeDeliveryReady: 0,
        runtimeCliReady: 0,
        runtimeCatalogStale: 0,
        runtimeDispatchBlocked: 0,
        runtimeNeedsResync: 0,
    });
    summary.scopesWithoutRuntime = Math.max(0, summary.totalScopes - summary.scopesWithRuntime);
    const runtimeSeen = new Set();
    const uniqueRuntimeSnapshots = runtimeReadiness
        .map(sanitizeInventoryRuntimeSnapshot)
        .sort((left, right) => String(right.snapshotGeneratedAt || right.checkedAt || "").localeCompare(String(left.snapshotGeneratedAt || left.checkedAt || "")))
        .filter(snapshot => {
        const key = inventorySnapshotKey(snapshot);
        if (!key || runtimeSeen.has(key))
            return false;
        runtimeSeen.add(key);
        return true;
    });
    const runtimeSummary = summarizeInventoryRuntimeSnapshots(uniqueRuntimeSnapshots);
    summary.runtimeSnapshots = runtimeSummary.total;
    summary.runtimeOverallReady = runtimeSummary.overallReady;
    summary.runtimeDeliveryReady = runtimeSummary.deliveryReady;
    summary.runtimeCliReady = runtimeSummary.runtimeReady;
    summary.runtimeCatalogStale = runtimeSummary.catalogStale;
    summary.runtimeDispatchBlocked = runtimeSummary.dispatchBlocked;
    summary.runtimeNeedsResync = runtimeSummary.needsResync;
    return {
        schema: "ccm-tool-authorization-inventory-v1",
        generatedAt: cleanInventoryText(input.generatedAt || new Date().toISOString(), 80),
        summary,
        scopes,
    };
}
function buildAuthorizationReadiness(toolAudit, tools) {
    const mcpRows = Array.isArray(toolAudit?.mcp) ? toolAudit.mcp : [];
    const skillRows = Array.isArray(toolAudit?.skills) ? toolAudit.skills : [];
    const unavailableMcp = mcpRows.filter((row) => row?.state !== "available");
    const unavailableSkills = skillRows.filter((row) => row?.state !== "available");
    const missingSummary = auditSummary(toolAudit);
    const missingTotal = missingSummary.missing_mcp_servers + missingSummary.missing_mcp_tools + missingSummary.missing_skills;
    const invalidMcp = unavailableMcp.filter((row) => row?.state === "invalid_grant").length;
    const requested = {
        mcp: Array.isArray(tools?.mcp) ? tools.mcp.length : 0,
        skill: Array.isArray(tools?.skill) ? tools.skill.length : 0,
    };
    return {
        schema: "ccm-tool-authorization-readiness-v1",
        dispatchReady: missingTotal === 0 && invalidMcp === 0,
        status: missingTotal === 0 && invalidMcp === 0 ? "ready" : "needs_attention",
        requested,
        available: {
            mcp: mcpRows.filter((row) => row?.state === "available").length,
            skill: skillRows.filter((row) => row?.state === "available").length,
        },
        missing: missingSummary,
        invalid_mcp_grants: invalidMcp,
        unavailable: {
            mcp: unavailableMcp.map((row) => ({
                raw: cleanGrant(row?.raw || row?.server || ""),
                server: cleanGrant(row?.server || ""),
                tool: cleanGrant(row?.tool || ""),
                state: cleanGrant(row?.state || "unknown"),
            })).slice(0, 50),
            skill: unavailableSkills.map((row) => ({
                name: cleanGrant(row?.name || ""),
                state: cleanGrant(row?.state || "unknown"),
            })).slice(0, 50),
        },
    };
}
function buildToolConnectionPreflight(toolAudit, tools) {
    const normalized = normalizeToolAuthorization(tools);
    const mcpChecks = (Array.isArray(toolAudit?.mcp) ? toolAudit.mcp : []).map((row) => ({
        kind: "mcp",
        name: cleanGrant(row?.tool ? `${row?.server}/${row?.tool}` : (row?.server || row?.raw || "")),
        state: cleanGrant(row?.state || "unknown"),
        ready: row?.state === "available",
    }));
    const skillChecks = (Array.isArray(toolAudit?.skills) ? toolAudit.skills : []).map((row) => ({
        kind: "skill",
        name: cleanGrant(row?.name || ""),
        state: cleanGrant(row?.state || "unknown"),
        ready: row?.state === "available",
    }));
    const checks = [...mcpChecks, ...skillChecks];
    const configured = normalized.mcp.length + normalized.skill.length;
    const ready = checks.filter(item => item.ready).length;
    return {
        schema: "ccm-tool-connection-preflight-v1",
        status: configured === 0 ? "not_configured" : (ready === configured ? "ready" : "needs_attention"),
        ready: configured === 0 || ready === configured,
        checkedAt: new Date().toISOString(),
        summary: { configured, ready, needsAttention: Math.max(0, configured - ready) },
        checks: checks.slice(0, 100),
    };
}
function normalizeToolAuthorization(input = {}) {
    const source = input && typeof input === "object" ? input : {};
    const mcp = compactMcpGrants(normalizeList(asArray(source.mcp), value => (typeof value === "object" ? mcpGrantFromObject(value) : cleanGrant(value))));
    const skill = normalizeList(asArray(source.skill), value => (typeof value === "object" ? skillGrantFromObject(value) : cleanGrant(value)));
    return { mcp, skill };
}
function buildToolAuthorizationPayload(input = {}) {
    const tools = normalizeToolAuthorization(input);
    const audit = typeof tool_manager_1.toolManager.buildScopeAudit === "function" ? tool_manager_1.toolManager.buildScopeAudit(tools) : null;
    return {
        tools,
        tool_audit: audit,
        authorization_readiness: buildAuthorizationReadiness(audit, tools),
        connection_preflight: buildToolConnectionPreflight(audit, tools),
    };
}
async function buildFreshToolAuthorizationPayload(input = {}) {
    try {
        await tool_manager_1.toolManager.loadTools();
    }
    catch { }
    return buildToolAuthorizationPayload(input);
}
function buildToolAuthorizationChangeRecord(input) {
    const previous = normalizeToolAuthorization(input.previous || {});
    const next = normalizeToolAuthorization(input.next || {});
    const mcp = diffGrantList(previous.mcp, next.mcp);
    const skill = diffGrantList(previous.skill, next.skill);
    const changed = !!(mcp.added.length || mcp.removed.length || skill.added.length || skill.removed.length);
    return {
        schema: "ccm-tool-authorization-change-v1",
        scope: cleanGrant(input.scope),
        scopeId: cleanGrant(input.scopeId),
        actor: cleanGrant(input.actor || "api"),
        source: cleanGrant(input.source || "unknown"),
        changed,
        before: previous,
        after: next,
        diff: { mcp, skill },
        audit: auditSummary(input.toolAudit),
        readiness: input.authorizationReadiness || buildAuthorizationReadiness(input.toolAudit, next),
    };
}
function recordToolAuthorizationChange(input) {
    const record = buildToolAuthorizationChangeRecord(input);
    appendJsonlBounded(TOOL_AUTHORIZATION_AUDIT_FILE, record);
    return { ...record, auditFile: TOOL_AUTHORIZATION_AUDIT_FILE };
}
function buildToolAuthorizationOptions(input = {}) {
    const status = input?.status && typeof input.status === "object" ? input.status : {};
    const mcpRows = Array.isArray(status.mcp) ? status.mcp : [];
    const serverRows = Array.isArray(status.servers) ? status.servers : [];
    const toolsByServer = new Map();
    for (const row of mcpRows) {
        const server = cleanGrant(row?.server);
        if (!server)
            continue;
        const list = toolsByServer.get(server) || [];
        list.push(row);
        toolsByServer.set(server, list);
    }
    const serverStatus = new Map(serverRows.map((row) => [String(row?.name || ""), row]));
    const mcp = asArray(input.mcpTools || input.mcp)
        .filter(tool => tool && typeof tool === "object" && tool.enabled !== false)
        .map(tool => {
        const name = cleanGrant(tool.name);
        const statusRow = serverStatus.get(name) || {};
        const subtools = (toolsByServer.get(name) || []).map(row => {
            const toolName = cleanGrant(row?.name);
            return {
                name: toolName,
                description: String(row?.description || ""),
                schema: row?.schema || row?.inputSchema || null,
                server: name,
                grant: `${name}/${toolName}`,
            };
        }).filter(row => row.name);
        return {
            name,
            description: String(tool.description || ""),
            type: "mcp",
            enabled: tool.enabled !== false,
            version: String(tool.version || ""),
            author: String(tool.author || ""),
            marketplace: tool.marketplace || null,
            grant: name,
            connected: !!statusRow.connected,
            state: String(statusRow.state || (statusRow.connected ? "connected" : "disconnected")),
            auth: statusRow.auth || null,
            toolsCount: subtools.length,
            tools: subtools,
        };
    })
        .filter(tool => tool.name);
    const skill = asArray(input.skills || input.skill)
        .filter(skill => skill && typeof skill === "object" && skill.enabled !== false)
        .map(skill => ({
        name: cleanGrant(skill.name),
        description: String(skill.description || ""),
        type: "skill",
        enabled: skill.enabled !== false,
        version: String(skill.version || ""),
        author: String(skill.author || ""),
        marketplace: skill.marketplace || null,
        contentHash: String(skill.contentHash || ""),
        grant: cleanGrant(skill.name),
        toolName: `skill:${cleanGrant(skill.name)}`,
    }))
        .filter(skill => skill.name);
    return {
        success: true,
        mcp,
        skill,
        summary: {
            mcp: mcp.length,
            mcpTools: mcp.reduce((sum, item) => sum + item.tools.length, 0),
            skill: skill.length,
        },
    };
}
function runToolAuthorizationSelfTest() {
    const normalized = normalizeToolAuthorization({
        mcp: [
            "payments/createInvoice",
            "payments/createInvoice",
            { server: "payments", tool: "refundInvoice" },
            { server: "github" },
            "github/listRepos",
            "bad\nvalue",
            "",
            "search",
            "mcp__ccm__search__query",
        ],
        skill: ["release-notes", { name: "security-audit" }, "release-notes", ""],
    });
    const empty = normalizeToolAuthorization({ mcp: [], skill: [] });
    const options = buildToolAuthorizationOptions({
        mcpTools: [{ name: "payments", description: "pay", enabled: true, command: "secret-command" }],
        skills: [{ name: "release-notes", description: "notes", enabled: true, prompt: "hidden" }],
        status: {
            mcp: [{ server: "payments", name: "createInvoice", description: "create", schema: { type: "object" } }],
            servers: [{ name: "payments", connected: true, state: "connected" }],
        },
    });
    const change = buildToolAuthorizationChangeRecord({
        scope: "project",
        scopeId: "demo",
        previous: { mcp: ["payments/createInvoice"], skill: [] },
        next: { mcp: ["payments/createInvoice", "payments/refundInvoice"], skill: ["release-notes"] },
        actor: "self-test",
        source: "unit",
        toolAudit: { missing_mcp_servers: [], missing_mcp_tools: [{ raw: "payments/missing" }], missing_skills: [] },
    });
    const readyReadiness = buildAuthorizationReadiness({
        mcp: [{ raw: "payments/createInvoice", server: "payments", tool: "createInvoice", state: "available" }],
        skills: [{ name: "release-notes", state: "available" }],
        missing_mcp_servers: [],
        missing_mcp_tools: [],
        missing_skills: [],
    }, { mcp: ["payments/createInvoice"], skill: ["release-notes"] });
    const missingReadiness = buildAuthorizationReadiness({
        mcp: [{ raw: "payments/missing", server: "payments", tool: "missing", state: "missing_tool" }],
        skills: [{ name: "missing-skill", state: "missing" }],
        missing_mcp_servers: [],
        missing_mcp_tools: [{ raw: "payments/missing" }],
        missing_skills: [{ name: "missing-skill" }],
    }, { mcp: ["payments/missing"], skill: ["missing-skill"] });
    const inventory = buildToolAuthorizationInventory({
        generatedAt: "2026-07-07T00:00:00.000Z",
        projects: {
            alpha: { name: "Alpha", tools: { mcp: ["payments/createInvoice"], skill: ["release-notes"] }, command: "hidden" },
            beta: { name: "Beta", tools: {} },
        },
        groups: [
            { id: "g1", name: "Ops", tools: { mcp: ["payments/missing"], skill: ["missing-skill"] }, secret: "hidden" },
        ],
        runtimeReadiness: [
            {
                runtime: "cursor",
                snapshotId: "snap-alpha-old-runtime",
                projectName: "alpha",
                groupId: "",
                checkedAt: "2026-07-06T23:59:59.000Z",
                deliveryReady: false,
                runtimeReady: true,
                overallReady: false,
                catalogStale: true,
                dispatchGate: { dispatchReady: true },
                requested: { mcp: ["payments/createInvoice"], skill: ["release-notes"] },
                synced: { mcp: ["payments/createInvoice"], skill: [] },
            },
            {
                runtime: "claudecode",
                snapshotId: "snap-alpha",
                projectName: "alpha",
                groupId: "",
                checkedAt: "2026-07-07T00:00:01.000Z",
                deliveryReady: true,
                runtimeReady: true,
                overallReady: true,
                catalogStale: false,
                dispatchGate: { dispatchReady: true },
                requested: { mcp: ["payments/createInvoice"], skill: ["release-notes"] },
                synced: { mcp: ["payments/createInvoice"], skill: ["release-notes"] },
                snapshotPath: "hidden",
            },
            {
                runtime: "codex",
                snapshotId: "snap-g1",
                projectName: "alpha",
                groupId: "g1",
                checkedAt: "2026-07-07T00:00:02.000Z",
                deliveryReady: false,
                runtimeReady: true,
                overallReady: false,
                catalogStale: true,
                dispatchGate: { dispatchReady: false, reason: "missing skill" },
                requested: { mcp: ["payments/missing"], skill: ["missing-skill"] },
                synced: { mcp: [], skill: [] },
            },
        ],
        buildPayload: (scope) => {
            const scopedTools = normalizeToolAuthorization(scope);
            const missingPayment = scopedTools.mcp.includes("payments/missing");
            const missingSkill = scopedTools.skill.includes("missing-skill");
            const audit = {
                mcp: scopedTools.mcp.map(raw => {
                    const grant = parseMcpGrant(raw);
                    return { raw, server: grant.server, tool: grant.tool, state: missingPayment ? "missing_tool" : "available" };
                }),
                skills: scopedTools.skill.map(name => ({ name, state: missingSkill ? "missing" : "available" })),
                missing_mcp_servers: [],
                missing_mcp_tools: missingPayment ? [{ raw: "payments/missing" }] : [],
                missing_skills: missingSkill ? [{ name: "missing-skill" }] : [],
            };
            return { tools: scopedTools, tool_audit: audit, authorization_readiness: buildAuthorizationReadiness(audit, scopedTools) };
        },
    });
    const checks = {
        deduplicatesMcpGrants: normalized.mcp.filter(item => item === "payments/createInvoice").length === 1,
        keepsStructuredSubtoolGrant: normalized.mcp.includes("payments/refundInvoice"),
        fullServerRemovesRedundantSubtool: normalized.mcp.includes("github") && !normalized.mcp.includes("github/listRepos"),
        nativeStyleFullServerRemovesRedundantSubtool: normalized.mcp.includes("search") && !normalized.mcp.includes("mcp__ccm__search__query"),
        normalizesSkillObjects: normalized.skill.includes("security-audit"),
        preservesExplicitEmptyScope: empty.mcp.length === 0 && empty.skill.length === 0,
        stripsControlCharacters: normalized.mcp.includes("bad value"),
        buildsAuthorizationOptions: options.mcp[0]?.grant === "payments" && options.mcp[0]?.tools?.[0]?.grant === "payments/createInvoice" && options.skill[0]?.grant === "release-notes",
        hidesRuntimeSecretsFromOptions: !("command" in options.mcp[0]) && !("prompt" in options.skill[0]),
        recordsAuthorizationDiff: change.changed === true && change.diff.mcp.added.includes("payments/refundInvoice") && change.diff.skill.added.includes("release-notes"),
        summarizesAuditWithoutServerStatus: change.audit.missing_mcp_tools === 1 && !("tool_audit" in change),
        readinessMarksReadyAuthorization: readyReadiness.dispatchReady === true && readyReadiness.status === "ready",
        readinessMarksMissingAuthorization: missingReadiness.dispatchReady === false
            && missingReadiness.missing.missing_mcp_tools >= 1
            && missingReadiness.missing.missing_skills >= 1,
        changeCarriesReadiness: change.readiness.dispatchReady === false && change.readiness.status === "needs_attention",
        buildsAuthorizationInventory: inventory.schema === "ccm-tool-authorization-inventory-v1"
            && inventory.summary.totalScopes === 3
            && inventory.summary.projects === 2
            && inventory.summary.groups === 1,
        inventorySummarizesMissingScopes: inventory.summary.ready === 2
            && inventory.summary.needsAttention === 1
            && inventory.summary.missingMcpTools === 1
            && inventory.summary.missingSkills === 1,
        inventoryHidesScopeSecrets: !JSON.stringify(inventory).includes("hidden"),
        inventorySummarizesRuntimeCoverage: inventory.summary.runtimeSnapshots === 2
            && inventory.summary.runtimeOverallReady === 1
            && inventory.summary.runtimeCatalogStale === 1
            && inventory.summary.runtimeDispatchBlocked === 1,
        inventoryAttachesProjectRuntimeCoverage: inventory.scopes.find((row) => row.scope === "project" && row.id === "alpha")?.runtime?.summary?.total === 1,
        inventoryUsesLatestSnapshotAfterRuntimeSwitch: inventory.scopes.find((row) => row.scope === "project" && row.id === "alpha")?.runtime?.snapshots?.[0]?.runtime === "claudecode"
            && inventory.scopes.find((row) => row.scope === "project" && row.id === "alpha")?.runtime?.summary?.needsResync === 0,
        inventoryAttachesGroupRuntimeCoverage: inventory.scopes.find((row) => row.scope === "group" && row.id === "g1")?.runtime?.summary?.catalogStale === 1,
        inventoryHidesRuntimePaths: !JSON.stringify(inventory).includes("snapshotPath"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, normalized, empty, options, change, inventory };
}
//# sourceMappingURL=tool-authorization.js.map