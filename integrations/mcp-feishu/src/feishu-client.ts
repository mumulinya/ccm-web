interface TokenCache {
  token: string;
  expiry: number;
}

interface FeishuResponse {
  code: number;
  msg: string;
  data: any;
}

export class FeishuClient {
  private appId: string;
  private appSecret: string;
  private tokenCache: TokenCache | null = null;
  private baseUrl = "https://open.feishu.cn/open-apis";

  constructor(appId: string, appSecret: string) {
    this.appId = appId;
    this.appSecret = appSecret;
  }

  async getAccessToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiry) {
      return this.tokenCache.token;
    }

    const res = await fetch(
      `${this.baseUrl}/auth/v3/tenant_access_token/internal`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: this.appId,
          app_secret: this.appSecret,
        }),
      }
    );

    const data = (await res.json()) as {
      code: number;
      msg: string;
      tenant_access_token: string;
      expire: number;
    };

    if (data.code !== 0) {
      throw new Error(`获取 tenant_access_token 失败: ${data.msg}`);
    }

    this.tokenCache = {
      token: data.tenant_access_token,
      // 提前 5 分钟刷新
      expiry: Date.now() + (data.expire - 300) * 1000,
    };

    return this.tokenCache.token;
  }

  private async request(
    method: string,
    path: string,
    params?: Record<string, string>,
    body?: any
  ): Promise<any> {
    const token = await this.getAccessToken();
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, v);
      }
    }

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url.toString(), options);
    const data = (await res.json()) as FeishuResponse;

    if (data.code !== 0) {
      throw new Error(`飞书 API 错误 (${path}): [${data.code}] ${data.msg}`);
    }

    return data.data;
  }

  async listChats(pageSize = 20, pageToken?: string) {
    return this.request("GET", "/im/v1/chats", {
      page_size: String(pageSize),
      page_token: pageToken || "",
    });
  }

  async getChatHistory(
    chatId: string,
    startTime?: string,
    endTime?: string,
    pageSize = 20,
    pageToken?: string
  ) {
    return this.request("GET", "/im/v1/messages", {
      container_id_type: "chat",
      container_id: chatId,
      start_time: startTime || "",
      end_time: endTime || "",
      sort_type: "ByCreateTimeDesc",
      page_size: String(Math.min(pageSize, 50)),
      page_token: pageToken || "",
    });
  }

  async getMessageDetail(messageId: string) {
    return this.request("GET", `/im/v1/messages/${messageId}`);
  }

  async getChatInfo(chatId: string) {
    return this.request("GET", `/im/v1/chats/${chatId}`);
  }

  async getChatMembers(chatId: string) {
    return this.request("GET", `/im/v1/chats/${chatId}/members`);
  }
}

export function parseMessageContent(msgType: string, content: string): string {
  try {
    const parsed = JSON.parse(content);
    switch (msgType) {
      case "text":
        return parsed.text || "";

      case "post": {
        // 富文本消息，递归提取文本
        const lines: string[] = [];
        const title = parsed.title || "";
        if (title) lines.push(title);

        const content = parsed.content || parsed.zh_cn?.content || parsed.en_us?.content || [];
        for (const line of content) {
          if (Array.isArray(line)) {
            const texts = line
              .map((node: any) => {
                if (node.tag === "text") return node.text || "";
                if (node.tag === "a") return `${node.text || ""}(${node.href || ""})`;
                if (node.tag === "at") return `@${node.user_name || node.user_id || ""}`;
                if (node.tag === "img") return "[图片]";
                if (node.tag === "media") return "[媒体]";
                if (node.tag === "emotion") return "[表情]";
                return "";
              })
              .filter(Boolean)
              .join("");
            if (texts) lines.push(texts);
          }
        }
        return lines.join("\n") || "[富文本消息]";
      }

      case "interactive": {
        // 卡片消息
        const elements = parsed.elements || parsed.i18n_elements?.zh_cn || [];
        const texts: string[] = [];
        if (parsed.header?.title?.content) {
          texts.push(parsed.header.title.content);
        }
        for (const el of elements) {
          if (el.tag === "div" && el.text?.content) texts.push(el.text.content);
          if (el.tag === "markdown" && el.content) texts.push(el.content);
          if (el.tag === "plain_text" && el.content) texts.push(el.content);
        }
        return texts.join("\n") || "[卡片消息]";
      }

      case "image":
        return "[图片消息]";
      case "file":
        return `[文件消息: ${parsed.file_name || "未知文件"}]`;
      case "audio":
        return "[语音消息]";
      case "media":
        return "[视频消息]";
      case "sticker":
        return "[表情包]";
      case "share_chat":
        return `[分享群聊: ${parsed.chat_name || ""}]`;
      case "share_user":
        return `[分享名片]`;
      case "system":
        return "[系统消息]";
      default:
        return `[未支持的消息类型: ${msgType}]`;
    }
  } catch {
    return `[消息解析失败: ${msgType}]`;
  }
}

export function formatTimestamp(ts: string): string {
  // 飞书时间戳是毫秒级字符串
  const date = new Date(Number(ts));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
