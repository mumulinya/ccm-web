// typed-memory-index-build.ts — merged from 2 part files (behavior-freeze merge).

import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  CCM_DIR,
} from "../../core/utils";
import {
  readJsonWithBackup,
  withFileLock,
  writeJsonAtomic as writeJsonAtomicWithBackup,
} from "../../core/atomic-json-file";
import {
  distillGroupMessagesToTypedMemoryUntilCaughtUp,
  getGroupTypedMemoryDistillationLedgerFile,
  readGroupTypedMemoryDistillationLedger,
  runGroupTypedMemoryDistillationMutation,
} from "./typed-memory-distillation-receipts";
import {
  cleanupGroupTypedMemoryArtifactStage,
  readGroupTypedMemoryStaleCandidateLedger,
} from "./typed-memory-ledgers";
import {
  getGroupTypedMemoryManifestSelectorShapeDir,
  recordGroupTypedMemoryWriteShape,
} from "./typed-memory-shape-trend";
import {
  CLAUDE_MEMORY_INCLUDE_TEXT_EXTENSIONS,
  GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
  GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION,
  GROUP_CLAUDE_MEMORY_INCLUDE_AUDIT_VERSION,
  GROUP_TYPED_MEMORY_ARTIFACT_TRANSACTION_JOURNAL,
  GROUP_TYPED_MEMORY_ARTIFACT_TRANSACTION_STAGE_DIR,
  GROUP_TYPED_MEMORY_DIR,
  GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
  GROUP_TYPED_MEMORY_DISTILLATION_LEDGER,
  GROUP_TYPED_MEMORY_ENTRYPOINT,
  GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_INCLUDE_DEPTH,
  GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION,
  GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_VERSION,
  GROUP_TYPED_MEMORY_VERSION,
  GroupTypedMemoryManifestSelectorExecutor,
  GroupTypedMemoryType,
  applyGroupTypedMemoryArtifactVersion,
  checksum,
  compactText,
  ensureGroupTypedMemoryArtifactReadConsistency,
  ensureGroupTypedMemoryDir,
  evaluateTypedMemoryPathCondition,
  extractTypedMemoryIncludeRefs,
  getGroupTypedMemoryDir,
  groupTypedMemoryArtifactJournalChecksum,
  groupTypedMemoryArtifactStageDir,
  groupTypedMemoryArtifactTarget,
  groupTypedMemoryPriority,
  isExactGroupTypedMemorySessionScope,
  isPathInside,
  listLines,
  listMemoryMarkdownFiles,
  markdownLinkTitle,
  messageContent,
  messageIdentity,
  normalizeFileKey,
  normalizeMemoryType,
  normalizePathGlobs,
  normalizeTargetPath,
  now,
  parseFrontmatter,
  readGroupTypedMemoryArtifactText,
  renderMemoryDocument,
  safeSegment,
  stripIncludePath,
  truncateGroupTypedMemoryEntrypointContent,
  uniqueStrings,
  verifyGroupTypedMemoryArtifactVersion,
  writeGroupTypedMemoryArtifactJournalRaw,
  writeJsonAtomic,
  writeTextAtomic,
  writeTextAtomicRaw,
} from "./typed-memory-shared";

// ===== merged from typed-memory-index-build-part-01.ts =====

// Behavior-freeze module extracted mechanically from the former facade.


export function buildClaudeMemorySettingSourcePolicy(options: any = {}) {
  return require("./group-memory-loading").buildClaudeMemorySettingSourcePolicy(options);
}


export function deriveGroupTypedMemoryTargetPaths(value: any, extra: any[] = []) {
  const text = String(value || "");
  const matched = text.match(/(?:[A-Za-z]:\\[^\s，。；]+|(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+|[\w.-]+\.(?:ts|tsx|js|jsx|vue|java|py|go|rs|md|json|toml|yaml|yml|xml|sql|css|scss|html))/g) || [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...extra, ...matched]) {
    const value = normalizeTargetPath(raw);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= 80) break;
  }
  return result;
}


export function getGroupTypedMemoryIndexFile(groupId: string) {
  return path.join(getGroupTypedMemoryDir(groupId), GROUP_TYPED_MEMORY_ENTRYPOINT);
}


export function getGroupTypedMemoryArtifactTransactionJournalFile(groupId: string) {
  return path.join(getGroupTypedMemoryDir(groupId), GROUP_TYPED_MEMORY_ARTIFACT_TRANSACTION_JOURNAL);
}


export function getGroupTypedMemoryArtifactTransactionStageRoot(groupId: string) {
  return path.join(getGroupTypedMemoryDir(groupId), GROUP_TYPED_MEMORY_ARTIFACT_TRANSACTION_STAGE_DIR);
}


export function inspectGroupTypedMemoryArtifactTransaction(groupId: string) {
  const file = getGroupTypedMemoryArtifactTransactionJournalFile(groupId);
  let journal: any = null;
  try { journal = JSON.parse(fs.readFileSync(file, "utf-8")); } catch {}
  if (!journal) return fs.existsSync(file)
    ? { file, present: true, valid: false, corrupt: true, journal: null }
    : { file, present: false, valid: true, corrupt: false, journal: null };
  const checksumValid = String(journal.journalChecksum || "") === groupTypedMemoryArtifactJournalChecksum(journal);
  const identityValid = journal.schema === "ccm-group-typed-memory-artifact-transaction-v1"
    && Number(journal.version || 0) === 1
    && String(journal.groupId || "") === groupId
    && !!String(journal.leaseId || "")
    && Number(journal.fencingToken || 0) > 0;
  return { file, present: true, valid: checksumValid && identityValid, checksumValid, identityValid, corrupt: false, journal };
}


export function recoverGroupTypedMemoryArtifactTransaction(groupId: string) {
  const inspected = inspectGroupTypedMemoryArtifactTransaction(groupId);
  if (!inspected.present) return { recovered: false, reason: "artifact_journal_absent" };
  if (!inspected.valid) throw new Error("typed_memory_artifact_journal_corrupt");
  const journal = inspected.journal;
  if (["committed", "recovered_rollforward", "recovered_rollback"].includes(String(journal.status || ""))) {
    cleanupGroupTypedMemoryArtifactStage(groupId, String(journal.leaseId || ""));
    return { recovered: false, reason: "artifact_journal_terminal", status: journal.status };
  }
  if (journal.status !== "prepared") throw new Error(`typed_memory_artifact_journal_status_invalid:${journal.status || "missing"}`);
  const artifacts = Array.isArray(journal.artifacts) ? journal.artifacts : [];
  if (artifacts.length !== Number(journal.artifactCount || 0)) throw new Error("typed_memory_artifact_journal_count_mismatch");
  let ledger: any = {};
  try { ledger = JSON.parse(fs.readFileSync(getGroupTypedMemoryDistillationLedgerFile(groupId), "utf-8")); } catch {}
  const ledgerCommit = ledger?.distillationMutation || ledger?.distillationTransaction || {};
  const rollforward = Number(ledgerCommit.fencingToken || 0) === Number(journal.fencingToken || 0)
    && String(ledgerCommit.leaseId || "") === String(journal.leaseId || "");
  const ordered = [...artifacts].sort((a: any, b: any) => Number(a.commitOrder || 0) - Number(b.commitOrder || 0));
  const apply = rollforward ? ordered : [...ordered].reverse();
  for (const artifact of apply) applyGroupTypedMemoryArtifactVersion(groupId, journal, artifact, rollforward ? "after" : "before");
  const verified = artifacts.every((artifact: any) => verifyGroupTypedMemoryArtifactVersion(groupId, artifact, rollforward ? "after" : "before"));
  if (!verified) throw new Error("typed_memory_artifact_recovery_verification_failed");
  const recoveredAt = now();
  const recovered = writeGroupTypedMemoryArtifactJournalRaw(groupId, {
    ...journal,
    status: rollforward ? "recovered_rollforward" : "recovered_rollback",
    recoveredAt,
    recoveryAction: rollforward ? "rollforward_from_committed_ledger_fence" : "rollback_before_uncommitted_ledger_fence",
    stageCleanedAt: recoveredAt,
    updatedAt: recoveredAt,
  });
  cleanupGroupTypedMemoryArtifactStage(groupId, String(journal.leaseId || ""));
  return { recovered: true, action: recovered.recoveryAction, journal: recovered };
}


export function prepareGroupTypedMemoryArtifactTransaction(context: any) {
  const pending = [...(context.pendingArtifacts?.values() || [])];
  if (!pending.length) return null;
  const groupId = String(context.groupId || "");
  const leaseId = String(context.handle?.lock?.leaseId || "");
  const fencingToken = Number(context.handle?.lock?.fencingToken || 0);
  const stageDir = groupTypedMemoryArtifactStageDir(groupId, leaseId);
  fs.mkdirSync(stageDir, { recursive: true });
  const sorted = pending.sort((a: any, b: any) => {
    const rank = (entry: any) => path.basename(entry.file) === GROUP_TYPED_MEMORY_DISTILLATION_LEDGER
      ? 2
      : path.basename(entry.file) === GROUP_TYPED_MEMORY_ENTRYPOINT ? 1 : 0;
    return rank(a) - rank(b) || path.basename(a.file).localeCompare(path.basename(b.file));
  });
  const artifacts = sorted.map((entry: any, index: number) => {
    const target = groupTypedMemoryArtifactTarget(groupId, path.basename(entry.file));
    const beforeExists = fs.existsSync(target);
    const before = beforeExists ? fs.readFileSync(target) : Buffer.alloc(0);
    const after = entry.delete === true ? Buffer.alloc(0) : Buffer.from(String(entry.content || ""), "utf-8");
    const beforeStage = beforeExists ? `before-${String(index).padStart(3, "0")}.bin` : "";
    const afterStage = entry.delete === true ? "" : `after-${String(index).padStart(3, "0")}.bin`;
    if (beforeExists) fs.writeFileSync(path.join(stageDir, beforeStage), before, { flush: true });
    if (entry.delete !== true) fs.writeFileSync(path.join(stageDir, afterStage), after, { flush: true });
    return {
      target: path.basename(target),
      beforeExists,
      beforeChecksum: beforeExists ? checksum(before, 64) : "",
      beforeBytes: before.length,
      beforeStage,
      afterDelete: entry.delete === true,
      afterChecksum: entry.delete === true ? "" : checksum(after, 64),
      afterBytes: after.length,
      afterStage,
      commitOrder: index,
    };
  });
  const preparedAt = now();
  return writeGroupTypedMemoryArtifactJournalRaw(groupId, {
    status: "prepared",
    leaseId,
    fencingToken,
    mutationKind: String(context.mutationKind || "unknown"),
    mutationKinds: uniqueStrings((context.mutationKinds || [context.mutationKind]).map(String), 32),
    artifactCount: artifacts.length,
    artifacts,
    preparedAt,
    committedAt: "",
    recoveredAt: "",
    recoveryAction: "",
    stageCleanedAt: "",
    updatedAt: preparedAt,
  });
}


export function recoverGroupTypedMemoryArtifactTransactionsFleet(options: any = {}) {
  const maxScopes = Math.max(1, Math.min(5000, Number(options.maxScopes || options.max_scopes || 1000)));
  let scopeIds: string[] = [];
  try {
    scopeIds = fs.readdirSync(GROUP_TYPED_MEMORY_DIR, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && /--gcs_[a-zA-Z0-9._-]+$/.test(entry.name))
      .map(entry => entry.name)
      .filter(scopeId => fs.existsSync(getGroupTypedMemoryArtifactTransactionJournalFile(scopeId)))
      .slice(0, maxScopes);
  } catch {}
  const rows: any[] = [];
  for (const groupId of scopeIds) {
    const inspected = inspectGroupTypedMemoryArtifactTransaction(groupId);
    const stagePresent = fs.existsSync(getGroupTypedMemoryArtifactTransactionStageRoot(groupId));
    if (!inspected.valid) {
      rows.push({ groupId, status: "failed", reason: "artifact_journal_corrupt", stagePresent });
      continue;
    }
    if (inspected.journal?.status !== "prepared" && !stagePresent) {
      rows.push({ groupId, status: "current", reason: "terminal_without_stage", stagePresent: false });
      continue;
    }
    try {
      const result: any = runGroupTypedMemoryDistillationMutation(groupId, "artifact_transaction_startup_recovery", {
        transactionMaxWaitMs: Number(options.transactionMaxWaitMs ?? options.transaction_max_wait_ms ?? 0),
      }, () => ({ schema: "ccm-group-typed-memory-artifact-startup-recovery-v1", groupId }));
      const recovery = result.distillationMutation?.artifactRecovery || {};
      rows.push({
        groupId,
        status: recovery.recovered === true ? "recovered" : "cleaned",
        action: String(recovery.action || ""),
        reason: String(recovery.reason || ""),
        fencingToken: Number(result.distillationMutation?.fencingToken || 0),
      });
    } catch (error: any) {
      rows.push({ groupId, status: "failed", reason: String(error?.code || "artifact_recovery_failed"), error: compactText(error?.message || error, 800) });
    }
  }
  return {
    schema: "ccm-group-typed-memory-artifact-startup-recovery-fleet-v1",
    checked: scopeIds.length,
    recovered: rows.filter(row => row.status === "recovered").length,
    cleaned: rows.filter(row => row.status === "cleaned").length,
    current: rows.filter(row => row.status === "current").length,
    failed: rows.filter(row => row.status === "failed").length,
    rollbackCount: rows.filter(row => row.action === "rollback_before_uncommitted_ledger_fence").length,
    rollforwardCount: rows.filter(row => row.action === "rollforward_from_committed_ledger_fence").length,
    rows,
    recoveredAt: now(),
  };
}


export function getGroupClaudeInstructionsLoadedHookLedgerFile(groupId: string) {
  return require("./group-memory-loading").getGroupClaudeInstructionsLoadedHookLedgerFile(groupId);
}


export function registerGroupMemoryInstructionsLoadedHook(hook: (input: any) => any) {
  return require("./group-memory-loading").registerGroupMemoryInstructionsLoadedHook(hook);
}


export function hasGroupMemoryInstructionsLoadedHook() {
  return require("./group-memory-loading").hasGroupMemoryInstructionsLoadedHook();
}


export function loadGroupClaudeInstructionsLoadedHookLedger(groupId: string) {
  return require("./group-memory-loading").loadGroupClaudeInstructionsLoadedHookLedger(groupId);
}


export function writeGroupClaudeInstructionsLoadedHookLedger(groupId: string, ledger: any) {
  const file = getGroupClaudeInstructionsLoadedHookLedgerFile(groupId);
  const value = {
    schema: "ccm-claude-instructions-loaded-hook-ledger-v1",
    version: GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
    groupId,
    entries: (Array.isArray(ledger?.entries) ? ledger.entries : []).slice(-300),
    updatedAt: now(),
  };
  writeJsonAtomic(file, value);
  return { ...value, file };
}


export function executeGroupMemoryInstructionsLoadedHooks(groupId: string, input: any = {}) {
  return require("./group-memory-loading").executeGroupMemoryInstructionsLoadedHooks(groupId, input);
}


export function getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId: string) {
  return require("./group-memory-loading").getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId);
}


export function normalizeExternalIncludeApprovalPath(file: any) {
  const text = String(file || "").trim();
  return text ? path.resolve(text).replace(/\\/g, "/") : "";
}


export function externalIncludeApprovalKey(file: any) {
  return checksum(normalizeExternalIncludeApprovalPath(file), 24);
}


export function loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId: string) {
  return require("./group-memory-loading").loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId);
}


export function writeGroupClaudeMemoryExternalIncludeApprovalLedger(groupId: string, ledger: any) {
  const file = getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId);
  const value = {
    schema: "ccm-claude-memory-external-include-approval-ledger-v1",
    version: GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION,
    groupId,
    hasExternalIncludesApproved: ledger?.hasExternalIncludesApproved === true,
    hasExternalIncludesWarningShown: ledger?.hasExternalIncludesWarningShown === true,
    warningShownAt: String(ledger?.warningShownAt || ""),
    approved: (Array.isArray(ledger?.approved) ? ledger.approved : []).slice(-300),
    warnings: (Array.isArray(ledger?.warnings) ? ledger.warnings : []).slice(-80),
    updatedAt: now(),
  };
  writeJsonAtomic(file, value);
  return { ...value, file };
}


export function approveGroupClaudeMemoryExternalInclude(groupId: string, input: any = {}) {
  return require("./group-memory-loading").approveGroupClaudeMemoryExternalInclude(groupId, input);
}


export function markGroupClaudeMemoryExternalIncludeWarningShown(groupId: string, input: any = {}) {
  return require("./group-memory-loading").markGroupClaudeMemoryExternalIncludeWarningShown(groupId, input);
}


export function upsertGroupTypedMemoryDocument(groupId: string, input: any) {
  const dir = ensureGroupTypedMemoryDir(groupId);
  const type = normalizeMemoryType(input.type);
  const name = markdownLinkTitle(input.name || input.title || type);
  const slug = safeSegment(input.slug || `${type}-${name.toLowerCase()}`, `${type}-memory`);
  const file = path.join(dir, `${slug}.md`);
  const beforeExists = fs.existsSync(file);
  let beforeContent = "";
  if (beforeExists) {
    try { beforeContent = fs.readFileSync(file, "utf-8"); } catch {}
  }
  const content = renderMemoryDocument({ ...input, type, name, groupId });
  const changed = writeTextAtomic(file, content);
  let writeShapeTelemetry: any = null;
  let writeShapeTelemetryError = "";
  if (isExactGroupTypedMemorySessionScope(groupId)) {
    try {
      writeShapeTelemetry = recordGroupTypedMemoryWriteShape(groupId, {
        relPath: `${slug}.md`,
        memoryType: type,
        beforeExists,
        beforeContent,
        afterContent: content,
        changed,
        inputBody: String(input.body || input.content || ""),
        maxBodyChars: Number(input.maxBodyChars || 12_000),
        source: String(input.source || "manual"),
      });
    } catch (error: any) {
      writeShapeTelemetryError = compactText(error?.message || error, 240);
    }
  }
  return { file, changed, slug, type, name, writeShapeTelemetry, writeShapeTelemetryError };
}


export function projectMemoryRelPath(projectRoot: string, file: string) {
  const rel = path.relative(projectRoot, file).replace(/\\/g, "/");
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel) ? rel : path.basename(file);
}


export function executeInstructionsLoadedHooksForImportedClaudeMemory(groupId: string, items: any[] = [], options: any = {}) {
  const executions: any[] = [];
  const baseLoadReason = String(options.instructionsLoadReason || options.instructions_load_reason || options.memoryReloadReason || options.memory_reload_reason || options.loadReason || options.load_reason || "context_bundle");
  for (const item of items || []) {
    const memoryType = item.scope === "user"
      ? "User"
      : item.scope === "managed"
        ? "Managed"
        : item.kind === "local"
          ? "Local"
          : "Project";
    const loadReason = item.includeParentFile ? "include" : baseLoadReason;
    executions.push(executeGroupMemoryInstructionsLoadedHooks(groupId, {
      filePath: item.file,
      memoryType,
      loadReason,
      globs: item.paths || [],
      parentFilePath: item.includeParentFile || "",
      source: item.scope ? `global-claude-memory:${item.scope}` : "project-memory",
      scope: item.scope || "project",
      kind: item.kind || "",
      relPath: item.relPath || "",
    }));
  }
  const configured = executions.some(item => item.configured === true);
  return {
    schema: "ccm-claude-instructions-loaded-hook-import-summary-v1",
    version: GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
    groupId,
    configured,
    eventCount: executions.length,
    hookCount: configured ? executions.reduce((max, item) => Math.max(max, Number(item.hookCount || 0)), 0) : 0,
    firedCount: executions.reduce((sum, item) => sum + Number(item.firedCount || 0), 0),
    failureCount: executions.reduce((sum, item) => sum + Number(item.failureCount || 0), 0),
    ledgerFile: getGroupClaudeInstructionsLoadedHookLedgerFile(groupId),
    executions: executions.slice(-40),
  };
}


export function discoverProjectMemoryFiles(projectRoot: string, options: any = {}) {
  return require("./group-memory-loading").discoverProjectMemoryFiles(projectRoot, options);
}


export function importProjectMemoryFilesToGroupTypedMemory(groupId: string, projectRoot: string, options: any = {}) {
  return require("./group-memory-loading").importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, options);
}


export function defaultManagedClaudeMemoryRoot() {
  if (process.env.CCM_MANAGED_CLAUDE_MEMORY_DIR) return process.env.CCM_MANAGED_CLAUDE_MEMORY_DIR;
  if (process.env.CLAUDE_CODE_MANAGED_SETTINGS_PATH) return process.env.CLAUDE_CODE_MANAGED_SETTINGS_PATH;
  if (process.platform === "win32") return "C:\\Program Files\\ClaudeCode";
  if (process.platform === "darwin") return "/Library/Application Support/ClaudeCode";
  return "/etc/claude-code";
}


export function defaultUserClaudeMemoryRoot() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
}


export function discoverGlobalClaudeMemoryFiles(options: any = {}) {
  return require("./group-memory-loading").discoverGlobalClaudeMemoryFiles(options);
}


export function importGlobalClaudeMemoryToGroupTypedMemory(groupId: string, options: any = {}) {
  return require("./group-memory-loading").importGlobalClaudeMemoryToGroupTypedMemory(groupId, options);
}


export function scanGroupTypedMemoryDocumentsRaw(groupId: string) {
  return listMemoryMarkdownFiles(groupId).map(file => {
    const content = readGroupTypedMemoryArtifactText(file);
    if (content === null) return null;
    const parsed = parseFrontmatter(content);
    let stat: any = null;
    try { stat = fs.statSync(file); } catch {}
    return {
      file,
      relPath: path.basename(file),
      name: parsed.meta.name || path.basename(file, ".md"),
      description: parsed.meta.description || "",
      type: normalizeMemoryType(parsed.meta.type),
      source: parsed.meta.source || "",
      paths: normalizePathGlobs(parsed.meta.paths || parsed.meta.path_globs || parsed.meta.globs || []),
      updatedAt: parsed.meta.updated_at || (stat ? stat.mtime.toISOString() : now()),
      checksum: parsed.meta.checksum || checksum(content, 24),
      body: parsed.body,
      mtimeMs: Number(stat?.mtimeMs || Date.now()),
      bytes: Buffer.byteLength(content, "utf-8"),
    };
  }).filter(Boolean).sort((a: any, b: any) => String(a.type).localeCompare(String(b.type)) || String(a.name).localeCompare(String(b.name)));
}


export function scanGroupTypedMemoryDocuments(groupId: string) {
  ensureGroupTypedMemoryArtifactReadConsistency(groupId);
  const docs = scanGroupTypedMemoryDocumentsRaw(groupId);
  const ledger = readGroupTypedMemoryStaleCandidateLedger(groupId);
  if (ledger.ledger_checksum_valid !== true) return [];
  const suppressed = new Set((ledger.resolution_events || [])
    .filter((event: any) => event.status === "applied" && ["update", "remove"].includes(String(event.action || "")))
    .map((event: any) => String(event.rel_path || "").toLowerCase())
    .filter(Boolean));
  return docs.filter(doc => !suppressed.has(String(doc.relPath || "").toLowerCase()));
}


export function buildGroupTypedMemoryIndex(groupId: string) {
  const dir = ensureGroupTypedMemoryDir(groupId);
  const docs = scanGroupTypedMemoryDocuments(groupId);
  const lines = [
    "# MEMORY.md",
    "",
    "CCM group typed memory index. This file is loaded as the stable entrypoint; linked files hold the full typed memories.",
    "",
  ];
  for (const type of ["user", "feedback", "project", "reference"] as GroupTypedMemoryType[]) {
    const subset = docs.filter(doc => doc.type === type);
    if (!subset.length) continue;
    lines.push(`## ${type}`);
    for (const doc of subset) lines.push(`- [${markdownLinkTitle(doc.name)}](${doc.relPath}) - ${compactText(doc.description, 150)}`);
    lines.push("");
  }
  const content = lines.join("\n").trim() + "\n";
  const entrypointProjection = truncateGroupTypedMemoryEntrypointContent(content);
  const file = path.join(dir, GROUP_TYPED_MEMORY_ENTRYPOINT);
  const changed = writeTextAtomic(file, content);
  return {
    file,
    dir,
    docs,
    changed,
    lineCount: content.trim().split("\n").length,
    bytes: Buffer.byteLength(content, "utf-8"),
    entrypointTruncation: {
      ...entrypointProjection,
      content: undefined,
    },
  };
}


export function isClaudeMemoryTextInclude(file: string) {
  const ext = path.extname(String(file || "")).toLowerCase();
  return CLAUDE_MEMORY_INCLUDE_TEXT_EXTENSIONS.has(ext);
}


export function resolveClaudeMemoryIncludePath(baseFile: string, ref: string) {
  const cleaned = stripIncludePath(ref);
  if (!cleaned) return "";
  if (cleaned.startsWith("~/")) return path.resolve(os.homedir(), cleaned.slice(2));
  if (path.isAbsolute(cleaned) || /^[A-Za-z]:[\\/]/.test(cleaned)) return path.resolve(cleaned);
  return path.resolve(path.dirname(baseFile), cleaned);
}


export function neutralizeClaudeMemoryIncludeRefs(content: string) {
  const lines: string[] = [];
  let inFence = false;
  for (const rawLine of String(content || "").split(/\n/)) {
    const line = rawLine.replace(/\r/g, "");
    if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
      inFence = !inFence;
      lines.push(rawLine);
      continue;
    }
    if (inFence || /^\s*<!--/.test(line)) {
      lines.push(rawLine);
      continue;
    }
    lines.push(line.replace(/(^|\s)@((?:[^\s\\]|\\ )+)/g, (_match, lead, ref) => {
      const cleaned = stripIncludePath(ref);
      if (!cleaned || cleaned.startsWith("@") || /^[#%^&*()]+/.test(cleaned)) return `${lead}@${ref}`;
      return `${lead}included:${cleaned}`;
    }));
  }
  return lines.join("\n");
}


export function claudeMemoryIncludeRelPath(file: string, roots: string[] = []) {
  const resolved = path.resolve(file);
  const root = roots.find(item => item && isPathInside(item, resolved));
  if (root) {
    const rel = path.relative(root, resolved).replace(/\\/g, "/");
    return rel || path.basename(resolved);
  }
  return `external/${checksum(resolved, 10)}-${path.basename(resolved)}`;
}


export function buildClaudeMemoryIncludeExpansion(sourceItems: any[] = [], options: any = {}) {
  const maxIncludeDepth = Math.max(1, Math.min(12, Number(options.maxIncludeDepth || options.max_include_depth || GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_INCLUDE_DEPTH)));
  const groupId = String(options.groupId || options.group_id || "");
  const approvalLedger = options.externalIncludeApprovalLedger
    || options.external_include_approval_ledger
    || (groupId ? loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId) : null);
  const approvedIncludeKeys = new Set((Array.isArray(approvalLedger?.approved) ? approvalLedger.approved : []).map((item: any) => String(item.key || "")).filter(Boolean));
  const baseKeys = new Set(sourceItems.map((item: any) => normalizeFileKey(item.file || "")).filter(Boolean));
  const processed = new Set<string>();
  const visiting = new Set<string>();
  const files: any[] = [];
  const issues: any[] = [];
  const graph: any[] = [];
  const pendingExternalIncludes: any[] = [];
  const approvedExternalIncludes: any[] = [];
  const rootsForItem = (item: any) => {
    const roots = [
      ...(Array.isArray(item?.allowedRoots) ? item.allowedRoots : []),
      item?.root,
      item?.projectRoot,
      item?.baseDir,
      ...(Array.isArray(options.allowedRoots) ? options.allowedRoots : []),
    ].filter(Boolean).map((value: any) => path.resolve(String(value)));
    return [...new Set(roots)];
  };
  const canIncludeExternal = (rootItem: any, file: string) => {
    const key = externalIncludeApprovalKey(file);
    const explicitlyAllowed = typeof options.allowExternalForItem === "function"
      ? options.allowExternalForItem(rootItem, file) === true
      : options.allowExternalIncludes === true || options.allow_external_includes === true;
    if (explicitlyAllowed) return { allowed: true, reason: "explicit_option", key };
    if (rootItem?.scope === "user" && options.allowUserExternalIncludes !== false && options.allow_user_external_includes !== false) {
      return { allowed: true, reason: "user_memory_external_allowed", key };
    }
    if (approvalLedger?.hasExternalIncludesApproved === true || approvedIncludeKeys.has(key)) {
      return { allowed: true, reason: "approved_external_include", key };
    }
    return { allowed: false, reason: "requires_approval", key };
  };
  const addIssue = (issue: any) => {
    const entry = {
      type: String(issue.type || "include_issue"),
      ref: String(issue.ref || ""),
      from: String(issue.from || ""),
      parent: String(issue.parent || ""),
      detail: compactText(issue.detail || "", 500),
      approvalRequired: issue.approvalRequired === true,
      approved: issue.approved === true,
      approvalKey: String(issue.approvalKey || ""),
      scope: String(issue.scope || ""),
      kind: String(issue.kind || ""),
    };
    issues.push(entry);
    graph.push({ ...entry, status: "skipped" });
  };
  const visitRefs = (parentItem: any, rootItem: any, depth: number) => {
    const parentFile = String(parentItem.file || "");
    const parentRelPath = String(parentItem.relPath || path.basename(parentFile));
    const refs = extractTypedMemoryIncludeRefs(parentItem.body || "");
    for (const ref of refs) {
      const resolved = resolveClaudeMemoryIncludePath(parentFile, ref);
      if (!resolved) continue;
      const includeDepth = depth + 1;
      const key = normalizeFileKey(resolved);
      const roots = rootsForItem(rootItem);
      const external = !roots.some(root => isPathInside(root, resolved));
      if (includeDepth > maxIncludeDepth) {
        addIssue({ type: "max_include_depth", ref: resolved, from: parentRelPath, parent: parentFile, detail: `include depth exceeded ${maxIncludeDepth}` });
        continue;
      }
      const externalDecision = external ? canIncludeExternal(rootItem, resolved) : { allowed: true, reason: "internal", key: "" };
      if (external && !externalDecision.allowed) {
        const pending = {
          path: normalizeExternalIncludeApprovalPath(resolved),
          parent: parentFile,
          from: parentRelPath,
          scope: String(rootItem.scope || "project"),
          kind: String(rootItem.kind || ""),
          approvalKey: externalDecision.key,
        };
        pendingExternalIncludes.push(pending);
        addIssue({
          type: "external_include_skipped",
          ref: resolved,
          from: parentRelPath,
          parent: parentFile,
          detail: "Claude memory include is outside the approved memory root and requires approval before import",
          approvalRequired: true,
          approvalKey: externalDecision.key,
          scope: pending.scope,
          kind: pending.kind,
        });
        continue;
      }
      if (visiting.has(key)) {
        addIssue({ type: "circular_include", ref: resolved, from: parentRelPath, parent: parentFile, detail: "cycle detected while expanding Claude memory @include" });
        continue;
      }
      if (!fs.existsSync(resolved)) {
        addIssue({ type: "missing_include", ref: resolved, from: parentRelPath, parent: parentFile, detail: "Claude memory @include target does not exist" });
        continue;
      }
      let stat: fs.Stats;
      try { stat = fs.statSync(resolved); } catch (error: any) {
        addIssue({ type: "unreadable_include", ref: resolved, from: parentRelPath, parent: parentFile, detail: error?.message || error });
        continue;
      }
      if (!stat.isFile()) {
        addIssue({ type: "non_file_include_skipped", ref: resolved, from: parentRelPath, parent: parentFile, detail: "Claude memory @include target is not a file" });
        continue;
      }
      if (!isClaudeMemoryTextInclude(resolved)) {
        addIssue({ type: "non_text_include_skipped", ref: resolved, from: parentRelPath, parent: parentFile, detail: "Claude memory @include target is not a known text file extension" });
        continue;
      }
      if (baseKeys.has(key)) {
        graph.push({ type: "already_discovered_include", status: "already_loaded", ref: resolved, from: parentRelPath, parent: parentFile });
        continue;
      }
      if (processed.has(key)) {
        graph.push({ type: "deduped_include", status: "already_loaded", ref: resolved, from: parentRelPath, parent: parentFile });
        continue;
      }
      visiting.add(key);
      processed.add(key);
      try {
        const content = fs.readFileSync(resolved, "utf-8");
        const parsed = parseFrontmatter(content);
        const relPath = claudeMemoryIncludeRelPath(resolved, roots);
        const item = {
          ...rootItem,
          file: resolved,
          relPath,
          kind: `${String(rootItem.kind || "memory")}_include`,
          includeParentFile: parentFile,
          includeParentRelPath: parentRelPath,
          includeDepth,
          name: parsed.meta.name || path.basename(resolved),
          description: parsed.meta.description || compactText((parsed.body || content).split(/\n+/).find(Boolean) || "", 180),
          paths: normalizePathGlobs(parsed.meta.paths || parsed.meta.path_globs || parsed.meta.globs || []),
          bytes: stat.size,
          mtimeMs: stat.mtimeMs,
          checksum: checksum(content, 24),
          body: parsed.body || content,
        };
        files.push(item);
        if (external && externalDecision.reason === "approved_external_include") {
          approvedExternalIncludes.push({
            path: normalizeExternalIncludeApprovalPath(resolved),
            parent: parentFile,
            from: parentRelPath,
            scope: String(rootItem.scope || "project"),
            kind: String(rootItem.kind || ""),
            approvalKey: externalDecision.key,
          });
        }
        graph.push({ type: "include_imported", status: external ? externalDecision.reason : "included", ref: resolved, from: parentRelPath, parent: parentFile, relPath, depth: includeDepth });
        visitRefs(item, rootItem, includeDepth);
      } catch (error: any) {
        addIssue({ type: "unreadable_include", ref: resolved, from: parentRelPath, parent: parentFile, detail: error?.message || error });
      } finally {
        visiting.delete(key);
      }
    }
  };
  for (const item of sourceItems) visitRefs(item, item, 0);
  return {
    schema: "ccm-claude-memory-include-audit-v1",
    version: GROUP_CLAUDE_MEMORY_INCLUDE_AUDIT_VERSION,
    generatedAt: now(),
    maxIncludeDepth,
    includedCount: files.length,
    skippedCount: issues.length,
    externalIncludeCount: pendingExternalIncludes.length + approvedExternalIncludes.length,
    externalIncludeApproval: {
      schema: "ccm-claude-memory-external-include-approval-v1",
      version: GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION,
      ledgerFile: approvalLedger?.file || (groupId ? getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId) : ""),
      hasExternalIncludesApproved: approvalLedger?.hasExternalIncludesApproved === true,
      hasExternalIncludesWarningShown: approvalLedger?.hasExternalIncludesWarningShown === true,
      warningShownAt: String(approvalLedger?.warningShownAt || ""),
      pendingCount: pendingExternalIncludes.length,
      approvedCount: approvedExternalIncludes.length,
      shouldShowWarning: pendingExternalIncludes.length > 0
        && approvalLedger?.hasExternalIncludesApproved !== true
        && approvalLedger?.hasExternalIncludesWarningShown !== true,
      pendingExternalIncludes: pendingExternalIncludes.slice(0, 40),
      approvedExternalIncludes: approvedExternalIncludes.slice(0, 40),
    },
    graph: graph.slice(0, 120),
    issues,
    files,
  };
}


export function buildTypedMemoryLoadEntry(input: any) {
  const file = String(input.file || "");
  const stat = fs.statSync(file);
  const sourceContent = fs.readFileSync(file, "utf-8");
  const entrypointProjection = input.kind === "entrypoint"
    ? truncateGroupTypedMemoryEntrypointContent(sourceContent)
    : null;
  const content = entrypointProjection?.content ?? sourceContent;
  const parsed = parseFrontmatter(content);
  const type = input.kind === "entrypoint" ? "entrypoint" : normalizeMemoryType(parsed.meta.type || input.type);
  const body = parsed.body || content;
  const includeRefs = extractTypedMemoryIncludeRefs(body);
  const relPath = input.relPath || path.basename(file);
  const priority = input.kind === "entrypoint" ? 0 : groupTypedMemoryPriority(type);
  const pathGlobs = normalizePathGlobs(parsed.meta.paths || parsed.meta.path_globs || parsed.meta.globs || input.pathGlobs || []);
  return {
    id: `${input.kind || "typed_doc"}:${relPath}`,
    kind: input.kind || "typed_doc",
    relPath,
    file,
    name: parsed.meta.name || path.basename(file, ".md"),
    description: parsed.meta.description || "",
    type,
    source: parsed.meta.source || "",
    pathGlobs,
    pathCondition: input.pathCondition || evaluateTypedMemoryPathCondition({ paths: pathGlobs }, input.targetPaths || []),
    priority,
    includeDepth: Number(input.depth || 0),
    parentRelPath: input.parentRelPath || "",
    loadReason: input.parentRelPath ? "include" : input.kind === "entrypoint" ? "entrypoint" : "typed_doc",
    includeRefs,
    mtimeMs: stat.mtimeMs,
    bytes: Buffer.byteLength(content, "utf-8"),
    sourceBytes: stat.size,
    sourceLineCount: sourceContent.trim() ? sourceContent.trim().split("\n").length : 0,
    checksum: checksum(content, 24),
    sourceChecksum: checksum(sourceContent, 24),
    estimatedTokens: Math.max(1, Math.ceil(Buffer.byteLength(content, "utf-8") / 4)),
    ...(entrypointProjection ? {
      entrypointTruncation: {
        ...entrypointProjection,
        content: undefined,
      },
    } : {}),
  };
}


export function buildGroupTypedMemoryLoadPlan(groupId: string, options: any = {}) {
  return require("./group-memory-loading").buildGroupTypedMemoryLoadPlan(groupId, options);
}


export function renderGroupTypedMemoryLoadPlan(plan: any) {
  return require("./group-memory-loading").renderGroupTypedMemoryLoadPlan(plan);
}


export function normalizeDirectMemoryText(value: any) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}


export function normalizeGroupDirectMemoryRequest(groupId: string, message: any, index = 0) {
  const raw = message?.memoryDirectAction || message?.memory_direct_action || null;
  if (!raw || typeof raw !== "object") return null;
  const action = String(raw.action || "").trim().toLowerCase();
  if (!["remember", "forget"].includes(action)) return null;
  const messageId = messageIdentity(message, index);
  const claimedScopeId = compactText(raw.scopeId || raw.scope_id || "", 180);
  const content = compactText(raw.content || raw.text || raw.query || messageContent(message), 1800);
  const memoryType = normalizeMemoryType(raw.memoryType || raw.memory_type || raw.type || "user");
  const targetMemoryId = compactText(raw.targetMemoryId || raw.target_memory_id || raw.memoryId || raw.memory_id || "", 180);
  const requestId = compactText(raw.requestId || raw.request_id || `gmdr_${checksum([groupId, messageId, action, content, targetMemoryId], 28)}`, 180);
  const expectedChecksum = checksum([GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION, groupId, messageId, action, memoryType, content, targetMemoryId], 64);
  const claimedChecksum = String(raw.requestChecksum || raw.request_checksum || "").trim().toLowerCase();
  return {
    schema: "ccm-group-direct-memory-request-v1",
    version: GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
    requestId,
    action,
    groupId,
    claimedScopeId,
    scopeMatches: !!claimedScopeId && claimedScopeId === groupId,
    sourceRole: String(message?.role || ""),
    messageId,
    sourceIndex: Number(message?.__typedMemorySourceIndex ?? index),
    content,
    normalizedContent: normalizeDirectMemoryText(content),
    memoryType,
    targetMemoryId,
    expectedChecksum,
    claimedChecksum,
    checksumMatches: !!claimedChecksum && claimedChecksum === expectedChecksum,
    requestedAt: String(message?.timestamp || message?.created_at || ""),
  };
}


export function directMemoryFactIdentity(groupId: string, type: GroupTypedMemoryType, text: string) {
  const textChecksum = checksum(normalizeDirectMemoryText(text), 64);
  return {
    factKey: checksum(["direct-memory", groupId, type, textChecksum], 24),
    memoryId: `gmem_${checksum([groupId, type, textChecksum], 28)}`,
    textChecksum,
  };
}


export function directMemoryFactRows(facts: any = {}) {
  const rows: any[] = [];
  for (const type of ["user", "project", "feedback", "reference"] as GroupTypedMemoryType[]) {
    for (const [factKey, fact] of Object.entries(facts?.[type] || {}) as Array<[string, any]>) {
      const derived = directMemoryFactIdentity(String(fact?.groupId || "legacy"), type, String(fact?.text || ""));
      const identity = {
        factKey,
        memoryId: String(fact?.memoryId || derived.memoryId),
        textChecksum: String(fact?.textChecksum || derived.textChecksum),
      };
      rows.push({ type, factKey, fact, ...identity });
    }
  }
  return rows;
}

// ===== merged from typed-memory-index-build-part-02.ts =====

// Behavior-freeze module extracted mechanically from the former facade.


export function applyGroupDirectMemoryRequests(groupId: string, factsInput: any, requests: any[] = [], previous: any = {}, updatedAt = now()) {
  const facts: any = {};
  for (const type of ["user", "project", "feedback", "reference"] as GroupTypedMemoryType[]) {
    facts[type] = { ...(factsInput?.[type] || {}) };
  }
  const receipts = new Map<string, any>();
  for (const row of Array.isArray(previous?.receipts) ? previous.receipts : []) {
    if (row?.requestId) receipts.set(String(row.requestId), row);
  }
  const tombstones = new Map<string, any>();
  for (const row of Array.isArray(previous?.tombstones) ? previous.tombstones : []) {
    if (row?.tombstoneId) tombstones.set(String(row.tombstoneId), row);
  }
  let rememberedThisRun = 0;
  let forgottenThisRun = 0;
  let duplicateThisRun = 0;
  let rejectedThisRun = 0;

  for (const request of [...requests].sort((a, b) => Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0))) {
    if (receipts.has(request.requestId)) {
      duplicateThisRun += 1;
      continue;
    }
    const base = {
      schema: "ccm-group-direct-memory-receipt-v1",
      version: GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
      requestId: request.requestId,
      action: request.action,
      groupId,
      messageId: request.messageId,
      sourceIndex: request.sourceIndex,
      requestChecksum: request.expectedChecksum,
      committedAt: updatedAt,
    };
    const reject = (reason: string, candidates: any[] = []) => {
      rejectedThisRun += 1;
      receipts.set(request.requestId, {
        ...base,
        status: "rejected",
        reason,
        candidateCount: candidates.length,
        candidates: candidates.slice(0, 12).map(row => ({
          memoryId: row.memoryId,
          type: row.type,
          messageId: String(row.fact?.messageId || ""),
          text: compactText(row.fact?.text || "", 240),
        })),
      });
    };
    if (request.sourceRole !== "user") {
      reject("direct_memory_requires_user_message");
      continue;
    }
    if (!request.scopeMatches) {
      reject("direct_memory_scope_mismatch");
      continue;
    }
    if (!request.checksumMatches) {
      reject("direct_memory_request_checksum_mismatch");
      continue;
    }
    if (!request.content) {
      reject("direct_memory_content_required");
      continue;
    }

    if (request.action === "remember") {
      const identity = directMemoryFactIdentity(groupId, request.memoryType, request.content);
      const bucket = facts[request.memoryType] || {};
      const existing = bucket[identity.factKey];
      for (const [key, tombstone] of tombstones.entries()) {
        if (String(tombstone?.textChecksum || "") === identity.textChecksum) tombstones.delete(key);
      }
      bucket[identity.factKey] = {
        id: identity.factKey,
        category: request.memoryType,
        type: "explicit_remember",
        groupId,
        memoryId: identity.memoryId,
        textChecksum: identity.textChecksum,
        messageId: request.messageId,
        sourceIndex: request.sourceIndex,
        actor: "用户 -> coordinator",
        sourceRole: "user",
        timestamp: request.requestedAt,
        text: request.content,
        checksum: identity.factKey,
        firstSeenAt: existing?.firstSeenAt || updatedAt,
        lastSeenAt: updatedAt,
        count: 1,
        directMemory: { requestId: request.requestId, requestChecksum: request.expectedChecksum },
        admission: {
          admitted: true,
          reason: "explicit_user_remember",
          hardExclusion: false,
          durable: true,
          nonObvious: true,
          hasRationale: true,
          confidence: 1,
          why: "The user explicitly requested this current group-session memory.",
          howToApply: "Apply only inside this group session unless the user explicitly forgets or supersedes it.",
        },
      };
      facts[request.memoryType] = bucket;
      if (existing) duplicateThisRun += 1;
      else rememberedThisRun += 1;
      receipts.set(request.requestId, {
        ...base,
        status: existing ? "duplicate" : "committed",
        reason: existing ? "same_scoped_memory_already_exists" : "explicit_memory_committed",
        memoryId: identity.memoryId,
        memoryType: request.memoryType,
        textChecksum: identity.textChecksum,
      });
      continue;
    }

    const allRows = directMemoryFactRows(facts).map(row => {
      if (row.fact?.memoryId && row.fact?.textChecksum) return row;
      const derived = directMemoryFactIdentity(groupId, row.type, String(row.fact?.text || ""));
      return { ...row, memoryId: derived.memoryId, textChecksum: derived.textChecksum };
    });
    const target = normalizeDirectMemoryText(request.targetMemoryId || request.content);
    let matches = allRows.filter(row => [row.memoryId, row.factKey, row.fact?.id, row.fact?.checksum, row.fact?.messageId]
      .some(value => normalizeDirectMemoryText(value) === target));
    if (!matches.length) {
      matches = allRows.filter(row => normalizeDirectMemoryText(row.fact?.text) === target);
    }
    if (!matches.length && target.length >= 8) {
      matches = allRows.filter(row => normalizeDirectMemoryText(row.fact?.text).includes(target));
    }
    if (matches.length !== 1) {
      reject(matches.length ? "forget_target_ambiguous" : "forget_target_not_found", matches);
      continue;
    }
    const matched = matches[0];
    delete facts[matched.type][matched.factKey];
    const tombstoneId = `gmt_${checksum([groupId, matched.memoryId, matched.factKey, request.requestId], 28)}`;
    tombstones.set(tombstoneId, {
      schema: "ccm-group-direct-memory-tombstone-v1",
      tombstoneId,
      groupId,
      memoryId: matched.memoryId,
      factKey: matched.factKey,
      textChecksum: matched.textChecksum || checksum(normalizeDirectMemoryText(matched.fact?.text), 64),
      sourceMessageId: String(matched.fact?.messageId || ""),
      forgetMessageId: request.messageId,
      requestId: request.requestId,
      forgottenAt: updatedAt,
    });
    forgottenThisRun += 1;
    receipts.set(request.requestId, {
      ...base,
      status: "committed",
      reason: "explicit_memory_forgotten",
      memoryId: matched.memoryId,
      memoryType: matched.type,
      textChecksum: matched.textChecksum,
    });
  }

  const boundedReceipts = [...receipts.values()]
    .sort((a, b) => String(a.committedAt || "").localeCompare(String(b.committedAt || "")))
    .slice(-500);
  const boundedTombstones = [...tombstones.values()]
    .sort((a, b) => String(a.forgottenAt || "").localeCompare(String(b.forgottenAt || "")))
    .slice(-500);
  return {
    facts,
    ledger: {
      schema: "ccm-group-direct-memory-ledger-v1",
      version: GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
      groupId,
      evaluatedThisRun: requests.length,
      rememberedThisRun,
      forgottenThisRun,
      duplicateThisRun,
      rejectedThisRun,
      activeDirectMemoryCount: directMemoryFactRows(facts).filter(row => row.fact?.directMemory?.requestId).length,
      receiptCount: boundedReceipts.length,
      tombstoneCount: boundedTombstones.length,
      receipts: boundedReceipts,
      tombstones: boundedTombstones,
      updatedAt,
    },
  };
}


export function filterFactsByDirectMemoryTombstones(facts: any, directMemory: any) {
  const blockedTextChecksums = new Set((Array.isArray(directMemory?.tombstones) ? directMemory.tombstones : [])
    .map((row: any) => String(row?.textChecksum || ""))
    .filter(Boolean));
  if (!blockedTextChecksums.size) return { facts, suppressedCount: 0 };
  const next: any = {};
  let suppressedCount = 0;
  for (const type of ["user", "project", "feedback", "reference"] as GroupTypedMemoryType[]) {
    next[type] = {};
    for (const [key, fact] of Object.entries(facts?.[type] || {}) as Array<[string, any]>) {
      const textChecksum = String(fact?.textChecksum || checksum(normalizeDirectMemoryText(fact?.text), 64));
      if (blockedTextChecksums.has(textChecksum)) {
        suppressedCount += 1;
        continue;
      }
      next[type][key] = fact;
    }
  }
  return { facts: next, suppressedCount };
}


export function getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId: string) {
  return require("./group-memory-loading").getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId);
}


export function conflictResolutionColdArchiveManifestChecksum(manifest: any = {}) {
  return require("./group-memory-loading").conflictResolutionColdArchiveManifestChecksum(manifest);
}


export function getConflictResolutionColdArchiveManifestGenerationsDir(groupId: string) {
  return require("./group-memory-loading").getConflictResolutionColdArchiveManifestGenerationsDir(groupId);
}


export function getConflictResolutionColdArchiveManifestGenerationFile(groupId: string, manifestChecksum: string) {
  return require("./group-memory-loading").getConflictResolutionColdArchiveManifestGenerationFile(groupId, manifestChecksum);
}


export function readConflictResolutionColdArchiveManifest(groupId: string) {
  return require("./group-memory-loading").readConflictResolutionColdArchiveManifest(groupId);
}


export function readPreviousConflictResolutionColdArchiveManifest(groupId: string, currentManifest: any = {}) {
  return require("./group-memory-loading").readPreviousConflictResolutionColdArchiveManifest(groupId, currentManifest);
}


export function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId: string, options: any = {}) {
  return require("./group-memory-loading").verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId, options);
}


export function recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration(groupId: string, options: any = {}) {
  return require("./group-memory-loading").recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration(groupId, options);
}


export function buildGroupDirectMemoryAction(groupId: string, input: any = {}) {
  const action = String(input.action || "").trim().toLowerCase();
  if (!["remember", "forget"].includes(action)) throw new Error("unsupported_direct_memory_action");
  const messageId = compactText(input.messageId || input.message_id || "", 180);
  if (!messageId) throw new Error("direct_memory_message_id_required");
  const content = compactText(input.content || input.text || input.query || "", 1800);
  if (!content) throw new Error("direct_memory_content_required");
  const memoryType = normalizeMemoryType(input.memoryType || input.memory_type || input.type || "user");
  const targetMemoryId = compactText(input.targetMemoryId || input.target_memory_id || input.memoryId || input.memory_id || "", 180);
  const requestId = compactText(input.requestId || input.request_id || `gmdr_${checksum([groupId, messageId, action, content, targetMemoryId], 28)}`, 180);
  const requestChecksum = checksum([GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION, groupId, messageId, action, memoryType, content, targetMemoryId], 64);
  return {
    schema: "ccm-group-direct-memory-action-v1",
    version: GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
    requestId,
    action,
    scopeId: groupId,
    content,
    memoryType,
    targetMemoryId,
    requestChecksum,
  };
}


export function commitGroupDirectMemoryAction(groupId: string, messages: any[] = [], input: any = {}) {
  const requestId = String(input.requestId || input.request_id || "").trim();
  if (!requestId) throw new Error("direct_memory_request_id_required");
  const distillation = distillGroupMessagesToTypedMemoryUntilCaughtUp(groupId, messages, {}, {
    reason: String(input.reason || "direct-group-memory-action"),
    maxCatchUpBatches: Number(input.maxCatchUpBatches || input.max_catch_up_batches || 32),
  });
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const receipt = (Array.isArray(ledger.directMemory?.receipts) ? ledger.directMemory.receipts : [])
    .find((row: any) => String(row?.requestId || "") === requestId) || null;
  return {
    schema: "ccm-group-direct-memory-commit-v1",
    version: GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION,
    groupId,
    requestId,
    committed: receipt?.status === "committed" || receipt?.status === "duplicate",
    receipt,
    directMemory: ledger.directMemory || null,
    distillation,
    index: buildGroupTypedMemoryIndex(groupId),
  };
}


export function syncGroupTypedMemoryFromGroupMemory(groupId: string, memory: any = {}) {
  const updatedAt = now();
  const goal = memory?.goal || memory?.summary || "";
  const requirements = Array.isArray(memory?.persistentRequirements) ? memory.persistentRequirements : [];
  const facts = Array.isArray(memory?.factAnchors) ? memory.factAnchors : [];
  const decisions = Array.isArray(memory?.decisions) ? memory.decisions : [];
  const confirmedFeedback = [
    ...(Array.isArray(memory?.feedback) ? memory.feedback : []),
    ...(Array.isArray(memory?.confirmedCorrections) ? memory.confirmedCorrections : []),
  ];

  const writes: any[] = [];
  const userBody = [
    "# User Requirements",
    goal ? `## Current Goal\n${compactText(goal, 1200)}` : "",
    listLines("Persistent Requirements", requirements, (item: any) => `#${item.messageId || item.id || ""} ${item.text || item}`, 24),
  ].filter(Boolean).join("\n\n");
  if (goal || requirements.length) writes.push(upsertGroupTypedMemoryDocument(groupId, {
    type: "user",
    slug: "user-requirements",
    name: "User requirements and acceptance constraints",
    description: "Hard user constraints, acceptance requirements, and the active group goal.",
    source: "auto:group-memory-json",
    updatedAt,
    body: userBody,
  }));

  const projectBody = [
    "# Project Collaboration Context",
    goal ? `## Goal\n${compactText(goal, 1200)}` : "",
    listLines("Decisions", decisions, (item: any) => `${item.decision || item.text || ""}${item.reason ? ` (${item.reason})` : ""}`, 16),
    listLines("Next Actions", memory?.nextActions || [], (item: any) => item.action || item, 10),
    memory?.messageDigest ? `## Conversation Summary\n${compactText(memory.messageDigest, 3000)}` : "",
  ].filter(Boolean).join("\n\n");
  if (projectBody.trim()) writes.push(upsertGroupTypedMemoryDocument(groupId, {
    type: "project",
    slug: "project-context",
    name: "Project collaboration context",
    description: "Group goal, decisions, next actions, and compacted conversation state.",
    source: "auto:group-memory-json",
    updatedAt,
    body: projectBody,
  }));

  const feedbackBody = [
    "# Confirmed Feedback And Corrections",
    listLines("Reusable Corrections", confirmedFeedback, (item: any) => `${item.text || item.content || item.correction || item}`, 24),
  ].filter(Boolean).join("\n\n");
  if (confirmedFeedback.length) writes.push(upsertGroupTypedMemoryDocument(groupId, {
    type: "feedback",
    slug: "confirmed-feedback",
    name: "Confirmed feedback and corrections",
    description: "Accepted reusable corrections and lessons. Raw failures and temporary worker status stay in task replay.",
    source: "auto:group-memory-json",
    updatedAt,
    body: feedbackBody,
  }));

  const referenceBody = [
    "# Stable Reference Anchors",
    listLines("Fact Anchors", facts, (item: any) => `#${item.messageId || item.id || ""} [${item.type || "fact"}] ${item.text || item}`, 24),
  ].filter(Boolean).join("\n\n");
  if (facts.length) writes.push(upsertGroupTypedMemoryDocument(groupId, {
    type: "reference",
    slug: "reference-artifacts",
    name: "Stable reference anchors",
    description: "Non-derivable references and stable evidence anchors. Skills, MCP definitions, files and temporary verification remain dynamic session context.",
    source: "auto:group-memory-json",
    updatedAt,
    body: referenceBody,
  }));

  const index = buildGroupTypedMemoryIndex(groupId);
  return { schema: "ccm-group-typed-memory-sync-v1", version: GROUP_TYPED_MEMORY_VERSION, groupId, writes, index };
}


export function groupTypedMemoryManifestSelectionChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.checksum;
  delete payload.decisionFile;
  delete payload.recallShapeTelemetry;
  delete payload.recallShapeTelemetryFile;
  delete payload.recallShapeTelemetryError;
  return checksum(JSON.stringify(payload), 64);
}


export function groupTypedMemoryManifestSelectorCalibrationChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.checksum;
  return checksum(JSON.stringify(payload), 64);
}


export function getGroupTypedMemoryManifestSelectorDecisionDir(scopeId: string) {
  return require("./group-memory-loading").getGroupTypedMemoryManifestSelectorDecisionDir(scopeId);
}


export function getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId: string) {
  return require("./group-memory-loading").getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId);
}


export function getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId: string) {
  return require("./group-memory-loading").getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId);
}


export function groupTypedMemoryManifestSelectorOutcomeChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.checksum;
  delete payload.outcomeFile;
  return checksum(JSON.stringify(payload), 64);
}


export function verifyGroupTypedMemoryManifestSelectorOutcome(outcome: any, expectedScopeId = "", selection: any = null) {
  return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelectorOutcome(outcome, expectedScopeId, selection);
}


export function recordGroupTypedMemoryManifestSelectorOutcome(scopeId: string, selection: any, input: any = {}) {
  return require("./group-memory-loading").recordGroupTypedMemoryManifestSelectorOutcome(scopeId, selection, input);
}


export function groupTypedMemoryManifestSelectorConsumptionChecksum(value: any) {
  const payload = { ...(value || {}) };
  delete payload.checksum;
  delete payload.consumptionFile;
  delete payload.valid;
  delete payload.idempotent;
  delete payload.trendContribution;
  delete payload.trendContributionError;
  return checksum(JSON.stringify(payload), 64);
}


export function readGroupTypedMemoryManifestSelectorChain(scopeId: string, requestId: string) {
  const decisionFile = path.join(getGroupTypedMemoryManifestSelectorDecisionDir(scopeId), `${safeSegment(requestId)}.json`);
  const outcomeDir = getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId);
  const attachedFile = path.join(outcomeDir, `${safeSegment(requestId)}.attached.json`);
  const committedFile = path.join(outcomeDir, `${safeSegment(requestId)}.committed.json`);
  let selection: any = null;
  let attached: any = null;
  let committed: any = null;
  try { selection = JSON.parse(fs.readFileSync(decisionFile, "utf-8")); } catch {}
  try { attached = JSON.parse(fs.readFileSync(attachedFile, "utf-8")); } catch {}
  try { committed = JSON.parse(fs.readFileSync(committedFile, "utf-8")); } catch {}
  const selectionValid = verifyGroupTypedMemoryManifestSelection(selection, scopeId).valid === true;
  const attachedValid = selectionValid && verifyGroupTypedMemoryManifestSelectorOutcome(attached, scopeId, selection).valid === true && attached.stage === "attached";
  const committedValid = attachedValid
    && verifyGroupTypedMemoryManifestSelectorOutcome(committed, scopeId, selection).valid === true
    && committed.stage === "committed"
    && String(committed.attachedOutcomeChecksum || "") === String(attached.checksum || "")
    && String(committed.capsuleChecksum || "") === String(attached.capsuleChecksum || "");
  return {
    valid: committedValid,
    selection,
    attached,
    committed,
    files: { decisionFile, attachedFile, committedFile },
  };
}


export function verifyGroupTypedMemoryManifestSelectorConsumptionOutcome(consumption: any, expectedScopeId = "", committedOutcome: any = null) {
  return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelectorConsumptionOutcome(consumption, expectedScopeId, committedOutcome);
}


export function recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeId: string, input: any = {}) {
  return require("./group-memory-loading").recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeId, input);
}


export function summarizeGroupTypedMemoryManifestSelectorConsumption(scopeId: string, options: any = {}) {
  return require("./group-memory-loading").summarizeGroupTypedMemoryManifestSelectorConsumption(scopeId, options);
}


export function verifyGroupTypedMemoryManifestSelectorCalibration(calibration: any, expectedScopeId = "", expectedQueryChecksum = "") {
  return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelectorCalibration(calibration, expectedScopeId, expectedQueryChecksum);
}


export function buildGroupTypedMemoryManifestSelectorCalibration(scopeId: string, query: string, options: any = {}) {
  return require("./group-memory-loading").buildGroupTypedMemoryManifestSelectorCalibration(scopeId, query, options);
}


export function groupTypedMemoryManifestSelectorAgeStats(candidates: any[], nowMs: number) {
  const ages = candidates.map((candidate: any) => {
    const mtimeMs = Number(candidate?.mtimeMs || 0);
    return mtimeMs > 0 ? Math.max(0, (nowMs - mtimeMs) / 86_400_000) : 0;
  });
  if (!ages.length) return { newest: -1, oldest: -1, average: -1 };
  return {
    newest: Number(Math.min(...ages).toFixed(6)),
    oldest: Number(Math.max(...ages).toFixed(6)),
    average: Number((ages.reduce((sum, age) => sum + age, 0) / ages.length).toFixed(6)),
  };
}


export function recordGroupTypedMemoryManifestSelectorDecision(scopeId: string, decision: any) {
  const dir = path.resolve(getGroupTypedMemoryManifestSelectorDecisionDir(scopeId));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.resolve(dir, `${safeSegment(decision.requestId, `ms-${checksum(decision, 16)}`)}.json`);
  if (path.dirname(file).toLowerCase() !== dir.toLowerCase()) throw new Error("typed_memory_manifest_selector_decision_path_invalid");
  writeTextAtomicRaw(file, JSON.stringify(decision, null, 2));
  try {
    const files = fs.readdirSync(dir)
      .filter(name => name.toLowerCase().endsWith(".json"))
      .map(name => ({ name, file: path.resolve(dir, name), mtimeMs: fs.statSync(path.resolve(dir, name)).mtimeMs }))
      .filter(item => path.dirname(item.file).toLowerCase() === dir.toLowerCase())
      .sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name));
    for (const item of files.slice(200)) {
      try { fs.unlinkSync(item.file); } catch {}
      const requestId = item.name.replace(/\.json$/i, "");
      const outcomeDir = getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId);
      for (const stage of ["attached", "committed"]) {
        try { fs.unlinkSync(path.join(outcomeDir, `${requestId}.${stage}.json`)); } catch {}
      }
      const consumptionDir = getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId);
      try {
        for (const name of fs.readdirSync(consumptionDir).filter(name => name.startsWith(`${requestId}.`) && name.endsWith(".json"))) {
          try { fs.unlinkSync(path.join(consumptionDir, name)); } catch {}
        }
      } catch {}
      try { fs.unlinkSync(path.join(getGroupTypedMemoryManifestSelectorShapeDir(scopeId), `${requestId}.json`)); } catch {}
    }
  } catch {}
  return file;
}


export function verifyGroupTypedMemoryManifestSelection(selection: any, expectedScopeId = "") {
  return require("./group-memory-loading").verifyGroupTypedMemoryManifestSelection(selection, expectedScopeId);
}


export function configureGroupTypedMemoryManifestSelector(executor: GroupTypedMemoryManifestSelectorExecutor | null) {
  return require("./group-memory-loading").configureGroupTypedMemoryManifestSelector(executor);
}


export function buildGroupTypedMemoryManifest(scopeId: string, query: string, options: any = {}) {
  return require("./group-memory-loading").buildGroupTypedMemoryManifest(scopeId, query, options);
}


export function parseGroupTypedMemoryManifestSelectorOutput(value: any) {
  if (Array.isArray(value?.selected_memories)) return value.selected_memories;
  if (Array.isArray(value?.selectedMemories)) return value.selectedMemories;
  const raw = String(value?.output ?? value?.text ?? value?.content ?? value ?? "").trim();
  if (!raw) return [];
  const fenced = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const candidates = [fenced, fenced.match(/\{[\s\S]*\}/)?.[0] || ""].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed?.selected_memories)) return parsed.selected_memories;
      if (Array.isArray(parsed?.selectedMemories)) return parsed.selectedMemories;
    } catch {}
  }
  throw new Error("manifest_selector_output_json_invalid");
}


export function finalizeGroupTypedMemoryManifestSelection(scopeId: string, input: any, options: any = {}) {
  const core = {
    schema: "ccm-group-typed-memory-manifest-selection-v1",
    version: GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_VERSION,
    scopeId,
    requestId: String(input.requestId || `ms_${checksum([scopeId, Date.now(), crypto.randomBytes(8).toString("hex")], 24)}`),
    status: String(input.status || "empty"),
    reason: String(input.reason || ""),
    selectorRan: input.selectorRan === true,
    shapeTelemetryExpected: input.shapeTelemetryExpected === true,
    queryChecksum: String(input.queryChecksum || ""),
    manifestChecksum: String(input.manifestChecksum || ""),
    candidateCount: Number(input.candidateCount || 0),
    selectedRelPaths: uniqueStrings((input.selectedRelPaths || []).map(String), GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION),
    unknownFilenames: uniqueStrings((input.unknownFilenames || []).map(String), 20),
    invalidFilenameCount: Number(input.invalidFilenameCount || 0),
    recentTools: uniqueStrings((input.recentTools || []).map(String), 20),
    filterCounts: input.filterCounts || {},
    calibration: input.calibration || null,
    calibrationChecksum: String(input.calibrationChecksum || input.calibration?.checksum || ""),
    calibrationHintCount: Number(input.calibrationHintCount ?? input.calibration?.hintCount ?? 0),
    calibrationEvidenceCount: Number(input.calibrationEvidenceCount ?? input.calibration?.evidenceCount ?? 0),
    selectorProject: String(input.selectorProject || ""),
    selectorAgentType: String(input.selectorAgentType || ""),
    selectorModel: String(input.selectorModel || ""),
    startedAt: String(input.startedAt || ""),
    completedAt: String(input.completedAt || now()),
  };
  const decision: any = { ...core, checksum: groupTypedMemoryManifestSelectionChecksum(core) };
  if (options.recordDecision !== false && isExactGroupTypedMemorySessionScope(scopeId)) {
    try { decision.decisionFile = recordGroupTypedMemoryManifestSelectorDecision(scopeId, decision); }
    catch (error: any) { decision.recordError = compactText(error?.message || error, 240); }
  }
  return decision;
}


export async function selectGroupTypedMemoryManifest(scopeId: string, query: string, options: any = {}) {
  return require("./group-memory-loading").selectGroupTypedMemoryManifest(scopeId, query, options);
}


export function summarizeGroupTypedMemoryManifestSelectorOutcomes(scopeId: string, options: any = {}) {
  return require("./group-memory-loading").summarizeGroupTypedMemoryManifestSelectorOutcomes(scopeId, options);
}


export function summarizeGroupTypedMemoryManifestSelectorDecisions(scopeId: string, options: any = {}) {
  return require("./group-memory-loading").summarizeGroupTypedMemoryManifestSelectorDecisions(scopeId, options);
}
