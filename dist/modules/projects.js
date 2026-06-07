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
exports.getLogs = getLogs;
exports.startProject = startProject;
exports.stopProject = stopProject;
exports.handleProjectsApi = handleProjectsApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const utils_1 = require("../utils");
const db_1 = require("../db");
const sessions_1 = require("./sessions");
function getLogs(projectName, lines = 100) {
    const logFile = path.join(utils_1.LOG_DIR, `${projectName}.log`);
    if (!fs.existsSync(logFile))
        return "";
    const content = fs.readFileSync(logFile, "utf-8");
    return content.split("\n").slice(-lines).join("\n");
}
function startProject(projectName, agentType, port) {
    const configs = (0, db_1.getConfigs)();
    const config = configs.find((c) => c.name === projectName);
    if (!config)
        return { success: false, error: "项目不存在" };
    if ((0, db_1.isRunning)(projectName)) {
        return { success: false, error: "项目已在运行" };
    }
    let configPath = config.path;
    if (agentType) {
        let content = fs.readFileSync(configPath, "utf-8");
        content = content.replace(/(\[projects\.agent\]\s*\n\s*type\s*=\s*)"[^"]+"/g, `$1"${agentType}"`);
        const tempPath = path.join(utils_1.CCM_DIR, "temp", `${projectName}-${agentType}.toml`);
        fs.mkdirSync(path.join(utils_1.CCM_DIR, "temp"), { recursive: true });
        fs.writeFileSync(tempPath, content);
        configPath = tempPath;
    }
    const logFile = path.join(utils_1.LOG_DIR, `${projectName}.log`);
    const logStream = fs.openSync(logFile, "w");
    const child = (0, child_process_1.spawn)("cc-connect", ["--config", configPath, "--force"], {
        stdio: ["ignore", logStream, logStream],
        shell: true,
        detached: true,
    });
    child.unref();
    const pidDir = path.join(utils_1.CCM_DIR, "pids");
    if (!fs.existsSync(pidDir))
        fs.mkdirSync(pidDir, { recursive: true });
    fs.writeFileSync(path.join(pidDir, `${projectName}.pid`), String(child.pid));
    return { success: true, pid: child.pid };
}
function stopProject(projectName) {
    const pid = (0, db_1.getPid)(projectName);
    if (!pid)
        return { success: false, error: "项目未在运行" };
    try {
        if (process.platform === "win32") {
            (0, child_process_1.execSync)(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        }
        else {
            process.kill(parseInt(pid), "SIGTERM");
        }
    }
    catch { }
    try {
        const pidFile = path.join(utils_1.CCM_DIR, "pids", `${projectName}.pid`);
        if (fs.existsSync(pidFile))
            fs.unlinkSync(pidFile);
    }
    catch { }
    return { success: true };
}
function handleProjectsApi(pathname, req, res, parsed, ctx) {
    // 1. 获取项目列表
    if (pathname === "/api/projects" && req.method === "GET") {
        const configs = (0, db_1.getConfigs)();
        const projects = configs.map((config) => {
            const info = (0, db_1.getConfigInfo)(config.path);
            const running = (0, db_1.isRunning)(config.name);
            const agentState = ctx.getAgentState(config.name);
            return {
                name: config.name,
                running,
                pid: running ? (0, db_1.getPid)(config.name) : null,
                agent: info[0]?.agent || "claudecode",
                platform: info[0]?.platform || "未知",
                work_dir: info[0]?.workDir || "",
                session_count: ctx.getSessions(config.name).length,
                state: agentState.state,
                lastActivity: agentState.lastActivity,
                stateDetail: agentState.detail,
            };
        });
        (0, utils_1.sendJson)(res, { projects });
        return true;
    }
    // 2. 获取可用 Agent 类型
    if (pathname === "/api/agents" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { agents: db_1.AGENTS });
        return true;
    }
    // 3. 启动项目
    if (pathname === "/api/start" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, agent } = JSON.parse(body);
                (0, utils_1.sendJson)(res, startProject(project, agent, ctx.PORT));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // 4. 停止项目
    if (pathname === "/api/stop" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project } = JSON.parse(body);
                (0, utils_1.sendJson)(res, stopProject(project));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // 5. 创建项目
    if (pathname === "/api/projects/create" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name, work_dir, agent, platform, platform_options } = JSON.parse(body);
                if (!name || !work_dir) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目名称和目录不能为空" }, 400);
                }
                const configPath = path.join(utils_1.CONFIGS_DIR, `config-${name}.toml`);
                if (fs.existsSync(configPath)) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目已存在" }, 400);
                }
                const template = `# cc-connect - ${name}
language = "zh"

[[projects]]
name = "${name}"
work_dir = "${work_dir.replace(/\\/g, "\\\\")}"

[projects.agent]
type = "${agent || "claudecode"}"

[[projects.platforms]]
type = "${platform || "weixin"}"
`;
                fs.writeFileSync(configPath, template);
                (0, utils_1.sendJson)(res, { success: true, message: "项目配置已创建" });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // 6. 更新项目
    if (pathname === "/api/projects/update" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name, work_dir, agent } = JSON.parse(body);
                if (!name) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目名称不能为空" }, 400);
                }
                const configPath = path.join(utils_1.CONFIGS_DIR, `config-${name}.toml`);
                if (!fs.existsSync(configPath)) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目不存在" }, 404);
                }
                const existingContent = fs.readFileSync(configPath, "utf-8");
                let updatedContent = existingContent;
                if (work_dir) {
                    updatedContent = updatedContent.replace(/work_dir\s*=\s*"[^"]*"/g, `work_dir = "${work_dir.replace(/\\/g, "\\\\")}"`);
                }
                if (agent) {
                    updatedContent = updatedContent.replace(/type\s*=\s*"[^"]*"/g, `type = "${agent}"`);
                }
                fs.writeFileSync(configPath, updatedContent);
                (0, utils_1.sendJson)(res, { success: true, message: "项目配置已更新" });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // 7. 删除项目
    if (pathname === "/api/projects/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name } = JSON.parse(body);
                if (!name) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目名称不能为空" }, 400);
                }
                const configPath = path.join(utils_1.CONFIGS_DIR, `config-${name}.toml`);
                if (!fs.existsSync(configPath)) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目不存在" }, 404);
                }
                if ((0, db_1.isRunning)(name)) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目正在运行，请先停止" }, 400);
                }
                fs.unlinkSync(configPath);
                const sessionFile = (0, sessions_1.findCcSessionFile)(name);
                if (sessionFile && fs.existsSync(sessionFile)) {
                    fs.unlinkSync(sessionFile);
                }
                const webSessionDir = path.join(sessions_1.WEB_SESSIONS_DIR, name);
                if (fs.existsSync(webSessionDir)) {
                    fs.rmSync(webSessionDir, { recursive: true });
                }
                (0, utils_1.sendJson)(res, { success: true, message: "项目已删除" });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // 8. 飞书扫码配置
    if (pathname === "/api/projects/feishu-setup" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name } = JSON.parse(body);
                console.log("[飞书配置] 收到请求，项目名称:", name);
                const configPath = path.join(utils_1.CONFIGS_DIR, `config-${name}.toml`);
                const qrImagePath = path.join(utils_1.UPLOAD_DIR, `feishu-qr-${name}.png`);
                let scanUrl = null;
                if (!fs.existsSync(utils_1.UPLOAD_DIR)) {
                    fs.mkdirSync(utils_1.UPLOAD_DIR, { recursive: true });
                }
                console.log("[飞书配置] 二维码图片路径:", qrImagePath);
                const child = (0, child_process_1.spawn)("cc-connect", ["feishu", "new", "--project", name, "--qr-image", qrImagePath, "--timeout", "300"], {
                    shell: true,
                    stdio: ["pipe", "pipe", "pipe"]
                });
                let cmdOutput = "";
                child.stdout.on("data", (data) => { cmdOutput += data.toString(); });
                child.stderr.on("data", (data) => { cmdOutput += data.toString(); });
                child.on("close", (code) => {
                    console.log("[飞书配置] cc-connect 完成，退出码:", code);
                    console.log("[飞书配置] 输出:", cmdOutput.substring(0, 500));
                    try {
                        const configContent = fs.readFileSync(configPath, "utf-8");
                        const appIdMatch = configContent.match(/app_id\s*=\s*"([^"]+)"/);
                        if (appIdMatch && appIdMatch[1] && appIdMatch[1] !== "" && appIdMatch[1] !== "PLACEHOLDER") {
                            const feishuConfig = (0, db_1.loadFeishuConfig)();
                            feishuConfig.app_id = appIdMatch[1];
                            const appSecretMatch = configContent.match(/app_secret\s*=\s*"([^"]+)"/);
                            if (appSecretMatch && appSecretMatch[1]) {
                                feishuConfig.app_secret = appSecretMatch[1];
                            }
                            (0, db_1.saveFeishuConfig)(feishuConfig);
                            console.log("[飞书配置] 配置已同步到全局:", feishuConfig.app_id);
                        }
                    }
                    catch { }
                });
                setTimeout(() => {
                    try {
                        const qrExists = fs.existsSync(qrImagePath);
                        console.log("[飞书配置] 二维码图片存在:", qrExists);
                        const urlPatterns = [
                            /URL:\s*(https?:\/\/\S+)/i,
                            /url:\s*(https?:\/\/\S+)/i,
                            /(https?:\/\/open\.feishu\.cn\S+)/i,
                        ];
                        for (const pattern of urlPatterns) {
                            const match = cmdOutput.match(pattern);
                            if (match) {
                                scanUrl = match[1];
                                console.log("[飞书配置] 提取到 URL:", scanUrl);
                                break;
                            }
                        }
                        (0, utils_1.sendJson)(res, {
                            success: true,
                            scan_url: scanUrl,
                            qr_image: qrExists ? `/api/uploads/feishu-qr-${name}.png` : null,
                            output: cmdOutput.substring(0, 2000),
                        });
                    }
                    catch (e) {
                        (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
                    }
                }, 2000);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // 9. 获取项目工具配置
    if (pathname === "/api/projects/tools" && req.method === "GET") {
        const project = parsed.query.project;
        if (!project)
            return (0, utils_1.sendJson)(res, { error: "缺少项目参数" }, 400);
        const configs = (0, db_1.loadProjectConfigs)();
        (0, utils_1.sendJson)(res, { tools: configs[project]?.tools || { mcp: [], skill: [] } });
        return true;
    }
    // 10. 更新项目工具配置
    if (pathname === "/api/projects/tools" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, tools } = JSON.parse(body);
                if (!project)
                    return (0, utils_1.sendJson)(res, { error: "缺少项目参数" }, 400);
                const configs = (0, db_1.loadProjectConfigs)();
                if (!configs[project])
                    configs[project] = {};
                configs[project].tools = tools;
                (0, db_1.saveProjectConfigs)(configs);
                (0, utils_1.sendJson)(res, { success: true, tools });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // 11. 获取项目共享文件
    if (pathname === "/api/projects/shared" && req.method === "GET") {
        const project = parsed.query.project;
        if (!project)
            return (0, utils_1.sendJson)(res, { error: "缺少项目参数" }, 400);
        const configs = (0, db_1.loadProjectConfigs)();
        (0, utils_1.sendJson)(res, { files: configs[project]?.shared_files || [] });
        return true;
    }
    // 12. 添加项目共享文件
    if (pathname === "/api/projects/shared/add" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, name, content } = JSON.parse(body);
                if (!project || !name)
                    return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
                const configs = (0, db_1.loadProjectConfigs)();
                if (!configs[project])
                    configs[project] = {};
                if (!configs[project].shared_files)
                    configs[project].shared_files = [];
                const existing = configs[project].shared_files.findIndex((f) => f.name === name);
                if (existing >= 0) {
                    configs[project].shared_files[existing].content = content;
                    configs[project].shared_files[existing].type = "text";
                    configs[project].shared_files[existing].readable = true;
                    configs[project].shared_files[existing].updated_at = new Date().toISOString();
                }
                else {
                    configs[project].shared_files.push({
                        name,
                        type: "text",
                        readable: true,
                        content,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }
                (0, db_1.saveProjectConfigs)(configs);
                (0, utils_1.sendJson)(res, { success: true, files: configs[project].shared_files });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // 13. 删除项目共享文件
    if (pathname === "/api/projects/shared/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, name } = JSON.parse(body);
                if (!project || !name)
                    return (0, utils_1.sendJson)(res, { error: "缺少参数" }, 400);
                const configs = (0, db_1.loadProjectConfigs)();
                if (configs[project]?.shared_files) {
                    configs[project].shared_files = configs[project].shared_files.filter((f) => f.name !== name);
                    (0, db_1.saveProjectConfigs)(configs);
                }
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // === 动态路由：获取项目会话列表、详情以及日志 ===
    // 14. 动态路由: /api/projects/:name/sessions
    const sessionsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sessions$/);
    if (sessionsMatch && req.method === "GET") {
        const projectName = decodeURIComponent(sessionsMatch[1]);
        (0, utils_1.sendJson)(res, { sessions: (0, sessions_1.getSessions)(projectName) });
        return true;
    }
    // 15. 动态路由: /api/projects/:name/sessions/:id
    const sessionDetailMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sessions\/([^/]+)$/);
    if (sessionDetailMatch && req.method === "GET") {
        const projectName = decodeURIComponent(sessionDetailMatch[1]);
        const sessionId = decodeURIComponent(sessionDetailMatch[2]);
        const detail = (0, sessions_1.getSessionDetail)(projectName, sessionId);
        if (detail) {
            (0, utils_1.sendJson)(res, detail);
        }
        else {
            (0, utils_1.sendJson)(res, { error: "会话不存在" }, 404);
        }
        return true;
    }
    // 16. 动态路由: /api/projects/:name/logs
    const logsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/logs$/);
    if (logsMatch && req.method === "GET") {
        const projectName = decodeURIComponent(logsMatch[1]);
        const lines = parseInt(parsed.query?.lines) || 100;
        (0, utils_1.sendJson)(res, { logs: getLogs(projectName, lines) });
        return true;
    }
    return false;
}
//# sourceMappingURL=projects.js.map