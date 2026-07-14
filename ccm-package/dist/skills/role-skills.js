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
exports.CCM_ROLE_SKILL_NAMES = void 0;
exports.ensureRoleSkillsInstalled = ensureRoleSkillsInstalled;
exports.isRoleSkillWorkRequest = isRoleSkillWorkRequest;
exports.selectRoleSkills = selectRoleSkills;
exports.buildSelectedSkillUsageDirective = buildSelectedSkillUsageDirective;
exports.buildRoleSkillPrompt = buildRoleSkillPrompt;
exports.runRoleSkillSelectionSelfTest = runRoleSkillSelectionSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../core/db");
exports.CCM_ROLE_SKILL_NAMES = {
    global: "ccm-global-mission-lead",
    group: "ccm-group-coordination-lead",
    project: "ccm-project-delivery-worker",
    test: "ccm-test-acceptance-verifier",
    receipt: "ccm-delivery-receipt",
    evidence: "ccm-acceptance-evidence",
    requirementIntake: "ccm-requirement-intake",
    taskDecomposition: "ccm-task-decomposition",
    deliveryReviewRework: "ccm-delivery-review-rework",
    projectSourceResearch: "ccm-project-source-research",
    documentDrivenDelivery: "ccm-document-driven-delivery",
    incidentDiagnosis: "ccm-incident-diagnosis",
    frontendVisualQa: "ccm-frontend-visual-qa",
    releaseReadiness: "ccm-release-readiness",
};
const ROLE_SKILL_CATALOG = [
    {
        name: exports.CCM_ROLE_SKILL_NAMES.global,
        description: "Coordinate explicit CCM work across groups or projects, supervise mission evidence, and return a friendly final summary.",
    },
    {
        name: exports.CCM_ROLE_SKILL_NAMES.group,
        description: "Plan executable group work, dispatch scoped project Agents, review receipts, request rework, and hand off acceptance.",
    },
    {
        name: exports.CCM_ROLE_SKILL_NAMES.project,
        description: "Execute a scoped CCM project assignment, implement and verify changes, and return a structured delivery receipt.",
    },
    {
        name: exports.CCM_ROLE_SKILL_NAMES.test,
        description: "Independently verify CCM acceptance criteria with commands, APIs, browser checks, screenshots, and conservative verdicts.",
    },
    {
        name: exports.CCM_ROLE_SKILL_NAMES.receipt,
        description: "Produce a structured CCM implementation receipt containing actions, changed files, verification, blockers, and Skill usage.",
    },
    {
        name: exports.CCM_ROLE_SKILL_NAMES.evidence,
        description: "Map CCM acceptance criteria to reproducible command, API, browser, screenshot, and artifact evidence.",
    },
    {
        name: exports.CCM_ROLE_SKILL_NAMES.requirementIntake,
        description: "Extract executable goals, contracts, constraints, source references, and acceptance criteria from messages and documents.",
    },
    {
        name: exports.CCM_ROLE_SKILL_NAMES.taskDecomposition,
        description: "Split delivery work into scoped project assignments with semantic dependencies and observable completion conditions.",
    },
    {
        name: exports.CCM_ROLE_SKILL_NAMES.deliveryReviewRework,
        description: "Review project receipts against assignments and acceptance criteria, then produce precise evidence-based rework.",
    },
    {
        name: exports.CCM_ROLE_SKILL_NAMES.projectSourceResearch,
        description: "Inspect current project source, repository state, instructions, and established patterns before implementation.",
    },
    {
        name: exports.CCM_ROLE_SKILL_NAMES.documentDrivenDelivery,
        description: "Trace PRD, API, image, and attachment clauses through implementation and criterion-linked verification.",
    },
    {
        name: exports.CCM_ROLE_SKILL_NAMES.incidentDiagnosis,
        description: "Reproduce runtime or build failures, isolate the supported root cause, repair it, and verify recovery.",
    },
    {
        name: exports.CCM_ROLE_SKILL_NAMES.frontendVisualQa,
        description: "Verify real frontend behavior, responsive layout, browser state, console failures, and screenshot evidence.",
    },
    {
        name: exports.CCM_ROLE_SKILL_NAMES.releaseReadiness,
        description: "Assess build, configuration, compatibility, migration, rollout, rollback, and residual release risk.",
    },
];
let installationChecked = false;
function templateRoot() {
    const configured = String(process.env.CCM_ROLE_SKILL_TEMPLATE_ROOT || "").trim();
    if (configured)
        return path.resolve(configured);
    return path.resolve(__dirname, "..", "..", "templates", "skills");
}
function listFiles(root, current = root) {
    if (!fs.existsSync(current))
        return [];
    return fs.readdirSync(current, { withFileTypes: true }).flatMap(entry => {
        const absolute = path.join(current, entry.name);
        return entry.isDirectory() ? listFiles(root, absolute) : [path.relative(root, absolute).replace(/\\/g, "/")];
    }).sort();
}
function packageFingerprint(root) {
    const digest = crypto.createHash("sha256");
    for (const relative of listFiles(root)) {
        digest.update(relative);
        digest.update(fs.readFileSync(path.join(root, relative)));
    }
    return digest.digest("hex").slice(0, 20);
}
function packageStats(root) {
    const files = listFiles(root);
    return {
        files: files.length,
        totalBytes: files.reduce((sum, relative) => sum + fs.statSync(path.join(root, relative)).size, 0),
    };
}
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.${crypto.randomBytes(3).toString("hex")}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
    try {
        fs.renameSync(temporary, file);
    }
    catch {
        try {
            if (fs.existsSync(file))
                fs.unlinkSync(file);
        }
        catch { }
        fs.renameSync(temporary, file);
    }
}
function syncPackage(source, destination) {
    fs.mkdirSync(destination, { recursive: true });
    for (const relative of listFiles(source)) {
        const target = path.join(destination, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        const sourceBuffer = fs.readFileSync(path.join(source, relative));
        const currentBuffer = fs.existsSync(target) ? fs.readFileSync(target) : null;
        if (!currentBuffer || !sourceBuffer.equals(currentBuffer))
            fs.writeFileSync(target, sourceBuffer);
    }
}
function ensureRoleSkillsInstalled(options = {}) {
    if (installationChecked && !options.force)
        return { installed: [], available: ROLE_SKILL_CATALOG.map(item => item.name) };
    const sourceRoot = templateRoot();
    const installed = [];
    const available = [];
    fs.mkdirSync(db_1.SKILL_PACKAGES_DIR, { recursive: true });
    fs.mkdirSync(db_1.SKILLS_DIR, { recursive: true });
    for (const definition of ROLE_SKILL_CATALOG) {
        const source = path.join(sourceRoot, definition.name);
        const sourceSkill = path.join(source, "SKILL.md");
        if (!fs.existsSync(sourceSkill))
            continue;
        const destination = path.join(db_1.SKILL_PACKAGES_DIR, definition.name);
        const before = fs.existsSync(path.join(destination, "SKILL.md")) ? packageFingerprint(destination) : "";
        syncPackage(source, destination);
        const contentHash = packageFingerprint(destination);
        if (contentHash !== before)
            installed.push(definition.name);
        available.push(definition.name);
        const catalogFile = path.join(db_1.SKILLS_DIR, `${definition.name}.json`);
        let previous = {};
        try {
            previous = JSON.parse(fs.readFileSync(catalogFile, "utf-8"));
        }
        catch { }
        writeJsonAtomic(catalogFile, {
            ...previous,
            name: definition.name,
            type: "skill",
            description: definition.description,
            prompt: "",
            enabled: true,
            version: "1.0.0",
            author: "CCM",
            packagePath: destination,
            skillFile: path.join(destination, "SKILL.md"),
            packageStats: packageStats(destination),
            contentHash,
            systemManaged: true,
            roleSkill: true,
            marketplace: {
                source: { id: "ccm-role-skills", label: "CCM Role Skills", kind: "builtin", trust: "official" },
                itemId: `ccm-role-skills:skill:${definition.name}`,
                homepage: "",
            },
            updated_at: contentHash === previous?.contentHash && previous?.updated_at
                ? previous.updated_at
                : new Date().toISOString(),
        });
    }
    installationChecked = true;
    return { installed, available };
}
function skillBody(name) {
    ensureRoleSkillsInstalled();
    const skillPath = path.join(db_1.SKILL_PACKAGES_DIR, name, "SKILL.md");
    if (!fs.existsSync(skillPath))
        return { skillPath, body: "" };
    const markdown = fs.readFileSync(skillPath, "utf-8").replace(/^\uFEFF/, "");
    const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
    return { skillPath, body };
}
function trustedWorkSource(source = "") {
    return /^(?:task|cron|mission|global-mission|daily[_-]?dev|auto[_-]?dev|rework|test-agent)/i.test(String(source || "").trim());
}
function isRoleSkillWorkRequest(message = "", options = {}) {
    if (options.forceWork || trustedWorkSource(options.source))
        return true;
    const text = String(message || "").replace(/\s+/g, " ").trim();
    if (!text)
        return false;
    if (/(?:那就|好|可以|行).{0,8}(?:以|把).{0,32}(?:为|设为).{0,6}目标/i.test(text))
        return true;
    if (/(?:那就|请|帮我|给我|开始|继续).{0,12}(?:做|处理)(?:这个|这块|它|上述|前面)/i.test(text))
        return true;
    const action = /修改|实现|创建|新建|修复|运行|执行|派发|部署|删除|更新|升级|完善|重构|接入|对接|安装|生成|开发|提交|测试|验收|检查|排查|继续|完成|改成|改为|make|implement|fix|build|run|deploy|create|update|refactor|test|verify/i;
    const explicit = /(?:请|帮我|给我|替我|现在|直接|开始|继续|务必|需要你|让你|把|将|以.+为目标)/i;
    const questionOnly = /^(?:为什么|什么是|怎么理解|如何理解|是否|是不是|能不能|可以吗|会不会|有没有|介绍|解释|说说|how|what|why|can |could |would )/i.test(text)
        && !explicit.test(text);
    return action.test(text) && explicit.test(text) && !questionOnly;
}
function wantsAcceptanceEvidence(text = "") {
    return /验收|验证|测试|截图|浏览器|页面|接口|API|构建|类型检查|回归|证据|test|verify|browser|playwright|screenshot|build|lint|typecheck/i.test(String(text || ""));
}
function wantsRequirementIntake(text = "") {
    return /附件|图片|截图|文档|需求|PRD|接口说明|API 文档|腾讯文档|飞书文档|Word|Excel|PDF|上传|链接|attachment|image|document|specification|requirements?/i.test(String(text || ""));
}
function wantsDocumentDrivenDelivery(text = "") {
    return /按.{0,12}(?:文档|需求|PRD|接口|附件)|文档驱动|接口契约|字段表|状态流转|验收标准|PRD|API (?:document|spec)|document[- ]driven/i.test(String(text || ""));
}
function wantsIncidentDiagnosis(text = "") {
    return /报错|错误|失败|异常|崩溃|不可用|无法|超时|故障|回归|定位|排查|修复|400|401|403|404|409|500|error|failed|failure|crash|timeout|incident|regression|debug/i.test(String(text || ""));
}
function wantsFrontendVisualQa(text = "") {
    return /前端|页面|界面|UI|UX|样式|布局|弹窗|表单|聊天框|文本框|移动端|响应式|浏览器|截图|视觉|frontend|page|dialog|modal|form|responsive|browser|screenshot|visual/i.test(String(text || ""));
}
function wantsReleaseReadiness(text = "") {
    return /发布|部署|上线|打包|版本|升级|迁移|灰度|回滚|生产环境|release|deploy|publish|package|version|upgrade|migration|rollout|rollback|production/i.test(String(text || ""));
}
function selectRoleSkills(role, taskText = "", options = {}) {
    ensureRoleSkillsInstalled();
    const work = role === "project-child-agent" || role === "test-agent" || isRoleSkillWorkRequest(taskText, options);
    if (!work)
        return [];
    const rows = [];
    const phase = options.phase || (role === "test-agent" ? "verification" : role === "project-child-agent" ? "execution" : "planning");
    const add = (name, kind, reason) => rows.push({ name, kind, reason });
    if (role === "global-agent") {
        add(exports.CCM_ROLE_SKILL_NAMES.global, "role", "跨群聊任务路由与监督");
        if (wantsRequirementIntake(taskText))
            add(exports.CCM_ROLE_SKILL_NAMES.requirementIntake, "workflow", "消息或附件需要形成可执行需求");
        if (wantsDocumentDrivenDelivery(taskText))
            add(exports.CCM_ROLE_SKILL_NAMES.documentDrivenDelivery, "workflow", "需求包含文档或接口契约");
        if (wantsIncidentDiagnosis(taskText))
            add(exports.CCM_ROLE_SKILL_NAMES.incidentDiagnosis, "workflow", "任务要求定位或修复故障");
        if (wantsReleaseReadiness(taskText))
            add(exports.CCM_ROLE_SKILL_NAMES.releaseReadiness, "workflow", "任务涉及发布或生产变更");
    }
    if (role === "group-main-agent") {
        add(exports.CCM_ROLE_SKILL_NAMES.group, "role", "群聊任务计划、派发与复核");
        if (phase === "review" || phase === "summary") {
            add(exports.CCM_ROLE_SKILL_NAMES.deliveryReviewRework, "workflow", "当前阶段需要复核回执或生成返工");
            add(exports.CCM_ROLE_SKILL_NAMES.receipt, "shared", "读取统一子 Agent 交付回执");
            if (wantsAcceptanceEvidence(taskText))
                add(exports.CCM_ROLE_SKILL_NAMES.evidence, "shared", "复核验收项与实际证据");
        }
        else {
            add(exports.CCM_ROLE_SKILL_NAMES.taskDecomposition, "workflow", "当前阶段需要拆解和路由任务");
            if (wantsRequirementIntake(taskText))
                add(exports.CCM_ROLE_SKILL_NAMES.requirementIntake, "workflow", "消息或附件需要先提炼需求");
            if (wantsDocumentDrivenDelivery(taskText))
                add(exports.CCM_ROLE_SKILL_NAMES.documentDrivenDelivery, "workflow", "工作单需要保留文档条款追踪");
            if (wantsIncidentDiagnosis(taskText))
                add(exports.CCM_ROLE_SKILL_NAMES.incidentDiagnosis, "workflow", "故障任务需要复现和根因链路");
            if (wantsReleaseReadiness(taskText))
                add(exports.CCM_ROLE_SKILL_NAMES.releaseReadiness, "workflow", "计划涉及发布或迁移边界");
        }
    }
    if (role === "project-child-agent") {
        add(exports.CCM_ROLE_SKILL_NAMES.project, "role", "限定范围内实施与验证");
        add(exports.CCM_ROLE_SKILL_NAMES.projectSourceResearch, "workflow", "修改前确认当前源码和项目规范");
        add(exports.CCM_ROLE_SKILL_NAMES.receipt, "shared", "向主 Agent 返回可复核回执");
        if (wantsDocumentDrivenDelivery(taskText))
            add(exports.CCM_ROLE_SKILL_NAMES.documentDrivenDelivery, "workflow", "按文档条款追踪实现覆盖");
        if (wantsIncidentDiagnosis(taskText))
            add(exports.CCM_ROLE_SKILL_NAMES.incidentDiagnosis, "workflow", "先复现并定位根因再修改");
        if (wantsFrontendVisualQa(taskText))
            add(exports.CCM_ROLE_SKILL_NAMES.frontendVisualQa, "workflow", "前端任务需要真实浏览器与视觉证据");
        if (wantsAcceptanceEvidence(taskText))
            add(exports.CCM_ROLE_SKILL_NAMES.evidence, "shared", "任务要求验证或验收证据");
        if (wantsReleaseReadiness(taskText))
            add(exports.CCM_ROLE_SKILL_NAMES.releaseReadiness, "workflow", "任务涉及发布、升级或迁移");
    }
    if (role === "test-agent") {
        add(exports.CCM_ROLE_SKILL_NAMES.test, "role", "独立验收与保守结论");
        add(exports.CCM_ROLE_SKILL_NAMES.evidence, "shared", "验收项与真实证据绑定");
        if (wantsFrontendVisualQa(taskText))
            add(exports.CCM_ROLE_SKILL_NAMES.frontendVisualQa, "workflow", "用户界面需要浏览器和截图验收");
        if (wantsReleaseReadiness(taskText))
            add(exports.CCM_ROLE_SKILL_NAMES.releaseReadiness, "workflow", "验收包含发布就绪条件");
    }
    const defaultMaxSkills = role === "project-child-agent" ? 6 : 4;
    const maxSkills = Math.max(1, Math.min(6, Number(options.maxSkills || defaultMaxSkills)));
    const seen = new Set();
    return rows.filter(row => !seen.has(row.name) && !!seen.add(row.name)).slice(0, maxSkills).map(row => {
        const loaded = skillBody(row.name);
        return {
            ...row,
            role,
            packagePath: path.join(db_1.SKILL_PACKAGES_DIR, row.name),
            skillPath: loaded.skillPath,
            body: loaded.body,
        };
    });
}
function buildSelectedSkillUsageDirective(selected) {
    if (!selected.length)
        return "";
    return [
        "[CCM 本工作单已选择 Skill]",
        "以下 Skill 不是可选目录项，而是本工作单已匹配的执行方法。开始工作前读取并应用其 SKILL.md；只在需要细节时读取 references。",
        ...selected.map(item => `- Skill:${item.name}：${item.reason}`),
        "完成后在 CCM_AGENT_RECEIPT 的 memoryUsed/Skill 使用记录中逐项报告实际使用的 Skill:<name>；未使用时说明原因，禁止虚报。",
    ].join("\n");
}
function buildRoleSkillPrompt(role, taskText = "", options = {}) {
    const selected = selectRoleSkills(role, taskText, options).filter(item => item.body);
    if (!selected.length)
        return { names: [], prompt: "", selected };
    const sections = selected.map(item => `## Skill:${item.name}\n${item.body}`);
    return {
        names: selected.map(item => item.name),
        prompt: `[CCM 本轮角色 Skill]\n${sections.join("\n\n")}`.slice(0, 9_000),
        selected,
    };
}
function runRoleSkillSelectionSelfTest() {
    const installation = ensureRoleSkillsInstalled({ force: true });
    const ordinaryGlobal = selectRoleSkills("global-agent", "你好，介绍一下你自己");
    const ordinaryGroup = selectRoleSkills("group-main-agent", "这个项目是做什么的？");
    const globalWork = selectRoleSkills("global-agent", "请根据接口文档修复支付 500 错误并完成验收");
    const groupWork = selectRoleSkills("group-main-agent", "请把支付需求拆分后派发给项目 Agent", { source: "task", phase: "planning" });
    const groupReview = selectRoleSkills("group-main-agent", "复核子 Agent 的实现和测试证据并安排返工", { forceWork: true, phase: "review" });
    const contextualGroupWork = selectRoleSkills("group-main-agent", "那就以这个为目标");
    const projectWork = selectRoleSkills("project-child-agent", "根据 PRD 修复退款页面并运行浏览器截图测试", { phase: "execution" });
    const incidentWork = selectRoleSkills("project-child-agent", "修复 API 500 报错并验证回归", { phase: "execution" });
    const releaseWork = selectRoleSkills("project-child-agent", "完成版本升级、数据库迁移和生产发布检查", { phase: "release" });
    const testWork = selectRoleSkills("test-agent", "在浏览器验证退款页面响应式布局并截图", { phase: "verification" });
    const checks = {
        allPackagesInstalled: ROLE_SKILL_CATALOG.every(item => installation.available.includes(item.name)
            && fs.existsSync(path.join(db_1.SKILL_PACKAGES_DIR, item.name, "SKILL.md"))
            && fs.existsSync(path.join(db_1.SKILL_PACKAGES_DIR, item.name, "agents", "openai.yaml"))
            && fs.existsSync(path.join(db_1.SKILLS_DIR, `${item.name}.json`))),
        ordinaryGlobalLoadsNoWorkSkills: ordinaryGlobal.length === 0,
        ordinaryGroupLoadsNoWorkSkills: ordinaryGroup.length === 0,
        globalGetsOnlyRelevantSkills: globalWork[0]?.name === exports.CCM_ROLE_SKILL_NAMES.global
            && globalWork.some(item => item.name === exports.CCM_ROLE_SKILL_NAMES.requirementIntake)
            && globalWork.some(item => item.name === exports.CCM_ROLE_SKILL_NAMES.incidentDiagnosis)
            && !globalWork.some(item => item.name === exports.CCM_ROLE_SKILL_NAMES.group),
        groupGetsCoordinatorAndDecomposition: groupWork[0]?.name === exports.CCM_ROLE_SKILL_NAMES.group
            && groupWork.some(item => item.name === exports.CCM_ROLE_SKILL_NAMES.taskDecomposition)
            && !groupWork.some(item => item.name === exports.CCM_ROLE_SKILL_NAMES.project),
        groupReviewGetsReviewAndReceipt: groupReview.some(item => item.name === exports.CCM_ROLE_SKILL_NAMES.deliveryReviewRework)
            && groupReview.some(item => item.name === exports.CCM_ROLE_SKILL_NAMES.receipt),
        contextualExecutionLoadsGroupSkill: contextualGroupWork[0]?.name === exports.CCM_ROLE_SKILL_NAMES.group,
        projectGetsSourceReceiptAndMatchedWorkflows: projectWork[0]?.name === exports.CCM_ROLE_SKILL_NAMES.project
            && projectWork.some(item => item.name === exports.CCM_ROLE_SKILL_NAMES.projectSourceResearch)
            && projectWork.some(item => item.name === exports.CCM_ROLE_SKILL_NAMES.receipt)
            && projectWork.some(item => item.name === exports.CCM_ROLE_SKILL_NAMES.documentDrivenDelivery)
            && projectWork.some(item => item.name === exports.CCM_ROLE_SKILL_NAMES.frontendVisualQa),
        incidentTaskGetsDiagnosis: incidentWork.some(item => item.name === exports.CCM_ROLE_SKILL_NAMES.incidentDiagnosis),
        releaseTaskGetsReadiness: releaseWork.some(item => item.name === exports.CCM_ROLE_SKILL_NAMES.releaseReadiness),
        testAgentGetsVerifierEvidenceAndVisualQa: testWork.some(item => item.name === exports.CCM_ROLE_SKILL_NAMES.test)
            && testWork.some(item => item.name === exports.CCM_ROLE_SKILL_NAMES.evidence)
            && testWork.some(item => item.name === exports.CCM_ROLE_SKILL_NAMES.frontendVisualQa),
        selectionBudgetBounded: [globalWork, groupWork, groupReview, projectWork, incidentWork, releaseWork, testWork].every(items => items.length <= 6),
        usageDirectiveRequiresApplicationAndReceipt: buildSelectedSkillUsageDirective(projectWork).includes("不是可选目录项")
            && buildSelectedSkillUsageDirective(projectWork).includes("CCM_AGENT_RECEIPT"),
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        selections: {
            ordinaryGlobal: ordinaryGlobal.map(item => item.name),
            ordinaryGroup: ordinaryGroup.map(item => item.name),
            globalWork: globalWork.map(item => item.name),
            groupWork: groupWork.map(item => item.name),
            groupReview: groupReview.map(item => item.name),
            contextualGroupWork: contextualGroupWork.map(item => item.name),
            projectWork: projectWork.map(item => item.name),
            incidentWork: incidentWork.map(item => item.name),
            releaseWork: releaseWork.map(item => item.name),
            testWork: testWork.map(item => item.name),
        },
        installation,
    };
}
//# sourceMappingURL=role-skills.js.map