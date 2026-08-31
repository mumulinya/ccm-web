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
exports.CCM_RUNTIME_SCHEMA_SUPPORT_POLICIES = void 0;
exports.runtimeSchemaState = runtimeSchemaState;
exports.acceptsCurrentRuntimeSchema = acceptsCurrentRuntimeSchema;
exports.stripRetiredRuntimeValues = stripRetiredRuntimeValues;
exports.scanRetiredRuntimeData = scanRetiredRuntimeData;
exports.publicRetiredRuntimeCandidates = publicRetiredRuntimeCandidates;
exports.purgeRetiredRuntimeCandidate = purgeRetiredRuntimeCandidate;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
exports.CCM_RUNTIME_SCHEMA_SUPPORT_POLICIES = [
    {
        domain: "canonical_context_accounting",
        currentSchemas: ["ccm-canonical-context-accounting-receipt-v2"],
        retiredSchemas: ["ccm-canonical-context-accounting-receipt-v1"],
        behavior: "ignore_and_report",
    },
    {
        domain: "provider_microcompact",
        currentSchemas: ["ccm-provider-microcompact-receipt-v3"],
        retiredSchemas: ["ccm-provider-microcompact-receipt-v1", "ccm-provider-microcompact-receipt-v2"],
        behavior: "ignore_and_report",
    },
    {
        domain: "partial_compaction",
        currentSchemas: ["ccm-partial-compaction-projection-v2"],
        retiredSchemas: ["ccm-partial-compaction-projection-v1"],
        behavior: "ignore_and_report",
    },
    {
        domain: "context_source_continuity",
        currentSchemas: ["ccm-context-source-continuity-store-v2"],
        retiredSchemas: ["ccm-context-source-continuity-store-v1"],
        behavior: "ignore_and_report",
    },
    {
        domain: "post_compact_continuity",
        currentSchemas: ["ccm-main-agent-post-compact-restore-manifest-v3", "ccm-post-compact-tool-restore-receipt-v2"],
        retiredSchemas: [
            "ccm-main-agent-post-compact-restore-manifest-v1",
            "ccm-main-agent-post-compact-restore-manifest-v2",
            "ccm-post-compact-tool-restore-receipt-v1",
        ],
        behavior: "ignore_and_report",
    },
    {
        domain: "provider_cache_capability",
        currentSchemas: ["ccm-provider-cache-capability-registry-v2", "ccm-provider-cache-capability-evidence-v2"],
        retiredSchemas: ["ccm-provider-cache-capability-registry-v1", "ccm-provider-cache-capability-evidence-v1"],
        behavior: "ignore_and_report",
    },
    {
        domain: "provider_context_cache",
        currentSchemas: ["ccm-context-plan-state-v2", "ccm-context-plan-v2"],
        retiredSchemas: ["ccm-provider-neutral-context-cache-state-v1", "ccm-provider-neutral-context-cache-plan-v1"],
        behavior: "ignore_and_report",
    },
    {
        domain: "task_acceptance",
        currentSchemas: ["ccm-task-acceptance-policy-snapshot-v2"],
        retiredSchemas: ["ccm-task-acceptance-policy-snapshot-v1"],
        behavior: "ignore_and_report",
    },
    {
        domain: "test_agent",
        currentSchemas: [
            "ccm-test-agent-evidence-projection-v2",
            "ccm-test-agent-handoff-persistence-projection-v2",
            "ccm-test-agent-handoff-v2",
        ],
        retiredSchemas: ["ccm-test-agent-handoff-v1"],
        behavior: "ignore_and_report",
    },
    {
        domain: "loaded_context",
        currentSchemas: ["ccm-loaded-context-items-v2"],
        retiredSchemas: ["ccm-loaded-context-items-v1"],
        behavior: "ignore_and_report",
    },
    {
        domain: "model_visible_payload",
        currentSchemas: ["ccm-model-visible-payload-snapshot-v2"],
        retiredSchemas: ["ccm-model-visible-payload-snapshot-v1"],
        behavior: "ignore_and_report",
    },
    {
        domain: "project_memory",
        currentSchemas: ["ccm-project-memory-v4"],
        retiredSchemas: ["ccm-project-memory-legacy"],
        behavior: "ignore_and_report",
    },
    {
        domain: "agent_metrics",
        currentSchemas: ["ccm-metrics-dashboard-v3"],
        retiredSchemas: ["ccm-agent-metrics-unscoped-legacy"],
        behavior: "ignore_and_report",
    },
];
const POLICY_BY_SCHEMA = new Map();
for (const policy of exports.CCM_RUNTIME_SCHEMA_SUPPORT_POLICIES) {
    for (const schema of policy.currentSchemas)
        POLICY_BY_SCHEMA.set(schema, { policy, state: "current" });
    for (const schema of policy.retiredSchemas)
        POLICY_BY_SCHEMA.set(schema, { policy, state: "retired" });
}
function runtimeSchemaState(schema, domain) {
    const entry = POLICY_BY_SCHEMA.get(String(schema || ""));
    if (!entry || (domain && entry.policy.domain !== domain))
        return "unknown";
    return entry.state;
}
function acceptsCurrentRuntimeSchema(domain, schema) {
    return runtimeSchemaState(schema, domain) === "current";
}
function stripRetiredRuntimeValues(value, retiredSchemasInput) {
    const retiredSchemas = new Set(retiredSchemasInput);
    const removed = { records: 0 };
    const REMOVE = Symbol("retired-runtime-value");
    const prune = (current) => {
        if (!current || typeof current !== "object")
            return current;
        if (retiredSchemas.has(String(current.schema || ""))) {
            removed.records += 1;
            return REMOVE;
        }
        if (Array.isArray(current))
            return current.map(prune).filter(item => item !== REMOVE);
        const next = {};
        for (const [key, child] of Object.entries(current)) {
            const projected = prune(child);
            if (projected !== REMOVE)
                next[key] = projected;
        }
        return next;
    };
    const projected = prune(value);
    return {
        value: projected === REMOVE ? null : projected,
        rootRemoved: projected === REMOVE,
        removedRecords: removed.records,
    };
}
const DATA_ROOT = path.join(os.homedir(), ".ccm");
const SCAN_ROOTS = [
    path.join(DATA_ROOT, "context-accounting"),
    path.join(DATA_ROOT, "main-agent-context-continuity"),
    path.join(DATA_ROOT, "provider-cache-capability"),
    path.join(DATA_ROOT, "provider-context-cache"),
    path.join(DATA_ROOT, "agent-execution-events"),
    path.join(DATA_ROOT, "task-replay"),
    path.join(DATA_ROOT, "test-agent"),
    path.join(DATA_ROOT, "project-memory"),
    path.join(DATA_ROOT, "metrics.json"),
];
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const MAX_VISITED_VALUES = 200_000;
function checksum(value) {
    return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}
function collectSchemaOccurrences(value) {
    const counts = new Map();
    const stack = [value];
    let visited = 0;
    while (stack.length && visited < MAX_VISITED_VALUES) {
        const current = stack.pop();
        visited += 1;
        if (!current || typeof current !== "object")
            continue;
        if (typeof current.schema === "string")
            counts.set(current.schema, (counts.get(current.schema) || 0) + 1);
        if (Array.isArray(current))
            stack.push(...current);
        else
            stack.push(...Object.values(current));
    }
    return counts;
}
function safeJson(file) {
    try {
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_JSON_BYTES)
            return null;
        if (file.endsWith(".jsonl")) {
            return fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).slice(-20_000).map(row => {
                try {
                    return JSON.parse(row);
                }
                catch {
                    return null;
                }
            }).filter(Boolean);
        }
        return JSON.parse(fs.readFileSync(file, "utf8"));
    }
    catch {
        return null;
    }
}
function filesUnder(root) {
    const files = [];
    const walk = (entry) => {
        let stat;
        try {
            stat = fs.lstatSync(entry);
        }
        catch {
            return;
        }
        if (stat.isSymbolicLink())
            return;
        if (stat.isFile()) {
            if (/\.jsonl?$/i.test(entry))
                files.push(entry);
            return;
        }
        if (!stat.isDirectory())
            return;
        let names = [];
        try {
            names = fs.readdirSync(entry);
        }
        catch {
            return;
        }
        for (const name of names)
            walk(path.join(entry, name));
    };
    walk(root);
    return files;
}
function scanRetiredRuntimeData() {
    const candidates = [];
    for (const root of SCAN_ROOTS) {
        for (const file of filesUnder(root)) {
            const parsed = safeJson(file);
            if (parsed === null)
                continue;
            const occurrences = collectSchemaOccurrences(parsed);
            const relative = path.relative(DATA_ROOT, file).replace(/\\/g, "/");
            if (relative.startsWith("project-memory/")
                && (parsed?.schema !== "ccm-project-memory-v4" || Number(parsed?.version || 0) !== 4)) {
                occurrences.set("ccm-project-memory-legacy", 1);
            }
            if (relative === "metrics.json" && Array.isArray(parsed?.events) && parsed.events.length > 0) {
                occurrences.set("ccm-agent-metrics-unscoped-legacy", parsed.events.length);
            }
            const byDomain = new Map();
            for (const [schema, count] of occurrences) {
                const entry = POLICY_BY_SCHEMA.get(schema);
                if (!entry || entry.state !== "retired")
                    continue;
                const current = byDomain.get(entry.policy.domain) || { schemas: new Set(), records: 0 };
                current.schemas.add(schema);
                current.records += count;
                byDomain.set(entry.policy.domain, current);
            }
            let stat;
            try {
                stat = fs.statSync(file);
            }
            catch {
                continue;
            }
            for (const [domain, found] of byDomain) {
                candidates.push({
                    id: `retired:${domain}:${checksum(relative).slice(0, 24)}`,
                    domain,
                    file,
                    bytes: stat.size,
                    recordCount: found.records,
                    schemas: [...found.schemas].sort(),
                    fingerprint: checksum(`${relative}:${stat.size}:${stat.mtimeMs}:${[...found.schemas].sort().join(",")}:${found.records}`),
                });
            }
        }
    }
    const summaries = exports.CCM_RUNTIME_SCHEMA_SUPPORT_POLICIES.map(policy => {
        const rows = candidates.filter(item => item.domain === policy.domain);
        return {
            domain: policy.domain,
            recordCount: rows.reduce((sum, item) => sum + item.recordCount, 0),
            fileCount: new Set(rows.map(item => item.file)).size,
            bytes: rows.reduce((sum, item) => sum + item.bytes, 0),
            retiredSchemas: policy.retiredSchemas,
            deletable: true,
            contentStored: false,
        };
    }).filter(item => item.recordCount > 0);
    const physicalFiles = new Map();
    for (const candidate of candidates)
        physicalFiles.set(candidate.file, candidate.bytes);
    return {
        summaries,
        candidates,
        totals: {
            records: summaries.reduce((sum, item) => sum + item.recordCount, 0),
            files: physicalFiles.size,
            bytes: [...physicalFiles.values()].reduce((sum, bytes) => sum + bytes, 0),
        },
    };
}
function publicRetiredRuntimeCandidates() {
    return scanRetiredRuntimeData().candidates.map(item => ({
        id: item.id,
        domain: item.domain,
        bytes: item.bytes,
        recordCount: item.recordCount,
        retiredSchemas: item.schemas,
        fingerprint: item.fingerprint,
        contentStored: false,
    }));
}
function purgeRetiredRuntimeCandidate(id, expectedFingerprint = "") {
    const candidate = scanRetiredRuntimeData().candidates.find(item => item.id === id);
    if (!candidate)
        throw new Error("退役运行数据不存在或已经清理");
    if (expectedFingerprint && candidate.fingerprint !== expectedFingerprint)
        throw new Error("退役运行数据已发生变化，请重新预览");
    const resolved = path.resolve(candidate.file);
    if (!resolved.startsWith(`${path.resolve(DATA_ROOT)}${path.sep}`))
        throw new Error("退役运行数据路径越界");
    const stat = fs.lstatSync(resolved);
    if (!stat.isFile() || stat.isSymbolicLink())
        throw new Error("退役运行数据文件类型无效");
    const retiredSchemas = new Set(exports.CCM_RUNTIME_SCHEMA_SUPPORT_POLICIES.find(policy => policy.domain === candidate.domain)?.retiredSchemas || []);
    if (candidate.schemas.includes("ccm-project-memory-legacy")
        || candidate.schemas.includes("ccm-agent-metrics-unscoped-legacy")) {
        fs.unlinkSync(resolved);
        return {
            status: "deleted",
            cleanup: {
                retired_runtime_files: 1,
                retired_runtime_records: candidate.recordCount,
                retired_runtime_bytes: stat.size,
            },
        };
    }
    const original = fs.readFileSync(resolved, "utf8");
    let nextText = "";
    let deleteFile = false;
    let removedRecords = 0;
    if (resolved.endsWith(".jsonl")) {
        const kept = [];
        for (const line of original.split(/\r?\n/)) {
            if (!line.trim())
                continue;
            try {
                const projected = stripRetiredRuntimeValues(JSON.parse(line), retiredSchemas);
                removedRecords += projected.removedRecords;
                if (!projected.rootRemoved)
                    kept.push(JSON.stringify(projected.value));
            }
            catch {
                kept.push(line);
            }
        }
        nextText = kept.length ? `${kept.join("\n")}\n` : "";
        deleteFile = kept.length === 0;
    }
    else {
        const projected = stripRetiredRuntimeValues(JSON.parse(original), retiredSchemas);
        removedRecords = projected.removedRecords;
        deleteFile = projected.rootRemoved;
        if (!deleteFile)
            nextText = `${JSON.stringify(projected.value, null, 2)}\n`;
    }
    if (removedRecords < 1)
        throw new Error("退役运行数据已发生变化，请重新预览");
    if (deleteFile) {
        fs.unlinkSync(resolved);
    }
    else {
        const temp = `${resolved}.${process.pid}.${Date.now()}.tmp`;
        fs.writeFileSync(temp, nextText, "utf8");
        fs.renameSync(temp, resolved);
    }
    const remainingBytes = deleteFile ? 0 : fs.statSync(resolved).size;
    return {
        status: deleteFile ? "deleted" : "pruned",
        cleanup: {
            retired_runtime_files: deleteFile ? 1 : 0,
            retired_runtime_records: removedRecords,
            retired_runtime_bytes: Math.max(0, stat.size - remainingBytes),
        },
    };
}
//# sourceMappingURL=runtime-schema-policy.js.map