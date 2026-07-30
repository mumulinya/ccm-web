import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { redactSensitiveText } from "../core/credential-store";
import { resolveSafePublicHttpsUrl, securePublicFetch } from "./secure-public-network";

type RemoteTransport = "streamable_http" | "sse";

export class McpRemoteClient {
  private client: Client | null = null;
  private transport: any = null;
  private connected = false;
  private tools: any[] = [];
  private lastError = "";
  private actualTransport: RemoteTransport;

  constructor(
    private url: string,
    private headers: Record<string, string> = {},
    private preferredTransport: RemoteTransport = "streamable_http",
  ) {
    this.actualTransport = preferredTransport;
  }

  private safeError(value: any) {
    return redactSensitiveText(value).replace(/[\0\r\n]+/g, " ").trim().slice(0, 1200);
  }

  private transportOptions() {
    const headers = { ...this.headers };
    return {
      requestInit: { headers },
      fetch: (input: any, init?: any) => securePublicFetch(input, { ...(init || {}), headers: { ...headers, ...(init?.headers || {}) } }, {
        maxBytes: 8 * 1024 * 1024,
        timeoutMs: 30_000,
      }),
      reconnectionOptions: {
        maxReconnectionDelay: 5000,
        initialReconnectionDelay: 500,
        reconnectionDelayGrowFactor: 2,
        maxRetries: 2,
      },
    };
  }

  private async connectWith(transport: RemoteTransport) {
    await resolveSafePublicHttpsUrl(this.url);
    const client = new Client({ name: "cc-connect", version: "1.0.0" }, { capabilities: {} });
    const options = this.transportOptions();
    const instance = transport === "sse"
      ? new SSEClientTransport(new URL(this.url), options as any)
      : new StreamableHTTPClientTransport(new URL(this.url), options as any);
    await Promise.race([
      client.connect(instance),
      new Promise((_, reject) => setTimeout(() => reject(new Error("MCP remote initialize timeout")), 30_000)),
    ]);
    const listed = await Promise.race([
      client.listTools({}),
      new Promise((_, reject) => setTimeout(() => reject(new Error("MCP remote tools/list timeout")), 30_000)),
    ]) as any;
    this.client = client;
    this.transport = instance;
    this.tools = Array.isArray(listed?.tools) ? listed.tools : [];
    this.actualTransport = transport;
  }

  async connect() {
    try {
      await this.connectWith(this.preferredTransport);
      this.connected = true;
      return true;
    } catch (primary: any) {
      try { await this.transport?.close?.(); } catch {}
      if (this.preferredTransport === "streamable_http") {
        try {
          await this.connectWith("sse");
          this.connected = true;
          return true;
        } catch (fallback: any) {
          this.lastError = this.safeError(`${primary?.message || primary}; SSE fallback: ${fallback?.message || fallback}`);
        }
      } else {
        this.lastError = this.safeError(primary?.message || primary);
      }
      this.connected = false;
      await this.disconnect();
      return false;
    }
  }

  async listTools() {
    return this.connected ? this.tools : [];
  }

  async callTool(name: string, args: any) {
    if (!this.client || !this.connected) return { content: [{ type: "text", text: "MCP 服务器未连接" }], isError: true };
    try {
      return await this.client.callTool({ name, arguments: args || {} }) as any;
    } catch (error: any) {
      this.lastError = this.safeError(error?.message || error);
      return { content: [{ type: "text", text: `工具调用失败: ${this.lastError}` }], isError: true };
    }
  }

  isConnected() { return this.connected; }
  getServerName() { return ""; }
  getServerInstructions() { return ""; }
  getActualTransport() { return this.actualTransport; }
  getDiagnostics() {
    return {
      lastError: this.lastError,
      stderr: "",
      elicitationRequired: false,
      elicitationMessage: "",
      serverInstructions: "",
      transport: this.actualTransport,
    };
  }

  async disconnect() {
    this.connected = false;
    try { await this.client?.close(); } catch {}
    try { await this.transport?.close?.(); } catch {}
    this.client = null;
    this.transport = null;
    this.tools = [];
  }
}
