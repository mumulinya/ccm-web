import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { withFileLock, writeJsonAtomic } from "../core/atomic-json-file";

export type ProviderCacheCapabilityStatus = "confirmed" | "unsupported" | "unproven" | "degraded";
export type InferenceBackendKind = "remote_api" | "vllm" | "sglang";

export type ProviderCacheCapabilityEvidenceV1 = {
  schema: "ccm-provider-cache-capability-evidence-v1";
  version: 1;
  id: string;
  identityChecksum: string;
  interfaceFingerprint: string;
  interfaceProtocol: string;
  cacheFamily: string;
  model: string;
  inferenceBackendKind: InferenceBackendKind;
  status: ProviderCacheCapabilityStatus;
  source: "probe" | "official_endpoint" | "backend_metrics";
  providerCallCount: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  backendMetricsVerified: boolean;
  checkedAt: string;
  expiresAt: string;
  reason: string;
  contentStored: false;
  checksum: string;
};

type CapabilityRegistryV1 = {
  schema: "ccm-provider-cache-capability-registry-v1";
  version: 1;
  entries: Record<string, ProviderCacheCapabilityEvidenceV1>;
  latestAttempts: Record<string, ProviderCacheCapabilityEvidenceV1>;
  updatedAt: string;
  checksum: string;
};

const REGISTRY_ROOT = process.env.CCM_PROVIDER_CACHE_CAPABILITY_DIR
  ? path.resolve(process.env.CCM_PROVIDER_CACHE_CAPABILITY_DIR)
  : path.join(os.homedir(), ".cc-connect", "provider-cache-capability");
const REGISTRY_FILE = path.join(REGISTRY_ROOT, "capabilities.json");
const NORMAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEGRADED_TTL_MS = 15 * 60 * 1000;

function hash(value: any) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}

function checksum(value: any) {
  const copy = { ...(value || {}) };
  delete copy.checksum;
  return hash(copy);
}

function clean(value: any, max = 240) {
  return String(value || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function normalizedEndpoint(value: any) {
  try {
    const url = new URL(String(value || ""));
    return `${url.protocol}//${url.hostname.toLowerCase()}${url.port ? `:${url.port}` : ""}${url.pathname.replace(/\/+$/, "") || "/"}`;
  } catch {
    return "invalid-endpoint";
  }
}

function officialEndpointCapability(config: any) {
  try {
    const host = new URL(String(config?.apiUrl || "")).hostname.toLowerCase();
    if (/(?:^|\.)openai\.com$/.test(host)) return "openai";
    if (/(?:^|\.)anthropic\.com$/.test(host)) return "anthropic";
    if (/(?:^|\.)googleapis\.com$/.test(host) && /generativelanguage/.test(host)) return "gemini";
  } catch {}
  return "";
}

function protocolOf(config: any) {
  const value = String(config?.format || "auto").trim().toLowerCase();
  return ["openai-compatible", "openai-responses", "anthropic-compatible", "gemini-compatible"].includes(value) ? value : "auto";
}

function cacheFamilyOf(config: any) {
  const declared = String(config?.providerNativeCacheFamily || "auto").trim().toLowerCase();
  if (["openai", "anthropic", "gemini", "compatible"].includes(declared)) return declared;
  return ({
    "openai-compatible": "openai",
    "openai-responses": "openai",
    "anthropic-compatible": "anthropic",
    "gemini-compatible": "gemini",
  } as Record<string, string>)[protocolOf(config)] || "compatible";
}

export function normalizeInferenceBackendKind(value: any): InferenceBackendKind {
  const normalized = String(value || "remote_api").trim().toLowerCase();
  return ["vllm", "sglang"].includes(normalized) ? normalized as InferenceBackendKind : "remote_api";
}

export function providerCacheCapabilityIdentity(config: any) {
  const interfaceProtocol = protocolOf(config);
  const cacheFamily = cacheFamilyOf(config);
  const inferenceBackendKind = normalizeInferenceBackendKind(config?.inferenceBackendKind || config?.inference_backend_kind);
  const interfaceFingerprint = hash({ endpoint: normalizedEndpoint(config?.apiUrl), interfaceProtocol }).slice(0, 40);
  const identity = {
    interfaceFingerprint,
    interfaceProtocol,
    cacheFamily,
    model: clean(config?.model, 180),
    inferenceBackendKind,
  };
  return { ...identity, identityChecksum: hash(identity) };
}

function emptyRegistry(): CapabilityRegistryV1 {
  const value: CapabilityRegistryV1 = {
    schema: "ccm-provider-cache-capability-registry-v1",
    version: 1,
    entries: {},
    latestAttempts: {},
    updatedAt: new Date(0).toISOString(),
    checksum: "",
  };
  value.checksum = checksum(value);
  return value;
}

function validEvidence(value: any): value is ProviderCacheCapabilityEvidenceV1 {
  return value?.schema === "ccm-provider-cache-capability-evidence-v1"
    && Number(value?.version) === 1
    && /^[a-f0-9]{64}$/.test(String(value?.identityChecksum || ""))
    && value?.contentStored === false
    && value?.checksum === checksum(value);
}

function readRegistry() {
  try {
    const parsed = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
    if (parsed?.schema !== "ccm-provider-cache-capability-registry-v1" || parsed?.checksum !== checksum(parsed)) return emptyRegistry();
    parsed.entries = Object.fromEntries(Object.entries(parsed.entries || {}).filter(([, value]) => validEvidence(value)));
    parsed.latestAttempts = Object.fromEntries(Object.entries(parsed.latestAttempts || {}).filter(([, value]) => validEvidence(value)));
    return parsed as CapabilityRegistryV1;
  } catch {
    return emptyRegistry();
  }
}

function writeRegistry(registry: CapabilityRegistryV1) {
  fs.mkdirSync(REGISTRY_ROOT, { recursive: true });
  const next = { ...registry, updatedAt: new Date().toISOString(), checksum: "" };
  next.checksum = checksum(next);
  writeJsonAtomic(REGISTRY_FILE, next);
  try { fs.chmodSync(REGISTRY_FILE, 0o600); } catch {}
  return next;
}

export function createProviderCacheCapabilityEvidence(config: any, input: Partial<ProviderCacheCapabilityEvidenceV1> & { status: ProviderCacheCapabilityStatus }) {
  const identity = providerCacheCapabilityIdentity(config);
  const checkedAt = input.checkedAt || new Date().toISOString();
  const ttl = input.status === "degraded" ? DEGRADED_TTL_MS : NORMAL_TTL_MS;
  const evidence: ProviderCacheCapabilityEvidenceV1 = {
    schema: "ccm-provider-cache-capability-evidence-v1",
    version: 1,
    id: clean(input.id || `pcce_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`, 100),
    ...identity,
    status: input.status,
    source: input.source || "probe",
    providerCallCount: Math.max(0, Number(input.providerCallCount || 0)),
    cacheReadInputTokens: Math.max(0, Number(input.cacheReadInputTokens || 0)),
    cacheCreationInputTokens: Math.max(0, Number(input.cacheCreationInputTokens || 0)),
    backendMetricsVerified: input.backendMetricsVerified === true,
    checkedAt,
    expiresAt: input.expiresAt || new Date(Date.parse(checkedAt) + ttl).toISOString(),
    reason: clean(input.reason, 500),
    contentStored: false,
    checksum: "",
  };
  evidence.checksum = checksum(evidence);
  return evidence;
}

export function recordProviderCacheCapabilityEvidence(config: any, input: Partial<ProviderCacheCapabilityEvidenceV1> & { status: ProviderCacheCapabilityStatus }) {
  const evidence = createProviderCacheCapabilityEvidence(config, input);
  return withFileLock(REGISTRY_FILE, () => {
    const registry = readRegistry();
    const key = evidence.identityChecksum;
    const previous = registry.entries[key];
    registry.latestAttempts[key] = evidence;
    const previousStillValid = validEvidence(previous) && Date.parse(previous.expiresAt) > Date.now();
    const preserveConfirmed = evidence.status === "degraded" && previousStillValid && previous.status === "confirmed";
    if (!preserveConfirmed) registry.entries[key] = evidence;
    writeRegistry(registry);
    return { evidence: preserveConfirmed ? previous : evidence, latestAttempt: evidence, preservedConfirmed: preserveConfirmed };
  }, { timeoutMs: 30_000, retryMs: 20, staleMs: 2 * 60_000 });
}

export function readProviderCacheCapabilityState(config: any) {
  const identity = providerCacheCapabilityIdentity(config);
  const registry = readRegistry();
  const active = registry.entries[identity.identityChecksum];
  const latestAttempt = registry.latestAttempts[identity.identityChecksum];
  const now = Date.now();
  let evidence = validEvidence(active) && Date.parse(active.expiresAt) > now ? active : null;
  const latest = validEvidence(latestAttempt) && Date.parse(latestAttempt.expiresAt) > now ? latestAttempt : null;
  if (!evidence && officialEndpointCapability(config)) {
    evidence = createProviderCacheCapabilityEvidence(config, {
      id: `pcce_official_${identity.identityChecksum.slice(0, 24)}`,
      status: "confirmed",
      source: "official_endpoint",
      providerCallCount: 0,
      reason: "official_endpoint_documented_capability",
    });
  }
  return {
    schema: "ccm-provider-cache-capability-state-v1",
    version: 1,
    identity,
    status: evidence?.status || "unproven",
    evidence,
    latestAttempt: latest,
    expired: !!active && !evidence,
    contentStored: false,
  };
}

export function revokeProviderCacheCapabilityEvidence(config: any) {
  const identity = providerCacheCapabilityIdentity(config);
  return withFileLock(REGISTRY_FILE, () => {
    const registry = readRegistry();
    const removed = !!registry.entries[identity.identityChecksum] || !!registry.latestAttempts[identity.identityChecksum];
    delete registry.entries[identity.identityChecksum];
    delete registry.latestAttempts[identity.identityChecksum];
    writeRegistry(registry);
    return { success: true, removed, identityChecksum: identity.identityChecksum };
  }, { timeoutMs: 30_000, retryMs: 20, staleMs: 2 * 60_000 });
}

export function pruneProviderCacheCapabilityRegistry(options: { now?: number; expiredRetentionDays?: number } = {}) {
  const now = Number(options.now || Date.now());
  const retentionMs = Math.max(1, Number(options.expiredRetentionDays || 30)) * 24 * 60 * 60_000;
  return withFileLock(REGISTRY_FILE, () => {
    const registry = readRegistry();
    let removedEntries = 0;
    let removedAttempts = 0;
    for (const [key, evidence] of Object.entries(registry.entries || {})) {
      if (Date.parse(String(evidence.expiresAt || "")) + retentionMs >= now) continue;
      delete registry.entries[key];
      removedEntries += 1;
    }
    for (const [key, evidence] of Object.entries(registry.latestAttempts || {})) {
      if (Date.parse(String(evidence.expiresAt || "")) + retentionMs >= now) continue;
      delete registry.latestAttempts[key];
      removedAttempts += 1;
    }
    if (removedEntries || removedAttempts) writeRegistry(registry);
    return { removedEntries, removedAttempts, remainingEntries: Object.keys(registry.entries).length, remainingAttempts: Object.keys(registry.latestAttempts).length };
  }, { timeoutMs: 30_000, retryMs: 20, staleMs: 2 * 60_000 });
}

export function runProviderCacheCapabilityRegistrySelfTest() {
  const config = { apiUrl: "https://gateway.example/v1?secret=hidden", format: "openai-compatible", model: "test", inferenceBackendKind: "remote_api" };
  revokeProviderCacheCapabilityEvidence(config);
  const confirmed = recordProviderCacheCapabilityEvidence(config, { status: "confirmed", providerCallCount: 2, cacheReadInputTokens: 120, reason: "usage_receipt" });
  const degraded = recordProviderCacheCapabilityEvidence(config, { status: "degraded", providerCallCount: 1, reason: "HTTP 503" });
  const state = readProviderCacheCapabilityState(config);
  const revoked = revokeProviderCacheCapabilityEvidence(config);
  const checks = {
    confirmedRecorded: confirmed.evidence.status === "confirmed",
    transientFailurePreservesConfirmed: degraded.preservedConfirmed === true && state.evidence?.status === "confirmed" && state.latestAttempt?.status === "degraded",
    secretsNotStored: !JSON.stringify(state).includes("hidden") && !JSON.stringify(state).includes("gateway.example"),
    revokeWorks: revoked.removed === true && readProviderCacheCapabilityState(config).evidence === null,
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
