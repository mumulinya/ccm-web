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
exports.CCM_AGENT_TRAJECTORY_EVALUATION_SCHEMA = void 0;
exports.evaluateAgentTrajectory = evaluateAgentTrajectory;
exports.recordAgentTrajectoryEvaluation = recordAgentTrajectoryEvaluation;
exports.loadAgentTrajectoryMetrics = loadAgentTrajectoryMetrics;
const crypto = __importStar(require("crypto"));
const observability_database_1 = require("./observability-database");
exports.CCM_AGENT_TRAJECTORY_EVALUATION_SCHEMA = "ccm-agent-trajectory-evaluation-v1";
const STRUCTURED = new Set([
    "list_directory", "glob_files", "grep_text", "read_text_file", "read_files", "read_scope_instruction",
    "workspace_symbols", "document_symbols", "find_definition", "find_references", "find_incoming_calls", "find_outgoing_calls",
    "analyze_change_impact", "find_related_tests", "inspect_dependency_graph", "inspect_public_contracts", "compare_project_contracts",
    "read_git_blame", "discover_verification_commands",
]);
function hash(value) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function ensureTable() {
    (0, observability_database_1.getObservabilityDatabase)().exec(`
    CREATE TABLE IF NOT EXISTS agent_trajectory_evaluations_v1 (
      evaluation_id TEXT PRIMARY KEY, scope TEXT NOT NULL, scope_id TEXT NOT NULL,
      exact_session_id TEXT NOT NULL, generation INTEGER NOT NULL, attempt INTEGER NOT NULL,
      task_id TEXT NOT NULL DEFAULT '', score INTEGER NOT NULL, checks_json TEXT NOT NULL,
      blocker_codes_json TEXT NOT NULL, harness_receipt_checksum TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_agent_trajectory_scope ON agent_trajectory_evaluations_v1(scope,scope_id,created_at DESC);
  `);
}
function check(value, warning = false) { return value ? "passed" : warning ? "warning" : "failed"; }
function evaluateAgentTrajectory(input) {
    const tools = input.result.toolResults.map(row => String(row.name || ""));
    const uniqueTools = new Set(tools);
    const duplicateRatio = tools.length ? Math.max(0, (tools.length - uniqueTools.size) / tools.length) : 0;
    const shellIndex = tools.indexOf("run_inspection_command");
    const structuredBeforeShell = shellIndex < 0 || tools.slice(0, shellIndex).some(name => STRUCTURED.has(name));
    const evidenceCurrent = input.result.toolResults.every(row => {
        const receipt = row.output?.safeReceipt || row.output?.receipt;
        return !receipt || !!receipt.repoStateChecksum;
    });
    const planning = input.result.parsed?.responseType === "plan" || input.result.parsed?.responseType === "dispatch";
    const plan = input.result.parsed?.plan;
    const steps = Array.isArray(plan?.steps) ? plan.steps : [];
    const checks = {
        exact_identity: check(!!input.harness.scopeId && !!input.harness.exactSessionId),
        canonical_payload_bound: check(!!input.harnessReceipt.canonicalPayloadChecksum, true),
        structured_tool_preferred: tools.length ? check(structuredBeforeShell) : "not_applicable",
        shell_last_resort: shellIndex >= 0 ? check(structuredBeforeShell) : "not_applicable",
        duplicate_reads_within_budget: tools.length ? check(duplicateRatio <= 0.25, duplicateRatio <= 0.4) : "not_applicable",
        evidence_matches_repo_state: input.result.toolResults.length ? check(evidenceCurrent) : "not_applicable",
        related_tests_identified: planning ? check(tools.includes("find_related_tests") || (Array.isArray(plan?.verification) && plan.verification.length > 0), true) : "not_applicable",
        public_contracts_checked: planning ? check(tools.includes("inspect_public_contracts") || tools.includes("compare_project_contracts"), true) : "not_applicable",
        plan_work_items_complete: planning ? check(steps.length > 0 && steps.every((step) => step?.objective && Array.isArray(step?.acceptance) && step.acceptance.length)) : "not_applicable",
        tool_budget_respected: check(input.result.toolCallCount <= 80, input.result.toolCallCount <= 120),
        latency_budget_respected: input.elapsedMs ? check(input.elapsedMs <= 180_000, input.elapsedMs <= 240_000) : "not_applicable",
    };
    if (input.harness.scope === "global")
        checks.global_source_boundary = check(!tools.some(name => STRUCTURED.has(name) && name !== "read_scope_instruction"));
    const blockerCodes = Object.entries(checks).filter(([, value]) => value === "failed").map(([key]) => key);
    const weighted = Object.values(checks).filter(value => value !== "not_applicable");
    const score = weighted.length ? Math.round(weighted.reduce((sum, value) => sum + (value === "passed" ? 100 : value === "warning" ? 60 : 0), 0) / weighted.length) : 100;
    return {
        schema: exports.CCM_AGENT_TRAJECTORY_EVALUATION_SCHEMA,
        scope: input.harness.scope,
        exactSessionId: input.harness.exactSessionId,
        ...(input.taskId ? { taskId: input.taskId } : {}),
        score,
        checks,
        blockerCodes,
        contentStored: false,
    };
}
function recordAgentTrajectoryEvaluation(input) {
    ensureTable();
    const createdAt = new Date().toISOString();
    const id = hash([input.harness.scope, input.harness.scopeId, input.harness.exactSessionId, input.harness.generation, input.harness.attempt, input.harnessReceipt.lifecycleChecksum]);
    (0, observability_database_1.getObservabilityDatabase)().prepare(`INSERT OR REPLACE INTO agent_trajectory_evaluations_v1(
    evaluation_id,scope,scope_id,exact_session_id,generation,attempt,task_id,score,checks_json,blocker_codes_json,harness_receipt_checksum,created_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, input.harness.scope, input.harness.scopeId, input.harness.exactSessionId, input.harness.generation, input.harness.attempt, input.evaluation.taskId || "", input.evaluation.score, JSON.stringify(input.evaluation.checks), JSON.stringify(input.evaluation.blockerCodes), hash(input.harnessReceipt), createdAt);
    return id;
}
function loadAgentTrajectoryMetrics() {
    ensureTable();
    const rows = (0, observability_database_1.getObservabilityDatabase)().prepare("SELECT scope,scope_id,score,checks_json FROM agent_trajectory_evaluations_v1 ORDER BY created_at DESC LIMIT 1000").all();
    const groups = {};
    for (const row of rows) {
        const key = `${row.scope}:${row.scope_id}`;
        const group = groups[key] ||= { scope: row.scope, scopeId: row.scope_id, evaluations: 0, totalScore: 0, checks: {} };
        group.evaluations += 1;
        group.totalScore += Number(row.score || 0);
        let checks = {};
        try {
            checks = JSON.parse(row.checks_json || "{}");
        }
        catch { }
        for (const [name, value] of Object.entries(checks)) {
            const item = group.checks[name] ||= { passed: 0, warning: 0, failed: 0, notApplicable: 0 };
            if (value === "passed")
                item.passed += 1;
            else if (value === "warning")
                item.warning += 1;
            else if (value === "failed")
                item.failed += 1;
            else
                item.notApplicable += 1;
        }
    }
    return Object.values(groups).map((group) => ({ ...group, averageScore: group.evaluations ? Math.round(group.totalScore / group.evaluations) : 0 }));
}
//# sourceMappingURL=agent-trajectory-evaluation.js.map