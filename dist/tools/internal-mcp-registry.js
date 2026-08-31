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
exports.FILESYSTEM_BUNDLED_MCP = exports.FETCH_WEB_BUNDLED_MCP = exports.FEISHU_INTERNAL_MCP = exports.WORKSPACE_EDIT_INTERNAL_MCP = exports.GROUP_COORDINATOR_INTERNAL_MCP = void 0;
exports.findCcmPackageRoot = findCcmPackageRoot;
exports.discoverBundledInternalMcpManifests = discoverBundledInternalMcpManifests;
exports.isInternalMcpName = isInternalMcpName;
exports.buildBundledFeishuMcpTool = buildBundledFeishuMcpTool;
exports.isLegacyFetchWebMcpDefinition = isLegacyFetchWebMcpDefinition;
exports.buildBundledFetchWebMcpTool = buildBundledFetchWebMcpTool;
exports.resolveBundledFilesystemMcpEntry = resolveBundledFilesystemMcpEntry;
exports.isLegacyOfficialFilesystemMcpDefinition = isLegacyOfficialFilesystemMcpDefinition;
exports.buildBundledFilesystemMcpTool = buildBundledFilesystemMcpTool;
exports.buildInternalMcpCatalog = buildInternalMcpCatalog;
exports.runInternalMcpRegistrySelfTest = runInternalMcpRegistrySelfTest;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
exports.GROUP_COORDINATOR_INTERNAL_MCP = "ccm__group_coordinator";
exports.WORKSPACE_EDIT_INTERNAL_MCP = "ccm__workspace_edit";
exports.FEISHU_INTERNAL_MCP = "mcp-feishu";
exports.FETCH_WEB_BUNDLED_MCP = "fetch-web-mcp";
exports.FILESYSTEM_BUNDLED_MCP = "filesystem-mcp";
function packageRootCandidates() {
    return Array.from(new Set([
        path.resolve(__dirname, "../.."),
        path.resolve(process.cwd(), "ccm-package"),
        path.resolve(process.cwd()),
    ]));
}
function isPackageRoot(candidate) {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(candidate, "package.json"), "utf-8"));
        return pkg?.name === "@mumulinya167/cc-web" || fs.existsSync(path.join(candidate, "dist", "server.js"));
    }
    catch {
        return false;
    }
}
function findCcmPackageRoot() {
    return packageRootCandidates().find(isPackageRoot) || packageRootCandidates()[0];
}
function readJson(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return null;
    }
}
function normalizeManifest(raw, manifestPath) {
    if (raw?.schema !== "ccm-internal-mcp-v1")
        return null;
    const name = String(raw.name || "").trim();
    const displayName = String(raw.display_name || "").trim();
    if (!name || !displayName)
        return null;
    return {
        schema: "ccm-internal-mcp-v1",
        name,
        display_name: displayName,
        description: String(raw.description || "").trim(),
        version: String(raw.version || "").trim(),
        entry: String(raw.entry || "").trim(),
        configuration: String(raw.configuration || "").trim(),
        lifecycle: String(raw.lifecycle || "").trim(),
        lifecycle_label: String(raw.lifecycle_label || "").trim(),
        scopes: Array.isArray(raw.scopes) ? raw.scopes.map(String).filter(Boolean) : [],
        tools: Array.isArray(raw.tools)
            ? raw.tools.map((tool) => ({ name: String(tool?.name || "").trim(), label: String(tool?.label || "").trim(), description: String(tool?.description || "").trim() })).filter((tool) => tool.name)
            : [],
        manifest_path: manifestPath,
        package_dir: path.dirname(manifestPath),
    };
}
function discoverBundledInternalMcpManifests(packageRoot = findCcmPackageRoot()) {
    if (!fs.existsSync(packageRoot))
        return [];
    const manifests = [];
    for (const entry of fs.readdirSync(packageRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith("mcp-"))
            continue;
        const manifestPath = path.join(packageRoot, entry.name, "internal-mcp.json");
        if (!fs.existsSync(manifestPath))
            continue;
        const manifest = normalizeManifest(readJson(manifestPath), manifestPath);
        if (manifest)
            manifests.push(manifest);
    }
    return manifests;
}
function isInternalMcpName(value) {
    const name = String(value || "").trim().toLowerCase();
    if (!name)
        return false;
    if (name === exports.GROUP_COORDINATOR_INTERNAL_MCP || name === exports.WORKSPACE_EDIT_INTERNAL_MCP || name === exports.FEISHU_INTERNAL_MCP)
        return true;
    return discoverBundledInternalMcpManifests().some(item => String(item.name || "").toLowerCase() === name);
}
function feishuCredentials(config = {}, fallbackEnv = {}) {
    const appId = String(config?.control_bot_app_id || config?.app_id || fallbackEnv?.FEISHU_APP_ID || "").trim();
    const appSecret = String(config?.control_bot_app_secret || config?.app_secret || fallbackEnv?.FEISHU_APP_SECRET || "").trim();
    return { appId, appSecret, configured: !!(appId && appSecret) };
}
function buildBundledFeishuMcpTool(config = {}, fallback = {}) {
    const manifest = discoverBundledInternalMcpManifests().find(item => item.name === exports.FEISHU_INTERNAL_MCP);
    if (!manifest)
        return null;
    const entryPath = manifest.entry ? path.resolve(manifest.package_dir, manifest.entry) : "";
    const credentials = feishuCredentials(config, fallback?.env || {});
    return {
        ...fallback,
        name: exports.FEISHU_INTERNAL_MCP,
        description: manifest.description,
        command: process.execPath,
        args: entryPath ? [entryPath] : [],
        env: {
            ...(fallback?.env || {}),
            ...(credentials.appId ? { FEISHU_APP_ID: credentials.appId } : {}),
            ...(credentials.appSecret ? { FEISHU_APP_SECRET: credentials.appSecret } : {}),
        },
        enabled: credentials.configured && !!entryPath && fs.existsSync(entryPath),
        origin: "internal",
        immutable: true,
        systemManaged: true,
        protected: true,
        configuration: "feishu_settings",
    };
}
function isLegacyFetchWebMcpDefinition(value = {}) {
    if (String(value?.name || "") !== exports.FETCH_WEB_BUNDLED_MCP)
        return false;
    const command = String(value?.command || "").trim().toLowerCase();
    const args = Array.isArray(value?.args) ? value.args.map((item) => String(item || "").trim().toLowerCase()) : [];
    return command === "uvx mcp-server-fetch"
        || command === "mcp-server-fetch"
        || command === "uvx" && args.includes("mcp-server-fetch")
        || command === "npx" && args.includes("@modelcontextprotocol/server-fetch");
}
function buildBundledFetchWebMcpTool(fallback = {}) {
    const candidates = [
        path.resolve(__dirname, "../integrations/fetch-web-mcp.js"),
        path.resolve(process.cwd(), "ccm-package", "dist", "integrations", "fetch-web-mcp.js"),
    ];
    const entryPath = candidates.find(candidate => fs.existsSync(candidate)) || candidates[0];
    return {
        ...fallback,
        name: exports.FETCH_WEB_BUNDLED_MCP,
        description: "Safely read a public HTTP/HTTPS page and convert it into model-readable text.",
        command: process.execPath,
        args: [entryPath],
        env: {},
        enabled: fallback?.enabled !== false && fs.existsSync(entryPath),
        version: "2.0.0",
        author: "CCM",
        origin: "builtin",
        bundled: true,
    };
}
function resolveBundledFilesystemMcpEntry() {
    try {
        const packageJson = require.resolve("@modelcontextprotocol/server-filesystem/package.json");
        const entryPath = path.join(path.dirname(packageJson), "dist", "index.js");
        if (fs.existsSync(entryPath))
            return entryPath;
    }
    catch { }
    const candidates = [
        path.join(findCcmPackageRoot(), "node_modules", "@modelcontextprotocol", "server-filesystem", "dist", "index.js"),
        path.resolve(process.cwd(), "node_modules", "@modelcontextprotocol", "server-filesystem", "dist", "index.js"),
    ];
    return candidates.find(candidate => fs.existsSync(candidate)) || candidates[0];
}
function isLegacyOfficialFilesystemMcpDefinition(value = {}) {
    if (String(value?.name || "") !== exports.FILESYSTEM_BUNDLED_MCP)
        return false;
    const source = value?.marketplace?.source || {};
    if (String(source?.id || "") !== "ccm-official" || String(source?.trust || "") !== "official")
        return false;
    const command = path.basename(String(value?.command || "")).toLowerCase();
    const args = Array.isArray(value?.args) ? value.args.map((item) => String(item || "").trim().toLowerCase()) : [];
    return ["npx", "npx.cmd"].includes(command)
        && args.some((item) => /^@modelcontextprotocol\/server-filesystem(?:@|$)/.test(item));
}
function buildBundledFilesystemMcpTool(fallback = {}) {
    const entryPath = resolveBundledFilesystemMcpEntry();
    const oldArgs = Array.isArray(fallback?.args) ? fallback.args.map(String) : [];
    const configuredRoot = oldArgs.find((item) => (item
        && item !== "-y"
        && item !== "--yes"
        && !/^@modelcontextprotocol\/server-filesystem(?:@|$)/i.test(item)));
    const root = configuredRoot || path.join(os.homedir(), ".ccm", "shared");
    return {
        ...fallback,
        name: exports.FILESYSTEM_BUNDLED_MCP,
        description: "Filesystem MCP server scoped to an explicit directory.",
        command: process.execPath,
        args: [entryPath, root],
        env: {},
        enabled: fallback?.enabled !== false && fs.existsSync(entryPath),
        version: "2026.7.10",
        author: "Model Context Protocol",
        origin: "builtin",
        bundled: true,
    };
}
function runtimeStateFor(name, runtimeServers) {
    const row = runtimeServers.find((item) => String(item?.name || "") === name) || null;
    return row ? { state: String(row.state || (row.connected ? "connected" : "disconnected")), connected: row.connected === true, tools_count: Number(row.toolsCount || 0), error: String(row.error || "") } : null;
}
function buildInternalMcpCatalog(options = {}) {
    const packageRoot = options.packageRoot || findCcmPackageRoot();
    const runtimeServers = Array.isArray(options.runtimeServers) ? options.runtimeServers : [];
    const packageJson = readJson(path.join(packageRoot, "package.json")) || {};
    const coordinatorEntry = path.join(packageRoot, "dist", "integrations", "group-coordination-mcp.js");
    const coordinatorAvailable = fs.existsSync(coordinatorEntry);
    const coordinator = {
        name: exports.GROUP_COORDINATOR_INTERNAL_MCP,
        display_name: "群聊 Agent 协调器",
        description: "Coordinate cross-project collaboration, reviews, blocker reports, and progress queries for project child Agents under the group main Agent.",
        version: String(packageJson.version || "1.0.0"),
        origin: "internal",
        protected: true,
        immutable: true,
        bundled: true,
        lifecycle: "task_scoped",
        lifecycle_label: "按任务会话注入",
        scopes: ["群聊主 Agent", "项目子 Agent"],
        tools: [
            { name: "request_coordination", label: "提交协作请求", description: "Submit cross-project information or implementation dependencies." },
            { name: "request_review", label: "申请评审", description: "Ask the main Agent to arrange a read-only review." },
            { name: "report_blocker", label: "报告阻塞", description: "Report a risk or permission issue that cannot be resolved locally." },
            { name: "get_coordination_status", label: "查询进度", description: "Read coordination status for the current task session." },
        ],
        state: coordinatorAvailable ? "ready" : "unavailable",
        state_label: coordinatorAvailable ? "可用" : "组件缺失",
        state_detail: coordinatorAvailable ? "在项目子 Agent 需要协作时自动注入" : "安装包缺少协调 MCP 入口文件",
        configuration_route: "",
        technical: { entry_path: coordinatorEntry, discovery: "backend_embedded", server_name: exports.GROUP_COORDINATOR_INTERNAL_MCP },
    };
    const workspaceEditEntry = path.join(packageRoot, "dist", "integrations", "workspace-edit-mcp.js");
    const workspaceEditAvailable = fs.existsSync(workspaceEditEntry);
    const workspaceEdit = {
        name: exports.WORKSPACE_EDIT_INTERNAL_MCP,
        display_name: "项目工作区编辑",
        description: "Provide controlled edit, create, move, and delete capabilities only to project execution child Agents that lack native file editing; do not inject this MCP into native third-party Agents.",
        version: String(packageJson.version || "1.0.0"),
        origin: "internal",
        protected: true,
        immutable: true,
        bundled: true,
        lifecycle: "task_scoped",
        lifecycle_label: "按项目任务注入",
        scopes: ["项目子 Agent"],
        tools: [
            { name: "apply_patch", label: "修改文件", description: "Apply an exact text patch after validating the previous content and checksum." },
            { name: "write_file", label: "写入文件", description: "Create a file or overwrite it after validating the previous version." },
            { name: "move_path", label: "移动文件", description: "Move or rename a file within the current project boundary." },
            { name: "delete_path", label: "删除文件", description: "Validate the version before deleting one ordinary file." },
        ],
        state: workspaceEditAvailable ? "ready" : "unavailable",
        state_label: workspaceEditAvailable ? "可用" : "组件缺失",
        state_detail: workspaceEditAvailable ? "仅在项目执行运行时明确缺少原生编辑能力时自动注入" : "安装包缺少工作区编辑 MCP 入口文件",
        configuration_route: "",
        technical: { entry_path: workspaceEditEntry, discovery: "backend_embedded", server_name: exports.WORKSPACE_EDIT_INTERNAL_MCP },
    };
    const discovered = discoverBundledInternalMcpManifests(packageRoot).map(manifest => {
        const entryPath = manifest.entry ? path.resolve(manifest.package_dir, manifest.entry) : "";
        const available = !!entryPath && fs.existsSync(entryPath);
        const credentials = manifest.configuration === "feishu_settings" ? feishuCredentials(options.feishuConfig) : { configured: true };
        const runtime = runtimeStateFor(manifest.name, runtimeServers);
        const state = !available ? "unavailable" : !credentials.configured ? "needs_configuration" : runtime?.connected ? "connected" : "ready";
        return {
            name: manifest.name,
            display_name: manifest.display_name,
            description: manifest.description,
            version: manifest.version || String(packageJson.version || ""),
            origin: "internal",
            protected: true,
            immutable: true,
            bundled: true,
            lifecycle: manifest.lifecycle || "bundled_service",
            lifecycle_label: manifest.lifecycle_label || "随项目安装",
            scopes: manifest.scopes,
            tools: manifest.tools,
            state,
            state_label: state === "connected" ? "运行中" : state === "ready" ? "可用" : state === "needs_configuration" ? "待配置" : "组件缺失",
            state_detail: state === "connected" ? "MCP 服务已连接" : state === "ready" ? (manifest.lifecycle === "task_scoped" ? "在 Agent 执行任务时按角色和权限自动注入" : "组件和必要配置已就绪") : state === "needs_configuration" ? "请在系统设置中完成飞书应用配置" : "安装包缺少 MCP 入口文件",
            configuration_route: manifest.configuration === "feishu_settings" ? "settings" : "",
            runtime,
            technical: { entry_path: entryPath, manifest_path: manifest.manifest_path, discovery: "bundled_manifest", server_name: manifest.name },
        };
    });
    const items = [coordinator, workspaceEdit, ...discovered].sort((a, b) => a.display_name.localeCompare(b.display_name, "zh-CN"));
    return {
        schema: "ccm-internal-mcp-catalog-v1",
        success: true,
        source: "bundled_project_installation",
        read_only: true,
        items,
        summary: {
            total: items.length,
            ready: items.filter((item) => ["ready", "connected"].includes(item.state)).length,
            needs_configuration: items.filter((item) => item.state === "needs_configuration").length,
            unavailable: items.filter((item) => item.state === "unavailable").length,
            tools: items.reduce((sum, item) => sum + item.tools.length, 0),
        },
    };
}
function runInternalMcpRegistrySelfTest(packageRoot = findCcmPackageRoot()) {
    const configured = buildInternalMcpCatalog({ packageRoot, feishuConfig: { app_id: "cli_test", app_secret: "secret" } });
    const unconfigured = buildInternalMcpCatalog({ packageRoot, feishuConfig: {} });
    const coordinator = configured.items.find((item) => item.name === exports.GROUP_COORDINATOR_INTERNAL_MCP);
    const feishu = configured.items.find((item) => item.name === exports.FEISHU_INTERNAL_MCP);
    const workflowMcps = new Map([
        ["ccm__task_runtime", 5],
        ["ccm__knowledge_context", 10],
        ["ccm__test_acceptance", 7],
        ["ccm__delivery_workspace", 6],
        ["ccm__task_evidence", 5],
    ]);
    const workflowItems = [...workflowMcps].map(([name, tools]) => ({ item: configured.items.find((row) => row.name === name), name, tools }));
    const permissionBroker = configured.items.find((item) => item.name === "ccm__permission_broker");
    const workspaceReadonly = configured.items.find((item) => item.name === "ccm__workspace_readonly");
    const workspaceEdit = configured.items.find((item) => item.name === exports.WORKSPACE_EDIT_INTERNAL_MCP);
    const hiddenSecrets = !JSON.stringify(configured).includes("secret") && !JSON.stringify(configured).includes("cli_test");
    const checks = {
        bundledCatalogDiscovered: configured.items.length === 10 && configured.summary.tools === 60,
        coordinatorProtectedAndReady: coordinator?.protected === true && coordinator?.state === "ready" && coordinator?.tools?.length === 4,
        feishuBundledAndReady: feishu?.bundled === true && feishu?.state === "ready" && feishu?.tools?.length === 4,
        workflowMcpsProtectedAndReady: workflowItems.every(({ item, tools }) => item?.bundled === true && item?.protected === true && item?.immutable === true && item?.state === "ready" && item?.lifecycle === "task_scoped" && item?.tools?.length === tools),
        permissionBrokerProtectedAndReady: permissionBroker?.bundled === true && permissionBroker?.protected === true && permissionBroker?.immutable === true && permissionBroker?.state === "ready" && permissionBroker?.lifecycle === "session_scoped" && permissionBroker?.tools?.length === 3,
        workspaceReadonlyProtectedAndReady: workspaceReadonly?.bundled === true && workspaceReadonly?.protected === true && workspaceReadonly?.immutable === true && workspaceReadonly?.state === "ready" && workspaceReadonly?.tools?.length === 12,
        workspaceEditProtectedAndReady: workspaceEdit?.bundled === true && workspaceEdit?.protected === true && workspaceEdit?.immutable === true && workspaceEdit?.state === "ready" && workspaceEdit?.lifecycle === "task_scoped" && workspaceEdit?.tools?.length === 4,
        feishuNeedsSettingsWithoutCredentials: unconfigured.items.find((item) => item.name === exports.FEISHU_INTERNAL_MCP)?.state === "needs_configuration",
        internalNamesReserved: [exports.GROUP_COORDINATOR_INTERNAL_MCP, exports.WORKSPACE_EDIT_INTERNAL_MCP, exports.FEISHU_INTERNAL_MCP, ...workflowMcps.keys(), "ccm__permission_broker", "ccm__workspace_readonly"].every(isInternalMcpName),
        secretsNeverExposed: hiddenSecrets,
    };
    return { pass: Object.values(checks).every(Boolean), checks, catalog: configured };
}
//# sourceMappingURL=internal-mcp-registry.js.map