"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistTaskContextProjection = persistTaskContextProjection;
exports.upsertTaskInSqliteTransaction = upsertTaskInSqliteTransaction;
exports.withImmediateTaskStoreTransaction = withImmediateTaskStoreTransaction;
exports.withSqliteTaskStore = withSqliteTaskStore;
exports.loadTasksFromSqlite = loadTasksFromSqlite;
exports.getTaskByIdFromSqlite = getTaskByIdFromSqlite;
exports.listTasksByParentIdFromSqlite = listTasksByParentIdFromSqlite;
exports.updateTaskByIdInSqlite = updateTaskByIdInSqlite;
exports.updateTaskByIdCasInSqlite = updateTaskByIdCasInSqlite;
exports.listUsabilityTaskCandidatesFromSqlite = listUsabilityTaskCandidatesFromSqlite;
exports.listUsabilityArchiveCandidatesFromSqlite = listUsabilityArchiveCandidatesFromSqlite;
exports.saveTasksToSqlite = saveTasksToSqlite;
exports.runTaskStoreAtomicBatchSelfTest = runTaskStoreAtomicBatchSelfTest;
exports.appendTaskLogRecord = appendTaskLogRecord;
exports.getTaskLogRecords = getTaskLogRecords;
exports.clearTaskLogRecords = clearTaskLogRecords;
exports.loadTaskLogsFromSqlite = loadTaskLogsFromSqlite;
exports.replaceTaskLogsInSqlite = replaceTaskLogsInSqlite;
exports.appendGroupLogRecord = appendGroupLogRecord;
exports.loadGroupLogsFromSqlite = loadGroupLogsFromSqlite;
exports.replaceGroupLogsInSqlite = replaceGroupLogsInSqlite;
exports.clearGroupLogRecords = clearGroupLogRecords;
exports.runTaskStoreRowApiSelfTest = runTaskStoreRowApiSelfTest;
exports.verifySqliteTaskStore = verifySqliteTaskStore;
exports.getSqliteTaskStoreStatus = getSqliteTaskStoreStatus;
exports.checkpointSqliteTaskStore = checkpointSqliteTaskStore;
exports.backupSqliteTaskStore = backupSqliteTaskStore;
exports.exportSqliteTaskStore = exportSqliteTaskStore;
exports.restoreSqliteTaskStore = restoreSqliteTaskStore;
exports.closeSqliteTaskStore = closeSqliteTaskStore;
exports.getSqliteTaskStorePaths = getSqliteTaskStorePaths;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const runtime_paths_1 = require("./runtime-paths");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const STORE_SCHEMA_VERSION = 3;
const DEFAULT_STORE_DIR = runtime_paths_1.CCM_DIR;
const STORE_DIR = path.resolve(process.env.CCM_TASK_STORE_DIR || DEFAULT_STORE_DIR);
const DATABASE_FILE = path.join(STORE_DIR, "ccm.db");
const DATABASE_BACKUP_DIR = path.join(STORE_DIR, "database-backups");
const EXPORT_DIR = path.join(STORE_DIR, "exports");
let database = null;
function isoFileStamp() {
    return new Date().toISOString().replace(/[:.]/g, "-");
}
function stableHash(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
function stringifyJson(value) {
    return JSON.stringify(value ?? null);
}
function canonicalJson(value) {
    if (value === undefined)
        return "null";
    if (value === null || typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(canonicalJson).join(",")}]`;
    return `{${Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}
function parseJson(value, fallback) {
    try {
        return JSON.parse(String(value || ""));
    }
    catch {
        return fallback;
    }
}
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
    fs.renameSync(temp, file);
}
function configureDatabase(db) {
    db.pragma("busy_timeout = 10000");
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("foreign_keys = ON");
    db.pragma("temp_store = MEMORY");
    db.pragma("wal_autocheckpoint = 1000");
}
function createSchema(db) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT '',
      group_id TEXT NOT NULL DEFAULT '',
      target_project TEXT NOT NULL DEFAULT '',
      workflow_type TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      archived INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL,
      payload_hash TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_group_status ON tasks(group_id, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(target_project, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_workflow ON tasks(workflow_type);
    CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived, updated_at);

    CREATE TABLE IF NOT EXISTS session_timeline_heads (
      scope TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      exact_session_id TEXT NOT NULL,
      latest_sequence INTEGER NOT NULL DEFAULT 0,
      active_task_id TEXT NOT NULL DEFAULT '',
      head_checksum TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      PRIMARY KEY(scope, scope_id, exact_session_id)
    );

    CREATE TABLE IF NOT EXISTS session_timeline_events (
      event_id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      exact_session_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      task_id TEXT NOT NULL DEFAULT '',
      work_item_id TEXT NOT NULL DEFAULT '',
      generation INTEGER NOT NULL DEFAULT 0,
      attempt INTEGER NOT NULL DEFAULT 0,
      lease_id TEXT NOT NULL DEFAULT '',
      payload_ref TEXT NOT NULL DEFAULT '',
      idempotency_key TEXT NOT NULL UNIQUE,
      previous_checksum TEXT NOT NULL DEFAULT '',
      checksum TEXT NOT NULL,
      created_at TEXT NOT NULL,
      content_stored INTEGER NOT NULL DEFAULT 0,
      UNIQUE(scope, scope_id, exact_session_id, sequence)
    );
    CREATE INDEX IF NOT EXISTS idx_session_timeline_task ON session_timeline_events(task_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_session_timeline_session ON session_timeline_events(scope, scope_id, exact_session_id, sequence);

    CREATE TABLE IF NOT EXISTS task_timeline_spans (
      span_id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      scope TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      exact_session_id TEXT NOT NULL,
      start_event_id TEXT NOT NULL,
      start_sequence INTEGER NOT NULL,
      end_event_id TEXT NOT NULL DEFAULT '',
      end_sequence INTEGER,
      latest_sequence INTEGER NOT NULL,
      status TEXT NOT NULL,
      summary_json TEXT NOT NULL DEFAULT '{}',
      checksum TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      content_stored INTEGER NOT NULL DEFAULT 0,
      UNIQUE(task_id, exact_session_id)
    );
    CREATE INDEX IF NOT EXISTS idx_task_timeline_spans_task ON task_timeline_spans(task_id, updated_at);

    CREATE TABLE IF NOT EXISTS task_attempt_spans (
      span_id TEXT NOT NULL,
      attempt INTEGER NOT NULL,
      start_sequence INTEGER NOT NULL,
      end_sequence INTEGER,
      status TEXT NOT NULL,
      checksum TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY(span_id, attempt),
      FOREIGN KEY(span_id) REFERENCES task_timeline_spans(span_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_context_heads (
      task_id TEXT PRIMARY KEY,
      revision INTEGER NOT NULL,
      checksum TEXT NOT NULL,
      active_span_id TEXT NOT NULL DEFAULT '',
      applied_cursors_json TEXT NOT NULL DEFAULT '[]',
      latest_snapshot_revision INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ready',
      projection_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      content_stored INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_context_revisions (
      task_id TEXT NOT NULL,
      revision INTEGER NOT NULL,
      reason TEXT NOT NULL,
      source_event_id TEXT NOT NULL DEFAULT '',
      previous_checksum TEXT NOT NULL DEFAULT '',
      delta_json TEXT NOT NULL DEFAULT '{}',
      checksum TEXT NOT NULL,
      created_at TEXT NOT NULL,
      content_stored INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(task_id, revision),
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_context_snapshots (
      task_id TEXT NOT NULL,
      revision INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      checksum TEXT NOT NULL,
      created_at TEXT NOT NULL,
      content_stored INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(task_id, revision),
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_context_outbox (
      outbox_id TEXT PRIMARY KEY,
      dedupe_key TEXT NOT NULL UNIQUE,
      task_id TEXT NOT NULL DEFAULT '',
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      published_at TEXT NOT NULL DEFAULT '',
      content_stored INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_task_context_outbox_status ON task_context_outbox(status, created_at);

    CREATE TABLE IF NOT EXISTS task_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'info',
      message TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_task_logs_task_id_id ON task_logs(task_id, id);
    CREATE INDEX IF NOT EXISTS idx_task_logs_timestamp ON task_logs(timestamp);

    CREATE TABLE IF NOT EXISTS group_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'info',
      category TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      details_json TEXT NOT NULL DEFAULT 'null',
      payload_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_group_logs_group_id_id ON group_logs(group_id, id);
    CREATE INDEX IF NOT EXISTS idx_group_logs_timestamp ON group_logs(timestamp);

    CREATE TABLE IF NOT EXISTS agent_communication_messages (
      message_id TEXT PRIMARY KEY,
      message_type TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      parent_message_id TEXT NOT NULL DEFAULT '',
      task_id TEXT NOT NULL,
      work_item_id TEXT NOT NULL,
      scope TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      exact_session_id TEXT NOT NULL,
      generation INTEGER NOT NULL DEFAULT 0,
      attempt INTEGER NOT NULL DEFAULT 1,
      lease_id TEXT NOT NULL DEFAULT '',
      sender_agent_id TEXT NOT NULL,
      receiver_agent_id TEXT NOT NULL,
      state TEXT NOT NULL,
      deadline_at TEXT NOT NULL DEFAULT '',
      idempotency_key TEXT NOT NULL,
      payload_checksum TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_comm_idempotency ON agent_communication_messages(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_agent_comm_task ON agent_communication_messages(task_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_agent_comm_session ON agent_communication_messages(scope, scope_id, exact_session_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_agent_comm_state ON agent_communication_messages(state, updated_at);

    CREATE TABLE IF NOT EXISTS agent_communication_events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      from_state TEXT NOT NULL DEFAULT '',
      to_state TEXT NOT NULL DEFAULT '',
      generation INTEGER NOT NULL DEFAULT 0,
      attempt INTEGER NOT NULL DEFAULT 1,
      lease_id TEXT NOT NULL DEFAULT '',
      receipt_checksum TEXT NOT NULL DEFAULT '',
      detail_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY(message_id) REFERENCES agent_communication_messages(message_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_agent_comm_events_message ON agent_communication_events(message_id, event_id);

    CREATE TABLE IF NOT EXISTS agent_communication_leases (
      lease_id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL,
      generation INTEGER NOT NULL DEFAULT 0,
      attempt INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL,
      side_effect_state TEXT NOT NULL DEFAULT 'none',
      heartbeat_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(message_id) REFERENCES agent_communication_messages(message_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_agent_comm_leases_status ON agent_communication_leases(status, expires_at);

    CREATE TABLE IF NOT EXISTS agent_communication_receipts (
      receipt_checksum TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      receipt_type TEXT NOT NULL,
      generation INTEGER NOT NULL DEFAULT 0,
      attempt INTEGER NOT NULL DEFAULT 1,
      lease_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      receipt_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(message_id) REFERENCES agent_communication_messages(message_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_agent_comm_receipts_message ON agent_communication_receipts(message_id, created_at);
  `);
    ensureColumn(db, "tasks", "task_context_revision", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn(db, "tasks", "task_context_checksum", "TEXT NOT NULL DEFAULT ''");
    ensureColumn(db, "tasks", "active_timeline_span_id", "TEXT NOT NULL DEFAULT ''");
    setMeta(db, "schema_version", STORE_SCHEMA_VERSION);
}
function ensureColumn(db, table, column, definition) {
    const columns = db.prepare(`PRAGMA table_info("${table.replaceAll('"', '""')}")`).all();
    if (columns.some(item => item.name === column))
        return;
    db.exec(`ALTER TABLE "${table.replaceAll('"', '""')}" ADD COLUMN "${column.replaceAll('"', '""')}" ${definition}`);
}
function getMeta(db, key) {
    const row = db.prepare("SELECT value_json FROM app_meta WHERE key = ?").get(key);
    return row ? parseJson(row.value_json, null) : null;
}
function setMeta(db, key, value) {
    db.prepare(`
    INSERT INTO app_meta(key, value_json, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `).run(key, stringifyJson(value), new Date().toISOString());
}
function stripTaskContextAuthority(task) {
    const payload = { ...(task || {}) };
    delete payload.task_context;
    delete payload.timeline_spans;
    delete payload.timeline_start_marker_id;
    delete payload.timeline_start_sequence;
    delete payload.timeline_end_marker_id;
    delete payload.timeline_end_sequence;
    delete payload.latest_checkpoint_sequence;
    delete payload.task_context_revision_receipt;
    delete payload.__position;
    return payload;
}
function taskColumns(task, position) {
    const payload = stringifyJson(stripTaskContextAuthority(task));
    const context = task?.task_context && typeof task.task_context === "object" ? task.task_context : null;
    // Once a canonical context exists it owns the active-span pointer. An empty
    // value is meaningful at a terminal boundary and must not fall back to the
    // stale denormalized task column.
    const activeSpanId = context
        ? String(context.activeSpanId || "")
        : String(task?.active_timeline_span_id || "");
    return {
        id: String(task?.id || "").trim(),
        position,
        status: String(task?.status || ""),
        groupId: String(task?.group_id || task?.groupId || ""),
        targetProject: String(task?.target_project || task?.targetProject || ""),
        workflowType: String(task?.workflow_type || task?.workflowType || ""),
        createdAt: String(task?.created_at || task?.createdAt || ""),
        updatedAt: String(task?.updated_at || task?.updatedAt || ""),
        archived: task?.archived === true || !!task?.archived_at || !!task?.deleted_at ? 1 : 0,
        payload,
        hash: stableHash(payload),
        taskContextRevision: Math.max(0, Number(context?.revision || task?.task_context_revision || 0)),
        taskContextChecksum: String(context?.checksum || task?.task_context_checksum || ""),
        activeSpanId,
    };
}
function hydrateTaskAuthority(db, task) {
    if (!task?.id)
        return task;
    const head = db.prepare("SELECT revision, checksum, active_span_id, projection_json FROM task_context_heads WHERE task_id = ?").get(String(task.id));
    if (!head)
        return task;
    const context = parseJson(head.projection_json, null);
    return {
        ...task,
        ...(context ? { task_context: context } : {}),
        task_context_revision: Number(head.revision || 0),
        task_context_checksum: String(head.checksum || ""),
        active_timeline_span_id: String(head.active_span_id || ""),
    };
}
function contextDelta(previous, next) {
    const keys = [...new Set([...Object.keys(previous || {}), ...Object.keys(next || {})])]
        .filter(key => key !== "checksum" && JSON.stringify(previous?.[key]) !== JSON.stringify(next?.[key]));
    const presentInNext = (key) => Object.hasOwn(next || {}, key) && next?.[key] !== undefined;
    const changes = Object.fromEntries(keys.filter(presentInNext).map(key => [key, next[key]]));
    return {
        schema: "ccm-task-context-delta-v1",
        changedKeys: keys.slice(0, 100),
        changes,
        removedKeys: keys.filter(key => !presentInNext(key)).slice(0, 100),
        appliedCursors: Array.isArray(next?.appliedCursors) ? next.appliedCursors : [],
        contentStored: false,
    };
}
function persistTaskContextProjection(db, taskId, contextInput, reason = "task_updated", sourceEventId = "", forceSnapshot = false) {
    const id = String(taskId || "").trim();
    if (!id || !contextInput || typeof contextInput !== "object")
        return null;
    const previousHead = db.prepare("SELECT revision, checksum, projection_json, latest_snapshot_revision FROM task_context_heads WHERE task_id = ?").get(id);
    const previous = parseJson(previousHead?.projection_json, null);
    const requestedRevision = Math.max(1, Number(contextInput.revision || Number(previousHead?.revision || 0) + 1));
    const previousRevision = Number(previousHead?.revision || 0);
    // Callers may mutate a hydrated context while its old checksum/revision is
    // still attached. Never trust those advisory fields to decide whether a new
    // revision is needed: compare canonical content at the current revision, and
    // otherwise advance exactly once so the checksum chain cannot be overwritten
    // through an ON CONFLICT no-op.
    if (previousHead) {
        const comparable = { ...contextInput, revision: previousRevision, contentStored: false };
        delete comparable.checksum;
        if (stableHash(canonicalJson(comparable)) === String(previousHead.checksum || ""))
            return previous;
    }
    const revision = previousHead ? previousRevision + 1 : requestedRevision;
    const base = { ...contextInput, revision, contentStored: false };
    delete base.checksum;
    // Context revisions are reconstructed from deltas. Object insertion order can
    // legitimately change during reconstruction, so the authority checksum must
    // be based on canonical keys rather than JSON property order.
    const checksum = stableHash(canonicalJson(base));
    const context = { ...base, checksum };
    if (previousHead && revision === Number(previousHead.revision) && checksum === String(previousHead.checksum))
        return context;
    const activeSpan = [...(Array.isArray(context.timelineSpans) ? context.timelineSpans : [])]
        .reverse()
        .find((span) => span?.status === "open" && !span?.endSequence);
    const activeSpanId = String(Object.hasOwn(context, "activeSpanId")
        ? context.activeSpanId || ""
        : activeSpan?.spanId || "");
    const cursors = Array.isArray(context.appliedCursors) ? context.appliedCursors : [];
    const now = new Date().toISOString();
    const delta = contextDelta(previous, context);
    db.prepare(`
    INSERT INTO task_context_revisions(task_id, revision, reason, source_event_id, previous_checksum, delta_json, checksum, created_at, content_stored)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(task_id, revision) DO NOTHING
  `).run(id, revision, String(reason || "task_updated"), String(sourceEventId || ""), String(previousHead?.checksum || ""), stringifyJson(delta), checksum, now);
    const snapshotRequired = forceSnapshot || revision === 1 || revision % 50 === 0 || /(?:attempt|terminal|finished|failed|interrupted|cancelled|compaction)/i.test(String(reason || ""));
    let latestSnapshotRevision = Number(previousHead?.latest_snapshot_revision || 0);
    if (snapshotRequired) {
        db.prepare(`
      INSERT INTO task_context_snapshots(task_id, revision, snapshot_json, checksum, created_at, content_stored)
      VALUES (?, ?, ?, ?, ?, 0)
      ON CONFLICT(task_id, revision) DO UPDATE SET snapshot_json=excluded.snapshot_json, checksum=excluded.checksum, created_at=excluded.created_at
    `).run(id, revision, stringifyJson(context), checksum, now);
        latestSnapshotRevision = revision;
    }
    db.prepare(`
    INSERT INTO task_context_heads(task_id, revision, checksum, active_span_id, applied_cursors_json, latest_snapshot_revision, status, projection_json, updated_at, content_stored)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(task_id) DO UPDATE SET revision=excluded.revision, checksum=excluded.checksum,
      active_span_id=excluded.active_span_id, applied_cursors_json=excluded.applied_cursors_json,
      latest_snapshot_revision=excluded.latest_snapshot_revision, status=excluded.status,
      projection_json=excluded.projection_json, updated_at=excluded.updated_at
  `).run(id, revision, checksum, activeSpanId, stringifyJson(cursors), latestSnapshotRevision, String(context.status || "ready"), stringifyJson(context), now);
    db.prepare("UPDATE tasks SET task_context_revision = ?, task_context_checksum = ?, active_timeline_span_id = ? WHERE id = ?")
        .run(revision, checksum, activeSpanId, id);
    const dedupeKey = `task-context:${id}:${revision}:${checksum}`;
    db.prepare(`
    INSERT INTO task_context_outbox(outbox_id, dedupe_key, task_id, event_type, payload_json, status, attempts, created_at, content_stored)
    VALUES (?, ?, ?, 'task_context.updated', ?, 'pending', 0, ?, 0)
    ON CONFLICT(dedupe_key) DO NOTHING
  `).run(`outbox_${stableHash(dedupeKey).slice(0, 24)}`, dedupeKey, id, stringifyJson({ taskId: id, revision, checksum, reason: String(reason || ""), contentStored: false }), now);
    const projectionOutbox = db.prepare(`
    INSERT INTO task_context_outbox(outbox_id, dedupe_key, task_id, event_type, payload_json, status, attempts, created_at, content_stored)
    VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, 0)
    ON CONFLICT(dedupe_key) DO NOTHING
  `);
    for (const eventType of ["task_replay.invalidate", "task_search.reindex"]) {
        const projectionDedupe = `${eventType}:${id}:${revision}:${checksum}`;
        projectionOutbox.run(`outbox_${stableHash(projectionDedupe).slice(0, 24)}`, projectionDedupe, id, eventType, stringifyJson({ taskId: id, revision, checksum, contentStored: false }), now);
    }
    return context;
}
function upsertTaskInSqliteTransaction(db, task, position, persistContext = true) {
    insertTasks(db, [{ ...task, __position: position }], persistContext);
}
function withImmediateTaskStoreTransaction(operation) {
    return getDatabase().transaction(() => operation(getDatabase())).immediate();
}
function insertTasks(db, tasks, persistContext = true) {
    const statement = db.prepare(`
    INSERT INTO tasks(
      id, position, status, group_id, target_project, workflow_type,
      created_at, updated_at, archived, payload_json, payload_hash,
      task_context_revision, task_context_checksum, active_timeline_span_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      position = excluded.position,
      status = excluded.status,
      group_id = excluded.group_id,
      target_project = excluded.target_project,
      workflow_type = excluded.workflow_type,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      archived = excluded.archived,
      payload_json = excluded.payload_json,
      payload_hash = excluded.payload_hash,
      task_context_revision = excluded.task_context_revision,
      task_context_checksum = excluded.task_context_checksum,
      active_timeline_span_id = excluded.active_timeline_span_id
  `);
    for (let position = 0; position < tasks.length; position += 1) {
        const requestedPosition = Number.isFinite(Number(tasks[position]?.__position)) ? Number(tasks[position].__position) : position;
        const row = taskColumns(tasks[position], requestedPosition);
        if (!row.id)
            throw new Error(`任务缺少 id，位置 ${position}`);
        statement.run(row.id, row.position, row.status, row.groupId, row.targetProject, row.workflowType, row.createdAt, row.updatedAt, row.archived, row.payload, row.hash, row.taskContextRevision, row.taskContextChecksum, row.activeSpanId);
        if (persistContext && tasks[position]?.task_context)
            persistTaskContextProjection(db, row.id, tasks[position].task_context, "task_write");
    }
}
function insertTaskLogs(db, logs) {
    const statement = db.prepare("INSERT INTO task_logs(task_id, timestamp, level, message, payload_json) VALUES (?, ?, ?, ?, ?)");
    for (const [taskId, values] of Object.entries(logs || {})) {
        const rows = Array.isArray(values) ? values.slice(-100) : [];
        for (const entry of rows) {
            const record = entry || {};
            statement.run(String(taskId), String(record.timestamp || new Date().toISOString()), String(record.level || "info"), String(record.message || ""), stringifyJson(record));
        }
    }
}
function insertGroupLogs(db, logs) {
    const statement = db.prepare("INSERT INTO group_logs(group_id, timestamp, level, category, message, details_json, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)");
    for (const [groupId, values] of Object.entries(logs || {})) {
        const rows = Array.isArray(values) ? values.slice(-500) : [];
        for (const entry of rows) {
            const record = entry || {};
            statement.run(String(groupId), String(record.timestamp || new Date().toISOString()), String(record.level || "info"), String(record.category || ""), String(record.message || ""), stringifyJson(record.details ?? null), stringifyJson(record));
        }
    }
}
function getDatabase() {
    if (database)
        return database;
    fs.mkdirSync(STORE_DIR, { recursive: true });
    database = new better_sqlite3_1.default(DATABASE_FILE);
    configureDatabase(database);
    createSchema(database);
    return database;
}
function withSqliteTaskStore(operation) {
    return operation(getDatabase());
}
function loadTasksFromSqlite() {
    const db = getDatabase();
    const rows = db.prepare("SELECT payload_json FROM tasks ORDER BY position ASC, rowid ASC").all();
    return rows.map(row => parseJson(row.payload_json, null)).filter(Boolean).map(task => hydrateTaskAuthority(db, task));
}
function getTaskByIdFromSqlite(id) {
    const taskId = String(id || "").trim();
    if (!taskId)
        return null;
    const db = getDatabase();
    const row = db.prepare("SELECT payload_json FROM tasks WHERE id = ?").get(taskId);
    return row ? hydrateTaskAuthority(db, parseJson(row.payload_json, null)) : null;
}
function listTasksByParentIdFromSqlite(parentId) {
    const parent = String(parentId || "").trim();
    if (!parent)
        return [];
    const rows = getDatabase().prepare("SELECT payload_json FROM tasks WHERE json_extract(payload_json, '$.parent_task_id') = ? ORDER BY position ASC, rowid ASC").all(parent);
    const db = getDatabase();
    return rows.map(row => parseJson(row.payload_json, null)).filter(Boolean).map(task => hydrateTaskAuthority(db, task));
}
/** 行级更新：只读写单条任务，避免整表进出。 */
function updateTaskByIdInSqlite(id, patchOrMutator) {
    const taskId = String(id || "").trim();
    if (!taskId)
        return null;
    const db = getDatabase();
    const existing = db.prepare("SELECT id, position, payload_json FROM tasks WHERE id = ?").get(taskId);
    if (!existing)
        return null;
    const current = hydrateTaskAuthority(db, parseJson(existing.payload_json, null));
    if (!current)
        return null;
    const next = typeof patchOrMutator === "function"
        ? patchOrMutator({ ...current })
        : { ...current, ...(patchOrMutator || {}), id: current.id, updated_at: new Date().toISOString() };
    if (!next || String(next.id) !== taskId)
        throw new Error("行级更新不能改变任务 id");
    const row = taskColumns(next, Number(existing.position) || 0);
    db.prepare(`
    UPDATE tasks SET
      position = ?, status = ?, group_id = ?, target_project = ?, workflow_type = ?,
      created_at = ?, updated_at = ?, archived = ?, payload_json = ?, payload_hash = ?,
      task_context_revision = ?, task_context_checksum = ?, active_timeline_span_id = ?
    WHERE id = ?
  `).run(row.position, row.status, row.groupId, row.targetProject, row.workflowType, row.createdAt, row.updatedAt, row.archived, row.payload, row.hash, row.taskContextRevision, row.taskContextChecksum, row.activeSpanId, taskId);
    const persistedContext = next.task_context ? persistTaskContextProjection(db, taskId, next.task_context, "task_update") : null;
    return persistedContext ? { ...next, task_context: persistedContext } : next;
}
/**
 * Performs a single-row compare-and-swap while holding SQLite's write lock.
 * The predicate is evaluated against the latest payload, so a scheduler cannot
 * overwrite a task that changed after its read snapshot.
 */
function updateTaskByIdCasInSqlite(id, predicate, mutator) {
    const taskId = String(id || "").trim();
    if (!taskId)
        return { updated: false, conflict: false, task: null, previous: null };
    const db = getDatabase();
    const transaction = db.transaction(() => {
        const existing = db.prepare("SELECT id, position, payload_json FROM tasks WHERE id = ?").get(taskId);
        if (!existing)
            return { updated: false, conflict: false, task: null, previous: null };
        const current = hydrateTaskAuthority(db, parseJson(existing.payload_json, null));
        if (!current)
            return { updated: false, conflict: false, task: null, previous: null };
        if (!predicate(current))
            return { updated: false, conflict: true, task: current, previous: current };
        const next = mutator({ ...current });
        if (!next || String(next.id) !== taskId)
            throw new Error("CAS更新不能改变任务 id");
        const row = taskColumns(next, Number(existing.position) || 0);
        db.prepare(`
      UPDATE tasks SET
        position = ?, status = ?, group_id = ?, target_project = ?, workflow_type = ?,
        created_at = ?, updated_at = ?, archived = ?, payload_json = ?, payload_hash = ?,
        task_context_revision = ?, task_context_checksum = ?, active_timeline_span_id = ?
      WHERE id = ?
    `).run(row.position, row.status, row.groupId, row.targetProject, row.workflowType, row.createdAt, row.updatedAt, row.archived, row.payload, row.hash, row.taskContextRevision, row.taskContextChecksum, row.activeSpanId, taskId);
        const persistedContext = next.task_context ? persistTaskContextProjection(db, taskId, next.task_context, String(next?.task_context_revision_receipt?.reason || "task_cas")) : null;
        return { updated: true, conflict: false, task: persistedContext ? { ...next, task_context: persistedContext } : next, previous: current };
    });
    return transaction.immediate();
}
function listUsabilityTaskCandidatesFromSqlite(recentCutoff) {
    const db = getDatabase();
    const rows = db.prepare(`
    SELECT payload_json
    FROM tasks
    WHERE archived = 0
      AND (
        status NOT IN ('done', 'completed', 'succeeded', 'cancelled', 'archived', 'deleted')
        OR updated_at >= ?
        OR json_extract(payload_json, '$.intake_state') = 'awaiting_confirmation'
      )
    ORDER BY updated_at DESC, position ASC
  `).all(String(recentCutoff || ""));
    return rows.map(row => parseJson(row.payload_json, null)).filter(Boolean).map(task => hydrateTaskAuthority(db, task));
}
function listUsabilityArchiveCandidatesFromSqlite(historyCutoff, intakeCutoff) {
    const db = getDatabase();
    const rows = db.prepare(`
    SELECT payload_json
    FROM tasks
    WHERE archived = 0
      AND (
        (
          status IN ('done', 'cancelled')
          AND COALESCE(
            NULLIF(json_extract(payload_json, '$.completed_at'), ''),
            NULLIF(json_extract(payload_json, '$.cancelled_at'), ''),
            NULLIF(updated_at, ''),
            created_at
          ) < ?
        )
        OR (
          json_extract(payload_json, '$.intake_state') = 'awaiting_confirmation'
          AND created_at < ?
        )
      )
    ORDER BY updated_at ASC
  `).all(String(historyCutoff || ""), String(intakeCutoff || ""));
    return rows.map(row => parseJson(row.payload_json, null)).filter(Boolean).map(task => hydrateTaskAuthority(db, task));
}
function saveTasksToSqlite(tasks) {
    if (!Array.isArray(tasks))
        throw new Error("任务存储只接受数组");
    const db = getDatabase();
    const currentRows = db.prepare("SELECT id, position, payload_hash, task_context_checksum FROM tasks").all();
    const current = new Map(currentRows.map(row => [row.id, row]));
    const desiredIds = new Set();
    const upsert = db.prepare(`
    INSERT INTO tasks(
      id, position, status, group_id, target_project, workflow_type,
      created_at, updated_at, archived, payload_json, payload_hash,
      task_context_revision, task_context_checksum, active_timeline_span_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      position = excluded.position,
      status = excluded.status,
      group_id = excluded.group_id,
      target_project = excluded.target_project,
      workflow_type = excluded.workflow_type,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      archived = excluded.archived,
      payload_json = excluded.payload_json,
      payload_hash = excluded.payload_hash,
      task_context_revision = excluded.task_context_revision,
      task_context_checksum = excluded.task_context_checksum,
      active_timeline_span_id = excluded.active_timeline_span_id
  `);
    const remove = db.prepare("DELETE FROM tasks WHERE id = ?");
    let inserted = 0;
    let updated = 0;
    let deleted = 0;
    const transaction = db.transaction(() => {
        for (let position = 0; position < tasks.length; position += 1) {
            const row = taskColumns(tasks[position], position);
            if (!row.id)
                throw new Error(`任务缺少 id，位置 ${position}`);
            if (desiredIds.has(row.id))
                throw new Error(`任务 id 重复：${row.id}`);
            desiredIds.add(row.id);
            const previous = current.get(row.id);
            if (previous && previous.payload_hash === row.hash && Number(previous.position) === position) {
                if (tasks[position]?.task_context && String(previous.task_context_checksum || "") !== String(row.taskContextChecksum || "")) {
                    persistTaskContextProjection(db, row.id, tasks[position].task_context, String(tasks[position]?.task_context_revision_receipt?.reason || "task_save"));
                    updated += 1;
                }
                continue;
            }
            upsert.run(row.id, row.position, row.status, row.groupId, row.targetProject, row.workflowType, row.createdAt, row.updatedAt, row.archived, row.payload, row.hash, row.taskContextRevision, row.taskContextChecksum, row.activeSpanId);
            if (tasks[position]?.task_context)
                persistTaskContextProjection(db, row.id, tasks[position].task_context, String(tasks[position]?.task_context_revision_receipt?.reason || "task_save"));
            if (previous)
                updated += 1;
            else
                inserted += 1;
        }
        for (const id of current.keys()) {
            if (desiredIds.has(id))
                continue;
            remove.run(id);
            deleted += 1;
        }
    });
    transaction();
    return { total: tasks.length, inserted, updated, deleted };
}
function runTaskStoreAtomicBatchSelfTest() {
    const db = new better_sqlite3_1.default(":memory:");
    const restartFile = path.join(os.tmpdir(), `ccm-epic-restart-${process.pid}-${Date.now()}.db`);
    try {
        configureDatabase(db);
        createSchema(db);
        const now = new Date().toISOString();
        const parent = {
            id: "epic-self-test",
            status: "in_progress",
            workflow_type: "requirement_epic",
            child_task_ids: ["epic-child-a", "epic-child-b"],
            created_at: now,
            updated_at: now,
        };
        const children = [
            { id: "epic-child-a", parent_task_id: parent.id, status: "pending", workflow_type: "daily_dev", created_at: now, updated_at: now },
            { id: "epic-child-b", parent_task_id: parent.id, status: "pending", workflow_type: "daily_dev", created_at: now, updated_at: now },
        ];
        let rollbackObserved = false;
        const rollback = db.transaction(() => {
            insertTasks(db, [parent, ...children]);
            throw new Error("intentional rollback");
        });
        try {
            rollback();
        }
        catch {
            rollbackObserved = Number(db.prepare("SELECT COUNT(*) AS count FROM tasks").get()?.count || 0) === 0;
        }
        const commit = db.transaction(() => insertTasks(db, [parent, ...children]));
        commit();
        const committedCount = Number(db.prepare("SELECT COUNT(*) AS count FROM tasks").get()?.count || 0);
        const replay = db.transaction(() => insertTasks(db, [parent, ...children]));
        replay();
        const replayCount = Number(db.prepare("SELECT COUNT(*) AS count FROM tasks").get()?.count || 0);
        const parentPayload = parseJson(db.prepare("SELECT payload_json FROM tasks WHERE id = ?").get(parent.id)?.payload_json, null);
        const beforeRestart = new better_sqlite3_1.default(restartFile);
        configureDatabase(beforeRestart);
        createSchema(beforeRestart);
        insertTasks(beforeRestart, [parent, ...children]);
        beforeRestart.close();
        const afterRestart = new better_sqlite3_1.default(restartFile);
        configureDatabase(afterRestart);
        createSchema(afterRestart);
        const restartCount = Number(afterRestart.prepare("SELECT COUNT(*) AS count FROM tasks").get()?.count || 0);
        const restartedParent = parseJson(afterRestart.prepare("SELECT payload_json FROM tasks WHERE id = ?").get(parent.id)?.payload_json, null);
        afterRestart.close();
        const restartRecovered = restartCount === 3
            && restartedParent?.workflow_type === "requirement_epic"
            && restartedParent?.child_task_ids?.length === 2;
        const idempotentReplay = replayCount === committedCount;
        const undefinedRemovalDelta = contextDelta({ activeSpanId: "span-a", keep: true }, { activeSpanId: undefined, keep: true });
        const undefinedRemovalRecorded = undefinedRemovalDelta.removedKeys.includes("activeSpanId")
            && !Object.hasOwn(undefinedRemovalDelta.changes, "activeSpanId");
        const passed = rollbackObserved && committedCount === 3 && idempotentReplay && parentPayload?.workflow_type === "requirement_epic" && restartRecovered && undefinedRemovalRecorded;
        return {
            success: passed,
            rollback_observed: rollbackObserved,
            committed_count: committedCount,
            idempotent_replay: idempotentReplay,
            parent_round_trip: parentPayload?.id === parent.id,
            restart_recovered: restartRecovered,
            restart_count: restartCount,
            undefined_removal_recorded: undefinedRemovalRecorded,
        };
    }
    finally {
        db.close();
        try {
            fs.rmSync(restartFile, { force: true });
        }
        catch { /* ignore self-test cleanup errors */ }
    }
}
function appendTaskLogRecord(taskId, entry, maxEntries = 100) {
    const db = getDatabase();
    const record = entry || {};
    const transaction = db.transaction(() => {
        const result = db.prepare("INSERT INTO task_logs(task_id, timestamp, level, message, payload_json) VALUES (?, ?, ?, ?, ?)")
            .run(String(taskId), String(record.timestamp || new Date().toISOString()), String(record.level || "info"), String(record.message || ""), stringifyJson(record));
        db.prepare(`DELETE FROM task_logs WHERE task_id = ? AND id NOT IN (
      SELECT id FROM task_logs WHERE task_id = ? ORDER BY id DESC LIMIT ?
    )`).run(String(taskId), String(taskId), Math.max(1, maxEntries));
        return Number(result.lastInsertRowid);
    });
    return transaction();
}
function getTaskLogRecords(taskId, limit = 50) {
    const rows = getDatabase().prepare("SELECT payload_json FROM task_logs WHERE task_id = ? ORDER BY id DESC LIMIT ?")
        .all(String(taskId), Math.max(1, limit));
    return rows.reverse().map(row => parseJson(row.payload_json, null)).filter(Boolean);
}
function clearTaskLogRecords(taskId) {
    return getDatabase().prepare("DELETE FROM task_logs WHERE task_id = ?").run(String(taskId)).changes;
}
function loadTaskLogsFromSqlite() {
    const rows = getDatabase().prepare("SELECT task_id, payload_json FROM task_logs ORDER BY id ASC").all();
    const output = {};
    for (const row of rows) {
        if (!output[row.task_id])
            output[row.task_id] = [];
        const value = parseJson(row.payload_json, null);
        if (value)
            output[row.task_id].push(value);
    }
    return output;
}
function replaceTaskLogsInSqlite(logs) {
    const db = getDatabase();
    const transaction = db.transaction(() => {
        db.exec("DELETE FROM task_logs");
        insertTaskLogs(db, logs || {});
    });
    transaction();
}
function appendGroupLogRecord(groupId, entry, maxEntries = 500) {
    const db = getDatabase();
    const record = entry || {};
    const transaction = db.transaction(() => {
        const result = db.prepare("INSERT INTO group_logs(group_id, timestamp, level, category, message, details_json, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .run(String(groupId), String(record.timestamp || new Date().toISOString()), String(record.level || "info"), String(record.category || ""), String(record.message || ""), stringifyJson(record.details ?? null), stringifyJson(record));
        db.prepare(`DELETE FROM group_logs WHERE group_id = ? AND id NOT IN (
      SELECT id FROM group_logs WHERE group_id = ? ORDER BY id DESC LIMIT ?
    )`).run(String(groupId), String(groupId), Math.max(1, maxEntries));
        return Number(result.lastInsertRowid);
    });
    return transaction();
}
function loadGroupLogsFromSqlite() {
    const rows = getDatabase().prepare("SELECT group_id, payload_json FROM group_logs ORDER BY id ASC").all();
    const output = {};
    for (const row of rows) {
        if (!output[row.group_id])
            output[row.group_id] = [];
        const value = parseJson(row.payload_json, null);
        if (value)
            output[row.group_id].push(value);
    }
    return output;
}
function replaceGroupLogsInSqlite(logs) {
    const db = getDatabase();
    const transaction = db.transaction(() => {
        db.exec("DELETE FROM group_logs");
        insertGroupLogs(db, logs || {});
    });
    transaction();
}
function clearGroupLogRecords(groupId) {
    const id = String(groupId || "").trim();
    if (!id)
        return 0;
    return Number(getDatabase().prepare("DELETE FROM group_logs WHERE group_id = ?").run(id).changes || 0);
}
function runTaskStoreRowApiSelfTest() {
    const db = new better_sqlite3_1.default(":memory:");
    try {
        configureDatabase(db);
        createSchema(db);
        const now = new Date().toISOString();
        insertTasks(db, [
            {
                id: "row-epic",
                status: "in_progress",
                workflow_type: "requirement_epic",
                child_task_ids: ["row-a", "row-b"],
                created_at: now,
                updated_at: now,
            },
            {
                id: "row-a",
                parent_task_id: "row-epic",
                status: "pending",
                workflow_type: "daily_dev",
                requirement_item_key: "a",
                created_at: now,
                updated_at: now,
            },
            {
                id: "row-b",
                parent_task_id: "row-epic",
                status: "pending",
                workflow_type: "daily_dev",
                requirement_item_key: "b",
                mission_dependencies: ["row-a"],
                created_at: now,
                updated_at: now,
            },
        ]);
        const previousDatabase = database;
        database = db;
        try {
            const loaded = getTaskByIdFromSqlite("row-a");
            if (!loaded || loaded.id !== "row-a")
                throw new Error("getTaskById 失败");
            const updated = updateTaskByIdInSqlite("row-a", {
                status: "done",
                global_mission_gate_passed: true,
                completed_at: now,
            });
            if (updated?.status !== "done" || updated?.global_mission_gate_passed !== true)
                throw new Error("updateTaskById 失败");
            const children = listTasksByParentIdFromSqlite("row-epic");
            if (children.length !== 2)
                throw new Error("listTasksByParentId 数量不正确");
            appendGroupLogRecord("g-row", { timestamp: now, level: "info", category: "test", message: "keep" });
            appendGroupLogRecord("g-row", { timestamp: now, level: "info", category: "test", message: "drop" });
            appendGroupLogRecord("g-other", { timestamp: now, level: "info", category: "test", message: "other" });
            const cleared = clearGroupLogRecords("g-row");
            if (cleared < 2)
                throw new Error("clearGroupLogRecords 未按群删除");
            const remaining = Number(db.prepare("SELECT COUNT(*) AS count FROM group_logs WHERE group_id = ?").get("g-other")?.count || 0);
            if (remaining !== 1)
                throw new Error("clearGroupLogRecords 误删其他群日志");
            return { success: true, row_get: true, row_update: true, parent_list: children.length, group_logs_cleared: cleared };
        }
        finally {
            database = previousDatabase;
        }
    }
    finally {
        db.close();
    }
}
function verifySqliteTaskStore() {
    const db = getDatabase();
    const integrityRows = db.pragma("integrity_check");
    const foreignKeyRows = db.pragma("foreign_key_check");
    const integrity = integrityRows.map(row => String(row.integrity_check || "")).filter(Boolean);
    return {
        valid: integrity.length === 1 && integrity[0] === "ok" && foreignKeyRows.length === 0,
        integrity,
        foreign_key_issues: foreignKeyRows,
    };
}
function getSqliteTaskStoreStatus() {
    const db = getDatabase();
    const journalMode = String(db.pragma("journal_mode", { simple: true }) || "");
    const count = (table) => Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()?.count || 0);
    const statSize = (file) => {
        try {
            return fs.statSync(file).size;
        }
        catch {
            return 0;
        }
    };
    return {
        schema: "ccm-sqlite-task-store-status-v1",
        schema_version: Number(getMeta(db, "schema_version") || STORE_SCHEMA_VERSION),
        database_file: DATABASE_FILE,
        journal_mode: journalMode,
        synchronous: Number(db.pragma("synchronous", { simple: true })),
        database_bytes: statSize(DATABASE_FILE),
        wal_bytes: statSize(`${DATABASE_FILE}-wal`),
        shm_bytes: statSize(`${DATABASE_FILE}-shm`),
        counts: {
            tasks: count("tasks"),
            task_logs: count("task_logs"),
            group_logs: count("group_logs"),
        },
        integrity: verifySqliteTaskStore(),
    };
}
function checkpointSqliteTaskStore(mode = "PASSIVE") {
    return getDatabase().pragma(`wal_checkpoint(${mode})`);
}
function backupSqliteTaskStore(destination = path.join(DATABASE_BACKUP_DIR, `ccm-${isoFileStamp()}.db`)) {
    const db = getDatabase();
    const resolved = path.resolve(destination);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    if (fs.existsSync(resolved))
        fs.unlinkSync(resolved);
    const escaped = resolved.replace(/'/g, "''");
    db.exec(`VACUUM INTO '${escaped}'`);
    return { destination: resolved, bytes: fs.statSync(resolved).size, created_at: new Date().toISOString() };
}
function exportSqliteTaskStore(destination = path.join(EXPORT_DIR, isoFileStamp())) {
    const resolved = path.resolve(destination);
    fs.mkdirSync(resolved, { recursive: true });
    const files = {
        tasks: path.join(resolved, "tasks.json"),
        task_logs: path.join(resolved, "task-logs.json"),
        group_logs: path.join(resolved, "group-logs.json"),
    };
    writeJsonAtomic(files.tasks, loadTasksFromSqlite());
    writeJsonAtomic(files.task_logs, loadTaskLogsFromSqlite());
    writeJsonAtomic(files.group_logs, loadGroupLogsFromSqlite());
    return { destination: resolved, files, exported_at: new Date().toISOString() };
}
function restoreSqliteTaskStore(source) {
    const resolvedSource = path.resolve(source);
    if (!fs.existsSync(resolvedSource))
        throw new Error(`SQLite 备份不存在：${resolvedSource}`);
    const candidate = new better_sqlite3_1.default(resolvedSource, { readonly: true, fileMustExist: true });
    const check = candidate.pragma("integrity_check", { simple: true });
    candidate.close();
    if (String(check) !== "ok")
        throw new Error(`SQLite 备份完整性检查失败：${check}`);
    closeSqliteTaskStore();
    fs.mkdirSync(DATABASE_BACKUP_DIR, { recursive: true });
    const previous = fs.existsSync(DATABASE_FILE)
        ? path.join(DATABASE_BACKUP_DIR, `ccm-before-restore-${isoFileStamp()}.db`)
        : "";
    if (previous)
        fs.copyFileSync(DATABASE_FILE, previous);
    for (const suffix of ["-wal", "-shm"]) {
        try {
            fs.unlinkSync(`${DATABASE_FILE}${suffix}`);
        }
        catch { }
    }
    fs.copyFileSync(resolvedSource, DATABASE_FILE);
    const status = getSqliteTaskStoreStatus();
    return { restored_from: resolvedSource, previous_backup: previous, status };
}
function closeSqliteTaskStore() {
    if (database) {
        try {
            database.pragma("wal_checkpoint(TRUNCATE)");
        }
        catch { }
        database.close();
    }
    database = null;
}
function getSqliteTaskStorePaths() {
    return {
        store_dir: STORE_DIR,
        database_file: DATABASE_FILE,
        database_backup_dir: DATABASE_BACKUP_DIR,
        export_dir: EXPORT_DIR,
    };
}
//# sourceMappingURL=task-store.js.map