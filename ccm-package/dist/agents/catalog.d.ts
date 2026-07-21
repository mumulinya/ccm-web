export declare const DEVELOPMENT_AGENT_CATALOG: readonly [{
    readonly id: "claudecode";
    readonly aliases: readonly ["claudecode", "claude-code", "claude_code", "cc", "claude"];
    readonly label: "Claude Code";
    readonly description: "通过 Anthropic 兼容第三方 API 运行 Claude Code。";
    readonly command: "claude";
    readonly settingsManaged: true;
    readonly defaultEnabled: false;
}, {
    readonly id: "codex";
    readonly aliases: readonly ["codex"];
    readonly label: "Codex CLI";
    readonly description: "使用本机 Codex 账号登录，并在 CCM 隔离运行时中执行。";
    readonly command: "codex";
    readonly settingsManaged: true;
    readonly defaultEnabled: true;
}, {
    readonly id: "cursor";
    readonly aliases: readonly ["cursor", "agent", "cursor-agent"];
    readonly label: "Cursor Agent";
    readonly description: "使用本机 Cursor 账号登录，并继承 CCM 的项目与工具边界。";
    readonly command: "cursor-agent";
    readonly settingsManaged: true;
    readonly defaultEnabled: true;
}, {
    readonly id: "gemini";
    readonly aliases: readonly ["gemini", "geminicli", "gemini-cli"];
    readonly label: "Gemini CLI";
    readonly description: "使用 Google 登录或 Gemini API 凭据运行官方 Gemini CLI。";
    readonly command: "gemini";
    readonly settingsManaged: true;
    readonly defaultEnabled: true;
}, {
    readonly id: "opencode";
    readonly aliases: readonly ["opencode", "open-code"];
    readonly label: "OpenCode";
    readonly description: "使用 OpenCode 已连接的模型 Provider，并注入 CCM 的受控 MCP。";
    readonly command: "opencode";
    readonly settingsManaged: true;
    readonly defaultEnabled: true;
}, {
    readonly id: "qoder";
    readonly aliases: readonly ["qoder", "qoder-cli"];
    readonly label: "Qoder CLI";
    readonly description: "兼容已有 Qoder CLI 项目。";
    readonly command: "qodercli";
    readonly settingsManaged: false;
    readonly defaultEnabled: true;
}];
export type AgentRuntimeId = typeof DEVELOPMENT_AGENT_CATALOG[number]["id"];
export declare const PROJECT_AGENT_TYPES: AgentRuntimeId[];
export declare function findDevelopmentAgent(value: unknown): {
    readonly id: "claudecode";
    readonly aliases: readonly ["claudecode", "claude-code", "claude_code", "cc", "claude"];
    readonly label: "Claude Code";
    readonly description: "通过 Anthropic 兼容第三方 API 运行 Claude Code。";
    readonly command: "claude";
    readonly settingsManaged: true;
    readonly defaultEnabled: false;
} | {
    readonly id: "codex";
    readonly aliases: readonly ["codex"];
    readonly label: "Codex CLI";
    readonly description: "使用本机 Codex 账号登录，并在 CCM 隔离运行时中执行。";
    readonly command: "codex";
    readonly settingsManaged: true;
    readonly defaultEnabled: true;
} | {
    readonly id: "cursor";
    readonly aliases: readonly ["cursor", "agent", "cursor-agent"];
    readonly label: "Cursor Agent";
    readonly description: "使用本机 Cursor 账号登录，并继承 CCM 的项目与工具边界。";
    readonly command: "cursor-agent";
    readonly settingsManaged: true;
    readonly defaultEnabled: true;
} | {
    readonly id: "gemini";
    readonly aliases: readonly ["gemini", "geminicli", "gemini-cli"];
    readonly label: "Gemini CLI";
    readonly description: "使用 Google 登录或 Gemini API 凭据运行官方 Gemini CLI。";
    readonly command: "gemini";
    readonly settingsManaged: true;
    readonly defaultEnabled: true;
} | {
    readonly id: "opencode";
    readonly aliases: readonly ["opencode", "open-code"];
    readonly label: "OpenCode";
    readonly description: "使用 OpenCode 已连接的模型 Provider，并注入 CCM 的受控 MCP。";
    readonly command: "opencode";
    readonly settingsManaged: true;
    readonly defaultEnabled: true;
} | {
    readonly id: "qoder";
    readonly aliases: readonly ["qoder", "qoder-cli"];
    readonly label: "Qoder CLI";
    readonly description: "兼容已有 Qoder CLI 项目。";
    readonly command: "qodercli";
    readonly settingsManaged: false;
    readonly defaultEnabled: true;
};
export declare function normalizeRegisteredAgentId(value: unknown, fallback?: AgentRuntimeId): AgentRuntimeId;
export declare function publicDevelopmentAgentCatalog(): ({
    aliases: ("claudecode" | "claude-code" | "claude_code" | "cc" | "claude" | "codex" | "cursor" | "agent" | "cursor-agent" | "gemini" | "geminicli" | "gemini-cli" | "opencode" | "open-code" | "qoder" | "qoder-cli")[];
    default_enabled: boolean;
    id: "claudecode";
    label: "Claude Code";
    description: "通过 Anthropic 兼容第三方 API 运行 Claude Code。";
    command: "claude";
    settingsManaged: true;
} | {
    aliases: ("claudecode" | "claude-code" | "claude_code" | "cc" | "claude" | "codex" | "cursor" | "agent" | "cursor-agent" | "gemini" | "geminicli" | "gemini-cli" | "opencode" | "open-code" | "qoder" | "qoder-cli")[];
    default_enabled: boolean;
    id: "codex";
    label: "Codex CLI";
    description: "使用本机 Codex 账号登录，并在 CCM 隔离运行时中执行。";
    command: "codex";
    settingsManaged: true;
} | {
    aliases: ("claudecode" | "claude-code" | "claude_code" | "cc" | "claude" | "codex" | "cursor" | "agent" | "cursor-agent" | "gemini" | "geminicli" | "gemini-cli" | "opencode" | "open-code" | "qoder" | "qoder-cli")[];
    default_enabled: boolean;
    id: "cursor";
    label: "Cursor Agent";
    description: "使用本机 Cursor 账号登录，并继承 CCM 的项目与工具边界。";
    command: "cursor-agent";
    settingsManaged: true;
} | {
    aliases: ("claudecode" | "claude-code" | "claude_code" | "cc" | "claude" | "codex" | "cursor" | "agent" | "cursor-agent" | "gemini" | "geminicli" | "gemini-cli" | "opencode" | "open-code" | "qoder" | "qoder-cli")[];
    default_enabled: boolean;
    id: "gemini";
    label: "Gemini CLI";
    description: "使用 Google 登录或 Gemini API 凭据运行官方 Gemini CLI。";
    command: "gemini";
    settingsManaged: true;
} | {
    aliases: ("claudecode" | "claude-code" | "claude_code" | "cc" | "claude" | "codex" | "cursor" | "agent" | "cursor-agent" | "gemini" | "geminicli" | "gemini-cli" | "opencode" | "open-code" | "qoder" | "qoder-cli")[];
    default_enabled: boolean;
    id: "opencode";
    label: "OpenCode";
    description: "使用 OpenCode 已连接的模型 Provider，并注入 CCM 的受控 MCP。";
    command: "opencode";
    settingsManaged: true;
} | {
    aliases: ("claudecode" | "claude-code" | "claude_code" | "cc" | "claude" | "codex" | "cursor" | "agent" | "cursor-agent" | "gemini" | "geminicli" | "gemini-cli" | "opencode" | "open-code" | "qoder" | "qoder-cli")[];
    default_enabled: boolean;
    id: "qoder";
    label: "Qoder CLI";
    description: "兼容已有 Qoder CLI 项目。";
    command: "qodercli";
    settingsManaged: false;
})[];
