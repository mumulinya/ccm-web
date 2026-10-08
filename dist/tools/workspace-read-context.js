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
exports.workspaceTextEvidenceKey = workspaceTextEvidenceKey;
exports.reconcileJsonReadEvidence = reconcileJsonReadEvidence;
exports.createWorkspaceReadContextLedger = createWorkspaceReadContextLedger;
exports.clearWorkspaceReadContextLedger = clearWorkspaceReadContextLedger;
const crypto = __importStar(require("crypto"));
/** Fingerprint the complete selected text, not a checksum-only reference. */
function workspaceTextEvidenceKey(value, project = '') {
    if (value?.schema !== 'ccm-workspace-read-result-v3' || value.type !== 'text' || !value.checksum)
        return '';
    const content = Array.isArray(value.lines) && value.lines.every((row) => Number.isInteger(row?.line) && typeof row?.text === 'string')
        ? value.lines.map((row) => `${row.line}\t${row.text}`).join('\n') : value.content;
    if (typeof content !== 'string')
        return '';
    return crypto.createHash('sha256').update(JSON.stringify({
        project: project || value.project || value.planningEvidence?.project || '', path: value.path,
        checksum: value.checksum, offset: value.offset, content,
        total: value.total_lines, next: value.next_cursor, truncated: value.truncated,
    })).digest('hex');
}
function stableRange(range) {
    return JSON.stringify({
        offset: Number(range.offset || 0),
        limit: Number(range.limit || 0),
        pages: String(range.pages || ""),
        cellOffset: Number(range.cellOffset || 0),
        cellLimit: Number(range.cellLimit || 0),
        tokenBudget: Number(range.tokenBudget || 0),
        ...(range.jsonPointers ? { jsonPointers: range.jsonPointers } : {}),
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
    jsonEvidence = new Set();
    textEvidence = new Set();
    hasJsonEvidence(id) { return this.jsonEvidence.has(id); }
    retainJsonEvidence(ids) { this.jsonEvidence = new Set(ids); }
    hasTextEvidence(id) { return Boolean(id) && this.textEvidence.has(id); }
    recordTextEvidence(id) { if (id)
        this.textEvidence.add(id); }
    retainTextEvidence(ids) { this.textEvidence = new Set(ids); }
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
const sessionLedgers = new Map();
/** Only complete selections in the effective messages authorize unchanged replies.
 * Keep the existing export for checkpoint callers and older integrations. */
function reconcileJsonReadEvidence(identity, messages) {
    const ids = new Set();
    const textIds = new Set();
    const visit = (value) => {
        if (typeof value === 'string') {
            try {
                visit(JSON.parse(value));
            }
            catch { }
            return;
        }
        if (!value || typeof value !== 'object')
            return;
        if (value.schema === 'ccm-workspace-json-fields-result-v1' && Array.isArray(value.fields) && value.evidenceId)
            ids.add(value.evidenceId);
        const textId = workspaceTextEvidenceKey(value);
        if (textId)
            textIds.add(textId);
        for (const nested of Object.values(value))
            visit(nested);
    };
    visit(messages);
    for (const ledger of sessionLedgers.values()) {
        if (ledger.identity.scope === identity.scope && ledger.identity.scopeId === identity.scopeId && ledger.identity.exactSessionId === identity.exactSessionId) {
            ledger.retainJsonEvidence(ids);
            ledger.retainTextEvidence(textIds);
        }
    }
}
function identityKey(identity) {
    return JSON.stringify({
        scope: identity.scope,
        scopeId: String(identity.scopeId || ""),
        exactSessionId: String(identity.exactSessionId || ""),
        generation: Math.max(0, Number(identity.generation || 0)),
    });
}
function createWorkspaceReadContextLedger(identity) {
    const key = identityKey(identity);
    let ledger = sessionLedgers.get(key);
    if (!ledger) {
        ledger = new WorkspaceReadContextLedger(identity);
        sessionLedgers.set(key, ledger);
        while (sessionLedgers.size > 240) {
            const oldest = sessionLedgers.keys().next().value;
            if (oldest === undefined)
                break;
            sessionLedgers.delete(oldest);
        }
    }
    return ledger;
}
function clearWorkspaceReadContextLedger(identity) {
    if (!identity || !Object.keys(identity).length) {
        const removed = sessionLedgers.size;
        sessionLedgers.clear();
        return removed;
    }
    let removed = 0;
    for (const [key, ledger] of sessionLedgers) {
        if (identity.scope && ledger.identity.scope !== identity.scope)
            continue;
        if (identity.scopeId && ledger.identity.scopeId !== identity.scopeId)
            continue;
        if (identity.exactSessionId && ledger.identity.exactSessionId !== identity.exactSessionId)
            continue;
        if (identity.generation !== undefined && ledger.identity.generation !== Number(identity.generation))
            continue;
        sessionLedgers.delete(key);
        removed += 1;
    }
    return removed;
}
//# sourceMappingURL=workspace-read-context.js.map