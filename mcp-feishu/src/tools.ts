import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  FeishuClient,
  parseMessageContent,
  formatTimestamp,
} from "./feishu-client.js";

export function registerTools(server: McpServer, client: FeishuClient) {
  // Tool 1: 列出群聊
  server.tool(
    "list_chats",
    "列出机器人所在的飞书群聊。返回群聊名称、chat_id、成员数量等信息。",
    {
      page_size: z
        .number()
        .optional()
        .describe("每页返回数量，默认20，最大100"),
      page_token: z.string().optional().describe("分页标记，首次请求不填"),
    },
    async (params) => {
      const data = await client.listChats(
        params.page_size || 20,
        params.page_token
      );

      const items = data.items || [];
      const lines = items.map(
        (chat: any, i: number) =>
          `${i + 1}. ${chat.name || "未命名群聊"} (chat_id: ${chat.chat_id}, 成员数: ${chat.user_count || "?"}, 描述: ${chat.description || "无"})`
      );

      const result = [
        `找到 ${items.length} 个群聊（共 ${data.page_token ? "更多" : items.length} 个）：`,
        "",
        ...lines,
      ];

      if (data.page_token) {
        result.push("", `下一页标记: ${data.page_token}`);
      }

      return { content: [{ type: "text" as const, text: result.join("\n") }] };
    }
  );

  // Tool 2: 获取群聊历史消息
  server.tool(
    "get_chat_history",
    "获取指定飞书群聊的历史消息。需要提供chat_id（通过list_chats获取）。返回消息列表，包含发送者、时间、内容。注意：飞书的start_time和end_time是Unix时间戳（秒级字符串），日期转换示例：2025-05-28 00:00:00 UTC+8 → '1748361600'",
    {
      chat_id: z.string().describe("群聊ID，通过 list_chats 获取"),
      start_time: z
        .string()
        .optional()
        .describe(
          "起始时间，Unix时间戳（秒级字符串），如 '1748361600' 表示 2025-05-28"
        ),
      end_time: z
        .string()
        .optional()
        .describe("结束时间，Unix时间戳（秒级字符串）"),
      page_size: z
        .number()
        .optional()
        .describe("返回消息数量，默认20，最大50"),
      page_token: z.string().optional().describe("分页标记"),
    },
    async (params) => {
      const [history, chatInfo] = await Promise.all([
        client.getChatHistory(
          params.chat_id,
          params.start_time,
          params.end_time,
          params.page_size || 20,
          params.page_token
        ),
        client.getChatInfo(params.chat_id).catch(() => null),
      ]);

      const chatName = chatInfo?.name || params.chat_id;
      const items = history.items || [];

      const lines = items.map((msg: any) => {
        const sender = msg.sender?.id || "未知";
        const time = formatTimestamp(msg.create_time);
        const content = parseMessageContent(msg.msg_type, msg.body?.content || "{}");
        return `[${time}] ${sender}: ${content}`;
      });

      const result = [
        `群聊「${chatName}」的消息记录（共 ${items.length} 条）：`,
        "",
        ...lines,
      ];

      if (history.page_token) {
        result.push("", `下一页标记: ${history.page_token}`);
      }

      return { content: [{ type: "text" as const, text: result.join("\n") }] };
    }
  );

  // Tool 3: 搜索消息（本地过滤）
  server.tool(
    "search_messages",
    "在飞书群聊中搜索包含关键词的消息。此工具通过拉取最近消息并在本地过滤实现，搜索范围限制在最近50条消息内。建议先用list_chats获取chat_id，再指定chat_id搜索以提高效率。",
    {
      query: z.string().describe("搜索关键词"),
      chat_id: z
        .string()
        .optional()
        .describe("限定在某个群聊中搜索，不填则搜索所有群聊"),
      start_time: z.string().optional().describe("起始时间，Unix时间戳（秒级字符串）"),
      end_time: z.string().optional().describe("结束时间，Unix时间戳（秒级字符串）"),
    },
    async (params) => {
      const chatIds: string[] = [];

      if (params.chat_id) {
        chatIds.push(params.chat_id);
      } else {
        // 搜索所有群聊
        let pageToken: string | undefined;
        do {
          const chats = await client.listChats(100, pageToken);
          for (const chat of chats.items || []) {
            chatIds.push(chat.chat_id);
          }
          pageToken = chats.page_token;
        } while (pageToken);
      }

      const matches: string[] = [];
      const query = params.query.toLowerCase();

      for (const chatId of chatIds) {
        try {
          const history = await client.getChatHistory(
            chatId,
            params.start_time,
            params.end_time,
            50
          );
          const chatInfo = await client
            .getChatInfo(chatId)
            .catch(() => null);
          const chatName = chatInfo?.name || chatId;

          for (const msg of history.items || []) {
            const content = parseMessageContent(
              msg.msg_type,
              msg.body?.content || "{}"
            );
            if (content.toLowerCase().includes(query)) {
              const time = formatTimestamp(msg.create_time);
              const sender = msg.sender?.id || "未知";
              matches.push(
                `[群聊: ${chatName}] [${time}] ${sender}: ${content}`
              );
            }
          }
        } catch (err) {
          // 跳过无权限的群聊
          matches.push(`[跳过群聊 ${chatId}: 无权限或获取失败]`);
        }
      }

      if (matches.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `搜索「${params.query}」未找到匹配消息。尝试扩大搜索范围或使用 get_chat_history 获取更多消息。`,
            },
          ],
        };
      }

      const result = [
        `搜索「${params.query}」找到 ${matches.length} 条匹配消息：`,
        "",
        ...matches,
      ];

      return { content: [{ type: "text" as const, text: result.join("\n") }] };
    }
  );

  // Tool 4: 获取消息详情
  server.tool(
    "get_message_detail",
    "获取飞书消息的完整详情，包括完整的富文本内容、附件信息等。message_id格式如 om_xxxxx。",
    {
      message_id: z.string().describe("消息ID，格式如 om_xxxxx"),
    },
    async (params) => {
      const data = await client.getMessageDetail(params.message_id);
      const msg = data.items?.[0] || data;

      const content = parseMessageContent(
        msg.msg_type,
        msg.body?.content || "{}"
      );
      const time = formatTimestamp(msg.create_time);
      const sender = msg.sender?.id || "未知";

      const result = [
        `消息详情：`,
        `  ID: ${msg.message_id}`,
        `  类型: ${msg.msg_type}`,
        `  发送者: ${sender}`,
        `  时间: ${time}`,
        `  内容:`,
        content,
      ];

      return { content: [{ type: "text" as const, text: result.join("\n") }] };
    }
  );
}
