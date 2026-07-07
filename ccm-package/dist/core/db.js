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
exports.AGENTS = exports.SKILL_PACKAGES_DIR = exports.SKILLS_DIR = exports.MCP_DIR = void 0;
exports.getConfigs = getConfigs;
exports.getConfigInfo = getConfigInfo;
exports.isRunning = isRunning;
exports.getPid = getPid;
exports.loadMcpTools = loadMcpTools;
exports.saveMcpTool = saveMcpTool;
exports.deleteMcpTool = deleteMcpTool;
exports.loadSkills = loadSkills;
exports.saveSkill = saveSkill;
exports.deleteSkill = deleteSkill;
exports.loadMetrics = loadMetrics;
exports.saveMetrics = saveMetrics;
exports.recordMetric = recordMetric;
exports.loadTasks = loadTasks;
exports.saveTasks = saveTasks;
exports.loadTemplates = loadTemplates;
exports.saveTemplates = saveTemplates;
exports.loadProjectConfigs = loadProjectConfigs;
exports.saveProjectConfigs = saveProjectConfigs;
exports.loadMusicConfig = loadMusicConfig;
exports.saveMusicConfig = saveMusicConfig;
exports.loadFeishuConfig = loadFeishuConfig;
exports.saveFeishuConfig = saveFeishuConfig;
exports.loadCronJobs = loadCronJobs;
exports.saveCronJobs = saveCronJobs;
exports.loadDevReports = loadDevReports;
exports.saveDevReports = saveDevReports;
exports.loadDevWeeklyReports = loadDevWeeklyReports;
exports.saveDevWeeklyReports = saveDevWeeklyReports;
exports.loadAutoDevNotifyConfig = loadAutoDevNotifyConfig;
exports.saveAutoDevNotifyConfig = saveAutoDevNotifyConfig;
exports.loadRagWatchPaths = loadRagWatchPaths;
exports.saveRagWatchPaths = saveRagWatchPaths;
exports.loadRagMetadata = loadRagMetadata;
exports.saveRagMetadata = saveRagMetadata;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const credential_store_1 = require("./credential-store");
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
const RAG_WATCH_PATHS_FILE = path.join(CCM_DIR, "rag-watch-paths.json");
const RAG_METADATA_FILE = path.join(CCM_DIR, "knowledge-metadata.json");
// === 本地工具和技能目录 ===
exports.MCP_DIR = path.join(CCM_DIR, "mcp");
exports.SKILLS_DIR = path.join(CCM_DIR, "skills");
exports.SKILL_PACKAGES_DIR = path.join(CCM_DIR, "skill-packages");
// 确保基础目录存在
if (!fs.existsSync(exports.MCP_DIR))
    fs.mkdirSync(exports.MCP_DIR, { recursive: true });
if (!fs.existsSync(exports.SKILLS_DIR))
    fs.mkdirSync(exports.SKILLS_DIR, { recursive: true });
if (!fs.existsSync(exports.SKILL_PACKAGES_DIR))
    fs.mkdirSync(exports.SKILL_PACKAGES_DIR, { recursive: true });
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}.tmp`;
    if (fs.existsSync(file)) {
        try {
            fs.copyFileSync(file, `${file}.bak`);
        }
        catch { }
    }
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
// === 代理类型定义 ===
exports.AGENTS = [
    { type: "claudecode", name: "Claude Code" },
    { type: "cursor", name: "Cursor" },
    { type: "gemini", name: "Gemini CLI" },
    { type: "codex", name: "Codex" },
    { type: "qoder", name: "Qoder CLI" },
];
// === 获取配置列表 ===
function getConfigs() {
    if (!fs.existsSync(CONFIGS_DIR))
        return [];
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
function getConfigInfo(configPath) {
    const content = fs.readFileSync(configPath, "utf-8");
    const projects = [];
    const lines = content.split("\n");
    let currentProject = null;
    let inPlatformsBlock = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === "[[projects]]") {
            if (currentProject && currentProject.name)
                projects.push(currentProject);
            currentProject = {};
            inPlatformsBlock = false;
        }
        if (currentProject && trimmed.startsWith("name = "))
            currentProject.name = trimmed.split("=")[1].trim().replace(/"/g, "");
        if (currentProject && trimmed.startsWith("work_dir = "))
            currentProject.workDir = trimmed.split("=")[1].trim().replace(/"/g, "").replace(/\\\\/g, "\\");
        if (currentProject && trimmed.startsWith("type = ") && !inPlatformsBlock) {
            const v = trimmed.split("=")[1].trim().replace(/"/g, "");
            if (exports.AGENTS.find((a) => a.type === v))
                currentProject.agent = v;
        }
        if (trimmed === "[[projects.platforms]]") {
            inPlatformsBlock = true;
        }
        else if (trimmed.startsWith("[") && !trimmed.startsWith("[projects.platforms")) {
            inPlatformsBlock = false;
        }
        if (currentProject && inPlatformsBlock && trimmed.startsWith("type = ")) {
            const pt = trimmed.split("=")[1].trim().replace(/"/g, "");
            const map = { weixin: "微信", feishu: "飞书", lark: "Lark", telegram: "Telegram", slack: "Slack", discord: "Discord", dingtalk: "钉钉" };
            currentProject.platform = map[pt] || pt;
            inPlatformsBlock = false;
        }
        if (currentProject && (trimmed === "[[commands]]" || trimmed === "[[aliases]]")) {
            if (currentProject.name)
                projects.push(currentProject);
            currentProject = null;
        }
    }
    if (currentProject && currentProject.name)
        projects.push(currentProject);
    return projects;
}
// === 项目进程运行状态 ===
function isRunning(name) {
    const pidFile = path.join(PID_DIR, `${name}.pid`);
    if (!fs.existsSync(pidFile))
        return false;
    const pid = fs.readFileSync(pidFile, "utf-8").trim();
    try {
        process.kill(parseInt(pid), 0);
        return true;
    }
    catch {
        try {
            fs.unlinkSync(pidFile);
        }
        catch { }
        return false;
    }
}
function getPid(name) {
    const pidFile = path.join(PID_DIR, `${name}.pid`);
    if (!fs.existsSync(pidFile))
        return null;
    return fs.readFileSync(pidFile, "utf-8").trim();
}
// === MCP Tools ===
function loadMcpTools() {
    try {
        const files = fs.readdirSync(exports.MCP_DIR).filter(f => f.endsWith('.json'));
        return files.map(f => {
            try {
                const content = (0, credential_store_1.resolveObjectSecrets)(JSON.parse(fs.readFileSync(path.join(exports.MCP_DIR, f), 'utf-8')));
                return { ...content, filename: f };
            }
            catch {
                return null;
            }
        }).filter(Boolean);
    }
    catch {
        return [];
    }
}
function saveMcpTool(tool) {
    const filename = tool.name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
    const protectedTool = (0, credential_store_1.protectObjectSecrets)(tool, `mcp-${filename.replace(/\.json$/i, "")}`);
    writeJsonAtomic(path.join(exports.MCP_DIR, filename), protectedTool);
}
function deleteMcpTool(name) {
    const filename = name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
    const filePath = path.join(exports.MCP_DIR, filename);
    if (fs.existsSync(filePath))
        fs.unlinkSync(filePath);
}
// === Skills ===
function loadSkills() {
    try {
        const files = fs.readdirSync(exports.SKILLS_DIR).filter(f => f.endsWith('.json'));
        return files.map(f => {
            try {
                const content = JSON.parse(fs.readFileSync(path.join(exports.SKILLS_DIR, f), 'utf-8'));
                return { ...content, filename: f };
            }
            catch {
                return null;
            }
        }).filter(Boolean);
    }
    catch {
        return [];
    }
}
function saveSkill(skill) {
    const filename = skill.name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
    writeJsonAtomic(path.join(exports.SKILLS_DIR, filename), skill);
}
function deleteSkill(name) {
    const filename = name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
    const filePath = path.join(exports.SKILLS_DIR, filename);
    try {
        if (fs.existsSync(filePath)) {
            const skill = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            const packagePath = String(skill?.packagePath || "");
            const relative = packagePath ? path.relative(path.resolve(exports.SKILL_PACKAGES_DIR), path.resolve(packagePath)) : "";
            if (packagePath && relative && !relative.startsWith("..") && !path.isAbsolute(relative) && fs.existsSync(packagePath)) {
                fs.rmSync(packagePath, { recursive: true, force: true });
            }
        }
    }
    catch { }
    if (fs.existsSync(filePath))
        fs.unlinkSync(filePath);
}
// === Metrics ===
function loadMetrics() {
    try {
        if (fs.existsSync(METRICS_FILE)) {
            return JSON.parse(fs.readFileSync(METRICS_FILE, "utf-8"));
        }
    }
    catch { }
    return { agents: {}, daily: {} };
}
function saveMetrics(metrics) {
    try {
        fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
    }
    catch { }
}
function recordMetric(agent, data) {
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
            inputTokens: 0,
            outputTokens: 0,
            totalCost: 0,
            lastCall: null
        };
    }
    const a = metrics.agents[agent];
    a.calls++;
    if (data.success)
        a.successes++;
    else
        a.failures++;
    if (data.durationMs) {
        a.totalMs += data.durationMs;
        a.avgMs = Math.round(a.totalMs / a.calls);
    }
    a.totalFileChanges = (a.totalFileChanges || 0) + (data.fileChangeCount || 0);
    a.lastFileChangeCount = data.fileChangeCount || 0;
    if (data.inputTokens)
        a.inputTokens = (a.inputTokens || 0) + data.inputTokens;
    if (data.outputTokens)
        a.outputTokens = (a.outputTokens || 0) + data.outputTokens;
    if (data.totalCost)
        a.totalCost = (a.totalCost || 0) + data.totalCost;
    a.lastCall = new Date().toISOString();
    if (!metrics.daily[today])
        metrics.daily[today] = {};
    if (!metrics.daily[today][agent]) {
        metrics.daily[today][agent] = {
            calls: 0,
            successes: 0,
            failures: 0,
            totalMs: 0,
            totalFileChanges: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalCost: 0
        };
    }
    const d = metrics.daily[today][agent];
    d.calls++;
    if (data.success)
        d.successes++;
    else
        d.failures++;
    if (data.durationMs)
        d.totalMs += data.durationMs;
    d.totalFileChanges = (d.totalFileChanges || 0) + (data.fileChangeCount || 0);
    if (data.inputTokens)
        d.inputTokens = (d.inputTokens || 0) + data.inputTokens;
    if (data.outputTokens)
        d.outputTokens = (d.outputTokens || 0) + data.outputTokens;
    if (data.totalCost)
        d.totalCost = (d.totalCost || 0) + data.totalCost;
    saveMetrics(metrics);
}
// === Tasks ===
function loadTasks() {
    if (!fs.existsSync(TASKS_FILE))
        return [];
    try {
        return JSON.parse(fs.readFileSync(TASKS_FILE, "utf-8"));
    }
    catch {
        try {
            const recovered = JSON.parse(fs.readFileSync(`${TASKS_FILE}.bak`, "utf-8"));
            if (Array.isArray(recovered)) {
                saveTasks(recovered);
                return recovered;
            }
        }
        catch { }
        return [];
    }
}
function saveTasks(tasks) {
    writeJsonAtomic(TASKS_FILE, tasks);
}
// === Dialogue Templates ===
function loadTemplates() {
    try {
        if (fs.existsSync(TEMPLATES_FILE)) {
            return JSON.parse(fs.readFileSync(TEMPLATES_FILE, "utf-8"));
        }
    }
    catch { }
    return [];
}
function saveTemplates(templates) {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
}
// === Project Configs ===
function loadProjectConfigs() {
    try {
        if (fs.existsSync(PROJECT_CONFIGS_FILE)) {
            return JSON.parse(fs.readFileSync(PROJECT_CONFIGS_FILE, "utf-8"));
        }
    }
    catch { }
    return {};
}
function saveProjectConfigs(configs) {
    fs.writeFileSync(PROJECT_CONFIGS_FILE, JSON.stringify(configs, null, 2));
}
// === Music Config ===
function loadMusicConfig() {
    try {
        if (fs.existsSync(MUSIC_CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(MUSIC_CONFIG_FILE, "utf-8"));
        }
    }
    catch { }
    return {
        source: "bili",
        playMode: "loop",
        quality: "high"
    };
}
function saveMusicConfig(cfg) {
    fs.writeFileSync(MUSIC_CONFIG_FILE, JSON.stringify(cfg, null, 2));
}
// === Feishu Config ===
function loadFeishuConfig() {
    try {
        if (fs.existsSync(FEISHU_CONFIG_FILE)) {
            return (0, credential_store_1.resolveObjectSecrets)(JSON.parse(fs.readFileSync(FEISHU_CONFIG_FILE, "utf-8")));
        }
    }
    catch { }
    return {};
}
function saveFeishuConfig(config) {
    const protectedConfig = (0, credential_store_1.protectObjectSecrets)(config, "feishu-global");
    fs.mkdirSync(path.dirname(FEISHU_CONFIG_FILE), { recursive: true });
    const temp = `${FEISHU_CONFIG_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(protectedConfig, null, 2), "utf-8");
    fs.renameSync(temp, FEISHU_CONFIG_FILE);
    // The generic atomic writer preserves the previous file verbatim. Credentials
    // are different: both the live file and its recovery copy must be protected.
    fs.writeFileSync(`${FEISHU_CONFIG_FILE}.bak`, JSON.stringify(protectedConfig, null, 2), "utf-8");
}
// === Cron Jobs ===
function loadCronJobs() {
    if (!fs.existsSync(CRON_FILE))
        return [];
    try {
        return JSON.parse(fs.readFileSync(CRON_FILE, "utf-8"));
    }
    catch {
        try {
            const recovered = JSON.parse(fs.readFileSync(`${CRON_FILE}.bak`, "utf-8"));
            return Array.isArray(recovered) ? recovered : [];
        }
        catch {
            return [];
        }
    }
}
function saveCronJobs(jobs) {
    writeJsonAtomic(CRON_FILE, jobs);
}
// === Auto Dev Daily Reports ===
function loadDevReports() {
    if (!fs.existsSync(DEV_REPORTS_FILE))
        return [];
    try {
        const parsed = JSON.parse(fs.readFileSync(DEV_REPORTS_FILE, "utf-8"));
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function saveDevReports(reports) {
    fs.writeFileSync(DEV_REPORTS_FILE, JSON.stringify(reports, null, 2));
}
function loadDevWeeklyReports() {
    if (!fs.existsSync(DEV_WEEKLY_REPORTS_FILE))
        return [];
    try {
        const parsed = JSON.parse(fs.readFileSync(DEV_WEEKLY_REPORTS_FILE, "utf-8"));
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function saveDevWeeklyReports(reports) {
    fs.writeFileSync(DEV_WEEKLY_REPORTS_FILE, JSON.stringify(reports, null, 2));
}
function loadAutoDevNotifyConfig() {
    if (!fs.existsSync(AUTO_DEV_NOTIFY_FILE))
        return {};
    try {
        const parsed = JSON.parse(fs.readFileSync(AUTO_DEV_NOTIFY_FILE, "utf-8"));
        return parsed && typeof parsed === "object" ? parsed : {};
    }
    catch {
        return {};
    }
}
function saveAutoDevNotifyConfig(config) {
    fs.writeFileSync(AUTO_DEV_NOTIFY_FILE, JSON.stringify(config || {}, null, 2));
}
// === RAG Watch Paths ===
function loadRagWatchPaths() {
    if (!fs.existsSync(RAG_WATCH_PATHS_FILE))
        return [];
    try {
        const parsed = JSON.parse(fs.readFileSync(RAG_WATCH_PATHS_FILE, "utf-8"));
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function saveRagWatchPaths(paths) {
    fs.writeFileSync(RAG_WATCH_PATHS_FILE, JSON.stringify(paths || [], null, 2));
}
// === RAG Metadata (Tags) ===
function loadRagMetadata() {
    if (!fs.existsSync(RAG_METADATA_FILE))
        return {};
    try {
        const parsed = JSON.parse(fs.readFileSync(RAG_METADATA_FILE, "utf-8"));
        return parsed && typeof parsed === "object" ? parsed : {};
    }
    catch {
        return {};
    }
}
function saveRagMetadata(metadata) {
    fs.writeFileSync(RAG_METADATA_FILE, JSON.stringify(metadata || {}, null, 2));
}
//# sourceMappingURL=db.js.map