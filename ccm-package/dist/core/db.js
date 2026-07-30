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
exports.isRunningReadOnly = isRunningReadOnly;
exports.getPid = getPid;
exports.loadMcpTools = loadMcpTools;
exports.saveMcpTool = saveMcpTool;
exports.deleteMcpTool = deleteMcpTool;
exports.loadSkills = loadSkills;
exports.saveSkill = saveSkill;
exports.deleteSkill = deleteSkill;
exports.applyMetricToStore = applyMetricToStore;
exports.loadMetrics = loadMetrics;
exports.queryMetricEvents = queryMetricEvents;
exports.saveMetrics = saveMetrics;
exports.recordMetric = recordMetric;
exports.runMetricsAggregationSelfTest = runMetricsAggregationSelfTest;
exports.loadTasks = loadTasks;
exports.saveTasks = saveTasks;
exports.getTaskById = getTaskById;
exports.updateTaskById = updateTaskById;
exports.updateTaskByIdCas = updateTaskByIdCas;
exports.listUsabilityTaskCandidates = listUsabilityTaskCandidates;
exports.listUsabilityArchiveCandidates = listUsabilityArchiveCandidates;
exports.listTasksByParentId = listTasksByParentId;
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
const catalog_1 = require("../agents/catalog");
const os = __importStar(require("os"));
const credential_store_1 = require("./credential-store");
const tool_catalog_management_1 = require("../tools/tool-catalog-management");
const internal_skill_catalog_1 = require("../skills/internal-skill-catalog");
const internal_mcp_registry_1 = require("../tools/internal-mcp-registry");
const runtime_events_1 = require("../system/runtime-events");
const task_store_1 = require("./task-store");
const atomic_json_file_1 = require("./atomic-json-file");
const metrics_v3_1 = require("../system/metrics-v3");
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
// === 代理类型定义 ===
exports.AGENTS = [
    ...catalog_1.DEVELOPMENT_AGENT_CATALOG.map(agent => ({ type: agent.id, name: agent.label })),
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
function isRunningReadOnly(name) {
    const pidFile = path.join(PID_DIR, `${name}.pid`);
    if (!fs.existsSync(pidFile))
        return false;
    const pid = Number(fs.readFileSync(pidFile, "utf-8").trim());
    if (!Number.isInteger(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
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
        const storedTools = files.map(f => {
            try {
                const file = path.join(exports.MCP_DIR, f);
                const stored = JSON.parse(fs.readFileSync(file, 'utf-8'));
                const storedEnvironment = (0, tool_catalog_management_1.normalizeMcpEnvironment)(stored?.env);
                const environment = (0, tool_catalog_management_1.normalizeMcpEnvironment)((0, credential_store_1.resolveObjectSecrets)(storedEnvironment));
                let credentialBindingChanged = false;
                if (String(stored?.name || "") === "mcp-feishu") {
                    const feishu = loadFeishuConfig();
                    const appId = String(feishu?.control_bot_app_id || feishu?.app_id || "").trim();
                    const appSecret = String(feishu?.control_bot_app_secret || feishu?.app_secret || "").trim();
                    const isPlaceholder = (value) => /^(?:your[_-]|placeholder|change[_-]?me|x{3,})/i.test(String(value || "").trim());
                    if ((!environment.FEISHU_APP_ID || isPlaceholder(environment.FEISHU_APP_ID)) && appId) {
                        environment.FEISHU_APP_ID = appId;
                        credentialBindingChanged = true;
                    }
                    if ((!environment.FEISHU_APP_SECRET || isPlaceholder(environment.FEISHU_APP_SECRET)) && appSecret) {
                        environment.FEISHU_APP_SECRET = appSecret;
                        credentialBindingChanged = true;
                    }
                }
                const hasPlainStoredEnvironment = Object.values(storedEnvironment).some(value => value && !(0, credential_store_1.isCredentialReference)(value));
                if (hasPlainStoredEnvironment || credentialBindingChanged) {
                    saveMcpTool({ ...stored, env: environment });
                }
                const content = (0, credential_store_1.resolveObjectSecrets)(hasPlainStoredEnvironment || credentialBindingChanged
                    ? JSON.parse(fs.readFileSync(file, 'utf-8'))
                    : stored);
                return { ...content, filename: f };
            }
            catch {
                return null;
            }
        }).filter(Boolean);
        const storedFetchIndex = storedTools.findIndex(tool => String(tool?.name || "") === "fetch-web-mcp");
        if (storedFetchIndex >= 0 && (0, internal_mcp_registry_1.isLegacyFetchWebMcpDefinition)(storedTools[storedFetchIndex])) {
            const migrated = (0, internal_mcp_registry_1.buildBundledFetchWebMcpTool)(storedTools[storedFetchIndex]);
            saveMcpTool(migrated);
            storedTools[storedFetchIndex] = { ...migrated, filename: "fetch-web-mcp.json" };
        }
        const storedFilesystemIndex = storedTools.findIndex(tool => String(tool?.name || "") === "filesystem-mcp");
        if (storedFilesystemIndex >= 0 && (0, internal_mcp_registry_1.isLegacyOfficialFilesystemMcpDefinition)(storedTools[storedFilesystemIndex])) {
            const migrated = (0, internal_mcp_registry_1.buildBundledFilesystemMcpTool)(storedTools[storedFilesystemIndex]);
            saveMcpTool(migrated);
            storedTools[storedFilesystemIndex] = { ...migrated, filename: "filesystem-mcp.json" };
        }
        const storedFeishu = storedTools.find(tool => String(tool?.name || "") === "mcp-feishu") || null;
        const bundledFeishu = (0, internal_mcp_registry_1.buildBundledFeishuMcpTool)(loadFeishuConfig(), storedFeishu || {});
        return bundledFeishu
            ? [...storedTools.filter(tool => String(tool?.name || "") !== "mcp-feishu"), bundledFeishu]
            : storedTools;
    }
    catch {
        return [];
    }
}
function saveMcpTool(tool) {
    const filename = tool.name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
    const scope = `mcp-${filename.replace(/\.json$/i, "")}`;
    const environment = (0, tool_catalog_management_1.normalizeMcpEnvironment)(tool?.env, { strict: true });
    const protectedEnvironment = Object.fromEntries(Object.entries(environment).map(([key, value]) => [
        key,
        (0, credential_store_1.protectCredential)(scope, `env.${key}`, value),
    ]));
    const protectedTool = (0, credential_store_1.protectObjectSecrets)({ ...tool, env: protectedEnvironment }, scope);
    (0, atomic_json_file_1.writeJsonAtomic)(path.join(exports.MCP_DIR, filename), protectedTool);
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
    (0, internal_skill_catalog_1.assertCcmInternalSkillMutable)(skill?.name, "修改、停用或覆盖");
    const filename = skill.name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
    const filePath = path.join(exports.SKILLS_DIR, filename);
    if (fs.existsSync(filePath)) {
        try {
            const current = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            if (current?.immutable || current?.systemManaged || current?.origin === "internal") {
                const error = new Error(`受系统管理的 Skill "${skill.name}" 不能修改、停用或覆盖`);
                error.code = "CCM_INTERNAL_SKILL_IMMUTABLE";
                error.statusCode = 403;
                throw error;
            }
        }
        catch (error) {
            if (error?.code === "CCM_INTERNAL_SKILL_IMMUTABLE")
                throw error;
        }
    }
    (0, atomic_json_file_1.writeJsonAtomic)(filePath, skill);
}
function deleteSkill(name) {
    (0, internal_skill_catalog_1.assertCcmInternalSkillMutable)(name, "删除");
    const filename = name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
    const filePath = path.join(exports.SKILLS_DIR, filename);
    if (fs.existsSync(filePath)) {
        try {
            const current = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            if (current?.immutable || current?.systemManaged || current?.origin === "internal" || (0, internal_skill_catalog_1.isCcmInternalSkillName)(current?.name)) {
                const error = new Error(`受系统管理的 Skill "${name}" 不能删除`);
                error.code = "CCM_INTERNAL_SKILL_IMMUTABLE";
                error.statusCode = 403;
                throw error;
            }
        }
        catch (error) {
            if (error?.code === "CCM_INTERNAL_SKILL_IMMUTABLE")
                throw error;
        }
    }
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
const METRICS_EVENT_LIMIT = 10_000;
const METRICS_DURATION_SAMPLE_LIMIT = 240;
function emptyMetricsStore() {
    return { version: 2, agents: {}, daily: {}, scopes: {}, events: [], updatedAt: null };
}
function localDateKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    const pad = (part) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function normalizeMetricDateFilter(value) {
    const text = String(value || "").trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match)
        return "";
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? text : "";
}
function finiteMetricNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) && number > 0 ? number : 0;
}
function normalizeMetricsStore(value) {
    const store = value && typeof value === "object" ? value : {};
    return {
        ...store,
        version: 2,
        agents: store.agents && typeof store.agents === "object" ? store.agents : {},
        daily: store.daily && typeof store.daily === "object" ? store.daily : {},
        scopes: store.scopes && typeof store.scopes === "object" ? store.scopes : {},
        events: Array.isArray(store.events) ? store.events.slice(-METRICS_EVENT_LIMIT) : [],
        updatedAt: store.updatedAt || store.updated_at || null,
    };
}
function createMetricAggregate() {
    return {
        calls: 0,
        successes: 0,
        failures: 0,
        totalMs: 0,
        avgMs: 0,
        totalFileChanges: 0,
        lastFileChangeCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCostUsd: 0,
        totalCost: 0,
        usageReportedCalls: 0,
        durationsMs: [],
        lastCall: null,
    };
}
function applyMetricAggregate(target, data, at) {
    const aggregate = target && typeof target === "object" ? target : createMetricAggregate();
    const durationMs = finiteMetricNumber(data.durationMs ?? data.duration_ms);
    const fileChangeCount = finiteMetricNumber(data.fileChangeCount ?? data.file_change_count);
    const usage = data.usage && typeof data.usage === "object" ? data.usage : {};
    const inputTokens = finiteMetricNumber(data.inputTokens ?? data.input_tokens ?? usage.inputTokens ?? usage.input_tokens);
    const outputTokens = finiteMetricNumber(data.outputTokens ?? data.output_tokens ?? usage.outputTokens ?? usage.output_tokens);
    const costUsd = finiteMetricNumber(data.totalCostUsd ?? data.total_cost_usd ?? data.costUsd ?? data.cost_usd ?? usage.totalCostUsd ?? usage.total_cost_usd ?? data.totalCost);
    aggregate.calls = finiteMetricNumber(aggregate.calls) + 1;
    aggregate.successes = finiteMetricNumber(aggregate.successes) + (data.success === true ? 1 : 0);
    aggregate.failures = finiteMetricNumber(aggregate.failures) + (data.success === true ? 0 : 1);
    aggregate.totalMs = finiteMetricNumber(aggregate.totalMs) + durationMs;
    aggregate.avgMs = aggregate.calls > 0 ? Math.round(aggregate.totalMs / aggregate.calls) : 0;
    aggregate.totalFileChanges = finiteMetricNumber(aggregate.totalFileChanges) + fileChangeCount;
    aggregate.lastFileChangeCount = fileChangeCount;
    aggregate.inputTokens = finiteMetricNumber(aggregate.inputTokens) + inputTokens;
    aggregate.outputTokens = finiteMetricNumber(aggregate.outputTokens) + outputTokens;
    aggregate.totalCostUsd = finiteMetricNumber(aggregate.totalCostUsd ?? aggregate.totalCost) + costUsd;
    aggregate.totalCost = aggregate.totalCostUsd;
    aggregate.usageReportedCalls = finiteMetricNumber(aggregate.usageReportedCalls) + (inputTokens > 0 || outputTokens > 0 || costUsd > 0 ? 1 : 0);
    aggregate.durationsMs = Array.isArray(aggregate.durationsMs) ? aggregate.durationsMs : [];
    if (durationMs > 0)
        aggregate.durationsMs.push(durationMs);
    if (aggregate.durationsMs.length > METRICS_DURATION_SAMPLE_LIMIT) {
        aggregate.durationsMs.splice(0, aggregate.durationsMs.length - METRICS_DURATION_SAMPLE_LIMIT);
    }
    aggregate.lastCall = at;
    return aggregate;
}
function applyMetricToStore(value, agent, data = {}, now = new Date()) {
    const metrics = normalizeMetricsStore(value);
    const at = new Date(now).toISOString();
    const today = localDateKey(now);
    const cleanAgent = String(agent || "unknown-agent").trim() || "unknown-agent";
    const groupId = String(data.groupId || data.group_id || "").trim();
    const requestedScopeType = String(data.scopeType || data.scope_type || data.scope || "").trim().toLowerCase();
    const scopeType = groupId ? "group" : (requestedScopeType === "global" ? "global" : "project");
    const scopeId = groupId || String(data.scopeId || data.scope_id || data.projectId || data.project_id || (scopeType === "global" ? "global" : cleanAgent)).trim();
    const scopeKey = `${scopeType}:${scopeId || "unassigned"}`;
    metrics.agents[cleanAgent] = applyMetricAggregate(metrics.agents[cleanAgent], data, at);
    if (!metrics.daily[today])
        metrics.daily[today] = {};
    metrics.daily[today][cleanAgent] = applyMetricAggregate(metrics.daily[today][cleanAgent], data, at);
    const existingScope = metrics.scopes[scopeKey] && typeof metrics.scopes[scopeKey] === "object" ? metrics.scopes[scopeKey] : {};
    const role = String(data.role || data.agentRole || data.agent_role || (scopeType === "group" ? "member_agent" : "project_agent"));
    const scope = {
        ...existingScope,
        key: scopeKey,
        type: scopeType,
        id: scopeId || "unassigned",
        groupId,
        agents: existingScope.agents && typeof existingScope.agents === "object" ? existingScope.agents : {},
        daily: existingScope.daily && typeof existingScope.daily === "object" ? existingScope.daily : {},
        roles: existingScope.roles && typeof existingScope.roles === "object" ? existingScope.roles : {},
        dailyRoles: existingScope.dailyRoles && typeof existingScope.dailyRoles === "object" ? existingScope.dailyRoles : {},
        updatedAt: at,
    };
    scope.agents[cleanAgent] = applyMetricAggregate(scope.agents[cleanAgent], data, at);
    if (!scope.daily[today])
        scope.daily[today] = {};
    scope.daily[today][cleanAgent] = applyMetricAggregate(scope.daily[today][cleanAgent], data, at);
    if (!scope.roles[role])
        scope.roles[role] = {};
    scope.roles[role][cleanAgent] = applyMetricAggregate(scope.roles[role][cleanAgent], data, at);
    if (!scope.dailyRoles[today])
        scope.dailyRoles[today] = {};
    if (!scope.dailyRoles[today][role])
        scope.dailyRoles[today][role] = {};
    scope.dailyRoles[today][role][cleanAgent] = applyMetricAggregate(scope.dailyRoles[today][role][cleanAgent], data, at);
    metrics.scopes[scopeKey] = scope;
    const aggregate = scope.agents[cleanAgent];
    const success = data.success === true;
    const explicitStatus = String(data.status || "").trim().toLowerCase();
    const inferredStatus = data.success === true ? "completed" : data.success === false ? "failed" : "unknown";
    const status = ["completed", "failed", "cancelled", "blocked", "unknown"].includes(explicitStatus) ? explicitStatus : inferredStatus;
    metrics.events.push({
        id: String(data.eventId || data.event_id || `metric_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`),
        at,
        date: today,
        scopeType,
        scopeId: scope.id,
        groupId,
        agent: cleanAgent,
        role,
        source: String(data.source || data.metricSource || data.metric_source || "agent-execution"),
        runtime: String(data.runtime || data.agentType || data.agent_type || ""),
        success,
        status,
        durationMs: finiteMetricNumber(data.durationMs ?? data.duration_ms),
        fileChangeCount: finiteMetricNumber(data.fileChangeCount ?? data.file_change_count),
        inputTokens: finiteMetricNumber(data.inputTokens ?? data.input_tokens ?? data.usage?.inputTokens ?? data.usage?.input_tokens),
        outputTokens: finiteMetricNumber(data.outputTokens ?? data.output_tokens ?? data.usage?.outputTokens ?? data.usage?.output_tokens),
        totalCostUsd: finiteMetricNumber(data.totalCostUsd ?? data.total_cost_usd ?? data.costUsd ?? data.cost_usd ?? data.usage?.totalCostUsd ?? data.usage?.total_cost_usd ?? data.totalCost),
        traceId: String(data.traceId || data.trace_id || ""),
        taskId: String(data.taskId || data.task_id || ""),
        executionId: String(data.executionId || data.execution_id || ""),
        error: success ? "" : String(data.error || data.message || "").slice(0, 300),
        usageReported: aggregate.usageReportedCalls > 0 && (finiteMetricNumber(data.inputTokens ?? data.input_tokens ?? data.usage?.inputTokens ?? data.usage?.input_tokens) > 0
            || finiteMetricNumber(data.outputTokens ?? data.output_tokens ?? data.usage?.outputTokens ?? data.usage?.output_tokens) > 0
            || finiteMetricNumber(data.totalCostUsd ?? data.total_cost_usd ?? data.usage?.totalCostUsd ?? data.usage?.total_cost_usd ?? data.totalCost) > 0),
    });
    if (metrics.events.length > METRICS_EVENT_LIMIT)
        metrics.events.splice(0, metrics.events.length - METRICS_EVENT_LIMIT);
    metrics.updatedAt = at;
    return metrics;
}
function loadMetrics() {
    return normalizeMetricsStore((0, atomic_json_file_1.readJsonWithBackup)(METRICS_FILE, emptyMetricsStore()));
}
function queryMetricEvents(value, filters = {}) {
    const metrics = normalizeMetricsStore(value);
    const scopeType = String(filters.scopeType || filters.scope_type || "").trim().toLowerCase();
    const scopeId = String(filters.scopeId || filters.scope_id || "").trim();
    const status = String(filters.status || "all").trim().toLowerCase();
    const days = Math.max(0, Math.floor(Number(filters.days) || 0));
    const pageSize = Math.max(5, Math.min(100, Math.floor(Number(filters.pageSize || filters.page_size) || 20)));
    const requestedPage = Math.max(1, Math.floor(Number(filters.page) || 1));
    let fromDate = normalizeMetricDateFilter(filters.fromDate || filters.from_date);
    const toDate = normalizeMetricDateFilter(filters.toDate || filters.to_date);
    if (!fromDate && days > 0) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - days + 1);
        fromDate = localDateKey(date);
    }
    const scoped = metrics.events
        .filter((event) => !scopeType || String(event?.scopeType || "").toLowerCase() === scopeType)
        .filter((event) => !scopeId || String(event?.scopeId || "") === scopeId || String(event?.groupId || "") === scopeId)
        .filter((event) => {
        const date = String(event?.date || event?.at || "").slice(0, 10);
        return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
    })
        .map((event) => {
        const explicit = String(event?.status || "").trim().toLowerCase();
        const resolvedStatus = ["completed", "failed", "cancelled", "blocked", "unknown"].includes(explicit)
            ? explicit
            : event?.success === true
                ? "completed"
                : event?.success === false ? "failed" : "unknown";
        return { ...event, resolvedStatus };
    })
        .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
    const statusCounts = scoped.reduce((result, event) => {
        result.all += 1;
        result[event.resolvedStatus] = Number(result[event.resolvedStatus] || 0) + 1;
        return result;
    }, { all: 0, completed: 0, failed: 0, cancelled: 0, blocked: 0, unknown: 0 });
    const filtered = ["completed", "failed", "cancelled", "blocked", "unknown"].includes(status)
        ? scoped.filter((event) => event.resolvedStatus === status)
        : scoped;
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * pageSize;
    return {
        events: filtered.slice(offset, offset + pageSize),
        total,
        page,
        pageSize,
        totalPages,
        status: ["completed", "failed", "cancelled", "blocked", "unknown"].includes(status) ? status : "all",
        statusCounts,
        retentionLimit: METRICS_EVENT_LIMIT,
        range: { days, fromDate: fromDate || null, toDate: toDate || null },
    };
}
function saveMetrics(metrics) {
    (0, atomic_json_file_1.writeJsonAtomic)(METRICS_FILE, normalizeMetricsStore(metrics));
}
function recordMetric(agent, data) {
    try {
        (0, metrics_v3_1.ensureLegacyMetricsMigrated)(loadMetrics());
        (0, metrics_v3_1.recordMetricV3)(agent, data);
        return true;
    }
    catch (error) {
        console.warn("[性能指标] 写入失败:", error?.message || error);
        return false;
    }
}
function runMetricsAggregationSelfTest() {
    let store = emptyMetricsStore();
    store = applyMetricToStore(store, "coordinator", { groupId: "group-a", role: "main_agent", success: true, durationMs: 100, traceId: "trace-a" }, "2026-07-13T10:00:00.000Z");
    store = applyMetricToStore(store, "coordinator", { groupId: "group-b", role: "main_agent", success: false, durationMs: 900, traceId: "trace-b" }, "2026-07-13T10:01:00.000Z");
    store = applyMetricToStore(store, "worker", { groupId: "group-a", role: "member_agent", success: true, durationMs: 300, inputTokens: 20, outputTokens: 5 }, "2026-07-13T10:02:00.000Z");
    store = applyMetricToStore(store, "global-agent", {
        scopeType: "global",
        scopeId: "global",
        role: "global_agent",
        success: true,
        status: "completed",
        durationMs: 250,
        traceId: "trace-global",
        executionId: "run-global-1",
        source: "global-agent-loop",
        inputTokens: 120,
        outputTokens: 40,
    }, "2026-07-13T10:03:00.000Z");
    const groupA = store.scopes["group:group-a"];
    const groupB = store.scopes["group:group-b"];
    const globalScope = store.scopes["global:global"];
    const checks = {
        separatesGroups: groupA?.agents?.coordinator?.calls === 1 && groupB?.agents?.coordinator?.calls === 1,
        keepsMainAgentOutcomesSeparate: groupA?.agents?.coordinator?.successes === 1 && groupB?.agents?.coordinator?.failures === 1,
        separatesRolesInsideGroup: groupA?.roles?.main_agent?.coordinator?.calls === 1 && groupA?.roles?.member_agent?.worker?.calls === 1,
        retainsMemberMetricsInsideGroup: groupA?.agents?.worker?.calls === 1 && !groupB?.agents?.worker,
        storesTraceIdentity: store.events.some((item) => item.groupId === "group-a" && item.traceId === "trace-a"),
        recordsUsageCoverage: groupA?.agents?.worker?.usageReportedCalls === 1,
        recordsGlobalScope: globalScope?.agents?.["global-agent"]?.calls === 1
            && globalScope?.roles?.global_agent?.["global-agent"]?.calls === 1
            && !globalScope?.groupId,
        recordsGlobalTokenUsage: globalScope?.agents?.["global-agent"]?.inputTokens === 120
            && globalScope?.agents?.["global-agent"]?.outputTokens === 40
            && globalScope?.agents?.["global-agent"]?.usageReportedCalls === 1,
        storesGlobalEventScope: store.events.some((item) => (item.scopeType === "global"
            && item.scopeId === "global"
            && item.agent === "global-agent"
            && item.role === "global_agent"
            && item.executionId === "run-global-1"
            && item.traceId === "trace-global"
            && item.status === "completed"
            && item.inputTokens === 120
            && item.outputTokens === 40
            && item.usageReported === true)),
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
// === Tasks ===
function loadTasks() {
    return (0, task_store_1.loadTasksFromSqlite)();
}
function saveTasks(tasks) {
    const result = (0, task_store_1.saveTasksToSqlite)(tasks);
    (0, runtime_events_1.publishRuntimeEvent)("task", "tasks.changed", { count: Array.isArray(tasks) ? tasks.length : 0 });
    return result;
}
function getTaskById(id) {
    return (0, task_store_1.getTaskByIdFromSqlite)(id);
}
function updateTaskById(id, patchOrMutator) {
    const result = (0, task_store_1.updateTaskByIdInSqlite)(id, patchOrMutator);
    (0, runtime_events_1.publishRuntimeEvent)("task", "task.changed", { taskId: id });
    return result;
}
function updateTaskByIdCas(id, predicate, mutator) {
    const result = (0, task_store_1.updateTaskByIdCasInSqlite)(id, predicate, mutator);
    if (result.updated)
        (0, runtime_events_1.publishRuntimeEvent)("task", "task.changed", { taskId: id });
    return result;
}
function listUsabilityTaskCandidates(recentCutoff) {
    return (0, task_store_1.listUsabilityTaskCandidatesFromSqlite)(recentCutoff);
}
function listUsabilityArchiveCandidates(historyCutoff, intakeCutoff) {
    return (0, task_store_1.listUsabilityArchiveCandidatesFromSqlite)(historyCutoff, intakeCutoff);
}
function listTasksByParentId(parentId) {
    return (0, task_store_1.listTasksByParentIdFromSqlite)(parentId);
}
// === Project Configs ===
function loadProjectConfigs() {
    const parsed = (0, atomic_json_file_1.readJsonWithBackup)(PROJECT_CONFIGS_FILE, {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}
function saveProjectConfigs(configs) {
    (0, atomic_json_file_1.writeJsonAtomic)(PROJECT_CONFIGS_FILE, configs);
}
// === Music Config ===
function loadMusicConfig() {
    const fallback = {
        source: "bili",
        playMode: "loop",
        quality: "high"
    };
    const parsed = (0, atomic_json_file_1.readJsonWithBackup)(MUSIC_CONFIG_FILE, fallback);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
}
function saveMusicConfig(cfg) {
    (0, atomic_json_file_1.writeJsonAtomic)(MUSIC_CONFIG_FILE, cfg);
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
    (0, atomic_json_file_1.writeJsonAtomic)(CRON_FILE, jobs);
}
// === Auto Dev Daily Reports ===
function loadDevReports() {
    const parsed = (0, atomic_json_file_1.readJsonWithBackup)(DEV_REPORTS_FILE, []);
    return Array.isArray(parsed) ? parsed : [];
}
function saveDevReports(reports) {
    (0, atomic_json_file_1.writeJsonAtomic)(DEV_REPORTS_FILE, reports);
}
function loadDevWeeklyReports() {
    const parsed = (0, atomic_json_file_1.readJsonWithBackup)(DEV_WEEKLY_REPORTS_FILE, []);
    return Array.isArray(parsed) ? parsed : [];
}
function saveDevWeeklyReports(reports) {
    (0, atomic_json_file_1.writeJsonAtomic)(DEV_WEEKLY_REPORTS_FILE, reports);
}
function loadAutoDevNotifyConfig() {
    const parsed = (0, atomic_json_file_1.readJsonWithBackup)(AUTO_DEV_NOTIFY_FILE, {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}
function saveAutoDevNotifyConfig(config) {
    (0, atomic_json_file_1.writeJsonAtomic)(AUTO_DEV_NOTIFY_FILE, config || {});
}
// === RAG Watch Paths ===
function loadRagWatchPaths() {
    const parsed = (0, atomic_json_file_1.readJsonWithBackup)(RAG_WATCH_PATHS_FILE, []);
    return Array.isArray(parsed) ? parsed : [];
}
function saveRagWatchPaths(paths) {
    (0, atomic_json_file_1.writeJsonAtomic)(RAG_WATCH_PATHS_FILE, paths || []);
}
// === RAG Metadata (Tags) ===
function loadRagMetadata() {
    const parsed = (0, atomic_json_file_1.readJsonWithBackup)(RAG_METADATA_FILE, {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}
function saveRagMetadata(metadata) {
    (0, atomic_json_file_1.writeJsonAtomic)(RAG_METADATA_FILE, metadata || {});
}
//# sourceMappingURL=db.js.map