import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { isCredentialReference, protectCredential, resolveCredential } from "../../core/credential-store";
import {
  callAnthropicCompatibleChat,
  callOpenAiCompatibleChat,
  shouldUseAnthropic,
} from "./group-orchestrator-llm-client";

export const COORDINATOR_PROJECT = "coordinator";

export const DEFAULT_GROUP_ORCHESTRATOR = {
  enabled: true,
  mode: "llm_or_coded_coordinator",
  coordinatorProject: COORDINATOR_PROJECT,
  maxDepth: 3,
};

export const CCM_DIR = path.join(os.homedir(), ".cc-connect");

const ORCHESTRATOR_CONFIG_FILE = path.join(CCM_DIR, "group-orchestrator-config.json");

export function defaultOrchestratorConfig() {
  return {
    enabled: true,
    format: "openai-compatible",
    apiUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "",
    temperature: 0.2,
    timeoutMs: 120000,
    fallbackToRules: true,
    memoryContextPreset: "default",
    modelContextWindow: 0,
    modelAutoCompactTokenLimit: 0,
    timeBasedMicrocompactEnabled: false,
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
  };
}

function writeStoredOrchestratorConfig(stored: any) {
  fs.mkdirSync(path.dirname(ORCHESTRATOR_CONFIG_FILE), { recursive: true });
  const temp = `${ORCHESTRATOR_CONFIG_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(stored, null, 2), "utf-8");
  fs.renameSync(temp, ORCHESTRATOR_CONFIG_FILE);
}

export function loadOrchestratorConfig() {
  try {
    if (!fs.existsSync(ORCHESTRATOR_CONFIG_FILE)) return defaultOrchestratorConfig();
    const stored = JSON.parse(fs.readFileSync(ORCHESTRATOR_CONFIG_FILE, "utf-8"));
    if (stored.apiKey && !isCredentialReference(stored.apiKey)) {
      const protectedApiKey = protectCredential("unified-model", "apiKey", stored.apiKey);
      try { writeStoredOrchestratorConfig({ ...stored, apiKey: protectedApiKey }); } catch {}
      stored.apiKey = protectedApiKey;
    }
    return {
      ...defaultOrchestratorConfig(),
      ...stored,
      apiKey: stored.apiKey ? resolveCredential(stored.apiKey) : "",
    };
  } catch {
    return defaultOrchestratorConfig();
  }
}

function persistOrchestratorConfig(config: any) {
  const stored = {
    ...config,
    apiKey: config.apiKey ? protectCredential("unified-model", "apiKey", config.apiKey) : "",
  };
  writeStoredOrchestratorConfig(stored);
}

export function saveOrchestratorConfig(updates: any) {
  const current = loadOrchestratorConfig();
  const next = { ...current };
  if (updates.enabled !== undefined) next.enabled = !!updates.enabled;
  if (updates.format !== undefined) {
    const format = String(updates.format || "openai-compatible").trim();
    if (!["auto", "openai-compatible", "anthropic-compatible"].includes(format)) throw new Error("不支持的大模型接口协议");
    next.format = format;
  }
  if (updates.apiUrl !== undefined) {
    const apiUrl = String(updates.apiUrl || "").trim();
    if (apiUrl && !/^https?:\/\//i.test(apiUrl)) throw new Error("大模型 API 地址必须以 http:// 或 https:// 开头");
    next.apiUrl = apiUrl;
  }
  if (updates.model !== undefined) next.model = String(updates.model || "").trim();
  if (updates.temperature !== undefined) {
    const temperature = Number(updates.temperature);
    if (!Number.isFinite(temperature) || temperature < 0 || temperature > 1) throw new Error("模型温度必须介于 0 和 1");
    next.temperature = temperature;
  }
  if (updates.timeoutMs !== undefined) {
    const timeoutMs = Number(updates.timeoutMs);
    if (!Number.isFinite(timeoutMs) || timeoutMs < 5_000 || timeoutMs > 300_000) throw new Error("模型超时必须介于 5,000 和 300,000 毫秒");
    next.timeoutMs = Math.floor(timeoutMs);
  }
  if (updates.fallbackToRules !== undefined) next.fallbackToRules = !!updates.fallbackToRules;
  const memoryContextPreset = updates.memoryContextPreset ?? updates.memory_context_preset;
  const modelContextWindow = updates.modelContextWindow ?? updates.model_context_window;
  const modelAutoCompactTokenLimit = updates.modelAutoCompactTokenLimit ?? updates.model_auto_compact_token_limit;
  const typedMemoryDeliveryLimits = [
    ["typedMemoryDeliveryMaxDocuments", "typed_memory_delivery_max_documents", 1, 5, "记忆投递文件数必须介于 1 和 5"],
    ["typedMemoryDeliveryMaxBytesPerDocument", "typed_memory_delivery_max_bytes_per_document", 512, 4096, "单份记忆投递容量必须介于 512 和 4096 bytes"],
    ["typedMemoryDeliveryMaxLinesPerDocument", "typed_memory_delivery_max_lines_per_document", 10, 200, "单份记忆投递行数必须介于 10 和 200 行"],
    ["typedMemoryDeliveryMaxSessionBytes", "typed_memory_delivery_max_session_bytes", 4096, 60 * 1024, "任务会话单个压缩周期的记忆投递容量必须介于 4096 和 61440 bytes"],
    ["typedMemoryDeliveryMaxTokens", "typed_memory_delivery_max_tokens", 500, 20_000, "记忆投递 token 上限必须介于 500 和 20000"],
  ] as const;
  const sessionMemoryCompactMaxSectionTokens = updates.sessionMemoryCompactMaxSectionTokens
    ?? updates.session_memory_compact_max_section_tokens;
  const sessionMemoryCompactMaxTotalTokens = updates.sessionMemoryCompactMaxTotalTokens
    ?? updates.session_memory_compact_max_total_tokens;
  if (memoryContextPreset !== undefined) {
    const preset = String(memoryContextPreset || "default").trim().toLowerCase();
    if (!["default", "516k", "1m", "custom"].includes(preset)) throw new Error("不支持的上下文容量预设");
    next.memoryContextPreset = preset;
  }
  if (modelContextWindow !== undefined) {
    const value = Number(modelContextWindow || 0);
    if (!Number.isFinite(value) || value < 0 || value > 4_000_000) throw new Error("上下文窗口必须介于 0 和 4,000,000 token");
    next.modelContextWindow = Math.floor(value);
  }
  if (modelAutoCompactTokenLimit !== undefined) {
    const value = Number(modelAutoCompactTokenLimit || 0);
    if (!Number.isFinite(value) || value < 0 || value > 3_980_000) throw new Error("自动压缩阈值必须介于 0 和 3,980,000 token");
    next.modelAutoCompactTokenLimit = Math.floor(value);
  }
  const timeBasedMicrocompactEnabled = updates.timeBasedMicrocompactEnabled ?? updates.time_based_microcompact_enabled;
  const timeBasedThinkingClearEnabled = updates.timeBasedThinkingClearEnabled ?? updates.time_based_thinking_clear_enabled;
  const timeBasedMicrocompactGapMinutes = updates.timeBasedMicrocompactGapMinutes ?? updates.time_based_microcompact_gap_minutes;
  const timeBasedMicrocompactKeepRecent = updates.timeBasedMicrocompactKeepRecent ?? updates.time_based_microcompact_keep_recent;
  if (timeBasedMicrocompactEnabled !== undefined) next.timeBasedMicrocompactEnabled = timeBasedMicrocompactEnabled === true;
  if (timeBasedThinkingClearEnabled !== undefined) next.timeBasedThinkingClearEnabled = timeBasedThinkingClearEnabled === true;
  if (timeBasedMicrocompactGapMinutes !== undefined) {
    const value = Number(timeBasedMicrocompactGapMinutes);
    if (!Number.isFinite(value) || value < 1 || value > 10_080) throw new Error("时间触发 microcompact 间隔必须介于 1 和 10080 分钟");
    next.timeBasedMicrocompactGapMinutes = Math.floor(value);
  }
  if (timeBasedMicrocompactKeepRecent !== undefined) {
    const value = Number(timeBasedMicrocompactKeepRecent);
    if (!Number.isFinite(value) || value < 1 || value > 100) throw new Error("时间触发 microcompact 保留工具结果数必须介于 1 和 100");
    next.timeBasedMicrocompactKeepRecent = Math.floor(value);
  }
  for (const [camelKey, snakeKey, min, max, errorMessage] of typedMemoryDeliveryLimits) {
    const raw = updates[camelKey] ?? updates[snakeKey];
    if (raw === undefined) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < min || value > max) throw new Error(errorMessage);
    next[camelKey] = Math.floor(value);
  }
  if (sessionMemoryCompactMaxSectionTokens !== undefined) {
    const value = Number(sessionMemoryCompactMaxSectionTokens);
    if (!Number.isFinite(value) || value < 250 || value > 20_000) throw new Error("Session Memory 单章节 compact 投影必须介于 250 和 20000 token");
    next.sessionMemoryCompactMaxSectionTokens = Math.floor(value);
  }
  if (sessionMemoryCompactMaxTotalTokens !== undefined) {
    const value = Number(sessionMemoryCompactMaxTotalTokens);
    if (!Number.isFinite(value) || value < 1_000 || value > 100_000) throw new Error("Session Memory compact 总投影必须介于 1000 和 100000 token");
    next.sessionMemoryCompactMaxTotalTokens = Math.floor(value);
  }
  if (Number(next.sessionMemoryCompactMaxTotalTokens || 0) < Number(next.sessionMemoryCompactMaxSectionTokens || 0)) {
    throw new Error("Session Memory compact 总投影不能小于单章节投影");
  }
  const groupSessionRetentionDays = updates.groupSessionRetentionDays ?? updates.group_session_retention_days;
  const groupSessionMaxArchived = updates.groupSessionMaxArchived ?? updates.group_session_max_archived;
  if (groupSessionRetentionDays !== undefined) {
    const value = Number(groupSessionRetentionDays);
    if (!Number.isFinite(value) || value < 1 || value > 3650) throw new Error("会话保留天数必须介于 1 和 3650 天");
    next.groupSessionRetentionDays = Math.floor(value);
  }
  if (groupSessionMaxArchived !== undefined) {
    const value = Number(groupSessionMaxArchived);
    if (!Number.isFinite(value) || value < 1 || value > 1000) throw new Error("最大归档会话数必须介于 1 和 1000");
    next.groupSessionMaxArchived = Math.floor(value);
  }
  const groupSessionAutoPruneEnabled = updates.groupSessionAutoPruneEnabled ?? updates.group_session_auto_prune_enabled;
  const groupSessionRetentionIntervalHours = updates.groupSessionRetentionIntervalHours ?? updates.group_session_retention_interval_hours;
  const groupSessionArtifactAutoArchiveEnabled = updates.groupSessionArtifactAutoArchiveEnabled ?? updates.group_session_artifact_auto_archive_enabled;
  const groupSessionArtifactHotExecutions = updates.groupSessionArtifactHotExecutions ?? updates.group_session_artifact_hot_executions;
  const groupSessionArtifactMaxHotMb = updates.groupSessionArtifactMaxHotMb ?? updates.group_session_artifact_max_hot_mb;
  const groupSessionArtifactMaxAgeDays = updates.groupSessionArtifactMaxAgeDays ?? updates.group_session_artifact_max_age_days;
  if (groupSessionAutoPruneEnabled !== undefined) next.groupSessionAutoPruneEnabled = groupSessionAutoPruneEnabled === true;
  if (groupSessionRetentionIntervalHours !== undefined) {
    const value = Number(groupSessionRetentionIntervalHours);
    if (!Number.isFinite(value) || value < 1 || value > 720) throw new Error("会话保留维护周期必须介于 1 和 720 小时");
    next.groupSessionRetentionIntervalHours = Math.floor(value);
  }
  if (groupSessionArtifactAutoArchiveEnabled !== undefined) next.groupSessionArtifactAutoArchiveEnabled = groupSessionArtifactAutoArchiveEnabled === true;
  if (groupSessionArtifactHotExecutions !== undefined) {
    const value = Number(groupSessionArtifactHotExecutions);
    if (!Number.isFinite(value) || value < 2 || value > 1000) throw new Error("热抽取记录数必须介于 2 和 1000");
    next.groupSessionArtifactHotExecutions = Math.floor(value);
  }
  if (groupSessionArtifactMaxHotMb !== undefined) {
    const value = Number(groupSessionArtifactMaxHotMb);
    if (!Number.isFinite(value) || value < 1 || value > 10240) throw new Error("抽取制品热存储上限必须介于 1 和 10240 MB");
    next.groupSessionArtifactMaxHotMb = Math.floor(value);
  }
  if (groupSessionArtifactMaxAgeDays !== undefined) {
    const value = Number(groupSessionArtifactMaxAgeDays);
    if (!Number.isFinite(value) || value < 1 || value > 3650) throw new Error("抽取制品热存储天数必须介于 1 和 3650 天");
    next.groupSessionArtifactMaxAgeDays = Math.floor(value);
  }
  if (Number(next.modelContextWindow || 0) > 0) {
    if (Number(next.modelContextWindow) < 32_000) throw new Error("自定义上下文窗口不能小于 32,000 token");
    if (Number(next.modelAutoCompactTokenLimit || 0) >= Number(next.modelContextWindow) - 3_000) {
      throw new Error("自动压缩阈值必须至少比上下文窗口低 3,000 token");
    }
  }
  if (updates.apiKey !== undefined && String(updates.apiKey || "").trim()) {
    next.apiKey = String(updates.apiKey).trim();
  }
  persistOrchestratorConfig(next);
  return next;
}

export function publicOrchestratorConfig(config = loadOrchestratorConfig()) {
  const { apiKey, ...safe } = config;
  return {
    ...safe,
    hasKey: !!apiKey,
    credentialProtected: !!apiKey,
    consumers: ["global-agent", "group-main-agent", "music-agent"],
    boundary: buildGroupMainAgentBoundary("config"),
  };
}

function friendlyUnifiedModelError(error: any) {
  const text = String(error?.message || error || "模型连接失败");
  if (/HTTP\s+(401|403)/i.test(text)) return "API Key 无效或没有访问权限";
  if (/HTTP\s+404/i.test(text)) return "接口地址或模型端点不正确";
  if (/HTTP\s+429/i.test(text)) return "模型服务当前限流，请稍后重试";
  if (/abort|timeout|timed out/i.test(text)) return "模型连接超时";
  if (/API URL 未配置/i.test(text)) return "请填写 API 接口地址";
  if (/API Key 未配置/i.test(text)) return "请填写 API Key";
  if (/模型未配置/i.test(text)) return "请填写模型名称";
  return text.replace(/\s+/g, " ").slice(0, 240);
}

export async function testUnifiedModelConnection() {
  const config = loadOrchestratorConfig();
  const startedAt = Date.now();
  const provider = shouldUseAnthropic(config) ? "anthropic-compatible" : "openai-compatible";
  const consumers = [
    { id: "global-agent", label: "全局 Agent" },
    { id: "group-main-agent", label: "群聊主 Agent" },
    { id: "music-agent", label: "音乐 Agent" },
  ];
  try {
    if (config.enabled === false) throw new Error("统一大模型已关闭");
    const testConfig = { ...config, timeoutMs: Math.min(20_000, Math.max(5_000, Number(config.timeoutMs) || 15_000)) };
    const messages = [{ role: "user", content: "仅回复 OK" }];
    const content = provider === "anthropic-compatible"
      ? await callAnthropicCompatibleChat(testConfig, {
        system: "你正在执行 CCM 统一大模型连通性检查。",
        messages,
        maxTokens: 16,
        temperature: 0,
        defaultTimeoutMs: 15_000,
      })
      : await callOpenAiCompatibleChat(testConfig, {
        messages: [{ role: "system", content: "你正在执行 CCM 统一大模型连通性检查。" }, ...messages],
        maxTokens: 16,
        temperature: 0,
        defaultTimeoutMs: 15_000,
      });
    if (!String(content || "").trim()) throw new Error("模型返回了空响应");
    const latencyMs = Date.now() - startedAt;
    return {
      success: true,
      checkedAt: new Date().toISOString(),
      latencyMs,
      provider,
      model: config.model,
      message: `连接正常，响应耗时 ${latencyMs} ms`,
      consumers: consumers.map(item => ({ ...item, ready: true })),
    };
  } catch (error: any) {
    return {
      success: false,
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      provider,
      model: config.model || "",
      message: friendlyUnifiedModelError(error),
      consumers: consumers.map(item => ({ ...item, ready: false })),
    };
  }
}

export function buildGroupMainAgentBoundary(planner = "coded_fallback") {
  return {
    layer: "group_main_agent",
    planner,
    runtime: "coded_orchestrator",
    responsibility: "per-group planning, dispatch, receipt review",
  };
}
