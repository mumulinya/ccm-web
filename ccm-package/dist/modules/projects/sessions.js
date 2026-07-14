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
exports.WEB_SESSIONS_DIR = void 0;
exports.getProjectSessionDir = getProjectSessionDir;
exports.findCcSessionFile = findCcSessionFile;
exports.syncFromCcToFilesystem = syncFromCcToFilesystem;
exports.syncToFilesystemToCc = syncToFilesystemToCc;
exports.syncSessions = syncSessions;
exports.getSessions = getSessions;
exports.getSessionDetail = getSessionDetail;
exports.handleSessionsApi = handleSessionsApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const project_validation_1 = require("./project-validation");
const db_1 = require("../../core/db");
exports.WEB_SESSIONS_DIR = path.join(utils_1.CCM_DIR, "web-sessions");
function getProjectSessionDir(projectName) {
    return (0, project_validation_1.resolveContainedPath)(exports.WEB_SESSIONS_DIR, (0, project_validation_1.validateProjectName)(projectName));
}
function getSessionFilePath(projectName, sessionId) {
    return (0, project_validation_1.resolveContainedPath)(getProjectSessionDir(projectName), `${(0, project_validation_1.validateSessionId)(sessionId)}.json`);
}
function requireActiveProject(projectName) {
    const project = (0, project_validation_1.validateProjectName)(projectName);
    const config = (0, db_1.getConfigs)().find((item) => item.name === project);
    if (!config)
        throw new Error("项目不存在或已经归档");
    return { project, config };
}
function ensureWebSessionDir(projectName) {
    const dir = getProjectSessionDir(projectName);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    return dir;
}
// 查找 cc-connect 的 session 文件（带 hash 的）
function findCcSessionFile(projectName) {
    const safeProjectName = (0, project_validation_1.validateProjectName)(projectName);
    if (!fs.existsSync(utils_1.SESSIONS_DIR))
        return null;
    const escaped = safeProjectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matcher = new RegExp(`^${escaped}(?:_[^/\\\\]+)?\\.json$`);
    const files = fs.readdirSync(utils_1.SESSIONS_DIR).filter(f => matcher.test(f) && !fs.statSync((0, project_validation_1.resolveContainedPath)(utils_1.SESSIONS_DIR, f)).isDirectory());
    const hashed = files.find(f => f !== `${safeProjectName}.json`);
    return hashed ? (0, project_validation_1.resolveContainedPath)(utils_1.SESSIONS_DIR, hashed) : files[0] ? (0, project_validation_1.resolveContainedPath)(utils_1.SESSIONS_DIR, files[0]) : null;
}
// 从 cc-connect 单文件同步到文件夹格式
function syncFromCcToFilesystem(projectName) {
    const ccFile = findCcSessionFile(projectName);
    if (!ccFile || !fs.existsSync(ccFile))
        return;
    try {
        const data = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
        const dir = ensureWebSessionDir(projectName);
        for (const [sid, session] of Object.entries(data.sessions || {})) {
            const sessionData = session;
            const filePath = getSessionFilePath(projectName, (0, project_validation_1.validateSessionId)(sid));
            // 只更新有变化的
            if (!fs.existsSync(filePath) || JSON.parse(fs.readFileSync(filePath, "utf-8")).updated_at !== sessionData.updated_at) {
                fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2));
            }
        }
        // 删除文件夹中已不存在的会话
        const ccSids = new Set(Object.keys(data.sessions || {}));
        for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
            const fid = f.replace(".json", "");
            if (!ccSids.has(fid))
                fs.unlinkSync((0, project_validation_1.resolveContainedPath)(dir, f));
        }
    }
    catch { }
}
// 从文件夹格式同步回 cc-connect 单文件
function syncToFilesystemToCc(projectName) {
    const ccFile = findCcSessionFile(projectName);
    if (!ccFile)
        return;
    try {
        const ccData = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
        const dir = getProjectSessionDir(projectName);
        if (!fs.existsSync(dir))
            return;
        for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
            const sid = f.replace(".json", "");
            const sessionData = JSON.parse(fs.readFileSync((0, project_validation_1.resolveContainedPath)(dir, f), "utf-8"));
            ccData.sessions[sid] = sessionData;
        }
        // 更新 counter
        const maxNum = Math.max(0, ...Object.keys(ccData.sessions).map(s => parseInt(s.replace("s", "")) || 0));
        ccData.counter = maxNum + 1;
        fs.writeFileSync(ccFile, JSON.stringify(ccData, null, 2));
    }
    catch { }
}
// 双向同步
function syncSessions(projectName) {
    syncFromCcToFilesystem(projectName);
}
// 获取会话列表（从文件夹读取）
function getSessions(projectName) {
    syncSessions(projectName);
    const dir = getProjectSessionDir(projectName);
    if (!fs.existsSync(dir))
        return [];
    return fs.readdirSync(dir)
        .filter(f => f.endsWith(".json"))
        .map(f => {
        try {
            const data = JSON.parse(fs.readFileSync((0, project_validation_1.resolveContainedPath)(dir, f), "utf-8"));
            return {
                id: data.id || f.replace(".json", ""),
                name: data.name || data.id || f.replace(".json", ""),
                agent_type: data.agent_type || "claudecode",
                message_count: (data.history || []).length,
                last_message: (data.history || []).slice(-1)[0]?.content?.substring(0, 100) || "",
                created_at: data.created_at,
                updated_at: data.updated_at,
            };
        }
        catch {
            return null;
        }
    })
        .filter(Boolean)
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
}
// 获取会话详情
function getSessionDetail(projectName, sessionId) {
    const filePath = getSessionFilePath(projectName, sessionId);
    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, "utf-8"));
        }
        catch { }
    }
    // fallback: 从 cc-connect 文件读取
    const ccFile = findCcSessionFile(projectName);
    if (ccFile) {
        try {
            const data = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
            return data.sessions[sessionId] || null;
        }
        catch { }
    }
    return null;
}
function normalizeWebSessionMessage(message) {
    const input = message && typeof message === "object" ? message : {};
    const safe = {
        id: String(input.id || input.message_id || `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`),
        role: input.role,
        content: String(input.content || ""),
        agent: input.agent || null,
        timestamp: input.timestamp || new Date().toISOString(),
    };
    for (const key of [
        "requestText",
        "task_id",
        "run_id",
        "taskExperience",
        "fileChanges",
        "workEvents",
        "projectRun",
        "agenticRun",
        "managementReceipt",
        "type",
    ]) {
        if (Object.prototype.hasOwnProperty.call(input, key))
            safe[key] = input[key];
    }
    return safe;
}
function messageMatchesDeleteSelector(message, selector, index) {
    if (!message || !selector)
        return false;
    const id = String(selector.id || selector.message_id || "").trim();
    const taskId = String(selector.task_id || selector.taskId || "").trim();
    const timestamp = String(selector.timestamp || "").trim();
    if (id && String(message.id || message.message_id || "") === id)
        return true;
    if (taskId && String(message.task_id || message.taskExperience?.task_id || message.run_id || "") === taskId)
        return true;
    if (timestamp && String(message.timestamp || "") === timestamp)
        return true;
    if (Number.isInteger(selector.index) && selector.index === index)
        return true;
    return false;
}
function getNextSessionId(projectName) {
    const dir = getProjectSessionDir(projectName);
    const nums = [];
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).filter(f => f.endsWith(".json")).forEach(f => nums.push(parseInt(f.replace("s", "").replace(".json", "")) || 0));
    }
    const ccFile = findCcSessionFile(projectName);
    if (ccFile) {
        try {
            const data = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
            Object.keys(data.sessions || {}).forEach(s => nums.push(parseInt(s.replace("s", "")) || 0));
        }
        catch { }
    }
    return `s${nums.length > 0 ? Math.max(...nums) + 1 : 1}`;
}
// === 智能标题生成 ===
function generateTitle(message) {
    if (!message)
        return "新会话";
    let text = message.trim();
    // 去掉常见前缀
    text = text.replace(/^(帮我|请|麻烦|帮忙|能不能|可以)\s*/i, "");
    // 按标点截断，取第一句
    const firstSentence = text.split(/[。！？\n.!?]/)[0].trim();
    if (firstSentence.length > 0)
        text = firstSentence;
    // 如果有代码相关关键词，加上标签
    const tags = {
        "bug|报错|错误|异常|失败|fix|修复": "🐛",
        "接口|api|API|请求|返回": "🔌",
        "页面|前端|UI|样式|布局": "🎨",
        "数据库|sql|SQL|表|字段": "🗄️",
        "部署|上线|发布|docker": "🚀",
        "测试|test|单元测试": "🧪",
        "优化|性能|重构": "⚡",
        "新增|添加|功能|需求": "✨",
    };
    let icon = "";
    for (const [pattern, emoji] of Object.entries(tags)) {
        if (new RegExp(pattern, "i").test(text)) {
            icon = emoji + " ";
            break;
        }
    }
    // 截断到合适长度
    if (text.length > 18) {
        text = text.substring(0, 18);
        const lastSpace = text.lastIndexOf(" ");
        if (lastSpace > 8)
            text = text.substring(0, lastSpace);
    }
    return icon + text || "新会话";
}
// === Sessions API 路由分流 ===
function handleSessionsApi(pathname, req, res, parsed) {
    if (pathname === "/api/sessions/create" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, name } = JSON.parse(body);
                const safeProject = requireActiveProject(project).project;
                const dir = ensureWebSessionDir(safeProject);
                const sid = getNextSessionId(safeProject);
                const now = new Date();
                const pad = (n) => String(n).padStart(2, "0");
                const timeStr = `${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
                const count = fs.readdirSync(dir).filter(f => f.endsWith(".json")).length;
                const sessionName = name || `会话 ${count + 1} · ${timeStr}`;
                const sessionData = { id: sid, name: sessionName, agent_type: "claudecode", history: [], created_at: now.toISOString(), updated_at: now.toISOString() };
                fs.writeFileSync(getSessionFilePath(safeProject, sid), JSON.stringify(sessionData, null, 2));
                syncToFilesystemToCc(safeProject);
                (0, utils_1.sendJson)(res, { success: true, sessionId: sid, name: sessionName });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/sessions/message" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, sessionId, message } = JSON.parse(body);
                if (!project || !sessionId || !message)
                    return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
                const filePath = getSessionFilePath(project, sessionId);
                if (!fs.existsSync(filePath))
                    return (0, utils_1.sendJson)(res, { error: "会话不存在" }, 404);
                const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                if (!data.history)
                    data.history = [];
                data.history.push(normalizeWebSessionMessage(message));
                data.updated_at = new Date().toISOString();
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                syncToFilesystemToCc(project);
                (0, utils_1.sendJson)(res, { success: true, count: data.history.length });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/sessions/message/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const { project, sessionId } = payload;
                if (!project || !sessionId)
                    return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
                const filePath = getSessionFilePath(project, sessionId);
                if (!fs.existsSync(filePath))
                    return (0, utils_1.sendJson)(res, { error: "会话不存在" }, 404);
                const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                const before = Array.isArray(data.history) ? data.history.length : 0;
                data.history = (Array.isArray(data.history) ? data.history : []).filter((message, index) => !messageMatchesDeleteSelector(message, payload, index));
                const deleted = before - data.history.length;
                data.updated_at = new Date().toISOString();
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                syncToFilesystemToCc(project);
                (0, utils_1.sendJson)(res, { success: true, deleted, count: data.history.length });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/sessions/messages/replace" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const { project, sessionId } = payload;
                if (!project || !sessionId || !Array.isArray(payload.messages))
                    return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
                if (payload.messages.length > 10000)
                    return (0, utils_1.sendJson)(res, { error: "单个会话消息数量不能超过 10000 条" }, 400);
                const filePath = getSessionFilePath(project, sessionId);
                if (!fs.existsSync(filePath))
                    return (0, utils_1.sendJson)(res, { error: "会话不存在" }, 404);
                const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                const before = Array.isArray(data.history) ? data.history.length : 0;
                data.history = payload.messages.map(normalizeWebSessionMessage);
                data.updated_at = new Date().toISOString();
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                syncToFilesystemToCc(project);
                (0, utils_1.sendJson)(res, { success: true, replaced: before, count: data.history.length });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/sessions/clear" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, sessionId } = JSON.parse(body || "{}");
                if (!project || !sessionId)
                    return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
                const filePath = getSessionFilePath(project, sessionId);
                if (!fs.existsSync(filePath))
                    return (0, utils_1.sendJson)(res, { error: "会话不存在" }, 404);
                const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                const cleared = Array.isArray(data.history) ? data.history.length : 0;
                data.history = [];
                data.updated_at = new Date().toISOString();
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                syncToFilesystemToCc(project);
                (0, utils_1.sendJson)(res, { success: true, cleared });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/sessions/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, sessionId } = JSON.parse(body);
                const filePath = getSessionFilePath(project, sessionId);
                if (!fs.existsSync(filePath))
                    return (0, utils_1.sendJson)(res, { error: "会话不存在" }, 404);
                fs.unlinkSync(filePath);
                const ccFile = findCcSessionFile(project);
                if (ccFile) {
                    try {
                        const data = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
                        delete data.sessions[sessionId];
                        for (const [k, v] of Object.entries(data.active_session || {})) {
                            if (v === sessionId)
                                delete data.active_session[k];
                        }
                        fs.writeFileSync(ccFile, JSON.stringify(data, null, 2));
                    }
                    catch { }
                }
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/sessions/rename" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, sessionId, name } = JSON.parse(body);
                const safeName = String(name || "").trim();
                if (!safeName || safeName.length > 80)
                    return (0, utils_1.sendJson)(res, { error: "会话名称应为 1 到 80 个字符" }, 400);
                const filePath = getSessionFilePath(project, sessionId);
                if (!fs.existsSync(filePath))
                    return (0, utils_1.sendJson)(res, { error: "会话不存在" }, 404);
                const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                data.name = safeName;
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                const ccFile = findCcSessionFile(project);
                if (ccFile) {
                    try {
                        const ccData = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
                        if (ccData.sessions[sessionId]) {
                            ccData.sessions[sessionId].name = safeName;
                            fs.writeFileSync(ccFile, JSON.stringify(ccData, null, 2));
                        }
                    }
                    catch { }
                }
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/sessions/auto-name" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { project, sessionId, message } = JSON.parse(body);
                const activeProject = requireActiveProject(project);
                const filePath = getSessionFilePath(project, sessionId);
                if (!fs.existsSync(filePath))
                    return (0, utils_1.sendJson)(res, { error: "会话不存在" }, 404);
                let title = "";
                try {
                    const prompt = `根据以下消息生成简短中文标题（不超过15字，无引号无标点）：${message}`;
                    fs.mkdirSync(utils_1.UPLOAD_DIR, { recursive: true });
                    const tmpFile = (0, project_validation_1.resolveContainedPath)(utils_1.UPLOAD_DIR, `_title_${Date.now()}.txt`);
                    fs.writeFileSync(tmpFile, prompt, "utf-8");
                    const configuredWorkDir = String((0, db_1.getConfigInfo)(activeProject.config.path)[0]?.workDir || "").trim();
                    const safeCwd = configuredWorkDir && path.isAbsolute(configuredWorkDir) && fs.existsSync(configuredWorkDir) ? configuredWorkDir : process.cwd();
                    const result = (0, child_process_1.execSync)(`type "${tmpFile}" | claude -p`, {
                        encoding: "utf-8", timeout: 30000, cwd: safeCwd,
                        shell: true,
                        maxBuffer: 1024 * 1024,
                    });
                    try {
                        fs.unlinkSync(tmpFile);
                    }
                    catch { }
                    title = result.trim().replace(/^["'"「『【\*]+|["'"」』】\*]+$/g, "").substring(0, 20);
                }
                catch (aiErr) {
                    console.log("AI命名失败:", (aiErr.message || "").substring(0, 200));
                }
                if (!title)
                    title = generateTitle(message);
                const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                data.name = title;
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                (0, utils_1.sendJson)(res, { success: true, name: title });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=sessions.js.map