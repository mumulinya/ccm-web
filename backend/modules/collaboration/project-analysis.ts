import * as fs from "fs";
import * as path from "path";
import {
  getRoutableMembers,
  normalizeGroupOrchestrator,
  resolveMemberRuntime,
} from "./group-orchestrator";

type ProjectAnalysisDeps = {
  compactMemoryText: (value: any, max?: number) => string;
  compactPreserveLines: (value: any, max?: number) => string;
  getProjectExtraConfig: (projectName: string) => any;
  buildProjectMemoryPacket: (projectName: string, input?: any) => string;
};

const PROJECT_ANALYSIS_IGNORED_DIRS = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".output",
  ".turbo",
  ".vite",
  ".cache",
  ".parcel-cache",
  ".ccm-worktrees",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "out",
  "target",
  "vendor",
]);

const PROJECT_ANALYSIS_SAFE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".vue",
  ".svelte",
  ".json",
  ".md",
  ".mdx",
  ".css",
  ".scss",
  ".less",
  ".html",
  ".yml",
  ".yaml",
  ".toml",
  ".prisma",
  ".sql",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".cs",
  ".php",
  ".rb",
]);

const PROJECT_ANALYSIS_SAFE_FILENAMES = new Set([
  "README",
  "README.md",
  "package.json",
  "pnpm-workspace.yaml",
  "vite.config.ts",
  "vite.config.js",
  "next.config.js",
  "next.config.mjs",
  "nuxt.config.ts",
  "tsconfig.json",
  "tailwind.config.js",
  "tailwind.config.ts",
  "docker-compose.yml",
  "Dockerfile",
]);

function isSensitiveProjectAnalysisFile(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");
  const base = path.basename(normalized).toLowerCase();
  return /(^|\/)\.env($|[.\-/])|secret|credential|token|private[-_]?key|id_rsa|\.pem$|\.p12$|\.pfx$|\.sqlite$|\.db$/i.test(normalized)
    || ["npmrc", ".npmrc", ".yarnrc", ".pypirc"].includes(base);
}

function isProjectAnalysisCandidate(filePath: string, root: string) {
  const relativePath = path.relative(root, filePath);
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) return false;
  if (isSensitiveProjectAnalysisFile(relativePath)) return false;
  const ext = path.extname(filePath);
  const base = path.basename(filePath);
  return PROJECT_ANALYSIS_SAFE_EXTENSIONS.has(ext) || PROJECT_ANALYSIS_SAFE_FILENAMES.has(base);
}

function collectProjectAnalysisFiles(root: string, maxEntries = 1200) {
  const files: string[] = [];
  let visited = 0;
  const walk = (dir: string, depth = 0) => {
    if (visited >= maxEntries || depth > 5) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
        .filter(entry => !PROJECT_ANALYSIS_IGNORED_DIRS.has(entry.name) && !entry.name.startsWith(".ccm-"))
        .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
    } catch { return; }
    for (const entry of entries) {
      if (visited >= maxEntries) break;
      visited += 1;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      if (isProjectAnalysisCandidate(full, root)) files.push(full);
    }
  };
  walk(root);
  return files;
}

function buildProjectAnalysisQueryTerms(message: string) {
  return String(message || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\-./\u4e00-\u9fa5]+/gu, " ")
    .split(/\s+/)
    .map(item => item.trim())
    .filter(item => item.length >= 2)
    .slice(0, 18);
}

function scoreProjectAnalysisFile(filePath: string, root: string, queryTerms: string[]) {
  const relativePath = path.relative(root, filePath).replace(/\\/g, "/");
  const lower = relativePath.toLowerCase();
  let score = 0;
  if (/^readme/i.test(path.basename(relativePath))) score += 90;
  if (["package.json", "vite.config.ts", "vite.config.js", "next.config.js", "tsconfig.json"].includes(path.basename(relativePath))) score += 70;
  if (/(^|\/)(src|app|pages|routes|router|components|server|backend|frontend|api|lib|utils)\//i.test(relativePath)) score += 45;
  if (/(main|index|app|server|route|router|api|schema|model|store|config)\./i.test(path.basename(relativePath))) score += 25;
  for (const term of queryTerms) {
    if (lower.includes(term)) score += 35;
  }
  const depthPenalty = relativePath.split("/").length * 2;
  return score - depthPenalty;
}

function readProjectAnalysisFileSnippet(filePath: string, maxChars = 2600) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size > 240_000) return "";
    const buffer = fs.readFileSync(filePath);
    const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
    if (sample.includes(0)) return "";
    const content = buffer.toString("utf-8").replace(/\r\n/g, "\n").trim();
    if (!content) return "";
    return content.length > maxChars ? `${content.slice(0, maxChars)}\n…（已截断，仅用于只读分析）` : content;
  } catch {
    return "";
  }
}

function fallbackCompactMemoryText(value: any, max = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function buildProjectCodeReadOnlySnapshot(
  project: string,
  workDir: string,
  message: string,
  deps: Pick<ProjectAnalysisDeps, "compactMemoryText"> = { compactMemoryText: fallbackCompactMemoryText },
) {
  if (!workDir) return "";
  try {
    const realRoot = fs.realpathSync(workDir);
    if (!fs.existsSync(realRoot) || !fs.statSync(realRoot).isDirectory()) return "- 代码快照：工作目录不可读。";
    const queryTerms = buildProjectAnalysisQueryTerms(message);
    const candidates = collectProjectAnalysisFiles(realRoot);
    const selected = candidates
      .map(file => ({ file, score: scoreProjectAnalysisFile(file, realRoot, queryTerms) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    if (!selected.length) return "- 代码快照：未找到适合只读分析的源码/配置文件。";
    const parts: string[] = [
      "### 只读代码快照",
      "说明：以下为群聊主 Agent 为回答项目分析问题读取的有限源码片段；它不能修改文件，完整实现仍以子 Agent 执行时读取的真实仓库为准。",
    ];
    let total = 0;
    for (const item of selected) {
      const relativePath = path.relative(realRoot, item.file).replace(/\\/g, "/");
      const snippet = readProjectAnalysisFileSnippet(item.file, 2600);
      if (!snippet) continue;
      const block = `\n#### ${project}/${relativePath}\n\`\`\`\n${snippet}\n\`\`\``;
      if (total + block.length > 16_000) break;
      total += block.length;
      parts.push(block);
    }
    return parts.length > 2 ? parts.join("\n") : "- 代码快照：候选文件为空或不可读。";
  } catch (error: any) {
    return `- 代码快照：读取失败，${deps.compactMemoryText(error?.message || error, 180)}。`;
  }
}

export function buildGroupProjectAnalysisContext(
  group: any,
  message: string,
  ctx: any,
  configs: any[],
  deps: ProjectAnalysisDeps,
) {
  const normalized = normalizeGroupOrchestrator(group);
  const members = getRoutableMembers(normalized);
  const lines: string[] = [
    "【只读项目分析上下文】",
    "用途：帮助群聊主 Agent 回答用户关于项目、架构、代码、知识库和协作状态的询问。",
    "边界：这是只读分析；不得创建任务、不得派发子 Agent、不得声明已修改文件或运行命令。",
  ];
  if (!members.length) {
    lines.push("- 当前群聊还没有绑定可分析的项目 Agent。");
  }
  for (const member of members.slice(0, 8)) {
    const runtime = resolveMemberRuntime(member.project, normalized, configs);
    const workDir = runtime?.workDir || "";
    const resources = deps.getProjectExtraConfig(member.project);
    lines.push("");
    lines.push(`## 项目 ${member.project}`);
    lines.push(`- 执行器：${runtime?.agentType || member.agent || "未配置"}`);
    lines.push(`- 工作目录：${workDir || "未配置"}`);
    if (workDir) {
      try {
        const entries = fs.existsSync(workDir)
          ? fs.readdirSync(workDir).filter(name => !["node_modules", ".git", "dist", "build"].includes(name)).slice(0, 16)
          : [];
        lines.push(`- 顶层目录：${entries.length ? entries.join("、") : "目录为空或不可读"}`);
      } catch (error: any) {
        lines.push(`- 顶层目录：读取失败，${deps.compactMemoryText(error?.message || error, 160)}`);
      }
    }
    lines.push(deps.compactMemoryText(deps.buildProjectMemoryPacket(member.project, { workDir, resources, query: message }), 2200));
    if (workDir) lines.push(deps.compactPreserveLines(buildProjectCodeReadOnlySnapshot(member.project, workDir, message, deps), 18_000));
  }
  try {
    const { queryKnowledgeBase } = require("../knowledge/rag");
    const projectTags = members.flatMap((member: any) => [
      `#project:${member.project}`,
      `#${member.project}`,
    ]).filter(Boolean);
    const rag = queryKnowledgeBase(message, 3, projectTags) || queryKnowledgeBase(message, 3);
    if (rag) {
      lines.push("");
      lines.push("## 本地知识库召回");
      lines.push(deps.compactMemoryText(rag, 2200));
    }
  } catch {}
  return lines.filter(Boolean).join("\n");
}
