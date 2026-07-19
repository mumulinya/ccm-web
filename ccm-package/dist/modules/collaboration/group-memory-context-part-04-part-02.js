"use strict";
// Behavior-freeze split from group-memory-context-part-04.ts (part 2/2).
// Behavior-freeze split from group-memory-context.ts (part 4/5).
// Behavior-freeze module extracted mechanically from the former facade.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGlobalGroupMemoryContext = buildGlobalGroupMemoryContext;
exports.renderGlobalGroupMemoryContextBundle = renderGlobalGroupMemoryContextBundle;
const context_budget_1 = require("../../system/context-budget");
const group_runtime_memory_admission_1 = require("./group-runtime-memory-admission");
const group_memory_compaction_1 = require("./group-memory-compaction");
const group_memory_index_1 = require("./group-memory-index");
const storage_1 = require("./storage");
const group_compact_file_references_1 = require("./group-compact-file-references");
const group_memory_shared_1 = require("./group-memory-shared");
const group_memory_storage_1 = require("./group-memory-storage");
const group_session_memory_snapshot_1 = require("./group-session-memory-snapshot");
const group_tool_continuity_1 = require("./group-tool-continuity");
function buildGlobalGroupMemoryContext(query = "", options = {}) {
    const groups = (Array.isArray(options.groups) ? options.groups : (0, storage_1.loadGroups)()).filter((group) => group?.id);
    const ignoreMemory = (0, group_memory_index_1.shouldIgnoreGroupMemoryRequest)(query, options);
    const generatedAt = new Date().toISOString();
    const maxGroups = Math.max(1, Math.min(12, Number(options.maxGroups || options.max_groups || 6)));
    const maxTypedMemory = Math.max(1, Math.min(8, Number(options.maxTypedMemory || options.max_typed_memory || 3)));
    const sessionId = String(options.sessionId || options.session_id || "");
    if (ignoreMemory) {
        const bundle = {
            schema: "ccm-global-group-memory-context-v1",
            version: 1,
            generated_at: generatedAt,
            query: (0, group_memory_shared_1.compactMemoryText)(query, 900),
            session_id: sessionId,
            total_group_count: groups.length,
            selected_group_count: 0,
            memory_policy: {
                ignored: true,
                ignore_reason: "user_requested_ignore_memory",
                priority: "user_ignore_memory_request_over_group_memory",
                use: "must_not_use_group_memory",
                boundary: "current_global_agent_turn_only"
            },
            groups: []
        };
        const rendered = renderGlobalGroupMemoryContextBundle(bundle);
        bundle.context_budget = (0, context_budget_1.buildContextBudget)({ context: rendered, maxChars: 12_000, maxTokens: 30_000 });
        bundle.rendered_text = (0, group_memory_shared_1.compactPreserveLines)(rendered, Number(options.maxRenderedChars || options.max_rendered_chars || 5000));
        return bundle;
    }
    const candidates = groups.map((group, index) => {
        const messages = (0, storage_1.getGroupMessages)(group.id).filter((message) => !String(message?.content || "").startsWith("📤"));
        const memory = (0, group_memory_storage_1.loadGroupMemory)(group.id);
        const updatedAt = memory?.updated_at || (0, group_memory_shared_1.latestGroupMessageTimestamp)(messages) || "";
        return {
            group,
            messages,
            memory,
            index,
            updatedAt,
            score: (0, group_memory_shared_1.scoreGlobalGroupMemoryCandidate)(group, memory, messages, query)
        };
    }).sort((a, b) => {
        if (b.score !== a.score)
            return b.score - a.score;
        const byTime = Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "");
        return Number.isFinite(byTime) && byTime !== 0 ? byTime : a.index - b.index;
    });
    const selected = candidates.slice(0, maxGroups);
    const contextGroups = selected.map((candidate) => {
        const group = candidate.group;
        const memory = candidate.memory;
        const messages = candidate.messages;
        const modelVisibleRuntime = (0, group_runtime_memory_admission_1.modelVisibleGroupRuntimeState)(memory);
        const globalClaudeMemoryImport = options.includeGlobalClaudeMemory === false || options.include_global_claude_memory === false
            ? null
            : (0, group_memory_index_1.importGlobalClaudeMemoryToGroupTypedMemory)(group.id, {
                settingSources: options.settingSources ?? options.setting_sources,
                includeUser: options.includeUserClaudeMemory !== false && options.include_user_claude_memory !== false,
                includeManaged: options.includeManagedClaudeMemory !== false && options.include_managed_claude_memory !== false,
                userRoot: options.claudeUserRoot || options.claude_user_root,
                managedRoot: options.claudeManagedRoot || options.claude_managed_root,
                maxRuleFiles: options.globalClaudeMemoryMaxRuleFiles || options.global_claude_memory_max_rule_files,
                maxImportFiles: options.globalClaudeMemoryMaxImportFiles || options.global_claude_memory_max_import_files
            });
        const projectMemoryImports = (0, group_memory_shared_1.importGroupProjectMemoriesForMembers)(group.id, group, options);
        const sync = (0, group_memory_index_1.syncGroupTypedMemoryFromGroupMemory)(group.id, memory);
        const recallQuery = [query, group.name, group.id, memory.goal, memory.currentPhase].filter(Boolean).join("\n");
        const typedMemoryTargetPaths = (0, group_memory_index_1.deriveGroupTypedMemoryTargetPaths)(recallQuery, options.targetPaths || options.target_paths || []);
        const loadPlan = (0, group_memory_index_1.buildGroupTypedMemoryLoadPlan)(group.id, {
            maxEntries: options.maxTypedMemoryLoadEntries || options.max_typed_memory_load_entries,
            query: recallQuery,
            targetPaths: typedMemoryTargetPaths
        });
        const recallScope = String(options.recallScope || options.recall_scope || `global-agent:${sessionId || "default"}`);
        const alreadySurfaced = (0, group_memory_index_1.getAlreadySurfacedGroupTypedMemory)(group.id, recallScope, { limit: 160 });
        const recall = (0, group_memory_index_1.buildGroupTypedMemoryRecall)(group.id, recallQuery, {
            alreadySurfaced,
            targetPaths: typedMemoryTargetPaths,
            targetProject: options.targetProject || options.target_project || "",
            groupMemory: memory,
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
            max: maxTypedMemory,
            snippetChars: Number(options.snippetChars || options.snippet_chars || 650)
        });
        const ledger = (0, group_memory_index_1.recordGroupTypedMemoryRecall)(group.id, recallScope, recall, recallQuery, {
            disableLedger: options.disableLedger === true || options.disable_ledger === true
        });
        const distillationQuality = memory?.compaction?.logDistillation?.quality
            || memory?.longTermLogDistillation?.quality
            || (0, group_memory_index_1.evaluateGroupTypedMemoryDistillationQuality)(group.id, { projectRoot: options.projectRoot || options.project_root });
        const sourceManifest = (0, group_compact_file_references_1.buildGroupMemorySourceManifest)(group.id, {
            generatedAt,
            typedMemorySync: sync,
            typedMemoryLedger: ledger
        });
        const globalReloadReason = String(options.memoryReloadReason || options.memory_reload_reason || "")
            || (Number(globalClaudeMemoryImport?.importedCount || 0) > 0 && projectMemoryImports.some((item) => Number(item.importedCount || 0) > 0) ? "memory_file_import"
                : Number(globalClaudeMemoryImport?.importedCount || 0) > 0 ? "global_claude_memory_import"
                    : projectMemoryImports.some((item) => Number(item.importedCount || 0) > 0) ? "project_memory_import"
                        : memory.compaction?.postCompactRecoveryAudit?.schema ? "post_compact_restore"
                            : "global_context_bundle");
        const reloadAudit = (0, group_compact_file_references_1.recordGroupMemoryReloadAudit)(group.id, {
            generatedAt,
            scope: `global:${sessionId || "default"}:${group.id}`,
            contextKind: "global_agent",
            reason: globalReloadReason,
            sourceManifest,
            loadPlan,
            globalClaudeMemoryImport,
            projectMemoryImports,
            postCompactRecoveryAudit: memory.compaction?.postCompactRecoveryAudit
                || memory.compactBoundary?.post_compact_restore?.recoveryAudit
                || memory.messageCompression?.postCompactRecoveryAudit
                || null
        });
        const sessionMemory = memory.sessionMemory?.schema ? memory.sessionMemory : (0, group_session_memory_snapshot_1.readGroupSessionMemorySnapshotSummary)(group.id);
        const toolContinuity = memory.toolContinuity?.schema ? memory.toolContinuity : (0, group_tool_continuity_1.readGroupToolContinuitySnapshotSummary)(group.id);
        const rawSources = {
            group_memory_file: (0, group_memory_storage_1.getGroupMemoryFile)(group.id),
            group_messages_file: (0, group_memory_shared_1.getGroupMessagesFileHint)(group.id),
            group_typed_memory_dir: sync.index.dir,
            group_typed_memory_index_file: sync.index.file,
            group_typed_memory_recall_ledger_file: ledger.file,
            group_memory_reload_ledger_file: reloadAudit.ledgerFile,
            group_session_memory_snapshot_file: sessionMemory?.snapshotFile || (0, group_session_memory_snapshot_1.getGroupSessionMemorySnapshotFile)(group.id),
            group_session_memory_summary_file: sessionMemory?.summaryFile || (0, group_memory_storage_1.getGroupSessionMemoryMarkdownFile)(group.id),
            group_tool_continuity_snapshot_file: toolContinuity?.snapshotFile || (0, group_tool_continuity_1.getGroupToolContinuitySnapshotFile)(group.id),
            group_tool_continuity_summary_file: toolContinuity?.summaryFile || (0, group_tool_continuity_1.getGroupToolContinuityMarkdownFile)(group.id)
        };
        const compactFileReferences = (0, group_compact_file_references_1.buildGroupCompactFileReferences)(group.id, {
            generatedAt,
            sourceManifest,
            sessionMemory,
            toolContinuity,
            typedMemory: {
                sync: {
                    index_file: sync.index.file,
                    memory_dir: sync.index.dir
                }
            },
            rawSources
        });
        const compactFileReferenceReadPlan = (0, group_compact_file_references_1.buildGroupCompactFileReferenceReadPlan)(group.id, compactFileReferences, {
            generatedAt,
            maxEntries: 8
        });
        const historicalReadPlanRows = (0, group_compact_file_references_1.latestGroupCompactFileReferenceReadPlanRows)(group.id, compactFileReferenceReadPlan);
        const compactFileReferenceReadPlanForFreshness = {
            ...compactFileReferenceReadPlan,
            entries: historicalReadPlanRows.rows,
            plannedCount: historicalReadPlanRows.rows.filter((entry) => entry.action !== "skip_missing").length,
            sourceReferenceCount: historicalReadPlanRows.rows.length
        };
        const compactFileReferenceReadPlanFreshness = (0, group_compact_file_references_1.summarizeGroupCompactFileReferenceReadPlanFreshness)(group.id, compactFileReferenceReadPlanForFreshness);
        const compactFileReferenceReadPlanRevalidationGate = (0, group_compact_file_references_1.buildGroupCompactFileReferenceReadPlanRevalidationGate)(group.id, compactFileReferenceReadPlanFreshness, {
            generatedAt,
            scope: `global:${sessionId || "default"}:${group.id}`
        });
        return {
            group_id: group.id,
            group_name: group.name || group.id,
            score: candidate.score,
            members: (0, group_memory_shared_1.normalizeGlobalGroupMemoryMembers)(group),
            message_window: {
                total_messages: messages.length,
                latest_message_at: (0, group_memory_shared_1.latestGroupMessageTimestamp)(messages)
            },
            memory_state: {
                goal: memory.goal || "",
                current_phase: memory.currentPhase || "idle",
                summary: (0, group_memory_shared_1.compactPreserveLines)(memory.messageDigest || memory.summary || (0, group_memory_compaction_1.renderConversationSummary)(memory.conversationSummary || null), 2200),
                persistent_requirements: (memory.persistentRequirements || []).slice(-6),
                fact_anchors: modelVisibleRuntime.factAnchors.slice(-6),
                decisions: modelVisibleRuntime.decisions.slice(-5),
                completed: (memory.completed || []).slice(-5),
                blocked: (memory.blocked || []).slice(-5),
                open_questions: (memory.openQuestions || []).slice(-4),
                next_actions: modelVisibleRuntime.nextActions.slice(-4)
            },
            compaction: {
                version: memory.compaction?.version || group_memory_compaction_1.GROUP_MEMORY_COMPACTION_VERSION,
                health: memory.compaction?.health || "",
                quality: memory.compaction?.quality || null,
                quality_score: Number(memory.compaction?.quality?.score || 0),
                quality_status: memory.compaction?.quality?.status || "",
                compacted_message_count: Number(memory.compaction?.compactedMessageCount || memory.messageCompression?.compressedMessages || 0),
                preserved_recent_messages: Number(memory.compaction?.preservedRecentMessages || memory.messageCompression?.recentMessages || 0),
                last_compacted_message_id: memory.compaction?.lastCompactedMessageId || memory.compactBoundary?.summarizedThroughMessageId || "",
                preserved_segment: memory.compaction?.preservedSegment || memory.compactBoundary?.preservedSegment || null,
                context_pressure_warning: memory.compaction?.contextPressureWarning || memory.compaction?.compactWarning || memory.messageCompression?.contextPressureWarning || null,
                post_compact_recovery_audit: memory.compaction?.postCompactRecoveryAudit
                    || memory.compactBoundary?.post_compact_restore?.recoveryAudit
                    || memory.messageCompression?.postCompactRecoveryAudit
                    || null,
                partial_segments: Array.isArray(memory.compaction?.partialSegments || memory.messageCompression?.partialSegments)
                    ? (memory.compaction?.partialSegments || memory.messageCompression?.partialSegments || []).slice(-3)
                    : [],
                ptl_emergency: memory.compaction?.ptlEmergency || memory.compactBoundary?.ptlEmergency || null,
                ptl_recovery: memory.compaction?.ptlRecovery || memory.messageCompression?.ptlRecovery || null,
                session_memory_compact_selection: memory.compaction?.sessionMemoryCompactSelection
                    || memory.compactBoundary?.sessionMemoryCompactSelection
                    || memory.messageCompression?.sessionMemoryCompactSelection
                    || null,
                post_compact_session_state_reset: memory.compaction?.postCompactSessionStateReset
                    || memory.compactBoundary?.postCompactSessionStateReset
                    || memory.compactBoundary?.post_compact_restore?.postCompactSessionStateReset
                    || memory.messageCompression?.postCompactSessionStateReset
                    || null,
                session_memory: (0, group_runtime_memory_admission_1.isCanonicalGroupSessionMemory)(sessionMemory) ? sessionMemory : null,
                tool_continuity: toolContinuity
            },
            typed_memory: {
                sync: {
                    index_file: sync.index.file,
                    memory_dir: sync.index.dir,
                    docs: sync.index.docs.length,
                    line_count: sync.index.lineCount,
                    bytes: sync.index.bytes
                },
                global_claude_memory_import: globalClaudeMemoryImport,
                project_memory_imports: projectMemoryImports,
                load_plan: loadPlan,
                target_paths: typedMemoryTargetPaths,
                recall,
                ledger: {
                    file: ledger.file,
                    scope: recallScope,
                    already_surfaced: alreadySurfaced.slice(-20),
                    recorded_this_turn: recall.surfaced || []
                },
                distillation_quality: distillationQuality
            },
            source_manifest: sourceManifest,
            memory_reload_audit: reloadAudit,
            compact_file_references: compactFileReferences,
            compact_file_reference_read_plan: compactFileReferenceReadPlan,
            compact_file_reference_read_plan_access: (0, group_compact_file_references_1.summarizeGroupCompactFileReferenceReadPlanAccess)(group.id, compactFileReferenceReadPlan, memory),
            compact_file_reference_read_plan_freshness: compactFileReferenceReadPlanFreshness,
            compact_file_reference_read_plan_revalidation_gate: compactFileReferenceReadPlanRevalidationGate,
            compact_file_reference_access: (0, group_compact_file_references_1.summarizeGroupCompactFileReferenceAccess)(group.id, compactFileReferences, memory),
            raw_sources: rawSources
        };
    });
    const providerReliabilitySnapshotFile = options.providerReliabilitySnapshotFile || options.provider_reliability_snapshot_file;
    const providerReliabilitySnapshot = options.disableCrossGroupProviderReliability === true
        || options.disable_cross_group_provider_reliability === true
        || ((options.disableLedger === true || options.disable_ledger === true) && !providerReliabilitySnapshotFile && options.enableProviderReliabilitySnapshot !== true && options.enable_provider_reliability_snapshot !== true)
        ? null
        : (0, group_memory_index_1.getOrRefreshGlobalProviderDispatchReliabilitySnapshot)({
            snapshotFile: providerReliabilitySnapshotFile,
            ttlMs: options.providerReliabilitySnapshotTtlMs || options.provider_reliability_snapshot_ttl_ms,
            crossGroupProviderReliabilityGroupIds: options.crossGroupProviderReliabilityGroupIds || options.cross_group_provider_reliability_group_ids,
            minSourceGroups: options.crossGroupProviderReliabilityMinSourceGroups || options.cross_group_provider_reliability_min_source_groups || options.minSourceGroups || options.min_source_groups || 2,
            providerReliabilityHalfLifeDays: options.providerReliabilityHalfLifeDays || options.provider_reliability_half_life_days || 14,
            nowMs: options.providerReliabilitySnapshotNowMs || options.provider_reliability_snapshot_now_ms,
            generatedAt
        });
    const bundle = {
        schema: "ccm-global-group-memory-context-v1",
        version: 1,
        generated_at: generatedAt,
        query: (0, group_memory_shared_1.compactMemoryText)(query, 900),
        session_id: sessionId,
        total_group_count: groups.length,
        selected_group_count: contextGroups.length,
        memory_policy: {
            priority: "group_memory_before_global_dispatch",
            use: "must_consider_relevant_groups",
            boundary: "bounded_multi_group_summary_typed_recall_raw_paths",
            raw_recovery: "group memory JSON, group messages JSON, and MEMORY.md typed docs remain the source of truth"
        },
        provider_reliability_snapshot: providerReliabilitySnapshot?.snapshot ? {
            snapshot_id: providerReliabilitySnapshot.snapshot.snapshot_id || "",
            generation_id: providerReliabilitySnapshot.snapshot.generation_id || "",
            snapshot_checksum: providerReliabilitySnapshot.snapshot.snapshot_checksum || "",
            status: providerReliabilitySnapshot.status || "",
            usable: providerReliabilitySnapshot.usable === true,
            refreshed: providerReliabilitySnapshot.refreshed === true,
            generated_at: providerReliabilitySnapshot.snapshot.generated_at || "",
            expires_at: providerReliabilitySnapshot.snapshot.expires_at || "",
            source_generation_checksum: providerReliabilitySnapshot.snapshot.source_provenance?.generation_checksum || "",
            guidance_only: true,
            local_policy_override_allowed: false,
            contains_private_memory: false
        } : null,
        provider_reliability_guidance: providerReliabilitySnapshot?.usable === true
            ? providerReliabilitySnapshot.snapshot?.signals || null
            : null,
        groups: contextGroups
    };
    const rendered = renderGlobalGroupMemoryContextBundle(bundle);
    bundle.context_budget = (0, context_budget_1.buildContextBudget)({ context: rendered, maxChars: 48_000, maxTokens: 90_000 });
    bundle.rendered_text = (0, group_memory_shared_1.compactPreserveLines)(rendered, Number(options.maxRenderedChars || options.max_rendered_chars || 12_000));
    return bundle;
}
function renderGlobalGroupMemoryContextBundle(bundle) {
    if (!bundle)
        return "";
    if (typeof bundle === "string")
        return bundle;
    if (bundle.memory_policy?.ignored === true) {
        return [
            "全局 Agent 群聊记忆上下文（用户要求忽略记忆）：",
            "- 记忆使用：本轮不要读取、引用、比较或应用任何群聊历史记忆、typed MEMORY.md 或压缩摘要。",
            "- 上下文边界：只使用用户当前消息、实时工具观察和本轮显式输入。",
            bundle.query ? `- 当前查询：${bundle.query}` : "",
        ].filter(Boolean).join("\n");
    }
    const lines = [
        "全局 Agent 群聊记忆上下文（多群聊预算受控摘要）：",
        `- 选择群聊：${bundle.selected_group_count || 0}/${bundle.total_group_count || 0}`,
        "- 记忆边界：全局 Agent 在派发群聊或项目子 Agent 前必须先参考相关群聊记忆；第三方子 Agent 每次都可能是新会话，后续仍要把群聊记忆包随任务下发。",
        "- 使用策略：这里只放压缩摘要、typed MEMORY.md 召回、质量/边界和原始路径线索；涉及文件/函数/flag 的长期记忆必须按当前仓库重新核验。",
    ];
    if (bundle.query)
        lines.push(`- 当前查询：${bundle.query}`);
    const providerReliability = bundle.provider_reliability_guidance || bundle.providerReliabilityGuidance || null;
    if (providerReliability?.schema) {
        const snapshot = bundle.provider_reliability_snapshot || bundle.providerReliabilitySnapshot || {};
        lines.push(`- provider reliability snapshot：status=${snapshot.status || "missing"}；snapshot=${snapshot.snapshot_id || "none"}；generation=${snapshot.generation_id || "none"}；expires=${snapshot.expires_at || "unknown"}；checksum=${snapshot.snapshot_checksum || "missing"}。`);
        lines.push(`- 全局 provider reliability（脱敏聚合）：signals=${providerReliability.signal_count || 0}；actionable=${providerReliability.actionable_signal_count || 0}；highRisk=${providerReliability.high_risk_signal_count || 0}；guidanceOnly=${providerReliability.guidance_only === true}；localPolicyOverrideAllowed=${providerReliability.local_policy_override_allowed === true}。`);
        for (const signal of (providerReliability.signals || []).filter((item) => item.actionable).slice(0, 6)) {
            lines.push(`  - provider=${signal.agent_type || "unknown"}；risk=${signal.risk_status || "empty"}；score=${signal.risk_score || 0}；confidence=${signal.confidence || 0}；sourceGroups=${signal.source_group_count || 0}；recommendation=${signal.recommendation || "observe"}。`);
        }
        lines.push("  - 隐私/权限边界：不包含群 ID、项目名、记忆路径或回执证据；只能提示 sampling/provider preference，不能覆盖任一群聊的 local-first gate。 ");
    }
    const addList = (title, items, mapper, limit = 5) => {
        const list = (items || []).filter(Boolean).slice(-limit);
        if (!list.length)
            return;
        lines.push(`  - ${title}：`);
        for (const item of list)
            lines.push(`    - ${mapper(item)}`);
    };
    for (const item of bundle.groups || []) {
        const state = item.memory_state || {};
        const compaction = item.compaction || {};
        const typed = item.typed_memory || {};
        const quality = typed.distillation_quality || {};
        const sourceManifest = item.source_manifest || {};
        const reloadAudit = item.memory_reload_audit || {};
        const compactRefs = item.compact_file_references || item.compactFileReferences || {};
        const compactReadPlan = item.compact_file_reference_read_plan || item.compactFileReferenceReadPlan || {};
        const compactReadPlanAccess = item.compact_file_reference_read_plan_access || item.compactFileReferenceReadPlanAccess || {};
        const compactReadPlanFreshness = item.compact_file_reference_read_plan_freshness || item.compactFileReferenceReadPlanFreshness || {};
        const compactReadPlanRevalidationGate = item.compact_file_reference_read_plan_revalidation_gate || item.compactFileReferenceReadPlanRevalidationGate || {};
        const compactRefAccess = item.compact_file_reference_access || item.compactFileReferenceAccess || {};
        lines.push(`- 群聊 ${item.group_name || item.group_id}（${item.group_id}，score ${item.score || 0}）：`);
        if (item.members?.length)
            lines.push(`  - 成员：${item.members.map((member) => `${member.project || "unknown"}${member.agent ? `/${member.agent}` : ""}`).join("、")}`);
        lines.push(`  - 目标/阶段：${state.goal || "未记录"} / ${state.current_phase || "idle"}`);
        lines.push(`  - 消息窗口：${item.message_window?.total_messages || 0} 条；最近 ${item.message_window?.latest_message_at || "unknown"}`);
        lines.push(`  - 压缩：health=${compaction.health || "unknown"}，已压缩 ${compaction.compacted_message_count || 0}，保留近期 ${compaction.preserved_recent_messages || 0}，quality=${compaction.quality_score || 0}/${compaction.quality_status || "unknown"}`);
        if (compaction.last_compacted_message_id)
            lines.push(`  - 压缩边界：最近至 message id ${compaction.last_compacted_message_id}`);
        if (compaction.session_memory?.schema)
            lines.push(`  - CC 风格 Session Memory：summary=${compaction.session_memory.summaryFile || "未记录"}；checksum=${compaction.session_memory.markdownChecksum || "unknown"}；last=${compaction.session_memory.lastSummarizedMessageId || "recent-window"}`);
        if (compaction.session_memory_compact_selection?.schema) {
            const selection = compaction.session_memory_compact_selection;
            const closure = selection.api_invariant_closure || {};
            lines.push(`  - Session Memory compact selection：status=${selection.status || "unknown"}；cursor=${selection.cursor_status || "unknown"}/${selection.cursor_mode || "legacy"}；kept=${selection.preserved_message_count || 0}/${selection.preserved_token_estimate || 0} tokens；API closure=${closure.pass === true ? `pass(+${closure.expanded_message_count || 0})` : closure.schema ? "fail" : "unknown"}；API called=${selection.compaction_api_called === true}${selection.fallback_reason ? `；fallback=${selection.fallback_reason}` : ""}。`);
            const projection = selection.compact_projection || {};
            if (projection.schema)
                lines.push(`  - Session Memory compact 投影：${projection.original_token_estimate || 0} -> ${projection.projected_token_estimate || 0} tokens；截断 ${projection.truncated_section_count || 0}/${projection.section_count || 0} 节；预算 section=${projection.max_section_tokens || 0}/total=${projection.max_total_tokens || 0}；完整原文=${projection.summary_file || "unknown"}；原始文件保持不变。`);
        }
        if (compaction.post_compact_session_state_reset?.schema) {
            const reset = compaction.post_compact_session_state_reset;
            const verification = (0, group_memory_compaction_1.verifyGroupPostCompactSessionStateResetReceipt)(reset, {
                groupId: item.group_id,
                groupSessionId: reset.group_session_id,
                boundaryId: reset.boundary_id,
                summaryChecksum: reset.summary_checksum
            });
            lines.push(`  - Post-compact session reset：${verification.valid ? "verified" : "fail_closed"}；path=${reset.compact_path || "unknown"}；generation=${reset.post_compact_mark?.generation || 0}；provider cursor=${reset.provider_active_cursor?.status || "unknown"}；cache baseline=${reset.cache_read_baseline?.status || "unknown"}；failures=${reset.auto_compact_failure_state?.consecutive_failures ?? "unknown"}。`);
        }
        if (compaction.tool_continuity?.schema) {
            const continuity = compaction.tool_continuity || {};
            const allowed = continuity.allowedTools || {};
            const missing = continuity.missing || {};
            lines.push(`  - CC 风格工具/技能连续性：allowed MCP ${(allowed.mcp || []).length}/Skill ${(allowed.skill || []).length}，invokedSkill ${(continuity.invokedSkills || []).length}，missing MCP ${(missing.mcp || []).length}/Skill ${(missing.skill || []).length}；只恢复上下文，不扩大授权，后续派发仍以当前 runtime tool gate 为准。`);
        }
        if (compaction.preserved_segment?.schema)
            lines.push(`  - preservedSegment：保留 ${compaction.preserved_segment.preservedMessageCount || 0} 条 / 约 ${compaction.preserved_segment.preservedTokenEstimate || 0} tokens；首尾 ${compaction.preserved_segment.firstPreservedMessageId || "unknown"} -> ${compaction.preserved_segment.lastPreservedMessageId || "unknown"}`);
        if (compaction.context_pressure_warning?.schema)
            lines.push(`  - context pressure：${compaction.context_pressure_warning.level || "unknown"}，使用 ${compaction.context_pressure_warning.tokenUsage || 0} tokens，剩余 ${compaction.context_pressure_warning.percentLeft ?? "unknown"}%，建议 ${compaction.context_pressure_warning.recommendation || "continue"}${compaction.context_pressure_warning.suppressed ? "（压缩后暂时抑制预警）" : ""}`);
        if (sourceManifest.schema)
            lines.push(`  - source manifest：${sourceManifest.status || "unknown"}，源 ${sourceManifest.entryCount || 0} 个，typed docs ${sourceManifest.typedDocCount || 0}，manifest ${sourceManifest.manifestChecksum || ""}${sourceManifest.missingRequired?.length ? `，缺失 ${sourceManifest.missingRequired.join("、")}` : ""}`);
        if (compactRefs.schema)
            lines.push(`  - compact file references：${compactRefs.referenceCount || 0} 个，missing ${compactRefs.missingCount || 0}；raw messages / typed MEMORY.md / session summary 是压缩后恢复的可读来源。`);
        if (compactReadPlan.schema) {
            lines.push(`  - compact file reference read plan：planned=${compactReadPlan.plannedCount || 0}/${compactReadPlan.sourceReferenceCount || 0}，sourceOfTruth=${compactReadPlan.hasSourceOfTruth === true}，summary=${compactReadPlan.hasCompactSummary === true}；只在派发/核验需要时按优先级读取。`);
            for (const entry of Array.isArray(compactReadPlan.entries) ? compactReadPlan.entries.slice(0, 3) : []) {
                lines.push(`    - ${entry.read_plan_id || ""}：${entry.action || "read_if_needed"}；${entry.type || "memory_source"}；${entry.displayPath || entry.path || ""}`);
            }
        }
        if (compactReadPlanAccess.schema)
            lines.push(`  - compact read plan access：surfaced=${compactReadPlanAccess.ledger_entry_count || 0} mentioned=${compactReadPlanAccess.mentioned_count || 0}/${compactReadPlanAccess.read_plan_entry_count || 0} read_plan_id=${compactReadPlanAccess.read_plan_id_mentioned_count || 0}/${compactReadPlanAccess.read_plan_entry_count || 0}`);
        if (compactReadPlanFreshness.schema)
            lines.push(`  - compact read plan freshness：${compactReadPlanFreshness.status || "unknown"}，fresh=${compactReadPlanFreshness.freshCount || 0}/${compactReadPlanFreshness.checked || 0}，changed=${compactReadPlanFreshness.changedCount || 0}，unverifiable=${compactReadPlanFreshness.unverifiableCount || 0}`);
        if (compactReadPlanRevalidationGate.schema && (Number(compactReadPlanRevalidationGate.required_count || 0) > 0 || Number(compactReadPlanRevalidationGate.verification_count || 0) > 0)) {
            lines.push(`  - compact read plan revalidation gate：gate=${compactReadPlanRevalidationGate.revalidation_gate_id || ""}，status=${compactReadPlanRevalidationGate.status || "unknown"}，required=${compactReadPlanRevalidationGate.required_count || 0}，verify=${compactReadPlanRevalidationGate.verification_count || 0}；派发子 Agent 前必须要求 stale read_plan_id 先 re-read/current source verified。`);
        }
        if (compactRefAccess.schema)
            lines.push(`  - compact file reference access：surfaced=${compactRefAccess.ledger_entry_count || 0} mentioned=${compactRefAccess.mentioned_count || 0}/${compactRefAccess.reference_count || 0}`);
        if (reloadAudit.schema)
            lines.push(`  - memory reload audit：reason=${reloadAudit.reason || "unknown"}，action=${reloadAudit.cacheAction || "unknown"}，sourceChanged=${reloadAudit.sourceManifestChanged === true}，scope=${reloadAudit.scope || "default"}`);
        if (reloadAudit.sourceChangeTrigger?.triggered)
            lines.push(`  - memory source change trigger：changed=${reloadAudit.sourceChangeTrigger.changedCount || 0} added=${reloadAudit.sourceChangeTrigger.addedCount || 0} removed=${reloadAudit.sourceChangeTrigger.removedCount || 0}`);
        if (compaction.post_compact_recovery_audit?.schema)
            lines.push(`  - post-compact recovery audit：${compaction.post_compact_recovery_audit.status || "unknown"}，通过 ${compaction.post_compact_recovery_audit.passedChecks || 0}/${compaction.post_compact_recovery_audit.checkCount || 0}，动作 ${compaction.post_compact_recovery_audit.action || "unknown"}`);
        if (Array.isArray(compaction.partial_segments) && compaction.partial_segments.length)
            lines.push(`  - partial compact sidecar：${compaction.partial_segments.length} 个近期摘要段，不推进主边界。`);
        if (compaction.ptl_emergency?.engaged)
            lines.push(`  - PTL emergency：${compaction.ptl_emergency.emergencyLevel || "unknown"}，原因 ${compaction.ptl_emergency.reason || "unknown"}`);
        if (compaction.ptl_recovery?.recovered)
            lines.push(`  - PTL recovery：已恢复普通摘要预算，原因 ${compaction.ptl_recovery.reason || "unknown"}`);
        if (typed.sync?.index_file)
            lines.push(`  - typed MEMORY.md：${typed.sync.docs || 0} docs，入口 ${typed.sync.index_file}`);
        if (typed.global_claude_memory_import?.schema && Number(typed.global_claude_memory_import.importedCount || 0) > 0) {
            const includeAudit = typed.global_claude_memory_import.includeAudit || {};
            const settingPolicy = typed.global_claude_memory_import.settingSourcePolicy || {};
            lines.push(`  - global Claude memory import：导入 ${typed.global_claude_memory_import.importedCount || 0} 个 user/managed Claude typed docs${includeAudit.schema ? `，include ${includeAudit.importedIncludeCount || includeAudit.includedCount || 0}/${includeAudit.skippedCount || 0}` : ""}${settingPolicy.schema ? `，sources=${(settingPolicy.enabled || []).join(",")}${settingPolicy.isolationMode ? "/isolation" : ""}` : ""}。`);
            if (includeAudit.externalIncludeApproval?.pendingCount)
                lines.push(`  - global Claude external include approval：pending=${includeAudit.externalIncludeApproval.pendingCount} ledger=${includeAudit.externalIncludeApproval.ledgerFile || ""}`);
            if (typed.global_claude_memory_import.instructionsLoadedHooks?.schema)
                lines.push(`  - global Claude InstructionsLoaded hooks：events=${typed.global_claude_memory_import.instructionsLoadedHooks.eventCount || 0} fired=${typed.global_claude_memory_import.instructionsLoadedHooks.firedCount || 0} failed=${typed.global_claude_memory_import.instructionsLoadedHooks.failureCount || 0}`);
        }
        if (Array.isArray(typed.project_memory_imports) && typed.project_memory_imports.length) {
            const importedCount = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.importedCount || 0), 0);
            const includeImported = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.includeAudit?.importedIncludeCount || item.includeAudit?.includedCount || 0), 0);
            const includeSkipped = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.includeAudit?.skippedCount || 0), 0);
            const externalPending = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.includeAudit?.externalIncludeApproval?.pendingCount || 0), 0);
            const firstPolicy = typed.project_memory_imports.find((item) => item.settingSourcePolicy?.schema)?.settingSourcePolicy || {};
            const hookEvents = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.instructionsLoadedHooks?.eventCount || 0), 0);
            const hookFired = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.instructionsLoadedHooks?.firedCount || 0), 0);
            const hookFailed = typed.project_memory_imports.reduce((sum, item) => sum + Number(item.instructionsLoadedHooks?.failureCount || 0), 0);
            lines.push(`  - project memory import：${typed.project_memory_imports.length} 个项目根，导入 ${importedCount} 个 Claude/规则 typed docs${includeImported || includeSkipped ? `，include ${includeImported}/${includeSkipped}` : ""}${firstPolicy.schema ? `，sources=${(firstPolicy.enabled || []).join(",")}${firstPolicy.isolationMode ? "/isolation" : ""}` : ""}。`);
            if (externalPending)
                lines.push(`  - project Claude external include approval：pending=${externalPending}`);
            if (hookEvents)
                lines.push(`  - project Claude InstructionsLoaded hooks：events=${hookEvents} fired=${hookFired} failed=${hookFailed}`);
        }
        const loadPlanText = (0, group_memory_shared_1.compactPreserveLines)((0, group_memory_index_1.renderGroupTypedMemoryLoadPlan)(typed.load_plan), 1400);
        if (loadPlanText)
            lines.push(`  - ${loadPlanText.replace(/\n/g, "\n  ")}`);
        if (quality.schema)
            lines.push(`  - 蒸馏质量：${quality.score ?? "未评分"}/${quality.status || "unknown"}；stale path ${quality.stalePathCount || 0}，矛盾 ${quality.contradictionCount || 0}`);
        const recallText = (0, group_memory_shared_1.compactPreserveLines)((0, group_memory_index_1.renderGroupTypedMemoryRecall)(typed.recall), 2200);
        if (recallText)
            lines.push(`  - ${recallText.replace(/\n/g, "\n  ")}`);
        if (state.summary)
            lines.push(`  - 群聊摘要：\n${(0, group_memory_shared_1.compactPreserveLines)(state.summary, 1800).replace(/^/gm, "    ")}`);
        addList("持久用户要求", state.persistent_requirements || [], (entry) => `#${entry.messageId || ""} ${entry.text || entry}`, 4);
        addList("关键事实锚点", state.fact_anchors || [], (entry) => `#${entry.messageId || ""} ${entry.text || entry}`, 4);
        addList("关键决策", state.decisions || [], (entry) => `${entry.decision || entry}${entry.reason ? `（${entry.reason}）` : ""}`, 4);
        addList("已完成", state.completed || [], (entry) => `${entry.project || "unknown"}：${entry.summary || ""}`, 4);
        addList("阻塞", state.blocked || [], (entry) => `${entry.project || "unknown"}：${entry.reason || ""}`, 4);
        addList("下一步", state.next_actions || [], (entry) => String(entry.action || entry), 4);
        lines.push(`  - 原始来源：memory=${item.raw_sources?.group_memory_file || ""}；messages=${item.raw_sources?.group_messages_file || ""}；typed=${item.raw_sources?.group_typed_memory_dir || ""}`);
    }
    return lines.join("\n");
}
//# sourceMappingURL=group-memory-context-part-04-part-02.js.map