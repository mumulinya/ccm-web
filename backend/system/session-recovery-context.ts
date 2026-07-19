import * as fs from "fs";
import * as path from "path";
import { estimateTextTokens } from "./context-budget";

const FILE_LIMIT = 5;
const FILE_TOKEN_LIMIT = 5_000;
const FILE_TOTAL_TOKEN_LIMIT = 50_000;
const SKILL_TOKEN_LIMIT = 5_000;
const SKILL_TOTAL_TOKEN_LIMIT = 25_000;

function withinRoot(rootDir: string, target: string) {
  const relative = path.relative(path.resolve(rootDir), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function truncateToTokens(text: string, maxTokens: number) {
  if (estimateTextTokens(text) <= maxTokens) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (estimateTextTokens(text.slice(0, middle)) <= maxTokens) low = middle;
    else high = middle - 1;
  }
  return text.slice(0, low);
}

export function buildVerifiedSessionRecoveryContext(input: {
  rootDir?: string;
  fileReferences?: any[];
  skills?: any[];
}) {
  const rootDir = String(input.rootDir || "").trim();
  const files: any[] = [];
  const seenFiles = new Set<string>();
  let fileTokens = 0;
  for (const raw of [...(Array.isArray(input.fileReferences) ? input.fileReferences : [])].reverse()) {
    if (files.length >= FILE_LIMIT || fileTokens >= FILE_TOTAL_TOKEN_LIMIT) break;
    const recordedPath = String(typeof raw === "string" ? raw : raw?.path || raw?.file || "").trim();
    if (!recordedPath) continue;
    const resolved = path.isAbsolute(recordedPath) ? path.resolve(recordedPath) : rootDir ? path.resolve(rootDir, recordedPath) : "";
    if (!resolved || rootDir && !withinRoot(rootDir, resolved)) continue;
    const key = resolved.toLowerCase();
    if (seenFiles.has(key) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) continue;
    const source = fs.readFileSync(resolved);
    if (source.includes(0)) continue;
    const remaining = Math.min(FILE_TOKEN_LIMIT, FILE_TOTAL_TOKEN_LIMIT - fileTokens);
    const content = truncateToTokens(source.toString("utf8"), remaining);
    const tokens = estimateTextTokens(content);
    if (!content || tokens <= 0) continue;
    seenFiles.add(key);
    fileTokens += tokens;
    files.unshift({ path: recordedPath, resolvedPath: resolved, content, tokens, verified: true });
  }

  const skills: any[] = [];
  let skillTokens = 0;
  for (const raw of [...(Array.isArray(input.skills) ? input.skills : [])].reverse()) {
    if (skillTokens >= SKILL_TOTAL_TOKEN_LIMIT) break;
    const name = String(raw?.name || "").trim();
    const verified = raw?.verified === true;
    const source = verified ? String(raw?.content || "") : "";
    if (!name || !source) continue;
    const remaining = Math.min(SKILL_TOKEN_LIMIT, SKILL_TOTAL_TOKEN_LIMIT - skillTokens);
    const content = truncateToTokens(source, remaining);
    const tokens = estimateTextTokens(content);
    if (!content || tokens <= 0) continue;
    skillTokens += tokens;
    skills.unshift({ name, content, tokens, verified: true });
  }

  return {
    schema: "ccm-verified-session-recovery-context-v1",
    files,
    skills,
    budgets: {
      fileLimit: FILE_LIMIT,
      fileTokenLimit: FILE_TOKEN_LIMIT,
      fileTotalTokenLimit: FILE_TOTAL_TOKEN_LIMIT,
      skillTokenLimit: SKILL_TOKEN_LIMIT,
      skillTotalTokenLimit: SKILL_TOTAL_TOKEN_LIMIT,
    },
    tokens: { files: fileTokens, skills: skillTokens, total: fileTokens + skillTokens },
  };
}
