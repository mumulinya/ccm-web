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
exports.listArchivedProjects = listArchivedProjects;
exports.archiveProject = archiveProject;
exports.restoreProject = restoreProject;
exports.previewProjectPurge = previewProjectPurge;
exports.purgeArchivedProject = purgeArchivedProject;
exports.getProjectLifecycleAudit = getProjectLifecycleAudit;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const sessions_1 = require("./sessions");
const project_validation_1 = require("./project-validation");
const ARCHIVE_DIR = path.join(utils_1.CONFIGS_DIR, "archived");
const LIFECYCLE_DIR = path.join(utils_1.CCM_DIR, "project-lifecycle");
const STATE_FILE = path.join(LIFECYCLE_DIR, "state.json");
const AUDIT_FILE = path.join(LIFECYCLE_DIR, "audit.jsonl");
const PREVIEW_TTL_MS = 10 * 60 * 1000;
const purgePreviews = new Map();
function ensureDirectories() {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    fs.mkdirSync(LIFECYCLE_DIR, { recursive: true });
}
function readState() {
    ensureDirectories();
    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
    catch {
        return {};
    }
}
function writeState(state) {
    ensureDirectories();
    const temp = `${STATE_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(state, null, 2), "utf-8");
    if (fs.existsSync(STATE_FILE))
        fs.unlinkSync(STATE_FILE);
    fs.renameSync(temp, STATE_FILE);
}
function recordAudit(action, project, detail = {}) {
    ensureDirectories();
    const record = { id: `project_audit_${crypto.randomUUID()}`, time: new Date().toISOString(), action, project, ...detail };
    fs.appendFileSync(AUDIT_FILE, `${JSON.stringify(record)}\n`, "utf-8");
    return record;
}
function configFile(name, archived = false) {
    return (0, project_validation_1.resolveContainedPath)(archived ? ARCHIVE_DIR : utils_1.CONFIGS_DIR, `config-${(0, project_validation_1.validateProjectName)(name)}.toml`);
}
function countJsonFiles(dir) {
    if (!fs.existsSync(dir))
        return 0;
    return fs.readdirSync(dir).filter((item) => item.endsWith(".json") && fs.statSync(path.join(dir, item)).isFile()).length;
}
function fileDescriptor(label, target) {
    if (!fs.existsSync(target))
        return { label, path: target, exists: false, bytes: 0 };
    const stat = fs.statSync(target);
    let bytes = stat.size;
    if (stat.isDirectory()) {
        bytes = fs.readdirSync(target, { withFileTypes: true }).reduce((total, entry) => {
            if (!entry.isFile())
                return total;
            try {
                return total + fs.statSync(path.join(target, entry.name)).size;
            }
            catch {
                return total;
            }
        }, 0);
    }
    return { label, path: target, exists: true, bytes, modified_at: stat.mtime.toISOString(), kind: stat.isDirectory() ? "directory" : "file" };
}
function buildPurgeImpact(name) {
    const project = (0, project_validation_1.validateProjectName)(name);
    const webSessions = (0, project_validation_1.resolveContainedPath)(sessions_1.WEB_SESSIONS_DIR, project);
    const ccSession = (0, sessions_1.findCcSessionFile)(project);
    const archivedConfig = configFile(project, true);
    const logFile = (0, project_validation_1.resolveContainedPath)(utils_1.LOG_DIR, `${project}.log`);
    const items = [
        fileDescriptor("归档项目配置", archivedConfig),
        fileDescriptor("网页会话", webSessions),
        ...(ccSession ? [fileDescriptor("cc-connect 会话", ccSession)] : []),
        fileDescriptor("项目运行日志", logFile),
    ];
    const fingerprint = crypto.createHash("sha256").update(JSON.stringify(items)).digest("hex");
    return {
        project,
        items,
        session_count: countJsonFiles(webSessions),
        total_bytes: items.reduce((total, item) => total + item.bytes, 0),
        fingerprint,
        retained: ["历史任务与任务回放", "TestAgent 验收证据", "项目源码目录", "知识库内容"],
    };
}
function listArchivedProjects() {
    ensureDirectories();
    const state = readState();
    return fs.readdirSync(ARCHIVE_DIR)
        .filter((file) => /^config-.+\.toml$/.test(file))
        .map((file) => {
        const name = file.replace(/^config-/, "").replace(/\.toml$/, "");
        const stat = fs.statSync(path.join(ARCHIVE_DIR, file));
        return { name, archived_at: state[name]?.archived_at || stat.mtime.toISOString(), config_file: file };
    })
        .sort((a, b) => b.archived_at.localeCompare(a.archived_at));
}
function archiveProject(name) {
    const project = (0, project_validation_1.validateProjectName)(name);
    const source = configFile(project);
    const destination = configFile(project, true);
    if (!fs.existsSync(source))
        throw new Error("项目不存在或已经归档");
    if (fs.existsSync(destination))
        throw new Error("归档区已存在同名项目");
    ensureDirectories();
    fs.renameSync(source, destination);
    const state = readState();
    state[project] = { archived_at: new Date().toISOString(), config_file: path.basename(destination) };
    writeState(state);
    const audit = recordAudit("archive", project, { retained: ["sessions", "tasks", "replay", "test_evidence", "source"] });
    return { success: true, archived: true, project, audit_id: audit.id, message: "项目已归档，可随时恢复" };
}
function restoreProject(name) {
    const project = (0, project_validation_1.validateProjectName)(name);
    const source = configFile(project, true);
    const destination = configFile(project);
    if (!fs.existsSync(source))
        throw new Error("归档项目不存在");
    if (fs.existsSync(destination))
        throw new Error("活动项目中已存在同名项目");
    fs.renameSync(source, destination);
    const state = readState();
    delete state[project];
    writeState(state);
    const audit = recordAudit("restore", project);
    return { success: true, restored: true, project, audit_id: audit.id, message: "项目已恢复" };
}
function previewProjectPurge(name) {
    const impact = buildPurgeImpact(name);
    if (!fs.existsSync(configFile(impact.project, true)))
        throw new Error("仅已归档项目可以永久删除");
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = Date.now() + PREVIEW_TTL_MS;
    purgePreviews.set(token, { project: impact.project, fingerprint: impact.fingerprint, expiresAt });
    return { success: true, ...impact, preview_token: token, expires_at: new Date(expiresAt).toISOString() };
}
function purgeArchivedProject(name, previewToken) {
    const impact = buildPurgeImpact(name);
    const preview = purgePreviews.get(String(previewToken || ""));
    if (!preview || preview.project !== impact.project || preview.expiresAt < Date.now())
        throw new Error("删除预览已失效，请重新预览");
    if (preview.fingerprint !== impact.fingerprint)
        throw new Error("项目数据已变化，请重新预览后再删除");
    if (!fs.existsSync(configFile(impact.project, true)))
        throw new Error("归档项目不存在");
    for (const item of impact.items) {
        if (!item.exists)
            continue;
        const target = String(item.path);
        if (fs.statSync(target).isDirectory())
            fs.rmSync(target, { recursive: true });
        else
            fs.unlinkSync(target);
    }
    const configs = (0, db_1.loadProjectConfigs)();
    if (configs && Object.prototype.hasOwnProperty.call(configs, impact.project)) {
        delete configs[impact.project];
        (0, db_1.saveProjectConfigs)(configs);
    }
    const state = readState();
    delete state[impact.project];
    writeState(state);
    purgePreviews.delete(previewToken);
    const audit = recordAudit("purge", impact.project, { deleted: impact.items.filter((item) => item.exists), retained: impact.retained });
    return { success: true, purged: true, project: impact.project, audit_id: audit.id, retained: impact.retained, message: "项目配置与会话已永久删除" };
}
function getProjectLifecycleAudit(limit = 100) {
    ensureDirectories();
    if (!fs.existsSync(AUDIT_FILE))
        return [];
    return fs.readFileSync(AUDIT_FILE, "utf-8").split(/\r?\n/).filter(Boolean).slice(-Math.max(1, Math.min(500, limit))).reverse().map((line) => {
        try {
            return JSON.parse(line);
        }
        catch {
            return null;
        }
    }).filter(Boolean);
}
//# sourceMappingURL=project-lifecycle.js.map