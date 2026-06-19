export type AgentRuntimeId = "claudecode" | "claude" | "cursor" | "gemini" | "codex";

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
  buildCommand: (msgFile: string) => string;
}

function pipeFileToCommand(msgFile: string, command: string) {
  return `type "${msgFile}" | ${command}`;
}

export const AGENT_RUNTIMES: AgentRuntimeDescriptor[] = [
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

export function normalizeAgentRuntimeId(agentType = ""): AgentRuntimeId {
  const key = String(agentType || "").trim().toLowerCase();
  const runtime = AGENT_RUNTIMES.find(item => item.aliases.includes(key) || item.id === key);
  return runtime?.id || "claudecode";
}

export function getAgentRuntime(agentType = "") {
  const id = normalizeAgentRuntimeId(agentType);
  return AGENT_RUNTIMES.find(item => item.id === id) || AGENT_RUNTIMES[0];
}

export function buildAgentCommand(agentType: string, msgFile: string) {
  return getAgentRuntime(agentType).buildCommand(msgFile);
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
  }));
}

