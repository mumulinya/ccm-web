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
exports.sealInternalMcpTaskContext = sealInternalMcpTaskContext;
exports.openInternalMcpTaskContext = openInternalMcpTaskContext;
exports.buildInternalMcpServerConfig = buildInternalMcpServerConfig;
exports.assertInternalMcpRole = assertInternalMcpRole;
exports.internalMcpTextResult = internalMcpTextResult;
exports.runInternalMcpServer = runInternalMcpServer;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const CCM_DIR = path.join(os.homedir(), ".cc-connect");
const SECRET_FILE = path.join(CCM_DIR, "private", "internal-mcp-context-secret");
const AUDIT_FILE = path.join(CCM_DIR, "tools", "internal-mcp-invocations.jsonl");
const CONTEXT_TTL_MS = 14 * 24 * 60 * 60_000;
function ensureSecret() {
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    if (!fs.existsSync(SECRET_FILE)) {
        fs.writeFileSync(SECRET_FILE, crypto.randomBytes(32).toString("base64url"), { encoding: "utf-8", mode: 0o600 });
    }
    const value = fs.readFileSync(SECRET_FILE, "utf-8").trim();
    if (value.length < 32)
        throw new Error("内部 MCP 上下文密钥无效");
    return value;
}
function signature(payload) {
    return crypto.createHmac("sha256", ensureSecret()).update(payload).digest("base64url");
}
function sealInternalMcpTaskContext(input) {
    const issuedAt = input.issuedAt || new Date().toISOString();
    const expiresAt = input.expiresAt || new Date(Date.parse(issuedAt) + CONTEXT_TTL_MS).toISOString();
    const context = {
        ...input,
        schema: "ccm-internal-mcp-task-context-v1",
        taskId: String(input.taskId || "").trim(),
        groupId: String(input.groupId || "").trim(),
        project: String(input.project || "").trim(),
        workDir: path.resolve(String(input.workDir || input.baseWorkDir || ".")),
        baseWorkDir: path.resolve(String(input.baseWorkDir || input.workDir || ".")),
        issuedAt,
        expiresAt,
    };
    if (!context.taskId || !context.project || !context.role)
        throw new Error("内部 MCP 缺少任务、项目或角色绑定");
    const payload = Buffer.from(JSON.stringify(context), "utf-8").toString("base64url");
    return `${payload}.${signature(payload)}`;
}
function openInternalMcpTaskContext(token = process.env.CCM_INTERNAL_MCP_CONTEXT || "") {
    const [payload, suppliedSignature] = String(token || "").split(".", 2);
    if (!payload || !suppliedSignature)
        throw new Error("内部 MCP 缺少签名任务上下文");
    const expected = signature(payload);
    const left = Buffer.from(suppliedSignature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right))
        throw new Error("内部 MCP 任务上下文签名无效");
    const context = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (context?.schema !== "ccm-internal-mcp-task-context-v1")
        throw new Error("内部 MCP 任务上下文版本无效");
    if (!context.taskId || !context.project || !context.role)
        throw new Error("内部 MCP 任务上下文绑定不完整");
    if (!Number.isFinite(Date.parse(context.expiresAt)) || Date.parse(context.expiresAt) <= Date.now())
        throw new Error("内部 MCP 任务上下文已过期，请重新派发任务");
    return context;
}
function buildInternalMcpServerConfig(entryFile, context) {
    return {
        command: process.execPath,
        args: [entryFile],
        env: { CCM_INTERNAL_MCP_CONTEXT: sealInternalMcpTaskContext(context) },
    };
}
function assertInternalMcpRole(context, roles, action) {
    if (!roles.includes(context.role))
        throw new Error(`${context.role} 无权执行内部 MCP 操作：${action}`);
}
function compactAuditArgs(value) {
    const result = {};
    for (const [key, item] of Object.entries(value && typeof value === "object" ? value : {})) {
        if (/(secret|token|password|authorization|credential|content|diff|patch)/i.test(key)) {
            result[key] = "[已隐藏]";
        }
        else if (Array.isArray(item)) {
            result[key] = { count: item.length };
        }
        else if (item && typeof item === "object") {
            result[key] = "[结构化参数]";
        }
        else {
            result[key] = String(item ?? "").slice(0, 180);
        }
    }
    return result;
}
function appendAudit(server, context, tool, args, status, error = "") {
    fs.mkdirSync(path.dirname(AUDIT_FILE), { recursive: true });
    fs.appendFileSync(AUDIT_FILE, `${JSON.stringify({
        schema: "ccm-internal-mcp-invocation-audit-v1",
        at: new Date().toISOString(),
        server,
        tool,
        status,
        error: String(error || "").slice(0, 500),
        task_id: context.taskId,
        group_id: context.groupId,
        project: context.project,
        role: context.role,
        task_agent_session_id: context.taskAgentSessionId || "",
        arguments: compactAuditArgs(args),
    })}\n`, "utf-8");
}
function internalMcpTextResult(value, isError = false) {
    return { content: [{ type: "text", text: JSON.stringify(value) }], isError };
}
function runInternalMcpServer(options) {
    let context;
    try {
        context = openInternalMcpTaskContext();
    }
    catch (error) {
        process.stderr.write(`${error?.message || error}\n`);
        process.exitCode = 2;
        return;
    }
    const allTools = typeof options.tools === "function" ? options.tools(context) : options.tools;
    const tools = allTools.filter(tool => !tool.roles?.length || tool.roles.includes(context.role));
    const toolNames = new Set(tools.map(tool => tool.name));
    const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
    const reply = (id, result, error) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, ...(error ? { error } : { result }) })}\n`);
    input.on("line", line => {
        let message;
        try {
            message = JSON.parse(line);
        }
        catch {
            return;
        }
        if (message.id === undefined)
            return;
        void (async () => {
            try {
                if (message.method === "initialize") {
                    return reply(message.id, { protocolVersion: "2024-11-05", capabilities: { tools: { listChanged: false } }, serverInfo: { name: options.name, version: options.version || "1.0.0" } });
                }
                if (message.method === "tools/list")
                    return reply(message.id, { tools: tools.map(({ roles, ...tool }) => tool) });
                if (message.method === "tools/call") {
                    const name = String(message.params?.name || "");
                    const args = message.params?.arguments || {};
                    if (!toolNames.has(name))
                        throw new Error(`当前角色无权调用工具：${name}`);
                    try {
                        const result = await options.callTool(context, name, args);
                        appendAudit(options.name, context, name, args, "ok");
                        return reply(message.id, Array.isArray(result?.content) ? result : internalMcpTextResult(result));
                    }
                    catch (error) {
                        appendAudit(options.name, context, name, args, "error", error?.message || String(error));
                        return reply(message.id, internalMcpTextResult({ success: false, error: error?.message || String(error) }, true));
                    }
                }
                return reply(message.id, undefined, { code: -32601, message: `Method not found: ${message.method}` });
            }
            catch (error) {
                return reply(message.id, undefined, { code: -32000, message: error?.message || String(error) });
            }
        })();
    });
}
//# sourceMappingURL=internal-mcp-runtime.js.map