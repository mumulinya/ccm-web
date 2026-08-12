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
exports.createGlobalAgentAgenticRuntime = createGlobalAgentAgenticRuntime;
const crypto = __importStar(require("crypto"));
const global_agent_run_projection_1 = require("../../agents/global/global-agent-run-projection");
const session_compaction_core_1 = require("../../system/session-compaction-core");
const group_compaction_strategy_1 = require("../collaboration/group-compaction-strategy");
const source_ingestion_1 = require("../requirements/source-ingestion");
const knowledge_access_1 = require("../knowledge/knowledge-access");
const project_runtime_1 = require("../projects/project-runtime");
const main_agent_turn_1 = require("../../agents/main-agent-turn");
const global_agent_tool_authorization_1 = require("./global-agent-tool-authorization");
const main_agent_tool_runtime_1 = require("../../tools/main-agent-tool-runtime");
const workspace_read_context_1 = require("../../tools/workspace-read-context");
const cc_tool_result_limits_1 = require("../../tools/cc-tool-result-limits");
const workspace_readonly_tools_1 = require("../../tools/workspace-readonly-tools");
const global_agent_run_store_1 = require("../../agents/global/global-agent-run-store");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const global_agent_authorization_1 = require("../../agents/global/global-agent-authorization");
const shared_files_v2_1 = require("../tools/shared-files-v2");
const main_agent_context_source_continuity_1 = require("../../system/main-agent-context-source-continuity");
const context_source_tool_result_projection_1 = require("../../system/context-source-tool-result-projection");
const slash_command_session_state_1 = require("../../system/slash-command-session-state");
const transient_model_content_1 = require("../../system/transient-model-content");
// Global-only context, tool execution, mission supervision, and agentic loop lifecycle.
function createGlobalAgentAgenticRuntime(deps) {
    const { hasExplicitGlobalWriteAuthorization, GLOBAL_AGENT_TOOL_SPECS, GLOBAL_MANAGEMENT_ACTIONS, GLOBAL_PET_AGENT_NAME, acquireIdempotency, annotateGlobalAction, applyGlobalAgentSupervisionSteer, attachGlobalAgentRunSupervision, bindFeishuIdentifiersFromValue, bindFeishuTaskContext, buildGlobalAgentMemoryPacket, buildGlobalAgentSessionContinuation, buildGlobalSingleProjectMissionPayload, callGlobalModelWithRetry, compactGlobalAgentSessionWithModel, compactPetText, completeGlobalAgentSupervision, completeIdempotency, continueGlobalAgentRunWithClarification, controlGlobalDevelopmentMission, controlGlobalMissionSupervisor, createGlobalDevelopmentMission, createRequirementEpicWithChildren, executeFeishuAction, executePlayMusic, executeStopMusic, failIdempotency, findClarifyingGlobalAgentRun, formatGlobalMissionFinalReport, getAgentQualityPolicy, getConfigInfo, getConfigs, getGlobalAgentBackgroundOutput, getGlobalAgentMemoryPolicy, getGlobalAgentRun, getGlobalDevelopmentMission, getGlobalMissionSupervisor, getGlobalMissionSupervisorSchedulerStatus, globalRunVisibleReply, hasExplicitDevelopmentExecutionIntent, inferLocalGlobalAction, ingestGlobalAgentConversation, listGlobalAgentRuns, listGlobalMissionSupervisors, listTaskAgentSessions, loadCronJobs, loadGlobalAgentHistoryStore, loadGlobalAgentHooks, loadGlobalAgentMemory, loadGlobalAgentPermissionRules, loadGroups, loadMcpTools, loadOrchestratorConfig, loadSkills, loadTasks, normalizeText, notifyFeishuTaskStage, postLocalApi, queryKnowledgeBase, recallGlobalAgentMemory, rebuildGlobalAgentMemory, recordGlobalAgentRuntimeOutput, recordGlobalAgentSessionProviderUsage, recordGlobalMissionMemory, recoverInterruptedGlobalAgentRuns, refreshGlobalDevelopmentMissions, renderGlobalGroupMemoryContextBundle, resumeGlobalAgentRun, sanitizeGlobalDirectAgentOutput, setGlobalAgentMemoryPolicy, settleIdempotencyByTrace, startGlobalAgentRun, startGlobalMissionSupervisor, startGlobalMissionSupervisorScheduler, stopGlobalMissionSupervisorScheduler, superviseGlobalDevelopmentMissionCycle, updateGlobalAgentSupervisionState, waitForIdempotencyResult } = deps;
    const globalWorkspaceReadContexts = new Map();
    function workspaceReadContextForRun(run) {
        const generation = Math.max(0, Number(run.generation ?? run.resume_count ?? 0));
        const boundaryGeneration = Math.max(0, Number(buildGlobalAgentSessionContinuation(String(run.session_id || ""))?.boundaryGeneration || 0));
        const key = `${String(run.id || "")}\0${String(run.session_id || "")}\0${generation}\0${boundaryGeneration}`;
        let ledger = globalWorkspaceReadContexts.get(key);
        if (!ledger) {
            ledger = (0, workspace_read_context_1.createWorkspaceReadContextLedger)({
                scope: "global", scopeId: "global", exactSessionId: String(run.session_id || run.id || "global"), generation,
            });
            globalWorkspaceReadContexts.set(key, ledger);
            while (globalWorkspaceReadContexts.size > 100) {
                const oldest = globalWorkspaceReadContexts.keys().next().value;
                if (oldest === undefined)
                    break;
                globalWorkspaceReadContexts.delete(oldest);
            }
        }
        return ledger;
    }
    function safeProjectRows() {
        return getConfigs().map((config) => {
            const info = getConfigInfo(config.path)?.[0] || {};
            return {
                name: config.name,
                display_name: (0, project_runtime_1.projectDisplayName)(config.name),
                work_dir: info.workDir || "",
                agent: info.agent || "claudecode",
                platform: info.platform || "",
            };
        });
    }
    function compactTask(task) {
        return {
            id: task.id,
            title: task.title,
            status: task.status,
            status_detail: task.status_detail,
            group_id: task.group_id,
            target_project: task.target_project,
            updated_at: task.updated_at || task.completed_at || task.created_at,
            trace_id: task.trace_id,
        };
    }
    function isGlobalAgentOwnedTask(task) {
        const source = String(task?.source || task?.created_by || task?.createdBy || "").toLowerCase();
        return !!String(task?.global_mission_id || task?.globalMissionId || task?.global_run_id || task?.globalRunId || task?.parent_run_id || task?.parentRunId || "").trim()
            || source.includes("global-agent")
            || source.includes("global_agent");
    }
    const GLOBAL_AGENT_CONTEXT_ALLOWED_KEYS = new Set([
        "projects",
        "groups",
        "task_summary",
        "cron_jobs",
        "tools",
        "global_memory",
        "global_knowledge",
        "global_shared_files",
        "context_source_catalog",
        "session_continuity",
        "memory_context_boundary",
        "context_source_manifest",
        "context_boundary_proof",
        // Routing-only target hints are part of the global context contract. They
        // contain names and scoped ids only; the boundary validator must allow the
        // same projection that buildAgenticContext emits.
        "requested_dispatch_targets",
    ]);
    function globalAgentContextProofPayload(context = {}) {
        const payload = { ...(context || {}) };
        delete payload.context_boundary_proof;
        return payload;
    }
    function verifyGlobalAgentContextBoundary(context = {}) {
        const issues = [];
        for (const key of Object.keys(context || {}))
            if (!GLOBAL_AGENT_CONTEXT_ALLOWED_KEYS.has(key))
                issues.push(`global_context_source_not_allowed:${key}`);
        if (context?.memory_context_boundary?.group_session_context_included !== false)
            issues.push("global_context_group_session_boundary_missing");
        if (context?.memory_context_boundary?.project_memory_included !== false)
            issues.push("global_context_project_memory_boundary_missing");
        if (context?.memory_context_boundary?.group_memory_included !== false)
            issues.push("global_context_group_memory_boundary_missing");
        for (const group of Array.isArray(context?.groups) ? context.groups : []) {
            for (const key of Object.keys(group || {}))
                if (!new Set(["id", "name", "members"]).has(key))
                    issues.push(`global_context_group_directory_field_not_allowed:${key}`);
            if (group?.group_session_id || group?.groupSessionId || group?.messages || group?.memory)
                issues.push("global_context_group_session_payload_present");
            for (const member of Array.isArray(group?.members) ? group.members : []) {
                for (const key of Object.keys(member || {}))
                    if (!new Set(["project", "agent"]).has(key))
                        issues.push(`global_context_group_member_field_not_allowed:${key}`);
            }
        }
        for (const project of Array.isArray(context?.projects) ? context.projects : []) {
            for (const key of Object.keys(project || {}))
                if (!new Set(["name", "display_name", "work_dir", "agent", "platform"]).has(key))
                    issues.push(`global_context_project_directory_field_not_allowed:${key}`);
        }
        if (context?.task_summary?.policy !== "global_agent_owned_tasks_only")
            issues.push("global_context_task_boundary_missing");
        for (const task of Array.isArray(context?.task_summary?.recent) ? context.task_summary.recent : []) {
            for (const key of Object.keys(task || {}))
                if (!new Set(["id", "title", "status", "status_detail", "group_id", "target_project", "updated_at", "trace_id"]).has(key))
                    issues.push(`global_context_task_field_not_allowed:${key}`);
            if (task?.group_session_id || task?.groupSessionId || task?.description || task?.content || task?.memory)
                issues.push("global_context_group_task_payload_present");
        }
        const manifestEntries = Array.isArray(context?.context_source_manifest?.entries) ? context.context_source_manifest.entries : [];
        const expectedSources = ["global_agent_memory", "global_agent_session", "global_knowledge", "global_shared_files", "routing_directory", "global_task_state", "runtime_capability_directory"];
        if (expectedSources.some(source => !manifestEntries.some((entry) => entry.source === source && entry.allowed === true)))
            issues.push("global_context_source_manifest_incomplete");
        if (manifestEntries.some((entry) => !expectedSources.includes(String(entry?.source || ""))))
            issues.push("global_context_source_manifest_unknown_source");
        if (manifestEntries.some((entry) => entry.allowed !== true))
            issues.push("global_context_source_manifest_contains_unapproved_source");
        const proof = context?.context_boundary_proof || {};
        if (proof.schema !== "ccm-global-agent-context-boundary-proof-v1")
            issues.push("global_context_boundary_proof_schema_invalid");
        const expectedChecksum = crypto.createHash("sha256").update(JSON.stringify(globalAgentContextProofPayload(context))).digest("hex");
        if (String(proof.context_checksum || "") !== expectedChecksum)
            issues.push("global_context_boundary_checksum_invalid");
        if (/\bgcs_[a-z0-9_-]+\b/i.test(JSON.stringify(context || {})))
            issues.push("global_context_group_session_identifier_present");
        return { schema: "ccm-global-agent-context-boundary-validation-v1", valid: issues.length === 0, issues, expectedChecksum };
    }
    function summarizeGlobalToolObservationForUser(observation, fallback = "操作已返回结果。") {
        if (!observation)
            return fallback;
        if (observation.success === false || observation.error) {
            return sanitizeGlobalDirectAgentOutput(observation.error || observation.summary || observation.message, "操作未完成；错误详情已放入技术详情。", 700);
        }
        const explicit = sanitizeGlobalDirectAgentOutput(observation.summary || observation.message || observation.reply || "", "", 700);
        if (explicit)
            return explicit;
        const count = observation.jobs?.length
            ?? observation.tasks?.length
            ?? observation.projects?.length
            ?? observation.groups?.length
            ?? observation.missions?.length
            ?? observation.children?.length;
        if (count !== undefined)
            return `操作已返回结果，共 ${count} 条；详细记录已放入技术详情。`;
        if (observation.accepted === true && observation.completed === false)
            return "任务已受理并进入持续跟进；这不代表最终完成，完成后会再给出交付总结。";
        if (observation.client_effect)
            return "操作已返回结果，界面会同步执行对应动作。";
        return "操作已返回结果；详细记录已放入技术详情。";
    }
    function buildGlobalAgentGroupMemoryModelContext(bundle, options = {}) {
        const maxChars = Math.max(4_000, Math.min(24_000, Number(options.maxChars || options.max_chars || 12_000)));
        const sourceText = typeof bundle === "string"
            ? bundle
            : String(bundle?.rendered_text || renderGlobalGroupMemoryContextBundle(bundle) || "");
        const truncated = sourceText.length > maxChars;
        const renderedText = truncated
            ? `${sourceText.slice(0, Math.max(0, maxChars - 56)).trimEnd()}\n[群聊记忆摘要已按模型上下文预算截断]`
            : sourceText;
        const selectedGroups = Array.isArray(bundle?.groups)
            ? bundle.groups.slice(0, 12).map((group) => ({
                group_id: String(group?.group_id || ""),
                group_name: String(group?.group_name || ""),
                score: Number(group?.score || 0),
            }))
            : [];
        const sourceBytes = typeof bundle === "string" ? Buffer.byteLength(bundle) : Buffer.byteLength(JSON.stringify(bundle || {}));
        return {
            schema: "ccm-global-group-memory-model-context-v1",
            source_schema: typeof bundle === "object" ? String(bundle?.schema || "") : "text",
            generated_at: typeof bundle === "object" ? String(bundle?.generated_at || "") : "",
            query: typeof bundle === "object" ? String(bundle?.query || "") : "",
            total_group_count: Number(bundle?.total_group_count || 0),
            selected_group_count: Number(bundle?.selected_group_count || selectedGroups.length),
            selected_groups: selectedGroups,
            memory_policy: bundle?.memory_policy || null,
            rendered_text: renderedText,
            context_budget: {
                max_chars: maxChars,
                used_chars: renderedText.length,
                approximate_tokens: Math.ceil(renderedText.length / 3),
                source_bytes: sourceBytes,
                truncated,
                full_context_available_via: "query_group_memory technical endpoint",
            },
        };
    }
    function buildAgenticContext(query = "", sessionId = "", options = {}) {
        const lazyResources = options.lazyResources === true || options.lazy_resources === true;
        const tasks = loadTasks();
        const groups = Array.isArray(options.groups) ? options.groups : loadGroups();
        const globalTasks = tasks.filter(isGlobalAgentOwnedTask);
        const authorizedTools = (0, global_agent_tool_authorization_1.buildGlobalAgentToolRuntimeContext)({
            taskId: String(options.runId || options.run_id || ""),
            executionId: String(options.executionId || options.execution_id || ""),
            sessionId,
            source: String(options.source || "global-agent-context"),
        }, Array.isArray(options.loadedToolNames || options.loaded_tool_names) ? (options.loadedToolNames || options.loaded_tool_names) : []);
        (0, shared_files_v2_1.migrateLegacyGlobalSharedDirectoryV2)();
        const globalContextPolicy = authorizedTools.context_policy.effective;
        const globalContextWindow = Number(authorizedTools.context_budget?.contextWindow || (0, group_compaction_strategy_1.resolveGroupModelContextCapacity)(loadOrchestratorConfig()).effectiveContextWindow || 200_000);
        const globalSourceBudget = (0, main_agent_context_source_continuity_1.calculateContextSourceBudget)({ contextWindow: globalContextWindow, catalogPercent: globalContextPolicy.contextSourceCatalogBudgetPercent, hydrationPercent: globalContextPolicy.contextSourceHydrationBudgetPercent, remainingSafeTokens: authorizedTools.context_budget?.finalSafetyRemainingTokens });
        const globalSharedFiles = (0, shared_files_v2_1.buildSharedFilesContextV2)("global", "global", {
            contextWindow: globalContextWindow,
            hydrationBudgetPercent: globalContextPolicy.contextSourceHydrationBudgetPercent,
            remainingSafeTokens: globalSourceBudget.hydrationTargetTokens,
            explicitText: query,
            title: "以下是全局 Agent 已授权共享文件。使用其中事实时必须引用文件和分片：",
        });
        const sourceIdentity = sessionId ? { agentKind: "global", scope: "global", scopeId: "global-agent", exactSessionId: sessionId, generation: Number(authorizedTools.scope_identity?.generation || 0) } : null;
        const globalSourceCatalog = (0, main_agent_context_source_continuity_1.buildContextSourceCatalog)({
            sources: (0, main_agent_context_source_continuity_1.listContextSourceCatalogEntries)({ sharedScope: "global", sharedScopeId: "global", knowledgeContext: { role: "global-agent" } }),
            maxTokens: globalSourceBudget.catalogTargetTokens,
            explicitText: query,
            recentReceipts: sourceIdentity ? (0, main_agent_context_source_continuity_1.readContextSourceContinuity)(sourceIdentity).receipts : [],
        });
        if (sourceIdentity && !lazyResources) {
            (0, main_agent_context_source_continuity_1.recordContextSourceCatalog)(sourceIdentity, globalSourceCatalog, globalSourceBudget);
            (0, main_agent_context_source_continuity_1.recordSharedFileProjection)(sourceIdentity, globalSharedFiles, { ...globalSourceBudget, catalogUsedTokens: globalSourceCatalog.usedTokens, sharedFileTokens: globalSharedFiles.total_tokens, hydrationUsedTokens: globalSharedFiles.total_tokens });
        }
        const restoredSources = sourceIdentity && Number(authorizedTools.scope_identity?.generation || 0) > 0 && !lazyResources
            ? (0, main_agent_context_source_continuity_1.restoreContextSources)({
                identity: { ...sourceIdentity, generation: Number(authorizedTools.scope_identity?.generation || 0) },
                knowledgeContext: { role: "global-agent" },
                explicitText: query,
                maxPerItemTokens: globalContextPolicy.postCompactSourcePerItemMaxTokens,
                maxTotalTokens: globalContextPolicy.postCompactSourceTotalMaxTokens,
                hydrationTargetTokens: globalSourceBudget.hydrationTargetTokens,
                remainingSafeTokens: globalSourceBudget.remainingSafeTokens,
            }).context
            : "";
        const context = {
            projects: safeProjectRows(),
            groups: groups.map((group) => ({ id: group.id, name: group.name, members: (group.members || []).map((member) => ({ project: member.project, agent: member.agent })) })),
            requested_dispatch_targets: {
                schema: "ccm-global-requested-dispatch-targets-v1",
                targets: (Array.isArray(options.requestedTargetRefs || options.requested_target_refs) ? (options.requestedTargetRefs || options.requested_target_refs) : [])
                    .map((target) => ({ scope: target.scope, scope_id: target.scopeId || target.scope_id, name: target.displayName || target.canonicalName || target.name }))
                    .filter((target) => target.scope && target.scope_id),
                policy: "only_these_targets_may_receive_tasks",
            },
            task_summary: {
                total: globalTasks.length,
                active: globalTasks.filter((task) => ["pending", "queued", "in_progress", "running"].includes(String(task.status))).length,
                recent: globalTasks.slice(-12).map(compactTask),
                policy: "global_agent_owned_tasks_only",
            },
            cron_jobs: loadCronJobs().map((job) => ({ id: job.id, name: job.name, schedule: job.schedule, enabled: job.enabled !== false, target_type: job.target_type, group_id: job.group_id, project: job.project })),
            tools: {
                schema: authorizedTools.schema,
                authorization_checksum: authorizedTools.checksum,
                authorization_readiness: authorizedTools.authorization_readiness,
                connection_preflight: authorizedTools.connection_preflight,
                configured_counts: authorizedTools.configured_counts,
                available_counts: authorizedTools.counts,
                workspace: authorizedTools.catalog.tools
                    .filter((tool) => tool.server === "ccm__workspace_readonly")
                    .map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                    input_schema: tool.inputSchema,
                    annotations: tool.annotations,
                })),
                mcp: authorizedTools.catalog.tools
                    .filter((tool) => tool.server !== "ccm__workspace_readonly")
                    .map((tool) => ({
                    name: tool.canonicalName,
                    server: tool.server,
                    description: tool.description,
                    input_schema: tool.inputSchema,
                    annotations: tool.annotations,
                })),
                deferred_workspace: authorizedTools.discoverable_tools
                    .filter((tool) => tool.server === "ccm__workspace_readonly")
                    .map((tool) => ({ name: tool.name })),
                deferred_mcp: authorizedTools.discoverable_tools
                    .filter((tool) => tool.server !== "ccm__workspace_readonly")
                    .map((tool) => ({ name: tool.canonicalName || tool.name })),
                loaded_tool_names: authorizedTools.loaded_tool_names,
                skills: authorizedTools.catalog.skills.map((skill) => ({
                    name: skill.name,
                    description: skill.description,
                    content_hash: skill.contentHash,
                })),
                policy: "global_scope_authorized_only",
            },
            global_memory: query && !lazyResources ? buildGlobalAgentMemoryPacket(query, {
                sessionId,
                limit: 7,
                recordMetric: options.recordMemoryMetric !== false && options.record_memory_metric !== false,
            }) : "",
            global_knowledge: options.knowledgeContext || options.knowledge_context || "",
            context_source_catalog: [globalSourceCatalog.context, restoredSources].filter(Boolean).join("\n\n"),
            global_shared_files: {
                context: lazyResources ? "" : globalSharedFiles.context,
                manifest_checksum: globalSharedFiles.checksum,
                complete: globalSharedFiles.complete,
                files: globalSharedFiles.files.map((file) => ({
                    id: file.id,
                    name: file.name,
                    checksum: file.checksum,
                    chunks: file.chunks?.length || 0,
                })),
            },
            session_continuity: sessionId && options.includeSessionContinuity !== false && options.include_session_continuity !== false
                ? buildGlobalAgentSessionContinuation(sessionId, { persistMicroCompactReceipt: true })
                : null,
            memory_context_boundary: {
                schema: "ccm-global-agent-memory-boundary-v1",
                policy: "global_memory_only_group_session_content_excluded",
                group_session_context_included: false,
                group_memory_included: false,
                project_memory_included: false,
                routing_directory_included: true,
                global_task_state_included: true,
            },
            context_source_manifest: {
                schema: "ccm-global-agent-context-source-manifest-v1",
                entries: [
                    { source: "global_agent_memory", allowed: true },
                    { source: "global_agent_session", allowed: true },
                    { source: "global_knowledge", allowed: true },
                    { source: "global_shared_files", allowed: true },
                    { source: "routing_directory", allowed: true },
                    { source: "global_task_state", allowed: true },
                    { source: "runtime_capability_directory", allowed: true },
                ],
            },
        };
        context.context_boundary_proof = {
            schema: "ccm-global-agent-context-boundary-proof-v1",
            context_checksum: crypto.createHash("sha256").update(JSON.stringify(globalAgentContextProofPayload(context))).digest("hex"),
            generated_at: new Date().toISOString(),
        };
        const validation = verifyGlobalAgentContextBoundary(context);
        if (!validation.valid)
            throw new Error(`global agent context boundary failed: ${validation.issues.join(", ")}`);
        return context;
    }
    function buildGlobalProviderPayloadSnapshot(messages, sessionId, run) {
        const systemMessages = messages.filter(message => message.role === "system");
        const systemText = systemMessages.map(message => String(message.content || "")).join("\n");
        const completeMessageText = messages.map(message => String(message.content || "")).join("\n");
        const skillSections = [];
        const catalogStart = systemText.indexOf("[CCM 可由模型选择的 Skill 目录]");
        if (catalogStart >= 0) {
            const catalogEnd = systemText.indexOf("\n\n只输出一个合法 JSON", catalogStart);
            skillSections.push(systemText.slice(catalogStart, catalogEnd > catalogStart ? catalogEnd : undefined));
        }
        const selectedSkillStart = systemText.indexOf("[CCM 本轮角色 Skill]");
        if (selectedSkillStart >= 0)
            skillSections.push(systemText.slice(selectedSkillStart));
        const authorizedTools = (0, global_agent_tool_authorization_1.buildGlobalAgentToolRuntimeContext)({ sessionId, taskId: String(run?.id || ""), source: "global-agent-provider-payload" }, (run?.loaded_tool_names || run?.loadedToolNames || []));
        const configuredSkills = authorizedTools.catalog.skills.map((skill) => ({ name: String(skill?.name || ""), contentHash: String(skill?.contentHash || "") })).filter((skill) => skill.name);
        const configuredMcpTools = authorizedTools.catalog.tools.map((tool) => ({ name: String(tool?.canonicalName || tool?.name || ""), server: String(tool?.server || "") })).filter((tool) => tool.name);
        const restoredSkillNames = new Set((authorizedTools.restored_skill_attachments || []).map((skill) => String(skill?.name || "")));
        const loadedSkills = authorizedTools.catalog.skills
            .map((skill) => ({
            kind: "skill",
            name: String(skill?.name || ""),
            aliases: [String(skill?.name || ""), `skill:${String(skill?.name || "")}`].filter(Boolean),
            loadLevel: restoredSkillNames.has(String(skill?.name || "")) ? "body" : "catalog",
            checksum: String(skill?.contentHash || ""),
            loadSource: restoredSkillNames.has(String(skill?.name || "")) ? "post_compact_restored" : "catalog",
            tokens: Number((authorizedTools.restored_skill_attachments || []).find((item) => item?.name === skill?.name)?.tokenCount || 0),
        }));
        const allSkillCatalog = new Map((Array.isArray(loadSkills()) ? loadSkills() : [])
            .map((skill) => [String(skill?.name || ""), skill]));
        for (const match of systemText.matchAll(/^## Skill:([^\r\n]+)/gm)) {
            const name = String(match[1] || "").trim();
            if (!name || loadedSkills.some((skill) => skill.name === name))
                continue;
            const skill = allSkillCatalog.get(name) || null;
            loadedSkills.push({
                kind: "skill",
                name,
                aliases: [name, `skill:${name}`],
                loadLevel: "body",
                checksum: String(skill?.contentHash || crypto.createHash("sha256").update(name).digest("hex")),
                loadSource: "same_run",
                tokens: 0,
            });
        }
        const loadedMcp = authorizedTools.catalog.tools.map((tool) => ({
            kind: "mcp",
            name: String(tool?.canonicalName || tool?.name || ""),
            aliases: [
                String(tool?.canonicalName || ""),
                String(tool?.server || ""),
                tool?.server && tool?.name ? `${tool.server}/${tool.name}` : "",
                String(tool?.name || ""),
            ].filter(Boolean),
            loadLevel: "schema",
            checksum: crypto.createHash("sha256").update(JSON.stringify({
                name: tool?.canonicalName || tool?.name,
                server: tool?.server,
                inputSchema: tool?.inputSchema || null,
            })).digest("hex"),
            loadSource: authorizedTools.post_compact_restore_receipt?.loadedToolNames?.includes(String(tool?.canonicalName || tool?.name || ""))
                ? "post_compact_restored"
                : tool?.alwaysLoad === true ? "always_load" : "same_run",
        }));
        const loadedToolNames = new Set((run?.loaded_tool_names || run?.loadedToolNames || []).map(value => String(value || "")));
        const deferredWorkspaceNames = new Set(workspace_readonly_tools_1.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3
            .filter(tool => tool.loadPolicy === "search" && !loadedToolNames.has(tool.name) && !loadedToolNames.has(tool.canonicalName))
            .map(tool => tool.name));
        const modelVisibleToolSpecs = GLOBAL_AGENT_TOOL_SPECS.filter(spec => !deferredWorkspaceNames.has(spec.name));
        const invocations = (Array.isArray(run?.steps) ? run.steps : []).flatMap((step) => {
            const wrapper = String(step?.tool?.name || "");
            const kind = wrapper === "invoke_skill" ? "skill" : wrapper === "invoke_mcp" ? "mcp" : "";
            const name = kind === "skill"
                ? String(step?.tool?.arguments?.name || "")
                : kind === "mcp" ? String(step?.tool?.arguments?.tool_name || step?.tool?.arguments?.toolName || step?.tool?.arguments?.name || "") : "";
            if (!kind || !name || (step?.observation === undefined && !step?.error))
                return [];
            return [{
                    kind,
                    name,
                    aliases: [name, kind === "skill" ? `skill:${name}` : ""].filter(Boolean),
                    ok: !step?.error && step?.observation?.success !== false,
                    resultChecksum: crypto.createHash("sha256").update(JSON.stringify(step?.observation ?? step?.error ?? null)).digest("hex"),
                }];
        });
        return (0, session_compaction_core_1.buildModelVisiblePayloadSnapshot)({
            scope: "global",
            sessionId,
            system: systemMessages,
            tools: modelVisibleToolSpecs,
            recentMessages: messages.filter(message => message.role !== "system"),
            contextComponents: {
                skills: [...skillSections, ...configuredSkills, ...(authorizedTools.restored_skill_attachments || [])],
                mcpTools: configuredMcpTools,
                subagentDefinitions: {
                    projects: getConfigs().map((project) => String(project?.name || "")).filter(Boolean),
                    groups: loadGroups().map((group) => ({ id: String(group?.id || ""), name: String(group?.name || "") })),
                },
                loadedContextItems: {
                    schema: "ccm-loaded-context-items-v1",
                    skills: loadedSkills,
                    mcp: loadedMcp,
                    invocations,
                },
            },
        });
    }
    function isGlobalPromptTooLongError(error) {
        return /HTTP\s*413|prompt(?:\s+is)?\s+too\s+long|context(?:_length)?(?:\s+window)?\s*(?:exceeded|limit)|maximum context|request too large|token\s*(?:检查|门禁).*拒绝|Token.*(?:rejected|refused)|POST_COMPACT_THRESHOLD/i.test(String(error?.message || error || ""));
    }
    function compactGlobalProviderMessageContent(value, maxChars) {
        const source = String(value || "").trim();
        if (source.length <= maxChars)
            return source;
        return `${source.slice(0, Math.max(0, maxChars - 44)).trimEnd()}\n[该部分已按恢复上下文预算截断]`;
    }
    /**
     * A provider can reject the formal compaction request itself when fixed
     * global context grew beyond its advertised window.  Keep the authoritative
     * transcript and memory untouched, but retry the *next* model turn with a
     * minimal, deterministic recovery projection.  It contains the current
     * request plus the newest safe conversation context and does not invent a
     * summary or silently discard stored history.
     */
    function buildEmergencyGlobalProviderMessages(messages, run) {
        const system = messages.find(message => message.role === "system");
        const currentGoal = String(run.reasoning_loop?.effective_goal || run.user_message || "").trim();
        const nonSystem = messages.filter(message => message.role !== "system");
        const recent = nonSystem
            .filter(message => String(message.content || "").trim() && String(message.content || "").trim() !== currentGoal)
            .slice(-4)
            .map(message => ({ role: message.role === "assistant" ? "assistant" : "user", content: compactGlobalProviderMessageContent(message.content, 3_000) }));
        const recoverySystem = [
            "你是 CCM 全局 Agent 的恢复决策内核。会话历史和长期记忆已经安全保留在服务端。",
            "当前只提供必要上下文以恢复本轮，不得声称看到未提供的历史；需要事实时调用只读工具。",
            "每轮最多一个工具。只输出既有 CCM 决策 JSON 协议，不要 Markdown、内部错误、Token 或上下文容量信息。",
            "若无法安全继续，使用 needs_confirmation 提出一个具体问题。",
        ].join("\n");
        return [
            { role: "system", content: `${compactGlobalProviderMessageContent(system?.content || "", 14_000)}\n\n[上下文恢复模式]\n${recoverySystem}` },
            ...recent,
            { role: "user", content: `【当前用户目标】\n${compactGlobalProviderMessageContent(currentGoal, 8_000)}\n\n【恢复状态】\n会话内容较多，已保留现场并切换到安全恢复上下文。请决定下一步。` },
        ];
    }
    async function prepareGlobalProviderMessages(messages, run, runtime, options = {}) {
        const sessionId = String(run.session_id || "").trim();
        if (!sessionId)
            throw new Error("全局 Agent Provider 调用缺少精确会话 ID");
        const baseConfig = loadOrchestratorConfig();
        const sessionPreferences = (0, slash_command_session_state_1.readSlashCommandSessionState)("global", "global", sessionId).preferences;
        const config = { ...baseConfig, model: sessionPreferences.model || baseConfig.model, reasoningEffort: sessionPreferences.effort || baseConfig.reasoningEffort };
        const modelCapacity = (0, group_compaction_strategy_1.resolveGroupModelContextCapacity)(config);
        const threshold = (0, group_compaction_strategy_1.getGroupAutoCompactThreshold)(config);
        const triggerPayload = buildGlobalProviderPayloadSnapshot(messages, sessionId, run);
        if (!options.promptTooLong && triggerPayload.totalTokens < threshold)
            return messages;
        let compaction = null;
        try {
            compaction = await compactGlobalAgentSessionWithModel(sessionId, {
                reason: options.promptTooLong ? "provider_prompt_too_long" : "provider_payload_preflight",
                promptTooLong: options.promptTooLong === true,
                currentRequest: { role: "user", content: run.reasoning_loop?.effective_goal || run.user_message },
                fixedContext: messages.filter(message => message.role === "system"),
                modelVisiblePayload: triggerPayload,
                postCompactPayloadBuilder: async ({ summary, preservedMessages, boundaryMarker, recoveryContext, hookResults }) => {
                    const continuation = {
                        schema: "ccm-global-session-continuation-v2",
                        sessionId,
                        summary,
                        messages: preservedMessages.map((message) => ({
                            id: String(message.id || ""),
                            role: message.role === "assistant" ? "assistant" : "user",
                            content: String(message.content || ""),
                            timestamp: String(message.timestamp || ""),
                        })),
                        boundary: boundaryMarker,
                        recoveryContext,
                        hookResults,
                    };
                    const rebuiltMessages = await (0, global_agent_run_projection_1.buildGlobalAgentModelMessages)(run, runtime, { sessionContinuationOverride: continuation });
                    return {
                        messages: rebuiltMessages,
                        modelVisiblePayload: buildGlobalProviderPayloadSnapshot(rebuiltMessages, sessionId, run),
                    };
                },
            });
        }
        catch (error) {
            if (isGlobalPromptTooLongError(error) || /GLOBAL_COMPACTION_|GLOBAL_SESSION_/i.test(String(error?.code || ""))) {
                recordGlobalAgentRuntimeOutput(run, { type: "context_recovery", status: "warning", message: "会话上下文已切换为安全恢复投影", detail: "provider_or_compaction_capacity" });
                return buildEmergencyGlobalProviderMessages(messages, run);
            }
            throw error;
        }
        if (compaction?.reason === "circuit_breaker")
            return buildEmergencyGlobalProviderMessages(messages, run);
        if (compaction?.compacted !== true)
            return buildEmergencyGlobalProviderMessages(messages, run);
        const rebuiltMessages = Array.isArray(compaction.preparedModelMessages)
            ? compaction.preparedModelMessages
            : await (0, global_agent_run_projection_1.buildGlobalAgentModelMessages)(run, runtime);
        const rebuiltPayload = buildGlobalProviderPayloadSnapshot(rebuiltMessages, sessionId, run);
        const postCompactGate = (0, session_compaction_core_1.buildSessionPostCompactGate)({ modelVisiblePayload: rebuiltPayload, threshold });
        if (postCompactGate.providerCallAllowed !== true || rebuiltPayload.totalTokens >= modelCapacity.contextWindow)
            return buildEmergencyGlobalProviderMessages(rebuiltMessages, run);
        return rebuiltMessages;
    }
    function localActionToAgenticDecision(localIntent, run) {
        if (run.steps.length > 0) {
            const last = run.steps[run.steps.length - 1];
            const observationText = summarizeGlobalToolObservationForUser(last.observation, localIntent?.reply || "操作已返回结果。");
            return {
                state: "complete",
                message: last.error ? `操作未完成：${last.error}` : `${localIntent?.reply || "操作已返回结果。"}\n\n${observationText}`,
                tool: null,
                completion: { evidence: last.error ? [] : [`工具 ${last.tool?.name || "unknown"} 已返回执行结果`], risks: last.error ? [last.error] : [] },
            };
        }
        if (!localIntent?.action?.type) {
            if (localIntent?.intent?.category === "conversation") {
                return { state: "answer", message: localIntent.reply, tool: null, intent: localIntent.intent };
            }
            return {
                state: "answer",
                message: "大模型暂时不可用，本次请求未开始。请检查模型配置或网络后重试。",
                tool: null,
                intent: {
                    category: "question",
                    goal: run.user_message,
                    action_required: false,
                    confidence: 0.2,
                    authorization_basis: "none",
                    reason: "模型不可用，未执行任何操作",
                },
            };
        }
        const action = localIntent.action;
        const toolName = action.type === "system_status" ? "inspect_system" : action.type;
        if (!GLOBAL_AGENT_TOOL_SPECS.some(spec => spec.name === toolName)) {
            return { state: "answer", message: `${localIntent.reply}\n\n当前动作还没有接入 Agentic Loop 后端工具，未执行。`, tool: null };
        }
        const spec = GLOBAL_AGENT_TOOL_SPECS.find(item => item.name === toolName);
        const fallbackRisk = typeof spec.risk === "function" ? spec.risk(action.params || {}) : spec.risk;
        const deterministicUiTools = new Set(["play_music", "stop_music", "toggle_pet", "navigate"]);
        if (fallbackRisk !== "read" && !deterministicUiTools.has(toolName)) {
            return {
                state: "answer",
                message: "大模型暂时不可用，本次操作未开始。请检查模型配置或网络后重试。",
                tool: null,
                intent: { category: "ambiguous", goal: run.user_message, action_required: false, confidence: 0.2, authorization_basis: "none", reason: "模型不可用，禁止关键词规则代替语义决策执行写操作" },
            };
        }
        return { state: "execute", message: localIntent.reply, tool: { name: toolName, arguments: action.params || {} } };
    }
    function createMissionSupervisorRuntime(ctx) {
        return {
            inspectMission: (missionId) => getGlobalDevelopmentMission(missionId),
            advanceMission: (missionId, options) => superviseGlobalDevelopmentMissionCycle(missionId, ctx, options),
            controlMission: (missionId, operation, payload) => controlGlobalDevelopmentMission(missionId, operation, ctx, payload),
            deliverTerminal: async (record, receipt, delivery) => {
                const report = record.final_report || {};
                const formatted = formatGlobalMissionFinalReport(report);
                if (delivery.kind === "memory") {
                    recordGlobalMissionMemory({ missionId: record.mission_id, sessionId: record.session_id, traceId: record.trace_id, source: record.source, status: receipt.outcome, report });
                    return;
                }
                if (delivery.kind === "run") {
                    if (record.global_run_id) {
                        const run = completeGlobalAgentSupervision(record.global_run_id, { ...report, formatted, terminal_receipt: receipt }, receipt.outcome);
                        if (run) {
                            run.terminal_receipt = receipt;
                            (0, global_agent_run_store_1.saveRun)(run, true);
                        }
                    }
                    return;
                }
                if (delivery.kind === "replay") {
                    (0, reliability_ledger_1.appendTraceEvent)(record.trace_id, {
                        id: `${record.id}:terminal-delivery:${receipt.checksum}`,
                        type: "global_agent.terminal_delivery_recorded",
                        status: receipt.outcome === "completed" ? "ok" : "warning",
                        task_id: record.mission_id,
                        message: report?.summary || formatted,
                        data: { terminal_receipt: receipt },
                    });
                    return;
                }
                if (delivery.kind === "web_session") {
                    ingestGlobalAgentConversation({
                        sessionId: record.session_id,
                        source: record.source || "global-supervisor",
                        messages: [{
                                id: `gam_${record.global_run_id || record.mission_id}_terminal`,
                                role: "assistant",
                                content: formatted,
                                timestamp: receipt.settled_at,
                                trace_id: record.trace_id,
                                mission_id: record.mission_id,
                                metadata: { terminal_receipt: receipt },
                            }],
                    });
                    return;
                }
                if (delivery.kind === "feishu") {
                    bindFeishuIdentifiersFromValue(record.session_id, report);
                    bindFeishuTaskContext({ sessionId: record.session_id, runIds: [record.global_run_id], missionIds: [record.mission_id], source: record.source, targetType: "global_agent" });
                    const delivered = await notifyFeishuTaskStage({
                        stage: receipt.outcome === "completed" ? "completion" : receipt.outcome,
                        title: receipt.outcome === "completed" ? "任务已经完成" : receipt.outcome === "cancelled" ? "任务已取消" : "任务执行遇到问题",
                        markdown: formatted,
                        sessionId: record.session_id,
                        runId: record.global_run_id,
                        missionId: record.mission_id,
                        dedupeKey: `mission:${record.mission_id}:terminal:${receipt.checksum}`,
                    });
                    if (delivered?.success !== true && delivered?.queued !== true)
                        throw new Error(delivered?.reason || "飞书终态投递失败");
                }
            },
            onProgress: async (record, event) => {
                if (event?.type === "waiting_user")
                    recordGlobalMissionMemory({ missionId: record.mission_id, sessionId: record.session_id, traceId: record.trace_id, source: record.source, status: "waiting_user", report: { summary: `全局任务等待人工处理`, remaining_items: (event.items || []).map((item) => item.reason || item.task_id) } });
                if (record.global_run_id && event?.type === "waiting_user")
                    updateGlobalAgentSupervisionState(record.global_run_id, "waiting_user");
                if (!/feishu/i.test(record.source))
                    return;
                const taskIds = [
                    ...(event.items || []).map((item) => item.task_id || item.taskId),
                    ...(event.actions || []).map((item) => item.task_id || item.taskId),
                ].filter(Boolean);
                bindFeishuTaskContext({ sessionId: record.session_id, runIds: [record.global_run_id], missionIds: [record.mission_id], taskIds, source: record.source, targetType: "global_agent" });
                if (event?.type === "waiting_user") {
                    const lines = (event.items || []).map((item) => `- ${item.reason || "需要你补充信息"}`);
                    const markdown = `任务暂时需要你的帮助：\n${lines.join("\n")}`;
                    await notifyFeishuTaskStage({ stage: "waiting_user", title: "任务需要你补充信息", markdown, sessionId: record.session_id, missionId: record.mission_id, dedupeKey: `mission:${record.mission_id}:waiting-user:${record.cycle_count}` });
                    return;
                }
                if (event?.type === "actions" && event.actions?.length) {
                    const actionLabels = {
                        gate_gap_rework: "验收发现缺口，已安排定向返工",
                        failure_rework: "执行遇到问题，已安排返工",
                        runtime_recovery: "执行通道异常，正在恢复原任务",
                        stalled_recovery: "任务停滞，已从原进度继续恢复",
                        merge_conflict_rework: "代码合并出现冲突，已安排定向处理",
                        merge_failed: "代码合并未通过，正在处理",
                        worktree_merged: "项目代码已经合并，正在继续验收",
                        dependency_released: "前置任务已完成，后续工作开始执行",
                        queue_recovered: "任务已重新进入执行队列",
                    };
                    const lines = event.actions.map((item) => `- ${actionLabels[item.type] || "任务进度已经更新"}`);
                    await notifyFeishuTaskStage({ stage: "rework", title: "任务进度更新", markdown: [...new Set(lines)].join("\n"), sessionId: record.session_id, missionId: record.mission_id, dedupeKey: `mission:${record.mission_id}:actions:${record.cycle_count}` });
                }
            },
        };
    }
    function attachGlobalRunTestAgentExecutionPlan(run, event = {}) {
        if (String(event?.type || "") !== "test_agent_execution_plan_ready")
            return;
        const plan = event.test_agent_execution_plan || event.testAgentExecutionPlan || event.technical?.test_agent_execution_plan || null;
        if (!plan)
            return;
        run.test_agent_execution_plan = plan;
        run.testAgentExecutionPlan = plan;
        run.test_agent_execution_plan_summary = event.test_agent_execution_plan_summary || event.testAgentExecutionPlanSummary || event.detail || "";
        run.testAgentExecutionPlanSummary = event.testAgentExecutionPlanSummary || event.test_agent_execution_plan_summary || event.detail || "";
        run.test_agent_execution_plan_detail = event.detail || "";
        run.testAgentExecutionPlanDetail = event.detail || "";
    }
    function attachGlobalRunTestAgentReview(run, event = {}) {
        if (String(event?.type || "") !== "test_agent_review_ready")
            return;
        const summary = event.test_agent_review_summary || event.testAgentReviewSummary || event.independent_review_summary || event.independentReviewSummary || null;
        if (!summary)
            return;
        const rows = Array.isArray(event.independent_review) ? event.independent_review : Array.isArray(event.independentReview) ? event.independentReview : [];
        run.test_agent_review_summary = summary;
        run.testAgentReviewSummary = summary;
        run.independent_review_summary = summary;
        run.independentReviewSummary = summary;
        run.independent_review = rows;
        run.independentReview = rows;
        run.test_agent_report = event.test_agent_report || event.testAgentReport || event.technical?.test_agent_report || null;
        run.testAgentReport = event.testAgentReport || event.test_agent_report || event.technical?.test_agent_report || null;
        run.post_review_spot_check_summary = event.post_review_spot_check_summary || event.postReviewSpotCheckSummary || null;
        run.postReviewSpotCheckSummary = event.postReviewSpotCheckSummary || event.post_review_spot_check_summary || null;
        run.post_review_spot_check = event.technical?.post_review_spot_check || event.post_review_spot_check || event.postReviewSpotCheck || null;
        run.postReviewSpotCheck = event.postReviewSpotCheck || event.post_review_spot_check || event.technical?.post_review_spot_check || null;
    }
    function unresolvedRequiredSources(run) {
        const rows = Array.isArray(run.requirement_sources)
            ? run.requirement_sources
            : Array.isArray(run.source_ingestion?.sources)
                ? run.source_ingestion.sources
                : Array.isArray(run.source_attachments)
                    ? run.source_attachments
                    : [];
        return rows.filter((source) => {
            if (source?.required === false)
                return false;
            const status = String(source?.status || "").toLowerCase();
            return source?.readable !== true && !["parsed", "partial"].includes(status);
        });
    }
    function sourceExecutionGate(run, toolName, args) {
        const spec = GLOBAL_AGENT_TOOL_SPECS.find((item) => item.name === toolName);
        const risk = typeof spec?.risk === "function" ? spec.risk(args || {}) : spec?.risk;
        if (!["write", "high"].includes(String(risk || "")))
            return null;
        if (run.source_execution_waiver?.scope === "current_run")
            return null;
        const unresolved = unresolvedRequiredSources(run);
        if (!unresolved.length)
            return null;
        const names = unresolved.slice(0, 4).map((source) => compactPetText(source?.name || source?.url || source?.path || "任务资料", 80));
        return {
            success: false,
            accepted: false,
            completed: false,
            needs_clarification: true,
            clarification_questions: [
                `以下关键资料尚未完整读取：${names.join("、")}。请完成授权、重新上传可读取版本，或明确允许忽略这些资料后再继续。`,
            ],
            source_coverage: {
                total: Array.isArray(run.requirement_sources) ? run.requirement_sources.length : unresolved.length,
                unresolved: unresolved.map((source) => ({
                    id: source?.id || "",
                    name: source?.name || source?.url || source?.path || "任务资料",
                    status: source?.status || "failed",
                    reason: source?.error || source?.summary || "未读取正文",
                })),
            },
            error: "关键任务资料尚未完整读取，已阻止执行操作",
        };
    }
    async function executeAgenticTool(baseUrl, ctx, name, args, run, onEvent, signal) {
        const sourceGate = sourceExecutionGate(run, name, args);
        if (sourceGate)
            return sourceGate;
        const loadedNames = new Set((run.loaded_tool_names || run.loadedToolNames || []).map(value => String(value || "")));
        const deferredWorkspace = workspace_readonly_tools_1.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.find(tool => tool.loadPolicy === "search" && (tool.name === name || tool.canonicalName === name));
        if (deferredWorkspace && !loadedNames.has(deferredWorkspace.name) && !loadedNames.has(deferredWorkspace.canonicalName)) {
            throw new Error(`MAIN_AGENT_TOOL_SCHEMA_NOT_LOADED:${deferredWorkspace.canonicalName}`);
        }
        if (name === "invoke_mcp") {
            const preflight = (0, global_agent_tool_authorization_1.buildGlobalAgentToolRuntimeContext)({ taskId: run.id, sessionId: run.session_id, source: run.source || "global-agent-preflight" }, run.loaded_tool_names || run.loadedToolNames || []);
            const requested = String(args?.tool_name || args?.toolName || args?.name || "");
            const deferred = preflight.discoverable_tools.find((tool) => requested === tool.canonicalName || requested === tool.name || requested === `${tool.server}/${tool.name}`);
            if (deferred)
                throw new Error(`MAIN_AGENT_TOOL_SCHEMA_NOT_LOADED:${deferred.canonicalName}`);
        }
        const signature = crypto.createHash("sha256").update(`${name}:${JSON.stringify(args || {})}`).digest("hex").slice(0, 24);
        const contextSourceRead = (0, context_source_tool_result_projection_1.isContextSourceToolResult)(name, { toolName: args?.tool_name || args?.toolName || args?.name });
        let operationKey = `${run.id}:${signature}`;
        let operation = acquireIdempotency({
            scope: "global-agent-tool",
            key: operationKey,
            traceId: run.trace_id,
            leaseMs: 12 * 60 * 1000,
            metadata: { run_id: run.id, tool: name },
        });
        if (!operation.acquired) {
            const settled = operation.inProgress ? await waitForIdempotencyResult("global-agent-tool", operationKey, 12 * 60 * 1000) : operation.record;
            if (settled?.status === "completed") {
                if (contextSourceRead) {
                    // 来源正文不进入幂等结果。重复读取另开只读尝试，从权威存储取得当前版本。
                    operationKey = `${run.id}:${signature}:source-reread:${crypto.randomBytes(8).toString("hex")}`;
                    operation = acquireIdempotency({
                        scope: "global-agent-tool",
                        key: operationKey,
                        traceId: run.trace_id,
                        leaseMs: 12 * 60 * 1000,
                        metadata: { run_id: run.id, tool: name, authoritative_reread: true },
                    });
                    if (!operation.acquired)
                        throw new Error(`来源工具 ${name} 无法取得权威重读租约`);
                }
                else {
                    const replayed = { ...(settled.result?.observation || settled.result || {}), replayed: true };
                    if (name === "tool_search") {
                        const rows = Array.isArray(replayed?.result?.tools) ? replayed.result.tools : [];
                        const names = rows.map((tool) => String(tool?.canonicalName || tool?.name || "")).filter(Boolean);
                        run.loaded_tool_names = Array.from(new Set([...(run.loaded_tool_names || run.loadedToolNames || []), ...names]));
                        run.loadedToolNames = run.loaded_tool_names.slice();
                        (0, global_agent_run_store_1.saveRun)(run, true);
                    }
                    return replayed;
                }
            }
            if (!operation.acquired) {
                if (settled?.status === "failed")
                    throw new Error(settled.error || `工具 ${name} 的历史执行失败`);
                throw new Error(`工具 ${name} 仍在另一个执行实例中运行`);
            }
        }
        const sourceRuntime = (0, global_agent_tool_authorization_1.buildGlobalAgentToolRuntimeContext)({ taskId: run.id, executionId: operationKey, sessionId: run.session_id, source: run.source || "global-agent-source" }, run.loaded_tool_names || run.loadedToolNames || []);
        try {
            let observation;
            if (name === "invoke_skill") {
                observation = await (0, global_agent_tool_authorization_1.executeGlobalAgentAuthorizedTool)("skill", args, {
                    taskId: run.id,
                    executionId: operationKey,
                    sessionId: run.session_id,
                    source: run.source || "global-agent",
                }, run.loaded_tool_names || run.loadedToolNames || []);
            }
            else if (name === "invoke_mcp") {
                observation = await (0, global_agent_tool_authorization_1.executeGlobalAgentAuthorizedTool)("mcp", args, {
                    taskId: run.id,
                    executionId: operationKey,
                    sessionId: run.session_id,
                    source: run.source || "global-agent",
                }, run.loaded_tool_names || run.loadedToolNames || []);
            }
            else if (name === "tool_search" || workspace_readonly_tools_1.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.some(tool => tool.name === name)) {
                const runtime = (0, global_agent_tool_authorization_1.buildGlobalAgentToolRuntimeContext)({
                    taskId: run.id,
                    executionId: operationKey,
                    sessionId: run.session_id,
                    source: run.source || "global-agent",
                }, run.loaded_tool_names || run.loadedToolNames || []);
                const toolContext = {
                    schema: "ccm-main-agent-tool-runtime-context-v2",
                    scope: runtime.scope,
                    configured: runtime.tools,
                    executionSkills: [],
                    effective: runtime.tools,
                    catalog: {
                        mcp: runtime.catalog.tools,
                        skills: runtime.catalog.skills,
                        rejectedMcp: [],
                        discoverableMcp: runtime.discoverable_tools,
                        native: [],
                    },
                    toolAudit: runtime.tool_audit,
                    mcpPrompt: "",
                    skillPrompt: "",
                    policyPrompt: "",
                    checksum: runtime.checksum,
                    version: 2,
                    capabilityToken: runtime.capability_token,
                    loadedToolNames: runtime.loaded_tool_names,
                    scopeIdentity: runtime.scope_identity,
                    restoredSkillAttachments: runtime.restored_skill_attachments || [],
                    postCompactRestoreReceipt: runtime.post_compact_restore_receipt || undefined,
                    workspaceReadContext: workspaceReadContextForRun(run),
                };
                const rows = await (0, main_agent_tool_runtime_1.executeMainAgentToolRequests)({
                    requests: [{ name, arguments: args || {}, reason: "全局主 Agent按需读取" }],
                    toolContext,
                    resultTokenLimit: cc_tool_result_limits_1.CC_ALIGNED_TOOL_RESULT_MAX_TOKENS,
                    abortSignal: signal,
                });
                const row = rows[0];
                if (!row?.ok)
                    throw new Error(row?.error || `${name}调用失败`);
                if (name === "tool_search") {
                    run.loaded_tool_names = Array.from(new Set((toolContext.loadedToolNames || []).map((value) => String(value || "")).filter(Boolean)));
                    run.loadedToolNames = run.loaded_tool_names.slice();
                    (0, global_agent_run_store_1.saveRun)(run, true);
                }
                observation = (0, transient_model_content_1.attachTransientModelBlocks)({ success: true, tool: name, result: (() => { try {
                        return JSON.parse(row.output);
                    }
                    catch {
                        return row.output;
                    } })(), authorization_checksum: runtime.checksum }, (0, transient_model_content_1.transientModelBlocks)(row));
            }
            else if (name === "inspect_system") {
                observation = { success: true, ...buildAgenticContext(), missions: refreshGlobalDevelopmentMissions().slice(-8) };
            }
            else if (name === "list_projects") {
                observation = { success: true, projects: safeProjectRows() };
            }
            else if (name === "inspect_project") {
                const project = String(args.project || "");
                const config = getConfigs().find((item) => item.name === project);
                if (!config)
                    throw new Error(`项目不存在：${project}`);
                const info = getConfigInfo(config.path)?.[0] || {};
                observation = {
                    success: true,
                    project,
                    config: { work_dir: info.workDir || "", agent: info.agent || "claudecode", platform: info.platform || "" },
                    memory_boundary: { project_memory_included: false, policy: "routing_metadata_only_delegate_to_group_main_agent" },
                };
            }
            else if (name === "list_groups") {
                observation = { success: true, groups: buildAgenticContext().groups };
            }
            else if (name === "list_tasks") {
                const tasks = loadTasks().filter(isGlobalAgentOwnedTask).filter((task) => !args.id || task.id === args.id).filter((task) => !args.status || task.status === args.status);
                observation = {
                    success: true,
                    tasks: tasks.slice(-50).map(compactTask),
                    task_boundary: { schema: "ccm-global-agent-task-boundary-v1", policy: "global_agent_owned_tasks_only" },
                };
            }
            else if (name === "list_cron") {
                observation = { success: true, jobs: buildAgenticContext().cron_jobs };
            }
            else if (name === "query_knowledge") {
                const knowledge = await (0, knowledge_access_1.searchAgentKnowledge)(String(args.query || ""), { role: "global-agent" }, { limit: 6, continuityIdentity: { agentKind: "global", scope: "global", scopeId: "global-agent", exactSessionId: run.session_id, generation: Number(sourceRuntime.scope_identity?.generation || 0) } });
                observation = {
                    success: true,
                    query: args.query,
                    content: knowledge.context || "未检索到相关知识",
                    citations: knowledge.citations,
                    retrieval: { embedding: knowledge.embeddingMode, fallback: knowledge.fallback, error: knowledge.embeddingError },
                    sourceReferences: (knowledge.results || []).map((result) => ({
                        sourceKind: "knowledge",
                        sourceId: result.filename,
                        documentName: result.filename,
                        chunkIds: [result.citation].filter(Boolean),
                        revision: result.revision,
                        checksum: result.checksum,
                        citations: [result.citation].filter(Boolean),
                        tokenCount: result.tokenCount,
                    })),
                };
            }
            else if (name === "query_global_memory") {
                observation = { success: true, query: args.query, ...recallGlobalAgentMemory(String(args.query || ""), { sessionId: run.session_id, limit: Number(args.limit || 8) }) };
            }
            else if (name === "read_global_shared_files") {
                const runtimeBudget = (0, main_agent_context_source_continuity_1.calculateContextSourceBudget)({ contextWindow: Number(sourceRuntime.context_budget?.contextWindow || 200_000), catalogPercent: Number(sourceRuntime.context_policy?.effective?.contextSourceCatalogBudgetPercent || 1), hydrationPercent: Number(sourceRuntime.context_policy?.effective?.contextSourceHydrationBudgetPercent || 10), remainingSafeTokens: Number(sourceRuntime.context_budget?.finalSafetyRemainingTokens || 0) });
                const sharedFiles = (0, shared_files_v2_1.buildSharedFilesContextV2)("global", "global", {
                    maxTokens: runtimeBudget.hydrationTargetTokens,
                    explicitText: String(args.file_id || args.name || args.query || ""),
                    title: "以下是全局 Agent 已授权共享文件。使用其中事实时必须引用文件和分片：",
                });
                (0, main_agent_context_source_continuity_1.recordSharedFileProjection)({ agentKind: "global", scope: "global", scopeId: "global-agent", exactSessionId: run.session_id, generation: Number(sourceRuntime.scope_identity?.generation || 0) }, sharedFiles, runtimeBudget);
                observation = {
                    success: true,
                    context: sharedFiles.context,
                    manifest_checksum: sharedFiles.checksum,
                    complete: sharedFiles.complete,
                    files: sharedFiles.files.map((file) => ({ id: file.id, name: file.name, checksum: file.checksum, chunks: file.chunks?.length || 0 })),
                    sourceReferences: (sharedFiles.selected_chunks || []).map((chunk) => ({
                        sourceKind: "shared_file",
                        sourceId: chunk.file_id,
                        documentName: chunk.file_name,
                        chunkIds: [chunk.chunk_id].filter(Boolean),
                        checksum: chunk.checksum,
                        tokenCount: chunk.token_count,
                    })),
                };
            }
            else if (name === "manage_global_memory") {
                const operation = String(args.operation || "").toLowerCase();
                if (operation !== "status" && !String(args.reason || "").trim())
                    throw new Error("全局记忆变更操作必须说明原因");
                if (operation === "compact") {
                    observation = { success: true, operation, sessions: await Promise.all(loadGlobalAgentMemory().sessions.map((session) => compactGlobalAgentSessionWithModel(session.sessionId, { force: true, reason: args.reason }))) };
                }
                else if (operation === "rebuild") {
                    const memory = rebuildGlobalAgentMemory(args.reason, "global-agent");
                    const sessions = await Promise.all((memory.sessions || []).map((session) => compactGlobalAgentSessionWithModel(session.sessionId, { force: true, reason: args.reason || "rebuild" })));
                    observation = { success: true, operation, memory: loadGlobalAgentMemory(), sessions };
                }
                else if (["enable", "disable"].includes(operation)) {
                    observation = { success: true, operation, policy: setGlobalAgentMemoryPolicy({ disabled: operation === "disable", reason: args.reason, actor: "global-agent" }) };
                }
                else if (operation === "status") {
                    observation = { success: true, operation, policy: getGlobalAgentMemoryPolicy(), memory: loadGlobalAgentMemory() };
                }
                else
                    throw new Error(`不支持的全局记忆操作：${operation}`);
            }
            else if (name === "decompose_requirement_epic") {
                let plan = args.decomposition_plan
                    || args.decompositionPlan
                    || run.requirement_decomposition
                    || run.requirementDecomposition;
                if (!plan?.items?.length) {
                    const availableTargets = [
                        ...loadGroups().map((group) => ({
                            type: "group",
                            id: group.id,
                            name: group.name || group.id,
                            capabilities: (group.members || []).flatMap((member) => member.skills || member.capabilities || []),
                        })),
                        ...getConfigs().map((config) => ({ type: "project", id: config.name, name: (0, project_runtime_1.projectDisplayName)(config.name) })),
                    ];
                    const requirement = args.requirement_extraction
                        || args.requirementExtraction
                        || run.requirement_extraction
                        || run.requirementExtraction;
                    if (requirement) {
                        plan = await (0, source_ingestion_1.decomposeRequirementToTaskPlan)({
                            requirement,
                            sources: run.requirement_sources || run.requirementSources || [],
                            contentHash: run.requirement_content_hash || run.requirementContentHash || "",
                            availableTargets,
                        });
                    }
                    else {
                        const sourceAttachments = Array.isArray(run.source_attachments) ? run.source_attachments : [];
                        const ingestion = await (0, source_ingestion_1.ingestRequirementSources)({
                            files: sourceAttachments
                                .filter((item) => item?.path)
                                .map((item) => ({
                                filename: item.name || item.filename || "requirement-source",
                                savedPath: item.path,
                                size: Number(item.size || 0),
                                type: item.type || "",
                            })),
                            userText: run.original_user_message || run.user_message || "",
                            extractRequirement: true,
                            decomposeRequirement: true,
                            availableTargets,
                        });
                        attachGlobalRunRequirementSources(run, ingestion);
                        plan = ingestion.decomposition;
                    }
                    if (!plan?.items?.length)
                        throw new Error("大模型未能从当前消息或资料生成可靠的 Epic 任务图，请补充业务目标、范围或验收标准");
                    run.requirement_decomposition = plan;
                    run.requirementDecomposition = plan;
                }
                observation = {
                    success: true,
                    read_only: true,
                    needs_confirmation: true,
                    needs_clarification: Array.isArray(plan.clarification_questions) && plan.clarification_questions.length > 0,
                    clarification_questions: plan.clarification_questions || [],
                    decomposition_plan: plan,
                    summary: `已将需求文档拆成 ${plan.items.length} 个持久子任务；确认任务图后才会创建和派发。`,
                };
            }
            else if (name === "create_requirement_epic") {
                const plan = args.decomposition_plan
                    || args.decompositionPlan
                    || run.requirement_decomposition
                    || run.requirementDecomposition;
                if (!plan?.items?.length)
                    throw new Error("缺少已确认的需求拆解计划");
                const clarificationQuestions = Array.isArray(plan.clarification_questions) ? plan.clarification_questions.filter(Boolean) : [];
                const clarificationsResolved = args.clarifications_resolved === true
                    || args.clarificationsResolved === true
                    || clarificationQuestions.length === 0;
                if (clarificationQuestions.length && !clarificationsResolved) {
                    observation = {
                        success: false,
                        accepted: false,
                        completed: false,
                        needs_clarification: true,
                        clarification_questions: clarificationQuestions,
                        decomposition_plan: plan,
                        message: "需求拆解仍有阻断问题；请先逐项回答 clarification_questions，并在更新后的计划中清空这些问题后再创建 Epic。",
                    };
                }
                else {
                    const epicResult = createRequirementEpicWithChildren({
                        ...args,
                        decomposition_plan: plan,
                        requirement_extraction: args.requirement_extraction || args.requirementExtraction || run.requirement_extraction || null,
                        requirement_content_hash: args.requirement_content_hash || args.requirementContentHash || run.requirement_content_hash || plan.content_hash || "",
                        source_documents: args.source_documents || args.sourceDocuments || run.user_message || "",
                        source_attachments: args.source_attachments || args.sourceAttachments || run.source_attachments || [],
                        source_ingestion: args.source_ingestion || args.sourceIngestion || run.source_ingestion || null,
                        group_id: args.group_id || args.groupId || "",
                        group_session_id: args.group_session_id || args.groupSessionId || "",
                        target_project: args.target_project || args.targetProject || "",
                        source: run.source || "global-agent-requirement-epic",
                        channel: run.source || "global-agent",
                        conversation_id: run.session_id,
                        client_message_id: args.client_message_id || args.clientMessageId || run.id,
                        trace_id: run.trace_id,
                        idempotency_key: args.idempotency_key || `${run.id}:requirement-epic:${plan.content_hash || "v1"}`,
                        owner_agent: "global-agent",
                        confirmed: args.confirmed === true || args.user_confirmed === true || args.userConfirmed === true,
                        clarifications_resolved: clarificationsResolved,
                        auto_execute: args.auto_execute !== false,
                        requires_independent_review: args.requires_independent_review !== false,
                    });
                    if (!epicResult.success) {
                        observation = {
                            ...epicResult,
                            success: false,
                            accepted: false,
                            completed: false,
                            message: epicResult.needs_clarification
                                ? "需求拆解仍有阻断问题；请先回答 clarification_questions，再重新确认任务图。"
                                : "需求拆解计划仍需用户确认后才能创建。",
                        };
                    }
                    else {
                        const supervisor = startGlobalMissionSupervisor({
                            mission_id: epicResult.epic.id,
                            global_run_id: run.id,
                            trace_id: run.trace_id,
                            session_id: run.session_id,
                            source: run.source,
                            business_goal: epicResult.epic.business_goal,
                            acceptance: epicResult.epic.acceptance_criteria,
                            max_attempts: args.max_attempts || 3,
                        });
                        attachGlobalAgentRunSupervision(run, { mission_id: epicResult.epic.id, supervisor_id: supervisor.id, state: supervisor.status });
                        const dispatch = await superviseGlobalDevelopmentMissionCycle(epicResult.epic.id, ctx, { max_attempts: args.max_attempts || 3 });
                        observation = {
                            success: true,
                            accepted: true,
                            completed: false,
                            message: `需求 Epic 已创建，${epicResult.children.length} 个子任务将按依赖执行；当前不是完成状态。`,
                            mission_id: epicResult.epic.id,
                            epic: epicResult.epic,
                            children: epicResult.children.map((task) => ({
                                task_id: task.id,
                                item_key: task.requirement_item_key,
                                title: task.title,
                                target: task.mission_target?.name || task.target_project,
                                dependencies: task.mission_dependencies || [],
                                status: task.status,
                            })),
                            dependency_edges: epicResult.dependency_edges,
                            supervisor_id: supervisor.id,
                            supervisor_status: supervisor.status,
                            dispatch_actions: dispatch?.actions || [],
                        };
                    }
                }
            }
            else if (name === "inspect_mission") {
                const mission = getGlobalDevelopmentMission(String(args.id || ""));
                if (!mission)
                    throw new Error("全局开发任务不存在");
                observation = { success: true, ...mission, supervisor: getGlobalMissionSupervisor(String(args.id || "")) };
            }
            else if (name === "inspect_supervision") {
                const supervisor = getGlobalMissionSupervisor(String(args.id || ""));
                if (!supervisor)
                    throw new Error("全局任务监工不存在");
                observation = { success: true, supervisor, mission: getGlobalDevelopmentMission(supervisor.mission_id) };
            }
            else if (name === "orchestrate_development" || name === "send_project_cmd" || name === "create_task") {
                const missionArgs = name === "send_project_cmd"
                    ? buildGlobalSingleProjectMissionPayload({
                        project: String(args.project || args.projectName || ""),
                        message: String(args.message || args.prompt || args.command || run.user_message || ""),
                        originalText: run.original_user_message || run.user_message,
                        traceId: run.trace_id,
                        globalRunId: run.id,
                        sessionId: run.session_id,
                        source: run.source || "global-agent-single-project-dispatch",
                        idempotencyKey: args.idempotency_key || `${run.id}:single-project-mission`,
                        requiresCodeChanges: typeof args.requires_code_changes === "boolean"
                            ? args.requires_code_changes
                            : !!(run.workflow_decision || run.workflowDecision)?.requiresCodeChanges,
                    })
                    : name === "create_task"
                        ? {
                            title: args.title || "全局 Agent 下发的协作任务",
                            business_goal: args.business_goal || args.businessGoal || args.goal || args.message || run.original_user_message || run.user_message,
                            source_documents: args.source_documents || args.sourceDocuments || run.user_message || "",
                            source_attachments: args.source_attachments || args.sourceAttachments || run.source_attachments || [],
                            requirement_extraction: args.requirement_extraction || args.requirementExtraction || run.requirement_extraction || null,
                            source_ingestion: args.source_ingestion || args.sourceIngestion || run.source_ingestion || null,
                            acceptance: args.acceptance || args.acceptance_criteria || [
                                "群聊主 Agent 必须创建计划并派发项目子 Agent。",
                                "群聊主 Agent 必须验收项目子 Agent 的实际变更和验证证据。",
                                "涉及独立复核时由群聊主 Agent 调用 TestAgent，并负责返工、复验和最终总结。",
                            ].join("；"),
                            targets: [{
                                    type: "group",
                                    group_id: args.group_id || args.groupId || "",
                                    group_session_id: args.group_session_id || args.groupSessionId || "",
                                    task: args.business_goal || args.businessGoal || args.goal || args.message || run.original_user_message || run.user_message,
                                    reason: "全局 Agent 将复杂任务交给群聊主 Agent 计划、派发、验收和总结。",
                                    requires_code_changes: args.requires_code_changes !== false,
                                    requires_verification: args.requires_verification !== false,
                                    requires_independent_review: args.requires_independent_review !== false,
                                }],
                            requires_code_changes: args.requires_code_changes !== false,
                            requires_verification: args.requires_verification !== false,
                            requires_independent_review: args.requires_independent_review !== false,
                            auto_execute: args.auto_execute !== false,
                            source: "global_agent",
                            trace_id: run.trace_id,
                            idempotency_key: args.idempotency_key || `${run.id}:group-mission`,
                        }
                        : {
                            ...args,
                            source_documents: args.source_documents || args.sourceDocuments || run.user_message || "",
                            source_attachments: args.source_attachments || args.sourceAttachments || run.source_attachments || [],
                            requirement_extraction: args.requirement_extraction || args.requirementExtraction || run.requirement_extraction || null,
                            source_ingestion: args.source_ingestion || args.sourceIngestion || run.source_ingestion || null,
                            source: "global_agent",
                            trace_id: run.trace_id,
                            idempotency_key: args.idempotency_key || `${run.id}:mission`,
                        };
                const groundedTargets = Array.isArray(run.requested_target_refs) ? run.requested_target_refs : [];
                if (groundedTargets.length) {
                    const allowed = new Set(groundedTargets.map((target) => `${String(target.scope || target.type)}:${String(target.scopeId || target.scope_id || target.id)}`));
                    const missionTargets = Array.isArray(missionArgs.targets) ? missionArgs.targets : [];
                    for (const target of missionTargets) {
                        const scope = String(target?.type || target?.scope || (target?.group_id || target?.groupId ? "group" : "project"));
                        const scopeId = String(target?.group_id || target?.groupId || target?.project || target?.project_id || target?.projectId || target?.id || "");
                        if (!allowed.has(`${scope}:${scopeId}`))
                            throw new Error(`任务目标 ${scope}:${scopeId} 不在用户本轮明确选择的投放范围内`);
                        delete target.group_session_id;
                        delete target.groupSessionId;
                        delete target.project_session_id;
                        delete target.projectSessionId;
                    }
                }
                const missionResult = createGlobalDevelopmentMission({
                    ...missionArgs,
                    source: "global_agent",
                    automation_task_source: "global_agent",
                    source_documents: missionArgs.source_documents || missionArgs.sourceDocuments || run.user_message || "",
                    source_attachments: missionArgs.source_attachments || missionArgs.sourceAttachments || run.source_attachments || [],
                    requirement_extraction: missionArgs.requirement_extraction || missionArgs.requirementExtraction || run.requirement_extraction || null,
                    source_ingestion: missionArgs.source_ingestion || missionArgs.sourceIngestion || run.source_ingestion || null,
                }, ctx);
                const supervisor = startGlobalMissionSupervisor({
                    mission_id: missionResult.mission.id,
                    global_run_id: run.id,
                    trace_id: run.trace_id,
                    session_id: run.session_id,
                    source: run.source,
                    business_goal: missionResult.mission.business_goal || missionArgs.business_goal,
                    acceptance: missionResult.mission.acceptance_criteria || missionArgs.acceptance,
                    max_attempts: missionArgs.max_attempts || 3,
                });
                attachGlobalAgentRunSupervision(run, { mission_id: missionResult.mission.id, supervisor_id: supervisor.id, state: supervisor.status });
                observation = {
                    success: true,
                    accepted: true,
                    completed: false,
                    message: "全局任务已派发并进入持久监督；当前不是完成状态。",
                    mission_id: missionResult.mission.id,
                    supervisor_id: supervisor.id,
                    supervisor_status: supervisor.status,
                    children: missionResult.children.map((item) => ({ task_id: item.task?.id, target: item.target?.name, queued: item.queue_result?.queued, status: item.task?.status })),
                    rejected: missionResult.rejected,
                };
            }
            else if (name === "manage_supervision") {
                const supervisor = await controlGlobalMissionSupervisor(String(args.id || ""), String(args.operation || ""), createMissionSupervisorRuntime(ctx), args);
                if (supervisor.global_run_id) {
                    if (supervisor.status === "cancelled")
                        completeGlobalAgentSupervision(supervisor.global_run_id, { summary: "全局任务已由用户取消。" }, "cancelled");
                    else
                        updateGlobalAgentSupervisionState(supervisor.global_run_id, supervisor.status);
                }
                observation = { success: true, supervisor, mission: getGlobalDevelopmentMission(supervisor.mission_id) };
            }
            else if (name === "navigate") {
                observation = { success: true, message: `Web 客户端可切换到 ${args.tab}`, client_effect: { type: "navigate", params: { tab: args.tab } } };
            }
            else if (name === "play_music") {
                const played = await executePlayMusic(baseUrl, {
                    keyword: args.keyword || args.query || args.song || "",
                    mode: args.mode || "",
                    source: run.source || "global-agent",
                    originalText: run.user_message,
                    sessionId: run.session_id,
                });
                observation = {
                    success: played.success !== false,
                    message: played.message,
                    keyword: played.keyword,
                    mode: played.mode,
                    command: played.command,
                    client_effect: played.client_effect,
                };
            }
            else if (name === "stop_music") {
                const stopped = await executeStopMusic(baseUrl, {
                    source: run.source || "global-agent",
                });
                observation = {
                    success: stopped.success !== false,
                    message: stopped.message,
                    command: stopped.command,
                    client_effect: stopped.client_effect,
                };
            }
            else if (name === "git_review") {
                observation = await postLocalApi(baseUrl, "/api/global-agent/git-review", { project: args.project });
            }
            else if (name === "git_commit") {
                const files = Array.isArray(args.files) ? args.files.map((item) => String(item || "").trim()).filter(Boolean) : [];
                if (!files.length)
                    throw new Error("全局 Agent提交代码必须提供精确文件清单，禁止隐式提交整个工作区");
                observation = await postLocalApi(baseUrl, "/api/git/commit", { project: args.project, message: args.message || "chore: 由全局 Agent 提交变更", files, all_files: false, confirmed: true, action: "commit", expected_snapshot_checksum: args.expected_snapshot_checksum || "" });
            }
            else {
                let action = { type: name, params: { ...(args || {}) } };
                if (GLOBAL_MANAGEMENT_ACTIONS[name]) {
                    action = annotateGlobalAction(action);
                    if (action.validated === false)
                        throw new Error(`缺少参数：${(action.missing_params || []).join("、")}`);
                    action.confirmed = true;
                }
                const summary = await executeFeishuAction(baseUrl, action, run.user_message, run.trace_id, {
                    globalRunId: run.id,
                    sessionId: run.session_id,
                    source: run.source,
                    onEvent: (event) => {
                        attachGlobalRunTestAgentExecutionPlan(run, event);
                        attachGlobalRunTestAgentReview(run, event);
                        onEvent?.(event);
                    },
                });
                observation = { success: true, summary };
            }
            completeIdempotency("global-agent-tool", operationKey, {
                observation: (0, context_source_tool_result_projection_1.projectContextSourceToolResultForPersistence)(name === "invoke_mcp" ? (args?.tool_name || args?.toolName || name) : name, observation, args?.query || args?.file_id || args?.name || ""),
            });
            return observation;
        }
        catch (error) {
            failIdempotency("global-agent-tool", operationKey, error);
            throw error;
        }
    }
    function attachGlobalRunRequirementSources(run, ingestion) {
        if (!ingestion)
            return;
        run.source_ingestion = ingestion.technical;
        run.sourceIngestion = ingestion.technical;
        run.source_attachments = ingestion.attachments;
        run.sourceAttachments = ingestion.attachments;
        run.requirement_extraction = ingestion.requirement;
        run.requirementExtraction = ingestion.requirement;
        run.requirement_decomposition = ingestion.decomposition;
        run.requirementDecomposition = ingestion.decomposition;
        run.requirement_content_hash = ingestion.content_hash;
        run.requirementContentHash = ingestion.content_hash;
        run.requirement_source_documents = ingestion.source_documents || "";
        run.requirementSourceDocuments = ingestion.source_documents || "";
        run.requirement_sources = ingestion.sources || [];
        run.requirementSources = ingestion.sources || [];
    }
    function createAgenticRuntime(baseUrl, ctx, input = {}) {
        const baseConfig = loadOrchestratorConfig();
        const runtime = {
            callModel: async (messages, run, signal) => {
                attachGlobalRunRequirementSources(run, input.sourceIngestion);
                const sessionState = (0, slash_command_session_state_1.readSlashCommandSessionState)("global", "global", String(run.session_id || input.sessionId || ""));
                const config = { ...baseConfig, model: sessionState.preferences?.model || baseConfig.model, reasoningEffort: sessionState.preferences?.effort || baseConfig.reasoningEffort };
                if (!config.apiKey || !config.apiUrl || !config.model)
                    throw new Error("统一大模型尚未配置");
                const directive = (0, slash_command_session_state_1.renderSlashCommandSessionDirective)("global", "global", String(run.session_id || input.sessionId || ""));
                const providerMessages = directive && !messages.some(message => String(message.content || "").includes("当前精确会话处于 Plan Mode"))
                    ? [...messages.slice(0, -1), { role: "system", content: directive }, ...messages.slice(-1)]
                    : messages;
                const { accumulateGlobalAgentRunUsage } = require("../../agents/global/global-agent-metrics");
                const invoke = (providerMessages) => {
                    const modelCallIndex = Math.max(0, Number(run.main_model_call_count || 0));
                    run.main_model_call_count = modelCallIndex + 1;
                    run.latest_model_visible_payload = buildGlobalProviderPayloadSnapshot(providerMessages, String(run.session_id || ""), run);
                    const providerCacheBoundary = buildGlobalAgentSessionContinuation(String(run.session_id || ""));
                    return callGlobalModelWithRetry(config, providerMessages, {
                        signal,
                        retryProfile: modelCallIndex === 0 ? "interactive_first_turn" : "agent_orchestration",
                        onRetry: (notice) => input.onEvent?.({
                            type: "retrying",
                            attempt: notice.attempt + 1,
                            max_attempts: notice.maxAttempts,
                            remaining_budget_ms: Math.max(0, (modelCallIndex === 0 ? 60_000 : 120_000) - Number(notice.elapsedMs || 0)),
                            reason: String(notice.error?.message || notice.error || "模型暂时不可用").slice(0, 240),
                        }),
                        providerContextCache: {
                            scope: "global",
                            scopeId: String(run.session_id || ""),
                            sessionId: String(run.session_id || ""),
                            generation: Number(run.generation || 0),
                            boundaryGeneration: Number(providerCacheBoundary?.boundaryGeneration || 0),
                            source: "global_main_agent",
                        },
                        onProviderContextCache: (receipt) => {
                            run.latest_provider_context_cache = receipt;
                        },
                        onUsage: (usage) => {
                            run.latest_context_usage = usage;
                            accumulateGlobalAgentRunUsage(run, usage);
                        },
                    });
                };
                try {
                    return await invoke(providerMessages);
                }
                catch (error) {
                    if (!isGlobalPromptTooLongError(error))
                        throw error;
                    const recoveredMessages = await prepareGlobalProviderMessages(providerMessages, run, runtime, { promptTooLong: true });
                    return invoke(recoveredMessages);
                }
            },
            prepareModelMessages: (messages, run) => prepareGlobalProviderMessages(messages, run, runtime),
            getContext: (run) => buildAgenticContext(run.user_message, run.session_id, {
                knowledgeContext: input.knowledgeContext || "",
                lazyResources: true,
                runId: run.id,
                source: run.source || "global-agent",
                loadedToolNames: run.loaded_tool_names || run.loadedToolNames || [],
                requestedTargetRefs: input.requestedTargetRefs || run.requested_target_refs || [],
            }),
            verifyContextBoundary: context => verifyGlobalAgentContextBoundary(context),
            executeTool: (name, args, run, signal) => {
                attachGlobalRunRequirementSources(run, input.sourceIngestion);
                return executeAgenticTool(baseUrl, ctx, name, args, run, input.onEvent, signal);
            },
            fallbackDecision: (run, error) => {
                const detail = compactPetText(error?.message || error || "统一大模型调用失败", 800);
                console.warn(`[全局 Agent] 模型决策失败，已进入安全兜底：${detail}`);
                recordGlobalAgentRuntimeOutput(run, { type: "model_fallback", status: "warning", error: detail });
                // 模型不可用时只总结已有观察；不得让本地关键词规则替模型选择新工作流。
                return null;
            },
            onWorkflowDecision: (workflowDecision, run, modelCallIndex, modelDecision) => {
                const groundedTargets = Array.isArray(input.requestedTargetRefs) ? input.requestedTargetRefs : [];
                const requestedToolName = String(modelDecision?.tool?.name || "").toLowerCase();
                const targetRequired = workflowDecision.actionRequired === true && (workflowDecision.requiresCodeChanges === true
                    || ["plan_task", "decompose_epic"].includes(String(workflowDecision.mode || ""))
                    || ["orchestrate_development", "send_project_cmd", "send_group_cmd"].includes(requestedToolName));
                if (groundedTargets.length) {
                    const targetRefs = groundedTargets.map((target) => ({
                        type: target.scope,
                        id: target.scopeId,
                        name: target.displayName || target.canonicalName || target.scopeId,
                    }));
                    workflowDecision.targetRefs = targetRefs;
                    if (modelDecision?.intent) {
                        modelDecision.intent.target_refs = targetRefs.map(target => `${target.type}:${target.id}`);
                    }
                }
                else if (targetRequired) {
                    workflowDecision.actionRequired = false;
                    workflowDecision.requiresCodeChanges = false;
                    workflowDecision.clarificationQuestions = ["请选择本次任务要投放的项目或群聊。"];
                    if (modelDecision) {
                        modelDecision.state = "needs_confirmation";
                        modelDecision.tool = undefined;
                        modelDecision.message = "这项请求需要投放任务，但还没有明确目标。请从可投放的项目或群聊中选择后继续；我不会猜测目标。";
                    }
                }
                const planModeActive = (0, slash_command_session_state_1.readSlashCommandSessionState)("global", "global", String(run.session_id || input.sessionId || "")).planMode?.enabled === true;
                if (planModeActive && (workflowDecision.actionRequired === true || modelDecision?.tool)) {
                    workflowDecision.actionRequired = false;
                    workflowDecision.requiresCodeChanges = false;
                    workflowDecision.requiresUserConfirmation = false;
                    workflowDecision.mode = "plan_task";
                    workflowDecision.reason = "当前精确会话处于 Plan Mode，已由服务端阻止工具执行和任务派发";
                    if (modelDecision) {
                        modelDecision.state = "plan";
                        modelDecision.tool = undefined;
                        modelDecision.message = modelDecision.message || "已在 Plan Mode 中完成分析；退出 Plan Mode 后才能执行写操作。";
                    }
                }
                const responseType = modelDecision?.tool
                    ? "tool_calls"
                    : modelDecision?.state === "needs_confirmation" ? "clarify"
                        : modelDecision?.state === "plan" ? "plan"
                            : modelDecision?.state === "execute" ? "dispatch"
                                : "reply";
                const decision = (0, main_agent_turn_1.normalizeMainAgentTurnDecision)({
                    scope: "global",
                    scopeId: "global",
                    exactSessionId: String(run.session_id || input.sessionId || "default"),
                    turnId: String(run.turn_id || input.turnId || run.id),
                    parsed: { responseType, reply: modelDecision?.message || "" },
                    workflowDecision,
                    reply: modelDecision?.message || "",
                    toolRequests: modelDecision?.tool ? [{ name: modelDecision.tool.name, arguments: modelDecision.tool.arguments || {}, reason: modelDecision.message || "" }] : [],
                });
                const receipt = (0, main_agent_turn_1.createMainAgentTurnReceipt)({
                    decision,
                    modelCallIndex,
                    toolRound: Math.max(0, modelCallIndex - 1),
                    usage: run.latest_context_usage || null,
                    inputIdentity: { sessionId: run.session_id, turnId: run.turn_id || input.turnId || "", message: input.authorizationMessage || run.original_user_message || run.user_message },
                });
                run.main_agent_turn_decision = decision;
                run.main_agent_turn_receipt = receipt;
                input.onEvent?.({ type: "turn_decision", decision: (0, main_agent_turn_1.publicMainAgentTurnDecision)(decision), receipt });
                if (modelCallIndex !== 1)
                    return;
                const authorizationReceipt = (0, global_agent_authorization_1.buildGlobalWriteAuthorizationReceipt)({
                    turnId: String(run.turn_id || input.turnId || run.id),
                    sessionId: String(run.session_id || input.sessionId || "default"),
                    source: String(run.source || input.source || "web"),
                    message: String(input.authorizationMessage || run.original_user_message || run.user_message || ""),
                    workflowDecision,
                    principal: input.principal,
                    readOnly: input.readOnly,
                });
                if (input.readOnly === true && workflowDecision.actionRequired === true) {
                    throw Object.assign(new Error("当前 Viewer 账户仅允许只读问答；这条需求需要创建任务或执行写入操作，请联系 Operator 或 Admin"), { code: "VIEWER_EXECUTION_FORBIDDEN" });
                }
                run.write_authorization_receipt = authorizationReceipt;
                run.writeAuthorizationReceipt = authorizationReceipt;
                run.explicit_write_authorization = authorizationReceipt.allowed_risk === "write";
            },
            onEvent: input.onEvent ? (event) => input.onEvent(event) : undefined,
        };
        return runtime;
    }
    async function runAgenticGlobalRequest(baseUrl, ctx, input) {
        const sessionId = input.sessionId || "default";
        const visibleUserMessage = input.originalMessage || input.message;
        let deferredTerminalEvent = null;
        const runtimeEventSink = input.onEvent
            ? (event) => {
                if (["completed", "failed", "cancelled"].includes(String(event?.type || ""))) {
                    deferredTerminalEvent = event;
                    return;
                }
                input.onEvent?.(event);
            }
            : undefined;
        if (!/feishu/i.test(input.source || "")) {
            ingestGlobalAgentConversation({ sessionId, source: input.source || "web", messages: [...(input.history || []), { role: "user", content: visibleUserMessage, timestamp: new Date().toISOString(), trace_id: input.traceId }], compact: false });
        }
        const requestedClarificationRunId = String(input.clarificationRunId || "").trim();
        let clarificationCandidate = null;
        if (requestedClarificationRunId) {
            const requestedRun = getGlobalAgentRun(requestedClarificationRunId);
            if (!requestedRun || requestedRun.session_id !== sessionId)
                throw new Error("当前会话中没有这个待补充请求");
            if (requestedRun.status !== "waiting_clarification")
                throw new Error("这个请求已不再等待补充，请刷新后查看最新状态");
            clarificationCandidate = requestedRun;
        }
        else {
            clarificationCandidate = findClarifyingGlobalAgentRun(sessionId);
        }
        const runtime = createAgenticRuntime(baseUrl, ctx, {
            localIntent: null,
            onEvent: runtimeEventSink,
            sourceIngestion: input.sourceIngestion,
            knowledgeContext: "",
            principal: input.principal,
            readOnly: input.readOnly,
            turnId: input.turnId,
            sessionId,
            source: input.source || "web",
            authorizationMessage: visibleUserMessage,
            requestedTargetRefs: input.requestedTargetRefs || [],
        });
        const waitingClarification = requestedClarificationRunId ? clarificationCandidate : null;
        if (waitingClarification && Array.isArray(input.requestedTargetRefs) && input.requestedTargetRefs.length) {
            waitingClarification.requested_target_refs = input.requestedTargetRefs;
        }
        const run = waitingClarification
            ? await continueGlobalAgentRunWithClarification(waitingClarification.id, input.message, runtime, { turnId: input.turnId })
            : await startGlobalAgentRun({
                message: input.message,
                originalMessage: input.originalMessage || input.message,
                history: input.history || [],
                sessionId,
                source: input.source || "web",
                traceId: input.traceId,
                explicitWriteAuthorization: false,
                writeAuthorizationReceipt: null,
                authorizationMessage: visibleUserMessage,
                turnId: input.turnId,
                queueScope: input.queueScope,
                requestedTargetRefs: input.requestedTargetRefs || [],
                workflowDecision: null,
                directReply: "",
                maxSteps: 10,
                timeoutMs: 12 * 60 * 1000,
            }, runtime);
        attachGlobalRunRequirementSources(run, input.sourceIngestion);
        run.retryable = run.status === "failed";
        run.degraded = run.status === "failed" && /模型|provider|timeout|network|熔断/i.test(String(run.error || run.final_reply || ""));
        if (run.degraded)
            run.failure_category = "provider_unavailable";
        (0, global_agent_run_store_1.saveRun)(run, true);
        if (input.onEvent) {
            const canonicalReply = globalRunVisibleReply(run, "我已整理处理结果，技术细节已放入技术详情。");
            if (canonicalReply.trim())
                input.onEvent({ type: "text", text: canonicalReply, run_id: run.id, trace_id: run.trace_id, canonical: true });
            if (deferredTerminalEvent) {
                input.onEvent({
                    ...deferredTerminalEvent,
                    reply: run.final_reply,
                    run,
                });
                deferredTerminalEvent = null;
            }
        }
        let assistantMessageId = "";
        if (!/feishu/i.test(input.source || "")) {
            try {
                assistantMessageId = `gam_${String(run.id || "result")}_assistant`;
                ingestGlobalAgentConversation({
                    sessionId,
                    source: input.source || "web",
                    messages: [{
                            id: assistantMessageId,
                            role: "assistant",
                            content: globalRunVisibleReply(run, "我已整理处理结果，技术细节已放入技术详情。"),
                            technical_content: run.final_report?.technical_content || run.final_delivery_report?.technical_content || "",
                            timestamp: new Date().toISOString(),
                            trace_id: run.trace_id,
                            mission_id: run.mission_id,
                        }],
                    extractMemory: run.direct_reply_fast_path !== true,
                });
            }
            catch (error) {
                console.warn(`[全局记忆] Agentic 结果写入失败：${error?.message || error}`);
            }
        }
        try {
            recordGlobalAgentSessionProviderUsage(sessionId, {
                usage: run.latest_context_usage || null,
                provider: String(run.latest_context_usage?.provider || ""),
                model: String(run.latest_context_usage?.model || loadOrchestratorConfig()?.model || ""),
                anchorMessageId: assistantMessageId,
                currentRequest: { role: "user", content: input.message },
                fixedContext: { main_agent_loop: true },
                tools: run.direct_reply_fast_path === true ? [] : GLOBAL_AGENT_TOOL_SPECS.filter(spec => {
                    const loaded = new Set((run.loaded_tool_names || run.loadedToolNames || []).map(value => String(value || "")));
                    const deferred = workspace_readonly_tools_1.WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.find(tool => tool.loadPolicy === "search" && tool.name === spec.name);
                    return !deferred || loaded.has(deferred.name) || loaded.has(deferred.canonicalName);
                }),
                modelVisiblePayload: run.latest_model_visible_payload || null,
                contextComponents: (() => {
                    if (run.direct_reply_fast_path === true)
                        return { skills: [], mcpTools: [] };
                    const authorizedTools = (0, global_agent_tool_authorization_1.buildGlobalAgentToolRuntimeContext)({ taskId: run.id, sessionId: run.session_id, source: run.source || "global-agent-usage" }, run.loaded_tool_names || run.loadedToolNames || []);
                    return {
                        skills: authorizedTools.catalog.skills.map((skill) => ({ name: String(skill?.name || ""), contentHash: String(skill?.contentHash || "") })).filter((skill) => skill.name),
                        mcpTools: authorizedTools.catalog.tools.map((tool) => ({ name: String(tool?.canonicalName || tool?.name || ""), server: String(tool?.server || "") })).filter((tool) => tool.name),
                    };
                })(),
            });
        }
        catch (error) {
            console.warn(`[全局记忆] 上下文计量写入失败：${error?.message || error}`);
        }
        return run;
    }
    async function resumeGlobalAgentLoopsForServer(ctx, port) {
        const result = await recoverInterruptedGlobalAgentRuns(createAgenticRuntime(`http://127.0.0.1:${port}`, ctx));
        for (const run of result.results || []) {
            if (!["completed", "failed", "cancelled"].includes(run.status))
                continue;
            settleIdempotencyByTrace(run.trace_id, run.status === "completed" ? "completed" : "failed", { run_id: run.id, status: run.status, recovered: true }, ["global-agent-request", "feishu-control-message", "feishu-event"]);
        }
        return result;
    }
    function startGlobalMissionSupervisionForServer(ctx) {
        try {
            require("../collaboration/collaboration-task-runtime").bindTaskRuntimeCollabCtx(ctx);
        }
        catch { /* ignore bind failures during optional boot wiring */ }
        return startGlobalMissionSupervisorScheduler(createMissionSupervisorRuntime(ctx));
    }
    function bootstrapGlobalAgentMemoryForServer() {
        const store = loadGlobalAgentHistoryStore();
        const results = [];
        for (const session of store.sessions || []) {
            try {
                results.push(ingestGlobalAgentConversation({ sessionId: session.id, source: session.source || "history-migration", messages: session.messages || [] }));
            }
            catch (error) {
                results.push({ sessionId: session.id, error: error?.message || String(error) });
            }
        }
        return { total: (store.sessions || []).length, migrated: results.filter(item => !item.error).length, results };
    }
    function stopGlobalMissionSupervisionForServer() {
        stopGlobalMissionSupervisorScheduler();
    }
    return {
        hasExplicitGlobalWriteAuthorization, verifyGlobalAgentContextBoundary, buildGlobalAgentGroupMemoryModelContext, buildAgenticContext, localActionToAgenticDecision,
        createMissionSupervisorRuntime, createAgenticRuntime, runAgenticGlobalRequest, resumeGlobalAgentLoopsForServer,
        startGlobalMissionSupervisionForServer, bootstrapGlobalAgentMemoryForServer, stopGlobalMissionSupervisionForServer,
    };
}
//# sourceMappingURL=global-agent-agentic-runtime.js.map