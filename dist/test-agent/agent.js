"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTestAgent = runTestAgent;
const browser_verifier_1 = require("./browser-verifier");
const registry_1 = require("./browser/registry");
const tool_executor_1 = require("./browser/tool-executor");
const resource_lifecycle_1 = require("./browser/resource-lifecycle");
const authentication_summary_1 = require("./browser/authentication-summary");
const existing_session_1 = require("./browser/existing-session");
const shared_1 = require("./browser/shared");
const check_execution_coverage_1 = require("./browser/check-execution-coverage");
const artifacts_1 = require("./artifacts");
const command_planner_1 = require("./command-planner");
const command_runner_1 = require("./command-runner");
const dev_server_1 = require("./dev-server");
const http_verifier_1 = require("./http-verifier");
const result_builder_1 = require("./result-builder");
const utils_1 = require("./utils");
const work_order_1 = require("./work-order");
const user_visible_progress_1 = require("./user-visible-progress");
const artifact_retention_1 = require("./artifact-retention");
const role_skills_1 = require("../skills/role-skills");
const agentic_planner_1 = require("./agentic-planner");
const planning_fallback_1 = require("./planning-fallback");
const isolation_1 = require("./isolation");
const readonly_capabilities_1 = require("./readonly-capabilities");
const isolation_execution_gate_1 = require("./isolation-execution-gate");
const db_1 = require("../core/db");
function mergeProviderUsage(rows) {
    const total = rows.filter(row => row && typeof row === "object").reduce((sum, row) => {
        sum.inputTokens += Number(row.inputTokens || row.input_tokens || 0);
        sum.outputTokens += Number(row.outputTokens || row.output_tokens || 0);
        sum.directInputTokens += Number(row.directInputTokens || row.direct_input_tokens || 0);
        sum.cacheCreationInputTokens += Number(row.cacheCreationInputTokens || row.cache_creation_input_tokens || 0);
        sum.cacheReadInputTokens += Number(row.cacheReadInputTokens || row.cache_read_input_tokens || 0);
        sum.providerTotalTokens += Number(row.providerTotalTokens || row.provider_total_tokens || row.totalTokens || row.total_tokens || 0);
        sum.totalCostUsd += Number(row.totalCostUsd || row.total_cost_usd || row.costUsd || row.cost_usd || 0);
        return sum;
    }, { inputTokens: 0, outputTokens: 0, directInputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0, providerTotalTokens: 0, totalCostUsd: 0 });
    const reported = total.inputTokens > 0 || total.outputTokens > 0 || total.providerTotalTokens > 0 || total.totalCostUsd > 0;
    return reported
        ? { ...total, totalTokens: total.providerTotalTokens || total.inputTokens + total.outputTokens, reported: true, source: "provider_reported" }
        : { source: "local_no_model", reported: false };
}
async function runTestAgent(input, options = {}) {
    const startedAt = (0, utils_1.nowIso)();
    const providerUsages = [];
    const invocationAllowedWorkDirs = (0, utils_1.normalizeTestAgentAllowedWorkDirs)(options.allowedWorkDirs || (0, utils_1.configuredTestAgentAllowedWorkDirs)());
    const invocationOptions = {
        ...options,
        allowedWorkDirs: invocationAllowedWorkDirs,
    };
    const progressBoundInput = options.userVisibleProgressContext ? {
        ...input,
        metadata: { ...(input.metadata || {}), userVisibleProgressContext: options.userVisibleProgressContext },
    } : input;
    const normalized = (0, work_order_1.normalizeTestAgentWorkOrder)(progressBoundInput, invocationOptions);
    let isolatedSession = null;
    let planningInput = normalized.workOrder;
    let planningRuntimeOptions = { ...invocationOptions };
    try {
        const hardeningPolicy = (0, planning_fallback_1.resolveTestAgentHardeningPolicy)(normalized.workOrder);
        isolatedSession = await (0, isolation_1.prepareTestAgentIsolation)(normalized.workOrder, {
            riskLevel: hardeningPolicy.riskTier,
            mode: hardeningPolicy.isolationMode,
            executionId: normalized.workOrder.id,
        });
        planningInput = isolatedSession.workOrder;
        const isolatedExecutionWorkDirs = isolatedSession.receipt.status === "ready"
            ? isolatedSession.receipt.projectBindings.map(binding => binding.executionWorkDir)
            : [];
        planningRuntimeOptions = {
            ...planningRuntimeOptions,
            allowedWorkDirs: (0, utils_1.normalizeTestAgentAllowedWorkDirs)([
                ...invocationAllowedWorkDirs,
                ...isolatedExecutionWorkDirs,
            ]),
        };
        const selectedSkillNames = Array.isArray(planningInput.metadata?.selectedSkills)
            ? planningInput.metadata.selectedSkills
            : Array.isArray(planningInput.metadata?.workflowDecision?.selectedSkills)
                ? planningInput.metadata.workflowDecision.selectedSkills
                : [];
        const readonlyCapabilities = (0, readonly_capabilities_1.buildTestAgentReadonlyCapabilityManifest)({
            targetName: planningInput.projects[0]?.name || "test-agent",
            workDir: planningInput.projects[0]?.workDir || "",
            taskText: [planningInput.originalUserGoal, ...(planningInput.acceptanceCriteria || [])].join("\n"),
            selectedSkillNames,
        });
        planningInput.metadata = {
            ...(planningInput.metadata || {}),
            verificationHardening: {
                ...(planningInput.metadata?.verificationHardening || {}),
                readonlyCapabilityManifest: readonlyCapabilities.manifest,
                readonlyCapabilityRejected: {
                    mcp: readonlyCapabilities.rejectedMcp,
                    skill: readonlyCapabilities.rejectedSkills,
                },
            },
        };
        planningRuntimeOptions = {
            ...planningRuntimeOptions,
            readonlyCapabilityPrompt: readonlyCapabilities.prompt,
            readonlyCapabilityManifest: readonlyCapabilities.manifest,
        };
    }
    catch (error) {
        normalized.issues.push({
            severity: "error",
            code: "test_agent_isolation_prepare_failed",
            message: `TestAgent isolation preparation failed: ${String(error?.message || error).slice(0, 500)}`,
        });
    }
    const agentic = await (0, agentic_planner_1.applyAgenticTestPlanning)(planningInput, planningRuntimeOptions, normalized.issues);
    providerUsages.push(agentic.workOrder.metadata?.semanticDecisionReceipt?.usage);
    const planned = (0, command_planner_1.planVerificationCommands)(agentic.workOrder, [...normalized.issues, ...agentic.issues]);
    const isolationGate = (0, isolation_execution_gate_1.applyTestAgentIsolationExecutionGate)(planned.workOrder, isolatedSession);
    const workOrder = isolationGate.workOrder;
    const issues = [...planned.issues, ...isolationGate.issues];
    const modelSelectedSkills = Array.isArray(workOrder.metadata?.selectedSkills)
        ? workOrder.metadata.selectedSkills
        : Array.isArray(workOrder.metadata?.workflowDecision?.selectedSkills)
            ? workOrder.metadata.workflowDecision.selectedSkills
            : [];
    const roleSkills = (0, role_skills_1.selectRoleSkills)("test-agent", [
        workOrder.originalUserGoal,
        ...(workOrder.acceptanceCriteria || []),
        ...(workOrder.requiredChecks || []),
    ].join("\n"), { forceWork: true, phase: "verification", selectedSkillNames: modelSelectedSkills });
    workOrder.metadata = {
        ...workOrder.metadata,
        roleSkills: {
            schema: "ccm-role-skill-selection-v1",
            role: "test-agent",
            phase: "verification",
            applied: true,
            appliedBy: "ccm-native-test-agent-engine",
            selected: roleSkills.map(skill => ({ name: skill.name, kind: skill.kind, reason: skill.reason })),
        },
    };
    if ((0, shared_1.wantsBrowser)(workOrder)) {
        workOrder.metadata = {
            ...workOrder.metadata,
            browserCheckExecutionPlan: (0, check_execution_coverage_1.buildBrowserCheckExecutionPlan)(workOrder, options.browserProvider || workOrder.options.browserProvider),
        };
    }
    const suppressBrowserToolDetails = workOrder.projects.some(project => (0, shared_1.checksForProject)(project, workOrder.acceptanceCriteria).some(existing_session_1.browserExistingSessionUsesMinimalEvidence));
    const browserToolRecorder = options.browserToolExecutor
        ? (0, tool_executor_1.createRecordingBrowserToolExecutor)(options.browserToolExecutor, workOrder.options.artifactDir, {
            suppressDetails: suppressBrowserToolDetails,
            toolCallTimeoutMs: workOrder.options.browserTimeoutMs,
            userVisibleProgressContext: (0, user_visible_progress_1.testAgentVisibleProgressContext)(planningRuntimeOptions),
        })
        : null;
    const browserResourceLifecycle = (0, shared_1.wantsBrowser)(workOrder)
        ? (0, resource_lifecycle_1.createBrowserResourceLifecycleRecorder)()
        : null;
    const runtimeOptions = {
        ...planningRuntimeOptions,
        ...(browserToolRecorder ? {
            browserToolExecutor: browserToolRecorder.executor,
            browserToolCallScope: browserToolRecorder.runWithExecutionScope,
            browserToolCallIdsForExecution: browserToolRecorder.getRecordIdsForExecution,
        } : {}),
        ...(browserResourceLifecycle ? { browserResourceLifecycle } : {}),
    };
    const withRuntimeEnvironments = (source) => ({
        ...source,
        projects: source.projects.map(project => ({
            ...project,
            env: {
                ...(project.env || {}),
                ...(invocationOptions.runtimeProjectEnvironments?.[project.name] || {}),
            },
        })),
    });
    const executionWorkOrder = withRuntimeEnvironments(workOrder);
    const semanticPlanningBlocked = (0, planning_fallback_1.testAgentPlanningIsBlocked)(workOrder);
    let commandResults = [];
    let devServers = [];
    let httpResults = [];
    let browserResults = [];
    let browserProviderPreflight = [];
    try {
        if (semanticPlanningBlocked) {
            const planningStatus = String(workOrder.metadata?.planningReceipt?.status
                || workOrder.metadata?.verificationHardening?.planningReceipt?.status
                || workOrder.metadata?.agenticPlanning?.status
                || "blocked");
            const blocked = new Error(`TestAgent 语义规划未通过（${planningStatus}），已阻止执行验收命令和浏览器检查`);
            blocked.code = "CCM_TEST_AGENT_SEMANTIC_PLANNING_BLOCKED";
            throw blocked;
        }
        browserProviderPreflight = await (0, registry_1.collectBrowserProviderPreflight)(executionWorkOrder, runtimeOptions);
        workOrder.metadata = {
            ...workOrder.metadata,
            browserProviderPreflight,
        };
        commandResults = await (0, command_runner_1.runVerificationCommands)(executionWorkOrder);
        devServers = await (0, dev_server_1.startDevServersForBrowserChecks)(executionWorkOrder);
        httpResults = await (0, http_verifier_1.runHttpVerification)(executionWorkOrder);
        browserResults = await (0, browser_verifier_1.runBrowserVerification)(executionWorkOrder, runtimeOptions);
        const followup = await (0, agentic_planner_1.planAgenticTestFollowup)({ workOrder, commandResults, httpResults, browserResults }, runtimeOptions);
        providerUsages.push(followup.metadata?.providerUsage);
        workOrder.metadata = { ...workOrder.metadata, agenticFollowup: followup.metadata };
        if (followup.issue)
            issues.push(followup.issue);
        if (followup.workOrder) {
            const followupWorkOrder = withRuntimeEnvironments(followup.workOrder);
            commandResults.push(...await (0, command_runner_1.runVerificationCommands)(followupWorkOrder));
            if ((0, shared_1.wantsBrowser)(followupWorkOrder)) {
                const followupBrowserResults = await (0, browser_verifier_1.runBrowserVerification)(followupWorkOrder, {
                    ...runtimeOptions,
                    // Follow-up checks are focused diagnostics. They must not mutate the
                    // frozen primary browser execution plan or its lifecycle coverage.
                    browserResourceLifecycle: undefined,
                });
                const diagnosticResults = followupBrowserResults.map(result => {
                    const { execution: _execution, ...diagnostic } = result;
                    return {
                        ...diagnostic,
                        context: {
                            ...(diagnostic.context || {}),
                            agenticFollowup: true,
                        },
                    };
                });
                browserResults.push(...diagnosticResults);
                workOrder.metadata = {
                    ...workOrder.metadata,
                    agenticFollowup: {
                        ...(workOrder.metadata?.agenticFollowup || {}),
                        browserResults: diagnosticResults.map(result => ({
                            project: result.project,
                            name: result.name,
                            status: result.status,
                            provider: result.provider,
                            screenshots: result.screenshots || [],
                        })),
                    },
                };
            }
        }
        workOrder.metadata = {
            ...workOrder.metadata,
            browserAuthenticationSummary: (0, authentication_summary_1.buildBrowserAuthenticationSummary)(browserResults),
        };
    }
    catch (error) {
        if (error?.code !== "CCM_TEST_AGENT_SEMANTIC_PLANNING_BLOCKED") {
            issues.push({ severity: "error", code: "test_agent_runtime_error", message: error.message || String(error) });
        }
    }
    finally {
        for (const server of devServers) {
            try {
                server.stop();
            }
            catch { }
        }
        if (isolatedSession) {
            try {
                const cleanupReceipt = await isolatedSession.cleanup();
                const hardening = workOrder.metadata?.verificationHardening && typeof workOrder.metadata.verificationHardening === "object"
                    ? workOrder.metadata.verificationHardening
                    : {};
                workOrder.metadata = {
                    ...workOrder.metadata,
                    verificationHardening: {
                        ...hardening,
                        isolationReceipt: cleanupReceipt,
                    },
                };
                if (cleanupReceipt.status === "cleanup_failed" || cleanupReceipt.status === "recovery_required") {
                    issues.push({
                        severity: "error",
                        code: "test_agent_isolation_cleanup_failed",
                        message: `TestAgent isolation cleanup failed: ${String(cleanupReceipt.reason || cleanupReceipt.status).slice(0, 500)}`,
                    });
                }
            }
            catch (error) {
                issues.push({
                    severity: "error",
                    code: "test_agent_isolation_cleanup_failed",
                    message: `TestAgent isolation cleanup failed: ${String(error?.message || error).slice(0, 500)}`,
                });
            }
        }
    }
    const browserToolCalls = browserToolRecorder?.getRecords() || [];
    if (browserToolCalls.length && browserToolRecorder?.transcriptPath) {
        workOrder.metadata = {
            ...workOrder.metadata,
            browserToolTranscriptPath: browserToolRecorder.transcriptPath,
        };
    }
    const browserExecutionPlan = workOrder.metadata?.browserCheckExecutionPlan;
    if (browserExecutionPlan && !workOrder.metadata?.browserCheckExecutionCoverage) {
        const reconciled = (0, check_execution_coverage_1.reconcileBrowserCheckExecution)(browserExecutionPlan, browserResults);
        browserResults = reconciled.results;
        workOrder.metadata = {
            ...workOrder.metadata,
            browserCheckExecutionCoverage: reconciled.summary,
        };
    }
    workOrder.metadata = {
        ...workOrder.metadata,
        agentCacheNonModelOperations: {
            schema: "ccm-agent-cache-non-model-operations-v1",
            operations: [
                { kind: "command", capabilityStatus: "not_applicable", executedCount: commandResults.length },
                { kind: "http", capabilityStatus: "not_applicable", executedCount: httpResults.length },
                { kind: "browser", capabilityStatus: "not_applicable", executedCount: browserResults.length + browserToolCalls.length },
            ],
            excludedFromEligibleRequestCount: true,
            contentStored: false,
        },
    };
    const report = (0, result_builder_1.buildTestAgentReport)({
        workOrder,
        startedAt,
        issues,
        commandResults,
        devServerResults: devServers.map(server => server.result),
        httpResults,
        browserResults,
        browserToolCalls,
        browserResourceLifecycleEvents: browserResourceLifecycle?.getEvents() || [],
    });
    const written = (0, artifacts_1.writeTestAgentArtifacts)(report);
    (0, artifact_retention_1.pruneTestAgentArtifacts)({ excludeDirs: [written.artifactDir] });
    if (options.recordMetrics !== false) {
        const project = written.metadata?.project || workOrder.projects[0]?.name || "test-agent";
        const groupId = String(written.groupId || workOrder.groupId || "");
        (0, db_1.recordMetric)("test-agent", {
            status: written.status === "passed" ? "completed" : written.status === "blocked" ? "blocked" : "failed",
            success: written.status === "passed",
            durationMs: written.durationMs,
            scopeType: groupId ? "group" : "project",
            scopeId: groupId || project,
            groupId,
            projectId: project,
            role: "test_agent",
            source: "native-test-agent",
            runtime: providerUsages.some(Boolean) ? "native-test-agent+model-planner" : "native-test-agent",
            taskId: written.taskId || workOrder.taskId,
            executionId: written.id || workOrder.id,
            usageAnchorId: `test-agent:${written.id || workOrder.id}`,
            usage: mergeProviderUsage(providerUsages),
            timing: { totalMs: written.durationMs, verificationMs: written.durationMs },
            error: written.status === "passed" ? "" : written.summary,
        });
    }
    return written;
}
//# sourceMappingURL=agent.js.map