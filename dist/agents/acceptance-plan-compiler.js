"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCEPTANCE_PLAN_DIRECTIVE = void 0;
exports.compilePlanAcceptance = compilePlanAcceptance;
const acceptance_contract_1 = require("./acceptance-contract");
/** Compilation copies explicit plan bindings; it never infers coverage from command names. */
function compilePlanAcceptance(input) {
    const { plan, workItems } = input;
    const checks = [];
    const criteria = [];
    for (const work of workItems) {
        const step = plan.steps.find((s) => s.id === work.stepId);
        const source = Array.isArray(step?.verification) && step.verification.length ? step.verification : plan.verification || [];
        const rows = source.filter((r) => !r.projectId || r.projectId === work.project);
        for (const [index, criterionId] of work.acceptanceCriterionIds.entries()) {
            const description = work.acceptance[index] || "";
            const selected = rows.filter((r) => (r.acceptanceCriterionIds || []).includes(criterionId)
                || (r.acceptanceCriteria || []).includes(description));
            const ids = [];
            for (const row of selected) {
                const id = `av_${(0, acceptance_contract_1.acceptanceHash)([work.workItemId, row.id || row]).slice(0, 24)}`;
                ids.push(id);
                if (checks.some(c => c.id === id))
                    continue;
                const kind = row.kind || (row.command ? "command" : "");
                checks.push({ id, workItemId: work.workItemId, projectId: work.project, kind,
                    cwd: row.cwd || ".", ...(row.command ? { command: row.command } : {}), sourceEvidenceIds: row.sourceEvidenceIds || [],
                    expected: row.expected, assertion: row.assertion, independent: input.strict || row.independent === true });
            }
            const descriptor = (plan.acceptanceDetails || []).find((r) => r.id === criterionId) || {};
            criteria.push({ id: `${work.workItemId}:${criterionId}`, workItemId: work.workItemId, projectId: work.project,
                description, preconditions: descriptor.preconditions || [], action: descriptor.action || selected.map((r) => r.command || r.action || "").filter(Boolean).join("；"),
                expected: descriptor.expected || description,
                verificationGroups: ids.map(id => [id]) });
        }
    }
    return (0, acceptance_contract_1.sealAcceptanceContract)({ schema: "ccm-acceptance-contract-v1", taskId: input.taskId, scope: input.scope,
        scopeId: input.scopeId, exactSessionId: input.exactSessionId, generation: input.generation,
        planId: plan.planId, planRevision: plan.revision, planChecksum: plan.checksum,
        requirementChecksum: plan.requirementBinding?.checksum || plan.businessRequirement?.checksum || "", revision: plan.revision, level: input.strict ? "strict" : "standard",
        workItems: workItems.map(w => ({ id: w.workItemId, projectId: w.project, dependsOn: w.dependsOn,
            editablePaths: w.editablePaths || w.files || [], readOnlyPaths: w.readOnlyPaths || [], forbiddenPaths: w.forbiddenPaths || [],
            cleanupPaths: w.cleanupPaths || [], synchronizedFixturePaths: w.synchronizedFixturePaths || [] })), checks, criteria });
}
exports.ACCEPTANCE_PLAN_DIRECTIVE = `CCM acceptance contract v1:
Every verification row MUST provide acceptanceCriterionIds (the confirmed requirement IDs), projectId,
cwd (relative to the managed project root), sourceEvidenceIds (actually read sources), expected,
kind, and assertion. Do not bind every command to every criterion.
For command checks use assertion {kind:"exit_code",value:0} ONLY for build/test-process completion;
to prove a business return value execute the actual feature and emit JSON, then use
assertion {kind:"json_equals",pointer:"/field",value:EXPECTED_VALUE_FROM_REQUIREMENT}.
Output matching, not command success alone, proves a business condition. Do not invent checks or sources.
Keep fixtures constrained to explicitly named literal fields; no skipped assertions or fabricated success.
An unavailable verification is blocked, not passed. Missing evidence must be repaired before dispatch.
Do not change the confirmed expected outcome or weaken a requirement without user confirmation.`;
//# sourceMappingURL=acceptance-plan-compiler.js.map