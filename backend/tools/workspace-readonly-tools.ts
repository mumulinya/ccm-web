import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { getConfigs, getConfigInfo } from "../core/db";
import { getProjectRuntimeLogsAsync, getProjectRuntimeSnapshot } from "../modules/projects/project-runtime";
import { estimateTextTokens } from "../system/context-budget";

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
const TOOL_RESULT_TOKEN_LIMIT = 8_000;
const DIRECTORY_SCAN_LIMIT = 20_000;

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
  { name: "list_directory", loadPolicy: "base", description: "列出授权项目目录中的文件和子目录，结果分页返回。", inputSchema: { type: "object", properties: { project_id: { type: "string" }, path: { type: "string" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 500 } } } },
  { name: "glob_files", loadPolicy: "base", description: "在授权项目中按Glob模式查找文件，返回稳定分页结果。", inputSchema: { type: "object", required: ["pattern"], properties: { project_id: { type: "string" }, pattern: { type: "string" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 500 } } } },
  { name: "grep_text", loadPolicy: "base", description: "使用ripgrep在授权项目源码中检索文本或正则表达式。", inputSchema: { type: "object", required: ["pattern"], properties: { project_id: { type: "string" }, pattern: { type: "string" }, glob: { type: "string" }, mode: { enum: ["content", "files_with_matches", "count"] }, multiline: { type: "boolean" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 500 } } } },
  { name: "read_file", loadPolicy: "base", description: "按完整行读取授权项目内的普通文本文件，支持offset、limit和继续游标。", inputSchema: { type: "object", required: ["path"], properties: { project_id: { type: "string" }, path: { type: "string" }, offset: { type: "integer", minimum: 1 }, limit: { type: "integer", minimum: 1, maximum: 2000 }, token_budget: { type: "integer", minimum: 256, maximum: 8000 } } } },
  { name: "find_definition", loadPolicy: "search", description: "通过已配置语言服务查找符号定义；没有可靠语言服务时明确返回不可用。", inputSchema: { type: "object", required: ["symbol"], properties: { project_id: { type: "string" }, symbol: { type: "string" }, path: { type: "string" } } } },
  { name: "find_references", loadPolicy: "search", description: "通过已配置语言服务查找符号引用；没有可靠语言服务时明确返回不可用。", inputSchema: { type: "object", required: ["symbol"], properties: { project_id: { type: "string" }, symbol: { type: "string" }, path: { type: "string" } } } },
  { name: "read_project_config", loadPolicy: "search", description: "读取授权项目的标准构建和运行配置文件。", inputSchema: { type: "object", properties: { project_id: { type: "string" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 50 } } } },
  { name: "read_git_status", loadPolicy: "search", description: "读取授权项目Git工作区状态。", inputSchema: { type: "object", properties: { project_id: { type: "string" } } } },
  { name: "read_git_diff", loadPolicy: "search", description: "读取授权项目Git差异，支持指定文件和暂存区。", inputSchema: { type: "object", properties: { project_id: { type: "string" }, path: { type: "string" }, staged: { type: "boolean" }, cursor: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 2000 } } } },
  { name: "read_git_history", loadPolicy: "search", description: "读取授权项目最近Git提交历史。", inputSchema: { type: "object", properties: { project_id: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100 } } } },
  { name: "read_runtime_status", loadPolicy: "search", description: "读取授权项目的运行配置、进程和构建状态。", inputSchema: { type: "object", properties: { project_id: { type: "string" } } } },
  { name: "read_runtime_logs", loadPolicy: "search", description: "读取授权项目精确运行配置的运行或构建日志。", inputSchema: { type: "object", required: ["profile_id"], properties: { project_id: { type: "string" }, profile_id: { type: "string" }, kind: { enum: ["run", "build"] }, lines: { type: "integer", minimum: 1, maximum: 2000 } } } },
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

function selectProject(capability: ScopedToolCapabilityV1, args: any) {
  const requested = String(args?.project_id || args?.projectId || "").trim();
  const allowed = capability.scope === "global" && capability.allowedProjects.length === 0 ? activeProjects() : capability.allowedProjects;
  const project = capability.scope === "project" ? capability.scopeId : requested;
  if (!project) throw new Error("当前工具需要指定精确project_id");
  if (!allowed.includes(project)) throw new Error(`当前Agent作用域无权读取项目：${project}`);
  return { project, root: projectWorkDir(project) };
}

function normalizeRelative(value: any) {
  return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\/+/, "");
}

function assertNotSensitive(relative: string) {
  if (relative.split("/").some(part => SENSITIVE_NAMES.test(part))) throw new Error("敏感文件禁止读取");
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
    if (!fs.existsSync(cursor)) throw new Error("文件或目录不存在");
    if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error("不允许读取符号链接或Junction目标");
  }
  const parent = allowMissing ? path.dirname(resolved) : resolved;
  const realRoot = fs.realpathSync(root);
  const realTarget = fs.realpathSync(parent);
  const contained = path.relative(realRoot, realTarget);
  if (contained.startsWith("..") || path.isAbsolute(contained)) throw new Error("路径越过项目边界");
  if (!allowMissing) {
    const stat = fs.lstatSync(realTarget);
    if (stat.isSymbolicLink()) throw new Error("不允许读取符号链接或Junction目标");
  }
  return allowMissing ? resolved : realTarget;
}

function page<T>(rows: T[], cursorValue: any, limitValue: any) {
  const offset = Math.max(0, Number.parseInt(String(cursorValue || "0"), 10) || 0);
  const limit = Math.max(1, Math.min(500, Number(limitValue || 100) || 100));
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
  const tokenBudget = Math.max(256, Math.min(TOOL_RESULT_TOKEN_LIMIT, Number(args?.token_budget || TOOL_RESULT_TOKEN_LIMIT) || TOOL_RESULT_TOKEN_LIMIT));
  const contentTokenBudget = Math.max(128, tokenBudget - 256);
  const selected: Array<{ line: number; text: string }> = [];
  let used = 0;
  for (let index = offset - 1; index < lines.length && selected.length < limit; index += 1) {
    const row = { line: index + 1, text: lines[index] };
    const rowTokens = estimateTextTokens(JSON.stringify(row));
    if (rowTokens > contentTokenBudget) throw new Error(`第${index + 1}行超过单次Token预算，未进行字符截断`);
    if (used + rowTokens > contentTokenBudget) break;
    selected.push(row);
    used += rowTokens;
  }
  const nextLine = selected.length ? selected[selected.length - 1].line + 1 : offset;
  return enforceResultBudget({ path: normalizeRelative(path.relative(root, file)), checksum: checksum(text), total_lines: lines.length, offset, lines: selected, next_cursor: nextLine <= lines.length ? String(nextLine) : "", truncated: nextLine <= lines.length }, tokenBudget);
}

export async function executeWorkspaceReadonlyToolWithCapability(toolName: string, args: any, capability: ScopedToolCapabilityV1) {
  const alias: Record<string, string> = { read_project_source: "read_project_config", read_runtime_diagnostics: "read_runtime_status" };
  const name = alias[String(toolName || "")] || String(toolName || "").replace(/^mcp__ccm__ccm_workspace_readonly__/, "");
  if (!WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.some(tool => tool.name === name)) throw new Error(`未知只读工作区工具：${name}`);
  const { project, root } = selectProject(capability, args || {});
  if (name === "list_directory") {
    const directory = safePath(root, args?.path || "");
    const stat = await fs.promises.lstat(directory);
    if (!stat.isDirectory()) throw new Error("目标不是目录");
    const entries = (await fs.promises.readdir(directory, { withFileTypes: true }))
      .filter(entry => !entry.isSymbolicLink() && !EXCLUDED_DIRECTORIES.has(entry.name.toLowerCase()) && !SENSITIVE_NAMES.test(entry.name))
      .map(entry => ({ name: entry.name, path: normalizeRelative(path.relative(root, path.join(directory, entry.name))), type: entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other" }))
      .sort((left, right) => left.type.localeCompare(right.type) || left.name.localeCompare(right.name));
    return enforceResultBudget({ project, path: normalizeRelative(args?.path || ""), ...page(entries, args?.cursor, args?.limit) });
  }
  if (name === "glob_files") {
    const matcher = globRegex(args?.pattern);
    const matches = (await walk(root)).filter(file => matcher.test(file));
    return enforceResultBudget({ project, pattern: String(args?.pattern || ""), ...page(matches, args?.cursor, args?.limit), scan_limit_reached: matches.length >= DIRECTORY_SCAN_LIMIT });
  }
  if (name === "grep_text") {
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
  if (name === "read_file") return { project, ...(await readFileTool(root, args)) };
  if (name === "find_definition" || name === "find_references") {
    return enforceResultBudget({ project, success: false, state: "capability_unavailable", tool: name, symbol: String(args?.symbol || ""), reason: "当前项目未连接可证明语义定义/引用结果的语言服务；未使用文本匹配冒充LSP结果。" });
  }
  if (name === "read_project_config") {
    const names = new Set(["package.json", "pnpm-workspace.yaml", "yarn.lock", "package-lock.json", "bun.lockb", "pom.xml", "build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts", "go.mod", "cargo.toml", "pyproject.toml", "requirements.txt", "docker-compose.yml", "docker-compose.yaml", "Dockerfile"]);
    const files = (await walk(root)).filter(file => names.has(path.posix.basename(file)) || /^\.github\/workflows\/.+\.ya?ml$/i.test(file));
    const selected = page(files, args?.cursor, Math.min(20, Number(args?.limit || 20)));
    const configs = [];
    for (const file of selected.items) configs.push(await readFileTool(root, { path: file, offset: 1, limit: 400, token_budget: 1500 }));
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

export async function executeWorkspaceReadonlyTool(toolName: string, args: any, capabilityToken: string) {
  return executeWorkspaceReadonlyToolWithCapability(toolName, args, openScopedToolCapability(capabilityToken));
}

export function runWorkspaceReadonlyToolsSelfTest() {
  const checksums = WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.map(tool => tool.checksum);
  return {
    success: WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.length === 12 && new Set(checksums).size === checksums.length,
    tools: WORKSPACE_READONLY_TOOL_DEFINITIONS_V2.map(tool => ({ name: tool.name, checksum: tool.checksum, loadPolicy: tool.loadPolicy })),
  };
}
