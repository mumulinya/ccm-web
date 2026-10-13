"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUnifiedGroupToolRestore = buildUnifiedGroupToolRestore;
exports.persistUnifiedGroupToolRestore = persistUnifiedGroupToolRestore;
const group_compaction_projections_1 = require("./group-compaction-projections");
/** Restore selected tools/Skills inside the unified engine's payload gate. */
function buildUnifiedGroupToolRestore(input, summary, preservedMessages) {
    const config = input.config || {};
    const preserved = new Set((preservedMessages || []).map(row => String(row.id || row.uuid || row.messageId || '')));
    const sources = (input.messages || []).filter(row => !preserved.has(String(row.id || row.uuid || row.messageId || '')));
    return (0, group_compaction_projections_1.buildPostCompactReinjectionPlan)(sources, {}, {
        ...(config.postCompactReinject || config.post_compact_reinject || {}),
        groupId: input.groupId, groupSessionId: input.groupSessionId,
        sessionMessages: input.messages || [], preservedMessages,
        tasks: input.activeTasks || [],
        currentTaskId: config.currentTaskId || config.current_task_id,
        dynamicContextCatalog: config.postCompactDynamicContextCatalog || config.post_compact_dynamic_context_catalog || {},
        dynamicContextScanMode: input.partialCompact || input.compactionRequest?.mode === 'partial' ? 'partial' : 'full',
        preCompactLoadedToolNames: input.memory?.compaction?.preCompactDiscoveredTools || [],
        priorDynamicContextAttachments: [input.memory?.compaction?.postCompactReinject?.dynamicContextDeltaAttachment,
            input.memory?.compactBoundary?.post_compact_restore?.reinjectionPlan?.dynamicContextDeltaAttachment].filter(Boolean),
        invokedSkillSingleMaxTokens: config.postCompactSkillPerItemMaxTokens || config.post_compact_skill_per_item_max_tokens,
        invokedSkillsTotalMaxTokens: config.postCompactSkillTotalMaxTokens || config.post_compact_skill_total_max_tokens,
    });
}
function persistUnifiedGroupToolRestore(memory, result, plan) {
    if (!result.compacted || !plan)
        return;
    const previous = memory.compaction || {};
    const partial = result.partialCompaction;
    memory.compaction = {
        ...previous,
        postCompactReinject: partial ? previous.postCompactReinject : plan,
        ...(partial ? { partialSegments: [...(previous.partialSegments || []), {
                    schema: 'ccm-unified-group-partial-restore-v1',
                    id: result.receipt.checksum,
                    summarizedMessageIds: partial.summarizedMessageIds,
                    preservedMessageIds: partial.preservedMessageIds,
                    reinjectionPlan: plan,
                    unifiedReceiptChecksum: result.receipt.checksum,
                }].slice(-16) } : {}),
    };
}
//# sourceMappingURL=group-unified-tool-restore.js.map