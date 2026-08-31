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
exports.previewTestAgentMaintenance = previewTestAgentMaintenance;
exports.applyTestAgentMaintenance = applyTestAgentMaintenance;
exports.rollbackTestAgentMaintenance = rollbackTestAgentMaintenance;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../core/utils");
const db_1 = require("../core/db");
const atomic_json_file_1 = require("../core/atomic-json-file");
const evidence_projection_1 = require("./evidence-projection");
const ROOT = path.join(utils_1.CCM_DIR, "test-agent-maintenance");
const PLAN_DIR = path.join(ROOT, "plans");
const JOB_DIR = path.join(ROOT, "jobs");
const LOCK_FILE = path.join(ROOT, "maintenance.lock");
function hash(value) {
    return crypto.createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value ?? null)).digest("hex");
}
function clean(value) { return String(value || "").trim(); }
function safe(value) { return clean(value).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 160); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function fileHash(file) { return hash(fs.readFileSync(file)); }
function identityOf(input) {
    const taskId = clean(input?.taskId || input?.task_id);
    const scope = clean(input?.scope);
    const scopeId = clean(input?.scopeId || input?.scope_id);
    const exactSessionId = clean(input?.exactSessionId || input?.exact_session_id || input?.sessionId || input?.session_id);
    if (!taskId || !scopeId || !exactSessionId || !["global", "project", "group"].includes(scope))
        throw new Error("test_agent_maintenance_exact_identity_required");
    return { taskId, scope, scopeId, exactSessionId };
}
function taskMatches(task, identity) {
    if (String(task?.id || "") !== identity.taskId)
        return false;
    const session = String(task?.exact_session_id || task?.exactSessionId || task?.project_session_id || task?.projectSessionId || task?.group_session_id || task?.groupSessionId || "");
    const scopeId = identity.scope === "group"
        ? String(task?.group_id || task?.groupId || "")
        : identity.scope === "project"
            ? String(task?.target_project || task?.targetProject || "")
            : String(task?.scope_id || task?.scopeId || "global-agent");
    return session === identity.exactSessionId && (scopeId === identity.scopeId || (identity.scope === "global" && identity.scopeId === "global-agent"));
}
function knownTestAgentNode(value, key = "") {
    const schema = String(value?.schema || "").toLowerCase();
    const type = String(value?.type || value?.kind || "").toLowerCase();
    return /test[_-]?agent/i.test(key) || schema.includes("test-agent") || type.includes("test_agent");
}
function projectKnownNodes(value, key = "root") {
    if (knownTestAgentNode(value, key))
        return (0, evidence_projection_1.projectTestAgentValueForPersistence)(value).value;
    if (Array.isArray(value))
        return value.map((item, index) => projectKnownNodes(item, `${key}[${index}]`));
    if (!value || typeof value !== "object")
        return value;
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, projectKnownNodes(child, childKey)]));
}
function candidateFiles(identity) {
    const roots = [path.join(utils_1.CCM_DIR, "test-agent-handoffs"), path.join(utils_1.CCM_DIR, "test-agent-runs")];
    const files = [];
    for (const root of roots) {
        if (!fs.existsSync(root))
            continue;
        for (const name of fs.readdirSync(root).filter(item => item.endsWith(".json"))) {
            const file = path.join(root, name);
            try {
                const value = readJson(file);
                if (String(value?.taskId || value?.task_id || "") === identity.taskId)
                    files.push(file);
            }
            catch { /* malformed historical rows are reported elsewhere, not rewritten */ }
        }
    }
    return files;
}
function buildPlan(identity) {
    const tasks = (0, db_1.loadTasks)();
    const taskIndex = tasks.findIndex((task) => taskMatches(task, identity));
    if (taskIndex < 0)
        throw new Error("test_agent_maintenance_task_identity_mismatch");
    const task = tasks[taskIndex];
    const projectedTask = projectKnownNodes(task);
    const taskBefore = JSON.stringify(task);
    const taskAfter = JSON.stringify(projectedTask);
    const files = candidateFiles(identity).map(file => {
        const before = readJson(file);
        const projected = (0, evidence_projection_1.projectTestAgentValueForPersistence)(before).value;
        const beforeText = JSON.stringify(before);
        const afterText = JSON.stringify(projected);
        return {
            id: `file_${hash(file).slice(0, 20)}`,
            file,
            checksum: fileHash(file),
            projectedChecksum: hash(projected),
            removedChars: Math.max(0, beforeText.length - afterText.length),
            changed: beforeText !== afterText,
        };
    });
    const core = {
        schema: "ccm-test-agent-maintenance-plan-v1",
        version: 1,
        identity,
        taskChecksum: hash(task),
        projectedTaskChecksum: hash(projectedTask),
        taskChanged: taskBefore !== taskAfter,
        taskRemovedChars: Math.max(0, taskBefore.length - taskAfter.length),
        files,
        affectedRecordCount: files.filter(row => row.changed).length + (taskBefore !== taskAfter ? 1 : 0),
        estimatedRemovedBodyTokens: Math.ceil((files.reduce((sum, row) => sum + row.removedChars, 0) + Math.max(0, taskBefore.length - taskAfter.length)) / 4),
        unresolvedCount: 0,
        contentStored: false,
    };
    return { ...core, planChecksum: hash(core) };
}
function publicPlan(plan) {
    return {
        success: true,
        schema: plan.schema,
        identity: plan.identity,
        planChecksum: plan.planChecksum,
        affectedRecordCount: plan.affectedRecordCount,
        estimatedRemovedBodyTokens: plan.estimatedRemovedBodyTokens,
        unresolvedCount: plan.unresolvedCount,
        records: plan.files.map((row) => ({ id: row.id, checksum: row.checksum, projectedChecksum: row.projectedChecksum, changed: row.changed })),
        taskChecksum: plan.taskChecksum,
        projectedTaskChecksum: plan.projectedTaskChecksum,
        contentStored: false,
    };
}
function previewTestAgentMaintenance(input) {
    const plan = buildPlan(identityOf(input));
    fs.mkdirSync(PLAN_DIR, { recursive: true });
    (0, atomic_json_file_1.writeJsonAtomic)(path.join(PLAN_DIR, `${plan.planChecksum}.json`), plan);
    return publicPlan(plan);
}
function applyTestAgentMaintenance(input) {
    const identity = identityOf(input);
    const planChecksum = clean(input?.planChecksum || input?.plan_checksum);
    const reason = clean(input?.reason);
    if (!planChecksum || !reason)
        throw new Error("test_agent_maintenance_checksum_and_reason_required");
    return (0, atomic_json_file_1.withFileLock)(LOCK_FILE, () => {
        const planFile = path.join(PLAN_DIR, `${safe(planChecksum)}.json`);
        if (!fs.existsSync(planFile))
            throw new Error("test_agent_maintenance_plan_missing");
        const plan = readJson(planFile);
        const { planChecksum: stored, ...core } = plan;
        if (stored !== planChecksum || hash(core) !== planChecksum || JSON.stringify(plan.identity) !== JSON.stringify(identity))
            throw new Error("test_agent_maintenance_plan_invalid");
        const current = buildPlan(identity);
        if (current.planChecksum !== planChecksum)
            throw new Error("test_agent_maintenance_source_drift");
        const jobId = `tam_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
        const jobDir = path.join(JOB_DIR, jobId);
        const backupDir = path.join(jobDir, "backup");
        fs.mkdirSync(backupDir, { recursive: true });
        const tasks = (0, db_1.loadTasks)();
        const taskIndex = tasks.findIndex((task) => taskMatches(task, identity));
        (0, atomic_json_file_1.writeJsonAtomic)(path.join(backupDir, "task.json"), tasks[taskIndex]);
        const backupRows = [];
        for (const row of plan.files) {
            const backup = path.join(backupDir, `${row.id}.json`);
            fs.copyFileSync(row.file, backup);
            backupRows.push({ id: row.id, source: row.file, backup, checksum: row.checksum });
            if (row.changed)
                (0, atomic_json_file_1.writeJsonAtomic)(row.file, (0, evidence_projection_1.projectTestAgentValueForPersistence)(readJson(row.file)).value);
        }
        tasks[taskIndex] = projectKnownNodes(tasks[taskIndex]);
        (0, db_1.saveTasks)(tasks);
        const manifest = {
            schema: "ccm-test-agent-maintenance-job-v1",
            version: 1,
            jobId,
            identity,
            planChecksum,
            reason,
            actor: clean(input?.actor || "memory-center-admin"),
            status: "applied",
            backups: backupRows,
            taskBackup: path.join(backupDir, "task.json"),
            appliedAt: new Date().toISOString(),
            contentStored: false,
        };
        (0, atomic_json_file_1.writeJsonAtomic)(path.join(jobDir, "manifest.json"), manifest);
        return { success: true, jobId, identity, planChecksum, affectedRecordCount: plan.affectedRecordCount, contentStored: false };
    });
}
function rollbackTestAgentMaintenance(input) {
    const jobId = safe(input?.jobId || input?.job_id);
    const reason = clean(input?.reason);
    if (!jobId || !reason)
        throw new Error("test_agent_maintenance_job_and_reason_required");
    return (0, atomic_json_file_1.withFileLock)(LOCK_FILE, () => {
        const manifestFile = path.join(JOB_DIR, jobId, "manifest.json");
        if (!fs.existsSync(manifestFile))
            throw new Error("test_agent_maintenance_job_missing");
        const manifest = readJson(manifestFile);
        if (manifest.status === "rolled_back")
            return { success: true, jobId, status: "rolled_back", idempotent: true, contentStored: false };
        for (const row of manifest.backups || [])
            fs.copyFileSync(row.backup, row.source);
        const originalTask = readJson(manifest.taskBackup);
        const tasks = (0, db_1.loadTasks)();
        const index = tasks.findIndex((task) => String(task?.id || "") === String(originalTask?.id || ""));
        if (index >= 0)
            tasks[index] = originalTask;
        else
            tasks.push(originalTask);
        (0, db_1.saveTasks)(tasks);
        const next = { ...manifest, status: "rolled_back", rollbackReason: reason, rollbackActor: clean(input?.actor || "memory-center-admin"), rolledBackAt: new Date().toISOString() };
        (0, atomic_json_file_1.writeJsonAtomic)(manifestFile, next);
        return { success: true, jobId, status: "rolled_back", restoredRecords: (manifest.backups || []).length + 1, contentStored: false };
    });
}
//# sourceMappingURL=maintenance.js.map