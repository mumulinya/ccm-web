"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateTerminalGate = evaluateTerminalGate;
exports.issueTerminalReceipt = issueTerminalReceipt;
function evaluateTerminalGate(input) { const issues = []; if (!Array.isArray(input?.requiredWorkItemIds) || input.requiredWorkItemIds.some((id) => !input.completedWorkItemIds?.includes(id)))
    issues.push("存在未完成工作项"); if (!Array.isArray(input?.requiredAcceptanceCriterionIds) || input.requiredAcceptanceCriterionIds.some((id) => !input.satisfiedAcceptanceCriterionIds?.includes(id)))
    issues.push("存在未满足验收标准"); if (input?.evidenceValid === false)
    issues.push("存在失效证据"); if (input?.blockingFailure === true)
    issues.push("存在阻塞失败"); if (input?.generation !== undefined && input?.currentGeneration !== undefined && Number(input.generation) !== Number(input.currentGeneration))
    issues.push("generation 不匹配"); return { canComplete: issues.length === 0, issues, status: issues.length ? "blocked" : "ready" }; }
function issueTerminalReceipt(input) { const gate = evaluateTerminalGate(input); if (!gate.canComplete)
    throw new Error(`Terminal Gate 未通过：${gate.issues.join("；")}`); return { id: `terminal_${Date.now().toString(36)}`, taskId: input.taskId, generation: input.generation, completedWorkItemIds: input.completedWorkItemIds, satisfiedAcceptanceCriterionIds: input.satisfiedAcceptanceCriterionIds, evidenceIds: input.evidenceIds || [], issuedBy: "CCM", issuedAt: new Date().toISOString(), contentStored: false }; }
//# sourceMappingURL=terminal-gate.js.map