import * as crypto from "crypto";
import { loadFeishuConfig, saveFeishuConfig } from "../../core/db";

export const FEISHU_SCOPES = [
  "im:message",
  "im:message.group_at_msg",
  "im:chat",
  "im:chat:readonly",
  "contact:user.id:readonly",
];

async function getFeishuTenantToken(appId: string, appSecret: string): Promise<string | null> {
  try {
    const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    });
    const data = await response.json() as any;
    return data.tenant_access_token || null;
  } catch (e: any) {
    console.error("获取飞书 tenant_access_token 失败:", e.message);
    return null;
  }
}

async function getControlBotTenantToken(): Promise<string | null> {
  const config = loadFeishuConfig();
  const appId = String(config.control_bot_app_id || config.app_id || "").trim();
  const appSecret = String(config.control_bot_app_secret || config.app_secret || "").trim();
  if (!appId || !appSecret) return null;
  return getFeishuTenantToken(appId, appSecret);
}

export async function downloadFeishuMessageResource(input: {
  messageId: string;
  fileKey: string;
  type?: "file" | "image";
  maxBytes?: number;
}) {
  const messageId = String(input.messageId || "").trim();
  const fileKey = String(input.fileKey || "").trim();
  if (!messageId || !fileKey) throw new Error("飞书附件缺少 message_id 或 file_key");
  const token = await getControlBotTenantToken();
  if (!token) throw new Error("无法获取飞书控制机器人 Token");
  const type = input.type === "image" ? "image" : "file";
  const maxBytes = Math.max(1, Number(input.maxBytes || 25 * 1024 * 1024));
  const response = await fetch(
    `https://open.feishu.cn/open-apis/im/v1/messages/${encodeURIComponent(messageId)}/resources/${encodeURIComponent(fileKey)}?type=${type}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`飞书附件下载失败 HTTP ${response.status}: ${detail.slice(0, 240)}`);
  }
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > maxBytes) throw new Error(`飞书附件超过 ${Math.floor(maxBytes / 1024 / 1024)} MB`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxBytes) throw new Error(`飞书附件超过 ${Math.floor(maxBytes / 1024 / 1024)} MB`);
  return {
    buffer,
    content_type: String(response.headers.get("content-type") || ""),
    content_disposition: String(response.headers.get("content-disposition") || ""),
    size: buffer.length,
  };
}

export async function getFeishuUserToken(appId: string, appSecret: string, code: string): Promise<any> {
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
    const data = await response.json() as any;
    if (data.code === 0) {
      return data.data;
    }
    console.error("获取 user_access_token 失败:", data.msg);
    return null;
  } catch (e: any) {
    console.error("获取 user_access_token 失败:", e.message);
    return null;
  }
}

async function refreshFeishuUserToken(appId: string, appSecret: string, refreshToken: string): Promise<any> {
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
    const data = await response.json() as any;
    if (data.code === 0) {
      return data.data;
    }
    return null;
  } catch (e: any) {
    console.error("刷新 user_access_token 失败:", e.message);
    return null;
  }
}

export async function getFeishuUserInfo(accessToken: string): Promise<any> {
  try {
    const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/user_info", {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    const data = await response.json() as any;
    if (data.code === 0) {
      return data.data;
    }
    return null;
  } catch (e: any) {
    console.error("获取用户信息失败:", e.message);
    return null;
  }
}

export async function getFeishuChatList(accessToken: string): Promise<any[]> {
  try {
    const response = await fetch("https://open.feishu.cn/open-apis/im/v1/chats?page_size=50", {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    const data = await response.json() as any;
    if (data.code === 0) {
      return data.data.items || [];
    }
    return [];
  } catch (e: any) {
    console.error("获取群聊列表失败:", e.message);
    return [];
  }
}

export async function getValidFeishuToken() {
  const config = loadFeishuConfig();
  if (!config.app_id || !config.app_secret) return null;

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
        saveFeishuConfig(config);
        return refreshed.access_token;
      }
    }
  }

  return await getFeishuTenantToken(config.app_id, config.app_secret);
}

export async function sendFeishuMessageToUser(userId: string, content: string, msgType: string = "interactive"): Promise<boolean> {
  const config = loadFeishuConfig();
  if (!userId || userId === "test") {
    if (config.authorized_user?.open_id) {
      userId = config.authorized_user.open_id;
    } else {
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

    const result = await response.json() as any;
    if (result.code === 0) {
      console.log("[飞书通知] 消息发送成功");
      return true;
    } else {
      console.error("[飞书通知] 消息发送失败:", result.msg);
      return false;
    }
  } catch (e: any) {
    console.error("[飞书通知] 发送失败:", e.message);
    return false;
  }
}

export async function sendFeishuMessageToTarget(options: {
  receiveId: string;
  receiveIdType?: "chat_id" | "open_id" | "user_id";
  title?: string;
  markdown?: string;
  text?: string;
}): Promise<any> {
  const receiveId = String(options.receiveId || "").trim();
  const receiveIdType = options.receiveIdType || "chat_id";
  if (!receiveId) return { success: false, error: "缺少飞书接收目标" };
  if (!["chat_id", "open_id", "user_id"].includes(receiveIdType)) return { success: false, error: "飞书接收目标类型无效" };
  const token = await getControlBotTenantToken();
  if (!token) return { success: false, error: "无法获取飞书控制机器人 Token" };
  const title = String(options.title || "任务进度").slice(0, 80);
  const markdown = String(options.markdown || options.text || "暂无内容").slice(0, 12000);
  const card = buildFeishuReportCard(title, markdown);
  try {
    const response = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${encodeURIComponent(receiveIdType)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ receive_id: receiveId, msg_type: "interactive", content: JSON.stringify(card) }),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json() as any;
    if (response.ok && result.code === 0) {
      return { success: true, target_type: receiveIdType, target_id: receiveId, message_id: result.data?.message_id || "" };
    }
    return { success: false, error: result.msg || `飞书消息接口错误 ${result.code ?? response.status}`, code: result.code ?? response.status };
  } catch (error: any) {
    return { success: false, error: error?.message || "飞书定向消息发送失败" };
  }
}

export async function probeFeishuControlBotApi(): Promise<any> {
  const startedAt = Date.now();
  const token = await getControlBotTenantToken();
  if (!token) return { success: false, latency_ms: Date.now() - startedAt, error: "无法获取飞书控制机器人 Token" };
  try {
    const response = await fetch("https://open.feishu.cn/open-apis/bot/v3/info", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json() as any;
    return {
      success: response.ok && result.code === 0,
      latency_ms: Date.now() - startedAt,
      bot_name: result.bot?.app_name || result.data?.bot?.app_name || "",
      error: response.ok && result.code === 0 ? "" : result.msg || `飞书探测失败 (${response.status})`,
    };
  } catch (error: any) {
    return { success: false, latency_ms: Date.now() - startedAt, error: error?.message || "飞书探测失败" };
  }
}

function buildFeishuReportCard(title: string, markdown: string) {
  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: String(title || "开发报告").slice(0, 80) }, template: "blue" },
    elements: [{
      tag: "div",
      text: { tag: "lark_md", content: String(markdown || "暂无内容").slice(0, 12000) },
    }],
  };
}

async function sendFeishuWebhookReportMessage(config: any, options: { title: string; markdown: string }): Promise<any> {
  const webhookUrl = String(config.webhook_url || "").trim();
  if (!webhookUrl) return { success: false, error: "请先配置飞书群机器人 Webhook 地址" };
  const body: any = { msg_type: "interactive", card: buildFeishuReportCard(options.title, options.markdown) };
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
    const result = await response.json() as any;
    if (result.code === 0 || result.StatusCode === 0) {
      return { success: true, target_type: "webhook", target_id: webhookUrl.replace(/(hook|webhook)\/.+$/i, "$1/***") };
    }
    return { success: false, error: result.msg || result.StatusMessage || `飞书机器人接口错误 ${result.code ?? result.StatusCode ?? response.status}`, code: result.code ?? result.StatusCode };
  } catch (error: any) {
    return { success: false, error: error?.message || "飞书机器人发送失败" };
  }
}

export async function sendFeishuReportMessage(options: {
  title: string;
  markdown: string;
}): Promise<any> {
  const config = loadFeishuConfig();
  if (config.enabled === false) return { success: false, error: "飞书全局推送已关闭" };
  return sendFeishuWebhookReportMessage(config, options);
}
