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
exports.FEISHU_SCOPES = void 0;
exports.getFeishuUserToken = getFeishuUserToken;
exports.getFeishuUserInfo = getFeishuUserInfo;
exports.getFeishuChatList = getFeishuChatList;
exports.getValidFeishuToken = getValidFeishuToken;
exports.sendFeishuMessageToUser = sendFeishuMessageToUser;
exports.sendFeishuReportMessage = sendFeishuReportMessage;
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
exports.FEISHU_SCOPES = [
    "im:message",
    "im:message.group_at_msg",
    "im:chat",
    "im:chat:readonly",
    "contact:user.id:readonly",
];
async function getFeishuTenantToken(appId, appSecret) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ app_id: appId, app_secret: appSecret })
        });
        const data = await response.json();
        return data.tenant_access_token || null;
    }
    catch (e) {
        console.error("获取飞书 tenant_access_token 失败:", e.message);
        return null;
    }
}
async function getFeishuUserToken(appId, appSecret, code) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/oidc/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "authorization_code",
                client_id: appId,
                client_secret: appSecret,
                code: code,
                redirect_uri: "http://localhost:3080/api/feishu/callback"
            })
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data;
        }
        console.error("获取 user_access_token 失败:", data.msg);
        return null;
    }
    catch (e) {
        console.error("获取 user_access_token 失败:", e.message);
        return null;
    }
}
async function refreshFeishuUserToken(appId, appSecret, refreshToken) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "refresh_token",
                client_id: appId,
                client_secret: appSecret,
                refresh_token: refreshToken
            })
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data;
        }
        return null;
    }
    catch (e) {
        console.error("刷新 user_access_token 失败:", e.message);
        return null;
    }
}
async function getFeishuUserInfo(accessToken) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/user_info", {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data;
        }
        return null;
    }
    catch (e) {
        console.error("获取用户信息失败:", e.message);
        return null;
    }
}
async function getFeishuChatList(accessToken) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/im/v1/chats?page_size=50", {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data.items || [];
        }
        return [];
    }
    catch (e) {
        console.error("获取群聊列表失败:", e.message);
        return [];
    }
}
async function getValidFeishuToken() {
    const config = (0, db_1.loadFeishuConfig)();
    if (!config.app_id || !config.app_secret)
        return null;
    if (config.user_access_token && config.token_expires_at) {
        const expiresAt = new Date(config.token_expires_at);
        if (expiresAt > new Date()) {
            return config.user_access_token;
        }
        if (config.user_refresh_token) {
            const refreshed = await refreshFeishuUserToken(config.app_id, config.app_secret, config.user_refresh_token);
            if (refreshed) {
                config.user_access_token = refreshed.access_token;
                config.user_refresh_token = refreshed.refresh_token;
                config.token_expires_at = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
                (0, db_1.saveFeishuConfig)(config);
                return refreshed.access_token;
            }
        }
    }
    return await getFeishuTenantToken(config.app_id, config.app_secret);
}
async function sendFeishuMessageToUser(userId, content, msgType = "interactive") {
    const config = (0, db_1.loadFeishuConfig)();
    if (!userId || userId === "test") {
        if (config.authorized_user?.open_id) {
            userId = config.authorized_user.open_id;
        }
        else {
            console.log("[飞书通知] 未配置用户 ID，请先完成授权");
            return false;
        }
    }
    const token = await getValidFeishuToken();
    if (!token) {
        console.log("[飞书通知] 无法获取 Token，请检查 App ID 和 Secret");
        return false;
    }
    try {
        const response = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                receive_id: userId,
                msg_type: msgType,
                content: typeof content === "string" ? content : JSON.stringify(content)
            })
        });
        const result = await response.json();
        if (result.code === 0) {
            console.log("[飞书通知] 消息发送成功");
            return true;
        }
        else {
            console.error("[飞书通知] 消息发送失败:", result.msg);
            return false;
        }
    }
    catch (e) {
        console.error("[飞书通知] 发送失败:", e.message);
        return false;
    }
}
function buildFeishuReportCard(title, markdown) {
    return {
        config: { wide_screen_mode: true },
        header: { title: { tag: "plain_text", content: String(title || "开发报告").slice(0, 80) }, template: "blue" },
        elements: [{
                tag: "div",
                text: { tag: "lark_md", content: String(markdown || "暂无内容").slice(0, 12000) },
            }],
    };
}
async function sendFeishuWebhookReportMessage(config, options) {
    const webhookUrl = String(config.webhook_url || "").trim();
    if (!webhookUrl)
        return { success: false, error: "请先配置飞书群机器人 Webhook 地址" };
    const body = { msg_type: "interactive", card: buildFeishuReportCard(options.title, options.markdown) };
    const signKey = String(config.sign_key || "").trim();
    if (signKey && signKey !== "******") {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        body.timestamp = timestamp;
        body.sign = crypto.createHmac("sha256", signKey).update(`${timestamp}\n${signKey}`).digest("base64");
    }
    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const result = await response.json();
        if (result.code === 0 || result.StatusCode === 0) {
            return { success: true, target_type: "webhook", target_id: webhookUrl.replace(/(hook|webhook)\/.+$/i, "$1/***") };
        }
        return { success: false, error: result.msg || result.StatusMessage || `飞书机器人接口错误 ${result.code ?? result.StatusCode ?? response.status}`, code: result.code ?? result.StatusCode };
    }
    catch (error) {
        return { success: false, error: error?.message || "飞书机器人发送失败" };
    }
}
async function sendFeishuReportMessage(options) {
    const config = (0, db_1.loadFeishuConfig)();
    if (config.enabled === false)
        return { success: false, error: "飞书全局推送已关闭" };
    return sendFeishuWebhookReportMessage(config, options);
}
//# sourceMappingURL=feishu.js.map