export const PRESENTED_PLAN_QUALITY_ERROR = "PRESENTED_PLAN_QUALITY";
export const PRESENTED_PLAN_QUALITY_GOAL_MIN = 60;
export const PRESENTED_PLAN_QUALITY_TITLE_MAX = 240;

export type PresentedPlanQuality = {
  ok: boolean;
  issues: string[];
  directive: string;
  repaired?: boolean;
};

function compactLine(value: any, max = 400) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function asList(value: any) {
  return Array.isArray(value) ? value : [];
}

function stepTitles(plan: any) {
  return asList(plan?.steps).map((step: any, index: number) => {
    const raw = String(step?.title || step?.label || "");
    return {
      index,
      raw,
      title: compactLine(raw, PRESENTED_PLAN_QUALITY_TITLE_MAX),
    };
  });
}

export function evaluatePresentedPlanQuality(plan: any): PresentedPlanQuality {
  const issues: string[] = [];
  if (!plan || typeof plan !== "object") {
    issues.push("缺少 plan 对象");
  } else {
    const goal = compactLine(plan.goal, 1200);
    const overview = compactLine(plan.overview, 4000);
    if (goal.length < PRESENTED_PLAN_QUALITY_GOAL_MIN && overview.length < PRESENTED_PLAN_QUALITY_GOAL_MIN) {
      const current = Math.max(goal.length, overview.length);
      issues.push(`goal 或 overview 至少 ${PRESENTED_PLAN_QUALITY_GOAL_MIN} 字以钉死运转规则（状态、占用/释放、超时时钟、现有对象或 greenfield），当前 ${current} 字`);
    }
    const titles = stepTitles(plan);
    const nonempty = titles.filter(item => item.title);
    if (!nonempty.length) {
      issues.push("steps 至少 1 条一行可演示切片，才能出计划卡");
    }
    const seen = new Set<string>();
    for (const item of nonempty) {
      if (/[\r\n]/.test(item.raw)) {
        issues.push(`步骤「${item.title.slice(0, 40)}」必须是一行 title，不要换行`);
      }
      if (item.title.length > PRESENTED_PLAN_QUALITY_TITLE_MAX) {
        issues.push(`步骤 title 超过 ${PRESENTED_PLAN_QUALITY_TITLE_MAX} 字`);
      }
      const key = item.title.toLowerCase();
      if (seen.has(key)) issues.push(`步骤 title 重复：${item.title.slice(0, 40)}`);
      seen.add(key);
    }
    const exclusions = asList(plan.exclusions || plan.outOfScope || plan.out_of_scope)
      .map((item: any) => compactLine(item, 600))
      .filter(Boolean);
    const expected = asList(plan.expectedResults || plan.expected_results)
      .map((item: any) => compactLine(item, 600))
      .filter(Boolean);
    if (!exclusions.length && !expected.length) {
      issues.push("需要 exclusions 或 expectedResults 至少 1 项，写明本次边界或结果口径");
    }
  }
  const ok = issues.length === 0;
  return {
    ok,
    issues,
    directive: ok ? "" : [
      "计划稿未通过结构质量门，请按下列问题用 ccm_present_plan 重出一张完整计划卡（只修这一次）：",
      ...issues.map((item, index) => `${index + 1}. ${item}`),
      "遵守 Skill:ccm-implementation-plan-authoring：goal/overview 钉运转规则；steps 按需求写一行可演示切片；带 exclusions 或 expectedResults。",
    ].join("\n"),
  };
}

export function attachPresentedPlanQuality(plan: any, extra?: { repaired?: boolean }) {
  const quality = evaluatePresentedPlanQuality(plan);
  const record = {
    ok: quality.ok,
    issues: quality.issues,
    repaired: extra?.repaired === true,
  };
  if (!plan || typeof plan !== "object") {
    return { plan, quality: { ...quality, ...record } };
  }
  return {
    plan: { ...plan, quality: record },
    quality: { ...quality, ...record },
  };
}

export function shouldRepairPresentedPlan(parsed: any, alreadyRepaired: boolean) {
  if (alreadyRepaired) return false;
  if (String(parsed?.responseType || parsed?.response_type || "") !== "plan") return false;
  return evaluatePresentedPlanQuality(parsed?.plan).ok === false;
}

export function buildPresentedPlanQualityToolResult(callId: string, quality: PresentedPlanQuality) {
  return {
    callId: String(callId || "plan_quality"),
    name: "ccm_present_plan",
    ok: false as const,
    error: PRESENTED_PLAN_QUALITY_ERROR,
    reason: quality.directive,
  };
}

function validFixture() {
  return {
    title: "预约履约",
    goal: "到店履约时先占住资源，核销后改状态，超时从下单时钟释放并挂到现有预约单；没有现成域就按 greenfield 新建履约对象，验收以可演示切片为准。",
    overview: "占住后超时从下单时钟释放；核销改状态后才能释放资源；没有现成域就按 greenfield 建预约履约对象。",
    steps: [
      { id: "hold", title: "占住资源" },
      { id: "redeem", title: "核销改状态" },
      { id: "timeout", title: "超时释放" },
    ],
    exclusions: ["线下手工改库存"],
  };
}

export function runPresentedPlanQualitySelfTest() {
  const valid = evaluatePresentedPlanQuality(validFixture());
  const tooMany = evaluatePresentedPlanQuality({
    ...validFixture(),
    steps: Array.from({ length: 9 }, (_, index) => ({ id: `s${index + 1}`, title: `切片 ${index + 1}` })),
  });
  const oneStep = evaluatePresentedPlanQuality({
    ...validFixture(),
    steps: [{ id: "only", title: "占住资源" }],
  });
  const emptySteps = evaluatePresentedPlanQuality({
    ...validFixture(),
    steps: [],
  });
  const duplicate = evaluatePresentedPlanQuality({
    ...validFixture(),
    steps: [{ title: "占住资源" }, { title: "占住资源" }],
  });
  const missingBoundary = evaluatePresentedPlanQuality({
    title: "预约履约",
    goal: "到店履约时先占住资源，核销后改状态，超时从下单时钟释放并挂到现有预约单。",
    steps: [{ title: "占住资源" }, { title: "核销改状态" }],
  });
  const shortGoal = evaluatePresentedPlanQuality({
    title: "短",
    goal: "太短",
    steps: [{ title: "占住资源" }, { title: "核销改状态" }],
    exclusions: ["手工改库存"],
  });
  const attached = attachPresentedPlanQuality(validFixture(), { repaired: true });
  const missingPlan = evaluatePresentedPlanQuality(null);
  const checks = {
    validPasses: valid.ok === true && valid.issues.length === 0,
    nineStepsAllowed: tooMany.ok === true,
    oneStepAllowed: oneStep.ok === true,
    emptyStepsRejected: emptySteps.ok === false && emptySteps.issues.some(item => item.includes("至少 1 条")),
    duplicateTitleRejected: duplicate.ok === false && duplicate.issues.some(item => item.includes("重复")),
    missingBoundaryRejected: missingBoundary.ok === false && missingBoundary.issues.some(item => item.includes("exclusions")),
    shortGoalRejected: shortGoal.ok === false && shortGoal.issues.some(item => item.includes("60 字")),
    missingPlanRejected: missingPlan.ok === false && missingPlan.directive.includes("ccm_present_plan"),
    attachRecordsRepaired: attached.plan.quality.repaired === true && attached.quality.ok === true,
    shouldRepairOnce: shouldRepairPresentedPlan({ responseType: "plan", plan: missingBoundary }, false) === true
      && shouldRepairPresentedPlan({ responseType: "plan", plan: missingBoundary }, true) === false
      && shouldRepairPresentedPlan({ responseType: "dispatch", plan: missingBoundary }, false) === false,
    repairResultHasError: buildPresentedPlanQualityToolResult("c1", emptySteps).error === PRESENTED_PLAN_QUALITY_ERROR,
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
