"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE = exports.PRESENTED_PLAN_SHAPE_GUIDANCE = exports.PRESENTED_PLAN_AUTHORING_SKILL = exports.COORDINATOR_PRESENTED_PLAN_HEADLINE = void 0;
exports.presentedPlanSource = presentedPlanSource;
exports.presentedPlanSteps = presentedPlanSteps;
exports.hasPresentedGroupPlan = hasPresentedGroupPlan;
exports.normalizePresentedGroupPlan = normalizePresentedGroupPlan;
exports.formatPresentedPlanMarkdown = formatPresentedPlanMarkdown;
exports.visibleGroupPresentedPlanFields = visibleGroupPresentedPlanFields;
exports.presentedPlanFromMessage = presentedPlanFromMessage;
exports.latestPresentedPlanFromMessages = latestPresentedPlanFromMessages;
exports.latestPresentedPlanFromGroupSession = latestPresentedPlanFromGroupSession;
exports.presentedPlanFromTask = presentedPlanFromTask;
exports.presentedPlanAcceptanceLines = presentedPlanAcceptanceLines;
exports.appendConfirmedPlanSliceContract = appendConfirmedPlanSliceContract;
exports.attachConfirmedPlanSlicesToDispatchTargets = attachConfirmedPlanSlicesToDispatchTargets;
exports.mergePresentedPlanAcceptanceCriteria = mergePresentedPlanAcceptanceCriteria;
exports.presentedPlanFromParsed = presentedPlanFromParsed;
exports.publishGroupPresentedRequirementPlan = publishGroupPresentedRequirementPlan;
exports.runGroupPresentedPlanSelfTest = runGroupPresentedPlanSelfTest;
const user_visible_agent_events_1 = require("../../system/user-visible-agent-events");
const presented_plan_quality_1 = require("../../agents/presented-plan-quality");
exports.COORDINATOR_PRESENTED_PLAN_HEADLINE = "计划已经整理完成，请查看下面的待办。";
exports.PRESENTED_PLAN_AUTHORING_SKILL = "ccm-implementation-plan-authoring";
exports.PRESENTED_PLAN_SHAPE_GUIDANCE = "计划稿形状见 Skill:ccm-implementation-plan-authoring。";
exports.PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE = "已确认计划卡交接见 Skill:ccm-implementation-plan-authoring。";
function compactText(value, max = 400) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}
function asList(value) {
    return Array.isArray(value) ? value : [];
}
function presentedPlanSource(parsed) {
    if (!parsed || typeof parsed !== "object")
        return null;
    const candidates = [
        parsed.plan,
        parsed.presentedPlan,
        parsed.presented_plan,
        parsed.coordinationPlan,
        parsed.coordination_plan,
        parsed.architecturePlan,
        parsed.architecture_plan,
    ];
    for (const item of candidates) {
        if (item && typeof item === "object")
            return item;
    }
    return null;
}
function presentedPlanSteps(source) {
    if (!source || typeof source !== "object")
        return [];
    if (asList(source.steps).length)
        return source.steps;
    if (asList(source.dependencySteps).length)
        return source.dependencySteps;
    if (asList(source.dependency_steps).length)
        return source.dependency_steps;
    if (asList(source.workItems).length)
        return source.workItems;
    if (asList(source.work_items).length)
        return source.work_items;
    if (asList(source.phases).length) {
        return source.phases.map((phase, index) => {
            if (typeof phase === "string")
                return { id: `step_${index + 1}`, title: phase };
            return {
                id: phase?.id || `step_${index + 1}`,
                title: phase?.title || phase?.name || phase?.label || `阶段 ${index + 1}`,
                description: phase?.description || phase?.objective || phase?.detail || "",
                outcome: Array.isArray(phase?.acceptance) ? phase.acceptance[0] : (phase?.outcome || ""),
                project: phase?.project || "",
                dependsOn: phase?.dependsOn || phase?.depends_on || [],
            };
        });
    }
    return [];
}
function hasPresentedGroupPlan(parsed) {
    return presentedPlanSteps(presentedPlanSource(parsed)).length > 0;
}
function normalizePresentedGroupPlan(input) {
    const source = presentedPlanSource(input.parsed);
    const steps = presentedPlanSteps(source).map((step, index) => {
        const title = compactText(step?.title || step?.label || step?.name || step?.objective || `实施步骤 ${index + 1}`, 240);
        if (!title)
            return null;
        return {
            id: compactText(step?.id || `step_${index + 1}`, 100) || `step_${index + 1}`,
            title,
            description: compactText(step?.description || step?.detail || step?.task, 200),
            outcome: compactText(Array.isArray(step?.acceptance) ? step.acceptance[0] : (step?.outcome || step?.expectedResult || step?.expected_result || step?.acceptanceCriteria?.[0]), 160),
            status: "pending",
        };
    }).filter(Boolean);
    if (!source || !steps.length)
        return null;
    const planId = compactText(source.planId || source.plan_id || source.id || input.planId, 240);
    const overview = compactText(source.overview || source.body || "", 4000);
    const goal = compactText(source.goal || source.summary || source.objective || overview || input.goalFallback, 1200);
    if (!planId || !goal)
        return null;
    return {
        planId,
        revision: Math.max(1, Number(source.revision || 1)),
        title: compactText(source.title, 80) || "实施计划",
        goal,
        ...(overview ? { overview } : {}),
        steps,
        scope: asList(source.scope || source.scopes).map((item) => compactText(item, 300)).filter(Boolean),
        expectedResults: asList(source.expectedResults || source.expected_results).map((item) => compactText(item, 600)).filter(Boolean),
        exclusions: asList(source.exclusions || source.outOfScope || source.out_of_scope || source.boundaries).map((item) => compactText(item, 600)).filter(Boolean),
        status: input.status || "ready",
        createdAt: compactText(source.createdAt || source.created_at, 40) || new Date().toISOString(),
        updatedAt: compactText(source.updatedAt || source.updated_at, 40) || new Date().toISOString(),
    };
}
function formatPresentedPlanMarkdown(plan) {
    if (!plan || typeof plan !== "object")
        return "";
    const title = compactText(plan.title, 80) || "实施计划";
    const overview = compactText(plan.overview || plan.goal, 4000);
    const steps = presentedPlanSteps(plan)
        .map((step) => compactText(step?.title || step?.label, 160))
        .filter(Boolean)
        .map((titleText) => `- ${titleText}`);
    const exclusions = asList(plan.exclusions || plan.outOfScope || plan.out_of_scope)
        .map((item) => compactText(item, 200))
        .filter(Boolean);
    if (!overview && !steps.length)
        return "";
    return [
        `**${title}**`,
        overview,
        steps.length ? steps.join("\n") : "",
        exclusions.length ? `本次不包含：${exclusions.join("、")}` : "",
    ].filter(Boolean).join("\n\n");
}
function visibleGroupPresentedPlanFields(input) {
    if (input.projectAnalysis)
        return { coordinationPlan: null, presentedPlan: null };
    const presentedPlan = input.presentedPlan?.steps?.length ? input.presentedPlan : null;
    const coordinationPlan = input.coordinationPlan || null;
    const keep = !!(presentedPlan || coordinationPlan?.phases?.length || coordinationPlan?.architecture?.dependencySteps?.length);
    if (keep)
        return { coordinationPlan, presentedPlan };
    if (input.conversationalOnly)
        return { coordinationPlan: null, presentedPlan: null };
    return { coordinationPlan, presentedPlan };
}
const CONFIRMED_SLICE_CONTRACT_MARK = "已确认切片（用户计划卡口径";
function presentedPlanFromMessage(item) {
    const plan = item?.presentedPlan || item?.presented_plan;
    if (plan && typeof plan === "object" && asList(plan.steps).length)
        return plan;
    return null;
}
function latestPresentedPlanFromMessages(messages) {
    const list = Array.isArray(messages) ? messages : [];
    for (let index = list.length - 1; index >= 0; index -= 1) {
        const plan = presentedPlanFromMessage(list[index]);
        if (plan)
            return plan;
    }
    return null;
}
function latestPresentedPlanFromGroupSession(groupId, groupSessionId) {
    const gid = compactText(groupId, 160);
    const sid = compactText(groupSessionId, 240);
    if (!gid || !sid)
        return null;
    try {
        const storage = require("./storage");
        return latestPresentedPlanFromMessages(storage.getGroupMessages(gid, sid));
    }
    catch {
        return null;
    }
}
function presentedPlanFromTask(task) {
    const candidates = [
        task?.presentedPlan,
        task?.presented_plan,
        task?.workflow_meta?.presentedPlan,
        task?.workflow_meta?.presented_plan,
        task?.intake_draft?.presentedPlan,
        task?.intake_draft?.presented_plan,
    ];
    for (const item of candidates) {
        if (item && typeof item === "object" && asList(item.steps).length)
            return item;
    }
    return null;
}
function presentedPlanAcceptanceLines(plan) {
    if (!plan || typeof plan !== "object")
        return [];
    const overview = compactText(plan.overview || plan.goal, 400);
    const steps = presentedPlanSteps(plan)
        .map((step) => compactText(step?.title || step?.label, 160))
        .filter(Boolean);
    return [overview, ...steps].filter(Boolean);
}
function appendConfirmedPlanSliceContract(taskText, plan) {
    const task = String(taskText || "");
    const lines = presentedPlanAcceptanceLines(plan);
    if (!lines.length)
        return task;
    if (task.includes(CONFIRMED_SLICE_CONTRACT_MARK))
        return task;
    return [task, "", `${CONFIRMED_SLICE_CONTRACT_MARK}，须覆盖；不要重写成前端/后端/测试分工）：`, ...lines.map((line) => `- ${line}`)]
        .filter((item) => item !== "")
        .join("\n");
}
function attachConfirmedPlanSlicesToDispatchTargets(targets, plan) {
    if (!plan || !Array.isArray(targets) || !targets.length)
        return targets;
    return targets.map((target) => ({
        ...target,
        task: appendConfirmedPlanSliceContract(target?.task, plan),
    }));
}
function mergePresentedPlanAcceptanceCriteria(existing, plan, limit = 10) {
    const prior = (Array.isArray(existing) ? existing : [existing])
        .map((item) => compactText(item, 300))
        .filter(Boolean);
    const merged = [];
    const seen = new Set();
    for (const line of [...presentedPlanAcceptanceLines(plan), ...prior]) {
        const key = compactText(line, 300);
        if (!key || seen.has(key))
            continue;
        seen.add(key);
        merged.push(line);
        if (merged.length >= limit)
            break;
    }
    return merged;
}
function presentedPlanFromParsed(input) {
    const plan = normalizePresentedGroupPlan({
        parsed: input.parsed,
        planId: input.planId,
        goalFallback: input.goalFallback,
        status: input.status || "ready",
    });
    if (!plan)
        return null;
    const repaired = input.parsed?.planQuality?.repaired === true || input.parsed?.plan?.quality?.repaired === true;
    return (0, presented_plan_quality_1.attachPresentedPlanQuality)(plan, { repaired }).plan;
}
function publishGroupPresentedRequirementPlan(input) {
    const published = input.plan && typeof input.plan === "object" && Array.isArray(input.plan.steps) && input.plan.steps.length
        ? input.plan
        : presentedPlanFromParsed({
            parsed: input.parsed,
            planId: input.turnId || `${input.scope || "group"}-plan-${Date.now()}`,
            goalFallback: input.goalFallback,
        });
    if (!published)
        return null;
    if (input.skip)
        return null;
    const scope = input.scope || (input.groupId ? "group" : "");
    const scopeId = String(input.scopeId || input.groupId || "").trim();
    const exactSessionId = String(input.exactSessionId || input.groupSessionId || "").trim();
    if (!scope || !scopeId || !exactSessionId)
        return published;
    (0, user_visible_agent_events_1.appendUserVisibleRequirementPlan)({
        eventId: `${scope}-turn:${published.planId}:requirement-plan:${published.revision}:presented`,
        scope,
        scopeId,
        exactSessionId,
        ...(String(input.anchorMessageId || "").trim() ? { anchorMessageId: String(input.anchorMessageId).trim() } : {}),
        ...(String(input.turnId || "").trim() ? { turnId: String(input.turnId).trim() } : {}),
        generation: Math.max(0, Number(input.generation || 0)),
        plan: published,
    });
    return published;
}
function runGroupPresentedPlanSelfTest() {
    const parsed = {
        responseType: "plan",
        reply: "",
        plan: {
            title: "原生短轮循环",
            goal: "按 Claude Code 的 queryLoop 给三条主 Agent 接原生 tool_use。",
            overview: "每一轮 HTTP 用原生 tool_use 结束；子 Agent CLI 不改。",
            steps: [
                { id: "native-turn-api", title: "llm-client 增加 callNativeAgentTurn" },
                { id: "shared-loop", title: "新建 native-query-loop.ts" },
            ],
            exclusions: ["子 Agent CLI"],
        },
    };
    const verbose = {
        responseType: "plan",
        plan: {
            title: "旧卡片",
            goal: "兼容旧 description。",
            steps: [
                { id: "p0", title: "接共享 loop", description: "很长的要做说明".repeat(40), outcome: "很长的结果说明".repeat(40) },
            ],
        },
    };
    const plan = normalizePresentedGroupPlan({ parsed, planId: "turn-1", goalFallback: "原生循环" });
    const verbosePlan = normalizePresentedGroupPlan({ parsed: verbose, planId: "turn-2" });
    const markdown = formatPresentedPlanMarkdown(plan);
    const conversational = visibleGroupPresentedPlanFields({
        conversationalOnly: true,
        presentedPlan: plan,
        coordinationPlan: null,
    });
    const stripped = visibleGroupPresentedPlanFields({
        conversationalOnly: true,
        presentedPlan: null,
        coordinationPlan: null,
    });
    const layered = normalizePresentedGroupPlan({
        parsed: {
            plan: {
                title: "预约履约",
                goal: "到店履约",
                overview: "占住后超时从下单时钟释放。",
                steps: [{ title: "占住资源", project: "frontend", dependsOn: ["api"] }],
            },
        },
        planId: "turn-3",
    });
    const contract = appendConfirmedPlanSliceContract("实现预约占用", layered);
    const merged = mergePresentedPlanAcceptanceCriteria(["命令 npm test 必须成功执行。"], layered);
    const fromMessages = latestPresentedPlanFromMessages([
        { role: "user", content: "做计划" },
        { role: "assistant", presentedPlan: layered },
    ]);
    const checks = {
        hasPlan: hasPresentedGroupPlan(parsed) === true,
        keepsSteps: plan?.steps?.length === 2,
        keepsGoal: plan?.goal?.includes("queryLoop") === true,
        keepsOverview: String(plan?.overview || "").includes("子 Agent CLI") === true,
        oneLineTodos: plan?.steps?.every((step) => String(step.title || "").includes("\n") === false) === true,
        dropsLongStepEssay: String(verbosePlan?.steps?.[0]?.description || "").length <= 200
            && String(verbosePlan?.steps?.[0]?.outcome || "").length <= 160,
        markdownHasTodos: markdown.includes("- llm-client 增加 callNativeAgentTurn") && markdown.includes("本次不包含：子 Agent CLI"),
        markdownOmitsEssay: markdown.includes("要做") === false && markdown.includes("完成后") === false,
        markdownEmptyWithoutBody: formatPresentedPlanMarkdown({ title: "登录修复计划" }) === "",
        conversationalKeepsPlan: conversational.presentedPlan?.steps?.length === 2,
        emptyConversationStillNull: stripped.presentedPlan == null && stripped.coordinationPlan == null,
        projectAnalysisHides: visibleGroupPresentedPlanFields({
            projectAnalysis: true,
            presentedPlan: plan,
        }).presentedPlan == null,
        dropsStepProject: layered?.steps?.[0]?.title === "占住资源"
            && layered?.steps?.[0]?.project == null
            && layered?.steps?.[0]?.dependsOn == null,
        shapePointsToSkill: exports.PRESENTED_PLAN_SHAPE_GUIDANCE === "计划稿形状见 Skill:ccm-implementation-plan-authoring。"
            && /Skill:ccm-implementation-plan-authoring/.test(exports.PRESENTED_PLAN_SHAPE_GUIDANCE)
            && /一行待办/.test(exports.PRESENTED_PLAN_SHAPE_GUIDANCE) === false,
        handoffPointsToSkill: exports.PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE === "已确认计划卡交接见 Skill:ccm-implementation-plan-authoring。"
            && /Skill:ccm-implementation-plan-authoring/.test(exports.PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE)
            && /必须覆盖卡片每条切片的验收口径/.test(exports.PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE) === false,
        appendsSliceContract: contract.includes("已确认切片") && contract.includes("占住资源")
            && appendConfirmedPlanSliceContract(contract, layered) === contract,
        mergesAcceptance: merged[0] === "占住后超时从下单时钟释放。" && merged.includes("占住资源") && merged.includes("命令 npm test 必须成功执行。"),
        readsLatestMessagePlan: fromMessages?.steps?.[0]?.title === "占住资源",
        attachLeavesEmptyTargets: attachConfirmedPlanSlicesToDispatchTargets([], layered).length === 0,
        publishedHasQuality: typeof publishGroupPresentedRequirementPlan({ parsed, turnId: "turn-1", goalFallback: "原生循环" })?.quality?.ok === "boolean",
        publishedProjectScopeKeepsPlan: typeof publishGroupPresentedRequirementPlan({
            scope: "project",
            parsed,
            turnId: "project-turn-1",
            goalFallback: "项目计划",
        })?.quality?.ok === "boolean",
        shapeDroppedLongEssay: /没有现成域就写明 greenfield/.test(exports.PRESENTED_PLAN_SHAPE_GUIDANCE) === false,
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=group-presented-plan.js.map