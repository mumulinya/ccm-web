#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FeishuClient, parseMessageContent, formatTimestamp } from "./feishu-client.js";
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
    console.error("错误: 请设置环境变量 FEISHU_APP_ID 和 FEISHU_APP_SECRET");
    console.error(`  方式1: 创建 ${envPath} 文件，写入 FEISHU_APP_ID=xxx 和 FEISHU_APP_SECRET=xxx`);
    console.error("  方式2: 设置系统环境变量");
    process.exit(1);
}
const client = new FeishuClient(appId, appSecret);
// 简易参数解析
const args = process.argv.slice(2);
const command = args[0];
function getArg(name) {
    const idx = args.indexOf(`--${name}`);
    if (idx !== -1 && idx + 1 < args.length)
        return args[idx + 1];
    return undefined;
}
function getArgNum(name, def) {
    const val = getArg(name);
    return val ? Number(val) : def;
}
async function listChats() {
    const pageSize = getArgNum("page-size", 20);
    const pageToken = getArg("page-token");
    const data = await client.listChats(pageSize, pageToken);
    const items = data.items || [];
    console.log(`找到 ${items.length} 个群聊：\n`);
    for (let i = 0; i < items.length; i++) {
        const chat = items[i];
        console.log(`${i + 1}. ${chat.name || "未命名群聊"}`);
        console.log(`   chat_id: ${chat.chat_id}`);
        console.log(`   成员数: ${chat.user_count || "?"}`);
        console.log(`   描述: ${chat.description || "无"}`);
        console.log();
    }
    if (data.page_token) {
        console.log(`下一页标记: ${data.page_token}`);
    }
}
async function getHistory() {
    const chatId = getArg("chat-id");
    if (!chatId) {
        console.error("错误: 请提供 --chat-id 参数（通过 list-chats 获取）");
        process.exit(1);
    }
    const startTime = getArg("start-time");
    const endTime = getArg("end-time");
    const pageSize = getArgNum("page-size", 20);
    const pageToken = getArg("page-token");
    const [history, chatInfo] = await Promise.all([
        client.getChatHistory(chatId, startTime || undefined, endTime || undefined, pageSize, pageToken || undefined),
        client.getChatInfo(chatId).catch(() => null),
    ]);
    const chatName = chatInfo?.name || chatId;
    const items = history.items || [];
    console.log(`群聊「${chatName}」的消息记录（共 ${items.length} 条）：\n`);
    for (const msg of items) {
        const sender = msg.sender?.id || "未知";
        const time = formatTimestamp(msg.create_time);
        const content = parseMessageContent(msg.msg_type, msg.body?.content || "{}");
        console.log(`[${time}] ${sender}: ${content}`);
    }
    if (history.page_token) {
        console.log(`\n下一页标记: ${history.page_token}`);
    }
}
async function search() {
    const query = getArg("query");
    if (!query) {
        console.error("错误: 请提供 --query 参数");
        process.exit(1);
    }
    const chatId = getArg("chat-id");
    const startTime = getArg("start-time");
    const endTime = getArg("end-time");
    const chatIds = [];
    if (chatId) {
        chatIds.push(chatId);
    }
    else {
        console.error("正在获取所有群聊...");
        let pageToken;
        do {
            const chats = await client.listChats(100, pageToken);
            for (const chat of chats.items || []) {
                chatIds.push(chat.chat_id);
            }
            pageToken = chats.page_token;
        } while (pageToken);
    }
    console.error(`正在搜索 ${chatIds.length} 个群聊中的「${query}」...`);
    const matches = [];
    const queryLower = query.toLowerCase();
    for (const id of chatIds) {
        try {
            const history = await client.getChatHistory(id, startTime || undefined, endTime || undefined, 50);
            const chatInfo = await client.getChatInfo(id).catch(() => null);
            const chatName = chatInfo?.name || id;
            for (const msg of history.items || []) {
                const content = parseMessageContent(msg.msg_type, msg.body?.content || "{}");
                if (content.toLowerCase().includes(queryLower)) {
                    const time = formatTimestamp(msg.create_time);
                    const sender = msg.sender?.id || "未知";
                    matches.push(`[群聊: ${chatName}] [${time}] ${sender}: ${content}`);
                }
            }
        }
        catch {
            // 跳过无权限的群聊
        }
    }
    if (matches.length === 0) {
        console.log(`搜索「${query}」未找到匹配消息。`);
        return;
    }
    console.log(`\n搜索「${query}」找到 ${matches.length} 条匹配消息：\n`);
    for (const m of matches) {
        console.log(m);
    }
}
async function getDetail() {
    const messageId = getArg("message-id");
    if (!messageId) {
        console.error("错误: 请提供 --message-id 参数");
        process.exit(1);
    }
    const data = await client.getMessageDetail(messageId);
    const msg = data.items?.[0] || data;
    const content = parseMessageContent(msg.msg_type, msg.body?.content || "{}");
    const time = formatTimestamp(msg.create_time);
    console.log(`消息详情：`);
    console.log(`  ID: ${msg.message_id}`);
    console.log(`  类型: ${msg.msg_type}`);
    console.log(`  发送者: ${msg.sender?.id || "未知"}`);
    console.log(`  时间: ${time}`);
    console.log(`  内容:`);
    console.log(content);
}
function printUsage() {
    console.log(`飞书消息 CLI 工具

用法:
  feishu-cli <command> [options]

命令:
  list-chats              列出机器人所在的群聊
  get-history             获取群聊历史消息
  search                  搜索包含关键词的消息
  get-detail              获取消息详情

选项:
  --chat-id <id>          群聊ID（get-history/search 必填或可选）
  --query <keyword>       搜索关键词（search 必填）
  --message-id <id>       消息ID（get-detail 忣填）
  --start-time <ts>       起始时间，Unix时间戳（秒）
  --end-time <ts>         结束时间，Unix时间戳（秒）
  --page-size <n>         每页数量（默认20）
  --page-token <token>    分页标记

示例:
  feishu-cli list-chats
  feishu-cli get-history --chat-id oc_xxxxx
  feishu-cli search --query "需求" --chat-id oc_xxxxx
  feishu-cli get-detail --message-id om_xxxxx`);
}
const commands = {
    "list-chats": listChats,
    "get-history": getHistory,
    search: search,
    "get-detail": getDetail,
};
if (!command || command === "--help" || command === "-h") {
    printUsage();
    process.exit(0);
}
if (!commands[command]) {
    console.error(`未知命令: ${command}\n`);
    printUsage();
    process.exit(1);
}
commands[command]().catch((err) => {
    console.error("执行失败:", err.message);
    process.exit(1);
});
