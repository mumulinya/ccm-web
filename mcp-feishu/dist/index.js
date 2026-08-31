import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FeishuClient } from "./feishu-client.js";
import { registerTools } from "./tools.js";
// 从 .env 文件加载环境变量（如果环境变量未设置）
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");
if (!process.env.FEISHU_APP_ID || !process.env.FEISHU_APP_SECRET) {
    try {
        const envContent = readFileSync(envPath, "utf-8");
        for (const line of envContent.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#"))
                continue;
            const eqIdx = trimmed.indexOf("=");
            if (eqIdx === -1)
                continue;
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[key])
                process.env[key] = val;
        }
    }
    catch {
        // .env 文件不存在，忽略
    }
}
const appId = process.env.FEISHU_APP_ID;
const appSecret = process.env.FEISHU_APP_SECRET;
if (!appId || !appSecret) {
    console.error(`错误: 请在 ${envPath} 中设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET`);
    process.exit(1);
}
const feishuClient = new FeishuClient(appId, appSecret);
const server = new McpServer({
    name: "mcp-feishu",
    version: "1.0.0",
});
registerTools(server, feishuClient);
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("mcp-feishu server 已启动 (stdio)");
}
main().catch((err) => {
    console.error("启动失败:", err);
    process.exit(1);
});
