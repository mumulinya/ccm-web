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
exports.getRuntimeExecutionEnv = getRuntimeExecutionEnv;
exports.runRuntimeToolSyncSelfTest = runRuntimeToolSyncSelfTest;
exports.syncRuntimeTools = syncRuntimeTools;
exports.buildRuntimeToolSyncPrompt = buildRuntimeToolSyncPrompt;
exports.recordRuntimeToolSyncAudit = recordRuntimeToolSyncAudit;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const db_1 = require("./db");
const agent_runtime_1 = require("./agent-runtime");
const utils_1 = require("./utils");
const group_orchestrator_1 = require("./modules/group-orchestrator");
const CCM_MCP_PREFIX = "ccm__";
const CCM_SKILL_MARKER = ".ccm-managed.json";
function uniqueNames(value) {
    if (!Array.isArray(value))
        return [];
    return Array.from(new Set(value.map(item => String(item || "").trim()).filter(Boolean)));
}
function tokenizeCommand(commandLine) {
    const tokens = [];
    let current = "";
    let quote = "";
    for (let index = 0; index < commandLine.length; index += 1) {
        const char = commandLine[index];
        if (quote) {
            if (char === quote)
                quote = "";
            else if (char === "\\" && commandLine[index + 1] === quote)
                current += commandLine[++index];
            else
                current += char;
            continue;
        }
        if (char === "\"" || char === "'") {
            quote = char;
        }
        else if (/\s/.test(char)) {
            if (current)
                tokens.push(current);
            current = "";
        }
        else {
            current += char;
        }
    }
    if (current)
        tokens.push(current);
    return tokens;
}
function parseEnvironment(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item ?? "")]));
    }
    const env = {};
    String(value || "").split(/\r?\n/).forEach(line => {
        const separator = line.indexOf("=");
        if (separator <= 0)
            return;
        const key = line.slice(0, separator).trim();
        if (key)
            env[key] = line.slice(separator + 1).trim();
    });
    return env;
}
function toMcpServer(tool) {
    const url = String(tool?.url || "").trim();
    if (url)
        return { url, ...(tool?.headers && typeof tool.headers === "object" ? { headers: tool.headers } : {}) };
    const configuredArgs = Array.isArray(tool?.args) ? tool.args.map((item) => String(item)) : [];
    const commandParts = tokenizeCommand(String(tool?.command || "").trim());
    const command = commandParts.shift() || "";
    if (!command)
        throw new Error("缺少 command");
    const server = { command, args: [...commandParts, ...configuredArgs] };
    const env = parseEnvironment(tool?.env);
    if (Object.keys(env).length)
        server.env = env;
    return server;
}
function safeSlug(value) {
    const slug = String(value || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    return slug || "tool";
}
function readJsonObject(file) {
    if (!fs.existsSync(file))
        return {};
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error(`${file} 必须是 JSON 对象`);
    return parsed;
}
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.ccm-${process.pid}-${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function syncManagedSkills(skillRoot, skills, audit) {
    fs.mkdirSync(skillRoot, { recursive: true });
    const desired = new Set();
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
        if (!entry.isDirectory() || desired.has(entry.name))
            continue;
        const directory = path.join(skillRoot, entry.name);
        if (fs.existsSync(path.join(directory, CCM_SKILL_MARKER)))
            fs.rmSync(directory, { recursive: true, force: true });
    }
}
function pruneManagedMcpSnapshots(runtimeRoot, keepFile) {
    const staleConfigs = fs.readdirSync(runtimeRoot, { withFileTypes: true })
        .filter(entry => entry.isFile() && /^mcp-[a-f0-9]{16}\.json$/.test(entry.name) && path.join(runtimeRoot, entry.name) !== keepFile)
        .map(entry => ({ file: path.join(runtimeRoot, entry.name), mtime: fs.statSync(path.join(runtimeRoot, entry.name)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)
        .slice(20);
    for (const stale of staleConfigs)
        fs.unlinkSync(stale.file);
}
function tomlString(value) {
    return JSON.stringify(String(value ?? ""));
}
function loadCodexGatewayConfig() {
    const config = (0, group_orchestrator_1.loadOrchestratorConfig)();
    const format = String(config?.format || "").trim().toLowerCase();
    const apiUrl = String(config?.apiUrl || "").trim().replace(/\/+$/, "");
    const apiKey = String(config?.apiKey || "").trim();
    const model = String(config?.model || "").trim();
    if (config?.enabled === false || !["openai-compatible", "auto"].includes(format) || !apiUrl || !apiKey || !model)
        return null;
    return { apiUrl, apiKey, model };
}
function getRuntimeExecutionEnv(agentType) {
    if ((0, agent_runtime_1.normalizeAgentRuntimeId)(agentType) !== "codex")
        return {};
    const gateway = loadCodexGatewayConfig();
    return gateway ? { CCM_CODEX_API_KEY: gateway.apiKey } : {};
}
function buildCodexConfigToml(mcpServers, gateway) {
    const lines = ["# Managed by CCM. This CODEX_HOME contains only tools authorized for this invocation.", ""];
    if (gateway) {
        lines.push(`model_provider = ${tomlString("ccm")}`, `model = ${tomlString(gateway.model)}`, `web_search = ${tomlString("disabled")}`, "", "[model_providers.ccm]", `name = ${tomlString("CCM Unified Gateway")}`, `base_url = ${tomlString(gateway.apiUrl)}`, `env_key = ${tomlString("CCM_CODEX_API_KEY")}`, `wire_api = ${tomlString("responses")}`, "requires_openai_auth = false", "");
    }
    for (const [name, server] of Object.entries(mcpServers)) {
        lines.push(`[mcp_servers.${tomlString(name)}]`);
        if (server.url) {
            lines.push(`url = ${tomlString(server.url)}`);
        }
        else {
            lines.push(`command = ${tomlString(server.command)}`);
            lines.push(`args = [${(server.args || []).map((item) => tomlString(item)).join(", ")}]`);
        }
        if (server.env && Object.keys(server.env).length) {
            lines.push("", `[mcp_servers.${tomlString(name)}.env]`);
            for (const [key, value] of Object.entries(server.env))
                lines.push(`${tomlString(key)} = ${tomlString(value)}`);
        }
        lines.push("");
    }
    return lines.join("\n");
}
function runRuntimeToolSyncSelfTest() {
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
function linkCodexAuth(runtimeHome, audit) {
    const source = path.join(os.homedir(), ".codex", "auth.json");
    const target = path.join(runtimeHome, "auth.json");
    if (!fs.existsSync(source)) {
        audit.warnings.push("未找到 ~/.codex/auth.json；Codex 需依赖环境变量或系统凭据完成认证");
        return;
    }
    try {
        if (fs.existsSync(target))
            fs.unlinkSync(target);
        fs.linkSync(source, target);
    }
    catch (error) {
        try {
            fs.copyFileSync(source, target);
            try {
                fs.chmodSync(target, 0o600);
            }
            catch { }
            audit.warnings.push("Codex 认证文件无法硬链接，已回退为 CCM 中央私有目录副本；下次调用会重新同步");
        }
        catch (copyError) {
            audit.warnings.push(`Codex 认证同步失败：${copyError?.message || error?.message || String(copyError)}`);
        }
    }
}
function removeManagedCodexAuth(runtimeHome) {
    const target = path.join(runtimeHome, "auth.json");
    try {
        if (fs.existsSync(target))
            fs.unlinkSync(target);
    }
    catch { }
}
function syncRuntimeTools(workDir, agentType, allowedTools) {
    const runtime = (0, agent_runtime_1.normalizeAgentRuntimeId)(agentType);
    const nativeSupported = ["claudecode", "cursor", "gemini", "codex", "qoder"].includes(runtime);
    const requested = { mcp: uniqueNames(allowedTools?.mcp), skill: uniqueNames(allowedTools?.skill) };
    const audit = {
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
    const enabledMcp = new Map((0, db_1.loadMcpTools)().filter(tool => tool?.enabled !== false).map(tool => [String(tool.name), tool]));
    const enabledSkills = new Map((0, db_1.loadSkills)().filter(skill => skill?.enabled !== false).map(skill => [String(skill.name), skill]));
    const selectedMcp = requested.mcp.map(name => enabledMcp.get(name)).filter(Boolean);
    const selectedSkills = requested.skill.map(name => enabledSkills.get(name)).filter(Boolean);
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
        const mcpServers = {};
        for (const tool of selectedMcp) {
            try {
                const serverName = `${CCM_MCP_PREFIX}${safeSlug(tool.name)}`;
                mcpServers[serverName] = toMcpServer(tool);
                audit.synced.mcp.push(tool.name);
            }
            catch (error) {
                audit.errors.push(`MCP ${tool.name}: ${error?.message || String(error)}`);
            }
        }
        if (runtime === "claudecode") {
            const runtimeRoot = path.join(utils_1.CCM_DIR, "agent-runtime", "claudecode", authorizationId);
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
        }
        else if (runtime === "codex") {
            const runtimeHome = path.join(utils_1.CCM_DIR, "agent-runtime", "codex", authorizationId);
            const configPath = path.join(runtimeHome, "config.toml");
            const skillRoot = path.join(runtimeHome, "skills");
            fs.mkdirSync(runtimeHome, { recursive: true });
            fs.writeFileSync(configPath, buildCodexConfigToml(mcpServers, codexGateway), "utf-8");
            if (codexGateway)
                removeManagedCodexAuth(runtimeHome);
            else
                linkCodexAuth(runtimeHome, audit);
            audit.mcpConfigPath = configPath;
            audit.runtimeHomePath = runtimeHome;
            audit.skillRoot = skillRoot;
            audit.configFormat = "codex-home-toml";
            audit.isolation = "strict";
            syncManagedSkills(skillRoot, selectedSkills, audit);
        }
        else if (runtime === "cursor") {
            const runtimeRoot = path.join(utils_1.CCM_DIR, "agent-runtime", "cursor", authorizationId);
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
        }
        else {
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
            }
            else {
                audit.isolation = "project-scope";
                audit.warnings.push(`${runtime} CLI 没有严格 MCP 快照参数；CCM 已同步项目级配置，仍保留平台代理作为权限兜底`);
            }
            if (runtime === "qoder") {
                settings.permissions = settings.permissions && typeof settings.permissions === "object" ? settings.permissions : {};
                const existingAllow = Array.isArray(settings.permissions.allow)
                    ? settings.permissions.allow.filter((item) => !String(item || "").startsWith("mcp__ccm__"))
                    : [];
                settings.permissions.allow = [...existingAllow, ...Object.keys(mcpServers).map(name => `mcp__${name}__*`)];
            }
            writeJsonAtomic(configPath, settings);
            audit.mcpConfigPath = configPath;
            audit.skillRoot = skillRoot;
            audit.configFormat = runtimeSpec.format;
            syncManagedSkills(skillRoot, selectedSkills, audit);
        }
        if (audit.errors.length)
            audit.mode = "failed";
    }
    catch (error) {
        audit.mode = "failed";
        audit.errors.push(error?.message || String(error));
    }
    return audit;
}
function buildRuntimeToolSyncPrompt(audit) {
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
function recordRuntimeToolSyncAudit(audit, projectName = "", groupId = "") {
    try {
        const auditDir = path.join(utils_1.CCM_DIR, "agent-runner");
        fs.mkdirSync(auditDir, { recursive: true });
        const auditFile = path.join(auditDir, "runtime-tool-sync.jsonl");
        if (fs.existsSync(auditFile) && fs.statSync(auditFile).size > 2 * 1024 * 1024) {
            const content = fs.readFileSync(auditFile, "utf-8");
            const tail = content.slice(-1024 * 1024);
            fs.writeFileSync(auditFile, tail.slice(Math.max(0, tail.indexOf("\n") + 1)), "utf-8");
        }
        fs.appendFileSync(auditFile, `${JSON.stringify({ ...audit, projectName, groupId })}\n`, "utf-8");
    }
    catch {
        // Runtime execution should not fail solely because audit persistence is unavailable.
    }
}
//# sourceMappingURL=runtime-tool-sync.js.map