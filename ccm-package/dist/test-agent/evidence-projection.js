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
exports.TEST_AGENT_HANDOFF_PROJECTION_SCHEMA = exports.TEST_AGENT_EVIDENCE_PROJECTION_SCHEMA = void 0;
exports.testAgentEvidenceChecksum = testAgentEvidenceChecksum;
exports.findForbiddenTestAgentEvidencePaths = findForbiddenTestAgentEvidencePaths;
exports.projectTestAgentValueForPersistence = projectTestAgentValueForPersistence;
exports.buildTestAgentEvidenceProjection = buildTestAgentEvidenceProjection;
exports.summarizeTestAgentEvidenceProjection = summarizeTestAgentEvidenceProjection;
exports.readTestAgentEvidenceProjection = readTestAgentEvidenceProjection;
exports.projectTestAgentHandoffForPersistence = projectTestAgentHandoffForPersistence;
exports.projectTestAgentExecutionResultForPersistence = projectTestAgentExecutionResultForPersistence;
exports.runTestAgentEvidenceProjectionSelfTest = runTestAgentEvidenceProjectionSelfTest;
const crypto = __importStar(require("crypto"));
const hardening_metrics_1 = require("./hardening-metrics");
exports.TEST_AGENT_EVIDENCE_PROJECTION_SCHEMA = "ccm-test-agent-evidence-projection-v2";
exports.TEST_AGENT_HANDOFF_PROJECTION_SCHEMA = "ccm-test-agent-handoff-persistence-projection-v2";
const FORBIDDEN_DURABLE_KEYS = new Set([
    "body",
    "context",
    "output",
    "prompt",
    "rawbody",
    "rawcontent",
    "rawoutput",
    "rawresponse",
    "stderr",
    "stdout",
    "toolresult",
]);
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (!value || typeof value !== "object")
        return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function testAgentEvidenceChecksum(value) {
    const source = typeof value === "string" ? value : JSON.stringify(stable(value ?? null));
    return crypto.createHash("sha256").update(source).digest("hex");
}
function normalizedKey(value) {
    return String(value || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}
function shouldStripKey(key, fieldPath) {
    const normalized = normalizedKey(key);
    if (FORBIDDEN_DURABLE_KEYS.has(normalized))
        return true;
    if (["observedoutputpreview", "reviewoutputpreview", "responsebody", "requestbody", "tooloutput", "toolresponse"].includes(normalized))
        return true;
    // Assertion text is a check definition, not a tool result. Keep it so a
    // persisted handoff can still execute the declared assertion. Plain text or
    // content at any other path is treated as a possible result body.
    if (normalized === "text" || normalized === "content") {
        return !/projects\[\d+\]\.(?:browserChecks|browser_checks|httpChecks|http_checks|apiChecks|api_checks)\[\d+\]\.(?:assertions|expectations|stateAssertions|state_assertions)\[\d+\]\.text$/i.test(fieldPath);
    }
    return false;
}
function uniqueStrings(value, max = 200) {
    return [...new Set((Array.isArray(value) ? value : [])
            .map(item => String(item || "").trim().replace(/\\/g, "/"))
            .filter(Boolean))]
        .sort((left, right) => left.localeCompare(right))
        .slice(0, max);
}
function scalarSize(value) {
    let serialized = "";
    try {
        serialized = typeof value === "string" ? value : JSON.stringify(value);
    }
    catch {
        serialized = String(value || "");
    }
    return {
        charCount: serialized.length,
        tokenCount: Math.ceil(serialized.length / 4),
        checksum: testAgentEvidenceChecksum(serialized),
    };
}
function findForbiddenTestAgentEvidencePaths(value) {
    const paths = [];
    const visit = (node, path) => {
        if (!node || typeof node !== "object")
            return;
        if (Array.isArray(node)) {
            node.forEach((item, index) => visit(item, `${path}[${index}]`));
            return;
        }
        for (const [key, child] of Object.entries(node)) {
            const childPath = path ? `${path}.${key}` : key;
            if (shouldStripKey(key, childPath))
                paths.push(childPath);
            else
                visit(child, childPath);
        }
    };
    visit(value, "");
    return paths;
}
/**
 * Creates the durable form used by handoff/runner stores. The live caller keeps
 * the original value; only the returned copy crosses a persistence boundary.
 */
function projectTestAgentValueForPersistence(value) {
    const redactions = [];
    const visit = (node, fieldPath) => {
        if (Array.isArray(node))
            return node.map((item, index) => visit(item, `${fieldPath}[${index}]`));
        if (!node || typeof node !== "object")
            return node;
        const projected = {};
        for (const [key, child] of Object.entries(node)) {
            const childPath = fieldPath ? `${fieldPath}.${key}` : key;
            if (shouldStripKey(key, childPath)) {
                const size = scalarSize(child);
                redactions.push({
                    field: key,
                    fieldPathChecksum: testAgentEvidenceChecksum(childPath),
                    checksum: size.checksum,
                    charCount: size.charCount,
                    tokenCount: size.tokenCount,
                    contentStored: false,
                });
                continue;
            }
            projected[key] = visit(child, childPath);
        }
        return projected;
    };
    return { value: visit(value, ""), redactions };
}
function statusOf(value) {
    if (value?.success === true || value?.passed === true || value?.status === "passed" || value?.status === "completed")
        return "passed";
    if (value?.success === false || value?.passed === false || ["failed", "blocked", "error", "runtime_error"].includes(String(value?.status || "")))
        return "failed";
    return "unknown";
}
function fileRefsFromResult(result) {
    const candidates = [
        ...(Array.isArray(result?.fileChanges?.files) ? result.fileChanges.files : []),
        ...(Array.isArray(result?.filesChanged) ? result.filesChanged : []),
        ...(Array.isArray(result?.files_changed) ? result.files_changed : []),
    ];
    return uniqueStrings(candidates.map((item) => item?.path || item?.file || item), 300);
}
function verificationRefsFromResult(result) {
    const values = [
        ...(Array.isArray(result?.verification) ? result.verification : []),
        ...(Array.isArray(result?.verificationResults) ? result.verificationResults : []),
        ...(Array.isArray(result?.verification_results) ? result.verification_results : []),
        ...(Array.isArray(result?.checks) ? result.checks : []),
    ].slice(0, 100);
    return values.map((item, index) => {
        const object = item && typeof item === "object" ? item : {};
        const descriptor = object.id || object.checkId || object.check_id || object.command || object.name || item;
        return {
            checkId: String(object.id || object.checkId || object.check_id || `check-${index + 1}`).slice(0, 160),
            kind: String(object.kind || object.type || (object.command ? "command" : "declared")).slice(0, 80),
            status: statusOf(typeof item === "object" ? item : { status: "unknown" }),
            exitCode: Number.isFinite(Number(object.exitCode ?? object.exit_code)) ? Number(object.exitCode ?? object.exit_code) : null,
            durationMs: Math.max(0, Number(object.durationMs ?? object.duration_ms) || 0),
            definitionChecksum: testAgentEvidenceChecksum(String(descriptor || "")),
            resultChecksum: testAgentEvidenceChecksum(item),
            contentStored: false,
        };
    });
}
function sourceRefsFromResult(result) {
    const refs = result?.sourceRefs || result?.source_refs || result?.receipt?.sourceRefs || [];
    return (Array.isArray(refs) ? refs : []).slice(0, 100).map((item, index) => ({
        sourceId: String(item?.sourceId || item?.source_id || `source-${index + 1}`).slice(0, 240),
        documentId: String(item?.documentId || item?.document_id || "").slice(0, 240),
        chunkIds: uniqueStrings(item?.chunkIds || item?.chunk_ids, 100),
        revision: String(item?.revision || "").slice(0, 160),
        checksum: String(item?.checksum || testAgentEvidenceChecksum(item)).slice(0, 160),
        contentStored: false,
    }));
}
function buildTestAgentEvidenceProjection(input) {
    const workerReceipts = (Array.isArray(input.workerResults) ? input.workerResults : []).slice(0, 100).map((result, index) => {
        const outputSize = scalarSize({
            output: result?.output,
            stdout: result?.stdout,
            stderr: result?.stderr,
            rawOutput: result?.rawOutput || result?.raw_output,
        });
        const fileRefs = fileRefsFromResult(result);
        const verificationRefs = verificationRefsFromResult(result);
        const sourceRefs = sourceRefsFromResult(result);
        const blockerValues = Array.isArray(result?.blockers) ? result.blockers : result?.error ? [result.error] : [];
        return {
            workerId: String(result?.workerId || result?.worker_id || result?.agentId || result?.agent_id || `worker-${index + 1}`).slice(0, 160),
            project: String(result?.project || result?.projectName || result?.project_name || "").slice(0, 240),
            status: statusOf(result),
            fileRefs,
            verificationRefs,
            sourceRefs,
            blockerCount: blockerValues.length,
            blockerChecksum: blockerValues.length ? testAgentEvidenceChecksum(blockerValues) : "",
            outputReference: {
                checksum: outputSize.checksum,
                charCount: outputSize.charCount,
                tokenCount: outputSize.tokenCount,
                contentStored: false,
            },
            receiptChecksum: testAgentEvidenceChecksum({
                status: statusOf(result),
                fileRefs,
                verificationRefs,
                sourceRefs,
                blockers: blockerValues,
                outputChecksum: outputSize.checksum,
            }),
            contentStored: false,
        };
    });
    const uniqueFiles = uniqueStrings(workerReceipts.flatMap(item => item.fileRefs), 1000);
    const core = {
        schema: exports.TEST_AGENT_EVIDENCE_PROJECTION_SCHEMA,
        taskId: String(input.taskId || "").slice(0, 200),
        scope: input.scope || "project",
        scopeId: String(input.scopeId || "").slice(0, 240),
        createdAt: input.createdAt || new Date().toISOString(),
        workerReceipts,
        totals: {
            workers: workerReceipts.length,
            passed: workerReceipts.filter(item => item.status === "passed").length,
            failed: workerReceipts.filter(item => item.status === "failed").length,
            files: uniqueFiles.length,
            checks: workerReceipts.reduce((sum, item) => sum + item.verificationRefs.length, 0),
            sourceRefs: workerReceipts.reduce((sum, item) => sum + item.sourceRefs.length, 0),
            rawChars: workerReceipts.reduce((sum, item) => sum + item.outputReference.charCount, 0),
            rawTokens: workerReceipts.reduce((sum, item) => sum + item.outputReference.tokenCount, 0),
        },
        contentStored: false,
    };
    return { ...core, checksum: testAgentEvidenceChecksum(core) };
}
function summarizeTestAgentEvidenceProjection(value) {
    return `结构化交付证据：${value.totals.workers} 个执行回执，${value.totals.files} 个文件引用，${value.totals.checks} 个验证引用；正文未持久化。`;
}
function readTestAgentEvidenceProjection(value) {
    if (value?.schema === exports.TEST_AGENT_EVIDENCE_PROJECTION_SCHEMA) {
        const forbidden = findForbiddenTestAgentEvidencePaths(value);
        if (!forbidden.length)
            return value;
        (0, hardening_metrics_1.recordTestAgentHardeningMetric)("test_agent_projection_rejected_total", forbidden.length);
    }
    const legacyResults = Array.isArray(value?.workerReceipts)
        ? value.workerReceipts
        : Array.isArray(value?.workerResults) ? value.workerResults : [];
    const projection = buildTestAgentEvidenceProjection({
        taskId: value?.taskId || value?.task_id || "",
        scope: ["global", "project", "group"].includes(value?.scope) ? value.scope : "project",
        scopeId: value?.scopeId || value?.scope_id || "",
        workerResults: legacyResults,
        createdAt: value?.createdAt || value?.created_at || undefined,
    });
    return { ...projection, legacyStatus: legacyResults.length ? "resolved" : "unresolved" };
}
function projectTestAgentHandoffForPersistence(handoff) {
    const projected = projectTestAgentValueForPersistence(handoff || {});
    const value = {
        ...projected.value,
        schema: "ccm-test-agent-handoff-v2",
        persistenceProjection: {
            schema: exports.TEST_AGENT_HANDOFF_PROJECTION_SCHEMA,
            redactedFields: projected.redactions,
            redactedCount: projected.redactions.length,
            contentStored: false,
        },
    };
    value.persistenceProjection.checksum = testAgentEvidenceChecksum(value.persistenceProjection);
    return value;
}
function projectTestAgentExecutionResultForPersistence(result) {
    if (!result || typeof result !== "object")
        return result;
    const projected = projectTestAgentValueForPersistence(result);
    return {
        ...projected.value,
        persistenceProjection: {
            schema: exports.TEST_AGENT_HANDOFF_PROJECTION_SCHEMA,
            redactedFields: projected.redactions,
            redactedCount: projected.redactions.length,
            contentStored: false,
            checksum: testAgentEvidenceChecksum(projected.redactions),
        },
    };
}
function runTestAgentEvidenceProjectionSelfTest() {
    const sentinel = "TEST_AGENT_DURABLE_BODY_SENTINEL_8f4c88";
    const projection = buildTestAgentEvidenceProjection({
        taskId: "projection-selftest",
        workerResults: [{
                success: true,
                output: sentinel,
                stdout: sentinel,
                stderr: sentinel,
                fileChanges: { files: [{ path: "backend/test-agent/example.ts" }] },
                verification: [{ id: "typecheck", status: "passed", stdout: sentinel }],
            }],
    });
    const persistedHandoff = projectTestAgentHandoffForPersistence({
        schema: "ccm-test-agent-handoff-v1",
        originalUserGoal: "Verify the projection boundary",
        projects: [{ name: "selftest", agentSummary: summarizeTestAgentEvidenceProjection(projection), context: sentinel }],
        rawOutput: sentinel,
    });
    const serialized = JSON.stringify({ projection, persistedHandoff });
    const forbidden = findForbiddenTestAgentEvidencePaths({ projection, persistedHandoff });
    return {
        pass: !serialized.includes(sentinel)
            && projection.contentStored === false
            && persistedHandoff.schema === "ccm-test-agent-handoff-v2"
            && forbidden.length === 0,
        sentinelAbsent: !serialized.includes(sentinel),
        forbiddenPaths: forbidden,
        projectionChecksum: projection.checksum,
    };
}
//# sourceMappingURL=evidence-projection.js.map