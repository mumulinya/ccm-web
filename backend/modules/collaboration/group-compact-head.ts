import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import { CCM_DIR } from "../../core/utils";
import { verifyGroupCompactTransactionReceipt } from "./group-memory-compaction";

export const GROUP_COMPACT_HEAD_SCHEMA = "ccm-group-compact-head-v1";
export const GROUP_COMPACT_HEAD_DIR = path.join(CCM_DIR, "group-compact-heads");

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

export function getGroupCompactHeadFile(groupId: string, groupSessionId: string) {
  return path.join(GROUP_COMPACT_HEAD_DIR, `${clean(groupId)}--${clean(groupSessionId)}.json`);
}

function headChecksum(head: any) {
  const payload = { ...(head || {}) };
  delete payload.head_checksum;
  delete payload.checksum_valid;
  delete payload.file;
  return checksum(payload);
}

export function verifyGroupCompactHead(head: any, expected: any = {}) {
  const issues: string[] = [];
  if (head?.schema !== GROUP_COMPACT_HEAD_SCHEMA || Number(head?.version || 0) !== 1) issues.push("compact_head_schema_invalid");
  if (!String(head?.group_id || "")) issues.push("compact_head_group_missing");
  if (!String(head?.group_session_id || "").startsWith("gcs_")) issues.push("compact_head_group_session_invalid");
  if (!String(head?.boundary_id || "")) issues.push("compact_head_boundary_missing");
  if (!String(head?.compact_epoch || "").startsWith("cmp_")) issues.push("compact_head_epoch_invalid");
  if (!String(head?.compact_transaction_receipt_checksum || "")) issues.push("compact_head_receipt_missing");
  if (Number(head?.generation || 0) < 1) issues.push("compact_head_generation_invalid");
  if (String(head?.head_checksum || "") !== headChecksum(head)) issues.push("compact_head_checksum_invalid");
  if (expected.groupId && String(head?.group_id || "") !== String(expected.groupId)) issues.push("compact_head_group_mismatch");
  if (expected.groupSessionId && String(head?.group_session_id || "") !== String(expected.groupSessionId)) issues.push("compact_head_group_session_mismatch");
  return { valid: issues.length === 0, issues };
}

export function readGroupCompactHead(groupId: string, groupSessionId: string) {
  const file = getGroupCompactHeadFile(groupId, groupSessionId);
  for (const candidate of [file, `${file}.bak`]) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const head = JSON.parse(fs.readFileSync(candidate, "utf-8"));
      const verification = verifyGroupCompactHead(head, { groupId, groupSessionId });
      if (verification.valid) return { ...head, checksum_valid: true, file, recovered_from_backup: candidate !== file };
    } catch {}
  }
  return null;
}

export function commitGroupCompactHead(input: any = {}) {
  const receipt = input.compactTransactionReceipt || input.compact_transaction_receipt || input.receipt || {};
  const groupId = String(input.groupId || input.group_id || receipt.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || receipt.group_session_id || "").trim();
  if (!groupId || !groupSessionId.startsWith("gcs_")) throw new Error("compact head requires groupId + gcs_* identity");
  if (String(receipt.group_id || "") !== groupId || String(receipt.group_session_id || "") !== groupSessionId) throw new Error("compact head receipt identity mismatch");
  const receiptChecksum = String(receipt.receipt_checksum || "").trim();
  const compactEpoch = String(receipt.compact_epoch || "").trim();
  const boundaryId = String(receipt.boundary_id || "").trim();
  if (!receiptChecksum || !compactEpoch.startsWith("cmp_") || !boundaryId) throw new Error("compact head receipt is incomplete");
  const file = getGroupCompactHeadFile(groupId, groupSessionId);
  const receiptVerification = verifyGroupCompactTransactionReceipt(receipt, { groupId, groupSessionId, boundaryId, compactEpoch });
  if (!receiptVerification.valid) throw new Error(`compact head receipt invalid: ${receiptVerification.issues.join(",")}`);
  return withFileLock(file, () => {
    const previous = readGroupCompactHead(groupId, groupSessionId);
    if (previous?.compact_transaction_receipt_checksum === receiptChecksum) return { committed: false, idempotent: true, head: previous, file: previous.file };
    const generation = Number(previous?.generation || 0) + 1;
    const committedAt = String(input.committedAt || input.committed_at || receipt.committed_at || new Date().toISOString());
    const payload: any = {
      schema: GROUP_COMPACT_HEAD_SCHEMA,
      version: 1,
      head_id: `gch_${checksum([groupId, groupSessionId, generation, receiptChecksum], 24)}`,
      group_id: groupId,
      group_session_id: groupSessionId,
      generation,
      boundary_id: boundaryId,
      compact_epoch: compactEpoch,
      compact_transaction_receipt_id: String(receipt.receipt_id || ""),
      compact_transaction_receipt_checksum: receiptChecksum,
      summary_checksum: String(receipt.summary_checksum || ""),
      previous_head_checksum: String(previous?.head_checksum || ""),
      committed_at: committedAt,
    };
    const head = { ...payload, head_checksum: headChecksum(payload) };
    writeJsonAtomic(file, head);
    return { committed: true, idempotent: false, head: { ...head, checksum_valid: true, file }, file };
  });
}

export function validateGroupCompactHeadBinding(input: any = {}) {
  const groupId = String(input.groupId || input.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
  const compactEpoch = String(input.compactEpoch || input.compact_epoch || "precompact").trim() || "precompact";
  const receiptChecksum = String(input.compactTransactionReceiptChecksum || input.compact_transaction_receipt_checksum || "").trim();
  const boundaryId = String(input.compactTransactionBoundaryId || input.compact_transaction_boundary_id || "").trim();
  const generation = Math.max(0, Number(input.compactHeadGeneration || input.compact_head_generation || 0));
  const headId = String(input.compactHeadId || input.compact_head_id || "").trim();
  const headChecksumValue = String(input.compactHeadChecksum || input.compact_head_checksum || "").trim();
  const head = readGroupCompactHead(groupId, groupSessionId);
  const issues: string[] = [];
  if (!head) {
    if (compactEpoch !== "precompact" || receiptChecksum || boundaryId || generation > 0 || headId || headChecksumValue) issues.push("compact_head_missing_for_postcompact_context");
  } else {
    if (compactEpoch !== String(head.compact_epoch || "")) issues.push("compact_head_epoch_stale");
    if (receiptChecksum !== String(head.compact_transaction_receipt_checksum || "")) issues.push("compact_head_receipt_stale");
    if (boundaryId !== String(head.boundary_id || "")) issues.push("compact_head_boundary_stale");
    if (generation !== Number(head.generation || 0)) issues.push("compact_head_generation_stale");
    if (headId !== String(head.head_id || "")) issues.push("compact_head_id_stale");
    if (headChecksumValue !== String(head.head_checksum || "")) issues.push("compact_head_checksum_stale");
  }
  return {
    schema: "ccm-group-compact-head-binding-validation-v1",
    valid: issues.length === 0,
    status: issues.length ? "stale" : head ? "current_postcompact" : "current_precompact",
    issues,
    expected: head ? {
      headId: head.head_id,
      generation: Number(head.generation || 0),
      compactEpoch: String(head.compact_epoch || ""),
      boundaryId: String(head.boundary_id || ""),
      compactTransactionReceiptChecksum: String(head.compact_transaction_receipt_checksum || ""),
      headChecksum: String(head.head_checksum || ""),
    } : {
      headId: "",
      generation: 0,
      compactEpoch: "precompact",
      boundaryId: "",
      compactTransactionReceiptChecksum: "",
      headChecksum: "",
    },
  };
}

export function deleteGroupCompactHead(groupId: string, groupSessionId: string) {
  const file = getGroupCompactHeadFile(groupId, groupSessionId);
  return withFileLock(file, () => {
    let deleted = 0;
    for (const candidate of [file, `${file}.bak`]) {
      try { if (fs.existsSync(candidate)) { fs.unlinkSync(candidate); deleted += 1; } } catch {}
    }
    return { deleted, groupId, groupSessionId, file };
  });
}
