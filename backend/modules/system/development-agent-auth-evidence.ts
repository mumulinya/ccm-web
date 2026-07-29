import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export type DevelopmentAgentAuthEvidenceV2 = {
  schema: "ccm-development-agent-auth-evidence-v2";
  version: 2;
  provider: string;
  status: "credential_detected" | "verified" | "expired" | "revoked" | "degraded" | "failed";
  source: "native_status" | "model_challenge" | "api_challenge" | "credential_file";
  accountFingerprint: string;
  model: string;
  cliVersion: string;
  verifiedAt: string;
  expiresAt: string;
  detail: string;
  checksum: string;
};

const FILE = process.env.CCM_AGENT_AUTH_EVIDENCE_FILE || path.join(os.homedir(), ".cc-connect", "agent-auth-evidence-v2.json");
const TTL_MS = 24 * 60 * 60 * 1000;

function digest(value: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function readAll(): Record<string, DevelopmentAgentAuthEvidenceV2> {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf-8"));
    return parsed?.schema === "ccm-development-agent-auth-evidence-store-v2" && parsed.evidence && typeof parsed.evidence === "object"
      ? parsed.evidence : {};
  } catch { return {}; }
}

function writeAll(evidence: Record<string, DevelopmentAgentAuthEvidenceV2>) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const temp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify({ schema: "ccm-development-agent-auth-evidence-store-v2", version: 2, updatedAt: new Date().toISOString(), evidence }, null, 2), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(temp, FILE);
  try { fs.chmodSync(FILE, 0o600); } catch {}
}

export function accountFingerprint(account: unknown) {
  const normalized = String(account || "").trim().toLowerCase();
  return normalized ? digest(normalized) : "";
}

export function recordDevelopmentAgentAuthEvidence(input: {
  provider: string; status: DevelopmentAgentAuthEvidenceV2["status"]; source: DevelopmentAgentAuthEvidenceV2["source"];
  account?: string; model?: string; cliVersion?: string; detail?: string; ttlMs?: number;
}) {
  const verifiedAt = new Date();
  const core = {
    schema: "ccm-development-agent-auth-evidence-v2" as const,
    version: 2 as const,
    provider: String(input.provider || "").trim().toLowerCase(),
    status: input.status,
    source: input.source,
    accountFingerprint: accountFingerprint(input.account),
    model: String(input.model || "").trim(),
    cliVersion: String(input.cliVersion || "").trim(),
    verifiedAt: verifiedAt.toISOString(),
    expiresAt: new Date(verifiedAt.getTime() + Math.max(60_000, Number(input.ttlMs || TTL_MS))).toISOString(),
    detail: String(input.detail || "").slice(0, 240),
  };
  const evidence = { ...core, checksum: digest(core) };
  const all = readAll();
  all[evidence.provider] = evidence;
  writeAll(all);
  return evidence;
}

export function getDevelopmentAgentAuthEvidence(provider: string, input: { account?: string; model?: string; cliVersion?: string } = {}) {
  const evidence = readAll()[String(provider || "").trim().toLowerCase()] || null;
  if (!evidence) return null;
  const expired = Date.parse(evidence.expiresAt) <= Date.now();
  const accountMismatch = !!evidence.accountFingerprint && !!input.account && evidence.accountFingerprint !== accountFingerprint(input.account);
  const versionMismatch = !!evidence.cliVersion && !!input.cliVersion && evidence.cliVersion !== String(input.cliVersion);
  const modelMismatch = !!evidence.model && !!input.model && evidence.model !== String(input.model);
  if (expired || accountMismatch || versionMismatch || modelMismatch) return { ...evidence, status: "expired" as const, valid: false };
  return { ...evidence, valid: evidence.status === "verified" };
}

export function revokeDevelopmentAgentAuthEvidence(provider: string, detail = "认证状态已变更") {
  const key = String(provider || "").trim().toLowerCase();
  const all = readAll();
  if (!all[key]) return null;
  const next = recordDevelopmentAgentAuthEvidence({ provider: key, status: "revoked", source: all[key].source, detail, ttlMs: 60_000 });
  return next;
}

export function publicDevelopmentAgentAuthEvidence(evidence: any) {
  if (!evidence) return null;
  const { accountFingerprint: _accountFingerprint, ...safe } = evidence;
  return safe;
}
