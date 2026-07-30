import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { readJsonWithBackup, withFileLock, writeJsonAtomic } from "../../core/atomic-json-file";

const ROOT = path.join(os.homedir(), ".cc-connect", "marketplace");
export const MARKETPLACE_TRANSACTIONS_FILE = path.join(ROOT, "transactions.json");
export const MARKETPLACE_GLOBAL_LOCK_FILE = path.join(ROOT, "mutation");
export const MARKETPLACE_ACTIVATION_LOCK_FILE = path.join(ROOT, "activation");
const ACTIVATION_KEY_FILE = path.join(os.homedir(), ".cc-connect", "private", "marketplace-activation.key");

export type MarketplaceTransactionState = "previewed" | "quarantined" | "activating" | "active" | "failed" | "recovery_required" | "rolled_back";

export interface MarketplaceTransactionV2 {
  schema: "ccm-marketplace-transaction-v2";
  id: string;
  action: "install" | "update" | "uninstall";
  state: MarketplaceTransactionState;
  type: "mcp" | "skill";
  name: string;
  source: any;
  sourceFingerprint: string;
  materialHash: string;
  commandChecksum: string;
  catalogRevision: string;
  stagingPath?: string;
  itemSnapshot?: any;
  preview: any;
  principal: { userId: string; sessionId: string };
  activationExpiresAt: string;
  installationId?: string;
  runtimeState?: string;
  resyncState?: string;
  error?: string;
  checkpoints: string[];
  createdAt: string;
  updatedAt: string;
}

type Store = { version: 2; items: MarketplaceTransactionV2[] };

function sha(value: any) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function key() {
  fs.mkdirSync(path.dirname(ACTIVATION_KEY_FILE), { recursive: true });
  if (!fs.existsSync(ACTIVATION_KEY_FILE)) {
    const candidate = crypto.randomBytes(32);
    try {
      const handle = fs.openSync(ACTIVATION_KEY_FILE, "wx", 0o600);
      try {
        fs.writeFileSync(handle, candidate);
        fs.fsyncSync(handle);
      } finally {
        fs.closeSync(handle);
      }
    } catch (error: any) {
      if (error?.code !== "EEXIST") throw error;
    }
    try { fs.chmodSync(ACTIVATION_KEY_FILE, 0o600); } catch {}
  }
  const value = fs.readFileSync(ACTIVATION_KEY_FILE);
  if (value.length !== 32) {
    throw Object.assign(new Error("市场激活签名密钥损坏，请由管理员恢复密钥文件"), {
      code: "MARKETPLACE_ACTIVATION_KEY_INVALID",
    });
  }
  return value;
}

function load(): Store {
  const parsed = readJsonWithBackup<any>(MARKETPLACE_TRANSACTIONS_FILE, { version: 2, items: [] });
  return { version: 2, items: Array.isArray(parsed?.items) ? parsed.items : [] };
}

function save(store: Store) {
  writeJsonAtomic(MARKETPLACE_TRANSACTIONS_FILE, store);
}

export function createMarketplaceTransaction(input: Omit<MarketplaceTransactionV2, "schema" | "id" | "state" | "createdAt" | "updatedAt" | "checkpoints" | "activationExpiresAt">) {
  return withFileLock(MARKETPLACE_GLOBAL_LOCK_FILE, () => {
    const store = load();
    const reusable = store.items.find(item =>
      item.action === input.action
      && item.type === input.type
      && item.name === input.name
      && item.materialHash === input.materialHash
      && item.sourceFingerprint === input.sourceFingerprint
      && item.principal.userId === input.principal.userId
      && item.principal.sessionId === input.principal.sessionId
      && !["rolled_back", "failed"].includes(item.state)
    );
    if (reusable) return reusable;
    const now = new Date();
    const transaction: MarketplaceTransactionV2 = {
      ...input,
      schema: "ccm-marketplace-transaction-v2",
      id: `mktx_${now.getTime().toString(36)}_${crypto.randomBytes(8).toString("hex")}`,
      state: input.source?.trust === "official" ? "previewed" : "quarantined",
      activationExpiresAt: new Date(now.getTime() + 15 * 60_000).toISOString(),
      checkpoints: ["material_staged", "preview_ready"],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    store.items.push(transaction);
    if (store.items.length > 2000) store.items = store.items.slice(-2000);
    save(store);
    return transaction;
  });
}

export function readMarketplaceTransaction(id: string) {
  return load().items.find(item => item.id === id) || null;
}

export function listMarketplaceTransactions(limit = 100) {
  return load().items.slice(-Math.max(1, Math.min(500, limit))).reverse();
}

export function updateMarketplaceTransaction(id: string, mutator: (current: MarketplaceTransactionV2) => MarketplaceTransactionV2) {
  return withFileLock(MARKETPLACE_GLOBAL_LOCK_FILE, () => {
    const store = load();
    const index = store.items.findIndex(item => item.id === id);
    if (index < 0) throw Object.assign(new Error("市场事务不存在"), { code: "MARKETPLACE_TRANSACTION_NOT_FOUND", statusCode: 404 });
    const next = { ...mutator({ ...store.items[index] }), updatedAt: new Date().toISOString() };
    store.items[index] = next;
    save(store);
    return next;
  });
}

function activationPayload(transaction: MarketplaceTransactionV2) {
  return {
    transactionId: transaction.id,
    userId: transaction.principal.userId,
    sessionId: transaction.principal.sessionId,
    action: transaction.action,
    sourceFingerprint: transaction.sourceFingerprint,
    materialHash: transaction.materialHash,
    commandChecksum: transaction.commandChecksum,
    catalogRevision: transaction.catalogRevision,
    expiresAt: transaction.activationExpiresAt,
  };
}

export function signMarketplaceActivation(transaction: MarketplaceTransactionV2) {
  const payload = Buffer.from(JSON.stringify(activationPayload(transaction))).toString("base64url");
  const signature = crypto.createHmac("sha256", key()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyMarketplaceActivation(transaction: MarketplaceTransactionV2, token: string, principal: { userId: string; sessionId: string }) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return false;
  const expected = crypto.createHmac("sha256", key()).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  let parsed: any;
  try { parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")); } catch { return false; }
  const current = activationPayload(transaction);
  return parsed.transactionId === current.transactionId
    && parsed.userId === principal.userId
    && parsed.sessionId === principal.sessionId
    && parsed.materialHash === current.materialHash
    && parsed.commandChecksum === current.commandChecksum
    && parsed.catalogRevision === current.catalogRevision
    && Date.parse(parsed.expiresAt) > Date.now();
}

export function publicMarketplaceTransaction(transaction: MarketplaceTransactionV2) {
  return {
    schema: transaction.schema,
    id: transaction.id,
    action: transaction.action,
    state: transaction.state,
    type: transaction.type,
    name: transaction.name,
    source: transaction.source,
    sourceFingerprint: transaction.sourceFingerprint,
    materialHash: transaction.materialHash,
    commandChecksum: transaction.commandChecksum,
    catalogRevision: transaction.catalogRevision,
    preview: transaction.preview,
    installationId: transaction.installationId,
    runtimeState: transaction.runtimeState,
    resyncState: transaction.resyncState,
    error: transaction.error,
    checkpoints: transaction.checkpoints,
    activationExpiresAt: transaction.activationExpiresAt,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}

export function marketplaceTransactionChecksum(value: any) {
  return sha(value);
}
