"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProjectTestTargetBrowserChecks = buildProjectTestTargetBrowserChecks;
exports.projectTestAgentProblems = projectTestAgentProblems;
exports.projectTestAgentReworkProblems = projectTestAgentReworkProblems;
exports.runProjectTaskTestAgentReview = runProjectTaskTestAgentReview;
const test_agent_runner_1 = require("../collaboration/test-agent-runner");
const test_agent_review_policy_1 = require("../collaboration/test-agent-review-policy");
const project_test_targets_1 = require("./project-test-targets");
const evidence_projection_1 = require("../../test-agent/evidence-projection");
const surface_audit_1 = require("../../test-agent/surface-audit");
const scope_expansion_1 = require("../../agents/scope-expansion");
const runtime_fingerprint_1 = require("../../test-agent/runtime-fingerprint");
const hardening_policy_1 = require("../../test-agent/hardening-policy");
const completion_gate_1 = require("../../test-agent/completion-gate");
const post_review_spot_check_1 = require("../../agents/post-review-spot-check");
function cleanText(value, max = 1200) {
    return String(value || "").trim().slice(0, max);
}
function cleanList(value, max = 16, itemMax = 800) {
    return [...new Set((Array.isArray(value) ? value : []).map(item => cleanText(item, itemMax)).filter(Boolean))].slice(0, max);
}
/**
 * Verification plans are allowed to use either a bare command string or a
 * structured entry ({ command: "npm test" }).  Never stringify the latter
 * directly: String({ command: "npm test" }) becomes "[object Object]" and
 * silently injects an unusable command into the TestAgent work order.
 */
function verificationCommandValues(value) {
    const values = [];
    const visit = (item) => {
        if (typeof item === "string" || typeof item === "number") {
            const command = cleanText(item, 300);
            if (command)
                values.push(command);
            return;
        }
        if (!item || typeof item !== "object")
            return;
        for (const key of ["command", "cmd", "script", "value"]) {
            if (typeof item[key] === "string" || typeof item[key] === "number") {
                const command = cleanText(item[key], 300);
                if (command)
                    values.push(command);
            }
        }
        for (const key of ["commands", "verificationCommands", "verification_commands", "checks"]) {
            if (Array.isArray(item[key]))
                item[key].forEach(visit);
        }
    };
    (Array.isArray(value) ? value : [value]).forEach(visit);
    // Worker receipts may include human-readable verification notes such as
    // "npm test passed by external runner (exit 0)".  Those notes are evidence,
    // not commands; forwarding them makes the TestAgent attempt to execute
    // prose and can invalidate an otherwise frozen work order.  Keep the
    // actual shell command forms only.
    return [...new Set(values)].filter(command => {
        const text = command.toLowerCase();
        if (/\bpassed?\s+by\s+(external|ccm)|\bexit\s*\(?\s*0\)?|已执行|退出码|通过|范围检查/.test(text))
            return false;
        return true;
    });
}
function taskScopeDeclarations(task) {
    const policy = task?.file_change_policy || {};
    const editable = [
        ...(Array.isArray(policy.editablePaths) ? policy.editablePaths : []),
        ...(Array.isArray(policy.initialEditablePaths) ? policy.initialEditablePaths : []),
        ...(Array.isArray(task?.editable_paths) ? task.editable_paths : []),
        ...(Array.isArray(task?.editablePaths) ? task.editablePaths : []),
    ].map((item) => cleanText(item, 600)).filter(Boolean);
    const fixtures = [
        ...(Array.isArray(policy.synchronizedFixturePaths) ? policy.synchronizedFixturePaths : []),
        ...(Array.isArray(task?.synchronized_fixture_paths) ? task.synchronized_fixture_paths : []),
        ...(Array.isArray(task?.synchronizedFixturePaths) ? task.synchronizedFixturePaths : []),
    ].map((item) => ({
        path: cleanText(item?.path || item, 600),
        allowedChanges: cleanList(item?.allowedChanges || item?.allowed_changes, 20, 300),
    })).filter((item) => item.path);
    // A recovered task can predate the structured file-change policy fields.
    // Its CCM-persisted work-item receipt is still an authoritative record of
    // the files already delivered in that attempt.  Carry those paths into the
    // review projection so recovery does not turn a previously accepted fixture
    // change into an artificial undeclared-change failure.  This is only a
    // declaration fallback for the existing signed receipt; Terminal Gate still
    // audits the actual workspace independently.
    const receiptFiles = (Array.isArray(task?.work_items) ? task.work_items : [])
        .flatMap((item) => {
        const receipt = item?.lastReceipt || item?.last_receipt || item?.receipt || null;
        const files = receipt?.filesChanged || receipt?.files_changed || receipt?.files || item?.filesChanged || item?.files_changed || [];
        return Array.isArray(files) ? files : [];
    })
        .map((item) => cleanText(item?.path || item?.file || item, 600))
        .filter(Boolean);
    return {
        editable: [...new Set(editable)],
        fixtures,
        receiptFiles: [...new Set(receiptFiles)],
        declared: [...new Set([...editable, ...fixtures.map((item) => item.path), ...receiptFiles])],
    };
}
function workItemSummaryText(item) {
    if (typeof item === "string" || typeof item === "number")
        return cleanText(item, 1000);
    if (!item || typeof item !== "object")
        return "";
    return cleanText(item.title || item.objective || item.subject || item.description || item.task || item.name, 1000);
}
function aggregateFileChanges(results) {
    const byPath = new Map();
    for (const result of results || []) {
        for (const item of result?.fileChanges?.files || []) {
            const key = String(item?.path || item?.file || item || "").trim();
            if (key)
                byPath.set(key, typeof item === "object" ? item : { path: key });
        }
    }
    const files = [...byPath.values()];
    return { count: files.length, files };
}
/**
 * A baseline work item is intentionally read-only.  Its evidence is captured
 * by CCM before the disposable TestAgent copy is created; asking that copy to
 * run git commands would always fail because the copy has no .git metadata.
 * Keep this exception narrowly scoped to the explicit BASELINE work item.
 */
function isReadOnlyBaselineWorkItem(task) {
    const key = String(task?.workflow_meta?.requirement_epic?.item_key
        || task?.workflowMeta?.requirement_epic?.item_key
        || task?.workflow_meta?.requirement_epic?.itemKey
        || task?.workflowMeta?.requirement_epic?.itemKey
        || "").trim().toUpperCase();
    if (key === "BASELINE")
        return true;
    if (task?.requires_code_changes !== false && task?.requiresCodeChanges !== false)
        return false;
    return /(^|\b)(baseline|基线)(\b|$)/i.test(String(task?.title || task?.business_goal || task?.description || ""));
}
function baselineCriterionBinding(criterion, index, enabled) {
    if (!enabled) {
        return {
            id: `criterion-${index + 1}`,
            text: criterion,
            checkIds: [],
            fileRefs: [],
        };
    }
    return {
        id: `criterion-${index + 1}`,
        text: criterion,
        checkIds: ["CCM authoritative baseline audit"],
        fileRefs: [],
        waiver: "CCM authoritative baseline evidence captured before disposable verification.",
    };
}
function projectTargetUrl(target) {
    const base = String(target.baseUrl || "").replace(/\/+$/, "");
    const route = String(target.auth.loginPath || "").trim();
    if (!base || !route || /^https?:\/\//i.test(route))
        return /^https?:\/\//i.test(route) ? route : base;
    return `${base}/${route.replace(/^\/+/, "")}`;
}
function buildProjectTestTargetBrowserChecks(target, workDir) {
    if (!target.baseUrl || target.kind === "api" || target.kind === "native_app")
        return [];
    const auth = target.auth;
    if (auth.mode === "credentials") {
        const actions = auth.fields.map(field => ({
            type: "fill",
            label: field.inputLabel || field.label,
            valueEnv: field.envName,
        }));
        if (auth.submitLabel)
            actions.push({ type: "click", role: "button", name: auth.submitLabel, verifyEffect: true });
        const assertions = [];
        if (auth.successText)
            assertions.push({ type: "text", text: auth.successText });
        if (auth.successUrlIncludes)
            assertions.push({ type: "urlIncludes", text: auth.successUrlIncludes });
        if (!assertions.length && auth.loginPath)
            assertions.push({ type: "urlNotIncludes", text: auth.loginPath });
        return [{
                name: `${target.name} 登录验证`,
                url: projectTargetUrl(target),
                actions,
                assertions,
                screenshot: false,
                context: { testTargetId: target.id, authenticationConfiguredBy: "project-test-target" },
            }];
    }
    if (auth.mode === "storage_state") {
        (0, project_test_targets_1.resolveProjectTargetStorageStatePath)(workDir, auth.storageStatePath);
        return [{
                name: `${target.name} 已登录状态验证`,
                url: target.baseUrl,
                storageStatePath: auth.storageStatePath,
                assertions: [{ type: "pageNotBlank" }],
                screenshot: false,
                context: { testTargetId: target.id, authenticationConfiguredBy: "project-test-target" },
            }];
    }
    if (auth.mode === "existing_session") {
        return [{
                name: `${target.name} 已有浏览器会话验证`,
                url: target.baseUrl,
                authentication: { mode: "existing_session", provider: auth.existingSessionProvider, evidencePolicy: "minimal" },
                assertions: [{ type: "pageNotBlank" }],
                screenshot: false,
                context: { testTargetId: target.id, authenticationConfiguredBy: "project-test-target" },
            }];
    }
    return [];
}
function projectTestAgentProblems(review) {
    return cleanList([
        review?.error,
        ...(review?.verdict?.gaps || []),
        ...(review?.verdict?.nextActions || review?.verdict?.next_actions || []),
        ...(review?.report?.blockers || []),
        ...(review?.report?.recommendations || []),
    ], 20, 700);
}
function projectTestAgentReworkProblems(review) {
    const base = projectTestAgentProblems(review).slice(0, 16);
    const report = review?.report || review?.invocation?.report || {};
    const screenshotPaths = cleanList((report?.browserResults || []).flatMap((result) => [
        ...(result?.screenshotRefs || []).map((item) => item?.path),
        ...(result?.screenshots || []),
    ]), 4, 600);
    const evidence = [
        report?.artifactDir ? `TestAgent 证据目录：${cleanText(report.artifactDir, 600)}` : "",
        ...screenshotPaths.map(file => `浏览器截图证据：${file}`),
    ].filter(Boolean);
    return cleanList([...base, ...evidence], 20, 700);
}
/**
 * Resolve verification commands from the authoritative task/plan snapshots.
 *
 * Some older task records did not copy the plan's verification list onto the
 * top-level task field.  Falling back only to project configuration therefore
 * caused TestAgent to receive an empty command set even though the confirmed
 * work order explicitly required checks.  Read only explicit plan fields here;
 * do not infer commands from free-form acceptance text.
 */
function explicitTaskVerificationCommands(task, workItems = []) {
    const planCandidates = [
        task?.verification_commands,
        task?.verificationCommands,
        task?.verification,
        task?.workflow_meta?.project_main_plan?.verificationCommands,
        task?.workflow_meta?.project_main_plan?.verification_commands,
        task?.workflow_meta?.sandbox_rehearsal?.verification_plan,
        task?.sandbox_rehearsal?.verification_plan,
        task?.decomposition_plan?.verification_plan,
        task?.requirement_decomposition?.verification_plan,
    ];
    const values = [];
    for (const candidate of planCandidates) {
        if (Array.isArray(candidate))
            values.push(...verificationCommandValues(candidate));
        else if (candidate && typeof candidate === "object") {
            values.push(...verificationCommandValues(candidate));
        }
    }
    for (const item of Array.isArray(workItems) ? workItems : []) {
        for (const key of ["verificationCommands", "verification_commands", "verification", "checks"]) {
            const candidate = item?.[key];
            values.push(...verificationCommandValues(candidate));
        }
    }
    return cleanList(values, 30, 300);
}
function scopeAuditForTask(task, actualFiles) {
    const policy = task?.file_change_policy || {};
    const initial = (policy.editablePaths || policy.initialEditablePaths || task?.editable_paths || task?.editablePaths || []);
    const fixtures = (policy.synchronizedFixturePaths || task?.synchronized_fixture_paths || task?.synchronizedFixturePaths || []).map((item) => item?.path || item);
    const allowed = new Set([...initial, ...fixtures, ...(0, scope_expansion_1.approvedScopePaths)(task)].map((p) => String(p || "").replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase()).filter(Boolean));
    if (!allowed.size)
        return { status: "unavailable", outOfScopeFiles: [] };
    const outOfScopeFiles = actualFiles.filter(file => !allowed.has(String(file).replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase()));
    return { status: outOfScopeFiles.length ? "blocked" : "passed", outOfScopeFiles };
}
async function runProjectTaskTestAgentReview(input) {
    const contractMetadata = require("../../agents/task-acceptance-service").taskAcceptanceVerificationMetadata(input.task.id, input.project);
    const targets = (0, project_test_targets_1.resolveProjectTestTargets)(input.project);
    const taskPlanCommands = explicitTaskVerificationCommands(input.task, input.workItems || []);
    const allCommands = contractMetadata.acceptanceContract
        ? [...new Set(contractMetadata.acceptanceContract.checks.filter(c => c.projectId === input.project && c.kind === "command").map(c => c.command))]
        : cleanList([
            ...(input.fallbackVerificationCommands || []),
            ...taskPlanCommands,
            ...targets.flatMap(target => target.verificationCommands),
        ], 30, 300);
    const changes = aggregateFileChanges(input.workerResults);
    const workItems = input.workItems?.length ? input.workItems : [{ title: input.task.title || input.task.business_goal || "完成项目任务" }];
    const allAcceptanceCriteria = contractMetadata.acceptanceContract
        ? contractMetadata.acceptanceContract.criteria.filter(c => c.projectId === input.project).map(c => c.description)
        : cleanList(input.acceptanceCriteria?.length
            ? input.acceptanceCriteria
            : String(input.task.acceptance_criteria || "").split(/\r?\n|；/), 20, 800);
    const evidencePlan = input.task.acceptance_evidence_plan
        || input.task.workflow_meta?.project_main_plan?.acceptanceEvidencePlan
        || [];
    const workflowDecision = input.task.workflow_decision || input.task.workflowDecision || {};
    const reviewPolicy = (0, test_agent_review_policy_1.deriveTestAgentReviewPolicy)({
        profile: input.task.workflow_meta?.project_main_plan?.verificationProfile
            || input.task.test_agent_review_policy
            || null,
        workflowDecision,
        evidencePlan,
        hasTestTarget: targets.length > 0,
    });
    const frozenHardening = input.task?.acceptance_policy_snapshot?.hardening;
    const hardeningPolicy = (0, hardening_policy_1.validateTestAgentHardeningPolicy)(frozenHardening).valid
        ? frozenHardening
        : (0, hardening_policy_1.buildTestAgentHardeningPolicy)({ task: input.task, reviewPolicy, riskTier: reviewPolicy.tier });
    const incrementalScope = (0, test_agent_review_policy_1.buildTestAgentIncrementalScope)({
        round: input.round,
        acceptanceCriteria: allAcceptanceCriteria,
        verificationCommands: allCommands,
        previousReview: input.previousReview,
    });
    const acceptanceCriteria = contractMetadata.acceptanceContract ? allAcceptanceCriteria : incrementalScope.acceptanceCriteria;
    const commands = contractMetadata.acceptanceContract ? allCommands : incrementalScope.verificationCommands;
    if (allAcceptanceCriteria.length && !commands.length && !reviewPolicy.browserEnabled && !reviewPolicy.httpEnabled) {
        return {
            canAccept: false,
            status: "blocked",
            error: "工作单要求验收，但没有可执行的验证命令；请补齐已确认计划或项目配置中的 verificationCommands",
            handoff: null,
        };
    }
    const target = targets.find(item => item.required) || targets[0] || null;
    const readOnlyBaseline = isReadOnlyBaselineWorkItem(input.task);
    const allBrowserChecks = reviewPolicy.browserEnabled
        ? targets.flatMap(item => buildProjectTestTargetBrowserChecks(item, input.workDir))
        : [];
    const browserChecks = incrementalScope.mode === "incremental" && incrementalScope.browserCheckNames.length
        ? allBrowserChecks.filter(check => incrementalScope.browserCheckNames.includes(String(check?.name || "")))
        : allBrowserChecks;
    const taskBrowserScenarios = cleanList(input.task.browser_scenarios || input.task.browserScenarios || input.task.test_browser_scenarios, 12, 600);
    const workItemBrowserScenarios = (input.workItems || []).flatMap(item => cleanList(item?.browser_scenarios || item?.browserScenarios, 12, 600));
    const browserScenarios = reviewPolicy.browserEnabled
        && (incrementalScope.mode === "full" || incrementalScope.browserCheckNames.length)
        ? cleanList([...taskBrowserScenarios, ...workItemBrowserScenarios], 12, 600)
        : [];
    const targetUrl = reviewPolicy.browserEnabled || reviewPolicy.httpEnabled ? target?.baseUrl || "" : "";
    // The worker receipt is evidence of what it reported, not the authoritative
    // declaration of what the confirmed work order permits. Include the frozen
    // task scope (including explicitly synchronized test fixtures) so a worker
    // can update an approved fixture without being misclassified as out of
    // scope. Any other changed file remains visible to the surface audit.
    const scopeDeclarations = taskScopeDeclarations(input.task);
    const declaredFiles = [...new Set([
            ...changes.files.map((item) => String(item.path || item.file || "")).filter(Boolean),
            ...scopeDeclarations.declared,
        ])];
    const deliveryBaselineRef = String((input.workerResults || [])
        .map((result) => result?.delivery?.baseCommit || result?.delivery?.base_commit || "")
        .find(Boolean) || "");
    const evidenceProjection = (0, evidence_projection_1.buildTestAgentEvidenceProjection)({
        taskId: input.task.id,
        scope: "project",
        scopeId: input.project,
        workerResults: input.workerResults,
    });
    // This is an observation at handoff time. The shared completion gate may
    // run the same audit strictly after the worker exits and after merge.
    const surfaceAudit = (0, surface_audit_1.auditTestAgentSurface)({
        workDir: input.workDir,
        declaredFiles,
        acceptanceCriteria,
        criterionBindings: acceptanceCriteria.map((criterion, index) => readOnlyBaseline
            ? baselineCriterionBinding(criterion, index, true)
            : {
                id: `criterion-${index + 1}`,
                text: criterion,
                checkIds: commands.map((_command, commandIndex) => `command-${commandIndex + 1}`),
                fileRefs: declaredFiles,
            }),
        checkDefinitions: commands.map((command, index) => ({ id: `command-${index + 1}`, command })),
        baselineRef: deliveryBaselineRef,
        mode: hardeningPolicy.surfaceAuditMode,
    });
    const initialScopeAudit = scopeAuditForTask(input.task, surfaceAudit.actualFiles.map((item) => item.path));
    if (initialScopeAudit.status !== "unavailable") {
        surfaceAudit.scopeAudit = initialScopeAudit;
        if (initialScopeAudit.status === "blocked")
            surfaceAudit.canAccept = false;
    }
    const runtimeFingerprint = (0, runtime_fingerprint_1.captureTestAgentRuntimeFingerprint)({
        workDir: input.workDir,
        targetUrl,
        providerFamily: reviewPolicy.browserEnabled ? "browser" : reviewPolicy.httpEnabled ? "http" : "local",
        providerCapabilityVersion: String(reviewPolicy.providerCapabilityVersion || ""),
        isolationMode: "handoff_preflight",
    });
    const handoff = {
        schema: "ccm-test-agent-handoff-v2",
        id: `project-${input.task.id}-${input.reviewCycleId || "legacy"}-review-${input.round}`,
        taskId: input.task.id,
        groupId: "",
        issuedBy: input.issuedBy || "project-main-agent",
        originalUserGoal: input.task.business_goal || input.task.description || input.task.title,
        acceptanceCriteria,
        completedTasks: workItems.map(workItemSummaryText).filter(Boolean),
        completedByProjectAgents: [input.project],
        projects: [{
                name: input.project,
                workDir: input.workDir,
                targetUrl,
                devServerCommand: targetUrl ? target?.startupCommand || "" : "",
                changedFiles: declaredFiles,
                completedTasks: workItems.map(workItemSummaryText).filter(Boolean),
                acceptanceCriteria,
                verificationCommands: commands,
                verificationRoot: input.workDir,
                editablePaths: scopeDeclarations.editable,
                readOnlyPaths: (input.task?.read_only_paths || input.task?.readOnlyPaths || []).map(String),
                cleanupPaths: (input.task?.cleanup_paths || input.task?.cleanupPaths || []).map(String),
                synchronizedFixturePaths: scopeDeclarations.fixtures,
                browserChecks,
                browserScenarios,
                agentSummary: (0, evidence_projection_1.summarizeTestAgentEvidenceProjection)(evidenceProjection),
                deliveryEvidence: evidenceProjection,
                risks: input.workerResults.flatMap(result => result.success === false ? [result.error || "开发 Agent 执行失败"] : []),
            }],
        options: {
            verificationOnly: true,
            browserProvider: reviewPolicy.browserEnabled ? "playwright" : "none",
            autoDiscoverVerificationCommands: reviewPolicy.autoDiscoverVerificationCommands,
            collectBrowserArtifacts: reviewPolicy.collectBrowserArtifacts,
            requireAdversarialProbe: reviewPolicy.requireAdversarialProbe,
            ...(reviewPolicy.requireAdversarialProbe ? {} : {
                adversarialProbeWaiver: `验收策略为 ${reviewPolicy.tier}，当前任务不要求完整对抗测试。`,
            }),
            agenticPlanning: true,
        },
        metadata: {
            ...contractMetadata,
            handoffSource: "project-independent-review-gate",
            // Work-item completion is a signed CCM lifecycle fact. TestAgent must
            // verify the observable acceptance criteria and commands, not prove a
            // future main-Agent/Terminal-Gate process statement.
            completedTasksContextOnly: true,
            completedWorkItemSummaries: workItems.map(workItemSummaryText).filter(Boolean),
            projectSessionId: input.task.project_session_id || "",
            projectMainRunId: input.task.project_main_run_id || "",
            projectTestTargets: targets.map(item => ({
                id: item.id,
                name: item.name,
                kind: item.kind,
                environment: item.environment,
                checksum: item.checksum,
                required: item.required,
                authMode: item.auth.mode,
                auth: {
                    loginPath: item.auth.loginPath,
                    submitLabel: item.auth.submitLabel,
                    successText: item.auth.successText,
                    successUrlIncludes: item.auth.successUrlIncludes,
                    storageStatePath: item.auth.mode === "storage_state" ? item.auth.storageStatePath : "",
                    existingSessionProvider: item.auth.mode === "existing_session" ? item.auth.existingSessionProvider : "",
                    fields: item.auth.fields.map(field => ({ label: field.label, envName: field.envName, inputLabel: field.inputLabel })),
                },
            })),
            reviewRound: input.round,
            reviewCycleId: input.reviewCycleId || "",
            reviewPolicy,
            hardeningPolicy,
            verificationHardening: { version: 2, policy: hardeningPolicy },
            incrementalScope,
            // Coverage comes from frozen verification IDs and executed evidence.
            // A command title or worker receipt cannot establish business acceptance.
            surfaceAudit,
            readOnlyBaseline,
            // The baseline is a CCM-captured fact, not a command that can be
            // re-executed inside the Git-less disposable TestAgent copy.
            baselineEvidence: readOnlyBaseline ? {
                schema: "ccm-test-agent-baseline-evidence-v1",
                capturedBy: "ccm",
                workDir: input.workDir,
                noFileChanges: changes.count === 0,
                contentStored: false,
            } : null,
            runtimeFingerprint,
        },
    };
    const testAgentRuntimeProgressContext = {
        scope: "project",
        scopeId: input.project,
        exactSessionId: String(input.task.project_session_id || input.task.projectSessionId || ""),
        taskId: String(input.task.id || ""),
        generation: Math.max(0, Number(input.task.generation || 0)),
        attempt: Math.max(1, Number(input.round || 1)),
        anchorMessageId: String(input.task.anchor_message_id || input.task.anchorMessageId || `project-main-task:${input.task.id}`),
        originMessageId: String(input.task.origin_message_id || input.task.originMessageId || "") || undefined,
        projectId: input.project,
        agentRunId: `task-test-agent:${input.task.id}:${input.project}`,
    };
    const planRun = await (0, test_agent_runner_1.runTestAgentCliJob)({
        mode: "plan",
        handoff,
        taskId: input.task.id,
        groupId: "",
        timeoutMs: 120_000,
        allowedWorkDirs: [input.workDir],
        idempotencyKey: `${input.task.id}:project-review:${input.reviewCycleId || "legacy"}:${input.round}:plan`,
        attemptScope: input.reviewCycleId || "",
        runtimeProgressContext: testAgentRuntimeProgressContext,
    });
    if (!planRun.plan?.valid) {
        return { canAccept: false, status: "blocked", error: planRun.record.error || "TestAgent 计划预检未通过", plan: planRun.plan, handoff };
    }
    const expectedChecksums = (handoff.metadata.projectTestTargets || []).map(target => `${target.id}:${target.checksum}`).sort().join("|");
    const currentTargets = (0, project_test_targets_1.resolveProjectTestTargets)(input.project);
    const currentChecksums = currentTargets.map(target => `${target.id}:${target.checksum}`).sort().join("|");
    if (expectedChecksums !== currentChecksums) {
        return { canAccept: false, status: "blocked", error: "项目验收环境在 TestAgent 计划生成后发生变化，需要重新规划", plan: planRun.plan, handoff };
    }
    const runtimeEnv = currentTargets.reduce((env, item) => ({ ...env, ...item.env }), {});
    const invocationRun = await (0, test_agent_runner_1.runTestAgentCliJob)({
        mode: "invocation",
        handoff,
        taskId: input.task.id,
        groupId: "",
        timeoutMs: 900_000,
        allowedWorkDirs: [input.workDir],
        runtimeEnv,
        idempotencyKey: `${input.task.id}:project-review:${input.reviewCycleId || "legacy"}:${input.round}:invoke`,
        attemptScope: input.reviewCycleId || "",
        runtimeProgressContext: testAgentRuntimeProgressContext,
    });
    const invocation = invocationRun.invocation;
    const valid = invocation?.status === "completed"
        && invocation.outputValidation?.valid === true
        && invocation.artifactVerification?.status === "passed";
    const canAccept = valid && invocation?.canAccept === true && invocationRun.record.sourceStable === true;
    const surfaceAuditAfter = (0, surface_audit_1.auditTestAgentSurface)({
        workDir: input.workDir,
        declaredFiles,
        acceptanceCriteria,
        criterionBindings: acceptanceCriteria.map((criterion, index) => readOnlyBaseline
            ? baselineCriterionBinding(criterion, index, true)
            : {
                id: `criterion-${index + 1}`,
                text: criterion,
                checkIds: commands.map((_command, commandIndex) => `command-${commandIndex + 1}`),
                fileRefs: declaredFiles,
            }),
        checkDefinitions: commands.map((command, index) => ({ id: `command-${index + 1}`, command })),
        baselineRef: deliveryBaselineRef,
        mode: hardeningPolicy.surfaceAuditMode,
    });
    const finalScopeAudit = scopeAuditForTask(input.task, surfaceAuditAfter.actualFiles.map((item) => item.path));
    if (finalScopeAudit.status !== "unavailable") {
        surfaceAuditAfter.scopeAudit = finalScopeAudit;
        if (finalScopeAudit.status === "blocked")
            surfaceAuditAfter.canAccept = false;
    }
    const runtimeFingerprintAfter = (0, runtime_fingerprint_1.captureTestAgentRuntimeFingerprint)({
        workDir: input.workDir,
        targetUrl,
        providerFamily: reviewPolicy.browserEnabled ? "browser" : reviewPolicy.httpEnabled ? "http" : "local",
        providerCapabilityVersion: String(reviewPolicy.providerCapabilityVersion || ""),
        isolationMode: "handoff_preflight",
    });
    const spotCheck = valid && invocation?.canAccept === true && invocationRun.record.sourceStable === true
        ? await (0, post_review_spot_check_1.runMainAgentPostReviewSpotCheck)({
            report: invocation?.report,
            taskId: input.task.id,
            projectRoot: input.workDir,
            required: hardeningPolicy.requiresSpotCheck,
            maxCommands: 3,
            timeoutMs: 300_000,
        })
        : null;
    const provisional = {
        canAccept,
        status: invocation?.outcome || invocation?.status || invocationRun.record.status,
        error: valid ? "" : invocation?.error || invocationRun.record.error || "TestAgent 输出或证据校验未通过",
        plan: planRun.plan,
        invocation,
        report: invocation?.report || null,
        verdict: invocation?.verdict || null,
        handoff,
        runner: invocationRun.record,
        reviewPolicy,
        incrementalScope,
        evidenceProjection,
        surfaceAuditBefore: surfaceAudit,
        surfaceAuditAfter,
        runtimeFingerprintBefore: runtimeFingerprint,
        runtimeFingerprintAfter,
        postReviewSpotCheck: spotCheck,
        post_review_spot_check: spotCheck,
    };
    const completionGate = (0, completion_gate_1.buildTestAgentCompletionGate)({
        task: input.task,
        workItemId: String(input.workItems?.[0]?.id || input.workItems?.[0]?.workItemId || ""),
        exactSessionId: String(input.task.project_session_id || input.task.exact_session_id || ""),
        generation: Number(input.task.generation || 0),
        attempt: input.round,
        policy: { hardening: hardeningPolicy },
        review: provisional,
        reviewPolicy,
        spotCheck,
    });
    provisional.completionGate = completionGate;
    provisional.completion_gate = completionGate;
    provisional.verificationHardening = (0, completion_gate_1.publicTestAgentVerificationHardening)(completionGate);
    provisional.verification_hardening = { completionGate, public: provisional.verificationHardening };
    provisional.canAccept = provisional.canAccept === true && completionGate.pass === true;
    if (!completionGate.pass && !provisional.error)
        provisional.error = completionGate.blockedReasons.join("；");
    const decision = (0, test_agent_review_policy_1.classifyTestAgentReview)(provisional);
    return { ...provisional, decision, failureRoute: decision.route };
}
//# sourceMappingURL=project-test-agent-gate.js.map