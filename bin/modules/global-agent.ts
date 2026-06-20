import * as fs from "fs";
import * as path from "path";
import { queryKnowledgeBase } from "./rag";
import { execFileSync } from "child_process";
import {
  sendJson,
  collectRequestBuffer,
  getMultipartBoundary,
  parseMultipart,
  buildUploadedFilesContext
} from "../utils";
import { loadOrchestratorConfig } from "./group-orchestrator";
import { getConfigs, getConfigInfo } from "../db";
import { loadGroups } from "./collaboration";


type LocalIntentResult = {
  reply: string;
  action: any;
};

function normalizeText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripActionWords(value: string) {
  return normalizeText(value)
    .replace(/^(请|帮我|麻烦|给我|我要|我想|想要|可以)?/g, "")
    .replace(/(一下|下|吧|呢|谢谢)$/g, "")
    .trim();
}

function findProjectName(message: string, projects: string[]) {
  const text = message.toLowerCase();
  return projects.find(project => text.includes(String(project).toLowerCase())) || "";
}

function findGroup(message: string, groups: any[]) {
  const text = message.toLowerCase();
  return groups.find(group => {
    const id = String(group?.id || "").toLowerCase();
    const name = String(group?.name || "").toLowerCase();
    return (id && text.includes(id)) || (name && text.includes(name));
  }) || null;
}

function guessCronSchedule(message: string) {
  const text = normalizeText(message);
  const everyHour = /每(个)?小时|每小时/.test(text);
  if (everyHour) return "0 * * * *";

  const minuteMatch = text.match(/每(?:隔)?(\d{1,2})\s*分钟/);
  if (minuteMatch) return `*/${Math.max(1, Math.min(59, Number(minuteMatch[1])))} * * * *`;

  const dayHourMatch = text.match(/每天(?:早上|上午|中午|下午|晚上)?\s*(\d{1,2})\s*(?:点|:00)/);
  if (dayHourMatch) {
    let hour = Number(dayHourMatch[1]);
    if (/下午|晚上/.test(text) && hour < 12) hour += 12;
    return `0 ${Math.max(0, Math.min(23, hour))} * * *`;
  }

  const weekMap: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
  const weekMatch = text.match(/每(?:周|星期)([一二三四五六日天])(?:早上|上午|中午|下午|晚上)?\s*(\d{1,2})\s*(?:点|:00)/);
  if (weekMatch) {
    let hour = Number(weekMatch[2]);
    if (/下午|晚上/.test(text) && hour < 12) hour += 12;
    return `0 ${Math.max(0, Math.min(23, hour))} * * ${weekMap[weekMatch[1]]}`;
  }

  const cronMatch = text.match(/(?:cron|表达式)\s*[:：]?\s*([0-9*,/\-?]+\s+[0-9*,/\-?]+\s+[0-9*,/\-?]+\s+[0-9*,/\-?]+\s+[0-9*,/\-?]+)/i);
  if (cronMatch) return cronMatch[1].trim();
  return "";
}

function inferLocalGlobalAction(message: string, projects: string[], groups: any[]): LocalIntentResult | null {
  const text = normalizeText(message);
  if (!text) return null;
  const lower = text.toLowerCase();
  const matchedProject = findProjectName(text, projects);
  const matchedGroup = findGroup(text, groups);

  if (/(打开|开启|启动|唤醒|显示).*(宠物|桌宠)|(?:宠物|桌宠).*(打开|开启|启动|唤醒|显示)/.test(text)) {
    return {
      reply: "我识别到你要打开桌面宠物，正在调起宠物 Agent。",
      action: { type: "toggle_pet", params: { action: "open" } }
    };
  }
  if (/(关闭|隐藏|退出).*(宠物|桌宠)|(?:宠物|桌宠).*(关闭|隐藏|退出)/.test(text)) {
    return {
      reply: "我识别到你要关闭桌面宠物，正在执行。",
      action: { type: "toggle_pet", params: { action: "close" } }
    };
  }

  const pageMap: Array<[RegExp, string, string]> = [
    [/音乐|播放器|听歌/, "music", "音乐播放"],
    [/宠物|桌宠/, "pets", "宠物空间"],
    [/项目管理|项目列表/, "projects", "项目管理"],
    [/群聊|项目组|协作/, "groups", "群聊协作"],
    [/任务派发|任务列表|开发任务/, "tasks", "任务派发"],
    [/定时任务|计划任务|cron/i, "cron", "定时任务"],
    [/终端|控制台/, "terminal", "内置终端"],
    [/模板|提示词/, "templates", "对话模板"],
    [/搜索|查对话/, "search", "对话搜索"],
    [/设置|配置/, "settings", "系统设置"],
  ];
  if (/(打开|进入|跳转|去|查看).*(页面|面板|模块|列表|空间|设置|控制台)?/.test(text)) {
    const page = pageMap.find(([pattern]) => pattern.test(text));
    if (page) {
      return {
        reply: `我会为你打开「${page[2]}」页面。`,
        action: { type: "navigate", params: { tab: page[1] } }
      };
    }
  }

  if (matchedProject && /(?:启动|运行|拉起|开启|打开)\s*(?:项目|服务|agent|Agent)?|(?:项目|服务|agent|Agent).*?(?:启动|运行|拉起|开启)/.test(text)) {
    return {
      reply: `我会启动项目「${matchedProject}」。`,
      action: { type: "control_project", params: { project: matchedProject, action: "start" } }
    };
  }

  if (matchedProject && /(?:停止|关闭|停掉|结束)\s*(?:项目|服务|agent|Agent)?|(?:项目|服务|agent|Agent).*?(?:停止|关闭|停掉|结束)/.test(text)) {
    return {
      reply: `我会停止项目「${matchedProject}」。`,
      action: { type: "control_project", params: { project: matchedProject, action: "stop" } }
    };
  }

  if (/(播放|放一首|来一首|听|我想听|我要听|搜首歌|搜索.*歌)/.test(text) && !/页面|列表|打开音乐/.test(text)) {
    const keyword = stripActionWords(text)
      .replace(/^(播放|放一首|来一首|听|我想听|我要听|搜首歌|搜索)/, "")
      .replace(/(音乐|歌曲|歌)$/g, "")
      .trim();
    if (keyword) {
      return {
        reply: `我会交给音乐 Agent 搜索并播放「${keyword}」。`,
        action: { type: "play_music", params: { keyword } }
      };
    }
  }

  if (/定时任务|计划任务|定时执行|每(天|周|星期|小时|隔)/.test(text) && /(创建|新建|添加|定时|每)/.test(text)) {
    const schedule = guessCronSchedule(text);
    const targetType = matchedGroup || !matchedProject ? "group" : "project";
    const group = matchedGroup || groups[0] || null;
    const project = matchedProject || projects[0] || "";
    const prompt = text.replace(/创建|新建|添加|一个|定时任务|计划任务/g, "").trim() || text;
    return {
      reply: schedule
        ? `我会创建一个定时任务，周期是 \`${schedule}\`。`
        : "我可以创建定时任务，但还需要明确周期；我先把识别到的任务内容整理好。",
      action: {
        type: "create_cron_task",
        params: {
          name: prompt.slice(0, 28) || "全局助手定时任务",
          schedule,
          prompt,
          target_type: targetType,
          group_id: targetType === "group" ? group?.id : undefined,
          project: targetType === "project" ? project : undefined,
        }
      }
    };
  }

  if ((/群聊|项目组|协作组|下单/.test(text) || matchedGroup) && /(修改|修复|bug|派发|指令|下单|处理|实现)/.test(text)) {
    const group = matchedGroup || groups[0] || null;
    if (group) {
      return {
        reply: `我会把这条指令下发到群聊「${group.name || group.id}」的主 Agent。`,
        action: {
          type: "send_group_cmd",
          params: { groupId: group.id, message: text, target_project: "coordinator" }
        }
      };
    }
  }

  if (matchedProject && /(修改|修复|改一下|处理|实现|新增|删除|优化|项目\s*agent|项目agent)/.test(text)) {
    return {
      reply: `我会把这条修改指令发送给项目 Agent「${matchedProject}」。`,
      action: { type: "send_project_cmd", params: { project: matchedProject, message: text } }
    };
  }

  if (/创建|新建|派发/.test(text) && /任务|需求|开发/.test(text)) {
    const group = matchedGroup || groups[0] || null;
    return {
      reply: group ? `我会为群聊「${group.name || group.id}」创建并派发开发任务。` : "我会创建一条开发任务。",
      action: {
        type: "create_task",
        params: {
          title: text.slice(0, 36),
          business_goal: text,
          scope: text,
          group_id: group?.id,
          acceptance: "子 Agent 提供回执；主 Agent 输出最终报告"
        }
      }
    };
  }

  return null;
}

export function handleGlobalAgentApi(
  pathname: string,
  req: any,
  res: any,
  parsed: any
): boolean {
  if (pathname === "/api/global-agent/chat" && req.method === "POST") {
    const contentType = req.headers["content-type"] || "";

    const handleChat = async (message: string, history: any[], files: any[]) => {
      try {
        let finalMessage = message || "";
        if (files && files.length > 0) {
          const filesContext = buildUploadedFilesContext(files, "本次消息附件");
          finalMessage = finalMessage ? `${finalMessage}\n\n${filesContext}` : `请处理以下附件：\n\n${filesContext}`;
        }
        if (!finalMessage) return sendJson(res, { error: "消息不能为空" }, 400);

        // 检索本地知识库相关参考资料
        const ragContext = queryKnowledgeBase(message || "");

        // 1. 获取当前系统资源和大模型配置
        const projectItems = getConfigs().map(c => c.name);
        const groupItems = loadGroups();
        const projects = projectItems.join(", ");
        const groups = groupItems.map(g => `${g.name} (ID: ${g.id})`).join(", ");
        const localIntent = inferLocalGlobalAction(finalMessage, projectItems, groupItems);

        const config = loadOrchestratorConfig();
        if (!config.apiKey || !config.apiUrl || !config.model) {
          if (localIntent) {
            return sendJson(res, {
              success: true,
              reply: `${localIntent.reply}

提示：当前还没有配置统一大模型，所以我先用本地规则执行这个明确指令。复杂编排建议到「系统设置」启用统一大模型配置。`,
              action: localIntent.action,
              files: files ? files.map(f => ({ name: f.filename, size: f.size, savedPath: f.savedPath })) : []
            });
          }
          return sendJson(res, {
            success: true,
            reply: "您好！我是全局控制助手。为了让我能够控制整个系统，请先前往 [系统设置] 填写并启用 **统一大模型配置**（填写 API Key、Base URL 及模型名称）。简单指令如“打开宠物”“播放 晚安”“打开定时任务页面”我也可以先用本地规则处理。"
          });
        }

        // 2. 构建系统提示词
        let systemPrompt = `你是一个名为“全局助手 (Global Assistant)”的系统控制 Agent。你能够帮用户管理和操作整个 cc-connect 系统的各项功能。
当前系统的运行环境与资源如下：
- 可操作的项目（projects）列表: [${projects || "暂无项目"}]
- 现有的群聊协作组（groups）列表: [${groups || "暂无群聊"}]`;

        if (ragContext) {
          systemPrompt += `\n\n【本地知识库参考上下文】\n${ragContext}\n\n重要规则：用户的问题可能与上述知识库内容相关。若存在相关信息，请务必优先基于上述知识库内容并结合这些资料来回答用户。`;
        }

        systemPrompt += `\n\n你的任务是：
1. 理解用户的指令，用自然、友好且专业的中文进行回答。
2. 如果用户的指令涉及系统动作，你需要在回答的最后，输出一个特定的 \`\`\`action 代码块（JSON 格式）。

支持的系统动作有：

a. 播放音乐（play_music）：
当用户说“我要听xxx”、“播放xxx”、“搜首歌xxx”时使用。
\`\`\`action
{
  "type": "play_music",
  "params": {
    "keyword": "歌曲或歌手名称"
  }
}
\`\`\`

b. 宠物控制（toggle_pet）：
当用户要“打开宠物”、“关闭宠物”、“唤醒桌宠”等时候使用。
\`\`\`action
{
  "type": "toggle_pet",
  "params": {
    "action": "open" 或 "close"
  }
}
\`\`\`

c. 页面跳转（navigate）：
当用户想去某个页面或查看某个配置时。可用的页面 id 仅限于：
- "projects" (项目管理)
- "groups" (群聊协作)
- "tools" (工具配置)
- "pets" (宠物空间)
- "changes" (代码变更)
- "tasks" (任务派发)
- "cron" (定时任务)
- "terminal" (内置终端)
- "templates" (对话模板)
- "dashboard" (协作仪表盘)
- "metrics" (性能监控)
- "search" (对话搜索)
- "music" (音乐播放)
- "settings" (系统设置)
\`\`\`action
{
  "type": "navigate",
  "params": {
    "tab": "页面ID"
  }
}
\`\`\`

d. 创建/派发协作开发任务（create_task）：
当用户说“创建开发任务”、“派发任务”、“新建任务”时使用。你应从上下文提取关键字段，如果没有指定 group_id，可默认为 "gmps7ha15"。
\`\`\`action
{
  "type": "create_task",
  "params": {
    "title": "任务标题",
    "business_goal": "业务目标",
    "scope": "开发范围/涉及的修改内容",
    "acceptance": "验收标准",
    "group_id": "目标群聊 ID，必须从群聊列表中选择匹配的 ID"
  }
}
\`\`\`

e. 给指定项目发送指令（send_project_cmd）：
当用户说“帮我修改xxx项目”、“对xxx项目发送指令”、“让项目agent改一下xxx”时使用。
project 参数必须来自项目列表。
\`\`\`action
{
  "type": "send_project_cmd",
  "params": {
    "project": "项目名称（例如 smart-live-Cloud 或 smart-live-app）",
    "message": "用户要对该项目发送的具体修改指令"
  }
}
\`\`\`

f. 给项目组/群聊下单指令（send_group_cmd）：
当用户说“给某个项目组/群聊发指令说修改xxx bug”、“在群里下单xxx”等时使用。
groupId 参数必须来自现有群聊的 ID。
\`\`\`action
{
  "type": "send_group_cmd",
  "params": {
    "groupId": "群聊 ID (例如 gmps7ha15)",
    "message": "下单的具体指令或消息"
  }
}
\`\`\`

g. 创建定时任务（create_cron_task）：
当用户说“创建一个定时任务”、“新建定时任务”、“定时执行xxx”时使用。你应从上下文提取关键字段，并将时间周期翻译成标准的 5 位 Cron 表达式。
target_type 可以是 "group"（群聊）或 "project"（项目）。如果是群聊，必须从现有群聊列表中选择匹配的 group_id。如果是项目，必须从项目列表中选择匹配的 project 字段。
\`\`\`action
{
  "type": "create_cron_task",
  "params": {
    "name": "定时任务名称（如 每日代码检查提醒）",
    "schedule": "5位Cron表达式（如每天早上八点为 '0 8 * * *'）",
    "prompt": "定时任务执行时发送的提示词或消息内容",
    "target_type": "group" 或 "project",
    "group_id": "群聊 ID (当 target_type 为 group 时必填)",
    "project": "项目名称 (当 target_type 为 project 时必填)"
  }
}
\`\`\`

h. 创建项目（create_project）：
当用户要“新建项目”、“添加项目”等且指定了名称和工作目录绝对路径时使用。
\`\`\`action
{
  "type": "create_project",
  "params": {
    "name": "项目名称",
    "work_dir": "项目工作区绝对路径 (必须使用正斜杠/，不能使用反斜杠)",
    "agent": "claudecode"
  }
}
\`\`\`

i. 创建对话模板（create_template）：
当用户要“创建模板”、“新建对话模板”、“保存一个对话模板”等时使用。
\`\`\`action
{
  "type": "create_template",
  "params": {
    "name": "模板名称（如 Bug 修复模版）",
    "category": "分类名称 (只能在 'development', 'maintenance', 'review', 'collaboration', 'planning', 'custom' 中选择，默认 custom)",
    "content": "对话模板的具体内容/提示词"
  }
}
\`\`\`

j. 项目生命周期控制（control_project）：
当用户说“启动 xxx 项目”、“运行 xxx 项目”、“停止 xxx 项目”、“关闭 xxx 服务”等时使用。project 必须来自项目列表。
\`\`\`action
{
  "type": "control_project",
  "params": {
    "project": "项目名称",
    "action": "start" 或 "stop",
    "agent": "可选 Agent 类型，默认 claudecode"
  }
}
\`\`\`

k. 代码变更智能审查（git_review）：
当用户要审查指定项目的 Git 代码变动，或者问“帮我看看xxx项目改了什么”时使用。project 必须来自项目列表。
\`\`\`action
{
  "type": "git_review",
  "params": {
    "project": "项目名称"
  }
}
\`\`\`

l. 代码提交（git_commit）：
当用户要将代码更改提交到 Git 仓库，或者说“自动提交xxx项目的代码”时使用。project 必须来自项目列表。
\`\`\`action
{
  "type": "git_commit",
  "params": {
    "project": "项目名称",
    "message": "提交注释（可选，若用户指定了则填入，未指定可为空让系统生成）",
    "files": ["指定提交的文件路径列表，若为空则提交所有修改（可选）"]
  }
}
\`\`\`

【关键规则】
1. 代码块标记必须用 \`\`\`action 开头，\`\`\` 结尾，各占独立一行。
2. 内部数据必须是合法的 JSON，不要胡乱捏造不存在的项目名称或群聊 ID。
3. 如果用户只是闲聊、提问、不涉及上述动作，千万不要输出 \`\`\`action 代码块。
4. 回复一律使用中文，语气专业而积极。`;

        // 4. 构建大模型消息历史
        const messages = [{ role: "system", content: systemPrompt }];
        for (const h of (history || []).slice(-10)) {
          // 清洗掉历史中可能包含 of action 代码块，避免干扰大模型本次判断
          const contentClean = (h.content || "").replace(/```action[\s\S]*?```/g, "").trim();
          messages.push({ role: h.role === "user" ? "user" : "assistant", content: contentClean });
        }
        // 包装 user message 强化动作识别率
        const userPrompt = `【用户指令】\n${finalMessage}\n\n请针对上述用户指令进行意图识别。如果包含明确的控制意图（如播放音乐、控制宠物、页面跳转、创建任务、项目指令、群聊下单、定时任务、创建项目、创建模版），请务必在你的回复末尾附带 \`\`\`action 代码块（JSON格式），不能只返回欢迎词，必须立刻生成动作指令！`;
        messages.push({ role: "user", content: userPrompt });

        // 5. 调用大模型。明确控制意图在模型异常时回落到本地规则，避免基础控制能力被远端 API 状态拖垮。
        let parsedReply = "";
        try {
          parsedReply = await callLlm(config, messages);
        } catch (llmErr: any) {
          if (localIntent) {
            return sendJson(res, {
              success: true,
              reply: `${localIntent.reply}

提示：统一大模型暂时调用失败（${llmErr.message || "未知错误"}），我已先按本地规则执行这个明确指令。`,
              action: localIntent.action,
              files: files ? files.map(f => ({ name: f.filename, size: f.size, savedPath: f.savedPath })) : []
            });
          }
          throw llmErr;
        }
        
        // 6. 解析 action
        const actionMatch = parsedReply.match(/```action([\s\S]*?)```/);
        let action: any = null;
        let reply = parsedReply.replace(/```action[\s\S]*?```/g, "").trim();

        if (actionMatch) {
          try {
            action = JSON.parse(actionMatch[1].trim());
          } catch (e: any) {
            console.error("解析全局助手 Action 失败:", e.message);
          }
        }

        if (!action && localIntent) {
          action = localIntent.action;
          reply = reply ? `${reply}

${localIntent.reply}` : localIntent.reply;
        }

        sendJson(res, {
          success: true,
          reply,
          action,
          files: files ? files.map(f => ({ name: f.filename, size: f.size, savedPath: f.savedPath })) : []
        });
      } catch (err: any) {
        sendJson(res, { error: err.message || "请求处理失败" }, 500);
      }
    };

    if (contentType.includes("multipart/form-data")) {
      collectRequestBuffer(req).then((buffer) => {
        try {
          const boundary = getMultipartBoundary(contentType);
          if (!boundary) return sendJson(res, { error: "无效的 multipart 请求" }, 400);
          const { files, fields } = parseMultipart(buffer, boundary);
          let history: any[] = [];
          try {
            history = JSON.parse(fields.history || "[]");
          } catch (e) {}
          handleChat(fields.message, history, files);
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
        const { message, history } = JSON.parse(body || "{}");
        await handleChat(message, history, []);
      } catch (e: any) {
        sendJson(res, { error: e.message }, 400);
      }
    });
    return true;
  }
  // 7. 新增智能代码审查接口
  if (pathname === "/api/global-agent/git-review" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { project } = JSON.parse(body || "{}");
        if (!project) return sendJson(res, { error: "缺少项目参数" }, 400);
        
        const configs = getConfigs();
        const config = configs.find(c => c.name === project);
        if (!config) return sendJson(res, { error: "项目不存在" }, 404);
        
        const info = getConfigInfo(config.path);
        const workDir = info[0]?.workDir;
        if (!workDir) return sendJson(res, { error: "项目工作区目录未配置" }, 400);
        
        // 执行 Git 命令获取变更状态和 diff
        let status = "";
        let diff = "";
        try {
          status = execFileSync("git", ["status", "--porcelain"], { encoding: "utf-8", cwd: workDir });
          diff = execFileSync("git", ["diff"], { encoding: "utf-8", cwd: workDir, maxBuffer: 10 * 1024 * 1024 });
          // 如果工作区干净，尝试对比暂存区
          if (!diff.trim()) {
            diff = execFileSync("git", ["diff", "--staged"], { encoding: "utf-8", cwd: workDir, maxBuffer: 10 * 1024 * 1024 });
          }
        } catch (gitErr: any) {
          return sendJson(res, { error: "获取 Git 变更失败，请确保该项目是 Git 仓库且本地安装了 Git: " + gitErr.message }, 500);
        }
        
        if (!status.trim()) {
          return sendJson(res, { success: true, review: "🔍 该项目当前干净，没有未提交的代码变更需要审查。" });
        }
        
        // 限制 diff payload 的最大长度以防超限
        const maxDiffLength = 12000;
        let diffPayload = diff;
        if (diffPayload.length > maxDiffLength) {
          diffPayload = diffPayload.slice(0, maxDiffLength) + "\n\n...(由于内容过多，部分 diff 差异已截断)\n";
        }
        
        // 调用大模型进行代码审查
        const orchestratorConfig = loadOrchestratorConfig();
        if (!orchestratorConfig.apiKey || !orchestratorConfig.apiUrl) {
          return sendJson(res, { error: "统一大模型未配置，请先到「系统设置」中完善配置" }, 400);
        }
        
        const reviewPrompt = `你是一个拥有多年研发经验的技术专家与资深代码审查员(Code Reviewer)。
请对以下项目「${project}」的本地 Git 代码变更进行智能审查。

【Git 状态详情】
${status}

【Git Diff 内容】
\`\`\`diff
${diffPayload}
\`\`\`

请用中文产出结构化、专业的审查报告，格式如下：
1. **变更概要**：简要说明本次修改涉及了哪些文件，主要做了什么功能或修复。
2. **潜在风险与缺陷审查**：分析修改后的代码，排查是否有潜在 Bug、逻辑漏洞、死循环、并发冲突或安全漏洞，如果没有，请说明通过审查。
3. **代码质量与改进建议**：指出可以优化重构的代码、可读性改进点，或是否遗漏了测试命令。
4. **推荐 Commit 注释**：提供一个简洁、规范的推荐 Git 提交注释（建议遵循 Angular 规范，如 "feat(ui): 增加xxx组件"）。

请仅返回上述报告的 Markdown 文本，排版必须美观大方。`;

        const messages = [
          { role: "system", content: "你是一个专业的 AI 代码审查助手。" },
          { role: "user", content: reviewPrompt }
        ];
        
        const reviewResult = await callLlm(orchestratorConfig, messages);
        sendJson(res, { success: true, review: reviewResult });
      } catch (err: any) {
        sendJson(res, { error: err.message || "代码审查执行出错" }, 500);
      }
    });
    return true;
  }

  return false;
}

async function callLlm(config: any, messages: any[]): Promise<string> {
  const isAnthropic = config.format === "anthropic-compatible" || (config.model && config.model.toLowerCase().includes("claude"));
  const endpoint = isAnthropic
    ? (config.apiUrl.endsWith("/v1/messages") ? config.apiUrl : `${config.apiUrl.replace(/\/+$/, "")}/v1/messages`)
    : (config.apiUrl.endsWith("/chat/completions") ? config.apiUrl : `${config.apiUrl.replace(/\/+$/, "")}/chat/completions`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(5000, Number(config.timeoutMs) || 60000));

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    let bodyObj: any = {};

    if (isAnthropic) {
      headers["x-api-key"] = config.apiKey;
      headers["anthropic-version"] = "2023-06-01";
      const system = messages.find(m => m.role === "system")?.content || "";
      const userMsgs = messages
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
      bodyObj = {
        model: config.model,
        max_tokens: 2000,
        temperature: 0.3,
        system,
        messages: userMsgs
      };
    } else {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
      bodyObj = {
        model: config.model,
        temperature: 0.3,
        messages: messages
      };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyObj),
      signal: controller.signal
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`统一大模型 API 调用失败: HTTP ${response.status} - ${text.slice(0, 200)}`);
    }

    const data = JSON.parse(text);
    if (isAnthropic) {
      return (data?.content || []).map((part: any) => part?.type === "text" ? part.text : "").join("").trim();
    } else {
      return data?.choices?.[0]?.message?.content || "";
    }
  } finally {
    clearTimeout(timeout);
  }
}
