import { runTestAgentCliJob } from "../collaboration/test-agent-runner";
import {
  buildTestAgentIncrementalScope,
  classifyTestAgentReview,
  deriveTestAgentReviewPolicy,
} from "../collaboration/test-agent-review-policy";
import {
  resolveProjectTargetStorageStatePath,
  resolveProjectTestTargets,
  type ResolvedProjectTestTarget,
} from "./project-test-targets";
import {
  buildTestAgentEvidenceProjection,
  summarizeTestAgentEvidenceProjection,
} from "../../test-agent/evidence-projection";
import { auditTestAgentSurface } from "../../test-agent/surface-audit";
import { captureTestAgentRuntimeFingerprint } from "../../test-agent/runtime-fingerprint";
import { buildTestAgentHardeningPolicy, validateTestAgentHardeningPolicy } from "../../test-agent/hardening-policy";
import { buildTestAgentCompletionGate, publicTestAgentVerificationHardening } from "../../test-agent/completion-gate";
import { runMainAgentPostReviewSpotCheck } from "../../agents/post-review-spot-check";

function cleanText(value: any, max = 1200) {
  return String(value || "").trim().slice(0, max);
}

function cleanList(value: any, max = 16, itemMax = 800) {
  return [...new Set((Array.isArray(value) ? value : []).map(item => cleanText(item, itemMax)).filter(Boolean))].slice(0, max);
}

function aggregateFileChanges(results: any[]) {
  const byPath = new Map<string, any>();
  for (const result of results || []) {
    for (const item of result?.fileChanges?.files || []) {
      const key = String(item?.path || item?.file || item || "").trim();
      if (key) byPath.set(key, typeof item === "object" ? item : { path: key });
    }
  }
  const files = [...byPath.values()];
  return { count: files.length, files };
}

function projectTargetUrl(target: ResolvedProjectTestTarget) {
  const base = String(target.baseUrl || "").replace(/\/+$/, "");
  const route = String(target.auth.loginPath || "").trim();
  if (!base || !route || /^https?:\/\//i.test(route)) return /^https?:\/\//i.test(route) ? route : base;
  return `${base}/${route.replace(/^\/+/, "")}`;
}

export function buildProjectTestTargetBrowserChecks(target: ResolvedProjectTestTarget, workDir: string): any[] {
  if (!target.baseUrl || target.kind === "api" || target.kind === "native_app") return [];
  const auth = target.auth;
  if (auth.mode === "credentials") {
    const actions: any[] = auth.fields.map(field => ({
      type: "fill",
      label: field.inputLabel || field.label,
      valueEnv: field.envName,
    }));
    if (auth.submitLabel) actions.push({ type: "click", role: "button", name: auth.submitLabel, verifyEffect: true });
    const assertions: any[] = [];
    if (auth.successText) assertions.push({ type: "text", text: auth.successText });
    if (auth.successUrlIncludes) assertions.push({ type: "urlIncludes", text: auth.successUrlIncludes });
    if (!assertions.length && auth.loginPath) assertions.push({ type: "urlNotIncludes", text: auth.loginPath });
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
    resolveProjectTargetStorageStatePath(workDir, auth.storageStatePath);
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

export function projectTestAgentProblems(review: any) {
  return cleanList([
    review?.error,
    ...(review?.verdict?.gaps || []),
    ...(review?.verdict?.nextActions || review?.verdict?.next_actions || []),
    ...(review?.report?.blockers || []),
    ...(review?.report?.recommendations || []),
  ], 20, 700);
}

export function projectTestAgentReworkProblems(review: any) {
  const base = projectTestAgentProblems(review).slice(0, 16);
  const report = review?.report || review?.invocation?.report || {};
  const screenshotPaths = cleanList(
    (report?.browserResults || []).flatMap((result: any) => [
      ...(result?.screenshotRefs || []).map((item: any) => item?.path),
      ...(result?.screenshots || []),
    ]),
    4,
    600,
  );
  const evidence = [
    report?.artifactDir ? `TestAgent 证据目录：${cleanText(report.artifactDir, 600)}` : "",
    ...screenshotPaths.map(file => `浏览器截图证据：${file}`),
  ].filter(Boolean);
  return cleanList([...base, ...evidence], 20, 700);
}

export async function runProjectTaskTestAgentReview(input: {
  task: any;
  project: string;
  workDir: string;
  workerResults: any[];
  acceptanceCriteria?: string[];
  workItems?: any[];
  fallbackVerificationCommands?: string[];
  round: number;
  reviewCycleId?: string;
  issuedBy?: string;
  previousReview?: any;
}) {
  const targets = resolveProjectTestTargets(input.project);
  const allCommands = cleanList([
    ...(input.fallbackVerificationCommands || []),
    ...targets.flatMap(target => target.verificationCommands),
  ], 30, 300);
  const changes = aggregateFileChanges(input.workerResults);
  const workItems = input.workItems?.length ? input.workItems : [{ title: input.task.title || input.task.business_goal || "完成项目任务" }];
  const allAcceptanceCriteria = cleanList(input.acceptanceCriteria?.length
    ? input.acceptanceCriteria
    : String(input.task.acceptance_criteria || "").split(/\r?\n|；/), 20, 800);
  const evidencePlan = input.task.acceptance_evidence_plan
    || input.task.workflow_meta?.project_main_plan?.acceptanceEvidencePlan
    || [];
  const workflowDecision = input.task.workflow_decision || input.task.workflowDecision || {};
  const reviewPolicy = deriveTestAgentReviewPolicy({
    profile: input.task.workflow_meta?.project_main_plan?.verificationProfile
      || input.task.test_agent_review_policy
      || null,
    workflowDecision,
    evidencePlan,
    hasTestTarget: targets.length > 0,
  });
  const frozenHardening = input.task?.acceptance_policy_snapshot?.hardening;
  const hardeningPolicy = validateTestAgentHardeningPolicy(frozenHardening).valid
    ? frozenHardening
    : buildTestAgentHardeningPolicy({ task: input.task, reviewPolicy, riskTier: reviewPolicy.tier });
  const incrementalScope = buildTestAgentIncrementalScope({
    round: input.round,
    acceptanceCriteria: allAcceptanceCriteria,
    verificationCommands: allCommands,
    previousReview: input.previousReview,
  });
  const acceptanceCriteria = incrementalScope.acceptanceCriteria;
  const commands = incrementalScope.verificationCommands;
  const target = targets.find(item => item.required) || targets[0] || null;
  const allBrowserChecks = reviewPolicy.browserEnabled
    ? targets.flatMap(item => buildProjectTestTargetBrowserChecks(item, input.workDir))
    : [];
  const browserChecks = incrementalScope.mode === "incremental" && incrementalScope.browserCheckNames.length
    ? allBrowserChecks.filter(check => incrementalScope.browserCheckNames.includes(String(check?.name || "")))
    : allBrowserChecks;
  const taskBrowserScenarios = cleanList(
    input.task.browser_scenarios || input.task.browserScenarios || input.task.test_browser_scenarios,
    12,
    600,
  );
  const workItemBrowserScenarios = (input.workItems || []).flatMap(item => cleanList(item?.browser_scenarios || item?.browserScenarios, 12, 600));
  const browserScenarios = reviewPolicy.browserEnabled
    && (incrementalScope.mode === "full" || incrementalScope.browserCheckNames.length)
    ? cleanList([...taskBrowserScenarios, ...workItemBrowserScenarios], 12, 600)
    : [];
  const targetUrl = reviewPolicy.browserEnabled || reviewPolicy.httpEnabled ? target?.baseUrl || "" : "";
  const declaredFiles = changes.files.map((item: any) => String(item.path || item.file || "")).filter(Boolean);
  const evidenceProjection = buildTestAgentEvidenceProjection({
    taskId: input.task.id,
    scope: "project",
    scopeId: input.project,
    workerResults: input.workerResults,
  });
  // This is an observation at handoff time. The shared completion gate may
  // run the same audit strictly after the worker exits and after merge.
  const surfaceAudit = auditTestAgentSurface({
    workDir: input.workDir,
    declaredFiles,
    acceptanceCriteria,
    criterionBindings: acceptanceCriteria.map((criterion, index) => ({
      id: `criterion-${index + 1}`,
      text: criterion,
      checkIds: commands.map((_command, commandIndex) => `command-${commandIndex + 1}`),
      fileRefs: declaredFiles,
    })),
    checkDefinitions: commands.map((command, index) => ({ id: `command-${index + 1}`, command })),
    mode: hardeningPolicy.surfaceAuditMode,
  });
  const runtimeFingerprint = captureTestAgentRuntimeFingerprint({
    workDir: input.workDir,
    targetUrl,
    providerFamily: reviewPolicy.browserEnabled ? "browser" : reviewPolicy.httpEnabled ? "http" : "local",
    providerCapabilityVersion: String((reviewPolicy as any).providerCapabilityVersion || ""),
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
    completedTasks: workItems.map(item => String(item.title || item.objective || item)).filter(Boolean),
    completedByProjectAgents: [input.project],
    projects: [{
      name: input.project,
      workDir: input.workDir,
      targetUrl,
      devServerCommand: targetUrl ? target?.startupCommand || "" : "",
      changedFiles: declaredFiles,
      completedTasks: workItems.map(item => String(item.title || item.objective || item)).filter(Boolean),
      acceptanceCriteria,
      verificationCommands: commands,
      browserChecks,
      browserScenarios,
      agentSummary: summarizeTestAgentEvidenceProjection(evidenceProjection),
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
      reviewCycleId: input.reviewCycleId || "",
      reviewPolicy,
      hardeningPolicy,
      verificationHardening: { version: 2, policy: hardeningPolicy },
      incrementalScope,
      surfaceAudit,
      runtimeFingerprint,
    },
  };
  const planRun = await runTestAgentCliJob({
    mode: "plan",
    handoff,
    taskId: input.task.id,
    groupId: "",
    timeoutMs: 120_000,
    allowedWorkDirs: [input.workDir],
    idempotencyKey: `${input.task.id}:project-review:${input.reviewCycleId || "legacy"}:${input.round}:plan`,
    attemptScope: input.reviewCycleId || "",
  });
  if (!planRun.plan?.valid) {
    return { canAccept: false, status: "blocked", error: planRun.record.error || "TestAgent 计划预检未通过", plan: planRun.plan, handoff };
  }
  const expectedChecksums = (handoff.metadata.projectTestTargets || []).map(target => `${target.id}:${target.checksum}`).sort().join("|");
  const currentTargets = resolveProjectTestTargets(input.project);
  const currentChecksums = currentTargets.map(target => `${target.id}:${target.checksum}`).sort().join("|");
  if (expectedChecksums !== currentChecksums) {
    return { canAccept: false, status: "blocked", error: "项目测试目标在 TestAgent 计划生成后发生变化，需要重新规划", plan: planRun.plan, handoff };
  }
  const runtimeEnv = currentTargets.reduce((env, item) => ({ ...env, ...item.env }), {});
  const invocationRun = await runTestAgentCliJob({
    mode: "invocation",
    handoff,
    taskId: input.task.id,
    groupId: "",
    timeoutMs: 900_000,
    allowedWorkDirs: [input.workDir],
    runtimeEnv,
    idempotencyKey: `${input.task.id}:project-review:${input.reviewCycleId || "legacy"}:${input.round}:invoke`,
    attemptScope: input.reviewCycleId || "",
  });
  const invocation = invocationRun.invocation;
  const valid = invocation?.status === "completed"
    && invocation.outputValidation?.valid === true
    && invocation.artifactVerification?.status === "passed";
  const canAccept = valid && invocation?.canAccept === true && invocationRun.record.sourceStable === true;
  const surfaceAuditAfter = auditTestAgentSurface({
    workDir: input.workDir,
    declaredFiles,
    acceptanceCriteria,
    criterionBindings: acceptanceCriteria.map((criterion, index) => ({
      id: `criterion-${index + 1}`,
      text: criterion,
      checkIds: commands.map((_command, commandIndex) => `command-${commandIndex + 1}`),
      fileRefs: declaredFiles,
    })),
    checkDefinitions: commands.map((command, index) => ({ id: `command-${index + 1}`, command })),
    mode: hardeningPolicy.surfaceAuditMode,
  });
  const runtimeFingerprintAfter = captureTestAgentRuntimeFingerprint({
    workDir: input.workDir,
    targetUrl,
    providerFamily: reviewPolicy.browserEnabled ? "browser" : reviewPolicy.httpEnabled ? "http" : "local",
    providerCapabilityVersion: String((reviewPolicy as any).providerCapabilityVersion || ""),
    isolationMode: "handoff_preflight",
  });
  const spotCheck = valid && invocation?.canAccept === true && invocationRun.record.sourceStable === true
    ? await runMainAgentPostReviewSpotCheck({
        report: invocation?.report,
        taskId: input.task.id,
        projectRoot: input.workDir,
        required: hardeningPolicy.requiresSpotCheck,
        maxCommands: 3,
        timeoutMs: 300_000,
      })
    : null;
  const provisional: any = {
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
  const completionGate = buildTestAgentCompletionGate({
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
  provisional.verificationHardening = publicTestAgentVerificationHardening(completionGate);
  provisional.verification_hardening = { completionGate, public: provisional.verificationHardening };
  provisional.canAccept = provisional.canAccept === true && completionGate.pass === true;
  if (!completionGate.pass && !provisional.error) provisional.error = completionGate.blockedReasons.join("；");
  const decision = classifyTestAgentReview(provisional);
  return { ...provisional, decision, failureRoute: decision.route };
}
