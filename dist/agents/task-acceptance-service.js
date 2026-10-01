"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTaskAcceptance = startTaskAcceptance;
exports.taskAcceptanceVerificationMetadata = taskAcceptanceVerificationMetadata;
exports.validateUnifiedTaskAcceptance = validateUnifiedTaskAcceptance;
exports.unifiedTaskTerminalDecision = unifiedTaskTerminalDecision;
exports.replayAcceptanceTerminal = replayAcceptanceTerminal;
exports.taskAcceptanceProjection = taskAcceptanceProjection;
const execution_session_registry_1 = require("./execution-session-registry");
const acceptance_user_projection_1 = require("./acceptance-user-projection");
const acceptance_contract_1 = require("./acceptance-contract");
const acceptance_ledger_1 = require("./acceptance-ledger");
function startTaskAcceptance(task, root) {
    const contract = (0, acceptance_contract_1.taskAcceptanceContract)(task);
    if (!contract)
        return;
    const validation = (0, acceptance_contract_1.validateAcceptanceContract)(contract);
    if (!validation.valid)
        throw new Error(`验收合同无效：${validation.issues.join("；")}`);
    if (typeof root === "string" && new Set(contract.workItems.map(w => w.projectId)).size !== 1)
        throw new Error("跨项目验收必须逐项目绑定真实工作区，不能复用同一路径");
    for (const item of contract.workItems) {
        const workRoot = typeof root === "string" ? root : root[item.projectId];
        if (!workRoot)
            throw new Error("验收项目工作区绑定缺失");
        const session = (0, execution_session_registry_1.createExecutionSession)({ taskId: task.id, workItemId: item.id, projectId: item.projectId, generation: contract.generation });
        if (session.generation !== contract.generation)
            throw new Error("验收执行会话 generation 不匹配");
        (0, acceptance_ledger_1.registerAcceptanceExecution)(contract, { workItemId: item.id, projectId: item.projectId, executionSessionId: session.id,
            attempt: Math.max(1, Number(task.execution_attempt || task.attempt || 1)), root: workRoot });
    }
}
function taskAcceptanceVerificationMetadata(taskId, project) {
    const ledger = (0, acceptance_ledger_1.readAcceptanceLedger)(taskId);
    if (!ledger)
        return {};
    const contexts = ledger.contract.workItems.filter(w => w.projectId === project).map(w => {
        const run = ledger.executions.filter(r => r.workItemId === w.id).slice(-1)[0];
        if (!run)
            throw new Error("验收执行记录缺失");
        return (0, acceptance_ledger_1.beginAcceptanceVerification)(taskId, run.id);
    });
    return { acceptanceContract: ledger.contract, acceptanceExecutions: contexts };
}
/** Called before any lifecycle/session mutation, not after setting done. */
function validateUnifiedTaskAcceptance(task, updates) {
    const contract = (0, acceptance_contract_1.taskAcceptanceContract)(task), next = (0, acceptance_contract_1.taskAcceptanceContract)({ ...task, ...updates });
    if (contract && (!next || next.checksum !== contract.checksum))
        return "验收合同不可在任务更新中替换；请通过已确认的新 generation 重新规划";
    if (!next)
        return null; // Historical records remain read-only compatible.
    if (!(0, acceptance_contract_1.validateAcceptanceContract)(next).valid)
        return "验收合同结构或 checksum 无效";
    if (contract && ["done", "completed"].includes(task.status)
        && Object.keys(updates).some(k => ["acceptance_contract", "plan_dispatch_contract", "test_agent_review", "terminal_gate", "terminal_decision", "receipt", "delivery_summary"].includes(k)))
        return "已完成任务的验收与终态回执不可覆盖";
    if (!["done", "completed"].includes(String(updates.status || "")))
        return null;
    if (["done", "completed"].includes(task.status))
        return null;
    const result = (0, acceptance_ledger_1.evaluateAcceptanceLedger)({ ...task, ...updates });
    if (!result.canComplete)
        return `验收证据门禁未通过：${result.issues.join("；")}`;
    const merged = { ...task, ...updates };
    const independent = next.level === "strict" || merged.acceptance_actual_route === "independent_test_agent"
        || merged.acceptance_route === "independent_test_agent" || merged.requires_independent_review === true;
    if (independent) {
        const review = merged.test_agent_review;
        if (review?.canAccept !== true || review?.invocation?.outputValidation?.valid !== true
            || review?.invocation?.artifactVerification?.status !== "passed")
            return "独立 TestAgent 的有效复核回执缺失";
    }
    else if (merged.main_agent_self_verification?.canAccept !== true
        || merged.main_agent_self_verification?.model_status !== "confirmed")
        return "主 Agent 的证据复核回执缺失";
    return null;
}
function unifiedTaskTerminalDecision(task, updates) {
    const contract = (0, acceptance_contract_1.taskAcceptanceContract)({ ...task, ...updates });
    if (!contract)
        return null;
    const merged = { ...task, ...updates }, result = (0, acceptance_ledger_1.evaluateAcceptanceLedger)(merged);
    const done = updates.status === "done";
    const core = { schema: "ccm-task-terminal-decision-v2", task_id: task.id, status: updates.status,
        acceptance_state: done ? "accepted" : updates.status === "failed" ? "rejected" : updates.status,
        actor: "ccm-acceptance-service", gate_passed: done && result.canComplete && !validateUnifiedTaskAcceptance(task, updates),
        contract_checksum: contract.checksum, generation: contract.generation,
        evidence_registry: { evidenceIds: result.evidenceIds, validCount: result.evidenceIds.length, staleCount: 0,
            acceptance: { satisfied: result.canComplete, criteria: result.criteria, evidenceIds: result.evidenceIds } },
        evidence_checksum: (0, acceptance_contract_1.acceptanceHash)(result.evidenceIds), reason: done ? "冻结验收合同与必需证据通过" : String(updates.status || "blocked"),
        decided_at: new Date().toISOString() };
    return { ...core, checksum: (0, acceptance_contract_1.acceptanceHash)(core) };
}
function replayAcceptanceTerminal(task, updates) {
    if ((!(0, acceptance_contract_1.taskAcceptanceContract)(task) && !(0, acceptance_contract_1.isAcceptanceProjectionTask)(task)) || task.status !== "done" || updates.status !== "done")
        return null;
    if (!task.terminal_state_receipt || !task.terminal_decision?.gate_passed)
        throw new Error("终态缺少权威回执，请人工核对");
    return task;
}
function taskAcceptanceProjection(task) {
    const contract = (0, acceptance_contract_1.taskAcceptanceContract)(task);
    if (!contract)
        return { available: false, status: "historical_incomplete", reason: "历史验收不可完整核验", criteria: [] };
    const result = (0, acceptance_ledger_1.evaluateAcceptanceLedger)(task);
    return { available: true, revision: contract.revision, ...(0, acceptance_user_projection_1.acceptanceUserProjection)(result),
        terminalReceiptId: task.terminal_state_receipt?.checksum || null, contentStored: false };
}
//# sourceMappingURL=task-acceptance-service.js.map