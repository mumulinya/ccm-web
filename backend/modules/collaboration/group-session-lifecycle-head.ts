import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import { CCM_DIR } from "../../core/utils";

export const GROUP_SESSION_LIFECYCLE_HEAD_SCHEMA = "ccm-group-session-lifecycle-head-v1";
export const GROUP_SESSION_LIFECYCLE_HEAD_DIR = path.join(CCM_DIR, "group-session-lifecycle-heads");

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

function lifecycleHeadChecksum(head: any) {
  const payload = { ...(head || {}) };
  delete payload.head_checksum;
  delete payload.checksum_valid;
  delete payload.file;
  return checksum(payload);
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
  for (const candidate of [file, `${file}.bak`]) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const head = JSON.parse(fs.readFileSync(candidate, "utf-8"));
      const verification = verifyGroupSessionLifecycleHead(head, { groupId, groupSessionId });
      if (verification.valid) return { ...head, checksum_valid: true, file, recovered_from_backup: candidate !== file };
    } catch {}
  }
  return null;
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
    writeJsonAtomic(file, head);
    return { committed: true, idempotent: false, head: { ...head, checksum_valid: true, file }, file };
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
    if (previous?.status === status) return { committed: false, idempotent: true, head: previous, file };
    if (previous?.status === "deleted" && status !== "deleted") throw new Error("deleted group session lifecycle tombstone cannot be reactivated");
    const head = buildLifecycleHead(groupId, groupSessionId, status, previous, input);
    writeJsonAtomic(file, head);
    return { committed: true, idempotent: false, head: { ...head, checksum_valid: true, file }, file };
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
