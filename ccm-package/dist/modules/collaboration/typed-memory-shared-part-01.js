"use strict";
// Behavior-freeze split from typed-memory-shared.ts (part 1/2).
// Behavior-freeze module extracted mechanically from the former facade.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROUP_GLOBAL_CLAUDE_MEMORY_IMPORT_VERSION = exports.GROUP_PROJECT_MEMORY_IMPORT_VERSION = exports.GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_INCLUDE_DEPTH = exports.GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_ENTRIES = exports.GROUP_TYPED_MEMORY_LOAD_PLAN_VERSION = exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_CROSS_GROUP_MAX_GROUPS = exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_STALE_AFTER_DAYS = exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_HALF_LIFE_DAYS = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RATIO_THRESHOLD = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_MIN_BRANCH_WEIGHT = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_EVIDENCE_CONFIDENCE_THRESHOLD = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_TASK_FAMILY_RELEVANCE_THRESHOLD = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_STALE_AFTER_DAYS = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_HALF_LIFE_DAYS = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_LEDGER = exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_LEDGER = exports.GROUP_TYPED_MEMORY_CONSUMPTION_STALE_AFTER_DAYS = exports.GROUP_TYPED_MEMORY_CONSUMPTION_HALF_LIFE_DAYS = exports.GROUP_TYPED_MEMORY_STALE_CANDIDATE_LEDGER = exports.GROUP_TYPED_MEMORY_CONSUMPTION_LEDGER = exports.GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_DELIVERY_LEASES_PER_SCOPE = exports.GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_SCOPES = exports.GROUP_TYPED_MEMORY_RECALL_LEDGER = exports.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_RETENTION_DAYS = exports.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_MAX_EVENTS = exports.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_LEDGER = exports.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_VERSION = exports.GROUP_TYPED_MEMORY_SHAPE_TREND_MAX_KEYS_PER_BUCKET = exports.GROUP_TYPED_MEMORY_SHAPE_TREND_MUTABLE_DAYS = exports.GROUP_TYPED_MEMORY_SHAPE_TREND_RETENTION_DAYS = exports.GROUP_TYPED_MEMORY_SHAPE_TREND_LEDGER = exports.GROUP_TYPED_MEMORY_SHAPE_TREND_VERSION = exports.GROUP_TYPED_MEMORY_WRITE_SHAPE_MAX_EVENTS = exports.GROUP_TYPED_MEMORY_WRITE_SHAPE_DIR = exports.GROUP_TYPED_MEMORY_WRITE_SHAPE_VERSION = exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SHAPE_DIR = exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SHAPE_VERSION = exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_CONSUMPTION_DIR = exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_CONSUMPTION_VERSION = exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_OUTCOME_DIR = exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_OUTCOME_VERSION = exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_DECISION_DIR = exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_VERSION = exports.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION = exports.GROUP_TYPED_MEMORY_MANIFEST_MAX_FILES = exports.GROUP_TYPED_MEMORY_MAX_RECALL = exports.GROUP_TYPED_MEMORY_MAX_INDEX_BYTES = exports.GROUP_TYPED_MEMORY_MAX_INDEX_LINES = exports.GROUP_TYPED_MEMORY_ENTRYPOINT = exports.GROUP_TYPED_MEMORY_VERSION = void 0;
exports.GROUP_TYPED_MEMORY_DIR = exports.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_LEDGER = exports.GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_LEDGER = exports.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION = exports.GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION = exports.GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION = exports.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_TTL_MS = exports.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_VERSION = exports.GROUP_PROVIDER_DISPATCH_RELIABILITY_MAX_SOURCE_GROUPS = exports.GROUP_PROVIDER_DISPATCH_RELIABILITY_HALF_LIFE_DAYS = exports.GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION = exports.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION = exports.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION = exports.GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION = exports.GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION = exports.GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION = exports.GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_DIR = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_VERSION = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_HOT_ROW_LIMIT = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_DISTILLATION_VERSION = exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION = exports.GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION = exports.GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION = exports.GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION = exports.GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION = exports.GROUP_POSITIVE_FEEDBACK_LIFECYCLE_VERSION = exports.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_MERGE_MIN_SIMILARITY = exports.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_REUSE_MIN_SIMILARITY = exports.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_ASSIGNMENT_MIN_CONFIDENCE = exports.GROUP_SESSION_MODEL_EXTRACTION_MAX_FACTS_PER_TOPIC_FILE = exports.GROUP_SESSION_MODEL_EXTRACTION_MAX_TOPICS_PER_CATEGORY = exports.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION = exports.GROUP_SESSION_MODEL_EXTRACTION_TYPED_MEMORY_VERSION = exports.GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION = exports.GROUP_TYPED_MEMORY_WRITE_ADMISSION_VERSION = exports.GROUP_TYPED_MEMORY_DISTILLATION_QUALITY_VERSION = exports.GROUP_TYPED_MEMORY_DISTILLATION_FACT_LIMIT = exports.GROUP_TYPED_MEMORY_DISTILLATION_MAX_MESSAGES = exports.GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION = exports.GROUP_TYPED_MEMORY_ARTIFACT_TRANSACTION_STAGE_DIR = exports.GROUP_TYPED_MEMORY_ARTIFACT_TRANSACTION_JOURNAL = exports.GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_STATE = exports.GROUP_TYPED_MEMORY_DISTILLATION_LOCK = exports.GROUP_TYPED_MEMORY_DISTILLATION_LEDGER = exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION = exports.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION = exports.GROUP_CLAUDE_MEMORY_SETTING_SOURCE_POLICY_VERSION = exports.GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION = exports.GROUP_CLAUDE_MEMORY_INCLUDE_AUDIT_VERSION = void 0;
exports.POST_COMPACT_CLOSURE_TASK_FAMILY_CHINESE_STOP_BIGRAMS = exports.POST_COMPACT_CLOSURE_TASK_FAMILY_STOP_WORDS = exports.SEMANTIC_RECALL_CONCEPTS = exports.DELIVERY_CLEANUP_EXECUTION_LEASE_MAX_TTL_MS = exports.DELIVERY_CLEANUP_EXECUTION_LEASE_TTL_MS = exports.DELIVERY_CLEANUP_EXECUTOR_INSTANCE_ID = exports.activeGroupTypedMemoryDistillationMutations = exports.groupMemoryInstructionsLoadedHooks = exports.CLAUDE_MEMORY_INCLUDE_TEXT_EXTENSIONS = exports.CLAUDE_ALWAYS_ON_SETTING_SOURCES = exports.CLAUDE_EDITABLE_SETTING_SOURCES = exports.VALID_TYPES = exports.GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR = exports.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_DIR = void 0;
exports.now = now;
exports.safeSegment = safeSegment;
exports.normalizeMemoryType = normalizeMemoryType;
exports.normalizeClaudeSettingSourceName = normalizeClaudeSettingSourceName;
exports.parseClaudeSettingSources = parseClaudeSettingSources;
exports.compactText = compactText;
exports.uniqueStrings = uniqueStrings;
exports.checksum = checksum;
exports.ensureGroupTypedMemoryDir = ensureGroupTypedMemoryDir;
exports.writeTextAtomicRaw = writeTextAtomicRaw;
exports.writeTextAtomic = writeTextAtomic;
exports.readJson = readJson;
exports.writeJsonAtomic = writeJsonAtomic;
exports.yamlEscape = yamlEscape;
exports.renderFrontmatter = renderFrontmatter;
exports.parseFrontmatter = parseFrontmatter;
exports.normalizePathGlobs = normalizePathGlobs;
exports.normalizeTargetPath = normalizeTargetPath;
exports.globToRegExp = globToRegExp;
exports.pathMatchesTypedMemoryGlobs = pathMatchesTypedMemoryGlobs;
exports.evaluateTypedMemoryPathCondition = evaluateTypedMemoryPathCondition;
exports.listMemoryMarkdownFiles = listMemoryMarkdownFiles;
exports.tokens = tokens;
exports.extractSnippet = extractSnippet;
exports.normalizePostCompactCandidateUsageHints = normalizePostCompactCandidateUsageHints;
exports.firstFiniteNumber = firstFiniteNumber;
exports.truncateGroupTypedMemoryEntrypointContent = truncateGroupTypedMemoryEntrypointContent;
exports.markdownLinkTitle = markdownLinkTitle;
exports.renderMemoryDocument = renderMemoryDocument;
exports.getGroupTypedMemoryDir = getGroupTypedMemoryDir;
exports.normalizeArtifactFile = normalizeArtifactFile;
exports.isCoordinatedGroupTypedMemoryArtifactFile = isCoordinatedGroupTypedMemoryArtifactFile;
exports.activeGroupTypedMemoryArtifactMutationForFile = activeGroupTypedMemoryArtifactMutationForFile;
exports.stageGroupTypedMemoryArtifact = stageGroupTypedMemoryArtifact;
exports.stageGroupTypedMemoryArtifactRemoval = stageGroupTypedMemoryArtifactRemoval;
exports.readGroupTypedMemoryArtifactText = readGroupTypedMemoryArtifactText;
exports.groupTypedMemoryArtifactJournalChecksum = groupTypedMemoryArtifactJournalChecksum;
exports.writeGroupTypedMemoryArtifactJournalRaw = writeGroupTypedMemoryArtifactJournalRaw;
exports.groupTypedMemoryArtifactStageDir = groupTypedMemoryArtifactStageDir;
exports.groupTypedMemoryArtifactTarget = groupTypedMemoryArtifactTarget;
exports.readVerifiedArtifactStageFile = readVerifiedArtifactStageFile;
exports.applyGroupTypedMemoryArtifactVersion = applyGroupTypedMemoryArtifactVersion;
exports.verifyGroupTypedMemoryArtifactVersion = verifyGroupTypedMemoryArtifactVersion;
exports.commitGroupTypedMemoryArtifactMutation = commitGroupTypedMemoryArtifactMutation;
exports.ensureGroupTypedMemoryArtifactReadConsistency = ensureGroupTypedMemoryArtifactReadConsistency;
exports.listMarkdownFilesRecursive = listMarkdownFilesRecursive;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const typed_memory_distillation_receipts_1 = require("./typed-memory-distillation-receipts");
const typed_memory_index_build_1 = require("./typed-memory-index-build");
const typed_memory_ledgers_1 = require("./typed-memory-ledgers");
exports.GROUP_TYPED_MEMORY_VERSION = 1;
exports.GROUP_TYPED_MEMORY_ENTRYPOINT = "MEMORY.md";
exports.GROUP_TYPED_MEMORY_MAX_INDEX_LINES = 200;
exports.GROUP_TYPED_MEMORY_MAX_INDEX_BYTES = 25_000;
exports.GROUP_TYPED_MEMORY_MAX_RECALL = 5;
exports.GROUP_TYPED_MEMORY_MANIFEST_MAX_FILES = 200;
exports.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION = 5;
exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_VERSION = 1;
exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_DECISION_DIR = ".manifest-selector-decisions";
exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_OUTCOME_VERSION = 1;
exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_OUTCOME_DIR = ".manifest-selector-outcomes";
exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_CONSUMPTION_VERSION = 1;
exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_CONSUMPTION_DIR = ".manifest-selector-consumption";
exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SHAPE_VERSION = 1;
exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SHAPE_DIR = ".manifest-selector-shape";
exports.GROUP_TYPED_MEMORY_WRITE_SHAPE_VERSION = 1;
exports.GROUP_TYPED_MEMORY_WRITE_SHAPE_DIR = ".memory-write-shape";
exports.GROUP_TYPED_MEMORY_WRITE_SHAPE_MAX_EVENTS = 400;
exports.GROUP_TYPED_MEMORY_SHAPE_TREND_VERSION = 1;
exports.GROUP_TYPED_MEMORY_SHAPE_TREND_LEDGER = ".memory-shape-trend.json";
exports.GROUP_TYPED_MEMORY_SHAPE_TREND_RETENTION_DAYS = 180;
exports.GROUP_TYPED_MEMORY_SHAPE_TREND_MUTABLE_DAYS = 35;
exports.GROUP_TYPED_MEMORY_SHAPE_TREND_MAX_KEYS_PER_BUCKET = 1_200;
exports.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_VERSION = 1;
exports.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_LEDGER = ".memory-shape-trend-incidents.json";
exports.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_MAX_EVENTS = 500;
exports.GROUP_TYPED_MEMORY_SHAPE_TREND_INCIDENT_RETENTION_DAYS = 180;
exports.GROUP_TYPED_MEMORY_RECALL_LEDGER = ".recall-ledger.json";
exports.GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_SCOPES = 160;
exports.GROUP_TYPED_MEMORY_RECALL_LEDGER_MAX_DELIVERY_LEASES_PER_SCOPE = 160;
exports.GROUP_TYPED_MEMORY_CONSUMPTION_LEDGER = ".typed-memory-consumption-ledger.json";
exports.GROUP_TYPED_MEMORY_STALE_CANDIDATE_LEDGER = ".typed-memory-stale-candidate-ledger.json";
exports.GROUP_TYPED_MEMORY_CONSUMPTION_HALF_LIFE_DAYS = 30;
exports.GROUP_TYPED_MEMORY_CONSUMPTION_STALE_AFTER_DAYS = 90;
exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_LEDGER = ".pressure-recall-usage-ledger.json";
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_LEDGER = ".post-compact-completion-memory-preservation-closure-usage-ledger.json";
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_HALF_LIFE_DAYS = 14;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_USAGE_STALE_AFTER_DAYS = 45;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_TASK_FAMILY_RELEVANCE_THRESHOLD = 0.34;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_EVIDENCE_CONFIDENCE_THRESHOLD = 0.45;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_MIN_BRANCH_WEIGHT = 0.6;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RATIO_THRESHOLD = 0.25;
exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_HALF_LIFE_DAYS = 21;
exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_STALE_AFTER_DAYS = 60;
exports.GROUP_TYPED_MEMORY_PRESSURE_RECALL_USAGE_CROSS_GROUP_MAX_GROUPS = 24;
exports.GROUP_TYPED_MEMORY_LOAD_PLAN_VERSION = 1;
exports.GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_ENTRIES = 80;
exports.GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_INCLUDE_DEPTH = 5;
exports.GROUP_PROJECT_MEMORY_IMPORT_VERSION = 1;
exports.GROUP_GLOBAL_CLAUDE_MEMORY_IMPORT_VERSION = 1;
exports.GROUP_CLAUDE_MEMORY_INCLUDE_AUDIT_VERSION = 1;
exports.GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION = 1;
exports.GROUP_CLAUDE_MEMORY_SETTING_SOURCE_POLICY_VERSION = 1;
exports.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION = 1;
exports.GROUP_TYPED_MEMORY_DISTILLATION_VERSION = 1;
exports.GROUP_TYPED_MEMORY_DISTILLATION_LEDGER = ".distillation-ledger.json";
exports.GROUP_TYPED_MEMORY_DISTILLATION_LOCK = ".distillation-transaction.lock";
exports.GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_STATE = ".distillation-transaction-state.json";
exports.GROUP_TYPED_MEMORY_ARTIFACT_TRANSACTION_JOURNAL = ".distillation-artifact-transaction.json";
exports.GROUP_TYPED_MEMORY_ARTIFACT_TRANSACTION_STAGE_DIR = ".distillation-artifact-stage";
exports.GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION = 1;
exports.GROUP_TYPED_MEMORY_DISTILLATION_MAX_MESSAGES = 1200;
exports.GROUP_TYPED_MEMORY_DISTILLATION_FACT_LIMIT = 100;
exports.GROUP_TYPED_MEMORY_DISTILLATION_QUALITY_VERSION = 1;
exports.GROUP_TYPED_MEMORY_WRITE_ADMISSION_VERSION = 1;
exports.GROUP_TYPED_MEMORY_DIRECT_OPERATION_VERSION = 1;
exports.GROUP_SESSION_MODEL_EXTRACTION_TYPED_MEMORY_VERSION = 1;
exports.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_VERSION = 2;
exports.GROUP_SESSION_MODEL_EXTRACTION_MAX_TOPICS_PER_CATEGORY = 40;
exports.GROUP_SESSION_MODEL_EXTRACTION_MAX_FACTS_PER_TOPIC_FILE = 15;
exports.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_ASSIGNMENT_MIN_CONFIDENCE = 0.5;
exports.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_REUSE_MIN_SIMILARITY = 0.62;
exports.GROUP_SESSION_MODEL_EXTRACTION_TOPIC_MERGE_MIN_SIMILARITY = 0.82;
exports.GROUP_POSITIVE_FEEDBACK_LIFECYCLE_VERSION = 1;
exports.GROUP_PROVIDER_REPROOF_RECEIPT_CONSUMPTION_DISTILLATION_VERSION = 1;
exports.GROUP_PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION = 1;
exports.GROUP_POST_COMPACT_REINJECTION_REPAIR_RECEIPT_CONSUMPTION_DISTILLATION_VERSION = 1;
exports.GROUP_POST_COMPACT_RECEIPT_MEMORY_USAGE_REPAIR_COMPLETION_DISTILLATION_VERSION = 1;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_REPAIR_CLOSURE_DISTILLATION_VERSION = 1;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_DISTILLATION_VERSION = 1;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_HOT_ROW_LIMIT = 160;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_VERSION = 1;
exports.GROUP_POST_COMPACT_COMPLETION_MEMORY_PRESERVATION_CLOSURE_CONFLICT_RESOLUTION_COLD_ARCHIVE_DIR = ".archive/post-compact-completion-memory-preservation-closure-conflict-resolutions";
exports.GROUP_PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_REPAIR_DISTILLATION_VERSION = 1;
exports.GROUP_IGNORE_MEMORY_RECEIPT_REPAIR_DISTILLATION_VERSION = 1;
exports.GROUP_PRESSURE_MEMORY_PROVENANCE_RECEIPT_REPAIR_DISTILLATION_VERSION = 1;
exports.GROUP_PRESSURE_PROVENANCE_PRE_DISPATCH_COMPLIANCE_DISTILLATION_VERSION = 1;
exports.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION = 1;
exports.GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_RECEIPT_VALIDATION_DISTILLATION_VERSION = 1;
exports.GROUP_PROVIDER_SWITCH_EXECUTION_DISTILLATION_VERSION = 1;
exports.GROUP_PROVIDER_DISPATCH_RELIABILITY_HALF_LIFE_DAYS = 14;
exports.GROUP_PROVIDER_DISPATCH_RELIABILITY_MAX_SOURCE_GROUPS = 32;
exports.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_VERSION = 1;
exports.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_SNAPSHOT_TTL_MS = 15 * 60 * 1000;
exports.GROUP_CONTEXT_USAGE_REPAIR_DISTILLATION_VERSION = 1;
exports.GROUP_COMPACT_STRATEGY_TYPED_MEMORY_DISTILLATION_VERSION = 1;
exports.GROUP_PTL_EMERGENCY_TYPED_MEMORY_DISTILLATION_VERSION = 1;
exports.GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_LEDGER = ".claude-external-include-approvals.json";
exports.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_LEDGER = ".instructions-loaded-hooks.json";
exports.GROUP_TYPED_MEMORY_DIR = path.join(utils_1.CCM_DIR, "group-memory-md");
exports.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_DIR = path.join(utils_1.CCM_DIR, "global-provider-reliability");
exports.GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR = path.join(utils_1.CCM_DIR, "group-memory-replay-repair-work-items");
exports.VALID_TYPES = new Set(["user", "feedback", "project", "reference"]);
exports.CLAUDE_EDITABLE_SETTING_SOURCES = ["userSettings", "projectSettings", "localSettings"];
exports.CLAUDE_ALWAYS_ON_SETTING_SOURCES = ["policySettings", "flagSettings"];
exports.CLAUDE_MEMORY_INCLUDE_TEXT_EXTENSIONS = new Set([
    ".md", ".txt", ".text", ".json", ".yaml", ".yml", ".toml", ".xml", ".csv",
    ".html", ".htm", ".css", ".scss", ".sass", ".less",
    ".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs",
    ".py", ".rb", ".go", ".rs", ".java", ".kt", ".kts", ".cs", ".php",
    ".sh", ".bash", ".zsh", ".fish", ".ps1", ".bat", ".cmd",
    ".sql", ".graphql", ".gql", ".proto", ".ini", ".cfg", ".conf",
]);
exports.groupMemoryInstructionsLoadedHooks = new Set();
exports.activeGroupTypedMemoryDistillationMutations = new Map();
exports.DELIVERY_CLEANUP_EXECUTOR_INSTANCE_ID = `${os.hostname()}:${process.pid}:${crypto.randomBytes(6).toString("hex")}`;
exports.DELIVERY_CLEANUP_EXECUTION_LEASE_TTL_MS = 30_000;
exports.DELIVERY_CLEANUP_EXECUTION_LEASE_MAX_TTL_MS = 5 * 60_000;
function now() {
    return new Date().toISOString();
}
function safeSegment(value, fallback = "unknown") {
    const text = String(value || "").trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
    return text || fallback;
}
function normalizeMemoryType(value) {
    const type = String(value || "").trim().toLowerCase();
    return exports.VALID_TYPES.has(type) ? type : "project";
}
function normalizeClaudeSettingSourceName(value) {
    const text = String(value || "").trim();
    if (!text)
        return "";
    if (["user", "userSettings"].includes(text))
        return "userSettings";
    if (["project", "projectSettings"].includes(text))
        return "projectSettings";
    if (["local", "localSettings"].includes(text))
        return "localSettings";
    if (["policy", "managed", "managedSettings", "policySettings"].includes(text))
        return "policySettings";
    if (["flag", "cli", "flagSettings"].includes(text))
        return "flagSettings";
    return "";
}
function parseClaudeSettingSources(value) {
    if (value === undefined || value === null)
        return null;
    const raw = Array.isArray(value)
        ? value
        : String(value).trim() === ""
            ? []
            : String(value).split(",").map(item => item.trim());
    const enabled = [];
    const invalid = [];
    for (const item of raw) {
        const normalized = normalizeClaudeSettingSourceName(item);
        if (normalized)
            enabled.push(normalized);
        else if (String(item || "").trim())
            invalid.push(String(item));
    }
    return { enabled: [...new Set(enabled)], invalid };
}
function compactText(value, max = 1000) {
    const text = String(value || "").replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
    if (text.length <= max)
        return text;
    const head = Math.max(1, Math.floor(max * 0.65));
    const tail = Math.max(1, max - head - 32);
    return `${text.slice(0, head)}\n...[typed-memory truncated]...\n${text.slice(-tail)}`;
}
function uniqueStrings(values = [], limit = 20) {
    const result = [];
    const seen = new Set();
    for (const raw of values) {
        const value = compactText(raw, 500);
        const key = value.toLowerCase();
        if (!value || seen.has(key))
            continue;
        seen.add(key);
        result.push(value);
        if (result.length >= limit)
            break;
    }
    return result;
}
function checksum(value, length = 16) {
    const input = Buffer.isBuffer(value) ? value : typeof value === "string" ? value : JSON.stringify(value);
    return crypto.createHash("sha256").update(input).digest("hex").slice(0, length);
}
function ensureGroupTypedMemoryDir(groupId) {
    const dir = getGroupTypedMemoryDir(groupId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}
function writeTextAtomicRaw(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
        if (fs.existsSync(file) && fs.readFileSync(file, "utf-8") === content)
            return false;
    }
    catch { }
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, content, { encoding: "utf-8", flush: true });
    fs.renameSync(temp, file);
    return true;
}
function writeTextAtomic(file, content) {
    const mutation = activeGroupTypedMemoryArtifactMutationForFile(file);
    if (!mutation)
        return writeTextAtomicRaw(file, content);
    return stageGroupTypedMemoryArtifact(mutation, file, content);
}
function readJson(file, fallback) {
    const mutation = activeGroupTypedMemoryArtifactMutationForFile(file);
    const pending = mutation?.pendingArtifacts?.get(normalizeArtifactFile(file));
    if (pending) {
        if (pending.delete === true)
            return fallback;
        try {
            return JSON.parse(String(pending.content || ""));
        }
        catch {
            return fallback;
        }
    }
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return fallback;
    }
}
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (path.basename(file) === exports.GROUP_TYPED_MEMORY_DISTILLATION_LEDGER) {
        const groupId = String(value?.groupId || "");
        const mutation = exports.activeGroupTypedMemoryDistillationMutations.get(groupId);
        if (!groupId || !mutation?.handle)
            throw new Error("uncoordinated_group_typed_memory_distillation_ledger_write");
        const renewed = (0, typed_memory_distillation_receipts_1.renewGroupTypedMemoryDistillationLock)(mutation.handle);
        if (!renewed.renewed)
            throw new Error(`typed_memory_distillation_lock_lost_before_ledger_write:${renewed.reason}`);
        const current = readJson(file, {});
        const currentFence = Number(current?.distillationMutation?.fencingToken || current?.distillationTransaction?.fencingToken || 0);
        const mutationFence = Number(mutation.handle.lock?.fencingToken || 0);
        if (currentFence > mutationFence)
            throw new Error(`typed_memory_distillation_fence_superseded:${currentFence}>${mutationFence}`);
        mutation.writeCount = Number(mutation.writeCount || 0) + 1;
        mutation.lastWriteAt = now();
        value = {
            ...value,
            distillationMutation: {
                schema: "ccm-group-typed-memory-distillation-mutation-commit-v1",
                version: exports.GROUP_TYPED_MEMORY_DISTILLATION_TRANSACTION_VERSION,
                groupId,
                mutationKind: String(mutation.mutationKind || "unknown"),
                mutationKinds: uniqueStrings((mutation.mutationKinds || [mutation.mutationKind]).map(String), 32),
                leaseId: String(mutation.handle.lock?.leaseId || ""),
                fencingToken: mutationFence,
                ownerPid: Number(mutation.handle.lock?.ownerPid || 0),
                ownerHostname: String(mutation.handle.lock?.ownerHostname || ""),
                acquiredAt: String(mutation.handle.lock?.acquiredAt || ""),
                renewedAt: String(mutation.handle.lock?.renewedAt || ""),
                waitedMs: Number(mutation.handle.waitedMs || 0),
                recoveredLeaseCount: Number(mutation.handle.recoveredLeaseCount || 0),
                writeSequence: Number(mutation.writeCount || 0),
                committedAt: mutation.lastWriteAt,
            },
        };
    }
    const artifactMutation = activeGroupTypedMemoryArtifactMutationForFile(file);
    if (artifactMutation) {
        stageGroupTypedMemoryArtifact(artifactMutation, file, JSON.stringify(value, null, 2));
        return;
    }
    (0, atomic_json_file_1.writeJsonAtomic)(file, value);
}
function yamlEscape(value) {
    return JSON.stringify(value == null ? "" : value);
}
function renderFrontmatter(meta) {
    const ordered = [
        "name", "description", "type", "source", "paths", "group_id", "updated_at", "checksum",
    ];
    const lines = ["---"];
    for (const key of ordered) {
        if (meta[key] === undefined || meta[key] === null)
            continue;
        lines.push(`${key}: ${yamlEscape(meta[key])}`);
    }
    lines.push("---");
    return lines.join("\n");
}
function parseFrontmatter(content) {
    const text = String(content || "");
    if (!text.startsWith("---"))
        return { meta: {}, body: text.trim() };
    const end = text.indexOf("\n---", 3);
    if (end < 0)
        return { meta: {}, body: text.trim() };
    const raw = text.slice(3, end).trim();
    const meta = {};
    for (const line of raw.split(/\n+/)) {
        const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
        if (!match)
            continue;
        const value = match[2].trim();
        try {
            meta[match[1]] = JSON.parse(value);
        }
        catch {
            meta[match[1]] = value.replace(/^"|"$/g, "");
        }
    }
    return { meta, body: text.slice(end + 4).trim() };
}
function normalizePathGlobs(value) {
    const raw = Array.isArray(value)
        ? value
        : String(value || "").split(/[,;\n]+/);
    return raw
        .map(item => String(item || "").trim().replace(/\\/g, "/"))
        .map(item => item.endsWith("/**") ? item.slice(0, -3) : item)
        .filter(item => item && item !== "**")
        .slice(0, 40);
}
function normalizeTargetPath(value) {
    return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\/+/, "");
}
function globToRegExp(pattern) {
    const normalized = normalizeTargetPath(pattern);
    let out = "^";
    for (let index = 0; index < normalized.length; index += 1) {
        const char = normalized[index];
        const next = normalized[index + 1];
        const afterNext = normalized[index + 2];
        if (char === "*" && next === "*" && afterNext === "/") {
            out += "(?:.*/)?";
            index += 2;
        }
        else if (char === "*" && next === "*") {
            out += ".*";
            index += 1;
        }
        else if (char === "*") {
            out += "[^/]*";
        }
        else if ("\\^$+?.()|{}[]".includes(char)) {
            out += `\\${char}`;
        }
        else {
            out += char;
        }
    }
    out += "$";
    return new RegExp(out, "i");
}
function pathMatchesTypedMemoryGlobs(targetPath, globs = []) {
    const target = normalizeTargetPath(targetPath);
    if (!target)
        return false;
    for (const rawPattern of normalizePathGlobs(globs)) {
        const pattern = normalizeTargetPath(rawPattern);
        if (!pattern)
            continue;
        if (pattern.endsWith("/")) {
            if (target.startsWith(pattern))
                return true;
            continue;
        }
        if (!pattern.includes("*") && (target === pattern || target.startsWith(`${pattern}/`) || target.endsWith(`/${pattern}`)))
            return true;
        if (globToRegExp(pattern).test(target))
            return true;
    }
    return false;
}
function evaluateTypedMemoryPathCondition(doc, targetPaths = []) {
    const globs = normalizePathGlobs(doc?.paths || doc?.pathGlobs || doc?.globs || []);
    if (!globs.length)
        return { conditional: false, matched: true, matchedPaths: [], globs };
    const paths = (0, typed_memory_index_build_1.deriveGroupTypedMemoryTargetPaths)("", targetPaths);
    const matchedPaths = paths.filter(targetPath => pathMatchesTypedMemoryGlobs(targetPath, globs));
    return {
        conditional: true,
        matched: matchedPaths.length > 0,
        matchedPaths,
        globs,
    };
}
function listMemoryMarkdownFiles(groupId) {
    const dir = getGroupTypedMemoryDir(groupId);
    const files = new Map();
    try {
        for (const name of fs.readdirSync(dir)) {
            if (!name.toLowerCase().endsWith(".md") || name === exports.GROUP_TYPED_MEMORY_ENTRYPOINT)
                continue;
            const file = path.join(dir, name);
            files.set(normalizeArtifactFile(file), file);
        }
    }
    catch { }
    const mutation = exports.activeGroupTypedMemoryDistillationMutations.get(groupId);
    for (const entry of mutation?.pendingArtifacts?.values?.() || []) {
        const name = path.basename(String(entry.file || ""));
        if (!name.toLowerCase().endsWith(".md") || name === exports.GROUP_TYPED_MEMORY_ENTRYPOINT)
            continue;
        const key = normalizeArtifactFile(entry.file);
        if (entry.delete === true)
            files.delete(key);
        else
            files.set(key, entry.file);
    }
    return [...files.values()];
}
function tokens(value) {
    const text = String(value || "").toLowerCase();
    const result = new Set();
    for (const match of text.matchAll(/[a-z0-9_./\\:-]{3,}/g))
        result.add(match[0]);
    const chinese = text.replace(/[^\u3400-\u9fff]/g, "");
    for (let index = 0; index < chinese.length - 1; index += 1)
        result.add(chinese.slice(index, index + 2));
    return [...result].slice(0, 200);
}
exports.SEMANTIC_RECALL_CONCEPTS = [
    ["verify", /验证|核验|校验|检查|确认|复核|审查|test|verify|validate|check|review/],
    ["code_change", /修改|改动|编辑|变更|实现|代码|patch|edit|modify|change|implementation|code/],
    ["retry", /重试|再次尝试|重新尝试|再试|retry|reattempt|try again/],
    ["failure", /失败|报错|错误|异常|故障|超时|不可用|fail|error|exception|fault|timeout|unavailable/],
    ["interface", /接口|端点|请求|响应|api|endpoint|request|response/],
    ["human_approval", /人工|人为确认|让人确认|人来确认|用户确认|等待确认|审批|批准|授权|human|user confirmation|approval|authorize/],
    ["memory", /记忆|长期记忆|memory\.md|memory|recall|remember/],
    ["context", /上下文|会话窗口|context|session window/],
    ["session", /群聊会话|子会话|会话|session|conversation/],
    ["compact", /压缩|微压缩|蒸馏|compact|microcompact|distill|summarize/],
    ["restore", /恢复|重放|重注入|回放|restore|recover|replay|reinjection|reinject/],
    ["file", /文件|目录|路径|file|directory|path/],
    ["test", /测试|用例|断言|test|spec|assert/],
    ["deploy", /部署|发布|上线|重启|deploy|release|publish|restart/],
    ["security", /安全|权限|密钥|令牌|鉴权|签名|security|permission|secret|token|auth|signature/],
    ["persistence", /持久化|落盘|存储|数据库|缓存|persist|storage|database|cache/],
    ["routing", /路由|派发|分配|协调|route|dispatch|assign|orchestrat/],
    ["child_agent", /子\s*agent|项目\s*agent|worker|child agent|project agent/],
    ["global_agent", /全局\s*agent|global agent/],
    ["user_instruction", /用户要求|用户指令|用户更正|user request|user instruction|user correction/],
];
function extractSnippet(body, queryTokens, max = 700) {
    const lines = String(body || "").split(/\n+/).filter(Boolean);
    const scored = lines.map((line, index) => ({
        line,
        index,
        score: queryTokens.reduce((sum, token) => sum + (line.toLowerCase().includes(token) ? 1 : 0), 0),
    })).sort((a, b) => b.score - a.score || a.index - b.index);
    const picked = (scored[0]?.score ? scored.slice(0, 4).sort((a, b) => a.index - b.index).map(item => item.line) : lines.slice(0, 4)).join("\n");
    return compactText(picked, max);
}
function normalizePostCompactCandidateUsageHints(input = {}) {
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
    return rows.map((row) => {
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
    }).filter((row) => row.candidate_id || row.value);
}
function firstFiniteNumber(...values) {
    for (const value of values) {
        if (value === undefined || value === null || value === "")
            continue;
        const number = Number(value);
        if (Number.isFinite(number))
            return number;
    }
    return 0;
}
exports.POST_COMPACT_CLOSURE_TASK_FAMILY_STOP_WORDS = new Set([
    "agent", "child", "closure", "compact", "completion", "corrected", "current", "feedback", "memory",
    "outcome", "post", "preservation", "receipt", "repair", "review", "session", "source", "task", "typed",
    "verify", "verified", "worker", "context", "continue", "resume", "exact", "reverify", "usage",
]);
exports.POST_COMPACT_CLOSURE_TASK_FAMILY_CHINESE_STOP_BIGRAMS = new Set([
    "记忆", "压缩", "修复", "回执", "会话", "上下", "下文", "任务", "继续", "当前", "源码", "验证", "群聊", "智能", "召回",
]);
function truncateGroupTypedMemoryEntrypointContent(raw) {
    const trimmed = String(raw || "").trim();
    const sourceLines = trimmed ? trimmed.split("\n") : [];
    const lineCount = sourceLines.length;
    const byteCount = Buffer.byteLength(trimmed, "utf-8");
    const wasLineTruncated = lineCount > exports.GROUP_TYPED_MEMORY_MAX_INDEX_LINES;
    const wasByteTruncated = byteCount > exports.GROUP_TYPED_MEMORY_MAX_INDEX_BYTES;
    let loadedLines = wasLineTruncated
        ? sourceLines.slice(0, exports.GROUP_TYPED_MEMORY_MAX_INDEX_LINES)
        : sourceLines.slice();
    while (Buffer.byteLength(loadedLines.join("\n"), "utf-8") > exports.GROUP_TYPED_MEMORY_MAX_INDEX_BYTES && loadedLines.length > 1) {
        loadedLines.pop();
    }
    let content = loadedLines.join("\n");
    if (wasLineTruncated || wasByteTruncated) {
        const reason = wasLineTruncated && wasByteTruncated
            ? `${lineCount} lines and ${byteCount} bytes`
            : wasLineTruncated
                ? `${lineCount} lines (limit: ${exports.GROUP_TYPED_MEMORY_MAX_INDEX_LINES})`
                : `${byteCount} bytes (limit: ${exports.GROUP_TYPED_MEMORY_MAX_INDEX_BYTES}); index entries are too long`;
        content += `${content ? "\n\n" : ""}> WARNING: ${exports.GROUP_TYPED_MEMORY_ENTRYPOINT} is ${reason}. Only part of it was loaded. Keep index entries to one line under ~200 chars; move detail into topic files.`;
    }
    return {
        schema: "ccm-group-typed-memory-entrypoint-truncation-v1",
        version: 1,
        content,
        lineCount,
        byteCount,
        loadedLineCount: loadedLines.length,
        loadedByteCount: Buffer.byteLength(loadedLines.join("\n"), "utf-8"),
        wasLineTruncated,
        wasByteTruncated,
        truncated: wasLineTruncated || wasByteTruncated,
        maxLines: exports.GROUP_TYPED_MEMORY_MAX_INDEX_LINES,
        maxBytes: exports.GROUP_TYPED_MEMORY_MAX_INDEX_BYTES,
    };
}
function markdownLinkTitle(value) {
    return String(value || "").replace(/[\[\]\n\r]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "Untitled memory";
}
function renderMemoryDocument(input) {
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
function getGroupTypedMemoryDir(groupId) {
    return path.join(exports.GROUP_TYPED_MEMORY_DIR, safeSegment(groupId));
}
function normalizeArtifactFile(file) {
    return path.resolve(String(file || "")).replace(/\\/g, "/").toLowerCase();
}
function isCoordinatedGroupTypedMemoryArtifactFile(groupId, file) {
    const target = path.resolve(String(file || ""));
    const dir = path.resolve(getGroupTypedMemoryDir(groupId));
    if (path.dirname(target).toLowerCase() !== dir.toLowerCase())
        return false;
    const name = path.basename(target);
    return name === exports.GROUP_TYPED_MEMORY_DISTILLATION_LEDGER || name.toLowerCase().endsWith(".md");
}
function activeGroupTypedMemoryArtifactMutationForFile(file) {
    for (const mutation of exports.activeGroupTypedMemoryDistillationMutations.values()) {
        if (!mutation?.handle || !(mutation.pendingArtifacts instanceof Map))
            continue;
        if (isCoordinatedGroupTypedMemoryArtifactFile(String(mutation.groupId || ""), file))
            return mutation;
    }
    return null;
}
function stageGroupTypedMemoryArtifact(mutation, file, content) {
    const target = path.resolve(file);
    if (!isCoordinatedGroupTypedMemoryArtifactFile(String(mutation.groupId || ""), target)) {
        throw new Error("typed_memory_artifact_target_outside_mutation_scope");
    }
    const key = normalizeArtifactFile(target);
    const pending = mutation.pendingArtifacts.get(key);
    let effective = null;
    if (pending)
        effective = pending.delete === true ? null : String(pending.content || "");
    else {
        try {
            effective = fs.readFileSync(target, "utf-8");
        }
        catch {
            effective = null;
        }
    }
    if (effective === content)
        return false;
    let base = null;
    try {
        base = fs.readFileSync(target, "utf-8");
    }
    catch {
        base = null;
    }
    if (base === content)
        mutation.pendingArtifacts.delete(key);
    else
        mutation.pendingArtifacts.set(key, { file: target, content, delete: false, stagedAt: now() });
    return true;
}
function stageGroupTypedMemoryArtifactRemoval(mutation, file) {
    const target = path.resolve(file);
    if (!isCoordinatedGroupTypedMemoryArtifactFile(String(mutation.groupId || ""), target)) {
        throw new Error("typed_memory_artifact_target_outside_mutation_scope");
    }
    const key = normalizeArtifactFile(target);
    const pending = mutation.pendingArtifacts.get(key);
    const effectiveExists = pending ? pending.delete !== true : fs.existsSync(target);
    if (!effectiveExists)
        return false;
    if (!fs.existsSync(target))
        mutation.pendingArtifacts.delete(key);
    else
        mutation.pendingArtifacts.set(key, { file: target, content: "", delete: true, stagedAt: now() });
    return true;
}
function readGroupTypedMemoryArtifactText(file) {
    const mutation = activeGroupTypedMemoryArtifactMutationForFile(file);
    const pending = mutation?.pendingArtifacts?.get(normalizeArtifactFile(file));
    if (pending)
        return pending.delete === true ? null : String(pending.content || "");
    try {
        return fs.readFileSync(file, "utf-8");
    }
    catch {
        return null;
    }
}
function groupTypedMemoryArtifactJournalChecksum(journal = {}) {
    return checksum({
        schema: journal.schema || "",
        version: Number(journal.version || 0),
        groupId: journal.groupId || "",
        status: journal.status || "",
        leaseId: journal.leaseId || "",
        fencingToken: Number(journal.fencingToken || 0),
        mutationKind: journal.mutationKind || "",
        mutationKinds: Array.isArray(journal.mutationKinds) ? journal.mutationKinds.map(String) : [],
        artifactCount: Number(journal.artifactCount || 0),
        artifacts: (Array.isArray(journal.artifacts) ? journal.artifacts : []).map((artifact) => ({
            target: artifact.target || "",
            beforeExists: artifact.beforeExists === true,
            beforeChecksum: artifact.beforeChecksum || "",
            beforeBytes: Number(artifact.beforeBytes || 0),
            beforeStage: artifact.beforeStage || "",
            afterDelete: artifact.afterDelete === true,
            afterChecksum: artifact.afterChecksum || "",
            afterBytes: Number(artifact.afterBytes || 0),
            afterStage: artifact.afterStage || "",
            commitOrder: Number(artifact.commitOrder || 0),
        })),
        preparedAt: journal.preparedAt || "",
        committedAt: journal.committedAt || "",
        recoveredAt: journal.recoveredAt || "",
        recoveryAction: journal.recoveryAction || "",
        stageCleanedAt: journal.stageCleanedAt || "",
        updatedAt: journal.updatedAt || "",
    }, 64);
}
function writeGroupTypedMemoryArtifactJournalRaw(groupId, value) {
    const journal = {
        schema: "ccm-group-typed-memory-artifact-transaction-v1",
        version: 1,
        groupId,
        ...value,
    };
    delete journal.journalChecksum;
    journal.journalChecksum = groupTypedMemoryArtifactJournalChecksum(journal);
    writeTextAtomicRaw((0, typed_memory_index_build_1.getGroupTypedMemoryArtifactTransactionJournalFile)(groupId), JSON.stringify(journal, null, 2));
    return journal;
}
function groupTypedMemoryArtifactStageDir(groupId, leaseId) {
    const root = path.resolve((0, typed_memory_index_build_1.getGroupTypedMemoryArtifactTransactionStageRoot)(groupId));
    const dir = path.resolve(root, safeSegment(leaseId, "invalid-lease"));
    if (path.dirname(dir).toLowerCase() !== root.toLowerCase())
        throw new Error("typed_memory_artifact_stage_path_invalid");
    return dir;
}
function groupTypedMemoryArtifactTarget(groupId, target) {
    const name = path.basename(String(target || ""));
    if (!name || name !== target || (name !== exports.GROUP_TYPED_MEMORY_DISTILLATION_LEDGER && !name.toLowerCase().endsWith(".md"))) {
        throw new Error("typed_memory_artifact_journal_target_invalid");
    }
    return path.join(getGroupTypedMemoryDir(groupId), name);
}
function readVerifiedArtifactStageFile(stageDir, name, expectedChecksum) {
    if (!name || path.basename(name) !== name)
        throw new Error("typed_memory_artifact_stage_file_invalid");
    const file = path.resolve(stageDir, name);
    if (path.dirname(file).toLowerCase() !== path.resolve(stageDir).toLowerCase())
        throw new Error("typed_memory_artifact_stage_file_outside_transaction");
    const content = fs.readFileSync(file);
    if (checksum(content, 64) !== expectedChecksum)
        throw new Error("typed_memory_artifact_stage_checksum_mismatch");
    return content;
}
function applyGroupTypedMemoryArtifactVersion(groupId, journal, artifact, version) {
    const target = groupTypedMemoryArtifactTarget(groupId, String(artifact.target || ""));
    const stageDir = groupTypedMemoryArtifactStageDir(groupId, String(journal.leaseId || ""));
    const remove = version === "after" ? artifact.afterDelete === true : artifact.beforeExists !== true;
    if (remove) {
        try {
            fs.unlinkSync(target);
        }
        catch (error) {
            if (error?.code !== "ENOENT")
                throw error;
        }
        return;
    }
    const stageName = String(version === "after" ? artifact.afterStage || "" : artifact.beforeStage || "");
    const expected = String(version === "after" ? artifact.afterChecksum || "" : artifact.beforeChecksum || "");
    const content = readVerifiedArtifactStageFile(stageDir, stageName, expected);
    writeTextAtomicRaw(target, content.toString("utf-8"));
}
function verifyGroupTypedMemoryArtifactVersion(groupId, artifact, version) {
    const target = groupTypedMemoryArtifactTarget(groupId, String(artifact.target || ""));
    const remove = version === "after" ? artifact.afterDelete === true : artifact.beforeExists !== true;
    if (remove)
        return !fs.existsSync(target);
    try {
        const expected = String(version === "after" ? artifact.afterChecksum || "" : artifact.beforeChecksum || "");
        return checksum(fs.readFileSync(target), 64) === expected;
    }
    catch {
        return false;
    }
}
function commitGroupTypedMemoryArtifactMutation(context) {
    const journal = (0, typed_memory_index_build_1.prepareGroupTypedMemoryArtifactTransaction)(context);
    if (!journal)
        return { committed: false, artifactCount: 0, reason: "no_staged_artifacts" };
    const groupId = String(context.groupId || "");
    const artifacts = [...journal.artifacts].sort((a, b) => Number(a.commitOrder || 0) - Number(b.commitOrder || 0));
    try {
        let appliedCount = 0;
        for (const artifact of artifacts) {
            applyGroupTypedMemoryArtifactVersion(groupId, journal, artifact, "after");
            appliedCount += 1;
            const holdAfter = Number(context.options?.__artifactDiagnosticHoldAfterApplyCount || 0);
            if (holdAfter === appliedCount) {
                (0, typed_memory_distillation_receipts_1.typedMemoryDistillationWait)(Math.max(0, Math.min(30_000, Number(context.options?.__artifactDiagnosticHoldMs || 0))));
            }
            const failAfter = Number(context.options?.__artifactDiagnosticFailAfterApplyCount || 0);
            if (failAfter === appliedCount)
                throw new Error(`diagnostic_artifact_commit_failure_after_${appliedCount}`);
        }
        if (!artifacts.every((artifact) => verifyGroupTypedMemoryArtifactVersion(groupId, artifact, "after"))) {
            throw new Error("typed_memory_artifact_commit_verification_failed");
        }
        const committedAt = now();
        const committed = writeGroupTypedMemoryArtifactJournalRaw(groupId, {
            ...journal,
            status: "committed",
            committedAt,
            stageCleanedAt: committedAt,
            updatedAt: committedAt,
        });
        (0, typed_memory_ledgers_1.cleanupGroupTypedMemoryArtifactStage)(groupId, String(journal.leaseId || ""));
        context.artifactTransaction = {
            schema: "ccm-group-typed-memory-artifact-transaction-receipt-v1",
            groupId,
            leaseId: journal.leaseId,
            fencingToken: journal.fencingToken,
            status: committed.status,
            artifactCount: artifacts.length,
            targets: artifacts.map((artifact) => artifact.target),
            preparedAt: journal.preparedAt,
            committedAt,
        };
        context.pendingArtifacts.clear();
        return { committed: true, ...context.artifactTransaction };
    }
    catch (error) {
        try {
            context.artifactRecovery = (0, typed_memory_index_build_1.recoverGroupTypedMemoryArtifactTransaction)(groupId);
        }
        catch { }
        throw error;
    }
}
function ensureGroupTypedMemoryArtifactReadConsistency(groupId, options = {}) {
    if (exports.activeGroupTypedMemoryDistillationMutations.get(groupId)?.handle) {
        return { consistent: true, skipped: true, reason: "active_local_mutation_uses_staged_overlay" };
    }
    const inspected = (0, typed_memory_index_build_1.inspectGroupTypedMemoryArtifactTransaction)(groupId);
    if (!inspected.present)
        return { consistent: true, skipped: true, reason: "artifact_journal_absent" };
    if (!inspected.valid)
        throw new Error("typed_memory_artifact_read_barrier_journal_corrupt");
    if (inspected.journal?.status !== "prepared")
        return { consistent: true, skipped: true, reason: "artifact_journal_terminal", status: inspected.journal?.status };
    const result = (0, typed_memory_distillation_receipts_1.runGroupTypedMemoryDistillationMutation)(groupId, "artifact_read_barrier_recovery", {
        transactionMaxWaitMs: Number(options.transactionMaxWaitMs ?? options.transaction_max_wait_ms ?? 10_000),
    }, () => ({ schema: "ccm-group-typed-memory-artifact-read-barrier-v1", groupId }));
    const recovery = result.distillationMutation?.artifactRecovery || {};
    return {
        consistent: recovery.recovered === true || ["artifact_journal_terminal", "artifact_journal_absent"].includes(String(recovery.reason || "")),
        skipped: false,
        recovery,
        fencingToken: Number(result.distillationMutation?.fencingToken || 0),
    };
}
function listMarkdownFilesRecursive(dir, options = {}) {
    const maxFiles = Math.max(1, Math.min(300, Number(options.maxFiles || options.max_files || 80)));
    const result = [];
    const visit = (current) => {
        if (result.length >= maxFiles)
            return;
        let entries = [];
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
            if (result.length >= maxFiles)
                break;
            const file = path.join(current, entry.name);
            if (entry.isDirectory())
                visit(file);
            else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
                result.push(file);
        }
    };
    visit(dir);
    return result;
}
//# sourceMappingURL=typed-memory-shared-part-01.js.map