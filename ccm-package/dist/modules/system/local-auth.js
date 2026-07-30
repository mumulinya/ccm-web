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
exports.getOrCreateLocalSetupCode = getOrCreateLocalSetupCode;
exports.resolveLocalAuthSession = resolveLocalAuthSession;
exports.verifyBrowserCsrf = verifyBrowserCsrf;
exports.roleCapabilities = roleCapabilities;
exports.hasAuthCapability = hasAuthCapability;
exports.browserApiAccessAllowed = browserApiAccessAllowed;
exports.listActiveLocalAuthUsers = listActiveLocalAuthUsers;
exports.listActiveAdminUserIds = listActiveAdminUserIds;
exports.localAuthPublicState = localAuthPublicState;
exports.handleLocalAuthApi = handleLocalAuthApi;
exports.localAuthStorageFiles = localAuthStorageFiles;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const utils_1 = require("../../core/utils");
const AUTH_DIR = path.join(utils_1.CCM_DIR, "auth");
const USERS_FILE = path.join(AUTH_DIR, "users.json");
const SESSIONS_FILE = path.join(AUTH_DIR, "sessions.json");
const SETUP_STATE_FILE = path.join(AUTH_DIR, "setup-code.json");
const SETUP_CODE_FILE = path.join(AUTH_DIR, "setup-code.txt");
const RATE_LIMIT_FILE = path.join(AUTH_DIR, "login-rate-limit.json");
const LEGACY_PASSWORD_FILE = path.join(AUTH_DIR, "initial-admin-password.txt");
const SESSION_COOKIE = "ccm_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SETUP_TTL_MS = 24 * 60 * 60 * 1000;
const SCRYPT_KEY_BYTES = 64;
const MAX_RATE_ENTRIES = 5_000;
const ROLE_CAPABILITIES = {
    viewer: ["read", "chat.read_only"],
    operator: ["read", "chat.read_only", "task.execute", "project.runtime", "project.git", "attachment.manage"],
    admin: ["read", "chat.read_only", "task.execute", "project.runtime", "project.git", "attachment.manage", "project.define", "terminal.manage", "agent.credentials", "tools.manage", "cleanup.permanent", "permission.high_risk", "security.manage"],
};
let usersReadCache = null;
let sessionsReadCache = null;
function now() { return new Date().toISOString(); }
function ensureAuthDir() { fs.mkdirSync(AUTH_DIR, { recursive: true }); try {
    fs.chmodSync(AUTH_DIR, 0o700);
}
catch { } }
function fileSignature(file) { try {
    const stat = fs.statSync(file);
    return { mtimeMs: stat.mtimeMs, size: stat.size };
}
catch (error) {
    return String(error?.code || "") === "ENOENT" ? { mtimeMs: -1, size: -1 } : null;
} }
function normalizedUsername(value) { return String(value || "").normalize("NFKC").trim().toLocaleLowerCase("en-US"); }
function normalizeRole(value) { return value === "admin" || value === "operator" ? value : "viewer"; }
function normalizeLoginTheme(value) { return ["command", "minimal", "light"].includes(String(value || "")) ? value : "command"; }
function validateLoginTheme(value) { const theme = String(value || ""); if (!["command", "minimal", "light"].includes(theme))
    throw new Error("登录主题无效"); return theme; }
function validateRole(value) { if (!['viewer', 'operator', 'admin'].includes(String(value || '')))
    throw new Error("账户角色无效"); return value; }
function validateUsername(value) { const username = String(value || "").normalize("NFKC").trim(); if (!/^[\p{L}\p{N}_.-]{3,32}$/u.test(username))
    throw new Error("用户名需为 3～32 个字符，只能包含文字、数字、点、下划线或短横线"); return username; }
function validatePassword(value) { const password = String(value || ""); if (password.length < 8 || password.length > 128)
    throw new Error("密码长度需为 8～128 个字符"); return password; }
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function hashPassword(password, salt = crypto.randomBytes(16).toString("base64")) {
    const hash = crypto.scryptSync(password, Buffer.from(salt, "base64"), SCRYPT_KEY_BYTES, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return { algorithm: "scrypt", salt, hash: hash.toString("base64") };
}
function passwordMatches(password, stored) {
    if (!stored || stored.algorithm !== "scrypt")
        return false;
    try {
        const actual = Buffer.from(hashPassword(password, stored.salt).hash, "base64");
        const expected = Buffer.from(stored.hash, "base64");
        return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
    }
    catch {
        return false;
    }
}
function emptyUserStore() { return { schema: "ccm-local-auth-users-v2", registrationEnabled: false, onboardingCompleted: false, loginTheme: "command", users: [], updatedAt: now() }; }
function emptySessionStore() { return { schema: "ccm-local-auth-sessions-v2", sessions: [], updatedAt: now() }; }
function saveUsers(store) { ensureAuthDir(); (0, atomic_json_file_1.writeJsonAtomic)(USERS_FILE, { ...store, schema: "ccm-local-auth-users-v2", updatedAt: now() }); try {
    fs.chmodSync(USERS_FILE, 0o600);
}
catch { } usersReadCache = null; }
function saveSessions(store) { ensureAuthDir(); (0, atomic_json_file_1.writeJsonAtomic)(SESSIONS_FILE, { ...store, schema: "ccm-local-auth-sessions-v2", updatedAt: now() }); try {
    fs.chmodSync(SESSIONS_FILE, 0o600);
}
catch { } sessionsReadCache = null; }
function readUsersUnlocked() {
    ensureAuthDir();
    const raw = (0, atomic_json_file_1.readJsonWithBackup)(USERS_FILE, emptyUserStore());
    const users = (Array.isArray(raw?.users) ? raw.users : []).map((item) => ({
        ...item,
        id: String(item.id || `usr_${crypto.randomUUID()}`),
        username: String(item.username || ""),
        normalizedUsername: normalizedUsername(item.normalizedUsername || item.username),
        role: normalizeRole(item.role),
        createdAt: String(item.createdAt || now()),
        updatedAt: String(item.updatedAt || item.createdAt || now()),
    })).filter((item) => item.username && item.password?.hash);
    const store = {
        schema: "ccm-local-auth-users-v2",
        registrationEnabled: raw?.registrationEnabled === true,
        onboardingCompleted: users.length > 0 || raw?.onboardingCompleted === true,
        loginTheme: normalizeLoginTheme(raw?.loginTheme),
        users,
        updatedAt: String(raw?.updatedAt || now()),
    };
    if (raw?.schema !== store.schema && fs.existsSync(USERS_FILE))
        saveUsers(store);
    if (!users.length)
        ensureSetupCode(false);
    return store;
}
function readSessionsUnlocked() {
    ensureAuthDir();
    const raw = (0, atomic_json_file_1.readJsonWithBackup)(SESSIONS_FILE, emptySessionStore());
    const current = Date.now();
    let changed = raw?.schema !== "ccm-local-auth-sessions-v2";
    const sessions = (Array.isArray(raw?.sessions) ? raw.sessions : []).map((item) => {
        const createdAt = String(item.createdAt || now());
        const migrated = {
            id: String(item.id || `ses_${crypto.randomUUID()}`), tokenHash: String(item.tokenHash || ""), userId: String(item.userId || ""),
            csrfToken: String(item.csrfToken || crypto.randomBytes(24).toString("base64url")),
            clientFingerprintHash: String(item.clientFingerprintHash || (item.userAgentHash ? `legacy:${item.userAgentHash}` : "")),
            createdAt, lastSeenAt: String(item.lastSeenAt || createdAt), expiresAt: String(item.expiresAt || createdAt),
            ...(item.revokedAt ? { revokedAt: String(item.revokedAt), revokedReason: String(item.revokedReason || "") } : {}),
        };
        if (!item.csrfToken || !item.clientFingerprintHash || !item.lastSeenAt)
            changed = true;
        return migrated;
    }).filter(item => item.tokenHash && item.userId && Date.parse(item.expiresAt) > current && !item.revokedAt);
    if (sessions.length !== (raw?.sessions || []).length)
        changed = true;
    const store = { schema: "ccm-local-auth-sessions-v2", sessions, updatedAt: String(raw?.updatedAt || now()) };
    if (changed && fs.existsSync(SESSIONS_FILE))
        saveSessions(store);
    return store;
}
function loadUsers() { return (0, atomic_json_file_1.withFileLock)(USERS_FILE, readUsersUnlocked); }
function loadSessions() { return (0, atomic_json_file_1.withFileLock)(SESSIONS_FILE, readSessionsUnlocked); }
function peekUsers() { const signature = fileSignature(USERS_FILE); if (signature && usersReadCache && usersReadCache.mtimeMs === signature.mtimeMs && usersReadCache.size === signature.size)
    return usersReadCache.value; const value = loadUsers(); usersReadCache = signature ? { value, ...signature } : null; return value; }
function peekSessions() { const signature = fileSignature(SESSIONS_FILE); if (signature && sessionsReadCache && sessionsReadCache.mtimeMs === signature.mtimeMs && sessionsReadCache.size === signature.size)
    return sessionsReadCache.value; const value = loadSessions(); sessionsReadCache = signature ? { value, ...signature } : null; return value; }
function generateSetupCode() { return crypto.randomBytes(9).toString("base64url").replace(/[-_]/g, "").slice(0, 12).toUpperCase(); }
function readSetupState() { return (0, atomic_json_file_1.readJsonWithBackup)(SETUP_STATE_FILE, null); }
function ensureSetupCode(rotate) {
    ensureAuthDir();
    if (peekUsersSafe().users.length)
        throw new Error("已有账户，不能生成首次安装码");
    const current = readSetupState();
    if (!rotate && current && !current.consumedAt && Date.parse(current.expiresAt) > Date.now())
        return null;
    const code = generateSetupCode();
    const state = { schema: "ccm-local-auth-setup-code-v1", hash: sha256(code), createdAt: now(), expiresAt: new Date(Date.now() + SETUP_TTL_MS).toISOString() };
    (0, atomic_json_file_1.writeJsonAtomic)(SETUP_STATE_FILE, state);
    fs.writeFileSync(SETUP_CODE_FILE, `${code}\n`, { encoding: "utf-8", mode: 0o600 });
    try {
        fs.chmodSync(SETUP_STATE_FILE, 0o600);
        fs.chmodSync(SETUP_CODE_FILE, 0o600);
    }
    catch { }
    return { code, expires_at: state.expiresAt };
}
function peekUsersSafe() {
    if (!fs.existsSync(USERS_FILE))
        return emptyUserStore();
    const raw = (0, atomic_json_file_1.readJsonWithBackup)(USERS_FILE, emptyUserStore());
    return { ...emptyUserStore(), ...raw, users: Array.isArray(raw?.users) ? raw.users : [] };
}
function getOrCreateLocalSetupCode(options = {}) {
    const created = ensureSetupCode(options.rotate === true);
    if (created)
        return created;
    const state = readSetupState();
    const code = fs.existsSync(SETUP_CODE_FILE) ? fs.readFileSync(SETUP_CODE_FILE, "utf-8").trim() : "";
    if (!state || !code || sha256(code) !== state.hash || Date.parse(state.expiresAt) <= Date.now())
        return ensureSetupCode(true);
    return { code, expires_at: state.expiresAt };
}
function consumeSetupCode(value) {
    const code = String(value || "").trim().toUpperCase();
    const state = readSetupState();
    if (!state || state.consumedAt || Date.parse(state.expiresAt) <= Date.now())
        throw new Error("安装码已过期，请在服务器运行 ccm setup-code --rotate");
    const supplied = Buffer.from(sha256(code));
    const expected = Buffer.from(state.hash);
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected))
        throw new Error("安装码不正确");
    (0, atomic_json_file_1.writeJsonAtomic)(SETUP_STATE_FILE, { ...state, consumedAt: now() });
    try {
        fs.unlinkSync(SETUP_CODE_FILE);
    }
    catch { }
}
function publicUser(user) { return user ? { id: user.id, username: user.username, role: user.role, disabled_at: user.disabledAt || null, created_at: user.createdAt, updated_at: user.updatedAt } : null; }
function parseCookies(req) { const values = {}; for (const entry of String(req.headers.cookie || "").split(";")) {
    const index = entry.indexOf("=");
    if (index <= 0)
        continue;
    try {
        values[entry.slice(0, index).trim()] = decodeURIComponent(entry.slice(index + 1).trim());
    }
    catch { }
} return values; }
function clientFingerprint(req) { return sha256([String(req.headers["user-agent"] || ""), String(req.headers["accept-language"] || ""), String(req.headers["sec-ch-ua-platform"] || "")].join("\n")).slice(0, 32); }
function setSessionCookie(req, res, token, maxAgeSeconds) { const secure = !!req.socket?.encrypted || String(req.headers["x-forwarded-proto"] || "").toLowerCase() === "https"; const parts = [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, "Path=/", "HttpOnly", "SameSite=Strict", `Max-Age=${Math.max(0, maxAgeSeconds)}`]; if (secure)
    parts.push("Secure"); res.setHeader("Set-Cookie", parts.join("; ")); res.setHeader("Cache-Control", "no-store"); }
function createSession(req, res, user) {
    const token = crypto.randomBytes(32).toString("base64url");
    const createdAt = now();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    const csrfToken = crypto.randomBytes(24).toString("base64url");
    let sessionId = "";
    (0, atomic_json_file_1.withFileLock)(SESSIONS_FILE, () => { const store = readSessionsUnlocked(); const sessions = store.sessions.filter(item => item.userId !== user.id).concat(store.sessions.filter(item => item.userId === user.id).slice(-19)); sessionId = `ses_${crypto.randomUUID()}`; sessions.push({ id: sessionId, tokenHash: sha256(token), userId: user.id, csrfToken, clientFingerprintHash: clientFingerprint(req), createdAt, lastSeenAt: createdAt, expiresAt }); saveSessions({ ...store, sessions }); });
    setSessionCookie(req, res, token, Math.floor(SESSION_TTL_MS / 1000));
    return { id: sessionId, expires_at: expiresAt, csrf: csrfToken };
}
function revokeSessionById(sessionId, reason) { (0, atomic_json_file_1.withFileLock)(SESSIONS_FILE, () => { const store = readSessionsUnlocked(); const session = store.sessions.find(item => item.id === sessionId); if (session) {
    session.revokedAt = now();
    session.revokedReason = reason;
} saveSessions(store); }); }
function resolveLocalAuthSession(req) {
    const token = parseCookies(req)[SESSION_COOKIE];
    if (!token)
        return null;
    const session = peekSessions().sessions.find(item => item.tokenHash === sha256(token));
    if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now())
        return null;
    const user = peekUsers().users.find(item => item.id === session.userId);
    if (!user || user.disabledAt) {
        req.ccmSessionError = user?.disabledAt ? "ACCOUNT_DISABLED" : "SESSION_INVALID";
        return null;
    }
    const fingerprint = clientFingerprint(req);
    const legacyFingerprint = `legacy:${sha256(String(req.headers["user-agent"] || "")).slice(0, 24)}`;
    if (session.clientFingerprintHash && session.clientFingerprintHash !== fingerprint && session.clientFingerprintHash !== legacyFingerprint) {
        revokeSessionById(session.id, "client_fingerprint_mismatch");
        req.ccmSessionError = "SESSION_CLIENT_MISMATCH";
        return null;
    }
    if (session.clientFingerprintHash === legacyFingerprint) {
        session.clientFingerprintHash = fingerprint;
        sessionsReadCache = null;
        (0, atomic_json_file_1.withFileLock)(SESSIONS_FILE, () => { const store = readSessionsUnlocked(); const target = store.sessions.find(item => item.id === session.id); if (target)
            target.clientFingerprintHash = fingerprint; saveSessions(store); });
    }
    if (Date.now() - Date.parse(session.lastSeenAt) > 5 * 60_000) {
        session.lastSeenAt = now();
        sessionsReadCache = null;
        (0, atomic_json_file_1.withFileLock)(SESSIONS_FILE, () => { const store = readSessionsUnlocked(); const target = store.sessions.find(item => item.id === session.id); if (target)
            target.lastSeenAt = session.lastSeenAt; saveSessions(store); });
    }
    return { user, session, capabilities: ROLE_CAPABILITIES[user.role] };
}
function deleteRequestSession(req, res) { const token = parseCookies(req)[SESSION_COOKIE]; if (token)
    (0, atomic_json_file_1.withFileLock)(SESSIONS_FILE, () => { const store = readSessionsUnlocked(); const target = store.sessions.find(item => item.tokenHash === sha256(token)); if (target) {
        target.revokedAt = now();
        target.revokedReason = "logout";
    } saveSessions(store); }); setSessionCookie(req, res, "", 0); }
function normalizeAddress(value) { const address = String(value || "").trim().toLowerCase().split("%")[0]; return address.startsWith("::ffff:") ? address.slice(7) : address; }
function isLoopback(value) { const address = normalizeAddress(value); return address === "127.0.0.1" || address === "::1" || address === "localhost"; }
function requestAddress(req) { const direct = normalizeAddress(req.socket?.remoteAddress || "local"); if (process.env.CCM_TRUST_PROXY === "1" && isLoopback(direct)) {
    const forwarded = normalizeAddress(String(req.headers["x-forwarded-for"] || "").split(",")[0]);
    if (forwarded)
        return forwarded;
} return direct; }
function rateKey(kind, address, username = "") { return sha256(`${kind}\n${address}\n${normalizedUsername(username)}`); }
function readRateStore() { const raw = (0, atomic_json_file_1.readJsonWithBackup)(RATE_LIMIT_FILE, { schema: "ccm-local-auth-rate-limit-v1", entries: [], updatedAt: now() }); return { schema: "ccm-local-auth-rate-limit-v1", entries: Array.isArray(raw?.entries) ? raw.entries : [], updatedAt: String(raw?.updatedAt || now()) }; }
function mutateRateStore(mutator) { ensureAuthDir(); return (0, atomic_json_file_1.withFileLock)(RATE_LIMIT_FILE, () => { const store = readRateStore(); const cutoff = Date.now() - 24 * 60 * 60_000; store.entries = store.entries.filter(item => item.updatedAt >= cutoff || Number(item.lockUntil || 0) > Date.now()); mutator(store); store.entries.sort((a, b) => b.updatedAt - a.updatedAt); store.entries = store.entries.slice(0, MAX_RATE_ENTRIES); store.updatedAt = now(); (0, atomic_json_file_1.writeJsonAtomic)(RATE_LIMIT_FILE, store); return store; }); }
function assertLoginAllowed(req, username) {
    const address = requestAddress(req);
    const store = readRateStore();
    const current = Date.now();
    for (const key of [rateKey("account_address", address, username), rateKey("address", address)]) {
        const item = store.entries.find(entry => entry.keyHash === key);
        if (Number(item?.lockUntil || 0) > current) {
            const seconds = Math.max(1, Math.ceil((Number(item?.lockUntil) - current) / 1000));
            const error = new Error(`登录尝试过多，请在 ${seconds} 秒后重试`);
            error.retryAfter = seconds;
            throw error;
        }
    }
}
function recordLoginFailure(req, username) {
    const address = requestAddress(req);
    const current = Date.now();
    const windowStart = current - 15 * 60_000;
    mutateRateStore(store => { for (const spec of [{ kind: "account_address", key: rateKey("account_address", address, username), threshold: 5, duration: 15 * 60_000 }, { kind: "address", key: rateKey("address", address), threshold: 30, duration: 60 * 60_000 }]) {
        let entry = store.entries.find(item => item.keyHash === spec.key);
        if (!entry) {
            entry = { keyHash: spec.key, kind: spec.kind, failures: [], lockCount24h: 0, updatedAt: current };
            store.entries.push(entry);
        }
        entry.failures = entry.failures.filter(time => time >= windowStart);
        entry.failures.push(current);
        entry.updatedAt = current;
        if (entry.failures.length >= spec.threshold) {
            const repeated = entry.lastLockedAt && entry.lastLockedAt >= current - 24 * 60 * 60_000;
            entry.lockUntil = current + (repeated ? 24 * 60 * 60_000 : spec.duration);
            entry.lockCount24h = repeated ? entry.lockCount24h + 1 : 1;
            entry.lastLockedAt = current;
        }
    } });
}
function clearAccountFailures(req, username) { const address = requestAddress(req); mutateRateStore(store => { store.entries = store.entries.filter(item => item.keyHash !== rateKey("account_address", address, username)); }); }
function sameOrigin(req) { const origin = String(req.headers.origin || "").trim(); if (!origin)
    return true; try {
    return new URL(origin).host === String(req.headers.host || "");
}
catch {
    return false;
} }
function readJsonBody(req, maxBytes = 64 * 1024) { return new Promise((resolve, reject) => { let body = ""; let rejected = false; req.on("data", chunk => { if (rejected)
    return; body += chunk; if (Buffer.byteLength(body, "utf-8") > maxBytes) {
    rejected = true;
    reject(new Error("请求内容过大"));
} }); req.on("end", () => { if (rejected)
    return; try {
    resolve(body ? JSON.parse(body) : {});
}
catch {
    reject(new Error("请求 JSON 无效"));
} }); req.on("error", reject); }); }
function verifyBrowserCsrf(req, auth = resolveLocalAuthSession(req)) { if (["GET", "HEAD", "OPTIONS"].includes(String(req.method || "GET").toUpperCase()))
    return true; return !!auth && String(req.headers["x-ccm-csrf"] || "") === auth.session.csrfToken; }
function requireUser(req, res, admin = false) { const auth = resolveLocalAuthSession(req); if (!auth) {
    (0, utils_1.sendJson)(res, { success: false, error: "请先登录", code: "AUTH_REQUIRED" }, 401);
    return null;
} if (!verifyBrowserCsrf(req, auth)) {
    (0, utils_1.sendJson)(res, { success: false, error: "安全令牌无效，请刷新页面后重试", code: "CSRF_INVALID" }, 403);
    return null;
} if (admin && auth.user.role !== "admin") {
    (0, utils_1.sendJson)(res, { success: false, error: "仅管理员可以执行此操作", code: "ADMIN_REQUIRED" }, 403);
    return null;
} return auth; }
function roleCapabilities(role) { return [...ROLE_CAPABILITIES[role]]; }
function hasAuthCapability(role, capability) { return ROLE_CAPABILITIES[role].includes(capability); }
function browserApiAccessAllowed(req) { return sameOrigin(req) && !!resolveLocalAuthSession(req); }
function listActiveLocalAuthUsers() {
    return peekUsers().users
        .filter(user => !user.disabledAt)
        .map(user => ({ id: user.id, username: user.username, role: user.role }));
}
function listActiveAdminUserIds() {
    return listActiveLocalAuthUsers().filter(user => user.role === "admin").map(user => user.id);
}
function localAuthPublicState(req) { const users = peekUsers(); const auth = resolveLocalAuthSession(req); return { authenticated: !!auth, registration_enabled: users.registrationEnabled, first_install: users.users.length === 0, login_theme: users.loginTheme, user: publicUser(auth?.user), capabilities: auth?.capabilities || [], csrf: auth?.session.csrfToken || null, session_error: req.ccmSessionError || null, session: auth ? { id: auth.session.id, created_at: auth.session.createdAt, last_seen_at: auth.session.lastSeenAt, expires_at: auth.session.expiresAt } : null }; }
function activeAdmins(store) { return store.users.filter(item => item.role === "admin" && !item.disabledAt); }
function auditUser(user, action, actorId) { user.securityAudit = [...(user.securityAudit || []).slice(-49), { at: now(), action, ...(actorId ? { actorId } : {}) }]; user.updatedAt = now(); }
function revokeUserSessions(userId, reason, exceptSessionId = "") { (0, atomic_json_file_1.withFileLock)(SESSIONS_FILE, () => { const store = readSessionsUnlocked(); for (const session of store.sessions)
    if (session.userId === userId && session.id !== exceptSessionId) {
        session.revokedAt = now();
        session.revokedReason = reason;
    } saveSessions(store); }); }
function handleLocalAuthApi(pathname, req, res) {
    if (!pathname.startsWith("/api/auth/"))
        return false;
    res.setHeader("Cache-Control", "no-store");
    if (pathname === "/api/auth/session" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, ...localAuthPublicState(req) });
        return true;
    }
    if (!sameOrigin(req)) {
        (0, utils_1.sendJson)(res, { success: false, error: "请求来源无效", code: "ORIGIN_INVALID" }, 403);
        return true;
    }
    if (pathname === "/api/auth/login" && req.method === "POST") {
        void readJsonBody(req).then(payload => { const username = String(payload.username || ""); assertLoginAllowed(req, username); const user = loadUsers().users.find(item => item.normalizedUsername === normalizedUsername(username)); if (!user || !passwordMatches(String(payload.password || ""), user.password)) {
            recordLoginFailure(req, username);
            return (0, utils_1.sendJson)(res, { success: false, error: "用户名或密码不正确" }, 401);
        } if (user.disabledAt)
            return (0, utils_1.sendJson)(res, { success: false, error: "账户已被禁用", code: "ACCOUNT_DISABLED" }, 403); clearAccountFailures(req, username); const session = createSession(req, res, user); const state = loadUsers(); (0, utils_1.sendJson)(res, { success: true, user: publicUser(user), session, csrf: session.csrf, capabilities: roleCapabilities(user.role), registration_enabled: state.registrationEnabled, first_install: false, login_theme: state.loginTheme }); }).catch((error) => { if (error?.retryAfter)
            res.setHeader("Retry-After", String(error.retryAfter)); (0, utils_1.sendJson)(res, { success: false, error: error?.message || "登录失败" }, error?.retryAfter ? 429 : 400); });
        return true;
    }
    if (pathname === "/api/auth/register" && req.method === "POST") {
        void readJsonBody(req).then(payload => { const username = validateUsername(payload.username); const password = validatePassword(payload.password); let firstInstall = false; const user = (0, atomic_json_file_1.withFileLock)(USERS_FILE, () => { const store = readUsersUnlocked(); firstInstall = store.users.length === 0; if (!firstInstall && !store.registrationEnabled)
            throw new Error("当前未开放注册"); if (store.users.some(item => item.normalizedUsername === normalizedUsername(username)))
            throw new Error("用户名已存在"); if (firstInstall)
            consumeSetupCode(payload.setup_code); const createdAt = now(); const created = { id: `usr_${crypto.randomUUID()}`, username, normalizedUsername: normalizedUsername(username), role: firstInstall ? "admin" : "viewer", password: hashPassword(password), createdAt, updatedAt: createdAt, securityAudit: [{ at: createdAt, action: firstInstall ? "first_admin_created" : "registered" }] }; store.users.push(created); store.onboardingCompleted = true; if (firstInstall)
            store.registrationEnabled = false; saveUsers(store); return created; }); const session = createSession(req, res, user); const state = loadUsers(); (0, utils_1.sendJson)(res, { success: true, user: publicUser(user), session, csrf: session.csrf, capabilities: roleCapabilities(user.role), registration_enabled: state.registrationEnabled, first_install: false, login_theme: state.loginTheme }, 201); }).catch((error) => { const message = error?.message || "注册失败"; (0, utils_1.sendJson)(res, { success: false, error: message }, /未开放|安装码/.test(message) ? 403 : 400); });
        return true;
    }
    if (pathname === "/api/auth/logout" && req.method === "POST") {
        const auth = requireUser(req, res);
        if (!auth)
            return true;
        deleteRequestSession(req, res);
        (0, utils_1.sendJson)(res, { success: true });
        return true;
    }
    if (pathname === "/api/auth/settings" && req.method === "GET") {
        const auth = requireUser(req, res, true);
        if (!auth)
            return true;
        const store = loadUsers();
        (0, utils_1.sendJson)(res, { success: true, registration_enabled: store.registrationEnabled, login_theme: store.loginTheme, user_count: store.users.length, current_user: publicUser(auth.user) });
        return true;
    }
    if (pathname === "/api/auth/settings" && ["PUT", "POST"].includes(String(req.method))) {
        const auth = requireUser(req, res, true);
        if (!auth)
            return true;
        void readJsonBody(req).then(payload => { const store = (0, atomic_json_file_1.withFileLock)(USERS_FILE, () => { const current = readUsersUnlocked(); if (typeof payload.registration_enabled === "boolean")
            current.registrationEnabled = payload.registration_enabled; if (payload.login_theme !== undefined)
            current.loginTheme = validateLoginTheme(payload.login_theme); current.onboardingCompleted = true; saveUsers(current); return current; }); (0, utils_1.sendJson)(res, { success: true, registration_enabled: store.registrationEnabled, login_theme: store.loginTheme, user_count: store.users.length }); }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "保存失败" }, 400));
        return true;
    }
    if (pathname === "/api/auth/password" && req.method === "POST") {
        const auth = requireUser(req, res);
        if (!auth)
            return true;
        void readJsonBody(req).then(payload => { if (!passwordMatches(String(payload.current_password || ""), auth.user.password))
            throw new Error("当前密码不正确"); const next = validatePassword(payload.new_password); (0, atomic_json_file_1.withFileLock)(USERS_FILE, () => { const store = readUsersUnlocked(); const user = store.users.find(item => item.id === auth.user.id); if (!user)
            throw new Error("用户不存在"); user.password = hashPassword(next); auditUser(user, "password_changed", auth.user.id); saveUsers(store); }); try {
            fs.unlinkSync(LEGACY_PASSWORD_FILE);
        }
        catch { } revokeUserSessions(auth.user.id, "password_changed"); setSessionCookie(req, res, "", 0); (0, utils_1.sendJson)(res, { success: true, relogin_required: true }); }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "修改密码失败" }, 400));
        return true;
    }
    if (pathname === "/api/auth/users" && req.method === "GET") {
        const auth = requireUser(req, res, true);
        if (!auth)
            return true;
        (0, utils_1.sendJson)(res, { success: true, users: loadUsers().users.map(publicUser) });
        return true;
    }
    const userMatch = pathname.match(/^\/api\/auth\/users\/([^/]+)\/(role|status|sessions\/revoke)$/);
    if (userMatch && req.method === "POST") {
        const auth = requireUser(req, res, true);
        if (!auth)
            return true;
        void readJsonBody(req).then(payload => { const userId = decodeURIComponent(userMatch[1]); const action = userMatch[2]; let revoke = false; const result = (0, atomic_json_file_1.withFileLock)(USERS_FILE, () => { const store = readUsersUnlocked(); const target = store.users.find(item => item.id === userId); if (!target)
            throw new Error("用户不存在"); if (action === "role") {
            const role = validateRole(payload.role);
            if (target.role === "admin" && role !== "admin" && activeAdmins(store).length <= 1)
                throw new Error("不能降级最后一个有效管理员");
            target.role = role;
            auditUser(target, `role_changed:${role}`, auth.user.id);
            revoke = true;
        }
        else if (action === "status") {
            const enabled = payload.enabled === true;
            if (!enabled && target.role === "admin" && !target.disabledAt && activeAdmins(store).length <= 1)
                throw new Error("不能禁用最后一个有效管理员");
            target.disabledAt = enabled ? undefined : now();
            auditUser(target, enabled ? "enabled" : "disabled", auth.user.id);
            revoke = !enabled;
        } saveUsers(store); return publicUser(target); }); if (action === "sessions/revoke" || revoke)
            revokeUserSessions(userId, action === "sessions/revoke" ? "admin_revoked" : "account_security_changed", userId === auth.user.id ? auth.session.id : ""); (0, utils_1.sendJson)(res, { success: true, user: result }); }).catch((error) => (0, utils_1.sendJson)(res, { success: false, error: error?.message || "账户操作失败" }, 400));
        return true;
    }
    const deleteUserMatch = pathname.match(/^\/api\/auth\/users\/([^/]+)$/);
    if (deleteUserMatch && req.method === "DELETE") {
        const auth = requireUser(req, res, true);
        if (!auth)
            return true;
        try {
            const userId = decodeURIComponent(deleteUserMatch[1]);
            if (userId === auth.user.id)
                throw new Error("管理员不能删除自己");
            (0, atomic_json_file_1.withFileLock)(USERS_FILE, () => { const store = readUsersUnlocked(); const target = store.users.find(item => item.id === userId); if (!target)
                throw new Error("用户不存在"); if (target.role === "admin" && !target.disabledAt && activeAdmins(store).length <= 1)
                throw new Error("不能删除最后一个有效管理员"); store.users = store.users.filter(item => item.id !== userId); saveUsers(store); });
            revokeUserSessions(userId, "account_deleted");
            (0, utils_1.sendJson)(res, { success: true });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || "删除失败" }, 400);
        }
        return true;
    }
    if (pathname === "/api/auth/sessions" && req.method === "GET") {
        const auth = requireUser(req, res);
        if (!auth)
            return true;
        const all = loadSessions().sessions.filter(item => auth.user.role === "admin" || item.userId === auth.user.id);
        const users = new Map(loadUsers().users.map(item => [item.id, item]));
        (0, utils_1.sendJson)(res, { success: true, sessions: all.map(item => ({ id: item.id, user_id: item.userId, username: users.get(item.userId)?.username || "", current: item.id === auth.session.id, created_at: item.createdAt, last_seen_at: item.lastSeenAt, expires_at: item.expiresAt })) });
        return true;
    }
    const sessionMatch = pathname.match(/^\/api\/auth\/sessions\/([^/]+)$/);
    if (sessionMatch && req.method === "DELETE") {
        const auth = requireUser(req, res);
        if (!auth)
            return true;
        const sessionId = decodeURIComponent(sessionMatch[1]);
        const target = loadSessions().sessions.find(item => item.id === sessionId);
        if (!target || (auth.user.role !== "admin" && target.userId !== auth.user.id)) {
            (0, utils_1.sendJson)(res, { success: false, error: "会话不存在" }, 404);
            return true;
        }
        revokeSessionById(sessionId, "session_revoked");
        if (sessionId === auth.session.id)
            setSessionCookie(req, res, "", 0);
        (0, utils_1.sendJson)(res, { success: true, current_revoked: sessionId === auth.session.id });
        return true;
    }
    (0, utils_1.sendJson)(res, { success: false, error: "Not Found" }, 404);
    return true;
}
function localAuthStorageFiles() { return { users: USERS_FILE, sessions: SESSIONS_FILE, setupCode: SETUP_STATE_FILE, rateLimit: RATE_LIMIT_FILE }; }
//# sourceMappingURL=local-auth.js.map