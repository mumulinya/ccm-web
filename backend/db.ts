import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const CCM_DIR = path.join(os.homedir(), ".cc-connect");
const CONFIGS_DIR = path.join(CCM_DIR, "configs");
const PID_DIR = path.join(CCM_DIR, "pids");
const TASKS_FILE = path.join(CCM_DIR, "tasks.json");
const CRON_FILE = path.join(CCM_DIR, "cron-jobs.json");
const DEV_REPORTS_FILE = path.join(CCM_DIR, "dev-reports.json");
const DEV_WEEKLY_REPORTS_FILE = path.join(CCM_DIR, "dev-weekly-reports.json");
const AUTO_DEV_NOTIFY_FILE = path.join(CCM_DIR, "auto-dev-notify.json");
const METRICS_FILE = path.join(CCM_DIR, "metrics.json");
const FEISHU_CONFIG_FILE = path.join(CCM_DIR, "feishu-config.json");
const TEMPLATES_FILE = path.join(CCM_DIR, "prompt-templates.json");
const PROJECT_CONFIGS_FILE = path.join(CCM_DIR, "project-configs.json");
const MUSIC_CONFIG_FILE = path.join(CCM_DIR, "music-config.json");

// === 本地工具和技能目录 ===
export const MCP_DIR = path.join(CCM_DIR, "mcp");
export const SKILLS_DIR = path.join(CCM_DIR, "skills");

// 确保基础目录存在
if (!fs.existsSync(MCP_DIR)) fs.mkdirSync(MCP_DIR, { recursive: true });
if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });

// === 代理类型定义 ===
export const AGENTS = [
  { type: "claudecode", name: "Claude Code" },
  { type: "cursor", name: "Cursor" },
  { type: "gemini", name: "Gemini CLI" },
  { type: "codex", name: "Codex" },
  { type: "qoder", name: "Qoder CLI" },
];

// === 获取配置列表 ===
export function getConfigs(): any[] {
  if (!fs.existsSync(CONFIGS_DIR)) return [];
  return fs.readdirSync(CONFIGS_DIR)
    .filter((f) => f.endsWith(".toml"))
    .sort()
    .map((f, i) => ({
      index: i + 1,
      file: f,
      name: f.replace("config-", "").replace(".toml", ""),
      path: path.join(CONFIGS_DIR, f),
    }));
}

// === 解析 TOML 获取项目信息 ===
export function getConfigInfo(configPath: string): any[] {
  const content = fs.readFileSync(configPath, "utf-8");
  const projects: any[] = [];
  const lines = content.split("\n");
  let currentProject: any = null;
  let inPlatformsBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "[[projects]]") {
      if (currentProject && currentProject.name) projects.push(currentProject);
      currentProject = {};
      inPlatformsBlock = false;
    }
    if (currentProject && trimmed.startsWith("name = "))
      currentProject.name = trimmed.split("=")[1].trim().replace(/"/g, "");
    if (currentProject && trimmed.startsWith("work_dir = "))
      currentProject.workDir = trimmed.split("=")[1].trim().replace(/"/g, "").replace(/\\\\/g, "\\");
    if (currentProject && trimmed.startsWith("type = ") && !inPlatformsBlock) {
      const v = trimmed.split("=")[1].trim().replace(/"/g, "");
      if (AGENTS.find((a) => a.type === v)) currentProject.agent = v;
    }
    if (trimmed === "[[projects.platforms]]") {
      inPlatformsBlock = true;
    } else if (trimmed.startsWith("[") && !trimmed.startsWith("[projects.platforms")) {
      inPlatformsBlock = false;
    }
    if (currentProject && inPlatformsBlock && trimmed.startsWith("type = ")) {
      const pt = trimmed.split("=")[1].trim().replace(/"/g, "");
      const map: any = { weixin: "微信", feishu: "飞书", lark: "Lark", telegram: "Telegram", slack: "Slack", discord: "Discord", dingtalk: "钉钉" };
      currentProject.platform = map[pt] || pt;
      inPlatformsBlock = false;
    }
    if (currentProject && (trimmed === "[[commands]]" || trimmed === "[[aliases]]")) {
      if (currentProject.name) projects.push(currentProject);
      currentProject = null;
    }
  }
  if (currentProject && currentProject.name) projects.push(currentProject);
  return projects;
}

// === 项目进程运行状态 ===
export function isRunning(name: string): boolean {
  const pidFile = path.join(PID_DIR, `${name}.pid`);
  if (!fs.existsSync(pidFile)) return false;
  const pid = fs.readFileSync(pidFile, "utf-8").trim();
  try {
    process.kill(parseInt(pid), 0);
    return true;
  } catch {
    try { fs.unlinkSync(pidFile); } catch {}
    return false;
  }
}

export function getPid(name: string): string | null {
  const pidFile = path.join(PID_DIR, `${name}.pid`);
  if (!fs.existsSync(pidFile)) return null;
  return fs.readFileSync(pidFile, "utf-8").trim();
}

// === MCP Tools ===
export function loadMcpTools(): any[] {
  try {
    const files = fs.readdirSync(MCP_DIR).filter(f => f.endsWith('.json'));
    return files.map(f => {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(MCP_DIR, f), 'utf-8'));
        return { ...content, filename: f };
      } catch { return null; }
    }).filter(Boolean) as any[];
  } catch { return []; }
}

export function saveMcpTool(tool: any) {
  const filename = tool.name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
  fs.writeFileSync(path.join(MCP_DIR, filename), JSON.stringify(tool, null, 2));
}

export function deleteMcpTool(name: string) {
  const filename = name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
  const filePath = path.join(MCP_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

// === Skills ===
export function loadSkills(): any[] {
  try {
    const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.json'));
    return files.map(f => {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(SKILLS_DIR, f), 'utf-8'));
        return { ...content, filename: f };
      } catch { return null; }
    }).filter(Boolean) as any[];
  } catch { return []; }
}

export function saveSkill(skill: any) {
  const filename = skill.name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
  fs.writeFileSync(path.join(SKILLS_DIR, filename), JSON.stringify(skill, null, 2));
}

export function deleteSkill(name: string) {
  const filename = name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
  const filePath = path.join(SKILLS_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

// === Metrics ===
export function loadMetrics(): any {
  try {
    if (fs.existsSync(METRICS_FILE)) {
      return JSON.parse(fs.readFileSync(METRICS_FILE, "utf-8"));
    }
  } catch {}
  return { agents: {}, daily: {} };
}

export function saveMetrics(metrics: any) {
  try {
    fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
  } catch {}
}

export function recordMetric(agent: string, data: any) {
  const metrics = loadMetrics();
  const today = new Date().toISOString().slice(0, 10);
  if (!metrics.agents[agent]) {
    metrics.agents[agent] = {
      calls: 0,
      successes: 0,
      failures: 0,
      totalMs: 0,
      avgMs: 0,
      totalFileChanges: 0,
      lastFileChangeCount: 0,
      lastCall: null
    };
  }
  const a = metrics.agents[agent];
  a.calls++;
  if (data.success) a.successes++; else a.failures++;
  if (data.durationMs) {
    a.totalMs += data.durationMs;
    a.avgMs = Math.round(a.totalMs / a.calls);
  }
  a.totalFileChanges = (a.totalFileChanges || 0) + (data.fileChangeCount || 0);
  a.lastFileChangeCount = data.fileChangeCount || 0;
  a.lastCall = new Date().toISOString();
  
  if (!metrics.daily[today]) metrics.daily[today] = {};
  if (!metrics.daily[today][agent]) {
    metrics.daily[today][agent] = {
      calls: 0,
      successes: 0,
      failures: 0,
      totalMs: 0,
      totalFileChanges: 0
    };
  }
  const d = metrics.daily[today][agent];
  d.calls++;
  if (data.success) d.successes++; else d.failures++;
  if (data.durationMs) d.totalMs += data.durationMs;
  d.totalFileChanges = (d.totalFileChanges || 0) + (data.fileChangeCount || 0);

  saveMetrics(metrics);
}

// === Tasks ===
export function loadTasks(): any[] {
  if (!fs.existsSync(TASKS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TASKS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function saveTasks(tasks: any[]) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

// === Dialogue Templates ===
export function loadTemplates(): any[] {
  try {
    if (fs.existsSync(TEMPLATES_FILE)) {
      return JSON.parse(fs.readFileSync(TEMPLATES_FILE, "utf-8"));
    }
  } catch {}
  return [];
}

export function saveTemplates(templates: any[]) {
  fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
}

// === Project Configs ===
export function loadProjectConfigs(): any {
  try {
    if (fs.existsSync(PROJECT_CONFIGS_FILE)) {
      return JSON.parse(fs.readFileSync(PROJECT_CONFIGS_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

export function saveProjectConfigs(configs: any) {
  fs.writeFileSync(PROJECT_CONFIGS_FILE, JSON.stringify(configs, null, 2));
}

// === Music Config ===
export function loadMusicConfig(): any {
  try {
    if (fs.existsSync(MUSIC_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(MUSIC_CONFIG_FILE, "utf-8"));
    }
  } catch {}
  return {
    source: "bili",
    playMode: "loop",
    quality: "high"
  };
}

export function saveMusicConfig(cfg: any) {
  fs.writeFileSync(MUSIC_CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

// === Feishu Config ===
export function loadFeishuConfig(): any {
  try {
    if (fs.existsSync(FEISHU_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(FEISHU_CONFIG_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

export function saveFeishuConfig(config: any) {
  fs.writeFileSync(FEISHU_CONFIG_FILE, JSON.stringify(config, null, 2));
}

// === Cron Jobs ===
export function loadCronJobs(): any[] {
  if (!fs.existsSync(CRON_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(CRON_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function saveCronJobs(jobs: any[]) {
  fs.writeFileSync(CRON_FILE, JSON.stringify(jobs, null, 2));
}

// === Auto Dev Daily Reports ===
export function loadDevReports(): any[] {
  if (!fs.existsSync(DEV_REPORTS_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(DEV_REPORTS_FILE, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDevReports(reports: any[]) {
  fs.writeFileSync(DEV_REPORTS_FILE, JSON.stringify(reports, null, 2));
}

export function loadDevWeeklyReports(): any[] {
  if (!fs.existsSync(DEV_WEEKLY_REPORTS_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(DEV_WEEKLY_REPORTS_FILE, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDevWeeklyReports(reports: any[]) {
  fs.writeFileSync(DEV_WEEKLY_REPORTS_FILE, JSON.stringify(reports, null, 2));
}

export function loadAutoDevNotifyConfig(): any {
  if (!fs.existsSync(AUTO_DEV_NOTIFY_FILE)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(AUTO_DEV_NOTIFY_FILE, "utf-8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveAutoDevNotifyConfig(config: any) {
  fs.writeFileSync(AUTO_DEV_NOTIFY_FILE, JSON.stringify(config || {}, null, 2));
}
