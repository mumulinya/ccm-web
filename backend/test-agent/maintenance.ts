import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../core/utils";
import { loadTasks, saveTasks } from "../core/db";
import { withFileLock, writeJsonAtomic } from "../core/atomic-json-file";
import { projectTestAgentValueForPersistence } from "./evidence-projection";

type Identity = { taskId: string; scope: "global" | "project" | "group"; scopeId: string; exactSessionId: string };

const ROOT = path.join(CCM_DIR, "test-agent-maintenance");
const PLAN_DIR = path.join(ROOT, "plans");
const JOB_DIR = path.join(ROOT, "jobs");
const LOCK_FILE = path.join(ROOT, "maintenance.lock");

function hash(value: any) {
  return crypto.createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value ?? null)).digest("hex");
}

function clean(value: any) { return String(value || "").trim(); }
function safe(value: any) { return clean(value).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 160); }
function readJson(file: string) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function fileHash(file: string) { return hash(fs.readFileSync(file)); }

function identityOf(input: any): Identity {
  const taskId = clean(input?.taskId || input?.task_id);
  const scope = clean(input?.scope) as Identity["scope"];
  const scopeId = clean(input?.scopeId || input?.scope_id);
  const exactSessionId = clean(input?.exactSessionId || input?.exact_session_id || input?.sessionId || input?.session_id);
  if (!taskId || !scopeId || !exactSessionId || !["global", "project", "group"].includes(scope)) throw new Error("test_agent_maintenance_exact_identity_required");
  return { taskId, scope, scopeId, exactSessionId };
}

function taskMatches(task: any, identity: Identity) {
  if (String(task?.id || "") !== identity.taskId) return false;
  const session = String(task?.exact_session_id || task?.exactSessionId || task?.project_session_id || task?.projectSessionId || task?.group_session_id || task?.groupSessionId || "");
  const scopeId = identity.scope === "group"
    ? String(task?.group_id || task?.groupId || "")
    : identity.scope === "project"
      ? String(task?.target_project || task?.targetProject || "")
      : String(task?.scope_id || task?.scopeId || "global-agent");
  return session === identity.exactSessionId && (scopeId === identity.scopeId || (identity.scope === "global" && identity.scopeId === "global-agent"));
}

function knownTestAgentNode(value: any, key = "") {
  const schema = String(value?.schema || "").toLowerCase();
  const type = String(value?.type || value?.kind || "").toLowerCase();
  return /test[_-]?agent/i.test(key) || schema.includes("test-agent") || type.includes("test_agent");
}

function projectKnownNodes(value: any, key = "root"): any {
  if (knownTestAgentNode(value, key)) return projectTestAgentValueForPersistence(value).value;
  if (Array.isArray(value)) return value.map((item, index) => projectKnownNodes(item, `${key}[${index}]`));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, projectKnownNodes(child, childKey)]));
}

function candidateFiles(identity: Identity) {
  const roots = [path.join(CCM_DIR, "test-agent-handoffs"), path.join(CCM_DIR, "test-agent-runs")];
  const files: string[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const name of fs.readdirSync(root).filter(item => item.endsWith(".json"))) {
      const file = path.join(root, name);
      try {
        const value = readJson(file);
        if (String(value?.taskId || value?.task_id || "") === identity.taskId) files.push(file);
      } catch { /* malformed historical rows are reported elsewhere, not rewritten */ }
    }
  }
  return files;
}

function buildPlan(identity: Identity) {
  const tasks = loadTasks();
  const taskIndex = tasks.findIndex((task: any) => taskMatches(task, identity));
  if (taskIndex < 0) throw new Error("test_agent_maintenance_task_identity_mismatch");
  const task = tasks[taskIndex];
  const projectedTask = projectKnownNodes(task);
  const taskBefore = JSON.stringify(task);
  const taskAfter = JSON.stringify(projectedTask);
  const files = candidateFiles(identity).map(file => {
    const before = readJson(file);
    const projected = projectTestAgentValueForPersistence(before).value;
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

function publicPlan(plan: any) {
  return {
    success: true,
    schema: plan.schema,
    identity: plan.identity,
    planChecksum: plan.planChecksum,
    affectedRecordCount: plan.affectedRecordCount,
    estimatedRemovedBodyTokens: plan.estimatedRemovedBodyTokens,
    unresolvedCount: plan.unresolvedCount,
    records: plan.files.map((row: any) => ({ id: row.id, checksum: row.checksum, projectedChecksum: row.projectedChecksum, changed: row.changed })),
    taskChecksum: plan.taskChecksum,
    projectedTaskChecksum: plan.projectedTaskChecksum,
    contentStored: false,
  };
}

export function previewTestAgentMaintenance(input: any) {
  const plan = buildPlan(identityOf(input));
  fs.mkdirSync(PLAN_DIR, { recursive: true });
  writeJsonAtomic(path.join(PLAN_DIR, `${plan.planChecksum}.json`), plan);
  return publicPlan(plan);
}

export function applyTestAgentMaintenance(input: any) {
  const identity = identityOf(input);
  const planChecksum = clean(input?.planChecksum || input?.plan_checksum);
  const reason = clean(input?.reason);
  if (!planChecksum || !reason) throw new Error("test_agent_maintenance_checksum_and_reason_required");
  return withFileLock(LOCK_FILE, () => {
    const planFile = path.join(PLAN_DIR, `${safe(planChecksum)}.json`);
    if (!fs.existsSync(planFile)) throw new Error("test_agent_maintenance_plan_missing");
    const plan = readJson(planFile);
    const { planChecksum: stored, ...core } = plan;
    if (stored !== planChecksum || hash(core) !== planChecksum || JSON.stringify(plan.identity) !== JSON.stringify(identity)) throw new Error("test_agent_maintenance_plan_invalid");
    const current = buildPlan(identity);
    if (current.planChecksum !== planChecksum) throw new Error("test_agent_maintenance_source_drift");
    const jobId = `tam_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
    const jobDir = path.join(JOB_DIR, jobId);
    const backupDir = path.join(jobDir, "backup");
    fs.mkdirSync(backupDir, { recursive: true });
    const tasks = loadTasks();
    const taskIndex = tasks.findIndex((task: any) => taskMatches(task, identity));
    writeJsonAtomic(path.join(backupDir, "task.json"), tasks[taskIndex]);
    const backupRows: any[] = [];
    for (const row of plan.files) {
      const backup = path.join(backupDir, `${row.id}.json`);
      fs.copyFileSync(row.file, backup);
      backupRows.push({ id: row.id, source: row.file, backup, checksum: row.checksum });
      if (row.changed) writeJsonAtomic(row.file, projectTestAgentValueForPersistence(readJson(row.file)).value);
    }
    tasks[taskIndex] = projectKnownNodes(tasks[taskIndex]);
    saveTasks(tasks);
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
    writeJsonAtomic(path.join(jobDir, "manifest.json"), manifest);
    return { success: true, jobId, identity, planChecksum, affectedRecordCount: plan.affectedRecordCount, contentStored: false };
  });
}

export function rollbackTestAgentMaintenance(input: any) {
  const jobId = safe(input?.jobId || input?.job_id);
  const reason = clean(input?.reason);
  if (!jobId || !reason) throw new Error("test_agent_maintenance_job_and_reason_required");
  return withFileLock(LOCK_FILE, () => {
    const manifestFile = path.join(JOB_DIR, jobId, "manifest.json");
    if (!fs.existsSync(manifestFile)) throw new Error("test_agent_maintenance_job_missing");
    const manifest = readJson(manifestFile);
    if (manifest.status === "rolled_back") return { success: true, jobId, status: "rolled_back", idempotent: true, contentStored: false };
    for (const row of manifest.backups || []) fs.copyFileSync(row.backup, row.source);
    const originalTask = readJson(manifest.taskBackup);
    const tasks = loadTasks();
    const index = tasks.findIndex((task: any) => String(task?.id || "") === String(originalTask?.id || ""));
    if (index >= 0) tasks[index] = originalTask; else tasks.push(originalTask);
    saveTasks(tasks);
    const next = { ...manifest, status: "rolled_back", rollbackReason: reason, rollbackActor: clean(input?.actor || "memory-center-admin"), rolledBackAt: new Date().toISOString() };
    writeJsonAtomic(manifestFile, next);
    return { success: true, jobId, status: "rolled_back", restoredRecords: (manifest.backups || []).length + 1, contentStored: false };
  });
}

