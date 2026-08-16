import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  buildInternalMcpServerConfig,
  type InternalMcpTaskContext,
  type InternalMcpToolDefinition,
  runInternalMcpServer,
} from "./internal-mcp-runtime";
import { appendInternalMcpTaskJournal, getBoundInternalMcpTask } from "./internal-mcp-task-store";
import { captureRepoStateIdentity, recordEvidence } from "../system/unified-evidence-registry";

export const WORKSPACE_EDIT_MCP_SERVER_NAME = "ccm__workspace_edit";
const EDIT_ROLES = ["project-child-agent"] as const;
const SENSITIVE_NAMES = /(?:^|[-_.])(?:credentials?|secrets?|private[-_.]?key|access[-_.]?key|service[-_.]?account|firebase[-_.]?admin)(?:[-_.]|$)|^\.env(?:\.|$)|^\.(?:npmrc|pypirc|netrc)$|^id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$|\.(?:pem|p12|pfx|key|keystore|jks)$/i;
const FILE_LIMIT = 4 * 1024 * 1024;
const DIRECTORY_SCAN_LIMIT = 5_000;

export function buildWorkspaceEditMcpServerConfig(context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt">) {
  return buildInternalMcpServerConfig(path.join(__dirname, "workspace-edit-mcp.js"), context);
}

const fenceProperties = {
  work_item_id: { type: "string" },
  attempt: { type: "integer", minimum: 1 },
  lease_id: { type: "string" },
};

const tools: InternalMcpToolDefinition[] = [
  {
    name: "apply_patch",
    roles: [...EDIT_ROLES],
    description: "在当前任务绑定的项目工作区精确替换文件内容。改已有文件必须先读取该文件，并传入当时的 expected_checksum；校验和不匹配会失败，请重新读取后再改。优先用本工具修改已有文件，不要用完整写文件覆盖。replace_all 用于把同一字符串在全文件中全部替换。必须匹配 expected_checksum；默认要求 old_text 唯一，避免改错位置。",
    inputSchema: {
      type: "object", required: ["path", "old_text", "new_text", "expected_checksum", "work_item_id", "attempt"], additionalProperties: false,
      properties: { path: { type: "string" }, old_text: { type: "string" }, new_text: { type: "string" }, replace_all: { type: "boolean", default: false, description: "将 old_text 在全文件中的每一处都替换为 new_text" }, expected_checksum: { type: "string" }, ...fenceProperties },
    },
  },
  {
    name: "write_file",
    roles: [...EDIT_ROLES],
    description: "在当前任务工作区创建 UTF-8 文本文件，或在携带旧校验和时完整覆盖已有文本文件。改已有文件应优先 apply_patch；完整 write_file 只用于新建或必须整文件重写。用户没有要求时不要新建 README 或其他文档。覆盖已有文件必须先读取并传入 expected_checksum，校验和不匹配会失败。不会写入敏感文件或项目外路径。",
    inputSchema: {
      type: "object", required: ["path", "content", "work_item_id", "attempt"], additionalProperties: false,
      properties: { path: { type: "string" }, content: { type: "string", maxLength: FILE_LIMIT }, expected_checksum: { type: "string" }, create_parent_directories: { type: "boolean", default: false }, ...fenceProperties },
    },
  },
  {
    name: "move_path",
    roles: [...EDIT_ROLES],
    description: "在当前任务工作区内移动或重命名普通文件。目标必须不存在，来源必须匹配expected_checksum。",
    inputSchema: {
      type: "object", required: ["source", "destination", "expected_checksum", "work_item_id", "attempt"], additionalProperties: false,
      properties: { source: { type: "string" }, destination: { type: "string" }, expected_checksum: { type: "string" }, ...fenceProperties },
    },
  },
  {
    name: "delete_path",
    roles: [...EDIT_ROLES],
    description: "删除当前任务工作区内匹配校验和的单个普通文件。目录删除必须通过单独的高风险授权流程，本工具拒绝执行。",
    inputSchema: {
      type: "object", required: ["path", "expected_checksum", "work_item_id", "attempt"], additionalProperties: false,
      properties: { path: { type: "string" }, expected_checksum: { type: "string" }, recursive: { type: "boolean", default: false }, ...fenceProperties },
    },
  },
];

function hash(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeRelative(value: any) {
  return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\/+/, "");
}

function assertSafeRelative(value: any) {
  const relative = normalizeRelative(value);
  if (!relative || path.isAbsolute(relative) || relative.split("/").includes("..")) throw new Error("文件路径无效或越过项目边界");
  if (relative.split("/").some(part => SENSITIVE_NAMES.test(part))) throw new Error("敏感文件禁止通过工作区编辑工具修改");
  return relative;
}

function within(root: string, candidate: string) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertExistingChain(root: string, absolute: string, includeLeaf: boolean) {
  const relative = path.relative(root, absolute);
  const segments = relative.split(path.sep).filter(Boolean);
  let cursor = root;
  const limit = includeLeaf ? segments.length : Math.max(0, segments.length - 1);
  for (let index = 0; index < limit; index += 1) {
    cursor = path.join(cursor, segments[index]);
    if (!fs.existsSync(cursor)) throw new Error("父目录不存在");
    if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error("不允许通过符号链接或Junction修改文件");
    const real = fs.realpathSync(cursor);
    if (!within(root, real)) throw new Error("路径越过项目边界");
  }
}

function targetPath(context: InternalMcpTaskContext, value: any, allowMissing = false, allowMissingParents = false) {
  const root = fs.realpathSync(context.workDir);
  const relative = assertSafeRelative(value);
  const absolute = path.resolve(root, ...relative.split("/"));
  if (!within(root, absolute)) throw new Error("路径越过项目边界");
  if (allowMissingParents) {
    let cursor = root;
    for (const segment of path.relative(root, path.dirname(absolute)).split(path.sep).filter(Boolean)) {
      const next = path.join(cursor, segment);
      if (!fs.existsSync(next)) break;
      if (fs.lstatSync(next).isSymbolicLink()) throw new Error("不允许通过符号链接或Junction修改文件");
      cursor = fs.realpathSync(next);
      if (!within(root, cursor)) throw new Error("路径越过项目边界");
    }
  } else {
    assertExistingChain(root, absolute, !allowMissing);
  }
  if (!allowMissing && !fs.existsSync(absolute)) throw new Error("文件或目录不存在");
  return { root, relative, absolute };
}

function allowedPaths(task: any) {
  return (Array.isArray(task.allowed_paths || task.allowedPaths) ? task.allowed_paths || task.allowedPaths : [])
    .map((item: any) => normalizeRelative(item)).filter(Boolean);
}

function assertAllowed(relative: string, allowed: string[]) {
  if (!allowed.length || allowed.includes(".")) return;
  if (!allowed.some(item => relative === item || relative.startsWith(`${item.replace(/\/$/, "")}/`))) throw new Error("路径不在当前WorkItem允许修改范围内");
}

function assertFence(context: InternalMcpTaskContext, args: any, paths: string[]) {
  if (!EDIT_ROLES.includes(context.role as any)) throw new Error("只有项目执行子Agent可以修改工作区");
  const task: any = getBoundInternalMcpTask(context);
  const workItemId = String(args?.work_item_id || "");
  const expectedWorkItem = String(task.work_item_id || task.workItemId || task.id || "");
  const attempt = Math.max(1, Number(args?.attempt || 0));
  const expectedAttempt = Math.max(1, Number(task.attempt || task.agent_communication_attempt || context.communicationAttempt || 1));
  const leaseId = String(args?.lease_id || "");
  const expectedLease = String(task.agent_communication_lease_id || task.lease_id || task.leaseId || context.communicationLeaseId || "");
  if (!workItemId || workItemId !== expectedWorkItem) throw new Error("工作区编辑WorkItem身份不匹配");
  if (attempt !== expectedAttempt) throw new Error("工作区编辑attempt已过期");
  if (expectedLease && leaseId !== expectedLease) throw new Error("工作区编辑lease已过期或缺失");
  const allowed = allowedPaths(task);
  paths.forEach(relative => assertAllowed(relative, allowed));
  return { task, workItemId, attempt, leaseId: expectedLease || leaseId, allowed };
}

function readTextFile(file: string) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile()) throw new Error("目标不是普通文件");
  if (stat.isSymbolicLink() || stat.size > FILE_LIMIT) throw new Error("仅允许修改4MB以内的普通文本文件");
  const raw = fs.readFileSync(file);
  if (raw.includes(0)) throw new Error("二进制文件不能通过文本编辑工具修改");
  return { raw, text: raw.toString("utf-8"), checksum: hash(raw) };
}

function assertChecksum(actual: string, expected: any) {
  if (!String(expected || "") || actual !== String(expected)) throw Object.assign(new Error("文件校验和不匹配：必须先读取该文件并传入当时的 expected_checksum；若文件已变化，请重新读取后再修改"), { code: "WORKSPACE_EDIT_CHECKSUM_CONFLICT" });
}

function atomicWrite(file: string, content: string) {
  const bytes = Buffer.from(content, "utf-8");
  if (bytes.length > FILE_LIMIT) throw new Error("写入内容超过4MB限制");
  const temp = `${file}.ccm-${process.pid}-${Date.now()}.tmp`;
  fs.writeFileSync(temp, bytes, { mode: 0o600, flag: "wx" });
  const backup = `${temp}.previous`;
  try {
    if (fs.existsSync(file)) fs.renameSync(file, backup);
    try { fs.renameSync(temp, file); }
    catch (error) {
      if (fs.existsSync(backup) && !fs.existsSync(file)) fs.renameSync(backup, file);
      throw error;
    }
  } finally {
    if (fs.existsSync(temp)) fs.rmSync(temp, { force: true });
    if (fs.existsSync(backup)) fs.rmSync(backup, { force: true });
  }
}

function directoryIdentity(directory: string) {
  const root = fs.realpathSync(directory);
  const stack = [root];
  const rows: string[] = [];
  while (stack.length && rows.length < DIRECTORY_SCAN_LIMIT) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error("目录包含符号链接，禁止移动");
      if (SENSITIVE_NAMES.test(entry.name)) throw new Error("目录包含敏感文件，禁止移动");
      const absolute = path.join(current, entry.name);
      const relative = path.relative(root, absolute).replace(/\\/g, "/");
      rows.push(`${entry.isDirectory() ? "d" : entry.isFile() ? "f" : "o"}:${relative}`);
      if (entry.isDirectory()) stack.push(absolute);
      if (rows.length >= DIRECTORY_SCAN_LIMIT) break;
    }
  }
  if (stack.length || rows.length >= DIRECTORY_SCAN_LIMIT) throw new Error("目录项目过多，不能通过单次移动工具处理");
  return hash(rows.sort().join("\n"));
}

function identity(target: string) {
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) throw new Error("不允许修改符号链接或Junction");
  if (stat.isFile()) return readTextFile(target).checksum;
  if (stat.isDirectory()) return directoryIdentity(target);
  throw new Error("不支持的文件系统对象");
}

function recordMutation(context: InternalMcpTaskContext, fence: any, action: string, references: string[], beforeChecksum: string, afterChecksum: string) {
  const repoStateIdentity = captureRepoStateIdentity(context.workDir, references);
  const evidence = recordEvidence({
    evidenceType: "diff", taskId: context.taskId, workItemId: fence.workItemId,
    scope: "project", scopeId: context.project, exactSessionId: context.taskAgentSessionId || context.projectSessionId,
    generation: Number(context.nativeGeneration || context.boundaryGeneration || 0), attempt: fence.attempt,
    leaseId: fence.leaseId, repoStateIdentity, producerAgentId: context.taskAgentSessionId || context.project,
    status: "valid", subject: `workspace_edit:${action}`, references,
    summary: `${action} completed for ${references.join(", ")}`,
    sourceChecksum: hash(`${beforeChecksum}|${afterChecksum}|${action}`),
  });
  appendInternalMcpTaskJournal(context, "workspace", {
    action, paths: references, before_checksum: beforeChecksum, after_checksum: afterChecksum,
    evidence_id: evidence.evidenceId, generation: Number(context.nativeGeneration || context.boundaryGeneration || 0),
    attempt: fence.attempt, contentStored: false,
  }, { type: `workspace_${action}`, title: "工作区文件变更", detail: `${action}：${references.join(" → ")}`, status: "completed", phase: "execution" });
  return { evidence, repoStateIdentity };
}

function applyPatch(context: InternalMcpTaskContext, args: any) {
  const target = targetPath(context, args?.path);
  const fence = assertFence(context, args, [target.relative]);
  const before = readTextFile(target.absolute);
  assertChecksum(before.checksum, args?.expected_checksum);
  const oldText = String(args?.old_text ?? "");
  const newText = String(args?.new_text ?? "");
  if (!oldText) throw new Error("old_text不能为空");
  const occurrences = before.text.split(oldText).length - 1;
  if (!occurrences) throw new Error("old_text未在当前文件中找到");
  if (occurrences > 1 && args?.replace_all !== true) throw new Error(`old_text出现${occurrences}次，请提供更精确上下文或明确replace_all`);
  const afterText = args?.replace_all === true ? before.text.split(oldText).join(newText) : before.text.replace(oldText, newText);
  atomicWrite(target.absolute, afterText);
  const afterChecksum = hash(Buffer.from(afterText, "utf-8"));
  const recorded = recordMutation(context, fence, "apply_patch", [target.relative], before.checksum, afterChecksum);
  return { success: true, schema: "ccm-workspace-edit-result-v1", action: "apply_patch", path: target.relative, replacements: args?.replace_all === true ? occurrences : 1, beforeChecksum: before.checksum, afterChecksum, evidenceId: recorded.evidence.evidenceId, repoStateIdentity: recorded.repoStateIdentity, contentStored: false };
}

function writeFile(context: InternalMcpTaskContext, args: any) {
  const target = targetPath(context, args?.path, true, args?.create_parent_directories === true);
  const fence = assertFence(context, args, [target.relative]);
  if (!fs.existsSync(path.dirname(target.absolute))) {
    if (args?.create_parent_directories !== true) throw new Error("父目录不存在；如需创建请明确create_parent_directories=true");
    const parentRelative = normalizeRelative(path.relative(target.root, path.dirname(target.absolute)));
    assertSafeRelative(parentRelative);
    fs.mkdirSync(path.dirname(target.absolute), { recursive: true });
    assertExistingChain(target.root, target.absolute, false);
  }
  let beforeChecksum = "new-file";
  if (fs.existsSync(target.absolute)) {
    const before = readTextFile(target.absolute);
    beforeChecksum = before.checksum;
    assertChecksum(before.checksum, args?.expected_checksum);
  } else if (String(args?.expected_checksum || "")) throw new Error("新文件不应携带旧文件校验和");
  const content = String(args?.content ?? "");
  atomicWrite(target.absolute, content);
  const afterChecksum = hash(Buffer.from(content, "utf-8"));
  const recorded = recordMutation(context, fence, "write_file", [target.relative], beforeChecksum, afterChecksum);
  return { success: true, schema: "ccm-workspace-edit-result-v1", action: "write_file", path: target.relative, created: beforeChecksum === "new-file", beforeChecksum, afterChecksum, evidenceId: recorded.evidence.evidenceId, repoStateIdentity: recorded.repoStateIdentity, contentStored: false };
}

function movePath(context: InternalMcpTaskContext, args: any) {
  const source = targetPath(context, args?.source);
  const destination = targetPath(context, args?.destination, true);
  const fence = assertFence(context, args, [source.relative, destination.relative]);
  if (fs.existsSync(destination.absolute)) throw new Error("移动目标已存在，拒绝覆盖");
  if (!fs.existsSync(path.dirname(destination.absolute))) throw new Error("移动目标父目录不存在");
  assertExistingChain(destination.root, destination.absolute, false);
  const beforeChecksum = identity(source.absolute);
  if (!fs.lstatSync(source.absolute).isFile()) throw new Error("move_path当前只允许移动普通文件");
  assertChecksum(beforeChecksum, args?.expected_checksum);
  fs.renameSync(source.absolute, destination.absolute);
  const afterChecksum = identity(destination.absolute);
  const recorded = recordMutation(context, fence, "move_path", [source.relative, destination.relative], beforeChecksum, afterChecksum);
  return { success: true, schema: "ccm-workspace-edit-result-v1", action: "move_path", source: source.relative, destination: destination.relative, beforeChecksum, afterChecksum, evidenceId: recorded.evidence.evidenceId, repoStateIdentity: recorded.repoStateIdentity, contentStored: false };
}

function deletePath(context: InternalMcpTaskContext, args: any) {
  if (args?.recursive === true) throw new Error("递归目录删除必须通过单独的高风险授权流程，本工具不会执行");
  const target = targetPath(context, args?.path);
  const fence = assertFence(context, args, [target.relative]);
  const beforeChecksum = identity(target.absolute);
  assertChecksum(beforeChecksum, args?.expected_checksum);
  const stat = fs.lstatSync(target.absolute);
  if (!stat.isFile()) throw new Error("目录删除必须通过单独的高风险授权流程");
  fs.rmSync(target.absolute, { force: false });
  const recorded = recordMutation(context, fence, "delete_path", [target.relative], beforeChecksum, "deleted");
  return { success: true, schema: "ccm-workspace-edit-result-v1", action: "delete_path", path: target.relative, beforeChecksum, status: "deleted", evidenceId: recorded.evidence.evidenceId, repoStateIdentity: recorded.repoStateIdentity, contentStored: false };
}

async function callTool(context: InternalMcpTaskContext, name: string, args: any) {
  if (name === "apply_patch") return applyPatch(context, args);
  if (name === "write_file") return writeFile(context, args);
  if (name === "move_path") return movePath(context, args);
  if (name === "delete_path") return deletePath(context, args);
  throw new Error(`未知工作区编辑工具：${name}`);
}

export function workspaceEditMcpTools() { return tools.map(tool => ({ ...tool })); }
export function runWorkspaceEditMcpServer() { runInternalMcpServer({ name: WORKSPACE_EDIT_MCP_SERVER_NAME, version: "1.0.0", tools, callTool }); }
if (require.main === module) runWorkspaceEditMcpServer();
