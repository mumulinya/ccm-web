import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { loadAutoDevNotifyConfig, loadFeishuConfig } from "../../core/db";
import { sendFeishuMessageToTarget } from "./feishu";
import { publishRuntimeEvent } from "../../system/runtime-events";
import { extractFeishuInboundIdentity, publicFeishuUserMapping, signFeishuCardAction } from "./feishu-access";
import { buildFeishuConversationIdentityV2, type FeishuAgentTargetType } from "./feishu-conversation-v2";

const STATE_FILE = path.join(CCM_DIR, "feishu-channel-state.json");
const SESSION_DIR = path.join(CCM_DIR, "sessions");
const CONTROL_BOT_PID_FILE = path.join(CCM_DIR, "pids", "ccm-control-bot.pid");
const CONTROL_BOT_LOG_FILE = path.join(CCM_DIR, "logs", "ccm-control-bot.log");
const CONTROL_BOT_CONFIG_FILE = path.join(CCM_DIR, "control-bot", "config.toml");
const DELIVERY_LOCK_DIR = path.join(CCM_DIR, "feishu-channel-locks");
const DELIVERY_LOCK_STALE_MS = 2 * 60_000;
const MAX_BINDINGS = 500;
const MAX_DELIVERIES = 1600;

type FeishuDestination = {
  chat_id: string;
  open_id: string;
  user_id: string;
  receive_id: string;
  receive_id_type: "chat_id" | "open_id";
  platform_session_key: string;
  message_id: string;
  root_message_id: string;
  thread_id: string;
  conversation_key_v2?: string;
  app_fingerprint?: string;
  target_type?: FeishuAgentTargetType;
  project_id?: string;
};

type FeishuChannelAlertHandler = (payload: { role: string; text: string; source: string; deliveryId: string }) => void;
let channelAlertHandler: FeishuChannelAlertHandler | null = null;

export function setFeishuChannelAlertHandler(handler: FeishuChannelAlertHandler | null) {
  channelAlertHandler = handler;
}

function emptyState() {
  return {
    schema: "ccm-feishu-channel-state-v1",
    bindings: [] as any[],
    deliveries: [] as any[],
    cards: [] as any[],
    identities: [] as any[],
    report_deliveries: [] as any[],
    inbound: { count: 0, last_at: "", last_message_id: "", last_session_id: "" },
    outbound: { sent: 0, failed: 0, last_success_at: "", last_failure_at: "", last_error: "" },
    updated_at: "",
  };
}

function loadState() {
  try {
    const value = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    return {
      ...emptyState(),
      ...value,
      bindings: (Array.isArray(value.bindings) ? value.bindings : []).map((binding: any) => {
        if (binding.target_type) return binding;
        const source = String(binding.source || "");
        if (/group|collaboration/i.test(source)) return { ...binding, target_type: "group_agent", legacy_read_only: true };
        if (/project/i.test(source)) return { ...binding, target_type: "project_agent" };
        return { ...binding, target_type: "global_agent" };
      }),
      deliveries: Array.isArray(value.deliveries) ? value.deliveries : [],
      cards: Array.isArray(value.cards) ? value.cards : [],
      identities: Array.isArray(value.identities) ? value.identities : [],
      report_deliveries: Array.isArray(value.report_deliveries) ? value.report_deliveries : [],
    };
  } catch {
    return emptyState();
  }
}

function saveState(state: any) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const next = {
    ...state,
    bindings: (state.bindings || []).slice(-MAX_BINDINGS),
    deliveries: (state.deliveries || []).slice(-MAX_DELIVERIES),
    cards: (state.cards || []).slice(-500),
    identities: (state.identities || []).slice(-500),
    report_deliveries: (state.report_deliveries || []).slice(-240),
    updated_at: new Date().toISOString(),
  };
  const temp = `${STATE_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(next, null, 2), "utf-8");
  fs.renameSync(temp, STATE_FILE);
  return next;
}

function safeText(value: any, max = 1400) {
  const text = String(value || "")
    .replace(/CCM_AGENT_RECEIPT[\s\S]*?(?=\n\S|$)/gi, "[内部回执已收起]")
    .replace(/(api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|secret)\s*[=:]\s*[^\s,;]+/gi, "$1=[已隐藏]")
    .replace(/\b(?:sk|xox[baprs]|gh[pousr])[-_][A-Za-z0-9_-]{12,}\b/g, "[密钥已隐藏]")
    .replace(/[A-Za-z]:\\Users\\[^\s"']+/gi, "[本机路径]")
    .replace(/\/(?:home|Users)\/[^\s"']+/g, "[本机路径]")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function parsePlatformSessionKey(value: any): FeishuDestination | null {
  const text = String(value || "").trim();
  if (!/^(?:feishu|lark):/i.test(text)) return null;
  const parts = text.split(":");
  const chatId = parts.find(part => /^oc_/i.test(part)) || "";
  const openId = parts.find(part => /^ou_/i.test(part)) || "";
  const rootIndex = parts.findIndex(part => part.toLowerCase() === "root");
  const threadId = rootIndex >= 0 ? String(parts[rootIndex + 1] || "") : "";
  if (!chatId && !openId) return null;
  return { chat_id: chatId, open_id: openId, user_id: "", receive_id: chatId || openId, receive_id_type: chatId ? "chat_id" : "open_id", platform_session_key: text, message_id: "", root_message_id: threadId, thread_id: threadId };
}

function directDestination(payload: any = {}): FeishuDestination | null {
  const message = payload?.event?.message || payload?.message || {};
  const sender = payload?.event?.sender?.sender_id || payload?.sender || {};
  const chatId = String(message.chat_id || payload.chat_id || payload.chatId || "").trim();
  const openId = String(sender.open_id || payload.open_id || payload.openId || "").trim();
  const userId = String(sender.user_id || payload.user_id || payload.userId || "").trim();
  const rawMessageId = String(message.message_id || payload.message_id || payload.messageId || "").trim();
  const platformMessageId = String(payload.platform_message_id || payload.open_message_id || "").trim();
  const messageId = /^om_[a-z0-9_-]{8,200}$/i.test(rawMessageId)
    ? rawMessageId
    : /^om_[a-z0-9_-]{8,200}$/i.test(platformMessageId) ? platformMessageId : "";
  const rootMessageId = String(message.root_id || message.root_message_id || payload.root_id || payload.rootMessageId || "").trim();
  const threadId = String(message.thread_id || payload.thread_id || payload.threadId || rootMessageId || "").trim();
  if (!chatId && !openId) return null;
  const parsed = parsePlatformSessionKey(payload.platform_session_key || payload.platformSessionKey || payload.sessionKey);
  const targetType = String(payload.target_type || payload.targetType || "global_agent") as FeishuAgentTargetType;
  const projectId = String(payload.project || payload.project_id || "").trim();
  let identity: any = null;
  try {
    identity = buildFeishuConversationIdentityV2({ payload, targetType, projectId, applicationId: payload.application_id || payload.app_id });
  } catch {}
  const platformSessionKey = parsed?.platform_session_key || (chatId
    ? `feishu:${chatId}:${openId || "chat"}${threadId ? `:root:${threadId}` : ""}`
    : `feishu:user:${openId}`);
  return {
    chat_id: chatId,
    open_id: openId,
    user_id: userId,
    receive_id: chatId || openId,
    receive_id_type: chatId ? "chat_id" : "open_id",
    platform_session_key: platformSessionKey,
    message_id: messageId,
    root_message_id: rootMessageId,
    thread_id: threadId,
    conversation_key_v2: payload.conversation_key_v2 || identity?.conversation_key_v2 || "",
    app_fingerprint: payload.feishu_app_fingerprint || identity?.application_fingerprint || "",
    target_type: identity?.target_type || targetType,
    project_id: identity?.project_id || projectId,
  };
}

function sessionFiles() {
  try {
    return fs.readdirSync(SESSION_DIR)
      .filter(name => /^ccm-control-bot_.+\.json$/i.test(name))
      .map(name => ({ file: path.join(SESSION_DIR, name), mtime: fs.statSync(path.join(SESSION_DIR, name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 20);
  } catch {
    return [];
  }
}

export function resolveFeishuDestination(payload: any = {}, sessionId = ""): FeishuDestination | null {
  const direct = directDestination(payload);
  if (direct) return direct;
  const requested = String(sessionId || payload.sessionId || payload.session_id || "").trim();
  const parsedRequested = parsePlatformSessionKey(requested);
  if (parsedRequested) return parsedRequested;
  if (!requested) return null;
  for (const entry of sessionFiles()) {
    try {
      const store = JSON.parse(fs.readFileSync(entry.file, "utf-8"));
      const sessions = store.sessions || {};
      const matchedLocalIds = Object.values(sessions)
        .filter((row: any) => row?.agent_session_id === requested || (row?.past_agent_session_ids || []).includes(requested) || row?.id === requested)
        .map((row: any) => String(row.id || ""));
      for (const [platformKey, localId] of Object.entries(store.active_session || {})) {
        if (matchedLocalIds.includes(String(localId))) {
          const destination = parsePlatformSessionKey(platformKey);
          if (destination) return destination;
        }
      }
      for (const [platformKey, localIds] of Object.entries(store.user_sessions || {})) {
        if ((Array.isArray(localIds) ? localIds : []).some(value => matchedLocalIds.includes(String(value)))) {
          const destination = parsePlatformSessionKey(platformKey);
          if (destination) return destination;
        }
      }
    } catch {}
  }
  return null;
}

function uniqueStrings(values: any[]) {
  return [...new Set(values.map(value => String(value || "").trim()).filter(Boolean))].slice(0, 100);
}

export function bindFeishuTaskContext(input: {
  sessionId?: string;
  destination?: FeishuDestination | null;
  runIds?: any[];
  missionIds?: any[];
  taskIds?: any[];
  source?: string;
  targetType?: FeishuAgentTargetType | "group" | "group_session";
  projectId?: string;
  originReceipt?: any;
}) {
  const destination = input.destination || resolveFeishuDestination({}, input.sessionId || "");
  if (!destination?.receive_id) return null;
  const requestedTarget = String(input.targetType || destination.target_type || (String(input.source || "").includes("project") ? "project_agent" : "global_agent"));
  if (["group", "group_session", "group_agent"].includes(requestedTarget)) throw new Error("群聊不再允许建立飞书直接绑定");
  if (!["global_agent", "project_agent"].includes(requestedTarget)) throw new Error("飞书绑定目标类型无效");
  const state = loadState();
  const now = new Date().toISOString();
  const exactThread = String(destination.thread_id || destination.root_message_id || "");
  const requestedProject = String(input.projectId || destination.project_id || "");
  const existing = state.bindings.find((row: any) => {
    const rowTarget = String(row.target_type || (String(row.source || "").includes("project") ? "project_agent" : "global_agent"));
    const sameTarget = rowTarget === requestedTarget;
    const sameProject = requestedTarget !== "project_agent" || String(row.project_id || requestedProject) === requestedProject;
    if (!sameTarget || !sameProject) return false;
    return (destination.conversation_key_v2 && row.conversation_key_v2 === destination.conversation_key_v2)
      || (row.platform_session_key === destination.platform_session_key)
      || (!exactThread && !row.thread_id && row.chat_id === destination.chat_id && row.open_id === destination.open_id);
  });
  const binding = {
    id: existing?.id || `fsb_${crypto.randomBytes(8).toString("hex")}`,
    session_ids: uniqueStrings([...(existing?.session_ids || []), input.sessionId]),
    run_ids: uniqueStrings([...(existing?.run_ids || []), ...(input.runIds || [])]),
    mission_ids: uniqueStrings([...(existing?.mission_ids || []), ...(input.missionIds || [])]),
    task_ids: uniqueStrings([...(existing?.task_ids || []), ...(input.taskIds || [])]),
    chat_id: destination.chat_id,
    open_id: destination.open_id,
    user_id: destination.user_id || existing?.user_id || "",
    receive_id: destination.receive_id,
    receive_id_type: destination.receive_id_type,
    platform_session_key: destination.platform_session_key,
    latest_message_id: destination.message_id || existing?.latest_message_id || "",
    root_message_id: destination.message_id ? (destination.root_message_id || destination.message_id) : existing?.root_message_id || "",
    thread_id: destination.message_id ? (destination.thread_id || "") : existing?.thread_id || "",
    conversation_key_v2: destination.conversation_key_v2 || existing?.conversation_key_v2 || "",
    app_fingerprint: destination.app_fingerprint || existing?.app_fingerprint || "",
    target_type: requestedTarget,
    project_id: requestedProject || String(existing?.project_id || ""),
    origin_receipt: input.originReceipt || existing?.origin_receipt || null,
    active_card_key: existing?.active_card_key || "",
    active_session_id: existing?.active_session_id || String(input.sessionId || ""),
    source: input.source || existing?.source || "feishu-control-bot",
    created_at: existing?.created_at || now,
    updated_at: now,
  };
  const identifiersAdded = uniqueStrings([...(input.runIds || []), ...(input.missionIds || []), ...(input.taskIds || [])]);
  if (identifiersAdded.length) {
    const activeCard = [...(state.cards || [])].reverse().find((row: any) => row.binding_id === binding.id && row.active !== false);
    if (activeCard) {
      activeCard.run_ids = uniqueStrings([...(activeCard.run_ids || []), ...(input.runIds || [])]);
      activeCard.mission_ids = uniqueStrings([...(activeCard.mission_ids || []), ...(input.missionIds || [])]);
      activeCard.task_ids = uniqueStrings([...(activeCard.task_ids || []), ...(input.taskIds || [])]);
      binding.active_card_key = activeCard.key;
    }
  }
  state.bindings = [...state.bindings.filter((row: any) => row.id !== binding.id), binding];
  saveState(state);
  return binding;
}

export function resolveBoundFeishuGlobalSessionId(payload: any = {}, fallbackSessionId = "") {
  const nativeSessionId = String(payload?.sessionId || payload?.session_id || payload?.sessionKey || "").trim();
  const destination = resolveFeishuDestination(payload, nativeSessionId);
  if (!destination) return String(fallbackSessionId || "");
  const state = loadState();
  const binding = [...state.bindings].reverse().find((row: any) =>
    String(row.target_type || "global_agent") === "global_agent" && (
      (destination.conversation_key_v2 && row.conversation_key_v2 === destination.conversation_key_v2)
      || (destination.platform_session_key && row.platform_session_key === destination.platform_session_key)
      || (!destination.thread_id && !row.thread_id && destination.chat_id && row.chat_id === destination.chat_id && (!destination.open_id || !row.open_id || row.open_id === destination.open_id))
    ));
  return String(binding?.active_session_id || fallbackSessionId || "");
}

export function getFeishuGlobalSessionBindings() {
  const state = loadState();
  const identities = state.identities || [];
  return (state.bindings || []).filter((binding: any) => String(binding.target_type || "global_agent") === "global_agent").map((binding: any) => {
    const identity = identities.find((item: any) =>
      (binding.open_id && item.open_id === binding.open_id)
      || (binding.user_id && item.user_id === binding.user_id));
    return {
      id: binding.id,
      chat_id: binding.chat_id || "",
      open_id: binding.open_id || "",
      user_id: binding.user_id || "",
      label: identity?.name || binding.chat_id || binding.open_id || "飞书会话",
      platform_session_key: binding.platform_session_key || "",
      active_session_id: binding.active_session_id || "",
      latest_message_id: binding.latest_message_id || "",
      thread_id: binding.thread_id || "",
      conversation_key_v2: binding.conversation_key_v2 || "",
      target_type: binding.target_type || "global_agent",
      project_id: binding.project_id || "",
      legacy_read_only: binding.target_type === "group_agent" || binding.target_type === "group_session",
      origin_receipt: binding.origin_receipt || null,
      source: binding.source || "feishu-control-bot",
      updated_at: binding.updated_at || "",
    };
  }).sort((a: any, b: any) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
}

export function bindFeishuGlobalSession(input: { bindingId: string; sessionId?: string; action?: "bind" | "unbind" }) {
  const bindingId = String(input.bindingId || "").trim();
  const sessionId = String(input.sessionId || "").trim();
  const state = loadState();
  const binding = state.bindings.find((row: any) => row.id === bindingId);
  if (!binding) throw new Error("飞书目标绑定不存在");
  if (String(binding.target_type || "global_agent") !== "global_agent") throw new Error("只能将全局飞书目标绑定到全局飞书会话");
  if (input.action === "unbind") {
    if (!sessionId || binding.active_session_id === sessionId) binding.active_session_id = "";
  } else {
    if (!sessionId) throw new Error("缺少要绑定的全局会话 ID");
    binding.active_session_id = sessionId;
    binding.session_ids = uniqueStrings([...(binding.session_ids || []), sessionId]);
  }
  binding.updated_at = new Date().toISOString();
  saveState(state);
  publishRuntimeEvent("feishu", "feishu.session_binding_changed", {
    sessionId: binding.active_session_id,
    id: binding.id,
    status: binding.active_session_id ? "bound" : "unbound",
    source: "feishu-session-binding",
  });
  return getFeishuGlobalSessionBindings().find((row: any) => row.id === bindingId) || null;
}

export function getFeishuBindingByMessageId(messageId: string) {
  const id = String(messageId || "").trim();
  if (!id) return null;
  const state = loadState();
  const card = state.cards.find((row: any) => row.message_id === id);
  if (card?.binding_id) return state.bindings.find((row: any) => row.id === card.binding_id) || null;
  const delivery = state.deliveries.find((row: any) => row.message_id === id);
  if (delivery?.binding_id) return state.bindings.find((row: any) => row.id === delivery.binding_id) || null;
  return [...state.bindings].reverse().find((row: any) => [row.latest_message_id, row.root_message_id].includes(id)) || null;
}

export function getFeishuChannelIdentitySnapshot() {
  const state = loadState();
  return (state.identities || []).slice().sort((a: any, b: any) => String(b.last_seen_at || "").localeCompare(String(a.last_seen_at || ""))).map((item: any) => ({
    ...publicFeishuUserMapping(item),
    chat_id: safeText(item.chat_id || "", 160),
    first_seen_at: item.first_seen_at || "",
    last_seen_at: item.last_seen_at || "",
    message_count: Number(item.message_count || 0),
  }));
}

function identifiersFromValue(value: any, depth = 0, result: any = { runIds: [], missionIds: [], taskIds: [] }) {
  if (!value || depth > 5) return result;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 100)) identifiersFromValue(item, depth + 1, result);
    return result;
  }
  if (typeof value !== "object") return result;
  for (const [key, item] of Object.entries(value)) {
    if (/^(?:global_?)?run_?id$/i.test(key)) result.runIds.push(item);
    else if (/mission_?id$/i.test(key)) result.missionIds.push(item);
    else if (/task_?id$/i.test(key) || key === "id" && /task/i.test(String((value as any).schema || ""))) result.taskIds.push(item);
    if (typeof item === "object") identifiersFromValue(item, depth + 1, result);
  }
  return result;
}

export function bindFeishuIdentifiersFromValue(sessionId: string, value: any, destination?: FeishuDestination | null) {
  const ids = identifiersFromValue(value);
  return bindFeishuTaskContext({ sessionId, destination, runIds: ids.runIds, missionIds: ids.missionIds, taskIds: ids.taskIds });
}

function findBinding(input: any) {
  const state = loadState();
  const runId = String(input.runId || input.run_id || "");
  const missionId = String(input.missionId || input.mission_id || "");
  const taskId = String(input.taskId || input.task_id || "");
  const sessionId = String(input.sessionId || input.session_id || "");
  return [...state.bindings].reverse().find((row: any) =>
    !["group_agent", "group_session"].includes(String(row.target_type || "")) && (
      (runId && row.run_ids?.includes(runId)) ||
      (missionId && row.mission_ids?.includes(missionId)) ||
      (taskId && row.task_ids?.includes(taskId)) ||
      (sessionId && row.session_ids?.includes(sessionId))
    )
  ) || null;
}

export function hasFeishuTaskBinding(input: any) {
  return !!findBinding(input || {});
}

export function createFeishuPermissionActions(request: any) {
  const binding = findBinding({
    runId: request?.globalRunId,
    missionId: request?.globalMissionId,
    taskId: String(request?.taskId || "").startsWith("project-session:") ? "" : request?.taskId,
    sessionId: request?.originSessionId,
  });
  if (!binding?.id || !request?.id) return [];
  const expiresAt = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
  const makeValue = (decision: "approve" | "reject") => {
    const value: any = {
      ccm_action: "permission_decision",
      request_id: request.id,
      decision,
      binding_id: binding.id,
      expires_at: expiresAt,
    };
    value.signature = signFeishuCardAction(value);
    return value;
  };
  return [
    { text: "批准一次", type: "primary" as const, value: makeValue("approve") },
    { text: "拒绝", type: "danger" as const, value: makeValue("reject") },
  ];
}

function retryAt(attempts: number) {
  return new Date(Date.now() + Math.min(30, Math.max(1, 2 ** Math.max(0, attempts - 1))) * 60_000).toISOString();
}

function taskCardKey(input: any) {
  const stage = String(input.stage || "");
  if (["global_agent_reply", "permission_approval", "waiting_confirmation"].includes(stage)) return "";
  const explicit = String(input.cardKey || input.card_key || "").trim();
  if (explicit) return explicit.startsWith("task:") ? explicit : `task:${explicit}`;
  const identity = String(input.missionId || input.mission_id || input.taskId || input.task_id || input.runId || input.run_id || "").trim();
  return identity ? `task:${identity}` : "";
}

function renderTaskCardMarkdown(card: any) {
  const rows = (card?.history || []).slice(-8);
  if (!rows.length) return safeText(card?.markdown || "任务正在处理", 10000);
  return rows.map((row: any, index: number) => {
    const marker = index === rows.length - 1 ? "▶" : "✓";
    return `${marker} **${safeText(row.title || row.stage || "任务进度", 80)}**\n${safeText(row.markdown || "", 1400)}`;
  }).join("\n\n");
}

function acquireDeliveryLease(deliveryId: string): (() => void) | null {
  fs.mkdirSync(DELIVERY_LOCK_DIR, { recursive: true });
  const safeId = String(deliveryId || "").replace(/[^a-zA-Z0-9_-]/g, "_");
  const lockFile = path.join(DELIVERY_LOCK_DIR, `${safeId}.lock`);
  const create = () => {
    const fd = fs.openSync(lockFile, "wx");
    try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, acquired_at: new Date().toISOString() })); }
    finally { fs.closeSync(fd); }
    return () => { try { fs.unlinkSync(lockFile); } catch {} };
  };
  try {
    return create();
  } catch (error: any) {
    if (error?.code !== "EEXIST") throw error;
    try {
      if (Date.now() - fs.statSync(lockFile).mtimeMs <= DELIVERY_LOCK_STALE_MS) return null;
      fs.unlinkSync(lockFile);
      return create();
    } catch (retryError: any) {
      if (retryError?.code === "EEXIST" || retryError?.code === "ENOENT") return null;
      throw retryError;
    }
  }
}

async function attemptDelivery(deliveryId: string) {
  const releaseLease = acquireDeliveryLease(deliveryId);
  if (!releaseLease) return loadState().deliveries.find((row: any) => row.id === deliveryId) || null;
  let releaseCardLease: (() => void) | null = null;
  try {
    let state = loadState();
    const delivery = state.deliveries.find((row: any) => row.id === deliveryId);
    if (!delivery || delivery.status === "sent") return delivery || null;
    if (delivery.card_key) {
      const cardLockId = `card_${crypto.createHash("sha256").update(`${delivery.binding_id}:${delivery.card_key}`).digest("hex").slice(0, 24)}`;
      releaseCardLease = acquireDeliveryLease(cardLockId);
      if (!releaseCardLease) return delivery;
      state = loadState();
    }
    const binding = state.bindings.find((row: any) => row.id === delivery.binding_id);
    if (!binding?.receive_id) {
      delivery.status = "failed";
      delivery.error = "飞书原会话绑定不存在";
      delivery.attempts = Number(delivery.attempts || 0) + 1;
      delivery.next_attempt_at = delivery.attempts >= 5 ? "" : retryAt(delivery.attempts);
      if (delivery.attempts >= 5) delivery.exhausted_alerted = true;
      saveState(state);
      publishRuntimeEvent(delivery.attempts >= 5 ? "system" : "feishu", delivery.attempts >= 5 ? "feishu.delivery_exhausted" : "feishu.delivery_changed", {
        deliveryId: delivery.id,
        taskId: delivery.task_id,
        runId: delivery.run_id,
        status: "failed",
        reason: delivery.error,
        source: "feishu-outbox",
      });
      if (delivery.attempts >= 5) try {
        channelAlertHandler?.({ role: "error", text: `飞书通知连续 5 次发送失败：${delivery.title}。原飞书会话绑定已失效，请在设置中检查后重试。`, source: "feishu-delivery", deliveryId: delivery.id });
      } catch {}
      return delivery;
    }
    const card = delivery.card_key ? state.cards.find((row: any) => row.key === delivery.card_key && row.binding_id === binding.id) : null;
    const result = await sendFeishuMessageToTarget({
      receiveId: binding.receive_id,
      receiveIdType: binding.receive_id_type,
      title: delivery.title,
      markdown: delivery.markdown,
      actions: Array.isArray(delivery.actions) ? delivery.actions : [],
      updateMessageId: card?.message_id || "",
      replyToMessageId: card?.message_id ? "" : delivery.reply_to_message_id || binding.latest_message_id || binding.root_message_id || "",
      replyInThread: !!(binding.thread_id || binding.root_message_id),
    });
    state = loadState();
    const current = state.deliveries.find((row: any) => row.id === deliveryId);
    if (!current) return null;
    current.attempts = Number(current.attempts || 0) + 1;
    current.last_attempt_at = new Date().toISOString();
    current.status = result.success ? "sent" : "failed";
    current.sent_at = result.success ? current.last_attempt_at : "";
    current.message_id = result.message_id || "";
    current.delivery_mode = result.delivery_mode || "send";
    current.error = result.success ? "" : safeText(result.error || "发送失败", 300);
    current.next_attempt_at = result.success || current.attempts >= 5 ? "" : retryAt(current.attempts);
    if (result.success && current.card_key && result.message_id) {
      const cardIndex = state.cards.findIndex((row: any) => row.key === current.card_key && row.binding_id === current.binding_id);
      const cardRecord = {
        ...(cardIndex >= 0 ? state.cards[cardIndex] : {}),
        key: current.card_key,
        binding_id: current.binding_id,
        message_id: result.message_id,
        reply_to_message_id: current.reply_to_message_id || "",
        run_id: current.run_id || "",
        mission_id: current.mission_id || "",
        task_id: current.task_id || "",
        latest_stage: current.stage,
        updated_at: current.last_attempt_at,
      };
      if (cardIndex >= 0) state.cards[cardIndex] = cardRecord;
      else state.cards.push(cardRecord);
    }
    state.outbound = {
      ...(state.outbound || {}),
      sent: Number(state.outbound?.sent || 0) + (result.success ? 1 : 0),
      failed: Number(state.outbound?.failed || 0) + (result.success ? 0 : 1),
      last_success_at: result.success ? current.last_attempt_at : state.outbound?.last_success_at || "",
      last_failure_at: result.success ? state.outbound?.last_failure_at || "" : current.last_attempt_at,
      last_error: result.success ? "" : current.error,
    };
    saveState(state);
    publishRuntimeEvent("feishu", "feishu.delivery_changed", {
      deliveryId: current.id,
      taskId: current.task_id,
      runId: current.run_id,
      status: current.status,
      reason: current.error,
      source: "feishu-outbox",
    });
    if (!result.success && current.attempts >= 5 && current.exhausted_alerted !== true) {
      current.exhausted_alerted = true;
      saveState(state);
      publishRuntimeEvent("system", "feishu.delivery_exhausted", {
        deliveryId: current.id,
        taskId: current.task_id,
        runId: current.run_id,
        status: "failed",
        reason: current.error,
        source: "feishu-outbox",
      });
      try {
        channelAlertHandler?.({ role: "error", text: `飞书通知连续 5 次发送失败：${current.title}。请在设置的飞书投递记录中检查并重试。`, source: "feishu-delivery", deliveryId: current.id });
      } catch {}
    }
    return current;
  } finally {
    releaseCardLease?.();
    releaseLease();
  }
}

export async function notifyFeishuTaskStage(input: {
  stage: string;
  title: string;
  markdown: string;
  dedupeKey?: string;
  runId?: string;
  missionId?: string;
  taskId?: string;
  sessionId?: string;
  cardKey?: string;
  actions?: Array<{ text: string; type?: "primary" | "default" | "danger"; value: Record<string, any> }>;
  forceNewMessage?: boolean;
}) {
  const binding = findBinding(input);
  if (!binding) return { success: false, queued: false, reason: "no_binding" };
  const state = loadState();
  const dedupeKey = String(input.dedupeKey || `${input.stage}:${input.runId || input.missionId || input.taskId || input.sessionId}:${safeText(input.markdown, 180)}`);
  const existing = state.deliveries.find((row: any) => row.dedupe_key === dedupeKey);
  if (existing) return { success: existing.status === "sent", queued: existing.status !== "sent", duplicate: true, delivery: existing };
  const now = new Date().toISOString();
  const requestedCardKey = input.forceNewMessage ? "" : taskCardKey(input);
  const identifiers = uniqueStrings([input.runId, input.missionId, input.taskId]);
  const matchedCard = identifiers.length ? [...(state.cards || [])].reverse().find((row: any) => row.binding_id === binding.id && identifiers.some(id =>
    row.run_ids?.includes(id) || row.mission_ids?.includes(id) || row.task_ids?.includes(id))) : null;
  const cardKey = matchedCard?.key || requestedCardKey;
  let markdown = safeText(input.markdown, 10000);
  if (cardKey) {
    const cardIndex = state.cards.findIndex((row: any) => row.key === cardKey && row.binding_id === binding.id);
    const existingCard = cardIndex >= 0 ? state.cards[cardIndex] : null;
    const cardRecord = {
      ...(existingCard || {}),
      key: cardKey,
      binding_id: binding.id,
      message_id: existingCard?.message_id || "",
      reply_to_message_id: existingCard?.reply_to_message_id || binding.latest_message_id || binding.root_message_id || "",
      history: [...(existingCard?.history || []), { stage: input.stage, title: input.title, markdown: input.markdown, at: now }].slice(-12),
      run_ids: uniqueStrings([...(existingCard?.run_ids || []), input.runId]),
      mission_ids: uniqueStrings([...(existingCard?.mission_ids || []), input.missionId]),
      task_ids: uniqueStrings([...(existingCard?.task_ids || []), input.taskId]),
      active: !["completion", "failure", "cancelled"].includes(String(input.stage || "")),
      updated_at: now,
    };
    markdown = renderTaskCardMarkdown(cardRecord);
    if (cardIndex >= 0) state.cards[cardIndex] = cardRecord;
    else state.cards.push(cardRecord);
  }
  const delivery = {
    id: `fsd_${crypto.randomBytes(8).toString("hex")}`,
    binding_id: binding.id,
    dedupe_key: dedupeKey,
    stage: safeText(input.stage, 60),
    title: safeText(input.title, 80),
    markdown,
    actions: Array.isArray(input.actions) ? input.actions : [],
    card_key: cardKey,
    reply_to_message_id: cardKey
      ? state.cards.find((row: any) => row.key === cardKey && row.binding_id === binding.id)?.reply_to_message_id || ""
      : binding.latest_message_id || binding.root_message_id || "",
    run_id: input.runId || "",
    mission_id: input.missionId || "",
    task_id: input.taskId || "",
    target_type: binding.target_type || "global_agent",
    project_id: binding.project_id || "",
    conversation_key_v2: binding.conversation_key_v2 || "",
    thread_scope: binding.thread_id || "main",
    status: "pending",
    attempts: 0,
    created_at: now,
    last_attempt_at: "",
    next_attempt_at: now,
    sent_at: "",
    message_id: "",
    error: "",
    delivery_mode: "",
    exhausted_alerted: false,
  };
  state.deliveries.push(delivery);
  saveState(state);
  const attempted = await attemptDelivery(delivery.id);
  return { success: attempted?.status === "sent", queued: attempted?.status !== "sent" && Number(attempted?.attempts || 0) < 5, delivery: attempted };
}

export async function retryFeishuNotificationDelivery(deliveryId: string) {
  const id = String(deliveryId || "").trim();
  const state = loadState();
  const delivery = state.deliveries.find((row: any) => row.id === id);
  if (!delivery) throw new Error("飞书投递记录不存在");
  if (delivery.status === "sent") return delivery;
  delivery.status = "pending";
  delivery.attempts = 0;
  delivery.error = "";
  delivery.next_attempt_at = new Date().toISOString();
  delivery.exhausted_alerted = false;
  saveState(state);
  return attemptDelivery(id);
}

export async function tickFeishuNotificationOutbox(now = new Date()) {
  const state = loadState();
  const due = state.deliveries.filter((row: any) => row.status !== "sent" && Number(row.attempts || 0) < 5 && Date.parse(row.next_attempt_at || row.created_at || "") <= now.getTime()).slice(0, 10);
  const results = [];
  for (const row of due) results.push(await attemptDelivery(row.id));
  return { due: due.length, sent: results.filter((row: any) => row?.status === "sent").length, failed: results.filter((row: any) => row?.status === "failed").length };
}

export function recordFeishuReportDelivery(input: {
  kind: "daily" | "weekly";
  reportId: string;
  success: boolean;
  attemptedAt?: string;
  messageId?: string;
  error?: string;
  targetType?: string;
}) {
  const state = loadState();
  const row = {
    id: `fsr_${crypto.randomBytes(8).toString("hex")}`,
    kind: input.kind,
    report_id: safeText(input.reportId, 120),
    attempted_at: input.attemptedAt || new Date().toISOString(),
    success: input.success === true,
    message_id: safeText(input.messageId || "", 160),
    error: input.success ? "" : safeText(input.error || "发送失败", 300),
    target_type: safeText(input.targetType || "webhook", 40),
  };
  state.report_deliveries.push(row);
  saveState(state);
  return row;
}

export function getFeishuChannelDeliverySnapshot(limit = 50) {
  const state = loadState();
  const bounded = Math.max(1, Math.min(200, Number(limit) || 50));
  return {
    deliveries: state.deliveries.slice(-bounded).reverse().map((row: any) => ({
      id: row.id,
      stage: row.stage,
      title: row.title,
      status: row.status,
      attempts: Number(row.attempts || 0),
      created_at: row.created_at,
      last_attempt_at: row.last_attempt_at,
      next_attempt_at: row.next_attempt_at,
      sent_at: row.sent_at,
      message_id: row.message_id || "",
      delivery_mode: row.delivery_mode || "",
      exhausted: row.status === "failed" && Number(row.attempts || 0) >= 5,
      error: row.error || "",
      run_id: row.run_id || "",
      mission_id: row.mission_id || "",
      task_id: row.task_id || "",
      target_type: row.target_type || "global_agent",
      project_id: row.project_id || "",
      conversation_key_v2: row.conversation_key_v2 || "",
      thread_scope: row.thread_scope || "main",
      retryable: row.status !== "sent" && Number(row.attempts || 0) < 5,
    })),
    reports: state.report_deliveries.slice(-bounded).reverse(),
    identities: getFeishuChannelIdentitySnapshot().slice(0, bounded),
    summary: {
      pending: state.deliveries.filter((row: any) => row.status !== "sent" && Number(row.attempts || 0) < 5).length,
      exhausted: state.deliveries.filter((row: any) => row.status === "failed" && Number(row.attempts || 0) >= 5).length,
      sent: state.deliveries.filter((row: any) => row.status === "sent").length,
    },
  };
}

export function recordFeishuInbound(input: { payload?: any; sessionId?: string; messageId?: string }) {
  const destination = resolveFeishuDestination(input.payload || {}, input.sessionId || "");
  const state = loadState();
  const extractedIdentity = extractFeishuInboundIdentity(input.payload || {});
  const identity = {
    ...extractedIdentity,
    open_id: extractedIdentity.open_id || destination?.open_id || "",
    user_id: extractedIdentity.user_id || destination?.user_id || "",
  };
  state.inbound = {
    count: Number(state.inbound?.count || 0) + 1,
    last_at: new Date().toISOString(),
    last_message_id: safeText(input.messageId || "", 120),
    last_session_id: safeText(input.sessionId || "", 160),
  };
  if (identity.open_id || identity.user_id || identity.union_id) {
    const now = new Date().toISOString();
    const index = state.identities.findIndex((item: any) =>
      (identity.open_id && item.open_id === identity.open_id)
      || (identity.user_id && item.user_id === identity.user_id)
      || (identity.union_id && item.union_id === identity.union_id));
    const existing = index >= 0 ? state.identities[index] : null;
    const next = {
      ...(existing || {}),
      ...identity,
      chat_id: destination?.chat_id || existing?.chat_id || "",
      first_seen_at: existing?.first_seen_at || now,
      last_seen_at: now,
      message_count: Number(existing?.message_count || 0) + 1,
    };
    if (index >= 0) state.identities[index] = next;
    else state.identities.push(next);
  }
  saveState(state);
  if (destination) bindFeishuTaskContext({ sessionId: input.sessionId, destination, source: "feishu-control-bot" });
  publishRuntimeEvent("feishu", "feishu.inbound", {
    sessionId: input.sessionId,
    id: input.messageId,
    status: destination ? "bound" : "unbound",
    source: "feishu-control-bot",
  });
  return destination;
}

function taskStatusPresentation(status: string) {
  const value = String(status || "").toLowerCase();
  if (value === "in_progress") return { stage: "execution", title: "任务开始执行", label: "已开始协调项目执行成员" };
  if (["waiting", "blocked"].includes(value)) return { stage: "review", title: "任务需要继续处理", label: "验收发现缺口，正在等待补充或返工" };
  if (value === "done") return { stage: "completion", title: "任务已经完成", label: "任务已通过验收并完成交付" };
  if (value === "failed") return { stage: "failure", title: "任务执行遇到问题", label: "任务未完成，已记录失败原因" };
  if (value === "cancelled") return { stage: "cancelled", title: "任务已取消", label: "任务已停止执行" };
  if (value === "cancelling") return { stage: "cancelled", title: "正在停止任务", label: "取消请求已发送，正在停止执行" };
  return null;
}

export async function notifyFeishuTaskStatus(task: any, status: string, result = "") {
  const presentation = taskStatusPresentation(status);
  if (!presentation || !task?.id) return { success: false, queued: false, reason: "unsupported_status" };
  const detail = safeText(result || task.status_detail || task.delivery_summary?.headline || presentation.label, 1000);
  return notifyFeishuTaskStage({
    stage: presentation.stage,
    title: presentation.title,
    markdown: `**${safeText(task.title || "未命名任务", 180)}**\n\n${presentation.label}${detail ? `\n\n${detail}` : ""}`,
    taskId: String(task.id),
    missionId: String(task.parent_task_id || task.root_task_id || ""),
    dedupeKey: `task-status:${task.id}:${status}:${safeText(detail, 120)}`,
  });
}

export function feishuRuntimeEventPresentation(event: any) {
  const type = String(event?.type || "");
  const tool = String(event?.tool || event?.name || "");
  if (type === "plan_mode_ready") {
    const plan = event.plan_mode || event.planMode || {};
    return {
      stage: "plan",
      title: safeText(plan.title || "执行计划已经整理", 80),
      markdown: safeText(plan.next_step || plan.risk?.summary || event.message || "我已整理执行步骤，接下来会按计划派发、跟踪和验收。"),
    };
  }
  if (type === "dispatch_launch_summary") {
    const summary = event.dispatch_launch_summary || event.dispatchLaunchSummary || {};
    return {
      stage: "dispatch",
      title: safeText(summary.title || "任务已经派发", 80),
      markdown: safeText(summary.headline || summary.detail || event.message || "任务已经进入协作执行链，我会继续跟踪结果。"),
    };
  }
  if (type === "tool_started" && /create|dispatch|orchestrat/i.test(tool)) return { stage: "dispatch", title: "正在安排任务", markdown: "我正在确认执行范围并把工作交给合适的协作群或项目执行成员。" };
  if (type === "tool_completed" && /create|dispatch|orchestrat/i.test(tool)) return { stage: "dispatch", title: "任务已经派发", markdown: "任务已进入执行链，我会继续跟踪项目结果和验收情况。" };
  if (type === "test_agent_execution_plan_ready") return { stage: "test", title: "独立测试已经安排", markdown: safeText(event.detail || event.test_agent_execution_plan_summary || "TestAgent 已准备独立验证范围和步骤。") };
  if (type === "test_agent_review_ready") return { stage: "test", title: "TestAgent 完成验证", markdown: safeText(event.detail || event.test_agent_review_summary?.headline || "独立验证结果已经返回，主 Agent 正在进行最终验收。") };
  return null;
}

function processAlive(pid: number) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function configuredControlBotPort() {
  try {
    const match = fs.readFileSync(CONTROL_BOT_CONFIG_FILE, "utf-8").match(/--port=(\d{1,5})/);
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
}

function lastLogTimestamp(log: string, messagePattern: string) {
  const expression = new RegExp(`time=([^\\s]+)[^\\n]*msg="${messagePattern}`, "gi");
  const value = [...log.matchAll(expression)].at(-1)?.[1] || "";
  return { value, at: value ? Date.parse(value) : 0 };
}

function controlBotSocketSnapshot(expectedPort: number) {
  let pid = 0;
  try { pid = Number(fs.readFileSync(CONTROL_BOT_PID_FILE, "utf-8").trim()); } catch {}
  let log = "";
  try {
    const stat = fs.statSync(CONTROL_BOT_LOG_FILE);
    const start = Math.max(0, stat.size - 300_000);
    const fd = fs.openSync(CONTROL_BOT_LOG_FILE, "r");
    const buffer = Buffer.alloc(stat.size - start);
    fs.readSync(fd, buffer, 0, buffer.length, start);
    fs.closeSync(fd);
    log = buffer.toString("utf-8");
  } catch {}
  const connected = [...log.matchAll(/^(.*)\[(?:Info|INFO)\].*connected to wss:\/\/msg-frontier\.feishu\.cn.*$/gmi)].at(-1)?.[1]?.trim() || "";
  const disconnected = [...log.matchAll(/^(.*)\[(?:Info|INFO)\].*disconnected to wss:\/\/msg-frontier\.feishu\.cn.*$/gmi)].at(-1)?.[1]?.trim() || "";
  const socketConnected = !!connected && (!disconnected || connected > disconnected);
  const turnStarted = lastLogTimestamp(log, "processing message");
  const completed = lastLogTimestamp(log, "turn complete");
  const timedOut = lastLogTimestamp(log, 'agent session idle timeout:[^\"]*');
  const engineStarted = lastLogTimestamp(log, "engine started");
  const lastSettledAt = Math.max(completed.at, timedOut.at, engineStarted.at);
  const pendingSince = turnStarted.at > lastSettledAt ? turnStarted.value : "";
  const turnStalled = !!pendingSince && Date.now() - turnStarted.at > 2 * 60_000;
  const targetPort = configuredControlBotPort();
  return {
    pid,
    process_alive: processAlive(pid),
    socket_connected: socketConnected,
    last_connected_at: connected,
    last_disconnected_at: disconnected,
    process_started_at: engineStarted.value,
    target_port: targetPort,
    expected_port: expectedPort,
    endpoint_current: targetPort === expectedPort,
    pending_turn_since: pendingSince,
    turn_stalled: turnStalled,
  };
}

export function getFeishuChannelHealth(expectedPort = Number(process.env.CCM_PORT || process.argv[2] || 3080)) {
  const config = loadFeishuConfig();
  const reports = loadAutoDevNotifyConfig();
  const state = loadState();
  const socket = controlBotSocketSnapshot(expectedPort);
  const ready = config.control_bot_enabled === true && !!(config.control_bot_app_id || config.app_id) && !!(config.control_bot_app_secret || config.app_secret);
  return {
    schema: "ccm-feishu-channel-health-v1",
    healthy: ready && socket.process_alive && socket.socket_connected && socket.endpoint_current && !socket.turn_stalled,
    checked_at: new Date().toISOString(),
    control_bot_ready: ready,
    webhook_ready: !!config.webhook_url,
    ...socket,
    inbound: state.inbound,
    outbound: state.outbound,
    outbox: {
      pending: state.deliveries.filter((row: any) => row.status !== "sent" && Number(row.attempts || 0) < 5).length,
      exhausted: state.deliveries.filter((row: any) => row.status !== "sent" && Number(row.attempts || 0) >= 5).length,
      sent: state.deliveries.filter((row: any) => row.status === "sent").length,
    },
    reports: { daily_enabled: reports.daily_enabled === true, weekly_enabled: reports.weekly_enabled === true },
    report_deliveries: {
      sent: state.report_deliveries.filter((row: any) => row.success === true).length,
      failed: state.report_deliveries.filter((row: any) => row.success !== true).length,
      last: state.report_deliveries.at(-1) || null,
    },
  };
}

export function runFeishuChannelSelfTest() {
  const parsed = parsePlatformSessionKey("feishu:oc_chat:ou_user");
  const direct = resolveFeishuDestination({ event: { message: { chat_id: "oc_direct" }, sender: { sender_id: { open_id: "ou_direct" } } } });
  const status = taskStatusPresentation("in_progress");
  const testEvent = feishuRuntimeEventPresentation({ type: "test_agent_review_ready", detail: "复验通过" });
  const planEvent = feishuRuntimeEventPresentation({ type: "plan_mode_ready", plan_mode: { title: "登录修复计划", next_step: "先派发实现，再运行独立复核。" } });
  const leaseId = `selftest_${process.pid}_${Date.now()}`;
  const firstLease = acquireDeliveryLease(leaseId);
  const competingLease = acquireDeliveryLease(leaseId);
  firstLease?.();
  const reacquiredLease = acquireDeliveryLease(leaseId);
  reacquiredLease?.();
  const checks = {
    platform_session_parsed: parsed?.chat_id === "oc_chat" && parsed.open_id === "ou_user",
    direct_event_targeted: direct?.receive_id === "oc_direct" && direct.receive_id_type === "chat_id",
    progress_status_supported: status?.stage === "execution",
    test_agent_event_supported: testEvent?.stage === "test" && /复验通过/.test(testEvent.markdown),
    plan_event_supported: planEvent?.stage === "plan" && /先派发实现/.test(planEvent.markdown),
    cross_process_delivery_lease: !!firstLease && competingLease === null && !!reacquiredLease,
    secrets_redacted: safeText("api_key=secret-value").includes("[已隐藏]"),
  };
  return { schema: "ccm-feishu-channel-selftest-v1", pass: Object.values(checks).every(Boolean), checks };
}
