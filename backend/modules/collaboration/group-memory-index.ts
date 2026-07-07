import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";

export const GROUP_TYPED_MEMORY_VERSION = 1;
export const GROUP_TYPED_MEMORY_ENTRYPOINT = "MEMORY.md";
export const GROUP_TYPED_MEMORY_MAX_INDEX_LINES = 200;
export const GROUP_TYPED_MEMORY_MAX_INDEX_BYTES = 25_000;
export const GROUP_TYPED_MEMORY_MAX_RECALL = 5;
export const GROUP_TYPED_MEMORY_RECALL_LEDGER = ".recall-ledger.json";
export const GROUP_TYPED_MEMORY_LOAD_PLAN_VERSION = 1;
export const GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_ENTRIES = 80;
export const GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_INCLUDE_DEPTH = 5;
export const GROUP_PROJECT_MEMORY_IMPORT_VERSION = 1;
export const GROUP_GLOBAL_CLAUDE_MEMORY_IMPORT_VERSION = 1;
export const GROUP_CLAUDE_MEMORY_INCLUDE_AUDIT_VERSION = 1;
export const GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION = 1;
export const GROUP_CLAUDE_MEMORY_SETTING_SOURCE_POLICY_VERSION = 1;
export const GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION = 1;
export const GROUP_TYPED_MEMORY_DISTILLATION_VERSION = 1;
export const GROUP_TYPED_MEMORY_DISTILLATION_LEDGER = ".distillation-ledger.json";
export const GROUP_TYPED_MEMORY_DISTILLATION_MAX_MESSAGES = 1200;
export const GROUP_TYPED_MEMORY_DISTILLATION_FACT_LIMIT = 100;
export const GROUP_TYPED_MEMORY_DISTILLATION_QUALITY_VERSION = 1;
export const GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_LEDGER = ".claude-external-include-approvals.json";
export const GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_LEDGER = ".instructions-loaded-hooks.json";

export type GroupTypedMemoryType = "user" | "feedback" | "project" | "reference";

const GROUP_TYPED_MEMORY_DIR = path.join(CCM_DIR, "group-memory-md");
const VALID_TYPES = new Set<GroupTypedMemoryType>(["user", "feedback", "project", "reference"]);
const CLAUDE_EDITABLE_SETTING_SOURCES = ["userSettings", "projectSettings", "localSettings"] as const;
const CLAUDE_ALWAYS_ON_SETTING_SOURCES = ["policySettings", "flagSettings"] as const;
const CLAUDE_MEMORY_INCLUDE_TEXT_EXTENSIONS = new Set([
  ".md", ".txt", ".text", ".json", ".yaml", ".yml", ".toml", ".xml", ".csv",
  ".html", ".htm", ".css", ".scss", ".sass", ".less",
  ".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs",
  ".py", ".rb", ".go", ".rs", ".java", ".kt", ".kts", ".cs", ".php",
  ".sh", ".bash", ".zsh", ".fish", ".ps1", ".bat", ".cmd",
  ".sql", ".graphql", ".gql", ".proto", ".ini", ".cfg", ".conf",
]);
const groupMemoryInstructionsLoadedHooks = new Set<(input: any) => any>();

function now() {
  return new Date().toISOString();
}

function safeSegment(value: any, fallback = "unknown") {
  const text = String(value || "").trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
  return text || fallback;
}

function normalizeMemoryType(value: any): GroupTypedMemoryType {
  const type = String(value || "").trim().toLowerCase() as GroupTypedMemoryType;
  return VALID_TYPES.has(type) ? type : "project";
}

function normalizeClaudeSettingSourceName(value: any) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (["user", "userSettings"].includes(text)) return "userSettings";
  if (["project", "projectSettings"].includes(text)) return "projectSettings";
  if (["local", "localSettings"].includes(text)) return "localSettings";
  if (["policy", "managed", "managedSettings", "policySettings"].includes(text)) return "policySettings";
  if (["flag", "cli", "flagSettings"].includes(text)) return "flagSettings";
  return "";
}

function parseClaudeSettingSources(value: any) {
  if (value === undefined || value === null) return null;
  const raw = Array.isArray(value)
    ? value
    : String(value).trim() === ""
      ? []
      : String(value).split(",").map(item => item.trim());
  const enabled: string[] = [];
  const invalid: string[] = [];
  for (const item of raw) {
    const normalized = normalizeClaudeSettingSourceName(item);
    if (normalized) enabled.push(normalized);
    else if (String(item || "").trim()) invalid.push(String(item));
  }
  return { enabled: [...new Set(enabled)], invalid };
}

export function buildClaudeMemorySettingSourcePolicy(options: any = {}) {
  const configured = parseClaudeSettingSources(options.settingSources ?? options.setting_sources ?? process.env.CCM_CLAUDE_SETTING_SOURCES);
  const editable = configured
    ? configured.enabled.filter(source => (CLAUDE_EDITABLE_SETTING_SOURCES as readonly string[]).includes(source))
    : [...CLAUDE_EDITABLE_SETTING_SOURCES];
  const enabled = new Set<string>([
    ...editable,
    ...CLAUDE_ALWAYS_ON_SETTING_SOURCES,
    ...(configured?.enabled || []).filter(source => (CLAUDE_ALWAYS_ON_SETTING_SOURCES as readonly string[]).includes(source)),
  ]);
  const explicitDisable = (camel: string, snake: string) => options[camel] === false || options[snake] === false;
  const policy = {
    schema: "ccm-claude-memory-setting-source-policy-v1",
    version: GROUP_CLAUDE_MEMORY_SETTING_SOURCE_POLICY_VERSION,
    configured: configured ? configured.enabled : null,
    invalid: configured?.invalid || [],
    enabled: [...enabled],
    disabled: [...CLAUDE_EDITABLE_SETTING_SOURCES, ...CLAUDE_ALWAYS_ON_SETTING_SOURCES].filter(source => !enabled.has(source)),
    isolationMode: configured !== null && editable.length === 0,
    includeUser: enabled.has("userSettings") && !explicitDisable("includeUser", "include_user"),
    includeProject: enabled.has("projectSettings") && !explicitDisable("includeProject", "include_project"),
    includeLocal: enabled.has("localSettings") && !explicitDisable("includeLocal", "include_local"),
    includeManaged: enabled.has("policySettings") && !explicitDisable("includeManaged", "include_managed"),
    includeFlagSettings: enabled.has("flagSettings"),
    order: ["userSettings", "projectSettings", "localSettings", "flagSettings", "policySettings"],
  };
  return policy;
}

function compactText(value: any, max = 1000) {
  const text = String(value || "").replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
  if (text.length <= max) return text;
  const head = Math.max(1, Math.floor(max * 0.65));
  const tail = Math.max(1, max - head - 32);
  return `${text.slice(0, head)}\n...[typed-memory truncated]...\n${text.slice(-tail)}`;
}

function uniqueStrings(values: any[] = [], limit = 20) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = compactText(raw, 500);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function checksum(value: any, length = 16) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, length);
}

function ensureGroupTypedMemoryDir(groupId: string) {
  const dir = getGroupTypedMemoryDir(groupId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeTextAtomic(file: string, content: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    if (fs.existsSync(file) && fs.readFileSync(file, "utf-8") === content) return false;
  } catch {}
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, content, "utf-8");
  fs.renameSync(temp, file);
  return true;
}

function readJson(file: string, fallback: any) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return fallback; }
}

function writeJsonAtomic(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

function yamlEscape(value: any) {
  return JSON.stringify(value == null ? "" : value);
}

function renderFrontmatter(meta: any) {
  const ordered = [
    "name", "description", "type", "source", "paths", "group_id", "updated_at", "checksum",
  ];
  const lines = ["---"];
  for (const key of ordered) {
    if (meta[key] === undefined || meta[key] === null) continue;
    lines.push(`${key}: ${yamlEscape(meta[key])}`);
  }
  lines.push("---");
  return lines.join("\n");
}

function parseFrontmatter(content: string) {
  const text = String(content || "");
  if (!text.startsWith("---")) return { meta: {}, body: text.trim() };
  const end = text.indexOf("\n---", 3);
  if (end < 0) return { meta: {}, body: text.trim() };
  const raw = text.slice(3, end).trim();
  const meta: any = {};
  for (const line of raw.split(/\n+/)) {
    const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const value = match[2].trim();
    try { meta[match[1]] = JSON.parse(value); } catch { meta[match[1]] = value.replace(/^"|"$/g, ""); }
  }
  return { meta, body: text.slice(end + 4).trim() };
}

function normalizePathGlobs(value: any) {
  const raw = Array.isArray(value)
    ? value
    : String(value || "").split(/[,;\n]+/);
  return raw
    .map(item => String(item || "").trim().replace(/\\/g, "/"))
    .map(item => item.endsWith("/**") ? item.slice(0, -3) : item)
    .filter(item => item && item !== "**")
    .slice(0, 40);
}

function normalizeTargetPath(value: any) {
  return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\/+/, "");
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

function globToRegExp(pattern: string) {
  const normalized = normalizeTargetPath(pattern);
  let out = "^";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    const afterNext = normalized[index + 2];
    if (char === "*" && next === "*" && afterNext === "/") {
      out += "(?:.*/)?";
      index += 2;
    } else if (char === "*" && next === "*") {
      out += ".*";
      index += 1;
    } else if (char === "*") {
      out += "[^/]*";
    } else if ("\\^$+?.()|{}[]".includes(char)) {
      out += `\\${char}`;
    } else {
      out += char;
    }
  }
  out += "$";
  return new RegExp(out, "i");
}

function pathMatchesTypedMemoryGlobs(targetPath: string, globs: any[] = []) {
  const target = normalizeTargetPath(targetPath);
  if (!target) return false;
  for (const rawPattern of normalizePathGlobs(globs)) {
    const pattern = normalizeTargetPath(rawPattern);
    if (!pattern) continue;
    if (pattern.endsWith("/")) {
      if (target.startsWith(pattern)) return true;
      continue;
    }
    if (!pattern.includes("*") && (target === pattern || target.startsWith(`${pattern}/`) || target.endsWith(`/${pattern}`))) return true;
    if (globToRegExp(pattern).test(target)) return true;
  }
  return false;
}

function evaluateTypedMemoryPathCondition(doc: any, targetPaths: any[] = []) {
  const globs = normalizePathGlobs(doc?.paths || doc?.pathGlobs || doc?.globs || []);
  if (!globs.length) return { conditional: false, matched: true, matchedPaths: [], globs };
  const paths = deriveGroupTypedMemoryTargetPaths("", targetPaths);
  const matchedPaths = paths.filter(targetPath => pathMatchesTypedMemoryGlobs(targetPath, globs));
  return {
    conditional: true,
    matched: matchedPaths.length > 0,
    matchedPaths,
    globs,
  };
}

function listMemoryMarkdownFiles(groupId: string) {
  const dir = getGroupTypedMemoryDir(groupId);
  try {
    return fs.readdirSync(dir)
      .filter(name => name.toLowerCase().endsWith(".md") && name !== GROUP_TYPED_MEMORY_ENTRYPOINT)
      .map(name => path.join(dir, name));
  } catch {
    return [];
  }
}

function tokens(value: any) {
  const text = String(value || "").toLowerCase();
  const result = new Set<string>();
  for (const match of text.matchAll(/[a-z0-9_./\\:-]{3,}/g)) result.add(match[0]);
  const chinese = text.replace(/[^\u3400-\u9fff]/g, "");
  for (let index = 0; index < chinese.length - 1; index += 1) result.add(chinese.slice(index, index + 2));
  return [...result].slice(0, 200);
}

function extractSnippet(body: string, queryTokens: string[], max = 700) {
  const lines = String(body || "").split(/\n+/).filter(Boolean);
  const scored = lines.map((line, index) => ({
    line,
    index,
    score: queryTokens.reduce((sum, token) => sum + (line.toLowerCase().includes(token) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score || a.index - b.index);
  const picked = (scored[0]?.score ? scored.slice(0, 4).sort((a, b) => a.index - b.index).map(item => item.line) : lines.slice(0, 4)).join("\n");
  return compactText(picked, max);
}

function normalizePostCompactCandidateUsageHints(input: any = {}) {
  const usage = input.postCompactCandidateUsage
    || input.post_compact_candidate_usage
    || input.candidateUsage
    || input.candidate_usage
    || {};
  const rows = [
    ...(Array.isArray(usage.useful_candidates || usage.usefulCandidates) ? (usage.useful_candidates || usage.usefulCandidates) : []),
    ...(Array.isArray(usage.ignored_candidates || usage.ignoredCandidates) ? (usage.ignored_candidates || usage.ignoredCandidates) : []),
    ...(Array.isArray(usage.missing_usage_candidates || usage.missingUsageCandidates) ? (usage.missing_usage_candidates || usage.missingUsageCandidates) : []),
    ...(Array.isArray(usage.rows) ? usage.rows : []),
  ];
  return rows.map((row: any) => {
    const candidateId = String(row.candidate_id || row.candidateId || "").trim();
    const value = compactText(row.value || "", 260);
    const recommendation = String(row.recommendation || "").trim()
      || (Number(row.used_count || 0) + Number(row.verified_count || 0) > Number(row.ignored_count || 0)
        ? "promote_recall"
        : Number(row.ignored_count || 0) > Number(row.used_count || 0) + Number(row.verified_count || 0)
          ? "deprioritize_or_distill"
          : Number(row.mentioned_count || 0) > 0 ? "require_usage_receipt" : "neutral_verify_current_context");
    return {
      candidate_id: candidateId,
      value,
      recommendation,
      used_count: Number(row.used_count || 0),
      verified_count: Number(row.verified_count || 0),
      ignored_count: Number(row.ignored_count || 0),
      mentioned_count: Number(row.mentioned_count || 0),
    };
  }).filter((row: any) => row.candidate_id || row.value);
}

function scorePostCompactCandidateUsageHint(corpus: string, hints: any[] = []) {
  const matched: any[] = [];
  let adjustment = 0;
  for (const hint of hints) {
    const candidateId = String(hint.candidate_id || "").toLowerCase();
    const value = String(hint.value || "").toLowerCase();
    const matches = (!!candidateId && corpus.includes(candidateId)) || (!!value && corpus.includes(value));
    if (!matches) continue;
    let delta = 0;
    if (hint.recommendation === "promote_recall") delta = 8 + Math.min(6, hint.used_count + hint.verified_count);
    else if (hint.recommendation === "deprioritize_or_distill") delta = -8 - Math.min(6, hint.ignored_count);
    else if (hint.recommendation === "require_usage_receipt") delta = 2;
    else delta = 3;
    adjustment += delta;
    matched.push({
      candidate_id: hint.candidate_id,
      value: hint.value,
      recommendation: hint.recommendation,
      delta,
    });
  }
  return { adjustment, matched };
}

function truncateIndexContent(content: string) {
  let lines = content.split("\n").slice(0, GROUP_TYPED_MEMORY_MAX_INDEX_LINES);
  let text = lines.join("\n");
  const maxBytes = GROUP_TYPED_MEMORY_MAX_INDEX_BYTES;
  while (Buffer.byteLength(text, "utf-8") > maxBytes && lines.length > 1) {
    lines = lines.slice(0, -1);
    text = lines.join("\n");
  }
  if (content !== text) text += "\n- [index truncated] More typed memories exist on disk.";
  return text;
}

function markdownLinkTitle(value: any) {
  return String(value || "").replace(/[\[\]\n\r]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "Untitled memory";
}

function renderMemoryDocument(input: any) {
  const type = normalizeMemoryType(input.type);
  const body = compactText(input.body || input.content || "", Number(input.maxBodyChars || 12_000));
  const meta = {
    name: markdownLinkTitle(input.name || input.title),
    description: compactText(input.description || body.split(/\n+/)[0] || "", 220),
    type,
    source: String(input.source || "manual"),
    paths: normalizePathGlobs(input.paths || input.pathGlobs || input.globs || []),
    group_id: String(input.groupId || input.group_id || ""),
    updated_at: String(input.updatedAt || input.updated_at || now()),
    checksum: checksum([type, input.name, input.description, body], 24),
  };
  return `${renderFrontmatter(meta)}\n\n${body}\n`;
}

export function getGroupTypedMemoryDir(groupId: string) {
  return path.join(GROUP_TYPED_MEMORY_DIR, safeSegment(groupId));
}

export function getGroupTypedMemoryIndexFile(groupId: string) {
  return path.join(getGroupTypedMemoryDir(groupId), GROUP_TYPED_MEMORY_ENTRYPOINT);
}

export function getGroupTypedMemoryRecallLedgerFile(groupId: string) {
  return path.join(getGroupTypedMemoryDir(groupId), GROUP_TYPED_MEMORY_RECALL_LEDGER);
}

export function getGroupTypedMemoryDistillationLedgerFile(groupId: string) {
  return path.join(getGroupTypedMemoryDir(groupId), GROUP_TYPED_MEMORY_DISTILLATION_LEDGER);
}

export function getGroupClaudeInstructionsLoadedHookLedgerFile(groupId: string) {
  return path.join(getGroupTypedMemoryDir(groupId), GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_LEDGER);
}

export function registerGroupMemoryInstructionsLoadedHook(hook: (input: any) => any) {
  if (typeof hook !== "function") throw new Error("InstructionsLoaded hook must be a function");
  groupMemoryInstructionsLoadedHooks.add(hook);
  return () => groupMemoryInstructionsLoadedHooks.delete(hook);
}

export function hasGroupMemoryInstructionsLoadedHook() {
  return groupMemoryInstructionsLoadedHooks.size > 0;
}

export function loadGroupClaudeInstructionsLoadedHookLedger(groupId: string) {
  const file = getGroupClaudeInstructionsLoadedHookLedgerFile(groupId);
  const parsed = readJson(file, {});
  return {
    schema: "ccm-claude-instructions-loaded-hook-ledger-v1",
    version: GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
    groupId,
    file,
    entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
    updatedAt: String(parsed?.updatedAt || ""),
  };
}

function writeGroupClaudeInstructionsLoadedHookLedger(groupId: string, ledger: any) {
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
  const event = {
    schema: "ccm-claude-instructions-loaded-hook-event-v1",
    version: GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
    groupId,
    hook_event_name: "InstructionsLoaded",
    file_path: String(input.filePath || input.file_path || ""),
    memory_type: String(input.memoryType || input.memory_type || "Project"),
    load_reason: String(input.loadReason || input.load_reason || "context_bundle"),
    globs: normalizePathGlobs(input.globs || input.paths || []),
    trigger_file_path: String(input.triggerFilePath || input.trigger_file_path || ""),
    parent_file_path: String(input.parentFilePath || input.parent_file_path || ""),
    source: String(input.source || ""),
    scope: String(input.scope || ""),
    kind: String(input.kind || ""),
    rel_path: String(input.relPath || input.rel_path || ""),
    firedAt: now(),
  };
  const rows: any[] = [];
  let index = 0;
  for (const hook of groupMemoryInstructionsLoadedHooks) {
    const startedAt = Date.now();
    try {
      const output = hook(event);
      const returnedPromise = !!output && typeof output.then === "function";
      rows.push({
        hookIndex: index,
        status: returnedPromise ? "async_not_awaited" : "ok",
        durationMs: Date.now() - startedAt,
        result: returnedPromise ? "Promise returned by sync pipeline" : compactText(JSON.stringify(output ?? null), 1000),
      });
    } catch (error: any) {
      rows.push({
        hookIndex: index,
        status: "error",
        durationMs: Date.now() - startedAt,
        error: compactText(error?.message || error, 1000),
      });
    }
    index += 1;
  }
  const summary = {
    schema: "ccm-claude-instructions-loaded-hook-execution-v1",
    version: GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
    groupId,
    configured: groupMemoryInstructionsLoadedHooks.size > 0,
    hookCount: groupMemoryInstructionsLoadedHooks.size,
    event,
    rows,
    firedCount: rows.length,
    failureCount: rows.filter(row => row.status === "error").length,
    ledgerFile: getGroupClaudeInstructionsLoadedHookLedgerFile(groupId),
  };
  if (summary.configured) {
    const ledger = loadGroupClaudeInstructionsLoadedHookLedger(groupId);
    writeGroupClaudeInstructionsLoadedHookLedger(groupId, {
      ...ledger,
      entries: [...(ledger.entries || []), summary],
    });
  }
  return summary;
}

export function getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId: string) {
  return path.join(getGroupTypedMemoryDir(groupId), GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_LEDGER);
}

function normalizeExternalIncludeApprovalPath(file: any) {
  const text = String(file || "").trim();
  return text ? path.resolve(text).replace(/\\/g, "/") : "";
}

function externalIncludeApprovalKey(file: any) {
  return checksum(normalizeExternalIncludeApprovalPath(file), 24);
}

export function loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId: string) {
  const file = getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId);
  const parsed = readJson(file, {});
  return {
    schema: "ccm-claude-memory-external-include-approval-ledger-v1",
    version: GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION,
    groupId,
    file,
    hasExternalIncludesApproved: parsed?.hasExternalIncludesApproved === true,
    hasExternalIncludesWarningShown: parsed?.hasExternalIncludesWarningShown === true,
    warningShownAt: String(parsed?.warningShownAt || ""),
    approved: Array.isArray(parsed?.approved) ? parsed.approved : [],
    warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
    updatedAt: String(parsed?.updatedAt || ""),
  };
}

function writeGroupClaudeMemoryExternalIncludeApprovalLedger(groupId: string, ledger: any) {
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
  const ledger = loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId);
  const includes = Array.isArray(input.includes)
    ? input.includes
    : Array.isArray(input.paths)
      ? input.paths.map((item: any) => ({ path: item }))
      : [input];
  const approvedBy = String(input.approvedBy || input.approved_by || "local-user");
  const approveAll = input.approveAll === true || input.approve_all === true || input.hasExternalIncludesApproved === true;
  const approved = new Map<string, any>();
  for (const item of ledger.approved || []) {
    if (!item?.key) continue;
    approved.set(String(item.key), item);
  }
  for (const item of includes) {
    const includePath = normalizeExternalIncludeApprovalPath(item?.path || item?.ref || item);
    if (!includePath) continue;
    const key = externalIncludeApprovalKey(includePath);
    approved.set(key, {
      key,
      path: includePath,
      parent: String(item?.parent || item?.from || input.parent || ""),
      scope: String(item?.scope || input.scope || ""),
      kind: String(item?.kind || input.kind || ""),
      approvedBy,
      approvedAt: now(),
    });
  }
  return writeGroupClaudeMemoryExternalIncludeApprovalLedger(groupId, {
    ...ledger,
    hasExternalIncludesApproved: ledger.hasExternalIncludesApproved === true || approveAll,
    approved: [...approved.values()],
  });
}

export function markGroupClaudeMemoryExternalIncludeWarningShown(groupId: string, input: any = {}) {
  const ledger = loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId);
  const includes = Array.isArray(input.includes) ? input.includes : [];
  const warnings = [...(ledger.warnings || []), {
    shownAt: now(),
    actor: String(input.actor || "system"),
    count: Number(input.count || includes.length || 0),
    includes: includes.slice(0, 40).map((item: any) => ({
      path: normalizeExternalIncludeApprovalPath(item?.path || item?.ref || item),
      parent: String(item?.parent || item?.from || ""),
      scope: String(item?.scope || ""),
      kind: String(item?.kind || ""),
    })),
  }];
  return writeGroupClaudeMemoryExternalIncludeApprovalLedger(groupId, {
    ...ledger,
    hasExternalIncludesWarningShown: true,
    warningShownAt: ledger.warningShownAt || now(),
    warnings,
  });
}

export function upsertGroupTypedMemoryDocument(groupId: string, input: any) {
  const dir = ensureGroupTypedMemoryDir(groupId);
  const type = normalizeMemoryType(input.type);
  const name = markdownLinkTitle(input.name || input.title || type);
  const slug = safeSegment(input.slug || `${type}-${name.toLowerCase()}`, `${type}-memory`);
  const file = path.join(dir, `${slug}.md`);
  const content = renderMemoryDocument({ ...input, type, name, groupId });
  const changed = writeTextAtomic(file, content);
  return { file, changed, slug, type, name };
}

function listMarkdownFilesRecursive(dir: string, options: any = {}) {
  const maxFiles = Math.max(1, Math.min(300, Number(options.maxFiles || options.max_files || 80)));
  const result: string[] = [];
  const visit = (current: string) => {
    if (result.length >= maxFiles) return;
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (result.length >= maxFiles) break;
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) result.push(file);
    }
  };
  visit(dir);
  return result;
}

function projectMemoryRelPath(projectRoot: string, file: string) {
  const rel = path.relative(projectRoot, file).replace(/\\/g, "/");
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel) ? rel : path.basename(file);
}

function executeInstructionsLoadedHooksForImportedClaudeMemory(groupId: string, items: any[] = [], options: any = {}) {
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
  const root = path.resolve(String(projectRoot || ""));
  const settingSourcePolicy = buildClaudeMemorySettingSourcePolicy(options);
  const includeProject = settingSourcePolicy.includeProject;
  const includeLocal = settingSourcePolicy.includeLocal;
  const maxParentDepth = Math.max(0, Math.min(12, Number(options.maxParentDepth || options.max_parent_depth || 0)));
  const maxRuleFiles = Math.max(1, Math.min(300, Number(options.maxRuleFiles || options.max_rule_files || 80)));
  if (!root || !fs.existsSync(root)) {
    return {
      schema: "ccm-project-memory-discovery-v1",
      version: 1,
      projectRoot: root,
      status: "missing_project_root",
      settingSourcePolicy,
      files: [],
      issues: [{ type: "missing_project_root", path: root }],
    };
  }
  const dirs: string[] = [];
  let current = root;
  for (let depth = 0; depth <= maxParentDepth; depth += 1) {
    dirs.push(current);
    const parent = path.dirname(current);
    if (!parent || parent === current) break;
    current = parent;
  }
  const files: any[] = [];
  const issues: any[] = [];
  const seen = new Set<string>();
  const addFile = (file: string, kind: string, baseDir: string) => {
    const resolved = path.resolve(file);
    const key = normalizeFileKey(resolved);
    if (seen.has(key)) return;
    seen.add(key);
    if (!fs.existsSync(resolved)) return;
    try {
      const stat = fs.statSync(resolved);
      if (!stat.isFile()) return;
      const content = fs.readFileSync(resolved, "utf-8");
      const parsed = parseFrontmatter(content);
      files.push({
        file: resolved,
        relPath: projectMemoryRelPath(root, resolved),
        baseDir,
        kind,
        memoryType: kind === "local" ? "local" : "project",
        name: parsed.meta.name || path.basename(resolved),
        description: parsed.meta.description || compactText(parsed.body.split(/\n+/).find(Boolean) || "", 180),
        paths: normalizePathGlobs(parsed.meta.paths || parsed.meta.path_globs || parsed.meta.globs || []),
        bytes: stat.size,
        mtimeMs: stat.mtimeMs,
        checksum: checksum(content, 24),
        body: parsed.body || content,
      });
    } catch (error: any) {
      issues.push({ type: "unreadable_project_memory", path: resolved, error: compactText(error?.message || error, 260) });
    }
  };
  for (const dir of dirs.reverse()) {
    if (includeProject) {
      addFile(path.join(dir, "CLAUDE.md"), "project", dir);
      addFile(path.join(dir, ".claude", "CLAUDE.md"), "project", dir);
      const rulesDir = path.join(dir, ".claude", "rules");
      for (const file of listMarkdownFilesRecursive(rulesDir, { maxFiles: maxRuleFiles })) addFile(file, "project_rule", dir);
    }
    if (includeLocal) addFile(path.join(dir, "CLAUDE.local.md"), "local", dir);
  }
  return {
    schema: "ccm-project-memory-discovery-v1",
    version: 1,
    projectRoot: root,
    status: files.length ? "found" : "empty",
    settingSourcePolicy,
    includeProject,
    includeLocal,
    maxParentDepth,
    maxRuleFiles,
    discoveredCount: files.length,
    files,
    issues,
  };
}

export function importProjectMemoryFilesToGroupTypedMemory(groupId: string, projectRoot: string, options: any = {}) {
  const discovery = discoverProjectMemoryFiles(projectRoot, options);
  const projectName = safeSegment(options.project || options.projectName || options.project_name || path.basename(String(projectRoot || "project")), "project");
  const maxImportFiles = Math.max(1, Math.min(300, Number(options.maxImportFiles || options.max_import_files || 80)));
  const includeAudit = buildClaudeMemoryIncludeExpansion(discovery.files || [], {
    groupId,
    allowedRoots: [discovery.projectRoot],
    allowExternalIncludes: options.allowExternalIncludes === true || options.allow_external_includes === true,
    maxIncludeDepth: options.maxIncludeDepth || options.max_include_depth,
  });
  const importItems = [...(discovery.files || []), ...(includeAudit.files || [])];
  const boundedImportItems = importItems.slice(0, maxImportFiles);
  const writes: any[] = [];
  const skipped: any[] = [];
  for (const item of boundedImportItems) {
    const rel = String(item.relPath || path.basename(item.file || "memory.md"));
    const slug = safeSegment(`project-${projectName}-${rel.replace(/\.md$/i, "")}`, `project-${projectName}-memory`);
    const titlePrefix = item.includeParentFile
      ? "Project Memory Include"
      : item.kind === "local" ? "Local Project Memory" : item.kind === "project_rule" ? "Project Rule" : "Project Memory";
    const body = [
      `# ${titlePrefix}: ${rel}`,
      "",
      `Imported from ${item.file}`,
      item.includeParentFile ? `Included by ${item.includeParentFile}` : "",
      item.includeDepth ? `Include depth: ${item.includeDepth}` : "",
      "",
      neutralizeClaudeMemoryIncludeRefs(item.body || ""),
    ].filter(line => line !== "").join("\n");
    const write = upsertGroupTypedMemoryDocument(groupId, {
      type: item.kind === "local" ? "project" : "reference",
      slug,
      name: `${titlePrefix}: ${rel}`,
      description: item.description || `${titlePrefix} imported from ${rel}`,
      source: `project-memory:${projectName}:${item.kind}:${rel}`,
      paths: item.paths || [],
      updatedAt: new Date(Number(item.mtimeMs || Date.now())).toISOString(),
      body,
    });
    writes.push({ ...write, sourceFile: item.file, relPath: rel, kind: item.kind, paths: item.paths || [], checksum: item.checksum, includeParentFile: item.includeParentFile || "", includeDepth: Number(item.includeDepth || 0) });
  }
  if (importItems.length > maxImportFiles) {
    skipped.push({ type: "max_import_files", count: importItems.length - maxImportFiles });
  }
  const instructionsLoadedHooks = executeInstructionsLoadedHooksForImportedClaudeMemory(groupId, boundedImportItems, {
    ...options,
    loadReason: options.instructionsLoadReason || options.instructions_load_reason || "project_memory_import",
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-project-memory-import-v1",
    version: GROUP_PROJECT_MEMORY_IMPORT_VERSION,
    groupId,
    project: projectName,
    projectRoot: discovery.projectRoot,
    status: discovery.status === "missing_project_root" ? "missing_project_root" : "imported",
    settingSourcePolicy: discovery.settingSourcePolicy,
    includeProject: discovery.includeProject,
    includeLocal: discovery.includeLocal,
    discoveredCount: discovery.discoveredCount || 0,
    importedCount: writes.length,
    instructionsLoadedHooks,
    includeAudit: {
      ...includeAudit,
      files: undefined,
      importedIncludeCount: writes.filter(item => Number(item.includeDepth || 0) > 0).length,
    },
    skipped,
    issues: [...(discovery.issues || []), ...(includeAudit.issues || [])],
    writes,
    index,
    importedAt: now(),
  };
}

function defaultManagedClaudeMemoryRoot() {
  if (process.env.CCM_MANAGED_CLAUDE_MEMORY_DIR) return process.env.CCM_MANAGED_CLAUDE_MEMORY_DIR;
  if (process.env.CLAUDE_CODE_MANAGED_SETTINGS_PATH) return process.env.CLAUDE_CODE_MANAGED_SETTINGS_PATH;
  if (process.platform === "win32") return "C:\\Program Files\\ClaudeCode";
  if (process.platform === "darwin") return "/Library/Application Support/ClaudeCode";
  return "/etc/claude-code";
}

function defaultUserClaudeMemoryRoot() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
}

export function discoverGlobalClaudeMemoryFiles(options: any = {}) {
  const settingSourcePolicy = buildClaudeMemorySettingSourcePolicy(options);
  const includeUser = settingSourcePolicy.includeUser;
  const includeManaged = settingSourcePolicy.includeManaged;
  const userRoot = path.resolve(String(options.userRoot || options.user_root || defaultUserClaudeMemoryRoot()));
  const managedRoot = path.resolve(String(options.managedRoot || options.managed_root || defaultManagedClaudeMemoryRoot()));
  const maxRuleFiles = Math.max(1, Math.min(300, Number(options.maxRuleFiles || options.max_rule_files || 80)));
  const files: any[] = [];
  const issues: any[] = [];
  const seen = new Set<string>();
  const addFile = (file: string, scope: string, kind: string, root: string) => {
    const resolved = path.resolve(file);
    const key = normalizeFileKey(resolved);
    if (seen.has(key)) return;
    seen.add(key);
    if (!fs.existsSync(resolved)) return;
    try {
      const stat = fs.statSync(resolved);
      if (!stat.isFile()) return;
      const content = fs.readFileSync(resolved, "utf-8");
      const parsed = parseFrontmatter(content);
      files.push({
        file: resolved,
        relPath: path.relative(root, resolved).replace(/\\/g, "/") || path.basename(resolved),
        root,
        scope,
        kind,
        name: parsed.meta.name || path.basename(resolved),
        description: parsed.meta.description || compactText(parsed.body.split(/\n+/).find(Boolean) || "", 180),
        paths: normalizePathGlobs(parsed.meta.paths || parsed.meta.path_globs || parsed.meta.globs || []),
        bytes: stat.size,
        mtimeMs: stat.mtimeMs,
        checksum: checksum(content, 24),
        body: parsed.body || content,
      });
    } catch (error: any) {
      issues.push({ type: "unreadable_global_claude_memory", path: resolved, error: compactText(error?.message || error, 260) });
    }
  };
  if (includeManaged && fs.existsSync(managedRoot)) {
    addFile(path.join(managedRoot, "CLAUDE.md"), "managed", "managed", managedRoot);
    for (const file of listMarkdownFilesRecursive(path.join(managedRoot, ".claude", "rules"), { maxFiles: maxRuleFiles })) {
      addFile(file, "managed", "managed_rule", managedRoot);
    }
  } else if (includeManaged && (options.managedRoot || options.managed_root || process.env.CCM_MANAGED_CLAUDE_MEMORY_DIR || process.env.CLAUDE_CODE_MANAGED_SETTINGS_PATH)) {
    issues.push({ type: "missing_managed_root", path: managedRoot });
  }
  if (includeUser && fs.existsSync(userRoot)) {
    addFile(path.join(userRoot, "CLAUDE.md"), "user", "user", userRoot);
    for (const file of listMarkdownFilesRecursive(path.join(userRoot, "rules"), { maxFiles: maxRuleFiles })) {
      addFile(file, "user", "user_rule", userRoot);
    }
  } else if (includeUser && (options.userRoot || options.user_root || process.env.CLAUDE_CONFIG_DIR)) {
    issues.push({ type: "missing_user_root", path: userRoot });
  }
  return {
    schema: "ccm-global-claude-memory-discovery-v1",
    version: 1,
    status: files.length ? "found" : "empty",
    settingSourcePolicy,
    includeUser,
    includeManaged,
    userRoot,
    managedRoot,
    discoveredCount: files.length,
    files,
    issues,
  };
}

export function importGlobalClaudeMemoryToGroupTypedMemory(groupId: string, options: any = {}) {
  const discovery = discoverGlobalClaudeMemoryFiles(options);
  const maxImportFiles = Math.max(1, Math.min(300, Number(options.maxImportFiles || options.max_import_files || 80)));
  const includeAudit = buildClaudeMemoryIncludeExpansion(discovery.files || [], {
    groupId,
    maxIncludeDepth: options.maxIncludeDepth || options.max_include_depth,
    allowUserExternalIncludes: options.allowUserExternalIncludes !== false && options.allow_user_external_includes !== false,
    allowExternalForItem: (item: any) => {
      if (item?.scope === "user") return options.allowUserExternalIncludes !== false && options.allow_user_external_includes !== false;
      return options.allowExternalIncludes === true || options.allow_external_includes === true;
    },
  });
  const importItems = [...(discovery.files || []), ...(includeAudit.files || [])];
  const boundedImportItems = importItems.slice(0, maxImportFiles);
  const writes: any[] = [];
  const skipped: any[] = [];
  for (const item of boundedImportItems) {
    const rel = String(item.relPath || path.basename(item.file || "CLAUDE.md"));
    const slug = safeSegment(`global-claude-${item.scope}-${rel.replace(/\.md$/i, "")}`, `global-claude-${item.scope}-memory`);
    const titlePrefix = item.scope === "managed"
      ? (item.includeParentFile ? "Managed Claude Include" : item.kind === "managed_rule" ? "Managed Claude Rule" : "Managed Claude Memory")
      : (item.includeParentFile ? "User Claude Include" : item.kind === "user_rule" ? "User Claude Rule" : "User Claude Memory");
    const body = [
      `# ${titlePrefix}: ${rel}`,
      "",
      `Imported from ${item.file}`,
      item.includeParentFile ? `Included by ${item.includeParentFile}` : "",
      item.includeDepth ? `Include depth: ${item.includeDepth}` : "",
      "",
      neutralizeClaudeMemoryIncludeRefs(item.body || ""),
    ].filter(line => line !== "").join("\n");
    const write = upsertGroupTypedMemoryDocument(groupId, {
      type: item.scope === "user" ? "user" : "reference",
      slug,
      name: `${titlePrefix}: ${rel}`,
      description: item.description || `${titlePrefix} imported from ${rel}`,
      source: `global-claude-memory:${item.scope}:${item.kind}:${rel}`,
      paths: item.paths || [],
      updatedAt: new Date(Number(item.mtimeMs || Date.now())).toISOString(),
      body,
    });
    writes.push({ ...write, sourceFile: item.file, relPath: rel, scope: item.scope, kind: item.kind, paths: item.paths || [], checksum: item.checksum, includeParentFile: item.includeParentFile || "", includeDepth: Number(item.includeDepth || 0) });
  }
  if (importItems.length > maxImportFiles) {
    skipped.push({ type: "max_import_files", count: importItems.length - maxImportFiles });
  }
  const instructionsLoadedHooks = executeInstructionsLoadedHooksForImportedClaudeMemory(groupId, boundedImportItems, {
    ...options,
    loadReason: options.instructionsLoadReason || options.instructions_load_reason || "global_claude_memory_import",
  });
  const index = buildGroupTypedMemoryIndex(groupId);
  return {
    schema: "ccm-global-claude-memory-import-v1",
    version: GROUP_GLOBAL_CLAUDE_MEMORY_IMPORT_VERSION,
    groupId,
    status: discovery.status === "empty" ? "empty" : "imported",
    settingSourcePolicy: discovery.settingSourcePolicy,
    includeUser: discovery.includeUser,
    includeManaged: discovery.includeManaged,
    userRoot: discovery.userRoot,
    managedRoot: discovery.managedRoot,
    discoveredCount: discovery.discoveredCount || 0,
    importedCount: writes.length,
    instructionsLoadedHooks,
    includeAudit: {
      ...includeAudit,
      files: undefined,
      importedIncludeCount: writes.filter(item => Number(item.includeDepth || 0) > 0).length,
    },
    skipped,
    issues: [...(discovery.issues || []), ...(includeAudit.issues || [])],
    writes,
    index,
    importedAt: now(),
  };
}

export function scanGroupTypedMemoryDocuments(groupId: string) {
  return listMemoryMarkdownFiles(groupId).map(file => {
    const content = fs.readFileSync(file, "utf-8");
    const parsed = parseFrontmatter(content);
    const stat = fs.statSync(file);
    return {
      file,
      relPath: path.basename(file),
      name: parsed.meta.name || path.basename(file, ".md"),
      description: parsed.meta.description || "",
      type: normalizeMemoryType(parsed.meta.type),
      source: parsed.meta.source || "",
      paths: normalizePathGlobs(parsed.meta.paths || parsed.meta.path_globs || parsed.meta.globs || []),
      updatedAt: parsed.meta.updated_at || stat.mtime.toISOString(),
      checksum: parsed.meta.checksum || checksum(content, 24),
      body: parsed.body,
      mtimeMs: stat.mtimeMs,
      bytes: stat.size,
    };
  }).sort((a, b) => String(a.type).localeCompare(String(b.type)) || String(a.name).localeCompare(String(b.name)));
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
  const content = truncateIndexContent(lines.join("\n").trim() + "\n");
  const file = path.join(dir, GROUP_TYPED_MEMORY_ENTRYPOINT);
  const changed = writeTextAtomic(file, content);
  return { file, dir, docs, changed, lineCount: content.split("\n").length, bytes: Buffer.byteLength(content, "utf-8") };
}

function groupTypedMemoryPriority(type: any) {
  const value = normalizeMemoryType(type);
  if (value === "user") return 400;
  if (value === "feedback") return 300;
  if (value === "project") return 200;
  return 100;
}

function normalizeFileKey(file: string) {
  return path.resolve(file).replace(/\\/g, "/").toLowerCase();
}

function isPathInside(baseDir: string, file: string) {
  const base = normalizeFileKey(baseDir);
  const target = normalizeFileKey(file);
  return target === base || target.startsWith(`${base}/`);
}

function isClaudeMemoryTextInclude(file: string) {
  const ext = path.extname(String(file || "")).toLowerCase();
  return CLAUDE_MEMORY_INCLUDE_TEXT_EXTENSIONS.has(ext);
}

function stripIncludePath(value: string) {
  return String(value || "")
    .replace(/\\ /g, " ")
    .replace(/[#?].*$/, "")
    .replace(/[),.;，。；、]+$/g, "")
    .trim();
}

function extractTypedMemoryIncludeRefs(content: string) {
  const refs: string[] = [];
  let inFence = false;
  for (const rawLine of String(content || "").split(/\n/)) {
    const line = rawLine.replace(/\r/g, "");
    if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || /^\s*<!--/.test(line)) continue;
    const includeRegex = /(?:^|\s)@((?:[^\s\\]|\\ )+)/g;
    let match: RegExpExecArray | null;
    while ((match = includeRegex.exec(line)) !== null) {
      const ref = stripIncludePath(match[1]);
      if (!ref || ref.startsWith("@") || /^[#%^&*()]+/.test(ref)) continue;
      if (ref.startsWith("./") || ref.startsWith("../") || ref.startsWith("/") || /^[A-Za-z]:[\\/]/.test(ref) || /^[a-zA-Z0-9._-]/.test(ref)) {
        refs.push(ref);
      }
    }
  }
  return [...new Set(refs)].slice(0, 40);
}

function resolveClaudeMemoryIncludePath(baseFile: string, ref: string) {
  const cleaned = stripIncludePath(ref);
  if (!cleaned) return "";
  if (cleaned.startsWith("~/")) return path.resolve(os.homedir(), cleaned.slice(2));
  if (path.isAbsolute(cleaned) || /^[A-Za-z]:[\\/]/.test(cleaned)) return path.resolve(cleaned);
  return path.resolve(path.dirname(baseFile), cleaned);
}

function neutralizeClaudeMemoryIncludeRefs(content: string) {
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

function claudeMemoryIncludeRelPath(file: string, roots: string[] = []) {
  const resolved = path.resolve(file);
  const root = roots.find(item => item && isPathInside(item, resolved));
  if (root) {
    const rel = path.relative(root, resolved).replace(/\\/g, "/");
    return rel || path.basename(resolved);
  }
  return `external/${checksum(resolved, 10)}-${path.basename(resolved)}`;
}

function buildClaudeMemoryIncludeExpansion(sourceItems: any[] = [], options: any = {}) {
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

function resolveTypedMemoryIncludePath(baseFile: string, ref: string) {
  const cleaned = stripIncludePath(ref);
  if (!cleaned) return "";
  if (path.isAbsolute(cleaned) || /^[A-Za-z]:[\\/]/.test(cleaned)) return path.resolve(cleaned);
  return path.resolve(path.dirname(baseFile), cleaned);
}

function buildTypedMemoryLoadEntry(input: any) {
  const file = String(input.file || "");
  const stat = fs.statSync(file);
  const content = fs.readFileSync(file, "utf-8");
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
    bytes: stat.size,
    checksum: checksum(content, 24),
    estimatedTokens: Math.max(1, Math.ceil(Buffer.byteLength(content, "utf-8") / 4)),
  };
}

export function buildGroupTypedMemoryLoadPlan(groupId: string, options: any = {}) {
  const index = buildGroupTypedMemoryIndex(groupId);
  const dir = index.dir;
  const maxEntries = Math.max(4, Math.min(240, Number(options.maxEntries || options.max_entries || GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_ENTRIES)));
  const maxIncludeDepth = Math.max(1, Math.min(12, Number(options.maxIncludeDepth || options.max_include_depth || GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_INCLUDE_DEPTH)));
  const targetPaths = deriveGroupTypedMemoryTargetPaths(options.query || "", options.targetPaths || options.target_paths || []);
  const docs = scanGroupTypedMemoryDocuments(groupId);
  const pathConditions = new Map<string, any>();
  for (const doc of docs) pathConditions.set(normalizeFileKey(doc.file), evaluateTypedMemoryPathCondition(doc, targetPaths));
  const docByFile = new Map<string, any>();
  for (const doc of docs) docByFile.set(normalizeFileKey(doc.file), doc);
  const sortedDocs = docs.slice().sort((a: any, b: any) => {
    const byPriority = groupTypedMemoryPriority(a.type) - groupTypedMemoryPriority(b.type);
    if (byPriority !== 0) return byPriority;
    const byTime = Number(a.mtimeMs || 0) - Number(b.mtimeMs || 0);
    return byTime !== 0 ? byTime : String(a.relPath || "").localeCompare(String(b.relPath || ""));
  });
  const entries: any[] = [];
  const issues: any[] = [];
  const processed = new Set<string>();
  const visiting = new Set<string>();
  const addIssue = (issue: any) => {
    issues.push({
      type: issue.type || "include_issue",
      ref: String(issue.ref || ""),
      from: String(issue.from || ""),
      detail: compactText(issue.detail || "", 500),
    });
  };
  const processFile = (file: string, input: any = {}) => {
    const resolved = path.resolve(file);
    const key = normalizeFileKey(resolved);
    const from = String(input.parentRelPath || "");
    if (!isPathInside(dir, resolved)) {
      addIssue({ type: "external_include_skipped", ref: resolved, from, detail: "include path is outside this group's typed memory directory" });
      return;
    }
    if (visiting.has(key)) {
      addIssue({ type: "circular_include", ref: path.basename(resolved), from, detail: "cycle detected while expanding typed memory @include" });
      return;
    }
    if (processed.has(key)) return;
    if (!fs.existsSync(resolved)) {
      addIssue({ type: "missing_include", ref: resolved, from, detail: "typed memory @include target does not exist" });
      return;
    }
    if (Number(input.depth || 0) > maxIncludeDepth) {
      addIssue({ type: "max_include_depth", ref: resolved, from, detail: `include depth exceeded ${maxIncludeDepth}` });
      return;
    }
    visiting.add(key);
    let entry: any;
    try {
      const known = docByFile.get(key);
      entry = buildTypedMemoryLoadEntry({
        file: resolved,
        kind: input.kind || (known ? "typed_doc" : "include"),
        relPath: known?.relPath || path.relative(dir, resolved).replace(/\\/g, "/"),
        type: known?.type || input.type,
        pathGlobs: known?.paths || input.pathGlobs || [],
        pathCondition: input.pathCondition || pathConditions.get(key) || evaluateTypedMemoryPathCondition(known || {}, targetPaths),
        targetPaths,
        depth: input.depth || 0,
        parentRelPath: input.parentRelPath || "",
      });
      for (const ref of entry.includeRefs || []) {
        const includePath = resolveTypedMemoryIncludePath(resolved, ref);
        processFile(includePath, {
          kind: "include",
          depth: Number(entry.includeDepth || 0) + 1,
          parentRelPath: entry.relPath,
          type: entry.type,
        });
      }
      entries.push(entry);
      processed.add(key);
    } catch (error: any) {
      addIssue({ type: "unreadable_memory_file", ref: resolved, from, detail: error?.message || error });
    } finally {
      visiting.delete(key);
    }
  };
  processFile(index.file, { kind: "entrypoint", relPath: GROUP_TYPED_MEMORY_ENTRYPOINT, depth: 0 });
  let conditionalMatched = 0;
  let conditionalSkipped = 0;
  for (const doc of sortedDocs) {
    const condition = pathConditions.get(normalizeFileKey(doc.file)) || evaluateTypedMemoryPathCondition(doc, targetPaths);
    if (condition.conditional && !condition.matched) {
      conditionalSkipped += 1;
      continue;
    }
    if (condition.conditional && condition.matched) conditionalMatched += 1;
    processFile(doc.file, { kind: "typed_doc", relPath: doc.relPath, type: doc.type, depth: 0, pathCondition: condition, targetPaths });
  }
  const boundedEntries = entries.slice(0, maxEntries).map((entry, loadOrder) => ({ ...entry, loadOrder }));
  const truncated = entries.length > boundedEntries.length;
  const totalBytes = boundedEntries.reduce((sum, entry) => sum + Number(entry.bytes || 0), 0);
  const estimatedTokens = boundedEntries.reduce((sum, entry) => sum + Number(entry.estimatedTokens || 0), 0);
  const byType = boundedEntries.reduce((acc: any, entry: any) => {
    const key = String(entry.type || entry.kind || "unknown");
    acc[key] = Number(acc[key] || 0) + 1;
    return acc;
  }, {});
  const status = issues.some(issue => issue.type === "missing_include" || issue.type === "circular_include" || issue.type === "unreadable_memory_file")
    ? "include_warnings"
    : truncated ? "truncated" : "pass";
  return {
    schema: "ccm-group-typed-memory-load-plan-v1",
    version: GROUP_TYPED_MEMORY_LOAD_PLAN_VERSION,
    groupId,
    generatedAt: now(),
    status,
    pass: status === "pass",
    loadOrderPolicy: "entrypoint_first_then_lower_priority_docs_then_higher_priority_docs; includes_load_before_parent",
    priorityTiers: {
      entrypoint: 0,
      reference: groupTypedMemoryPriority("reference"),
      project: groupTypedMemoryPriority("project"),
      feedback: groupTypedMemoryPriority("feedback"),
      user: groupTypedMemoryPriority("user"),
    },
    maxEntries,
    maxIncludeDepth,
    targetPaths,
    conditionalMatched,
    conditionalSkipped,
    entryCount: boundedEntries.length,
    totalDiscoveredEntries: entries.length,
    truncated,
    totalBytes,
    estimatedTokens,
    byType,
    issues,
    indexFile: index.file,
    memoryDir: dir,
    entries: boundedEntries,
  };
}

export function renderGroupTypedMemoryLoadPlan(plan: any) {
  if (!plan?.schema) return "";
  const lines = [
    `类型化 MEMORY.md 加载计划：${plan.status || "unknown"}；加载 ${plan.entryCount || 0}/${plan.totalDiscoveredEntries || 0} 项，约 ${plan.estimatedTokens || 0} tokens；条件匹配 ${plan.conditionalMatched || 0}、跳过 ${plan.conditionalSkipped || 0}；策略 ${plan.loadOrderPolicy || "unknown"}。`,
    `- 优先级：entrypoint < reference < project < feedback < user；高优先级记忆在后加载，子 Agent 应优先服从后加载内容。`,
  ];
  if (Array.isArray(plan.targetPaths) && plan.targetPaths.length) {
    lines.push(`- 路径条件目标：${plan.targetPaths.slice(0, 8).join("、")}。`);
  }
  if (Array.isArray(plan.issues) && plan.issues.length) {
    lines.push(`- 加载计划警告：${plan.issues.slice(0, 5).map((issue: any) => `${issue.type}:${issue.from || "root"}->${issue.ref || ""}`).join("；")}`);
  }
  const entries = Array.isArray(plan.entries) ? plan.entries : [];
  const preview = entries.slice(-8);
  if (preview.length) {
    lines.push("- 加载顺序预览（后面的优先级更高）：");
    for (const entry of preview) {
      lines.push(`  - #${entry.loadOrder ?? 0} [${entry.type || entry.kind}] ${entry.relPath || ""}${entry.parentRelPath ? `（include by ${entry.parentRelPath}）` : ""}`);
    }
  }
  return lines.join("\n");
}

function listLines(title: string, items: any[], mapper: (item: any) => string, limit = 12) {
  const values = (items || []).map(mapper).map(item => compactText(item, 500)).filter(Boolean).slice(-limit);
  if (!values.length) return "";
  return [`## ${title}`, ...values.map(item => `- ${item}`)].join("\n");
}

function messageContent(message: any) {
  return String(message?.content || message?.delivery_summary?.headline || message?.result || "").trim();
}

function messageIdentity(message: any, index = 0) {
  return String(message?.id || message?.uuid || `${message?.timestamp || "unknown"}-${index}`);
}

function messageActor(message: any) {
  return message?.role === "user" ? `用户 -> ${message?.target || "all"}` : message?.agent || message?.role || "Agent";
}

function extractMessageFiles(message: any) {
  const content = messageContent(message);
  const explicit = [
    ...(Array.isArray(message?.filesChanged) ? message.filesChanged : []),
    ...(Array.isArray(message?.fileChanges?.files) ? message.fileChanges.files : []),
    ...(Array.isArray(message?.delivery_summary?.actual_file_changes)
      ? message.delivery_summary.actual_file_changes.map((item: any) => item?.path || item?.file || item)
      : []),
    ...(Array.isArray(message?.receipt?.filesChanged) ? message.receipt.filesChanged : []),
  ];
  const matched = content.match(/(?:[A-Za-z]:\\[^\s，。；]+|(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+|[\w.-]+\.(?:ts|tsx|js|jsx|vue|java|py|go|rs|md|json|toml|yaml|yml|xml|sql))/g) || [];
  return [...explicit, ...matched].map(item => typeof item === "string" ? item : item?.path || item?.file || JSON.stringify(item)).filter(Boolean);
}

function extractMessageSkills(message: any) {
  const content = messageContent(message);
  const explicit = [
    ...(Array.isArray(message?.invokedSkills) ? message.invokedSkills : []),
    ...(Array.isArray(message?.skills) ? message.skills : []),
    ...(Array.isArray(message?.receipt?.memoryUsed) ? message.receipt.memoryUsed : []),
  ];
  const matched = [...content.matchAll(/Skill\s*[:：]\s*([A-Za-z0-9_.:@/-]+)/g)].map(match => match[1]);
  return [...explicit, ...matched]
    .map(item => typeof item === "string" ? item.replace(/^Skill\s*[:：]\s*/i, "") : item?.name || item?.id || JSON.stringify(item))
    .filter(Boolean);
}

function extractMessageVerification(message: any) {
  const content = messageContent(message);
  const explicit = [
    ...(Array.isArray(message?.verification) ? message.verification : []),
    ...(Array.isArray(message?.receipt?.verification) ? message.receipt.verification : []),
    ...(Array.isArray(message?.delivery_summary?.verification) ? message.delivery_summary.verification : []),
  ];
  const matched = content.match(/\b(?:npm|pnpm|yarn|bun)\s+run\s+[A-Za-z0-9:_-]+|(?:pytest|vitest|tsc|mvn test|go test|cargo test)[^\n，。；]*/gi) || [];
  return [...explicit, ...matched].map(item => typeof item === "string" ? item : JSON.stringify(item)).filter(Boolean);
}

function addDistilledCandidate(candidates: any[], category: GroupTypedMemoryType, type: string, message: any, index: number, text: any) {
  const bounded = compactText(text, 900);
  if (!bounded) return;
  const messageId = messageIdentity(message, index);
  const actor = messageActor(message);
  const key = checksum([category, type, messageId, bounded], 24);
  candidates.push({
    id: key,
    category,
    type,
    messageId,
    sourceIndex: index,
    actor,
    timestamp: String(message?.timestamp || message?.time || ""),
    text: bounded,
    checksum: key,
  });
}

function extractGroupLogDistillationCandidates(messages: any[] = []) {
  const candidates: any[] = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const content = messageContent(message);
    if (!content) continue;
    const actor = messageActor(message);
    const status = String(message?.receipt?.status || message?.delivery_summary?.status || message?.status || "").toLowerCase();
    const taskId = String(message?.task_id || message?.taskId || message?.receipt?.taskId || message?.delivery_summary?.task_id || "").trim();
    if (message?.role === "user" && /(必须|不要|不得|禁止|始终|只能|不能|务必|验收|约束|目标|长期|must\b|never\b|always\b|do not\b|required?\b)/i.test(content)) {
      addDistilledCandidate(candidates, "user", "requirement", message, index, content);
    }
    if (message?.dispatchPolicy?.action || Array.isArray(message?.assignments) && message.assignments.length) {
      addDistilledCandidate(candidates, "project", "dispatch_decision", message, index, `${message?.dispatchPolicy?.action || "delegate"}：${message?.dispatchPolicy?.reason || content}`);
      for (const assignment of message.assignments || []) {
        addDistilledCandidate(candidates, "project", "assignment", message, index, `${assignment?.project || assignment?.target || "unknown"}：${assignment?.task || assignment?.reason || ""}`);
      }
    }
    if (/(决定|采用|使用|方案|策略|decision|decided|use|strategy)/i.test(content) && /(src\/|\.ts|\.js|\.vue|接口|服务|数据库|api|agent|memory|compact|压缩|记忆)/i.test(content)) {
      addDistilledCandidate(candidates, "project", "technical_decision", message, index, content);
    }
    if (/(失败|阻塞|未完成|超时|异常|回退|拒绝|error|failed|blocked|timeout|needs_info|need info)/i.test(`${status}\n${content}`)) {
      addDistilledCandidate(candidates, "feedback", "failure_or_blocker", message, index, `${taskId ? `[${taskId}] ` : ""}${actor}: ${content}`);
    }
    if (["done", "complete", "completed", "success"].includes(status) || message?.delivery_summary?.has_final_review) {
      addDistilledCandidate(candidates, "project", "completed_work", message, index, `${taskId ? `[${taskId}] ` : ""}${actor}: ${message?.receipt?.summary || message?.delivery_summary?.headline || content}`);
    }
    const files = uniqueStrings(extractMessageFiles(message), 12);
    if (files.length) addDistilledCandidate(candidates, "reference", "files", message, index, `${actor}: ${files.join(", ")} | ${compactText(content, 300)}`);
    const skills = uniqueStrings(extractMessageSkills(message), 10);
    if (skills.length) addDistilledCandidate(candidates, "reference", "skills", message, index, `${actor}: ${skills.map(item => `Skill:${item}`).join(", ")}`);
    const verification = uniqueStrings(extractMessageVerification(message), 10);
    if (verification.length) addDistilledCandidate(candidates, "reference", "verification", message, index, `${actor}: ${verification.join(", ")}`);
  }
  return candidates;
}

export function readGroupTypedMemoryDistillationLedger(groupId: string) {
  const file = getGroupTypedMemoryDistillationLedgerFile(groupId);
  const state = readJson(file, {
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    facts: {},
    updatedAt: "",
  });
  return { ...state, facts: state?.facts && typeof state.facts === "object" ? state.facts : {}, file };
}

function pruneDistilledFacts(facts: any = {}, perTypeLimit = GROUP_TYPED_MEMORY_DISTILLATION_FACT_LIMIT) {
  const next: any = {};
  for (const type of ["user", "project", "feedback", "reference"] as GroupTypedMemoryType[]) {
    const entries = Object.entries(facts[type] || {})
      .sort((a: any, b: any) => Number(a[1].sourceIndex || 0) - Number(b[1].sourceIndex || 0) || String(a[1].lastSeenAt || "").localeCompare(String(b[1].lastSeenAt || "")))
      .slice(-perTypeLimit);
    next[type] = Object.fromEntries(entries);
  }
  return next;
}

function renderDistilledMemoryBody(title: string, facts: any[], options: any = {}) {
  const lines = [
    `# ${title}`,
    "",
    `Generated by CCM long-term group-log distillation at ${options.updatedAt || now()}.`,
    "Each fact keeps its source message id so a future agent can recover the raw transcript before trusting file/function/flag claims.",
    "",
    "## Distilled Facts",
  ];
  for (const fact of facts) {
    const source = `#${fact.messageId || ""}`;
    const kind = fact.type ? `[${fact.type}] ` : "";
    const actor = fact.actor ? `${fact.actor}: ` : "";
    lines.push(`- ${source} ${kind}${actor}${compactText(fact.text, 900)}`);
  }
  return lines.join("\n").trim() + "\n";
}

function buildPostCompactCandidateUsageArchive(input: any = {}, options: any = {}) {
  const usage = input.postCompactCandidateUsage
    || input.post_compact_candidate_usage
    || input.candidateUsage
    || input.candidate_usage
    || {};
  const hints = normalizePostCompactCandidateUsageHints({ postCompactCandidateUsage: usage });
  const archived = hints
    .filter((row: any) => row.recommendation === "deprioritize_or_distill" || row.recommendation === "require_usage_receipt")
    .sort((a: any, b: any) => {
      const aWeight = Number(a.ignored_count || 0) * 2 + Number(a.mentioned_count || 0) - Number(a.used_count || 0) - Number(a.verified_count || 0);
      const bWeight = Number(b.ignored_count || 0) * 2 + Number(b.mentioned_count || 0) - Number(b.used_count || 0) - Number(b.verified_count || 0);
      return bWeight - aWeight || String(a.value || "").localeCompare(String(b.value || ""));
    })
    .slice(0, Math.max(1, Number(options.limit || options.max || 40)));
  if (!archived.length) {
    return {
      schema: "ccm-group-post-compact-candidate-usage-distillation-v1",
      archived_count: 0,
      rows: [],
      body: "",
    };
  }
  const updatedAt = options.updatedAt || now();
  const lines = [
    "# Post-Compact Candidate Usage Archive",
    "",
    `Generated by CCM post-compact usage distillation at ${updatedAt}.`,
    "This document records recovered-memory candidates that child Agents repeatedly ignored or mentioned without a clear usage decision.",
    "Treat these rows as low-priority memory: do not promote them back into task context unless the current task explicitly matches and the repository state is re-verified.",
    "",
    "## Archived Or Deprioritized Candidates",
  ];
  for (const row of archived) {
    const state = row.recommendation === "deprioritize_or_distill" ? "deprioritized" : "needs-explicit-usage-receipt";
    lines.push(`- [${state}] candidate_id=${row.candidate_id || ""}; value=${row.value || ""}; used=${row.used_count || 0}; verified=${row.verified_count || 0}; ignored=${row.ignored_count || 0}; mentioned=${row.mentioned_count || 0}.`);
  }
  return {
    schema: "ccm-group-post-compact-candidate-usage-distillation-v1",
    archived_count: archived.length,
    rows: archived,
    body: lines.join("\n").trim() + "\n",
  };
}

function extractPathClaims(value: any) {
  const text = String(value || "");
  const matched = text.match(/(?:[A-Za-z]:\\[^\s，。；]+|(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+|[\w.-]+\.(?:ts|tsx|js|jsx|vue|java|py|go|rs|md|json|toml|yaml|yml|xml|sql))/g) || [];
  return uniqueStrings(matched.map(item => item.replace(/[),.;，。；]+$/g, "")), 80);
}

function resolveClaimPath(projectRoot: string, claim: string) {
  const raw = String(claim || "").trim();
  if (!raw) return "";
  if (/^[A-Za-z]:\\/.test(raw) || path.isAbsolute(raw)) return raw;
  return path.resolve(projectRoot, raw.replace(/\\/g, path.sep));
}

function addDistillationQualityCheck(checks: any[], input: any) {
  checks.push({
    id: input.id,
    label: input.label,
    pass: input.pass,
    severity: input.severity || "medium",
    detail: input.detail || "",
    evidence: input.evidence || [],
    gaps: input.gaps || [],
    score: input.pass ? 100 : 0,
  });
}

function distillationQualityPenalty(severity: string) {
  if (severity === "fatal") return 45;
  if (severity === "high") return 28;
  if (severity === "medium") return 14;
  return 7;
}

function collectDistilledFacts(ledger: any) {
  const facts: any[] = [];
  for (const type of ["user", "project", "feedback", "reference"] as GroupTypedMemoryType[]) {
    for (const fact of Object.values(ledger?.facts?.[type] || {})) facts.push({ ...(fact as any), category: type });
  }
  return facts;
}

function extractTaskStateSignal(fact: any) {
  const text = String(fact?.text || "");
  const taskId = String(fact?.taskId || (text.match(/\[([^\]]+)\]/)?.[1]) || "").trim();
  if (!taskId) return null;
  const state = /(失败|阻塞|未完成|超时|异常|failed|blocked|timeout|needs_info|need info)/i.test(text)
    ? "blocked"
    : /(完成|修复|通过|done|success|completed|passed|fixed)/i.test(text)
      ? "done"
      : "";
  if (!state) return null;
  return { taskId, state, sourceIndex: Number(fact?.sourceIndex || 0), messageId: fact?.messageId || "", text: compactText(text, 220) };
}

export function evaluateGroupTypedMemoryDistillationQuality(groupId: string, options: any = {}) {
  const evaluatedAt = now();
  const projectRoot = path.resolve(String(options.projectRoot || options.project_root || process.cwd()));
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const docs = scanGroupTypedMemoryDocuments(groupId);
  const facts = collectDistilledFacts(ledger);
  const checks: any[] = [];
  const factsByType = new Map<string, any[]>();
  for (const fact of facts) {
    const type = normalizeMemoryType(fact.category || fact.type);
    factsByType.set(type, [...(factsByType.get(type) || []), fact]);
  }

  const expectedTypes = [...factsByType.keys()].filter(type => (factsByType.get(type) || []).length > 0);
  const docsByType = new Map<string, any[]>();
  for (const doc of docs.filter(doc => String(doc.source || "") === "auto:group-log-distillation")) {
    docsByType.set(doc.type, [...(docsByType.get(doc.type) || []), doc]);
  }
  const missingTypeDocs = expectedTypes.filter(type => !(docsByType.get(type) || []).length);
  addDistillationQualityCheck(checks, {
    id: "typed_doc_coverage",
    label: "蒸馏事实有对应 typed Markdown",
    pass: missingTypeDocs.length === 0,
    severity: "high",
    detail: missingTypeDocs.length ? "部分蒸馏事实类别缺少对应 Markdown 记忆。" : "所有有事实的类别都有 Markdown 记忆。",
    gaps: missingTypeDocs,
  });

  const docText = docs.filter(doc => String(doc.source || "") === "auto:group-log-distillation").map(doc => doc.body).join("\n");
  const missingSourceLinks = facts
    .filter(fact => fact.messageId && !docText.includes(`#${fact.messageId}`))
    .map(fact => `#${fact.messageId} ${compactText(fact.text, 120)}`)
    .slice(0, 20);
  addDistillationQualityCheck(checks, {
    id: "source_message_links_preserved",
    label: "蒸馏事实保留 source message id",
    pass: missingSourceLinks.length === 0,
    severity: "fatal",
    detail: missingSourceLinks.length ? "部分事实无法从 Markdown 中回溯到 source message id。" : "蒸馏 Markdown 保留了 source message id。",
    gaps: missingSourceLinks,
  });

  const pathClaims = uniqueStrings(facts.flatMap(fact => extractPathClaims(fact.text)), 120);
  const stalePaths = pathClaims
    .map(claim => ({ claim, resolved: resolveClaimPath(projectRoot, claim) }))
    .filter(item => item.resolved && !fs.existsSync(item.resolved))
    .map(item => `${item.claim} -> ${item.resolved}`)
    .slice(0, 30);
  addDistillationQualityCheck(checks, {
    id: "file_path_claims_checked",
    label: "文件路径声明已按当前仓库核验",
    pass: stalePaths.length === 0,
    severity: "medium",
    detail: stalePaths.length ? "部分记忆里的文件路径在当前仓库不存在，使用前必须重新核验。" : "未发现当前仓库不存在的文件路径声明。",
    evidence: pathClaims.slice(0, 30),
    gaps: stalePaths,
  });

  const taskSignals = facts.map(extractTaskStateSignal).filter(Boolean);
  const taskMap = new Map<string, any[]>();
  for (const signal of taskSignals) taskMap.set(signal.taskId, [...(taskMap.get(signal.taskId) || []), signal]);
  const unresolvedContradictions: string[] = [];
  for (const [taskId, signals] of taskMap.entries()) {
    const sorted = signals.sort((a, b) => a.sourceIndex - b.sourceIndex);
    const states = new Set(sorted.map(item => item.state));
    const last = sorted[sorted.length - 1];
    if (states.has("done") && states.has("blocked") && last?.state === "blocked") {
      unresolvedContradictions.push(`[${taskId}] latest=${last.state} #${last.messageId} ${last.text}`);
    }
  }
  addDistillationQualityCheck(checks, {
    id: "no_unresolved_status_contradictions",
    label: "完成/阻塞状态没有未解决矛盾",
    pass: unresolvedContradictions.length === 0,
    severity: "high",
    detail: unresolvedContradictions.length ? "发现同一任务先完成后又阻塞，需按最新阻塞处理。" : "未发现未解决的完成/阻塞矛盾。",
    gaps: unresolvedContradictions.slice(0, 12),
  });

  const hasUsefulFacts = facts.length > 0 && (expectedTypes.includes("user") || expectedTypes.includes("project") || expectedTypes.includes("feedback") || expectedTypes.includes("reference"));
  addDistillationQualityCheck(checks, {
    id: "distilled_signal_not_empty",
    label: "蒸馏结果不是空洞记忆",
    pass: hasUsefulFacts || Number(ledger.sourceMessageCount || 0) === 0,
    severity: "medium",
    detail: hasUsefulFacts ? "蒸馏 ledger 中有可召回事实。" : "存在消息来源但没有可召回蒸馏事实。",
  });

  const failedChecks = checks.filter(check => !check.pass);
  const score = Math.max(0, Math.min(100, 100 - failedChecks.reduce((sum, check) => sum + distillationQualityPenalty(check.severity), 0)));
  const status = failedChecks.some(check => check.severity === "fatal") || score < 60
    ? "failed"
    : failedChecks.some(check => check.severity === "high") || score < 80
      ? "degraded"
      : "pass";
  return {
    schema: "ccm-group-typed-memory-distillation-quality-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_QUALITY_VERSION,
    groupId,
    score,
    pass: status === "pass",
    status,
    evaluatedAt,
    projectRoot,
    factCount: facts.length,
    docCount: docs.length,
    pathClaimCount: pathClaims.length,
    stalePathCount: stalePaths.length,
    contradictionCount: unresolvedContradictions.length,
    checks,
  };
}

export function distillGroupMessagesToTypedMemory(groupId: string, messages: any[] = [], memory: any = {}, options: any = {}) {
  if (options.disabled === true || options.disableDistillation === true || options.disable_distillation === true) {
    return { schema: "ccm-group-typed-memory-distillation-v1", version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION, groupId, skipped: true, reason: "disabled" };
  }
  const updatedAt = now();
  const maxMessages = Math.max(1, Math.min(5000, Number(options.maxMessages || options.max_messages || GROUP_TYPED_MEMORY_DISTILLATION_MAX_MESSAGES)));
  const sourceMessages = (messages || []).filter(message => !String(message?.content || "").startsWith("📤")).slice(-maxMessages);
  const candidates = extractGroupLogDistillationCandidates(sourceMessages);
  const ledger = readGroupTypedMemoryDistillationLedger(groupId);
  const facts = { ...(ledger.facts || {}) };
  let newFactCount = 0;
  let updatedFactCount = 0;
  for (const candidate of candidates) {
    const type = normalizeMemoryType(candidate.category);
    const bucket = facts[type] || {};
    const previous = bucket[candidate.checksum];
    bucket[candidate.checksum] = {
      ...candidate,
      firstSeenAt: previous?.firstSeenAt || updatedAt,
      lastSeenAt: updatedAt,
      count: Number(previous?.count || 0) + 1,
    };
    facts[type] = bucket;
    if (previous) updatedFactCount += 1;
    else newFactCount += 1;
  }
  const prunedFacts = pruneDistilledFacts(facts, Number(options.perTypeLimit || options.per_type_limit || GROUP_TYPED_MEMORY_DISTILLATION_FACT_LIMIT));
  const lastMessage = sourceMessages[sourceMessages.length - 1];
  const lastMessageId = lastMessage ? messageIdentity(lastMessage, (messages || []).length - 1) : "";
  const postCompactUsageArchive = buildPostCompactCandidateUsageArchive(options, { updatedAt });
  writeJsonAtomic(ledger.file, {
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    reason: compactText(options.reason || "", 220),
    sourceMessageCount: sourceMessages.length,
    candidateCount: candidates.length,
    newFactCount,
    updatedFactCount,
    lastDistilledMessageId: lastMessageId,
    lastDistilledAt: updatedAt,
    facts: prunedFacts,
    postCompactUsageArchive: {
      schema: postCompactUsageArchive.schema,
      archived_count: postCompactUsageArchive.archived_count,
      rows: postCompactUsageArchive.rows,
      updatedAt,
    },
    updatedAt,
  });

  const writes: any[] = [];
  const docSpecs = [
    {
      type: "user",
      slug: "distilled-log-user-requirements",
      name: "Distilled group-log user requirements",
      description: "Long-term user constraints and goals distilled from the group transcript.",
      title: "Distilled Group-Log User Requirements",
    },
    {
      type: "project",
      slug: "distilled-log-project-context",
      name: "Distilled group-log project context",
      description: "Long-term decisions, assignments, and completion facts distilled from the group transcript.",
      title: "Distilled Group-Log Project Context",
    },
    {
      type: "feedback",
      slug: "distilled-log-feedback-failures",
      name: "Distilled group-log feedback and failures",
      description: "Failures, blockers, and corrections distilled from the group transcript.",
      title: "Distilled Group-Log Feedback And Failures",
    },
    {
      type: "reference",
      slug: "distilled-log-reference-artifacts",
      name: "Distilled group-log reference artifacts",
      description: "Files, skills, verification commands, and artifact pointers distilled from the group transcript.",
      title: "Distilled Group-Log Reference Artifacts",
    },
  ];
  for (const spec of docSpecs) {
    const bucket = Object.values(prunedFacts[spec.type] || {}).sort((a: any, b: any) => Number(a.sourceIndex || 0) - Number(b.sourceIndex || 0));
    if (!bucket.length) continue;
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: spec.type,
      slug: spec.slug,
      name: spec.name,
      description: spec.description,
      source: "auto:group-log-distillation",
      updatedAt,
      body: renderDistilledMemoryBody(spec.title, bucket, { updatedAt }),
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
    }));
  }
  if (postCompactUsageArchive.archived_count > 0) {
    writes.push(upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "post-compact-candidate-usage-archive",
      name: "Post-compact candidate usage archive",
      description: "Low-priority recovered-memory candidates that were ignored or lacked explicit used/ignored/verified receipts.",
      source: "auto:post-compact-usage-distillation",
      updatedAt,
      body: postCompactUsageArchive.body,
      maxBodyChars: Number(options.maxBodyChars || options.max_body_chars || 18_000),
    }));
  }
  const index = buildGroupTypedMemoryIndex(groupId);
  const quality = evaluateGroupTypedMemoryDistillationQuality(groupId, {
    projectRoot: options.projectRoot || options.project_root,
  });
  const persistedLedger = readGroupTypedMemoryDistillationLedger(groupId);
  writeJsonAtomic(ledger.file, {
    schema: "ccm-group-typed-memory-distillation-ledger-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    reason: compactText(options.reason || "", 220),
    sourceMessageCount: sourceMessages.length,
    candidateCount: candidates.length,
    newFactCount,
    updatedFactCount,
    lastDistilledMessageId: lastMessageId,
    lastDistilledAt: updatedAt,
    facts: persistedLedger.facts || prunedFacts,
    postCompactUsageArchive: {
      schema: postCompactUsageArchive.schema,
      archived_count: postCompactUsageArchive.archived_count,
      rows: postCompactUsageArchive.rows,
      updatedAt,
    },
    quality,
    updatedAt,
  });
  return {
    schema: "ccm-group-typed-memory-distillation-v1",
    version: GROUP_TYPED_MEMORY_DISTILLATION_VERSION,
    groupId,
    skipped: false,
    reason: compactText(options.reason || "", 220),
    ledgerFile: ledger.file,
    sourceMessageCount: sourceMessages.length,
    candidateCount: candidates.length,
    newFactCount,
    updatedFactCount,
    writeCount: writes.length,
    writes,
    index,
    quality,
    postCompactUsageArchive: {
      schema: postCompactUsageArchive.schema,
      archived_count: postCompactUsageArchive.archived_count,
      rows: postCompactUsageArchive.rows,
    },
    lastDistilledMessageId: lastMessageId,
    distilledAt: updatedAt,
  };
}

export function syncGroupTypedMemoryFromGroupMemory(groupId: string, memory: any = {}) {
  const updatedAt = now();
  const goal = memory?.goal || memory?.summary || "";
  const requirements = Array.isArray(memory?.persistentRequirements) ? memory.persistentRequirements : [];
  const facts = Array.isArray(memory?.factAnchors) ? memory.factAnchors : [];
  const decisions = Array.isArray(memory?.decisions) ? memory.decisions : [];
  const blocked = Array.isArray(memory?.blocked) ? memory.blocked : [];
  const workerLedger = Array.isArray(memory?.workerLedger) ? memory.workerLedger : [];
  const reinject = memory?.compaction?.postCompactReinject || memory?.compactBoundary?.post_compact_restore?.reinjectionPlan || {};

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
    "# Feedback And Failure Memory",
    listLines("Blocked Or Failed Work", blocked, (item: any) => `${item.project || item.agent || "agent"}: ${item.reason || item.summary || item.text || ""}`, 16),
    listLines("Worker Ledger Warnings", workerLedger.filter((item: any) => !/done|success|completed/i.test(String(item.status || item.receiptStatus || ""))), (item: any) => `${item.project || item.agent || "agent"} [${item.status || item.receiptStatus || "unknown"}]: ${item.summary || ""}`, 16),
  ].filter(Boolean).join("\n\n");
  if (blocked.length || feedbackBody.includes("- ")) writes.push(upsertGroupTypedMemoryDocument(groupId, {
    type: "feedback",
    slug: "feedback-failures",
    name: "Feedback and failure memory",
    description: "Corrections, blockers, failed receipts, and patterns the agents should not repeat.",
    source: "auto:group-memory-json",
    updatedAt,
    body: feedbackBody,
  }));

  const referenceBody = [
    "# Reference Artifacts",
    listLines("Fact Anchors", facts, (item: any) => `#${item.messageId || item.id || ""} [${item.type || "fact"}] ${item.text || item}`, 24),
    listLines("Files To Reinject", reinject.files || [], (item: any) => `${item.value || item}${item.sourceMessageId ? ` (#${item.sourceMessageId})` : ""}`, 12),
    listLines("Skills Or Tools To Reinject", reinject.skills || [], (item: any) => `${item.value || item}${item.sourceMessageId ? ` (#${item.sourceMessageId})` : ""}`, 12),
    listLines("Verification To Reinject", reinject.verification || [], (item: any) => `${item.value || item}${item.sourceMessageId ? ` (#${item.sourceMessageId})` : ""}`, 12),
  ].filter(Boolean).join("\n\n");
  if (facts.length || reinject?.hasCandidates) writes.push(upsertGroupTypedMemoryDocument(groupId, {
    type: "reference",
    slug: "reference-artifacts",
    name: "Reference artifacts and restored context",
    description: "Facts, files, skills, verification, and artifact pointers useful for future recall.",
    source: "auto:group-memory-json",
    updatedAt,
    body: referenceBody,
  }));

  const index = buildGroupTypedMemoryIndex(groupId);
  return { schema: "ccm-group-typed-memory-sync-v1", version: GROUP_TYPED_MEMORY_VERSION, groupId, writes, index };
}

export function shouldIgnoreGroupMemoryRequest(query: string, options: any = {}) {
  if (options.ignoreMemory === true || options.ignore_memory === true) return true;
  return /(忽略|不要|不使用|别用|ignore|do not use|don't use)[^\n]{0,20}(记忆|memory)/i.test(query)
    || /(记忆|memory)[^\n]{0,20}(忽略|不要|不使用|ignore)/i.test(query);
}

function normalizeRecallScope(value: any) {
  return safeSegment(value || "global", "global");
}

export function readGroupTypedMemoryRecallLedger(groupId: string) {
  const file = getGroupTypedMemoryRecallLedgerFile(groupId);
  const state = readJson(file, { schema: "ccm-group-typed-memory-recall-ledger-v1", version: 1, scopes: {}, updatedAt: "" });
  return { ...state, scopes: state?.scopes && typeof state.scopes === "object" ? state.scopes : {}, file };
}

export function getAlreadySurfacedGroupTypedMemory(groupId: string, scope = "global", options: any = {}) {
  if (options.disableLedger === true || options.disable_ledger === true) return [];
  const ledger = readGroupTypedMemoryRecallLedger(groupId);
  const scoped = ledger.scopes?.[normalizeRecallScope(scope)] || {};
  return Object.keys(scoped.docs || {}).slice(-Number(options.limit || 120));
}

export function recordGroupTypedMemoryRecall(groupId: string, scope: string, recall: any, query = "", options: any = {}) {
  if (options.disableLedger === true || options.disable_ledger === true || recall?.ignored) return readGroupTypedMemoryRecallLedger(groupId);
  const surfaced = Array.isArray(recall?.surfaced) ? recall.surfaced.filter(Boolean) : [];
  if (!surfaced.length) return readGroupTypedMemoryRecallLedger(groupId);
  const ledger = readGroupTypedMemoryRecallLedger(groupId);
  const key = normalizeRecallScope(scope);
  const scoped = ledger.scopes[key] || { docs: {}, updatedAt: "" };
  const at = now();
  for (const relPath of surfaced) {
    const docKey = String(relPath || "");
    const prev = scoped.docs?.[docKey] || {};
    scoped.docs = scoped.docs || {};
    scoped.docs[docKey] = {
      relPath: docKey,
      firstAt: prev.firstAt || at,
      lastAt: at,
      count: Number(prev.count || 0) + 1,
      lastQueryHash: checksum(String(query || ""), 16),
    };
  }
  const entries = Object.entries(scoped.docs || {}).sort((a: any, b: any) => String(a[1].lastAt || "").localeCompare(String(b[1].lastAt || ""))).slice(-200);
  scoped.docs = Object.fromEntries(entries);
  scoped.updatedAt = at;
  ledger.scopes[key] = scoped;
  ledger.updatedAt = at;
  writeJsonAtomic(ledger.file, {
    schema: "ccm-group-typed-memory-recall-ledger-v1",
    version: 1,
    scopes: ledger.scopes,
    updatedAt: at,
  });
  return readGroupTypedMemoryRecallLedger(groupId);
}

export function buildGroupTypedMemoryRecall(groupId: string, query: string, options: any = {}) {
  const text = String(query || "");
  const index = buildGroupTypedMemoryIndex(groupId);
  if (shouldIgnoreGroupMemoryRequest(text, options)) {
    return {
      schema: "ccm-group-typed-memory-recall-v1",
      ignored: true,
      reason: "user_requested_ignore_memory",
      indexFile: index.file,
      memoryDir: index.dir,
      recalled: [],
      surfaced: [],
    };
  }
  const queryTokens = tokens(text);
  const targetPaths = deriveGroupTypedMemoryTargetPaths(text, options.targetPaths || options.target_paths || []);
  const already = new Set<string>((options.alreadySurfaced || options.already_surfaced || []).map((item: any) => String(item || "").toLowerCase()));
  const recentTools = new Set<string>((options.recentTools || options.recent_tools || []).map((item: any) => String(item || "").toLowerCase()).filter(Boolean));
  const postCompactUsageHints = normalizePostCompactCandidateUsageHints(options);
  const diagnostics: any[] = [];
  const scored = index.docs.map(doc => {
    if (already.has(doc.relPath.toLowerCase()) || already.has(doc.file.toLowerCase())) {
      diagnostics.push({ relPath: doc.relPath, skipped: true, reason: "already_surfaced" });
      return null;
    }
    const pathCondition = evaluateTypedMemoryPathCondition(doc, targetPaths);
    if (pathCondition.conditional && !pathCondition.matched) {
      diagnostics.push({ relPath: doc.relPath, skipped: true, reason: "path_condition_miss", globs: pathCondition.globs, targetPaths });
      return null;
    }
    const corpus = `${doc.name}\n${doc.description}\n${doc.body}`.toLowerCase();
    let score = 0;
    for (const token of queryTokens) if (corpus.includes(token)) score += token.length >= 5 ? 3 : 1;
    if (doc.type === "user") score += 4;
    if (doc.type === "feedback") score += 3;
    if (doc.type === "project") score += 2;
    if (doc.type === "reference") score += 1;
    if (pathCondition.conditional && pathCondition.matched) score += 8;
    for (const tool of recentTools) {
      if (!tool || !corpus.includes(tool)) continue;
      if (/(警告|陷阱|风险|失败|阻塞|不要|禁止|warning|pitfall|risk|failed|blocked|do not|never)/i.test(corpus)) score += 2;
      else score -= 4;
    }
    const postCompactUsage = scorePostCompactCandidateUsageHint(corpus, postCompactUsageHints);
    if (postCompactUsage.adjustment) score += postCompactUsage.adjustment;
    if (score <= 0 && queryTokens.length && !(pathCondition.conditional && pathCondition.matched)) {
      diagnostics.push({ relPath: doc.relPath, skipped: true, reason: "low_score", score, postCompactUsage });
      return null;
    }
    diagnostics.push({ relPath: doc.relPath, skipped: false, score, pathCondition, postCompactUsage });
    return {
      ...doc,
      pathCondition,
      score,
      postCompactUsage,
      snippet: extractSnippet(doc.body, queryTokens, Number(options.snippetChars || options.snippet_chars || 800)),
    };
  }).filter(Boolean).sort((a: any, b: any) => b.score - a.score || b.mtimeMs - a.mtimeMs);
  const recalled = scored.slice(0, Math.max(1, Number(options.max || options.limit || GROUP_TYPED_MEMORY_MAX_RECALL)));
  return {
    schema: "ccm-group-typed-memory-recall-v1",
    ignored: false,
    reason: "",
    indexFile: index.file,
    memoryDir: index.dir,
    recalled,
    surfaced: recalled.map((item: any) => item.relPath),
    candidateCount: index.docs.length,
    targetPaths,
    conditionalMatched: diagnostics.filter((item: any) => item.pathCondition?.conditional && item.pathCondition?.matched).length,
    conditionalSkipped: diagnostics.filter((item: any) => item.reason === "path_condition_miss").length,
    postCompactUsageScoring: {
      schema: "ccm-group-typed-memory-post-compact-usage-scoring-v1",
      hint_count: postCompactUsageHints.length,
      matched_count: diagnostics.filter((item: any) => Array.isArray(item.postCompactUsage?.matched) && item.postCompactUsage.matched.length).length,
      boosted_count: diagnostics.filter((item: any) => Number(item.postCompactUsage?.adjustment || 0) > 0).length,
      deprioritized_count: diagnostics.filter((item: any) => Number(item.postCompactUsage?.adjustment || 0) < 0).length,
    },
    diagnostics: diagnostics.slice(-40),
  };
}

export function renderGroupTypedMemoryRecall(recall: any) {
  if (!recall) return "";
  if (recall.ignored) return "类型化长期记忆：用户要求本轮忽略记忆，按空 MEMORY.md 处理。";
  const docs = Array.isArray(recall.recalled) ? recall.recalled : [];
  if (!docs.length) return "";
  const lines = [
    `类型化长期记忆（MEMORY.md 索引召回，路径条件匹配 ${recall.conditionalMatched || 0}、跳过 ${recall.conditionalSkipped || 0}；使用前如涉及文件/函数/flag 必须再核验当前仓库）：`,
  ];
  for (const doc of docs) {
    const pathHint = doc.pathCondition?.conditional ? `；paths ${doc.pathCondition.matchedPaths?.join(",") || "matched"}` : "";
    const usageHint = Array.isArray(doc.postCompactUsage?.matched) && doc.postCompactUsage.matched.length
      ? `；post-compact usage ${doc.postCompactUsage.adjustment > 0 ? "+" : ""}${doc.postCompactUsage.adjustment}`
      : "";
    lines.push(`- [${doc.type}] ${doc.name}（score ${doc.score}，${doc.relPath}${pathHint}${usageHint}）：${doc.description || ""}`);
    if (doc.snippet) lines.push(`  ${compactText(doc.snippet, 700).replace(/\n/g, "\n  ")}`);
  }
  return lines.join("\n");
}

export function runGroupTypedMemoryIndexSelfTest() {
  const groupId = `typed-memory-selftest-${process.pid}-${Date.now().toString(36)}`;
  const dir = getGroupTypedMemoryDir(groupId);
  try {
    const sync = syncGroupTypedMemoryFromGroupMemory(groupId, {
      goal: "实现支付回调，必须保留 IDEMPOTENCY_TYPED_SENTINEL",
      persistentRequirements: [{ messageId: "u1", text: "必须保留 IDEMPOTENCY_TYPED_SENTINEL，不能跳过验签。" }],
      decisions: [{ decision: "使用 webhook idempotency key", reason: "避免重复入账" }],
      blocked: [{ project: "api", reason: "验签测试失败" }],
      factAnchors: [{ id: "f1", type: "user_requirement", messageId: "u1", text: "支付回调依赖 src/pay.ts" }],
      compaction: { postCompactReinject: { hasCandidates: true, files: [{ value: "src/pay.ts", sourceMessageId: "a1" }], verification: [{ value: "npm run check", sourceMessageId: "a2" }] } },
      messageDigest: "群聊会话压缩摘要：支付回调仍在进行。",
    });
    const recall = buildGroupTypedMemoryRecall(groupId, "支付回调 IDEMPOTENCY_TYPED_SENTINEL src/pay.ts npm run check", {});
    const ledgerBefore = getAlreadySurfacedGroupTypedMemory(groupId, "api");
    recordGroupTypedMemoryRecall(groupId, "api", recall, "支付回调 IDEMPOTENCY_TYPED_SENTINEL");
    const ledgerAfter = getAlreadySurfacedGroupTypedMemory(groupId, "api");
    const deduped = buildGroupTypedMemoryRecall(groupId, "支付回调 IDEMPOTENCY_TYPED_SENTINEL src/pay.ts npm run check", { alreadySurfaced: ledgerAfter });
    const ignored = buildGroupTypedMemoryRecall(groupId, "本轮请忽略记忆，只看当前任务", {});
    const rendered = renderGroupTypedMemoryRecall(recall);
    const checks = {
      indexCreated: fs.existsSync(sync.index.file) && fs.readFileSync(sync.index.file, "utf-8").includes("MEMORY.md"),
      fourTypeDocsCreated: sync.index.docs.some((item: any) => item.type === "user")
        && sync.index.docs.some((item: any) => item.type === "project")
        && sync.index.docs.some((item: any) => item.type === "feedback")
        && sync.index.docs.some((item: any) => item.type === "reference"),
      recallFindsSentinel: recall.recalled.some((item: any) => `${item.name}\n${item.snippet}`.includes("IDEMPOTENCY_TYPED_SENTINEL")),
      recallFindsFile: JSON.stringify(recall.recalled).includes("src/pay.ts"),
      recallLedgerStartsEmpty: ledgerBefore.length === 0,
      recallLedgerRecordsSurfaced: ledgerAfter.length >= recall.surfaced.length && ledgerAfter.length > 0,
      alreadySurfacedDedupesRecall: deduped.recalled.length < recall.recalled.length,
      ignoreMemoryHonored: ignored.ignored === true && ignored.recalled.length === 0,
      renderedMentionsVerification: rendered.includes("类型化长期记忆") && rendered.includes("npm run check"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, indexFile: sync.index.file, recalled: recall.recalled.map((item: any) => item.relPath) };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupTypedMemoryPostCompactUsageScoringSelfTest() {
  const groupId = `typed-memory-post-compact-usage-scoring-selftest-${process.pid}-${Date.now().toString(36)}`;
  const dir = getGroupTypedMemoryDir(groupId);
  try {
    upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "post-compact-useful-candidate",
      name: "Recovered useful candidate",
      description: "恢复候选任务中多次被 used / verified 的文件。",
      source: "selftest:post-compact-usage",
      body: "RECOVERED_USEFUL_SENTINEL：src/recovered.ts 是压缩后恢复候选，历史回执 used/verified 后应提高 MEMORY.md 召回优先级。",
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "post-compact-ignored-candidate",
      name: "Recovered ignored candidate",
      description: "恢复候选任务中多次被 ignored 的旧文件。",
      source: "selftest:post-compact-usage",
      body: "RECOVERED_IGNORED_SENTINEL：src/ignored.ts 是历史多次 ignored 的压缩恢复候选，除非当前任务强相关，否则应被降权。",
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "project",
      slug: "post-compact-neutral-candidate",
      name: "Neutral project memory",
      description: "普通恢复候选任务背景。",
      source: "selftest:post-compact-usage",
      body: "RECOVERED_NEUTRAL_SENTINEL：普通项目背景，不带候选使用账本信号。",
    });
    const recall = buildGroupTypedMemoryRecall(groupId, "继续恢复候选任务", {
      max: 5,
      postCompactCandidateUsage: {
        useful_candidates: [{
          candidate_id: "pcrc_useful",
          value: "src/recovered.ts",
          recommendation: "promote_recall",
          used_count: 2,
          verified_count: 1,
        }],
        ignored_candidates: [{
          candidate_id: "pcrc_ignored",
          value: "src/ignored.ts",
          recommendation: "deprioritize_or_distill",
          ignored_count: 3,
        }],
      },
    });
    const rendered = renderGroupTypedMemoryRecall(recall);
    const useful: any = recall.recalled.find((item: any) => item.relPath.includes("post-compact-useful-candidate"));
    const ignored: any = recall.recalled.find((item: any) => item.relPath.includes("post-compact-ignored-candidate"));
    const checks = {
      usefulCandidateRecalled: !!useful
        && String(JSON.stringify(useful)).includes("RECOVERED_USEFUL_SENTINEL"),
      usefulCandidateBoosted: Number(useful?.postCompactUsage?.adjustment || 0) > 0
        && useful.postCompactUsage.matched?.some((item: any) => item.recommendation === "promote_recall"),
      ignoredCandidateDeprioritized: !ignored
        && recall.diagnostics?.some((item: any) => item.relPath.includes("post-compact-ignored-candidate")
          && Number(item.postCompactUsage?.adjustment || 0) < 0),
      recallSummaryCountsUsageScoring: recall.postCompactUsageScoring?.hint_count === 2
        && recall.postCompactUsageScoring?.boosted_count >= 1
        && recall.postCompactUsageScoring?.deprioritized_count >= 1,
      renderedShowsUsageAdjustment: rendered.includes("post-compact usage +")
        && rendered.includes("RECOVERED_USEFUL_SENTINEL"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      scoring: recall.postCompactUsageScoring,
      recalled: recall.recalled.map((item: any) => ({ relPath: item.relPath, score: item.score, postCompactUsage: item.postCompactUsage })),
    };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupTypedMemoryLoadPlanSelfTest() {
  const groupId = `typed-memory-load-plan-selftest-${process.pid}-${Date.now().toString(36)}`;
  const dir = getGroupTypedMemoryDir(groupId);
  try {
    upsertGroupTypedMemoryDocument(groupId, {
      type: "project",
      slug: "aaa-main-project",
      name: "Main project memory",
      description: "Project memory that includes another typed memory file.",
      source: "selftest",
      body: [
        "# Main Project Memory",
        "LOAD_PLAN_MAIN_SENTINEL",
        "@zzz-included-project.md",
        "@missing-memory.md",
      ].join("\n"),
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "project",
      slug: "zzz-included-project",
      name: "Included project memory",
      description: "Included memory must load before its parent.",
      source: "selftest",
      body: "LOAD_PLAN_INCLUDE_SENTINEL",
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "cycle-a",
      name: "Cycle A",
      description: "Cycle source A",
      source: "selftest",
      body: "@cycle-b.md",
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "feedback",
      slug: "cycle-b",
      name: "Cycle B",
      description: "Cycle source B",
      source: "selftest",
      body: "@cycle-a.md",
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "user",
      slug: "zz-user-requirements",
      name: "User requirements",
      description: "Highest priority user memory.",
      source: "selftest",
      body: "LOAD_PLAN_USER_SENTINEL must win when memory conflicts.",
    });
    const plan = buildGroupTypedMemoryLoadPlan(groupId, {});
    const rendered = renderGroupTypedMemoryLoadPlan(plan);
    const entries = Array.isArray(plan.entries) ? plan.entries : [];
    const byRel = new Map<string, any>(entries.map((entry: any) => [entry.relPath, entry]));
    const included = byRel.get("zzz-included-project.md") || {};
    const parent = byRel.get("aaa-main-project.md") || {};
    const user = byRel.get("zz-user-requirements.md") || {};
    const referencePriority = plan.priorityTiers.reference;
    const projectPriority = plan.priorityTiers.project;
    const feedbackPriority = plan.priorityTiers.feedback;
    const userPriority = plan.priorityTiers.user;
    const checks = {
      schema: plan.schema === "ccm-group-typed-memory-load-plan-v1",
      entrypointFirst: entries[0]?.relPath === GROUP_TYPED_MEMORY_ENTRYPOINT && entries[0]?.kind === "entrypoint",
      priorityTierOrdering: referencePriority < projectPriority && projectPriority < feedbackPriority && feedbackPriority < userPriority,
      includeLoadsBeforeParent: Number(included.loadOrder) < Number(parent.loadOrder)
        && included.parentRelPath === "aaa-main-project.md",
      missingIncludeAudited: plan.issues.some((issue: any) => issue.type === "missing_include" && String(issue.ref || "").includes("missing-memory.md")),
      cycleAudited: plan.issues.some((issue: any) => issue.type === "circular_include"),
      userMemoryHighestPriority: Number(user.priority || 0) === userPriority
        && Number(user.loadOrder || 0) > Number(parent.loadOrder || 0),
      boundedEntries: plan.entryCount <= plan.maxEntries && plan.totalBytes > 0 && plan.estimatedTokens > 0,
      renderedMentionsPlan: rendered.includes("类型化 MEMORY.md 加载计划")
        && rendered.includes("entrypoint < reference < project < feedback < user"),
    };
    return { pass: Object.values(checks).every(Boolean), checks, plan: { status: plan.status, entryCount: plan.entryCount, issues: plan.issues.map((issue: any) => issue.type) } };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupTypedMemoryPathConditionSelfTest() {
  const groupId = `typed-memory-path-condition-selftest-${process.pid}-${Date.now().toString(36)}`;
  const dir = getGroupTypedMemoryDir(groupId);
  try {
    upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "pay-path-rule",
      name: "Payment callback path rule",
      description: "Only applies to payment callback files.",
      source: "selftest",
      paths: ["src/pay.ts", "src/payment/**/*.ts"],
      body: "PATH_CONDITION_PAY_SENTINEL: 支付回调必须验签并保留幂等键。",
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "reference",
      slug: "search-path-rule",
      name: "Search path rule",
      description: "Only applies to search files.",
      source: "selftest",
      paths: ["src/search/**/*.ts"],
      body: "PATH_CONDITION_SEARCH_SENTINEL: 搜索索引刷新需要单独验证。",
    });
    upsertGroupTypedMemoryDocument(groupId, {
      type: "project",
      slug: "general-project",
      name: "General project memory",
      description: "Unconditional memory should still be recallable by query.",
      source: "selftest",
      body: "PATH_CONDITION_GENERAL_SENTINEL: 通用项目记忆。",
    });
    const payRecall = buildGroupTypedMemoryRecall(groupId, "继续 src/pay.ts 支付回调 PATH_CONDITION_PAY_SENTINEL", { max: 8 });
    const searchRecall = buildGroupTypedMemoryRecall(groupId, "继续 src/search/index.ts 搜索索引 PATH_CONDITION_SEARCH_SENTINEL", { max: 8 });
    const unrelatedRecall = buildGroupTypedMemoryRecall(groupId, "继续 docs/readme.md 文档任务 PATH_CONDITION", { max: 8 });
    const payPlan = buildGroupTypedMemoryLoadPlan(groupId, { targetPaths: ["src/pay.ts"] });
    const unrelatedPlan = buildGroupTypedMemoryLoadPlan(groupId, { targetPaths: ["docs/readme.md"] });
    const rendered = renderGroupTypedMemoryRecall(payRecall);
    const payEntries = JSON.stringify(payPlan.entries || []);
    const unrelatedEntries = JSON.stringify(unrelatedPlan.entries || []);
    const checks = {
      pathsPersistedInFrontmatter: fs.readFileSync(path.join(dir, "pay-path-rule.md"), "utf-8").includes("\"src/pay.ts\""),
      payRecallIncludesPayRule: JSON.stringify(payRecall.recalled || []).includes("PATH_CONDITION_PAY_SENTINEL"),
      payRecallSkipsSearchRule: !JSON.stringify(payRecall.recalled || []).includes("PATH_CONDITION_SEARCH_SENTINEL"),
      searchRecallIncludesSearchRule: JSON.stringify(searchRecall.recalled || []).includes("PATH_CONDITION_SEARCH_SENTINEL"),
      unrelatedSkipsConditionalRules: !JSON.stringify(unrelatedRecall.recalled || []).includes("PATH_CONDITION_PAY_SENTINEL")
        && !JSON.stringify(unrelatedRecall.recalled || []).includes("PATH_CONDITION_SEARCH_SENTINEL"),
      diagnosticsRecordPathMiss: unrelatedRecall.diagnostics.some((item: any) => item.reason === "path_condition_miss"),
      loadPlanIncludesMatchedConditional: payEntries.includes("pay-path-rule.md") && !payEntries.includes("search-path-rule.md"),
      loadPlanSkipsUnmatchedConditionals: !unrelatedEntries.includes("pay-path-rule.md") && !unrelatedEntries.includes("search-path-rule.md"),
      loadPlanCountsConditionalSkips: unrelatedPlan.conditionalSkipped >= 2 && payPlan.conditionalMatched >= 1,
      renderedMentionsPathCondition: rendered.includes("路径条件匹配") && rendered.includes("src/pay.ts"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      payRecall: { surfaced: payRecall.surfaced, conditionalMatched: payRecall.conditionalMatched, conditionalSkipped: payRecall.conditionalSkipped },
      payPlan: { conditionalMatched: payPlan.conditionalMatched, conditionalSkipped: payPlan.conditionalSkipped },
    };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupProjectMemoryImportSelfTest() {
  const groupId = `project-memory-import-selftest-${process.pid}-${Date.now().toString(36)}`;
  const typedDir = getGroupTypedMemoryDir(groupId);
  const projectRoot = path.join(CCM_DIR, "tmp-project-memory-import-selftest", groupId);
  try {
    fs.mkdirSync(path.join(projectRoot, ".claude", "rules"), { recursive: true });
    fs.mkdirSync(path.join(projectRoot, "docs"), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, "CLAUDE.md"), [
      "# Project Instructions",
      "@./docs/project-extra.md",
      "@./docs/missing-project-extra.md",
      "<!-- @./docs/comment-hidden.md -->",
      "PROJECT_MEMORY_IMPORT_ROOT_SENTINEL: all child Agents must preserve project instructions.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(projectRoot, "docs", "project-extra.md"), [
      "# Project Extra Include",
      "PROJECT_MEMORY_IMPORT_INCLUDE_SENTINEL: imported @include content must reach child Agent typed memory.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(projectRoot, "docs", "comment-hidden.md"), [
      "# Hidden Include",
      "PROJECT_MEMORY_IMPORT_COMMENT_HIDDEN_SENTINEL should not be imported from an HTML comment.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(projectRoot, ".claude", "CLAUDE.md"), [
      "# Dot Claude Instructions",
      "PROJECT_MEMORY_IMPORT_DOT_SENTINEL: dot-claude instructions are project memory.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(projectRoot, ".claude", "rules", "pay.md"), [
      "---",
      "name: \"Pay Rule\"",
      "description: \"Payment callback rule\"",
      "paths: [\"src/pay.ts\", \"src/payment/**/*.ts\"]",
      "---",
      "PROJECT_MEMORY_IMPORT_PAY_RULE_SENTINEL: src/pay.ts requires signature verification.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(projectRoot, "CLAUDE.local.md"), [
      "# Local Instructions",
      "PROJECT_MEMORY_IMPORT_LOCAL_SENTINEL: local private instruction imported for CCM context.",
    ].join("\n"), "utf-8");
    const discovery = discoverProjectMemoryFiles(projectRoot, {});
    const imported = importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, { project: "api" });
    const recall = buildGroupTypedMemoryRecall(groupId, "继续 src/pay.ts PROJECT_MEMORY_IMPORT_PAY_RULE_SENTINEL", { max: 10 });
    const includeRecall = buildGroupTypedMemoryRecall(groupId, "继续 PROJECT_MEMORY_IMPORT_INCLUDE_SENTINEL", { max: 10 });
    const unrelated = buildGroupTypedMemoryRecall(groupId, "继续 docs/readme.md PROJECT_MEMORY_IMPORT_PAY_RULE_SENTINEL", { max: 10 });
    const plan = buildGroupTypedMemoryLoadPlan(groupId, { targetPaths: ["src/pay.ts"] });
    const indexText = fs.readFileSync(getGroupTypedMemoryIndexFile(groupId), "utf-8");
    const docs = scanGroupTypedMemoryDocuments(groupId);
    const checks = {
      discoversClaudeFiles: discovery.discoveredCount === 4
        && discovery.files.some((item: any) => item.relPath === "CLAUDE.md")
        && discovery.files.some((item: any) => item.relPath === ".claude/CLAUDE.md")
        && discovery.files.some((item: any) => item.relPath === ".claude/rules/pay.md")
        && discovery.files.some((item: any) => item.relPath === "CLAUDE.local.md"),
      importsTypedDocs: imported.importedCount === 5
        && docs.some(item => String(item.source || "").includes("project-memory:api:project:CLAUDE.md"))
        && docs.some(item => String(item.source || "").includes("project-memory:api:project_rule:.claude/rules/pay.md")),
      importsClaudeIncludes: imported.includeAudit?.schema === "ccm-claude-memory-include-audit-v1"
        && Number(imported.includeAudit.importedIncludeCount || 0) === 1
        && JSON.stringify(includeRecall.recalled || []).includes("PROJECT_MEMORY_IMPORT_INCLUDE_SENTINEL")
        && !JSON.stringify(docs).includes("PROJECT_MEMORY_IMPORT_COMMENT_HIDDEN_SENTINEL"),
      missingIncludeAudited: (imported.issues || []).some((item: any) => item.type === "missing_include" && String(item.ref || "").includes("missing-project-extra.md")),
      preservesPathFrontmatter: docs.some(item => item.relPath.includes("pay") && (item.paths || []).includes("src/pay.ts")),
      recallFindsPathRule: JSON.stringify(recall.recalled || []).includes("PROJECT_MEMORY_IMPORT_PAY_RULE_SENTINEL"),
      unrelatedSkipsPathRule: !JSON.stringify(unrelated.recalled || []).includes("PROJECT_MEMORY_IMPORT_PAY_RULE_SENTINEL")
        && unrelated.diagnostics.some((item: any) => item.reason === "path_condition_miss"),
      loadPlanIncludesImportedRule: JSON.stringify(plan.entries || []).includes(".claude/rules/pay.md")
        && Number(plan.conditionalMatched || 0) >= 1,
      indexLinksImportedDocs: indexText.includes("Project Rule: .claude/rules/pay.md")
        && indexText.includes("Project Memory: CLAUDE.md"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      discovery: { discoveredCount: discovery.discoveredCount, status: discovery.status },
      imported: { importedCount: imported.importedCount, status: imported.status, includeAudit: imported.includeAudit },
      recalled: recall.surfaced,
    };
  } finally {
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(projectRoot, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupGlobalClaudeMemoryImportSelfTest() {
  const groupId = `global-claude-memory-import-selftest-${process.pid}-${Date.now().toString(36)}`;
  const typedDir = getGroupTypedMemoryDir(groupId);
  const root = path.join(CCM_DIR, "tmp-global-claude-memory-import-selftest", groupId);
  const userRoot = path.join(root, "user-claude");
  const managedRoot = path.join(root, "managed-claude");
  try {
    fs.mkdirSync(path.join(userRoot, "rules"), { recursive: true });
    fs.mkdirSync(path.join(managedRoot, ".claude", "rules"), { recursive: true });
    fs.writeFileSync(path.join(userRoot, "CLAUDE.md"), [
      "# User Claude Memory",
      "@../user-external.md",
      "GLOBAL_CLAUDE_USER_SENTINEL: 所有项目子 Agent 都要保留用户全局偏好。",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(root, "user-external.md"), [
      "# User External Include",
      "GLOBAL_CLAUDE_USER_INCLUDE_SENTINEL: user Claude memory may include external text files.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(userRoot, "rules", "pay.md"), [
      "---",
      "name: \"User Pay Rule\"",
      "paths: [\"src/pay.ts\"]",
      "---",
      "GLOBAL_CLAUDE_USER_PAY_RULE_SENTINEL: src/pay.ts 必须先检查用户级支付规则。",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(managedRoot, "CLAUDE.md"), [
      "# Managed Claude Memory",
      "@../managed-external.md",
      "GLOBAL_CLAUDE_MANAGED_SENTINEL: managed policy memory imported.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(root, "managed-external.md"), [
      "# Managed External Include",
      "GLOBAL_CLAUDE_MANAGED_EXTERNAL_SENTINEL should be skipped unless external includes are approved.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(managedRoot, ".claude", "rules", "security.md"), [
      "---",
      "name: \"Managed Security Rule\"",
      "paths: [\"src/**/*.ts\"]",
      "---",
      "GLOBAL_CLAUDE_MANAGED_SECURITY_SENTINEL: TypeScript files require security review.",
    ].join("\n"), "utf-8");
    const discovery = discoverGlobalClaudeMemoryFiles({ userRoot, managedRoot });
    const imported = importGlobalClaudeMemoryToGroupTypedMemory(groupId, { userRoot, managedRoot });
    const recall = buildGroupTypedMemoryRecall(groupId, "继续 src/pay.ts GLOBAL_CLAUDE_USER_PAY_RULE_SENTINEL", { max: 10 });
    const includeRecall = buildGroupTypedMemoryRecall(groupId, "继续 GLOBAL_CLAUDE_USER_INCLUDE_SENTINEL", { max: 10 });
    const unrelated = buildGroupTypedMemoryRecall(groupId, "继续 docs/readme.md GLOBAL_CLAUDE_USER_PAY_RULE_SENTINEL", { max: 10 });
    const docs = scanGroupTypedMemoryDocuments(groupId);
    const indexText = fs.readFileSync(getGroupTypedMemoryIndexFile(groupId), "utf-8");
    const checks = {
      discoversUserAndManaged: discovery.discoveredCount === 4
        && discovery.files.some((item: any) => item.scope === "user" && item.kind === "user")
        && discovery.files.some((item: any) => item.scope === "managed" && item.kind === "managed"),
      importsTypedDocs: imported.importedCount === 5
        && docs.some(item => String(item.source || "").includes("global-claude-memory:user:user:CLAUDE.md"))
        && docs.some(item => String(item.source || "").includes("global-claude-memory:managed:managed:CLAUDE.md")),
      importsUserExternalInclude: imported.includeAudit?.schema === "ccm-claude-memory-include-audit-v1"
        && Number(imported.includeAudit.importedIncludeCount || 0) === 1
        && JSON.stringify(includeRecall.recalled || []).includes("GLOBAL_CLAUDE_USER_INCLUDE_SENTINEL"),
      skipsManagedExternalInclude: (imported.issues || []).some((item: any) => item.type === "external_include_skipped" && String(item.ref || "").includes("managed-external.md"))
        && !JSON.stringify(docs).includes("GLOBAL_CLAUDE_MANAGED_EXTERNAL_SENTINEL"),
      userMemoryHasHighPriorityType: docs.some(item => item.type === "user" && String(item.body || "").includes("GLOBAL_CLAUDE_USER_SENTINEL")),
      managedMemoryIsReference: docs.some(item => item.type === "reference" && String(item.body || "").includes("GLOBAL_CLAUDE_MANAGED_SENTINEL")),
      preservesRulePaths: docs.some(item => String(item.source || "").includes("rules/pay.md") && (item.paths || []).includes("src/pay.ts")),
      recallFindsPathRule: JSON.stringify(recall.recalled || []).includes("GLOBAL_CLAUDE_USER_PAY_RULE_SENTINEL"),
      unrelatedSkipsPathRule: !JSON.stringify(unrelated.recalled || []).includes("GLOBAL_CLAUDE_USER_PAY_RULE_SENTINEL")
        && unrelated.diagnostics.some((item: any) => item.reason === "path_condition_miss"),
      indexLinksGlobalDocs: indexText.includes("User Claude Memory: CLAUDE.md")
        && indexText.includes("Managed Claude Memory: CLAUDE.md"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      discovery: { discoveredCount: discovery.discoveredCount, status: discovery.status },
      imported: { importedCount: imported.importedCount, status: imported.status, includeAudit: imported.includeAudit },
      recalled: recall.surfaced,
    };
  } finally {
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupClaudeMemoryExternalIncludeApprovalSelfTest() {
  const groupId = `claude-external-include-approval-selftest-${process.pid}-${Date.now().toString(36)}`;
  const typedDir = getGroupTypedMemoryDir(groupId);
  const root = path.join(CCM_DIR, "tmp-claude-external-include-approval-selftest", groupId);
  const projectRoot = path.join(root, "project");
  const externalFile = path.join(root, "approved-external.md");
  try {
    fs.mkdirSync(projectRoot, { recursive: true });
    fs.writeFileSync(path.join(projectRoot, "CLAUDE.md"), [
      "# Project With External Include",
      "@../approved-external.md",
      "EXTERNAL_INCLUDE_APPROVAL_ROOT_SENTINEL: root project memory stays imported.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(externalFile, [
      "# Approved External Include",
      "EXTERNAL_INCLUDE_APPROVAL_SENTINEL: approved external include reaches typed memory.",
    ].join("\n"), "utf-8");
    const first = importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, { project: "api" });
    const firstDocs = scanGroupTypedMemoryDocuments(groupId);
    const firstApproval: any = first.includeAudit?.externalIncludeApproval || {};
    const marked = markGroupClaudeMemoryExternalIncludeWarningShown(groupId, {
      includes: firstApproval.pendingExternalIncludes || [],
      actor: "selftest",
    });
    const afterWarning = importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, { project: "api" });
    const afterWarningApproval: any = afterWarning.includeAudit?.externalIncludeApproval || {};
    const approved = approveGroupClaudeMemoryExternalInclude(groupId, {
      includes: firstApproval.pendingExternalIncludes || [{ path: externalFile, parent: path.join(projectRoot, "CLAUDE.md"), scope: "project", kind: "project" }],
      approvedBy: "selftest",
    });
    const second = importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, { project: "api" });
    const recall = buildGroupTypedMemoryRecall(groupId, "继续 EXTERNAL_INCLUDE_APPROVAL_SENTINEL", { max: 10 });
    const secondDocs = scanGroupTypedMemoryDocuments(groupId);
    const secondApproval: any = second.includeAudit?.externalIncludeApproval || {};
    const checks = {
      firstWarnsAndSkips: firstApproval.schema === "ccm-claude-memory-external-include-approval-v1"
        && firstApproval.pendingCount === 1
        && firstApproval.shouldShowWarning === true
        && (first.issues || []).some((item: any) => item.type === "external_include_skipped" && item.approvalRequired === true)
        && !JSON.stringify(firstDocs).includes("EXTERNAL_INCLUDE_APPROVAL_SENTINEL"),
      warningShownSuppressesRepeatPrompt: marked.hasExternalIncludesWarningShown === true
        && afterWarningApproval.pendingCount === 1
        && afterWarningApproval.shouldShowWarning === false,
      approvalLedgerPersists: approved.approved.some((item: any) => item.path === normalizeExternalIncludeApprovalPath(externalFile))
        && fs.existsSync(getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId)),
      approvedExternalImports: secondApproval.pendingCount === 0
        && secondApproval.approvedCount === 1
        && Number(second.includeAudit?.importedIncludeCount || 0) === 1
        && JSON.stringify(secondDocs).includes("EXTERNAL_INCLUDE_APPROVAL_SENTINEL"),
      recallFindsApprovedExternalInclude: JSON.stringify(recall.recalled || []).includes("EXTERNAL_INCLUDE_APPROVAL_SENTINEL"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      first: { importedCount: first.importedCount, approval: firstApproval },
      second: { importedCount: second.importedCount, approval: secondApproval },
      recalled: recall.surfaced,
    };
  } finally {
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupClaudeMemorySettingSourcePolicySelfTest() {
  const groupId = `claude-setting-source-policy-selftest-${process.pid}-${Date.now().toString(36)}`;
  const typedDir = getGroupTypedMemoryDir(groupId);
  const root = path.join(CCM_DIR, "tmp-claude-setting-source-policy-selftest", groupId);
  const projectRoot = path.join(root, "project");
  const userRoot = path.join(root, "user-claude");
  const managedRoot = path.join(root, "managed-claude");
  try {
    fs.mkdirSync(path.join(projectRoot, ".claude", "rules"), { recursive: true });
    fs.mkdirSync(userRoot, { recursive: true });
    fs.mkdirSync(managedRoot, { recursive: true });
    fs.writeFileSync(path.join(projectRoot, "CLAUDE.md"), "SETTING_SOURCE_PROJECT_SENTINEL: project source enabled.\n", "utf-8");
    fs.writeFileSync(path.join(projectRoot, ".claude", "rules", "rule.md"), "SETTING_SOURCE_PROJECT_RULE_SENTINEL: project rule enabled.\n", "utf-8");
    fs.writeFileSync(path.join(projectRoot, "CLAUDE.local.md"), "SETTING_SOURCE_LOCAL_SENTINEL: local source enabled.\n", "utf-8");
    fs.writeFileSync(path.join(userRoot, "CLAUDE.md"), "SETTING_SOURCE_USER_SENTINEL: user source enabled.\n", "utf-8");
    fs.writeFileSync(path.join(managedRoot, "CLAUDE.md"), "SETTING_SOURCE_MANAGED_SENTINEL: managed policy source always enabled.\n", "utf-8");

    const defaultPolicy = buildClaudeMemorySettingSourcePolicy({});
    const isolatedPolicy = buildClaudeMemorySettingSourcePolicy({ settingSources: "" });
    const projectDiscovery = discoverProjectMemoryFiles(projectRoot, { settingSources: "project" });
    const localDiscovery = discoverProjectMemoryFiles(projectRoot, { settingSources: "local" });
    const isolatedProjectDiscovery = discoverProjectMemoryFiles(projectRoot, { settingSources: "" });
    const isolatedGlobal = importGlobalClaudeMemoryToGroupTypedMemory(groupId, { userRoot, managedRoot, settingSources: "" });
    const isolatedRecall = buildGroupTypedMemoryRecall(groupId, "SETTING_SOURCE_MANAGED_SENTINEL SETTING_SOURCE_USER_SENTINEL", { max: 10 });
    const docs = scanGroupTypedMemoryDocuments(groupId);
    const checks = {
      defaultEnablesEditableAndAlwaysOn: defaultPolicy.includeUser === true
        && defaultPolicy.includeProject === true
        && defaultPolicy.includeLocal === true
        && defaultPolicy.includeManaged === true
        && defaultPolicy.includeFlagSettings === true,
      emptySettingSourcesEnterIsolationButKeepManaged: isolatedPolicy.isolationMode === true
        && isolatedPolicy.includeUser === false
        && isolatedPolicy.includeProject === false
        && isolatedPolicy.includeLocal === false
        && isolatedPolicy.includeManaged === true,
      projectOnlySkipsLocal: projectDiscovery.settingSourcePolicy?.enabled?.includes("projectSettings")
        && projectDiscovery.discoveredCount === 2
        && projectDiscovery.files.some((item: any) => item.relPath === "CLAUDE.md")
        && projectDiscovery.files.some((item: any) => item.relPath === ".claude/rules/rule.md")
        && !projectDiscovery.files.some((item: any) => item.relPath === "CLAUDE.local.md"),
      localOnlySkipsProject: localDiscovery.discoveredCount === 1
        && localDiscovery.files.some((item: any) => item.relPath === "CLAUDE.local.md")
        && !localDiscovery.files.some((item: any) => item.relPath === "CLAUDE.md"),
      isolatedProjectSkipsProjectAndLocal: isolatedProjectDiscovery.discoveredCount === 0
        && isolatedProjectDiscovery.settingSourcePolicy?.isolationMode === true,
      isolatedGlobalImportsManagedOnly: isolatedGlobal.settingSourcePolicy?.isolationMode === true
        && isolatedGlobal.includeUser === false
        && isolatedGlobal.includeManaged === true
        && isolatedGlobal.importedCount === 1
        && JSON.stringify(docs).includes("SETTING_SOURCE_MANAGED_SENTINEL")
        && !JSON.stringify(docs).includes("SETTING_SOURCE_USER_SENTINEL"),
      recallFindsManagedButNotUser: JSON.stringify(isolatedRecall.recalled || []).includes("SETTING_SOURCE_MANAGED_SENTINEL")
        && !JSON.stringify(isolatedRecall.recalled || []).includes("SETTING_SOURCE_USER_SENTINEL"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      defaultPolicy,
      isolatedPolicy,
      projectDiscovery: { discoveredCount: projectDiscovery.discoveredCount, files: projectDiscovery.files.map((item: any) => item.relPath) },
      isolatedGlobal: { importedCount: isolatedGlobal.importedCount, includeUser: isolatedGlobal.includeUser, includeManaged: isolatedGlobal.includeManaged },
    };
  } finally {
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(root, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupInstructionsLoadedHookPipelineSelfTest() {
  const groupId = `instructions-loaded-hook-selftest-${process.pid}-${Date.now().toString(36)}`;
  const typedDir = getGroupTypedMemoryDir(groupId);
  const projectRoot = path.join(CCM_DIR, "tmp-instructions-loaded-hook-selftest", groupId);
  const seen: any[] = [];
  const unregisterGood = registerGroupMemoryInstructionsLoadedHook((input: any) => {
    seen.push({ ...input });
    return { observed: input.file_path, reason: input.load_reason };
  });
  const unregisterFailing = registerGroupMemoryInstructionsLoadedHook(() => {
    throw new Error("INSTRUCTIONS_LOADED_HOOK_FAILURE_SENTINEL");
  });
  try {
    fs.mkdirSync(path.join(projectRoot, "docs"), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, "CLAUDE.md"), [
      "# Hook Project Memory",
      "@./docs/hook-include.md",
      "INSTRUCTIONS_LOADED_HOOK_ROOT_SENTINEL: root memory imported.",
    ].join("\n"), "utf-8");
    fs.writeFileSync(path.join(projectRoot, "docs", "hook-include.md"), [
      "# Hook Include",
      "INSTRUCTIONS_LOADED_HOOK_INCLUDE_SENTINEL: include memory imported.",
    ].join("\n"), "utf-8");
    const imported = importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, {
      project: "api",
      instructionsLoadReason: "session_start",
    });
    const hookSummary: any = imported.instructionsLoadedHooks || {};
    const ledger = loadGroupClaudeInstructionsLoadedHookLedger(groupId);
    const recall = buildGroupTypedMemoryRecall(groupId, "INSTRUCTIONS_LOADED_HOOK_INCLUDE_SENTINEL", { max: 10 });
    const renderedPlan = renderGroupTypedMemoryLoadPlan(buildGroupTypedMemoryLoadPlan(groupId, {}));
    const checks = {
      hooksRegistered: hasGroupMemoryInstructionsLoadedHook() === true,
      hookSummaryRecordsEvents: hookSummary.schema === "ccm-claude-instructions-loaded-hook-import-summary-v1"
        && hookSummary.eventCount === 2
        && hookSummary.firedCount === 4
        && hookSummary.failureCount === 2
        && fs.existsSync(hookSummary.ledgerFile),
      goodHookSawTopLevelAndInclude: seen.length === 2
        && seen.some(item => item.memory_type === "Project" && item.load_reason === "session_start" && String(item.file_path || "").endsWith("CLAUDE.md"))
        && seen.some(item => item.memory_type === "Project" && item.load_reason === "include" && String(item.parent_file_path || "").endsWith("CLAUDE.md")),
      ledgerPersistsRows: Array.isArray(ledger.entries)
        && ledger.entries.length >= 2
        && ledger.entries.every((entry: any) => Array.isArray(entry.rows) && entry.rows.length === 2)
        && JSON.stringify(ledger.entries).includes("INSTRUCTIONS_LOADED_HOOK_FAILURE_SENTINEL"),
      importContinuesAfterHookFailure: imported.importedCount === 2
        && JSON.stringify(recall.recalled || []).includes("INSTRUCTIONS_LOADED_HOOK_INCLUDE_SENTINEL"),
      typedLoadPlanStillWorks: renderedPlan.includes("类型化 MEMORY.md 加载计划"),
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      hookSummary: { eventCount: hookSummary.eventCount, firedCount: hookSummary.firedCount, failureCount: hookSummary.failureCount },
      seen: seen.map(item => ({ memory_type: item.memory_type, load_reason: item.load_reason, parent_file_path: item.parent_file_path })),
    };
  } finally {
    unregisterGood();
    unregisterFailing();
    try { fs.rmSync(typedDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(projectRoot, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupTypedMemoryLogDistillationSelfTest() {
  const groupId = `typed-memory-distill-selftest-${process.pid}-${Date.now().toString(36)}`;
  const dir = getGroupTypedMemoryDir(groupId);
  const messages: any[] = [
    {
      id: "ld-u0",
      role: "user",
      target: "coordinator",
      content: "必须长期记住 LOG_DISTILL_SENTINEL_20260707，支付回调不能跳过验签。",
    },
    {
      id: "ld-a1",
      role: "assistant",
      agent: "coordinator",
      dispatchPolicy: { action: "delegate", reason: "使用 api-agent 修改 src/pay.ts 并运行 npm run check" },
      assignments: [{ project: "api", task: "实现支付回调验签" }],
      content: "决定使用 webhook idempotency key，涉及 src/pay.ts。",
    },
    {
      id: "ld-a2",
      role: "assistant",
      agent: "api-agent",
      task_id: "ld-task",
      content: "执行失败：npm run check failed，src/pay.ts 签名校验异常，需要继续修复。Skill:typescript-audit",
      receipt: { status: "failed", taskId: "ld-task", verification: ["npm run check failed"] },
    },
    {
      id: "ld-a3",
      role: "assistant",
      agent: "api-agent",
      task_id: "ld-task",
      content: "修复 src/pay.ts 后 npm run check passed。",
      receipt: { status: "done", taskId: "ld-task", summary: "支付回调验签修复", verification: ["npm run check passed"] },
    },
  ];
  const originalMessages = JSON.stringify(messages);
  try {
    const first = distillGroupMessagesToTypedMemory(groupId, messages, { goal: "日志蒸馏自测" }, { reason: "selftest" });
    const second = distillGroupMessagesToTypedMemory(groupId, messages, { goal: "日志蒸馏自测" }, { reason: "selftest-repeat" });
    const recall = buildGroupTypedMemoryRecall(groupId, "LOG_DISTILL_SENTINEL_20260707 src/pay.ts npm run check failed", { disableLedger: true, max: 8 });
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const indexText = fs.readFileSync(getGroupTypedMemoryIndexFile(groupId), "utf-8");
    const docs = scanGroupTypedMemoryDocuments(groupId);
    const rendered = renderGroupTypedMemoryRecall(recall);
    const checks = {
      distillationCreatedFacts: first.newFactCount > 0 && first.writeCount >= 4,
      repeatDoesNotAddDuplicates: second.newFactCount === 0 && second.updatedFactCount >= first.newFactCount,
      qualityReportRecorded: first.quality?.schema === "ccm-group-typed-memory-distillation-quality-v1"
        && typeof first.quality.score === "number",
      ledgerPersistsFacts: Object.values(ledger.facts || {}).some((bucket: any) => Object.keys(bucket || {}).length > 0),
      fourTypedDocsCreated: docs.some(item => item.relPath === "distilled-log-user-requirements.md")
        && docs.some(item => item.relPath === "distilled-log-project-context.md")
        && docs.some(item => item.relPath === "distilled-log-feedback-failures.md")
        && docs.some(item => item.relPath === "distilled-log-reference-artifacts.md"),
      indexLinksDistilledDocs: indexText.includes("distilled-log-user-requirements.md") && indexText.includes("distilled-log-reference-artifacts.md"),
      recallFindsSentinelAndFile: JSON.stringify(recall.recalled).includes("LOG_DISTILL_SENTINEL_20260707")
        && JSON.stringify(recall.recalled).includes("src/pay.ts"),
      recallFindsFailureAndVerification: JSON.stringify(recall.recalled).includes("npm run check failed")
        && JSON.stringify(recall.recalled).includes("npm run check passed"),
      renderedMentionsDistilledMemory: rendered.includes("类型化长期记忆") && rendered.includes("Distilled"),
      rawTranscriptUntouched: JSON.stringify(messages) === originalMessages,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      first: { newFactCount: first.newFactCount, writeCount: first.writeCount },
      second: { newFactCount: second.newFactCount, updatedFactCount: second.updatedFactCount },
      recalled: recall.recalled.map((item: any) => item.relPath),
    };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupTypedMemoryPostCompactUsageDistillationSelfTest() {
  const groupId = `typed-memory-post-compact-usage-distill-selftest-${process.pid}-${Date.now().toString(36)}`;
  const dir = getGroupTypedMemoryDir(groupId);
  const usage = {
    ignored_candidates: [{
      candidate_id: "pcrc_stale_recovered",
      value: "src/stale-recovered.ts",
      recommendation: "deprioritize_or_distill",
      ignored_count: 4,
      used_count: 0,
      verified_count: 0,
    }],
    missing_usage_candidates: [{
      candidate_id: "pcrc_missing_usage",
      value: "npm run stale-check",
      recommendation: "require_usage_receipt",
      mentioned_count: 2,
    }],
  };
  const messages: any[] = [{
    id: "pcud-u0",
    role: "user",
    target: "coordinator",
    content: "必须长期保留 USAGE_DISTILLATION_SENTINEL，但旧恢复候选 src/stale-recovered.ts 已经被多次忽略。",
  }];
  try {
    const distillation = distillGroupMessagesToTypedMemory(groupId, messages, { goal: "usage distillation selftest" }, {
      reason: "post-compact-usage-distillation-selftest",
      postCompactCandidateUsage: usage,
    });
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const docs = scanGroupTypedMemoryDocuments(groupId);
    const archive = docs.find(item => item.relPath === "post-compact-candidate-usage-archive.md");
    const archiveText = archive ? fs.readFileSync(archive.file, "utf-8") : "";
    const recall = buildGroupTypedMemoryRecall(groupId, "src/stale-recovered.ts stale recovered candidate", {
      max: 8,
      postCompactCandidateUsage: usage,
    });
    const checks = {
      archiveDocWritten: !!archive
        && archiveText.includes("Post-Compact Candidate Usage Archive")
        && archiveText.includes("src/stale-recovered.ts")
        && archiveText.includes("npm run stale-check"),
      distillationReportsArchive: distillation.postCompactUsageArchive?.archived_count === 2
        && distillation.writes?.some((item: any) => item.slug === "post-compact-candidate-usage-archive"),
      ledgerPersistsArchive: ledger.postCompactUsageArchive?.archived_count === 2
        && JSON.stringify(ledger.postCompactUsageArchive?.rows || []).includes("pcrc_stale_recovered"),
      recallDeprioritizesArchive: recall.diagnostics?.some((item: any) => item.relPath === "post-compact-candidate-usage-archive.md"
        && Number(item.postCompactUsage?.adjustment || 0) < 0),
      recallScoringCountsArchive: recall.postCompactUsageScoring?.hint_count === 2
        && recall.postCompactUsageScoring?.deprioritized_count >= 1,
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      archive: distillation.postCompactUsageArchive,
      recalled: recall.recalled.map((item: any) => ({ relPath: item.relPath, score: item.score, postCompactUsage: item.postCompactUsage })),
    };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export function runGroupTypedMemoryDistillationQualitySelfTest() {
  const groupId = `typed-memory-quality-selftest-${process.pid}-${Date.now().toString(36)}`;
  const dir = getGroupTypedMemoryDir(groupId);
  const missingPath = "src/missing-distillation-quality.ts";
  const messages: any[] = [
    {
      id: "dq-u0",
      role: "user",
      target: "coordinator",
      content: "必须长期保留 DISTILL_QUALITY_SENTINEL_20260707，并核验 package.json 与 src/missing-distillation-quality.ts。",
    },
    {
      id: "dq-a1",
      role: "assistant",
      agent: "quality-agent",
      task_id: "quality-task",
      content: "完成 quality-task，已查看 package.json。",
      receipt: { status: "done", taskId: "quality-task", summary: "完成 package.json 检查" },
    },
    {
      id: "dq-a2",
      role: "assistant",
      agent: "quality-agent",
      task_id: "quality-task",
      content: `执行失败：quality-task blocked，${missingPath} 不存在，需要继续修复。`,
      receipt: { status: "failed", taskId: "quality-task", summary: "missing path" },
    },
  ];
  try {
    const distillation = distillGroupMessagesToTypedMemory(groupId, messages, {}, { reason: "quality-selftest", projectRoot: process.cwd() });
    const ledger = readGroupTypedMemoryDistillationLedger(groupId);
    const quality: any = distillation.quality || {};
    const fileCheck = (quality.checks || []).find((check: any) => check.id === "file_path_claims_checked") || {};
    const contradictionCheck = (quality.checks || []).find((check: any) => check.id === "no_unresolved_status_contradictions") || {};
    const sourceCheck = (quality.checks || []).find((check: any) => check.id === "source_message_links_preserved") || {};
    const checks = {
      qualityReportCreated: quality.schema === "ccm-group-typed-memory-distillation-quality-v1",
      qualityStoredInLedger: ledger.quality?.schema === "ccm-group-typed-memory-distillation-quality-v1",
      stalePathDetected: quality.stalePathCount > 0 && fileCheck.pass === false && JSON.stringify(fileCheck.gaps || []).includes(missingPath),
      existingPathNotFlagged: !JSON.stringify(fileCheck.gaps || []).includes("package.json ->"),
      contradictionDetected: quality.contradictionCount > 0 && contradictionCheck.pass === false && JSON.stringify(contradictionCheck.gaps || []).includes("quality-task"),
      sourceLinksPreserved: sourceCheck.pass === true,
      qualityStatusNotPass: quality.status === "degraded" || quality.status === "failed",
    };
    return {
      pass: Object.values(checks).every(Boolean),
      checks,
      quality: {
        score: quality.score,
        status: quality.status,
        stalePathCount: quality.stalePathCount,
        contradictionCount: quality.contradictionCount,
      },
    };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}
