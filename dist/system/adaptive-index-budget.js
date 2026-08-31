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
exports.resolveAdaptiveIndexBudget = resolveAdaptiveIndexBudget;
const os = __importStar(require("os"));
const v8 = __importStar(require("v8"));
const MB = 1024 * 1024;
// Source text expands substantially once TypeScript builds AST, symbol and
// type graphs.  Keep the semantic window deliberately bounded; the complete
// lightweight symbol inventory still lives in SQLite and requested files are
// promoted into this window on demand.
const MIN_BYTES = 16 * MB;
const MAX_BYTES = 64 * MB;
const EMERGENCY_BYTES = 8 * MB;
const MAX_FILES = 512;
const MIN_FILES = 64;
function resolveAdaptiveIndexBudget() {
    const heap = v8.getHeapStatistics();
    const usage = process.memoryUsage();
    const heapLimit = Number(heap.heap_size_limit || 0);
    const heapUsed = Number(usage.heapUsed || 0);
    const headroom = Math.max(0, heapLimit - heapUsed);
    const available = Math.max(0, Number(os.freemem?.() || 0));
    // Keep substantial headroom for the provider request, UI/SSE state and
    // other language servers.  The byte budget is source bytes, not AST bytes.
    // The hard cap is deliberately generous; normal repositories never hit it.
    // Source bytes expand into several AST/module objects.  Keep the source
    // budget deliberately below the raw heap headroom so the provider, SQLite
    // and other active projects still have room to run.
    const safeHeapBudget = Math.floor(headroom * 0.025);
    const safeMachineBudget = available > 0 ? Math.floor(available * 0.02) : MAX_BYTES;
    let maxBytes = Math.min(MAX_BYTES, safeHeapBudget || MIN_BYTES, safeMachineBudget || MAX_BYTES);
    let reason = "adaptive";
    if (!Number.isFinite(maxBytes) || maxBytes < EMERGENCY_BYTES) {
        maxBytes = EMERGENCY_BYTES;
        reason = "emergency";
    }
    maxBytes = Math.max(EMERGENCY_BYTES, Math.floor(maxBytes));
    // Keep a file-count bound as well, but derive it from the byte budget.  A
    // project with many tiny files can therefore use more entries than one with
    // a few large bundles.
    const maxFiles = Math.min(MAX_FILES, Math.max(MIN_FILES, Math.floor(maxBytes / (8 * 1024))));
    return {
        maxFiles,
        maxBytes,
        headroomBytes: headroom,
        availableMemoryBytes: available,
        reason,
    };
}
//# sourceMappingURL=adaptive-index-budget.js.map