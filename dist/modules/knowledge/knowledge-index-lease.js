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
exports.inspectKnowledgeIndexLease = inspectKnowledgeIndexLease;
exports.acquireKnowledgeIndexLease = acquireKnowledgeIndexLease;
exports.renewKnowledgeIndexLease = renewKnowledgeIndexLease;
exports.releaseKnowledgeIndexLease = releaseKnowledgeIndexLease;
exports.waitForKnowledgeIndexLeaseRelease = waitForKnowledgeIndexLeaseRelease;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const ROOT = path.join(os.homedir(), ".ccm", "private");
const LEASE_FILE = path.join(ROOT, "knowledge-index-v3.lease.json");
const DEFAULT_LEASE_MS = 15 * 60_000;
function readLease() {
    try {
        const parsed = JSON.parse(fs.readFileSync(LEASE_FILE, "utf-8"));
        return parsed?.schema === "ccm-knowledge-index-lease-v1" ? parsed : null;
    }
    catch {
        return null;
    }
}
function processAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function activeLease(lease) {
    if (!lease)
        return false;
    if (Date.parse(lease.expiresAt) <= Date.now())
        return false;
    if (lease.hostname === os.hostname() && !processAlive(lease.pid))
        return false;
    return true;
}
function inspectKnowledgeIndexLease() {
    const lease = readLease();
    return { active: activeLease(lease), lease };
}
function acquireKnowledgeIndexLease(reason, leaseMs = DEFAULT_LEASE_MS) {
    fs.mkdirSync(ROOT, { recursive: true });
    try {
        fs.chmodSync(ROOT, 0o700);
    }
    catch { }
    const existing = readLease();
    if (activeLease(existing))
        return { acquired: false, lease: existing };
    if (existing) {
        try {
            fs.unlinkSync(LEASE_FILE);
        }
        catch { }
    }
    const now = Date.now();
    const lease = {
        schema: "ccm-knowledge-index-lease-v1",
        ownerId: (0, crypto_1.randomUUID)(),
        pid: process.pid,
        hostname: os.hostname(),
        acquiredAt: new Date(now).toISOString(),
        expiresAt: new Date(now + Math.max(60_000, leaseMs)).toISOString(),
        reason: String(reason || "knowledge-index").slice(0, 120),
    };
    try {
        fs.writeFileSync(LEASE_FILE, JSON.stringify(lease), { encoding: "utf-8", mode: 0o600, flag: "wx" });
        return { acquired: true, lease };
    }
    catch {
        return { acquired: false, lease: readLease() };
    }
}
function renewKnowledgeIndexLease(ownerId, leaseMs = DEFAULT_LEASE_MS) {
    const current = readLease();
    if (!current || current.ownerId !== ownerId)
        return false;
    const next = { ...current, expiresAt: new Date(Date.now() + Math.max(60_000, leaseMs)).toISOString() };
    fs.writeFileSync(LEASE_FILE, JSON.stringify(next), { encoding: "utf-8", mode: 0o600 });
    return true;
}
function releaseKnowledgeIndexLease(ownerId) {
    const current = readLease();
    if (!current || current.ownerId !== ownerId)
        return false;
    try {
        fs.unlinkSync(LEASE_FILE);
    }
    catch {
        return false;
    }
    return true;
}
async function waitForKnowledgeIndexLeaseRelease(timeoutMs = 60_000) {
    const deadline = Date.now() + Math.max(1_000, timeoutMs);
    while (Date.now() < deadline) {
        if (!inspectKnowledgeIndexLease().active)
            return true;
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    return !inspectKnowledgeIndexLease().active;
}
//# sourceMappingURL=knowledge-index-lease.js.map