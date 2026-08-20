import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  FeishuClient,
  parseMessageContent,
  formatTimestamp,
} from "./feishu-client.js";

export function registerTools(server: McpServer, client: FeishuClient) {
  // Tool 1: list chats
  server.tool(
    "list_chats",
    "List Feishu chats where the bot is a member. Return chat names, chat IDs, member counts, and related metadata.",
    {
      page_size: z
        .number()
        .optional()
        .describe("Number of chats per page. Defaults to 20 and is capped at 100."),
      page_token: z.string().optional().describe("Pagination token. Omit on the first request."),
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

  // Tool 2: get chat history
  server.tool(
    "get_chat_history",
    "Read historical messages from a specified Feishu chat. The chat_id comes from list_chats. Results include sender, time, and content. Feishu start_time and end_time use Unix timestamps in seconds as strings; for example, 2025-05-28 00:00:00 UTC+8 is '1748361600'.",
    {
      chat_id: z.string().describe("Feishu chat ID returned by list_chats."),
      start_time: z
        .string()
        .optional()
        .describe(
          "Start time as a Unix timestamp in seconds, represented as a string; for example '1748361600'."
        ),
      end_time: z
        .string()
        .optional()
        .describe("End time as a Unix timestamp in seconds, represented as a string."),
      page_size: z
        .number()
        .optional()
        .describe("Number of messages to return. Defaults to 20 and is capped at 50."),
      page_token: z.string().optional().describe("Pagination token."),
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

  // Tool 3: search messages (local filtering)
  server.tool(
    "search_messages",
    "Search Feishu chat messages containing a query. The tool fetches recent messages and filters locally; the search is limited to the latest 50 messages. Prefer list_chats first and pass chat_id to keep the search bounded.",
    {
      query: z.string().describe("Message search query."),
      chat_id: z
        .string()
        .optional()
        .describe("Limit the search to one chat. Omit to search all authorized chats."),
      start_time: z.string().optional().describe("Start time as a Unix timestamp in seconds."),
      end_time: z.string().optional().describe("End time as a Unix timestamp in seconds."),
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

  // Tool 4: get message details
  server.tool(
    "get_message_detail",
    "Read complete Feishu message details, including rich text content and attachments. message_id has a format such as om_xxxxx.",
    {
      message_id: z.string().describe("Feishu message ID, for example om_xxxxx."),
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
