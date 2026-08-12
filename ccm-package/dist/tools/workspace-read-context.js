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
exports.WorkspaceReadContextLedger = void 0;
exports.createWorkspaceReadContextLedger = createWorkspaceReadContextLedger;
const crypto = __importStar(require("crypto"));
function stableRange(range) {
    return JSON.stringify({
        offset: Number(range.offset || 0),
        limit: Number(range.limit || 0),
        pages: String(range.pages || ""),
        cellOffset: Number(range.cellOffset || 0),
        cellLimit: Number(range.cellLimit || 0),
        tokenBudget: Number(range.tokenBudget || 0),
    });
}
function pathKey(project, filePath) {
    return `${project}\0${filePath.replace(/\\/g, "/")}`;
}
function entryKey(project, filePath, range) {
    return `${pathKey(project, filePath)}\0${stableRange(range)}`;
}
class WorkspaceReadContextLedger {
    epoch;
    identity;
    entries = new Map();
    signatures = new Map();
    inFlight = new Map();
    constructor(identity) {
        this.identity = { ...identity, generation: Math.max(0, Number(identity.generation || 0)) };
        this.epoch = crypto.createHash("sha256").update(JSON.stringify({ ...this.identity, createdAt: Date.now(), nonce: crypto.randomBytes(8).toString("hex") })).digest("hex").slice(0, 24);
    }
    lookup(project, filePath, range, stat) {
        const base = pathKey(project, filePath);
        const signature = `${Number(stat.mtimeMs || 0)}:${Number(stat.size || 0)}`;
        const previousSignature = this.signatures.get(base);
        if (previousSignature && previousSignature !== signature)
            this.invalidate(project, filePath);
        this.signatures.set(base, signature);
        const entry = this.entries.get(entryKey(project, filePath, range));
        return entry && entry.mtimeMs === Number(stat.mtimeMs || 0) && entry.size === Number(stat.size || 0) ? entry : null;
    }
    record(entry) {
        const normalized = { ...entry, path: entry.path.replace(/\\/g, "/") };
        this.signatures.set(pathKey(normalized.project, normalized.path), `${Number(normalized.mtimeMs || 0)}:${Number(normalized.size || 0)}`);
        this.entries.set(entryKey(normalized.project, normalized.path, normalized.range), normalized);
    }
    invalidate(project, filePath) {
        const prefix = `${pathKey(project, filePath)}\0`;
        for (const key of this.entries.keys())
            if (key.startsWith(prefix))
                this.entries.delete(key);
        this.signatures.delete(pathKey(project, filePath));
    }
    inFlightFor(project, filePath, range) {
        return this.inFlight.get(entryKey(project, filePath, range));
    }
    setInFlight(project, filePath, range, promise) {
        const key = entryKey(project, filePath, range);
        this.inFlight.set(key, promise);
        promise.finally(() => {
            if (this.inFlight.get(key) === promise)
                this.inFlight.delete(key);
        }).catch(() => { });
    }
}
exports.WorkspaceReadContextLedger = WorkspaceReadContextLedger;
function createWorkspaceReadContextLedger(identity) {
    return new WorkspaceReadContextLedger(identity);
}
//# sourceMappingURL=workspace-read-context.js.map