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
exports.previewToolCatalogMutationImpact = previewToolCatalogMutationImpact;
exports.completeToolCatalogMutationLifecycle = completeToolCatalogMutationLifecycle;
exports.runMarketplaceSelfTest = runMarketplaceSelfTest;
exports.installMarketplaceItemWithStore = installMarketplaceItemWithStore;
exports.uninstallMarketplaceItemWithStore = uninstallMarketplaceItemWithStore;
exports.handleMarketplaceApi = handleMarketplaceApi;
const crypto = __importStar(require("crypto"));
const dns = __importStar(require("dns/promises"));
const fs = __importStar(require("fs"));
const https = __importStar(require("https"));
const net = __importStar(require("net"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const storage_1 = require("../collaboration/storage");
const tool_authorization_1 = require("../../tools/tool-authorization");
const runtime_tool_sync_1 = require("../../tools/runtime-tool-sync");
const internal_skill_catalog_1 = require("../../skills/internal-skill-catalog");
const internal_mcp_registry_1 = require("../../tools/internal-mcp-registry");
const { toolManager } = require("../../tools/tool-manager");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const CCM_DIR = path.join(os.homedir(), ".cc-connect");
const INSTALLATIONS_FILE = path.join(CCM_DIR, "marketplace", "installations.json");
const MARKETPLACE_OPERATIONS_FILE = path.join(CCM_DIR, "marketplace", "operations.jsonl");
const SOURCES_FILE = path.join(CCM_DIR, "marketplace", "sources.json");
const SMITHERY_CONFIG_FILE = path.join(CCM_DIR, "smithery-config.json");
const MAX_CATALOG_BYTES = 2 * 1024 * 1024;
const MAX_SKILL_FILE_BYTES = 2 * 1024 * 1024;
const MAX_SKILL_PACKAGE_BYTES = 10 * 1024 * 1024;
const MAX_SKILL_PACKAGE_FILES = 300;
const CCM_COMMUNITY_CATALOG_URL = "https://raw.githubusercontent.com/mumulinya/ccm-web/main/public/marketplace.json";
const SKILLS_SH_SEARCH_URL = "https://skills.sh/api/search";
const SMITHERY_SERVERS_URL = "https://api.smithery.ai/servers";
const DEFAULT_MARKETPLACE_PAGE_SIZE = 12;
const MAX_MARKETPLACE_PAGE_SIZE = 50;
function safeSlug(value) {
    const slug = String(value || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    return slug || "tool";
}
function installationKey(type, name) {
    return `${type}:${String(name || "").trim().toLowerCase()}`;
}
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function appendJsonlBounded(file, entry) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
        if (fs.existsSync(file) && fs.statSync(file).size > 2 * 1024 * 1024) {
            const content = fs.readFileSync(file, "utf-8");
            const tail = content.slice(-1024 * 1024);
            fs.writeFileSync(file, tail.slice(Math.max(0, tail.indexOf("\n") + 1)), "utf-8");
        }
        fs.appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, "utf-8");
    }
    catch { }
}
function appendMarketplaceOperationAudit(entry, store = {}) {
    const safeEntry = {
        schema: "ccm-marketplace-operation-v1",
        action: entry.action,
        key: entry.key,
        type: entry.type,
        name: entry.name,
        source: entry.source ? {
            id: entry.source.id,
            label: entry.source.label,
            kind: entry.source.kind,
            trust: entry.source.trust,
            url: entry.source.url,
        } : undefined,
        previousVersion: entry.previousVersion || "",
        version: entry.version || "",
        previousChecksum: entry.previousChecksum || "",
        checksum: entry.checksum || "",
        changed: entry.changed === true,
        packageManaged: entry.packageManaged === true,
        toolManagerReloaded: entry.toolManagerReloaded === true,
        authorizationImpact: entry.authorizationImpact ? sanitizeMarketplaceAuthorizationImpact(entry.authorizationImpact) : undefined,
        runtimeImpact: entry.runtimeImpact ? sanitizeMarketplaceRuntimeImpact(entry.runtimeImpact) : undefined,
        runtimeResync: entry.runtimeResync ? sanitizeMarketplaceRuntimeResync(entry.runtimeResync) : undefined,
        sourceProof: entry.sourceProof ? sanitizeMarketplaceSourceProof(entry.sourceProof) : undefined,
    };
    if (store.appendAudit)
        store.appendAudit(safeEntry);
    else
        appendJsonlBounded(MARKETPLACE_OPERATIONS_FILE, safeEntry);
}
function sanitizeMarketplaceOperationAuditEntry(entry) {
    const action = cleanImpactText(entry?.action || "");
    const type = entry?.type === "skill" ? "skill" : (entry?.type === "mcp" ? "mcp" : "");
    const name = cleanImpactText(entry?.name || "", 240);
    const source = entry?.source && typeof entry.source === "object" ? {
        id: cleanImpactText(entry.source.id || "", 120),
        label: cleanImpactText(entry.source.label || "", 160),
        kind: ["builtin", "smithery", "catalog", "github", "direct"].includes(entry.source.kind) ? entry.source.kind : "",
        trust: ["official", "community", "custom"].includes(entry.source.trust) ? entry.source.trust : "",
        url: cleanImpactText(entry.source.url || "", 500),
    } : undefined;
    return {
        schema: "ccm-marketplace-operation-v1",
        at: cleanImpactText(entry?.at || "", 80),
        action,
        key: cleanImpactText(entry?.key || (type && name ? installationKey(type, name) : ""), 260),
        type,
        name,
        source,
        previousVersion: cleanImpactText(entry?.previousVersion || "", 80),
        version: cleanImpactText(entry?.version || "", 80),
        previousChecksum: cleanImpactText(entry?.previousChecksum || "", 160),
        checksum: cleanImpactText(entry?.checksum || "", 160),
        changed: entry?.changed === true,
        packageManaged: entry?.packageManaged === true,
        toolManagerReloaded: entry?.toolManagerReloaded === true,
        authorizationImpact: entry?.authorizationImpact ? sanitizeMarketplaceAuthorizationImpact(entry.authorizationImpact) : undefined,
        runtimeImpact: entry?.runtimeImpact ? sanitizeMarketplaceRuntimeImpact(entry.runtimeImpact) : undefined,
        runtimeResync: entry?.runtimeResync ? sanitizeMarketplaceRuntimeResync(entry.runtimeResync) : undefined,
        sourceProof: entry?.sourceProof ? sanitizeMarketplaceSourceProof(entry.sourceProof) : undefined,
    };
}
function readMarketplaceOperationAudit(input = {}, store = {}) {
    const requestedLimit = Number(input?.limit || 60);
    const limit = Math.max(1, Math.min(200, Number.isFinite(requestedLimit) ? requestedLimit : 60));
    let rawEntries = [];
    if (store.loadAudit) {
        rawEntries = store.loadAudit();
    }
    else {
        try {
            if (fs.existsSync(MARKETPLACE_OPERATIONS_FILE)) {
                const content = fs.readFileSync(MARKETPLACE_OPERATIONS_FILE, "utf-8").slice(-1024 * 1024);
                rawEntries = content.split(/\r?\n/).filter(Boolean).map(line => {
                    try {
                        return JSON.parse(line);
                    }
                    catch {
                        return null;
                    }
                }).filter(Boolean);
            }
        }
        catch {
            rawEntries = [];
        }
    }
    const items = rawEntries
        .map(sanitizeMarketplaceOperationAuditEntry)
        .filter(entry => entry.action && entry.type && entry.name)
        .slice(-limit)
        .reverse();
    const actionCounts = items.reduce((acc, entry) => {
        acc[entry.action] = Number(acc[entry.action] || 0) + 1;
        return acc;
    }, {});
    const impactedScopes = items.reduce((sum, entry) => sum + Number(entry.authorizationImpact?.summary?.scopeCount || 0), 0);
    const impactedRuntimeSnapshots = items.reduce((sum, entry) => sum + Number(entry.runtimeImpact?.summary?.runtimeSnapshots || 0), 0);
    const staleRuntimeSnapshots = items.reduce((sum, entry) => sum + Number(entry.runtimeImpact?.summary?.catalogStale || 0), 0);
    const runtimeResynced = items.reduce((sum, entry) => {
        const summary = entry.runtimeResync?.summary || {};
        return sum + Math.max(Number(summary.resynced || 0), Number(summary.created || 0));
    }, 0);
    const runtimeResyncFailed = items.reduce((sum, entry) => sum + Number(entry.runtimeResync?.summary?.failed || 0), 0);
    return {
        schema: "ccm-marketplace-operations-v1",
        limit,
        items,
        summary: {
            totalReturned: items.length,
            actionCounts,
            impactedScopes,
            impactedRuntimeSnapshots,
            staleRuntimeSnapshots,
            runtimeResynced,
            runtimeResyncFailed,
            truncated: rawEntries.length > items.length,
        },
    };
}
function cleanImpactText(value, max = 180) {
    const text = String(value || "").replace(/[\0\r\n\t]+/g, " ").trim();
    return text.slice(0, max);
}
function normalizeImpactMcpServerName(value) {
    return cleanImpactText(value).replace(/^ccm__/i, "").toLowerCase();
}
function mcpGrantTargetsMarketplaceServer(grant, serverName) {
    const target = normalizeImpactMcpServerName(serverName);
    if (!target)
        return false;
    const parsed = (0, tool_authorization_1.parseMcpGrant)(String(grant || ""));
    return normalizeImpactMcpServerName(parsed.server) === target;
}
function skillGrantTargetsMarketplaceSkill(grant, skillName) {
    return cleanImpactText(grant).toLowerCase() === cleanImpactText(skillName).toLowerCase();
}
function safeNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) && number > 0 ? number : 0;
}
function sanitizeMarketplaceAuthorizationScope(row) {
    const scope = row?.scope === "group" ? "group" : "project";
    const mcp = Array.isArray(row?.grants?.mcp) ? row.grants.mcp.map((grant) => cleanImpactText(grant)).filter(Boolean) : [];
    const skill = Array.isArray(row?.grants?.skill) ? row.grants.skill.map((grant) => cleanImpactText(grant)).filter(Boolean) : [];
    return {
        scope,
        id: cleanImpactText(row?.id || row?.scopeId || "", 240),
        name: cleanImpactText(row?.name || "", 240),
        grants: { mcp, skill },
    };
}
function sanitizeMarketplaceAuthorizationImpact(value) {
    const scopes = (Array.isArray(value?.scopes) ? value.scopes : []).map(sanitizeMarketplaceAuthorizationScope).filter((row) => row.id);
    return {
        schema: "ccm-marketplace-authorization-impact-v1",
        action: cleanImpactText(value?.action || ""),
        type: value?.type === "skill" ? "skill" : "mcp",
        name: cleanImpactText(value?.name || "", 240),
        summary: {
            scopeCount: safeNumber(value?.summary?.scopeCount ?? scopes.length),
            projects: safeNumber(value?.summary?.projects),
            groups: safeNumber(value?.summary?.groups),
            mcpGrants: safeNumber(value?.summary?.mcpGrants),
            skillGrants: safeNumber(value?.summary?.skillGrants),
        },
        scopes,
        truncated: value?.truncated === true,
    };
}
function loadAuthorizationImpactProjectConfigs(store = {}) {
    try {
        const configs = (store.loadProjectConfigs || db_1.loadProjectConfigs)();
        return configs && typeof configs === "object" && !Array.isArray(configs) ? configs : {};
    }
    catch {
        return {};
    }
}
function loadAuthorizationImpactGroups(store = {}) {
    try {
        const groups = (store.loadGroups || storage_1.loadGroups)();
        return Array.isArray(groups) ? groups : [];
    }
    catch {
        return [];
    }
}
function buildMarketplaceAuthorizationImpact(input, store = {}) {
    const type = input.type === "skill" ? "skill" : "mcp";
    const name = cleanImpactText(input.name, 240);
    const scopes = [];
    const addScope = (scope, id, label, tools) => {
        const normalized = (0, tool_authorization_1.normalizeToolAuthorization)(tools || {});
        const grants = type === "mcp"
            ? { mcp: normalized.mcp.filter(grant => mcpGrantTargetsMarketplaceServer(grant, name)), skill: [] }
            : { mcp: [], skill: normalized.skill.filter(grant => skillGrantTargetsMarketplaceSkill(grant, name)) };
        if (!grants.mcp.length && !grants.skill.length)
            return;
        scopes.push(sanitizeMarketplaceAuthorizationScope({ scope, id, name: label || id, grants }));
    };
    const projectConfigs = loadAuthorizationImpactProjectConfigs(store);
    for (const [projectId, config] of Object.entries(projectConfigs)) {
        const row = config;
        addScope("project", projectId, row?.name || row?.displayName || row?.project || projectId, row?.tools || {});
    }
    for (const group of loadAuthorizationImpactGroups(store)) {
        addScope("group", group?.id, group?.name || group?.title || group?.id, group?.tools || {});
    }
    const projectCount = scopes.filter(row => row.scope === "project").length;
    const groupCount = scopes.filter(row => row.scope === "group").length;
    const mcpGrants = scopes.reduce((sum, row) => sum + row.grants.mcp.length, 0);
    const skillGrants = scopes.reduce((sum, row) => sum + row.grants.skill.length, 0);
    const limitedScopes = scopes.slice(0, 200);
    return sanitizeMarketplaceAuthorizationImpact({
        action: input.action,
        type,
        name,
        summary: {
            scopeCount: scopes.length,
            projects: projectCount,
            groups: groupCount,
            mcpGrants,
            skillGrants,
        },
        scopes: limitedScopes,
        truncated: scopes.length > limitedScopes.length,
    });
}
function previewMarketplaceAuthorizationImpact(payload, store = {}) {
    const type = String(payload?.type || "").toLowerCase();
    const name = String(payload?.name || "").trim();
    const action = String(payload?.action || "preview").toLowerCase();
    if (!["mcp", "skill"].includes(type) || !name)
        throw new Error("授权影响预检参数无效");
    const normalizedAction = ["install", "update", "uninstall", "preview"].includes(action) ? action : "preview";
    return {
        authorizationImpact: buildMarketplaceAuthorizationImpact({ action: normalizedAction, type, name }, store),
    };
}
function runtimeAuditRequestsMarketplaceItem(audit, type, name) {
    const requested = audit?.requested || audit?.allowedTools || audit?.allowed_tools || {};
    if (type === "skill") {
        return uniqueImpactList(requested.skill).some(grant => skillGrantTargetsMarketplaceSkill(grant, name));
    }
    return uniqueImpactList(requested.mcp).some(grant => mcpGrantTargetsMarketplaceServer(grant, name));
}
function uniqueImpactList(value) {
    if (!Array.isArray(value))
        return [];
    return Array.from(new Set(value.map(item => cleanImpactText(item, 240)).filter(Boolean)));
}
function sanitizeMarketplaceRuntimeSnapshot(row) {
    const failedChecks = Array.isArray(row?.failedChecks) ? row.failedChecks.map((item) => cleanImpactText(item, 120)).filter(Boolean) : [];
    return {
        runtime: cleanImpactText(row?.runtime || "", 80),
        snapshotId: cleanImpactText(row?.snapshotId || "", 80),
        projectName: cleanImpactText(row?.projectName || "", 240),
        groupId: cleanImpactText(row?.groupId || "", 180),
        catalogStale: row?.catalogStale === true,
        deliveryReady: row?.deliveryReady === true,
        runtimeReady: row?.runtimeReady === true,
        overallReady: row?.overallReady === true,
        dispatchReady: row?.dispatchReady !== false,
        currentCatalogRevision: cleanImpactText(row?.currentCatalogRevision || "", 80),
        catalogRevision: cleanImpactText(row?.catalogRevision || "", 80),
        failedChecks: failedChecks.slice(0, 12),
    };
}
function sanitizeMarketplaceRuntimeImpact(value) {
    const snapshots = (Array.isArray(value?.snapshots) ? value.snapshots : []).map(sanitizeMarketplaceRuntimeSnapshot).filter((row) => row.runtime || row.snapshotId);
    return {
        schema: "ccm-marketplace-runtime-impact-v1",
        action: cleanImpactText(value?.action || ""),
        type: value?.type === "skill" ? "skill" : "mcp",
        name: cleanImpactText(value?.name || "", 240),
        summary: {
            runtimeSnapshots: safeNumber(value?.summary?.runtimeSnapshots ?? snapshots.length),
            catalogStale: safeNumber(value?.summary?.catalogStale),
            dispatchBlocked: safeNumber(value?.summary?.dispatchBlocked),
            deliveryBlocked: safeNumber(value?.summary?.deliveryBlocked),
            affectedProjects: safeNumber(value?.summary?.affectedProjects),
            affectedGroups: safeNumber(value?.summary?.affectedGroups),
        },
        snapshots,
        truncated: value?.truncated === true,
    };
}
function sanitizeMarketplaceRuntimeResyncItem(item) {
    return {
        action: cleanImpactText(item?.action || "", 80),
        reason: cleanImpactText(item?.reason || "", 180),
        before: item?.before ? sanitizeMarketplaceRuntimeSnapshot(item.before) : undefined,
        after: item?.after ? sanitizeMarketplaceRuntimeSnapshot(item.after) : (item?.runtime || item?.snapshotId ? sanitizeMarketplaceRuntimeSnapshot(item) : undefined),
    };
}
function sanitizeMarketplaceRuntimeResync(value) {
    const items = (Array.isArray(value?.items) ? value.items : [])
        .map(sanitizeMarketplaceRuntimeResyncItem)
        .filter((item) => item.action)
        .slice(0, 80);
    return {
        schema: "ccm-marketplace-runtime-resync-v1",
        success: value?.success !== false,
        requestedAt: cleanImpactText(value?.requestedAt || "", 80),
        error: value?.error ? cleanImpactText(value.error, 500) : undefined,
        summary: {
            scanned: safeNumber(value?.summary?.scanned),
            selected: safeNumber(value?.summary?.selected),
            created: safeNumber(value?.summary?.created),
            resynced: safeNumber(value?.summary?.resynced),
            skipped: safeNumber(value?.summary?.skipped),
            failed: safeNumber(value?.summary?.failed),
        },
        items,
    };
}
function loadMarketplaceRuntimeAudits(store = {}) {
    try {
        const audits = store.loadRuntimeAudits ? store.loadRuntimeAudits() : (0, runtime_tool_sync_1.listRecentRuntimeToolAudits)(80);
        return Array.isArray(audits) ? audits : [];
    }
    catch {
        return [];
    }
}
function buildMarketplaceRuntimeImpact(input, store = {}) {
    const type = input.type === "skill" ? "skill" : "mcp";
    const name = cleanImpactText(input.name, 240);
    const snapshots = [];
    const catalog = buildMarketplaceRuntimeCatalog(store);
    for (const audit of loadMarketplaceRuntimeAudits(store)) {
        if (!runtimeAuditRequestsMarketplaceItem(audit, type, name))
            continue;
        const readiness = (0, runtime_tool_sync_1.probeRuntimeToolReadiness)(audit, { record: false, catalog });
        const failedChecks = Array.isArray(readiness.checks)
            ? readiness.checks.filter(check => !check.ok).map(check => check.id)
            : [];
        snapshots.push(sanitizeMarketplaceRuntimeSnapshot({
            runtime: readiness.runtime,
            snapshotId: readiness.snapshotId,
            projectName: readiness.projectName,
            groupId: readiness.groupId,
            catalogStale: readiness.catalogStale === true,
            deliveryReady: readiness.deliveryReady === true,
            runtimeReady: readiness.runtimeReady === true,
            overallReady: readiness.overallReady === true,
            dispatchReady: readiness.dispatchGate?.dispatchReady !== false,
            catalogRevision: readiness.catalogRevision,
            currentCatalogRevision: readiness.currentCatalogRevision,
            failedChecks,
        }));
    }
    const limitedSnapshots = snapshots.slice(0, 80);
    const projectIds = new Set(snapshots.map(row => row.projectName).filter(Boolean));
    const groupIds = new Set(snapshots.map(row => row.groupId).filter(Boolean));
    return sanitizeMarketplaceRuntimeImpact({
        action: input.action,
        type,
        name,
        summary: {
            runtimeSnapshots: snapshots.length,
            catalogStale: snapshots.filter(row => row.catalogStale).length,
            dispatchBlocked: snapshots.filter(row => row.dispatchReady === false).length,
            deliveryBlocked: snapshots.filter(row => row.deliveryReady === false).length,
            affectedProjects: projectIds.size,
            affectedGroups: groupIds.size,
        },
        snapshots: limitedSnapshots,
        truncated: snapshots.length > limitedSnapshots.length,
    });
}
function marketplaceAutoResyncRequested(value) {
    if (value === true)
        return true;
    const text = String(value || "").toLowerCase();
    return ["1", "true", "yes", "auto"].includes(text);
}
function buildMarketplaceRuntimeCatalog(store = {}) {
    return {
        mcpTools: (store.loadMcpTools || db_1.loadMcpTools)(),
        skills: (store.loadSkills || db_1.loadSkills)(),
        skillPackagesDir: store.skillPackagesDir || db_1.SKILL_PACKAGES_DIR,
    };
}
function maybeAutoResyncMarketplaceRuntime(impact, options = {}, store = {}) {
    if (!marketplaceAutoResyncRequested(options?.autoResync))
        return null;
    const snapshots = Array.isArray(impact?.snapshots) ? impact.snapshots : [];
    const snapshotIds = snapshots.map(snapshot => cleanImpactText(snapshot?.snapshotId || "", 80)).filter(Boolean);
    try {
        const catalog = buildMarketplaceRuntimeCatalog(store);
        const existing = snapshotIds.length ? (0, runtime_tool_sync_1.resyncRecentRuntimeToolSnapshots)({
            staleOnly: false,
            limit: Math.min(50, Math.max(1, snapshotIds.length)),
            snapshotIds,
            audits: loadMarketplaceRuntimeAudits(store),
            catalog,
        }) : null;
        const missing = (0, runtime_tool_sync_1.resyncMissingRuntimeToolSnapshots)({
            type: impact?.type,
            name: impact?.name,
            limit: 30,
            projects: store.loadProjectConfigs ? store.loadProjectConfigs() : (0, db_1.loadProjectConfigs)(),
            groups: store.loadGroups ? store.loadGroups() : (0, storage_1.loadGroups)(),
            catalog,
        });
        const existingSummary = existing?.summary || {};
        const missingSummary = missing?.summary || {};
        const result = {
            schema: "ccm-runtime-tool-resync-v1",
            success: true,
            requestedAt: new Date().toISOString(),
            summary: {
                scanned: safeNumber(existingSummary.scanned) + safeNumber(missingSummary.scanned),
                selected: safeNumber(existingSummary.selected) + safeNumber(missingSummary.selected),
                created: safeNumber(missingSummary.created),
                resynced: safeNumber(existingSummary.resynced) + safeNumber(missingSummary.created),
                skipped: safeNumber(existingSummary.skipped) + safeNumber(missingSummary.skipped),
                failed: safeNumber(existingSummary.failed) + safeNumber(missingSummary.failed),
            },
            items: [
                ...((Array.isArray(existing?.items) ? existing.items : [])),
                ...((Array.isArray(missing?.items) ? missing.items : [])),
            ],
        };
        if (!result.items.length && result.summary.selected === 0)
            return null;
        return sanitizeMarketplaceRuntimeResync(result);
    }
    catch (error) {
        return sanitizeMarketplaceRuntimeResync({
            success: false,
            requestedAt: new Date().toISOString(),
            error: error?.message || String(error),
            summary: { scanned: 0, selected: 0, resynced: 0, skipped: 0, failed: 1 },
            items: [],
        });
    }
}
function previewToolCatalogMutationImpact(input, store = {}) {
    const type = input?.type === "skill" ? "skill" : "mcp";
    const name = cleanImpactText(input?.name || "", 240);
    if (!name)
        throw new Error("工具名称不能为空");
    const action = cleanImpactText(input?.action || "preview", 40);
    return {
        authorizationImpact: buildMarketplaceAuthorizationImpact({ action, type, name }, store),
        runtimeImpact: buildMarketplaceRuntimeImpact({ action, type, name }, store),
    };
}
function completeToolCatalogMutationLifecycle(input, store = {}) {
    const preview = previewToolCatalogMutationImpact(input, store);
    const runtimeResync = maybeAutoResyncMarketplaceRuntime(preview.runtimeImpact, {
        autoResync: input?.autoResync !== false,
    }, store);
    const runtimeImpact = runtimeResync?.summary?.resynced || runtimeResync?.summary?.created
        ? buildMarketplaceRuntimeImpact({ action: input.action, type: input.type, name: input.name }, store)
        : preview.runtimeImpact;
    return { authorizationImpact: preview.authorizationImpact, runtimeImpact, runtimeResync };
}
function loadInstallations() {
    try {
        const parsed = JSON.parse(fs.readFileSync(INSTALLATIONS_FILE, "utf-8"));
        return Array.isArray(parsed?.items) ? parsed.items : [];
    }
    catch {
        return [];
    }
}
function saveInstallations(items) {
    writeJsonAtomic(INSTALLATIONS_FILE, { version: 1, items });
}
function marketplaceSourceId(url) {
    return `external-${sha256(url).slice(0, 12)}`;
}
function normalizeSavedSource(value) {
    const url = String(value?.url || "").trim();
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        return null;
    }
    if (parsed.protocol !== "https:")
        return null;
    const now = new Date().toISOString();
    const label = String(value?.label || parsed.hostname).replace(/[\r\n\t]+/g, " ").trim().slice(0, 80) || parsed.hostname;
    const trust = value?.trust === "community" ? "community" : "custom";
    return {
        id: String(value?.id || marketplaceSourceId(parsed.toString())).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || marketplaceSourceId(parsed.toString()),
        label,
        kind: "catalog",
        url: parsed.toString(),
        trust,
        enabled: value?.enabled !== false,
        createdAt: String(value?.createdAt || now),
        updatedAt: String(value?.updatedAt || now),
    };
}
function loadMarketplaceSources() {
    try {
        const parsed = JSON.parse(fs.readFileSync(SOURCES_FILE, "utf-8"));
        const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
        return rawItems.map(normalizeSavedSource).filter(Boolean);
    }
    catch {
        return [];
    }
}
function saveMarketplaceSources(items) {
    writeJsonAtomic(SOURCES_FILE, { version: 1, items });
}
function isPathInside(root, candidate) {
    const relative = path.relative(path.resolve(root), path.resolve(candidate));
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}
function removeManagedPackage(packagePath, skillPackagesDir = db_1.SKILL_PACKAGES_DIR) {
    if (!packagePath || !isPathInside(skillPackagesDir, packagePath))
        return;
    if (fs.existsSync(packagePath))
        fs.rmSync(packagePath, { recursive: true, force: true });
}
function sha256(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
function objectKeys(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? Object.keys(value).map(key => String(key || "").trim()).filter(Boolean).sort()
        : [];
}
function marketplaceEnvKeys(item) {
    if (item?.env && typeof item.env === "object" && !Array.isArray(item.env))
        return objectKeys(item.env);
    return String(item?.env || "")
        .split(/\r?\n/)
        .map(line => line.split("=")[0]?.trim())
        .filter(Boolean)
        .sort();
}
function marketplaceSourceSummary(source = {}) {
    return {
        id: cleanImpactText(source?.id || "", 120),
        label: cleanImpactText(source?.label || "", 160),
        kind: ["builtin", "smithery", "catalog", "github", "direct"].includes(source?.kind) ? source.kind : "",
        trust: ["official", "community", "custom"].includes(source?.trust) ? source.trust : "",
        url: cleanImpactText(source?.url || "", 500),
    };
}
function marketplaceSourceMaterial(item, packageStats = null) {
    if (item?.type === "mcp") {
        return {
            type: "mcp",
            name: String(item?.name || ""),
            version: String(item?.version || ""),
            transport: item?.url ? "http" : "stdio",
            command: String(item?.command || ""),
            args: Array.isArray(item?.args) ? item.args.map(String) : [],
            url: String(item?.url || ""),
            envKeys: marketplaceEnvKeys(item),
            headerKeys: objectKeys(item?.headers),
            sourceUrl: String(item?.sourceUrl || ""),
        };
    }
    return {
        type: "skill",
        name: String(item?.name || ""),
        version: String(item?.version || ""),
        sourceUrl: String(item?.sourceUrl || ""),
        downloadUrl: String(item?.downloadUrl || ""),
        promptBytes: Buffer.byteLength(String(item?.prompt || ""), "utf-8"),
        packageBacked: !!(item?.sourceUrl && !item?.prompt),
        packageStats: packageStats ? {
            files: safeNumber(packageStats.files),
            totalBytes: safeNumber(packageStats.totalBytes),
        } : undefined,
    };
}
function marketplaceMaterialKind(item) {
    if (item?.type === "mcp")
        return item?.url ? "remote_mcp" : "stdio_mcp";
    if (item?.prompt)
        return "inline_skill";
    if (item?.downloadUrl && !parseGithubSkillSource(item.downloadUrl))
        return "downloaded_skill";
    return "github_skill_package";
}
function buildMarketplaceSourceProof(item, input = {}) {
    const material = marketplaceSourceMaterial(item, input.packageStats || null);
    return sanitizeMarketplaceSourceProof({
        schema: "ccm-marketplace-source-proof-v1",
        itemId: item?.id,
        type: item?.type,
        name: item?.name,
        version: item?.version,
        source: item?.source,
        materialKind: input.materialKind || marketplaceMaterialKind(item),
        materialHash: sha256(JSON.stringify(material)),
        checksum: input.checksum || "",
        envKeys: item?.type === "mcp" ? material.envKeys : [],
        headerKeys: item?.type === "mcp" ? material.headerKeys : [],
        packageStats: input.packageStats || null,
    });
}
function sanitizeMarketplacePreviewItem(item) {
    return {
        id: cleanImpactText(item?.id || "", 260),
        name: cleanImpactText(item?.name || "", 240),
        displayName: cleanImpactText(item?.displayName || item?.name || "", 240),
        type: item?.type === "skill" ? "skill" : (item?.type === "mcp" ? "mcp" : ""),
        description: cleanImpactText(item?.description || "", 500),
        author: cleanImpactText(item?.author || "", 160),
        version: cleanImpactText(item?.version || "", 80),
        source: marketplaceSourceSummary(item?.source || {}),
        sourceUrl: cleanImpactText(item?.sourceUrl || "", 500),
        downloadUrl: cleanImpactText(item?.downloadUrl || "", 500),
        homepage: cleanImpactText(item?.homepage || "", 500),
        command: item?.type === "mcp" ? cleanImpactText(item?.command || "", 240) : "",
        args: item?.type === "mcp" && Array.isArray(item?.args) ? item.args.map((arg) => cleanImpactText(arg, 240)).slice(0, 80) : [],
        url: item?.type === "mcp" ? cleanImpactText(item?.url || "", 500) : "",
        envKeys: item?.type === "mcp" ? marketplaceEnvKeys(item) : [],
        headerKeys: item?.type === "mcp" ? objectKeys(item?.headers) : [],
    };
}
function sanitizeMarketplaceSourceProof(value) {
    const packageStats = value?.packageStats || {};
    return {
        schema: "ccm-marketplace-source-proof-v1",
        itemId: cleanImpactText(value?.itemId || "", 260),
        type: value?.type === "skill" ? "skill" : (value?.type === "mcp" ? "mcp" : ""),
        name: cleanImpactText(value?.name || "", 240),
        version: cleanImpactText(value?.version || "", 80),
        source: marketplaceSourceSummary(value?.source || {}),
        materialKind: cleanImpactText(value?.materialKind || "", 80),
        materialHash: cleanImpactText(value?.materialHash || "", 80),
        checksum: cleanImpactText(value?.checksum || "", 160),
        envKeys: Array.isArray(value?.envKeys) ? value.envKeys.map((key) => cleanImpactText(key, 120)).filter(Boolean).slice(0, 60) : [],
        headerKeys: Array.isArray(value?.headerKeys) ? value.headerKeys.map((key) => cleanImpactText(key, 120)).filter(Boolean).slice(0, 60) : [],
        packageStats: {
            files: safeNumber(packageStats.files),
            totalBytes: safeNumber(packageStats.totalBytes),
        },
    };
}
function compareVersions(left, right) {
    const parse = (value) => String(value || "0").split(/[.+-]/).map(part => Number(part.match(/^\d+/)?.[0] || 0));
    const a = parse(left);
    const b = parse(right);
    for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
        const delta = (a[index] || 0) - (b[index] || 0);
        if (delta)
            return delta;
    }
    return 0;
}
function normalizeSource(value, fallback) {
    const source = value && typeof value === "object" ? value : {};
    return {
        id: String(source.id || fallback.id),
        label: String(source.label || fallback.label),
        kind: ["builtin", "skills-sh", "smithery", "catalog", "github", "direct"].includes(source.kind) ? source.kind : fallback.kind,
        url: String(source.url || fallback.url || "") || undefined,
        trust: ["official", "community", "custom"].includes(source.trust) ? source.trust : fallback.trust,
    };
}
function baseMarketplaceSourceId(value) {
    return String(value || "").replace(/:claude-plugin$/i, "");
}
function publicMarketplaceSources() {
    return loadMarketplaceSources().filter(source => source.enabled !== false);
}
function normalizeMarketplaceItem(item, fallbackSource) {
    const type = String(item?.type || "").toLowerCase();
    if (!["mcp", "skill"].includes(type))
        throw new Error("商城条目 type 必须为 mcp 或 skill");
    const name = String(item?.name || item?.displayName || item?.slug || "").trim();
    if (!name || name.length > 120 || /[\\/\0\r\n]/.test(name))
        throw new Error("商城条目名称无效");
    const source = normalizeSource(item?.source, fallbackSource);
    const normalized = {
        ...item,
        id: String(item?.id || `${source.id}:${type}:${safeSlug(name)}`),
        name,
        type,
        description: String(item?.description || item?.summary || "").trim(),
        author: String(item?.author?.name || item?.author || item?.owner || source.label || "Unknown"),
        version: String(item?.version || "0.0.0"),
        source,
        sourceUrl: String(item?.sourceUrl || item?.repository || item?.homepage || source.url || ""),
        downloadUrl: String(item?.downloadUrl || item?.skillUrl || ""),
        homepage: String(item?.homepage || item?.repository || ""),
        command: String(item?.command || "").trim(),
        args: Array.isArray(item?.args) ? item.args.map(String) : [],
        url: String(item?.url || "").trim(),
        env: item?.env && typeof item.env === "object" ? item.env : String(item?.env || ""),
        prompt: String(item?.prompt || item?.content || ""),
    };
    if (type === "mcp" && !normalized.command && !normalized.url)
        throw new Error(`MCP "${name}" 缺少 command 或 url`);
    if (type === "skill" && !normalized.prompt && !normalized.downloadUrl && !normalized.sourceUrl) {
        throw new Error(`Skill "${name}" 缺少 prompt、downloadUrl 或 sourceUrl`);
    }
    return normalized;
}
function normalizeMarketplaceInstallRequest(item, fallbackSource) {
    const type = String(item?.type || "").toLowerCase();
    if (!["mcp", "skill"].includes(type))
        throw new Error("商城条目 type 必须为 mcp 或 skill");
    const name = String(item?.name || item?.displayName || item?.slug || "").trim();
    if (!name || name.length > 120 || /[\\/\0\r\n]/.test(name))
        throw new Error("商城条目名称无效");
    const source = normalizeSource(item?.source, fallbackSource);
    return {
        id: String(item?.id || `${source.id}:${type}:${safeSlug(name)}`),
        name,
        type,
        source,
    };
}
function cleanRelativePackagePath(value) {
    const raw = String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const parts = raw.split("/").filter(part => part && part !== ".");
    if (parts.some(part => part === ".."))
        return "";
    return parts.join("/");
}
function githubRepoFromUrlOrShorthand(value) {
    const raw = String(value || "").trim();
    if (!raw)
        return null;
    const shorthand = raw.match(/^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)(?:\.git)?$/);
    if (shorthand)
        return shorthand[1].replace(/\.git$/i, "");
    try {
        const parsed = new URL(raw);
        if (!["github.com", "www.github.com"].includes(parsed.hostname.toLowerCase()))
            return null;
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts.length < 2)
            return null;
        return `${parts[0]}/${parts[1].replace(/\.git$/i, "")}`;
    }
    catch {
        const ssh = raw.match(/^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/i);
        return ssh ? ssh[1].replace(/\.git$/i, "") : null;
    }
}
function githubContextFromCatalogUrl(value) {
    try {
        const parsed = new URL(value);
        if (parsed.hostname.toLowerCase() === "raw.githubusercontent.com") {
            const parts = parsed.pathname.split("/").filter(Boolean);
            if (parts.length >= 4) {
                const filePath = parts.slice(3).join("/");
                return {
                    repo: `${parts[0]}/${parts[1]}`,
                    ref: parts[2],
                    basePath: cleanRelativePackagePath(path.posix.dirname(filePath)),
                };
            }
        }
        if (["github.com", "www.github.com"].includes(parsed.hostname.toLowerCase())) {
            const parts = parsed.pathname.split("/").filter(Boolean);
            if (parts.length >= 5 && ["blob", "raw"].includes(parts[2])) {
                const filePath = parts.slice(4).join("/");
                return {
                    repo: `${parts[0]}/${parts[1].replace(/\.git$/i, "")}`,
                    ref: parts[3],
                    basePath: cleanRelativePackagePath(path.posix.dirname(filePath)),
                };
            }
        }
    }
    catch { }
    return null;
}
function githubContextFromPluginSource(pluginSource, catalogUrl = "") {
    if (typeof pluginSource === "string") {
        const catalogContext = githubContextFromCatalogUrl(catalogUrl);
        if (!catalogContext)
            return null;
        return {
            repo: catalogContext.repo,
            ref: catalogContext.ref,
            basePath: cleanRelativePackagePath(path.posix.join(catalogContext.basePath || "", cleanRelativePackagePath(pluginSource))),
        };
    }
    if (!pluginSource || typeof pluginSource !== "object")
        return null;
    if (pluginSource.source === "github" && pluginSource.repo) {
        return {
            repo: String(pluginSource.repo),
            ref: String(pluginSource.ref || pluginSource.sha || ""),
            basePath: "",
        };
    }
    if (pluginSource.source === "git-subdir" && pluginSource.url) {
        const repo = githubRepoFromUrlOrShorthand(pluginSource.url);
        return repo ? {
            repo,
            ref: String(pluginSource.ref || pluginSource.sha || ""),
            basePath: cleanRelativePackagePath(pluginSource.path),
        } : null;
    }
    if (pluginSource.source === "url" && pluginSource.url) {
        const repo = githubRepoFromUrlOrShorthand(pluginSource.url);
        return repo ? {
            repo,
            ref: String(pluginSource.ref || pluginSource.sha || ""),
            basePath: "",
        } : null;
    }
    return null;
}
function githubSkillSourceUrl(pluginSource, skillPath, catalogUrl = "") {
    const context = githubContextFromPluginSource(pluginSource, catalogUrl);
    if (!context?.repo)
        return "";
    const relativeSkill = cleanRelativePackagePath(skillPath);
    if (!relativeSkill)
        return "";
    const packagePath = cleanRelativePackagePath(path.posix.join(context.basePath || "", relativeSkill));
    const ref = context.ref || "HEAD";
    return `https://github.com/${context.repo}/tree/${encodeURIComponent(ref)}/${packagePath.split("/").map(encodeURIComponent).join("/")}`;
}
function mergeInlineMcpServers(spec) {
    const merged = {};
    const absorb = (value) => {
        if (!value || typeof value !== "object" || Array.isArray(value))
            return;
        for (const [name, config] of Object.entries(value)) {
            if (!config || typeof config !== "object" || Array.isArray(config))
                continue;
            const row = config;
            if (row.command || row.url)
                merged[String(name)] = row;
        }
    };
    if (Array.isArray(spec)) {
        for (const item of spec)
            absorb(item);
    }
    else {
        absorb(spec);
    }
    return merged;
}
function convertClaudePluginMarketplace(parsed, source, catalogUrl = "") {
    const plugins = Array.isArray(parsed?.plugins) ? parsed.plugins : [];
    const items = [];
    for (const plugin of plugins) {
        const pluginName = String(plugin?.name || "").trim();
        if (!pluginName)
            continue;
        const pluginDescription = String(plugin.description || parsed?.metadata?.description || "");
        const pluginHomepage = (() => {
            const repo = githubContextFromPluginSource(plugin.source, catalogUrl)?.repo;
            return repo ? `https://github.com/${repo}` : String(plugin.homepage || plugin.repository || "");
        })();
        const pluginSource = {
            ...source,
            id: `${source.id}:claude-plugin`,
            label: `${source.label} / Claude Plugin`,
            kind: "catalog",
        };
        const mcpServers = mergeInlineMcpServers(plugin.mcpServers);
        for (const [serverName, serverConfig] of Object.entries(mcpServers)) {
            const config = serverConfig;
            items.push(normalizeMarketplaceItem({
                name: `${pluginName}-${serverName}`,
                type: "mcp",
                description: String(config.description || pluginDescription || `MCP server from Claude plugin ${pluginName}`),
                command: config.command,
                args: Array.isArray(config.args) ? config.args : [],
                url: config.url,
                headers: config.headers,
                env: config.env || "",
                author: plugin.author || parsed?.owner?.name || parsed?.owner || source.label,
                version: plugin.version || parsed?.metadata?.version || "0.0.0",
                homepage: pluginHomepage,
                sourceUrl: pluginHomepage || catalogUrl,
            }, pluginSource));
        }
        const skillPaths = Array.isArray(plugin.skills) ? plugin.skills : (plugin.skills ? [plugin.skills] : []);
        for (const skillPath of skillPaths) {
            const sourceUrl = githubSkillSourceUrl(plugin.source, skillPath, catalogUrl);
            if (!sourceUrl)
                continue;
            const skillBase = path.posix.basename(cleanRelativePackagePath(skillPath)) || "skill";
            items.push(normalizeMarketplaceItem({
                name: `${pluginName}-${skillBase}`,
                type: "skill",
                description: pluginDescription || `Skill from Claude plugin ${pluginName}`,
                sourceUrl,
                homepage: pluginHomepage || sourceUrl,
                author: plugin.author || parsed?.owner?.name || parsed?.owner || source.label,
                version: plugin.version || parsed?.metadata?.version || "0.0.0",
            }, pluginSource));
        }
    }
    return items;
}
function catalogItemsFromParsedJson(parsed, source, catalogUrl = "") {
    const rawItems = Array.isArray(parsed) ? parsed : (parsed.items || parsed.tools || []);
    const ccmItems = Array.isArray(rawItems)
        ? rawItems.map((item) => normalizeMarketplaceItem(item, { ...source, url: catalogUrl || source.url }))
        : [];
    const claudeItems = convertClaudePluginMarketplace(parsed, { ...source, url: catalogUrl || source.url }, catalogUrl || source.url || "");
    const seen = new Set();
    return [...ccmItems, ...claudeItems].filter(item => {
        const key = `${item.type}:${item.name}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function decorateInstallState(items) {
    const installations = loadInstallations();
    const installedMcp = new Map((0, db_1.loadMcpTools)().map(item => [String(item.name), item]));
    const installedSkills = new Map((0, db_1.loadSkills)().map(item => [String(item.name), item]));
    return items.map(item => {
        const record = installations.find(entry => entry.key === installationKey(item.type, item.name));
        const installed = item.type === "mcp" ? installedMcp.has(item.name) : installedSkills.has(item.name);
        return {
            ...item,
            installed,
            installedVersion: record?.version || (item.type === "mcp" ? installedMcp.get(item.name)?.version : installedSkills.get(item.name)?.version) || "",
            updateAvailable: !!record && compareVersions(item.version, record.version) > 0,
            installation: record || null,
        };
    });
}
function isPrivateAddress(address) {
    if (net.isIPv4(address)) {
        const [a, b] = address.split(".").map(Number);
        return a === 10
            || a === 127
            || a === 0
            || (a === 169 && b === 254)
            || (a === 172 && b >= 16 && b <= 31)
            || (a === 192 && b === 168);
    }
    const value = address.toLowerCase();
    return value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:");
}
async function assertSafeHttpsUrl(value) {
    let parsed;
    try {
        parsed = new URL(value);
    }
    catch {
        throw new Error("外部来源 URL 无效");
    }
    if (parsed.protocol !== "https:")
        throw new Error("外部来源仅允许 HTTPS");
    if (parsed.username || parsed.password)
        throw new Error("外部来源 URL 不允许内嵌凭据");
    if (["localhost", "localhost.localdomain"].includes(parsed.hostname.toLowerCase()))
        throw new Error("外部来源不允许访问本机地址");
    const addresses = await dns.lookup(parsed.hostname, { all: true });
    if (!addresses.length || addresses.some(item => isPrivateAddress(item.address)))
        throw new Error("外部来源不允许访问内网地址");
    return parsed;
}
async function fetchRemote(value, maxBytes, headers = {}, redirects = 0) {
    if (redirects > 4)
        throw new Error("外部来源重定向次数过多");
    const parsed = await assertSafeHttpsUrl(value);
    return new Promise((resolve, reject) => {
        const request = https.get(parsed, {
            headers: { "User-Agent": "ccm-tool-marketplace/1.0", Accept: "application/json,text/markdown,text/plain,*/*", ...headers },
            timeout: 15000,
        }, response => {
            const status = Number(response.statusCode || 0);
            if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
                response.resume();
                const next = new URL(response.headers.location, parsed).toString();
                fetchRemote(next, maxBytes, headers, redirects + 1).then(resolve, reject);
                return;
            }
            if (status < 200 || status >= 300) {
                response.resume();
                reject(new Error(`外部来源请求失败 (HTTP ${status})`));
                return;
            }
            const chunks = [];
            let size = 0;
            response.on("data", chunk => {
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                size += buffer.length;
                if (size > maxBytes) {
                    request.destroy(new Error(`外部来源内容超过 ${Math.round(maxBytes / 1024)}KB 限制`));
                    return;
                }
                chunks.push(buffer);
            });
            response.on("end", () => resolve({
                body: Buffer.concat(chunks),
                contentType: String(response.headers["content-type"] || ""),
                finalUrl: parsed.toString(),
            }));
        });
        request.on("timeout", () => request.destroy(new Error("外部来源请求超时")));
        request.on("error", reject);
    });
}
function parseSkillMarkdown(content, fallbackName = "", fallbackDescription = "") {
    const text = String(content || "").replace(/^\uFEFF/, "");
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    const frontmatter = match?.[1] || "";
    const readField = (name) => {
        const field = frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, "mi"))?.[1]?.trim() || "";
        return field.replace(/^['"]|['"]$/g, "");
    };
    return {
        name: readField("name") || fallbackName,
        description: readField("description") || fallbackDescription,
        prompt: match ? text.slice(match[0].length).trim() : text.trim(),
        content: text,
    };
}
function ensureSkillFrontmatter(content, name, description) {
    const text = String(content || "").replace(/^\uFEFF/, "");
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) {
        return `---\nname: ${JSON.stringify(name)}\ndescription: ${JSON.stringify(description || `CCM installed skill: ${name}`)}\n---\n\n${text.trim()}\n`;
    }
    let frontmatter = match[1];
    if (/^name:/mi.test(frontmatter))
        frontmatter = frontmatter.replace(/^name:\s*.*$/mi, `name: ${JSON.stringify(name)}`);
    else
        frontmatter = `name: ${JSON.stringify(name)}\n${frontmatter}`;
    if (/^description:/mi.test(frontmatter)) {
        frontmatter = frontmatter.replace(/^description:\s*.*$/mi, `description: ${JSON.stringify(description || `CCM installed skill: ${name}`)}`);
    }
    else {
        frontmatter = `${frontmatter}\ndescription: ${JSON.stringify(description || `CCM installed skill: ${name}`)}`;
    }
    return `---\n${frontmatter.trim()}\n---\n\n${text.slice(match[0].length).trim()}\n`;
}
function parseGithubSkillSource(value) {
    try {
        const parsed = new URL(value);
        if (parsed.hostname.toLowerCase() !== "github.com")
            return null;
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts.length < 2)
            return null;
        const owner = parts[0];
        const repo = parts[1].replace(/\.git$/i, "");
        let ref = "";
        let subpath = "";
        if (["tree", "blob"].includes(parts[2])) {
            ref = parts[3] || "";
            subpath = parts.slice(4).join("/");
            if (parts[2] === "blob" && path.posix.basename(subpath).toLowerCase() === "skill.md")
                subpath = path.posix.dirname(subpath);
        }
        return {
            cloneUrl: `https://github.com/${owner}/${repo}.git`,
            ref,
            subpath: subpath === "." ? "" : subpath,
            repository: `https://github.com/${owner}/${repo}`,
        };
    }
    catch {
        return null;
    }
}
function findSkillDirectories(root, depth = 0) {
    if (depth > 5)
        return [];
    if (fs.existsSync(path.join(root, "SKILL.md")))
        return [root];
    const result = [];
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name === ".git" || entry.name === "node_modules")
            continue;
        result.push(...findSkillDirectories(path.join(root, entry.name), depth + 1));
        if (result.length > 30)
            break;
    }
    return result;
}
function validateSkillDirectory(root) {
    const skillFile = path.join(root, "SKILL.md");
    if (!fs.existsSync(skillFile))
        throw new Error("Skill 包中未找到 SKILL.md");
    let files = 0;
    let totalBytes = 0;
    const walk = (directory) => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const file = path.join(directory, entry.name);
            const stat = fs.lstatSync(file);
            if (stat.isSymbolicLink())
                throw new Error("Skill 包不允许包含符号链接");
            if (stat.isDirectory()) {
                if (entry.name !== ".git")
                    walk(file);
                continue;
            }
            files += 1;
            totalBytes += stat.size;
            if (files > MAX_SKILL_PACKAGE_FILES)
                throw new Error(`Skill 包文件数超过 ${MAX_SKILL_PACKAGE_FILES}`);
            if (stat.size > MAX_SKILL_FILE_BYTES)
                throw new Error(`Skill 包文件 ${entry.name} 超过大小限制`);
            if (totalBytes > MAX_SKILL_PACKAGE_BYTES)
                throw new Error("Skill 包总体积超过 10MB");
        }
    };
    walk(root);
    return { files, totalBytes };
}
async function cloneGithubSkill(item, staging) {
    const github = parseGithubSkillSource(item.sourceUrl || item.downloadUrl);
    if (!github)
        throw new Error("GitHub Skill 来源 URL 无效");
    await assertSafeHttpsUrl(github.cloneUrl);
    const checkout = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-skill-git-"));
    try {
        const args = ["clone", "--depth", "1", "--no-tags"];
        if (github.ref && !["head", "default"].includes(github.ref.toLowerCase()))
            args.push("--branch", github.ref);
        args.push(github.cloneUrl, checkout);
        await execFileAsync("git", args, { timeout: 120000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
        const requested = github.subpath ? path.resolve(checkout, github.subpath) : checkout;
        if (!isPathInside(checkout, requested) || !fs.existsSync(requested))
            throw new Error("GitHub Skill 子目录不存在");
        const candidates = findSkillDirectories(requested);
        if (!candidates.length)
            throw new Error("GitHub 仓库中未找到 SKILL.md");
        const matched = candidates.find(candidate => safeSlug(path.basename(candidate)) === safeSlug(item.name)) || candidates[0];
        validateSkillDirectory(matched);
        fs.cpSync(matched, staging, { recursive: true, dereference: false, filter: file => path.basename(file) !== ".git" });
    }
    finally {
        fs.rmSync(checkout, { recursive: true, force: true });
    }
}
async function stageSkillPackage(item, skillPackagesDir = db_1.SKILL_PACKAGES_DIR) {
    (0, internal_skill_catalog_1.assertCcmInternalSkillMutable)(item?.name, "从外部来源安装或覆盖");
    fs.mkdirSync(skillPackagesDir, { recursive: true });
    const staging = path.join(skillPackagesDir, `.staging-${safeSlug(item.name)}-${process.pid}-${Date.now()}`);
    fs.mkdirSync(staging, { recursive: true });
    try {
        if (item.prompt) {
            fs.writeFileSync(path.join(staging, "SKILL.md"), String(item.prompt || ""), "utf-8");
        }
        else if (parseGithubSkillSource(item.sourceUrl || item.downloadUrl)) {
            await cloneGithubSkill(item, staging);
        }
        else if (item.downloadUrl || /^https:\/\//i.test(item.sourceUrl || "")) {
            const remote = await fetchRemote(item.downloadUrl || item.sourceUrl, MAX_SKILL_FILE_BYTES);
            fs.writeFileSync(path.join(staging, "SKILL.md"), remote.body);
        }
        const skillFile = path.join(staging, "SKILL.md");
        const parsed = parseSkillMarkdown(fs.readFileSync(skillFile, "utf-8"), item.name, item.description);
        const normalizedContent = ensureSkillFrontmatter(parsed.content, item.name, item.description || parsed.description);
        fs.writeFileSync(skillFile, normalizedContent, "utf-8");
        const packageStats = validateSkillDirectory(staging);
        return {
            staging,
            skillFile,
            parsed: parseSkillMarkdown(normalizedContent, item.name, item.description),
            checksum: sha256(normalizedContent),
            packageStats,
        };
    }
    catch (error) {
        fs.rmSync(staging, { recursive: true, force: true });
        throw error;
    }
}
function installStagedPackage(staging, name, skillPackagesDir = db_1.SKILL_PACKAGES_DIR) {
    (0, internal_skill_catalog_1.assertCcmInternalSkillMutable)(name, "从外部来源安装或覆盖");
    const target = path.join(skillPackagesDir, safeSlug(name));
    if (!isPathInside(skillPackagesDir, target))
        throw new Error("Skill 安装路径无效");
    const backup = `${target}.backup-${process.pid}-${Date.now()}`;
    if (fs.existsSync(target))
        fs.renameSync(target, backup);
    try {
        fs.renameSync(staging, target);
        if (fs.existsSync(backup))
            fs.rmSync(backup, { recursive: true, force: true });
        return target;
    }
    catch (error) {
        if (fs.existsSync(target))
            fs.rmSync(target, { recursive: true, force: true });
        if (fs.existsSync(backup))
            fs.renameSync(backup, target);
        throw error;
    }
}
function localMarketplaceItems() {
    const source = { id: "ccm-official", label: "CCM Official", kind: "builtin", trust: "official" };
    const bundledFeishuEntry = [
        path.resolve(__dirname, "../../../mcp-feishu/dist/index.js"),
        path.join(process.cwd(), "ccm-package", "mcp-feishu", "dist", "index.js"),
        path.join(CCM_DIR, "ccm", "ccm-package", "mcp-feishu", "dist", "index.js"),
    ].find(candidate => fs.existsSync(candidate))
        || path.resolve(__dirname, "../../../mcp-feishu/dist/index.js");
    const filesystemRoot = path.join(CCM_DIR, "shared");
    return [
        normalizeMarketplaceItem({
            name: "mcp-feishu",
            type: "mcp",
            description: "Feishu collaboration connector for messages, task updates, and online documents.",
            command: "node",
            args: [bundledFeishuEntry],
            env: "FEISHU_APP_ID=your_app_id\nFEISHU_APP_SECRET=your_app_secret",
            author: "CC-Connect",
            version: "1.0.2",
        }, source),
        normalizeMarketplaceItem({
            name: "filesystem-mcp",
            type: "mcp",
            description: "Filesystem MCP server scoped to an explicit directory.",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-filesystem", filesystemRoot],
            author: "Model Context Protocol",
            version: "1.1.0",
        }, source),
        normalizeMarketplaceItem({
            name: "fetch-web-mcp",
            type: "mcp",
            description: "Fetch public web content and convert it into model-friendly text.",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-fetch"],
            author: "Model Context Protocol",
            version: "1.0.0",
        }, source),
        normalizeMarketplaceItem({
            name: "code-safety-auditor",
            type: "skill",
            description: "Review code for authorization, injection, resource leaks, and security regressions.",
            prompt: "Review the supplied code as a senior application security engineer. Check authorization boundaries, input validation, injection risks, secret handling, async resource cleanup, and missing security tests. Return prioritized findings with concrete fixes.",
            author: "CC-Connect",
            version: "2.2.0",
        }, source),
        normalizeMarketplaceItem({
            name: "code-review",
            type: "skill",
            description: "Review code changes for correctness bugs, regressions, missing tests, and maintainability risks.",
            prompt: "Review the supplied code or diff as a senior software engineer. Prioritize correctness bugs, behavioral regressions, authorization mistakes, data loss risks, concurrency issues, and missing tests. Return findings first, ordered by severity, with concrete file or symbol references when available. If no issues are found, say that clearly and list any residual test gaps.",
            author: "CC-Connect",
            version: "1.0.0",
        }, source),
        normalizeMarketplaceItem({
            name: "frontend-design",
            type: "skill",
            description: "Design and review production-grade frontend UI with strong layout, interaction, and accessibility judgment.",
            prompt: "Use this skill for frontend UI design, implementation review, or redesign work. Focus on task-first workflows, responsive layout, visual hierarchy, accessibility, interaction states, and consistency with the existing design system. Avoid generic landing-page filler; provide concrete component, layout, and styling guidance tailored to the product context.",
            author: "CC-Connect",
            version: "1.0.0",
        }, source),
    ];
}
async function runMarketplaceSelfTest() {
    const localItems = localMarketplaceItems();
    const feishu = localItems.find(item => item.name === "mcp-feishu");
    const filesystem = localItems.find(item => item.name === "filesystem-mcp");
    const parsedSkill = parseSkillMarkdown("---\nname: release-notes\ndescription: Produce release notes\n---\n\nUse {{input}}.");
    const claudeCatalogItems = catalogItemsFromParsedJson({
        name: "example-claude-marketplace",
        owner: { name: "Example" },
        metadata: { version: "9.9.9", description: "Example Claude plugin marketplace" },
        plugins: [{
                name: "release-tools",
                source: "./plugins/release-tools",
                description: "Release workflow helpers",
                skills: "./skills/release-notes",
                mcpServers: {
                    github: {
                        command: "node",
                        args: ["github-mcp.js"],
                        env: { GITHUB_TOKEN: "secret" },
                    },
                },
            }],
    }, { id: "claude-test", label: "Claude Test", kind: "catalog", url: "https://raw.githubusercontent.com/example/claude-market/main/marketplace.json", trust: "community" }, "https://raw.githubusercontent.com/example/claude-market/main/marketplace.json");
    const claudeCatalogMcp = claudeCatalogItems.find(item => item.type === "mcp" && item.name === "release-tools-github");
    const claudeCatalogSkill = claudeCatalogItems.find(item => item.type === "skill" && item.name === "release-tools-release-notes");
    const savedSource = normalizeSavedSource({ label: "Example Catalog", url: "https://example.com/catalog.json", trust: "community" });
    const officialSource = normalizeSavedSource({ label: "Untrusted Official Claim", url: "https://example.com/official.json", trust: "official" });
    const httpSource = normalizeSavedSource({ label: "Plain HTTP", url: "http://example.com/catalog.json" });
    let invalidRejected = false;
    try {
        normalizeMarketplaceItem({ type: "unknown", name: "bad" }, { id: "test", label: "Test", kind: "builtin", trust: "official" });
    }
    catch {
        invalidRejected = true;
    }
    const authSource = { id: "selftest-catalog", label: "Self-Test Catalog", kind: "catalog", url: "https://example.com/catalog.json", trust: "community" };
    const authMcpItem = normalizeMarketplaceItem({
        name: "github-search",
        type: "mcp",
        description: "Search repositories",
        command: "npx",
        args: ["-y", "@example/github-search-mcp"],
        env: { GITHUB_TOKEN: "secret" },
        version: "1.2.3",
        author: "Example",
    }, authSource);
    const authSkillItem = normalizeMarketplaceItem({
        name: "market-release-notes",
        type: "skill",
        description: "Write release notes",
        prompt: "---\nname: market-release-notes\ndescription: Write release notes\n---\n\nWrite concise release notes.",
        version: "3.4.5",
        author: "Example",
    }, authSource);
    const now = "2026-07-07T00:00:00.000Z";
    const installedMcp = buildMarketplaceMcpToolRecord(authMcpItem, now);
    const installedSkill = buildMarketplaceSkillRecord(authSkillItem, {
        parsed: parseSkillMarkdown(authSkillItem.prompt, authSkillItem.name, authSkillItem.description),
        packageStats: { files: 1, totalBytes: authSkillItem.prompt.length },
    }, path.join(db_1.SKILL_PACKAGES_DIR, safeSlug(authSkillItem.name)), sha256(authSkillItem.prompt), now);
    const installRecord = buildMarketplaceInstallationRecord(authMcpItem, sha256(JSON.stringify(installedMcp)), "", undefined, now);
    const authMcpPreview = await previewMarketplaceItem(authMcpItem);
    const authSkillPreview = await previewMarketplaceItem(authSkillItem);
    const authorizationOptions = (0, tool_authorization_1.buildToolAuthorizationOptions)({
        mcpTools: [installedMcp],
        skills: [installedSkill],
        status: {
            mcp: [{ server: "github-search", name: "searchRepos", description: "Search repositories", schema: { type: "object" } }],
            servers: [{ name: "github-search", connected: true, state: "connected" }],
        },
    });
    const sourceBoundCatalogItem = normalizeMarketplaceItem({
        name: "source-bound-mcp",
        type: "mcp",
        description: "Canonical source-bound MCP",
        command: "node",
        args: ["trusted-server.js"],
        version: "1.0.0",
    }, authSource);
    const sourceBoundTamperedItem = {
        ...sourceBoundCatalogItem,
        command: "node",
        args: ["tampered-server.js"],
    };
    const sourceBoundResolved = await resolveMarketplaceItemForInstall(sourceBoundTamperedItem, "install", {
        loadInstallations: () => [],
        loadItemsForSource: async () => [sourceBoundCatalogItem],
    });
    let unsavedSourceRejected = false;
    try {
        await resolveMarketplaceItemForInstall({
            ...sourceBoundCatalogItem,
            source: { id: "custom-unsaved", label: "Unsaved", kind: "catalog", url: "https://example.com/unsaved.json", trust: "custom" },
        }, "install", {
            loadInstallations: () => [],
            loadItemsForSource: async () => { throw new Error("安装来源未保存或不可用；请先在工具商城保存外部来源再安装"); },
        });
    }
    catch {
        unsavedSourceRejected = true;
    }
    const sourceBoundUpdateResolved = await resolveMarketplaceItemForInstall({
        type: "mcp",
        name: "source-bound-mcp",
        source: authSource,
        command: "node",
        args: ["tampered-update.js"],
    }, "update", {
        loadInstallations: () => [buildMarketplaceInstallationRecord(sourceBoundCatalogItem, "old", "", undefined, now)],
        loadItemsForSource: async () => [{ ...sourceBoundCatalogItem, version: "1.1.0", args: ["trusted-update.js"] }],
    });
    const installE2E = await runMarketplaceInstallE2ESelfTest();
    const checks = {
        versionComparisonWorks: compareVersions("2.1.0", "2.0.9") > 0 && compareVersions("1.0.0", "1.0.0") === 0,
        privateAddressProtectionWorks: isPrivateAddress("127.0.0.1") && isPrivateAddress("192.168.1.5") && !isPrivateAddress("8.8.8.8"),
        invalidCatalogEntryRejected: invalidRejected,
        skillFrontmatterParsed: parsedSkill.name === "release-notes" && parsedSkill.description === "Produce release notes",
        claudePluginMarketplaceMcpConverted: claudeCatalogMcp?.command === "node"
            && claudeCatalogMcp?.args?.[0] === "github-mcp.js"
            && claudeCatalogMcp?.source?.label.includes("Claude Plugin"),
        claudePluginMarketplaceSkillConverted: claudeCatalogSkill?.sourceUrl === "https://github.com/example/claude-market/tree/main/plugins/release-tools/skills/release-notes"
            && claudeCatalogSkill?.source?.label.includes("Claude Plugin"),
        bundledFeishuPathResolved: !!feishu?.args?.[0] && fs.existsSync(feishu.args[0]),
        filesystemMcpUsesManagedSharedRoot: filesystem?.args?.[2] === path.join(CCM_DIR, "shared") && fs.existsSync(filesystem.args[2]),
        localItemsCarryOfficialTrust: localItems.every(item => item.source?.trust === "official"),
        savedSourceIdIsStable: savedSource?.id === marketplaceSourceId("https://example.com/catalog.json"),
        externalSourceKeepsCommunityTrust: savedSource?.trust === "community",
        externalSourceCannotClaimOfficialTrust: officialSource?.trust === "custom",
        plainHttpSourceRejected: httpSource === null,
        installedMcpEntersAuthorizationOptions: authorizationOptions.mcp[0]?.grant === "github-search"
            && authorizationOptions.mcp[0]?.tools?.[0]?.grant === "github-search/searchRepos",
        installedSkillEntersAuthorizationOptions: authorizationOptions.skill[0]?.grant === "market-release-notes"
            && authorizationOptions.skill[0]?.toolName === "skill:market-release-notes",
        marketplaceMetadataPreservedForAuthorization: authorizationOptions.mcp[0]?.marketplace?.itemId === authMcpItem.id
            && authorizationOptions.skill[0]?.marketplace?.itemId === authSkillItem.id,
        authorizationOptionsHideInstallSecrets: !("command" in authorizationOptions.mcp[0])
            && !("env" in authorizationOptions.mcp[0])
            && !("prompt" in authorizationOptions.skill[0]),
        installationRecordUsesStableKey: installRecord.key === "mcp:github-search" && installRecord.installedAt === now,
        marketplacePreviewReturnsSourceProof: authMcpPreview.preview?.sourceProof?.schema === "ccm-marketplace-source-proof-v1"
            && authSkillPreview.preview?.sourceProof?.schema === "ccm-marketplace-source-proof-v1"
            && !!authMcpPreview.preview?.sourceProof?.materialHash
            && !!authSkillPreview.preview?.sourceProof?.materialHash,
        marketplaceInstallationRecordCarriesSourceProof: installRecord.sourceProof?.schema === "ccm-marketplace-source-proof-v1"
            && installRecord.sourceProof?.name === "github-search",
        sourceProofHidesSecretValues: !JSON.stringify(authMcpPreview.preview?.sourceProof || {}).includes("secret")
            && !JSON.stringify(installRecord.sourceProof || {}).includes("secret"),
        marketplacePreviewHidesSecretValues: !JSON.stringify(authMcpPreview).includes("secret"),
        sourceBoundInstallUsesCatalogMaterial: sourceBoundResolved.args?.[0] === "trusted-server.js",
        sourceBoundInstallRejectsUnsavedSource: unsavedSourceRejected,
        sourceBoundUpdateUsesCatalogMaterial: sourceBoundUpdateResolved.version === "1.1.0" && sourceBoundUpdateResolved.args?.[0] === "trusted-update.js",
        onlineMarketplaceQueryIsSanitized: cleanMarketplaceQuery("  react\n\ttesting  ") === "react testing",
        onlineMarketplacePaginationIsBounded: normalizeMarketplaceListOptions({ page: -4, pageSize: 500 }).page === 1
            && normalizeMarketplaceListOptions({ page: -4, pageSize: 500 }).pageSize === MAX_MARKETPLACE_PAGE_SIZE,
        skillsShIdentityIsSourceBound: skillsShRegistryIdFromItemId("skills-sh:vercel-labs/agent-skills/web-design-guidelines") === "vercel-labs/agent-skills/web-design-guidelines",
        smitheryIdentityIsSourceBound: smitheryQualifiedNameFromItemId("smithery:upstash/context7-mcp") === "upstash/context7-mcp",
        anonymousSourceStatusHidesCredentials: marketplaceSourceStatus({ id: "smithery", label: "Smithery", kind: "smithery", trust: "community" }).anonymous === true
            && !JSON.stringify(marketplaceSourceStatus({ id: "smithery", label: "Smithery", kind: "smithery", trust: "community" })).toLowerCase().includes("token"),
        marketplaceInstallE2E: installE2E.pass,
    };
    return { pass: Object.values(checks).every(Boolean), checks, localItems, authorizationOptions, installE2E };
}
function cleanMarketplaceQuery(value, maxLength = 120) {
    return String(value || "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
function marketplacePageNumber(value, fallback = 1) {
    const parsed = Number.parseInt(String(value || ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function normalizeMarketplaceListOptions(options = {}) {
    return {
        query: cleanMarketplaceQuery(options.query),
        page: marketplacePageNumber(options.page, 1),
        pageSize: Math.min(MAX_MARKETPLACE_PAGE_SIZE, marketplacePageNumber(options.pageSize, DEFAULT_MARKETPLACE_PAGE_SIZE)),
        category: cleanMarketplaceQuery(options.category || "all", 40).toLowerCase() || "all",
        sort: ["relevance", "popular", "name"].includes(String(options.sort || "")) ? String(options.sort) : "popular",
        requestedItem: options.requestedItem,
    };
}
function marketplacePagination(page, pageSize, total, totalPages) {
    const pages = Math.max(1, Number(totalPages || Math.ceil(total / pageSize) || 1));
    return {
        schema: "ccm-marketplace-pagination-v1",
        page,
        pageSize,
        total,
        totalPages: pages,
        hasPrevious: page > 1,
        hasNext: page < pages,
    };
}
function marketplaceSourceStatus(source, input = {}) {
    return {
        schema: "ccm-marketplace-source-status-v1",
        id: source.id,
        label: source.label,
        online: input.online !== false,
        anonymous: input.anonymous !== false,
        authenticated: !!input.authenticated,
        upstream: cleanMarketplaceQuery(input.upstream || source.url || "", 300),
        resultLimited: !!input.resultLimited,
        message: cleanMarketplaceQuery(input.message || "", 300),
    };
}
function sortRegistryItems(items, sort) {
    const next = [...items];
    if (sort === "name")
        return next.sort((left, right) => String(left.displayName || left.name).localeCompare(String(right.displayName || right.name)));
    if (sort === "popular")
        return next.sort((left, right) => Number(right.registryUsage || 0) - Number(left.registryUsage || 0));
    return next;
}
function friendlyRegistryError(label, error) {
    const message = String(error?.message || error || "");
    if (/HTTP 429/i.test(message))
        return new Error(`${label} 请求过于频繁，请稍后重试`);
    if (/超时/i.test(message))
        return new Error(`${label} 响应超时，请稍后重试`);
    return new Error(`${label} 暂时不可用：${message || "未知上游错误"}`);
}
const SKILLS_SH_CATEGORY_QUERIES = {
    development: "development",
    design: "design",
    data: "data analysis",
    writing: "writing",
    productivity: "productivity",
};
function skillsShRegistryIdFromItemId(value) {
    const id = String(value || "");
    return id.startsWith("skills-sh:") ? id.slice("skills-sh:".length) : "";
}
async function loadSkillsShItems(rawOptions = {}) {
    const options = normalizeMarketplaceListOptions(rawOptions);
    const requestedRegistryId = skillsShRegistryIdFromItemId(options.requestedItem?.id);
    const requestedName = cleanMarketplaceQuery(options.requestedItem?.name || requestedRegistryId.split("/").pop() || "");
    const categoryQuery = SKILLS_SH_CATEGORY_QUERIES[options.category] || "";
    const appliedQuery = options.query || requestedName || categoryQuery || "agent";
    if (appliedQuery.length < 2)
        throw new Error("Skills.sh 搜索词至少需要 2 个字符");
    const params = new URLSearchParams({ q: appliedQuery, limit: "100" });
    let parsed;
    try {
        const remote = await fetchRemote(`${SKILLS_SH_SEARCH_URL}?${params.toString()}`, MAX_CATALOG_BYTES);
        parsed = JSON.parse(remote.body.toString("utf-8"));
    }
    catch (error) {
        throw friendlyRegistryError("Skills.sh", error);
    }
    const source = { id: "skills-sh", label: "Skills.sh", kind: "skills-sh", url: "https://skills.sh", trust: "community" };
    const rawSkills = Array.isArray(parsed?.skills) ? parsed.skills : [];
    const normalized = rawSkills.map((skill) => {
        const registryId = cleanMarketplaceQuery(skill?.id, 260);
        const repository = cleanMarketplaceQuery(skill?.source, 180);
        const skillName = cleanMarketplaceQuery(skill?.skillId || skill?.name || registryId.split("/").pop(), 120);
        if (!registryId || !repository || !skillName || !githubRepoFromUrlOrShorthand(repository))
            return null;
        return normalizeMarketplaceItem({
            id: `skills-sh:${registryId}`,
            name: skillName,
            displayName: skillName,
            registryId,
            type: "skill",
            description: `来自 ${repository} 的 Agent Skill`,
            author: repository.split("/")[0] || "Skills.sh",
            version: "0.0.0",
            sourceUrl: `https://github.com/${repository}`,
            homepage: `https://skills.sh/${registryId}`,
            registryUsage: Number(skill?.installs || 0),
            installs: Number(skill?.installs || 0),
            category: options.category,
        }, source);
    }).filter(Boolean);
    const exact = requestedRegistryId ? normalized.filter((item) => item.registryId === requestedRegistryId) : normalized;
    const sorted = sortRegistryItems(exact, options.sort);
    const total = sorted.length;
    const start = (options.page - 1) * options.pageSize;
    const items = sorted.slice(start, start + options.pageSize);
    return {
        needKey: false,
        items,
        pagination: marketplacePagination(options.page, options.pageSize, total),
        query: { text: options.query, applied: appliedQuery, category: options.category, sort: options.sort, defaulted: !options.query && !categoryQuery && !requestedName },
        sourceStatus: marketplaceSourceStatus(source, {
            upstream: SKILLS_SH_SEARCH_URL,
            resultLimited: rawSkills.length >= 100,
            message: rawSkills.length >= 100 ? "Skills.sh 单次搜索最多返回 100 条结果，可继续缩小搜索词" : "已通过 Skills.sh 官方公开搜索接口加载",
        }),
    };
}
const SMITHERY_CATEGORY_QUERIES = {
    development: "developer",
    data: "data",
    automation: "automation",
    productivity: "productivity",
    communication: "communication",
};
function smitheryQualifiedNameFromItemId(value) {
    const id = String(value || "");
    return id.startsWith("smithery:") ? id.slice("smithery:".length) : "";
}
function smitheryRegistryUrl(qualifiedName) {
    return `https://smithery.ai/servers/${qualifiedName.split("/").map(encodeURIComponent).join("/")}`;
}
function smitheryGatewayUrl(qualifiedName) {
    return `https://server.smithery.ai/${qualifiedName.split("/").map(encodeURIComponent).join("/")}`;
}
function smitheryServerItem(server, source) {
    const qualifiedName = cleanMarketplaceQuery(server?.qualifiedName || server?.name || server?.slug, 180);
    if (!qualifiedName)
        return null;
    const connection = Array.isArray(server?.connections)
        ? server.connections.find((item) => item?.type === "http" && /^https:\/\//i.test(String(item?.deploymentUrl || "")))
        : null;
    const deploymentUrl = cleanMarketplaceQuery(server?.deploymentUrl || connection?.deploymentUrl || "", 500);
    const owner = typeof server?.owner === "string"
        ? server.owner
        : (server?.owner?.displayName || server?.owner?.name || server?.namespace || "Smithery");
    return normalizeMarketplaceItem({
        id: `smithery:${qualifiedName}`,
        name: safeSlug(qualifiedName.replace(/\//g, "--")),
        displayName: cleanMarketplaceQuery(server?.displayName || qualifiedName, 120),
        qualifiedName,
        type: "mcp",
        description: server?.description || server?.summary || "",
        url: deploymentUrl || smitheryGatewayUrl(qualifiedName),
        author: owner,
        version: String(server?.version || "0.0.0"),
        homepage: server?.homepage || smitheryRegistryUrl(qualifiedName),
        sourceUrl: smitheryRegistryUrl(qualifiedName),
        registryUsage: Number(server?.useCount || 0),
        useCount: Number(server?.useCount || 0),
        verified: server?.verified === true,
        remote: server?.remote !== false,
        deployed: server?.isDeployed !== false,
        iconUrl: /^https:\/\//i.test(String(server?.iconUrl || "")) ? String(server.iconUrl) : "",
    }, source);
}
async function loadSmitheryItems(rawOptions = {}) {
    const options = normalizeMarketplaceListOptions(rawOptions);
    const source = { id: "smithery", label: "Smithery", kind: "smithery", url: "https://smithery.ai", trust: "community" };
    const requestedQualifiedName = smitheryQualifiedNameFromItemId(options.requestedItem?.id);
    if (requestedQualifiedName) {
        try {
            const pathName = requestedQualifiedName.split("/").map(encodeURIComponent).join("/");
            const remote = await fetchRemote(`${SMITHERY_SERVERS_URL}/${pathName}`, MAX_CATALOG_BYTES);
            const detail = JSON.parse(remote.body.toString("utf-8"));
            const item = smitheryServerItem(detail, source);
            return {
                needKey: false,
                items: item ? [item] : [],
                pagination: marketplacePagination(1, 1, item ? 1 : 0),
                query: { text: requestedQualifiedName, applied: requestedQualifiedName, category: "all", sort: "relevance", defaulted: false },
                sourceStatus: marketplaceSourceStatus(source, { upstream: SMITHERY_SERVERS_URL, message: "已从 Smithery 官方详情接口复验安装材料" }),
            };
        }
        catch (error) {
            throw friendlyRegistryError("Smithery", error);
        }
    }
    const categoryQuery = SMITHERY_CATEGORY_QUERIES[options.category] || "";
    const appliedQuery = options.query || categoryQuery;
    const params = new URLSearchParams({ page: String(options.page), pageSize: String(options.pageSize) });
    if (appliedQuery)
        params.set("q", appliedQuery);
    let parsed;
    try {
        const remote = await fetchRemote(`${SMITHERY_SERVERS_URL}?${params.toString()}`, MAX_CATALOG_BYTES);
        parsed = JSON.parse(remote.body.toString("utf-8"));
    }
    catch (error) {
        throw friendlyRegistryError("Smithery", error);
    }
    const servers = Array.isArray(parsed) ? parsed : (parsed?.servers || parsed?.data || parsed?.items || []);
    const items = sortRegistryItems(servers.map((server) => smitheryServerItem(server, source)).filter(Boolean), options.sort);
    const upstreamPagination = parsed?.pagination || {};
    const total = Number(upstreamPagination.totalCount || items.length);
    const totalPages = Number(upstreamPagination.totalPages || Math.ceil(total / options.pageSize) || 1);
    return {
        needKey: false,
        items,
        pagination: marketplacePagination(options.page, options.pageSize, total, totalPages),
        query: { text: options.query, applied: appliedQuery, category: options.category, sort: options.sort, defaulted: !options.query && !categoryQuery },
        sourceStatus: marketplaceSourceStatus(source, { upstream: SMITHERY_SERVERS_URL, message: "匿名访问 Smithery 官方注册表，无需配置 API Key" }),
    };
}
async function loadCatalogItems(url, source) {
    const github = parseGithubSkillSource(url);
    if (github) {
        const name = path.posix.basename(github.subpath || github.repository) || "github-skill";
        return [normalizeMarketplaceItem({
                name,
                type: "skill",
                description: `Skill package from ${github.repository}`,
                sourceUrl: url,
                homepage: github.repository,
                version: "0.0.0",
            }, { ...source, kind: "github" })];
    }
    const remote = await fetchRemote(url, MAX_CATALOG_BYTES);
    const text = remote.body.toString("utf-8");
    try {
        const parsed = JSON.parse(text);
        return catalogItemsFromParsedJson(parsed, { ...source, url: remote.finalUrl }, remote.finalUrl);
    }
    catch {
        const skill = parseSkillMarkdown(text, path.basename(new URL(remote.finalUrl).pathname, ".md") || "external-skill", "");
        if (!skill.name)
            throw new Error("外部来源既不是商城 JSON，也不是有效 SKILL.md");
        return [normalizeMarketplaceItem({
                name: skill.name,
                type: "skill",
                description: skill.description,
                downloadUrl: remote.finalUrl,
                sourceUrl: remote.finalUrl,
                version: "0.0.0",
            }, { ...source, kind: "direct", url: remote.finalUrl })];
    }
}
async function loadMarketplaceItemsForSource(source, requestedItem = null) {
    const sourceId = String(source?.id || "");
    const baseSourceId = baseMarketplaceSourceId(sourceId);
    if (baseSourceId === "ccm-official" || source.kind === "builtin")
        return localMarketplaceItems();
    if (baseSourceId === "skills-sh" || source.kind === "skills-sh") {
        const result = await loadSkillsShItems({ requestedItem, page: 1, pageSize: 100, sort: "relevance" });
        return result.items;
    }
    if (baseSourceId === "smithery" || source.kind === "smithery") {
        const result = await loadSmitheryItems({ requestedItem, page: 1, pageSize: 50, sort: "relevance" });
        return result.items;
    }
    if (baseSourceId === "ccm-community") {
        return loadCatalogItems(CCM_COMMUNITY_CATALOG_URL, {
            id: "ccm-community",
            label: "CCM Community",
            kind: "catalog",
            url: CCM_COMMUNITY_CATALOG_URL,
            trust: "community",
        });
    }
    const savedSource = publicMarketplaceSources().find(item => item.id === baseSourceId);
    if (savedSource?.url)
        return loadCatalogItems(savedSource.url, savedSource);
    throw new Error("安装来源未保存或不可用；请先在工具商城保存外部来源再安装");
}
function marketplaceItemIdentity(item) {
    return {
        id: String(item?.id || ""),
        type: String(item?.type || "").toLowerCase(),
        name: String(item?.name || "").trim().toLowerCase(),
    };
}
function findMarketplaceItemMatch(items, requested) {
    const request = marketplaceItemIdentity(requested);
    return items.find(item => {
        const candidate = marketplaceItemIdentity(item);
        return candidate.type === request.type && request.id && candidate.id === request.id;
    }) || items.find(item => {
        const candidate = marketplaceItemIdentity(item);
        return candidate.type === request.type && candidate.name === request.name;
    }) || null;
}
async function resolveMarketplaceItemForInstall(rawItem, mode = "install", options = {}) {
    const requested = normalizeMarketplaceInstallRequest(rawItem, { id: "custom", label: "Custom source", kind: "direct", trust: "custom" });
    const loadRecords = options.loadInstallations || loadInstallations;
    const previous = loadRecords().find((entry) => entry.key === installationKey(requested.type, requested.name));
    if (mode === "update" && !previous)
        throw new Error(`"${requested.name}" 尚未安装，不能执行更新`);
    const source = requested.source?.id ? requested.source : previous?.source;
    if (!source?.id)
        throw new Error("商城安装缺少来源标识，已拒绝未绑定来源的安装请求");
    const loadItemsForSource = options.loadItemsForSource || loadMarketplaceItemsForSource;
    const sourceItems = await loadItemsForSource(source, requested);
    const normalizedItems = (Array.isArray(sourceItems) ? sourceItems : [])
        .map((item) => normalizeMarketplaceItem(item, source))
        .filter((item) => baseMarketplaceSourceId(item.source?.id) === baseMarketplaceSourceId(source.id));
    const canonical = findMarketplaceItemMatch(normalizedItems, requested);
    if (!canonical) {
        throw new Error(`来源 ${source.label || source.id} 中未找到 ${requested.type}:${requested.name}，已拒绝安装`);
    }
    return canonical;
}
async function saveMarketplaceSource(payload) {
    const url = String(payload?.url || payload?.sourceUrl || "").trim();
    if (!url)
        throw new Error("外部来源 URL 不能为空");
    const parsed = await assertSafeHttpsUrl(url);
    const now = new Date().toISOString();
    const source = normalizeSavedSource({
        id: marketplaceSourceId(parsed.toString()),
        label: payload?.label || parsed.hostname,
        url: parsed.toString(),
        trust: payload?.trust,
        createdAt: now,
        updatedAt: now,
        enabled: true,
    });
    if (!source)
        throw new Error("外部来源配置无效");
    const items = await loadCatalogItems(source.url || "", source);
    const sources = loadMarketplaceSources();
    const previous = sources.find(item => item.id === source.id);
    const record = {
        ...source,
        createdAt: previous?.createdAt || source.createdAt,
        updatedAt: now,
    };
    saveMarketplaceSources([...sources.filter(item => item.id !== record.id), record]);
    return { source: record, itemCount: items.length };
}
function deleteMarketplaceSource(payload) {
    const id = String(payload?.id || "").trim();
    if (!id)
        throw new Error("外部来源 ID 不能为空");
    const sources = loadMarketplaceSources();
    const next = sources.filter(item => item.id !== id);
    saveMarketplaceSources(next);
    return { id, removed: next.length !== sources.length };
}
async function previewMarketplaceItem(rawItem) {
    const rawSourceId = baseMarketplaceSourceId(rawItem?.source?.id);
    const item = ["skills-sh", "smithery", "ccm-official", "ccm-community"].includes(rawSourceId)
        ? await resolveMarketplaceItemForInstall(rawItem, "install")
        : normalizeMarketplaceItem(rawItem, { id: "custom", label: "Custom source", kind: "direct", trust: "custom" });
    const sourceProof = buildMarketplaceSourceProof(item);
    if (item.type === "mcp") {
        const envKeys = item.env && typeof item.env === "object"
            ? Object.keys(item.env)
            : String(item.env || "").split(/\r?\n/).map((line) => line.split("=")[0]?.trim()).filter(Boolean);
        return {
            item: sanitizeMarketplacePreviewItem(item),
            preview: {
                transport: item.url ? "http" : "stdio",
                executable: item.command || "",
                args: item.args || [],
                url: item.url || "",
                envKeys,
                trust: item.source.trust,
                sourceProof,
            },
        };
    }
    if (item.prompt) {
        const parsed = parseSkillMarkdown(item.prompt, item.name, item.description);
        return { item: sanitizeMarketplacePreviewItem(item), preview: { name: parsed.name, description: parsed.description, content: parsed.content.slice(0, 20000), packageBacked: false, trust: item.source.trust, sourceProof } };
    }
    if (item.downloadUrl && !parseGithubSkillSource(item.downloadUrl)) {
        const remote = await fetchRemote(item.downloadUrl, MAX_SKILL_FILE_BYTES);
        const parsed = parseSkillMarkdown(remote.body.toString("utf-8"), item.name, item.description);
        return { item: sanitizeMarketplacePreviewItem(item), preview: { name: parsed.name, description: parsed.description, content: parsed.content.slice(0, 20000), packageBacked: false, trust: item.source.trust, sourceProof: buildMarketplaceSourceProof(item, { checksum: sha256(remote.body) }) } };
    }
    if (parseGithubSkillSource(item.sourceUrl || item.downloadUrl)) {
        const staging = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-skill-preview-"));
        try {
            await cloneGithubSkill(item, staging);
            const packageStats = validateSkillDirectory(staging);
            const content = fs.readFileSync(path.join(staging, "SKILL.md"), "utf-8");
            const parsed = parseSkillMarkdown(content, item.name, item.description);
            return {
                item: sanitizeMarketplacePreviewItem(item),
                preview: {
                    name: parsed.name,
                    description: parsed.description,
                    content: parsed.content.slice(0, 20000),
                    sourceUrl: item.sourceUrl,
                    packageBacked: true,
                    packageStats,
                    trust: item.source.trust,
                    sourceProof: buildMarketplaceSourceProof(item, { checksum: sha256(content), packageStats }),
                    note: "已从 GitHub 拉取并校验 Skill 包；安装时仍会重新复验来源与内容限制。",
                },
            };
        }
        finally {
            fs.rmSync(staging, { recursive: true, force: true });
        }
    }
    return {
        item: sanitizeMarketplacePreviewItem(item),
        preview: {
            name: item.name,
            description: item.description,
            sourceUrl: item.sourceUrl,
            packageBacked: true,
            trust: item.source.trust,
            sourceProof,
            note: "GitHub package will be cloned and validated during installation.",
        },
    };
}
function buildMarketplaceMcpToolRecord(item, now) {
    return {
        name: item.name,
        type: "mcp",
        description: item.description,
        command: item.command,
        args: item.args,
        url: item.url,
        headers: item.headers && typeof item.headers === "object" ? item.headers : undefined,
        env: item.env || "",
        enabled: true,
        version: item.version,
        author: item.author,
        marketplace: { source: item.source, itemId: item.id, homepage: item.homepage || item.sourceUrl || "" },
        updated_at: now,
    };
}
function buildMarketplaceSkillRecord(item, staged, packagePath, checksum, now) {
    return {
        name: item.name,
        type: "skill",
        description: item.description || staged.parsed.description,
        prompt: staged.parsed.prompt,
        enabled: true,
        version: item.version,
        author: item.author,
        packagePath,
        skillFile: path.join(packagePath, "SKILL.md"),
        packageStats: staged.packageStats,
        contentHash: checksum.slice(0, 16),
        origin: "external",
        scope: "external",
        sourceType: "marketplace",
        immutable: false,
        deletable: true,
        editable: true,
        disableable: true,
        systemManaged: false,
        roleSkill: false,
        marketplace: { source: item.source, itemId: item.id, homepage: item.homepage || item.sourceUrl || "" },
        updated_at: now,
    };
}
function buildMarketplaceInstallationRecord(item, checksum, packagePath, previous, now, sourceProof = null) {
    return {
        key: installationKey(item.type, item.name),
        name: item.name,
        type: item.type,
        version: item.version,
        checksum,
        source: item.source,
        sourceProof: sourceProof ? sanitizeMarketplaceSourceProof(sourceProof) : buildMarketplaceSourceProof(item, { checksum }),
        packagePath: packagePath || undefined,
        installedAt: previous?.installedAt || now,
        updatedAt: now,
    };
}
function readJsonObject(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return null;
    }
}
function createFileBackedMarketplaceStore(root) {
    const mcpDir = path.join(root, "mcp");
    const skillsDir = path.join(root, "skills");
    const skillPackagesDir = path.join(root, "skill-packages");
    const installationsFile = path.join(root, "marketplace", "installations.json");
    const auditFile = path.join(root, "marketplace", "operations.jsonl");
    let reloads = 0;
    const filenameFor = (name) => `${safeSlug(name)}.json`;
    const loadJsonDir = (dir) => {
        if (!fs.existsSync(dir))
            return [];
        return fs.readdirSync(dir)
            .filter(file => file.endsWith(".json"))
            .map(file => readJsonObject(path.join(dir, file)))
            .filter(Boolean);
    };
    const store = {
        skillPackagesDir,
        loadInstallations: () => {
            const parsed = readJsonObject(installationsFile);
            return Array.isArray(parsed?.items) ? parsed.items : [];
        },
        saveInstallations: items => writeJsonAtomic(installationsFile, { version: 1, items }),
        saveMcpTool: tool => writeJsonAtomic(path.join(mcpDir, filenameFor(tool.name)), tool),
        saveSkill: skill => writeJsonAtomic(path.join(skillsDir, filenameFor(skill.name)), skill),
        deleteMcpTool: name => {
            const file = path.join(mcpDir, filenameFor(name));
            if (fs.existsSync(file))
                fs.unlinkSync(file);
        },
        deleteSkill: name => {
            const file = path.join(skillsDir, filenameFor(name));
            if (fs.existsSync(file))
                fs.unlinkSync(file);
        },
        reloadTools: () => { reloads += 1; },
        appendAudit: entry => appendJsonlBounded(auditFile, entry),
        loadAudit: () => fs.existsSync(auditFile)
            ? fs.readFileSync(auditFile, "utf-8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
            : [],
        loadMcpTools: () => loadJsonDir(mcpDir),
        loadSkills: () => loadJsonDir(skillsDir),
    };
    return {
        store,
        mcpDir,
        skillsDir,
        skillPackagesDir,
        auditFile,
        loadMcpTools: () => loadJsonDir(mcpDir),
        loadSkills: () => loadJsonDir(skillsDir),
        loadInstallations: () => store.loadInstallations ? store.loadInstallations() : [],
        loadAudit: () => fs.existsSync(auditFile)
            ? fs.readFileSync(auditFile, "utf-8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
            : [],
        reloadCount: () => reloads,
    };
}
async function runMarketplaceInstallE2ESelfTest() {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-marketplace-install-"));
    try {
        const fixture = createFileBackedMarketplaceStore(tempRoot);
        let fixtureRuntimeAudits = [];
        const withCurrentCatalogRevision = (audit) => {
            if (!audit?.__freshMarketplaceCatalog)
                return audit;
            const next = { ...audit };
            delete next.__freshMarketplaceCatalog;
            const readiness = (0, runtime_tool_sync_1.probeRuntimeToolReadiness)(next, {
                record: false,
                catalog: buildMarketplaceRuntimeCatalog(fixture.store),
            });
            return { ...next, catalogRevision: readiness.currentCatalogRevision };
        };
        fixture.store.loadRuntimeAudits = () => fixtureRuntimeAudits.map(withCurrentCatalogRevision);
        const source = { id: "e2e-catalog", label: "E2E Catalog", kind: "catalog", url: "https://example.com/catalog.json", trust: "community" };
        const mcpItem = normalizeMarketplaceItem({
            name: "e2e-market-mcp",
            type: "mcp",
            description: "Temporary E2E MCP",
            command: "node",
            args: ["server.js"],
            env: "TOKEN=secret",
            version: "1.0.0",
            author: "E2E",
        }, source);
        const skillItem = normalizeMarketplaceItem({
            name: "e2e-market-skill",
            type: "skill",
            description: "Temporary E2E Skill",
            prompt: "---\nname: e2e-market-skill\ndescription: Temporary E2E Skill\n---\n\nSummarize the installed marketplace tool.",
            version: "1.0.0",
            author: "E2E",
        }, source);
        fixture.store.loadProjectConfigs = () => ({
            "C:\\demo\\marketplace-project": {
                name: "Marketplace Project",
                tools: { mcp: ["e2e-market-mcp/invoke"], skill: ["e2e-market-skill"] },
            },
            "C:\\demo\\unrelated-project": {
                name: "Unrelated Project",
                tools: { mcp: ["unrelated-mcp"], skill: ["unrelated-skill"] },
            },
        });
        fixture.store.loadGroups = () => [
            {
                id: "group-marketplace",
                name: "Marketplace Group",
                tools: { mcp: ["mcp__ccm__e2e-market-mcp__invoke"], skill: ["e2e-market-skill"] },
            },
            {
                id: "group-unrelated",
                name: "Unrelated Group",
                tools: { mcp: ["unrelated-mcp"], skill: ["unrelated-skill"] },
            },
        ];
        let updateMissingRejected = false;
        try {
            await installMarketplaceItemWithStore(mcpItem, fixture.store, "update");
        }
        catch {
            updateMissingRejected = true;
        }
        await installMarketplaceItemWithStore(mcpItem, fixture.store);
        await installMarketplaceItemWithStore(skillItem, fixture.store);
        const preUpdateRuntimeWorkDir = path.join(tempRoot, "runtime-work-before-update");
        fs.mkdirSync(preUpdateRuntimeWorkDir, { recursive: true });
        const preUpdateRuntimeAudit = (0, runtime_tool_sync_1.syncRuntimeToolsWithCatalog)(preUpdateRuntimeWorkDir, "codex", { mcp: ["e2e-market-mcp"], skill: ["e2e-market-skill"] }, {
            mcpTools: fixture.loadMcpTools(),
            skills: fixture.loadSkills(),
            skillPackagesDir: fixture.skillPackagesDir,
            runtimeStorageRoot: path.join(tempRoot, "agent-runtime-before-update"),
            codexGateway: {
                apiUrl: "https://gateway.example.test/v1",
                apiKey: "marketplace-runtime-secret-must-not-persist",
                model: "test-model",
            },
        });
        const blockedFreshRuntimeWorkDir = path.join(tempRoot, "runtime-work-fresh-blocked");
        fs.mkdirSync(blockedFreshRuntimeWorkDir, { recursive: true });
        const blockedFreshReadiness = {
            schema: "ccm-tool-authorization-readiness-v1",
            dispatchReady: false,
            status: "needs_attention",
            requested: { mcp: 1, skill: 1 },
            available: { mcp: 0, skill: 0 },
            missing: { missing_mcp_servers: 0, missing_mcp_tools: 1, missing_skills: 1 },
            invalid_mcp_grants: 0,
            unavailable: {
                mcp: [{ raw: "e2e-market-mcp/missingTool", server: "e2e-market-mcp", tool: "missingTool", state: "missing_tool" }],
                skill: [{ name: "e2e-market-skill", state: "missing" }],
            },
        };
        const blockedFreshRuntimeAudit = (0, runtime_tool_sync_1.syncRuntimeToolsWithCatalog)(blockedFreshRuntimeWorkDir, "codex", { mcp: ["e2e-market-mcp"], skill: ["e2e-market-skill"] }, {
            mcpTools: fixture.loadMcpTools(),
            skills: fixture.loadSkills(),
            skillPackagesDir: fixture.skillPackagesDir,
            runtimeStorageRoot: path.join(tempRoot, "agent-runtime-fresh-blocked"),
            codexGateway: {
                apiUrl: "https://gateway.example.test/v1",
                apiKey: "marketplace-runtime-secret-must-not-persist",
                model: "test-model",
            },
        }, { authorizationReadiness: blockedFreshReadiness });
        const blockedFreshRuntimeFixture = blockedFreshRuntimeAudit;
        blockedFreshRuntimeFixture.projectName = "marketplace-fresh-blocked-project";
        blockedFreshRuntimeFixture.groupId = "marketplace-fresh-blocked-group";
        blockedFreshRuntimeFixture.__freshMarketplaceCatalog = true;
        fixtureRuntimeAudits = [preUpdateRuntimeAudit, blockedFreshRuntimeAudit];
        const mcpUpdate = normalizeMarketplaceItem({
            ...mcpItem,
            args: ["server-v2.js"],
            version: "1.1.0",
        }, source);
        const skillUpdate = normalizeMarketplaceItem({
            ...skillItem,
            prompt: "---\nname: e2e-market-skill\ndescription: Temporary E2E Skill\n---\n\nSummarize the updated marketplace tool.",
            version: "1.1.0",
        }, source);
        const mcpPreflightImpact = previewMarketplaceAuthorizationImpact({ type: "mcp", name: "e2e-market-mcp", action: "update" }, fixture.store).authorizationImpact;
        const skillPreflightImpact = previewMarketplaceAuthorizationImpact({ type: "skill", name: "e2e-market-skill", action: "uninstall" }, fixture.store).authorizationImpact;
        const mcpUpdateResult = await installMarketplaceItemWithStore(mcpUpdate, fixture.store, "update", { autoResync: true });
        fixtureRuntimeAudits = [preUpdateRuntimeAudit];
        const skillUpdateResult = await installMarketplaceItemWithStore(skillUpdate, fixture.store, "update", { autoResync: true });
        const installedMcp = fixture.loadMcpTools();
        const installedSkills = fixture.loadSkills();
        const records = fixture.loadInstallations();
        const auditEntriesBeforeUninstall = fixture.loadAudit();
        const skillRecord = installedSkills.find((item) => item.name === "e2e-market-skill");
        const skillPackagePath = String(skillRecord?.packagePath || "");
        const skillPackageInstalledBeforeUninstall = !!skillPackagePath && fs.existsSync(path.join(skillPackagePath, "SKILL.md"));
        const authorizationOptions = (0, tool_authorization_1.buildToolAuthorizationOptions)({
            mcpTools: installedMcp,
            skills: installedSkills,
            status: {
                mcp: [{ server: "e2e-market-mcp", name: "invoke", description: "Invoke E2E tool", schema: { type: "object" } }],
                servers: [{ name: "e2e-market-mcp", connected: true, state: "connected" }],
            },
        });
        const runtimeWorkDir = path.join(tempRoot, "runtime-work");
        fs.mkdirSync(runtimeWorkDir, { recursive: true });
        const runtimeAudit = (0, runtime_tool_sync_1.syncRuntimeToolsWithCatalog)(runtimeWorkDir, "codex", { mcp: ["e2e-market-mcp"], skill: ["e2e-market-skill"] }, {
            mcpTools: installedMcp,
            skills: installedSkills,
            skillPackagesDir: fixture.skillPackagesDir,
            runtimeStorageRoot: path.join(tempRoot, "agent-runtime"),
            codexGateway: {
                apiUrl: "https://gateway.example.test/v1",
                apiKey: "marketplace-runtime-secret-must-not-persist",
                model: "test-model",
            },
        });
        fixtureRuntimeAudits = [runtimeAudit];
        const runtimeConfigText = runtimeAudit.mcpConfigPath && fs.existsSync(runtimeAudit.mcpConfigPath)
            ? fs.readFileSync(runtimeAudit.mcpConfigPath, "utf-8")
            : "";
        const runtimeSkillStatus = (runtimeAudit.skill_statuses || []).find(item => item.name === "e2e-market-skill" && item.state === "synced");
        const runtimeSkillBody = runtimeSkillStatus?.skillPath && fs.existsSync(runtimeSkillStatus.skillPath)
            ? fs.readFileSync(runtimeSkillStatus.skillPath, "utf-8")
            : "";
        const runtimeSnapshot = runtimeAudit.snapshotPath ? readJsonObject(runtimeAudit.snapshotPath) : null;
        const uninstallMcpResult = await uninstallMarketplaceItemWithStore({ type: "mcp", name: "e2e-market-mcp" }, fixture.store, { autoResync: true });
        const uninstallSkillResult = await uninstallMarketplaceItemWithStore({ type: "skill", name: "e2e-market-skill" }, fixture.store, { autoResync: true });
        const auditEntries = fixture.loadAudit();
        const operationHistory = readMarketplaceOperationAudit({ limit: 4 }, fixture.store);
        const checks = {
            realMcpJsonPersisted: installedMcp.some((item) => item.name === "e2e-market-mcp" && item.marketplace?.itemId === mcpItem.id),
            realSkillJsonPersisted: installedSkills.some((item) => item.name === "e2e-market-skill" && item.marketplace?.itemId === skillItem.id),
            explicitUpdateRequiresExistingInstall: updateMissingRejected,
            marketplaceUpdatePersistsNewVersion: records.some(item => item.key === "mcp:e2e-market-mcp" && item.version === "1.1.0")
                && records.some(item => item.key === "skill:e2e-market-skill" && item.version === "1.1.0")
                && installedMcp.some((item) => item.name === "e2e-market-mcp" && item.args?.[0] === "server-v2.js")
                && installedSkills.some((item) => item.name === "e2e-market-skill" && item.prompt?.includes("updated marketplace tool"))
                && mcpUpdateResult.action === "update"
                && skillUpdateResult.action === "update",
            marketplaceOperationAuditRecordsInstallAndUpdate: auditEntriesBeforeUninstall.filter((entry) => entry.schema === "ccm-marketplace-operation-v1" && entry.action === "install").length === 2
                && auditEntriesBeforeUninstall.filter((entry) => entry.schema === "ccm-marketplace-operation-v1" && entry.action === "update").length === 2
                && auditEntriesBeforeUninstall.every((entry) => !JSON.stringify(entry).includes("TOKEN=secret")),
            marketplaceAuthorizationImpactPreflightWorks: mcpPreflightImpact.action === "update"
                && mcpPreflightImpact.summary.scopeCount === 2
                && mcpPreflightImpact.summary.mcpGrants === 2
                && skillPreflightImpact.action === "uninstall"
                && skillPreflightImpact.summary.scopeCount === 2
                && skillPreflightImpact.summary.skillGrants === 2,
            marketplaceUpdateReportsAuthorizationImpact: mcpUpdateResult.authorizationImpact?.summary?.projects === 1
                && mcpUpdateResult.authorizationImpact?.summary?.groups === 1
                && mcpUpdateResult.authorizationImpact?.summary?.mcpGrants === 2
                && skillUpdateResult.authorizationImpact?.summary?.projects === 1
                && skillUpdateResult.authorizationImpact?.summary?.groups === 1
                && skillUpdateResult.authorizationImpact?.summary?.skillGrants === 2,
            marketplaceUpdateReportsRuntimeImpact: mcpUpdateResult.runtimeImpact?.schema === "ccm-marketplace-runtime-impact-v1"
                && mcpUpdateResult.runtimeImpact?.summary?.runtimeSnapshots === 2
                && mcpUpdateResult.runtimeImpact?.summary?.catalogStale === 1
                && mcpUpdateResult.runtimeImpact?.summary?.dispatchBlocked === 1
                && mcpUpdateResult.runtimeImpact?.summary?.deliveryBlocked === 2
                && skillUpdateResult.runtimeImpact?.summary?.runtimeSnapshots === 1
                && skillUpdateResult.runtimeImpact?.summary?.catalogStale === 1,
            marketplaceUpdateReportsSourceProof: mcpUpdateResult.sourceProof?.schema === "ccm-marketplace-source-proof-v1"
                && mcpUpdateResult.sourceProof?.materialKind === "stdio_mcp"
                && skillUpdateResult.sourceProof?.schema === "ccm-marketplace-source-proof-v1"
                && skillUpdateResult.sourceProof?.materialKind === "inline_skill",
            marketplaceUpdateAutoResyncsRuntime: mcpUpdateResult.runtimeResync?.schema === "ccm-marketplace-runtime-resync-v1"
                && mcpUpdateResult.runtimeResync?.summary?.resynced === 2
                && mcpUpdateResult.runtimeResync?.items?.some((item) => item.before?.catalogStale === true && item.after?.catalogStale === false)
                && mcpUpdateResult.runtimeResync?.items?.some((item) => item.before?.catalogStale === false && item.before?.dispatchReady === false && item.action === "resynced")
                && !JSON.stringify(mcpUpdateResult.runtimeResync).includes(preUpdateRuntimeWorkDir),
            marketplaceImpactMatchesNativeMcpGrant: mcpUpdateResult.authorizationImpact?.scopes?.some((scope) => (scope.scope === "group" && scope.grants?.mcp?.includes("mcp__ccm__e2e-market-mcp__invoke"))),
            skillPackageInstalled: skillPackageInstalledBeforeUninstall,
            installationRecordsPersisted: records.some(item => item.key === "mcp:e2e-market-mcp")
                && records.some(item => item.key === "skill:e2e-market-skill"),
            installedResourcesReachAuthorizationOptions: authorizationOptions.mcp[0]?.grant === "e2e-market-mcp"
                && authorizationOptions.mcp[0]?.tools?.[0]?.grant === "e2e-market-mcp/invoke"
                && authorizationOptions.skill[0]?.grant === "e2e-market-skill",
            installedResourcesReachRuntimeSync: runtimeAudit.mode === "native-and-proxy"
                && runtimeAudit.errors.length === 0
                && runtimeConfigText.includes("ccm__e2e-market-mcp")
                && runtimeConfigText.includes("e2e-market-skill")
                && runtimeSkillStatus?.sourcePath === path.join(skillPackagePath, "SKILL.md")
                && runtimeSkillBody.includes("Summarize the updated marketplace tool.")
                && Array.isArray(runtimeSnapshot?.mcp_statuses)
                && runtimeSnapshot.mcp_statuses.some((item) => item.name === "e2e-market-mcp" && item.delivery === "native"),
            runtimeSyncDoesNotPersistGatewaySecret: !runtimeConfigText.includes("marketplace-runtime-secret-must-not-persist"),
            installHidesSecretsInAuthorizationOptions: !("command" in authorizationOptions.mcp[0])
                && !("env" in authorizationOptions.mcp[0])
                && !("prompt" in authorizationOptions.skill[0]),
            uninstallRemovesCatalogEntries: fixture.loadMcpTools().length === 0 && fixture.loadSkills().length === 0,
            uninstallRemovesSkillPackage: !!skillPackagePath && !fs.existsSync(skillPackagePath),
            uninstallRemovesInstallationRecords: fixture.loadInstallations().length === 0,
            uninstallOperationAuditRecorded: auditEntries.filter((entry) => entry.action === "uninstall").length === 2,
            uninstallReportsAffectedAuthorizations: uninstallMcpResult.authorizationImpact?.summary?.scopeCount === 2
                && uninstallMcpResult.authorizationImpact?.summary?.mcpGrants === 2
                && uninstallSkillResult.authorizationImpact?.summary?.scopeCount === 2
                && uninstallSkillResult.authorizationImpact?.summary?.skillGrants === 2,
            uninstallReportsRuntimeImpact: uninstallMcpResult.runtimeImpact?.summary?.runtimeSnapshots === 1
                && uninstallMcpResult.runtimeImpact?.summary?.catalogStale === 1
                && uninstallSkillResult.runtimeImpact?.summary?.runtimeSnapshots === 1
                && uninstallSkillResult.runtimeImpact?.summary?.catalogStale === 1,
            uninstallAutoResyncsRuntime: uninstallMcpResult.runtimeResync?.summary?.resynced === 1
                && uninstallSkillResult.runtimeResync?.summary?.resynced === 1
                && !JSON.stringify(uninstallMcpResult.runtimeResync).includes(runtimeWorkDir),
            marketplaceOperationAuditRecordsAuthorizationImpact: auditEntries.filter((entry) => entry.authorizationImpact?.schema === "ccm-marketplace-authorization-impact-v1").length === 6
                && auditEntries.some((entry) => entry.action === "uninstall" && entry.authorizationImpact?.summary?.scopeCount === 2)
                && auditEntries.every((entry) => !JSON.stringify(entry.authorizationImpact || {}).includes("TOKEN=secret"))
                && auditEntries.every((entry) => !JSON.stringify(entry.authorizationImpact || {}).includes("updated marketplace tool")),
            marketplaceOperationAuditRecordsRuntimeImpact: auditEntries.filter((entry) => entry.runtimeImpact?.schema === "ccm-marketplace-runtime-impact-v1").length === 6
                && auditEntries.some((entry) => entry.action === "uninstall" && entry.runtimeImpact?.summary?.catalogStale === 1)
                && auditEntries.every((entry) => !JSON.stringify(entry.runtimeImpact || {}).includes("TOKEN=secret")),
            marketplaceOperationAuditRecordsRuntimeResync: auditEntries.filter((entry) => entry.runtimeResync?.schema === "ccm-marketplace-runtime-resync-v1").length === 4
                && auditEntries.some((entry) => entry.action === "update" && entry.runtimeResync?.summary?.resynced === 1)
                && auditEntries.some((entry) => entry.action === "uninstall" && entry.runtimeResync?.summary?.resynced === 1)
                && auditEntries.every((entry) => !JSON.stringify(entry.runtimeResync || {}).includes("runtime-work")),
            marketplaceOperationAuditRecordsSourceProof: auditEntries.filter((entry) => entry.sourceProof?.schema === "ccm-marketplace-source-proof-v1").length === 6
                && auditEntries.some((entry) => entry.action === "uninstall" && entry.sourceProof?.name === "e2e-market-skill")
                && auditEntries.every((entry) => !JSON.stringify(entry.sourceProof || {}).includes("TOKEN=secret")),
            marketplaceOperationHistoryReadsRecentSanitizedEntries: operationHistory.schema === "ccm-marketplace-operations-v1"
                && operationHistory.items.length === 4
                && operationHistory.items[0]?.action === "uninstall"
                && operationHistory.items.some((entry) => entry.authorizationImpact?.schema === "ccm-marketplace-authorization-impact-v1")
                && operationHistory.items.some((entry) => entry.runtimeImpact?.schema === "ccm-marketplace-runtime-impact-v1")
                && operationHistory.items.some((entry) => entry.runtimeResync?.schema === "ccm-marketplace-runtime-resync-v1")
                && operationHistory.summary.impactedScopes >= 4
                && operationHistory.summary.impactedRuntimeSnapshots >= 4
                && operationHistory.summary.staleRuntimeSnapshots >= 4
                && operationHistory.summary.runtimeResynced >= 4
                && operationHistory.items.every((entry) => !JSON.stringify(entry).includes("TOKEN=secret"))
                && operationHistory.items.every((entry) => !JSON.stringify(entry).includes("updated marketplace tool")),
            marketplaceOperationHistoryIncludesSourceProof: operationHistory.items.some((entry) => entry.sourceProof?.schema === "ccm-marketplace-source-proof-v1")
                && operationHistory.items.every((entry) => !JSON.stringify(entry.sourceProof || {}).includes("TOKEN=secret")),
            reloadCalledForInstallUpdateAndUninstall: fixture.reloadCount() === 6,
        };
        return { pass: Object.values(checks).every(Boolean), checks };
    }
    finally {
        try {
            fs.rmSync(tempRoot, { recursive: true, force: true });
        }
        catch { }
    }
}
async function installMarketplaceItemWithStore(rawItem, store = {}, mode = "install", options = {}) {
    const item = normalizeMarketplaceItem(rawItem, { id: "custom", label: "Custom source", kind: "direct", trust: "custom" });
    if (item.type === "skill")
        (0, internal_skill_catalog_1.assertCcmInternalSkillMutable)(item.name, mode === "update" ? "通过商城更新或覆盖" : "从商城安装或覆盖");
    if (item.type === "mcp" && (0, internal_mcp_registry_1.isInternalMcpName)(item.name))
        throw new Error(`内部 MCP "${item.name}" 已随项目安装，不能通过商城覆盖`);
    const now = new Date().toISOString();
    let checksum = "";
    let packagePath = "";
    const skillPackagesDir = store.skillPackagesDir || db_1.SKILL_PACKAGES_DIR;
    const saveMcp = store.saveMcpTool || db_1.saveMcpTool;
    const saveInstalledSkill = store.saveSkill || db_1.saveSkill;
    const loadRecords = store.loadInstallations || loadInstallations;
    const saveRecords = store.saveInstallations || saveInstallations;
    const records = loadRecords();
    const key = installationKey(item.type, item.name);
    const previous = records.find(entry => entry.key === key);
    if (mode === "update" && !previous)
        throw new Error(`"${item.name}" 尚未安装，不能执行更新`);
    let sourceProof = null;
    if (item.type === "mcp") {
        if (item.url)
            await assertSafeHttpsUrl(item.url);
        const material = buildMarketplaceMcpToolRecord(item, now);
        checksum = sha256(JSON.stringify(material));
        sourceProof = buildMarketplaceSourceProof(item, { checksum });
        saveMcp(material);
    }
    else {
        const staged = await stageSkillPackage(item, skillPackagesDir);
        packagePath = installStagedPackage(staged.staging, item.name, skillPackagesDir);
        checksum = staged.checksum;
        sourceProof = buildMarketplaceSourceProof(item, { checksum, packageStats: staged.packageStats });
        saveInstalledSkill(buildMarketplaceSkillRecord(item, staged, packagePath, checksum, now));
    }
    const record = buildMarketplaceInstallationRecord(item, checksum, packagePath, previous, now, sourceProof);
    saveRecords([...records.filter(entry => entry.key !== key), record]);
    let toolManagerReloaded = false;
    if (store.reloadTools)
        await store.reloadTools();
    else
        await toolManager.loadTools();
    toolManagerReloaded = true;
    const action = previous ? "update" : "install";
    const authorizationImpact = buildMarketplaceAuthorizationImpact({ action, type: item.type, name: item.name }, store);
    let runtimeImpact = buildMarketplaceRuntimeImpact({ action, type: item.type, name: item.name }, store);
    const runtimeResync = maybeAutoResyncMarketplaceRuntime(runtimeImpact, options, store);
    if (runtimeResync?.summary?.resynced || runtimeResync?.summary?.created) {
        runtimeImpact = buildMarketplaceRuntimeImpact({ action, type: item.type, name: item.name }, store);
    }
    appendMarketplaceOperationAudit({
        action,
        key,
        type: item.type,
        name: item.name,
        source: item.source,
        previousVersion: previous?.version,
        version: record.version,
        previousChecksum: previous?.checksum,
        checksum: record.checksum,
        changed: !previous || previous.version !== record.version || previous.checksum !== record.checksum,
        packageManaged: item.type === "skill" && !!packagePath,
        toolManagerReloaded,
        authorizationImpact,
        runtimeImpact,
        runtimeResync,
        sourceProof,
    }, store);
    return { item, record, action, updated: action === "update", authorizationImpact, runtimeImpact, runtimeResync, sourceProof };
}
async function installMarketplaceItem(rawItem) {
    if (String(rawItem?.type || "").toLowerCase() === "skill") {
        (0, internal_skill_catalog_1.assertCcmInternalSkillMutable)(rawItem?.name, "从商城安装或覆盖");
    }
    const item = await resolveMarketplaceItemForInstall(rawItem, "install");
    const result = await installMarketplaceItemWithStore(item, {}, "install", { autoResync: rawItem?.autoResync });
    return { ...result, sourceVerified: true };
}
async function updateMarketplaceItem(rawItem) {
    if (String(rawItem?.type || "").toLowerCase() === "skill") {
        (0, internal_skill_catalog_1.assertCcmInternalSkillMutable)(rawItem?.name, "通过商城更新或覆盖");
    }
    const item = await resolveMarketplaceItemForInstall(rawItem, "update");
    const result = await installMarketplaceItemWithStore(item, {}, "update", { autoResync: rawItem?.autoResync });
    return { ...result, sourceVerified: true };
}
async function uninstallMarketplaceItemWithStore(payload, store = {}, options = {}) {
    const type = String(payload?.type || "").toLowerCase();
    const name = String(payload?.name || "").trim();
    if (type === "mcp" && (0, internal_mcp_registry_1.isInternalMcpName)(name))
        throw new Error(`内部 MCP "${name}" 由系统保护，不能卸载`);
    if (!["mcp", "skill"].includes(type) || !name)
        throw new Error("卸载参数无效");
    if (type === "skill")
        (0, internal_skill_catalog_1.assertCcmInternalSkillMutable)(name, "通过商城卸载");
    const skillPackagesDir = store.skillPackagesDir || db_1.SKILL_PACKAGES_DIR;
    const loadRecords = store.loadInstallations || loadInstallations;
    const saveRecords = store.saveInstallations || saveInstallations;
    const deleteMcp = store.deleteMcpTool || db_1.deleteMcpTool;
    const deleteInstalledSkill = store.deleteSkill || db_1.deleteSkill;
    const records = loadRecords();
    const key = installationKey(type, name);
    const record = records.find(entry => entry.key === key);
    if (type === "mcp")
        deleteMcp(name);
    else {
        deleteInstalledSkill(name);
        removeManagedPackage(record?.packagePath || "", skillPackagesDir);
    }
    saveRecords(records.filter(entry => entry.key !== key));
    let toolManagerReloaded = false;
    if (store.reloadTools)
        await store.reloadTools();
    else {
        toolManager.disconnect();
        await toolManager.loadTools();
    }
    toolManagerReloaded = true;
    const authorizationImpact = buildMarketplaceAuthorizationImpact({ action: "uninstall", type, name }, store);
    let runtimeImpact = buildMarketplaceRuntimeImpact({ action: "uninstall", type, name }, store);
    const runtimeResync = maybeAutoResyncMarketplaceRuntime(runtimeImpact, options, store);
    if (runtimeResync?.summary?.resynced || runtimeResync?.summary?.created) {
        runtimeImpact = buildMarketplaceRuntimeImpact({ action: "uninstall", type, name }, store);
    }
    appendMarketplaceOperationAudit({
        action: "uninstall",
        key,
        type,
        name,
        source: record?.source,
        previousVersion: record?.version,
        previousChecksum: record?.checksum,
        changed: !!record,
        packageManaged: type === "skill" && !!record?.packagePath,
        toolManagerReloaded,
        authorizationImpact,
        runtimeImpact,
        runtimeResync,
        sourceProof: record?.sourceProof,
    }, store);
    return { name, type, action: "uninstall", removed: !!record, authorizationImpact, runtimeImpact, runtimeResync };
}
async function uninstallMarketplaceItem(payload) {
    return uninstallMarketplaceItemWithStore(payload, {}, { autoResync: payload?.autoResync });
}
function readJsonBody(req, maxBytes = 2 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on("data", (chunk) => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += buffer.length;
            if (size > maxBytes) {
                reject(new Error("请求体过大"));
                req.destroy();
                return;
            }
            chunks.push(buffer);
        });
        req.on("end", () => {
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8") || "{}"));
            }
            catch (error) {
                reject(error);
            }
        });
        req.on("error", reject);
    });
}
function handleMarketplaceApi(pathname, req, res, parsed) {
    if (pathname === "/api/smithery/config" && req.method === "GET") {
        let key = "";
        try {
            key = String(JSON.parse(fs.readFileSync(SMITHERY_CONFIG_FILE, "utf-8")).key || "");
        }
        catch { }
        (0, utils_1.sendJson)(res, { success: true, configured: !!key, key: "" });
        return true;
    }
    if (pathname === "/api/smithery/config" && req.method === "POST") {
        readJsonBody(req)
            .then(payload => {
            writeJsonAtomic(SMITHERY_CONFIG_FILE, { key: String(payload.key || "") });
            (0, utils_1.sendJson)(res, { success: true });
        })
            .catch(error => (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400));
        return true;
    }
    if (pathname === "/api/marketplace/installations" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, items: loadInstallations() });
        return true;
    }
    if (pathname === "/api/marketplace/operations" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, ...readMarketplaceOperationAudit({ limit: parsed.query.limit }) });
        return true;
    }
    if (pathname === "/api/marketplace/sources" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, sources: publicMarketplaceSources() });
        return true;
    }
    if (pathname === "/api/marketplace/sources" && req.method === "POST") {
        readJsonBody(req)
            .then(saveMarketplaceSource)
            .then(result => (0, utils_1.sendJson)(res, { success: true, ...result }))
            .catch(error => (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400));
        return true;
    }
    if (pathname === "/api/marketplace/sources/delete" && req.method === "POST") {
        readJsonBody(req)
            .then(deleteMarketplaceSource)
            .then(result => (0, utils_1.sendJson)(res, { success: true, ...result }))
            .catch(error => (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400));
        return true;
    }
    if (pathname === "/api/marketplace/list" && req.method === "GET") {
        const source = String(parsed.query.source || "local");
        const customUrl = String(parsed.query.url || "");
        const listOptions = {
            query: String(parsed.query.query || parsed.query.q || ""),
            page: marketplacePageNumber(parsed.query.page, 1),
            pageSize: marketplacePageNumber(parsed.query.pageSize, DEFAULT_MARKETPLACE_PAGE_SIZE),
            category: String(parsed.query.category || "all"),
            sort: String(parsed.query.sort || "popular"),
        };
        (async () => {
            if (source === "skills-sh")
                return loadSkillsShItems(listOptions);
            if (source === "smithery")
                return loadSmitheryItems(listOptions);
            if (source === "local") {
                const items = localMarketplaceItems();
                return {
                    items,
                    needKey: false,
                    pagination: marketplacePagination(1, items.length || DEFAULT_MARKETPLACE_PAGE_SIZE, items.length),
                    query: { text: "", applied: "", category: "all", sort: "popular", defaulted: false },
                    sourceStatus: marketplaceSourceStatus({ id: "ccm-official", label: "CCM 官方精选", kind: "builtin", trust: "official" }, { online: false, anonymous: true, message: "本地内置精选，无需联网" }),
                };
            }
            if (source === "github") {
                const items = await loadCatalogItems(CCM_COMMUNITY_CATALOG_URL, { id: "ccm-community", label: "CCM Community", kind: "catalog", url: CCM_COMMUNITY_CATALOG_URL, trust: "community" });
                return {
                    items,
                    needKey: false,
                    pagination: marketplacePagination(1, items.length || DEFAULT_MARKETPLACE_PAGE_SIZE, items.length),
                    query: { text: "", applied: "", category: "all", sort: "popular", defaulted: false },
                    sourceStatus: marketplaceSourceStatus({ id: "ccm-community", label: "CCM Community", kind: "catalog", url: CCM_COMMUNITY_CATALOG_URL, trust: "community" }, { message: "已读取 CCM 社区精选源" }),
                };
            }
            if (source === "custom" && customUrl) {
                return {
                    items: await loadCatalogItems(customUrl, { id: `custom-${sha256(customUrl).slice(0, 10)}`, label: new URL(customUrl).hostname, kind: "catalog", url: customUrl, trust: "custom" }),
                    needKey: false,
                };
            }
            const savedSource = publicMarketplaceSources().find(item => item.id === source);
            if (savedSource?.url) {
                return {
                    items: await loadCatalogItems(savedSource.url, savedSource),
                    needKey: false,
                };
            }
            throw new Error("未指定有效的商城来源");
        })()
            .then((result) => (0, utils_1.sendJson)(res, {
            success: true,
            needKey: false,
            items: decorateInstallState(result.items || []),
            pagination: result.pagination || marketplacePagination(1, (result.items || []).length || DEFAULT_MARKETPLACE_PAGE_SIZE, (result.items || []).length),
            query: result.query || { text: listOptions.query || "", applied: listOptions.query || "", category: listOptions.category || "all", sort: listOptions.sort || "popular", defaulted: false },
            sourceStatus: result.sourceStatus || null,
        }))
            .catch(error => (0, utils_1.sendJson)(res, { success: false, error: error.message, items: [] }, 400));
        return true;
    }
    if (pathname === "/api/marketplace/preview" && req.method === "POST") {
        readJsonBody(req)
            .then(previewMarketplaceItem)
            .then(result => (0, utils_1.sendJson)(res, { success: true, ...result }))
            .catch(error => (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400));
        return true;
    }
    if (pathname === "/api/marketplace/authorization-impact" && req.method === "POST") {
        readJsonBody(req)
            .then(previewMarketplaceAuthorizationImpact)
            .then(result => (0, utils_1.sendJson)(res, { success: true, ...result }))
            .catch(error => (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400));
        return true;
    }
    if (pathname === "/api/marketplace/install" && req.method === "POST") {
        readJsonBody(req)
            .then(installMarketplaceItem)
            .then(result => (0, utils_1.sendJson)(res, { success: true, ...result }))
            .catch(error => (0, utils_1.sendJson)(res, { success: false, error: error.message, code: error.code }, Number(error.statusCode || 400)));
        return true;
    }
    if (pathname === "/api/marketplace/update" && req.method === "POST") {
        readJsonBody(req)
            .then(updateMarketplaceItem)
            .then(result => (0, utils_1.sendJson)(res, { success: true, ...result }))
            .catch(error => (0, utils_1.sendJson)(res, { success: false, error: error.message, code: error.code }, Number(error.statusCode || 400)));
        return true;
    }
    if (pathname === "/api/marketplace/uninstall" && req.method === "POST") {
        readJsonBody(req)
            .then(uninstallMarketplaceItem)
            .then(result => (0, utils_1.sendJson)(res, { success: true, ...result }))
            .catch(error => (0, utils_1.sendJson)(res, { success: false, error: error.message, code: error.code }, Number(error.statusCode || 400)));
        return true;
    }
    return false;
}
//# sourceMappingURL=marketplace.js.map