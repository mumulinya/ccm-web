export type TestAgentReviewTier = "lightweight" | "standard" | "interactive" | "critical";
export type TestAgentFailureRoute = "accept" | "implementation_rework" | "test_agent_recheck" | "environment" | "needs_user";
export type TestAgentEvidenceType = "code_diff" | "command" | "http" | "browser" | "artifact";

export type TestAgentAcceptanceEvidence = {
  criterion: string;
  observableOutcome: string;
  evidenceTypes: TestAgentEvidenceType[];
  target: string;
};

export type TestAgentVerificationProfile = {
  tier: TestAgentReviewTier;
  changeClass: "documentation" | "configuration" | "code" | "interactive" | "critical";
  reason: string;
};

export type TestAgentReviewPolicy = {
  schema: "ccm-test-agent-review-policy-v1";
  tier: TestAgentReviewTier;
  reason: string;
  requiredChecks: string[];
  browserEnabled: boolean;
  httpEnabled: boolean;
  requireAdversarialProbe: boolean;
  collectBrowserArtifacts: boolean;
  autoDiscoverVerificationCommands: boolean;
};

export type TestAgentIncrementalScope = {
  schema: "ccm-test-agent-incremental-scope-v1";
  mode: "full" | "incremental";
  round: number;
  acceptanceCriteria: string[];
  focusedAcceptanceCriteria: string[];
  coreRegressionCriteria: string[];
  verificationCommands: string[];
  focusedCommands: string[];
  coreRegressionCommands: string[];
  browserCheckNames: string[];
};

const EVIDENCE_TYPES = new Set<TestAgentEvidenceType>(["code_diff", "command", "http", "browser", "artifact"]);
const REVIEW_TIERS = new Set<TestAgentReviewTier>(["lightweight", "standard", "interactive", "critical"]);
const CHANGE_CLASSES = new Set(["documentation", "configuration", "code", "interactive", "critical"]);
const TIER_RANK: Record<TestAgentReviewTier, number> = { lightweight: 0, standard: 1, interactive: 2, critical: 3 };

function text(value: any, max = 800) {
  return String(value || "").trim().slice(0, max);
}

function strings(value: any, max = 20, itemMax = 800) {
  return [...new Set((Array.isArray(value) ? value : []).map(item => text(item, itemMax)).filter(Boolean))].slice(0, max);
}

function status(value: any) {
  return String(value || "").trim().toLowerCase();
}

function atLeast(value: TestAgentReviewTier, minimum: TestAgentReviewTier) {
  return TIER_RANK[value] >= TIER_RANK[minimum] ? value : minimum;
}

export function normalizeTestAgentAcceptanceEvidencePlan(value: any): TestAgentAcceptanceEvidence[] {
  const rows = Array.isArray(value) ? value.slice(0, 20) : [];
  const normalized = rows.map((row: any, index: number) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`第 ${index + 1} 条验收标准缺少结构化证据计划`);
    }
    const criterion = text(row.criterion || row.acceptanceCriterion || row.acceptance_criterion, 800);
    const observableOutcome = text(row.observableOutcome || row.observable_outcome, 800);
    const evidenceTypes = strings(row.evidenceTypes || row.evidence_types, 5, 40)
      .filter(item => EVIDENCE_TYPES.has(item as TestAgentEvidenceType)) as TestAgentEvidenceType[];
    const target = text(row.target || row.scope || row.surface, 300);
    if (!criterion || !observableOutcome || !target || !evidenceTypes.length) {
      throw new Error(`第 ${index + 1} 条验收标准必须包含目标、可观察结果、证据类型和验收对象`);
    }
    return { criterion, observableOutcome, evidenceTypes, target };
  });
  if (!normalized.length) throw new Error("主 Agent 未生成可执行的验收证据计划");
  return normalized;
}

export function normalizeTestAgentVerificationProfile(value: any): TestAgentVerificationProfile {
  const tier = String(value?.tier || "") as TestAgentReviewTier;
  const changeClass = String(value?.changeClass || value?.change_class || "");
  const reason = text(value?.reason, 800);
  if (!REVIEW_TIERS.has(tier) || !CHANGE_CLASSES.has(changeClass) || !reason) {
    throw new Error("主 Agent 未生成有效的验收风险分级");
  }
  return {
    tier,
    changeClass: changeClass as TestAgentVerificationProfile["changeClass"],
    reason,
  };
}

export function deriveTestAgentReviewPolicy(input: {
  profile?: Partial<TestAgentVerificationProfile> | null;
  workflowDecision?: any;
  evidencePlan?: TestAgentAcceptanceEvidence[];
  hasTestTarget?: boolean;
}): TestAgentReviewPolicy {
  const decision = input.workflowDecision || {};
  const modes = new Set(strings(decision.verificationModes || decision.verification_modes, 10, 40));
  const evidenceTypes = new Set((input.evidencePlan || []).flatMap(item => item.evidenceTypes || []));
  const requestedTier = REVIEW_TIERS.has(input.profile?.tier as TestAgentReviewTier)
    ? input.profile!.tier as TestAgentReviewTier
    : "lightweight";
  const changeClass = String(input.profile?.changeClass || "");
  const browserEnabled = evidenceTypes.has("browser")
    || modes.has("browser")
    || modes.has("visual")
    || (modes.has("integration") && input.hasTestTarget === true);
  const httpEnabled = evidenceTypes.has("http") || modes.has("http") || modes.has("integration");
  let tier = requestedTier;
  if (decision.riskLevel === "high" || modes.has("release") || changeClass === "critical") tier = "critical";
  else if (browserEnabled || changeClass === "interactive") tier = atLeast(tier, "interactive");
  else if (decision.requiresCodeChanges === true || changeClass === "code") tier = atLeast(tier, "standard");
  const requireAdversarialProbe = tier === "critical";
  const requiredChecks = strings([
    ...(tier === "lightweight" ? [] : ["commands"]),
    ...(httpEnabled ? ["http"] : []),
    ...(browserEnabled ? ["browser_e2e", "screenshots", "console_errors"] : []),
    ...(requireAdversarialProbe ? ["adversarial"] : []),
  ], 20, 80);
  return {
    schema: "ccm-test-agent-review-policy-v1",
    tier,
    reason: text(input.profile?.reason || decision.reason || "根据模型工作流决策选择验收强度", 800),
    requiredChecks,
    browserEnabled,
    httpEnabled,
    requireAdversarialProbe,
    collectBrowserArtifacts: browserEnabled,
    autoDiscoverVerificationCommands: tier !== "lightweight",
  };
}

function coverageCriteria(review: any, expectedStatus: string[]) {
  const verdict = review?.verdict || review?.invocation?.verdict || {};
  const report = review?.report || review?.invocation?.report || {};
  const rows = [
    ...(Array.isArray(report.acceptanceCoverage) ? report.acceptanceCoverage : []),
    ...(Array.isArray(verdict.failedAcceptanceCriteria) ? verdict.failedAcceptanceCriteria : []),
    ...(Array.isArray(verdict.unknownAcceptanceCriteria) ? verdict.unknownAcceptanceCriteria : []),
  ];
  return strings(rows
    .filter((item: any) => expectedStatus.includes(status(item?.status)))
    .map((item: any) => item?.criterion), 20, 800);
}

function resultCommands(review: any, expectedStatus: string[]) {
  const report = review?.report || review?.invocation?.report || {};
  return strings((Array.isArray(report.commandResults) ? report.commandResults : [])
    .filter((item: any) => expectedStatus.includes(status(item?.status)))
    .map((item: any) => item?.command), 20, 300);
}

export function buildTestAgentIncrementalScope(input: {
  round: number;
  acceptanceCriteria: string[];
  verificationCommands: string[];
  previousReview?: any;
}): TestAgentIncrementalScope {
  const allCriteria = strings(input.acceptanceCriteria, 20, 800);
  const allCommands = strings(input.verificationCommands, 30, 300);
  const previous = input.previousReview;
  if (input.round <= 1 || !previous) {
    return {
      schema: "ccm-test-agent-incremental-scope-v1",
      mode: "full",
      round: Math.max(1, input.round),
      acceptanceCriteria: allCriteria,
      focusedAcceptanceCriteria: allCriteria,
      coreRegressionCriteria: [],
      verificationCommands: allCommands,
      focusedCommands: allCommands,
      coreRegressionCommands: [],
      browserCheckNames: [],
    };
  }
  const focusedAcceptanceCriteria = strings([
    ...coverageCriteria(previous, ["not_verified", "unknown"]),
    ...(previous?.verdict?.failedAcceptanceCriteria || []).map((item: any) => item?.criterion),
    ...(previous?.verdict?.unknownAcceptanceCriteria || []).map((item: any) => item?.criterion),
  ], 20, 800);
  const verifiedCriteria = coverageCriteria(previous, ["verified"]);
  const coreRegressionCriteria = verifiedCriteria.slice(0, 1);
  const focusedCommands = resultCommands(previous, ["failed", "blocked", "timed_out"]);
  const coreRegressionCommands = resultCommands(previous, ["passed"]).slice(0, 1);
  const report = previous?.report || previous?.invocation?.report || {};
  const browserCheckNames = strings((Array.isArray(report.browserResults) ? report.browserResults : [])
    .filter((item: any) => ["failed", "blocked", "partial", "timed_out"].includes(status(item?.status)))
    .map((item: any) => item?.name), 12, 300);
  const scopedCriteria = strings([
    ...(focusedAcceptanceCriteria.length ? focusedAcceptanceCriteria : allCriteria),
    ...coreRegressionCriteria,
  ], 20, 800);
  const scopedCommands = strings([
    ...(focusedCommands.length ? focusedCommands : allCommands),
    ...coreRegressionCommands,
  ], 30, 300);
  return {
    schema: "ccm-test-agent-incremental-scope-v1",
    mode: "incremental",
    round: input.round,
    acceptanceCriteria: scopedCriteria,
    focusedAcceptanceCriteria,
    coreRegressionCriteria,
    verificationCommands: scopedCommands,
    focusedCommands,
    coreRegressionCommands,
    browserCheckNames,
  };
}

function resultsByStatus(report: any, expected: string[]) {
  return ["commandResults", "devServerResults", "httpResults", "browserResults"]
    .flatMap(key => Array.isArray(report?.[key]) ? report[key] : [])
    .filter((item: any) => expected.includes(status(item?.status)));
}

export function classifyTestAgentReview(review: any): {
  route: TestAgentFailureRoute;
  reason: string;
} {
  if (review?.canAccept === true) return { route: "accept", reason: "TestAgent 证据门禁已通过" };
  const report = review?.report || review?.invocation?.report || {};
  const verdict = review?.verdict || review?.invocation?.verdict || {};
  const failed = resultsByStatus(report, ["failed"]);
  const blocked = resultsByStatus(report, ["blocked", "timed_out"]);
  const unknownCoverage = [
    ...(Array.isArray(report.requiredCheckCoverage) ? report.requiredCheckCoverage : []),
    ...(Array.isArray(report.acceptanceCoverage) ? report.acceptanceCoverage : []),
  ].filter((item: any) => status(item?.status) === "unknown");
  const providerGaps = Array.isArray(report.browserProviderGaps) ? report.browserProviderGaps : [];
  const flaky = Number(report.browserStabilitySummary?.statusCounts?.flaky || 0);
  const invocationStatus = status(review?.invocation?.status || review?.runner?.status || review?.status);
  if (failed.length) {
    return { route: "implementation_rework", reason: "存在由真实执行证据确认的实现失败" };
  }
  if (blocked.length
    || verdict.needsEnvironment === true
    || status(report.status) === "blocked"
    || ["blocked", "timed_out", "timeout"].includes(invocationStatus)) {
    return { route: "environment", reason: "验证环境、服务、凭据或执行条件阻塞" };
  }
  if (unknownCoverage.length || providerGaps.length || flaky > 0 || status(report.status) === "partial" || verdict.needsRecheck === true) {
    return { route: "test_agent_recheck", reason: "实现尚未被判定失败，但验收证据需要补齐或重新执行" };
  }
  if (verdict.needsRework === true || status(verdict.recommendation) === "rework") {
    return { route: "implementation_rework", reason: "TestAgent 验收结论确认需要修复实现" };
  }
  return { route: "needs_user", reason: "现有证据不足以自动验收或自动返工" };
}

export function runTestAgentReviewPolicySelfTest() {
  const evidencePlan = normalizeTestAgentAcceptanceEvidencePlan([{
    criterion: "保存后页面展示新名称",
    observableOutcome: "提交表单后标题区域显示用户输入的新名称",
    evidenceTypes: ["browser"],
    target: "项目编辑页面",
  }]);
  const policy = deriveTestAgentReviewPolicy({
    profile: { tier: "interactive", changeClass: "interactive", reason: "用户可见交互" },
    workflowDecision: { riskLevel: "write", requiresCodeChanges: true, verificationModes: ["browser"] },
    evidencePlan,
    hasTestTarget: true,
  });
  const scope = buildTestAgentIncrementalScope({
    round: 2,
    acceptanceCriteria: ["保存后页面展示新名称", "项目列表保持可用"],
    verificationCommands: ["npm run check", "npm run build"],
    previousReview: {
      report: {
        acceptanceCoverage: [
          { criterion: "保存后页面展示新名称", status: "not_verified" },
          { criterion: "项目列表保持可用", status: "verified" },
        ],
        commandResults: [
          { command: "npm run check", status: "failed" },
          { command: "npm run build", status: "passed" },
        ],
        browserResults: [{ name: "编辑项目名称", status: "failed" }],
      },
    },
  });
  const environment = classifyTestAgentReview({
    report: { status: "blocked", devServerResults: [{ status: "blocked" }] },
  });
  return {
    pass: policy.tier === "interactive"
      && policy.browserEnabled
      && policy.requireAdversarialProbe === false
      && scope.mode === "incremental"
      && scope.acceptanceCriteria.length === 2
      && scope.verificationCommands.join("|") === "npm run check|npm run build"
      && scope.browserCheckNames[0] === "编辑项目名称"
      && environment.route === "environment",
    evidencePlan,
    policy,
    scope,
    environment,
  };
}
