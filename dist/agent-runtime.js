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
const path = __importStar(require("path"));
function quoteCmdArg(value) {
    return `"${String(value || "").replace(/"/g, "\\\"")}"`;
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
function buildCodexExecCommand(msgFile, options = {}) {
    const configPath = String(options.mcpConfigPath || "").trim();
    const runtimeHome = configPath ? path.dirname(configPath) : "";
    const homePrefix = runtimeHome ? `set "CODEX_HOME=${runtimeHome}" && ` : "";
    return `${homePrefix}type "${msgFile}" | codex exec --full-auto --ephemeral --skip-git-repo-check -`;
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
            sessionResume: false,
            scratchpadContinuation: true,
        },
        buildCommand: (msgFile, options) => `${pipeFileToCommand(msgFile, "claude --permission-mode acceptEdits", options)}${formatStrictMcpConfigArg(options)} -p`,
    },
    {
        id: "cursor",
        aliases: ["cursor", "agent"],
        label: "Cursor Agent",
        commandLabel: "agent -p",
        capabilities: {
            print: true,
            streaming: false,
            externalRunner: true,
            worktreeIsolation: true,
            sessionResume: false,
            scratchpadContinuation: true,
        },
        buildCommand: msgFile => pipeFileToCommand(msgFile, "agent -p"),
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
        commandLabel: "codex exec --full-auto --ephemeral -",
        capabilities: {
            print: true,
            streaming: false,
            externalRunner: true,
            worktreeIsolation: true,
            sessionResume: false,
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
//# sourceMappingURL=agent-runtime.js.map