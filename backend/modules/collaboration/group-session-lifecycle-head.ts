import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import { CCM_DIR } from "../../core/utils";

export const GROUP_SESSION_LIFECYCLE_HEAD_SCHEMA = "ccm-group-session-lifecycle-head-v1";
export const GROUP_SESSION_LIFECYCLE_HEAD_DIR = path.join(CCM_DIR, "group-session-lifecycle-heads");
export const GROUP_SESSION_LIFECYCLE_JOURNAL_SCHEMA = "ccm-group-session-lifecycle-journal-v1";
export const GROUP_SESSION_LIFECYCLE_COMMIT_SCHEMA = "ccm-group-session-lifecycle-commit-v1";
export const GROUP_SESSION_LIFECYCLE_COMMIT_DIR = path.join(CCM_DIR, "group-session-lifecycle-commits");

type GroupSessionLifecycleStatus = "active" | "archived" | "deleted";

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result: any, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

function checksum(value: any, length = 64) {
  return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex").slice(0, length);
}

function clean(value: any) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 160) || "unknown";
}

export function getGroupSessionLifecycleHeadFile(groupId: string, groupSessionId: string) {
  return path.join(GROUP_SESSION_LIFECYCLE_HEAD_DIR, `${clean(groupId)}--${clean(groupSessionId)}.json`);
}

export function getGroupSessionLifecycleJournalFile(groupId: string, groupSessionId: string) {
  return `${getGroupSessionLifecycleHeadFile(groupId, groupSessionId)}.journal.jsonl`;
}

export function getGroupSessionLifecycleCommittedFile(groupId: string, groupSessionId: string) {
  return `${getGroupSessionLifecycleHeadFile(groupId, groupSessionId)}.committed`;
}

export function getGroupSessionLifecycleCommitFile(groupId: string, groupSessionId: string, generation: number) {
  return path.join(GROUP_SESSION_LIFECYCLE_COMMIT_DIR, `${clean(groupId)}--${clean(groupSessionId)}--${Math.max(1, Number(generation || 1))}.json`);
}

function lifecycleHeadChecksum(head: any) {
  const payload = { ...(head || {}) };
  delete payload.head_checksum;
  delete payload.checksum_valid;
  delete payload.file;
  delete payload.recovered_from_backup;
  delete payload.recovered_from;
  return checksum(payload);
}

function persistedLifecycleHead(head: any) {
  const payload = { ...(head || {}) };
  delete payload.checksum_valid;
  delete payload.file;
  delete payload.recovered_from_backup;
  delete payload.recovered_from;
  return payload;
}

function lifecycleJournalRecordChecksum(record: any) {
  const payload = { ...(record || {}) };
  delete payload.record_checksum;
  return checksum(payload);
}

function lifecycleCommitChecksum(receipt: any) {
  const payload = { ...(receipt || {}) };
  delete payload.commit_checksum;
  return checksum(payload);
}

function buildLifecycleCommitReceipt(record: any) {
  const payload: any = {
    schema: GROUP_SESSION_LIFECYCLE_COMMIT_SCHEMA,
    version: 1,
    group_id: String(record?.group_id || ""),
    group_session_id: String(record?.group_session_id || ""),
    generation: Number(record?.generation || 0),
    status: String(record?.status || ""),
    lifecycle_head_id: String(record?.lifecycle_head_id || ""),
    head_checksum: String(record?.head_checksum || ""),
    journal_record_checksum: String(record?.record_checksum || ""),
    committed_at: String(record?.recorded_at || new Date().toISOString()),
  };
  return { ...payload, commit_checksum: lifecycleCommitChecksum(payload) };
}

function verifyLifecycleCommitReceipt(receipt: any, expected: any = {}) {
  const issues: string[] = [];
  if (receipt?.schema !== GROUP_SESSION_LIFECYCLE_COMMIT_SCHEMA || Number(receipt?.version || 0) !== 1) issues.push("session_lifecycle_commit_schema_invalid");
  if (String(receipt?.group_id || "") !== String(expected.groupId || receipt?.group_id || "")) issues.push("session_lifecycle_commit_group_mismatch");
  if (String(receipt?.group_session_id || "") !== String(expected.groupSessionId || receipt?.group_session_id || "")) issues.push("session_lifecycle_commit_group_session_mismatch");
  if (!String(receipt?.group_session_id || "").startsWith("gcs_")) issues.push("session_lifecycle_commit_group_session_invalid");
  if (Number(receipt?.generation || 0) < 1) issues.push("session_lifecycle_commit_generation_invalid");
  if (!["active", "archived", "deleted"].includes(String(receipt?.status || ""))) issues.push("session_lifecycle_commit_status_invalid");
  if (!String(receipt?.lifecycle_head_id || "") || !String(receipt?.head_checksum || "") || !String(receipt?.journal_record_checksum || "")) issues.push("session_lifecycle_commit_binding_missing");
  if (String(receipt?.commit_checksum || "") !== lifecycleCommitChecksum(receipt)) issues.push("session_lifecycle_commit_checksum_invalid");
  return { valid: issues.length === 0, issues };
}

function writeLifecycleCommitReceipt(record: any) {
  const receipt = buildLifecycleCommitReceipt(record);
  const file = getGroupSessionLifecycleCommitFile(receipt.group_id, receipt.group_session_id, receipt.generation);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    const existing = JSON.parse(fs.readFileSync(file, "utf-8"));
    const verification = verifyLifecycleCommitReceipt(existing, { groupId: receipt.group_id, groupSessionId: receipt.group_session_id });
    if (!verification.valid || String(existing.commit_checksum || "") !== String(receipt.commit_checksum || "")) throw new Error("session lifecycle immutable commit receipt conflict");
    return { committed: false, idempotent: true, receipt: existing, file };
  }
  const fd = fs.openSync(file, "wx", 0o600);
  try {
    fs.writeFileSync(fd, `${JSON.stringify(receipt, null, 2)}\n`, "utf-8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  return { committed: true, idempotent: false, receipt, file };
}

export function readGroupSessionLifecycleCommitChain(groupId: string, groupSessionId: string) {
  const prefix = `${clean(groupId)}--${clean(groupSessionId)}--`;
  if (!fs.existsSync(GROUP_SESSION_LIFECYCLE_COMMIT_DIR)) return { exists: false, valid: false, issues: ["session_lifecycle_commit_chain_missing"], receipts: [], latest: null };
  const files = fs.readdirSync(GROUP_SESSION_LIFECYCLE_COMMIT_DIR)
    .filter(name => name.startsWith(prefix) && name.endsWith(".json"))
    .map(name => path.join(GROUP_SESSION_LIFECYCLE_COMMIT_DIR, name));
  if (!files.length) return { exists: false, valid: false, issues: ["session_lifecycle_commit_chain_missing"], receipts: [], latest: null };
  const issues: string[] = [];
  const receipts: any[] = [];
  for (const file of files) {
    try {
      const receipt = JSON.parse(fs.readFileSync(file, "utf-8"));
      const verification = verifyLifecycleCommitReceipt(receipt, { groupId, groupSessionId });
      if (!verification.valid) { issues.push(...verification.issues.map(issue => `${issue}@${path.basename(file)}`)); continue; }
      if (path.resolve(file) !== path.resolve(getGroupSessionLifecycleCommitFile(groupId, groupSessionId, receipt.generation))) issues.push(`session_lifecycle_commit_filename_mismatch@${path.basename(file)}`);
      receipts.push(receipt);
    } catch {
      issues.push(`session_lifecycle_commit_unreadable@${path.basename(file)}`);
    }
  }
  receipts.sort((a, b) => Number(a.generation || 0) - Number(b.generation || 0));
  for (let index = 1; index < receipts.length; index++) {
    if (Number(receipts[index].generation || 0) !== Number(receipts[index - 1].generation || 0) + 1) issues.push("session_lifecycle_commit_generation_gap");
  }
  return { exists: true, valid: issues.length === 0 && receipts.length > 0, issues, receipts, latest: issues.length ? null : receipts[receipts.length - 1] || null };
}

function verifyLifecycleJournalRecord(record: any, expected: any = {}) {
  const issues: string[] = [];
  if (record?.schema !== GROUP_SESSION_LIFECYCLE_JOURNAL_SCHEMA || Number(record?.version || 0) !== 1) issues.push("session_lifecycle_journal_schema_invalid");
  if (String(record?.group_id || "") !== String(expected.groupId || record?.group_id || "")) issues.push("session_lifecycle_journal_group_mismatch");
  if (String(record?.group_session_id || "") !== String(expected.groupSessionId || record?.group_session_id || "")) issues.push("session_lifecycle_journal_group_session_mismatch");
  if (!String(record?.group_session_id || "").startsWith("gcs_")) issues.push("session_lifecycle_journal_group_session_invalid");
  if (!Number.isFinite(Number(record?.generation)) || Number(record?.generation || 0) < 1) issues.push("session_lifecycle_journal_generation_invalid");
  if (!["active", "archived", "deleted"].includes(String(record?.status || ""))) issues.push("session_lifecycle_journal_status_invalid");
  if (!String(record?.lifecycle_head_id || "")) issues.push("session_lifecycle_journal_head_id_missing");
  if (!String(record?.head_checksum || "")) issues.push("session_lifecycle_journal_head_checksum_missing");
  if (String(record?.record_checksum || "") !== lifecycleJournalRecordChecksum(record)) issues.push("session_lifecycle_journal_checksum_invalid");
  return { valid: issues.length === 0, issues };
}

export function readGroupSessionLifecycleJournal(groupId: string, groupSessionId: string) {
  const file = getGroupSessionLifecycleJournalFile(groupId, groupSessionId);
  if (!fs.existsSync(file)) return { exists: false, valid: false, issues: ["session_lifecycle_journal_missing"], records: [], latest: null, file };
  const issues: string[] = [];
  const records: any[] = [];
  try {
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    let previous: any = null;
    for (let index = 0; index < lines.length; index++) {
      let record: any = null;
      try { record = JSON.parse(lines[index]); }
      catch { issues.push(`session_lifecycle_journal_line_${index + 1}_invalid_json`); break; }
      const verification = verifyLifecycleJournalRecord(record, { groupId, groupSessionId });
      if (!verification.valid) { issues.push(...verification.issues.map(issue => `${issue}@${index + 1}`)); break; }
      if (previous) {
        if (Number(record.generation || 0) !== Number(previous.generation || 0) + 1) issues.push(`session_lifecycle_journal_generation_chain_invalid@${index + 1}`);
        if (String(record.previous_record_checksum || "") !== String(previous.record_checksum || "")) issues.push(`session_lifecycle_journal_record_chain_invalid@${index + 1}`);
        if (String(record.previous_head_checksum || "") !== String(previous.head_checksum || "")) issues.push(`session_lifecycle_journal_head_chain_invalid@${index + 1}`);
      } else if (String(record.previous_record_checksum || "")) {
        issues.push("session_lifecycle_journal_genesis_previous_record_invalid@1");
      }
      if (issues.length) break;
      records.push(record);
      previous = record;
    }
    if (!records.length && !issues.length) issues.push("session_lifecycle_journal_empty");
  } catch {
    issues.push("session_lifecycle_journal_unreadable");
  }
  return { exists: true, valid: issues.length === 0, issues, records, latest: issues.length ? null : records[records.length - 1] || null, file };
}

function appendGroupSessionLifecycleJournal(head: any) {
  const groupId = String(head?.group_id || "");
  const groupSessionId = String(head?.group_session_id || "");
  const journal = readGroupSessionLifecycleJournal(groupId, groupSessionId);
  if (journal.exists && !journal.valid) throw new Error(`session lifecycle journal failed integrity validation: ${journal.issues.join(", ")}`);
  if (journal.latest?.head_checksum === head?.head_checksum) return { committed: false, idempotent: true, record: journal.latest, file: journal.file };
  if (journal.latest) {
    if (Number(head?.generation || 0) !== Number(journal.latest.generation || 0) + 1) throw new Error("session lifecycle journal generation would not advance monotonically");
    if (String(head?.previous_head_checksum || "") !== String(journal.latest.head_checksum || "")) throw new Error("session lifecycle journal head chain mismatch");
  }
  const payload: any = {
    schema: GROUP_SESSION_LIFECYCLE_JOURNAL_SCHEMA,
    version: 1,
    group_id: groupId,
    group_session_id: groupSessionId,
    generation: Number(head?.generation || 0),
    status: String(head?.status || ""),
    lifecycle_head_id: String(head?.lifecycle_head_id || ""),
    head_checksum: String(head?.head_checksum || ""),
    previous_head_checksum: String(head?.previous_head_checksum || ""),
    previous_record_checksum: String(journal.latest?.record_checksum || ""),
    recorded_at: new Date().toISOString(),
  };
  const record = { ...payload, record_checksum: lifecycleJournalRecordChecksum(payload) };
  fs.mkdirSync(path.dirname(journal.file), { recursive: true });
  const fd = fs.openSync(journal.file, "a", 0o600);
  try {
    fs.writeFileSync(fd, `${JSON.stringify(record)}\n`, "utf-8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  return { committed: true, idempotent: false, record, file: journal.file };
}

function writeCommittedLifecycleHead(groupId: string, groupSessionId: string, head: any) {
  writeJsonAtomic(getGroupSessionLifecycleCommittedFile(groupId, groupSessionId), persistedLifecycleHead(head));
}

function commitLifecycleHead(groupId: string, groupSessionId: string, head: any) {
  const file = getGroupSessionLifecycleHeadFile(groupId, groupSessionId);
  const persisted = persistedLifecycleHead(head);
  writeJsonAtomic(file, persisted);
  const journal = appendGroupSessionLifecycleJournal(persisted);
  const receipt = writeLifecycleCommitReceipt(journal.record);
  writeCommittedLifecycleHead(groupId, groupSessionId, persisted);
  return { head: { ...persisted, checksum_valid: true, file }, journal, receipt };
}

export function verifyGroupSessionLifecycleHead(head: any, expected: any = {}) {
  const issues: string[] = [];
  if (head?.schema !== GROUP_SESSION_LIFECYCLE_HEAD_SCHEMA || Number(head?.version || 0) !== 1) issues.push("session_lifecycle_head_schema_invalid");
  if (!String(head?.group_id || "")) issues.push("session_lifecycle_group_missing");
  if (!String(head?.group_session_id || "").startsWith("gcs_")) issues.push("session_lifecycle_group_session_invalid");
  if (!["active", "archived", "deleted"].includes(String(head?.status || ""))) issues.push("session_lifecycle_status_invalid");
  if (Number(head?.generation || 0) < 1) issues.push("session_lifecycle_generation_invalid");
  if (!String(head?.lifecycle_head_id || "")) issues.push("session_lifecycle_head_id_missing");
  if (String(head?.head_checksum || "") !== lifecycleHeadChecksum(head)) issues.push("session_lifecycle_head_checksum_invalid");
  if (expected.groupId && String(head?.group_id || "") !== String(expected.groupId)) issues.push("session_lifecycle_group_mismatch");
  if (expected.groupSessionId && String(head?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("session_lifecycle_group_session_mismatch");
  return { valid: issues.length === 0, issues };
}

export function readGroupSessionLifecycleHead(groupId: string, groupSessionId: string) {
  const file = getGroupSessionLifecycleHeadFile(groupId, groupSessionId);
  const journal = readGroupSessionLifecycleJournal(groupId, groupSessionId);
  const commits = readGroupSessionLifecycleCommitChain(groupId, groupSessionId);
  if (!journal.valid || !journal.latest || !commits.valid || !commits.latest) return null;
  const commitAnchored = Number(commits.latest.generation || 0) === Number(journal.latest.generation || 0)
    && String(commits.latest.status || "") === String(journal.latest.status || "")
    && String(commits.latest.lifecycle_head_id || "") === String(journal.latest.lifecycle_head_id || "")
    && String(commits.latest.head_checksum || "") === String(journal.latest.head_checksum || "")
    && String(commits.latest.journal_record_checksum || "") === String(journal.latest.record_checksum || "");
  if (!commitAnchored) return null;
  const candidates = [
    { file, source: "primary" },
    { file: getGroupSessionLifecycleCommittedFile(groupId, groupSessionId), source: "committed" },
    { file: `${getGroupSessionLifecycleCommittedFile(groupId, groupSessionId)}.bak`, source: "committed_backup" },
    { file: `${file}.bak`, source: "previous_backup" },
  ];
  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate.file)) continue;
      const head = JSON.parse(fs.readFileSync(candidate.file, "utf-8"));
      const verification = verifyGroupSessionLifecycleHead(head, { groupId, groupSessionId });
      const anchored = Number(head?.generation || 0) === Number(journal.latest.generation || 0)
        && String(head?.status || "") === String(journal.latest.status || "")
        && String(head?.lifecycle_head_id || "") === String(journal.latest.lifecycle_head_id || "")
        && String(head?.head_checksum || "") === String(journal.latest.head_checksum || "");
      if (verification.valid && anchored) return {
        ...head,
        checksum_valid: true,
        file,
        recovered_from_backup: candidate.source !== "primary",
        recovered_from: candidate.source,
      };
    } catch {}
  }
  return null;
}

export function bootstrapGroupSessionLifecycleJournals() {
  fs.mkdirSync(GROUP_SESSION_LIFECYCLE_HEAD_DIR, { recursive: true });
  const files = fs.readdirSync(GROUP_SESSION_LIFECYCLE_HEAD_DIR)
    .filter(name => name.endsWith(".json"))
    .map(name => path.join(GROUP_SESSION_LIFECYCLE_HEAD_DIR, name));
  let adopted = 0;
  let current = 0;
  let failed = 0;
  const failures: any[] = [];
  for (const file of files) {
    try {
      const head = JSON.parse(fs.readFileSync(file, "utf-8"));
      const verification = verifyGroupSessionLifecycleHead(head);
      if (!verification.valid) throw new Error(verification.issues.join(", "));
      const journal = readGroupSessionLifecycleJournal(head.group_id, head.group_session_id);
      if (!journal.exists) {
        appendGroupSessionLifecycleJournal(head);
        adopted++;
      } else if (!journal.valid) {
        throw new Error(journal.issues.join(", "));
      } else if (String(journal.latest?.head_checksum || "") !== String(head.head_checksum || "")) {
        throw new Error("primary head does not match committed lifecycle journal");
      } else {
        current++;
      }
      const committedJournal = readGroupSessionLifecycleJournal(head.group_id, head.group_session_id);
      if (!committedJournal.valid) throw new Error(committedJournal.issues.join(", "));
      for (const record of committedJournal.records) writeLifecycleCommitReceipt(record);
      writeCommittedLifecycleHead(head.group_id, head.group_session_id, head);
    } catch (error: any) {
      failed++;
      failures.push({ file, error: error?.message || String(error) });
    }
  }
  return { schema: "ccm-group-session-lifecycle-journal-bootstrap-v1", checked: files.length, adopted, current, failed, failures, bootstrappedAt: new Date().toISOString() };
}

function buildLifecycleHead(groupId: string, groupSessionId: string, status: GroupSessionLifecycleStatus, previous: any, input: any = {}) {
  const generation = Number(previous?.generation || 0) + 1;
  const transitionedAt = String(input.transitionedAt || input.transitioned_at || new Date().toISOString());
  const createdAt = String(previous?.created_at || input.createdAt || input.created_at || transitionedAt);
  const payload: any = {
    schema: GROUP_SESSION_LIFECYCLE_HEAD_SCHEMA,
    version: 1,
    lifecycle_head_id: `gslh_${checksum([groupId, groupSessionId, generation, status, transitionedAt], 24)}`,
    group_id: groupId,
    group_session_id: groupSessionId,
    generation,
    status,
    reason: String(input.reason || ""),
    previous_status: String(previous?.status || ""),
    previous_head_checksum: String(previous?.head_checksum || ""),
    created_at: createdAt,
    transitioned_at: transitionedAt,
  };
  return { ...payload, head_checksum: lifecycleHeadChecksum(payload) };
}

export function ensureGroupSessionLifecycleHead(groupId: string, groupSessionId: string, input: any = {}) {
  const id = String(groupId || "").trim();
  const sessionId = String(groupSessionId || "").trim();
  if (!id || !sessionId.startsWith("gcs_")) throw new Error("session lifecycle head requires groupId + gcs_* identity");
  const file = getGroupSessionLifecycleHeadFile(id, sessionId);
  return withFileLock(file, () => {
    const previous = readGroupSessionLifecycleHead(id, sessionId);
    if (previous) return { committed: false, idempotent: true, head: previous, file };
    if (fs.existsSync(file) || fs.existsSync(`${file}.bak`)) throw new Error("session lifecycle head exists but failed integrity validation");
    const head = buildLifecycleHead(id, sessionId, "active", null, { ...input, reason: input.reason || "session_created_or_adopted" });
    const commit = commitLifecycleHead(id, sessionId, head);
    return { committed: true, idempotent: false, head: commit.head, journal: commit.journal, receipt: commit.receipt, file };
  });
}

export function transitionGroupSessionLifecycleHead(input: any = {}) {
  const groupId = String(input.groupId || input.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
  const status = String(input.status || "").trim() as GroupSessionLifecycleStatus;
  if (!groupId || !groupSessionId.startsWith("gcs_")) throw new Error("session lifecycle transition requires groupId + gcs_* identity");
  if (!["active", "archived", "deleted"].includes(status)) throw new Error(`unsupported session lifecycle status: ${status || "missing"}`);
  const file = getGroupSessionLifecycleHeadFile(groupId, groupSessionId);
  return withFileLock(file, () => {
    const previous = readGroupSessionLifecycleHead(groupId, groupSessionId);
    if (!previous && (fs.existsSync(file) || fs.existsSync(`${file}.bak`))) throw new Error("session lifecycle head exists but failed integrity validation");
    if (previous?.status === status) {
      writeCommittedLifecycleHead(groupId, groupSessionId, previous);
      return { committed: false, idempotent: true, head: previous, file };
    }
    if (previous?.status === "deleted" && status !== "deleted") throw new Error("deleted group session lifecycle tombstone cannot be reactivated");
    const head = buildLifecycleHead(groupId, groupSessionId, status, previous, input);
    const commit = commitLifecycleHead(groupId, groupSessionId, head);
    return { committed: true, idempotent: false, head: commit.head, journal: commit.journal, receipt: commit.receipt, file };
  });
}

export function validateGroupSessionLifecycleBinding(input: any = {}) {
  const groupId = String(input.groupId || input.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
  const generation = Math.max(0, Number(input.lifecycleGeneration || input.lifecycle_generation || 0));
  const lifecycleHeadId = String(input.lifecycleHeadId || input.lifecycle_head_id || "").trim();
  const lifecycleHeadChecksum = String(input.lifecycleHeadChecksum || input.lifecycle_head_checksum || "").trim();
  const lifecycleStatus = String(input.lifecycleStatus || input.lifecycle_status || "active").trim() || "active";
  const head = readGroupSessionLifecycleHead(groupId, groupSessionId);
  const issues: string[] = [];
  if (!head) {
    issues.push("session_lifecycle_head_missing");
  } else {
    if (String(head.status || "") !== "active") issues.push(`session_lifecycle_${String(head.status || "unknown")}`);
    if (lifecycleStatus !== String(head.status || "")) issues.push("session_lifecycle_status_stale");
    if (generation !== Number(head.generation || 0)) issues.push("session_lifecycle_generation_stale");
    if (lifecycleHeadId !== String(head.lifecycle_head_id || "")) issues.push("session_lifecycle_head_id_stale");
    if (lifecycleHeadChecksum !== String(head.head_checksum || "")) issues.push("session_lifecycle_head_checksum_stale");
  }
  return {
    schema: "ccm-group-session-lifecycle-binding-validation-v1",
    valid: issues.length === 0,
    status: issues.length ? String(head?.status || "missing") : "current_active",
    issues,
    expected: head ? {
      lifecycleHeadId: String(head.lifecycle_head_id || ""),
      generation: Number(head.generation || 0),
      status: String(head.status || ""),
      lifecycleHeadChecksum: String(head.head_checksum || ""),
    } : null,
  };
}

export function normalizeGroupSessionLifecycleRuntimeFence(input: any = {}) {
  const source = input.sessionLifecycleFence
    || input.session_lifecycle_fence
    || input.groupSessionMemoryBinding
    || input.group_session_memory_binding
    || input;
  const groupId = String(source.groupId || source.group_id || input.groupId || input.group_id || "").trim();
  const groupSessionId = String(source.groupSessionId || source.group_session_id || input.groupSessionId || input.group_session_id || "").trim();
  const required = source.required === true
    || source.sessionLifecycleFenceRequired === true
    || source.session_lifecycle_fence_required === true
    || groupSessionId.startsWith("gcs_");
  return {
    schema: "ccm-group-session-lifecycle-runtime-fence-v1",
    required,
    groupId,
    groupSessionId,
    lifecycleGeneration: Math.max(0, Number(
      source.lifecycleGeneration
      || source.lifecycle_generation
      || source.sessionLifecycleGeneration
      || source.session_lifecycle_generation
      || 0
    )),
    lifecycleStatus: String(
      source.lifecycleStatus
      || source.lifecycle_status
      || source.sessionLifecycleStatus
      || source.session_lifecycle_status
      || ""
    ).trim(),
    lifecycleHeadId: String(
      source.lifecycleHeadId
      || source.lifecycle_head_id
      || source.sessionLifecycleHeadId
      || source.session_lifecycle_head_id
      || ""
    ).trim(),
    lifecycleHeadChecksum: String(
      source.lifecycleHeadChecksum
      || source.lifecycle_head_checksum
      || source.sessionLifecycleHeadChecksum
      || source.session_lifecycle_head_checksum
      || ""
    ).trim(),
    memoryContextSnapshotId: String(source.memoryContextSnapshotId || source.memory_context_snapshot_id || "").trim(),
    memoryContextSnapshotChecksum: String(source.memoryContextSnapshotChecksum || source.memory_context_snapshot_checksum || "").trim(),
  };
}

export function validateGroupSessionLifecycleRuntimeFence(input: any = {}) {
  const fence = normalizeGroupSessionLifecycleRuntimeFence(input);
  if (!fence.required) {
    return {
      schema: "ccm-group-session-lifecycle-runtime-fence-validation-v1",
      valid: true,
      required: false,
      status: "not_required",
      issues: [] as string[],
      fence,
      expected: null,
    };
  }
  const issues: string[] = [];
  if (!fence.groupId) issues.push("session_lifecycle_runtime_group_missing");
  if (!fence.groupSessionId.startsWith("gcs_")) issues.push("session_lifecycle_runtime_group_session_invalid");
  if (fence.lifecycleGeneration < 1) issues.push("session_lifecycle_runtime_generation_missing");
  if (!fence.lifecycleStatus) issues.push("session_lifecycle_runtime_status_missing");
  if (!fence.lifecycleHeadId) issues.push("session_lifecycle_runtime_head_id_missing");
  if (!fence.lifecycleHeadChecksum) issues.push("session_lifecycle_runtime_head_checksum_missing");
  const bindingValidation = issues.length ? null : validateGroupSessionLifecycleBinding(fence);
  if (bindingValidation && !bindingValidation.valid) issues.push(...bindingValidation.issues);
  return {
    schema: "ccm-group-session-lifecycle-runtime-fence-validation-v1",
    valid: issues.length === 0,
    required: true,
    status: issues.length ? String(bindingValidation?.status || "invalid") : "current_active",
    issues: Array.from(new Set(issues)),
    fence,
    expected: bindingValidation?.expected || null,
  };
}

export function withGroupSessionLifecycleCommitFence<T>(input: any, operation: (state: any) => T): T {
  const fence = normalizeGroupSessionLifecycleRuntimeFence(input);
  if (!fence.required) return operation({ fence, validation: validateGroupSessionLifecycleRuntimeFence(fence), head: null });
  if (!fence.groupId || !fence.groupSessionId.startsWith("gcs_")) {
    const error: any = new Error("group compaction lifecycle commit fence requires groupId + gcs_* identity");
    error.code = "GROUP_COMPACTION_SESSION_LIFECYCLE_STALE";
    error.lifecycleValidation = validateGroupSessionLifecycleRuntimeFence(fence);
    throw error;
  }
  const file = getGroupSessionLifecycleHeadFile(fence.groupId, fence.groupSessionId);
  return withFileLock(file, () => {
    const validation = validateGroupSessionLifecycleRuntimeFence(fence);
    if (!validation.valid) {
      const error: any = new Error(`group compaction session lifecycle fence is stale: ${validation.issues.join(",")}`);
      error.code = "GROUP_COMPACTION_SESSION_LIFECYCLE_STALE";
      error.lifecycleValidation = validation;
      throw error;
    }
    return operation({ fence, validation, head: readGroupSessionLifecycleHead(fence.groupId, fence.groupSessionId) });
  });
}

function groupCompactionLifecycleCommitProofChecksum(proof: any) {
  const payload = { ...(proof || {}) };
  delete payload.proof_checksum;
  delete payload.checksum_valid;
  delete payload.issues;
  return checksum(payload);
}

export function buildGroupCompactionLifecycleCommitProof(input: any = {}) {
  const fence = normalizeGroupSessionLifecycleRuntimeFence(input.fence || input);
  const validation = input.validation || validateGroupSessionLifecycleRuntimeFence(fence);
  if (!validation.valid) throw new Error(`cannot prove stale group compaction lifecycle fence: ${validation.issues.join(",")}`);
  const payload: any = {
    schema: "ccm-group-compaction-session-lifecycle-commit-proof-v1",
    version: 1,
    group_id: fence.groupId,
    group_session_id: fence.groupSessionId,
    lifecycle_generation: fence.lifecycleGeneration,
    lifecycle_status: fence.lifecycleStatus,
    lifecycle_head_id: fence.lifecycleHeadId,
    lifecycle_head_checksum: fence.lifecycleHeadChecksum,
    boundary_id: String(input.boundaryId || input.boundary_id || ""),
    compact_transaction_receipt_checksum: String(input.compactTransactionReceiptChecksum || input.compact_transaction_receipt_checksum || ""),
    validation_status: String(validation.status || "current_active"),
    body_free: true,
    committed_at: String(input.committedAt || input.committed_at || new Date().toISOString()),
  };
  return { ...payload, proof_checksum: groupCompactionLifecycleCommitProofChecksum(payload) };
}

export function verifyGroupCompactionLifecycleCommitProof(proof: any, expected: any = {}) {
  const issues: string[] = [];
  if (proof?.schema !== "ccm-group-compaction-session-lifecycle-commit-proof-v1" || Number(proof?.version || 0) !== 1) issues.push("group_compaction_lifecycle_proof_schema_invalid");
  if (!String(proof?.group_id || "")) issues.push("group_compaction_lifecycle_proof_group_missing");
  if (!String(proof?.group_session_id || "").startsWith("gcs_")) issues.push("group_compaction_lifecycle_proof_session_missing");
  if (Number(proof?.lifecycle_generation || 0) < 1 || String(proof?.lifecycle_status || "") !== "active") issues.push("group_compaction_lifecycle_proof_binding_invalid");
  if (!String(proof?.lifecycle_head_id || "") || !String(proof?.lifecycle_head_checksum || "")) issues.push("group_compaction_lifecycle_proof_head_missing");
  if (!String(proof?.boundary_id || "") || !String(proof?.compact_transaction_receipt_checksum || "")) issues.push("group_compaction_lifecycle_proof_transaction_missing");
  if (proof?.validation_status !== "current_active" || proof?.body_free !== true) issues.push("group_compaction_lifecycle_proof_policy_invalid");
  if (String(proof?.proof_checksum || "") !== groupCompactionLifecycleCommitProofChecksum(proof)) issues.push("group_compaction_lifecycle_proof_checksum_invalid");
  if (expected.groupId && String(proof?.group_id || "") !== String(expected.groupId)) issues.push("group_compaction_lifecycle_proof_group_mismatch");
  if (expected.groupSessionId && String(proof?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("group_compaction_lifecycle_proof_session_mismatch");
  if (expected.boundaryId && String(proof?.boundary_id || "") !== String(expected.boundaryId)) issues.push("group_compaction_lifecycle_proof_boundary_mismatch");
  if (expected.compactTransactionReceiptChecksum && String(proof?.compact_transaction_receipt_checksum || "") !== String(expected.compactTransactionReceiptChecksum)) issues.push("group_compaction_lifecycle_proof_transaction_mismatch");
  return { valid: issues.length === 0, issues };
}
