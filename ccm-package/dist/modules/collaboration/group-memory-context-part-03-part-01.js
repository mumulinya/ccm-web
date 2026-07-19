"use strict";
// Behavior-freeze split from group-memory-context-part-03.ts (part 1/2).
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAgentMemoryContextBundle = buildAgentMemoryContextBundle;
const context_budget_1 = require("../../system/context-budget");
const session_memory_window_1 = require("../../system/session-memory-window");
const group_runtime_memory_admission_1 = require("./group-runtime-memory-admission");
const group_memory_compaction_1 = require("./group-memory-compaction");
const group_memory_index_1 = require("./group-memory-index");
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const storage_1 = require("./storage");
const group_memory_boundary_journal_1 = require("./group-memory-boundary-journal");
const memory_1 = require("../../agents/global/memory");
const group_post_turn_summary_1 = require("./group-post-turn-summary");
const group_compact_head_1 = require("./group-compact-head");
const provider_native_compact_execution_receipt_1 = require("./provider-native-compact-execution-receipt");
const provider_native_compact_session_capacity_1 = require("./provider-native-compact-session-capacity");
const group_prompt_cache_break_detection_1 = require("./group-prompt-cache-break-detection");
const group_agent_memory_packet_1 = require("./group-agent-memory-packet");
const group_compact_file_references_1 = require("./group-compact-file-references");
const group_global_memory_arbitration_1 = require("./group-global-memory-arbitration");
const group_memory_shared_1 = require("./group-memory-shared");
const group_memory_storage_1 = require("./group-memory-storage");
const group_session_memory_snapshot_1 = require("./group-session-memory-snapshot");
const group_tool_continuity_1 = require("./group-tool-continuity");
const group_memory_context_part_01_1 = require("./group-memory-context-part-01");
const group_memory_context_part_02_1 = require("./group-memory-context-part-02");
const group_memory_context_part_04_1 = require("./group-memory-context-part-04");
function buildAgentMemoryContextBundle(groupId, targetProject, task = "", options = {}) {
    const project = (0, group_memory_shared_1.normalizeAgentMemoryProject)(targetProject);
    const groupSessionId = String(options.groupSessionId || options.group_session_id || (0, storage_1.getActiveGroupChatSessionId)(groupId));
    const typedMemoryScopeId = groupSessionId === "default" ? groupId : `${groupId}--${groupSessionId}`;
    const ignoreMemory = (0, group_memory_index_1.shouldIgnoreGroupMemoryRequest)(task, options);
    const generatedAt = new Date().toISOString();
    const sessionBinding = (0, group_memory_context_part_01_1.buildChildAgentSessionBinding)(groupId, project, task, { ...options, generatedAt });
    let compactHead = groupSessionId.startsWith("gcs_") ? (0, group_compact_head_1.readGroupCompactHead)(groupId, groupSessionId) : null;
    if (ignoreMemory) {
        const bundle = {
            schema: "ccm-group-memory-context-v1",
            version: 1,
            group_id: groupId,
            group_session_id: groupSessionId,
            target_project: project,
            task_query: (0, group_memory_shared_1.compactMemoryText)(task, 900),
            generated_at: generatedAt,
            session_binding: sessionBinding,
            compact_head: compactHead,
            memory_policy: {
                ignored: true,
                ignore_reason: "user_requested_ignore_memory",
                priority: "user_ignore_memory_request_over_platform_memory",
                use: "must_not_use_memory",
                boundary: "current_task_only",
                raw_recovery: "disabled for this turn unless the user explicitly asks to restore memory"
            },
            compaction: {},
            group_state: {
                goal: "",
                currentPhase: "memory_ignored",
                summaryText: "",
                decisions: [],
                openQuestions: [],
                nextActions: [],
                persistentRequirements: [],
                factAnchors: [],
                typedMemory: {
                    sync: null,
                    recall: {
                        schema: "ccm-group-typed-memory-recall-v1",
                        ignored: true,
                        reason: "user_requested_ignore_memory",
                        indexFile: "",
                        memoryDir: (0, group_memory_index_1.getGroupTypedMemoryDir)(typedMemoryScopeId),
                        recalled: [],
                        surfaced: []
                    }
                }
            },
            target_agent_memory: {},
            related_work: {},
            relevant_historical_evidence: "",
            raw_sources: {
                group_memory_file: (0, group_memory_storage_1.getGroupMemoryFile)(groupId, groupSessionId),
                group_messages_file: (0, group_memory_shared_1.getGroupMessagesFileHint)(groupId, groupSessionId),
                group_typed_memory_dir: (0, group_memory_index_1.getGroupTypedMemoryDir)(typedMemoryScopeId)
            }
        };
        bundle.dispatch_freshness_gate = (0, group_compact_file_references_1.buildGroupMemoryDispatchFreshnessGate)({
            groupId,
            targetProject: project,
            scope: `child:${project}`,
            generatedAt,
            memoryIgnored: true
        });
        const rendered = (0, group_memory_context_part_04_1.renderGroupMemoryContextBundle)(bundle);
        bundle.context_budget = (0, context_budget_1.buildContextBudget)({ context: rendered, maxChars: 12_000, maxTokens: 30_000 });
        bundle.rendered_text = (0, group_memory_shared_1.compactPreserveLines)(rendered, Number(options.maxRenderedChars || 6000));
        return bundle;
    }
    const allMessages = (0, storage_1.getGroupMessages)(groupId, groupSessionId).filter((message) => !String(message?.content || "").startsWith("📤"));
    const postTurnSummaryBackfill = (0, group_post_turn_summary_1.backfillGroupPostTurnSummaries)(groupId, groupSessionId, allMessages, { maxMessages: 500 });
    const postTurnSummaryLedger = postTurnSummaryBackfill.ledger || (0, group_post_turn_summary_1.readGroupPostTurnSummaries)(groupId, groupSessionId, { limit: 20 });
    const resumePreparation = (0, group_memory_context_part_01_1.prepareGroupMemoryResumeProjection)(groupId, groupSessionId, allMessages, (0, group_memory_storage_1.loadGroupMemory)(groupId, groupSessionId), {
        groupSessionId,
        recentLimit: options.recentLimit || options.recent_limit || 12,
        olderLimit: options.olderLimit || options.older_limit || 30,
        minKeepMessages: options.minKeepMessages || options.min_keep_messages,
        minKeepTokens: options.minKeepTokens || options.min_keep_tokens,
        maxKeepTokens: options.maxKeepTokens || options.max_keep_tokens,
        apiMicrocompactTargetInputTokens: options.apiMicrocompactTargetInputTokens || options.api_microcompact_target_input_tokens,
        apiMicrocompactMaxInputTokens: options.apiMicrocompactMaxInputTokens || options.api_microcompact_max_input_tokens
    });
    let memory = resumePreparation.memory;
    compactHead = resumePreparation.compactHeadRecovery?.head || (groupSessionId.startsWith("gcs_") ? (0, group_compact_head_1.readGroupCompactHead)(groupId, groupSessionId) : null);
    const typedMemoryRecallLedgerScope = (0, group_agent_memory_packet_1.buildChildTypedMemoryRecallLedgerScope)(project, sessionBinding, memory, options);
    const postTurnSummaryDeliveryCapsule = (0, group_post_turn_summary_1.buildGroupPostTurnSummaryDeliveryCapsule)({
        groupId,
        groupSessionId,
        taskId: sessionBinding.task_id,
        targetProject: project,
        taskAgentSessionId: sessionBinding.task_agent_session_id,
        nativeSessionId: sessionBinding.native_session_id,
        executionId: sessionBinding.execution_id,
        attemptSequence: sessionBinding.turn,
        invocationKind: options.invocationKind || options.invocation_kind || (Number(sessionBinding.turn || 0) > 1 ? "resume" : "spawn"),
        invocationEdgeId: options.invocationEdgeId || options.invocation_edge_id || "",
        parentInvocationEdgeId: options.parentInvocationEdgeId || options.parent_invocation_edge_id || "",
        rootInvocationEdgeId: options.rootInvocationEdgeId || options.root_invocation_edge_id || "",
        branchId: options.branchId || options.branch_id || "",
        parentBranchId: options.parentBranchId || options.parent_branch_id || "",
        branchKind: options.branchKind || options.branch_kind || "main",
        expectedLineageHeadChecksum: options.expectedLineageHeadChecksum || options.expected_lineage_head_checksum || "",
        compactEpoch: typedMemoryRecallLedgerScope.compactEpoch,
        generatedAt,
        ledger: postTurnSummaryLedger,
        limit: 6
    });
    const taskAgentInvocationLineage = options.invocationEdgeId || options.invocation_edge_id ? {
        schema: "ccm-task-agent-invocation-lineage-binding-v1",
        invocation_edge_id: String(options.invocationEdgeId || options.invocation_edge_id || ""),
        parent_invocation_edge_id: String(options.parentInvocationEdgeId || options.parent_invocation_edge_id || ""),
        root_invocation_edge_id: String(options.rootInvocationEdgeId || options.root_invocation_edge_id || ""),
        branch_id: String(options.branchId || options.branch_id || ""),
        parent_branch_id: String(options.parentBranchId || options.parent_branch_id || ""),
        branch_kind: String(options.branchKind || options.branch_kind || "main"),
        expected_lineage_head_checksum: String(options.expectedLineageHeadChecksum || options.expected_lineage_head_checksum || ""),
        capsule_checksum: String(postTurnSummaryDeliveryCapsule?.capsule_checksum || "")
    } : null;
    const selectedPostTurnSummaryIds = new Set((postTurnSummaryDeliveryCapsule?.selected_summaries || []).map((row) => String(row.summary_id || "")));
    const deliveredPostTurnSummaries = (Array.isArray(postTurnSummaryLedger?.latest) ? postTurnSummaryLedger.latest : [])
        .filter((row) => !postTurnSummaryDeliveryCapsule || selectedPostTurnSummaryIds.has(String(row.summary_id || "")))
        .slice(postTurnSummaryDeliveryCapsule ? -6 : -8);
    const resumeProjection = resumePreparation.projection || {};
    const rawProjectedMessages = resumeProjection.useProjection === true
        ? (resumeProjection.projectedMessages || [])
        : allMessages;
    const timeBasedMicrocompactConfig = (0, group_memory_shared_1.loadGroupMemoryCompactionConfig)(options.compactionConfig || options.compaction_config || {});
    const timeBasedToolResultProjection = (0, group_memory_compaction_1.buildGroupTimeBasedToolResultProjection)(rawProjectedMessages, {
        groupId,
        groupSessionId,
        querySource: "group_main_thread:child_memory_projection",
        enabled: options.timeBasedMicrocompactEnabled ?? options.time_based_microcompact_enabled ?? timeBasedMicrocompactConfig.timeBasedMicrocompactEnabled,
        gapThresholdMinutes: options.timeBasedMicrocompactGapMinutes || options.time_based_microcompact_gap_minutes || timeBasedMicrocompactConfig.timeBasedMicrocompactGapMinutes,
        keepRecent: options.timeBasedMicrocompactKeepRecent || options.time_based_microcompact_keep_recent || timeBasedMicrocompactConfig.timeBasedMicrocompactKeepRecent,
        now: options.now
    });
    const childCompactEpoch = (0, group_memory_compaction_1.buildGroupCompactEpoch)(String(memory.compactBoundary?.boundaryId
        || memory.compactBoundary?.boundary_id
        || memory.compaction?.boundaryId
        || memory.compaction?.boundary_id
        || ""));
    const timeBasedThinkingProjection = (0, group_memory_compaction_1.buildGroupTimeBasedThinkingProjection)(timeBasedToolResultProjection.messages, {
        groupId,
        groupSessionId,
        compactEpoch: childCompactEpoch,
        querySource: "group_main_thread:child_memory_projection",
        enabled: options.timeBasedThinkingClearEnabled ?? options.time_based_thinking_clear_enabled ?? timeBasedMicrocompactConfig.timeBasedThinkingClearEnabled,
        gapThresholdMinutes: options.timeBasedMicrocompactGapMinutes || options.time_based_microcompact_gap_minutes || timeBasedMicrocompactConfig.timeBasedMicrocompactGapMinutes,
        priorReceipt: memory.compaction?.timeBasedThinkingProjection || memory.messageCompression?.timeBasedThinkingProjection || null,
        isRedactThinkingActive: options.isRedactThinkingActive === true || options.is_redact_thinking_active === true,
        now: options.now
    });
    const projectedMessages = timeBasedThinkingProjection.messages;
    if (timeBasedToolResultProjection.applied) {
        memory = (0, group_memory_storage_1.saveGroupMemory)(groupId, {
            ...memory,
            compaction: {
                ...(memory.compaction || {}),
                timeBasedToolResultProjection: timeBasedToolResultProjection.receipt
            },
            messageCompression: {
                ...(memory.messageCompression || {}),
                timeBasedToolResultProjection: timeBasedToolResultProjection.receipt
            }
        }, groupSessionId);
    }
    if (timeBasedThinkingProjection.shouldPersist) {
        memory = (0, group_memory_storage_1.saveGroupMemory)(groupId, {
            ...memory,
            compaction: {
                ...(memory.compaction || {}),
                timeBasedThinkingProjection: timeBasedThinkingProjection.receipt
            },
            messageCompression: {
                ...(memory.messageCompression || {}),
                timeBasedThinkingProjection: timeBasedThinkingProjection.receipt
            }
        }, groupSessionId);
    }
    const agentMemory = { ...(0, group_memory_shared_1.createEmptyAgentMemory)(project), ...((memory.agentMemories || {})[project] || {}) };
    const ownCompleted = (memory.completed || []).filter((item) => item.project === project).slice(-4);
    const otherCompleted = (memory.completed || []).filter((item) => item.project !== project).slice(-4);
    const ownBlocked = (memory.blocked || []).filter((item) => item.project === project).slice(-4);
    const globalBlocked = (memory.blocked || []).filter((item) => item.project !== project).slice(-3);
    const relatedLedger = (memory.workerLedger || []).filter((item) => item.project !== project).slice(-5);
    const boundaryIndex = resumeProjection.useProjection === true ? -1 : (0, group_memory_shared_1.getCompactBoundaryIndex)(memory, projectedMessages);
    const postCompactReinjectionGate = (0, group_memory_context_part_01_1.buildGroupMemoryPostCompactReinjectionGate)({
        groupId,
        targetProject: project,
        scope: `child:${project}`,
        generatedAt,
        postCompactReinject: memory.compaction?.postCompactReinject || memory.compactBoundary?.post_compact_restore?.reinjectionPlan || null,
        postCompactRecoveryAudit: memory.compaction?.postCompactRecoveryAudit
            || memory.compactBoundary?.post_compact_restore?.recoveryAudit
            || memory.messageCompression?.postCompactRecoveryAudit
            || null,
        summaryChecksum: memory.compaction?.summaryChecksum || memory.compactBoundary?.summaryChecksum || ""
    });
    const postCompactCandidateUsage = (0, group_compact_file_references_1.buildGroupPostCompactCandidateUsageSummary)(groupId, {
        groupSessionId,
        targetProject: project,
        candidates: postCompactReinjectionGate?.candidates || []
    });
    const typedMemoryPressureRecallOptions = {
        groupMemory: memory,
        workerContextPacketContextUsage: options.workerContextPacketContextUsage
            || options.worker_context_packet_context_usage
            || options.contextUsage
            || options.context_usage
            || null,
        workerContextPressure: options.workerContextPressure
            || options.worker_context_pressure
            || options.contextPressure
            || options.context_pressure
            || memory.compaction?.contextPressureWarning
            || memory.compaction?.context_pressure_warning
            || memory.compaction?.compactWarning
            || memory.compaction?.compact_warning
            || memory.messageCompression?.contextPressureWarning
            || memory.messageCompression?.context_pressure_warning
            || null,
        compactStrategyPressure: options.compactStrategyPressure
            || options.compact_strategy_pressure
            || memory.compaction?.compactStrategyDecision
            || memory.compaction?.compact_strategy_decision
            || memory.compactBoundary?.compactStrategyDecision
            || memory.compactBoundary?.compact_strategy_decision
            || memory.messageCompression?.compactStrategyDecision
            || memory.messageCompression?.compact_strategy_decision
            || null,
        ptlEmergency: options.ptlEmergency
            || options.ptl_emergency
            || memory.compaction?.ptlEmergency
            || memory.compaction?.ptl_emergency
            || memory.compactBoundary?.ptlEmergency
            || memory.compactBoundary?.ptl_emergency
            || memory.compactBoundary?.post_compact_restore?.ptlEmergency
            || memory.compactBoundary?.post_compact_restore?.ptl_emergency
            || null,
        contextCompactionRetry: options.contextCompactionRetry || options.context_compaction_retry || null,
        crossGroupPressureRecallUsageGroupIds: options.crossGroupPressureRecallUsageGroupIds
            || options.cross_group_pressure_recall_usage_group_ids
            || options.crossGroupIds
            || options.cross_group_ids,
        maxCrossGroupPressureRecallUsageGroups: options.maxCrossGroupPressureRecallUsageGroups
            || options.max_cross_group_pressure_recall_usage_groups,
        disableCrossGroupPressureRecallUsage: options.disableCrossGroupPressureRecallUsage
            || options.disable_cross_group_pressure_recall_usage,
        workerContextPressureRecallUsageRepairHints: options.workerContextPressureRecallUsageRepairHints
            || options.worker_context_pressure_recall_usage_repair_hints,
        disablePressureRecallUsageRepairHints: options.disablePressureRecallUsageRepairHints
            || options.disable_pressure_recall_usage_repair_hints
    };
    const projectMemoryRoot = (0, group_memory_shared_1.resolveGroupProjectMemoryRoot)(project, options);
    const typedLogDistillation = (0, group_memory_index_1.distillGroupMessagesToTypedMemoryUntilCaughtUp)(typedMemoryScopeId, allMessages, memory, {
        reason: "context_bundle",
        maxMessages: options.distillMaxMessages || options.distill_max_messages,
        maxCatchUpBatches: options.distillMaxCatchUpBatches || options.distill_max_catch_up_batches,
        postCompactCandidateUsage,
        projectRoot: projectMemoryRoot
    });
    const globalClaudeMemoryImport = options.includeGlobalClaudeMemory === false || options.include_global_claude_memory === false
        ? null
        : (0, group_memory_index_1.importGlobalClaudeMemoryToGroupTypedMemory)(typedMemoryScopeId, {
            settingSources: options.settingSources ?? options.setting_sources,
            includeUser: options.includeUserClaudeMemory !== false && options.include_user_claude_memory !== false,
            includeManaged: options.includeManagedClaudeMemory !== false && options.include_managed_claude_memory !== false,
            userRoot: options.claudeUserRoot || options.claude_user_root,
            managedRoot: options.claudeManagedRoot || options.claude_managed_root,
            maxRuleFiles: options.globalClaudeMemoryMaxRuleFiles || options.global_claude_memory_max_rule_files,
            maxImportFiles: options.globalClaudeMemoryMaxImportFiles || options.global_claude_memory_max_import_files
        });
    const projectMemoryImport = projectMemoryRoot
        ? (0, group_memory_index_1.importProjectMemoryFilesToGroupTypedMemory)(typedMemoryScopeId, projectMemoryRoot, {
            project,
            settingSources: options.settingSources ?? options.setting_sources,
            includeProject: options.includeProjectMemory !== false && options.include_project_memory !== false,
            includeLocal: options.includeLocalProjectMemory !== false && options.include_local_project_memory !== false,
            maxParentDepth: options.projectMemoryMaxParentDepth || options.project_memory_max_parent_depth || 0,
            maxRuleFiles: options.projectMemoryMaxRuleFiles || options.project_memory_max_rule_files,
            maxImportFiles: options.projectMemoryMaxImportFiles || options.project_memory_max_import_files
        })
        : null;
    const typedMemorySync = (0, group_memory_index_1.syncGroupTypedMemoryFromGroupMemory)(typedMemoryScopeId, memory);
    const providerRankingCompactRepairReceiptRecall = (0, group_memory_context_part_01_1.buildProviderRankingProvenanceCompactRepairReceiptWorkerContextRecall)(typedMemoryScopeId, task, memory, options);
    const postCompactReinjectionRepairReceiptRecall = (0, group_memory_context_part_02_1.buildPostCompactReinjectionRepairReceiptWorkerContextRecall)(typedMemoryScopeId, task, memory, options);
    const typedMemoryRecallQuery = [
        task,
        memory.goal,
        project,
        providerRankingCompactRepairReceiptRecall.active ? providerRankingCompactRepairReceiptRecall.queryAppend : "",
        postCompactReinjectionRepairReceiptRecall.active ? postCompactReinjectionRepairReceiptRecall.queryAppend : "",
    ].filter(Boolean).join("\n");
    const typedMemoryTargetPaths = (0, group_memory_index_1.deriveGroupTypedMemoryTargetPaths)(typedMemoryRecallQuery, [
        ...(Array.isArray(options.targetPaths || options.target_paths) ? (options.targetPaths || options.target_paths) : []),
        ...(agentMemory.frequentFiles || []),
        ...(providerRankingCompactRepairReceiptRecall.active ? providerRankingCompactRepairReceiptRecall.targetPaths || [] : []),
        ...(postCompactReinjectionRepairReceiptRecall.active ? postCompactReinjectionRepairReceiptRecall.targetPaths || [] : []),
    ]);
    const typedMemoryLoadPlan = (0, group_memory_index_1.buildGroupTypedMemoryLoadPlan)(typedMemoryScopeId, {
        maxEntries: options.maxTypedMemoryLoadEntries || options.max_typed_memory_load_entries,
        query: typedMemoryRecallQuery,
        targetPaths: typedMemoryTargetPaths
    });
    const recentTools = [
        ...(Array.isArray(options.recentTools || options.recent_tools) ? (options.recentTools || options.recent_tools) : []),
        ...(agentMemory.recentReceipts || []).flatMap((item) => [
            ...(Array.isArray(item.memoryUsed) ? item.memoryUsed : []),
            ...(Array.isArray(item.verification) ? item.verification : []),
        ]),
    ].map((item) => String(item || "").replace(/^Skill\s*[:：]\s*/i, "")).filter(Boolean).slice(-12);
    const ledgerAlreadySurfaced = (0, group_memory_index_1.getAlreadySurfacedGroupTypedMemory)(typedMemoryScopeId, typedMemoryRecallLedgerScope.scope);
    const explicitAlreadySurfaced = options.alreadySurfacedMemory || options.already_surfaced_memory || [];
    const repeatableRecallRelPaths = new Set([
        ...(providerRankingCompactRepairReceiptRecall.repeatableRelPaths || []),
        ...(postCompactReinjectionRepairReceiptRecall.repeatableRelPaths || []),
    ].map((item) => String(item || "").trim().toLowerCase()).filter(Boolean));
    const alreadySurfacedForRecall = [...ledgerAlreadySurfaced, ...explicitAlreadySurfaced]
        .filter((item) => !repeatableRecallRelPaths.has(String(item || "").trim().toLowerCase()));
    const preliminaryPressureProvenanceDispatchFeedbackPolicy = (0, group_memory_index_1.buildPressureProvenancePreDispatchComplianceDispatchPolicy)(groupId, {
        targetProject: project,
        agentType: options.agentType || options.agent_type || "unknown",
        generatedAt,
        frequentThreshold: options.pressureProvenanceFeedbackFrequentThreshold || options.pressure_provenance_feedback_frequent_threshold,
        recoveryCreditPerCompliant: options.pressureProvenanceFeedbackRecoveryCreditPerCompliant || options.pressure_provenance_feedback_recovery_credit_per_compliant,
        disablePressureProvenanceFeedbackRecovery: options.disablePressureProvenanceFeedbackRecovery || options.disable_pressure_provenance_feedback_recovery,
        disabled: options.disablePressureProvenanceFeedbackDispatchPolicy || options.disable_pressure_provenance_feedback_dispatch_policy
    });
    const typedMemoryRecall = (0, group_memory_index_1.buildGroupTypedMemoryRecall)(typedMemoryScopeId, typedMemoryRecallQuery, {
        alreadySurfaced: alreadySurfacedForRecall,
        requiredRelPaths: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
            ...(providerRankingCompactRepairReceiptRecall.active ? providerRankingCompactRepairReceiptRecall.repeatableRelPaths || [] : []),
            ...(postCompactReinjectionRepairReceiptRecall.active ? postCompactReinjectionRepairReceiptRecall.repeatableRelPaths || [] : []),
        ], 16),
        recentTools,
        targetPaths: typedMemoryTargetPaths,
        targetProject: project,
        postCompactCandidateUsage,
        pressureProvenanceDispatchFeedbackPolicy: preliminaryPressureProvenanceDispatchFeedbackPolicy,
        typedMemoryManifestSelection: options.typedMemoryManifestSelection || options.typed_memory_manifest_selection || null,
        ...typedMemoryPressureRecallOptions,
        max: Number(options.maxTypedMemory || options.max_typed_memory || 5)
    });
    const globalAgentMemoryRecall = (0, group_global_memory_arbitration_1.buildChildGlobalAgentMemoryContext)([task, memory.goal, memory.currentPhase, project].filter(Boolean).join("\n"), {
        ...options,
        groupId,
        targetProject: project,
        generatedAt,
        groupMemory: memory,
        groupMessages: allMessages,
        typedMemoryRecall
    });
    const globalMemoryArbitrationLedger = (0, group_global_memory_arbitration_1.recordGroupGlobalMemoryArbitrationLedger)(groupId, {
        generatedAt,
        targetProject: project,
        task,
        globalAgentMemoryRecall
    });
    const globalMemoryArbitrationDistillation = (0, group_global_memory_arbitration_1.distillGroupGlobalMemoryArbitrationToTypedMemory)(typedMemoryScopeId, {
        generatedAt,
        threshold: options.globalMemoryArbitrationDistillationThreshold || options.global_memory_arbitration_distillation_threshold || 2
    });
    const effectiveGlobalMemoryArbitrationLedger = globalMemoryArbitrationDistillation?.summary?.schema
        ? globalMemoryArbitrationDistillation.summary
        : globalMemoryArbitrationLedger;
    const effectiveTypedMemorySync = globalMemoryArbitrationDistillation?.index?.schema
        ? { ...typedMemorySync, index: globalMemoryArbitrationDistillation.index }
        : typedMemorySync;
    const effectiveTypedMemoryLoadPlan = globalMemoryArbitrationDistillation?.index?.schema
        ? (0, group_memory_index_1.buildGroupTypedMemoryLoadPlan)(typedMemoryScopeId, {
            maxEntries: options.maxTypedMemoryLoadEntries || options.max_typed_memory_load_entries,
            query: typedMemoryRecallQuery,
            targetPaths: typedMemoryTargetPaths
        })
        : typedMemoryLoadPlan;
    const effectiveTypedMemoryRecall = globalMemoryArbitrationDistillation?.index?.schema
        ? (0, group_memory_index_1.buildGroupTypedMemoryRecall)(typedMemoryScopeId, typedMemoryRecallQuery, {
            alreadySurfaced: alreadySurfacedForRecall,
            requiredRelPaths: (0, group_memory_shared_1.uniqueProviderRankingCompactRepairRecallStrings)([
                ...(providerRankingCompactRepairReceiptRecall.active ? providerRankingCompactRepairReceiptRecall.repeatableRelPaths || [] : []),
                ...(postCompactReinjectionRepairReceiptRecall.active ? postCompactReinjectionRepairReceiptRecall.repeatableRelPaths || [] : []),
            ], 16),
            recentTools,
            targetPaths: typedMemoryTargetPaths,
            targetProject: project,
            postCompactCandidateUsage,
            pressureProvenanceDispatchFeedbackPolicy: preliminaryPressureProvenanceDispatchFeedbackPolicy,
            typedMemoryManifestSelection: options.typedMemoryManifestSelection || options.typed_memory_manifest_selection || null,
            ...typedMemoryPressureRecallOptions,
            max: Number(options.maxTypedMemory || options.max_typed_memory || 5)
        })
        : typedMemoryRecall;
    const typedMemoryDeliveryConfig = (0, group_memory_shared_1.loadGroupMemoryCompactionConfig)();
    const typedMemoryRecallScopeStatsBefore = (0, group_memory_index_1.getGroupTypedMemoryRecallScopeStats)(typedMemoryScopeId, typedMemoryRecallLedgerScope.scope);
    const typedMemoryDeliveryCapsule = (0, group_agent_memory_packet_1.buildChildTypedMemoryDeliveryCapsule)({
        groupId,
        groupSessionId,
        targetProject: project,
        taskId: sessionBinding.task_id || options.taskId || options.task_id || "",
        taskAgentSessionId: sessionBinding.task_agent_session_id || options.taskAgentSessionId || options.task_agent_session_id || "",
        ledgerScope: typedMemoryRecallLedgerScope,
        recall: effectiveTypedMemoryRecall
    }, {
        maxDocuments: options.maxTypedMemoryDeliveryDocuments
            ?? options.max_typed_memory_delivery_documents
            ?? typedMemoryDeliveryConfig.typedMemoryDeliveryMaxDocuments,
        maxBytesPerDocument: options.maxTypedMemoryDeliveryBytesPerDocument
            ?? options.max_typed_memory_delivery_bytes_per_document
            ?? typedMemoryDeliveryConfig.typedMemoryDeliveryMaxBytesPerDocument,
        maxLinesPerDocument: options.maxTypedMemoryDeliveryLinesPerDocument
            ?? options.max_typed_memory_delivery_lines_per_document
            ?? typedMemoryDeliveryConfig.typedMemoryDeliveryMaxLinesPerDocument,
        maxSessionBytes: options.maxTypedMemoryDeliverySessionBytes
            ?? options.max_typed_memory_delivery_session_bytes
            ?? typedMemoryDeliveryConfig.typedMemoryDeliveryMaxSessionBytes,
        maxTokens: options.maxTypedMemoryDeliveryTokens
            ?? options.max_typed_memory_delivery_tokens
            ?? typedMemoryDeliveryConfig.typedMemoryDeliveryMaxTokens,
        modelContextWindow: options.modelContextWindow
            || options.model_context_window
            || options.workerModelContextWindow
            || options.worker_model_context_window
            || options.task?.modelContextWindow
            || options.task?.model_context_window
            || typedMemoryDeliveryConfig.modelContextWindow
            || 200_000,
        sessionDeliveredBytes: typedMemoryRecallScopeStatsBefore.deliveredBytes
    });
    const typedMemoryDeliveryLease = (0, runtime_kernel_1.buildWorkerTypedMemoryDeliveryLease)(typedMemoryDeliveryCapsule, {
        query: typedMemoryRecallQuery,
        attemptSequence: options.taskAgentSessionTurn || options.task_agent_session_turn || 0,
        generatedAt
    });
    const deliveredTypedMemoryRelPaths = typedMemoryDeliveryCapsule.delivered_rel_paths || [];
    const deliveredTypedMemoryRelPathSet = new Set(deliveredTypedMemoryRelPaths.map((item) => String(item || "").toLowerCase()));
    const deliveredEffectiveTypedMemoryRecall = {
        ...effectiveTypedMemoryRecall,
        recalled: (effectiveTypedMemoryRecall.recalled || []).filter((doc) => deliveredTypedMemoryRelPathSet.has(String(doc.relPath || doc.rel_path || "").toLowerCase())),
        surfaced: deliveredTypedMemoryRelPaths,
        deliveryBudget: typedMemoryDeliveryCapsule.budget,
        budgetExhausted: typedMemoryDeliveryCapsule.budget_exhausted === true
    };
    const effectiveProviderRankingCompactRepairReceiptRecall = {
        ...providerRankingCompactRepairReceiptRecall,
        recalledThisTurn: providerRankingCompactRepairReceiptRecall.active === true
            && (deliveredEffectiveTypedMemoryRecall.surfaced || []).some((item) => String(item || "").toLowerCase() === group_memory_shared_1.PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH),
        surfacedRelPaths: (deliveredEffectiveTypedMemoryRecall.surfaced || []).filter((item) => [
            group_memory_shared_1.PROVIDER_RANKING_PROVENANCE_COMPACT_REPAIR_RECEIPT_MEMORY_REL_PATH,
            group_memory_shared_1.PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH,
        ].includes(String(item || "").toLowerCase())),
        memoryUsageReceiptDisciplineRecalledThisTurn: providerRankingCompactRepairReceiptRecall.active === true
            && (deliveredEffectiveTypedMemoryRecall.surfaced || []).some((item) => String(item || "").toLowerCase() === group_memory_shared_1.PROVIDER_RANKING_MEMORY_USAGE_RECEIPT_DISCIPLINE_REL_PATH)
    };
    const effectivePostCompactReinjectionRepairReceiptRecall = {
        ...postCompactReinjectionRepairReceiptRecall,
        recalledThisTurn: postCompactReinjectionRepairReceiptRecall.active === true
            && (postCompactReinjectionRepairReceiptRecall.docRelPaths || []).some((relPath) => (deliveredEffectiveTypedMemoryRecall.surfaced || []).some((item) => String(item || "").toLowerCase() === String(relPath || "").toLowerCase())),
        surfacedRelPaths: (deliveredEffectiveTypedMemoryRecall.surfaced || []).filter((item) => (postCompactReinjectionRepairReceiptRecall.docRelPaths || []).some((relPath) => String(item || "").toLowerCase() === String(relPath || "").toLowerCase()))
    };
    const pressureMemoryProvenanceReceiptDiscipline = (0, group_memory_context_part_01_1.buildPressureMemoryProvenanceReceiptDiscipline)({ recall: deliveredEffectiveTypedMemoryRecall }, { targetProject: project, generatedAt });
    const pressureProvenanceDispatchFeedbackPolicy = (0, group_memory_index_1.buildPressureProvenancePreDispatchComplianceDispatchPolicy)(groupId, {
        targetProject: project,
        agentType: options.agentType || options.agent_type || "unknown",
        generatedAt,
        pressureMemoryProvenanceReceiptDiscipline,
        frequentThreshold: options.pressureProvenanceFeedbackFrequentThreshold || options.pressure_provenance_feedback_frequent_threshold,
        recoveryCreditPerCompliant: options.pressureProvenanceFeedbackRecoveryCreditPerCompliant || options.pressure_provenance_feedback_recovery_credit_per_compliant,
        disablePressureProvenanceFeedbackRecovery: options.disablePressureProvenanceFeedbackRecovery || options.disable_pressure_provenance_feedback_recovery,
        disabled: options.disablePressureProvenanceFeedbackDispatchPolicy || options.disable_pressure_provenance_feedback_dispatch_policy
    });
    const typedMemoryLedger = (0, group_memory_index_1.readGroupTypedMemoryRecallLedger)(typedMemoryScopeId);
    const typedMemoryRecallScopeStatsAfter = typedMemoryRecallScopeStatsBefore;
    const sourceManifest = (0, group_compact_file_references_1.buildGroupMemorySourceManifest)(groupId, {
        generatedAt,
        groupSessionId,
        typedMemorySync: effectiveTypedMemorySync,
        typedLogDistillation,
        typedMemoryLedger,
        globalAgentMemoryRecall,
        globalMemoryArbitrationLedger: effectiveGlobalMemoryArbitrationLedger
    });
    const memoryReloadReason = String(options.memoryReloadReason || options.memory_reload_reason || "")
        || (Number(globalClaudeMemoryImport?.importedCount || 0) > 0 && Number(projectMemoryImport?.importedCount || 0) > 0 ? "memory_file_import"
            : Number(globalClaudeMemoryImport?.importedCount || 0) > 0 ? "global_claude_memory_import"
                : Number(projectMemoryImport?.importedCount || 0) > 0 ? "project_memory_import"
                    : Number(globalAgentMemoryRecall?.itemCount || 0) > 0 ? "global_agent_memory_recall"
                        : memory.compaction?.postCompactRecoveryAudit?.schema ? "post_compact_restore"
                            : "context_bundle");
    const memoryReloadAudit = (0, group_compact_file_references_1.recordGroupMemoryReloadAudit)(groupId, {
        generatedAt,
        groupSessionId,
        scope: `child:${project}`,
        contextKind: "child_agent",
        reason: memoryReloadReason,
        sourceManifest,
        loadPlan: effectiveTypedMemoryLoadPlan,
        globalClaudeMemoryImport,
        globalAgentMemoryRecall,
        projectMemoryImport,
        postCompactRecoveryAudit: memory.compaction?.postCompactRecoveryAudit
            || memory.compactBoundary?.post_compact_restore?.recoveryAudit
            || memory.messageCompression?.postCompactRecoveryAudit
            || null
    });
    const dispatchFreshnessGate = (0, group_compact_file_references_1.buildGroupMemoryDispatchFreshnessGate)({
        groupId,
        targetProject: project,
        scope: `child:${project}`,
        generatedAt,
        sourceManifest,
        reloadAudit: memoryReloadAudit
    });
    const postCompactDispatchMarker = (0, group_compact_file_references_1.recordGroupPostCompactFirstDispatchMarker)(groupId, {
        groupSessionId,
        targetProject: project,
        scope: `child:${project}`,
        generatedAt,
        compactBoundary: memory.compactBoundary || null,
        compaction: memory.compaction || null,
        postCompactReinjectionGate,
        disablePostCompactDispatchLedger: options.disablePostCompactDispatchLedger || options.disable_post_compact_dispatch_ledger
    });
    const relevantHistoricalEvidence = (0, group_memory_compaction_1.buildRelevantHistoricalGroupContext)(projectedMessages, boundaryIndex, [task, memory.goal, project].filter(Boolean).join("\n"), { maxMessages: 6, maxChars: Number(options.maxEvidenceChars || 7000) });
    const summaryText = memory.messageDigest || (0, group_memory_compaction_1.renderConversationSummary)(memory.conversationSummary || null);
    const formalSummarySource = String(memory.compaction?.summarySource || "");
    const formalSummaryAvailable = ["model", "session-memory"].includes(formalSummarySource);
    const continuityFloorIndex = Math.max(0, boundaryIndex + 1);
    const continuityWindow = (0, session_memory_window_1.calculateSessionMemoryKeepWindow)(projectedMessages, { floorIndex: continuityFloorIndex });
    const continuityRecentMessages = projectedMessages.slice(continuityWindow.startIndex).map((message, index) => ({
        id: String(message?.id || message?.uuid || `recent-${continuityWindow.startIndex + index}`),
        role: String(message?.role || message?.type || "user"),
        content: message?.content ?? message?.message?.content ?? "",
        timestamp: String(message?.timestamp || message?.created_at || message?.createdAt || ""),
    }));
    const formalSessionContinuity = formalSummaryAvailable ? {
        schema: "ccm-parent-session-continuity-v2",
        scope: "group",
        group_id: groupId,
        group_session_id: groupSessionId,
        summary_source: formalSummarySource,
        summary_checksum: String(memory.compaction?.summaryChecksum || memory.compactBoundary?.summaryChecksum || ""),
        summary: memory.conversationSummary || null,
        session_memory: (0, group_runtime_memory_admission_1.isCanonicalGroupSessionMemory)(memory.sessionMemory) ? memory.sessionMemory : null,
        recent_messages: continuityRecentMessages,
        recent_window: continuityWindow,
        boundary_generation: Number(memory.compactBoundary?.generation || memory.compaction?.boundaryGeneration || 0),
    } : null;
    const persistedSessionMemorySnapshot = memory.sessionMemory?.schema ? memory.sessionMemory : (0, group_session_memory_snapshot_1.readGroupSessionMemorySnapshotSummary)(typedMemoryScopeId);
    const persistedSupersessionGraph = persistedSessionMemorySnapshot?.factSupersessionGraph
        || persistedSessionMemorySnapshot?.modelExtractionReceipt?.factSupersessionGraph
        || persistedSessionMemorySnapshot?.modelMergeQuality?.factSupersessionGraph
        || null;
    const persistedSupersessionGraphValid = (0, group_memory_context_part_01_1.verifyGroupSessionMemoryFactSupersessionGraphForContext)(persistedSupersessionGraph);
    const { factSupersessionGraph: _auditGraph, modelExtractionReceipt: persistedModelReceipt, modelMergeQuality: persistedMergeQuality, modelExtractionReplayEvidence: persistedReplayEvidence, ...sessionMemoryCore } = persistedSessionMemorySnapshot || {};
    const { factSupersessionGraph: _receiptGraph, mergeQuality: receiptMergeQuality, ...modelReceiptCore } = persistedModelReceipt || {};
    const { factSupersessionGraph: _receiptMergeGraph, ...receiptMergeCore } = receiptMergeQuality || {};
    const { factSupersessionGraph: _mergeGraph, ...mergeQualityCore } = persistedMergeQuality || {};
    const replayEvidenceValid = (0, group_agent_memory_packet_1.verifyGroupSessionMemoryModelExtractionDeliveryEvidenceForContext)(persistedReplayEvidence);
    const projectedModelReceipt = persistedModelReceipt ? {
        schema: String(modelReceiptCore.schema || ""),
        version: Number(modelReceiptCore.version || 0),
        status: String(modelReceiptCore.status || ""),
        executionId: String(modelReceiptCore.executionId || ""),
        groupId: String(modelReceiptCore.groupId || ""),
        groupSessionId: String(modelReceiptCore.groupSessionId || ""),
        scopeId: String(modelReceiptCore.scopeId || ""),
        completedAt: String(modelReceiptCore.completedAt || ""),
        model: String(modelReceiptCore.model || ""),
        markdownChecksum: String(modelReceiptCore.markdownChecksum || ""),
        sectionEvidenceChecksum: String(modelReceiptCore.sectionEvidenceChecksum || ""),
        factSupersessionGraphChecksum: String(modelReceiptCore.factSupersessionGraphChecksum || ""),
        fencingToken: Number(modelReceiptCore.fencingToken || 0),
        checksum: String(modelReceiptCore.checksum || ""),
        requestAudit: modelReceiptCore.requestAudit ? {
            sourceTranscriptChecksum: String(modelReceiptCore.requestAudit.sourceTranscriptChecksum || ""),
            sourceFirstMessageId: String(modelReceiptCore.requestAudit.sourceFirstMessageId || ""),
            sourceLastMessageId: String(modelReceiptCore.requestAudit.sourceLastMessageId || ""),
            sourceMessageCount: Number(modelReceiptCore.requestAudit.sourceMessageCount || 0),
            sourceMessageIds: Array.isArray(modelReceiptCore.requestAudit.sourceMessageIds) ? modelReceiptCore.requestAudit.sourceMessageIds.slice(0, 240) : []
        } : null,
        mergeQuality: receiptMergeQuality ? {
            pass: receiptMergeCore.pass === true,
            outputMarkdownChecksum: String(receiptMergeCore.outputMarkdownChecksum || ""),
            factSupersessionGraphChecksum: String(receiptMergeCore.factSupersessionGraphChecksum || ""),
            activeFactCount: Number(receiptMergeCore.activeFactCount || 0),
            supersededFactCount: Number(receiptMergeCore.supersededFactCount || 0),
            unjustifiedLostFactCount: Number(receiptMergeCore.unjustifiedLostFactCount || 0)
        } : null
    } : null;
    const sessionMemorySnapshot = (0, group_runtime_memory_admission_1.isCanonicalGroupSessionMemory)(persistedSessionMemorySnapshot) ? {
        ...sessionMemoryCore,
        modelExtractionReceipt: projectedModelReceipt,
        modelExtractionReplayEvidence: persistedReplayEvidence?.schema ? {
            schema: String(persistedReplayEvidence.schema || ""),
            version: Number(persistedReplayEvidence.version || 0),
            scopeId: String(persistedReplayEvidence.scopeId || ""),
            executionId: String(persistedReplayEvidence.executionId || ""),
            receiptChecksum: String(persistedReplayEvidence.receiptChecksum || ""),
            historyHeadChecksum: String(persistedReplayEvidence.historyHeadChecksum || ""),
            historyIntegrityValid: persistedReplayEvidence.historyIntegrityValid === true,
            replayExecutionId: String(persistedReplayEvidence.replayExecutionId || ""),
            replayStatus: String(persistedReplayEvidence.replayStatus || ""),
            replayPass: persistedReplayEvidence.replayPass === true,
            factSupersessionGraphChecksum: String(persistedReplayEvidence.factSupersessionGraphChecksum || ""),
            generatedAt: String(persistedReplayEvidence.generatedAt || ""),
            checksum: String(persistedReplayEvidence.checksum || ""),
            checksumValid: replayEvidenceValid
        } : null,
        modelMergeQuality: persistedMergeQuality ? mergeQualityCore : null,
        factSupersession: persistedSupersessionGraph?.schema ? {
            schema: "ccm-group-session-memory-active-fact-projection-v1",
            version: 1,
            graphChecksum: String(persistedSupersessionGraph.checksum || ""),
            graphValid: persistedSupersessionGraphValid,
            activeFactCount: Number(persistedSupersessionGraph.activeFactCount || 0),
            supersededFactCount: Number(persistedSupersessionGraph.supersededFactCount || 0),
            unjustifiedLostFactCount: Number(persistedSupersessionGraph.unjustifiedLostFactCount || 0),
            activeFacts: (persistedSupersessionGraphValid && Array.isArray(persistedSupersessionGraph.activeFacts) ? persistedSupersessionGraph.activeFacts : []).map((fact) => ({
                factId: String(fact.factId || ""),
                factChecksum: String(fact.factChecksum || ""),
                type: String(fact.type || ""),
                text: String(fact.text || ""),
                source: String(fact.source || ""),
                sourceMessageId: String(fact.sourceMessageId || "")
            })).slice(0, 120)
        } : null
    } : persistedSessionMemorySnapshot;
    const toolContinuitySnapshot = memory.toolContinuity?.schema ? memory.toolContinuity : (0, group_tool_continuity_1.readGroupToolContinuitySnapshotSummary)(typedMemoryScopeId);
    const replayRepairLedger = (0, group_memory_storage_1.readGroupReplayRepairLedgerSummary)(groupId, groupSessionId);
    const replayRepairWorkItems = (0, group_memory_storage_1.readGroupReplayRepairWorkItemsSummary)(groupId, groupSessionId);
    const replayRepairDispatchCandidates = (0, group_memory_storage_1.readGroupReplayRepairDispatchCandidatesSummary)(groupId, 12, groupSessionId);
    const boundaryHistory = (0, group_memory_shared_1.buildGroupCompactBoundaryHistorySummary)(memory);
    const childAgentTypes = (0, group_memory_context_part_01_1.buildChildAgentTypeSummary)(memory);
    const storedApiMicroCompactEditPlan = memory.compaction?.apiMicroCompactEditPlan
        || memory.compactBoundary?.apiMicroCompactEditPlan
        || memory.compactBoundary?.post_compact_restore?.apiMicroCompactEditPlan
        || memory.messageCompression?.apiMicroCompactEditPlan
        || null;
    const runtimeCapabilities = options.runtimeCapabilities
        || options.runtime_capabilities
        || options.task?.runtimeCapabilities
        || options.task?.runtime_capabilities
        || options.task?.workflow_meta?.runtime_capabilities
        || {};
    const providerNativeCompactSessionCapacityReconciliation = resumePreparation.providerNativeCompactSessionCapacityReconciliation || null;
    const providerNativeCompactSessionCapacityReady = !providerNativeCompactSessionCapacityReconciliation
        || ["current", "recovered", "not_applicable"].includes(String(providerNativeCompactSessionCapacityReconciliation.status || ""));
    const providerNativeCompactSessionCapacity = providerNativeCompactSessionCapacityReady
        ? (0, provider_native_compact_session_capacity_1.consumeProviderNativeCompactSessionCapacity)({
            groupId,
            groupSessionId,
            taskAgentSessionId: sessionBinding?.task_agent_session_id || "",
            nativeSessionId: sessionBinding?.native_session_id || "",
            rawActiveTokens: Number(storedApiMicroCompactEditPlan?.activeTokens || storedApiMicroCompactEditPlan?.active_tokens || 0),
            consumedAt: generatedAt
        })
        : null;
    const providerNativeCompactSessionGenerationFence = providerNativeCompactSessionCapacityReady
        ? (0, provider_native_compact_session_capacity_1.getProviderNativeCompactSessionGenerationFence)({
            groupId,
            groupSessionId,
            taskAgentSessionId: sessionBinding?.task_agent_session_id || "",
            nativeSessionId: sessionBinding?.native_session_id || ""
        })
        : null;
    const apiMicrocompactNativeApplyPlan = (0, group_memory_compaction_1.buildGroupApiMicrocompactNativeApplyPlan)(storedApiMicroCompactEditPlan || {}, {
        groupId,
        groupSessionId,
        targetProject: project,
        agentType: options.agentType || options.agent_type || "unknown",
        transport: options.agentTransport || options.agent_transport || options.transport || runtimeCapabilities.transport,
        provider: options.agentProvider || options.agent_provider || options.provider || runtimeCapabilities.provider,
        supportsApiContextManagement: options.supportsApiContextManagement === true
            || options.supports_api_context_management === true
            || runtimeCapabilities.supportsApiContextManagement === true
            || runtimeCapabilities.supports_api_context_management === true,
        nativeApiRequestLayer: options.nativeApiRequestLayer === true
            || options.native_api_request_layer === true
            || runtimeCapabilities.nativeApiRequestLayer === true
            || runtimeCapabilities.native_api_request_layer === true,
        contextManagementBetaHeaderEnabled: options.contextManagementBetaHeaderEnabled === true
            || options.context_management_beta_header_enabled === true
            || runtimeCapabilities.contextManagementBetaHeaderEnabled === true
            || runtimeCapabilities.context_management_beta_header_enabled === true,
        betaHeaders: options.betaHeaders || options.beta_headers || runtimeCapabilities.betaHeaders || runtimeCapabilities.beta_headers,
        featureEnabled: providerNativeCompactSessionCapacityReady
            && options.apiMicrocompactNativeApplyEnabled !== false
            && options.api_microcompact_native_apply_enabled !== false,
        sessionBinding,
        executionId: options.executionId || options.execution_id || sessionBinding?.execution_id || "",
        runnerRequestId: options.runnerRequestId || options.runner_request_id || options.externalRunnerRequestId || options.external_runner_request_id || "",
        memoryContextSnapshotId: options.memoryContextSnapshotId || options.memory_context_snapshot_id || "",
        memoryContextSnapshotChecksum: options.memoryContextSnapshotChecksum || options.memory_context_snapshot_checksum || "",
        providerNativeCompactSessionCapacity,
        providerNativeCompactSessionGenerationFence,
        now: generatedAt
    });
    const apiMicrocompactNativeApplyProofLedger = (0, group_compact_file_references_1.buildGroupApiMicrocompactNativeApplyProofSummary)(groupId, {
        groupSessionId,
        targetProject: project,
        planChecksums: [storedApiMicroCompactEditPlan?.planChecksum || storedApiMicroCompactEditPlan?.plan_checksum || ""].filter(Boolean)
    });
    const storedPostCompactReinject = memory.compaction?.postCompactReinject
        || memory.compactBoundary?.post_compact_restore?.reinjectionPlan
        || null;
    const liveDynamicContextDelta = groupSessionId.startsWith("gcs_")
        ? (0, group_memory_compaction_1.buildGroupPostCompactDynamicContextDeltaProjection)((0, group_memory_context_part_01_1.buildGroupPostCompactDynamicContextCatalog)(groupId, memory, options), {
            groupId,
            groupSessionId,
            scanMode: "full",
            preCompactLoadedToolNames: memory.compaction?.postCompactReinject?.dynamicContextDeltaReceipt?.loaded_tool_state?.carried_names
                || memory.compactBoundary?.compactMetadata?.preCompactDiscoveredTools
                || memory.compaction?.preCompactDiscoveredTools
                || [],
            now: generatedAt
        })
        : null;
    const effectivePostCompactReinject = storedPostCompactReinject || liveDynamicContextDelta
        ? {
            ...(storedPostCompactReinject || {
                schema: "ccm-post-compact-reinjection-v1",
                version: 1,
                strategy: "restore_dynamic_runtime_context_for_new_child_session"
            }),
            dynamicContextDeltaAttachment: liveDynamicContextDelta?.attachment || null,
            dynamicContextDeltaReceipt: liveDynamicContextDelta?.receipt || null
        }
        : null;
    const modelVisibleRuntime = (0, group_runtime_memory_admission_1.modelVisibleGroupRuntimeState)(memory);
    const bundle = {
        schema: "ccm-group-memory-context-v1",
        version: 1,
        group_id: groupId,
        group_session_id: groupSessionId,
        target_project: project,
        task_query: (0, group_memory_shared_1.compactMemoryText)(task, 900),
        generated_at: generatedAt,
        session_binding: sessionBinding,
        compact_head: compactHead,
        pressure_memory_provenance_receipt_discipline: pressureMemoryProvenanceReceiptDiscipline.active ? pressureMemoryProvenanceReceiptDiscipline : null,
        pressure_provenance_dispatch_feedback_policy: pressureProvenanceDispatchFeedbackPolicy.active ? pressureProvenanceDispatchFeedbackPolicy : null,
        memory_policy: {
            priority: "platform_group_memory_over_third_party_cli_session",
            use: "must_consider",
            boundary: "current_group_session_summary_recent_window_raw_evidence",
            cross_session_memory_allowed: false,
            raw_recovery: "group-messages JSON keeps raw transcript; request message id if more source text is needed"
        },
        compaction: {
            version: memory.compaction?.version || group_memory_compaction_1.GROUP_MEMORY_COMPACTION_VERSION,
            strategy: memory.messageCompression?.strategy || "cc-session-memory-v3-sync",
            health: memory.compaction?.health || "",
            quality: memory.compaction?.quality || null,
            qualityScore: Number(memory.compaction?.quality?.score || 0),
            qualityStatus: memory.compaction?.quality?.status || "",
            driftDetected: memory.compaction?.quality?.drift?.detected === true || memory.compaction?.driftDetected === true,
            downgradedByQualityGate: memory.compaction?.downgradedByQualityGate === true,
            qualityDowngradeReason: memory.compaction?.qualityDowngradeReason || memory.compaction?.quality?.downgrade_reason || "",
            microCompact: memory.compaction?.microCompact || memory.compactBoundary?.post_compact_restore?.microCompact || null,
            timeBasedToolResultProjection: timeBasedToolResultProjection.receipt,
            timeBasedThinkingProjection: timeBasedThinkingProjection.receipt,
            postCompactReinject: effectivePostCompactReinject,
            partialCompact: memory.compaction?.partialCompact || memory.compactBoundary?.partialCompact || null,
            partialSegments: memory.compaction?.partialSegments || memory.messageCompression?.partialSegments || [],
            ptlEmergency: memory.compaction?.ptlEmergency || memory.compactBoundary?.ptlEmergency || memory.compactBoundary?.post_compact_restore?.ptlEmergency || null,
            ptlRecovery: memory.compaction?.ptlRecovery || memory.messageCompression?.ptlRecovery || memory.compactBoundary?.post_compact_restore?.ptlRecovery || null,
            truePostCompactPayloadBudget: memory.compaction?.truePostCompactPayloadBudget
                || memory.messageCompression?.truePostCompactPayloadBudget
                || memory.compactBoundary?.truePostCompactPayloadBudget
                || memory.compactBoundary?.post_compact_restore?.truePostCompactPayloadBudget
                || null,
            postCompactPayloadGate: memory.compaction?.postCompactPayloadGate
                || memory.messageCompression?.postCompactPayloadGate
                || memory.compactBoundary?.postCompactPayloadGate
                || memory.compactBoundary?.post_compact_restore?.postCompactPayloadGate
                || null,
            compactStrategyDecision: memory.compaction?.compactStrategyDecision
                || memory.compactBoundary?.compactStrategyDecision
                || memory.compactBoundary?.post_compact_restore?.strategyDecision
                || memory.messageCompression?.compactStrategyDecision
                || null,
            compactTransactionReceipt: memory.compaction?.compactTransactionReceipt
                || memory.compactBoundary?.compactTransactionReceipt
                || memory.compactBoundary?.post_compact_restore?.compactTransactionReceipt
                || null,
            postCompactMessageOrderReceipt: memory.compaction?.postCompactMessageOrderReceipt
                || memory.messageCompression?.postCompactMessageOrderReceipt
                || memory.compactBoundary?.postCompactMessageOrderReceipt
                || memory.compactBoundary?.post_compact_restore?.messageOrderReceipt
                || null,
            compactLineage: memory.compaction?.compactLineage
                || memory.messageCompression?.compactLineage
                || memory.compactBoundary?.compactLineage
                || memory.compactBoundary?.compactMetadata?.compactLineage
                || memory.compactBoundary?.post_compact_restore?.compactLineage
                || null,
            compactionUsage: memory.compaction?.compactionUsage
                || memory.messageCompression?.compactionUsage
                || memory.compactBoundary?.compactionUsage
                || memory.compactBoundary?.compactMetadata?.compactionUsage
                || memory.compactBoundary?.post_compact_restore?.compactionUsage
                || null,
            postCompactSessionStateReset: memory.compaction?.postCompactSessionStateReset
                || memory.messageCompression?.postCompactSessionStateReset
                || memory.compactBoundary?.postCompactSessionStateReset
                || memory.compactBoundary?.compactMetadata?.postCompactSessionStateReset
                || memory.compactBoundary?.post_compact_restore?.postCompactSessionStateReset
                || null,
            promptCacheCompactionNotification: memory.compaction?.promptCacheCompactionNotification
                || memory.messageCompression?.promptCacheCompactionNotification
                || memory.compactBoundary?.promptCacheCompactionNotification
                || memory.compactBoundary?.post_compact_restore?.promptCacheCompactionNotification
                || null,
            promptCacheBreakDetection: groupSessionId.startsWith("gcs_")
                ? (0, group_prompt_cache_break_detection_1.readGroupPromptCacheBreakDetection)(groupId, groupSessionId)
                : null,
            apiMicroCompactEditPlan: storedApiMicroCompactEditPlan,
            apiMicrocompactNativeApplyPlan,
            apiMicrocompactNativeApplyProofLedger,
            providerNativeCompactSessionCapacity,
            providerNativeCompactSessionGenerationFence,
            providerNativeCompactSessionCapacityReconciliation,
            compactedMessageCount: Number(memory.compaction?.compactedMessageCount || memory.messageCompression?.compressedMessages || 0),
            preservedRecentMessages: Number(memory.compaction?.preservedRecentMessages || memory.messageCompression?.recentMessages || 0),
            lastCompactedMessageId: memory.compaction?.lastCompactedMessageId || memory.compactBoundary?.summarizedThroughMessageId || "",
            lastCompactedAt: memory.compaction?.lastCompactedAt || memory.messageCompression?.lastCompressedAt || "",
            summaryChecksum: memory.compaction?.summaryChecksum || memory.compactBoundary?.summaryChecksum || "",
            sessionMemory: sessionMemorySnapshot,
            toolContinuity: toolContinuitySnapshot,
            boundary: memory.compactBoundary || null,
            boundaryHistory,
            contextPressureWarning: memory.compaction?.contextPressureWarning || memory.compaction?.compactWarning || memory.messageCompression?.contextPressureWarning || null,
            preCompactWarning: memory.compaction?.preCompactWarning || null,
            postCompactRecoveryAudit: memory.compaction?.postCompactRecoveryAudit
                || memory.compactBoundary?.post_compact_restore?.recoveryAudit
                || memory.messageCompression?.postCompactRecoveryAudit
                || null,
            postCompactCleanupAudit: memory.compaction?.postCompactCleanupAudit
                || memory.compactBoundary?.post_compact_restore?.cleanupAudit
                || memory.messageCompression?.postCompactCleanupAudit
                || null,
            hookLedger: memory.compaction?.hookLedger || null,
            replayRepairPlan: memory.compaction?.replayRepairPlan || memory.compaction?.replay_repair_plan || null,
            replayRepairLedger,
            replayRepairWorkItems,
            replayRepairDispatchCandidates,
            childAgentTypes,
            resumeProjection: {
                schema: resumeProjection.schema || "",
                status: resumeProjection.status || "unknown",
                reason: resumeProjection.reason || "",
                verified: resumeProjection.verified === true,
                useProjection: resumeProjection.useProjection === true,
                recovered: resumePreparation.recovered === true,
                recoveryReason: resumePreparation.recoveryReason || "",
                boundary: resumeProjection.boundary || null,
                journal: resumeProjection.journal || null,
                proof: resumePreparation.proof || null,
                rawMessageCount: Number(resumeProjection.rawMessageCount ?? allMessages.length),
                omittedMessageCount: Number(resumeProjection.omittedMessageCount || 0),
                snipOmittedMessageCount: Number(resumeProjection.snipOmittedMessageCount || 0),
                totalOmittedMessageCount: Number(resumeProjection.totalOmittedMessageCount || resumeProjection.omittedMessageCount || 0),
                preservedMessageCount: Number(resumeProjection.preservedMessageCount || resumeProjection.preservedMessages?.length || 0),
                messagesAfterBoundaryCount: Number(resumeProjection.messagesAfterBoundaryCount || resumeProjection.messagesAfterBoundary?.length || 0),
                projectedMessageCount: Number(resumeProjection.projectedMessageCount || projectedMessages.length),
                snipReplay: resumeProjection.snipReplay || null,
                roundTripConsistency: resumeProjection.roundTripConsistency || null,
                compactHeadRecovery: resumePreparation.compactHeadRecovery || null,
                effectiveTokenBaseline: resumePreparation.resumeBaseline || memory.compaction?.resumeEffectiveTokenBaseline || null,
                projectionChecksum: resumeProjection.projectionChecksum || ""
            }
        },
        group_state: {
            goal: memory.goal || "",
            currentPhase: memory.currentPhase || "idle",
            summaryText,
            decisions: modelVisibleRuntime.decisions.slice(-6),
            openQuestions: (memory.openQuestions || []).slice(-4),
            nextActions: modelVisibleRuntime.nextActions.slice(-4),
            persistentRequirements: (memory.persistentRequirements || []).slice(-8),
            factAnchors: modelVisibleRuntime.factAnchors.slice(-8),
            postTurnSummaries: {
                schema: postTurnSummaryLedger?.schema || "",
                valid: postTurnSummaryLedger?.valid === true,
                eventCount: Number(postTurnSummaryLedger?.eventCount || 0),
                summaryCount: Number(postTurnSummaryLedger?.summaryCount || 0),
                headChecksum: String(postTurnSummaryLedger?.headChecksum || ""),
                archiveCount: Number(postTurnSummaryLedger?.archiveCount || 0),
                deliveryCapsule: postTurnSummaryDeliveryCapsule ? {
                    schema: "ccm-group-post-turn-summary-delivery-capsule-projection-v1",
                    capsuleChecksum: postTurnSummaryDeliveryCapsule.capsule_checksum,
                    taskAgentSessionId: postTurnSummaryDeliveryCapsule.task_agent_session_id,
                    attemptSequence: postTurnSummaryDeliveryCapsule.attempt_sequence,
                    invocationKind: postTurnSummaryDeliveryCapsule.invocation_kind,
                    compactEpoch: postTurnSummaryDeliveryCapsule.compact_epoch,
                    ledgerHeadChecksum: postTurnSummaryDeliveryCapsule.ledger_head_checksum,
                    selectedCount: postTurnSummaryDeliveryCapsule.selected_count
                } : null,
                latest: deliveredPostTurnSummaries.map((row) => ({
                    summaryId: String(row.summary_id || ""),
                    summarizesMessageId: String(row.summarizes_message_id || ""),
                    messageChecksum: String(row.message_checksum || ""),
                    eventChecksum: String(row.event_checksum || ""),
                    sequence: Number(row.sequence || 0),
                    taskId: String(row.task_id || ""),
                    agent: String(row.agent || ""),
                    statusCategory: String(row.status_category || ""),
                    isNoteworthy: row.is_noteworthy === true,
                    title: (0, group_memory_shared_1.compactMemoryText)(row.title || "", 140),
                    description: (0, group_memory_shared_1.compactMemoryText)(row.description || "", 500),
                    recentAction: (0, group_memory_shared_1.compactMemoryText)(row.recent_action || "", 300),
                    needsAction: (0, group_memory_shared_1.compactMemoryText)(row.needs_action || "", 300),
                    artifactUrls: Array.isArray(row.artifact_urls) ? row.artifact_urls.slice(0, 8) : [],
                    generatedAt: String(row.generated_at || "")
                }))
            },
            typedMemory: {
                distillation: typedLogDistillation,
                arbitrationDistillation: globalMemoryArbitrationDistillation,
                sync: {
                    indexFile: effectiveTypedMemorySync.index.file,
                    memoryDir: effectiveTypedMemorySync.index.dir,
                    docs: effectiveTypedMemorySync.index.docs.length,
                    lineCount: effectiveTypedMemorySync.index.lineCount,
                    bytes: effectiveTypedMemorySync.index.bytes
                },
                globalClaudeMemoryImport,
                projectMemoryImport,
                loadPlan: effectiveTypedMemoryLoadPlan,
                recallQuery: typedMemoryRecallQuery,
                recentTools,
                targetPaths: typedMemoryTargetPaths,
                recall: deliveredEffectiveTypedMemoryRecall,
                deliveryCapsule: typedMemoryDeliveryCapsule,
                deliveryLease: typedMemoryDeliveryLease,
                providerRankingCompactRepairReceiptRecall: effectiveProviderRankingCompactRepairReceiptRecall,
                postCompactReinjectionRepairReceiptRecall: effectivePostCompactReinjectionRepairReceiptRecall,
                pressureProvenanceReceiptDiscipline: pressureMemoryProvenanceReceiptDiscipline.active ? pressureMemoryProvenanceReceiptDiscipline : null,
                pressureProvenanceDispatchFeedbackPolicy: pressureProvenanceDispatchFeedbackPolicy.active ? pressureProvenanceDispatchFeedbackPolicy : null,
                ledger: {
                    file: typedMemoryLedger.file,
                    scope: typedMemoryRecallLedgerScope.scope,
                    scopeKind: typedMemoryRecallLedgerScope.scopeKind,
                    taskAgentSessionId: typedMemoryRecallLedgerScope.taskAgentSessionId,
                    taskId: typedMemoryRecallLedgerScope.taskId,
                    compactEpoch: typedMemoryRecallLedgerScope.compactEpoch,
                    sessionBound: typedMemoryRecallLedgerScope.sessionBound,
                    alreadySurfaced: ledgerAlreadySurfaced.slice(-20),
                    recordedThisTurn: [],
                    pendingThisTurn: typedMemoryDeliveryCapsule.delivered_rel_paths || [],
                    deliveryStatsBefore: typedMemoryRecallScopeStatsBefore,
                    deliveryStatsAfter: typedMemoryRecallScopeStatsAfter
                }
            }
        },
        source_manifest: sourceManifest,
        memory_reload_audit: memoryReloadAudit,
        global_agent_memory: globalAgentMemoryRecall,
        global_memory_health_gate: globalAgentMemoryRecall?.memory_health_gate || null,
        global_memory_arbitration_ledger: effectiveGlobalMemoryArbitrationLedger,
        dispatch_freshness_gate: dispatchFreshnessGate,
        post_compact_reinjection_gate: postCompactReinjectionGate,
        post_compact_dispatch_marker: postCompactDispatchMarker,
        post_compact_candidate_usage: postCompactCandidateUsage,
        target_agent_memory: {
            ...agentMemory,
            recentReceipts: (agentMemory.recentReceipts || []).slice(-8),
            frequentFiles: (agentMemory.frequentFiles || []).slice(-12),
            verificationHints: (agentMemory.verificationHints || []).slice(-8),
            blockers: (agentMemory.blockers || []).slice(-8),
            needs: (agentMemory.needs || []).slice(-8)
        },
        related_work: {
            ownCompleted,
            otherCompleted,
            ownBlocked,
            globalBlocked,
            relatedLedger
        },
        resume_context: {
            schema: "ccm-group-memory-resume-context-v1",
            status: resumeProjection.status || "unknown",
            verified: resumeProjection.verified === true,
            projectedMessageCount: Number(resumeProjection.projectedMessageCount || projectedMessages.length),
            text: (0, group_memory_shared_1.compactPreserveLines)((0, group_memory_compaction_1.buildBoundedRecentGroupContext)(projectedMessages, Math.min(8, Math.max(3, Number(options.fullCount || options.full_count || 6)))), Number(options.maxResumeContextChars || options.max_resume_context_chars || 4200)),
            timeBasedToolResultProjection: timeBasedToolResultProjection.receipt,
            timeBasedThinkingProjection: timeBasedThinkingProjection.receipt
        },
        session_continuity: formalSessionContinuity,
        relevant_historical_evidence: relevantHistoricalEvidence,
        raw_sources: {
            group_memory_file: (0, group_memory_storage_1.getGroupMemoryFile)(groupId, groupSessionId),
            group_messages_file: (0, group_memory_shared_1.getGroupMessagesFileHint)(groupId, groupSessionId),
            group_typed_memory_index_file: effectiveTypedMemorySync.index.file,
            group_typed_memory_dir: effectiveTypedMemorySync.index.dir,
            group_typed_memory_distillation_ledger_file: typedLogDistillation.ledgerFile || "",
            group_typed_memory_recall_ledger_file: typedMemoryLedger.file || "",
            global_agent_memory_file: globalAgentMemoryRecall?.file || memory_1.GLOBAL_AGENT_MEMORY_FILE,
            group_global_memory_arbitration_ledger_file: Number(effectiveGlobalMemoryArbitrationLedger?.entryCount || 0) > 0
                ? (effectiveGlobalMemoryArbitrationLedger?.file || (0, group_global_memory_arbitration_1.getGroupGlobalMemoryArbitrationLedgerFile)(groupId))
                : "",
            global_memory_cross_group_arbitration_dir: (Number(globalAgentMemoryRecall?.crossGroupSuppression?.suppressedCount || 0) > 0 || Number(globalAgentMemoryRecall?.crossGroupSuppression?.advisoryCount || 0) > 0)
                ? (globalAgentMemoryRecall?.crossGroupSuppression?.sourceDir || group_memory_shared_1.GROUP_GLOBAL_MEMORY_ARBITRATION_DIR)
                : "",
            group_memory_reload_ledger_file: memoryReloadAudit.ledgerFile || "",
            group_post_compact_dispatch_ledger_file: postCompactDispatchMarker?.ledger_file || (0, group_memory_storage_1.getGroupPostCompactDispatchLedgerFile)(groupId, groupSessionId),
            group_post_compact_candidate_usage_ledger_file: postCompactCandidateUsage.ledger_file || (0, group_compact_file_references_1.getGroupPostCompactCandidateUsageLedgerFile)(groupId, groupSessionId),
            group_api_microcompact_native_apply_proof_ledger_file: apiMicrocompactNativeApplyProofLedger.ledger_file || (0, group_compact_file_references_1.getGroupApiMicrocompactNativeApplyProofLedgerFile)(groupId, groupSessionId),
            group_api_microcompact_native_apply_request_telemetry_ledger_file: apiMicrocompactNativeApplyProofLedger.request_telemetry?.ledger_file || (0, group_compact_file_references_1.getGroupApiMicrocompactNativeApplyRequestTelemetryLedgerFile)(groupId, groupSessionId),
            provider_native_compact_execution_receipt_ledger_file: apiMicrocompactNativeApplyProofLedger.platform_execution_receipts?.ledger_file || (0, provider_native_compact_execution_receipt_1.getProviderNativeCompactExecutionReceiptLedgerFile)(groupId, groupSessionId),
            group_replay_repair_ledger_file: replayRepairLedger?.file || (0, group_memory_storage_1.getGroupReplayRepairLedgerFile)(groupId, groupSessionId),
            group_replay_repair_work_items_file: replayRepairWorkItems?.file || (0, group_memory_storage_1.getGroupReplayRepairWorkItemsFile)(groupId, groupSessionId),
            group_session_memory_snapshot_file: sessionMemorySnapshot?.snapshotFile || (0, group_session_memory_snapshot_1.getGroupSessionMemorySnapshotFile)(typedMemoryScopeId),
            group_session_memory_summary_file: sessionMemorySnapshot?.summaryFile || (0, group_memory_storage_1.getGroupSessionMemoryMarkdownFile)(typedMemoryScopeId),
            group_tool_continuity_snapshot_file: toolContinuitySnapshot?.snapshotFile || (0, group_tool_continuity_1.getGroupToolContinuitySnapshotFile)(typedMemoryScopeId),
            group_tool_continuity_summary_file: toolContinuitySnapshot?.summaryFile || (0, group_tool_continuity_1.getGroupToolContinuityMarkdownFile)(typedMemoryScopeId),
            group_compact_boundary_journal_file: (0, group_memory_boundary_journal_1.getGroupMemoryBoundaryJournalFile)(groupId, groupSessionId),
            group_resume_projection_proof_file: (0, group_memory_boundary_journal_1.getGroupMemoryResumeProofFile)(groupId, groupSessionId),
            group_post_turn_summary_ledger_file: (0, group_post_turn_summary_1.getGroupPostTurnSummaryLedgerFile)(groupId, groupSessionId),
            project_memory_root: projectMemoryRoot
        },
        typed_memory_recall: deliveredEffectiveTypedMemoryRecall,
        typedMemoryRecall: deliveredEffectiveTypedMemoryRecall,
        typed_memory_delivery_capsule: typedMemoryDeliveryCapsule,
        typedMemoryDeliveryCapsule,
        typed_memory_delivery_lease: typedMemoryDeliveryLease,
        typedMemoryDeliveryLease,
        post_turn_summary_delivery_capsule: postTurnSummaryDeliveryCapsule,
        postTurnSummaryDeliveryCapsule,
        task_agent_invocation_lineage: taskAgentInvocationLineage,
        taskAgentInvocationLineage,
        typed_memory_load_plan: effectiveTypedMemoryLoadPlan,
        typedMemoryLoadPlan: effectiveTypedMemoryLoadPlan,
        provider_ranking_compact_repair_receipt_recall: effectiveProviderRankingCompactRepairReceiptRecall,
        post_compact_reinjection_repair_receipt_recall: effectivePostCompactReinjectionRepairReceiptRecall,
        global_agent_memory_recall: globalAgentMemoryRecall,
        globalAgentMemoryRecall
    };
    const compactReferenceScopeId = typedMemoryScopeId;
    bundle.compact_file_references = (0, group_compact_file_references_1.buildGroupCompactFileReferences)(compactReferenceScopeId, {
        generatedAt,
        sourceManifest,
        sessionMemory: sessionMemorySnapshot,
        toolContinuity: toolContinuitySnapshot,
        typedMemory: bundle.group_state?.typedMemory || {},
        rawSources: bundle.raw_sources || {}
    });
    bundle.compact_file_reference_read_plan = (0, group_compact_file_references_1.buildGroupCompactFileReferenceReadPlan)(compactReferenceScopeId, bundle.compact_file_references, {
        generatedAt,
        maxEntries: 10
    });
    const historicalReadPlanRows = (0, group_compact_file_references_1.latestGroupCompactFileReferenceReadPlanRows)(compactReferenceScopeId, bundle.compact_file_reference_read_plan);
    const compactFileReferenceReadPlanForFreshness = {
        ...bundle.compact_file_reference_read_plan,
        entries: historicalReadPlanRows.rows,
        plannedCount: historicalReadPlanRows.rows.filter((entry) => entry.action !== "skip_missing").length,
        sourceReferenceCount: historicalReadPlanRows.rows.length
    };
    bundle.compact_file_reference_read_plan_freshness = (0, group_compact_file_references_1.summarizeGroupCompactFileReferenceReadPlanFreshness)(compactReferenceScopeId, compactFileReferenceReadPlanForFreshness);
    bundle.compact_file_reference_read_plan_revalidation_gate = (0, group_compact_file_references_1.buildGroupCompactFileReferenceReadPlanRevalidationGate)(compactReferenceScopeId, bundle.compact_file_reference_read_plan_freshness, {
        generatedAt,
        targetProject: project,
        scope: `child:${project}`,
        sessionBinding
    });
    (0, group_compact_file_references_1.recordGroupCompactFileReferenceSurfacing)(compactReferenceScopeId, bundle.compact_file_references, {
        generatedAt,
        scope: `child:${project}`,
        targetProject: project,
        task,
        sessionBinding,
        readPlan: bundle.compact_file_reference_read_plan,
        readPlanRevalidationGate: bundle.compact_file_reference_read_plan_revalidation_gate
    });
    bundle.compact_file_reference_read_plan_access = (0, group_compact_file_references_1.summarizeGroupCompactFileReferenceReadPlanAccess)(compactReferenceScopeId, bundle.compact_file_reference_read_plan, memory);
    bundle.compact_file_reference_access = (0, group_compact_file_references_1.summarizeGroupCompactFileReferenceAccess)(compactReferenceScopeId, bundle.compact_file_references, memory);
    const invokedSkillPlan = bundle.compaction?.postCompactReinject || {};
    bundle.invoked_skill_attachments = Array.isArray(invokedSkillPlan.invokedSkillAttachments) ? invokedSkillPlan.invokedSkillAttachments : [];
    bundle.invoked_skill_attachment_receipt = invokedSkillPlan.invokedSkillAttachmentReceipt || null;
    bundle.invoked_skill_attachment_text = (0, group_memory_context_part_01_1.renderGroupPostCompactInvokedSkillAttachments)(invokedSkillPlan);
    bundle.plan_attachment = invokedSkillPlan.planAttachment || null;
    bundle.plan_attachment_receipt = invokedSkillPlan.planAttachmentReceipt || null;
    bundle.plan_attachment_text = (0, group_memory_context_part_01_1.renderGroupPostCompactPlanAttachment)(invokedSkillPlan);
    bundle.dynamic_context_delta_attachment = invokedSkillPlan.dynamicContextDeltaAttachment || null;
    bundle.dynamic_context_delta_receipt = invokedSkillPlan.dynamicContextDeltaReceipt || null;
    bundle.dynamic_context_delta_text = (0, group_memory_context_part_01_1.renderGroupPostCompactDynamicContextDelta)(invokedSkillPlan);
    const renderedWithReferences = (0, group_memory_context_part_04_1.renderGroupMemoryContextBundle)(bundle);
    bundle.context_budget = (0, context_budget_1.buildContextBudget)({ context: renderedWithReferences, maxChars: 36_000, maxTokens: 90_000 });
    const payloadGate = bundle.compaction?.postCompactPayloadGate || {};
    const requestedRenderedChars = Number(options.maxRenderedChars || 14_000);
    const payloadSafeRenderedChars = payloadGate.status === "recompact_required"
        ? Math.max(3000, Number(payloadGate.safe_render_chars || 6000))
        : requestedRenderedChars;
    bundle.rendered_text = (0, group_memory_shared_1.compactPreserveLines)(renderedWithReferences, Math.min(requestedRenderedChars, payloadSafeRenderedChars));
    return bundle;
}
//# sourceMappingURL=group-memory-context-part-03-part-01.js.map