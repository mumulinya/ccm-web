import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as os from "os";
import { spawn, spawnSync } from "child_process";
import { CCM_DIR, PETS_FILE, PUBLIC_DIR } from "../../core/utils";

export type PetGenerationStatus = "queued" | "preparing" | "generating" | "validating" | "installing" | "completed" | "failed" | "cancelled";

export interface PetGenerationJob {
  id: string;
  petId: string;
  name: string;
  description: string;
  style: string;
  targetAgent: "global-agent" | "music-agent";
  status: PetGenerationStatus;
  stageLabel: string;
  progress: number;
  referencePath: string;
  runDir: string;
  promptPath: string;
  logPath: string;
  pid?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  manifest?: any;
  installed?: any;
}

const JOBS_FILE = path.join(CCM_DIR, "pet-generation-jobs.json");
const RUNS_DIR = path.join(CCM_DIR, "pet-generation");
const HATCH_SKILL_PATH = path.join(CCM_DIR, "..", ".codex", "skills", "hatch-pet", "SKILL.md");
const activeProcesses = new Map<string, any>();
const progressWatchers = new Map<string, any>();
const pendingQueue: string[] = [];
const MAX_CONCURRENT_GENERATIONS = 1;
let configChangedNotifier: (() => void) | null = null;
let lifecycleNotifier: ((job: PetGenerationJob) => void) | null = null;
let cachedPetCodexRuntime: { command: string; version: string; semanticVersion: string } | null | undefined;

function quoteShellArg(value: string) {
  return `"${String(value || "").replace(/"/g, '\\"')}"`;
}

function semanticVersionParts(value: string) {
  const match = String(value || "").match(/\b(\d+)\.(\d+)\.(\d+)(?:[-+]([^\s]+))?/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] ? 0 : 1] : [0, 0, 0, 0];
}

function compareSemanticVersions(left: string, right: string) {
  const a = semanticVersionParts(left);
  const b = semanticVersionParts(right);
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

function discoverPatchedCodexExecutables(root: string, maxDepth = 9) {
  const results: string[] = [];
  const visit = (directory: string, depth: number) => {
    if (depth > maxDepth || results.length >= 20) return;
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (results.length >= 20) break;
      if (entry.isSymbolicLink()) continue;
      const candidate = path.join(directory, entry.name);
      if (entry.isFile() && /^codex\.exe$/i.test(entry.name) && /codexpatched/i.test(candidate)) {
        results.push(candidate);
      } else if (entry.isDirectory()) {
        visit(candidate, depth + 1);
      }
    }
  };
  if (fs.existsSync(root)) visit(root, 0);
  return results;
}

function probeCodexRuntime(command: string) {
  try {
    const absolute = path.isAbsolute(command);
    const result = spawnSync(command, ["--version"], {
      windowsHide: true,
      encoding: "utf-8",
      timeout: 15_000,
      shell: process.platform === "win32" && !absolute,
    });
    const version = String(result.stdout || result.stderr || "").trim().split(/\r?\n/)[0].slice(0, 160);
    const semanticVersion = version.match(/\b\d+(?:\.\d+){2}(?:[-+][0-9A-Za-z.-]+)?/)?.[0] || "";
    return result.status === 0 && semanticVersion ? { command, version, semanticVersion } : null;
  } catch {
    return null;
  }
}

function resolvePetCodexRuntime() {
  if (cachedPetCodexRuntime !== undefined) return cachedPetCodexRuntime;
  const explicit = [process.env.CCM_PET_CODEX_COMMAND, process.env.CCM_CODEX_COMMAND]
    .map(value => String(value || "").trim())
    .filter(Boolean);
  const documentsRoot = path.join(os.homedir(), "Documents", "Codex");
  const candidates = Array.from(new Set([
    ...explicit,
    ...discoverPatchedCodexExecutables(documentsRoot),
    "codex",
  ]));
  const available = candidates.map(probeCodexRuntime).filter(Boolean) as Array<{ command: string; version: string; semanticVersion: string }>;
  available.sort((left, right) => compareSemanticVersions(right.semanticVersion, left.semanticVersion));
  cachedPetCodexRuntime = available[0] || null;
  return cachedPetCodexRuntime;
}

function buildPetCodexCommand(promptPath: string, runtime: { command: string }) {
  const executable = path.isAbsolute(runtime.command) ? quoteShellArg(runtime.command) : runtime.command;
  const input = process.platform === "win32" ? `type ${quoteShellArg(promptPath)}` : `cat ${quoteShellArg(promptPath)}`;
  return `${input} | ${executable} exec --sandbox danger-full-access --ephemeral --skip-git-repo-check -`;
}

function petGenerationExitError(job: PetGenerationJob, code: number | null, signal: string | null) {
  let log = "";
  try { log = fs.readFileSync(job.logPath, "utf-8").slice(-12_000); } catch {}
  if (/failed to parse model_catalog_json|unknown variant [`'"](max|ultra)/i.test(log)) {
    return "Codex CLI 与当前模型目录不兼容，请升级 Codex CLI 后重试";
  }
  if (/requires a newer version of Codex|upgrade to the latest app or CLI/i.test(log)) {
    return "当前 Codex CLI 版本过旧，无法使用所选模型，请升级后重试";
  }
  if (/image[_ -]?gen|image generation/i.test(log) && /not found|unavailable|missing|disabled/i.test(log)) {
    return "当前 Codex 运行时没有可用的图像生成能力";
  }
  return `Codex 生成进程退出：${code ?? signal ?? "unknown"}`;
}

export function setPetGenerationConfigChangedNotifier(notifier: (() => void) | null) {
  configChangedNotifier = notifier;
}

export function setPetGenerationLifecycleNotifier(notifier: ((job: PetGenerationJob) => void) | null) {
  lifecycleNotifier = notifier;
}

function readJobs(): PetGenerationJob[] {
  try {
    if (!fs.existsSync(JOBS_FILE)) return [];
    const rows = JSON.parse(fs.readFileSync(JOBS_FILE, "utf-8"));
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeJsonAtomic(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

function saveJobs(rows: PetGenerationJob[]) {
  writeJsonAtomic(JOBS_FILE, rows.slice(-100));
}

function patchJob(id: string, patch: Partial<PetGenerationJob>) {
  const rows = readJobs();
  const index = rows.findIndex(item => item.id === id);
  if (index < 0) return null;
  rows[index] = { ...rows[index], ...patch, updatedAt: new Date().toISOString() };
  saveJobs(rows);
  try { lifecycleNotifier?.(rows[index]); } catch {}
  return rows[index];
}

function safePetId(value: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return normalized || `pet-${Date.now().toString(36)}`;
}

function isPathInside(root: string, candidate: string) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return !!relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function validateReferencePath(referencePath: string) {
  const resolved = path.resolve(String(referencePath || ""));
  if (!resolved || !isPathInside(CCM_DIR, resolved)) throw new Error("参考图片必须来自本次上传的 CCM 附件");
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new Error("参考图片不存在");
  const ext = path.extname(resolved).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) throw new Error("参考图片仅支持 PNG、JPG 或 WebP");
  const size = fs.statSync(resolved).size;
  if (size <= 0 || size > 12 * 1024 * 1024) throw new Error("参考图片必须小于 12 MB");
  return resolved;
}

function readImageDimensions(file: string) {
  const data = fs.readFileSync(file);
  if (data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), format: "png" };
  }
  if (data.length >= 30 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") {
    const chunk = data.toString("ascii", 12, 16);
    if (chunk === "VP8X") {
      const width = 1 + data[24] + (data[25] << 8) + (data[26] << 16);
      const height = 1 + data[27] + (data[28] << 8) + (data[29] << 16);
      return { width, height, format: "webp" };
    }
    if (chunk === "VP8L" && data[20] === 0x2f) {
      const bits = data.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, format: "webp" };
    }
    if (chunk === "VP8 " && data.length >= 30) {
      return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff, format: "webp" };
    }
  }
  throw new Error("无法识别生成图集的图片格式");
}

function buildGenerationPrompt(job: PetGenerationJob) {
  return [
    "为 CCM 生成一个 Codex v2 动画宠物。",
    `必须先完整阅读并遵守 hatch-pet skill：${HATCH_SKILL_PATH}`,
    `参考图片：${job.referencePath}（角色身份与外观参考）`,
    `宠物名称：${job.name}`,
    `宠物描述：${job.description || "根据参考图保留角色特征，制作适合桌面陪伴的宠物"}`,
    `风格：${job.style || "auto"}`,
    `工作目录：${job.runDir}`,
    "",
    "必须完成真实图像生成和 hatch-pet 全套 QA，不得使用占位图、复制同一帧、CSS 变形或程序绘制代替动作生成。",
    "最终必须生成 Codex v2 包：final/pet.json 与 final/spritesheet.webp。",
    "pet.json 必须包含 spriteVersionNumber=2，图集必须是 1536x2288、8x11、单格 192x208、透明背景。",
    "必须包含 idle、running-right、running-left、waving、jumping、failed、waiting、running、review 九组动作以及 16 个观察方向。",
    "必须保留验收证据：final/validation-extended.json、qa/review.json、qa/direction-semantics.json、qa/direction-blind-validation.json、qa/contact-sheet-extended.png 与 qa/previews 下的九组动作预览；所有门禁必须通过。",
    `最终 pet.json 的 id 必须为 ${job.petId}，displayName 必须为 ${JSON.stringify(job.name)}。`,
    "在关键阶段更新 progress.json，格式：{\"stage\":\"preparing|base|poses|directions|qa|completed\",\"progress\":0-100,\"message\":\"面向用户的简短中文进度\"}。",
    "不要修改 CCM 源码、pets.json 或已安装宠物；安装由 CCM 在校验成功后完成。",
    "结束时只需说明 final/pet.json 与 final/spritesheet.webp 是否生成并通过校验。",
  ].join("\n");
}

function verifyGeneratedPackage(job: PetGenerationJob) {
  const finalDir = path.join(job.runDir, "final");
  const manifestPath = path.join(finalDir, "pet.json");
  if (!fs.existsSync(manifestPath)) throw new Error("生成任务没有产出 final/pet.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  if (Number(manifest.spriteVersionNumber) !== 2) throw new Error("生成宠物不是 Codex v2 图集");
  const spriteName = path.basename(String(manifest.spritesheetPath || "spritesheet.webp"));
  const spritePath = path.join(finalDir, spriteName);
  if (!fs.existsSync(spritePath)) throw new Error("生成任务没有产出 spritesheet.webp");
  const dimensions = readImageDimensions(spritePath);
  if (dimensions.width !== 1536 || dimensions.height !== 2288) {
    throw new Error(`宠物图集尺寸错误：${dimensions.width}x${dimensions.height}，需要 1536x2288`);
  }
  const requiredJson = (relative: string) => {
    const file = path.join(job.runDir, relative);
    if (!fs.existsSync(file)) throw new Error(`缺少动作验收证据：${relative}`);
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  };
  const validation = requiredJson(path.join("final", "validation-extended.json"));
  if (validation.ok !== true) throw new Error("扩展动作图集校验未通过");
  const review = requiredJson(path.join("qa", "review.json"));
  if (review.ok === false || (Array.isArray(review.errors) && review.errors.length)) throw new Error("动作逐帧 QA 未通过");
  const semantics = requiredJson(path.join("qa", "direction-semantics.json"));
  const semanticsText = JSON.stringify(semantics);
  const verdictCount = (semanticsText.match(/"verdict"\s*:/g) || []).length;
  if (verdictCount < 16 || /"verdict"\s*:\s*"fail"/i.test(semanticsText)) throw new Error("16 个观察方向的语义验收未通过");
  const blind = requiredJson(path.join("qa", "direction-blind-validation.json"));
  if (blind.ok !== true) throw new Error("观察方向盲测未通过");
  const contactSheet = path.join(job.runDir, "qa", "contact-sheet-extended.png");
  if (!fs.existsSync(contactSheet)) throw new Error("缺少最终动作联络表");
  const previewsDir = path.join(job.runDir, "qa", "previews");
  const previewCount = fs.existsSync(previewsDir)
    ? fs.readdirSync(previewsDir).filter(file => /\.(gif|webp|png)$/i.test(file)).length
    : 0;
  if (previewCount < 9) throw new Error(`动作预览不完整：仅找到 ${previewCount}/9 组`);
  return { manifest: { ...manifest, id: job.petId, displayName: job.name, spriteVersionNumber: 2, spritesheetPath: "spritesheet.webp" }, spritePath, dimensions };
}

function installGeneratedPackage(job: PetGenerationJob, verified: any) {
  const relativeDir = path.join("generated", job.petId);
  const targets = [
    path.join(PUBLIC_DIR, "pets", relativeDir),
    path.resolve(__dirname, "..", "..", "..", "pet", "assets", relativeDir),
  ];
  const devWebRoot = path.resolve(PUBLIC_DIR, "..", "..", "frontend", "public", "pets", relativeDir);
  if (fs.existsSync(path.resolve(PUBLIC_DIR, "..", "..", "frontend"))) targets.push(devWebRoot);
  for (const target of targets) {
    fs.mkdirSync(target, { recursive: true });
    fs.copyFileSync(verified.spritePath, path.join(target, "spritesheet.webp"));
    fs.writeFileSync(path.join(target, "pet.json"), JSON.stringify(verified.manifest, null, 2), "utf-8");
  }

  let config: any = { configs: {}, positions: {}, customTypes: [] };
  try { if (fs.existsSync(PETS_FILE)) config = { ...config, ...JSON.parse(fs.readFileSync(PETS_FILE, "utf-8")) }; } catch {}
  const customTypes = Array.isArray(config.customTypes) ? config.customTypes.filter((item: any) => item?.id !== job.petId) : [];
  const skin = {
    id: job.petId,
    name: job.name,
    description: job.description,
    format: "webp",
    generated: true,
    spriteVersionNumber: 2,
    spritesheetPath: `generated/${job.petId}/spritesheet.webp`,
    manifestPath: `generated/${job.petId}/pet.json`,
    referencePath: job.referencePath,
    createdAt: new Date().toISOString(),
  };
  config.customTypes = [...customTypes, skin];
  config.configs = config.configs || {};
  config.configs[job.targetAgent] = { ...(config.configs[job.targetAgent] || {}), type: job.petId, enabled: true };
  writeJsonAtomic(PETS_FILE, config);
  return skin;
}

function stopProgressWatcher(jobId: string) {
  const timer = progressWatchers.get(jobId);
  if (timer) clearInterval(timer);
  progressWatchers.delete(jobId);
}

function watchProgress(job: PetGenerationJob) {
  const progressPath = path.join(job.runDir, "progress.json");
  let lastRaw = "";
  const timer = setInterval(() => {
    try {
      if (!fs.existsSync(progressPath)) return;
      const raw = fs.readFileSync(progressPath, "utf-8");
      if (!raw || raw === lastRaw) return;
      lastRaw = raw;
      const progress = JSON.parse(raw);
      patchJob(job.id, {
        status: progress.stage === "completed" ? "validating" : "generating",
        stageLabel: String(progress.message || "正在生成宠物动作"),
        progress: Math.max(5, Math.min(94, Number(progress.progress || 5))),
      });
    } catch {}
  }, 3000);
  progressWatchers.set(job.id, timer);
}

function runGenerationJob(job: PetGenerationJob) {
  const runtime = resolvePetCodexRuntime();
  if (!runtime) {
    patchJob(job.id, { status: "failed", stageLabel: "无法启动生成", error: "未检测到 Codex CLI，无法使用 hatch-pet 生成动作图集" });
    queueMicrotask(pumpGenerationQueue);
    return;
  }
  fs.writeFileSync(job.promptPath, buildGenerationPrompt(job), "utf-8");
  const command = buildPetCodexCommand(job.promptPath, runtime);
  fs.writeFileSync(job.logPath, `[CCM] 使用 ${runtime.version} 生成宠物\n`, { encoding: "utf-8", flag: "a" });
  const out = fs.openSync(job.logPath, "a");
  const child = spawn(command, [], {
    cwd: job.runDir,
    shell: true,
    windowsHide: true,
    detached: process.platform !== "win32",
    stdio: ["ignore", out, out],
    env: { ...process.env },
  });
  activeProcesses.set(job.id, child);
  patchJob(job.id, { status: "generating", stageLabel: "正在根据参考图生成角色与动作", progress: 8, pid: child.pid });
  watchProgress(job);
  child.on("error", (error: any) => {
    activeProcesses.delete(job.id);
    stopProgressWatcher(job.id);
    try { fs.closeSync(out); } catch {}
    patchJob(job.id, { status: "failed", stageLabel: "生成进程启动失败", error: error?.message || String(error) });
    pumpGenerationQueue();
  });
  child.on("exit", (code: number | null, signal: string | null) => {
    activeProcesses.delete(job.id);
    stopProgressWatcher(job.id);
    try { fs.closeSync(out); } catch {}
    const current = getPetGenerationJob(job.id);
    if (current?.status === "cancelled") return;
    if (code !== 0) {
      patchJob(job.id, { status: "failed", stageLabel: "宠物生成失败", progress: Math.min(95, current?.progress || 0), error: petGenerationExitError(job, code, signal) });
      pumpGenerationQueue();
      return;
    }
    try {
      patchJob(job.id, { status: "validating", stageLabel: "正在校验动作图集", progress: 95 });
      const verified = verifyGeneratedPackage(job);
      patchJob(job.id, { status: "installing", stageLabel: "正在安装新宠物", progress: 98, manifest: verified.manifest });
      const installed = installGeneratedPackage(job, verified);
      patchJob(job.id, { status: "completed", stageLabel: "宠物已生成并应用", progress: 100, completedAt: new Date().toISOString(), manifest: verified.manifest, installed });
      try { configChangedNotifier?.(); } catch {}
    } catch (error: any) {
      patchJob(job.id, { status: "failed", stageLabel: "生成结果未通过校验", error: error?.message || String(error) });
    }
    pumpGenerationQueue();
  });
}

function pumpGenerationQueue() {
  while (activeProcesses.size < MAX_CONCURRENT_GENERATIONS && pendingQueue.length) {
    const id = pendingQueue.shift()!;
    const job = getPetGenerationJob(id);
    if (!job || job.status !== "queued") continue;
    runGenerationJob(job);
  }
}

function enqueueGenerationJob(job: PetGenerationJob) {
  if (!pendingQueue.includes(job.id) && !activeProcesses.has(job.id)) pendingQueue.push(job.id);
  pumpGenerationQueue();
}

export function createPetGenerationJob(input: {
  referencePath: string;
  name?: string;
  description?: string;
  style?: string;
  targetAgent?: string;
}) {
  const source = validateReferencePath(input.referencePath);
  const id = `petgen_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
  const name = String(input.name || path.basename(source, path.extname(source)) || "我的宠物").trim().slice(0, 40);
  const petId = safePetId(`${name}-${crypto.randomBytes(2).toString("hex")}`);
  const runDir = path.join(RUNS_DIR, id);
  fs.mkdirSync(runDir, { recursive: true });
  const referencePath = path.join(runDir, `reference${path.extname(source).toLowerCase()}`);
  fs.copyFileSync(source, referencePath);
  const now = new Date().toISOString();
  const job: PetGenerationJob = {
    id,
    petId,
    name,
    description: String(input.description || "").trim().slice(0, 300),
    style: String(input.style || "auto").trim().slice(0, 40),
    targetAgent: input.targetAgent === "music-agent" ? "music-agent" : "global-agent",
    status: "queued",
    stageLabel: "已进入宠物生成队列",
    progress: 0,
    referencePath,
    runDir,
    promptPath: path.join(runDir, "generation-prompt.md"),
    logPath: path.join(runDir, "generator.log"),
    createdAt: now,
    updatedAt: now,
  };
  const rows = readJobs();
  rows.push(job);
  saveJobs(rows);
  setTimeout(() => enqueueGenerationJob(job), 10);
  return job;
}

export function listPetGenerationJobs() {
  return readJobs().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function toPublicPetGenerationJob(job: PetGenerationJob | null) {
  if (!job) return null;
  return {
    id: job.id,
    petId: job.petId,
    name: job.name,
    description: job.description,
    style: job.style,
    targetAgent: job.targetAgent,
    status: job.status,
    stageLabel: job.stageLabel,
    progress: job.progress,
    error: job.error || "",
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    installed: job.installed ? {
      id: job.installed.id,
      name: job.installed.name,
      spriteVersionNumber: job.installed.spriteVersionNumber,
      spritesheetPath: job.installed.spritesheetPath,
    } : undefined,
  };
}

export function getPetGenerationJob(id: string) {
  return readJobs().find(item => item.id === id) || null;
}

export function cancelPetGenerationJob(id: string) {
  const job = getPetGenerationJob(id);
  if (!job) throw new Error("宠物生成任务不存在");
  if (["completed", "failed", "cancelled"].includes(job.status)) return job;
  const child = activeProcesses.get(id);
  if (child) {
    try {
      if (process.platform === "win32" && child.pid) {
        spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      } else if (child.pid) {
        process.kill(-child.pid, "SIGTERM");
      } else child.kill();
    } catch { try { child.kill(); } catch {} }
  }
  const queueIndex = pendingQueue.indexOf(id);
  if (queueIndex >= 0) pendingQueue.splice(queueIndex, 1);
  activeProcesses.delete(id);
  stopProgressWatcher(id);
  const cancelled = patchJob(id, { status: "cancelled", stageLabel: "已取消宠物生成", error: "" });
  setTimeout(pumpGenerationQueue, 50);
  return cancelled;
}

export function retryPetGenerationJob(id: string) {
  const job = getPetGenerationJob(id);
  if (!job) throw new Error("宠物生成任务不存在");
  if (!["failed", "cancelled"].includes(job.status)) throw new Error("当前任务状态不能重试");
  for (const relative of ["final", "qa", "progress.json"]) {
    try { fs.rmSync(path.join(job.runDir, relative), { recursive: true, force: true }); } catch {}
  }
  const next = patchJob(id, { status: "queued", stageLabel: "已重新进入生成队列", progress: 0, error: "", pid: undefined });
  if (next) setTimeout(() => enqueueGenerationJob(next), 10);
  return next;
}

export function recoverPetGenerationJobs() {
  const rows = readJobs();
  let recovered = 0;
  for (const job of rows) {
    if (["preparing", "generating", "validating", "installing"].includes(job.status)) {
      job.status = "failed";
      job.stageLabel = "服务重启后等待重试";
      job.error = "宠物生成进程因 CCM 服务重启而中断，可点击重试继续";
      job.updatedAt = new Date().toISOString();
      recovered++;
    }
  }
  if (recovered) saveJobs(rows);
  for (const job of rows) {
    if (job.status === "queued") setTimeout(() => enqueueGenerationJob(job), 10);
  }
  return { recovered };
}

export function runPetGenerationContractSelfTest() {
  const dimensions = (width: number, height: number) => width === 1536 && height === 2288;
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-pet-generation-contract-"));
  const makeJob = (name: string): PetGenerationJob => {
    const runDir = path.join(fixtureRoot, name);
    fs.mkdirSync(path.join(runDir, "final"), { recursive: true });
    return {
      id: name, petId: name, name, description: "", style: "auto", targetAgent: "global-agent",
      status: "validating", stageLabel: "test", progress: 95, referencePath: "", runDir,
      promptPath: path.join(runDir, "prompt.md"), logPath: path.join(runDir, "log.txt"),
      createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(),
    };
  };
  const writePngHeader = (file: string, width: number, height: number) => {
    const buffer = Buffer.alloc(24);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer, 0);
    buffer.writeUInt32BE(width, 16);
    buffer.writeUInt32BE(height, 20);
    fs.writeFileSync(file, buffer);
  };
  const writeQaFixtures = (job: PetGenerationJob) => {
    const qaDir = path.join(job.runDir, "qa");
    const previewsDir = path.join(qaDir, "previews");
    fs.mkdirSync(previewsDir, { recursive: true });
    fs.writeFileSync(path.join(job.runDir, "final", "validation-extended.json"), JSON.stringify({ ok: true }));
    fs.writeFileSync(path.join(qaDir, "review.json"), JSON.stringify({ ok: true, errors: [] }));
    fs.writeFileSync(path.join(qaDir, "direction-semantics.json"), JSON.stringify({ directions: Array.from({ length: 16 }, (_, index) => ({ direction: index, verdict: "pass" })) }));
    fs.writeFileSync(path.join(qaDir, "direction-blind-validation.json"), JSON.stringify({ ok: true }));
    fs.writeFileSync(path.join(qaDir, "contact-sheet-extended.png"), "fixture");
    for (let index = 0; index < 9; index++) fs.writeFileSync(path.join(previewsDir, `${index}.gif`), "fixture");
  };
  let rejectsV1 = false;
  let rejectsWrongDimensions = false;
  let acceptsV2 = false;
  let catalogErrorFriendly = false;
  try {
    const v1 = makeJob("v1");
    fs.writeFileSync(path.join(v1.runDir, "final", "pet.json"), JSON.stringify({ spriteVersionNumber: 1, spritesheetPath: "spritesheet.webp" }));
    writePngHeader(path.join(v1.runDir, "final", "spritesheet.webp"), 1536, 2288);
    try { verifyGeneratedPackage(v1); } catch { rejectsV1 = true; }

    const wrong = makeJob("wrong-size");
    fs.writeFileSync(path.join(wrong.runDir, "final", "pet.json"), JSON.stringify({ spriteVersionNumber: 2, spritesheetPath: "spritesheet.webp" }));
    writePngHeader(path.join(wrong.runDir, "final", "spritesheet.webp"), 1536, 1872);
    try { verifyGeneratedPackage(wrong); } catch { rejectsWrongDimensions = true; }

    const valid = makeJob("valid-v2");
    fs.writeFileSync(path.join(valid.runDir, "final", "pet.json"), JSON.stringify({ spriteVersionNumber: 2, spritesheetPath: "spritesheet.webp" }));
    writePngHeader(path.join(valid.runDir, "final", "spritesheet.webp"), 1536, 2288);
    writeQaFixtures(valid);
    acceptsV2 = verifyGeneratedPackage(valid).manifest.spriteVersionNumber === 2;

    const catalogError = makeJob("catalog-error");
    fs.writeFileSync(catalogError.logPath, "failed to parse model_catalog_json: unknown variant `max`");
    catalogErrorFriendly = petGenerationExitError(catalogError, 1, null).includes("模型目录不兼容");
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
  const checks = {
    only_codex_v2_dimensions: dimensions(1536, 2288) && !dimensions(1536, 1872),
    rejects_v1_manifest: rejectsV1,
    rejects_intermediate_atlas_dimensions: rejectsWrongDimensions,
    accepts_valid_v2_package: acceptsV2,
    hatch_pet_skill_available: fs.existsSync(HATCH_SKILL_PATH),
    generated_skin_targets_system_agents: ["global-agent", "music-agent"].every(item => ["global-agent", "music-agent"].includes(item)),
    reference_path_is_workspace_scoped: !isPathInside(CCM_DIR, path.resolve(CCM_DIR, "..", "outside.png")),
    all_terminal_states_supported: ["completed", "failed", "cancelled"].every(status => ["completed", "failed", "cancelled"].includes(status)),
    semantic_version_prefers_newer_runtime: compareSemanticVersions("0.144.0-alpha.4", "0.115.0") > 0,
    launch_command_preserves_ephemeral_full_access: buildPetCodexCommand("C:\\tmp\\prompt.md", { command: "C:\\tmp\\codex.exe" }).includes("--sandbox danger-full-access --ephemeral --skip-git-repo-check"),
    catalog_incompatibility_is_actionable: catalogErrorFriendly,
  };
  return { schema: "ccm-pet-generation-contract-selftest-v1", pass: Object.values(checks).every(Boolean), checks };
}
