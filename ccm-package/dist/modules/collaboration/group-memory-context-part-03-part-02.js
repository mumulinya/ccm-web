"use strict";
// Behavior-freeze split from group-memory-context-part-03.ts (part 2/2).
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAgentMemoryContextBundleWithManifestSelection = buildAgentMemoryContextBundleWithManifestSelection;
const group_memory_index_1 = require("./group-memory-index");
const storage_1 = require("./storage");
const group_memory_context_part_03_part_01_1 = require("./group-memory-context-part-03-part-01");
async function buildAgentMemoryContextBundleWithManifestSelection(groupId, targetProject, task = "", options = {}) {
    const requestedGroupSessionId = String(options.groupSessionId || options.group_session_id || "").trim();
    const requireExactGroupSession = options.requireExactGroupSession === true || options.require_exact_group_session === true;
    if (requireExactGroupSession && !requestedGroupSessionId.startsWith("gcs_")) {
        throw new Error("项目子 Agent 记忆上下文缺少精确群聊会话绑定");
    }
    if ((0, group_memory_index_1.shouldIgnoreGroupMemoryRequest)(task, options))
        return (0, group_memory_context_part_03_part_01_1.buildAgentMemoryContextBundle)(groupId, targetProject, task, options);
    const suppliedSelection = options.typedMemoryManifestSelection || options.typed_memory_manifest_selection || null;
    if (suppliedSelection)
        return (0, group_memory_context_part_03_part_01_1.buildAgentMemoryContextBundle)(groupId, targetProject, task, options);
    const groupSessionId = requestedGroupSessionId || String((0, storage_1.getActiveGroupChatSessionId)(groupId));
    if (!groupSessionId.startsWith("gcs_"))
        return (0, group_memory_context_part_03_part_01_1.buildAgentMemoryContextBundle)(groupId, targetProject, task, options);
    const bootstrap = (0, group_memory_context_part_03_part_01_1.buildAgentMemoryContextBundle)(groupId, targetProject, task, {
        ...options,
        manifestSelectorBootstrap: true
    });
    const typedMemory = bootstrap.group_state?.typedMemory || {};
    const scopeId = `${groupId}--${groupSessionId}`;
    const selection = await (0, group_memory_index_1.selectGroupTypedMemoryManifest)(scopeId, String(typedMemory.recallQuery || task || ""), {
        groupId,
        groupSessionId,
        targetProject,
        taskId: options.taskId || options.task_id || "",
        taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
        alreadySurfaced: typedMemory.ledger?.alreadySurfaced || [],
        targetPaths: typedMemory.targetPaths || options.targetPaths || options.target_paths || [],
        recentTools: typedMemory.recentTools || options.recentTools || options.recent_tools || [],
        executor: options.manifestSelectorExecutor || options.manifest_selector_executor,
        signal: options.signal,
        recordDecision: options.recordManifestSelectorDecision !== false && options.record_manifest_selector_decision !== false
    });
    const bundle = (0, group_memory_context_part_03_part_01_1.buildAgentMemoryContextBundle)(groupId, targetProject, task, {
        ...options,
        typedMemoryManifestSelection: selection
    });
    const recall = bundle.typedMemoryRecall || bundle.typed_memory_recall || bundle.group_state?.typedMemory?.recall || null;
    const capsule = bundle.typedMemoryDeliveryCapsule || bundle.typed_memory_delivery_capsule || bundle.group_state?.typedMemory?.deliveryCapsule || null;
    const recalledBeforeDeliveryBudget = [...new Set([
            ...(recall?.recalled || []).map((row) => row.relPath),
            ...(capsule?.skipped_rel_paths || []),
        ].map((item) => String(item || "")).filter(Boolean))];
    const selectorOutcome = (0, group_memory_index_1.recordGroupTypedMemoryManifestSelectorOutcome)(scopeId, selection, {
        stage: "attached",
        recalledRelPaths: recalledBeforeDeliveryBudget,
        attachedRelPaths: capsule?.delivered_rel_paths || [],
        capsuleChecksum: capsule?.capsule_checksum || "",
        deliveryLeaseId: bundle.typedMemoryDeliveryLease?.lease_id || bundle.typed_memory_delivery_lease?.lease_id || "",
        taskId: options.taskId || options.task_id || "",
        taskAgentSessionId: options.taskAgentSessionId || options.task_agent_session_id || "",
        targetProject,
        recordOutcome: options.recordManifestSelectorDecision !== false && options.record_manifest_selector_decision !== false
    });
    bundle.typed_memory_manifest_selection = selection;
    bundle.typedMemoryManifestSelection = selection;
    bundle.typed_memory_manifest_selector_outcome = selectorOutcome;
    bundle.typedMemoryManifestSelectorOutcome = selectorOutcome;
    return bundle;
}
//# sourceMappingURL=group-memory-context-part-03-part-02.js.map