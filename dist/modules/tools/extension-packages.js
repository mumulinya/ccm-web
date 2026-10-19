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
exports.publicPackageTransaction = publicPackageTransaction;
exports.getPackageTransaction = getPackageTransaction;
exports.configureExtensionPackage = configureExtensionPackage;
exports.prepareExtensionRemoval = prepareExtensionRemoval;
exports.prepareExtensionPackage = prepareExtensionPackage;
exports.pendingExtensionMcp = pendingExtensionMcp;
exports.activateExtensionPackage = activateExtensionPackage;
exports.recoverExtensionPackages = recoverExtensionPackages;
const extension_single_transaction_1 = require("./extension-single-transaction");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const credential_store_1 = require("../../core/credential-store");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const extension_state_1 = require("../../tools/extension-state");
const internal_mcp_runtime_1 = require("../../integrations/internal-mcp-runtime");
const mcp_client_1 = require("../../tools/mcp-client");
const mcp_remote_client_1 = require("../../tools/mcp-remote-client");
const tool_manager_1 = require("../../tools/tool-manager");
const extension_material_1 = require("./extension-material");
const marketplace_1 = require("./marketplace");
const internal_mcp_registry_1 = require("../../tools/internal-mcp-registry");
const internal_skill_catalog_1 = require("../../skills/internal-skill-catalog");
const transactionsFile = path.join(extension_state_1.EXTENSIONS_ROOT, "transactions-v3.json");
function transactions() { return (0, atomic_json_file_1.readJsonWithBackup)(transactionsFile, { items: [] }).items; }
function put(transaction) {
    (0, atomic_json_file_1.withFileLock)(transactionsFile, () => {
        const rows = transactions();
        (0, atomic_json_file_1.writeJsonAtomic)(transactionsFile, { version: 3, items: [...rows.filter(row => row.id !== transaction.id), transaction] });
    });
}
function tokenCore(transaction) {
    return { id: transaction.id, action: transaction.action, extensionId: transaction.extensionId, principal: transaction.principal,
        materialHash: transaction.materialHash, configurationHash: transaction.configurationHash, expiresAt: transaction.expiresAt };
}
function snapshot(transaction) { return JSON.parse((0, credential_store_1.resolveCredential)(transaction.snapshotRef)); }
function publicPackageTransaction(transaction) {
    const data = snapshot(transaction);
    return { schema: transaction.schema, id: transaction.id, extensionId: transaction.extensionId, action: transaction.action,
        state: transaction.state, name: data.name, description: data.description, version: data.version, materialHash: transaction.materialHash,
        members: data.members?.map((member) => ({ kind: member.kind, name: member.name, owned: member.owned,
            transport: member.config?.url ? "remote" : member.kind === "mcp" ? "stdio" : undefined,
            envKeys: Object.keys(member.config?.env || {}), headerKeys: Object.keys(member.config?.headers || {}),
            command: (0, credential_store_1.redactSensitiveText)(member.config?.command || ""), args: (member.config?.args || []).map((arg) => (0, credential_store_1.redactSensitiveText)(String(arg))) })),
        files: data.files?.map((file) => ({ path: file.path, size: file.size })), hooksIgnored: data.hooksIgnored,
        error: transaction.error || "", updatedAt: transaction.updatedAt };
}
function getPackageTransaction(id) { return transactions().find(row => row.id === id); }
function configureExtensionPackage(id, memberName, input, principal) {
    const previous = getPackageTransaction(id);
    if (!previous || previous.principal.userId !== principal.userId || previous.principal.sessionId !== principal.sessionId
        || !["quarantined", "failed", "active"].includes(previous.state) || previous.action === "uninstall")
        throw new Error("扩展配置事务无效，请重新预览");
    const data = snapshot(previous);
    const member = data.members.find((row) => row.kind === "mcp" && row.name === memberName && row.owned);
    if (!member)
        throw new Error("插件成员不存在");
    for (const field of ["env", "headers"]) {
        if (input[field] === undefined)
            continue;
        const values = input[field];
        if (!values || typeof values !== "object" || Array.isArray(values) || Object.values(values).some(value => typeof value !== "string"))
            throw new Error("凭据必须为字符串 JSON 对象");
        member.config[field] = { ...(member.config[field] || {}), ...values };
    }
    const transaction = { ...previous, id: `extx_${crypto.randomUUID()}`, state: "quarantined", action: previous.state === "active" ? "update" : previous.action,
        configurationHash: (0, extension_state_1.extensionHash)(data.members.map((row) => row.config || null)), expiresAt: Date.now() + 15 * 60_000,
        previous: (0, extension_state_1.readExtensionState)().items.find(row => row.id === previous.extensionId && row.state === "active"),
        snapshotRef: (0, credential_store_1.protectCredential)(`extension-configure:${crypto.randomUUID()}`, "snapshot", JSON.stringify(data)),
        error: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    put(transaction);
    return { transaction: publicPackageTransaction(transaction), activation_token: (0, internal_mcp_runtime_1.signInternalMcpEvidence)(tokenCore(transaction)) };
}
function prepareExtensionRemoval(extensionId, principal) {
    let record = (0, extension_state_1.readExtensionState)().items.find(row => row.id === extensionId && row.state === "active");
    let manual = false;
    if (!record) {
        const [kind, ...parts] = extensionId.split(":");
        const name = parts.join(":");
        if (!["mcp", "skill"].includes(kind) || (kind === "mcp" && (0, internal_mcp_registry_1.isInternalMcpName)(name)))
            throw new Error("扩展不存在或由系统管理");
        (0, extension_state_1.assertExtensionMemberEditable)(kind, name);
        if (kind === "skill")
            (0, internal_skill_catalog_1.assertCcmInternalSkillMutable)(name, "卸载");
        const item = (kind === "mcp" ? (0, db_1.loadMcpTools)() : (0, db_1.loadSkills)()).find(row => row.name === name);
        if (!item)
            throw new Error("扩展不存在");
        manual = true;
        record = { schema: "ccm-extension-installation-v1", id: extensionId, name, description: item.description || "", version: item.version || "",
            source: { id: "manual", label: "手动添加" }, members: [{ kind: kind, name, owned: true }], materialHash: (0, extension_state_1.extensionHash)(item), enabled: item.enabled !== false,
            state: "active", transactionId: "", updatedAt: new Date().toISOString() };
    }
    const data = { ...record, manual, members: record.members, previousMcp: (0, db_1.loadMcpTools)().filter(row => record.members.some(member => member.kind === "mcp" && member.name === row.name)),
        previousSkills: (0, db_1.loadSkills)().filter(row => record.members.some(member => member.kind === "skill" && member.name === row.name)) };
    const now = new Date().toISOString();
    const transaction = { schema: "ccm-marketplace-transaction-v3", id: `extx_${crypto.randomUUID()}`,
        extensionId, action: "uninstall", state: "quarantined", principal, expiresAt: Date.now() + 15 * 60_000,
        materialHash: record.materialHash, snapshotRef: (0, credential_store_1.protectCredential)(`extension-uninstall:${crypto.randomUUID()}`, "snapshot", JSON.stringify(data)),
        previous: record, createdAt: now, updatedAt: now };
    put(transaction);
    return { transaction: publicPackageTransaction(transaction), activation_token: (0, internal_mcp_runtime_1.signInternalMcpEvidence)(tokenCore(transaction)), requires_activation: true };
}
async function prepareExtensionPackage(sourceUrl, principal, action = "install", fetchMaterial = extension_material_1.fetchPluginMaterial) {
    const material = await fetchMaterial(sourceUrl);
    const extensionId = `plugin-${(0, extension_state_1.extensionHash)(material.sourceUrl).slice(0, 16)}`;
    const previous = (0, extension_state_1.readExtensionState)().items.find(row => row.id === extensionId && row.state === "active");
    const duplicate = transactions().find(row => row.extensionId === extensionId && row.materialHash === material.materialHash
        && row.action === action && row.principal.userId === principal.userId && row.principal.sessionId === principal.sessionId
        && row.expiresAt > Date.now() && ["quarantined", "active"].includes(row.state));
    if (duplicate) {
        fs.rmSync(material.directory, { recursive: true, force: true });
        return { transaction: publicPackageTransaction(duplicate), activation_token: (0, internal_mcp_runtime_1.signInternalMcpEvidence)(tokenCore(duplicate)) };
    }
    const prefix = `ext-${(0, extension_state_1.extensionHash)(extensionId).slice(0, 10)}`;
    const previousMcp = (0, db_1.loadMcpTools)();
    const members = material.members.map(member => {
        const name = `${prefix}-${member.key}`;
        const old = previous?.members.some(row => row.owned && row.kind === "mcp" && row.name === name)
            ? previousMcp.find(row => row.name === name) : null;
        const config = member.kind === "mcp" && old && (old.url || "") === (member.config?.url || "")
            ? { ...member.config, env: { ...(member.config.env || {}), ...(old.env || {}) }, headers: { ...(member.config.headers || {}), ...(old.headers || {}) } } : member.config;
        return { ...member, ...(config ? { config } : {}), name, owned: true };
    });
    const dependencies = material.dependencies.map(id => {
        const found = (0, extension_state_1.readExtensionState)().items.find(row => row.id === id && row.state === "active" && row.enabled);
        if (!found)
            throw new Error(`插件依赖未安装或未启用：${id}`);
        return found.members.map(member => ({ ...member, owned: false }));
    }).flat();
    const data = { ...material, members: [...members, ...dependencies] };
    const now = new Date().toISOString();
    const transaction = { schema: "ccm-marketplace-transaction-v3", id: `extx_${crypto.randomUUID()}`,
        extensionId, action, state: "quarantined", principal, expiresAt: Date.now() + 15 * 60_000,
        materialHash: material.materialHash, configurationHash: (0, extension_state_1.extensionHash)(data.members.map((member) => member.config || null)), snapshotRef: (0, credential_store_1.protectCredential)(`extension-transaction:${extensionId}:${crypto.randomUUID()}`, "snapshot", JSON.stringify(data)),
        previous, createdAt: now, updatedAt: now };
    put(transaction);
    return { transaction: publicPackageTransaction(transaction), activation_token: (0, internal_mcp_runtime_1.signInternalMcpEvidence)(tokenCore(transaction)) };
}
function pendingExtensionMcp(name) {
    for (const transaction of transactions().reverse()) {
        if (!["quarantined", "failed"].includes(transaction.state))
            continue;
        const member = snapshot(transaction).members?.find((row) => row.kind === "mcp" && row.name === name);
        if (member?.config?.url)
            return { ...member.config, name };
    }
    return (0, extension_single_transaction_1.pendingStandaloneMcp)(name);
}
async function testMcp(config) {
    const item = (0, marketplace_1.validateStdioMarketplaceItem)(config);
    const client = item.url ? new mcp_remote_client_1.McpRemoteClient(item.url, item.headers || {}, item.transport === "sse" ? "sse" : "streamable_http", item.name)
        : new mcp_client_1.McpClient(item.executablePath || item.command, item.args || [], item.env || {});
    try {
        if (!await client.connect())
            throw new Error(`扩展“${config.name}”连接未就绪，请检查依赖、凭据或登录状态`);
        await client.listTools();
        return item;
    }
    finally {
        await client.disconnect();
    }
}
function replaceRecord(record) {
    (0, extension_state_1.mutateExtensionState)(state => { state.items = [...state.items.filter(row => row.id !== record.id), record]; });
}
function removeMemberRecord(member) {
    if (member.kind === "mcp")
        return (0, db_1.deleteMcpTool)(member.name);
    const previous = (0, db_1.loadSkills)().find(row => row.name === member.name);
    if (!previous)
        return;
    (0, db_1.saveSkill)({ ...previous, packagePath: undefined });
    try {
        (0, db_1.deleteSkill)(member.name);
    }
    catch (error) {
        (0, db_1.saveSkill)(previous);
        throw error;
    }
}
async function activateExtensionPackage(id, token, principal) {
    const lock = await (0, atomic_json_file_1.acquireFileLockAsync)(path.join(extension_state_1.EXTENSIONS_ROOT, "package-mutation"), { timeoutMs: 120_000, staleMs: 10 * 60_000 });
    try {
        const transaction = getPackageTransaction(id);
        if (!transaction || transaction.principal.userId !== principal.userId || transaction.principal.sessionId !== principal.sessionId
            || transaction.expiresAt < Date.now() || !(0, internal_mcp_runtime_1.verifyInternalMcpEvidenceSignature)(tokenCore(transaction), token))
            throw new Error("安装确认已失效，请重新预览扩展");
        if (transaction.state === "active")
            return { transaction: publicPackageTransaction(transaction), duplicate: true };
        if (transaction.state === "activating" || transaction.state === "recovery_required")
            throw new Error("安装事务需要恢复，请重新预览");
        let data = snapshot(transaction);
        const oldMcp = (0, db_1.loadMcpTools)();
        const oldSkills = (0, db_1.loadSkills)();
        let current = (0, extension_state_1.readExtensionState)().items.find(row => row.id === transaction.extensionId && row.state === "active");
        if (transaction.action === "uninstall") {
            if (data.manual && !current) {
                const member = data.members[0];
                const actual = (member.kind === "mcp" ? oldMcp : oldSkills).find(row => row.name === member.name);
                if (!actual || (0, extension_state_1.extensionHash)(actual) !== transaction.materialHash)
                    throw new Error("扩展配置已变化，请重新确认卸载");
                current = transaction.previous;
            }
            if (!current || current.materialHash !== transaction.materialHash)
                throw new Error("扩展版本已变化，请重新确认卸载");
            const dependents = (0, extension_state_1.readExtensionState)().items.filter(row => row.id !== current.id && row.state === "active")
                .some(row => row.members.some(member => !member.owned && current.members.some(owned => owned.owned && owned.kind === member.kind && owned.name === member.name)));
            if (dependents)
                throw new Error("其他插件仍依赖此扩展，请先卸载依赖它的插件");
            data = { ...data, previousMcp: oldMcp.filter(row => current.members.some(member => member.kind === "mcp" && member.name === row.name)),
                previousSkills: oldSkills.filter(row => current.members.some(member => member.kind === "skill" && member.name === row.name)) };
            transaction.previous = current;
            transaction.snapshotRef = (0, credential_store_1.protectCredential)(`extension-uninstall:${transaction.id}`, "snapshot", JSON.stringify(data));
            put({ ...transaction, state: "activating" });
            replaceRecord({ ...current, state: "preparing", previous: current });
            require("../../tools/extension-runtime-bindings").revokeExtensionRuntimeBindings(current.members.filter(member => member.owned));
            try {
                for (const member of current.members.filter(row => row.owned))
                    removeMemberRecord(member);
                replaceRecord({ ...current, state: "removed", enabled: false });
                await tool_manager_1.toolManager.loadTools();
                put({ ...transaction, state: "active", updatedAt: new Date().toISOString() });
                return { transaction: publicPackageTransaction(getPackageTransaction(id)), removed: true };
            }
            catch (error) {
                for (const config of data.previousMcp || [])
                    (0, db_1.saveMcpTool)(config);
                for (const config of data.previousSkills || [])
                    (0, db_1.saveSkill)(config);
                replaceRecord(current);
                put({ ...transaction, state: "recovery_required" });
                throw error;
            }
        }
        const record = { schema: "ccm-extension-installation-v1", id: transaction.extensionId,
            name: data.name, description: data.description, version: data.version,
            source: { id: transaction.extensionId, label: "GitHub 插件", url: data.sourceUrl, trust: "custom" },
            members: data.members.map(({ kind, name, owned, materialHash }) => ({ kind, name, owned, materialHash })), materialHash: transaction.materialHash,
            enabled: current?.enabled ?? true, state: "preparing", transactionId: id, updatedAt: new Date().toISOString(), previous: current };
        const written = [];
        try {
            for (const id of data.dependencies || []) {
                const dependency = (0, extension_state_1.readExtensionState)().items.find(row => row.id === id && row.state === "active" && row.enabled);
                if (!dependency || !dependency.members.every(member => data.members.some((row) => !row.owned && row.kind === member.kind && row.name === member.name))
                    || data.members.filter((row) => !row.owned).some((row) => !(0, extension_state_1.readExtensionState)().items.some(owner => owner.state === "active" && owner.enabled && owner.members.some(member => member.owned && member.kind === row.kind && member.name === row.name)))) {
                    throw new Error("插件依赖已变化，请重新预览安装");
                }
            }
            const files = (0, extension_material_1.validatePluginFiles)(data.directory);
            if (files.materialHash !== transaction.materialHash)
                throw new Error("插件物料发生变化，请重新预览");
            (0, extension_material_1.parsePluginMaterial)(data.directory);
            const packageRoot = path.join(extension_state_1.EXTENSIONS_ROOT, "packages", transaction.materialHash);
            if (!fs.existsSync(packageRoot)) {
                fs.mkdirSync(path.dirname(packageRoot), { recursive: true });
                fs.cpSync(data.directory, packageRoot, { recursive: true });
            }
            if ((0, extension_material_1.validatePluginFiles)(packageRoot).materialHash !== transaction.materialHash)
                throw new Error("已缓存插件物料发生变化，拒绝执行");
            const candidates = [];
            for (const member of data.members) {
                if (!member.owned)
                    continue;
                const existing = (member.kind === "mcp" ? oldMcp : oldSkills).find(row => row.name === member.name);
                if (existing && !current?.members.some(row => row.kind === member.kind && row.name === member.name && row.owned))
                    throw new Error("同名配置不属于该插件，禁止覆盖");
                if (member.kind === "mcp") {
                    const substitute = (value) => typeof value === "string" ? value.replace(/\$\{(?:CLAUDE_PLUGIN_ROOT|PLUGIN_ROOT)\}/g, packageRoot)
                        : Array.isArray(value) ? value.map(substitute) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, substitute(item)])) : value;
                    const config = substitute({ ...member.config, name: member.name });
                    if (String(config.command || "").startsWith("./"))
                        config.command = path.join(packageRoot, config.command.slice(2));
                    config.args = (config.args || []).map((arg) => arg.startsWith("./") ? path.join(packageRoot, arg.slice(2)) : arg);
                    const tested = await testMcp(config);
                    candidates.push({ kind: "mcp", record: { ...(0, marketplace_1.buildMarketplaceMcpToolRecord)(tested, record.updatedAt), extensionId: record.id } });
                }
                else {
                    const skillRoot = path.join(packageRoot, member.relativePath);
                    const stats = (0, marketplace_1.validateSkillDirectory)(skillRoot);
                    if (stats.treeHash !== member.materialHash)
                        throw new Error("技能物料已变化");
                    const target = path.join(db_1.SKILL_PACKAGES_DIR, `${member.name}-${stats.treeHash.slice(0, 16)}`);
                    if (!fs.existsSync(target)) {
                        fs.mkdirSync(path.dirname(target), { recursive: true });
                        fs.cpSync(skillRoot, target, { recursive: true });
                    }
                    if ((0, marketplace_1.validateSkillDirectory)(target).treeHash !== stats.treeHash)
                        throw new Error("已安装技能物料发生变化，拒绝复用");
                    const parsed = (0, marketplace_1.parseSkillMarkdown)(fs.readFileSync(path.join(target, "SKILL.md"), "utf8"), member.name, data.description);
                    candidates.push({ kind: "skill", record: { ...(0, marketplace_1.buildMarketplaceSkillRecord)({ name: member.name, description: parsed.description, version: data.version }, { parsed, packageStats: stats }, target, stats.treeHash, record.updatedAt), extensionId: record.id } });
                }
            }
            // The encrypted journal keeps every previous resource for restart recovery.
            data = { ...data, previousMcp: oldMcp.filter(row => current?.members.some(member => member.kind === "mcp" && member.name === row.name)),
                previousSkills: oldSkills.filter(row => current?.members.some(member => member.kind === "skill" && member.name === row.name)) };
            transaction.previous = current;
            transaction.snapshotRef = (0, credential_store_1.protectCredential)(`extension-transaction:${transaction.id}`, "snapshot", JSON.stringify(data));
            transaction.state = "activating";
            transaction.updatedAt = record.updatedAt;
            put(transaction);
            replaceRecord(record);
            for (const candidate of candidates) {
                written.push({ kind: candidate.kind, name: candidate.record.name });
                candidate.kind === "mcp" ? (0, db_1.saveMcpTool)(candidate.record) : (0, db_1.saveSkill)(candidate.record);
            }
            for (const member of current?.members || []) {
                if (!member.owned || record.members.some(row => row.kind === member.kind && row.name === member.name))
                    continue;
                const shared = (0, extension_state_1.readExtensionState)().items.some(other => other.id !== record.id && other.state === "active" && other.members.some(row => row.kind === member.kind && row.name === member.name));
                if (shared)
                    throw new Error("更新会移除其他插件仍在使用的成员，请先处理依赖");
                written.push(member);
                removeMemberRecord(member);
            }
            replaceRecord({ ...record, previous: undefined, state: "active" });
            await tool_manager_1.toolManager.loadTools();
            transaction.state = "active";
            transaction.error = "";
            put(transaction);
            return { transaction: publicPackageTransaction(transaction), installation: (0, extension_state_1.readExtensionState)().items.find(row => row.id === record.id) };
        }
        catch (error) {
            for (const member of written) {
                const previous = (member.kind === "mcp" ? oldMcp : oldSkills).find(row => row.name === member.name);
                if (previous)
                    member.kind === "mcp" ? (0, db_1.saveMcpTool)(previous) : (0, db_1.saveSkill)(previous);
                else
                    removeMemberRecord(member);
            }
            if (current)
                replaceRecord(current);
            else
                replaceRecord({ ...record, state: "failed", error: "安装未完成，请检查连接后重试" });
            transaction.state = "failed";
            transaction.error = "安装未完成，请检查依赖、凭据或账号连接后重试";
            put(transaction);
            await tool_manager_1.toolManager.loadTools();
            throw error;
        }
    }
    finally {
        (0, atomic_json_file_1.releaseFileLock)(lock);
    }
}
function recoverExtensionPackages() {
    for (const transaction of transactions()) {
        if (transaction.state !== "activating")
            continue;
        const record = (0, extension_state_1.readExtensionState)().items.find(row => row.id === transaction.extensionId);
        const data = snapshot(transaction);
        if (record)
            replaceRecord({ ...record, state: "preparing" });
        // Do not guess that a partially committed group was installed successfully.
        for (const config of data.previousMcp || [])
            (0, db_1.saveMcpTool)(config);
        for (const config of data.previousSkills || [])
            (0, db_1.saveSkill)(config);
        for (const member of data.members || []) {
            if (!member.owned)
                continue;
            const previous = (member.kind === "mcp" ? data.previousMcp : data.previousSkills) || [];
            if (previous.some((row) => row.name === member.name))
                continue;
            removeMemberRecord(member);
        }
        if (transaction.previous)
            replaceRecord(transaction.previous);
        else if (record)
            replaceRecord({ ...record, enabled: false, state: "recovery_required", error: "安装被中断，请重新预览并恢复" });
        put({ ...transaction, state: "recovery_required", updatedAt: new Date().toISOString() });
    }
}
//# sourceMappingURL=extension-packages.js.map