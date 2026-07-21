import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as readline from "readline";

export type InternalMcpAgentRole = "global-agent" | "group-main-agent" | "project-agent" | "project-child-agent" | "test-agent";

export type InternalMcpProjectBinding = {
  name: string;
  workDir: string;
  verificationCommands?: string[];
  targetUrl?: string;
};

export type InternalMcpTaskContext = {
  schema: "ccm-internal-mcp-task-context-v1" | "ccm-internal-mcp-context-v2";
  bindingKind?: "task" | "project_session";
  taskId: string;
  groupId: string;
  groupSessionId?: string;
  project: string;
  projectSessionId?: string;
  role: InternalMcpAgentRole;
  agentType?: string;
  taskAgentSessionId?: string;
  nativeSessionId?: string;
  workDir: string;
  baseWorkDir: string;
  projects?: InternalMcpProjectBinding[];
  memoryReceiptChallenge?: any;
  memoryReceiptFile?: string;
  memorySnapshotId?: string;
  memorySnapshotChecksum?: string;
  boundaryGeneration?: number;
  nativeGeneration?: number;
  requestText?: string;
  memoryReadBudgetTokens?: number;
  issuedAt: string;
  expiresAt: string;
};

export type InternalMcpToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  roles?: InternalMcpAgentRole[];
};

const CCM_DIR = path.join(os.homedir(), ".cc-connect");
const SECRET_FILE = path.join(CCM_DIR, "private", "internal-mcp-context-secret");
const AUDIT_FILE = path.join(CCM_DIR, "tools", "internal-mcp-invocations.jsonl");
const CONTEXT_TTL_MS = 14 * 24 * 60 * 60_000;

function ensureSecret() {
  const secretFile = path.resolve(String(process.env.CCM_INTERNAL_MCP_SECRET_FILE || SECRET_FILE));
  fs.mkdirSync(path.dirname(secretFile), { recursive: true });
  if (!fs.existsSync(secretFile)) {
    fs.writeFileSync(secretFile, crypto.randomBytes(32).toString("base64url"), { encoding: "utf-8", mode: 0o600 });
  }
  const value = fs.readFileSync(secretFile, "utf-8").trim();
  if (value.length < 32) throw new Error("内部 MCP 上下文密钥无效");
  return value;
}

function signature(payload: string) {
  return crypto.createHmac("sha256", ensureSecret()).update(payload).digest("base64url");
}

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result: any, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

export function signInternalMcpEvidence(value: any) {
  return signature(JSON.stringify(canonical(value || {})));
}

export function verifyInternalMcpEvidenceSignature(value: any, supplied: any) {
  const expected = signInternalMcpEvidence(value);
  const left = Buffer.from(String(supplied || ""));
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function sealInternalMcpTaskContext(input: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt"> & Partial<Pick<InternalMcpTaskContext, "issuedAt" | "expiresAt">>) {
  const issuedAt = input.issuedAt || new Date().toISOString();
  const expiresAt = input.expiresAt || new Date(Date.parse(issuedAt) + CONTEXT_TTL_MS).toISOString();
  const bindingKind = input.bindingKind || (input.projectSessionId ? "project_session" : "task");
  const context: InternalMcpTaskContext = {
    ...input,
    schema: bindingKind === "project_session" ? "ccm-internal-mcp-context-v2" : "ccm-internal-mcp-task-context-v1",
    bindingKind,
    taskId: String(input.taskId || "").trim(),
    groupId: String(input.groupId || "").trim(),
    project: String(input.project || "").trim(),
    projectSessionId: String(input.projectSessionId || "").trim(),
    workDir: path.resolve(String(input.workDir || input.baseWorkDir || ".")),
    baseWorkDir: path.resolve(String(input.baseWorkDir || input.workDir || ".")),
    issuedAt,
    expiresAt,
  };
  if (!context.project || !context.role) throw new Error("内部 MCP 缺少项目或角色绑定");
  if (bindingKind === "task" && !context.taskId) throw new Error("内部 MCP 缺少任务绑定");
  if (bindingKind === "project_session" && !context.projectSessionId) throw new Error("内部 MCP 缺少项目会话绑定");
  const payload = Buffer.from(JSON.stringify(context), "utf-8").toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function openInternalMcpTaskContext(token = process.env.CCM_INTERNAL_MCP_CONTEXT || "") {
  const [payload, suppliedSignature] = String(token || "").split(".", 2);
  if (!payload || !suppliedSignature) throw new Error("内部 MCP 缺少签名任务上下文");
  const expected = signature(payload);
  const left = Buffer.from(suppliedSignature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) throw new Error("内部 MCP 任务上下文签名无效");
  const context = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as InternalMcpTaskContext;
  if (!["ccm-internal-mcp-task-context-v1", "ccm-internal-mcp-context-v2"].includes(String(context?.schema || ""))) throw new Error("内部 MCP 上下文版本无效");
  context.bindingKind = context.bindingKind || (context.projectSessionId ? "project_session" : "task");
  if (!context.project || !context.role) throw new Error("内部 MCP 上下文绑定不完整");
  if (context.bindingKind === "task" && !context.taskId) throw new Error("内部 MCP 任务绑定不完整");
  if (context.bindingKind === "project_session" && !context.projectSessionId) throw new Error("内部 MCP 项目会话绑定不完整");
  if (!Number.isFinite(Date.parse(context.expiresAt)) || Date.parse(context.expiresAt) <= Date.now()) throw new Error("内部 MCP 任务上下文已过期，请重新派发任务");
  return context;
}

export function buildInternalMcpServerConfig(entryFile: string, context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt">) {
  return {
    command: process.execPath,
    args: [entryFile],
    env: {
      CCM_INTERNAL_MCP_CONTEXT: sealInternalMcpTaskContext(context),
      CCM_INTERNAL_MCP_SECRET_FILE: path.resolve(String(process.env.CCM_INTERNAL_MCP_SECRET_FILE || SECRET_FILE)),
    },
  };
}

export function assertInternalMcpRole(context: InternalMcpTaskContext, roles: InternalMcpAgentRole[], action: string) {
  if (!roles.includes(context.role)) throw new Error(`${context.role} 无权执行内部 MCP 操作：${action}`);
}

function compactAuditArgs(value: any) {
  const result: Record<string, any> = {};
  for (const [key, item] of Object.entries(value && typeof value === "object" ? value : {})) {
    if (/(secret|token|password|authorization|credential|content|diff|patch)/i.test(key)) {
      result[key] = "[已隐藏]";
    } else if (Array.isArray(item)) {
      result[key] = { count: item.length };
    } else if (item && typeof item === "object") {
      result[key] = "[结构化参数]";
    } else {
      result[key] = String(item ?? "").slice(0, 180);
    }
  }
  return result;
}

function appendAudit(server: string, context: InternalMcpTaskContext, tool: string, args: any, status: "ok" | "error", error = "") {
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
    project_session_id: context.projectSessionId || "",
    project: context.project,
    role: context.role,
    task_agent_session_id: context.taskAgentSessionId || "",
    arguments: compactAuditArgs(args),
  })}\n`, "utf-8");
}

export function internalMcpTextResult(value: any, isError = false) {
  return { content: [{ type: "text", text: JSON.stringify(value) }], isError };
}

export function runInternalMcpServer(options: {
  name: string;
  version?: string;
  tools: InternalMcpToolDefinition[] | ((context: InternalMcpTaskContext) => InternalMcpToolDefinition[]);
  callTool: (context: InternalMcpTaskContext, name: string, args: any) => any | Promise<any>;
}) {
  let context: InternalMcpTaskContext;
  try {
    context = openInternalMcpTaskContext();
  } catch (error: any) {
    process.stderr.write(`${error?.message || error}\n`);
    process.exitCode = 2;
    return;
  }
  const allTools = typeof options.tools === "function" ? options.tools(context) : options.tools;
  const tools = allTools.filter(tool => !tool.roles?.length || tool.roles.includes(context.role));
  const toolNames = new Set(tools.map(tool => tool.name));
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  const reply = (id: any, result?: any, error?: any) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, ...(error ? { error } : { result }) })}\n`);
  input.on("line", line => {
    let message: any;
    try { message = JSON.parse(line); } catch { return; }
    if (message.id === undefined) return;
    void (async () => {
      try {
        if (message.method === "initialize") {
          return reply(message.id, { protocolVersion: "2024-11-05", capabilities: { tools: { listChanged: false } }, serverInfo: { name: options.name, version: options.version || "1.0.0" } });
        }
        if (message.method === "tools/list") return reply(message.id, { tools: tools.map(({ roles, ...tool }) => tool) });
        if (message.method === "tools/call") {
          const name = String(message.params?.name || "");
          const args = message.params?.arguments || {};
          if (!toolNames.has(name)) throw new Error(`当前角色无权调用工具：${name}`);
          try {
            const result = await options.callTool(context, name, args);
            appendAudit(options.name, context, name, args, "ok");
            return reply(message.id, Array.isArray(result?.content) ? result : internalMcpTextResult(result));
          } catch (error: any) {
            appendAudit(options.name, context, name, args, "error", error?.message || String(error));
            return reply(message.id, internalMcpTextResult({ success: false, error: error?.message || String(error) }, true));
          }
        }
        return reply(message.id, undefined, { code: -32601, message: `Method not found: ${message.method}` });
      } catch (error: any) {
        return reply(message.id, undefined, { code: -32000, message: error?.message || String(error) });
      }
    })();
  });
}
