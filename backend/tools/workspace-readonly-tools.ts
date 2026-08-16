import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import * as readline from "readline";
import { minimatch } from "minimatch";
import { getConfigs, getConfigInfo } from "../core/db";
import { getProjectRuntimeLogsAsync, getProjectRuntimeSnapshot } from "../modules/projects/project-runtime";
import { estimateTextTokens } from "../system/context-budget";
import { executeCodeIntelligenceTool, type CodeIntelligenceToolName } from "../system/code-intelligence";
import { inspectNotebook, isWebSearchAvailable, webFetch, webSearch } from "./web-notebook-tools";
import { recordEvidence } from "../system/unified-evidence-registry";
import { loadOrchestratorConfig } from "../modules/collaboration/group-orchestrator-config";
import { CC_ALIGNED_FILE_READ_MAX_TOKENS, CC_ALIGNED_GLOB_MAX_RESULTS, CC_ALIGNED_GREP_DEFAULT_HEAD_LIMIT, CC_ALIGNED_TOOL_RESULT_MAX_TOKENS } from "./cc-tool-result-limits";
import { readWorkspaceImage, readWorkspaceNotebook, readWorkspacePdf, transientWorkspaceBlocks } from "./workspace-read-media";
import { attachTransientModelBlocks } from "../system/transient-model-content";
import { runWorkspaceRipgrep, type WorkspaceSearchExecution, type WorkspaceSearchRunResult } from "./workspace-search-runtime";
import { WorkspaceReadContextLedger, type WorkspaceReadRange } from "./workspace-read-context";

const execFileAsync = promisify(execFile);
const SECRET_FILE = path.join(os.homedir(), ".cc-connect", "private", "main-agent-tool-capability-secret");
const EXCLUDED_DIRECTORIES = new Set([".git", "node_modules", "target", "dist", "build", "coverage", ".next", ".nuxt", ".output"]);
const SENSITIVE_NAMES = /(?:^|[-_.])(?:credentials?|secrets?|private[-_.]?key|access[-_.]?key|service[-_.]?account|firebase[-_.]?admin)(?:[-_.]|$)|^\.env(?:\.|$)|^\.(?:npmrc|pypirc|netrc)$|^id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$|\.(?:pem|p12|pfx|key|keystore|jks)$/i;
const RG_SENSITIVE_GLOBS = [
  "!**/.env", "!**/.env.*", "!**/.npmrc", "!**/.pypirc", "!**/.netrc",
  "!**/id_rsa", "!**/id_dsa", "!**/id_ecdsa", "!**/id_ed25519",
  "!**/*.{pem,p12,pfx,key,keystore,jks}", "!**/*credentials*", "!**/*secret*",
  "!**/*service-account*", "!**/*firebase-admin*",
];
const TEXT_FILE_LIMIT = 4 * 1024 * 1024;
const V3_TEXT_SCAN_LIMIT = 64 * 1024 * 1024;
const TOOL_RESULT_TOKEN_LIMIT = CC_ALIGNED_TOOL_RESULT_MAX_TOKENS;
const DIRECTORY_SCAN_LIMIT = 20_000;

function throwIfFileReadTokensExceeded(tokenCount: number, line?: number) {
  if (tokenCount <= CC_ALIGNED_FILE_READ_MAX_TOKENS) return;
  if (line) throw new Error(`第${line}行超过单次最大${CC_ALIGNED_FILE_READ_MAX_TOKENS} Token，未进行字符截断`);
  throw new Error(`文件内容（${tokenCount} Token）超过单次允许的 ${CC_ALIGNED_FILE_READ_MAX_TOKENS} Token。请使用 offset 和 limit 读取特定部分，或改用搜索。`);
}

function catNFileReadLine(lineNumber: number, text: string) {
  return `${String(lineNumber).padStart(6)}\t${text}`;
}

function fileReadContentTokens(rows: Array<{ line: number; text: string }>) {
  return estimateTextTokens(rows.map(row => catNFileReadLine(row.line, row.text)).join("\n"));
}

export type MainAgentScopeKind = "global" | "group" | "project";

export type ScopedToolCapabilityV1 = {
  schema: "ccm-scoped-tool-capability-v1";
  scope: MainAgentScopeKind;
  scopeId: string;
  exactSessionId: string;
  generation: number;
  allowedProjects: string[];
  issuedAt: string;
  expiresAt: string;
};

export type WorkspaceReadonlyToolDefinitionV2 = {
  name: string;
  canonicalName: string;
  server: "ccm__workspace_readonly";
  description: string;
  inputSchema: Record<string, any>;
  annotations: { readOnlyHint: true; destructiveHint: false; idempotentHint: true; ccmTrustedReadonly: true };
  loadPolicy: "base" | "search";
  checksum: string;
};

export type WorkspaceReadonlyToolDefinitionV3 = WorkspaceReadonlyToolDefinitionV2 & { toolContractVersion: 3 };
export type CcmWorkspaceToolEnvelopeV3 = {
  schema: "ccm-workspace-tool-envelope-v3";
  toolContractVersion: 3;
  modelPayload: unknown;
  safeReceipt: {
    kind: "text" | "image" | "pdf" | "notebook" | "glob" | "grep" | "unchanged";
    path?: string;
    checksum: string;
    itemCount?: number;
    lineCount?: number;
    pageCount?: number;
    truncated: boolean;
    contentStored: false;
  };
  contentStored: false;
};

export type WorkspaceReadonlyExecutionOptions = {
  signal?: AbortSignal;
  readContext?: WorkspaceReadContextLedger;
};

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result: any, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

function checksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(canonical(value ?? null))).digest("hex");
}

function ensureSecret() {
  fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
  if (!fs.existsSync(SECRET_FILE)) fs.writeFileSync(SECRET_FILE, crypto.randomBytes(32).toString("base64url"), { mode: 0o600 });
  const secret = fs.readFileSync(SECRET_FILE, "utf-8").trim();
  if (secret.length < 32) throw new Error("主 Agent工具能力密钥无效");
  return secret;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", ensureSecret()).update(payload).digest("base64url");
}

export function sealScopedToolCapability(input: Omit<ScopedToolCapabilityV1, "schema" | "issuedAt" | "expiresAt"> & Partial<Pick<ScopedToolCapabilityV1, "issuedAt" | "expiresAt">>) {
  const issuedAt = input.issuedAt || new Date().toISOString();
  const body: ScopedToolCapabilityV1 = {
    schema: "ccm-scoped-tool-capability-v1",
    scope: input.scope,
    scopeId: String(input.scopeId || ""),
    exactSessionId: String(input.exactSessionId || ""),
    generation: Math.max(0, Math.floor(Number(input.generation || 0))),
    allowedProjects: Array.from(new Set((input.allowedProjects || []).map(String).map(value => value.trim()).filter(Boolean))).sort(),
    issuedAt,
    expiresAt: input.expiresAt || new Date(Date.parse(issuedAt) + 30 * 60_000).toISOString(),
  };
  if (!body.scopeId || !body.exactSessionId) throw new Error("主 Agent工具能力缺少精确作用域或会话");
  const payload = Buffer.from(JSON.stringify(body), "utf-8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function openScopedToolCapability(token: string) {
  const [payload, supplied] = String(token || "").split(".", 2);
  if (!payload || !supplied) throw new Error("缺少主 Agent工具能力令牌");
  const expected = sign(payload);
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) throw new Error("主 Agent工具能力令牌签名无效");
  const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as ScopedToolCapabilityV1;
  if (body?.schema !== "ccm-scoped-tool-capability-v1" || !["global", "group", "project"].includes(body.scope)) throw new Error("主 Agent工具能力令牌版本无效");
  if (!Number.isFinite(Date.parse(body.expiresAt)) || Date.parse(body.expiresAt) <= Date.now()) throw new Error("主 Agent工具能力令牌已过期");
  return body;
}

const rawDefinitions: Array<Omit<WorkspaceReadonlyToolDefinitionV2, "canonicalName" | "server" | "annotations" | "checksum">> = [
  { name: "list_directory", loadPolicy: "base", description: "列出授权项目目录中的文件和子目录，结果分页返回。默认最多返回100项；未列完时再分页。当前作用域只有一个授权项目时可省略 project_id。", inputSchema: { type: "object", properties: { project_id: { type: "string", description: "当前作用域只有一个授权项目时可省略；多个项目时必须传入精确项目名。" }, path: { type: "string" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100 } } } },
  { name: "glob_files", loadPolicy: "base", description: "按Glob模式查找授权项目内文件，结果按修改时间排序。默认最多返回100个匹配；未读完时再分页。", inputSchema: { type: "object", required: ["pattern"], properties: { project_id: { type: "string" }, pattern: { type: "string" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100 } } } },
  { name: "grep_text", loadPolicy: "base", description: "使用ripgrep在授权项目源码中检索文本或正则表达式。未指定数量时默认返回250条；显式传0表示不限制。", inputSchema: { type: "object", required: ["pattern"], properties: { project_id: { type: "string" }, pattern: { type: "string" }, glob: { type: "string" }, mode: { enum: ["content", "files_with_matches", "count"] }, multiline: { type: "boolean" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 500 } } } },
  { name: "read_file", loadPolicy: "base", description: "读取授权项目内文件。默认从文件开头最多读取2000行；仅当文件过大无法一次读完时才提供offset和limit。当前上下文已持有相同内容时返回未变化。", inputSchema: { type: "object", required: ["path"], properties: { project_id: { type: "string" }, path: { type: "string" }, offset: { type: "integer", minimum: 1 }, limit: { type: "integer", minimum: 1, maximum: 2000 }, expected_checksum: { type: "string" } } } },
  { name: "inspect_notebook", loadPolicy: "search", description: "结构化检查Notebook元数据、单元格身份、源码校验值和输出类型；不返回单元格正文。", inputSchema: { type: "object", required: ["path"], properties: { project_id: { type: "string" }, path: { type: "string" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 200 } } } },
  { name: "web_fetch", loadPolicy: "search", description: "安全读取公开HTTPS网页、文本、JSON或PDF，并按 prompt 用模型摘要；逐次校验DNS和重定向并阻止私网、凭据URL和超限响应。prompt 必填，说明想从页面得到什么。未配置统一大模型时明确失败，不会静默返回整页原文。", inputSchema: { type: "object", required: ["url", "prompt"], properties: { project_id: { type: "string" }, url: { type: "string" }, prompt: { type: "string", description: "想从该页面得到什么" } } } },
  ...(isWebSearchAvailable() ? [{ name: "web_search", loadPolicy: "search" as const, description: "通过已配置的真实搜索Provider检索公开Web；未配置真实后端时本工具不会注册。", inputSchema: { type: "object", required: ["query"], properties: { project_id: { type: "string" }, query: { type: "string" }, count: { type: "integer", minimum: 1, maximum: 20 } } } }] : []),
  { name: "find_definition", loadPolicy: "search", description: "通过已配置语言服务查找符号定义；没有可靠语言服务时明确返回不可用。", inputSchema: { type: "object", required: ["symbol"], properties: { project_id: { type: "string" }, symbol: { type: "string" }, path: { type: "string" } } } },
  { name: "find_references", loadPolicy: "search", description: "通过已配置语言服务查找符号引用；没有可靠语言服务时明确返回不可用。", inputSchema: { type: "object", required: ["symbol"], properties: { project_id: { type: "string" }, symbol: { type: "string" }, path: { type: "string" } } } },
  { name: "workspace_symbols", loadPolicy: "search", description: "通过项目语义索引查询工作区符号，返回位置、类型、索引代次和代码状态，不返回源码正文。多语言项目可指定language_server_id。", inputSchema: { type: "object", properties: { project_id: { type: "string" }, query: { type: "string" }, language_server_id: { type: "string" }, language: { type: "string" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 500 } } } },
  { name: "document_symbols", loadPolicy: "search", description: "通过语言服务和增量索引查询指定源码文件中的符号。", inputSchema: { type: "object", required: ["path"], properties: { project_id: { type: "string" }, path: { type: "string" }, query: { type: "string" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 500 } } } },
  { name: "find_implementations", loadPolicy: "search", description: "通过语言服务定位接口、抽象成员或符号的真实实现。", inputSchema: { type: "object", required: ["symbol"], properties: { project_id: { type: "string" }, symbol: { type: "string" }, path: { type: "string" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 500 } } } },
  { name: "find_type_definition", loadPolicy: "search", description: "通过语言服务定位符号的类型定义。", inputSchema: { type: "object", required: ["symbol"], properties: { project_id: { type: "string" }, symbol: { type: "string" }, path: { type: "string" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 500 } } } },
  { name: "find_incoming_calls", loadPolicy: "search", description: "通过语言服务调用层级查询调用当前符号的函数或方法。", inputSchema: { type: "object", required: ["symbol"], properties: { project_id: { type: "string" }, symbol: { type: "string" }, path: { type: "string" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 500 } } } },
  { name: "find_outgoing_calls", loadPolicy: "search", description: "通过语言服务调用层级查询当前符号调用的函数或方法。", inputSchema: { type: "object", required: ["symbol"], properties: { project_id: { type: "string" }, symbol: { type: "string" }, path: { type: "string" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 500 } } } },
  { name: "read_code_diagnostics", loadPolicy: "search", description: "读取绑定索引代次与RepoStateIdentity的LSP诊断；源码变化后旧诊断不能作为强验收证据。", inputSchema: { type: "object", properties: { project_id: { type: "string" }, path: { type: "string" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 500 } } } },
  { name: "read_project_config", loadPolicy: "search", description: "读取授权项目的标准构建和运行配置文件。", inputSchema: { type: "object", properties: { project_id: { type: "string" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 50 } } } },
  { name: "read_git_status", loadPolicy: "search", description: "读取授权项目Git工作区状态。", inputSchema: { type: "object", properties: { project_id: { type: "string" } } } },
  { name: "read_git_diff", loadPolicy: "search", description: "读取授权项目Git差异，支持指定文件和暂存区。", inputSchema: { type: "object", properties: { project_id: { type: "string" }, path: { type: "string" }, staged: { type: "boolean" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 2000 } } } },
  { name: "read_git_history", loadPolicy: "search", description: "读取授权项目最近Git提交历史。", inputSchema: { type: "object", properties: { project_id: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100 } } } },
  { name: "read_runtime_status", loadPolicy: "search", description: "读取授权项目的运行配置、进程和构建状态。", inputSchema: { type: "object", properties: { project_id: { type: "string" } } } },
  { name: "read_runtime_logs", loadPolicy: "search", description: "读取授权项目精确运行配置的运行或构建日志。", inputSchema: { type: "object", required: ["profile_id"], properties: { project_id: { type: "string" }, profile_id: { type: "string" }, kind: { enum: ["run", "build"] }, lines: { type: "integer", minimum: 1, maximum: 2000 } } } },
];

const v3Schemas: Record<string, Record<string, any>> = {
  glob_files: {
    type: "object", required: ["pattern"], additionalProperties: false,
    properties: {
      project_id: { type: "string" }, pattern: { type: "string" }, path: { type: "string" },
      offset: { type: "integer", minimum: 0 }, limit: { type: "integer", minimum: 1, maximum: 100 },
      respect_gitignore: { type: "boolean" },
    },
  },
  grep_text: {
    type: "object", required: ["pattern"], additionalProperties: false,
    properties: {
      project_id: { type: "string" }, pattern: { type: "string" }, path: { type: "string" }, glob: { type: "string" },
      output_mode: { enum: ["content", "files_with_matches", "count"] }, mode: { enum: ["content", "files_with_matches", "count"] },
      "-B": { type: "integer", minimum: 0, maximum: 100 }, "-A": { type: "integer", minimum: 0, maximum: 100 },
      "-C": { type: "integer", minimum: 0, maximum: 100 }, context: { type: "integer", minimum: 0, maximum: 100 },
      "-n": { type: "boolean" }, "-i": { type: "boolean" }, type: { type: "string" },
      head_limit: { type: "integer", minimum: 0, maximum: 10000 }, offset: { type: "integer", minimum: 0 }, multiline: { type: "boolean" },
    },
  },
  read_file: {
    type: "object", required: ["path"], additionalProperties: false,
    properties: {
      project_id: { type: "string" }, path: { type: "string" }, offset: { type: "integer", minimum: 0 },
      limit: { type: "integer", minimum: 1, maximum: 2000 }, pages: { type: "string" },
      cell_offset: { type: "integer", minimum: 0 }, cell_limit: { type: "integer", minimum: 1, maximum: 200 },
      expected_checksum: { type: "string" },
    },
  },
};

const v3OnlyDefinitions: Array<Omit<WorkspaceReadonlyToolDefinitionV2, "canonicalName" | "server" | "annotations" | "checksum">> = [
  {
    name: "read_files",
    loadPolicy: "base",
    description: "一次读取最多20个授权项目内的普通文本文件。每个文件独立返回路径、行号、校验和和续读位置；图片、PDF和Notebook请使用read_file。",
    inputSchema: {
      type: "object", required: ["paths"], additionalProperties: false,
      properties: {
        project_id: { type: "string" },
        paths: {
          type: "array", minItems: 1, maxItems: 20,
          items: {
            oneOf: [
              { type: "string" },
              {
                type: "object", required: ["path"], additionalProperties: false,
                properties: {
                  path: { type: "string" }, offset: { type: "integer", minimum: 0 },
                  limit: { type: "integer", minimum: 1, maximum: 2000 },
                  expected_checksum: { type: "string" },
                },
              },
            ],
          },
        },
      },
    },
  },
];

export const WORKSPACE_READONLY_TOOL_DEFINITIONS_V2: WorkspaceReadonlyToolDefinitionV2[] = rawDefinitions.map(definition => {
  const body = {
    ...definition,
    canonicalName: `mcp__ccm__ccm_workspace_readonly__${definition.name}`,
    server: "ccm__workspace_readonly" as const,
    annotations: { readOnlyHint: true as const, destructiveHint: false as const, idempotentHint: true as const, ccmTrustedReadonly: true as const },
  };
  return { ...body, checksum: checksum(body) };
});

export const WORKSPACE_READONLY_TOOL_DEFINITIONS_V3: WorkspaceReadonlyToolDefinitionV3[] = [...rawDefinitions, ...v3OnlyDefinitions].map(definition => {
  const body = {
    ...definition,
    ...(v3Schemas[definition.name] ? { inputSchema: v3Schemas[definition.name] } : {}),
    canonicalName: `mcp__ccm__ccm_workspace_readonly__${definition.name}`,
    server: "ccm__workspace_readonly" as const,
    annotations: { readOnlyHint: true as const, destructiveHint: false as const, idempotentHint: true as const, ccmTrustedReadonly: true as const },
    toolContractVersion: 3 as const,
  };
  return { ...body, checksum: checksum(body) };
});

function activeProjects() {
  return getConfigs().map(config => String(config.name || "")).filter(Boolean);
}

function projectWorkDir(project: string) {
  const config = getConfigs().find(item => String(item.name || "") === project);
  if (!config) throw new Error(`项目不存在或未激活：${project}`);
  const row = getConfigInfo(config.path).find(item => String(item.name || "") === project) || getConfigInfo(config.path)[0];
  const workDir = String(row?.workDir || "").trim();
  if (!workDir || !fs.existsSync(workDir) || !fs.statSync(workDir).isDirectory()) throw new Error(`项目源码目录不可用：${project}`);
  return fs.realpathSync(workDir);
}

function allowedProjectsFor(capability: ScopedToolCapabilityV1) {
  if (capability.scope === "global" && !(capability.allowedProjects || []).length) return activeProjects();
  return (capability.allowedProjects || []).map(item => String(item || "").trim()).filter(Boolean);
}

function selectProject(capability: ScopedToolCapabilityV1, args: any) {
  const requested = String(args?.project_id || args?.projectId || "").trim();
  const allowed = allowedProjectsFor(capability);
  const project = capability.scope === "project"
    ? capability.scopeId
    : requested || (allowed.length === 1 ? allowed[0] : "");
  if (!project) {
    const error: any = new Error(allowed.length ? "当前工具需要指定精确project_id" : "当前作用域没有可读取的项目");
    error.code = allowed.length ? "PROJECT_ID_REQUIRED" : "NO_PROJECT_IN_SCOPE";
    error.availableProjects = allowed;
    throw error;
  }
  if (!allowed.includes(project)) throw new Error(`当前Agent作用域无权读取项目：${project}`);
  return { project, root: projectWorkDir(project) };
}

function normalizeRelative(value: any) {
  return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\/+/, "");
}

function assertNotSensitive(relative: string) {
  if (relative.split("/").some(part => SENSITIVE_NAMES.test(part))) throw new Error("敏感文件禁止读取");
}

type WorkspacePathSuggestion = { path: string; reason: "case_mismatch" | "similar_name" | "cwd_relative" };

function editDistance(leftValue: string, rightValue: string) {
  const left = leftValue.toLowerCase();
  const right = rightValue.toLowerCase();
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column];
      previous[column] = left[row - 1] === right[column - 1]
        ? diagonal
        : Math.min(previous[column - 1], above, diagonal) + 1;
      diagonal = above;
    }
  }
  return previous[right.length];
}

function suggestionCandidates(root: string, requestedValue: any): WorkspacePathSuggestion[] {
  const requested = normalizeRelative(requestedValue);
  if (!requested || path.isAbsolute(requested) || requested.split("/").includes("..") || requested.split("/").some(part => SENSITIVE_NAMES.test(part))) return [];
  const requestedBase = path.posix.basename(requested);
  const requestedParent = path.posix.dirname(requested) === "." ? "" : path.posix.dirname(requested);
  const requestedExtension = path.posix.extname(requestedBase).toLowerCase();
  const rows: string[] = [];
  const stack = [root];
  const realRoot = fs.realpathSync(root);
  while (stack.length && rows.length < 5_000) {
    const directory = stack.pop()!;
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (entry.isSymbolicLink() || SENSITIVE_NAMES.test(entry.name)) continue;
      if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name.toLowerCase())) continue;
      const absolute = path.join(directory, entry.name);
      const relative = normalizeRelative(path.relative(realRoot, absolute));
      if (!relative || relative.split("/").some(part => SENSITIVE_NAMES.test(part))) continue;
      rows.push(relative);
      if (entry.isDirectory()) stack.push(absolute);
      if (rows.length >= 5_000) break;
    }
  }
  return rows.map(candidate => {
    const candidateBase = path.posix.basename(candidate);
    const candidateParent = path.posix.dirname(candidate) === "." ? "" : path.posix.dirname(candidate);
    const caseMismatch = candidate.toLowerCase() === requested.toLowerCase() && candidate !== requested;
    const cwdRelative = candidateBase.toLowerCase() === requestedBase.toLowerCase() && candidateParent !== requestedParent;
    const reason: WorkspacePathSuggestion["reason"] = caseMismatch ? "case_mismatch" : cwdRelative ? "cwd_relative" : "similar_name";
    const extensionPenalty = requestedExtension && path.posix.extname(candidateBase).toLowerCase() !== requestedExtension ? 5 : 0;
    const parentPenalty = candidateParent === requestedParent ? 0 : Math.min(8, editDistance(candidateParent, requestedParent));
    const score = caseMismatch ? -100 : cwdRelative ? -20 + parentPenalty : editDistance(candidateBase, requestedBase) * 3 + parentPenalty + extensionPenalty;
    return { path: candidate, reason, score };
  }).filter(row => row.score <= Math.max(12, requestedBase.length))
    .sort((left, right) => left.score - right.score || left.path.localeCompare(right.path))
    .slice(0, 5)
    .map(({ path: suggestedPath, reason }) => ({ path: suggestedPath, reason }));
}

function workspacePathNotFound(root: string, requested: any): never {
  const suggestions = suggestionCandidates(root, requested);
  const detail = suggestions.length ? `；可能是：${suggestions.map(item => item.path).join("、")}` : "";
  const error: any = new Error(`文件或目录不存在：${normalizeRelative(requested) || "."}${detail}`);
  error.code = "PATH_NOT_FOUND";
  error.suggestions = suggestions;
  error.workspaceResult = { status: "error", code: "PATH_NOT_FOUND", path: normalizeRelative(requested), suggestions, contentStored: false };
  throw error;
}

function safePath(root: string, relativeValue: any, allowMissing = false) {
  const relative = normalizeRelative(relativeValue);
  if (path.isAbsolute(relative) || relative.split("/").includes("..")) throw new Error("路径越界或无效");
  assertNotSensitive(relative);
  const resolved = path.resolve(root, ...relative.split("/").filter(Boolean));
  let cursor = root;
  const segments = relative.split("/").filter(Boolean);
  const checkedSegments = allowMissing ? segments.slice(0, -1) : segments;
  for (const segment of checkedSegments) {
    cursor = path.join(cursor, segment);
    if (!fs.existsSync(cursor)) workspacePathNotFound(root, relative);
    if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error("不允许读取符号链接或Junction目标");
  }
  const parent = allowMissing ? path.dirname(resolved) : resolved;
  const realRoot = fs.realpathSync(root);
  let realTarget = "";
  try { realTarget = fs.realpathSync(parent); } catch (error: any) {
    if (error?.code === "ENOENT") workspacePathNotFound(root, relative);
    throw error;
  }
  const contained = path.relative(realRoot, realTarget);
  if (contained.startsWith("..") || path.isAbsolute(contained)) throw new Error("路径越过项目边界");
  if (!allowMissing) {
    const stat = fs.lstatSync(realTarget);
    if (stat.isSymbolicLink()) throw new Error("不允许读取符号链接或Junction目标");
  }
  return allowMissing ? resolved : realTarget;
}

function page<T>(rows: T[], cursorValue: any, limitValue: any, maxLimit = 500) {
  const offset = Math.max(0, Number.parseInt(String(cursorValue || "0"), 10) || 0);
  const fallback = Math.min(100, maxLimit);
  const limit = Math.max(1, Math.min(maxLimit, Number(limitValue || fallback) || fallback));
  const items = rows.slice(offset, offset + limit);
  return { items, total: rows.length, next_cursor: offset + items.length < rows.length ? String(offset + items.length) : "", truncated: offset + items.length < rows.length };
}

function globRegex(patternValue: any) {
  const pattern = normalizeRelative(patternValue || "**/*");
  if (!pattern || pattern.length > 500) throw new Error("Glob模式无效或过长");
  let source = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "*" && pattern[index + 1] === "*") {
      if (pattern[index + 2] === "/") { source += "(?:.*/)?"; index += 2; }
      else { source += ".*"; index += 1; }
    }
    else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else source += char.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
  }
  return new RegExp(`${source}$`, process.platform === "win32" ? "i" : "");
}

async function walk(root: string) {
  const files: string[] = [];
  const stack = [root];
  const realRoot = await fs.promises.realpath(root);
  while (stack.length && files.length < DIRECTORY_SCAN_LIMIT) {
    const directory = stack.pop()!;
    const entries = await fs.promises.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name.toLowerCase())) continue;
      const absolute = path.join(directory, entry.name);
      const relative = normalizeRelative(path.relative(realRoot, absolute));
      if (!relative || relative.split("/").some(part => SENSITIVE_NAMES.test(part))) continue;
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.isFile()) files.push(relative);
      if (files.length >= DIRECTORY_SCAN_LIMIT) break;
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

async function walkDetailed(root: string, relativeBase = "", options: { signal?: AbortSignal; deadline?: number } = {}) {
  const base = safePath(root, relativeBase || "");
  if (!(await fs.promises.lstat(base)).isDirectory()) throw new Error("Glob的path必须是目录");
  const rows: Array<{ path: string; relativeToBase: string; mtimeMs: number }> = [];
  const stack = [base];
  const realRoot = await fs.promises.realpath(root);
  let scanned = 0;
  let interrupted = false;
  while (stack.length && scanned < DIRECTORY_SCAN_LIMIT) {
    if (options.signal?.aborted || (options.deadline && Date.now() >= options.deadline)) { interrupted = true; break; }
    const directory = stack.pop()!;
    const entries = await fs.promises.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (options.signal?.aborted || (options.deadline && Date.now() >= options.deadline)) { interrupted = true; break; }
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name.toLowerCase())) continue;
      const absolute = path.join(directory, entry.name);
      const projectRelative = normalizeRelative(path.relative(realRoot, absolute));
      if (!projectRelative || projectRelative.split("/").some(part => SENSITIVE_NAMES.test(part))) continue;
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.isFile()) {
        scanned += 1;
        const stat = await fs.promises.stat(absolute);
        rows.push({ path: projectRelative, relativeToBase: normalizeRelative(path.relative(base, absolute)), mtimeMs: stat.mtimeMs });
      }
      if (scanned >= DIRECTORY_SCAN_LIMIT) break;
    }
  }
  return { rows, scanLimitReached: scanned >= DIRECTORY_SCAN_LIMIT || stack.length > 0, interrupted };
}

function pageOffset<T>(rows: T[], offsetValue: any, limitValue: any, defaultLimit: number) {
  const offset = Math.max(0, Number(offsetValue || 0) || 0);
  const limit = Math.max(1, Math.min(CC_ALIGNED_GLOB_MAX_RESULTS, Number(limitValue || defaultLimit) || defaultLimit));
  const items = rows.slice(offset, offset + limit);
  return { items, offset, limit, total: rows.length, next_cursor: offset + items.length < rows.length ? String(offset + items.length) : "", truncated: offset + items.length < rows.length };
}

async function globFilesV3(root: string, args: any, options: WorkspaceReadonlyExecutionOptions = {}) {
  const pattern = normalizeRelative(args?.pattern || "**/*");
  if (!pattern || pattern.length > 500) throw new Error("Glob模式无效或过长");
  const relativeBase = normalizeRelative(args?.path || "");
  const base = safePath(root, relativeBase || "");
  if (!(await fs.promises.lstat(base)).isDirectory()) throw new Error("Glob的path必须是目录");
  const target = normalizeRelative(path.relative(root, base)) || ".";
  const rgArgs = ["--files", "--hidden"];
  if (args?.respect_gitignore !== true) rgArgs.push("--no-ignore");
  for (const excluded of ["!.git/**", "!node_modules/**", "!target/**", "!dist/**", "!build/**", "!coverage/**", "!.next/**", "!.nuxt/**", "!.output/**", ...RG_SENSITIVE_GLOBS]) rgArgs.push("--glob", excluded);
  rgArgs.push(target);
  let fallbackWalked: Awaited<ReturnType<typeof walkDetailed>> | null = null;
  const search = await runWorkspaceRipgrep(rgArgs, root, {
    signal: options.signal,
    nodeFallback: async () => {
      const deadline = Date.now() + (process.env.WSL_DISTRO_NAME ? 60_000 : 20_000);
      fallbackWalked = await walkDetailed(root, relativeBase, { signal: options.signal, deadline });
      return {
        stdout: fallbackWalked.rows.map(row => row.path).join("\n"),
        engine: "node_fallback",
        timedOut: !options.signal?.aborted && fallbackWalked.interrupted,
        cancelled: options.signal?.aborted === true,
        partial: fallbackWalked.interrupted || fallbackWalked.scanLimitReached,
      };
    },
  });
  const paths = search.stdout.split(/\r?\n/).map(normalizeRelative).filter(Boolean).slice(0, DIRECTORY_SCAN_LIMIT);
  const rows: Array<{ path: string; relativeToBase: string; mtimeMs: number }> = [];
  for (const projectRelative of paths) {
    try {
      const absolute = safePath(root, projectRelative);
      const stat = await fs.promises.stat(absolute);
      if (stat.isFile()) rows.push({ path: projectRelative, relativeToBase: normalizeRelative(path.relative(base, absolute)), mtimeMs: stat.mtimeMs });
    } catch {}
  }
  const walked = { rows, scanLimitReached: paths.length >= DIRECTORY_SCAN_LIMIT || search.partial || fallbackWalked?.scanLimitReached === true };
  const ignorePatterns = args?.respect_gitignore === true ? rootIgnorePatterns(root) : [];
  const matches = walked.rows
    .filter(row => !ignorePatterns.length || !ignoredByRootGitignore(row.path, ignorePatterns))
    .filter(row => minimatch(row.relativeToBase, pattern, { dot: true, nocase: process.platform === "win32", matchBase: !pattern.includes("/") }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs || left.path.localeCompare(right.path));
  const selected = pageOffset(matches, args?.offset, args?.limit, CC_ALIGNED_GLOB_MAX_RESULTS);
  const items = selected.items.map(row => row.path);
  const value = {
    schema: "ccm-workspace-glob-result-v3", toolContractVersion: 3, pattern, path: relativeBase,
    items, filenames: items, numFiles: items.length, durationMs: 0,
    total: selected.total, offset: selected.offset, next_cursor: selected.next_cursor,
    truncated: selected.truncated || walked.scanLimitReached, scan_limit_reached: walked.scanLimitReached,
    status: search.partial ? "partial" : "read",
    searchExecution: { engine: search.engine, timedOut: search.timedOut, cancelled: search.cancelled, partial: search.partial },
  };
  return enforceResultBudget({ ...value, safeReceipt: { kind: "glob", checksum: checksum(value), itemCount: items.length, truncated: value.truncated, contentStored: false } });
}

function grepResultFiles(lines: string[]) {
  const files = new Set<string>();
  for (const line of lines) {
    const match = line.match(/^(.+?):(?:\d+:|-|\d+$)/);
    if (match?.[1]) files.add(normalizeRelative(match[1]));
  }
  return [...files];
}

const FALLBACK_TYPE_EXTENSIONS: Record<string, string[]> = {
  js: [".js", ".jsx", ".mjs", ".cjs"], ts: [".ts", ".tsx", ".mts", ".cts"], py: [".py"],
  rust: [".rs"], go: [".go"], java: [".java"], kotlin: [".kt", ".kts"], c: [".c", ".h"],
  cpp: [".cc", ".cpp", ".cxx", ".hpp", ".hh"], json: [".json", ".jsonc"], yaml: [".yaml", ".yml"],
  html: [".html", ".htm"], css: [".css", ".scss", ".sass", ".less"], md: [".md", ".mdx"], xml: [".xml"],
};

function rootIgnorePatterns(root: string) {
  try {
    return fs.readFileSync(path.join(root, ".gitignore"), "utf-8").split(/\r?\n/)
      .map(line => line.trim()).filter(line => line && !line.startsWith("#") && !line.startsWith("!"))
      .map(line => line.replace(/^\/+/, ""));
  } catch { return []; }
}

function ignoredByRootGitignore(relative: string, patterns: string[]) {
  return patterns.some(pattern => minimatch(relative, pattern, { dot: true, matchBase: !pattern.includes("/") })
    || minimatch(relative, `${pattern.replace(/\/$/, "")}/**`, { dot: true }));
}

async function grepTextNodeFallback(root: string, args: any, target: string, targetStat: fs.Stats, options: WorkspaceReadonlyExecutionOptions): Promise<WorkspaceSearchRunResult> {
  const startedAt = Date.now();
  const timeoutMs = process.env.WSL_DISTRO_NAME ? 60_000 : 20_000;
  const deadline = startedAt + timeoutMs;
  const mode = ["content", "files_with_matches", "count"].includes(String(args?.output_mode || args?.mode || ""))
    ? String(args.output_mode || args.mode) : "files_with_matches";
  const flags = `${args?.["-i"] === true ? "i" : ""}${args?.multiline === true ? "ms" : ""}g`;
  let expression: RegExp;
  try { expression = new RegExp(String(args?.pattern || ""), flags); } catch (error: any) { throw new Error(`无效正则表达式：${String(error?.message || error)}`); }
  const typeExtensions = args?.type ? FALLBACK_TYPE_EXTENSIONS[String(args.type).toLowerCase()] : undefined;
  if (args?.type && !typeExtensions) throw new Error(`未知文件类型：${String(args.type)}`);
  const ignorePatterns = rootIgnorePatterns(root);
  let candidates: string[] = [];
  let scanLimited = false;
  if (targetStat.isFile()) candidates = [normalizeRelative(path.relative(root, target))];
  else {
    const relativeBase = normalizeRelative(path.relative(root, target));
    const walked = await walkDetailed(root, relativeBase === "." ? "" : relativeBase, { signal: options.signal, deadline });
    candidates = walked.rows.map(row => row.path);
    scanLimited = walked.scanLimitReached || walked.interrupted;
  }
  candidates = candidates.filter(file => {
    if (typeExtensions && !typeExtensions.includes(path.extname(file).toLowerCase())) return false;
    if (args?.glob && !minimatch(file, String(args.glob), { dot: true, matchBase: !String(args.glob).includes("/") })) return false;
    return targetStat.isFile() || !ignoredByRootGitignore(file, ignorePatterns);
  });
  const output: string[] = [];
  let interrupted = false;
  for (const relative of candidates) {
    if (options.signal?.aborted || Date.now() >= deadline) { interrupted = true; break; }
    const absolute = path.join(root, ...relative.split("/"));
    let source: Buffer;
    try { source = await fs.promises.readFile(absolute); } catch { continue; }
    if (source.length > V3_TEXT_SCAN_LIMIT || source.subarray(0, Math.min(8192, source.length)).includes(0)) continue;
    const text = source.toString("utf-8");
    expression.lastIndex = 0;
    if (args?.multiline === true) {
      const matches = [...text.matchAll(expression)];
      if (!matches.length) continue;
      if (mode === "files_with_matches") output.push(relative);
      else if (mode === "count") output.push(`${relative}:${matches.length}`);
      else for (const match of matches) {
        const line = text.slice(0, Number(match.index || 0)).split(/\r?\n/).length;
        output.push(`${relative}:${line}:${String(match[0] || "").replace(/\s+/g, " ").slice(0, 500)}`);
      }
      continue;
    }
    const lines = text.split(/\r?\n/);
    const matching: number[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      expression.lastIndex = 0;
      if (expression.test(lines[index])) matching.push(index);
    }
    if (!matching.length) continue;
    if (mode === "files_with_matches") output.push(relative);
    else if (mode === "count") output.push(`${relative}:${matching.length}`);
    else {
      const before = Math.max(0, Number(args?.context ?? args?.["-C"] ?? args?.["-B"] ?? 0) || 0);
      const after = Math.max(0, Number(args?.context ?? args?.["-C"] ?? args?.["-A"] ?? 0) || 0);
      const selectedLines = new Set<number>();
      for (const index of matching) for (let row = Math.max(0, index - before); row <= Math.min(lines.length - 1, index + after); row += 1) selectedLines.add(row);
      for (const index of [...selectedLines].sort((left, right) => left - right)) output.push(`${relative}:${index + 1}:${lines[index].slice(0, 500)}`);
    }
    if (Buffer.byteLength(output.join("\n"), "utf-8") >= 20 * 1024 * 1024) { interrupted = true; break; }
  }
  const cancelled = options.signal?.aborted === true;
  const timedOut = !cancelled && Date.now() >= deadline;
  return { stdout: output.join("\n"), engine: "node_fallback", timedOut, cancelled, partial: interrupted || scanLimited };
}

async function grepTextV3(root: string, args: any, options: WorkspaceReadonlyExecutionOptions = {}) {
  const pattern = String(args?.pattern || "");
  if (!pattern || pattern.length > 1000) throw new Error("检索表达式为空或过长");
  const modeValue = String(args?.output_mode || args?.mode || "files_with_matches");
  const mode = ["content", "files_with_matches", "count"].includes(modeValue) ? modeValue : "files_with_matches";
  const targetPath = args?.path === undefined || args?.path === "" ? "." : normalizeRelative(args.path);
  const target = targetPath === "." ? root : safePath(root, targetPath);
  const targetStat = await fs.promises.lstat(target);
  if (!targetStat.isDirectory() && !targetStat.isFile()) throw new Error("Grep的path必须是文件或目录");
  const relativeTarget = normalizeRelative(path.relative(root, target)) || ".";
  const rgArgs = ["--no-heading", "--color", "never", "--hidden", "--max-columns", "500", "--max-columns-preview"];
  if (mode === "files_with_matches") rgArgs.push("--files-with-matches");
  else if (mode === "count") rgArgs.push("--count");
  else if (args?.["-n"] !== false) rgArgs.push("--line-number");
  if (args?.["-i"] === true) rgArgs.push("--ignore-case");
  if (args?.multiline === true) rgArgs.push("-U", "--multiline-dotall");
  if (args?.type) rgArgs.push("--type", String(args.type));
  if (args?.glob) rgArgs.push("--glob", String(args.glob));
  if (mode === "content") {
    const context = args?.context ?? args?.["-C"];
    if (context !== undefined) rgArgs.push("-C", String(Math.max(0, Number(context) || 0)));
    else {
      if (args?.["-B"] !== undefined) rgArgs.push("-B", String(Math.max(0, Number(args["-B"]) || 0)));
      if (args?.["-A"] !== undefined) rgArgs.push("-A", String(Math.max(0, Number(args["-A"]) || 0)));
    }
  }
  if (targetStat.isFile()) rgArgs.push("--no-ignore");
  for (const excluded of ["!.git/**", "!.svn/**", "!.hg/**", "!.bzr/**", "!.jj/**", "!.sl/**", "!node_modules/**", "!target/**", "!dist/**", "!build/**", ...RG_SENSITIVE_GLOBS]) rgArgs.push("--glob", excluded);
  rgArgs.push("-e", pattern, relativeTarget);
  const search = await runWorkspaceRipgrep(rgArgs, root, {
    signal: options.signal,
    nodeFallback: () => grepTextNodeFallback(root, args, target, targetStat, options),
  });
  const output = search.stdout;
  const allLines = output ? output.replace(/\r?\n$/, "").split(/\r?\n/) : [];
  const offset = Math.max(0, Number(args?.offset || 0) || 0);
  const requestedLimit = args?.head_limit === 0 ? Math.max(1, allLines.length || 1) : Math.max(1, Math.min(10_000, Number(args?.head_limit ?? CC_ALIGNED_GREP_DEFAULT_HEAD_LIMIT) || CC_ALIGNED_GREP_DEFAULT_HEAD_LIMIT));
  const selected = allLines.slice(offset, offset + requestedLimit);
  const truncated = offset + selected.length < allLines.length || search.partial;
  const filenames = mode === "files_with_matches" ? selected.map(normalizeRelative).filter(Boolean) : grepResultFiles(allLines);
  const numMatches = mode === "count" ? allLines.reduce((sum, line) => sum + Number(line.match(/:(\d+)$/)?.[1] || 0), 0) : undefined;
  const value = {
    schema: "ccm-workspace-grep-result-v3", toolContractVersion: 3, pattern, path: targetPath, mode,
    filenames, numFiles: filenames.length, content: mode === "files_with_matches" ? undefined : selected.join("\n"),
    lines: selected, numLines: mode === "content" ? selected.length : undefined, numMatches,
    appliedLimit: truncated ? requestedLimit : undefined, appliedOffset: offset || undefined,
    next_cursor: truncated ? String(offset + selected.length) : "", truncated,
    status: search.partial ? "partial" : "read",
    searchExecution: { engine: search.engine, timedOut: search.timedOut, cancelled: search.cancelled, partial: search.partial },
  };
  return enforceResultBudget({ ...value, safeReceipt: { kind: "grep", checksum: checksum(value), itemCount: selected.length, truncated, contentStored: false } });
}

async function runCommand(command: string, args: string[], cwd: string, timeout = 10_000) {
  try {
    const result = await execFileAsync(command, args, { cwd, timeout, windowsHide: true, encoding: "utf-8", maxBuffer: 2 * 1024 * 1024 });
    return String(result.stdout || "");
  } catch (error: any) {
    if (error?.code === 1 && command === "rg") return String(error.stdout || "");
    throw new Error(String(error?.stderr || error?.message || error).trim().slice(0, 1_000));
  }
}

function pageLines(text: string, cursorValue: any, limitValue: any, maxLimit = 2000) {
  const lines = String(text || "").split(/\r?\n/);
  const offset = Math.max(0, Number.parseInt(String(cursorValue || "0"), 10) || 0);
  const limit = Math.max(1, Math.min(maxLimit, Number(limitValue || 300) || 300));
  const selected = lines.slice(offset, offset + limit);
  return { lines: selected, total_lines: lines.length, next_cursor: offset + selected.length < lines.length ? String(offset + selected.length) : "", truncated: offset + selected.length < lines.length };
}

function enforceResultBudget(value: any, limit = TOOL_RESULT_TOKEN_LIMIT) {
  const tokens = estimateTextTokens(JSON.stringify(value));
  if (tokens > limit) throw new Error(`工具结果超过${limit} Token，请缩小范围或使用cursor继续读取`);
  return { ...value, output_tokens: tokens, result_checksum: checksum(value) };
}

async function readFileTool(root: string, args: any) {
  const file = safePath(root, args?.path);
  const stat = await fs.promises.lstat(file);
  if (!stat.isFile() || stat.size > TEXT_FILE_LIMIT) throw new Error("仅允许读取4MB以内的普通文件");
  const extension = path.extname(file).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf"].includes(extension)) throw new Error("该文件需要通过安全附件/视觉读取链处理，当前文本工具不会伪造读取结果");
  let text = await fs.promises.readFile(file, "utf-8");
  if (extension === ".ipynb") {
    try {
      const notebook = JSON.parse(text);
      text = (Array.isArray(notebook?.cells) ? notebook.cells : []).map((cell: any, index: number) => `# Cell ${index + 1} (${cell?.cell_type || "unknown"})\n${Array.isArray(cell?.source) ? cell.source.join("") : ""}`).join("\n\n");
    } catch { throw new Error("Notebook格式无效"); }
  }
  const lines = text.split(/\r?\n/);
  const offset = Math.max(1, Number(args?.offset || 1) || 1);
  const limit = Math.max(1, Math.min(2000, Number(args?.limit || 2000) || 2000));
  const selected: Array<{ line: number; text: string }> = [];
  let used = 0;
  for (let index = offset - 1; index < lines.length && selected.length < limit; index += 1) {
    const row = { line: index + 1, text: lines[index] };
    const rowTokens = estimateTextTokens(catNFileReadLine(row.line, row.text));
    throwIfFileReadTokensExceeded(rowTokens, index + 1);
    used += rowTokens;
    throwIfFileReadTokensExceeded(used);
    selected.push(row);
  }
  const nextLine = selected.length ? selected[selected.length - 1].line + 1 : offset;
  throwIfFileReadTokensExceeded(fileReadContentTokens(selected));
  return enforceResultBudget({ path: normalizeRelative(path.relative(root, file)), checksum: checksum(text), total_lines: lines.length, offset, lines: selected, next_cursor: nextLine <= lines.length ? String(nextLine) : "", truncated: nextLine <= lines.length });
}

async function readFileToolV3(root: string, args: any) {
  const file = safePath(root, args?.path);
  const stat = await fs.promises.lstat(file);
  if (!stat.isFile()) throw new Error("目标不是文件");
  const relativePath = normalizeRelative(path.relative(root, file));
  const extension = path.extname(file).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(extension)) return readWorkspaceImage(file, relativePath);
  if (extension === ".pdf") return readWorkspacePdf(file, relativePath, args?.pages);
  if (extension === ".ipynb") return readWorkspaceNotebook(file, relativePath, args);
  if (stat.size > V3_TEXT_SCAN_LIMIT) throw new Error("普通文本文件超过64MB安全扫描上限，请先缩小目标文件");
  const sampleHandle = await fs.promises.open(file, "r");
  const sample = Buffer.alloc(Math.min(8192, stat.size));
  try { await sampleHandle.read(sample, 0, sample.length, 0); } finally { await sampleHandle.close(); }
  if (sample.includes(0)) throw new Error("二进制文件不能作为普通文本读取");
  const requestedOffset = Number(args?.offset ?? 1);
  const offset = requestedOffset <= 1 ? 1 : Math.floor(requestedOffset);
  const limit = Math.max(1, Math.min(2000, Number(args?.limit || 2000) || 2000));
  const selected: Array<{ line: number; text: string }> = [];
  let used = 0;
  let requestedRangeLines = 0;
  let totalLines = 0;
  const contentHash = crypto.createHash("sha256");
  const stream = fs.createReadStream(file);
  stream.on("data", chunk => contentHash.update(chunk));
  const reader = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of reader) {
      totalLines += 1;
      if (totalLines < offset || requestedRangeLines >= limit) continue;
      requestedRangeLines += 1;
      const row = { line: totalLines, text: line };
      const rowTokens = estimateTextTokens(catNFileReadLine(row.line, row.text));
      throwIfFileReadTokensExceeded(rowTokens, totalLines);
      used += rowTokens;
      throwIfFileReadTokensExceeded(used);
      selected.push(row);
    }
  } finally {
    reader.close();
    stream.destroy();
  }
  const fileChecksum = contentHash.digest("hex");
  const pastEof = offset > totalLines;
  const nextLine = selected.length ? selected[selected.length - 1].line + 1 : offset;
  const truncated = nextLine <= totalLines;
  const result = {
    schema: "ccm-workspace-read-result-v3", toolContractVersion: 3, type: "text", path: relativePath,
    checksum: fileChecksum, total_lines: totalLines, offset, lines: selected,
    empty: stat.size === 0, past_eof: pastEof, next_cursor: truncated ? String(nextLine) : "", truncated,
    partial_notice: truncated ? "文件内容较长，已返回当前范围；请使用next_cursor和checksum继续读取。" : "",
  };
  throwIfFileReadTokensExceeded(fileReadContentTokens(selected));
  return enforceResultBudget({ ...result, safeReceipt: { kind: "text", path: relativePath, checksum: result.checksum, lineCount: selected.length, truncated, contentStored: false } });
}

function workspaceReadRange(args: any): WorkspaceReadRange {
  const requestedOffset = Number(args?.offset ?? 1);
  return {
    // V3 intentionally treats offset 0 and 1 as the same first-line range.
    // Normalizing here lets the context ledger deduplicate both spellings.
    offset: requestedOffset <= 1 ? 1 : Math.floor(requestedOffset),
    limit: Math.max(1, Math.min(2000, Number(args?.limit || 2000) || 2000)),
    pages: String(args?.pages || ""),
    cellOffset: Math.max(0, Number(args?.cell_offset || 0) || 0),
    cellLimit: Math.max(1, Math.min(200, Number(args?.cell_limit || 200) || 200)),
    tokenBudget: CC_ALIGNED_FILE_READ_MAX_TOKENS,
  };
}

function fileChangedError(relativePath: string, expected: string, actual: string): never {
  const error: any = new Error(`文件内容已变化，请从权威版本重新读取：${relativePath}`);
  error.code = "FILE_CHANGED";
  error.workspaceResult = {
    status: "error", code: "FILE_CHANGED", path: relativePath,
    expectedChecksum: expected, currentChecksum: actual, contentStored: false,
  };
  throw error;
}

function decorateWorkspaceReadResult(result: any, args: any) {
  const nextOffset = Math.max(0, Number(result?.next_cursor || result?.nextCursor || 0));
  const total = Math.max(0, Number(result?.total_lines || result?.total_cells || result?.total_pages || 0));
  const currentEnd = Array.isArray(result?.lines) ? Number(result.lines.at(-1)?.line || result?.offset || 0)
    : Array.isArray(result?.cells) ? Number(result?.offset || 0) + result.cells.length
      : Array.isArray(result?.selected_pages) ? Number(result.selected_pages.at(-1) || 0) : 0;
  const expected = String(args?.expected_checksum || args?.expectedChecksum || "").trim();
  const actual = String(result?.checksum || result?.safeReceipt?.checksum || "").trim();
  if (expected && actual && expected !== actual) fileChangedError(String(result?.path || args?.path || "文件"), expected, actual);
  return {
    ...result,
    status: result?.truncated === true ? "partial" : "read",
    ...(nextOffset > 0 ? {
      continuation: {
        path: String(result?.path || args?.path || ""), nextOffset, checksum: actual,
        ...(total > 0 ? { remainingLines: Math.max(0, total - currentEnd) } : {}),
      },
    } : {}),
  };
}

async function readFileToolV3WithContext(root: string, project: string, args: any, context?: WorkspaceReadContextLedger) {
  const file = safePath(root, args?.path);
  const relativePath = normalizeRelative(path.relative(root, file));
  const range = workspaceReadRange(args);
  const stat = await fs.promises.lstat(file);
  const cached = context?.lookup(project, relativePath, range, stat);
  if (cached) {
    const expected = String(args?.expected_checksum || args?.expectedChecksum || "").trim();
    if (expected && expected !== cached.checksum) fileChangedError(relativePath, expected, cached.checksum);
    const value = {
      schema: "ccm-workspace-read-result-v3", toolContractVersion: 3, type: "file_unchanged",
      status: "unchanged", path: relativePath, checksum: cached.checksum,
      offset: cached.from || range.offset || 1, total_lines: cached.totalLines || 0,
      next_cursor: cached.nextOffset ? String(cached.nextOffset) : "", truncated: Boolean(cached.nextOffset),
      ...(cached.nextOffset ? { continuation: { path: relativePath, nextOffset: cached.nextOffset, checksum: cached.checksum, ...(cached.totalLines ? { remainingLines: Math.max(0, cached.totalLines - Number(cached.to || 0)) } : {}) } } : {}),
      safeReceipt: { kind: "unchanged", path: relativePath, checksum: cached.checksum, lineCount: 0, truncated: Boolean(cached.nextOffset), contentStored: false },
    };
    return enforceResultBudget(value, range.tokenBudget);
  }
  const inFlight = context?.inFlightFor(project, relativePath, range);
  if (inFlight) {
    await inFlight;
    return readFileToolV3WithContext(root, project, args, context);
  }
  const reading = readFileToolV3(root, args).then(result => decorateWorkspaceReadResult(result, args));
  context?.setInFlight(project, relativePath, range, reading);
  const result: any = await reading;
  const finalStat = await fs.promises.lstat(file);
  context?.record({
    project, path: relativePath, range, checksum: String(result?.checksum || result?.safeReceipt?.checksum || ""),
    mtimeMs: finalStat.mtimeMs, size: finalStat.size,
    totalLines: Number(result?.total_lines || result?.total_cells || result?.total_pages || 0),
    from: Array.isArray(result?.lines) ? Number(result.lines[0]?.line || result?.offset || 1) : Number(result?.offset || 0),
    to: Array.isArray(result?.lines) ? Number(result.lines.at(-1)?.line || result?.offset || 1)
      : Array.isArray(result?.cells) ? Number(result?.offset || 0) + result.cells.length : 0,
    nextOffset: Math.max(0, Number(result?.next_cursor || result?.nextCursor || 0)) || undefined,
  });
  return result;
}

async function readFilesToolV3(root: string, project: string, args: any, context?: WorkspaceReadContextLedger) {
  const requested = Array.isArray(args?.paths) ? args.paths : [];
  if (!requested.length || requested.length > 20) throw new Error("paths必须包含1到20个文件");
  const normalized = requested.map((item: any) => typeof item === "string" ? { path: item } : { ...(item || {}) });
  for (const item of normalized) delete item.token_budget;
  const seen = new Set<string>();
  for (const item of normalized) {
    const key = normalizeRelative(String(item?.path || ""));
    if (!key) throw new Error("批量读取包含空文件路径");
    if (seen.has(key)) throw new Error(`批量读取包含重复文件：${key}`);
    seen.add(key);
    if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".ipynb"].includes(path.extname(key).toLowerCase())) {
      throw new Error(`批量读取仅支持普通文本文件；${key}请使用read_file`);
    }
  }
  const files: any[] = [];
  for (let index = 0; index < normalized.length; index += 1) {
    const item = normalized[index];
    try {
      const result: any = await readFileToolV3WithContext(root, project, item, context);
      files.push(result);
    } catch (error: any) {
      const relativePath = normalizeRelative(item?.path || "");
      const structured = error?.workspaceResult && typeof error.workspaceResult === "object" ? error.workspaceResult : null;
      const safeMessage = String(error?.message || "文件读取失败")
        .replaceAll(root, "[项目目录]")
        .replaceAll(root.replace(/\\/g, "/"), "[项目目录]")
        .slice(0, 500);
      const errorChecksum = checksum({ path: relativePath, code: structured?.code || error?.code || "READ_FAILED", message: safeMessage });
      files.push({
        schema: "ccm-workspace-read-result-v3", toolContractVersion: 3, type: "text_error",
        status: "failed", path: relativePath, code: String(structured?.code || error?.code || "READ_FAILED"),
        error: safeMessage, ...(Array.isArray(structured?.suggestions) ? { suggestions: structured.suggestions } : {}),
        lines: [], total_lines: 0, next_cursor: "", truncated: false, checksum: errorChecksum,
        safeReceipt: { kind: "text", path: relativePath, checksum: errorChecksum, lineCount: 0, truncated: false, contentStored: false },
      });
    }
  }
  const failedCount = files.filter(file => file?.status === "failed").length;
  const readCount = files.length - failedCount;
  const aggregate = {
    schema: "ccm-workspace-read-files-result-v3", toolContractVersion: 3, type: "text_batch",
    files, item_count: normalized.length, read_count: readCount, failed_count: failedCount,
    line_count: files.reduce((sum, file) => sum + Number(file?.lines?.length || 0), 0),
    truncated: files.some(file => file?.truncated === true),
    status: failedCount === files.length ? "failed"
      : failedCount > 0 || files.some(file => file?.status === "partial") ? "partial"
        : files.every(file => file?.status === "unchanged") ? "unchanged" : "read",
  };
  const resultChecksum = checksum(files.map(file => ({ path: file.path, checksum: file.checksum, offset: file.offset, next_cursor: file.next_cursor })));
  const payload = {
    ...aggregate,
    safeReceipt: { kind: "text", checksum: resultChecksum, itemCount: normalized.length, lineCount: aggregate.line_count, truncated: aggregate.truncated, contentStored: false },
    contentStored: false,
  };
  if (failedCount === files.length) {
    const error: any = new Error(`批量读取失败：${failedCount}个文件均无法读取`);
    error.code = "BATCH_READ_FAILED";
    error.workspaceResult = { ...payload, code: error.code };
    throw error;
  }
  return enforceResultBudget(payload, CC_ALIGNED_TOOL_RESULT_MAX_TOKENS);
}

async function executeWorkspaceReadonlyToolWithCapabilityRaw(toolName: string, args: any, capability: ScopedToolCapabilityV1, contractVersion: 2 | 3 = 2, options: WorkspaceReadonlyExecutionOptions = {}) {
  const alias: Record<string, string> = { read_project_source: "read_project_config", read_runtime_diagnostics: "read_runtime_status" };
  const name = alias[String(toolName || "")] || String(toolName || "").replace(/^mcp__ccm__ccm_workspace_readonly__/, "");
  const definitions = contractVersion === 3 ? WORKSPACE_READONLY_TOOL_DEFINITIONS_V3 : WORKSPACE_READONLY_TOOL_DEFINITIONS_V2;
  if (!definitions.some(tool => tool.name === name)) throw new Error(`未知只读工作区工具：${name}`);
  let project = "";
  let root = "";
  try {
    ({ project, root } = selectProject(capability, args || {}));
  } catch (error: any) {
    if (error?.code === "PROJECT_ID_REQUIRED") {
      return {
        schema: "ccm-workspace-project-required-v1",
        status: "needs_project_id",
        available_projects: Array.isArray(error.availableProjects) ? error.availableProjects : [],
        message: "当前作用域有多个授权项目。请在本次调用传入精确 project_id；若用户尚未指定，使用 ccm_ask_user 提供选项让用户选择。",
      };
    }
    throw error;
  }
  if (name === "list_directory") {
    const directory = safePath(root, args?.path || "");
    const stat = await fs.promises.lstat(directory);
    if (!stat.isDirectory()) throw new Error("目标不是目录");
    const entries = (await fs.promises.readdir(directory, { withFileTypes: true }))
      .filter(entry => !entry.isSymbolicLink() && !EXCLUDED_DIRECTORIES.has(entry.name.toLowerCase()) && !SENSITIVE_NAMES.test(entry.name))
      .map(entry => ({ name: entry.name, path: normalizeRelative(path.relative(root, path.join(directory, entry.name))), type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other" }))
      .sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name));
    return enforceResultBudget({ project, path: normalizeRelative(args?.path || ""), ...page(entries, args?.cursor, args?.limit, CC_ALIGNED_GLOB_MAX_RESULTS) });
  }
  if (name === "glob_files") {
    if (contractVersion === 3) return { project, ...(await globFilesV3(root, args, options)) };
    const matcher = globRegex(args?.pattern);
    const matches = (await walk(root)).filter(file => matcher.test(file));
    return enforceResultBudget({ project, pattern: String(args?.pattern || ""), ...page(matches, args?.cursor, args?.limit, CC_ALIGNED_GLOB_MAX_RESULTS), scan_limit_reached: matches.length >= DIRECTORY_SCAN_LIMIT });
  }
  if (name === "grep_text") {
    if (contractVersion === 3) return { project, ...(await grepTextV3(root, args, options)) };
    const pattern = String(args?.pattern || "");
    if (!pattern || pattern.length > 1000) throw new Error("检索表达式为空或过长");
    const mode = ["content", "files_with_matches", "count"].includes(String(args?.mode || "")) ? String(args.mode) : "content";
    const rgArgs = ["--no-heading", "--color", "never", "--line-number", "--hidden"];
    if (mode === "files_with_matches") rgArgs.push("--files-with-matches");
    if (mode === "count") rgArgs.push("--count");
    if (args?.multiline === true) rgArgs.push("--multiline");
    if (args?.glob) rgArgs.push("--glob", String(args.glob));
    for (const excluded of ["!.git/**", "!node_modules/**", "!target/**", "!dist/**", "!build/**", ...RG_SENSITIVE_GLOBS]) rgArgs.push("--glob", excluded);
    rgArgs.push("--", pattern, ".");
    const output = await runCommand("rg", rgArgs, root, 15_000);
    return enforceResultBudget({ project, pattern, mode, ...pageLines(output, args?.cursor, args?.limit, 500) });
  }
  if (name === "read_file") {
    const result = await (contractVersion === 3 ? readFileToolV3WithContext(root, project, args, options.readContext) : readFileTool(root, args));
    return attachTransientModelBlocks({ project, ...result }, transientWorkspaceBlocks(result));
  }
  if (name === "read_files") {
    const result = await readFilesToolV3(root, project, args, options.readContext);
    return { project, ...result };
  }
  if (["inspect_notebook", "web_fetch", "web_search"].includes(name)) {
    const featureConfig = loadOrchestratorConfig();
    if (name === "inspect_notebook") {
      if (featureConfig.notebookToolsEnabled === false) throw new Error("capability_unavailable: Notebook工具已关闭");
      return enforceResultBudget({ project, ...inspectNotebook(root, args) });
    }
    if (featureConfig.webToolsEnabled === false) throw new Error("capability_unavailable: Web工具已关闭");
    if (name === "web_fetch") return enforceResultBudget({ project, ...(await webFetch(args, featureConfig.webFetchBrowserFallbackEnabled !== false)) });
    return enforceResultBudget({ project, ...(await webSearch({ ...args, provider_order: args?.provider_order || featureConfig.webSearchProviderOrder })) });
  }
  if (["workspace_symbols", "document_symbols", "find_definition", "find_references", "find_implementations", "find_type_definition", "find_incoming_calls", "find_outgoing_calls", "read_code_diagnostics"].includes(name)) {
    try {
      const featureConfig = loadOrchestratorConfig();
      if (featureConfig.codeIntelligenceEnabled === false) throw new Error("capability_unavailable: 代码智能已关闭");
      const result: any = await executeCodeIntelligenceTool(project, name as CodeIntelligenceToolName, args);
      const evidence = recordEvidence({
        evidenceType: name === "read_code_diagnostics" ? "test" : "source",
        taskId: String(capability.scope === "project" ? capability.scopeId : ""),
        workItemId: String(args?.work_item_id || ""),
        scope: capability.scope,
        scopeId: capability.scopeId,
        exactSessionId: capability.exactSessionId,
        generation: capability.generation,
        attempt: Math.max(1, Number(args?.attempt || 1)),
        repoStateIdentity: result.repoStateIdentity,
        producerAgentId: "ccm-code-intelligence",
        status: "valid",
        subject: name,
        references: result.locations.map((item: any) => item.path),
        summary: `${result.locations.length} semantic locations at index generation ${result.indexGeneration}`,
        sourceChecksum: result.resultChecksum,
      });
      result.evidenceId = evidence.evidenceId;
      result.resultChecksum = checksum({ ...result, resultChecksum: undefined });
      return enforceResultBudget(result);
    } catch (error: any) {
      const reason = String(error?.message || error);
      if (/capability_unavailable/i.test(reason)) return enforceResultBudget({ project, success: false, state: "capability_unavailable", tool: name, symbol: String(args?.symbol || ""), reason });
      throw error;
    }
  }
  if (name === "read_project_config") {
    const names = new Set(["package.json", "pnpm-workspace.yaml", "yarn.lock", "package-lock.json", "bun.lockb", "pom.xml", "build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts", "go.mod", "cargo.toml", "pyproject.toml", "requirements.txt", "docker-compose.yml", "docker-compose.yaml", "Dockerfile"]);
    const files = (await walk(root)).filter(file => names.has(path.posix.basename(file)) || /^\.github\/workflows\/.+\.ya?ml$/i.test(file));
    const selected = page(files, args?.cursor, Math.min(20, Number(args?.limit || 20)));
    const configs = [];
    for (const file of selected.items) configs.push(await readFileTool(root, { path: file, offset: 1, limit: 400 }));
    return enforceResultBudget({ project, configs, total: selected.total, next_cursor: selected.next_cursor, truncated: selected.truncated });
  }
  if (name === "read_git_status") {
    const output = await runCommand("git", ["-c", "core.quotepath=false", "status", "--porcelain=v1", "--branch"], root);
    return enforceResultBudget({ project, ...pageLines(output, 0, 2000) });
  }
  if (name === "read_git_diff") {
    const gitArgs = ["-c", "core.quotepath=false", "diff", "--no-ext-diff", "--unified=3"];
    if (args?.staged === true) gitArgs.push("--cached");
    if (args?.path) {
      const file = safePath(root, args.path, true);
      gitArgs.push("--", normalizeRelative(path.relative(root, file)));
    }
    const output = await runCommand("git", gitArgs, root, 15_000);
    return enforceResultBudget({ project, staged: args?.staged === true, ...pageLines(output, args?.cursor, args?.limit) });
  }
  if (name === "read_git_history") {
    const limit = Math.max(1, Math.min(100, Number(args?.limit || 20) || 20));
    const output = await runCommand("git", ["log", `-${limit}`, "--date=iso-strict", "--pretty=format:%H%x09%ad%x09%an%x09%s"], root);
    return enforceResultBudget({ project, commits: output.split(/\r?\n/).filter(Boolean).map(line => { const [commit, at, author, ...subject] = line.split("\t"); return { commit, at, author, subject: subject.join("\t") }; }) });
  }
  if (name === "read_runtime_status") return enforceResultBudget({ project, snapshot: getProjectRuntimeSnapshot(project) });
  if (name === "read_runtime_logs") return enforceResultBudget(await getProjectRuntimeLogsAsync(project, args?.profile_id || args?.profileId, args?.kind || "run", args?.lines || 300));
  throw new Error(`未实现工具：${name}`);
}

export async function executeWorkspaceReadonlyTool(toolName: string, args: any, capabilityToken: string, contractVersion: 2 | 3 = 2, options: WorkspaceReadonlyExecutionOptions = {}) {
  return executeWorkspaceReadonlyToolWithCapability(toolName, args, openScopedToolCapability(capabilityToken), contractVersion, options);
}

export async function executeWorkspaceReadonlyToolWithCapability(toolName: string, args: any, capability: ScopedToolCapabilityV1, contractVersion: 2 | 3 = 2, options: WorkspaceReadonlyExecutionOptions = {}) {
  const result: any = await executeWorkspaceReadonlyToolWithCapabilityRaw(toolName, args, capability, contractVersion, options);
  if (result?.status === "needs_project_id") return result;
  const normalizedName = String(toolName || "").replace(/^mcp__ccm__ccm_workspace_readonly__/, "");
  if (contractVersion !== 3 || !["read_file", "read_files", "glob_files", "grep_text"].includes(normalizedName)) return result;
  const sourceReceipt = result?.safeReceipt || result?.safe_receipt || {};
  const fallbackKind = normalizedName === "read_file" || normalizedName === "read_files" ? "text" : normalizedName === "glob_files" ? "glob" : "grep";
  const receipt: CcmWorkspaceToolEnvelopeV3["safeReceipt"] = {
    kind: sourceReceipt.kind || fallbackKind,
    ...(sourceReceipt.path || result?.path ? { path: String(sourceReceipt.path || result.path) } : {}),
    checksum: String(sourceReceipt.checksum || result?.checksum || result?.result_checksum || checksum(result)),
    ...(sourceReceipt.itemCount !== undefined ? { itemCount: Number(sourceReceipt.itemCount || 0) } : {}),
    ...(sourceReceipt.lineCount !== undefined ? { lineCount: Number(sourceReceipt.lineCount || 0) } : {}),
    ...(sourceReceipt.pageCount !== undefined ? { pageCount: Number(sourceReceipt.pageCount || 0) } : {}),
    truncated: sourceReceipt.truncated === true || result?.truncated === true,
    contentStored: false,
  };
  return attachTransientModelBlocks({
    schema: "ccm-workspace-tool-envelope-v3",
    toolContractVersion: 3,
    modelPayload: result,
    safeReceipt: receipt,
    contentStored: false,
  } satisfies CcmWorkspaceToolEnvelopeV3, transientWorkspaceBlocks(result));
}

export function runWorkspaceReadonlyToolsSelfTest() {
  const checksums = [...WORKSPACE_READONLY_TOOL_DEFINITIONS_V2, ...WORKSPACE_READONLY_TOOL_DEFINITIONS_V3].map(tool => tool.checksum);
  const v3ByName = new Map(WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.map(tool => [tool.name, tool]));
  return {
    success: Boolean(WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.length >= 21
      && WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.length === WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.length + 1
      && new Set(checksums).size === checksums.length
      && v3ByName.get("read_file")?.inputSchema?.properties?.pages
      && !v3ByName.get("read_file")?.inputSchema?.properties?.token_budget
      && !v3ByName.get("read_files")?.inputSchema?.properties?.token_budget
      && v3ByName.get("read_files")?.inputSchema?.properties?.paths?.maxItems === 20
      && v3ByName.get("glob_files")?.inputSchema?.properties?.limit?.maximum === 100
      && v3ByName.get("list_directory")?.inputSchema?.properties?.limit?.maximum === 100
      && v3ByName.get("web_fetch")?.inputSchema?.required?.includes("prompt")
      && !v3ByName.get("web_fetch")?.inputSchema?.properties?.max_chars
      && v3ByName.get("glob_files")?.inputSchema?.properties?.respect_gitignore
      && v3ByName.get("grep_text")?.inputSchema?.properties?.output_mode),
    tools: WORKSPACE_READONLY_TOOL_DEFINITIONS_V3.map(tool => ({ name: tool.name, checksum: tool.checksum, loadPolicy: tool.loadPolicy, toolContractVersion: tool.toolContractVersion })),
  };
}
