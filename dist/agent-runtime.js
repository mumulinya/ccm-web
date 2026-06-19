"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_RUNTIMES = void 0;
exports.normalizeAgentRuntimeId = normalizeAgentRuntimeId;
exports.getAgentRuntime = getAgentRuntime;
exports.buildAgentCommand = buildAgentCommand;
exports.getAgentCommandLabel = getAgentCommandLabel;
exports.getPublicAgentRuntimes = getPublicAgentRuntimes;
function pipeFileToCommand(msgFile, command) {
    return `type "${msgFile}" | ${command}`;
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
        buildCommand: msgFile => pipeFileToCommand(msgFile, "claude --permission-mode acceptEdits -p"),
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
        commandLabel: "codex -q",
        capabilities: {
            print: true,
            streaming: false,
            externalRunner: true,
            worktreeIsolation: true,
            sessionResume: false,
            scratchpadContinuation: true,
        },
        buildCommand: msgFile => pipeFileToCommand(msgFile, "codex -q"),
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
function buildAgentCommand(agentType, msgFile) {
    return getAgentRuntime(agentType).buildCommand(msgFile);
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