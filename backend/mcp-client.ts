import { spawn, ChildProcess } from "child_process";

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

interface McpToolResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

export class McpClient {
  private process: ChildProcess | null = null;
  private messageId = 0;
  private pending = new Map<number, { resolve: Function; reject: Function; timer: ReturnType<typeof setTimeout> }>();
  private buffer = "";
  private connected = false;
  private serverName = "";
  private tools: McpTool[] = [];
  private stderrBuffer = "";

  constructor(private command: string, private args: string[] = [], private env: Record<string, string> = {}) {}

  private parseCommand() {
    if (this.args.length > 0) {
      return { cmd: this.command, args: this.args };
    }

    const parts = this.command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const cmd = (parts[0] || this.command).replace(/^"|"$/g, "");
    const args = parts.slice(1).map(p => p.replace(/^"|"$/g, ""));
    return { cmd, args };
  }

  async connect(): Promise<boolean> {
    try {
      const { cmd, args } = this.parseCommand();

      const envVars = { ...process.env, ...this.env };

      this.process = spawn(cmd, args, {
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
        env: envVars,
        windowsHide: true,
      });

      this.process.stdout?.on("data", (chunk: Buffer) => {
        this.buffer += chunk.toString();
        this.processBuffer();
      });

      this.process.stderr?.on("data", (chunk: Buffer) => {
        this.stderrBuffer = (this.stderrBuffer + chunk.toString()).slice(-2000);
      });

      this.process.on("exit", () => {
        this.connected = false;
        for (const [id, pending] of this.pending) {
          clearTimeout(pending.timer);
          pending.reject(new Error("MCP process exited"));
        }
        this.pending.clear();
      });

      // 发送 initialize
      const initResult = await this.sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "cc-connect", version: "1.0.0" },
      });

      this.serverName = initResult?.serverInfo?.name || "unknown";
      this.connected = true;

      // 发送 initialized 通知
      this.sendNotification("notifications/initialized", {});

      // 获取工具列表
      const toolsResult = await this.sendRequest("tools/list", {});
      this.tools = toolsResult?.tools || [];

      return true;
    } catch (e) {
      console.error(`[MCP] 连接失败: ${this.command}`, (e as Error).message, this.stderrBuffer);
      this.connected = false;
      this.disconnect();
      return false;
    }
  }

  private processBuffer() {
    while (true) {
      const lineEnd = this.buffer.indexOf("\n");
      if (lineEnd === -1) break;

      const line = this.buffer.substring(0, lineEnd).replace(/\r$/, "").trim();
      this.buffer = this.buffer.substring(lineEnd + 1);
      if (!line) continue;

      try {
        const message = JSON.parse(line);
        this.handleMessage(message);
      } catch {}
    }
  }

  private handleMessage(message: any) {
    if (message.id !== undefined && this.pending.has(message.id)) {
      const p = this.pending.get(message.id)!;
      this.pending.delete(message.id);
      clearTimeout(p.timer);
      if (message.error) {
        p.reject(new Error(message.error.message || "MCP error"));
      } else {
        p.resolve(message.result);
      }
    }
  }

  private sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin?.writable) {
        return reject(new Error("MCP process not running"));
      }
      const id = ++this.messageId;
      const message = JSON.stringify({ jsonrpc: "2.0", id, method, params });

      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP request timeout: ${method}`));
      }, 30000);

      this.pending.set(id, { resolve, reject, timer });
      this.process.stdin.write(message + "\n");
    });
  }

  private sendNotification(method: string, params: any) {
    if (!this.process?.stdin?.writable) return;
    const message = JSON.stringify({ jsonrpc: "2.0", method, params });
    this.process.stdin.write(message + "\n");
  }

  async listTools(): Promise<McpTool[]> {
    if (!this.connected) return [];
    return this.tools;
  }

  async callTool(name: string, args: any): Promise<McpToolResult> {
    if (!this.connected) {
      return { content: [{ type: "text", text: "MCP 服务器未连接" }], isError: true };
    }
    try {
      const result = await this.sendRequest("tools/call", { name, arguments: args });
      return result || { content: [{ type: "text", text: "无返回结果" }] };
    } catch (e) {
      return { content: [{ type: "text", text: `工具调用失败: ${(e as Error).message}` }], isError: true };
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getServerName(): string {
    return this.serverName;
  }

  disconnect() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.connected = false;
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error("Disconnected"));
    }
    this.pending.clear();
  }
}
