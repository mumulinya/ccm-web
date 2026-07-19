import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { spawnSync } from "child_process";
import { getNativeContinuationCapabilityProfile } from "./native-continuation";
export type AgentRuntimeId = "claudecode" | "claude" | "cursor" | "gemini" | "codex" | "qoder";

export interface AgentCommandOptions {
  cliAllowedTools?: string[];
  mcpConfigPath?: string;
  sessionId?: string;
  resumeSession?: boolean;
  persistSession?: boolean;
  appendSystemPromptFile?: string;
  developerInstructionsFile?: string;
}

export interface AgentRuntimeDescriptor {
  id: AgentRuntimeId;
  aliases: string[];
  label: string;
  commandLabel: string;
  capabilities: {
    print: boolean;
    streaming: boolean;
    externalRunner: boolean;
    worktreeIsolation: boolean;
    sessionResume: boolean;
    scratchpadContinuation: boolean;
  };
  buildCommand: (msgFile: string, options?: AgentCommandOptions) => string;
}

export interface AgentRuntimeVersionSnapshot {
  schema: "ccm-agent-runtime-version-snapshot-v1";
  version: 1;
  provider: string;
  command: string;
  executablePaths: string[];
  executableIdentityChecksum: string;
  versionText: string;
  semanticVersion: string;
  status: "ok" | "command_missing" | "version_probe_failed";
  observedAt: string;
  snapshotChecksum: string;
}

const AGENT_RUNTIME_VERSION_CACHE = new Map<string, Omit<AgentRuntimeVersionSnapshot, "observedAt" | "snapshotChecksum">>();

function stableRuntimeChecksum(value: any) {
  const canonical = (input: any): any => Array.isArray(input)
    ? input.map(canonical)
    : input && typeof input === "object"
      ? Object.keys(input).sort().reduce((result: any, key) => {
          if (input[key] !== undefined) result[key] = canonical(input[key]);
          return result;
        }, {})
      : input;
  return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

function getRuntimeVersionCommand(agentType: string) {
  const provider = normalizeAgentRuntimeId(agentType);
  if (provider === "claudecode") return "claude";
  if (provider === "codex") return "codex";
  if (provider === "cursor") {
    const explicit = String(process.env.CCM_CURSOR_AGENT_COMMAND || "").trim();
    if (explicit) return explicit;
    return commandExists("cursor-agent") ? "cursor-agent" : "agent";
  }
  if (provider === "gemini") return "gemini";
  if (provider === "qoder") return "qodercli";
  return provider;
}

function resolveRuntimeExecutablePaths(command: string) {
  const explicitPath = String(command || "").trim().replace(/^"|"$/g, "");
  if (/[\\/]/.test(explicitPath)) {
    try {
      if (fs.statSync(explicitPath).isFile()) return [path.resolve(explicitPath)];
    } catch {}
  }
  try {
    const result = process.platform === "win32"
      ? spawnSync("where.exe", [command], { windowsHide: true, encoding: "utf-8" })
      : spawnSync("sh", ["-lc", `command -v ${command}`], { encoding: "utf-8" });
    if (result.status !== 0) return [];
    return Array.from(new Set(String(result.stdout || "").split(/\r?\n/).map(item => item.trim()).filter(Boolean)));
  } catch { return []; }
}

function executableFileIdentity(paths: string[]) {
  return paths.map(file => {
    try {
      const stat = fs.statSync(file);
      return { file: path.resolve(file), size: stat.size, mtimeMs: Math.trunc(stat.mtimeMs) };
    } catch { return { file: path.resolve(file), size: -1, mtimeMs: -1 }; }
  });
}

export function captureAgentRuntimeVersionSnapshot(agentType: string): AgentRuntimeVersionSnapshot {
  const provider = normalizeAgentRuntimeId(agentType);
  const command = getRuntimeVersionCommand(provider);
  const executablePaths = resolveRuntimeExecutablePaths(command);
  const executableIdentity = executableFileIdentity(executablePaths);
  const executableIdentityChecksum = stableRuntimeChecksum({ provider, command, executableIdentity });
  const cacheKey = `${provider}:${executableIdentityChecksum}`;
  let base = AGENT_RUNTIME_VERSION_CACHE.get(cacheKey);
  if (!base) {
    let status: AgentRuntimeVersionSnapshot["status"] = executablePaths.length ? "version_probe_failed" : "command_missing";
    let versionText = "";
    if (executablePaths.length) {
      try {
        const result = spawnSync(command, ["--version"], {
          windowsHide: true,
          encoding: "utf-8",
          shell: process.platform === "win32",
          timeout: 10_000,
        });
        versionText = String(result.stdout || result.stderr || "").trim().split(/\r?\n/).slice(0, 4).join(" ").slice(0, 240);
        if (result.status === 0 && versionText) status = "ok";
      } catch {}
    }
    const semanticVersion = versionText.match(/\b\d+(?:\.\d+){1,3}(?:[-+][0-9A-Za-z.-]+)?\b/)?.[0] || "";
    base = {
      schema: "ccm-agent-runtime-version-snapshot-v1",
      version: 1,
      provider,
      command,
      executablePaths,
      executableIdentityChecksum,
      versionText,
      semanticVersion,
      status,
    };
    AGENT_RUNTIME_VERSION_CACHE.set(cacheKey, base);
  }
  const observedAt = new Date().toISOString();
  const snapshot: AgentRuntimeVersionSnapshot = {
    ...base,
    observedAt,
    snapshotChecksum: "",
  };
  snapshot.snapshotChecksum = stableRuntimeChecksum({ ...snapshot, snapshotChecksum: undefined });
  return snapshot;
}

function quoteCmdArg(value: string) {
  return `"${String(value || "").replace(/"/g, "\\\"")}"`;
}

function encodeCliArgs(args: string[]) {
  return Buffer.from(JSON.stringify(args), "utf-8").toString("base64");
}

function formatAllowedToolsArg(options: AgentCommandOptions = {}) {
  const tools = Array.isArray(options.cliAllowedTools)
    ? Array.from(new Set(options.cliAllowedTools.map(item => String(item || "").trim()).filter(Boolean)))
    : [];
  if (!tools.length) return "";
  return ` --allowed-tools ${quoteCmdArg(tools.join(","))}`;
}

function pipeFileToCommand(msgFile: string, command: string, options: AgentCommandOptions = {}) {
  return `type "${msgFile}" | ${command}${formatAllowedToolsArg(options)}`;
}

function formatStrictMcpConfigArg(options: AgentCommandOptions = {}) {
  const configPath = String(options.mcpConfigPath || "").trim();
  return configPath ? ` --mcp-config ${quoteCmdArg(configPath)} --strict-mcp-config` : "";
}

function formatAppendSystemPromptFileArg(options: AgentCommandOptions = {}) {
  const file = String(options.appendSystemPromptFile || "").trim();
  return file ? ` --append-system-prompt-file ${quoteCmdArg(file)}` : "";
}

interface RuntimeLaunchMetadata {
  runtime?: string;
  runtimeHomePath?: string;
  isolatedHomePath?: string;
  pluginDirPath?: string;
}

function readRuntimeLaunchMetadata(options: AgentCommandOptions = {}): RuntimeLaunchMetadata {
  const configPath = String(options.mcpConfigPath || "").trim();
  if (!configPath) return {};
  const snapshotPath = path.join(path.dirname(configPath), "runtime-tool-snapshot.json");
  const fallbackSnapshotPath = path.join(path.dirname(path.dirname(configPath)), "runtime-tool-snapshot.json");
  for (const candidate of [snapshotPath, fallbackSnapshotPath]) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf-8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return {};
}

function formatPluginDirArg(metadata: RuntimeLaunchMetadata) {
  const pluginDir = String(metadata.pluginDirPath || "").trim();
  return pluginDir ? ` --plugin-dir ${quoteCmdArg(pluginDir)}` : "";
}

function getClaudePermissionMode() {
  const requested = String(process.env.CCM_CLAUDE_PERMISSION_MODE || "auto").trim();
  return ["acceptEdits", "auto", "bypassPermissions", "dontAsk", "manual", "plan"].includes(requested)
    ? requested
    : "auto";
}

function formatWindowsEnvPrefix(values: Record<string, string>) {
  const assignments = Object.entries(values)
    .filter(([, value]) => String(value || "").trim())
    .map(([key, value]) => `set "${key}=${String(value).replace(/"/g, "")}"`);
  return assignments.length ? `${assignments.join(" && ")} && ` : "";
}

function buildIsolatedHomeEnv(homePath: string, runtime: "cursor" | "codex") {
  const normalized = path.resolve(homePath);
  const root = path.parse(normalized).root.replace(/[\\/]$/, "");
  const homePathPart = root && normalized.toLowerCase().startsWith(root.toLowerCase())
    ? normalized.slice(root.length)
    : normalized;
  const env: Record<string, string> = {
    HOME: normalized,
    USERPROFILE: normalized,
    HOMEDRIVE: root,
    HOMEPATH: homePathPart || "\\",
  };
  if (runtime === "cursor") {
    env.CURSOR_CONFIG_DIR = path.join(normalized, ".cursor");
    env.CURSOR_DATA_DIR = path.join(normalized, ".cursor-data");
  } else {
    env.CODEX_HOME = normalized;
  }
  return env;
}

function buildCodexExecCommand(msgFile: string, options: AgentCommandOptions = {}) {
  const configPath = String(options.mcpConfigPath || "").trim();
  const metadata = readRuntimeLaunchMetadata(options);
  const runtimeHome = String(metadata.isolatedHomePath || metadata.runtimeHomePath || (configPath ? path.dirname(configPath) : "")).trim();
  const homePrefix = runtimeHome ? formatWindowsEnvPrefix(buildIsolatedHomeEnv(runtimeHome, "codex")) : "";
  const sessionId = String(options.sessionId || "").trim();
  const flags = formatCodexExecSafetyFlags();
  const sandboxMode = getCodexSandboxMode();
  const developerInstructionsFile = String(options.developerInstructionsFile || "").trim();
  const helper = path.join(__dirname, "codex-prompt-runner.js");
  if (options.persistSession && options.resumeSession && sessionId) {
    const args = ["exec", "resume", "-c", `sandbox_mode=${JSON.stringify(sandboxMode)}`, "--skip-git-repo-check", "--json", sessionId, "-"];
    return `${homePrefix}node ${quoteCmdArg(helper)} ${quoteCmdArg(msgFile)} ${quoteCmdArg(developerInstructionsFile)} ${quoteCmdArg(encodeCliArgs(args))}`;
  }
  const persistence = options.persistSession ? " --json" : " --ephemeral";
  const args = ["exec", ...flags.split(" "), persistence.trim(), "--skip-git-repo-check", "-"].filter(Boolean);
  return `${homePrefix}node ${quoteCmdArg(helper)} ${quoteCmdArg(msgFile)} ${quoteCmdArg(developerInstructionsFile)} ${quoteCmdArg(encodeCliArgs(args))}`;
}

function getCodexSandboxMode() {
  const requested = String(process.env.CCM_CODEX_SANDBOX || process.env.CCM_CODEX_SANDBOX_MODE || "").trim();
  if (["read-only", "workspace-write", "danger-full-access"].includes(requested)) return requested;
  return process.platform === "win32" ? "danger-full-access" : "workspace-write";
}

function formatCodexExecSafetyFlags() {
  const sandbox = getCodexSandboxMode();
  return sandbox === "workspace-write"
    ? "--full-auto --sandbox workspace-write"
    : `--sandbox ${sandbox}`;
}

function buildCursorAgentCommand(msgFile: string, options: AgentCommandOptions = {}) {
  const metadata = readRuntimeLaunchMetadata(options);
  const sessionId = String(options.sessionId || "").trim();
  const explicit = String(process.env.CCM_CURSOR_AGENT_COMMAND || "").trim();
  const available = (command: string) => process.platform === "win32"
    ? spawnSync("where.exe", [command], { windowsHide: true, stdio: "ignore" }).status === 0
    : spawnSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" }).status === 0;
  const command = explicit || (available("cursor-agent") ? "cursor-agent" : available("agent") ? "agent" : "cursor-agent");
  const isolatedHome = String(metadata.isolatedHomePath || "").trim();
  const homePrefix = isolatedHome ? formatWindowsEnvPrefix(buildIsolatedHomeEnv(isolatedHome, "cursor")) : "";
  const args = ["-p", "--force", "--trust"];
  if (metadata.pluginDirPath) {
    args.push("--approve-mcps", "--plugin-dir", String(metadata.pluginDirPath));
  }
  if (options.persistSession) args.push("--output-format", "json");
  if (options.persistSession && options.resumeSession && sessionId) args.push("--resume", sessionId);
  const helper = path.join(__dirname, "cli-prompt-runner.js");
  return `${homePrefix}node ${quoteCmdArg(helper)} ${quoteCmdArg(msgFile)} ${quoteCmdArg(command)} ${encodeCliArgs(args)}`;
}
export const AGENT_RUNTIMES: AgentRuntimeDescriptor[] = [
  {
    id: "claudecode",
    aliases: ["claudecode", "claude-code", "claude_code", "cc", "claude"],
    label: "Claude Code",
    commandLabel: "claude --permission-mode auto -p",
    capabilities: {
      print: true,
      streaming: false,
      externalRunner: true,
      worktreeIsolation: true,
      sessionResume: true,
      scratchpadContinuation: true,
    },
    buildCommand: (msgFile, options = {}) => {
      const sessionId = String(options.sessionId || "").trim();
      const sessionArg = options.persistSession && sessionId
        ? (options.resumeSession ? ` --resume ${quoteCmdArg(sessionId)}` : ` --session-id ${quoteCmdArg(sessionId)}`)
        : "";
      const metadata = readRuntimeLaunchMetadata(options);
      return `${pipeFileToCommand(msgFile, `claude --permission-mode ${getClaudePermissionMode()}`, options)}${formatStrictMcpConfigArg(options)}${formatPluginDirArg(metadata)}${formatAppendSystemPromptFileArg(options)}${sessionArg} -p`;
    },
  },
  {
    id: "cursor",
    aliases: ["cursor", "agent", "cursor-agent"],
    label: "Cursor Agent",
    commandLabel: "cursor-agent -p --force",
    capabilities: {
      print: true,
      streaming: false,
      externalRunner: true,
      worktreeIsolation: true,
      sessionResume: true,
      scratchpadContinuation: true,
    },
    buildCommand: (msgFile, options) => buildCursorAgentCommand(msgFile, options),
  },
  {
    id: "gemini",
    aliases: ["gemini"],
    label: "Gemini CLI",
    commandLabel: "gemini -p",
    capabilities: {
      print: true,
      streaming: false,
      externalRunner: true,
      worktreeIsolation: true,
      sessionResume: false,
      scratchpadContinuation: true,
    },
    buildCommand: msgFile => pipeFileToCommand(msgFile, "gemini -p"),
  },
  {
    id: "codex",
    aliases: ["codex"],
    label: "Codex CLI",
    commandLabel: "codex exec --full-auto -",
    capabilities: {
      print: true,
      streaming: false,
      externalRunner: true,
      worktreeIsolation: true,
      sessionResume: true,
      scratchpadContinuation: true,
    },
    buildCommand: (msgFile, options) => buildCodexExecCommand(msgFile, options),
  },
  {
    id: "qoder",
    aliases: ["qoder", "qoder-cli"],
    label: "Qoder CLI",
    commandLabel: "qodercli -p",
    capabilities: {
      print: true,
      streaming: false,
      externalRunner: true,
      worktreeIsolation: true,
      sessionResume: false,
      scratchpadContinuation: true,
    },
    buildCommand: msgFile => pipeFileToCommand(msgFile, "qodercli -p"),
  },
];

export function normalizeAgentRuntimeId(agentType = ""): AgentRuntimeId {
  const key = String(agentType || "").trim().toLowerCase();
  const runtime = AGENT_RUNTIMES.find(item => item.aliases.includes(key) || item.id === key);
  return runtime?.id || "claudecode";
}

export function getAgentRuntime(agentType = "") {
  const id = normalizeAgentRuntimeId(agentType);
  return AGENT_RUNTIMES.find(item => item.id === id) || AGENT_RUNTIMES[0];
}

export function buildAgentCommand(agentType: string, msgFile: string, options: AgentCommandOptions = {}) {
  return getAgentRuntime(agentType).buildCommand(msgFile, options);
}

export function getAgentCommandLabel(agentType: string) {
  return getAgentRuntime(agentType).commandLabel;
}

export function getPublicAgentRuntimes() {
  return AGENT_RUNTIMES.map(runtime => ({
    id: runtime.id,
    aliases: runtime.aliases,
    label: runtime.label,
    commandLabel: runtime.commandLabel,
    capabilities: runtime.capabilities,
    nativeContinuation: getNativeContinuationCapabilityProfile(runtime.id),
  }));
}

function commandExists(command: string) {
  try {
    const result = process.platform === "win32"
      ? spawnSync("where.exe", [command], { windowsHide: true, stdio: "ignore" })
      : spawnSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function isAgentRuntimeAvailable(agentType: string) {
  const runtime = normalizeAgentRuntimeId(agentType);
  if (runtime === "claudecode") return commandExists("claude");
  if (runtime === "cursor") return commandExists("cursor-agent") || commandExists("agent");
  if (runtime === "codex") return commandExists("codex");
  if (runtime === "gemini") return commandExists("gemini");
  if (runtime === "qoder") return commandExists("qodercli");
  return false;
}

export function getAgentRuntimeFallbackChain(preferred = "claudecode") {
  const preferredRuntime = normalizeAgentRuntimeId(preferred || "claudecode");
  const priority: AgentRuntimeId[] = ["claudecode", "cursor", "codex"];
  const ordered = [preferredRuntime, ...priority.filter(item => item !== preferredRuntime)];
  return ordered.filter((item, index, arr) => arr.indexOf(item) === index);
}

export function resolveAvailableAgentRuntime(preferred = "claudecode") {
  const chain = getAgentRuntimeFallbackChain(preferred);
  const selected = chain.find(isAgentRuntimeAvailable) || chain[0] || "claudecode";
  return {
    selected,
    preferred: normalizeAgentRuntimeId(preferred || "claudecode"),
    chain,
    switched: selected !== normalizeAgentRuntimeId(preferred || "claudecode"),
  };
}

export function extractAgentCommandUsage(rawOutput: string, agentType = "") {
  const provider = normalizeAgentRuntimeId(agentType || "");
  const usage = {
    inputTokens: 0,
    directInputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    cacheReadIncludedInInput: false,
    outputTokens: 0,
    providerTotalTokens: 0,
    totalTokens: 0,
    totalCostUsd: 0,
    reported: false,
    provider,
  };
  const takeMax = (current: number, ...values: any[]) => values.reduce((max, value) => {
    const number = Number(value || 0);
    return Number.isFinite(number) && number > max ? number : max;
  }, current);
  for (const line of String(rawOutput || "").split(/\r?\n/)) {
    const text = line.trim();
    if (!text.startsWith("{")) continue;
    try {
      const event = JSON.parse(text);
      const candidates = [
        event.usage,
        event.response?.usage,
        event.result?.usage,
        event.message?.usage,
        event.metadata?.usage,
      ].filter(item => item && typeof item === "object");
      for (const candidate of candidates) {
        const providerInputTokens = takeMax(0, candidate.input_tokens, candidate.inputTokens, candidate.prompt_tokens, candidate.promptTokens);
        const cacheCreationTokens = takeMax(0, candidate.cache_creation_input_tokens, candidate.cacheCreationInputTokens);
        const anthropicCacheReadTokens = takeMax(0, candidate.cache_read_input_tokens, candidate.cacheReadInputTokens);
        const includedCacheReadTokens = takeMax(0,
          candidate.cached_input_tokens,
          candidate.cachedInputTokens,
          candidate.prompt_tokens_details?.cached_tokens,
          candidate.promptTokensDetails?.cachedTokens,
          candidate.input_tokens_details?.cached_tokens,
          candidate.inputTokensDetails?.cachedTokens,
        );
        const cacheReadTokens = Math.max(anthropicCacheReadTokens, includedCacheReadTokens);
        const cacheReadIncludedInInput = includedCacheReadTokens > 0 && anthropicCacheReadTokens === 0;
        const directInputTokens = cacheReadIncludedInInput ? Math.max(0, providerInputTokens - cacheReadTokens) : providerInputTokens;
        const inputTokens = providerInputTokens + cacheCreationTokens + (cacheReadIncludedInInput ? 0 : cacheReadTokens);
        const outputTokens = takeMax(0, candidate.output_tokens, candidate.outputTokens, candidate.completion_tokens, candidate.completionTokens);
        const providerTotalTokens = takeMax(0, candidate.total_tokens, candidate.totalTokens);
        const costUsd = takeMax(0, candidate.total_cost_usd, candidate.totalCostUsd, candidate.cost_usd, candidate.costUsd);
        if (inputTokens > 0 || outputTokens > 0 || providerTotalTokens > 0 || costUsd > 0) usage.reported = true;
        usage.inputTokens = Math.max(usage.inputTokens, inputTokens);
        usage.directInputTokens = Math.max(usage.directInputTokens, directInputTokens);
        usage.cacheCreationInputTokens = Math.max(usage.cacheCreationInputTokens, cacheCreationTokens);
        usage.cacheReadInputTokens = Math.max(usage.cacheReadInputTokens, cacheReadTokens);
        usage.cacheReadIncludedInInput ||= cacheReadIncludedInInput;
        usage.outputTokens = Math.max(usage.outputTokens, outputTokens);
        usage.providerTotalTokens = Math.max(usage.providerTotalTokens, providerTotalTokens);
        usage.totalTokens = Math.max(usage.totalTokens, providerTotalTokens || inputTokens + outputTokens);
        usage.totalCostUsd = Math.max(usage.totalCostUsd, costUsd);
      }
      const eventCost = takeMax(0, event.total_cost_usd, event.totalCostUsd, event.cost_usd, event.costUsd);
      if (eventCost > 0) {
        usage.reported = true;
        usage.totalCostUsd = Math.max(usage.totalCostUsd, eventCost);
      }
    } catch {}
  }
  return usage;
}

function providerOutputShape(event: any) {
  if (!event || typeof event !== "object" || Array.isArray(event)) return "non_object";
  const top = Object.keys(event).sort().join(",");
  const nested = ["item", "message", "response", "metadata"]
    .filter(key => event[key] && typeof event[key] === "object" && !Array.isArray(event[key]))
    .map(key => `${key}(${Object.keys(event[key]).sort().join(",")})`);
  return [String(event.type || "untyped"), top, ...nested].join(":");
}

export function extractProviderOutputContractEvidence(agentType: string, rawOutput: string, options: any = {}) {
  const provider = normalizeAgentRuntimeId(agentType);
  const runtimeVersionSnapshot = options.runtimeVersionSnapshot || options.runtime_version_snapshot || null;
  const raw = String(rawOutput || "").trim();
  const parsedEvents: any[] = [];
  let invalidJsonLineCount = 0;
  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim();
    if (!text.startsWith("{")) continue;
    try { parsedEvents.push(JSON.parse(text)); } catch { invalidJsonLineCount += 1; }
  }
  const observedIds: string[] = [];
  const recognized: any[] = [];
  const driftReasons: string[] = [];
  for (let index = 0; index < parsedEvents.length; index += 1) {
    const event = parsedEvents[index];
    const eventType = String(event?.type || "");
    if (provider === "codex") {
      const id = String(event?.thread_id || event?.threadId || event?.session_id || event?.sessionId || "").trim();
      if (id) observedIds.push(id);
      if (eventType === "thread.started" && typeof event?.thread_id === "string" && event.thread_id.trim()) {
        recognized.push({ index, eventType, sessionIdPath: "thread_id", sessionId: event.thread_id.trim() });
      } else if (id) {
        driftReasons.push(`codex_session_id_contract_changed:${eventType || "untyped"}`);
      }
    } else if (provider === "cursor") {
      const id = String(event?.session_id || event?.sessionId || event?.thread_id || event?.threadId || "").trim();
      if (id) observedIds.push(id);
      const knownEventType = new Set(["system", "assistant", "user", "tool", "result", "error"]).has(eventType);
      if (knownEventType && typeof event?.session_id === "string" && event.session_id.trim()) {
        recognized.push({ index, eventType, sessionIdPath: "session_id", sessionId: event.session_id.trim() });
      } else if (id) {
        driftReasons.push(`cursor_session_id_contract_changed:${eventType || "untyped"}`);
      }
    }
  }
  const uniqueIds = Array.from(new Set(observedIds));
  if (uniqueIds.length > 1) driftReasons.push("provider_output_session_identity_conflict");
  if (invalidJsonLineCount > 0) driftReasons.push("provider_output_invalid_json_line");
  const matched = recognized.length ? recognized[recognized.length - 1] : null;
  const status = !["codex", "cursor"].includes(provider)
    ? "not_applicable"
    : recognized.length > 0 && uniqueIds.length <= 1 && invalidJsonLineCount === 0
      ? "recognized"
      : uniqueIds.length > 0 || parsedEvents.length > 0
        ? "output_format_drift"
        : "unstructured_output";
  const shapes = Array.from(new Set(parsedEvents.map(providerOutputShape))).sort();
  const parserVersion = 2;
  const contractDefinition = provider === "codex"
    ? { eventType: "thread.started", sessionIdPath: "thread_id" }
    : provider === "cursor"
      ? { eventTypes: ["assistant", "error", "result", "system", "tool", "user"], sessionIdPath: "session_id" }
      : { acknowledgement: "exit_success" };
  const runtimeIdentityChecksum = String(runtimeVersionSnapshot?.executableIdentityChecksum || "unresolved");
  const providerContractId = `pcc_${stableRuntimeChecksum({ provider, parserVersion, contractDefinition, runtimeIdentityChecksum }).slice(0, 24)}`;
  return {
    schema: "ccm-provider-output-contract-evidence-v2",
    version: 2,
    provider,
    parserVersion,
    providerContractId,
    contractDefinition,
    runtimeVersionSnapshot,
    runtimeVersionStatus: String(runtimeVersionSnapshot?.status || "unobserved"),
    runtimeVersion: String(runtimeVersionSnapshot?.semanticVersion || runtimeVersionSnapshot?.versionText || ""),
    runtimeIdentityChecksum,
    status,
    sessionId: uniqueIds.length === 1 ? uniqueIds[0] : "",
    trustedSessionId: status === "recognized" ? String(matched?.sessionId || "") : "",
    sessionIdPath: status === "recognized" ? String(matched?.sessionIdPath || "") : "",
    matchedEventType: status === "recognized" ? String(matched?.eventType || "") : "",
    parsedJsonEventCount: parsedEvents.length,
    recognizedContractEventCount: recognized.length,
    invalidJsonLineCount,
    observedSessionIdCount: uniqueIds.length,
    eventShapes: shapes.slice(0, 24),
    formatFingerprint: crypto.createHash("sha256").update(JSON.stringify({ provider, shapes })).digest("hex").slice(0, 24),
    driftReasons: Array.from(new Set(driftReasons)),
  };
}

export function normalizeAgentCommandOutput(agentType: string, rawOutput: string, options: any = {}) {
  const runtime = normalizeAgentRuntimeId(agentType);
  const raw = String(rawOutput || "").trim();
  const usage = extractAgentCommandUsage(raw, runtime);
  const providerOutputContractEvidence = extractProviderOutputContractEvidence(runtime, raw, options);
  if (!raw || !["codex", "cursor"].includes(runtime)) return { output: raw, sessionId: "", rawSessionId: "", usage, providerOutputContractEvidence };

  if (runtime === "cursor") {
    let sessionId = "";
    let terminalResult = "";
    const assistantDeltas: string[] = [];
    let parsedAny = false;
    for (const line of raw.split(/\r?\n/)) {
      const text = line.trim();
      if (!text.startsWith("{")) continue;
      try {
        const event = JSON.parse(text);
        parsedAny = true;
        sessionId = String(event.session_id || event.sessionId || sessionId || "");
        if (event.type === "result" && typeof event.result === "string") terminalResult = event.result;
        if (event.type === "assistant" && Array.isArray(event.message?.content)) {
          for (const item of event.message.content) {
            if (item?.type === "text" && item.text) assistantDeltas.push(String(item.text));
          }
        }
      } catch {}
    }
    return {
      output: terminalResult.trim() || (parsedAny && assistantDeltas.length ? assistantDeltas.join("").trim() : raw),
      sessionId: providerOutputContractEvidence.trustedSessionId,
      rawSessionId: sessionId || providerOutputContractEvidence.sessionId,
      usage,
      providerOutputContractEvidence,
    };
  }

  const messages: string[] = [];
  let sessionId = "";
  let parsedAny = false;
  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim();
    if (!text.startsWith("{")) continue;
    try {
      const event = JSON.parse(text);
      parsedAny = true;
      sessionId = String(event.thread_id || event.threadId || event.session_id || event.sessionId || sessionId || "");
      const item = event.item || event.message || null;
      if (item?.type === "agent_message" && item.text) messages.push(String(item.text));
      else if (event.type === "agent_message" && event.text) messages.push(String(event.text));
      else if (event.type === "message" && event.role === "assistant" && event.content) {
        messages.push(typeof event.content === "string" ? event.content : JSON.stringify(event.content));
      }
    } catch {}
  }
  return {
    output: parsedAny && messages.length ? messages.join("\n\n").trim() : raw,
    sessionId: providerOutputContractEvidence.trustedSessionId,
    rawSessionId: sessionId || providerOutputContractEvidence.sessionId,
    usage,
    providerOutputContractEvidence,
  };
}

function stableCapabilityJson(value: any): string {
  if (Array.isArray(value)) return `[${value.map(stableCapabilityJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableCapabilityJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function nativeCapabilityReceiptChecksum(value: any) {
  const { checksum: _checksum, ...core } = value || {};
  return crypto.createHash("sha256").update(stableCapabilityJson(core)).digest("hex");
}

export function extractNativeModelCapabilityReceipt(agentType: string, rawOutput: string, binding: any = {}) {
  const provider = normalizeAgentRuntimeId(agentType);
  if (!["codex", "cursor"].includes(provider)) return null;
  const raw = String(rawOutput || "");
  const lines = raw.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const text = lines[index].trim();
    if (!text.startsWith("{")) continue;
    try {
      const event = JSON.parse(text);
      const capability = event.model_capabilities
        || event.modelCapabilities
        || event.response?.model_capabilities
        || event.response?.modelCapabilities
        || event.metadata?.model_capabilities
        || event.metadata?.modelCapabilities
        || event.capabilities?.model
        || event.capabilities?.model_context
        || null;
      const contextWindow = Math.floor(Number(
        capability?.context_window
        || capability?.contextWindow
        || capability?.max_input_tokens
        || capability?.maxInputTokens
        || event.context_window
        || event.contextWindow
        || event.max_input_tokens
        || event.maxInputTokens
        || 0
      ));
      if (!Number.isFinite(contextWindow) || contextWindow < 32_000 || contextWindow > 4_000_000) continue;
      const maxOutputTokens = Math.floor(Number(
        capability?.max_output_tokens
        || capability?.maxOutputTokens
        || event.max_output_tokens
        || event.maxOutputTokens
        || 20_000
      ));
      if (!Number.isFinite(maxOutputTokens) || maxOutputTokens < 0 || maxOutputTokens > contextWindow - 16_000) continue;
      const model = String(capability?.model || capability?.model_id || event.model || event.model_id || event.response?.model || "").trim();
      const nativeSessionId = String(binding.nativeSessionId || binding.native_session_id || event.thread_id || event.session_id || "").trim();
      const core: any = {
        schema: "ccm-native-model-capability-receipt-v1",
        provider,
        model,
        contextWindow,
        maxOutputTokens,
        source: "native_executor_receipt",
        verified: true,
        eventType: String(event.type || "native_json_event"),
        eventIndex: index,
        eventChecksum: crypto.createHash("sha256").update(text).digest("hex"),
        runner: String(binding.runner || "direct-cli"),
        runnerRequestId: String(binding.runnerRequestId || binding.runner_request_id || ""),
        runnerPid: Number(binding.runnerPid || binding.runner_pid || 0),
        groupId: String(binding.groupId || binding.group_id || ""),
        taskId: String(binding.taskId || binding.task_id || ""),
        executionId: String(binding.executionId || binding.execution_id || ""),
        taskAgentSessionId: String(binding.taskAgentSessionId || binding.task_agent_session_id || ""),
        nativeSessionId,
        capturedAt: String(binding.capturedAt || binding.captured_at || new Date().toISOString()),
      };
      return { ...core, checksum: nativeCapabilityReceiptChecksum(core) };
    } catch {}
  }
  return null;
}

export function verifyNativeModelCapabilityReceipt(receipt: any, expected: any = {}) {
  const gaps: string[] = [];
  if (receipt?.schema !== "ccm-native-model-capability-receipt-v1") gaps.push("schema");
  if (receipt?.source !== "native_executor_receipt" || receipt?.verified !== true) gaps.push("trust_state");
  if (!receipt?.checksum || receipt.checksum !== nativeCapabilityReceiptChecksum(receipt)) gaps.push("checksum");
  if (!String(receipt?.eventChecksum || "").match(/^[a-f0-9]{64}$/)) gaps.push("event_checksum");
  for (const [receiptKey, expectedKeys] of Object.entries({
    provider: ["provider", "agentType", "agent_type"],
    runnerRequestId: ["runnerRequestId", "runner_request_id"],
    groupId: ["groupId", "group_id"],
    taskId: ["taskId", "task_id"],
    executionId: ["executionId", "execution_id"],
    taskAgentSessionId: ["taskAgentSessionId", "task_agent_session_id"],
    nativeSessionId: ["nativeSessionId", "native_session_id"],
  })) {
    const expectedValue = (expectedKeys as string[]).map(key => expected?.[key]).find(value => String(value || "").trim());
    if (expectedValue && String(receipt?.[receiptKey] || "").trim() !== String(expectedValue).trim()) gaps.push(`${receiptKey}_mismatch`);
  }
  if (String(receipt?.runner || "") === "node" && !String(receipt?.runnerRequestId || "").trim()) gaps.push("runner_request_id");
  if (String(receipt?.groupId || "").trim() && String(receipt?.taskId || "").trim() && !String(receipt?.taskAgentSessionId || "").trim()) gaps.push("task_agent_session_id");
  const contextWindow = Number(receipt?.contextWindow || 0);
  const maxOutputTokens = Number(receipt?.maxOutputTokens || 0);
  if (!Number.isFinite(contextWindow) || contextWindow < 32_000 || contextWindow > 4_000_000) gaps.push("context_window");
  if (!Number.isFinite(maxOutputTokens) || maxOutputTokens < 0 || maxOutputTokens > contextWindow - 16_000) gaps.push("max_output_tokens");
  return { valid: gaps.length === 0, gaps };
}

export function runNativeModelCapabilityReceiptSelfTest() {
  const binding = {
    runner: "node",
    runnerRequestId: "ar-phase217",
    runnerPid: 217,
    groupId: "group-phase217",
    taskId: "task-phase217",
    executionId: "execution-phase217",
    taskAgentSessionId: "tas-phase217",
    nativeSessionId: "thread-phase217",
    capturedAt: "2026-07-12T12:00:00.000Z",
  };
  const raw = [
    JSON.stringify({ type: "thread.started", thread_id: "thread-phase217" }),
    JSON.stringify({ type: "model.metadata", model: "gpt-phase217", model_capabilities: { context_window: 516_000, max_output_tokens: 64_000 } }),
    JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "done" } }),
  ].join("\n");
  const receipt = extractNativeModelCapabilityReceipt("codex", raw, binding);
  const valid = verifyNativeModelCapabilityReceipt(receipt, { ...binding, provider: "codex" });
  const forged = receipt ? { ...receipt, contextWindow: 1_000_000 } : null;
  const forgedValidation = verifyNativeModelCapabilityReceipt(forged, { ...binding, provider: "codex" });
  const wrongSession = verifyNativeModelCapabilityReceipt(receipt, { ...binding, provider: "codex", taskAgentSessionId: "tas-other" });
  const agentTextOnly = extractNativeModelCapabilityReceipt("codex", JSON.stringify({
    type: "item.completed",
    item: { type: "agent_message", text: JSON.stringify({ model_capabilities: { context_window: 1_000_000 } }) },
  }), binding);
  const checks = {
    nativeTopLevelMetadataExtracted: receipt?.contextWindow === 516_000 && receipt?.model === "gpt-phase217",
    completeBindingAccepted: valid.valid === true,
    checksumForgeryRejected: forgedValidation.valid === false && forgedValidation.gaps.includes("checksum"),
    sessionBindingMismatchRejected: wrongSession.valid === false && wrongSession.gaps.includes("taskAgentSessionId_mismatch"),
    agentTextCannotClaimCapacity: agentTextOnly === null,
  };
  return { pass: Object.values(checks).every(Boolean), checks, receipt, forgedGaps: forgedValidation.gaps, wrongSessionGaps: wrongSession.gaps };
}

export function detectAgentCommandFailure(agentType: string, rawOutput: string, exitCode?: number | null, rawError = "") {
  const runtime = normalizeAgentRuntimeId(agentType);
  const raw = String(rawOutput || "");
  const stderr = String(rawError || "");
  const codeFailed = typeof exitCode === "number" && exitCode !== 0;
  let message = "";

  if (["codex", "cursor"].includes(runtime)) {
    for (const line of raw.split(/\r?\n/)) {
      const text = line.trim();
      if (!text.startsWith("{")) continue;
      try {
        const event = JSON.parse(text);
        if (runtime === "codex") {
          if (event.type === "turn.failed" || event.type === "error") {
            message = String(event.error?.message || event.message || message || "Codex 执行失败");
          }
        } else if (runtime === "cursor") {
          const subtype = String(event.subtype || event.status || "").toLowerCase();
          if (event.type === "error" || event.type === "failed" || subtype === "error" || subtype === "failed") {
            message = String(event.error?.message || event.message || event.result || message || "Cursor Agent 执行失败");
          }
        }
      } catch {}
    }
  }

  if (!message && codeFailed) {
    message = (stderr.trim() || raw.trim() || `Agent 进程退出，exitCode=${exitCode}`).slice(0, 4000);
  }

  return { failed: !!message || codeFailed, message };
}

export function runAgentRuntimeSessionSelfTest() {
  const sessionId = "11111111-1111-4111-8111-111111111111";
  const claudeInitial = buildAgentCommand("claudecode", "prompt.txt", { persistSession: true, sessionId });
  const claudeResume = buildAgentCommand("claudecode", "prompt.txt", { persistSession: true, resumeSession: true, sessionId });
  const codexInitial = buildAgentCommand("codex", "prompt.txt", { persistSession: true });
  const codexResume = buildAgentCommand("codex", "prompt.txt", { persistSession: true, resumeSession: true, sessionId });
  const cursorInitial = buildAgentCommand("cursor", "prompt.txt", { persistSession: true });
  const cursorResume = buildAgentCommand("cursor", "prompt.txt", { persistSession: true, resumeSession: true, sessionId });
  const decodePromptRunnerArgs = (command: string) => {
    const encoded = command.trim().split(/\s+/).pop() || "";
    try { return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8")); } catch { return []; }
  };
  const cursorInitialArgs = decodePromptRunnerArgs(cursorInitial);
  const cursorResumeArgs = decodePromptRunnerArgs(cursorResume);
  const codexInitialArgs = decodePromptRunnerArgs(codexInitial);
  const codexResumeArgs = decodePromptRunnerArgs(codexResume);
  const parsed = normalizeAgentCommandOutput("codex", [
    JSON.stringify({ type: "thread.started", thread_id: sessionId }),
    JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "任务完成" } }),
  ].join("\n"));
  const cursorParsed = normalizeAgentCommandOutput("cursor", JSON.stringify({
    type: "result",
    subtype: "success",
    result: "继续完成",
    session_id: sessionId,
  }));
  const codexFailed = detectAgentCommandFailure("codex", [
    JSON.stringify({ type: "thread.started", thread_id: sessionId }),
    JSON.stringify({ type: "turn.failed", error: { message: "model unavailable" } }),
  ].join("\n"), 0);
  const cursorFailed = detectAgentCommandFailure("cursor", JSON.stringify({
    type: "result",
    subtype: "failed",
    result: "permission denied",
    session_id: sessionId,
  }), 0);
  const checks = {
    claudeAutomatedModeAllowsProjectVerification: claudeInitial.includes("--permission-mode auto"),
    claudeCreatesNamedSession: claudeInitial.includes("--session-id") && claudeInitial.includes(sessionId),
    claudeResumesSameSession: claudeResume.includes("--resume") && claudeResume.includes(sessionId),
    codexInitialIsPersistent: codexInitial.includes("codex-prompt-runner.js") && codexInitialArgs.includes("--json") && !codexInitialArgs.includes("--ephemeral"),
    codexResumesSameSession: codexResume.includes("codex-prompt-runner.js") && codexResumeArgs.includes("resume") && codexResumeArgs.includes(sessionId),
    codexCapturesNativeSession: parsed.sessionId === sessionId && parsed.output === "任务完成",
    cursorInitialCapturesSession: cursorInitial.includes("cli-prompt-runner.js") && cursorInitialArgs.includes("--output-format") && cursorInitialArgs.includes("json") && !cursorInitialArgs.includes("--resume"),
    cursorTrustsHeadlessWorkspace: cursorInitialArgs.includes("--trust"),
    cursorResumesSameSession: cursorResumeArgs.includes("--resume") && cursorResumeArgs.includes(sessionId),
    cursorParsesNativeSession: cursorParsed.sessionId === sessionId && cursorParsed.output === "继续完成",
    codexJsonFailureDetected: codexFailed.failed && codexFailed.message.includes("model unavailable"),
    cursorJsonFailureDetected: cursorFailed.failed && cursorFailed.message.includes("permission denied"),
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
