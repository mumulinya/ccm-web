import * as crypto from "crypto";
import * as os from "os";
import * as path from "path";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../core/atomic-json-file";

const FILE = path.join(process.env.CCM_PROVIDER_CAPABILITY_DIR || path.join(os.homedir(), ".cc-connect"), "provider-native-tool-capabilities.json");
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
function hash(value: any) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }

export function providerNativeToolIdentity(config: any, family: string) {
  let endpoint = String(config?.apiUrl || "").trim();
  try { const parsed = new URL(endpoint); endpoint = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "")}`; } catch {}
  const body = { endpoint, protocol: String(config?.format || ""), providerFamily: family, model: String(config?.model || "") };
  return { ...body, identityChecksum: hash(body) };
}

function read() {
  const value = readJsonWithBackup<any>(FILE, { schema: "ccm-provider-native-tool-capability-v1", records: [] });
  return { schema: "ccm-provider-native-tool-capability-v1", records: Array.isArray(value?.records) ? value.records : [] };
}

export function recordProviderNativeToolCapability(config: any, family: string, status: "confirmed" | "unsupported", reason: any) {
  const identity = providerNativeToolIdentity(config, family);
  const record = { ...identity, status, reason: String(reason?.message || reason || "").replace(/[\r\n]+/g, " ").slice(0, 500), checkedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + TTL_MS).toISOString(), contentStored: false };
  withFileLock(FILE, () => {
    const store = read();
    store.records = [...store.records.filter((item: any) => item.identityChecksum !== identity.identityChecksum), record].slice(-500);
    writeJsonAtomic(FILE, store);
  });
  return record;
}

export function readProviderNativeToolCapability(config: any, family?: string) {
  const families = family ? [family] : ["anthropic", "openai", "gemini"];
  return families.map(item => {
    const identity = providerNativeToolIdentity(config, item);
    const record = read().records.find((row: any) => row.identityChecksum === identity.identityChecksum) || null;
    const official = item === "anthropic" && (() => { try { return new URL(String(config?.apiUrl || "")).hostname.toLowerCase() === "api.anthropic.com"; } catch { return false; } })();
    return { ...identity, official, status: official ? "confirmed" : record && Date.parse(record.expiresAt) > Date.now() ? record.status : "unknown", checkedAt: record?.checkedAt || "", expiresAt: record?.expiresAt || "", contentStored: false };
  });
}

export function providerNativeToolReferenceAllowed(config: any) {
  return readProviderNativeToolCapability(config, "anthropic")[0].status === "confirmed";
}

