"use strict";
// Behavior-freeze split from tools-part-01.ts (part 2/2).
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
exports.runToolChainVerificationSelfTest = runToolChainVerificationSelfTest;
exports.runTerminalCommand = runTerminalCommand;
exports.listSharedFiles = listSharedFiles;
exports.readSharedFile = readSharedFile;
exports.writeSharedFile = writeSharedFile;
exports.saveSharedUpload = saveSharedUpload;
exports.deleteSharedFile = deleteSharedFile;
exports.readSkillManual = readSkillManual;
exports.loadCustomSkills = loadCustomSkills;
// Behavior-freeze split from tools.ts (part 1/2).
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const perf_hooks_1 = require("perf_hooks");
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const tool_catalog_management_1 = require("../../tools/tool-catalog-management");
const internal_skill_catalog_1 = require("../../skills/internal-skill-catalog");
const tools_part_01_part_01_1 = require("./tools-part-01-part-01");
const { toolManager } = require("../../tools/tool-manager");
const TOOL_CATALOG_AUDIT_FILE = path.join(os.homedir(), ".cc-connect", "tools", "catalog-operations.jsonl");
const TOOL_INVOCATION_AUDIT_FILES = {
    toolLoop: path.join(os.homedir(), ".cc-connect", "agent-runner", "tool-call-loop.jsonl"),
    skillInvocations: path.join(os.homedir(), ".cc-connect", "agent-runner", "skill-invocations.jsonl"),
    permissionViolations: path.join(os.homedir(), ".cc-connect", "agent-runner", "tool-permission-violations.jsonl"),
};
const MARKETPLACE_OPERATIONS_AUDIT_FILE = path.join(os.homedir(), ".cc-connect", "marketplace", "operations.jsonl");
const AGENT_RUNNER_DIR = path.join(os.homedir(), ".cc-connect", "agent-runner");
const AGENT_PROBE_STATUS_FILE = path.join(AGENT_RUNNER_DIR, "probe-status.json");
const AGENT_PROBE_TARGET_STATUS_DIR = path.join(AGENT_RUNNER_DIR, "probe-targets");
const REAL_CLI_PROBE_SUCCESS_FRESH_MS = 24 * 60 * 60 * 1000;
let previousMetricsCpuUsage = process.cpuUsage();
let previousMetricsCpuAt = process.hrtime.bigint();
let previousEventLoopUtilization = perf_hooks_1.performance.eventLoopUtilization();
function runToolChainVerificationSelfTest() {
    const verifiedReport = (0, tools_part_01_part_01_1.buildToolChainVerification)({
        inventory: {
            scopes: [(0, tools_part_01_part_01_1.buildToolChainVerificationSelfTestRow)({ id: "project-alpha", name: "Alpha App" })],
        },
        invocationAudit: {
            items: [{
                    at: "2026-07-07T00:00:00.000Z",
                    category: "tool",
                    type: "tool_call",
                    project: "Alpha App",
                    tool: "payments/createInvoice",
                    ok: true,
                }, {
                    at: "2026-07-07T00:00:01.000Z",
                    category: "skill",
                    type: "skill_invoked",
                    project: "Alpha App",
                    skill: "release-notes",
                    ok: true,
                }],
        },
    });
    const failedInvocationReport = (0, tools_part_01_part_01_1.buildToolChainVerification)({
        inventory: {
            scopes: [(0, tools_part_01_part_01_1.buildToolChainVerificationSelfTestRow)({ id: "project-failed", name: "Failed App" })],
        },
        invocationAudit: {
            items: [{
                    at: "2026-07-07T00:00:00.000Z",
                    category: "tool",
                    type: "tool_call",
                    project: "Failed App",
                    tool: "payments/createInvoice",
                    ok: false,
                }, {
                    at: "2026-07-07T00:00:01.000Z",
                    category: "skill",
                    type: "skill_missing",
                    project: "Failed App",
                    skill: "release-notes",
                    ok: false,
                }],
        },
    });
    const readyUnverifiedReport = (0, tools_part_01_part_01_1.buildToolChainVerification)({
        inventory: {
            scopes: [(0, tools_part_01_part_01_1.buildToolChainVerificationSelfTestRow)({ id: "project-ready", name: "Ready App" })],
        },
        invocationAudit: { items: [] },
    });
    const authorizationBlockedRow = (0, tools_part_01_part_01_1.buildToolChainVerificationSelfTestRow)({
        id: "project-auth-blocked",
        authorization_readiness: {
            dispatchReady: false,
            status: "needs_attention",
            requested: { mcp: 1, skill: 1 },
            available: { mcp: 0, skill: 0 },
            missing: { missing_mcp_servers: 1, missing_mcp_tools: 0, missing_skills: 1 },
            invalid_mcp_grants: 0,
        },
    });
    const runtimeMissingRow = (0, tools_part_01_part_01_1.buildToolChainVerificationSelfTestRow)({
        id: "project-runtime-missing",
        runtime: {
            schema: "ccm-tool-authorization-runtime-coverage-v1",
            summary: { total: 0, overallReady: 0, deliveryReady: 0, runtimeReady: 0, needsResync: 0 },
            snapshots: [],
        },
    });
    const runtimeNeedsResyncRow = (0, tools_part_01_part_01_1.buildToolChainVerificationSelfTestRow)({
        id: "project-runtime-stale",
        runtime: {
            schema: "ccm-tool-authorization-runtime-coverage-v1",
            summary: { total: 1, overallReady: 0, deliveryReady: 0, runtimeReady: 1, needsResync: 1 },
            snapshots: [{
                    runtime: "cursor",
                    snapshotId: "stale-snapshot",
                    projectName: "project-runtime-stale",
                    groupId: "",
                    deliveryReady: false,
                    runtimeReady: true,
                    overallReady: false,
                    catalogStale: true,
                    dispatchReady: true,
                }],
        },
    });
    const unauthorizedRow = (0, tools_part_01_part_01_1.buildToolChainVerificationSelfTestRow)({ scope: "group", id: "group-1", name: "Group One" });
    const emptyRow = (0, tools_part_01_part_01_1.buildToolChainVerificationSelfTestRow)({ id: "project-empty", configured: false });
    const unauthorizedAudit = {
        items: [{
                at: "2026-07-07T00:02:00.000Z",
                category: "unauthorized",
                type: "tool_unauthorized",
                groupId: "group-1",
                tool: "payments/deleteInvoice",
                ok: false,
            }],
    };
    const blockedReport = (0, tools_part_01_part_01_1.buildToolChainVerification)({
        inventory: {
            scopes: [authorizationBlockedRow, runtimeMissingRow, runtimeNeedsResyncRow, unauthorizedRow, emptyRow],
        },
        invocationAudit: unauthorizedAudit,
    });
    const staleRow = blockedReport.rows.find((row) => row.id === "project-runtime-stale");
    const staleResyncAction = staleRow?.nextActions?.find((action) => action.kind === "runtime_resync");
    const filteredGroupReport = (0, tools_part_01_part_01_1.buildToolChainVerification)({
        groupId: "group-1",
        inventory: { scopes: [authorizationBlockedRow, unauthorizedRow] },
        invocationAudit: unauthorizedAudit,
    });
    const marketplaceLifecycleEvidence = {
        action: "install",
        sourceProof: { schema: "ccm-marketplace-source-proof-v1" },
        runtimeImpact: { schema: "ccm-marketplace-runtime-impact-v1" },
        runtimeResync: { schema: "ccm-marketplace-runtime-resync-v1" },
    };
    const freshProbeCheckedAt = new Date().toISOString();
    const staleProbeCheckedAt = new Date(Date.now() - REAL_CLI_PROBE_SUCCESS_FRESH_MS - 1000).toISOString();
    const buildRealCliProbe = (runtime, checkedAt, success = true) => ({
        schema: "ccm-runtime-tool-real-cli-e2e-v1",
        success,
        checked_at: checkedAt,
        target: {
            group_id: "group-1",
            project: `probe-${runtime}`,
            agent_type: runtime,
        },
        execution_path: "selftest-native-cli",
        expected_marker: "CCM_AGENT_PROBE_OK",
        output_preview: success ? "CCM_AGENT_PROBE_OK" : "probe failed",
        duration_ms: 123,
        mcpInvocationObserved: success,
        skillInvocationObserved: success,
        snapshotValidated: success,
    });
    const completionReadyAudit = (0, tools_part_01_part_01_1.buildMcpSkillGoalCompletionAudit)({
        chainVerification: verifiedReport,
        marketplaceOperations: {
            items: [marketplaceLifecycleEvidence],
        },
        realCliE2E: { claudecode: true, cursor: true, codex: true },
    });
    const completionPersistedProbeAudit = (0, tools_part_01_part_01_1.buildMcpSkillGoalCompletionAudit)({
        chainVerification: verifiedReport,
        marketplaceOperations: { items: [marketplaceLifecycleEvidence] },
        realCliProbeStatuses: [
            buildRealCliProbe("claudecode", freshProbeCheckedAt),
            buildRealCliProbe("cursor", freshProbeCheckedAt),
            buildRealCliProbe("codex", freshProbeCheckedAt),
        ],
    });
    const completionStaleProbeAudit = (0, tools_part_01_part_01_1.buildMcpSkillGoalCompletionAudit)({
        chainVerification: verifiedReport,
        marketplaceOperations: { items: [marketplaceLifecycleEvidence] },
        realCliProbeStatuses: [
            buildRealCliProbe("claudecode", staleProbeCheckedAt),
            buildRealCliProbe("cursor", staleProbeCheckedAt),
            buildRealCliProbe("codex", staleProbeCheckedAt),
        ],
    });
    const completionMissingAudit = (0, tools_part_01_part_01_1.buildMcpSkillGoalCompletionAudit)({
        chainVerification: readyUnverifiedReport,
        marketplaceOperations: { items: [] },
        realCliE2E: { claudecode: false, cursor: false, codex: false },
    });
    const persistedProbeRequirement = completionPersistedProbeAudit.requirements.find((item) => item.id === "real_cli_e2e");
    const staleProbeRequirement = completionStaleProbeAudit.requirements.find((item) => item.id === "real_cli_e2e");
    const checks = {
        verifiedGatePassesObservedScope: verifiedReport.gate?.schema === "ccm-tool-chain-verification-gate-v1"
            && verifiedReport.gate.status === "verified"
            && verifiedReport.gate.dispatchReady === true
            && verifiedReport.gate.verified === true
            && verifiedReport.gate.counts.verifiedScopes === 1,
        readyUnverifiedRequiresObservation: readyUnverifiedReport.gate.status === "ready_unverified"
            && readyUnverifiedReport.gate.dispatchReady === true
            && readyUnverifiedReport.gate.verified === false
            && readyUnverifiedReport.gate.requiresObservation === true
            && readyUnverifiedReport.gate.counts.pendingObservationScopes === 1,
        failedInvocationDoesNotVerifyScope: failedInvocationReport.gate.status === "ready_unverified"
            && failedInvocationReport.gate.verified === false
            && failedInvocationReport.rows[0]?.status === "verification_incomplete"
            && failedInvocationReport.rows[0]?.invocation?.summary?.evidenceComplete === false
            && failedInvocationReport.rows[0]?.invocation?.summary?.missingEvidence?.includes("mcp_success")
            && failedInvocationReport.rows[0]?.invocation?.summary?.missingEvidence?.includes("skill_success"),
        incompleteScopeRoutesToRealBusinessTask: failedInvocationReport.rows[0]?.nextActions?.some((action) => (action.kind === "open_scope_real_task"
            && action.scope === "project"
            && action.scopeId === "project-failed"
            && action.label === "前往项目执行真实任务")) === true
            && failedInvocationReport.rows[0]?.nextActions?.every((action) => action.kind !== "run_child_agent_e2e") === true,
        blockedGateBlocksDispatch: blockedReport.gate.status === "blocked"
            && blockedReport.gate.dispatchReady === false
            && blockedReport.gate.counts.blockingScopes === 4
            && blockedReport.gate.blockingStatuses.includes("authorization_blocked")
            && blockedReport.gate.blockingStatuses.includes("runtime_missing")
            && blockedReport.gate.blockingStatuses.includes("runtime_needs_resync")
            && blockedReport.gate.blockingStatuses.includes("unauthorized_attempts"),
        unconfiguredScopeExcludedFromConfiguredGate: blockedReport.gate.counts.unconfiguredScopes === 1
            && !blockedReport.gate.blockingScopes.some((row) => row.id === "project-empty"),
        runtimeResyncActionTargetsSnapshot: staleResyncAction?.resyncPayload?.staleOnly === false
            && staleResyncAction?.resyncPayload?.snapshotIds?.[0] === "stale-snapshot",
        gateAggregatesNextActions: blockedReport.gate.nextActions.length >= 4
            && blockedReport.gate.nextActions.some((action) => action.kind === "open_invocation_audit" && action.scopeId === "group-1"),
        groupFilterGatesOnlyGroupScope: filteredGroupReport.rows.length === 1
            && filteredGroupReport.rows[0]?.id === "group-1"
            && filteredGroupReport.gate.counts.configuredScopes === 1
            && filteredGroupReport.gate.status === "blocked",
        projectAliasInvocationEvidence: verifiedReport.rows[0]?.invocation?.summary?.totalObserved === 2
            && verifiedReport.rows[0]?.invocation?.summary?.evidenceComplete === true,
        completionAuditCanReachCompleteWithFullEvidence: completionReadyAudit.schema === "ccm-mcp-skill-goal-completion-audit-v1"
            && completionReadyAudit.complete === true
            && completionReadyAudit.status === "complete"
            && completionReadyAudit.summary.missing === 0,
        completionAuditUsesFreshPersistedCliProbeEvidence: completionPersistedProbeAudit.complete === true
            && persistedProbeRequirement?.status === "proven"
            && persistedProbeRequirement?.evidence?.source === "input_probe_status"
            && persistedProbeRequirement?.evidence?.probes?.runtimes?.codex?.freshSuccesses === 1,
        completionAuditRejectsStaleCliProbeEvidence: completionStaleProbeAudit.complete === false
            && staleProbeRequirement?.status === "missing"
            && staleProbeRequirement?.evidence?.codex === false
            && staleProbeRequirement?.evidence?.probes?.runtimes?.codex?.latest?.status === "stale_ok",
        completionAuditKeepsGoalIncompleteWithoutRealCliAndMarketplaceEvidence: completionMissingAudit.complete === false
            && completionMissingAudit.status === "incomplete"
            && completionMissingAudit.requirements.some((item) => item.id === "real_cli_e2e" && item.status === "missing")
            && completionMissingAudit.requirements.some((item) => item.id === "marketplace_lifecycle_bridge" && item.status === "missing"),
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        reports: {
            verified: verifiedReport.gate,
            readyUnverified: readyUnverifiedReport.gate,
            blocked: blockedReport.gate,
            filteredGroup: filteredGroupReport.gate,
            completionReady: completionReadyAudit,
            completionPersistedProbe: completionPersistedProbeAudit,
            completionStaleProbe: completionStaleProbeAudit,
            completionMissing: completionMissingAudit,
        },
    };
}
// === 终端模拟器辅助函数 ===
function normalizeTerminalCwd(cwd) {
    const candidate = cwd && typeof cwd === "string" ? cwd : os.homedir();
    try {
        const stat = fs.statSync(candidate);
        if (stat.isDirectory())
            return candidate;
    }
    catch { }
    return os.homedir();
}
function splitTerminalCwd(output, marker) {
    const text = output || "";
    const markerIndex = text.lastIndexOf(marker);
    if (markerIndex < 0)
        return { output: text, cwd: null };
    const before = text.slice(0, markerIndex).replace(/(?:\r?\n)+$/, "");
    const after = text.slice(markerIndex + marker.length).trim();
    const firstLine = after.split(/\r?\n/)[0]?.trim() || null;
    return { output: before ? before + os.EOL : "", cwd: firstLine };
}
function runTerminalCommand(command, cwd) {
    const workDir = normalizeTerminalCwd(cwd);
    const marker = `__CCM_TERMINAL_CWD_${Date.now()}_${Math.random().toString(36).slice(2)}__`;
    const commonOptions = {
        encoding: "utf-8",
        cwd: workDir,
        timeout: 30000,
        maxBuffer: 5 * 1024 * 1024,
        windowsHide: true
    };
    const parseResult = (stdout, stderr = "", status = 0, error = null) => {
        const parsed = splitTerminalCwd(stdout, marker);
        const stderrText = String(stderr || "").trim();
        return {
            output: parsed.output,
            cwd: parsed.cwd && fs.existsSync(parsed.cwd) ? parsed.cwd : workDir,
            error: error?.message || (status ? `Exit code: ${status}` : "") || (stderrText ? stderrText : "")
        };
    };
    if (process.platform === "win32") {
        const script = [
            "[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new();",
            "$OutputEncoding = [System.Text.UTF8Encoding]::new();",
            command,
            `Write-Output "${marker}$((Get-Location).ProviderPath)"`
        ].join("\n");
        const result = (0, child_process_1.spawnSync)("powershell.exe", [
            "-NoLogo",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script
        ], commonOptions);
        return parseResult(result.stdout, result.stderr, result.status, result.error);
    }
    const script = `${command}\nprintf '\\n${marker}%s\\n' "$PWD"`;
    const result = (0, child_process_1.spawnSync)("bash", ["-lc", script], commonOptions);
    return parseResult(result.stdout, result.stderr, result.status, result.error);
}
// === 共享文件系统辅助函数 ===
function listSharedFiles() {
    (0, utils_1.ensureSharedDir)();
    return fs.readdirSync(utils_1.SHARED_DIR)
        .filter(f => !f.startsWith("."))
        .map(f => {
        const stat = fs.statSync(path.join(utils_1.SHARED_DIR, f));
        const ext = path.extname(f).toLowerCase();
        const type = (0, utils_1.isTextFileName)(f) ? "text" : (0, utils_1.isImageFileName)(f) ? "image" : (0, utils_1.isOoxmlFileName)(f) ? ext.slice(1) : "file";
        return { name: f, size: stat.size, modified: stat.mtime.toISOString(), type, path: path.join(utils_1.SHARED_DIR, f) };
    })
        .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
}
function readSharedFile(name) {
    const filePath = (0, utils_1.getSharedFilePath)(name);
    if (!filePath)
        return null;
    if (!fs.existsSync(filePath))
        return null;
    return (0, utils_1.describeFileFromPath)(filePath, path.basename(String(name)));
}
// 写入/创建共享文件
function writeSharedFile(name, content) {
    (0, utils_1.ensureSharedDir)();
    const filePath = (0, utils_1.getSharedFilePath)(name);
    if (filePath) {
        fs.writeFileSync(filePath, content);
    }
}
function saveSharedUpload(filename, buffer) {
    (0, utils_1.ensureSharedDir)();
    const safeName = filename.replace(/[<>:"/\\|?*]/g, "_");
    const filePath = path.join(utils_1.SHARED_DIR, safeName);
    fs.writeFileSync(filePath, buffer);
    return safeName;
}
function deleteSharedFile(name) {
    const filePath = path.join(utils_1.SHARED_DIR, name);
    if (fs.existsSync(filePath))
        fs.unlinkSync(filePath);
}
// 物理 Customizations Skills 路径
const customSkillRoots = [
    { root: db_1.SKILL_PACKAGES_DIR, source: "ccm" },
    { root: path.join(os.homedir(), ".gemini", "config", "skills"), source: "gemini" },
];
function skillTemplateRoot() {
    const configured = String(process.env.CCM_ROLE_SKILL_TEMPLATE_ROOT || "").trim();
    return configured
        ? path.resolve(configured)
        : path.resolve(__dirname, "..", "..", "..", "templates", "skills");
}
function readSkillManual(name) {
    const normalizedName = (0, tool_catalog_management_1.normalizeToolCatalogName)(name);
    const skill = (0, db_1.loadSkills)().find(item => String(item.name) === normalizedName);
    if (!skill)
        return null;
    let skillFile = "";
    if ((0, internal_skill_catalog_1.isCcmInternalSkillName)(normalizedName)) {
        skillFile = path.join(skillTemplateRoot(), normalizedName.toLowerCase(), "SKILL.md");
    }
    else if (skill?.packagePath) {
        const packageRoot = path.resolve(db_1.SKILL_PACKAGES_DIR);
        const packagePath = path.resolve(String(skill.packagePath));
        const relative = path.relative(packageRoot, packagePath);
        if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
            throw new Error("外部 Skill 手册路径不在受控目录中");
        }
        skillFile = path.join(packagePath, "SKILL.md");
    }
    let content = "";
    if (skillFile) {
        if (!fs.existsSync(skillFile))
            throw new Error(`Skill 手册不存在：${normalizedName}`);
        if (fs.statSync(skillFile).size > 1024 * 1024)
            throw new Error("Skill 手册超过 1 MB，无法在线查看");
        content = fs.readFileSync(skillFile, "utf-8");
    }
    else {
        content = `---\nname: ${normalizedName}\ndescription: ${String(skill.description || "").replace(/[\r\n]+/g, " ")}\n---\n\n${String(skill.prompt || "").trim()}`;
    }
    return {
        id: normalizedName,
        name: normalizedName,
        description: String(skill.description || ""),
        content,
        source: (0, internal_skill_catalog_1.isCcmInternalSkillName)(normalizedName) ? "ccm-internal" : String(skill.origin || "user"),
        readOnly: (0, internal_skill_catalog_1.isCcmInternalSkillName)(normalizedName) || skill.immutable === true,
    };
}
function loadCustomSkills() {
    const result = [];
    const seen = new Set();
    for (const source of customSkillRoots) {
        if (!fs.existsSync(source.root))
            continue;
        try {
            const folders = fs.readdirSync(source.root, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith("."));
            for (const folder of folders) {
                if ((0, internal_skill_catalog_1.isCcmInternalSkillName)(folder.name))
                    continue;
                const folderPath = path.join(source.root, folder.name);
                const skillMdPath = path.join(folderPath, "SKILL.md");
                if (!fs.existsSync(skillMdPath))
                    continue;
                const mdContent = fs.readFileSync(skillMdPath, "utf-8");
                let name = folder.name;
                let description = "";
                const fmMatch = mdContent.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/);
                const yamlText = fmMatch ? fmMatch[1] : mdContent.substring(0, 500);
                const nameMatch = yamlText.match(/^name:\s*(.*)$/mi);
                const descMatch = yamlText.match(/^description:\s*(.*)$/mi);
                if (nameMatch)
                    name = nameMatch[1].replace(/^['"]|['"]$/g, "").trim();
                if (descMatch)
                    description = descMatch[1].replace(/^['"]|['"]$/g, "").trim();
                if ((0, internal_skill_catalog_1.isCcmInternalSkillName)(name))
                    continue;
                if (seen.has(name))
                    continue;
                seen.add(name);
                result.push({
                    id: folder.name,
                    name,
                    description,
                    source: source.source,
                    packagePath: folderPath,
                    mdPath: skillMdPath,
                    content: mdContent
                });
            }
        }
        catch (e) {
            console.error(`加载 ${source.source} Skill 包失败:`, e);
        }
    }
    return result;
}
//# sourceMappingURL=tools-part-01-part-02.js.map