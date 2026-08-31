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
exports.evaluateTestAgentCommandSideEffect = evaluateTestAgentCommandSideEffect;
exports.evaluateTestAgentHttpSideEffect = evaluateTestAgentHttpSideEffect;
exports.evaluateTestAgentBrowserSideEffect = evaluateTestAgentBrowserSideEffect;
exports.testAgentRiskLevel = testAgentRiskLevel;
exports.testAgentIsolationMode = testAgentIsolationMode;
exports.testAgentTestTenant = testAgentTestTenant;
exports.summarizeSideEffectPolicy = summarizeSideEffectPolicy;
/**
 * TestAgent verification side-effect policy.
 *
 * The verifier is allowed to keep complete observations in its in-memory
 * loop, but every executable surface is classified before it is run.  This
 * module intentionally has no process/network side effects; callers can use
 * it from the work-order planner, command runner, HTTP verifier and browser
 * verifier alike.
 */
const crypto = __importStar(require("crypto"));
const utils_1 = require("./utils");
const READ_ONLY_COMMANDS = [
    /^(?:git\s+(?:status|diff|log|show|rev-parse|branch(?:\s+--show-current)?))$/i,
    /^(?:node|nodejs)\s+(?:--check|--version|--help)\b/i,
    /^(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|check|lint|typecheck|build|dev|start|preview|serve)(?:\b|\s)/i,
    /^(?:python(?:3)?|pytest|ruby|go|cargo|dotnet)\s+(?:-m\s+)?(?:test|pytest|test\b|check|vet|build|test\s)/i,
    /^(?:tsc|eslint|vitest|jest|playwright|mocha|ava)\b/i,
];
const FORBIDDEN_COMMANDS = [
    /\b(?:npm|pnpm|yarn|bun)\s+(?:install|i|add|remove|uninstall|update|publish|link|run\s+(?:deploy|release|migrate|seed))\b/i,
    /\b(?:git)\s+(?:checkout|reset|clean|commit|merge|rebase|push|pull|fetch|branch\s+-(?:d|D)|worktree\s+(?:add|remove))\b/i,
    /\b(?:rm|rmdir|del|erase|format|diskpart|Remove-Item|Set-Content|Out-File|move|mv|copy|cp)\b/i,
    /\b(?:curl|wget|Invoke-WebRequest|Invoke-RestMethod)\b/i,
    /\b(?:docker|kubectl|helm|terraform)\s+(?:apply|destroy|delete|exec|run|push|deploy)\b/i,
    /(?:^|[;&|])\s*(?:shutdown|restart|reboot)\b/i,
    /(?:>|>>|\|\s*(?:tee|Set-Content)|\bbase64\s+-d\b)/i,
];
const MUTATING_BROWSER_ACTIONS = new Set([
    "click", "doubleClick", "rightClick", "fill", "selectOption", "check", "uncheck",
    "uploadFile", "dragTo", "setClipboard", "setCookie", "clearCookies", "setLocalStorage",
    "setSessionStorage", "clearStorage", "setOffline", "setOnline", "typeText", "press",
    "openApplication", "requestAccess", "evaluate",
]);
function normalizedRisk(value) {
    const v = String(value || "standard").trim().toLowerCase();
    return ["lightweight", "standard", "interactive", "critical"].includes(v) ? v : "standard";
}
function normalizedMode(value) {
    const v = String(value || "sandbox_preferred").trim().toLowerCase();
    if (v === "sandbox_required" || v === "required")
        return "controlled_worktree";
    if (v === "strict_allowlist" || v === "strict-readonly" || v === "readonly")
        return "readonly_allowlist";
    return ["sandbox_preferred", "controlled_worktree", "disposable_copy", "readonly_allowlist", "none"].includes(v)
        ? v
        : "sandbox_preferred";
}
function textChecksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function commandText(command) {
    return String(command || "").trim().replace(/\s+/g, " ");
}
function commandHasExplicitAllowlist(command, allowed) {
    if (!allowed.length)
        return false;
    const normalized = command.toLowerCase();
    return allowed.some(item => commandText(item).toLowerCase() === normalized);
}
/** Classify a command without executing it. */
function evaluateTestAgentCommandSideEffect(command, context = {}) {
    const normalized = commandText(command);
    if (!normalized)
        return { allowed: false, class: "forbidden", reason: "验证命令为空。", requiresSandbox: false, requiresTestTenant: false, mutating: false, normalized };
    if (FORBIDDEN_COMMANDS.some(pattern => pattern.test(normalized))) {
        return { allowed: false, class: "forbidden", reason: "命令包含安装、部署、Git写入、删除、网络下载或其他禁止副作用。", requiresSandbox: false, requiresTestTenant: false, mutating: true, normalized };
    }
    const explicit = commandHasExplicitAllowlist(normalized, (context.allowedCommands || []).map(commandText));
    const readOnly = explicit || READ_ONLY_COMMANDS.some(pattern => pattern.test(normalized));
    if (readOnly && /^(?:git\s+(?:status|diff|log|show|rev-parse|branch)|node\s+--(?:check|version|help))$/i.test(normalized)) {
        return { allowed: true, class: "read_only", reason: "命令属于只读源码/版本检查。", requiresSandbox: false, requiresTestTenant: false, mutating: false, normalized };
    }
    if (readOnly) {
        const sandboxReady = context.sandboxReady === true || ["controlled_worktree", "disposable_copy"].includes(normalizedMode(context.isolationMode));
        return {
            allowed: sandboxReady,
            class: "sandbox_write",
            reason: sandboxReady ? "验证脚本允许在隔离工作区执行。" : "构建、测试或 lint 可能写入缓存/报告，必须先准备隔离工作区。",
            requiresSandbox: true,
            requiresTestTenant: false,
            mutating: true,
            normalized,
        };
    }
    const sandboxReady = context.sandboxReady === true || ["controlled_worktree", "disposable_copy"].includes(normalizedMode(context.isolationMode));
    if (sandboxReady && !(0, utils_1.isUnsafeVerificationCommand)(normalized)) {
        return {
            allowed: true,
            class: "sandbox_write",
            reason: "命令通过TestAgent可执行白名单，并被限制在隔离工作区。",
            requiresSandbox: true,
            requiresTestTenant: false,
            mutating: true,
            normalized,
        };
    }
    return {
        allowed: false,
        class: "uncertain",
        reason: "无法证明命令属于受控只读验证白名单。",
        requiresSandbox: true,
        requiresTestTenant: false,
        mutating: true,
        normalized,
    };
}
function isPrivateOrMetadataHost(hostname) {
    const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (host === "169.254.169.254" || host === "metadata.google.internal" || host === "metadata" || host.endsWith(".internal"))
        return true;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1")
        return false;
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(?:1[6-9]|2\d|3[0-1])\./.test(host))
        return true;
    return false;
}
function hostAllowed(url, context) {
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        return { ok: false, reason: "URL 无效。" };
    }
    if (!/^https?:$/.test(parsed.protocol))
        return { ok: false, reason: "仅允许 HTTP/HTTPS 验证 URL。" };
    if (isPrivateOrMetadataHost(parsed.hostname)) {
        const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase());
        if (!local)
            return { ok: false, reason: "禁止访问云元数据、内部域名或未明确授权的私有网络地址。" };
    }
    const allowed = (context.allowedHosts || []).map(item => String(item || "").toLowerCase().trim()).filter(Boolean);
    if (allowed.length) {
        const host = parsed.hostname.toLowerCase();
        const matched = allowed.some(item => item === host || item === parsed.origin.toLowerCase() || (item.startsWith("*.") && host.endsWith(item.slice(1))));
        if (!matched)
            return { ok: false, reason: `目标主机不在测试允许列表：${host}` };
    }
    else if (!context.allowExternalHosts && !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase())) {
        return { ok: false, reason: "默认只允许本机测试服务；外部主机必须显式加入测试允许列表。" };
    }
    return { ok: true, reason: "URL 通过测试域名和网络安全门。" };
}
/** Classify an HTTP check, including write methods and host restrictions. */
function evaluateTestAgentHttpSideEffect(check, context = {}) {
    const method = String(check?.method || "GET").trim().toUpperCase();
    const url = String(check?.url || "").trim();
    const host = hostAllowed(url, context);
    if (!host.ok)
        return { allowed: false, class: "forbidden", reason: host.reason, requiresSandbox: false, requiresTestTenant: false, mutating: false, normalized: `${method} ${url}` };
    const readOnly = method === "GET" || method === "HEAD" || method === "OPTIONS";
    if (readOnly)
        return { allowed: true, class: "read_only", reason: host.reason, requiresSandbox: false, requiresTestTenant: false, mutating: false, normalized: `${method} ${url}` };
    const testTenant = context.testTenantPresent === true;
    const allowed = context.allowHttpMutation === true && testTenant && (context.sandboxReady === true || normalizedMode(context.isolationMode) !== "none");
    return {
        allowed,
        class: "tenant_write",
        reason: allowed ? "HTTP 写请求绑定测试租户并在隔离环境中执行。" : "HTTP 写请求必须显式允许、绑定测试租户并在隔离环境执行。",
        requiresSandbox: true,
        requiresTestTenant: true,
        mutating: true,
        normalized: `${method} ${url}`,
    };
}
/** Classify browser actions; navigation/assertion-only checks remain read-only. */
function evaluateTestAgentBrowserSideEffect(check, context = {}) {
    const actions = Array.isArray(check?.actions) ? check.actions : [];
    const mutating = actions.some(action => MUTATING_BROWSER_ACTIONS.has(String(action?.type || "")));
    const targetUrl = String(check?.url || "").trim();
    if (targetUrl) {
        const host = hostAllowed(targetUrl, context);
        if (!host.ok)
            return { allowed: false, class: "forbidden", reason: host.reason, requiresSandbox: false, requiresTestTenant: false, mutating, normalized: targetUrl };
    }
    if (!mutating)
        return { allowed: true, class: "read_only", reason: "浏览器检查仅导航、读取和断言。", requiresSandbox: false, requiresTestTenant: false, mutating: false, normalized: targetUrl };
    const tenant = context.testTenantPresent === true;
    const allowed = context.allowBrowserMutation === true && tenant && (context.sandboxReady === true || normalizedMode(context.isolationMode) !== "none");
    return {
        allowed,
        class: "tenant_write",
        reason: allowed ? "浏览器写动作绑定测试租户并在隔离环境中执行。" : "浏览器写动作必须显式允许、绑定测试租户并在隔离环境执行。",
        requiresSandbox: true,
        requiresTestTenant: true,
        mutating: true,
        normalized: targetUrl,
    };
}
function testAgentRiskLevel(workOrder) {
    return normalizedRisk(workOrder?.metadata?.riskLevel || workOrder?.metadata?.risk_level || workOrder?.riskLevel || workOrder?.risk_level || "standard");
}
function testAgentIsolationMode(workOrder) {
    return normalizedMode(workOrder?.metadata?.verificationHardening?.isolationMode
        || workOrder?.metadata?.verification_hardening?.isolation_mode
        || workOrder?.metadata?.isolationMode
        || workOrder?.options?.testAgentIsolationMode
        || "sandbox_preferred");
}
function testAgentTestTenant(workOrder) {
    const hardening = workOrder?.metadata?.verificationHardening || workOrder?.metadata?.verification_hardening || {};
    const tenant = hardening.testTenant || hardening.test_tenant || workOrder?.metadata?.testTenant || workOrder?.metadata?.test_tenant;
    if (tenant && typeof tenant === "object")
        return { present: Boolean(tenant.id || tenant.reference || tenant.name), reference: String(tenant.reference || tenant.id || tenant.name || "") };
    const env = workOrder?.projects?.some((project) => Object.keys(project?.env || {}).some(key => /(?:test|staging)[_.-]?tenant|tenant[_.-]?id/i.test(key) && String(project.env[key] || "").trim()));
    return { present: Boolean(env), reference: env ? "env-bound" : "" };
}
function summarizeSideEffectPolicy(input) {
    const context = input.context || {};
    const commands = (input.commands || []).map(item => ({ project: item.project || "", command: item.command, decision: evaluateTestAgentCommandSideEffect(item.command, context) }));
    const http = (input.httpChecks || []).map(item => ({ project: item.project || "", check: item.check, decision: evaluateTestAgentHttpSideEffect(item.check, context) }));
    const browser = (input.browserChecks || []).map(item => ({ project: item.project || "", check: item.check, decision: evaluateTestAgentBrowserSideEffect(item.check, context) }));
    const decisions = [...commands, ...http, ...browser].map(item => item.decision);
    return {
        schema: "ccm-test-agent-side-effect-policy-v1",
        allowed: decisions.every(item => item.allowed),
        blockedCount: decisions.filter(item => !item.allowed).length,
        mutatingCount: decisions.filter(item => item.mutating).length,
        decisions: { commands, http, browser },
        checksum: textChecksum({ commands, http: http.map(item => ({ project: item.project, check: item.check })), browser: browser.map(item => ({ project: item.project, check: item.check })) }),
    };
}
//# sourceMappingURL=side-effect-policy.js.map