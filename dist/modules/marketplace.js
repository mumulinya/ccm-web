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
exports.handleMarketplaceApi = handleMarketplaceApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const utils_1 = require("../utils");
const db_1 = require("../db");
const { toolManager } = require("../tool-manager");
function handleMarketplaceApi(pathname, req, res, parsed) {
    // === Smithery 配置 API ===
    if (pathname === "/api/smithery/config" && req.method === "GET") {
        const smitheryConfigPath = path.join(os.homedir(), ".cc-connect", "smithery-config.json");
        try {
            if (fs.existsSync(smitheryConfigPath)) {
                const config = JSON.parse(fs.readFileSync(smitheryConfigPath, "utf-8"));
                (0, utils_1.sendJson)(res, { success: true, key: config.key || "" });
                return true;
            }
            (0, utils_1.sendJson)(res, { success: true, key: "" });
            return true;
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message });
            return true;
        }
    }
    if (pathname === "/api/smithery/config" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { key } = JSON.parse(body);
                const smitheryConfigPath = path.join(os.homedir(), ".cc-connect", "smithery-config.json");
                const dir = path.dirname(smitheryConfigPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(smitheryConfigPath, JSON.stringify({ key: key || "" }, null, 2), "utf-8");
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === 技能与工具商城 API ===
    if (pathname === "/api/marketplace/list" && req.method === "GET") {
        const homeDir = process.env.USERPROFILE || process.env.HOME || "C:\\Users\\admin";
        const localItems = [
            {
                name: "mcp-feishu",
                type: "mcp",
                description: "飞书办公协同连接器。支持多 Agent 自动发送飞书富文本卡片消息、同步任务进展、读取团队在线文档等。",
                command: "node dist/index.js",
                env: "FEISHU_APP_ID=your_app_id\nFEISHU_APP_SECRET=your_app_secret",
                author: "CC-Connect 官方",
                emoji: "🔌",
                version: "1.0.2"
            },
            {
                name: "filesystem-mcp",
                type: "mcp",
                description: "本地文件系统安全沙箱读写工具。允许 Agent 极其安全地对白名单文件夹下的代码文件进行高频读写、创建与全局分析。",
                command: `npx -y @modelcontextprotocol/server-filesystem ${path.join(homeDir, "Desktop")}`,
                author: "Anthropic",
                emoji: "📁",
                version: "1.1.0"
            },
            {
                name: "fetch-web-mcp",
                type: "mcp",
                description: "外部网页内容抓取器。可以让 Agent 直接访问任何公共网页，并自动将 HTML 转为精简 Markdown 以便大模型快速分析。",
                command: "npx -y @modelcontextprotocol/server-fetch",
                author: "Anthropic",
                emoji: "🌐",
                version: "1.0.0"
            },
            {
                name: "code-safety-auditor",
                type: "skill",
                description: "深度代码安全审计专家。注入高阶安全合规提示词，强力命令 Agent 在编写或重构代码时防范越权、SQL注入和内存泄露等漏洞。",
                prompt: "请以极其严苛的资深安全专家身份审查以下代码。排查：1) 垂直与水平越权漏洞；2) 关键参数的输入校验与 SQL 注入防范；3) 异步未关闭句柄与内存泄露。确保代码完全合规。",
                author: "Security Team",
                emoji: "🛡️",
                version: "2.1.0"
            },
            {
                name: "premium-theme-architect",
                type: "skill",
                description: "极光设计与高端 UI 交互架构师。轻量化约束 Agent 在生成前端代码时采用渐变色、微动效及玻璃拟态，大幅提升界面美感。",
                prompt: "请充当顶级 UI/UX 视觉设计师。在生成所有前端界面（HTML/CSS/Vue）时，必须贯彻以下设计哲学：1) 精选 HSL 渐变色，避免纯红绿蓝；2) 引入 subtle micro-animations 微动效及 hover 过渡；3) 采用玻璃拟态 (backdrop-filter: blur) 与精致的圆角投影，营造 Premium 质感。",
                author: "Design Team",
                emoji: "🎨",
                version: "1.2.0"
            }
        ];
        const source = parsed.query.source || "local";
        const customUrl = parsed.query.url;
        if (source === "local") {
            (0, utils_1.sendJson)(res, { success: true, items: localItems });
            return true;
        }
        if (source === "smithery") {
            const smitheryConfigPath = path.join(os.homedir(), ".cc-connect", "smithery-config.json");
            let key = "";
            try {
                if (fs.existsSync(smitheryConfigPath)) {
                    const config = JSON.parse(fs.readFileSync(smitheryConfigPath, "utf-8"));
                    key = config.key || "";
                }
            }
            catch (e) { }
            if (!key) {
                (0, utils_1.sendJson)(res, { success: true, needKey: true, items: [] });
                return true;
            }
            const https = require("https");
            const options = {
                hostname: "api.smithery.ai",
                path: "/servers?pageSize=50",
                method: "GET",
                headers: {
                    "User-Agent": "ccm-console",
                    "Authorization": `Bearer ${key}`
                }
            };
            const reqGet = https.request(options, (remoteRes) => {
                if (remoteRes.statusCode !== 200) {
                    remoteRes.resume();
                    let errDetail = `Smithery API 请求失败 (HTTP ${remoteRes.statusCode})`;
                    if (remoteRes.statusCode === 401) {
                        errDetail = "Smithery API Key 无效或过期，请重新激活。";
                    }
                    (0, utils_1.sendJson)(res, {
                        success: true,
                        needKey: remoteRes.statusCode === 401,
                        error: errDetail,
                        items: []
                    });
                    return;
                }
                let rawData = "";
                remoteRes.on("data", (chunk) => rawData += chunk);
                remoteRes.on("end", () => {
                    try {
                        const parsedData = JSON.parse(rawData);
                        const servers = Array.isArray(parsedData) ? parsedData : (parsedData.servers || parsedData.data || parsedData.items || []);
                        const items = servers.map((s) => {
                            return {
                                name: s.displayName || s.qualifiedName || s.name || s.slug || "未命名MCP",
                                type: "mcp",
                                description: s.description || s.summary || "无描述",
                                command: `npx -y @smithery/cli run ${s.qualifiedName || s.name || s.slug}`,
                                env: "",
                                author: s.namespace || s.owner || s.author || "Smithery.ai",
                                emoji: "🔌",
                                version: s.version || "1.0.0"
                            };
                        });
                        (0, utils_1.sendJson)(res, { success: true, items });
                    }
                    catch (err) {
                        (0, utils_1.sendJson)(res, {
                            success: true,
                            error: "解析 Smithery 返回数据失败",
                            items: []
                        });
                    }
                });
            });
            reqGet.on("error", (err) => {
                (0, utils_1.sendJson)(res, {
                    success: true,
                    error: `连接 Smithery 失败: ${err.message}`,
                    items: []
                });
            });
            reqGet.end();
            return true;
        }
        let fetchUrl = "";
        if (source === "github") {
            fetchUrl = `https://raw.githubusercontent.com/mumulinya/ccm-web/main/public/marketplace.json?t=${Date.now()}`;
        }
        else if (source === "custom" && customUrl) {
            fetchUrl = String(customUrl);
        }
        else {
            (0, utils_1.sendJson)(res, { success: false, error: "未指定有效的自定义 URL", items: localItems });
            return true;
        }
        const https = require("https");
        https.get(fetchUrl, { headers: { "User-Agent": "ccm-console" } }, (remoteRes) => {
            if (remoteRes.statusCode !== 200) {
                remoteRes.resume();
                (0, utils_1.sendJson)(res, {
                    success: true,
                    error: `远程源加载失败 (HTTP ${remoteRes.statusCode})，已自动切换为本地精选。`,
                    items: localItems
                });
                return;
            }
            let rawData = "";
            remoteRes.on("data", (chunk) => rawData += chunk);
            remoteRes.on("end", () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    const items = Array.isArray(parsedData) ? parsedData : (parsedData.items || []);
                    (0, utils_1.sendJson)(res, { success: true, items });
                }
                catch (err) {
                    (0, utils_1.sendJson)(res, {
                        success: true,
                        error: "解析外部 JSON 配置文件失败，已自动回退至本地官方精选。",
                        items: localItems
                    });
                }
            });
        }).on("error", (err) => {
            (0, utils_1.sendJson)(res, {
                success: true,
                error: `连接远程数据源失败: ${err.message}，已自动回退至本地官方精选。`,
                items: localItems
            });
        });
        return true;
    }
    if (pathname === "/api/marketplace/install" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const item = JSON.parse(body);
                if (!item.name)
                    return (0, utils_1.sendJson)(res, { error: "名称不能为空" }, 400);
                if (item.type === "mcp") {
                    (0, db_1.saveMcpTool)({
                        name: item.name,
                        description: item.description,
                        command: item.command,
                        env: item.env || "",
                        enabled: true
                    });
                }
                else if (item.type === "skill") {
                    (0, db_1.saveSkill)({
                        name: item.name,
                        description: item.description,
                        prompt: item.prompt,
                        enabled: true
                    });
                }
                else {
                    return (0, utils_1.sendJson)(res, { error: "不支持的工具类型" }, 400);
                }
                toolManager.loadTools().then(() => {
                    (0, utils_1.sendJson)(res, { success: true });
                }).catch((err) => {
                    (0, utils_1.sendJson)(res, { success: false, error: "加载工具失败: " + err.message });
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=marketplace.js.map