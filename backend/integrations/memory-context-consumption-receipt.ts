import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  InternalMcpTaskContext,
  signInternalMcpEvidence,
  verifyInternalMcpEvidenceSignature,
} from "./internal-mcp-runtime";

export const MEMORY_CONTEXT_CONSUMPTION_CHALLENGE_SCHEMA = "ccm-memory-context-consumption-challenge-v1";
export const MEMORY_CONTEXT_CONSUMPTION_RECEIPT_SCHEMA = "ccm-memory-context-consumption-receipt-v1";

const RECEIPT_DIR = path.join(os.homedir(), ".cc-connect", "memory-context-consumption-receipts");
const SNAPSHOT_DIR = path.join(os.homedir(), ".cc-connect", "task-agent-memory-context-snapshots");
const DEFAULT_ORPHAN_RETENTION_DAYS = 7;
const DEFAULT_ORPHAN_GRACE_HOURS = 1;
const DEFAULT_MAX_ORPHAN_RECEIPTS = 2_000;

function atomicWrite(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(temp, file);
}

function challengeCore(input: any = {}) {
  return {
    schema: MEMORY_CONTEXT_CONSUMPTION_CHALLENGE_SCHEMA,
    version: 1,
    challenge_id: String(input.challenge_id || input.challengeId || ""),
    group_id: String(input.group_id || input.groupId || ""),
    group_session_id: String(input.group_session_id || input.groupSessionId || ""),
    task_id: String(input.task_id || input.taskId || ""),
    execution_id: String(input.execution_id || input.executionId || ""),
    project: String(input.project || ""),
    task_agent_session_id: String(input.task_agent_session_id || input.taskAgentSessionId || ""),
    attempt: Math.max(1, Number(input.attempt || 1)),
    issued_at: String(input.issued_at || input.issuedAt || ""),
  };
}

export function createMemoryContextConsumptionChallenge(input: any = {}) {
  const issuedAt = String(input.issuedAt || input.issued_at || new Date().toISOString());
  const nonce = crypto.randomBytes(18).toString("base64url");
  const challengeId = `mcrc_${crypto.createHash("sha256").update(JSON.stringify([
    input.groupId || input.group_id || "",
    input.groupSessionId || input.group_session_id || "",
    input.taskId || input.task_id || "",
    input.executionId || input.execution_id || "",
    input.project || "",
    input.taskAgentSessionId || input.task_agent_session_id || "",
    input.attempt || 1,
    nonce,
  ])).digest("hex").slice(0, 28)}`;
  const core = challengeCore({ ...input, challenge_id: challengeId, issued_at: issuedAt });
  return { ...core, challenge_signature: signInternalMcpEvidence(core) };
}

export function verifyMemoryContextConsumptionChallenge(challenge: any, expected: any = {}) {
  const issues: string[] = [];
  const core = challengeCore(challenge);
  if (core.schema !== MEMORY_CONTEXT_CONSUMPTION_CHALLENGE_SCHEMA || core.version !== 1) issues.push("challenge_schema_invalid");
  if (!/^mcrc_[a-f0-9]{28}$/.test(core.challenge_id)) issues.push("challenge_id_invalid");
  if (!verifyInternalMcpEvidenceSignature(core, challenge?.challenge_signature)) issues.push("challenge_signature_invalid");
  for (const [field, aliases] of Object.entries({
    group_id: ["groupId", "group_id"],
    group_session_id: ["groupSessionId", "group_session_id"],
    task_id: ["taskId", "task_id"],
    execution_id: ["executionId", "execution_id"],
    project: ["project"],
    task_agent_session_id: ["taskAgentSessionId", "task_agent_session_id"],
  })) {
    const expectedValue = (aliases as string[]).map(alias => expected?.[alias]).find(value => String(value || "").trim());
    if (expectedValue && String((core as any)[field] || "") !== String(expectedValue)) issues.push(`${field}_mismatch`);
  }
  return { valid: issues.length === 0, issues, challenge: { ...core, challenge_signature: String(challenge?.challenge_signature || "") } };
}

export function memoryContextConsumptionReceiptFile(challengeId: any) {
  const id = String(challengeId || "");
  if (!/^mcrc_[a-f0-9]{28}$/.test(id)) return "";
  return path.join(RECEIPT_DIR, `${id}.json`);
}

export function memoryContextConsumptionReceiptDirectory() {
  return RECEIPT_DIR;
}

function pathIsInside(base: string, file: string) {
  try {
    const resolvedBase = path.resolve(base).toLowerCase();
    const resolvedFile = path.resolve(file).toLowerCase();
    return resolvedFile === resolvedBase || resolvedFile.startsWith(`${resolvedBase}${path.sep}`);
  } catch {
    return false;
  }
}

function listSnapshotFiles(snapshotDir = SNAPSHOT_DIR) {
  const files: string[] = [];
  try {
    if (!fs.existsSync(snapshotDir)) return files;
    for (const sessionEntry of fs.readdirSync(snapshotDir, { withFileTypes: true })) {
      if (!sessionEntry.isDirectory()) continue;
      const sessionDir = path.join(snapshotDir, sessionEntry.name);
      for (const entry of fs.readdirSync(sessionDir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(".json") || entry.name.endsWith(".delivery.json") || entry.name.endsWith(".sync.json")) continue;
        files.push(path.join(sessionDir, entry.name));
      }
    }
  } catch {}
  return files;
}

function collectReceiptReferences(snapshotDir = SNAPSHOT_DIR) {
  const references: any[] = [];
  const unreadableSnapshots: any[] = [];
  for (const snapshotFile of listSnapshotFiles(snapshotDir)) {
    let raw = "";
    let snapshot: any = null;
    try {
      raw = fs.readFileSync(snapshotFile, "utf-8");
      snapshot = JSON.parse(raw);
    } catch (error: any) {
      const recoveredIds = [...new Set((raw.match(/mcrc_[a-f0-9]{28}/g) || []))];
      unreadableSnapshots.push({ snapshotFile, recoveredChallengeIds: recoveredIds, issue: error?.message || String(error) });
      for (const challengeId of recoveredIds) references.push({ challengeId, snapshotFile, unreadable: true });
      continue;
    }
    if (snapshot?.context?.memory_context_consumption_receipt_required !== true) continue;
    const challenge = snapshot?.context?.memory_context_consumption_challenge || null;
    const challengeId = String(challenge?.challenge_id || "");
    references.push({
      challengeId,
      challenge,
      snapshotFile,
      snapshotId: String(snapshot?.snapshot_id || ""),
      groupId: String(snapshot?.session?.group_id || ""),
      groupSessionId: String(snapshot?.context?.group_session_memory_binding?.groupSessionId || challenge?.group_session_id || ""),
      taskId: String(snapshot?.session?.task_id || ""),
      executionId: String(snapshot?.context?.execution_id || ""),
      project: String(snapshot?.session?.project || ""),
      taskAgentSessionId: String(snapshot?.session?.id || ""),
      unreadable: false,
    });
  }
  return { references, unreadableSnapshots };
}

function verifyReceiptFileWithoutChallenge(file: string, expectedId: string) {
  const issues: string[] = [];
  let receipt: any = null;
  try { receipt = JSON.parse(fs.readFileSync(file, "utf-8")); }
  catch { issues.push("receipt_unreadable"); }
  if (receipt) {
    const { receipt_signature: supplied, ...core } = receipt;
    if (receipt.schema !== MEMORY_CONTEXT_CONSUMPTION_RECEIPT_SCHEMA || Number(receipt.version || 0) !== 1) issues.push("receipt_schema_invalid");
    if (!verifyInternalMcpEvidenceSignature(core, supplied)) issues.push("receipt_signature_invalid");
    if (String(receipt.challenge_id || "") !== expectedId) issues.push("receipt_challenge_mismatch");
    if (receipt.state !== "loaded" || receipt.source !== "provider_model_mcp_call") issues.push("receipt_state_invalid");
  }
  return { valid: issues.length === 0, issues, receipt };
}

export function inspectMemoryContextConsumptionReceiptFile(challengeId: any) {
  const id = String(challengeId || "");
  const file = memoryContextConsumptionReceiptFile(id);
  if (!file || !fs.existsSync(file)) return { present: false, valid: false, issues: ["receipt_missing"], receipt: null, file, receiptSignature: "" };
  const verification = verifyReceiptFileWithoutChallenge(file, id);
  return {
    present: true,
    ...verification,
    file,
    receiptSignature: String(verification.receipt?.receipt_signature || ""),
  };
}

export function memoryContextConsumptionChallengeReferenceState(challengeId: string, options: any = {}) {
  const snapshotDir = String(options.snapshotDir || options.snapshot_dir || SNAPSHOT_DIR);
  const collected = collectReceiptReferences(snapshotDir);
  const unrecoverableSnapshots = collected.unreadableSnapshots.filter((row: any) => !row.recoveredChallengeIds.length);
  if (unrecoverableSnapshots.length) return { referenced: true, uncertain: true, referenceCount: 0, unreadableSnapshotCount: collected.unreadableSnapshots.length };
  const matches = collected.references.filter((row: any) => row.challengeId === challengeId);
  return {
    referenced: matches.length > 0,
    uncertain: false,
    referenceCount: matches.length,
    unreadableSnapshotCount: collected.unreadableSnapshots.length,
  };
}

export function removeMemoryContextConsumptionReceiptIfUnreferenced(challengeId: any, options: any = {}) {
  const id = String(challengeId || "");
  const file = memoryContextConsumptionReceiptFile(id);
  const snapshotDir = String(options.snapshotDir || options.snapshot_dir || SNAPSHOT_DIR);
  if (!file || !pathIsInside(RECEIPT_DIR, file)) return { removed: false, reason: "challenge_id_invalid", challengeId: id, file };
  const reference = memoryContextConsumptionChallengeReferenceState(id, { snapshotDir });
  if (reference.referenced) return { removed: false, reason: reference.uncertain ? "snapshot_reference_uncertain" : "snapshot_still_references_receipt", challengeId: id, file };
  try {
    const existed = fs.existsSync(file);
    if (existed) fs.rmSync(file, { force: true });
    return { removed: existed, reason: existed ? "unreferenced_receipt_removed" : "receipt_missing", challengeId: id, file };
  } catch (error: any) {
    return { removed: false, reason: error?.message || String(error), challengeId: id, file };
  }
}

export function reconcileMemoryContextConsumptionReceipts(options: any = {}) {
  const nowMs = Number(options.nowMs || options.now_ms || Date.now());
  const retentionDays = Math.max(1, Number(options.orphanRetentionDays ?? options.orphan_retention_days ?? DEFAULT_ORPHAN_RETENTION_DAYS));
  const graceHours = Math.max(0, Number(options.orphanGraceHours ?? options.orphan_grace_hours ?? DEFAULT_ORPHAN_GRACE_HOURS));
  const maxOrphans = Math.max(0, Number(options.maxOrphanReceipts ?? options.max_orphan_receipts ?? DEFAULT_MAX_ORPHAN_RECEIPTS));
  const prune = options.prune === true;
  const snapshotDir = String(options.snapshotDir || options.snapshot_dir || SNAPSHOT_DIR);
  const scopeFilter = {
    groupId: String(options.groupId || options.group_id || ""),
    groupSessionId: String(options.groupSessionId || options.group_session_id || ""),
    taskAgentSessionId: String(options.taskAgentSessionId || options.task_agent_session_id || options.sessionId || options.session_id || ""),
  };
  const scoped = !!(scopeFilter.groupId || scopeFilter.groupSessionId || scopeFilter.taskAgentSessionId);
  const collected = collectReceiptReferences(snapshotDir);
  const referencesById = new Map<string, any[]>();
  for (const reference of collected.references) {
    const rows = referencesById.get(reference.challengeId) || [];
    rows.push(reference);
    referencesById.set(reference.challengeId, rows);
  }
  const receiptFiles: { id: string; file: string; mtimeMs: number }[] = [];
  const unexpectedFiles: string[] = [];
  try {
    if (fs.existsSync(RECEIPT_DIR)) {
      for (const entry of fs.readdirSync(RECEIPT_DIR, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        const match = /^(mcrc_[a-f0-9]{28})\.json$/.exec(entry.name);
        if (!match) { unexpectedFiles.push(path.join(RECEIPT_DIR, entry.name)); continue; }
        const file = path.join(RECEIPT_DIR, entry.name);
        let mtimeMs = 0;
        try { mtimeMs = fs.statSync(file).mtimeMs; } catch {}
        receiptFiles.push({ id: match[1], file, mtimeMs });
      }
    }
  } catch {}
  const receiptById = new Map(receiptFiles.map(row => [row.id, row]));
  const allReferencedRows: any[] = [];
  for (const [challengeId, references] of referencesById) {
    const readableReferences = references.filter(row => !row.unreadable);
    const receiptFile = receiptById.get(challengeId)?.file || memoryContextConsumptionReceiptFile(challengeId);
    let status = "referenced_missing";
    let issues: string[] = [];
    if (!challengeId || !receiptFile) issues.push("challenge_id_invalid");
    else if (!fs.existsSync(receiptFile)) issues.push("receipt_missing");
    else if (!readableReferences.length) issues.push("snapshot_reference_unreadable");
    else {
      const verifications = readableReferences.map(reference => readMemoryContextConsumptionReceipt(reference.challenge, reference));
      issues = [...new Set(verifications.flatMap(verification => verification.issues || []))];
      status = issues.length ? "referenced_invalid" : "referenced_valid";
    }
    if (issues.length && status === "referenced_missing" && !issues.includes("receipt_missing")) status = "referenced_invalid";
    allReferencedRows.push({
      challengeId,
      status,
      valid: status === "referenced_valid",
      receiptPresent: !!receiptFile && fs.existsSync(receiptFile),
      referenceCount: references.length,
      groupIds: [...new Set(readableReferences.map(row => row.groupId).filter(Boolean))].slice(0, 8),
      groupSessionIds: [...new Set(readableReferences.map(row => row.groupSessionId).filter(Boolean))].slice(0, 8),
      taskAgentSessionIds: [...new Set(readableReferences.map(row => row.taskAgentSessionId).filter(Boolean))].slice(0, 8),
      snapshotIds: [...new Set(readableReferences.map(row => row.snapshotId).filter(Boolean))].slice(0, 8),
      issues,
    });
  }
  const referencedRows = allReferencedRows.filter(row => {
    const references = referencesById.get(row.challengeId) || [];
    return references.some(reference =>
      (!scopeFilter.groupId || reference.groupId === scopeFilter.groupId)
      && (!scopeFilter.groupSessionId || reference.groupSessionId === scopeFilter.groupSessionId)
      && (!scopeFilter.taskAgentSessionId || reference.taskAgentSessionId === scopeFilter.taskAgentSessionId)
    );
  });
  const retentionMs = retentionDays * 86_400_000;
  const graceMs = graceHours * 3_600_000;
  const orphanFiles = receiptFiles.filter(row => !referencesById.has(row.id)).sort((a, b) => b.mtimeMs - a.mtimeMs);
  const allOrphanRows = orphanFiles.map((row, index) => {
    const verification = verifyReceiptFileWithoutChallenge(row.file, row.id);
    const ageMs = Math.max(0, nowMs - row.mtimeMs);
    const stale = ageMs >= retentionMs;
    const overflow = index >= maxOrphans;
    const prunable = ageMs >= graceMs && (stale || overflow);
    return {
      challengeId: row.id,
      status: stale ? "orphan_stale" : overflow ? "orphan_overflow" : "orphan_fresh",
      valid: verification.valid,
      issues: verification.issues,
      ageMs,
      stale,
      overflow,
      prunable,
      file: row.file,
    };
  });
  const orphanRows = scoped ? [] : allOrphanRows;
  const pruningBlocked = collected.unreadableSnapshots.some((row: any) => !row.recoveredChallengeIds.length);
  const pruned: any[] = [];
  const skipped: any[] = [];
  if (prune) {
    for (const row of allOrphanRows.filter(row => row.prunable)) {
      if (pruningBlocked) { skipped.push({ challengeId: row.challengeId, reason: "unreadable_snapshot_blocks_orphan_pruning" }); continue; }
      const result = removeMemoryContextConsumptionReceiptIfUnreferenced(row.challengeId, { snapshotDir });
      if (result.removed) pruned.push({ challengeId: row.challengeId, reason: row.status, file: row.file });
      else skipped.push({ challengeId: row.challengeId, reason: result.reason });
    }
  }
  return {
    schema: "ccm-memory-context-consumption-receipt-lifecycle-v1",
    generatedAt: new Date(nowMs).toISOString(),
    directory: RECEIPT_DIR,
    snapshotDirectory: snapshotDir,
    policy: { orphanRetentionDays: retentionDays, orphanGraceHours: graceHours, maxOrphanReceipts: maxOrphans },
    prune,
    pruningBlocked,
    summary: {
      receiptFileCount: receiptFiles.length,
      referencedChallengeCount: referencedRows.length,
      referencedValidCount: referencedRows.filter(row => row.status === "referenced_valid").length,
      referencedMissingCount: referencedRows.filter(row => row.status === "referenced_missing").length,
      referencedInvalidCount: referencedRows.filter(row => row.status === "referenced_invalid").length,
      orphanCount: orphanRows.length,
      orphanFreshCount: orphanRows.filter(row => row.status === "orphan_fresh").length,
      orphanStaleCount: orphanRows.filter(row => row.status === "orphan_stale").length,
      orphanOverflowCount: orphanRows.filter(row => row.status === "orphan_overflow").length,
      orphanInvalidCount: orphanRows.filter(row => !row.valid).length,
      prunableCount: orphanRows.filter(row => row.prunable).length,
      prunedCount: pruned.length,
      skippedCount: skipped.length,
      unreadableSnapshotCount: collected.unreadableSnapshots.length,
      unexpectedFileCount: unexpectedFiles.length,
    },
    referencedRows: referencedRows.slice(0, 120),
    orphanRows: orphanRows.slice(0, 120),
    unreadableSnapshots: collected.unreadableSnapshots.slice(0, 40),
    unexpectedFiles: unexpectedFiles.slice(0, 40),
    pruned,
    skipped,
  };
}

export function attachMemoryContextConsumptionChallenge(memoryContext: any, challenge: any) {
  if (!memoryContext || !challenge) return memoryContext;
  if (typeof memoryContext === "object" && !Array.isArray(memoryContext)) {
    return { ...memoryContext, memory_consumption_challenge: challenge };
  }
  return {
    schema: "ccm-worker-memory-context-v1",
    group_memory: memoryContext,
    memory_consumption_challenge: challenge,
  };
}

export function recordMemoryContextConsumptionReceipt(context: InternalMcpTaskContext, args: any = {}) {
  const challenge = context.memoryReceiptChallenge || null;
  const verification = verifyMemoryContextConsumptionChallenge(challenge, {
    groupId: context.groupId,
    groupSessionId: context.groupSessionId,
    taskId: context.taskId,
    project: context.project,
    taskAgentSessionId: context.taskAgentSessionId,
  });
  if (!verification.valid) throw new Error(`记忆接收 challenge 无效：${verification.issues.join(",")}`);
  if (String(args.challenge_id || args.challengeId || "") !== String(challenge.challenge_id || "")) throw new Error("记忆接收 challenge id 不匹配");
  const receiptFile = String(context.memoryReceiptFile || "");
  if (!receiptFile || path.basename(receiptFile) !== `${challenge.challenge_id}.json`) throw new Error("记忆接收回执路径未绑定");
  const core = {
    schema: MEMORY_CONTEXT_CONSUMPTION_RECEIPT_SCHEMA,
    version: 1,
    challenge_id: String(challenge.challenge_id || ""),
    challenge_signature: String(challenge.challenge_signature || ""),
    group_id: String(context.groupId || ""),
    group_session_id: String(context.groupSessionId || ""),
    project_session_id: String(context.projectSessionId || ""),
    task_id: String(context.taskId || ""),
    execution_id: String(challenge.execution_id || ""),
    project: String(context.project || ""),
    task_agent_session_id: String(context.taskAgentSessionId || challenge.task_agent_session_id || ""),
    agent_type: String(context.agentType || ""),
    native_session_id: String(context.nativeSessionId || ""),
    memory_snapshot_id: String(context.memorySnapshotId || ""),
    memory_snapshot_checksum: String(context.memorySnapshotChecksum || ""),
    boundary_generation: Number(context.boundaryGeneration || 0),
    native_generation: Number(context.nativeGeneration || 0),
    attempt: Number(challenge.attempt || 1),
    state: "loaded",
    source: "provider_model_mcp_call",
    server: "ccm__knowledge_context",
    tool: "acknowledge_memory_context",
    acknowledged_at: new Date().toISOString(),
  };
  const receipt = { ...core, receipt_signature: signInternalMcpEvidence(core) };
  atomicWrite(receiptFile, receipt);
  return receipt;
}

export function readMemoryContextConsumptionReceipt(challenge: any, expected: any = {}) {
  const challengeVerification = verifyMemoryContextConsumptionChallenge(challenge, expected);
  const issues = [...challengeVerification.issues];
  const file = memoryContextConsumptionReceiptFile(challenge?.challenge_id);
  let receipt: any = null;
  try { receipt = file ? JSON.parse(fs.readFileSync(file, "utf-8")) : null; }
  catch { issues.push("receipt_missing"); }
  if (receipt) {
    const { receipt_signature: supplied, ...core } = receipt;
    if (receipt.schema !== MEMORY_CONTEXT_CONSUMPTION_RECEIPT_SCHEMA || Number(receipt.version || 0) !== 1) issues.push("receipt_schema_invalid");
    if (!verifyInternalMcpEvidenceSignature(core, supplied)) issues.push("receipt_signature_invalid");
    if (String(receipt.challenge_id || "") !== String(challenge?.challenge_id || "")) issues.push("receipt_challenge_mismatch");
    if (String(receipt.challenge_signature || "") !== String(challenge?.challenge_signature || "")) issues.push("receipt_challenge_signature_mismatch");
    if (receipt.state !== "loaded" || receipt.source !== "provider_model_mcp_call") issues.push("receipt_state_invalid");
    for (const [field, aliases] of Object.entries({
      group_id: ["groupId", "group_id"],
      group_session_id: ["groupSessionId", "group_session_id"],
      project_session_id: ["projectSessionId", "project_session_id"],
      task_id: ["taskId", "task_id"],
      execution_id: ["executionId", "execution_id"],
      project: ["project"],
      task_agent_session_id: ["taskAgentSessionId", "task_agent_session_id"],
      memory_snapshot_id: ["memorySnapshotId", "memory_snapshot_id"],
      memory_snapshot_checksum: ["memorySnapshotChecksum", "memory_snapshot_checksum"],
    })) {
      const expectedValue = (aliases as string[]).map(alias => expected?.[alias]).find(value => String(value || "").trim());
      if (expectedValue && String(receipt?.[field] || "") !== String(expectedValue)) issues.push(`receipt_${field}_mismatch`);
    }
  }
  return {
    valid: issues.length === 0,
    issues: [...new Set(issues)],
    file,
    receipt,
    challenge: challengeVerification.challenge,
    receiptSignature: String(receipt?.receipt_signature || ""),
  };
}
