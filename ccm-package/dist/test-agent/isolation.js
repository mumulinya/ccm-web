"use strict";
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
exports.testAgentPolicyContextFromWorkOrder = testAgentPolicyContextFromWorkOrder;
exports.prepareTestAgentIsolation = prepareTestAgentIsolation;
exports.runTestAgentIsolationSelfTest = runTestAgentIsolationSelfTest;
/**
 * TestAgent execution isolation and lifecycle.
 *
 * This module is deliberately independent from the command/HTTP/browser
 * runners.  A caller prepares a work order, receives an auditable receipt,
 * then asks the side-effect policy module whether each operation is safe.
 * Full command output and test data never enter the receipt.
 */
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const side_effect_policy_1 = require("./side-effect-policy");
const COPY_EXCLUDES = new Set([
    ".git", "node_modules", "dist", "build", "coverage", ".next", ".nuxt", ".output", ".cache", ".tmp",
]);
function canonical(value) {
    if (Array.isArray(value))
        return value.map(canonical);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).sort().reduce((out, key) => {
        if (value[key] !== undefined)
            out[key] = canonical(value[key]);
        return out;
    }, {});
}
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(canonical(value ?? null))).digest("hex");
}
function safeId(value, fallback = "run") {
    return String(value || fallback).replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 96) || fallback;
}
function now() { return new Date().toISOString(); }
function hasTenant(value) {
    return Boolean(value?.present || value?.id || value?.reference || value?.name);
}
function hardeningMetadata(workOrder) {
    return workOrder?.metadata?.verificationHardening || workOrder?.metadata?.verification_hardening || {};
}
function configuredWorktree(workOrder, project) {
    const hardening = hardeningMetadata(workOrder);
    const maps = [hardening.worktrees, hardening.executionWorktrees, workOrder?.metadata?.executionWorktrees, workOrder?.metadata?.execution_worktrees];
    for (const map of maps) {
        if (map && typeof map === "object" && typeof map[project] === "string" && map[project].trim())
            return path.resolve(map[project]);
        if (map && typeof map === "object" && map[project] && typeof map[project] === "object") {
            const candidate = map[project].workDir || map[project].work_dir || map[project].path;
            if (candidate)
                return path.resolve(String(candidate));
        }
    }
    return "";
}
function isSafeSandboxRoot(candidate) {
    if (!candidate)
        return false;
    const resolved = path.resolve(candidate);
    const temp = path.resolve(os.tmpdir());
    const ccm = path.resolve(process.env.CCM_DIR || path.join(os.homedir(), ".cc-connect"));
    const inside = (root) => {
        const relative = path.relative(root, resolved);
        return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
    };
    return inside(temp) || inside(path.join(ccm, "test-agent-sandboxes"));
}
function gitHead(workDir) {
    try {
        const result = (0, child_process_1.spawnSync)("git", ["rev-parse", "HEAD"], { cwd: workDir, encoding: "utf8", windowsHide: true, timeout: 5000 });
        return result.status === 0 ? String(result.stdout || "").trim() : "";
    }
    catch {
        return "";
    }
}
function looksControlledWorktree(workDir, workOrder, project) {
    const configured = configuredWorktree(workOrder, project);
    if (configured && path.resolve(configured) === path.resolve(workDir))
        return true;
    const flag = hardeningMetadata(workOrder)?.controlledWorktree || hardeningMetadata(workOrder)?.controlled_worktree;
    if (flag === true)
        return true;
    const normalized = workDir.replace(/\\/g, "/").toLowerCase();
    return normalized.includes("/.ccm-worktrees/") || normalized.includes("/ccm-worktrees/") || normalized.includes("/.ccm/worktrees/") || normalized.includes("/.cc-connect/worktrees/");
}
function copyFilter(source) {
    const relative = path.relative(source, source).replace(/\\/g, "/");
    if (!relative)
        return true;
    return !relative.split("/").some(part => COPY_EXCLUDES.has(part));
}
function copyProject(source, destination) {
    fs.mkdirSync(destination, { recursive: true });
    // Node 20's cpSync filter gives us a bounded copy without ever copying the
    // repository's .git metadata or dependency/build caches.
    fs.cpSync(source, destination, {
        recursive: true,
        force: false,
        errorOnExist: false,
        dereference: false,
        filter: (sourcePath) => {
            const relative = path.relative(source, sourcePath).replace(/\\/g, "/");
            return !relative.split("/").some(part => part && COPY_EXCLUDES.has(part));
        },
    });
    for (const name of ["node_modules", ".venv", "venv"]) {
        const dependencySource = path.join(source, name);
        const dependencyTarget = path.join(destination, name);
        try {
            if (!fs.existsSync(dependencySource) || fs.existsSync(dependencyTarget) || !fs.statSync(dependencySource).isDirectory())
                continue;
            fs.symlinkSync(dependencySource, dependencyTarget, process.platform === "win32" ? "junction" : "dir");
        }
        catch {
            // Missing shared dependencies make the verification command fail with
            // normal evidence; they never justify copying or modifying dependencies.
        }
    }
}
function buildPolicyContext(workOrder, options, receipt) {
    const tenant = options.testTenant || (0, side_effect_policy_1.testAgentTestTenant)(workOrder);
    const hardening = hardeningMetadata(workOrder);
    return {
        riskLevel: receipt.riskLevel,
        isolationMode: receipt.mode,
        sandboxReady: ["controlled_worktree", "disposable_copy"].includes(receipt.mode),
        testTenantPresent: hasTenant(tenant),
        allowedHosts: options.allowedHosts || hardening.allowedHosts || hardening.allowed_hosts || [],
        allowExternalHosts: options.allowExternalHosts === true || hardening.allowExternalHosts === true || hardening.allow_external_hosts === true,
        allowHttpMutation: options.allowHttpMutation === true || hardening.allowHttpMutation === true || hardening.allow_http_mutation === true,
        allowBrowserMutation: options.allowBrowserMutation === true || hardening.allowBrowserMutation === true || hardening.allow_browser_mutation === true,
        allowedCommands: hardening.allowedCommands || hardening.allowed_commands || [],
    };
}
/** Reconstruct the policy context from a persisted v1 isolation receipt. */
function testAgentPolicyContextFromWorkOrder(workOrder) {
    const hardening = hardeningMetadata(workOrder);
    const receipt = hardening?.isolationReceipt || hardening?.isolation_receipt || workOrder?.metadata?.isolationReceipt || workOrder?.metadata?.isolation_receipt;
    if (!receipt || receipt.schema !== "ccm-test-agent-isolation-receipt-v1")
        return null;
    return {
        riskLevel: receipt.riskLevel || hardening.riskLevel || "standard",
        isolationMode: receipt.mode || "none",
        sandboxReady: receipt.status === "ready" && ["controlled_worktree", "disposable_copy"].includes(String(receipt.mode)),
        testTenantPresent: receipt.testTenant?.present === true,
        allowedHosts: Array.isArray(receipt.networkPolicy?.allowedHosts) ? receipt.networkPolicy.allowedHosts : [],
        allowExternalHosts: receipt.networkPolicy?.externalHosts === true,
        allowHttpMutation: hardening.allowHttpMutation === true || hardening.allow_http_mutation === true,
        allowBrowserMutation: hardening.allowBrowserMutation === true || hardening.allow_browser_mutation === true,
        allowedCommands: hardening.allowedCommands || hardening.allowed_commands || [],
    };
}
function buildInitialDecisions(workOrder, context) {
    const commands = workOrder.projects.flatMap(project => project.verificationCommands.map(command => ({ project: project.name, command })));
    const httpChecks = workOrder.projects.flatMap(project => [...project.httpChecks, ...project.adversarialHttpChecks].map(check => ({ project: project.name, check })));
    const browserChecks = workOrder.projects.flatMap(project => [...project.browserChecks, ...project.adversarialBrowserChecks].map(check => ({ project: project.name, check })));
    return (0, side_effect_policy_1.summarizeSideEffectPolicy)({ commands, httpChecks, browserChecks, context });
}
function asReceipt(value) {
    const base = {
        schema: "ccm-test-agent-isolation-receipt-v1",
        id: String(value.id || `iso_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`),
        workOrderId: String(value.workOrderId || ""),
        taskId: String(value.taskId || ""),
        groupId: String(value.groupId || ""),
        riskLevel: (value.riskLevel || "standard"),
        requestedMode: (value.requestedMode || "sandbox_preferred"),
        mode: (value.mode || "blocked"),
        status: (value.status || "blocked"),
        reason: String(value.reason || ""),
        projectBindings: Array.isArray(value.projectBindings) ? value.projectBindings : [],
        sandboxId: value.sandboxId || "",
        sandboxRoot: value.sandboxRoot || "",
        testTenant: value.testTenant || { present: false, referenceChecksum: "" },
        networkPolicy: value.networkPolicy || { allowedHosts: [], externalHosts: false, metadataBlocked: true },
        credentialReferenceChecksum: String(value.credentialReferenceChecksum || ""),
        sideEffectPolicyChecksum: String(value.sideEffectPolicyChecksum || ""),
        sideEffectState: (value.sideEffectState || "uncertain"),
        cleanup: value.cleanup || { required: false, status: "not_required" },
        contentStored: false,
        createdAt: String(value.createdAt || now()),
        updatedAt: String(value.updatedAt || now()),
    };
    return { ...base, checksum: checksum(base) };
}
function sideEffectState(summary) {
    const decisions = [
        ...(summary?.decisions?.commands || []),
        ...(summary?.decisions?.http || []),
        ...(summary?.decisions?.browser || []),
    ].map((row) => row.decision);
    if (!decisions.length)
        return "none";
    if (decisions.some((item) => item.class === "uncertain" || item.class === "forbidden"))
        return "uncertain";
    if (decisions.some((item) => item.class === "tenant_write"))
        return "known_write";
    if (decisions.some((item) => item.class === "sandbox_write"))
        return "known_write";
    return "read_only";
}
/**
 * Prepare a work order for verification.  The default does not copy user
 * files; it uses an already-created CCM worktree where available and falls
 * back to a strictly read-only allowlist for lightweight/standard checks.
 * Copy-on-write is opt-in through `createDisposableCopies` or mode.
 */
async function prepareTestAgentIsolation(input, options = {}) {
    const workOrder = {
        ...input,
        projects: input.projects.map(project => ({ ...project, env: { ...(project.env || {}) } })),
        metadata: { ...(input.metadata || {}) },
    };
    const riskLevel = (options.riskLevel || (0, side_effect_policy_1.testAgentRiskLevel)(workOrder));
    const rawRequestedMode = String(options.mode || (0, side_effect_policy_1.testAgentIsolationMode)(workOrder));
    const requestedMode = (rawRequestedMode === "sandbox_required"
        ? "disposable_copy"
        : rawRequestedMode === "strict_allowlist"
            ? "readonly_allowlist"
            : rawRequestedMode);
    const tenant = options.testTenant || (0, side_effect_policy_1.testAgentTestTenant)(workOrder);
    const sandboxRoot = path.resolve(options.sandboxRoot || process.env.CCM_TEST_AGENT_SANDBOX_ROOT || path.join(os.tmpdir(), "ccm-test-agent-sandboxes"));
    const allControlledAtStart = workOrder.projects.length > 0
        && workOrder.projects.every(project => looksControlledWorktree(project.workDir, workOrder, project.name));
    const canCreateCopy = options.createDisposableCopies === true
        || requestedMode === "disposable_copy"
        || (requestedMode === "sandbox_preferred" && !allControlledAtStart);
    const projectBindings = [];
    const createdPaths = [];
    let mode = "none";
    let status = "degraded";
    let reason = "未创建临时副本；仅允许通过只读验证白名单的操作。";
    if (canCreateCopy && !isSafeSandboxRoot(sandboxRoot)) {
        status = "blocked";
        mode = "blocked";
        reason = "配置的 sandboxRoot 不在系统临时目录或 CCM 专用目录内。";
    }
    else if (canCreateCopy) {
        mode = "disposable_copy";
        status = "ready";
        reason = "已为 TestAgent 准备 disposable copy-on-write 工作区。";
        try {
            for (const project of workOrder.projects) {
                const source = path.resolve(project.workDir);
                if (!fs.existsSync(source) || !fs.statSync(source).isDirectory())
                    throw new Error(`项目工作目录不可用：${project.name}`);
                const sandboxId = `${safeId(workOrder.taskId || workOrder.id || options.executionId, "task")}_${safeId(project.name, "project")}_${crypto.randomBytes(3).toString("hex")}`;
                const destination = path.join(sandboxRoot, sandboxId);
                copyProject(source, destination);
                createdPaths.push(destination);
                project.workDir = destination;
                projectBindings.push({ project: project.name, sourceWorkDir: source, executionWorkDir: destination, mode, sandboxId, sourceChecksum: gitHead(source), copied: true });
            }
        }
        catch (error) {
            for (const created of createdPaths) {
                try {
                    fs.rmSync(created, { recursive: true, force: true });
                }
                catch { }
            }
            status = "blocked";
            mode = "blocked";
            reason = `无法创建 disposable 工作区：${String(error?.message || error).slice(0, 300)}`;
            workOrder.projects.forEach(project => projectBindings.push({ project: project.name, sourceWorkDir: path.resolve(project.workDir), executionWorkDir: path.resolve(project.workDir), mode: "none", copied: false }));
        }
    }
    else {
        const allControlled = allControlledAtStart;
        if (allControlled) {
            mode = "controlled_worktree";
            status = "ready";
            reason = "使用 CCM 已创建并绑定的受控 worktree。";
        }
        else if (String(requestedMode) === "controlled_worktree" || String(requestedMode) === "disposable_copy") {
            mode = "blocked";
            status = "blocked";
            reason = "工作单要求隔离工作区，但当前没有可验证的 CCM worktree。";
        }
        else {
            mode = "readonly_allowlist";
            status = options.allowReadonlyFallback === false || riskLevel === "critical" ? "blocked" : "degraded";
            reason = status === "blocked" ? "当前没有隔离工作区，风险等级不允许只读降级。" : "没有隔离工作区，降级为严格只读验证白名单。";
        }
        for (const project of workOrder.projects) {
            projectBindings.push({ project: project.name, sourceWorkDir: path.resolve(project.workDir), executionWorkDir: path.resolve(project.workDir), mode: mode === "blocked" ? "none" : mode, sourceChecksum: gitHead(project.workDir), copied: false });
        }
    }
    const modeValue = String(mode);
    if ((riskLevel === "interactive" || riskLevel === "critical") && modeValue !== "controlled_worktree" && modeValue !== "disposable_copy") {
        status = "blocked";
        mode = "blocked";
        reason = "交互或高风险验收必须使用隔离工作区。";
    }
    if ((riskLevel === "interactive" || riskLevel === "critical") && !hasTenant(tenant)) {
        // Read-only interactive checks can still be useful in a controlled local
        // environment, but mutating checks are blocked by the side-effect policy.
        reason += " 未绑定测试租户，所有写入型 HTTP/浏览器动作将被阻断。";
    }
    const provisional = asReceipt({
        workOrderId: workOrder.id,
        taskId: workOrder.taskId,
        groupId: workOrder.groupId,
        riskLevel,
        requestedMode,
        mode,
        status,
        reason,
        projectBindings,
        sandboxId: projectBindings.find(item => item.sandboxId)?.sandboxId || "",
        sandboxRoot: createdPaths.length ? sandboxRoot : "",
        testTenant: { present: hasTenant(tenant), referenceChecksum: checksum(String(tenant?.reference || tenant?.id || tenant?.name || "")) },
        networkPolicy: { allowedHosts: (options.allowedHosts || []).map(String).filter(Boolean).sort(), externalHosts: options.allowExternalHosts === true, metadataBlocked: true },
        credentialReferenceChecksum: checksum(options.credentialReference || hardeningMetadata(workOrder).credentialReference || hardeningMetadata(workOrder).credential_reference || ""),
        sideEffectState: "uncertain",
        cleanup: { required: createdPaths.length > 0, status: createdPaths.length ? "pending" : "not_required" },
    });
    const policyContext = buildPolicyContext(workOrder, options, provisional);
    const summary = buildInitialDecisions(workOrder, policyContext);
    const finalStatus = provisional.status === "blocked" || !summary.allowed && (riskLevel === "critical" || mode === "blocked") ? "blocked" : provisional.status;
    const receipt = asReceipt({
        ...provisional,
        status: finalStatus,
        reason: !summary.allowed && finalStatus === "blocked" ? `${provisional.reason} 存在 ${summary.blockedCount} 个未通过副作用安全门的检查。` : provisional.reason,
        sideEffectPolicyChecksum: summary.checksum,
        sideEffectState: sideEffectState(summary),
    });
    workOrder.metadata = {
        ...(workOrder.metadata || {}),
        verificationHardening: {
            ...(hardeningMetadata(workOrder) || {}),
            isolationReceipt: receipt,
            isolationMode: receipt.mode,
            riskLevel,
            sideEffectPolicy: summary,
        },
    };
    const cleanup = async () => {
        let next = asReceipt({ ...receipt, status: "cleanup_pending", cleanup: { required: createdPaths.length > 0, status: createdPaths.length ? "pending" : "not_required" }, updatedAt: now() });
        if (!createdPaths.length) {
            const next = asReceipt({
                ...receipt,
                status: receipt.status === "blocked" ? "blocked" : "cleanup_passed",
                cleanup: { required: false, status: "not_required" },
                updatedAt: now(),
            });
            workOrder.metadata = { ...(workOrder.metadata || {}), verificationHardening: { ...(hardeningMetadata(workOrder) || {}), isolationReceipt: next } };
            return next;
        }
        try {
            for (const created of createdPaths) {
                const resolved = path.resolve(created);
                const relative = path.relative(path.resolve(sandboxRoot), resolved);
                if (relative.startsWith("..") || path.isAbsolute(relative) || !resolved.startsWith(path.resolve(sandboxRoot)))
                    throw new Error("清理路径越过 sandboxRoot");
                fs.rmSync(resolved, { recursive: true, force: true });
            }
            next = asReceipt({ ...receipt, status: "cleanup_passed", cleanup: { required: true, status: "passed" }, updatedAt: now() });
        }
        catch (error) {
            next = asReceipt({ ...receipt, status: "cleanup_failed", cleanup: { required: true, status: "failed", reason: String(error?.message || error).slice(0, 300) }, updatedAt: now() });
        }
        workOrder.metadata = { ...(workOrder.metadata || {}), verificationHardening: { ...(hardeningMetadata(workOrder) || {}), isolationReceipt: next } };
        return next;
    };
    return {
        schema: "ccm-test-agent-isolation-session-v1",
        workOrder,
        receipt,
        policyContext,
        validateCommand: (_project, command) => (0, side_effect_policy_1.evaluateTestAgentCommandSideEffect)(command, policyContext),
        validateHttpCheck: (_project, check) => (0, side_effect_policy_1.evaluateTestAgentHttpSideEffect)(check, policyContext),
        validateBrowserCheck: (_project, check) => (0, side_effect_policy_1.evaluateTestAgentBrowserSideEffect)(check, policyContext),
        cleanup,
    };
}
function runTestAgentIsolationSelfTest() {
    const context = {
        riskLevel: "standard",
        isolationMode: "disposable_copy",
        sandboxReady: true,
        testTenantPresent: true,
        allowedHosts: ["localhost"],
        allowHttpMutation: true,
        allowBrowserMutation: true,
    };
    const safe = (0, side_effect_policy_1.evaluateTestAgentCommandSideEffect)("npm run check", context);
    const install = (0, side_effect_policy_1.evaluateTestAgentCommandSideEffect)("npm install example", context);
    const metadata = (0, side_effect_policy_1.evaluateTestAgentHttpSideEffect)({ name: "metadata", url: "http://169.254.169.254/latest/meta-data", method: "GET" }, context);
    return { pass: safe.allowed && !install.allowed && !metadata.allowed, safe, install, metadata };
}
//# sourceMappingURL=isolation.js.map