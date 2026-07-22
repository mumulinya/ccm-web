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
exports.AGENT_RUNTIMES = void 0;
exports.captureAgentRuntimeVersionSnapshot = captureAgentRuntimeVersionSnapshot;
exports.normalizeAgentRuntimeId = normalizeAgentRuntimeId;
exports.getAgentRuntime = getAgentRuntime;
exports.buildAgentCommand = buildAgentCommand;
exports.getAgentCommandLabel = getAgentCommandLabel;
exports.getPublicAgentRuntimes = getPublicAgentRuntimes;
exports.isAgentRuntimeAvailable = isAgentRuntimeAvailable;
exports.getAgentRuntimeFallbackChain = getAgentRuntimeFallbackChain;
exports.resolveAvailableAgentRuntime = resolveAvailableAgentRuntime;
exports.extractAgentCommandUsage = extractAgentCommandUsage;
exports.extractProviderOutputContractEvidence = extractProviderOutputContractEvidence;
exports.normalizeAgentCommandOutput = normalizeAgentCommandOutput;
exports.extractNativeModelCapabilityReceipt = extractNativeModelCapabilityReceipt;
exports.verifyNativeModelCapabilityReceipt = verifyNativeModelCapabilityReceipt;
exports.runNativeModelCapabilityReceiptSelfTest = runNativeModelCapabilityReceiptSelfTest;
exports.detectAgentCommandFailure = detectAgentCommandFailure;
exports.runAgentRuntimeSessionSelfTest = runAgentRuntimeSessionSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const native_continuation_1 = require("./native-continuation");
const agent_provider_settings_1 = require("../modules/system/agent-provider-settings");
const catalog_1 = require("./catalog");
const AGENT_RUNTIME_VERSION_CACHE = new Map();
function stableRuntimeChecksum(value) {
    const canonical = (input) => Array.isArray(input)
        ? input.map(canonical)
        : input && typeof input === "object"
            ? Object.keys(input).sort().reduce((result, key) => {
                if (input[key] !== undefined)
                    result[key] = canonical(input[key]);
                return result;
            }, {})
            : input;
    return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}
function getRuntimeVersionCommand(agentType) {
    const provider = normalizeAgentRuntimeId(agentType);
    if (provider === "claudecode")
        return "claude";
    if (provider === "codex")
        return "codex";
    if (provider === "cursor") {
        const explicit = String(process.env.CCM_CURSOR_AGENT_COMMAND || "").trim();
        if (explicit)
            return explicit;
        return (0, agent_provider_settings_1.resolveCursorAgentCommand)();
    }
    if (provider === "gemini")
        return "gemini";
    if (provider === "opencode")
        return "opencode";
    if (provider === "qoder")
        return "qodercli";
    return provider;
}
function resolveRuntimeExecutablePaths(command) {
    const explicitPath = String(command || "").trim().replace(/^"|"$/g, "");
    if (/[\\/]/.test(explicitPath)) {
        try {
            if (fs.statSync(explicitPath).isFile())
                return [path.resolve(explicitPath)];
        }
        catch { }
    }
    try {
        const result = process.platform === "win32"
            ? (0, child_process_1.spawnSync)("where.exe", [command], { windowsHide: true, encoding: "utf-8" })
            : (0, child_process_1.spawnSync)("sh", ["-lc", `command -v ${command}`], { encoding: "utf-8" });
        if (result.status !== 0)
            return [];
        return Array.from(new Set(String(result.stdout || "").split(/\r?\n/).map(item => item.trim()).filter(Boolean)));
    }
    catch {
        return [];
    }
}
function executableFileIdentity(paths) {
    return paths.map(file => {
        try {
            const stat = fs.statSync(file);
            return { file: path.resolve(file), size: stat.size, mtimeMs: Math.trunc(stat.mtimeMs) };
        }
        catch {
            return { file: path.resolve(file), size: -1, mtimeMs: -1 };
        }
    });
}
function captureAgentRuntimeVersionSnapshot(agentType) {
    const provider = normalizeAgentRuntimeId(agentType);
    const command = getRuntimeVersionCommand(provider);
    const executablePaths = resolveRuntimeExecutablePaths(command);
    const executableIdentity = executableFileIdentity(executablePaths);
    const executableIdentityChecksum = stableRuntimeChecksum({ provider, command, executableIdentity });
    const cacheKey = `${provider}:${executableIdentityChecksum}`;
    let base = AGENT_RUNTIME_VERSION_CACHE.get(cacheKey);
    if (!base) {
        let status = executablePaths.length ? "version_probe_failed" : "command_missing";
        let versionText = "";
        if (executablePaths.length) {
            try {
                const result = (0, child_process_1.spawnSync)(command, ["--version"], {
                    windowsHide: true,
                    encoding: "utf-8",
                    shell: process.platform === "win32",
                    timeout: 10_000,
                });
                versionText = String(result.stdout || result.stderr || "").trim().split(/\r?\n/).slice(0, 4).join(" ").slice(0, 240);
                if (result.status === 0 && versionText)
                    status = "ok";
            }
            catch { }
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
    const snapshot = {
        ...base,
        observedAt,
        snapshotChecksum: "",
    };
    snapshot.snapshotChecksum = stableRuntimeChecksum({ ...snapshot, snapshotChecksum: undefined });
    return snapshot;
}
function quoteCmdArg(value) {
    return `"${String(value || "").replace(/"/g, "\\\"")}"`;
}
function encodeCliArgs(args) {
    return Buffer.from(JSON.stringify(args), "utf-8").toString("base64");
}
function formatAllowedToolsArg(options = {}) {
    const tools = Array.isArray(options.cliAllowedTools)
        ? Array.from(new Set(options.cliAllowedTools.map(item => String(item || "").trim()).filter(Boolean)))
        : [];
    if (!tools.length)
        return "";
    return ` --allowed-tools ${quoteCmdArg(tools.join(","))}`;
}
function pipeFileToCommand(msgFile, command, options = {}) {
    return `type "${msgFile}" | ${command}${formatAllowedToolsArg(options)}`;
}
function formatStrictMcpConfigArg(options = {}) {
    const configPath = String(options.mcpConfigPath || "").trim();
    return configPath ? ` --mcp-config ${quoteCmdArg(configPath)} --strict-mcp-config` : "";
}
function formatAppendSystemPromptFileArg(options = {}) {
    const file = String(options.appendSystemPromptFile || "").trim();
    return file ? ` --append-system-prompt-file ${quoteCmdArg(file)}` : "";
}
function readRuntimeLaunchMetadata(options = {}) {
    const configPath = String(options.mcpConfigPath || "").trim();
    if (!configPath)
        return {};
    const snapshotPath = path.join(path.dirname(configPath), "runtime-tool-snapshot.json");
    const fallbackSnapshotPath = path.join(path.dirname(path.dirname(configPath)), "runtime-tool-snapshot.json");
    for (const candidate of [snapshotPath, fallbackSnapshotPath]) {
        try {
            if (!fs.existsSync(candidate))
                continue;
            const parsed = JSON.parse(fs.readFileSync(candidate, "utf-8"));
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
                return parsed;
        }
        catch { }
    }
    return {};
}
function formatPluginDirArg(metadata) {
    const pluginDir = String(metadata.pluginDirPath || "").trim();
    return pluginDir ? ` --plugin-dir ${quoteCmdArg(pluginDir)}` : "";
}
function getClaudePermissionMode() {
    const requested = String(process.env.CCM_CLAUDE_PERMISSION_MODE || "auto").trim();
    return ["acceptEdits", "auto", "bypassPermissions", "dontAsk", "manual", "plan"].includes(requested)
        ? requested
        : "auto";
}
function formatWindowsEnvPrefix(values) {
    const assignments = Object.entries(values)
        .filter(([, value]) => String(value || "").trim())
        .map(([key, value]) => `set "${key}=${String(value).replace(/"/g, "")}"`);
    return assignments.length ? `${assignments.join(" && ")} && ` : "";
}
function formatRuntimeEnvPrefix(values) {
    if (process.platform === "win32")
        return formatWindowsEnvPrefix(values);
    const assignments = Object.entries(values)
        .filter(([, value]) => String(value || "").trim())
        .map(([key, value]) => `${key}='${String(value).replace(/'/g, `'\\''`)}'`);
    return assignments.length ? `${assignments.join(" ")} ` : "";
}
function buildIsolatedHomeEnv(homePath, runtime) {
    const normalized = path.resolve(homePath);
    const root = path.parse(normalized).root.replace(/[\\/]$/, "");
    const homePathPart = root && normalized.toLowerCase().startsWith(root.toLowerCase())
        ? normalized.slice(root.length)
        : normalized;
    const env = {
        HOME: normalized,
        USERPROFILE: normalized,
        HOMEDRIVE: root,
        HOMEPATH: homePathPart || "\\",
    };
    if (runtime === "cursor") {
        env.CURSOR_CONFIG_DIR = path.join(normalized, ".cursor");
        env.CURSOR_DATA_DIR = path.join(normalized, ".cursor-data");
    }
    else {
        env.CODEX_HOME = normalized;
    }
    return env;
}
function buildCodexExecCommand(msgFile, options = {}) {
    const configPath = String(options.mcpConfigPath || "").trim();
    const metadata = readRuntimeLaunchMetadata(options);
    const runtimeHome = String(metadata.isolatedHomePath || metadata.runtimeHomePath || (configPath ? path.dirname(configPath) : "")).trim();
    const homePrefix = runtimeHome ? formatWindowsEnvPrefix(buildIsolatedHomeEnv(runtimeHome, "codex")) : "";
    const sessionId = String(options.sessionId || "").trim();
    const flags = formatCodexExecSafetyFlags();
    const sandboxMode = getCodexSandboxMode();
    const developerInstructionsFile = String(options.developerInstructionsFile || "").trim();
    const helper = path.join(__dirname, "codex-prompt-runner.js");
    const selectedModel = (0, agent_provider_settings_1.getConfiguredDevelopmentAgentModel)("codex");
    const modelArgs = selectedModel ? ["--model", selectedModel] : [];
    if (options.persistSession && options.resumeSession && sessionId) {
        const args = ["exec", "resume", ...modelArgs, "-c", `sandbox_mode=${JSON.stringify(sandboxMode)}`, "--skip-git-repo-check", "--json", sessionId, "-"];
        return `${homePrefix}node ${quoteCmdArg(helper)} ${quoteCmdArg(msgFile)} ${quoteCmdArg(developerInstructionsFile)} ${quoteCmdArg(encodeCliArgs(args))}`;
    }
    const persistence = options.persistSession ? " --json" : " --ephemeral";
    const args = ["exec", ...modelArgs, ...flags.split(" "), persistence.trim(), "--skip-git-repo-check", "-"].filter(Boolean);
    return `${homePrefix}node ${quoteCmdArg(helper)} ${quoteCmdArg(msgFile)} ${quoteCmdArg(developerInstructionsFile)} ${quoteCmdArg(encodeCliArgs(args))}`;
}
function getCodexSandboxMode() {
    const requested = String(process.env.CCM_CODEX_SANDBOX || process.env.CCM_CODEX_SANDBOX_MODE || "").trim();
    if (["read-only", "workspace-write", "danger-full-access"].includes(requested))
        return requested;
    return "workspace-write";
}
function formatCodexExecSafetyFlags() {
    const sandbox = getCodexSandboxMode();
    return sandbox === "workspace-write"
        ? "--full-auto --sandbox workspace-write"
        : `--sandbox ${sandbox}`;
}
function buildCursorAgentCommand(msgFile, options = {}) {
    const metadata = readRuntimeLaunchMetadata(options);
    const sessionId = String(options.sessionId || "").trim();
    const explicit = String(process.env.CCM_CURSOR_AGENT_COMMAND || "").trim();
    const command = explicit || (0, agent_provider_settings_1.resolveCursorAgentCommand)();
    const isolatedHome = String(metadata.isolatedHomePath || "").trim();
    const homePrefix = isolatedHome ? formatWindowsEnvPrefix(buildIsolatedHomeEnv(isolatedHome, "cursor")) : "";
    const args = ["-p", "--force", "--trust"];
    const selectedModel = (0, agent_provider_settings_1.getConfiguredDevelopmentAgentModel)("cursor");
    if (selectedModel)
        args.push("--model", selectedModel);
    if (metadata.pluginDirPath) {
        args.push("--approve-mcps", "--plugin-dir", String(metadata.pluginDirPath));
    }
    if (options.persistSession)
        args.push("--output-format", "json");
    if (options.persistSession && options.resumeSession && sessionId)
        args.push("--resume", sessionId);
    const helper = path.join(__dirname, "cli-prompt-runner.js");
    return `${homePrefix}node ${quoteCmdArg(helper)} ${quoteCmdArg(msgFile)} ${quoteCmdArg(command)} ${encodeCliArgs(args)}`;
}
function buildGeminiAgentCommand(msgFile, options = {}) {
    const args = ["--approval-mode", "yolo", "--skip-trust", "--output-format", "json"];
    const selectedModel = (0, agent_provider_settings_1.getConfiguredDevelopmentAgentModel)("gemini");
    if (selectedModel)
        args.push("--model", selectedModel);
    const tools = Array.isArray(options.cliAllowedTools)
        ? Array.from(new Set(options.cliAllowedTools.map(item => String(item || "").trim()).filter(Boolean)))
        : [];
    if (tools.length)
        args.push("--allowed-tools", tools.join(","));
    args.push("--prompt");
    const helper = path.join(__dirname, "cli-prompt-runner.js");
    return `node ${quoteCmdArg(helper)} ${quoteCmdArg(msgFile)} ${quoteCmdArg("gemini")} ${encodeCliArgs(args)}`;
}
function buildOpenCodeAgentCommand(msgFile, options = {}) {
    const metadata = readRuntimeLaunchMetadata(options);
    const configPath = String(options.mcpConfigPath || "").trim();
    const runtimeRoot = String(metadata.runtimeHomePath || (configPath ? path.dirname(configPath) : "")).trim();
    const envPrefix = formatRuntimeEnvPrefix({
        OPENCODE_CONFIG: configPath,
        OPENCODE_CONFIG_DIR: runtimeRoot,
    });
    const args = ["run", "--format", "json", "--auto"];
    const selectedModel = (0, agent_provider_settings_1.getConfiguredDevelopmentAgentModel)("opencode");
    if (selectedModel)
        args.push("--model", selectedModel);
    const helper = path.join(__dirname, "cli-prompt-runner.js");
    return `${envPrefix}node ${quoteCmdArg(helper)} ${quoteCmdArg(msgFile)} ${quoteCmdArg("opencode")} ${encodeCliArgs(args)}`;
}
exports.AGENT_RUNTIMES = [
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
            const selectedModel = (0, agent_provider_settings_1.getConfiguredDevelopmentAgentModel)("claudecode");
            const modelArg = selectedModel ? ` --model ${quoteCmdArg(selectedModel)}` : "";
            return `${pipeFileToCommand(msgFile, `claude --permission-mode ${getClaudePermissionMode()}${modelArg}`, options)}${formatStrictMcpConfigArg(options)}${formatPluginDirArg(metadata)}${formatAppendSystemPromptFileArg(options)}${sessionArg} -p`;
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
        aliases: ["gemini", "geminicli", "gemini-cli"],
        label: "Gemini CLI",
        commandLabel: "gemini --output-format json --prompt",
        capabilities: {
            print: true,
            streaming: false,
            externalRunner: true,
            worktreeIsolation: true,
            sessionResume: false,
            scratchpadContinuation: true,
        },
        buildCommand: (msgFile, options) => buildGeminiAgentCommand(msgFile, options),
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
        id: "opencode",
        aliases: ["opencode", "open-code"],
        label: "OpenCode",
        commandLabel: "opencode run --format json --auto",
        capabilities: {
            print: true,
            streaming: false,
            externalRunner: true,
            worktreeIsolation: true,
            sessionResume: false,
            scratchpadContinuation: true,
        },
        buildCommand: (msgFile, options) => buildOpenCodeAgentCommand(msgFile, options),
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
function normalizeAgentRuntimeId(agentType = "") {
    return (0, catalog_1.findDevelopmentAgent)(agentType)?.id || "claudecode";
}
function getAgentRuntime(agentType = "") {
    const id = normalizeAgentRuntimeId(agentType);
    return exports.AGENT_RUNTIMES.find(item => item.id === id) || exports.AGENT_RUNTIMES[0];
}
function buildAgentCommand(agentType, msgFile, options = {}) {
    return getAgentRuntime(agentType).buildCommand(msgFile, options);
}
function getAgentCommandLabel(agentType) {
    return getAgentRuntime(agentType).commandLabel;
}
function getPublicAgentRuntimes() {
    return catalog_1.DEVELOPMENT_AGENT_CATALOG.map(definition => {
        const runtime = exports.AGENT_RUNTIMES.find(item => item.id === definition.id);
        if (!runtime)
            return null;
        return {
            id: definition.id,
            aliases: [...definition.aliases],
            label: definition.label,
            commandLabel: runtime.commandLabel,
            capabilities: runtime.capabilities,
            nativeContinuation: (0, native_continuation_1.getNativeContinuationCapabilityProfile)(runtime.id),
        };
    }).filter(Boolean);
}
function commandExists(command) {
    try {
        const result = process.platform === "win32"
            ? (0, child_process_1.spawnSync)("where.exe", [command], { windowsHide: true, stdio: "ignore" })
            : (0, child_process_1.spawnSync)("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" });
        return result.status === 0;
    }
    catch {
        return false;
    }
}
function isAgentRuntimeAvailable(agentType) {
    const runtime = normalizeAgentRuntimeId(agentType);
    if (["claudecode", "cursor", "codex", "gemini", "opencode"].includes(runtime))
        return (0, agent_provider_settings_1.isDevelopmentAgentReady)(runtime);
    if (runtime === "qoder")
        return commandExists("qodercli");
    return false;
}
function getAgentRuntimeFallbackChain(preferred = "claudecode") {
    const preferredRuntime = normalizeAgentRuntimeId(preferred || "claudecode");
    const priority = ["claudecode", "codex", "cursor", "gemini", "opencode"];
    const ordered = [preferredRuntime, ...priority.filter(item => item !== preferredRuntime)];
    return ordered.filter((item, index, arr) => arr.indexOf(item) === index);
}
function resolveAvailableAgentRuntime(preferred = "claudecode") {
    const chain = getAgentRuntimeFallbackChain(preferred);
    const selected = chain.find(isAgentRuntimeAvailable) || chain[0] || "claudecode";
    return {
        selected,
        preferred: normalizeAgentRuntimeId(preferred || "claudecode"),
        chain,
        switched: selected !== normalizeAgentRuntimeId(preferred || "claudecode"),
    };
}
function extractAgentCommandUsage(rawOutput, agentType = "") {
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
    const takeMax = (current, ...values) => values.reduce((max, value) => {
        const number = Number(value || 0);
        return Number.isFinite(number) && number > max ? number : max;
    }, current);
    for (const line of String(rawOutput || "").split(/\r?\n/)) {
        const text = line.trim();
        if (!text.startsWith("{"))
            continue;
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
                const includedCacheReadTokens = takeMax(0, candidate.cached_input_tokens, candidate.cachedInputTokens, candidate.prompt_tokens_details?.cached_tokens, candidate.promptTokensDetails?.cachedTokens, candidate.input_tokens_details?.cached_tokens, candidate.inputTokensDetails?.cachedTokens);
                const cacheReadTokens = Math.max(anthropicCacheReadTokens, includedCacheReadTokens);
                const cacheReadIncludedInInput = includedCacheReadTokens > 0 && anthropicCacheReadTokens === 0;
                const directInputTokens = cacheReadIncludedInInput ? Math.max(0, providerInputTokens - cacheReadTokens) : providerInputTokens;
                const inputTokens = providerInputTokens + cacheCreationTokens + (cacheReadIncludedInInput ? 0 : cacheReadTokens);
                const outputTokens = takeMax(0, candidate.output_tokens, candidate.outputTokens, candidate.completion_tokens, candidate.completionTokens);
                const providerTotalTokens = takeMax(0, candidate.total_tokens, candidate.totalTokens);
                const costUsd = takeMax(0, candidate.total_cost_usd, candidate.totalCostUsd, candidate.cost_usd, candidate.costUsd);
                if (inputTokens > 0 || outputTokens > 0 || providerTotalTokens > 0 || costUsd > 0)
                    usage.reported = true;
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
        }
        catch { }
    }
    return usage;
}
function providerOutputShape(event) {
    if (!event || typeof event !== "object" || Array.isArray(event))
        return "non_object";
    const top = Object.keys(event).sort().join(",");
    const nested = ["item", "message", "response", "metadata"]
        .filter(key => event[key] && typeof event[key] === "object" && !Array.isArray(event[key]))
        .map(key => `${key}(${Object.keys(event[key]).sort().join(",")})`);
    return [String(event.type || "untyped"), top, ...nested].join(":");
}
function extractProviderOutputContractEvidence(agentType, rawOutput, options = {}) {
    const provider = normalizeAgentRuntimeId(agentType);
    const runtimeVersionSnapshot = options.runtimeVersionSnapshot || options.runtime_version_snapshot || null;
    const raw = String(rawOutput || "").trim();
    const parsedEvents = [];
    let invalidJsonLineCount = 0;
    for (const line of raw.split(/\r?\n/)) {
        const text = line.trim();
        if (!text.startsWith("{"))
            continue;
        try {
            parsedEvents.push(JSON.parse(text));
        }
        catch {
            invalidJsonLineCount += 1;
        }
    }
    const observedIds = [];
    const recognized = [];
    const driftReasons = [];
    for (let index = 0; index < parsedEvents.length; index += 1) {
        const event = parsedEvents[index];
        const eventType = String(event?.type || "");
        if (provider === "codex") {
            const id = String(event?.thread_id || event?.threadId || event?.session_id || event?.sessionId || "").trim();
            if (id)
                observedIds.push(id);
            if (eventType === "thread.started" && typeof event?.thread_id === "string" && event.thread_id.trim()) {
                recognized.push({ index, eventType, sessionIdPath: "thread_id", sessionId: event.thread_id.trim() });
            }
            else if (id) {
                driftReasons.push(`codex_session_id_contract_changed:${eventType || "untyped"}`);
            }
        }
        else if (provider === "cursor") {
            const id = String(event?.session_id || event?.sessionId || event?.thread_id || event?.threadId || "").trim();
            if (id)
                observedIds.push(id);
            const knownEventType = new Set(["system", "assistant", "user", "tool", "result", "error"]).has(eventType);
            if (knownEventType && typeof event?.session_id === "string" && event.session_id.trim()) {
                recognized.push({ index, eventType, sessionIdPath: "session_id", sessionId: event.session_id.trim() });
            }
            else if (id) {
                driftReasons.push(`cursor_session_id_contract_changed:${eventType || "untyped"}`);
            }
        }
    }
    const uniqueIds = Array.from(new Set(observedIds));
    if (uniqueIds.length > 1)
        driftReasons.push("provider_output_session_identity_conflict");
    if (invalidJsonLineCount > 0)
        driftReasons.push("provider_output_invalid_json_line");
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
function normalizeAgentCommandOutput(agentType, rawOutput, options = {}) {
    const runtime = normalizeAgentRuntimeId(agentType);
    const raw = String(rawOutput || "").trim();
    const usage = extractAgentCommandUsage(raw, runtime);
    const providerOutputContractEvidence = extractProviderOutputContractEvidence(runtime, raw, options);
    if (!raw)
        return { output: raw, sessionId: "", rawSessionId: "", usage, providerOutputContractEvidence };
    if (["gemini", "opencode"].includes(runtime)) {
        const messages = [];
        const append = (value) => {
            const text = String(value || "").trim();
            if (text && messages[messages.length - 1] !== text)
                messages.push(text);
        };
        const inspect = (event) => {
            if (!event || typeof event !== "object")
                return;
            if (typeof event.response === "string")
                append(event.response);
            if (typeof event.result === "string")
                append(event.result);
            if (event.type === "text")
                append(event.text || event.part?.text);
            if (["assistant", "assistant_message", "message"].includes(String(event.type || ""))
                && ["", "assistant"].includes(String(event.role || event.message?.role || ""))) {
                append(event.text || event.content || event.message?.content);
            }
            if (event.part?.type === "text")
                append(event.part.text);
        };
        for (const line of raw.split(/\r?\n/)) {
            const text = line.trim();
            if (!text.startsWith("{"))
                continue;
            try {
                inspect(JSON.parse(text));
            }
            catch { }
        }
        if (!messages.length && raw.startsWith("{") && raw.endsWith("}")) {
            try {
                inspect(JSON.parse(raw));
            }
            catch { }
        }
        return {
            output: messages.length ? messages.join("\n\n") : raw,
            sessionId: "",
            rawSessionId: "",
            usage,
            providerOutputContractEvidence,
        };
    }
    if (!["codex", "cursor"].includes(runtime))
        return { output: raw, sessionId: "", rawSessionId: "", usage, providerOutputContractEvidence };
    if (runtime === "cursor") {
        let sessionId = "";
        let terminalResult = "";
        const assistantDeltas = [];
        let parsedAny = false;
        for (const line of raw.split(/\r?\n/)) {
            const text = line.trim();
            if (!text.startsWith("{"))
                continue;
            try {
                const event = JSON.parse(text);
                parsedAny = true;
                sessionId = String(event.session_id || event.sessionId || sessionId || "");
                if (event.type === "result" && typeof event.result === "string")
                    terminalResult = event.result;
                if (event.type === "assistant" && Array.isArray(event.message?.content)) {
                    for (const item of event.message.content) {
                        if (item?.type === "text" && item.text)
                            assistantDeltas.push(String(item.text));
                    }
                }
            }
            catch { }
        }
        return {
            output: terminalResult.trim() || (parsedAny && assistantDeltas.length ? assistantDeltas.join("").trim() : raw),
            sessionId: providerOutputContractEvidence.trustedSessionId,
            rawSessionId: sessionId || providerOutputContractEvidence.sessionId,
            usage,
            providerOutputContractEvidence,
        };
    }
    const messages = [];
    let sessionId = "";
    let parsedAny = false;
    for (const line of raw.split(/\r?\n/)) {
        const text = line.trim();
        if (!text.startsWith("{"))
            continue;
        try {
            const event = JSON.parse(text);
            parsedAny = true;
            sessionId = String(event.thread_id || event.threadId || event.session_id || event.sessionId || sessionId || "");
            const item = event.item || event.message || null;
            if (item?.type === "agent_message" && item.text)
                messages.push(String(item.text));
            else if (event.type === "agent_message" && event.text)
                messages.push(String(event.text));
            else if (event.type === "message" && event.role === "assistant" && event.content) {
                messages.push(typeof event.content === "string" ? event.content : JSON.stringify(event.content));
            }
        }
        catch { }
    }
    return {
        output: parsedAny && messages.length ? messages.join("\n\n").trim() : raw,
        sessionId: providerOutputContractEvidence.trustedSessionId,
        rawSessionId: sessionId || providerOutputContractEvidence.sessionId,
        usage,
        providerOutputContractEvidence,
    };
}
function stableCapabilityJson(value) {
    if (Array.isArray(value))
        return `[${value.map(stableCapabilityJson).join(",")}]`;
    if (value && typeof value === "object") {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableCapabilityJson(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value) ?? "null";
}
function nativeCapabilityReceiptChecksum(value) {
    const { checksum: _checksum, ...core } = value || {};
    return crypto.createHash("sha256").update(stableCapabilityJson(core)).digest("hex");
}
function extractNativeModelCapabilityReceipt(agentType, rawOutput, binding = {}) {
    const provider = normalizeAgentRuntimeId(agentType);
    if (!["codex", "cursor"].includes(provider))
        return null;
    const raw = String(rawOutput || "");
    const lines = raw.split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
        const text = lines[index].trim();
        if (!text.startsWith("{"))
            continue;
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
            const contextWindow = Math.floor(Number(capability?.context_window
                || capability?.contextWindow
                || capability?.max_input_tokens
                || capability?.maxInputTokens
                || event.context_window
                || event.contextWindow
                || event.max_input_tokens
                || event.maxInputTokens
                || 0));
            if (!Number.isFinite(contextWindow) || contextWindow < 32_000 || contextWindow > 4_000_000)
                continue;
            const maxOutputTokens = Math.floor(Number(capability?.max_output_tokens
                || capability?.maxOutputTokens
                || event.max_output_tokens
                || event.maxOutputTokens
                || 20_000));
            if (!Number.isFinite(maxOutputTokens) || maxOutputTokens < 0 || maxOutputTokens > contextWindow - 16_000)
                continue;
            const model = String(capability?.model || capability?.model_id || event.model || event.model_id || event.response?.model || "").trim();
            const nativeSessionId = String(binding.nativeSessionId || binding.native_session_id || event.thread_id || event.session_id || "").trim();
            const core = {
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
        }
        catch { }
    }
    return null;
}
function verifyNativeModelCapabilityReceipt(receipt, expected = {}) {
    const gaps = [];
    if (receipt?.schema !== "ccm-native-model-capability-receipt-v1")
        gaps.push("schema");
    if (receipt?.source !== "native_executor_receipt" || receipt?.verified !== true)
        gaps.push("trust_state");
    if (!receipt?.checksum || receipt.checksum !== nativeCapabilityReceiptChecksum(receipt))
        gaps.push("checksum");
    if (!String(receipt?.eventChecksum || "").match(/^[a-f0-9]{64}$/))
        gaps.push("event_checksum");
    for (const [receiptKey, expectedKeys] of Object.entries({
        provider: ["provider", "agentType", "agent_type"],
        runnerRequestId: ["runnerRequestId", "runner_request_id"],
        groupId: ["groupId", "group_id"],
        taskId: ["taskId", "task_id"],
        executionId: ["executionId", "execution_id"],
        taskAgentSessionId: ["taskAgentSessionId", "task_agent_session_id"],
        nativeSessionId: ["nativeSessionId", "native_session_id"],
    })) {
        const expectedValue = expectedKeys.map(key => expected?.[key]).find(value => String(value || "").trim());
        if (expectedValue && String(receipt?.[receiptKey] || "").trim() !== String(expectedValue).trim())
            gaps.push(`${receiptKey}_mismatch`);
    }
    if (String(receipt?.runner || "") === "node" && !String(receipt?.runnerRequestId || "").trim())
        gaps.push("runner_request_id");
    if (String(receipt?.groupId || "").trim() && String(receipt?.taskId || "").trim() && !String(receipt?.taskAgentSessionId || "").trim())
        gaps.push("task_agent_session_id");
    const contextWindow = Number(receipt?.contextWindow || 0);
    const maxOutputTokens = Number(receipt?.maxOutputTokens || 0);
    if (!Number.isFinite(contextWindow) || contextWindow < 32_000 || contextWindow > 4_000_000)
        gaps.push("context_window");
    if (!Number.isFinite(maxOutputTokens) || maxOutputTokens < 0 || maxOutputTokens > contextWindow - 16_000)
        gaps.push("max_output_tokens");
    return { valid: gaps.length === 0, gaps };
}
function runNativeModelCapabilityReceiptSelfTest() {
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
function detectAgentCommandFailure(agentType, rawOutput, exitCode, rawError = "") {
    const runtime = normalizeAgentRuntimeId(agentType);
    const raw = String(rawOutput || "");
    const stderr = String(rawError || "");
    const codeFailed = typeof exitCode === "number" && exitCode !== 0;
    let message = "";
    if (["codex", "cursor"].includes(runtime)) {
        for (const line of raw.split(/\r?\n/)) {
            const text = line.trim();
            if (!text.startsWith("{"))
                continue;
            try {
                const event = JSON.parse(text);
                if (runtime === "codex") {
                    if (event.type === "turn.failed" || event.type === "error") {
                        message = String(event.error?.message || event.message || message || "Codex 执行失败");
                    }
                }
                else if (runtime === "cursor") {
                    const subtype = String(event.subtype || event.status || "").toLowerCase();
                    if (event.type === "error" || event.type === "failed" || subtype === "error" || subtype === "failed") {
                        message = String(event.error?.message || event.message || event.result || message || "Cursor Agent 执行失败");
                    }
                }
            }
            catch { }
        }
    }
    if (!message && codeFailed) {
        message = (stderr.trim() || raw.trim() || `Agent 进程退出，exitCode=${exitCode}`).slice(0, 4000);
    }
    return { failed: !!message || codeFailed, message };
}
function runAgentRuntimeSessionSelfTest() {
    const sessionId = "11111111-1111-4111-8111-111111111111";
    const claudeInitial = buildAgentCommand("claudecode", "prompt.txt", { persistSession: true, sessionId });
    const claudeResume = buildAgentCommand("claudecode", "prompt.txt", { persistSession: true, resumeSession: true, sessionId });
    const codexInitial = buildAgentCommand("codex", "prompt.txt", { persistSession: true });
    const codexResume = buildAgentCommand("codex", "prompt.txt", { persistSession: true, resumeSession: true, sessionId });
    const cursorInitial = buildAgentCommand("cursor", "prompt.txt", { persistSession: true });
    const cursorResume = buildAgentCommand("cursor", "prompt.txt", { persistSession: true, resumeSession: true, sessionId });
    const decodePromptRunnerArgs = (command) => {
        const encoded = command.trim().split(/\s+/).pop() || "";
        try {
            return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
        }
        catch {
            return [];
        }
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
//# sourceMappingURL=runtime.js.map