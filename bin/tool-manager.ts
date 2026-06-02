import { McpClient } from "./mcp-client";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const CCM_DIR = path.join(os.homedir(), ".cc-connect");
const MCP_DIR = path.join(CCM_DIR, "mcp");
const SKILLS_DIR = path.join(CCM_DIR, "skills");

interface ToolDef {
  name: string;
  description: string;
  serverName: string;
  inputSchema?: any;
}

interface SkillDef {
  name: string;
  description: string;
  prompt?: string;
  enabled: boolean;
}

export class ToolManager {
  private clients = new Map<string, McpClient>(); // serverName -> client
  private tools: ToolDef[] = [];
  private skills: SkillDef[] = [];
  private initialized = false;

  // 加载所有启用的 MCP 服务器和 Skills
  async loadTools() {
    this.tools = [];
    // 加载 MCP 工具配置
    const mcpConfigs = this.loadMcpConfigs();
    for (const config of mcpConfigs) {
      if (!config.enabled || !config.command) continue;
      if (this.clients.has(config.name)) continue;

      const client = new McpClient(config.command, this.parseArgs(config.args), this.parseEnv(config.env));
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
      } else {
        console.warn(`[ToolManager] MCP "${config.name}" 连接失败`);
      }
    }

    // 加载 Skills
    this.skills = this.loadSkillConfigs().filter(s => s.enabled);
    this.initialized = true;
  }

  // 生成工具 prompt 注入文本
  buildToolPrompt(): string {
    if (!this.initialized) return "";

    const parts: string[] = [];

    // MCP 工具
    if (this.tools.length > 0) {
      parts.push("\n\n你可以使用以下工具：");
      for (const tool of this.tools) {
        let desc = `\n\n### 工具: ${tool.name}`;
        desc += `\n描述: ${tool.description}`;
        desc += `\n来源: ${tool.serverName}`;
        if (tool.inputSchema?.properties) {
          desc += `\n参数:`;
          for (const [key, val] of Object.entries(tool.inputSchema.properties)) {
            const prop = val as any;
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
    if (this.skills.length > 0) {
      parts.push("\n\n你可以使用以下 Skills（技能）：");
      for (const skill of this.skills) {
        parts.push(`\n- ${skill.name}: ${skill.description}`);
        if (skill.prompt) {
          parts.push(`  模板: ${skill.prompt}`);
        }
      }
    }

    return parts.join("");
  }

  // 解析 Agent 输出中的工具调用
  parseToolCalls(text: string): Array<{ name: string; arguments: any }> {
    const calls: Array<{ name: string; arguments: any }> = [];
    const regex = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.name) {
          calls.push({ name: parsed.name, arguments: parsed.arguments || {} });
        }
      } catch {}
    }
    return calls;
  }

  // 执行工具调用
  async executeToolCall(toolName: string, args: any): Promise<string> {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      return `[错误] 工具 "${toolName}" 不存在`;
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
  async testConnection(command: string, env: string, args: any = []): Promise<{ success: boolean; tools: string[]; error?: string }> {
    const client = new McpClient(command, this.parseArgs(args), this.parseEnv(env));
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

  private loadMcpConfigs(): any[] {
    if (!fs.existsSync(MCP_DIR)) return [];
    return fs.readdirSync(MCP_DIR)
      .filter(f => f.endsWith(".json"))
      .map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(MCP_DIR, f), "utf-8")); }
        catch { return null; }
      })
      .filter(Boolean);
  }

  private loadSkillConfigs(): SkillDef[] {
    if (!fs.existsSync(SKILLS_DIR)) return [];
    return fs.readdirSync(SKILLS_DIR)
      .filter(f => f.endsWith(".json"))
      .map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(SKILLS_DIR, f), "utf-8")); }
        catch { return null; }
      })
      .filter(Boolean);
  }

  private parseEnv(envStr: string): Record<string, string> {
    if (!envStr) return {};
    const env: Record<string, string> = {};
    for (const line of envStr.split("\n")) {
      const idx = line.indexOf("=");
      if (idx > 0) {
        env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
      }
    }
    return env;
  }

  private parseArgs(args: any): string[] {
    if (Array.isArray(args)) return args.map(String).filter(Boolean);
    if (typeof args !== "string" || !args.trim()) return [];
    return args.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(p => p.replace(/^"|"$/g, "")) || [];
  }
}

// 单例
export const toolManager = new ToolManager();
