"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpRemoteClient = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const sse_js_1 = require("@modelcontextprotocol/sdk/client/sse.js");
const credential_store_1 = require("../core/credential-store");
const secure_public_network_1 = require("./secure-public-network");
class McpRemoteClient {
    url;
    headers;
    preferredTransport;
    client = null;
    transport = null;
    connected = false;
    tools = [];
    lastError = "";
    actualTransport;
    constructor(url, headers = {}, preferredTransport = "streamable_http") {
        this.url = url;
        this.headers = headers;
        this.preferredTransport = preferredTransport;
        this.actualTransport = preferredTransport;
    }
    safeError(value) {
        return (0, credential_store_1.redactSensitiveText)(value).replace(/[\0\r\n]+/g, " ").trim().slice(0, 1200);
    }
    transportOptions() {
        const headers = { ...this.headers };
        return {
            requestInit: { headers },
            fetch: (input, init) => (0, secure_public_network_1.securePublicFetch)(input, { ...(init || {}), headers: { ...headers, ...(init?.headers || {}) } }, {
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
    async connectWith(transport) {
        await (0, secure_public_network_1.resolveSafePublicHttpsUrl)(this.url);
        const client = new index_js_1.Client({ name: "cc-connect", version: "1.0.0" }, { capabilities: {} });
        const options = this.transportOptions();
        const instance = transport === "sse"
            ? new sse_js_1.SSEClientTransport(new URL(this.url), options)
            : new streamableHttp_js_1.StreamableHTTPClientTransport(new URL(this.url), options);
        await Promise.race([
            client.connect(instance),
            new Promise((_, reject) => setTimeout(() => reject(new Error("MCP remote initialize timeout")), 30_000)),
        ]);
        const listed = await Promise.race([
            client.listTools({}),
            new Promise((_, reject) => setTimeout(() => reject(new Error("MCP remote tools/list timeout")), 30_000)),
        ]);
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
        }
        catch (primary) {
            try {
                await this.transport?.close?.();
            }
            catch { }
            if (this.preferredTransport === "streamable_http") {
                try {
                    await this.connectWith("sse");
                    this.connected = true;
                    return true;
                }
                catch (fallback) {
                    this.lastError = this.safeError(`${primary?.message || primary}; SSE fallback: ${fallback?.message || fallback}`);
                }
            }
            else {
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
    async callTool(name, args) {
        if (!this.client || !this.connected)
            return { content: [{ type: "text", text: "MCP 服务器未连接" }], isError: true };
        try {
            return await this.client.callTool({ name, arguments: args || {} });
        }
        catch (error) {
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
        try {
            await this.client?.close();
        }
        catch { }
        try {
            await this.transport?.close?.();
        }
        catch { }
        this.client = null;
        this.transport = null;
        this.tools = [];
    }
}
exports.McpRemoteClient = McpRemoteClient;
//# sourceMappingURL=mcp-remote-client.js.map