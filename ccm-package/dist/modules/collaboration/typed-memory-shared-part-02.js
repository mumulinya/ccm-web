"use strict";
// Behavior-freeze split from typed-memory-shared.ts (part 2/2).
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
exports.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SYSTEM_PROMPT = exports.MODEL_EXTRACTION_TOPIC_CANONICAL_CONCEPTS = exports.MODEL_EXTRACTION_TOPIC_GENERIC_CONCEPTS = exports.GROUP_LOG_RESOURCE_PURPOSE_PATTERN = exports.GROUP_LOG_EXTERNAL_RESOURCE_PATTERN = exports.GROUP_LOG_POSITIVE_REVOCATION_PATTERN = exports.GROUP_LOG_POSITIVE_CONFIRMATION_PATTERN = exports.GROUP_LOG_USER_CORRECTION_PATTERN = exports.GROUP_LOG_RATIONALE_PATTERN = exports.GROUP_LOG_NON_OBVIOUS_PATTERN = exports.GROUP_LOG_DURABLE_PATTERN = exports.GROUP_LOG_EPHEMERAL_PATTERN = exports.GROUP_LOG_ACTIVITY_NOISE_PATTERN = void 0;
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
const path = __importStar(require("path"));
const typed_memory_index_build_1 = require("./typed-memory-index-build");
const typed_memory_ledgers_1 = require("./typed-memory-ledgers");
const typed_memory_recall_1 = require("./typed-memory-recall");
const typed_memory_shared_part_01_1 = require("./typed-memory-shared-part-01");
function groupTypedMemoryPriority(type) {
    const value = (0, typed_memory_shared_part_01_1.normalizeMemoryType)(type);
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
    const values = (items || []).map(mapper).map(item => (0, typed_memory_shared_part_01_1.compactText)(item, 500)).filter(Boolean).slice(-limit);
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
        why: (0, typed_memory_shared_part_01_1.compactText)(raw.why || raw.reason || raw.rationale || "", 420),
        howToApply: (0, typed_memory_shared_part_01_1.compactText)(raw.howToApply || raw.how_to_apply || raw.application || "", 420),
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
        ? (0, typed_memory_shared_part_01_1.compactText)(rawTarget?.id || rawTarget?.messageId || rawTarget?.message_id || "", 160)
        : (0, typed_memory_shared_part_01_1.compactText)(rawTarget, 160);
    return {
        validated: raw.validated === true || raw.confirmed === true || raw.accepted === true,
        targetMessageId,
        targetMessageChecksum: String(raw.targetMessageChecksum || raw.target_message_checksum || "").trim().toLowerCase(),
        groupSessionScopeId: (0, typed_memory_shared_part_01_1.compactText)(raw.groupSessionScopeId || raw.group_session_scope_id || raw.scopeId || raw.scope_id || "", 180),
        rule: (0, typed_memory_shared_part_01_1.compactText)(raw.rule || raw.approach || raw.memory || "", 900),
        why: (0, typed_memory_shared_part_01_1.compactText)(raw.why || raw.reason || raw.rationale || "", 420),
        howToApply: (0, typed_memory_shared_part_01_1.compactText)(raw.howToApply || raw.how_to_apply || raw.application || "", 420),
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
        targetConfirmationMessageId: (0, typed_memory_shared_part_01_1.compactText)(raw.targetConfirmationMessageId || raw.target_confirmation_message_id || raw.confirmationMessageId || raw.confirmation_message_id || "", 160),
        targetApproachMessageId: (0, typed_memory_shared_part_01_1.compactText)(raw.targetApproachMessageId || raw.target_approach_message_id || raw.targetMessageId || raw.target_message_id || "", 160),
        targetApproachChecksum: String(raw.targetApproachChecksum || raw.target_approach_checksum || raw.targetMessageChecksum || raw.target_message_checksum || "").trim().toLowerCase(),
        groupSessionScopeId: (0, typed_memory_shared_part_01_1.compactText)(raw.groupSessionScopeId || raw.group_session_scope_id || raw.scopeId || raw.scope_id || "", 180),
        reason: (0, typed_memory_shared_part_01_1.compactText)(raw.reason || raw.why || raw.rationale || "", 500),
        replacementRule: (0, typed_memory_shared_part_01_1.compactText)(raw.replacementRule || raw.replacement_rule || raw.replacement || raw.instead || "", 900),
        howToApply: (0, typed_memory_shared_part_01_1.compactText)(raw.howToApply || raw.how_to_apply || raw.application || "", 420),
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
            proofId: valid ? `pfp_${(0, typed_memory_shared_part_01_1.checksum)([realRoot, relativePath, observedChecksum], 28)}` : "",
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
    const targetChecksum = targetText ? (0, typed_memory_shared_part_01_1.checksum)(targetText, 64) : "";
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
        || (exports.GROUP_LOG_RATIONALE_PATTERN.test(targetText) ? (0, typed_memory_shared_part_01_1.compactText)(targetText, 420) : "");
    const howToApply = requested.howToApply
        || userAdmission.howToApply
        || targetAdmission.howToApply
        || (durable && nonObvious ? (0, typed_memory_shared_part_01_1.compactText)(targetText, 420) : "");
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
    const hints = (0, typed_memory_shared_part_01_1.normalizePostCompactCandidateUsageHints)({ postCompactCandidateUsage: usage });
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
    const updatedAt = options.updatedAt || (0, typed_memory_shared_part_01_1.now)();
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
    const file = path.join(typed_memory_shared_part_01_1.GROUP_MEMORY_REPLAY_REPAIR_WORK_ITEMS_DIR, `${(0, typed_memory_shared_part_01_1.safeSegment)(groupId)}.json`);
    const ledger = (0, typed_memory_shared_part_01_1.readJson)(file, {});
    const openStatuses = new Set(["pending", "in_progress", "running", "claimed", "dispatching", "blocked", "needs_info", "needs_user", "waiting"]);
    return new Set((Array.isArray(ledger.items) ? ledger.items : [])
        .filter((item) => openStatuses.has(String(item.status || "pending").trim().toLowerCase()))
        .map((item) => String(item.completion_preservation_conflict_resolution_entry_id || "").trim())
        .filter(Boolean));
}
function conflictResolutionQuarantineChecksum(value = {}) {
    return (0, typed_memory_shared_part_01_1.checksum)({
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
    const rootGroupKey = (0, typed_memory_shared_part_01_1.checksum)(["provider-reliability-root-group", rootGroupId.toLowerCase()], 24);
    const sourceSessionKey = (0, typed_memory_shared_part_01_1.checksum)([
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
    return (0, typed_memory_shared_part_01_1.uniqueStrings)(matched.map(item => item.replace(/[),.;，。；]+$/g, "")), 80);
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
    const state = /(失败|阻塞|未完成|超时|异常|failed|blocked|timeout|needs_info|need info)/i.test(text)
        ? "blocked"
        : /(完成|修复|通过|done|success|completed|passed|fixed)/i.test(text)
            ? "done"
            : "";
    if (!state)
        return null;
    return { taskId, state, sourceIndex: Number(fact?.sourceIndex || 0), messageId: fact?.messageId || "", text: (0, typed_memory_shared_part_01_1.compactText)(text, 220) };
}
function shouldIgnoreGroupMemoryRequest(query, options = {}) {
    if (options.forceMemory === true || options.force_memory === true || options.disableIgnoreMemoryDetection === true || options.disable_ignore_memory_detection === true)
        return false;
    if (options.ignoreMemory === true || options.ignore_memory === true)
        return true;
    const text = String(query || "")
        .replace(/\bmemoryIgnored\b|\bmemory_ignored\b|\bmemoryUsed\b|\bmemory_used\b|\bmemoryUsed\s*\/\s*memoryIgnored\b|\bmemoryProvenanceUsage\b/gi, "receipt_field");
    return /(忽略|不要|不使用|别用|\bignore\b|\bignored\b|do not use|don't use)[^\n]{0,20}(记忆|\bmemory\b)/i.test(text)
        || /(记忆|\bmemory\b)[^\n]{0,20}(忽略|不要|不使用|\bignore\b|\bignored\b)/i.test(text);
}
function typedMemoryDeliveryLeaseChecksum(lease = {}) {
    return (0, typed_memory_shared_part_01_1.checksum)([
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
    return (0, typed_memory_shared_part_01_1.checksum)([
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
    return (0, typed_memory_shared_part_01_1.checksum)([
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
function normalizeGroupTypedMemoryOutcomeRelPaths(value, limit = typed_memory_shared_part_01_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_FILES) {
    return (0, typed_memory_shared_part_01_1.uniqueStrings)((Array.isArray(value) ? value : [])
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
//# sourceMappingURL=typed-memory-shared-part-02.js.map