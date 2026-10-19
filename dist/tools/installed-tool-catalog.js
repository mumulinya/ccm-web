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
exports.installedRecordAllowed = installedRecordAllowed;
exports.resolveInstalledToolCatalog = resolveInstalledToolCatalog;
exports.installedToolGrants = installedToolGrants;
exports.currentInstalledToolGrants = currentInstalledToolGrants;
exports.buildInstalledToolAvailabilityPayload = buildInstalledToolAvailabilityPayload;
exports.currentInstalledRecordAllowed = currentInstalledRecordAllowed;
exports.isToolSelectionSubset = isToolSelectionSubset;
exports.rejectLegacyToolSelection = rejectLegacyToolSelection;
exports.migrateInstalledToolAvailability = migrateInstalledToolAvailability;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const db_1 = require("../core/db");
const internal_skill_catalog_1 = require("../skills/internal-skill-catalog");
const internal_mcp_registry_1 = require("./internal-mcp-registry");
const extension_state_1 = require("./extension-state");
const atomic_json_file_1 = require("../core/atomic-json-file");
const root = process.env.CCM_TASK_STORE_DIR || path.join(os.homedir(), ".ccm");
function installedRecordAllowed(kind, item, ignoreConnection = false) {
    if (item.enabled === false || !(0, extension_state_1.extensionMemberAllowed)(kind, item.name))
        return false;
    if (!ignoreConnection && kind === "mcp" && item.url) {
        const status = require("./extension-oauth").extensionOAuthStatus(item.name, item.url).status;
        if (!["not_configured", "connected"].includes(status))
            return false;
    }
    let records = [];
    try {
        records = JSON.parse(fs.readFileSync(path.join(root, "marketplace", "installations.json"), "utf8")).items || [];
    }
    catch { }
    const record = records.find(row => row.type === kind && row.name === item.name);
    if (record && record.state !== "active")
        return false;
    try {
        const pending = JSON.parse(fs.readFileSync(path.join(root, "marketplace", "transactions.json"), "utf8")).items || [];
        if (pending.some((row) => row.type === kind && row.name === item.name && row.state === "activating"))
            return false;
    }
    catch { }
    if (kind === "skill" && item.packagePath) {
        try {
            const actual = require("../modules/tools/marketplace").validateSkillDirectory(item.packagePath).treeHash;
            const expected = item.packageStats?.treeHash || item.marketplace?.materialHash || record?.materialTreeHash;
            if (expected && actual !== expected)
                return false;
        }
        catch {
            return false;
        }
    }
    return true;
}
function resolveInstalledToolCatalog(input = {}) {
    const runtime = input.runtime || require("./tool-manager").toolManager.getToolList();
    const servers = new Map((runtime.servers || []).map((row) => [row.name, row]));
    const skills = new Set((runtime.skills || []).map((row) => row.name));
    const entries = [
        ...(input.mcpTools || (0, db_1.loadMcpTools)()).filter(item => !(0, internal_mcp_registry_1.isInternalMcpName)(item.name)).map(item => ({ kind: "mcp", item })),
        ...(input.skills || (0, db_1.loadSkills)()).filter(item => !(0, internal_skill_catalog_1.isCcmInternalSkillName)(item.name) && !item.systemManaged && !item.roleSkill).map(item => ({ kind: "skill", item })),
    ].map(({ kind, item }) => {
        const enabled = item.enabled !== false && (0, extension_state_1.extensionMemberEnabled)(kind, item.name);
        const integrity = installedRecordAllowed(kind, item, true);
        const status = servers.get(item.name);
        const materialPresent = kind !== "skill" || !item.packagePath || fs.existsSync(path.join(item.packagePath, "SKILL.md"));
        const ready = enabled && integrity && materialPresent && (kind === "mcp" ? status?.connected === true : skills.has(item.name));
        return { kind, name: item.name, description: String(item.description || ""), installed: true, enabled,
            ready, integrity, state: !enabled ? "disabled" : !integrity ? "invalid_material" : ready ? "ready" : status?.state || "unavailable",
            reason: !enabled ? "已禁用" : !integrity ? "安装尚未激活或物料校验失败" : !materialPresent ? "技能包已丢失" : ready ? "" : status?.state === "auth_required" || (kind === "mcp" && item.url && require("./extension-oauth").extensionOAuthStatus(item.name, item.url).status !== "not_configured") ? "需要连接账号" : "扩展尚未就绪",
            version: String(item.version || ""), source: item.source?.label || (item.marketplaceRevision ? "商城安装" : "手动添加"),
            materialHash: item.materialHash || item.contentHash || "" };
    });
    const tools = { mcp: entries.filter(row => row.kind === "mcp" && row.ready).map(row => row.name).sort(),
        skill: entries.filter(row => row.kind === "skill" && row.ready).map(row => row.name).sort() };
    return { availabilityMode: "installed", tools, entries,
        revision: (0, extension_state_1.extensionHash)(entries.map(({ kind, name, enabled, ready, materialHash }) => ({ kind, name, enabled, ready, materialHash }))) };
}
function installedToolGrants() { return resolveInstalledToolCatalog().tools; }
// Queue validation checks revocation and material integrity, not transient connectivity.
function currentInstalledToolGrants() {
    const entries = resolveInstalledToolCatalog().entries.filter(row => row.enabled && row.integrity && (row.kind !== "mcp"
        || require("./extension-oauth").extensionOAuthStatus(row.name).status !== "disconnected"));
    return { mcp: entries.filter(row => row.kind === "mcp").map(row => row.name), skill: entries.filter(row => row.kind === "skill").map(row => row.name) };
}
function buildInstalledToolAvailabilityPayload(_legacy) {
    return { ...require("./tool-authorization").buildToolAuthorizationPayload(installedToolGrants()), availabilityMode: "installed" };
}
function currentInstalledRecordAllowed(kind, name) {
    if ((kind === "skill" && (0, internal_skill_catalog_1.isCcmInternalSkillName)(name)) || (kind === "mcp" && (0, internal_mcp_registry_1.isInternalMcpName)(name)))
        return true;
    const record = (kind === "mcp" ? (0, db_1.loadMcpTools)() : (0, db_1.loadSkills)()).find(item => item.name === name);
    return !!record && installedRecordAllowed(kind, record);
}
function isToolSelectionSubset(requested, current) {
    return ["mcp", "skill"].every(kind => (requested?.[kind] || []).every((name) => (current?.[kind] || []).includes(name)));
}
function rejectLegacyToolSelection(payload) {
    if (Object.prototype.hasOwnProperty.call(payload || {}, "tools")) {
        throw Object.assign(new Error("工具已改为安装后统一可用，请移除 tools 字段并在扩展中心管理"), { code: "SCOPED_TOOL_SELECTION_REMOVED", statusCode: 409 });
    }
}
function migrateInstalledToolAvailability() {
    fs.mkdirSync(extension_state_1.EXTENSIONS_ROOT, { recursive: true });
    return (0, atomic_json_file_1.withFileLock)(path.join(extension_state_1.EXTENSIONS_ROOT, "migration"), () => {
        const target = path.join(extension_state_1.EXTENSIONS_ROOT, "availability-migration-v1.json");
        if (fs.existsSync(target))
            return;
        const projects = (0, db_1.loadProjectConfigs)();
        let groups = [];
        try {
            groups = require("../modules/collaboration/storage").loadGroups();
        }
        catch { }
        let global = null;
        try {
            global = JSON.parse(fs.readFileSync(path.join(root, "global-agent-tool-authorization.json"), "utf8"));
        }
        catch { }
        // Keep historical global disables even when a legacy installer replaces
        // its member configuration during a later update.
        (0, extension_state_1.mutateExtensionState)(state => {
            state.disabled = [...new Set([...state.disabled,
                    ...(0, db_1.loadMcpTools)().filter(item => item.enabled === false).map(item => `mcp:${item.name}`),
                    ...(0, db_1.loadSkills)().filter(item => item.enabled === false).map(item => `skill:${item.name}`),
                ])];
        });
        (0, atomic_json_file_1.writeJsonAtomic)(target, { schema: "ccm-installed-tool-migration-v1", availabilityMode: "installed", at: new Date().toISOString(),
            previous: { global, projects: Object.fromEntries(Object.entries(projects).map(([key, value]) => [key, value.tools || {}])),
                groups: groups.map(group => ({ id: group.id, tools: group.tools || {} })) } });
    });
}
//# sourceMappingURL=installed-tool-catalog.js.map