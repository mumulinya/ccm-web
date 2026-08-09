import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { withFileLock, writeJsonAtomic } from "../core/atomic-json-file";
import { providerCacheCapabilityIdentity } from "./provider-cache-capability-registry";

export type ProviderNativeMicrocompactStatus = "confirmed" | "unsupported" | "unproven" | "degraded";

const ROOT = process.env.CCM_PROVIDER_NATIVE_MICROCOMPACT_CAPABILITY_DIR
  ? path.resolve(process.env.CCM_PROVIDER_NATIVE_MICROCOMPACT_CAPABILITY_DIR)
  : path.join(os.homedir(), ".cc-connect", "provider-native-microcompact-capability");
const FILE = path.join(ROOT, "capabilities.json");
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

function officialAnthropic(config: any) {
  try {
    const hostname = new URL(String(config?.apiUrl || "")).hostname.toLowerCase();
    return hostname === "api.anthropic.com" || hostname.endsWith(".anthropic.com");
  } catch {
    return false;
  }
}

function emptyRegistry() {
  const value: any = { schema: "ccm-provider-native-microcompact-capability-registry-v1", version: 1, entries: {}, updatedAt: "", checksum: "" };
  value.checksum = checksum(value);
  return value;
}

function readRegistry() {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return parsed?.schema === "ccm-provider-native-microcompact-capability-registry-v1" && parsed?.checksum === checksum(parsed) ? parsed : emptyRegistry();
  } catch {
    return emptyRegistry();
  }
}

function writeRegistry(registry: any) {
  fs.mkdirSync(ROOT, { recursive: true });
  const next = { ...registry, updatedAt: new Date().toISOString(), checksum: "" };
  next.checksum = checksum(next);
  writeJsonAtomic(FILE, next);
  try { fs.chmodSync(FILE, 0o600); } catch {}
  return next;
}

export function recordProviderNativeMicrocompactCapability(config: any, input: { status: ProviderNativeMicrocompactStatus; reason?: any; providerRequestId?: any; source?: any }) {
  const identity = providerCacheCapabilityIdentity(config);
  const checkedAt = new Date().toISOString();
  const ttl = input.status === "degraded" ? DEGRADED_TTL_MS : NORMAL_TTL_MS;
  const core: any = {
    schema: "ccm-provider-native-microcompact-capability-evidence-v1",
    version: 1,
    identityChecksum: identity.identityChecksum,
    status: input.status,
    source: String(input.source || "native_request_adapter").slice(0, 80),
    reason: String(input.reason || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 500),
    providerRequestId: String(input.providerRequestId || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 160),
    checkedAt,
    expiresAt: new Date(Date.parse(checkedAt) + ttl).toISOString(),
    contentStored: false,
  };
  const evidence = { ...core, checksum: checksum(core) };
  return withFileLock(FILE, () => {
    const registry = readRegistry();
    registry.entries = { ...(registry.entries || {}), [identity.identityChecksum]: evidence };
    writeRegistry(registry);
    return evidence;
  }, { timeoutMs: 30_000, retryMs: 20, staleMs: 2 * 60_000 });
}

export function readProviderNativeMicrocompactCapability(config: any) {
  const identity = providerCacheCapabilityIdentity(config);
  if (officialAnthropic(config)) return {
    schema: "ccm-provider-native-microcompact-capability-state-v1",
    version: 1,
    identity,
    status: "confirmed" as const,
    source: "official_endpoint",
    evidence: null,
    contentStored: false,
  };
  const stored = readRegistry().entries?.[identity.identityChecksum];
  const valid = stored?.schema === "ccm-provider-native-microcompact-capability-evidence-v1"
    && stored?.checksum === checksum(stored)
    && Date.parse(String(stored?.expiresAt || "")) > Date.now();
  return {
    schema: "ccm-provider-native-microcompact-capability-state-v1",
    version: 1,
    identity,
    status: valid ? stored.status as ProviderNativeMicrocompactStatus : "unproven" as const,
    source: valid ? stored.source : "none",
    evidence: valid ? stored : null,
    expired: !!stored && !valid,
    contentStored: false,
  };
}

export function providerNativeMicrocompactAllowed(config: any) {
  if (config?.providerCacheProbeInProgress === true || config?.provider_native_microcompact_probe_in_progress === true) return true;
  return readProviderNativeMicrocompactCapability(config).status === "confirmed";
}

export function isProviderNativeMicrocompactFieldRejection(error: any) {
  const reason = String(error?.message || error || "");
  return /HTTP\s+(400|404|422).*?(context[_ -]?management|cache[_ -]?edits?)|(?:unknown|unsupported|unrecognized|invalid).*?context_management/i.test(reason);
}

