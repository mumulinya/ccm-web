"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROJECT_AGENT_TYPES = exports.DEVELOPMENT_AGENT_CATALOG = void 0;
exports.findDevelopmentAgent = findDevelopmentAgent;
exports.normalizeRegisteredAgentId = normalizeRegisteredAgentId;
exports.publicDevelopmentAgentCatalog = publicDevelopmentAgentCatalog;
exports.DEVELOPMENT_AGENT_CATALOG = [
    {
        id: "claudecode",
        aliases: ["claudecode", "claude-code", "claude_code", "cc", "claude"],
        label: "Claude Code",
        description: "通过 Anthropic 兼容第三方 API 运行 Claude Code。",
        command: "claude",
        settingsManaged: true,
        defaultEnabled: false,
    },
    {
        id: "codex",
        aliases: ["codex"],
        label: "Codex CLI",
        description: "使用本机 Codex 账号登录，并在 CCM 隔离运行时中执行。",
        command: "codex",
        settingsManaged: true,
        defaultEnabled: true,
    },
    {
        id: "cursor",
        aliases: ["cursor", "agent", "cursor-agent"],
        label: "Cursor Agent",
        description: "使用本机 Cursor 账号登录，并继承 CCM 的项目与工具边界。",
        command: "cursor-agent",
        settingsManaged: true,
        defaultEnabled: true,
    },
    {
        id: "gemini",
        aliases: ["gemini", "geminicli", "gemini-cli"],
        label: "Gemini CLI",
        description: "使用 Google 登录或 Gemini API 凭据运行官方 Gemini CLI。",
        command: "gemini",
        settingsManaged: true,
        defaultEnabled: true,
    },
    {
        id: "opencode",
        aliases: ["opencode", "open-code"],
        label: "OpenCode",
        description: "使用 OpenCode 已连接的模型 Provider，并注入 CCM 的受控 MCP。",
        command: "opencode",
        settingsManaged: true,
        defaultEnabled: true,
    },
    {
        id: "qoder",
        aliases: ["qoder", "qoder-cli"],
        label: "Qoder CLI",
        description: "兼容已有 Qoder CLI 项目。",
        command: "qodercli",
        settingsManaged: false,
        defaultEnabled: true,
    },
];
exports.PROJECT_AGENT_TYPES = exports.DEVELOPMENT_AGENT_CATALOG.map(item => item.id);
function findDevelopmentAgent(value) {
    const key = String(value || "").trim().toLowerCase();
    return exports.DEVELOPMENT_AGENT_CATALOG.find(item => item.id === key || item.aliases.includes(key));
}
function normalizeRegisteredAgentId(value, fallback = "claudecode") {
    return findDevelopmentAgent(value)?.id || fallback;
}
function publicDevelopmentAgentCatalog() {
    return exports.DEVELOPMENT_AGENT_CATALOG.map(({ defaultEnabled, ...item }) => ({
        ...item,
        aliases: [...item.aliases],
        default_enabled: defaultEnabled,
    }));
}
//# sourceMappingURL=catalog.js.map