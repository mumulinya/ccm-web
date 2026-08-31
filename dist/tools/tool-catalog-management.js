"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeToolCatalogName = normalizeToolCatalogName;
exports.normalizeMcpEnvironment = normalizeMcpEnvironment;
exports.redactMcpCommand = redactMcpCommand;
exports.redactMcpToolForDisplay = redactMcpToolForDisplay;
exports.mergeMcpToolUpdate = mergeMcpToolUpdate;
exports.mergeSkillUpdate = mergeSkillUpdate;
exports.runToolCatalogManagementSelfTest = runToolCatalogManagementSelfTest;
const credential_store_1 = require("../core/credential-store");
const CATALOG_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/;
const ENV_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
function owns(value, key) {
    return !!value && Object.prototype.hasOwnProperty.call(value, key);
}
function normalizeToolCatalogName(value) {
    const name = String(value || "").trim();
    if (!CATALOG_NAME_PATTERN.test(name)) {
        throw new Error("名称只能包含字母、数字、点、下划线和连字符，且不能超过 80 个字符");
    }
    return name;
}
function normalizeMcpEnvironment(value, options = {}) {
    const strict = options.strict === true;
    const rows = {};
    const add = (rawKey, rawValue) => {
        const key = String(rawKey || "").trim();
        if (!key)
            return;
        if (!ENV_NAME_PATTERN.test(key)) {
            if (strict)
                throw new Error(`环境变量名称无效：${key}`);
            return;
        }
        rows[key] = String(rawValue ?? "");
    };
    if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const [key, item] of Object.entries(value))
            add(key, item);
        return rows;
    }
    for (const line of String(value || "").split(/\r?\n/)) {
        if (!line.trim())
            continue;
        const separator = line.indexOf("=");
        if (separator < 1) {
            if (strict)
                throw new Error(`环境变量必须使用 KEY=value 格式：${line.trim().slice(0, 40)}`);
            continue;
        }
        add(line.slice(0, separator), line.slice(separator + 1));
    }
    return rows;
}
function redactMcpCommand(value) {
    return (0, credential_store_1.redactSensitiveText)(value)
        .replace(/(--?(?:api[-_]?key|access[-_]?token|token|password|secret)(?:=|\s+))([^\s"']+)/gi, "$1***")
        .trim();
}
function redactMcpArgs(value) {
    const args = Array.isArray(value) ? value : String(value || "").match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    return args.map(item => redactMcpCommand(String(item))).filter(Boolean);
}
function redactMcpToolForDisplay(tool = {}) {
    const environment = normalizeMcpEnvironment(tool.env);
    const command = redactMcpCommand(tool.command);
    const args = redactMcpArgs(tool.args);
    return {
        name: String(tool.name || ""),
        description: String(tool.description || ""),
        command,
        args,
        commandRedacted: command !== String(tool.command || "") || JSON.stringify(args) !== JSON.stringify(redactMcpArgs(tool.args)),
        envConfigured: Object.keys(environment).length > 0,
        envKeys: Object.keys(environment).sort((left, right) => left.localeCompare(right)),
        enabled: tool.enabled !== false,
        type: "mcp",
        created_at: String(tool.created_at || ""),
        source: tool.source && typeof tool.source === "object" ? {
            id: String(tool.source.id || ""),
            label: String(tool.source.label || ""),
            trust: String(tool.source.trust || ""),
        } : undefined,
        version: String(tool.version || ""),
        author: String(tool.author || ""),
    };
}
function mergeMcpToolUpdate(existing, input = {}, options = {}) {
    const create = options.create === true;
    const current = existing && typeof existing === "object" ? existing : {};
    const name = normalizeToolCatalogName(input.name || current.name);
    let command = owns(input, "command") ? String(input.command || "").trim() : String(current.command || "").trim();
    if (!create && command && command === redactMcpCommand(current.command) && command !== String(current.command || "")) {
        command = String(current.command || "");
    }
    if (!command)
        throw new Error("启动命令不能为空");
    let args = owns(input, "args") ? input.args : current.args;
    if (!create && JSON.stringify(redactMcpArgs(current.args)) === JSON.stringify(redactMcpArgs(args))
        && JSON.stringify(args) !== JSON.stringify(current.args))
        args = current.args;
    args = Array.isArray(args) ? args.map(item => String(item)).filter(Boolean) : redactMcpArgs(args);
    let env = current.env;
    if (input.clearEnv === true)
        env = {};
    else if (owns(input, "env") && (create || String(input.env || "").trim() || (input.env && typeof input.env === "object"))) {
        env = normalizeMcpEnvironment(input.env, { strict: true });
    }
    if (create && !owns(input, "env"))
        env = {};
    return {
        ...current,
        name,
        description: owns(input, "description") ? String(input.description || "").trim() : String(current.description || ""),
        command,
        args,
        env: normalizeMcpEnvironment(env, { strict: true }),
        enabled: owns(input, "enabled") ? input.enabled !== false : current.enabled !== false,
        type: "mcp",
        created_at: String(current.created_at || input.created_at || new Date().toISOString()),
    };
}
function mergeSkillUpdate(existing, input = {}, options = {}) {
    const current = existing && typeof existing === "object" ? existing : {};
    const name = normalizeToolCatalogName(input.name || current.name);
    const prompt = owns(input, "prompt") ? String(input.prompt || "") : String(current.prompt || "");
    if (options.create === true && !prompt.trim())
        throw new Error("Prompt 模板不能为空");
    return {
        ...current,
        name,
        description: owns(input, "description") ? String(input.description || "").trim() : String(current.description || ""),
        prompt,
        enabled: owns(input, "enabled") ? input.enabled !== false : current.enabled !== false,
        type: "skill",
        created_at: String(current.created_at || input.created_at || new Date().toISOString()),
    };
}
function runToolCatalogManagementSelfTest() {
    const existing = {
        name: "secure-mcp",
        description: "existing",
        command: "node server.js --api-key secret-command",
        args: ["--token=secret-arg"],
        env: { API_KEY: "secret-env", REGION: "cn" },
        enabled: true,
    };
    const display = redactMcpToolForDisplay(existing);
    const toggled = mergeMcpToolUpdate(existing, { name: "secure-mcp", enabled: false });
    const cleared = mergeMcpToolUpdate(existing, { name: "secure-mcp", clearEnv: true });
    const checks = {
        displayHidesEnvironmentValues: !JSON.stringify(display).includes("secret-env") && display.envKeys.includes("API_KEY"),
        displayRedactsCommandAndArgs: !JSON.stringify(display).includes("secret-command") && !JSON.stringify(display).includes("secret-arg"),
        patchPreservesCredentialMaterial: toggled.env.API_KEY === "secret-env" && toggled.command.includes("secret-command"),
        explicitClearRemovesEnvironment: Object.keys(cleared.env).length === 0,
        invalidCatalogNameRejected: false,
        invalidEnvironmentRejected: false,
    };
    try {
        normalizeToolCatalogName("../unsafe");
    }
    catch {
        checks.invalidCatalogNameRejected = true;
    }
    try {
        normalizeMcpEnvironment("BAD-NAME=value", { strict: true });
    }
    catch {
        checks.invalidEnvironmentRejected = true;
    }
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=tool-catalog-management.js.map