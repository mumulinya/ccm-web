import * as crypto from "crypto";
import * as os from "os";
import * as path from "path";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../core/atomic-json-file";
import { EvidenceRecord } from "./unified-evidence-registry";

export const OPERATION_REGISTRY_SCHEMA = "ccm-operation-registry-v1" as const;
const STORE_FILE = path.join(process.env.CCM_OPERATION_REGISTRY_DIR || path.join(os.homedir(), ".cc-connect"), "operation-registry.json");

export type OperationType = "read" | "query" | "test" | "build" | "lint" | "typecheck" | "diagnostic" | "side_effecting";
export type OperationRecord = {
  schema: typeof OPERATION_REGISTRY_SCHEMA;
  operationId: string;
  operationType: OperationType;
  fingerprint: string;
  normalizedArguments: any;
  scope: string;
  target: string;
  repoStateFingerprint: string;
  toolVersion: string;
  estimatorVersion: string;
  evidenceIds: string[];
  status: "running" | "succeeded" | "failed" | "invalidated";
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

type Store = { schema: typeof OPERATION_REGISTRY_SCHEMA; revision: number; records: OperationRecord[] };

function text(value: any, max = 500) { return String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/(api[_-]?key|token|password|secret|authorization)\s*[:=]\s*[^\s,;]+/ig, "$1=[redacted]").trim().slice(0, max); }
function hash(value: any) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function now() { return new Date().toISOString(); }
function readStore(): Store {
  const fallback: Store = { schema: OPERATION_REGISTRY_SCHEMA, revision: 0, records: [] };
  const value = readJsonWithBackup<any>(STORE_FILE, fallback);
  return { schema: OPERATION_REGISTRY_SCHEMA, revision: Number(value?.revision || 0), records: Array.isArray(value?.records) ? value.records : [] };
}

export function buildOperationFingerprint(input: any) {
  const operationType = text(input?.operationType || input?.operation_type || "read", 40).toLowerCase();
  const normalizedArguments = normalizeArguments(input?.normalizedArguments || input?.normalized_arguments || input?.arguments || {});
  return hash({
    operationType,
    normalizedArguments,
    scope: text(input?.scope, 80),
    target: text(input?.target, 1000),
    repoStateFingerprint: text(input?.repoStateFingerprint || input?.repo_state_fingerprint, 160),
    toolVersion: text(input?.toolVersion || input?.tool_version, 120),
    estimatorVersion: text(input?.estimatorVersion || input?.estimator_version, 120),
  });
}

function normalizeArguments(value: any): any {
  if (Array.isArray(value)) return value.map(normalizeArguments);
  if (!value || typeof value !== "object") return typeof value === "string" ? text(value, 1000) : value;
  const output: any = {};
  for (const key of Object.keys(value).sort()) {
    if (["content", "text", "body", "rawOutput", "context", "prompt", "result"].includes(key)) continue;
    output[key] = normalizeArguments(value[key]);
  }
  return output;
}

export function reserveOperation(input: any): { record: OperationRecord; reused: boolean } {
  const createdAt = now();
  const operationType = text(input?.operationType || input?.operation_type || "read", 40).toLowerCase() as OperationType;
  const fingerprint = text(input?.fingerprint, 160) || buildOperationFingerprint(input);
  const existing = readStore().records.find(item => item.fingerprint === fingerprint && item.status === "succeeded");
  if (existing && operationType !== "side_effecting" && (!existing.expiresAt || Date.parse(existing.expiresAt) >= Date.now())) return { record: existing, reused: true };
  const record: OperationRecord = {
    schema: OPERATION_REGISTRY_SCHEMA,
    operationId: text(input?.operationId || input?.operation_id, 160) || `op_${fingerprint.slice(0, 24)}`,
    operationType,
    fingerprint,
    normalizedArguments: normalizeArguments(input?.normalizedArguments || input?.normalized_arguments || input?.arguments || {}),
    scope: text(input?.scope, 80),
    target: text(input?.target, 1000),
    repoStateFingerprint: text(input?.repoStateFingerprint || input?.repo_state_fingerprint, 160),
    toolVersion: text(input?.toolVersion || input?.tool_version, 120),
    estimatorVersion: text(input?.estimatorVersion || input?.estimator_version, 120),
    evidenceIds: [],
    status: "running",
    createdAt,
    updatedAt: createdAt,
    expiresAt: text(input?.expiresAt || input?.expires_at, 40),
  };
  withFileLock(STORE_FILE, () => {
    const store = readStore();
    const duplicate = store.records.find(item => item.fingerprint === fingerprint && item.status === "running");
    if (!duplicate) store.records.push(record);
    store.revision += 1;
    store.records = store.records.slice(-5000);
    writeJsonAtomic(STORE_FILE, store);
  });
  return { record, reused: false };
}

export function completeOperation(operationId: string, input: { status?: "succeeded" | "failed" | "invalidated"; evidenceIds?: string[] } = {}) {
  let updated: OperationRecord | null = null;
  withFileLock(STORE_FILE, () => {
    const store = readStore();
    const index = store.records.findIndex(item => item.operationId === operationId);
    if (index < 0) return;
    updated = store.records[index] = { ...store.records[index], status: input.status || "succeeded", evidenceIds: Array.from(new Set((input.evidenceIds || []).map(String).filter(Boolean))), updatedAt: now() };
    store.revision += 1;
    writeJsonAtomic(STORE_FILE, store);
  });
  return updated;
}

export function listOperationRecords(filter: { target?: string; operationTypes?: OperationType[]; status?: OperationRecord["status"] } = {}) {
  const types = new Set(filter.operationTypes || []);
  return readStore().records.filter(item => (!filter.target || item.target === filter.target) && (!types.size || types.has(item.operationType)) && (!filter.status || item.status === filter.status)).slice(-500);
}

export function findReusableOperation(input: any): OperationRecord | null {
  const fingerprint = text(input?.fingerprint, 160) || buildOperationFingerprint(input);
  const record = readStore().records.find(item => item.fingerprint === fingerprint && item.status === "succeeded");
  if (!record || record.operationType === "side_effecting") return null;
  if (record.expiresAt && Date.parse(record.expiresAt) < Date.now()) return null;
  return record;
}

export function attachOperationEvidence(operationId: string, evidence: EvidenceRecord | string) {
  const evidenceId = typeof evidence === "string" ? evidence : evidence.evidenceId;
  return completeOperation(operationId, { evidenceIds: [evidenceId], status: "succeeded" });
}

export function runOperationRegistrySelfTest() {
  const input = { operationType: "test", arguments: { command: "npm test", result: "secret output" }, scope: "project", target: "demo", repoStateFingerprint: "abc" };
  const first = reserveOperation(input);
  completeOperation(first.record.operationId);
  const reused = findReusableOperation(input);
  return { pass: !!reused && reused.operationId === first.record.operationId && !JSON.stringify(reused).includes("secret output"), first, reused };
}
