import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";

export const GROUP_POST_TURN_SUMMARY_SCHEMA = "ccm-group-post-turn-summary-v1";
export const GROUP_POST_TURN_SUMMARY_DELIVERY_CAPSULE_SCHEMA = "ccm-group-post-turn-summary-delivery-capsule-v1";
export const GROUP_POST_TURN_SUMMARY_LEDGER_DIR = path.join(CCM_DIR, "group-post-turn-summaries");
const HOT_EVENT_LIMIT = 2_000;
const ARCHIVE_LIMIT = 30;
const LOCK_STALE_MS = 60_000;

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result: any, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

function sha256(value: any, length = 64) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(canonical(value))).digest("hex").slice(0, length);
}

function cleanPart(value: any) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 160) || "unknown";
}

function compactText(value: any, max = 600) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}

function processAlive(pid: number) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function ledgerFile(groupId: string, sessionId: string) {
  if (!groupId || !String(sessionId || "").startsWith("gcs_")) throw new Error("post-turn summary requires groupId--gcs_* identity");
  return path.join(GROUP_POST_TURN_SUMMARY_LEDGER_DIR, `${cleanPart(groupId)}--${cleanPart(sessionId)}.jsonl`);
}

export function getGroupPostTurnSummaryLedgerFile(groupId: string, sessionId: string) {
  return ledgerFile(groupId, sessionId);
}

function eventChecksum(event: any) {
  const payload = { ...(event || {}) };
  delete payload.event_checksum;
  delete payload.checksum_valid;
  return sha256(payload);
}

function deliveryCapsuleChecksum(capsule: any) {
  const payload = { ...(capsule || {}) };
  delete payload.capsule_checksum;
  delete payload.checksum_valid;
  delete payload.binding_valid;
  delete payload.ledger_fresh;
  delete payload.selected_summaries_valid;
  delete payload.prompt_bound;
  delete payload.trusted_for_delivery;
  delete payload.validation_issues;
  return sha256(payload);
}

export function verifyGroupPostTurnSummaryDeliveryCapsuleChecksum(capsule: any) {
  return !!capsule?.capsule_checksum && String(capsule.capsule_checksum) === deliveryCapsuleChecksum(capsule);
}

export function extractGroupPostTurnSummaryDeliveryCapsule(value: any, seen = new Set<any>()): any {
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  if (value.schema === GROUP_POST_TURN_SUMMARY_DELIVERY_CAPSULE_SCHEMA
    && !!value.capsule_checksum
    && Array.isArray(value.selected_summaries)) return value;
  for (const nested of Array.isArray(value) ? value : Object.values(value)) {
    const found = extractGroupPostTurnSummaryDeliveryCapsule(nested, seen);
    if (found) return found;
  }
  return null;
}

function selectDeliverySummaries(rows: any[] = [], limit = 6) {
  const current = [...rows]
    .filter(row => row?.summary_id && row?.summarizes_message_id && row?.message_checksum && row?.event_checksum)
    .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
  const max = Math.max(1, Math.min(12, Number(limit || 6)));
  if (current.length <= max) return current;
  const recentCount = Math.min(3, max);
  const recent = current.slice(-recentCount);
  const recentIds = new Set(recent.map(row => String(row.summary_id || "")));
  const priority = current.slice(0, -recentCount)
    .filter(row => row.is_noteworthy === true || ["blocked", "waiting", "failed", "review_ready"].includes(String(row.status_category || "")))
    .sort((a, b) => {
      const statusWeight = (row: any) => ["failed", "blocked", "waiting", "review_ready"].includes(String(row.status_category || "")) ? 2 : row.is_noteworthy === true ? 1 : 0;
      return statusWeight(b) - statusWeight(a) || Number(b.sequence || 0) - Number(a.sequence || 0);
    });
  const selected = [...recent];
  for (const row of priority) {
    if (selected.length >= max) break;
    if (!recentIds.has(String(row.summary_id || ""))) selected.push(row);
  }
  if (selected.length < max) {
    for (const row of [...current].reverse()) {
      if (selected.length >= max) break;
      if (!selected.some(item => String(item.summary_id || "") === String(row.summary_id || ""))) selected.push(row);
    }
  }
  return selected.sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
}

export function buildGroupPostTurnSummaryDeliveryCapsule(input: any = {}) {
  const groupId = String(input.groupId || input.group_id || "").trim();
  const groupSessionId = String(input.groupSessionId || input.group_session_id || "").trim();
  const taskAgentSessionId = String(input.taskAgentSessionId || input.task_agent_session_id || "").trim();
  const ledger = input.ledger || readGroupPostTurnSummaries(groupId, groupSessionId, { limit: 10_000 });
  if (!groupId || !groupSessionId.startsWith("gcs_") || !taskAgentSessionId.startsWith("tas_") || ledger?.valid !== true) return null;
  const selected = selectDeliverySummaries(Array.isArray(ledger.latest) ? ledger.latest : [], input.limit || 6);
  if (!selected.length) return null;
  const attemptSequence = Math.max(1, Math.floor(Number(input.attemptSequence || input.attempt_sequence || input.turn || 1) || 1));
  const invocationKind = String(input.invocationKind || input.invocation_kind || (attemptSequence > 1 ? "resume" : "spawn")) === "resume" ? "resume" : "spawn";
  const capsule: any = {
    schema: GROUP_POST_TURN_SUMMARY_DELIVERY_CAPSULE_SCHEMA,
    version: 1,
    group_id: groupId,
    group_session_id: groupSessionId,
    task_id: String(input.taskId || input.task_id || "").trim(),
    target_project: String(input.targetProject || input.target_project || "").trim(),
    task_agent_session_id: taskAgentSessionId,
    native_session_id: String(input.nativeSessionId || input.native_session_id || "").trim(),
    execution_id: String(input.executionId || input.execution_id || "").trim(),
    attempt_sequence: attemptSequence,
    invocation_kind: invocationKind,
    invocation_edge_id: String(input.invocationEdgeId || input.invocation_edge_id || "").trim(),
    parent_invocation_edge_id: String(input.parentInvocationEdgeId || input.parent_invocation_edge_id || "").trim(),
    root_invocation_edge_id: String(input.rootInvocationEdgeId || input.root_invocation_edge_id || "").trim(),
    branch_id: String(input.branchId || input.branch_id || "").trim(),
    parent_branch_id: String(input.parentBranchId || input.parent_branch_id || "").trim(),
    branch_kind: String(input.branchKind || input.branch_kind || "main").trim() || "main",
    expected_lineage_head_checksum: String(input.expectedLineageHeadChecksum || input.expected_lineage_head_checksum || "").trim(),
    compact_epoch: String(input.compactEpoch || input.compact_epoch || "precompact").trim() || "precompact",
    ledger_head_checksum: String(ledger.headChecksum || ""),
    ledger_last_sequence: Number(ledger.lastSequence || 0),
    selected_count: selected.length,
    selected_summaries: selected.map(row => ({
      summary_id: String(row.summary_id || ""),
      summarizes_message_id: String(row.summarizes_message_id || ""),
      message_checksum: String(row.message_checksum || ""),
      event_checksum: String(row.event_checksum || ""),
      sequence: Number(row.sequence || 0),
      status_category: String(row.status_category || "completed"),
      is_noteworthy: row.is_noteworthy === true,
    })),
    latest_summarized_message_id: String(selected[selected.length - 1]?.summarizes_message_id || ""),
    generated_at: String(input.generatedAt || input.generated_at || new Date().toISOString()),
  };
  capsule.capsule_checksum = deliveryCapsuleChecksum(capsule);
  return capsule;
}

export function validateGroupPostTurnSummaryDeliveryCapsule(input: any = null, options: any = {}) {
  if (!input || typeof input !== "object") return null;
  const issues: string[] = [];
  if (input.schema !== GROUP_POST_TURN_SUMMARY_DELIVERY_CAPSULE_SCHEMA || Number(input.version || 0) !== 1) issues.push("schema_invalid");
  const checksumValid = verifyGroupPostTurnSummaryDeliveryCapsuleChecksum(input);
  if (!checksumValid) issues.push("capsule_checksum_invalid");
  if (!String(input.group_session_id || "").startsWith("gcs_")) issues.push("group_session_identity_invalid");
  if (!String(input.task_agent_session_id || "").startsWith("tas_")) issues.push("task_agent_session_identity_invalid");
  if (!input.ledger_head_checksum) issues.push("ledger_head_checksum_missing");
  if (!Number.isInteger(Number(input.attempt_sequence || 0)) || Number(input.attempt_sequence || 0) < 1) issues.push("attempt_sequence_invalid");
  if (!["spawn", "resume"].includes(String(input.invocation_kind || ""))) issues.push("invocation_kind_invalid");
  if (Number(input.attempt_sequence || 0) > 1 && input.invocation_kind !== "resume") issues.push("invocation_kind_attempt_mismatch");
  if (input.invocation_edge_id && !String(input.invocation_edge_id).startsWith("tie_")) issues.push("invocation_edge_identity_invalid");
  if (input.invocation_edge_id && (!String(input.root_invocation_edge_id || "").startsWith("tie_") || !String(input.branch_id || "").startsWith("tbr_"))) issues.push("invocation_lineage_identity_invalid");
  if (input.invocation_edge_id && input.parent_invocation_edge_id === input.invocation_edge_id) issues.push("invocation_self_parent");
  const selected = Array.isArray(input.selected_summaries) ? input.selected_summaries : [];
  if (!selected.length || Number(input.selected_count || 0) !== selected.length || selected.length > 12) issues.push("selected_summaries_invalid");
  const selectedIds = new Set<string>();
  for (const row of selected) {
    const id = String(row?.summary_id || "");
    if (!id || selectedIds.has(id) || !row?.summarizes_message_id || !row?.message_checksum || !row?.event_checksum) issues.push("selected_summary_binding_invalid");
    selectedIds.add(id);
  }
  if (selected.length && String(input.latest_summarized_message_id || "") !== String(selected[selected.length - 1]?.summarizes_message_id || "")) issues.push("latest_summary_binding_invalid");
  const expected = options.expectedBinding || options.expected_binding || {};
  const compare = (field: string, aliases: string[]) => {
    const expectedValue = aliases.map(alias => expected?.[alias]).find(value => value !== undefined && value !== null && String(value) !== "");
    if (expectedValue !== undefined && String(input[field] || "") !== String(expectedValue || "")) issues.push(`${field}_mismatch`);
  };
  compare("group_id", ["group_id", "groupId"]);
  compare("group_session_id", ["group_session_id", "groupSessionId"]);
  compare("task_id", ["task_id", "taskId"]);
  compare("target_project", ["target_project", "targetProject", "project"]);
  compare("task_agent_session_id", ["task_agent_session_id", "taskAgentSessionId", "sessionId"]);
  compare("native_session_id", ["native_session_id", "nativeSessionId"]);
  compare("execution_id", ["execution_id", "executionId"]);
  compare("attempt_sequence", ["attempt_sequence", "attemptSequence", "turn"]);
  compare("invocation_kind", ["invocation_kind", "invocationKind"]);
  compare("invocation_edge_id", ["invocation_edge_id", "invocationEdgeId"]);
  compare("parent_invocation_edge_id", ["parent_invocation_edge_id", "parentInvocationEdgeId"]);
  compare("root_invocation_edge_id", ["root_invocation_edge_id", "rootInvocationEdgeId"]);
  compare("branch_id", ["branch_id", "branchId"]);
  compare("parent_branch_id", ["parent_branch_id", "parentBranchId"]);
  compare("branch_kind", ["branch_kind", "branchKind"]);
  compare("expected_lineage_head_checksum", ["expected_lineage_head_checksum", "expectedLineageHeadChecksum"]);
  compare("compact_epoch", ["compact_epoch", "compactEpoch"]);
  let ledgerFresh = true;
  let selectedSummariesValid = true;
  const ledger = options.ledger || (options.checkLedger === true || options.check_ledger === true
    ? readGroupPostTurnSummaries(String(input.group_id || ""), String(input.group_session_id || ""), { limit: 10_000 })
    : null);
  if (ledger) {
    if (ledger.valid !== true) { ledgerFresh = false; issues.push("ledger_invalid"); }
    if (options.requireCurrentHead !== false && options.require_current_head !== false && String(ledger.headChecksum || "") !== String(input.ledger_head_checksum || "")) {
      ledgerFresh = false;
      issues.push("ledger_head_changed");
    }
    const currentById = new Map((Array.isArray(ledger.latest) ? ledger.latest : []).map((row: any) => [String(row.summary_id || ""), row]));
    for (const row of selected) {
      const current: any = currentById.get(String(row.summary_id || ""));
      if (!current || String(current.summarizes_message_id || "") !== String(row.summarizes_message_id || "") || String(current.message_checksum || "") !== String(row.message_checksum || "") || String(current.event_checksum || "") !== String(row.event_checksum || "")) {
        selectedSummariesValid = false;
        issues.push("selected_summary_no_longer_current");
        break;
      }
    }
  }
  const renderedPrompt = String(options.renderedPrompt || options.rendered_prompt || "");
  const promptBound = !renderedPrompt || renderedPrompt.includes(String(input.capsule_checksum || ""));
  if (renderedPrompt && !promptBound) issues.push("prompt_missing_capsule_checksum");
  const bindingValid = !issues.some(issue => issue.endsWith("_mismatch") || issue.includes("identity") || issue.includes("attempt") || issue.includes("invocation_kind"));
  return {
    ...input,
    checksum_valid: checksumValid,
    binding_valid: bindingValid,
    ledger_fresh: ledgerFresh,
    selected_summaries_valid: selectedSummariesValid,
    prompt_bound: promptBound,
    trusted_for_delivery: issues.length === 0,
    validation_issues: Array.from(new Set(issues)),
  };
}

function acquireLock(file: string) {
  const lockFile = `${file}.lock`;
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const fd = fs.openSync(lockFile, "wx");
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, hostname: os.hostname(), acquired_at: new Date().toISOString() }), "utf-8");
      fs.fsyncSync(fd);
      return { fd, lockFile };
    } catch (error: any) {
      if (error?.code !== "EEXIST") throw error;
      let stale = false;
      try {
        const owner = JSON.parse(fs.readFileSync(lockFile, "utf-8"));
        const age = Date.now() - fs.statSync(lockFile).mtimeMs;
        stale = age > LOCK_STALE_MS || (String(owner.hostname || "") === os.hostname() && !processAlive(Number(owner.pid || 0)));
      } catch { stale = true; }
      if (!stale) throw new Error("post-turn summary ledger is locked by another process");
      try { fs.unlinkSync(lockFile); } catch {}
    }
  }
  throw new Error("post-turn summary ledger lock contention");
}

function releaseLock(lock: any) {
  try { fs.closeSync(lock.fd); } catch {}
  try { fs.unlinkSync(lock.lockFile); } catch {}
}

function appendDurableLine(file: string, event: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fd = fs.openSync(file, "a");
  try {
    fs.writeFileSync(fd, `${JSON.stringify(event)}\n`, "utf-8");
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
}

function parseLedgerFile(file: string) {
  const rows: any[] = [];
  const issues: any[] = [];
  if (!fs.existsSync(file)) return { rows, issues, valid: true, bytes: 0, headChecksum: "", chainOriginChecksum: "", firstSequence: 0, lastSequence: 0 };
  let previous = "";
  let expectedSequence = 0;
  try {
    const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/).filter(Boolean);
    for (let index = 0; index < lines.length; index += 1) {
      let row: any = null;
      try { row = JSON.parse(lines[index]); } catch { issues.push({ line: index + 1, code: "json_invalid" }); break; }
      if (index === 0) {
        previous = String(row.previous_checksum || "");
        expectedSequence = Number(row.sequence || 1);
      }
      if (row.schema !== GROUP_POST_TURN_SUMMARY_SCHEMA) issues.push({ line: index + 1, code: "schema_invalid" });
      if (Number(row.sequence || 0) !== expectedSequence) issues.push({ line: index + 1, code: "sequence_invalid" });
      if (String(row.previous_checksum || "") !== previous) issues.push({ line: index + 1, code: "chain_invalid" });
      if (String(row.event_checksum || "") !== eventChecksum(row)) issues.push({ line: index + 1, code: "checksum_invalid" });
      rows.push(row);
      previous = String(row.event_checksum || "");
      expectedSequence += 1;
    }
    return {
      rows,
      issues,
      valid: issues.length === 0,
      bytes: fs.statSync(file).size,
      headChecksum: previous,
      chainOriginChecksum: rows.length ? String(rows[0].previous_checksum || "") : "",
      firstSequence: Number(rows[0]?.sequence || 0),
      lastSequence: Number(rows[rows.length - 1]?.sequence || 0),
    };
  } catch {
    return { rows: [], issues: [{ line: 0, code: "read_failed" }], valid: false, bytes: 0, headChecksum: "", chainOriginChecksum: "", firstSequence: 0, lastSequence: 0 };
  }
}

function archiveHotLedger(file: string, parsed: any) {
  if (!fs.existsSync(file) || parsed.rows.length < HOT_EVENT_LIMIT) return { archived: false, previousChecksum: parsed.headChecksum, previousSequence: parsed.lastSequence };
  const suffix = new Date().toISOString().replace(/[:.]/g, "-");
  const archiveFile = `${file}.archive-${String(parsed.firstSequence).padStart(8, "0")}-${String(parsed.lastSequence).padStart(8, "0")}-${suffix}`;
  fs.renameSync(file, archiveFile);
  const archives = fs.readdirSync(path.dirname(file))
    .filter(name => name.startsWith(`${path.basename(file)}.archive-`))
    .sort();
  for (const name of archives.slice(0, Math.max(0, archives.length - ARCHIVE_LIMIT))) {
    try { fs.unlinkSync(path.join(path.dirname(file), name)); } catch {}
  }
  return { archived: true, archiveFile, previousChecksum: parsed.headChecksum, previousSequence: parsed.lastSequence };
}

function messageContent(message: any) {
  return compactText(message?.content || message?.delivery_summary?.headline || message?.receipt?.summary || message?.result || "", 1_200);
}

function stringList(...values: any[]) {
  const result: string[] = [];
  const seen = new Set<any>();
  const visit = (value: any) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (value && typeof value === "object") {
      if (seen.has(value)) return;
      seen.add(value);
      return Object.values(value).forEach(visit);
    }
    const text = compactText(value, 300);
    if (text && !result.includes(text)) result.push(text);
  };
  values.forEach(visit);
  return result;
}

function statusCategory(message: any) {
  const value = String(message?.receipt?.status || message?.delivery_summary?.status || message?.status || "").toLowerCase();
  if (/fail|error/.test(value)) return "failed";
  if (/block/.test(value)) return "blocked";
  if (/wait|pending|clarif/.test(value)) return "waiting";
  if (/review|verify|accept/.test(value)) return "review_ready";
  return "completed";
}

function artifactUrls(message: any, content: string) {
  const values = stringList(message?.artifact_urls, message?.artifactUrls, message?.attachments, message?.files, message?.fileChanges, message?.file_changes);
  const urls = [...content.matchAll(/https?:\/\/[^\s)\]}>,]+/g)].map(match => match[0]);
  return Array.from(new Set([...urls, ...values.filter(value => /^(https?:\/\/|[a-zA-Z]:\\|\/|\.\/)/.test(value))])).slice(0, 12);
}

export function buildGroupPostTurnSummary(groupId: string, sessionId: string, message: any, options: any = {}) {
  if (!groupId || !String(sessionId || "").startsWith("gcs_")) return null;
  if (String(message?.role || "").toLowerCase() !== "assistant") return null;
  const messageId = String(message?.id || message?.message_id || "").trim();
  if (!messageId) return null;
  const content = messageContent(message);
  const blockers = stringList(message?.blockers, message?.receipt?.blockers, message?.delivery_summary?.risks, message?.open_questions);
  const actions = stringList(message?.recent_action, message?.action, message?.tool_calls, message?.files_changed, message?.fileChanges, message?.delivery_summary?.actual_file_changes);
  const status = statusCategory(message);
  const messageChecksum = sha256({ id: messageId, role: message.role, agent: message.agent, taskId: message.task_id || message.taskId || "", content, receipt: message.receipt || null, delivery: message.delivery_summary || null });
  const core: any = {
    group_id: groupId,
    group_session_id: sessionId,
    summarizes_message_id: messageId,
    message_checksum: messageChecksum,
    task_id: String(message?.task_id || message?.taskId || ""),
    agent: String(message?.agent || message?.project || "group-main-agent"),
    status_category: status,
    status_detail: compactText(message?.status_detail || message?.receipt?.summary || message?.delivery_summary?.headline || content, 500),
    is_noteworthy: Boolean(message?.task_id || message?.receipt || message?.delivery_summary || actions.length || blockers.length || status !== "completed"),
    title: compactText(message?.delivery_summary?.headline || message?.receipt?.summary || content || `${message?.agent || "Agent"} turn`, 140),
    description: content,
    recent_action: compactText(actions.join("；"), 500),
    needs_action: compactText(blockers.join("；"), 500),
    artifact_urls: artifactUrls(message, content),
    source_timestamp: String(message?.timestamp || message?.created_at || ""),
    generated_at: String(options.now || new Date().toISOString()),
  };
  return core;
}

export function readGroupPostTurnSummaries(groupId: string, sessionId: string, options: any = {}) {
  const file = ledgerFile(groupId, sessionId);
  const archives = fs.existsSync(path.dirname(file))
    ? fs.readdirSync(path.dirname(file)).filter(name => name.startsWith(`${path.basename(file)}.archive-`)).sort()
    : [];
  const files = [...archives.map(name => path.join(path.dirname(file), name)), file].filter(candidate => fs.existsSync(candidate));
  const parsedFiles = files.map(candidate => ({ file: candidate, ...parseLedgerFile(candidate) }));
  const issues: any[] = [];
  const rows: any[] = [];
  for (let index = 0; index < parsedFiles.length; index += 1) {
    const parsed = parsedFiles[index];
    issues.push(...parsed.issues.map((issue: any) => ({ ...issue, file: parsed.file })));
    if (index > 0 && parsed.rows.length) {
      const previous = parsedFiles[index - 1];
      if (previous.rows.length && parsed.chainOriginChecksum !== previous.headChecksum) {
        issues.push({ file: parsed.file, line: 1, code: "archive_chain_invalid" });
      }
      if (previous.rows.length && parsed.firstSequence !== previous.lastSequence + 1) {
        issues.push({ file: parsed.file, line: 1, code: "archive_sequence_invalid" });
      }
    }
    rows.push(...parsed.rows);
  }
  const latestByMessage = new Map<string, any>();
  for (const row of rows) latestByMessage.set(String(row.summarizes_message_id || ""), row);
  const limit = Math.max(1, Math.min(10_000, Number(options.limit || 40)));
  const lastParsed = parsedFiles[parsedFiles.length - 1];
  const firstParsed = parsedFiles[0];
  return {
    schema: "ccm-group-post-turn-summary-ledger-v1",
    version: 1,
    groupId,
    groupSessionId: sessionId,
    file,
    valid: issues.length === 0,
    issues,
    eventCount: rows.length,
    summaryCount: latestByMessage.size,
    bytes: parsedFiles.reduce((sum, parsed) => sum + Number(parsed.bytes || 0), 0),
    headChecksum: lastParsed?.headChecksum || "",
    chainOriginChecksum: firstParsed?.chainOriginChecksum || "",
    firstSequence: firstParsed?.firstSequence || 0,
    lastSequence: lastParsed?.lastSequence || 0,
    archiveCount: archives.length,
    latest: Array.from(latestByMessage.values()).slice(-limit),
  };
}

export function recordGroupPostTurnSummary(groupId: string, sessionId: string, message: any, options: any = {}) {
  const summary = buildGroupPostTurnSummary(groupId, sessionId, message, options);
  if (!summary) return { recorded: false, reason: "assistant_gcs_message_required" };
  const file = ledgerFile(groupId, sessionId);
  const lock = acquireLock(file);
  try {
    let parsed = parseLedgerFile(file);
    if (!parsed.valid) throw new Error("post-turn summary ledger checksum mismatch");
    const completeLedger = readGroupPostTurnSummaries(groupId, sessionId, { limit: 10_000 });
    if (!completeLedger.valid) throw new Error("post-turn summary archive chain checksum mismatch");
    const latest = [...completeLedger.latest].reverse().find(row => String(row.summarizes_message_id || "") === summary.summarizes_message_id);
    if (latest && String(latest.message_checksum || "") === summary.message_checksum) return { recorded: false, idempotent: true, reason: "summary_already_recorded", summary: latest, ledger: readGroupPostTurnSummaries(groupId, sessionId) };
    const rotation = archiveHotLedger(file, parsed);
    if (rotation.archived) parsed = parseLedgerFile(file);
    const previousChecksum = rotation.archived ? rotation.previousChecksum : parsed.headChecksum;
    const previousSequence = rotation.archived ? rotation.previousSequence : parsed.lastSequence;
    const event: any = {
      schema: GROUP_POST_TURN_SUMMARY_SCHEMA,
      version: 1,
      summary_id: `gpts_${sha256(`${groupId}\n${sessionId}\n${summary.summarizes_message_id}\n${summary.message_checksum}`, 24)}`,
      sequence: Number(previousSequence || 0) + 1,
      previous_checksum: String(previousChecksum || ""),
      supersedes_summary_id: String(latest?.summary_id || ""),
      ...summary,
    };
    event.event_checksum = eventChecksum(event);
    appendDurableLine(file, event);
    return { recorded: true, summary: event, ledger: readGroupPostTurnSummaries(groupId, sessionId) };
  } finally { releaseLock(lock); }
}

export function backfillGroupPostTurnSummaries(groupId: string, sessionId: string, messages: any[] = [], options: any = {}) {
  if (!groupId || !String(sessionId || "").startsWith("gcs_")) return { recorded: 0, skipped: messages.length, reason: "gcs_session_required", ledger: null };
  let recorded = 0;
  let skipped = 0;
  const maxMessages = Math.max(1, Math.min(2_000, Number(options.maxMessages || options.max_messages || 500)));
  for (const message of messages.slice(-maxMessages)) {
    if (String(message?.role || "").toLowerCase() !== "assistant") { skipped += 1; continue; }
    const result = recordGroupPostTurnSummary(groupId, sessionId, message, options);
    if (result.recorded) recorded += 1; else skipped += 1;
  }
  return { recorded, skipped, ledger: readGroupPostTurnSummaries(groupId, sessionId, options) };
}

export function deleteGroupPostTurnSummaryArtifacts(groupId: string, sessionId: string) {
  if (!groupId || !String(sessionId || "").startsWith("gcs_")) return { deleted: [], deletedCount: 0 };
  const file = ledgerFile(groupId, sessionId);
  const deleted: string[] = [];
  const candidates = [file, `${file}.lock`];
  try {
    for (const name of fs.readdirSync(path.dirname(file))) {
      if (name.startsWith(`${path.basename(file)}.archive-`)) candidates.push(path.join(path.dirname(file), name));
    }
  } catch {}
  for (const target of candidates) {
    try { if (fs.existsSync(target)) { fs.unlinkSync(target); deleted.push(target); } } catch {}
  }
  return { deleted, deletedCount: deleted.length };
}
