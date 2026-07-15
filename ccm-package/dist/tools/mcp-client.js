"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpClient = void 0;
const child_process_1 = require("child_process");
class McpClient {
    command;
    args;
    env;
    process = null;
    messageId = 0;
    pending = new Map();
    buffer = "";
    connected = false;
    serverName = "";
    serverInstructions = "";
    tools = [];
    stderrBuffer = "";
    lastError = "";
    elicitationRequired = false;
    elicitationMessage = "";
    constructor(command, args = [], env = {}) {
        this.command = command;
        this.args = args;
        this.env = env;
    }
    parseCommand() {
        if (this.args.length > 0) {
            return { cmd: this.command, args: this.args };
        }
        const parts = this.command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        const cmd = (parts[0] || this.command).replace(/^"|"$/g, "");
        const args = parts.slice(1).map(p => p.replace(/^"|"$/g, ""));
        return { cmd, args };
    }
    async connect() {
        try {
            const { cmd, args } = this.parseCommand();
            const envVars = { ...process.env, ...this.env };
            this.process = (0, child_process_1.spawn)(cmd, args, {
                stdio: ["pipe", "pipe", "pipe"],
                shell: true,
                env: envVars,
                windowsHide: true,
            });
            this.process.stdout?.on("data", (chunk) => {
                this.buffer += chunk.toString();
                this.processBuffer();
            });
            this.process.stderr?.on("data", (chunk) => {
                this.stderrBuffer = (this.stderrBuffer + chunk.toString()).slice(-2000);
            });
            this.process.on("exit", () => {
                this.connected = false;
                this.lastError = this.lastError || "MCP process exited";
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
            this.serverInstructions = String(initResult?.instructions || "").trim();
            this.connected = true;
            // 发送 initialized 通知
            this.sendNotification("notifications/initialized", {});
            // 获取工具列表
            const toolsResult = await this.sendRequest("tools/list", {});
            this.tools = toolsResult?.tools || [];
            return true;
        }
        catch (e) {
            this.lastError = e.message || "MCP connect failed";
            console.error(`[MCP] 连接失败: ${this.command}`, this.lastError, this.stderrBuffer);
            this.connected = false;
            this.disconnect();
            return false;
        }
    }
    processBuffer() {
        while (true) {
            const lineEnd = this.buffer.indexOf("\n");
            if (lineEnd === -1)
                break;
            const line = this.buffer.substring(0, lineEnd).replace(/\r$/, "").trim();
            this.buffer = this.buffer.substring(lineEnd + 1);
            if (!line)
                continue;
            try {
                const message = JSON.parse(line);
                this.handleMessage(message);
            }
            catch { }
        }
    }
    handleMessage(message) {
        if (message.id !== undefined && this.pending.has(message.id)) {
            const p = this.pending.get(message.id);
            this.pending.delete(message.id);
            clearTimeout(p.timer);
            if (message.error) {
                this.lastError = message.error.message || "MCP error";
                p.reject(new Error(this.lastError));
            }
            else {
                p.resolve(message.result);
            }
            return;
        }
        if (message.id !== undefined && message.method) {
            this.handleServerRequest(message);
        }
    }
    handleServerRequest(message) {
        const method = String(message.method || "");
        if (/elicitation|consent|auth/i.test(method)) {
            this.elicitationRequired = true;
            this.elicitationMessage = `MCP server requested controlled user input via ${method}`;
            this.sendResponseError(message.id, -32000, "CCM blocked uncontrolled MCP elicitation; ask the user through CCM UI and retry.");
            return;
        }
        this.sendResponseError(message.id, -32601, `Unsupported MCP server request: ${method}`);
    }
    sendResponseError(id, code, message) {
        if (!this.process?.stdin?.writable)
            return;
        this.process.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");
    }
    sendRequest(method, params) {
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
    sendNotification(method, params) {
        if (!this.process?.stdin?.writable)
            return;
        const message = JSON.stringify({ jsonrpc: "2.0", method, params });
        this.process.stdin.write(message + "\n");
    }
    async listTools() {
        if (!this.connected)
            return [];
        return this.tools;
    }
    async callTool(name, args) {
        if (!this.connected) {
            return { content: [{ type: "text", text: "MCP 服务器未连接" }], isError: true };
        }
        try {
            const result = await this.sendRequest("tools/call", { name, arguments: args });
            return result || { content: [{ type: "text", text: "无返回结果" }] };
        }
        catch (e) {
            this.lastError = e.message || "工具调用失败";
            return { content: [{ type: "text", text: `工具调用失败: ${e.message}` }], isError: true };
        }
    }
    isConnected() {
        return this.connected;
    }
    getServerName() {
        return this.serverName;
    }
    getServerInstructions() {
        return this.serverInstructions;
    }
    getDiagnostics() {
        return {
            lastError: this.lastError,
            stderr: this.stderrBuffer,
            elicitationRequired: this.elicitationRequired,
            elicitationMessage: this.elicitationMessage,
            serverInstructions: this.serverInstructions,
        };
    }
    disconnect() {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
        this.connected = false;
        this.serverInstructions = "";
        for (const [, p] of this.pending) {
            clearTimeout(p.timer);
            p.reject(new Error("Disconnected"));
        }
        this.pending.clear();
    }
}
exports.McpClient = McpClient;
//# sourceMappingURL=mcp-client.js.map