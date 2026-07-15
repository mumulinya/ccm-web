import * as fs from "fs";
import * as path from "path";

export const GROUP_COORDINATOR_INTERNAL_MCP = "ccm__group_coordinator";
export const FEISHU_INTERNAL_MCP = "mcp-feishu";

type InternalMcpTool = {
  name: string;
  label?: string;
  description?: string;
};

type InternalMcpManifest = {
  schema: "ccm-internal-mcp-v1";
  name: string;
  display_name: string;
  description: string;
  version?: string;
  entry?: string;
  configuration?: string;
  lifecycle?: string;
  lifecycle_label?: string;
  scopes?: string[];
  tools?: InternalMcpTool[];
};

function packageRootCandidates() {
  return Array.from(new Set([
    path.resolve(__dirname, "../.."),
    path.resolve(process.cwd(), "ccm-package"),
    path.resolve(process.cwd()),
  ]));
}

function isPackageRoot(candidate: string) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(candidate, "package.json"), "utf-8"));
    return pkg?.name === "@mumulinya167/cc-web" || fs.existsSync(path.join(candidate, "dist", "server.js"));
  } catch {
    return false;
  }
}

export function findCcmPackageRoot() {
  return packageRootCandidates().find(isPackageRoot) || packageRootCandidates()[0];
}

function readJson(file: string) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); }
  catch { return null; }
}

function normalizeManifest(raw: any, manifestPath: string): (InternalMcpManifest & { manifest_path: string; package_dir: string }) | null {
  if (raw?.schema !== "ccm-internal-mcp-v1") return null;
  const name = String(raw.name || "").trim();
  const displayName = String(raw.display_name || "").trim();
  if (!name || !displayName) return null;
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
      ? raw.tools.map((tool: any) => ({ name: String(tool?.name || "").trim(), label: String(tool?.label || "").trim(), description: String(tool?.description || "").trim() })).filter((tool: any) => tool.name)
      : [],
    manifest_path: manifestPath,
    package_dir: path.dirname(manifestPath),
  };
}

export function discoverBundledInternalMcpManifests(packageRoot = findCcmPackageRoot()) {
  if (!fs.existsSync(packageRoot)) return [];
  const manifests: any[] = [];
  for (const entry of fs.readdirSync(packageRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("mcp-")) continue;
    const manifestPath = path.join(packageRoot, entry.name, "internal-mcp.json");
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = normalizeManifest(readJson(manifestPath), manifestPath);
    if (manifest) manifests.push(manifest);
  }
  return manifests;
}

export function isInternalMcpName(value: any) {
  const name = String(value || "").trim().toLowerCase();
  if (!name) return false;
  if (name === GROUP_COORDINATOR_INTERNAL_MCP || name === FEISHU_INTERNAL_MCP) return true;
  return discoverBundledInternalMcpManifests().some(item => String(item.name || "").toLowerCase() === name);
}

function feishuCredentials(config: any = {}, fallbackEnv: any = {}) {
  const appId = String(config?.control_bot_app_id || config?.app_id || fallbackEnv?.FEISHU_APP_ID || "").trim();
  const appSecret = String(config?.control_bot_app_secret || config?.app_secret || fallbackEnv?.FEISHU_APP_SECRET || "").trim();
  return { appId, appSecret, configured: !!(appId && appSecret) };
}

export function buildBundledFeishuMcpTool(config: any = {}, fallback: any = {}) {
  const manifest = discoverBundledInternalMcpManifests().find(item => item.name === FEISHU_INTERNAL_MCP);
  if (!manifest) return null;
  const entryPath = manifest.entry ? path.resolve(manifest.package_dir, manifest.entry) : "";
  const credentials = feishuCredentials(config, fallback?.env || {});
  return {
    ...fallback,
    name: FEISHU_INTERNAL_MCP,
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

function runtimeStateFor(name: string, runtimeServers: any[]) {
  const row = runtimeServers.find((item: any) => String(item?.name || "") === name) || null;
  return row ? { state: String(row.state || (row.connected ? "connected" : "disconnected")), connected: row.connected === true, tools_count: Number(row.toolsCount || 0), error: String(row.error || "") } : null;
}

export function buildInternalMcpCatalog(options: { feishuConfig?: any; runtimeServers?: any[]; packageRoot?: string } = {}) {
  const packageRoot = options.packageRoot || findCcmPackageRoot();
  const runtimeServers = Array.isArray(options.runtimeServers) ? options.runtimeServers : [];
  const packageJson = readJson(path.join(packageRoot, "package.json")) || {};
  const coordinatorEntry = path.join(packageRoot, "dist", "integrations", "group-coordination-mcp.js");
  const coordinatorAvailable = fs.existsSync(coordinatorEntry);
  const coordinator = {
    name: GROUP_COORDINATOR_INTERNAL_MCP,
    display_name: "群聊 Agent 协调器",
    description: "承接项目子 Agent 的跨项目协作、评审、阻塞报告和进度查询，由群聊主 Agent 统一仲裁。",
    version: String(packageJson.version || "1.0.0"),
    origin: "internal",
    protected: true,
    immutable: true,
    bundled: true,
    lifecycle: "task_scoped",
    lifecycle_label: "按任务会话注入",
    scopes: ["群聊主 Agent", "项目子 Agent"],
    tools: [
      { name: "request_coordination", label: "提交协作请求", description: "提交跨项目信息或实现依赖。" },
      { name: "request_review", label: "申请评审", description: "请求主 Agent 安排只读评审。" },
      { name: "report_blocker", label: "报告阻塞", description: "报告无法自行解除的风险或权限问题。" },
      { name: "get_coordination_status", label: "查询进度", description: "查询当前任务会话的协调状态。" },
    ],
    state: coordinatorAvailable ? "ready" : "unavailable",
    state_label: coordinatorAvailable ? "可用" : "组件缺失",
    state_detail: coordinatorAvailable ? "在项目子 Agent 需要协作时自动注入" : "安装包缺少协调 MCP 入口文件",
    configuration_route: "",
    technical: { entry_path: coordinatorEntry, discovery: "backend_embedded", server_name: GROUP_COORDINATOR_INTERNAL_MCP },
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
  const items = [coordinator, ...discovered].sort((a: any, b: any) => a.display_name.localeCompare(b.display_name, "zh-CN"));
  return {
    schema: "ccm-internal-mcp-catalog-v1",
    success: true,
    source: "bundled_project_installation",
    read_only: true,
    items,
    summary: {
      total: items.length,
      ready: items.filter((item: any) => ["ready", "connected"].includes(item.state)).length,
      needs_configuration: items.filter((item: any) => item.state === "needs_configuration").length,
      unavailable: items.filter((item: any) => item.state === "unavailable").length,
      tools: items.reduce((sum: number, item: any) => sum + item.tools.length, 0),
    },
  };
}

export function runInternalMcpRegistrySelfTest(packageRoot = findCcmPackageRoot()) {
  const configured = buildInternalMcpCatalog({ packageRoot, feishuConfig: { app_id: "cli_test", app_secret: "secret" } });
  const unconfigured = buildInternalMcpCatalog({ packageRoot, feishuConfig: {} });
  const coordinator = configured.items.find((item: any) => item.name === GROUP_COORDINATOR_INTERNAL_MCP);
  const feishu = configured.items.find((item: any) => item.name === FEISHU_INTERNAL_MCP);
  const workflowMcps = new Map([
    ["ccm__task_runtime", 5],
    ["ccm__knowledge_context", 4],
    ["ccm__test_acceptance", 6],
    ["ccm__delivery_workspace", 6],
    ["ccm__task_evidence", 4],
  ]);
  const workflowItems = [...workflowMcps].map(([name, tools]) => ({ item: configured.items.find((row: any) => row.name === name), name, tools }));
  const hiddenSecrets = !JSON.stringify(configured).includes("secret") && !JSON.stringify(configured).includes("cli_test");
  const checks = {
    bundledCatalogDiscovered: configured.items.length === 7 && configured.summary.tools === 33,
    coordinatorProtectedAndReady: coordinator?.protected === true && coordinator?.state === "ready" && coordinator?.tools?.length === 4,
    feishuBundledAndReady: feishu?.bundled === true && feishu?.state === "ready" && feishu?.tools?.length === 4,
    workflowMcpsProtectedAndReady: workflowItems.every(({ item, tools }) => item?.bundled === true && item?.protected === true && item?.immutable === true && item?.state === "ready" && item?.lifecycle === "task_scoped" && item?.tools?.length === tools),
    feishuNeedsSettingsWithoutCredentials: unconfigured.items.find((item: any) => item.name === FEISHU_INTERNAL_MCP)?.state === "needs_configuration",
    internalNamesReserved: [GROUP_COORDINATOR_INTERNAL_MCP, FEISHU_INTERNAL_MCP, ...workflowMcps.keys()].every(isInternalMcpName),
    secretsNeverExposed: hiddenSecrets,
  };
  return { pass: Object.values(checks).every(Boolean), checks, catalog: configured };
}
