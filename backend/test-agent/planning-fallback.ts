import {
  buildTestAgentHardeningPolicy,
  inferTestAgentRiskTier,
  isOperationalPlanningFailure,
  plannerFallbackAllowed,
  testAgentHardeningChecksum,
  testAgentTierAtLeast,
  type TestAgentHardeningPolicyV1,
  type TestAgentHardeningRiskTier,
} from "./hardening-policy";
import { recordTestAgentHardeningMetric } from "./hardening-metrics";
import { isUnsafeVerificationCommand } from "./utils";
import type {
  NormalizedTestAgentWorkOrder,
  WorkOrderIssue,
} from "./types";

/**
 * The planner is an optional semantic aid.  The checks already present in a
 * handoff are the only checks that may be used by a fallback; this module keeps
 * that rule independent from the (large) execution and planner modules.
 */
export type TestAgentPlanningFallbackStatus =
  | "model_applied"
  | "deterministic_fallback"
  | "degraded_blocked"
  | "blocked"
  | "environment_blocked";

export type TestAgentPlanningFailureClass =
  | "none"
  | "provider_unavailable"
  | "invalid_json"
  | "invalid_handoff"
  | "safety_blocked"
  | "acceptance_uncovered"
  | "unknown";

export interface TestAgentPlanningReceiptV2 {
  schema: "ccm-test-agent-planning-receipt-v2";
  version: 2;
  status: TestAgentPlanningFallbackStatus;
  riskTier: TestAgentHardeningRiskTier;
  model: string;
  provider: string;
  deterministicFallback: boolean;
  /** snake_case alias retained for integrations that consume protocol fields. */
  deterministic_fallback: boolean;
  degraded: boolean;
  blocked: boolean;
  failureClass: TestAgentPlanningFailureClass;
  failureReason: string;
  coverageChecksum: string;
  policyChecksum: string;
  deterministicCheckCount: number;
  mappedCriteriaCount: number;
  criteriaCount: number;
  isolationStatus: string;
  isolationReady: boolean;
  decidedAt: string;
  checksum: string;
}

export interface TestAgentDeterministicCheckInventory {
  commands: string[];
  http: string[];
  browser: string[];
  all: string[];
  unsafeCommands: string[];
}

export interface TestAgentDeterministicCoverage {
  criteria: string[];
  mapped: Record<string, string[]>;
  unmapped: string[];
  inventory: TestAgentDeterministicCheckInventory;
  checksum: string;
}

export interface TestAgentPlannerFallbackDecision {
  allowed: boolean;
  status: "deterministic_fallback" | "environment_blocked" | "degraded_blocked" | "blocked";
  failureClass: TestAgentPlanningFailureClass;
  reason: string;
  policy: TestAgentHardeningPolicyV1;
  coverage: TestAgentDeterministicCoverage;
  isolationStatus: string;
  isolationReady: boolean;
}

function cleanText(value: any, max = 800) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function lower(value: any) {
  return cleanText(value, 1_200).toLowerCase();
}

function unique(values: any[], max = 80) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values || []) {
    const item = cleanText(value, 500);
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
    if (output.length >= max) break;
  }
  return output;
}

function normalizedCriterion(value: any) {
  return cleanText(value, 800).replace(/[\s\u3000]+/g, " ").toLowerCase();
}

function metadataOf(workOrder: any) {
  return (workOrder?.metadata && typeof workOrder.metadata === "object") ? workOrder.metadata : {};
}

function metadataCandidate(metadata: any, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (value && typeof value === "object") return value;
  }
  return null;
}

/** Resolve the frozen policy when a caller did not persist one yet (v1 compatibility). */
export function resolveTestAgentHardeningPolicy(workOrder: NormalizedTestAgentWorkOrder): TestAgentHardeningPolicyV1 {
  const metadata = metadataOf(workOrder);
  const hardening = metadataCandidate(metadata, [
    "hardeningPolicy",
    "hardening_policy",
    "acceptancePolicySnapshot",
    "acceptance_policy_snapshot",
  ]) || metadataCandidate(metadata.verificationHardening, ["policy", "hardeningPolicy", "hardening_policy"]);
  if (hardening?.schema === "ccm-test-agent-hardening-policy-v1") {
    const checksum = String(hardening.checksum || "");
    if (checksum && testAgentHardeningChecksum(Object.fromEntries(Object.entries(hardening).filter(([key]) => key !== "checksum"))) === checksum) {
      return hardening as TestAgentHardeningPolicyV1;
    }
  }
  const reviewPolicy = metadataCandidate(metadata, ["reviewPolicy", "review_policy", "testAgentReviewPolicy", "test_agent_review_policy"]);
  const riskTier = inferTestAgentRiskTier({
    ...metadata,
    ...(reviewPolicy || {}),
    reviewPolicy,
    workflowDecision: metadata.workflowDecision || metadata.workflow_decision,
  });
  return buildTestAgentHardeningPolicy({ riskTier, reviewPolicy });
}

function checkName(type: string, project: string, value: any, fallback: string) {
  const explicit = cleanText(value?.name, 300);
  if (explicit) return `${project}:${explicit}`;
  return `${project}:${type}:${cleanText(value?.url, 260) || fallback}`;
}

function checkCoverageValues(value: any): string[] {
  const raw = value?.coversAcceptanceCriteria
    || value?.covers_acceptance_criteria
    || value?.acceptanceCriteria
    || value?.acceptance_criteria
    || [];
  return unique(Array.isArray(raw) ? raw : [raw], 20);
}

function criterionRows(metadata: any): any[] {
  const candidate = metadataCandidate(metadata, [
    "deterministicCriterionCoverage",
    "deterministic_criterion_coverage",
    "acceptanceCriterionCoverage",
    "acceptance_criterion_coverage",
    "criterionCoverage",
    "criterion_coverage",
  ]);
  if (Array.isArray(candidate)) return candidate;
  if (candidate && typeof candidate === "object") {
    return Object.entries(candidate).map(([criterion, checks]) => ({ criterion, checkNames: checks }));
  }
  return [];
}

function acceptanceEvidenceRows(metadata: any): any[] {
  const candidate = metadataCandidate(metadata, ["acceptanceEvidencePlan", "acceptance_evidence_plan"]);
  return Array.isArray(candidate) ? candidate : [];
}

function buildInventory(workOrder: NormalizedTestAgentWorkOrder): TestAgentDeterministicCheckInventory {
  const commands: string[] = [];
  const http: string[] = [];
  const browser: string[] = [];
  const unsafeCommands: string[] = [];
  for (const project of workOrder.projects || []) {
    for (const command of project.verificationCommands || []) {
      const value = cleanText(command, 300);
      if (!value) continue;
      if (isUnsafeVerificationCommand(value)) {
        unsafeCommands.push(`${project.name}:${value}`);
        continue;
      }
      commands.push(`${project.name}:${value}`);
    }
    for (const check of [...(project.httpChecks || []), ...(project.adversarialHttpChecks || [])]) {
      http.push(checkName("http", project.name, check, check?.url || "request"));
    }
    for (const check of [...(project.browserChecks || []), ...(project.adversarialBrowserChecks || [])]) {
      browser.push(checkName("browser", project.name, check, "browser-check"));
    }
  }
  const all = unique([...commands, ...http, ...browser], 160);
  return {
    commands: unique(commands),
    http: unique(http),
    browser: unique(browser),
    all,
    unsafeCommands: unique(unsafeCommands),
  };
}

function inventoryType(name: string, inventory: TestAgentDeterministicCheckInventory) {
  if (inventory.commands.includes(name)) return "command";
  if (inventory.http.includes(name)) return "http";
  if (inventory.browser.includes(name)) return "browser";
  return "";
}

/**
 * Build criterion-to-check mappings without guessing from natural-language
 * criterion text.  Explicit coversAcceptanceCriteria and structured evidence
 * plans are accepted; a bare requiredChecks entry is intentionally insufficient.
 */
export function buildTestAgentDeterministicCoverage(workOrder: NormalizedTestAgentWorkOrder): TestAgentDeterministicCoverage {
  const metadata = metadataOf(workOrder);
  const inventory = buildInventory(workOrder);
  const criteria = unique(workOrder.acceptanceCriteria || [], 40);
  const knownByName = new Map(inventory.all.map(name => [name.toLowerCase(), name]));
  const mapped: Record<string, string[]> = {};
  const add = (criterion: string, checks: any[]) => {
    const key = normalizedCriterion(criterion);
    if (!key) return;
    const resolved = (checks || [])
      .flatMap(value => {
        const raw = cleanText(value, 500);
        if (!raw) return [];
        const exact = knownByName.get(raw.toLowerCase());
        if (exact) return [exact];
        // Accept a check's local name as a convenience for handoff builders.
        const suffix = inventory.all.find(item => item.endsWith(`:${raw}`));
        return suffix ? [suffix] : [];
      });
    mapped[key] = unique([...(mapped[key] || []), ...resolved], 20);
  };

  for (const project of workOrder.projects || []) {
    const typedChecks: Array<{ type: "http" | "browser"; check: any }> = [
      ...(project.httpChecks || []).map(check => ({ type: "http" as const, check })),
      ...(project.adversarialHttpChecks || []).map(check => ({ type: "http" as const, check })),
      ...(project.browserChecks || []).map(check => ({ type: "browser" as const, check })),
      ...(project.adversarialBrowserChecks || []).map(check => ({ type: "browser" as const, check })),
    ];
    for (const { type, check } of typedChecks) {
      for (const criterion of checkCoverageValues(check)) {
        const name = checkName(type, project.name, check, check?.url || "check");
        add(criterion, [name]);
      }
    }
  }
  for (const row of criterionRows(metadata)) {
    const criterion = row?.criterion || row?.acceptanceCriterion || row?.acceptance_criterion;
    add(criterion, row?.checkNames || row?.check_names || row?.checks || row?.verificationCommands || row?.verification_commands || []);
  }
  // A structured evidence plan can name the executable evidence class.  This
  // is explicit enough for fallback, while still refusing free-text guesses.
  for (const row of acceptanceEvidenceRows(metadata)) {
    const criterion = row?.criterion || row?.acceptanceCriterion || row?.acceptance_criterion;
    const evidenceTypes = unique(row?.evidenceTypes || row?.evidence_types || [], 8).map(item => item.toLowerCase());
    const checks = evidenceTypes.flatMap(type => type === "command" ? inventory.commands : type === "http" ? inventory.http : type === "browser" ? inventory.browser : []);
    if (checks.length) add(criterion, checks);
  }
  const unmapped = criteria.filter(criterion => !mapped[normalizedCriterion(criterion)]?.length);
  const core = {
    criteria,
    mapped: Object.fromEntries(Object.entries(mapped).sort(([a], [b]) => a.localeCompare(b))),
    unmapped,
    inventory: {
      commands: inventory.commands,
      http: inventory.http,
      browser: inventory.browser,
      all: inventory.all,
      unsafeCommands: inventory.unsafeCommands,
    },
  };
  return { ...core, checksum: testAgentHardeningChecksum(core) };
}

function isolationInfo(workOrder: NormalizedTestAgentWorkOrder) {
  const metadata = metadataOf(workOrder);
  const candidate = metadataCandidate(metadata, ["isolationReceipt", "isolation_receipt"])
    || metadataCandidate(metadata.verificationHardening, ["isolationReceipt", "isolation_receipt"])
    || null;
  const status = cleanText(candidate?.status, 80).toLowerCase() || "missing";
  const tenantPresent = candidate?.testTenant?.present === true
    || candidate?.test_tenant?.present === true;
  return {
    status,
    ready: status === "ready" && tenantPresent,
  };
}

function classifyPlanningFailure(error: any): TestAgentPlanningFailureClass {
  const code = lower(error?.code);
  const message = lower(error?.message || error);
  const joined = `${code} ${message}`;
  if (/permission|unauthori[sz]ed|forbidden|unsafe|scope|security|权限|越权|越界|安全门|工作区.*不允许|目标.*不允许|handoff.*invalid|work.?order.*invalid|无效.*(handoff|工作单|作用域)/.test(joined)) {
    return /permission|unauthori[sz]ed|forbidden|权限|越权|越界|安全/.test(joined) ? "safety_blocked" : "invalid_handoff";
  }
  if (/未唯一覆盖|未知验收标准|无效验收覆盖|未绑定检查|无法形成可执行验收|acceptance.*(unsupported|needs_user|uncovered)|criterion.*(unsupported|uncovered)|验收.*(不支持|无法|缺少)/.test(joined)) {
    return "acceptance_uncovered";
  }
  if (isOperationalPlanningFailure(error)
    || /timeout|timed out|abort|provider|connection|network|fetch|invalid.?json|empty.?response|unavailable|429|5\d\d|尚未配置|未配置.*(模型|大模型)|未返回.*json|无效.*json|空响应|连接.*失败|网络.*失败|超时|限流|服务.*不可用/.test(joined)) {
    return /invalid.?json|未返回.*json|无效.*json|empty.?response|空响应/.test(joined) ? "invalid_json" : "provider_unavailable";
  }
  return "unknown";
}

function errorReason(error: any, failureClass: TestAgentPlanningFailureClass) {
  const code = cleanText(error?.code, 160);
  const message = cleanText(error?.message || error, 500);
  return cleanText([failureClass, code, message].filter(Boolean).join(": "), 650);
}

function policyFor(workOrder: NormalizedTestAgentWorkOrder) {
  const metadata = metadataOf(workOrder);
  const candidate = metadataCandidate(metadata, ["hardeningPolicy", "hardening_policy"])
    || metadataCandidate(metadata.verificationHardening, ["policy", "hardeningPolicy", "hardening_policy"]);
  const riskTier = inferTestAgentRiskTier({ ...metadata, reviewPolicy: metadata.reviewPolicy || metadata.review_policy });
  if (candidate?.schema === "ccm-test-agent-hardening-policy-v1") {
    const { checksum, ...core } = candidate;
    if (checksum && testAgentHardeningChecksum(core) === checksum) return candidate as TestAgentHardeningPolicyV1;
  }
  return buildTestAgentHardeningPolicy({ riskTier, reviewPolicy: metadata.reviewPolicy || metadata.review_policy });
}

export function decideTestAgentPlannerFallback(input: {
  workOrder: NormalizedTestAgentWorkOrder;
  error: any;
  preexistingIssues?: WorkOrderIssue[];
}): TestAgentPlannerFallbackDecision {
  const policy = policyFor(input.workOrder);
  const coverage = buildTestAgentDeterministicCoverage(input.workOrder);
  const isolation = isolationInfo(input.workOrder);
  const failureClass = classifyPlanningFailure(input.error);
  const invalidIssues = (input.preexistingIssues || []).filter(issue => issue.severity === "error");
  if (invalidIssues.length) {
    return {
      allowed: false,
      status: "blocked",
      failureClass: invalidIssues.some(issue => /unsafe|permission|scope|url|work_dir/i.test(String(issue.code || ""))) ? "safety_blocked" : "invalid_handoff",
      reason: cleanText(`handoff validation failed: ${invalidIssues.map(issue => issue.code || issue.message).join(", ")}`, 650),
      policy,
      coverage,
      isolationStatus: isolation.status,
      isolationReady: isolation.ready,
    };
  }
  if (failureClass !== "provider_unavailable" && failureClass !== "invalid_json") {
    return {
      allowed: false,
      status: "blocked",
      failureClass,
      reason: errorReason(input.error, failureClass),
      policy,
      coverage,
      isolationStatus: isolation.status,
      isolationReady: isolation.ready,
    };
  }
  const hasAnyChecks = coverage.inventory.all.length > 0;
  const allCriteriaMapped = coverage.criteria.length > 0 && coverage.unmapped.length === 0;
  const interactiveChecks = coverage.inventory.http.length + coverage.inventory.browser.length > 0;
  const hasDeterministicChecks = policy.riskTier === "standard" || policy.riskTier === "interactive"
    ? hasAnyChecks && allCriteriaMapped
    : hasAnyChecks;
  const allowed = policy.riskTier === "interactive"
    ? interactiveChecks && allCriteriaMapped && isolation.ready && policy.plannerFallbackMode !== "never"
    : policy.riskTier === "critical"
      ? false
      : plannerFallbackAllowed({
          policy,
          hasDeterministicChecks,
          hasPredeclaredInteractiveChecks: interactiveChecks,
          isolationReady: isolation.ready,
        });
  if (allowed) {
    return {
      allowed: true,
      status: "deterministic_fallback",
      failureClass,
      reason: errorReason(input.error, failureClass),
      policy,
      coverage,
      isolationStatus: isolation.status,
      isolationReady: isolation.ready,
    };
  }
  const environmentBlocked = policy.riskTier === "critical"
    || (policy.riskTier === "interactive" && (!isolation.ready || !interactiveChecks));
  return {
    allowed: false,
    status: environmentBlocked ? "environment_blocked" : "degraded_blocked",
    failureClass,
    reason: cleanText([
      errorReason(input.error, failureClass),
      !hasAnyChecks ? "no predeclared deterministic checks" : "acceptance criteria are not explicitly mapped to frozen checks",
      policy.riskTier === "interactive" && !isolation.ready ? `isolation not ready (${isolation.status})` : "",
    ].filter(Boolean).join("; "), 650),
    policy,
    coverage,
    isolationStatus: isolation.status,
    isolationReady: isolation.ready,
  };
}

function modelInfo(receipt: any, fallback = "") {
  return {
    model: cleanText(receipt?.model, 200) || fallback,
    provider: cleanText(receipt?.provider, 200) || (fallback ? "runtime-override" : ""),
    receiptChecksum: cleanText(receipt?.checksum, 160),
  };
}

export function buildTestAgentPlanningReceiptV2(input: {
  status: TestAgentPlanningFallbackStatus;
  riskTier: TestAgentHardeningRiskTier;
  error?: any;
  failureClass?: TestAgentPlanningFailureClass;
  semanticDecisionReceipt?: any;
  policy: TestAgentHardeningPolicyV1;
  coverage: TestAgentDeterministicCoverage;
  isolationStatus?: string;
  isolationReady?: boolean;
  modelFallbackName?: string;
}): TestAgentPlanningReceiptV2 {
  const fallback = input.status === "deterministic_fallback";
  const blocked = ["blocked", "environment_blocked", "degraded_blocked"].includes(input.status);
  const model = modelInfo(input.semanticDecisionReceipt, input.modelFallbackName || (fallback ? "" : input.status === "model_applied" ? "custom-planner" : ""));
  const core = {
    schema: "ccm-test-agent-planning-receipt-v2" as const,
    version: 2 as const,
    status: input.status,
    riskTier: input.riskTier,
    model: model.model,
    provider: model.provider,
    deterministicFallback: fallback,
    deterministic_fallback: fallback,
    degraded: fallback || input.status === "degraded_blocked",
    blocked,
    failureClass: input.failureClass || (input.status === "model_applied" ? "none" as const : classifyPlanningFailure(input.error)),
    failureReason: input.error
      ? errorReason(input.error, input.failureClass || (input.status === "model_applied" ? "none" : classifyPlanningFailure(input.error)))
      : "",
    coverageChecksum: input.coverage.checksum,
    policyChecksum: input.policy.checksum,
    deterministicCheckCount: input.coverage.inventory.all.length,
    mappedCriteriaCount: input.coverage.criteria.length - input.coverage.unmapped.length,
    criteriaCount: input.coverage.criteria.length,
    isolationStatus: cleanText(input.isolationStatus, 80),
    isolationReady: input.isolationReady === true,
    decidedAt: new Date().toISOString(),
  };
  return { ...core, checksum: testAgentHardeningChecksum(core) };
}

export function attachTestAgentPlanningMetadata(
  workOrder: NormalizedTestAgentWorkOrder,
  receipt: TestAgentPlanningReceiptV2,
  patch: Record<string, any> = {},
): NormalizedTestAgentWorkOrder {
  if (receipt.degraded === true || receipt.deterministic_fallback === true) {
    recordTestAgentHardeningMetric("test_agent_planner_fallback_total");
  }
  const metadata = metadataOf(workOrder);
  const hardening = metadata.verificationHardening && typeof metadata.verificationHardening === "object"
    ? metadata.verificationHardening
    : {};
  return {
    ...workOrder,
    metadata: {
      ...metadata,
      verificationHardening: {
        ...hardening,
        planningReceipt: receipt,
      },
      planningReceipt: receipt,
      ...patch,
    },
  };
}

export function testAgentPlanningIsBlocked(workOrder: NormalizedTestAgentWorkOrder) {
  const metadata = metadataOf(workOrder);
  const receipt = metadata.planningReceipt || metadata.verificationHardening?.planningReceipt;
  if (receipt && (receipt.blocked === true || ["blocked", "environment_blocked", "degraded_blocked"].includes(String(receipt.status)))) return true;
  return String(metadata.agenticPlanning?.status || "") === "blocked";
}

export function testAgentPlanningIsDegraded(workOrder: NormalizedTestAgentWorkOrder) {
  const metadata = metadataOf(workOrder);
  const receipt = metadata.planningReceipt || metadata.verificationHardening?.planningReceipt;
  return receipt?.degraded === true || receipt?.deterministicFallback === true || receipt?.deterministic_fallback === true
    || String(metadata.agenticPlanning?.status || "") === "degraded";
}

export function runTestAgentPlanningFallbackSelfTest() {
  const base: any = {
    schema: "ccm-test-agent-work-order-v1",
    id: "planning-fallback-self-test",
    acceptanceCriteria: ["命令检查通过"],
    projects: [{ name: "demo", workDir: process.cwd(), verificationCommands: ["npm test"], changedFiles: ["src/a.ts"] }],
    options: { agenticPlanning: true },
    metadata: {
      reviewPolicy: { tier: "standard" },
      deterministicCriterionCoverage: [{ criterion: "命令检查通过", checkNames: ["demo:npm test"] }],
    },
  };
  const normalized = require("./work-order").normalizeTestAgentWorkOrder(base).workOrder as NormalizedTestAgentWorkOrder;
  const standard = decideTestAgentPlannerFallback({ workOrder: normalized, error: new Error("provider timeout") });
  const criticalOrder = { ...normalized, metadata: { ...normalized.metadata, reviewPolicy: { tier: "critical" } } };
  const critical = decideTestAgentPlannerFallback({ workOrder: criticalOrder, error: new Error("provider timeout") });
  const invalid = decideTestAgentPlannerFallback({ workOrder: normalized, error: new Error("unknown criterion coverage") });
  return {
    pass: standard.allowed && standard.status === "deterministic_fallback" && !critical.allowed && critical.status === "environment_blocked" && !invalid.allowed,
    standard,
    critical,
    invalid,
  };
}
