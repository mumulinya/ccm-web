import * as crypto from "crypto";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import { listTaskPermissionRequests, requestTaskPermission } from "../collaboration/task-permission-broker";
import type { InternalMcpTaskContext } from "../../integrations/internal-mcp-runtime";

export type ConversationPermissionMode = "full_access" | "main_agent_only" | "ask_before_edit";
export type ConversationPermissionPolicy = {
  schema: "ccm-conversation-permission-policy-v1";
  scope: "global" | "project" | "group";
  scopeId: string;
  exactSessionId: string;
  mode: ConversationPermissionMode;
  source: "user" | "manual_default" | "automation_default";
  approvalScope: "task";
  revision: number;
  generation: number;
  updatedAt: string;
};

const STORE_FILE = path.join(CCM_DIR, "conversation-permission-policies.json");
const MODES = new Set<ConversationPermissionMode>(["full_access", "main_agent_only", "ask_before_edit"]);

function now() { return new Date().toISOString(); }
function cleanId(value: any, fallback = "") { return String(value || fallback).trim().slice(0, 180); }
function key(scope: string, scopeId: string, sessionId: string) { return `${scope}:${scopeId}:${sessionId}`; }
function readStore(): any {
  return readJsonWithBackup(STORE_FILE, { schema: "ccm-conversation-permission-policy-store-v1", revision: 0, policies: {} });
}
function identity(input: any) {
  const requestedScope = String(input?.scope);
  const scope: "global" | "project" | "group" = requestedScope === "project" ? "project" : requestedScope === "group" ? "group" : "global";
  const scopeId = scope === "global" ? "global" : cleanId(input?.scopeId || input?.scope_id || input?.project || input?.groupId || input?.group_id);
  const exactSessionId = cleanId(input?.exactSessionId || input?.exact_session_id || input?.sessionId || input?.session_id);
  if (!scopeId || !exactSessionId) throw new Error("权限模式缺少精确会话绑定");
  return { scope, scopeId, exactSessionId, key: key(scope, scopeId, exactSessionId) };
}

export function readConversationPermissionPolicy(input: any): ConversationPermissionPolicy {
  const id = identity(input);
  const saved = readStore().policies?.[id.key];
  if (saved) return saved;
  return {
    schema: "ccm-conversation-permission-policy-v1",
    scope: id.scope,
    scopeId: id.scopeId,
    exactSessionId: id.exactSessionId,
    mode: "ask_before_edit",
    source: "manual_default",
    approvalScope: "task",
    revision: 0,
    generation: Math.max(0, Number(input?.generation || 0)),
    updatedAt: now(),
  };
}

export function updateConversationPermissionPolicy(input: any): ConversationPermissionPolicy {
  const id = identity(input);
  const mode = String(input?.mode || "") as ConversationPermissionMode;
  if (!MODES.has(mode)) throw new Error("未知的会话权限模式");
  return withFileLock(STORE_FILE, () => {
    const store = readStore();
    store.policies = store.policies && typeof store.policies === "object" ? store.policies : {};
    const current = store.policies[id.key] || readConversationPermissionPolicy(id);
    if (input?.revision !== undefined && Number(input.revision) !== Number(current.revision || 0)) {
      const error: any = new Error("权限模式已被其他窗口修改，请重新读取");
      error.statusCode = 409;
      error.code = "PERMISSION_POLICY_REVISION_CONFLICT";
      throw error;
    }
    if (input?.generation !== undefined && Number(input.generation) < Number(current.generation || 0)) {
      const error: any = new Error("会话 generation 已更新，请重新读取");
      error.statusCode = 409;
      throw error;
    }
    const next: ConversationPermissionPolicy = {
      ...current,
      ...id,
      schema: "ccm-conversation-permission-policy-v1",
      mode,
      source: input?.source === "automation_default" ? "automation_default" : "user",
      approvalScope: "task",
      revision: Number(current.revision || 0) + 1,
      generation: Math.max(Number(current.generation || 0), Number(input?.generation || 0)),
      updatedAt: now(),
    };
    delete (next as any).key;
    store.policies[id.key] = next;
    store.revision = Number(store.revision || 0) + 1;
    store.updatedAt = now();
    writeJsonAtomic(STORE_FILE, store);
    return next;
  });
}

function automationTask(task: any) {
  const source = String(task?.automation_task_source || task?.request_origin || task?.source_channel || task?.workflow_meta?.intake?.source || "").toLowerCase();
  return !!(task?.cron_job_id || task?.cron_occurrence_id || task?.global_mission_id
    || task?.workflow_meta?.global_direct_dispatch || task?.workflow_meta?.project_mission
    || /(?:schedule|cron|workbench|global[_ -]?agent|automation|mission)/.test(source));
}

function taskConversationIdentity(task: any) {
  const globalSessionId = cleanId(task?.workflow_meta?.global_direct_dispatch?.session_id);
  if (globalSessionId) return { scope: "global", scopeId: "global", exactSessionId: globalSessionId };
  const groupId = cleanId(task?.group_id || task?.groupId);
  const groupSessionId = cleanId(task?.group_session_id || task?.groupSessionId);
  if (groupId && groupSessionId) return { scope: "group", scopeId: groupId, exactSessionId: groupSessionId };
  const project = cleanId(task?.target_project || task?.targetProject || task?.project);
  const projectSessionId = cleanId(task?.project_session_id || task?.projectSessionId || task?.exact_session_id || task?.exactSessionId);
  if (project && projectSessionId) return { scope: "project", scopeId: project, exactSessionId: projectSessionId };
  return null;
}

export function permissionSnapshotForTask(task: any) {
  const existing = task?.conversation_permission_snapshot || task?.conversationPermissionSnapshot;
  if (existing && MODES.has(existing.mode)) return existing;
  const id = taskConversationIdentity(task);
  if (automationTask(task)) return {
    schema: "ccm-conversation-permission-policy-v1",
    ...(id || { scope: "project", scopeId: cleanId(task?.target_project || task?.project, "task"), exactSessionId: cleanId(task?.id, "automation") }),
    mode: "full_access",
    source: "automation_default",
    approvalScope: "task",
    revision: 0,
    generation: Math.max(0, Number(task?.generation || 0)),
    updatedAt: now(),
  };
  return id ? readConversationPermissionPolicy(id) : {
    schema: "ccm-conversation-permission-policy-v1",
    scope: "project",
    scopeId: cleanId(task?.target_project || task?.project, "task"),
    exactSessionId: cleanId(task?.id, "manual"),
    mode: "ask_before_edit",
    source: "manual_default",
    approvalScope: "task",
    revision: 0,
    generation: Math.max(0, Number(task?.generation || 0)),
    updatedAt: now(),
  };
}

export async function authorizeProjectChildAgentStart(input: { task: any; project: string; workDir: string; agentType?: string }) {
  const snapshot = permissionSnapshotForTask(input.task);
  const approvalTaskKey = String(input.task?.task_thread_id || input.task?.taskThreadId || input.task?.root_task_id || input.task?.rootTaskId || input.task?.retry_of_task_id || input.task?.retryOfTaskId || input.task?.id || "");
  const approvedPaths = (Array.isArray(input.task?.allowed_paths || input.task?.allowedPaths) ? (input.task.allowed_paths || input.task.allowedPaths) : [input.workDir])
    .map((item: any) => String(item || "").trim()).filter(Boolean).sort();
  if (snapshot.mode === "full_access") return { allowed: true, mode: snapshot.mode, snapshot };
  const approved = listTaskPermissionRequests({ project: input.project })
    .find((item: any) => item.approvalScope === "task" && item.operation === "workspace_edit_session"
      && String(item.approvalTaskKey || item.taskId) === approvalTaskKey
      && item.state === "approved" && Number(item.permissionPolicyRevision || 0) === Number(snapshot.revision || 0)
      && (!item.expiresAt || Date.parse(item.expiresAt) > Date.now())
      && (item.approvedProjectIds || []).includes(input.project)
      && JSON.stringify([...(item.approvedPaths || [])].sort()) === JSON.stringify(approvedPaths));
  if (approved) return { allowed: true, mode: snapshot.mode, snapshot, editApprovalId: approved.id };
  const issuedAt = now();
  const context: InternalMcpTaskContext = {
    schema: "ccm-internal-mcp-context-v2",
    bindingKind: "task",
    taskId: String(input.task.id),
    groupId: cleanId(input.task.group_id || input.task.groupId),
    groupSessionId: cleanId(input.task.group_session_id || input.task.groupSessionId),
    project: input.project,
    projectSessionId: cleanId(input.task.project_session_id || input.task.projectSessionId),
    role: "project-child-agent",
    agentType: input.agentType,
    workDir: input.workDir,
    baseWorkDir: input.workDir,
    boundaryGeneration: Math.max(0, Number(input.task.generation || snapshot.generation || 0)),
    issuedAt,
    expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
  };
  const request: any = await requestTaskPermission(context, {
    operation: "workspace_edit_session",
    paths: approvedPaths,
    reason: `允许 ${input.project} 的第三方项目子 Agent 在当前任务内修改、返工并复验`,
    forceUserDecision: snapshot.mode === "ask_before_edit",
    forceMainAgentReview: snapshot.mode === "main_agent_only",
    decisionReason: snapshot.mode === "main_agent_only" ? "当前会话设置为“主 Agent 审核”" : "当前会话设置为“修改时询问我”",
    approvalScope: "task",
    permissionPolicyRevision: snapshot.revision,
    approvedProjectIds: [input.project],
    approvedPaths,
  });
  return {
    allowed: request.state === "approved",
    mode: snapshot.mode,
    snapshot,
    editApprovalId: request.state === "approved" ? request.id : "",
    permissionRequest: request,
    code: request.state === "rejected" ? "EDIT_PERMISSION_REJECTED" : "EDIT_PERMISSION_REQUIRED",
    message: request.state === "rejected"
      ? (snapshot.mode === "main_agent_only" ? "主 Agent 审核后未批准项目子 Agent 的修改权限。" : "代码修改授权已被拒绝。")
      : (snapshot.mode === "main_agent_only"
        ? "主 Agent 审核后认为这项权限需要你确认，批准后项目子 Agent会继续执行。"
        : "开始修改代码前需要你的确认，批准后当前任务及其返工、复验会继续使用这次授权。"),
  };
}

export function permissionPolicyChecksum(policy: ConversationPermissionPolicy) {
  return crypto.createHash("sha256").update(JSON.stringify(policy)).digest("hex");
}
