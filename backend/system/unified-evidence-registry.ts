import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawnSync } from "child_process";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../core/atomic-json-file";

/**
 * Shared, content-free evidence registry.
 *
 * The registry deliberately stores facts about an observation rather than the
 * command output or prompt that produced it.  Full output remains in the
 * current execution loop and is projected to this shape before persistence.
 */
export const EVIDENCE_SCHEMA = "ccm-evidence-registry-v1" as const;
export const EVIDENCE_STORE_FILE = path.join(
  process.env.CCM_EVIDENCE_STORE_DIR || path.join(os.homedir(), ".cc-connect"),
  "evidence-registry.json",
);

export type EvidenceType = "command" | "diff" | "test" | "review" | "artifact" | "source";
export type EvidenceStatus = "valid" | "stale" | "invalid" | "unknown";

export type RepoStateIdentity = {
  realWorkDir: string;
  worktree: string;
  gitHead: string;
  gitTreeHash: string;
  gitStatusHash: string;
  dirtyPatchHash: string;
  declaredFileHash: string;
};

export type EvidenceRecord = {
  schema: typeof EVIDENCE_SCHEMA;
  evidenceId: string;
  evidenceType: EvidenceType;
  taskId: string;
  workItemId: string;
  scope: string;
  scopeId: string;
  exactSessionId: string;
  generation: number;
  attempt: number;
  leaseId: string;
  repoStateIdentity: RepoStateIdentity | null;
  producerAgentId: string;
  operationFingerprint: string;
  status: EvidenceStatus;
  subject: string;
  references: string[];
  summary: string;
  tokenCount: number;
  createdAt: string;
  expiresAt: string;
  sourceChecksum: string;
  contentStored: false;
};

type RegistryFile = { schema: typeof EVIDENCE_SCHEMA; revision: number; records: EvidenceRecord[] };

function text(value: any, max = 500) {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/(api[_-]?key|token|password|secret|authorization)\s*[:=]\s*[^\s,;]+/ig, "$1=[redacted]").trim().slice(0, max);
}

function list(value: any, maxItems = 40, maxLength = 300) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return [...new Set(values.map(item => text(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function hash(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

function runGit(worktree: string, args: string[]) {
  try {
    const result = spawnSync("git", ["-C", worktree, ...args], { encoding: "utf8", windowsHide: true, timeout: 15_000 });
    if (result.status !== 0) return "";
    return String(result.stdout || "").trim();
  } catch {
    return "";
  }
}

function fileHash(realWorkDir: string, declaredFiles: string[]) {
  const rows = declaredFiles.map(file => {
    const absolute = path.resolve(realWorkDir, file);
    try {
      const stat = fs.statSync(absolute);
      return { file: path.relative(realWorkDir, absolute).replace(/\\/g, "/"), size: stat.size, mtimeMs: stat.mtimeMs, hash: hash(fs.readFileSync(absolute)) };
    } catch {
      return { file: path.relative(realWorkDir, absolute).replace(/\\/g, "/"), missing: true };
    }
  });
  return hash(rows.sort((a, b) => a.file.localeCompare(b.file)));
}

export function captureRepoStateIdentity(workDir: string, declaredFiles: string[] = []): RepoStateIdentity {
  const resolved = path.resolve(String(workDir || process.cwd()));
  let realWorkDir = resolved;
  try { realWorkDir = fs.realpathSync(resolved); } catch {}
  const status = runGit(realWorkDir, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const dirtyPatch = runGit(realWorkDir, ["diff", "--binary", "--no-ext-diff"]);
  return {
    realWorkDir,
    worktree: realWorkDir,
    gitHead: runGit(realWorkDir, ["rev-parse", "HEAD"]),
    gitTreeHash: runGit(realWorkDir, ["rev-parse", "HEAD^{tree}"]),
    gitStatusHash: hash(status),
    dirtyPatchHash: hash(dirtyPatch),
    declaredFileHash: fileHash(realWorkDir, list(declaredFiles, 200, 500)),
  };
}

export function repoStateFingerprint(identity: RepoStateIdentity | null | undefined) {
  return hash(identity || null);
}

export function compareRepoStateIdentity(expected: RepoStateIdentity | null | undefined, current: RepoStateIdentity | null | undefined): EvidenceStatus {
  if (!expected || !current) return "unknown";
  return repoStateFingerprint(expected) === repoStateFingerprint(current) ? "valid" : "stale";
}

function readRegistry(): RegistryFile {
  const fallback: RegistryFile = { schema: EVIDENCE_SCHEMA, revision: 0, records: [] };
  const value = readJsonWithBackup<any>(EVIDENCE_STORE_FILE, fallback);
  return {
    schema: EVIDENCE_SCHEMA,
    revision: Number(value?.revision || 0),
    records: Array.isArray(value?.records) ? value.records : [],
  };
}

function evidenceIdentity(input: any) {
  return hash({
    taskId: text(input?.taskId || input?.task_id, 160),
    workItemId: text(input?.workItemId || input?.work_item_id, 160),
    generation: Number(input?.generation || 0),
    attempt: Number(input?.attempt || 1),
    operationFingerprint: text(input?.operationFingerprint || input?.operation_fingerprint, 160),
    sourceChecksum: text(input?.sourceChecksum || input?.source_checksum, 160),
    subject: text(input?.subject || input?.command || input?.name, 300),
  });
}

export function normalizeEvidence(input: any): EvidenceRecord {
  const now = new Date().toISOString();
  const identity = input?.repoStateIdentity || input?.repo_state_identity || null;
  const record: EvidenceRecord = {
    schema: EVIDENCE_SCHEMA,
    evidenceId: text(input?.evidenceId || input?.evidence_id, 160) || `ev_${evidenceIdentity(input).slice(0, 24)}`,
    evidenceType: (text(input?.evidenceType || input?.evidence_type, 40) || "command") as EvidenceType,
    taskId: text(input?.taskId || input?.task_id, 160),
    workItemId: text(input?.workItemId || input?.work_item_id, 160),
    scope: text(input?.scope, 40),
    scopeId: text(input?.scopeId || input?.scope_id, 160),
    exactSessionId: text(input?.exactSessionId || input?.exact_session_id, 200),
    generation: Number(input?.generation || 0),
    attempt: Math.max(1, Number(input?.attempt || 1)),
    leaseId: text(input?.leaseId || input?.lease_id, 160),
    repoStateIdentity: identity && typeof identity === "object" ? {
      realWorkDir: text(identity.realWorkDir || identity.real_work_dir, 1000),
      worktree: text(identity.worktree, 1000),
      gitHead: text(identity.gitHead || identity.git_head, 160),
      gitTreeHash: text(identity.gitTreeHash || identity.git_tree_hash, 160),
      gitStatusHash: text(identity.gitStatusHash || identity.git_status_hash, 160),
      dirtyPatchHash: text(identity.dirtyPatchHash || identity.dirty_patch_hash, 160),
      declaredFileHash: text(identity.declaredFileHash || identity.declared_file_hash, 160),
    } : null,
    producerAgentId: text(input?.producerAgentId || input?.producer_agent_id || input?.agent, 200),
    operationFingerprint: text(input?.operationFingerprint || input?.operation_fingerprint, 160),
    status: (text(input?.status, 20) || "unknown") as EvidenceStatus,
    subject: text(input?.subject || input?.command || input?.name, 300),
    references: list(input?.references || input?.refs || input?.filesChanged || input?.files_changed, 40, 500),
    // Never persist a raw tool result. Callers must provide a short, already
    // projected summary or a status/detail string.
    summary: text(input?.summary || input?.detail || input?.status, 800),
    tokenCount: Math.max(0, Number(input?.tokenCount || input?.token_count || 0)),
    createdAt: text(input?.createdAt || input?.created_at, 40) || now,
    expiresAt: text(input?.expiresAt || input?.expires_at, 40),
    sourceChecksum: text(input?.sourceChecksum || input?.source_checksum, 160) || hash({ subject: input?.subject, references: input?.references }),
    contentStored: false,
  };
  if (!["command", "diff", "test", "review", "artifact", "source"].includes(record.evidenceType)) record.evidenceType = "command";
  if (!["valid", "stale", "invalid", "unknown"].includes(record.status)) record.status = "unknown";
  if (!record.repoStateIdentity && record.status === "valid" && ["command", "diff", "test", "review", "artifact"].includes(record.evidenceType)) record.status = "unknown";
  return record;
}

export function recordEvidence(input: any): EvidenceRecord {
  const record = normalizeEvidence(input);
  withFileLock(EVIDENCE_STORE_FILE, () => {
    const registry = readRegistry();
    const existingIndex = registry.records.findIndex(item => item.evidenceId === record.evidenceId || (
      item.taskId === record.taskId && item.workItemId === record.workItemId && evidenceIdentity(item) === evidenceIdentity(record)
    ));
    if (existingIndex >= 0) registry.records[existingIndex] = { ...registry.records[existingIndex], ...record };
    else registry.records.push(record);
    registry.records = registry.records.slice(-5000);
    registry.revision += 1;
    writeJsonAtomic(EVIDENCE_STORE_FILE, registry);
  });
  return record;
}

export function listEvidence(filter: any = {}): EvidenceRecord[] {
  const records = readRegistry().records;
  return records.filter(item => {
    for (const [key, value] of Object.entries(filter || {})) {
      if (value === undefined || value === null || value === "") continue;
      const normalizedKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if ((item as any)[normalizedKey] !== value) return false;
    }
    return true;
  });
}

export function refreshEvidence(record: EvidenceRecord, current: RepoStateIdentity | null): EvidenceRecord {
  return { ...record, status: compareRepoStateIdentity(record.repoStateIdentity, current) };
}

export function refreshEvidenceForTask(task: any, current: RepoStateIdentity | null, options: { strict?: boolean } = {}) {
  const records = listEvidence({ taskId: task?.id });
  return records.map(item => {
    const refreshed = refreshEvidence(item, current);
    if (refreshed.status === "unknown" && options.strict) refreshed.status = "stale";
    return refreshed;
  });
}

export function buildAcceptanceEvaluation(criteria: any[], evidence: EvidenceRecord[]) {
  const rows = (Array.isArray(criteria) ? criteria : []).map((criterion: any, index: number) => {
    const id = text(criterion?.criterionId || criterion?.criterion_id || criterion?.id, 160) || `AC-${index + 1}`;
    const required = list(criterion?.requiredEvidenceTypes || criterion?.required_evidence_types, 12, 40);
    const matches = evidence.filter(item => item.status === "valid" && (!required.length || required.includes(item.evidenceType)));
    const satisfied = criterion?.status === "satisfied" || criterion?.satisfied === true || matches.length > 0;
    return { criterionId: id, description: text(criterion?.description || criterion?.criterion, 500), requiredEvidenceTypes: required, status: satisfied ? "satisfied" : "pending", evidenceIds: matches.map(item => item.evidenceId) };
  });
  return { satisfied: rows.length > 0 && rows.every(item => item.status === "satisfied"), criteria: rows, evidenceIds: rows.flatMap(item => item.evidenceIds) };
}

export function runUnifiedEvidenceRegistrySelfTest() {
  const identity = captureRepoStateIdentity(process.cwd(), ["package.json"]);
  const record = normalizeEvidence({ taskId: "t", workItemId: "w", evidenceType: "test", subject: "npm test", repoStateIdentity: identity, status: "valid" });
  const evaluation = buildAcceptanceEvaluation([{ id: "AC-1", requiredEvidenceTypes: ["test"] }], [record]);
  return { pass: record.schema === EVIDENCE_SCHEMA && record.evidenceId && evaluation.satisfied && compareRepoStateIdentity(identity, identity) === "valid", record, evaluation };
}
