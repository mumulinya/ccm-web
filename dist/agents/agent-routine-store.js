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
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertAgentRoutine = upsertAgentRoutine;
exports.listAgentRoutines = listAgentRoutines;
exports.createAgentRoutineRun = createAgentRoutineRun;
exports.updateAgentRoutineRun = updateAgentRoutineRun;
exports.listAgentRoutineRuns = listAgentRoutineRuns;
const crypto = __importStar(require("crypto"));
const task_store_1 = require("../core/task-store");
const agent_governance_store_1 = require("./agent-governance-store");
const text = (value) => String(value ?? "").trim();
const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;
function rowRun(row) { return { routineRunId: text(row.routine_run_id), routineId: text(row.routine_id), scheduleWindowId: text(row.schedule_window_id), triggerType: text(row.trigger_type), runId: text(row.run_id), status: (text(row.status) || "queued"), catchUp: Number(row.catch_up) === 1, createdAt: text(row.created_at), updatedAt: text(row.updated_at) }; }
function upsertAgentRoutine(input) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const routineId = text(input.routineId) || id("routine");
        const timestamp = now();
        db.prepare(`INSERT INTO agent_routines(routine_id, name, agent_id, scope, scope_id, schedule, trigger_type, catch_up_policy, concurrency_policy, enabled, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(routine_id) DO UPDATE SET name=excluded.name, agent_id=excluded.agent_id, scope=excluded.scope, scope_id=excluded.scope_id, schedule=excluded.schedule, trigger_type=excluded.trigger_type, catch_up_policy=excluded.catch_up_policy, concurrency_policy=excluded.concurrency_policy, enabled=excluded.enabled, payload_json=excluded.payload_json, updated_at=excluded.updated_at`)
            .run(routineId, text(input.name), text(input.agentId), text(input.scope) || "project", text(input.scopeId), text(input.schedule), text(input.triggerType) || "cron", text(input.catchUpPolicy) || "skip", text(input.concurrencyPolicy) || "queue_one", input.enabled === false ? 0 : 1, JSON.stringify(input.payload || {}), timestamp, timestamp);
        return db.prepare("SELECT * FROM agent_routines WHERE routine_id = ?").get(routineId);
    });
}
function listAgentRoutines() { return (0, task_store_1.withSqliteTaskStore)(db => db.prepare("SELECT * FROM agent_routines ORDER BY created_at ASC").all().map(row => ({ routineId: text(row.routine_id), name: text(row.name), agentId: text(row.agent_id), scope: text(row.scope), scopeId: text(row.scope_id), schedule: text(row.schedule), triggerType: text(row.trigger_type), catchUpPolicy: text(row.catch_up_policy), concurrencyPolicy: text(row.concurrency_policy), enabled: Number(row.enabled) === 1, payload: (() => { try {
        return JSON.parse(row.payload_json || "{}");
    }
    catch {
        return {};
    } })(), createdAt: text(row.created_at), updatedAt: text(row.updated_at) }))); }
function createAgentRoutineRun(input) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const existing = db.prepare("SELECT * FROM agent_routine_runs WHERE routine_id = ? AND schedule_window_id = ?").get(text(input.routineId), text(input.scheduleWindowId));
        if (existing)
            return rowRun(existing);
        const routineRunId = id("routine_run");
        const timestamp = now();
        db.prepare("INSERT INTO agent_routine_runs(routine_run_id, routine_id, schedule_window_id, trigger_type, run_id, status, catch_up, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .run(routineRunId, text(input.routineId), text(input.scheduleWindowId), text(input.triggerType) || "cron", text(input.runId), input.status || "queued", input.catchUp ? 1 : 0, timestamp, timestamp);
        (0, agent_governance_store_1.recordAgentActivityInTransaction)(db, { eventType: "routine.run_created", summary: "Routine 执行窗口已记录", payload: { routineId: input.routineId, routineRunId, scheduleWindowId: input.scheduleWindowId }, idempotencyKey: `routine-run-created:${input.routineId}:${input.scheduleWindowId}` });
        return rowRun(db.prepare("SELECT * FROM agent_routine_runs WHERE routine_run_id = ?").get(routineRunId));
    });
}
function updateAgentRoutineRun(routineRunId, patch) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        const row = db.prepare("SELECT * FROM agent_routine_runs WHERE routine_run_id = ?").get(text(routineRunId));
        if (!row)
            return null;
        db.prepare("UPDATE agent_routine_runs SET run_id = COALESCE(NULLIF(?, ''), run_id), status = COALESCE(NULLIF(?, ''), status), updated_at = ? WHERE routine_run_id = ?").run(text(patch.runId), text(patch.status), now(), text(routineRunId));
        return rowRun(db.prepare("SELECT * FROM agent_routine_runs WHERE routine_run_id = ?").get(text(routineRunId)));
    });
}
function listAgentRoutineRuns(routineId) { return (0, task_store_1.withSqliteTaskStore)(db => db.prepare(`SELECT * FROM agent_routine_runs ${text(routineId) ? "WHERE routine_id = ?" : ""} ORDER BY created_at DESC`).all(...(text(routineId) ? [text(routineId)] : [])).map(rowRun)); }
//# sourceMappingURL=agent-routine-store.js.map