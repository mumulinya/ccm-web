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
exports.toolManager = exports.ToolManager = void 0;
exports.runToolManagerRuntimeSelfTest = runToolManagerRuntimeSelfTest;
const mcp_client_1 = require("./mcp-client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const crypto = __importStar(require("crypto"));
const db_1 = require("../core/db");
const CCM_DIR = path.join(os.homedir(), ".cc-connect");
const MCP_DIR = path.join(CCM_DIR, "mcp");
const SKILLS_DIR = path.join(CCM_DIR, "skills");
const TOOL_AUDIT_DIR = path.join(CCM_DIR, "agent-runner");
const TOOL_PERMISSION_AUDIT_FILE = path.join(TOOL_AUDIT_DIR, "tool-permission-violations.jsonl");
const SKILL_INVOCATION_AUDIT_FILE = path.join(TOOL_AUDIT_DIR, "skill-invocations.jsonl");
function normalizeScopeList(value) {
    return Array.isArray(value) ? value.map(item => String(item || "").trim()).filter(Boolean) : [];
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
function safeSlug(value) {
    const slug = String(value || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    return slug || "tool";
}
function parseMcpGrant(value) {
    const raw = String(value || "").trim();
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
function serverMatches(grantServer, serverName) {
    return grantServer === serverName || safeSlug(grantServer) === safeSlug(serverName) || grantServer === `ccm__${safeSlug(serverName)}`;
}
function isMcpToolAllowed(scope, tool) {
    const grants = normalizeScopeList(scope?.mcp);
    if (!scope)
        return true;
    if (!grants.length)
        return false;
    return grants.some(raw => {
        if (raw === tool.name)
            return true;
        const grant = parseMcpGrant(raw);
        if (!serverMatches(grant.server, tool.serverName))
            return false;
        return !grant.tool || grant.tool === tool.name;
    });
}
function isSkillAllowed(scope, skillName) {
    const grants = normalizeScopeList(scope?.skill);
    if (!scope)
        return true;
    if (!grants.length)
        return false;
    return grants.includes(skillName) || grants.includes(`skill:${skillName}`) || grants.includes(`Skill:${skillName}`);
}
function mcpToolCandidates(tools, toolName) {
    const raw = String(toolName || "").trim();
    const grant = parseMcpGrant(raw);
    if (grant.server && grant.tool) {
        return tools.filter(tool => tool.name === grant.tool && serverMatches(grant.server, tool.serverName));
    }
    return tools.filter(tool => tool.name === raw);
}
function appendToolPermissionAudit(entry) {
    appendJsonlBounded(TOOL_PERMISSION_AUDIT_FILE, entry);
}
function appendSkillInvocationAudit(entry) {
    appendJsonlBounded(SKILL_INVOCATION_AUDIT_FILE, entry);
}
function cleanAuditContextText(value, max = 180) {
    return String(value || "").replace(/[\0\r\n\t]+/g, " ").trim().slice(0, max);
}
function auditContextFromScope(scope) {
    const ctx = scope?.auditContext || {};
    return {
        runtime: cleanAuditContextText(ctx.runtime, 80),
        project: cleanAuditContextText(ctx.project, 180),
        groupId: cleanAuditContextText(ctx.groupId, 180),
        taskId: cleanAuditContextText(ctx.taskId, 180),
        executionId: cleanAuditContextText(ctx.executionId, 180),
        source: cleanAuditContextText(ctx.source, 120),
    };
}
function auditMetaFromScope(scope) {
    const context = auditContextFromScope(scope);
    return {
        ...context,
        scope,
    };
}
function safeIsoDate(value) {
    if (value === undefined || value === null || value === "")
        return "";
    if (typeof value === "number") {
        const ms = value > 100000000000 ? value : value * 1000;
        const date = new Date(ms);
        return Number.isFinite(date.getTime()) ? date.toISOString() : "";
    }
    const numeric = Number(value);
    if (Number.isFinite(numeric) && String(value).trim().match(/^\d+$/))
        return safeIsoDate(numeric);
    const date = new Date(String(value));
    return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}
function flattenConfigSignals(value, prefix = "", rows = []) {
    if (!value || typeof value !== "object")
        return rows;
    for (const [key, item] of Object.entries(value)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        rows.push({ key: fullKey, value: item });
        if (item && typeof item === "object" && !Array.isArray(item))
            flattenConfigSignals(item, fullKey, rows);
    }
    return rows;
}
function parseEnv(envStr) {
    if (envStr && typeof envStr === "object" && !Array.isArray(envStr)) {
        return Object.fromEntries(Object.entries(envStr).map(([key, value]) => [key, String(value ?? "")]));
    }
    if (!envStr)
        return {};
    const env = {};
    for (const line of String(envStr).split(/\r?\n/)) {
        const idx = line.indexOf("=");
        if (idx > 0) {
            env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
        }
    }
    return env;
}
function deriveMcpAuthStatus(config = {}, diagnosticText = "", elicitationRequired = false) {
    const rows = flattenConfigSignals(config);
    const env = parseEnv(config?.env);
    const envRows = Object.entries(env).map(([key, value]) => ({ key: `env.${key}`, value }));
    const allRows = [...rows, ...envRows];
    const keyText = allRows.map(row => row.key).join(" ");
    const errorText = String(diagnosticText || "");
    const authError = /\b(401|403)\b|unauthorized|forbidden|invalid[_ -]?token|expired token|token expired|oauth|login required|authentication|consent|device code|authorization/i.test(errorText);
    const explicitAuth = config?.authRequired === true || config?.requiresAuth === true || !!config?.auth || !!config?.oauth || /(^|\.)auth|oauth|authorization/i.test(keyText);
    const secretRows = allRows.filter(row => /(authorization|access[_-]?token|api[_-]?key|token|client[_-]?secret|client[_-]?id)$/i.test(row.key) && String(row.value || "").trim());
    const refreshRows = allRows.filter(row => /(refresh[_-]?token|refreshToken|token_refresh|refresh)$/i.test(row.key) && String(row.value || "").trim());
    const expiresRow = allRows.find(row => /(expires[_-]?at|expiresAt|token_expiry|expires_on|expiration)$/i.test(row.key) && String(row.value || "").trim());
    const tokenExpiresAt = safeIsoDate(expiresRow?.value);
    const tokenExpired = !!tokenExpiresAt && new Date(tokenExpiresAt).getTime() <= Date.now();
    const authRequired = !!(explicitAuth || authError);
    const authConfigured = secretRows.length > 0 || !!config?.headers?.Authorization || !!config?.authorization;
    const refreshConfigured = refreshRows.length > 0 || !!config?.oauth?.refresh_token || !!config?.oauth?.refreshToken;
    const elicitation = !!(elicitationRequired || config?.elicitation === true || config?.auth?.elicitation === true || /consent|device code|browser login|interactive/i.test(errorText));
    const needsUserAuth = authRequired && (!authConfigured || tokenExpired || authError || elicitation);
    const detectedSignals = [
        explicitAuth ? "auth_config" : "",
        authError ? "auth_error" : "",
        authConfigured ? "credential_present" : "",
        refreshConfigured ? "refresh_configured" : "",
        tokenExpired ? "token_expired" : "",
        elicitation ? "elicitation_required" : "",
    ].filter(Boolean);
    const message = needsUserAuth
        ? tokenExpired
            ? (refreshConfigured ? "Token 已过期；检测到 refresh 配置，请刷新后重载 MCP。" : "Token 已过期且未检测到 refresh 配置，需要重新授权。")
            : !authConfigured
                ? "该 MCP 需要鉴权，但未检测到 token/API key/Authorization 配置。"
                : elicitation
                    ? "该 MCP 请求交互式授权/确认，CCM 已阻止无控制的 elicitation。"
                    : "MCP 返回鉴权失败，请检查凭据或重新授权。"
        : authConfigured
            ? "已检测到鉴权配置。"
            : "未检测到鉴权要求。";
    return { authRequired, authConfigured, tokenExpiresAt: tokenExpiresAt || undefined, tokenExpired, refreshConfigured, needsUserAuth, elicitationRequired: elicitation, message, detectedSignals };
}
function contentHash(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value || {})).digest("hex").slice(0, 16);
}
class ToolManager {
    clients = new Map(); // serverName -> client
    serverConfigs = new Map();
    serverStatuses = new Map();
    tools = [];
    skills = [];
    initialized = false;
    // 加载所有启用的 MCP 服务器和 Skills
    async loadTools() {
        for (const client of this.clients.values()) {
            try {
                client.disconnect();
            }
            catch { }
        }
        this.clients.clear();
        this.serverConfigs.clear();
        this.serverStatuses.clear();
        this.tools = [];
        // 加载 MCP 工具配置
        const mcpConfigs = this.loadMcpConfigs();
        for (const config of mcpConfigs) {
            if (!config.enabled || !config.command)
                continue;
            this.serverConfigs.set(config.name, config);
            const auth = deriveMcpAuthStatus(config);
            this.serverStatuses.set(config.name, {
                name: config.name,
                state: "pending",
                toolsCount: 0,
                retryCount: this.serverStatuses.get(config.name)?.retryCount || 0,
                auth,
            });
            if (auth.needsUserAuth && auth.authRequired && (!auth.authConfigured || auth.tokenExpired)) {
                this.serverStatuses.set(config.name, {
                    name: config.name,
                    state: "auth_required",
                    toolsCount: 0,
                    error: auth.message,
                    lastErrorAt: new Date().toISOString(),
                    retryCount: this.serverStatuses.get(config.name)?.retryCount || 0,
                    auth,
                });
                console.warn(`[ToolManager] MCP "${config.name}" 需要鉴权: ${auth.message}`);
                continue;
            }
            if (this.clients.has(config.name))
                continue;
            const client = new mcp_client_1.McpClient(config.command, this.parseArgs(config.args), this.parseEnv(config.env));
            const connected = await client.connect();
            if (connected) {
                this.clients.set(config.name, client);
                const serverTools = await client.listTools();
                for (const t of serverTools) {
                    this.tools.push({
                        name: t.name,
                        description: t.description || "",
                        serverName: config.name,
                        inputSchema: t.inputSchema,
                    });
                }
                this.serverStatuses.set(config.name, {
                    name: config.name,
                    state: "connected",
                    toolsCount: serverTools.length,
                    lastConnectedAt: new Date().toISOString(),
                    retryCount: this.serverStatuses.get(config.name)?.retryCount || 0,
                    auth: deriveMcpAuthStatus(config, "", client.getDiagnostics().elicitationRequired),
                });
                console.log(`[ToolManager] MCP "${config.name}" 已连接, ${serverTools.length} 个工具`);
            }
            else {
                const diagnostics = client.getDiagnostics();
                const failedAuth = deriveMcpAuthStatus(config, `${diagnostics.lastError}\n${diagnostics.stderr}`, diagnostics.elicitationRequired);
                this.serverStatuses.set(config.name, {
                    name: config.name,
                    state: failedAuth.needsUserAuth ? "auth_required" : "failed",
                    toolsCount: 0,
                    error: failedAuth.needsUserAuth ? failedAuth.message : (diagnostics.lastError || "连接失败"),
                    lastErrorAt: new Date().toISOString(),
                    retryCount: this.serverStatuses.get(config.name)?.retryCount || 0,
                    auth: failedAuth,
                });
                console.warn(`[ToolManager] MCP "${config.name}" 连接失败`);
            }
        }
        // 加载 Skills
        this.skills = this.loadSkillConfigs().filter(s => s.enabled);
        this.initialized = true;
    }
    // 生成工具 prompt 注入文本
    buildToolPrompt(scope) {
        if (!this.initialized)
            return "";
        const allowedSkills = scope ? new Set(normalizeScopeList(scope.skill)) : null;
        const mcpGrants = normalizeScopeList(scope?.mcp);
        const tools = scope
            ? this.tools.filter(tool => isMcpToolAllowed(scope, tool))
            : this.tools;
        const skills = allowedSkills
            ? this.skills.filter(skill => allowedSkills.has(skill.name))
            : this.skills;
        const parts = [];
        const missingMcp = scope
            ? mcpGrants.filter(name => {
                const grant = parseMcpGrant(name);
                if (!grant.server && !name)
                    return false;
                return !this.tools.some(tool => isMcpToolAllowed({ mcp: [name] }, tool));
            })
            : [];
        const missingSkills = allowedSkills
            ? Array.from(allowedSkills).filter(name => !skills.some(skill => skill.name === name))
            : [];
        // MCP 工具
        if (tools.length > 0) {
            parts.push("\n\n你可以使用以下工具：");
            for (const tool of tools) {
                let desc = `\n\n### 工具: ${tool.name}`;
                desc += `\n描述: ${tool.description}`;
                desc += `\n来源: ${tool.serverName}`;
                desc += `\n权限规则: mcp__ccm__${safeSlug(tool.serverName)}__${tool.name}`;
                if (tool.inputSchema?.properties) {
                    desc += `\n参数:`;
                    for (const [key, val] of Object.entries(tool.inputSchema.properties)) {
                        const prop = val;
                        const required = tool.inputSchema.required?.includes(key) ? " (必填)" : " (可选)";
                        desc += `\n  - ${key}: ${prop.description || prop.type || "any"}${required}`;
                    }
                }
                parts.push(desc);
            }
            parts.push(`\n\n调用工具的格式（严格遵守）：
<tool_call>
{"name": "工具名", "arguments": {"参数名": "参数值"}}
</tool_call>

注意：
- 每次只调用一个工具
- 工具调用必须用 <tool_call> 标签包裹
- 等待工具结果后再继续回复
- 如果不需要工具，直接回复即可`);
        }
        // Skills
        if (skills.length > 0) {
            parts.push("\n\n你可以使用以下 Skills（技能）：");
            for (const skill of skills) {
                parts.push(`\n- ${skill.name}: ${skill.description}（SkillTool: skill:${skill.name}，hash=${skill.contentHash || ""}）`);
                if (skill.prompt) {
                    parts.push(`  模板: ${skill.prompt}`);
                }
            }
            parts.push(`\n\n调用 SkillTool 的格式（严格遵守）：
<tool_call>
{"name": "invoke_skill", "arguments": {"name": "Skill 名称", "input": "本次要交给该 Skill 的任务或上下文"}}
</tool_call>

注意：
- SkillTool 也受当前 Agent 的 skill 授权范围限制
- 不得使用未授权或未列出的 Skill
- 成功调用 Skill 后，应在 CCM_AGENT_RECEIPT.memoryUsed 中写入 Skill:<name>`);
        }
        if (missingMcp.length > 0 || missingSkills.length > 0) {
            parts.push("\n\n已配置但当前未加载成功的工具：");
            if (missingMcp.length > 0) {
                const mcpDetails = missingMcp.map(name => {
                    const grant = parseMcpGrant(name);
                    const status = Array.from(this.serverStatuses.values()).find(item => serverMatches(grant.server, item.name));
                    return status?.auth?.needsUserAuth
                        ? `${name}（${status.state}: ${status.auth.message}）`
                        : status
                            ? `${name}（${status.state}${status.error ? `: ${status.error}` : ""}）`
                            : name;
                });
                parts.push(`\n- MCP 服务器：${mcpDetails.join(", ")}`);
            }
            if (missingSkills.length > 0)
                parts.push(`\n- Skills：${missingSkills.join(", ")}`);
            parts.push("\n如果任务依赖这些工具，请说明工具暂不可用，不要假装已经调用。");
        }
        return parts.join("");
    }
    buildScopeAudit(scope) {
        const grants = normalizeScopeList(scope?.mcp);
        const rows = grants.map(raw => {
            const grant = parseMcpGrant(raw);
            const serverTools = this.tools.filter(tool => serverMatches(grant.server, tool.serverName));
            const status = Array.from(this.serverStatuses.values()).find(item => serverMatches(grant.server, item.name));
            const matchedTools = grant.tool ? serverTools.filter(tool => tool.name === grant.tool) : serverTools;
            const state = !grant.server
                ? "invalid_grant"
                : status && status.state !== "connected"
                    ? status.state
                    : serverTools.length === 0
                        ? "missing_server"
                        : grant.tool && matchedTools.length === 0
                            ? "missing_tool"
                            : "available";
            return {
                raw,
                server: grant.server,
                tool: grant.tool,
                state,
                availableTools: serverTools.map(tool => tool.name).slice(0, 80),
                missingTools: grant.tool && matchedTools.length === 0 ? [grant.tool] : [],
                serverStatus: status || null,
            };
        });
        const skillGrants = normalizeScopeList(scope?.skill);
        const skillRows = skillGrants.map(name => {
            const skill = this.skills.find(item => item.name === name);
            return {
                name,
                state: skill ? "available" : "missing",
                description: skill?.description || "",
                contentHash: skill?.contentHash || "",
                toolName: skill ? `skill:${skill.name}` : "",
            };
        });
        return {
            mcp: rows,
            skills: skillRows,
            missing_mcp_tools: rows.filter(row => row.state === "missing_tool"),
            missing_mcp_servers: rows.filter(row => row.state === "missing_server" || row.state === "failed" || row.state === "disconnected" || row.state === "auth_required"),
            missing_skills: skillRows.filter(row => row.state === "missing"),
        };
    }
    discoverSkills(scope) {
        const skills = scope
            ? this.skills.filter(skill => isSkillAllowed(scope, skill.name))
            : this.skills;
        return skills.map(skill => ({
            name: skill.name,
            description: skill.description || "",
            enabled: skill.enabled !== false,
            contentHash: skill.contentHash || contentHash(skill),
            sourcePath: skill.sourcePath || "",
            toolName: `skill:${skill.name}`,
            invokeToolName: "invoke_skill",
        }));
    }
    getPostCompactDynamicToolCatalog(scope) {
        const tools = (scope ? this.tools.filter(tool => isMcpToolAllowed(scope, tool)) : this.tools)
            .map(tool => ({
            name: `mcp__ccm__${safeSlug(tool.serverName)}__${tool.name}`,
            description: String(tool.description || "").replace(/[\r\n\t]+/g, " ").trim(),
            server: tool.serverName,
            line: `${tool.name} (${tool.serverName}): ${String(tool.description || "").replace(/[\r\n\t]+/g, " ").trim() || "No description"}`,
        }))
            .sort((left, right) => left.name.localeCompare(right.name));
        const skills = (scope ? this.skills.filter(skill => isSkillAllowed(scope, skill.name)) : this.skills)
            .map(skill => ({
            name: `skill:${skill.name}`,
            description: String(skill.description || "").replace(/[\r\n\t]+/g, " ").trim(),
            contentHash: String(skill.contentHash || contentHash(skill)),
            line: `skill:${skill.name}: ${String(skill.description || "").replace(/[\r\n\t]+/g, " ").trim() || "No description"}`,
        }))
            .sort((left, right) => left.name.localeCompare(right.name));
        const allowedServers = new Set(tools.map(tool => tool.server));
        for (const raw of normalizeScopeList(scope?.mcp)) {
            const grant = parseMcpGrant(raw);
            if (grant.server)
                allowedServers.add(grant.server);
        }
        const mcpInstructions = Array.from(this.clients.entries())
            .filter(([name, client]) => client.isConnected() && (!scope || [...allowedServers].some(server => serverMatches(server, name))))
            .map(([name, client]) => {
            const instructions = String(client.getServerInstructions?.() || "").trim();
            return { name, instructions, block: instructions ? `## ${name}\n${instructions}` : "" };
        })
            .filter(item => !!item.instructions)
            .sort((left, right) => left.name.localeCompare(right.name));
        return { tools, skills, mcpInstructions };
    }
    invokeSkill(name, input = "", scope) {
        const skillName = String(name || "").replace(/^Skill\s*[:：]\s*/i, "").replace(/^skill:/i, "").trim();
        const skill = this.skills.find(item => item.name === skillName && item.enabled !== false);
        if (!skill) {
            appendSkillInvocationAudit({ type: "skill_missing", skill: skillName, ...auditMetaFromScope(scope) });
            return {
                ok: false,
                name: skillName,
                error: `Skill "${skillName}" 不存在或未启用`,
                invokedAt: new Date().toISOString(),
            };
        }
        if (scope && !isSkillAllowed(scope, skill.name)) {
            appendSkillInvocationAudit({ type: "skill_unauthorized", skill: skill.name, contentHash: skill.contentHash, ...auditMetaFromScope(scope) });
            return {
                ok: false,
                name: skill.name,
                contentHash: skill.contentHash || contentHash(skill),
                error: `Skill "${skill.name}" 未授权给当前 Agent 使用`,
                invokedAt: new Date().toISOString(),
            };
        }
        const inputText = typeof input === "string" ? input : JSON.stringify(input ?? {});
        const prompt = String(skill.prompt || "").trim();
        const renderedPrompt = prompt.includes("{{input}}") || prompt.includes("${input}")
            ? prompt.replace(/\{\{\s*input\s*\}\}/g, inputText).replace(/\$\{\s*input\s*\}/g, inputText)
            : `${prompt}${prompt ? "\n\n" : ""}[SkillTool 输入]\n${inputText}`;
        const result = {
            ok: true,
            name: skill.name,
            description: skill.description || "",
            contentHash: skill.contentHash || contentHash(skill),
            prompt,
            renderedPrompt,
            input: inputText,
            invokedAt: new Date().toISOString(),
            auditFile: SKILL_INVOCATION_AUDIT_FILE,
        };
        appendSkillInvocationAudit({ type: "skill_invoked", skill: skill.name, contentHash: result.contentHash, inputBytes: Buffer.byteLength(inputText, "utf-8"), ...auditMetaFromScope(scope) });
        return result;
    }
    parseSkillToolCall(toolName, args) {
        const raw = String(toolName || "").trim();
        if (/^(invoke_skill|skilltool|skill)$/i.test(raw)) {
            return { name: String(args?.name || args?.skill || args?.skillName || "").trim(), input: args?.input ?? args?.arguments ?? args?.context ?? "" };
        }
        const colon = raw.match(/^Skill\s*[:：]\s*(.+)$/i) || raw.match(/^skill:(.+)$/i);
        if (colon)
            return { name: colon[1].trim(), input: args?.input ?? args ?? "" };
        const double = raw.match(/^skill__(.+)$/i);
        if (double)
            return { name: double[1].trim(), input: args?.input ?? args ?? "" };
        return null;
    }
    async reconnectServer(serverName) {
        const config = this.serverConfigs.get(serverName) || this.loadMcpConfigs().find(item => item?.name === serverName);
        if (!config?.enabled || !config?.command) {
            const auth = deriveMcpAuthStatus(config || {});
            this.serverStatuses.set(serverName, {
                name: serverName,
                state: "failed",
                toolsCount: 0,
                error: "MCP 配置不存在或未启用",
                lastErrorAt: new Date().toISOString(),
                retryCount: Number(this.serverStatuses.get(serverName)?.retryCount || 0) + 1,
                auth,
            });
            return false;
        }
        const auth = deriveMcpAuthStatus(config);
        if (auth.needsUserAuth && auth.authRequired && (!auth.authConfigured || auth.tokenExpired)) {
            this.serverStatuses.set(serverName, {
                name: serverName,
                state: "auth_required",
                toolsCount: 0,
                error: auth.message,
                lastErrorAt: new Date().toISOString(),
                retryCount: Number(this.serverStatuses.get(serverName)?.retryCount || 0) + 1,
                auth,
            });
            return false;
        }
        const previous = this.clients.get(serverName);
        try {
            previous?.disconnect();
        }
        catch { }
        const retryCount = Number(this.serverStatuses.get(serverName)?.retryCount || 0) + 1;
        const client = new mcp_client_1.McpClient(config.command, this.parseArgs(config.args), this.parseEnv(config.env));
        const connected = await client.connect();
        if (!connected) {
            const diagnostics = client.getDiagnostics();
            const failedAuth = deriveMcpAuthStatus(config, `${diagnostics.lastError}\n${diagnostics.stderr}`, diagnostics.elicitationRequired);
            this.clients.delete(serverName);
            this.tools = this.tools.filter(tool => tool.serverName !== serverName);
            this.serverStatuses.set(serverName, {
                name: serverName,
                state: failedAuth.needsUserAuth ? "auth_required" : "failed",
                toolsCount: 0,
                error: failedAuth.needsUserAuth ? failedAuth.message : (diagnostics.lastError || "重连失败"),
                lastErrorAt: new Date().toISOString(),
                retryCount,
                auth: failedAuth,
            });
            return false;
        }
        const serverTools = await client.listTools();
        this.clients.set(serverName, client);
        this.tools = [
            ...this.tools.filter(tool => tool.serverName !== serverName),
            ...serverTools.map((t) => ({
                name: t.name,
                description: t.description || "",
                serverName,
                inputSchema: t.inputSchema,
            })),
        ];
        this.serverStatuses.set(serverName, {
            name: serverName,
            state: "connected",
            toolsCount: serverTools.length,
            lastConnectedAt: new Date().toISOString(),
            retryCount,
            auth: deriveMcpAuthStatus(config, "", client.getDiagnostics().elicitationRequired),
        });
        return true;
    }
    // 解析 Agent 输出中的工具调用
    parseToolCalls(text) {
        const calls = [];
        const regex = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            try {
                const parsed = JSON.parse(match[1]);
                if (parsed.name) {
                    calls.push({ name: parsed.name, arguments: parsed.arguments || {} });
                }
            }
            catch { }
        }
        return calls;
    }
    // 执行工具调用
    async executeToolCall(toolName, args, scope) {
        const skillCall = this.parseSkillToolCall(toolName, args);
        if (skillCall) {
            const result = this.invokeSkill(skillCall.name, skillCall.input, scope);
            return JSON.stringify({ skillTool: result }, null, 2);
        }
        const candidates = mcpToolCandidates(this.tools, toolName);
        const tool = scope
            ? candidates.find(candidate => isMcpToolAllowed(scope, candidate)) || candidates[0]
            : candidates[0];
        if (!tool) {
            return `[错误] 工具 "${toolName}" 不存在`;
        }
        if (scope && !isMcpToolAllowed(scope, tool)) {
            appendToolPermissionAudit({
                type: "mcp_unauthorized_tool_call",
                tool: toolName,
                server: tool.serverName,
                rule: "ToolManager.isMcpToolAllowed",
                ...auditMetaFromScope(scope),
            });
            return `[错误] 工具 "${toolName}" 未授权给当前 Agent 使用`;
        }
        let client = this.clients.get(tool.serverName);
        if (!client || !client.isConnected()) {
            const reconnected = await this.reconnectServer(tool.serverName);
            client = this.clients.get(tool.serverName);
            if (!reconnected || !client || !client.isConnected())
                return `[错误] MCP 服务器 "${tool.serverName}" 未连接，自动重连失败`;
        }
        const result = await client.callTool(tool.name, args);
        if (result.isError) {
            const errorText = result.content.map(c => c.text).join("\n");
            const diagnostics = client.getDiagnostics();
            const auth = deriveMcpAuthStatus(this.serverConfigs.get(tool.serverName) || {}, `${errorText}\n${diagnostics.lastError}\n${diagnostics.stderr}`, diagnostics.elicitationRequired);
            if (auth.needsUserAuth) {
                const previous = this.serverStatuses.get(tool.serverName);
                this.serverStatuses.set(tool.serverName, {
                    name: tool.serverName,
                    state: "auth_required",
                    toolsCount: previous?.toolsCount || this.tools.filter(t => t.serverName === tool.serverName).length,
                    error: auth.message,
                    lastErrorAt: new Date().toISOString(),
                    retryCount: previous?.retryCount || 0,
                    auth,
                });
            }
            return `[工具错误] ${errorText}`;
        }
        return result.content.map(c => c.text).join("\n");
    }
    // 获取所有工具列表（用于 API）
    getToolList() {
        return {
            mcp: this.tools.map(t => ({
                name: t.name,
                description: t.description,
                server: t.serverName,
                schema: t.inputSchema,
            })),
            skills: this.skills,
            skillTools: this.discoverSkills(),
            skillAuditFile: SKILL_INVOCATION_AUDIT_FILE,
            servers: Array.from(new Set([...Array.from(this.serverStatuses.keys()), ...Array.from(this.clients.keys())])).map((name) => {
                const client = this.clients.get(name);
                const status = this.serverStatuses.get(name);
                return {
                    name,
                    connected: !!client?.isConnected(),
                    toolsCount: this.tools.filter(t => t.serverName === name).length,
                    state: client?.isConnected() ? "connected" : status?.state || "disconnected",
                    error: status?.error || "",
                    lastConnectedAt: status?.lastConnectedAt || "",
                    lastErrorAt: status?.lastErrorAt || "",
                    retryCount: status?.retryCount || 0,
                    instructions: client?.isConnected() ? String(client.getServerInstructions?.() || "") : "",
                    auth: status?.auth || deriveMcpAuthStatus(this.serverConfigs.get(name) || {}),
                };
            }),
        };
    }
    // 测试 MCP 连接
    async testConnection(command, env, args = []) {
        const auth = deriveMcpAuthStatus({ command, args, env });
        if (auth.needsUserAuth && auth.authRequired && (!auth.authConfigured || auth.tokenExpired)) {
            return { success: false, tools: [], error: auth.message, auth };
        }
        const client = new mcp_client_1.McpClient(command, this.parseArgs(args), this.parseEnv(env));
        const connected = await client.connect();
        if (!connected) {
            const diagnostics = client.getDiagnostics();
            const failedAuth = deriveMcpAuthStatus({ command, args, env }, `${diagnostics.lastError}\n${diagnostics.stderr}`, diagnostics.elicitationRequired);
            return { success: false, tools: [], error: failedAuth.needsUserAuth ? failedAuth.message : (diagnostics.lastError || "连接失败"), auth: failedAuth };
        }
        const tools = await client.listTools();
        const connectedAuth = deriveMcpAuthStatus({ command, args, env }, "", client.getDiagnostics().elicitationRequired);
        client.disconnect();
        return { success: true, tools: tools.map(t => t.name), auth: connectedAuth };
    }
    // 关闭所有连接
    disconnect() {
        for (const [, client] of this.clients) {
            client.disconnect();
        }
        this.clients.clear();
        for (const [name, status] of this.serverStatuses.entries()) {
            this.serverStatuses.set(name, { ...status, state: "disconnected", toolsCount: 0 });
        }
        this.tools = [];
        this.initialized = false;
    }
    loadMcpConfigs() {
        return (0, db_1.loadMcpTools)();
    }
    loadSkillConfigs() {
        return (0, db_1.loadSkills)().map(parsed => ({
            ...parsed,
            sourcePath: parsed.packagePath && fs.existsSync(path.join(parsed.packagePath, "SKILL.md"))
                ? path.join(parsed.packagePath, "SKILL.md")
                : parsed.filename ? path.join(SKILLS_DIR, parsed.filename) : "",
            contentHash: parsed.contentHash || contentHash({
                name: parsed.name,
                description: parsed.description || "",
                prompt: parsed.prompt || "",
                enabled: parsed.enabled !== false,
            }),
        }));
    }
    parseEnv(value) {
        return parseEnv(value);
    }
    parseArgs(args) {
        if (Array.isArray(args))
            return args.map(String).filter(Boolean);
        if (typeof args !== "string" || !args.trim())
            return [];
        return args.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(p => p.replace(/^"|"$/g, "")) || [];
    }
}
exports.ToolManager = ToolManager;
// 单例
exports.toolManager = new ToolManager();
async function runToolManagerRuntimeSelfTest() {
    const manager = new ToolManager();
    manager.initialized = true;
    manager.tools = [
        { name: "createInvoice", description: "create", serverName: "payments", inputSchema: {} },
    ];
    manager.skills = [{ name: "release-notes", description: "notes", prompt: "Write release notes for {{input}}", enabled: true, contentHash: "skillhash1" }];
    manager.serverStatuses = new Map([
        ["payments", { name: "payments", state: "connected", toolsCount: 1, retryCount: 0 }],
        ["github", {
                name: "github",
                state: "auth_required",
                toolsCount: 0,
                retryCount: 1,
                auth: deriveMcpAuthStatus({ name: "github", auth: { type: "oauth", expires_at: "2001-01-01T00:00:00.000Z" } }, "401 unauthorized"),
            }],
    ]);
    manager.clients = new Map([["payments", {
                isConnected: () => true,
                callTool: async (name, args) => ({ isError: false, content: [{ text: `called:${name}:${args.id}` }] }),
                getDiagnostics: () => ({ lastError: "", stderr: "", elicitationRequired: false }),
            }]]);
    const audit = manager.buildScopeAudit({ mcp: ["payments/createInvoice", "payments/deleteInvoice"], skill: ["release-notes", "missing-skill"] });
    const nativeRuleAudit = manager.buildScopeAudit({ mcp: ["mcp__ccm__payments__createInvoice"], skill: [] });
    const prompt = manager.buildToolPrompt({ mcp: ["payments/createInvoice"], skill: ["release-notes"] });
    const discovered = manager.discoverSkills({ skill: ["release-notes"] });
    const invoked = manager.invokeSkill("release-notes", "v1.2.3", { skill: ["release-notes"] });
    const auditContextTaskId = `tool-manager-context-${Date.now()}`;
    manager.invokeSkill("release-notes", "context-check", {
        skill: ["release-notes"],
        auditContext: {
            runtime: "codex",
            project: "context-project",
            groupId: "context-group",
            taskId: auditContextTaskId,
            executionId: "context-exec",
            source: "selftest",
        },
    });
    const skillAuditRows = fs.existsSync(SKILL_INVOCATION_AUDIT_FILE)
        ? fs.readFileSync(SKILL_INVOCATION_AUDIT_FILE, "utf-8").split(/\r?\n/).filter(Boolean).slice(-40).map(line => {
            try {
                return JSON.parse(line);
            }
            catch {
                return null;
            }
        }).filter(Boolean)
        : [];
    const contextAudit = skillAuditRows.find((row) => row.taskId === auditContextTaskId);
    const invokedViaTool = manager.parseSkillToolCall("invoke_skill", { name: "release-notes", input: "v1.2.3" });
    const denied = manager.invokeSkill("release-notes", "v1.2.3", { skill: ["other-skill"] });
    const deniedByEmptyScope = manager.invokeSkill("release-notes", "v1.2.3", { mcp: [], skill: [] });
    const emptyScopePrompt = manager.buildToolPrompt({ mcp: [], skill: [] });
    const authStatus = manager.getToolList().servers.find((server) => server.name === "github")?.auth;
    const nativeAliasExecuted = await manager.executeToolCall("mcp__ccm__payments__createInvoice", { id: 7 }, { mcp: ["mcp__ccm__payments__createInvoice"] });
    const nativeAliasDenied = await manager.executeToolCall("mcp__ccm__payments__createInvoice", { id: 7 }, { mcp: ["payments/deleteInvoice"] });
    const reloadFlags = { staleClientDisconnected: false };
    const reloadManager = new ToolManager();
    reloadManager.clients = new Map([["stale-server", {
                isConnected: () => true,
                disconnect: () => { reloadFlags.staleClientDisconnected = true; },
            }]]);
    reloadManager.serverConfigs = new Map([["stale-server", { name: "stale-server" }]]);
    reloadManager.serverStatuses = new Map([["stale-server", { name: "stale-server", state: "connected", toolsCount: 1 }]]);
    reloadManager.loadMcpConfigs = () => [];
    reloadManager.loadSkillConfigs = () => [{ name: "fresh-skill", description: "fresh", prompt: "Fresh prompt", enabled: true, contentHash: "freshhash" }];
    await reloadManager.loadTools();
    const reloadList = reloadManager.getToolList();
    const checks = {
        detectsMissingTool: audit.missing_mcp_tools.length === 1 && audit.missing_mcp_tools[0].missingTools.includes("deleteInvoice"),
        nativeStyleMcpGrantParsesAsAvailable: nativeRuleAudit.mcp[0]?.state === "available"
            && nativeRuleAudit.mcp[0]?.server === "ccm__payments"
            && nativeRuleAudit.mcp[0]?.tool === "createInvoice",
        detectsMissingSkill: audit.missing_skills.length === 1 && audit.missing_skills[0].name === "missing-skill",
        promptOnlyShowsAuthorizedTool: prompt.includes("createInvoice") && !prompt.includes("deleteInvoice"),
        promptShowsSkillToolProtocol: prompt.includes('"name": "invoke_skill"') && prompt.includes("skill:release-notes"),
        discoversAuthorizedSkillTool: discovered.length === 1 && discovered[0].toolName === "skill:release-notes",
        invokesAuthorizedSkillTool: invoked.ok === true && invoked.renderedPrompt.includes("v1.2.3") && !!invoked.contentHash,
        skillInvocationAuditCarriesContext: contextAudit?.runtime === "codex"
            && contextAudit?.project === "context-project"
            && contextAudit?.groupId === "context-group"
            && contextAudit?.executionId === "context-exec"
            && contextAudit?.source === "selftest",
        parsesInvokeSkillToolCall: invokedViaTool?.name === "release-notes",
        executesNativeStyleMcpToolName: nativeAliasExecuted === "called:createInvoice:7",
        rejectsUnauthorizedNativeStyleMcpToolName: /^\[错误\].*未授权/.test(nativeAliasDenied),
        rejectsUnauthorizedSkillTool: denied.ok === false && /未授权/.test(denied.error),
        emptyScopeDeniesAllTools: !emptyScopePrompt.includes("createInvoice") && !emptyScopePrompt.includes("release-notes") && deniedByEmptyScope.ok === false,
        detectsMcpAuthRequired: authStatus?.needsUserAuth === true && authStatus?.tokenExpired === true,
        reloadDisconnectsStaleClient: reloadFlags.staleClientDisconnected === true,
        reloadClearsStaleMcpStatus: !reloadList.servers.some((server) => server.name === "stale-server"),
        reloadRefreshesSkillCatalog: reloadList.skillTools.some((skill) => skill.name === "fresh-skill"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, audit, discovered, invoked, denied, authStatus };
}
//# sourceMappingURL=tool-manager.js.map