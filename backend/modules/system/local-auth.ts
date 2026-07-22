import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import type { IncomingMessage, ServerResponse } from "http";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";
import { CCM_DIR, sendJson } from "../../core/utils";

const AUTH_DIR = path.join(CCM_DIR, "auth");
const USERS_FILE = path.join(AUTH_DIR, "users.json");
const SESSIONS_FILE = path.join(AUTH_DIR, "sessions.json");
const SESSION_COOKIE = "ccm_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SCRYPT_KEY_BYTES = 64;
const MAX_LOGIN_FAILURES = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const INITIAL_USERNAME = "mumulin";
const INITIAL_PASSWORD = "lzy123167";

type AuthRole = "admin" | "user";
type LoginTheme = "command" | "minimal" | "light";

type StoredUser = {
  id: string;
  username: string;
  normalizedUsername: string;
  role: AuthRole;
  password: {
    algorithm: "scrypt";
    salt: string;
    hash: string;
  };
  createdAt: string;
  updatedAt: string;
};

type UserStore = {
  schema: "ccm-local-auth-users-v1";
  registrationEnabled: boolean;
  onboardingCompleted: boolean;
  loginTheme: LoginTheme;
  users: StoredUser[];
  updatedAt: string;
};

type StoredSession = {
  id: string;
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  userAgentHash: string;
};

type SessionStore = {
  schema: "ccm-local-auth-sessions-v1";
  sessions: StoredSession[];
  updatedAt: string;
};

const loginFailures = new Map<string, { count: number; resetAt: number }>();

function now() {
  return new Date().toISOString();
}

function ensureAuthDir() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  try { fs.chmodSync(AUTH_DIR, 0o700); } catch {}
}

function normalizedUsername(value: any) {
  return String(value || "").normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

function validateUsername(value: any) {
  const username = String(value || "").normalize("NFKC").trim();
  if (!/^[\p{L}\p{N}_.-]{3,32}$/u.test(username)) {
    throw new Error("用户名需为 3～32 个字符，只能包含文字、数字、点、下划线或短横线");
  }
  return username;
}

function validatePassword(value: any) {
  const password = String(value || "");
  if (password.length < 8 || password.length > 128) throw new Error("密码长度需为 8～128 个字符");
  return password;
}

function normalizeLoginTheme(value: any): LoginTheme {
  return ["command", "minimal", "light"].includes(String(value || "")) ? value : "command";
}

function validateLoginTheme(value: any): LoginTheme {
  const theme = String(value || "");
  if (!["command", "minimal", "light"].includes(theme)) throw new Error("登录主题无效");
  return theme as LoginTheme;
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString("base64")) {
  const hash = crypto.scryptSync(password, Buffer.from(salt, "base64"), SCRYPT_KEY_BYTES, {
    N: 16_384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return { algorithm: "scrypt" as const, salt, hash: hash.toString("base64") };
}

function passwordMatches(password: string, stored: StoredUser["password"]) {
  if (!stored || stored.algorithm !== "scrypt") return false;
  try {
    const actual = hashPassword(password, stored.salt).hash;
    const left = Buffer.from(actual, "base64");
    const right = Buffer.from(stored.hash, "base64");
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function emptyUserStore(): UserStore {
  return { schema: "ccm-local-auth-users-v1", registrationEnabled: false, onboardingCompleted: false, loginTheme: "command", users: [], updatedAt: now() };
}

function emptySessionStore(): SessionStore {
  return { schema: "ccm-local-auth-sessions-v1", sessions: [], updatedAt: now() };
}

function saveUsers(store: UserStore) {
  ensureAuthDir();
  writeJsonAtomic(USERS_FILE, { ...store, updatedAt: now() });
  try { fs.chmodSync(USERS_FILE, 0o600); } catch {}
}

function saveSessions(store: SessionStore) {
  ensureAuthDir();
  writeJsonAtomic(SESSIONS_FILE, { ...store, updatedAt: now() });
  try { fs.chmodSync(SESSIONS_FILE, 0o600); } catch {}
}

function readUsersUnlocked() {
  ensureAuthDir();
  const fileExisted = fs.existsSync(USERS_FILE);
  const loaded = readJsonWithBackup<UserStore>(USERS_FILE, emptyUserStore());
  const loadedUsers = Array.isArray(loaded?.users) ? loaded.users : [];
  const hasOnboardingFlag = typeof loaded?.onboardingCompleted === "boolean";
  const isLegacyInitialAdminOnly = fileExisted
    && loadedUsers.length === 1
    && normalizedUsername(loadedUsers[0]?.username) === normalizedUsername(INITIAL_USERNAME)
    && loaded?.registrationEnabled !== true;
  const store: UserStore = {
    schema: "ccm-local-auth-users-v1",
    registrationEnabled: loaded?.registrationEnabled === true,
    // Legacy stores already containing users are treated as configured. A newly
    // created store stays in first-install onboarding until the first auth action.
    onboardingCompleted: hasOnboardingFlag
      ? loaded.onboardingCompleted
      : fileExisted && loadedUsers.length > 0 && !isLegacyInitialAdminOnly,
    loginTheme: normalizeLoginTheme(loaded?.loginTheme),
    users: loadedUsers,
    updatedAt: String(loaded?.updatedAt || now()),
  };
  if (!store.users.length) {
    const createdAt = now();
    store.users.push({
      id: `usr_${crypto.randomUUID()}`,
      username: INITIAL_USERNAME,
      normalizedUsername: normalizedUsername(INITIAL_USERNAME),
      role: "admin",
      password: hashPassword(INITIAL_PASSWORD),
      createdAt,
      updatedAt: createdAt,
    });
    store.registrationEnabled = false;
    store.onboardingCompleted = false;
    saveUsers(store);
  } else if (!hasOnboardingFlag) {
    // Persist the inferred legacy state once, without changing users or passwords.
    saveUsers(store);
  }
  return store;
}

function loadUsers() {
  return withFileLock(USERS_FILE, readUsersUnlocked);
}

function readSessionsUnlocked() {
  ensureAuthDir();
  const loaded = readJsonWithBackup<SessionStore>(SESSIONS_FILE, emptySessionStore());
  const current = Date.now();
  const sessions = (Array.isArray(loaded?.sessions) ? loaded.sessions : []).filter(session => Date.parse(session.expiresAt) > current);
  if (sessions.length !== (loaded?.sessions || []).length) saveSessions({ schema: "ccm-local-auth-sessions-v1", sessions, updatedAt: now() });
  return { schema: "ccm-local-auth-sessions-v1", sessions, updatedAt: String(loaded?.updatedAt || now()) } as SessionStore;
}

function loadSessions() {
  return withFileLock(SESSIONS_FILE, readSessionsUnlocked);
}

function publicUser(user: StoredUser | null | undefined) {
  return user ? { id: user.id, username: user.username, role: user.role, created_at: user.createdAt } : null;
}

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function parseCookies(req: IncomingMessage) {
  const values: Record<string, string> = {};
  for (const entry of String(req.headers.cookie || "").split(";")) {
    const index = entry.indexOf("=");
    if (index <= 0) continue;
    const key = entry.slice(0, index).trim();
    try { values[key] = decodeURIComponent(entry.slice(index + 1).trim()); } catch {}
  }
  return values;
}

function requestUserAgentHash(req: IncomingMessage) {
  return crypto.createHash("sha256").update(String(req.headers["user-agent"] || "")).digest("hex").slice(0, 24);
}

function setSessionCookie(req: IncomingMessage, res: ServerResponse, token: string, maxAgeSeconds: number) {
  const secure = !!(req.socket as any)?.encrypted || String(req.headers["x-forwarded-proto"] || "").toLowerCase() === "https";
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.max(0, maxAgeSeconds)}`,
  ];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
  res.setHeader("Cache-Control", "no-store");
}

function createSession(req: IncomingMessage, res: ServerResponse, user: StoredUser) {
  const token = crypto.randomBytes(32).toString("base64url");
  const createdAt = now();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  withFileLock(SESSIONS_FILE, () => {
    const store = readSessionsUnlocked();
    const otherSessions = store.sessions.filter(session => session.userId !== user.id).concat(
      store.sessions.filter(session => session.userId === user.id).slice(-19),
    );
    otherSessions.push({
      id: `ses_${crypto.randomUUID()}`,
      tokenHash: tokenHash(token),
      userId: user.id,
      createdAt,
      expiresAt,
      userAgentHash: requestUserAgentHash(req),
    });
    saveSessions({ ...store, sessions: otherSessions });
  });
  setSessionCookie(req, res, token, Math.floor(SESSION_TTL_MS / 1000));
  return { expires_at: expiresAt };
}

export function resolveLocalAuthSession(req: IncomingMessage) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const session = loadSessions().sessions.find(item => item.tokenHash === tokenHash(token));
  if (!session) return null;
  const user = loadUsers().users.find(item => item.id === session.userId);
  return user ? { user, session } : null;
}

function deleteRequestSession(req: IncomingMessage, res: ServerResponse) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) {
    const hash = tokenHash(token);
    withFileLock(SESSIONS_FILE, () => {
      const store = readSessionsUnlocked();
      saveSessions({ ...store, sessions: store.sessions.filter(session => session.tokenHash !== hash) });
    });
  }
  setSessionCookie(req, res, "", 0);
}

function requestAddress(req: IncomingMessage) {
  return String(req.socket?.remoteAddress || "local");
}

function failureKey(req: IncomingMessage, username: string) {
  return `${requestAddress(req)}|${normalizedUsername(username)}`;
}

function assertLoginAllowed(key: string) {
  const current = loginFailures.get(key);
  if (!current) return;
  if (current.resetAt <= Date.now()) {
    loginFailures.delete(key);
    return;
  }
  if (current.count >= MAX_LOGIN_FAILURES) throw new Error("登录尝试过多，请稍后再试");
}

function recordLoginFailure(key: string) {
  const current = loginFailures.get(key);
  if (!current || current.resetAt <= Date.now()) loginFailures.set(key, { count: 1, resetAt: Date.now() + LOGIN_WINDOW_MS });
  else loginFailures.set(key, { ...current, count: current.count + 1 });
}

function sameOrigin(req: IncomingMessage) {
  const origin = String(req.headers.origin || "").trim();
  if (!origin) return true;
  try { return new URL(origin).host === String(req.headers.host || ""); }
  catch { return false; }
}

function readJsonBody(req: IncomingMessage, maxBytes = 64 * 1024): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    let rejected = false;
    req.on("data", chunk => {
      if (rejected) return;
      body += chunk;
      if (Buffer.byteLength(body, "utf-8") > maxBytes) {
        rejected = true;
        reject(new Error("请求内容过大"));
      }
    });
    req.on("end", () => {
      if (rejected) return;
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("请求 JSON 无效")); }
    });
    req.on("error", reject);
  });
}

function requireUser(req: IncomingMessage, res: ServerResponse, admin = false) {
  const auth = resolveLocalAuthSession(req);
  if (!auth) {
    sendJson(res, { success: false, error: "请先登录", code: "AUTH_REQUIRED" }, 401);
    return null;
  }
  if (admin && auth.user.role !== "admin") {
    sendJson(res, { success: false, error: "仅管理员可以执行此操作", code: "ADMIN_REQUIRED" }, 403);
    return null;
  }
  return auth;
}

export function isBrowserRequest(req: IncomingMessage) {
  return !!(req.headers["sec-fetch-site"] || req.headers.origin || req.headers.referer);
}

function normalizeRequestAddress(value: any) {
  const address = String(value || "").trim().toLowerCase().split("%")[0];
  return address.startsWith("::ffff:") ? address.slice(7) : address;
}

function isLoopbackAddress(value: any) {
  const address = normalizeRequestAddress(value);
  return address === "127.0.0.1" || address === "::1" || address === "localhost";
}

export function isTrustedLocalAgentRequest(req: IncomingMessage) {
  if (!isLoopbackAddress(req.socket?.remoteAddress)) return false;
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return !forwarded || isLoopbackAddress(forwarded);
}

export function browserApiAccessAllowed(req: IncomingMessage) {
  if (!sameOrigin(req)) return false;
  if (resolveLocalAuthSession(req)) return true;
  return !isBrowserRequest(req) && isTrustedLocalAgentRequest(req);
}

export function localAuthPublicState(req: IncomingMessage) {
  const users = loadUsers();
  const auth = resolveLocalAuthSession(req);
  return {
    authenticated: !!auth,
    registration_enabled: users.registrationEnabled,
    first_install: !users.onboardingCompleted,
    login_theme: users.loginTheme,
    user: publicUser(auth?.user),
  };
}

function completeOnboarding() {
  withFileLock(USERS_FILE, () => {
    const store = readUsersUnlocked();
    if (!store.onboardingCompleted) {
      store.onboardingCompleted = true;
      store.registrationEnabled = false;
      saveUsers(store);
    }
  });
}

export function handleLocalAuthApi(pathname: string, req: IncomingMessage, res: ServerResponse) {
  if (!pathname.startsWith("/api/auth/")) return false;
  res.setHeader("Cache-Control", "no-store");

  if (pathname === "/api/auth/session" && req.method === "GET") {
    sendJson(res, { success: true, ...localAuthPublicState(req) });
    return true;
  }

  if (!sameOrigin(req)) {
    sendJson(res, { success: false, error: "请求来源无效" }, 403);
    return true;
  }

  if (pathname === "/api/auth/login" && req.method === "POST") {
    void readJsonBody(req).then(payload => {
      const username = String(payload.username || "");
      const password = String(payload.password || "");
      const key = failureKey(req, username);
      assertLoginAllowed(key);
      const user = loadUsers().users.find(item => item.normalizedUsername === normalizedUsername(username));
      if (!user || !passwordMatches(password, user.password)) {
        recordLoginFailure(key);
        return sendJson(res, { success: false, error: "用户名或密码不正确" }, 401);
      }
      loginFailures.delete(key);
      completeOnboarding();
      const session = createSession(req, res, user);
      const authState = loadUsers();
      sendJson(res, { success: true, user: publicUser(user), session, registration_enabled: authState.registrationEnabled, first_install: false, login_theme: authState.loginTheme });
    }).catch((error: any) => sendJson(res, { success: false, error: error?.message || "登录失败" }, 429));
    return true;
  }

  if (pathname === "/api/auth/register" && req.method === "POST") {
    void readJsonBody(req).then(payload => {
      const username = validateUsername(payload.username);
      const password = validatePassword(payload.password);
      const user = withFileLock(USERS_FILE, () => {
        const store = readUsersUnlocked();
        const firstInstall = !store.onboardingCompleted;
        if (!store.registrationEnabled && !firstInstall) throw new Error("当前未开放注册");
        const normalized = normalizedUsername(username);
        if (store.users.some(item => item.normalizedUsername === normalized)) throw new Error("用户名已存在");
        const createdAt = now();
        const created: StoredUser = {
          id: `usr_${crypto.randomUUID()}`,
          username,
          normalizedUsername: normalized,
          role: "user",
          password: hashPassword(password),
          createdAt,
          updatedAt: createdAt,
        };
        store.users.push(created);
        if (firstInstall) {
          store.onboardingCompleted = true;
          store.registrationEnabled = false;
        }
        saveUsers(store);
        return created;
      });
      const session = createSession(req, res, user);
      const authState = loadUsers();
      sendJson(res, { success: true, user: publicUser(user), session, registration_enabled: authState.registrationEnabled, first_install: false, login_theme: authState.loginTheme }, 201);
    }).catch((error: any) => {
      const message = error?.message || "注册失败";
      sendJson(res, { success: false, error: message }, /未开放/.test(message) ? 403 : 400);
    });
    return true;
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    deleteRequestSession(req, res);
    sendJson(res, { success: true });
    return true;
  }

  if (pathname === "/api/auth/settings" && req.method === "GET") {
    const auth = requireUser(req, res, true);
    if (!auth) return true;
    const store = loadUsers();
    sendJson(res, {
      success: true,
      registration_enabled: store.registrationEnabled,
      login_theme: store.loginTheme,
      user_count: store.users.length,
      current_user: publicUser(auth.user),
    });
    return true;
  }

  if (pathname === "/api/auth/settings" && (req.method === "PUT" || req.method === "POST")) {
    const auth = requireUser(req, res, true);
    if (!auth) return true;
    void readJsonBody(req).then(payload => {
      const store = withFileLock(USERS_FILE, () => {
        const current = readUsersUnlocked();
        if (typeof payload.registration_enabled === "boolean") current.registrationEnabled = payload.registration_enabled;
        if (payload.login_theme !== undefined) current.loginTheme = validateLoginTheme(payload.login_theme);
        current.onboardingCompleted = true;
        saveUsers(current);
        return current;
      });
      sendJson(res, { success: true, registration_enabled: store.registrationEnabled, login_theme: store.loginTheme, user_count: store.users.length });
    }).catch((error: any) => sendJson(res, { success: false, error: error?.message || "保存失败" }, 400));
    return true;
  }

  if (pathname === "/api/auth/password" && req.method === "POST") {
    const auth = requireUser(req, res);
    if (!auth) return true;
    void readJsonBody(req).then(payload => {
      const currentPassword = String(payload.current_password || "");
      const nextPassword = validatePassword(payload.new_password);
      if (!passwordMatches(currentPassword, auth.user.password)) throw new Error("当前密码不正确");
      withFileLock(USERS_FILE, () => {
        const store = readUsersUnlocked();
        const user = store.users.find(item => item.id === auth.user.id);
        if (!user) throw new Error("用户不存在");
        user.password = hashPassword(nextPassword);
        user.updatedAt = now();
        saveUsers(store);
      });
      withFileLock(SESSIONS_FILE, () => {
        const sessions = readSessionsUnlocked();
        saveSessions({ ...sessions, sessions: sessions.sessions.filter(session => session.userId !== auth.user.id) });
      });
      setSessionCookie(req, res, "", 0);
      sendJson(res, { success: true, relogin_required: true });
    }).catch((error: any) => sendJson(res, { success: false, error: error?.message || "修改密码失败" }, 400));
    return true;
  }

  sendJson(res, { success: false, error: "Not Found" }, 404);
  return true;
}

export function localAuthStorageFiles() {
  return { users: USERS_FILE, sessions: SESSIONS_FILE };
}
