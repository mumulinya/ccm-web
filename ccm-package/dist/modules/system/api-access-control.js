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
exports.authorizeApiRequest = authorizeApiRequest;
exports.applySecurityHeaders = applySecurityHeaders;
exports.validateRequestHost = validateRequestHost;
exports.requestIsReadOnly = requestIsReadOnly;
exports.requestAccessPrincipal = requestAccessPrincipal;
const os = __importStar(require("os"));
const utils_1 = require("../../core/utils");
const local_auth_1 = require("./local-auth");
const internal_api_auth_1 = require("./internal-api-auth");
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const ADMIN_GET = [
    /^\/api\/auth\/(?:users|sessions)(?:\/|$)/,
    /^\/api\/(?:terminal|logs|security|credentials|cleanup)(?:\/|$)/,
    /^\/api\/(?:settings|orchestrator|agent-provider|development-agents)(?:\/|$)/,
    /^\/api\/system\/settings-status(?:\/|$)/,
    /^\/api\/tools\/(?:marketplace|catalog|authorization-inventory)(?:\/|$)/,
    /^\/api\/(?:marketplace|smithery)(?:\/|$)/,
    /^\/api\/reliability(?:\/|$)/,
    /^\/api\/navigation\/default(?:\/|$)/,
];
const OPERATOR_GET = [
    /^\/api\/metrics\/events(?:\/|$)/,
    /^\/api\/rag\/documents(?:\/|$)/,
    /^\/api\/rag\/chunks(?:\/|$)/,
    /^\/api\/rag\/document-content(?:\/|$)/,
    /^\/api\/rag\/document-versions(?:\/|$)/,
    /^\/api\/rag\/document-version-content(?:\/|$)/,
    /^\/api\/rag\/watch-paths(?:\/|$)/,
];
const VIEWER_CHAT = [
    /^\/api\/global-agent\/(?:chat|send|message)(?:\/|$)/,
    /^\/api\/send-stream(?:\/|$)/,
    /^\/api\/groups\/send(?:\/|$)/,
    /^\/api\/groups\/[^/]+\/(?:send|chat|message)(?:\/|$)/,
    /^\/api\/rag\/chat(?:\/|$)/,
];
const SELF_SERVICE_MUTATIONS = [
    /^\/api\/search\/favorites(?:\/|$)/,
    /^\/api\/slash-commands\/(?:resolve|confirm|records)$/,
    /^\/api\/conversations\/(?:branch|rewind\/preview|rewind\/apply|plan-mode|preferences)$/,
    /^\/api\/notifications\/(?:[^/]+\/(?:read|dismiss)|read-all)$/,
    /^\/api\/pets\/runtime\/deliveries\/[^/]+\/ack$/,
    /^\/api\/navigation\/config(?:\/|$)/,
];
const OPERATOR_MUTATIONS = [
    /^\/api\/automation-session(?:s|-bindings)(?:\/|$)/,
    /^\/api\/(?:tasks|requirements|workbench|missions|agent-qa|auto-dev|conversation-turns)(?:\/|$)/,
    /^\/api\/usability(?:\/|$)/,
    /^\/api\/(?:agent-runs|project-runs)\/(?:cancel|rollback)(?:\/|$)/,
    /^\/api\/global-agent\/(?:chat|send|message|missions|task)(?:\/|$)/,
    /^\/api\/send(?:-stream)?(?:\/|$)/,
    /^\/api\/groups\/(?:send|chat|sessions|tasks|attachments|shared)(?:\/|$)/,
    /^\/api\/groups\/[^/]+\/(?:send|chat|message|sessions|tasks|attachments)(?:\/|$)/,
    /^\/api\/projects\/(?:runtime|git|code|changes|send|sessions|session-runtime-event|main-agent|test-targets|attachments|shared|agent-connection)(?:\/|$)/,
    /^\/api\/sessions\/(?:create|delete|rename|clear|compact|message|messages)(?:\/|$)/,
    /^\/api\/(?:git|code-changes|attachments|uploads|shared|shared-files)(?:\/|$)/,
    /^\/api\/knowledge\/(?:upload|documents|query|chat)(?:\/|$)/,
    /^\/api\/rag\/(?:query|chat|upload|import-url|capture|metadata)(?:\/|$)/,
    /^\/api\/music\/(?:chat|search|playback|remote-command|queue|history|playlists)(?:\/|$)/,
];
const ADMIN_ONLY_MUTATIONS = [
    /^\/api\/tasks\/permission-requests\/(?:decide|approve|reject)(?:\/|$)/,
    /^\/api\/permissions(?:\/|$)/,
    /^\/api\/tasks\/(?:purge|logs\/clear|runtime-debt\/cleanup)(?:\/|$)/,
    /^\/api\/(?:reliability|cleanup)(?:\/|$)/,
];
const CAPABILITY_BY_OPERATOR_ROUTE = [
    { pattern: /^\/api\/projects\/runtime(?:\/|$)/, capability: "project.runtime" },
    { pattern: /^\/api\/(?:projects\/git|git|code-changes)(?:\/|$)/, capability: "project.git" },
    { pattern: /^\/api\/(?:attachments|uploads|shared-files)(?:\/|$)/, capability: "attachment.manage" },
    { pattern: /^\/api\/usability(?:\/|$)/, capability: "task.execute" },
];
function normalizedPath(pathname) {
    try {
        return new URL(pathname, "http://ccm.local").pathname;
    }
    catch {
        return pathname.split("?")[0] || "/";
    }
}
function matches(patterns, pathname) { return patterns.some(pattern => pattern.test(pathname)); }
function authorizeApiRequest(req, res, pathnameWithQuery) {
    const pathname = normalizedPath(pathnameWithQuery);
    const internal = (0, internal_api_auth_1.verifyInternalApiRequest)(req, pathnameWithQuery);
    if (internal) {
        if (matches(ADMIN_ONLY_MUTATIONS, pathname)) {
            (0, utils_1.sendJson)(res, { success: false, error: "高风险权限只能由已登录的 Admin 审批", code: "ADMIN_REQUIRED" }, 403);
            return false;
        }
        req.ccmAuth = { kind: "internal", caller: internal.caller, role: "internal", capabilities: ["internal.route"], readOnly: false };
        return true;
    }
    const auth = (0, local_auth_1.resolveLocalAuthSession)(req);
    if (!auth) {
        const code = String(req.ccmSessionError || "AUTH_REQUIRED");
        (0, utils_1.sendJson)(res, { success: false, error: code === "SESSION_CLIENT_MISMATCH" ? "登录环境发生变化，请重新登录" : "请先登录", code }, 401);
        return false;
    }
    const method = String(req.method || "GET").toUpperCase();
    if (!SAFE_METHODS.has(method) && !(0, local_auth_1.verifyBrowserCsrf)(req, auth)) {
        (0, utils_1.sendJson)(res, { success: false, error: "安全令牌无效，请刷新页面后重试", code: "CSRF_INVALID" }, 403);
        return false;
    }
    const role = auth.user.role;
    let allowed = role === "admin";
    let readOnly = false;
    if (SAFE_METHODS.has(method)) {
        allowed = role === "admin"
            || (!matches(ADMIN_GET, pathname) && (!matches(OPERATOR_GET, pathname) || role === "operator"));
    }
    else if (matches(SELF_SERVICE_MUTATIONS, pathname))
        allowed = true;
    else if (role === "operator" && !matches(ADMIN_ONLY_MUTATIONS, pathname) && matches(OPERATOR_MUTATIONS, pathname))
        allowed = true;
    else if (role === "viewer" && matches(VIEWER_CHAT, pathname)) {
        allowed = true;
        readOnly = true;
    }
    if (allowed && role === "operator") {
        const requirement = CAPABILITY_BY_OPERATOR_ROUTE.find(item => item.pattern.test(pathname));
        if (requirement && !auth.capabilities.includes(requirement.capability))
            allowed = false;
    }
    if (!allowed) {
        (0, utils_1.sendJson)(res, { success: false, error: role === "viewer" ? "当前账户仅允许查看和只读问答" : "当前账户没有执行此操作的权限", code: "RBAC_FORBIDDEN", required_role: role === "viewer" ? "operator" : "admin" }, 403);
        return false;
    }
    req.ccmAuth = { kind: "browser", userId: auth.user.id, role, capabilities: auth.capabilities, sessionId: auth.session.id, readOnly };
    return true;
}
function allowedHosts() {
    const hosts = new Set(["localhost", "127.0.0.1", "::1"]);
    const configured = String(process.env.CCM_HOST || "").trim().replace(/^\[|\]$/g, "");
    if (configured && configured !== "0.0.0.0" && configured !== "::")
        hosts.add(configured.toLowerCase());
    for (const rows of Object.values(os.networkInterfaces()))
        for (const row of rows || [])
            if (row.address)
                hosts.add(row.address.toLowerCase());
    for (const raw of String(process.env.CCM_PUBLIC_ORIGIN || "").split(",")) {
        const value = raw.trim();
        if (!value)
            continue;
        try {
            hosts.add(new URL(value).hostname.toLowerCase());
        }
        catch {
            hosts.add(value.split(":")[0].toLowerCase());
        }
    }
    return hosts;
}
function applySecurityHeaders(res) {
    res.setHeader("Content-Security-Policy", "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; font-src 'self' data:; connect-src 'self' ws: wss:");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
}
function validateRequestHost(req, res) {
    const raw = String(req.headers.host || "").trim();
    let hostname = "";
    try {
        hostname = new URL(`http://${raw}`).hostname.toLowerCase();
    }
    catch { }
    if (hostname && allowedHosts().has(hostname))
        return true;
    (0, utils_1.sendJson)(res, { success: false, error: "请求 Host 未被 CCM 授权", code: "HOST_NOT_ALLOWED" }, 421);
    return false;
}
function requestIsReadOnly(req) { return req.ccmAuth?.readOnly === true; }
function requestAccessPrincipal(req) { return req.ccmAuth || null; }
//# sourceMappingURL=api-access-control.js.map