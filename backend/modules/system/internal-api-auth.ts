import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import type { IncomingMessage } from "http";
import { CCM_DIR } from "../../core/utils";

export type InternalApiCaller = "global-agent" | "feishu-acp" | "project-feishu-queue" | "ccm-cli" | "server-recovery";

const SECRET_FILE = path.join(CCM_DIR, "auth", "internal-api-secret");
const SIGNATURE_TTL_MS = 30_000;
const NONCE_RETENTION_MS = 120_000;
const MAX_NONCES = 10_000;
const usedNonces = new Map<string, number>();

const ROUTE_ALLOWLIST: Record<InternalApiCaller, RegExp[]> = {
  "global-agent": [
    /^\/api\/(?:global-agent|groups|projects|tasks|requirements|knowledge|rag|tools|permissions|music|cron|skills|mcp|pets|templates|git)(?:\/|\?|$)/,
    /^\/api\/send-stream(?:\?|$)/,
  ],
  "feishu-acp": [
    /^\/api\/feishu\/control-bot\/message(?:\?|$)/,
    /^\/api\/internal\/feishu-reaction\/(?:start|finish)(?:\?|$)/,
    /^\/api\/projects\/session-runtime-event(?:\?|$)/,
    /^\/api\/sessions\/feishu-targets(?:\?|$)/,
    /^\/api\/send-stream(?:\?|$)/,
  ],
  "project-feishu-queue": [/^\/api\/send-stream(?:\?|$)/],
  "ccm-cli": [/^\/api\/projects\/runtime\/shutdown(?:\?|$)/],
  "server-recovery": [
    /^\/api\/(?:tasks|projects|global-agent|feishu)(?:\/|\?|$)/,
    /^\/api\/send-stream(?:\?|$)/,
  ],
};

function ensureSecret() {
  fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
  if (!fs.existsSync(SECRET_FILE)) {
    fs.writeFileSync(SECRET_FILE, `${crypto.randomBytes(48).toString("base64url")}\n`, { encoding: "utf-8", mode: 0o600, flag: "wx" });
  }
  try { fs.chmodSync(SECRET_FILE, 0o600); } catch {}
  const secret = fs.readFileSync(SECRET_FILE, "utf-8").trim();
  if (secret.length < 32) throw new Error("CCM internal API secret is invalid");
  return secret;
}

function canonicalPath(value: string) {
  const raw = String(value || "/");
  try {
    const parsed = new URL(raw, "http://ccm.local");
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }
}

function payload(caller: string, method: string, pathname: string, timestamp: string, nonce: string) {
  return ["ccm-internal-api-v1", caller, method.toUpperCase(), canonicalPath(pathname), timestamp, nonce].join("\n");
}

function sign(caller: string, method: string, pathname: string, timestamp: string, nonce: string) {
  return crypto.createHmac("sha256", ensureSecret()).update(payload(caller, method, pathname, timestamp, nonce)).digest("base64url");
}

function pruneNonces(current = Date.now()) {
  for (const [key, expiresAt] of usedNonces) if (expiresAt <= current) usedNonces.delete(key);
  while (usedNonces.size >= MAX_NONCES) usedNonces.delete(usedNonces.keys().next().value as string);
}

export function buildInternalApiHeaders(caller: InternalApiCaller, method: string, pathname: string) {
  const timestamp = String(Date.now());
  const nonce = crypto.randomBytes(18).toString("base64url");
  return {
    "X-CCM-Internal-Caller": caller,
    "X-CCM-Internal-Timestamp": timestamp,
    "X-CCM-Internal-Nonce": nonce,
    "X-CCM-Internal-Signature": sign(caller, method, pathname, timestamp, nonce),
  };
}

export function verifyInternalApiRequest(req: IncomingMessage, pathnameWithQuery: string) {
  const caller = String(req.headers["x-ccm-internal-caller"] || "") as InternalApiCaller;
  const timestamp = String(req.headers["x-ccm-internal-timestamp"] || "");
  const nonce = String(req.headers["x-ccm-internal-nonce"] || "");
  const signature = String(req.headers["x-ccm-internal-signature"] || "");
  if (!caller || !ROUTE_ALLOWLIST[caller] || !timestamp || !nonce || !signature) return null;
  const requestTime = Number(timestamp);
  if (!Number.isFinite(requestTime) || Math.abs(Date.now() - requestTime) > SIGNATURE_TTL_MS) return null;
  if (!ROUTE_ALLOWLIST[caller].some(pattern => pattern.test(canonicalPath(pathnameWithQuery)))) return null;
  pruneNonces();
  const nonceKey = `${caller}:${nonce}`;
  if (usedNonces.has(nonceKey)) return null;
  const expected = sign(caller, String(req.method || "GET"), pathnameWithQuery, timestamp, nonce);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  usedNonces.set(nonceKey, Date.now() + NONCE_RETENTION_MS);
  return { caller, kind: "internal" as const };
}

export function internalApiSecretFile() {
  ensureSecret();
  return SECRET_FILE;
}
