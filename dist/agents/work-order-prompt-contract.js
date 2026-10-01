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
exports.CCM_WORK_ORDER_PROMPTS = exports.CCM_REWORK_WORK_ORDER_PROMPT_VERSION = exports.CCM_TEST_AGENT_WORK_ORDER_PROMPT_VERSION = exports.CCM_PROJECT_WORK_ORDER_PROMPT_VERSION = exports.CCM_PLAN_PROMPT_VERSION = void 0;
exports.validatePlanPromptInput = validatePlanPromptInput;
exports.buildProjectWorkOrderV3 = buildProjectWorkOrderV3;
exports.buildTestAgentWorkOrderV3 = buildTestAgentWorkOrderV3;
exports.buildReworkWorkOrderV3 = buildReworkWorkOrderV3;
exports.validateWorkOrderV3 = validateWorkOrderV3;
exports.runWorkOrderPromptContractSelfTest = runWorkOrderPromptContractSelfTest;
const crypto = __importStar(require("crypto"));
/** Stable, versioned instructions. Dynamic task data must never be interpolated here. */
exports.CCM_PLAN_PROMPT_VERSION = "2026-09-05.plan-v3";
exports.CCM_PROJECT_WORK_ORDER_PROMPT_VERSION = "2026-09-05.project-work-order-v3";
exports.CCM_TEST_AGENT_WORK_ORDER_PROMPT_VERSION = "2026-09-05.test-agent-v3";
exports.CCM_REWORK_WORK_ORDER_PROMPT_VERSION = "2026-09-05.rework-v3";
exports.CCM_WORK_ORDER_PROMPTS = {
    plan: `进入只读规划模式。只使用已读取的源码、配置和测试证据；明确目标、范围、排除项、依赖、风险和可观察验收标准。不得猜测路径、符号、成员、命令或完成状态。输出 ccm-implementation-plan-v3 结构，不承担权限判断。`,
    project: `执行自包含项目工作单。只修改允许路径，遵守禁止范围和依赖；每一步绑定验收标准并留下可复核证据。不得扩大项目范围、代替 TestAgent 验收或把推测写成事实。`,
    test: `以独立只读 TestAgent 验收。只检查工作单允许范围和实际变更，执行指定验证；每条标准返回 passed、failed 或 blocked，并附 Evidence ID、命令、退出码和风险。不得修改业务代码或依据开发者自报判定通过。`,
    rework: `依据失败验收证据生成增量返工单。沿用原 taskId 和 workItemId，仅递增 attempt，严格限制修复范围和重新验证命令；相同失败证据不得无限重复派发。`,
};
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).sort().reduce((o, k) => { o[k] = stable(value[k]); return o; }, {});
}
function checksum(value) { return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex"); }
function str(v) { return String(v ?? "").trim(); }
function arr(v) { return Array.isArray(v) ? v.map(str).filter(Boolean) : []; }
function validatePlanPromptInput(plan) {
    const issues = [];
    if (!str(plan?.goal))
        issues.push("缺少业务目标");
    if (!arr(plan?.scope).length)
        issues.push("缺少负责范围");
    if (!Array.isArray(plan?.steps) || !plan.steps.length)
        issues.push("缺少实施步骤");
    if (!Array.isArray(plan?.acceptanceCriteria) || !plan.acceptanceCriteria.length)
        issues.push("缺少验收标准");
    if (arr(plan?.scope).some(p => /(^|[\\/])\.\.([\\/]|$)/.test(p)))
        issues.push("范围包含路径穿越");
    return { valid: !issues.length, issues };
}
function buildProjectWorkOrderV3(input) {
    const steps = Array.isArray(input?.plan?.steps) ? input.plan.steps : [];
    const selected = steps.filter((s) => arr(s.projects).includes(str(input.projectId)) || str(s.project) === str(input.projectId));
    const step = selected[0] || steps[0] || {};
    const acceptance = Array.isArray(step.acceptance) ? step.acceptance.map(str).filter(Boolean) : [];
    const fixtures = Array.isArray(input.synchronizedFixturePaths) ? input.synchronizedFixturePaths.map((item) => ({ path: str(item?.path), allowedChanges: arr(item?.allowedChanges || item?.allowed_changes) })).filter((item) => item.path) : [];
    const base = { schema: "ccm-project-work-order-v3", taskId: str(input.taskId), workItemId: str(input.workItemId), projectId: str(input.projectId), planId: str(input.plan?.planId), planRevision: Number(input.plan?.revision || 0), attempt: Number(input.attempt || 1), goal: str(input.plan?.goal), objective: str(step.objective || step.title), allowedPaths: arr(input.allowedPaths || step.files), editablePaths: arr(input.editablePaths || input.allowedPaths || step.files), readOnlyPaths: arr(input.readOnlyPaths), cleanupPaths: arr(input.cleanupPaths), synchronizedFixturePaths: fixtures, forbiddenScope: arr(input.forbiddenScope || step.forbiddenPaths), dependsOn: arr(step.dependsOn), acceptanceCriterionIds: arr(step.acceptanceCriterionIds), acceptance, verification: Array.isArray(input.verification) ? input.verification : (Array.isArray(input.plan?.verification) ? input.plan.verification : []), identity: input.identity && typeof input.identity === "object" ? input.identity : {}, planChecksum: str(input.plan?.checksum), promptVersion: exports.CCM_PROJECT_WORK_ORDER_PROMPT_VERSION, contentStored: false };
    return { ...base, checksum: checksum(base) };
}
function buildTestAgentWorkOrderV3(input) {
    const base = { schema: "ccm-test-agent-work-order-v3", taskId: str(input.taskId), workItemId: str(input.workItemId), originalGoal: str(input.originalGoal), projectId: str(input.projectId), planChecksum: str(input.planChecksum), workOrderChecksum: str(input.workOrderChecksum), changedFiles: arr(input.changedFiles), acceptanceCriterionIds: arr(input.acceptanceCriterionIds), verification: Array.isArray(input.verification) ? input.verification : [], readOnly: true, reviewCycle: Number(input.reviewCycle || 1), attempt: Number(input.attempt || 1), promptVersion: exports.CCM_TEST_AGENT_WORK_ORDER_PROMPT_VERSION, contentStored: false };
    return { ...base, checksum: checksum(base) };
}
function buildReworkWorkOrderV3(input) {
    const base = { schema: "ccm-rework-work-order-v3", taskId: str(input.taskId), workItemId: str(input.workItemId), attempt: Math.max(1, Number(input.attempt || 1) + 1), failedCriterionIds: arr(input.failedCriterionIds), evidence: Array.isArray(input.evidence) ? input.evidence : [], allowedPaths: arr(input.allowedPaths), forbiddenScope: arr(input.forbiddenScope), verification: Array.isArray(input.verification) ? input.verification : [], promptVersion: exports.CCM_REWORK_WORK_ORDER_PROMPT_VERSION, contentStored: false };
    return { ...base, checksum: checksum(base) };
}
function validateWorkOrderV3(order) {
    const issues = [];
    if (!/^ccm-(project-work-order|test-agent-work-order|rework-work-order)-v3$/.test(str(order?.schema)))
        issues.push("工作单 schema 无效");
    if (!str(order?.taskId) || !str(order?.workItemId))
        issues.push("缺少任务身份");
    if (order?.schema === "ccm-test-agent-work-order-v3" && order.readOnly !== true)
        issues.push("TestAgent 工单必须只读");
    if (order?.contentStored !== false)
        issues.push("工作单不得声明保存正文");
    return { valid: !issues.length, issues };
}
function runWorkOrderPromptContractSelfTest() {
    const plan = { planId: "p", revision: 1, goal: "抽象目标", scope: ["app"], steps: [{ projects: ["app"], objective: "实现", acceptance: ["可验证"] }], acceptanceCriteria: ["可验证"], checksum: "p" };
    const project = buildProjectWorkOrderV3({ taskId: "t", workItemId: "w", projectId: "app", plan });
    const test = buildTestAgentWorkOrderV3({ taskId: "t", workItemId: "w", originalGoal: plan.goal, projectId: "app", planChecksum: "p", workOrderChecksum: project.checksum, acceptanceCriterionIds: ["AC-1"] });
    const rework = buildReworkWorkOrderV3({ taskId: "t", workItemId: "w", attempt: 1, failedCriterionIds: ["AC-1"] });
    if (!validatePlanPromptInput(plan).valid || !validateWorkOrderV3(project).valid || !validateWorkOrderV3(test).valid || rework.attempt !== 2)
        throw new Error("work-order prompt contract self-test failed");
    return true;
}
//# sourceMappingURL=work-order-prompt-contract.js.map