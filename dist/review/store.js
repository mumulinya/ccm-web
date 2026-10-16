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
exports.newReviewId = void 0;
exports.readReviewJob = readReviewJob;
exports.listReviewJobs = listReviewJobs;
exports.ensureReviewJob = ensureReviewJob;
exports.updateReviewJob = updateReviewJob;
exports.acquireReviewLock = acquireReviewLock;
exports.releaseReviewLock = releaseReviewLock;
exports.queuedReviewJobs = queuedReviewJobs;
exports.staleStandaloneReviewJobs = staleStandaloneReviewJobs;
exports.expiredCredentialReviewJobs = expiredCredentialReviewJobs;
exports.removeReviewJobs = removeReviewJobs;
exports.taskReviewProjection = taskReviewProjection;
exports.saveRuleDraft = saveRuleDraft;
exports.listRuleDrafts = listRuleDrafts;
exports.publicReviewJob = publicReviewJob;
const crypto = __importStar(require("crypto"));
const task_store_1 = require("../core/task-store");
function schema(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS code_review_jobs (id TEXT PRIMARY KEY, job_key TEXT NOT NULL UNIQUE, task_id TEXT NOT NULL, project TEXT NOT NULL, updated_at TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS code_review_task ON code_review_jobs(task_id, updated_at);
    CREATE TABLE IF NOT EXISTS code_review_locks (name TEXT PRIMARY KEY, owner TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS code_review_rule_drafts (id TEXT PRIMARY KEY, payload TEXT NOT NULL);`);
}
function readReviewJob(id) {
    return (0, task_store_1.withSqliteTaskStore)(db => { schema(db); const row = db.prepare('SELECT payload FROM code_review_jobs WHERE id=?').get(id); return row ? JSON.parse(row.payload) : null; });
}
function listReviewJobs(taskId, project) {
    return (0, task_store_1.withSqliteTaskStore)(db => { schema(db); const rows = db.prepare('SELECT payload FROM code_review_jobs WHERE (? IS NULL OR task_id=?) AND (? IS NULL OR project=?) ORDER BY updated_at DESC LIMIT 200').all(taskId ?? null, taskId ?? null, project ?? null, project ?? null); return rows.map(r => JSON.parse(r.payload)); });
}
function ensureReviewJob(job) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        schema(db);
        const row = db.prepare('SELECT payload FROM code_review_jobs WHERE job_key=?').get(job.key);
        if (row)
            return { job: JSON.parse(row.payload), created: false };
        db.prepare('INSERT INTO code_review_jobs VALUES(?,?,?,?,?,?)').run(job.id, job.key, job.subject.taskId, job.subject.project, job.updatedAt, JSON.stringify(job));
        return { job, created: true };
    });
}
function updateReviewJob(id, mutate, expectedRevision) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        schema(db);
        const row = db.prepare('SELECT payload FROM code_review_jobs WHERE id=?').get(id);
        if (!row)
            throw new Error('审核不存在');
        const job = JSON.parse(row.payload);
        if (expectedRevision !== undefined && job.revision !== expectedRevision)
            throw Object.assign(new Error('审核已变化，请刷新'), { status: 409 });
        mutate(job);
        job.revision++;
        job.updatedAt = new Date().toISOString();
        db.prepare('UPDATE code_review_jobs SET payload=?,updated_at=? WHERE id=?').run(JSON.stringify(job), job.updatedAt, id);
        return job;
    });
}
function acquireReviewLock(name, owner, ttl = 30000) {
    return (0, task_store_1.withImmediateTaskStoreTransaction)(db => {
        schema(db);
        const row = db.prepare('SELECT * FROM code_review_locks WHERE name=?').get(name);
        if (row && row.owner !== owner && row.expires > Date.now())
            return false;
        db.prepare('INSERT INTO code_review_locks VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,expires=excluded.expires').run(name, owner, Date.now() + ttl);
        return true;
    });
}
function releaseReviewLock(name, owner) { (0, task_store_1.withImmediateTaskStoreTransaction)(db => { schema(db); db.prepare('DELETE FROM code_review_locks WHERE name=? AND owner=?').run(name, owner); }); }
const newReviewId = () => `cr_${crypto.randomUUID()}`;
exports.newReviewId = newReviewId;
function queuedReviewJobs() {
    return (0, task_store_1.withSqliteTaskStore)(db => { schema(db); return db.prepare("SELECT payload FROM code_review_jobs WHERE json_extract(payload,'$.status') IN ('queued','running','recovery_required') ORDER BY updated_at ASC LIMIT 200").all().map(r => JSON.parse(r.payload)); });
}
function staleStandaloneReviewJobs() {
    return (0, task_store_1.withSqliteTaskStore)(db => { schema(db); return db.prepare("SELECT payload FROM code_review_jobs WHERE task_id='' AND updated_at < ? AND json_extract(payload,'$.status') IN ('completed','failed','cancelled') ORDER BY updated_at ASC LIMIT 200").all(new Date(Date.now() - 30 * 86400000).toISOString()).map(r => JSON.parse(r.payload)); });
}
function expiredCredentialReviewJobs() {
    return (0, task_store_1.withSqliteTaskStore)(db => { schema(db); return db.prepare("SELECT payload FROM code_review_jobs WHERE COALESCE(json_extract(payload,'$.credentialsCleared'),0)=0 AND (json_extract(payload,'$.status') IN ('failed','cancelled') OR (json_extract(payload,'$.status')='running' AND json_extract(payload,'$.leaseUntil') < ?)) ORDER BY updated_at ASC LIMIT 200").all(Date.now()).map(r => JSON.parse(r.payload)); });
}
function removeReviewJobs(ids) { (0, task_store_1.withImmediateTaskStoreTransaction)(db => { schema(db); for (const id of ids)
    db.prepare('DELETE FROM code_review_jobs WHERE id=?').run(id); }); }
function taskReviewProjection(task) {
    const ids = [...(task.code_review_job_ids || [])].reverse();
    for (const id of ids) {
        const job = readReviewJob(id);
        if (job?.subject.taskId === task.id)
            return publicReviewJob(job);
    }
    return null;
}
function saveRuleDraft(draft) { (0, task_store_1.withImmediateTaskStoreTransaction)(db => { schema(db); db.prepare('INSERT INTO code_review_rule_drafts VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(draft.id, JSON.stringify(draft)); }); return draft; }
function listRuleDrafts() { return (0, task_store_1.withSqliteTaskStore)(db => { schema(db); return db.prepare('SELECT payload FROM code_review_rule_drafts LIMIT 200').all().map(r => JSON.parse(r.payload)); }); }
function publicReviewJob(job) {
    return { id: job.id, revision: job.revision, runId: job.runId, status: job.status, stage: job.stage, conclusion: job.conclusion,
        project: job.subject.project, taskId: job.subject.taskId, subjectChecksum: job.subject.checksum, policyChecksum: job.policy.checksum,
        level: job.policy.level, files: job.subject.files.map(f => ({ path: f.path, deleted: f.after === null, binary: !!f.binary })),
        findings: job.findings, coverage: job.coverage, error: job.error, elapsedMs: job.elapsedMs, usage: job.usage,
        createdAt: job.createdAt, updatedAt: job.updatedAt, history: job.history };
}
//# sourceMappingURL=store.js.map