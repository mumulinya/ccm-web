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
exports.normalizeAgentRuntimeId = normalizeAgentRuntimeId;
exports.getAgentRuntime = getAgentRuntime;
exports.buildAgentCommand = buildAgentCommand;
exports.getAgentCommandLabel = getAgentCommandLabel;
exports.getPublicAgentRuntimes = getPublicAgentRuntimes;
exports.isAgentRuntimeAvailable = isAgentRuntimeAvailable;
exports.getAgentRuntimeFallbackChain = getAgentRuntimeFallbackChain;
exports.resolveAvailableAgentRuntime = resolveAvailableAgentRuntime;
exports.normalizeAgentCommandOutput = normalizeAgentCommandOutput;
exports.detectAgentCommandFailure = detectAgentCommandFailure;
exports.runAgentRuntimeSessionSelfTest = runAgentRuntimeSessionSelfTest;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
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
function formatWindowsEnvPrefix(values) {
    const assignments = Object.entries(values)
        .filter(([, value]) => String(value || "").trim())
        .map(([key, value]) => `set "${key}=${String(value).replace(/"/g, "")}"`);
    return assignments.length ? `${assignments.join(" && ")} && ` : "";
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
    if (options.persistSession && options.resumeSession && sessionId) {
        return `${homePrefix}type "${msgFile}" | codex exec resume ${flags} --skip-git-repo-check --json ${quoteCmdArg(sessionId)} -`;
    }
    const persistence = options.persistSession ? " --json" : " --ephemeral";
    return `${homePrefix}type "${msgFile}" | codex exec ${flags}${persistence} --skip-git-repo-check -`;
}
function getCodexSandboxMode() {
    const requested = String(process.env.CCM_CODEX_SANDBOX || process.env.CCM_CODEX_SANDBOX_MODE || "").trim();
    if (["read-only", "workspace-write", "danger-full-access"].includes(requested))
        return requested;
    return process.platform === "win32" ? "danger-full-access" : "workspace-write";
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
    const available = (command) => process.platform === "win32"
        ? (0, child_process_1.spawnSync)("where.exe", [command], { windowsHide: true, stdio: "ignore" }).status === 0
        : (0, child_process_1.spawnSync)("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" }).status === 0;
    const command = explicit || (available("cursor-agent") ? "cursor-agent" : available("agent") ? "agent" : "cursor-agent");
    const isolatedHome = String(metadata.isolatedHomePath || "").trim();
    const homePrefix = isolatedHome ? formatWindowsEnvPrefix(buildIsolatedHomeEnv(isolatedHome, "cursor")) : "";
    const args = ["-p", "--force", "--trust"];
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
exports.AGENT_RUNTIMES = [
    {
        id: "claudecode",
        aliases: ["claudecode", "claude-code", "claude_code", "cc", "claude"],
        label: "Claude Code",
        commandLabel: "claude --permission-mode acceptEdits -p",
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
            return `${pipeFileToCommand(msgFile, "claude --permission-mode acceptEdits", options)}${formatStrictMcpConfigArg(options)}${formatPluginDirArg(metadata)}${sessionArg} -p`;
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
function normalizeAgentRuntimeId(agentType = "") {
    const key = String(agentType || "").trim().toLowerCase();
    const runtime = exports.AGENT_RUNTIMES.find(item => item.aliases.includes(key) || item.id === key);
    return runtime?.id || "claudecode";
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
    return exports.AGENT_RUNTIMES.map(runtime => ({
        id: runtime.id,
        aliases: runtime.aliases,
        label: runtime.label,
        commandLabel: runtime.commandLabel,
        capabilities: runtime.capabilities,
    }));
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
    if (runtime === "claudecode")
        return commandExists("claude");
    if (runtime === "cursor")
        return commandExists("cursor-agent") || commandExists("agent");
    if (runtime === "codex")
        return commandExists("codex");
    if (runtime === "gemini")
        return commandExists("gemini");
    if (runtime === "qoder")
        return commandExists("qodercli");
    return false;
}
function getAgentRuntimeFallbackChain(preferred = "claudecode") {
    const preferredRuntime = normalizeAgentRuntimeId(preferred || "claudecode");
    const priority = ["claudecode", "cursor", "codex"];
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
function normalizeAgentCommandOutput(agentType, rawOutput) {
    const runtime = normalizeAgentRuntimeId(agentType);
    const raw = String(rawOutput || "").trim();
    if (!raw || !["codex", "cursor"].includes(runtime))
        return { output: raw, sessionId: "" };
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
            sessionId,
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
        sessionId,
    };
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
        claudeCreatesNamedSession: claudeInitial.includes("--session-id") && claudeInitial.includes(sessionId),
        claudeResumesSameSession: claudeResume.includes("--resume") && claudeResume.includes(sessionId),
        codexInitialIsPersistent: codexInitial.includes("--json") && !codexInitial.includes("--ephemeral"),
        codexResumesSameSession: codexResume.includes("codex exec resume") && codexResume.includes(sessionId),
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