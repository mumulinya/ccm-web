import * as crypto from "crypto";
import * as os from "os";
import * as path from "path";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../core/atomic-json-file";

export const FAILURE_RECORD_SCHEMA = "ccm-failure-record-v1" as const;
const STORE_FILE = path.join(process.env.CCM_FAILURE_RECORD_DIR || path.join(os.homedir(), ".cc-connect"), "failure-records.json");

export type FailureType = "execution_failure" | "verification_failure" | "plan_failure" | "environment_failure" | "resource_failure" | "authorization_failure" | "repeated_failure";
export type FailureRecord = {
  schema: typeof FAILURE_RECORD_SCHEMA;
  failureId: string;
  taskId: string;
  workItemId: string;
  criterionIds: string[];
  failureType: FailureType;
  repairScope: { allowedFiles: string[]; forbiddenFiles: string[]; unresolvedCriteria: string[] };
  observedEvidenceIds: string[];
  recommendedAction: string;
  attempt: number;
  fingerprint: string;
  status: "open" | "repaired" | "escalated" | "ignored";
  createdAt: string;
  updatedAt: string;
};

type Store = { schema: typeof FAILURE_RECORD_SCHEMA; revision: number; records: FailureRecord[] };
function text(value: any, max = 500) { return String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/(api[_-]?key|token|password|secret|authorization)\s*[:=]\s*[^\s,;]+/ig, "$1=[redacted]").trim().slice(0, max); }
function list(value: any, max = 40) { return [...new Set((Array.isArray(value) ? value : value == null ? [] : [value]).map(item => text(item, 500)).filter(Boolean))].slice(0, max); }
function hash(value: any) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function now() { return new Date().toISOString(); }
function readStore(): Store {
  const fallback: Store = { schema: FAILURE_RECORD_SCHEMA, revision: 0, records: [] };
  const value = readJsonWithBackup<any>(STORE_FILE, fallback);
  return { schema: FAILURE_RECORD_SCHEMA, revision: Number(value?.revision || 0), records: Array.isArray(value?.records) ? value.records : [] };
}

export function classifyFailure(input: any): FailureType {
  if (input?.failureType || input?.failure_type) return String(input.failureType || input.failure_type) as FailureType;
  const textValue = `${input?.status || ""} ${input?.reason || ""} ${input?.error || ""} ${input?.route || ""}`.toLowerCase();
  if (/auth|permission|credential|forbidden|unauthor/.test(textValue)) return "authorization_failure";
  if (/timeout|environment|network|provider|service|missing credential/.test(textValue)) return "environment_failure";
  if (/plan|dependency|scope|replan/.test(textValue)) return "plan_failure";
  if (/resource|capacity|concurr|budget|quota/.test(textValue)) return "resource_failure";
  if (/verify|test|accept|review|evidence|assert/.test(textValue)) return "verification_failure";
  return "execution_failure";
}

export function normalizeFailureRecord(input: any): FailureRecord {
  const createdAt = text(input?.createdAt || input?.created_at, 40) || now();
  const criterionIds = list(input?.criterionIds || input?.criterion_ids || input?.unresolvedCriteria || input?.unresolved_criteria);
  const repairScope = {
    allowedFiles: list(input?.repairScope?.allowedFiles || input?.allowedFiles || input?.allowed_files),
    forbiddenFiles: list(input?.repairScope?.forbiddenFiles || input?.forbiddenFiles || input?.forbidden_files),
    unresolvedCriteria: criterionIds,
  };
  const fingerprint = text(input?.fingerprint, 160) || hash({ taskId: input?.taskId || input?.task_id, workItemId: input?.workItemId || input?.work_item_id, type: classifyFailure(input), criteria: criterionIds, evidence: input?.observedEvidenceIds || input?.observed_evidence_ids });
  return {
    schema: FAILURE_RECORD_SCHEMA,
    failureId: text(input?.failureId || input?.failure_id, 160) || `failure_${fingerprint.slice(0, 24)}`,
    taskId: text(input?.taskId || input?.task_id, 160),
    workItemId: text(input?.workItemId || input?.work_item_id, 160),
    criterionIds,
    failureType: classifyFailure(input),
    repairScope,
    observedEvidenceIds: list(input?.observedEvidenceIds || input?.observed_evidence_ids),
    recommendedAction: text(input?.recommendedAction || input?.recommended_action || input?.nextAction || input?.next_action, 800),
    attempt: Math.max(1, Number(input?.attempt || 1)),
    fingerprint,
    status: ["open", "repaired", "escalated", "ignored"].includes(String(input?.status)) ? input.status : "open",
    createdAt,
    updatedAt: text(input?.updatedAt || input?.updated_at, 40) || createdAt,
  };
}

export function recordFailure(input: any): FailureRecord {
  const record = normalizeFailureRecord(input);
  withFileLock(STORE_FILE, () => {
    const store = readStore();
    const same = store.records.filter(item => item.taskId === record.taskId && item.workItemId === record.workItemId && item.fingerprint === record.fingerprint && item.status === "open");
    if (same.length >= 2 && record.failureType !== "authorization_failure" && record.failureType !== "environment_failure") {
      record.failureType = "repeated_failure";
      record.status = "escalated";
    }
    const index = store.records.findIndex(item => item.failureId === record.failureId);
    if (index >= 0) store.records[index] = { ...store.records[index], ...record, updatedAt: now() };
    else store.records.push(record);
    store.records = store.records.slice(-5000);
    store.revision += 1;
    writeJsonAtomic(STORE_FILE, store);
  });
  return record;
}

export function listFailures(filter: any = {}) {
  return readStore().records.filter(item => Object.entries(filter).every(([key, value]) => value == null || value === "" || (item as any)[key] === value));
}

export function markFailure(failureId: string, status: FailureRecord["status"]) {
  let updated: FailureRecord | null = null;
  withFileLock(STORE_FILE, () => {
    const store = readStore();
    const index = store.records.findIndex(item => item.failureId === failureId);
    if (index < 0) return;
    updated = store.records[index] = { ...store.records[index], status, updatedAt: now() };
    store.revision += 1;
    writeJsonAtomic(STORE_FILE, store);
  });
  return updated;
}

export function runFailureRecordSelfTest() {
  const record = normalizeFailureRecord({ taskId: "t", workItemId: "w", reason: "npm test verification failed", unresolvedCriteria: ["AC-2"] });
  return { pass: record.failureType === "verification_failure" && record.repairScope.unresolvedCriteria.includes("AC-2"), record };
}
