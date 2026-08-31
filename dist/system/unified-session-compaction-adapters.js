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
exports.createUnifiedScopeAdapter = createUnifiedScopeAdapter;
exports.runUnifiedScopeCompaction = runUnifiedScopeCompaction;
const crypto = __importStar(require("crypto"));
const unified_session_compaction_engine_1 = require("./unified-session-compaction-engine");
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function createUnifiedScopeAdapter(hooks) {
    return {
        async acquireFence() {
            if (hooks.acquire)
                return hooks.acquire();
            return {
                scope: "global",
                exactSessionId: "unbound",
                generation: 0,
                checksum: checksum({ at: Date.now(), nonce: crypto.randomBytes(8).toString("hex") }),
                acquiredAt: new Date().toISOString(),
            };
        },
        async loadSnapshot(fence) {
            const snapshot = await hooks.load(fence);
            if (!snapshot?.scope || !snapshot.exactSessionId)
                throw new Error("unified_compaction_snapshot_identity_missing");
            if (fence.exactSessionId === "unbound") {
                fence.scope = snapshot.scope;
                fence.exactSessionId = snapshot.exactSessionId;
                fence.generation = Math.max(0, Number(snapshot.boundaryGeneration || snapshot.previousState?.boundaryGeneration || 0));
            }
            return snapshot;
        },
        async validateFence(fence, snapshot) {
            if (fence.scope !== snapshot.scope || fence.exactSessionId !== snapshot.exactSessionId)
                throw new Error("unified_compaction_fence_identity_mismatch");
            await hooks.validate?.(fence, snapshot);
        },
        buildRecoveryInput(summary, snapshot) {
            return hooks.recovery?.(summary, snapshot) || { scope: snapshot.scope, exactSessionId: snapshot.exactSessionId, summary, snapshot };
        },
        async commit(result, fence) { await hooks.commit(result, fence); },
        async recordFailure(error, fence) { await hooks.failure?.(error, fence); },
    };
}
function runUnifiedScopeCompaction(input) {
    return (0, unified_session_compaction_engine_1.createUnifiedSessionCompactionEngine)({ ...input, adapter: input.adapter || createUnifiedScopeAdapter(input.hooks) }).run();
}
//# sourceMappingURL=unified-session-compaction-adapters.js.map