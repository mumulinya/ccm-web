"use strict";
// DIAGNOSTIC/OFFLINE ONLY: local keyword rules must never enter the healthy model main path.
// Healthy routing is decided by the model and tools; this module is only for offline diagnostics and dedicated degraded entrypoints.
Object.defineProperty(exports, "__esModule", { value: true });
exports.RANDOM_MUSIC_KEYWORD = void 0;
exports.normalizeText = normalizeText;
exports.stripActionWords = stripActionWords;
exports.parseMusicKeyword = parseMusicKeyword;
exports.findProjectName = findProjectName;
exports.findGroup = findGroup;
exports.findAllProjectNames = findAllProjectNames;
exports.resolveImplicitCurrentProject = resolveImplicitCurrentProject;
exports.findAllGroups = findAllGroups;
exports.buildLocalDevelopmentTargets = buildLocalDevelopmentTargets;
exports.hasExplicitDevelopmentExecutionIntent = hasExplicitDevelopmentExecutionIntent;
exports.chineseNumberToInt = chineseNumberToInt;
exports.normalizeCronHour = normalizeCronHour;
exports.guessCronSchedule = guessCronSchedule;
exports.inferLocalConversationFallback = inferLocalConversationFallback;
exports.hasExplicitGlobalWriteAuthorization = hasExplicitGlobalWriteAuthorization;
exports.inferLocalGlobalAction = inferLocalGlobalAction;
exports.createActionBlockSafeStreamer = createActionBlockSafeStreamer;
function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
function stripActionWords(value) {
    return normalizeText(value)
        .replace(/^(请|帮我|麻烦|给我|我要|我想|想要|可以)?/g, "")
        .replace(/(一下|下|吧|呢|谢谢)$/g, "")
        .trim();
}
exports.RANDOM_MUSIC_KEYWORD = "__random__";
function parseMusicKeyword(message) {
    const text = stripActionWords(message);
    const keyword = text
        .replace(/^(?:随机|随便|任意)?\s*(播放|放一首|放|来一首|来点|听|我想听|我要听|搜首歌|搜索(?:一下)?(?:歌曲|歌)?)/, "")
        .replace(/^(?:一首|首|点|点儿|点歌)\s*/, "")
        .replace(/(?:的)?(音乐|歌曲|歌)$/g, "")
        .trim();
    if (!keyword || /^(随机|随便|任意|音乐|歌曲|歌|播放|播放音乐|听歌)$/.test(keyword))
        return "";
    return keyword;
}
function findProjectName(message, projects) {
    const text = message.toLowerCase();
    return projects.find(project => text.includes(String(project).toLowerCase())) || "";
}
function findGroup(message, groups) {
    const text = message.toLowerCase();
    return groups.find(group => {
        const id = String(group?.id || "").toLowerCase();
        const name = String(group?.name || "").toLowerCase();
        return (id && text.includes(id)) || (name && text.includes(name));
    }) || null;
}
function findAllProjectNames(message, projects) {
    const text = message.toLowerCase();
    return projects.filter(project => text.includes(String(project).toLowerCase()));
}
function resolveImplicitCurrentProject(message, projects) {
    const text = normalizeText(message).toLowerCase();
    const hasImplicitProject = /(?:这个|当前|本|该)\s*(?:项目|代码库|仓库|系统)|(?:项目|代码库|仓库|系统)\s*(?:这个|当前|本|该)/.test(text);
    if (!hasImplicitProject)
        return "";
    const ccmProject = projects.find(project => /cc[-_]?connect|ccm/i.test(String(project)));
    if (ccmProject)
        return ccmProject;
    return projects.length === 1 ? projects[0] : "";
}
function findAllGroups(message, groups) {
    const text = message.toLowerCase();
    return groups.filter(group => {
        const id = String(group?.id || "").toLowerCase();
        const name = String(group?.name || "").toLowerCase();
        return (id && text.includes(id)) || (name && text.includes(name));
    });
}
function buildLocalDevelopmentTargets(message, projects, groups) {
    const matchedGroups = findAllGroups(message, groups);
    const matchedProjects = findAllProjectNames(message, projects);
    const implicitProject = matchedProjects.length ? "" : resolveImplicitCurrentProject(message, projects);
    const requestsWholeWorkspace = /(?:所有|全部|全量|整个|全局|全项目|跨项目).*(?:项目|代码库|仓库|系统)|(?:项目|代码库|仓库|系统).*(?:全部|全量|整体|全局)/.test(message);
    const targets = [
        ...matchedGroups.map((group) => ({
            type: "group",
            group_id: group.id,
            reason: "用户明确提到开发群聊「" + (group.name || group.id) + "」",
            task: message,
        })),
        ...matchedProjects.map((project) => ({
            type: "project",
            project,
            reason: "用户明确提到项目「" + project + "」",
            task: message,
        })),
        ...(implicitProject ? [{
                type: "project",
                project: implicitProject,
                reason: "用户使用“当前/这个项目”指代，已解析到项目「" + implicitProject + "」",
                task: message,
            }] : []),
    ];
    if (targets.length > 0)
        return targets;
    if (requestsWholeWorkspace && projects.length > 0) {
        return projects.map((project) => ({
            type: "project",
            project,
            reason: "用户明确要求覆盖整个项目工作区",
            task: message,
        }));
    }
    return [];
}
/**
 * 仅用于大模型不可用时的保底判断。正常聊天路径由大模型决定是否产生 action，
 * 这里不能因为出现“知识库 / 实现 / 优化”等主题词就自动创建项目任务。
 */
function hasExplicitDevelopmentExecutionIntent(message) {
    const text = normalizeText(message);
    if (!text)
        return false;
    if (/(?:只是|仅仅|只想|先)(?:问问|了解|咨询|讨论|解释|分析)|不要(?:执行|修改|创建|派发)|不用(?:执行|修改|创建|派发)/.test(text))
        return false;
    const hasDevelopmentAction = /(实现|新增|添加|修改|改造|修复|重构|优化|完成|对接|上线|部署|运行|执行|测试|检查|排查|审查|提交|创建)/.test(text);
    if (!hasDevelopmentAction)
        return false;
    const isExplanatoryQuestion = /[?？]|(?:怎么|如何|为什么|是什么|原理|介绍|讲讲|说明|能不能|可不可以|是否|有哪些|有什么)/.test(text);
    const explicitDirective = /^(?:实现|新增|添加|修改|改造|修复|重构|优化|完成|对接|上线|部署|运行|执行|测试|检查|排查|审查|提交|创建)/.test(text)
        || /(?:请(?!问)|帮我|麻烦|给我|需要你|我要你|直接|立即|马上|开始).*(?:实现|新增|添加|修改|改造|修复|重构|优化|完成|对接|上线|部署|运行|执行|测试|检查|排查|审查|提交|创建)/.test(text);
    return explicitDirective && !isExplanatoryQuestion;
}
function chineseNumberToInt(value) {
    const text = String(value || "").trim();
    if (!text)
        return NaN;
    if (/^\d+$/.test(text))
        return Number(text);
    const map = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    if (text === "十")
        return 10;
    const tenIdx = text.indexOf("十");
    if (tenIdx >= 0) {
        const left = text.slice(0, tenIdx);
        const right = text.slice(tenIdx + 1);
        return (left ? map[left] || 0 : 1) * 10 + (right ? map[right] || 0 : 0);
    }
    return map[text] ?? NaN;
}
function normalizeCronHour(raw, text) {
    let hour = chineseNumberToInt(raw);
    if (Number.isNaN(hour))
        return NaN;
    if (/下午|晚上|傍晚/.test(text) && hour < 12)
        hour += 12;
    if (/中午/.test(text) && hour < 11)
        hour += 12;
    return Math.max(0, Math.min(23, hour));
}
function guessCronSchedule(message) {
    const text = normalizeText(message);
    const everyHour = /每(个)?小时|每小时/.test(text);
    if (everyHour)
        return "0 * * * *";
    const minuteMatch = text.match(/每(?:隔)?(\d{1,2})\s*分钟/);
    if (minuteMatch)
        return `*/${Math.max(1, Math.min(59, Number(minuteMatch[1])))} * * * *`;
    const dayHourMatch = text.match(/(?:每天|每日)(?:早上|上午|中午|下午|晚上|傍晚)?\s*([零〇一二两三四五六七八九十\d]{1,3})\s*(?:点|:00)/)
        || text.match(/(?:早上|上午|中午|下午|晚上|傍晚)\s*([零〇一二两三四五六七八九十\d]{1,3})\s*(?:点|:00)/);
    if (dayHourMatch) {
        const hour = normalizeCronHour(dayHourMatch[1], text);
        if (!Number.isNaN(hour))
            return `0 ${hour} * * *`;
    }
    const weekMap = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
    const weekMatch = text.match(/每(?:周|星期)([一二三四五六日天])(?:早上|上午|中午|下午|晚上|傍晚)?\s*([零〇一二两三四五六七八九十\d]{1,3})\s*(?:点|:00)/);
    if (weekMatch) {
        const hour = normalizeCronHour(weekMatch[2], text);
        if (!Number.isNaN(hour))
            return `0 ${hour} * * ${weekMap[weekMatch[1]]}`;
    }
    const cronMatch = text.match(/(?:cron|表达式)\s*[:：]?\s*([0-9*,/\-?]+\s+[0-9*,/\-?]+\s+[0-9*,/\-?]+\s+[0-9*,/\-?]+\s+[0-9*,/\-?]+)/i);
    if (cronMatch)
        return cronMatch[1].trim();
    return "";
}
function inferLocalConversationFallback(message) {
    const compact = normalizeText(message).replace(/[。！？!?]+$/g, "").trim().toLowerCase();
    const greeting = /^(?:你好|您好|嗨|哈喽|嘿|在吗|早上好|上午好|下午好|晚上好|hi|hello|hey)(?:呀|啊|哦|哟|啦)?$/i.test(compact);
    const identityQuestion = /^(?:你是谁|你是什么|你能做什么|你会做什么|介绍一下你自己)$/i.test(compact);
    if (!greeting && !identityQuestion)
        return null;
    const reply = identityQuestion
        ? "我是全局助手，可以回答问题，也可以在你明确提出任务时协调项目、群聊和执行成员完成工作。"
        : compact === "在吗"
            ? "在的，有什么我可以帮你的吗？"
            : "你好！有什么我可以帮你的吗？";
    return {
        reply,
        action: null,
        intent: {
            category: "conversation",
            goal: identityQuestion ? "了解全局助手" : "普通问候",
            action_required: false,
            confidence: 1,
            authorization_basis: "none",
            reason: identityQuestion ? "普通身份问答" : "普通问候",
        },
    };
}
function hasExplicitGlobalWriteAuthorization(message) {
    const text = normalizeText(message);
    if (!text)
        return false;
    if (/(?:不要|不用|先别|暂时别|仅|只)(?:执行|操作|修改|创建|派发|启动|停止|删除|提交)/.test(text))
        return false;
    if (hasExplicitDevelopmentExecutionIntent(text))
        return true;
    const explicitVerb = /(创建|新建|添加|派发|启动|开启|停止|关闭|暂停|恢复|继续|重试|提交|删除|移除|播放|打开|运行|执行)/;
    const explicitAuthorization = /(?:我)?明确授权(?:你|系统|全局Agent|全局agent)?/.test(text) && explicitVerb.test(text);
    const directive = explicitVerb.test(text) && (/^(请|帮我|麻烦|给我|直接|立即|马上|开始|创建|新建|添加|派发|启动|开启|停止|关闭|暂停|恢复|继续|重试|提交|删除|移除|播放|打开|运行|执行)/.test(text) || /(?:我要你|需要你|由你|替我)/.test(text));
    const explicitDispatch = /^(?:请)?给.+(?:群|项目|Agent|agent).*(?:派发|下发|修复|实现|修改|处理|执行)/.test(text);
    const explicitGenericTarget = /^给(?:某个|这个|该)?(?:项目|群聊|Agent|agent).*(?:加|新增|实现|修改|修复|处理|执行)/.test(text);
    const explanatory = /(?:怎么|如何|为什么|是什么|原理|介绍|讲讲|说明|能否|能不能|可不可以|是否|有哪些|有什么)[^。！？]*[?？]?$/i.test(text);
    return (explicitAuthorization || directive || explicitDispatch || explicitGenericTarget) && !explanatory;
}
function inferLocalGlobalAction(message, projects, groups, resources = {}) {
    const text = normalizeText(message);
    if (!text)
        return null;
    const conversationFallback = inferLocalConversationFallback(text);
    if (conversationFallback)
        return conversationFallback;
    const explicitWriteAuthorization = hasExplicitGlobalWriteAuthorization(text);
    const explicitReadRequest = /^(?:请)?(?:查看|列出|检查|打开|进入|跳转|搜索|查询)|(?:系统|任务|项目|群聊|定时任务).*(?:当前状态|运行状态|列表)/.test(text);
    const consultationOnly = /[?？]|(?:怎么|如何|为什么|是什么|原理|介绍|讲讲|说明|建议|觉得|能否|能不能|可不可以|是否|会不会|有哪些|有什么)/.test(text);
    if (/(?:不要|不用|先别|暂时别).*(?:执行|操作|修改|创建|派发|启动|停止|删除|提交)/.test(text))
        return null;
    if (consultationOnly && !explicitWriteAuthorization && !explicitReadRequest)
        return null;
    const lower = text.toLowerCase();
    const matchedProject = findProjectName(text, projects);
    const matchedGroup = findGroup(text, groups);
    const cronJobs = Array.isArray(resources.cronJobs) ? resources.cronJobs : [];
    const tasks = Array.isArray(resources.tasks) ? resources.tasks : [];
    const mcpTools = Array.isArray(resources.mcpTools) ? resources.mcpTools : [];
    const skills = Array.isArray(resources.skills) ? resources.skills : [];
    const matchedCron = cronJobs.find((item) => text.includes(String(item.id || "")) || text.includes(String(item.name || "")));
    const matchedTask = tasks.find((item) => text.includes(String(item.id || "")) || (item.title && text.includes(String(item.title))));
    const matchedMcp = mcpTools.find((item) => item.name && text.includes(String(item.name)));
    const matchedSkill = skills.find((item) => item.name && text.includes(String(item.name)));
    if (/(系统状态|运行状态|健康状态|检查系统|系统概况|当前状态)/.test(text) && !/(定时任务|计划任务|定时执行|每天|每日|每周|每小时|创建|新建|添加)/.test(text)) {
        return {
            reply: "我会检查项目、群聊、任务队列、定时调度和工具运行状态。",
            action: { type: "system_status", params: { operation: "inspect" } }
        };
    }
    if (/定时任务|计划任务|定时执行|cron|每(天|周|星期|小时|隔)/i.test(text) && /(查看|列出|创建|新建|添加|启用|开启|暂停|禁用|立即运行|执行一次|删除|修改|更新|定时|每)/.test(text)) {
        const operation = /(创建|新建|添加)/.test(text) ? "create"
            : /删除/.test(text) ? "delete"
                : /(暂停|禁用|关闭)/.test(text) ? "disable"
                    : /(启用|开启|恢复)/.test(text) ? "enable"
                        : /(立即运行|执行一次|马上执行)/.test(text) ? "run"
                            : /(修改|更新)/.test(text) ? "update"
                                : "list";
        if (["create", "update"].includes(operation) && !matchedGroup && !matchedProject)
            return null;
        const schedule = guessCronSchedule(text);
        const targetType = matchedGroup || !matchedProject ? "group" : "project";
        const group = matchedGroup || groups[0] || null;
        const project = matchedProject || projects[0] || "";
        const prompt = text.replace(/创建|新建|添加|一个|定时任务|计划任务/g, "").trim() || text;
        return {
            reply: "我会执行定时任务管理操作：" + operation + "。",
            action: {
                type: "manage_cron",
                params: {
                    operation,
                    id: matchedCron?.id || "",
                    name: operation === "create" ? (prompt.slice(0, 28) || "全局助手定时任务") : (matchedCron?.name || ""),
                    schedule: schedule || undefined,
                    prompt: operation === "create" ? prompt : undefined,
                    target_type: operation === "create" ? targetType : undefined,
                    group_id: operation === "create" && targetType === "group" ? group?.id : undefined,
                    project: operation === "create" && targetType === "project" ? project : undefined,
                }
            }
        };
    }
    if (/任务/.test(text) && /(查看任务|任务列表|暂停|继续|恢复|重试|重新执行|删除任务|取消任务|加入队列)/.test(text)) {
        const operation = /(删除|取消)/.test(text) ? "delete"
            : /暂停/.test(text) ? "pause"
                : /重试|重新执行/.test(text) ? "retry"
                    : /加入队列/.test(text) ? "queue"
                        : /继续/.test(text) ? "continue"
                            : /恢复/.test(text) ? "resume"
                                : "list";
        return {
            reply: "我会执行开发任务管理操作：" + operation + "。",
            action: { type: "manage_task", params: { operation, id: matchedTask?.id || "", message: text } }
        };
    }
    if (/(群聊|项目组)/.test(text) && /(创建|新建|重命名|改名|添加成员|移除成员|删除群聊|删除项目组|查看群聊|群聊列表)/.test(text)) {
        const operation = /(删除群聊|删除项目组)/.test(text) ? "delete"
            : /添加成员/.test(text) ? "add_member"
                : /移除成员/.test(text) ? "remove_member"
                    : /(重命名|改名)/.test(text) ? "rename"
                        : /(创建|新建)/.test(text) ? "create"
                            : "list";
        return {
            reply: "我会执行群聊管理操作：" + operation + "。",
            action: {
                type: "manage_group",
                params: { operation, id: matchedGroup?.id || "", name: matchedGroup?.name || stripActionWords(text).slice(0, 40), project: matchedProject || "" }
            }
        };
    }
    if (/(MCP|mcp|Skill|skill|技能)/.test(text) && /(查看|列表|状态|重载|重新加载|删除|移除|创建|添加)/.test(text)) {
        const kind = /(Skill|skill|技能)/.test(text) ? "skill" : "mcp";
        const operation = /(删除|移除)/.test(text) ? "delete"
            : /(重载|重新加载)/.test(text) ? "reload"
                : /(创建|添加)/.test(text) ? "create"
                    : /状态/.test(text) ? "status"
                        : "list";
        return {
            reply: "我会执行 " + kind.toUpperCase() + " 管理操作：" + operation + "。",
            action: {
                type: "manage_tool",
                params: { operation, kind, name: kind === "mcp" ? matchedMcp?.name || "" : matchedSkill?.name || "" }
            }
        };
    }
    if (/(项目|Agent|agent)/.test(text) && !/运行.*(?:测试|检查|构建|命令)/.test(text) && /(项目列表|查看项目|列出项目|创建项目|新建项目|启动|运行|拉起|开启|停止|关闭|停掉|结束|删除项目|移除项目|修改.*Agent|切换.*Agent|更换.*Agent|修改项目配置)/i.test(text)) {
        const operation = /(创建项目|新建项目)/.test(text) ? "create"
            : /(删除项目|移除项目)/.test(text) ? "delete"
                : /(启动|运行|拉起|开启)/.test(text) ? "start"
                    : /(停止|关闭|停掉|结束)/.test(text) ? "stop"
                        : /(修改.*Agent|切换.*Agent|更换.*Agent|修改项目配置)/i.test(text) ? "update"
                            : "list";
        const agentMatch = text.match(/(claudecode|claude|codex|cursor|gemini|opencode|qoder)/i);
        const nameMatch = text.match(/(?:创建项目|新建项目|创建一个项目|新建一个项目)\s*[「"']?([^，。,\.\s"'」]+)/);
        const workDirMatch = text.match(/(?:目录|路径|work_dir|工作目录)\s*[:：]?\s*([A-Za-z]:\\[^，。\n]+|\/[^，。\s]+)/i);
        const project = matchedProject || (operation === "create" ? (nameMatch?.[1] || "") : "");
        return {
            reply: "我会执行项目管理操作：" + operation + "。",
            action: {
                type: "manage_project",
                params: {
                    operation,
                    project,
                    name: operation === "create" ? project : matchedProject,
                    work_dir: workDirMatch?.[1] || undefined,
                    agent: agentMatch?.[1] || undefined,
                }
            }
        };
    }
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
    const pageMap = [
        [/音乐|播放器|听歌/, "music", "音乐播放"],
        [/宠物|桌宠/, "pets", "宠物空间"],
        [/项目管理|项目列表/, "projects", "项目管理"],
        [/群聊|项目组|协作/, "groups", "群聊协作"],
        [/任务派发|任务列表|开发任务/, "tasks", "任务派发"],
        [/定时任务|计划任务|cron/i, "cron", "定时任务"],
        [/终端|控制台/, "terminal", "内置终端"],
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
    if (matchedProject && !/运行.*(?:测试|检查|构建|命令)/.test(text) && /(?:启动|运行|拉起|开启|打开)\s*(?:项目|服务|agent|Agent)?|(?:项目|服务|agent|Agent).*?(?:启动|运行|拉起|开启)/.test(text)) {
        return {
            reply: `我会启动项目「${matchedProject}」。`,
            action: { type: "manage_project", params: { operation: "start", project: matchedProject } }
        };
    }
    if (matchedProject && /(?:停止|关闭|停掉|结束)\s*(?:项目|服务|agent|Agent)?|(?:项目|服务|agent|Agent).*?(?:停止|关闭|停掉|结束)/.test(text)) {
        return {
            reply: `我会停止项目「${matchedProject}」。`,
            action: { type: "manage_project", params: { operation: "stop", project: matchedProject } }
        };
    }
    if (/(?:关掉|关闭|停止|停下|暂停|别放|不要放).{0,8}(?:音乐|歌曲|歌|播放)|(?:音乐|歌曲|播放).{0,8}(?:关掉|关闭|停止|停下|暂停)|停歌|别放歌|不要放歌/.test(text)
        && !/(?:项目|服务|agent|任务|群|进程)/i.test(text)) {
        return {
            reply: "我会停止当前音乐播放。",
            action: { type: "stop_music", params: {} }
        };
    }
    if (/(播放|放一首|放|来一首|来点|听|我想听|我要听|搜首歌|搜索.*歌)/.test(text) && !/页面|列表|打开音乐/.test(text)) {
        const keyword = parseMusicKeyword(text);
        if (keyword) {
            return {
                reply: `我会交给音乐播放器搜索并播放「${keyword}」。`,
                action: { type: "play_music", params: { keyword, request_text: text } }
            };
        }
        return {
            reply: "我会交给音乐播放器随机播放一首音乐。",
            action: { type: "play_music", params: { keyword: exports.RANDOM_MUSIC_KEYWORD, request_text: text, random: true } }
        };
    }
    if (/定时任务|计划任务|定时执行|每(天|周|星期|小时|隔)/.test(text) && /(创建|新建|添加|定时|每)/.test(text)) {
        if (!matchedGroup && !matchedProject)
            return null;
        const schedule = guessCronSchedule(text);
        const targetType = matchedGroup ? "group" : "project";
        const group = matchedGroup || null;
        const project = matchedProject || "";
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
    const isDevelopmentRequest = hasExplicitDevelopmentExecutionIntent(text);
    if (isDevelopmentRequest) {
        const targets = buildLocalDevelopmentTargets(text, projects, groups);
        if (targets.length > 0) {
            return {
                reply: "我会建立跨项目执行计划，并把任务交给 " + targets.length + " 个执行目标持续跟进。",
                action: {
                    type: "orchestrate_development",
                    params: {
                        title: text.slice(0, 60),
                        business_goal: text,
                        scope: "由全局 Agent结合项目和群聊成员关系识别影响范围",
                        documents: text,
                        acceptance: "所有群聊主 Agent和项目 Agent子任务必须通过代码变更与验证检查，全局 Agent再汇总报告完成",
                        execution_order: "parallel",
                        targets,
                    }
                }
            };
        }
    }
    if ((/群聊|项目组|协作组|下单/.test(text) || matchedGroup) && /(修改|修复|bug|派发|指令|下单|处理|实现)/.test(text)) {
        const group = matchedGroup || null;
        if (group) {
            return {
                reply: `我会把这项工作交给协作群「${group.name || group.id}」继续拆分和跟进。`,
                action: {
                    type: "send_group_cmd",
                    params: { group_id: group.id, message: text, target_project: "coordinator" }
                }
            };
        }
    }
    if (matchedProject && /(修改|修复|改一下|处理|实现|新增|删除|优化|项目\s*agent|项目agent)/.test(text)) {
        return {
            reply: `我会把这项工作交给项目「${matchedProject}」的执行成员。`,
            action: { type: "send_project_cmd", params: { project: matchedProject, message: text } }
        };
    }
    if (/创建|新建|派发/.test(text) && /任务|需求|开发/.test(text)) {
        const group = matchedGroup || null;
        if (!group)
            return null;
        return {
            reply: group ? `我会为群聊「${group.name || group.id}」创建并派发开发任务。` : "我会创建一条开发任务。",
            action: {
                type: "create_task",
                params: {
                    title: text.slice(0, 36),
                    business_goal: text,
                    scope: text,
                    group_id: group?.id,
                    acceptance: "子 Agent 提供结果说明；主 Agent 输出最终报告"
                }
            }
        };
    }
    return null;
}
function createActionBlockSafeStreamer(emit) {
    const actionMarker = "```action";
    const fenceMarker = "```";
    let buffer = "";
    let insideAction = false;
    const drain = (final = false) => {
        while (buffer) {
            if (insideAction) {
                const closeIndex = buffer.indexOf(fenceMarker);
                if (closeIndex >= 0) {
                    buffer = buffer.slice(closeIndex + fenceMarker.length);
                    insideAction = false;
                    continue;
                }
                if (final)
                    buffer = "";
                else
                    buffer = buffer.slice(Math.max(0, buffer.length - (fenceMarker.length - 1)));
                return;
            }
            const actionIndex = buffer.indexOf(actionMarker);
            if (actionIndex >= 0) {
                if (actionIndex > 0)
                    emit(buffer.slice(0, actionIndex));
                buffer = buffer.slice(actionIndex + actionMarker.length);
                insideAction = true;
                continue;
            }
            if (final) {
                emit(buffer);
                buffer = "";
                return;
            }
            const safeLength = Math.max(0, buffer.length - (actionMarker.length - 1));
            if (safeLength > 0) {
                emit(buffer.slice(0, safeLength));
                buffer = buffer.slice(safeLength);
            }
            return;
        }
    };
    return {
        push(text) {
            buffer += String(text || "");
            drain(false);
        },
        finish() {
            drain(true);
        },
    };
}
//# sourceMappingURL=global-agent-local-intent.js.map