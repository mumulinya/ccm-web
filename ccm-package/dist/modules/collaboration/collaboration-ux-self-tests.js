"use strict";
// Extracted functional module. The original entry remains a compatibility facade.
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
exports.runCollaborationUxSelfTest = runCollaborationUxSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const memory_1 = require("./memory");
const task_delivery_report_1 = require("./task-delivery-report");
const agent_notifications_1 = require("./agent-notifications");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const protocol_gates_1 = require("./protocol-gates");
const worker_handoff_1 = require("../../agents/worker-handoff");
const work_items_1 = require("../../agents/work-items");
const collaboration_1 = require("./collaboration");
function runCollaborationUxSelfTest() {
    const task = {
        id: "ux-task",
        title: "增加负责人筛选",
        business_goal: "给工单页面增加负责人筛选",
        workflow_type: "daily_dev",
        assign_type: "group",
        requires_code_changes: true,
        requires_verification: true,
        status: "done",
        trace_id: "trace-ux",
        workflow_meta: {
            plan_mode: {
                title: "执行前计划",
                mode: "cc-style-plan-mode",
                requires_confirmation: false,
                auto_continue: true,
                risk: { level: "low", summary: "只改负责人筛选相关页面和接口", reasons: ["范围清晰"] },
                impact_scope: { projects: ["collab-web"], areas: ["负责人筛选"], file_hints: ["frontend/app.js", "backend/server.js"], multi_agent: false },
                read_only_exploration: { summary: "已确认筛选入口和后端接口位置", projects: ["collab-web"], knowledge_used: true, code_snapshot_used: true },
                steps: [
                    { id: "understand_goal", label: "理解需求与验收目标", detail: "确认负责人筛选的页面入口和接口契约。", status: "completed" },
                    { id: "dispatch_sub_agents", label: "派发子 Agent 工作单", detail: "交给 collab-web 修改页面和接口。", status: "completed" },
                    { id: "verify_and_summarize", label: "验收结果并总结给用户", detail: "核对文件变更和 npm test 结果。", status: "completed" },
                ],
                acceptance: ["负责人筛选文件改动可查看", "npm test 必须通过", "子 Agent 必须提交结构化结果说明"],
                permission_boundaries: ["不要修改无关页面", "不要编造未执行的验证结果"],
            },
        },
        delivery_summary: {
            headline: "负责人筛选已完成",
            actual_file_change_count: 2,
            actual_file_changes: [{ path: "frontend/app.js" }, { path: "backend/server.js" }],
            verification_executed: ["npm test passed by external runner (exit 0)"],
            external_runner_verification_count: 1,
            verification_source_gate_passed: true,
            coordination_plan_count: 1,
            assignment_count: 1,
            worker_notification_count: 1,
            assignment_evidence: [{ project: "collab-web", task: "给工单页面增加负责人筛选", reason: "前端页面变更" }],
            worker_notifications: [{ task_id: "collab-web", status: "completed", summary: "已修改负责人筛选并运行 npm test" }],
            has_final_review: true,
            review_status: "complete",
            acceptance_gate_passed: true,
            receipt_statuses: [{ agent: "collab-web", status: "done", summary: "raw receipt should stay technical" }],
            ack_gate_passed: true,
            ack_review: { status: "approved", rejected: [], rows: [{ agent: "collab-web", status: "approved", reason: "ACK 目标和范围清晰" }] },
            receipts: [{
                    agent: "collab-web",
                    status: "done",
                    summary: "已完成负责人筛选并同步接口字段 GET /api/users?role=owner",
                    actions: ["修改筛选组件", "同步接口字段 GET /api/users?role=owner"],
                    filesChanged: ["frontend/app.js", "backend/server.js"],
                    verification: ["npm test passed by external runner (exit 0)"],
                    ack: {
                        understoodGoal: "给工单页面增加负责人筛选",
                        plannedScope: ["frontend/app.js", "backend/server.js"],
                        forbiddenScope: ["不改无关页面"],
                        verificationPlan: ["npm test"],
                        unclear: [],
                    },
                    contractChanges: [{
                            type: "api",
                            endpoint: "GET /api/users?role=owner",
                            response: "返回可筛选负责人列表",
                            consumers: ["collab-web"],
                            note: "负责人筛选使用该接口字段",
                        }],
                    blockers: [],
                    needs: [],
                    memoryUsed: ["项目记忆：筛选页面结构"],
                }],
            timeline: [
                { id: "tl-plan", type: "coordinator_plan", title: "主 Agent 生成计划", status: "ok", phase: "planning", agent: "coordinator" },
                { id: "tl-conflict", type: "conflict_plan", title: "跨 Agent 冲突保护", detail: "检测到前后端可能同时修改 shared/types.ts", status: "warn", phase: "planning", data: { conflicts: [{ projects: ["frontend", "backend"], reason: "可能同时修改共享类型", scopes: ["shared/types.ts"] }] } },
                { id: "tl-handoff", type: "worker_handoff_ready", title: "collab-web 工作单已补齐", detail: "目标、范围、边界、验收、ACK 和回执要求已打包给子 Agent", status: "ok", phase: "dispatching", agent: "collab-web" },
                { id: "tl-qa", type: "agent_qa_question", title: "frontend 向 backend 提问", detail: "确认筛选字段", status: "active", phase: "executing", agent: "frontend" },
                { id: "tl-review", type: "coordinator_review", title: "主 Agent 验收", status: "ok", phase: "reviewing", agent: "coordinator" },
            ],
            agent_qa: [{
                    id: "qa-ux",
                    from_agent: "frontend",
                    to_agent: "backend",
                    question: "负责人字段叫什么？",
                    answer: "ownerId",
                    status: "resumed",
                    execution_id: "exec-qa-ux",
                    routing: { strategy: "capability_and_load" },
                    answer_evidence: ["trace_id=qa-visible-should-stay-technical"],
                    acceptance: { accepted: true, score: 92, status: "accepted" },
                }],
        },
    };
    const card = (0, collaboration_1.buildTaskCardView)(task, [{ id: "exec-ux", project: "collab-web", state: "succeeded", checkpointIds: ["checkpoint-ux"] }], []);
    const failedCard = (0, collaboration_1.buildTaskCardView)({ ...task, status: "failed", delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false } }, [], []);
    const missingEvidenceCard = (0, collaboration_1.buildTaskCardView)({ ...task, status: "in_progress", delivery_summary: { headline: "等待证据", assignment_count: 1, assignment_evidence: [{ project: "collab-web", task: "给工单页面增加负责人筛选" }], receipt_statuses: [] } }, [], []);
    const weakAcceptanceOnlyTask = {
        ...task,
        status: "done",
        status_detail: "旧摘要声称任务完成",
        delivery_summary: {
            headline: "旧摘要声称已完成",
            acceptance_gate_passed: true,
            acceptance: ["验收结论：已通过"],
            delivery_report: {
                schema: "ccm-main-agent-delivery-report-v1",
                status: "done",
                headline: "旧摘要声称已完成",
                acceptance: ["验收结论：已通过"],
                verification_evidence: { status: "ready", items: [] },
            },
        },
    };
    const weakAcceptanceOnlyLifecycle = (0, collaboration_1.deriveTaskLifecycle)(weakAcceptanceOnlyTask, []);
    const weakAcceptanceOnlyCard = (0, collaboration_1.buildTaskCardView)(weakAcceptanceOnlyTask, [], []);
    const sessionProgressCard = (0, collaboration_1.buildTaskCardView)({
        ...task,
        status: "in_progress",
        delivery_summary: {
            headline: "等待执行成员执行中",
            assignment_count: 1,
            assignment_evidence: [{ project: "collab-web", task: "给工单页面增加负责人筛选" }],
            receipt_statuses: [],
        },
    }, [], [{
            id: "tas-visible-should-stay-technical",
            taskId: "ux-task",
            groupId: "ux-group",
            project: "collab-web",
            agentType: "cursor",
            nativeSessionId: "cursor-session-should-not-show",
            resumeMode: "native",
            status: "open",
            turnCount: 2,
            lastTurnSucceeded: true,
            createdAt: "2026-07-07T00:00:00.000Z",
            lastUsedAt: "2026-07-07T00:02:00.000Z",
        }]);
    const memoryGateGapDelivery = {
        ...task.delivery_summary,
        acceptance_gate_passed: false,
        memory_dispatch_gates: [{
                gate_id: "gmd_ux_gate",
                schema: "ccm-child-agent-memory-dispatch-freshness-gate-v1",
                group_id: "ux-group",
                target_project: "collab-web",
                status: "fresh",
                action: "use_or_ignore",
            }],
        memory_dispatch_gate_count: 1,
        memory_gate_receipt_passed: false,
        memory_gate_receipt_rows: [{
                agent: "collab-web",
                status: "done",
                score: 70,
                grade: "partial",
                pass: false,
                missing: ["引用记忆派发 gate"],
                memory_gate: {
                    required: true,
                    pass: false,
                    gate_ids: ["gmd_ux_gate"],
                    missing_gate_ids: ["gmd_ux_gate"],
                    declared: false,
                    used: [],
                    ignored: [],
                },
            }],
        receipts: [{
                ...task.delivery_summary.receipts[0],
                memoryUsed: ["项目记忆：筛选页面结构"],
                memoryIgnored: [],
            }],
    };
    const memoryGateGapCard = (0, collaboration_1.buildTaskCardView)({ ...task, status: "in_progress", delivery_summary: memoryGateGapDelivery }, [], []);
    const reinjectionGateGapDelivery = {
        ...task.delivery_summary,
        acceptance_gate_passed: false,
        post_compact_reinjection_gates: [{
                gate_id: "pcrg_ux_gate",
                schema: "ccm-child-agent-post-compact-reinjection-gate-v1",
                group_id: "ux-group",
                target_project: "collab-web",
                status: "required",
                action: "review_reinjection_candidates_before_execution",
                candidate_count: 2,
                candidates: [
                    { kind: "file", value: "frontend/legacy-filter.js", sourceMessageId: "ux-old-1" },
                    { kind: "verification", value: "npm test", sourceMessageId: "ux-old-2" },
                ],
            }],
        post_compact_reinjection_gate_count: 1,
        post_compact_reinjection_gate_receipt_passed: false,
        post_compact_reinjection_gate_receipt_rows: [{
                agent: "collab-web",
                status: "done",
                score: 70,
                grade: "partial",
                pass: false,
                missing: ["引用压缩后重注入 gate"],
                post_compact_reinjection_gate: {
                    required: true,
                    pass: false,
                    gate_ids: ["pcrg_ux_gate"],
                    missing_gate_ids: ["pcrg_ux_gate"],
                    candidate_count: 2,
                    declared: false,
                    used: [],
                    ignored: [],
                },
            }],
        receipts: [{
                ...task.delivery_summary.receipts[0],
                memoryUsed: ["使用压缩前线索 frontend/legacy-filter.js"],
                memoryIgnored: [],
            }],
    };
    const reinjectionGateGapCard = (0, collaboration_1.buildTaskCardView)({ ...task, status: "in_progress", delivery_summary: reinjectionGateGapDelivery }, [], []);
    const reinjectionUsageGapDelivery = {
        ...task.delivery_summary,
        acceptance_gate_passed: false,
        post_compact_reinjection_gates: [{
                gate_id: "pcrg_ux_usage_gate",
                schema: "ccm-child-agent-post-compact-reinjection-gate-v1",
                group_id: "ux-group",
                target_project: "collab-web",
                status: "required",
                action: "review_reinjection_candidates_before_execution",
                candidate_count: 2,
                candidates: [
                    { candidate_id: "pcrc_ux_file", kind: "file", value: "frontend/legacy-filter.js", sourceMessageId: "ux-old-1" },
                    { candidate_id: "pcrc_ux_test", kind: "verification", value: "npm test", sourceMessageId: "ux-old-2" },
                ],
            }],
        post_compact_reinjection_gate_count: 1,
        post_compact_reinjection_gate_receipt_passed: false,
        post_compact_reinjection_gate_receipt_rows: [{
                agent: "collab-web",
                status: "done",
                score: 70,
                grade: "partial",
                pass: false,
                missing: ["声明候选使用状态"],
                post_compact_reinjection_gate: {
                    required: true,
                    pass: false,
                    gate_ids: ["pcrg_ux_usage_gate"],
                    missing_gate_ids: [],
                    candidate_count: 2,
                    candidate_reference_required: true,
                    candidate_reference_passed: true,
                    candidate_usage_required: true,
                    candidate_usage_declared_passed: false,
                    referenced_candidate_ids: ["pcrc_ux_file"],
                    missing_candidate_reference_gate_ids: [],
                    missing_candidate_usage_gate_ids: ["pcrg_ux_usage_gate"],
                    missing_candidate_usage_candidate_ids: ["pcrc_ux_file", "pcrc_ux_test"],
                    candidate_usage_counts: { used: 0, ignored: 0, verified: 0, mentioned: 1, unreferenced: 1 },
                    mentioned_only_candidate_ids: ["pcrc_ux_file"],
                    unreferenced_candidate_ids: ["pcrc_ux_test"],
                    declared: true,
                    used: ["压缩前重注入候选 candidate_id=pcrc_ux_file；frontend/legacy-filter.js；reinjection_gate_id=pcrg_ux_usage_gate"],
                    ignored: [],
                },
            }],
        receipts: [{
                ...task.delivery_summary.receipts[0],
                memoryUsed: ["压缩前重注入候选 candidate_id=pcrc_ux_file；frontend/legacy-filter.js；reinjection_gate_id=pcrg_ux_usage_gate"],
                memoryIgnored: [],
            }],
    };
    const reinjectionUsageGapCard = (0, collaboration_1.buildTaskCardView)({ ...task, status: "in_progress", delivery_summary: reinjectionUsageGapDelivery }, [], []);
    const handoffOnlyDelivery = {
        ...task.delivery_summary,
        headline: "子 Agent 只提交了建议",
        acceptance_gate_passed: false,
        actual_file_change_count: 0,
        actual_file_changes: [],
        verification_executed: [],
        external_runner_verification_count: 0,
        verification_source_gate_passed: false,
        worker_notifications: [{ task_id: "collab-web", status: "completed", summary: "建议主 Agent 修改 LoginStore.vue，未实际修改文件" }],
        receipt_statuses: [{ agent: "collab-web", status: "done", summary: "建议主 Agent 修改 LoginStore.vue，未实际修改文件，也未执行验证。" }],
        receipts: [{
                agent: "collab-web",
                status: "done",
                summary: "建议主 Agent 修改 LoginStore.vue，未实际修改文件，也未执行验证。",
                actions: ["只整理实现方案，建议主 Agent 修改 LoginStore.vue"],
                filesChanged: ["未实际修改文件"],
                verification: ["建议运行 npm test，未执行"],
                ack: {
                    understoodGoal: "给工单页面增加负责人筛选",
                    plannedScope: ["frontend/app.js"],
                    forbiddenScope: ["不改无关页面"],
                    verificationPlan: ["npm test"],
                    unclear: [],
                },
                blockers: [],
                needs: ["需要主 Agent 实际修改并验证"],
                memoryUsed: ["项目记忆：筛选页面结构"],
            }],
    };
    const handoffOnlyCard = (0, collaboration_1.buildTaskCardView)({ ...task, status: "in_progress", delivery_summary: handoffOnlyDelivery }, [], []);
    const activeCard = (0, collaboration_1.buildTaskCardView)({ ...task, status: "in_progress", delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false } }, [], []);
    const reviewingCard = (0, collaboration_1.buildTaskCardView)({ ...task, status: "in_progress", delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false } }, [{ id: "exec-review", project: "collab-web", state: "reviewing" }], []);
    const reworkingCard = (0, collaboration_1.buildTaskCardView)({ ...task, status: "in_progress", collaboration_state: { phase: "reworking" }, delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false } }, [], []);
    const receiptResolvedCard = (0, collaboration_1.buildTaskCardView)({
        ...task,
        status: "in_progress",
        collaboration_state: {
            phase: "reviewing",
            last_continuation: {
                source: "user_targeted_rework",
                at: new Date().toISOString(),
                rework_kind: "weak_receipt",
                target: "collab-web",
                reason: "缺少已执行验证，要求补充高质量结果说明",
                status: "accepted",
            },
        },
        delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false },
    }, [], []);
    const continuationCard = (0, collaboration_1.buildTaskCardView)({
        ...task,
        status: "pending",
        collaboration_state: {
            phase: "reworking",
            last_continuation: {
                source: "user_next_work_item",
                at: new Date().toISOString(),
                rework_kind: "next_claimable_work_item",
                target: "collab-web",
                reason: "补齐负责人筛选验证",
                status: "accepted",
            },
        },
        delivery_summary: {
            ...task.delivery_summary,
            acceptance_gate_passed: false,
            timeline: [
                ...(Array.isArray(task.delivery_summary.timeline) ? task.delivery_summary.timeline : []),
                { id: "tl-next-work-item", type: "next_work_item_dispatch", title: "下一步派发已接上", detail: "补齐负责人筛选验证", status: "active", phase: "rework", agent: "collab-web" },
            ],
        },
    }, [], []);
    const goalRevisionContinuationCard = (0, collaboration_1.buildTaskCardView)({
        ...task,
        status: "in_progress",
        collaboration_state: {
            phase: "reworking",
            last_continuation: {
                source: "group_chat_followup",
                at: new Date().toISOString(),
                kind: "revise_goal",
                reason: "先保留旧支付表，只新增兼容字段。",
                status: "interrupting",
                replan_required: true,
                interrupt_current_run: true,
            },
            goal_revision_interruption: {
                requested: true,
                requested_at: new Date().toISOString(),
                reason: "先保留旧支付表，只新增兼容字段。",
                source: "group_chat_followup",
                followup_revision: 1,
            },
        },
        delivery_summary: {
            ...task.delivery_summary,
            acceptance_gate_passed: false,
            timeline: [
                ...(Array.isArray(task.delivery_summary.timeline) ? task.delivery_summary.timeline : []),
                { id: "tl-goal-revision", type: "task_goal_revision", title: "目标调整已接收", detail: "先保留旧支付表，只新增兼容字段。", status: "active", phase: "rework", agent: "coordinator" },
            ],
        },
    }, [], []);
    const revertedCard = (0, collaboration_1.buildTaskCardView)({ ...task, status: "cancelled", rolled_back_at: new Date().toISOString() }, [], []);
    const recoveryBaseTask = {
        ...task,
        id: "recovery-task",
        status: "pending",
        acceptance_criteria: "负责人筛选完成后必须有文件变更、npm test 和主 Agent 验收",
        recovery: {
            revalidated_at: new Date().toISOString(),
            previous_status: "in_progress",
            mode: "startup_auto_recovery",
            lease_recovery_count: 1,
            decision_code: "authorized_incomplete_task",
            decision_reason: "已确认并入队的未完成任务",
            authorization_preserved: true,
            authorization_evidence: ["intake_confirmed", "queued_at", "started_at"],
            requires_user: false,
            user_headline: "服务重启后，我已自动接上这轮任务，并重新核对目标、当前状态和验收条件。",
            user_next_action: "我会沿用原计划和执行上下文继续推进，完成后再给你最终总结。",
        },
        execution_lease: { recovery_count: 1 },
        delivery_summary: {
            ...task.delivery_summary,
            acceptance_gate_passed: false,
            acceptance_gate: { failed_checks: [{ id: "verification", label: "已执行验证" }] },
        },
        work_items: [{
                id: "wi-recovery-web",
                target: "collab-web",
                owner: "collab-web",
                subject: "恢复后继续补齐负责人筛选验证",
                status: "pending",
                attempt: 2,
            }],
    };
    const recoveryReasoning = (0, collaboration_1.buildTaskPreflightReasoning)(recoveryBaseTask, "服务启动恢复：重新核对原始目标、当前代码状态、剩余缺口与验收条件", true);
    const recoveryCard = (0, collaboration_1.buildTaskCardView)({ ...recoveryBaseTask, reasoning_loop: recoveryReasoning }, [], []);
    const liveCheckpointStageCard = (0, collaboration_1.buildTaskCardView)({
        ...task,
        status: "in_progress",
        delivery_summary: {
            ...task.delivery_summary,
            acceptance_gate_passed: false,
            timeline: [
                { id: "tl-live-revision", type: "plan_mode_revision_requested", title: "用户要求调整执行前计划", detail: "先保留旧接口兼容", status: "warn", phase: "planning", agent: "coordinator" },
                { id: "tl-live-recovery", type: "reasoning_recovery_check", title: "恢复前已重新核对任务", detail: "目标、状态与验收条件已重新核对", status: "ok", phase: "planning", agent: "coordinator" },
                { id: "tl-live-receipt", type: "child_agent_receipt", title: "collab-web 提交结果说明", detail: "已完成页面改动并运行验证", status: "ok", phase: "executing", agent: "collab-web" },
                { id: "tl-live-rework", type: "targeted_rework", title: "精准返工已接上", detail: "补齐 npm test 证据", status: "active", phase: "rework", agent: "collab-web" },
                { id: "tl-live-gate", type: "acceptance_gate", title: "代码变更验收门禁", detail: "1 项未通过，等待补齐验证", status: "warn", phase: "reviewing", agent: "coordinator" },
                { id: "tl-live-supervisor", type: "global_supervisor_rework", title: "我已安排子任务返工", detail: "已按交付缺口重派 collab-web", status: "active", phase: "rework", agent: "global-agent" },
            ],
        },
    }, [], []);
    const liveCheckpointCompletedCard = (0, collaboration_1.buildTaskCardView)({
        ...task,
        status: "in_progress",
        workflow_type: "global_mission",
        delivery_summary: {
            ...task.delivery_summary,
            acceptance_gate_passed: false,
            timeline: [
                { id: "tl-live-supervisor-cycle", type: "global_supervisor_cycle", title: "我已检查子任务进展", detail: "已检查 2 个子任务", status: "active", phase: "supervising", agent: "global-agent" },
                { id: "tl-live-supervisor-done", type: "global_supervisor_completed", title: "我已确认全部子任务通过", detail: "所有子任务交付验收已通过", status: "ok", phase: "completed", agent: "global-agent" },
            ],
        },
    }, [], []);
    const greetingCard = (0, collaboration_1.buildTaskCardView)({ id: "hello-task", title: "你好", business_goal: "你好", status: "pending", workflow_meta: { intake: { task_intent: { executable: false } } } }, [], []);
    const highRiskPlan = (0, collaboration_1.classifyPlanModeRisk)("删除旧订单表并上线新的支付权限", { members: [{ role: "coordinator", project: "api" }, { role: "member", project: "web" }] }, { executable: true }, 0);
    const lowRiskPlan = (0, collaboration_1.classifyPlanModeRisk)("给设置页按钮文案改成保存", { members: [{ role: "coordinator", project: "web" }] }, { executable: true }, 0);
    const planClarificationQuestions = (0, collaboration_1.buildPlanModeClarificationQuestions)("调整支付流程", highRiskPlan, ["api", "web"]);
    const awaitingPlanCard = (0, collaboration_1.buildTaskCardView)({
        id: "plan-task",
        title: "调整支付流程",
        business_goal: "调整支付流程",
        status: "pending",
        intake_state: "awaiting_confirmation",
        intake_draft: {
            title: "执行前计划",
            mode: "cc-style-plan-mode",
            requires_confirmation: true,
            risk: highRiskPlan,
            impact_scope: { projects: ["api", "web"], areas: ["后端接口与数据契约", "前端页面与交互"], multi_agent: true },
            read_only_exploration: { summary: "只读代码快照和本地知识库召回已用于评估。", projects: ["api", "web"], knowledge_used: true, code_snapshot_used: true },
            steps: [
                { id: "understand_goal", label: "理解需求与验收目标", detail: "支付流程调整需要先明确兼容边界。", status: "completed" },
                { id: "read_only_explore", label: "只读探索影响范围", detail: "已使用只读代码快照和本地知识库。", status: "completed" },
                { id: "confirm_boundary", label: "确认执行边界", detail: "等待用户确认后再派发子 Agent。", status: "needs_confirmation" },
                { id: "dispatch_sub_agents", label: "派发子 Agent 工作单", detail: "确认后拆给 api 和 web。", status: "pending" },
                { id: "verify_and_summarize", label: "验收结果并总结给用户", detail: "完成后核对变更、验证和风险。", status: "pending" },
            ],
            clarification_questions: planClarificationQuestions,
            needs_clarification: true,
            acceptance: ["必须有结构化结果说明", "必须有文件变更和验证证据"],
            permission_boundaries: ["确认前不得修改文件", "删除和部署必须等待用户确认"],
        },
        workflow_meta: { intake: { task_intent: { executable: true } } },
    }, [], []);
    const revisedPlanDraft = (0, collaboration_1.buildRevisedPlanModeDraft)(awaitingPlanCard.plan_mode, "先保留旧支付表，只新增兼容字段。");
    const acceptedPlanDraft = (0, collaboration_1.buildAcceptedPlanModeDraft)(awaitingPlanCard.plan_mode, "同时更新 README 中的支付兼容说明。", "2026-07-07T00:00:00.000Z");
    const revisedPlanCard = (0, collaboration_1.buildTaskCardView)({
        id: "plan-task-revised",
        title: "调整支付流程",
        business_goal: "调整支付流程",
        status: "pending",
        intake_state: "awaiting_confirmation",
        intake_draft: revisedPlanDraft,
        workflow_meta: { plan_mode: revisedPlanDraft, intake: { task_intent: { executable: true }, plan_mode: revisedPlanDraft } },
    }, [], []);
    const acceptedPlanCard = (0, collaboration_1.buildTaskCardView)({
        id: "plan-task-accepted",
        title: "调整支付流程",
        business_goal: "调整支付流程",
        status: "pending",
        intake_state: "confirmed",
        intake_draft: acceptedPlanDraft,
        acceptance_criteria: acceptedPlanDraft.acceptance.join("\n"),
        source_documents: `用户确认执行前计划时补充要求：${acceptedPlanDraft.accepted_feedback}`,
        workflow_meta: { plan_mode: acceptedPlanDraft, intake: { task_intent: { executable: true }, plan_mode: acceptedPlanDraft, accepted_feedback: acceptedPlanDraft.accepted_feedback } },
    }, [], []);
    const report = (0, task_delivery_report_1.buildUserDeliveryReport)(task, task.delivery_summary, "done", "负责人筛选已完成");
    const groupReport = (0, task_delivery_report_1.buildTaskGroupReportMessage)(task, "done", "负责人筛选已完成");
    const acknowledgement = (0, collaboration_1.buildUserCoordinationAcknowledgement)({ ...task, business_goal: "增加负责人筛选。" }, [{ project: "collab-web" }]);
    const dispatchLaunchSummary = (0, collaboration_1.buildDispatchLaunchSummary)({
        goal: "增加负责人筛选。",
        assignments: [{
                project: "collab-web",
                task: "实现负责人筛选 UI，并返回 CCM_AGENT_RECEIPT。",
                reason: "前端负责筛选入口和交互。",
                status: "dispatched",
            }],
        dispatchPolicy: { action: "delegate", reason: "用户明确要求开发任务" },
        mode: "project_task",
        taskId: "dispatch-launch-selftest",
    });
    const completedTargetDispatchLaunchSummary = (0, collaboration_1.buildDispatchLaunchSummary)({
        goal: "增加负责人筛选。",
        assignments: [{
                project: "collab-web",
                task: "负责人筛选实现已回传，等待主 Agent 验收。",
                reason: "执行成员已经返回结果，但还没有通过主 Agent 验收。",
                status: "done",
            }],
        dispatchPolicy: { action: "delegate", reason: "用户明确要求开发任务" },
        mode: "project_task",
        taskId: "dispatch-launch-completed-target-selftest",
    });
    const ackGapTask = {
        ...task,
        status: "in_progress",
        delivery_summary: {
            ...task.delivery_summary,
            ack_gate_passed: false,
            ack_review: {
                status: "needs_review",
                rejected: [{ agent: "collab-web", status: "weak", reason: "ACK 缺少目标或计划范围" }],
                rows: [{ agent: "collab-web", status: "weak", reason: "ACK 缺少目标或计划范围", planned_scope: [], unclear: [] }],
            },
            acceptance_gate_passed: false,
        },
    };
    const ackGapCard = (0, collaboration_1.buildTaskCardView)(ackGapTask, [], []);
    const ackGapDraft = (0, collaboration_1.buildTaskGapContinuationDraft)(ackGapTask);
    const contractGapTask = {
        ...task,
        status: "in_progress",
        delivery_summary: {
            ...task.delivery_summary,
            assignment_evidence: [{ project: "collab-api", task: "修改负责人 API", reason: "后端契约提供方" }],
            receipts: [{
                    agent: "collab-api",
                    status: "done",
                    summary: "新增 GET /api/users?role=owner",
                    actions: ["更新接口"],
                    filesChanged: ["backend/server.ts"],
                    verification: ["npm test passed by external runner (exit 0)"],
                    ack: { understoodGoal: "修改负责人 API", plannedScope: ["backend/server.ts"], verificationPlan: ["npm test"], unclear: [] },
                    contractChanges: [{ type: "api", endpoint: "GET /api/users?role=owner", summary: "返回负责人列表", consumers: ["collab-web"] }],
                    blockers: [],
                    needs: [],
                    memoryUsed: [],
                    memoryIgnored: ["自测样例"],
                }],
            contract_injection_gate_passed: false,
        },
    };
    const contractGapDraft = (0, collaboration_1.buildTaskGapContinuationDraft)(contractGapTask);
    const recoveredTestAgentNotificationTask = {
        delivery_summary: {
            needs: ["等待主 Agent 重新运行 TestAgent 复核本轮返工修复"],
            blocking_needs: [],
            worker_notifications: [
                { task_id: "test-agent", status: "failed", receipt_status: "failed", summary: "首次复核要求返工" },
                { task_id: "test-agent", status: "completed", receipt_status: "done", summary: "返工后复测通过" },
            ],
        },
    };
    const sameSessionReworkReceipts = (0, collaboration_1.selectLatestDurableReceipts)([
        { agent: "runtime-e2e-project", status: "done", task_agent_session_id: "tas-rework", summary: "返工完成" },
        { agent: "runtime-e2e-project", status: "done", task_agent_session_id: "tas-rework", ack: { understoodGoal: "完成目标", plannedScope: ["src/feature.js"], unclear: [] } },
    ]);
    const differentSessionReworkReceipts = (0, collaboration_1.selectLatestDurableReceipts)([
        { agent: "runtime-e2e-project", status: "done", task_agent_session_id: "tas-new", summary: "新会话返工" },
        { agent: "runtime-e2e-project", status: "done", task_agent_session_id: "tas-old", ack: { understoodGoal: "旧目标", plannedScope: ["src/old.js"], unclear: [] } },
    ]);
    const workItemReworkDraft = (0, collaboration_1.buildTargetedReworkContinuationDraft)({
        ...task,
        delivery_summary: {},
        work_items: [{
                id: "wi-collab-web",
                target: "collab-web",
                owner: "collab-web",
                subject: "补齐负责人筛选验证",
                status: "failed",
                attempt: 2,
                evidence: ["上一轮修改了 frontend/app.js"],
                blockers: ["缺少 npm test 执行结果"],
                updatedAt: "2020-01-01T00:00:00.000Z",
            }],
    }, { target: "collab-web", rework_kind: "missing_verification", reason: "缺少已执行验证" });
    const workItemWatchdogStatus = (0, collaboration_1.getTaskWatchdogStatus)(1000, collaboration_1.TASK_WATCHDOG_GAP_REWORK_COOLDOWN_MS, collaboration_1.TASK_WATCHDOG_GAP_REWORK_MAX, [{
            id: "work-item-stall-task",
            title: "工作项卡住自测",
            status: "in_progress",
            auto_execute: true,
            updated_at: "2020-01-01T00:00:00.000Z",
            work_items: [{
                    id: "wi-stalled",
                    target: "collab-web",
                    owner: "collab-web",
                    subject: "执行队列卡住项",
                    status: "in_progress",
                    updatedAt: "2020-01-01T00:00:00.000Z",
                }],
        }]);
    const contractRows = (0, protocol_gates_1.getTaskContractInjectionRows)(contractGapTask).rows;
    const contractInjectionId = contractRows[0]?.injection_id || "";
    const contractDispatchedUnconsumedGate = (0, protocol_gates_1.evaluateContractInjectionGate)(contractRows, [{ project: "collab-web", task: "注入 contractChanges：GET /api/users?role=owner，请续跑适配消费者", continuationStrategy: "contract_inject", message_id: "m-contract" }]);
    const contractConsumedGate = (0, protocol_gates_1.evaluateContractInjectionGate)(contractRows, [{ project: "collab-web", task: "注入 contractChanges：GET /api/users?role=owner，请续跑适配消费者", continuationStrategy: "contract_inject", message_id: "m-contract" }], [{ agent: "collab-web", status: "done", consumedInjectionIds: [contractInjectionId], contractConsumption: [{ injection_id: contractInjectionId, status: "adapted", evidence: ["frontend/app.js", "npm test"] }], filesChanged: ["frontend/app.js"], verification: ["npm test passed by external runner (exit 0)"] }]);
    const contractWeakConsumptionGate = (0, protocol_gates_1.evaluateContractInjectionGate)(contractRows, [{ project: "collab-web", task: "注入 contractChanges：GET /api/users?role=owner，请续跑适配消费者", continuationStrategy: "contract_inject", message_id: "m-contract" }], [{ agent: "collab-web", status: "done", consumedInjectionIds: [contractInjectionId] }]);
    const contractGenericApiGate = (0, protocol_gates_1.evaluateContractInjectionGate)(contractRows, [{ project: "collab-web", task: "改前端 API 调用", message_id: "m-original" }]);
    const runtimeKernelCard = (0, collaboration_1.buildTaskCardView)({
        ...task,
        delivery_summary: {
            ...task.delivery_summary,
            runtime_kernel: {
                trace_id: "trace-ux",
                lifecycle_count: 2,
                latest_lifecycle: [],
                blocked_count: 0,
                ack_only: { active: true, count: 1, latest: { action: "ack_preflight_dispatch", status: "blocked" } },
                dispatch_worker_count: 1,
                worker_context_packet_ids: ["wcp_selftest"],
                contract_injections: [],
                injection_ids: ["ci_selftest"],
                context_budget: { max_pressure: 18.5, compact_recommended: false },
            },
        },
    }, [], []);
    const codeSnapshotSelfTest = (() => {
        const tempRoot = fs.mkdtempSync(path.join(process.env.TEMP || utils_1.CCM_DIR, "ccm-project-analysis-"));
        try {
            fs.mkdirSync(path.join(tempRoot, "src"), { recursive: true });
            fs.mkdirSync(path.join(tempRoot, "node_modules"), { recursive: true });
            fs.writeFileSync(path.join(tempRoot, "package.json"), JSON.stringify({ scripts: { dev: "vite" }, dependencies: { vue: "^3.0.0" } }), "utf-8");
            fs.writeFileSync(path.join(tempRoot, "src", "payment.ts"), "export function createPayment() { return 'ok' }\n", "utf-8");
            fs.writeFileSync(path.join(tempRoot, ".env"), "SECRET_SHOULD_NOT_APPEAR=1\n", "utf-8");
            fs.writeFileSync(path.join(tempRoot, "node_modules", "ignored.js"), "SHOULD_NOT_APPEAR\n", "utf-8");
            const snapshot = (0, collaboration_1.buildProjectCodeReadOnlySnapshot)("demo", tempRoot, "支付功能在哪里");
            return {
                pass: snapshot.includes("src/payment.ts") && snapshot.includes("createPayment") && !snapshot.includes("SECRET_SHOULD_NOT_APPEAR") && !snapshot.includes("SHOULD_NOT_APPEAR"),
                hasSourceFile: snapshot.includes("src/payment.ts"),
                hidesSecret: !snapshot.includes("SECRET_SHOULD_NOT_APPEAR"),
                hidesDependencies: !snapshot.includes("SHOULD_NOT_APPEAR"),
            };
        }
        catch (error) {
            return { pass: false, error: (0, memory_1.compactMemoryText)(error?.message || error, 240) };
        }
        finally {
            try {
                fs.rmSync(tempRoot, { recursive: true, force: true });
            }
            catch { }
        }
    })();
    const gatewayFallbackBlocked = (0, collaboration_1.normalizeGroupAgentGatewayTaskIntent)((0, collaboration_1.classifyGroupProjectTaskIntent)("帮我给项目A新增支付接口并改前端页面"), { runtime: "coded-fallback", dispatchPolicy: { action: "delegate", reason: "规则猜测需要派发" }, assignments: [{ project: "collab-web" }] }, "project_task");
    const gatewayLlmDelegates = (0, collaboration_1.normalizeGroupAgentGatewayTaskIntent)((0, collaboration_1.classifyGroupProjectTaskIntent)("帮我给项目A新增支付接口并改前端页面"), {
        runtime: "llm-api",
        workflowDecision: { mode: "execute_direct", reason: "用户要求开发任务", confidence: 0.95, actionRequired: true, needsPlanning: false, needsEpicDecomposition: false },
        dispatchPolicy: { action: "delegate", reason: "用户要求开发任务" },
        assignments: [{ project: "collab-web" }],
    }, "project_task");
    const gatewayLlmDirectAnswer = (0, collaboration_1.normalizeGroupAgentGatewayTaskIntent)((0, collaboration_1.classifyGroupProjectTaskIntent)("这个项目架构是什么"), {
        runtime: "llm-api",
        workflowDecision: { mode: "project_analysis", reason: "只读项目分析即可", confidence: 0.95, actionRequired: false, needsPlanning: false, needsEpicDecomposition: false },
        dispatchPolicy: { action: "direct_answer", reason: "只读项目分析即可" },
        assignments: [],
    }, "project_task");
    const globalMissionHandoff = (0, collaboration_1.buildGlobalMissionTargetHandoff)({
        parent: { id: "gm-selftest" },
        target: { type: "group", group_id: "g-selftest", name: "开发群", coordinator: "coordinator", reason: "全局任务需要群聊协作", dependsOn: ["backend-api"] },
        group: { id: "g-selftest", name: "开发群", members: [{ project: "coordinator" }, { project: "collab-web" }] },
        businessGoal: "完成跨项目负责人筛选",
        childGoal: "群聊负责前端联调和验收",
        acceptance: "必须有文件变更、已执行验证和主 Agent 总结",
        sourceDocuments: "接口：GET /api/users?role=owner",
        traceId: "trace-global-handoff",
    });
    const globalQueuedMessage = (0, collaboration_1.buildQueuedGroupTaskMessage)({
        ...task,
        global_mission_id: "gm-selftest",
        mission_handoff: globalMissionHandoff,
    });
    const globalDirectCompletionTask = {
        ...task,
        workflow_meta: {
            global_direct_dispatch: {
                schema: "ccm-global-direct-dispatch-v1",
                session_id: "web-global-session",
                global_run_id: "gar-selftest",
                trace_id: "trace-should-stay-technical",
            },
        },
    };
    const globalDirectCompletionMessage = (0, collaboration_1.buildGlobalDirectDispatchCompletionMessage)(globalDirectCompletionTask);
    const globalDirectWeakCompletionTask = {
        ...globalDirectCompletionTask,
        delivery_summary: weakAcceptanceOnlyTask.delivery_summary,
    };
    const globalDirectBlockedTask = {
        ...globalDirectCompletionTask,
        status: "in_progress",
        delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false },
    };
    const globalDirectContinuationTask = {
        ...globalDirectCompletionTask,
        status: "in_progress",
        followup_revision: 3,
        plan_revision_required: true,
        collaboration_state: {
            phase: "reworking",
            last_continuation: {
                source: "group_chat_followup",
                at: "2026-07-07T00:00:00.000Z",
                kind: "revise_goal",
                reason: "先保留旧支付表，只新增兼容字段。",
                status: "interrupting",
                replan_required: true,
                interrupt_current_run: true,
            },
            goal_revision_interruption: {
                requested: true,
                requested_at: "2026-07-07T00:00:00.000Z",
                reason: "先保留旧支付表，只新增兼容字段。",
            },
        },
        delivery_summary: { ...task.delivery_summary, acceptance_gate_passed: false },
    };
    const globalDirectContinuationMessage = (0, collaboration_1.buildGlobalDirectDispatchContinuationMessage)(globalDirectContinuationTask);
    const globalDirectContinuationAlreadyNotifiedTask = {
        ...globalDirectContinuationTask,
        workflow_meta: {
            global_direct_dispatch: {
                ...globalDirectContinuationTask.workflow_meta.global_direct_dispatch,
                continuation_notified_key: (0, collaboration_1.getGlobalDirectDispatchContinuationKey)(globalDirectContinuationTask),
            },
        },
    };
    const globalDirectRollbackTask = {
        ...globalDirectCompletionTask,
        status: "cancelled",
        rolled_back_at: new Date().toISOString(),
        rollback_reason: "用户检查后撤销最近一轮改动",
        rollback_results: [{ checkpointId: "checkpoint-ux" }],
        delivery_summary: { ...task.delivery_summary, headline: "最近一轮改动已安全撤销", acceptance_gate_passed: false, reverted: true },
    };
    const globalDirectRollbackAlreadyNotifiedTask = {
        ...globalDirectRollbackTask,
        workflow_meta: {
            global_direct_dispatch: {
                ...globalDirectRollbackTask.workflow_meta.global_direct_dispatch,
                rollback_notified_at: new Date().toISOString(),
            },
        },
    };
    const globalDirectRollbackMessage = (0, collaboration_1.buildGlobalDirectDispatchRollbackMessage)(globalDirectRollbackTask);
    const teamShutdownTaskId = `team-shutdown-selftest-${process.pid}-${Date.now().toString(36)}`;
    const teamShutdownTask = {
        ...task,
        id: teamShutdownTaskId,
        status: "in_progress",
        group_id: "team-shutdown-group",
        delivery_summary: task.delivery_summary,
    };
    const teamShutdownExecution = {
        status: "done",
        detail: "团队收尾门禁自测",
        report: "负责人筛选已完成",
        receipt: task.delivery_summary.receipts[0],
        review: { status: "complete", summary: "已完成最终验收" },
    };
    (0, agent_sessions_1.openTaskAgentSession)({
        scopeId: teamShutdownTaskId,
        taskId: teamShutdownTaskId,
        groupId: "team-shutdown-group",
        project: "collab-web",
        agentType: "claudecode",
    });
    const openTeamSummary = (0, collaboration_1.buildDeliverySummary)(teamShutdownTask, teamShutdownExecution, "done");
    (0, agent_sessions_1.closeTaskAgentSessions)({ taskId: teamShutdownTaskId, groupId: "team-shutdown-group" }, "团队收尾门禁自测关闭会话");
    const closedTeamSummary = (0, collaboration_1.buildDeliverySummary)(teamShutdownTask, teamShutdownExecution, "done");
    (0, agent_sessions_1.purgeTaskAgentSessions)(teamShutdownTaskId);
    const independentReviewTask = {
        id: `independent-review-selftest-${process.pid}`,
        title: "调整后端订单 API",
        business_goal: "修改订单 API 并同步验证",
        workflow_type: "daily_dev",
        assign_type: "group",
        target_project: "api-service",
        group_id: "independent-review-group",
        requires_code_changes: true,
        requires_verification: true,
        status: "in_progress",
        file_changes: {
            count: 3,
            files: [
                { path: "backend/server.ts", statusText: "修改", statusKind: "modified", diff: { additions: 12, deletions: 2 } },
                { path: "backend/routes/orders.ts", statusText: "修改", statusKind: "modified", diff: { additions: 16, deletions: 1 } },
                { path: "package.json", statusText: "修改", statusKind: "modified", diff: { additions: 1, deletions: 1 } },
            ],
        },
    };
    const independentReviewReceipt = {
        agent: "api-service",
        status: "done",
        summary: "已调整订单 API",
        actions: ["修改订单 API", "更新路由校验"],
        filesChanged: ["backend/server.ts", "backend/routes/orders.ts", "package.json"],
        verification: ["npm run check passed by external runner (exit 0)"],
        ack: {
            understoodGoal: "修改订单 API",
            plannedScope: ["backend/server.ts", "backend/routes/orders.ts"],
            forbiddenScope: ["不改无关模块"],
            verificationPlan: ["npm run check"],
            unclear: [],
        },
        blockers: [],
        needs: [],
    };
    const independentReviewExecution = {
        status: "done",
        detail: "复杂变更独立复核自测",
        coordinationPlan: { strategy: "research_synthesis_implementation_verification", phases: ["实现", "验证", "复核"], targets: ["api-service"] },
        assignments: [{ project: "api-service", task: "修改订单 API 并提交结果说明", status: "done" }],
        report: (0, agent_notifications_1.formatCollectedAgentOutput)("api-service", "已调整订单 API", independentReviewReceipt),
        receipt: independentReviewReceipt,
        review: { status: "complete", summary: "已完成最终验收" },
    };
    const missingIndependentReviewSummary = (0, collaboration_1.buildDeliverySummary)(independentReviewTask, independentReviewExecution, "done");
    const reviewedReceipt = {
        ...independentReviewReceipt,
        independentReview: [{
                reviewer: "qa-agent",
                verdict: "passed",
                summary: "已复核后端 API 改动、路由校验和验证记录，未发现阻塞风险。",
                evidence: ["backend/server.ts", "backend/routes/orders.ts", "npm run check passed by external runner (exit 0)"],
            }],
    };
    const reviewedIndependentSummary = (0, collaboration_1.buildDeliverySummary)(independentReviewTask, {
        ...independentReviewExecution,
        report: (0, agent_notifications_1.formatCollectedAgentOutput)("api-service", "已调整订单 API，并由 qa-agent 复核通过", reviewedReceipt),
        receipt: reviewedReceipt,
    }, "done");
    const failedReviewedReceipt = {
        ...independentReviewReceipt,
        independentReview: [{
                reviewer: "test-agent",
                verdict: "failed",
                summary: "订单 API 变更复核未通过，npm run check 仍有失败。",
                evidence: ["npm run check failed", "backend/routes/orders.ts 仍需修复"],
                reviewSubject: "api-service",
            }],
    };
    const failedReviewedIndependentSummary = (0, collaboration_1.buildDeliverySummary)(independentReviewTask, {
        ...independentReviewExecution,
        report: (0, agent_notifications_1.formatCollectedAgentOutput)("test-agent", "订单 API 复核未通过，需要返工", failedReviewedReceipt),
        receipt: failedReviewedReceipt,
    }, "done");
    const independentReviewGapDraft = (0, collaboration_1.buildTaskGapContinuationDraft)({
        ...independentReviewTask,
        delivery_summary: missingIndependentReviewSummary,
    });
    const failedIndependentReviewGapDraft = (0, collaboration_1.buildTaskGapContinuationDraft)({
        ...independentReviewTask,
        delivery_summary: failedReviewedIndependentSummary,
    });
    const workItemSelfTest = (0, work_items_1.runMainAgentWorkItemSelfTest)();
    const workerHandoffSelfTest = (0, worker_handoff_1.runWorkerHandoffSelfTest)();
    const globalMemoryHealthGateReceiptSelfTest = (0, collaboration_1.runGlobalMemoryHealthGateReceiptValidationSelfTest)();
    const taskAgentMemoryContextSnapshotReceiptSelfTest = (0, collaboration_1.runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest)();
    const workerContinuationRuntimeTask = {
        ...task,
        title: "旧目标：重构支付流程",
        business_goal: "新目标：保留旧支付表，只新增兼容字段",
        status: "in_progress",
        followup_revision: 2,
        consumed_followup_revision: 1,
        pending_followups: [{
                kind: "revise_goal",
                message: "先保留旧支付表，只新增兼容字段。",
                continuation: { route_label: "先停止当前轮再重核计划", replan_required: true },
            }],
        collaboration_state: {
            phase: "reworking",
            last_continuation: {
                source: "group_chat_followup",
                at: "2026-07-07T00:00:00.000Z",
                kind: "revise_goal",
                reason: "先保留旧支付表，只新增兼容字段。",
                status: "accepted",
                replan_required: true,
                interrupt_current_run: true,
            },
            goal_revision_interruption: {
                requested: true,
                requested_at: "2026-07-07T00:00:00.000Z",
                resolved_at: "2026-07-07T00:01:00.000Z",
                reason: "先保留旧支付表，只新增兼容字段。",
                source: "group_chat_followup",
            },
        },
        delivery_summary: {
            ...task.delivery_summary,
            headline: "上一轮已按旧支付方案改动，等待按新目标重核",
            actual_file_changes: [{ path: "backend/payment.ts" }],
            verification_executed: ["npm run check passed by external runner (exit 0)"],
        },
    };
    const workerContinuationRuntime = (0, collaboration_1.buildWorkerContinuationHandoff)(workerContinuationRuntimeTask, "api-service", { previous_goal: "旧目标：重构支付流程" });
    const workerContinuationRuntimeHandoff = (0, collaboration_1.buildChildAgentWorkerHandoff)("api-service", "按最新目标处理支付兼容字段", {
        task: workerContinuationRuntimeTask,
        source: "群聊主 Agent 目标调整续跑",
        reason: "用户中途调整了支付改造范围",
        continuation: workerContinuationRuntime,
        acceptance: "保留旧支付表\n新增兼容字段\n必须真实验证",
        verification_hints: ["npm run check"],
        allowed_scope: ["支付兼容字段"],
        forbidden_scope: ["删除旧支付表"],
    });
    const workerContinuationRuntimeRendered = (0, worker_handoff_1.renderSelfContainedWorkerHandoff)(workerContinuationRuntimeHandoff);
    const blockedCompletionReadiness = (0, collaboration_1.buildUserCompletionReadinessSummary)({ ...task, status: "in_progress" }, {
        ...task.delivery_summary,
        team_shutdown: {
            required: true,
            pass: false,
            open_session_count: 1,
            open_sessions: [{ id: "session-hidden", project: "collab-web" }],
            unresolved_work_item_count: 1,
        },
    }, [
        { id: "wi-api", target: "api", subject: "接口完成", status: "completed" },
        { id: "wi-web", target: "web", subject: "接入筛选 UI", status: "in_progress" },
    ], "reviewing");
    const blockedCompletionAcceptance = (0, collaboration_1.buildUserAcceptanceReview)({ ...task, status: "in_progress" }, {
        ...task.delivery_summary,
        acceptance_gate_passed: false,
        work_item_summary: { total: 2, all_completed: false },
        team_shutdown: { required: true, pass: false, open_session_count: 1, unresolved_work_item_count: 1 },
        acceptance_gate: {
            pass: false,
            checks: [
                { id: "work_items", ok: false, detail: "raw work item detail" },
                { id: "team_shutdown", ok: false, detail: "raw team shutdown detail" },
            ],
        },
    }, [], "reviewing");
    const blockedCompletionVisibleText = JSON.stringify({
        title: blockedCompletionReadiness?.title,
        status_label: blockedCompletionReadiness?.status_label,
        headline: blockedCompletionReadiness?.headline,
        rows: blockedCompletionReadiness?.rows,
        next_action: blockedCompletionReadiness?.next_action,
    });
    const blockedCompletionAcceptanceVisibleText = JSON.stringify({
        title: blockedCompletionAcceptance.title,
        headline: blockedCompletionAcceptance.headline,
        missing: blockedCompletionAcceptance.missing,
        checks: blockedCompletionAcceptance.checks.map((item) => ({ label: item.label, detail: item.detail })),
        next_action: blockedCompletionAcceptance.next_action,
    });
    const jargonAcceptance = (0, collaboration_1.buildUserAcceptanceReview)({ ...task, status: "in_progress" }, {
        ...task.delivery_summary,
        acceptance_gate_passed: false,
        ack_gate_passed: false,
        ack_review: { rejected: [{ agent: "web", reason: "ACK raw reason" }] },
        receipt_quality_gate_passed: false,
        weak_receipt_quality: [{ agent: "web", reason: "weak receipt raw reason" }],
        memory_dispatch_gates: [{ gate_id: "memory-gate-hidden" }],
        memory_gate_receipt_rows: [{ agent: "web", memory_gate: { required: true, pass: false, missing_gate_ids: ["memory-gate-hidden"] } }],
        api_microcompact_edit_plans: [{ plan_checksum: "api-microcompact-hidden" }],
        api_microcompact_receipt_rows: [{ agent: "web", api_microcompact: { required: true, pass: false, missing_plan_checksums: ["api-microcompact-hidden"] } }],
        acceptance_gate: {
            pass: false,
            checks: [
                { id: "ack_gate", ok: false, detail: "ACK raw detail" },
                { id: "memory_gate_receipt", ok: false, detail: "记忆 gate raw detail" },
                { id: "api_microcompact_receipt", ok: false, detail: "API microcompact edit plan raw detail" },
            ],
        },
    }, [], "reviewing");
    const jargonAcceptanceVisibleText = JSON.stringify({
        title: jargonAcceptance.title,
        headline: jargonAcceptance.headline,
        missing: jargonAcceptance.missing,
        checks: jargonAcceptance.checks.map((item) => ({ label: item.label, detail: item.detail })),
        next_action: jargonAcceptance.next_action,
    });
    const collectVisibleTextValues = (value, blockedKeys = new Set(["schema", "id", "kind", "type", "source", "status", "tone", "rework_kind", "reworkKind"])) => {
        if (Array.isArray(value))
            return value.flatMap(item => collectVisibleTextValues(item, blockedKeys));
        if (!value || typeof value !== "object")
            return typeof value === "string" ? [value] : [];
        return Object.entries(value).flatMap(([key, item]) => blockedKeys.has(key) ? [] : collectVisibleTextValues(item, blockedKeys));
    };
    const visibleInternalTermPattern = /CCM_AGENT_RECEIPT|WorkerContextPacket|trace_id|session_id|raw receipt|raw payload|原始回执|回执/i;
    const receiptReworkVisibleText = collectVisibleTextValues({
        title: missingEvidenceCard.receipt_rework_summary?.title,
        status_label: missingEvidenceCard.receipt_rework_summary?.status_label,
        headline: missingEvidenceCard.receipt_rework_summary?.headline,
        next_action: missingEvidenceCard.receipt_rework_summary?.next_action,
        gaps: missingEvidenceCard.receipt_rework_summary?.gaps?.map((item) => ({
            title: item.title,
            reason: item.reason,
            missing: item.missing,
            action: { title: item.action?.title, label: item.action?.label, reason: item.action?.reason },
        })),
        active_rework: missingEvidenceCard.receipt_rework_summary?.active_rework,
        resolved: receiptResolvedCard.receipt_rework_summary?.resolved,
    }).join("\n");
    const coordinationVisibleText = collectVisibleTextValues({
        events: missingEvidenceCard.agent_coordination?.coordination_events?.map((item) => ({ label: item.label, detail: item.detail })),
        targeted_rework: missingEvidenceCard.agent_coordination?.targeted_rework?.map((item) => ({ title: item.title, reason: item.reason, label: item.label })),
        next_action: missingEvidenceCard.agent_coordination?.next_action,
    }).join("\n");
    const continuationVisibleText = collectVisibleTextValues({
        title: goalRevisionContinuationCard.continuation_status?.title,
        status_label: goalRevisionContinuationCard.continuation_status?.status_label,
        headline: goalRevisionContinuationCard.continuation_status?.headline,
        kind_label: goalRevisionContinuationCard.continuation_status?.kind_label,
        route_label: goalRevisionContinuationCard.continuation_status?.route_label,
        reason: goalRevisionContinuationCard.continuation_status?.reason,
        next_action: goalRevisionContinuationCard.continuation_status?.next_action,
        handoff_steps: goalRevisionContinuationCard.continuation_status?.handoff_steps?.map((item) => ({ label: item.label, detail: item.detail })),
    }).join("\n");
    const checks = {
        completionReadinessShowsFriendlyBlockers: blockedCompletionReadiness?.schema === "ccm-main-agent-completion-readiness-v1"
            && blockedCompletionReadiness.status === "blocked"
            && blockedCompletionReadiness.headline.includes("还有 1 个工作项未完成")
            && blockedCompletionReadiness.rows.some((item) => item.target === "web" && item.status_label === "执行中"),
        completionReadinessHidesTechnicalIds: !blockedCompletionVisibleText.includes("wi-web")
            && !blockedCompletionVisibleText.includes("session-hidden")
            && blockedCompletionReadiness?.technical?.unresolved_work_item_ids?.includes("wi-web")
            && blockedCompletionReadiness?.technical?.open_session_ids?.includes("session-hidden"),
        completionAcceptanceNamesQueueAndSessionBlockers: blockedCompletionAcceptance.checks.some((item) => item.id === "work_items" && item.label === "执行队列收尾" && item.detail === "还有 1 个工作项未完成")
            && blockedCompletionAcceptance.checks.some((item) => item.id === "team_shutdown" && item.label === "执行成员会话收尾" && item.detail === "还有 1 个执行成员会话未结束")
            && !blockedCompletionAcceptanceVisibleText.includes("raw work item detail")
            && !blockedCompletionAcceptanceVisibleText.includes("raw team shutdown detail")
            && JSON.stringify(blockedCompletionAcceptance.technical || {}).includes("raw work item detail")
            && JSON.stringify(blockedCompletionAcceptance.technical || {}).includes("raw team shutdown detail"),
        acceptanceReviewVisibleTextHidesProtocolTerms: jargonAcceptance.checks.some((item) => item.id === "ack_gate" && item.label === "接单说明完整" && item.detail.includes("接单说明"))
            && jargonAcceptance.checks.some((item) => item.id === "memory_gate_receipt" && item.label === "记忆使用声明" && item.detail.includes("记忆使用声明"))
            && jargonAcceptance.checks.some((item) => item.id === "api_microcompact_receipt" && item.label === "上下文压缩计划使用说明" && item.detail.includes("上下文压缩计划"))
            && !/ACK|microcompact|\bgate\b|门禁|回执/.test(jargonAcceptanceVisibleText),
        acceptanceReviewKeepsRawGateDetailsTechnical: /ACK raw detail/.test(JSON.stringify(jargonAcceptance.technical || {}))
            && /记忆 gate raw detail/.test(JSON.stringify(jargonAcceptance.technical || {}))
            && /API microcompact edit plan raw detail/.test(JSON.stringify(jargonAcceptance.technical || {})),
        simplePhaseLanguage: card.phase_label === "已完成",
        conciseAgentLanguage: card.agents.every((item) => !/receipt|回执|门禁|session|trace/i.test(item.summary)),
        simpleActions: card.actions.some((item) => item.label === "查看改动")
            && card.actions.some((item) => item.label === "继续修改")
            && card.actions.some((item) => item.label === "安全撤销")
            && failedCard.actions.some((item) => item.label === "重新执行")
            && activeCard.actions.some((item) => item.label === "停止"),
        revertedPhase: revertedCard.phase === "reverted" && revertedCard.phase_label === "已安全撤销",
        technicalIdsStayCollapsed: !!card.technical.trace_id,
        userWorkflowTimelineVisible: card.workflow_timeline.length >= 4 && card.workflow_timeline.some((item) => item.label.includes("预判潜在修改冲突")),
        workerHandoffTimelineVisible: card.workflow_timeline.some((item) => item.label.includes("工作单已补齐")) && !JSON.stringify(card.workflow_timeline).includes("CCM_AGENT_RECEIPT"),
        progressCheckpointsVisible: card.progress_checkpoints?.schema === "ccm-main-agent-progress-checkpoints-v1"
            && card.progress_checkpoints.items?.some((item) => item.label.includes("协作计划") || item.label.includes("工作单")),
        progressCheckpointsHideProtocol: !/CCM_AGENT_RECEIPT|trace_id|session_ids|WorkerContextPacket/.test(JSON.stringify(card.progress_checkpoints || {})),
        liveCheckpointStageEventsVisible: liveCheckpointStageCard.progress_checkpoints?.items?.some((item) => item.label.includes("执行前计划已按反馈调整"))
            && liveCheckpointStageCard.progress_checkpoints?.items?.some((item) => item.label.includes("我已接上恢复任务"))
            && liveCheckpointStageCard.progress_checkpoints?.items?.some((item) => item.label.includes("提交结果"))
            && liveCheckpointStageCard.progress_checkpoints?.items?.some((item) => item.label.includes("定向补充"))
            && liveCheckpointStageCard.progress_checkpoints?.items?.some((item) => item.label.includes("我已安排子任务返工")),
        liveCheckpointSupervisorCompletionVisible: liveCheckpointCompletedCard.progress_checkpoints?.items?.some((item) => item.label.includes("我已检查子任务进展"))
            && liveCheckpointCompletedCard.progress_checkpoints?.items?.some((item) => item.label.includes("全局任务已通过交付验收")),
        liveCheckpointStageEventsHideProtocol: !/CCM_AGENT_RECEIPT|trace_id|session_ids|WorkerContextPacket/.test(JSON.stringify([liveCheckpointStageCard.progress_checkpoints, liveCheckpointCompletedCard.progress_checkpoints])),
        globalMissionHandoffComplete: globalMissionHandoff.schema === "ccm-self-contained-worker-handoff-v1" && globalMissionHandoff.global_mission?.mission_id === "gm-selftest" && globalMissionHandoff.worker_context_packet?.packet_id && globalMissionHandoff.done_criteria?.some((item) => item.includes("全局汇总")),
        globalMissionQueuedMessageHasContext: globalQueuedMessage.includes("全局任务交接") && globalQueuedMessage.includes("给全局 Agent 的交付要求") && !/WorkerContextPacket|trace_id/.test(globalQueuedMessage),
        globalDirectDispatchCompletionSyncReady: (0, collaboration_1.shouldNotifyGlobalDirectDispatchCompletion)(globalDirectCompletionTask, "in_progress") === true && (0, collaboration_1.shouldNotifyGlobalDirectDispatchCompletion)(globalDirectBlockedTask, "in_progress") === false,
        globalDirectDispatchWeakAcceptanceNotSynced: (0, collaboration_1.shouldNotifyGlobalDirectDispatchCompletion)(globalDirectWeakCompletionTask, "in_progress") === false,
        globalDirectDispatchCompletionMessageFriendly: globalDirectCompletionMessage.includes("通过验收") && globalDirectCompletionMessage.includes("最终总结") && !/CCM_AGENT_RECEIPT|trace_id|global_run_id|WorkerContextPacket|Trace|内部回执/.test(globalDirectCompletionMessage),
        globalDirectDispatchContinuationSyncReady: (0, collaboration_1.shouldNotifyGlobalDirectDispatchContinuation)(globalDirectContinuationTask, "in_progress") === true && (0, collaboration_1.shouldNotifyGlobalDirectDispatchContinuation)(globalDirectContinuationAlreadyNotifiedTask, "in_progress") === false && (0, collaboration_1.shouldNotifyGlobalDirectDispatchContinuation)(globalDirectCompletionTask, "in_progress") === false,
        globalDirectDispatchContinuationMessageFriendly: globalDirectContinuationMessage.includes("补充要求")
            && globalDirectContinuationMessage.includes("保留旧支付表")
            && globalDirectContinuationMessage.includes("停止当前执行轮")
            && globalDirectContinuationMessage.includes("这还不是完成结果")
            && !/CCM_AGENT_RECEIPT|trace_id|global_run_id|WorkerContextPacket|Trace|内部回执/.test(globalDirectContinuationMessage),
        globalDirectDispatchRollbackSyncReady: (0, collaboration_1.shouldNotifyGlobalDirectDispatchRollback)(globalDirectRollbackTask, "done") === true && (0, collaboration_1.shouldNotifyGlobalDirectDispatchRollback)(globalDirectRollbackAlreadyNotifiedTask, "done") === false,
        globalDirectDispatchRollbackMessageFriendly: globalDirectRollbackMessage.includes("已安全撤销") && globalDirectRollbackMessage.includes("不再视为已交付") && globalDirectRollbackMessage.includes("重新读取当前代码状态") && !/CCM_AGENT_RECEIPT|trace_id|global_run_id|WorkerContextPacket/.test(globalDirectRollbackMessage),
        teamShutdownGateBlocksOpenSession: openTeamSummary.acceptance_gate_passed === false && openTeamSummary.acceptance_gate?.failed_checks?.some((item) => item.id === "team_shutdown") && openTeamSummary.team_shutdown?.open_session_count === 1,
        teamShutdownGatePassesAfterClose: closedTeamSummary.team_shutdown?.open_session_count === 0
            && closedTeamSummary.team_shutdown?.pass === true
            && !closedTeamSummary.acceptance_gate?.failed_checks?.some((item) => item.id === "team_shutdown"),
        independentReviewGateBlocksComplexChange: missingIndependentReviewSummary.independent_review_required === true
            && missingIndependentReviewSummary.independent_review_gate_passed === false
            && missingIndependentReviewSummary.acceptance_gate?.failed_checks?.some((item) => item.id === "independent_review"),
        independentReviewGatePassesWithEvidence: reviewedIndependentSummary.independent_review_required === true
            && reviewedIndependentSummary.independent_review_gate_passed === true
            && !reviewedIndependentSummary.acceptance_gate?.failed_checks?.some((item) => item.id === "independent_review"),
        independentReviewGapDraftGuidesReviewer: independentReviewGapDraft.includes("复杂变更独立复核")
            && independentReviewGapDraft.includes("request_review")
            && independentReviewGapDraft.includes("independentReview"),
        independentReviewFailedGapDraftRoutesRework: failedIndependentReviewGapDraft.includes("复核未通过")
            && failedIndependentReviewGapDraft.includes("原实现成员返工")
            && failedIndependentReviewGapDraft.includes("重新运行 TestAgent"),
        liveTodoPlanVisible: card.live_todo_plan?.source === "ccm-live-task-todo" && Array.isArray(card.mainAgentDecision?.user_plan_steps) && card.mainAgentDecision.user_plan_steps.some((step) => step.id === "final_delivery_report" && step.status === "completed"),
        groupWeakAcceptanceOnlyStaysInReview: weakAcceptanceOnlyLifecycle.state === "acceptance"
            && weakAcceptanceOnlyLifecycle.terminal === false
            && weakAcceptanceOnlyCard.phase === "reviewing"
            && weakAcceptanceOnlyCard.delivery?.acceptance_passed === false
            && weakAcceptanceOnlyCard.acceptance_review?.pass === false
            && weakAcceptanceOnlyCard.acceptance_review?.missing?.includes("目标覆盖")
            && weakAcceptanceOnlyCard.blockers?.includes("最终验收缺少真实验证或复核证据")
            && !weakAcceptanceOnlyCard.mainAgentDecision?.verify?.passed
            && weakAcceptanceOnlyCard.mainAgentDecision?.user_plan_steps?.some((step) => step.id === "coordinator_review" && step.status === "reviewing")
            && !weakAcceptanceOnlyCard.mainAgentDecision?.user_plan_steps?.some((step) => step.id === "final_delivery_report" && step.status === "completed")
            && !weakAcceptanceOnlyCard.actions?.some((action) => action.kind === "rollback"),
        workItemsVisible: card.work_items?.some((item) => item.target === "collab-web" && item.status === "completed") && card.work_item_summary?.all_completed === true,
        workItemSelfTestPasses: workItemSelfTest.pass === true,
        workerHandoffSelfTestPasses: workerHandoffSelfTest.pass === true,
        globalMemoryHealthGateReceiptSelfTestPasses: globalMemoryHealthGateReceiptSelfTest.pass === true,
        taskAgentMemoryContextSnapshotReceiptSelfTestPasses: taskAgentMemoryContextSnapshotReceiptSelfTest.pass === true,
        workerContinuationHandoffBuildsRuntime: workerContinuationRuntime?.schema === "ccm-worker-continuation-handoff-v1"
            && workerContinuationRuntime?.replan_required === true
            && workerContinuationRuntime?.interrupt_current_run === true
            && workerContinuationRuntime?.latest_user_change?.includes("保留旧支付表")
            && workerContinuationRuntime?.previous_goal?.includes("重构支付流程")
            && workerContinuationRuntime?.instructions?.some((item) => item.includes("不要继续已停止执行轮中的旧方向")),
        workerContinuationHandoffRenderedForDispatch: workerContinuationRuntimeHandoff?.scope?.continuation?.schema === "ccm-worker-continuation-handoff-v1"
            && workerContinuationRuntimeRendered.includes("接续/目标调整说明")
            && workerContinuationRuntimeRendered.includes("最新用户要求")
            && workerContinuationRuntimeRendered.includes("保留旧支付表")
            && workerContinuationRuntimeRendered.includes("旧目标仅作背景")
            && workerContinuationRuntimeRendered.includes("不要继续已停止执行轮中的旧方向")
            && workerContinuationRuntimeRendered.includes("已有验证证据")
            && !/基于你的发现|based on your findings/i.test(workerContinuationRuntimeRendered),
        liveTodoReviewing: reviewingCard.mainAgentDecision?.user_plan_steps?.some((step) => step.id === "coordinator_review" && step.status === "reviewing"),
        liveTodoReworking: reworkingCard.mainAgentDecision?.user_plan_steps?.some((step) => step.status === "reworking"),
        continuationStatusVisible: continuationCard.continuation_status?.schema === "ccm-main-agent-continuation-status-v1"
            && continuationCard.continuation_status?.target === "collab-web"
            && continuationCard.workflow_timeline?.some((item) => item.label.includes("下一步派发")),
        goalRevisionContinuationStatusVisible: goalRevisionContinuationCard.continuation_status?.schema === "ccm-main-agent-continuation-status-v1"
            && goalRevisionContinuationCard.continuation_status?.replan_required === true
            && goalRevisionContinuationCard.continuation_status?.interrupt_current_run === true
            && goalRevisionContinuationCard.continuation_status?.kind_label === "目标调整"
            && goalRevisionContinuationCard.continuation_status?.status === "interrupting"
            && goalRevisionContinuationCard.continuation_status?.route_label === "先停止当前轮再重核计划"
            && goalRevisionContinuationCard.continuation_status?.handoff_steps?.some((item) => item.label === "停止当前轮并重核计划")
            && goalRevisionContinuationCard.workflow_timeline?.some((item) => item.label.includes("目标调整")),
        continuationStatusHidesProtocol: !!continuationVisibleText
            && !visibleInternalTermPattern.test(continuationVisibleText),
        liveTodoFailedNeedsConfirmation: failedCard.mainAgentDecision?.user_plan_steps?.some((step) => ["needs_confirmation", "failed"].includes(step.status)),
        liveTodoCancelled: revertedCard.mainAgentDecision?.user_plan_steps?.some((step) => step.status === "cancelled"),
        liveTodoRestoresRecoveryContext: recoveryCard.recovery_summary?.schema === "ccm-main-agent-recovery-summary-v1"
            && recoveryCard.recovery_summary?.revalidated?.goal === true
            && recoveryCard.recovery_summary?.status_label === "已自动接上"
            && recoveryCard.recovery_summary?.preserved?.includes("已保留你之前确认的执行授权")
            && recoveryCard.recovery_summary?.headline?.includes("服务重启后，我已自动接上这轮任务")
            && recoveryCard.recovery_summary?.technical?.decision_code === "authorized_incomplete_task"
            && recoveryCard.mainAgentDecision?.user_plan_steps?.some((step) => step.id === "restore_task_context" && step.status === "completed"),
        liveTodoEvidenceTraceable: card.mainAgentDecision?.user_plan_steps?.every((step) => Array.isArray(step.evidence) && step.evidence.length > 0),
        liveTodoFailureHasActions: failedCard.mainAgentDecision?.user_plan_steps?.some((step) => ["needs_confirmation", "failed"].includes(step.status) && Array.isArray(step.actions) && step.actions.some((action) => ["retry", "gap_continue", "switch_executor", "cancel"].includes(action.kind))),
        agentQaVisible: card.agent_questions[0]?.label === "已采纳并继续",
        agentQaUserPreviewVisible: card.agent_questions[0]?.schema === "ccm-agent-qa-user-preview-v1"
            && card.agent_questions[0]?.summary?.includes("backend 的回答已被我采纳")
            && card.agent_questions[0]?.next_action?.includes("继续原任务执行"),
        agentQaUserPreviewHidesProtocol: !visibleInternalTermPattern.test(collectVisibleTextValues(card.agent_questions).join("\n")),
        conflictWarningsVisible: card.conflict_warnings[0]?.title.includes("frontend"),
        greetingDoesNotCreateTaskCard: (0, collaboration_1.classifyGroupProjectTaskIntent)("你好").executable === false,
        ordinaryQuestionDoesNotCreateTaskCard: (0, collaboration_1.classifyGroupProjectTaskIntent)("这个知识库怎么用？").executable === false,
        explicitDevelopmentCreatesTaskCard: (0, collaboration_1.classifyGroupProjectTaskIntent)("帮我给项目A新增支付接口并改前端页面").executable === true,
        groupIntentGatewayBlocksRuleFallbackWrite: gatewayFallbackBlocked.executable === false && gatewayFallbackBlocked.agent_gateway?.llm_backed === false,
        groupIntentGatewayAllowsLlmDelegate: gatewayLlmDelegates.executable === true && gatewayLlmDelegates.agent_gateway?.llm_backed === true,
        groupIntentGatewayKeepsLlmDirectAnswerReadOnly: gatewayLlmDirectAnswer.executable === false && gatewayLlmDirectAnswer.analysisEligible === true,
        projectTaskModeQuestionDoesNotCreatePersistentTask: (0, collaboration_1.shouldCreatePersistentGroupTask)({ isOrchestrated: true, messageMode: "project_task", taskIntent: (0, collaboration_1.classifyGroupProjectTaskIntent)("你好，这是一个什么项目") }) === false,
        projectTaskQuestionUsesReadOnlyAnalysis: (0, collaboration_1.shouldUseProjectAnalysisMode)({ isOrchestrated: true, messageMode: "project_task", taskIntent: (0, collaboration_1.classifyGroupProjectTaskIntent)("你好，这是一个什么项目") }) === true,
        explicitAnalysisGreetingDoesNotReadProjects: (0, collaboration_1.shouldUseProjectAnalysisMode)({ isOrchestrated: true, messageMode: "project_analysis", taskIntent: (0, collaboration_1.classifyGroupProjectTaskIntent)("你好") }) === false,
        explicitAnalysisModeReadsProjectContext: (0, collaboration_1.shouldUseProjectAnalysisMode)({ isOrchestrated: true, messageMode: "project_analysis", taskIntent: (0, collaboration_1.classifyGroupProjectTaskIntent)("这个项目架构是什么") }) === true,
        projectAnalysisReadsSafeCodeSnapshot: codeSnapshotSelfTest.pass === true,
        forceTaskCanBypassIntentGate: (0, collaboration_1.shouldCreatePersistentGroupTask)({ isOrchestrated: true, messageMode: "project_task", taskIntent: (0, collaboration_1.classifyGroupProjectTaskIntent)("你好"), forceProjectTask: true }) === true,
        nonTaskCardIsHidden: greetingCard.visible === false,
        planModeHighRiskRequiresConfirmation: highRiskPlan.requiresConfirmation === true && highRiskPlan.level === "high",
        planModeLowRiskAutoContinues: lowRiskPlan.requiresConfirmation === false && lowRiskPlan.level === "low",
        awaitingPlanCardNeedsUser: awaitingPlanCard.phase === "needs_user" && awaitingPlanCard.actions.some((item) => item.kind === "confirm_plan"),
        awaitingPlanCardShowsPlan: awaitingPlanCard.plan_mode?.requires_confirmation === true && awaitingPlanCard.plan_mode?.read_only_exploration?.code_snapshot_used === true,
        planModeStepsVisible: card.plan_mode?.steps?.some((item) => item.id === "dispatch_sub_agents" && item.label?.includes("派发子 Agent")),
        awaitingPlanCardShowsSteps: awaitingPlanCard.plan_mode?.steps?.some((item) => item.id === "confirm_boundary" && item.status === "needs_confirmation")
            && awaitingPlanCard.plan_mode?.steps?.some((item) => item.id === "verify_and_summarize" && item.label?.includes("总结")),
        awaitingPlanCardShowsClarificationQuestions: awaitingPlanCard.plan_mode?.needs_clarification === true
            && awaitingPlanCard.plan_mode?.clarification_questions?.some((item) => item.id === "compatibility_boundary")
            && awaitingPlanCard.plan_mode?.clarification_questions?.some((item) => item.question?.includes("验收结果")),
        awaitingPlanCardCanRevise: awaitingPlanCard.actions.some((item) => item.kind === "revise_plan") && awaitingPlanCard.actions.some((item) => item.kind === "cancel"),
        revisedPlanCardStaysInPlanMode: revisedPlanCard.phase === "needs_user" && revisedPlanCard.actions.some((item) => item.kind === "confirm_plan") && revisedPlanCard.actions.some((item) => item.kind === "revise_plan"),
        revisedPlanFeedbackVisible: revisedPlanCard.plan_mode?.revision?.feedback?.includes("保留旧支付表") && revisedPlanCard.plan_mode?.revision?.next_step?.includes("重新确认"),
        revisedPlanAnswersClarificationQuestions: revisedPlanCard.plan_mode?.needs_clarification === false
            && revisedPlanCard.plan_mode?.clarification_questions?.every((item) => item.status === "answered_by_revision" && item.answer?.includes("保留旧支付表")),
        confirmedPlanFeedbackCarried: acceptedPlanDraft.requires_confirmation === false
            && acceptedPlanDraft.auto_continue === true
            && acceptedPlanDraft.accepted_feedback.includes("README")
            && acceptedPlanDraft.acceptance.some((item) => item.includes("README")),
        confirmedPlanExecutionFollowupVisible: acceptedPlanDraft.plan_execution_followup?.schema === "ccm-main-agent-plan-execution-followup-v1"
            && acceptedPlanDraft.plan_execution_followup?.headline?.includes("最终总结前逐项核对验收标准"),
        confirmedPlanFeedbackVisible: acceptedPlanCard.plan_mode?.accepted_feedback?.includes("README")
            && acceptedPlanCard.plan_mode?.requires_confirmation === false
            && !acceptedPlanCard.actions.some((item) => item.kind === "confirm_plan"),
        workOrderPreviewVisible: card.work_order_preview?.orders?.some((item) => item.project === "collab-web" && item.allowed_scope?.length && item.acceptance?.length),
        executionStoryShowsCodingFlow: ["read_context", "prepare_work_orders", "dispatch_agents", "edit_files", "run_checks", "final_review"].every(id => card.execution_story?.steps?.some((item) => item.id === id)),
        acceptanceReviewHardGateVisible: card.acceptance_review?.checks?.some((item) => item.id === "actual_diff" && item.ok) && card.acceptance_review?.checks?.some((item) => item.id === "verification" && item.ok),
        missingEvidenceAcceptanceReviewBlocksCompletion: missingEvidenceCard.acceptance_review?.pass === false && missingEvidenceCard.acceptance_review?.missing?.includes("真实文件改动") && missingEvidenceCard.acceptance_review?.missing?.includes("已执行验证"),
        memoryGateAcceptanceReviewVisible: memoryGateGapCard.acceptance_review?.checks?.some((item) => item.id === "memory_gate_receipt" && item.ok === false && /记忆使用声明/.test(item.detail || "")),
        reinjectionGateAcceptanceReviewVisible: reinjectionGateGapCard.acceptance_review?.checks?.some((item) => item.id === "post_compact_reinjection_gate_receipt" && item.ok === false && /压缩后上下文恢复/.test(item.detail || "")),
        planAlignmentVisible: card.plan_alignment?.schema === "ccm-main-agent-plan-alignment-v1"
            && card.plan_alignment?.status === "aligned"
            && card.plan_alignment?.checks?.some((item) => item.label.includes("npm test") && item.ok),
        missingEvidencePlanAlignmentShowsDeviation: missingEvidenceCard.plan_alignment?.status === "needs_evidence"
            && missingEvidenceCard.plan_alignment?.deviations?.some((item) => item.label.includes("负责人筛选文件改动")),
        userHandoffVisible: card.user_handoff?.schema === "ccm-main-agent-user-handoff-v1"
            && ["view_changes", "gap_continue"].includes(card.user_handoff?.primary_action?.kind)
            && [card.user_handoff?.primary_action, ...(card.user_handoff?.secondary_actions || [])].some((item) => item?.kind === "view_changes")
            && card.user_handoff?.evidence?.some((item) => item.includes("计划核对")),
        userHandoffSummaryCardsVisible: card.user_handoff?.summary_cards?.some((item) => item.id === "verification" && item.label === "验证状态")
            && card.user_handoff?.summary_cards?.some((item) => item.id === "next" && item.label === "下一步"),
        ordinaryQuestionHasNoUserHandoff: greetingCard.user_handoff === null || greetingCard.user_handoff === undefined,
        userHandoffHidesProtocol: !/CCM_AGENT_RECEIPT|trace_id|session_id|WorkerContextPacket|raw receipt|raw payload|原始回执/i.test(JSON.stringify(card.user_handoff || {})),
        agentCoordinationProtocolVisible: card.agent_coordination?.source === "main-child-agent-coordination-6.0" && card.agent_coordination?.handoff?.some((item) => item.agent === "collab-web" && item.status === "accepted"),
        agentCoordinationHeartbeatVisible: card.agent_coordination?.heartbeat?.some((item) => /collab-web/.test(item.text)),
        agentCoordinationContractSyncVisible: card.agent_coordination?.contract_sync?.required === true && card.agent_coordination?.contract_sync?.status === "structured",
        agentCoordinationReceiptQualityScores: card.agent_coordination?.receipt_quality?.some((item) => item.agent === "collab-web" && item.quality?.grade === "good"),
        childAgentPlanReviewVisible: card.agent_coordination?.child_plan_review?.schema === "ccm-child-agent-plan-review-v1"
            && card.agent_coordination?.child_plan_review?.status === "approved"
            && card.agent_coordination?.child_plan_review?.rows?.some((item) => item.agent === "collab-web" && item.verification_plan?.includes("npm test")),
        childAgentPlanReviewNeedsRevisionVisible: ackGapCard.agent_coordination?.child_plan_review?.status === "needs_revision"
            && ackGapCard.agent_coordination?.child_plan_review?.rows?.some((item) => item.agent === "collab-web" && item.status === "needs_revision"),
        agentCoordinationMemoryGateVisible: memoryGateGapCard.agent_coordination?.memory_gate_summary?.status === "missing_receipt_reference"
            && memoryGateGapCard.agent_coordination?.receipt_quality?.some((item) => item.agent === "collab-web" && item.quality?.memory_gate?.missing_gate_ids?.includes("gmd_ux_gate")),
        agentCoordinationReinjectionGateVisible: reinjectionGateGapCard.agent_coordination?.post_compact_reinjection_gate_summary?.required === true
            && reinjectionGateGapCard.agent_coordination?.post_compact_reinjection_gate_summary?.pass === false,
        agentCoordinationReinjectionUsageGateVisible: reinjectionUsageGapCard.agent_coordination?.post_compact_reinjection_gate_summary?.status === "missing_candidate_usage"
            && reinjectionUsageGapCard.agent_coordination?.post_compact_reinjection_gate_summary?.missing_candidate_usage_gate_ids?.includes("pcrg_ux_usage_gate")
            && reinjectionUsageGapCard.agent_coordination?.post_compact_reinjection_gate_summary?.missing_candidate_usage_candidate_ids?.includes("pcrc_ux_test")
            && reinjectionUsageGapCard.agent_coordination?.post_compact_reinjection_gate_summary?.candidate_usage_counts?.mentioned >= 1,
        childAgentHandoffQualityGateBlocksAdvisoryResult: handoffOnlyCard.agent_coordination?.receipt_quality?.some((item) => item.agent === "collab-web"
            && item.quality?.handoff_quality?.pass === false
            && item.quality?.missing?.includes("完成执行而非仅建议")),
        childAgentHandoffQualityCreatesTargetedRework: handoffOnlyCard.agent_coordination?.targeted_rework?.some((item) => item.id === "handoff_only_receipt"
            && item.target === "collab-web"
            && item.title === "要求补齐真实执行证据"),
        childAgentHandoffQualityVisibleTextFriendly: !visibleInternalTermPattern.test(collectVisibleTextValues({
            targeted_rework: handoffOnlyCard.agent_coordination?.targeted_rework?.map((item) => ({ title: item.title, reason: item.reason, label: item.label })),
            events: handoffOnlyCard.agent_coordination?.coordination_events?.map((item) => ({ label: item.label, detail: item.detail })),
            next_action: handoffOnlyCard.agent_coordination?.next_action,
        }).join("\n")),
        agentCoordinationTargetedReworkForMissingEvidence: missingEvidenceCard.agent_coordination?.targeted_rework?.some((item) => item.id === "missing_diff") && missingEvidenceCard.agent_coordination?.targeted_rework?.some((item) => item.id === "missing_verification"),
        agentProgressSummaryVisible: card.agent_progress_summary?.schema === "ccm-child-agent-progress-summary-v1"
            && card.agent_progress_summary?.rows?.some((item) => item.agent === "collab-web" && item.status === "completed" && item.status_label === "已回传结果" && item.files_changed_count >= 1)
            && card.agent_progress_summary?.rows?.some((item) => item.agent === "collab-web" && item.evidence?.some((evidence) => evidence.value === "已回传结果" || evidence.id === "files")),
        agentProgressSummaryHidesProtocol: !/CCM_AGENT_RECEIPT|trace_id|session_id|WorkerContextPacket|raw receipt|raw payload|原始回执/i.test(JSON.stringify(card.agent_progress_summary || {})),
        agentProgressSummaryTracksWaitingAgent: missingEvidenceCard.agent_progress_summary?.rows?.some((item) => item.agent === "collab-web" && item.current_focus?.includes("负责人筛选") && ["running", "pending"].includes(item.status)),
        agentProgressSummaryUsesSessionProgress: sessionProgressCard.agent_progress_summary?.rows?.some((item) => item.agent === "collab-web"
            && item.status === "running"
            && item.summary?.includes("已连续推进 2 轮")
            && item.evidence?.some((evidence) => evidence.id === "session_progress" && evidence.detail?.includes("上下文已保留"))),
        agentProgressSummarySessionProgressHidesProtocol: !/session_id|nativeSessionId|native_session|cursor-session|task_agent_session/i.test(JSON.stringify(sessionProgressCard.agent_progress_summary || {})),
        changeSummaryVisible: card.change_summary?.schema === "ccm-main-agent-change-summary-v1"
            && card.change_summary?.files?.some((item) => item.path === "frontend/app.js" && item.project === "collab-web")
            && card.change_summary?.file_count >= 2,
        changeSummaryActionDataReady: card.change_summary?.next_action?.includes("查看具体文件 diff") && card.actions.some((item) => item.kind === "view_changes"),
        receiptReworkSummaryVisible: missingEvidenceCard.receipt_rework_summary?.schema === "ccm-main-agent-receipt-rework-summary-v1"
            && missingEvidenceCard.receipt_rework_summary?.gaps?.some((item) => item.id === "missing_receipt" && item.target === "collab-web")
            && missingEvidenceCard.receipt_rework_summary?.gaps?.every((item) => item.action?.kind === "targeted_rework"),
        receiptReworkMemoryGateGapVisible: memoryGateGapCard.receipt_rework_summary?.gaps?.some((item) => item.id === "memory_gate_receipt" && item.target === "collab-web" && /gmd_ux_gate/.test(item.reason || "")),
        receiptReworkReinjectionGateGapVisible: reinjectionGateGapCard.receipt_rework_summary?.gaps?.some((item) => item.id === "post_compact_reinjection_gate_receipt" && item.target === "collab-web" && /pcrg_ux_gate/.test(item.reason || "")),
        receiptReworkReinjectionUsageGapVisible: reinjectionUsageGapCard.receipt_rework_summary?.gaps?.some((item) => item.id === "post_compact_reinjection_gate_receipt" && item.target === "collab-web" && /使用状态|used\/ignored\/verified|pcrg_ux_usage_gate/.test(item.reason || "")),
        receiptReworkResolvedVisible: receiptResolvedCard.receipt_rework_summary?.status === "passed"
            && receiptResolvedCard.receipt_rework_summary?.resolved?.some((item) => item.target === "collab-web" && item.status === "passed")
            && !receiptResolvedCard.receipt_rework_summary?.gaps?.length,
        receiptReworkVisibleTextHidesProtocol: !!receiptReworkVisibleText
            && !visibleInternalTermPattern.test(receiptReworkVisibleText)
            && receiptReworkVisibleText.includes("结果说明"),
        agentCoordinationVisibleTextHidesProtocol: !!coordinationVisibleText
            && !visibleInternalTermPattern.test(coordinationVisibleText)
            && coordinationVisibleText.includes("结果说明"),
        agentCoordinationAckReviewApproved: card.agent_coordination?.ack_review?.rows?.some((item) => item.agent === "collab-web" && item.status === "approved"),
        agentCoordinationContractTransferReady: card.agent_coordination?.contract_transfer?.rows?.some((item) => item.target === "collab-web" && item.status === "ready_to_inject"),
        ackGapBlocksCompletion: (0, collaboration_1.canCompleteDailyDevFromDeliverySummary)(ackGapTask, { status: "done" }, ackGapTask.delivery_summary) === false,
        ackGapCreatesRewriteDraft: (0, collaboration_1.getTaskGapItems)(ackGapTask).some((item) => item.startsWith("ack_rewrite:collab-web")) && ackGapDraft.includes("需要先返工的 ACK 前置审核"),
        contractGapCreatesInjectionDraft: (0, collaboration_1.getTaskGapItems)(contractGapTask).some((item) => item.startsWith("contract_inject:collab-web")) && contractGapDraft.includes("需要注入依赖 Agent 的 contractChanges") && contractGapDraft.includes("collab-web"),
        recoveredTestAgentFailureDoesNotRemainGap: !(0, collaboration_1.getTaskGapItems)(recoveredTestAgentNotificationTask).some((item) => item.startsWith("notification:test-agent:")),
        coordinatorOwnedReviewNeedDoesNotRemainGap: !(0, collaboration_1.getTaskGapItems)(recoveredTestAgentNotificationTask).some((item) => item.startsWith("need:")),
        coordinatorOwnedReviewNeedIsAdvisory: (0, collaboration_1.isAdvisoryNeed)("等待主 Agent 重新运行 TestAgent 复核本轮返工修复") === true,
        coordinatorOwnedDirectReviewNeedIsAdvisory: (0, collaboration_1.isAdvisoryNeed)("主 Agent 调用 TestAgent 重新执行独立复核，确认 CCM_TEST_AGENT_REVIEW=1 路径通过") === true,
        genericCoordinatorNeedsUserStateIsNotAConcreteBlocker: (0, collaboration_1.isAdvisoryNeed)("主 Agent 需要用户补充") === true,
        sameSessionReworkInheritsApprovedAck: sameSessionReworkReceipts[0]?.ack?.understoodGoal === "完成目标",
        differentSessionReworkDoesNotInheritAck: !differentSessionReworkReceipts[0]?.ack,
        targetedReworkIncludesWorkItemContext: workItemReworkDraft.includes("相关执行队列工作项") && workItemReworkDraft.includes("状态=failed") && workItemReworkDraft.includes("缺少 npm test 执行结果"),
        watchdogSeesStalledWorkItem: workItemWatchdogStatus.work_item_stalled?.some((item) => item.work_item_id === "wi-stalled" && item.target === "collab-web"),
        contractInjectionGateRequiresConsumerReceipt: contractDispatchedUnconsumedGate.pass === false && contractDispatchedUnconsumedGate.status === "needs_consumption" && contractDispatchedUnconsumedGate.unconsumed[0]?.injection_id === contractInjectionId,
        contractInjectionGateRecognizesConsumerRerun: contractConsumedGate.pass === true && contractConsumedGate.rows[0]?.assignment_message_id === "m-contract" && contractConsumedGate.rows[0]?.consumed === true,
        contractInjectionGateRequiresConsumptionQuality: contractWeakConsumptionGate.pass === false && contractWeakConsumptionGate.rows[0]?.missing_reason === "needs_consumption_evidence",
        contractInjectionGateRejectsGenericApiAssignment: contractGenericApiGate.pass === false && contractGenericApiGate.rows[0]?.assignment_message_id === "",
        taskCardShowsRuntimeKernel: runtimeKernelCard.runtime_kernel?.ack_only?.active === true && runtimeKernelCard.runtime_kernel?.injection_ids?.includes("ci_selftest") && runtimeKernelCard.technical?.runtime_kernel?.worker_context_packet_ids?.includes("wcp_selftest"),
        runtimeKernelShowsMemoryGate: memoryGateGapCard.runtime_kernel?.memory_gate?.status === "missing_receipt_reference" && memoryGateGapCard.runtime_kernel?.memory_gate?.gate_ids?.includes("gmd_ux_gate"),
        runtimeKernelShowsReinjectionGate: reinjectionGateGapCard.runtime_kernel?.post_compact_reinjection_gate?.status === "missing_receipt_reference" && reinjectionGateGapCard.runtime_kernel?.post_compact_reinjection_gate?.gate_ids?.includes("pcrg_ux_gate"),
        runtimeKernelShowsReinjectionUsageGate: reinjectionUsageGapCard.runtime_kernel?.post_compact_reinjection_gate?.status === "missing_candidate_usage" && reinjectionUsageGapCard.runtime_kernel?.post_compact_reinjection_gate?.missing_candidate_usage_gate_ids?.includes("pcrg_ux_usage_gate"),
        agentCoordinationEventStreamVisible: ["work_order_sent", "ack_received", "contract_changed", "receipt_scored"].every(type => card.agent_coordination?.coordination_events?.some((item) => item.type === type)),
        agentCoordinationMemoryGateEventVisible: memoryGateGapCard.agent_coordination?.coordination_events?.some((item) => item.type === "memory_gate_receipt" && item.status === "warn"),
        agentCoordinationReinjectionGateEventVisible: reinjectionGateGapCard.agent_coordination?.coordination_events?.some((item) => item.type === "post_compact_reinjection_gate_receipt" && item.status === "warn"),
        acceptanceReviewIncludesAckGate: card.acceptance_review?.checks?.some((item) => item.id === "ack_gate" && item.ok),
        agentCoordinationContractInjectAction: card.agent_coordination?.targeted_rework?.some((item) => item.id === "contract_inject" && item.target === "collab-web"),
        reportHasFourUserSections: ["完成内容", "涉及范围", "验证结果", "风险与待确认", "下一步"].every(label => report.includes(label)),
        reportHidesProtocol: !/CCM_AGENT_RECEIPT|Trace|session|scratchpad|门禁|派发证据/i.test(report),
        groupReportFormatsObjects: groupReport.includes("frontend/app.js") && !groupReport.includes("[object Object]"),
        acknowledgementHasCleanPunctuation: !acknowledgement.includes("。。"),
        dispatchLaunchSummaryVisible: dispatchLaunchSummary?.schema === "ccm-main-agent-dispatch-launch-summary-v1"
            && dispatchLaunchSummary?.rows?.[0]?.agent === "collab-web"
            && dispatchLaunchSummary?.headline?.includes("1 个执行成员")
            && dispatchLaunchSummary?.rows?.[0]?.task?.includes("结构化结果说明"),
        dispatchLaunchSummaryHidesProtocol: !/CCM_AGENT_RECEIPT|task-notification|receipt-status|raw payload|trace_id|session_id/i.test(JSON.stringify(dispatchLaunchSummary || {})),
        dispatchLaunchSummaryDoneTargetStaysReviewing: completedTargetDispatchLaunchSummary?.rows?.[0]?.status === "reviewing"
            && completedTargetDispatchLaunchSummary?.rows?.[0]?.status_label === "已回传结果，待验收"
            && !JSON.stringify(completedTargetDispatchLaunchSummary || {}).includes("已完成"),
        followupClassification: (0, collaboration_1.classifyTaskContinuation)("再加一个负责人筛选") === "supplement" && (0, collaboration_1.classifyTaskContinuation)("目标调整为只改前端") === "revise_goal" && (0, collaboration_1.classifyTaskContinuation)("这是一个新任务：部署测试环境") === "new_task",
        qualityFollowupContinuationDecision: (() => {
            const decision = (0, collaboration_1.buildContinuationUserDecision)({
                source: "quality_followup",
                kind: "supplement",
                meta: { reason: "补齐交付证据、验证结果和验收结论" },
            });
            return decision.strategy === "complete_quality_followup"
                && decision.title === "交付总结补齐已接上"
                && decision.route_label === "补齐交付总结"
                && decision.headline.includes("验证结果")
                && decision.next_action.includes("可验收总结")
                && decision.timeline_type === "quality_followup_continuation";
        })(),
        followupDetection: (0, collaboration_1.looksLikeTaskContinuation)("再加一个状态筛选"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, card, report };
}
//# sourceMappingURL=collaboration-ux-self-tests.js.map