"use strict";
// Behavior-freeze split from group-memory-loading.ts (part 1/3).
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
exports.configuredGroupTypedMemoryManifestSelectorExecutor = void 0;
exports.setConfiguredGroupTypedMemoryManifestSelectorExecutor = setConfiguredGroupTypedMemoryManifestSelectorExecutor;
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const group_memory_index_1 = require("./group-memory-index");
const group_memory_loading_part_02_1 = require("./group-memory-loading-part-02");
exports.configuredGroupTypedMemoryManifestSelectorExecutor = null;
function setConfiguredGroupTypedMemoryManifestSelectorExecutor(value) {
    exports.configuredGroupTypedMemoryManifestSelectorExecutor = value;
    return exports.configuredGroupTypedMemoryManifestSelectorExecutor;
}
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
    const selectionValid = !selection || ((0, group_memory_loading_part_02_1.verifyGroupTypedMemoryManifestSelection)(selection, expectedScopeId || String(outcome?.scopeId || "")).valid === true
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
    const selectionVerification = (0, group_memory_loading_part_02_1.verifyGroupTypedMemoryManifestSelection)(selection, scopeId);
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
//# sourceMappingURL=group-memory-loading-part-01.js.map