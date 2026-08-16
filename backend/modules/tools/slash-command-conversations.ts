import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR, collectRequestBuffer, sendJson } from "../../core/utils";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import {
  appendProjectSessionLocalCommandRecord,
  getSessionDetail,
  replaceProjectSessionConversation,
  upsertProjectSessionTaskMessage,
  writeProjectSessionConversationBranch,
} from "../projects/sessions";
import {
  createGroupChatSession,
  getGroupMessages,
  listGroupChatSessions,
  saveGroupMessages,
  selectGroupChatSession,
} from "../collaboration/storage";
import { rotateGroupSessionLifecycleHead } from "../collaboration/group-session-lifecycle-head";
import { readGroupSessionLifecycleHead } from "../collaboration/group-session-lifecycle-head";
import { getProjectSessionAgentBinding, isProjectSessionAgentDispatchActive, rotateProjectSessionAgentBinding } from "../projects/project-session-agent-binding";
import { requestGroupSessionAgentCancellation } from "../../agents/execution-kernel";
import { listActiveAgentRuns, requestTaskCancellation } from "../../agents/execution-kernel";
import {
  applyExecutionRecovery,
  compensateExecutionRecovery,
  listExecutionRecoveryManifests,
  previewExecutionRecovery,
} from "../../agents/execution-recovery";
import { callGlobalModelWithRetry } from "../global/global-agent-model";
import { loadOrchestratorConfig } from "../collaboration/group-orchestrator-config";
import { recordMetric } from "../../core/db";
import { hasResourceAccess } from "../system/access-policy";
import { cancelGlobalAgentRun } from "../../agents/global/global-agent-loop-engine";
import { getGlobalAgentRun, listGlobalAgentRuns } from "../../agents/global/global-agent-run-store";
import { invalidateProviderNeutralContextCacheState } from "../../system/provider-neutral-context-cache";
import { readConversationPermissionPolicy, updateConversationPermissionPolicy } from "./conversation-permission-policy";
import { conversationPlanModeSupported, GLOBAL_CONVERSATION_PLAN_MODE_UNSUPPORTED } from "../../system/slash-command-session-state";

type Scope = "global" | "project" | "group";

const STATE_FILE = path.join(CCM_DIR, "slash-command-conversation-state.json");
const GLOBAL_HISTORY_FILE = path.join(CCM_DIR, "global-agent-history.json");
const REWIND_DIR = path.join(CCM_DIR, "conversation-rewind-snapshots");
const BLOCKED_DETAIL_KEY = /(?:prompt|secret|password|token|api[_-]?key|raw(?:output|result|body)|hidden[_-]?thinking|native[_-]?session|content|text|body)/i;
const activeAsideRequests = new Map<string, AbortController>();

function now() { return new Date().toISOString(); }
function checksum(value: any) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function normalizeScope(value: any): Scope { return value === "project" || value === "group" ? value : "global"; }
function safeId(value: any, label: string) {
  const id = String(value || "").trim();
  if (!id || !/^[\p{L}\p{N}._:-]{1,180}$/u.test(id)) throw new Error(`缺少或无效的${label}`);
  return id;
}
function identity(input: any) {
  const scope = normalizeScope(input.scope);
  const sessionId = safeId(input.exactSessionId || input.exact_session_id || input.sessionId || input.session_id, "会话 ID");
  const scopeId = scope === "global" ? "global" : safeId(input.scopeId || input.scope_id || input.project || input.groupId || input.group_id, "作用域 ID");
  return { scope, scopeId, sessionId, key: `${scope}:${scopeId}:${sessionId}` };
}
function assertApiResourceAccess(req: any, input: any, required: "use" | "manage" = "use") {
  const id = identity(input);
  const principal = req?.ccmAuth;
  if (id.scope === "global" || !principal || principal.kind === "internal" || principal.role === "admin") return id;
  if (!hasResourceAccess(String(principal.userId || ""), String(principal.role || "viewer"), id.scope, id.scopeId, required)) {
    const error: any = new Error(id.scope === "project" ? "当前账户没有该项目的访问权限" : "当前账户没有该群聊的访问权限");
    error.statusCode = 403;
    throw error;
  }
  return id;
}

function readState() {
  return readJsonWithBackup(STATE_FILE, { schema: "ccm-slash-command-conversation-state-v1", revision: 0, sessions: {}, records: [] });
}
function mutateState<T>(operation: (state: any) => T): T {
  return withFileLock(STATE_FILE, () => {
    const state: any = readState();
    state.sessions = state.sessions && typeof state.sessions === "object" ? state.sessions : {};
    state.records = Array.isArray(state.records) ? state.records : [];
    const result = operation(state);
    state.revision = Number(state.revision || 0) + 1;
    state.updatedAt = now();
    state.records = state.records.slice(-2000);
    writeJsonAtomic(STATE_FILE, state);
    return result;
  });
}

function cleanAttachment(value: any) {
  if (!value || typeof value !== "object") return null;
  return {
    id: String(value.id || value.file_id || ""),
    name: String(value.name || value.filename || "").slice(0, 240),
    type: String(value.type || value.mime || value.mimeType || "").slice(0, 120),
    size: Math.max(0, Number(value.size || 0)),
    checksum: String(value.checksum || "").slice(0, 128),
  };
}
function cloneVisibleMessage(message: any) {
  if (!message || !["user", "assistant"].includes(String(message.role || ""))) return null;
  if (message.hidden_execution === true || message.modelVisible === false || message.model_visible === false) return null;
  if (["tool_use", "tool_result", "local_command", "command_result"].includes(String(message.type || ""))) return null;
  const content = String(message.content || message.text || "").slice(0, 80_000);
  if (!content.trim()) return null;
  const files = (Array.isArray(message.files) ? message.files : Array.isArray(message.attachments) ? message.attachments : []).map(cleanAttachment).filter(Boolean);
  return {
    id: String(message.id || message.message_id || `msg_${crypto.randomUUID()}`),
    role: String(message.role),
    content,
    timestamp: String(message.timestamp || message.created_at || now()),
    ...(files.length ? { files } : {}),
    ...(message.sourceRefs || message.source_refs ? { sourceRefs: message.sourceRefs || message.source_refs } : {}),
  };
}
function cloneVisibleMessages(messages: any[]) { return (messages || []).map(cloneVisibleMessage).filter(Boolean); }
function messageId(message: any, index: number) { return String(message?.id || message?.message_id || message?.uuid || `index:${index}`); }
function anchorIndex(messages: any[], requested: any) {
  if (!messages.length) return -1;
  const target = String(requested || "").trim();
  if (!target) return messages.length - 1;
  const found = messages.findIndex((message, index) => messageId(message, index) === target);
  if (found < 0) throw new Error("锚点消息不存在或已漂移");
  return found;
}

function loadGlobalStore() { return readJsonWithBackup(GLOBAL_HISTORY_FILE, { current_session_id: "", sessions: [] }); }
function writeGlobalStore(store: any) { writeJsonAtomic(GLOBAL_HISTORY_FILE, store); }

function readConversation(input: any) {
  const id = identity(input);
  if (id.scope === "global") {
    const store: any = loadGlobalStore();
    const session = (store.sessions || []).find((item: any) => String(item.id) === id.sessionId);
    if (!session) throw new Error("全局会话不存在");
    return { id, title: String(session.name || "全局 Agent 会话"), messages: Array.isArray(session.messages) ? session.messages : [], raw: session };
  }
  if (id.scope === "project") {
    const detail: any = getSessionDetail(id.scopeId, id.sessionId);
    if (!detail) throw new Error("项目会话不存在");
    return { id, title: String(detail.name || "项目会话"), messages: Array.isArray(detail.history) ? detail.history : [], raw: detail };
  }
  const messages = getGroupMessages(id.scopeId, id.sessionId);
  const session = listGroupChatSessions(id.scopeId).sessions.find((item: any) => String(item?.id || "") === id.sessionId) || null;
  return { id, title: String(session?.title || "群聊会话"), messages, raw: session };
}

function isAutomationConversation(boundary: any) {
  return String(boundary?.raw?.session_kind || boundary?.raw?.sessionKind || "").toLowerCase() === "automation";
}

function currentBoundary(input: any) {
  const conversation = readConversation(input);
  const state: any = readState();
  const sessionState = state.sessions?.[conversation.id.key] || {};
  return {
    ...conversation,
    revision: Number(sessionState.revision || 0),
    generation: conversation.id.scope === "project"
      ? Number(getProjectSessionAgentBinding(conversation.id.scopeId, conversation.id.sessionId)?.generation || 0)
      : conversation.id.scope === "group"
        ? Number(readGroupSessionLifecycleHead(conversation.id.scopeId, conversation.id.sessionId)?.generation || 0)
        : Number(sessionState.generation || 0),
    conversationChecksum: checksum(conversation.messages),
  };
}

function assertExpected(boundary: any, input: any) {
  const expectedChecksum = String(input.conversationChecksum || input.conversation_checksum || "");
  const expectedRevision = input.revision;
  const expectedGeneration = input.generation;
  if (expectedChecksum && expectedChecksum !== boundary.conversationChecksum) throw new Error("会话内容已漂移，请重新预览");
  if (expectedRevision !== undefined && Number(expectedRevision) !== boundary.revision) throw new Error("会话 revision 已漂移，请重新预览");
  if (expectedGeneration !== undefined && Number(expectedGeneration) !== boundary.generation) throw new Error("会话 generation 已漂移，请重新预览");
}

function prePlanProjection(message: any) {
  const summary = message?.clarification_summary || message?.clarificationSummary || null;
  const run = message?.agenticRun || message?.agentic_run || null;
  return message?.prePlanClarification || message?.pre_plan_clarification
    || summary?.prePlanClarification || summary?.pre_plan_clarification
    || run?.clarification_summary?.pre_plan_clarification
    || run?.clarificationSummary?.prePlanClarification
    || null;
}

function activePrePlanClarification(input: any) {
  const boundary = currentBoundary(input);
  const row = [...boundary.messages].reverse().map((message: any) => ({ message, projection: prePlanProjection(message) }))
    .find((item: any) => item.projection?.schema === "ccm-pre-plan-clarification-v1" && item.projection.status === "pending");
  return {
    clarification: row?.projection || null,
    anchorMessageId: String(row?.message?.id || row?.projection?.anchorMessageId || ""),
    revision: boundary.revision,
    generation: boundary.generation,
    conversationChecksum: boundary.conversationChecksum,
    contentStored: false,
  };
}

function validatePrePlanClarificationAction(input: any, expectedStatus = "pending") {
  const boundary = currentBoundary(input);
  const active = activePrePlanClarification(input);
  const projection = active.clarification;
  if (!projection || projection.status !== expectedStatus) {
    const error: any = new Error("当前会话没有等待处理的计划前业务澄清");
    error.statusCode = 404;
    throw error;
  }
  if (String(input.clarificationId || input.clarification_id || input.id || "") !== String(projection.id || "")) {
    const error: any = new Error("澄清请求已经变化，请刷新后重试");
    error.statusCode = 409;
    error.code = "CLARIFICATION_REVISION_CONFLICT";
    throw error;
  }
  if (Number(input.revision) !== Number(projection.revision) || Number(input.generation) !== Number(projection.generation)) {
    const error: any = new Error("澄清版本已经变化，请刷新后重试");
    error.statusCode = 409;
    error.code = "CLARIFICATION_REVISION_CONFLICT";
    throw error;
  }
  const expectedChecksum = String(input.conversationChecksum || input.conversation_checksum || "");
  if (expectedChecksum && expectedChecksum !== boundary.conversationChecksum) {
    const error: any = new Error("会话内容已漂移，请刷新后重试");
    error.statusCode = 409;
    error.code = "CLARIFICATION_REVISION_CONFLICT";
    throw error;
  }
  return { boundary, projection, anchorMessageId: active.anchorMessageId };
}

function updatePrePlanClarificationStatus(boundary: any, clarificationId: string, status: "resolved" | "cancelled") {
  const updatedAt = now();
  const messages = (boundary.messages || []).map((message: any) => {
    const projection = prePlanProjection(message);
    if (String(projection?.id || "") !== clarificationId) return message;
    const nextProjection = { ...projection, status, revision: Number(projection.revision || 1) + 1, updatedAt };
    const summary = message.clarification_summary || message.clarificationSummary || null;
    const agenticRun = message.agenticRun || message.agentic_run || null;
    return {
      ...message,
      ...(message.prePlanClarification ? { prePlanClarification: nextProjection } : {}),
      ...(message.pre_plan_clarification ? { pre_plan_clarification: nextProjection } : {}),
      ...(summary ? {
        clarification_summary: { ...summary, status, pre_plan_clarification: nextProjection },
        clarificationSummary: { ...summary, status, prePlanClarification: nextProjection },
      } : {}),
      ...(agenticRun ? {
        agenticRun: {
          ...agenticRun,
          clarification_summary: { ...(agenticRun.clarification_summary || {}), status, pre_plan_clarification: nextProjection },
          clarificationSummary: { ...(agenticRun.clarificationSummary || {}), status, prePlanClarification: nextProjection },
        },
      } : {}),
    };
  });
  if (boundary.id.scope === "global") {
    withFileLock(GLOBAL_HISTORY_FILE, () => {
      const store: any = loadGlobalStore();
      const session = (store.sessions || []).find((item: any) => String(item.id) === boundary.id.sessionId);
      if (!session) throw new Error("全局会话不存在");
      session.messages = messages;
      session.updatedAt = updatedAt;
      writeGlobalStore(store);
    });
  } else if (boundary.id.scope === "project") {
    const changed = messages.find((message: any) => String(prePlanProjection(message)?.id || "") === clarificationId);
    if (changed) upsertProjectSessionTaskMessage(boundary.id.scopeId, boundary.id.sessionId, changed);
  } else {
    saveGroupMessages(boundary.id.scopeId, messages, boundary.id.sessionId);
  }
  return nextProjectionReceipt(status, clarificationId, updatedAt);
}

function nextProjectionReceipt(status: string, clarificationId: string, updatedAt: string) {
  return { status, clarificationId, updatedAt, contentStored: false };
}

function persistSessionState(id: ReturnType<typeof identity>, patch: any, expected: { revision?: number; generation?: number } = {}) {
  return mutateState(state => {
    const previous = state.sessions[id.key] || { revision: 0, generation: 0 };
    if (expected.revision !== undefined && Number(expected.revision) !== Number(previous.revision || 0)) throw new Error("会话命令状态 revision 已漂移，请重新读取");
    if (expected.generation !== undefined && Number(expected.generation) !== Number(previous.generation || 0)) throw new Error("会话命令状态 generation 已漂移，请重新读取");
    const next = { ...previous, ...patch, revision: Number(previous.revision || 0) + 1, updatedAt: now() };
    state.sessions[id.key] = next;
    return next;
  });
}

function branchConversation(input: any) {
  const boundary = currentBoundary(input);
  if (!input.anchorMessageId && !input.anchor_message_id) throw new Error("/branch 必须绑定锚点消息");
  if (!input.conversationChecksum && !input.conversation_checksum) throw new Error("/branch 必须提交会话 checksum");
  if (input.revision === undefined || input.generation === undefined) throw new Error("/branch 必须提交 revision 与 generation");
  assertExpected(boundary, input);
  const index = anchorIndex(boundary.messages, input.anchorMessageId || input.anchor_message_id);
  const messages = cloneVisibleMessages(boundary.messages.slice(0, index + 1));
  const title = String(input.title || `${boundary.title} · 分支`).trim().slice(0, 80);
  let created: any;
  if (boundary.id.scope === "global") {
    created = withFileLock(GLOBAL_HISTORY_FILE, () => {
      const store: any = loadGlobalStore();
      const sessionId = `session_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const session = { id: sessionId, name: title, titleOrigin: "manual", source: "web", createdAt: now(), updatedAt: now(), messages };
      store.sessions = [session, ...(store.sessions || [])];
      store.current_session_id = sessionId;
      writeGlobalStore(store);
      return { sessionId, session };
    });
  } else if (boundary.id.scope === "project") {
    created = writeProjectSessionConversationBranch(boundary.id.scopeId, title, messages);
  } else {
    const session = createGroupChatSession(boundary.id.scopeId, title);
    saveGroupMessages(boundary.id.scopeId, messages.map(message => ({ ...message, group_session_id: session.id })), session.id);
    selectGroupChatSession(boundary.id.scopeId, session.id);
    created = { sessionId: session.id, session };
  }
  const createdSessionId = String(created.sessionId || created.session?.id || "");
  const createdIdentity = identity({ scope: boundary.id.scope, scopeId: boundary.id.scopeId, exactSessionId: createdSessionId });
  persistSessionState(createdIdentity, { generation: 0, branchedFrom: boundary.id.sessionId, anchorMessageId: messageId(boundary.messages[index], index) });
  return {
    schema: "ccm-conversation-branch-receipt-v1",
    success: true,
    scope: boundary.id.scope,
    scopeId: boundary.id.scopeId,
    sourceSessionId: boundary.id.sessionId,
    sessionId: createdSessionId,
    anchorMessageId: messageId(boundary.messages[index], index),
    copiedMessages: messages.length,
    generation: 0,
    contentStored: false,
  };
}

function rewindMode(value: any) {
  const mode = String(value || "both").toLowerCase();
  if (!["both", "code", "conversation"].includes(mode)) throw new Error("回退模式只支持 both、code、conversation");
  return mode as "both" | "code" | "conversation";
}

function turnStart(messages: any[], anchor: number) {
  let userIndex = anchor;
  while (userIndex >= 0 && String(messages[userIndex]?.role || "") !== "user") userIndex--;
  if (userIndex < 0) throw new Error("没有找到这轮回答对应的用户消息");
  return { userIndex, keepCount: userIndex, originalPrompt: String(messages[userIndex]?.content || messages[userIndex]?.text || "").slice(0, 80_000) };
}

function collectExecutionIdentities(messages: any[]) {
  const taskIds = new Set<string>();
  const executionIds = new Set<string>();
  const globalRunIds = new Set<string>();
  const visit = (value: any, depth = 0) => {
    if (!value || depth > 5) return;
    if (Array.isArray(value)) { for (const item of value.slice(0, 200)) visit(item, depth + 1); return; }
    if (typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) {
      if (["task_id", "taskId", "source_task_id", "root_task_id", "retry_of_task_id"].includes(key) && typeof item === "string" && item.trim()) taskIds.add(item.trim());
      if (["execution_id", "executionId"].includes(key) && typeof item === "string" && item.trim()) executionIds.add(item.trim());
      if (["global_run_id", "globalRunId", "run_id", "runId"].includes(key) && typeof item === "string" && item.trim()) globalRunIds.add(item.trim());
      if (typeof item === "object") visit(item, depth + 1);
    }
  };
  visit(messages);
  return { taskIds: Array.from(taskIds), executionIds: Array.from(executionIds), globalRunIds: Array.from(globalRunIds) };
}

function latestRecoveryManifests(identities: { taskIds: string[]; executionIds: string[] }) {
  const seen = new Set<string>();
  return listExecutionRecoveryManifests(identities).filter((item: any) => {
    const key = String(item.executionId || item.taskId || item.checkpointId);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rewindPreview(input: any) {
  const boundary = currentBoundary(input);
  assertExpected(boundary, input);
  const mode = rewindMode(input.mode);
  const index = anchorIndex(boundary.messages, input.anchorMessageId || input.anchor_message_id);
  const anchorMessageId = messageId(boundary.messages[index], index);
  const turn = turnStart(boundary.messages, index);
  const affectedMessages = boundary.messages.slice(turn.userIndex);
  const identities = collectExecutionIdentities(affectedMessages);
  const manifests = latestRecoveryManifests(identities);
  const codePreviews = mode === "conversation" ? [] : manifests.map((manifest: any) => previewExecutionRecovery(manifest.checkpointId));
  const codeConflicts = codePreviews.flatMap((item: any) => item.conflicts || []);
  const unavailableCode = codePreviews.filter((item: any) => item.available === false);
  const plan = {
    scope: boundary.id.scope,
    scopeId: boundary.id.scopeId,
    exactSessionId: boundary.id.sessionId,
    anchorMessageId,
    mode,
    keepMessages: turn.keepCount,
    removeMessages: boundary.messages.length - turn.keepCount,
    generation: boundary.generation,
    revision: boundary.revision,
    conversationChecksum: boundary.conversationChecksum,
    taskIds: identities.taskIds,
    executionIds: identities.executionIds,
    globalRunIds: identities.globalRunIds,
    code: codePreviews.map((item: any) => ({ checkpointId: item.checkpointId, previewToken: item.previewToken || "", currentHead: item.currentHead || "", available: item.available !== false })),
  };
  return {
    schema: "ccm-conversation-rewind-preview-v2",
    success: true,
    ...plan,
    planChecksum: checksum(plan),
    codeRestoreAvailable: codePreviews.some((item: any) => item.available !== false && (item.files || []).length > 0),
    codePreviews,
    conflicts: codeConflicts,
    canExecute: codeConflicts.length === 0 && unavailableCode.length === 0,
    originalPrompt: turn.originalPrompt,
    warnings: mode !== "conversation" && !codePreviews.length ? ["本轮没有检测到可恢复的代码交付"] : [],
    contentStored: false,
  };
}

async function waitForTaskStop(taskIds: string[], globalRunIds: string[] = [], boundary?: any) {
  const activeTaskIds = taskIds.filter(taskId => listActiveAgentRuns({ taskId }).length > 0);
  for (const taskId of activeTaskIds) requestTaskCancellation(taskId, "用户请求回退本轮，安全停止当前执行", "conversation-rewind");
  const activeGlobalRunIds = globalRunIds.filter(runId => {
    try { return !["completed", "failed", "cancelled"].includes(String(getGlobalAgentRun(runId)?.status || "")); } catch { return false; }
  });
  for (const runId of activeGlobalRunIds) try { cancelGlobalAgentRun(runId); } catch {}
  if (!activeTaskIds.length && !activeGlobalRunIds.length && boundary?.id?.scope !== "project") return;
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    const taskRunning = activeTaskIds.some(taskId => listActiveAgentRuns({ taskId }).length > 0);
    const globalRunning = activeGlobalRunIds.some(runId => {
      try { return !["completed", "failed", "cancelled"].includes(String(getGlobalAgentRun(runId)?.status || "")); } catch { return false; }
    });
    const projectDispatchRunning = boundary?.id?.scope === "project"
      ? isProjectSessionAgentDispatchActive(boundary.id.scopeId, boundary.id.sessionId)
      : false;
    if (!taskRunning && !globalRunning && !projectDispatchRunning) return;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error("仍有Agent进程未安全停止，暂不能回退");
}

function replaceConversation(boundary: any, messages: any[], reason: string) {
  let generation = boundary.generation + 1;
  if (boundary.id.scope === "global") {
    withFileLock(GLOBAL_HISTORY_FILE, () => {
      const store: any = loadGlobalStore();
      const session = (store.sessions || []).find((item: any) => String(item.id) === boundary.id.sessionId);
      if (!session || checksum(session.messages || []) !== boundary.conversationChecksum) throw new Error("全局会话已漂移，请重新预览");
      session.messages = messages;
      session.updatedAt = now();
      writeGlobalStore(store);
    });
    try { invalidateProviderNeutralContextCacheState({ scope: "global", scopeId: "global", sessionId: boundary.id.sessionId }, reason); } catch {}
  } else if (boundary.id.scope === "project") {
    const result = replaceProjectSessionConversation(boundary.id.scopeId, boundary.id.sessionId, messages, reason);
    generation = Number(result.generation || generation);
  } else {
    requestGroupSessionAgentCancellation({ groupId: boundary.id.scopeId, groupSessionId: boundary.id.sessionId, reason, actor: "conversation-rewind" });
    saveGroupMessages(boundary.id.scopeId, messages, boundary.id.sessionId);
    generation = Number(rotateGroupSessionLifecycleHead({ groupId: boundary.id.scopeId, groupSessionId: boundary.id.sessionId, reason }).head?.generation || generation);
  }
  return generation;
}

async function rewindApply(input: any) {
  const preview = rewindPreview(input);
  if (!input.planChecksum || String(input.planChecksum) !== preview.planChecksum) throw new Error("回退计划 checksum 不匹配，请重新预览");
  if (!preview.canExecute) throw new Error("存在文件冲突或不可用检查点，请处理后重新预览");
  const boundary = currentBoundary(input);
  assertExpected(boundary, preview);
  if (preview.taskIds.length || preview.globalRunIds.length || boundary.id.scope === "project") await waitForTaskStop(preview.taskIds, preview.globalRunIds, boundary);
  const codeReceipts: any[] = [];
  if (preview.mode !== "conversation") {
    try {
      for (const item of preview.codePreviews || []) {
        if (item.available === false || !(item.files || []).length) continue;
        codeReceipts.push(applyExecutionRecovery(item.checkpointId, {
          previewToken: item.previewToken,
          reason: "用户从会话回退本轮代码",
        }));
      }
    } catch (error: any) {
      const compensationFailures: string[] = [];
      for (const receipt of [...codeReceipts].reverse()) {
        if (!receipt?.recoveryCommit) continue;
        try { compensateExecutionRecovery(receipt.checkpointId, receipt.recoveryCommit); }
        catch (compensationError: any) { compensationFailures.push(`${receipt.checkpointId}: ${compensationError?.message || compensationError}`); }
      }
      if (compensationFailures.length) throw new Error(`多项目恢复未全部成功，且部分补偿需要人工处理：${compensationFailures.join("；")}`);
      throw new Error(`多项目恢复未全部成功，已自动补偿先前项目：${error?.message || error}`);
    }
  }
  let snapshotId = "";
  let generation = boundary.generation + (preview.taskIds.length ? 1 : 0);
  let revision = boundary.revision;
  if (preview.mode !== "code") {
    const kept = boundary.messages.slice(0, preview.keepMessages);
    fs.mkdirSync(REWIND_DIR, { recursive: true });
    snapshotId = `rewind_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
    const rewoundChecksum = checksum(kept);
    writeJsonAtomic(path.join(REWIND_DIR, `${snapshotId}.json`), {
      schema: "ccm-conversation-history-branch-v1",
      snapshotId,
      scope: boundary.id.scope,
      scopeId: boundary.id.scopeId,
      exactSessionId: boundary.id.sessionId,
      anchorMessageId: preview.anchorMessageId,
      createdAt: now(),
      originalConversationChecksum: boundary.conversationChecksum,
      rewoundConversationChecksum: rewoundChecksum,
      originalPrompt: preview.originalPrompt,
      originalMessages: boundary.messages,
      removedMessages: boundary.messages.slice(preview.keepMessages),
      status: "available",
    });
    generation = replaceConversation(boundary, kept, "用户回退到本轮开始前");
    const state = persistSessionState(boundary.id, { generation, lastRewindSnapshotId: snapshotId, anchorMessageId: preview.anchorMessageId });
    revision = state.revision;
  } else {
    if (boundary.id.scope === "project") generation = Number(rotateProjectSessionAgentBinding(boundary.id.scopeId, boundary.id.sessionId, "用户仅回退本轮代码").nextGeneration || generation);
    else if (boundary.id.scope === "group") generation = Number(rotateGroupSessionLifecycleHead({ groupId: boundary.id.scopeId, groupSessionId: boundary.id.sessionId, reason: "用户仅回退本轮代码" }).head?.generation || generation);
    else generation = boundary.generation + 1;
    const state = persistSessionState(boundary.id, { generation, lastCodeRewindAt: now(), anchorMessageId: preview.anchorMessageId });
    revision = state.revision;
  }
  return {
    schema: "ccm-conversation-rewind-receipt-v2",
    success: true,
    snapshotId,
    scope: boundary.id.scope,
    scopeId: boundary.id.scopeId,
    exactSessionId: boundary.id.sessionId,
    mode: preview.mode,
    keptMessages: preview.mode === "code" ? boundary.messages.length : preview.keepMessages,
    removedMessages: preview.mode === "code" ? 0 : preview.removeMessages,
    codeRecoveries: codeReceipts,
    originalPrompt: preview.originalPrompt,
    generation,
    revision,
    contentStored: false,
  };
}

function listHistoryBranches(input: any) {
  const boundary = currentBoundary(input);
  const id = boundary.id;
  fs.mkdirSync(REWIND_DIR, { recursive: true });
  const branches = fs.readdirSync(REWIND_DIR).filter(name => name.endsWith(".json"))
    .map(name => readJsonWithBackup(path.join(REWIND_DIR, name), null)).filter(Boolean)
    .filter((item: any) => item.scope === id.scope && item.scopeId === id.scopeId && item.exactSessionId === id.sessionId)
    .sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .map((item: any) => ({ snapshotId: item.snapshotId, kind: item.kind || "rewind", action: item.action || "", createdAt: item.createdAt, anchorMessageId: item.anchorMessageId || "", removedMessages: Array.isArray(item.removedMessages) ? item.removedMessages.length : 0, originalMessages: Array.isArray(item.originalMessages) ? item.originalMessages.length : 0, status: item.status || "available", contentStored: false }));
  return { schema: "ccm-conversation-history-branches-v1", scope: id.scope, scopeId: id.scopeId, exactSessionId: id.sessionId, revision: boundary.revision, generation: boundary.generation, conversationChecksum: boundary.conversationChecksum, branches, contentStored: false };
}

function summarizeAction(value: any) {
  const action = String(value || "").trim();
  if (!new Set(["summarize_from", "summarize_up_to"]).has(action)) throw new Error("未知的会话总结范围");
  return action as "summarize_from" | "summarize_up_to";
}

function assertConversationIdleForSummary(boundary: any) {
  const activeRuns = listActiveAgentRuns();
  const projectBusy = boundary.id.scope === "project" && isProjectSessionAgentDispatchActive(boundary.id.scopeId, boundary.id.sessionId);
  const globalBusy = boundary.id.scope === "global" && listGlobalAgentRuns({ sessionId: boundary.id.sessionId, limit: 20 })
    .some((run: any) => ["running", "supervising", "paused", "waiting_confirmation", "waiting_clarification"].includes(String(run?.status || "")));
  const affected = collectExecutionIdentities(boundary.messages);
  const taskBusy = activeRuns.some((run: any) => affected.taskIds.includes(String(run.taskId || "")));
  if (projectBusy || globalBusy || taskBusy) {
    const error: any = new Error("当前任务仍在运行，请先等待完成、停止任务或使用“调整方向”后再总结会话");
    error.statusCode = 409;
    error.code = "CONVERSATION_SUMMARY_TASK_ACTIVE";
    throw error;
  }
}

function summarizePreview(input: any) {
  const boundary = currentBoundary(input);
  assertExpected(boundary, input);
  assertConversationIdleForSummary(boundary);
  const action = summarizeAction(input.action);
  const index = anchorIndex(boundary.messages, input.anchorMessageId || input.anchor_message_id);
  const start = action === "summarize_from" ? turnStart(boundary.messages, index).userIndex : 0;
  const end = action === "summarize_from" ? boundary.messages.length - 1 : index;
  const count = Math.max(0, end - start + 1);
  if (count < 2) throw new Error("所选范围不足以形成可靠的会话总结");
  const plan = {
    action,
    scope: boundary.id.scope,
    scopeId: boundary.id.scopeId,
    exactSessionId: boundary.id.sessionId,
    anchorMessageId: messageId(boundary.messages[index], index),
    start,
    end,
    count,
    revision: boundary.revision,
    generation: boundary.generation,
    conversationChecksum: boundary.conversationChecksum,
  };
  return {
    schema: "ccm-conversation-summary-preview-v1",
    ...plan,
    previewToken: checksum({ ...plan, purpose: "conversation-summary" }),
    originalPrompt: action === "summarize_from" ? turnStart(boundary.messages, index).originalPrompt : "",
    contentStored: false,
  };
}

function summarySourceText(messages: any[]) {
  const visible = cloneVisibleMessages(messages);
  let remaining = 100_000;
  return visible.map((message: any) => {
    const content = String(message.content || "").slice(0, Math.min(remaining, 12_000));
    remaining -= content.length;
    return `${message.role === "user" ? "用户" : "Agent"}：${content}`;
  }).filter(() => remaining >= 0).join("\n\n");
}

function assertSafeConversationSummary(value: string) {
  const text = String(value || "").trim();
  if (!text) throw new Error("模型没有生成可用的会话摘要，未修改当前上下文");
  if (/```|<\/?(?:thinking|reasoning)>|(?:api[_-]?key|password|secret|token)\s*[:=]\s*\S+|\b(?:sk-[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._-]{16,})/i.test(text)) {
    throw new Error("会话摘要包含不适合持久化的技术或敏感内容，未修改当前上下文");
  }
  return text;
}

async function summarizeExecute(input: any) {
  const preview = summarizePreview(input);
  if (!input.previewToken || String(input.previewToken) !== preview.previewToken) throw new Error("总结预览已失效，请重新预览");
  const boundary = currentBoundary(input);
  assertExpected(boundary, preview);
  const selected = boundary.messages.slice(preview.start, preview.end + 1);
  const transcript = summarySourceText(selected);
  if (!transcript.trim()) throw new Error("所选范围没有可总结的用户对话");
  const summary = assertSafeConversationSummary(String(await callGlobalModelWithRetry(loadOrchestratorConfig(), [{
    role: "system",
    content: "你是CCM会话压缩器。用中文生成结构化事实摘要，必须保留：用户纠正、权限边界、已作决策、未完成事项、任务身份、文件引用、验证结果和明确风险。禁止补造事实、隐藏推理、源码正文、密钥、原始命令或原始输出。只输出摘要正文。",
  }, {
    role: "user",
    content: `请总结以下会话片段，供后续模型继续工作：\n\n${transcript}`,
  }], { retryProfile: "interactive_first_turn" })).trim().slice(0, 24_000));
  if (summary.length < 20) throw new Error("模型没有生成可用的会话摘要，未修改当前上下文");
  const snapshotId = `summary_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
  fs.mkdirSync(REWIND_DIR, { recursive: true });
  writeJsonAtomic(path.join(REWIND_DIR, `${snapshotId}.json`), {
    schema: "ccm-conversation-history-branch-v1",
    snapshotId,
    kind: "summary",
    scope: boundary.id.scope,
    scopeId: boundary.id.scopeId,
    exactSessionId: boundary.id.sessionId,
    anchorMessageId: preview.anchorMessageId,
    action: preview.action,
    createdAt: now(),
    originalConversationChecksum: boundary.conversationChecksum,
    originalMessages: boundary.messages,
    status: "available",
  });
  const boundaryMessage = {
    id: `summary_boundary_${crypto.randomUUID()}`,
    role: "assistant",
    type: "conversation_summary_boundary",
    content: `已总结 ${preview.count} 条消息\n\n${summary}`,
    summary,
    summarizedMessageCount: preview.count,
    summaryAction: preview.action,
    sourceSnapshotId: snapshotId,
    timestamp: now(),
  };
  const messages = preview.action === "summarize_from"
    ? [...boundary.messages.slice(0, preview.start), boundaryMessage]
    : [boundaryMessage, ...boundary.messages.slice(preview.end + 1)];
  const generation = replaceConversation(boundary, messages, preview.action === "summarize_from" ? "从所选消息开始总结" : "总结到所选消息");
  const state = persistSessionState(boundary.id, { generation, lastSummarySnapshotId: snapshotId, contextBoundaryAt: now() });
  return {
    schema: "ccm-conversation-summary-receipt-v1",
    success: true,
    action: preview.action,
    summarizedMessages: preview.count,
    snapshotId,
    generation,
    revision: state.revision,
    originalPrompt: preview.originalPrompt,
    contentStored: false,
  };
}

function restoreHistoryBranch(input: any, snapshotId: string) {
  const boundary = currentBoundary(input);
  assertExpected(boundary, input);
  const file = path.join(REWIND_DIR, `${safeId(snapshotId, "历史分支 ID")}.json`);
  const branch: any = readJsonWithBackup(file, null);
  if (!branch || branch.scope !== boundary.id.scope || branch.scopeId !== boundary.id.scopeId || branch.exactSessionId !== boundary.id.sessionId) throw new Error("历史分支不存在或无权访问");
  if (!Array.isArray(branch.originalMessages)) throw new Error("该历史快照不支持恢复");
  const generation = replaceConversation(boundary, branch.originalMessages, "用户恢复会话历史分支");
  branch.status = "restored";
  branch.restoredAt = now();
  writeJsonAtomic(file, branch);
  const state = persistSessionState(boundary.id, { generation, restoredHistoryBranchId: snapshotId });
  return { schema: "ccm-conversation-history-branch-restore-v1", success: true, snapshotId, generation, revision: state.revision, restoredMessages: branch.originalMessages.length, contentStored: false };
}

function safeProjection(value: any, depth = 0): any {
  if (depth > 5) return "[truncated]";
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.replace(/\b(?:Bearer\s+)?(?:sk-)?[A-Za-z0-9_-]{24,}\b/g, "[redacted]").slice(0, 1200);
  if (Array.isArray(value)) return value.slice(0, 80).map(item => safeProjection(item, depth + 1));
  if (typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !BLOCKED_DETAIL_KEY.test(key)).slice(0, 100).map(([key, item]) => [key, safeProjection(item, depth + 1)]));
  return String(value).slice(0, 200);
}

function persistLocalCommandRecord(input: any) {
  const id = identity(input);
  const command = safeId(input.command, "命令名称");
  const summary = String(input.summary || "命令已执行").trim().slice(0, 1200);
  const record = {
    schema: "ccm-local-command-record-v1",
    id: `lcr_${crypto.randomUUID()}`,
    scope: id.scope,
    scopeId: id.scopeId,
    exactSessionId: id.sessionId,
    command,
    invocationChecksum: String(input.invocationChecksum || input.invocation_checksum || checksum({ command, args: input.args || "" })),
    status: ["failed", "cancelled"].includes(String(input.status)) ? String(input.status) : "success",
    summary,
    safeDetails: safeProjection(input.safeDetails || input.result || {}),
    modelVisible: false,
    contentStored: false,
    createdAt: now(),
  };
  const message = { id: record.id, role: "assistant", type: "command_result", content: summary, commandResult: safeProjection(input.result || { command, summary, headline: summary }), localCommandRecord: record, modelVisible: false, timestamp: record.createdAt };
  if (id.scope === "global") {
    withFileLock(GLOBAL_HISTORY_FILE, () => {
      const store: any = loadGlobalStore();
      const session = (store.sessions || []).find((item: any) => String(item.id) === id.sessionId);
      if (!session) throw new Error("全局会话不存在");
      session.messages = [...(session.messages || []), message];
      session.updatedAt = now();
      writeGlobalStore(store);
    });
  } else if (id.scope === "project") {
    appendProjectSessionLocalCommandRecord(id.scopeId, id.sessionId, message);
  } else {
    saveGroupMessages(id.scopeId, [...getGroupMessages(id.scopeId, id.sessionId), { ...message, group_session_id: id.sessionId }], id.sessionId);
  }
  mutateState(state => { state.records.push(record); return record; });
  return record;
}

function readSessionState(input: any) {
  const id = identity(input);
  const state: any = readState();
  const stored = state.sessions?.[id.key] || { revision: 0, generation: 0 };
  const generation = id.scope === "project"
    ? Number(getProjectSessionAgentBinding(id.scopeId, id.sessionId)?.generation || 0)
    : id.scope === "group"
      ? Number(readGroupSessionLifecycleHead(id.scopeId, id.sessionId)?.generation || 0)
      : Number(stored.generation || 0);
  return { id, state: { ...stored, generation } };
}

function publicPlanMode(id: ReturnType<typeof identity>, state: any) {
  if (!conversationPlanModeSupported(id.scope)) return { enabled: false };
  return state.planMode && typeof state.planMode === "object" ? state.planMode : { enabled: false };
}

function updatePlanMode(input: any) {
  const { id, state } = readSessionState(input);
  if (input.revision === undefined || input.generation === undefined) throw new Error("Plan Mode 更新必须绑定 revision 与 generation");
  if (Number(input.generation) !== Number(state.generation || 0)) throw new Error("会话 generation 已漂移，请重新读取");
  const action = String(input.action || (input.enabled === false ? "exit" : "open")).toLowerCase();
  const enabled = !["exit", "off", "disable"].includes(action);
  if (!conversationPlanModeSupported(id.scope)) {
    if (enabled) throw new Error(GLOBAL_CONVERSATION_PLAN_MODE_UNSUPPORTED);
    const planMode = { enabled: false, planId: String(state.planMode?.planId || ""), description: String(state.planMode?.description || ""), exitedAt: now(), updatedAt: now() };
    const next = persistSessionState(id, { planMode, generation: Number(state.generation || 0) }, { revision: Number(input.revision) });
    return { schema: "ccm-conversation-plan-mode-v1", scope: id.scope, scopeId: id.scopeId, exactSessionId: id.sessionId, generation: Number(next.generation || 0), revision: Number(next.revision || 0), ...planMode };
  }
  const planMode = enabled ? {
    enabled: true,
    planId: String(state.planMode?.planId || `plan_${crypto.randomUUID()}`),
    description: String(input.description || input.goal || state.planMode?.description || "").slice(0, 4000),
    enteredAt: state.planMode?.enteredAt || now(),
    updatedAt: now(),
  } : { enabled: false, planId: String(state.planMode?.planId || ""), description: String(state.planMode?.description || ""), exitedAt: now(), updatedAt: now() };
  const next = persistSessionState(id, { planMode, generation: Number(state.generation || 0) }, { revision: Number(input.revision) });
  return { schema: "ccm-conversation-plan-mode-v1", scope: id.scope, scopeId: id.scopeId, exactSessionId: id.sessionId, generation: Number(next.generation || 0), revision: Number(next.revision || 0), ...planMode };
}

function updatePreferences(input: any) {
  const { id, state } = readSessionState(input);
  if (input.revision === undefined || input.generation === undefined) throw new Error("会话偏好更新必须绑定 revision 与 generation");
  if (Number(input.generation) !== Number(state.generation || 0)) throw new Error("会话 generation 已漂移，请重新读取");
  const previous = state.preferences || {};
  const patch: any = {};
  if (input.model !== undefined) patch.model = String(input.model || "").slice(0, 200);
  if (input.effort !== undefined) {
    const effort = String(input.effort || "").toLowerCase();
    if (!["low", "medium", "high"].includes(effort)) throw new Error("effort 只支持 low、medium、high");
    patch.effort = effort;
  }
  if (input.fast !== undefined) {
    if (input.fast === true) throw new Error("当前 Provider 适配器尚未声明可核验的 Fast Mode 能力，本会话不会伪装为已启用");
    patch.fast = false;
  }
  if (input.outputStyle !== undefined || input.output_style !== undefined) {
    const outputStyle = String(input.outputStyle || input.output_style || "").toLowerCase();
    if (!["concise", "balanced", "detailed"].includes(outputStyle)) throw new Error("output-style 只支持 concise、balanced、detailed");
    patch.outputStyle = outputStyle;
  }
  const next = persistSessionState(id, { preferences: { ...previous, ...patch }, generation: Number(state.generation || 0) }, { revision: Number(input.revision) });
  return { schema: "ccm-conversation-preferences-v1", scope: id.scope, scopeId: id.scopeId, exactSessionId: id.sessionId, preferences: next.preferences || {}, generation: Number(next.generation || 0), revision: Number(next.revision || 0) };
}

function asideModelMessages(input: any) {
  const boundary = currentBoundary(input);
  const question = String(input.question || input.message || "").trim();
  if (!question) throw new Error("请输入临时问题");
  if (question.length > 4_000) throw new Error("临时问题最多4000个字符");
  const visible = cloneVisibleMessages(boundary.messages).slice(-40);
  let remaining = 48_000;
  const context: any[] = [];
  for (const message of visible.reverse()) {
    if (remaining <= 0) break;
    const content = String(message.content || "").slice(-Math.min(remaining, 8_000));
    remaining -= content.length;
    context.unshift({ role: message.role, content });
  }
  return {
    boundary,
    question,
    messages: [{
      role: "system",
      content: "你正在回答CCM会话中的临时问题。只能依据给定的提问时会话快照回答；不得调用工具、创建任务、修改计划、承诺执行操作或输出隐藏推理。回答简洁直接；上下文不足时明确说明。",
    }, ...context, {
      role: "user",
      content: `临时问题（不写入正式会话，也不影响当前任务）：${question}`,
    }],
  };
}

async function runAside(input: any, options: { onDelta?: (delta: string) => void; signal?: AbortSignal } = {}) {
  const prepared = asideModelMessages(input);
  if (activeAsideRequests.has(prepared.boundary.id.key)) throw new Error("当前会话已有一个临时提问正在回答");
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  activeAsideRequests.set(prepared.boundary.id.key, controller);
  const startedAt = Date.now();
  let usage: any = null;
  let answer = "";
  try {
    answer = await callGlobalModelWithRetry(loadOrchestratorConfig(), prepared.messages, {
      retryProfile: "interactive_first_turn",
      signal: controller.signal,
      onDelta: options.onDelta,
      onUsage: value => { usage = value; },
    });
    recordMetric(prepared.boundary.id.scope === "global" ? "global-agent" : `${prepared.boundary.id.scope}-main-agent`, {
      success: true,
      scopeType: prepared.boundary.id.scope,
      scopeId: prepared.boundary.id.scopeId,
      groupId: prepared.boundary.id.scope === "group" ? prepared.boundary.id.scopeId : "",
      role: prepared.boundary.id.scope === "global" ? "global_agent" : "main_agent",
      source: "ephemeral_side_question",
      runtime: "llm-api",
      durationMs: Date.now() - startedAt,
      usage,
    });
    return { schema: "ccm-conversation-aside-v1", answer, basedOnSnapshotAt: now(), contentStored: false };
  } catch (error: any) {
    recordMetric(prepared.boundary.id.scope === "global" ? "global-agent" : `${prepared.boundary.id.scope}-main-agent`, {
      success: false,
      scopeType: prepared.boundary.id.scope,
      scopeId: prepared.boundary.id.scopeId,
      groupId: prepared.boundary.id.scope === "group" ? prepared.boundary.id.scopeId : "",
      role: prepared.boundary.id.scope === "global" ? "global_agent" : "main_agent",
      source: "ephemeral_side_question",
      runtime: "llm-api",
      durationMs: Date.now() - startedAt,
      usage,
      error: error?.message || String(error),
    });
    throw error;
  } finally {
    options.signal?.removeEventListener("abort", abort);
    if (activeAsideRequests.get(prepared.boundary.id.key) === controller) activeAsideRequests.delete(prepared.boundary.id.key);
  }
}

export async function runConversationAside(input: any, options: { onDelta?: (delta: string) => void; signal?: AbortSignal } = {}) {
  return runAside(input, options);
}

function sseWrite(res: any, event: string, data: any) {
  if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function body(req: any) { return JSON.parse((await collectRequestBuffer(req)).toString("utf8") || "{}"); }

export function handleSlashCommandConversationApi(pathname: string, req: any, res: any, parsed: any): boolean {
  if (pathname === "/api/conversations/clarifications/active" && req.method === "GET") {
    try {
      assertApiResourceAccess(req, parsed.query || {}, "use");
      sendJson(res, { success: true, result: activePrePlanClarification(parsed.query || {}) });
    } catch (error: any) { sendJson(res, { success: false, error: error.message || String(error) }, error.statusCode || 400); }
    return true;
  }
  const clarificationAction = pathname.match(/^\/api\/conversations\/clarifications\/([^/]+)\/(answer|defaults|cancel)$/);
  if (clarificationAction && req.method === "POST") {
    void body(req).then(value => {
      assertApiResourceAccess(req, value, "use");
      const checked = validatePrePlanClarificationAction({ ...value, clarificationId: decodeURIComponent(clarificationAction[1]) });
      const action = clarificationAction[2];
      if (action === "cancel") updatePrePlanClarificationStatus(checked.boundary, checked.projection.id, "cancelled");
      return {
        schema: "ccm-pre-plan-clarification-action-receipt-v1",
        accepted: true,
        action,
        clarificationId: checked.projection.id,
        anchorMessageId: checked.anchorMessageId,
        nextStatus: action === "cancel" ? "cancelled" : "resolved",
        revision: Number(checked.projection.revision || 1),
        generation: Number(checked.projection.generation || 0),
        contentStored: false,
      };
    }).then(result => sendJson(res, { success: true, result })).catch((error: any) => sendJson(res, { success: false, error: error.message || String(error), code: error.code }, error.statusCode || 409));
    return true;
  }
  if (pathname === "/api/conversations/permission-mode" && req.method === "GET") {
    try {
      assertApiResourceAccess(req, parsed.query || {}, "use");
      const boundary = currentBoundary(parsed.query || {});
      let policy = readConversationPermissionPolicy(parsed.query || {});
      if (isAutomationConversation(boundary) && policy.revision === 0 && policy.source === "manual_default") {
        policy = updateConversationPermissionPolicy({ ...parsed.query, mode: "full_access", source: "automation_default", revision: 0, generation: boundary.generation });
      }
      sendJson(res, { success: true, result: { ...policy, generation: boundary.generation } });
    }
    catch (error: any) { sendJson(res, { success: false, error: error.message || String(error) }, error.statusCode || 400); }
    return true;
  }
  if (pathname === "/api/conversations/permission-mode" && req.method === "PATCH") {
    void body(req).then(async value => {
      assertApiResourceAccess(req, value, "use");
      const current = readConversationPermissionPolicy(value);
      const currentConversation = currentBoundary(value);
      if (value.generation === undefined || Number(value.generation) !== Number(currentConversation.generation)) {
        const error: any = new Error("会话 generation 已更新，请重新读取权限模式");
        error.statusCode = 409;
        throw error;
      }
      const rank: any = { ask_before_edit: 0, main_agent_only: 1, full_access: 2 };
      if (rank[String(value.mode)] < rank[current.mode]) {
        const boundary = currentConversation;
        const execution = collectExecutionIdentities(boundary.messages);
        const activeTaskIds = execution.taskIds.filter(taskId => listActiveAgentRuns({ taskId }).length > 0);
        if (activeTaskIds.length || (boundary.id.scope === "project" && isProjectSessionAgentDispatchActive(boundary.id.scopeId, boundary.id.sessionId))) {
          await waitForTaskStop(activeTaskIds, [], boundary);
        }
      }
      return updateConversationPermissionPolicy(value);
    })
      .then(result => sendJson(res, { success: true, result })).catch((error: any) => sendJson(res, { success: false, error: error.message || String(error), code: error.code }, error.statusCode || 400));
    return true;
  }
  if (pathname === "/api/conversations/summarize/preview" && req.method === "POST") {
    void body(req).then(value => { assertApiResourceAccess(req, value, "use"); return summarizePreview(value); })
      .then(result => sendJson(res, { success: true, result })).catch((error: any) => sendJson(res, { success: false, error: error.message || String(error), code: error.code }, error.statusCode || 400));
    return true;
  }
  if (pathname === "/api/conversations/summarize/execute" && req.method === "POST") {
    void body(req).then(value => { assertApiResourceAccess(req, value, "use"); return summarizeExecute(value); })
      .then(result => sendJson(res, { success: true, result })).catch((error: any) => sendJson(res, { success: false, error: error.message || String(error), code: error.code }, error.statusCode || 400));
    return true;
  }
  if (pathname === "/api/conversations/aside" && req.method === "POST") {
    void body(req).then(async value => {
      assertApiResourceAccess(req, value, "use");
      const stream = String(parsed?.query?.stream || value.stream || "") === "1";
      if (!stream) return sendJson(res, { success: true, result: await runAside(value) });
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "private, no-store",
        Connection: "keep-alive",
      });
      const controller = new AbortController();
      res.on("close", () => controller.abort());
      sseWrite(res, "start", { schema: "ccm-conversation-aside-v1", contentStored: false });
      try {
        const result = await runAside(value, { signal: controller.signal, onDelta: delta => sseWrite(res, "delta", { delta }) });
        sseWrite(res, "done", { basedOnSnapshotAt: result.basedOnSnapshotAt, contentStored: false });
      } catch (error: any) {
        sseWrite(res, "error", { error: error?.message || String(error) });
      }
      if (!res.writableEnded) res.end();
    }).catch((error: any) => sendJson(res, { success: false, error: error.message || String(error) }, 400));
    return true;
  }
  if (pathname === "/api/conversations/history-branches" && req.method === "GET") {
    try { assertApiResourceAccess(req, parsed.query || {}, "use"); sendJson(res, { success: true, result: listHistoryBranches(parsed.query || {}) }); }
    catch (error: any) { sendJson(res, { success: false, error: error.message || String(error) }, 400); }
    return true;
  }
  const restoreMatch = pathname.match(/^\/api\/conversations\/history-branches\/([^/]+)\/restore$/);
  if (restoreMatch && req.method === "POST") {
    void body(req).then(value => { assertApiResourceAccess(req, value, "use"); return sendJson(res, { success: true, result: restoreHistoryBranch(value, decodeURIComponent(restoreMatch[1])) }); }).catch((error: any) => sendJson(res, { success: false, error: error.message || String(error) }, error.statusCode || 409));
    return true;
  }
  if (pathname === "/api/conversations/plan-mode" && req.method === "GET") {
    try { assertApiResourceAccess(req, parsed.query || {}, "use"); const { id, state } = readSessionState(parsed.query || {}); sendJson(res, { success: true, scope: id.scope, scopeId: id.scopeId, exactSessionId: id.sessionId, generation: Number(state.generation || 0), revision: Number(state.revision || 0), planMode: publicPlanMode(id, state) }); }
    catch (error: any) { sendJson(res, { success: false, error: error.message }, 400); }
    return true;
  }
  if (pathname === "/api/conversations/preferences" && req.method === "GET") {
    try { const { id, state } = readSessionState(parsed.query || {}); sendJson(res, { success: true, scope: id.scope, scopeId: id.scopeId, exactSessionId: id.sessionId, generation: Number(state.generation || 0), revision: Number(state.revision || 0), preferences: state.preferences || {} }); }
    catch (error: any) { sendJson(res, { success: false, error: error.message }, 400); }
    return true;
  }
  const handlers: Record<string, (value: any) => any> = {
    "/api/conversations/branch": branchConversation,
    "/api/conversations/rewind/preview": rewindPreview,
    "/api/conversations/rewind/apply": rewindApply,
    "/api/conversations/rewind/execute": rewindApply,
    "/api/conversations/plan-mode": updatePlanMode,
    "/api/conversations/preferences": updatePreferences,
    "/api/slash-commands/records": persistLocalCommandRecord,
  };
  const handler = handlers[pathname];
  if (!handler || !["POST", "PATCH"].includes(String(req.method))) return false;
  void body(req).then(value => { assertApiResourceAccess(req, value, "use"); return Promise.resolve(handler(value)); }).then(result => sendJson(res, { success: true, result })).catch((error: any) => sendJson(res, { success: false, error: error.message || String(error) }, error.statusCode || 409));
  return true;
}

export function runSlashCommandConversationSelfTest() {
  const unsafe = safeProjection({ apiKey: "sentinel", count: 2, nested: { rawOutput: "secret", status: "ok" } });
  const checks = {
    stripsSecrets: unsafe.apiKey === undefined && unsafe.nested.rawOutput === undefined,
    keepsSafeFields: unsafe.count === 2 && unsafe.nested.status === "ok",
    visibleCloneDropsLocalCommands: cloneVisibleMessages([{ role: "assistant", content: "x", type: "command_result", modelVisible: false }]).length === 0,
    visibleCloneKeepsConversation: cloneVisibleMessages([{ id: "m1", role: "user", content: "hello" }])[0]?.content === "hello",
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
