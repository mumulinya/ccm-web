import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as os from "os";
import { loadMcpTools, loadSkills } from "./db";
import { normalizeAgentRuntimeId } from "./agent-runtime";
import { CCM_DIR } from "./utils";
import { loadOrchestratorConfig } from "./modules/group-orchestrator";

const CCM_MCP_PREFIX = "ccm__";
const CCM_SKILL_MARKER = ".ccm-managed.json";

export interface RuntimeToolSyncAudit {
  runtime: string;
  mode: "native-and-proxy" | "ccm-proxy-only" | "failed";
  nativeSupported: boolean;
  workDir: string;
  mcpConfigPath?: string;
  runtimeHomePath?: string;
  skillRoot?: string;
  configFormat?: string;
  isolation?: "strict" | "allowlist" | "project-scope" | "proxy";
  requested: { mcp: string[]; skill: string[] };
  synced: { mcp: string[]; skill: string[] };
  missing: { mcp: string[]; skill: string[] };
  errors: string[];
  warnings: string[];
  timestamp: string;
}

function uniqueNames(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(item => String(item || "").trim()).filter(Boolean)));
}

function tokenizeCommand(commandLine: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote = "";
  for (let index = 0; index < commandLine.length; index += 1) {
    const char = commandLine[index];
    if (quote) {
      if (char === quote) quote = "";
      else if (char === "\\" && commandLine[index + 1] === quote) current += commandLine[++index];
      else current += char;
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
    } else if (/\s/.test(char)) {
      if (current) tokens.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

function parseEnvironment(value: any): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item ?? "")]));
  }
  const env: Record<string, string> = {};
  String(value || "").split(/\r?\n/).forEach(line => {
    const separator = line.indexOf("=");
    if (separator <= 0) return;
    const key = line.slice(0, separator).trim();
    if (key) env[key] = line.slice(separator + 1).trim();
  });
  return env;
}

function toMcpServer(tool: any) {
  const url = String(tool?.url || "").trim();
  if (url) return { url, ...(tool?.headers && typeof tool.headers === "object" ? { headers: tool.headers } : {}) };
  const configuredArgs = Array.isArray(tool?.args) ? tool.args.map((item: any) => String(item)) : [];
  const commandParts = tokenizeCommand(String(tool?.command || "").trim());
  const command = commandParts.shift() || "";
  if (!command) throw new Error("缺少 command");
  const server: any = { command, args: [...commandParts, ...configuredArgs] };
  const env = parseEnvironment(tool?.env);
  if (Object.keys(env).length) server.env = env;
  return server;
}

function safeSlug(value: string) {
  const slug = String(value || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "tool";
}

function readJsonObject(file: string) {
  if (!fs.existsSync(file)) return {} as any;
  const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`${file} 必须是 JSON 对象`);
  return parsed as any;
}
function writeJsonAtomic(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.ccm-${process.pid}-${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

function syncManagedSkills(skillRoot: string, skills: any[], audit: RuntimeToolSyncAudit) {
  fs.mkdirSync(skillRoot, { recursive: true });
  const desired = new Set<string>();
  for (const skill of skills) {
    const directoryName = `${CCM_MCP_PREFIX.replace(/_+$/g, "-")}${safeSlug(skill.name)}`;
    desired.add(directoryName);
    const directory = path.join(skillRoot, directoryName);
    fs.mkdirSync(directory, { recursive: true });
    const description = String(skill.description || `CCM managed skill: ${skill.name}`).replace(/\r?\n/g, " ").trim();
    const body = `---\nname: ${JSON.stringify(String(skill.name))}\ndescription: ${JSON.stringify(description)}\n---\n\n${String(skill.prompt || "").trim()}\n`;
    fs.writeFileSync(path.join(directory, "SKILL.md"), body, "utf-8");
    writeJsonAtomic(path.join(directory, CCM_SKILL_MARKER), { source: "ccm", name: skill.name });
    audit.synced.skill.push(skill.name);
  }
  for (const entry of fs.readdirSync(skillRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || desired.has(entry.name)) continue;
    const directory = path.join(skillRoot, entry.name);
    if (fs.existsSync(path.join(directory, CCM_SKILL_MARKER))) fs.rmSync(directory, { recursive: true, force: true });
  }
}

function pruneManagedMcpSnapshots(runtimeRoot: string, keepFile: string) {
  const staleConfigs = fs.readdirSync(runtimeRoot, { withFileTypes: true })
    .filter(entry => entry.isFile() && /^mcp-[a-f0-9]{16}\.json$/.test(entry.name) && path.join(runtimeRoot, entry.name) !== keepFile)
    .map(entry => ({ file: path.join(runtimeRoot, entry.name), mtime: fs.statSync(path.join(runtimeRoot, entry.name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(20);
  for (const stale of staleConfigs) fs.unlinkSync(stale.file);
}

function tomlString(value: any) {
  return JSON.stringify(String(value ?? ""));
}

interface CodexGatewayConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

function loadCodexGatewayConfig(): CodexGatewayConfig | null {
  const config = loadOrchestratorConfig();
  const format = String(config?.format || "").trim().toLowerCase();
  const apiUrl = String(config?.apiUrl || "").trim().replace(/\/+$/, "");
  const apiKey = String(config?.apiKey || "").trim();
  const model = String(config?.model || "").trim();
  if (config?.enabled === false || !["openai-compatible", "auto"].includes(format) || !apiUrl || !apiKey || !model) return null;
  return { apiUrl, apiKey, model };
}

export function getRuntimeExecutionEnv(agentType: string): Record<string, string> {
  if (normalizeAgentRuntimeId(agentType) !== "codex") return {};
  const gateway = loadCodexGatewayConfig();
  return gateway ? { CCM_CODEX_API_KEY: gateway.apiKey } : {};
}

function buildCodexConfigToml(mcpServers: Record<string, any>, gateway: CodexGatewayConfig | null) {
  const lines = ["# Managed by CCM. This CODEX_HOME contains only tools authorized for this invocation.", ""];
  if (gateway) {
    lines.push(
      `model_provider = ${tomlString("ccm")}`,
      `model = ${tomlString(gateway.model)}`,
      `web_search = ${tomlString("disabled")}`,
      "",
      "[model_providers.ccm]",
      `name = ${tomlString("CCM Unified Gateway")}`,
      `base_url = ${tomlString(gateway.apiUrl)}`,
      `env_key = ${tomlString("CCM_CODEX_API_KEY")}`,
      `wire_api = ${tomlString("responses")}`,
      "requires_openai_auth = false",
      "",
    );
  }
  for (const [name, server] of Object.entries(mcpServers)) {
    lines.push(`[mcp_servers.${tomlString(name)}]`);
    if (server.url) {
      lines.push(`url = ${tomlString(server.url)}`);
    } else {
      lines.push(`command = ${tomlString(server.command)}`);
      lines.push(`args = [${(server.args || []).map((item: any) => tomlString(item)).join(", ")}]`);
    }
    if (server.env && Object.keys(server.env).length) {
      lines.push("", `[mcp_servers.${tomlString(name)}.env]`);
      for (const [key, value] of Object.entries(server.env)) lines.push(`${tomlString(key)} = ${tomlString(value)}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function runRuntimeToolSyncSelfTest() {
  const fakeSecret = "ccm-test-secret-must-not-be-persisted";
  const config = buildCodexConfigToml({}, {
    apiUrl: "https://gateway.example.test/v1",
    apiKey: fakeSecret,
    model: "test-model",
  });
  const checks = {
    unifiedGatewayConfigured: config.includes('model_provider = "ccm"') && config.includes('base_url = "https://gateway.example.test/v1"'),
    webSearchDisabled: config.includes('web_search = "disabled"'),
    secretUsesEnvironment: config.includes('env_key = "CCM_CODEX_API_KEY"'),
    secretNotPersisted: !config.includes(fakeSecret),
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}

function linkCodexAuth(runtimeHome: string, audit: RuntimeToolSyncAudit) {
  const source = path.join(os.homedir(), ".codex", "auth.json");
  const target = path.join(runtimeHome, "auth.json");
  if (!fs.existsSync(source)) {
    audit.warnings.push("未找到 ~/.codex/auth.json；Codex 需依赖环境变量或系统凭据完成认证");
    return;
  }
  try {
    if (fs.existsSync(target)) fs.unlinkSync(target);
    fs.linkSync(source, target);
  } catch (error: any) {
    try {
      fs.copyFileSync(source, target);
      try { fs.chmodSync(target, 0o600); } catch {}
      audit.warnings.push("Codex 认证文件无法硬链接，已回退为 CCM 中央私有目录副本；下次调用会重新同步");
    } catch (copyError: any) {
      audit.warnings.push(`Codex 认证同步失败：${copyError?.message || error?.message || String(copyError)}`);
    }
  }
}

function removeManagedCodexAuth(runtimeHome: string) {
  const target = path.join(runtimeHome, "auth.json");
  try {
    if (fs.existsSync(target)) fs.unlinkSync(target);
  } catch {}
}

export function syncRuntimeTools(workDir: string, agentType: string, allowedTools: any): RuntimeToolSyncAudit {
  const runtime = normalizeAgentRuntimeId(agentType);
  const nativeSupported = ["claudecode", "cursor", "gemini", "codex", "qoder"].includes(runtime);
  const requested = { mcp: uniqueNames(allowedTools?.mcp), skill: uniqueNames(allowedTools?.skill) };
  const audit: RuntimeToolSyncAudit = {
    runtime,
    mode: nativeSupported ? "native-and-proxy" : "ccm-proxy-only",
    nativeSupported,
    workDir: String(workDir || ""),
    requested,
    synced: { mcp: [], skill: [] },
    missing: { mcp: [], skill: [] },
    errors: [],
    warnings: [],
    timestamp: new Date().toISOString(),
  };

  const enabledMcp = new Map(loadMcpTools().filter(tool => tool?.enabled !== false).map(tool => [String(tool.name), tool]));
  const enabledSkills = new Map(loadSkills().filter(skill => skill?.enabled !== false).map(skill => [String(skill.name), skill]));
  const selectedMcp = requested.mcp.map(name => enabledMcp.get(name)).filter(Boolean) as any[];
  const selectedSkills = requested.skill.map(name => enabledSkills.get(name)).filter(Boolean) as any[];
  audit.missing.mcp = requested.mcp.filter(name => !enabledMcp.has(name));
  audit.missing.skill = requested.skill.filter(name => !enabledSkills.has(name));

  if (!nativeSupported) {
    audit.isolation = "proxy";
    return audit;
  }
  if (!workDir || !fs.existsSync(workDir) || !fs.statSync(workDir).isDirectory()) {
    audit.mode = "failed";
    audit.errors.push(`工作目录不存在或不可用: ${workDir || "<empty>"}`);
    return audit;
  }

  try {
    const codexGateway = runtime === "codex" ? loadCodexGatewayConfig() : null;
    const authorizationId = crypto.createHash("sha256")
      .update(JSON.stringify({
        runtime,
        requested,
        mcp: selectedMcp,
        skills: selectedSkills.map(skill => ({ name: skill.name, prompt: skill.prompt })),
        codexGateway: codexGateway ? { apiUrl: codexGateway.apiUrl, model: codexGateway.model } : null,
      }))
      .digest("hex")
      .slice(0, 16);
    const mcpServers: Record<string, any> = {};
    for (const tool of selectedMcp) {
      try {
        const serverName = `${CCM_MCP_PREFIX}${safeSlug(tool.name)}`;
        mcpServers[serverName] = toMcpServer(tool);
        audit.synced.mcp.push(tool.name);
      } catch (error: any) {
        audit.errors.push(`MCP ${tool.name}: ${error?.message || String(error)}`);
      }
    }

    if (runtime === "claudecode") {
      const runtimeRoot = path.join(CCM_DIR, "agent-runtime", "claudecode", authorizationId);
      const mcpConfigPath = path.join(runtimeRoot, `mcp-${authorizationId}.json`);
      const skillRoot = path.join(runtimeRoot, "skills");
      writeJsonAtomic(mcpConfigPath, { mcpServers });
      audit.mcpConfigPath = mcpConfigPath;
      audit.runtimeHomePath = runtimeRoot;
      audit.skillRoot = skillRoot;
      audit.configFormat = "claude-mcp-json";
      audit.isolation = "strict";
      syncManagedSkills(skillRoot, selectedSkills, audit);
      pruneManagedMcpSnapshots(runtimeRoot, mcpConfigPath);
    } else if (runtime === "codex") {
      const runtimeHome = path.join(CCM_DIR, "agent-runtime", "codex", authorizationId);
      const configPath = path.join(runtimeHome, "config.toml");
      const skillRoot = path.join(runtimeHome, "skills");
      fs.mkdirSync(runtimeHome, { recursive: true });
      fs.writeFileSync(configPath, buildCodexConfigToml(mcpServers, codexGateway), "utf-8");
      if (codexGateway) removeManagedCodexAuth(runtimeHome);
      else linkCodexAuth(runtimeHome, audit);
      audit.mcpConfigPath = configPath;
      audit.runtimeHomePath = runtimeHome;
      audit.skillRoot = skillRoot;
      audit.configFormat = "codex-home-toml";
      audit.isolation = "strict";
      syncManagedSkills(skillRoot, selectedSkills, audit);
    } else if (runtime === "cursor") {
      const runtimeRoot = path.join(CCM_DIR, "agent-runtime", "cursor", authorizationId);
      const configPath = path.join(runtimeRoot, "mcp.json");
      const skillRoot = path.join(runtimeRoot, "skills");
      fs.mkdirSync(runtimeRoot, { recursive: true });
      writeJsonAtomic(configPath, { mcpServers });
      audit.mcpConfigPath = configPath;
      audit.runtimeHomePath = runtimeRoot;
      audit.skillRoot = skillRoot;
      audit.configFormat = "cursor-isolated-json";
      audit.isolation = "proxy";
      audit.mode = "ccm-proxy-only";
      audit.warnings.push("Cursor Agent 当前无可靠严格 MCP 快照参数；CCM 已将配置写入隔离目录，不再写入项目 .cursor/，原生调用仅使用平台代理兜底");
      syncManagedSkills(skillRoot, selectedSkills, audit);
    } else {
      const runtimeSpec = runtime === "gemini"
          ? { root: ".gemini", config: "settings.json", skillDir: "skills", format: "gemini-project-settings" }
          : { root: ".qoder", config: "settings.local.json", skillDir: "skills", format: "qoder-local-settings" };
      const runtimeRoot = path.join(workDir, runtimeSpec.root);
      const configPath = path.join(runtimeRoot, runtimeSpec.config);
      const skillRoot = path.join(runtimeRoot, runtimeSpec.skillDir);
      const settings = readJsonObject(configPath);
      const existingServers = settings.mcpServers && typeof settings.mcpServers === "object" ? settings.mcpServers : {};
      settings.mcpServers = {
        ...Object.fromEntries(Object.entries(existingServers).filter(([name]) => !name.startsWith(CCM_MCP_PREFIX))),
        ...mcpServers,
      };
      if (runtime === "gemini") {
        settings.mcp = settings.mcp && typeof settings.mcp === "object" ? settings.mcp : {};
        settings.mcp.allowed = Object.keys(mcpServers);
        audit.isolation = "allowlist";
      } else {
        audit.isolation = "project-scope";
        audit.warnings.push(`${runtime} CLI 没有严格 MCP 快照参数；CCM 已同步项目级配置，仍保留平台代理作为权限兜底`);
      }
      if (runtime === "qoder") {
        settings.permissions = settings.permissions && typeof settings.permissions === "object" ? settings.permissions : {};
        const existingAllow = Array.isArray(settings.permissions.allow)
          ? settings.permissions.allow.filter((item: any) => !String(item || "").startsWith("mcp__ccm__"))
          : [];
        settings.permissions.allow = [...existingAllow, ...Object.keys(mcpServers).map(name => `mcp__${name}__*`)];
      }
      writeJsonAtomic(configPath, settings);
      audit.mcpConfigPath = configPath;
      audit.skillRoot = skillRoot;
      audit.configFormat = runtimeSpec.format;
      syncManagedSkills(skillRoot, selectedSkills, audit);
    }

    if (audit.errors.length) audit.mode = "failed";
  } catch (error: any) {
    audit.mode = "failed";
    audit.errors.push(error?.message || String(error));
  }
  return audit;
}
export function buildRuntimeToolSyncPrompt(audit: RuntimeToolSyncAudit) {
  const missing = [...audit.missing.mcp.map(name => `MCP:${name}`), ...audit.missing.skill.map(name => `Skill:${name}`)];
  if (audit.mode === "native-and-proxy") {
    const missingNotice = missing.length ? ` 未找到或未启用：${missing.join("、")}。` : "";
    const warningNotice = audit.warnings.length ? ` 运行提示：${audit.warnings.join("；")}。` : "";
    return `\n[CCM Runtime 工具同步]\n已将授权工具同步到 ${audit.runtime} 原生配置（隔离：${audit.isolation || "project-scope"}）：MCP ${audit.synced.mcp.length} 个，Skill ${audit.synced.skill.length} 个。${missingNotice}${warningNotice}CCM 平台代执行协议仍可作为后备。\n`;
  }
  if (audit.mode === "ccm-proxy-only") {
    return `\n[CCM Runtime 工具同步]\n当前 ${audit.runtime} 使用 CCM 平台代执行协议；仅可调用本提示中授权的 MCP/Skill，不得自行扩展权限。\n`;
  }
  return `\n[CCM Runtime 工具同步失败]\n原生工具配置未完成，请仅使用 CCM 平台代执行协议。${audit.errors.join("；")}${missing.length ? `；缺失：${missing.join("、")}` : ""}\n`;
}

export function recordRuntimeToolSyncAudit(audit: RuntimeToolSyncAudit, projectName = "", groupId = "") {
  try {
    const auditDir = path.join(CCM_DIR, "agent-runner");
    fs.mkdirSync(auditDir, { recursive: true });
    const auditFile = path.join(auditDir, "runtime-tool-sync.jsonl");
    if (fs.existsSync(auditFile) && fs.statSync(auditFile).size > 2 * 1024 * 1024) {
      const content = fs.readFileSync(auditFile, "utf-8");
      const tail = content.slice(-1024 * 1024);
      fs.writeFileSync(auditFile, tail.slice(Math.max(0, tail.indexOf("\n") + 1)), "utf-8");
    }
    fs.appendFileSync(auditFile, `${JSON.stringify({ ...audit, projectName, groupId })}\n`, "utf-8");
  } catch {
    // Runtime execution should not fail solely because audit persistence is unavailable.
  }
}
