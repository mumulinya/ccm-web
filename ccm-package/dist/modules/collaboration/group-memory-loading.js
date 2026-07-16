"use strict";
// Extracted functional module. The original entry remains a compatibility facade.
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
exports.buildClaudeMemorySettingSourcePolicy = buildClaudeMemorySettingSourcePolicy;
exports.getGroupClaudeInstructionsLoadedHookLedgerFile = getGroupClaudeInstructionsLoadedHookLedgerFile;
exports.registerGroupMemoryInstructionsLoadedHook = registerGroupMemoryInstructionsLoadedHook;
exports.hasGroupMemoryInstructionsLoadedHook = hasGroupMemoryInstructionsLoadedHook;
exports.loadGroupClaudeInstructionsLoadedHookLedger = loadGroupClaudeInstructionsLoadedHookLedger;
exports.executeGroupMemoryInstructionsLoadedHooks = executeGroupMemoryInstructionsLoadedHooks;
exports.getGroupClaudeMemoryExternalIncludeApprovalLedgerFile = getGroupClaudeMemoryExternalIncludeApprovalLedgerFile;
exports.loadGroupClaudeMemoryExternalIncludeApprovalLedger = loadGroupClaudeMemoryExternalIncludeApprovalLedger;
exports.approveGroupClaudeMemoryExternalInclude = approveGroupClaudeMemoryExternalInclude;
exports.markGroupClaudeMemoryExternalIncludeWarningShown = markGroupClaudeMemoryExternalIncludeWarningShown;
exports.discoverProjectMemoryFiles = discoverProjectMemoryFiles;
exports.importProjectMemoryFilesToGroupTypedMemory = importProjectMemoryFilesToGroupTypedMemory;
exports.discoverGlobalClaudeMemoryFiles = discoverGlobalClaudeMemoryFiles;
exports.importGlobalClaudeMemoryToGroupTypedMemory = importGlobalClaudeMemoryToGroupTypedMemory;
exports.buildGroupTypedMemoryLoadPlan = buildGroupTypedMemoryLoadPlan;
exports.renderGroupTypedMemoryLoadPlan = renderGroupTypedMemoryLoadPlan;
exports.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile;
exports.conflictResolutionColdArchiveManifestChecksum = conflictResolutionColdArchiveManifestChecksum;
exports.getConflictResolutionColdArchiveManifestGenerationsDir = getConflictResolutionColdArchiveManifestGenerationsDir;
exports.getConflictResolutionColdArchiveManifestGenerationFile = getConflictResolutionColdArchiveManifestGenerationFile;
exports.readConflictResolutionColdArchiveManifest = readConflictResolutionColdArchiveManifest;
exports.readPreviousConflictResolutionColdArchiveManifest = readPreviousConflictResolutionColdArchiveManifest;
exports.verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations = verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations;
exports.recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration = recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration;
exports.recordGroupTypedMemoryRecall = recordGroupTypedMemoryRecall;
exports.getGroupTypedMemoryManifestSelectorDecisionDir = getGroupTypedMemoryManifestSelectorDecisionDir;
exports.getGroupTypedMemoryManifestSelectorOutcomeDir = getGroupTypedMemoryManifestSelectorOutcomeDir;
exports.getGroupTypedMemoryManifestSelectorConsumptionDir = getGroupTypedMemoryManifestSelectorConsumptionDir;
exports.getGroupTypedMemoryManifestSelectorShapeDir = getGroupTypedMemoryManifestSelectorShapeDir;
exports.verifyGroupTypedMemoryManifestSelectorOutcome = verifyGroupTypedMemoryManifestSelectorOutcome;
exports.recordGroupTypedMemoryManifestSelectorOutcome = recordGroupTypedMemoryManifestSelectorOutcome;
exports.verifyGroupTypedMemoryManifestSelectorConsumptionOutcome = verifyGroupTypedMemoryManifestSelectorConsumptionOutcome;
exports.recordGroupTypedMemoryManifestSelectorConsumptionOutcomes = recordGroupTypedMemoryManifestSelectorConsumptionOutcomes;
exports.summarizeGroupTypedMemoryManifestSelectorConsumption = summarizeGroupTypedMemoryManifestSelectorConsumption;
exports.verifyGroupTypedMemoryManifestSelectorCalibration = verifyGroupTypedMemoryManifestSelectorCalibration;
exports.buildGroupTypedMemoryManifestSelectorCalibration = buildGroupTypedMemoryManifestSelectorCalibration;
exports.verifyGroupTypedMemoryManifestSelectorShape = verifyGroupTypedMemoryManifestSelectorShape;
exports.recordGroupTypedMemoryManifestSelectorShape = recordGroupTypedMemoryManifestSelectorShape;
exports.summarizeGroupTypedMemoryManifestSelectorShapes = summarizeGroupTypedMemoryManifestSelectorShapes;
exports.verifyGroupTypedMemoryManifestSelection = verifyGroupTypedMemoryManifestSelection;
exports.configureGroupTypedMemoryManifestSelector = configureGroupTypedMemoryManifestSelector;
exports.buildGroupTypedMemoryManifest = buildGroupTypedMemoryManifest;
exports.selectGroupTypedMemoryManifest = selectGroupTypedMemoryManifest;
exports.summarizeGroupTypedMemoryManifestSelectorOutcomes = summarizeGroupTypedMemoryManifestSelectorOutcomes;
exports.summarizeGroupTypedMemoryManifestSelectorDecisions = summarizeGroupTypedMemoryManifestSelectorDecisions;
exports.buildGroupTypedMemoryRecall = buildGroupTypedMemoryRecall;
exports.renderGroupTypedMemoryRecall = renderGroupTypedMemoryRecall;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const group_memory_index_1 = require("./group-memory-index");
let configuredGroupTypedMemoryManifestSelectorExecutor = null;
function buildClaudeMemorySettingSourcePolicy(options = {}) {
    const configured = (0, group_memory_index_1.parseClaudeSettingSources)(options.settingSources ?? options.setting_sources ?? process.env.CCM_CLAUDE_SETTING_SOURCES);
    const editable = configured
        ? configured.enabled.filter(source => group_memory_index_1.CLAUDE_EDITABLE_SETTING_SOURCES.includes(source))
        : [...group_memory_index_1.CLAUDE_EDITABLE_SETTING_SOURCES];
    const enabled = new Set([
        ...editable,
        ...group_memory_index_1.CLAUDE_ALWAYS_ON_SETTING_SOURCES,
        ...(configured?.enabled || []).filter(source => group_memory_index_1.CLAUDE_ALWAYS_ON_SETTING_SOURCES.includes(source)),
    ]);
    const explicitDisable = (camel, snake) => options[camel] === false || options[snake] === false;
    const policy = {
        schema: "ccm-claude-memory-setting-source-policy-v1",
        version: group_memory_index_1.GROUP_CLAUDE_MEMORY_SETTING_SOURCE_POLICY_VERSION,
        configured: configured ? configured.enabled : null,
        invalid: configured?.invalid || [],
        enabled: [...enabled],
        disabled: [...group_memory_index_1.CLAUDE_EDITABLE_SETTING_SOURCES, ...group_memory_index_1.CLAUDE_ALWAYS_ON_SETTING_SOURCES].filter(source => !enabled.has(source)),
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
function getGroupClaudeInstructionsLoadedHookLedgerFile(groupId) {
    return path.join((0, group_memory_index_1.getGroupTypedMemoryDir)(groupId), group_memory_index_1.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_LEDGER);
}
function registerGroupMemoryInstructionsLoadedHook(hook) {
    if (typeof hook !== "function")
        throw new Error("InstructionsLoaded hook must be a function");
    group_memory_index_1.groupMemoryInstructionsLoadedHooks.add(hook);
    return () => group_memory_index_1.groupMemoryInstructionsLoadedHooks.delete(hook);
}
function hasGroupMemoryInstructionsLoadedHook() {
    return group_memory_index_1.groupMemoryInstructionsLoadedHooks.size > 0;
}
function loadGroupClaudeInstructionsLoadedHookLedger(groupId) {
    const file = getGroupClaudeInstructionsLoadedHookLedgerFile(groupId);
    const parsed = (0, group_memory_index_1.readJson)(file, {});
    return {
        schema: "ccm-claude-instructions-loaded-hook-ledger-v1",
        version: group_memory_index_1.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
        groupId,
        file,
        entries: Array.isArray(parsed?.entries) ? parsed.entries : [],
        updatedAt: String(parsed?.updatedAt || ""),
    };
}
function executeGroupMemoryInstructionsLoadedHooks(groupId, input = {}) {
    const event = {
        schema: "ccm-claude-instructions-loaded-hook-event-v1",
        version: group_memory_index_1.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
        groupId,
        hook_event_name: "InstructionsLoaded",
        file_path: String(input.filePath || input.file_path || ""),
        memory_type: String(input.memoryType || input.memory_type || "Project"),
        load_reason: String(input.loadReason || input.load_reason || "context_bundle"),
        globs: (0, group_memory_index_1.normalizePathGlobs)(input.globs || input.paths || []),
        trigger_file_path: String(input.triggerFilePath || input.trigger_file_path || ""),
        parent_file_path: String(input.parentFilePath || input.parent_file_path || ""),
        source: String(input.source || ""),
        scope: String(input.scope || ""),
        kind: String(input.kind || ""),
        rel_path: String(input.relPath || input.rel_path || ""),
        firedAt: (0, group_memory_index_1.now)(),
    };
    const rows = [];
    let index = 0;
    for (const hook of group_memory_index_1.groupMemoryInstructionsLoadedHooks) {
        const startedAt = Date.now();
        try {
            const output = hook(event);
            const returnedPromise = !!output && typeof output.then === "function";
            rows.push({
                hookIndex: index,
                status: returnedPromise ? "async_not_awaited" : "ok",
                durationMs: Date.now() - startedAt,
                result: returnedPromise ? "Promise returned by sync pipeline" : (0, group_memory_index_1.compactText)(JSON.stringify(output ?? null), 1000),
            });
        }
        catch (error) {
            rows.push({
                hookIndex: index,
                status: "error",
                durationMs: Date.now() - startedAt,
                error: (0, group_memory_index_1.compactText)(error?.message || error, 1000),
            });
        }
        index += 1;
    }
    const summary = {
        schema: "ccm-claude-instructions-loaded-hook-execution-v1",
        version: group_memory_index_1.GROUP_CLAUDE_INSTRUCTIONS_LOADED_HOOK_VERSION,
        groupId,
        configured: group_memory_index_1.groupMemoryInstructionsLoadedHooks.size > 0,
        hookCount: group_memory_index_1.groupMemoryInstructionsLoadedHooks.size,
        event,
        rows,
        firedCount: rows.length,
        failureCount: rows.filter(row => row.status === "error").length,
        ledgerFile: getGroupClaudeInstructionsLoadedHookLedgerFile(groupId),
    };
    if (summary.configured) {
        const ledger = loadGroupClaudeInstructionsLoadedHookLedger(groupId);
        (0, group_memory_index_1.writeGroupClaudeInstructionsLoadedHookLedger)(groupId, {
            ...ledger,
            entries: [...(ledger.entries || []), summary],
        });
    }
    return summary;
}
function getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId) {
    return path.join((0, group_memory_index_1.getGroupTypedMemoryDir)(groupId), group_memory_index_1.GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_LEDGER);
}
function loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId) {
    const file = getGroupClaudeMemoryExternalIncludeApprovalLedgerFile(groupId);
    const parsed = (0, group_memory_index_1.readJson)(file, {});
    return {
        schema: "ccm-claude-memory-external-include-approval-ledger-v1",
        version: group_memory_index_1.GROUP_CLAUDE_MEMORY_EXTERNAL_INCLUDE_APPROVAL_VERSION,
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
function approveGroupClaudeMemoryExternalInclude(groupId, input = {}) {
    const ledger = loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId);
    const includes = Array.isArray(input.includes)
        ? input.includes
        : Array.isArray(input.paths)
            ? input.paths.map((item) => ({ path: item }))
            : [input];
    const approvedBy = String(input.approvedBy || input.approved_by || "local-user");
    const approveAll = input.approveAll === true || input.approve_all === true || input.hasExternalIncludesApproved === true;
    const approved = new Map();
    for (const item of ledger.approved || []) {
        if (!item?.key)
            continue;
        approved.set(String(item.key), item);
    }
    for (const item of includes) {
        const includePath = (0, group_memory_index_1.normalizeExternalIncludeApprovalPath)(item?.path || item?.ref || item);
        if (!includePath)
            continue;
        const key = (0, group_memory_index_1.externalIncludeApprovalKey)(includePath);
        approved.set(key, {
            key,
            path: includePath,
            parent: String(item?.parent || item?.from || input.parent || ""),
            scope: String(item?.scope || input.scope || ""),
            kind: String(item?.kind || input.kind || ""),
            approvedBy,
            approvedAt: (0, group_memory_index_1.now)(),
        });
    }
    return (0, group_memory_index_1.writeGroupClaudeMemoryExternalIncludeApprovalLedger)(groupId, {
        ...ledger,
        hasExternalIncludesApproved: ledger.hasExternalIncludesApproved === true || approveAll,
        approved: [...approved.values()],
    });
}
function markGroupClaudeMemoryExternalIncludeWarningShown(groupId, input = {}) {
    const ledger = loadGroupClaudeMemoryExternalIncludeApprovalLedger(groupId);
    const includes = Array.isArray(input.includes) ? input.includes : [];
    const warnings = [...(ledger.warnings || []), {
            shownAt: (0, group_memory_index_1.now)(),
            actor: String(input.actor || "system"),
            count: Number(input.count || includes.length || 0),
            includes: includes.slice(0, 40).map((item) => ({
                path: (0, group_memory_index_1.normalizeExternalIncludeApprovalPath)(item?.path || item?.ref || item),
                parent: String(item?.parent || item?.from || ""),
                scope: String(item?.scope || ""),
                kind: String(item?.kind || ""),
            })),
        }];
    return (0, group_memory_index_1.writeGroupClaudeMemoryExternalIncludeApprovalLedger)(groupId, {
        ...ledger,
        hasExternalIncludesWarningShown: true,
        warningShownAt: ledger.warningShownAt || (0, group_memory_index_1.now)(),
        warnings,
    });
}
function discoverProjectMemoryFiles(projectRoot, options = {}) {
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
    const dirs = [];
    let current = root;
    for (let depth = 0; depth <= maxParentDepth; depth += 1) {
        dirs.push(current);
        const parent = path.dirname(current);
        if (!parent || parent === current)
            break;
        current = parent;
    }
    const files = [];
    const issues = [];
    const seen = new Set();
    const addFile = (file, kind, baseDir) => {
        const resolved = path.resolve(file);
        const key = (0, group_memory_index_1.normalizeFileKey)(resolved);
        if (seen.has(key))
            return;
        seen.add(key);
        if (!fs.existsSync(resolved))
            return;
        try {
            const stat = fs.statSync(resolved);
            if (!stat.isFile())
                return;
            const content = fs.readFileSync(resolved, "utf-8");
            const parsed = (0, group_memory_index_1.parseFrontmatter)(content);
            files.push({
                file: resolved,
                relPath: (0, group_memory_index_1.projectMemoryRelPath)(root, resolved),
                baseDir,
                kind,
                memoryType: kind === "local" ? "local" : "project",
                name: parsed.meta.name || path.basename(resolved),
                description: parsed.meta.description || (0, group_memory_index_1.compactText)(parsed.body.split(/\n+/).find(Boolean) || "", 180),
                paths: (0, group_memory_index_1.normalizePathGlobs)(parsed.meta.paths || parsed.meta.path_globs || parsed.meta.globs || []),
                bytes: stat.size,
                mtimeMs: stat.mtimeMs,
                checksum: (0, group_memory_index_1.checksum)(content, 24),
                body: parsed.body || content,
            });
        }
        catch (error) {
            issues.push({ type: "unreadable_project_memory", path: resolved, error: (0, group_memory_index_1.compactText)(error?.message || error, 260) });
        }
    };
    for (const dir of dirs.reverse()) {
        if (includeProject) {
            addFile(path.join(dir, "CLAUDE.md"), "project", dir);
            addFile(path.join(dir, ".claude", "CLAUDE.md"), "project", dir);
            const rulesDir = path.join(dir, ".claude", "rules");
            for (const file of (0, group_memory_index_1.listMarkdownFilesRecursive)(rulesDir, { maxFiles: maxRuleFiles }))
                addFile(file, "project_rule", dir);
        }
        if (includeLocal)
            addFile(path.join(dir, "CLAUDE.local.md"), "local", dir);
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
function importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, options = {}) {
    const discovery = discoverProjectMemoryFiles(projectRoot, options);
    const projectName = (0, group_memory_index_1.safeSegment)(options.project || options.projectName || options.project_name || path.basename(String(projectRoot || "project")), "project");
    const maxImportFiles = Math.max(1, Math.min(300, Number(options.maxImportFiles || options.max_import_files || 80)));
    const includeAudit = (0, group_memory_index_1.buildClaudeMemoryIncludeExpansion)(discovery.files || [], {
        groupId,
        allowedRoots: [discovery.projectRoot],
        allowExternalIncludes: options.allowExternalIncludes === true || options.allow_external_includes === true,
        maxIncludeDepth: options.maxIncludeDepth || options.max_include_depth,
    });
    const importItems = [...(discovery.files || []), ...(includeAudit.files || [])];
    const boundedImportItems = importItems.slice(0, maxImportFiles);
    const writes = [];
    const skipped = [];
    for (const item of boundedImportItems) {
        const rel = String(item.relPath || path.basename(item.file || "memory.md"));
        const slug = (0, group_memory_index_1.safeSegment)(`project-${projectName}-${rel.replace(/\.md$/i, "")}`, `project-${projectName}-memory`);
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
            (0, group_memory_index_1.neutralizeClaudeMemoryIncludeRefs)(item.body || ""),
        ].filter(line => line !== "").join("\n");
        const write = (0, group_memory_index_1.upsertGroupTypedMemoryDocument)(groupId, {
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
    const instructionsLoadedHooks = (0, group_memory_index_1.executeInstructionsLoadedHooksForImportedClaudeMemory)(groupId, boundedImportItems, {
        ...options,
        loadReason: options.instructionsLoadReason || options.instructions_load_reason || "project_memory_import",
    });
    const index = (0, group_memory_index_1.buildGroupTypedMemoryIndex)(groupId);
    return {
        schema: "ccm-project-memory-import-v1",
        version: group_memory_index_1.GROUP_PROJECT_MEMORY_IMPORT_VERSION,
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
        importedAt: (0, group_memory_index_1.now)(),
    };
}
function discoverGlobalClaudeMemoryFiles(options = {}) {
    const settingSourcePolicy = buildClaudeMemorySettingSourcePolicy(options);
    const includeUser = settingSourcePolicy.includeUser;
    const includeManaged = settingSourcePolicy.includeManaged;
    const userRoot = path.resolve(String(options.userRoot || options.user_root || (0, group_memory_index_1.defaultUserClaudeMemoryRoot)()));
    const managedRoot = path.resolve(String(options.managedRoot || options.managed_root || (0, group_memory_index_1.defaultManagedClaudeMemoryRoot)()));
    const maxRuleFiles = Math.max(1, Math.min(300, Number(options.maxRuleFiles || options.max_rule_files || 80)));
    const files = [];
    const issues = [];
    const seen = new Set();
    const addFile = (file, scope, kind, root) => {
        const resolved = path.resolve(file);
        const key = (0, group_memory_index_1.normalizeFileKey)(resolved);
        if (seen.has(key))
            return;
        seen.add(key);
        if (!fs.existsSync(resolved))
            return;
        try {
            const stat = fs.statSync(resolved);
            if (!stat.isFile())
                return;
            const content = fs.readFileSync(resolved, "utf-8");
            const parsed = (0, group_memory_index_1.parseFrontmatter)(content);
            files.push({
                file: resolved,
                relPath: path.relative(root, resolved).replace(/\\/g, "/") || path.basename(resolved),
                root,
                scope,
                kind,
                name: parsed.meta.name || path.basename(resolved),
                description: parsed.meta.description || (0, group_memory_index_1.compactText)(parsed.body.split(/\n+/).find(Boolean) || "", 180),
                paths: (0, group_memory_index_1.normalizePathGlobs)(parsed.meta.paths || parsed.meta.path_globs || parsed.meta.globs || []),
                bytes: stat.size,
                mtimeMs: stat.mtimeMs,
                checksum: (0, group_memory_index_1.checksum)(content, 24),
                body: parsed.body || content,
            });
        }
        catch (error) {
            issues.push({ type: "unreadable_global_claude_memory", path: resolved, error: (0, group_memory_index_1.compactText)(error?.message || error, 260) });
        }
    };
    if (includeManaged && fs.existsSync(managedRoot)) {
        addFile(path.join(managedRoot, "CLAUDE.md"), "managed", "managed", managedRoot);
        for (const file of (0, group_memory_index_1.listMarkdownFilesRecursive)(path.join(managedRoot, ".claude", "rules"), { maxFiles: maxRuleFiles })) {
            addFile(file, "managed", "managed_rule", managedRoot);
        }
    }
    else if (includeManaged && (options.managedRoot || options.managed_root || process.env.CCM_MANAGED_CLAUDE_MEMORY_DIR || process.env.CLAUDE_CODE_MANAGED_SETTINGS_PATH)) {
        issues.push({ type: "missing_managed_root", path: managedRoot });
    }
    if (includeUser && fs.existsSync(userRoot)) {
        addFile(path.join(userRoot, "CLAUDE.md"), "user", "user", userRoot);
        for (const file of (0, group_memory_index_1.listMarkdownFilesRecursive)(path.join(userRoot, "rules"), { maxFiles: maxRuleFiles })) {
            addFile(file, "user", "user_rule", userRoot);
        }
    }
    else if (includeUser && (options.userRoot || options.user_root || process.env.CLAUDE_CONFIG_DIR)) {
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
function importGlobalClaudeMemoryToGroupTypedMemory(groupId, options = {}) {
    const discovery = discoverGlobalClaudeMemoryFiles(options);
    const maxImportFiles = Math.max(1, Math.min(300, Number(options.maxImportFiles || options.max_import_files || 80)));
    const includeAudit = (0, group_memory_index_1.buildClaudeMemoryIncludeExpansion)(discovery.files || [], {
        groupId,
        maxIncludeDepth: options.maxIncludeDepth || options.max_include_depth,
        allowUserExternalIncludes: options.allowUserExternalIncludes !== false && options.allow_user_external_includes !== false,
        allowExternalForItem: (item) => {
            if (item?.scope === "user")
                return options.allowUserExternalIncludes !== false && options.allow_user_external_includes !== false;
            return options.allowExternalIncludes === true || options.allow_external_includes === true;
        },
    });
    const importItems = [...(discovery.files || []), ...(includeAudit.files || [])];
    const boundedImportItems = importItems.slice(0, maxImportFiles);
    const writes = [];
    const skipped = [];
    for (const item of boundedImportItems) {
        const rel = String(item.relPath || path.basename(item.file || "CLAUDE.md"));
        const slug = (0, group_memory_index_1.safeSegment)(`global-claude-${item.scope}-${rel.replace(/\.md$/i, "")}`, `global-claude-${item.scope}-memory`);
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
            (0, group_memory_index_1.neutralizeClaudeMemoryIncludeRefs)(item.body || ""),
        ].filter(line => line !== "").join("\n");
        const write = (0, group_memory_index_1.upsertGroupTypedMemoryDocument)(groupId, {
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
    const instructionsLoadedHooks = (0, group_memory_index_1.executeInstructionsLoadedHooksForImportedClaudeMemory)(groupId, boundedImportItems, {
        ...options,
        loadReason: options.instructionsLoadReason || options.instructions_load_reason || "global_claude_memory_import",
    });
    const index = (0, group_memory_index_1.buildGroupTypedMemoryIndex)(groupId);
    return {
        schema: "ccm-global-claude-memory-import-v1",
        version: group_memory_index_1.GROUP_GLOBAL_CLAUDE_MEMORY_IMPORT_VERSION,
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
        importedAt: (0, group_memory_index_1.now)(),
    };
}
function buildGroupTypedMemoryLoadPlan(groupId, options = {}) {
    const index = (0, group_memory_index_1.buildGroupTypedMemoryIndex)(groupId);
    const dir = index.dir;
    const maxEntries = Math.max(4, Math.min(240, Number(options.maxEntries || options.max_entries || group_memory_index_1.GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_ENTRIES)));
    const maxIncludeDepth = Math.max(1, Math.min(12, Number(options.maxIncludeDepth || options.max_include_depth || group_memory_index_1.GROUP_TYPED_MEMORY_LOAD_PLAN_MAX_INCLUDE_DEPTH)));
    const targetPaths = (0, group_memory_index_1.deriveGroupTypedMemoryTargetPaths)(options.query || "", options.targetPaths || options.target_paths || []);
    const docs = (0, group_memory_index_1.scanGroupTypedMemoryDocuments)(groupId);
    const pathConditions = new Map();
    for (const doc of docs)
        pathConditions.set((0, group_memory_index_1.normalizeFileKey)(doc.file), (0, group_memory_index_1.evaluateTypedMemoryPathCondition)(doc, targetPaths));
    const docByFile = new Map();
    for (const doc of docs)
        docByFile.set((0, group_memory_index_1.normalizeFileKey)(doc.file), doc);
    const sortedDocs = docs.slice().sort((a, b) => {
        const byPriority = (0, group_memory_index_1.groupTypedMemoryPriority)(a.type) - (0, group_memory_index_1.groupTypedMemoryPriority)(b.type);
        if (byPriority !== 0)
            return byPriority;
        const byTime = Number(a.mtimeMs || 0) - Number(b.mtimeMs || 0);
        return byTime !== 0 ? byTime : String(a.relPath || "").localeCompare(String(b.relPath || ""));
    });
    const entries = [];
    const issues = [];
    const processed = new Set();
    const visiting = new Set();
    const addIssue = (issue) => {
        issues.push({
            type: issue.type || "include_issue",
            ref: String(issue.ref || ""),
            from: String(issue.from || ""),
            detail: (0, group_memory_index_1.compactText)(issue.detail || "", 500),
        });
    };
    const processFile = (file, input = {}) => {
        const resolved = path.resolve(file);
        const key = (0, group_memory_index_1.normalizeFileKey)(resolved);
        const from = String(input.parentRelPath || "");
        if (!(0, group_memory_index_1.isPathInside)(dir, resolved)) {
            addIssue({ type: "external_include_skipped", ref: resolved, from, detail: "include path is outside this group's typed memory directory" });
            return;
        }
        if (visiting.has(key)) {
            addIssue({ type: "circular_include", ref: path.basename(resolved), from, detail: "cycle detected while expanding typed memory @include" });
            return;
        }
        if (processed.has(key))
            return;
        if (!fs.existsSync(resolved)) {
            addIssue({ type: "missing_include", ref: resolved, from, detail: "typed memory @include target does not exist" });
            return;
        }
        if (Number(input.depth || 0) > maxIncludeDepth) {
            addIssue({ type: "max_include_depth", ref: resolved, from, detail: `include depth exceeded ${maxIncludeDepth}` });
            return;
        }
        visiting.add(key);
        let entry;
        try {
            const known = docByFile.get(key);
            entry = (0, group_memory_index_1.buildTypedMemoryLoadEntry)({
                file: resolved,
                kind: input.kind || (known ? "typed_doc" : "include"),
                relPath: known?.relPath || path.relative(dir, resolved).replace(/\\/g, "/"),
                type: known?.type || input.type,
                pathGlobs: known?.paths || input.pathGlobs || [],
                pathCondition: input.pathCondition || pathConditions.get(key) || (0, group_memory_index_1.evaluateTypedMemoryPathCondition)(known || {}, targetPaths),
                targetPaths,
                depth: input.depth || 0,
                parentRelPath: input.parentRelPath || "",
            });
            for (const ref of entry.includeRefs || []) {
                const includePath = (0, group_memory_index_1.resolveTypedMemoryIncludePath)(resolved, ref);
                processFile(includePath, {
                    kind: "include",
                    depth: Number(entry.includeDepth || 0) + 1,
                    parentRelPath: entry.relPath,
                    type: entry.type,
                });
            }
            entries.push(entry);
            processed.add(key);
        }
        catch (error) {
            addIssue({ type: "unreadable_memory_file", ref: resolved, from, detail: error?.message || error });
        }
        finally {
            visiting.delete(key);
        }
    };
    processFile(index.file, { kind: "entrypoint", relPath: group_memory_index_1.GROUP_TYPED_MEMORY_ENTRYPOINT, depth: 0 });
    let conditionalMatched = 0;
    let conditionalSkipped = 0;
    for (const doc of sortedDocs) {
        const condition = pathConditions.get((0, group_memory_index_1.normalizeFileKey)(doc.file)) || (0, group_memory_index_1.evaluateTypedMemoryPathCondition)(doc, targetPaths);
        if (condition.conditional && !condition.matched) {
            conditionalSkipped += 1;
            continue;
        }
        if (condition.conditional && condition.matched)
            conditionalMatched += 1;
        processFile(doc.file, { kind: "typed_doc", relPath: doc.relPath, type: doc.type, depth: 0, pathCondition: condition, targetPaths });
    }
    const boundedEntries = entries.slice(0, maxEntries).map((entry, loadOrder) => ({ ...entry, loadOrder }));
    const entrypointEntry = entries.find(entry => entry.kind === "entrypoint") || null;
    const entryListTruncated = entries.length > boundedEntries.length;
    const entrypointTruncated = entrypointEntry?.entrypointTruncation?.truncated === true;
    const truncated = entryListTruncated || entrypointTruncated;
    const totalBytes = boundedEntries.reduce((sum, entry) => sum + Number(entry.bytes || 0), 0);
    const estimatedTokens = boundedEntries.reduce((sum, entry) => sum + Number(entry.estimatedTokens || 0), 0);
    const byType = boundedEntries.reduce((acc, entry) => {
        const key = String(entry.type || entry.kind || "unknown");
        acc[key] = Number(acc[key] || 0) + 1;
        return acc;
    }, {});
    const status = issues.some(issue => issue.type === "missing_include" || issue.type === "circular_include" || issue.type === "unreadable_memory_file")
        ? "include_warnings"
        : truncated ? "truncated" : "pass";
    return {
        schema: "ccm-group-typed-memory-load-plan-v1",
        version: group_memory_index_1.GROUP_TYPED_MEMORY_LOAD_PLAN_VERSION,
        groupId,
        generatedAt: (0, group_memory_index_1.now)(),
        status,
        pass: status === "pass",
        loadOrderPolicy: "entrypoint_first_then_lower_priority_docs_then_higher_priority_docs; includes_load_before_parent",
        priorityTiers: {
            entrypoint: 0,
            reference: (0, group_memory_index_1.groupTypedMemoryPriority)("reference"),
            project: (0, group_memory_index_1.groupTypedMemoryPriority)("project"),
            feedback: (0, group_memory_index_1.groupTypedMemoryPriority)("feedback"),
            user: (0, group_memory_index_1.groupTypedMemoryPriority)("user"),
        },
        maxEntries,
        maxIncludeDepth,
        targetPaths,
        conditionalMatched,
        conditionalSkipped,
        entryCount: boundedEntries.length,
        totalDiscoveredEntries: entries.length,
        truncated,
        entryListTruncated,
        entrypointTruncated,
        entrypointTruncation: entrypointEntry?.entrypointTruncation || null,
        totalBytes,
        estimatedTokens,
        byType,
        issues,
        indexFile: index.file,
        memoryDir: dir,
        entries: boundedEntries,
    };
}
function renderGroupTypedMemoryLoadPlan(plan) {
    if (!plan?.schema)
        return "";
    const lines = [
        `类型化 MEMORY.md 加载计划：${plan.status || "unknown"}；加载 ${plan.entryCount || 0}/${plan.totalDiscoveredEntries || 0} 项，约 ${plan.estimatedTokens || 0} tokens；条件匹配 ${plan.conditionalMatched || 0}、跳过 ${plan.conditionalSkipped || 0}；策略 ${plan.loadOrderPolicy || "unknown"}。`,
        `- 优先级：entrypoint < reference < project < feedback < user；高优先级记忆在后加载，子 Agent 应优先服从后加载内容。`,
    ];
    if (Array.isArray(plan.targetPaths) && plan.targetPaths.length) {
        lines.push(`- 路径条件目标：${plan.targetPaths.slice(0, 8).join("、")}。`);
    }
    if (Array.isArray(plan.issues) && plan.issues.length) {
        lines.push(`- 加载计划警告：${plan.issues.slice(0, 5).map((issue) => `${issue.type}:${issue.from || "root"}->${issue.ref || ""}`).join("；")}`);
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
function getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId) {
    return require("./group-memory-maintenance").getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId);
}
function conflictResolutionColdArchiveManifestChecksum(manifest = {}) {
    const value = {
        group_id: manifest.group_id || "",
        row_count: Number(manifest.row_count || 0),
        hot_row_count: Number(manifest.hot_row_count || 0),
        rows_checksum: manifest.rows_checksum || "",
        shards: (manifest.shards || []).map((shard) => ({
            bucket: shard.bucket || "",
            rel_path: shard.rel_path || "",
            content_checksum: shard.content_checksum || "",
            row_count: Number(shard.row_count || 0),
            row_ids_checksum: shard.row_ids_checksum || "",
        })),
    };
    if (manifest.generation_number !== undefined
        || manifest.generation_id
        || manifest.previous_manifest_checksum
        || manifest.previous_manifest_rel_path) {
        value.generation_number = Number(manifest.generation_number || 0);
        value.generation_id = manifest.generation_id || "";
        value.previous_manifest_checksum = manifest.previous_manifest_checksum || "";
        value.previous_manifest_rel_path = manifest.previous_manifest_rel_path || "";
    }
    return (0, group_memory_index_1.checksum)(value, 48);
}
function getConflictResolutionColdArchiveManifestGenerationsDir(groupId) {
    return path.join((0, group_memory_index_1.getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveDir)(groupId), "manifests");
}
function getConflictResolutionColdArchiveManifestGenerationFile(groupId, manifestChecksum) {
    return path.join(getConflictResolutionColdArchiveManifestGenerationsDir(groupId), `${(0, group_memory_index_1.safeSegment)(manifestChecksum, "invalid")}.json`);
}
function readConflictResolutionColdArchiveManifest(groupId) {
    const file = getPostCompactCompletionMemoryPreservationClosureConflictResolutionColdArchiveManifestFile(groupId);
    const manifest = (0, group_memory_index_1.readJson)(file, null);
    if (!manifest)
        return null;
    return { ...manifest, file };
}
function readPreviousConflictResolutionColdArchiveManifest(groupId, currentManifest = {}) {
    const checksumValue = String(currentManifest.previous_manifest_checksum || "").trim();
    if (!checksumValue)
        return null;
    const expectedFile = getConflictResolutionColdArchiveManifestGenerationFile(groupId, checksumValue);
    const expectedRelPath = path.relative((0, group_memory_index_1.getGroupTypedMemoryDir)(groupId), expectedFile).split(path.sep).join("/");
    if (String(currentManifest.previous_manifest_rel_path || "") !== expectedRelPath)
        return {
            invalidLink: true,
            expectedFile,
            expectedRelPath,
            actualRelPath: String(currentManifest.previous_manifest_rel_path || ""),
        };
    const manifest = (0, group_memory_index_1.readJson)(expectedFile, null);
    return manifest ? { ...manifest, file: expectedFile } : { missing: true, expectedFile, expectedRelPath };
}
function verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId, options = {}) {
    return require("./group-memory-maintenance").verifyPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestGenerations(groupId, options);
}
function recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration(groupId, options = {}) {
    return require("./group-memory-maintenance").recoverPostCompactCompletionMemoryPreservationClosureConflictResolutionManifestFromGeneration(groupId, options);
}
function recordGroupTypedMemoryRecall(groupId, scope, recall, query = "", options = {}) {
    if (options.disableLedger === true || options.disable_ledger === true || recall?.ignored)
        return (0, group_memory_index_1.readGroupTypedMemoryRecallLedger)(groupId);
    const file = (0, group_memory_index_1.getGroupTypedMemoryRecallLedgerFile)(groupId);
    return (0, atomic_json_file_1.withFileLock)(file, () => (0, group_memory_index_1.recordGroupTypedMemoryRecallUnlocked)(groupId, scope, recall, query, options), {
        timeoutMs: 5_000,
        retryMs: 10,
        staleMs: 60_000,
    });
}
function getGroupTypedMemoryManifestSelectorDecisionDir(scopeId) {
    return path.join((0, group_memory_index_1.getGroupTypedMemoryDir)(scopeId), group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_DECISION_DIR);
}
function getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId) {
    return path.join((0, group_memory_index_1.getGroupTypedMemoryDir)(scopeId), group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_OUTCOME_DIR);
}
function getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId) {
    return path.join((0, group_memory_index_1.getGroupTypedMemoryDir)(scopeId), group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_CONSUMPTION_DIR);
}
function getGroupTypedMemoryManifestSelectorShapeDir(scopeId) {
    return path.join((0, group_memory_index_1.getGroupTypedMemoryDir)(scopeId), group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SHAPE_DIR);
}
function verifyGroupTypedMemoryManifestSelectorOutcome(outcome, expectedScopeId = "", selection = null) {
    const selected = (0, group_memory_index_1.normalizeGroupTypedMemoryOutcomeRelPaths)(outcome?.selectedRelPaths, group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION);
    const recalled = (0, group_memory_index_1.normalizeGroupTypedMemoryOutcomeRelPaths)(outcome?.recalledSelectedRelPaths, group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION);
    const attached = (0, group_memory_index_1.normalizeGroupTypedMemoryOutcomeRelPaths)(outcome?.attachedSelectedRelPaths, group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION);
    const selectedSet = new Set(selected);
    const recalledSet = new Set(recalled);
    const stage = String(outcome?.stage || "");
    const checksumValid = !!outcome && String(outcome.checksum || "") === (0, group_memory_index_1.groupTypedMemoryManifestSelectorOutcomeChecksum)(outcome);
    const selectionValid = !selection || (verifyGroupTypedMemoryManifestSelection(selection, expectedScopeId || String(outcome?.scopeId || "")).valid === true
        && String(outcome?.requestId || "") === String(selection.requestId || "")
        && String(outcome?.selectionChecksum || "") === String(selection.checksum || "")
        && String(outcome?.queryChecksum || "") === String(selection.queryChecksum || "")
        && selected.join("\n") === (0, group_memory_index_1.normalizeGroupTypedMemoryOutcomeRelPaths)(selection.selectedRelPaths, group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION).join("\n"));
    const valid = !!outcome
        && outcome.schema === "ccm-group-typed-memory-manifest-selector-outcome-v1"
        && Number(outcome.version || 0) === group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_OUTCOME_VERSION
        && ["attached", "committed"].includes(stage)
        && (0, group_memory_index_1.isExactGroupTypedMemorySessionScope)(String(outcome.scopeId || ""))
        && (!expectedScopeId || String(outcome.scopeId || "") === expectedScopeId)
        && !!String(outcome.requestId || "")
        && !!String(outcome.selectionChecksum || "")
        && recalled.every((item) => selectedSet.has(item))
        && attached.every((item) => recalledSet.has(item))
        && (stage !== "committed" || !!String(outcome.attachedOutcomeChecksum || ""))
        && checksumValid
        && selectionValid;
    return {
        valid,
        checksumValid,
        scopeValid: !expectedScopeId || String(outcome?.scopeId || "") === expectedScopeId,
        selectionValid,
        stage,
        selectedCount: selected.length,
        recalledCount: recalled.length,
        attachedCount: attached.length,
    };
}
function recordGroupTypedMemoryManifestSelectorOutcome(scopeId, selection, input = {}) {
    const selectionVerification = verifyGroupTypedMemoryManifestSelection(selection, scopeId);
    if (!selectionVerification.valid)
        throw new Error("typed_memory_manifest_selector_outcome_selection_invalid");
    const stage = String(input.stage || "attached");
    if (!["attached", "committed"].includes(stage))
        throw new Error("typed_memory_manifest_selector_outcome_stage_invalid");
    const selectedRelPaths = (0, group_memory_index_1.normalizeGroupTypedMemoryOutcomeRelPaths)(selection.selectedRelPaths, group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION);
    const selectedSet = new Set(selectedRelPaths);
    let recalledSelectedRelPaths = (0, group_memory_index_1.normalizeGroupTypedMemoryOutcomeRelPaths)(input.recalledRelPaths || input.recalled_rel_paths, group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_FILES)
        .filter((item) => selectedSet.has(item));
    let recalledSet = new Set(recalledSelectedRelPaths);
    let attachedSelectedRelPaths = (0, group_memory_index_1.normalizeGroupTypedMemoryOutcomeRelPaths)(input.attachedRelPaths || input.attached_rel_paths, group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_FILES)
        .filter((item) => recalledSet.has(item));
    const requestId = String(selection.requestId || "");
    const dir = path.resolve(getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId));
    fs.mkdirSync(dir, { recursive: true });
    const attachedFile = path.resolve(dir, `${(0, group_memory_index_1.safeSegment)(requestId, "selection")}.attached.json`);
    const outcomeFile = path.resolve(dir, `${(0, group_memory_index_1.safeSegment)(requestId, "selection")}.${stage}.json`);
    if (path.dirname(outcomeFile).toLowerCase() !== dir.toLowerCase())
        throw new Error("typed_memory_manifest_selector_outcome_path_invalid");
    let attachedOutcome = input.attachedOutcome || input.attached_outcome || null;
    if (stage === "committed" && !attachedOutcome) {
        try {
            attachedOutcome = JSON.parse(fs.readFileSync(attachedFile, "utf-8"));
        }
        catch { }
    }
    if (stage === "committed") {
        const attachedVerification = verifyGroupTypedMemoryManifestSelectorOutcome(attachedOutcome, scopeId, selection);
        if (!attachedVerification.valid || attachedVerification.stage !== "attached") {
            throw new Error("typed_memory_manifest_selector_attached_outcome_invalid");
        }
        if (String(attachedOutcome.capsuleChecksum || "") !== String(input.capsuleChecksum || input.capsule_checksum || "")) {
            throw new Error("typed_memory_manifest_selector_outcome_capsule_mismatch");
        }
        recalledSelectedRelPaths = (0, group_memory_index_1.normalizeGroupTypedMemoryOutcomeRelPaths)(attachedOutcome.recalledSelectedRelPaths, group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION);
        recalledSet = new Set(recalledSelectedRelPaths);
        attachedSelectedRelPaths = (0, group_memory_index_1.normalizeGroupTypedMemoryOutcomeRelPaths)(attachedOutcome.attachedSelectedRelPaths, group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION);
    }
    const core = {
        schema: "ccm-group-typed-memory-manifest-selector-outcome-v1",
        version: group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_OUTCOME_VERSION,
        scopeId,
        requestId,
        stage,
        selectionStatus: String(selection.status || ""),
        selectionChecksum: String(selection.checksum || ""),
        queryChecksum: String(selection.queryChecksum || ""),
        manifestChecksum: String(selection.manifestChecksum || ""),
        selectedRelPaths,
        recalledSelectedRelPaths,
        attachedSelectedRelPaths,
        selectedNotRecalledRelPaths: selectedRelPaths.filter((item) => !recalledSet.has(item)),
        recalledNotAttachedRelPaths: recalledSelectedRelPaths.filter((item) => !attachedSelectedRelPaths.includes(item)),
        capsuleChecksum: String(input.capsuleChecksum || input.capsule_checksum || ""),
        attachedOutcomeChecksum: stage === "committed" ? String(attachedOutcome?.checksum || "") : "",
        deliveryLeaseId: String(input.deliveryLeaseId || input.delivery_lease_id || ""),
        dispatchTicketChecksum: String(input.dispatchTicketChecksum || input.dispatch_ticket_checksum || ""),
        deliveryReceiptChecksum: String(input.deliveryReceiptChecksum || input.delivery_receipt_checksum || ""),
        memoryContextSnapshotId: String(input.memoryContextSnapshotId || input.memory_context_snapshot_id || ""),
        memoryContextSnapshotChecksum: String(input.memoryContextSnapshotChecksum || input.memory_context_snapshot_checksum || ""),
        workerContextPacketId: String(input.workerContextPacketId || input.worker_context_packet_id || ""),
        taskId: String(input.taskId || input.task_id || ""),
        taskAgentSessionId: String(input.taskAgentSessionId || input.task_agent_session_id || ""),
        targetProject: String(input.targetProject || input.target_project || ""),
        recorded: input.recordOutcome !== false && input.record_outcome !== false,
        createdAt: String(input.createdAt || input.created_at || (0, group_memory_index_1.now)()),
    };
    const outcome = { ...core, checksum: (0, group_memory_index_1.groupTypedMemoryManifestSelectorOutcomeChecksum)(core) };
    const verification = verifyGroupTypedMemoryManifestSelectorOutcome(outcome, scopeId, selection);
    if (!verification.valid)
        throw new Error("typed_memory_manifest_selector_outcome_invalid");
    if (outcome.recorded !== true)
        return outcome;
    if (fs.existsSync(outcomeFile)) {
        try {
            const existing = JSON.parse(fs.readFileSync(outcomeFile, "utf-8"));
            if (verifyGroupTypedMemoryManifestSelectorOutcome(existing, scopeId, selection).valid
                && String(existing.stage || "") === stage
                && String(existing.selectionChecksum || "") === String(outcome.selectionChecksum || "")
                && String(existing.capsuleChecksum || "") === String(outcome.capsuleChecksum || "")
                && String(existing.attachedOutcomeChecksum || "") === String(outcome.attachedOutcomeChecksum || "")
                && String(existing.taskId || "") === String(outcome.taskId || "")
                && String(existing.taskAgentSessionId || "") === String(outcome.taskAgentSessionId || "")
                && String(existing.memoryContextSnapshotId || "") === String(outcome.memoryContextSnapshotId || "")
                && String(existing.memoryContextSnapshotChecksum || "") === String(outcome.memoryContextSnapshotChecksum || "")
                && JSON.stringify(existing.selectedRelPaths || []) === JSON.stringify(outcome.selectedRelPaths || [])
                && JSON.stringify(existing.recalledSelectedRelPaths || []) === JSON.stringify(outcome.recalledSelectedRelPaths || [])
                && JSON.stringify(existing.attachedSelectedRelPaths || []) === JSON.stringify(outcome.attachedSelectedRelPaths || [])) {
                return { ...existing, outcomeFile };
            }
        }
        catch { }
        throw new Error("typed_memory_manifest_selector_outcome_conflict");
    }
    (0, group_memory_index_1.writeTextAtomicRaw)(outcomeFile, JSON.stringify(outcome, null, 2));
    return { ...outcome, outcomeFile };
}
function verifyGroupTypedMemoryManifestSelectorConsumptionOutcome(consumption, expectedScopeId = "", committedOutcome = null) {
    const documents = Array.isArray(consumption?.documents) ? consumption.documents : [];
    const relPaths = documents.map((row) => String(row?.relPath || ""));
    const attachedRelPaths = (0, group_memory_index_1.normalizeGroupTypedMemoryOutcomeRelPaths)(committedOutcome?.attachedSelectedRelPaths, group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION);
    const attached = new Set(attachedRelPaths);
    const documentsCoverAttached = !committedOutcome
        || relPaths.map((item) => item.toLowerCase()).sort().join("\n") === attachedRelPaths.map((item) => item.toLowerCase()).sort().join("\n");
    const checksumValid = !!consumption && String(consumption.checksum || "") === (0, group_memory_index_1.groupTypedMemoryManifestSelectorConsumptionChecksum)(consumption);
    const statesValid = documents.every((row) => typeof row?.relPath === "string"
        && path.basename(row.relPath) === row.relPath
        && row.relPath.toLowerCase().endsWith(".md")
        && ["verified", "used", "ignored", "unreported"].includes(String(row.usageState || "")));
    const committedValid = !committedOutcome || (verifyGroupTypedMemoryManifestSelectorOutcome(committedOutcome, expectedScopeId || String(consumption?.scopeId || "")).valid === true
        && committedOutcome.stage === "committed"
        && String(consumption?.requestId || "") === String(committedOutcome.requestId || "")
        && String(consumption?.committedOutcomeChecksum || "") === String(committedOutcome.checksum || "")
        && String(consumption?.selectionChecksum || "") === String(committedOutcome.selectionChecksum || "")
        && String(consumption?.capsuleChecksum || "") === String(committedOutcome.capsuleChecksum || "")
        && relPaths.every((relPath) => attached.has(relPath))
        && documentsCoverAttached);
    const valid = !!consumption
        && consumption.schema === "ccm-group-typed-memory-manifest-selector-consumption-outcome-v1"
        && Number(consumption.version || 0) === group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_CONSUMPTION_VERSION
        && (0, group_memory_index_1.isExactGroupTypedMemorySessionScope)(String(consumption.scopeId || ""))
        && (!expectedScopeId || String(consumption.scopeId || "") === expectedScopeId)
        && !!String(consumption.requestId || "")
        && !!String(consumption.committedOutcomeChecksum || "")
        && documents.length <= group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION
        && new Set(relPaths).size === relPaths.length
        && statesValid
        && checksumValid
        && committedValid;
    return {
        valid,
        checksumValid,
        scopeValid: !expectedScopeId || String(consumption?.scopeId || "") === expectedScopeId,
        committedValid,
        statesValid,
        documentsCoverAttached,
        receiptBindingValid: consumption?.receiptBindingValid === true,
        documentCount: documents.length,
    };
}
function recordGroupTypedMemoryManifestSelectorConsumptionOutcomes(scopeId, input = {}) {
    if (!(0, group_memory_index_1.isExactGroupTypedMemorySessionScope)(scopeId))
        return { recordedCount: 0, reason: "exact_group_gcs_scope_required", outcomes: [] };
    const taskId = String(input.taskId || input.task_id || "");
    const targetProject = String(input.targetProject || input.target_project || "").trim().toLowerCase();
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const receipts = Array.isArray(input.receipts) ? input.receipts : [];
    const committedDir = getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId);
    let committedFiles = [];
    try {
        committedFiles = fs.readdirSync(committedDir).filter(name => name.endsWith(".committed.json")).map(name => path.join(committedDir, name));
    }
    catch { }
    const outcomes = [];
    let skippedCount = 0;
    for (const committedFile of committedFiles) {
        let requestId = "";
        try {
            requestId = String(JSON.parse(fs.readFileSync(committedFile, "utf-8"))?.requestId || "");
        }
        catch { }
        if (!requestId) {
            skippedCount += 1;
            continue;
        }
        const chain = (0, group_memory_index_1.readGroupTypedMemoryManifestSelectorChain)(scopeId, requestId);
        if (!chain.valid) {
            skippedCount += 1;
            continue;
        }
        const committed = chain.committed;
        if (taskId && String(committed.taskId || "") !== taskId)
            continue;
        if (targetProject && String(committed.targetProject || "").trim().toLowerCase() !== targetProject)
            continue;
        const taskAgentSessionId = String(committed.taskAgentSessionId || "");
        const attachedRelPaths = (0, group_memory_index_1.normalizeGroupTypedMemoryOutcomeRelPaths)(committed.attachedSelectedRelPaths, group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION);
        if (!attachedRelPaths.length)
            continue;
        const matchingRows = rows.filter((row) => {
            if (String(row.task_agent_session_id || row.taskAgentSessionId || "") !== taskAgentSessionId)
                return false;
            const rowProject = String(row.target_project || row.targetProject || "").trim().toLowerCase();
            if (targetProject && rowProject && rowProject !== targetProject)
                return false;
            const expectedReceiptChecksum = String(committed.deliveryReceiptChecksum || "");
            const rowReceiptChecksum = String(row.delivery_receipt_checksum || row.deliveryReceiptChecksum || "");
            return !expectedReceiptChecksum || !rowReceiptChecksum || expectedReceiptChecksum === rowReceiptChecksum;
        });
        if (!matchingRows.length)
            continue;
        const rowReceiptEvidenceChecksums = new Set(matchingRows
            .map((row) => String(row.receipt_evidence_checksum || row.receiptEvidenceChecksum || ""))
            .filter(Boolean));
        const matchingReceipts = receipts.filter((receipt) => {
            if (String(receipt.task_agent_session_id || receipt.taskAgentSessionId || "") === taskAgentSessionId)
                return true;
            const evidenceChecksum = (0, group_memory_index_1.checksum)(JSON.stringify({
                typedMemoryUsage: receipt.typedMemoryUsage || receipt.typed_memory_usage || [],
                memoryUsed: receipt.memoryUsed || receipt.memory_used || [],
                memoryIgnored: receipt.memoryIgnored || receipt.memory_ignored || [],
                memoryContextUsage: receipt.memoryContextUsage || receipt.memory_context_usage || receipt.agentMemoryContextUsage || receipt.agent_memory_context_usage || null,
            }), 64);
            return rowReceiptEvidenceChecksums.has(evidenceChecksum);
        });
        const documentRows = attachedRelPaths.map((relPath) => {
            const candidates = matchingRows.filter((row) => String(row.rel_path || row.relPath || "").toLowerCase() === relPath.toLowerCase());
            const states = (0, group_memory_index_1.uniqueStrings)(candidates.map((row) => (0, group_memory_index_1.normalizeTypedMemoryConsumptionUsageState)(row.usage_state || row.usageState))).filter(Boolean);
            const source = candidates[0] || {};
            const declaredUsageState = states.length === 1 && ["verified", "used", "ignored"].includes(states[0]) ? states[0] : "unreported";
            const verifiedProofValid = source.current_source_verified === true || source.currentSourceVerified === true
                ? (source.current_source_proof_valid === true || source.currentSourceProofValid === true)
                    && String(source.evidence_tier || source.evidenceTier || "") === "system_current_source_file_proof"
                : false;
            const usageState = declaredUsageState === "verified" && !verifiedProofValid ? "used" : declaredUsageState;
            return {
                relPath,
                usageState,
                claimedUsageState: String(source.claimed_usage_state || source.claimedUsageState || declaredUsageState),
                currentSourceVerified: usageState === "verified" && verifiedProofValid,
                directReference: source.direct_reference === true || source.directReference === true,
                evidenceTier: String(source.evidence_tier || source.evidenceTier || (usageState === "unreported" ? "snapshot_surfaced_only" : "")),
                evidenceConfidence: Number(source.evidence_confidence ?? source.evidenceConfidence ?? (usageState === "unreported" ? 0.25 : 0)),
                receiptEvidenceChecksum: String(source.receipt_evidence_checksum || source.receiptEvidenceChecksum || ""),
                reason: (0, group_memory_index_1.compactText)(source.reason || (usageState === "unreported" ? "valid bound receipt omitted per-relPath usage declaration" : ""), 500),
                anomalyCodes: (0, group_memory_index_1.uniqueStrings)([
                    ...(Array.isArray(source.anomaly_codes || source.anomalyCodes) ? (source.anomaly_codes || source.anomalyCodes) : []),
                    ...(states.length > 1 ? ["conflicting_usage_states"] : []),
                    ...(declaredUsageState === "verified" && !verifiedProofValid ? ["verified_without_system_current_source_proof"] : []),
                ]).slice(0, 12),
            };
        });
        const structuredClaimedRelPaths = (0, group_memory_index_1.uniqueStrings)(matchingReceipts.flatMap((receipt) => {
            const usage = receipt.typedMemoryUsage || receipt.typed_memory_usage || [];
            return Array.isArray(usage) ? usage.map((row) => String(row?.relPath || row?.rel_path || row?.path || "").trim()) : [];
        }).filter(Boolean), 120);
        const attachedSet = new Set(attachedRelPaths.map(item => item.toLowerCase()));
        const unexpectedClaimedRelPaths = structuredClaimedRelPaths.filter(item => !attachedSet.has(item.toLowerCase()));
        const firstRow = matchingRows[0] || {};
        const snapshotId = String(firstRow.memory_context_snapshot_id || firstRow.memoryContextSnapshotId || "");
        const snapshotChecksum = String(firstRow.memory_context_snapshot_checksum || firstRow.memoryContextSnapshotChecksum || "");
        const deliveryReceiptChecksum = String(firstRow.delivery_receipt_checksum || firstRow.deliveryReceiptChecksum || "");
        const receiptEvidenceChecksum = (0, group_memory_index_1.checksum)(matchingRows.map((row) => String(row.receipt_evidence_checksum || row.receiptEvidenceChecksum || "")), 64);
        const receiptBindingValid = !!snapshotId && !!snapshotChecksum && !!deliveryReceiptChecksum
            && !!String(committed.memoryContextSnapshotId || "")
            && !!String(committed.memoryContextSnapshotChecksum || "")
            && !!String(committed.deliveryReceiptChecksum || "")
            && String(committed.memoryContextSnapshotId) === snapshotId
            && String(committed.memoryContextSnapshotChecksum) === snapshotChecksum
            && String(committed.deliveryReceiptChecksum) === deliveryReceiptChecksum;
        const core = {
            schema: "ccm-group-typed-memory-manifest-selector-consumption-outcome-v1",
            version: group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_CONSUMPTION_VERSION,
            scopeId,
            requestId,
            committedOutcomeChecksum: String(committed.checksum || ""),
            selectionChecksum: String(committed.selectionChecksum || ""),
            capsuleChecksum: String(committed.capsuleChecksum || ""),
            taskId: String(committed.taskId || ""),
            taskAgentSessionId,
            targetProject: String(committed.targetProject || ""),
            memoryContextSnapshotId: snapshotId,
            memoryContextSnapshotChecksum: snapshotChecksum,
            deliveryReceiptChecksum,
            receiptEvidenceChecksum,
            receiptBindingValid,
            documents: documentRows,
            unexpectedClaimedRelPaths,
            recordedAt: String(input.generatedAt || input.generated_at || (0, group_memory_index_1.now)()),
        };
        const consumption = { ...core, checksum: (0, group_memory_index_1.groupTypedMemoryManifestSelectorConsumptionChecksum)(core) };
        if (!verifyGroupTypedMemoryManifestSelectorConsumptionOutcome(consumption, scopeId, committed).valid) {
            skippedCount += 1;
            continue;
        }
        const dir = path.resolve(getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId));
        fs.mkdirSync(dir, { recursive: true });
        const eventId = (0, group_memory_index_1.checksum)([requestId, snapshotId, deliveryReceiptChecksum, receiptEvidenceChecksum], 20);
        const file = path.resolve(dir, `${(0, group_memory_index_1.safeSegment)(requestId)}.${eventId}.json`);
        if (path.dirname(file).toLowerCase() !== dir.toLowerCase()) {
            skippedCount += 1;
            continue;
        }
        const contributeTrend = (value) => {
            try {
                return {
                    value: (0, group_memory_index_1.recordGroupTypedMemoryShapeTrendContribution)(scopeId, {
                        kind: "consumption",
                        eventKey: value.checksum,
                        recordedAt: value.recordedAt,
                        metrics: {
                            documents: value.documents || [],
                            receiptBindingValid: value.receiptBindingValid === true,
                            unexpectedClaimCount: Number(value.unexpectedClaimedRelPaths?.length || 0),
                        },
                    }),
                    error: "",
                };
            }
            catch (error) {
                return { value: null, error: (0, group_memory_index_1.compactText)(error?.message || error, 240) };
            }
        };
        if (fs.existsSync(file)) {
            try {
                const existing = JSON.parse(fs.readFileSync(file, "utf-8"));
                if (verifyGroupTypedMemoryManifestSelectorConsumptionOutcome(existing, scopeId, committed).valid) {
                    const trend = contributeTrend(existing);
                    outcomes.push({ ...existing, consumptionFile: file, idempotent: true, trendContribution: trend.value, trendContributionError: trend.error });
                    continue;
                }
            }
            catch { }
            skippedCount += 1;
            continue;
        }
        (0, group_memory_index_1.writeTextAtomicRaw)(file, JSON.stringify(consumption, null, 2));
        const trend = contributeTrend(consumption);
        outcomes.push({ ...consumption, consumptionFile: file, idempotent: false, trendContribution: trend.value, trendContributionError: trend.error });
    }
    return {
        schema: "ccm-group-typed-memory-manifest-selector-consumption-record-v1",
        version: 1,
        scopeId,
        recordedCount: outcomes.filter(row => row.idempotent !== true).length,
        idempotentCount: outcomes.filter(row => row.idempotent === true).length,
        skippedCount,
        outcomes,
    };
}
function summarizeGroupTypedMemoryManifestSelectorConsumption(scopeId, options = {}) {
    const dir = getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId);
    const rows = [];
    let unreadableCount = 0;
    try {
        for (const name of fs.readdirSync(dir).filter(name => name.endsWith(".json"))) {
            const file = path.join(dir, name);
            try {
                const consumption = JSON.parse(fs.readFileSync(file, "utf-8"));
                const chain = (0, group_memory_index_1.readGroupTypedMemoryManifestSelectorChain)(scopeId, String(consumption.requestId || ""));
                const verification = verifyGroupTypedMemoryManifestSelectorConsumptionOutcome(consumption, scopeId, chain.committed);
                rows.push({ ...consumption, consumptionFile: file, valid: chain.valid === true && verification.valid === true });
            }
            catch {
                unreadableCount += 1;
            }
        }
    }
    catch { }
    rows.sort((a, b) => String(b.recordedAt || "").localeCompare(String(a.recordedAt || "")) || String(b.checksum || "").localeCompare(String(a.checksum || "")));
    const validRows = rows.filter(row => row.valid === true);
    const latestByRequestId = new Map();
    for (const row of validRows)
        if (!latestByRequestId.has(String(row.requestId || "")))
            latestByRequestId.set(String(row.requestId || ""), row);
    const latestRows = [...latestByRequestId.values()];
    const documents = latestRows.flatMap(row => row.documents || []);
    const consumedRequestIds = new Set(latestRows.map(row => String(row.requestId || "")));
    const committedRows = [];
    try {
        for (const name of fs.readdirSync(getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId)).filter(name => name.endsWith(".committed.json"))) {
            try {
                const committed = JSON.parse(fs.readFileSync(path.join(getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId), name), "utf-8"));
                const chain = (0, group_memory_index_1.readGroupTypedMemoryManifestSelectorChain)(scopeId, String(committed.requestId || ""));
                if (chain.valid && (chain.committed.attachedSelectedRelPaths || []).length > 0)
                    committedRows.push(chain.committed);
            }
            catch { }
        }
    }
    catch { }
    const nowMs = Number(options.nowMs || options.now_ms || Date.now());
    const staleAfterMs = Math.max(1_000, Number(options.staleAfterMs || options.stale_after_ms || 5 * 60_000));
    const staleCommittedWithoutConsumptionCount = committedRows.filter(row => {
        if (consumedRequestIds.has(String(row.requestId || "")))
            return false;
        const createdMs = Date.parse(String(row.createdAt || ""));
        return Number.isFinite(createdMs) && nowMs - createdMs >= staleAfterMs;
    }).length;
    const invalidOutcomeCount = rows.filter(row => row.valid !== true).length + unreadableCount;
    const weakReceiptBindingCount = latestRows.filter(row => row.receiptBindingValid !== true).length;
    const unexpectedClaimCount = latestRows.reduce((sum, row) => sum + Number(row.unexpectedClaimedRelPaths?.length || 0), 0);
    const unreportedDocumentCount = documents.filter(row => row.usageState === "unreported").length;
    return {
        schema: "ccm-group-typed-memory-manifest-selector-consumption-summary-v1",
        version: 1,
        scopeId,
        dir,
        present: rows.length > 0 || unreadableCount > 0,
        valid: invalidOutcomeCount === 0,
        closureValid: invalidOutcomeCount === 0 && weakReceiptBindingCount === 0 && unexpectedClaimCount === 0 && unreportedDocumentCount === 0 && staleCommittedWithoutConsumptionCount === 0,
        outcomeCount: rows.length + unreadableCount,
        validOutcomeCount: validRows.length,
        invalidOutcomeCount,
        consumedDeliveryCount: latestRows.length,
        deliveredDocumentCount: documents.length,
        usedDocumentCount: documents.filter(row => row.usageState === "used").length,
        verifiedDocumentCount: documents.filter(row => row.usageState === "verified").length,
        ignoredDocumentCount: documents.filter(row => row.usageState === "ignored").length,
        unreportedDocumentCount,
        weakReceiptBindingCount,
        unexpectedClaimCount,
        staleCommittedWithoutConsumptionCount,
        committedWithoutConsumptionCount: committedRows.filter(row => !consumedRequestIds.has(String(row.requestId || ""))).length,
        closureGapCount: invalidOutcomeCount + weakReceiptBindingCount + unexpectedClaimCount + unreportedDocumentCount + staleCommittedWithoutConsumptionCount,
        latest: latestRows[0] ? {
            requestId: String(latestRows[0].requestId || ""),
            valid: latestRows[0].valid === true,
            receiptBindingValid: latestRows[0].receiptBindingValid === true,
            usedCount: (latestRows[0].documents || []).filter((row) => row.usageState === "used").length,
            verifiedCount: (latestRows[0].documents || []).filter((row) => row.usageState === "verified").length,
            ignoredCount: (latestRows[0].documents || []).filter((row) => row.usageState === "ignored").length,
            unreportedCount: (latestRows[0].documents || []).filter((row) => row.usageState === "unreported").length,
            recordedAt: String(latestRows[0].recordedAt || ""),
        } : null,
        rows: options.includeRows === true ? rows : undefined,
    };
}
function verifyGroupTypedMemoryManifestSelectorCalibration(calibration, expectedScopeId = "", expectedQueryChecksum = "") {
    const hints = Array.isArray(calibration?.hints) ? calibration.hints : [];
    const checksumValid = !!calibration
        && String(calibration.checksum || "") === (0, group_memory_index_1.groupTypedMemoryManifestSelectorCalibrationChecksum)(calibration);
    const hintsValid = hints.length <= 12 && hints.every((hint) => typeof hint?.relPath === "string"
        && path.basename(hint.relPath) === hint.relPath
        && hint.relPath.toLowerCase().endsWith(".md")
        && ["support", "caution", "mixed"].includes(String(hint.calibration || ""))
        && Number(hint.evidenceCount || 0) > 0
        && Number(hint.strongReceiptCount || 0) === Number(hint.evidenceCount || 0));
    const valid = !!calibration
        && calibration.schema === "ccm-group-typed-memory-manifest-selector-calibration-v1"
        && Number(calibration.version || 0) === 1
        && calibration.advisoryOnly === true
        && calibration.autoSuppression === false
        && calibration.crossSessionReuse === false
        && calibration.validScope === true
        && (0, group_memory_index_1.isExactGroupTypedMemorySessionScope)(String(calibration.scopeId || ""))
        && (!expectedScopeId || String(calibration.scopeId || "") === expectedScopeId)
        && !!String(calibration.queryChecksum || "")
        && (!expectedQueryChecksum || String(calibration.queryChecksum || "") === expectedQueryChecksum)
        && new Set(hints.map((hint) => String(hint.relPath || "").toLowerCase())).size === hints.length
        && hintsValid
        && checksumValid;
    return {
        valid,
        checksumValid,
        scopeValid: !expectedScopeId || String(calibration?.scopeId || "") === expectedScopeId,
        queryValid: !expectedQueryChecksum || String(calibration?.queryChecksum || "") === expectedQueryChecksum,
        hintsValid,
        hintCount: hints.length,
    };
}
function buildGroupTypedMemoryManifestSelectorCalibration(scopeId, query, options = {}) {
    const requestedNowMs = Number(options.nowMs || options.now_ms || Date.now());
    const nowMs = Number.isFinite(requestedNowMs) ? requestedNowMs : Date.now();
    const generatedAt = String(options.generatedAt || options.generated_at || new Date(nowMs).toISOString());
    const queryChecksum = (0, group_memory_index_1.checksum)(String(query || ""), 64);
    const lookbackDays = Math.max(1, Math.min(180, Number(options.lookbackDays || options.lookback_days || 30)));
    const halfLifeDays = Math.max(1, Math.min(90, Number(options.halfLifeDays || options.half_life_days || 14)));
    const maxHints = Math.max(1, Math.min(12, Number(options.maxHints || options.max_hints || 12)));
    const candidateRelPaths = new Set((options.candidateRelPaths || options.candidate_rel_paths || [])
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean));
    const base = {
        schema: "ccm-group-typed-memory-manifest-selector-calibration-v1",
        version: 1,
        scopeId,
        queryChecksum,
        advisoryOnly: true,
        autoSuppression: false,
        crossSessionReuse: false,
        evidencePolicy: "exact_session_exact_query_strong_receipt_latest_per_request",
        lookbackDays,
        halfLifeDays,
        candidateBound: candidateRelPaths.size > 0,
        candidateCount: candidateRelPaths.size,
        generatedAt,
    };
    if (!(0, group_memory_index_1.isExactGroupTypedMemorySessionScope)(scopeId)) {
        const core = { ...base, validScope: false, evidenceCount: 0, excludedCount: 0, hintCount: 0, hints: [] };
        return { ...core, checksum: (0, group_memory_index_1.groupTypedMemoryManifestSelectorCalibrationChecksum)(core) };
    }
    const rows = [];
    let excludedCount = 0;
    const exclusionCounts = {};
    const exclude = (reason) => {
        excludedCount += 1;
        exclusionCounts[reason] = Number(exclusionCounts[reason] || 0) + 1;
    };
    try {
        for (const name of fs.readdirSync(getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId)).filter(name => name.endsWith(".json"))) {
            try {
                const consumption = JSON.parse(fs.readFileSync(path.join(getGroupTypedMemoryManifestSelectorConsumptionDir(scopeId), name), "utf-8"));
                const chain = (0, group_memory_index_1.readGroupTypedMemoryManifestSelectorChain)(scopeId, String(consumption.requestId || ""));
                const verified = chain.valid === true
                    && verifyGroupTypedMemoryManifestSelectorConsumptionOutcome(consumption, scopeId, chain.committed).valid === true;
                if (!verified) {
                    exclude("invalid_chain_or_outcome");
                    continue;
                }
                if (consumption.receiptBindingValid !== true) {
                    exclude("weak_receipt_binding");
                    continue;
                }
                if (Number(consumption.unexpectedClaimedRelPaths?.length || 0) > 0) {
                    exclude("unexpected_claim");
                    continue;
                }
                if (String(chain.selection?.queryChecksum || "") !== queryChecksum) {
                    exclude("query_mismatch");
                    continue;
                }
                rows.push({ ...consumption, selection: chain.selection });
            }
            catch {
                exclude("unreadable");
            }
        }
    }
    catch { }
    rows.sort((a, b) => String(b.recordedAt || "").localeCompare(String(a.recordedAt || "")) || String(b.checksum || "").localeCompare(String(a.checksum || "")));
    const latestByRequestId = new Map();
    for (const row of rows)
        if (!latestByRequestId.has(String(row.requestId || "")))
            latestByRequestId.set(String(row.requestId || ""), row);
    const aggregates = new Map();
    let evidenceCount = 0;
    for (const row of latestByRequestId.values()) {
        const recordedMs = Date.parse(String(row.recordedAt || ""));
        if (!Number.isFinite(recordedMs)) {
            exclude("recorded_at_invalid");
            continue;
        }
        const ageDays = Math.max(0, (nowMs - recordedMs) / 86_400_000);
        if (ageDays > lookbackDays) {
            exclude("outside_lookback");
            continue;
        }
        const decayWeight = Math.pow(0.5, ageDays / halfLifeDays);
        for (const document of Array.isArray(row.documents) ? row.documents : []) {
            const relPath = String(document.relPath || "");
            const relKey = relPath.toLowerCase();
            const usageState = String(document.usageState || "");
            if (!relPath || !["used", "verified", "ignored"].includes(usageState))
                continue;
            if (candidateRelPaths.size > 0 && !candidateRelPaths.has(relKey))
                continue;
            const current = aggregates.get(relKey) || {
                relPath,
                usedCount: 0,
                verifiedCount: 0,
                ignoredCount: 0,
                evidenceCount: 0,
                strongReceiptCount: 0,
                weightedUsed: 0,
                weightedVerified: 0,
                weightedIgnored: 0,
                lastObservedAt: "",
            };
            current[`${usageState}Count`] = Number(current[`${usageState}Count`] || 0) + 1;
            current[`weighted${usageState[0].toUpperCase()}${usageState.slice(1)}`] = Number(current[`weighted${usageState[0].toUpperCase()}${usageState.slice(1)}`] || 0) + decayWeight;
            current.evidenceCount += 1;
            current.strongReceiptCount += 1;
            if (!current.lastObservedAt || String(row.recordedAt || "") > current.lastObservedAt)
                current.lastObservedAt = String(row.recordedAt || "");
            aggregates.set(relKey, current);
            evidenceCount += 1;
        }
    }
    const hints = [...aggregates.values()].map((row) => {
        const weightedUseful = Number(row.weightedUsed || 0) + Number(row.weightedVerified || 0) * 1.5;
        const weightedIgnored = Number(row.weightedIgnored || 0);
        const calibration = weightedUseful >= 0.5 && weightedUseful >= weightedIgnored
            ? "support"
            : Number(row.ignoredCount || 0) >= 2 && weightedIgnored > weightedUseful * 1.5
                ? "caution"
                : "mixed";
        return {
            relPath: row.relPath,
            calibration,
            evidenceCount: Number(row.evidenceCount || 0),
            strongReceiptCount: Number(row.strongReceiptCount || 0),
            usedCount: Number(row.usedCount || 0),
            verifiedCount: Number(row.verifiedCount || 0),
            ignoredCount: Number(row.ignoredCount || 0),
            weightedUseful: Number(weightedUseful.toFixed(6)),
            weightedIgnored: Number(weightedIgnored.toFixed(6)),
            lastObservedAt: String(row.lastObservedAt || ""),
        };
    }).sort((a, b) => Number(b.weightedUseful + b.weightedIgnored) - Number(a.weightedUseful + a.weightedIgnored)
        || String(b.lastObservedAt || "").localeCompare(String(a.lastObservedAt || ""))
        || String(a.relPath || "").localeCompare(String(b.relPath || "")))
        .slice(0, maxHints);
    const core = {
        ...base,
        validScope: true,
        evidenceCount,
        excludedCount,
        exclusionCounts,
        hintCount: hints.length,
        supportHintCount: hints.filter((hint) => hint.calibration === "support").length,
        cautionHintCount: hints.filter((hint) => hint.calibration === "caution").length,
        mixedHintCount: hints.filter((hint) => hint.calibration === "mixed").length,
        hints,
    };
    return { ...core, checksum: (0, group_memory_index_1.groupTypedMemoryManifestSelectorCalibrationChecksum)(core) };
}
function verifyGroupTypedMemoryManifestSelectorShape(shape, expectedScopeId = "", decision = null) {
    const checksumValid = !!shape && String(shape.checksum || "") === (0, group_memory_index_1.groupTypedMemoryManifestSelectorShapeChecksum)(shape);
    const decisionValid = !decision || (verifyGroupTypedMemoryManifestSelection(decision, expectedScopeId || String(shape?.scopeId || "")).valid === true
        && String(shape?.requestId || "") === String(decision.requestId || "")
        && String(shape?.decisionChecksum || "") === String(decision.checksum || "")
        && String(shape?.queryChecksum || "") === String(decision.queryChecksum || "")
        && String(shape?.manifestChecksum || "") === String(decision.manifestChecksum || "")
        && Number(shape?.candidateCount || 0) === Number(decision.candidateCount || 0)
        && Number(shape?.selectedCount || 0) === Number(decision.selectedRelPaths?.length || 0));
    const candidateCount = Number(shape?.candidateCount || 0);
    const selectedCount = Number(shape?.selectedCount || 0);
    const expectedRate = candidateCount > 0 ? Number((selectedCount / candidateCount).toFixed(6)) : 0;
    const selectedAge = shape?.selectedAgeDays || {};
    const selectedAgeSentinelValid = selectedCount > 0
        ? [selectedAge.newest, selectedAge.oldest, selectedAge.average].every((value) => Number(value) >= 0)
        : Number(selectedAge.newest) === -1 && Number(selectedAge.oldest) === -1 && Number(selectedAge.average) === -1;
    const valid = !!shape
        && shape.schema === "ccm-group-typed-memory-manifest-selector-shape-v1"
        && Number(shape.version || 0) === group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SHAPE_VERSION
        && shape.selectorRan === true
        && (0, group_memory_index_1.isExactGroupTypedMemorySessionScope)(String(shape.scopeId || ""))
        && (!expectedScopeId || String(shape.scopeId || "") === expectedScopeId)
        && !!String(shape.requestId || "")
        && !!String(shape.decisionChecksum || "")
        && candidateCount > 0
        && selectedCount >= 0
        && selectedCount <= Math.min(candidateCount, group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION)
        && Number(shape.selectionRate || 0) === expectedRate
        && selectedAgeSentinelValid
        && shape.bodyFree === true
        && checksumValid
        && decisionValid;
    return {
        valid,
        checksumValid,
        decisionValid,
        scopeValid: !expectedScopeId || String(shape?.scopeId || "") === expectedScopeId,
        selectedAgeSentinelValid,
        candidateCount,
        selectedCount,
    };
}
function recordGroupTypedMemoryManifestSelectorShape(scopeId, decision, candidates = [], input = {}) {
    if (!(0, group_memory_index_1.isExactGroupTypedMemorySessionScope)(scopeId))
        return { recorded: false, reason: "exact_group_gcs_scope_required" };
    const decisionVerification = verifyGroupTypedMemoryManifestSelection(decision, scopeId);
    if (!decisionVerification.valid)
        throw new Error("typed_memory_manifest_selector_shape_decision_invalid");
    if (decision.selectorRan !== true || decision.shapeTelemetryExpected !== true)
        return { recorded: false, reason: "selector_not_run" };
    const candidateRows = Array.isArray(candidates) ? candidates : [];
    if (!candidateRows.length || candidateRows.length !== Number(decision.candidateCount || 0)) {
        throw new Error("typed_memory_manifest_selector_shape_candidates_invalid");
    }
    const completedMs = Date.parse(String(decision.completedAt || ""));
    const nowMs = Number(input.nowMs || input.now_ms || (Number.isFinite(completedMs) ? completedMs : Date.now()));
    const selectedSet = new Set((decision.selectedRelPaths || []).map((item) => String(item || "").toLowerCase()));
    const selectedCandidates = candidateRows.filter((candidate) => selectedSet.has(String(candidate.filename || "").toLowerCase()));
    const selectedCount = selectedCandidates.length;
    const candidateCount = candidateRows.length;
    const core = {
        schema: "ccm-group-typed-memory-manifest-selector-shape-v1",
        version: group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SHAPE_VERSION,
        scopeId,
        requestId: String(decision.requestId || ""),
        decisionChecksum: String(decision.checksum || ""),
        queryChecksum: String(decision.queryChecksum || ""),
        manifestChecksum: String(decision.manifestChecksum || ""),
        selectorStatus: String(decision.status || ""),
        selectorRan: true,
        candidateCount,
        selectedCount,
        selectionRate: candidateCount ? Number((selectedCount / candidateCount).toFixed(6)) : 0,
        candidateAgeDays: (0, group_memory_index_1.groupTypedMemoryManifestSelectorAgeStats)(candidateRows, nowMs),
        selectedAgeDays: (0, group_memory_index_1.groupTypedMemoryManifestSelectorAgeStats)(selectedCandidates, nowMs),
        selectedFreshCount: selectedCandidates.filter((candidate) => nowMs - Number(candidate.mtimeMs || nowMs) <= 86_400_000).length,
        selectedStaleCount: selectedCandidates.filter((candidate) => nowMs - Number(candidate.mtimeMs || nowMs) > 86_400_000).length,
        emptySelectionAgeSentinel: selectedCount === 0,
        bodyFree: true,
        recordedAt: String(input.recordedAt || input.recorded_at || decision.completedAt || (0, group_memory_index_1.now)()),
    };
    const shape = { ...core, checksum: (0, group_memory_index_1.groupTypedMemoryManifestSelectorShapeChecksum)(core) };
    if (!verifyGroupTypedMemoryManifestSelectorShape(shape, scopeId, decision).valid) {
        throw new Error("typed_memory_manifest_selector_shape_invalid");
    }
    if (input.recordShape === false || input.record_shape === false)
        return { ...shape, recorded: false };
    const dir = path.resolve(getGroupTypedMemoryManifestSelectorShapeDir(scopeId));
    fs.mkdirSync(dir, { recursive: true });
    const file = path.resolve(dir, `${(0, group_memory_index_1.safeSegment)(decision.requestId, "selection")}.json`);
    if (path.dirname(file).toLowerCase() !== dir.toLowerCase())
        throw new Error("typed_memory_manifest_selector_shape_path_invalid");
    const contributeTrend = (value) => {
        try {
            return {
                value: (0, group_memory_index_1.recordGroupTypedMemoryShapeTrendContribution)(scopeId, {
                    kind: "selector",
                    eventKey: value.requestId,
                    recordedAt: value.recordedAt,
                    metrics: {
                        candidateCount: value.candidateCount,
                        selectedCount: value.selectedCount,
                        selectedAgeAverage: value.selectedAgeDays?.average,
                        freshCount: value.selectedFreshCount,
                        staleCount: value.selectedStaleCount,
                    },
                }),
                error: "",
            };
        }
        catch (error) {
            return { value: null, error: (0, group_memory_index_1.compactText)(error?.message || error, 240) };
        }
    };
    if (fs.existsSync(file)) {
        try {
            const existing = JSON.parse(fs.readFileSync(file, "utf-8"));
            if (verifyGroupTypedMemoryManifestSelectorShape(existing, scopeId, decision).valid) {
                const trend = contributeTrend(existing);
                return { ...existing, shapeFile: file, recorded: true, idempotent: true, trendContribution: trend.value, trendContributionError: trend.error };
            }
        }
        catch { }
        throw new Error("typed_memory_manifest_selector_shape_conflict");
    }
    (0, group_memory_index_1.writeTextAtomicRaw)(file, JSON.stringify(shape, null, 2));
    const trend = contributeTrend(shape);
    return { ...shape, shapeFile: file, recorded: true, idempotent: false, trendContribution: trend.value, trendContributionError: trend.error };
}
function summarizeGroupTypedMemoryManifestSelectorShapes(scopeId, options = {}) {
    const decisions = Array.isArray(options.decisions) ? options.decisions : [];
    const decisionsByRequestId = new Map(decisions.map((row) => {
        const decision = { ...row };
        delete decision.valid;
        delete decision.decisionFile;
        delete decision.recallShapeTelemetry;
        delete decision.recallShapeTelemetryFile;
        delete decision.recallShapeTelemetryError;
        return [String(row.requestId || ""), decision];
    }));
    const rows = [];
    let unreadableCount = 0;
    try {
        for (const name of fs.readdirSync(getGroupTypedMemoryManifestSelectorShapeDir(scopeId)).filter(name => name.endsWith(".json"))) {
            const file = path.join(getGroupTypedMemoryManifestSelectorShapeDir(scopeId), name);
            try {
                const shape = JSON.parse(fs.readFileSync(file, "utf-8"));
                const decision = decisionsByRequestId.get(String(shape.requestId || "")) || null;
                const verification = verifyGroupTypedMemoryManifestSelectorShape(shape, scopeId, decision);
                rows.push({ ...shape, shapeFile: file, valid: !!decision && verification.valid === true });
            }
            catch {
                unreadableCount += 1;
            }
        }
    }
    catch { }
    rows.sort((a, b) => String(b.recordedAt || "").localeCompare(String(a.recordedAt || "")) || String(b.requestId || "").localeCompare(String(a.requestId || "")));
    const expectedRequestIds = new Set(decisions.filter((decision) => decision.shapeTelemetryExpected === true).map((decision) => String(decision.requestId || "")));
    const observedRequestIds = new Set(rows.filter(row => row.valid === true).map(row => String(row.requestId || "")));
    const missingExpectedShapeCount = [...expectedRequestIds].filter(requestId => !observedRequestIds.has(requestId)).length;
    const invalidShapeCount = rows.filter(row => row.valid !== true).length + unreadableCount;
    const validRows = rows.filter(row => row.valid === true);
    const consumption = summarizeGroupTypedMemoryManifestSelectorConsumption(scopeId, { includeRows: true });
    const latestConsumptionByRequestId = new Map();
    for (const row of Array.isArray(consumption.rows) ? consumption.rows.filter((item) => item.valid === true) : []) {
        const requestId = String(row.requestId || "");
        const previous = latestConsumptionByRequestId.get(requestId);
        if (!previous || String(row.recordedAt || "") > String(previous.recordedAt || ""))
            latestConsumptionByRequestId.set(requestId, row);
    }
    const linkedRows = validRows.map(row => ({ ...row, consumption: latestConsumptionByRequestId.get(String(row.requestId || "")) || null }));
    const documents = linkedRows.flatMap(row => row.consumption?.documents || []);
    const candidateTotal = validRows.reduce((sum, row) => sum + Number(row.candidateCount || 0), 0);
    const selectedTotal = validRows.reduce((sum, row) => sum + Number(row.selectedCount || 0), 0);
    const usedCount = documents.filter(row => row.usageState === "used").length;
    const verifiedCount = documents.filter(row => row.usageState === "verified").length;
    const ignoredCount = documents.filter(row => row.usageState === "ignored").length;
    const unreportedCount = documents.filter(row => row.usageState === "unreported").length;
    const declaredCount = usedCount + verifiedCount + ignoredCount;
    const selectedAges = validRows.map(row => Number(row.selectedAgeDays?.average ?? -1)).filter(age => age >= 0);
    return {
        schema: "ccm-group-typed-memory-manifest-selector-shape-summary-v1",
        version: 1,
        scopeId,
        dir: getGroupTypedMemoryManifestSelectorShapeDir(scopeId),
        present: rows.length > 0 || unreadableCount > 0 || expectedRequestIds.size > 0,
        valid: invalidShapeCount === 0 && missingExpectedShapeCount === 0,
        shapeCount: rows.length + unreadableCount,
        validShapeCount: validRows.length,
        invalidShapeCount,
        expectedShapeCount: expectedRequestIds.size,
        missingExpectedShapeCount,
        selectorRunCount: validRows.length,
        emptySelectionCount: validRows.filter(row => Number(row.selectedCount || 0) === 0).length,
        emptySelectionAgeSentinelCount: validRows.filter(row => Number(row.selectedCount || 0) === 0 && row.emptySelectionAgeSentinel === true && Number(row.selectedAgeDays?.average) === -1).length,
        candidateTotal,
        selectedTotal,
        selectionRate: candidateTotal ? Number((selectedTotal / candidateTotal).toFixed(6)) : null,
        averageEventSelectionRate: validRows.length ? Number((validRows.reduce((sum, row) => sum + Number(row.selectionRate || 0), 0) / validRows.length).toFixed(6)) : null,
        averageSelectedAgeDays: selectedAges.length ? Number((selectedAges.reduce((sum, age) => sum + age, 0) / selectedAges.length).toFixed(6)) : -1,
        selectedFreshCount: validRows.reduce((sum, row) => sum + Number(row.selectedFreshCount || 0), 0),
        selectedStaleCount: validRows.reduce((sum, row) => sum + Number(row.selectedStaleCount || 0), 0),
        consumptionLinkedRunCount: linkedRows.filter(row => !!row.consumption).length,
        consumedDeliveredDocumentCount: documents.length,
        consumedUsedDocumentCount: usedCount,
        consumedVerifiedDocumentCount: verifiedCount,
        consumedIgnoredDocumentCount: ignoredCount,
        consumedUnreportedDocumentCount: unreportedCount,
        consumptionReceiptCoverageRate: documents.length ? Number(((documents.length - unreportedCount) / documents.length).toFixed(6)) : null,
        consumedUtilityRate: declaredCount ? Number(((usedCount + verifiedCount) / declaredCount).toFixed(6)) : null,
        latest: linkedRows[0] || null,
        rows: options.includeRows === true ? linkedRows : undefined,
    };
}
function verifyGroupTypedMemoryManifestSelection(selection, expectedScopeId = "") {
    const selected = Array.isArray(selection?.selectedRelPaths) ? selection.selectedRelPaths : [];
    const calibration = selection?.calibration || null;
    const calibrationVerification = calibration
        ? verifyGroupTypedMemoryManifestSelectorCalibration(calibration, expectedScopeId || String(selection?.scopeId || ""), String(selection?.queryChecksum || ""))
        : { valid: true, checksumValid: true, scopeValid: true, queryValid: true, hintCount: 0 };
    const valid = !!selection
        && selection.schema === "ccm-group-typed-memory-manifest-selection-v1"
        && Number(selection.version || 0) === group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_VERSION
        && (0, group_memory_index_1.isExactGroupTypedMemorySessionScope)(String(selection.scopeId || ""))
        && (!expectedScopeId || String(selection.scopeId || "") === expectedScopeId)
        && selected.length <= group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION
        && selected.every((item) => typeof item === "string" && path.basename(item) === item && item.toLowerCase().endsWith(".md"))
        && calibrationVerification.valid === true
        && (!calibration || String(selection.calibrationChecksum || "") === String(calibration.checksum || ""))
        && String(selection.checksum || "") === (0, group_memory_index_1.groupTypedMemoryManifestSelectionChecksum)(selection);
    return {
        valid,
        scopeValid: !expectedScopeId || String(selection?.scopeId || "") === expectedScopeId,
        checksumValid: !!selection && String(selection.checksum || "") === (0, group_memory_index_1.groupTypedMemoryManifestSelectionChecksum)(selection),
        calibrationValid: calibrationVerification.valid === true,
        calibrationChecksumValid: calibrationVerification.checksumValid === true,
        calibrationHintCount: Number(calibrationVerification.hintCount || 0),
        selectedCount: selected.length,
    };
}
function configureGroupTypedMemoryManifestSelector(executor) {
    configuredGroupTypedMemoryManifestSelectorExecutor = typeof executor === "function" ? executor : null;
    return { configured: !!configuredGroupTypedMemoryManifestSelectorExecutor };
}
function buildGroupTypedMemoryManifest(scopeId, query, options = {}) {
    if (!(0, group_memory_index_1.isExactGroupTypedMemorySessionScope)(scopeId)) {
        return {
            schema: "ccm-group-typed-memory-selection-manifest-v1",
            version: 1,
            scopeId,
            validScope: false,
            candidates: [],
            manifest: "",
            candidateCount: 0,
            filteredCount: 0,
            filterCounts: { invalid_scope: 1 },
            calibration: null,
            calibrationText: "",
            checksum: "",
        };
    }
    const text = String(query || "");
    const generatedAt = String(options.generatedAt || options.generated_at || (0, group_memory_index_1.now)());
    const index = (0, group_memory_index_1.buildGroupTypedMemoryIndex)(scopeId);
    const already = new Set((options.alreadySurfaced || options.already_surfaced || [])
        .map((item) => String(item || "").trim().toLowerCase()).filter(Boolean));
    const targetPaths = (0, group_memory_index_1.deriveGroupTypedMemoryTargetPaths)(text, options.targetPaths || options.target_paths || []);
    const topicIndex = (0, group_memory_index_1.buildGroupSessionModelExtractionTopicRecallIndex)(scopeId);
    const staleIndex = (0, group_memory_index_1.buildGroupTypedMemoryPendingStaleConflictIndex)(scopeId);
    const filterCounts = {};
    const filtered = (reason) => { filterCounts[reason] = Number(filterCounts[reason] || 0) + 1; };
    const candidates = index.docs
        .filter((doc) => {
        const relPath = String(doc.relPath || "");
        const relKey = relPath.toLowerCase();
        const fileKey = String(doc.file || "").toLowerCase();
        if (already.has(relKey) || already.has(fileKey)) {
            filtered("already_surfaced");
            return false;
        }
        if ((staleIndex.byRelPath.get(relKey) || []).length > 0) {
            filtered("pending_stale_conflict");
            return false;
        }
        if (String(doc.source || "") === "auto:model-extraction-evidence-admission"
            && (!topicIndex.valid || !topicIndex.byRelPath.has(relKey))) {
            filtered("model_topic_archive_invalid_or_unbound");
            return false;
        }
        const pathCondition = (0, group_memory_index_1.evaluateTypedMemoryPathCondition)(doc, targetPaths);
        if (pathCondition.conditional && !pathCondition.matched) {
            filtered("path_condition_miss");
            return false;
        }
        return true;
    })
        .sort((a, b) => Number(b.mtimeMs || 0) - Number(a.mtimeMs || 0) || String(a.relPath).localeCompare(String(b.relPath)))
        .slice(0, Math.max(1, Math.min(group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_FILES, Number(options.maxFiles || options.max_files || group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_FILES))))
        .map((doc) => ({
        filename: String(doc.relPath || ""),
        filePath: String(doc.file || ""),
        mtimeMs: Number(doc.mtimeMs || 0),
        mtime: new Date(Number(doc.mtimeMs || Date.now())).toISOString(),
        description: doc.description ? (0, group_memory_index_1.compactText)(doc.description, 300) : "",
        type: (0, group_memory_index_1.normalizeMemoryType)(doc.type),
        source: String(doc.source || ""),
    }));
    const manifest = candidates.map((item) => {
        const tag = item.type ? `[${item.type}] ` : "";
        return item.description
            ? `- ${tag}${item.filename} (${item.mtime}): ${item.description}`
            : `- ${tag}${item.filename} (${item.mtime})`;
    }).join("\n");
    const calibration = buildGroupTypedMemoryManifestSelectorCalibration(scopeId, text, {
        nowMs: options.nowMs || options.now_ms,
        generatedAt,
        lookbackDays: options.calibrationLookbackDays || options.calibration_lookback_days,
        halfLifeDays: options.calibrationHalfLifeDays || options.calibration_half_life_days,
        maxHints: options.calibrationMaxHints || options.calibration_max_hints,
        candidateRelPaths: candidates.map((item) => item.filename),
    });
    const calibrationText = (calibration.hints || []).map((hint) => `- ${hint.relPath}: ${hint.calibration}; strong outcomes used=${hint.usedCount}, verified=${hint.verifiedCount}, ignored=${hint.ignoredCount}`).join("\n");
    const manifestCore = {
        schema: "ccm-group-typed-memory-selection-manifest-v1",
        version: 1,
        scopeId,
        validScope: true,
        candidates,
        manifest,
        candidateCount: candidates.length,
        sourceDocumentCount: index.docs.length,
        filteredCount: Object.values(filterCounts).reduce((sum, count) => sum + Number(count || 0), 0),
        filterCounts,
        targetPaths,
        alreadySurfacedCount: already.size,
        calibration,
        calibrationText,
        generatedAt,
    };
    return { ...manifestCore, checksum: (0, group_memory_index_1.checksum)(JSON.stringify(manifestCore), 64) };
}
async function selectGroupTypedMemoryManifest(scopeId, query, options = {}) {
    const startedAt = (0, group_memory_index_1.now)();
    const requestId = `ms_${(0, group_memory_index_1.checksum)([scopeId, query, startedAt, crypto.randomBytes(8).toString("hex")], 24)}`;
    const queryChecksum = (0, group_memory_index_1.checksum)(String(query || ""), 64);
    const recentTools = (0, group_memory_index_1.uniqueStrings)((options.recentTools || options.recent_tools || []).map(String), 20);
    const manifest = buildGroupTypedMemoryManifest(scopeId, query, options);
    const finish = (input) => {
        const selectorRan = input.selectorRan === true;
        const decision = (0, group_memory_index_1.finalizeGroupTypedMemoryManifestSelection)(scopeId, {
            requestId,
            queryChecksum,
            manifestChecksum: manifest.checksum || "",
            candidateCount: manifest.candidateCount || 0,
            filterCounts: manifest.filterCounts || {},
            calibration: manifest.calibration || null,
            calibrationChecksum: manifest.calibration?.checksum || "",
            calibrationHintCount: Number(manifest.calibration?.hintCount || 0),
            calibrationEvidenceCount: Number(manifest.calibration?.evidenceCount || 0),
            recentTools,
            startedAt,
            completedAt: (0, group_memory_index_1.now)(),
            ...input,
            selectorRan,
            shapeTelemetryExpected: selectorRan && options.recordDecision !== false,
        }, options);
        if (selectorRan) {
            try {
                const shape = recordGroupTypedMemoryManifestSelectorShape(scopeId, decision, manifest.candidates || [], {
                    recordShape: options.recordDecision !== false,
                });
                decision.recallShapeTelemetry = shape;
                decision.recallShapeTelemetryFile = shape.shapeFile || "";
            }
            catch (error) {
                decision.recallShapeTelemetryError = (0, group_memory_index_1.compactText)(error?.message || error, 240);
            }
        }
        return decision;
    };
    if (!manifest.validScope)
        return finish({ status: "invalid_scope", reason: "exact_group_gcs_scope_required", selectedRelPaths: [] });
    if ((0, group_memory_index_1.shouldIgnoreGroupMemoryRequest)(query, options))
        return finish({ status: "ignored", reason: "user_requested_ignore_memory", selectedRelPaths: [] });
    if (!manifest.candidateCount)
        return finish({ status: "no_candidates", reason: "manifest_empty_after_filters", selectedRelPaths: [] });
    if (options.signal?.aborted)
        return finish({ status: "aborted", reason: "selector_aborted_before_call", selectedRelPaths: [] });
    const executor = options.executor || configuredGroupTypedMemoryManifestSelectorExecutor;
    if (typeof executor !== "function")
        return finish({ status: "unavailable", reason: "manifest_selector_executor_not_configured", selectedRelPaths: [] });
    const toolsSection = recentTools.length ? `\n\nRecently used tools: ${recentTools.join(", ")}` : "";
    const calibrationSection = manifest.calibrationText
        ? `\n\nHistorical outcomes for this exact group-chat session and exact query (advisory only; do not auto-select or auto-reject):\n${manifest.calibrationText}`
        : "";
    try {
        const response = await executor({
            schema: "ccm-group-typed-memory-manifest-selector-request-v1",
            version: 1,
            requestId,
            scopeId,
            groupId: String(options.groupId || options.group_id || scopeId.slice(0, scopeId.lastIndexOf("--gcs_"))),
            groupSessionId: String(options.groupSessionId || options.group_session_id || scopeId.slice(scopeId.lastIndexOf("--") + 2)),
            query: (0, group_memory_index_1.compactText)(query, 6000),
            systemPrompt: group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_SELECTOR_SYSTEM_PROMPT,
            userPrompt: `Query: ${(0, group_memory_index_1.compactText)(query, 6000)}\n\nAvailable memories:\n${manifest.manifest}${toolsSection}${calibrationSection}`,
            recentTools,
            manifest: manifest.manifest,
            manifestChecksum: manifest.checksum,
            calibration: manifest.calibration,
            calibrationChecksum: manifest.calibration?.checksum || "",
            maxTokens: 256,
            maxSelection: group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION,
            outputSchema: {
                type: "object",
                properties: { selected_memories: { type: "array", items: { type: "string" } } },
                required: ["selected_memories"],
                additionalProperties: false,
            },
            signal: options.signal,
        });
        if (options.signal?.aborted)
            return finish({ status: "aborted", reason: "selector_aborted_after_call", selectedRelPaths: [], selectorRan: true });
        const rawSelected = (0, group_memory_index_1.parseGroupTypedMemoryManifestSelectorOutput)(response);
        const validNames = new Set(manifest.candidates.map((item) => item.filename));
        const selectedRelPaths = [];
        const unknownFilenames = [];
        let invalidFilenameCount = 0;
        for (const raw of rawSelected) {
            if (typeof raw !== "string" || path.basename(raw) !== raw || !raw.toLowerCase().endsWith(".md")) {
                invalidFilenameCount += 1;
                continue;
            }
            if (!validNames.has(raw)) {
                unknownFilenames.push(raw);
                continue;
            }
            if (!selectedRelPaths.includes(raw))
                selectedRelPaths.push(raw);
            if (selectedRelPaths.length >= group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION)
                break;
        }
        return finish({
            status: selectedRelPaths.length ? "selected" : "empty",
            reason: selectedRelPaths.length ? "selector_returned_certain_memories" : "selector_returned_empty",
            selectedRelPaths,
            unknownFilenames,
            invalidFilenameCount,
            selectorProject: response?.project || "",
            selectorAgentType: response?.agentType || "",
            selectorModel: response?.model || "",
            selectorRan: true,
        });
    }
    catch (error) {
        return finish({ status: "failed", reason: (0, group_memory_index_1.compactText)(error?.message || error, 240), selectedRelPaths: [], selectorRan: true });
    }
}
function summarizeGroupTypedMemoryManifestSelectorOutcomes(scopeId, options = {}) {
    const dir = getGroupTypedMemoryManifestSelectorOutcomeDir(scopeId);
    const decisions = Array.isArray(options.decisions) ? options.decisions : [];
    const decisionsByRequestId = new Map(decisions.map((row) => {
        const selection = { ...row };
        delete selection.valid;
        delete selection.decisionFile;
        return [String(row.requestId || ""), selection];
    }));
    const rows = [];
    let unreadableCount = 0;
    try {
        for (const name of fs.readdirSync(dir).filter(name => name.toLowerCase().endsWith(".json"))) {
            const file = path.join(dir, name);
            try {
                const outcome = JSON.parse(fs.readFileSync(file, "utf-8"));
                const selection = decisionsByRequestId.get(String(outcome.requestId || "")) || null;
                const verification = verifyGroupTypedMemoryManifestSelectorOutcome(outcome, scopeId, selection);
                rows.push({ ...outcome, outcomeFile: file, valid: verification.valid === true && !!selection });
            }
            catch {
                unreadableCount += 1;
            }
        }
    }
    catch { }
    rows.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")) || String(b.requestId || "").localeCompare(String(a.requestId || "")));
    const attachedByRequestId = new Map(rows.filter(row => row.stage === "attached").map(row => [String(row.requestId || ""), row]));
    for (const row of rows.filter(row => row.stage === "committed")) {
        const attached = attachedByRequestId.get(String(row.requestId || ""));
        if (!attached
            || attached.valid !== true
            || String(row.attachedOutcomeChecksum || "") !== String(attached.checksum || "")
            || String(row.capsuleChecksum || "") !== String(attached.capsuleChecksum || "")) {
            row.valid = false;
            row.chainInvalid = true;
        }
    }
    const validRows = rows.filter(row => row.valid === true);
    const attachedRows = validRows.filter(row => row.stage === "attached");
    const committedRows = validRows.filter(row => row.stage === "committed");
    const attachedRequestIds = new Set(attachedRows.map(row => String(row.requestId || "")));
    const committedRequestIds = new Set(committedRows.map(row => String(row.requestId || "")));
    const selectedDecisions = decisions.filter((row) => row.valid === true && String(row.status || "") === "selected");
    const nowMs = Number(options.nowMs || options.now_ms || Date.now());
    const staleAfterMs = Math.max(1_000, Number(options.staleAfterMs || options.stale_after_ms || 5 * 60_000));
    const staleUnattachedDecisionCount = selectedDecisions.filter((row) => {
        if (attachedRequestIds.has(String(row.requestId || "")))
            return false;
        const completedMs = Date.parse(String(row.completedAt || ""));
        return Number.isFinite(completedMs) && nowMs - completedMs >= staleAfterMs;
    }).length;
    const staleUncommittedAttachmentCount = attachedRows.filter(row => {
        if (committedRequestIds.has(String(row.requestId || "")))
            return false;
        const createdMs = Date.parse(String(row.createdAt || ""));
        return Number.isFinite(createdMs) && nowMs - createdMs >= staleAfterMs;
    }).length;
    const selectedAttachedDocumentCount = attachedRows.reduce((sum, row) => sum + Number(row.attachedSelectedRelPaths?.length || 0), 0);
    const selectedCommittedDocumentCount = committedRows.reduce((sum, row) => sum + Number(row.attachedSelectedRelPaths?.length || 0), 0);
    const selectedNotRecalledDocumentCount = attachedRows.reduce((sum, row) => sum + Number(row.selectedNotRecalledRelPaths?.length || 0), 0);
    const recalledNotAttachedDocumentCount = attachedRows.reduce((sum, row) => sum + Number(row.recalledNotAttachedRelPaths?.length || 0), 0);
    const invalidOutcomeCount = rows.filter(row => row.valid !== true).length + unreadableCount;
    return {
        schema: "ccm-group-typed-memory-manifest-selector-outcome-summary-v1",
        version: 1,
        scopeId,
        dir,
        present: rows.length > 0 || unreadableCount > 0,
        valid: invalidOutcomeCount === 0,
        closureValid: invalidOutcomeCount === 0 && staleUnattachedDecisionCount === 0 && staleUncommittedAttachmentCount === 0,
        outcomeCount: rows.length + unreadableCount,
        attachedOutcomeCount: attachedRows.length,
        committedOutcomeCount: committedRows.length,
        invalidOutcomeCount,
        selectedAttachedDocumentCount,
        selectedCommittedDocumentCount,
        selectedNotRecalledDocumentCount,
        recalledNotAttachedDocumentCount,
        selectedDecisionWithoutAttachmentCount: selectedDecisions.filter((row) => !attachedRequestIds.has(String(row.requestId || ""))).length,
        attachmentWithoutCommitCount: attachedRows.filter(row => !committedRequestIds.has(String(row.requestId || ""))).length,
        staleUnattachedDecisionCount,
        staleUncommittedAttachmentCount,
        closureGapCount: invalidOutcomeCount + staleUnattachedDecisionCount + staleUncommittedAttachmentCount,
        latest: rows[0] ? {
            requestId: String(rows[0].requestId || ""),
            stage: String(rows[0].stage || ""),
            valid: rows[0].valid === true,
            selectedCount: Number(rows[0].selectedRelPaths?.length || 0),
            recalledCount: Number(rows[0].recalledSelectedRelPaths?.length || 0),
            attachedCount: Number(rows[0].attachedSelectedRelPaths?.length || 0),
            createdAt: String(rows[0].createdAt || ""),
        } : null,
        rows: options.includeRows === true ? rows : undefined,
    };
}
function summarizeGroupTypedMemoryManifestSelectorDecisions(scopeId, options = {}) {
    const dir = getGroupTypedMemoryManifestSelectorDecisionDir(scopeId);
    const limit = Math.max(1, Math.min(200, Number(options.limit || 200)));
    const rows = [];
    let unreadableCount = 0;
    try {
        const files = fs.readdirSync(dir)
            .filter(name => name.toLowerCase().endsWith(".json"))
            .map(name => path.join(dir, name));
        for (const file of files) {
            try {
                const decision = JSON.parse(fs.readFileSync(file, "utf-8"));
                const verification = verifyGroupTypedMemoryManifestSelection(decision, scopeId);
                rows.push({ ...decision, decisionFile: file, valid: verification.valid === true });
            }
            catch {
                unreadableCount += 1;
            }
        }
    }
    catch { }
    rows.sort((a, b) => String(b.completedAt || "").localeCompare(String(a.completedAt || "")) || String(b.requestId || "").localeCompare(String(a.requestId || "")));
    const bounded = rows.slice(0, limit);
    const validRows = bounded.filter(row => row.valid === true);
    const calibratedRows = validRows.filter(row => row.calibration?.schema === "ccm-group-typed-memory-manifest-selector-calibration-v1");
    const calibrationHints = calibratedRows.flatMap(row => Array.isArray(row.calibration?.hints) ? row.calibration.hints : []);
    const statusCounts = {};
    for (const row of validRows)
        statusCounts[String(row.status || "unknown")] = Number(statusCounts[String(row.status || "unknown")] || 0) + 1;
    const selectedDocumentCount = validRows.reduce((sum, row) => sum + Number(row.selectedRelPaths?.length || 0), 0);
    const latest = bounded[0] || null;
    const outcomeSummary = summarizeGroupTypedMemoryManifestSelectorOutcomes(scopeId, {
        decisions: validRows,
        nowMs: options.nowMs || options.now_ms,
        staleAfterMs: options.staleAfterMs || options.stale_after_ms,
        includeRows: options.includeOutcomeRows === true || options.include_outcome_rows === true,
    });
    const consumptionSummary = summarizeGroupTypedMemoryManifestSelectorConsumption(scopeId, {
        nowMs: options.nowMs || options.now_ms,
        staleAfterMs: options.staleAfterMs || options.stale_after_ms,
        includeRows: options.includeConsumptionRows === true || options.include_consumption_rows === true,
    });
    const shapeSummary = summarizeGroupTypedMemoryManifestSelectorShapes(scopeId, {
        decisions: validRows,
        includeRows: true,
    });
    const writeShapeSummary = (0, group_memory_index_1.summarizeGroupTypedMemoryWriteShapes)(scopeId, { includeRows: true });
    const shapeDrift = (0, group_memory_index_1.buildGroupTypedMemoryShapeDrift)(scopeId, shapeSummary.rows || [], writeShapeSummary.rows || [], {
        nowMs: options.nowMs || options.now_ms,
        recentWindowDays: options.recentWindowDays || options.recent_window_days,
        baselineWindowDays: options.baselineWindowDays || options.baseline_window_days,
        minimumSelectorRuns: options.minimumSelectorRuns || options.minimum_selector_runs,
        minimumConsumptionDocuments: options.minimumConsumptionDocuments || options.minimum_consumption_documents,
    });
    const shapeTrend = (0, group_memory_index_1.summarizeGroupTypedMemoryShapeTrend)(scopeId, {
        nowMs: options.nowMs || options.now_ms,
        recentWindowDays: options.recentWindowDays || options.recent_window_days,
        baselineWindowDays: options.baselineWindowDays || options.baseline_window_days,
        includeBuckets: options.includeTrendBuckets === true || options.include_trend_buckets === true,
    });
    const shapeTrendIncidents = (0, group_memory_index_1.summarizeGroupTypedMemoryShapeTrendIncidents)(scopeId, {
        includeEvents: options.includeTrendIncidentEvents === true || options.include_trend_incident_events === true,
    });
    const publicShapeSummary = options.includeShapeRows === true || options.include_shape_rows === true
        ? shapeSummary
        : { ...shapeSummary, rows: undefined };
    const publicWriteShapeSummary = options.includeWriteShapeRows === true || options.include_write_shape_rows === true
        ? writeShapeSummary
        : { ...writeShapeSummary, rows: undefined };
    return {
        schema: "ccm-group-typed-memory-manifest-selector-summary-v1",
        version: 1,
        scopeId,
        dir,
        present: rows.length > 0 || unreadableCount > 0,
        valid: unreadableCount === 0 && rows.every(row => row.valid === true) && outcomeSummary.valid === true && consumptionSummary.valid === true && shapeSummary.valid === true && writeShapeSummary.valid === true && (0, group_memory_index_1.verifyGroupTypedMemoryShapeDrift)(shapeDrift, scopeId).valid === true && shapeTrend.valid === true && (0, group_memory_index_1.verifyGroupTypedMemoryShapeTrendSummary)(shapeTrend, scopeId).valid === true && shapeTrendIncidents.valid === true && (0, group_memory_index_1.verifyGroupTypedMemoryShapeTrendIncidentSummary)(shapeTrendIncidents, scopeId).valid === true,
        closureValid: outcomeSummary.closureValid === true,
        consumptionClosureValid: consumptionSummary.closureValid === true,
        decisionCount: rows.length + unreadableCount,
        validDecisionCount: rows.filter(row => row.valid === true).length,
        invalidDecisionCount: rows.filter(row => row.valid !== true).length + unreadableCount,
        selectedDecisionCount: Number(statusCounts.selected || 0),
        emptyDecisionCount: Number(statusCounts.empty || 0) + Number(statusCounts.no_candidates || 0),
        failedDecisionCount: Number(statusCounts.failed || 0) + Number(statusCounts.unavailable || 0) + Number(statusCounts.aborted || 0),
        ignoredDecisionCount: Number(statusCounts.ignored || 0),
        selectedDocumentCount,
        averageSelectedDocuments: validRows.length ? Number((selectedDocumentCount / validRows.length).toFixed(3)) : 0,
        calibrationObservedDecisionCount: calibratedRows.length,
        calibrationHintedDecisionCount: calibratedRows.filter(row => Number(row.calibrationHintCount || row.calibration?.hintCount || 0) > 0).length,
        calibrationEvidenceCount: calibratedRows.reduce((sum, row) => sum + Number(row.calibrationEvidenceCount || row.calibration?.evidenceCount || 0), 0),
        calibrationHintCount: calibrationHints.length,
        calibrationSupportHintCount: calibrationHints.filter((hint) => hint.calibration === "support").length,
        calibrationCautionHintCount: calibrationHints.filter((hint) => hint.calibration === "caution").length,
        calibrationMixedHintCount: calibrationHints.filter((hint) => hint.calibration === "mixed").length,
        shapeSummary: publicShapeSummary,
        shapeValid: shapeSummary.valid === true,
        shapeCount: Number(shapeSummary.shapeCount || 0),
        shapeInvalidCount: Number(shapeSummary.invalidShapeCount || 0),
        shapeMissingExpectedCount: Number(shapeSummary.missingExpectedShapeCount || 0),
        shapeSelectorRunCount: Number(shapeSummary.selectorRunCount || 0),
        shapeEmptySelectionCount: Number(shapeSummary.emptySelectionCount || 0),
        shapeCandidateTotal: Number(shapeSummary.candidateTotal || 0),
        shapeSelectedTotal: Number(shapeSummary.selectedTotal || 0),
        shapeSelectionRate: shapeSummary.selectionRate,
        shapeAverageSelectedAgeDays: Number(shapeSummary.averageSelectedAgeDays ?? -1),
        shapeSelectedFreshCount: Number(shapeSummary.selectedFreshCount || 0),
        shapeSelectedStaleCount: Number(shapeSummary.selectedStaleCount || 0),
        shapeConsumptionLinkedRunCount: Number(shapeSummary.consumptionLinkedRunCount || 0),
        shapeConsumedDeliveredDocumentCount: Number(shapeSummary.consumedDeliveredDocumentCount || 0),
        shapeConsumedUsedDocumentCount: Number(shapeSummary.consumedUsedDocumentCount || 0),
        shapeConsumedVerifiedDocumentCount: Number(shapeSummary.consumedVerifiedDocumentCount || 0),
        shapeConsumedIgnoredDocumentCount: Number(shapeSummary.consumedIgnoredDocumentCount || 0),
        shapeConsumedUnreportedDocumentCount: Number(shapeSummary.consumedUnreportedDocumentCount || 0),
        shapeConsumptionReceiptCoverageRate: shapeSummary.consumptionReceiptCoverageRate,
        shapeConsumedUtilityRate: shapeSummary.consumedUtilityRate,
        writeShapeSummary: publicWriteShapeSummary,
        writeShapePresent: writeShapeSummary.present === true,
        writeShapeValid: writeShapeSummary.valid === true,
        writeShapeCount: Number(writeShapeSummary.shapeCount || 0),
        writeShapeInvalidCount: Number(writeShapeSummary.invalidShapeCount || 0),
        writeShapeCreateCount: Number(writeShapeSummary.createCount || 0),
        writeShapeUpdateCount: Number(writeShapeSummary.updateCount || 0),
        writeShapeNoopCount: Number(writeShapeSummary.noopCount || 0),
        writeShapeChangedCount: Number(writeShapeSummary.changedCount || 0),
        writeShapeBodyTruncatedCount: Number(writeShapeSummary.bodyTruncatedCount || 0),
        writeShapeNearBodyLimitCount: Number(writeShapeSummary.nearBodyLimitCount || 0),
        writeShapeTotalGrowthBytes: Number(writeShapeSummary.totalGrowthBytes || 0),
        writeShapeAverageAfterBytes: Number(writeShapeSummary.averageAfterBytes || 0),
        writeShapeMaxAfterBytes: Number(writeShapeSummary.maxAfterBytes || 0),
        shapeDrift,
        shapeDriftValid: (0, group_memory_index_1.verifyGroupTypedMemoryShapeDrift)(shapeDrift, scopeId).valid === true,
        shapeDriftStatus: String(shapeDrift.status || "unobserved"),
        shapeDriftSignalCount: Number(shapeDrift.signalCount || 0),
        shapeDriftWarningSignalCount: Number(shapeDrift.warningSignalCount || 0),
        shapeTrend,
        shapeTrendPresent: shapeTrend.ledgerPresent === true,
        shapeTrendValid: shapeTrend.valid === true && (0, group_memory_index_1.verifyGroupTypedMemoryShapeTrendSummary)(shapeTrend, scopeId).valid === true,
        shapeTrendStatus: String(shapeTrend.status || "unobserved"),
        shapeTrendBucketCount: Number(shapeTrend.bucketCount || 0),
        shapeTrendMutableBucketCount: Number(shapeTrend.mutableBucketCount || 0),
        shapeTrendSealedBucketCount: Number(shapeTrend.sealedBucketCount || 0),
        shapeTrendGeneration: Number(shapeTrend.generation || 0),
        shapeTrendSignalCount: Number(shapeTrend.signalCount || 0),
        shapeTrendWarningSignalCount: Number(shapeTrend.warningSignalCount || 0),
        shapeTrendRecoveredFromBackup: shapeTrend.recoveredFromBackup === true,
        shapeTrendExtendsBeyondHotRetention: shapeTrend.extendsBeyondHotRetention === true,
        shapeTrendIncidents,
        shapeTrendIncidentPresent: shapeTrendIncidents.ledgerPresent === true,
        shapeTrendIncidentValid: shapeTrendIncidents.valid === true && (0, group_memory_index_1.verifyGroupTypedMemoryShapeTrendIncidentSummary)(shapeTrendIncidents, scopeId).valid === true,
        shapeTrendIncidentStatus: String(shapeTrendIncidents.status || "unobserved"),
        shapeTrendIncidentEventCount: Number(shapeTrendIncidents.eventCount || 0),
        shapeTrendIncidentCount: Number(shapeTrendIncidents.incidentCount || 0),
        shapeTrendIncidentPendingCount: Number(shapeTrendIncidents.pendingCount || 0),
        shapeTrendIncidentAcknowledgedCount: Number(shapeTrendIncidents.acknowledgedCount || 0),
        shapeTrendIncidentResolvedCount: Number(shapeTrendIncidents.resolvedCount || 0),
        shapeTrendIncidentRecoveredFromBackup: shapeTrendIncidents.recoveredFromBackup === true,
        shapeTrendActiveIncident: shapeTrendIncidents.activeIncident || null,
        outcomeSummary,
        attachedOutcomeCount: outcomeSummary.attachedOutcomeCount,
        committedOutcomeCount: outcomeSummary.committedOutcomeCount,
        invalidOutcomeCount: outcomeSummary.invalidOutcomeCount,
        selectedAttachedDocumentCount: outcomeSummary.selectedAttachedDocumentCount,
        selectedCommittedDocumentCount: outcomeSummary.selectedCommittedDocumentCount,
        selectedNotRecalledDocumentCount: outcomeSummary.selectedNotRecalledDocumentCount,
        recalledNotAttachedDocumentCount: outcomeSummary.recalledNotAttachedDocumentCount,
        selectedDecisionWithoutAttachmentCount: outcomeSummary.selectedDecisionWithoutAttachmentCount,
        attachmentWithoutCommitCount: outcomeSummary.attachmentWithoutCommitCount,
        staleUnattachedDecisionCount: outcomeSummary.staleUnattachedDecisionCount,
        staleUncommittedAttachmentCount: outcomeSummary.staleUncommittedAttachmentCount,
        closureGapCount: outcomeSummary.closureGapCount,
        consumptionSummary,
        consumptionOutcomeCount: consumptionSummary.outcomeCount,
        consumptionDeliveredDocumentCount: consumptionSummary.deliveredDocumentCount,
        consumptionUsedDocumentCount: consumptionSummary.usedDocumentCount,
        consumptionVerifiedDocumentCount: consumptionSummary.verifiedDocumentCount,
        consumptionIgnoredDocumentCount: consumptionSummary.ignoredDocumentCount,
        consumptionUnreportedDocumentCount: consumptionSummary.unreportedDocumentCount,
        consumptionWeakReceiptBindingCount: consumptionSummary.weakReceiptBindingCount,
        consumptionUnexpectedClaimCount: consumptionSummary.unexpectedClaimCount,
        consumptionStaleCommittedWithoutConsumptionCount: consumptionSummary.staleCommittedWithoutConsumptionCount,
        consumptionClosureGapCount: consumptionSummary.closureGapCount,
        latest: latest ? {
            requestId: String(latest.requestId || ""),
            status: String(latest.status || ""),
            valid: latest.valid === true,
            candidateCount: Number(latest.candidateCount || 0),
            selectedCount: Number(latest.selectedRelPaths?.length || 0),
            selectedRelPaths: Array.isArray(latest.selectedRelPaths) ? latest.selectedRelPaths.slice(0, group_memory_index_1.GROUP_TYPED_MEMORY_MANIFEST_MAX_SELECTION) : [],
            completedAt: String(latest.completedAt || ""),
            selectorProject: String(latest.selectorProject || ""),
            selectorAgentType: String(latest.selectorAgentType || ""),
            selectorModel: String(latest.selectorModel || ""),
            calibrationChecksum: String(latest.calibrationChecksum || ""),
            calibrationHintCount: Number(latest.calibrationHintCount || latest.calibration?.hintCount || 0),
            calibrationEvidenceCount: Number(latest.calibrationEvidenceCount || latest.calibration?.evidenceCount || 0),
            calibration: latest.calibration || null,
            decisionFile: String(latest.decisionFile || ""),
        } : null,
        rows: options.includeRows === true ? bounded.map(row => ({
            requestId: String(row.requestId || ""),
            status: String(row.status || ""),
            valid: row.valid === true,
            candidateCount: Number(row.candidateCount || 0),
            selectedCount: Number(row.selectedRelPaths?.length || 0),
            calibrationHintCount: Number(row.calibrationHintCount || row.calibration?.hintCount || 0),
            calibrationEvidenceCount: Number(row.calibrationEvidenceCount || row.calibration?.evidenceCount || 0),
            completedAt: String(row.completedAt || ""),
        })) : undefined,
    };
}
function buildGroupTypedMemoryRecall(groupId, query, options = {}) {
    const text = String(query || "");
    const requestedNowMs = Number(options.nowMs || options.now_ms || Date.now());
    const recallNowMs = Number.isFinite(requestedNowMs) ? requestedNowMs : Date.now();
    const index = (0, group_memory_index_1.buildGroupTypedMemoryIndex)(groupId);
    if ((0, group_memory_index_1.shouldIgnoreGroupMemoryRequest)(text, options)) {
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
    const queryTokens = (0, group_memory_index_1.tokens)(text);
    const targetPaths = (0, group_memory_index_1.deriveGroupTypedMemoryTargetPaths)(text, options.targetPaths || options.target_paths || []);
    const already = new Set((options.alreadySurfaced || options.already_surfaced || []).map((item) => String(item || "").toLowerCase()));
    const requiredRelPaths = new Set((options.requiredRelPaths || options.required_rel_paths || [])
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean));
    const recentTools = new Set((options.recentTools || options.recent_tools || []).map((item) => String(item || "").toLowerCase()).filter(Boolean));
    const postCompactUsageHints = (0, group_memory_index_1.normalizePostCompactCandidateUsageHints)(options);
    const workerContextPressureSignals = (0, group_memory_index_1.normalizeWorkerContextPressureRecallSignals)(options);
    const workerContextPressureUsageHints = (0, group_memory_index_1.normalizeWorkerContextPressureRecallUsageHints)(groupId, options);
    const pressureProvenanceDispatchFeedbackPolicy = (0, group_memory_index_1.normalizePressureProvenanceDispatchFeedbackPolicyForRecall)(options);
    const semanticStats = (0, group_memory_index_1.semanticRecallCorpusStats)(index.docs, text);
    const modelExtractionTopicIndex = (0, group_memory_index_1.buildGroupSessionModelExtractionTopicRecallIndex)(groupId);
    const pendingStaleConflictIndex = (0, group_memory_index_1.buildGroupTypedMemoryPendingStaleConflictIndex)(groupId);
    const manifestSelection = options.typedMemoryManifestSelection || options.typed_memory_manifest_selection || options.manifestSelection || options.manifest_selection || null;
    const manifestSelectionVerification = manifestSelection
        ? verifyGroupTypedMemoryManifestSelection(manifestSelection, groupId)
        : { valid: false, scopeValid: true, checksumValid: true, selectedCount: 0 };
    const manifestSelectionQueryValid = !manifestSelection
        || String(manifestSelection.queryChecksum || "") === (0, group_memory_index_1.checksum)(text, 64);
    const manifestSelectionApplied = !!manifestSelection;
    const manifestSelectionValid = manifestSelectionVerification.valid === true && manifestSelectionQueryValid;
    const manifestSelectedRelPaths = new Set(manifestSelectionValid
        ? (manifestSelection.selectedRelPaths || []).map((item) => String(item || "").toLowerCase())
        : []);
    const typedMemoryConsumptionSummary = (0, group_memory_index_1.buildGroupTypedMemoryConsumptionSummary)(groupId, {
        targetProject: options.targetProject || options.target_project || "",
        queryFeatures: semanticStats.queryFeatures,
        nowMs: options.nowMs || options.now_ms,
        halfLifeDays: options.typedMemoryConsumptionHalfLifeDays || options.typed_memory_consumption_half_life_days,
        staleAfterDays: options.typedMemoryConsumptionStaleAfterDays || options.typed_memory_consumption_stale_after_days,
    });
    const diagnostics = [];
    const scored = index.docs.map(doc => {
        const freshness = (0, group_memory_index_1.buildGroupTypedMemoryRecallFreshness)(doc, recallNowMs);
        const requiredRecall = requiredRelPaths.has(String(doc.relPath || "").toLowerCase());
        const modelExtractionDocument = String(doc.source || "") === "auto:model-extraction-evidence-admission";
        const modelExtractionTopic = modelExtractionTopicIndex.byRelPath.get(String(doc.relPath || "").toLowerCase()) || null;
        const pendingStaleConflicts = pendingStaleConflictIndex.byRelPath.get(String(doc.relPath || "").toLowerCase()) || [];
        const manifestSelected = manifestSelectedRelPaths.has(String(doc.relPath || "").toLowerCase());
        if (modelExtractionDocument && (!modelExtractionTopicIndex.valid || !modelExtractionTopic)) {
            diagnostics.push({ relPath: doc.relPath, skipped: true, reason: "model_topic_archive_invalid_or_unbound", freshness });
            return null;
        }
        if (pendingStaleConflicts.length > 0 && !requiredRecall) {
            diagnostics.push({
                relPath: doc.relPath,
                skipped: true,
                reason: "pending_stale_conflict_quarantined",
                pendingStaleConflictCount: pendingStaleConflicts.length,
                pendingStaleCandidateIds: pendingStaleConflicts.map((candidate) => candidate.candidate_id),
                freshness,
            });
            return null;
        }
        if (!requiredRecall && (already.has(doc.relPath.toLowerCase()) || already.has(doc.file.toLowerCase()))) {
            diagnostics.push({ relPath: doc.relPath, skipped: true, reason: "already_surfaced", freshness });
            return null;
        }
        const pathCondition = (0, group_memory_index_1.evaluateTypedMemoryPathCondition)(doc, targetPaths);
        if (pathCondition.conditional && !pathCondition.matched) {
            diagnostics.push({ relPath: doc.relPath, skipped: true, reason: "path_condition_miss", globs: pathCondition.globs, targetPaths, freshness });
            return null;
        }
        if (manifestSelectionApplied && !requiredRecall && (!manifestSelectionValid || !manifestSelected)) {
            diagnostics.push({
                relPath: doc.relPath,
                skipped: true,
                reason: manifestSelectionValid ? "manifest_selector_not_selected" : "manifest_selector_selection_invalid",
                manifestSelectionStatus: String(manifestSelection?.status || ""),
                manifestSelectionValid,
                manifestSelectionQueryValid,
                freshness,
            });
            return null;
        }
        const corpus = `${doc.name}\n${doc.description}\n${doc.body}`.toLowerCase();
        let score = 0;
        let lexicalScore = 0;
        for (const token of queryTokens)
            if (corpus.includes(token))
                lexicalScore += token.length >= 5 ? 3 : 1;
        score += lexicalScore;
        if (doc.type === "user")
            score += 4;
        if (doc.type === "feedback")
            score += 3;
        if (doc.type === "project")
            score += 2;
        if (doc.type === "reference")
            score += 1;
        const source = String(doc.source || "").toLowerCase();
        if (source.includes("global-claude-memory:"))
            score += 5;
        if (source.includes("global-claude-memory:managed:"))
            score += 2;
        if (pathCondition.conditional && pathCondition.matched)
            score += 64;
        if (requiredRecall)
            score += 100;
        if (manifestSelected)
            score += 48;
        for (const tool of recentTools) {
            if (!tool || !corpus.includes(tool))
                continue;
            if (/(警告|陷阱|风险|失败|阻塞|不要|禁止|warning|pitfall|risk|failed|blocked|do not|never)/i.test(corpus))
                score += 2;
            else
                score -= 4;
        }
        const postCompactUsage = (0, group_memory_index_1.scorePostCompactCandidateUsageHint)(corpus, postCompactUsageHints);
        if (postCompactUsage.adjustment)
            score += postCompactUsage.adjustment;
        const workerContextPressureRecall = (0, group_memory_index_1.scoreWorkerContextPressureRecall)(corpus, doc, workerContextPressureSignals, text, queryTokens);
        if (workerContextPressureRecall.adjustment)
            score += workerContextPressureRecall.adjustment;
        const workerContextPressureUsage = (0, group_memory_index_1.scoreWorkerContextPressureRecallUsageHint)(doc, workerContextPressureUsageHints, workerContextPressureSignals);
        if (workerContextPressureUsage.adjustment)
            score += workerContextPressureUsage.adjustment;
        const workerContextPressureFeedbackPolicy = (0, group_memory_index_1.scoreWorkerContextPressureFeedbackPolicyRecallRisk)(doc, corpus, workerContextPressureUsage, pressureProvenanceDispatchFeedbackPolicy, text, queryTokens);
        if (workerContextPressureFeedbackPolicy.adjustment)
            score += workerContextPressureFeedbackPolicy.adjustment;
        const semanticReference = (0, group_memory_index_1.scoreSemanticNaturalLanguageRecall)(doc, semanticStats);
        const scoreBeforeSemantic = score;
        const queryConstraintDirective = (semanticStats.queryFeatures.polarities || []).some((polarity) => ["prohibit", "require", "sequence", "conditional"].includes(polarity));
        const semanticConstraintEligible = semanticStats.queryFeatures.constraintLike === true
            && semanticReference.constraintShapeMatched === true
            && semanticReference.matchedConcepts.length >= 2
            && queryConstraintDirective;
        const semanticAdjustmentApplied = semanticReference.adjustment <= 0
            || scoreBeforeSemantic > 0
            || requiredRecall
            || semanticConstraintEligible;
        if (semanticAdjustmentApplied && semanticReference.adjustment)
            score += semanticReference.adjustment;
        if (!semanticAdjustmentApplied) {
            semanticReference.rawAdjustment = semanticReference.adjustment;
            semanticReference.adjustment = 0;
            semanticReference.gated = true;
            semanticReference.gateReason = "specialized_recall_policy_non_positive";
        }
        const modelExtractionTopicRecall = modelExtractionDocument
            ? (0, group_memory_index_1.scoreGroupSessionModelExtractionTopicRecall)(doc, modelExtractionTopic, text, queryTokens)
            : null;
        if (modelExtractionTopicRecall?.adjustment)
            score += modelExtractionTopicRecall.adjustment;
        const forceMemory = options.forceMemory === true || options.force_memory === true;
        if (modelExtractionDocument
            && !requiredRecall
            && !manifestSelected
            && !forceMemory
            && modelExtractionTopicRecall?.eligible !== true) {
            diagnostics.push({
                relPath: doc.relPath,
                skipped: true,
                reason: modelExtractionTopicRecall?.unclassified ? "unclassified_topic_not_clearly_relevant" : "model_topic_not_clearly_relevant",
                score,
                lexicalScore,
                modelExtractionTopicRecall,
                semanticReference,
                freshness,
            });
            return null;
        }
        const typedMemoryConsumption = (0, group_memory_index_1.scoreGroupTypedMemoryConsumptionRecall)(doc, typedMemoryConsumptionSummary);
        const consumptionAdjustmentApplied = typedMemoryConsumption.adjustment <= 0 || score > 0 || requiredRecall;
        if (consumptionAdjustmentApplied && typedMemoryConsumption.adjustment)
            score += typedMemoryConsumption.adjustment;
        if (!consumptionAdjustmentApplied) {
            typedMemoryConsumption.raw_adjustment = typedMemoryConsumption.adjustment;
            typedMemoryConsumption.adjustment = 0;
            typedMemoryConsumption.gated = true;
            typedMemoryConsumption.gate_reason = "specialized_recall_policy_non_positive";
        }
        if (!requiredRecall && score <= 0 && queryTokens.length && !(pathCondition.conditional && pathCondition.matched)) {
            const reason = workerContextPressureFeedbackPolicy.active === true
                && workerContextPressureFeedbackPolicy.risk_doc === true
                && Number(workerContextPressureFeedbackPolicy.adjustment || 0) < 0
                ? "pressure_feedback_policy_risk_gated"
                : "low_score";
            diagnostics.push({ relPath: doc.relPath, skipped: true, reason, score, postCompactUsage, workerContextPressureRecall, workerContextPressureUsage, workerContextPressureFeedbackPolicy, semanticReference, modelExtractionTopicRecall, typedMemoryConsumption, freshness });
            return null;
        }
        diagnostics.push({ relPath: doc.relPath, skipped: false, score, pathCondition, manifestSelected, postCompactUsage, workerContextPressureRecall, workerContextPressureUsage, workerContextPressureFeedbackPolicy, semanticReference, modelExtractionTopicRecall, pendingStaleConflictCount: pendingStaleConflicts.length, typedMemoryConsumption, freshness });
        return {
            ...doc,
            pathCondition,
            score,
            postCompactUsage,
            workerContextPressureRecall,
            workerContextPressureUsage,
            workerContextPressureFeedbackPolicy,
            semanticReference,
            modelExtractionTopicRecall,
            pendingStaleConflicts,
            typedMemoryConsumption,
            freshness,
            requiredRecall,
            manifestSelected,
            snippet: (0, group_memory_index_1.extractSemanticRecallSnippet)(doc.body, semanticStats.queryFeatures, Number(options.snippetChars || options.snippet_chars || 800)),
        };
    }).filter(Boolean).sort((a, b) => b.score - a.score || b.mtimeMs - a.mtimeMs);
    const recallLimit = Math.max(1, Number(options.max || options.limit || group_memory_index_1.GROUP_TYPED_MEMORY_MAX_RECALL));
    const recalled = [];
    let semanticDuplicateCount = 0;
    let modelTopicDuplicateCount = 0;
    for (const candidate of scored) {
        if (recalled.length >= recallLimit)
            break;
        const modelTopicDuplicateOf = candidate.requiredRecall
            ? null
            : recalled.find(item => candidate.modelExtractionTopicRecall?.topicId
                && candidate.modelExtractionTopicRecall.topicId === item.modelExtractionTopicRecall?.topicId);
        if (modelTopicDuplicateOf) {
            modelTopicDuplicateCount += 1;
            diagnostics.push({
                relPath: candidate.relPath,
                skipped: true,
                reason: "model_topic_duplicate",
                duplicateOf: modelTopicDuplicateOf.relPath,
                topicId: candidate.modelExtractionTopicRecall.topicId,
                score: candidate.score,
            });
            continue;
        }
        const duplicateOf = candidate.requiredRecall || (candidate.pathCondition?.conditional && candidate.pathCondition?.matched)
            ? null
            : (0, group_memory_index_1.semanticRecallDuplicateOf)(candidate, recalled);
        if (duplicateOf) {
            semanticDuplicateCount += 1;
            diagnostics.push({
                relPath: candidate.relPath,
                skipped: true,
                reason: "semantic_duplicate",
                duplicateOf: duplicateOf.relPath,
                score: candidate.score,
                semanticReference: candidate.semanticReference,
            });
            continue;
        }
        recalled.push(candidate);
    }
    return {
        schema: "ccm-group-typed-memory-recall-v1",
        ignored: false,
        reason: "",
        indexFile: index.file,
        memoryDir: index.dir,
        recalled,
        surfaced: recalled.map((item) => item.relPath),
        memoryFreshness: {
            schema: "ccm-group-typed-memory-recall-freshness-summary-v1",
            version: 1,
            evaluated_at: new Date(recallNowMs).toISOString(),
            recalled_count: recalled.length,
            fresh_count: recalled.filter((item) => item.freshness?.stale !== true).length,
            stale_count: recalled.filter((item) => item.freshness?.stale === true).length,
            stale_after_days: 1,
            current_source_verification_required: recalled.length > 0,
            stale_rel_paths: recalled.filter((item) => item.freshness?.stale === true).map((item) => item.relPath),
            checksum: (0, group_memory_index_1.checksum)(recalled.map((item) => [item.relPath, item.checksum, item.freshness?.age_days, item.freshness?.stale]), 32),
        },
        candidateCount: index.docs.length,
        targetPaths,
        conditionalMatched: diagnostics.filter((item) => item.pathCondition?.conditional && item.pathCondition?.matched).length,
        conditionalSkipped: diagnostics.filter((item) => item.reason === "path_condition_miss").length,
        semanticReferenceScoring: {
            schema: "ccm-group-typed-memory-semantic-reference-scoring-v1",
            evaluated_count: index.docs.length,
            boosted_count: diagnostics.filter((item) => Number(item.semanticReference?.adjustment || 0) > 0).length,
            conflict_penalized_count: diagnostics.filter((item) => Array.isArray(item.semanticReference?.reasons)
                && item.semanticReference.reasons.some((reason) => String(reason.kind || "").startsWith("polarity_conflict_"))).length,
            semantic_duplicate_count: semanticDuplicateCount,
            query_concepts: semanticStats.queryFeatures.concepts || [],
            query_polarities: semanticStats.queryFeatures.polarities || [],
            query_relations: semanticStats.queryFeatures.relations || [],
        },
        modelExtractionTopicScoring: {
            schema: "ccm-group-session-model-extraction-topic-recall-scoring-v1",
            archive_present: modelExtractionTopicIndex.archivePresent,
            archive_valid: modelExtractionTopicIndex.valid,
            model_document_count: index.docs.filter((item) => String(item.source || "") === "auto:model-extraction-evidence-admission").length,
            archive_bound_document_count: modelExtractionTopicIndex.byRelPath.size,
            archive_integrity_gated_count: diagnostics.filter((item) => item.reason === "model_topic_archive_invalid_or_unbound").length,
            evaluated_count: diagnostics.filter((item) => item.modelExtractionTopicRecall).length,
            boosted_count: diagnostics.filter((item) => Number(item.modelExtractionTopicRecall?.adjustment || 0) > 0).length,
            clearly_relevant_count: diagnostics.filter((item) => item.modelExtractionTopicRecall?.eligible === true).length,
            relevance_gated_count: diagnostics.filter((item) => ["model_topic_not_clearly_relevant", "unclassified_topic_not_clearly_relevant"].includes(item.reason)).length,
            unclassified_matched_count: diagnostics.filter((item) => item.modelExtractionTopicRecall?.unclassified === true && item.modelExtractionTopicRecall?.eligible === true).length,
            pending_stale_conflict_count: pendingStaleConflictIndex.pendingCount,
            stale_conflict_gated_count: diagnostics.filter((item) => item.reason === "pending_stale_conflict_quarantined").length,
            topic_duplicate_count: modelTopicDuplicateCount,
        },
        manifestSelectionScoring: {
            schema: "ccm-group-typed-memory-manifest-selection-scoring-v1",
            applied: manifestSelectionApplied,
            valid: manifestSelectionValid,
            scope_valid: manifestSelectionVerification.scopeValid !== false,
            checksum_valid: manifestSelectionVerification.checksumValid !== false,
            query_valid: manifestSelectionQueryValid,
            status: String(manifestSelection?.status || ""),
            request_id: String(manifestSelection?.requestId || ""),
            candidate_count: Number(manifestSelection?.candidateCount || 0),
            selected_count: manifestSelectedRelPaths.size,
            selected_rel_paths: [...manifestSelectedRelPaths],
            selected_recalled_count: recalled.filter((item) => item.manifestSelected === true).length,
            not_selected_gated_count: diagnostics.filter((item) => item.reason === "manifest_selector_not_selected").length,
            invalid_selection_gated_count: diagnostics.filter((item) => item.reason === "manifest_selector_selection_invalid").length,
            unknown_filename_count: Array.isArray(manifestSelection?.unknownFilenames) ? manifestSelection.unknownFilenames.length : 0,
            invalid_filename_count: Number(manifestSelection?.invalidFilenameCount || 0),
            decision_file: String(manifestSelection?.decisionFile || ""),
        },
        typedMemoryConsumptionScoring: {
            schema: "ccm-group-typed-memory-consumption-recall-scoring-v1",
            ledger_checksum_valid: typedMemoryConsumptionSummary.ledger_checksum_valid === true,
            invalid_entry_count: typedMemoryConsumptionSummary.invalid_entry_count || 0,
            entry_count: typedMemoryConsumptionSummary.entry_count || 0,
            relevant_entry_count: typedMemoryConsumptionSummary.relevant_entry_count || 0,
            stale_entry_count: typedMemoryConsumptionSummary.stale_entry_count || 0,
            proof_verified_entry_count: typedMemoryConsumptionSummary.proof_verified_entry_count || 0,
            downgraded_verified_entry_count: typedMemoryConsumptionSummary.downgraded_verified_entry_count || 0,
            anomaly_entry_count: typedMemoryConsumptionSummary.anomaly_entry_count || 0,
            average_evidence_confidence: typedMemoryConsumptionSummary.average_evidence_confidence || 0,
            matched_doc_count: diagnostics.filter((item) => Number(item.typedMemoryConsumption?.matched_count || 0) > 0).length,
            boosted_count: diagnostics.filter((item) => Number(item.typedMemoryConsumption?.adjustment || 0) > 0).length,
            deprioritized_count: diagnostics.filter((item) => Number(item.typedMemoryConsumption?.adjustment || 0) < 0).length,
            conflict_count: diagnostics.filter((item) => item.typedMemoryConsumption?.conflict === true).length,
            half_life_days: typedMemoryConsumptionSummary.half_life_days,
            stale_after_days: typedMemoryConsumptionSummary.stale_after_days,
        },
        postCompactUsageScoring: {
            schema: "ccm-group-typed-memory-post-compact-usage-scoring-v1",
            hint_count: postCompactUsageHints.length,
            matched_count: diagnostics.filter((item) => Array.isArray(item.postCompactUsage?.matched) && item.postCompactUsage.matched.length).length,
            boosted_count: diagnostics.filter((item) => Number(item.postCompactUsage?.adjustment || 0) > 0).length,
            deprioritized_count: diagnostics.filter((item) => Number(item.postCompactUsage?.adjustment || 0) < 0).length,
        },
        workerContextPressureScoring: {
            schema: "ccm-group-typed-memory-worker-context-pressure-scoring-v1",
            active: workerContextPressureSignals.active === true,
            signal_count: workerContextPressureSignals.signal_count || 0,
            active_signal_count: workerContextPressureSignals.active_signal_count || 0,
            suppressed_signal_count: workerContextPressureSignals.suppressed_signal_count || 0,
            pressure_status: workerContextPressureSignals.pressure_status || "",
            max_pressure: workerContextPressureSignals.max_pressure || 0,
            min_free_tokens: workerContextPressureSignals.min_free_tokens || 0,
            ptl_emergency: workerContextPressureSignals.ptl_emergency === true,
            repeated_compact_failure: workerContextPressureSignals.repeated_compact_failure === true,
            pressure_doc_count: diagnostics.filter((item) => item.workerContextPressureRecall?.pressure_doc).length,
            boosted_count: diagnostics.filter((item) => Number(item.workerContextPressureRecall?.adjustment || 0) > 0).length,
            deprioritized_count: diagnostics.filter((item) => Number(item.workerContextPressureRecall?.adjustment || 0) < 0).length,
            signals: workerContextPressureSignals.signals || [],
        },
        workerContextPressureUsageScoring: {
            schema: "ccm-group-typed-memory-worker-context-pressure-usage-scoring-v1",
            hint_count: workerContextPressureUsageHints.length,
            stale_hint_count: workerContextPressureUsageHints.filter((item) => item.recommendation === "stale_pressure_recall_history").length,
            cross_group_hint_count: workerContextPressureUsageHints.filter((item) => item.hint_scope === "cross_group_project").length,
            matched_count: diagnostics.filter((item) => Array.isArray(item.workerContextPressureUsage?.matched) && item.workerContextPressureUsage.matched.length).length,
            stale_matched_count: diagnostics.filter((item) => Array.isArray(item.workerContextPressureUsage?.matched) && item.workerContextPressureUsage.matched.some((match) => match.recommendation === "stale_pressure_recall_history")).length,
            cross_group_matched_count: diagnostics.filter((item) => Array.isArray(item.workerContextPressureUsage?.matched) && item.workerContextPressureUsage.matched.some((match) => match.hint_scope === "cross_group_project")).length,
            repair_hint_count: workerContextPressureUsageHints.filter((item) => item.repair_open === true).length,
            repair_matched_count: diagnostics.filter((item) => Array.isArray(item.workerContextPressureUsage?.matched) && item.workerContextPressureUsage.matched.some((match) => match.repair_open === true)).length,
            disputed_matched_count: diagnostics.filter((item) => Array.isArray(item.workerContextPressureUsage?.matched) && item.workerContextPressureUsage.matched.some((match) => match.provenance_status === "disputed_under_repair")).length,
            boosted_count: diagnostics.filter((item) => Number(item.workerContextPressureUsage?.adjustment || 0) > 0).length,
            deprioritized_count: diagnostics.filter((item) => Number(item.workerContextPressureUsage?.adjustment || 0) < 0).length,
        },
        workerContextPressureFeedbackPolicyScoring: {
            schema: "ccm-group-typed-memory-worker-context-pressure-provenance-feedback-recall-risk-scoring-v1",
            active: pressureProvenanceDispatchFeedbackPolicy.active === true,
            disabled: pressureProvenanceDispatchFeedbackPolicy.disabled === true,
            agent_type: pressureProvenanceDispatchFeedbackPolicy.agentType || pressureProvenanceDispatchFeedbackPolicy.agent_type || "unknown",
            target_project: pressureProvenanceDispatchFeedbackPolicy.targetProject || pressureProvenanceDispatchFeedbackPolicy.target_project || "",
            action: pressureProvenanceDispatchFeedbackPolicy.action || "",
            severity: pressureProvenanceDispatchFeedbackPolicy.severity || "",
            policy_row_count: Array.isArray(pressureProvenanceDispatchFeedbackPolicy.policyRows) ? pressureProvenanceDispatchFeedbackPolicy.policyRows.length : 0,
            risk_doc_count: diagnostics.filter((item) => item.workerContextPressureFeedbackPolicy?.risk_doc === true).length,
            repair_first_count: diagnostics.filter((item) => item.workerContextPressureFeedbackPolicy?.repair_first === true).length,
            deprioritized_count: diagnostics.filter((item) => Number(item.workerContextPressureFeedbackPolicy?.adjustment || 0) < 0).length,
            risk_gated_count: diagnostics.filter((item) => item.reason === "pressure_feedback_policy_risk_gated").length,
        },
        diagnostics: diagnostics.slice(-40),
    };
}
function renderGroupTypedMemoryRecall(recall) {
    if (!recall)
        return "";
    if (recall.ignored)
        return "类型化长期记忆：用户要求本轮忽略记忆，按空 MEMORY.md 处理。";
    const docs = Array.isArray(recall.recalled) ? recall.recalled : [];
    if (!docs.length)
        return "";
    const feedbackScoring = recall.workerContextPressureFeedbackPolicyScoring || recall.worker_context_pressure_feedback_policy_scoring || {};
    const feedbackHint = feedbackScoring.active
        ? `；pressure feedback policy gating risk ${feedbackScoring.risk_doc_count || 0}/gated ${feedbackScoring.risk_gated_count || 0}/repair-first ${feedbackScoring.repair_first_count || 0}`
        : "";
    const semanticScoring = recall.semanticReferenceScoring || recall.semantic_reference_scoring || {};
    const semanticHint = Number(semanticScoring.boosted_count || 0) > 0
        ? `；语义匹配 ${semanticScoring.boosted_count || 0}、冲突降权 ${semanticScoring.conflict_penalized_count || 0}、同义去重 ${semanticScoring.semantic_duplicate_count || 0}`
        : "";
    const consumptionScoring = recall.typedMemoryConsumptionScoring || recall.typed_memory_consumption_scoring || {};
    const consumptionHint = Number(consumptionScoring.entry_count || 0) > 0
        ? `；消费反馈 +${consumptionScoring.boosted_count || 0}/-${consumptionScoring.deprioritized_count || 0}/冲突 ${consumptionScoring.conflict_count || 0}`
        : "";
    const topicScoring = recall.modelExtractionTopicScoring || recall.model_extraction_topic_scoring || {};
    const topicHint = Number(topicScoring.model_document_count || 0) > 0
        ? `；模型 Topic 明确相关 ${topicScoring.clearly_relevant_count || 0}/门禁 ${topicScoring.relevance_gated_count || 0}/同 Topic 去重 ${topicScoring.topic_duplicate_count || 0}`
        : "";
    const manifestScoring = recall.manifestSelectionScoring || recall.manifest_selection_scoring || {};
    const manifestHint = manifestScoring.applied
        ? `；manifest selector ${manifestScoring.status || "unknown"} ${manifestScoring.selected_recalled_count || 0}/${manifestScoring.selected_count || 0}`
        : "";
    const lines = [
        `类型化长期记忆（MEMORY.md 索引召回，路径条件匹配 ${recall.conditionalMatched || 0}、跳过 ${recall.conditionalSkipped || 0}${semanticHint}${topicHint}${manifestHint}${consumptionHint}${recall.workerContextPressureScoring?.active ? `；上下文压力召回 ${recall.workerContextPressureScoring.boosted_count || 0}` : ""}${feedbackHint}；陈旧 ${recall.memoryFreshness?.stale_count || 0}/${docs.length}；使用前如涉及文件/函数/flag 必须再核验当前仓库）：`,
    ];
    for (const doc of docs) {
        const pathHint = doc.pathCondition?.conditional ? `；paths ${doc.pathCondition.matchedPaths?.join(",") || "matched"}` : "";
        const usageHint = Array.isArray(doc.postCompactUsage?.matched) && doc.postCompactUsage.matched.length
            ? `；post-compact usage ${doc.postCompactUsage.adjustment > 0 ? "+" : ""}${doc.postCompactUsage.adjustment}`
            : "";
        const pressureHint = Array.isArray(doc.workerContextPressureRecall?.matched) && doc.workerContextPressureRecall.matched.length && Number(doc.workerContextPressureRecall.adjustment || 0) > 0
            ? `；pressure recall +${doc.workerContextPressureRecall.adjustment}`
            : "";
        const pressureUsageHint = Array.isArray(doc.workerContextPressureUsage?.matched) && doc.workerContextPressureUsage.matched.length
            ? `；pressure usage ${doc.workerContextPressureUsage.adjustment > 0 ? "+" : ""}${doc.workerContextPressureUsage.adjustment}`
            : "";
        const pressureRepair = Array.isArray(doc.workerContextPressureUsage?.matched)
            ? doc.workerContextPressureUsage.matched.find((match) => match.repair_open === true)
            : null;
        const pressureRepairHint = pressureRepair
            ? `；pressure repair ${pressureRepair.repair_gap_type || "gap"}:${pressureRepair.repair_status || "pending"}`
            : "";
        const feedbackPolicy = doc.workerContextPressureFeedbackPolicy || doc.worker_context_pressure_feedback_policy || {};
        const feedbackPolicyHint = feedbackPolicy.active && feedbackPolicy.risk_doc
            ? `；pressure feedback policy ${feedbackPolicy.repair_first ? "repair-first" : `${feedbackPolicy.adjustment > 0 ? "+" : ""}${feedbackPolicy.adjustment}`}`
            : "";
        const crossGroupProvenance = !pressureRepair && Array.isArray(doc.workerContextPressureUsage?.matched)
            ? doc.workerContextPressureUsage.matched.find((match) => match.provenance_status === "cross_group_project_assist")
            : null;
        const provenanceHint = crossGroupProvenance ? "；provenance cross_group_project_assist" : "";
        const semanticReference = doc.semanticReference || doc.semantic_reference || {};
        const semanticConcepts = Array.isArray(semanticReference.matchedConcepts) ? semanticReference.matchedConcepts.slice(0, 6) : [];
        const semanticConflict = Array.isArray(semanticReference.reasons)
            && semanticReference.reasons.some((reason) => String(reason.kind || "").startsWith("polarity_conflict_"));
        const semanticDocHint = Number(semanticReference.adjustment || 0) !== 0
            ? `；semantic ${semanticReference.adjustment > 0 ? "+" : ""}${semanticReference.adjustment}${semanticConcepts.length ? ` [${semanticConcepts.join(",")}]` : ""}${semanticConflict ? " conflict" : ""}`
            : "";
        const consumption = doc.typedMemoryConsumption || doc.typed_memory_consumption || {};
        const consumptionDocHint = Number(consumption.matched_count || 0) > 0
            ? `；consumption ${consumption.adjustment > 0 ? "+" : ""}${consumption.adjustment}${consumption.conflict ? " conflict/reverify" : ""}`
            : "";
        const modelTopic = doc.modelExtractionTopicRecall || doc.model_extraction_topic_recall || {};
        const modelTopicHint = modelTopic.topicId
            ? `；topic ${modelTopic.topicId} ${modelTopic.semanticMatch ? `semantic ${modelTopic.similarity}` : `lexical ${Array.isArray(modelTopic.matchedTokens) ? modelTopic.matchedTokens.slice(0, 4).join(",") : "matched"}`}`
            : "";
        const pendingStaleConflicts = Array.isArray(doc.pendingStaleConflicts)
            ? doc.pendingStaleConflicts
            : Array.isArray(doc.pending_stale_conflicts) ? doc.pending_stale_conflicts : [];
        const staleConflictHint = pendingStaleConflicts.length
            ? `；PENDING STALE CONFLICT ${pendingStaleConflicts.length} / REVERIFY REQUIRED`
            : "";
        const manifestSelectedHint = doc.manifestSelected === true ? "；manifest selected" : "";
        const freshness = doc.freshness || {};
        const freshnessHint = freshness.stale === true
            ? `；STALE ${freshness.age_days || 0} days old`
            : `；saved ${freshness.age_label || "today"}`;
        if (pendingStaleConflicts.length) {
            const candidateIds = pendingStaleConflicts.map((item) => String(item.candidate_id || "")).filter(Boolean).slice(0, 4);
            lines.push(`- PENDING STALE CONFLICT / REVERIFY REQUIRED ${doc.relPath}：该记忆仅因 requiredRelPath 被显式加载，当前存在待处理冲突${candidateIds.length ? `（${candidateIds.join(", ")}）` : ""}。在读取当前来源并重新验证前，不得把旧记忆当作事实或据此修改代码。`);
        }
        if (freshness.stale === true && freshness.warning)
            lines.push(`- 记忆新鲜度警告 ${doc.relPath}：${freshness.warning}`);
        lines.push(`- [${doc.type}] ${doc.name}（score ${doc.score}，${doc.relPath}${freshnessHint}${pathHint}${semanticDocHint}${modelTopicHint}${manifestSelectedHint}${staleConflictHint}${consumptionDocHint}${usageHint}${pressureHint}${pressureUsageHint}${pressureRepairHint}${feedbackPolicyHint}${provenanceHint}）：${doc.description || ""}`);
        if (doc.snippet)
            lines.push(`  ${(0, group_memory_index_1.compactText)(doc.snippet, 700).replace(/\n/g, "\n  ")}`);
    }
    lines.push("- 回执要求：最终 CCM_AGENT_RECEIPT.typedMemoryUsage 必须逐条引用上述 relPath，声明 usageState=used/verified/ignored、currentSourceVerified 和 reason；memoryUsed/memoryIgnored 保留同一 relPath 的人类可读说明。");
    return lines.join("\n");
}
//# sourceMappingURL=group-memory-loading.js.map