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
exports.GROUP_COORDINATION_MCP_SERVER_NAME = void 0;
exports.buildGroupCoordinationMcpServerConfig = buildGroupCoordinationMcpServerConfig;
exports.runGroupCoordinationMcpServer = runGroupCoordinationMcpServer;
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const group_coordination_store_1 = require("../modules/collaboration/group-coordination-store");
exports.GROUP_COORDINATION_MCP_SERVER_NAME = "ccm__group_coordinator";
function decodeContext(value) {
    try {
        const parsed = JSON.parse(Buffer.from(String(value || ""), "base64url").toString("utf-8"));
        if (parsed?.schema !== "ccm-group-coordination-context-v1" || parsed?.role !== "child_agent")
            throw new Error("invalid role");
        if (!parsed.groupId || !parsed.taskId || !parsed.sourceProject)
            throw new Error("missing binding");
        return parsed;
    }
    catch {
        throw new Error("内部协调 MCP 缺少有效的任务会话绑定");
    }
}
function buildGroupCoordinationMcpServerConfig(context) {
    const boundContext = {
        ...context,
        schema: "ccm-group-coordination-context-v1",
        role: "child_agent",
    };
    return {
        command: process.execPath,
        args: [path.join(__dirname, "group-coordination-mcp.js")],
        env: {
            CCM_GROUP_COORDINATION_CONTEXT: Buffer.from(JSON.stringify(boundContext), "utf-8").toString("base64url"),
        },
    };
}
const tools = [
    {
        name: "request_coordination",
        description: "向群聊主 Agent 提交跨 Agent 协调请求。只提交需求和证据，不能直接派发或命令其他子 Agent。",
        inputSchema: {
            type: "object",
            required: ["kind", "summary"],
            properties: {
                kind: { type: "string", enum: ["information", "implementation", "review", "risk"] },
                summary: { type: "string", description: "用一句话说明需要主 Agent 协调什么" },
                question: { type: "string", description: "需要得到回答或实现的具体内容" },
                reason: { type: "string" },
                blocking: { type: "boolean", default: true },
                required_capabilities: { type: "array", items: { type: "string" } },
                target_hint: { type: "string", description: "可选建议，仅供主 Agent 判断，不代表派发" },
                evidence: { type: "array", items: { type: "string" } },
                acceptance_criteria: { type: "array", items: { type: "string" } },
                requested_write_paths: { type: "array", items: { type: "string" } },
                idempotency_key: { type: "string" },
            },
            additionalProperties: false,
        },
    },
    {
        name: "report_blocker",
        description: "把无法自行解除的风险、权限或业务阻塞报告给群聊主 Agent。",
        inputSchema: {
            type: "object",
            required: ["summary"],
            properties: {
                summary: { type: "string" },
                reason: { type: "string" },
                evidence: { type: "array", items: { type: "string" } },
                needs_user: { type: "boolean", default: false },
                idempotency_key: { type: "string" },
            },
            additionalProperties: false,
        },
    },
    {
        name: "request_review",
        description: "向群聊主 Agent 申请另一个 Agent 进行只读评审；由主 Agent 选择评审者。",
        inputSchema: {
            type: "object",
            required: ["summary"],
            properties: {
                summary: { type: "string" },
                question: { type: "string" },
                reason: { type: "string" },
                evidence: { type: "array", items: { type: "string" } },
                acceptance_criteria: { type: "array", items: { type: "string" } },
                required_capabilities: { type: "array", items: { type: "string" } },
                idempotency_key: { type: "string" },
            },
            additionalProperties: false,
        },
    },
    {
        name: "get_coordination_status",
        description: "查询当前任务会话由群聊主 Agent 管理的协调请求状态。",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
];
function textResult(value, isError = false) {
    return { content: [{ type: "text", text: JSON.stringify(value) }], isError };
}
function callTool(context, name, args) {
    if (name === "get_coordination_status") {
        const requests = (0, group_coordination_store_1.listGroupCoordinationRequests)(context).map(row => ({ id: row.id, kind: row.kind, status: row.status, summary: row.summary, updated_at: row.updated_at }));
        return textResult({ success: true, requests });
    }
    if (name === "report_blocker") {
        const result = (0, group_coordination_store_1.submitGroupCoordinationRequest)(context, {
            kind: args?.needs_user === true ? "risk" : "information",
            summary: args?.summary,
            question: args?.summary,
            reason: args?.reason,
            evidence: args?.evidence,
            blocking: true,
            idempotencyKey: args?.idempotency_key,
            metadata: { needs_user: args?.needs_user === true, submitted_tool: name },
        });
        return textResult({ success: true, request_id: result.record.id, status: result.record.status, deduplicated: result.deduplicated, next: "群聊主 Agent 将统一判断并安排下一步" });
    }
    if (name === "request_review" || name === "request_coordination") {
        const result = (0, group_coordination_store_1.submitGroupCoordinationRequest)(context, {
            kind: name === "request_review" ? "review" : args?.kind,
            summary: args?.summary,
            question: args?.question,
            reason: args?.reason,
            blocking: args?.blocking !== false,
            requiredCapabilities: args?.required_capabilities,
            targetHint: args?.target_hint,
            evidence: args?.evidence,
            acceptanceCriteria: args?.acceptance_criteria,
            requestedWritePaths: args?.requested_write_paths,
            idempotencyKey: args?.idempotency_key,
            metadata: { submitted_tool: name },
        });
        return textResult({ success: true, request_id: result.record.id, status: result.record.status, deduplicated: result.deduplicated, next: "群聊主 Agent 将统一判断、派发和验收" });
    }
    return textResult({ success: false, error: `未知工具：${name}` }, true);
}
function runGroupCoordinationMcpServer() {
    let context;
    try {
        context = decodeContext(process.env.CCM_GROUP_COORDINATION_CONTEXT || "");
    }
    catch (error) {
        process.stderr.write(`${error?.message || error}\n`);
        process.exitCode = 2;
        return;
    }
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
        try {
            if (message.method === "initialize") {
                reply(message.id, { protocolVersion: "2024-11-05", capabilities: { tools: { listChanged: false } }, serverInfo: { name: exports.GROUP_COORDINATION_MCP_SERVER_NAME, version: "1.0.0" } });
            }
            else if (message.method === "tools/list") {
                reply(message.id, { tools });
            }
            else if (message.method === "tools/call") {
                reply(message.id, callTool(context, String(message.params?.name || ""), message.params?.arguments || {}));
            }
            else {
                reply(message.id, undefined, { code: -32601, message: `Method not found: ${message.method}` });
            }
        }
        catch (error) {
            reply(message.id, undefined, { code: -32000, message: error?.message || String(error) });
        }
    });
}
if (require.main === module)
    runGroupCoordinationMcpServer();
//# sourceMappingURL=group-coordination-mcp.js.map