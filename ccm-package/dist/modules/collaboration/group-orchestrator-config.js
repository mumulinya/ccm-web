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
exports.CCM_DIR = exports.DEFAULT_GROUP_ORCHESTRATOR = exports.COORDINATOR_PROJECT = void 0;
exports.defaultOrchestratorConfig = defaultOrchestratorConfig;
exports.loadOrchestratorConfig = loadOrchestratorConfig;
exports.saveOrchestratorConfig = saveOrchestratorConfig;
exports.publicOrchestratorConfig = publicOrchestratorConfig;
exports.testUnifiedModelConnection = testUnifiedModelConnection;
exports.buildGroupMainAgentBoundary = buildGroupMainAgentBoundary;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const credential_store_1 = require("../../core/credential-store");
const group_orchestrator_llm_client_1 = require("./group-orchestrator-llm-client");
const provider_neutral_context_cache_1 = require("../../system/provider-neutral-context-cache");
const provider_context_cache_adapters_1 = require("../../system/provider-context-cache-adapters");
const provider_cache_capability_registry_1 = require("../../system/provider-cache-capability-registry");
const provider_native_microcompact_capability_1 = require("../../system/provider-native-microcompact-capability");
const provider_native_tool_capability_1 = require("../../system/provider-native-tool-capability");
const main_agent_context_policy_1 = require("../../tools/main-agent-context-policy");
exports.COORDINATOR_PROJECT = "coordinator";
exports.DEFAULT_GROUP_ORCHESTRATOR = {
    enabled: true,
    mode: "llm_or_coded_coordinator",
    coordinatorProject: exports.COORDINATOR_PROJECT,
    maxDepth: 3,
};
exports.CCM_DIR = path.join(os.homedir(), ".cc-connect");
const ORCHESTRATOR_CONFIG_FILE = path.join(exports.CCM_DIR, "group-orchestrator-config.json");
function defaultOrchestratorConfig() {
    return {
        enabled: true,
        format: "openai-compatible",
        apiUrl: "https://api.openai.com/v1",
        apiKey: "",
        model: "",
        temperature: 0.2,
        reasoningEffort: "off",
        timeoutMs: 120000,
        fallbackToRules: true,
        memoryCompactionUseModel: true,
        memoryCompactionMode: "model-required",
        memoryContextPreset: "default",
        modelContextWindow: 0,
        modelAutoCompactTokenLimit: 0,
        providerContextCacheMode: "auto",
        codeIntelligenceEnabled: true,
        codeIndexStartPolicy: "on_demand",
        codeIndexMaxConcurrentProjects: 1,
        languageServerManagedInstallEnabled: true,
        providerNativeToolsMode: "auto",
        skillForkEnabled: true,
        webToolsEnabled: true,
        webFetchBrowserFallbackEnabled: true,
        webSearchProviderOrder: ["mcp", "brave", "bing", "google"],
        searchMcpUrl: "",
        searchMcpToken: "",
        braveSearchApiKey: "",
        bingSearchApiKey: "",
        googleCseApiKey: "",
        googleCseId: "",
        notebookToolsEnabled: true,
        ccStyleExecutionDisplayEnabled: true,
        ccStyleAgentProgressNarrationEnabled: true,
        mcpToolLoadingMode: "deferred",
        mcpToolAutoThresholdPercent: 10,
        skillCatalogBudgetPercent: 1,
        postCompactSkillPerItemMaxTokens: 5_000,
        postCompactSkillTotalMaxTokens: 25_000,
        contextSourceCatalogBudgetPercent: 1,
        contextSourceHydrationBudgetPercent: 10,
        postCompactSourcePerItemMaxTokens: 5_000,
        postCompactSourceTotalMaxTokens: 25_000,
        agentCommunicationV2Enabled: true,
        agentRunnerStartTimeoutMs: 60_000,
        agentAckTimeoutMs: 60_000,
        agentHeartbeatIntervalMs: 20_000,
        agentHeartbeatLostTimeoutMs: 90_000,
        agentLeaseTtlMs: 120_000,
        agentMaxAttempts: 3,
        agentMaxParallelPerProject: 2,
        agentMaxParallelGlobal: 6,
        agentRuntimeStructuredProgressEnabled: true,
        strictPreExecutionAckEnabled: true,
        agentProgressFallbackTimeoutMs: 60_000,
        agentRawOutputRetentionMode: "ephemeral",
        // TestAgent 验收链 V2 hardening defaults.  These are deliberately kept
        // separate from the legacy enabled/self-verification switch: the latter
        // chooses who verifies, while these fields constrain how verification is
        // prepared and persisted.
        testAgentPlannerFallbackMode: "risk_based",
        testAgentIsolationMode: "sandbox_preferred",
        testAgentReadonlyCapabilityInjection: true,
        testAgentSurfaceAuditMode: "strict",
        testAgentRuntimeFingerprintEnabled: true,
        testAgentPostReviewSpotCheckMode: "policy",
        dynamicAgentBudgetEnabled: true,
        unifiedEvidenceEnabled: true,
        strictEvidenceFreshnessEnabled: false,
        deltaRepairEnabled: true,
        operationRegistryEnabled: true,
        taskEventReducerShadowWriteEnabled: true,
        adaptiveAgentLoopEnabled: true,
        agentLoopNoProgressThreshold: 3,
        agentToolBatchSize: 2,
        agentReadOnlyParallelism: 2,
        agentToolCallBudget: 6,
        agentMaxModelTurns: 8,
        providerPromptCacheRetention: "in_memory",
        providerNativeCacheEnabled: false,
        providerNativeCacheFamily: "auto",
        providerNativeCacheFamilyManual: false,
        anthropicCacheReferenceEnabled: false,
        inferenceBackendKind: "remote_api",
        metricsPath: "",
        timeBasedMicrocompactEnabled: true,
        timeBasedThinkingClearEnabled: false,
        timeBasedMicrocompactGapMinutes: 60,
        timeBasedMicrocompactKeepRecent: 5,
        typedMemoryDeliveryMaxDocuments: 5,
        typedMemoryDeliveryMaxBytesPerDocument: 4096,
        typedMemoryDeliveryMaxLinesPerDocument: 200,
        typedMemoryDeliveryMaxSessionBytes: 60 * 1024,
        typedMemoryDeliveryMaxTokens: 5000,
        sessionMemoryCompactMaxSectionTokens: 2000,
        sessionMemoryCompactMaxTotalTokens: 12000,
        groupSessionRetentionDays: 30,
        groupSessionMaxArchived: 20,
        groupSessionAutoPruneEnabled: false,
        groupSessionRetentionIntervalHours: 24,
        groupSessionArtifactAutoArchiveEnabled: true,
        groupSessionArtifactHotExecutions: 50,
        groupSessionArtifactMaxHotMb: 64,
        groupSessionArtifactMaxAgeDays: 30,
        summaryReviewerEnabled: false,
        summaryReviewerFormat: "openai-compatible",
        summaryReviewerApiUrl: "",
        summaryReviewerApiKey: "",
        summaryReviewerModel: "",
        summaryReviewerSampleRate: 0.1,
        summaryReviewerTimeoutMs: 30000,
    };
}
function writeStoredOrchestratorConfig(stored) {
    fs.mkdirSync(path.dirname(ORCHESTRATOR_CONFIG_FILE), { recursive: true });
    const temp = `${ORCHESTRATOR_CONFIG_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(stored, null, 2), "utf-8");
    fs.renameSync(temp, ORCHESTRATOR_CONFIG_FILE);
}
function loadOrchestratorConfig() {
    try {
        if (!fs.existsSync(ORCHESTRATOR_CONFIG_FILE))
            return defaultOrchestratorConfig();
        const stored = JSON.parse(fs.readFileSync(ORCHESTRATOR_CONFIG_FILE, "utf-8"));
        if (stored.apiKey && !(0, credential_store_1.isCredentialReference)(stored.apiKey)) {
            const protectedApiKey = (0, credential_store_1.protectCredential)("unified-model", "apiKey", stored.apiKey);
            try {
                writeStoredOrchestratorConfig({ ...stored, apiKey: protectedApiKey });
            }
            catch { }
            stored.apiKey = protectedApiKey;
        }
        if (stored.summaryReviewerApiKey && !(0, credential_store_1.isCredentialReference)(stored.summaryReviewerApiKey)) {
            const protectedReviewerKey = (0, credential_store_1.protectCredential)("summary-reviewer", "apiKey", stored.summaryReviewerApiKey);
            try {
                writeStoredOrchestratorConfig({ ...stored, summaryReviewerApiKey: protectedReviewerKey });
            }
            catch { }
            stored.summaryReviewerApiKey = protectedReviewerKey;
        }
        for (const [field, credentialField] of [
            ["searchMcpToken", "mcpToken"],
            ["braveSearchApiKey", "braveApiKey"],
            ["bingSearchApiKey", "bingApiKey"],
            ["googleCseApiKey", "googleApiKey"],
            ["googleCseId", "googleEngineId"],
        ]) {
            if (stored[field] && !(0, credential_store_1.isCredentialReference)(stored[field])) {
                stored[field] = (0, credential_store_1.protectCredential)("web-search", credentialField, stored[field]);
                try {
                    writeStoredOrchestratorConfig(stored);
                }
                catch { }
            }
        }
        return {
            ...defaultOrchestratorConfig(),
            ...stored,
            memoryCompactionUseModel: true,
            memoryCompactionMode: "model-required",
            // Older installations persisted the former 30-second default. Normalize
            // it on read so the settings page can save the full public config after
            // the ACK contract minimum was raised to 60 seconds.
            agentAckTimeoutMs: Math.max(60_000, Number(stored.agentAckTimeoutMs) || 60_000),
            apiKey: stored.apiKey ? (0, credential_store_1.resolveCredential)(stored.apiKey) : "",
            summaryReviewerApiKey: stored.summaryReviewerApiKey ? (0, credential_store_1.resolveCredential)(stored.summaryReviewerApiKey) : "",
            searchMcpToken: stored.searchMcpToken ? (0, credential_store_1.resolveCredential)(stored.searchMcpToken) : "",
            braveSearchApiKey: stored.braveSearchApiKey ? (0, credential_store_1.resolveCredential)(stored.braveSearchApiKey) : "",
            bingSearchApiKey: stored.bingSearchApiKey ? (0, credential_store_1.resolveCredential)(stored.bingSearchApiKey) : "",
            googleCseApiKey: stored.googleCseApiKey ? (0, credential_store_1.resolveCredential)(stored.googleCseApiKey) : "",
            googleCseId: stored.googleCseId ? (0, credential_store_1.resolveCredential)(stored.googleCseId) : "",
        };
    }
    catch {
        return defaultOrchestratorConfig();
    }
}
function persistOrchestratorConfig(config) {
    const stored = {
        ...config,
        apiKey: config.apiKey ? (0, credential_store_1.protectCredential)("unified-model", "apiKey", config.apiKey) : "",
        summaryReviewerApiKey: config.summaryReviewerApiKey ? (0, credential_store_1.protectCredential)("summary-reviewer", "apiKey", config.summaryReviewerApiKey) : "",
        searchMcpToken: config.searchMcpToken ? (0, credential_store_1.protectCredential)("web-search", "mcpToken", config.searchMcpToken) : "",
        braveSearchApiKey: config.braveSearchApiKey ? (0, credential_store_1.protectCredential)("web-search", "braveApiKey", config.braveSearchApiKey) : "",
        bingSearchApiKey: config.bingSearchApiKey ? (0, credential_store_1.protectCredential)("web-search", "bingApiKey", config.bingSearchApiKey) : "",
        googleCseApiKey: config.googleCseApiKey ? (0, credential_store_1.protectCredential)("web-search", "googleApiKey", config.googleCseApiKey) : "",
        googleCseId: config.googleCseId ? (0, credential_store_1.protectCredential)("web-search", "googleEngineId", config.googleCseId) : "",
    };
    writeStoredOrchestratorConfig(stored);
}
function saveOrchestratorConfig(updates) {
    const current = loadOrchestratorConfig();
    const next = { ...current };
    if (updates.enabled !== undefined)
        next.enabled = !!updates.enabled;
    if (updates.format !== undefined) {
        const format = String(updates.format || "openai-compatible").trim();
        if (!["auto", "openai-compatible", "openai-responses", "anthropic-compatible", "gemini-compatible"].includes(format))
            throw new Error("不支持的大模型接口协议");
        next.format = format;
    }
    if (updates.apiUrl !== undefined) {
        const apiUrl = String(updates.apiUrl || "").trim();
        if (apiUrl && !/^https?:\/\//i.test(apiUrl))
            throw new Error("大模型 API 地址必须以 http:// 或 https:// 开头");
        next.apiUrl = apiUrl;
    }
    if (updates.model !== undefined)
        next.model = String(updates.model || "").trim();
    if (updates.temperature !== undefined) {
        const temperature = Number(updates.temperature);
        if (!Number.isFinite(temperature) || temperature < 0 || temperature > 1)
            throw new Error("模型温度必须介于 0 和 1");
        next.temperature = temperature;
    }
    const reasoningEffort = updates.reasoningEffort ?? updates.reasoning_effort;
    if (reasoningEffort !== undefined) {
        const effort = String(reasoningEffort || "off").trim().toLowerCase();
        if (!["off", "low", "medium", "high"].includes(effort))
            throw new Error("推理强度必须是 off、low、medium 或 high");
        next.reasoningEffort = effort;
    }
    if (updates.timeoutMs !== undefined) {
        const timeoutMs = Number(updates.timeoutMs);
        if (!Number.isFinite(timeoutMs) || timeoutMs < 5_000 || timeoutMs > 300_000)
            throw new Error("模型超时必须介于 5,000 和 300,000 毫秒");
        next.timeoutMs = Math.floor(timeoutMs);
    }
    if (updates.fallbackToRules !== undefined)
        next.fallbackToRules = !!updates.fallbackToRules;
    const memoryCompactionUseModel = updates.memoryCompactionUseModel ?? updates.memory_compaction_use_model;
    const memoryCompactionMode = updates.memoryCompactionMode ?? updates.memory_compaction_mode;
    if (memoryCompactionUseModel !== undefined && memoryCompactionUseModel !== true)
        throw new Error("群聊记忆压缩必须使用模型摘要");
    if (memoryCompactionMode !== undefined) {
        const mode = String(memoryCompactionMode || "model-required").trim().toLowerCase();
        if (mode !== "model-required")
            throw new Error("群聊记忆压缩模式只支持 model-required");
    }
    next.memoryCompactionUseModel = true;
    next.memoryCompactionMode = "model-required";
    const memoryContextPreset = updates.memoryContextPreset ?? updates.memory_context_preset;
    const modelContextWindow = updates.modelContextWindow ?? updates.model_context_window;
    const modelAutoCompactTokenLimit = updates.modelAutoCompactTokenLimit ?? updates.model_auto_compact_token_limit;
    const providerContextCacheMode = updates.providerContextCacheMode ?? updates.provider_context_cache_mode;
    const typedMemoryDeliveryLimits = [
        ["typedMemoryDeliveryMaxDocuments", "typed_memory_delivery_max_documents", 1, 5, "记忆投递文件数必须介于 1 和 5"],
        ["typedMemoryDeliveryMaxBytesPerDocument", "typed_memory_delivery_max_bytes_per_document", 512, 4096, "单份记忆投递容量必须介于 512 和 4096 bytes"],
        ["typedMemoryDeliveryMaxLinesPerDocument", "typed_memory_delivery_max_lines_per_document", 10, 200, "单份记忆投递行数必须介于 10 和 200 行"],
        ["typedMemoryDeliveryMaxSessionBytes", "typed_memory_delivery_max_session_bytes", 4096, 60 * 1024, "任务会话单个压缩周期的记忆投递容量必须介于 4096 和 61440 bytes"],
        ["typedMemoryDeliveryMaxTokens", "typed_memory_delivery_max_tokens", 500, 20_000, "记忆投递 token 上限必须介于 500 和 20000"],
    ];
    const sessionMemoryCompactMaxSectionTokens = updates.sessionMemoryCompactMaxSectionTokens
        ?? updates.session_memory_compact_max_section_tokens;
    const sessionMemoryCompactMaxTotalTokens = updates.sessionMemoryCompactMaxTotalTokens
        ?? updates.session_memory_compact_max_total_tokens;
    if (memoryContextPreset !== undefined) {
        const preset = String(memoryContextPreset || "default").trim().toLowerCase();
        if (!["default", "516k", "1m", "custom"].includes(preset))
            throw new Error("不支持的上下文容量预设");
        next.memoryContextPreset = preset;
    }
    if (modelContextWindow !== undefined) {
        const value = Number(modelContextWindow || 0);
        if (!Number.isFinite(value) || value < 0 || value > 4_000_000)
            throw new Error("上下文窗口必须介于 0 和 4,000,000 token");
        next.modelContextWindow = Math.floor(value);
    }
    if (modelAutoCompactTokenLimit !== undefined) {
        const value = Number(modelAutoCompactTokenLimit || 0);
        if (!Number.isFinite(value) || value < 0 || value > 3_980_000)
            throw new Error("自动压缩阈值必须介于 0 和 3,980,000 token");
        next.modelAutoCompactTokenLimit = Math.floor(value);
    }
    if (providerContextCacheMode !== undefined) {
        const value = String(providerContextCacheMode || "auto").trim().toLowerCase();
        if (!["auto", "native", "controlled", "off"].includes(value))
            throw new Error("上下文缓存模式必须是 auto、native、controlled 或 off");
        next.providerContextCacheMode = value;
    }
    for (const [camelKey, snakeKey] of [
        ["codeIntelligenceEnabled", "code_intelligence_enabled"],
        ["languageServerManagedInstallEnabled", "language_server_managed_install_enabled"],
        ["skillForkEnabled", "skill_fork_enabled"],
        ["webToolsEnabled", "web_tools_enabled"],
        ["webFetchBrowserFallbackEnabled", "web_fetch_browser_fallback_enabled"],
        ["notebookToolsEnabled", "notebook_tools_enabled"],
        ["ccStyleExecutionDisplayEnabled", "cc_style_execution_display_enabled"],
        ["ccStyleAgentProgressNarrationEnabled", "cc_style_agent_progress_narration_enabled"],
        ["agentRuntimeStructuredProgressEnabled", "agent_runtime_structured_progress_enabled"],
        ["strictPreExecutionAckEnabled", "strict_pre_execution_ack_enabled"],
    ]) {
        const raw = updates[camelKey] ?? updates[snakeKey];
        if (raw !== undefined)
            next[camelKey] = raw === true;
    }
    const codeIndexStartPolicy = updates.codeIndexStartPolicy ?? updates.code_index_start_policy;
    if (codeIndexStartPolicy !== undefined) {
        const value = String(codeIndexStartPolicy || "on_demand").trim().toLowerCase();
        if (!["on_demand", "manual", "startup"].includes(value))
            throw new Error("代码索引启动策略必须是 on_demand、manual 或 startup");
        next.codeIndexStartPolicy = value;
    }
    const codeIndexMaxConcurrentProjects = updates.codeIndexMaxConcurrentProjects ?? updates.code_index_max_concurrent_projects;
    if (codeIndexMaxConcurrentProjects !== undefined) {
        const value = Number(codeIndexMaxConcurrentProjects);
        if (!Number.isFinite(value) || value < 1 || value > 8)
            throw new Error("并行代码索引项目数必须介于1和8");
        next.codeIndexMaxConcurrentProjects = Math.floor(value);
    }
    const providerNativeToolsMode = updates.providerNativeToolsMode ?? updates.provider_native_tools_mode;
    if (providerNativeToolsMode !== undefined) {
        const value = String(providerNativeToolsMode || "auto").trim().toLowerCase();
        if (!["auto", "native", "json"].includes(value))
            throw new Error("Provider原生工具模式必须是 auto、native 或 json");
        next.providerNativeToolsMode = value;
    }
    const webSearchProviderOrder = updates.webSearchProviderOrder ?? updates.web_search_provider_order;
    if (webSearchProviderOrder !== undefined) {
        if (!Array.isArray(webSearchProviderOrder))
            throw new Error("Web Search Provider顺序必须是数组");
        const allowed = new Set(["mcp", "brave", "bing", "google"]);
        const value = [...new Set(webSearchProviderOrder.map((item) => String(item || "").trim().toLowerCase().replace("google_cse", "google")).filter((item) => allowed.has(item)))];
        if (!value.length)
            throw new Error("至少保留一个Web Search Provider");
        next.webSearchProviderOrder = value;
    }
    const searchMcpUrl = updates.searchMcpUrl ?? updates.search_mcp_url;
    if (searchMcpUrl !== undefined) {
        if (searchMcpUrl === null)
            next.searchMcpUrl = "";
        else {
            const value = String(searchMcpUrl || "").trim();
            if (value && !/^https:\/\//i.test(value))
                throw new Error("Search MCP地址必须使用HTTPS");
            if (value)
                next.searchMcpUrl = value;
        }
    }
    for (const [camelKey, snakeKey] of [
        ["searchMcpToken", "search_mcp_token"],
        ["braveSearchApiKey", "brave_search_api_key"],
        ["bingSearchApiKey", "bing_search_api_key"],
        ["googleCseApiKey", "google_cse_api_key"],
        ["googleCseId", "google_cse_id"],
    ]) {
        const raw = updates[camelKey] ?? updates[snakeKey];
        if (raw !== undefined && String(raw || "").trim())
            next[camelKey] = String(raw).trim();
    }
    const contextPolicy = (0, main_agent_context_policy_1.readMainAgentContextPolicy)({
        mcpToolLoadingMode: updates.mcpToolLoadingMode ?? updates.mcp_tool_loading_mode ?? next.mcpToolLoadingMode,
        mcpToolAutoThresholdPercent: updates.mcpToolAutoThresholdPercent ?? updates.mcp_tool_auto_threshold_percent ?? next.mcpToolAutoThresholdPercent,
        skillCatalogBudgetPercent: updates.skillCatalogBudgetPercent ?? updates.skill_catalog_budget_percent ?? next.skillCatalogBudgetPercent,
        postCompactSkillPerItemMaxTokens: updates.postCompactSkillPerItemMaxTokens ?? updates.post_compact_skill_per_item_max_tokens ?? next.postCompactSkillPerItemMaxTokens,
        postCompactSkillTotalMaxTokens: updates.postCompactSkillTotalMaxTokens ?? updates.post_compact_skill_total_max_tokens ?? next.postCompactSkillTotalMaxTokens,
        contextSourceCatalogBudgetPercent: updates.contextSourceCatalogBudgetPercent ?? updates.context_source_catalog_budget_percent ?? next.contextSourceCatalogBudgetPercent,
        contextSourceHydrationBudgetPercent: updates.contextSourceHydrationBudgetPercent ?? updates.context_source_hydration_budget_percent ?? next.contextSourceHydrationBudgetPercent,
        postCompactSourcePerItemMaxTokens: updates.postCompactSourcePerItemMaxTokens ?? updates.post_compact_source_per_item_max_tokens ?? next.postCompactSourcePerItemMaxTokens,
        postCompactSourceTotalMaxTokens: updates.postCompactSourceTotalMaxTokens ?? updates.post_compact_source_total_max_tokens ?? next.postCompactSourceTotalMaxTokens,
        agentMaxParallelPerProject: updates.agentMaxParallelPerProject ?? updates.agent_max_parallel_per_project ?? next.agentMaxParallelPerProject,
        agentMaxParallelGlobal: updates.agentMaxParallelGlobal ?? updates.agent_max_parallel_global ?? next.agentMaxParallelGlobal,
    });
    Object.assign(next, contextPolicy);
    const agentCommunicationV2Enabled = updates.agentCommunicationV2Enabled ?? updates.agent_communication_v2_enabled;
    if (agentCommunicationV2Enabled !== undefined)
        next.agentCommunicationV2Enabled = agentCommunicationV2Enabled === true;
    const dynamicAgentBudgetEnabled = updates.dynamicAgentBudgetEnabled ?? updates.dynamic_agent_budget_enabled;
    if (dynamicAgentBudgetEnabled !== undefined)
        next.dynamicAgentBudgetEnabled = dynamicAgentBudgetEnabled === true;
    const adaptiveAgentLoopEnabled = updates.adaptiveAgentLoopEnabled ?? updates.adaptive_agent_loop_enabled;
    if (adaptiveAgentLoopEnabled !== undefined)
        next.adaptiveAgentLoopEnabled = adaptiveAgentLoopEnabled === true;
    for (const [camelKey, snakeKey] of [
        ["unifiedEvidenceEnabled", "unified_evidence_enabled"],
        ["strictEvidenceFreshnessEnabled", "strict_evidence_freshness_enabled"],
        ["deltaRepairEnabled", "delta_repair_enabled"],
        ["operationRegistryEnabled", "operation_registry_enabled"],
        ["taskEventReducerShadowWriteEnabled", "task_event_reducer_shadow_write_enabled"],
    ]) {
        const raw = updates[camelKey] ?? updates[snakeKey];
        if (raw !== undefined)
            next[camelKey] = raw === true;
    }
    for (const [camelKey, snakeKey, min, max] of [
        ["agentToolCallBudget", "agent_tool_call_budget", 1, 64],
        ["agentMaxModelTurns", "agent_max_model_turns", 1, 32],
        ["agentLoopNoProgressThreshold", "agent_loop_no_progress_threshold", 2, 10],
        ["agentToolBatchSize", "agent_tool_batch_size", 1, 8],
        ["agentReadOnlyParallelism", "agent_read_only_parallelism", 1, 8],
    ]) {
        const raw = updates[camelKey] ?? updates[snakeKey];
        if (raw === undefined)
            continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value < min || value > max)
            throw new Error(`${camelKey} 必须介于 ${min} 和 ${max}`);
        next[camelKey] = Math.floor(value);
    }
    const agentCommunicationLimits = [
        ["agentRunnerStartTimeoutMs", "agent_runner_start_timeout_ms", 5_000, 300_000, "Agent Runner启动超时必须介于5,000和300,000毫秒"],
        ["agentAckTimeoutMs", "agent_ack_timeout_ms", 60_000, 120_000, "Agent ACK超时必须介于60,000和120,000毫秒"],
        ["agentHeartbeatIntervalMs", "agent_heartbeat_interval_ms", 5_000, 60_000, "Agent心跳间隔必须介于5,000和60,000毫秒"],
        ["agentHeartbeatLostTimeoutMs", "agent_heartbeat_lost_timeout_ms", 15_000, 600_000, "Agent失联超时必须介于15,000和600,000毫秒"],
        ["agentLeaseTtlMs", "agent_lease_ttl_ms", 15_000, 900_000, "Agent租约必须介于15,000和900,000毫秒"],
        ["agentMaxAttempts", "agent_max_attempts", 1, 3, "Agent最大执行次数必须介于1和3"],
        ["agentMaxParallelPerProject", "agent_max_parallel_per_project", 1, 16, "单项目Agent并发必须介于1和16"],
        ["agentMaxParallelGlobal", "agent_max_parallel_global", 1, 64, "全局Agent并发必须介于1和64"],
        ["agentProgressFallbackTimeoutMs", "agent_progress_fallback_timeout_ms", 15_000, 300_000, "Agent进度兜底时间必须介于15,000和300,000毫秒"],
    ];
    for (const [camelKey, snakeKey, min, max, errorMessage] of agentCommunicationLimits) {
        const raw = updates[camelKey] ?? updates[snakeKey];
        if (raw === undefined)
            continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value < min || value > max)
            throw new Error(errorMessage);
        next[camelKey] = Math.floor(value);
    }
    if (Number(next.agentHeartbeatLostTimeoutMs) <= Number(next.agentHeartbeatIntervalMs))
        throw new Error("Agent失联超时必须大于心跳间隔");
    if (Number(next.agentLeaseTtlMs) <= Number(next.agentHeartbeatIntervalMs))
        throw new Error("Agent租约必须大于心跳间隔");
    if (Number(next.agentMaxParallelGlobal) < Number(next.agentMaxParallelPerProject))
        throw new Error("全局Agent并发不得小于单项目并发");
    const rawOutputRetentionMode = updates.agentRawOutputRetentionMode ?? updates.agent_raw_output_retention_mode;
    if (rawOutputRetentionMode !== undefined) {
        const value = String(rawOutputRetentionMode || "ephemeral").trim().toLowerCase();
        if (value !== "ephemeral")
            throw new Error("Agent原始输出保留模式目前只允许 ephemeral");
        next.agentRawOutputRetentionMode = value;
    }
    const testAgentPlannerFallbackMode = updates.testAgentPlannerFallbackMode ?? updates.test_agent_planner_fallback_mode;
    if (testAgentPlannerFallbackMode !== undefined) {
        const value = String(testAgentPlannerFallbackMode || "risk_based").trim().toLowerCase();
        if (!["risk_based", "always", "never"].includes(value))
            throw new Error("TestAgent规划降级策略必须是 risk_based、always 或 never");
        next.testAgentPlannerFallbackMode = value;
    }
    const testAgentIsolationMode = updates.testAgentIsolationMode ?? updates.test_agent_isolation_mode;
    if (testAgentIsolationMode !== undefined) {
        const value = String(testAgentIsolationMode || "sandbox_preferred").trim().toLowerCase();
        if (!["sandbox_preferred", "sandbox_required", "strict_allowlist"].includes(value))
            throw new Error("TestAgent隔离策略无效");
        // A caller may tighten isolation, but never use a config update to
        // silently restore the legacy unrestricted execution path.
        next.testAgentIsolationMode = value;
    }
    const testAgentReadonlyCapabilityInjection = updates.testAgentReadonlyCapabilityInjection
        ?? updates.test_agent_readonly_capability_injection;
    if (testAgentReadonlyCapabilityInjection !== undefined) {
        next.testAgentReadonlyCapabilityInjection = testAgentReadonlyCapabilityInjection === true;
    }
    const testAgentSurfaceAuditMode = updates.testAgentSurfaceAuditMode ?? updates.test_agent_surface_audit_mode;
    if (testAgentSurfaceAuditMode !== undefined) {
        const value = String(testAgentSurfaceAuditMode || "strict").trim().toLowerCase();
        if (!["strict", "warn"].includes(value))
            throw new Error("TestAgent变更面审计策略必须是 strict 或 warn");
        next.testAgentSurfaceAuditMode = value;
    }
    const testAgentRuntimeFingerprintEnabled = updates.testAgentRuntimeFingerprintEnabled
        ?? updates.test_agent_runtime_fingerprint_enabled;
    if (testAgentRuntimeFingerprintEnabled !== undefined) {
        // Runtime freshness is a safety gate for high-risk work and cannot be
        // disabled by a task-level override. The global switch remains useful for
        // controlled diagnostics and legacy deployments.
        next.testAgentRuntimeFingerprintEnabled = testAgentRuntimeFingerprintEnabled !== false;
    }
    const testAgentPostReviewSpotCheckMode = updates.testAgentPostReviewSpotCheckMode
        ?? updates.test_agent_post_review_spot_check_mode;
    if (testAgentPostReviewSpotCheckMode !== undefined) {
        const value = String(testAgentPostReviewSpotCheckMode || "policy").trim().toLowerCase();
        if (!["policy", "required", "off"].includes(value))
            throw new Error("TestAgent完成前抽查策略必须是 policy、required 或 off");
        next.testAgentPostReviewSpotCheckMode = value;
    }
    const providerPromptCacheRetention = updates.providerPromptCacheRetention ?? updates.provider_prompt_cache_retention;
    if (providerPromptCacheRetention !== undefined) {
        const value = String(providerPromptCacheRetention || "in_memory").trim().toLowerCase();
        if (!["in_memory", "24h"].includes(value))
            throw new Error("Provider Prompt Cache 保留策略必须是 in_memory 或 24h");
        next.providerPromptCacheRetention = value;
    }
    const providerNativeCacheEnabled = updates.providerNativeCacheEnabled ?? updates.provider_native_cache_enabled;
    if (providerNativeCacheEnabled !== undefined)
        next.providerNativeCacheEnabled = providerNativeCacheEnabled === true;
    const providerNativeCacheFamily = updates.providerNativeCacheFamily ?? updates.provider_native_cache_family;
    const providerNativeCacheFamilyManual = updates.providerNativeCacheFamilyManual ?? updates.provider_native_cache_family_manual;
    if (providerNativeCacheFamilyManual !== undefined)
        next.providerNativeCacheFamilyManual = providerNativeCacheFamilyManual === true;
    if (providerNativeCacheFamily !== undefined) {
        const value = String(providerNativeCacheFamily || "auto").trim().toLowerCase();
        if (!["auto", "openai", "anthropic", "gemini", "compatible"].includes(value))
            throw new Error("原生缓存 Provider 类型不受支持");
        next.providerNativeCacheFamily = value;
        if (value === "auto" && providerNativeCacheFamilyManual === undefined)
            next.providerNativeCacheFamilyManual = false;
    }
    if (next.providerNativeCacheFamilyManual !== true && (updates.format !== undefined || providerNativeCacheFamilyManual === false || providerNativeCacheFamily === "auto")) {
        next.providerNativeCacheFamily = {
            "openai-compatible": "openai",
            "openai-responses": "openai",
            "anthropic-compatible": "anthropic",
            "gemini-compatible": "gemini",
        }[String(next.format || "")] || "auto";
    }
    const anthropicCacheReferenceEnabled = updates.anthropicCacheReferenceEnabled ?? updates.anthropic_cache_reference_enabled;
    if (anthropicCacheReferenceEnabled !== undefined)
        next.anthropicCacheReferenceEnabled = anthropicCacheReferenceEnabled === true;
    const inferenceBackendKind = updates.inferenceBackendKind ?? updates.inference_backend_kind;
    if (inferenceBackendKind !== undefined) {
        const value = String(inferenceBackendKind || "remote_api").trim().toLowerCase();
        if (!["remote_api", "vllm", "sglang"].includes(value))
            throw new Error("推理后端类型必须是 remote_api、vllm 或 sglang");
        next.inferenceBackendKind = value;
    }
    const metricsPath = updates.metricsPath ?? updates.metrics_path;
    if (metricsPath !== undefined) {
        const value = String(metricsPath || "").trim();
        if (value && (!value.startsWith("/") || value.startsWith("//") || /[?#@\r\n]/.test(value) || value.length > 300)) {
            throw new Error("指标地址只能填写同源绝对路径，例如 /metrics，不能包含查询参数或凭据");
        }
        next.metricsPath = value;
    }
    const timeBasedMicrocompactEnabled = updates.timeBasedMicrocompactEnabled ?? updates.time_based_microcompact_enabled;
    const timeBasedThinkingClearEnabled = updates.timeBasedThinkingClearEnabled ?? updates.time_based_thinking_clear_enabled;
    const timeBasedMicrocompactGapMinutes = updates.timeBasedMicrocompactGapMinutes ?? updates.time_based_microcompact_gap_minutes;
    const timeBasedMicrocompactKeepRecent = updates.timeBasedMicrocompactKeepRecent ?? updates.time_based_microcompact_keep_recent;
    if (timeBasedMicrocompactEnabled !== undefined)
        next.timeBasedMicrocompactEnabled = timeBasedMicrocompactEnabled === true;
    if (timeBasedThinkingClearEnabled !== undefined)
        next.timeBasedThinkingClearEnabled = timeBasedThinkingClearEnabled === true;
    if (timeBasedMicrocompactGapMinutes !== undefined) {
        const value = Number(timeBasedMicrocompactGapMinutes);
        if (!Number.isFinite(value) || value < 1 || value > 10_080)
            throw new Error("时间触发 microcompact 间隔必须介于 1 和 10080 分钟");
        next.timeBasedMicrocompactGapMinutes = Math.floor(value);
    }
    if (timeBasedMicrocompactKeepRecent !== undefined) {
        const value = Number(timeBasedMicrocompactKeepRecent);
        if (!Number.isFinite(value) || value < 1 || value > 100)
            throw new Error("时间触发 microcompact 保留工具结果数必须介于 1 和 100");
        next.timeBasedMicrocompactKeepRecent = Math.floor(value);
    }
    for (const [camelKey, snakeKey, min, max, errorMessage] of typedMemoryDeliveryLimits) {
        const raw = updates[camelKey] ?? updates[snakeKey];
        if (raw === undefined)
            continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value < min || value > max)
            throw new Error(errorMessage);
        next[camelKey] = Math.floor(value);
    }
    if (sessionMemoryCompactMaxSectionTokens !== undefined) {
        const value = Number(sessionMemoryCompactMaxSectionTokens);
        if (!Number.isFinite(value) || value < 250 || value > 20_000)
            throw new Error("Session Memory 单章节 compact 投影必须介于 250 和 20000 token");
        next.sessionMemoryCompactMaxSectionTokens = Math.floor(value);
    }
    if (sessionMemoryCompactMaxTotalTokens !== undefined) {
        const value = Number(sessionMemoryCompactMaxTotalTokens);
        if (!Number.isFinite(value) || value < 1_000 || value > 100_000)
            throw new Error("Session Memory compact 总投影必须介于 1000 和 100000 token");
        next.sessionMemoryCompactMaxTotalTokens = Math.floor(value);
    }
    if (Number(next.sessionMemoryCompactMaxTotalTokens || 0) < Number(next.sessionMemoryCompactMaxSectionTokens || 0)) {
        throw new Error("Session Memory compact 总投影不能小于单章节投影");
    }
    const groupSessionRetentionDays = updates.groupSessionRetentionDays ?? updates.group_session_retention_days;
    const groupSessionMaxArchived = updates.groupSessionMaxArchived ?? updates.group_session_max_archived;
    if (groupSessionRetentionDays !== undefined) {
        const value = Number(groupSessionRetentionDays);
        if (!Number.isFinite(value) || value < 1 || value > 3650)
            throw new Error("会话保留天数必须介于 1 和 3650 天");
        next.groupSessionRetentionDays = Math.floor(value);
    }
    if (groupSessionMaxArchived !== undefined) {
        const value = Number(groupSessionMaxArchived);
        if (!Number.isFinite(value) || value < 1 || value > 1000)
            throw new Error("最大归档会话数必须介于 1 和 1000");
        next.groupSessionMaxArchived = Math.floor(value);
    }
    const groupSessionAutoPruneEnabled = updates.groupSessionAutoPruneEnabled ?? updates.group_session_auto_prune_enabled;
    const groupSessionRetentionIntervalHours = updates.groupSessionRetentionIntervalHours ?? updates.group_session_retention_interval_hours;
    const groupSessionArtifactAutoArchiveEnabled = updates.groupSessionArtifactAutoArchiveEnabled ?? updates.group_session_artifact_auto_archive_enabled;
    const groupSessionArtifactHotExecutions = updates.groupSessionArtifactHotExecutions ?? updates.group_session_artifact_hot_executions;
    const groupSessionArtifactMaxHotMb = updates.groupSessionArtifactMaxHotMb ?? updates.group_session_artifact_max_hot_mb;
    const groupSessionArtifactMaxAgeDays = updates.groupSessionArtifactMaxAgeDays ?? updates.group_session_artifact_max_age_days;
    if (groupSessionAutoPruneEnabled !== undefined)
        next.groupSessionAutoPruneEnabled = groupSessionAutoPruneEnabled === true;
    if (groupSessionRetentionIntervalHours !== undefined) {
        const value = Number(groupSessionRetentionIntervalHours);
        if (!Number.isFinite(value) || value < 1 || value > 720)
            throw new Error("会话保留维护周期必须介于 1 和 720 小时");
        next.groupSessionRetentionIntervalHours = Math.floor(value);
    }
    if (groupSessionArtifactAutoArchiveEnabled !== undefined)
        next.groupSessionArtifactAutoArchiveEnabled = groupSessionArtifactAutoArchiveEnabled === true;
    if (groupSessionArtifactHotExecutions !== undefined) {
        const value = Number(groupSessionArtifactHotExecutions);
        if (!Number.isFinite(value) || value < 2 || value > 1000)
            throw new Error("热抽取记录数必须介于 2 和 1000");
        next.groupSessionArtifactHotExecutions = Math.floor(value);
    }
    if (groupSessionArtifactMaxHotMb !== undefined) {
        const value = Number(groupSessionArtifactMaxHotMb);
        if (!Number.isFinite(value) || value < 1 || value > 10240)
            throw new Error("抽取制品热存储上限必须介于 1 和 10240 MB");
        next.groupSessionArtifactMaxHotMb = Math.floor(value);
    }
    if (groupSessionArtifactMaxAgeDays !== undefined) {
        const value = Number(groupSessionArtifactMaxAgeDays);
        if (!Number.isFinite(value) || value < 1 || value > 3650)
            throw new Error("抽取制品热存储天数必须介于 1 和 3650 天");
        next.groupSessionArtifactMaxAgeDays = Math.floor(value);
    }
    if (Number(next.modelContextWindow || 0) > 0) {
        if (Number(next.modelContextWindow) < 32_000)
            throw new Error("自定义上下文窗口不能小于 32,000 token");
        if (Number(next.modelAutoCompactTokenLimit || 0) >= Number(next.modelContextWindow) - 3_000) {
            throw new Error("自动压缩阈值必须至少比上下文窗口低 3,000 token");
        }
    }
    if (updates.apiKey !== undefined && String(updates.apiKey || "").trim()) {
        next.apiKey = String(updates.apiKey).trim();
    }
    if (updates.summaryReviewerEnabled !== undefined)
        next.summaryReviewerEnabled = updates.summaryReviewerEnabled === true;
    if (updates.summaryReviewerFormat !== undefined) {
        const value = String(updates.summaryReviewerFormat || "openai-compatible");
        if (!["openai-compatible", "openai-responses", "anthropic-compatible", "gemini-compatible"].includes(value))
            throw new Error("摘要复核模型接口协议无效");
        next.summaryReviewerFormat = value;
    }
    if (updates.summaryReviewerApiUrl !== undefined) {
        const value = String(updates.summaryReviewerApiUrl || "").trim();
        if (value && !/^https?:\/\//i.test(value))
            throw new Error("摘要复核 API 地址必须以 http:// 或 https:// 开头");
        next.summaryReviewerApiUrl = value;
    }
    if (updates.summaryReviewerModel !== undefined)
        next.summaryReviewerModel = String(updates.summaryReviewerModel || "").trim();
    if (updates.summaryReviewerApiKey !== undefined && String(updates.summaryReviewerApiKey || "").trim())
        next.summaryReviewerApiKey = String(updates.summaryReviewerApiKey).trim();
    if (updates.summaryReviewerSampleRate !== undefined) {
        const value = Number(updates.summaryReviewerSampleRate);
        if (!Number.isFinite(value) || value < 0 || value > 1)
            throw new Error("摘要复核抽样比例必须介于 0 和 1");
        next.summaryReviewerSampleRate = value;
    }
    if (updates.summaryReviewerTimeoutMs !== undefined) {
        const value = Number(updates.summaryReviewerTimeoutMs);
        if (!Number.isFinite(value) || value < 5000 || value > 120000)
            throw new Error("摘要复核超时必须介于 5,000 和 120,000 毫秒");
        next.summaryReviewerTimeoutMs = Math.floor(value);
    }
    persistOrchestratorConfig(next);
    return next;
}
function publicOrchestratorConfig(config = loadOrchestratorConfig()) {
    const { apiKey, summaryReviewerApiKey, searchMcpToken, braveSearchApiKey, bingSearchApiKey, googleCseApiKey, googleCseId, searchMcpUrl, ...safe } = config;
    return {
        ...safe,
        providerContextCache: (0, provider_neutral_context_cache_1.providerNeutralContextCacheCapability)(config),
        providerCacheCapability: (0, provider_cache_capability_registry_1.readProviderCacheCapabilityState)(config),
        providerNativeMicrocompactCapability: (0, provider_native_microcompact_capability_1.readProviderNativeMicrocompactCapability)(config),
        providerNativeToolsCapability: (0, provider_native_tool_capability_1.readProviderNativeToolCapability)(config),
        hasKey: !!apiKey,
        credentialProtected: !!apiKey,
        summaryReviewerHasKey: !!summaryReviewerApiKey,
        webSearchProvidersConfigured: {
            mcp: !!searchMcpUrl,
            brave: !!braveSearchApiKey,
            bing: !!bingSearchApiKey,
            google: !!googleCseApiKey && !!googleCseId,
        },
        consumers: ["global-agent", "group-main-agent", "project-main-agent", "music-agent"],
        boundary: buildGroupMainAgentBoundary("config"),
    };
}
function friendlyUnifiedModelError(error) {
    const text = String(error?.message || error || "模型连接失败");
    if (/HTTP\s+(401|403)/i.test(text))
        return "API Key 无效或没有访问权限";
    if (/HTTP\s+404/i.test(text))
        return "接口地址或模型端点不正确";
    if (/HTTP\s+429/i.test(text))
        return "模型服务当前限流，请稍后重试";
    if (/abort|timeout|timed out/i.test(text))
        return "模型连接超时";
    if (/API URL 未配置/i.test(text))
        return "请填写 API 接口地址";
    if (/API Key 未配置/i.test(text))
        return "请填写 API Key";
    if (/模型未配置/i.test(text))
        return "请填写模型名称";
    return text.replace(/\s+/g, " ").slice(0, 240);
}
async function testUnifiedModelConnection() {
    const config = loadOrchestratorConfig();
    const contextCacheAdapter = (0, provider_context_cache_adapters_1.providerCacheAdapterPublicSummary)(config);
    const startedAt = Date.now();
    const provider = (0, group_orchestrator_llm_client_1.shouldUseAnthropic)(config) ? "anthropic-compatible" : (0, group_orchestrator_llm_client_1.shouldUseGemini)(config) ? "gemini-compatible" : (0, group_orchestrator_llm_client_1.shouldUseOpenAiResponses)(config) ? "openai-responses" : "openai-compatible";
    const consumers = [
        { id: "global-agent", label: "全局 Agent" },
        { id: "group-main-agent", label: "群聊主 Agent" },
        { id: "music-agent", label: "音乐 Agent" },
    ];
    try {
        if (config.enabled === false)
            throw new Error("统一大模型已关闭");
        // Connection checks stay lightweight: never attach reasoning / thinking params.
        const testConfig = {
            ...config,
            timeoutMs: Math.min(120_000, Math.max(5_000, Number(config.timeoutMs) || 60_000)),
            reasoningEffort: "off",
        };
        const messages = [{ role: "user", content: "仅回复 OK" }];
        const content = provider === "anthropic-compatible"
            ? await (0, group_orchestrator_llm_client_1.callAnthropicCompatibleChat)(testConfig, {
                system: "You are running a CCM unified-model connectivity check. Return only a short health response.",
                messages,
                maxTokens: 16,
                temperature: 0,
                defaultTimeoutMs: 15_000,
            })
            : await (0, group_orchestrator_llm_client_1.callOpenAiCompatibleChat)(testConfig, {
                messages: [{ role: "system", content: "You are running a CCM unified-model connectivity check. Return only a short health response." }, ...messages],
                maxTokens: 16,
                temperature: 0,
                defaultTimeoutMs: 15_000,
            });
        if (!String(content || "").trim())
            throw new Error("模型返回了空响应");
        // Connection health is intentionally independent from optional cache
        // capability evidence. A cache probe may degrade without making the
        // configured model unavailable.
        const latencyMs = Date.now() - startedAt;
        return {
            success: true,
            checkedAt: new Date().toISOString(),
            latencyMs,
            provider,
            model: config.model,
            message: `连接正常，响应耗时 ${latencyMs} ms`,
            contextCacheAdapter,
            providerCacheCapability: (0, provider_cache_capability_registry_1.readProviderCacheCapabilityState)(config),
            providerNativeMicrocompactCapability: (0, provider_native_microcompact_capability_1.readProviderNativeMicrocompactCapability)(config),
            capabilityProbe: null,
            endpoint: config.apiUrl,
            protocol: provider,
            consumers: consumers.map(item => ({ ...item, ready: true })),
        };
    }
    catch (error) {
        return {
            success: false,
            checkedAt: new Date().toISOString(),
            latencyMs: Date.now() - startedAt,
            provider,
            model: config.model || "",
            message: friendlyUnifiedModelError(error),
            contextCacheAdapter,
            providerCacheCapability: (0, provider_cache_capability_registry_1.readProviderCacheCapabilityState)(config),
            providerNativeMicrocompactCapability: (0, provider_native_microcompact_capability_1.readProviderNativeMicrocompactCapability)(config),
            consumers: consumers.map(item => ({ ...item, ready: false })),
        };
    }
}
function buildGroupMainAgentBoundary(planner = "coded_fallback") {
    return {
        layer: "group_main_agent",
        planner,
        runtime: "coded_orchestrator",
        responsibility: "per-group planning, dispatch, receipt review",
    };
}
//# sourceMappingURL=group-orchestrator-config.js.map