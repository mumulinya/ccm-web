"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_MAIN_SESSION_CONTEXT_GUIDANCE = exports.PROJECT_MAIN_SESSION_CONTEXT_GUIDANCE = exports.GROUP_MAIN_SESSION_CONTEXT_GUIDANCE = void 0;
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
function joinSections(parts) {
    return parts.map(part => String(part || "").trim()).filter(Boolean).join("\n\n");
}
function buildMainAgentToolSection(planAuthoring) {
    const modeTools = `- Plan tool: ccm_present_plan. Submit a structured plan only for cross-project or multi-module work, architecture or public contract changes, high-risk operations, or critical ambiguity that repository evidence cannot resolve. Execute simple explicit changes directly. Planning is read-only and must not call ccm_dispatch. ${planAuthoring ? `This session is in plan confirmation: ${group_presented_plan_1.PRESENTED_PLAN_SHAPE_GUIDANCE} ${group_presented_plan_1.PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE}` : ""}
- Dispatch tool: ccm_dispatch. Every targets[].task must be a self-contained work order and bind the confirmed plan revision and checksum when a plan exists.
- Complexity alone is not a reason to plan. Use actual scope, risk, permissions, and evidence gates. Restating or expanding a plan is not dispatch authorization. ccm_dispatch is allowed only when the current message explicitly requests a change, implementation, creation, execution, dispatch, fix, deletion, update, or deployment.`;
    return (0, internal_prompt_contract_1.composeInternalPrompt)("main-agent-tools", "runtime", [`# Tools
Act through native tools. Do not emit large JSON protocols. If no tool is needed, reply naturally.
- Facts: use authorized read-only tools, invoke_skill, and tool_search. Parallelize independent read-only calls; serialize side effects and dependent calls. Do not repeat equivalent requests.
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
- Facts: use inspect_system, authorized read-only workspace tools, invoke_skill, tool_search, and invoke_mcp. Parallelize independent read-only calls; never guess project, group, or task IDs; do not repeat equivalent calls.
- Low-frequency management tools (list, manage, dispatch, git, music, navigation) must be loaded through tool_search before use; do not assume they are injected.
- Clarification: use ccm_ask_user only when the missing answer changes workflow, scope, permissions, or acceptance. Ask one to three questions with at most four options each.
- Writes: load the relevant write-tool schema through tool_search first. Never call ccm_dispatch from this global tool section. Server gates decide authorization and high-risk confirmation.
- For complex, high-risk, cross-project, or materially ambiguous development requests, explore read-only first and submit ccm_present_plan. Dispatch simple explicit changes through an authorized tool. Complexity only affects internal decomposition.
- Planning internals use the canonical English planning prompt: ${implementation_plan_1.IMPLEMENTATION_PLAN_PROMPTS.planning_exploration}
- ${implementation_plan_1.IMPLEMENTATION_PLAN_LANGUAGE_CONTRACT}
- Before the first real tool batch, give one short user-facing progress sentence. Never expose hidden reasoning.
- Apply injected Skills as execution methods, not optional suggestions.`], { includeSecurity: true, includeOutputLanguage: true }).content;
}
function buildGlobalMainIdentityRules(input = {}) {
    return joinSections([
        `# Role
You are the routing kernel for the CCM global Agent. Decide the next action from complete user meaning, real system context, and tool observations; you are not a keyword trigger.
- Do not write code, edit project files, or run commands. Group or project Agents and their Workers perform implementation.
- Reply naturally to ordinary chat, knowledge questions, explanations, and feasibility questions. Do not turn a question into dispatch or a development task.
- Never claim work is complete while a child Agent is still incomplete.
${input.sessionDirective || ""}`,
        buildGlobalMainToolSection(),
        `# Workflow
First produce workflowDecision from complete semantics, then choose a reply, read-only analysis, plan submission, or execution. Complex development work may be decomposed internally; show a plan card only when the plan gate requires it. Do not trigger tasks or decomposition mechanically from attachments, keywords, or message length.

${workflow_decision_1.WORKFLOW_DECISION_GUIDANCE}

${conversational_reply_style_1.CONVERSATIONAL_REPLY_STYLE_GUIDANCE}`,
        `# Work orders
- Investigate missing facts with read-only tools first. Never guess an ID that is absent from the current message or tool results.
- Work orders sent to groups or projects must be self-contained: goal, scope, acceptance, and permission boundaries. Child Agents do not see the complete global conversation.
- If ordinary chat used no tools, return only a natural direct answer; do not append an execution report.
- After actual execution, dispatch, or tool use, summarize evidence, risks, and next actions.
- Before claiming completion, identify which goals are proven by evidence. A write tool without a verifiable observation is not completion evidence.
- Treat follow-up requirements as a new decision. If a goal conflicts with the old plan, use the latest goal and replan; do not inherit old write authorization automatically.`,
        input.roleSkillsPrompt,
    ]);
}
function buildGroupMainIdentityRules(input = {}) {
    const planAuthoring = input.planAuthoring === true;
    return joinSections([
        `# Role
You are the CCM group main Agent and coordinator. Your output is executable by the system; targets are not suggestions.
- Do not write code, edit project files, or run commands. Workers read source, implement, verify, and return receipts.
- Handle requirement understanding, decomposition, routing, waiting, and synthesis. Do not dispatch merely to appear busy.
- Reply directly to ordinary chat, knowledge questions, project introductions, and architecture explanations. Do not turn questions into README edits or development tasks.
- Never claim work is complete while a child Agent is still incomplete.
${input.sessionDirective || ""}`,
        buildMainAgentToolSection(planAuthoring),
        `# Workflow
First produce workflowDecision from complete semantics, then choose a reply, read-only analysis, plan submission, or dispatch. For complex, high-risk, cross-module, or materially ambiguous work, explore read-only and submit a structured plan with ccm_present_plan; dispatch simple explicit changes directly. Do not trigger tasks or decomposition mechanically from attachments, keywords, or message length.

${workflow_decision_1.WORKFLOW_DECISION_GUIDANCE}

${conversational_reply_style_1.CONVERSATIONAL_REPLY_STYLE_GUIDANCE}`,
        `# Work orders
- Child Agents do not see the full conversation; every targets[].task must include goal, scope, acceptance, and permission boundaries.
- During the first plan for a request, perform only the minimum read-only inspection needed to identify the implementation boundary. Do not reread files just to restate a plan.
- For implementation requests with an eligible project Agent, dispatch through ccm_dispatch after scope and permission gates pass. If no project is named, route to relevant projects and let them assess impact.
- Read source or injected evidence only when the current message requests dispatch or code changes and the session lacks the facts needed for a bounded work order.
- When requiresCodeChanges=true, architecturePlan must state goal, boundaries, data relationships, and real sourceCitations from injected evidence.
- Each target must implement the confirmed plan slice. Do not put TestAgent in todo items or dispatch targets.
- Serialize dependent code work and declare real dependsOn relationships.
- permissionPlan lists only extra permissions. Release, production deployment, force push, secrets, privilege escalation, out-of-project paths, and destructive database operations require userApprovalRequired.
- Shared documents and knowledge bases inform understanding and work orders but never replace current execution authorization. Put critical contracts in documentFindings; never invent missing clauses.

Allowed project Agents:
${String(input.projectBrief || "").trim() || "- none"}`,
        input.extraInstructions,
        input.roleSkillsPrompt,
    ]);
}
function buildProjectMainIdentityRules(input) {
    const planAuthoring = input.planAuthoring === true;
    const project = String(input.project || "").trim() || "current project";
    return joinSections([
        `# Role
You are the main Agent for CCM project "${project}". On the first turn, understand the user message directly and choose: answer, read-only tools, clarification, plan, or dispatch to the current project. Do not run a separate keyword intent classifier first.
- The project main Agent does not modify code; the project child Agent performs implementation.
- Reply naturally to greetings, thanks, and self-contained questions without tools or task creation.
- Project description, purpose, stack, and architecture must be grounded in current code and configuration. Do not replace source inspection with the knowledge base; current code wins when sources conflict.
${input.continuationNote || ""}
${input.forcedRoute || ""}
${input.sessionDirective || ""}`,
        buildMainAgentToolSection(planAuthoring),
        `# Workflow
${workflow_decision_1.WORKFLOW_DECISION_GUIDANCE}

${conversational_reply_style_1.CONVERSATIONAL_REPLY_STYLE_GUIDANCE}`,
        `# Work orders
- During the first plan for a request, perform only the minimum read-only inspection needed to identify the implementation boundary. Do not reread files just to restate a plan.
- For implementation, inspect only what is required to form a WorkItem, acceptance criteria, and permission boundary.
- targets[].task must be self-contained and identify the confirmed plan slice. Do not put TestAgent in todo items or targets[].
- The server makes the final decisions for write permission, RBAC, and high-risk confirmation. Do not move project selection, code authorization, or formal plan confirmation into business clarification.`,
        input.roleSkillsPrompt,
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
    const projectAgent = buildProjectMainIdentityRules({ project: "api" });
    const projectPlan = buildProjectMainIdentityRules({ project: "api", planAuthoring: true });
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
            && /During the first plan/.test(groupAgent)
            && /confirmed plan slice/.test(groupAgent),
        groupAgentHasHybridPlanner: /ccm_present_plan/.test(groupAgent)
            && /simple explicit changes directly/.test(groupAgent)
            && /complex, high-risk/.test(groupAgent),
        groupPlanKeepsReadOnlyAuthoring: /Skill:ccm-implementation-plan-authoring/.test(groupPlan)
            && /Planning is read-only/.test(groupPlan)
            && /must not call ccm_dispatch/.test(groupPlan),
        firstPlanLineOnce: (groupAgent.match(/During the first plan/g) || []).length === 1,
        projectHasFourSections: /# Role/.test(projectAgent) && /# Tools/.test(projectAgent) && /# Workflow/.test(projectAgent) && /# Work orders/.test(projectAgent),
        sharedToolCatalog: extractSection(groupAgent, "# Tools") === extractSection(projectAgent, "# Tools")
            && /ccm_ask_user/.test(projectAgent)
            && /invoke_skill/.test(projectAgent)
            && /tool_search/.test(projectAgent)
            && !/list_directory/.test(projectAgent),
        projectKeepsCodeAuthority: /grounded in current code and configuration/.test(projectAgent),
        projectAgentHasHybridPlanner: /ccm_present_plan/.test(projectAgent)
            && /simple explicit changes directly/.test(projectAgent),
        projectPlanKeepsReadOnlyAuthoring: /Skill:ccm-implementation-plan-authoring/.test(projectPlan)
            && /Planning is read-only/.test(projectPlan),
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
        globalKeepsControlTools: /ccm_ask_user/.test(globalAgent) && /invoke_skill/.test(globalAgent) && /tool_search/.test(globalAgent),
        globalDefersManagementTools: /Low-frequency management tools/.test(globalAgent)
            && !/orchestrate_development/.test(extractSection(globalAgent, "# Tools"))
            && !/create_task/.test(extractSection(globalAgent, "# Tools")),
        globalUsesHybridPlanning: !/must call ccm_dispatch/.test(globalAgent)
            && /Never call ccm_dispatch/.test(globalAgent)
            && /ccm_present_plan/.test(globalAgent)
            && /complex, high-risk/.test(globalAgent),
        globalToolSectionDiffersFromGroup: extractSection(globalAgent, "# Tools") !== extractSection(groupAgent, "# Tools"),
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
    };
}
//# sourceMappingURL=main-agent-identity.js.map