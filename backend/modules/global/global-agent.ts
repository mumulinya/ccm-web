import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { queryKnowledgeBase } from "../knowledge/rag";
import { execFileSync } from "child_process";
import {
  sendJson,
  collectRequestBuffer,
  getMultipartBoundary,
  parseMultipart,
  buildUploadedFilesContext,
  CCM_DIR
} from "../../core/utils";
import { loadOrchestratorConfig } from "../collaboration/group-orchestrator";
import { getConfigs, getConfigInfo, loadCronJobs, loadTasks, loadMcpTools, loadSkills, loadFeishuConfig } from "../../core/db";
import {
  loadGroups,
  createGlobalDevelopmentMission,
  controlGlobalDevelopmentMission,
  getGlobalDevelopmentMission,
  refreshGlobalDevelopmentMissions,
  superviseGlobalDevelopmentMissionCycle,
  sendFeishuReportMessage,
  type CollabCtx,
} from "../collaboration/collaboration";
import {
  acquireIdempotency,
  appendTraceEvent,
  completeIdempotency,
  ensureTraceId,
  failIdempotency,
  getIdempotencyRecord,
  settleIdempotencyByTrace,
} from "../../system/reliability-ledger";
import { buildProjectMemoryPacket } from "../../projects/memory";
import {
  cancelGlobalAgentRun,
  attachGlobalAgentRunSupervision,
  completeGlobalAgentSupervision,
  continueGlobalAgentRunWithClarification,
  updateGlobalAgentSupervisionState,
  findClarifyingGlobalAgentRun,
  findWaitingGlobalAgentRun,
  getGlobalAgentRun,
  GLOBAL_AGENT_TOOL_SPECS,
  listGlobalAgentRuns,
  pauseGlobalAgentRun,
  recoverInterruptedGlobalAgentRuns,
  resumeGlobalAgentRun,
  runGlobalAgentLoopSelfTest,
  startGlobalAgentRun,
  type GlobalAgentDecision,
  type GlobalAgentLoopRuntime,
  type GlobalAgentRun,
} from "../../agents/global/loop";
import {
  checkGlobalMissionSupervisorNow,
  controlGlobalMissionSupervisor,
  formatGlobalMissionFinalReport,
  getGlobalMissionSupervisor,
  getGlobalMissionSupervisorSchedulerStatus,
  listGlobalMissionSupervisors,
  runGlobalMissionSupervisorSelfTest,
  runGlobalMissionSupervisorAsyncSelfTest,
  startGlobalMissionSupervisor,
  startGlobalMissionSupervisorScheduler,
  stopGlobalMissionSupervisorScheduler,
  type GlobalMissionSupervisorRuntime,
} from "../../agents/global/mission-supervisor";
import {
  buildGlobalAgentMemoryPacket,
  compactGlobalAgentSession,
  getGlobalAgentMemoryPolicy,
  ingestGlobalAgentConversation,
  loadGlobalAgentMemory,
  recallGlobalAgentMemory,
  rebuildGlobalAgentMemory,
  recordGlobalMissionMemory,
  setGlobalAgentMemoryPolicy,
} from "../../agents/global/memory";
import { buildAgentQualitySnapshot, getAgentQualityPolicy, runAgentQualityCenterSelfTest, setAgentQualityPolicy } from "../../agents/quality-center";
import { listTaskAgentSessions } from "../../tasks/agent-sessions";
import { runAgentReasoningLoopSelfTest } from "../../agents/reasoning-loop";
import { buildTraceReplaySuite, replayAgentTrace, runAgentRuntimeKernelSelfTest } from "../../agents/runtime-kernel";
import {
  buildGlobalAgentSessionDebug,
  buildGlobalAgentToolDefinitions,
  deleteGlobalAgentHook,
  deleteGlobalAgentPermissionRule,
  getGlobalAgentBackgroundOutput,
  loadGlobalAgentHooks,
  loadGlobalAgentPermissionRules,
  runGlobalAgentRuntimeSelfTest,
  saveGlobalAgentHook,
  saveGlobalAgentPermissionRule,
} from "../../agents/global/runtime";
import {
  buildGlobalControlCenterSnapshot,
  buildGlobalDispatchStrategy,
  buildGlobalSystemHealth,
  classifyGlobalControlIntent,
  runGlobalControlCenterSelfTest,
} from "../../agents/global/control-center";


type LocalIntentResult = {
  reply: string;
  action: any;
};

const GLOBAL_AGENT_HISTORY_FILE = path.join(CCM_DIR, "global-agent-history.json");
const GLOBAL_AGENT_BRIDGE_FILE = path.join(CCM_DIR, "global-agent-bridge.json");
const GLOBAL_AGENT_HISTORY_LIMIT = 80;
const GLOBAL_AGENT_SESSION_LIMIT = 30;
const GLOBAL_PET_AGENT_NAME = "global-agent";

function compactPetText(value: any, max = 260) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function getGlobalPetToolState(toolName: string) {
  const name = String(toolName || "").toLowerCase();
  if (!name) return "working";
  if (/(inspect|list|query|search|recall|memory|read|status|diagnostic|probe)/.test(name)) return "carrying";
  if (/(review|verify|check|quality|git_review|diff|receipt|acceptance)/.test(name)) return "reviewing";
  if (/(recover|retry|repair|rollback|fix|debug|failure|watchdog)/.test(name)) return "debugging";
  if (/(orchestrate|create|send|dispatch|run|execute|task|mission|project|group|agent|cmd|write|manage|commit|merge|build)/.test(name)) return "building";
  return "working";
}

function getGlobalToolDisplayName(toolName: string) {
  const labels: Record<string, string> = {
    inspect_system: "读取系统状态",
    list_projects: "读取项目列表",
    inspect_project: "读取项目上下文",
    list_groups: "读取群聊列表",
    list_tasks: "读取任务列表",
    list_cron: "读取定时任务",
    query_knowledge: "查询知识库",
    query_global_memory: "查询全局记忆",
    manage_global_memory: "管理全局记忆",
    inspect_mission: "查询全局任务",
    inspect_supervision: "查询监工状态",
    orchestrate_development: "创建跨项目开发任务",
    manage_supervision: "管理异步监工",
    create_task: "创建开发任务",
    send_project_cmd: "发送项目 Agent 指令",
    send_group_cmd: "发送群聊主 Agent 指令",
    manage_cron: "管理定时任务",
    manage_group: "管理群聊",
    manage_project: "管理项目",
    manage_task: "管理任务",
    manage_tool: "管理工具",
    git_review: "审查代码变更",
    git_commit: "提交代码",
    create_template: "创建模板",
    play_music: "播放音乐",
    toggle_pet: "控制桌面宠物",
    navigate: "切换页面",
  };
  const key = String(toolName || "").trim();
  return labels[key] || key || "工具操作";
}

function buildGlobalAgentEventUi(event: any = {}) {
  const type = String(event.type || "");
  const toolName = event.tool?.name || event.pending_tool?.name || event.step?.tool?.name || event.step?.toolName || "";
  const toolLabel = getGlobalToolDisplayName(toolName);
  const text = (value: any, max = 220) => compactPetText(value, max);
  if (type === "started") return { phase: "understanding", tone: "running", title: "理解需求", text: "正在理解你的消息，判断是普通对话还是需要执行操作。" };
  if (type === "decision") {
    const state = String(event.step?.state || "");
    const message = text(event.step?.message || event.step?.decision?.intent?.reason || "");
    if (toolName) return { phase: "planning", tone: "running", title: "形成行动计划", text: message || `准备执行：${toolLabel}` };
    if (state === "answer" || state === "complete") return { phase: "answering", tone: "running", title: "组织回复", text: message || "已经形成回答，正在整理给你。" };
    if (state === "needs_confirmation") return { phase: "waiting", tone: "waiting", title: "需要确认", text: message || "需要你确认目标或授权范围。" };
    return { phase: "planning", tone: "running", title: "规划下一步", text: message || "正在规划下一步。" };
  }
  if (type === "tool_started") return { phase: "executing", tone: "running", title: "执行工具", text: `正在${toolLabel}。` };
  if (type === "tool_completed") return { phase: "reviewing", tone: "ok", title: "工具完成", text: `${toolLabel}已完成，正在检查结果。` };
  if (type === "tool_failed" || type === "tool_validation_failed") return { phase: "debugging", tone: "error", title: "执行遇到问题", text: text(event.error || event.step?.error || `${toolLabel}失败`) };
  if (type === "clarification_required") return { phase: "waiting", tone: "waiting", title: "需要补充信息", text: text(event.reply || "需要你补充目标、范围或验收标准。") };
  if (type === "confirmation_required") return { phase: "waiting", tone: "waiting", title: "等待授权确认", text: text(event.reply || "这个操作需要你确认后才会继续。") };
  if (type === "paused") return { phase: "paused", tone: "waiting", title: "已暂停", text: text(event.reply || "全局 Agent 已暂停。") };
  if (type === "supervising") return { phase: "supervising", tone: "running", title: "监工中", text: text(event.reply || "已经创建长期任务，正在监督群聊/项目 Agent 交付。") };
  if (type === "completed") return { phase: "completed", tone: "ok", title: "完成", text: text(event.reply || "本轮处理完成。") };
  if (type === "failed") return { phase: "failed", tone: "error", title: "失败", text: text(event.error || event.reply || "本轮处理失败。") };
  if (type === "cancelled") return { phase: "cancelled", tone: "waiting", title: "已取消", text: text(event.reply || "本轮处理已取消。") };
  return null;
}

function relayGlobalPetEvent(ctx: CollabCtx, event: any = {}, options: { message?: string; finalRun?: any; error?: string } = {}) {
  const type = String(event.type || "");
  const run = options.finalRun || event.run || {};
  const toolName = event.tool?.name || event.pending_tool?.name || event.step?.tool?.name || event.step?.toolName || "";
  const speech = (role: string, text: string, final = false) => ctx.broadcastPetSpeech(GLOBAL_PET_AGENT_NAME, { role, text: compactPetText(text), final, source: "global" });
  if (type === "started") {
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "thinking", "全局 Agent 正在理解你的需求...", { tab: "global-agent" }, 12 * 60 * 1000);
    speech("status", "我正在理解你的需求...", false);
    return;
  }
  if (type === "decision") {
    const message = event.step?.message || event.step?.tool?.name || "正在规划下一步";
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, toolName ? "planning" : "thinking", compactPetText(message), { tab: "global-agent" }, 12 * 60 * 1000);
    speech("status", message, false);
    return;
  }
  if (type === "tool_started") {
    const message = toolName ? `正在执行：${toolName}` : "正在执行工具操作...";
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, getGlobalPetToolState(toolName), message, { tab: "global-agent" }, 12 * 60 * 1000);
    speech("status", message, false);
    return;
  }
  if (type === "tool_completed") {
    const message = toolName ? `完成工具：${toolName}` : "工具执行完成";
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "reviewing", message, { tab: "global-agent" }, 45 * 1000);
    speech("assistant", message, false);
    return;
  }
  if (type === "tool_failed" || type === "tool_validation_failed") {
    const message = event.error || event.step?.error || "全局 Agent 工具执行失败";
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "debugging", compactPetText(message), { tab: "global-agent" }, 90 * 1000);
    speech("error", message, true);
    return;
  }
  if (type === "clarification_required" || type === "confirmation_required" || type === "paused") {
    const message = event.reply || "全局 Agent 需要你确认后继续";
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "waiting", compactPetText(message), { tab: "global-agent" }, 5 * 60 * 1000);
    speech("status", message, true);
    return;
  }
  if (type === "supervising") {
    const message = event.reply || "全局 Agent 正在监督协作任务";
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "building", compactPetText(message), { tab: "global-agent" }, 12 * 60 * 1000);
    speech("status", message, false);
    return;
  }
  if (type === "completed" || options.finalRun) {
    const finalReply = options.finalRun?.final_reply || run.final_reply || event.reply || "全局 Agent 已完成本轮处理";
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "happy", compactPetText(finalReply, 120), { tab: "global-agent" }, 90 * 1000);
    speech("assistant", finalReply, true);
    return;
  }
  if (type === "failed" || type === "cancelled" || options.error) {
    const message = options.error || event.error || event.reply || "全局 Agent 本轮处理失败";
    ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "error", compactPetText(message), { tab: "global-agent" }, 90 * 1000);
    speech("error", message, true);
  }
}

function writeGlobalJsonAtomic(file: string, value: any) {
  const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, `${file}.bak`); } catch {}
  }
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

function normalizeGlobalAgentMessages(messages: any[] = []) {
  return messages
    .filter((item: any) => item && ["user", "assistant"].includes(String(item.role || "")) && String(item.content || "").trim())
    .map((item: any) => ({
      role: String(item.role),
      content: String(item.content || "").slice(0, 8000),
      timestamp: item.timestamp || new Date().toISOString(),
    }))
    .slice(-GLOBAL_AGENT_HISTORY_LIMIT);
}

function loadGlobalAgentHistoryStore(): any {
  try {
    if (fs.existsSync(GLOBAL_AGENT_HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(GLOBAL_AGENT_HISTORY_FILE, "utf-8"));
      return { sessions: [], ...data };
    }
  } catch {}
  try {
    const recovered = JSON.parse(fs.readFileSync(`${GLOBAL_AGENT_HISTORY_FILE}.bak`, "utf-8"));
    return { sessions: [], ...recovered, storage_recovery: { recovered_from_backup: true, recovered_at: new Date().toISOString() } };
  } catch {}
  return { current_session_id: "", sessions: [] };
}

function saveGlobalAgentHistoryStore(store: any) {
  const sessions = Array.isArray(store.sessions) ? store.sessions : [];
  store.sessions = sessions
    .map((session: any) => ({
      ...session,
      messages: normalizeGlobalAgentMessages(session.messages || []),
      updatedAt: session.updatedAt || new Date().toISOString(),
    }))
    .filter((session: any) => session.id && session.messages.length > 0)
    .sort((a: any, b: any) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
    .slice(0, GLOBAL_AGENT_SESSION_LIMIT);
  writeGlobalJsonAtomic(GLOBAL_AGENT_HISTORY_FILE, store);
}

function syncGlobalAgentWebHistory(payload: any) {
  const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
  const store = loadGlobalAgentHistoryStore();
  const byId = new Map<string, any>();
  for (const session of store.sessions || []) byId.set(String(session.id), session);
  for (const session of sessions) {
    const id = String(session.id || "").trim();
    if (!id) continue;
    try {
      ingestGlobalAgentConversation({ sessionId: id, source: "web", messages: session.messages || [] });
    } catch (error: any) {
      console.warn(`[全局记忆] Web 会话写入失败 (${id})：${error?.message || error}`);
    }
    byId.set(id, {
      id,
      name: session.name || "全局 Agent 会话",
      source: "web",
      createdAt: session.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: normalizeGlobalAgentMessages(session.messages || []),
    });
  }
  store.sessions = Array.from(byId.values());
  if (payload.currentSessionId) store.current_session_id = String(payload.currentSessionId);
  saveGlobalAgentHistoryStore(store);
  return store;
}

function getBaseGlobalAgentMessages(store: any) {
  const sessions = Array.isArray(store.sessions) ? store.sessions : [];
  const current = sessions.find((item: any) => item.id === store.current_session_id && item.source !== "feishu")
    || sessions.find((item: any) => item.source === "web")
    || sessions[0];
  return normalizeGlobalAgentMessages(current?.messages || []);
}

function getGlobalAgentConversationMessages(sessionId: string) {
  const store = loadGlobalAgentHistoryStore();
  const existing = (store.sessions || []).find((item: any) => item.id === sessionId);
  if (existing) return normalizeGlobalAgentMessages(existing.messages || []);
  return getBaseGlobalAgentMessages(store);
}

function appendGlobalAgentConversationMessage(sessionId: string, role: "user" | "assistant", content: string, source = "feishu") {
  const store = loadGlobalAgentHistoryStore();
  const sessions = Array.isArray(store.sessions) ? store.sessions : [];
  let session = sessions.find((item: any) => item.id === sessionId);
  if (!session) {
    session = {
      id: sessionId,
      name: source === "feishu" ? "飞书全局 Agent" : "全局 Agent 会话",
      source,
      createdAt: new Date().toISOString(),
      messages: getBaseGlobalAgentMessages(store),
    };
    sessions.unshift(session);
  }
  const message = { role, content, timestamp: new Date().toISOString(), source };
  try {
    ingestGlobalAgentConversation({ sessionId, source, messages: [message] });
  } catch (error: any) {
    console.warn(`[全局记忆] 会话消息写入失败 (${sessionId})：${error?.message || error}`);
  }
  session.messages = normalizeGlobalAgentMessages([...(session.messages || []), message]);
  session.updatedAt = new Date().toISOString();
  store.sessions = sessions;
  saveGlobalAgentHistoryStore(store);
}

function buildFeishuConversationId(payload: any) {
  const raw = payload?.session_id || payload?.sessionId || payload?.sessionKey || payload?.conversation_id || payload?.conversationId || payload?.message?.session_id || payload?.data?.session_id || "default";
  return "feishu:" + String(raw || "default").replace(/[^a-zA-Z0-9:_@.-]/g, "_").slice(0, 120);
}

function getFeishuMessageId(payload: any) {
  return String(
    payload?.event?.message?.message_id
    || payload?.message_id
    || payload?.messageId
    || payload?.message?.id
    || payload?.header?.event_id
    || payload?.event_id
    || ""
  ).trim();
}

async function waitForIdempotencyResult(scope: string, key: string, timeoutMs = 10 * 60 * 1000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const record = getIdempotencyRecord(scope, key);
    if (record?.status === "completed" || record?.status === "failed") return record;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return getIdempotencyRecord(scope, key);
}

function loadGlobalAgentBridgeStore(): any {
  try {
    if (fs.existsSync(GLOBAL_AGENT_BRIDGE_FILE)) return JSON.parse(fs.readFileSync(GLOBAL_AGENT_BRIDGE_FILE, "utf-8"));
  } catch {}
  try { return JSON.parse(fs.readFileSync(`${GLOBAL_AGENT_BRIDGE_FILE}.bak`, "utf-8")); } catch {}
  return { requests: [] };
}

function saveGlobalAgentBridgeStore(store: any) {
  const cutoff = Date.now() - 30 * 60 * 1000;
  store.requests = (Array.isArray(store.requests) ? store.requests : [])
    .filter((item: any) => item.status === "pending" || Date.parse(item.updated_at || item.created_at || 0) > cutoff)
    .slice(-100);
  writeGlobalJsonAtomic(GLOBAL_AGENT_BRIDGE_FILE, store);
}

function createGlobalAgentBridgeRequest(text: string, sessionId: string) {
  const store = loadGlobalAgentBridgeStore();
  const request = {
    id: "gab_" + Date.now().toString(36) + "_" + crypto.randomBytes(3).toString("hex"),
    status: "pending",
    text,
    session_id: sessionId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  store.requests = [...(store.requests || []), request];
  saveGlobalAgentBridgeStore(store);
  return request;
}

async function waitForGlobalAgentBridgeResult(id: string, timeoutMs = 10 * 60 * 1000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const store = loadGlobalAgentBridgeStore();
    const request = (store.requests || []).find((item: any) => item.id === id);
    if (request && request.status !== "pending") return request;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return { id, status: "timeout", reply: "Web 全局 Agent 控制台暂未响应，请确认 CCM 页面处于打开状态后重试。" };
}

const processedFeishuMessageIds = new Set<string>();

const GLOBAL_MANAGEMENT_ACTIONS: Record<string, any> = {
  manage_cron: { label: "定时任务管理", operations: ["list", "create", "update", "enable", "disable", "run", "delete"], destructive: ["delete"] },
  manage_group: { label: "群聊与成员管理", operations: ["list", "create", "rename", "add_member", "remove_member", "delete"], destructive: ["delete"] },
  manage_project: { label: "项目与 Agent 管理", operations: ["list", "create", "update", "start", "stop", "delete"], destructive: ["delete"] },
  manage_task: { label: "开发任务管理", operations: ["list", "pause", "resume", "continue", "retry", "queue", "delete"], destructive: ["delete"] },
  manage_tool: { label: "MCP 与 Skill 管理", operations: ["list", "create", "delete", "reload", "status"], destructive: ["delete"] },
  system_status: { label: "系统状态检查", operations: ["inspect"], destructive: [] },
};

const GLOBAL_MANAGEMENT_REQUIRED_PARAMS: Record<string, Record<string, string[]>> = {
  manage_cron: {
    create: ["name", "schedule", "prompt"],
    update: ["id"],
    enable: ["id"],
    disable: ["id"],
    run: ["id"],
    delete: ["id"],
  },
  manage_group: {
    create: ["name"],
    rename: ["id", "name"],
    add_member: ["id", "project"],
    remove_member: ["id", "project"],
    delete: ["id"],
  },
  manage_project: {
    create: ["name", "work_dir"],
    update: ["project"],
    start: ["project"],
    stop: ["project"],
    delete: ["project"],
  },
  manage_task: {
    pause: ["id"],
    resume: ["id"],
    continue: ["id"],
    retry: ["id"],
    queue: ["id"],
    delete: ["id"],
  },
  manage_tool: {
    create: ["name"],
    delete: ["name"],
  },
};

const GLOBAL_AGENT_BOUNDARY = {
  layer: "global_agent",
  responsibility: "system intent routing, management actions, development mission fan-out",
};

function annotateGlobalAction(action: any) {
  if (!action || !action.type) return action;
  const spec = GLOBAL_MANAGEMENT_ACTIONS[action.type];
  if (!spec) return action;
  const operation = String(action.params?.operation || (action.type === "system_status" ? "inspect" : "")).trim().toLowerCase();
  if (!spec.operations.includes(operation)) throw new Error(spec.label + " 不支持操作: " + (operation || "未填写"));
  const requiresConfirmation = spec.destructive.includes(operation);
  const params = { ...(action.params || {}), operation };
  if (action.type === "manage_task" && !params.id && params.task_id) params.id = params.task_id;
  if (action.type === "manage_group" && !params.id && params.group_id) params.id = params.group_id;
  if (action.type === "manage_project" && !params.project && params.name) params.project = params.name;
  const required = GLOBAL_MANAGEMENT_REQUIRED_PARAMS[action.type]?.[operation] || [];
  const missingParams = required.filter((key) => {
    const value = params[key];
    return value === undefined || value === null || String(value).trim() === "";
  });
  return {
    ...action,
    params,
    management: true,
    agentBoundary: GLOBAL_AGENT_BOUNDARY,
    capability: spec.label,
    risk: requiresConfirmation ? "high" : "normal",
    requires_confirmation: requiresConfirmation,
    validated: missingParams.length === 0,
    missing_params: missingParams,
    needs_user_input: missingParams.length > 0,
  };
}

function redactAuditValue(value: any, key = ""): any {
  if (/token|secret|password|api.?key/i.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map(item => redactAuditValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactAuditValue(entryValue, entryKey)]));
  }
  return value;
}

function appendGlobalActionAudit(payload: any) {
  const record = {
    id: "ga-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    action: redactAuditValue(payload.action || {}),
    status: payload.status || "unknown",
    result: redactAuditValue(payload.result || {}),
    session_id: payload.session_id || null,
    source: payload.source || null,
    sender_id: redactAuditValue(payload.sender_id || null, "sender_id"),
    message_id: payload.message_id || null,
  };
  fs.appendFileSync(path.join(CCM_DIR, "global-agent-audit.jsonl"), JSON.stringify(record) + String.fromCharCode(10), "utf-8");
  return record;
}

function normalizeText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripActionWords(value: string) {
  return normalizeText(value)
    .replace(/^(请|帮我|麻烦|给我|我要|我想|想要|可以)?/g, "")
    .replace(/(一下|下|吧|呢|谢谢)$/g, "")
    .trim();
}

const RANDOM_MUSIC_KEYWORD = "__random__";

function parseMusicKeyword(message: string) {
  const text = stripActionWords(message);
  const keyword = text
    .replace(/^(?:随机|随便|任意)?\s*(播放|放一首|放|来一首|来点|听|我想听|我要听|搜首歌|搜索(?:一下)?(?:歌曲|歌)?)/, "")
    .replace(/^(?:一首|首|点|点儿|点歌)\s*/, "")
    .replace(/(?:的)?(音乐|歌曲|歌)$/g, "")
    .trim();
  if (!keyword || /^(随机|随便|任意|音乐|歌曲|歌|播放|播放音乐|听歌)$/.test(keyword)) return "";
  return keyword;
}

function findProjectName(message: string, projects: string[]) {
  const text = message.toLowerCase();
  return projects.find(project => text.includes(String(project).toLowerCase())) || "";
}

function findGroup(message: string, groups: any[]) {
  const text = message.toLowerCase();
  return groups.find(group => {
    const id = String(group?.id || "").toLowerCase();
    const name = String(group?.name || "").toLowerCase();
    return (id && text.includes(id)) || (name && text.includes(name));
  }) || null;
}

function findAllProjectNames(message: string, projects: string[]) {
  const text = message.toLowerCase();
  return projects.filter(project => text.includes(String(project).toLowerCase()));
}

function resolveImplicitCurrentProject(message: string, projects: string[]) {
  const text = normalizeText(message).toLowerCase();
  const hasImplicitProject = /(?:这个|当前|本|该)\s*(?:项目|代码库|仓库|系统)|(?:项目|代码库|仓库|系统)\s*(?:这个|当前|本|该)/.test(text);
  if (!hasImplicitProject) return "";
  const ccmProject = projects.find(project => /cc[-_]?connect|ccm/i.test(String(project)));
  if (ccmProject) return ccmProject;
  return projects.length === 1 ? projects[0] : "";
}

function findAllGroups(message: string, groups: any[]) {
  const text = message.toLowerCase();
  return groups.filter(group => {
    const id = String(group?.id || "").toLowerCase();
    const name = String(group?.name || "").toLowerCase();
    return (id && text.includes(id)) || (name && text.includes(name));
  });
}

function buildLocalDevelopmentTargets(message: string, projects: string[], groups: any[]) {
  const matchedGroups = findAllGroups(message, groups);
  const matchedProjects = findAllProjectNames(message, projects);
  const implicitProject = matchedProjects.length ? "" : resolveImplicitCurrentProject(message, projects);
  const requestsWholeWorkspace = /(?:所有|全部|全量|整个|全局|全项目|跨项目).*(?:项目|代码库|仓库|系统)|(?:项目|代码库|仓库|系统).*(?:全部|全量|整体|全局)/.test(message);
  const targets = [
    ...matchedGroups.map((group: any) => ({
      type: "group",
      group_id: group.id,
      reason: "用户明确提到开发群聊「" + (group.name || group.id) + "」",
      task: message,
    })),
    ...matchedProjects.map((project: string) => ({
      type: "project",
      project,
      reason: "用户明确提到项目「" + project + "」",
      task: message,
    })),
    ...(implicitProject ? [{
      type: "project",
      project: implicitProject,
      reason: "用户使用“当前/这个项目”指代，已解析到项目「" + implicitProject + "」",
      task: message,
    }] : []),
  ];
  if (targets.length > 0) return targets;
  if (requestsWholeWorkspace && projects.length > 0) {
    return projects.map((project: string) => ({
      type: "project",
      project,
      reason: "用户明确要求覆盖整个项目工作区",
      task: message,
    }));
  }
  return [];
}

/**
 * 仅用于大模型不可用时的保底判断。正常聊天路径由大模型决定是否产生 action，
 * 这里不能因为出现“知识库 / 实现 / 优化”等主题词就自动创建项目任务。
 */
function hasExplicitDevelopmentExecutionIntent(message: string) {
  const text = normalizeText(message);
  if (!text) return false;
  if (/(?:只是|仅仅|只想|先)(?:问问|了解|咨询|讨论|解释|分析)|不要(?:执行|修改|创建|派发)|不用(?:执行|修改|创建|派发)/.test(text)) return false;

  const hasDevelopmentAction = /(实现|新增|添加|修改|改造|修复|重构|优化|完成|对接|上线|部署|运行|执行|测试|检查|排查|审查|提交|创建)/.test(text);
  if (!hasDevelopmentAction) return false;

  const isExplanatoryQuestion = /[?？]|(?:怎么|如何|为什么|是什么|原理|介绍|讲讲|说明|能不能|可不可以|是否|有哪些|有什么)/.test(text);
  const explicitDirective = /^(?:实现|新增|添加|修改|改造|修复|重构|优化|完成|对接|上线|部署|运行|执行|测试|检查|排查|审查|提交|创建)/.test(text)
    || /(?:请(?!问)|帮我|麻烦|给我|需要你|我要你|直接|立即|马上|开始).*(?:实现|新增|添加|修改|改造|修复|重构|优化|完成|对接|上线|部署|运行|执行|测试|检查|排查|审查|提交|创建)/.test(text);

  return explicitDirective && !isExplanatoryQuestion;
}

function chineseNumberToInt(value: string) {
  const text = String(value || "").trim();
  if (!text) return NaN;
  if (/^\d+$/.test(text)) return Number(text);
  const map: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (text === "十") return 10;
  const tenIdx = text.indexOf("十");
  if (tenIdx >= 0) {
    const left = text.slice(0, tenIdx);
    const right = text.slice(tenIdx + 1);
    return (left ? map[left] || 0 : 1) * 10 + (right ? map[right] || 0 : 0);
  }
  return map[text] ?? NaN;
}

function normalizeCronHour(raw: string, text: string) {
  let hour = chineseNumberToInt(raw);
  if (Number.isNaN(hour)) return NaN;
  if (/下午|晚上|傍晚/.test(text) && hour < 12) hour += 12;
  if (/中午/.test(text) && hour < 11) hour += 12;
  return Math.max(0, Math.min(23, hour));
}

function guessCronSchedule(message: string) {
  const text = normalizeText(message);
  const everyHour = /每(个)?小时|每小时/.test(text);
  if (everyHour) return "0 * * * *";

  const minuteMatch = text.match(/每(?:隔)?(\d{1,2})\s*分钟/);
  if (minuteMatch) return `*/${Math.max(1, Math.min(59, Number(minuteMatch[1])))} * * * *`;

  const dayHourMatch = text.match(/(?:每天|每日)(?:早上|上午|中午|下午|晚上|傍晚)?\s*([零〇一二两三四五六七八九十\d]{1,3})\s*(?:点|:00)/)
    || text.match(/(?:早上|上午|中午|下午|晚上|傍晚)\s*([零〇一二两三四五六七八九十\d]{1,3})\s*(?:点|:00)/);
  if (dayHourMatch) {
    const hour = normalizeCronHour(dayHourMatch[1], text);
    if (!Number.isNaN(hour)) return `0 ${hour} * * *`;
  }

  const weekMap: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
  const weekMatch = text.match(/每(?:周|星期)([一二三四五六日天])(?:早上|上午|中午|下午|晚上|傍晚)?\s*([零〇一二两三四五六七八九十\d]{1,3})\s*(?:点|:00)/);
  if (weekMatch) {
    const hour = normalizeCronHour(weekMatch[2], text);
    if (!Number.isNaN(hour)) return `0 ${hour} * * ${weekMap[weekMatch[1]]}`;
  }

  const cronMatch = text.match(/(?:cron|表达式)\s*[:：]?\s*([0-9*,/\-?]+\s+[0-9*,/\-?]+\s+[0-9*,/\-?]+\s+[0-9*,/\-?]+\s+[0-9*,/\-?]+)/i);
  if (cronMatch) return cronMatch[1].trim();
  return "";
}

function inferLocalGlobalAction(message: string, projects: string[], groups: any[], resources: any = {}): LocalIntentResult | null {
  const text = normalizeText(message);
  if (!text) return null;
  const explicitWriteAuthorization = hasExplicitGlobalWriteAuthorization(text);
  const explicitReadRequest = /^(?:请)?(?:查看|列出|检查|打开|进入|跳转|搜索|查询)|(?:系统|任务|项目|群聊|定时任务).*(?:当前状态|运行状态|列表)/.test(text);
  const consultationOnly = /[?？]|(?:怎么|如何|为什么|是什么|原理|介绍|讲讲|说明|建议|觉得|能否|能不能|可不可以|是否|会不会|有哪些|有什么)/.test(text);
  if (/(?:不要|不用|先别|暂时别).*(?:执行|操作|修改|创建|派发|启动|停止|删除|提交)/.test(text)) return null;
  if (consultationOnly && !explicitWriteAuthorization && !explicitReadRequest) return null;
  const lower = text.toLowerCase();
  const matchedProject = findProjectName(text, projects);
  const matchedGroup = findGroup(text, groups);
  const cronJobs = Array.isArray(resources.cronJobs) ? resources.cronJobs : [];
  const tasks = Array.isArray(resources.tasks) ? resources.tasks : [];
  const mcpTools = Array.isArray(resources.mcpTools) ? resources.mcpTools : [];
  const skills = Array.isArray(resources.skills) ? resources.skills : [];
  const matchedCron = cronJobs.find((item: any) => text.includes(String(item.id || "")) || text.includes(String(item.name || "")));
  const matchedTask = tasks.find((item: any) => text.includes(String(item.id || "")) || (item.title && text.includes(String(item.title))));
  const matchedMcp = mcpTools.find((item: any) => item.name && text.includes(String(item.name)));
  const matchedSkill = skills.find((item: any) => item.name && text.includes(String(item.name)));

  if (/(系统状态|运行状态|健康状态|检查系统|系统概况|当前状态)/.test(text) && !/(定时任务|计划任务|定时执行|每天|每日|每周|每小时|创建|新建|添加)/.test(text)) {
    return {
      reply: "我会检查项目、群聊、任务队列、定时调度和工具运行状态。",
      action: { type: "system_status", params: { operation: "inspect" } }
    };
  }

  if (/定时任务|计划任务|定时执行|cron|每(天|周|星期|小时|隔)/i.test(text) && /(查看|列出|创建|新建|添加|启用|开启|暂停|禁用|立即运行|执行一次|删除|修改|更新|定时|每)/.test(text)) {
    const operation = /(创建|新建|添加)/.test(text) ? "create"
      : /删除/.test(text) ? "delete"
      : /(暂停|禁用|关闭)/.test(text) ? "disable"
      : /(启用|开启|恢复)/.test(text) ? "enable"
      : /(立即运行|执行一次|马上执行)/.test(text) ? "run"
      : /(修改|更新)/.test(text) ? "update"
      : "list";
    if (["create", "update"].includes(operation) && !matchedGroup && !matchedProject) return null;
    const schedule = guessCronSchedule(text);
    const targetType = matchedGroup || !matchedProject ? "group" : "project";
    const group = matchedGroup || groups[0] || null;
    const project = matchedProject || projects[0] || "";
    const prompt = text.replace(/创建|新建|添加|一个|定时任务|计划任务/g, "").trim() || text;
    return {
      reply: "我会执行定时任务管理操作：" + operation + "。",
      action: {
        type: "manage_cron",
        params: {
          operation,
          id: matchedCron?.id || "",
          name: operation === "create" ? (prompt.slice(0, 28) || "全局助手定时任务") : (matchedCron?.name || ""),
          schedule: schedule || undefined,
          prompt: operation === "create" ? prompt : undefined,
          target_type: operation === "create" ? targetType : undefined,
          group_id: operation === "create" && targetType === "group" ? group?.id : undefined,
          project: operation === "create" && targetType === "project" ? project : undefined,
        }
      }
    };
  }

  if (/任务/.test(text) && /(查看任务|任务列表|暂停|继续|恢复|重试|重新执行|删除任务|取消任务|加入队列)/.test(text)) {
    const operation = /(删除|取消)/.test(text) ? "delete"
      : /暂停/.test(text) ? "pause"
      : /重试|重新执行/.test(text) ? "retry"
      : /加入队列/.test(text) ? "queue"
      : /继续/.test(text) ? "continue"
      : /恢复/.test(text) ? "resume"
      : "list";
    return {
      reply: "我会执行开发任务管理操作：" + operation + "。",
      action: { type: "manage_task", params: { operation, id: matchedTask?.id || "", message: text } }
    };
  }

  if (/(群聊|项目组)/.test(text) && /(创建|新建|重命名|改名|添加成员|移除成员|删除群聊|删除项目组|查看群聊|群聊列表)/.test(text)) {
    const operation = /(删除群聊|删除项目组)/.test(text) ? "delete"
      : /添加成员/.test(text) ? "add_member"
      : /移除成员/.test(text) ? "remove_member"
      : /(重命名|改名)/.test(text) ? "rename"
      : /(创建|新建)/.test(text) ? "create"
      : "list";
    return {
      reply: "我会执行群聊管理操作：" + operation + "。",
      action: {
        type: "manage_group",
        params: { operation, id: matchedGroup?.id || "", name: matchedGroup?.name || stripActionWords(text).slice(0, 40), project: matchedProject || "" }
      }
    };
  }

  if (/(MCP|mcp|Skill|skill|技能)/.test(text) && /(查看|列表|状态|重载|重新加载|删除|移除|创建|添加)/.test(text)) {
    const kind = /(Skill|skill|技能)/.test(text) ? "skill" : "mcp";
    const operation = /(删除|移除)/.test(text) ? "delete"
      : /(重载|重新加载)/.test(text) ? "reload"
      : /(创建|添加)/.test(text) ? "create"
      : /状态/.test(text) ? "status"
      : "list";
    return {
      reply: "我会执行 " + kind.toUpperCase() + " 管理操作：" + operation + "。",
      action: {
        type: "manage_tool",
        params: { operation, kind, name: kind === "mcp" ? matchedMcp?.name || "" : matchedSkill?.name || "" }
      }
    };
  }

  if (/(项目|Agent|agent)/.test(text) && !/运行.*(?:测试|检查|构建|命令)/.test(text) && /(项目列表|查看项目|列出项目|创建项目|新建项目|启动|运行|拉起|开启|停止|关闭|停掉|结束|删除项目|移除项目|修改.*Agent|切换.*Agent|更换.*Agent|修改项目配置)/i.test(text)) {
    const operation = /(创建项目|新建项目)/.test(text) ? "create"
      : /(删除项目|移除项目)/.test(text) ? "delete"
      : /(启动|运行|拉起|开启)/.test(text) ? "start"
      : /(停止|关闭|停掉|结束)/.test(text) ? "stop"
      : /(修改.*Agent|切换.*Agent|更换.*Agent|修改项目配置)/i.test(text) ? "update"
      : "list";
    const agentMatch = text.match(/(claudecode|claude|codex|cursor|gemini|qoder)/i);
    const nameMatch = text.match(/(?:创建项目|新建项目|创建一个项目|新建一个项目)\s*[「"']?([^，。,\.\s"'」]+)/);
    const workDirMatch = text.match(/(?:目录|路径|work_dir|工作目录)\s*[:：]?\s*([A-Za-z]:\\[^，。\n]+|\/[^，。\s]+)/i);
    const project = matchedProject || (operation === "create" ? (nameMatch?.[1] || "") : "");
    return {
      reply: "我会执行项目管理操作：" + operation + "。",
      action: {
        type: "manage_project",
        params: {
          operation,
          project,
          name: operation === "create" ? project : matchedProject,
          work_dir: workDirMatch?.[1] || undefined,
          agent: agentMatch?.[1] || undefined,
        }
      }
    };
  }

  if (/(打开|开启|启动|唤醒|显示).*(宠物|桌宠)|(?:宠物|桌宠).*(打开|开启|启动|唤醒|显示)/.test(text)) {
    return {
      reply: "我识别到你要打开桌面宠物，正在调起宠物 Agent。",
      action: { type: "toggle_pet", params: { action: "open" } }
    };
  }
  if (/(关闭|隐藏|退出).*(宠物|桌宠)|(?:宠物|桌宠).*(关闭|隐藏|退出)/.test(text)) {
    return {
      reply: "我识别到你要关闭桌面宠物，正在执行。",
      action: { type: "toggle_pet", params: { action: "close" } }
    };
  }

  const pageMap: Array<[RegExp, string, string]> = [
    [/音乐|播放器|听歌/, "music", "音乐播放"],
    [/宠物|桌宠/, "pets", "宠物空间"],
    [/项目管理|项目列表/, "projects", "项目管理"],
    [/群聊|项目组|协作/, "groups", "群聊协作"],
    [/任务派发|任务列表|开发任务/, "tasks", "任务派发"],
    [/定时任务|计划任务|cron/i, "cron", "定时任务"],
    [/终端|控制台/, "terminal", "内置终端"],
    [/模板|提示词/, "templates", "对话模板"],
    [/搜索|查对话/, "search", "对话搜索"],
    [/设置|配置/, "settings", "系统设置"],
  ];
  if (/(打开|进入|跳转|去|查看).*(页面|面板|模块|列表|空间|设置|控制台)?/.test(text)) {
    const page = pageMap.find(([pattern]) => pattern.test(text));
    if (page) {
      return {
        reply: `我会为你打开「${page[2]}」页面。`,
        action: { type: "navigate", params: { tab: page[1] } }
      };
    }
  }

  if (matchedProject && !/运行.*(?:测试|检查|构建|命令)/.test(text) && /(?:启动|运行|拉起|开启|打开)\s*(?:项目|服务|agent|Agent)?|(?:项目|服务|agent|Agent).*?(?:启动|运行|拉起|开启)/.test(text)) {
    return {
      reply: `我会启动项目「${matchedProject}」。`,
      action: { type: "manage_project", params: { operation: "start", project: matchedProject } }
    };
  }

  if (matchedProject && /(?:停止|关闭|停掉|结束)\s*(?:项目|服务|agent|Agent)?|(?:项目|服务|agent|Agent).*?(?:停止|关闭|停掉|结束)/.test(text)) {
    return {
      reply: `我会停止项目「${matchedProject}」。`,
      action: { type: "manage_project", params: { operation: "stop", project: matchedProject } }
    };
  }

  if (/(播放|放一首|放|来一首|来点|听|我想听|我要听|搜首歌|搜索.*歌)/.test(text) && !/页面|列表|打开音乐/.test(text)) {
    const keyword = parseMusicKeyword(text);
    if (keyword) {
      return {
        reply: `我会交给音乐 Agent 搜索并播放「${keyword}」。`,
        action: { type: "play_music", params: { keyword } }
      };
    }
    return {
      reply: "我会交给音乐 Agent 随机播放一首本地音乐。",
      action: { type: "play_music", params: { keyword: RANDOM_MUSIC_KEYWORD, random: true } }
    };
  }

  if (/定时任务|计划任务|定时执行|每(天|周|星期|小时|隔)/.test(text) && /(创建|新建|添加|定时|每)/.test(text)) {
    if (!matchedGroup && !matchedProject) return null;
    const schedule = guessCronSchedule(text);
    const targetType = matchedGroup ? "group" : "project";
    const group = matchedGroup || null;
    const project = matchedProject || "";
    const prompt = text.replace(/创建|新建|添加|一个|定时任务|计划任务/g, "").trim() || text;
    return {
      reply: schedule
        ? `我会创建一个定时任务，周期是 \`${schedule}\`。`
        : "我可以创建定时任务，但还需要明确周期；我先把识别到的任务内容整理好。",
      action: {
        type: "create_cron_task",
        params: {
          name: prompt.slice(0, 28) || "全局助手定时任务",
          schedule,
          prompt,
          target_type: targetType,
          group_id: targetType === "group" ? group?.id : undefined,
          project: targetType === "project" ? project : undefined,
        }
      }
    };
  }

  const isDevelopmentRequest = hasExplicitDevelopmentExecutionIntent(text);
  if (isDevelopmentRequest) {
    const targets = buildLocalDevelopmentTargets(text, projects, groups);
    if (targets.length > 0) {
      return {
        reply: "我会把这条业务需求交给全局总控流程，建立跨项目计划并向 " + targets.length + " 个执行目标派发持久任务。",
        action: {
          type: "orchestrate_development",
          params: {
            title: text.slice(0, 60),
            business_goal: text,
            scope: "由全局 Agent结合项目和群聊成员关系识别影响范围",
            documents: text,
            acceptance: "所有群聊主 Agent和项目 Agent子任务必须通过代码变更与验证门禁，全局 Agent再汇总报告完成",
            execution_order: "parallel",
            targets,
          }
        }
      };
    }
  }

  if ((/群聊|项目组|协作组|下单/.test(text) || matchedGroup) && /(修改|修复|bug|派发|指令|下单|处理|实现)/.test(text)) {
    const group = matchedGroup || null;
    if (group) {
      return {
        reply: `我会把这条指令下发到群聊「${group.name || group.id}」的主 Agent。`,
        action: {
          type: "send_group_cmd",
          params: { group_id: group.id, message: text, target_project: "coordinator" }
        }
      };
    }
  }

  if (matchedProject && /(修改|修复|改一下|处理|实现|新增|删除|优化|项目\s*agent|项目agent)/.test(text)) {
    return {
      reply: `我会把这条修改指令发送给项目 Agent「${matchedProject}」。`,
      action: { type: "send_project_cmd", params: { project: matchedProject, message: text } }
    };
  }

  if (/创建|新建|派发/.test(text) && /任务|需求|开发/.test(text)) {
    const group = matchedGroup || null;
    if (!group) return null;
    return {
      reply: group ? `我会为群聊「${group.name || group.id}」创建并派发开发任务。` : "我会创建一条开发任务。",
      action: {
        type: "create_task",
        params: {
          title: text.slice(0, 36),
          business_goal: text,
          scope: text,
          group_id: group?.id,
          acceptance: "子 Agent 提供回执；主 Agent 输出最终报告"
        }
      }
    };
  }

  return null;
}

function createActionBlockSafeStreamer(emit: (text: string) => void) {
  const actionMarker = "```action";
  const fenceMarker = "```";
  let buffer = "";
  let insideAction = false;

  const drain = (final = false) => {
    while (buffer) {
      if (insideAction) {
        const closeIndex = buffer.indexOf(fenceMarker);
        if (closeIndex >= 0) {
          buffer = buffer.slice(closeIndex + fenceMarker.length);
          insideAction = false;
          continue;
        }
        if (final) buffer = "";
        else buffer = buffer.slice(Math.max(0, buffer.length - (fenceMarker.length - 1)));
        return;
      }

      const actionIndex = buffer.indexOf(actionMarker);
      if (actionIndex >= 0) {
        if (actionIndex > 0) emit(buffer.slice(0, actionIndex));
        buffer = buffer.slice(actionIndex + actionMarker.length);
        insideAction = true;
        continue;
      }

      if (final) {
        emit(buffer);
        buffer = "";
        return;
      }

      const safeLength = Math.max(0, buffer.length - (actionMarker.length - 1));
      if (safeLength > 0) {
        emit(buffer.slice(0, safeLength));
        buffer = buffer.slice(safeLength);
      }
      return;
    }
  };

  return {
    push(text: string) {
      buffer += String(text || "");
      drain(false);
    },
    finish() {
      drain(true);
    },
  };
}

export function runGlobalAgentIntentSelfTest() {
  const projects = ["frontend-app", "backend-api", "cc-connect-test"];
  const groups = [{ id: "dev-group", name: "开发群", members: projects.map(project => ({ project })) }];
  const cases = [
    { message: "知识库是怎么实现的？", expected: null, authorized: false },
    { message: "知识库有哪些可以优化的地方？", expected: null, authorized: false },
    { message: "请介绍一下当前知识库的工作原理", expected: null, authorized: false },
    { message: "我想了解知识库压缩是怎么做的", expected: null, authorized: false },
    { message: "如果要给 frontend-app 加支付，你建议怎么拆分？", expected: null, authorized: false },
    { message: "你觉得 backend-api 还有哪些可以优化？", expected: null, authorized: false },
    { message: "不要执行，只分析怎么修复 backend-api 的问题", expected: null, authorized: false },
    { message: "Cursor 能不能支持这个项目？", expected: null, authorized: false },
    { message: "关于项目记忆，给我讲讲实现原理", expected: null, authorized: false },
    { message: "测试任务会不会重复创建？", expected: null, authorized: false },
    { message: "帮我优化一下", expected: null, authorized: true },
    { message: "给项目加一个支付功能", expected: null, authorized: true },
    { message: "创建每天检查一次的定时任务", expected: null, authorized: true },
    { message: "请优化整个项目的知识库检索，并完成测试", expected: "orchestrate_development", expectedTargetCount: projects.length, authorized: true },
    { message: "请修改当前项目的 README 并运行测试", expected: "orchestrate_development", expectedTargetCount: 1, authorized: true },
    { message: "修复 backend-api 的知识库检索错误", expected: "orchestrate_development", authorized: true },
    { message: "请给 frontend-app 新增登录页面并运行测试", expected: "orchestrate_development", authorized: true },
    { message: "直接运行 backend-api 的测试", expected: "orchestrate_development", authorized: true },
    { message: "我明确授权：现在给 backend-api 运行测试，影响范围仅限测试，不修改代码", expected: "send_project_cmd", authorized: true },
    { message: "给开发群派发任务，修复登录问题", expected: "send_group_cmd", authorized: true },
    { message: "创建一个每天早上八点检查 backend-api 的定时任务", expected: "manage_cron", authorized: true },
    { message: "启动 backend-api 项目", expected: "manage_project", authorized: true },
    { message: "打开系统设置页面", expected: "navigate" },
    { message: "播放周杰伦的晴天", expected: "play_music", authorized: true },
    { message: "播放音乐", expected: "play_music", authorized: true },
    { message: "随便放一首歌", expected: "play_music", authorized: false },
  ];
  const results = cases.map(item => {
    const result = inferLocalGlobalAction(item.message, projects, groups, {});
    const actual = result?.action?.type || null;
    const targetCount = Array.isArray(result?.action?.params?.targets) ? result.action.params.targets.length : 0;
    const targetCountPassed = item.expectedTargetCount === undefined || targetCount === item.expectedTargetCount;
    const actualAuthorized = hasExplicitGlobalWriteAuthorization(item.message);
    const authorizationPassed = item.authorized === undefined || actualAuthorized === item.authorized;
    return { ...item, actual, targetCount, actualAuthorized, passed: actual === item.expected && targetCountPassed && authorizationPassed };
  });
  const visibleChunks: string[] = [];
  const safeStreamer = createActionBlockSafeStreamer(text => visibleChunks.push(text));
  for (const chunk of ["这是自然回答。\n`", "``act", "ion\n{\"type\":\"navigate\"}\n`", "``"]) safeStreamer.push(chunk);
  safeStreamer.finish();
  const visibleReply = visibleChunks.join("");
  const actionBlockHidden = visibleReply === "这是自然回答。\n";
  const modelUnavailableDelegation = localActionToAgenticDecision({ reply: "准备派发", action: { type: "send_group_cmd", params: { group_id: "dev-group", message: "修复登录" } } }, { steps: [], user_message: "给开发群派发修复登录", explicit_write_authorization: true } as any);
  const fallbackDelegationCannotWrite = modelUnavailableDelegation?.state === "answer" && !modelUnavailableDelegation.tool;
  const localGroupDispatch = inferLocalGlobalAction("给开发群派发任务，修复登录问题", projects, groups, {});
  const localGroupDispatchUsesSchema = localGroupDispatch?.action?.params?.group_id === "dev-group" && !("groupId" in (localGroupDispatch?.action?.params || {}));
  const modelUnavailableCronCreate = localActionToAgenticDecision({ reply: "准备创建定时任务", action: { type: "manage_cron", params: { operation: "create", name: "检查 backend-api", schedule: "0 8 * * *", prompt: "检查 backend-api" } } }, { steps: [], user_message: "创建一个每天早上八点检查 backend-api 的定时任务", explicit_write_authorization: true } as any);
  const fallbackCronCannotWrite = modelUnavailableCronCreate?.state === "answer" && !modelUnavailableCronCreate.tool;
  const modelUnavailableAmbiguousWrite = localActionToAgenticDecision({ reply: "准备派发", action: { type: "create_task", params: { title: "优化", business_goal: "帮我优化一下" } } }, { steps: [], user_message: "帮我优化一下", explicit_write_authorization: true } as any);
  const ambiguousFallbackCannotWrite = modelUnavailableAmbiguousWrite?.state === "answer" && !modelUnavailableAmbiguousWrite.tool;
  return { passed: results.every(item => item.passed) && actionBlockHidden && fallbackDelegationCannotWrite && localGroupDispatchUsesSchema && fallbackCronCannotWrite && ambiguousFallbackCannotWrite, results, actionBlockHidden, fallbackDelegationCannotWrite, localGroupDispatchUsesSchema, fallbackCronCannotWrite, ambiguousFallbackCannotWrite, visibleReply };
}

function decryptFeishuEvent(encrypted: string, encryptKey: string): any {
  const key = crypto.createHash("sha256").update(encryptKey).digest();
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.alloc(16));
  decipher.setAutoPadding(true);
  const plain = Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
  return JSON.parse(plain);
}

function normalizeFeishuEventPayload(payload: any, config: any): any {
  if (!payload?.encrypt) return payload;
  const encryptKey = String(config.control_bot_encrypt_key || "").trim();
  if (!encryptKey) throw new Error("收到加密事件，但尚未配置 Encrypt Key");
  return decryptFeishuEvent(String(payload.encrypt), encryptKey);
}

function verifyFeishuEventToken(payload: any, config: any) {
  const expected = String(config.control_bot_verification_token || "").trim();
  if (!expected) throw new Error("控制机器人尚未配置 Verification Token");
  const actual = String(payload?.token || payload?.header?.token || "").trim();
  if (!actual || actual !== expected) throw new Error("飞书事件 Verification Token 校验失败");
}

function extractFeishuMessageText(payload: any): string {
  const message = payload?.event?.message || {};
  if (message.message_type !== "text") return "";
  let content: any = {};
  try { content = JSON.parse(String(message.content || "{}")); } catch {}
  return String(content.text || "")
    .replace(/@_user_\d+/g, "")
    .replace(/<at[^>]*>.*?<\/at>/gi, "")
    .trim();
}

function extractCcConnectHookText(payload: any): string {
  const candidates = [
    payload?.message?.text,
    payload?.message?.content,
    payload?.message,
    payload?.text,
    payload?.content,
    payload?.prompt,
    payload?.data?.message?.text,
    payload?.data?.message?.content,
    payload?.data?.text,
    payload?.data?.content,
    payload?.event?.message?.text,
    payload?.event?.message?.content,
  ];
  for (const item of candidates) {
    if (typeof item === "string" && item.trim()) {
      let text = item.trim();
      if (/^\{/.test(text)) {
        try {
          const parsed = JSON.parse(text);
          text = String(parsed.text || parsed.content || text).trim();
        } catch {}
      }
      return text
        .replace(/@_user_\d+/g, "")
        .replace(/<at[^>]*>.*?<\/at>/gi, "")
        .trim();
    }
  }
  return "";
}

function getRequestBaseUrl(req: any): string {
  const port = Number(req.socket?.localPort || 3080);
  return `http://127.0.0.1:${port}`;
}

async function callLocalApi(baseUrl: string, pathname: string, options: any = {}): Promise<any> {
  const response = await fetch(baseUrl + pathname, options);
  const data = await response.json() as any;
  if (!response.ok || data?.success === false || data?.error) {
    throw new Error(data?.error || `接口执行失败 (${response.status})`);
  }
  return data;
}

function postLocalApi(baseUrl: string, pathname: string, body: any): Promise<any> {
  return callLocalApi(baseUrl, pathname, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
}

function formatMissionStatus(): string {
  const missions = refreshGlobalDevelopmentMissions();
  if (!missions.length) return "当前还没有全局开发任务。";
  const rows = missions.slice(-8).reverse().map((mission: any) => {
    const summary = mission.mission_summary || {};
    const total = Number(summary.total || mission.child_task_ids?.length || 0);
    const completed = Number(summary.completed || 0);
    const failed = Number(summary.failed || 0);
    const blocked = Number(summary.blocked || 0);
    const details = [`${completed}/${total} 已完成`];
    if (failed > 0) details.push(`${failed} 失败`);
    if (blocked > 0) details.push(`${blocked} 阻塞`);
    return `- ${mission.title || mission.id}：${mission.status || "unknown"}（${details.join("，")}）\n  ID: ${mission.id}`;
  });
  return `最近的全局开发任务：\n${rows.join("\n")}`;
}

function formatSystemStatus(): string {
  const projects = getConfigs();
  const groups = loadGroups();
  const tasks = loadTasks();
  const cronJobs = loadCronJobs();
  const activeTasks = tasks.filter((item: any) => ["pending", "queued", "in_progress", "running"].includes(String(item.status))).length;
  return [
    "CCM 当前状态：",
    `- 项目：${projects.length} 个`,
    `- 协作群聊：${groups.length} 个`,
    `- 开发任务：${tasks.length} 个，活跃 ${activeTasks} 个`,
    `- 定时任务：${cronJobs.length} 个，启用 ${cronJobs.filter((item: any) => item.enabled !== false).length} 个`,
  ].join("\n");
}

async function queueMusicPlayback(baseUrl: string, keyword: string): Promise<string> {
  const normalizedKeyword = parseMusicKeyword(keyword) || (/(播放|放一首|放|来一首|来点|听|听歌|音乐|歌曲|歌)/.test(keyword) ? RANDOM_MUSIC_KEYWORD : normalizeText(keyword));
  if (!normalizedKeyword) return "缺少要播放的歌曲或歌手关键词。";
  const result = await postLocalApi(baseUrl, "/api/music/remote-command", { keyword: normalizedKeyword, source: "feishu-global-agent" });
  const label = normalizedKeyword === RANDOM_MUSIC_KEYWORD ? "随机播放音乐" : `「${normalizedKeyword}」`;
  return `已把${label}发送给音乐播放器。请保持 CCM 音乐播放器页面打开，它会在后台自动检索并播放。${result.command?.id ? `\n- 指令 ID：${result.command.id}` : ""}`;
}

function fillCronParams(params: any, originalText: string, groups: any[] = [], projects: string[] = []) {
  const schedule = params.schedule || params.cron || guessCronSchedule(originalText);
  const namedFromText = (originalText.match(/(?:名字|名称|标题)(?:叫|为|是)?[「\"']?([^，。,.\n「\"']+)/)?.[1] || "").trim();
  const explicitName = namedFromText || String(params.name || params.title || "").trim();
  const cleanedPrompt = originalText
    .replace(/(?:名字|名称|标题)(?:叫|为|是)?[「\"']?([^，。,.\n「\"']+)/g, "")
    .replace(/创建|新建|添加|一个|定时任务|计划任务/g, "")
    .replace(/^[：:，,\s]+/, "")
    .trim();
  const paramPrompt = String(params.prompt || params.message || params.command || "").trim();
  const prompt = (paramPrompt && !/名字|名称|标题/.test(paramPrompt) ? paramPrompt : "") || cleanedPrompt || originalText;
  const name = explicitName || prompt.slice(0, 28) || "全局助手定时任务";
  const targetType = params.target_type || params.targetType || (params.group_id || params.groupId ? "group" : (params.project ? "project" : (groups[0] ? "group" : "project")));
  const groupId = params.group_id || params.groupId || (targetType === "group" ? groups[0]?.id : undefined);
  const project = params.project || params.projectName || (targetType === "project" ? projects[0] : undefined);
  return { ...params, operation: params.operation || "create", name, schedule, prompt, target_type: targetType, group_id: groupId, project, workflow_type: params.workflow_type || params.workflowType || "general", enabled: params.enabled !== false };
}

async function executeFeishuManagementAction(baseUrl: string, action: any, originalText = ""): Promise<string> {
  let params = { ...(action.params || {}) };
  const groups = loadGroups();
  const projects = getConfigs().map(c => c.name);
  const operation = params.operation || (action.type === "system_status" ? "inspect" : "");
  if (action.type === "manage_cron" && operation === "create") {
    params = fillCronParams(params, originalText, groups, projects);
    action = { ...action, params, needs_user_input: false, validated: true, missing_params: [] };
  }
  if ((action.requires_confirmation || ["delete", "remove_member"].includes(operation)) && action.confirmed !== true) {
    return "这是一条高风险操作，控制机器人不会直接执行。请到 CCM 全局助手界面确认后操作。";
  }
  if (action.needs_user_input || action.validated === false) {
    return `还缺少参数：${(action.missing_params || []).join("、") || "必要参数"}。请补充后重新发送。`;
  }
  let result: any;
  if (action.type === "system_status") return formatSystemStatus();
  if (action.type === "manage_cron") {
    if (operation === "list") result = await callLocalApi(baseUrl, "/api/cron");
    else if (operation === "create") result = await postLocalApi(baseUrl, "/api/cron/create", fillCronParams(params, originalText, groups, projects));
    else if (operation === "update") result = await postLocalApi(baseUrl, "/api/cron/update", params);
    else if (operation === "enable" || operation === "disable") result = await postLocalApi(baseUrl, "/api/cron/update", { id: params.id, enabled: operation === "enable" });
    else if (operation === "run") result = await postLocalApi(baseUrl, "/api/cron/run", { id: params.id });
    else if (operation === "delete") result = await postLocalApi(baseUrl, "/api/cron/delete", { id: params.id });
  } else if (action.type === "manage_task") {
    const id = params.id || params.task_id;
    if (operation === "list") result = await callLocalApi(baseUrl, "/api/tasks");
    else if (operation === "pause") result = await postLocalApi(baseUrl, "/api/tasks/update", { id, status: "paused", status_detail: "由飞书全局 Agent 暂停" });
    else if (operation === "resume") {
      await postLocalApi(baseUrl, "/api/tasks/update", { id, status: "pending", status_detail: "由飞书全局 Agent 恢复" });
      result = await postLocalApi(baseUrl, "/api/tasks/queue", { task_id: id });
    } else if (operation === "continue") result = await postLocalApi(baseUrl, "/api/tasks/continue", { id, message: params.message || "由飞书全局 Agent 继续推进", auto_execute: true, idempotency_key: params.idempotency_key });
    else if (operation === "retry") result = await postLocalApi(baseUrl, "/api/tasks/retry", { id, reason: params.message || "由飞书全局 Agent 发起重试", auto_execute: true, idempotency_key: params.idempotency_key });
    else if (operation === "queue") result = await postLocalApi(baseUrl, "/api/tasks/queue", { task_id: id });
    else if (operation === "delete") result = await postLocalApi(baseUrl, "/api/tasks/delete", { id });
  } else if (action.type === "manage_project") {
    const project = params.project || params.name;
    if (operation === "list") result = await callLocalApi(baseUrl, "/api/projects");
    else if (operation === "create") result = await postLocalApi(baseUrl, "/api/projects/create", params);
    else if (operation === "update") result = await postLocalApi(baseUrl, "/api/projects/update", { ...params, name: project });
    else if (operation === "start") result = await postLocalApi(baseUrl, "/api/start", { project, agent: params.agent });
    else if (operation === "stop") result = await postLocalApi(baseUrl, "/api/stop", { project });
    else if (operation === "delete") result = await postLocalApi(baseUrl, "/api/projects/delete", { name: project });
  } else if (action.type === "manage_group") {
    if (operation === "list") result = await callLocalApi(baseUrl, "/api/groups");
    else if (operation === "create") result = await postLocalApi(baseUrl, "/api/groups/create", { name: params.name, members: params.members || (params.project ? [{ project: params.project }] : []) });
    else if (operation === "rename") result = await postLocalApi(baseUrl, "/api/groups/rename", { id: params.id || params.group_id, name: params.name });
    else if (operation === "add_member") result = await postLocalApi(baseUrl, "/api/groups/members", { id: params.id || params.group_id, add: params.members || [{ project: params.project }] });
    else if (operation === "remove_member") result = await postLocalApi(baseUrl, "/api/groups/members", { id: params.id || params.group_id, remove: params.projects || [params.project] });
    else if (operation === "delete") result = await postLocalApi(baseUrl, "/api/groups/delete", { id: params.id || params.group_id });
  } else if (action.type === "manage_tool") {
    const kind = params.kind === "skill" ? "skill" : "mcp";
    if (operation === "status") result = await callLocalApi(baseUrl, "/api/tools/status");
    else if (operation === "reload") result = await postLocalApi(baseUrl, "/api/tools/reload", {});
    else if (operation === "list") result = await callLocalApi(baseUrl, kind === "skill" ? "/api/skills" : "/api/mcp");
    else if (operation === "create") {
      const payload = { ...params }; delete payload.operation; delete payload.kind;
      result = await postLocalApi(baseUrl, kind === "skill" ? "/api/skills" : "/api/mcp", payload);
    }
    else if (operation === "delete") result = await postLocalApi(baseUrl, kind === "skill" ? "/api/skills/delete" : "/api/mcp/delete", { name: params.name });
  }
  if (!result) throw new Error(`暂不支持从飞书执行 ${action.type}/${operation}`);
  if (action.type === "manage_cron" && operation === "create") {
    const cronParams = fillCronParams(params, originalText, loadGroups(), getConfigs().map(c => c.name));
    return `定时任务已创建：${result.job?.name || cronParams.name || "未命名任务"}\n- Cron：${result.job?.schedule || cronParams.schedule}\n- 提示词：${result.job?.prompt || cronParams.prompt}`;
  }
  const count = result.jobs?.length ?? result.tasks?.length ?? result.projects?.length ?? result.groups?.length;
  return count === undefined ? `操作已完成：${action.type}/${operation}` : `查询完成：${count} 条记录。`;
}

async function executeFeishuAction(baseUrl: string, action: any, originalText = "", traceId = ""): Promise<string> {
  if (!action?.type) return "";
  if (GLOBAL_MANAGEMENT_ACTIONS[action.type]) return executeFeishuManagementAction(baseUrl, { ...action, params: { ...(action.params || {}), idempotency_key: traceId || action.params?.idempotency_key } }, originalText);
  const params = action.params || {};
  if (action.type === "play_music") {
    return queueMusicPlayback(baseUrl, params.keyword || params.query || params.song || originalText);
  }
  if (action.type === "toggle_pet") {
    const operation = params.action || params.operation || "open";
    const result = await postLocalApi(baseUrl, operation === "close" ? "/api/pets/close" : "/api/pets/launch", {});
    return result.success === false ? `桌面宠物控制失败：${result.error || "未知错误"}` : `桌面宠物已${operation === "close" ? "关闭" : "打开"}。`;
  }
  if (action.type === "navigate") {
    return `页面跳转「${params.tab || params.page || ""}」只能在 Web 控制台内执行；飞书端已记录该意图，请在 CCM 页面切换查看。`;
  }
  if (action.type === "create_cron_task") {
    const groups = loadGroups();
    const projects = getConfigs().map(c => c.name);
    const cronParams = fillCronParams(params, originalText, groups, projects);
    const result = await postLocalApi(baseUrl, "/api/cron/create", cronParams);
    return `定时任务已创建：${result.job?.name || cronParams.name || "未命名任务"}\n- Cron：${cronParams.schedule}\n- 提示词：${cronParams.prompt}`;
  }
  if (action.type === "orchestrate_development") {
    const result = await postLocalApi(baseUrl, "/api/global-agent/orchestrate", {
      ...params,
      title: params.title || "飞书下发的全局开发任务",
      business_goal: params.business_goal || params.goal || params.title,
      source_documents: params.documents || params.source_documents || "",
      auto_execute: true,
      source: "feishu-control-bot",
      trace_id: traceId,
      idempotency_key: traceId ? `feishu:${traceId}` : undefined,
    });
    return `全局开发任务已建立并开始派发。\n- 标题：${result.mission?.title || params.title}\n- 任务 ID：${result.mission?.id}\n- 执行目标：${result.children?.length || 0} 个`;
  }
  if (action.type === "create_task") {
    const result = await postLocalApi(baseUrl, "/api/tasks/create-daily-dev", {
      title: params.title || "飞书下发的开发任务",
      group_id: params.group_id || params.groupId,
      business_goal: params.business_goal || params.businessGoal || params.title,
      scope: params.scope || "",
      documents: params.documents || "",
      acceptance: params.acceptance || "子 Agent 提供回执；主 Agent 输出最终报告",
      persist_documents: true,
      auto_execute: true,
      trace_id: traceId,
      idempotency_key: traceId ? `feishu:${traceId}` : undefined,
    });
    return `协作任务已派发并进入自动执行队列。\n- 任务 ID：${result.task?.id || result.id || "已创建"}`;
  }
  if (action.type === "send_group_cmd") {
    const result = await postLocalApi(baseUrl, "/api/groups/send", {
      group_id: params.group_id || params.groupId,
      target_project: params.target_project || params.targetProject || "coordinator",
      message: params.message || params.prompt || params.command,
      trace_id: traceId,
      client_message_id: traceId ? `feishu-${traceId}` : undefined,
    });
    return `群聊主 Agent 已收到指令。${result.reply ? `\n\n主 Agent 回执：\n${String(result.reply).slice(0, 1200)}` : ""}`;
  }
  if (action.type === "send_project_cmd") {
    const result = await postLocalApi(baseUrl, "/api/send", { project: params.project || params.projectName, message: params.message || params.prompt || params.command });
    return `项目 Agent 已执行指令。\n${String(result.output || "已完成").slice(0, 1500)}`;
  }
  if (action.type === "create_cron_task") {
    const result = await postLocalApi(baseUrl, "/api/cron/create", params);
    return `定时任务已创建：${result.job?.name || params.name || "未命名任务"}（${params.schedule}）`;
  }
  return `已识别动作 ${action.type}，但它不适合从飞书远程执行。`;
}

function hasExplicitGlobalWriteAuthorization(message: string) {
  const text = normalizeText(message);
  if (!text) return false;
  if (/(?:不要|不用|先别|暂时别|仅|只)(?:执行|操作|修改|创建|派发|启动|停止|删除|提交)/.test(text)) return false;
  if (hasExplicitDevelopmentExecutionIntent(text)) return true;
  const explicitVerb = /(创建|新建|添加|派发|启动|开启|停止|关闭|暂停|恢复|继续|重试|提交|删除|移除|播放|打开|运行|执行)/;
  const explicitAuthorization = /(?:我)?明确授权(?:你|系统|全局Agent|全局agent)?/.test(text) && explicitVerb.test(text);
  const directive = explicitVerb.test(text) && (/^(请|帮我|麻烦|给我|直接|立即|马上|开始|创建|新建|添加|派发|启动|开启|停止|关闭|暂停|恢复|继续|重试|提交|删除|移除|播放|打开|运行|执行)/.test(text) || /(?:我要你|需要你|由你|替我)/.test(text));
  const explicitDispatch = /^(?:请)?给.+(?:群|项目|Agent|agent).*(?:派发|下发|修复|实现|修改|处理|执行)/.test(text);
  const explicitGenericTarget = /^给(?:某个|这个|该)?(?:项目|群聊|Agent|agent).*(?:加|新增|实现|修改|修复|处理|执行)/.test(text);
  const explanatory = /(?:怎么|如何|为什么|是什么|原理|介绍|讲讲|说明|能否|能不能|可不可以|是否|有哪些|有什么)[^。！？]*[?？]?$/i.test(text);
  return (explicitAuthorization || directive || explicitDispatch || explicitGenericTarget) && !explanatory;
}

function safeProjectRows() {
  return getConfigs().map((config: any) => {
    const info = getConfigInfo(config.path)?.[0] || {};
    return {
      name: config.name,
      work_dir: info.workDir || "",
      agent: info.agent || "claudecode",
      platform: info.platform || "",
    };
  });
}

function compactTask(task: any) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    status_detail: task.status_detail,
    group_id: task.group_id,
    target_project: task.target_project,
    updated_at: task.updated_at || task.completed_at || task.created_at,
    trace_id: task.trace_id,
  };
}

function buildAgenticContext(query = "", sessionId = "") {
  const tasks = loadTasks();
  const groups = loadGroups();
  return {
    projects: safeProjectRows(),
    groups: groups.map((group: any) => ({ id: group.id, name: group.name, members: (group.members || []).map((member: any) => ({ project: member.project, agent: member.agent })) })),
    task_summary: {
      total: tasks.length,
      active: tasks.filter((task: any) => ["pending", "queued", "in_progress", "running"].includes(String(task.status))).length,
      recent: tasks.slice(-12).map(compactTask),
    },
    cron_jobs: loadCronJobs().map((job: any) => ({ id: job.id, name: job.name, schedule: job.schedule, enabled: job.enabled !== false, target_type: job.target_type, group_id: job.group_id, project: job.project })),
    tools: {
      mcp: loadMcpTools().map((tool: any) => tool.name),
      skills: loadSkills().map((skill: any) => skill.name),
    },
    global_memory: query ? buildGlobalAgentMemoryPacket(query, { sessionId, limit: 7 }) : "",
  };
}

function localActionToAgenticDecision(localIntent: LocalIntentResult | null, run: GlobalAgentRun): GlobalAgentDecision | null {
  if (run.steps.length > 0) {
    const last = run.steps[run.steps.length - 1];
    return {
      state: "complete",
      message: last.error ? `操作未完成：${last.error}` : `${localIntent?.reply || "操作已完成。"}\n\n执行观察：${JSON.stringify(last.observation || {}).slice(0, 1800)}`,
      tool: null,
      completion: { evidence: last.error ? [] : [`工具 ${last.tool?.name || "unknown"} 已返回执行结果`], risks: last.error ? [last.error] : [] },
    };
  }
  if (!localIntent?.action?.type) {
    return { state: "answer", message: "当前统一大模型不可用。我不会依据关键词擅自操作项目；请先检查统一大模型配置后再试。", tool: null };
  }
  const action = localIntent.action;
  const toolName = action.type === "system_status" ? "inspect_system" : action.type;
  if (!GLOBAL_AGENT_TOOL_SPECS.some(spec => spec.name === toolName)) {
    return { state: "answer", message: `${localIntent.reply}\n\n当前动作还没有接入 Agentic Loop 后端工具，未执行。`, tool: null };
  }
  const spec = GLOBAL_AGENT_TOOL_SPECS.find(item => item.name === toolName)!;
  const fallbackRisk = typeof spec.risk === "function" ? spec.risk(action.params || {}) : spec.risk;
  const deterministicUiTools = new Set(["play_music", "toggle_pet", "navigate"]);
  if (fallbackRisk !== "read" && !deterministicUiTools.has(toolName)) {
    return {
      state: "answer",
      message: "当前统一大模型不可用。规则兜底只允许只读查询和界面动作，不会依据关键词执行任何数据写入、任务派发或项目修改。请恢复统一大模型配置后再执行该操作。",
      tool: null,
      intent: { category: "ambiguous", goal: run.user_message, action_required: false, confidence: 0.2, authorization_basis: "none", reason: "模型不可用，禁止关键词规则代替语义决策执行写操作" },
    };
  }
  return { state: "execute", message: localIntent.reply, tool: { name: toolName, arguments: action.params || {} } };
}

function createMissionSupervisorRuntime(ctx: CollabCtx): GlobalMissionSupervisorRuntime {
  return {
    inspectMission: (missionId) => getGlobalDevelopmentMission(missionId),
    advanceMission: (missionId, options) => superviseGlobalDevelopmentMissionCycle(missionId, ctx, options),
    controlMission: (missionId, operation, payload) => controlGlobalDevelopmentMission(missionId, operation, ctx, payload),
    onCompleted: async (record, report) => {
      const formatted = formatGlobalMissionFinalReport(report);
      recordGlobalMissionMemory({ missionId: record.mission_id, sessionId: record.session_id, traceId: record.trace_id, source: record.source, status: "completed", report });
      if (record.global_run_id) completeGlobalAgentSupervision(record.global_run_id, { ...report, formatted }, "completed");
      if (/feishu/i.test(record.source)) {
        await sendFeishuReportMessage({ title: "全局 Agent 最终交付报告", markdown: formatted });
      }
    },
    onProgress: async (record, event) => {
      if (event?.type === "waiting_user") recordGlobalMissionMemory({ missionId: record.mission_id, sessionId: record.session_id, traceId: record.trace_id, source: record.source, status: "waiting_user", report: { summary: `全局任务等待人工处理`, remaining_items: (event.items || []).map((item: any) => item.reason || item.task_id) } });
      if (record.global_run_id && event?.type === "waiting_user") updateGlobalAgentSupervisionState(record.global_run_id, "waiting_user");
      if (event?.type !== "waiting_user" || !/feishu/i.test(record.source)) return;
      const lines = (event.items || []).map((item: any) => `- ${item.task_id || "任务"}: ${item.reason || "需要人工处理"}`);
      await sendFeishuReportMessage({ title: "全局 Agent 等待人工处理", markdown: `全局任务 ${record.mission_id} 自动恢复已达到安全上限：\n${lines.join("\n")}` });
    },
    onTerminal: async (record, outcome, report) => {
      recordGlobalMissionMemory({ missionId: record.mission_id, sessionId: record.session_id, traceId: record.trace_id, source: record.source, status: outcome, report });
      if (record.global_run_id) completeGlobalAgentSupervision(record.global_run_id, report, outcome);
      if (/feishu/i.test(record.source)) {
        await sendFeishuReportMessage({ title: outcome === "cancelled" ? "全局任务已取消" : "全局任务监督失败", markdown: report?.summary || "全局任务未完成" });
      }
    },
  };
}

async function executeAgenticTool(baseUrl: string, ctx: CollabCtx, name: string, args: any, run: GlobalAgentRun) {
  const signature = crypto.createHash("sha256").update(`${name}:${JSON.stringify(args || {})}`).digest("hex").slice(0, 24);
  const operationKey = `${run.id}:${signature}`;
  const operation = acquireIdempotency({
    scope: "global-agent-tool",
    key: operationKey,
    traceId: run.trace_id,
    leaseMs: 12 * 60 * 1000,
    metadata: { run_id: run.id, tool: name },
  });
  if (!operation.acquired) {
    const settled = operation.inProgress ? await waitForIdempotencyResult("global-agent-tool", operationKey, 12 * 60 * 1000) : operation.record;
    if (settled?.status === "completed") return { ...(settled.result?.observation || settled.result || {}), replayed: true };
    if (settled?.status === "failed") throw new Error(settled.error || `工具 ${name} 的历史执行失败`);
    throw new Error(`工具 ${name} 仍在另一个执行实例中运行`);
  }

  try {
    let observation: any;
    if (name === "inspect_system") {
      observation = { success: true, ...buildAgenticContext(), missions: refreshGlobalDevelopmentMissions().slice(-8) };
    } else if (name === "list_projects") {
      observation = { success: true, projects: safeProjectRows() };
    } else if (name === "inspect_project") {
      const project = String(args.project || "");
      const config = getConfigs().find((item: any) => item.name === project);
      if (!config) throw new Error(`项目不存在：${project}`);
      const info = getConfigInfo(config.path)?.[0] || {};
      observation = {
        success: true,
        project,
        config: { work_dir: info.workDir || "", agent: info.agent || "claudecode", platform: info.platform || "" },
        memory: buildProjectMemoryPacket(project, { workDir: info.workDir, query: run.user_message }),
      };
    } else if (name === "list_groups") {
      observation = { success: true, groups: buildAgenticContext().groups };
    } else if (name === "list_tasks") {
      const tasks = loadTasks().filter((task: any) => !args.id || task.id === args.id).filter((task: any) => !args.status || task.status === args.status);
      observation = { success: true, tasks: tasks.slice(-50).map(compactTask) };
    } else if (name === "list_cron") {
      observation = { success: true, jobs: buildAgenticContext().cron_jobs };
    } else if (name === "query_knowledge") {
      observation = { success: true, query: args.query, content: queryKnowledgeBase(String(args.query || "")) || "未检索到相关知识" };
    } else if (name === "query_global_memory") {
      observation = { success: true, query: args.query, ...recallGlobalAgentMemory(String(args.query || ""), { sessionId: run.session_id, limit: Number(args.limit || 8) }) };
    } else if (name === "manage_global_memory") {
      const operation = String(args.operation || "").toLowerCase();
      if (operation !== "status" && !String(args.reason || "").trim()) throw new Error("全局记忆变更操作必须说明原因");
      if (operation === "compact") {
        observation = { success: true, operation, sessions: loadGlobalAgentMemory().sessions.map((session: any) => compactGlobalAgentSession(session.sessionId, { force: true, reason: args.reason })) };
      } else if (operation === "rebuild") {
        observation = { success: true, operation, memory: rebuildGlobalAgentMemory(args.reason, "global-agent") };
      } else if (["enable", "disable"].includes(operation)) {
        observation = { success: true, operation, policy: setGlobalAgentMemoryPolicy({ disabled: operation === "disable", reason: args.reason, actor: "global-agent" }) };
      } else if (operation === "status") {
        observation = { success: true, operation, policy: getGlobalAgentMemoryPolicy(), memory: loadGlobalAgentMemory() };
      } else throw new Error(`不支持的全局记忆操作：${operation}`);
    } else if (name === "inspect_mission") {
      const mission = getGlobalDevelopmentMission(String(args.id || ""));
      if (!mission) throw new Error("全局开发任务不存在");
      observation = { success: true, ...mission, supervisor: getGlobalMissionSupervisor(String(args.id || "")) };
    } else if (name === "inspect_supervision") {
      const supervisor = getGlobalMissionSupervisor(String(args.id || ""));
      if (!supervisor) throw new Error("全局任务监工不存在");
      observation = { success: true, supervisor, mission: getGlobalDevelopmentMission(supervisor.mission_id) };
    } else if (name === "orchestrate_development") {
      const missionResult = createGlobalDevelopmentMission({
        ...args,
        source: run.source || "global-agent",
        trace_id: run.trace_id,
        idempotency_key: args.idempotency_key || `${run.id}:mission`,
      }, ctx);
      const supervisor = startGlobalMissionSupervisor({
        mission_id: missionResult.mission.id,
        global_run_id: run.id,
        trace_id: run.trace_id,
        session_id: run.session_id,
        source: run.source,
        business_goal: missionResult.mission.business_goal || args.business_goal,
        acceptance: missionResult.mission.acceptance_criteria || args.acceptance,
        max_attempts: args.max_attempts || 3,
      });
      attachGlobalAgentRunSupervision(run, { mission_id: missionResult.mission.id, supervisor_id: supervisor.id, state: supervisor.status });
      observation = {
        success: true,
        accepted: true,
        completed: false,
        message: "全局任务已派发并进入持久监督；当前不是完成状态。",
        mission_id: missionResult.mission.id,
        supervisor_id: supervisor.id,
        supervisor_status: supervisor.status,
        children: missionResult.children.map((item: any) => ({ task_id: item.task?.id, target: item.target?.name, queued: item.queue_result?.queued, status: item.task?.status })),
        rejected: missionResult.rejected,
      };
    } else if (name === "manage_supervision") {
      const supervisor = await controlGlobalMissionSupervisor(String(args.id || ""), String(args.operation || ""), createMissionSupervisorRuntime(ctx), args);
      if (supervisor.global_run_id) {
        if (supervisor.status === "cancelled") completeGlobalAgentSupervision(supervisor.global_run_id, { summary: "全局任务已由用户取消。" }, "cancelled");
        else updateGlobalAgentSupervisionState(supervisor.global_run_id, supervisor.status);
      }
      observation = { success: true, supervisor, mission: getGlobalDevelopmentMission(supervisor.mission_id) };
    } else if (name === "navigate") {
      observation = { success: true, message: `Web 客户端可切换到 ${args.tab}`, client_effect: { type: "navigate", params: { tab: args.tab } } };
    } else if (name === "git_review") {
      observation = await postLocalApi(baseUrl, "/api/global-agent/git-review", { project: args.project });
    } else if (name === "git_commit") {
      observation = await postLocalApi(baseUrl, "/api/git/commit", { project: args.project, message: args.message || "chore: 由全局 Agent 提交变更", files: args.files || [] });
    } else if (name === "create_template") {
      observation = await postLocalApi(baseUrl, "/api/templates", { name: args.name, category: args.category || "custom", prompt: args.content || args.prompt || "" });
    } else {
      let action: any = { type: name, params: { ...(args || {}) } };
      if (GLOBAL_MANAGEMENT_ACTIONS[name]) {
        action = annotateGlobalAction(action);
        if (action.validated === false) throw new Error(`缺少参数：${(action.missing_params || []).join("、")}`);
        action.confirmed = true;
      }
      const summary = await executeFeishuAction(baseUrl, action, run.user_message, run.trace_id);
      observation = { success: true, summary };
    }
    completeIdempotency("global-agent-tool", operationKey, { observation });
    return observation;
  } catch (error: any) {
    failIdempotency("global-agent-tool", operationKey, error);
    throw error;
  }
}

function createAgenticRuntime(baseUrl: string, ctx: CollabCtx, input: { localIntent?: LocalIntentResult | null; onEvent?: (event: any) => void } = {}): GlobalAgentLoopRuntime {
  const config = loadOrchestratorConfig();
  return {
    callModel: async (messages) => {
      if (!config.apiKey || !config.apiUrl || !config.model) throw new Error("统一大模型尚未配置");
      return callLlm(config, messages);
    },
    getContext: (run) => buildAgenticContext(run.user_message, run.session_id),
    executeTool: (name, args, run) => executeAgenticTool(baseUrl, ctx, name, args, run),
    fallbackDecision: (run) => localActionToAgenticDecision(input.localIntent || null, run),
    onEvent: input.onEvent ? (event) => input.onEvent!(event) : undefined,
  };
}

async function runAgenticGlobalRequest(baseUrl: string, ctx: CollabCtx, input: {
  message: string;
  history?: any[];
  sessionId?: string;
  source?: string;
  traceId?: string;
  onEvent?: (event: any) => void;
}) {
  const projects = getConfigs().map((item: any) => item.name);
  const groups = loadGroups();
  const localIntent = inferLocalGlobalAction(input.message, projects, groups, { cronJobs: loadCronJobs(), tasks: loadTasks(), mcpTools: loadMcpTools(), skills: loadSkills() });
  const runtime = createAgenticRuntime(baseUrl, ctx, { localIntent, onEvent: input.onEvent });
  const sessionId = input.sessionId || "default";
  if (!/feishu/i.test(input.source || "")) {
    try {
      ingestGlobalAgentConversation({ sessionId, source: input.source || "web", messages: [...(input.history || []), { role: "user", content: input.message, timestamp: new Date().toISOString(), trace_id: input.traceId }] });
    } catch (error: any) {
      console.warn(`[全局记忆] Agentic 请求写入失败：${error?.message || error}`);
    }
  }
  const startsNewTopic = /^(?:新问题|换个问题|另外(?:一个)?问题|忽略刚才|取消刚才|重新开始)/.test(String(input.message || "").trim());
  const waitingClarification = startsNewTopic ? null : findClarifyingGlobalAgentRun(sessionId);
  const run = waitingClarification
    ? await continueGlobalAgentRunWithClarification(waitingClarification.id, input.message, runtime, {
        explicitWriteAuthorization: hasExplicitGlobalWriteAuthorization(input.message),
      })
    : await startGlobalAgentRun({
        message: input.message,
        history: input.history || [],
        sessionId,
        source: input.source || "web",
        traceId: input.traceId,
        explicitWriteAuthorization: hasExplicitGlobalWriteAuthorization(input.message),
        maxSteps: 10,
        timeoutMs: 12 * 60 * 1000,
      }, runtime);
  if (!/feishu/i.test(input.source || "")) {
    try {
      ingestGlobalAgentConversation({ sessionId, source: input.source || "web", messages: [{ role: "assistant", content: run.final_reply || "", timestamp: new Date().toISOString(), trace_id: run.trace_id, mission_id: run.mission_id }] });
    } catch (error: any) {
      console.warn(`[全局记忆] Agentic 回执写入失败：${error?.message || error}`);
    }
  }
  return run;
}

export async function resumeGlobalAgentLoopsForServer(ctx: CollabCtx, port: number) {
  const result = await recoverInterruptedGlobalAgentRuns(createAgenticRuntime(`http://127.0.0.1:${port}`, ctx));
  for (const run of result.results || []) {
    if (!["completed", "failed", "cancelled"].includes(run.status)) continue;
    settleIdempotencyByTrace(
      run.trace_id,
      run.status === "completed" ? "completed" : "failed",
      { run_id: run.id, status: run.status, recovered: true },
      ["global-agent-request", "feishu-control-message", "feishu-event"],
    );
  }
  return result;
}

export function startGlobalMissionSupervisionForServer(ctx: CollabCtx) {
  return startGlobalMissionSupervisorScheduler(createMissionSupervisorRuntime(ctx));
}

export function bootstrapGlobalAgentMemoryForServer() {
  const store = loadGlobalAgentHistoryStore();
  const results: any[] = [];
  for (const session of store.sessions || []) {
    try {
      results.push(ingestGlobalAgentConversation({ sessionId: session.id, source: session.source || "history-migration", messages: session.messages || [] }));
    } catch (error: any) {
      results.push({ sessionId: session.id, error: error?.message || String(error) });
    }
  }
  return { total: (store.sessions || []).length, migrated: results.filter(item => !item.error).length, results };
}

export function stopGlobalMissionSupervisionForServer() {
  stopGlobalMissionSupervisorScheduler();
}

function publicGlobalAgentRun(run: GlobalAgentRun | null, includeObservations = false) {
  if (!run) return null;
  const steps = includeObservations ? run.steps : run.steps.map((step: any) => {
    if (step.observation === undefined) return step;
    let serialized = "";
    try { serialized = JSON.stringify(step.observation); } catch { serialized = String(step.observation); }
    return serialized.length <= 4_000 ? step : { ...step, observation: { truncated: true, preview: serialized.slice(0, 4_000), original_chars: serialized.length } };
  });
  return {
    id: run.id,
    trace_id: run.trace_id,
    session_id: run.session_id,
    source: run.source,
    status: run.status,
    phase: run.phase,
    explicit_write_authorization: run.explicit_write_authorization,
    created_at: run.created_at,
    updated_at: run.updated_at,
    completed_at: run.completed_at,
    deadline_at: run.deadline_at,
    max_steps: run.max_steps,
    steps,
    pending_tool: run.pending_tool,
    final_reply: run.final_reply,
    error: run.error,
    resume_count: run.resume_count,
    model_calls: run.model_calls,
    tool_calls: run.tool_calls,
    client_effects: run.client_effects,
    mission_id: run.mission_id,
    supervisor_id: run.supervisor_id,
    supervision_state: run.supervision_state,
    final_delivery_report: run.final_delivery_report,
    decision_summary: run.decision_summary,
    clarification_question: run.clarification_question,
    shadow_mode: run.shadow_mode,
    original_user_message: run.original_user_message,
    reasoning_loop: run.reasoning_loop,
    runtime_debug: buildGlobalAgentSessionDebug(run),
  };
}

async function processFeishuGlobalAgentMessage(baseUrl: string, ctx: CollabCtx, text: string, payload: any, options: { sendReport?: boolean; traceId?: string } = {}) {
  const sendReport = options.sendReport !== false;
  const traceId = ensureTraceId(options.traceId, "feishu");
  const conversationId = buildFeishuConversationId(payload);
  const historyBeforeUser = getGlobalAgentConversationMessages(conversationId);
  appendGlobalAgentConversationMessage(conversationId, "user", text, "feishu");
  const auditBase = {
    source: "feishu-control-bot",
    sender_id: payload?.event?.sender?.sender_id?.open_id || payload?.event?.sender?.sender_id?.user_id || payload?.sender?.id || "unknown",
    message_id: payload?.event?.message?.message_id || payload?.message?.id || "",
    trace_id: traceId,
  };
  appendTraceEvent(traceId, { id: `feishu:${getFeishuMessageId(payload) || crypto.randomBytes(4).toString("hex")}:received`, type: "feishu.message_received", status: "info", message: text.slice(0, 500), data: { conversation_id: conversationId, message_id: getFeishuMessageId(payload) } });
  try {
    if (/^(帮助|help|\/help)$/i.test(text)) {
      const markdown = "可以直接发送业务需求，也可以说：\n- 查看任务状态\n- 检查系统状态\n- 给某个群聊/项目 Agent 下发指令\n- 每天 9 点执行某项任务\n- 暂停、恢复或重试指定任务\n\n删除等高风险操作必须回到 CCM 界面确认。";
      if (sendReport) await sendFeishuReportMessage({ title: "全局 Agent 使用帮助", markdown });
      appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
      return markdown;
    }
    if (/^(任务状态|查看任务状态|全局任务|最近任务|\/status)$/i.test(text)) {
      const markdown = formatMissionStatus();
      appendGlobalActionAudit({ ...auditBase, action: { type: "mission_status", params: { message: text } }, status: "success", result: { summary: markdown } });
      if (sendReport) await sendFeishuReportMessage({ title: "全局任务状态", markdown });
      appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
      return markdown;
    }
    const confirmationMatch = text.match(/^(确认(?:执行)?|同意|取消)(?:\s+([a-z0-9_-]+))?[。！!\s]*$/i);
    let run: GlobalAgentRun;
    if (confirmationMatch) {
      const requestedId = String(confirmationMatch[2] || "").trim();
      const waiting = requestedId ? getGlobalAgentRun(requestedId) : findWaitingGlobalAgentRun(conversationId);
      if (!waiting || waiting.status !== "waiting_confirmation") {
        const markdown = "当前没有等待你确认的全局 Agent 操作。";
        appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
        if (sendReport) await sendFeishuReportMessage({ title: "全局 Agent", markdown });
        return markdown;
      }
      run = await resumeGlobalAgentRun(waiting.id, createAgenticRuntime(baseUrl, ctx), {
        approved: !/^取消/i.test(confirmationMatch[1]),
        cancelled: /^取消/i.test(confirmationMatch[1]),
      });
    } else {
      run = await runAgenticGlobalRequest(baseUrl, ctx, {
        message: text,
        history: historyBeforeUser.map((item: any) => ({ role: item.role, content: item.content })),
        sessionId: conversationId,
        source: "feishu-control-bot",
        traceId,
      });
    }
    const confirmationHint = run.status === "waiting_confirmation"
      ? `\n\n待确认操作：${run.pending_tool?.name || "写入操作"}\n运行 ID：${run.id}\n回复“确认 ${run.id}”继续，或回复“取消 ${run.id}”。`
      : "";
    const markdown = `${run.final_reply || "已处理。"}${confirmationHint}`;
    appendGlobalActionAudit({ ...auditBase, action: { type: "agentic_loop", params: { run_id: run.id } }, status: run.status, result: { summary: markdown, trace_id: run.trace_id, steps: run.steps.length } });
    appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
    if (sendReport) await sendFeishuReportMessage({ title: run.status === "waiting_confirmation" ? "全局 Agent 等待确认" : "全局 Agent 执行回执", markdown });
    return markdown;
  } catch (error: any) {
    const markdown = `指令：${text}\n\n错误：${error?.message || String(error)}`;
    appendGlobalActionAudit({ ...auditBase, action: { type: "feishu_command", params: { message: text } }, status: "failed", result: { error: error?.message || String(error) } });
    appendGlobalAgentConversationMessage(conversationId, "assistant", markdown, "feishu");
    if (sendReport) await sendFeishuReportMessage({ title: "全局 Agent 执行失败", markdown });
    return markdown;
  }
}
export function handleGlobalAgentApi(
  pathname: string,
  req: any,
  res: any,
  parsed: any,
  ctx: CollabCtx
): boolean {
  if (pathname === "/api/global-agent/history" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const store = syncGlobalAgentWebHistory(payload);
        sendJson(res, { success: true, sessions: store.sessions?.length || 0, current_session_id: store.current_session_id || "" });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || "全局 Agent 历史同步失败" }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/history" && req.method === "GET") {
    const store = loadGlobalAgentHistoryStore();
    sendJson(res, { success: true, ...store });
    return true;
  }

  if (pathname === "/api/global-agent/bridge/pending" && req.method === "GET") {
    const store = loadGlobalAgentBridgeStore();
    const pending = (store.requests || []).filter((item: any) => item.status === "pending").sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)))[0] || null;
    sendJson(res, { success: true, request: pending });
    return true;
  }

  if (pathname === "/api/global-agent/bridge/result" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const store = loadGlobalAgentBridgeStore();
        const request = (store.requests || []).find((item: any) => item.id === payload.id);
        if (!request) return sendJson(res, { success: false, error: "桥接请求不存在" }, 404);
        request.status = payload.success === false ? "failed" : "done";
        request.reply = String(payload.reply || payload.error || "已完成");
        request.error = payload.error || "";
        request.updated_at = new Date().toISOString();
        saveGlobalAgentBridgeStore(store);
        sendJson(res, { success: true });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || "桥接结果保存失败" }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/feishu/control-bot/message" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const isAcp = req.headers["x-ccm-acp"] === "1";
        const config = loadFeishuConfig();
        if (!isAcp) {
          const expected = String(config.control_bot_hook_token || "").trim();
          const actual = String(parsed.query.token || req.headers["x-ccm-token"] || "").trim();
          if (!expected || actual !== expected) {
            sendJson(res, { success: false, error: "控制机器人 Hook Token 校验失败" }, 401);
            return;
          }
        }
        const payload = body ? JSON.parse(body) : {};
        const text = extractCcConnectHookText(payload);
        if (!text) {
          sendJson(res, { success: false, error: "未从控制机器人载荷中识别到文本消息" }, 400);
          return;
        }
        const conversationId = buildFeishuConversationId(payload);
        const messageId = getFeishuMessageId(payload);
        const operationKey = messageId ? `${conversationId}:${messageId}` : "";
        const operation = operationKey ? acquireIdempotency({ scope: "feishu-control-message", key: operationKey, leaseMs: 11 * 60 * 1000, metadata: { conversation_id: conversationId, message_id: messageId } }) : null;
        if (operation && !operation.acquired) {
          const settled = operation.inProgress ? await waitForIdempotencyResult("feishu-control-message", operationKey) : operation.record;
          const replay = settled?.result || {};
          sendJson(res, { success: settled?.status === "completed", duplicate: true, message: "重复控制消息已抑制", reply: replay.reply || replay.error || "消息仍在处理中", trace_id: settled?.trace_id || operation.traceId });
          return;
        }
        const reply = await processFeishuGlobalAgentMessage(getRequestBaseUrl(req), ctx, text, payload, { sendReport: !isAcp, traceId: operation?.traceId });
        if (operationKey) completeIdempotency("feishu-control-message", operationKey, { reply });
        sendJson(res, { success: true, message: "控制机器人消息已处理", reply, trace_id: operation?.traceId || "" });
      } catch (error: any) {
        if (!res.headersSent) sendJson(res, { success: false, error: error?.message || "控制机器人消息处理失败" }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/feishu/bot/test" && req.method === "POST") {
    const config = loadFeishuConfig();
    const publicBaseUrl = String(config.control_bot_public_base_url || "").trim().replace(/\/$/, "");
    const verificationToken = String(config.control_bot_verification_token || "").trim();
    if (!publicBaseUrl || !/^https:\/\//i.test(publicBaseUrl)) {
      sendJson(res, { success: false, error: "请先填写可公网访问的 HTTPS 地址" }, 400);
      return true;
    }
    if (!verificationToken) {
      sendJson(res, { success: false, error: "请先填写 Verification Token" }, 400);
      return true;
    }
    const callbackUrl = publicBaseUrl + "/api/feishu/bot/event";
    const challenge = "ccm-" + Date.now().toString(36);
    void fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "url_verification", challenge, token: verificationToken }),
      signal: AbortSignal.timeout(10000),
    }).then(async (response) => {
      const data = await response.json() as any;
      if (!response.ok || data?.challenge !== challenge) throw new Error(data?.error || `回调响应异常 (${response.status})`);
      sendJson(res, { success: true, message: "控制机器人事件回调可用", callback_url: callbackUrl });
    }).catch((error: any) => {
      sendJson(res, { success: false, error: `无法访问事件回调：${error?.message || String(error)}` }, 400);
    });
    return true;
  }
  if (pathname === "/api/feishu/bot/event" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const config = loadFeishuConfig();
        const rawPayload = body ? JSON.parse(body) : {};
        const payload = normalizeFeishuEventPayload(rawPayload, config);
        verifyFeishuEventToken(payload, config);

        if (payload.type === "url_verification" || payload.challenge) {
          sendJson(res, { challenge: payload.challenge });
          return;
        }
        sendJson(res, { code: 0 });
        if (config.control_bot_enabled !== true) return;
        if (payload?.header?.event_type !== "im.message.receive_v1") return;
        if (payload?.event?.sender?.sender_type === "app") return;

        const messageId = getFeishuMessageId(payload);
        if (messageId && processedFeishuMessageIds.has(messageId)) return;
        if (messageId) {
          processedFeishuMessageIds.add(messageId);
          if (processedFeishuMessageIds.size > 1000) {
            const oldest = processedFeishuMessageIds.values().next().value;
            if (oldest) processedFeishuMessageIds.delete(oldest);
          }
        }
        const text = extractFeishuMessageText(payload);
        if (!text) {
          void sendFeishuReportMessage({ title: "全局 Agent", markdown: "目前控制机器人只处理文字消息，请把需求或指令以文字发送。" });
          return;
        }
        const operationKey = messageId || String(payload?.header?.event_id || "").trim();
        const operation = operationKey ? acquireIdempotency({ scope: "feishu-event", key: operationKey, leaseMs: 11 * 60 * 1000, metadata: { message_id: messageId, event_id: payload?.header?.event_id || "" } }) : null;
        if (operation && !operation.acquired) return;
        void processFeishuGlobalAgentMessage(getRequestBaseUrl(req), ctx, text, payload, { traceId: operation?.traceId })
          .then(reply => { if (operationKey) completeIdempotency("feishu-event", operationKey, { reply }); })
          .catch(error => { if (operationKey) failIdempotency("feishu-event", operationKey, error); });
      } catch (error: any) {
        if (!res.headersSent) sendJson(res, { code: 1, error: error?.message || "飞书事件处理失败" }, 401);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/capabilities" && req.method === "GET") {
    sendJson(res, {
      success: true,
      capabilities: Object.entries(GLOBAL_MANAGEMENT_ACTIONS).map(([type, spec]: any) => ({
        type,
        label: spec.label,
        operations: spec.operations,
        destructive: spec.destructive,
        required_params: GLOBAL_MANAGEMENT_REQUIRED_PARAMS[type] || {},
      })),
    });
    return true;
  }

  if (pathname === "/api/global-agent/audit" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        sendJson(res, { success: true, audit: appendGlobalActionAudit(payload) });
      } catch (error: any) {
        sendJson(res, { error: error.message || "审计记录失败" }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/orchestrate" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = createGlobalDevelopmentMission({
          ...payload,
          source: payload.source || "global-agent-chat",
        }, ctx);
        const supervisor = startGlobalMissionSupervisor({
          mission_id: result.mission.id,
          global_run_id: payload.global_run_id || payload.globalRunId || "",
          trace_id: result.mission.trace_id,
          session_id: payload.session_id || payload.sessionId || "default",
          source: payload.source || "global-agent-chat",
          business_goal: result.mission.business_goal,
          acceptance: result.mission.acceptance_criteria,
          max_attempts: payload.max_attempts || payload.maxAttempts || 3,
        });
        sendJson(res, { ...result, supervisor });
      } catch (error: any) {
        sendJson(res, { success: false, error: error.message || "全局任务创建失败" }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/missions" && req.method === "GET") {
    const id = String(parsed.query.id || "").trim();
    if (id) {
      const result = getGlobalDevelopmentMission(id);
      if (!result) return sendJson(res, { error: "全局任务不存在" }, 404);
      sendJson(res, { success: true, ...result, supervisor: getGlobalMissionSupervisor(id) });
      return true;
    }
    const missions = refreshGlobalDevelopmentMissions();
    sendJson(res, { success: true, missions });
    return true;
  }

  if (pathname === "/api/global-agent/supervisors" && req.method === "GET") {
    const id = String(parsed.query.id || parsed.query.mission_id || parsed.query.missionId || "").trim();
    if (id) {
      const supervisor = getGlobalMissionSupervisor(id);
      if (!supervisor) return sendJson(res, { success: false, error: "全局任务监工不存在" }, 404), true;
      sendJson(res, { success: true, supervisor, mission: getGlobalDevelopmentMission(supervisor.mission_id) });
      return true;
    }
    sendJson(res, {
      success: true,
      supervisors: listGlobalMissionSupervisors({ status: String(parsed.query.status || "") || undefined, limit: Number(parsed.query.limit || 50) }),
      scheduler: getGlobalMissionSupervisorSchedulerStatus(),
    });
    return true;
  }

  if (pathname === "/api/global-agent/supervisors/self-test" && req.method === "GET") {
    void runGlobalMissionSupervisorAsyncSelfTest()
      .then(asyncResult => {
        const unit = runGlobalMissionSupervisorSelfTest();
        const pass = unit.pass && asyncResult.pass;
        sendJson(res, { success: pass, result: { pass, unit, async_e2e: asyncResult } }, pass ? 200 : 500);
      })
      .catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 500));
    return true;
  }

  if (pathname === "/api/global-agent/supervisors/control" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const id = String(payload.id || payload.supervisor_id || payload.mission_id || "").trim();
        if (!id) return sendJson(res, { success: false, error: "缺少监工或全局任务 ID" }, 400);
        const operation = String(payload.operation || "check_now");
        const supervisor = operation === "check_now"
          ? await checkGlobalMissionSupervisorNow(id, createMissionSupervisorRuntime(ctx))
          : await controlGlobalMissionSupervisor(id, operation, createMissionSupervisorRuntime(ctx), payload);
        sendJson(res, { success: true, supervisor, mission: getGlobalDevelopmentMission(supervisor.mission_id) });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/runtime/tools" && req.method === "GET") {
    sendJson(res, { success: true, tools: buildGlobalAgentToolDefinitions(GLOBAL_AGENT_TOOL_SPECS) });
    return true;
  }

  if (pathname === "/api/global-agent/control-center" && req.method === "GET") {
    const message = String(parsed.query.message || "").trim();
    sendJson(res, { success: true, control: buildGlobalControlCenterSnapshot(message) });
    return true;
  }

  if (pathname === "/api/global-agent/control-center/intent-preview" && req.method === "GET") {
    const message = String(parsed.query.message || "").trim();
    sendJson(res, { success: true, intent: classifyGlobalControlIntent(message), dispatch: buildGlobalDispatchStrategy(message) });
    return true;
  }

  if (pathname === "/api/global-agent/control-center/health" && req.method === "GET") {
    sendJson(res, { success: true, health: buildGlobalSystemHealth() });
    return true;
  }

  if (pathname === "/api/global-agent/control-center/self-test" && req.method === "GET") {
    const result = runGlobalControlCenterSelfTest();
    sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
    return true;
  }

  if (pathname === "/api/global-agent/runtime/permissions" && req.method === "GET") {
    sendJson(res, { success: true, rules: loadGlobalAgentPermissionRules() });
    return true;
  }

  if (pathname === "/api/global-agent/runtime/permissions" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = payload.operation === "delete" || payload.delete === true
          ? deleteGlobalAgentPermissionRule(String(payload.id || ""))
          : saveGlobalAgentPermissionRule(payload);
        sendJson(res, { success: true, result, rules: loadGlobalAgentPermissionRules() });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/runtime/hooks" && req.method === "GET") {
    sendJson(res, { success: true, hooks: loadGlobalAgentHooks() });
    return true;
  }

  if (pathname === "/api/global-agent/runtime/hooks" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = payload.operation === "delete" || payload.delete === true
          ? deleteGlobalAgentHook(String(payload.id || ""))
          : saveGlobalAgentHook(payload);
        sendJson(res, { success: true, result, hooks: loadGlobalAgentHooks() });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/runtime/background" && req.method === "GET") {
    const id = String(parsed.query.id || parsed.query.run_id || "").trim();
    if (!id) return sendJson(res, { success: false, error: "缺少运行 ID" }, 400), true;
    const run = getGlobalAgentRun(id);
    sendJson(res, { success: true, run: publicGlobalAgentRun(run), runtime: getGlobalAgentBackgroundOutput(id) });
    return true;
  }

  if (pathname === "/api/global-agent/runtime/background/control" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const id = String(payload.id || payload.run_id || "").trim();
        const operation = String(payload.operation || "").toLowerCase();
        if (!id) return sendJson(res, { success: false, error: "缺少运行 ID" }, 400);
        let run: any;
        if (operation === "stop" || operation === "cancel") run = cancelGlobalAgentRun(id);
        else if (operation === "pause") run = pauseGlobalAgentRun(id);
        else if (operation === "resume" || operation === "takeover") run = await resumeGlobalAgentRun(id, createAgenticRuntime(getRequestBaseUrl(req), ctx), { approved: payload.approved === true ? true : undefined });
        else throw new Error("operation 必须是 stop、pause、resume 或 takeover");
        sendJson(res, { success: true, run: publicGlobalAgentRun(run), runtime: getGlobalAgentBackgroundOutput(id) });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/runtime/session-debug" && req.method === "GET") {
    const id = String(parsed.query.id || parsed.query.run_id || "").trim();
    if (!id) return sendJson(res, { success: false, error: "缺少运行 ID" }, 400), true;
    const run = getGlobalAgentRun(id);
    if (!run) return sendJson(res, { success: false, error: "全局 Agent 运行不存在" }, 404), true;
    sendJson(res, { success: true, debug: buildGlobalAgentSessionDebug(run) });
    return true;
  }

  if (pathname === "/api/global-agent/runtime/self-test" && req.method === "GET") {
    const result = runGlobalAgentRuntimeSelfTest(GLOBAL_AGENT_TOOL_SPECS);
    sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
    return true;
  }

  if (pathname === "/api/global-agent/agentic/tools" && req.method === "GET") {
    sendJson(res, { success: true, tools: buildGlobalAgentToolDefinitions(GLOBAL_AGENT_TOOL_SPECS) });
    return true;
  }

  if (pathname === "/api/global-agent/agentic/self-test" && req.method === "GET") {
    void runGlobalAgentLoopSelfTest()
      .then(result => sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500))
      .catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 500));
    return true;
  }

  if (pathname === "/api/global-agent/quality" && req.method === "GET") {
    sendJson(res, { success: true, quality: buildAgentQualitySnapshot({ tasks: loadTasks(), sessions: listTaskAgentSessions() }) });
    return true;
  }

  if (pathname === "/api/global-agent/quality" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const policy = setAgentQualityPolicy({
          shadowMode: payload.shadowMode ?? payload.shadow_mode,
          minWriteConfidence: payload.minWriteConfidence ?? payload.min_write_confidence,
          requireGroundedTarget: payload.requireGroundedTarget ?? payload.require_grounded_target,
          actor: payload.actor || "local-user",
          reason: payload.reason,
        });
        sendJson(res, { success: true, policy, quality: buildAgentQualitySnapshot({ tasks: loadTasks(), sessions: listTaskAgentSessions() }) });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/quality/self-test" && req.method === "GET") {
    const result = runAgentQualityCenterSelfTest();
    sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
    return true;
  }

  if (pathname === "/api/global-agent/reasoning/self-test" && req.method === "GET") {
    const result = runAgentReasoningLoopSelfTest();
    sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
    return true;
  }

  if (pathname === "/api/global-agent/runtime-kernel/self-test" && req.method === "GET") {
    const result = runAgentRuntimeKernelSelfTest();
    sendJson(res, { success: result.pass, result }, result.pass ? 200 : 500);
    return true;
  }

  if (pathname === "/api/global-agent/trace-replay" && req.method === "GET") {
    const traceId = String(parsed.query.trace_id || parsed.query.traceId || "").trim();
    sendJson(res, {
      success: true,
      replay: traceId ? replayAgentTrace(traceId) : buildTraceReplaySuite(Number(parsed.query.limit || 20)),
    });
    return true;
  }

  if (pathname === "/api/global-agent/runs" && req.method === "GET") {
    const id = String(parsed.query.id || "").trim();
    if (id) {
      const run = getGlobalAgentRun(id);
      if (!run) return sendJson(res, { success: false, error: "全局 Agent 运行不存在" }, 404), true;
      sendJson(res, { success: true, run: publicGlobalAgentRun(run, String(parsed.query.detail || "") === "full") });
      return true;
    }
    const sessionId = String(parsed.query.session_id || parsed.query.sessionId || "").trim();
    const status = String(parsed.query.status || "").trim();
    sendJson(res, { success: true, runs: listGlobalAgentRuns({ sessionId: sessionId || undefined, status: status || undefined, limit: Number(parsed.query.limit || 30) }).map(run => publicGlobalAgentRun(run)) });
    return true;
  }

  if (["/api/global-agent/runs/confirm", "/api/global-agent/runs/resume", "/api/global-agent/runs/pause", "/api/global-agent/runs/cancel"].includes(pathname) && req.method === "POST") {
    let body = "";
    req.on("data", (chunk: any) => body += chunk);
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const id = String(payload.id || payload.run_id || "").trim();
        if (!id) return sendJson(res, { success: false, error: "缺少运行 ID" }, 400);
        let run: any;
        const storedRun = getGlobalAgentRun(id);
        if (storedRun?.supervisor_id && ["supervising", "paused"].includes(storedRun.status)) {
          const operation = pathname.endsWith("/cancel") ? "cancel" : pathname.endsWith("/pause") ? "pause" : pathname.endsWith("/resume") ? "resume" : "";
          if (operation) {
            const supervisor = await controlGlobalMissionSupervisor(storedRun.supervisor_id, operation, createMissionSupervisorRuntime(ctx), payload);
            run = operation === "cancel"
              ? completeGlobalAgentSupervision(id, { summary: "全局任务已由用户取消。" }, "cancelled")
              : updateGlobalAgentSupervisionState(id, supervisor.status);
          }
        }
        if (!run) {
          if (pathname.endsWith("/pause")) run = pauseGlobalAgentRun(id);
          else if (pathname.endsWith("/cancel")) run = cancelGlobalAgentRun(id);
          else run = await resumeGlobalAgentRun(id, createAgenticRuntime(getRequestBaseUrl(req), ctx), {
            approved: pathname.endsWith("/confirm") ? payload.approved !== false : undefined,
            cancelled: pathname.endsWith("/confirm") && payload.approved === false,
          });
        }
        sendJson(res, { success: true, run: publicGlobalAgentRun(run) });
      } catch (error: any) {
        sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    });
    return true;
  }

  if (pathname === "/api/global-agent/run" && req.method === "POST") {
    const contentType = String(req.headers["content-type"] || "");
    const handleRun = async (payload: any, files: any[] = []) => {
      const isStream = parsed.query.stream === "true" || payload.stream === true || String(req.headers.accept || "").includes("text/event-stream");
      if (isStream) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        });
        if (typeof res.flushHeaders === "function") res.flushHeaders();
      }
      const emit = (event: any) => {
        if (!isStream || res.writableEnded) return;
        const ui = event?.ui === undefined ? buildGlobalAgentEventUi(event) : event.ui;
        res.write(`data: ${JSON.stringify(ui ? { ...event, ui } : event)}\n\n`);
      };
      try {
        let message = String(payload.message || "").trim();
        if (files.length) {
          const fileContext = buildUploadedFilesContext(files, "本次消息附件");
          message = message ? `${message}\n\n${fileContext}` : `请处理以下附件：\n${fileContext}`;
        }
        if (!message) throw new Error("消息不能为空");
        let history: any[] = [];
        try { history = Array.isArray(payload.history) ? payload.history : JSON.parse(String(payload.history || "[]")); } catch {}
        const sessionId = String(payload.session_id || payload.sessionId || "web:default");
        ctx.setAgentActivity(GLOBAL_PET_AGENT_NAME, "thinking", "全局 Agent 正在思考...", { tab: "global-agent" }, 12 * 60 * 1000);
        ctx.broadcastPetSpeech(GLOBAL_PET_AGENT_NAME, { role: "user", text: message, final: true, source: "global" });
        const requestId = String(payload.request_id || payload.requestId || req.headers["x-client-message-id"] || "").trim();
        const operationKey = requestId ? `${sessionId}:${requestId}` : "";
        const operation = operationKey ? acquireIdempotency({ scope: "global-agent-request", key: operationKey, leaseMs: 13 * 60 * 1000, metadata: { session_id: sessionId, source: "web" } }) : null;
        if (operation && !operation.acquired) {
          const settled = operation.inProgress ? await waitForIdempotencyResult("global-agent-request", operationKey, 13 * 60 * 1000) : operation.record;
          const replayRun = settled?.result?.run_id ? getGlobalAgentRun(settled.result.run_id) : null;
          if (!replayRun) throw new Error(settled?.error || "重复请求仍在处理中");
          const result = publicGlobalAgentRun(replayRun);
          if (isStream) {
            emit({ type: "result", run: result, duplicate: true });
            emit({ type: "done" });
            res.end();
          } else sendJson(res, { success: true, run: result, duplicate: true });
          return;
        }
        let finalPetEventRelayed = false;
        const run = await runAgenticGlobalRequest(getRequestBaseUrl(req), ctx, {
          message,
          history,
          sessionId,
          source: "web",
          traceId: operation?.traceId,
          onEvent: (event: any) => {
            emit(event);
            relayGlobalPetEvent(ctx, event);
            if (["completed", "failed", "cancelled"].includes(String(event?.type || ""))) {
              finalPetEventRelayed = true;
            }
          },
        });
        if (operationKey) completeIdempotency("global-agent-request", operationKey, { run_id: run.id, status: run.status });
        const result = publicGlobalAgentRun(run);
        if (!finalPetEventRelayed) {
          relayGlobalPetEvent(ctx, { type: run.status === "failed" ? "failed" : "completed", run }, { finalRun: result });
        }
        if (isStream) {
          emit({ type: "result", run: result, files: files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath })) });
          emit({ type: "done" });
          res.end();
        } else sendJson(res, { success: true, run: result, files: files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath })) });
      } catch (error: any) {
        relayGlobalPetEvent(ctx, { type: "failed", error: error?.message || String(error) }, { error: error?.message || String(error) });
        if (isStream) {
          emit({ type: "error", text: error?.message || String(error) });
          emit({ type: "done" });
          res.end();
        } else sendJson(res, { success: false, error: error?.message || String(error) }, 400);
      }
    };
    if (contentType.includes("multipart/form-data")) {
      collectRequestBuffer(req).then(buffer => {
        const boundary = getMultipartBoundary(contentType);
        if (!boundary) throw new Error("无效的附件请求");
        const { fields, files } = parseMultipart(buffer, boundary);
        return handleRun(fields || {}, files || []);
      }).catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 400));
    } else {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", () => {
        try { void handleRun(body ? JSON.parse(body) : {}, []); }
        catch (error: any) { sendJson(res, { success: false, error: error?.message || String(error) }, 400); }
      });
    }
    return true;
  }

  if (pathname === "/api/global-agent/chat" && req.method === "POST") {
    const contentType = req.headers["content-type"] || "";

    const handleAgenticChatProxy = async (payload: any, files: any[] = []) => {
      const isStream = parsed.query.stream === "true" || payload.stream === true || String(req.headers.accept || "").includes("text/event-stream");
      if (isStream) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        });
        if (typeof res.flushHeaders === "function") res.flushHeaders();
      }
      const emit = (event: any) => {
        if (!isStream || res.writableEnded) return;
        const ui = event?.ui === undefined ? buildGlobalAgentEventUi(event) : event.ui;
        res.write(`data: ${JSON.stringify(ui ? { ...event, ui } : event)}\n\n`);
      };
      try {
        let message = String(payload.message || "").trim();
        if (files.length) {
          const fileContext = buildUploadedFilesContext(files, "本次消息附件");
          message = message ? `${message}\n\n${fileContext}` : `请处理以下附件：\n${fileContext}`;
        }
        if (!message) throw new Error("消息不能为空");
        let history: any[] = [];
        try { history = Array.isArray(payload.history) ? payload.history : JSON.parse(String(payload.history || "[]")); } catch {}
        const sessionId = String(payload.session_id || payload.sessionId || "legacy:web");
        const run = await runAgenticGlobalRequest(getRequestBaseUrl(req), ctx, {
          message,
          history,
          sessionId,
          source: "legacy-chat-proxy",
          onEvent: emit,
        });
        const result = publicGlobalAgentRun(run);
        const responseFiles = files.map(file => ({ name: file.filename, size: file.size, savedPath: file.savedPath }));
        if (isStream) {
          emit({ type: "result", run: result, files: responseFiles });
          emit({ type: "done" });
          res.end();
        } else {
          sendJson(res, { success: true, reply: run.final_reply || "", run: result, files: responseFiles, agentic: true });
        }
      } catch (error: any) {
        if (isStream) {
          emit({ type: "error", text: error?.message || String(error) });
          emit({ type: "done" });
          res.end();
        } else {
          sendJson(res, { success: false, error: error?.message || String(error) }, 400);
        }
      }
    };

    if (contentType.includes("multipart/form-data")) {
      collectRequestBuffer(req).then(buffer => {
        const boundary = getMultipartBoundary(contentType);
        if (!boundary) throw new Error("无效的附件请求");
        const { fields, files } = parseMultipart(buffer, boundary);
        return handleAgenticChatProxy(fields || {}, files || []);
      }).catch(error => sendJson(res, { success: false, error: error?.message || String(error) }, 400));
    } else {
      let body = "";
      req.on("data", (chunk: any) => body += chunk);
      req.on("end", () => {
        try { void handleAgenticChatProxy(body ? JSON.parse(body) : {}, []); }
        catch (error: any) { sendJson(res, { success: false, error: error?.message || String(error) }, 400); }
      });
    }
    return true;

  }
  // 7. 新增智能代码审查接口
  if (pathname === "/api/global-agent/git-review" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { project } = JSON.parse(body || "{}");
        if (!project) return sendJson(res, { error: "缺少项目参数" }, 400);
        
        const configs = getConfigs();
        const config = configs.find(c => c.name === project);
        if (!config) return sendJson(res, { error: "项目不存在" }, 404);
        
        const info = getConfigInfo(config.path);
        const workDir = info[0]?.workDir;
        if (!workDir) return sendJson(res, { error: "项目工作区目录未配置" }, 400);
        
        // 执行 Git 命令获取变更状态和 diff
        let status = "";
        let diff = "";
        try {
          status = execFileSync("git", ["status", "--porcelain"], { encoding: "utf-8", cwd: workDir });
          diff = execFileSync("git", ["diff"], { encoding: "utf-8", cwd: workDir, maxBuffer: 10 * 1024 * 1024 });
          // 如果工作区干净，尝试对比暂存区
          if (!diff.trim()) {
            diff = execFileSync("git", ["diff", "--staged"], { encoding: "utf-8", cwd: workDir, maxBuffer: 10 * 1024 * 1024 });
          }
        } catch (gitErr: any) {
          return sendJson(res, { error: "获取 Git 变更失败，请确保该项目是 Git 仓库且本地安装了 Git: " + gitErr.message }, 500);
        }
        
        if (!status.trim()) {
          return sendJson(res, { success: true, review: "🔍 该项目当前干净，没有未提交的代码变更需要审查。" });
        }
        
        // 限制 diff payload 的最大长度以防超限
        const maxDiffLength = 12000;
        let diffPayload = diff;
        if (diffPayload.length > maxDiffLength) {
          diffPayload = diffPayload.slice(0, maxDiffLength) + "\n\n...(由于内容过多，部分 diff 差异已截断)\n";
        }
        
        // 调用大模型进行代码审查
        const orchestratorConfig = loadOrchestratorConfig();
        if (!orchestratorConfig.apiKey || !orchestratorConfig.apiUrl) {
          return sendJson(res, { error: "统一大模型未配置，请先到「系统设置」中完善配置" }, 400);
        }
        
        const reviewPrompt = `你是一个拥有多年研发经验的技术专家与资深代码审查员(Code Reviewer)。
请对以下项目「${project}」的本地 Git 代码变更进行智能审查。

【Git 状态详情】
${status}

【Git Diff 内容】
\`\`\`diff
${diffPayload}
\`\`\`

请用中文产出结构化、专业的审查报告，格式如下：
1. **变更概要**：简要说明本次修改涉及了哪些文件，主要做了什么功能或修复。
2. **潜在风险与缺陷审查**：分析修改后的代码，排查是否有潜在 Bug、逻辑漏洞、死循环、并发冲突或安全漏洞，如果没有，请说明通过审查。
3. **代码质量与改进建议**：指出可以优化重构的代码、可读性改进点，或是否遗漏了测试命令。
4. **推荐 Commit 注释**：提供一个简洁、规范的推荐 Git 提交注释（建议遵循 Angular 规范，如 "feat(ui): 增加xxx组件"）。

请仅返回上述报告的 Markdown 文本，排版必须美观大方。`;

        const messages = [
          { role: "system", content: "你是一个专业的 AI 代码审查助手。" },
          { role: "user", content: reviewPrompt }
        ];
        
        const reviewResult = await callLlm(orchestratorConfig, messages);
        sendJson(res, { success: true, review: reviewResult });
      } catch (err: any) {
        sendJson(res, { error: err.message || "代码审查执行出错" }, 500);
      }
    });
    return true;
  }

  return false;
}

async function callLlm(config: any, messages: any[]): Promise<string> {
  const isAnthropic = config.format === "anthropic-compatible" || (config.model && config.model.toLowerCase().includes("claude"));
  const endpoint = isAnthropic
    ? (config.apiUrl.endsWith("/v1/messages") ? config.apiUrl : `${config.apiUrl.replace(/\/+$/, "")}/v1/messages`)
    : (config.apiUrl.endsWith("/chat/completions") ? config.apiUrl : `${config.apiUrl.replace(/\/+$/, "")}/chat/completions`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(5000, Number(config.timeoutMs) || 60000));

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    let bodyObj: any = {};

    if (isAnthropic) {
      headers["x-api-key"] = config.apiKey;
      headers["anthropic-version"] = "2023-06-01";
      const system = messages.find(m => m.role === "system")?.content || "";
      const userMsgs = messages
        .filter(m => m.role !== "system")
        .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
      bodyObj = {
        model: config.model,
        max_tokens: 2000,
        temperature: 0.3,
        system,
        messages: userMsgs
      };
    } else {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
      bodyObj = {
        model: config.model,
        temperature: 0.3,
        messages: messages
      };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyObj),
      signal: controller.signal
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`统一大模型 API 调用失败: HTTP ${response.status} - ${text.slice(0, 200)}`);
    }

    const data = JSON.parse(text);
    if (isAnthropic) {
      return (data?.content || []).map((part: any) => part?.type === "text" ? part.text : "").join("").trim();
    } else {
      return data?.choices?.[0]?.message?.content || "";
    }
  } finally {
    clearTimeout(timeout);
  }
}

