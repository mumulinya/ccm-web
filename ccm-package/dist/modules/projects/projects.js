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
exports.startControlBotConnection = startControlBotConnection;
exports.startProject = startProject;
exports.stopProject = stopProject;
exports.handleProjectsApi = handleProjectsApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const db_1 = require("../../core/db");
const sessions_1 = require("./sessions");
const credential_store_1 = require("../../core/credential-store");
function resolveCcConnectLauncher() {
    if (process.platform === "win32") {
        for (const entry of String(process.env.PATH || "").split(path.delimiter)) {
            const base = entry.replace(/^"|"$/g, "").trim();
            if (!base)
                continue;
            const executable = path.join(base, "node_modules", "cc-connect", "bin", "cc-connect.exe");
            if (fs.existsSync(executable))
                return { command: executable, shell: false };
        }
        return { command: "cc-connect", shell: true };
    }
    return { command: "cc-connect", shell: false };
}
function spawnCcConnect(args, options) {
    const launcher = resolveCcConnectLauncher();
    return (0, child_process_1.spawn)(launcher.command, args, { ...options, shell: launcher.shell, windowsHide: true });
}
function getLogs(projectName, lines = 100) {
    const logFile = path.join(utils_1.LOG_DIR, `${projectName}.log`);
    if (!fs.existsSync(logFile))
        return "";
    const content = fs.readFileSync(logFile, "utf-8");
    return content.split("\n").slice(-lines).join("\n");
}
function sanitizeFeishuSetupName(name) {
    return String(name || "ccm-control-bot").trim().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64) || "ccm-control-bot";
}
function syncFeishuAppCredentialsToGlobal(configPath, target) {
    const configContent = fs.readFileSync(configPath, "utf-8");
    const appIdMatch = configContent.match(/app_id\s*=\s*"([^"]+)"/);
    if (!appIdMatch?.[1] || appIdMatch[1] === "PLACEHOLDER")
        return null;
    const appSecretMatch = configContent.match(/app_secret\s*=\s*"([^"]+)"/);
    const resolvedAppSecret = appSecretMatch?.[1] ? (0, credential_store_1.resolveCredential)(appSecretMatch[1]) : "";
    const feishuConfig = (0, db_1.loadFeishuConfig)();
    if (target === "control_bot") {
        feishuConfig.control_bot_app_id = appIdMatch[1];
        if (resolvedAppSecret)
            feishuConfig.control_bot_app_secret = resolvedAppSecret;
        feishuConfig.control_bot_enabled = true;
    }
    else {
        feishuConfig.app_id = appIdMatch[1];
        if (resolvedAppSecret)
            feishuConfig.app_secret = resolvedAppSecret;
    }
    (0, db_1.saveFeishuConfig)(feishuConfig);
    return { app_id: appIdMatch[1], has_secret: !!resolvedAppSecret };
}
const CONTROL_BOT_NAME = "ccm-control-bot";
const CONTROL_BOT_DIR = path.join(utils_1.CCM_DIR, "control-bot");
const CONTROL_BOT_CONFIG_FILE = path.join(CONTROL_BOT_DIR, "config.toml");
const CONTROL_BOT_PID_FILE = path.join(utils_1.CCM_DIR, "pids", `${CONTROL_BOT_NAME}.pid`);
const CONTROL_BOT_LOG_FILE = path.join(utils_1.LOG_DIR, `${CONTROL_BOT_NAME}.log`);
function escapeTomlString(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\r?\n/g, "\\n");
}
function ensureControlBotHookToken(config) {
    if (!config.control_bot_hook_token) {
        config.control_bot_hook_token = crypto.randomBytes(24).toString("hex");
        (0, db_1.saveFeishuConfig)(config);
    }
    return config.control_bot_hook_token;
}
function getControlBotPid() {
    if (!fs.existsSync(CONTROL_BOT_PID_FILE))
        return null;
    const pid = Number(fs.readFileSync(CONTROL_BOT_PID_FILE, "utf-8").trim());
    if (!pid)
        return null;
    try {
        process.kill(pid, 0);
        return pid;
    }
    catch {
        try {
            fs.unlinkSync(CONTROL_BOT_PID_FILE);
        }
        catch { }
        return null;
    }
}
function writeControlBotConfig(port = 3080) {
    const config = (0, db_1.loadFeishuConfig)();
    const appId = String(config.control_bot_app_id || config.app_id || "").trim();
    const appSecret = String(config.control_bot_app_secret || config.app_secret || "").trim();
    if (!appId || !appSecret)
        throw new Error("请先扫码配置控制机器人 App ID / Secret");
    fs.mkdirSync(CONTROL_BOT_DIR, { recursive: true });
    fs.mkdirSync(path.dirname(CONTROL_BOT_PID_FILE), { recursive: true });
    const workDir = process.cwd();
    const adapterPath = path.join(__dirname, "..", "control-bot-acp.js");
    const appSecretRef = (0, credential_store_1.protectCredential)("control-bot", "app_secret", appSecret);
    const toml = `# Generated by CCM. Do not edit manually.\nlanguage = "zh"\n\n[[projects]]\nname = "${CONTROL_BOT_NAME}"\nadmin_from = "*"\n\n[projects.agent]\ntype = "acp"\n\n[projects.agent.options]\nwork_dir = "${escapeTomlString(workDir)}"\ncommand = "node"\nargs = ["${escapeTomlString(adapterPath)}", "--port=${port}"]\ndisplay_name = "CCM 全局 Agent"\n\n[[projects.platforms]]\ntype = "feishu"\n\n[projects.platforms.options]\napp_id = "${escapeTomlString(appId)}"\napp_secret = "${escapeTomlString(appSecretRef)}"\nallow_from = "*"\nenable_feishu_card = true\nthread_isolation = true\nprogress_style = "compact"\n`;
    fs.writeFileSync(CONTROL_BOT_CONFIG_FILE, toml, "utf-8");
    return CONTROL_BOT_CONFIG_FILE;
}
function stopControlBotConnection() {
    const pid = getControlBotPid();
    if (!pid)
        return { success: true, running: false, message: "控制机器人未运行" };
    try {
        if (process.platform === "win32")
            (0, child_process_1.execSync)(`taskkill /T /F /PID ${pid}`, { stdio: "ignore" });
        else
            process.kill(pid, "SIGTERM");
    }
    catch { }
    try {
        fs.unlinkSync(CONTROL_BOT_PID_FILE);
    }
    catch { }
    return { success: true, running: false, message: "控制机器人已停止" };
}
function startControlBotConnection(port = 3080) {
    const existing = getControlBotPid();
    if (existing)
        return { success: true, running: true, pid: existing, config_path: CONTROL_BOT_CONFIG_FILE, message: "控制机器人已在运行" };
    const safeConfigPath = writeControlBotConfig(port);
    const configPath = (0, credential_store_1.createPrivateRuntimeConfig)(CONTROL_BOT_NAME, fs.readFileSync(safeConfigPath, "utf-8"));
    fs.mkdirSync(utils_1.LOG_DIR, { recursive: true });
    const logStream = fs.openSync(CONTROL_BOT_LOG_FILE, "a");
    const child = spawnCcConnect(["--config", configPath, "--force"], {
        stdio: ["ignore", logStream, logStream],
        detached: true,
    });
    child.unref();
    (0, credential_store_1.schedulePrivateRuntimeConfigCleanup)(configPath);
    fs.writeFileSync(CONTROL_BOT_PID_FILE, String(child.pid));
    return { success: true, running: true, pid: child.pid, config_path: safeConfigPath, log_file: CONTROL_BOT_LOG_FILE, message: "控制机器人长连接已启动" };
}
function getControlBotConnectionStatus() {
    const pid = getControlBotPid();
    return { success: true, running: !!pid, pid, config_path: CONTROL_BOT_CONFIG_FILE, log_file: CONTROL_BOT_LOG_FILE };
}
function startProject(projectName, agentType, port) {
    const configs = (0, db_1.getConfigs)();
    const config = configs.find((c) => c.name === projectName);
    if (!config)
        return { success: false, error: "项目不存在" };
    if ((0, db_1.isRunning)(projectName)) {
        return { success: false, error: "项目已在运行" };
    }
    let content = fs.readFileSync(config.path, "utf-8");
    if (agentType) {
        content = content.replace(/(\[projects\.agent\]\s*\n\s*type\s*=\s*)"[^"]+"/g, `$1"${agentType}"`);
    }
    const configPath = (0, credential_store_1.createPrivateRuntimeConfig)(`${projectName}-${agentType || "default"}`, content);
    const logFile = path.join(utils_1.LOG_DIR, `${projectName}.log`);
    const logStream = fs.openSync(logFile, "w");
    const child = spawnCcConnect(["--config", configPath, "--force"], {
        stdio: ["ignore", logStream, logStream],
        detached: true,
    });
    child.unref();
    (0, credential_store_1.schedulePrivateRuntimeConfigCleanup)(configPath);
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
            (0, child_process_1.execSync)(`taskkill /T /F /PID ${pid}`, { stdio: "ignore" });
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
function normalizeVerificationCommands(value) {
    if (Array.isArray(value))
        return value.map((item) => String(item || "").trim()).filter(Boolean);
    const text = String(value || "").trim();
    if (!text)
        return [];
    return text.split(/\r?\n|[；;]/).map((item) => item.trim()).filter(Boolean);
}
function uniqueStrings(values) {
    return Array.from(new Set(values.map((item) => String(item || "").trim()).filter(Boolean)));
}
function normalizeConfigList(value) {
    if (Array.isArray(value))
        return value.map((item) => String(item || "").trim()).filter(Boolean);
    const text = String(value || "").trim();
    if (!text)
        return [];
    return text.split(/\r?\n|[；;]/).map((item) => item.trim()).filter(Boolean);
}
function normalizeProjectAgentProfile(config = {}) {
    return {
        responsibility: String(config.responsibility || config.role_scope || config.roleScope || "").trim(),
        capabilities: normalizeConfigList(config.capabilities || config.capability_tags || config.capabilityTags),
        writable_paths: normalizeConfigList(config.writable_paths || config.writablePaths || config.allowed_paths || config.allowedPaths),
        forbidden_paths: normalizeConfigList(config.forbidden_paths || config.forbiddenPaths || config.blocked_paths || config.blockedPaths),
        delivery_contract: String(config.delivery_contract || config.deliveryContract || "").trim(),
    };
}
function readPackageJsonScripts(workDir) {
    try {
        const file = path.join(workDir, "package.json");
        if (!fs.existsSync(file))
            return {};
        const data = JSON.parse(fs.readFileSync(file, "utf-8"));
        return data?.scripts && typeof data.scripts === "object" ? data.scripts : {};
    }
    catch {
        return {};
    }
}
function inferProjectVerificationCommands(workDir = "") {
    const dir = String(workDir || "").trim();
    if (!dir || !fs.existsSync(dir))
        return [];
    const hints = [];
    const scripts = readPackageJsonScripts(dir);
    const scriptNames = Object.keys(scripts);
    const addNpmScript = (name) => {
        if (scriptNames.includes(name))
            hints.push(`npm run ${name}`);
    };
    addNpmScript("check");
    addNpmScript("typecheck");
    addNpmScript("lint");
    addNpmScript("test");
    addNpmScript("build");
    if (fs.existsSync(path.join(dir, "pom.xml")))
        hints.push("mvn test");
    if (fs.existsSync(path.join(dir, "build.gradle")) || fs.existsSync(path.join(dir, "build.gradle.kts")))
        hints.push("gradle test");
    if (fs.existsSync(path.join(dir, "pytest.ini")) || fs.existsSync(path.join(dir, "pyproject.toml")))
        hints.push("pytest");
    if (fs.existsSync(path.join(dir, "go.mod")))
        hints.push("go test ./...");
    if (fs.existsSync(path.join(dir, "Cargo.toml")))
        hints.push("cargo test");
    return uniqueStrings(hints).slice(0, 6);
}
function getProjectWorkDir(projectName) {
    const config = (0, db_1.getConfigs)().find((item) => item.name === projectName);
    if (!config)
        return "";
    const info = (0, db_1.getConfigInfo)(config.path);
    return info[0]?.workDir || "";
}
function applyInferredVerificationCommands(options = {}) {
    const projectNames = Array.isArray(options.projects) && options.projects.length
        ? options.projects.map((item) => String(item || "").trim()).filter(Boolean)
        : (0, db_1.getConfigs)().map((item) => item.name);
    const overwrite = options.overwrite === true;
    const configs = (0, db_1.loadProjectConfigs)();
    const results = [];
    for (const project of projectNames) {
        const configured = normalizeVerificationCommands(configs[project]?.verification_commands
            || configs[project]?.verificationCommands
            || configs[project]?.test_commands
            || configs[project]?.testCommands
            || configs[project]?.check_commands
            || configs[project]?.checkCommands);
        const inferred = inferProjectVerificationCommands(getProjectWorkDir(project));
        if (configured.length > 0 && !overwrite) {
            results.push({ project, status: "skipped_configured", configured, inferred });
            continue;
        }
        if (inferred.length === 0) {
            results.push({ project, status: "missing_inferred", configured, inferred: [] });
            continue;
        }
        if (!configs[project])
            configs[project] = {};
        configs[project].verification_commands = inferred;
        results.push({ project, status: configured.length > 0 ? "overwritten" : "applied", configured: inferred, inferred });
    }
    const applied = results.filter((item) => item.status === "applied" || item.status === "overwritten").length;
    if (applied > 0)
        (0, db_1.saveProjectConfigs)(configs);
    return {
        success: true,
        applied,
        skipped_configured: results.filter((item) => item.status === "skipped_configured").length,
        missing_inferred: results.filter((item) => item.status === "missing_inferred").length,
        results,
    };
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
                const { name, work_dir, agent, platform } = JSON.parse(body);
                if (!name || !work_dir) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目名称和目录不能为空" }, 400);
                }
                const configPath = path.join(utils_1.CONFIGS_DIR, `config-${name}.toml`);
                let existingAppId = "";
                let existingAppSecret = "";
                if (fs.existsSync(configPath)) {
                    const content = fs.readFileSync(configPath, "utf-8");
                    const appIdMatch = content.match(/app_id\s*=\s*"([^"]+)"/);
                    const appSecretMatch = content.match(/app_secret\s*=\s*"([^"]+)"/);
                    if (appIdMatch?.[1]) {
                        existingAppId = appIdMatch[1];
                        existingAppSecret = appSecretMatch?.[1] || "";
                    }
                    else {
                        return (0, utils_1.sendJson)(res, { success: false, error: "项目已存在" }, 400);
                    }
                }
                let platformOptionsToml = "";
                const finalPlatform = platform || "feishu";
                if (finalPlatform === "feishu" || finalPlatform === "lark") {
                    platformOptionsToml = `\n[projects.platforms.options]\napp_id = "${escapeTomlString(existingAppId)}"\napp_secret = "${escapeTomlString(existingAppSecret)}"\nenable_feishu_card = true\nthread_isolation = true\nprogress_style = "card"`;
                }
                const template = `# cc-connect - ${name}
language = "zh"

[[projects]]
name = "${name}"
work_dir = "${work_dir.replace(/\\\\/g, "\\").replace(/\\/g, "\\\\")}"

[projects.agent]
type = "${agent || "claudecode"}"

[[projects.platforms]]
type = "${finalPlatform}"${platformOptionsToml}
`;
                fs.writeFileSync(configPath, template);
                (0, credential_store_1.migrateTomlCredentials)(configPath);
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
                const { name, work_dir, agent, platform } = JSON.parse(body);
                if (!name) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目名称不能为空" }, 400);
                }
                const configPath = path.join(utils_1.CONFIGS_DIR, `config-${name}.toml`);
                if (!fs.existsSync(configPath)) {
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目不存在" }, 404);
                }
                const content = fs.readFileSync(configPath, "utf-8");
                const appIdMatch = content.match(/app_id\s*=\s*"([^"]+)"/);
                const appSecretMatch = content.match(/app_secret\s*=\s*"([^"]+)"/);
                const existingAppId = appIdMatch?.[1] || "";
                const existingAppSecret = appSecretMatch?.[1] || "";
                let platformOptionsToml = "";
                const finalPlatform = platform || "feishu";
                if (finalPlatform === "feishu" || finalPlatform === "lark") {
                    platformOptionsToml = `\n[projects.platforms.options]\napp_id = "${escapeTomlString(existingAppId)}"\napp_secret = "${escapeTomlString(existingAppSecret)}"\nenable_feishu_card = true\nthread_isolation = true\nprogress_style = "card"`;
                }
                const template = `# cc-connect - ${name}
language = "zh"

[[projects]]
name = "${name}"
work_dir = "${work_dir.replace(/\\\\/g, "\\").replace(/\\/g, "\\\\")}"

[projects.agent]
type = "${agent || "claudecode"}"

[[projects.platforms]]
type = "${finalPlatform}"${platformOptionsToml}
`;
                fs.writeFileSync(configPath, template);
                (0, credential_store_1.migrateTomlCredentials)(configPath);
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
    // 8. 全局飞书控制机器人连接状态
    if (pathname === "/api/security/credentials/status" && req.method === "GET") {
        const configs = (0, db_1.getConfigs)();
        const plaintextSecrets = configs.reduce((count, item) => count + (fs.readFileSync(item.path, "utf-8").match(/(?:app_secret|api_key|access_token|refresh_token|hook_token)\s*=\s*"(?!ccm-secret:\/\/)[^"]+"/gi) || []).length, 0);
        (0, utils_1.sendJson)(res, { success: true, ...(0, credential_store_1.credentialStoreStatus)(), config_files: configs.length, plaintext_config_secrets: plaintextSecrets });
        return true;
    }
    if (pathname === "/api/security/credentials/migrate" && req.method === "POST") {
        try {
            const migrated = (0, credential_store_1.migrateConfigDirectory)(utils_1.CONFIGS_DIR);
            const globalConfig = (0, db_1.loadFeishuConfig)();
            if (Object.keys(globalConfig || {}).length)
                (0, db_1.saveFeishuConfig)(globalConfig);
            (0, utils_1.sendJson)(res, { success: true, migrated, store: (0, credential_store_1.credentialStoreStatus)(), rotation_recommended: migrated.credentials > 0 });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/feishu/control-bot/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, getControlBotConnectionStatus());
        return true;
    }
    if (pathname === "/api/feishu/control-bot/start" && req.method === "POST") {
        try {
            (0, utils_1.sendJson)(res, startControlBotConnection(Number(req.socket?.localPort || 3080)));
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message || "控制机器人长连接启动失败" }, 400);
        }
        return true;
    }
    if (pathname === "/api/feishu/control-bot/stop" && req.method === "POST") {
        (0, utils_1.sendJson)(res, stopControlBotConnection());
        return true;
    }
    // 9. 全局飞书控制机器人扫码配置
    if (pathname === "/api/feishu/control-bot/setup" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const setupName = sanitizeFeishuSetupName(payload.name || "ccm-control-bot");
                console.log("[飞书控制机器人配置] 收到扫码配置请求:", setupName);
                const configPath = path.join(utils_1.CONFIGS_DIR, `config-${setupName}.toml`);
                const qrImagePath = path.join(utils_1.UPLOAD_DIR, `feishu-control-bot-qr-${setupName}.png`);
                let scanUrl = null;
                if (!fs.existsSync(utils_1.UPLOAD_DIR)) {
                    fs.mkdirSync(utils_1.UPLOAD_DIR, { recursive: true });
                }
                const child = spawnCcConnect(["feishu", "new", "--project", setupName, "--qr-image", qrImagePath, "--timeout", "300"], {
                    stdio: ["pipe", "pipe", "pipe"],
                });
                let cmdOutput = "";
                child.stdout.on("data", (data) => { cmdOutput += data.toString(); });
                child.stderr.on("data", (data) => { cmdOutput += data.toString(); });
                child.on("close", (code) => {
                    console.log("[飞书控制机器人配置] cc-connect 完成，退出码:", code);
                    console.log("[飞书控制机器人配置] 输出:", (0, credential_store_1.redactSensitiveText)(cmdOutput).substring(0, 500));
                    try {
                        const synced = syncFeishuAppCredentialsToGlobal(configPath, "control_bot");
                        if (synced) {
                            (0, credential_store_1.migrateTomlCredentials)(configPath);
                            console.log("[飞书控制机器人配置] 应用凭证已同步到控制机器人:", synced.app_id);
                            try {
                                startControlBotConnection(Number(req.socket?.localPort || 3080));
                            }
                            catch (startError) {
                                console.warn("[飞书控制机器人配置] 自动启动长连接失败:", startError?.message || startError);
                            }
                        }
                    }
                    catch (error) {
                        console.warn("[飞书控制机器人配置] 同步应用凭证失败:", error?.message || error);
                    }
                });
                setTimeout(() => {
                    try {
                        const qrExists = fs.existsSync(qrImagePath);
                        const urlPatterns = [
                            /URL:\s*(https?:\/\/\S+)/i,
                            /url:\s*(https?:\/\/\S+)/i,
                            /(https?:\/\/open\.feishu\.cn\S+)/i,
                        ];
                        for (const pattern of urlPatterns) {
                            const match = cmdOutput.match(pattern);
                            if (match) {
                                scanUrl = match[1];
                                break;
                            }
                        }
                        (0, utils_1.sendJson)(res, {
                            success: true,
                            scan_url: scanUrl,
                            qr_image: qrExists ? `/api/uploads/feishu-control-bot-qr-${setupName}.png` : null,
                            output: (0, credential_store_1.redactSensitiveText)(cmdOutput).substring(0, 2000),
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
    // 9. 飞书扫码配置
    if (pathname === "/api/projects/feishu-setup" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name } = JSON.parse(body);
                const projectName = sanitizeFeishuSetupName(name);
                console.log("[飞书配置] 收到请求，项目名称:", projectName);
                const configPath = path.join(utils_1.CONFIGS_DIR, `config-${projectName}.toml`);
                const qrImagePath = path.join(utils_1.UPLOAD_DIR, `feishu-qr-${projectName}.png`);
                let scanUrl = null;
                if (!fs.existsSync(utils_1.UPLOAD_DIR)) {
                    fs.mkdirSync(utils_1.UPLOAD_DIR, { recursive: true });
                }
                console.log("[飞书配置] 二维码图片路径:", qrImagePath);
                const child = spawnCcConnect(["feishu", "new", "--project", projectName, "--qr-image", qrImagePath, "--timeout", "300"], {
                    stdio: ["pipe", "pipe", "pipe"],
                });
                let cmdOutput = "";
                child.stdout.on("data", (data) => { cmdOutput += data.toString(); });
                child.stderr.on("data", (data) => { cmdOutput += data.toString(); });
                child.on("close", (code) => {
                    console.log("[飞书配置] cc-connect 完成，退出码:", code);
                    console.log("[飞书配置] 输出:", (0, credential_store_1.redactSensitiveText)(cmdOutput).substring(0, 500));
                    try {
                        const synced = syncFeishuAppCredentialsToGlobal(configPath, "project");
                        if (synced) {
                            (0, credential_store_1.migrateTomlCredentials)(configPath);
                            console.log("[飞书配置] 配置已同步到全局:", synced.app_id);
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
                            qr_image: qrExists ? `/api/uploads/feishu-qr-${projectName}.png` : null,
                            output: (0, credential_store_1.redactSensitiveText)(cmdOutput).substring(0, 2000),
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
        const configuredCommands = normalizeVerificationCommands(configs[project]?.verification_commands || configs[project]?.verificationCommands || []);
        const inferredCommands = inferProjectVerificationCommands(getProjectWorkDir(project));
        const profile = normalizeProjectAgentProfile(configs[project] || {});
        (0, utils_1.sendJson)(res, {
            tools: configs[project]?.tools || { mcp: [], skill: [] },
            verification_commands: configuredCommands,
            inferred_verification_commands: inferredCommands,
            verification_source: configuredCommands.length > 0 ? "configured" : (inferredCommands.length > 0 ? "inferred" : "missing"),
            ...profile,
        });
        return true;
    }
    // 10. 更新项目工具配置
    if (pathname === "/api/projects/tools" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body);
                const { project, tools, verification_commands, verificationCommands } = payload;
                if (!project)
                    return (0, utils_1.sendJson)(res, { error: "缺少项目参数" }, 400);
                const configs = (0, db_1.loadProjectConfigs)();
                if (!configs[project])
                    configs[project] = {};
                configs[project].tools = tools;
                const commands = normalizeVerificationCommands(verification_commands || verificationCommands);
                const profile = normalizeProjectAgentProfile(payload);
                configs[project].verification_commands = commands;
                configs[project].responsibility = profile.responsibility;
                configs[project].capabilities = profile.capabilities;
                configs[project].writable_paths = profile.writable_paths;
                configs[project].forbidden_paths = profile.forbidden_paths;
                configs[project].delivery_contract = profile.delivery_contract;
                (0, db_1.saveProjectConfigs)(configs);
                (0, utils_1.sendJson)(res, { success: true, tools, verification_commands: commands, ...profile });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    // 11. 批量采用可推断的项目验证命令
    if (pathname === "/api/projects/verification-commands/apply-inferred" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                (0, utils_1.sendJson)(res, applyInferredVerificationCommands({
                    projects: payload.projects,
                    overwrite: payload.overwrite,
                }));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    // 12. 获取项目共享文件
    if (pathname === "/api/projects/shared" && req.method === "GET") {
        const project = parsed.query.project;
        if (!project)
            return (0, utils_1.sendJson)(res, { error: "缺少项目参数" }, 400);
        const configs = (0, db_1.loadProjectConfigs)();
        (0, utils_1.sendJson)(res, { files: configs[project]?.shared_files || [] });
        return true;
    }
    // 13. 添加项目共享文件
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
    // 14. 删除项目共享文件
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
    // 15. 动态路由: /api/projects/:name/sessions
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