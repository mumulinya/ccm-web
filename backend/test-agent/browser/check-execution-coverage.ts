import {
  BrowserCheckExecutionCoverageItem,
  BrowserCheckExecutionCoverageStatus,
  BrowserCheckExecutionCoverageSummary,
  BrowserCheckExecutionIdentity,
  BrowserCheckExecutionPlan,
  BrowserCheckExecutionPlanItem,
  BrowserCheckResult,
  BrowserCheckSpec,
  NormalizedTestAgentProjectTarget,
  NormalizedTestAgentWorkOrder,
} from "../types";
import { makeRunId, nowIso, resolveUrl } from "../utils";
import { browserProviderRouteForCheck } from "./provider-routing";
import { checksForProject } from "./shared";
import { browserCheckStabilityRuns, MAX_BROWSER_STABILITY_RUNS } from "./stability-summary";

function executionCheckId(projectIndex: number, checkIndex: number) {
  return `browser-check:${projectIndex + 1}:${checkIndex + 1}`;
}

export function buildBrowserCheckExecutionPlan(
  workOrder: NormalizedTestAgentWorkOrder,
  preferredProvider = workOrder.options.browserProvider || "auto",
): BrowserCheckExecutionPlan {
  const items: BrowserCheckExecutionPlanItem[] = [];
  for (const [projectIndex, project] of workOrder.projects.entries()) {
    const checks = checksForProject(project, workOrder.acceptanceCriteria);
    for (const [checkIndex, check] of checks.entries()) {
      const route = browserProviderRouteForCheck(workOrder, check, preferredProvider);
      items.push({
        checkId: executionCheckId(projectIndex, checkIndex),
        project: project.name,
        projectIndex,
        checkIndex,
        name: check.name || `Browser check ${checkIndex + 1}`,
        url: resolveUrl(project.targetUrl, check.url || project.targetUrl),
        expectedRuns: browserCheckStabilityRuns(check),
        plannedProvider: route.provider,
        providerRoutingReason: route.reason,
        adversarial: check.adversarial === true,
        ...(check.probeType || check.probe_type ? { probeType: check.probeType || check.probe_type } : {}),
      });
    }
  }
  return {
    schema: "ccm-test-agent-browser-execution-plan-v1",
    planId: makeRunId("browser-execution-plan"),
    createdAt: nowIso(),
    preferredProvider,
    plannedCheckCount: items.length,
    expectedRunCount: items.reduce((sum, item) => sum + item.expectedRuns, 0),
    items,
  };
}

export function browserCheckExecutionPlanErrors(plan: BrowserCheckExecutionPlan) {
  const errors: string[] = [];
  if (plan?.schema !== "ccm-test-agent-browser-execution-plan-v1") errors.push("browser execution plan schema is invalid.");
  if (!String(plan?.planId || "").trim()) errors.push("browser execution plan planId is missing.");
  if (!String(plan?.createdAt || "").trim()) errors.push("browser execution plan createdAt is missing.");
  const items = Array.isArray(plan?.items) ? plan.items : [];
  if (plan?.plannedCheckCount !== items.length) errors.push("browser execution plan plannedCheckCount does not match items.length.");
  const expectedRunCount = items.reduce((sum, item) => sum + Number(item.expectedRuns || 0), 0);
  if (plan?.expectedRunCount !== expectedRunCount) errors.push("browser execution plan expectedRunCount does not match item runs.");
  const ids = items.map(item => item.checkId);
  if (new Set(ids).size !== ids.length) errors.push("browser execution plan contains duplicate checkId values.");
  for (const [index, item] of items.entries()) {
    const label = `browser execution plan item ${index}`;
    if (item.checkId !== executionCheckId(item.projectIndex, item.checkIndex)) errors.push(`${label} checkId does not match its indexes.`);
    if (!Number.isInteger(item.projectIndex) || item.projectIndex < 0) errors.push(`${label} projectIndex is invalid.`);
    if (!Number.isInteger(item.checkIndex) || item.checkIndex < 0) errors.push(`${label} checkIndex is invalid.`);
    if (!Number.isInteger(item.expectedRuns) || item.expectedRuns < 1 || item.expectedRuns > MAX_BROWSER_STABILITY_RUNS) {
      errors.push(`${label} expectedRuns is invalid.`);
    }
    if (!item.project || !item.name) errors.push(`${label} is missing project or name.`);
  }
  return errors;
}

export function browserCheckExecutionIdentity(input: {
  workOrder: NormalizedTestAgentWorkOrder;
  project: NormalizedTestAgentProjectTarget;
  checkIndex: number;
  run?: number;
  expectedRuns?: number;
  evidence?: BrowserCheckExecutionIdentity["evidence"];
}): BrowserCheckExecutionIdentity {
  const projectIndex = input.workOrder.projects.indexOf(input.project);
  let plan = input.workOrder.metadata?.browserCheckExecutionPlan as BrowserCheckExecutionPlan | undefined;
  if (!plan?.planId) {
    plan = buildBrowserCheckExecutionPlan(input.workOrder);
    input.workOrder.metadata = {
      ...input.workOrder.metadata,
      browserCheckExecutionPlan: plan,
    };
  }
  return {
    planId: plan.planId,
    checkId: executionCheckId(projectIndex, input.checkIndex),
    projectIndex,
    checkIndex: input.checkIndex,
    run: input.run || 1,
    expectedRuns: input.expectedRuns || 1,
    evidence: input.evidence || "provider",
  };
}

export function withBrowserCheckExecutionIdentity(input: {
  result: BrowserCheckResult;
  workOrder: NormalizedTestAgentWorkOrder;
  project: NormalizedTestAgentProjectTarget;
  checkIndex: number;
  run?: number;
  expectedRuns?: number;
}): BrowserCheckResult {
  return {
    ...input.result,
    execution: browserCheckExecutionIdentity({
      workOrder: input.workOrder,
      project: input.project,
      checkIndex: input.checkIndex,
      run: input.run,
      expectedRuns: input.expectedRuns,
    }),
  };
}

function emptyStatusCounts(): BrowserCheckExecutionCoverageSummary["statusCounts"] {
  return { complete: 0, incomplete: 0, invalid: 0 };
}

function identityMatchesPlan(identity: BrowserCheckExecutionIdentity, plan: BrowserCheckExecutionPlan, item: BrowserCheckExecutionPlanItem) {
  return identity.planId === plan.planId
    && identity.checkId === item.checkId
    && identity.projectIndex === item.projectIndex
    && identity.checkIndex === item.checkIndex
    && identity.expectedRuns === item.expectedRuns
    && Number.isInteger(identity.run)
    && identity.run >= 1
    && identity.run <= item.expectedRuns;
}

export function buildBrowserCheckExecutionCoverage(
  plan: BrowserCheckExecutionPlan,
  results: BrowserCheckResult[],
): BrowserCheckExecutionCoverageSummary {
  const planById = new Map(plan.items.map(item => [item.checkId, item]));
  const providerRuns = new Map<string, Map<number, number>>();
  const syntheticRuns = new Map<string, Set<number>>();
  let providerResultCount = 0;
  let invalidResultCount = 0;
  let diagnosticResultCount = 0;
  let syntheticBlockedCount = 0;

  for (const result of results) {
    const identity = result.execution;
    if (!identity) {
      diagnosticResultCount += 1;
      continue;
    }
    const item = planById.get(identity.checkId);
    if (!item || !identityMatchesPlan(identity, plan, item)) {
      invalidResultCount += 1;
      continue;
    }
    if (identity.evidence === "synthetic_missing") {
      syntheticBlockedCount += 1;
      if (result.status !== "blocked") {
        invalidResultCount += 1;
        continue;
      }
      const runs = syntheticRuns.get(identity.checkId) || new Set<number>();
      runs.add(identity.run);
      syntheticRuns.set(identity.checkId, runs);
      continue;
    }
    if (identity.evidence !== "provider") {
      invalidResultCount += 1;
      continue;
    }
    providerResultCount += 1;
    const runs = providerRuns.get(identity.checkId) || new Map<number, number>();
    runs.set(identity.run, (runs.get(identity.run) || 0) + 1);
    providerRuns.set(identity.checkId, runs);
  }

  const items: BrowserCheckExecutionCoverageItem[] = plan.items.map(item => {
    const runs = providerRuns.get(item.checkId) || new Map<number, number>();
    const observedRuns = [...runs.keys()].sort((a, b) => a - b);
    const duplicateRuns = [...runs.entries()].filter(([, count]) => count > 1).map(([run]) => run).sort((a, b) => a - b);
    const missingRuns = Array.from({ length: item.expectedRuns }, (_, index) => index + 1)
      .filter(run => !runs.has(run));
    const syntheticBlockedRuns = [...(syntheticRuns.get(item.checkId) || new Set<number>())]
      .filter(run => missingRuns.includes(run))
      .sort((a, b) => a - b);
    const status: BrowserCheckExecutionCoverageStatus = duplicateRuns.length
      ? "invalid"
      : missingRuns.length
        ? "incomplete"
        : "complete";
    return {
      checkId: item.checkId,
      project: item.project,
      name: item.name,
      plannedProvider: item.plannedProvider,
      expectedRuns: item.expectedRuns,
      observedRuns,
      missingRuns,
      duplicateRuns,
      syntheticBlockedRuns,
      status,
    };
  });
  const duplicateResultCount = items.reduce((sum, item) => sum + item.duplicateRuns.reduce((runSum, run) => {
    return runSum + Math.max(0, (providerRuns.get(item.checkId)?.get(run) || 0) - 1);
  }, 0), 0);
  const statusCounts = emptyStatusCounts();
  for (const item of items) statusCounts[item.status] += 1;
  const missingRunCount = items.reduce((sum, item) => sum + item.missingRuns.length, 0);
  const status: BrowserCheckExecutionCoverageStatus = invalidResultCount || duplicateResultCount
    ? "invalid"
    : missingRunCount || diagnosticResultCount
      ? "incomplete"
      : "complete";
  return {
    status,
    plannedCheckCount: plan.plannedCheckCount,
    expectedRunCount: plan.expectedRunCount,
    coveredRunCount: items.reduce((sum, item) => sum + item.observedRuns.length, 0),
    missingRunCount,
    providerResultCount,
    duplicateResultCount,
    invalidResultCount,
    diagnosticResultCount,
    syntheticBlockedCount,
    statusCounts,
    items,
  };
}

export function browserCheckExecutionEvidenceErrors(input: {
  plan: BrowserCheckExecutionPlan;
  results: BrowserCheckResult[];
  summary?: BrowserCheckExecutionCoverageSummary;
  reportStatus?: string;
}) {
  const errors = browserCheckExecutionPlanErrors(input.plan);
  const expected = buildBrowserCheckExecutionCoverage(input.plan, input.results || []);
  if (input.summary && JSON.stringify(input.summary) !== JSON.stringify(expected)) {
    errors.push("browserCheckExecutionCoverage does not match the execution plan and browser results.");
  }
  if (!input.summary) errors.push("browserCheckExecutionCoverage is missing.");
  const planById = new Map(input.plan.items.map(item => [item.checkId, item]));
  const syntheticCounts = new Map<string, number>();
  for (const [index, result] of (input.results || []).entries()) {
    const identity = result.execution;
    if (!identity) continue;
    const item = planById.get(identity.checkId);
    if (!item || !identityMatchesPlan(identity, input.plan, item)) {
      errors.push(`browserResults[${index}] has an execution identity outside the plan.`);
      continue;
    }
    if (result.project !== item.project) {
      errors.push(`browserResults[${index}] project does not match its execution plan item.`);
    }
    if (identity.evidence === "synthetic_missing") {
      const key = `${identity.checkId}::${identity.run}`;
      syntheticCounts.set(key, (syntheticCounts.get(key) || 0) + 1);
      if (result.status !== "blocked") errors.push(`browserResults[${index}] synthetic missing evidence must be blocked.`);
    }
  }
  for (const item of expected.items) {
    for (const run of item.missingRuns) {
      const count = syntheticCounts.get(`${item.checkId}::${run}`) || 0;
      if (count !== 1) errors.push(`browser check ${item.checkId} missing run ${run} requires exactly one synthetic blocked result, found ${count}.`);
    }
    for (const run of item.observedRuns) {
      if (syntheticCounts.has(`${item.checkId}::${run}`)) errors.push(`browser check ${item.checkId} observed run ${run} must not also have synthetic missing evidence.`);
    }
  }
  if (input.reportStatus === "passed" && expected.status !== "complete") {
    errors.push(`passed report has ${expected.status} browser execution coverage.`);
  }
  return errors;
}

function missingResult(plan: BrowserCheckExecutionPlan, item: BrowserCheckExecutionPlanItem, run: number, diagnostic: string): BrowserCheckResult {
  const at = nowIso();
  return {
    provider: item.plannedProvider,
    project: item.project,
    name: item.name,
    url: item.url,
    status: "blocked",
    startedAt: at,
    finishedAt: at,
    durationMs: 0,
    steps: [],
    screenshots: [],
    consoleErrors: [],
    pageErrors: [],
    networkErrors: [],
    execution: {
      planId: plan.planId,
      checkId: item.checkId,
      projectIndex: item.projectIndex,
      checkIndex: item.checkIndex,
      run,
      expectedRuns: item.expectedRuns,
      evidence: "synthetic_missing",
    },
    adversarial: item.adversarial,
    probeType: item.probeType,
    error: `Browser execution coverage is missing provider evidence for run ${run}/${item.expectedRuns}.${diagnostic ? ` Provider diagnostic: ${diagnostic}` : ""}`,
  };
}

function coverageDiagnosticResult(summary: BrowserCheckExecutionCoverageSummary): BrowserCheckResult {
  const at = nowIso();
  return {
    provider: "none",
    project: "",
    name: "Browser check execution coverage",
    url: "",
    status: "blocked",
    startedAt: at,
    finishedAt: at,
    durationMs: 0,
    steps: [],
    screenshots: [],
    consoleErrors: [],
    pageErrors: [],
    networkErrors: [],
    error: `Browser provider returned invalid execution evidence: duplicateResults=${summary.duplicateResultCount}; invalidResults=${summary.invalidResultCount}.`,
  };
}

export function reconcileBrowserCheckExecution(
  plan: BrowserCheckExecutionPlan,
  providerResults: BrowserCheckResult[],
) {
  const initial = buildBrowserCheckExecutionCoverage(plan, providerResults);
  const diagnostic = providerResults
    .filter(result => !result.execution && result.error)
    .map(result => String(result.error))
    .slice(0, 3)
    .join("; ");
  const synthesized = initial.items.flatMap(item => {
    const planItem = plan.items.find(candidate => candidate.checkId === item.checkId)!;
    return item.missingRuns.map(run => missingResult(plan, planItem, run, diagnostic));
  });
  const results = [...providerResults, ...synthesized];
  if (initial.invalidResultCount || initial.duplicateResultCount) {
    results.push(coverageDiagnosticResult(initial));
  }
  return {
    results,
    summary: buildBrowserCheckExecutionCoverage(plan, results),
  };
}

export function formatBrowserCheckExecutionCoverageLine(summary?: BrowserCheckExecutionCoverageSummary) {
  if (!summary) return "status=incomplete; checks=0; runs=0/0; missing=0; duplicate=0; invalid=0";
  return [
    `status=${summary.status}`,
    `checks=${summary.plannedCheckCount}`,
    `runs=${summary.coveredRunCount}/${summary.expectedRunCount}`,
    `missing=${summary.missingRunCount}`,
    `duplicate=${summary.duplicateResultCount}`,
    `invalid=${summary.invalidResultCount}`,
    `diagnostics=${summary.diagnosticResultCount}`,
  ].join("; ");
}

export function formatBrowserCheckExecutionCoverageAttentionLines(
  summary?: BrowserCheckExecutionCoverageSummary,
  limit = 5,
) {
  const attention = (summary?.items || []).filter(item => item.status !== "complete");
  if (!attention.length) return ["Browser execution coverage attention: none"];
  return [
    "Browser execution coverage attention:",
    ...attention.slice(0, Math.max(0, limit)).map(item =>
      `- ${item.project} / ${item.name}: ${item.status}; observed=${item.observedRuns.join(",") || "none"}; missing=${item.missingRuns.join(",") || "none"}; duplicate=${item.duplicateRuns.join(",") || "none"}`
    ),
  ];
}
