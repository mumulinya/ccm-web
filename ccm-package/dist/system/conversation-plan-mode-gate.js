"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isConversationPlanModeEnabled = isConversationPlanModeEnabled;
exports.conversationPlanModeWouldCauseSideEffect = conversationPlanModeWouldCauseSideEffect;
exports.conversationPlanModeHoldsParsed = conversationPlanModeHoldsParsed;
exports.holdConversationPlanModeParsed = holdConversationPlanModeParsed;
exports.applyConversationPlanModeHold = applyConversationPlanModeHold;
exports.applyConversationPlanModeToRound = applyConversationPlanModeToRound;
exports.conversationPlanModeIdentityFromTask = conversationPlanModeIdentityFromTask;
exports.exitConversationPlanModeForTask = exitConversationPlanModeForTask;
exports.runConversationPlanModeGateSelfTest = runConversationPlanModeGateSelfTest;
const slash_command_session_state_1 = require("./slash-command-session-state");
const WRITE_RESPONSE_TYPES = new Set(["dispatch", "execute"]);
const PLAN_MODE_BLOCKED_ERROR = "CONVERSATION_PLAN_MODE_BLOCKED";
const PLAN_MODE_HOLD_REASON = "当前精确会话处于 Plan Mode，已由服务端阻止任务派发和写操作";
function isConversationPlanModeEnabled(scope, scopeId, exactSessionId) {
    return (0, slash_command_session_state_1.readSlashCommandSessionState)(scope, scopeId, exactSessionId).planMode?.enabled === true;
}
function conversationPlanModeWouldCauseSideEffect(input) {
    if (input.toolName) {
        if (input.knownTool === false)
            return true;
        return input.isReadOnly !== true;
    }
    return input.workflowActionRequired === true;
}
function conversationPlanModeHoldsParsed(parsed) {
    const responseType = String(parsed?.responseType || parsed?.response_type || "").toLowerCase();
    return WRITE_RESPONSE_TYPES.has(responseType)
        || parsed?.shouldDelegate === true
        || parsed?.should_delegate === true;
}
function holdConversationPlanModeParsed(parsed) {
    return {
        ...(parsed && typeof parsed === "object" ? parsed : {}),
        responseType: "plan",
        response_type: "plan",
        shouldDelegate: false,
        should_delegate: false,
        targets: [],
        assignments: [],
        workflowDecision: {
            ...(parsed?.workflowDecision || parsed?.workflow_decision || {}),
            mode: "plan_task",
            actionRequired: false,
            requiresCodeChanges: false,
            requiresUserConfirmation: false,
            reason: PLAN_MODE_HOLD_REASON,
        },
    };
}
function applyConversationPlanModeHold(scope, scopeId, exactSessionId, parsed) {
    if (!isConversationPlanModeEnabled(scope, scopeId, exactSessionId))
        return parsed;
    if (!conversationPlanModeHoldsParsed(parsed))
        return parsed;
    return holdConversationPlanModeParsed(parsed);
}
function applyConversationPlanModeToRound(input) {
    const requests = Array.isArray(input.requests) ? input.requests : [];
    if (!input.enabled) {
        return {
            parsed: input.parsed,
            requests,
            blockedRequests: [],
            blockedResults: [],
            held: false,
            stopLoop: false,
        };
    }
    const allowed = [];
    const blocked = [];
    for (const request of requests) {
        if (input.isReadOnly(request) === true)
            allowed.push(request);
        else
            blocked.push(request);
    }
    const parsedHolds = conversationPlanModeHoldsParsed(input.parsed);
    const parsed = parsedHolds || blocked.length ? holdConversationPlanModeParsed(input.parsed) : input.parsed;
    if (!allowed.length) {
        return {
            parsed,
            requests: [],
            blockedRequests: blocked,
            blockedResults: [],
            held: parsedHolds || blocked.length > 0,
            stopLoop: parsedHolds || blocked.length > 0,
        };
    }
    return {
        parsed,
        requests: allowed,
        blockedRequests: blocked,
        blockedResults: blocked.map(request => ({
            name: String(request?.name || "unknown"),
            ok: false,
            error: PLAN_MODE_BLOCKED_ERROR,
            reason: "当前精确会话处于 Plan Mode，只允许只读探索。确认并执行后才会派发或改代码。",
        })),
        held: blocked.length > 0 || parsedHolds,
        stopLoop: false,
    };
}
function conversationPlanModeIdentityFromTask(task) {
    const groupId = String(task?.group_id || "").trim();
    const groupSessionId = String(task?.group_session_id || "").trim();
    if (groupId && groupSessionId)
        return { scope: "group", scopeId: groupId, exactSessionId: groupSessionId };
    const project = String(task?.target_project || task?.project || "").trim();
    const projectSessionId = String(task?.project_session_id || "").trim();
    if (project && projectSessionId)
        return { scope: "project", scopeId: project, exactSessionId: projectSessionId };
    const globalSessionId = String(task?.global_session_id || task?.session_id || task?.exact_session_id || "").trim();
    if (globalSessionId && (task?.orchestration_scope === "global" || task?.source === "global-agent" || !groupId && !project)) {
        return { scope: "global", scopeId: "global", exactSessionId: globalSessionId };
    }
    const exactSessionId = String(task?.exact_session_id || "").trim();
    if (groupId && exactSessionId)
        return { scope: "group", scopeId: groupId, exactSessionId };
    return null;
}
function exitConversationPlanModeForTask(task) {
    const identity = conversationPlanModeIdentityFromTask(task);
    if (!identity)
        return { exited: false };
    try {
        return { ...(0, slash_command_session_state_1.exitSlashCommandSessionPlanMode)(identity.scope, identity.scopeId, identity.exactSessionId), ...identity };
    }
    catch {
        return { exited: false, ...identity };
    }
}
function runConversationPlanModeGateSelfTest() {
    const readOnly = (request) => ["read_file", "glob_files", "grep_text", "query_knowledge"].includes(String(request?.name || ""));
    const dispatchParsed = { responseType: "dispatch", shouldDelegate: true, targets: [{ project: "api" }] };
    const held = holdConversationPlanModeParsed(dispatchParsed);
    const readRound = applyConversationPlanModeToRound({
        enabled: true,
        parsed: { responseType: "reply" },
        requests: [{ name: "read_file" }, { name: "glob_files" }],
        isReadOnly: readOnly,
    });
    const writeRound = applyConversationPlanModeToRound({
        enabled: true,
        parsed: dispatchParsed,
        requests: [{ name: "invoke_skill" }],
        isReadOnly: readOnly,
    });
    const mixedRound = applyConversationPlanModeToRound({
        enabled: true,
        parsed: dispatchParsed,
        requests: [{ name: "read_file" }, { name: "unknown_write_tool" }],
        isReadOnly: readOnly,
    });
    const disabledRound = applyConversationPlanModeToRound({
        enabled: false,
        parsed: dispatchParsed,
        requests: [{ name: "invoke_skill" }],
        isReadOnly: readOnly,
    });
    const unknownBlocked = conversationPlanModeWouldCauseSideEffect({ toolName: "mystery", knownTool: false });
    const readAllowed = conversationPlanModeWouldCauseSideEffect({ toolName: "inspect_system", knownTool: true, isReadOnly: true });
    const groupIdentity = conversationPlanModeIdentityFromTask({ group_id: "g1", group_session_id: "gcs_1", target_project: "api", project_session_id: "ps_1" });
    const projectIdentity = conversationPlanModeIdentityFromTask({ target_project: "api", project_session_id: "ps_1" });
    const checks = {
        holdClearsDispatch: held.responseType === "plan" && held.shouldDelegate === false && Array.isArray(held.targets) && held.targets.length === 0,
        holdClearsProjectDelegate: held.should_delegate === false && held.workflowDecision?.mode === "plan_task",
        readToolsPass: readRound.stopLoop === false && readRound.requests.map((item) => item.name).join(",") === "read_file,glob_files" && readRound.held === false,
        writeToolsHeld: writeRound.stopLoop === true && writeRound.requests.length === 0 && writeRound.parsed?.responseType === "plan",
        unknownToolsHeld: mixedRound.requests.map((item) => item.name).join(",") === "read_file"
            && mixedRound.blockedResults.some((item) => item.error === PLAN_MODE_BLOCKED_ERROR)
            && mixedRound.parsed?.shouldDelegate === false,
        disabledDoesNotHold: disabledRound.held === false && disabledRound.requests.length === 1,
        unknownToolClosed: unknownBlocked === true,
        readToolOpen: readAllowed === false,
        groupSessionWins: groupIdentity?.scope === "group" && groupIdentity.exactSessionId === "gcs_1",
        projectIdentityResolved: projectIdentity?.scope === "project" && projectIdentity.scopeId === "api",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=conversation-plan-mode-gate.js.map