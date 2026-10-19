"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runExtensionProxyMcpServer = runExtensionProxyMcpServer;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const db_1 = require("../core/db");
const internal_mcp_runtime_1 = require("./internal-mcp-runtime");
const internal_mcp_task_store_1 = require("./internal-mcp-task-store");
const installed_tool_catalog_1 = require("../tools/installed-tool-catalog");
const mcp_remote_client_1 = require("../tools/mcp-remote-client");
const credential_store_1 = require("../core/credential-store");
const extension_proxy_authorization_1 = require("../tools/extension-proxy-authorization");
async function runExtensionProxyMcpServer() {
    const name = String(process.env.CCM_EXTENSION_SERVER || "");
    const allowed = () => {
        const context = (0, internal_mcp_runtime_1.openInternalMcpTaskContext)();
        if (!["project-child-agent", "project-agent"].includes(context.role))
            throw new Error("当前角色无权使用开发扩展代理");
        const task = (0, internal_mcp_task_store_1.getBoundInternalMcpTask)(context);
        (0, extension_proxy_authorization_1.assertExtensionProxyTaskBinding)(context, task);
        const config = (0, db_1.loadMcpTools)().find(row => row.name === name);
        if (!config?.url || !(0, installed_tool_catalog_1.installedRecordAllowed)("mcp", config))
            throw new Error("扩展已禁用、卸载或连接已撤销");
        return config;
    };
    let client = null;
    let fingerprint = "";
    const current = async () => {
        const config = allowed();
        const next = JSON.stringify([config.url, config.headers, config.transport]);
        if (!client || fingerprint !== next || !client.isConnected()) {
            await client?.disconnect();
            client = new mcp_remote_client_1.McpRemoteClient(config.url, config.headers || {}, config.transport === "sse" ? "sse" : "streamable_http", name);
            if (!await client.connect())
                throw new Error("扩展连接未就绪，请到扩展中心重新连接");
            fingerprint = next;
        }
        return client;
    };
    const server = new index_js_1.Server({ name: `ccm-extension-${name}`, version: "1.0.0" }, { capabilities: { tools: {} } });
    server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({ tools: await (await current()).listTools() }));
    server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
        try {
            const connection = await current();
            if (!(await connection.listTools()).some(tool => tool.name === request.params.name))
                throw new Error("扩展工具不存在");
            allowed();
            return await connection.callTool(request.params.name, request.params.arguments || {});
        }
        catch (error) {
            return { isError: true, content: [{ type: "text", text: (0, credential_store_1.redactSensitiveText)(error.message) }] };
        }
    });
    await server.connect(new stdio_js_1.StdioServerTransport());
    process.stdin.on("end", () => { void client?.disconnect(); });
}
if (require.main === module)
    void runExtensionProxyMcpServer().catch(error => { process.stderr.write(`${(0, credential_store_1.redactSensitiveText)(error.message)}\n`); process.exitCode = 1; });
//# sourceMappingURL=extension-proxy-mcp.js.map