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
exports.isExplicitExecutionRequest = isExplicitExecutionRequest;
exports.analyzeRequirement = analyzeRequirement;
exports.runCodedGroupOrchestrator = runCodedGroupOrchestrator;
exports.runCoordinatorProtocolSelfTest = runCoordinatorProtocolSelfTest;
exports.buildCodedCoordinatorSummary = buildCodedCoordinatorSummary;
exports.runLlmCoordinatorSummary = runLlmCoordinatorSummary;
exports.runLlmCoordinatorReview = runLlmCoordinatorReview;
exports.decomposeRequirementWithCodedCoordinator = decomposeRequirementWithCodedCoordinator;
exports.isStructuredCoordinatorFallbackAllowed = isStructuredCoordinatorFallbackAllowed;
exports.runGroupOrchestrator = runGroupOrchestrator;
exports.isContextLimitError = isContextLimitError;
exports.buildReactiveCompactionContext = buildReactiveCompactionContext;
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
        timeoutMs: 120000,
        fallbackToRules: true,
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
    return { ...safe, hasKey: !!apiKey, boundary: buildGroupMainAgentBoundary("config") };
}
function buildGroupMainAgentBoundary(planner = "coded_fallback") {
    return {
        layer: "group_main_agent",
        planner,
        runtime: "coded_orchestrator",
        responsibility: "per-group planning, dispatch, receipt review",
    };
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
6. 不要重复整段群聊历史，只引用必要上下文。
7. 回复末尾必须追加一个“CCM_AGENT_RECEIPT”结构化回执，供主 Agent 验收；即使阻塞或只是分析，也要填写。

CCM_AGENT_RECEIPT 格式：
\`\`\`json
{
  "ccm_receipt": true,
  "status": "done | partial | blocked | failed | needs_info",
  "summary": "一句话说明本项目实际完成/确认了什么",
  "actions": ["实际执行的动作；如果只是分析，写分析了哪些代码/配置"],
  "filesChanged": ["修改过的文件路径；没有修改填空数组"],
  "verification": ["已经运行或建议运行的验证；不能编造未运行的测试"],
  "blockers": ["阻塞点或缺失信息；没有填空数组"],
  "needs": ["还需要用户或其他 Agent 补充的内容；没有填空数组"]
}
\`\`\``;
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
const DOCUMENT_FINDING_PATTERN = /接口|api|endpoint|路径|字段|入参|出参|参数|返回|状态|流转|验收|权限|鉴权|页面|按钮|流程|规则|错误码|PRD|prd|需求|文档|acceptance|schema|GET\s+|POST\s+|PUT\s+|PATCH\s+|DELETE\s+|\/api\//i;
function extractDocumentFindingsFromText(value, sourceLabel = "", limit = 8) {
    const text = String(value || "").replace(/\r/g, "");
    if (!text.trim())
        return [];
    const lines = text
        .split("\n")
        .map(line => line.replace(/^\s*[-*]\s+/, "").trim())
        .filter(Boolean);
    const findings = [];
    const seen = new Set();
    for (const line of lines) {
        if (!DOCUMENT_FINDING_PATTERN.test(line))
            continue;
        const compacted = compactText(line.replace(/\s*\|\s*/g, " | "), 220);
        const finding = sourceLabel ? `${sourceLabel}: ${compacted}` : compacted;
        const key = finding.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        findings.push(finding);
        if (findings.length >= limit)
            break;
    }
    return findings;
}
function extractCodedDocumentFindings(input) {
    const findings = [
        ...extractDocumentFindingsFromText(input.message, "用户需求", 4),
        ...extractDocumentFindingsFromText(input.context, "群聊上下文", 4),
        ...extractDocumentFindingsFromText(input.sharedFilesContext, "共享文档", 8),
    ];
    const seen = new Set();
    return findings.filter(item => {
        const key = item.toLowerCase();
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    }).slice(0, 10);
}
function mergeDocumentFindings(...groups) {
    const seen = new Set();
    const merged = [];
    for (const group of groups) {
        const values = Array.isArray(group) ? group : [];
        for (const value of values) {
            const item = String(value || "").trim();
            if (!item)
                continue;
            const key = item.toLowerCase();
            if (seen.has(key))
                continue;
            seen.add(key);
            merged.push(item);
            if (merged.length >= 12)
                return merged;
        }
    }
    return merged;
}
function buildDocumentAwareAnalysis(group, input) {
    const documentContext = [input.context || "", input.sharedFilesContext || ""].filter(Boolean).join("\n");
    const baseAnalysis = analyzeRequirement(group, input.message || "", documentContext);
    const documentFindings = extractCodedDocumentFindings(input);
    const provisionalAnalysis = {
        ...baseAnalysis,
        documentFindings,
    };
    return {
        ...baseAnalysis,
        documentFindings,
        coordinationStrategy: inferCoordinatorStrategy(provisionalAnalysis, Array.isArray(baseAnalysis.domains) ? baseAnalysis.domains.length : 0),
        constraints: [
            ...(baseAnalysis.constraints || []),
            documentFindings.length ? "需要按业务/接口文档中的字段、规则和验收点执行" : "",
        ].filter(Boolean),
        needsCoordination: baseAnalysis.needsCoordination || documentFindings.length > 0,
        confidence: documentFindings.length ? Math.max(baseAnalysis.confidence || 0, 0.72) : baseAnalysis.confidence,
    };
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
const FRONTEND_HINTS = ["前端", "页面", "界面", "ui", "组件", "样式", "交互", "app", "客户端", "移动端", "小程序", "按钮", "表单", "展示", "原型", "流程"];
const BACKEND_HINTS = ["后端", "接口", "api", "服务", "数据库", "鉴权", "权限", "字段", "表", "缓存", "队列", "部署", "cloud", "server", "endpoint", "schema", "入参", "出参"];
const BROAD_HINTS = ["全栈", "前后端", "联调", "跨端", "需求", "开发", "实现", "修复", "排查", "bug", "报错", "测试", "验收", "项目", "接口文档", "业务文档", "需求文档", "prd", "文档"];
const QUESTION_HINTS = ["?", "？", "怎么", "如何", "为什么", "能不能", "是否", "吗"];
const REVIEW_HINTS = ["review", "审查", "评审", "检查代码", "看一下代码", "风险"];
const TEST_HINTS = ["测试", "验收", "验证", "用例", "回归", "自测"];
const BUG_HINTS = ["bug", "报错", "错误", "异常", "失败", "崩溃", "无法", "不生效", "修复"];
const IMPLEMENT_HINTS = ["实现", "开发", "新增", "接入", "适配", "改成", "优化", "重构", "做一下", "加一个", "完成这个任务", "按文档"];
const PLANNING_HINTS = ["方案", "设计", "架构", "规划", "拆分", "怎么做", "思路", "接口文档", "业务文档", "需求文档", "prd"];
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
function isExplicitExecutionRequest(message) {
    const text = String(message || "").trim();
    if (!text)
        return false;
    const explanationOnly = /^(?:请)?(?:介绍|说明|解释|分析|总结|概括|告诉我|这(?:个)?是|这是|什么是|为什么|为何|如何|怎么|是否|能否|能不能).{0,80}$/i.test(text)
        || /(?:是什么项目|项目是做什么的|介绍一下项目|分析一下(?:项目|代码|架构)|有什么功能|采用什么技术|为什么会)/i.test(text);
    const explicitAction = /(?:^|请|帮我|给我|需要|我要|现在|立即|开始|继续|然后|并且|把).{0,18}(?:修改|实现|开发|新增|添加|加上|加一个|创建|运行|执行|派发|修复|删除|清理|更新|重构|接入|安装|部署|提交|写入|生成|迁移|恢复|暂停|取消|启动|停止)/i.test(text)
        || /^(?:修改|实现|开发|新增|添加|创建|运行|执行|派发|修复|删除|清理|更新|重构|接入|安装|部署|提交|写入|生成|迁移|恢复|暂停|取消|启动|停止)/i.test(text)
        || /(?:按|照).{0,20}(?:文档|方案|要求).{0,8}(?:做|落地|实现|执行)/i.test(text);
    return explicitAction && !explanationOnly;
}
function analyzeRequirement(group, message, context = "") {
    const normalized = normalizeGroupOrchestrator(group);
    const raw = String(message || "").trim();
    const contextText = String(context || "").trim();
    const text = [raw, contextText].filter(Boolean).join("\n").toLowerCase();
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
    const broadDevelopmentRequest = isBroadDevelopmentRequest(task, analysis);
    const brief = [
        `需求理解：${analysis.summary}`,
        `意图：${analysis.intent}`,
        `交付物：${analysis.deliverables.join("、")}`,
        analysis.constraints.length ? `约束：${analysis.constraints.join("、")}` : "",
        analysis.missingInfo.length ? `${broadDevelopmentRequest ? "先按项目职责判断并补齐范围" : "注意缺口"}：${analysis.missingInfo.join("、")}` : "",
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
function inferCoordinatorStrategy(analysis = {}, targetCount = 0) {
    const intent = String(analysis?.intent || "");
    const hasDocuments = Array.isArray(analysis?.documentFindings) && analysis.documentFindings.length > 0;
    const complexIntent = ["implementation", "bugfix", "planning", "review"].includes(intent);
    const crossProject = targetCount > 1 || (Array.isArray(analysis?.domains) && analysis.domains.length > 1);
    if (hasDocuments || crossProject || complexIntent) {
        return "research_synthesis_implementation_verification";
    }
    return "direct_worker_execution";
}
function buildCoordinatorPlan(group, analysis, targets, executionOrder = "parallel", strategy = "") {
    const targetNames = (targets || []).map((item) => item?.member?.project || item?.project).filter(Boolean);
    const coordinationStrategy = strategy || inferCoordinatorStrategy(analysis, targetNames.length);
    const phases = [
        "理解需求：主 Agent 提炼业务目标、范围、约束、文档依据和缺口",
        coordinationStrategy === "research_synthesis_implementation_verification"
            ? "研究与综合：子 Agent 先在各自项目内确认事实，主 Agent 综合成明确实现/验证判断，禁止把理解责任转嫁给 Worker"
            : "",
        targetNames.length
            ? `分配任务：按 ${executionOrder} 派发给 ${targetNames.join("、")}，每个子 Agent 获得自包含工作单`
            : "分配任务：当前没有可执行子 Agent，先直接回答或向用户补充提问",
        "协同执行：子 Agent 在各自项目中完成研究、实现、验证，并返回 CCM_AGENT_RECEIPT",
        "复盘验收：主 Agent 汇总回执、文件变更和验证证据，发现缺口时继续返工",
    ].filter(Boolean);
    const missingInfo = Array.isArray(analysis?.missingInfo) ? analysis.missingInfo.filter(Boolean) : [];
    return {
        mode: "cc-style-coordinator",
        strategy: coordinationStrategy,
        executionOrder,
        phases,
        targets: targetNames,
        missingInfo,
    };
}
function buildCoordinatorPlanText(plan) {
    if (!plan?.phases?.length)
        return "";
    const lines = ["主 Agent 计划："];
    for (const phase of plan.phases)
        lines.push(`- ${phase}`);
    if (plan.missingInfo?.length)
        lines.push(`- 已识别缺口：${plan.missingInfo.join("；")}`);
    return lines.join("\n");
}
function buildSelfContainedWorkerTask(project, rawTask, analysis, options = {}) {
    const task = String(rawTask || "").trim();
    const reason = String(options.reason || "").trim();
    const dependsOn = String(options.dependsOn || "").trim();
    const documentFindings = Array.isArray(analysis?.documentFindings) ? analysis.documentFindings.filter(Boolean) : [];
    const constraints = Array.isArray(analysis?.constraints) ? analysis.constraints.filter(Boolean) : [];
    const missingInfo = Array.isArray(analysis?.missingInfo) ? analysis.missingInfo.filter(Boolean) : [];
    const deliverables = Array.isArray(analysis?.deliverables) && analysis.deliverables.length
        ? analysis.deliverables
        : ["结论、实际动作、文件变更和验证记录"];
    const coordinationStrategy = String(options.coordinationStrategy || analysis?.coordinationStrategy || inferCoordinatorStrategy(analysis, 1));
    const alreadyStructured = /主 Agent 工作单|需求理解|交付物|验证要求|CCM_AGENT_RECEIPT/i.test(task);
    if (alreadyStructured)
        return task;
    const lines = [
        `主 Agent 工作单：${project}`,
        `- 需求理解：${analysis?.summary || compactText(analysis?.raw || task, 260)}`,
        `- 你的职责：只处理 ${project} 项目职责范围内的代码、配置、文档或验证；不要越权修改其他项目。`,
        reason ? `- 派发原因：${reason}` : "",
        dependsOn ? `- 依赖关系：先参考 ${dependsOn} 的结论；如果前置结果未到，请说明等待项或可先做的独立检查。` : "",
        coordinationStrategy === "research_synthesis_implementation_verification"
            ? "- 协调协议：按 Claude Code Coordinator/Worker 思路执行。主 Agent 已先理解并计划；你负责本项目 Research/Implementation/Verification，把事实和证据交回主 Agent 综合验收。不要把理解责任再推给其他 Agent。"
            : "- 协调协议：这是主 Agent 派给你的自包含工作单；直接按本项目职责执行并提交证据。",
        `- 本次任务：${task || analysis?.raw || "根据主 Agent 的需求理解完成本项目相关工作。"}`,
        documentFindings.length ? `- 文档依据/验收关注：${documentFindings.slice(0, 6).map((item) => compactText(String(item), 180)).join("；")}` : "",
        constraints.length ? `- 用户约束：${constraints.join("；")}` : "",
        missingInfo.length ? `- 已知缺口/风险：${missingInfo.join("；")}；能在项目内确认的先确认，不能确认的写入 blockers/needs。` : "",
        `- 交付物：${deliverables.join("；")}`,
        "- 禁止空泛回复：不要只写“按文档实现”“根据前置结果处理”。必须说明你实际检查了什么、修改了什么、验证了什么，或为什么被阻塞。",
        "- 验证要求：运行与你改动范围匹配的最小必要验证；未运行的验证必须明确写成建议，不能伪造成已执行。",
        "- 回执要求：最后必须追加 CCM_AGENT_RECEIPT，写明 status、summary、actions、filesChanged、verification、blockers、needs。",
    ].filter(Boolean);
    return lines.join("\n");
}
function inferCodedExecutionPlan(message, analysis, routed) {
    const documentText = Array.isArray(analysis?.documentFindings) ? analysis.documentFindings.join("\n") : "";
    const text = [
        message || analysis?.raw || "",
        analysis?.contextSignal || "",
        documentText,
    ].filter(Boolean).join("\n").toLowerCase();
    const hasBackend = (routed || []).some((item) => memberKind(item.member) === "backend");
    const hasFrontend = (routed || []).some((item) => memberKind(item.member) === "frontend");
    const needsBackendFirst = hasBackend && hasFrontend && /接口|api|字段|契约|联调|对接|入参|出参|endpoint|schema|后端.*前端|前端.*后端/i.test(text);
    const needsSequential = !needsBackendFirst
        && routed.length > 1
        && /先.+再|然后|依赖|步骤|流程|迁移|分阶段|串行|sequential/i.test(text);
    const executionOrder = needsBackendFirst ? "backend_first" : needsSequential ? "sequential" : "parallel";
    const firstBackend = needsBackendFirst
        ? routed.find((item) => memberKind(item.member) === "backend")?.member?.project || ""
        : "";
    const plannedRouted = (routed || []).map((item) => ({
        ...item,
        dependsOn: item.dependsOn || (firstBackend && memberKind(item.member) === "frontend" ? firstBackend : ""),
        reason: item.reason || (needsBackendFirst && memberKind(item.member) === "frontend"
            ? `前端对接依赖 ${firstBackend} 先确认接口契约`
            : needsBackendFirst && memberKind(item.member) === "backend"
                ? "接口/字段/联调类需求需要先确认后端契约"
                : needsSequential
                    ? "该需求存在步骤或依赖关系，按顺序推进"
                    : "规则主 Agent 根据需求范围和项目职责派发"),
    }));
    return { executionOrder, routed: plannedRouted };
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
function buildDispatchPolicy(action, reason, analysis, options = {}) {
    return {
        action,
        reason: reason || "",
        requiresConfirmation: !!options.requiresConfirmation,
        risk: options.risk || "",
        nextStep: options.nextStep || "",
        confidence: typeof analysis?.confidence === "number" ? analysis.confidence : 0,
    };
}
function isBroadDevelopmentRequest(message, analysis = {}) {
    const text = String(message || analysis?.raw || "").toLowerCase();
    return !!analysis?.needsCoordination
        && ["implementation", "planning", "bugfix"].includes(String(analysis?.intent || ""))
        && (containsAny(text, BROAD_HINTS) || /业务|需求|文档|prd|实现|开发|功能|模块/i.test(String(message || analysis?.raw || "")));
}
function inferCodedDispatchPolicy(group, message, analysis, targets) {
    if (isSimpleMessage(message) || analysis.intent === "greeting") {
        return buildDispatchPolicy("direct_answer", "简单寒暄或确认消息，不需要调用项目 Agent。", analysis, {
            nextStep: "直接回复用户",
        });
    }
    if (!isExplicitExecutionRequest(message)) {
        return buildDispatchPolicy("direct_answer", "用户没有要求执行或修改，主 Agent 直接回答，不创建开发任务。", analysis, {
            nextStep: "直接回答用户",
        });
    }
    if (getRoutableMembers(group).length === 0) {
        return buildDispatchPolicy("hold", "当前群聊没有可分派的项目 Agent。", analysis, {
            risk: "无法执行项目级排查或修改",
            nextStep: "请先添加群聊成员",
        });
    }
    const broadDevelopmentRequest = isBroadDevelopmentRequest(message, analysis);
    if (targets.length === 0 || (analysis.missingInfo?.length && analysis.confidence < 0.72 && !broadDevelopmentRequest)) {
        return buildDispatchPolicy("ask_user", analysis.missingInfo?.[0] || "需求范围不够明确，先问用户补充关键信息。", analysis, {
            risk: "信息不足时派发会导致子 Agent 空转或误改",
            nextStep: "向用户追问一个关键问题",
        });
    }
    const risky = /删除|清空|重置|迁移|生产|线上|支付|权限|密钥|token|数据库|drop|delete|reset/i.test(message);
    return buildDispatchPolicy("delegate", broadDevelopmentRequest
        ? "业务开发需求需要项目 Agent 先按职责判断并落地处理。"
        : targets.length > 1 ? "需要多个项目 Agent 协作处理。" : "需要项目 Agent 查看代码或项目上下文。", analysis, {
        requiresConfirmation: risky,
        risk: risky ? "包含高风险操作，建议用户确认后再执行具体修改。" : (broadDevelopmentRequest && analysis.missingInfo?.length ? analysis.missingInfo.join("；") : ""),
        nextStep: risky ? "先展示派发计划并等待确认" : "立即派发给对应子 Agent",
    });
}
function normalizeDispatchPolicy(parsed, analysis, targets) {
    const rawAction = String(parsed?.dispatchPolicy?.action || parsed?.dispatchAction || "").trim();
    const allowed = new Set(["direct_answer", "ask_user", "delegate", "hold"]);
    const broadDevelopmentRequest = isBroadDevelopmentRequest(parsed?.summary || analysis.raw || "", analysis);
    const parsedRequiresConfirmation = !!(parsed?.dispatchPolicy?.requiresConfirmation || parsed?.requiresConfirmation);
    const explicitExecution = isExplicitExecutionRequest(analysis?.raw || parsed?.summary || "");
    const action = !explicitExecution
        ? "direct_answer"
        : broadDevelopmentRequest && targets.length > 0 && !parsedRequiresConfirmation
            ? "delegate"
            : allowed.has(rawAction)
                ? rawAction
                : targets.length > 0 ? "delegate" : analysis.missingInfo?.length ? "ask_user" : "direct_answer";
    const reason = broadDevelopmentRequest && action === "delegate"
        ? String(parsed?.dispatchPolicy?.reason || parsed?.dispatchReason || "业务开发需求可先由项目 Agent 按职责判断并处理").trim()
        : String(parsed?.dispatchPolicy?.reason || parsed?.dispatchReason || "").trim();
    return buildDispatchPolicy(action, reason, analysis, {
        requiresConfirmation: parsedRequiresConfirmation,
        risk: String(parsed?.dispatchPolicy?.risk || parsed?.risk || (broadDevelopmentRequest && analysis.missingInfo?.length ? analysis.missingInfo.join("；") : "")).trim(),
        nextStep: String(parsed?.dispatchPolicy?.nextStep || parsed?.nextStep || (action === "delegate" ? "立即派发给对应子 Agent" : "")).trim(),
    });
}
function runCodedGroupOrchestrator(input) {
    const group = normalizeGroupOrchestrator(input.group);
    const coordinator = getCoordinatorMember(group);
    const analysis = buildDocumentAwareAnalysis(group, input);
    const routed = routeMembers(group, input.message, analysis);
    const members = getRoutableMembers(group);
    // 优化1：简单消息直接给出自然回复，不展示结构化分析
    if (isSimpleMessage(input.message)) {
        const memberNames = members.length ? members.map((m) => m.project).join("、") : "暂无";
        const dispatchPolicy = inferCodedDispatchPolicy(group, input.message, analysis, []);
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
            dispatchPolicy,
            content: friendlyReply,
        };
    }
    if (!isExplicitExecutionRequest(input.message)) {
        const memberNames = members.length ? members.map((m) => m.project).join("、") : "暂无已绑定项目";
        const projectOverview = members.length
            ? members.map((member) => {
                const kind = memberKind(member);
                const role = kind === "frontend" ? "前端/客户端" : kind === "backend" ? "后端/API" : "项目模块";
                return `- ${member.project}：${role}`;
            }).join("\n")
            : "- 当前还没有绑定项目 Agent";
        const dispatchPolicy = inferCodedDispatchPolicy(group, input.message, analysis, []);
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            analysis: { ...analysis, needsCoordination: false },
            dispatchPolicy,
            content: `这是一个信息咨询，我不会创建开发任务或修改文件。\n\n当前群聊关联项目：${memberNames}\n${projectOverview}\n\n从成员职责看，这是一个由上述项目共同组成的协作开发空间；需要更具体的架构、技术栈或功能说明时，我会直接基于群聊记忆和项目资料回答。`,
        };
    }
    if (members.length === 0) {
        const dispatchPolicy = inferCodedDispatchPolicy(group, input.message, analysis, []);
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            analysis,
            dispatchPolicy,
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
        const dispatchPolicy = inferCodedDispatchPolicy(group, input.message, analysis, routed);
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            analysis,
            dispatchPolicy,
            content: `我大致理解了你的需求，不过还需要你补充一下：**${question}**\n\n当前可协调成员：${memberNames}`,
        };
    }
    const executionPlan = inferCodedExecutionPlan(input.message, analysis, routed);
    const executionOrder = executionPlan.executionOrder;
    const coordinationStrategy = inferCoordinatorStrategy(analysis, executionPlan.routed.length);
    analysis.coordinationStrategy = coordinationStrategy;
    const plannedRouted = executionPlan.routed.map((item) => ({
        ...item,
        task: buildSelfContainedWorkerTask(item.member.project, item.task || input.message, analysis, {
            reason: item.reason || "规则主 Agent 根据需求范围和项目职责派发",
            dependsOn: item.dependsOn || "",
            coordinationStrategy,
        }),
    }));
    const plan = buildCoordinatorPlan(group, analysis, plannedRouted, executionOrder, coordinationStrategy);
    const delegationLines = plannedRouted.map(item => buildVisibleAssignmentLine(item));
    const delegated = plannedRouted.map(item => item.member.project);
    const dispatchPolicy = inferCodedDispatchPolicy(group, input.message, analysis, plannedRouted);
    return {
        agent: coordinator.project,
        delegated,
        assignments: buildAssignmentsFromTargets(plannedRouted),
        executionOrder,
        coordinationStrategy,
        analysis,
        coordinationPlan: plan,
        dispatchPolicy,
        content: [
            `好的，这个需求我安排 ${delegated.join("、")} 来处理。`,
            "",
            buildCoordinatorPlanText(plan),
            "",
            ...delegationLines,
            "",
            `等他们回复后我会做汇总 📋`
        ].join("\n"),
    };
}
function runCoordinatorProtocolSelfTest() {
    const group = normalizeGroupOrchestrator({
        id: "coordinator-protocol-self-test",
        members: [
            { project: "coordinator", role: "coordinator" },
            { project: "backend-service", agent: "claudecode" },
            { project: "web-app", agent: "claudecode" },
        ],
    });
    const message = "按接口文档实现订单退款审核功能，后端提供审核接口，前端订单详情页增加审核入口，并完成验证。";
    const sharedFilesContext = [
        "[共享文档 refund-prd.md]",
        "接口：POST /api/refunds/:id/audit",
        "入参字段：approved(boolean), reason(string)",
        "状态流转：pending_review -> approved/rejected",
        "验收：后端校验权限并记录操作日志；前端订单详情页展示审核入口和结果提示。",
    ].join("\n");
    const result = runCodedGroupOrchestrator({
        group,
        message,
        sharedFilesContext,
    });
    const shortDocResult = runCodedGroupOrchestrator({
        group,
        message: "请按这个文档做。",
        sharedFilesContext,
    });
    const informationalResult = runCodedGroupOrchestrator({
        group,
        message: "这个是一个什么项目？请介绍一下架构和主要功能。",
    });
    const informationalBoundaryPass = informationalResult.dispatchPolicy?.action === "direct_answer"
        && informationalResult.assignments?.length === 0
        && informationalResult.delegated?.length === 0;
    const llmParsedWithoutDocumentFindings = {
        intent: "implementation",
        summary: "实现订单退款审核功能",
        domains: ["backend", "frontend"],
        deliverables: ["后端接口", "前端审核入口", "验证记录"],
        constraints: [],
        missingInfo: [],
        shouldDelegate: true,
        executionOrder: "backend_first",
        reasoning: {
            knownFacts: ["接口 POST /api/refunds/:id/audit 已在共享文档定义"],
            assumptionsToVerify: ["当前后端尚未实现该接口"],
            verificationAssertions: ["权限校验、操作日志和前端结果提示均有真实证据"],
            dependencyRationale: ["前端对接依赖后端先确认接口契约"],
            replanTriggers: ["实际接口字段与文档不一致时重规划"],
        },
        targets: [
            { project: "backend-service", task: "实现退款审核接口并完成权限校验。", reason: "后端负责 API 和业务规则", dependsOn: "" },
            { project: "web-app", task: "在订单详情页增加退款审核入口并对接后端接口。", reason: "前端负责页面交互", dependsOn: "backend-service" },
        ],
    };
    const llmFallbackAnalysis = buildDocumentAwareAnalysis(group, { message, sharedFilesContext });
    const llmAnalysis = normalizeLlmAnalysis(llmParsedWithoutDocumentFindings, llmFallbackAnalysis);
    const llmTargets = sanitizeLlmTargets(group, llmParsedWithoutDocumentFindings, message, llmAnalysis, true);
    const llmDocumentGuardPass = llmTargets.length >= 2
        && llmAnalysis.documentFindings.some((item) => item.includes("/api/refunds"))
        && llmTargets.every((item) => String(item.task || "").includes("文档依据/验收关注") && String(item.task || "").includes("/api/refunds"));
    const semanticReasoningPass = llmAnalysis.reasoning.knownFacts.length === 1
        && llmAnalysis.reasoning.assumptionsToVerify.length === 1
        && llmAnalysis.reasoning.verificationAssertions.length === 1
        && llmAnalysis.reasoning.dependencyRationale[0].includes("接口契约")
        && llmAnalysis.reasoning.replanTriggers[0].includes("重规划");
    const assignments = Array.isArray(result.assignments) ? result.assignments : [];
    const taskChecks = assignments.map((assignment) => {
        const task = String(assignment.task || "");
        return {
            project: assignment.project,
            dependsOn: assignment.dependsOn || "",
            hasWorkerPacket: task.includes("主 Agent 工作单"),
            hasUnderstanding: task.includes("需求理解"),
            hasVerification: task.includes("验证要求"),
            hasReceipt: task.includes("CCM_AGENT_RECEIPT"),
            hasDocumentEvidence: task.includes("文档依据/验收关注") && task.includes("/api/refunds"),
            hasCoordinatorWorkerProtocol: task.includes("Claude Code Coordinator/Worker") && task.includes("Research/Implementation/Verification"),
            forbidsLazyDelegation: task.includes("禁止空泛回复"),
        };
    });
    const backendProject = assignments.find((item) => /cloud|api|server|backend|service|后端/i.test(String(item.project || "")))?.project || "";
    const frontendDependsOnBackend = !backendProject || taskChecks
        .filter((item) => /app|web|front|frontend|前端/i.test(String(item.project || "")))
        .every((item) => item.dependsOn === backendProject);
    const shortDocAssignments = Array.isArray(shortDocResult.assignments) ? shortDocResult.assignments : [];
    const shortDocBackendProject = shortDocAssignments.find((item) => /cloud|api|server|backend|service|后端/i.test(String(item.project || "")))?.project || "";
    const shortDocBackendFirstPass = shortDocResult.executionOrder === "backend_first"
        && shortDocAssignments.length >= 2
        && shortDocAssignments
            .filter((item) => /app|web|front|frontend|前端/i.test(String(item.project || "")))
            .every((item) => !shortDocBackendProject || item.dependsOn === shortDocBackendProject);
    const reactiveContext = buildReactiveCompactionContext(`SUMMARY_START ${"a".repeat(80_000)} LATEST_USER_REQUIREMENT`);
    const reactiveCompactionPass = reactiveContext.length < 55_000
        && reactiveContext.includes("SUMMARY_START")
        && reactiveContext.includes("LATEST_USER_REQUIREMENT")
        && isContextLimitError(new Error("HTTP 413: prompt too long"));
    const structuredFallbackPolicyPass = !isStructuredCoordinatorFallbackAllowed({ source: "group-chat", message: "帮我优化一下项目" })
        && isStructuredCoordinatorFallbackAllowed({ source: "task", message: "【主 Agent 业务开发工作单】\n任务标题：退款审核\n业务目标：实现退款审核\n验收标准：接口和页面验证通过" });
    const pass = String(result.content || "").includes("主 Agent 计划")
        && Array.isArray(result.coordinationPlan?.phases)
        && result.coordinationPlan.phases.length >= 5
        && result.coordinationPlan.strategy === "research_synthesis_implementation_verification"
        && result.coordinationPlan.phases.some((phase) => phase.includes("研究与综合"))
        && assignments.length >= 2
        && result.executionOrder === "backend_first"
        && frontendDependsOnBackend
        && taskChecks.every((item) => item.hasWorkerPacket && item.hasUnderstanding && item.hasVerification && item.hasReceipt && item.hasDocumentEvidence && item.hasCoordinatorWorkerProtocol && item.forbidsLazyDelegation)
        && llmDocumentGuardPass
        && semanticReasoningPass
        && shortDocBackendFirstPass
        && reactiveCompactionPass;
    const finalPass = pass && structuredFallbackPolicyPass && informationalBoundaryPass;
    return {
        pass: finalPass,
        contentHasPlan: String(result.content || "").includes("主 Agent 计划"),
        coordinationPlan: result.coordinationPlan || null,
        assignmentCount: assignments.length,
        assignments: assignments.map((item) => item.project),
        taskChecks,
        executionOrder: result.executionOrder || "",
        coordinationStrategy: result.coordinationStrategy || "",
        frontendDependsOnBackend,
        llmDocumentGuardPass,
        semanticReasoningPass,
        shortDocBackendFirstPass,
        shortDocExecutionOrder: shortDocResult.executionOrder || "",
        reactiveCompactionPass,
        structuredFallbackPolicyPass,
        informationalBoundaryPass,
        documentFindings: Array.isArray(result.analysis?.documentFindings) ? result.analysis.documentFindings : [],
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
    const childReplies = validOutputs.map((text, i) => `--- 子 Agent task-notification ${i + 1} ---\n${String(text).slice(0, 2000)}`).join("\n\n");
    const system = `你是 CCM 群聊的主 Agent（协调者）。子 Agent 已经以 <task-notification> 形式回复了用户的需求，请你做一个简洁的汇总。

要求：
1. 提取各子 Agent 的核心结论，用 1-3 句话概括每个 Agent 的回复要点
2. 如果子 Agent 之间有冲突或不一致，明确指出
3. 给出下一步建议或需要用户决策的事项
4. 不要重复子 Agent 的全部内容，只做摘要
5. 语气友好自然，像团队 leader 做总结

直接输出汇总文本，不要输出 JSON。`;
    const user = `用户原始需求：${String(userMessage).slice(0, 500)}\n\n以下是各子 Agent 的 task-notification / 回复：\n${childReplies}\n\n请输出汇总。`;
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
    const round = Math.max(1, Number(options.round || 1));
    const maxRounds = Math.max(round, Number(options.maxRounds || 3));
    const requiresCodeChanges = options.requiresCodeChanges !== false;
    const requiresVerification = options.requiresVerification !== false;
    const childReplies = validOutputs
        .map((text, i) => `--- 子 Agent task-notification ${i + 1} ---\n${String(text).slice(0, 2400)}`)
        .join("\n\n");
    const system = `你是 CCM 群聊的主 Agent（工作协调者）。你已经把用户需求分派给项目 Agent，现在要像项目负责人一样复盘子 Agent 的回复。

当前是第 ${round}/${maxRounds} 轮验收；${allowFollowUps ? "如果证据不足，可以继续派发返工任务。" : "本轮不能再派发返工任务，必须给出最终结论或向用户提出具体问题。"}

本任务的最新门禁配置（优先级高于历史会话中的旧要求）：
- 必须产生代码/文件变更：${requiresCodeChanges ? "是" : "否；不得因为 filesChanged 为空判定缺口"}
- 必须执行项目验证命令：${requiresVerification ? "是" : "否；不得因为未运行、无法运行或缺少 npm test/build 等命令判定缺口"}

你不是代码执行 Agent，不写代码，不假装完成没有证据的工作。你要做的是：
1. 判断子 Agent 是否真正回答了任务、是否完成修改/验证、是否有缺口。
2. 找出前后端/多项目之间的冲突、依赖、遗漏。
3. 如果还需要某个项目 Agent 继续补充，只能在 followUps 里给出明确任务。
4. 如果已经足够，输出给用户的最终协调结论。
5. 如果需要用户决策或补充信息，明确指出。

验收门禁：
- 优先读取每个 Worker 的 <task-notification>：task-id 表示 Worker，status 表示 completed/failed/blocked/partial/missing_receipt，receipt-status 表示 CCM_AGENT_RECEIPT 状态，result 是 Worker 结果摘要。
- 优先读取每个子 Agent 回复末尾的 CCM_AGENT_RECEIPT / “结构化回执”摘要。
- 如果某个被派发的 Agent 缺少结构化回执，或回执 status 不是 done，或没有提供实际动作/验证证据，通常不能判定 complete。
- ${requiresCodeChanges ? "对代码修改类任务，必须看到修改点/文件或明确说明未修改；否则在 gaps 里指出。" : "本任务允许无文件变更；只需核对任务约定的可验收产出。"}
- ${requiresVerification ? "必须看到符合任务要求的实际验证证据。" : "本任务已关闭强制验证门禁，不得追问项目测试命令。"}
- 对依赖任务，后续 Agent 的结论必须引用或吸收前置 Agent 的结论；否则指出依赖未闭环。
- 对接口文档、业务文档、需求文档或 PRD 驱动的任务，必须检查子 Agent 是否覆盖了被分派的接口契约、字段、业务规则、页面/交互、验收标准；缺少文档条目对应的实现/确认/验证证据时不能判定 complete。
- 不要把“已建议”“可以修改”“应该检查”当成已完成。

只能返回 JSON 对象，不要 Markdown，不要解释。

允许追问的项目 Agent：
${buildAllowedProjectBrief(normalized) || "- 无"}

JSON 格式：
{
  "schema_version": 1,
  "status": "complete | needs_followup | needs_user",
  "verdict": "pass | blocked | needs_user",
  "decision": { "can_complete": true, "reason": "为什么可以完成或不能完成" },
  "summary": "给用户看的最终或阶段性协调结论，必须包含已确认结论、已完成/未完成事项、风险和验证建议",
  "checks": [
    { "id": "worker_receipt | actual_changes | verification | dependency | user_scope", "label": "检查项", "status": "pass | fail | warn", "detail": "检查结论", "evidence": ["证据"] }
  ],
  "worker_reviews": [
    { "project": "项目 Agent 名称", "receipt_status": "done | partial | blocked | failed | missing", "trusted": true, "completed_scope": ["已完成范围"], "gaps": ["缺口"], "verification": ["验证证据"] }
  ],
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

子 Agent task-notification / 回复：
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
        const normalizeStringList = (items, limit = 20) => Array.isArray(items) ? items.map((x) => String(x || "").trim()).filter(Boolean).slice(0, limit) : [];
        const checks = Array.isArray(parsed.checks) ? parsed.checks.map((item) => ({
            id: String(item?.id || "").trim(),
            label: String(item?.label || item?.id || "检查项").trim(),
            status: ["pass", "fail", "warn"].includes(String(item?.status || "")) ? String(item.status) : "warn",
            detail: String(item?.detail || "").trim(),
            evidence: normalizeStringList(item?.evidence, 10),
        })).filter((item) => item.id || item.detail || item.evidence.length) : [];
        const workerReviews = Array.isArray(parsed.worker_reviews || parsed.workerReviews) ? (parsed.worker_reviews || parsed.workerReviews).map((item) => ({
            project: String(item?.project || item?.agent || "").trim(),
            receipt_status: String(item?.receipt_status || item?.receiptStatus || item?.status || "missing").trim(),
            trusted: item?.trusted !== false,
            completed_scope: normalizeStringList(item?.completed_scope || item?.completedScope, 12),
            gaps: normalizeStringList(item?.gaps, 12),
            verification: normalizeStringList(item?.verification, 12),
        })).filter((item) => item.project || item.receipt_status !== "missing" || item.gaps.length || item.verification.length) : [];
        const decision = parsed.decision && typeof parsed.decision === "object" ? {
            can_complete: parsed.decision.can_complete !== false && parsed.decision.canComplete !== false,
            reason: String(parsed.decision.reason || "").trim(),
        } : { can_complete: status === "complete" && !gaps.length && !conflicts.length && !userQuestion && !followUps.length, reason: summary };
        const verdict = ["pass", "blocked", "needs_user"].includes(String(parsed.verdict || ""))
            ? String(parsed.verdict)
            : status === "complete" && decision.can_complete ? "pass" : userQuestion ? "needs_user" : "blocked";
        const structuredReview = {
            schema_version: Number(parsed.schema_version || parsed.schemaVersion || 1),
            verdict,
            decision,
            summary,
            checks,
            worker_reviews: workerReviews,
            gaps,
            conflicts,
            user_question: userQuestion,
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
        };
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
            confidence: structuredReview.confidence,
            structured_review: structuredReview,
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
- 像 Claude Code Coordinator 一样工作：先自己理解需求并形成计划，再把自包含工作单交给 Worker；不要把“理解需求”的责任转嫁给子 Agent。
- Coordinator 不写代码、不读项目文件、不运行命令；Worker 才负责研究、实现、验证和回执。
- 子 Agent 看不到你和用户的完整对话，targets[].task 必须包含足够背景、文档依据、边界、交付物、验证要求和回执要求。
- 不要写“根据上面的内容/根据你的发现去做”这种空任务；必须把你综合出的具体理解写进 task。
- 研究、实现、验证要按阶段思考：可并行研究，写同一代码区域时谨慎串行，验证要独立检查证据。
- 分派任务必须像工作单：说明背景、边界、要检查/修改的范围、交付物、验收/验证方式。
- 复杂、跨项目、文档型或实现型需求默认采用 research_synthesis_implementation_verification：Worker 在各自项目研究/实现/验证，Coordinator 负责综合事实、判断缺口和继续返工。
- Worker 失败、验证失败或回执证据不足时，优先继续同一个 Worker 补充，因为它保留了上下文；如果方向明显错误，再重新派给新的 Worker。
- 如果一个项目依赖另一个项目的结论，在 dependsOn 写依赖项目名，并选择 sequential 或 backend_first。
- 依赖关系必须来自接口契约、数据流、文件冲突或验收顺序等语义理由，不能只按“前端/后端”关键词机械排列。
- 输出计划时区分已知事实、待 Worker 核验的假设和最终必须证明的断言；当前代码状态未知时明确要求 Worker 先读取真实状态。
- 在 reasoning.replanTriggers 中写出何时必须停止旧计划并重新规划，例如接口契约变化、目标文件不存在、验证失败、依赖输出与假设不一致。
- 如果用户需求太模糊，shouldDelegate=false，并用 questionForUser 问一个最关键的问题。
- 普通聊天、知识问答、项目介绍、架构说明、原因分析和方案咨询必须 shouldDelegate=false、dispatchPolicy.action=direct_answer；不能为了满足代码变更门禁而把问答改造成修改 README 或开发任务。
- 只有用户当前消息明确要求“修改、实现、创建、运行、执行、派发、修复、删除、更新、部署”等实际动作时，才允许 shouldDelegate=true。历史消息中的开发要求不能替代当前消息授权。
- 对业务开发、PRD、需求文档、接口文档、功能实现类任务，只要群聊里存在可分派项目 Agent，默认 shouldDelegate=true；即使未明确前端/后端/具体项目，也要先派给相关或全部项目 Agent 让其按职责判断影响范围。
- 缺少范围、字段或验收细节时，把缺口写入 missingInfo、dispatchPolicy.risk 和子 Agent task 的“待确认/风险”，不要因此直接 ask_user，除非完全没有业务目标、没有可分派项目 Agent，或涉及高风险操作必须用户确认。

文档型需求处理规则：
- 如果用户消息或共享文件包含接口文档、业务文档、需求文档、PRD、验收标准、字段表、API 示例或流程说明，你必须先读取这些内容再拆任务。
- 先在 summary / deliverables / constraints 中提炼：业务目标、涉及模块、接口契约（方法/路径/入参/出参/错误码/鉴权）、数据字段、页面/交互、业务规则、验收标准、依赖顺序和不明确点。
- 给子 Agent 的 task 不能只写“阅读文档并实现”。必须写清楚：引用的文档名称或附件来源、该 Agent 负责的文档条目/接口/字段/规则、需要检查或修改的代码范围、交付物、验证方式、与其他 Agent 的依赖。
- 接口文档优先按“后端实现/校验 API 契约 -> 前端或客户端对接接口 -> 联调/验收”拆分，通常选择 backend_first 或 sequential。
- 业务/需求文档优先按“业务规则/数据模型 -> API/服务 -> 页面/交互 -> 验收”拆分。
- 如果文档内容缺少关键契约或验收标准，不要编造；shouldDelegate=false 或 requiresConfirmation=true，并在 questionForUser 写最关键的补充问题。
- 如果共享文件正文里有具体字段、接口路径、状态流转或验收项，相关子 Agent 工作单必须包含这些关键信息的摘要。

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
  "documentFindings": ["如果有文档，提炼文档中的接口、字段、业务规则、验收标准或不明确点；没有则空数组"],
  "missingInfo": ["缺失但重要的信息"],
  "dispatchPolicy": {
    "action": "direct_answer | ask_user | delegate | hold",
    "reason": "为什么选择这个动作",
    "requiresConfirmation": false,
    "risk": "如果有风险写清楚；没有则空字符串",
    "nextStep": "接下来应该做什么"
  },
  "coordinationStrategy": "direct_worker_execution | research_synthesis_implementation_verification",
  "coordinationPlan": {
    "phases": ["主 Agent 计划阶段，例如理解需求、研究与综合、分配任务、协同执行、复盘验收"],
    "synthesisStrategy": "你会如何综合子 Agent 回执并判断是否需要返工"
  },
  "reasoning": {
    "knownFacts": ["来自用户当前消息、共享文档或当前群聊上下文的事实"],
    "assumptionsToVerify": ["必须由 Worker 读取当前项目后核验的假设"],
    "verificationAssertions": ["最终交付必须用证据证明的目标断言"],
    "dependencyRationale": ["每条跨项目依赖为什么存在"],
    "replanTriggers": ["出现什么事实变化或失败时必须重规划"]
  },
  "shouldDelegate": true,
  "executionOrder": "parallel | sequential | backend_first",
  "targets": [
    {
      "project": "必须是允许分派的项目 Agent 名称",
      "task": "给这个项目 Agent 的可执行工作单，包含背景、引用的文档/附件、负责的接口/字段/业务规则、边界、交付物、需要检查/修改的范围、风险和验证要求",
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
function normalizeDocumentFindings(parsed) {
    return Array.isArray(parsed?.documentFindings)
        ? parsed.documentFindings.map((x) => String(x).trim()).filter(Boolean)
        : [];
}
function enrichTaskWithDocumentFindings(task, findings) {
    const text = String(task || "").trim();
    if (!findings.length)
        return text;
    if (/文档依据|引用文档|接口文档|业务文档|需求文档|PRD|附件/.test(text))
        return text;
    const brief = findings.slice(0, 6).map(item => `- ${compactText(item, 180)}`).join("\n");
    return `${text}\n\n文档依据/验收关注：\n${brief}`;
}
function sanitizeLlmTargets(group, parsed, message, fallbackAnalysis, allowRuleRepair = false) {
    const allowed = new Map(getRoutableMembers(group).map((m) => [m.project, m]));
    const rawTargets = Array.isArray(parsed?.targets) ? parsed.targets : [];
    const documentFindings = mergeDocumentFindings(normalizeDocumentFindings(parsed), fallbackAnalysis?.documentFindings);
    const taskAnalysis = {
        ...fallbackAnalysis,
        documentFindings,
        summary: String(parsed?.summary || fallbackAnalysis?.summary || ""),
        deliverables: Array.isArray(parsed?.deliverables) && parsed.deliverables.length ? parsed.deliverables : fallbackAnalysis?.deliverables,
        constraints: Array.isArray(parsed?.constraints) ? parsed.constraints : fallbackAnalysis?.constraints,
        missingInfo: Array.isArray(parsed?.missingInfo) ? parsed.missingInfo : fallbackAnalysis?.missingInfo,
        coordinationStrategy: String(parsed?.coordinationStrategy || fallbackAnalysis?.coordinationStrategy || inferCoordinatorStrategy(fallbackAnalysis, rawTargets.length)),
    };
    const seen = new Set();
    const targets = [];
    for (const target of rawTargets) {
        const project = String(target?.project || "").trim();
        if (!allowed.has(project) || seen.has(project))
            continue;
        const enrichedTask = enrichTaskWithDocumentFindings(String(target?.task || "").trim() || message, documentFindings);
        const task = buildSelfContainedWorkerTask(project, enrichedTask, taskAnalysis, {
            reason: target?.reason || "LLM 主 Agent 根据需求理解和项目职责派发",
            dependsOn: target?.dependsOn || "",
            coordinationStrategy: taskAnalysis.coordinationStrategy,
        });
        targets.push({
            member: allowed.get(project),
            task,
            reason: String(target?.reason || "").trim(),
            dependsOn: String(target?.dependsOn || "").trim(),
        });
        seen.add(project);
    }
    const broadDevelopmentRequest = isBroadDevelopmentRequest(message, fallbackAnalysis);
    if ((allowRuleRepair || broadDevelopmentRequest) && targets.length === 0 && (parsed?.shouldDelegate !== false || broadDevelopmentRequest)) {
        return routeMembers(group, message, fallbackAnalysis).map((item) => ({
            ...item,
            task: buildSelfContainedWorkerTask(item.member.project, enrichTaskWithDocumentFindings(item.task || message, documentFindings), taskAnalysis, {
                reason: broadDevelopmentRequest ? "业务开发需求规则补派" : "规则回退路由",
                dependsOn: item.dependsOn || "",
                coordinationStrategy: taskAnalysis.coordinationStrategy,
            }),
            reason: broadDevelopmentRequest ? "业务开发需求规则补派" : "规则回退路由",
        }));
    }
    return targets;
}
function normalizeLlmAnalysis(parsed, fallback) {
    const documentFindings = mergeDocumentFindings(normalizeDocumentFindings(parsed), fallback?.documentFindings);
    return {
        ...fallback,
        intent: String(parsed?.intent || fallback.intent || "discussion"),
        summary: String(parsed?.summary || fallback.summary || ""),
        domains: Array.isArray(parsed?.domains) ? parsed.domains.map((x) => String(x)).filter(Boolean) : fallback.domains,
        deliverables: Array.isArray(parsed?.deliverables) && parsed.deliverables.length ? parsed.deliverables.map((x) => String(x)) : fallback.deliverables,
        constraints: Array.isArray(parsed?.constraints) ? parsed.constraints.map((x) => String(x)).filter(Boolean) : fallback.constraints,
        documentFindings,
        missingInfo: Array.isArray(parsed?.missingInfo) ? parsed.missingInfo.map((x) => String(x)).filter(Boolean) : fallback.missingInfo,
        needsCoordination: parsed?.shouldDelegate !== false,
        coordinationStrategy: String(parsed?.coordinationStrategy || fallback?.coordinationStrategy || inferCoordinatorStrategy(fallback, Array.isArray(parsed?.targets) ? parsed.targets.length : 0)),
        reasoning: {
            knownFacts: Array.isArray(parsed?.reasoning?.knownFacts) ? parsed.reasoning.knownFacts.map((x) => String(x)).filter(Boolean).slice(0, 20) : [],
            assumptionsToVerify: Array.isArray(parsed?.reasoning?.assumptionsToVerify) ? parsed.reasoning.assumptionsToVerify.map((x) => String(x)).filter(Boolean).slice(0, 20) : [],
            verificationAssertions: Array.isArray(parsed?.reasoning?.verificationAssertions) ? parsed.reasoning.verificationAssertions.map((x) => String(x)).filter(Boolean).slice(0, 20) : [],
            dependencyRationale: Array.isArray(parsed?.reasoning?.dependencyRationale) ? parsed.reasoning.dependencyRationale.map((x) => String(x)).filter(Boolean).slice(0, 20) : [],
            replanTriggers: Array.isArray(parsed?.reasoning?.replanTriggers) ? parsed.reasoning.replanTriggers.map((x) => String(x)).filter(Boolean).slice(0, 20) : [],
        },
        confidence: typeof parsed?.confidence === "number" ? parsed.confidence : fallback.confidence,
    };
}
function buildCoordinatorResultFromAnalysis(group, message, analysis, targets, runtime, parsed = null) {
    const coordinator = getCoordinatorMember(group);
    // 优化6：优先使用 LLM 生成的 friendlyResponse
    const friendlyText = String(parsed?.friendlyResponse || "").trim();
    const dispatchPolicy = parsed
        ? normalizeDispatchPolicy(parsed, analysis, targets)
        : inferCodedDispatchPolicy(group, message, analysis, targets);
    const shouldDispatch = dispatchPolicy.action === "delegate" && !dispatchPolicy.requiresConfirmation;
    const effectiveTargets = shouldDispatch ? targets : [];
    if (effectiveTargets.length === 0) {
        const response = friendlyText || String(parsed?.questionForUser || parsed?.directResponse || "").trim();
        const fallbackQuestion = analysis.missingInfo?.[0] || "请描述更具体的需求";
        const policyLine = dispatchPolicy.action === "delegate" && dispatchPolicy.requiresConfirmation
            ? `我先不直接派发：${dispatchPolicy.reason || "该操作需要你确认"}${dispatchPolicy.risk ? `\n风险：${dispatchPolicy.risk}` : ""}`
            : "";
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            analysis,
            dispatchPolicy,
            runtime,
            agentBoundary: buildGroupMainAgentBoundary(runtime === "llm-api" ? "llm" : runtime),
            content: response || policyLine || `我理解了你的需求，不过还需要你补充一下：**${fallbackQuestion}**`,
        };
    }
    const delegationLines = effectiveTargets.map((item) => buildVisibleAssignmentLine(item));
    const delegated = effectiveTargets.map((item) => item.member.project);
    // 优化5：保存执行顺序信息
    const executionOrder = String(parsed?.executionOrder || "parallel");
    const coordinationStrategy = String(parsed?.coordinationStrategy || analysis?.coordinationStrategy || inferCoordinatorStrategy(analysis, effectiveTargets.length));
    analysis.coordinationStrategy = coordinationStrategy;
    const coordinationPlan = buildCoordinatorPlan(group, analysis, effectiveTargets, executionOrder, coordinationStrategy);
    return {
        agent: coordinator.project,
        delegated,
        assignments: buildAssignmentsFromTargets(effectiveTargets),
        analysis,
        coordinationPlan,
        dispatchPolicy,
        runtime,
        agentBoundary: buildGroupMainAgentBoundary(runtime === "llm-api" ? "llm" : runtime),
        executionOrder,
        coordinationStrategy,
        content: [
            friendlyText || `好的，这个需求我安排 ${delegated.join("、")} 来处理。`,
            "",
            buildCoordinatorPlanText(coordinationPlan),
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
    const fallbackAnalysis = buildDocumentAwareAnalysis(group, input);
    const parsed = shouldUseAnthropic(config)
        ? await callAnthropicCompatibleOrchestrator(config, input)
        : await callOpenAiCompatibleOrchestrator(config, input);
    const analysis = normalizeLlmAnalysis(parsed, fallbackAnalysis);
    const targets = sanitizeLlmTargets(group, parsed, input.message, analysis, !!config.fallbackToRules && isStructuredCoordinatorFallbackAllowed(input));
    return buildCoordinatorResultFromAnalysis(group, input.message, analysis, targets, "llm-api", parsed);
}
function isStructuredCoordinatorFallbackAllowed(input) {
    const source = String(input?.source || "").toLowerCase();
    const message = String(input?.message || "");
    const trustedSource = /^(?:task|cron|daily[_-]?dev|daily-dev-dispatch-repair|mission|global-mission)/.test(source);
    const structuredPacket = /(?:主 Agent .*工作单|任务标题[:：])/.test(message)
        && /业务目标[:：]/.test(message)
        && /验收标准[:：]/.test(message);
    return trustedSource && structuredPacket;
}
async function runGroupOrchestrator(input) {
    const group = normalizeGroupOrchestrator(input.group);
    const coordinator = getCoordinatorMember(group);
    const config = loadOrchestratorConfig();
    const configIssue = getLlmConfigIssue(config);
    const informationalFallback = !isExplicitExecutionRequest(input.message);
    const safeCodedFallback = isStructuredCoordinatorFallbackAllowed(input) || informationalFallback;
    if (configIssue) {
        if (config.fallbackToRules && safeCodedFallback) {
            const fallback = runCodedGroupOrchestrator({ ...input, group });
            return {
                ...fallback,
                runtime: "coded-fallback",
                agentBoundary: buildGroupMainAgentBoundary("coded_fallback"),
                content: informationalFallback ? fallback.content : `${fallback.content}\n\n主 Agent API 回退：${configIssue}`,
            };
        }
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            runtime: "llm-not-configured",
            agentBoundary: buildGroupMainAgentBoundary("llm-not-configured"),
            content: [
                "主 Agent 暂时不能开始协调：大模型 API 未配置完整。",
                "",
                `原因：${configIssue}`,
                "",
                "请到 设置 -> 群聊主 Agent 模型配置 中填写 Base URL、API Key 和模型名。",
                "配置完成后，主 Agent 会先调用大模型理解需求，再分派给项目 Agent。"
            ].join("\n"),
        };
    }
    try {
        return await runLlmGroupOrchestrator({ ...input, group });
    }
    catch (error) {
        if (isContextLimitError(error) && input.context) {
            try {
                const recovered = await runLlmGroupOrchestrator({
                    ...input,
                    group,
                    context: buildReactiveCompactionContext(input.context),
                });
                return {
                    ...recovered,
                    contextRecovery: {
                        type: "reactive-compact",
                        originalChars: String(input.context || "").length,
                        recoveredChars: buildReactiveCompactionContext(input.context).length,
                    },
                };
            }
            catch (recoveryError) {
                error = recoveryError;
            }
        }
        if (config.fallbackToRules && safeCodedFallback) {
            const fallback = runCodedGroupOrchestrator({ ...input, group });
            return {
                ...fallback,
                runtime: "coded-fallback",
                agentBoundary: buildGroupMainAgentBoundary("coded_fallback"),
                content: informationalFallback ? fallback.content : `${fallback.content}\n\n主 Agent API 回退：${error.message}`,
            };
        }
        return {
            agent: coordinator.project,
            delegated: [],
            assignments: [],
            runtime: "llm-error",
            agentBoundary: buildGroupMainAgentBoundary("llm-error"),
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
function isContextLimitError(error) {
    const text = String(error?.message || error || "");
    return /HTTP\s*413|prompt(?:\s+is)?\s+too\s+long|context(?:_length)?(?:\s+window)?\s*(?:exceeded|limit)|maximum context|token limit/i.test(text);
}
function buildReactiveCompactionContext(context, maxChars = 48_000) {
    const text = String(context || "");
    if (text.length <= maxChars)
        return text;
    const marker = "\n\n…[Reactive Compact：中间上下文已紧急折叠；原始群聊记录仍可按 message id 回溯]…\n\n";
    const head = Math.floor((maxChars - marker.length) * 0.58);
    const tail = Math.max(1, maxChars - marker.length - head);
    return `${text.slice(0, head)}${marker}${text.slice(-tail)}`;
}
//# sourceMappingURL=group-orchestrator.js.map