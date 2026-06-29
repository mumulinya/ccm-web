import * as path from "path";
import { spawnSync } from "child_process";
export type AgentRuntimeId = "claudecode" | "claude" | "cursor" | "gemini" | "codex" | "qoder";

export interface AgentCommandOptions {
  cliAllowedTools?: string[];
  mcpConfigPath?: string;
  sessionId?: string;
  resumeSession?: boolean;
  persistSession?: boolean;
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
  const sessionId = String(options.sessionId || "").trim();
  if (options.persistSession && options.resumeSession && sessionId) {
    return `${homePrefix}type "${msgFile}" | codex exec resume --full-auto --skip-git-repo-check --json ${quoteCmdArg(sessionId)} -`;
  }
  const persistence = options.persistSession ? " --json" : " --ephemeral";
  return `${homePrefix}type "${msgFile}" | codex exec --full-auto${persistence} --skip-git-repo-check -`;
}

function buildCursorAgentCommand(msgFile: string, options: AgentCommandOptions = {}) {
  const sessionId = String(options.sessionId || "").trim();
  const resumeArg = options.persistSession && options.resumeSession && sessionId
    ? ` --resume ${quoteCmdArg(sessionId)}`
    : "";
  const outputArg = options.persistSession ? " --output-format json" : "";
  const explicit = String(process.env.CCM_CURSOR_AGENT_COMMAND || "").trim();
  const available = (command: string) => process.platform === "win32"
    ? spawnSync("where.exe", [command], { windowsHide: true, stdio: "ignore" }).status === 0
    : spawnSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore" }).status === 0;
  const command = explicit || (available("cursor-agent") ? "cursor-agent" : available("agent") ? "agent" : "cursor-agent");
  return `type "${msgFile}" | ${command} -p --force${outputArg}${resumeArg}`;
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
      sessionResume: true,
      scratchpadContinuation: true,
    },
    buildCommand: (msgFile, options = {}) => {
      const sessionId = String(options.sessionId || "").trim();
      const sessionArg = options.persistSession && sessionId
        ? (options.resumeSession ? ` --resume ${quoteCmdArg(sessionId)}` : ` --session-id ${quoteCmdArg(sessionId)}`)
        : "";
      return `${pipeFileToCommand(msgFile, "claude --permission-mode acceptEdits", options)}${formatStrictMcpConfigArg(options)}${sessionArg} -p`;
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
  }));
}

export function normalizeAgentCommandOutput(agentType: string, rawOutput: string) {
  const runtime = normalizeAgentRuntimeId(agentType);
  const raw = String(rawOutput || "").trim();
  if (!raw || !["codex", "cursor"].includes(runtime)) return { output: raw, sessionId: "" };

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
      sessionId,
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
    sessionId,
  };
}

export function runAgentRuntimeSessionSelfTest() {
  const sessionId = "11111111-1111-4111-8111-111111111111";
  const claudeInitial = buildAgentCommand("claudecode", "prompt.txt", { persistSession: true, sessionId });
  const claudeResume = buildAgentCommand("claudecode", "prompt.txt", { persistSession: true, resumeSession: true, sessionId });
  const codexInitial = buildAgentCommand("codex", "prompt.txt", { persistSession: true });
  const codexResume = buildAgentCommand("codex", "prompt.txt", { persistSession: true, resumeSession: true, sessionId });
  const cursorInitial = buildAgentCommand("cursor", "prompt.txt", { persistSession: true });
  const cursorResume = buildAgentCommand("cursor", "prompt.txt", { persistSession: true, resumeSession: true, sessionId });
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
  const checks = {
    claudeCreatesNamedSession: claudeInitial.includes("--session-id") && claudeInitial.includes(sessionId),
    claudeResumesSameSession: claudeResume.includes("--resume") && claudeResume.includes(sessionId),
    codexInitialIsPersistent: codexInitial.includes("--json") && !codexInitial.includes("--ephemeral"),
    codexResumesSameSession: codexResume.includes("codex exec resume") && codexResume.includes(sessionId),
    codexCapturesNativeSession: parsed.sessionId === sessionId && parsed.output === "任务完成",
    cursorInitialCapturesSession: cursorInitial.includes("--output-format json") && !cursorInitial.includes("--resume"),
    cursorResumesSameSession: cursorResume.includes("--resume") && cursorResume.includes(sessionId),
    cursorParsesNativeSession: cursorParsed.sessionId === sessionId && cursorParsed.output === "继续完成",
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
