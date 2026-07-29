import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";

export type FeishuAgentTargetType = "global_agent" | "project_agent";
export type FeishuInboundProcessingState = "received" | "processing" | "completed" | "failed";

export type FeishuConversationIdentityV2 = {
  schema: "ccm-feishu-conversation-identity-v2";
  target_type: FeishuAgentTargetType;
  project_id: string;
  application_fingerprint: string;
  chat_id: string;
  open_id: string;
  user_id: string;
  root_message_id: string;
  thread_id: string;
  thread_scope: string;
  platform_session_key: string;
  conversation_key_v2: string;
  checksum: string;
};

export type FeishuInboundEnvelopeV2 = {
  schema: "ccm-feishu-inbound-envelope-v2";
  target_type: FeishuAgentTargetType;
  project_id: string;
  transport: "acp" | "event_callback" | "internal";
  message_id: string;
  event_id: string;
  identity: FeishuConversationIdentityV2;
  idempotency_key: string;
  checksum: string;
};

export type FeishuInboundReceiptV2 = {
  schema: "ccm-feishu-inbound-receipt-v2";
  id: string;
  envelope_checksum: string;
  idempotency_key: string;
  target_type: FeishuAgentTargetType;
  project_id: string;
  conversation_key_v2: string;
  message_id: string;
  transports: string[];
  processing_state: FeishuInboundProcessingState;
  processing_stage: string;
  attempt: number;
  owner_pid: number;
  lease_expires_at: string;
  retryable: boolean;
  result: { reply?: string; error?: string; delivery_id?: string };
  created_at: string;
  updated_at: string;
  completed_at: string;
  failed_at: string;
};

export type FeishuQueuedTurnContextV2 = {
  schema: "ccm-feishu-queued-turn-context-v2";
  target_type: FeishuAgentTargetType;
  project_id: string;
  conversation_key_v2: string;
  message_id: string;
  payload: Record<string, any>;
  destination: Record<string, any>;
  envelope_checksum: string;
};

export type FeishuOriginReceiptV2 = {
  schema: "ccm-feishu-origin-receipt-v2";
  source: "global_feishu" | "project_feishu";
  project_id: string;
  session_id: string;
  conversation_key_v2: string;
  message_id: string;
  envelope_checksum: string;
  checksum: string;
};

type ReceiptStore = {
  schema: "ccm-feishu-inbound-receipts-v2";
  generation: number;
  updated_at: string;
  receipts: FeishuInboundReceiptV2[];
};

const RECEIPT_FILE = process.env.CCM_FEISHU_INBOUND_RECEIPT_FILE || path.join(CCM_DIR, "feishu-inbound-receipts-v2.json");
const MAX_RECEIPTS = 2400;
const DEFAULT_LEASE_MS = 15 * 60_000;

function nowIso() {
  return new Date().toISOString();
}

function digest(value: any) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function clean(value: any, max = 240) {
  return String(value || "").trim().slice(0, max);
}

function processAlive(pid: number) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function targetType(value: any): FeishuAgentTargetType {
  const normalized = clean(value, 40).toLowerCase();
  if (normalized === "global_agent" || normalized === "project_agent") return normalized;
  if (["group", "group_agent", "group_session", "collaboration"].includes(normalized)) {
    throw new Error("飞书不再支持直接进入群聊 Agent");
  }
  throw new Error("飞书消息缺少明确的 global_agent 或 project_agent 目标");
}

function payloadSources(payload: any) {
  const message = payload?.event?.message || payload?.message || {};
  const sender = payload?.event?.sender?.sender_id || payload?.sender || {};
  return { message, sender };
}

function parsePlatformKey(value: any) {
  const raw = clean(value, 500);
  const parts = raw.split(":");
  const chatId = parts.find(part => /^oc_/i.test(part)) || "";
  const openId = parts.find(part => /^ou_/i.test(part)) || "";
  const rootIndex = parts.findIndex(part => part.toLowerCase() === "root");
  return { raw, chatId, openId, threadId: rootIndex >= 0 ? clean(parts[rootIndex + 1]) : "" };
}

export function buildFeishuConversationIdentityV2(input: {
  payload?: any;
  targetType: FeishuAgentTargetType | string;
  projectId?: string;
  applicationId?: string;
}) {
  const payload = input.payload || {};
  const { message, sender } = payloadSources(payload);
  const parsedKey = parsePlatformKey(payload.platform_session_key || payload.platformSessionKey || payload.sessionKey);
  const resolvedTarget = targetType(input.targetType);
  const projectId = resolvedTarget === "project_agent" ? clean(input.projectId || payload.project || payload.project_id, 160) : "";
  if (resolvedTarget === "project_agent" && !projectId) throw new Error("项目飞书消息缺少精确项目 ID");
  const chatId = clean(message.chat_id || payload.chat_id || payload.chatId || parsedKey.chatId);
  const openId = clean(sender.open_id || payload.open_id || payload.openId || parsedKey.openId);
  const userId = clean(sender.user_id || payload.user_id || payload.userId);
  const rootMessageId = clean(message.root_id || message.root_message_id || payload.root_id || payload.rootId || payload.rootMessageId || parsedKey.threadId);
  const threadId = clean(message.thread_id || payload.thread_id || payload.threadId || rootMessageId || parsedKey.threadId);
  if (!chatId && !openId) throw new Error("无法识别飞书群聊或用户身份");
  const appId = clean(input.applicationId || payload.application_id || payload.applicationId || payload.app_id || "ccm-control-bot", 200);
  const applicationFingerprint = digest(appId).slice(0, 20);
  const threadScope = threadId || "main";
  const platformSessionKey = parsedKey.raw || (chatId
    ? `feishu:${chatId}:${openId || "chat"}${threadId ? `:root:${threadId}` : ""}`
    : `feishu:user:${openId}`);
  const identityCore = {
    target_type: resolvedTarget,
    project_id: projectId,
    application_fingerprint: applicationFingerprint,
    chat_id: chatId,
    open_id: openId,
    user_id: userId,
    thread_scope: threadScope,
  };
  const checksum = digest(identityCore);
  return {
    schema: "ccm-feishu-conversation-identity-v2" as const,
    ...identityCore,
    root_message_id: rootMessageId,
    thread_id: threadId,
    platform_session_key: platformSessionKey,
    conversation_key_v2: `feishu:v2:${checksum.slice(0, 32)}`,
    checksum,
  };
}

export function buildFeishuInboundEnvelopeV2(input: {
  payload?: any;
  targetType: FeishuAgentTargetType | string;
  projectId?: string;
  applicationId?: string;
  transport?: "acp" | "event_callback" | "internal";
  messageId?: string;
  eventId?: string;
}) {
  const payload = input.payload || {};
  const identity = buildFeishuConversationIdentityV2(input);
  const { message } = payloadSources(payload);
  const messageId = clean(input.messageId || message.message_id || payload.message_id || payload.messageId || payload.platform_message_id || payload.request_id || payload.requestId, 240);
  const eventId = clean(input.eventId || payload?.header?.event_id || payload.event_id, 240);
  if (!messageId && !eventId) throw new Error("飞书消息缺少稳定消息 ID");
  const idempotencyKey = digest({
    application_fingerprint: identity.application_fingerprint,
    target_type: identity.target_type,
    project_id: identity.project_id,
    conversation_key_v2: identity.conversation_key_v2,
    message_id: messageId || eventId,
  });
  const core = {
    target_type: identity.target_type,
    project_id: identity.project_id,
    transport: input.transport || "internal",
    message_id: messageId,
    event_id: eventId,
    identity,
    idempotency_key: idempotencyKey,
  };
  return { schema: "ccm-feishu-inbound-envelope-v2" as const, ...core, checksum: digest(core) };
}

function emptyStore(): ReceiptStore {
  return { schema: "ccm-feishu-inbound-receipts-v2", generation: 0, updated_at: nowIso(), receipts: [] };
}

function readStore(): ReceiptStore {
  const raw = readJsonWithBackup<any>(RECEIPT_FILE, emptyStore());
  return {
    schema: "ccm-feishu-inbound-receipts-v2",
    generation: Number(raw?.generation || 0),
    updated_at: clean(raw?.updated_at, 80) || nowIso(),
    receipts: Array.isArray(raw?.receipts) ? raw.receipts.slice(-MAX_RECEIPTS) : [],
  };
}

function mutateStore<T>(operation: (store: ReceiptStore) => T): T {
  fs.mkdirSync(path.dirname(RECEIPT_FILE), { recursive: true });
  return withFileLock(RECEIPT_FILE, () => {
    const store = readStore();
    const result = operation(store);
    store.generation += 1;
    store.updated_at = nowIso();
    store.receipts = store.receipts.slice(-MAX_RECEIPTS);
    writeJsonAtomic(RECEIPT_FILE, store);
    return result;
  });
}

export function acquireFeishuInboundReceipt(envelope: FeishuInboundEnvelopeV2, leaseMs = DEFAULT_LEASE_MS) {
  return mutateStore(store => {
    const now = Date.now();
    const existing = store.receipts.find(item => item.idempotency_key === envelope.idempotency_key);
    const active = existing?.processing_state === "processing"
      && Date.parse(existing.lease_expires_at || "") > now
      && processAlive(Number(existing.owner_pid || 0));
    if (existing && (existing.processing_state === "completed" || active)) {
      if (!existing.transports.includes(envelope.transport)) existing.transports.push(envelope.transport);
      existing.updated_at = nowIso();
      return { acquired: false, duplicate: true, in_progress: active, receipt: existing };
    }
    const at = nowIso();
    const receipt: FeishuInboundReceiptV2 = existing || {
      schema: "ccm-feishu-inbound-receipt-v2",
      id: `fsir_${envelope.idempotency_key.slice(0, 24)}`,
      envelope_checksum: envelope.checksum,
      idempotency_key: envelope.idempotency_key,
      target_type: envelope.target_type,
      project_id: envelope.project_id,
      conversation_key_v2: envelope.identity.conversation_key_v2,
      message_id: envelope.message_id || envelope.event_id,
      transports: [],
      processing_state: "received",
      processing_stage: "received",
      attempt: 0,
      owner_pid: 0,
      lease_expires_at: "",
      retryable: true,
      result: {},
      created_at: at,
      updated_at: at,
      completed_at: "",
      failed_at: "",
    };
    receipt.envelope_checksum = envelope.checksum;
    receipt.processing_state = "processing";
    receipt.processing_stage = "processing";
    receipt.attempt = Number(receipt.attempt || 0) + 1;
    receipt.owner_pid = process.pid;
    receipt.lease_expires_at = new Date(now + Math.max(5_000, Math.min(24 * 60 * 60_000, Number(leaseMs || DEFAULT_LEASE_MS)))).toISOString();
    receipt.retryable = true;
    receipt.result = {};
    receipt.failed_at = "";
    receipt.updated_at = at;
    if (!receipt.transports.includes(envelope.transport)) receipt.transports.push(envelope.transport);
    if (!existing) store.receipts.push(receipt);
    return { acquired: true, duplicate: !!existing, in_progress: false, receipt };
  });
}

export function updateFeishuInboundReceipt(receiptId: string, stage: string, result: any = {}) {
  return mutateStore(store => {
    const receipt = store.receipts.find(item => item.id === receiptId);
    if (!receipt) throw new Error("飞书入站回执不存在");
    receipt.processing_stage = clean(stage, 80) || receipt.processing_stage;
    receipt.updated_at = nowIso();
    receipt.result = {
      ...(receipt.result || {}),
      ...(result.reply ? { reply: clean(result.reply, 12_000) } : {}),
      ...(result.error ? { error: clean(result.error, 1000) } : {}),
      ...(result.delivery_id ? { delivery_id: clean(result.delivery_id, 160) } : {}),
    };
    return receipt;
  });
}

export function completeFeishuInboundReceipt(receiptId: string, result: any = {}) {
  return mutateStore(store => {
    const receipt = store.receipts.find(item => item.id === receiptId);
    if (!receipt) throw new Error("飞书入站回执不存在");
    const at = nowIso();
    receipt.processing_state = "completed";
    receipt.processing_stage = "completed";
    receipt.retryable = false;
    receipt.owner_pid = 0;
    receipt.lease_expires_at = "";
    receipt.completed_at = at;
    receipt.updated_at = at;
    receipt.result = { ...(receipt.result || {}), ...(result.reply ? { reply: clean(result.reply, 12_000) } : {}), ...(result.delivery_id ? { delivery_id: clean(result.delivery_id, 160) } : {}) };
    return receipt;
  });
}

export function failFeishuInboundReceipt(receiptId: string, error: any, retryable = true) {
  return mutateStore(store => {
    const receipt = store.receipts.find(item => item.id === receiptId);
    if (!receipt) throw new Error("飞书入站回执不存在");
    const at = nowIso();
    receipt.processing_state = "failed";
    receipt.processing_stage = "failed";
    receipt.retryable = retryable;
    receipt.owner_pid = 0;
    receipt.lease_expires_at = "";
    receipt.failed_at = at;
    receipt.updated_at = at;
    receipt.result = { ...(receipt.result || {}), error: clean(error?.message || error || "飞书消息处理失败", 1000) };
    return receipt;
  });
}

export function getFeishuInboundReceipt(idempotencyKey: string) {
  return readStore().receipts.find(item => item.idempotency_key === clean(idempotencyKey, 128)) || null;
}

export function buildFeishuQueuedTurnContextV2(envelope: FeishuInboundEnvelopeV2, payload: any, destination: any): FeishuQueuedTurnContextV2 {
  const identity = envelope.identity;
  return {
    schema: "ccm-feishu-queued-turn-context-v2",
    target_type: envelope.target_type,
    project_id: envelope.project_id,
    conversation_key_v2: identity.conversation_key_v2,
    message_id: envelope.message_id || envelope.event_id,
    payload: {
      target_type: envelope.target_type,
      project: envelope.project_id,
      chat_id: identity.chat_id,
      open_id: identity.open_id,
      user_id: identity.user_id,
      root_id: identity.root_message_id,
      thread_id: identity.thread_id,
      message_id: envelope.message_id,
      platform_session_key: identity.platform_session_key,
      feishu_app_fingerprint: identity.application_fingerprint,
    },
    destination: {
      chat_id: destination?.chat_id || identity.chat_id,
      open_id: destination?.open_id || identity.open_id,
      user_id: destination?.user_id || identity.user_id,
      receive_id: destination?.receive_id || identity.chat_id || identity.open_id,
      receive_id_type: destination?.receive_id_type || (identity.chat_id ? "chat_id" : "open_id"),
      platform_session_key: destination?.platform_session_key || identity.platform_session_key,
      message_id: destination?.message_id || envelope.message_id,
      root_message_id: destination?.root_message_id || identity.root_message_id,
      thread_id: destination?.thread_id || identity.thread_id,
      conversation_key_v2: identity.conversation_key_v2,
      app_fingerprint: identity.application_fingerprint,
      target_type: envelope.target_type,
      project_id: envelope.project_id,
    },
    envelope_checksum: envelope.checksum,
  };
}

export function buildFeishuOriginReceiptV2(input: {
  envelope: FeishuInboundEnvelopeV2;
  sessionId: string;
}): FeishuOriginReceiptV2 {
  const core = {
    source: input.envelope.target_type === "project_agent" ? "project_feishu" as const : "global_feishu" as const,
    project_id: input.envelope.project_id,
    session_id: clean(input.sessionId, 240),
    conversation_key_v2: input.envelope.identity.conversation_key_v2,
    message_id: input.envelope.message_id || input.envelope.event_id,
    envelope_checksum: input.envelope.checksum,
  };
  return { schema: "ccm-feishu-origin-receipt-v2", ...core, checksum: digest(core) };
}
