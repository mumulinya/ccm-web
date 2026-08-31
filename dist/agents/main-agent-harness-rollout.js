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
exports.mainAgentHarnessRolloutMode = mainAgentHarnessRolloutMode;
exports.recordMainAgentHarnessParity = recordMainAgentHarnessParity;
exports.loadMainAgentHarnessRolloutStatus = loadMainAgentHarnessRolloutStatus;
const crypto = __importStar(require("crypto"));
const observability_database_1 = require("../system/observability-database");
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function ensureTable() {
    (0, observability_database_1.getObservabilityDatabase)().exec(`
    CREATE TABLE IF NOT EXISTS main_agent_harness_parity_v1 (
      parity_id TEXT PRIMARY KEY, scope TEXT NOT NULL, scope_id TEXT NOT NULL,
      exact_session_id TEXT NOT NULL, generation INTEGER NOT NULL, attempt INTEGER NOT NULL,
      mode TEXT NOT NULL, passed INTEGER NOT NULL, checks_json TEXT NOT NULL,
      receipt_checksum TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_main_agent_harness_parity_scope ON main_agent_harness_parity_v1(scope,scope_id,created_at DESC);
  `);
}
function mainAgentHarnessRolloutMode(scope) {
    const configured = String(process.env[`CCM_MAIN_AGENT_HARNESS_${scope.toUpperCase()}_MODE`] || process.env.CCM_MAIN_AGENT_HARNESS_MODE || "active").toLowerCase();
    return configured === "shadow" ? "shadow" : "active";
}
/** Shadow validation is projection-only and never invokes a model or tool. */
function recordMainAgentHarnessParity(input) {
    ensureTable();
    const mode = input.mode || mainAgentHarnessRolloutMode(input.harness.scope);
    const checks = {
        identity: !!input.receipt.identityChecksum,
        canonical: !!input.receipt.canonicalPayloadChecksum,
        toolCatalog: !!input.receipt.toolCatalogChecksum,
        lifecycle: !!input.receipt.lifecycleChecksum && !!input.receipt.terminalStatus,
    };
    const parity = {
        schema: "ccm-main-agent-harness-parity-v1",
        scope: input.harness.scope,
        scopeId: input.harness.scopeId,
        exactSessionId: input.harness.exactSessionId,
        mode,
        checks,
        passed: Object.values(checks).every(Boolean),
        contentStored: false,
    };
    const id = hash([input.harness.scope, input.harness.scopeId, input.harness.exactSessionId, input.harness.generation, input.harness.attempt, input.receipt.lifecycleChecksum]);
    (0, observability_database_1.getObservabilityDatabase)().prepare(`INSERT OR REPLACE INTO main_agent_harness_parity_v1(
    parity_id,scope,scope_id,exact_session_id,generation,attempt,mode,passed,checks_json,receipt_checksum,created_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(id, input.harness.scope, input.harness.scopeId, input.harness.exactSessionId, input.harness.generation, input.harness.attempt, mode, parity.passed ? 1 : 0, JSON.stringify(checks), hash(input.receipt), new Date().toISOString());
    return parity;
}
function loadMainAgentHarnessRolloutStatus() {
    ensureTable();
    return (0, observability_database_1.getObservabilityDatabase)().prepare(`SELECT scope,scope_id,
    COUNT(*) samples, SUM(CASE WHEN passed=1 THEN 1 ELSE 0 END) passed,
    MAX(created_at) updated_at FROM main_agent_harness_parity_v1 GROUP BY scope,scope_id`).all();
}
//# sourceMappingURL=main-agent-harness-rollout.js.map