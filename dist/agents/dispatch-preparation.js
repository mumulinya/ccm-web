"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compilePreparedDispatch = compilePreparedDispatch;
exports.prepareDirectDispatchTask = prepareDirectDispatchTask;
const plan_dispatch_contract_1 = require("./plan-dispatch-contract");
const implementation_plan_1 = require("./implementation-plan");
const dispatch_profile_1 = require("./dispatch-profile");
const runtime_1 = require("./runtime");
const project_main_agent_source_1 = require("../modules/projects/project-main-agent-source");
const workflow_decision_1 = require("./workflow-decision");
const planning_orchestrator_1 = require("./planning-orchestrator");
const evidence_policy_1 = require("./evidence-policy");
function blocked(code, issues) {
    return Object.assign(new Error(`派发准备未通过：${issues.join("；")}`), { code, issues });
}
/** Compile only a real model plan and actually read source evidence. Never
 * derive verification commands or success assertions from task prose. */
function compilePreparedDispatch(input) {
    const { task, source } = input;
    if (!source?.checksum || source.ready === false)
        throw blocked("CCM_DISPATCH_SOURCE_REQUIRED", ["源码证据不完整"]);
    const projects = Array.isArray(source.projects) ? source.projects : [source];
    const evidence = new Map();
    for (const project of projects)
        for (const file of project.files || []) {
            if (file.path && file.evidenceId)
                evidence.set(`${project.project}:${String(file.path).replace(/\\/g, "/")}`, file.evidenceId);
        }
    const raw = input.plan;
    if (!raw || !Array.isArray(raw.steps) || !raw.steps.length)
        throw blocked("CCM_DISPATCH_PLAN_REQUIRED", ["模型未提供可编译工作项"]);
    const files = (raw.files || []).map((file) => {
        const id = evidence.get(`${file.project}:${String(file.path).replace(/\\/g, "/")}`);
        if (!id || (file.sourceEvidenceIds || []).some((candidate) => candidate !== id))
            throw blocked("CCM_DISPATCH_SOURCE_REQUIRED", ["计划引用了未读取或不属于当前快照的文件"]);
        return { ...file, sourceEvidenceIds: [id] };
    });
    const plan = (0, implementation_plan_1.normalizeImplementationPlanV2)({ ...raw, planId: task.id, files, sourceManifestChecksum: source.checksum,
        revision: Number(task.plan_revision || task.task_spec?.revision || 1) }, { planId: task.id, targetProjects: projects.map((project) => project.project) });
    if (!plan)
        throw blocked("CCM_DISPATCH_PLAN_REQUIRED", ["计划格式无效"]);
    const agentType = input.agentType || "codex";
    const profile = (0, dispatch_profile_1.resolveDispatchProfileSnapshot)(task);
    const contract = (0, plan_dispatch_contract_1.buildPlanDispatchContract)({ plan, taskId: task.id, project: input.project, sourceManifestChecksum: source.checksum,
        generation: Number(task.generation || 0), provider: agentType, agentType,
        capabilities: (0, plan_dispatch_contract_1.providerCapabilitiesFromRuntime)((0, runtime_1.getAgentRuntime)(agentType), { sessionBinding: true }),
        evidencePolicy: (0, evidence_policy_1.resolveEvidencePolicy)({ requiresCodeChanges: task.requires_code_changes === true,
            targetProjects: projects.map((project) => project.project), previousLevel: profile.profile === "strict" ? "strict" : plan.evidencePolicy?.level }),
        worktreeStrategy: profile.requiredGates.requireIsolatedWorktree ? "isolated" : "shared",
        allowedTools: ["read", "edit", "write", "test"], forbiddenPaths: task.dispatch_scope?.forbiddenPaths || [],
        acceptanceScope: profile.profile === "light" ? undefined : { scope: task.assign_type === "group" ? "group" : "project",
            scopeId: task.assign_type === "group" ? task.group_id : task.target_project,
            exactSessionId: task.group_session_id || task.project_session_id || task.exact_session_id }, });
    const validation = (0, plan_dispatch_contract_1.validatePlanDispatchContract)(contract);
    if (!contract.dispatchReady || !validation.valid)
        throw blocked("CCM_DISPATCH_ACCEPTANCE_CONTRACT_REQUIRED", [...contract.blockers, ...validation.issues]);
    return { plan, contract };
}
async function prepareDirectDispatchTask(task, workDir, agentType) {
    if (!task.dispatch_profile_snapshot)
        return task;
    let profile = (0, dispatch_profile_1.resolveDispatchProfileSnapshot)(task);
    const continuing = !!task.task_session_continuation_context && task.plan_revision_required === true;
    if (profile.profile !== "strict" && !continuing)
        return task;
    const tasks = require("../modules/collaboration/collaboration-task-service");
    const main = require("../modules/projects/project-main-agent");
    const manifest = (0, project_main_agent_source_1.buildProjectSourceManifest)(task.target_project, workDir);
    const existing = task.plan_dispatch_contract;
    const acceptance = existing?.acceptanceContract;
    const identityMatches = acceptance?.taskId === task.id && acceptance.scope === "project"
        && acceptance.scopeId === task.target_project
        && acceptance.exactSessionId === (task.project_session_id || task.exact_session_id)
        && acceptance.generation === Number(task.generation || 0)
        && existing.planRevision === Number(task.plan_revision || task.task_spec?.revision || 1);
    if (existing && !identityMatches)
        throw blocked("CCM_DISPATCH_CONTRACT_IDENTITY_CONFLICT", ["既有合同的任务、会话或 revision 不属于当前执行，需确认新计划"]);
    if (existing && existing.sourceManifestChecksum !== manifest.checksum)
        throw blocked("CCM_DISPATCH_SOURCE_DRIFT", ["源码已变化，需确认新 generation 的计划，不能替换冻结合同"]);
    if (existing?.sourceManifestChecksum === manifest.checksum && existing.dispatchReady && (0, plan_dispatch_contract_1.validatePlanDispatchContract)(existing).valid && identityMatches)
        return task;
    const pending = task.dispatch_preparation_plan;
    const planning = (0, planning_orchestrator_1.latestPlanningSession)("project", task.target_project, task.project_session_id || task.exact_session_id);
    const reuseConfirmed = pending && task.intake_state === "confirmed" && planning?.phase === "confirmed"
        && planning.planChecksum === pending.planningSession?.planChecksum
        && planning.revision === pending.planningSession?.revision && pending.sourceEvidence?.manifestChecksum === manifest.checksum;
    const decision = task.workflow_decision && !continuing ? (0, workflow_decision_1.normalizeWorkflowDecision)(task.workflow_decision)
        : await (0, workflow_decision_1.decideWorkflowWithModel)({ message: task.business_goal || task.description || task.title, scope: "project",
            context: { project: task.target_project, dispatchProfile: profile.profile, constraints: task.description } });
    task = tasks.updateTask(task.id, { workflow_decision: decision,
        requires_code_changes: task.requires_code_changes === true || decision.requiresCodeChanges,
        requires_verification: true }) || task;
    if (continuing) {
        const inferred = (0, dispatch_profile_1.resolveDispatchProfileSnapshot)({ ...task, dispatch_profile: null, dispatch_profile_snapshot: null, task_spec: null });
        const rank = { light: 1, standard: 2, strict: 3 };
        if (rank[inferred.profile] > rank[profile.profile])
            task = tasks.updateTask(task.id, { dispatch_profile: inferred.profile }) || task;
        profile = (0, dispatch_profile_1.resolveDispatchProfileSnapshot)(task);
    }
    const plan = reuseConfirmed ? pending : await main.planProjectMainTask({ project: task.target_project, projectSessionId: task.project_session_id || task.exact_session_id,
        taskId: task.id, generation: Number(task.generation || 0), attempt: Number(task.execution_attempt || 1),
        userMessage: task.business_goal || task.description || task.title,
        context: [task.description, require("../modules/collaboration/task-session-continuation-context").renderTaskSessionContinuationContext(task)].filter(Boolean).join("\n\n"),
        acceptanceMode: profile.profile === "strict" ? "test_agent" : "main_agent_self_verification",
        workflowDecision: decision,
    });
    if (plan.requiresConfirmation && !reuseConfirmed) {
        const canonical = plan.planningSession?.plan || main.projectRequirementPlanProjection(plan, { planId: task.id, revision: task.task_spec?.revision || 1 });
        tasks.updateTask(task.id, { status: "blocked", intake_state: "awaiting_confirmation", acceptance_state: "awaiting_plan_confirmation",
            dispatch_preparation_plan: plan, intake_draft: { ...canonical, requires_confirmation: true },
            workflow_meta: { ...(task.workflow_meta || {}), presentedPlan: canonical, plan_mode: { ...canonical, requires_confirmation: true } },
            status_detail: "规划要求人工确认，未启动开发 Agent" });
        throw blocked("CCM_DISPATCH_PLAN_CONFIRMATION_REQUIRED", ["规划仍需人工确认"]);
    }
    const canonical = main.projectRequirementPlanProjection(plan, { planId: task.id, revision: task.task_spec?.revision || 1 });
    const prepared = compilePreparedDispatch({ task, plan: canonical, project: task.target_project, agentType,
        source: { project: task.target_project, checksum: plan.sourceEvidence?.manifestChecksum, files: plan.sourceEvidence?.files || [] } });
    const latestManifest = (0, project_main_agent_source_1.buildProjectSourceManifest)(task.target_project, workDir);
    if (latestManifest.checksum !== prepared.contract.sourceManifestChecksum)
        throw blocked("CCM_DISPATCH_SOURCE_DRIFT", ["规划过程中源码已变化"]);
    const contract = profile.profile === "light" ? null : prepared.contract;
    return tasks.updateTask(task.id, { generation: Number(prepared.contract.acceptanceContract?.generation ?? task.generation ?? 0), plan_dispatch_contract: contract,
        plan_revision_required: false, dispatch_preparation_plan: plan,
        verification_commands: plan.verificationCommands || task.verification_commands || [],
        workflow_meta: { ...(task.workflow_meta || {}), project_main_plan: plan, plan_dispatch_contract: contract },
        dispatch_preparation: { planChecksum: prepared.plan.checksum, sourceChecksum: prepared.contract.sourceManifestChecksum, contentStored: false } });
}
//# sourceMappingURL=dispatch-preparation.js.map