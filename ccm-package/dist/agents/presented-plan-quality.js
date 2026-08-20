"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRESENTED_PLAN_QUALITY_TITLE_MAX = exports.PRESENTED_PLAN_QUALITY_GOAL_MIN = exports.PRESENTED_PLAN_QUALITY_ERROR = void 0;
exports.evaluatePresentedPlanQuality = evaluatePresentedPlanQuality;
exports.attachPresentedPlanQuality = attachPresentedPlanQuality;
exports.shouldRepairPresentedPlan = shouldRepairPresentedPlan;
exports.buildPresentedPlanQualityToolResult = buildPresentedPlanQualityToolResult;
exports.runPresentedPlanQualitySelfTest = runPresentedPlanQualitySelfTest;
exports.PRESENTED_PLAN_QUALITY_ERROR = "PRESENTED_PLAN_QUALITY";
exports.PRESENTED_PLAN_QUALITY_GOAL_MIN = 60;
exports.PRESENTED_PLAN_QUALITY_TITLE_MAX = 240;
const implementation_plan_1 = require("./implementation-plan");
function compactLine(value, max = 400) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}
function asList(value) {
    return Array.isArray(value) ? value : [];
}
function stepTitles(plan) {
    return asList(plan?.steps).map((step, index) => {
        const raw = String(step?.title || step?.label || "");
        return {
            index,
            raw,
            title: compactLine(raw, exports.PRESENTED_PLAN_QUALITY_TITLE_MAX),
        };
    });
}
function evaluatePresentedPlanQuality(plan) {
    const issues = [];
    if (!plan || typeof plan !== "object") {
        issues.push("The plan object is missing");
    }
    else {
        const goal = compactLine(plan.goal, 1200);
        const overview = compactLine(plan.overview, 4000);
        if (goal.length < exports.PRESENTED_PLAN_QUALITY_GOAL_MIN && overview.length < exports.PRESENTED_PLAN_QUALITY_GOAL_MIN) {
            const current = Math.max(goal.length, overview.length);
            issues.push(`goal or overview must contain at least ${exports.PRESENTED_PLAN_QUALITY_GOAL_MIN} characters and define the operating rules (state, allocation/release, timeout clock, existing object, or greenfield); current length is ${current}`);
        }
        const titles = stepTitles(plan);
        const nonempty = titles.filter(item => item.title);
        if (!nonempty.length) {
            issues.push("steps must contain at least one one-line demonstrable slice before a plan card can be submitted");
        }
        const seen = new Set();
        for (const item of nonempty) {
            if (/[\r\n]/.test(item.raw)) {
                issues.push(`Step \"${item.title.slice(0, 40)}\" must have a single-line title`);
            }
            if (item.title.length > exports.PRESENTED_PLAN_QUALITY_TITLE_MAX) {
                issues.push(`A step title exceeds ${exports.PRESENTED_PLAN_QUALITY_TITLE_MAX} characters`);
            }
            const key = item.title.toLowerCase();
            if (seen.has(key))
                issues.push(`Duplicate step title: ${item.title.slice(0, 40)}`);
            seen.add(key);
        }
        const exclusions = asList(plan.exclusions || plan.outOfScope || plan.out_of_scope)
            .map((item) => compactLine(item, 600))
            .filter(Boolean);
        const expected = asList(plan.expectedResults || plan.expected_results)
            .map((item) => compactLine(item, 600))
            .filter(Boolean);
        if (!exclusions.length && !expected.length) {
            issues.push("Provide at least one exclusions or expectedResults item to define scope or the result contract");
        }
        if (plan.schema === "ccm-implementation-plan-v2") {
            const v2 = (0, implementation_plan_1.validateImplementationPlanV2)(plan);
            for (const issue of v2.issues)
                if (!issues.includes(issue))
                    issues.push(issue);
        }
    }
    const ok = issues.length === 0;
    return {
        ok,
        issues,
        directive: ok ? "" : [
            "The plan draft failed the structural quality gate. Resubmit one complete plan card with ccm_present_plan and fix only these issues once:",
            ...issues.map((item, index) => `${index + 1}. ${item}`),
            "Follow Skill:ccm-implementation-plan-authoring: define operating rules in goal/overview, make each step a one-line demonstrable slice, and include exclusions or expectedResults.",
        ].join("\n"),
    };
}
function attachPresentedPlanQuality(plan, extra) {
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
function shouldRepairPresentedPlan(parsed, alreadyRepaired) {
    if (alreadyRepaired)
        return false;
    if (String(parsed?.responseType || parsed?.response_type || "") !== "plan")
        return false;
    return evaluatePresentedPlanQuality(parsed?.plan).ok === false;
}
function buildPresentedPlanQualityToolResult(callId, quality) {
    return {
        callId: String(callId || "plan_quality"),
        name: "ccm_present_plan",
        ok: false,
        error: exports.PRESENTED_PLAN_QUALITY_ERROR,
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
function runPresentedPlanQualitySelfTest() {
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
        repairResultHasError: buildPresentedPlanQualityToolResult("c1", emptySteps).error === exports.PRESENTED_PLAN_QUALITY_ERROR,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=presented-plan-quality.js.map