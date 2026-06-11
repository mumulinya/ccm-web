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
exports.DEFAULT_GROUP_ORCHESTRATOR = exports.COORDINATOR_PROJECT = void 0;
exports.defaultOrchestratorConfig = defaultOrchestratorConfig;
exports.loadOrchestratorConfig = loadOrchestratorConfig;
exports.saveOrchestratorConfig = saveOrchestratorConfig;
exports.publicOrchestratorConfig = publicOrchestratorConfig;
exports.createCoordinatorMember = createCoordinatorMember;
exports.isCoordinatorMember = isCoordinatorMember;
exports.getCoordinatorProject = getCoordinatorProject;
exports.getCoordinatorMember = getCoordinatorMember;
exports.normalizeGroupOrchestrator = normalizeGroupOrchestrator;
exports.isOrchestratorEnabled = isOrchestratorEnabled;
exports.getRoutableMembers = getRoutableMembers;
exports.getMemberNames = getMemberNames;
exports.selectGroupTargets = selectGroupTargets;
exports.resolveMemberRuntime = resolveMemberRuntime;
exports.buildRecentGroupContext = buildRecentGroupContext;
exports.buildGroupCollaborationRules = buildGroupCollaborationRules;
exports.buildCoordinatorCollaborationInstructions = buildCoordinatorCollaborationInstructions;
exports.buildMemberCollaborationInstructions = buildMemberCollaborationInstructions;
exports.buildCoordinatorPrompt = buildCoordinatorPrompt;
exports.buildMemberPrompt = buildMemberPrompt;
exports.analyzeRequirement = analyzeRequirement;
exports.runCodedGroupOrchestrator = runCodedGroupOrchestrator;
exports.buildCodedCoordinatorSummary = buildCodedCoordinatorSummary;
exports.runLlmCoordinatorSummary = runLlmCoordinatorSummary;
exports.runLlmCoordinatorReview = runLlmCoordinatorReview;
exports.decomposeRequirementWithCodedCoordinator = decomposeRequirementWithCodedCoordinator;
exports.runGroupOrchestrator = runGroupOrchestrator;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const db_1 = require("../db");
exports.COORDINATOR_PROJECT = "coordinator";
exports.DEFAULT_GROUP_ORCHESTRATOR = {
    enabled: true,
    mode: "llm_or_coded_coordinator",
    coordinatorProject: exports.COORDINATOR_PROJECT,
    maxDepth: 3,
};
const CCM_DIR = path.join(os.homedir(), ".cc-connect");
const ORCHESTRATOR_CONFIG_FILE = path.join(CCM_DIR, "group-orchestrator-config.json");
function defaultOrchestratorConfig() {
    return {
        enabled: true,
        format: "openai-compatible",
        apiUrl: "https://api.openai.com/v1",
        apiKey: "",
        model: "",
        temperature: 0.2,
        timeoutMs: 45000,
        fallbackToRules: false,
    };
}
function loadOrchestratorConfig() {
    try {
        if (!fs.existsSync(ORCHESTRATOR_CONFIG_FILE))
            return defaultOrchestratorConfig();
        return { ...defaultOrchestratorConfig(), ...JSON.parse(fs.readFileSync(ORCHESTRATOR_CONFIG_FILE, "utf-8")) };
    }
    catch {
        return defaultOrchestratorConfig();
    }
}
function saveOrchestratorConfig(updates) {
    const current = loadOrchestratorConfig();
    const next = { ...current };
    if (updates.enabled !== undefined)
        next.enabled = !!updates.enabled;
    if (updates.format !== undefined)
        next.format = String(updates.format || "openai-compatible");
    if (updates.apiUrl !== undefined)
        next.apiUrl = String(updates.apiUrl || "").trim();
    if (updates.model !== undefined)
        next.model = String(updates.model || "").trim();
    if (updates.temperature !== undefined)
        next.temperature = Number(updates.temperature);
    if (updates.timeoutMs !== undefined)
        next.timeoutMs = Number(updates.timeoutMs);
    if (updates.fallbackToRules !== undefined)
        next.fallbackToRules = !!updates.fallbackToRules;
    if (updates.apiKey !== undefined && String(updates.apiKey || "").trim()) {
        next.apiKey = String(updates.apiKey).trim();
    }
    fs.writeFileSync(ORCHESTRATOR_CONFIG_FILE, JSON.stringify(next, null, 2));
    return next;
}
function publicOrchestratorConfig(config = loadOrchestratorConfig()) {
    const { apiKey, ...safe } = config;
    return { ...safe, hasKey: !!apiKey };
}
function getLlmConfigIssue(config) {
    if (!config.enabled)
        return "主 Agent 大模型 API 未启用";
    if (!String(config.apiUrl || "").trim())
        return "主 Agent API URL 未配置";
    if (!String(config.apiKey || "").trim())
        return "主 Agent API Key 未配置";
    if (!String(config.model || "").trim())
        return "主 Agent 模型未配置";
    if (!["openai-compatible", "anthropic-compatible", "auto"].includes(config.format))
        return `暂不支持的主 Agent API 格式: ${config.format}`;
    return "";
}
function createCoordinatorMember(agent = "coded-orchestrator") {
    return {
        project: exports.COORDINATOR_PROJECT,
        role: "coordinator",
        agent,
    };
}
function isCoordinatorMember(member, group = null) {
    const coordinatorProject = getCoordinatorProject(group);
    return member?.role === "coordinator" || member?.project === coordinatorProject || member?.project === exports.COORDINATOR_PROJECT;
}
function getCoordinatorProject(group) {
    return String(group?.orchestrator?.coordinatorProject || exports.COORDINATOR_PROJECT).trim() || exports.COORDINATOR_PROJECT;
}
function getCoordinatorMember(group) {
    const coordinatorProject = getCoordinatorProject(group);
    const member = (group?.members || []).find((m) => m.project === coordinatorProject || m.role === "coordinator");
    return member || createCoordinatorMember();
}
function normalizeGroupOrchestrator(group) {
    if (!group || typeof group !== "object")
        return group;
    group.orchestrator = {
        ...exports.DEFAULT_GROUP_ORCHESTRATOR,
        ...(group.orchestrator || {}),
    };
    if (group.orchestrator.mode === "coordinator_first" || group.orchestrator.mode === "coded_coordinator") {
        group.orchestrator.mode = exports.DEFAULT_GROUP_ORCHESTRATOR.mode;
    }
    const coordinatorProject = getCoordinatorProject(group);
    const seen = new Set();
    const members = Array.isArray(group.members) ? group.members : [];
    const normalizedMembers = [];
    let coordinator = members.find((m) => m?.project === coordinatorProject || m?.role === "coordinator");
    if (!coordinator) {
        coordinator = createCoordinatorMember();
    }
    coordinator = {
        ...coordinator,
        project: coordinator.project || coordinatorProject,
        role: "coordinator",
        agent: "coded-orchestrator",
    };
    normalizedMembers.push(coordinator);
    seen.add(coordinator.project);
    for (const member of members) {
        if (!member?.project || seen.has(member.project))
            continue;
        if (member.project === coordinator.project)
            continue;
        normalizedMembers.push(member);
        seen.add(member.project);
    }
    group.members = normalizedMembers;
    return group;
}
function isOrchestratorEnabled(group) {
    return normalizeGroupOrchestrator(group).orchestrator?.enabled !== false;
}
function getRoutableMembers(group) {
    return normalizeGroupOrchestrator(group).members.filter((m) => !isCoordinatorMember(m, group));
}
function getMemberNames(group, excludeProject = "") {
    return normalizeGroupOrchestrator(group).members
        .map((m) => m.project)
        .filter((project) => project && project !== excludeProject)
        .join(", ");
}
function selectGroupTargets(group, targetProject) {
    const normalized = normalizeGroupOrchestrator(group);
    const target = String(targetProject || "").trim();
    const isBroadcast = !target || target === "all";
    const coordinator = getCoordinatorMember(normalized);
    if (isBroadcast) {
        const orchestrated = isOrchestratorEnabled(normalized);
        return {
            isBroadcast: true,
            orchestrated,
            targetLabel: orchestrated ? coordinator.project : "all",
            members: orchestrated ? [coordinator] : getRoutableMembers(normalized),
        };
    }
    const member = normalized.members.find((m) => m.project === target);
    return {
        isBroadcast: false,
        orchestrated: member ? isCoordinatorMember(member, normalized) : false,
        targetLabel: target,
        members: member ? [member] : [],
    };
}
function resolveMemberRuntime(projectName, group, configs) {
    const normalized = normalizeGroupOrchestrator(group);
    if (projectName === getCoordinatorMember(normalized).project) {
        return null;
    }
    const member = normalized.members.find((m) => m.project === projectName);
    const config = configs.find((c) => c.name === projectName);
    if (!config)
        return null;
    const info = (0, db_1.getConfigInfo)(config.path)[0] || {};
    return {
        project: projectName,
        workDir: info.workDir || process.cwd(),
        agentType: info.agent || member?.agent || "claudecode",
        configured: true,
    };
}
function buildRecentGroupContext(messages, fullCount = 5) {
    const msgs = messages || [];
    return msgs.map((m, idx) => {
        const who = m.role === "user" ? `[用户 -> ${m.target}]` : `[${m.agent || "Agent"}]`;
        const content = String(m.content || "");
        // 最近 fullCount 条保留全文，更早的只保留前 200 字摘要
        if (idx >= msgs.length - fullCount) {
            return `${who} ${content}`;
        }
        const summary = content.length > 200 ? content.slice(0, 200) + "..." : content;
        return `${who} ${summary}`;
    }).join("\n");
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
    return `\n\n你是群聊的主 Agent（协调者），这是一个独立编排层。你的目标是让多个项目 Agent 像团队群聊一样协作，而不是让所有底层模型同时抢答。${buildGroupCollaborationRules(memberList)}

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
function buildMemberCollaborationInstructions(projectName, memberList = "") {
    return `\n\n你是群聊中的 ${projectName} Agent，代表这个项目参与协作。${buildGroupCollaborationRules(memberList)}

成员 Agent 工作方式：
1. 只对自己项目职责范围内的内容做确定回答或修改；不确定时说明需要谁补充。
2. 回复要像群聊发言：先给结论，再列关键依据、修改点或风险。
3. 如果需要其他项目配合，用独立一行 @项目名 具体任务；不要泛泛 @。
4. 如果你完成了代码或配置修改，说明改了什么、影响范围和验证方式。
5. 如果只是提供建议，不要伪装成已执行修改。
6. 不要重复整段群聊历史，只引用必要上下文。`;
}
function buildCoordinatorPrompt(input) {
    const group = normalizeGroupOrchestrator(input.group);
    const memberList = getRoutableMembers(group).map((m) => `${m.project}(${m.agent || "agent"})`).join(", ");
    const instructions = buildCoordinatorCollaborationInstructions(memberList);
    return `${instructions}${input.toolsContext || ""}${input.sharedFilesContext || ""}
${input.extraInstructions || ""}

以下是群聊最近的消息记录：
${input.context}

用户刚才把这条消息交给主 Agent 协调，请判断是否直接回答，还是拆给某些成员 Agent：
${input.message}`;
}
function buildMemberPrompt(input) {
    const memberList = getMemberNames(input.group, input.projectName);
    const instructions = buildMemberCollaborationInstructions(input.projectName, memberList);
    return `${instructions}${input.toolsContext || ""}${input.sharedFilesContext || ""}
以下是群聊最近的消息记录：
${input.context}

请回复用户刚才发给你的消息：${input.message}`;
}
function compactText(value, maxLength = 360) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`;
}
function containsAny(text, words) {
    return words.some(word => text.includes(word.toLowerCase()));
}
function memberKind(member) {
    const name = String(member?.project || "").toLowerCase();
    if (/app|web|front|frontend|mobile|client|ui|view|页面|前端|客户端/.test(name))
        return "frontend";
    if (/cloud|api|server|backend|service|admin|db|后端|服务端|云/.test(name))
        return "backend";
    return "general";
}
const FRONTEND_HINTS = ["前端", "页面", "界面", "ui", "组件", "样式", "交互", "app", "客户端", "移动端", "小程序", "按钮", "表单", "展示"];
const BACKEND_HINTS = ["后端", "接口", "api", "服务", "数据库", "鉴权", "权限", "字段", "表", "缓存", "队列", "部署", "cloud", "server"];
const BROAD_HINTS = ["全栈", "前后端", "联调", "跨端", "需求", "开发", "实现", "修复", "排查", "bug", "报错", "测试", "验收", "项目"];
const QUESTION_HINTS = ["?", "？", "怎么", "如何", "为什么", "能不能", "是否", "吗"];
const REVIEW_HINTS = ["review", "审查", "评审", "检查代码", "看一下代码", "风险"];
const TEST_HINTS = ["测试", "验收", "验证", "用例", "回归", "自测"];
const BUG_HINTS = ["bug", "报错", "错误", "异常", "失败", "崩溃", "无法", "不生效", "修复"];
const IMPLEMENT_HINTS = ["实现", "开发", "新增", "接入", "适配", "改成", "优化", "重构", "做一下", "加一个"];
const PLANNING_HINTS = ["方案", "设计", "架构", "规划", "拆分", "怎么做", "思路"];
const GREETING_PATTERNS = [
    /^(你好|您好|hi|hello|hey|在吗|在不在|哈喽|嗨)[。！!,.，\s]*$/i,
    /^(早上好|下午好|晚上好|辛苦了)[。！!,.，\s]*$/i,
];
const SIMPLE_MESSAGE_PATTERNS = [
    /^[0-9.,，。!！?？\s]+$/, // 纯数字/标点
    /^(好的|ok|OK|Ok|收到|了解|知道了|嗯|嗯嗯|对|是的|明白|谢谢|感谢|辛苦|没事|没问题|可以|行)[。！!,.，\s]*$/i,
    /^.{0,2}$/, // 1-2 个字符
];
function isGreetingMessage(message) {
    const text = String(message || "").trim();
    return GREETING_PATTERNS.some(pattern => pattern.test(text));
}
function isSimpleMessage(message) {
    const text = String(message || "").trim();
    if (!text)
        return true;
    if (isGreetingMessage(text))
        return true;
    return SIMPLE_MESSAGE_PATTERNS.some(pattern => pattern.test(text));
}
function analyzeRequirement(group, message, context = "") {
    const normalized = normalizeGroupOrchestrator(group);
    const raw = String(message || "").trim();
    const text = raw.toLowerCase();
    const members = getRoutableMembers(normalized);
    const explicitProjects = members
        .map((m) => String(m.project || ""))
        .filter(project => project && (raw.includes(`@${project}`) || text.includes(project.toLowerCase())));
    const domains = [];
    if (containsAny(text, FRONTEND_HINTS))
        domains.push("frontend");
    if (containsAny(text, BACKEND_HINTS))
        domains.push("backend");
    if (/联调|前后端|全栈|跨端|接口.*页面|页面.*接口/.test(raw)) {
        if (!domains.includes("frontend"))
            domains.push("frontend");
        if (!domains.includes("backend"))
            domains.push("backend");
    }
    if (domains.length === 0 && explicitProjects.length > 0) {
        for (const project of explicitProjects) {
            const member = members.find((m) => m.project === project);
            const kind = memberKind(member);
            if (kind !== "general" && !domains.includes(kind))
                domains.push(kind);
        }
    }
    let intent = "discussion";
    if (isGreetingMessage(raw))
        intent = "greeting";
    else if (containsAny(text, BUG_HINTS))
        intent = "bugfix";
    else if (containsAny(text, REVIEW_HINTS))
        intent = "review";
    else if (containsAny(text, TEST_HINTS))
        intent = "verification";
    else if (containsAny(text, IMPLEMENT_HINTS))
        intent = "implementation";
    else if (containsAny(text, PLANNING_HINTS))
        intent = "planning";
    else if (containsAny(text, QUESTION_HINTS))
        intent = "question";
    const deliverables = [];
    if (intent === "implementation")
        deliverables.push("实现方案或代码修改");
    if (intent === "bugfix")
        deliverables.push("问题定位、修复点和验证方式");
    if (intent === "review")
        deliverables.push("风险点、修改建议和结论");
    if (intent === "verification")
        deliverables.push("验证步骤、结果和遗留风险");
    if (intent === "planning")
        deliverables.push("任务拆分、依赖关系和执行顺序");
    if (deliverables.length === 0)
        deliverables.push("结论、依据和下一步");
    const constraints = [];
    if (/不要|不能|避免|必须|需要|要求|只/.test(raw))
        constraints.push("包含用户显式约束，子 Agent 需要逐条遵守");
    if (/紧急|马上|尽快|阻塞|线上/.test(raw))
        constraints.push("优先级较高");
    const missingInfo = [];
    if (!raw)
        missingInfo.push("缺少需求内容");
    if (intent === "bugfix" && !/报错|日志|复现|截图|现象|错误/.test(raw))
        missingInfo.push("缺少具体现象或复现信息");
    if (intent === "implementation" && domains.length === 0 && explicitProjects.length === 0)
        missingInfo.push("未明确涉及哪个项目或端");
    if (domains.length > 1 && !/联调|接口|字段|协议|契约|对接/.test(raw))
        missingInfo.push("跨端任务可能需要确认接口/字段契约");
    const needsCoordination = intent !== "greeting" && (explicitProjects.length > 0 ||
        domains.length > 1 ||
        intent === "implementation" ||
        intent === "bugfix" ||
        intent === "review" ||
        containsAny(text, BROAD_HINTS));
    const summaryParts = [
        intent === "question" ? "用户在咨询问题" : `用户想要${deliverables[0]}`,
        domains.length ? `涉及${domains.join(" + ")}` : "暂未明确项目范围",
        explicitProjects.length ? `点名${explicitProjects.join(", ")}` : ""
    ].filter(Boolean);
    return {
        raw,
        summary: summaryParts.join("；"),
        intent,
        domains,
        deliverables,
        constraints,
        explicitProjects,
        missingInfo,
        needsCoordination,
        contextSignal: context ? compactText(context, 240) : "",
        confidence: explicitProjects.length || domains.length ? 0.82 : needsCoordination ? 0.64 : 0.48,
    };
}
function scoreMember(member, message, analysis = null) {
    const text = message.toLowerCase();
    const name = String(member?.project || "").toLowerCase();
    let score = 0;
    if (name && text.includes(name))
        score += 8;
    if (analysis?.explicitProjects?.includes(member?.project))
        score += 10;
    const kind = memberKind(member);
    if (analysis?.domains?.includes(kind))
        score += 7;
    if (kind === "frontend" && containsAny(text, FRONTEND_HINTS))
        score += 5;
    if (kind === "backend" && containsAny(text, BACKEND_HINTS))
        score += 5;
    if (analysis?.needsCoordination || containsAny(text, BROAD_HINTS))
        score += 1;
    return score;
}
function explicitMentionTargets(group, message) {
    const members = getRoutableMembers(group);
    const results = [];
    const seen = new Set();
    const lines = String(message || "").split(/\r?\n/);
    for (const member of members) {
        const project = String(member.project || "");
        if (!project)
            continue;
        const mention = `@${project}`;
        const line = lines.find(item => item.includes(mention)) || "";
        if (!line)
            continue;
        const task = line.replace(mention, "").replace(/^[\s：:，,、\-—]+/, "").trim() || message;
        if (seen.has(project))
            continue;
        seen.add(project);
        results.push({ member, task });
    }
    return results;
}
function routeMembers(group, message, analysis = null) {
    const normalized = normalizeGroupOrchestrator(group);
    const members = getRoutableMembers(normalized);
    const explicit = explicitMentionTargets(normalized, message);
    if (explicit.length > 0)
        return explicit;
    const requirement = analysis || analyzeRequirement(normalized, message);
    const scored = members
        .map((member) => ({ member, score: scoreMember(member, message, requirement) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);
    if (scored.length > 0) {
        const bestScore = scored[0].score;
        return scored.filter(item => item.score >= Math.max(2, bestScore - 2)).map(item => ({
            member: item.member,
            task: message,
        }));
    }
    const text = String(message || "").toLowerCase();
    if (requirement.needsCoordination || containsAny(text, BROAD_HINTS) || containsAny(text, QUESTION_HINTS)) {
        return members.map((member) => ({ member, task: message }));
    }
    return [];
}
function formatRequirementUnderstanding(analysis) {
    const lines = [
        `意图：${analysis.intent}`,
        `理解：${analysis.summary}`,
        `范围：${analysis.domains.length ? analysis.domains.join(" + ") : "未明确"}`,
        `交付物：${analysis.deliverables.join("、")}`,
    ];
    if (analysis.constraints.length)
        lines.push(`约束：${analysis.constraints.join("、")}`);
    if (analysis.missingInfo.length)
        lines.push(`缺口：${analysis.missingInfo.join("、")}`);
    return lines;
}
function buildDelegationLine(project, task, analysis) {
    const brief = [
        `需求理解：${analysis.summary}`,
        `意图：${analysis.intent}`,
        `交付物：${analysis.deliverables.join("、")}`,
        analysis.constraints.length ? `约束：${analysis.constraints.join("、")}` : "",
        analysis.missingInfo.length ? `注意缺口：${analysis.missingInfo.join("、")}` : "",
        `原始需求：${compactText(task)}`
    ].filter(Boolean).join("；");
    return `@${project} 请从 ${project} 项目职责处理。${brief}。回复时请给出结论、依据、需要修改的点、风险和验证方式。`;
}
function buildVisibleAssignmentLine(item) {
    const project = item?.member?.project || item?.project || "";
    const task = compactText(item?.task || "", 220);
    const reason = compactText(item?.reason || "", 120);
    const dependsOn = String(item?.dependsOn || "").trim();
    const suffix = [
        reason ? `原因：${reason}` : "",
        dependsOn ? `依赖：先等 ${dependsOn}` : "",
    ].filter(Boolean).join("；");
    return `@${project} ${task}${suffix ? `（${suffix}）` : ""}`;
}
function buildAssignment(member, task, reason = "", dependsOn = "") {
    return {
        project: String(member?.project || "").trim(),
        task: String(task || "").trim(),
        reason: String(reason || "").trim(),
        dependsOn: String(dependsOn || "").trim(),
    };
}
function buildAssignmentsFromTargets(targets) {
    return (targets || [])
        .map((item) => buildAssignment(item.member, item.task, item.reason, item.dependsOn))
        .filter((item) => item.project && item.task);
}
function runCodedGroupOrchestrator(input) {
    const group = normalizeGroupOrchestrator(input.group);
    const coordinator = getCoordinatorMember(group);
    const analysis = analyzeRequirement(group, input.message, input.context || "");
    const routed = routeMembers(group, input.message, analysis);
    const members = getRoutableMembers(group);
    // 优化1：简单消息直接给出自然回复，不展示结构化分析
    if (isSimpleMessage(input.message)) {
        const memberNames = members.length ? members.map((m) => m.project).join("、") : "暂无";
        let friendlyReply = "";
        if (analysis.intent === "greeting") {
            friendlyReply = `你好！我是群聊协调者，可以帮你把任务分配给 ${memberNames}。直接说你想做什么就行 😊`;
        }
        else {
            friendlyReply = `收到！如果有具体需求可以直接说，我会安排 ${memberNames} 来处理。`;
        }
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            analysis,
            content: friendlyReply,
        };
    }
    if (members.length === 0) {
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            analysis,
            content: [
                "需求理解：",
                ...formatRequirementUnderstanding(analysis).map(line => `- ${line}`),
                "",
                "判断：当前群聊还没有可分派的项目 Agent。",
                "",
                "当前结论/等待项：请先在群聊成员里添加项目 Agent，然后我再负责协调分配。"
            ].join("\n"),
        };
    }
    if (routed.length === 0) {
        const memberNames = members.map((m) => m.project).join("、");
        const question = analysis.missingInfo[0] || "这是前端、后端、联调还是排查任务";
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            analysis,
            content: `我大致理解了你的需求，不过还需要你补充一下：**${question}**\n\n当前可协调成员：${memberNames}`,
        };
    }
    const delegationLines = routed.map(item => buildVisibleAssignmentLine(item));
    const delegated = routed.map(item => item.member.project);
    return {
        agent: coordinator.project,
        delegated,
        assignments: buildAssignmentsFromTargets(routed),
        executionOrder: "parallel",
        analysis,
        content: [
            `好的，这个需求我安排 ${delegated.join("、")} 来处理。`,
            "",
            ...delegationLines,
            "",
            `等他们回复后我会做汇总 📋`
        ].join("\n"),
    };
}
function buildCodedCoordinatorSummary(group, outputs) {
    const coordinator = getCoordinatorMember(group);
    const count = (outputs || []).filter(Boolean).length;
    if (count === 0)
        return null;
    return {
        agent: coordinator.project,
        content: [
            "协调汇总：",
            `- 已收到 ${count} 个子 Agent 回复。`,
            "- 当前结论：请以上方各项目 Agent 的回复、文件变更和验证说明为准。",
            "- 下一步：如果子 Agent 之间有冲突或缺口，请继续 @ 具体项目补充。"
        ].join("\n"),
    };
}
// 优化2：LLM 驱动的智能汇总
async function runLlmCoordinatorSummary(group, userMessage, outputs) {
    const config = loadOrchestratorConfig();
    const configIssue = getLlmConfigIssue(config);
    if (configIssue)
        return null; // 配置不完整时回退到模板汇总
    const coordinator = getCoordinatorMember(group);
    const validOutputs = (outputs || []).filter(Boolean);
    if (validOutputs.length === 0)
        return null;
    const childReplies = validOutputs.map((text, i) => `--- 子 Agent 回复 ${i + 1} ---\n${String(text).slice(0, 2000)}`).join("\n\n");
    const system = `你是 CCM 群聊的主 Agent（协调者）。子 Agent 已经回复了用户的需求，请你做一个简洁的汇总。

要求：
1. 提取各子 Agent 的核心结论，用 1-3 句话概括每个 Agent 的回复要点
2. 如果子 Agent 之间有冲突或不一致，明确指出
3. 给出下一步建议或需要用户决策的事项
4. 不要重复子 Agent 的全部内容，只做摘要
5. 语气友好自然，像团队 leader 做总结

直接输出汇总文本，不要输出 JSON。`;
    const user = `用户原始需求：${String(userMessage).slice(0, 500)}\n\n以下是各子 Agent 的回复：\n${childReplies}\n\n请输出汇总。`;
    try {
        const messages = [
            { role: "system", content: system },
            { role: "user", content: user },
        ];
        let content = "";
        if (shouldUseAnthropic(config)) {
            const endpoint = normalizeAnthropicMessagesUrl(config.apiUrl);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), Math.max(5000, Number(config.timeoutMs) || 30000));
            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
                    body: JSON.stringify({ model: config.model, max_tokens: 1000, temperature: 0.3, system, messages: [{ role: "user", content: user }] }),
                    signal: controller.signal,
                });
                const text = await response.text();
                if (!response.ok)
                    throw new Error(`HTTP ${response.status}`);
                const data = JSON.parse(text);
                content = (data?.content || []).map((p) => p?.type === "text" ? p.text : "").join("").trim();
            }
            finally {
                clearTimeout(timeout);
            }
        }
        else {
            const endpoint = normalizeChatCompletionsUrl(config.apiUrl);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), Math.max(5000, Number(config.timeoutMs) || 30000));
            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` },
                    body: JSON.stringify({ model: config.model, temperature: 0.3, messages }),
                    signal: controller.signal,
                });
                const text = await response.text();
                if (!response.ok)
                    throw new Error(`HTTP ${response.status}`);
                const data = JSON.parse(text);
                content = data?.choices?.[0]?.message?.content || "";
            }
            finally {
                clearTimeout(timeout);
            }
        }
        if (!content.trim())
            return null;
        return {
            agent: coordinator.project,
            content: `📋 **协调汇总**\n\n${content.trim()}`,
        };
    }
    catch (err) {
        console.error("[LLM汇总] 调用失败:", err.message);
        return null; // 回退到模板汇总
    }
}
async function runLlmCoordinatorReview(group, userMessage, coordinatorPlan, outputs, options = {}) {
    const config = loadOrchestratorConfig();
    const configIssue = getLlmConfigIssue(config);
    if (configIssue)
        return null;
    const normalized = normalizeGroupOrchestrator(group);
    const coordinator = getCoordinatorMember(normalized);
    const allowed = new Map(getRoutableMembers(normalized).map((m) => [m.project, m]));
    const validOutputs = (outputs || []).filter(Boolean);
    if (validOutputs.length === 0)
        return null;
    const allowFollowUps = options.allowFollowUps !== false;
    const childReplies = validOutputs
        .map((text, i) => `--- 子 Agent 回复 ${i + 1} ---\n${String(text).slice(0, 2400)}`)
        .join("\n\n");
    const system = `你是 CCM 群聊的主 Agent（工作协调者）。你已经把用户需求分派给项目 Agent，现在要像项目负责人一样复盘子 Agent 的回复。

你不是代码执行 Agent，不写代码，不假装完成没有证据的工作。你要做的是：
1. 判断子 Agent 是否真正回答了任务、是否完成修改/验证、是否有缺口。
2. 找出前后端/多项目之间的冲突、依赖、遗漏。
3. 如果还需要某个项目 Agent 继续补充，只能在 followUps 里给出明确任务。
4. 如果已经足够，输出给用户的最终协调结论。
5. 如果需要用户决策或补充信息，明确指出。

只能返回 JSON 对象，不要 Markdown，不要解释。

允许追问的项目 Agent：
${buildAllowedProjectBrief(normalized) || "- 无"}

JSON 格式：
{
  "status": "complete | needs_followup | needs_user",
  "summary": "给用户看的最终或阶段性协调结论，必须包含已确认结论、已完成/未完成事项、风险和验证建议",
  "gaps": ["仍缺少的信息或证据"],
  "conflicts": ["子 Agent 之间冲突或不一致的地方"],
  "followUps": [
    {
      "project": "必须是允许追问的项目 Agent 名称",
      "task": "继续追问这个项目 Agent 的明确任务，包含要补充的证据/修改/验证",
      "reason": "为什么需要继续追问"
    }
  ],
  "userQuestion": "如果需要用户补充，写一个具体问题；否则空字符串",
  "confidence": 0.0
}`;
    const user = `用户原始需求：
${String(userMessage || "").slice(0, 1200)}

主 Agent 初始安排：
${String(coordinatorPlan || "").slice(0, 1600)}

子 Agent 回复：
${childReplies}

是否允许继续追问子 Agent：${allowFollowUps ? "允许" : "不允许，本轮必须输出最终总结或用户问题"}

请输出 JSON。`;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), Math.max(5000, Number(config.timeoutMs) || 30000));
        let content = "";
        try {
            if (shouldUseAnthropic(config)) {
                const endpoint = normalizeAnthropicMessagesUrl(config.apiUrl);
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
                    body: JSON.stringify({
                        model: config.model,
                        max_tokens: 1400,
                        temperature: 0.2,
                        system,
                        messages: [{ role: "user", content: user }],
                    }),
                    signal: controller.signal,
                });
                const text = await response.text();
                if (!response.ok)
                    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
                const data = JSON.parse(text);
                content = (data?.content || []).map((p) => p?.type === "text" ? p.text : "").join("").trim();
            }
            else {
                const endpoint = normalizeChatCompletionsUrl(config.apiUrl);
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` },
                    body: JSON.stringify({
                        model: config.model,
                        temperature: 0.2,
                        messages: [
                            { role: "system", content: system },
                            { role: "user", content: user },
                        ],
                    }),
                    signal: controller.signal,
                });
                const text = await response.text();
                if (!response.ok)
                    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
                const data = JSON.parse(text);
                content = data?.choices?.[0]?.message?.content || "";
            }
        }
        finally {
            clearTimeout(timeout);
        }
        const parsed = extractJsonObject(content);
        if (!parsed)
            throw new Error("主 Agent 复盘未返回有效 JSON");
        const followUps = allowFollowUps && Array.isArray(parsed.followUps)
            ? parsed.followUps
                .map((item) => {
                const project = String(item?.project || "").trim();
                if (!allowed.has(project))
                    return null;
                const task = String(item?.task || "").trim();
                if (!task)
                    return null;
                return {
                    mention: `@${project}`,
                    targetName: project,
                    message: task,
                    reason: String(item?.reason || "").trim(),
                };
            })
                .filter(Boolean)
            : [];
        const status = followUps.length > 0 ? "needs_followup" : String(parsed.status || "complete");
        const summary = String(parsed.summary || "").trim();
        const gaps = Array.isArray(parsed.gaps) ? parsed.gaps.map((x) => String(x)).filter(Boolean) : [];
        const conflicts = Array.isArray(parsed.conflicts) ? parsed.conflicts.map((x) => String(x)).filter(Boolean) : [];
        const userQuestion = String(parsed.userQuestion || "").trim();
        const lines = ["📋 **协调复盘**", ""];
        if (summary)
            lines.push(summary);
        if (conflicts.length)
            lines.push("", `冲突/不一致：${conflicts.join("；")}`);
        if (gaps.length)
            lines.push("", `缺口/风险：${gaps.join("；")}`);
        if (userQuestion)
            lines.push("", `需要你确认：${userQuestion}`);
        if (followUps.length) {
            lines.push("", "我会继续追问：");
            for (const item of followUps) {
                lines.push(`@${item.targetName} ${item.message}`);
            }
        }
        return {
            agent: coordinator.project,
            status,
            followUps,
            gaps,
            conflicts,
            content: lines.join("\n").trim(),
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
        };
    }
    catch (err) {
        console.error("[LLM复盘] 调用失败:", err.message);
        return null;
    }
}
function decomposeRequirementWithCodedCoordinator(group, requirement) {
    const analysis = analyzeRequirement(group, requirement);
    const routed = routeMembers(group, requirement, analysis);
    const targets = routed.length > 0
        ? routed
        : getRoutableMembers(group).map((member) => ({ member, task: requirement }));
    const urgent = /紧急|阻塞|线上|崩溃|无法|报错|失败|高优先级|urgent|block/i.test(requirement);
    return targets.map((item) => ({
        title: `${item.member.project} ${analysis.intent === "bugfix" ? "定位修复" : analysis.intent === "verification" ? "验证" : "处理"}需求`,
        description: [
            "代码协调器自动拆分。",
            `需求理解：${analysis.summary}`,
            `意图：${analysis.intent}`,
            `交付物：${analysis.deliverables.join("、")}`,
            analysis.constraints.length ? `约束：${analysis.constraints.join("、")}` : "",
            analysis.missingInfo.length ? `需补充/确认：${analysis.missingInfo.join("、")}` : "",
            "",
            `请从 ${item.member.project} 项目职责处理以下需求，输出结论、修改点、风险和验证方式。`,
            "",
            `原始需求：${compactText(item.task, 900)}`
        ].filter(Boolean).join("\n"),
        target_project: item.member.project,
        priority: urgent ? "high" : "normal",
        estimated_time: "由项目 Agent 评估",
    }));
}
function normalizeChatCompletionsUrl(apiUrl) {
    const base = String(apiUrl || "").trim().replace(/\/+$/, "");
    if (!base)
        return "";
    if (/\/chat\/completions$/i.test(base))
        return base;
    if (/\/v1$/i.test(base))
        return `${base}/chat/completions`;
    if (/\/v1\//i.test(base))
        return base;
    return `${base}/v1/chat/completions`;
}
function normalizeAnthropicMessagesUrl(apiUrl) {
    const base = String(apiUrl || "").trim().replace(/\/+$/, "");
    if (!base)
        return "";
    if (/\/v1\/messages$/i.test(base))
        return base;
    if (/\/v1$/i.test(base))
        return `${base}/messages`;
    if (/\/v1\//i.test(base))
        return base;
    return `${base}/v1/messages`;
}
function shouldUseAnthropic(config) {
    const format = String(config.format || "auto");
    const apiUrl = String(config.apiUrl || "").toLowerCase();
    return format === "anthropic-compatible"
        || format === "auto" && apiUrl.includes("anthropic")
        || format === "openai-compatible" && /\/anthropic(?:\/|$)/i.test(apiUrl);
}
function extractJsonObject(text) {
    const raw = String(text || "").trim();
    try {
        return JSON.parse(raw);
    }
    catch { }
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
        try {
            return JSON.parse(fenced[1].trim());
        }
        catch { }
    }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
        try {
            return JSON.parse(raw.slice(start, end + 1));
        }
        catch { }
    }
    return null;
}
function buildAllowedProjectBrief(group) {
    return getRoutableMembers(group).map((m) => {
        const kind = memberKind(m);
        return `- ${m.project}: ${kind === "frontend" ? "前端/客户端/UI/交互" : kind === "backend" ? "后端/API/服务/数据" : "通用项目 Agent"}，底层 Agent: ${m.agent || "未指定"}`;
    }).join("\n");
}
function buildLlmCoordinatorMessages(input) {
    const group = normalizeGroupOrchestrator(input.group);
    // 优化3：共享文件上下文注入
    const sharedFilesPart = input.sharedFilesContext ? `\n\n当前群聊共享文件：\n${input.sharedFilesContext}` : "";
    const system = `你是 CCM 群聊的主 Agent（工作协调者）。

你可以使用大模型理解用户需求，但你不是项目开发 Agent：
- 不写代码。
- 不调用项目工具。
- 不声称已经完成子 Agent 尚未完成的工作。
- 只做需求理解、任务拆分、路由分派、等待和汇总。
- 你的输出会被系统直接执行，targets 不是建议，而是真实派单。
- 不要为了显得忙而分派；只有需要项目上下文、代码确认、修改、验证或跨项目联调时才分派。
- 分派任务必须像工作单：说明背景、边界、要检查/修改的范围、交付物、验收/验证方式。
- 如果一个项目依赖另一个项目的结论，在 dependsOn 写依赖项目名，并选择 sequential 或 backend_first。
- 如果用户需求太模糊，shouldDelegate=false，并用 questionForUser 问一个最关键的问题。

你必须只返回 JSON 对象，不要 Markdown，不要解释。

允许分派的项目 Agent 只有：
${buildAllowedProjectBrief(group) || "- 无"}${sharedFilesPart}

JSON 格式：
{
  "intent": "greeting | question | planning | implementation | bugfix | review | verification | discussion",
  "summary": "你对用户需求的一句话理解",
  "domains": ["frontend", "backend", "general"],
  "deliverables": ["子 Agent 应该交付什么"],
  "constraints": ["用户明确约束或优先级"],
  "missingInfo": ["缺失但重要的信息"],
  "shouldDelegate": true,
  "executionOrder": "parallel | sequential | backend_first",
  "targets": [
    {
      "project": "必须是允许分派的项目 Agent 名称",
      "task": "给这个项目 Agent 的可执行工作单，包含背景、边界、交付物、需要检查/修改的范围、风险和验证要求",
      "reason": "为什么分给它",
      "dependsOn": "如果依赖其他 Agent 先完成，填其项目名；否则空字符串"
    }
  ],
  "friendlyResponse": "给用户看的友好自然语言回复，说明你的判断和安排，不要包含内部分析结构",
  "questionForUser": "如果信息不足且不应分派，写一个必须追问的问题；否则空字符串",
  "directResponse": "如果不需要分派，可以给用户的协调型回复；否则空字符串",
  "confidence": 0.0
}`;
    const user = `群聊最近上下文：
${input.context || "无"}

用户最新消息：
${input.message}

请输出 JSON。`;
    return [
        { role: "system", content: system },
        { role: "user", content: user },
    ];
}
async function callOpenAiCompatibleOrchestrator(config, input) {
    const endpoint = normalizeChatCompletionsUrl(config.apiUrl);
    if (!endpoint)
        throw new Error("主 Agent API URL 未配置");
    if (!config.apiKey)
        throw new Error("主 Agent API Key 未配置");
    if (!config.model)
        throw new Error("主 Agent 模型未配置");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(5000, Number(config.timeoutMs) || 45000));
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                temperature: Number.isFinite(Number(config.temperature)) ? Number(config.temperature) : 0.2,
                messages: buildLlmCoordinatorMessages(input),
            }),
            signal: controller.signal,
        });
        const text = await response.text();
        if (!response.ok) {
            throw new Error(`主 Agent API 调用失败 HTTP ${response.status}: ${text.slice(0, 300)}`);
        }
        const data = JSON.parse(text);
        const content = data?.choices?.[0]?.message?.content || "";
        const parsed = extractJsonObject(content);
        if (!parsed)
            throw new Error("主 Agent API 未返回有效 JSON");
        return parsed;
    }
    finally {
        clearTimeout(timeout);
    }
}
async function callAnthropicCompatibleOrchestrator(config, input) {
    const endpoint = normalizeAnthropicMessagesUrl(config.apiUrl);
    if (!endpoint)
        throw new Error("主 Agent API URL 未配置");
    if (!config.apiKey)
        throw new Error("主 Agent API Key 未配置");
    if (!config.model)
        throw new Error("主 Agent 模型未配置");
    const messages = buildLlmCoordinatorMessages(input);
    const system = messages.find((m) => m.role === "system")?.content || "";
    const userMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(5000, Number(config.timeoutMs) || 45000));
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": config.apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: config.model,
                max_tokens: 1500,
                temperature: Number.isFinite(Number(config.temperature)) ? Number(config.temperature) : 0.2,
                system,
                messages: userMessages,
            }),
            signal: controller.signal,
        });
        const text = await response.text();
        if (!response.ok) {
            throw new Error(`主 Agent API 调用失败 HTTP ${response.status}: ${text.slice(0, 300)}`);
        }
        const data = JSON.parse(text);
        const content = (data?.content || [])
            .map((part) => part?.type === "text" ? part.text : "")
            .join("")
            .trim();
        const parsed = extractJsonObject(content);
        if (!parsed)
            throw new Error("主 Agent API 未返回有效 JSON");
        return parsed;
    }
    finally {
        clearTimeout(timeout);
    }
}
function sanitizeLlmTargets(group, parsed, message, fallbackAnalysis, allowRuleRepair = false) {
    const allowed = new Map(getRoutableMembers(group).map((m) => [m.project, m]));
    const rawTargets = Array.isArray(parsed?.targets) ? parsed.targets : [];
    const seen = new Set();
    const targets = [];
    for (const target of rawTargets) {
        const project = String(target?.project || "").trim();
        if (!allowed.has(project) || seen.has(project))
            continue;
        const task = String(target?.task || "").trim() || message;
        targets.push({
            member: allowed.get(project),
            task,
            reason: String(target?.reason || "").trim(),
            dependsOn: String(target?.dependsOn || "").trim(),
        });
        seen.add(project);
    }
    if (allowRuleRepair && targets.length === 0 && parsed?.shouldDelegate !== false) {
        return routeMembers(group, message, fallbackAnalysis).map((item) => ({ ...item, reason: "规则回退路由" }));
    }
    return targets;
}
function normalizeLlmAnalysis(parsed, fallback) {
    return {
        ...fallback,
        intent: String(parsed?.intent || fallback.intent || "discussion"),
        summary: String(parsed?.summary || fallback.summary || ""),
        domains: Array.isArray(parsed?.domains) ? parsed.domains.map((x) => String(x)).filter(Boolean) : fallback.domains,
        deliverables: Array.isArray(parsed?.deliverables) && parsed.deliverables.length ? parsed.deliverables.map((x) => String(x)) : fallback.deliverables,
        constraints: Array.isArray(parsed?.constraints) ? parsed.constraints.map((x) => String(x)).filter(Boolean) : fallback.constraints,
        missingInfo: Array.isArray(parsed?.missingInfo) ? parsed.missingInfo.map((x) => String(x)).filter(Boolean) : fallback.missingInfo,
        needsCoordination: parsed?.shouldDelegate !== false,
        confidence: typeof parsed?.confidence === "number" ? parsed.confidence : fallback.confidence,
    };
}
function buildCoordinatorResultFromAnalysis(group, message, analysis, targets, runtime, parsed = null) {
    const coordinator = getCoordinatorMember(group);
    // 优化6：优先使用 LLM 生成的 friendlyResponse
    const friendlyText = String(parsed?.friendlyResponse || "").trim();
    if (targets.length === 0) {
        const response = friendlyText || String(parsed?.questionForUser || parsed?.directResponse || "").trim();
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            analysis,
            runtime,
            content: response || `我理解了你的需求，不过还需要你补充一下：**${analysis.missingInfo[0] || "请描述更具体的需求"}**`,
        };
    }
    const delegationLines = targets.map((item) => buildVisibleAssignmentLine(item));
    const delegated = targets.map((item) => item.member.project);
    // 优化5：保存执行顺序信息
    const executionOrder = String(parsed?.executionOrder || "parallel");
    return {
        agent: coordinator.project,
        delegated,
        assignments: buildAssignmentsFromTargets(targets),
        analysis,
        runtime,
        executionOrder,
        content: [
            friendlyText || `好的，这个需求我安排 ${delegated.join("、")} 来处理。`,
            "",
            ...delegationLines,
            "",
            `等他们回复后我会做汇总 📋`
        ].join("\n"),
    };
}
async function runLlmGroupOrchestrator(input) {
    const group = normalizeGroupOrchestrator(input.group);
    const config = loadOrchestratorConfig();
    const fallbackAnalysis = analyzeRequirement(group, input.message, input.context || "");
    const parsed = shouldUseAnthropic(config)
        ? await callAnthropicCompatibleOrchestrator(config, input)
        : await callOpenAiCompatibleOrchestrator(config, input);
    const analysis = normalizeLlmAnalysis(parsed, fallbackAnalysis);
    const targets = sanitizeLlmTargets(group, parsed, input.message, analysis, !!config.fallbackToRules);
    return buildCoordinatorResultFromAnalysis(group, input.message, analysis, targets, "llm-api", parsed);
}
async function runGroupOrchestrator(input) {
    const group = normalizeGroupOrchestrator(input.group);
    const coordinator = getCoordinatorMember(group);
    const config = loadOrchestratorConfig();
    const configIssue = getLlmConfigIssue(config);
    if (configIssue) {
        if (config.fallbackToRules) {
            const fallback = runCodedGroupOrchestrator({ ...input, group });
            return {
                ...fallback,
                runtime: "coded-fallback",
                content: `${fallback.content}\n\n主 Agent API 回退：${configIssue}`,
            };
        }
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            runtime: "llm-not-configured",
            content: [
                "主 Agent 暂时不能开始协调：大模型 API 未配置完整。",
                "",
                `原因：${configIssue}`,
                "",
                "请到 设置 -> 群聊主 Agent 配置 中填写 Base URL、API Key 和模型名。",
                "配置完成后，主 Agent 会先调用大模型理解需求，再分派给项目 Agent。"
            ].join("\n"),
        };
    }
    try {
        return await runLlmGroupOrchestrator({ ...input, group });
    }
    catch (error) {
        if (config.fallbackToRules) {
            const fallback = runCodedGroupOrchestrator({ ...input, group });
            return {
                ...fallback,
                runtime: "coded-fallback",
                content: `${fallback.content}\n\n主 Agent API 回退：${error.message}`,
            };
        }
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            runtime: "llm-error",
            content: [
                "主 Agent 大模型调用失败，本轮不分派子 Agent。",
                "",
                `错误：${error.message}`,
                "",
                "请检查主 Agent API 配置、网络、模型名或 Key 是否有效。"
            ].join("\n"),
        };
    }
}
//# sourceMappingURL=group-orchestrator.js.map