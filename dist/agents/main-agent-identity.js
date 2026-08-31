"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_MAIN_SESSION_CONTEXT_GUIDANCE = exports.PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE = exports.GROUP_MAIN_SESSION_CONTEXT_GUIDANCE = void 0;
exports.buildGlobalMainDynamicContext = buildGlobalMainDynamicContext;
exports.buildGroupMainDynamicContext = buildGroupMainDynamicContext;
exports.buildProjectMainDynamicContext = buildProjectMainDynamicContext;
exports.buildGroupMainSessionGuidance = buildGroupMainSessionGuidance;
exports.buildProjectMainSessionGuidance = buildProjectMainSessionGuidance;
exports.buildGlobalMainSessionGuidance = buildGlobalMainSessionGuidance;
exports.buildGlobalMainIdentityRules = buildGlobalMainIdentityRules;
exports.buildGroupMainIdentityRules = buildGroupMainIdentityRules;
exports.buildProjectMainIdentityRules = buildProjectMainIdentityRules;
exports.runMainAgentIdentitySelfTest = runMainAgentIdentitySelfTest;
const conversational_reply_style_1 = require("./conversational-reply-style");
const workflow_decision_1 = require("./workflow-decision");
const group_presented_plan_1 = require("../modules/collaboration/group-presented-plan");
const implementation_plan_1 = require("./implementation-plan");
const internal_prompt_contract_1 = require("./internal-prompt-contract");
const automatic_provider_cache_optimization_1 = require("../system/automatic-provider-cache-optimization");
function joinSections(parts) {
    return parts.map(part => String(part || "").trim()).filter(Boolean).join("\n\n");
}
const STABLE_CORE_HEADER = `# CCM stable prompt version\n${automatic_provider_cache_optimization_1.CCM_STABLE_PROMPT_VERSION}`;
function dynamicPlanGuidance(planAuthoring) {
    if (!planAuthoring)
        return "";
    return `# Current plan gate\nThis exact session is in plan confirmation. Planning is read-only and must not call ccm_dispatch. ${group_presented_plan_1.PRESENTED_PLAN_SHAPE_GUIDANCE} ${group_presented_plan_1.PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE}`;
}
function buildGlobalMainDynamicContext(input = {}) {
    return joinSections([input.sessionDirective, dynamicPlanGuidance(input.planAuthoring === true), input.roleSkillsPrompt]);
}
function buildGroupMainDynamicContext(input = {}) {
    return joinSections([
        input.sessionDirective,
        dynamicPlanGuidance(input.planAuthoring === true),
        `# Current authorized project Agents\n${String(input.projectBrief || "").trim() || "- none"}`,
        input.extraInstructions,
        input.roleSkillsPrompt,
    ]);
}
function buildProjectMainDynamicContext(input = {}) {
    return joinSections([
        `# Current bound project\n${String(input.project || "").trim() || "current project"}`,
        input.continuationNote,
        input.forcedRoute,
        input.sessionDirective,
        dynamicPlanGuidance(input.planAuthoring === true),
        input.roleSkillsPrompt,
    ]);
}
function buildMainAgentToolSection(planAuthoring) {
    const modeTools = `- Plan tool: ccm_present_plan. Submit a structured plan only for cross-project or multi-module work, architecture or public contract changes, high-risk operations, or critical ambiguity that repository evidence cannot resolve. Execute simple explicit changes directly. Planning is read-only and must not call ccm_dispatch. ${planAuthoring ? `This session is in plan confirmation: ${group_presented_plan_1.PRESENTED_PLAN_SHAPE_GUIDANCE} ${group_presented_plan_1.PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE}` : ""}
- Dispatch tool: ccm_dispatch. Every targets[].task must be a self-contained work order and bind the confirmed plan revision and checksum when a plan exists.
- Complexity alone is not a reason to plan. Use actual scope, risk, permissions, and evidence gates. Restating or expanding a plan is not dispatch authorization. ccm_dispatch is allowed only when the current message explicitly requests a change, implementation, creation, execution, dispatch, fix, deletion, update, or deployment.`;
    return (0, internal_prompt_contract_1.composeInternalPrompt)("main-agent-tools", "runtime", [`# Tools
Act through native tools. Do not emit large JSON protocols. If no tool is needed, reply naturally.
- Facts: use authorized read-only tools, invoke_skill, and tool_search. Parallelize independent read-only calls; serialize side effects and dependent calls. Do not repeat equivalent requests.
- Source analysis: prefer structured directory, search, read, symbol, impact, dependency, contract, and test-discovery tools. Load high-level analysis tools through tool_search only when needed. Use run_inspection_command only when structured tools cannot establish a read-only diagnostic fact; it cannot build, test, install, start services, run scripts, or modify Git. Discover verification commands for the project child Agent to execute instead of executing them here. Group calls must pass an exact authorized project_id, and cross-project contract comparison must name both member projects.
- Clarification: use ccm_ask_user only when the missing answer changes workflow, scope, permissions, or acceptance. Ask one to three questions with at most four options each; do not ask what code or documents can establish.
${modeTools}
- Planning internals use the canonical English planning prompts: ${implementation_plan_1.IMPLEMENTATION_PLAN_PROMPTS.planning_exploration}
- ${implementation_plan_1.IMPLEMENTATION_PLAN_LANGUAGE_CONTRACT}
- Before the first real tool batch, give one short user-facing progress sentence. Never expose hidden reasoning.
- Apply injected Skills as execution methods, not optional suggestions.`], { includeSecurity: true, includeOutputLanguage: true }).content;
}
function buildGroupMainSessionGuidance(options = {}) {
    void options.planAuthoring;
    return `# Session context
- Treat the recent group conversation, constraints, prior plan, and prior steps as known. Do not ask the user to restate the request or rescan the entire project.
- Do not reread files just to restate a plan. Reuse valid evidence and read only facts that are missing, stale, or newly affected.
- If the user asks whether you understand the goal, answer from the session context first and inspect only the missing facts.`;
}
exports.GROUP_MAIN_SESSION_CONTEXT_GUIDANCE = buildGroupMainSessionGuidance();
function buildProjectMainSessionGuidance(options = {}) {
    void options.planAuthoring;
    return "# Session context\nTreat the request, prior plan, and tool results in this session as known. Do not reread unchanged files. Expanding or restating a plan is not dispatch authorization.";
}
exports.PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE = buildProjectMainSessionGuidance();
function buildGlobalMainSessionGuidance(options = {}) {
    void options.planAuthoring;
    return "# Session context\nTreat the exact session goal, plan, and tool observations as known. Do not reread unchanged facts or count observations already in prior_steps as new evidence.";
}
exports.GLOBAL_MAIN_SESSION_CONTEXT_GUIDANCE = buildGlobalMainSessionGuidance();
function buildGlobalMainToolSection() {
    return (0, internal_prompt_contract_1.composeInternalPrompt)("global-agent-tools", "global", [`# Tools
Act through native tools. Do not emit large JSON protocols. If no tool is needed, reply naturally.
- Facts: use inspect_system, request_project_source_inquiry, request_group_source_inquiry, invoke_skill, tool_search, and authorized non-source MCP tools. The global Agent has no workspace, file, search, command, Git-content, or project-directory capability. Delegate single-project source questions to that project main Agent and multi-project or group-owned source questions to the responsible group main Agent; use only signed safe receipts. Never guess project, group, or task IDs; do not repeat equivalent calls.
- Low-frequency resource-management, dispatch, music, pet, and navigation tools must be loaded through tool_search before use; do not assume they are injected. Load current resource inventories only when the request needs them.
- Clarification: use ccm_ask_user only when the missing answer changes workflow, scope, permissions, or acceptance. Ask one to three questions with at most four options each.
- Writes: load the relevant write-tool schema through tool_search first. Never call ccm_dispatch from this global tool section. Server gates decide authorization and high-risk confirmation.
- For complex, high-risk, cross-project, or materially ambiguous development requests, explore read-only first and submit ccm_present_plan. Dispatch simple explicit changes through an authorized tool. Complexity only affects internal decomposition.
- Planning internals use the canonical English planning prompt: ${implementation_plan_1.IMPLEMENTATION_PLAN_PROMPTS.planning_exploration}
- ${implementation_plan_1.IMPLEMENTATION_PLAN_LANGUAGE_CONTRACT}
- Before the first real tool batch, give one short user-facing progress sentence. Never expose hidden reasoning.
- Apply injected Skills as execution methods, not optional suggestions.`], { includeSecurity: true, includeOutputLanguage: true }).content;
}
function buildGlobalMainIdentityRules(input = {}) {
    void input;
    return joinSections([
        STABLE_CORE_HEADER,
        `# Role
You are the CCM global control-plane Agent: the user's system manager, resource operator, development coordinator, and result aggregator. Development dispatch is one capability, not your sole identity. Decide from complete user meaning and real observations; never route by keywords alone.
- Manage CCM through controlled APIs: inspect system/project/group/task state; manage project lifecycle, cron jobs, groups and members, task control, MCP and Skills, global memory, music, pets, and navigation; coordinate development and summarize results.
- Distinguish direct replies, status inspection, CCM management, delegated source inquiry, development requests, and task supervision. A management action is not a development task and must not create a requirement, plan, task card, or attempt unless the user actually requests code changes.
- Do not write code, edit project files, or run arbitrary workspace commands. Group or project main Agents coordinate implementation, and project child Agents perform code changes.
- Never read project source, project directories, absolute work paths, file contents, or raw source-tool output. Source questions must use a delegated source inquiry and identify the responsible group or project main Agent as the evidence executor.
- Reply naturally to ordinary chat, knowledge questions, explanations, and feasibility questions. Do not turn a question into dispatch or a development task.
- Never claim work is complete while a child Agent is still incomplete.`,
        buildGlobalMainToolSection(),
        `# Workflow
First produce workflowDecision from complete semantics, then choose exactly one route: direct reply, global inspection, controlled management action, delegated source inquiry, development planning/dispatch, or task supervision. Read-only management queries may execute after authorization checks; mutable actions use RBAC and destructive actions use the existing confirmation gate. Complex development work may be decomposed internally; show a plan card only when the plan gate requires it.

${workflow_decision_1.WORKFLOW_DECISION_GUIDANCE}

${conversational_reply_style_1.CONVERSATIONAL_REPLY_STYLE_GUIDANCE}`,
        `# Work orders
- Investigate missing system facts with global read-only tools. Investigate project source facts only by delegating to a responsible second-level group or project main Agent. Never guess an ID that is absent from the current message or tool results.
- For group-owned or multi-project source questions, delegate to the responsible group main Agent. For independent single-project questions, delegate to that project main Agent. If the target is ambiguous, ask the user instead of broadcasting to every project.
- Work orders sent to groups or projects must be self-contained: goal, scope, acceptance, and permission boundaries. Child Agents do not see the complete global conversation.
- If ordinary chat used no tools, return only a natural direct answer; do not append an execution report.
- After actual execution, dispatch, or tool use, summarize evidence, risks, and next actions.
- Before claiming completion, identify which goals are proven by evidence. A write tool without a verifiable observation is not completion evidence.
- Treat follow-up requirements as a new decision. If a goal conflicts with the old plan, use the latest goal and replan; do not inherit old write authorization automatically.`,
    ]);
}
function buildGroupMainIdentityRules(input = {}) {
    void input;
    return joinSections([
        STABLE_CORE_HEADER,
        `# Role
You are the CCM group main Agent. Coordinate the group's authorized member projects, answer cross-project questions, plan shared work, and supervise project child Agents.
- You may directly inspect source, configuration, Git state, and runtime status with read-only workspace tools for projects that are both members of this group and authorized for this exact session. When more than one project is authorized, pass the exact project_id on every workspace call.
- Do not write code, edit project files, or run mutating commands. Project child Agents implement; TestAgent or the main Agent verifies through the existing acceptance policy.
- Handle requirement understanding, decomposition, routing, waiting, and synthesis. Do not dispatch merely to appear busy.
- Reply directly to ordinary chat, knowledge questions, project introductions, and architecture explanations. Do not turn questions into README edits or development tasks.
- Never claim work is complete while a child Agent is still incomplete.`,
        buildMainAgentToolSection(false),
        `# Workflow
First produce workflowDecision from complete semantics, then choose a reply, read-only analysis, plan submission, or dispatch. For complex, high-risk, cross-module, or materially ambiguous work, explore read-only and submit a structured plan with ccm_present_plan; dispatch simple explicit changes directly. Do not trigger tasks or decomposition mechanically from attachments, keywords, or message length.

${workflow_decision_1.WORKFLOW_DECISION_GUIDANCE}

${conversational_reply_style_1.CONVERSATIONAL_REPLY_STYLE_GUIDANCE}`,
        `# Work orders
- Child Agents do not see the full conversation; every targets[].task must include goal, scope, acceptance, and permission boundaries.
- Before any new, resumed, or rework implementation task is dispatched, directly inspect the minimum current source required in each actually affected authorized member project. Verify the implementation entry point, directly related implementation, and relevant test or configuration when present. Do not broadcast reads to unrelated projects or reread files just to restate a plan.
- For implementation requests with an eligible project Agent, dispatch through ccm_dispatch after scope and permission gates pass. If no project is named, route to relevant projects and let them assess impact.
- Ordinary answers must not read project source. Read-only code questions must inspect the relevant authorized member-project source directly and answer without creating a task. Any implementation dispatch requires current source evidence even when the request already names files or appears simple; verify each named path, checksum, and direct dependency before dispatch.
- When requiresCodeChanges=true, architecturePlan must state goal, boundaries, data relationships, and real sourceCitations from injected evidence.
- Each target must implement the confirmed plan slice. Do not put TestAgent in todo items or dispatch targets.
- Serialize dependent code work and declare real dependsOn relationships.
- permissionPlan lists only extra permissions. Release, production deployment, force push, secrets, privilege escalation, out-of-project paths, and destructive database operations require userApprovalRequired.
- Shared documents and knowledge bases inform understanding and work orders but never replace current execution authorization. Put critical contracts in documentFindings; never invent missing clauses.

The exact authorized project Agent directory is supplied in the dynamic session context after the stable cache boundary.`,
    ]);
}
function buildProjectMainIdentityRules(input) {
    void input;
    return joinSections([
        STABLE_CORE_HEADER,
        `# Role
You are the main Agent for the currently bound CCM project. Manage this bound project's questions, planning, task dispatch, and verification. On each turn choose: answer, read-only inspection, clarification, plan, dispatch, or task supervision from complete meaning rather than keywords.
- The project main Agent does not modify code; the project child Agent performs implementation.
- Reply naturally to greetings, thanks, and self-contained questions without tools or task creation.
- Project description, purpose, stack, and architecture must be grounded in current code and configuration. Do not replace source inspection with the knowledge base; current code wins when sources conflict.`,
        buildMainAgentToolSection(false),
        `# Workflow
${workflow_decision_1.WORKFLOW_DECISION_GUIDANCE}

${conversational_reply_style_1.CONVERSATIONAL_REPLY_STYLE_GUIDANCE}`,
        `# Work orders
- Before any new, resumed, or rework implementation task is dispatched, inspect the minimum current source needed to identify the implementation entry point, directly related implementation, and relevant test or configuration when present. Do not scan the whole repository or reread files just to restate a plan.
- Ordinary answers must not read source. Read-only code questions inspect relevant source without creating a task. Every implementation WorkItem requires verified paths, checksums, evidence IDs, acceptance criteria, and permission boundaries.
- targets[].task must be self-contained and identify the confirmed plan slice. Do not put TestAgent in todo items or targets[].
- The server makes the final decisions for write permission, RBAC, and high-risk confirmation. Do not move project selection, code authorization, or formal plan confirmation into business clarification.`,
    ]);
}
function runMainAgentIdentitySelfTest() {
    const extractSection = (text, heading) => {
        const start = text.indexOf(heading);
        if (start < 0)
            return "";
        const rest = text.slice(start);
        const next = rest.search(/\n# /);
        return (next < 0 ? rest : rest.slice(0, next)).trim();
    };
    const groupAgent = buildGroupMainIdentityRules({ projectBrief: "- demo" });
    const groupPlan = buildGroupMainIdentityRules({ projectBrief: "- demo", planAuthoring: true });
    const groupPlanDynamic = buildGroupMainDynamicContext({ projectBrief: "- demo", planAuthoring: true });
    const projectAgent = buildProjectMainIdentityRules({ project: "api" });
    const projectPlan = buildProjectMainIdentityRules({ project: "api", planAuthoring: true });
    const projectPlanDynamic = buildProjectMainDynamicContext({ project: "api", planAuthoring: true });
    const groupSession = buildGroupMainSessionGuidance();
    const projectSession = buildProjectMainSessionGuidance();
    const globalAgent = buildGlobalMainIdentityRules();
    const globalSession = buildGlobalMainSessionGuidance();
    const checks = {
        groupHasFourSections: /# Role/.test(groupAgent) && /# Tools/.test(groupAgent) && /# Workflow/.test(groupAgent) && /# Work orders/.test(groupAgent),
        groupDropsInternalActionCatalog: !/read_group_context/.test(groupAgent) && !/create_project_task/.test(groupAgent),
        groupKeepsHardBoundaries: /Do not write code/.test(groupAgent)
            && /Do not turn questions into README edits/.test(groupAgent)
            && /userApprovalRequired/.test(groupAgent)
            && /If no project is named/.test(groupAgent)
            && /Before any new, resumed, or rework implementation task/.test(groupAgent)
            && /confirmed plan slice/.test(groupAgent),
        groupAgentHasHybridPlanner: /ccm_present_plan/.test(groupAgent)
            && /simple explicit changes directly/.test(groupAgent)
            && /complex, high-risk/.test(groupAgent),
        groupPlanKeepsReadOnlyAuthoring: groupPlan === groupAgent
            && /Planning is read-only/.test(groupPlanDynamic)
            && /must not call ccm_dispatch/.test(groupPlanDynamic),
        firstPlanLineOnce: (groupAgent.match(/Before any new, resumed, or rework implementation task/g) || []).length === 1,
        projectHasFourSections: /# Role/.test(projectAgent) && /# Tools/.test(projectAgent) && /# Workflow/.test(projectAgent) && /# Work orders/.test(projectAgent),
        sharedToolCatalog: extractSection(groupAgent, "# Tools") === extractSection(projectAgent, "# Tools")
            && /ccm_ask_user/.test(projectAgent)
            && /invoke_skill/.test(projectAgent)
            && /tool_search/.test(projectAgent)
            && !/list_directory/.test(projectAgent),
        projectKeepsCodeAuthority: /grounded in current code and configuration/.test(projectAgent),
        projectAgentHasHybridPlanner: /ccm_present_plan/.test(projectAgent)
            && /simple explicit changes directly/.test(projectAgent),
        projectPlanKeepsReadOnlyAuthoring: projectPlan === projectAgent
            && /Planning is read-only/.test(projectPlanDynamic),
        dynamicContextDoesNotEnterStableCore: !groupAgent.includes("- demo")
            && groupPlanDynamic.includes("- demo")
            && !projectAgent.includes('project "api"')
            && projectPlanDynamic.includes("api"),
        sessionGuidanceHasNoShapeEssay: !/Skill:ccm-implementation-plan-authoring/.test(groupSession)
            && !/Skill:ccm-implementation-plan-authoring/.test(projectSession)
            && !/Skill:ccm-implementation-plan-authoring/.test(buildGroupMainSessionGuidance({ planAuthoring: true }))
            && /Treat the recent group conversation/.test(groupSession)
            && /Do not reread unchanged files/.test(projectSession)
            && /Treat the exact session goal/.test(globalSession)
            && !/Skill:ccm-implementation-plan-authoring/.test(globalSession),
        defaultExportsAreAgentMode: exports.GROUP_MAIN_SESSION_CONTEXT_GUIDANCE === groupSession
            && exports.PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE === projectSession
            && exports.GLOBAL_MAIN_SESSION_CONTEXT_GUIDANCE === globalSession,
        globalHasFourSections: /# Role/.test(globalAgent) && /# Tools/.test(globalAgent) && /# Workflow/.test(globalAgent) && /# Work orders/.test(globalAgent),
        globalDropsSchemaDump: !/schema=/.test(globalAgent) && !/read_group_context/.test(globalAgent),
        globalIsControlPlaneManager: /global control-plane Agent/.test(globalAgent)
            && /project lifecycle, cron jobs, groups and members, task control, MCP and Skills, global memory, music, pets, and navigation/.test(globalAgent)
            && !/routing kernel/.test(globalAgent),
        globalSeparatesManagementFromDevelopment: /A management action is not a development task/.test(globalAgent)
            && /direct reply, global inspection, controlled management action, delegated source inquiry, development planning\/dispatch, or task supervision/.test(globalAgent),
        globalKeepsControlTools: /ccm_ask_user/.test(globalAgent) && /invoke_skill/.test(globalAgent) && /tool_search/.test(globalAgent),
        globalDefersManagementTools: /Low-frequency resource-management/.test(globalAgent)
            && !/orchestrate_development/.test(extractSection(globalAgent, "# Tools"))
            && !/create_task/.test(extractSection(globalAgent, "# Tools")),
        globalUsesHybridPlanning: !/must call ccm_dispatch/.test(globalAgent)
            && /Never call ccm_dispatch/.test(globalAgent)
            && /ccm_present_plan/.test(globalAgent)
            && /complex, high-risk/.test(globalAgent),
        globalToolSectionDiffersFromGroup: extractSection(globalAgent, "# Tools") !== extractSection(groupAgent, "# Tools"),
        groupKeepsAuthorizedSourceAccess: /directly inspect source, configuration, Git state, and runtime status/.test(groupAgent)
            && /exact project_id/.test(groupAgent),
        projectKeepsBoundProjectRole: /Manage this bound project's questions, planning, task dispatch, and verification/.test(projectAgent),
        stablePromptSizes: globalAgent.length < 16_000 && groupAgent.length < 18_000 && projectAgent.length < 14_000,
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
    };
}
//# sourceMappingURL=main-agent-identity.js.map