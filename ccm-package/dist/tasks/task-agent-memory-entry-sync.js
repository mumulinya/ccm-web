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
exports.TASK_AGENT_MEMORY_ENTRY_MANIFEST_SCHEMA = exports.TASK_AGENT_MEMORY_ENTRY_SYNC_SCHEMA = void 0;
exports.stripTaskAgentMemoryEntrySync = stripTaskAgentMemoryEntrySync;
exports.taskAgentMemorySemanticChecksum = taskAgentMemorySemanticChecksum;
exports.buildTaskAgentMemoryEntryManifest = buildTaskAgentMemoryEntryManifest;
exports.verifyTaskAgentMemoryEntryManifest = verifyTaskAgentMemoryEntryManifest;
exports.buildTaskAgentMemoryEntrySyncPlan = buildTaskAgentMemoryEntrySyncPlan;
exports.verifyTaskAgentMemoryEntrySyncPlan = verifyTaskAgentMemoryEntrySyncPlan;
exports.attachTaskAgentMemoryEntrySyncPlan = attachTaskAgentMemoryEntrySyncPlan;
exports.taskAgentMemoryEntrySyncPlan = taskAgentMemoryEntrySyncPlan;
exports.taskAgentMemoryTransport = taskAgentMemoryTransport;
const crypto = __importStar(require("crypto"));
exports.TASK_AGENT_MEMORY_ENTRY_SYNC_SCHEMA = "ccm-task-agent-memory-entry-sync-v1";
exports.TASK_AGENT_MEMORY_ENTRY_MANIFEST_SCHEMA = "ccm-task-agent-memory-entry-manifest-v1";
function canonical(value) {
    if (Array.isArray(value))
        return value.map(canonical);
    if (!value || typeof value !== "object")
        return value;
    return Object.keys(value).sort().reduce((result, key) => {
        if (value[key] !== undefined)
            result[key] = canonical(value[key]);
        return result;
    }, {});
}
function stableText(value) {
    return typeof value === "string" ? value : JSON.stringify(canonical(value));
}
function digest(value) {
    return crypto.createHash("sha256").update(stableText(value)).digest("hex");
}
function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
function memoryRoot(memory) {
    if (memory?.schema === "ccm-group-memory-context-v1")
        return memory;
    if (memory?.group_memory?.schema === "ccm-group-memory-context-v1")
        return memory.group_memory;
    if (memory?.groupMemory?.schema === "ccm-group-memory-context-v1")
        return memory.groupMemory;
    return memory && typeof memory === "object" ? memory : null;
}
function relPath(row) {
    return String(row?.rel_path || row?.relPath || row?.path || "").trim().replace(/\\/g, "/");
}
function typedRows(root) {
    const candidates = [
        root?.typed_memory_delivery_capsule?.rows,
        root?.typedMemoryDeliveryCapsule?.rows,
        root?.group_state?.typedMemory?.deliveryCapsule?.rows,
        root?.group_state?.typed_memory?.delivery_capsule?.rows,
        root?.typed_memory_recall?.recalled,
        root?.typedMemoryRecall?.recalled,
        Array.isArray(root?.typed_memory_recall) ? root.typed_memory_recall : null,
        Array.isArray(root?.typedMemoryRecall) ? root.typedMemoryRecall : null,
        root?.group_state?.typedMemory?.recall?.recalled,
        root?.group_state?.typed_memory?.recall?.recalled,
    ];
    const rows = new Map();
    for (const candidate of candidates) {
        if (!Array.isArray(candidate))
            continue;
        for (const row of candidate) {
            const path = relPath(row);
            if (!path || rows.has(path))
                continue;
            rows.set(path, clone(row));
        }
    }
    return rows;
}
function omitDerivedMemoryFields(rootInput) {
    const root = clone(rootInput || {});
    for (const key of [
        "rendered_text", "renderedText", "summary",
        "typed_memory_recall", "typedMemoryRecall",
        "typed_memory_delivery_capsule", "typedMemoryDeliveryCapsule",
        "typed_memory_delivery_lease", "typedMemoryDeliveryLease",
        "task_agent_memory_entry_sync", "taskAgentMemoryEntrySync",
    ])
        delete root[key];
    if (root.group_state && typeof root.group_state === "object") {
        root.group_state = { ...root.group_state };
        delete root.group_state.typedMemory;
        delete root.group_state.typed_memory;
        if (!Object.keys(root.group_state).length)
            delete root.group_state;
    }
    return root;
}
function manifestChecksumPayload(manifest) {
    return {
        schema: manifest?.schema,
        version: manifest?.version,
        group_id: manifest?.group_id,
        group_session_id: manifest?.group_session_id,
        entries: manifest?.entries,
    };
}
function stripTaskAgentMemoryEntrySync(memory) {
    const result = clone(memory || {});
    const root = memoryRoot(result);
    if (root && typeof root === "object") {
        delete root.task_agent_memory_entry_sync;
        delete root.taskAgentMemoryEntrySync;
    }
    delete result.task_agent_memory_entry_sync;
    delete result.taskAgentMemoryEntrySync;
    return result;
}
function taskAgentMemorySemanticChecksum(memory) {
    return digest(stripTaskAgentMemoryEntrySync(memory));
}
function buildTaskAgentMemoryEntryManifest(memoryInput) {
    const memory = stripTaskAgentMemoryEntrySync(memoryInput);
    const root = memoryRoot(memory);
    const groupId = String(root?.group_id || root?.groupId || "");
    const groupSessionId = String(root?.group_session_id || root?.groupSessionId || "");
    const entries = {};
    const entryContents = {};
    if (root) {
        const core = omitDerivedMemoryFields(root);
        if (Object.keys(core).length)
            entryContents["group/core"] = core;
        for (const [path, row] of typedRows(root))
            entryContents[`typed/${path}`] = row;
    }
    const globalMission = memory?.global_mission_memory || memory?.globalMissionMemory || null;
    if (globalMission)
        entryContents["global/mission"] = clone(globalMission);
    if (!Object.keys(entryContents).length)
        entryContents["memory/value"] = memory;
    for (const key of Object.keys(entryContents).sort()) {
        const content = entryContents[key];
        const contentText = stableText(content);
        entries[key] = {
            checksum: `sha256:${digest(contentText)}`,
            chars: contentText.length,
            bytes: Buffer.byteLength(contentText, "utf8"),
        };
    }
    const payload = {
        schema: exports.TASK_AGENT_MEMORY_ENTRY_MANIFEST_SCHEMA,
        version: 1,
        group_id: groupId,
        group_session_id: groupSessionId,
        entries,
    };
    return {
        ...payload,
        manifest_checksum: digest(payload),
        source_memory_context_checksum: digest(memory),
        entry_contents: entryContents,
    };
}
function verifyTaskAgentMemoryEntryManifest(manifest, expected = {}) {
    const issues = [];
    if (manifest?.schema !== exports.TASK_AGENT_MEMORY_ENTRY_MANIFEST_SCHEMA)
        issues.push("manifest_schema_invalid");
    if (Number(manifest?.version || 0) !== 1)
        issues.push("manifest_version_invalid");
    if (!manifest?.entries || typeof manifest.entries !== "object" || Array.isArray(manifest.entries))
        issues.push("manifest_entries_invalid");
    if (String(manifest?.manifest_checksum || "") !== digest(manifestChecksumPayload(manifest)))
        issues.push("manifest_checksum_invalid");
    if (expected.groupId !== undefined && String(manifest?.group_id || "") !== String(expected.groupId || ""))
        issues.push("manifest_group_id_mismatch");
    if (expected.groupSessionId !== undefined && String(manifest?.group_session_id || "") !== String(expected.groupSessionId || ""))
        issues.push("manifest_group_session_id_mismatch");
    if (expected.sourceMemoryContextChecksum !== undefined && String(manifest?.source_memory_context_checksum || "") !== String(expected.sourceMemoryContextChecksum || ""))
        issues.push("manifest_source_checksum_mismatch");
    for (const [key, row] of Object.entries(manifest?.entries || {})) {
        if (!key || !/^sha256:[a-f0-9]{64}$/.test(String(row?.checksum || "")))
            issues.push("manifest_entry_checksum_invalid");
        if (Number(row?.chars || 0) < 0 || Number(row?.bytes || 0) < 0)
            issues.push("manifest_entry_size_invalid");
    }
    return { valid: issues.length === 0, issues: [...new Set(issues)] };
}
function renderEntry(key, content) {
    if (key.startsWith("typed/")) {
        const path = key.slice("typed/".length);
        const body = String(content?.content || content?.body || content?.snippet || content?.description || "");
        return [
            `### Changed typed memory: ${path}`,
            `document_checksum=${content?.document_checksum || content?.checksum || ""}`,
            body,
        ].filter(Boolean).join("\n");
    }
    return [`### Changed memory entry: ${key}`, stableText(content)].join("\n");
}
function buildTaskAgentMemoryEntrySyncPlan(input) {
    const current = buildTaskAgentMemoryEntryManifest(input.memory);
    const previous = input.previousManifest || null;
    const previousVerification = previous ? verifyTaskAgentMemoryEntryManifest(previous, {
        groupId: input.groupId,
        groupSessionId: input.groupSessionId,
    }) : { valid: false };
    const previousTrusted = input.previousTrusted === true && previousVerification.valid === true;
    const currentEntries = current.entries || {};
    const previousEntries = previousTrusted ? previous.entries || {} : {};
    const changedEntryKeys = Object.keys(currentEntries).filter(key => String(currentEntries[key]?.checksum || "") !== String(previousEntries[key]?.checksum || "")).sort();
    const removedEntryKeys = previousTrusted ? Object.keys(previousEntries).filter(key => !currentEntries[key]).sort() : [];
    let transportMode = !previousTrusted ? "full" : changedEntryKeys.length || removedEntryKeys.length ? "delta" : "continuation";
    const deltaSections = changedEntryKeys.map(key => renderEntry(key, current.entry_contents[key]));
    let transportText = transportMode === "delta" ? [
        "[CCM task-Agent memory delta]",
        `group_id=${input.groupId}`,
        `group_session_id=${input.groupSessionId}`,
        `previous_snapshot_id=${input.previousSnapshotId || ""}`,
        `previous_manifest_checksum=${previous?.manifest_checksum || ""}`,
        `current_manifest_checksum=${current.manifest_checksum}`,
        changedEntryKeys.length ? `changed_entries=${changedEntryKeys.join(",")}` : "changed_entries=none",
        removedEntryKeys.length ? `removed_entries=${removedEntryKeys.join(",")}` : "removed_entries=none",
        "Apply these replacements/removals to the memory baseline already loaded in this exact native session. Current source still wins on conflict.",
        ...deltaSections,
    ].join("\n") : "";
    const fullProjection = String(memoryRoot(input.memory)?.rendered_text || memoryRoot(input.memory)?.renderedText || "");
    if (transportMode === "delta" && fullProjection && transportText.length >= Math.max(800, Math.floor(fullProjection.length * 0.8))) {
        transportMode = "full";
        transportText = "";
    }
    const payload = {
        schema: exports.TASK_AGENT_MEMORY_ENTRY_SYNC_SCHEMA,
        version: 1,
        group_id: input.groupId,
        group_session_id: input.groupSessionId,
        task_id: input.taskId,
        task_agent_session_id: input.taskAgentSessionId,
        target_project: input.targetProject,
        source_memory_context_checksum: current.source_memory_context_checksum,
        current_manifest: {
            ...manifestChecksumPayload(current),
            manifest_checksum: current.manifest_checksum,
            source_memory_context_checksum: current.source_memory_context_checksum,
        },
        previous_snapshot_id: previousTrusted ? String(input.previousSnapshotId || "") : "",
        previous_snapshot_checksum: previousTrusted ? String(input.previousSnapshotChecksum || "") : "",
        previous_manifest_checksum: previousTrusted ? String(previous?.manifest_checksum || "") : "",
        previous_baseline_trusted: previousTrusted,
        transport_mode: transportMode,
        changed_entry_keys: transportMode === "delta" ? changedEntryKeys : transportMode === "full" ? Object.keys(currentEntries).sort() : [],
        removed_entry_keys: transportMode === "delta" ? removedEntryKeys : [],
        transport_text: transportText,
        transport_text_checksum: transportText ? digest(transportText) : "",
        full_entry_count: Object.keys(currentEntries).length,
        changed_entry_count: transportMode === "delta" ? changedEntryKeys.length : transportMode === "full" ? Object.keys(currentEntries).length : 0,
        removed_entry_count: transportMode === "delta" ? removedEntryKeys.length : 0,
        render_lease_id: String(input.renderLease?.lease_id || ""),
        render_fencing_token: Number(input.renderLease?.fencing_token || 0),
        render_lease_owner_pid: Number(input.renderLease?.owner_pid || 0),
        render_lease_acquired_at: String(input.renderLease?.acquired_at || ""),
        render_lease_expires_at: String(input.renderLease?.expires_at || ""),
        recovered_stale_lease_id: String(input.renderLease?.recovered_stale_lease_id || ""),
    };
    payload.plan_checksum = digest(payload);
    return payload;
}
function verifyTaskAgentMemoryEntrySyncPlan(plan, expected = {}) {
    const issues = [];
    if (plan?.schema !== exports.TASK_AGENT_MEMORY_ENTRY_SYNC_SCHEMA)
        issues.push("entry_sync_schema_invalid");
    if (Number(plan?.version || 0) !== 1)
        issues.push("entry_sync_version_invalid");
    if (!new Set(["full", "delta", "continuation"]).has(String(plan?.transport_mode || "")))
        issues.push("entry_sync_transport_mode_invalid");
    const payload = { ...(plan || {}) };
    delete payload.plan_checksum;
    if (String(plan?.plan_checksum || "") !== digest(payload))
        issues.push("entry_sync_plan_checksum_invalid");
    const bindings = [
        ["group_id", expected.groupId, plan?.group_id],
        ["group_session_id", expected.groupSessionId, plan?.group_session_id],
        ["task_id", expected.taskId, plan?.task_id],
        ["task_agent_session_id", expected.taskAgentSessionId, plan?.task_agent_session_id],
        ["target_project", expected.targetProject, plan?.target_project],
        ["source_memory_context_checksum", expected.sourceMemoryContextChecksum, plan?.source_memory_context_checksum],
    ];
    for (const [field, wanted, actual] of bindings)
        if (wanted !== undefined && String(wanted || "") !== String(actual || ""))
            issues.push(`entry_sync_${field}_mismatch`);
    const manifest = verifyTaskAgentMemoryEntryManifest(plan?.current_manifest, {
        groupId: expected.groupId,
        groupSessionId: expected.groupSessionId,
        sourceMemoryContextChecksum: expected.sourceMemoryContextChecksum,
    });
    issues.push(...manifest.issues);
    const mode = String(plan?.transport_mode || "");
    const transportText = String(plan?.transport_text || "");
    if (mode === "delta" && (!transportText || String(plan?.transport_text_checksum || "") !== digest(transportText)))
        issues.push("entry_sync_delta_text_invalid");
    if (mode !== "delta" && transportText)
        issues.push("entry_sync_non_delta_text_present");
    if (mode === "continuation" && (Number(plan?.changed_entry_count || 0) !== 0 || Number(plan?.removed_entry_count || 0) !== 0))
        issues.push("entry_sync_continuation_has_changes");
    if (mode !== "full" && plan?.previous_baseline_trusted !== true)
        issues.push("entry_sync_delta_without_trusted_baseline");
    if (!/^tamerl_[a-f0-9]{24}$/.test(String(plan?.render_lease_id || "")))
        issues.push("entry_sync_render_lease_id_invalid");
    if (!Number.isInteger(Number(plan?.render_fencing_token || 0)) || Number(plan?.render_fencing_token || 0) <= 0)
        issues.push("entry_sync_render_fencing_token_invalid");
    if (!Number.isInteger(Number(plan?.render_lease_owner_pid || 0)) || Number(plan?.render_lease_owner_pid || 0) <= 0)
        issues.push("entry_sync_render_lease_owner_invalid");
    const acquiredMs = Date.parse(String(plan?.render_lease_acquired_at || ""));
    const expiresMs = Date.parse(String(plan?.render_lease_expires_at || ""));
    if (!Number.isFinite(acquiredMs) || !Number.isFinite(expiresMs) || expiresMs <= acquiredMs)
        issues.push("entry_sync_render_lease_window_invalid");
    return { valid: issues.length === 0, issues: [...new Set(issues)], mode };
}
function attachTaskAgentMemoryEntrySyncPlan(memoryInput, plan) {
    const memory = clone(memoryInput || {});
    const root = memoryRoot(memory) || memory;
    root.task_agent_memory_entry_sync = clone(plan);
    return memory;
}
function taskAgentMemoryEntrySyncPlan(memory) {
    const root = memoryRoot(memory);
    return root?.task_agent_memory_entry_sync || root?.taskAgentMemoryEntrySync || memory?.task_agent_memory_entry_sync || memory?.taskAgentMemoryEntrySync || null;
}
function taskAgentMemoryTransport(memory) {
    const plan = taskAgentMemoryEntrySyncPlan(memory);
    const verification = plan ? verifyTaskAgentMemoryEntrySyncPlan(plan, {
        groupId: plan.group_id,
        groupSessionId: plan.group_session_id,
        taskId: plan.task_id,
        taskAgentSessionId: plan.task_agent_session_id,
        targetProject: plan.target_project,
        sourceMemoryContextChecksum: taskAgentMemorySemanticChecksum(memory),
    }) : { valid: false, issues: [], mode: "" };
    return {
        present: !!plan,
        valid: verification.valid === true,
        issues: verification.issues || [],
        mode: verification.valid ? String(plan.transport_mode || "") : "",
        text: verification.valid && plan.transport_mode === "delta" ? String(plan.transport_text || "") : "",
        plan,
    };
}
//# sourceMappingURL=task-agent-memory-entry-sync.js.map