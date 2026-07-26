"use strict";
// typed-memory-shared.ts — merged from 2 part files (behavior-freeze merge).
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
exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SYSTEM_PROMPT = exports.MODEL_EXTRACTION_TOPIC_CANONICAL_CONCEPTS = exports.MODEL_EXTRACTION_TOPIC_GENERIC_CONCEPTS = exports.GROUP_LOG_RESOURCE_PURPOSE_PATTERN = exports.GROUP_LOG_EXTERNAL_RESOURCE_PATTERN = exports.GROUP_LOG_POSITIVE_REVOCATION_PATTERN = exports.GROUP_LOG_POSITIVE_CONFIRMATION_PATTERN = exports.GROUP_LOG_USER_CORRECTION_PATTERN = exports.GROUP_LOG_RATIONALE_PATTERN = exports.GROUP_LOG_NON_OBVIOUS_PATTERN = exports.GROUP_LOG_DURABLE_PATTERN = exports.GROUP_LOG_EPHEMERAL_PATTERN = exports.GROUP_LOG_ACTIVITY_NOISE_PATTERN = exports.POST_COMPACT_CLOSURE_TASK_FAMILY_CHINESE_STOP_BIGRAMS = exports.POST_COMPACT_CLOSURE_TASK_FAMILY_STOP_WORDS = exports.SEMANTIC_RECALL_CONCEPTS = exports.DELIVERY_CLEANUP_EXECUTION_LEASE_MAX_TTL_MS = exports.DELIVERY_CLEANUP_EXECUTION_LEASE_TTL_MS = exports.DELIVERY_CLEANUP_EXECUTOR_INSTANCE_ID = exports.activeGroupTypedMemoryDistillationMutations = exports.groupMemoryInstructionsLoadedHooks = exports.CLAUDE_MEMORY_INCLUDE_TEXT_EXTENSIONS = exports.CLAUDE_ALWAYS_ON_SETTING_SOURCES = exports.CLAUDE_EDITABLE_SETTING_SOURCES = exports.VALID_TYPES = exports.GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR = exports.GLOBAL_PROVIDER_DISPATCH_RELIABILITY_DIR = void 0;
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
exports.groupTypedMemoryPriority = groupTypedMemoryPriority;
exports.normalizeFileKey = normalizeFileKey;
exports.isPathInside = isPathInside;
exports.stripIncludePath = stripIncludePath;
exports.extractTypedMemoryIncludeRefs = extractTypedMemoryIncludeRefs;
exports.resolveTypedMemoryIncludePath = resolveTypedMemoryIncludePath;
exports.listLines = listLines;
exports.messageContent = messageContent;
exports.messageIdentity = messageIdentity;
exports.messageActor = messageActor;
exports.extractMessageFiles = extractMessageFiles;
exports.extractMessageSkills = extractMessageSkills;
exports.extractMessageVerification = extractMessageVerification;
exports.normalizeGroupLogMemoryAdmission = normalizeGroupLogMemoryAdmission;
exports.normalizeGroupLogMemoryConfirmation = normalizeGroupLogMemoryConfirmation;
exports.normalizeGroupLogMemoryRevocation = normalizeGroupLogMemoryRevocation;
exports.verifyGroupLogLifecycleCurrentSourceEvidence = verifyGroupLogLifecycleCurrentSourceEvidence;
exports.buildGroupLogPositiveConfirmationCandidate = buildGroupLogPositiveConfirmationCandidate;
exports.buildPostCompactCandidateUsageArchive = buildPostCompactCandidateUsageArchive;
exports.conflictResolutionOpenRepairEntryIds = conflictResolutionOpenRepairEntryIds;
exports.conflictResolutionQuarantineChecksum = conflictResolutionQuarantineChecksum;
exports.pathWithinDirectory = pathWithinDirectory;
exports.typedMemorySessionScopeIdentity = typedMemorySessionScopeIdentity;
exports.extractPathClaims = extractPathClaims;
exports.resolveClaimPath = resolveClaimPath;
exports.extractTaskStateSignal = extractTaskStateSignal;
exports.shouldIgnoreGroupMemoryRequest = shouldIgnoreGroupMemoryRequest;
exports.typedMemoryDeliveryLeaseChecksum = typedMemoryDeliveryLeaseChecksum;
exports.getAlreadySurfacedGroupTypedMemory = getAlreadySurfacedGroupTypedMemory;
exports.typedMemoryStaleResolutionChecksum = typedMemoryStaleResolutionChecksum;
exports.typedMemoryStaleRejectionChecksum = typedMemoryStaleRejectionChecksum;
exports.isExactGroupTypedMemorySessionScope = isExactGroupTypedMemorySessionScope;
exports.groupTypedMemoryTextLineCount = groupTypedMemoryTextLineCount;
exports.normalizeGroupTypedMemoryOutcomeRelPaths = normalizeGroupTypedMemoryOutcomeRelPaths;
exports.buildGroupTypedMemoryPendingStaleConflictIndex = buildGroupTypedMemoryPendingStaleConflictIndex;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const typed_memory_distillation_receipts_1 = require("./typed-memory-distillation-receipts");
const typed_memory_index_build_1 = require("./typed-memory-index-build");
const typed_memory_ledgers_1 = require("./typed-memory-ledgers");
const typed_memory_recall_1 = require("./typed-memory-recall");
// ===== merged from typed-memory-shared-part-01.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
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
// ===== merged from typed-memory-shared-part-02.ts =====
// Behavior-freeze module extracted mechanically from the former facade.
function groupTypedMemoryPriority(type) {
    const value = normalizeMemoryType(type);
    if (value === "user")
        return 400;
    if (value === "feedback")
        return 300;
    if (value === "project")
        return 200;
    return 100;
}
function normalizeFileKey(file) {
    return path.resolve(file).replace(/\\/g, "/").toLowerCase();
}
function isPathInside(baseDir, file) {
    const base = normalizeFileKey(baseDir);
    const target = normalizeFileKey(file);
    return target === base || target.startsWith(`${base}/`);
}
function stripIncludePath(value) {
    return String(value || "")
        .replace(/\\ /g, " ")
        .replace(/[#?].*$/, "")
        .replace(/[),.;，。；、]+$/g, "")
        .trim();
}
function extractTypedMemoryIncludeRefs(content) {
    const refs = [];
    let inFence = false;
    for (const rawLine of String(content || "").split(/\n/)) {
        const line = rawLine.replace(/\r/g, "");
        if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
            inFence = !inFence;
            continue;
        }
        if (inFence || /^\s*<!--/.test(line))
            continue;
        const includeRegex = /(?:^|\s)@((?:[^\s\\]|\\ )+)/g;
        let match;
        while ((match = includeRegex.exec(line)) !== null) {
            const ref = stripIncludePath(match[1]);
            if (!ref || ref.startsWith("@") || /^[#%^&*()]+/.test(ref))
                continue;
            if (ref.startsWith("./") || ref.startsWith("../") || ref.startsWith("/") || /^[A-Za-z]:[\\/]/.test(ref) || /^[a-zA-Z0-9._-]/.test(ref)) {
                refs.push(ref);
            }
        }
    }
    return [...new Set(refs)].slice(0, 40);
}
function resolveTypedMemoryIncludePath(baseFile, ref) {
    const cleaned = stripIncludePath(ref);
    if (!cleaned)
        return "";
    if (path.isAbsolute(cleaned) || /^[A-Za-z]:[\\/]/.test(cleaned))
        return path.resolve(cleaned);
    return path.resolve(path.dirname(baseFile), cleaned);
}
function listLines(title, items, mapper, limit = 12) {
    const values = (items || []).map(mapper).map(item => compactText(item, 500)).filter(Boolean).slice(-limit);
    if (!values.length)
        return "";
    return [`## ${title}`, ...values.map(item => `- ${item}`)].join("\n");
}
function messageContent(message) {
    return String(message?.content || message?.delivery_summary?.headline || message?.result || "").trim();
}
function messageIdentity(message, index = 0) {
    return String(message?.id || message?.uuid || `${message?.timestamp || "unknown"}-${index}`);
}
function messageActor(message) {
    return message?.role === "user" ? `用户 -> ${message?.target || "all"}` : message?.agent || message?.role || "Agent";
}
function extractMessageFiles(message) {
    const content = messageContent(message);
    const explicit = [
        ...(Array.isArray(message?.filesChanged) ? message.filesChanged : []),
        ...(Array.isArray(message?.fileChanges?.files) ? message.fileChanges.files : []),
        ...(Array.isArray(message?.delivery_summary?.actual_file_changes)
            ? message.delivery_summary.actual_file_changes.map((item) => item?.path || item?.file || item)
            : []),
        ...(Array.isArray(message?.receipt?.filesChanged) ? message.receipt.filesChanged : []),
    ];
    const matched = content.match(/(?:[A-Za-z]:\\[^\s，。；]+|(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+|[\w.-]+\.(?:ts|tsx|js|jsx|vue|java|py|go|rs|md|json|toml|yaml|yml|xml|sql))/g) || [];
    return [...explicit, ...matched].map(item => typeof item === "string" ? item : item?.path || item?.file || JSON.stringify(item)).filter(Boolean);
}
function extractMessageSkills(message) {
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
function extractMessageVerification(message) {
    const content = messageContent(message);
    const explicit = [
        ...(Array.isArray(message?.verification) ? message.verification : []),
        ...(Array.isArray(message?.receipt?.verification) ? message.receipt.verification : []),
        ...(Array.isArray(message?.delivery_summary?.verification) ? message.delivery_summary.verification : []),
    ];
    const matched = content.match(/\b(?:npm|pnpm|yarn|bun)\s+run\s+[A-Za-z0-9:_-]+|(?:pytest|vitest|tsc|mvn test|go test|cargo test)[^\n，。；]*/gi) || [];
    return [...explicit, ...matched].map(item => typeof item === "string" ? item : JSON.stringify(item)).filter(Boolean);
}
exports.GROUP_LOG_ACTIVITY_NOISE_PATTERN = /(?:(?:\bPRs?\b|pull requests?)\s+(?:list|summary|report|activity)|(?:list|summary|report)\s+of\s+(?:\bPRs?\b|pull requests?)|git\s+(?:log|blame|history)|commit(?:s| history)?|recent changes?|activity (?:log|summary)|weekly (?:summary|report)|daily (?:summary|report)|本周(?:的)?(?:PR|提交|改动|工作)|本日(?:工作)?|PR\s*清单|PR\s*列表|日报|周报|活动摘要|提交记录|最近改动|谁改了什么)/i;
exports.GROUP_LOG_EPHEMERAL_PATTERN = /(?:当前任务|本轮|这次|今天|本周|临时|正在(?:处理|执行|修改|修复)|待完成|进行中|current task|this task|this turn|today|this week|temporary|in[ -]?progress)/i;
exports.GROUP_LOG_DURABLE_PATTERN = /(?:长期|始终|以后|未来|每次|所有(?:后续)?任务|默认|永久|跨会话|记住|保持(?:这个|该)?做法|always|never|from now on|future (?:task|conversation)|every time|all future|remember|keep doing)/i;
exports.GROUP_LOG_NON_OBVIOUS_PATTERN = /(?:意外|非显然|不明显|反直觉|容易忽略|事故|教训|曾经导致|根因|特例|surprising|non[- ]?obvious|counterintuitive|easy to miss|incident|lesson|root cause|exception)/i;
exports.GROUP_LOG_RATIONALE_PATTERN = /(?:原因|因为|由于|为了|以免|避免|否则|基于|动机|why\b|because\b|since\b|so that\b|to avoid\b|rationale\b|motivation\b)/i;
exports.GROUP_LOG_USER_CORRECTION_PATTERN = /(?:不要|不得|禁止|别再|停止|不是这样|改为|应该改|以后别|no[,，]? not|do not|don't|stop doing|instead)/i;
exports.GROUP_LOG_POSITIVE_CONFIRMATION_PATTERN = /(?:对[，,\s]*(?:就是|就(?:保持|继续|这样)|这个做法)|正是(?:这样|这个做法)|完全正确|这个做法(?:是)?对的|做得对|正确(?:的)?选择|保持这个做法|以后继续(?:这样|这个做法)|yes[,\s]+exactly|perfect[,\s]+keep doing|keep doing (?:that|this)|(?:was|is) the right call|right choice)/i;
exports.GROUP_LOG_POSITIVE_REVOCATION_PATTERN = /(?:撤回(?:刚才|之前|那个)?(?:的)?(?:确认|做法|选择)|刚才(?:的)?(?:确认|做法)(?:是)?(?:错了|不对)|不再(?:采用|使用|保持|继续)(?:这个|那个)?(?:做法|方案|规则)?|别再用(?:这个|那个)?(?:做法|方案|规则)?|取消(?:刚才|之前|那个)?(?:的)?确认|\b(?:revoke|withdraw)\b.*\b(?:confirmation|approach|rule)\b|\b(?:no longer use|stop using|do not use)\b.*\b(?:approach|rule|choice)\b|\b(?:that|this) approach (?:was|is) wrong\b|\bi take that back\b)/i;
exports.GROUP_LOG_EXTERNAL_RESOURCE_PATTERN = /(?:https?:\/\/\S+|\b(?:Linear|Jira|Slack|Grafana|Datadog|Sentry|Notion)\b|飞书(?:群|文档|多维表格)|外部(?:系统|看板|仪表盘|渠道|文档))/i;
exports.GROUP_LOG_RESOURCE_PURPOSE_PATTERN = /(?:用于|用来|负责|跟踪|查看|查询|排查|记录|入口|purpose|used for|tracks?|check it|dashboard|channel)/i;
function normalizeGroupLogMemoryAdmission(message = {}) {
    const raw = message?.memoryAdmission
        || message?.memory_admission
        || message?.receipt?.memoryAdmission
        || message?.receipt?.memory_admission
        || {};
    return {
        surprising: raw.surprising === true,
        nonObvious: raw.nonObvious === true || raw.non_obvious === true,
        futureApplicable: raw.futureApplicable === true || raw.future_applicable === true,
        why: compactText(raw.why || raw.reason || raw.rationale || "", 420),
        howToApply: compactText(raw.howToApply || raw.how_to_apply || raw.application || "", 420),
        requestedByUser: raw.requestedByUser === true || raw.requested_by_user === true,
    };
}
function normalizeGroupLogMemoryConfirmation(message = {}) {
    const raw = message?.memoryConfirmation
        || message?.memory_confirmation
        || message?.receipt?.memoryConfirmation
        || message?.receipt?.memory_confirmation
        || {};
    const rawTarget = raw.targetMessageId
        || raw.target_message_id
        || message?.replyToMessageId
        || message?.reply_to_message_id
        || message?.parentMessageId
        || message?.parent_message_id
        || message?.replyTo
        || message?.reply_to
        || "";
    const targetMessageId = typeof rawTarget === "object"
        ? compactText(rawTarget?.id || rawTarget?.messageId || rawTarget?.message_id || "", 160)
        : compactText(rawTarget, 160);
    return {
        validated: raw.validated === true || raw.confirmed === true || raw.accepted === true,
        targetMessageId,
        targetMessageChecksum: String(raw.targetMessageChecksum || raw.target_message_checksum || "").trim().toLowerCase(),
        groupSessionScopeId: compactText(raw.groupSessionScopeId || raw.group_session_scope_id || raw.scopeId || raw.scope_id || "", 180),
        rule: compactText(raw.rule || raw.approach || raw.memory || "", 900),
        why: compactText(raw.why || raw.reason || raw.rationale || "", 420),
        howToApply: compactText(raw.howToApply || raw.how_to_apply || raw.application || "", 420),
    };
}
function normalizeGroupLogMemoryRevocation(message = {}) {
    const raw = message?.memoryRevocation
        || message?.memory_revocation
        || message?.receipt?.memoryRevocation
        || message?.receipt?.memory_revocation
        || {};
    const evidence = raw.currentSourceEvidence || raw.current_source_evidence || null;
    return {
        revoked: raw.revoked === true || raw.withdrawn === true || raw.cancelled === true || raw.canceled === true,
        targetConfirmationMessageId: compactText(raw.targetConfirmationMessageId || raw.target_confirmation_message_id || raw.confirmationMessageId || raw.confirmation_message_id || "", 160),
        targetApproachMessageId: compactText(raw.targetApproachMessageId || raw.target_approach_message_id || raw.targetMessageId || raw.target_message_id || "", 160),
        targetApproachChecksum: String(raw.targetApproachChecksum || raw.target_approach_checksum || raw.targetMessageChecksum || raw.target_message_checksum || "").trim().toLowerCase(),
        groupSessionScopeId: compactText(raw.groupSessionScopeId || raw.group_session_scope_id || raw.scopeId || raw.scope_id || "", 180),
        reason: compactText(raw.reason || raw.why || raw.rationale || "", 500),
        replacementRule: compactText(raw.replacementRule || raw.replacement_rule || raw.replacement || raw.instead || "", 900),
        howToApply: compactText(raw.howToApply || raw.how_to_apply || raw.application || "", 420),
        currentSourceEvidence: evidence && typeof evidence === "object" ? evidence : null,
    };
}
function verifyGroupLogLifecycleCurrentSourceEvidence(evidence, projectRoot) {
    const sourcePath = String(evidence?.sourcePath || evidence?.source_path || evidence?.path || "").trim();
    const claimedChecksum = String(evidence?.sourceChecksum || evidence?.source_checksum || evidence?.sha256 || evidence?.checksum || "").trim().toLowerCase();
    const evidenceType = String(evidence?.evidenceType || evidence?.evidence_type || evidence?.type || "file_read").trim().toLowerCase();
    const base = {
        schema: "ccm-group-positive-feedback-current-source-proof-v1",
        valid: false,
        status: "missing_proof",
        evidenceType,
        relativePath: "",
        claimedChecksum,
        observedChecksum: "",
        proofId: "",
    };
    if (!evidence)
        return { ...base, status: "not_claimed" };
    if (!sourcePath || !claimedChecksum)
        return base;
    if (evidenceType !== "file_read")
        return { ...base, status: "unsupported_evidence_type" };
    if (!/^[a-f0-9]{64}$/.test(claimedChecksum))
        return { ...base, status: "invalid_claimed_checksum" };
    if (!projectRoot || !fs.existsSync(projectRoot))
        return { ...base, status: "project_root_unavailable" };
    try {
        const realRoot = fs.realpathSync(path.resolve(projectRoot));
        const requested = path.isAbsolute(sourcePath) ? path.resolve(sourcePath) : path.resolve(realRoot, sourcePath);
        if (!fs.existsSync(requested))
            return { ...base, status: "source_missing" };
        const realFile = fs.realpathSync(requested);
        const rootPrefix = `${realRoot}${path.sep}`.toLowerCase();
        if (realFile.toLowerCase() !== realRoot.toLowerCase() && !realFile.toLowerCase().startsWith(rootPrefix)) {
            return { ...base, status: "source_outside_project" };
        }
        const stat = fs.statSync(realFile);
        if (!stat.isFile())
            return { ...base, status: "source_not_file" };
        if (stat.size > 16 * 1024 * 1024)
            return { ...base, status: "source_too_large" };
        const observedChecksum = crypto.createHash("sha256").update(fs.readFileSync(realFile)).digest("hex");
        const relativePath = path.relative(realRoot, realFile).replace(/\\/g, "/") || path.basename(realFile);
        const valid = observedChecksum === claimedChecksum;
        return {
            ...base,
            valid,
            status: valid ? "system_file_checksum_match" : "source_checksum_mismatch",
            relativePath,
            observedChecksum,
            proofId: valid ? `pfp_${checksum([realRoot, relativePath, observedChecksum], 28)}` : "",
        };
    }
    catch {
        return { ...base, status: "source_read_failed" };
    }
}
function buildGroupLogPositiveConfirmationCandidate(groupId, messages, index) {
    const message = messages[index];
    const content = messageContent(message);
    const requested = normalizeGroupLogMemoryConfirmation(message);
    const explicit = requested.validated === true || exports.GROUP_LOG_POSITIVE_CONFIRMATION_PATTERN.test(content);
    if (message?.role !== "user" || !explicit)
        return null;
    let targetIndex = -1;
    let bindingMode = requested.targetMessageId ? "explicit_message_id" : "adjacent_assistant";
    if (requested.targetMessageId) {
        for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
            if (messageIdentity(messages[cursor], cursor) === requested.targetMessageId) {
                targetIndex = cursor;
                break;
            }
        }
    }
    else {
        for (let cursor = index - 1; cursor >= Math.max(0, index - 3); cursor -= 1) {
            if (messages[cursor]?.role === "assistant" && messageContent(messages[cursor])) {
                targetIndex = cursor;
                break;
            }
        }
    }
    const target = targetIndex >= 0 ? messages[targetIndex] : null;
    const targetMessageId = target ? messageIdentity(target, targetIndex) : requested.targetMessageId;
    const targetText = target ? messageContent(target) : "";
    const targetChecksum = targetText ? checksum(targetText, 64) : "";
    const targetAdmission = target ? normalizeGroupLogMemoryAdmission(target) : {};
    const userAdmission = normalizeGroupLogMemoryAdmission(message);
    const durable = requested.howToApply
        ? true
        : targetAdmission.futureApplicable === true || exports.GROUP_LOG_DURABLE_PATTERN.test(targetText);
    const nonObvious = targetAdmission.surprising === true
        || targetAdmission.nonObvious === true
        || exports.GROUP_LOG_NON_OBVIOUS_PATTERN.test(targetText);
    const why = requested.why
        || userAdmission.why
        || targetAdmission.why
        || (exports.GROUP_LOG_RATIONALE_PATTERN.test(targetText) ? compactText(targetText, 420) : "");
    const howToApply = requested.howToApply
        || userAdmission.howToApply
        || targetAdmission.howToApply
        || (durable && nonObvious ? compactText(targetText, 420) : "");
    const scopeMatches = !requested.groupSessionScopeId || requested.groupSessionScopeId === groupId;
    const checksumMatches = !requested.targetMessageChecksum || requested.targetMessageChecksum === targetChecksum;
    const targetEligible = !!target
        && target?.role === "assistant"
        && durable
        && nonObvious
        && !!why
        && !!howToApply;
    return {
        text: requested.rule || targetText || content,
        memoryAdmission: {
            surprising: targetAdmission.surprising === true || userAdmission.surprising === true,
            nonObvious,
            futureApplicable: durable,
            why,
            howToApply,
            requestedByUser: true,
        },
        confirmation: {
            schema: "ccm-group-positive-feedback-binding-v1",
            explicit: true,
            bindingMode,
            confirmationMessageId: messageIdentity(message, index),
            targetMessageId,
            targetFound: !!target,
            targetSourceRole: String(target?.role || ""),
            targetMessageChecksum: targetChecksum,
            claimedTargetMessageChecksum: requested.targetMessageChecksum,
            checksumMatches,
            claimedGroupSessionScopeId: requested.groupSessionScopeId,
            scopeMatches,
            targetEligible,
            targetDistance: targetIndex >= 0 ? index - targetIndex : null,
        },
    };
}
function buildPostCompactCandidateUsageArchive(input = {}, options = {}) {
    const usage = input.postCompactCandidateUsage
        || input.post_compact_candidate_usage
        || input.candidateUsage
        || input.candidate_usage
        || {};
    const hints = normalizePostCompactCandidateUsageHints({ postCompactCandidateUsage: usage });
    const archived = hints
        .filter((row) => row.recommendation === "deprioritize_or_distill" || row.recommendation === "require_usage_receipt")
        .sort((a, b) => {
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
exports.MODEL_EXTRACTION_TOPIC_GENERIC_CONCEPTS = new Set([
    "必须", "长期", "保留", "使用", "启用", "禁止", "不要", "不得", "始终", "只能", "不能", "用户", "规则", "要求", "更正", "改为",
    "必须长期使用", "必须长期保留", "必须长期记住", "请长期记住", "用户要求", "长期使用", "长期保留", "长期记住", "记住", "这个", "那个", "这样", "如此", "事情", "内容",
    "must", "always", "never", "required", "requirement", "user", "rule", "using", "use", "keep", "remember", "this", "that", "thing", "content",
]);
exports.MODEL_EXTRACTION_TOPIC_CANONICAL_CONCEPTS = [
    ["domain_database", /(?:\bdatabase\b|\bdb\b|数据库|資料庫)/i],
    ["domain_backup", /(?:\bbackups?\b|\brestore\b|备份|備份|恢复|還原)/i],
    ["domain_retention", /(?:\bretention\b|\barchive\b|保留期|留存|归档|歸檔)/i],
    ["domain_frontend", /(?:\bfront[ -]?end\b|\bui\b|前端|界面)/i],
    ["domain_accessibility", /(?:\baccessibility\b|\ba11y\b|无障碍|無障礙|可访问性|可訪問性)/i],
    ["domain_testing", /(?:\btests?\b|\btesting\b|测试|測試)/i],
    ["domain_deployment", /(?:\bdeploy(?:ment)?\b|\brelease\b|部署|发布|發佈)/i],
    ["domain_security", /(?:\bsecurity\b|\bsecure\b|安全|密钥|密鑰|凭据|憑據)/i],
    ["domain_auth", /(?:\bauth(?:entication|orization)?\b|\blogin\b|认证|認證|鉴权|鑒權|登录|登入)/i],
    ["domain_api", /(?:\bapi\b|接口|端点|端點)/i],
    ["domain_performance", /(?:\bperformance\b|\blatency\b|性能|延迟|延遲)/i],
    ["domain_logging", /(?:\blog(?:ging)?\b|\bobservability\b|日志|日誌|可观测性|可觀測性)/i],
    ["domain_memory", /(?:\bmemory\b|记忆|記憶)/i],
    ["domain_context", /(?:\bcontext\b|上下文)/i],
    ["domain_compression", /(?:\bcompact(?:ion)?\b|\bcompress(?:ion)?\b|压缩|壓縮)/i],
    ["domain_session", /(?:\bsessions?\b|会话|會話)/i],
    ["domain_agent", /(?:\bagents?\b|智能体|智能體|代理)/i],
    ["domain_documentation", /(?:\bdocs?\b|\bdocumentation\b|文档|文檔)/i],
    ["domain_git", /(?:\bgit\b|\bcommit\b|提交记录|提交記錄)/i],
];
function conflictResolutionOpenRepairEntryIds(groupId) {
    const file = path.join(exports.GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR, `${safeSegment(groupId)}.json`);
    const ledger = readJson(file, {});
    const openStatuses = new Set(["pending", "in_progress", "running", "claimed", "dispatching", "blocked", "needs_info", "needs_user", "waiting"]);
    return new Set((Array.isArray(ledger.items) ? ledger.items : [])
        .filter((item) => openStatuses.has(String(item.status || "pending").trim().toLowerCase()))
        .map((item) => String(item.completion_preservation_conflict_resolution_entry_id || "").trim())
        .filter(Boolean));
}
function conflictResolutionQuarantineChecksum(value = {}) {
    return checksum({
        group_id: value.group_id || "",
        current_manifest_checksum: value.current_manifest_checksum || "",
        previous_manifest_checksum: value.previous_manifest_checksum || "",
        entries: (value.entries || []).map((entry) => ({
            rel_path: entry.rel_path || "",
            content_checksum: entry.content_checksum || "",
            row_ids_checksum: entry.row_ids_checksum || "",
            first_seen_at: entry.first_seen_at || "",
            eligible_after: entry.eligible_after || "",
            status: entry.status || "",
            deleted_at: entry.deleted_at || "",
        })),
    }, 48);
}
function pathWithinDirectory(target, directory) {
    const resolvedTarget = path.resolve(target);
    const resolvedDirectory = path.resolve(directory);
    return resolvedTarget.startsWith(`${resolvedDirectory}${path.sep}`);
}
function typedMemorySessionScopeIdentity(scopeId, ledger = {}) {
    const ledgerScopeId = String(ledger.groupId || ledger.group_id || scopeId || "").trim();
    const exactMatch = ledgerScopeId.match(/^(.*)--(gcs_[a-zA-Z0-9._-]+)$/);
    const explicitSessionId = String(ledger.groupSessionId
        || ledger.group_session_id
        || ledger.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive?.groupSessionId
        || ledger.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive?.group_session_id
        || "").trim();
    const groupSessionId = /^gcs_[a-zA-Z0-9._-]+$/.test(explicitSessionId)
        ? explicitSessionId
        : exactMatch?.[2] || "";
    const explicitRootGroupId = String(ledger.sourceGroupId
        || ledger.source_group_id
        || ledger.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive?.sourceGroupId
        || ledger.pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive?.source_group_id
        || "").trim();
    const rootGroupId = explicitRootGroupId || exactMatch?.[1] || ledgerScopeId;
    const rootGroupKey = checksum(["provider-reliability-root-group", rootGroupId.toLowerCase()], 24);
    const sourceSessionKey = checksum([
        "provider-reliability-source-session",
        rootGroupId.toLowerCase(),
        groupSessionId || "legacy-unscoped",
    ], 24);
    return {
        ledgerScopeId,
        rootGroupId,
        rootGroupKey,
        groupSessionId,
        sourceSessionKey,
        exactSession: !!groupSessionId,
    };
}
function extractPathClaims(value) {
    const text = String(value || "");
    const matched = text.match(/(?:[A-Za-z]:\\[^\s，。；]+|(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+|[\w.-]+\.(?:ts|tsx|js|jsx|vue|java|py|go|rs|md|json|toml|yaml|yml|xml|sql))/g) || [];
    return uniqueStrings(matched.map(item => item.replace(/[),.;，。；]+$/g, "")), 80);
}
function resolveClaimPath(projectRoot, claim) {
    const raw = String(claim || "").trim();
    if (!raw)
        return "";
    if (/^[A-Za-z]:\\/.test(raw) || path.isAbsolute(raw))
        return raw;
    return path.resolve(projectRoot, raw.replace(/\\/g, path.sep));
}
function extractTaskStateSignal(fact) {
    const text = String(fact?.text || "");
    const taskId = String(fact?.taskId || (text.match(/\[([^\]]+)\]/)?.[1]) || "").trim();
    if (!taskId)
        return null;
    const rawState = String(fact?.state || fact?.status || fact?.outcome || "").trim().toLowerCase();
    const state = ["blocked", "failed", "timed_out", "timeout", "needs_info"].includes(rawState)
        ? "blocked"
        : ["done", "completed", "passed", "fixed", "success"].includes(rawState)
            ? "done"
            : "";
    if (!state)
        return null;
    return { taskId, state, sourceIndex: Number(fact?.sourceIndex || 0), messageId: fact?.messageId || "", text: compactText(text, 220) };
}
function shouldIgnoreGroupMemoryRequest(query, options = {}) {
    void query;
    if (options.forceMemory === true || options.force_memory === true || options.disableIgnoreMemoryDetection === true || options.disable_ignore_memory_detection === true)
        return false;
    if (options.ignoreMemory === true || options.ignore_memory === true)
        return true;
    const task = options.task || {};
    const decision = options.workflowDecision || options.workflow_decision
        || task.workflowDecision || task.workflow_decision
        || task.intake_draft?.workflowDecision || task.intake_draft?.workflow_decision
        || task.workflow_meta?.intake?.task_intent?.workflowDecision
        || task.workflow_meta?.intake?.task_intent?.workflow_decision
        || null;
    return String(decision?.memoryPolicy || decision?.memory_policy || "use") === "ignore";
}
function typedMemoryDeliveryLeaseChecksum(lease = {}) {
    return checksum([
        Number(lease.version || 0),
        String(lease.lease_id || lease.leaseId || ""),
        String(lease.status || ""),
        String(lease.group_id || lease.groupId || ""),
        String(lease.group_session_id || lease.groupSessionId || ""),
        String(lease.target_project || lease.targetProject || ""),
        String(lease.task_id || lease.taskId || ""),
        String(lease.task_agent_session_id || lease.taskAgentSessionId || ""),
        String(lease.recall_scope || lease.recallScope || ""),
        String(lease.compact_epoch || lease.compactEpoch || "precompact"),
        String(lease.capsule_checksum || lease.capsuleChecksum || ""),
        Array.isArray(lease.delivered_rel_paths || lease.deliveredRelPaths) ? (lease.delivered_rel_paths || lease.deliveredRelPaths) : [],
        Number(lease.delivered_bytes || lease.deliveredBytes || 0),
        Number(lease.delivered_tokens || lease.deliveredTokens || 0),
        String(lease.query_checksum || lease.queryChecksum || ""),
        Number(lease.attempt_sequence || lease.attemptSequence || 0),
    ], 32);
}
function getAlreadySurfacedGroupTypedMemory(groupId, scope = "global", options = {}) {
    if (options.disableLedger === true || options.disable_ledger === true)
        return [];
    const ledger = (0, typed_memory_ledgers_1.readGroupTypedMemoryRecallLedger)(groupId);
    const scoped = ledger.scopes?.[(0, typed_memory_recall_1.normalizeRecallScope)(scope)] || {};
    const currentChecksums = new Map((0, typed_memory_index_build_1.scanGroupTypedMemoryDocuments)(groupId)
        .map((doc) => [String(doc.relPath || "").toLowerCase(), String(doc.checksum || "")]));
    return Object.entries(scoped.docs || {})
        .filter(([relPath, raw]) => {
        const recordedChecksum = String(raw?.documentChecksum || raw?.document_checksum || "");
        const currentChecksum = currentChecksums.get(String(relPath || "").toLowerCase()) || "";
        return !!recordedChecksum && !!currentChecksum && recordedChecksum === currentChecksum;
    })
        .map(([relPath]) => relPath)
        .slice(-Number(options.limit || 120));
}
function typedMemoryStaleResolutionChecksum(event) {
    return checksum([
        event.schema,
        event.version,
        event.event_id,
        event.candidate_id,
        event.candidate_checksum,
        event.scope_id,
        event.action,
        event.status,
        event.rel_path,
        event.document_checksum,
        event.replacement_rel_path,
        event.replacement_document_checksum,
        event.actor,
        event.reason,
        event.resolved_at,
    ], 64);
}
function typedMemoryStaleRejectionChecksum(rejection) {
    return checksum([
        rejection.schema,
        rejection.version,
        rejection.rejection_id,
        rejection.scope_id,
        rejection.task_id,
        rejection.execution_id,
        rejection.task_agent_session_id,
        rejection.rel_path,
        rejection.requested_action,
        rejection.rejection_codes,
        rejection.rejected_at,
    ], 64);
}
function isExactGroupTypedMemorySessionScope(scopeId) {
    return /^.+--gcs_[a-zA-Z0-9._-]+$/.test(String(scopeId || "").trim());
}
exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SYSTEM_PROMPT = `You are selecting memories that will be useful to a coding Agent as it processes a user's query. You will be given the user's query and a list of available memory files with their filenames and descriptions.

Return a list of filenames for the memories that will clearly be useful to the coding Agent as it processes the user's query (up to 5). Only include memories that you are certain will be helpful based on their name and description.
- If you are unsure if a memory will be useful in processing the user's query, then do not include it in your list. Be selective and discerning.
- If there are no memories in the list that would clearly be useful, return an empty list.
- If a list of recently-used tools is provided, do not select memories that are usage reference or API documentation for those tools. Do still select memories containing warnings, gotchas, or known issues about those tools.
- Historical outcome hints, when present, are advisory evidence from the same group-chat session and exact query only. Never select a memory solely because it was used before, and never reject it solely because it was ignored before. The current query, filename, description, freshness, and current-source truth remain authoritative.`;
function groupTypedMemoryTextLineCount(value) {
    const text = String(value || "");
    return text ? text.split(/\r?\n/).length : 0;
}
function normalizeGroupTypedMemoryOutcomeRelPaths(value, limit = exports.GROUP_TYPED_MEMORY_MANIFEST_MAX_FILES) {
    return uniqueStrings((Array.isArray(value) ? value : [])
        .map((item) => String(item || "").trim())
        .filter((item) => path.basename(item) === item && item.toLowerCase().endsWith(".md")), limit);
}
function buildGroupTypedMemoryPendingStaleConflictIndex(groupId) {
    const ledger = (0, typed_memory_ledgers_1.readGroupTypedMemoryStaleCandidateLedger)(groupId);
    const byRelPath = new Map();
    if (ledger.ledger_checksum_valid === true) {
        for (const candidate of ledger.candidates || []) {
            if (candidate?.status !== "pending")
                continue;
            const relPath = String(candidate.rel_path || "").trim().toLowerCase();
            if (!relPath)
                continue;
            byRelPath.set(relPath, [...(byRelPath.get(relPath) || []), candidate]);
        }
    }
    return {
        schema: "ccm-group-typed-memory-pending-stale-conflict-index-v1",
        valid: ledger.ledger_checksum_valid === true,
        pendingCount: [...byRelPath.values()].reduce((sum, rows) => sum + rows.length, 0),
        byRelPath,
    };
}
//# sourceMappingURL=typed-memory-shared.js.map