import * as crypto from "crypto";
import type { IncomingMessage, ServerResponse } from "http";
import { sendJson } from "../core/utils";
import { listActiveAdminUserIds, listActiveLocalAuthUsers } from "../modules/system/local-auth";
import { publishRuntimeEvent } from "./runtime-events";
import { getObservabilityDatabase, withImmediateObservabilityTransaction } from "./observability-database";

export type UserNotificationChannel = "web" | "desktop_pet" | "web_pet" | "feishu";
export type UserNotificationSeverity = "info" | "success" | "warning" | "error" | "critical";
export type UserNotificationState = "active" | "resolved";
export type UserNotificationDeliveryState = "pending" | "sending" | "delivered" | "failed" | "delivery_unknown";

export type UserNotificationV2 = {
  notification_id: string;
  recipient_user_id: string;
  source_type: string;
  source_channel: string;
  scope_type: "global" | "group" | "project" | "task" | "system" | "music";
  scope_id: string;
  exact_session_id: string;
  task_id: string;
  notification_type: string;
  severity: UserNotificationSeverity;
  state: UserNotificationState;
  title: string;
  summary: string;
  action: Record<string, any>;
  dedupe_key: string;
  event_checksum: string;
  created_at: string;
  updated_at: string;
  read_at: string;
  dismissed_at: string;
  resolved_at: string;
  expires_at: string;
};

export type UserNotificationDeliveryV2 = {
  delivery_id: string;
  notification_id: string;
  channel: UserNotificationChannel;
  state: UserNotificationDeliveryState;
  client_id: string;
  attempt_count: number;
  next_attempt_at: string;
  claimed_at: string;
  delivered_at: string;
  failed_at: string;
  last_error: string;
  created_at: string;
  updated_at: string;
};

export type PetNotificationProjectionV2 = {
  version: 2;
  notification_id: string;
  delivery_id: string;
  role: "status" | "ask" | "error" | "assistant";
  title: string;
  summary: string;
  severity: UserNotificationSeverity;
  action: Record<string, any>;
  created_at: string;
};

const MAX_SUMMARY = 240;
const MAX_TITLE = 80;
const listeners = new Set<(notification: UserNotificationV2) => void>();

function now() { return new Date().toISOString(); }
function sha256(value: any) { return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex"); }
function compact(value: any, max: number) {
  const text = String(value || "")
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/(?:authorization|api[\s_-]?key|access[\s_-]?token|secret|cookie)\s*[:=]\s*[^\s,;]+/gi, "[敏感字段]=[已隐藏]")
    .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{12,}\b/g, "[密钥已隐藏]")
    .replace(/\b[A-Za-z]:[\\/][^\r\n,;]+/g, "[本地路径]")
    .replace(/\/(?:home|Users|root|tmp|var)\/[^\r\n,;]+/g, "[本地路径]")
    .replace(/<\/?(?:task-notification|task-id|receipt-status|tool-use|tool-result)[^>]*>/gi, " ")
    .replace(/\b(?:trace_id|session_id|generation|native_session|raw_payload|prompt)\s*[:=]\s*[^\s,;]+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1)).trim()}…`;
}

export function sanitizePetNotificationText(value: any, max = MAX_SUMMARY) {
  return compact(value, Math.max(1, Math.min(MAX_SUMMARY, Number(max) || MAX_SUMMARY)));
}

export function createPetSpeechNotification(input: {
  agent: string;
  role?: string;
  text: string;
  source?: string;
  task_id?: string;
  scope_id?: string;
  exact_session_id?: string;
  action?: Record<string, any>;
  dedupe_key?: string;
  notification_type?: string;
  title?: string;
  severity?: UserNotificationSeverity;
  terminal?: boolean;
}) {
  const role = String(input.role || "assistant");
  const source = String(input.source || "system");
  const summary = sanitizePetNotificationText(input.text);
  if (!summary || role === "user") return [];
  const explicitType = compact(input.notification_type, 64);
  const notificationType = explicitType || (role === "attention" || role === "ask"
    ? "needs_user"
    : role === "error" ? "agent_failed" : "agent_message");
  const severity: UserNotificationSeverity = input.severity
    || (role === "error" ? "error" : notificationType === "needs_user" ? "warning" : input.terminal === true ? "success" : "info");
  return createUserNotification({
    source_type: "agent_event",
    source_channel: source,
    scope_type: source === "global" ? "global" : source === "group" ? "group" : source === "project" ? "project" : source === "music" ? "music" : "system",
    scope_id: input.scope_id || input.agent,
    exact_session_id: input.exact_session_id,
    task_id: input.task_id,
    notification_type: notificationType,
    severity,
    title: input.title || (notificationType === "needs_user" ? "需要你处理" : role === "error" ? "Agent执行失败" : input.terminal === true ? "任务已完成" : "Agent消息"),
    summary,
    action: input.action || {
      kind: input.task_id ? "task" : "agent",
      task_id: input.task_id || "",
      session_id: input.exact_session_id || "",
      scope_id: input.scope_id || input.agent,
    },
    dedupe_key: input.dedupe_key || `pet:${source}:${input.agent}:${input.task_id || sha256(summary).slice(0, 24)}:${Date.now()}`,
  });
}

function normalizeAction(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const action: Record<string, string> = {};
  for (const key of [
    "kind", "tab", "scope_type", "scope_id", "session_id", "task_id", "permission_id", "project_id", "group_id",
    "anchor_message_id", "origin_message_id", "generation",
  ]) {
    const text = compact(value[key], 160);
    if (text) action[key] = text;
  }
  return action;
}

function parseJson(value: any) { try { return JSON.parse(String(value || "{}")); } catch { return {}; } }
function notificationRow(row: any): UserNotificationV2 {
  return {
    notification_id: String(row.notification_id || ""),
    recipient_user_id: String(row.recipient_user_id || ""),
    source_type: String(row.source_type || ""),
    source_channel: String(row.source_channel || ""),
    scope_type: row.scope_type || "system",
    scope_id: String(row.scope_id || ""),
    exact_session_id: String(row.exact_session_id || ""),
    task_id: String(row.task_id || ""),
    notification_type: String(row.notification_type || "status"),
    severity: row.severity || "info",
    state: row.state || "active",
    title: String(row.title || ""),
    summary: String(row.summary || ""),
    action: parseJson(row.action_json),
    dedupe_key: String(row.dedupe_key || ""),
    event_checksum: String(row.event_checksum || ""),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
    read_at: String(row.read_at || ""),
    dismissed_at: String(row.dismissed_at || ""),
    resolved_at: String(row.resolved_at || ""),
    expires_at: String(row.expires_at || ""),
  };
}

function deliveryRow(row: any): UserNotificationDeliveryV2 {
  return {
    delivery_id: String(row.delivery_id || ""),
    notification_id: String(row.notification_id || ""),
    channel: row.channel || "web",
    state: row.state || "pending",
    client_id: String(row.client_id || ""),
    attempt_count: Number(row.attempt_count || 0),
    next_attempt_at: String(row.next_attempt_at || ""),
    claimed_at: String(row.claimed_at || ""),
    delivered_at: String(row.delivered_at || ""),
    failed_at: String(row.failed_at || ""),
    last_error: String(row.last_error || ""),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function resolveRecipients(explicit: string[] = []) {
  const active = new Set(listActiveLocalAuthUsers().map(user => user.id));
  const selected = [...new Set(explicit.map(String).filter(id => active.has(id)))];
  return selected.length ? selected : listActiveAdminUserIds();
}

export function createUserNotification(input: {
  recipient_user_ids?: string[];
  source_type: string;
  source_channel?: string;
  scope_type?: UserNotificationV2["scope_type"];
  scope_id?: string;
  exact_session_id?: string;
  task_id?: string;
  notification_type: string;
  severity?: UserNotificationSeverity;
  state?: UserNotificationState;
  title: string;
  summary: string;
  action?: Record<string, any>;
  dedupe_key: string;
  channels?: UserNotificationChannel[];
  expires_at?: string;
}) {
  const recipients = resolveRecipients(input.recipient_user_ids);
  const created: UserNotificationV2[] = [];
  const timestamp = now();
  const title = compact(input.title, MAX_TITLE) || "CCM通知";
  const summary = compact(input.summary, MAX_SUMMARY) || title;
  const action = normalizeAction(input.action);
  const channels = [...new Set(input.channels?.length ? input.channels : ["web", "desktop_pet", "web_pet"])] as UserNotificationChannel[];
  const core = {
    source_type: compact(input.source_type, 64),
    source_channel: compact(input.source_channel, 64),
    scope_type: input.scope_type || "system",
    scope_id: compact(input.scope_id, 160),
    exact_session_id: compact(input.exact_session_id, 160),
    task_id: compact(input.task_id, 160),
    notification_type: compact(input.notification_type, 64),
    severity: input.severity || "info",
    state: input.state || "active",
    title,
    summary,
    action,
    dedupe_key: compact(input.dedupe_key, 240),
    expires_at: String(input.expires_at || ""),
  };
  const eventChecksum = sha256(core);

  withImmediateObservabilityTransaction(db => {
    for (const recipient of recipients) {
      const notificationId = `un_${sha256(`${recipient}:${core.dedupe_key}`).slice(0, 32)}`;
      db.prepare(`
        INSERT INTO user_notifications_v2 (
          notification_id,recipient_user_id,source_type,source_channel,scope_type,scope_id,exact_session_id,task_id,
          notification_type,severity,state,title,summary,action_json,dedupe_key,event_checksum,created_at,updated_at,expires_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(recipient_user_id,dedupe_key) DO UPDATE SET
          severity=excluded.severity,state=excluded.state,title=excluded.title,summary=excluded.summary,
          action_json=excluded.action_json,event_checksum=excluded.event_checksum,updated_at=excluded.updated_at,
          expires_at=excluded.expires_at
      `).run(
        notificationId, recipient, core.source_type, core.source_channel, core.scope_type, core.scope_id,
        core.exact_session_id, core.task_id, core.notification_type, core.severity, core.state, core.title,
        core.summary, JSON.stringify(core.action), core.dedupe_key, eventChecksum, timestamp, timestamp,
        core.expires_at || null,
      );
      for (const channel of channels) {
        const deliveryId = `und_${sha256(`${notificationId}:${channel}`).slice(0, 32)}`;
        db.prepare(`
          INSERT INTO user_notification_deliveries_v2 (
            delivery_id,notification_id,channel,state,created_at,updated_at
          ) VALUES (?,?,?,?,?,?)
          ON CONFLICT(notification_id,channel) DO NOTHING
        `).run(deliveryId, notificationId, channel, channel === "web" ? "delivered" : "pending", timestamp, timestamp);
      }
      const row = db.prepare("SELECT * FROM user_notifications_v2 WHERE notification_id=?").get(notificationId);
      if (row) created.push(notificationRow(row));
    }
  });

  for (const notification of created) {
    publishRuntimeEvent("system", "notification.created", {
      notification_id: notification.notification_id,
      recipient_user_id: notification.recipient_user_id,
      severity: notification.severity,
    });
    for (const listener of listeners) {
      try { listener(notification); } catch {}
    }
  }
  return created;
}

export function subscribeUserNotifications(listener: (notification: UserNotificationV2) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function listUserNotifications(userId: string, options: { cursor?: string; limit?: number; unreadOnly?: boolean } = {}) {
  const limit = Math.max(1, Math.min(100, Number(options.limit) || 30));
  const clauses = ["recipient_user_id=?", "dismissed_at IS NULL"];
  const args: any[] = [String(userId || "")];
  if (options.cursor) { clauses.push("created_at < ?"); args.push(String(options.cursor)); }
  if (options.unreadOnly) clauses.push("read_at IS NULL");
  args.push(limit + 1);
  const rows = getObservabilityDatabase().prepare(`
    SELECT * FROM user_notifications_v2
    WHERE ${clauses.join(" AND ")}
    ORDER BY created_at DESC, notification_id DESC
    LIMIT ?
  `).all(...args) as any[];
  const items = rows.slice(0, limit).map(notificationRow);
  return { items, next_cursor: rows.length > limit ? items[items.length - 1]?.created_at || "" : "" };
}

export function unreadUserNotificationCount(userId: string) {
  const row = getObservabilityDatabase().prepare(`
    SELECT COUNT(*) count FROM user_notifications_v2
    WHERE recipient_user_id=? AND read_at IS NULL AND dismissed_at IS NULL
  `).get(String(userId || "")) as any;
  return Number(row?.count || 0);
}

export function mutateUserNotification(userId: string, notificationId: string, action: "read" | "dismiss") {
  const timestamp = now();
  const field = action === "read" ? "read_at" : "dismissed_at";
  const result = getObservabilityDatabase().prepare(`
    UPDATE user_notifications_v2 SET ${field}=?,updated_at=?
    WHERE notification_id=? AND recipient_user_id=?
  `).run(timestamp, timestamp, String(notificationId || ""), String(userId || ""));
  return Number(result.changes || 0) > 0;
}

export function markAllUserNotificationsRead(userId: string) {
  const timestamp = now();
  return Number(getObservabilityDatabase().prepare(`
    UPDATE user_notifications_v2 SET read_at=COALESCE(read_at,?),updated_at=?
    WHERE recipient_user_id=? AND dismissed_at IS NULL AND read_at IS NULL
  `).run(timestamp, timestamp, String(userId || "")).changes || 0);
}

export function resolveUserNotificationsByDedupeKey(dedupeKey: string) {
  const timestamp = now();
  return withImmediateObservabilityTransaction(db => {
    const rows = db.prepare("SELECT notification_id FROM user_notifications_v2 WHERE dedupe_key=? AND state!='resolved'")
      .all(compact(dedupeKey, 240)) as any[];
    if (!rows.length) return 0;
    db.prepare(`
      UPDATE user_notifications_v2
      SET state='resolved',resolved_at=?,updated_at=?
      WHERE dedupe_key=? AND state!='resolved'
    `).run(timestamp, timestamp, compact(dedupeKey, 240));
    const ids = rows.map(row => String(row.notification_id || "")).filter(Boolean);
    if (ids.length) {
      const placeholders = ids.map(() => "?").join(",");
      db.prepare(`
        UPDATE user_notification_deliveries_v2
        SET state='delivered',delivered_at=COALESCE(delivered_at,?),updated_at=?,last_error=''
        WHERE notification_id IN (${placeholders}) AND state IN ('pending','failed','sending')
      `).run(timestamp, timestamp, ...ids);
    }
    return ids.length;
  });
}

export function listPendingPetDeliveries(options: { channel: "desktop_pet" | "web_pet"; limit?: number; recipient_user_ids?: string[] } ) {
  const recipientIds = resolveRecipients(options.recipient_user_ids);
  if (!recipientIds.length) return [];
  const placeholders = recipientIds.map(() => "?").join(",");
  const stale = new Date(Date.now() - 15_000).toISOString();
  const rows = getObservabilityDatabase().prepare(`
    SELECT
      d.delivery_id d_delivery_id,d.notification_id d_notification_id,d.channel d_channel,d.state d_state,
      d.client_id d_client_id,d.attempt_count d_attempt_count,d.next_attempt_at d_next_attempt_at,
      d.claimed_at d_claimed_at,d.delivered_at d_delivered_at,d.failed_at d_failed_at,
      d.last_error d_last_error,d.created_at d_created_at,d.updated_at d_updated_at,
      n.*
    FROM user_notification_deliveries_v2 d
    JOIN user_notifications_v2 n ON n.notification_id=d.notification_id
    WHERE d.channel=?
      AND n.recipient_user_id IN (${placeholders})
      AND n.dismissed_at IS NULL
      AND (n.expires_at IS NULL OR n.expires_at > ?)
      AND d.attempt_count < 5
      AND (
        d.state IN ('pending','failed')
        OR (d.state='sending' AND (d.claimed_at IS NULL OR d.claimed_at < ?))
      )
      AND (d.next_attempt_at IS NULL OR d.next_attempt_at <= ?)
    ORDER BY n.created_at ASC
    LIMIT ?
  `).all(options.channel, ...recipientIds, now(), stale, now(), Math.max(1, Math.min(100, Number(options.limit) || 30))) as any[];
  return rows.map(row => ({
    notification: notificationRow(row),
    delivery: deliveryRow({
      delivery_id: row.d_delivery_id,
      notification_id: row.d_notification_id,
      channel: row.d_channel,
      state: row.d_state,
      client_id: row.d_client_id,
      attempt_count: row.d_attempt_count,
      next_attempt_at: row.d_next_attempt_at,
      claimed_at: row.d_claimed_at,
      delivered_at: row.d_delivered_at,
      failed_at: row.d_failed_at,
      last_error: row.d_last_error,
      created_at: row.d_created_at,
      updated_at: row.d_updated_at,
    }),
  }));
}

export function claimPetDelivery(deliveryId: string, clientId: string) {
  const timestamp = now();
  const stale = new Date(Date.now() - 15_000).toISOString();
  const result = getObservabilityDatabase().prepare(`
    UPDATE user_notification_deliveries_v2
    SET state='sending',client_id=?,attempt_count=attempt_count+1,claimed_at=?,updated_at=?,last_error=''
    WHERE delivery_id=? AND channel IN ('desktop_pet','web_pet') AND attempt_count < 5
      AND (state IN ('pending','failed') OR (state='sending' AND (claimed_at IS NULL OR claimed_at < ?)))
  `).run(compact(clientId, 120), timestamp, timestamp, String(deliveryId || ""), stale);
  return Number(result.changes || 0) > 0;
}

export function acknowledgePetDelivery(deliveryId: string, clientId: string) {
  const timestamp = now();
  const normalizedClientId = compact(clientId, 120);
  const result = getObservabilityDatabase().prepare(`
    UPDATE user_notification_deliveries_v2
    SET state='delivered',delivered_at=?,updated_at=?,next_attempt_at=NULL,last_error=''
    WHERE delivery_id=? AND channel IN ('desktop_pet','web_pet') AND state='sending' AND client_id=?
  `).run(timestamp, timestamp, String(deliveryId || ""), normalizedClientId);
  return Number(result.changes || 0) > 0;
}

export function failPetDelivery(deliveryId: string, error: any) {
  const timestamp = now();
  const row = getObservabilityDatabase().prepare("SELECT attempt_count FROM user_notification_deliveries_v2 WHERE delivery_id=?").get(String(deliveryId || "")) as any;
  const attempts = Number(row?.attempt_count || 0);
  const nextAttempt = attempts >= 5 ? null : new Date(Date.now() + Math.min(60_000, 2_000 * 2 ** attempts)).toISOString();
  getObservabilityDatabase().prepare(`
    UPDATE user_notification_deliveries_v2
    SET state='failed',failed_at=?,updated_at=?,next_attempt_at=?,last_error=?
    WHERE delivery_id=? AND state!='delivered'
  `).run(timestamp, timestamp, nextAttempt, compact(error?.message || error, 240), String(deliveryId || ""));
}

export function setNotificationDeliveryState(
  notificationId: string,
  channel: UserNotificationChannel,
  state: UserNotificationDeliveryState,
  details: { client_id?: string; error?: any } = {},
) {
  const timestamp = now();
  const deliveredAt = state === "delivered" ? timestamp : null;
  const failedAt = ["failed", "delivery_unknown"].includes(state) ? timestamp : null;
  const result = getObservabilityDatabase().prepare(`
    UPDATE user_notification_deliveries_v2
    SET state=?,client_id=?,delivered_at=COALESCE(?,delivered_at),failed_at=COALESCE(?,failed_at),
        last_error=?,updated_at=?,next_attempt_at=NULL
    WHERE notification_id=? AND channel=?
  `).run(
    state,
    compact(details.client_id, 120),
    deliveredAt,
    failedAt,
    compact(details.error?.message || details.error, 240),
    timestamp,
    String(notificationId || ""),
    channel,
  );
  return Number(result.changes || 0) > 0;
}

export function projectPetNotification(notification: UserNotificationV2, delivery: UserNotificationDeliveryV2): PetNotificationProjectionV2 {
  const role = notification.notification_type === "permission_required" || notification.notification_type === "needs_user"
    ? "ask"
    : ["error", "critical"].includes(notification.severity)
      ? "error"
      : notification.severity === "success" ? "assistant" : "status";
  return {
    version: 2,
    notification_id: notification.notification_id,
    delivery_id: delivery.delivery_id,
    role,
    title: compact(notification.title, MAX_TITLE),
    summary: compact(notification.summary, MAX_SUMMARY),
    severity: notification.severity,
    action: normalizeAction(notification.action),
    created_at: notification.created_at,
  };
}

function readJsonBody(req: IncomingMessage, maxBytes = 64 * 1024): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (Buffer.byteLength(body, "utf-8") > maxBytes) reject(new Error("请求内容过大"));
    });
    req.on("end", () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error("请求JSON无效")); } });
    req.on("error", reject);
  });
}

export function handleUserNotificationsApi(pathname: string, req: any, res: ServerResponse, parsed: any) {
  if (!pathname.startsWith("/api/notifications")) return false;
  const userId = String(req.ccmAuth?.userId || "");
  if (!userId) {
    sendJson(res, { success: false, error: "通知中心只允许登录用户访问" }, 403);
    return true;
  }
  if (pathname === "/api/notifications" && req.method === "GET") {
    const result = listUserNotifications(userId, {
      cursor: String(parsed.query.cursor || ""),
      limit: Number(parsed.query.limit || 30),
      unreadOnly: String(parsed.query.unread_only || "") === "1",
    });
    sendJson(res, { success: true, ...result, unread_count: unreadUserNotificationCount(userId) });
    return true;
  }
  if (pathname === "/api/notifications/unread-count" && req.method === "GET") {
    sendJson(res, { success: true, unread_count: unreadUserNotificationCount(userId) });
    return true;
  }
  if (pathname === "/api/notifications/read-all" && req.method === "POST") {
    sendJson(res, { success: true, updated: markAllUserNotificationsRead(userId) });
    return true;
  }
  const match = pathname.match(/^\/api\/notifications\/([^/]+)\/(read|dismiss)$/);
  if (match && req.method === "POST") {
    void readJsonBody(req).then(() => {
      const updated = mutateUserNotification(userId, decodeURIComponent(match[1]), match[2] as "read" | "dismiss");
      sendJson(res, { success: updated }, updated ? 200 : 404);
    }).catch(error => sendJson(res, { success: false, error: error?.message || "通知操作失败" }, 400));
    return true;
  }
  return false;
}

export function runUserNotificationSelfTest() {
  const projection = projectPetNotification({
    notification_id: "un_test",
    recipient_user_id: "usr_test",
    source_type: "task",
    source_channel: "web",
    scope_type: "task",
    scope_id: "task_1",
    exact_session_id: "session_1",
    task_id: "task_1",
    notification_type: "permission_required",
    severity: "warning",
    state: "active",
    title: "需要权限确认",
    summary: "API Key=secret-value C:\\private\\project\\file.ts",
    action: { kind: "permission", permission_id: "perm_1", url: "https://should-not-pass.example" },
    dedupe_key: "test",
    event_checksum: "checksum",
    created_at: now(),
    updated_at: now(),
    read_at: "",
    dismissed_at: "",
    resolved_at: "",
    expires_at: "",
  }, {
    delivery_id: "delivery_1",
    notification_id: "un_test",
    channel: "desktop_pet",
    state: "pending",
    client_id: "",
    attempt_count: 0,
    next_attempt_at: "",
    claimed_at: "",
    delivered_at: "",
    failed_at: "",
    last_error: "",
    created_at: now(),
    updated_at: now(),
  });
  return {
    pass: projection.role === "ask"
      && !/secret-value|private|should-not-pass/.test(JSON.stringify(projection))
      && projection.summary.length <= MAX_SUMMARY,
    projection,
  };
}
