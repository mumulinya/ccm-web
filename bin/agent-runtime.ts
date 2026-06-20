import * as path from "path";
export type AgentRuntimeId = "claudecode" | "claude" | "cursor" | "gemini" | "codex" | "qoder";

export interface AgentCommandOptions {
  cliAllowedTools?: string[];
  mcpConfigPath?: string;
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

function quoteCmdArg(value: string) {
  return `"${String(value || "").replace(/"/g, "\\\"")}"`;
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

function buildCodexExecCommand(msgFile: string, options: AgentCommandOptions = {}) {
  const configPath = String(options.mcpConfigPath || "").trim();
  const runtimeHome = configPath ? path.dirname(configPath) : "";
  const homePrefix = runtimeHome ? `set "CODEX_HOME=${runtimeHome}" && ` : "";
  return `${homePrefix}type "${msgFile}" | codex exec --full-auto --ephemeral --skip-git-repo-check -`;
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
  }));
}
