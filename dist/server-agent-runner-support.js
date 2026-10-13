"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgentRunnerSupport = createAgentRunnerSupport;
// Support helpers extracted from server-agent-runner.ts (behavior-freeze).
// Contains tool/verification/external-runner plumbing used by the three orchestrators.
const third_party_memory_snapshot_1 = require("./integrations/third-party-memory-snapshot");
const internal_mcp_runtime_1 = require("./integrations/internal-mcp-runtime");
const db_1 = require("./core/db");
const project_verification_discovery_1 = require("./agents/project-verification-discovery");
const agent_run_store_1 = require("./agents/agent-run-store");
const agent_execution_coordinator_1 = require("./agents/agent-execution-coordinator");
const agent_run_workspace_1 = require("./agents/agent-run-workspace");
const external_runner_fence_1 = require("./agents/external-runner-fence");
const dispatch_tool_continuation_1 = require("./agents/dispatch-tool-continuation");
const dispatch_runtime_launch_1 = require("./agents/dispatch-runtime-launch");
const dispatch_tool_loop_result_1 = require("./agents/dispatch-tool-loop-result");
function createAgentRunnerSupport(deps) {
    const { AGENT_RUNNER_DIR, AGENT_RUNNER_REQUESTS_DIR, AGENT_RUNNER_RESULTS_DIR, UPLOAD_DIR, acknowledgeProviderMemoryChannelLaunch, appendDirectAgentDispatchTranscript, bindProjectRunAgentSession, bindProviderMemoryChannelLaunch, broadcastPetSpeech, buildAgentCommand, buildNativeSessionContinuationEvidence, buildProjectConversationBrief, buildProjectExecutionBrief, buildRuntimeToolDispatchGate, buildRuntimeToolSyncPrompt, buildToolAuthorizationPayload, captureAgentRuntimeVersionSnapshot, completeDirectAgentDispatch, createDirectAgentDispatchRequest, createFileChangeSnapshot, createProjectChatRun, detectAgentCommandFailure, extractNativeModelCapabilityReceipt, extractProviderToolAccessEvidence, fs, getAgentCommandLabel, getAgentRunActivityDuration, getAgentRuntime, getFileChanges, getRuntimeExecutionEnv, isSafeVerificationCommand, loadProjectConfigs, markDirectAgentDispatchStarted, normalizeAgentCommandOutput, normalizeAgentRuntimeId, path, persistBoundedOutput, prepareProviderMemoryChannel, publicProjectChatRun, readMemoryContextConsumptionReceipt, recordMetric, recordModelCapabilityRefreshOutcome, recordRuntimeToolSyncAudit, recordTaskAgentSessionTurn, recordVerifiedNativeModelCapabilityReceipt, recoverMemoryContextConsumptionReceipt, registerExternalRunnerRequest, runManagedCommand, runToolCallLoop, sanitizeExecutionEnv, saveProjectChatRuns, sendJson, setAgentActivity, spawn, syncRuntimeTools, terminateManagedChildProcess, toolManager, trackManagedChildProcess, verifyNativeSessionContinuationEvidence, verifyProviderMemoryChannelEvidence, writeSse } = deps;
    function normalizeToolSelection(tools = {}) {
        const source = tools && typeof tools === "object" ? tools : {};
        return {
            mcp: Array.isArray(source.mcp) ? source.mcp.map((x) => String(x).trim()).filter(Boolean).sort() : [],
            skill: Array.isArray(source.skill) ? source.skill.map((x) => String(x).trim()).filter(Boolean).sort() : [],
        };
    }
    function hasToolSelection(tools = {}) {
        const normalized = normalizeToolSelection(tools);
        return normalized.mcp.length > 0 || normalized.skill.length > 0;
    }
    function buildAgentRunnerRuntimeToolPayload(projectName, agentType, allowedTools = null, mcpConfigPath = "", executionInfo = null) {
        const providedSnapshot = executionInfo?.runtimeToolSnapshot || executionInfo?.runtime_tool_snapshot || null;
        const snapshotPath = providedSnapshot ? "" : findRuntimeToolSnapshotPath(mcpConfigPath);
        const loadedSnapshot = providedSnapshot || readJsonFileSafe(snapshotPath) || null;
        const runtimeToolSnapshot = loadedSnapshot
            ? normalizeAgentRunnerRuntimeToolSnapshot({
                ...loadedSnapshot,
                snapshotPath: loadedSnapshot.snapshotPath || loadedSnapshot.snapshot_path || snapshotPath,
                mcpConfigPath: loadedSnapshot.mcpConfigPath || loadedSnapshot.mcp_config_path || mcpConfigPath,
            }, allowedTools, mcpConfigPath)
            : normalizeAgentRunnerRuntimeToolSnapshot({
                snapshotPath,
                mcpConfigPath,
                allowedTools: allowedTools || { mcp: [], skill: [] },
            }, allowedTools, mcpConfigPath);
        const boundTaskId = String(executionInfo?.taskId || executionInfo?.task_id || "");
        const boundTask = boundTaskId ? (0, db_1.loadTasks)().find((item) => String(item?.id || "") === boundTaskId) : null;
        const scopeIdentity = {
            projectName: String(projectName || ""),
            groupId: String(executionInfo?.groupId || executionInfo?.group_id || ""),
            exactSessionId: String(executionInfo?.groupSessionId || executionInfo?.group_session_id || executionInfo?.projectSessionId || executionInfo?.project_session_id || boundTask?.group_session_id || boundTask?.project_session_id || ""),
            taskId: boundTaskId,
            taskAgentSessionId: String(executionInfo?.taskAgentSessionId || executionInfo?.task_agent_session_id || executionInfo?.agentSession?.id || ""),
            nativeGeneration: Number(executionInfo?.nativeGeneration || executionInfo?.native_generation || executionInfo?.agentSession?.nativeGeneration || 0),
            runtime: normalizeAgentRuntimeId(agentType || runtimeToolSnapshot.runtime || "claudecode"),
            ...(executionInfo?.communicationMessageId ? { communicationBinding: {
                    messageId: String(executionInfo.communicationMessageId), generation: Number(executionInfo.communicationGeneration || 0),
                    attempt: Number(executionInfo.communicationAttempt || 0), leaseId: String(executionInfo.communicationLeaseId || ""),
                } } : {}),
        };
        const authorizationCore = {
            schema: "ccm-runtime-tool-authorization-snapshot-v2",
            snapshotId: String(runtimeToolSnapshot.snapshotId || ""),
            catalogRevision: String(runtimeToolSnapshot.catalogRevision || ""),
            configuredTools: normalizeToolSelection(runtimeToolSnapshot.configuredTools || {}),
            executionRoleSkills: Array.from(new Set((runtimeToolSnapshot.executionRoleSkills || []).map((item) => String(item || "").trim()).filter(Boolean))).sort(),
            enforceExecutionRoleSkills: runtimeToolSnapshot.enforceExecutionRoleSkills === true,
            effectiveTools: normalizeToolSelection(runtimeToolSnapshot.effectiveTools || runtimeToolSnapshot.allowedTools || {}),
            scopeIdentity,
        };
        Object.assign(runtimeToolSnapshot, authorizationCore, {
            authorizationSignature: (0, internal_mcp_runtime_1.signInternalMcpEvidence)(authorizationCore),
        });
        const runtimeToolDispatchGate = executionInfo?.runtimeToolDispatchGate
            || executionInfo?.runtime_tool_dispatch_gate
            || runtimeToolSnapshot.dispatchGate
            || runtimeToolSnapshot.dispatch_gate
            || null;
        return {
            runtimeToolSnapshot,
            runtimeToolDispatchGate,
            runtimeToolSnapshotPath: runtimeToolSnapshot.snapshotPath || "",
            runtimeToolSnapshotRequired: !!(mcpConfigPath || runtimeToolSnapshot.snapshotPath || hasToolSelection(allowedTools)),
        };
    }
    function normalizeVerificationCommands(value) {
        const raw = Array.isArray(value) ? value : (typeof value === "string" ? value.split(/\r?\n|,/) : []);
        const seen = new Set();
        const commands = [];
        for (const item of raw) {
            const command = String(item || "").trim();
            if (!command || seen.has(command))
                continue;
            seen.add(command);
            commands.push(command);
        }
        return commands.slice(0, 8);
    }
    function extractVerificationCommandsFromMessage(message) {
        const text = String(message || "");
        const commands = [];
        const add = (value) => {
            for (const part of value.split(/[；;，,]/)) {
                const command = part.trim();
                if (/^(npm run [\w:-]+|mvn \w+|gradle \w+|pytest|go test\b.*|cargo test\b.*)$/i.test(command))
                    commands.push(command);
            }
        };
        for (const match of text.matchAll(/推荐优先执行的项目验证：([^\n]+)/g))
            add(match[1] || "");
        for (const match of text.matchAll(/验证命令：([^\n]+)/g))
            add(match[1] || "");
        return normalizeVerificationCommands(commands);
    }
    function buildAgentCliAllowedTools(projectName, message = "") {
        const commands = normalizeVerificationCommands([
            ...getProjectVerificationCommandsForRunner(projectName),
            ...extractVerificationCommandsFromMessage(message),
        ]);
        const rules = [];
        for (const command of commands) {
            rules.push(`Bash(${command})`);
            if (process.platform === "win32")
                rules.push(`PowerShell(${command})`);
        }
        return Array.from(new Set(rules));
    }
    function isSpawnPermissionError(error) {
        const text = `${error?.code || ""} ${error?.message || ""} ${error?.stderr || ""}`;
        return /\bEPERM\b|spawnSync .* EPERM|spawn .* EPERM/i.test(text);
    }
    function nativeContinuationDoneFields(evidence) {
        return {
            requestedNativeSessionId: String(evidence?.requestedNativeSessionId || ""),
            returnedNativeSessionId: String(evidence?.returnedNativeSessionId || ""),
            effectiveNativeSessionId: String(evidence?.effectiveNativeSessionId || ""),
            nativeSessionEvidenceSource: String(evidence?.evidenceSource || "missing"),
            nativeResumeRequested: evidence?.nativeResumeRequested === true,
            nativeContinuationAcknowledged: evidence?.nativeContinuationAcknowledged === true,
            nativeSessionReusable: evidence?.nativeSessionReusable === true,
            providerOutputContractStatus: String(evidence?.providerOutputContractStatus || ""),
            providerOutputFormatFingerprint: String(evidence?.providerOutputFormatFingerprint || ""),
            providerRuntimeVersion: String(evidence?.providerRuntimeVersion || ""),
            providerRuntimeVersionStatus: String(evidence?.providerRuntimeVersionStatus || ""),
            providerContractId: String(evidence?.providerContractId || ""),
            expectedProviderContractId: String(evidence?.expectedProviderContractId || ""),
            providerContractTransition: evidence?.providerContractTransition === true,
            providerContractContinuityVerified: evidence?.providerContractContinuityVerified === true,
            nativeContinuationEvidence: evidence || null,
        };
    }
    async function callAgentViaExternalRunner(projectName, message, workDir, agentType, timeoutMs, allowedTools = null, mcpConfigPath = "", agentSession = null, executionInfo = null) {
        const initial = await callAgentViaExternalRunnerRaw(projectName, message, workDir, agentType, timeoutMs, allowedTools, mcpConfigPath, agentSession, executionInfo);
        let continuationRunId = initial.agentRunId;
        let continuationEvidence = initial.nativeContinuationEvidence;
        const loop = await continueAgentToolCalls({
            output: initial.output,
            nativeSessionId: initial.nativeSessionId,
            projectName,
            workDir,
            agentType,
            timeoutMs,
            allowedTools,
            mcpConfigPath,
            agentSession,
            taskId: String(executionInfo?.taskId || initial.runnerRequestId),
            executionId: String(executionInfo?.executionId || ""),
            groupId: String(executionInfo?.groupId || executionInfo?.group_id || ""),
            onEvent: executionInfo?.onToolEvent,
            continueAgent: async (prompt, state) => {
                const binding = (0, dispatch_tool_continuation_1.bindDispatchToolContinuation)({ taskId: executionInfo?.taskId, executionId: executionInfo?.executionId, parentRunId: continuationRunId, agentType: normalizeAgentRuntimeId(agentType), round: state.round });
                await (0, dispatch_tool_continuation_1.observeDispatchToolContinuation)(binding, continuationEvidence);
                const continuationSession = {
                    ...(agentSession || {}),
                    persistSession: true,
                    resumeSession: !!state.nativeSessionId,
                    sessionId: state.nativeSessionId || "",
                };
                const next = await callAgentViaExternalRunnerRaw(projectName, prompt, workDir, agentType, timeoutMs, allowedTools, mcpConfigPath, continuationSession, {
                    ...executionInfo,
                    taskId: `${executionInfo?.taskId || initial.runnerRequestId}-tool-${state.round}`,
                    ...(binding || {}),
                    parentRunId: continuationRunId || executionInfo?.agentRunId || executionInfo?.agent_run_id || "",
                    groupId: executionInfo?.groupId || executionInfo?.group_id || "",
                    skipVerification: true,
                });
                continuationRunId = next.agentRunId || continuationRunId;
                continuationEvidence = next.nativeContinuationEvidence || continuationEvidence;
                return { output: next.output, nativeSessionId: next.nativeSessionId || state.nativeSessionId };
            },
        });
        (0, dispatch_tool_loop_result_1.assertDispatchToolLoopResult)(String(executionInfo?.taskId || ""), loop);
        return { ...initial, agentRunId: continuationRunId, nativeContinuationEvidence: continuationEvidence, output: loop.output, nativeSessionId: loop.nativeSessionId || initial.nativeSessionId };
    }
    function getProjectToolSelection(projectName) {
        const configs = loadProjectConfigs();
        return normalizeToolSelection(configs?.[projectName]?.tools || {});
    }
    function findRuntimeToolSnapshotPath(mcpConfigPath = "") {
        const configPath = String(mcpConfigPath || "").trim();
        if (!configPath)
            return "";
        const configDir = path.dirname(configPath);
        const candidates = [
            path.join(configDir, "runtime-tool-snapshot.json"),
            path.join(path.dirname(configDir), "runtime-tool-snapshot.json"),
        ];
        return candidates.find(candidate => fs.existsSync(candidate)) || "";
    }
    function readJsonFileSafe(file = "") {
        try {
            return file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8").replace(/^\uFEFF/, "")) : null;
        }
        catch {
            return null;
        }
    }
    function runtimeToolSnapshotFromAudit(audit = {}, allowedTools = {}) {
        const dispatchGate = audit.dispatch_gate || audit.dispatchGate || null;
        const authorizationReadiness = audit.authorization_readiness || audit.authorizationReadiness || null;
        const configuredTools = normalizeToolSelection(allowedTools?.configuredTools || allowedTools?.configured_tools || allowedTools);
        const executionRoleSkills = Array.from(new Set((allowedTools?.executionRoleSkills || allowedTools?.execution_role_skills || []).map((item) => String(item || "").trim()).filter(Boolean)));
        const effectiveTools = normalizeToolSelection(allowedTools || audit.requested || {});
        return {
            schema: "ccm-runtime-tool-authorization-snapshot-v2",
            snapshotId: String(audit.snapshotId || audit.snapshot_id || ""),
            snapshotPath: String(audit.snapshotPath || audit.snapshot_path || ""),
            mcpConfigPath: String(audit.mcpConfigPath || audit.mcp_config_path || ""),
            runtime: normalizeAgentRuntimeId(audit.runtime || ""),
            allowedTools: effectiveTools,
            requested: effectiveTools,
            configuredTools,
            executionRoleSkills,
            enforceExecutionRoleSkills: allowedTools?.enforceExecutionRoleSkills === true || allowedTools?.enforce_execution_role_skills === true,
            effectiveTools,
            permissionRules: Array.isArray(audit.permission_rules) ? audit.permission_rules : [],
            permission_rules: Array.isArray(audit.permission_rules) ? audit.permission_rules : [],
            authorizationReadiness,
            authorization_readiness: authorizationReadiness,
            dispatchGate,
            dispatch_gate: dispatchGate,
            catalogRevision: String(audit.catalogRevision || ""),
        };
    }
    function normalizeAgentRunnerRuntimeToolSnapshot(snapshot = {}, allowedTools = null, mcpConfigPath = "") {
        const source = snapshot && typeof snapshot === "object" ? snapshot : {};
        const dispatchGate = source.dispatchGate || source.dispatch_gate || null;
        const authorizationReadiness = source.authorizationReadiness || source.authorization_readiness || null;
        return {
            ...source,
            snapshotId: String(source.snapshotId || source.snapshot_id || ""),
            snapshotPath: String(source.snapshotPath || source.snapshot_path || ""),
            mcpConfigPath: String(source.mcpConfigPath || source.mcp_config_path || mcpConfigPath || ""),
            runtime: normalizeAgentRuntimeId(source.runtime || ""),
            allowedTools: normalizeToolSelection(allowedTools || source.allowedTools || source.allowed_tools || source.effectiveTools || source.effective_tools || source.requested || {}),
            requested: source.requested || allowedTools || source.allowedTools || source.allowed_tools || { mcp: [], skill: [] },
            configuredTools: normalizeToolSelection(source.configuredTools || source.configured_tools || allowedTools?.configuredTools || allowedTools?.configured_tools || allowedTools || {}),
            executionRoleSkills: Array.from(new Set((source.executionRoleSkills || source.execution_role_skills || allowedTools?.executionRoleSkills || allowedTools?.execution_role_skills || []).map((item) => String(item || "").trim()).filter(Boolean))),
            enforceExecutionRoleSkills: source.enforceExecutionRoleSkills === true || source.enforce_execution_role_skills === true || allowedTools?.enforceExecutionRoleSkills === true,
            effectiveTools: normalizeToolSelection(source.effectiveTools || source.effective_tools || allowedTools || source.allowedTools || source.requested || {}),
            permissionRules: source.permissionRules || source.permission_rules || [],
            permission_rules: source.permission_rules || source.permissionRules || [],
            authorizationReadiness,
            authorization_readiness: authorizationReadiness,
            dispatchGate,
            dispatch_gate: dispatchGate,
            catalogRevision: String(source.catalogRevision || source.catalog_revision || ""),
        };
    }
    function getProjectVerificationCommandsForRunner(projectName, workDir = "") {
        const configs = loadProjectConfigs();
        const projectConfig = configs?.[projectName] || {};
        const configured = normalizeVerificationCommands(projectConfig.verification_commands
            || projectConfig.verificationCommands
            || projectConfig.test_commands
            || projectConfig.testCommands
            || projectConfig.check_commands
            || projectConfig.checkCommands);
        return configured.length ? configured : (0, project_verification_discovery_1.discoverProjectVerificationCommands)(workDir);
    }
    async function runIndependentProjectVerification(projectName, workDir, timeoutMs, taskId, executionId, agentType) {
        const task = (0, db_1.loadTasks)().find((row) => row.id === taskId);
        const configured = task?.dispatch_profile_snapshot?.profile === "light"
            ? normalizeVerificationCommands(task.verification_commands || task.verificationCommands || [])
            : getProjectVerificationCommandsForRunner(projectName, workDir);
        const commands = (task?.dispatch_profile_snapshot?.profile === "light" && !configured.length ? ["git diff --check"] : configured).filter(isSafeVerificationCommand);
        if (!commands.length || !workDir)
            return "";
        const verification = [];
        const failed = [];
        const results = [];
        const perCommandTimeout = Math.max(30_000, Math.min(timeoutMs || 300_000, 180_000));
        for (const command of commands) {
            try {
                const managed = await runManagedCommand({
                    taskId,
                    executionId,
                    command,
                    cwd: workDir,
                    timeoutMs: perCommandTimeout,
                    maxOutputBytes: 5 * 1024 * 1024,
                    env: sanitizeExecutionEnv(getRuntimeExecutionEnv(agentType), []),
                });
                verification.push(`${command} passed by external runner (exit 0)`);
                results.push({ command, status: "passed", exitCode: 0, output: String(managed.stdout || "").slice(-4000) });
            }
            catch (error) {
                const exitCode = error?.exitCode ?? error?.status ?? null;
                failed.push(`${command} failed by external runner${exitCode === null ? "" : ` (exit ${exitCode})`}`);
                results.push({ command, status: "failed", exitCode, output: String(error?.stdout || error?.stderr || error?.message || error || "").slice(-4000) });
            }
        }
        return "\n\nCCM_RUNNER_VERIFICATION\n```json\n" + JSON.stringify({
            ccm_runner_verification: true,
            status: failed.length ? "failed" : "passed",
            verification,
            failed,
            results,
        }, null, 2) + "\n```";
    }
    function buildProjectToolContext(projectName, workDir = "", agentType = "claudecode", options = {}) {
        const configuredTools = normalizeToolSelection(getProjectToolSelection(projectName));
        const selectedRoleSkills = Array.isArray(options.selectedRoleSkills) ? options.selectedRoleSkills : [];
        const roleSkillNames = selectedRoleSkills.map((item) => String(item?.name || item || "").trim()).filter(Boolean);
        const toolAuth = buildToolAuthorizationPayload({
            mcp: configuredTools.mcp,
            skill: Array.from(new Set([...configuredTools.skill, ...roleSkillNames])),
        });
        const allowedTools = toolAuth.tools;
        const audit = syncRuntimeTools(workDir, agentType, allowedTools, {
            authorizationReadiness: toolAuth.authorization_readiness,
            internalMcpServers: options.internalMcpServers || {},
        });
        audit.authorization_readiness = toolAuth.authorization_readiness;
        audit.dispatch_gate = buildRuntimeToolDispatchGate(audit);
        recordRuntimeToolSyncAudit(audit, projectName);
        const hasKnowledgeMcp = (audit.internal_mcp || []).some((item) => item.name === "ccm__knowledge_context" && item.state === "synced");
        const hasPermissionBrokerMcp = (audit.internal_mcp || []).some((item) => item.name === "ccm__permission_broker" && item.state === "synced");
        const knowledgePrompt = hasKnowledgeMcp ? [
            "",
            "[CCM 知识库使用规则]",
            "- 当前任务提供签名作用域知识工具。任务涉及业务规范、历史文档、接口约定或用户明确要求查资料时，先调用 ccm__knowledge_context.search_knowledge。",
            "- 需要完整原文时再调用 read_knowledge_document；不得通过文件名读取作用域之外的文档。",
            "- 使用知识结论时在交付中保留 [source:引用标识]；未命中时明确说明，不得编造资料内容。",
        ].join("\n") : "";
        const permissionPrompt = hasPermissionBrokerMcp ? [
            "",
            "[CCM 分级权限规则]",
            "- 项目工作区内的读取、编辑、构建、测试和普通依赖安装按任务包默认权限执行。",
            "- 超出默认范围前调用 ccm__permission_broker.request_execution_permission；绑定命令的授权必须通过 execute_approved_command 执行，非命令授权才调用 consume_execution_permission。",
            "- awaiting_user、rejected、expired 或 consumed 均表示不得执行；应报告阻塞并等待主 Agent 或用户。",
            "- 发布、生产部署、强推、密钥读取、系统提权、项目外路径和破坏性数据库操作不能由子 Agent 自行决定，也不能绕开 CCM 工具直接执行。",
        ].join("\n") : "";
        const prompt = [
            String(options.roleSkillPrompt || "").trim(),
            toolManager.buildToolPrompt(allowedTools) + buildRuntimeToolSyncPrompt(audit) + knowledgePrompt + permissionPrompt,
        ].filter(Boolean).join("\n\n");
        const mcpStatuses = Array.isArray(audit.mcp_statuses) ? audit.mcp_statuses : [];
        const nativeMcpCount = mcpStatuses.length ? mcpStatuses.filter((item) => item.state === "synced").length : audit.synced.mcp.length;
        const proxyMcpCount = mcpStatuses.filter((item) => item.state === "proxy_only").length;
        const authorizationSuffix = toolAuth.authorization_readiness?.dispatchReady === false ? "；授权需处理缺失项" : "";
        const workEvent = {
            id: "we" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            time: new Date().toISOString(),
            agent: projectName,
            kind: audit.mode === "failed" ? "error" : "tool",
            text: audit.mode === "native-and-proxy"
                ? `${projectName} (${audit.runtime}/${audit.isolation || "project-scope"}) 已交付工具：原生 MCP ${nativeMcpCount}，代理 MCP ${proxyMcpCount}，Skill ${audit.synced.skill.length}${authorizationSuffix}${audit.warnings?.length ? `；${audit.warnings.join("；")}` : ""}`
                : audit.mode === "ccm-proxy-only"
                    ? `${projectName} (${audit.runtime}) 使用 CCM 工具代理模式`
                    : `${projectName} Runtime 工具同步失败：${audit.errors.join("；") || "未知错误"}`,
            runtimeToolSync: audit,
        };
        if (audit.dispatch_gate.dispatchReady === false) {
            workEvent.kind = "error";
            workEvent.text = `${projectName} 工具授权派发已阻断：${audit.dispatch_gate.reason}`;
        }
        return {
            prompt,
            allowedTools,
            audit,
            workEvent,
            dispatchGate: audit.dispatch_gate,
            runtimeToolSnapshot: runtimeToolSnapshotFromAudit(audit, allowedTools),
            selectedRoleSkills: selectedRoleSkills.map((item) => ({ name: item.name, kind: item.kind, reason: item.reason })),
        };
    }
    function sendRuntimeToolDispatchBlocked(res, toolContext) {
        const gate = toolContext?.dispatchGate || toolContext?.audit?.dispatch_gate || {};
        return sendJson(res, {
            success: false,
            error: gate.reason || "MCP/Skill 授权未就绪，已阻止派发子 Agent",
            runtime_tool_dispatch_gate: gate,
            runtime_tool_sync: toolContext?.audit || null,
        }, 409);
    }
    function ensureAgentRunnerDirs() {
        for (const dir of [AGENT_RUNNER_DIR, AGENT_RUNNER_REQUESTS_DIR, AGENT_RUNNER_RESULTS_DIR, UPLOAD_DIR]) {
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
        }
    }
    function cleanupAgentRunnerEphemeralResults(maxAgeMs = 24 * 60 * 60 * 1000) {
        ensureAgentRunnerDirs();
        const now = Date.now();
        let removed = 0;
        for (const name of fs.readdirSync(AGENT_RUNNER_RESULTS_DIR)) {
            if (!/^[a-zA-Z0-9_.-]+\.json$/.test(String(name || "")))
                continue;
            const file = path.join(AGENT_RUNNER_RESULTS_DIR, name);
            try {
                const stat = fs.statSync(file);
                if (!stat.isFile() || now - stat.mtimeMs < Math.max(60_000, maxAgeMs))
                    continue;
                fs.unlinkSync(file);
                removed += 1;
            }
            catch { }
        }
        return { removed, contentStored: false };
    }
    // 外部Runner结果可能含用于一次性归一化的stdout。服务恢复时清理已无人
    // 等待的过期结果；活跃/刚结束任务仍保留一个恢复窗口。
    cleanupAgentRunnerEphemeralResults();
    async function createAgentRunnerRequest(projectName, message, workDir, agentType, timeoutMs, allowedTools = null, mcpConfigPath = "", agentSession = null, executionInfo = null) {
        ensureAgentRunnerDirs();
        const id = `ar_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const leaseOwnerId = `agent-runner:${id}`;
        const groupId = String(executionInfo?.groupId || executionInfo?.group_id || executionInfo?.toolScope?.groupId || executionInfo?.tool_scope?.group_id || "");
        const groupSessionId = String(executionInfo?.groupSessionId || executionInfo?.group_session_id || "");
        const sessionLifecycleFence = executionInfo?.sessionLifecycleFence || executionInfo?.session_lifecycle_fence || null;
        const runtimeToolPayload = buildAgentRunnerRuntimeToolPayload(projectName, agentType, allowedTools, mcpConfigPath, { ...(executionInfo || {}), agentSession: agentSession || null });
        const runtimeId = normalizeAgentRuntimeId(agentType || "claudecode");
        const taskId = String(executionInfo?.taskId || "");
        const executionId = String(executionInfo?.executionId || taskId || "");
        let agentRunId = String(executionInfo?.agentRunId || executionInfo?.agent_run_id || "");
        let heartbeatWakeId = String(executionInfo?.heartbeatWakeId || executionInfo?.heartbeat_wake_id || "");
        if (agentSession?.resumeSession === true && (0, db_1.loadTasks)().find((task) => task.id === taskId)?.dispatch_profile_snapshot) {
            const nativeId = String(agentSession.sessionId || "");
            const previous = agentRunId ? (0, agent_run_store_1.getAgentRun)(agentRunId) : (0, agent_run_store_1.listAgentRuns)({ taskId }).find(run => run.runtimeId === runtimeId && run.nativeSessionId === nativeId);
            if (!previous || previous.taskId !== taskId || previous.runtimeId !== runtimeId || previous.nativeSessionId !== nativeId)
                throw Object.assign(new Error("外部 Runner 原生续跑缺少关联 Run"), { code: "CCM_DISPATCH_RESUME_UNVERIFIED" });
            const inspected = await require("./agents/dispatch-resume-inspection").inspectDispatchResume({ ...previous, workspacePath: workDir, options: { mcpConfigPath } });
            if (!inspected.resumable)
                throw Object.assign(new Error(`外部 Runner 续跑证据不足：${inspected.reason}`), { code: "CCM_DISPATCH_RESUME_UNVERIFIED" });
        }
        if (!agentRunId && (taskId || executionId || executionInfo?.persistAgentRun === true)) {
            const identity = require("./agents/dispatch-task-retry-identity").resolveTaskDispatchExecutionIdentity(taskId, executionInfo?.attemptId || executionInfo?.attempt_id, executionInfo?.parentRunId || executionInfo?.parent_run_id);
            const coordinated = await (0, agent_execution_coordinator_1.startPersistentAgentExecution)({
                agentId: executionInfo?.agentId || executionInfo?.agent_id || runtimeId,
                scope: executionInfo?.scope || (groupId ? "group" : executionInfo?.source === "global-agent" ? "global" : String(executionInfo?.source || "").includes("automation") ? "automation" : "project"),
                scopeId: executionInfo?.scopeId || executionInfo?.scope_id || groupId || projectName || taskId,
                taskId,
                traceId: executionInfo?.traceId || executionInfo?.trace_id || (0, db_1.loadTasks)().find((task) => task.id === taskId)?.trace_id || `task:${taskId}`,
                attemptId: identity.attemptId || `attempt:${executionId || taskId}`,
                parentRunId: identity.parentRunId,
                runtimeId,
                runtimeVersionSnapshot: executionInfo?.runtimeVersionSnapshot || executionInfo?.runtime_version_snapshot || captureAgentRuntimeVersionSnapshot(runtimeId),
                taskAgentSessionId: executionInfo?.taskAgentSessionId || executionInfo?.task_agent_session_id,
                workItemId: executionInfo?.workItemId || executionInfo?.work_item_id,
                nativeSessionId: executionInfo?.nativeSessionId || executionInfo?.native_session_id || agentSession?.sessionId,
                executionId,
                workspacePath: workDir,
                worktreeId: executionInfo?.worktreeId || executionInfo?.worktree_id,
                triggerType: executionInfo?.triggerType || executionInfo?.trigger_type || "user",
                reason: executionInfo?.heartbeatReason || executionInfo?.heartbeat_reason || executionInfo?.triggerType || "assignment",
                idempotencyKey: require("./agents/dispatch-rework-execution-key").persistedDispatchReworkExecutionKey(taskId, executionId, executionInfo?.idempotencyKey || executionInfo?.idempotency_key || `runner:${taskId}:${executionId}:${identity.attemptId || `attempt:${executionId || taskId}`}`),
                source: executionInfo?.source || "external-runner",
                leaseOwnerId,
            });
            if (["coalesced", "blocked"].includes(coordinated.mode))
                throw Object.assign(new Error(coordinated.mode === "coalesced" ? "外部 Agent Runner 已存在同一幂等执行" : "外部 Agent Runner 请求被门禁阻塞"), { code: coordinated.mode === "blocked" ? "CCM_RUN_START_BLOCKED" : "CCM_RUN_ALREADY_ACTIVE", agentRunId: coordinated.run.runId });
            agentRunId = coordinated.run.runId;
            heartbeatWakeId = coordinated.wake?.wakeId || "";
            (0, agent_execution_coordinator_1.markPersistentAgentExecutionStarted)(agentRunId, coordinated.lease?.run?.leaseId || "");
        }
        if (agentRunId) {
            if (!(0, agent_run_store_1.getAgentRun)(agentRunId)) {
                try {
                    const materialized = (0, agent_execution_coordinator_1.relinkPersistentAgentExecution)({
                        runId: agentRunId, taskId, executionId, traceId: executionInfo?.traceId || executionInfo?.trace_id,
                        attemptId: executionInfo?.attemptId || executionInfo?.attempt_id, parentRunId: executionInfo?.parentRunId || executionInfo?.parent_run_id,
                        scope: executionInfo?.scope || (groupId ? "group" : executionInfo?.source === "global-agent" ? "global" : String(executionInfo?.source || "").includes("automation") ? "automation" : "project"),
                        scopeId: executionInfo?.scopeId || executionInfo?.scope_id || groupId || projectName || taskId,
                        agentId: executionInfo?.agentId || executionInfo?.agent_id || runtimeId, runtimeId,
                        runtimeVersionSnapshot: executionInfo?.runtimeVersionSnapshot || captureAgentRuntimeVersionSnapshot(runtimeId),
                        taskAgentSessionId: executionInfo?.taskAgentSessionId || executionInfo?.task_agent_session_id,
                        nativeSessionId: executionInfo?.nativeSessionId || executionInfo?.native_session_id || agentSession?.sessionId,
                        workspacePath: workDir, worktreeId: executionInfo?.worktreeId || executionInfo?.worktree_id,
                        triggerType: executionInfo?.triggerType || executionInfo?.trigger_type || "user",
                        idempotencyKey: `explicit:${agentRunId}`,
                        source: "external_runner_relinked",
                    }, leaseOwnerId, Math.max(30_000, Number(timeoutMs || 300_000)));
                    agentRunId = materialized.run.runId;
                }
                catch (error) {
                    throw error;
                }
            }
            const boundRun = (0, agent_run_store_1.getAgentRun)(agentRunId);
            const requestedTrace = executionInfo?.traceId || executionInfo?.trace_id;
            const requestedAttempt = executionInfo?.attemptId || executionInfo?.attempt_id;
            const requestedSession = executionInfo?.taskAgentSessionId || executionInfo?.task_agent_session_id;
            if (!boundRun || boundRun.taskId !== taskId || boundRun.executionId !== executionId || boundRun.runtimeId !== runtimeId || requestedTrace && boundRun.traceId !== requestedTrace || requestedAttempt && boundRun.attemptId !== requestedAttempt || requestedSession && boundRun.taskAgentSessionId !== requestedSession) {
                throw Object.assign(new Error("外部 Runner 请求与 Run 身份不匹配"), { code: "CCM_RUN_IDENTITY_MISMATCH" });
            }
            const lease = (0, agent_execution_coordinator_1.claimPersistentAgentExecution)(agentRunId, leaseOwnerId, Math.max(30_000, Number(timeoutMs || 300_000)));
            if (!lease.acquired) {
                throw Object.assign(new Error("AgentRun 已由其他 Runner 占用，拒绝重复启动"), { code: "CCM_RUN_ALREADY_LEASED", agentRunId });
            }
            if (lease.acquired) {
                (0, agent_execution_coordinator_1.markPersistentAgentExecutionStarted)(agentRunId, lease.run?.leaseId || "");
            }
        }
        const persistedRun = agentRunId ? (0, agent_run_store_1.getAgentRun)(agentRunId) : null;
        if (persistedRun && (persistedRun.taskId !== taskId || persistedRun.executionId !== executionId || persistedRun.runtimeId !== runtimeId || executionInfo?.traceId && persistedRun.traceId !== executionInfo.traceId || executionInfo?.attemptId && persistedRun.attemptId !== executionInfo.attemptId))
            throw new Error("外部 Runner 请求与 Run 身份不匹配");
        if (persistedRun) {
            try {
                (0, agent_run_store_1.updateAgentRunBindings)(agentRunId, { workspaceEvidence: await (0, agent_run_workspace_1.captureAgentRunWorkspaceEvidence)(persistedRun) });
            }
            catch (error) {
                (0, agent_execution_coordinator_1.markPersistentAgentExecutionRecoveryRequired)(agentRunId, "外部 Runner 启动前工作区证据不可用");
                throw error;
            }
        }
        const request = {
            id,
            projectName,
            workDir,
            agentType: runtimeId,
            timeoutMs,
            allowedTools,
            mcpConfigPath,
            agentSession: agentSession || null,
            taskId,
            executionId,
            agentRunId,
            heartbeatWakeId,
            traceId: String(executionInfo?.traceId || executionInfo?.trace_id || persistedRun?.traceId || (taskId ? `task:${taskId}` : "")),
            attemptId: String(executionInfo?.attemptId || executionInfo?.attempt_id || persistedRun?.attemptId || (taskId ? `attempt:${executionId || taskId}` : "")),
            parentRunId: String(executionInfo?.parentRunId || executionInfo?.parent_run_id || ""),
            scope: String(executionInfo?.scope || (groupId ? "group" : executionInfo?.source === "global-agent" ? "global" : String(executionInfo?.source || "").includes("automation") ? "automation" : "project")),
            scopeId: String(executionInfo?.scopeId || executionInfo?.scope_id || groupId || projectName || taskId),
            worktreeId: String(executionInfo?.worktreeId || executionInfo?.worktree_id || ""),
            triggerType: String(executionInfo?.triggerType || executionInfo?.trigger_type || "user"),
            nativeSessionId: String(executionInfo?.nativeSessionId || executionInfo?.native_session_id || persistedRun?.nativeSessionId || agentSession?.sessionId || ""),
            leaseId: String(executionInfo?.leaseId || executionInfo?.lease_id || persistedRun?.leaseId || ""),
            leaseOwnerId,
            model: String(executionInfo?.model || executionInfo?.modelId || ""),
            taskAgentSessionId: String(executionInfo?.taskAgentSessionId || executionInfo?.task_agent_session_id || persistedRun?.taskAgentSessionId || ""),
            groupId,
            groupSessionId,
            trustedMemoryProviderChannelRequired: executionInfo?.trustedMemoryProviderChannelRequired === true,
            trustedMemoryProviderAcknowledgementRequired: executionInfo?.trustedMemoryProviderAcknowledgementRequired === true,
            memoryContextConsumptionReceiptRequired: executionInfo?.memoryContextConsumptionReceiptRequired === true,
            memoryContextConsumptionChallenge: executionInfo?.memoryContextConsumptionChallenge || null,
            trustedMemoryEnvelopeChecksum: String(executionInfo?.trustedMemoryEnvelopeChecksum || ""),
            trustedMemoryEnvelopeSourceChecksum: String(executionInfo?.trustedMemoryEnvelopeSourceChecksum || ""),
            sessionLifecycleFence,
            runtimeProgressContext: executionInfo?.runtimeProgressContext || executionInfo?.runtime_progress_context || null,
            agentRuntimeStructuredProgressEnabled: executionInfo?.agentRuntimeStructuredProgressEnabled !== false,
            agentProgressFallbackTimeoutMs: Math.max(15_000, Math.min(300_000, Number(executionInfo?.agentProgressFallbackTimeoutMs || 60_000))),
            agentRawOutputRetentionMode: "ephemeral",
            toolScope: {
                schema: "ccm-agent-runner-tool-scope-v1",
                scope: groupId ? "group-project" : "project",
                groupId,
                projectName,
            },
            runtimeToolSnapshot: runtimeToolPayload.runtimeToolSnapshot,
            runtimeToolDispatchGate: runtimeToolPayload.runtimeToolDispatchGate,
            runtimeToolSnapshotPath: runtimeToolPayload.runtimeToolSnapshotPath,
            runtimeToolSnapshotRequired: runtimeToolPayload.runtimeToolSnapshotRequired,
            skipVerification: executionInfo?.skipVerification === true,
            disableBuiltinTools: executionInfo?.disableBuiltinTools === true,
            cliAllowedTools: Array.isArray(executionInfo?.cliAllowedTools)
                ? Array.from(new Set(executionInfo.cliAllowedTools.map((item) => String(item || "").trim()).filter(Boolean)))
                : Array.from(new Set([
                    ...buildAgentCliAllowedTools(projectName, message),
                    ...(executionInfo?.memoryContextConsumptionReceiptRequired === true
                        ? third_party_memory_snapshot_1.THIRD_PARTY_MEMORY_MCP_TOOL_ALIASES
                        : []),
                ])),
            message,
            status: "pending",
            created_at: new Date().toISOString(),
            run_id: persistedRun?.runId || "", trace_id: persistedRun?.traceId || "", task_id: taskId,
            attempt_id: persistedRun?.attemptId || "", runtime_id: persistedRun?.runtimeId || runtimeId,
            lease_id: persistedRun?.leaseId || "", task_agent_session_id: persistedRun?.taskAgentSessionId || "",
            native_session_id: persistedRun?.nativeSessionId || "",
        };
        const tmpFile = path.join(AGENT_RUNNER_REQUESTS_DIR, `${id}.tmp`);
        const requestFile = path.join(AGENT_RUNNER_REQUESTS_DIR, `${id}.json`);
        fs.writeFileSync(tmpFile, JSON.stringify(request, null, 2), "utf-8");
        fs.renameSync(tmpFile, requestFile);
        return { id, requestFile, resultFile: path.join(AGENT_RUNNER_RESULTS_DIR, `${id}.json`), agentRunId, heartbeatWakeId, leaseOwnerId, leaseId: persistedRun?.leaseId || "", taskId,
            run_id: request.run_id, trace_id: request.trace_id, task_id: request.task_id,
            attempt_id: request.attempt_id, runtime_id: request.runtime_id, lease_id: request.lease_id,
            task_agent_session_id: request.task_agent_session_id, native_session_id: request.native_session_id };
    }
    async function waitForAgentRunnerResult(resultFile, timeoutMs, assertWaiting = () => { }) {
        const started = Date.now();
        const pollMs = 1000;
        while (Date.now() - started < Math.max(1000, timeoutMs || 300000)) {
            assertWaiting();
            if (fs.existsSync(resultFile)) {
                try {
                    const result = JSON.parse(fs.readFileSync(resultFile, "utf-8").replace(/^\uFEFF/, ""));
                    // 外部Runner结果中的原始stdout只用于本次归一化。读取进内存后立即
                    // 删除临时结果文件，后续持久恢复使用无正文direct-dispatch证据。
                    try {
                        fs.unlinkSync(resultFile);
                    }
                    catch { }
                    return result;
                }
                catch { }
            }
            await new Promise(resolve => setTimeout(resolve, pollMs));
        }
        throw new Error("外部 Agent Runner 等待超时；请运行 npm run agent-runner:ps 或 npm run agent-runner 启用外部执行通道");
    }
    function recordNativeCapacityRefreshOutcome(agentType, model, capabilityRecord, binding = {}) {
        const provider = normalizeAgentRuntimeId(agentType);
        const refreshed = capabilityRecord?.recorded === true;
        const supportsNativeMetadata = ["codex", "cursor"].includes(provider);
        return recordModelCapabilityRefreshOutcome({
            provider,
            model: capabilityRecord?.entry?.model || model || "",
            outcome: refreshed ? "refreshed" : supportsNativeMetadata ? "metadata_absent" : "unsupported",
            receiptEvidenceChecksum: capabilityRecord?.entry?.checksum || "",
            refreshRequest: capabilityRecord?.refreshRequest || null,
            reason: refreshed ? "verified_native_capability_receipt_recorded" : supportsNativeMetadata ? "native_execution_completed_without_model_capacity_metadata" : "runtime_has_no_supported_native_capacity_metadata_adapter",
            ...binding,
        });
    }
    async function callAgentViaExternalRunnerRaw(projectName, message, workDir, agentType, timeoutMs, allowedTools = null, mcpConfigPath = "", agentSession = null, executionInfo = null) {
        const request = await createAgentRunnerRequest(projectName, message, workDir, agentType, timeoutMs, allowedTools, mcpConfigPath, agentSession, executionInfo);
        const agentRunId = String(request.agentRunId || "");
        if (executionInfo?.executionId)
            registerExternalRunnerRequest(executionInfo.executionId, request.id);
        executionInfo?.onRunnerRequestCreated?.(request.id);
        let result;
        const leaseOwnerId = String(request.leaseOwnerId || `agent-runner:${request.id}`);
        let leaseError = null;
        const leaseHeartbeat = agentRunId ? setInterval(() => {
            try {
                (0, external_runner_fence_1.renewExternalRunnerLease)(request, Math.max(30_000, Number(timeoutMs || 300_000)));
            }
            catch (error) {
                leaseError = error;
            }
        }, 15_000) : null;
        try {
            result = await waitForAgentRunnerResult(request.resultFile, timeoutMs, () => { if (leaseError && !fs.existsSync(request.resultFile))
                throw leaseError; });
        }
        catch (error) {
            if (leaseHeartbeat)
                clearInterval(leaseHeartbeat);
            if (agentRunId)
                (0, external_runner_fence_1.blockUnconfirmedExternalRunner)(request, "外部 Runner 超时或租约失效，尚未确认进程退出");
            throw error;
        }
        if (leaseHeartbeat)
            clearInterval(leaseHeartbeat);
        if (agentRunId) {
            const bound = (0, agent_run_store_1.getAgentRun)(agentRunId);
            // The Runner may already have finalized the same Run before publishing
            // its result. Otherwise its original fencing lease must still be valid.
            if (bound && !result?.recoveryRequired && !["succeeded", "failed", "cancelled"].includes(bound.status))
                (0, external_runner_fence_1.assertExternalRunnerLease)(request);
            const identities = { run_id: bound.runId, trace_id: bound.traceId, task_id: bound.taskId, attempt_id: bound.attemptId, lease_id: bound.leaseId, runtime_id: bound.runtimeId };
            if (Object.entries(identities).some(([key, expected]) => result?.[key] && result[key] !== expected)) {
                (0, agent_execution_coordinator_1.markPersistentAgentExecutionRecoveryRequired)(agentRunId, "外部回执身份不匹配，禁止绑定结果");
                throw new Error("外部 Runner 回执身份不匹配");
            }
        }
        if (!result?.success) {
            const label = result?.command || getAgentCommandLabel(agentType);
            const exitText = result?.exitCode === undefined || result?.exitCode === null ? "" : `，exitCode=${result.exitCode}`;
            let persistedRequest = null;
            try {
                persistedRequest = JSON.parse(fs.readFileSync(request.requestFile, "utf-8"));
            }
            catch { }
            if (agentRunId) {
                if (result?.recoveryRequired)
                    (0, agent_execution_coordinator_1.markPersistentAgentExecutionRecoveryRequired)(agentRunId, "外部 Runtime 无法确认原生续跑，禁止自动重放");
                else
                    (0, agent_execution_coordinator_1.finalizePersistentAgentExecution)({ runId: agentRunId, wakeId: request.heartbeatWakeId, leaseOwnerId, status: result?.cancelled ? "cancelled" : "failed", error: { code: result?.cancelled ? "cancelled" : "runner_failed", message: String(result?.error || result?.output || "未知错误").slice(0, 1000) } });
            }
            throw Object.assign(new Error(`[${projectName}] 外部 Agent Runner 执行 ${label} 失败${exitText}：${result?.error || result?.output || "未知错误"}`), {
                runnerRequestId: request.id,
                runnerStarted: !!persistedRequest?.started_at && result?.runtimeToolDispatchBlocked !== true,
                memoryContextConsumptionRecovery: result?.memoryContextConsumptionRecovery || result?.memory_context_consumption_recovery || null,
            });
        }
        const persistedContinuationEvidence = result.nativeContinuationEvidence || null;
        const persistedContinuationValidation = persistedContinuationEvidence
            ? verifyNativeSessionContinuationEvidence(persistedContinuationEvidence, {
                provider: normalizeAgentRuntimeId(agentType),
                runnerRequestId: request.id,
                requestedNativeSessionId: agentSession?.sessionId || "",
                expectedProviderContractId: agentSession?.expectedProviderContractId || agentSession?.providerContractId || "",
            })
            : { valid: false, issues: ["evidence_missing"] };
        const nativeContinuationEvidence = persistedContinuationValidation.valid
            ? persistedContinuationEvidence
            : buildNativeSessionContinuationEvidence({
                provider: normalizeAgentRuntimeId(agentType),
                runnerRequestId: request.id,
                requestedNativeSessionId: agentSession?.sessionId || "",
                returnedNativeSessionId: result.returnedNativeSessionId
                    || (result.nativeSessionEvidenceSource === "provider_output" ? result.nativeSessionId : ""),
                providerOutputContractEvidence: result.providerOutputContractEvidence || null,
                providerRuntimeVersionSnapshot: result.providerRuntimeVersionSnapshot || null,
                expectedProviderContractId: agentSession?.expectedProviderContractId || agentSession?.providerContractId || "",
                nativeResumeRequested: agentSession?.resumeSession === true,
                runnerSuccess: true,
            });
        const nativeModelCapabilityRecord = result.nativeModelCapabilityReceipt
            ? recordVerifiedNativeModelCapabilityReceipt(result.nativeModelCapabilityReceipt, {
                provider: normalizeAgentRuntimeId(agentType),
                runnerRequestId: request.id,
                groupId: executionInfo?.groupId || executionInfo?.group_id || "",
                taskId: executionInfo?.taskId || "",
                executionId: executionInfo?.executionId || executionInfo?.taskId || "",
                taskAgentSessionId: executionInfo?.taskAgentSessionId || executionInfo?.task_agent_session_id || "",
                nativeSessionId: nativeContinuationEvidence.effectiveNativeSessionId,
            })
            : null;
        const modelCapabilityRefreshOutcome = recordNativeCapacityRefreshOutcome(agentType, executionInfo?.model || executionInfo?.modelId || "", nativeModelCapabilityRecord, {
            runnerRequestId: request.id,
            taskId: executionInfo?.taskId || "",
            executionId: executionInfo?.executionId || executionInfo?.taskId || "",
            taskAgentSessionId: executionInfo?.taskAgentSessionId || executionInfo?.task_agent_session_id || "",
            nativeSessionId: nativeContinuationEvidence.nativeSessionReusable ? nativeContinuationEvidence.effectiveNativeSessionId : "",
        });
        if (agentRunId) {
            const workspaceEvidence = await (0, agent_run_workspace_1.captureAgentRunWorkspaceEvidence)({ runId: agentRunId, workspacePath: workDir, worktreeId: executionInfo?.worktreeId || executionInfo?.worktree_id || "" });
            const nativeSessionId = nativeContinuationEvidence.nativeSessionReusable ? nativeContinuationEvidence.effectiveNativeSessionId : "";
            (0, agent_run_store_1.updateAgentRunBindings)(agentRunId, {
                taskAgentSessionId: executionInfo?.taskAgentSessionId || executionInfo?.task_agent_session_id,
                nativeSessionId,
                workspacePath: workDir,
                worktreeId: executionInfo?.worktreeId || executionInfo?.worktree_id,
                workspaceEvidence,
                runtimeVersionSnapshot: nativeContinuationEvidence.providerRuntimeVersionSnapshot || undefined,
            });
            (0, agent_execution_coordinator_1.finalizePersistentAgentExecution)({ runId: agentRunId, wakeId: request.heartbeatWakeId, leaseOwnerId, status: "succeeded", result: { runnerRequestId: request.id, nativeSessionId, receiptRef: `runner:${request.id}` }, nativeSessionId, taskAgentSessionId: executionInfo?.taskAgentSessionId || executionInfo?.task_agent_session_id, workspacePath: workDir, worktreeId: executionInfo?.worktreeId || executionInfo?.worktree_id, workspaceEvidence, runtimeVersionSnapshot: nativeContinuationEvidence.providerRuntimeVersionSnapshot || undefined, usage: result.usage, usageMeta: { provider: normalizeAgentRuntimeId(agentType), model: executionInfo?.model || executionInfo?.modelId, provenance: "external-runner" } });
        }
        return {
            agentRunId,
            output: String(result.output || "").trim(),
            fileChanges: result.fileChanges || null,
            usage: result.usage || null,
            runnerRequestId: request.id,
            nativeSessionId: nativeContinuationEvidence.nativeSessionReusable ? nativeContinuationEvidence.effectiveNativeSessionId : "",
            ...nativeContinuationDoneFields(nativeContinuationEvidence),
            nativeModelCapabilityReceipt: result.nativeModelCapabilityReceipt || null,
            nativeModelCapabilityRecord,
            modelCapabilityRefreshOutcome,
            providerToolAccessEvidence: result.providerToolAccessEvidence || result.provider_tool_access_evidence || null,
            providerMemoryChannelEvidence: result.providerMemoryChannelEvidence || result.provider_memory_channel_evidence || null,
            memoryContextConsumptionReceipt: result.memoryContextConsumptionReceipt || result.memory_context_consumption_receipt || null,
            memoryContextConsumptionRecovery: result.memoryContextConsumptionRecovery || result.memory_context_consumption_recovery || null,
        };
    }
    async function runManagedAgentContinuation(input) {
        const tmpMsg = path.join(UPLOAD_DIR, `_tool_continue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.txt`);
        if (!fs.existsSync(UPLOAD_DIR))
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        fs.writeFileSync(tmpMsg, input.prompt, "utf-8");
        const sessionId = String(input.nativeSessionId || input.agentSession?.sessionId || "");
        const sessionOptions = {
            ...(input.agentSession || {}),
            persistSession: true,
            resumeSession: !!sessionId,
            sessionId,
        };
        try {
            const binding = (0, dispatch_tool_continuation_1.bindDispatchToolContinuation)(input);
            (0, dispatch_tool_continuation_1.recordDispatchToolContinuationUsage)(binding, input.initialUsage, 0);
            await (0, dispatch_tool_continuation_1.observeDispatchToolContinuation)(binding, input.nativeContinuationEvidence);
            const command = await (0, dispatch_runtime_launch_1.buildRuntimeLaunchCommand)(input.agentType, tmpMsg, { mcpConfigPath: input.mcpConfigPath, ...sessionOptions }, binding ? { ...binding, runId: binding.agentRunId || binding.parentRunId } : {});
            const managed = await runManagedCommand({
                taskId: `${input.taskId}-tool-${input.round}`,
                executionId: input.executionId || "",
                ...(binding || {}),
                command,
                cwd: (input.workDir || process.cwd()).replace(/\\/g, "/"),
                timeoutMs: input.timeoutMs || 300000,
                maxOutputBytes: Number(input.maxOutputBytes || 2 * 1024 * 1024),
                env: sanitizeExecutionEnv(getRuntimeExecutionEnv(input.agentType), input.envAllowlist || []),
                project: input.projectName,
                agentType: input.agentType,
                source: "tool-continuation",
                commandLabel: getAgentCommandLabel(input.agentType),
                title: `工具结果续跑第 ${input.round} 轮`,
            });
            const runtimeVersionSnapshot = binding?.originalRun?.runtimeVersionSnapshot || input.nativeContinuationEvidence?.providerRuntimeVersionSnapshot;
            const normalized = normalizeAgentCommandOutput(input.agentType, String(managed.stdout || "").trim(), { runtimeVersionSnapshot });
            (0, dispatch_tool_continuation_1.recordDispatchToolContinuationUsage)(binding, normalized.usage, input.round);
            const failure = detectAgentCommandFailure(input.agentType, String(managed.stdout || "").trim(), 0, "");
            if (failure.failed)
                throw new Error(failure.message || "Agent 工具续跑失败");
            return {
                output: persistBoundedOutput(`${input.taskId}-tool-${input.round}`, normalized.output, Number(input.maxContextOutputBytes || 256 * 1024)).content,
                nativeSessionId: normalized.sessionId || sessionId,
                nativeContinuationEvidence: buildNativeSessionContinuationEvidence({ provider: normalizeAgentRuntimeId(input.agentType),
                    requestedNativeSessionId: sessionId, returnedNativeSessionId: normalized.rawSessionId || normalized.sessionId || "",
                    nativeResumeRequested: !!sessionId, runnerSuccess: true,
                    providerOutputContractEvidence: normalized.providerOutputContractEvidence || null, providerRuntimeVersionSnapshot: runtimeVersionSnapshot }),
            };
        }
        finally {
            try {
                fs.unlinkSync(tmpMsg);
            }
            catch { }
        }
    }
    async function continueAgentToolCalls(input) {
        let continuationEvidence = input.nativeContinuationEvidence;
        const loop = await runToolCallLoop({
            initialOutput: input.output,
            initialSessionId: input.nativeSessionId || input.agentSession?.sessionId || "",
            scope: input.allowedTools || undefined,
            runtime: normalizeAgentRuntimeId(input.agentType),
            project: input.projectName,
            groupId: input.groupId || "",
            taskId: input.taskId,
            executionId: input.executionId || "",
            source: input.groupId ? "group-agent" : "project-agent",
            maxRounds: 4,
            parseToolCalls: text => toolManager.parseToolCalls(text),
            executeToolCall: (name, args, scope) => toolManager.executeToolCall(name, args, scope),
            onEvent: input.onEvent,
            continueAgent: input.continueAgent || (async (prompt, state) => {
                const next = await runManagedAgentContinuation({
                    projectName: input.projectName,
                    prompt,
                    workDir: input.workDir,
                    agentType: input.agentType,
                    timeoutMs: input.timeoutMs,
                    mcpConfigPath: input.mcpConfigPath,
                    agentSession: input.agentSession,
                    nativeSessionId: state.nativeSessionId,
                    taskId: input.taskId,
                    executionId: input.executionId,
                    round: state.round,
                    nativeContinuationEvidence: continuationEvidence,
                    initialUsage: input.initialUsage,
                    envAllowlist: input.envAllowlist,
                    maxOutputBytes: input.maxOutputBytes,
                    maxContextOutputBytes: input.maxContextOutputBytes,
                });
                continuationEvidence = next.nativeContinuationEvidence;
                return next;
            }),
        });
        (0, dispatch_tool_loop_result_1.assertDispatchToolLoopResult)(input.taskId, loop);
        return { ...loop, nativeContinuationEvidence: continuationEvidence };
    }
    /** Consume a persisted Heartbeat wake through the existing external Runner. */
    async function processAgentHeartbeatWake(wake, run) {
        if (!run)
            throw Object.assign(new Error("Heartbeat 唤醒没有可绑定的 AgentRun"), { code: "AGENT_RUN_NOT_FOUND" });
        const task = (0, db_1.loadTasks)().find((item) => String(item?.id || "") === String(wake?.taskId || run.taskId || "")) || {};
        const projectName = String(task.target_project || task.targetProject || (run.scope === "project" ? run.scopeId : "global-agent") || "global-agent");
        const goal = String(task.description || task.business_goal || task.businessGoal || task.title || task.message || `恢复任务 ${run.taskId}`).trim();
        const message = require("./modules/collaboration/collaboration-coordination-ux").buildChildAgentDevelopmentContract(projectName, goal, { ...task, dispatch_scope: require("./agents/dispatch-profile").resolveDispatchScope(task) }) + "\n范围审批和合同以 CCM 已持久化记录为准，原生 Session 继续当前任务。";
        const workDir = String(run.workspacePath || task.work_dir || task.workDir || process.cwd());
        const agentType = normalizeAgentRuntimeId(run.runtimeId || wake.agentId || "codex");
        const result = await callAgentViaExternalRunner(projectName, message, workDir, agentType, 300_000, null, "", run.nativeSessionId ? { sessionId: run.nativeSessionId, resumeSession: true, persistSession: true } : null, {
            agentRunId: run.runId,
            heartbeatWakeId: wake.wakeId,
            persistAgentRun: true,
            source: "heartbeat-resume",
            heartbeatReason: "resume",
            taskId: run.taskId,
            traceId: run.traceId,
            attemptId: run.attemptId,
            parentRunId: run.parentRunId,
            scope: run.scope,
            scopeId: run.scopeId,
            agentId: run.agentId,
            executionId: run.executionId,
            taskAgentSessionId: run.taskAgentSessionId,
            nativeSessionId: run.nativeSessionId,
            worktreeId: run.worktreeId,
            runtimeVersionSnapshot: run.runtimeVersionSnapshot,
            triggerType: "resume",
        });
        return {
            runId: run.runId,
            status: "succeeded",
            result: { runnerRequestId: result?.runnerRequestId || "", nativeSessionId: result?.nativeSessionId || "" },
        };
    }
    return {
        normalizeToolSelection,
        hasToolSelection,
        buildAgentRunnerRuntimeToolPayload,
        normalizeVerificationCommands,
        extractVerificationCommandsFromMessage,
        buildAgentCliAllowedTools,
        isSpawnPermissionError,
        nativeContinuationDoneFields,
        callAgentViaExternalRunner,
        getProjectToolSelection,
        findRuntimeToolSnapshotPath,
        readJsonFileSafe,
        runtimeToolSnapshotFromAudit,
        normalizeAgentRunnerRuntimeToolSnapshot,
        getProjectVerificationCommandsForRunner,
        runIndependentProjectVerification,
        buildProjectToolContext,
        sendRuntimeToolDispatchBlocked,
        ensureAgentRunnerDirs,
        cleanupAgentRunnerEphemeralResults,
        createAgentRunnerRequest,
        waitForAgentRunnerResult,
        recordNativeCapacityRefreshOutcome,
        callAgentViaExternalRunnerRaw,
        runManagedAgentContinuation,
        continueAgentToolCalls,
        processAgentHeartbeatWake,
    };
}
//# sourceMappingURL=server-agent-runner-support.js.map