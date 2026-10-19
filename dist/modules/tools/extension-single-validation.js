"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateStandaloneActivation = validateStandaloneActivation;
const mcp_client_1 = require("../../tools/mcp-client");
const mcp_remote_client_1 = require("../../tools/mcp-remote-client");
// Test an unpublished candidate directly: quarantined legacy records must not
// become globally callable merely to run their activation check.
async function validateStandaloneActivation(type, item) {
    if (type !== "mcp")
        return;
    const config = require("./marketplace").validateStdioMarketplaceItem(item);
    const client = config.url
        ? new mcp_remote_client_1.McpRemoteClient(config.url, config.headers || {}, config.transport === "sse" ? "sse" : "streamable_http", config.name)
        : new mcp_client_1.McpClient(config.executablePath || config.command, config.args || [], config.env || {});
    try {
        if (!await client.connect())
            throw new Error("MCP 初始化测试失败，请检查依赖或连接账号");
        await client.listTools();
    }
    finally {
        await client.disconnect();
    }
}
//# sourceMappingURL=extension-single-validation.js.map