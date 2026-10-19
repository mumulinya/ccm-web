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
exports.extensionCenterItems = extensionCenterItems;
exports.changeExtensionEnabled = changeExtensionEnabled;
exports.handleExtensionsApi = handleExtensionsApi;
const extension_single_transaction_1 = require("./extension-single-transaction");
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const extension_state_1 = require("../../tools/extension-state");
const installed_tool_catalog_1 = require("../../tools/installed-tool-catalog");
const tool_manager_1 = require("../../tools/tool-manager");
const extension_oauth_1 = require("../../tools/extension-oauth");
const extension_runtime_bindings_1 = require("../../tools/extension-runtime-bindings");
const marketplace_1 = require("./marketplace");
const extension_packages_1 = require("./extension-packages");
const credential_store_1 = require("../../core/credential-store");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const extension_state_2 = require("../../tools/extension-state");
const extension_runtime_delivery_1 = require("../../tools/extension-runtime-delivery");
async function body(req) {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
        size += chunk.length;
        if (size > 2 * 1024 * 1024)
            throw new Error("请求内容过大");
        chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
function principal(req) {
    const auth = req.ccmAuth;
    if (auth?.kind !== "browser" || auth.role !== "admin")
        throw Object.assign(new Error("扩展管理需要管理员登录"), { statusCode: 403 });
    return { userId: auth.userId, sessionId: auth.sessionId };
}
function extensionCenterItems() {
    const catalog = (0, installed_tool_catalog_1.resolveInstalledToolCatalog)();
    const legacy = (0, marketplace_1.loadInstallations)();
    const mcpConfigs = (0, db_1.loadMcpTools)();
    const packages = (0, extension_state_1.readExtensionState)().items.filter(row => row.state !== "removed");
    const owned = new Set(packages.flatMap(row => row.members.filter(member => member.owned).map(member => `${member.kind}:${member.name}`)));
    const entries = catalog.entries.filter(row => !owned.has(`${row.kind}:${row.name}`)).map(row => ({ ...row, id: `${row.kind}:${row.name}`,
        type: row.kind, delivery: (0, extension_runtime_delivery_1.extensionRuntimeDelivery)([{ kind: row.kind, name: row.name }]), installationId: legacy.find(item => item.type === row.kind && item.name === row.name)?.installationId,
        members: [{ kind: row.kind, name: row.name, transport: row.kind === "mcp" && mcpConfigs.find(config => config.name === row.name)?.url ? "remote" : "stdio", connection: row.kind === "mcp" ? (0, extension_oauth_1.extensionOAuthStatus)(row.name) : null }], connection: row.kind === "mcp" ? (0, extension_oauth_1.extensionOAuthStatus)(row.name) : null }));
    return { ...catalog, items: [
            ...packages.map(row => ({ id: row.id, name: row.name, description: row.description, version: row.version, type: "plugin", enabled: row.enabled,
                installed: true, ready: row.state === "active" && row.enabled && row.members.every(member => catalog.entries.some(entry => entry.kind === member.kind && entry.name === member.name && entry.ready)),
                state: row.state, reason: row.error || "", source: row.source.label, sourceUrl: row.source.url,
                transactionId: row.transactionId, delivery: (0, extension_runtime_delivery_1.extensionRuntimeDelivery)(row.members), members: row.members.map(member => ({ ...member, transport: member.kind === "mcp" && mcpConfigs.find(config => config.name === member.name)?.url ? "remote" : "stdio", connection: member.kind === "mcp" ? (0, extension_oauth_1.extensionOAuthStatus)(member.name) : null })) })),
            ...entries,
        ] };
}
async function changeExtensionEnabled(id, enabled) {
    const lock = await (0, atomic_json_file_1.acquireFileLockAsync)(path.join(extension_state_2.EXTENSIONS_ROOT, "package-mutation"), { timeoutMs: 120_000, staleMs: 10 * 60_000 });
    try {
        return await changeExtensionEnabledUnderLock(id, enabled);
    }
    finally {
        (0, atomic_json_file_1.releaseFileLock)(lock);
    }
}
async function changeExtensionEnabledUnderLock(id, enabled) {
    const record = (0, extension_state_1.readExtensionState)().items.find(row => row.id === id && row.state !== "removed");
    let members;
    if (record) {
        if (record.state !== "active")
            throw new Error("扩展安装尚未完成，不能启用");
        members = record.members.filter(member => member.owned);
        (0, extension_state_1.mutateExtensionState)(state => { state.items.find(row => row.id === id).enabled = enabled; });
    }
    else {
        const [kind, ...rest] = id.split(":");
        const name = rest.join(":");
        if (!["mcp", "skill"].includes(kind))
            throw new Error("扩展不存在");
        (0, extension_state_1.assertExtensionMemberEditable)(kind, name);
        const current = (kind === "mcp" ? (0, db_1.loadMcpTools)() : (0, db_1.loadSkills)()).find(row => row.name === name);
        if (!current)
            throw new Error("扩展不存在");
        if (enabled) {
            const installation = (0, marketplace_1.loadInstallations)().find(row => row.type === kind && row.name === name);
            if (installation && installation.state !== "active")
                throw new Error("扩展需要重新校验安装，不能直接启用");
        }
        kind === "mcp" ? (0, db_1.saveMcpTool)({ ...current, enabled }) : (0, db_1.saveSkill)({ ...current, enabled });
        members = [{ kind, name }];
    }
    (0, extension_state_1.mutateExtensionState)(state => {
        for (const member of members) {
            const key = `${member.kind}:${member.name}`;
            state.disabled = enabled ? state.disabled.filter(value => value !== key) : [...new Set([...state.disabled, key])];
        }
    });
    const runtime = !enabled ? (0, extension_runtime_bindings_1.revokeExtensionRuntimeBindings)(members) : [];
    await tool_manager_1.toolManager.loadTools();
    return { enabled, runtime };
}
function handleExtensionsApi(pathname, req, res, parsed) {
    if (!pathname.startsWith("/api/extensions"))
        return false;
    const delegated = { "/catalog": "/list", "/sources": "/sources", "/sources/delete": "/sources/delete",
        "/install": "/install", "/uninstall": "/uninstall", "/preview": "/preview" };
    const suffix = pathname.slice("/api/extensions".length);
    if (delegated[suffix])
        return (0, marketplace_1.handleMarketplaceApi)(`/api/marketplace${delegated[suffix]}`, req, res, parsed);
    if (suffix.startsWith("/transactions/") && !suffix.endsWith("/configure"))
        return (0, marketplace_1.handleMarketplaceApi)(`/api/marketplace${suffix}`, req, res, parsed);
    void (async () => {
        const actor = principal(req);
        (0, installed_tool_catalog_1.migrateInstalledToolAvailability)();
        if (req.method === "GET" && (!suffix || suffix === "/effective"))
            return suffix ? (0, installed_tool_catalog_1.resolveInstalledToolCatalog)() : extensionCenterItems();
        if (suffix === "/update" && req.method === "POST") {
            const input = await body(req);
            const record = (0, marketplace_1.loadInstallations)().find(row => row.type === input.type && row.name === input.name);
            if (!record)
                throw new Error("该扩展不是由商城安装，请在高级设置中编辑");
            return (0, marketplace_1.createAndMaybeActivateMarketplaceTransaction)({ ...input, source: record.source }, "update", actor);
        }
        if (suffix === "/oauth/callback" && req.method === "GET") {
            const result = await (0, extension_oauth_1.finishExtensionOAuth)(parsed.query, actor);
            await tool_manager_1.toolManager.loadTools();
            return { ...result, message: "账号已连接，请返回扩展中心；待安装插件可继续重试安装" };
        }
        if (suffix === "/packages/preview" && req.method === "POST") {
            const input = await body(req);
            return (0, extension_packages_1.prepareExtensionPackage)(String(input.sourceUrl || ""), actor, input.action === "update" ? "update" : "install");
        }
        const standaloneConfig = suffix.match(/^\/transactions\/([^/]+)\/configure$/);
        if (standaloneConfig && req.method === "POST")
            return (0, extension_single_transaction_1.configureStandaloneTransaction)(decodeURIComponent(standaloneConfig[1]), await body(req), actor);
        const packageRoute = suffix.match(/^\/packages\/([^/]+)(?:\/(activate|configure))?$/);
        if (packageRoute) {
            if (req.method === "GET") {
                const transaction = (0, extension_packages_1.getPackageTransaction)(decodeURIComponent(packageRoute[1]));
                if (!transaction || transaction.principal.userId !== actor.userId)
                    throw new Error("安装事务不存在");
                return { transaction: (0, extension_packages_1.publicPackageTransaction)(transaction) };
            }
            if (req.method === "POST" && packageRoute[2]) {
                const input = await body(req);
                return packageRoute[2] === "configure" ? (0, extension_packages_1.configureExtensionPackage)(decodeURIComponent(packageRoute[1]), input.member, input, actor)
                    : (0, extension_packages_1.activateExtensionPackage)(decodeURIComponent(packageRoute[1]), input.activation_token, actor);
            }
        }
        if (suffix === "/delivery/retry" && req.method === "POST")
            return (0, extension_runtime_delivery_1.retryExtensionRuntimeDelivery)(String((await body(req)).id || ""));
        const route = suffix.match(/^\/([^/]+)\/(enabled|connect|connection|disconnect|remove)$/);
        if (route) {
            const id = decodeURIComponent(route[1]);
            if (route[2] === "enabled" && req.method === "POST") {
                const input = await body(req);
                if (typeof input.enabled !== "boolean")
                    throw new Error("enabled 必须为布尔值");
                return changeExtensionEnabled(id, input.enabled);
            }
            const name = id.startsWith("mcp:") ? id.slice(4) : id;
            const installedConfig = (0, db_1.loadMcpTools)().find(row => row.name === name);
            const config = installedConfig || (0, extension_packages_1.pendingExtensionMcp)(name);
            if (route[2] === "connection" && req.method === "GET")
                return (0, extension_oauth_1.extensionOAuthStatus)(name);
            if (route[2] === "connect" && req.method === "POST") {
                if (!config)
                    throw new Error("MCP 不存在");
                const input = await body(req);
                if (input.headers || input.env) {
                    if (!installedConfig)
                        throw new Error("插件尚未激活，请在整包预览中配置凭据");
                    for (const field of ["headers", "env"]) {
                        const values = input[field];
                        if (values !== undefined && (!values || typeof values !== "object" || Array.isArray(values) || Object.values(values).some(value => typeof value !== "string")))
                            throw new Error("凭据必须为字符串 JSON 对象");
                    }
                    (0, extension_state_1.assertExtensionMemberEditable)("mcp", name);
                    (0, db_1.saveMcpTool)({ ...config, ...(input.headers ? { headers: input.headers } : {}), ...(input.env ? { env: input.env } : {}) });
                    await tool_manager_1.toolManager.loadTools();
                    return { server: name, status: tool_manager_1.toolManager.getToolList().servers.find(row => row.name === name)?.state || "unavailable" };
                }
                // Derive callbacks from a configured/public origin, never an arbitrary forwarded header.
                const origin = String(process.env.CCM_PUBLIC_ORIGIN || `http://127.0.0.1:${req.socket.localPort}`);
                return (0, extension_oauth_1.startExtensionOAuth)(config, `${origin}/api/extensions/oauth/callback`, actor);
            }
            if (route[2] === "disconnect" && req.method === "POST") {
                (0, extension_oauth_1.disconnectExtensionOAuth)(name);
                const runtime = (0, extension_runtime_bindings_1.revokeExtensionRuntimeBindings)([{ kind: "mcp", name }]);
                await tool_manager_1.toolManager.loadTools();
                return { status: "disconnected", runtime };
            }
            if (route[2] === "remove" && req.method === "POST") {
                const input = await body(req);
                if (input.confirm !== id)
                    throw new Error("请确认要卸载的扩展");
                return (0, extension_packages_1.prepareExtensionRemoval)(id, actor);
            }
        }
        throw Object.assign(new Error("扩展接口不存在"), { statusCode: 404 });
    })().then(result => (0, utils_1.sendJson)(res, { success: true, ...result }))
        .catch(error => (0, utils_1.sendJson)(res, { success: false, error: (0, credential_store_1.redactSensitiveText)(error.message), code: error.code }, error.statusCode || 400));
    return true;
}
//# sourceMappingURL=extensions-api.js.map