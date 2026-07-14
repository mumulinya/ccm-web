import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const ROOT = path.join(os.homedir(), ".cc-connect", "private");
const KEY_FILE = path.join(ROOT, "credential-master.key");
const STORE_FILE = path.join(ROOT, "credentials.enc.json");
const REF_PREFIX = "ccm-secret://";
const SECRET_KEY_PATTERN = /(?:secret|token|password|api[_-]?key|hook[_-]?token|webhook[_-]?url)$/i;

type Store = { version: 1; entries: Record<string, { iv: string; tag: string; data: string; updated_at: string }> };

function ensurePrivateDir() {
  fs.mkdirSync(ROOT, { recursive: true });
  try { fs.chmodSync(ROOT, 0o700); } catch {}
}

function masterKey() {
  ensurePrivateDir();
  if (!fs.existsSync(KEY_FILE)) {
    fs.writeFileSync(KEY_FILE, crypto.randomBytes(32));
    try { fs.chmodSync(KEY_FILE, 0o600); } catch {}
  }
  const key = fs.readFileSync(KEY_FILE);
  if (key.length !== 32) throw new Error("CCM 本机凭据主密钥无效");
  return key;
}

function loadStore(): Store {
  ensurePrivateDir();
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
    return { version: 1, entries: parsed?.entries && typeof parsed.entries === "object" ? parsed.entries : {} };
  } catch { return { version: 1, entries: {} }; }
}

function saveStore(store: Store) {
  ensurePrivateDir();
  const temp = `${STORE_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(store, null, 2), { encoding: "utf-8", mode: 0o600 });
  fs.renameSync(temp, STORE_FILE);
  try { fs.chmodSync(STORE_FILE, 0o600); } catch {}
}

function secretId(scope: string, field: string) {
  const slug = `${scope}:${field}`.toLowerCase().replace(/[^a-z0-9:_-]+/g, "-").slice(0, 80);
  const hash = crypto.createHash("sha256").update(`${scope}:${field}`).digest("hex").slice(0, 12);
  return `${slug}-${hash}`;
}

export function isCredentialReference(value: any) {
  return String(value || "").startsWith(REF_PREFIX);
}

export function protectCredential(scope: string, field: string, value: any) {
  const plain = String(value || "").trim();
  if (!plain || isCredentialReference(plain)) return plain;
  const id = secretId(scope, field);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf-8"), cipher.final()]);
  const store = loadStore();
  store.entries[id] = { iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: encrypted.toString("base64"), updated_at: new Date().toISOString() };
  saveStore(store);
  return `${REF_PREFIX}${id}`;
}

export function resolveCredential(value: any) {
  const raw = String(value || "");
  if (!isCredentialReference(raw)) return raw;
  const id = raw.slice(REF_PREFIX.length);
  const entry = loadStore().entries[id];
  if (!entry) throw new Error(`本机凭据不存在：${id}`);
  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(entry.iv, "base64"));
  decipher.setAuthTag(Buffer.from(entry.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(entry.data, "base64")), decipher.final()]).toString("utf-8");
}

export function protectObjectSecrets(value: any, scope = "config"): any {
  if (Array.isArray(value)) return value.map((item, index) => protectObjectSecrets(item, `${scope}.${index}`));
  if (!value || typeof value !== "object") return value;
  const output: any = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] = SECRET_KEY_PATTERN.test(key)
      ? protectCredential(scope, key, item)
      : protectObjectSecrets(item, `${scope}.${key}`);
  }
  return output;
}

export function resolveObjectSecrets(value: any): any {
  if (Array.isArray(value)) return value.map(resolveObjectSecrets);
  if (!value || typeof value !== "object") return typeof value === "string" ? resolveCredential(value) : value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveObjectSecrets(item)]));
}

export function migrateTomlCredentials(file: string) {
  if (!fs.existsSync(file)) return { changed: false, count: 0 };
  const original = fs.readFileSync(file, "utf-8");
  let count = 0;
  const scope = path.basename(file, path.extname(file));
  const migrated = original.replace(/^(\s*)(app_secret|api_key|access_token|refresh_token|hook_token)\s*=\s*"([^"]*)"/gmi, (_all, indent, field, raw) => {
    if (!raw || raw === "PLACEHOLDER" || isCredentialReference(raw)) return _all;
    count++;
    return `${indent}${field} = "${protectCredential(scope, field, raw)}"`;
  });
  if (migrated !== original) {
    fs.writeFileSync(file, migrated, "utf-8");
    // Never leave the pre-migration plaintext beside the protected config.
    try { fs.unlinkSync(`${file}.pre-credential-migration.bak`); } catch {}
  }
  return { changed: migrated !== original, count };
}

export function materializeTomlCredentials(content: string) {
  return String(content || "").replace(/ccm-secret:\/\/[a-z0-9:_-]+/gi, value => resolveCredential(value));
}

export function migrateConfigDirectory(configDir: string) {
  if (!fs.existsSync(configDir)) return { files: 0, credentials: 0 };
  let files = 0;
  let credentials = 0;
  for (const name of fs.readdirSync(configDir).filter(item => item.endsWith(".toml"))) {
    const result = migrateTomlCredentials(path.join(configDir, name));
    if (result.changed) files++;
    credentials += result.count;
  }
  return { files, credentials };
}

export function createPrivateRuntimeConfig(name: string, content: string) {
  const runtimeDir = path.join(ROOT, "runtime-configs");
  fs.mkdirSync(runtimeDir, { recursive: true });
  const file = path.join(runtimeDir, `${String(name || "runtime").replace(/[^a-z0-9_-]+/gi, "-")}-${process.pid}-${Date.now()}.toml`);
  fs.writeFileSync(file, materializeTomlCredentials(content), { encoding: "utf-8", mode: 0o600 });
  try { fs.chmodSync(file, 0o600); } catch {}
  return file;
}

export function schedulePrivateRuntimeConfigCleanup(file: string, delayMs = 10_000) {
  const timer = setTimeout(() => { try { fs.unlinkSync(file); } catch {} }, delayMs);
  timer.unref?.();
}

export function credentialStoreStatus() {
  const store = loadStore();
  return { protected: true, backend: "local-aes-256-gcm", entries: Object.keys(store.entries).length, store_file: STORE_FILE, key_file: KEY_FILE };
}

export function redactSensitiveText(value: any) {
  return String(value || "")
    .replace(/((?:app_secret|api_key|access_token|refresh_token|password|hook_token)\s*[=:]\s*)[^\s"']+/gi, "$1***")
    .replace(/("(?:app_secret|api_key|access_token|refresh_token|password|hook_token)"\s*:\s*")[^"]+("?)/gi, "$1***$2");
}
