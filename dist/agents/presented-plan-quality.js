"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRESENTED_PLAN_QUALITY_TITLE_MAX = exports.PRESENTED_PLAN_QUALITY_GOAL_MIN = exports.PRESENTED_PLAN_QUALITY_ERROR = void 0;
exports.assessImplementationPlanQuality = assessImplementationPlanQuality;
exports.evaluatePresentedPlanQuality = evaluatePresentedPlanQuality;
exports.attachPresentedPlanQuality = attachPresentedPlanQuality;
exports.shouldRepairPresentedPlan = shouldRepairPresentedPlan;
exports.buildPresentedPlanQualityToolResult = buildPresentedPlanQualityToolResult;
exports.runPresentedPlanQualitySelfTest = runPresentedPlanQualitySelfTest;
exports.PRESENTED_PLAN_QUALITY_ERROR = "PRESENTED_PLAN_QUALITY";
exports.PRESENTED_PLAN_QUALITY_GOAL_MIN = 60;
exports.PRESENTED_PLAN_QUALITY_TITLE_MAX = 240;
const implementation_plan_1 = require("./implementation-plan");
const GENERIC_STEP_RE = /^(?:修改(?:相关|对应)?(?:代码|逻辑|文件)|完善(?:功能|逻辑)|补充(?:测试|校验)|完成(?:开发|实现)|处理相关问题|implement related code|update relevant files|add tests?)$/i;
function normalizePath(value) {
    return compactLine(value, 500).replace(/\\/g, "/").replace(/^\.\//, "");
}
function evidenceKey(project, filePath) {
    return `${compactLine(project, 180)}::${normalizePath(filePath)}`;
}
function safeRelativePath(value) {
    return !!value && !/^(?:[a-z]:|\/|~)/i.test(value) && !value.split("/").includes("..");
}
function isBehaviorSpecific(step) {
    const text = compactLine([step?.changeSummary, step?.objective, ...(asList(step?.acceptance) || [])].filter(Boolean).join(" "), 2600);
    return text.length >= 24 && !/^(?:修改|完善|补充|处理|实现)(?:相关|对应)?(?:代码|功能|逻辑|测试|问题)?[。.!！]?$/i.test(text);
}
function assessImplementationPlanQuality(plan, evidenceManifest, options = {}) {
    const issues = [];
    const manifestEntries = Array.isArray(evidenceManifest?.entries) ? evidenceManifest.entries : [];
    const manifestKeys = new Set(manifestEntries.map((entry) => evidenceKey(entry?.project, entry?.path)));
    const steps = asList(plan?.steps);
    const files = asList(plan?.files);
    const criteria = asList(plan?.businessRequirement?.acceptanceCriteria);
    const knownCriteria = new Set(criteria.map((item) => String(item?.id || "").trim()).filter(Boolean));
    const coveredCriteria = new Set(steps.flatMap((step) => asList(step?.acceptanceCriterionIds).map(String)));
    const verifiedDescriptions = new Set(asList(plan?.verification).flatMap((row) => asList(row?.acceptanceCriteria).map((item) => compactLine(item, 800))));
    const knownDescriptions = new Set(criteria.map((item) => compactLine(item?.description, 800)).filter(Boolean));
    const allowedProjects = new Set((options.allowedProjects || []).map(item => compactLine(item, 180)).filter(Boolean));
    let specificityPoints = 0;
    let specificityMax = 0;
    let evidencedFiles = 0;
    for (const step of steps) {
        const stepId = compactLine(step?.id, 100) || undefined;
        const title = compactLine(step?.title || step?.label, exports.PRESENTED_PLAN_QUALITY_TITLE_MAX);
        const locationRows = [
            ...asList(step?.affectedSymbols),
            ...asList(step?.files).map((path) => ({ path, evidenceIds: asList(step?.sourceEvidenceIds) })),
        ].filter((row) => normalizePath(row?.path || row?.file));
        specificityMax += 4;
        if (title && !GENERIC_STEP_RE.test(title))
            specificityPoints += 1;
        if (locationRows.length || asList(step?.sourceEvidenceIds).length)
            specificityPoints += 1;
        else
            issues.push({ code: "missing_affected_location", severity: "warning", ...(stepId ? { stepId } : {}), message: `步骤“${title || "未命名"}”没有文件、符号或证据范围。` });
        if (isBehaviorSpecific(step))
            specificityPoints += 1;
        else
            issues.push({ code: "missing_behavior_change", severity: "blocking", ...(stepId ? { stepId } : {}), message: `步骤“${title || "未命名"}”没有说明可观察的行为变化。` });
        if (asList(step?.acceptance).length)
            specificityPoints += 1;
        if (!title || GENERIC_STEP_RE.test(title))
            issues.push({ code: "plan_step_too_generic", severity: "blocking", ...(stepId ? { stepId } : {}), message: `步骤“${title || "未命名"}”过于泛化，需补充具体修改对象和结果。` });
        for (const row of locationRows) {
            const path = normalizePath(row?.path || row?.file);
            const project = compactLine(row?.project || step?.projects?.[0] || plan?.project || "", 180);
            if (!safeRelativePath(path))
                issues.push({ code: "scope_drift", severity: "blocking", ...(stepId ? { stepId } : {}), message: "步骤文件位置必须是授权项目内的相对路径。" });
            if (allowedProjects.size && project && !allowedProjects.has(project))
                issues.push({ code: "scope_drift", severity: "blocking", ...(stepId ? { stepId } : {}), message: `步骤引用了未授权项目：${project}。` });
            if (manifestEntries.length && !manifestKeys.has(evidenceKey(project, path)))
                issues.push({ code: "ungrounded_file", severity: "blocking", ...(stepId ? { stepId } : {}), message: `文件 ${path} 没有同项目、同路径的真实读取证据。` });
            const refs = asList(row?.evidenceIds).map(String);
            if (manifestEntries.length && refs.length && refs.some((id) => !manifestEntries.some((entry) => String(entry?.evidenceId || "") === id && evidenceKey(entry?.project, entry?.path) === evidenceKey(project, path)))) {
                issues.push({ code: "file_evidence_missing", severity: "blocking", ...(stepId ? { stepId } : {}), message: `文件 ${path} 的证据引用不属于该项目和路径。` });
            }
        }
    }
    for (const file of files) {
        const project = compactLine(file?.project || plan?.project || "", 180);
        const path = normalizePath(file?.path || file?.file);
        if (!safeRelativePath(path))
            issues.push({ code: "scope_drift", severity: "blocking", message: "计划文件必须是授权项目内的相对路径。" });
        const refs = asList(file?.sourceEvidenceIds || file?.source_evidence_ids || file?.evidenceIds);
        if (manifestEntries.length && !refs.length)
            issues.push({ code: "file_evidence_missing", severity: "blocking", message: `计划文件 ${path || "unknown"} 未绑定 sourceEvidenceIds。` });
        const grounded = !manifestEntries.length || manifestKeys.has(evidenceKey(project, path));
        if (grounded)
            evidencedFiles += 1;
        else
            issues.push({ code: "file_evidence_missing", severity: "blocking", message: `计划文件 ${path || "unknown"} 缺少真实读取证据。` });
        if (allowedProjects.size && project && !allowedProjects.has(project))
            issues.push({ code: "scope_drift", severity: "blocking", message: `计划包含未授权项目：${project}。` });
    }
    const acceptanceCoverage = knownCriteria.size ? [...knownCriteria].filter(id => coveredCriteria.has(id)).length / knownCriteria.size : 1;
    const verificationCoverage = knownDescriptions.size ? [...knownDescriptions].filter(item => verifiedDescriptions.has(item)).length / knownDescriptions.size : (asList(plan?.verification).length ? 1 : 0);
    if (acceptanceCoverage < 1)
        issues.push({ code: "acceptance_not_implemented", severity: "blocking", message: "部分业务验收标准没有分配到执行步骤。" });
    if (verificationCoverage < 1)
        issues.push({ code: "verification_mapping_missing", severity: "blocking", message: "部分业务验收标准没有映射到验证方式。" });
    if (!steps.length)
        issues.push({ code: "plan_step_too_generic", severity: "blocking", message: "计划至少需要一个可执行步骤。" });
    const blocking = issues.some(issue => issue.severity === "blocking");
    const warnings = issues.some(issue => issue.severity === "warning");
    const specificityScore = specificityMax ? Math.round((specificityPoints / specificityMax) * 100) : 0;
    const report = {
        schema: "ccm-plan-quality-report-v1",
        status: issues.some(issue => issue.severity === "blocking" && ["scope_drift", "ungrounded_file", "file_evidence_missing"].includes(issue.code)) ? "blocked" : blocking ? "repair_required" : warnings ? "passed_with_warnings" : "passed",
        specificityScore,
        evidenceCoverage: files.length ? evidencedFiles / files.length : (manifestEntries.length ? 0 : 1),
        acceptanceCoverage,
        verificationCoverage,
        issues,
        checkedPlanChecksum: plan?.checksum || (plan ? (0, implementation_plan_1.implementationPlanChecksum)(plan) : ""),
        checkedEvidenceManifestChecksum: compactLine(evidenceManifest?.checksum, 160),
        contentStored: false,
    };
    return report;
}
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
function evaluatePresentedPlanQuality(plan, options = {}) {
    const issues = [];
    let report;
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
            report = assessImplementationPlanQuality(plan, options.evidenceManifest || plan.evidenceManifest || plan.evidence_manifest, { allowedProjects: options.allowedProjects });
            for (const issue of report.issues) {
                if (issue.severity !== "blocking")
                    continue;
                const message = `[${issue.code}] ${issue.message}`;
                if (!issues.includes(message))
                    issues.push(message);
            }
        }
    }
    const ok = issues.length === 0;
    return {
        ok,
        issues,
        ...(report ? { report } : {}),
        directive: ok ? "" : [
            "The plan draft failed the structural quality gate. Resubmit one complete plan card with ccm_present_plan and fix only these issues once:",
            ...issues.map((item, index) => `${index + 1}. ${item}`),
            "Follow Skill:ccm-implementation-plan-authoring: define operating rules in goal/overview, make each step a one-line demonstrable slice, and include exclusions or expectedResults.",
        ].join("\n"),
    };
}
function attachPresentedPlanQuality(plan, extra) {
    const quality = evaluatePresentedPlanQuality(plan, {
        evidenceManifest: plan?.evidenceManifest || plan?.evidence_manifest,
        allowedProjects: Array.isArray(plan?.businessRequirement?.targetProjects) ? plan.businessRequirement.targetProjects : undefined,
    });
    const recordedReport = plan?.quality?.report;
    const report = recordedReport?.checkedPlanChecksum === plan?.checksum ? recordedReport : quality.report;
    const record = {
        ok: quality.ok,
        issues: quality.issues,
        repaired: extra?.repaired === true,
        ...(report ? { report } : {}),
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
        emptyStepsRejected: emptySteps.ok === false && emptySteps.issues.some(item => item.includes("at least one")),
        duplicateTitleRejected: duplicate.ok === false && duplicate.issues.some(item => item.includes("Duplicate step title")),
        missingBoundaryRejected: missingBoundary.ok === false && missingBoundary.issues.some(item => item.includes("exclusions")),
        shortGoalRejected: shortGoal.ok === false && shortGoal.issues.some(item => item.includes("at least 60 characters")),
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