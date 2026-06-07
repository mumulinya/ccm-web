import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  sendJson,
  GROUPS_FILE,
  GROUP_MESSAGES_DIR,
  GROUP_LOGS_FILE_SHARED,
  UPLOAD_DIR,
  SHARED_DIR,
  CCM_DIR,
  GROUP_LOGS_FILE,
} from "../utils";
import {
  loadTasks,
  saveTasks,
  getConfigs,
  getConfigInfo,
  loadFeishuConfig,
  saveFeishuConfig
} from "../db";

// === 任务队列系统（支持并行执行）===
const taskQueues = new Map<string, string[]>(); // 每个目标（群聊/Agent）独立队列
const runningTasks = new Map<string, boolean>(); // 正在运行的任务目标
const runningTaskIds = new Set<string>(); // 正在运行的任务 ID

// 优先级权重
const PRIORITY_WEIGHT: Record<string, number> = { high: 3, normal: 2, low: 1 };

// === 群聊管理 ===
function loadGroups() {
  if (!fs.existsSync(GROUPS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(GROUPS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveGroups(groups: any[]) {
  fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
}

function getGroupMessages(groupId: string) {
  const file = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return [];
  }
}

function appendGroupMessage(groupId: string, msg: any) {
  const messages = getGroupMessages(groupId);
  messages.push(msg);
  if (!fs.existsSync(GROUP_MESSAGES_DIR)) {
    fs.mkdirSync(GROUP_MESSAGES_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(GROUP_MESSAGES_DIR, `${groupId}.json`), JSON.stringify(messages, null, 2));
}

function safeAddGroupLog(groupId: string, level: string, category: string, message: string, details: any = null) {
  try {
    const logs = fs.existsSync(GROUP_LOGS_FILE_SHARED)
      ? JSON.parse(fs.readFileSync(GROUP_LOGS_FILE_SHARED, "utf-8"))
      : {};
    if (!logs[groupId]) logs[groupId] = [];
    logs[groupId].push({
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details
    });
    if (logs[groupId].length > 500) logs[groupId] = logs[groupId].slice(-500);
    fs.writeFileSync(GROUP_LOGS_FILE_SHARED, JSON.stringify(logs, null, 2));
  } catch (e: any) {
    console.error("保存群聊日志失败:", e.message);
  }
}

// === 群聊日志管理 ===
function loadGroupLogs() {
  try {
    if (fs.existsSync(GROUP_LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(GROUP_LOGS_FILE, "utf-8"));
    }
  } catch (e: any) {
    console.error("加载群聊日志失败:", e.message);
  }
  return {};
}

function saveGroupLogs(logs: any) {
  try {
    fs.writeFileSync(GROUP_LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (e: any) {
    console.error("保存群聊日志失败:", e.message);
  }
}

function addGroupLog(groupId: string, level: string, category: string, message: string, details: any = null) {
  const logs = loadGroupLogs();
  if (!logs[groupId]) logs[groupId] = [];

  logs[groupId].push({
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details
  });

  if (logs[groupId].length > 500) {
    logs[groupId] = logs[groupId].slice(-500);
  }

  saveGroupLogs(logs);
}

// === 任务日志系统 ===
const TASK_LOGS_FILE = path.join(CCM_DIR, "task-logs.json");

function loadTaskLogs() {
  try {
    if (fs.existsSync(TASK_LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(TASK_LOGS_FILE, "utf-8"));
    }
  } catch (e: any) {
    console.error("加载任务日志失败:", e.message);
  }
  return {};
}

function saveTaskLogs(logs: any): void {
  try {
    fs.writeFileSync(TASK_LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (e: any) {
    console.error("保存任务日志失败:", e.message);
  }
}

function addTaskLog(taskId: string, level: string, message: string): void {
  const logs = loadTaskLogs();
  if (!logs[taskId]) logs[taskId] = [];

  logs[taskId].push({
    timestamp: new Date().toISOString(),
    level,
    message
  });

  if (logs[taskId].length > 100) {
    logs[taskId] = logs[taskId].slice(-100);
  }

  saveTaskLogs(logs);
  console.log(`[任务日志] [${taskId}] [${level}] ${message.substring(0, 100)}`);
}

function getTaskLogs(taskId: string, limit = 50) {
  const logs = loadTaskLogs();
  const taskLogs = logs[taskId] || [];
  return taskLogs.slice(-limit);
}

function clearTaskLogs(taskId: string) {
  const logs = loadTaskLogs();
  delete logs[taskId];
  saveTaskLogs(logs);
}

// === 飞书消息与认证模块 ===
export const FEISHU_SCOPES = [
  "im:message",           // 发送消息
  "im:message.group_at_msg", // 群聊 @ 消息
  "im:chat",              // 获取群聊信息
  "im:chat:readonly",     // 读取群聊信息
  "contact:user.id:readonly", // 读取用户 ID
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

async function getFeishuUserToken(appId: string, appSecret: string, code: string): Promise<any> {
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

async function getFeishuUserInfo(accessToken: string): Promise<any> {
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

async function getFeishuChatList(accessToken: string): Promise<any[]> {
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

async function getValidFeishuToken() {
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

async function sendFeishuMessageToUser(userId: string, content: string, msgType: string = "interactive"): Promise<boolean> {
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

async function sendTaskCompletionNotification(task: any, result: string) {
  const config = loadFeishuConfig();
  const userId = config.authorized_user?.open_id || config.notify_user_id;
  if (!userId) {
    console.log("[飞书通知] 未配置通知用户，请先完成授权");
    return;
  }
  const resultSummary = result.substring(0, 200) + (result.length > 200 ? "..." : "");
  const cardContent = {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: "✅ 任务完成通知" },
      template: "green"
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `**任务标题**：${task.title}\n**目标项目**：${task.target_project || '群聊'}\n**优先级**：${task.priority === 'high' ? '🔴 高' : task.priority === 'normal' ? '🟡 中' : '⚪ 低'}\n**完成时间**：${new Date().toLocaleString("zh-CN")}`
        }
      },
      { tag: "hr" },
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `**执行结果**：\n${resultSummary}`
        }
      }
    ]
  };
  await sendFeishuMessageToUser(userId, JSON.stringify(cardContent), "interactive");
}

async function sendTaskFailureNotification(task: any, errorMsg: string) {
  const config = loadFeishuConfig();
  const userId = config.authorized_user?.open_id || config.notify_user_id;
  if (!userId) {
    console.log("[飞书通知] 未配置通知用户，请先完成授权");
    return;
  }
  const cardContent = {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: "❌ 任务执行失败" },
      template: "red"
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `**任务标题**：${task.title}\n**目标项目**：${task.target_project || '群聊'}\n**失败时间**：${new Date().toLocaleString("zh-CN")}`
        }
      },
      { tag: "hr" },
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `**错误信息**：\n${errorMsg.substring(0, 300)}`
        }
      }
    ]
  };
  await sendFeishuMessageToUser(userId, JSON.stringify(cardContent), "interactive");
}

// === 协作与辅助规则 ===
function getTaskTargetKey(task: any) {
  if (task.assign_type === "group" && task.group_id) {
    return `group:${task.group_id}`;
  }
  return `project:${task.target_project}`;
}

function buildGroupCollaborationRules(memberList = "") {
  const members = memberList || "无";
  return `\n\n群聊协作规则：
- 当前群聊成员：${members}
- 这是本地 CCM 群聊协作，不是外部 IM；不要调用飞书、微信、外部机器人或 MCP 通知工具来联系其他 Agent。
- 像团队群聊一样发言：先给出你的判断、依据和下一步，再在确实需要协作时 @ 对方。
- 如需其他 Agent 协助，只能在本群聊里用独立一行 "@项目名 具体任务" 派发，系统会自动转发。
- @ 后面必须写清楚可执行任务、需要确认的问题或交付物，例如：@smart-live-app 请根据后端新增字段适配用户头像展示。
- 只有确实需要对方执行、确认、补充或适配时才 @；普通总结、技术介绍、成员列表、分类标题里不要 @。
- 被 @ 的 Agent 只处理明确点到自己的任务；如果任务不属于自己，要说明原因，并可用独立 @ 行转给更合适的成员。
- 不要声称其他 Agent 已完成尚未回复的工作；需要等待时明确说“已派发，等待某某回复”。`;
}

function buildCoordinatorCollaborationInstructions(memberList = "") {
  return `\n\n你是群聊的主 Agent（协调者），目标是让多个项目 Agent 像团队群聊一样协作，而不是自己包办所有事。${buildGroupCollaborationRules(memberList)}

主 Agent 工作方式：
1. 先判断用户是在咨询、讨论方案、排查问题，还是要求落地修改。
2. 简单问题直接回答；跨项目、需要代码确认或需要多端配合时，再拆给对应 Agent。
3. 派发任务时，每个 @ 行只给一个 Agent 一个清晰任务，说明背景、目标文件/模块、预期输出。
4. 成员回复后，主 Agent 要负责汇总结论、指出冲突、给出下一步；不要重复粘贴所有上下文。
5. 如果本轮只是派发任务，明确说明“已派发，等待回复”，不要提前说完成。
6. 如果信息不足，先问用户一个必要问题；不要随意编造项目状态或实现细节。

推荐回复结构：
- 判断：一句话说明你理解的需求
- 协作安排：需要时列出独立 @ 行
- 当前结论/等待项：告诉用户接下来等谁或你已能直接给出的结论`;
}

function buildMemberCollaborationInstructions(projectName: string, memberList = "") {
  return `\n\n你是群聊中的 ${projectName} Agent，代表这个项目参与协作。${buildGroupCollaborationRules(memberList)}

成员 Agent 工作方式：
1. 只对自己项目职责范围内的内容做确定回答或修改；不确定时说明需要谁补充。
2. 回复要像群聊发言：先给结论，再列关键依据、修改点或风险。
3. 如果需要其他项目配合，用独立一行 @项目名 具体任务；不要泛泛 @。
4. 如果你完成了代码或配置修改，说明改了什么、影响范围和验证方式。
5. 如果只是提供建议，不要伪装成已执行修改。
6. 不要重复整段群聊历史，只引用必要上下文。`;
}

function isActionableMentionText(text: string) {
  const value = String(text || "").trim();
  if (value.length < 4) return false;
  if (/^(收到|好的|了解|谢谢|辛苦了|已完成|完成了|确认收到|ok|OK)[。！!,.，\s]*$/.test(value)) return false;
  return true;
}

function extractActionableMentions(text: string, group: any, sourceProject = "") {
  const members = new Set((group.members || []).map((m: any) => m.project));
  const results: any[] = [];
  const seen = new Set<string>();
  for (const line of String(text || "").split(/\r?\n/)) {
    const normalized = line.trim().replace(/^([>*-]|\d+[.)、]|[（(]\d+[）)])\s*/, "").trim();
    const match = normalized.match(/^@([\w-]+)(?:\s+|[：:，,、-]+)([\s\S]+)$/);
    if (!match) continue;
    const targetName = match[1];
    const message = match[2].trim();
    if (!members.has(targetName) || targetName === sourceProject) continue;
    if (!isActionableMentionText(message)) continue;
    const key = `${targetName}\n${message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ mention: `@${targetName}`, targetName, message });
  }
  return results;
}

function checkTaskCompletion(response: string) {
  if (!response) return false;
  const completionMarkers = [
    "✅ 任务完成", "✅ 已完成", "✅ 完成", "任务已完成",
    "已完成任务", "已经完成", "done", "completed", "finished"
  ];
  const lowerResponse = response.toLowerCase();
  return completionMarkers.some(marker => lowerResponse.includes(marker.toLowerCase()));
}

function checkTaskFailure(response: string) {
  if (!response) return false;
  return /\bAgent 错误:|响应超时|^❌\s*错误|转发给 @.+ 失败/i.test(response);
}

function writeSse(res: any, data: any) {
  if (!res || res.writableEnded || res.destroyed) return;
  try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
}

// === 跨 Agent 并行与递归协作（核心）===
async function processCrossAgents(
  groupId: string,
  group: any,
  sourceProject: string,
  output: string,
  atMentions: any[],
  configs: any[],
  ctx: CollabCtx,
  streamRes: any = null,
  depth = 0
): Promise<string[]> {
  const collectedOutputs: string[] = [];
  if (depth > 3) {
    console.log("[跨Agent协作] 达到最大递归深度，停止继续转发");
    return collectedOutputs;
  }
  const mentionLabels = atMentions.map(m => typeof m === "string" ? m : m.mention).filter(Boolean);
  console.log(`[跨Agent协作] 源: ${sourceProject}, 检测到 @mentions: ${mentionLabels.join(", ")}`);

  const uniqueMentions = atMentions.filter((m, idx, arr) => {
    const key = typeof m === "string" ? m : `${m.targetName}:${m.message}`;
    return arr.findIndex(item => (typeof item === "string" ? item : `${item.targetName}:${item.message}`) === key) === idx;
  });

  for (const mention of uniqueMentions) {
    const mentionStr = typeof mention === "string" ? String(mention) : mention.mention;
    const targetName = typeof mention === "string" ? (mentionStr.startsWith("@") ? mentionStr.slice(1) : mentionStr) : mention.targetName;

    const targetMember = group.members.find((m: any) => m.project === targetName && m.project !== sourceProject);
    if (!targetMember) continue;

    const atRegex = new RegExp(`@${targetName}\\s+([^@]+?)(?=\\s*@|$)`, "is");
    const atMatch = output.match(atRegex);
    let atMessage = typeof mention === "string" ? (atMatch ? atMatch[1].trim() : "") : mention.message;

    if (!atMessage || atMessage.length < 5) {
      const lines = output.split("\n");
      const relevantLines = [];
      let found = false;
      for (const line of lines) {
        if (line.includes(`@${targetName}`)) {
          found = true;
          relevantLines.push(line.replace(`@${targetName}`, "").trim());
        } else if (found && line.trim() && !line.startsWith("@")) {
          relevantLines.push(line.trim());
        } else if (found && line.includes("@")) {
          break;
        }
      }
      atMessage = relevantLines.join("\n").trim() || output.substring(0, 500);
    }

    appendGroupMessage(groupId, {
      id: "m" + Date.now().toString(36) + "fwd",
      role: "assistant", agent: sourceProject,
      content: `📤 → @${targetName}\n${atMessage}`,
      timestamp: new Date().toISOString(),
    });

    let tWorkDir = process.cwd();
    let tAgentType = "claudecode";
    if (targetName === "coordinator") {
      const firstMember = group.members.find((m: any) => m.project !== "coordinator");
      const firstConfig = firstMember ? configs.find(c => c.name === firstMember.project) : configs[0];
      if (firstConfig) {
        tWorkDir = getConfigInfo(firstConfig.path)[0]?.workDir || process.cwd();
      }
    } else {
      const targetConfig = configs.find(c => c.name === targetName);
      if (!targetConfig) continue;
      const tInfo = getConfigInfo(targetConfig.path);
      tWorkDir = tInfo[0]?.workDir;
      tAgentType = tInfo[0]?.agent || "claudecode";
    }

    const tContext = getGroupMessages(groupId).slice(-15).map((m: any) => {
      const who = m.role === "user" ? `[用户 → ${m.target}]` : `[${m.agent || "Agent"}]`;
      return `${who} ${m.content}`;
    }).join("\n");

    const memberList = group.members.map((m: any) => m.project).filter((p: string) => p !== targetName).join(", ");
    const collaborationInstructions = targetName === "coordinator"
      ? buildCoordinatorCollaborationInstructions(group.members.map((m: any) => m.project).filter((p: string) => p !== "coordinator").join(", "))
      : buildMemberCollaborationInstructions(targetName, memberList);
    const tPrompt = `你正在 CCM 群聊中被 @ 请求协作。${collaborationInstructions}

以下是群聊最近的消息记录：
${tContext}

${sourceProject} 刚才 @ 了你，请根据上下文回复他的请求：
${atMessage}

请直接回复本次请求：给出结论、必要的执行/修改说明、风险、汇总意见，或需要继续 @ 的成员。`;

    try {
      const responseMessageId = "m" + Date.now().toString(36) + "cross" + crypto.randomBytes(2).toString("hex");
      let targetFileChanges = null;
      const tOutput = await ctx.callAgentForGroupStream(targetName, tPrompt, tWorkDir, tAgentType, {
        res: streamRes,
        groupId,
        timeoutMs: 300000,
        messageId: responseMessageId,
        onDone: (opts: any) => { targetFileChanges = opts.fileChanges; }
      });
      collectedOutputs.push(tOutput);

      appendGroupMessage(groupId, {
        id: responseMessageId,
        role: "assistant", agent: targetName,
        content: tOutput,
        timestamp: new Date().toISOString(),
        fileChanges: targetFileChanges,
      });

      const nestedMentions = extractActionableMentions(tOutput, group, targetName);
      if (nestedMentions.length > 0) {
        const newMentions = nestedMentions.filter(m => m.targetName !== sourceProject && m.targetName !== targetName);
        if (newMentions.length > 0) {
          const nestedOutputs = await processCrossAgents(groupId, group, targetName, tOutput, newMentions, configs, ctx, streamRes, depth + 1);
          collectedOutputs.push(...nestedOutputs);
        }
      }
    } catch (error: any) {
      console.error(`[跨Agent协作] 调用 Agent ${targetName} 失败:`, error.message);
      collectedOutputs.push(`❌ 转发给 @${targetName} 失败: ${error.message}`);
      appendGroupMessage(groupId, {
        id: "m" + Date.now().toString(36) + "err",
        role: "assistant", agent: "system",
        content: `❌ 转发给 @${targetName} 失败: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
    }
  }
  return collectedOutputs;
}

// === 执行任务核心 ===
async function executeTask(task: any, ctx: CollabCtx) {
  const configs = getConfigs();

  if (task.assign_type === "group" && task.group_id) {
    const groups = loadGroups();
    const group = groups.find(g => g.id === task.group_id);
    if (!group) throw new Error("群聊不存在");

    const message = `📋 执行任务：${task.title}\n${task.description || ""}\n\n请完成此任务并回复 "✅ 任务完成"。`;

    appendGroupMessage(task.group_id, {
      id: "m" + Date.now().toString(36) + "task",
      role: "user",
      target: "coordinator",
      content: message,
      timestamp: new Date().toISOString(),
      task_id: task.id,
    });
    safeAddGroupLog(task.group_id, "info", "task", `任务派发到群聊: ${task.title}`, {
      task_id: task.id,
      priority: task.priority
    });

    const firstMember = group.members.find((m: any) => m.project !== "coordinator");
    const firstConfig = firstMember ? configs.find(c => c.name === firstMember.project) : configs[0];
    const workDir = firstConfig ? getConfigInfo(firstConfig.path)[0]?.workDir : process.cwd();

    const recentMsgs = getGroupMessages(task.group_id).slice(-10);
    const context = recentMsgs.map((m: any) => {
      const who = m.role === "user" ? `[用户 → ${m.target}]` : `[${m.agent || "Agent"}]`;
      return `${who} ${m.content}`;
    }).join("\n");

    const memberList = group.members.map((m: any) => m.project).filter((p: string) => p !== "coordinator").join(", ");
    const coordinatorInstructions = buildCoordinatorCollaborationInstructions(memberList);
    const fullPrompt = `${coordinatorInstructions}

任务处理要求：
- 理解任务目标，判断是否需要多个 Agent 协作。
- 需要协作时，用独立 @ 行分派清晰、可执行的子任务。
- 如果本轮只是派发任务，请说明等待哪些 Agent 回复，不要提前标记完成。
- 只有任务已经实际完成或无需再等待时，才在回复中包含 "✅ 任务完成"。

以下是群聊最近记录：
${context}

请处理刚才派发的任务。`;

    const coordinatorOutput = ctx.callAgent("coordinator", fullPrompt, workDir, "claudecode", 300000);
    appendGroupMessage(task.group_id, {
      id: "m" + Date.now().toString(36) + "coord",
      role: "assistant",
      agent: "coordinator",
      content: coordinatorOutput,
      timestamp: new Date().toISOString(),
      task_id: task.id,
    });

    const validMentions = extractActionableMentions(coordinatorOutput, group, "coordinator");

    let crossOutputs: string[] = [];
    if (validMentions.length > 0) {
      addTaskLog(task.id, "info", `检测到群聊派发目标: ${validMentions.map(m => m.mention).join(", ")}`);
      crossOutputs = await processCrossAgents(task.group_id, group, "coordinator", coordinatorOutput, validMentions, configs, ctx);
    }

    return [coordinatorOutput, ...crossOutputs].filter(Boolean).join("\n\n---\n\n");
  } else {
    const config = configs.find(c => c.name === task.target_project);
    if (!config) throw new Error("项目配置不存在");

    const info = getConfigInfo(config.path);
    const workDir = info[0]?.workDir;
    const agentType = info[0]?.agent || "claudecode";

    const message = `📋 执行任务：${task.title}\n${task.description || ""}\n\n请完成此任务并回复 "✅ 任务完成"。`;
    return ctx.callAgent(task.target_project, message, workDir, agentType, 300000);
  }
}

// 队列处理
async function processTargetQueue(targetKey: string, ctx: CollabCtx) {
  if (runningTasks.has(targetKey)) {
    console.log(`[任务队列] [${targetKey}] 正在执行任务，等待中...`);
    return;
  }

  const queue = taskQueues.get(targetKey);
  if (!queue || queue.length === 0) return;

  runningTasks.set(targetKey, true);
  console.log(`[任务队列] [${targetKey}] 开始处理队列，剩余任务: ${queue.length}`);

  while (queue.length > 0) {
    const taskId = queue.shift();
    if (!taskId) continue;
    const tasks = loadTasks();
    const task = tasks.find(t => t.id === taskId);

    if (!task || task.status === "done") {
      addTaskLog(taskId, "info", `跳过任务（不存在或已完成）`);
      continue;
    }

    addTaskLog(taskId, "info", `开始执行任务: ${task.title}`);

    try {
      runningTaskIds.add(taskId);
      updateTask(taskId, { status: "in_progress" });
      addTaskLog(taskId, "info", `任务状态更新为: 进行中`);

      addTaskLog(taskId, "info", `调用 Agent 执行任务...`);
      const result = await executeTask(task, ctx);

      addTaskLog(taskId, "response", `Agent 响应:\n${result.substring(0, 1000)}`);

      if (checkTaskFailure(result)) {
        throw new Error(result.substring(0, 500));
      }

      const isCompleted = checkTaskCompletion(result);

      if (isCompleted) {
        updateTask(taskId, {
          status: "done",
          result: result.substring(0, 500),
          completed_at: new Date().toISOString()
        });
        addTaskLog(taskId, "success", `✅ 任务完成`);
        await sendTaskCompletionNotification(task, result);
      } else {
        updateTask(taskId, {
          status: "in_progress",
          result: result.substring(0, 500)
        });
        addTaskLog(taskId, "warning", `任务执行中，未检测到完成标记`);
      }
    } catch (error: any) {
      console.error(`[任务队列] [${targetKey}] 任务执行失败: ${task.title}`, error.message);
      updateTask(taskId, {
        status: "pending",
        result: `执行失败: ${error.message}`
      });
      addTaskLog(taskId, "error", `❌ 任务执行失败: ${error.message}`);
      await sendTaskFailureNotification(task, error.message);
    } finally {
      runningTaskIds.delete(taskId);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  runningTasks.delete(targetKey);
  console.log(`[任务队列] [${targetKey}] 队列处理完成`);
}

function enqueueTask(taskId: string, ctx: CollabCtx) {
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) {
    console.log(`[任务队列] 任务 ${taskId} 不存在`);
    return { queued: false, message: "任务不存在" };
  }

  if (task.status === "done") {
    addTaskLog(taskId, "info", "任务已完成，跳过入队");
    return { queued: false, message: "任务已完成，跳过入队" };
  }

  const targetKey = getTaskTargetKey(task);

  if (!taskQueues.has(targetKey)) {
    taskQueues.set(targetKey, []);
  }

  const queue = taskQueues.get(targetKey)!;

  if (queue.includes(taskId) || runningTaskIds.has(taskId)) {
    addTaskLog(taskId, "info", "任务已在队列中或正在执行，跳过重复入队");
    return { queued: false, message: "任务已在队列中或正在执行" };
  }

  const newPriority = PRIORITY_WEIGHT[task.priority] || 2;
  let insertIndex = queue.length;

  for (let i = 0; i < queue.length; i++) {
    const queuedTask = tasks.find(t => t.id === queue[i]);
    if (!queuedTask) continue;
    const queuedPriority = PRIORITY_WEIGHT[queuedTask.priority] || 2;
    if (newPriority > queuedPriority) {
      insertIndex = i;
      break;
    }
  }

  queue.splice(insertIndex, 0, taskId);
  console.log(`[任务队列] 任务 ${taskId} (${task.priority}) 已加入队列 [${targetKey}]，位置: ${insertIndex + 1}/${queue.length}`);
  updateTask(taskId, { queued_at: new Date().toISOString() });
  addTaskLog(taskId, "info", `任务已加入队列 [${targetKey}]，位置 ${insertIndex + 1}/${queue.length}`);

  processTargetQueue(targetKey, ctx);
  return { queued: true, message: "任务已加入队列", targetKey, position: insertIndex + 1 };
}

export function createAndQueueTask(task: any, ctx: CollabCtx) {
  const newTask = createTask({ ...task, auto_execute: true });
  const queueResult = enqueueTask(newTask.id, ctx);
  return { task: newTask, queueResult };
}

function getQueueStatus() {
  let totalQueued = 0;
  const targetStatus: any = {};

  for (const [targetKey, queue] of taskQueues.entries()) {
    totalQueued += queue.length;
    targetStatus[targetKey] = {
      queued: queue.length,
      running: runningTasks.has(targetKey)
    };
  }

  return {
    total_queued: totalQueued,
    running_targets: runningTasks.size,
    target_status: targetStatus,
    pending_tasks: loadTasks().filter(t => t.status === "pending").length,
    in_progress_tasks: loadTasks().filter(t => t.status === "in_progress").length,
    running_task_ids: Array.from(runningTaskIds)
  };
}

export interface CollabCtx {
  PORT: number;
  callAgent: (projectName: string, message: string, workDir: string, agentType: string, timeoutMs: number, workspaceTarget?: any) => string;
  callAgentForGroupStream: (projectName: string, message: string, workDir: string, agentType: string, options?: any) => Promise<string>;
  setAgentActivity: (name: string, state: string, detail?: string, workspaceTarget?: any) => void;
  broadcastPetSpeech: (agent: string, payload: any) => void;
  createFileChangeSnapshot: (workDir: string) => any;
  getFileChanges: (projectName: string, beforeSnapshot?: any) => any;
  recordMetric: (agent: string, data: any) => void;
  toolManager: any;
  buildUploadedFilesContext: (files: any[], title?: string) => string;
  summarizeUploadedFiles: (files: any[]) => string;
  buildFilesContext: (files: any[], title?: string) => string;
  collectRequestBuffer: (req: any) => Promise<Buffer>;
  getMultipartBoundary: (contentType: string) => string;
  parseMultipart: (buffer: Buffer, boundary: string) => any;
  getSharedFilePath: (name: string) => string;
  createSharedFileRecord: (name: string, source?: string) => any;
  normalizeSharedFileList: (files: any[]) => any[];
}

function createTask(task: any) {
  const tasks = loadTasks();
  const newTask = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: task.title,
    description: task.description || "",
    target_project: task.target_project,
    group_id: task.group_id || null,
    assign_type: task.assign_type || "project",
    status: "pending",
    priority: task.priority || "normal",
    auto_execute: !!(task.auto_execute || task.autoExecute),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  tasks.push(newTask);
  saveTasks(tasks);
  return newTask;
}

function updateTask(id: string, updates: any) {
  const tasks = loadTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  Object.assign(tasks[idx], updates, { updated_at: new Date().toISOString() });
  if (updates.status === "done") tasks[idx].completed_at = new Date().toISOString();
  saveTasks(tasks);
  return tasks[idx];
}

function deleteTask(id: string) {
  const tasks = loadTasks().filter(t => t.id !== id);
  saveTasks(tasks);
}

export function handleCollaborationApi(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: CollabCtx
): boolean {
  if (pathname === "/api/tasks" && req.method === "GET") {
    sendJson(res, { tasks: loadTasks() });
    return true;
  }

  if (pathname === "/api/tasks/create" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const task = createTask(payload);
        let queueResult = null;
        if (payload.auto_execute || payload.autoExecute) {
          queueResult = enqueueTask(task.id, ctx);
        }
        sendJson(res, { success: true, task, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: getQueueStatus() });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/update" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { id, ...updates } = JSON.parse(body);
        const task = updateTask(id, updates);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);
        sendJson(res, { success: true, task });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { id } = JSON.parse(body);
        deleteTask(id);
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/queue" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { task_id } = JSON.parse(body);
        if (!task_id) return sendJson(res, { error: "缺少任务 ID" }, 400);

        const tasks = loadTasks();
        const task = tasks.find(t => t.id === task_id);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);

        const queueResult = enqueueTask(task_id, ctx);
        sendJson(res, { success: true, message: queueResult.message, queued: queueResult.queued, queue_result: queueResult, queue_status: getQueueStatus() });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/queue-batch" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { task_ids } = JSON.parse(body);
        if (!task_ids || !Array.isArray(task_ids)) return sendJson(res, { error: "缺少任务 ID 列表" }, 400);

        const results = task_ids.map(id => ({ task_id: id, ...enqueueTask(id, ctx) }));
        const queuedCount = results.filter(r => r.queued).length;
        sendJson(res, { success: true, message: `${queuedCount}/${task_ids.length} 个任务已加入队列`, results, queue_status: getQueueStatus() });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/queue/status" && req.method === "GET") {
    sendJson(res, getQueueStatus());
    return true;
  }

  if (pathname === "/api/tasks/queue/clear" && req.method === "POST") {
    taskQueues.clear();
    sendJson(res, { success: true, message: "队列已清空" });
    return true;
  }

  if (pathname === "/api/tasks/logs" && req.method === "GET") {
    const taskId = parsed.query.task_id;
    const limit = parseInt(parsed.query.limit) || 50;
    if (!taskId) return sendJson(res, { error: "缺少任务 ID" }, 400);
    const logs = getTaskLogs(taskId, limit);
    sendJson(res, { success: true, logs });
    return true;
  }

  if (pathname === "/api/tasks/logs/clear" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { task_id } = JSON.parse(body);
        if (!task_id) return sendJson(res, { error: "缺少任务 ID" }, 400);
        clearTaskLogs(task_id);
        sendJson(res, { success: true, message: "日志已清空" });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  // === 群聊 API ===
  if (pathname === "/api/groups" && req.method === "GET") {
    sendJson(res, { groups: loadGroups() });
    return true;
  }

  if (pathname === "/api/groups/create" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { name, members } = JSON.parse(body);
        const groups = loadGroups();
        const id = "g" + Date.now().toString(36);
        const allMembers = [
          { project: "coordinator", role: "coordinator", agent: "claudecode" },
          ...(members || [])
        ];
        const group = {
          id, name, members: allMembers,
          created_at: new Date().toISOString(),
        };
        groups.push(group);
        saveGroups(groups);
        sendJson(res, { success: true, group });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/members" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { id, add, remove } = JSON.parse(body);
        const groups = loadGroups();
        const group = groups.find(g => g.id === id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        if (add) {
          for (const m of add) {
            if (!group.members.find((x: any) => x.project === m.project)) {
              group.members.push(m);
            }
          }
        }
        if (remove) {
          group.members = group.members.filter((m: any) => !remove.includes(m.project) || m.project === "coordinator");
        }
        saveGroups(groups);
        sendJson(res, { success: true, group });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { id } = JSON.parse(body);
        const groups = loadGroups().filter(g => g.id !== id);
        saveGroups(groups);
        try {
          fs.unlinkSync(path.join(GROUP_MESSAGES_DIR, `${id}.json`));
        } catch {}
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/rename" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { id, name } = JSON.parse(body);
        if (!name || !name.trim()) return sendJson(res, { error: "群聊名称不能为空" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        group.name = name.trim();
        saveGroups(groups);
        sendJson(res, { success: true, group });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/tools" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const groups = loadGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
    sendJson(res, { tools: group.tools || { mcp: [], skill: [] } });
    return true;
  }

  if (pathname === "/api/groups/tools" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id, tools } = JSON.parse(body);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        group.tools = tools;
        saveGroups(groups);
        sendJson(res, { success: true, tools: group.tools });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/shared" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const groups = loadGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
    const before = JSON.stringify(group.shared_files || []);
    group.shared_files = ctx.normalizeSharedFileList(group.shared_files || []);
    if (JSON.stringify(group.shared_files) !== before) saveGroups(groups);
    sendJson(res, { files: group.shared_files || [] });
    return true;
  }

  if (pathname === "/api/groups/shared/add" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id, name, content } = JSON.parse(body);
        if (!name || !content) return sendJson(res, { error: "文件名和内容不能为空" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        if (!group.shared_files) group.shared_files = [];
        const existing = group.shared_files.findIndex((f: any) => f.name === name);
        if (existing >= 0) {
          group.shared_files[existing].content = content;
          group.shared_files[existing].type = "text";
          group.shared_files[existing].readable = true;
          group.shared_files[existing].updated_at = new Date().toISOString();
        } else {
          group.shared_files.push({
            name,
            type: "text",
            readable: true,
            content,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        saveGroups(groups);
        sendJson(res, { success: true, files: group.shared_files });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/shared/delete" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id, name } = JSON.parse(body);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        if (!group.shared_files) group.shared_files = [];
        group.shared_files = group.shared_files.filter((f: any) => f.name !== name);
        saveGroups(groups);
        sendJson(res, { success: true, files: group.shared_files });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/shared/import" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id, file_names } = JSON.parse(body);
        if (!file_names || !Array.isArray(file_names)) return sendJson(res, { error: "请提供文件名列表" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 404);
        if (!group.shared_files) group.shared_files = [];

        let imported = 0;
        for (const name of file_names) {
          const filePath = ctx.getSharedFilePath(name);
          if (filePath && fs.existsSync(filePath)) {
            const record = ctx.createSharedFileRecord(name, "global");
            if (!record) continue;
            const existing = group.shared_files.findIndex((f: any) => f.name === name);
            if (existing >= 0) {
              group.shared_files[existing] = {
                ...group.shared_files[existing],
                ...record,
                created_at: group.shared_files[existing].created_at || record.created_at,
                updated_at: new Date().toISOString()
              };
            } else {
              group.shared_files.push(record);
            }
            imported++;
          }
        }
        saveGroups(groups);
        sendJson(res, { success: true, imported, files: group.shared_files });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/messages" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const limit = parseInt(parsed.query.limit) || 100;
    const messages = getGroupMessages(groupId).slice(-limit);
    sendJson(res, { messages });
    return true;
  }

  if (pathname === "/api/groups/logs" && req.method === "GET") {
    const groupId = parsed.query.id;
    const limit = parseInt(parsed.query.limit) || 100;
    const category = parsed.query.category;

    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);
    const logs = loadGroupLogs();
    let groupLogs = logs[groupId] || [];
    if (category) {
      groupLogs = groupLogs.filter((l: any) => l.category === category);
    }
    sendJson(res, { logs: groupLogs.slice(-limit) });
    return true;
  }

  if (pathname === "/api/groups/logs/clear" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { group_id } = JSON.parse(body);
        const logs = loadGroupLogs();
        delete logs[group_id];
        saveGroupLogs(logs);
        sendJson(res, { success: true });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/logs/stream" && req.method === "GET") {
    const groupId = parsed.query.id;
    if (!groupId) return sendJson(res, { error: "缺少群聊 ID" }, 400);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    res.write(`data: ${JSON.stringify({ type: "connected", message: "日志流已连接" })}\n\n`);

    const logs = loadGroupLogs();
    const initialCount = (logs[groupId] || []).length;
    let lastCount = initialCount;

    const interval = setInterval(() => {
      try {
        const currentLogs = loadGroupLogs();
        const groupLogs = currentLogs[groupId] || [];

        if (groupLogs.length > lastCount) {
          const newLogs = groupLogs.slice(lastCount);
          for (const log of newLogs) {
            res.write(`data: ${JSON.stringify({ type: "log", log })}\n\n`);
          }
          lastCount = groupLogs.length;
        }
      } catch (e: any) {
        res.write(`data: ${JSON.stringify({ type: "error", message: e.message })}\n\n`);
      }
    }, 1000);

    req.on("close", () => {
      clearInterval(interval);
    });
    return true;
  }

  if (pathname === "/api/groups/send" && req.method === "POST") {
    const contentType = req.headers["content-type"] || "";
    const handleGroupSend = async (payload: any, uploadedFiles = []) => {
      try {
        const { group_id, target_project, message, client_message_id } = payload;
        const userMessage = String(message || "").trim();
        const uploadedFilesContext = ctx.buildUploadedFilesContext(uploadedFiles, "本次群聊消息附件");
        const attachmentSummary = ctx.summarizeUploadedFiles(uploadedFiles);
        const messageForAgent = `${userMessage}${uploadedFilesContext}`.trim();
        const userMessageForHistory = attachmentSummary
          ? `${userMessage || "请处理附件"}\n\n[附件]\n${attachmentSummary}`
          : userMessage;
        if (!messageForAgent) return sendJson(res, { error: "消息或附件不能为空" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 400);

        const isBroadcast = !target_project || target_project === "all";
        const targetMembers = isBroadcast
          ? group.members.filter((m: any) => m.project !== "coordinator")
          : [group.members.find((m: any) => m.project === target_project)].filter(Boolean);

        if (targetMembers.length === 0) {
          return sendJson(res, { error: "没有找到目标项目" }, 400);
        }

        const userMsg = {
          id: client_message_id ? String(client_message_id) : "m" + Date.now().toString(36),
          role: "user",
          target: isBroadcast ? "all" : target_project,
          content: userMessageForHistory,
          timestamp: new Date().toISOString(),
        };
        appendGroupMessage(group_id, userMsg);
        for (const member of targetMembers) {
          ctx.broadcastPetSpeech(member.project, { role: "user", text: userMessageForHistory, final: true, source: "group" });
        }

        addGroupLog(group_id, "info", "message", `用户发送消息给 ${isBroadcast ? '所有人' : target_project}`, {
          message: userMessageForHistory.substring(0, 200),
          target: isBroadcast ? "all" : target_project,
          is_broadcast: isBroadcast
        });

        const configs = getConfigs();

        if (isBroadcast) {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          });

          res.write(`data: ${JSON.stringify({ type: "status", text: `🧠 并行处理中，${targetMembers.length} 个 Agent 同时工作...` })}\n\n`);
          for (const member of targetMembers) {
            ctx.setAgentActivity(member.project, "working", "群聊协作中", { tab: "groups", groupId: group_id });
            ctx.broadcastPetSpeech(member.project, { role: "status", text: "群聊协作中，正在思考...", source: "group" });
          }

          const getAgentPrompt = (member: any) => {
            const recentMsgs = getGroupMessages(group_id).slice(-10);
            const context = recentMsgs.map((m: any) => {
              const who = m.role === "user" ? `[用户 → ${m.target}]` : `[${m.agent || "Agent"}]`;
              return `${who} ${m.content}`;
            }).join("\n");

            const memberList = group.members.map((m: any) => m.project).filter((p: string) => p !== member.project && p !== "coordinator").join(", ");
            const collaborationInstructions = buildMemberCollaborationInstructions(member.project, memberList);
            const sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");

            let toolsContext = "";
            if (group.tools) {
              const mcpTools = group.tools.mcp || [];
              const skillTools = group.tools.skill || [];
              if (mcpTools.length > 0 || skillTools.length > 0) {
                toolsContext = "\n\n你当前可以使用的工具：";
                if (mcpTools.length > 0) {
                  toolsContext += "\n- MCP 服务器：" + mcpTools.join(", ");
                }
                if (skillTools.length > 0) {
                  toolsContext += "\n- Skills：" + skillTools.join(", ");
                }
              }
            }
            toolsContext += ctx.toolManager.buildToolPrompt();

            return `${collaborationInstructions}${toolsContext}${sharedFilesContext}\n以下是群聊最近的消息记录：\n${context}\n\n用户刚才把这条消息发给了群聊所有成员，请从 ${member.project} 的职责视角回复：${messageForAgent}`;
          };

          const agentPromises = targetMembers.map(member => {
            return new Promise<void>(async (resolve) => {
              const config = configs.find(c => c.name === member.project);
              if (!config) {
                resolve();
                return;
              }

              const info = getConfigInfo(config.path);
              const workDir = info[0]?.workDir;
              const agentType = info[0]?.agent || "claudecode";
              const fullPrompt = getAgentPrompt(member);

              try {
                const responseMessageId = "m" + Date.now().toString(36) + member.project + crypto.randomBytes(2).toString("hex");
                let memberFileChanges = null;
                const text = await ctx.callAgentForGroupStream(member.project, fullPrompt, workDir, agentType, {
                  res,
                  groupId: group_id,
                  timeoutMs: 300000,
                  messageId: responseMessageId,
                  onDone: (opts: any) => { memberFileChanges = opts.fileChanges; }
                });
                appendGroupMessage(group_id, {
                  id: responseMessageId,
                  role: "assistant", agent: member.project,
                  content: text,
                  timestamp: new Date().toISOString(),
                  fileChanges: memberFileChanges,
                });
                const validMentions = extractActionableMentions(text, group, member.project);
                if (validMentions.length > 0) {
                  writeSse(res, { type: "status", text: `🧩 ${member.project} 正在分配协作任务...` });
                  await processCrossAgents(group_id, group, member.project, text, validMentions, configs, ctx, res);
                }
              } catch (e: any) {
                writeSse(res, { type: "agent_done", agent: member.project, text: `❌ 错误: ${e.message}` });
              } finally {
                resolve();
              }
            });
          });

          Promise.all(agentPromises).then(() => {
            writeSse(res, { type: "done" });
            try {
              res.end();
            } catch {}
          });
          return;
        }

        // 单个 Agent 模式
        const target_project_actual = targetMembers[0].project;
        let workDir, agentType;
        if (target_project_actual === "coordinator") {
          const firstMember = group.members.find((m: any) => m.project !== "coordinator");
          const firstConfig = firstMember ? configs.find(c => c.name === firstMember.project) : configs[0];
          workDir = firstConfig ? getConfigInfo(firstConfig.path)[0]?.workDir : process.cwd();
          agentType = "claudecode";
        } else {
          const config = configs.find(c => c.name === target_project_actual);
          if (!config) return sendJson(res, { error: "项目配置不存在" }, 400);
          workDir = getConfigInfo(config.path)[0]?.workDir;
          agentType = getConfigInfo(config.path)[0]?.agent || "claudecode";
        }

        const recentMsgs = getGroupMessages(group_id).slice(-10);
        const context = recentMsgs.map((m: any) => {
          const who = m.role === "user" ? `[用户 → ${m.target}]` : `[${m.agent || "Agent"}]`;
          return `${who} ${m.content}`;
        }).join("\n");
        const memberList = group.members.map((m: any) => m.project).filter((p: string) => p !== target_project_actual).join(", ");
        let atInstructions = "";
        if (target_project_actual === "coordinator") {
          atInstructions = buildCoordinatorCollaborationInstructions(memberList);
        } else {
          atInstructions = buildMemberCollaborationInstructions(target_project_actual, memberList);
        }

        let sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");

        let toolsContext = "";
        if (group.tools) {
          const mcpTools = group.tools.mcp || [];
          const skillTools = group.tools.skill || [];
          if (mcpTools.length > 0 || skillTools.length > 0) {
            toolsContext = "\n\n你当前可以使用的工具：";
            if (mcpTools.length > 0) {
              toolsContext += "\n- MCP 服务器：" + mcpTools.join(", ");
            }
            if (skillTools.length > 0) {
              toolsContext += "\n- Skills：" + skillTools.join(", ");
            }
          }
        }
        const PROJECT_CONFIGS_FILE = path.join(CCM_DIR, "project-configs.json");
        let projectConfigs: any = {};
        try {
          if (fs.existsSync(PROJECT_CONFIGS_FILE)) {
            projectConfigs = JSON.parse(fs.readFileSync(PROJECT_CONFIGS_FILE, "utf-8"));
          }
        } catch (e) {}

        const projectConfig = projectConfigs[target_project_actual] || {};

        if (projectConfig.tools) {
          const projectMcp = projectConfig.tools.mcp || [];
          const projectSkill = projectConfig.tools.skill || [];
          if (projectMcp.length > 0 || projectSkill.length > 0) {
            if (!toolsContext) toolsContext = "\n\n你当前可以使用的工具：";
            if (projectMcp.length > 0) {
              toolsContext += "\n- MCP 服务器：" + projectMcp.join(", ");
            }
            if (projectSkill.length > 0) {
              toolsContext += "\n- Skills：" + projectSkill.join(", ");
            }
          }
        }
        toolsContext += ctx.toolManager.buildToolPrompt();

        if (projectConfig.shared_files && projectConfig.shared_files.length > 0) {
          sharedFilesContext += ctx.buildFilesContext(projectConfig.shared_files, "[项目共享文件]");
        }

        const fullPrompt = `${atInstructions}${toolsContext}${sharedFilesContext}\n以下是群聊最近的消息记录：\n${context}\n\n请回复用户刚才发给你的消息：${messageForAgent}`;

        const useStream = parsed.query.stream === "1" || req.headers["accept"] === "text/event-stream";

        if (useStream) {
          const responseMessageId = "m" + Date.now().toString(36) + "a" + crypto.randomBytes(2).toString("hex");
          const startedAt = Date.now();
          const changeSnapshot = workDir ? ctx.createFileChangeSnapshot(workDir) : null;

          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          });

          res.write(`data: ${JSON.stringify({ type: "status", text: "🧠 Agent 正在思考..." })}\n\n`);
          ctx.setAgentActivity(target_project_actual, "working", "群聊协作中", { tab: "groups", groupId: group_id });
          ctx.broadcastPetSpeech(target_project_actual, { role: "status", text: "Agent 正在思考...", source: "group" });

          try {
            let targetFileChanges = null;
            const outputText = await ctx.callAgentForGroupStream(target_project_actual, fullPrompt, workDir, agentType, {
              res,
              groupId: group_id,
              timeoutMs: 300000,
              messageId: responseMessageId,
              onDone: (opts: any) => { targetFileChanges = opts.fileChanges; }
            });

            appendGroupMessage(group_id, {
              id: responseMessageId,
              role: "assistant", agent: target_project_actual,
              content: outputText.trim(),
              timestamp: new Date().toISOString(),
              fileChanges: targetFileChanges,
            });

            addGroupLog(group_id, "success", "response", `Agent ${target_project_actual} 回复完成`, {
              agent: target_project_actual,
              response_length: outputText.length,
              response_preview: outputText.substring(0, 300)
            });

            const validMentions = extractActionableMentions(outputText, group, target_project_actual);
            if (validMentions.length > 0) {
              writeSse(res, { type: "status", text: "🧩 主 Agent 正在分配任务..." });
              try {
                await processCrossAgents(group_id, group, target_project_actual, outputText, validMentions, configs, ctx, res);
              } catch (err: any) {
                writeSse(res, { type: "error", text: `跨 Agent 协作失败: ${err.message}` });
              }
            }
            writeSse(res, { type: "done", fileChanges: targetFileChanges, messageId: responseMessageId });
            res.end();
          } catch (err: any) {
            writeSse(res, { type: "error", text: err.message });
            ctx.recordMetric(target_project_actual, {
              success: false,
              durationMs: Date.now() - startedAt,
              fileChangeCount: 0
            });
            try { res.end(); } catch {}
          }
          return;
        }

        // 非流式
        const output = ctx.callAgent(target_project_actual, fullPrompt, workDir, agentType, 300000, { tab: "groups", groupId: group_id });

        appendGroupMessage(group_id, {
          id: "m" + Date.now().toString(36) + "a",
          role: "assistant", agent: target_project_actual,
          content: output,
          timestamp: new Date().toISOString(),
        });

        const validMentions = extractActionableMentions(output, group, target_project_actual);
        if (validMentions.length > 0) {
          sendJson(res, { success: true, reply: output, cross_pending: true });
          setImmediate(() => processCrossAgents(group_id, group, target_project_actual, output, validMentions, configs, ctx));
          return;
        }

        sendJson(res, { success: true, reply: output });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    };

    if (contentType.includes("multipart/form-data")) {
      ctx.collectRequestBuffer(req).then((buffer) => {
        try {
          const boundary = ctx.getMultipartBoundary(contentType);
          if (!boundary) return sendJson(res, { error: "无效请求" }, 400);
          const { files, fields } = ctx.parseMultipart(buffer, boundary);
          handleGroupSend(fields, files);
        } catch (e: any) {
          sendJson(res, { error: e.message }, 400);
        }
      }).catch((e: any) => sendJson(res, { error: e.message }, 400));
      return true;
    }

    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        await handleGroupSend(JSON.parse(body));
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/broadcast" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { group_id, message } = JSON.parse(body);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 400);

        appendGroupMessage(group_id, {
          id: "m" + Date.now().toString(36),
          role: "user", target: "all", content: message,
          timestamp: new Date().toISOString(),
        });

        const replies = [];
        const configs = getConfigs();

        for (const member of group.members) {
          const config = configs.find(c => c.name === member.project);
          if (!config) continue;
          const info = getConfigInfo(config.path);
          const workDir = info[0]?.workDir;
          const agentType = info[0]?.agent || "claudecode";

          const recentMsgs = getGroupMessages(group_id).slice(-10);
          const context = recentMsgs.map((m: any) => {
            const who = m.role === "user" ? `[用户 → ${m.target}]` : `[${m.agent || "Agent"}]`;
            return `${who} ${m.content}`;
          }).join("\n");

          const sharedFilesContext = ctx.buildFilesContext(group.shared_files || [], "以下是群聊中的共享文件：");

          let toolsContext = "";
          if (group.tools) {
            const mcpTools = group.tools.mcp || [];
            const skillTools = group.tools.skill || [];
            if (mcpTools.length > 0 || skillTools.length > 0) {
              toolsContext = "\n\n你当前可以使用的工具：";
              if (mcpTools.length > 0) {
                toolsContext += "\n- MCP 服务器：" + mcpTools.join(", ");
              }
              if (skillTools.length > 0) {
                toolsContext += "\n- Skills：" + skillTools.join(", ");
              }
            }
          }
          toolsContext += ctx.toolManager.buildToolPrompt();

          const memberList = group.members.map((m: any) => m.project).filter((p: string) => p !== member.project && p !== "coordinator").join(", ");
          const memberInstructions = buildMemberCollaborationInstructions(member.project, memberList);
          const fullPrompt = `${memberInstructions}${toolsContext}${sharedFilesContext}\n群聊记录：\n${context}\n\n请从 ${member.project} 的职责视角回复：${message}`;

          const output = ctx.callAgent(member.project, fullPrompt, workDir, agentType, 300000, { tab: "groups", groupId: group_id });

          appendGroupMessage(group_id, {
            id: "m" + Date.now().toString(36) + member.project,
            role: "assistant", agent: member.project, content: output,
            timestamp: new Date().toISOString(),
          });
          replies.push({ project: member.project, reply: output });
        }

        sendJson(res, { success: true, replies });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/groups/decompose" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { group_id, requirement } = JSON.parse(body);
        const groups = loadGroups();
        const group = groups.find(g => g.id === group_id);
        if (!group) return sendJson(res, { error: "群聊不存在" }, 400);

        const configs = getConfigs();
        const members = group.members.filter((m: any) => m.project !== "coordinator");
        const memberList = members.map((m: any) => `${m.project}(${m.agent})`).join(", ");

        const decomposePrompt = `你是 CCM 群聊的主 Agent（协调者），负责把开发需求拆成适合群聊协作的具体子任务。

群聊中的开发 Agent 有：${memberList}

请将以下需求拆分成具体的开发任务，返回 JSON 格式：
{
  "tasks": [
    {
      "title": "任务标题",
      "description": "任务描述",
      "target_project": "目标项目名",
      "priority": "high/normal/low",
      "estimated_time": "预估时间"
    }
  ]
}

需求：${requirement}

注意：
1. 每个任务要具体可执行，描述里写清楚背景、交付物和验收方式
2. 根据项目职责分配任务（前端做 UI，后端做接口，服务端做数据/业务，客户端做交互适配）
3. 跨项目联调、汇总决策或需要等待多方结果的任务分配给 coordinator
4. 不要把“讨论/确认”伪装成已完成实现；需要确认就写成确认任务
5. 只返回 JSON，不要其他内容`;

        const firstMember = members[0];
        const firstConfig = firstMember ? configs.find(c => c.name === firstMember.project) : configs[0];
        const workDir = firstConfig ? getConfigInfo(firstConfig.path)[0]?.workDir : process.cwd();

        const output = ctx.callAgent("coordinator", decomposePrompt, workDir, "claudecode", 120000);

        let tasks: any[] = [];
        try {
          const jsonMatch = output.match(/\{[\s\S]*"tasks"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            tasks = parsed.tasks || [];
          }
        } catch (e: any) {
          console.log("任务分解 JSON 解析失败:", e.message);
        }

        const createdTasks = tasks.map(t => createTask({
          title: t.title,
          description: t.description || "",
          target_project: t.target_project || "coordinator",
          priority: t.priority || "normal"
        }));

        appendGroupMessage(group_id, {
          id: "m" + Date.now().toString(36) + "decompose",
          role: "assistant",
          agent: "coordinator",
          content: `📋 需求分解完成，共 ${createdTasks.length} 个任务：\n${createdTasks.map((t, i) => `${i+1}. [${t.target_project}] ${t.title}`).join("\n")}`,
          timestamp: new Date().toISOString(),
        });

        sendJson(res, { success: true, tasks: createdTasks, raw_output: output });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/auto-assign" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { task_id, group_id } = JSON.parse(body);
        const tasks = loadTasks();
        const task = tasks.find(t => t.id === task_id);
        if (!task) return sendJson(res, { error: "任务不存在" }, 404);

        const configs = getConfigs();
        const config = configs.find(c => c.name === task.target_project);
        if (!config) return sendJson(res, { error: "项目配置不存在" }, 400);

        const info = getConfigInfo(config.path);
        const workDir = info[0]?.workDir;
        const agentType = info[0]?.agent || "claudecode";

        updateTask(task_id, { status: "in_progress" });

        const executePrompt = `你正在执行一个开发任务，请完成它。

任务标题：${task.title}
任务描述：${task.description || "无"}

请直接开始实现，完成后回复 "✅ 任务完成" 并简要说明实现内容。`;

        const taskResult = ctx.callAgent(task.target_project, executePrompt, workDir, agentType, 300000);
        const isCompleted = taskResult.includes("✅") || taskResult.includes("完成") || taskResult.includes("done");

        updateTask(task_id, {
          status: isCompleted ? "done" : "in_progress",
          result: taskResult.substring(0, 500)
        });

        if (group_id) {
          appendGroupMessage(group_id, {
            id: "m" + Date.now().toString(36) + "task",
            role: "assistant",
            agent: task.target_project,
            content: `📋 任务执行${isCompleted ? "完成" : "中"}：${task.title}\n${taskResult.substring(0, 300)}`,
            timestamp: new Date().toISOString(),
          });
        }

        sendJson(res, { success: true, task, completed: isCompleted, result: taskResult });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/tasks/auto-execute-all" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const tasks = loadTasks().filter(t => t.status === "pending");

        if (tasks.length === 0) {
          return sendJson(res, { success: true, message: "没有待执行的任务" });
        }

        const results = tasks.map(task => ({
          task_id: task.id,
          title: task.title,
          ...enqueueTask(task.id, ctx)
        }));
        const queuedCount = results.filter(r => r.queued).length;

        sendJson(res, {
          success: true,
          message: `${queuedCount}/${tasks.length} 个任务已加入队列`,
          results,
          queue_status: getQueueStatus()
        });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/review" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", async () => {
      try {
        const { group_id, project, diff, reviewers } = JSON.parse(body);
        if (!diff) return sendJson(res, { error: "请提供代码变更内容" }, 400);

        const configs = getConfigs();
        const reviewPrompt = `请审查以下代码变更，从你的专业角度给出意见：

项目：${project}
代码变更：
\`\`\`
${diff}
\`\`\`

请从以下角度审查：
1. 代码质量
2. 潜在 bug
3. 安全问题
4. 性能影响
5. 与你的项目的兼容性

返回 JSON 格式：
{
  "issues": [
    {
      "severity": "high/medium/low",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "overall": "总体评价"
}`;

        const reviewResults = [];
        for (const reviewer of (reviewers || [])) {
          const config = configs.find(c => c.name === reviewer);
          if (!config) continue;

          const info = getConfigInfo(config.path);
          const workDir = info[0]?.workDir;
          const agentType = info[0]?.agent || "claudecode";

          try {
            const result = ctx.callAgent(reviewer, reviewPrompt, workDir, agentType, 120000);
            reviewResults.push({ reviewer, result });
          } catch (e: any) {
            reviewResults.push({ reviewer, error: e.message });
          }
        }

        if (group_id) {
          appendGroupMessage(group_id, {
            id: "m" + Date.now().toString(36) + "review",
            role: "assistant",
            agent: "coordinator",
            content: `🔍 代码审查完成：${project}\n${reviewResults.map(r => `【${r.reviewer}】${r.result?.substring(0, 200) || r.error}`).join("\n\n")}`,
            timestamp: new Date().toISOString(),
          });
        }

        sendJson(res, { success: true, reviews: reviewResults });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/collaboration/stats" && req.method === "GET") {
    const tasks = loadTasks();
    const groups = loadGroups();

    const stats = {
      total_tasks: tasks.length,
      pending_tasks: tasks.filter((t: any) => t.status === "pending").length,
      in_progress_tasks: tasks.filter((t: any) => t.status === "in_progress").length,
      done_tasks: tasks.filter((t: any) => t.status === "done").length,
      completion_rate: tasks.length > 0 ? Math.round(tasks.filter((t: any) => t.status === "done").length / tasks.length * 100) : 0,
      groups_count: groups.length,
      recent_activities: [] as any[]
    };

    for (const group of groups.slice(0, 3)) {
      const messages = getGroupMessages(group.id).slice(-5);
      for (const msg of messages) {
        stats.recent_activities.push({
          group: group.name,
          agent: msg.agent || "user",
          content: msg.content?.substring(0, 100),
          timestamp: msg.timestamp
        });
      }
    }

    stats.recent_activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    stats.recent_activities = stats.recent_activities.slice(0, 10);

    sendJson(res, stats);
    return true;
  }

  if (pathname === "/api/test/mentions" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const { text, group_id } = JSON.parse(body);
        let validMentions: any[] = [];
        if (group_id) {
          const groups = loadGroups();
          const group = groups.find(g => g.id === group_id);
          if (group) {
            validMentions = extractActionableMentions(text, group, "");
          }
        }
        sendJson(res, {
          success: true,
          input: text,
          valid_mentions: validMentions.map(m => m.mention),
          extracted_messages: validMentions.map(m => ({ mention: m.mention, target: m.targetName, message: m.message }))
        });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  // === 飞书配置与授权相关路由 ===
  if (pathname === "/api/feishu/config" && req.method === "GET") {
    const config = loadFeishuConfig();
    sendJson(res, {
      config: {
        app_id: config.app_id || "",
        app_secret: config.app_secret || "",
        enabled: config.enabled !== false,
        authorized: config.authorized || false,
        authorized_user: config.authorized_user || null,
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
        const config = loadFeishuConfig();

        if (updates.app_id !== undefined) config.app_id = updates.app_id;
        if (updates.app_secret !== undefined && updates.app_secret !== "") config.app_secret = updates.app_secret;
        if (updates.webhook_url !== undefined) config.webhook_url = updates.webhook_url;
        if (updates.sign_key !== undefined && updates.sign_key !== "******") config.sign_key = updates.sign_key;
        if (updates.enabled !== undefined) config.enabled = updates.enabled;
        if (updates.redirect_uri !== undefined) config.redirect_uri = updates.redirect_uri;

        console.log("[飞书配置] 保存配置:", { app_id: config.app_id, app_secret: config.app_secret ? "***" : "空" });
        saveFeishuConfig(config);
        sendJson(res, { success: true, message: "飞书配置已保存" });
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/feishu/auth-url" && req.method === "GET") {
    const config = loadFeishuConfig();
    if (!config.app_id) {
      sendJson(res, { error: "请先配置 App ID" }, 400);
      return true;
    }
    const scopes = (config.scopes || FEISHU_SCOPES).join(" ");
    const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${config.app_id}&redirect_uri=${encodeURIComponent(config.redirect_uri)}&scope=${encodeURIComponent(scopes)}&state=ccm_auth`;
    sendJson(res, { success: true, auth_url: authUrl });
    return true;
  }

  if (pathname === "/api/feishu/callback" && req.method === "GET") {
    const code = parsed.query.code;
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h1>授权失败：缺少 code 参数</h1>");
      return true;
    }

    const config = loadFeishuConfig();
    if (!config.app_id || !config.app_secret) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h1>授权失败：未配置 App ID 或 Secret</h1>");
      return true;
    }

    getFeishuUserToken(config.app_id, config.app_secret, code).then(tokenData => {
      if (!tokenData) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h1>授权失败：获取 Token 失败</h1>");
        return;
      }

      config.user_access_token = tokenData.access_token;
      config.user_refresh_token = tokenData.refresh_token;
      config.token_expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      config.authorized = true;

      return getFeishuUserInfo(tokenData.access_token).then(userInfo => {
        if (userInfo) {
          config.authorized_user = {
            name: userInfo.name,
            open_id: userInfo.open_id,
            avatar: userInfo.avatar_url
          };
        }
        saveFeishuConfig(config);

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
    const config = loadFeishuConfig();
    config.authorized = false;
    config.user_access_token = "";
    config.user_refresh_token = "";
    config.token_expires_at = null;
    config.authorized_user = null;
    saveFeishuConfig(config);
    sendJson(res, { success: true, message: "授权已撤销" });
    return true;
  }

  if (pathname === "/api/feishu/chats" && req.method === "GET") {
    getValidFeishuToken().then(async (token) => {
      if (!token) {
        sendJson(res, { error: "未授权或 Token 无效，请先完成飞书授权" }, 401);
        return;
      }
      const chats = await getFeishuChatList(token);
      if (!res.headersSent) {
        sendJson(res, { success: true, chats: chats || [] });
      }
    }).catch(err => {
      console.error("[飞书] 获取群聊列表失败:", err.message);
      if (!res.headersSent) {
        sendJson(res, { error: "获取群聊列表失败" }, 500);
      }
    });
    return true;
  }

  if (pathname === "/api/feishu/test" && req.method === "POST") {
    const config = loadFeishuConfig();
    if (!config.app_id) {
      sendJson(res, { error: "请先配置飞书 App ID" }, 400);
      return true;
    }
    const userId = config.authorized_user?.open_id;
    if (!userId) {
      sendJson(res, { error: "请先扫码授权获取用户 ID" }, 400);
      return true;
    }

    const testCard = {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: "plain_text", content: "🔔 测试通知" },
        template: "blue"
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**ccm 控制台通知测试**\n\n发送时间：${new Date().toLocaleString("zh-CN")}\n\n配置验证成功！✅`
          }
        }
      ]
    };

    sendFeishuMessageToUser(userId, JSON.stringify(testCard), "interactive").then(success => {
      if (success) {
        sendJson(res, { success: true, message: "测试消息已发送！请检查飞书" });
      } else {
        sendJson(res, { error: "发送失败，请检查配置" }, 500);
      }
    }).catch(err => {
      console.error("[飞书] 测试通知失败:", err.message);
      sendJson(res, { error: "发送失败: " + err.message }, 500);
    });
    return true;
  }

  return false;
}
