"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FETCH_WEB_MCP_SERVER_NAME = void 0;
exports.fetchPublicWebText = fetchPublicWebText;
exports.createFetchWebMcpServer = createFetchWebMcpServer;
exports.runFetchWebMcpServer = runFetchWebMcpServer;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const source_ingestion_1 = require("../modules/requirements/source-ingestion");
exports.FETCH_WEB_MCP_SERVER_NAME = "fetch-web-mcp";
async function fetchPublicWebText(input) {
    const maxLength = Math.max(1_000, Math.min(100_000, Math.floor(Number(input.maxLength || 30_000))));
    const startIndex = Math.max(0, Math.floor(Number(input.startIndex || 0)));
    const { response, buffer, finalUrl } = await (0, source_ingestion_1.fetchPublicDocument)(String(input.url || "").trim());
    if (!response.ok)
        throw new Error(`HTTP ${response.status}`);
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    let text = "";
    if (contentType.includes("text/html") || /^\s*</.test(buffer.toString("utf-8", 0, Math.min(buffer.length, 200)))) {
        text = (0, source_ingestion_1.htmlToText)(buffer.toString("utf-8"));
    }
    else if (contentType.includes("text/") || contentType.includes("json") || contentType.includes("xml") || !contentType) {
        text = buffer.toString("utf-8").trim();
    }
    else {
        throw new Error(`不支持的网页内容类型：${contentType || "unknown"}`);
    }
    const selected = text.slice(startIndex, startIndex + maxLength);
    return {
        url: finalUrl,
        contentType,
        startIndex,
        returnedChars: selected.length,
        totalChars: text.length,
        truncated: startIndex + selected.length < text.length,
        text: selected,
    };
}
function createFetchWebMcpServer() {
    const server = new mcp_js_1.McpServer({ name: exports.FETCH_WEB_MCP_SERVER_NAME, version: "2.0.0" });
    server.tool("fetch", "读取公开HTTP/HTTPS网页并返回清理后的文本。拒绝本机、局域网、私有地址和不安全重定向。", {
        url: zod_1.z.string().url().describe("公开HTTP/HTTPS网页地址"),
        max_length: zod_1.z.number().int().min(1_000).max(100_000).optional().describe("最多返回字符数，默认30000"),
        start_index: zod_1.z.number().int().min(0).optional().describe("从清理后文本的字符位置开始读取"),
    }, async (params) => {
        try {
            const result = await fetchPublicWebText({ url: params.url, maxLength: params.max_length, startIndex: params.start_index });
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
        }
        catch (error) {
            return { isError: true, content: [{ type: "text", text: String(error?.message || error || "网页读取失败").slice(0, 1_000) }] };
        }
    });
    return server;
}
async function runFetchWebMcpServer() {
    const server = createFetchWebMcpServer();
    await server.connect(new stdio_js_1.StdioServerTransport());
}
if (require.main === module) {
    runFetchWebMcpServer().catch(error => {
        console.error(`[fetch-web-mcp] ${error?.message || error}`);
        process.exitCode = 1;
    });
}
//# sourceMappingURL=fetch-web-mcp.js.map