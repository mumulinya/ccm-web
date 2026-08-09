import * as os from "os";
import type { IncomingMessage, ServerResponse } from "http";
import { sendJson } from "../../core/utils";
import { resolveLocalAuthSession, verifyBrowserCsrf, type AuthCapability, type AuthRole } from "./local-auth";
import { verifyInternalApiRequest } from "./internal-api-auth";

export type ApiAccessPrincipal =
  | { kind: "browser"; userId: string; role: AuthRole; capabilities: AuthCapability[]; sessionId: string; readOnly: boolean }
  | { kind: "internal"; caller: string; role: "internal"; capabilities: string[]; readOnly: false };

export type AuthenticatedIncomingMessage = IncomingMessage & { ccmAuth?: ApiAccessPrincipal };

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
  /^\/api\/slash-commands\/(?:resolve|confirm)$/,
  /^\/api\/notifications\/(?:[^/]+\/(?:read|dismiss)|read-all)$/,
  /^\/api\/pets\/runtime\/deliveries\/[^/]+\/ack$/,
  /^\/api\/navigation\/config(?:\/|$)/,
];

const OPERATOR_MUTATIONS = [
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

const CAPABILITY_BY_OPERATOR_ROUTE: Array<{ pattern: RegExp; capability: AuthCapability }> = [
  { pattern: /^\/api\/projects\/runtime(?:\/|$)/, capability: "project.runtime" },
  { pattern: /^\/api\/(?:projects\/git|git|code-changes)(?:\/|$)/, capability: "project.git" },
  { pattern: /^\/api\/(?:attachments|uploads|shared-files)(?:\/|$)/, capability: "attachment.manage" },
  { pattern: /^\/api\/usability(?:\/|$)/, capability: "task.execute" },
];

function normalizedPath(pathname: string) {
  try { return new URL(pathname, "http://ccm.local").pathname; } catch { return pathname.split("?")[0] || "/"; }
}

function matches(patterns: RegExp[], pathname: string) { return patterns.some(pattern => pattern.test(pathname)); }

export function authorizeApiRequest(req: AuthenticatedIncomingMessage, res: ServerResponse, pathnameWithQuery: string) {
  const pathname = normalizedPath(pathnameWithQuery);
  const internal = verifyInternalApiRequest(req, pathnameWithQuery);
  if (internal) {
    if (matches(ADMIN_ONLY_MUTATIONS, pathname)) {
      sendJson(res, { success: false, error: "高风险权限只能由已登录的 Admin 审批", code: "ADMIN_REQUIRED" }, 403);
      return false;
    }
    req.ccmAuth = { kind: "internal", caller: internal.caller, role: "internal", capabilities: ["internal.route"], readOnly: false };
    return true;
  }

  const auth = resolveLocalAuthSession(req);
  if (!auth) { const code = String((req as any).ccmSessionError || "AUTH_REQUIRED"); sendJson(res, { success: false, error: code === "SESSION_CLIENT_MISMATCH" ? "登录环境发生变化，请重新登录" : "请先登录", code }, 401); return false; }
  const method = String(req.method || "GET").toUpperCase();
  if (!SAFE_METHODS.has(method) && !verifyBrowserCsrf(req, auth)) { sendJson(res, { success: false, error: "安全令牌无效，请刷新页面后重试", code: "CSRF_INVALID" }, 403); return false; }

  const role = auth.user.role;
  let allowed = role === "admin";
  let readOnly = false;
  if (SAFE_METHODS.has(method)) {
    allowed = role === "admin"
      || (!matches(ADMIN_GET, pathname) && (!matches(OPERATOR_GET, pathname) || role === "operator"));
  }
  else if (matches(SELF_SERVICE_MUTATIONS, pathname)) allowed = true;
  else if (role === "operator" && !matches(ADMIN_ONLY_MUTATIONS, pathname) && matches(OPERATOR_MUTATIONS, pathname)) allowed = true;
  else if (role === "viewer" && matches(VIEWER_CHAT, pathname)) { allowed = true; readOnly = true; }

  if (allowed && role === "operator") {
    const requirement = CAPABILITY_BY_OPERATOR_ROUTE.find(item => item.pattern.test(pathname));
    if (requirement && !auth.capabilities.includes(requirement.capability)) allowed = false;
  }
  if (!allowed) { sendJson(res, { success: false, error: role === "viewer" ? "当前账户仅允许查看和只读问答" : "当前账户没有执行此操作的权限", code: "RBAC_FORBIDDEN", required_role: role === "viewer" ? "operator" : "admin" }, 403); return false; }
  req.ccmAuth = { kind: "browser", userId: auth.user.id, role, capabilities: auth.capabilities, sessionId: auth.session.id, readOnly };
  return true;
}

function allowedHosts() {
  const hosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const configured = String(process.env.CCM_HOST || "").trim().replace(/^\[|\]$/g, "");
  if (configured && configured !== "0.0.0.0" && configured !== "::") hosts.add(configured.toLowerCase());
  for (const rows of Object.values(os.networkInterfaces())) for (const row of rows || []) if (row.address) hosts.add(row.address.toLowerCase());
  for (const raw of String(process.env.CCM_PUBLIC_ORIGIN || "").split(",")) {
    const value = raw.trim(); if (!value) continue;
    try { hosts.add(new URL(value).hostname.toLowerCase()); } catch { hosts.add(value.split(":")[0].toLowerCase()); }
  }
  return hosts;
}

export function applySecurityHeaders(res: ServerResponse) {
  res.setHeader("Content-Security-Policy", "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; font-src 'self' data:; connect-src 'self' ws: wss:");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
}

export function validateRequestHost(req: IncomingMessage, res: ServerResponse) {
  const raw = String(req.headers.host || "").trim();
  let hostname = "";
  try { hostname = new URL(`http://${raw}`).hostname.toLowerCase(); } catch {}
  if (hostname && allowedHosts().has(hostname)) return true;
  sendJson(res, { success: false, error: "请求 Host 未被 CCM 授权", code: "HOST_NOT_ALLOWED" }, 421);
  return false;
}

export function requestIsReadOnly(req: IncomingMessage) { return (req as AuthenticatedIncomingMessage).ccmAuth?.readOnly === true; }
export function requestAccessPrincipal(req: IncomingMessage) { return (req as AuthenticatedIncomingMessage).ccmAuth || null; }
