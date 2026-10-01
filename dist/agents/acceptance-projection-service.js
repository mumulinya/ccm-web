"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAcceptanceProjection = evaluateAcceptanceProjection;
exports.acceptanceProjectionUpdate = acceptanceProjectionUpdate;
exports.validateProjectionTerminal = validateProjectionTerminal;
exports.projectionTerminalDecision = projectionTerminalDecision;
const acceptance_contract_1 = require("./acceptance-contract");
/** A display item references every source receipt; it never copies a review into a new identity. */
function evaluateAcceptanceProjection(task, tasks) {
    const ids = [...new Set((Array.isArray(task.mission_dependencies) ? task.mission_dependencies : []).map(String))];
    const issues = [];
    const references = [];
    if (!(0, acceptance_contract_1.isAcceptanceProjectionTask)(task) || !ids.length)
        issues.push("projection_source_binding_missing");
    for (const id of ids) {
        const child = tasks.find(t => t.id === id);
        const receipt = child?.terminal_state_receipt, decision = child?.terminal_decision;
        if (id === task.id || !child || child.status !== "done" || receipt?.task_id !== id || receipt?.status !== "done"
            || !receipt?.checksum || decision?.task_id !== id || !decision?.checksum || decision?.gate_passed !== true
            || child?.terminal_gate?.passed !== true || child.terminal_gate.decision_checksum !== decision.checksum
            || child.test_agent_review?.canAccept !== true) {
            issues.push(`source_not_accepted:${id}`);
            continue;
        }
        const contract = (0, acceptance_contract_1.taskAcceptanceContract)(child);
        if (contract && (decision.contract_checksum !== contract.checksum || decision.generation !== child.generation)) {
            issues.push(`source_contract_mismatch:${id}`);
            continue;
        }
        references.push({ taskId: child.id, generation: child.generation, terminalReceiptChecksum: receipt.checksum,
            terminalDecisionChecksum: decision.checksum, contractChecksum: contract?.checksum || null,
            evidenceIds: decision.evidence_registry?.evidenceIds || [] });
    }
    return { canComplete: issues.length === 0, issues, references };
}
function acceptanceProjectionUpdate(task, tasks) {
    const evaluated = evaluateAcceptanceProjection(task, tasks);
    if (!evaluated.canComplete)
        return { status: "blocked", acceptance_state: "blocked", dependency_blocked: true,
            status_detail: "等待所有绑定子任务的独立验收与服务端终态回执" };
    const core = { schema: "ccm-acceptance-projection-v1", taskId: task.id, references: evaluated.references };
    return { status: "done", acceptance_state: "accepted", dependency_blocked: false,
        acceptance_projection: { ...core, checksum: (0, acceptance_contract_1.acceptanceHash)(core), contentStored: false },
        status_detail: "所有绑定子任务的验收回执已确认；未重复执行验收",
        delivery_summary: { headline: "已确认全部来源验收回执", source_task_ids: evaluated.references.map(r => r.taskId), contentStored: false },
        global_mission_gate_passed: true };
}
function validateProjectionTerminal(task, updates, tasks) {
    if (!(0, acceptance_contract_1.isAcceptanceProjectionTask)(task) || updates.status !== "done")
        return null;
    const evaluated = evaluateAcceptanceProjection(task, tasks);
    if (!evaluated.canComplete)
        return "验收展示项的全部来源终态回执尚未有效，不能完成";
    const expected = acceptanceProjectionUpdate(task, tasks).acceptance_projection;
    if ((updates.acceptance_projection || task.acceptance_projection)?.checksum !== expected?.checksum)
        return "验收展示项的来源回执绑定缺失或已改变";
    for (const field of ["test_agent_review", "review", "receipt", "main_agent_final_acceptance"])
        if (updates[field])
            return "验收展示项只能保存来源引用，不得复制其他任务的回执";
    return null;
}
function projectionTerminalDecision(task, updates, tasks) {
    if (!(0, acceptance_contract_1.isAcceptanceProjectionTask)(task))
        return null;
    const evaluated = evaluateAcceptanceProjection(task, tasks);
    const core = { schema: "ccm-task-terminal-decision-v2", task_id: task.id, status: updates.status,
        acceptance_state: updates.status === "done" ? "accepted" : "blocked", actor: "ccm-acceptance-projection",
        gate_passed: updates.status === "done" && !validateProjectionTerminal(task, updates, tasks),
        source_receipts: evaluated.references, evidence_registry: { evidenceIds: [], validCount: 0, staleCount: 0,
            acceptance: { satisfied: evaluated.canComplete, criteria: [], evidenceIds: [] } },
        evidence_checksum: (0, acceptance_contract_1.acceptanceHash)(evaluated.references), reason: updates.status_detail || "验收回执引用核对",
        decided_at: new Date().toISOString() };
    return { ...core, checksum: (0, acceptance_contract_1.acceptanceHash)(core) };
}
//# sourceMappingURL=acceptance-projection-service.js.map