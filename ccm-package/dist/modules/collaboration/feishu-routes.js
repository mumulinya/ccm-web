"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFeishuRoutes = handleFeishuRoutes;
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const feishu_1 = require("./feishu");
function handleFeishuRoutes(req, res, parsed) {
    const pathname = parsed.pathname;
    if (pathname === "/api/feishu/config" && req.method === "GET") {
        const config = (0, db_1.loadFeishuConfig)();
        (0, utils_1.sendJson)(res, {
            config: {
                enabled: config.enabled !== false,
                notification_channel: "webhook",
                app_id: config.app_id || "",
                app_secret: config.app_secret ? "******" : "",
                webhook_url: config.webhook_url || "",
                sign_key: config.sign_key ? "******" : "",
                webhook_ready: !!config.webhook_url,
                notification_ready: !!config.webhook_url,
                control_bot_app_id: config.control_bot_app_id || config.app_id || "",
                control_bot_app_secret: (config.control_bot_app_secret || config.app_secret) ? "******" : "",
                control_bot_verification_token: config.control_bot_verification_token ? "******" : "",
                control_bot_encrypt_key: config.control_bot_encrypt_key ? "******" : "",
                control_bot_enabled: config.control_bot_enabled === true,
                control_bot_ready: !!(config.control_bot_enabled && (config.control_bot_app_id || config.app_id) && (config.control_bot_app_secret || config.app_secret)),
                control_bot_event_path: "/api/feishu/bot/event",
                control_bot_public_base_url: config.control_bot_public_base_url || "",
            }
        });
        return true;
    }
    if (pathname === "/api/feishu/config" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const updates = JSON.parse(body);
                const config = (0, db_1.loadFeishuConfig)();
                config.notification_channel = "webhook";
                if (updates.webhook_url !== undefined)
                    config.webhook_url = String(updates.webhook_url || "").trim();
                if (updates.sign_key !== undefined && updates.sign_key !== "******")
                    config.sign_key = String(updates.sign_key || "").trim();
                if (updates.enabled !== undefined)
                    config.enabled = updates.enabled;
                if (updates.control_bot_enabled !== undefined)
                    config.control_bot_enabled = updates.control_bot_enabled === true;
                if (updates.control_bot_app_id !== undefined)
                    config.control_bot_app_id = String(updates.control_bot_app_id || "").trim();
                if (updates.control_bot_app_secret !== undefined && updates.control_bot_app_secret !== "******")
                    config.control_bot_app_secret = String(updates.control_bot_app_secret || "").trim();
                if (updates.control_bot_verification_token !== undefined && updates.control_bot_verification_token !== "******")
                    config.control_bot_verification_token = String(updates.control_bot_verification_token || "").trim();
                if (updates.control_bot_encrypt_key !== undefined && updates.control_bot_encrypt_key !== "******")
                    config.control_bot_encrypt_key = String(updates.control_bot_encrypt_key || "").trim();
                if (updates.control_bot_public_base_url !== undefined)
                    config.control_bot_public_base_url = String(updates.control_bot_public_base_url || "").trim().replace(/\/$/, "");
                console.log("[飞书配置] 保存配置:", { channel: "webhook", webhook: config.webhook_url ? "已配置" : "空", control_bot: config.control_bot_enabled ? "启用" : "关闭" });
                (0, db_1.saveFeishuConfig)(config);
                (0, utils_1.sendJson)(res, { success: true, message: "飞书配置已保存" });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/feishu/auth-url" && req.method === "GET") {
        const config = (0, db_1.loadFeishuConfig)();
        if (!config.app_id) {
            (0, utils_1.sendJson)(res, { error: "请先配置 App ID" }, 400);
            return true;
        }
        const scopes = (config.scopes || feishu_1.FEISHU_SCOPES).join(" ");
        const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${config.app_id}&redirect_uri=${encodeURIComponent(config.redirect_uri)}&scope=${encodeURIComponent(scopes)}&state=ccm_auth`;
        (0, utils_1.sendJson)(res, { success: true, auth_url: authUrl });
        return true;
    }
    if (pathname === "/api/feishu/callback" && req.method === "GET") {
        const code = parsed.query.code;
        if (!code) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<h1>授权失败：缺少 code 参数</h1>");
            return true;
        }
        const config = (0, db_1.loadFeishuConfig)();
        if (!config.app_id || !config.app_secret) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<h1>授权失败：未配置 App ID 或 Secret</h1>");
            return true;
        }
        (0, feishu_1.getFeishuUserToken)(config.app_id, config.app_secret, String(code)).then(tokenData => {
            if (!tokenData) {
                res.writeHead(400, { "Content-Type": "text/html" });
                res.end("<h1>授权失败：获取 Token 失败</h1>");
                return;
            }
            config.user_access_token = tokenData.access_token;
            config.user_refresh_token = tokenData.refresh_token;
            config.token_expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
            config.authorized = true;
            return (0, feishu_1.getFeishuUserInfo)(tokenData.access_token).then(userInfo => {
                if (userInfo) {
                    config.authorized_user = {
                        name: userInfo.name,
                        open_id: userInfo.open_id,
                        avatar: userInfo.avatar_url
                    };
                }
                (0, db_1.saveFeishuConfig)(config);
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>飞书授权成功</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:50px">
            <h1 style="color:#22c55e">✅ 飞书授权成功！</h1>
            <p>用户：${userInfo?.name || '未知'}</p>
            <p>授权已生效，可以关闭此页面。</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
          </html>
        `);
            });
        }).catch(err => {
            console.error("[飞书授权] 回调处理失败:", err.message);
            if (!res.headersSent) {
                res.writeHead(500, { "Content-Type": "text/html" });
                res.end("<h1>授权失败：服务器错误</h1>");
            }
        });
        return true;
    }
    if (pathname === "/api/feishu/revoke" && req.method === "POST") {
        const config = (0, db_1.loadFeishuConfig)();
        config.authorized = false;
        config.user_access_token = "";
        config.user_refresh_token = "";
        config.token_expires_at = null;
        config.authorized_user = null;
        (0, db_1.saveFeishuConfig)(config);
        (0, utils_1.sendJson)(res, { success: true, message: "授权已撤销" });
        return true;
    }
    if (pathname === "/api/feishu/chats" && req.method === "GET") {
        (0, feishu_1.getValidFeishuToken)().then(async (token) => {
            if (!token) {
                (0, utils_1.sendJson)(res, { error: "未授权或 Token 无效，请先完成飞书授权" }, 401);
                return;
            }
            const chats = await (0, feishu_1.getFeishuChatList)(token);
            if (!res.headersSent) {
                (0, utils_1.sendJson)(res, { success: true, chats: chats || [] });
            }
        }).catch(err => {
            console.error("[飞书] 获取群聊列表失败:", err.message);
            if (!res.headersSent) {
                (0, utils_1.sendJson)(res, { error: "获取群聊列表失败" }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/feishu/test" && req.method === "POST") {
        const config = (0, db_1.loadFeishuConfig)();
        if (!config.webhook_url) {
            (0, utils_1.sendJson)(res, { error: "请先保存飞书群机器人 Webhook 地址" }, 400);
            return true;
        }
        (0, feishu_1.sendFeishuReportMessage)({
            title: "ccm 飞书通知测试",
            markdown: `配置验证成功\n\n发送时间：${new Date().toLocaleString("zh-CN")}\n\n后续开发日报、周报和任务状态会通过飞书群机器人通知。`,
        }).then(result => {
            if (result.success)
                (0, utils_1.sendJson)(res, { success: true, message: "测试通知已发送，请检查飞书", result });
            else
                (0, utils_1.sendJson)(res, { error: result.error || "发送失败", result }, 400);
        }).catch((error) => (0, utils_1.sendJson)(res, { error: error?.message || "发送失败" }, 500));
        return true;
    }
    return false;
}
//# sourceMappingURL=feishu-routes.js.map