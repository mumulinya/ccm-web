import * as crypto from "crypto";
import { publishRuntimeEvent } from "../system/runtime-events";
import {
  persistTaskContextProjection,
  upsertTaskInSqliteTransaction,
  withImmediateTaskStoreTransaction,
  withSqliteTaskStore,
} from "../core/task-store";

export type CcmTimelineScope = "global" | "group" | "project" | "feishu";
export type CcmSessionTimelineEventType =
  | "user_message" | "assistant_message" | "tool_use" | "tool_result"
  | "file_read" | "file_change" | "verification"
  | "task_started" | "task_attempt_started" | "task_finished"
  | "task_failed" | "task_interrupted" | "task_cancelled";

export type CcmTaskTimelineCursorV1 = { spanId: string; exactSessionId: string; sequence: number; eventChecksum: string };
export type CcmTaskContextHeadV1 = {
  taskId: string; revision: number; checksum: string; activeSpanId?: string;
  appliedCursors: CcmTaskTimelineCursorV1[]; latestSnapshotRevision: number;
  status: "ready" | "drifted" | "locked"; contentStored: false;
};
export type CcmSessionTimelineEventV2 = {
  schema: "ccm-session-timeline-event-v2"; sequence: number; eventId: string; exactSessionId: string;
  scope: CcmTimelineScope; type: CcmSessionTimelineEventType; taskId?: string; workItemId?: string;
  generation?: number; attempt?: number; leaseId?: string; timestamp: string; payloadRef?: string;
  idempotencyKey: string; previousChecksum: string; checksum: string; contentStored: false;
};
export type CcmSessionTimelineEventV1 = CcmSessionTimelineEventV2;
export type CcmTaskTimelineSpanV1 = {
  schema: "ccm-task-timeline-span-v1"; spanId: string; taskId: string; exactSessionId: string;
  startMarkerId: string; startSequence: number; endMarkerId?: string; endSequence?: number;
  attemptSpans: Array<{ attempt: number; startSequence: number; endSequence?: number; status: "running" | "success" | "failed" | "blocked" | "interrupted" | "cancelled" }>;
  status: "open" | "completed" | "failed" | "blocked" | "interrupted" | "cancelled";
  latestSequence: number; summary?: { title: string; goal: string; result: string; evidenceIds: string[]; contentStored: false };
  checksum: string; contentStored: false;
};
export type CcmSessionTaskIndexV1 = {
  schema: "ccm-session-task-index-v1"; exactSessionId: string; scope: CcmTimelineScope; scopeId: string;
  events: CcmSessionTimelineEventV2[]; taskSpans: CcmTaskTimelineSpanV1[]; activeTaskId?: string;
  latestSequence: number; checksum: string; contentStored: false;
};

type TimelineInput = {
  exactSessionId: string; scope: CcmTimelineScope; scopeId: string; type: CcmSessionTimelineEventType;
  eventId?: string; idempotencyKey?: string; taskId?: string; workItemId?: string; generation?: number;
  attempt?: number; leaseId?: string; payloadRef?: string; timestamp?: string; activeTaskId?: string | null;
  span?: CcmTaskTimelineSpanV1; contextReason?: string; forceSnapshot?: boolean; projectContext?: boolean;
};

const text = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);
const stringify = (value: unknown) => JSON.stringify(value ?? null);
const parse = <T>(value: unknown, fallback: T): T => { try { return JSON.parse(String(value || "")); } catch { return fallback; } };
const digest = (value: unknown) => crypto.createHash("sha256").update(typeof value === "string" ? value : stringify(value)).digest("hex");
const canonicalJson = (value: any): string => {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
};
const contextDigest = (value: unknown) => crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
const spanIdFor = (taskId: string, exactSessionId: string) => `tspan_${digest([taskId, exactSessionId]).slice(0, 24)}`;
function withoutChecksum<T extends Record<string, any>>(value: T) { const copy = { ...value }; delete copy.checksum; return copy; }

function normalizeStatus(status: string): CcmTaskTimelineSpanV1["attemptSpans"][number]["status"] {
  if (["done", "completed", "success", "succeeded"].includes(status)) return "success";
  if (status === "blocked") return "blocked";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  if (["interrupted", "recovery_required"].includes(status)) return "interrupted";
  if (["failed", "error"].includes(status)) return "failed";
  return "running";
}

function mapEvent(row: any): CcmSessionTimelineEventV2 {
  return {
    schema: "ccm-session-timeline-event-v2", sequence: Number(row.sequence || 0), eventId: String(row.event_id || ""), exactSessionId: String(row.exact_session_id || ""), scope: row.scope,
    type: row.event_type, ...(row.task_id ? { taskId: row.task_id } : {}), ...(row.work_item_id ? { workItemId: row.work_item_id } : {}),
    ...(Number(row.generation || 0) ? { generation: Number(row.generation) } : {}), ...(Number(row.attempt || 0) ? { attempt: Number(row.attempt) } : {}),
    ...(row.lease_id ? { leaseId: row.lease_id } : {}), timestamp: String(row.created_at || ""), ...(row.payload_ref ? { payloadRef: row.payload_ref } : {}),
    idempotencyKey: String(row.idempotency_key || ""), previousChecksum: String(row.previous_checksum || ""), checksum: String(row.checksum || ""), contentStored: false,
  };
}

function spanFromRow(db: any, row: any): CcmTaskTimelineSpanV1 {
  const attempts = db.prepare("SELECT attempt, start_sequence, end_sequence, status FROM task_attempt_spans WHERE span_id = ? ORDER BY attempt ASC").all(row.span_id).map((item: any) => ({
    attempt: Number(item.attempt || 0), startSequence: Number(item.start_sequence || 0), ...(item.end_sequence == null ? {} : { endSequence: Number(item.end_sequence) }), status: item.status,
  }));
  return {
    schema: "ccm-task-timeline-span-v1", spanId: String(row.span_id), taskId: String(row.task_id), exactSessionId: String(row.exact_session_id),
    startMarkerId: String(row.start_event_id), startSequence: Number(row.start_sequence), ...(row.end_event_id ? { endMarkerId: String(row.end_event_id) } : {}),
    ...(row.end_sequence == null ? {} : { endSequence: Number(row.end_sequence) }), attemptSpans: attempts, status: row.status,
    latestSequence: Number(row.latest_sequence || 0), summary: parse(row.summary_json, { title: "", goal: "", result: "", evidenceIds: [], contentStored: false }),
    checksum: String(row.checksum || ""), contentStored: false,
  };
}

function readSpans(db: any, clause: string, values: any[]) {
  return db.prepare(`SELECT * FROM task_timeline_spans WHERE ${clause} ORDER BY created_at ASC, start_sequence ASC`).all(...values).map((row: any) => spanFromRow(db, row));
}

function upsertSpan(db: any, scope: CcmTimelineScope, scopeId: string, span: CcmTaskTimelineSpanV1) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO task_timeline_spans(span_id, task_id, scope, scope_id, exact_session_id, start_event_id, start_sequence, end_event_id, end_sequence, latest_sequence, status, summary_json, checksum, created_at, updated_at, content_stored)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(span_id) DO UPDATE SET end_event_id=excluded.end_event_id, end_sequence=excluded.end_sequence,
      latest_sequence=excluded.latest_sequence, status=excluded.status, summary_json=excluded.summary_json, checksum=excluded.checksum, updated_at=excluded.updated_at
  `).run(span.spanId, span.taskId, scope, scopeId, span.exactSessionId, span.startMarkerId, span.startSequence, span.endMarkerId || "", span.endSequence ?? null, span.latestSequence, span.status, stringify(span.summary || {}), span.checksum, now, now);
  const statement = db.prepare(`
    INSERT INTO task_attempt_spans(span_id, attempt, start_sequence, end_sequence, status, checksum, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(span_id, attempt) DO UPDATE SET end_sequence=excluded.end_sequence, status=excluded.status, checksum=excluded.checksum, updated_at=excluded.updated_at
  `);
  for (const attempt of span.attemptSpans) statement.run(span.spanId, attempt.attempt, attempt.startSequence, attempt.endSequence ?? null, attempt.status, digest({ spanId: span.spanId, ...attempt }), now, now);
}

function readIndexInDb(db: any, input: { exactSessionId: string; scope: CcmTimelineScope; scopeId: string }): CcmSessionTaskIndexV1 {
  const sessionId = text(input.exactSessionId, 300); const scopeId = text(input.scopeId, 200);
  const head = db.prepare("SELECT * FROM session_timeline_heads WHERE scope=? AND scope_id=? AND exact_session_id=?").get(input.scope, scopeId, sessionId) as any;
  const events = db.prepare("SELECT * FROM session_timeline_events WHERE scope=? AND scope_id=? AND exact_session_id=? ORDER BY sequence ASC").all(input.scope, scopeId, sessionId).map(mapEvent);
  const taskSpans = readSpans(db, "scope=? AND scope_id=? AND exact_session_id=?", [input.scope, scopeId, sessionId]);
  const base = { schema: "ccm-session-task-index-v1" as const, exactSessionId: sessionId, scope: input.scope, scopeId, events, taskSpans, ...(head?.active_task_id ? { activeTaskId: String(head.active_task_id) } : {}), latestSequence: Number(head?.latest_sequence || 0), contentStored: false as const };
  return { ...base, checksum: digest(base) };
}

export function emptySessionTaskIndex(input: { exactSessionId: string; scope: CcmTimelineScope; scopeId: string }): CcmSessionTaskIndexV1 {
  const base = { schema: "ccm-session-task-index-v1" as const, exactSessionId: text(input.exactSessionId, 300), scope: input.scope, scopeId: text(input.scopeId, 200), events: [], taskSpans: [], latestSequence: 0, contentStored: false as const };
  return { ...base, checksum: digest(base) };
}
export function readSessionTaskIndex(input: { exactSessionId: string; scope: CcmTimelineScope; scopeId: string }) { return withSqliteTaskStore(db => readIndexInDb(db, input)); }
export function readVerifiedSessionTaskIndex(input: { exactSessionId: string; scope: CcmTimelineScope; scopeId: string }) {
  const index = readSessionTaskIndex(input);
  if (!index.activeTaskId) return index;
  const caughtUp = catchUpTaskContext(index.activeTaskId);
  if (!caughtUp.success) throw new Error("当前任务上下文事件链发生漂移，已阻止模型继续执行");
  return readSessionTaskIndex(input);
}
function cursorFor(span: CcmTaskTimelineSpanV1, event: CcmSessionTimelineEventV2): CcmTaskTimelineCursorV1 { return { spanId: span.spanId, exactSessionId: span.exactSessionId, sequence: event.sequence, eventChecksum: event.checksum }; }

function advanceTaskContext(db: any, taskId: string, span: CcmTaskTimelineSpanV1 | null, event: CcmSessionTimelineEventV2, reason: string, forceSnapshot: boolean) {
  if (!span) return;
  const head = db.prepare("SELECT * FROM task_context_heads WHERE task_id=?").get(taskId) as any;
  if (!head) return;
  const context = parse<any>(head.projection_json, null); if (!context) return;
  const cursors = parse<CcmTaskTimelineCursorV1[]>(head.applied_cursors_json, []).filter(item => item.spanId !== span.spanId); cursors.push(cursorFor(span, event));
  const keyEvent = !["assistant_message", "user_message", "tool_use", "tool_result"].includes(event.type);
  if (!keyEvent) {
    const latestSnapshot = db.prepare("SELECT created_at FROM task_context_snapshots WHERE task_id=? ORDER BY revision DESC LIMIT 1").get(taskId) as any;
    const snapshotAgeMs = latestSnapshot?.created_at ? Date.now() - Date.parse(String(latestSnapshot.created_at)) : Number.POSITIVE_INFINITY;
    if (snapshotAgeMs >= 5 * 60_000) {
      const timelineSpans = readSpans(db, "task_id=?", [taskId]);
      const next = { ...context, timelineSpans, activeSpanId: span.status === "open" ? span.spanId : "", appliedCursors: cursors, latestCheckpointSequence: event.sequence, revision: Number(head.revision || 0) + 1, updatedAt: new Date().toISOString(), contentStored: false };
      persistTaskContextProjection(db, taskId, next, "dirty_checkpoint", event.eventId, true);
      return;
    }
    db.prepare("UPDATE task_context_heads SET active_span_id=?, applied_cursors_json=?, updated_at=? WHERE task_id=?")
      .run(span.status === "open" ? span.spanId : "", stringify(cursors), new Date().toISOString(), taskId);
    return;
  }
  const timelineSpans = readSpans(db, "task_id=?", [taskId]);
  const next = { ...context, timelineSpans, activeSpanId: span.status === "open" ? span.spanId : "", appliedCursors: cursors, latestCheckpointSequence: event.sequence, revision: Number(head.revision || 0) + 1, updatedAt: new Date().toISOString(), contentStored: false };
  persistTaskContextProjection(db, taskId, next, reason, event.eventId, forceSnapshot);
}

function appendInDb(db: any, input: TimelineInput): CcmSessionTaskIndexV1 {
  const exactSessionId = text(input.exactSessionId, 300); const scopeId = text(input.scopeId, 200);
  if (!exactSessionId) throw new Error("会话时间线缺少 exactSessionId");
  const eventId = text(input.eventId || `tle_${crypto.randomUUID()}`, 180); const idempotencyKey = text(input.idempotencyKey || eventId, 240);
  const existing = db.prepare("SELECT event_id FROM session_timeline_events WHERE event_id=? OR idempotency_key=? LIMIT 1").get(eventId, idempotencyKey) as any;
  if (existing) return readIndexInDb(db, input);
  const head = db.prepare("SELECT * FROM session_timeline_heads WHERE scope=? AND scope_id=? AND exact_session_id=?").get(input.scope, scopeId, exactSessionId) as any;
  const identityIssues: string[] = [];
  if (input.taskId && input.type !== "task_started") {
    const taskRow = db.prepare("SELECT payload_json FROM tasks WHERE id=?").get(String(input.taskId)) as any;
    const task = parse<any>(taskRow?.payload_json, null);
    if (task) {
      const taskGeneration = Number(task.generation || task.workflow_generation || 0);
      const taskAttempt = Number(task.execution_attempt || task.attempt || 0);
      const taskLease = String(task.lease_id || task.leaseId || "");
      if (input.generation !== undefined && taskGeneration && Number(input.generation) !== taskGeneration) identityIssues.push("generation_mismatch");
      if (input.attempt !== undefined && taskAttempt && Number(input.attempt) !== taskAttempt) identityIssues.push("attempt_mismatch");
      const keyWriteEvent = ["file_read", "file_change", "verification", "task_attempt_started", "task_finished", "task_failed", "task_interrupted", "task_cancelled"].includes(input.type);
      if (keyWriteEvent && taskLease && String(input.leaseId || "") !== taskLease) identityIssues.push(input.leaseId ? "lease_mismatch" : "lease_missing");
    }
  }
  const sequence = Number(head?.latest_sequence || 0) + 1; const previousChecksum = String(head?.head_checksum || ""); const timestamp = text(input.timestamp || new Date().toISOString(), 80);
  const eventBase = { schema: "ccm-session-timeline-event-v2" as const, sequence, eventId, exactSessionId, scope: input.scope, type: input.type,
    ...(input.taskId ? { taskId: text(input.taskId, 120) } : {}), ...(input.workItemId ? { workItemId: text(input.workItemId, 120) } : {}),
    ...(Number(input.generation || 0) > 0 ? { generation: Math.max(0, Number(input.generation)) } : {}), ...(Number(input.attempt || 0) > 0 ? { attempt: Math.max(0, Number(input.attempt)) } : {}),
    ...(input.leaseId ? { leaseId: text(input.leaseId, 160) } : {}), timestamp, ...(input.payloadRef ? { payloadRef: text(input.payloadRef, 300) } : {}), idempotencyKey, previousChecksum, contentStored: false as const };
  const event = { ...eventBase, checksum: digest(eventBase) } as CcmSessionTimelineEventV2;
  db.prepare(`INSERT INTO session_timeline_events(event_id, scope, scope_id, exact_session_id, sequence, event_type, task_id, work_item_id, generation, attempt, lease_id, payload_ref, idempotency_key, previous_checksum, checksum, created_at, content_stored)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`)
    .run(eventId, input.scope, scopeId, exactSessionId, sequence, input.type, input.taskId || "", input.workItemId || "", Number(input.generation || 0), Number(input.attempt || 0), input.leaseId || "", input.payloadRef || "", idempotencyKey, previousChecksum, event.checksum, timestamp);
  const activeTaskId = input.activeTaskId === null ? "" : input.activeTaskId ? text(input.activeTaskId, 120) : String(head?.active_task_id || "");
  db.prepare(`INSERT INTO session_timeline_heads(scope, scope_id, exact_session_id, latest_sequence, active_task_id, head_checksum, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(scope, scope_id, exact_session_id) DO UPDATE SET latest_sequence=excluded.latest_sequence, active_task_id=excluded.active_task_id, head_checksum=excluded.head_checksum, updated_at=excluded.updated_at`)
    .run(input.scope, scopeId, exactSessionId, sequence, activeTaskId, event.checksum, timestamp);
  let span = input.span || null;
  if (!identityIssues.length && span) {
    span = { ...span, spanId: span.spanId || spanIdFor(span.taskId, exactSessionId), exactSessionId, latestSequence: sequence, checksum: "" };
    span = { ...span, checksum: digest(withoutChecksum(span)) }; upsertSpan(db, input.scope, scopeId, span);
  } else if (!identityIssues.length && input.taskId) {
    const row = db.prepare("SELECT * FROM task_timeline_spans WHERE task_id=? AND exact_session_id=?").get(input.taskId, exactSessionId) as any;
    if (row) { span = spanFromRow(db, row); span = { ...span, latestSequence: sequence, checksum: "" }; span = { ...span, checksum: digest(withoutChecksum(span)) }; upsertSpan(db, input.scope, scopeId, span); }
  }
  if (!identityIssues.length && input.projectContext !== false && input.taskId && span) advanceTaskContext(db, input.taskId, span, event, input.contextReason || input.type, input.forceSnapshot === true);
  const outboxDedupe = `timeline:${event.idempotencyKey}`;
  db.prepare(`INSERT INTO task_context_outbox(outbox_id, dedupe_key, task_id, event_type, payload_json, status, attempts, created_at, content_stored)
    VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, 0) ON CONFLICT(dedupe_key) DO NOTHING`)
    .run(`outbox_${digest(outboxDedupe).slice(0, 24)}`, outboxDedupe, input.taskId || "", identityIssues.length ? "session_timeline.diagnostic" : "session_timeline.appended", stringify({ eventId, taskId: input.taskId || "", exactSessionId, sequence, checksum: event.checksum, ...(identityIssues.length ? { issues: identityIssues } : {}), contentStored: false }), timestamp);
  return readIndexInDb(db, input);
}

export function drainTaskContextOutbox(limit = 100) {
  const rows = withSqliteTaskStore(db => db.prepare("SELECT * FROM task_context_outbox WHERE status='pending' ORDER BY created_at ASC LIMIT ?").all(Math.max(1, limit))) as any[]; let published = 0;
  for (const row of rows) {
    const claimed = withSqliteTaskStore(db => db.prepare("UPDATE task_context_outbox SET status='processing' WHERE outbox_id=? AND status='pending'").run(row.outbox_id));
    if (!claimed?.changes) continue;
    try {
      const payload: any = parse(row.payload_json, {});
      if (String(row.event_type || "") === "task.conversation_projection_sync") {
        const task = require("../core/db").getTaskById(String(row.task_id || ""));
        if (!task) throw new Error("任务不存在，无法补偿会话投影");
        const receipt = require("../system/task-conversation-projection").syncTaskConversationProjection(task, String(payload?.reason || "outbox_retry"));
        if (receipt?.status === "failed") throw new Error((receipt?.issues || []).join("；") || "会话投影补偿失败");
        publishRuntimeEvent("task", "task.conversation_projection_synced", { ...payload, receipt, contentStored: false });
      } else {
        publishRuntimeEvent("task", String(row.event_type || "task_context.updated"), payload);
      }
      withSqliteTaskStore(db => db.prepare("UPDATE task_context_outbox SET status='published', attempts=attempts+1, published_at=? WHERE outbox_id=? AND status='processing'").run(new Date().toISOString(), row.outbox_id));
      published += 1;
    } catch {
      withSqliteTaskStore(db => db.prepare("UPDATE task_context_outbox SET status='pending', attempts=attempts+1 WHERE outbox_id=? AND status='processing'").run(row.outbox_id));
    }
  }
  return { published, pending: Math.max(0, rows.length - published) };
}

export function enqueueTaskConversationProjectionSync(input: { taskId: string; taskRevision?: number; reason?: string; issues?: string[] }) {
  const taskId = text(input.taskId, 160);
  if (!taskId) return { queued: false, reason: "task_id_missing" };
  const revision = Math.max(0, Number(input.taskRevision || 0));
  const dedupeKey = `task-conversation-projection:${taskId}:${revision}`;
  const result = withSqliteTaskStore(db => db.prepare(`INSERT INTO task_context_outbox(outbox_id, dedupe_key, task_id, event_type, payload_json, status, attempts, created_at, content_stored)
    VALUES (?, ?, ?, 'task.conversation_projection_sync', ?, 'pending', 0, ?, 0) ON CONFLICT(dedupe_key) DO NOTHING`)
    .run(`outbox_${digest(dedupeKey).slice(0, 24)}`, dedupeKey, taskId, stringify({ taskId, taskRevision: revision, reason: text(input.reason, 160), issues: (input.issues || []).map(item => text(item, 500)).filter(Boolean), contentStored: false }), new Date().toISOString()));
  return { queued: Boolean(result?.changes), taskId, taskRevision: revision, contentStored: false };
}
export function appendSessionTimelineEvent(input: TimelineInput) { const result = withImmediateTaskStoreTransaction(db => appendInDb(db, input)); drainTaskContextOutbox(); return result; }

export function persistTaskMutationWithTimelineAtomically(input: {
  task: any;
  position?: number;
  expectedTaskRevision?: number;
  validateStoredTask?: (storedTask: any, storedContext: any | null) => boolean;
  exactSessionId: string;
  scope: CcmTimelineScope;
  scopeId: string;
  type: CcmSessionTimelineEventType;
  eventId: string;
  idempotencyKey?: string;
  workItemId?: string;
  generation?: number;
  attempt?: number;
  leaseId?: string;
  payloadRef?: string;
  terminalStatus?: string;
  result?: string;
  evidenceIds?: string[];
  contextReason: string;
  forceSnapshot?: boolean;
  buildContext: (task: any, previousContext: any | null) => any;
}) {
  const result = withImmediateTaskStoreTransaction(db => {
    const stored = db.prepare("SELECT position, payload_json FROM tasks WHERE id=?").get(String(input.task?.id || "")) as any;
    if (!stored) throw new Error("任务不存在，无法提交时间线事务");
    const storedTask = parse<any>(stored.payload_json, null);
    const requestedEventId = text(input.eventId, 180);
    const requestedIdempotencyKey = text(input.idempotencyKey || requestedEventId, 240);
    const duplicate = db.prepare("SELECT * FROM session_timeline_events WHERE event_id=? OR idempotency_key=? LIMIT 1").get(requestedEventId, requestedIdempotencyKey) as any;
    if (duplicate) {
      const duplicateIndex = readIndexInDb(db, input);
      const duplicateHead = db.prepare("SELECT revision, checksum, active_span_id, projection_json FROM task_context_heads WHERE task_id=?").get(String(input.task.id)) as any;
      const duplicateContext = parse<any>(duplicateHead?.projection_json, null);
      return {
        task: { ...storedTask, ...(duplicateContext ? { task_context: duplicateContext, task_context_revision: Number(duplicateHead.revision || 0), task_context_checksum: String(duplicateHead.checksum || ""), active_timeline_span_id: String(duplicateHead.active_span_id || "") } : {}) },
        index: duplicateIndex,
        span: duplicateIndex.taskSpans.find(item => item.taskId === String(input.task.id)) || null,
        event: duplicateIndex.events.find(item => item.eventId === String(duplicate.event_id)) || null,
      };
    }
    const headBefore = db.prepare("SELECT projection_json FROM task_context_heads WHERE task_id=?").get(String(input.task.id)) as any;
    const previousContext = parse<any>(headBefore?.projection_json, null);
    if (input.expectedTaskRevision !== undefined && Number(storedTask?.revision || 0) !== Number(input.expectedTaskRevision)) {
      throw new Error(`任务状态版本冲突：expected=${Number(input.expectedTaskRevision)} actual=${Number(storedTask?.revision || 0)}`);
    }
    if (input.validateStoredTask && !input.validateStoredTask(storedTask, previousContext)) throw new Error("任务状态已经变化，时间线事务未能锁定");
    upsertTaskInSqliteTransaction(db, input.task, Number.isFinite(Number(input.position)) ? Number(input.position) : Number(stored.position || 0), false);
    const current = readIndexInDb(db, input);
    let span = current.taskSpans.find(item => item.taskId === String(input.task.id)) || null;
    let eventId = text(input.eventId, 180);
    let eventType = input.type;
    if (input.type === "task_attempt_started") {
      const attempt = Math.max(1, Number(input.attempt || 1));
      eventId = eventId || `task_attempt_started:${text(input.task.id, 120)}:${attempt}`;
      if (!span) span = startSpan({ taskId: String(input.task.id), exactSessionId: input.exactSessionId, attempt, eventId, sequence: current.latestSequence + 1 });
      else {
        span = { ...span, endMarkerId: undefined, endSequence: undefined, status: "open", attemptSpans: [...span.attemptSpans.filter(item => item.attempt !== attempt), { attempt, startSequence: current.latestSequence + 1, status: "running" }], latestSequence: current.latestSequence + 1, checksum: "" };
        span = { ...span, checksum: digest(withoutChecksum(span)) };
      }
    } else if (input.terminalStatus) {
      if (!span) throw new Error("任务缺少活动时间线区间，不能提交终态");
      const terminalStatus = normalizeStatus(input.terminalStatus);
      eventType = terminalStatus === "success" ? "task_finished" : terminalStatus === "failed" || terminalStatus === "blocked" ? "task_failed" : terminalStatus === "cancelled" ? "task_cancelled" : "task_interrupted";
      const attempt = Math.max(1, Number(input.attempt || span.attemptSpans.at(-1)?.attempt || 1));
      eventId = eventId || `task_terminal:${text(input.task.id, 120)}:${terminalStatus}:${attempt}`;
      const sequence = current.latestSequence + 1;
      const attemptSpans = span.attemptSpans.map(item => item.attempt === attempt ? { ...item, endSequence: sequence, status: terminalStatus } : item);
      const spanStatus = terminalStatus === "success" ? "completed" : terminalStatus === "running" ? "interrupted" : terminalStatus;
      span = { ...span, endMarkerId: eventId, endSequence: sequence, attemptSpans, status: spanStatus, latestSequence: sequence,
        summary: { title: text(span.summary?.title, 300), goal: text(span.summary?.goal, 1000), result: text(input.result, 1000), evidenceIds: [...new Set((input.evidenceIds || []).map(item => text(item, 160)).filter(Boolean))].slice(0, 100), contentStored: false }, checksum: "" };
      span = { ...span, checksum: digest(withoutChecksum(span)) };
    }
    const index = appendInDb(db, { ...input, type: eventType, eventId, idempotencyKey: input.idempotencyKey || eventId,
      taskId: String(input.task.id), activeTaskId: input.type === "task_attempt_started" ? String(input.task.id) : input.terminalStatus && current.activeTaskId === String(input.task.id) ? null : current.activeTaskId,
      ...(span ? { span } : {}), projectContext: false });
    const event = index.events.find(item => item.eventId === eventId) || null;
    const persistedSpan = index.taskSpans.find(item => item.taskId === String(input.task.id)) || span;
    const spans = readSpans(db, "task_id=?", [String(input.task.id)]);
    const priorCursors = Array.isArray(previousContext?.appliedCursors) ? previousContext.appliedCursors.filter((item: any) => item.spanId !== persistedSpan?.spanId) : [];
    const cursors = event && persistedSpan ? [...priorCursors, cursorFor(persistedSpan, event)] : priorCursors;
    const taskForContext = { ...input.task, active_timeline_span_id: persistedSpan?.status === "open" ? persistedSpan.spanId : "", latest_checkpoint_sequence: event?.sequence || previousContext?.latestCheckpointSequence || 0 };
    const contextBase = input.buildContext(taskForContext, previousContext);
    const persistedContext = persistTaskContextProjection(db, String(input.task.id), {
      ...contextBase,
      timelineSpans: spans,
      activeSpanId: persistedSpan?.status === "open" ? persistedSpan.spanId : "",
      appliedCursors: cursors,
      latestCheckpointSequence: event?.sequence || previousContext?.latestCheckpointSequence || 0,
      revision: Number(previousContext?.revision || 0) + 1,
      updatedAt: new Date().toISOString(),
      contentStored: false,
    }, input.contextReason, event?.eventId || "", input.forceSnapshot === true || !!input.terminalStatus);
    return {
      task: { ...input.task, task_context: persistedContext, task_context_revision: persistedContext?.revision || 0, task_context_checksum: persistedContext?.checksum || "", active_timeline_span_id: persistedContext?.activeSpanId || "" },
      index,
      span: persistedSpan,
      event,
    };
  });
  drainTaskContextOutbox();
  return result;
}

function startSpan(input: { taskId: string; exactSessionId: string; attempt?: number; eventId: string; sequence: number; title?: string; goal?: string }): CcmTaskTimelineSpanV1 {
  const base: Omit<CcmTaskTimelineSpanV1, "checksum"> = { schema: "ccm-task-timeline-span-v1", spanId: spanIdFor(input.taskId, input.exactSessionId), taskId: text(input.taskId, 120), exactSessionId: text(input.exactSessionId, 300), startMarkerId: input.eventId, startSequence: input.sequence,
    attemptSpans: [{ attempt: Math.max(1, Number(input.attempt || 1)), startSequence: input.sequence, status: "running" }], status: "open", latestSequence: input.sequence,
    summary: { title: text(input.title, 300), goal: text(input.goal, 1000), result: "", evidenceIds: [], contentStored: false }, contentStored: false };
  return { ...base, checksum: digest(base) };
}

export function createTaskStartedTimeline(input: { taskId: string; exactSessionId: string; scope: CcmTimelineScope; scopeId: string; generation?: number; attempt?: number; workItemId?: string; leaseId?: string; title?: string; goal?: string }) {
  const result = withImmediateTaskStoreTransaction(db => {
    const current = readIndexInDb(db, input); const existing = current.taskSpans.find(span => span.taskId === input.taskId); const eventId = `task_started:${text(input.taskId, 120)}`;
    if (existing) return { index: current, span: existing, event: current.events.find(event => event.eventId === eventId) || null };
    const span = startSpan({ ...input, eventId, sequence: current.latestSequence + 1 });
    const index = appendInDb(db, { ...input, type: "task_started", eventId, idempotencyKey: eventId, activeTaskId: input.taskId, span, contextReason: "task_started", forceSnapshot: true });
    return { index, span: index.taskSpans.find(item => item.taskId === input.taskId) || span, event: index.events.find(event => event.eventId === eventId) || null };
  }); drainTaskContextOutbox(); return result;
}

export function persistTaskStartedAtomically(input: { task: any; position: number; exactSessionId: string; scope: CcmTimelineScope; scopeId: string; generation?: number; attempt?: number; workItemId?: string; leaseId?: string; title?: string; goal?: string; buildContext: (task: any) => any }) {
  const result = withImmediateTaskStoreTransaction(db => {
    if (db.prepare("SELECT id FROM tasks WHERE id=?").get(String(input.task.id))) throw new Error("任务已存在，不能重复创建开始区间");
    upsertTaskInSqliteTransaction(db, input.task, input.position);
    const current = readIndexInDb(db, input); const eventId = `task_started:${text(input.task.id, 120)}`;
    const span = startSpan({ taskId: input.task.id, exactSessionId: input.exactSessionId, attempt: input.attempt, eventId, sequence: current.latestSequence + 1, title: input.title, goal: input.goal });
    const index = appendInDb(db, { ...input, taskId: input.task.id, type: "task_started", eventId, idempotencyKey: eventId, activeTaskId: input.task.id, span, contextReason: "task_started", forceSnapshot: true });
    const event = index.events.find(item => item.eventId === eventId)!; const taskForContext = { ...input.task, active_timeline_span_id: span.spanId, latest_checkpoint_sequence: event.sequence };
    const context = input.buildContext(taskForContext); const cursors = [cursorFor(span, event)];
    const persisted = persistTaskContextProjection(db, input.task.id, { ...context, timelineSpans: [span], activeSpanId: span.spanId, appliedCursors: cursors, latestCheckpointSequence: event.sequence, revision: 1 }, "task_started", eventId, true);
    return { task: { ...input.task, task_context: persisted, task_context_revision: persisted?.revision || 1, task_context_checksum: persisted?.checksum || "", active_timeline_span_id: span.spanId }, index, span, event };
  }); drainTaskContextOutbox(); return result;
}

export function createTaskAttemptStartedTimeline(input: { taskId: string; exactSessionId: string; scope: CcmTimelineScope; scopeId: string; attempt: number; generation?: number; workItemId?: string; leaseId?: string }) {
  const result = withImmediateTaskStoreTransaction(db => {
    const current = readIndexInDb(db, input); let span = current.taskSpans.find(item => item.taskId === input.taskId); const eventId = `task_attempt_started:${text(input.taskId, 120)}:${Number(input.attempt)}`;
    const existing = current.events.find(event => event.eventId === eventId); if (existing) return { index: current, span: span || null, event: existing };
    if (!span) span = startSpan({ ...input, eventId, sequence: current.latestSequence + 1 });
    else { span = { ...span, endMarkerId: undefined, endSequence: undefined, status: "open", attemptSpans: [...span.attemptSpans.filter(item => item.attempt !== Math.max(1, Number(input.attempt))), { attempt: Math.max(1, Number(input.attempt)), startSequence: current.latestSequence + 1, status: "running" }], latestSequence: current.latestSequence + 1, checksum: "" }; span = { ...span, checksum: digest(withoutChecksum(span)) }; }
    const index = appendInDb(db, { ...input, type: "task_attempt_started", eventId, idempotencyKey: eventId, activeTaskId: input.taskId, span, contextReason: "task_attempt_started", forceSnapshot: true });
    return { index, span: index.taskSpans.find(item => item.taskId === input.taskId) || span, event: index.events.find(event => event.eventId === eventId) || null };
  }); drainTaskContextOutbox(); return result;
}

export function createTaskTerminalTimeline(input: { taskId: string; exactSessionId: string; scope: CcmTimelineScope; scopeId: string; status: string; attempt?: number; generation?: number; workItemId?: string; leaseId?: string; payloadRef?: string; result?: string; evidenceIds?: string[] }) {
  const result = withImmediateTaskStoreTransaction(db => {
    const current = readIndexInDb(db, input); const span = current.taskSpans.find(item => item.taskId === input.taskId); if (!span) return { index: current, span: null, event: null };
    const terminalStatus = normalizeStatus(input.status); const type: CcmSessionTimelineEventType = terminalStatus === "success" ? "task_finished" : terminalStatus === "failed" || terminalStatus === "blocked" ? "task_failed" : terminalStatus === "cancelled" ? "task_cancelled" : "task_interrupted";
    const attempt = Math.max(1, Number(input.attempt || span.attemptSpans.at(-1)?.attempt || 1)); const eventId = `task_terminal:${text(input.taskId, 120)}:${terminalStatus}:${attempt}`;
    const existing = current.events.find(event => event.eventId === eventId); if (existing) return { index: current, span, event: existing };
    const sequence = current.latestSequence + 1; const attemptSpans = span.attemptSpans.map(item => item.attempt === attempt ? { ...item, endSequence: sequence, status: terminalStatus } : item); const spanStatus = terminalStatus === "success" ? "completed" : terminalStatus === "running" ? "interrupted" : terminalStatus;
    let nextSpan: CcmTaskTimelineSpanV1 = { ...span, endMarkerId: eventId, endSequence: sequence, attemptSpans, status: spanStatus, latestSequence: sequence, summary: { title: text(span.summary?.title, 300), goal: text(span.summary?.goal, 1000), result: text(input.result, 1000), evidenceIds: [...new Set((input.evidenceIds || []).map(item => text(item, 160)).filter(Boolean))].slice(0, 100), contentStored: false }, checksum: "" };
    nextSpan = { ...nextSpan, checksum: digest(withoutChecksum(nextSpan)) };
    const index = appendInDb(db, { ...input, type, eventId, idempotencyKey: eventId, activeTaskId: current.activeTaskId === input.taskId ? null : current.activeTaskId, span: nextSpan, contextReason: type, forceSnapshot: true });
    return { index, span: index.taskSpans.find(item => item.taskId === input.taskId) || nextSpan, event: index.events.find(event => event.eventId === eventId) || null };
  }); drainTaskContextOutbox(); return result;
}

export function verifySessionTimelineChain(input: { exactSessionId: string; scope: CcmTimelineScope; scopeId: string }) {
  const index = readSessionTaskIndex(input); let previous = ""; const issues: string[] = [];
  for (let i = 0; i < index.events.length; i += 1) { const event = index.events[i]; if (event.sequence !== i + 1) issues.push(`sequence_gap:${i + 1}:${event.sequence}`); if (event.previousChecksum !== previous) issues.push(`previous_checksum_mismatch:${event.eventId}`); if (event.checksum !== digest(withoutChecksum(event))) issues.push(`event_checksum_mismatch:${event.eventId}`); previous = event.checksum; }
  return { valid: issues.length === 0, issues, latestSequence: index.latestSequence, headChecksum: previous, contentStored: false };
}

function rebuildTaskContextInDb(db: any, taskId: string) {
  const head = db.prepare("SELECT * FROM task_context_heads WHERE task_id=?").get(taskId) as any;
  if (!head) return { success: false, status: "missing", issues: ["context_head_missing"], context: null };
  const snapshot = db.prepare("SELECT * FROM task_context_snapshots WHERE task_id=? AND revision<=? ORDER BY revision DESC LIMIT 1").get(taskId, Number(head.revision || 0)) as any;
  if (!snapshot) return { success: false, status: "drifted", issues: ["context_snapshot_missing"], context: null };
  let context = parse<any>(snapshot.snapshot_json, null);
  if (!context || String(context.checksum || "") !== String(snapshot.checksum || "")) return { success: false, status: "drifted", issues: ["context_snapshot_checksum_mismatch"], context: null };
  let previousChecksum = String(snapshot.checksum || "");
  const revisions = db.prepare("SELECT * FROM task_context_revisions WHERE task_id=? AND revision>? ORDER BY revision ASC").all(taskId, Number(snapshot.revision || 0)) as any[];
  const issues: string[] = [];
  for (const revision of revisions) {
    if (String(revision.previous_checksum || "") !== previousChecksum) { issues.push(`revision_previous_checksum_mismatch:${revision.revision}`); break; }
    const delta = parse<any>(revision.delta_json, null);
    if (!delta || delta.schema !== "ccm-task-context-delta-v1" || !delta.changes || typeof delta.changes !== "object") { issues.push(`revision_delta_invalid:${revision.revision}`); break; }
    const next: any = { ...context, ...delta.changes };
    for (const key of Array.isArray(delta.removedKeys) ? delta.removedKeys : []) delete next[key];
    delete next.checksum;
    const rebuiltChecksum = contextDigest(next);
    if (rebuiltChecksum !== String(revision.checksum || "")) { issues.push(`revision_checksum_mismatch:${revision.revision}`); break; }
    context = { ...next, checksum: rebuiltChecksum };
    previousChecksum = rebuiltChecksum;
  }
  if (!issues.length && previousChecksum !== String(head.checksum || "")) issues.push("context_head_checksum_mismatch");
  return { success: issues.length === 0, status: issues.length ? "drifted" : "ready", issues, context };
}

export function rebuildTaskContextFromSnapshot(taskId: string) {
  return withImmediateTaskStoreTransaction(db => {
    const result = rebuildTaskContextInDb(db, String(taskId || ""));
    if (!result.success && result.status === "drifted") db.prepare("UPDATE task_context_heads SET status='drifted', updated_at=? WHERE task_id=?").run(new Date().toISOString(), String(taskId || ""));
    return { ...result, taskId, contentStored: false };
  });
}

export function catchUpTaskContext(taskId: string) {
  return withImmediateTaskStoreTransaction(db => {
    const rebuilt = rebuildTaskContextInDb(db, taskId);
    if (!rebuilt.success) {
      if (rebuilt.status === "drifted") db.prepare("UPDATE task_context_heads SET status='drifted', updated_at=? WHERE task_id=?").run(new Date().toISOString(), taskId);
      return { success: false, status: rebuilt.status, taskId, issues: rebuilt.issues, contentStored: false };
    }
    const head = db.prepare("SELECT * FROM task_context_heads WHERE task_id=?").get(taskId) as any; if (!head) return { success: false, status: "missing", taskId, contentStored: false };
    const context = parse<any>(head.projection_json, null); const spans = readSpans(db, "task_id=?", [taskId]); const cursors: CcmTaskTimelineCursorV1[] = []; const issues: string[] = [];
    for (const span of spans) {
      const meta = db.prepare("SELECT scope, scope_id FROM task_timeline_spans WHERE span_id=?").get(span.spanId) as any;
      const events = db.prepare("SELECT * FROM session_timeline_events WHERE scope=? AND scope_id=? AND exact_session_id=? ORDER BY sequence ASC").all(meta.scope, meta.scope_id, span.exactSessionId).map(mapEvent);
      let previous = "";
      for (let index = 0; index < events.length; index += 1) { const event = events[index]; if (event.sequence !== index + 1 || event.previousChecksum !== previous || event.checksum !== digest(withoutChecksum(event))) issues.push(`timeline_integrity:${span.spanId}:${event.sequence}`); previous = event.checksum; }
      const latest = [...events].reverse().find((event: CcmSessionTimelineEventV2) => event.taskId === taskId && event.sequence <= span.latestSequence); if (latest) cursors.push(cursorFor(span, latest));
    }
    if (issues.length) { persistTaskContextProjection(db, taskId, { ...context, status: "drifted", revision: Number(head.revision || 0) + 1, updatedAt: new Date().toISOString(), contentStored: false }, "timeline_integrity_failed", "", true); return { success: false, status: "drifted", taskId, issues, contentStored: false }; }
    const changed = stringify(cursors) !== String(head.applied_cursors_json || "[]") || stringify(spans) !== stringify(context.timelineSpans || []);
    if (changed) persistTaskContextProjection(db, taskId, { ...context, timelineSpans: spans, appliedCursors: cursors, activeSpanId: [...spans].reverse().find(span => span.status === "open")?.spanId || "", revision: Number(head.revision || 0) + 1, updatedAt: new Date().toISOString(), contentStored: false }, "task_context_catch_up", "", true);
    return { success: true, status: changed ? "caught_up" : "current", taskId, cursors, contentStored: false };
  });
}

export function recoverTaskContextProjectors() {
  // A process can stop after claiming an outbox row but before publishing it.
  // Re-open those rows once during startup; nested drains deliberately do not
  // reset them, which prevents recursive projection delivery.
  withSqliteTaskStore(db => db.prepare("UPDATE task_context_outbox SET status='pending' WHERE status='processing'").run());
  const taskIds = withSqliteTaskStore(db => (db.prepare("SELECT task_id FROM task_context_heads ORDER BY task_id").all() as any[]).map(row => String(row.task_id || "")).filter(Boolean));
  let current = 0; let caughtUp = 0; let drifted = 0;
  for (const taskId of taskIds) {
    const result = catchUpTaskContext(taskId);
    if (!result.success) drifted += 1;
    else if (result.status === "caught_up") caughtUp += 1;
    else current += 1;
  }
  const outbox = drainTaskContextOutbox(1000);
  return { checked: taskIds.length, current, caughtUp, drifted, outbox, contentStored: false };
}

export function readTaskContextHead(taskId: string): CcmTaskContextHeadV1 | null {
  return withSqliteTaskStore(db => { const row = db.prepare("SELECT * FROM task_context_heads WHERE task_id=?").get(taskId) as any; if (!row) return null; return { taskId, revision: Number(row.revision || 0), checksum: String(row.checksum || ""), ...(row.active_span_id ? { activeSpanId: String(row.active_span_id) } : {}), appliedCursors: parse(row.applied_cursors_json, []), latestSnapshotRevision: Number(row.latest_snapshot_revision || 0), status: row.status, contentStored: false }; });
}
export function snapshotTaskContextForBoundary(taskId: string, reason = "compaction_boundary") {
  const result = withImmediateTaskStoreTransaction(db => {
    const head = db.prepare("SELECT * FROM task_context_heads WHERE task_id=?").get(String(taskId || "")) as any;
    if (!head) return { success: false, status: "missing", taskId, contentStored: false };
    const context = parse<any>(head.projection_json, null);
    if (!context) return { success: false, status: "invalid", taskId, contentStored: false };
    const persisted = persistTaskContextProjection(db, String(taskId), { ...context, revision: Number(head.revision || 0) + 1, updatedAt: new Date().toISOString(), contentStored: false }, reason, "", true);
    return { success: true, status: "snapshotted", taskId, revision: persisted?.revision || 0, checksum: persisted?.checksum || "", contentStored: false };
  });
  drainTaskContextOutbox();
  return result;
}
export function projectPriorTaskSummaries(index: CcmSessionTaskIndexV1, currentTaskId?: string) { return index.taskSpans.filter(span => span.taskId !== currentTaskId).map(span => ({ taskId: span.taskId, status: span.status, title: text(span.summary?.title, 300), goal: text(span.summary?.goal, 1000), result: text(span.summary?.result, 1000), evidenceIds: Array.isArray(span.summary?.evidenceIds) ? span.summary!.evidenceIds.slice(0, 100) : [], startSequence: span.startSequence, endSequence: span.endSequence, spanChecksum: span.checksum, contentStored: false })); }
export function recordSessionTimelineMessage(input: { exactSessionId: string; scope: CcmTimelineScope; scopeId: string; role: "user" | "assistant"; messageId?: string; taskId?: string; timestamp?: string }) { return appendSessionTimelineEvent({ exactSessionId: input.exactSessionId, scope: input.scope, scopeId: input.scopeId, type: input.role === "user" ? "user_message" : "assistant_message", eventId: `message:${text(input.messageId || `${input.role}:${input.timestamp || ""}`, 180)}`, taskId: input.taskId, timestamp: input.timestamp, payloadRef: input.messageId }); }
export function runSessionTaskTimelineSelfTest() {
  const base = { exactSessionId: `selftest-${crypto.randomUUID()}`, scope: "project" as const, scopeId: "demo" }; const started = createTaskStartedTimeline({ ...base, taskId: "task-a", attempt: 1 }); appendSessionTimelineEvent({ ...base, type: "assistant_message", taskId: "task-a", eventId: "assistant:a:1" }); const finished = createTaskTerminalTimeline({ ...base, taskId: "task-a", status: "done", attempt: 1 }); const other = createTaskStartedTimeline({ ...base, taskId: "task-b", attempt: 1 }); const chain = verifySessionTimelineChain(base);
  const checks = { start: started.span.startSequence === 1, finish: finished.span?.status === "completed", independent: other.span.taskId === "task-b" && other.span.startSequence > (finished.span?.endSequence || 0), priorProjection: projectPriorTaskSummaries(other.index, "task-b").some(item => item.taskId === "task-a"), hashChain: chain.valid }; return { pass: Object.values(checks).every(Boolean), checks };
}
