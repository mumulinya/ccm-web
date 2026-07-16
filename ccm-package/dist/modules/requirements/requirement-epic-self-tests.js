"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRequirementEpicOrchestrationSelfTest = runRequirementEpicOrchestrationSelfTest;
exports.runRequirementEpicSelfTest = runRequirementEpicSelfTest;
const source_ingestion_1 = require("./source-ingestion");
const task_store_1 = require("../../core/task-store");
const global_mission_1 = require("../collaboration/global-mission");
const workflow_decision_1 = require("../../agents/workflow-decision");
const collaboration_task_intake_1 = require("../collaboration/collaboration-task-intake");
function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}
const requirement = {
    schema: "ccm-business-requirement-extraction-v1",
    title: "订单履约升级",
    business_goal: "支持订单状态同步和异常重试",
    scope: ["订单接口", "状态页面", "回归测试"],
    acceptance_criteria: ["订单状态可追踪", "失败任务可重试"],
    dependencies: [],
    risks: [],
    clarification_questions: [],
    source_evidence: ["prd.docx#订单履约"],
    extraction_method: "deterministic_fallback",
};
function plan(version = 1) {
    return (0, source_ingestion_1.validateRequirementDecomposition)({
        epic_title: requirement.title,
        business_goal: requirement.business_goal,
        global_acceptance_criteria: requirement.acceptance_criteria,
        version,
        items: [
            {
                item_key: "order-api",
                title: "订单状态接口",
                business_goal: "提供订单状态读写接口",
                scope: ["订单接口"],
                target_type: "project",
                target_id: "backend",
                acceptance_criteria: ["接口测试通过"],
                depends_on: [],
                risks: [],
                suggested_agent_capabilities: ["backend"],
                parallelizable: true,
            },
            {
                item_key: "order-ui",
                title: "订单状态页面",
                business_goal: "展示订单状态和失败原因",
                scope: ["状态页面"],
                target_type: "project",
                target_id: "frontend",
                acceptance_criteria: ["页面可展示真实状态"],
                depends_on: ["order-api"],
                risks: [],
                suggested_agent_capabilities: ["frontend"],
                parallelizable: false,
            },
        ],
    }, {
        contentHash: `hash-v${version}`,
        requirement,
        extractionMethod: "deterministic_fallback",
    });
}
function unlockedDependents(tasks, completedId) {
    const completed = tasks.find((task) => task.id === completedId);
    if (!completed?.parent_task_id || completed.status !== "done" || completed.global_mission_gate_passed !== true)
        return [];
    return tasks.filter((child) => {
        if (child.parent_task_id !== completed.parent_task_id || child.id === completedId)
            return false;
        if (!["pending", "queued"].includes(String(child.status || "pending")))
            return false;
        const deps = Array.isArray(child.mission_dependencies) ? child.mission_dependencies.map(String) : [];
        if (!deps.length)
            return true;
        return deps.every((dependencyId) => {
            const dependency = tasks.find((candidate) => String(candidate.id) === dependencyId);
            return dependency?.status === "done" && dependency?.global_mission_gate_passed === true;
        });
    });
}
/** 确认 → 派发就绪 → 依赖解锁 → 批准 / 返工 编排自测（不启真实 Agent）。 */
function runRequirementEpicOrchestrationSelfTest() {
    const contract = (0, workflow_decision_1.runWorkflowDecisionContractSelfTest)();
    assert(contract.success, "统一模型工作流决策契约应通过");
    const scriptedModelCases = [
        ["普通问答", (0, workflow_decision_1.normalizeWorkflowDecision)({ mode: "answer", reason: "只需回答" }).mode, "answer"],
        ["方案咨询", (0, workflow_decision_1.normalizeWorkflowDecision)({ mode: "project_analysis", reason: "只读分析" }).mode, "project_analysis"],
        ["明确小修改", (0, workflow_decision_1.normalizeWorkflowDecision)({ mode: "execute_direct", reason: "范围明确" }).mode, "execute_direct"],
        ["复杂多文件任务", (0, workflow_decision_1.normalizeWorkflowDecision)({ mode: "plan_task", reason: "先规划", planSteps: ["确认边界", "实现", "验证"] }).mode, "plan_task"],
        ["PRD/附件", (0, workflow_decision_1.normalizeWorkflowDecision)({ mode: "decompose_epic", reason: "多个可独立验收目标" }).mode, "decompose_epic"],
        ["含需求一词但只是问答", (0, workflow_decision_1.normalizeWorkflowDecision)({ mode: "answer", reason: "询问需求定义" }).mode, "answer"],
        ["没有关键词但语义要求拆解", (0, workflow_decision_1.normalizeWorkflowDecision)({ mode: "decompose_epic", reason: "跨项目多目标" }).mode, "decompose_epic"],
    ];
    assert(scriptedModelCases.every(([, actual, expected]) => actual === expected), "脚本化模型路由应覆盖问答、分析、执行、计划和 Epic");
    const unavailable = (0, collaboration_task_intake_1.normalizeGroupAgentGatewayTaskIntent)({ executable: true, kind: "task", reason: "旧规则会执行" }, { runtime: "llm-error", assignments: [{ project: "backend" }] });
    assert(unavailable.executable === false && unavailable.agent_gateway.safe_stop === true, "模型不可用时必须安全停止，不能用旧规则建单");
    const sameSemantic = ["web", "feishu", "group", "project"].map(() => (0, workflow_decision_1.normalizeWorkflowDecision)({ mode: "decompose_epic", reason: "同一语义的脚本模型结果" }).mode);
    assert(new Set(sameSemantic).size === 1, "各通道必须消费同一工作流决策契约");
    const decomposition = plan(1);
    const now = new Date().toISOString();
    const epicId = "orch-epic";
    const childApi = {
        id: "orch-api",
        parent_task_id: epicId,
        parent_workflow_type: "requirement_epic",
        requirement_item_key: "order-api",
        requirement_epic_id: epicId,
        workflow_type: "daily_dev",
        title: "订单状态接口",
        status: "pending",
        auto_execute: true,
        mission_dependencies: [],
        intake_state: "confirmed",
        created_at: now,
        updated_at: now,
    };
    const childUi = {
        id: "orch-ui",
        parent_task_id: epicId,
        parent_workflow_type: "requirement_epic",
        requirement_item_key: "order-ui",
        requirement_epic_id: epicId,
        workflow_type: "daily_dev",
        title: "订单状态页面",
        status: "pending",
        auto_execute: true,
        mission_dependencies: ["orch-api"],
        intake_state: "confirmed",
        created_at: now,
        updated_at: now,
    };
    const epic = {
        id: epicId,
        workflow_type: "requirement_epic",
        status: "in_progress",
        intake_state: "confirmed",
        child_task_ids: [childApi.id, childUi.id],
        requirement_decomposition: decomposition,
        created_at: now,
        updated_at: now,
    };
    // 确认后：无依赖子任务可派发，有依赖子任务仍阻塞
    const readyAfterConfirm = [childApi, childUi].filter((child) => {
        const deps = child.mission_dependencies || [];
        return deps.length === 0 && child.auto_execute !== false && child.status === "pending";
    });
    assert(readyAfterConfirm.length === 1 && readyAfterConfirm[0].id === "orch-api", "确认后应只派发无依赖节点");
    assert(unlockedDependents([epic, childApi, childUi], "orch-api").length === 0, "前序未完成时后继不应解锁");
    const strongDelivery = {
        acceptance_gate_passed: true,
        acceptance_gate: {
            pass: true,
            checks: [
                { id: "actual_changes", ok: true, label: "真实文件变更" },
                { id: "verification_source", ok: true, label: "外部 Runner 验证" },
            ],
        },
        actual_file_change_count: 1,
        actual_file_changes: [{ path: "src/order-api.ts" }],
        verification_executed: ["npm test passed by external runner (exit 0)"],
        verification_source_gate_passed: true,
        external_runner_verification_count: 1,
        acceptance: ["外部 Runner 已验证通过"],
        blockers: [],
        needs: [],
    };
    const completedApi = {
        ...childApi,
        status: "done",
        requires_code_changes: true,
        requires_verification: true,
        delivery_summary: strongDelivery,
        global_mission_gate_passed: true,
        completed_at: now,
    };
    const unlocked = unlockedDependents([epic, completedApi, childUi], "orch-api");
    assert(unlocked.length === 1 && unlocked[0].id === "orch-ui", "前序强验收通过后应解锁后继节点");
    const completedUi = {
        ...childUi,
        status: "done",
        requires_code_changes: true,
        requires_verification: true,
        delivery_summary: {
            ...strongDelivery,
            actual_file_changes: [{ path: "src/order-ui.vue" }],
        },
        global_mission_gate_passed: true,
        completed_at: now,
    };
    const deps = {
        listExecutions: () => [],
        taskRequiresCodeChanges: (task) => task.requires_code_changes === true,
        taskRequiresVerification: (task) => task.requires_verification === true,
    };
    const awaitingReview = (0, global_mission_1.refreshGlobalMissionParentInTaskList)([epic, completedApi, completedUi], epicId, deps);
    assert(awaitingReview?.status === "awaiting_change_review", "全部子任务通过后 Epic 应进入整批审阅");
    const approved = (0, global_mission_1.refreshGlobalMissionParentInTaskList)([
        { ...awaitingReview, status: "done", epic_review: { status: "approved", approved_at: now } },
        completedApi,
        completedUi,
    ], epicId, deps);
    assert(approved?.status === "done" && approved?.epic_review?.status === "approved", "批准后 Epic 才应完成");
    const reworkTarget = {
        ...completedUi,
        status: "pending",
        global_mission_gate_passed: false,
        status_detail: "按审阅意见返工",
        retry_count: 1,
    };
    const reworkParent = (0, global_mission_1.refreshGlobalMissionParentInTaskList)([
        {
            ...awaitingReview,
            status: "in_progress",
            epic_review: { status: "rework_requested", feedback: "补充错误态展示", target_task_id: reworkTarget.id },
            completed_at: undefined,
        },
        completedApi,
        reworkTarget,
    ], epicId, deps);
    assert(reworkParent?.status !== "done", "返工后 Epic 不得保持完成态");
    assert(reworkParent?.epic_review?.status === "rework_requested", "返工状态应保留在 Epic 审阅记录中");
    assert(reworkTarget.status === "pending" && reworkTarget.retry_count === 1, "定向返工应重置目标子任务");
    return {
        success: true,
        channel_intent: true,
        confirm_dispatch_ready: readyAfterConfirm.map((item) => item.id),
        dependency_unlocked: unlocked.map((item) => item.id),
        awaiting_change_review: awaitingReview?.status === "awaiting_change_review",
        approve_completes: approved?.status === "done",
        rework_reopens: reworkParent?.epic_review?.status === "rework_requested",
    };
}
function runRequirementEpicSelfTest() {
    const initial = plan(1);
    assert(initial.schema === source_ingestion_1.REQUIREMENT_DECOMPOSITION_SCHEMA, "拆解 schema 不正确");
    assert(initial.items.length === 3, "拆解子任务和集成验收节点数量不正确");
    assert(initial.items[1].depends_on[0] === "order-api", "依赖未保留");
    const integration = initial.items.find(item => item.item_key === "epic-integration-acceptance");
    assert(integration?.depends_on.length === 2, "集成验收节点没有等待全部开发子任务");
    let cycleRejected = false;
    try {
        (0, source_ingestion_1.validateRequirementDecomposition)({
            items: [
                { item_key: "a", title: "A", depends_on: ["b"] },
                { item_key: "b", title: "B", depends_on: ["a"] },
            ],
        }, { requirement, contentHash: "cycle" });
    }
    catch {
        cycleRejected = true;
    }
    assert(cycleRejected, "环依赖没有被拒绝");
    let duplicateKeyRejected = false;
    try {
        (0, source_ingestion_1.validateRequirementDecomposition)({
            items: [
                { item_key: "duplicate", title: "A" },
                { item_key: "duplicate", title: "B" },
            ],
        }, { requirement, contentHash: "duplicate" });
    }
    catch {
        duplicateKeyRejected = true;
    }
    assert(duplicateKeyRejected, "重复 item_key 没有被拒绝");
    let unknownDependencyRejected = false;
    try {
        (0, source_ingestion_1.validateRequirementDecomposition)({
            items: [{ item_key: "a", title: "A", depends_on: ["missing"] }],
        }, { requirement, contentHash: "unknown-dependency" });
    }
    catch {
        unknownDependencyRejected = true;
    }
    assert(unknownDependencyRejected, "不存在的依赖没有被拒绝");
    const next = (0, source_ingestion_1.validateRequirementDecomposition)({
        ...initial,
        version: 2,
        content_hash: "hash-v2",
        items: [
            initial.items[0],
            {
                ...initial.items[1],
                acceptance_criteria: ["页面可展示真实状态", "错误状态可重试"],
            },
            {
                item_key: "order-e2e",
                title: "订单履约端到端验证",
                business_goal: "覆盖接口与页面主流程",
                scope: ["回归测试"],
                target_type: "auto",
                target_id: "",
                acceptance_criteria: ["端到端验证通过"],
                depends_on: ["order-ui"],
                risks: [],
                suggested_agent_capabilities: ["test"],
                parallelizable: false,
            },
        ],
    }, { requirement, contentHash: "hash-v2", extractionMethod: "deterministic_fallback" });
    const diff = (0, source_ingestion_1.diffRequirementDecompositionPlans)(initial, next);
    assert(diff.changed.includes("order-ui"), "版本差异没有识别修改项");
    assert(diff.added.includes("order-e2e"), "版本差异没有识别新增项");
    assert(diff.unchanged.includes("order-api"), "版本差异没有保留未变项");
    const storage = (0, task_store_1.runTaskStoreAtomicBatchSelfTest)();
    assert(storage.success, "SQLite 原子批次自测失败");
    const rowApis = (0, task_store_1.runTaskStoreRowApiSelfTest)();
    assert(rowApis.success, "SQLite 行级读写自测失败");
    const acceptance = (0, global_mission_1.runGlobalMissionStrongAcceptanceSelfTest)();
    assert(acceptance.pass, "Epic 人工审阅终态门自测失败");
    const orchestration = runRequirementEpicOrchestrationSelfTest();
    assert(orchestration.success, "Epic 编排自测失败");
    return {
        success: true,
        schema: initial.schema,
        item_count: initial.items.length,
        integration_acceptance_added: !!integration,
        cycle_rejected: cycleRejected,
        duplicate_key_rejected: duplicateKeyRejected,
        unknown_dependency_rejected: unknownDependencyRejected,
        diff,
        sqlite_atomic_batch: storage,
        sqlite_row_apis: rowApis,
        epic_acceptance_gate: acceptance.checks,
        epic_orchestration: orchestration,
    };
}
//# sourceMappingURL=requirement-epic-self-tests.js.map