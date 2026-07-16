import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import Database from "better-sqlite3";

const STORE_SCHEMA_VERSION = 1;
const DEFAULT_STORE_DIR = path.join(os.homedir(), ".cc-connect");
const STORE_DIR = path.resolve(process.env.CCM_TASK_STORE_DIR || DEFAULT_STORE_DIR);
const DATABASE_FILE = path.join(STORE_DIR, "ccm.db");
const LEGACY_BACKUP_DIR = path.join(STORE_DIR, "legacy-json-backups");
const DATABASE_BACKUP_DIR = path.join(STORE_DIR, "database-backups");
const EXPORT_DIR = path.join(STORE_DIR, "exports");

const LEGACY_FILES = {
  tasks: path.join(STORE_DIR, "tasks.json"),
  taskLogs: path.join(STORE_DIR, "task-logs.json"),
  groupLogs: path.join(STORE_DIR, "group-logs.json"),
};

let database: Database.Database | null = null;
let initialized = false;

function isoFileStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function stableHash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stringifyJson(value: any) {
  return JSON.stringify(value ?? null);
}

function parseJson(value: any, fallback: any) {
  try {
    return JSON.parse(String(value || ""));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  fs.renameSync(temp, file);
}

function readLegacyJson(file: string, expected: "array" | "object") {
  for (const candidate of [file, `${file}.bak`]) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf-8"));
      if (expected === "array" && Array.isArray(parsed)) return { source: candidate, value: parsed };
      if (expected === "object" && parsed && typeof parsed === "object" && !Array.isArray(parsed)) return { source: candidate, value: parsed };
    } catch {}
  }
  return null;
}

function archiveLegacyFiles(file: string) {
  if (process.env.CCM_SQLITE_KEEP_LEGACY_JSON === "1") return [];
  const archived: string[] = [];
  fs.mkdirSync(LEGACY_BACKUP_DIR, { recursive: true });
  const stamp = isoFileStamp();
  for (const candidate of [file, `${file}.bak`]) {
    if (!fs.existsSync(candidate)) continue;
    const destination = path.join(LEGACY_BACKUP_DIR, `${path.basename(candidate)}.${stamp}`);
    try {
      fs.renameSync(candidate, destination);
    } catch {
      fs.copyFileSync(candidate, destination);
      fs.unlinkSync(candidate);
    }
    archived.push(destination);
  }
  return archived;
}

function configureDatabase(db: Database.Database) {
  db.pragma("busy_timeout = 10000");
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("temp_store = MEMORY");
  db.pragma("wal_autocheckpoint = 1000");
}

function createSchema(db: Database.Database) {
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
  `);
  setMeta(db, "schema_version", STORE_SCHEMA_VERSION);
}

function getMeta(db: Database.Database, key: string) {
  const row = db.prepare("SELECT value_json FROM app_meta WHERE key = ?").get(key) as { value_json?: string } | undefined;
  return row ? parseJson(row.value_json, null) : null;
}

function setMeta(db: Database.Database, key: string, value: any) {
  db.prepare(`
    INSERT INTO app_meta(key, value_json, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `).run(key, stringifyJson(value), new Date().toISOString());
}

function taskColumns(task: any, position: number) {
  const payload = stringifyJson(task);
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
  };
}

function insertTasks(db: Database.Database, tasks: any[]) {
  const statement = db.prepare(`
    INSERT INTO tasks(
      id, position, status, group_id, target_project, workflow_type,
      created_at, updated_at, archived, payload_json, payload_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      payload_hash = excluded.payload_hash
  `);
  for (let position = 0; position < tasks.length; position += 1) {
    const row = taskColumns(tasks[position], position);
    if (!row.id) throw new Error(`任务缺少 id，位置 ${position}`);
    statement.run(row.id, row.position, row.status, row.groupId, row.targetProject, row.workflowType, row.createdAt, row.updatedAt, row.archived, row.payload, row.hash);
  }
}

function insertTaskLogs(db: Database.Database, logs: any) {
  const statement = db.prepare("INSERT INTO task_logs(task_id, timestamp, level, message, payload_json) VALUES (?, ?, ?, ?, ?)");
  for (const [taskId, values] of Object.entries(logs || {})) {
    const rows = Array.isArray(values) ? values.slice(-100) : [];
    for (const entry of rows) {
      const record: any = entry || {};
      statement.run(String(taskId), String(record.timestamp || new Date().toISOString()), String(record.level || "info"), String(record.message || ""), stringifyJson(record));
    }
  }
}

function insertGroupLogs(db: Database.Database, logs: any) {
  const statement = db.prepare("INSERT INTO group_logs(group_id, timestamp, level, category, message, details_json, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)");
  for (const [groupId, values] of Object.entries(logs || {})) {
    const rows = Array.isArray(values) ? values.slice(-500) : [];
    for (const entry of rows) {
      const record: any = entry || {};
      statement.run(String(groupId), String(record.timestamp || new Date().toISOString()), String(record.level || "info"), String(record.category || ""), String(record.message || ""), stringifyJson(record.details ?? null), stringifyJson(record));
    }
  }
}

function migrateLegacyStore(db: Database.Database) {
  const migrations = [
    {
      key: "legacy_tasks_imported_v1",
      table: "tasks",
      file: LEGACY_FILES.tasks,
      expected: "array" as const,
      insert: (value: any) => insertTasks(db, value),
    },
    {
      key: "legacy_task_logs_imported_v1",
      table: "task_logs",
      file: LEGACY_FILES.taskLogs,
      expected: "object" as const,
      insert: (value: any) => insertTaskLogs(db, value),
    },
    {
      key: "legacy_group_logs_imported_v1",
      table: "group_logs",
      file: LEGACY_FILES.groupLogs,
      expected: "object" as const,
      insert: (value: any) => insertGroupLogs(db, value),
    },
  ];

  for (const migration of migrations) {
    if (getMeta(db, migration.key)) continue;
    const existingCount = Number((db.prepare(`SELECT COUNT(*) AS count FROM ${migration.table}`).get() as any)?.count || 0);
    const legacy = existingCount === 0 ? readLegacyJson(migration.file, migration.expected) : null;
    const importedAt = new Date().toISOString();
    const transaction = db.transaction(() => {
      if (legacy) migration.insert(legacy.value);
      setMeta(db, migration.key, {
        imported_at: importedAt,
        imported: !!legacy,
        source: legacy?.source || "",
        count: legacy
          ? migration.expected === "array"
            ? legacy.value.length
            : Object.values(legacy.value).reduce((total: number, rows: any) => total + (Array.isArray(rows) ? rows.length : 0), 0)
          : existingCount,
      });
    });
    transaction();
    const archived = legacy ? archiveLegacyFiles(migration.file) : [];
    if (archived.length) {
      const current = getMeta(db, migration.key) || {};
      setMeta(db, migration.key, { ...current, archived });
    }
  }
  db.pragma("wal_checkpoint(PASSIVE)");
}

function getDatabase() {
  if (database) return database;
  fs.mkdirSync(STORE_DIR, { recursive: true });
  database = new Database(DATABASE_FILE);
  configureDatabase(database);
  createSchema(database);
  if (!initialized) {
    migrateLegacyStore(database);
    initialized = true;
  }
  return database;
}

export function loadTasksFromSqlite(): any[] {
  const rows = getDatabase().prepare("SELECT payload_json FROM tasks ORDER BY position ASC, rowid ASC").all() as Array<{ payload_json: string }>;
  return rows.map(row => parseJson(row.payload_json, null)).filter(Boolean);
}

export function getTaskByIdFromSqlite(id: string): any | null {
  const taskId = String(id || "").trim();
  if (!taskId) return null;
  const row = getDatabase().prepare("SELECT payload_json FROM tasks WHERE id = ?").get(taskId) as { payload_json?: string } | undefined;
  return row ? parseJson(row.payload_json, null) : null;
}

export function listTasksByParentIdFromSqlite(parentId: string): any[] {
  const parent = String(parentId || "").trim();
  if (!parent) return [];
  const rows = getDatabase().prepare(
    "SELECT payload_json FROM tasks WHERE json_extract(payload_json, '$.parent_task_id') = ? ORDER BY position ASC, rowid ASC",
  ).all(parent) as Array<{ payload_json: string }>;
  return rows.map(row => parseJson(row.payload_json, null)).filter(Boolean);
}

/** 行级更新：只读写单条任务，避免整表进出。 */
export function updateTaskByIdInSqlite(id: string, patchOrMutator: any): any | null {
  const taskId = String(id || "").trim();
  if (!taskId) return null;
  const db = getDatabase();
  const existing = db.prepare("SELECT id, position, payload_json FROM tasks WHERE id = ?").get(taskId) as
    | { id: string; position: number; payload_json: string }
    | undefined;
  if (!existing) return null;
  const current = parseJson(existing.payload_json, null);
  if (!current) return null;
  const next = typeof patchOrMutator === "function"
    ? patchOrMutator({ ...current })
    : { ...current, ...(patchOrMutator || {}), id: current.id, updated_at: new Date().toISOString() };
  if (!next || String(next.id) !== taskId) throw new Error("行级更新不能改变任务 id");
  const row = taskColumns(next, Number(existing.position) || 0);
  db.prepare(`
    UPDATE tasks SET
      position = ?, status = ?, group_id = ?, target_project = ?, workflow_type = ?,
      created_at = ?, updated_at = ?, archived = ?, payload_json = ?, payload_hash = ?
    WHERE id = ?
  `).run(
    row.position, row.status, row.groupId, row.targetProject, row.workflowType,
    row.createdAt, row.updatedAt, row.archived, row.payload, row.hash, taskId,
  );
  return next;
}

export function saveTasksToSqlite(tasks: any[]) {
  if (!Array.isArray(tasks)) throw new Error("任务存储只接受数组");
  const db = getDatabase();
  const currentRows = db.prepare("SELECT id, position, payload_hash FROM tasks").all() as Array<{ id: string; position: number; payload_hash: string }>;
  const current = new Map(currentRows.map(row => [row.id, row]));
  const desiredIds = new Set<string>();
  const upsert = db.prepare(`
    INSERT INTO tasks(
      id, position, status, group_id, target_project, workflow_type,
      created_at, updated_at, archived, payload_json, payload_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      payload_hash = excluded.payload_hash
  `);
  const remove = db.prepare("DELETE FROM tasks WHERE id = ?");
  let inserted = 0;
  let updated = 0;
  let deleted = 0;
  const transaction = db.transaction(() => {
    for (let position = 0; position < tasks.length; position += 1) {
      const row = taskColumns(tasks[position], position);
      if (!row.id) throw new Error(`任务缺少 id，位置 ${position}`);
      if (desiredIds.has(row.id)) throw new Error(`任务 id 重复：${row.id}`);
      desiredIds.add(row.id);
      const previous = current.get(row.id);
      if (previous && previous.payload_hash === row.hash && Number(previous.position) === position) continue;
      upsert.run(row.id, row.position, row.status, row.groupId, row.targetProject, row.workflowType, row.createdAt, row.updatedAt, row.archived, row.payload, row.hash);
      if (previous) updated += 1;
      else inserted += 1;
    }
    for (const id of current.keys()) {
      if (desiredIds.has(id)) continue;
      remove.run(id);
      deleted += 1;
    }
  });
  transaction();
  return { total: tasks.length, inserted, updated, deleted };
}

export function runTaskStoreAtomicBatchSelfTest() {
  const db = new Database(":memory:");
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
    } catch {
      rollbackObserved = Number((db.prepare("SELECT COUNT(*) AS count FROM tasks").get() as any)?.count || 0) === 0;
    }
    const commit = db.transaction(() => insertTasks(db, [parent, ...children]));
    commit();
    const committedCount = Number((db.prepare("SELECT COUNT(*) AS count FROM tasks").get() as any)?.count || 0);
    const replay = db.transaction(() => insertTasks(db, [parent, ...children]));
    replay();
    const replayCount = Number((db.prepare("SELECT COUNT(*) AS count FROM tasks").get() as any)?.count || 0);
    const parentPayload = parseJson((db.prepare("SELECT payload_json FROM tasks WHERE id = ?").get(parent.id) as any)?.payload_json, null);
    const beforeRestart = new Database(restartFile);
    configureDatabase(beforeRestart);
    createSchema(beforeRestart);
    insertTasks(beforeRestart, [parent, ...children]);
    beforeRestart.close();
    const afterRestart = new Database(restartFile);
    configureDatabase(afterRestart);
    createSchema(afterRestart);
    const restartCount = Number((afterRestart.prepare("SELECT COUNT(*) AS count FROM tasks").get() as any)?.count || 0);
    const restartedParent = parseJson((afterRestart.prepare("SELECT payload_json FROM tasks WHERE id = ?").get(parent.id) as any)?.payload_json, null);
    afterRestart.close();
    const restartRecovered = restartCount === 3
      && restartedParent?.workflow_type === "requirement_epic"
      && restartedParent?.child_task_ids?.length === 2;
    const idempotentReplay = replayCount === committedCount;
    const passed = rollbackObserved && committedCount === 3 && idempotentReplay && parentPayload?.workflow_type === "requirement_epic" && restartRecovered;
    return {
      success: passed,
      rollback_observed: rollbackObserved,
      committed_count: committedCount,
      idempotent_replay: idempotentReplay,
      parent_round_trip: parentPayload?.id === parent.id,
      restart_recovered: restartRecovered,
      restart_count: restartCount,
    };
  } finally {
    db.close();
    try { fs.rmSync(restartFile, { force: true }); } catch { /* ignore self-test cleanup errors */ }
  }
}

export function appendTaskLogRecord(taskId: string, entry: any, maxEntries = 100) {
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

export function getTaskLogRecords(taskId: string, limit = 50) {
  const rows = getDatabase().prepare("SELECT payload_json FROM task_logs WHERE task_id = ? ORDER BY id DESC LIMIT ?")
    .all(String(taskId), Math.max(1, limit)) as Array<{ payload_json: string }>;
  return rows.reverse().map(row => parseJson(row.payload_json, null)).filter(Boolean);
}

export function clearTaskLogRecords(taskId: string) {
  return getDatabase().prepare("DELETE FROM task_logs WHERE task_id = ?").run(String(taskId)).changes;
}

export function loadTaskLogsFromSqlite() {
  const rows = getDatabase().prepare("SELECT task_id, payload_json FROM task_logs ORDER BY id ASC").all() as Array<{ task_id: string; payload_json: string }>;
  const output: Record<string, any[]> = {};
  for (const row of rows) {
    if (!output[row.task_id]) output[row.task_id] = [];
    const value = parseJson(row.payload_json, null);
    if (value) output[row.task_id].push(value);
  }
  return output;
}

export function replaceTaskLogsInSqlite(logs: any) {
  const db = getDatabase();
  const transaction = db.transaction(() => {
    db.exec("DELETE FROM task_logs");
    insertTaskLogs(db, logs || {});
  });
  transaction();
}

export function appendGroupLogRecord(groupId: string, entry: any, maxEntries = 500) {
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

export function loadGroupLogsFromSqlite() {
  const rows = getDatabase().prepare("SELECT group_id, payload_json FROM group_logs ORDER BY id ASC").all() as Array<{ group_id: string; payload_json: string }>;
  const output: Record<string, any[]> = {};
  for (const row of rows) {
    if (!output[row.group_id]) output[row.group_id] = [];
    const value = parseJson(row.payload_json, null);
    if (value) output[row.group_id].push(value);
  }
  return output;
}

export function replaceGroupLogsInSqlite(logs: any) {
  const db = getDatabase();
  const transaction = db.transaction(() => {
    db.exec("DELETE FROM group_logs");
    insertGroupLogs(db, logs || {});
  });
  transaction();
}

export function clearGroupLogRecords(groupId: string) {
  const id = String(groupId || "").trim();
  if (!id) return 0;
  return Number(getDatabase().prepare("DELETE FROM group_logs WHERE group_id = ?").run(id).changes || 0);
}

export function runTaskStoreRowApiSelfTest() {
  const db = new Database(":memory:");
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
      if (!loaded || loaded.id !== "row-a") throw new Error("getTaskById 失败");
      const updated = updateTaskByIdInSqlite("row-a", {
        status: "done",
        global_mission_gate_passed: true,
        completed_at: now,
      });
      if (updated?.status !== "done" || updated?.global_mission_gate_passed !== true) throw new Error("updateTaskById 失败");
      const children = listTasksByParentIdFromSqlite("row-epic");
      if (children.length !== 2) throw new Error("listTasksByParentId 数量不正确");
      appendGroupLogRecord("g-row", { timestamp: now, level: "info", category: "test", message: "keep" });
      appendGroupLogRecord("g-row", { timestamp: now, level: "info", category: "test", message: "drop" });
      appendGroupLogRecord("g-other", { timestamp: now, level: "info", category: "test", message: "other" });
      const cleared = clearGroupLogRecords("g-row");
      if (cleared < 2) throw new Error("clearGroupLogRecords 未按群删除");
      const remaining = Number((db.prepare("SELECT COUNT(*) AS count FROM group_logs WHERE group_id = ?").get("g-other") as any)?.count || 0);
      if (remaining !== 1) throw new Error("clearGroupLogRecords 误删其他群日志");
      return { success: true, row_get: true, row_update: true, parent_list: children.length, group_logs_cleared: cleared };
    } finally {
      database = previousDatabase;
    }
  } finally {
    db.close();
  }
}

export function verifySqliteTaskStore() {
  const db = getDatabase();
  const integrityRows = db.pragma("integrity_check") as Array<{ integrity_check?: string }>;
  const foreignKeyRows = db.pragma("foreign_key_check") as any[];
  const integrity = integrityRows.map(row => String(row.integrity_check || "")).filter(Boolean);
  return {
    valid: integrity.length === 1 && integrity[0] === "ok" && foreignKeyRows.length === 0,
    integrity,
    foreign_key_issues: foreignKeyRows,
  };
}

export function getSqliteTaskStoreStatus() {
  const db = getDatabase();
  const journalMode = String(db.pragma("journal_mode", { simple: true }) || "");
  const count = (table: string) => Number((db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as any)?.count || 0);
  const statSize = (file: string) => {
    try { return fs.statSync(file).size; } catch { return 0; }
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
    migrations: {
      tasks: getMeta(db, "legacy_tasks_imported_v1"),
      task_logs: getMeta(db, "legacy_task_logs_imported_v1"),
      group_logs: getMeta(db, "legacy_group_logs_imported_v1"),
    },
    integrity: verifySqliteTaskStore(),
  };
}

export function checkpointSqliteTaskStore(mode: "PASSIVE" | "FULL" | "RESTART" | "TRUNCATE" = "PASSIVE") {
  return getDatabase().pragma(`wal_checkpoint(${mode})`);
}

export function backupSqliteTaskStore(destination = path.join(DATABASE_BACKUP_DIR, `ccm-${isoFileStamp()}.db`)) {
  const db = getDatabase();
  const resolved = path.resolve(destination);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
  const escaped = resolved.replace(/'/g, "''");
  db.exec(`VACUUM INTO '${escaped}'`);
  return { destination: resolved, bytes: fs.statSync(resolved).size, created_at: new Date().toISOString() };
}

export function exportSqliteTaskStore(destination = path.join(EXPORT_DIR, isoFileStamp())) {
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

export function restoreSqliteTaskStore(source: string) {
  const resolvedSource = path.resolve(source);
  if (!fs.existsSync(resolvedSource)) throw new Error(`SQLite 备份不存在：${resolvedSource}`);
  const candidate = new Database(resolvedSource, { readonly: true, fileMustExist: true });
  const check = candidate.pragma("integrity_check", { simple: true });
  candidate.close();
  if (String(check) !== "ok") throw new Error(`SQLite 备份完整性检查失败：${check}`);

  closeSqliteTaskStore();
  fs.mkdirSync(DATABASE_BACKUP_DIR, { recursive: true });
  const previous = fs.existsSync(DATABASE_FILE)
    ? path.join(DATABASE_BACKUP_DIR, `ccm-before-restore-${isoFileStamp()}.db`)
    : "";
  if (previous) fs.copyFileSync(DATABASE_FILE, previous);
  for (const suffix of ["-wal", "-shm"]) {
    try { fs.unlinkSync(`${DATABASE_FILE}${suffix}`); } catch {}
  }
  fs.copyFileSync(resolvedSource, DATABASE_FILE);
  initialized = false;
  const status = getSqliteTaskStoreStatus();
  return { restored_from: resolvedSource, previous_backup: previous, status };
}

export function closeSqliteTaskStore() {
  if (database) {
    try { database.pragma("wal_checkpoint(TRUNCATE)"); } catch {}
    database.close();
  }
  database = null;
  initialized = false;
}

export function getSqliteTaskStorePaths() {
  return {
    store_dir: STORE_DIR,
    database_file: DATABASE_FILE,
    legacy_backup_dir: LEGACY_BACKUP_DIR,
    database_backup_dir: DATABASE_BACKUP_DIR,
    export_dir: EXPORT_DIR,
    legacy_files: { ...LEGACY_FILES },
  };
}
