import { conversationPlanModeSupported, exitSlashCommandSessionPlanMode, readSlashCommandSessionState } from "./slash-command-session-state";

export { conversationPlanModeSupported } from "./slash-command-session-state";

export type ConversationPlanScope = "global" | "project" | "group";

const WRITE_RESPONSE_TYPES = new Set(["dispatch", "execute"]);
const PLAN_MODE_BLOCKED_ERROR = "CONVERSATION_PLAN_MODE_BLOCKED";
const PLAN_MODE_HOLD_REASON = "当前精确会话处于 Plan Mode，已由服务端阻止任务派发和写操作";

export function isConversationPlanModeEnabled(scope: ConversationPlanScope, scopeId: string, exactSessionId: string) {
  if (!conversationPlanModeSupported(scope)) return false;
  return readSlashCommandSessionState(scope, scopeId, exactSessionId).planMode?.enabled === true;
}

export function conversationPlanModeWouldCauseSideEffect(input: {
  toolName?: string;
  isReadOnly?: boolean;
  knownTool?: boolean;
  workflowActionRequired?: boolean;
}) {
  if (input.toolName) {
    if (input.knownTool === false) return true;
    return input.isReadOnly !== true;
  }
  return input.workflowActionRequired === true;
}

export function conversationPlanModeHoldsParsed(parsed: any) {
  const responseType = String(parsed?.responseType || parsed?.response_type || "").toLowerCase();
  const workflowDecision = parsed?.workflowDecision || parsed?.workflow_decision || {};
  return WRITE_RESPONSE_TYPES.has(responseType)
    || parsed?.shouldDelegate === true
    || parsed?.should_delegate === true
    || workflowDecision?.actionRequired === true
    || workflowDecision?.action_required === true;
}

// In interactive project/group conversations, the user-selected mode owns the
// visible planning boundary. Workflow decisions carry capabilities only;
// only the exact-session Plan Mode may turn a write request into a plan card.
export function applyInteractiveConversationModePolicy(
  scope: ConversationPlanScope,
  planModeEnabled: boolean,
  parsed: any,
) {
  if (!["project", "group"].includes(scope) || planModeEnabled) return parsed;
  const source = parsed && typeof parsed === "object" ? parsed : {};
  const decision = source.workflowDecision || source.workflow_decision || {};
  const actionRequired = decision?.actionRequired === true || decision?.action_required === true;
  const requiresCodeChanges = decision?.requiresCodeChanges === true || decision?.requires_code_changes === true;
  const development = actionRequired || requiresCodeChanges;
  const responseType = String(source.responseType || source.response_type || "").toLowerCase();
  if (!development && responseType !== "plan") {
    return source;
  }
  // A model-submitted plan is a user-visible proposal even outside the manual
  // slash Plan Mode. Only an explicit dispatch is executable here.
  const nextResponseType = responseType === "plan" ? "plan" : responseType;
  return {
    ...source,
    ...(nextResponseType ? { responseType: nextResponseType, response_type: nextResponseType } : {}),
    workflowDecision: decision,
    workflow_decision: decision,
  };
}

export function holdConversationPlanModeParsed(parsed: any) {
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
      actionRequired: false,
      requiresCodeChanges: false,
      requiresUserConfirmation: false,
      reason: PLAN_MODE_HOLD_REASON,
    },
  };
}

export function applyConversationPlanModeHold(
  scope: ConversationPlanScope,
  scopeId: string,
  exactSessionId: string,
  parsed: any,
) {
  if (!isConversationPlanModeEnabled(scope, scopeId, exactSessionId)) return parsed;
  if (!conversationPlanModeHoldsParsed(parsed)) return parsed;
  return holdConversationPlanModeParsed(parsed);
}

export function applyConversationPlanModeToRound(input: {
  enabled: boolean;
  parsed: any;
  requests: any[];
  isReadOnly: (request: any) => boolean;
}) {
  const requests = Array.isArray(input.requests) ? input.requests : [];
  if (!input.enabled) {
    return {
      parsed: input.parsed,
      requests,
      blockedRequests: [] as any[],
      blockedResults: [] as any[],
      held: false,
      stopLoop: false,
    };
  }
  const allowed: any[] = [];
  const blocked: any[] = [];
  for (const request of requests) {
    if (input.isReadOnly(request) === true) allowed.push(request);
    else blocked.push(request);
  }
  const parsedHolds = conversationPlanModeHoldsParsed(input.parsed);
  const parsed = parsedHolds || blocked.length ? holdConversationPlanModeParsed(input.parsed) : input.parsed;
  if (!allowed.length) {
    return {
      parsed,
      requests: [] as any[],
      blockedRequests: blocked,
      blockedResults: [] as any[],
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

export function conversationPlanModeIdentityFromTask(task: any): { scope: ConversationPlanScope; scopeId: string; exactSessionId: string } | null {
  const groupId = String(task?.group_id || "").trim();
  const groupSessionId = String(task?.group_session_id || "").trim();
  if (groupId && groupSessionId) return { scope: "group", scopeId: groupId, exactSessionId: groupSessionId };
  const project = String(task?.target_project || task?.project || "").trim();
  const projectSessionId = String(task?.project_session_id || "").trim();
  if (project && projectSessionId) return { scope: "project", scopeId: project, exactSessionId: projectSessionId };
  const globalSessionId = String(task?.global_session_id || task?.session_id || task?.exact_session_id || "").trim();
  if (globalSessionId && (task?.orchestration_scope === "global" || task?.source === "global-agent" || !groupId && !project)) {
    return { scope: "global", scopeId: "global", exactSessionId: globalSessionId };
  }
  const exactSessionId = String(task?.exact_session_id || "").trim();
  if (groupId && exactSessionId) return { scope: "group", scopeId: groupId, exactSessionId };
  return null;
}

export function exitConversationPlanModeForTask(task: any) {
  const identity = conversationPlanModeIdentityFromTask(task);
  if (!identity) return { exited: false };
  try {
    return { ...exitSlashCommandSessionPlanMode(identity.scope, identity.scopeId, identity.exactSessionId), ...identity };
  } catch {
    return { exited: false, ...identity };
  }
}

export function runConversationPlanModeGateSelfTest() {
  const readOnly = (request: any) => ["read_file", "glob_files", "grep_text", "query_knowledge"].includes(String(request?.name || ""));
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
  const agentModePlanTask = applyInteractiveConversationModePolicy("project", false, {
    responseType: "plan",
    workflowDecision: { actionRequired: true, requiresCodeChanges: true, needsEpicDecomposition: false },
  });
  const manualPlanTask = applyInteractiveConversationModePolicy("project", true, {
    responseType: "plan",
    workflowDecision: { actionRequired: false, requiresCodeChanges: false, needsEpicDecomposition: false },
  });
  const checks = {
    holdClearsDispatch: held.responseType === "plan" && held.shouldDelegate === false && Array.isArray(held.targets) && held.targets.length === 0,
    holdClearsProjectDelegate: held.should_delegate === false && held.workflowDecision?.actionRequired === false,
    readToolsPass: readRound.stopLoop === false && readRound.requests.map((item: any) => item.name).join(",") === "read_file,glob_files" && readRound.held === false,
    writeToolsHeld: writeRound.stopLoop === true && writeRound.requests.length === 0 && writeRound.parsed?.responseType === "plan",
    unknownToolsHeld: mixedRound.requests.map((item: any) => item.name).join(",") === "read_file"
      && mixedRound.blockedResults.some((item: any) => item.error === PLAN_MODE_BLOCKED_ERROR)
      && mixedRound.parsed?.shouldDelegate === false,
    disabledDoesNotHold: disabledRound.held === false && disabledRound.requests.length === 1,
    unknownToolClosed: unknownBlocked === true,
    readToolOpen: readAllowed === false,
    groupSessionWins: groupIdentity?.scope === "group" && groupIdentity.exactSessionId === "gcs_1",
    projectIdentityResolved: projectIdentity?.scope === "project" && projectIdentity.scopeId === "api",
    agentModeKeepsModelPlan: agentModePlanTask.responseType === "plan"
      && agentModePlanTask.workflowDecision?.requiresCodeChanges === true,
    manualPlanStillPresentsPlan: manualPlanTask.responseType === "plan"
      && manualPlanTask.workflowDecision?.actionRequired === false,
    globalHasNoConversationPlanMode: conversationPlanModeSupported("global") === false,
    groupKeepsConversationPlanMode: conversationPlanModeSupported("group") === true,
    projectKeepsConversationPlanMode: conversationPlanModeSupported("project") === true,
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
