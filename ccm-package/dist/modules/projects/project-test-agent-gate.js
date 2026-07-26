"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProjectTestTargetBrowserChecks = buildProjectTestTargetBrowserChecks;
exports.projectTestAgentProblems = projectTestAgentProblems;
exports.runProjectTaskTestAgentReview = runProjectTaskTestAgentReview;
const test_agent_runner_1 = require("../collaboration/test-agent-runner");
const project_test_targets_1 = require("./project-test-targets");
function cleanText(value, max = 1200) {
    return String(value || "").trim().slice(0, max);
}
function cleanList(value, max = 16, itemMax = 800) {
    return [...new Set((Array.isArray(value) ? value : []).map(item => cleanText(item, itemMax)).filter(Boolean))].slice(0, max);
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
async function runProjectTaskTestAgentReview(input) {
    const targets = (0, project_test_targets_1.resolveProjectTestTargets)(input.project);
    const commands = cleanList([
        ...(input.fallbackVerificationCommands || []),
        ...targets.flatMap(target => target.verificationCommands),
    ], 30, 300);
    const changes = aggregateFileChanges(input.workerResults);
    const target = targets.find(item => item.required) || targets[0] || null;
    const browserChecks = targets.flatMap(item => buildProjectTestTargetBrowserChecks(item, input.workDir));
    const workItems = input.workItems?.length ? input.workItems : [{ title: input.task.title || input.task.business_goal || "完成项目任务" }];
    const acceptanceCriteria = cleanList(input.acceptanceCriteria?.length
        ? input.acceptanceCriteria
        : String(input.task.acceptance_criteria || "").split(/\r?\n|；/), 20, 800);
    const handoff = {
        schema: "ccm-test-agent-handoff-v1",
        id: `project-${input.task.id}-review-${input.round}`,
        taskId: input.task.id,
        groupId: "",
        issuedBy: input.issuedBy || "project-main-agent",
        originalUserGoal: input.task.business_goal || input.task.description || input.task.title,
        acceptanceCriteria,
        completedTasks: workItems.map(item => String(item.title || item.objective || item)).filter(Boolean),
        completedByProjectAgents: [input.project],
        projects: [{
                name: input.project,
                workDir: input.workDir,
                targetUrl: target?.baseUrl || "",
                devServerCommand: target?.startupCommand || "",
                changedFiles: changes.files.map((item) => String(item.path || item.file || "")).filter(Boolean),
                completedTasks: workItems.map(item => String(item.title || item.objective || item)).filter(Boolean),
                acceptanceCriteria,
                verificationCommands: commands,
                browserChecks,
                agentSummary: input.workerResults.map(result => cleanText(result.output, 1800)).join("\n\n"),
                risks: input.workerResults.flatMap(result => result.success === false ? [result.error || "开发 Agent 执行失败"] : []),
            }],
        options: {
            verificationOnly: true,
            browserProvider: target?.baseUrl ? "playwright" : "auto",
            autoDiscoverVerificationCommands: true,
            collectBrowserArtifacts: true,
            requireAdversarialProbe: !!target?.baseUrl,
            agenticPlanning: true,
        },
        metadata: {
            handoffSource: "project-independent-review-gate",
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
        },
    };
    const planRun = await (0, test_agent_runner_1.runTestAgentCliJob)({
        mode: "plan",
        handoff,
        taskId: input.task.id,
        groupId: "",
        timeoutMs: 120_000,
        allowedWorkDirs: [input.workDir],
        idempotencyKey: `${input.task.id}:project-review:${input.round}:plan`,
    });
    if (!planRun.plan?.valid) {
        return { canAccept: false, status: "blocked", error: planRun.record.error || "TestAgent 计划预检未通过", plan: planRun.plan, handoff };
    }
    const expectedChecksums = (handoff.metadata.projectTestTargets || []).map(target => `${target.id}:${target.checksum}`).sort().join("|");
    const currentTargets = (0, project_test_targets_1.resolveProjectTestTargets)(input.project);
    const currentChecksums = currentTargets.map(target => `${target.id}:${target.checksum}`).sort().join("|");
    if (expectedChecksums !== currentChecksums) {
        return { canAccept: false, status: "blocked", error: "项目测试目标在 TestAgent 计划生成后发生变化，需要重新规划", plan: planRun.plan, handoff };
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
        idempotencyKey: `${input.task.id}:project-review:${input.round}:invoke`,
    });
    const invocation = invocationRun.invocation;
    const valid = invocation?.status === "completed"
        && invocation.outputValidation?.valid === true
        && invocation.artifactVerification?.status === "passed";
    return {
        canAccept: valid && invocation?.canAccept === true && invocationRun.record.sourceStable === true,
        status: invocation?.outcome || invocation?.status || invocationRun.record.status,
        error: valid ? "" : invocation?.error || invocationRun.record.error || "TestAgent 输出或证据校验未通过",
        plan: planRun.plan,
        invocation,
        report: invocation?.report || null,
        verdict: invocation?.verdict || null,
        handoff,
        runner: invocationRun.record,
    };
}
//# sourceMappingURL=project-test-agent-gate.js.map