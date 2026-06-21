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
const mcp_client_1 = require("./mcp-client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const CCM_DIR = path.join(os.homedir(), ".cc-connect");
const MCP_DIR = path.join(CCM_DIR, "mcp");
const SKILLS_DIR = path.join(CCM_DIR, "skills");
function normalizeScopeList(value) {
    return Array.isArray(value) ? value.map(item => String(item || "").trim()).filter(Boolean) : [];
}
class ToolManager {
    clients = new Map(); // serverName -> client
    tools = [];
    skills = [];
    initialized = false;
    // 加载所有启用的 MCP 服务器和 Skills
    async loadTools() {
        this.tools = [];
        // 加载 MCP 工具配置
        const mcpConfigs = this.loadMcpConfigs();
        for (const config of mcpConfigs) {
            if (!config.enabled || !config.command)
                continue;
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
                console.log(`[ToolManager] MCP "${config.name}" 已连接, ${serverTools.length} 个工具`);
            }
            else {
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
        const allowedMcp = scope ? new Set(normalizeScopeList(scope.mcp)) : null;
        const allowedSkills = scope ? new Set(normalizeScopeList(scope.skill)) : null;
        const tools = allowedMcp
            ? this.tools.filter(tool => allowedMcp.has(tool.serverName) || allowedMcp.has(tool.name))
            : this.tools;
        const skills = allowedSkills
            ? this.skills.filter(skill => allowedSkills.has(skill.name))
            : this.skills;
        const parts = [];
        const missingMcp = allowedMcp
            ? Array.from(allowedMcp).filter(name => !tools.some(tool => tool.serverName === name || tool.name === name))
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
                parts.push(`\n- ${skill.name}: ${skill.description}`);
                if (skill.prompt) {
                    parts.push(`  模板: ${skill.prompt}`);
                }
            }
        }
        if (missingMcp.length > 0 || missingSkills.length > 0) {
            parts.push("\n\n已配置但当前未加载成功的工具：");
            if (missingMcp.length > 0)
                parts.push(`\n- MCP 服务器：${missingMcp.join(", ")}`);
            if (missingSkills.length > 0)
                parts.push(`\n- Skills：${missingSkills.join(", ")}`);
            parts.push("\n如果任务依赖这些工具，请说明工具暂不可用，不要假装已经调用。");
        }
        return parts.join("");
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
        const tool = this.tools.find(t => t.name === toolName);
        if (!tool) {
            return `[错误] 工具 "${toolName}" 不存在`;
        }
        const allowedMcp = scope ? new Set(normalizeScopeList(scope.mcp)) : null;
        if (allowedMcp && !allowedMcp.has(tool.serverName) && !allowedMcp.has(tool.name)) {
            return `[错误] 工具 "${toolName}" 未授权给当前 Agent 使用`;
        }
        const client = this.clients.get(tool.serverName);
        if (!client || !client.isConnected()) {
            return `[错误] MCP 服务器 "${tool.serverName}" 未连接`;
        }
        const result = await client.callTool(toolName, args);
        if (result.isError) {
            return `[工具错误] ${result.content.map(c => c.text).join("\n")}`;
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
            servers: Array.from(this.clients.entries()).map(([name, client]) => ({
                name,
                connected: client.isConnected(),
                toolsCount: this.tools.filter(t => t.serverName === name).length,
            })),
        };
    }
    // 测试 MCP 连接
    async testConnection(command, env, args = []) {
        const client = new mcp_client_1.McpClient(command, this.parseArgs(args), this.parseEnv(env));
        const connected = await client.connect();
        if (!connected) {
            return { success: false, tools: [], error: "连接失败" };
        }
        const tools = await client.listTools();
        client.disconnect();
        return { success: true, tools: tools.map(t => t.name) };
    }
    // 关闭所有连接
    disconnect() {
        for (const [, client] of this.clients) {
            client.disconnect();
        }
        this.clients.clear();
        this.tools = [];
        this.initialized = false;
    }
    loadMcpConfigs() {
        if (!fs.existsSync(MCP_DIR))
            return [];
        return fs.readdirSync(MCP_DIR)
            .filter(f => f.endsWith(".json"))
            .map(f => {
            try {
                return JSON.parse(fs.readFileSync(path.join(MCP_DIR, f), "utf-8"));
            }
            catch {
                return null;
            }
        })
            .filter(Boolean);
    }
    loadSkillConfigs() {
        if (!fs.existsSync(SKILLS_DIR))
            return [];
        return fs.readdirSync(SKILLS_DIR)
            .filter(f => f.endsWith(".json"))
            .map(f => {
            try {
                return JSON.parse(fs.readFileSync(path.join(SKILLS_DIR, f), "utf-8"));
            }
            catch {
                return null;
            }
        })
            .filter(Boolean);
    }
    parseEnv(envStr) {
        if (!envStr)
            return {};
        const env = {};
        for (const line of envStr.split("\n")) {
            const idx = line.indexOf("=");
            if (idx > 0) {
                env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
            }
        }
        return env;
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
//# sourceMappingURL=tool-manager.js.map