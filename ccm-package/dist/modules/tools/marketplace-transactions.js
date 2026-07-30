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
exports.MARKETPLACE_ACTIVATION_LOCK_FILE = exports.MARKETPLACE_GLOBAL_LOCK_FILE = exports.MARKETPLACE_TRANSACTIONS_FILE = void 0;
exports.createMarketplaceTransaction = createMarketplaceTransaction;
exports.readMarketplaceTransaction = readMarketplaceTransaction;
exports.listMarketplaceTransactions = listMarketplaceTransactions;
exports.updateMarketplaceTransaction = updateMarketplaceTransaction;
exports.signMarketplaceActivation = signMarketplaceActivation;
exports.verifyMarketplaceActivation = verifyMarketplaceActivation;
exports.publicMarketplaceTransaction = publicMarketplaceTransaction;
exports.marketplaceTransactionChecksum = marketplaceTransactionChecksum;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../../core/atomic-json-file");
const ROOT = path.join(os.homedir(), ".cc-connect", "marketplace");
exports.MARKETPLACE_TRANSACTIONS_FILE = path.join(ROOT, "transactions.json");
exports.MARKETPLACE_GLOBAL_LOCK_FILE = path.join(ROOT, "mutation");
exports.MARKETPLACE_ACTIVATION_LOCK_FILE = path.join(ROOT, "activation");
const ACTIVATION_KEY_FILE = path.join(os.homedir(), ".cc-connect", "private", "marketplace-activation.key");
function sha(value) {
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
            }
            finally {
                fs.closeSync(handle);
            }
        }
        catch (error) {
            if (error?.code !== "EEXIST")
                throw error;
        }
        try {
            fs.chmodSync(ACTIVATION_KEY_FILE, 0o600);
        }
        catch { }
    }
    const value = fs.readFileSync(ACTIVATION_KEY_FILE);
    if (value.length !== 32) {
        throw Object.assign(new Error("市场激活签名密钥损坏，请由管理员恢复密钥文件"), {
            code: "MARKETPLACE_ACTIVATION_KEY_INVALID",
        });
    }
    return value;
}
function load() {
    const parsed = (0, atomic_json_file_1.readJsonWithBackup)(exports.MARKETPLACE_TRANSACTIONS_FILE, { version: 2, items: [] });
    return { version: 2, items: Array.isArray(parsed?.items) ? parsed.items : [] };
}
function save(store) {
    (0, atomic_json_file_1.writeJsonAtomic)(exports.MARKETPLACE_TRANSACTIONS_FILE, store);
}
function createMarketplaceTransaction(input) {
    return (0, atomic_json_file_1.withFileLock)(exports.MARKETPLACE_GLOBAL_LOCK_FILE, () => {
        const store = load();
        const reusable = store.items.find(item => item.action === input.action
            && item.type === input.type
            && item.name === input.name
            && item.materialHash === input.materialHash
            && item.sourceFingerprint === input.sourceFingerprint
            && item.principal.userId === input.principal.userId
            && item.principal.sessionId === input.principal.sessionId
            && !["rolled_back", "failed"].includes(item.state));
        if (reusable)
            return reusable;
        const now = new Date();
        const transaction = {
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
        if (store.items.length > 2000)
            store.items = store.items.slice(-2000);
        save(store);
        return transaction;
    });
}
function readMarketplaceTransaction(id) {
    return load().items.find(item => item.id === id) || null;
}
function listMarketplaceTransactions(limit = 100) {
    return load().items.slice(-Math.max(1, Math.min(500, limit))).reverse();
}
function updateMarketplaceTransaction(id, mutator) {
    return (0, atomic_json_file_1.withFileLock)(exports.MARKETPLACE_GLOBAL_LOCK_FILE, () => {
        const store = load();
        const index = store.items.findIndex(item => item.id === id);
        if (index < 0)
            throw Object.assign(new Error("市场事务不存在"), { code: "MARKETPLACE_TRANSACTION_NOT_FOUND", statusCode: 404 });
        const next = { ...mutator({ ...store.items[index] }), updatedAt: new Date().toISOString() };
        store.items[index] = next;
        save(store);
        return next;
    });
}
function activationPayload(transaction) {
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
function signMarketplaceActivation(transaction) {
    const payload = Buffer.from(JSON.stringify(activationPayload(transaction))).toString("base64url");
    const signature = crypto.createHmac("sha256", key()).update(payload).digest("base64url");
    return `${payload}.${signature}`;
}
function verifyMarketplaceActivation(transaction, token, principal) {
    const [payload, signature] = String(token || "").split(".");
    if (!payload || !signature)
        return false;
    const expected = crypto.createHmac("sha256", key()).update(payload).digest("base64url");
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
        return false;
    let parsed;
    try {
        parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    }
    catch {
        return false;
    }
    const current = activationPayload(transaction);
    return parsed.transactionId === current.transactionId
        && parsed.userId === principal.userId
        && parsed.sessionId === principal.sessionId
        && parsed.materialHash === current.materialHash
        && parsed.commandChecksum === current.commandChecksum
        && parsed.catalogRevision === current.catalogRevision
        && Date.parse(parsed.expiresAt) > Date.now();
}
function publicMarketplaceTransaction(transaction) {
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
function marketplaceTransactionChecksum(value) {
    return sha(value);
}
//# sourceMappingURL=marketplace-transactions.js.map