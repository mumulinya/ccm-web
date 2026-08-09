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
exports.providerNativeToolIdentity = providerNativeToolIdentity;
exports.recordProviderNativeToolCapability = recordProviderNativeToolCapability;
exports.readProviderNativeToolCapability = readProviderNativeToolCapability;
exports.providerNativeToolReferenceAllowed = providerNativeToolReferenceAllowed;
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const atomic_json_file_1 = require("../core/atomic-json-file");
const FILE = path.join(process.env.CCM_PROVIDER_CAPABILITY_DIR || path.join(os.homedir(), ".cc-connect"), "provider-native-tool-capabilities.json");
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function providerNativeToolIdentity(config, family) {
    let endpoint = String(config?.apiUrl || "").trim();
    try {
        const parsed = new URL(endpoint);
        endpoint = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "")}`;
    }
    catch { }
    const body = { endpoint, protocol: String(config?.format || ""), providerFamily: family, model: String(config?.model || "") };
    return { ...body, identityChecksum: hash(body) };
}
function read() {
    const value = (0, atomic_json_file_1.readJsonWithBackup)(FILE, { schema: "ccm-provider-native-tool-capability-v1", records: [] });
    return { schema: "ccm-provider-native-tool-capability-v1", records: Array.isArray(value?.records) ? value.records : [] };
}
function recordProviderNativeToolCapability(config, family, status, reason) {
    const identity = providerNativeToolIdentity(config, family);
    const record = { ...identity, status, reason: String(reason?.message || reason || "").replace(/[\r\n]+/g, " ").slice(0, 500), checkedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + TTL_MS).toISOString(), contentStored: false };
    (0, atomic_json_file_1.withFileLock)(FILE, () => {
        const store = read();
        store.records = [...store.records.filter((item) => item.identityChecksum !== identity.identityChecksum), record].slice(-500);
        (0, atomic_json_file_1.writeJsonAtomic)(FILE, store);
    });
    return record;
}
function readProviderNativeToolCapability(config, family) {
    const families = family ? [family] : ["anthropic", "openai", "gemini"];
    return families.map(item => {
        const identity = providerNativeToolIdentity(config, item);
        const record = read().records.find((row) => row.identityChecksum === identity.identityChecksum) || null;
        const official = item === "anthropic" && (() => { try {
            return new URL(String(config?.apiUrl || "")).hostname.toLowerCase() === "api.anthropic.com";
        }
        catch {
            return false;
        } })();
        return { ...identity, official, status: official ? "confirmed" : record && Date.parse(record.expiresAt) > Date.now() ? record.status : "unknown", checkedAt: record?.checkedAt || "", expiresAt: record?.expiresAt || "", contentStored: false };
    });
}
function providerNativeToolReferenceAllowed(config) {
    return readProviderNativeToolCapability(config, "anthropic")[0].status === "confirmed";
}
//# sourceMappingURL=provider-native-tool-capability.js.map