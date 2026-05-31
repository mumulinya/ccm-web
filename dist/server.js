#!/usr/bin/env node
"use strict";
// ccm Web 控制台服务器
// 零依赖，使用 Node.js 原生 http 模块
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");
const os = require("os");
const url = require("url");
const CCM_DIR = path.join(os.homedir(), ".cc-connect");
const CONFIGS_DIR = path.join(CCM_DIR, "configs");
const PID_DIR = path.join(CCM_DIR, "pids");
const LOG_DIR = path.join(CCM_DIR, "logs");
const SESSIONS_DIR = path.join(CCM_DIR, "sessions");
const SHARED_DIR = path.join(CCM_DIR, "shared");
const TASKS_FILE = path.join(CCM_DIR, "tasks.json");
const CRON_FILE = path.join(CCM_DIR, "cron-jobs.json");
const UPLOAD_DIR = path.join(CCM_DIR, "uploads");
const GROUPS_FILE = path.join(CCM_DIR, "groups.json");
const GROUP_MESSAGES_DIR = path.join(CCM_DIR, "group-messages");
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");
// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR))
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(GROUP_MESSAGES_DIR))
    fs.mkdirSync(GROUP_MESSAGES_DIR, { recursive: true });
// === 群聊管理 ===
function loadGroups() {
    if (!fs.existsSync(GROUPS_FILE))
        return [];
    try {
        return JSON.parse(fs.readFileSync(GROUPS_FILE, "utf-8"));
    }
    catch {
        return [];
    }
}
function saveGroups(groups) {
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
}
function getGroupMessages(groupId) {
    const file = path.join(GROUP_MESSAGES_DIR, `${groupId}.json`);
    if (!fs.existsSync(file))
        return [];
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return [];
    }
}
function appendGroupMessage(groupId, msg) {
    const messages = getGroupMessages(groupId);
    messages.push(msg);
    fs.writeFileSync(path.join(GROUP_MESSAGES_DIR, `${groupId}.json`), JSON.stringify(messages, null, 2));
}
function callAgent(projectName, message, workDir, agentType, timeoutMs) {
    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
    const tmpMsg = path.join(UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    fs.writeFileSync(tmpMsg, message, "utf-8");
    let cmd;
    switch (agentType) {
        case "cursor":
            cmd = `type "${tmpMsg}" | agent -p`;
            break;
        case "gemini":
            cmd = `type "${tmpMsg}" | gemini -p`;
            break;
        case "codex":
            cmd = `type "${tmpMsg}" | codex -q`;
            break;
        default:
            cmd = `type "${tmpMsg}" | claude -p`;
            break;
    }
    try {
        const result = execSync(cmd, {
            encoding: "utf-8",
            timeout: timeoutMs || 300000, // 默认 5 分钟
            cwd: safeCwd,
            shell: true,
            maxBuffer: 10 * 1024 * 1024,
        });
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        return result.trim();
    }
    catch (e) {
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        if (e.killed || e.signal === "SIGTERM")
            return `[${projectName}] Agent 响应超时，请稍后重试`;
        return `[${projectName}] Agent 错误: ${(e.stderr || e.message || "").substring(0, 200)}`;
    }
}
// 流式调用 Agent（SSE）
function callAgentStream(projectName, message, workDir, agentType, res) {
    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
    const tmpMsg = path.join(UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
    fs.writeFileSync(tmpMsg, message, "utf-8");
    let cmd;
    switch (agentType) {
        case "cursor":
            cmd = `type "${tmpMsg}" | agent -p`;
            break;
        case "gemini":
            cmd = `type "${tmpMsg}" | gemini -p`;
            break;
        case "codex":
            cmd = `type "${tmpMsg}" | codex -q`;
            break;
        default:
            cmd = `type "${tmpMsg}" | claude -p`;
            break;
    }
    // 设置 SSE
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
    });
    // 发送状态事件
    res.write(`data: ${JSON.stringify({ type: "status", text: "Agent 正在思考..." })}\n\n`);
    const child = spawn(cmd, [], { shell: true, cwd: safeCwd, stdio: ["pipe", "pipe", "pipe"] });
    // 关闭 stdin（已通过临时文件传入）
    child.stdin.end();
    let buffer = "";
    let charCount = 0;
    child.stdout.on("data", (chunk) => {
        const text = chunk.toString("utf-8");
        buffer += text;
        charCount += text.length;
        // 每收到数据就发送
        if (charCount > 10) {
            res.write(`data: ${JSON.stringify({ type: "chunk", text: buffer })}\n\n`);
            buffer = "";
            charCount = 0;
        }
    });
    child.stderr.on("data", (chunk) => {
        const text = chunk.toString("utf-8");
        if (text.trim()) {
            res.write(`data: ${JSON.stringify({ type: "status", text: "Agent 处理中..." })}\n\n`);
        }
    });
    child.on("close", () => {
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        if (buffer) {
            res.write(`data: ${JSON.stringify({ type: "chunk", text: buffer })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
    });
    child.on("error", (err) => {
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        res.write(`data: ${JSON.stringify({ type: "error", text: err.message })}\n\n`);
        res.end();
    });
    // 超时处理
    setTimeout(() => {
        try {
            child.kill();
        }
        catch { }
        try {
            fs.unlinkSync(tmpMsg);
        }
        catch { }
        res.write(`data: ${JSON.stringify({ type: "error", text: "Agent 响应超时" })}\n\n`);
        res.end();
    }, 300000);
}
// 异步处理跨 Agent 协作调用
function processCrossAgents(groupId, group, sourceProject, output, atMentions, configs) {
    console.log(`[跨Agent协作] 源: ${sourceProject}, 检测到 @mentions: ${atMentions.join(", ")}`);
    // 去重 mentions
    const uniqueMentions = [...new Set(atMentions)];
    console.log(`[跨Agent协作] 去重后 mentions: ${uniqueMentions.join(", ")}`);
    for (const mention of uniqueMentions) {
        // 确保 mention 是 @ 开头的格式
        const mentionStr = String(mention);
        const targetName = mentionStr.startsWith("@") ? mentionStr.slice(1) : mentionStr;
        console.log(`[跨Agent协作] 处理 @${targetName}`);
        const targetMember = group.members.find(m => m.project === targetName && m.project !== sourceProject);
        if (!targetMember) {
            console.log(`[跨Agent协作] @${targetName} 不在群聊成员中，跳过`);
            continue;
        }
        // 提取 @mention 后面的消息（支持多行）
        const atRegex = new RegExp(`@${targetName}\\s+([^@]+?)(?=\\s*@|$)`, "is");
        const atMatch = output.match(atRegex);
        let atMessage = atMatch ? atMatch[1].trim() : "";
        // 如果没有提取到具体消息，尝试提取 @mention 所在段落
        if (!atMessage || atMessage.length < 5) {
            const lines = output.split("\n");
            const relevantLines = [];
            let found = false;
            for (const line of lines) {
                if (line.includes(`@${targetName}`)) {
                    found = true;
                    relevantLines.push(line.replace(`@${targetName}`, "").trim());
                }
                else if (found && line.trim() && !line.startsWith("@")) {
                    relevantLines.push(line.trim());
                }
                else if (found && line.includes("@")) {
                    break;
                }
            }
            atMessage = relevantLines.join("\n").trim() || output.substring(0, 500);
        }
        console.log(`[跨Agent协作] 提取的消息: ${atMessage.substring(0, 100)}...`);
        // 记录转发消息
        appendGroupMessage(groupId, {
            id: "m" + Date.now().toString(36) + "fwd",
            role: "assistant", agent: sourceProject,
            content: `📤 → @${targetName}\n${atMessage}`,
            timestamp: new Date().toISOString(),
        });
        // 调用目标 Agent
        const targetConfig = configs.find(c => c.name === targetName);
        if (!targetConfig) {
            console.log(`[跨Agent协作] @${targetName} 的配置不存在`);
            continue;
        }
        console.log(`[跨Agent协作] 找到 @${targetName} 的配置，准备调用`);
        const tInfo = getConfigInfo(targetConfig.path);
        const tWorkDir = tInfo[0]?.workDir;
        const tAgentType = tInfo[0]?.agent || "claudecode";
        console.log(`[跨Agent协作] 目标 Agent: ${targetName}, 工作目录: ${tWorkDir}, 类型: ${tAgentType}`);
        // 获取完整上下文
        const tContext = getGroupMessages(groupId).slice(-15).map(m => {
            const who = m.role === "user" ? `[用户 → ${m.target}]` : `[${m.agent || "Agent"}]`;
            return `${who} ${m.content}`;
        }).join("\n");
        // 构建详细的 prompt
        const memberList = group.members.map(m => m.project).filter(p => p !== targetName && p !== "coordinator").join(", ");
        const tPrompt = `你是一个在群聊中协作的开发 Agent，项目: ${targetName}。

${memberList ? `群聊中还有其他 Agent：${memberList}。如果你需要其他 Agent 协助，在回复中用 @项目名 的格式提出请求。` : ""}

以下是群聊最近的消息记录：
${tContext}

${sourceProject} 刚才 @ 了你，请根据上下文回复他的请求：
${atMessage}

请直接回复，不要重复上下文内容。`;
        console.log(`[跨Agent协作] 调用 Agent ${targetName}...`);
        try {
            const tOutput = callAgent(targetName, tPrompt, tWorkDir, tAgentType, 300000);
            console.log(`[跨Agent协作] Agent ${targetName} 回复: ${tOutput.substring(0, 100)}...`);
            appendGroupMessage(groupId, {
                id: "m" + Date.now().toString(36) + "cross",
                role: "assistant", agent: targetName,
                content: tOutput,
                timestamp: new Date().toISOString(),
            });
            // 检查目标 Agent 的回复是否也包含 @mention，递归处理
            const nestedMentions = tOutput.match(/@[\w-]+/g) || [];
            if (nestedMentions.length > 0) {
                // 避免无限递归：只处理不是来源项目的 mention
                const newMentions = nestedMentions.filter(m => m.slice(1) !== sourceProject && m.slice(1) !== targetName);
                if (newMentions.length > 0) {
                    console.log(`[跨Agent协作] Agent ${targetName} 的回复包含 @mentions: ${newMentions.join(", ")}，递归处理`);
                    setTimeout(() => processCrossAgents(groupId, group, targetName, tOutput, newMentions, configs), 1000);
                }
            }
        }
        catch (error) {
            console.error(`[跨Agent协作] 调用 Agent ${targetName} 失败:`, error.message);
            // 记录错误消息
            appendGroupMessage(groupId, {
                id: "m" + Date.now().toString(36) + "err",
                role: "assistant", agent: "system",
                content: `❌ 转发给 @${targetName} 失败: ${error.message}`,
                timestamp: new Date().toISOString(),
            });
        }
    }
}
// === Multipart 解析 ===
function parseMultipart(buffer, boundary) {
    const files = [];
    const fields = {};
    const boundaryBuf = Buffer.from(`--${boundary}`);
    const parts = [];
    let start = buffer.indexOf(boundaryBuf) + boundaryBuf.length + 2; // skip \r\n
    while (true) {
        const end = buffer.indexOf(boundaryBuf, start);
        if (end === -1)
            break;
        parts.push(buffer.slice(start, end - 2)); // -2 for \r\n before boundary
        start = end + boundaryBuf.length + 2;
    }
    for (const part of parts) {
        const headerEnd = part.indexOf("\r\n\r\n");
        if (headerEnd === -1)
            continue;
        const headerStr = part.slice(0, headerEnd).toString("utf-8");
        const body = part.slice(headerEnd + 4);
        const nameMatch = headerStr.match(/name="([^"]+)"/);
        const filenameMatch = headerStr.match(/filename="([^"]+)"/);
        if (filenameMatch && nameMatch) {
            const name = nameMatch[1];
            const filename = filenameMatch[1];
            const ext = path.extname(filename);
            const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
            const filePath = path.join(UPLOAD_DIR, safeName);
            fs.writeFileSync(filePath, body);
            files.push({ field: name, filename, savedPath: filePath, size: body.length });
        }
        else if (nameMatch) {
            fields[nameMatch[1]] = body.toString("utf-8");
        }
    }
    return { files, fields };
}
const AGENTS = [
    { type: "claudecode", name: "Claude Code" },
    { type: "cursor", name: "Cursor" },
    { type: "gemini", name: "Gemini CLI" },
    { type: "codex", name: "Codex" },
    { type: "qoder", name: "Qoder CLI" },
    { type: "opencode", name: "OpenCode" },
];
// === 数据读取函数 ===
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
            currentProject.workDir = trimmed.split("=")[1].trim().replace(/"/g, "");
        if (currentProject && trimmed.startsWith("type = ") && !inPlatformsBlock) {
            const v = trimmed.split("=")[1].trim().replace(/"/g, "");
            if (AGENTS.find((a) => a.type === v))
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
// === 会话同步层：文件夹格式 ↔ cc-connect 单文件格式 ===
const WEB_SESSIONS_DIR = path.join(CCM_DIR, "web-sessions");
function getProjectSessionDir(projectName) {
    return path.join(WEB_SESSIONS_DIR, projectName);
}
function ensureWebSessionDir(projectName) {
    const dir = path.join(WEB_SESSIONS_DIR, projectName);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    return dir;
}
// 查找 cc-connect 的 session 文件（带 hash 的）
function findCcSessionFile(projectName) {
    if (!fs.existsSync(SESSIONS_DIR))
        return null;
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.startsWith(projectName) && f.endsWith(".json") && !fs.statSync(path.join(SESSIONS_DIR, f)).isDirectory());
    const hashed = files.find(f => f !== `${projectName}.json`);
    return hashed ? path.join(SESSIONS_DIR, hashed) : files[0] ? path.join(SESSIONS_DIR, files[0]) : null;
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
            const filePath = path.join(dir, `${sid}.json`);
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
                fs.unlinkSync(path.join(dir, f));
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
        const dir = path.join(WEB_SESSIONS_DIR, projectName);
        if (!fs.existsSync(dir))
            return;
        for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
            const sid = f.replace(".json", "");
            const sessionData = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
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
    const dir = path.join(WEB_SESSIONS_DIR, projectName);
    if (!fs.existsSync(dir))
        return [];
    return fs.readdirSync(dir)
        .filter(f => f.endsWith(".json"))
        .map(f => {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
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
    const filePath = path.join(WEB_SESSIONS_DIR, projectName, `${sessionId}.json`);
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
function getLogs(projectName, lines = 100) {
    const logFile = path.join(LOG_DIR, `${projectName}.log`);
    if (!fs.existsSync(logFile))
        return "";
    const content = fs.readFileSync(logFile, "utf-8");
    return content.split("\n").slice(-lines).join("\n");
}
function startProject(projectName, agentType) {
    const configs = getConfigs();
    const config = configs.find((c) => c.name === projectName);
    if (!config)
        return { success: false, error: "项目不存在" };
    if (isRunning(projectName)) {
        return { success: false, error: "项目已在运行" };
    }
    let configPath = config.path;
    // Agent 切换
    if (agentType) {
        let content = fs.readFileSync(configPath, "utf-8");
        content = content.replace(/(\[projects\.agent\]\s*\n\s*type\s*=\s*)"[^"]+"/g, `$1"${agentType}"`);
        const tempPath = path.join(CCM_DIR, "temp", `${projectName}-${agentType}.toml`);
        fs.mkdirSync(path.join(CCM_DIR, "temp"), { recursive: true });
        fs.writeFileSync(tempPath, content);
        configPath = tempPath;
    }
    const logFile = path.join(LOG_DIR, `${projectName}.log`);
    const logStream = fs.openSync(logFile, "w");
    const child = spawn("cc-connect", ["--config", configPath, "--force"], {
        stdio: ["ignore", logStream, logStream],
        shell: true,
        detached: true,
    });
    child.unref();
    const pidDir = PID_DIR;
    if (!fs.existsSync(pidDir))
        fs.mkdirSync(pidDir, { recursive: true });
    fs.writeFileSync(path.join(pidDir, `${projectName}.pid`), String(child.pid));
    return { success: true, pid: child.pid };
}
function stopProject(projectName) {
    const pid = getPid(projectName);
    if (!pid)
        return { success: false, error: "项目未在运行" };
    try {
        if (process.platform === "win32") {
            execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        }
        else {
            process.kill(parseInt(pid), "SIGTERM");
        }
    }
    catch { }
    try {
        fs.unlinkSync(path.join(PID_DIR, `${projectName}.pid`));
    }
    catch { }
    return { success: true };
}
// === HTTP 服务 ===
function sendJson(res, data, status = 200) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
}
function sendFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
        ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
        ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
        ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2",
        ".ttf": "font/ttf", ".eot": "application/vnd.ms-fontobject",
        ".map": "application/json",
    };
    const contentType = types[ext] || "application/octet-stream";
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end("Not Found");
        return;
    }
    const headers = { "Content-Type": contentType };
    if (ext === ".html")
        headers["Content-Type"] = "text/html; charset=utf-8";
    if (ext === ".js" || ext === ".css")
        headers["Cache-Control"] = "public, max-age=31536000, immutable";
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
}
// === 共享上下文 ===
function ensureSharedDir() {
    if (!fs.existsSync(SHARED_DIR))
        fs.mkdirSync(SHARED_DIR, { recursive: true });
}
function listSharedFiles() {
    ensureSharedDir();
    return fs.readdirSync(SHARED_DIR)
        .filter(f => !f.startsWith("."))
        .map(f => {
        const stat = fs.statSync(path.join(SHARED_DIR, f));
        const ext = path.extname(f).toLowerCase();
        const isText = [".md", ".txt", ".json", ".csv", ".yaml", ".yml", ".toml", ".xml", ".html", ".css", ".js", ".ts"].includes(ext);
        const isImage = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"].includes(ext);
        return { name: f, size: stat.size, modified: stat.mtime.toISOString(), type: isText ? "text" : isImage ? "image" : "file" };
    })
        .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
}
function readSharedFile(name) {
    const filePath = path.join(SHARED_DIR, name);
    if (!fs.existsSync(filePath))
        return null;
    const ext = path.extname(name).toLowerCase();
    const isText = [".md", ".txt", ".json", ".csv", ".yaml", ".yml", ".toml", ".xml", ".html", ".css", ".js", ".ts"].includes(ext);
    if (isText) {
        return { type: "text", content: fs.readFileSync(filePath, "utf-8") };
    }
    return { type: "binary", size: fs.statSync(filePath).size };
}
function writeSharedFile(name, content) {
    ensureSharedDir();
    fs.writeFileSync(path.join(SHARED_DIR, name), content);
}
function saveSharedUpload(filename, buffer) {
    ensureSharedDir();
    const safeName = filename.replace(/[<>:"/\\|?*]/g, "_");
    const filePath = path.join(SHARED_DIR, safeName);
    fs.writeFileSync(filePath, buffer);
    return safeName;
}
function deleteSharedFile(name) {
    const filePath = path.join(SHARED_DIR, name);
    if (fs.existsSync(filePath))
        fs.unlinkSync(filePath);
}
// === 任务派发 ===
function loadTasks() {
    if (!fs.existsSync(TASKS_FILE))
        return [];
    try {
        return JSON.parse(fs.readFileSync(TASKS_FILE, "utf-8"));
    }
    catch {
        return [];
    }
}
function saveTasks(tasks) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}
function createTask(task) {
    const tasks = loadTasks();
    const newTask = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: task.title,
        description: task.description || "",
        target_project: task.target_project,
        group_id: task.group_id || null,
        assign_type: task.assign_type || "project",
        status: "pending",
        priority: task.priority || "normal",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    tasks.push(newTask);
    saveTasks(tasks);
    return newTask;
}
function updateTask(id, updates) {
    const tasks = loadTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1)
        return null;
    Object.assign(tasks[idx], updates, { updated_at: new Date().toISOString() });
    if (updates.status === "done")
        tasks[idx].completed_at = new Date().toISOString();
    saveTasks(tasks);
    return tasks[idx];
}
function deleteTask(id) {
    const tasks = loadTasks().filter(t => t.id !== id);
    saveTasks(tasks);
}
// === 任务队列系统（支持并行执行）===
const taskQueues = new Map(); // 每个目标（群聊/Agent）独立队列
const runningTasks = new Map(); // 正在运行的任务
// 获取任务的目标键
function getTaskTargetKey(task) {
    if (task.assign_type === "group" && task.group_id) {
        return `group:${task.group_id}`;
    }
    return `project:${task.target_project}`;
}
// 优先级权重
const PRIORITY_WEIGHT = { high: 3, normal: 2, low: 1 };
// 添加任务到队列（按优先级排序）
function enqueueTask(taskId) {
    const tasks = loadTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
        console.log(`[任务队列] 任务 ${taskId} 不存在`);
        return;
    }
    const targetKey = getTaskTargetKey(task);
    if (!taskQueues.has(targetKey)) {
        taskQueues.set(targetKey, []);
    }
    const queue = taskQueues.get(targetKey);
    // 按优先级插入到正确位置
    const newPriority = PRIORITY_WEIGHT[task.priority] || 2;
    let insertIndex = queue.length; // 默认插入到末尾
    for (let i = 0; i < queue.length; i++) {
        const queuedTask = tasks.find(t => t.id === queue[i]);
        if (!queuedTask)
            continue;
        const queuedPriority = PRIORITY_WEIGHT[queuedTask.priority] || 2;
        // 高优先级任务插入到低优先级前面
        if (newPriority > queuedPriority) {
            insertIndex = i;
            break;
        }
    }
    queue.splice(insertIndex, 0, taskId);
    console.log(`[任务队列] 任务 ${taskId} (${task.priority}) 已加入队列 [${targetKey}]，位置: ${insertIndex + 1}/${queue.length}`);
    // 触发该目标的队列处理
    processTargetQueue(targetKey);
}
// 处理特定目标的队列
async function processTargetQueue(targetKey) {
    // 如果该目标正在执行任务，等待
    if (runningTasks.has(targetKey)) {
        console.log(`[任务队列] [${targetKey}] 正在执行任务，等待中...`);
        return;
    }
    const queue = taskQueues.get(targetKey);
    if (!queue || queue.length === 0) {
        return;
    }
    // 标记该目标正在执行任务
    runningTasks.set(targetKey, true);
    console.log(`[任务队列] [${targetKey}] 开始处理队列，剩余任务: ${queue.length}`);
    while (queue.length > 0) {
        const taskId = queue.shift();
        const tasks = loadTasks();
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === "done") {
            addTaskLog(taskId, "info", `跳过任务（不存在或已完成）`);
            continue;
        }
        addTaskLog(taskId, "info", `开始执行任务: ${task.title}`);
        try {
            // 更新状态为进行中
            updateTask(taskId, { status: "in_progress" });
            addTaskLog(taskId, "info", `任务状态更新为: 进行中`);
            // 执行任务
            addTaskLog(taskId, "info", `调用 Agent 执行任务...`);
            const result = await executeTask(task);
            // 记录 Agent 响应
            addTaskLog(taskId, "response", `Agent 响应:\n${result.substring(0, 1000)}`);
            // 检查是否完成
            const isCompleted = checkTaskCompletion(result);
            if (isCompleted) {
                updateTask(taskId, {
                    status: "done",
                    result: result.substring(0, 500),
                    completed_at: new Date().toISOString()
                });
                addTaskLog(taskId, "success", `✅ 任务完成`);
                // 发送飞书通知
                await sendTaskCompletionNotification(task, result);
            }
            else {
                updateTask(taskId, {
                    status: "in_progress",
                    result: result.substring(0, 500)
                });
                addTaskLog(taskId, "warning", `任务执行中，未检测到完成标记`);
            }
        }
        catch (error) {
            console.error(`[任务队列] [${targetKey}] 任务执行失败: ${task.title}`, error.message);
            updateTask(taskId, {
                status: "pending",
                result: `执行失败: ${error.message}`
            });
            addTaskLog(taskId, "error", `❌ 任务执行失败: ${error.message}`);
            // 发送失败通知
            await sendTaskFailureNotification(task, error.message);
        }
        // 等待一下再执行下一个任务
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    // 标记该目标任务执行完成
    runningTasks.delete(targetKey);
    console.log(`[任务队列] [${targetKey}] 队列处理完成`);
}
// 获取队列状态
function getQueueStatus() {
    let totalQueued = 0;
    const targetStatus = {};
    for (const [targetKey, queue] of taskQueues.entries()) {
        totalQueued += queue.length;
        targetStatus[targetKey] = {
            queued: queue.length,
            running: runningTasks.has(targetKey)
        };
    }
    return {
        total_queued: totalQueued,
        running_targets: runningTasks.size,
        target_status: targetStatus,
        pending_tasks: loadTasks().filter(t => t.status === "pending").length,
        in_progress_tasks: loadTasks().filter(t => t.status === "in_progress").length
    };
}
// === 任务日志系统 ===
const TASK_LOGS_FILE = path.join(CCM_DIR, "task-logs.json");
const taskLogsCache = new Map(); // 内存缓存
function loadTaskLogs() {
    try {
        if (fs.existsSync(TASK_LOGS_FILE)) {
            return JSON.parse(fs.readFileSync(TASK_LOGS_FILE, "utf-8"));
        }
    }
    catch (e) {
        console.error("加载任务日志失败:", e.message);
    }
    return {};
}
function saveTaskLogs(logs) {
    try {
        fs.writeFileSync(TASK_LOGS_FILE, JSON.stringify(logs, null, 2));
    }
    catch (e) {
        console.error("保存任务日志失败:", e.message);
    }
}
function addTaskLog(taskId, level, message) {
    const logs = loadTaskLogs();
    if (!logs[taskId]) {
        logs[taskId] = [];
    }
    const logEntry = {
        timestamp: new Date().toISOString(),
        level: level, // info, success, warning, error, response
        message: message
    };
    logs[taskId].push(logEntry);
    // 限制每个任务最多 100 条日志
    if (logs[taskId].length > 100) {
        logs[taskId] = logs[taskId].slice(-100);
    }
    saveTaskLogs(logs);
    console.log(`[任务日志] [${taskId}] [${level}] ${message.substring(0, 100)}`);
}
function getTaskLogs(taskId, limit = 50) {
    const logs = loadTaskLogs();
    const taskLogs = logs[taskId] || [];
    return taskLogs.slice(-limit);
}
function clearTaskLogs(taskId) {
    const logs = loadTaskLogs();
    delete logs[taskId];
    saveTaskLogs(logs);
}
// === MCP 和 Skills 文件存储 ===
const MCP_DIR = path.join(CCM_DIR, "mcp");
const SKILLS_DIR = path.join(CCM_DIR, "skills");
// 确保目录存在
if (!fs.existsSync(MCP_DIR))
    fs.mkdirSync(MCP_DIR, { recursive: true });
if (!fs.existsSync(SKILLS_DIR))
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
function loadMcpTools() {
    try {
        const files = fs.readdirSync(MCP_DIR).filter(f => f.endsWith('.json'));
        return files.map(f => {
            try {
                const content = JSON.parse(fs.readFileSync(path.join(MCP_DIR, f), 'utf-8'));
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
    fs.writeFileSync(path.join(MCP_DIR, filename), JSON.stringify(tool, null, 2));
}
function deleteMcpTool(name) {
    const filename = name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
    const filePath = path.join(MCP_DIR, filename);
    if (fs.existsSync(filePath))
        fs.unlinkSync(filePath);
}
function loadSkills() {
    try {
        const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.json'));
        return files.map(f => {
            try {
                const content = JSON.parse(fs.readFileSync(path.join(SKILLS_DIR, f), 'utf-8'));
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
    fs.writeFileSync(path.join(SKILLS_DIR, filename), JSON.stringify(skill, null, 2));
}
function deleteSkill(name) {
    const filename = name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.json';
    const filePath = path.join(SKILLS_DIR, filename);
    if (fs.existsSync(filePath))
        fs.unlinkSync(filePath);
}
// === 飞书通知功能 ===
const FEISHU_CONFIG_FILE = path.join(CCM_DIR, "feishu-config.json");
// 飞书 OAuth 权限范围
const FEISHU_SCOPES = [
    "im:message", // 发送消息
    "im:message.group_at_msg", // 群聊 @ 消息
    "im:chat", // 获取群聊信息
    "im:chat:readonly", // 读取群聊信息
    "contact:user.id:readonly", // 读取用户 ID
];
function loadFeishuConfig() {
    try {
        if (fs.existsSync(FEISHU_CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(FEISHU_CONFIG_FILE, "utf-8"));
        }
    }
    catch (e) {
        console.error("加载飞书配置失败:", e.message);
    }
    return {
        app_id: "",
        app_secret: "",
        notify_chat_id: "",
        enabled: false,
        // OAuth 相关
        redirect_uri: "http://localhost:3080/api/feishu/callback",
        authorized: false,
        user_access_token: "",
        user_refresh_token: "",
        token_expires_at: null,
        authorized_user: null,
        // 权限配置
        scopes: FEISHU_SCOPES,
    };
}
function saveFeishuConfig(config) {
    fs.writeFileSync(FEISHU_CONFIG_FILE, JSON.stringify(config, null, 2));
}
// 获取飞书 tenant_access_token（应用级别）
async function getFeishuTenantToken(appId, appSecret) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ app_id: appId, app_secret: appSecret })
        });
        const data = await response.json();
        return data.tenant_access_token;
    }
    catch (e) {
        console.error("获取飞书 tenant_access_token 失败:", e.message);
        return null;
    }
}
// 获取飞书 user_access_token（用户级别，通过 OAuth）
async function getFeishuUserToken(appId, appSecret, code) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/oidc/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "authorization_code",
                client_id: appId,
                client_secret: appSecret,
                code: code,
                redirect_uri: "http://localhost:3080/api/feishu/callback"
            })
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data;
        }
        console.error("获取 user_access_token 失败:", data.msg);
        return null;
    }
    catch (e) {
        console.error("获取 user_access_token 失败:", e.message);
        return null;
    }
}
// 刷新 user_access_token
async function refreshFeishuUserToken(appId, appSecret, refreshToken) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "refresh_token",
                client_id: appId,
                client_secret: appSecret,
                refresh_token: refreshToken
            })
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data;
        }
        return null;
    }
    catch (e) {
        console.error("刷新 user_access_token 失败:", e.message);
        return null;
    }
}
// 获取有效的 access_token（优先使用 user_token，过期则刷新）
async function getValidFeishuToken() {
    const config = loadFeishuConfig();
    if (!config.app_id || !config.app_secret) {
        return null;
    }
    // 如果有 user_access_token 且未过期
    if (config.user_access_token && config.token_expires_at) {
        const expiresAt = new Date(config.token_expires_at);
        if (expiresAt > new Date()) {
            return config.user_access_token;
        }
        // Token 过期，尝试刷新
        if (config.user_refresh_token) {
            const refreshed = await refreshFeishuUserToken(config.app_id, config.app_secret, config.user_refresh_token);
            if (refreshed) {
                config.user_access_token = refreshed.access_token;
                config.user_refresh_token = refreshed.refresh_token;
                config.token_expires_at = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
                saveFeishuConfig(config);
                return refreshed.access_token;
            }
        }
    }
    // 回退到 tenant_access_token
    return await getFeishuTenantToken(config.app_id, config.app_secret);
}
// 获取用户信息
async function getFeishuUserInfo(accessToken) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/authen/v1/user_info", {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data;
        }
        return null;
    }
    catch (e) {
        console.error("获取用户信息失败:", e.message);
        return null;
    }
}
// 获取群聊列表
async function getFeishuChatList(accessToken) {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/im/v1/chats?page_size=50", {
            headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data.items || [];
        }
        return [];
    }
    catch (e) {
        console.error("获取群聊列表失败:", e.message);
        return [];
    }
}
// 通过 Webhook 发送飞书消息
async function sendFeishuWebhook(content, msgType = "interactive") {
    const config = loadFeishuConfig();
    const webhookUrl = config.webhook_url;
    if (!webhookUrl) {
        console.log("[飞书通知] 未配置 Webhook URL，跳过通知");
        return false;
    }
    try {
        let body;
        if (msgType === "interactive") {
            // 卡片消息
            body = {
                msg_type: "interactive",
                card: typeof content === "string" ? JSON.parse(content) : content
            };
        }
        else {
            // 文本消息
            body = {
                msg_type: "text",
                content: { text: typeof content === "string" ? content : JSON.stringify(content) }
            };
        }
        // 如果配置了签名密钥，添加签名
        if (config.sign_key) {
            const timestamp = Math.floor(Date.now() / 1000);
            const stringToSign = `${timestamp}\n${config.sign_key}`;
            const crypto = require("crypto");
            const sign = crypto.createHmac("sha256", stringToSign).update("").digest("base64");
            body.timestamp = timestamp.toString();
            body.sign = sign;
        }
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (result.code === 0 || result.StatusCode === 0) {
            console.log("[飞书通知] Webhook 消息发送成功");
            return true;
        }
        else {
            console.error("[飞书通知] Webhook 消息发送失败:", result.msg || result.StatusMessage);
            return false;
        }
    }
    catch (e) {
        console.error("[飞书通知] Webhook 发送失败:", e.message);
        return false;
    }
}
// 发送飞书消息给用户（通过 API）
async function sendFeishuMessageToUser(userId, content, msgType = "interactive") {
    const config = loadFeishuConfig();
    // 如果没有 userId，尝试从配置中获取
    if (!userId || userId === "test") {
        if (config.authorized_user?.open_id) {
            userId = config.authorized_user.open_id;
        }
        else {
            console.log("[飞书通知] 未配置用户 ID，请先完成授权");
            return false;
        }
    }
    // 获取 token
    const token = await getValidFeishuToken();
    if (!token) {
        console.log("[飞书通知] 无法获取 Token，请检查 App ID 和 Secret");
        return false;
    }
    try {
        const response = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                receive_id: userId,
                msg_type: msgType,
                content: typeof content === "string" ? content : JSON.stringify(content)
            })
        });
        const result = await response.json();
        if (result.code === 0) {
            console.log("[飞书通知] 消息发送成功");
            return true;
        }
        else {
            console.error("[飞书通知] 消息发送失败:", result.msg);
            return false;
        }
    }
    catch (e) {
        console.error("[飞书通知] 发送失败:", e.message);
        return false;
    }
}
// 发送飞书消息（兼容旧接口）
async function sendFeishuMessage(chatId, content, msgType = "interactive") {
    return sendFeishuMessageToUser(chatId, content, msgType);
}
// 发送任务完成通知
async function sendTaskCompletionNotification(task, result) {
    const config = loadFeishuConfig();
    // 获取用户 ID：优先使用 authorized_user.open_id
    const userId = config.authorized_user?.open_id || config.notify_user_id;
    if (!userId) {
        console.log("[飞书通知] 未配置通知用户，请先完成授权");
        return;
    }
    // 截取结果摘要
    const resultSummary = result.substring(0, 200) + (result.length > 200 ? "..." : "");
    // 构建富文本消息
    const cardContent = {
        config: { wide_screen_mode: true },
        header: {
            title: { tag: "plain_text", content: "✅ 任务完成通知" },
            template: "green"
        },
        elements: [
            {
                tag: "div",
                text: {
                    tag: "lark_md",
                    content: `**任务标题**：${task.title}\n**目标项目**：${task.target_project || '群聊'}\n**优先级**：${task.priority === 'high' ? '🔴 高' : task.priority === 'normal' ? '🟡 中' : '⚪ 低'}\n**完成时间**：${new Date().toLocaleString("zh-CN")}`
                }
            },
            { tag: "hr" },
            {
                tag: "div",
                text: {
                    tag: "lark_md",
                    content: `**执行结果**：\n${resultSummary}`
                }
            }
        ]
    };
    await sendFeishuMessageToUser(userId, JSON.stringify(cardContent), "interactive");
}
// 发送任务失败通知
async function sendTaskFailureNotification(task, errorMsg) {
    const config = loadFeishuConfig();
    // 获取用户 ID：优先使用 authorized_user.open_id
    const userId = config.authorized_user?.open_id || config.notify_user_id;
    if (!userId) {
        console.log("[飞书通知] 未配置通知用户，请先完成授权");
        return;
    }
    const cardContent = {
        config: { wide_screen_mode: true },
        header: {
            title: { tag: "plain_text", content: "❌ 任务执行失败" },
            template: "red"
        },
        elements: [
            {
                tag: "div",
                text: {
                    tag: "lark_md",
                    content: `**任务标题**：${task.title}\n**目标项目**：${task.target_project || '群聊'}\n**失败时间**：${new Date().toLocaleString("zh-CN")}`
                }
            },
            { tag: "hr" },
            {
                tag: "div",
                text: {
                    tag: "lark_md",
                    content: `**错误信息**：\n${errorMsg.substring(0, 300)}`
                }
            }
        ]
    };
    await sendFeishuMessageToUser(userId, JSON.stringify(cardContent), "interactive");
}
// 执行单个任务
async function executeTask(task) {
    const configs = getConfigs();
    if (task.assign_type === "group" && task.group_id) {
        // 群聊模式：发送给群聊主 Agent
        const groups = loadGroups();
        const group = groups.find(g => g.id === task.group_id);
        if (!group)
            throw new Error("群聊不存在");
        const message = `📋 执行任务：${task.title}\n${task.description || ""}\n\n请完成此任务并回复 "✅ 任务完成"。`;
        // 发送给主 Agent
        const firstMember = group.members.find(m => m.project !== "coordinator");
        const firstConfig = firstMember ? configs.find(c => c.name === firstMember.project) : configs[0];
        const workDir = firstConfig ? getConfigInfo(firstConfig.path)[0]?.workDir : process.cwd();
        const recentMsgs = getGroupMessages(task.group_id).slice(-5);
        const context = recentMsgs.map(m => {
            const who = m.role === "user" ? `[用户 → ${m.target}]` : `[${m.agent || "Agent"}]`;
            return `${who} ${m.content}`;
        }).join("\n");
        const fullPrompt = `你是群聊的主 Agent（协调者）。\n\n群聊记录：\n${context}\n\n${message}`;
        return callAgent("coordinator", fullPrompt, workDir, "claudecode", 300000);
    }
    else {
        // 项目模式：直接发送给项目 Agent
        const config = configs.find(c => c.name === task.target_project);
        if (!config)
            throw new Error("项目配置不存在");
        const info = getConfigInfo(config.path);
        const workDir = info[0]?.workDir;
        const agentType = info[0]?.agent || "claudecode";
        const message = `📋 执行任务：${task.title}\n${task.description || ""}\n\n请完成此任务并回复 "✅ 任务完成"。`;
        return callAgent(task.target_project, message, workDir, agentType, 300000);
    }
}
// 检查任务是否完成
function checkTaskCompletion(response) {
    if (!response)
        return false;
    const completionMarkers = [
        "✅ 任务完成",
        "✅ 已完成",
        "✅ 完成",
        "任务已完成",
        "已完成任务",
        "已经完成",
        "done",
        "completed",
        "finished"
    ];
    const lowerResponse = response.toLowerCase();
    return completionMarkers.some(marker => lowerResponse.includes(marker.toLowerCase()));
}
// === 对话模板库 ===
const TEMPLATES_FILE = path.join(CCM_DIR, "templates.json");
function loadTemplates() {
    try {
        if (fs.existsSync(TEMPLATES_FILE)) {
            return JSON.parse(fs.readFileSync(TEMPLATES_FILE, "utf-8"));
        }
    }
    catch (e) {
        console.error("加载模板失败:", e.message);
    }
    // 返回默认模板
    return getDefaultTemplates();
}
function saveTemplates(templates) {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
}
function getDefaultTemplates() {
    return [
        {
            id: "tpl_frontend_dev",
            name: "前端功能开发",
            category: "development",
            description: "开发新的前端页面或组件",
            icon: "🎨",
            prompt: "请帮我开发一个前端功能：\n\n功能描述：\n- 页面名称：\n- 主要功能：\n- UI 要求：\n\n技术要求：\n- 使用 Vue 3 + Vite\n- 使用 Vant/Element Plus 组件\n- 响应式设计\n\n请先分析需求，然后逐步实现。",
            tags: ["前端", "Vue", "组件"],
            created_at: new Date().toISOString()
        },
        {
            id: "tpl_backend_api",
            name: "后端接口开发",
            category: "development",
            description: "开发新的后端 API 接口",
            icon: "🔌",
            prompt: "请帮我开发后端接口：\n\n接口信息：\n- 接口路径：\n- 请求方法：GET/POST/PUT/DELETE\n- 请求参数：\n- 返回数据格式：\n\n业务逻辑：\n- \n\n请按照项目规范实现接口，包括：\n1. Controller 层\n2. Service 层\n3. 数据库操作",
            tags: ["后端", "API", "Java"],
            created_at: new Date().toISOString()
        },
        {
            id: "tpl_bug_fix",
            name: "Bug 修复",
            category: "maintenance",
            description: "定位和修复代码中的 Bug",
            icon: "🐛",
            prompt: "请帮我修复这个 Bug：\n\n问题描述：\n- 现象：\n- 期望行为：\n- 复现步骤：\n\n错误信息：\n\n\n相关代码：\n\n\n请分析问题原因并提供修复方案。",
            tags: ["Bug", "修复", "调试"],
            created_at: new Date().toISOString()
        },
        {
            id: "tpl_code_review",
            name: "代码审查",
            category: "review",
            description: "审查代码质量和潜在问题",
            icon: "🔍",
            prompt: "请帮我审查以下代码：\n\n代码文件：\n\n\n审查重点：\n1. 代码质量和规范\n2. 潜在的 Bug\n3. 性能问题\n4. 安全隐患\n5. 可维护性\n\n请给出具体的改进建议。",
            tags: ["审查", "质量", "优化"],
            created_at: new Date().toISOString()
        },
        {
            id: "tpl_api_integration",
            name: "前后端联调",
            category: "collaboration",
            description: "前后端接口对接和联调",
            icon: "🔗",
            prompt: "请帮我完成前后端联调：\n\n接口信息：\n- 接口名称：\n- 后端地址：\n- 接口文档：\n\n前端需求：\n- 页面功能：\n- 数据展示：\n\n请：\n1. 检查接口文档\n2. 实现前端调用代码\n3. 处理数据格式转换\n4. 添加错误处理",
            tags: ["联调", "接口", "协作"],
            created_at: new Date().toISOString()
        },
        {
            id: "tpl_refactor",
            name: "代码重构",
            category: "maintenance",
            description: "重构和优化现有代码",
            icon: "⚡",
            prompt: "请帮我重构以下代码：\n\n代码文件：\n\n\n重构目标：\n- 提高代码可读性\n- 减少重复代码\n- 优化性能\n- 遵循最佳实践\n\n请提供重构方案和具体实现。",
            tags: ["重构", "优化", "代码质量"],
            created_at: new Date().toISOString()
        },
        {
            id: "tpl_feature_plan",
            name: "功能规划",
            category: "planning",
            description: "规划新功能的实现方案",
            icon: "📋",
            prompt: "请帮我规划这个功能的实现方案：\n\n功能描述：\n\n\n需求细节：\n\n\n请提供：\n1. 技术方案设计\n2. 实现步骤\n3. 预估工作量\n4. 潜在风险\n5. 测试要点",
            tags: ["规划", "设计", "方案"],
            created_at: new Date().toISOString()
        },
        {
            id: "tpl_database",
            name: "数据库操作",
            category: "development",
            description: "数据库表设计和 SQL 操作",
            icon: "🗄️",
            prompt: "请帮我完成数据库相关工作：\n\n需求描述：\n\n\n请提供：\n1. 表结构设计（如需要）\n2. SQL 语句\n3. 索引建议\n4. 数据迁移方案（如需要）",
            tags: ["数据库", "SQL", "设计"],
            created_at: new Date().toISOString()
        }
    ];
}
function createTemplate(template) {
    const templates = loadTemplates();
    const newTemplate = {
        id: "tpl_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: template.name,
        category: template.category || "custom",
        description: template.description || "",
        icon: template.icon || "📝",
        prompt: template.prompt,
        tags: template.tags || [],
        created_at: new Date().toISOString()
    };
    templates.push(newTemplate);
    saveTemplates(templates);
    return newTemplate;
}
function updateTemplate(id, updates) {
    const templates = loadTemplates();
    const idx = templates.findIndex(t => t.id === id);
    if (idx === -1)
        return null;
    Object.assign(templates[idx], updates, { updated_at: new Date().toISOString() });
    saveTemplates(templates);
    return templates[idx];
}
function deleteTemplate(id) {
    const templates = loadTemplates().filter(t => t.id !== id);
    saveTemplates(templates);
}
// === 定时任务 ===
function loadCronJobs() {
    if (!fs.existsSync(CRON_FILE))
        return [];
    try {
        return JSON.parse(fs.readFileSync(CRON_FILE, "utf-8"));
    }
    catch {
        return [];
    }
}
function saveCronJobs(jobs) {
    fs.writeFileSync(CRON_FILE, JSON.stringify(jobs, null, 2));
}
function createCronJob(job) {
    const jobs = loadCronJobs();
    const newJob = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: job.name,
        project: job.project,
        schedule: job.schedule,
        prompt: job.prompt,
        enabled: true,
        created_at: new Date().toISOString(),
        last_run: null,
    };
    jobs.push(newJob);
    saveCronJobs(jobs);
    return newJob;
}
function updateCronJob(id, updates) {
    const jobs = loadCronJobs();
    const idx = jobs.findIndex(j => j.id === id);
    if (idx === -1)
        return null;
    Object.assign(jobs[idx], updates);
    saveCronJobs(jobs);
    return jobs[idx];
}
function deleteCronJob(id) {
    const jobs = loadCronJobs().filter(j => j.id !== id);
    saveCronJobs(jobs);
}
function handleRequest(req, res) {
    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname;
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }
    // 静态文件（Vue 构建产物 + 旧 HTML 资源）
    if (pathname === "/" || pathname === "/index.html") {
        return sendFile(res, path.join(PUBLIC_DIR, "index.html"));
    }
    if (pathname.startsWith("/assets/") || pathname.startsWith("/public/") ||
        pathname.startsWith("/css/") || pathname.startsWith("/js/") ||
        pathname === "/favicon.svg" || pathname === "/icons.svg" || pathname === "/favicon.ico") {
        const filePath = path.join(PUBLIC_DIR, pathname.startsWith("/public/") ? pathname.replace("/public/", "") : pathname);
        if (fs.existsSync(filePath)) {
            return sendFile(res, filePath);
        }
    }
    // SPA fallback: 非 API 路径且文件存在则返回 index.html
    if (!pathname.startsWith("/api/") && req.method === "GET") {
        const filePath = path.join(PUBLIC_DIR, pathname);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            return sendFile(res, filePath);
        }
        return sendFile(res, path.join(PUBLIC_DIR, "index.html"));
    }
    // API 路由
    const apiRoutes = {
        // 项目列表
        "GET /api/projects": () => {
            const configs = getConfigs();
            const projects = configs.map((config) => {
                const info = getConfigInfo(config.path);
                const running = isRunning(config.name);
                return {
                    name: config.name,
                    running,
                    pid: running ? getPid(config.name) : null,
                    agent: info[0]?.agent || "claudecode",
                    platform: info[0]?.platform || "未知",
                    work_dir: info[0]?.workDir || "",
                    session_count: getSessions(config.name).length,
                };
            });
            sendJson(res, { projects });
        },
        // Agent 列表
        "GET /api/agents": () => {
            sendJson(res, { agents: AGENTS });
        },
        // 启动项目
        "POST /api/start": () => {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
                try {
                    const { project, agent } = JSON.parse(body);
                    sendJson(res, startProject(project, agent));
                }
                catch (e) {
                    sendJson(res, { success: false, error: e.message }, 400);
                }
            });
        },
        // 停止项目
        "POST /api/stop": () => {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
                try {
                    const { project } = JSON.parse(body);
                    sendJson(res, stopProject(project));
                }
                catch (e) {
                    sendJson(res, { success: false, error: e.message }, 400);
                }
            });
        },
        // 创建项目
        "POST /api/projects/create": () => {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
                try {
                    const { name, work_dir, agent, platform, platform_options } = JSON.parse(body);
                    if (!name || !work_dir) {
                        return sendJson(res, { success: false, error: "项目名称和目录不能为空" }, 400);
                    }
                    const configPath = path.join(CONFIGS_DIR, `config-${name}.toml`);
                    if (fs.existsSync(configPath)) {
                        return sendJson(res, { success: false, error: "项目已存在" }, 400);
                    }
                    const agentType = agent || "claudecode";
                    const platformType = platform || "feishu";
                    const opts = platform_options || {};
                    const isFeishu = platformType === "feishu" || platformType === "lark";
                    const optionsLines = Object.entries(opts).map(([k, v]) => `${k} = "${v}"`).join("\n");
                    const extraOptions = isFeishu ? "\nenable_feishu_card = true\nthread_isolation = true\nprogress_style = \"card\"" : "";
                    const template = `# cc-connect - ${name}
language = "zh"

[[projects]]
name = "${name}"
work_dir = "${work_dir.replace(/\\/g, "\\\\")}"
admin_from = "*"

[projects.agent]
type = "${agentType}"
mode = "default"

[projects.agent.options]
work_dir = "${work_dir.replace(/\\/g, "\\\\")}"

[[projects.platforms]]
type = "${platformType}"

[projects.platforms.options]
${optionsLines}${extraOptions}

# 自定义命令
[[commands]]
name = "history"
description = "查看会话历史记录"
exec = "cc-connect sessions show {{1}} -n {{2:20}}"

[[commands]]
name = "sessions"
description = "列出所有会话"
exec = "cc-connect sessions list"

[[commands]]
name = "projects"
description = "查看所有可操作的代码项目目录"
exec = "cmd /c type ${CCM_DIR.replace(/\\/g, "\\\\")}\\\\projects.txt"

[[aliases]]
name = "历史"
command = "/history"

[[aliases]]
name = "会话"
command = "/sessions"

[[aliases]]
name = "项目"
command = "/projects"
`;
                    fs.writeFileSync(configPath, template);
                    sendJson(res, { success: true, config: configPath });
                }
                catch (e) {
                    sendJson(res, { success: false, error: e.message }, 400);
                }
            });
        },
        // 更新项目
        "POST /api/projects/update": () => {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
                try {
                    const { name, work_dir, agent, platform, platform_options } = JSON.parse(body);
                    if (!name) {
                        return sendJson(res, { success: false, error: "项目名称不能为空" }, 400);
                    }
                    const configPath = path.join(CONFIGS_DIR, `config-${name}.toml`);
                    if (!fs.existsSync(configPath)) {
                        return sendJson(res, { success: false, error: "项目不存在" }, 404);
                    }
                    // 读取现有配置
                    const existingContent = fs.readFileSync(configPath, "utf-8");
                    // 更新配置
                    let updatedContent = existingContent;
                    if (work_dir) {
                        updatedContent = updatedContent.replace(/work_dir\s*=\s*"[^"]*"/g, `work_dir = "${work_dir.replace(/\\/g, "\\\\")}"`);
                    }
                    if (agent) {
                        updatedContent = updatedContent.replace(/type\s*=\s*"[^"]*"/g, `type = "${agent}"`);
                    }
                    fs.writeFileSync(configPath, updatedContent);
                    sendJson(res, { success: true, message: "项目配置已更新" });
                }
                catch (e) {
                    sendJson(res, { success: false, error: e.message }, 400);
                }
            });
        },
        // 删除项目
        "POST /api/projects/delete": () => {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
                try {
                    const { name } = JSON.parse(body);
                    if (!name) {
                        return sendJson(res, { success: false, error: "项目名称不能为空" }, 400);
                    }
                    const configPath = path.join(CONFIGS_DIR, `config-${name}.toml`);
                    if (!fs.existsSync(configPath)) {
                        return sendJson(res, { success: false, error: "项目不存在" }, 404);
                    }
                    // 检查是否正在运行
                    if (isRunning(name)) {
                        return sendJson(res, { success: false, error: "项目正在运行，请先停止" }, 400);
                    }
                    // 删除配置文件
                    fs.unlinkSync(configPath);
                    // 删除会话数据
                    const sessionFile = findCcSessionFile(name);
                    if (sessionFile && fs.existsSync(sessionFile)) {
                        fs.unlinkSync(sessionFile);
                    }
                    // 删除 web session 目录
                    const webSessionDir = path.join(WEB_SESSIONS_DIR, name);
                    if (fs.existsSync(webSessionDir)) {
                        fs.rmSync(webSessionDir, { recursive: true });
                    }
                    sendJson(res, { success: true, message: "项目已删除" });
                }
                catch (e) {
                    sendJson(res, { success: false, error: e.message }, 400);
                }
            });
        },
        // 飞书扫码配置 - 通过 cc-connect 创建机器人
        "POST /api/projects/feishu-setup": () => {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
                try {
                    const { name } = JSON.parse(body);
                    console.log("[飞书配置] 收到请求，项目名称:", name);
                    const configPath = path.join(CONFIGS_DIR, `config-${name}.toml`);
                    const qrImagePath = path.join(UPLOAD_DIR, `feishu-qr-${name}.png`);
                    // 执行 cc-connect feishu new 命令（扫码创建机器人）
                    let output = "";
                    let scanUrl = null;
                    // 确保上传目录存在
                    if (!fs.existsSync(UPLOAD_DIR)) {
                        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
                    }
                    console.log("[飞书配置] 二维码图片路径:", qrImagePath);
                    // 异步执行 cc-connect 命令（不阻塞响应）
                    const child = spawn("cc-connect", ["feishu", "new", "--project", name, "--qr-image", qrImagePath, "--timeout", "300"], {
                        shell: true,
                        stdio: ["pipe", "pipe", "pipe"]
                    });
                    let cmdOutput = "";
                    child.stdout.on("data", (data) => { cmdOutput += data.toString(); });
                    child.stderr.on("data", (data) => { cmdOutput += data.toString(); });
                    child.on("close", (code) => {
                        console.log("[飞书配置] cc-connect 完成，退出码:", code);
                        console.log("[飞书配置] 输出:", cmdOutput.substring(0, 500));
                        // 检查配置是否更新
                        try {
                            const configContent = fs.readFileSync(configPath, "utf-8");
                            const appIdMatch = configContent.match(/app_id\s*=\s*"([^"]+)"/);
                            if (appIdMatch && appIdMatch[1] && appIdMatch[1] !== "" && appIdMatch[1] !== "PLACEHOLDER") {
                                const feishuConfig = loadFeishuConfig();
                                feishuConfig.app_id = appIdMatch[1];
                                const appSecretMatch = configContent.match(/app_secret\s*=\s*"([^"]+)"/);
                                if (appSecretMatch && appSecretMatch[1]) {
                                    feishuConfig.app_secret = appSecretMatch[1];
                                }
                                saveFeishuConfig(feishuConfig);
                                console.log("[飞书配置] 配置已同步到全局:", feishuConfig.app_id);
                            }
                        }
                        catch { }
                    });
                    // 使用 setTimeout 等待二维码图片生成
                    setTimeout(() => {
                        try {
                            const qrExists = fs.existsSync(qrImagePath);
                            console.log("[飞书配置] 二维码图片存在:", qrExists);
                            // 从输出中提取 URL
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
                            sendJson(res, {
                                success: true,
                                scan_url: scanUrl,
                                qr_image: qrExists ? `/api/uploads/feishu-qr-${name}.png` : null,
                                output: cmdOutput.substring(0, 2000),
                            });
                        }
                        catch (e) {
                            sendJson(res, { success: false, error: e.message }, 400);
                        }
                    }, 2000);
                }
                catch (e) {
                    sendJson(res, { success: false, error: e.message }, 400);
                }
            });
        },
    };
    // 精确匹配
    const routeKey = `${req.method} ${pathname}`;
    if (apiRoutes[routeKey])
        return apiRoutes[routeKey]();
    // 动态路由: /api/uploads/:filename (提供文件访问)
    if (pathname.startsWith("/api/uploads/") && req.method === "GET") {
        const filename = pathname.split("/").pop();
        const filePath = path.join(UPLOAD_DIR, filename);
        console.log("[文件访问] 请求文件:", filename, "路径:", filePath, "存在:", fs.existsSync(filePath));
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filename).toLowerCase();
            const types = { ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml" };
            res.writeHead(200, {
                "Content-Type": types[ext] || "application/octet-stream",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache"
            });
            fs.createReadStream(filePath).pipe(res);
        }
        else {
            sendJson(res, { error: "文件不存在" }, 404);
        }
        return;
    }
    // 动态路由: /api/projects/:name/sessions
    const sessionsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sessions$/);
    if (sessionsMatch && req.method === "GET") {
        const projectName = decodeURIComponent(sessionsMatch[1]);
        return sendJson(res, { sessions: getSessions(projectName) });
    }
    // 动态路由: /api/projects/:name/sessions/:id
    const sessionDetailMatch = pathname.match(/^\/api\/projects\/([^/]+)\/sessions\/([^/]+)$/);
    if (sessionDetailMatch && req.method === "GET") {
        const projectName = decodeURIComponent(sessionDetailMatch[1]);
        const sessionId = decodeURIComponent(sessionDetailMatch[2]);
        const detail = getSessionDetail(projectName, sessionId);
        if (detail)
            return sendJson(res, detail);
        return sendJson(res, { error: "会话不存在" }, 404);
    }
    // 动态路由: /api/projects/:name/logs
    const logsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/logs$/);
    if (logsMatch && req.method === "GET") {
        const projectName = decodeURIComponent(logsMatch[1]);
        const lines = parseInt(parsed.query.lines) || 100;
        return sendJson(res, { logs: getLogs(projectName, lines) });
    }
    // === 共享上下文 API ===
    if (pathname === "/api/shared" && req.method === "GET") {
        return sendJson(res, { files: listSharedFiles() });
    }
    if (pathname === "/api/shared/read" && req.method === "GET") {
        const name = parsed.query.name;
        const data = readSharedFile(name);
        if (!data)
            return sendJson(res, { error: "文件不存在" }, 404);
        return sendJson(res, { name, ...data });
    }
    // 下载文件
    if (pathname === "/api/shared/download" && req.method === "GET") {
        const name = parsed.query.name;
        const filePath = path.join(SHARED_DIR, name);
        if (!fs.existsSync(filePath)) {
            res.writeHead(404);
            res.end("Not Found");
            return;
        }
        const ext = path.extname(name).toLowerCase();
        const types = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml" };
        res.writeHead(200, {
            "Content-Type": types[ext] || "application/octet-stream",
            "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
        });
        fs.createReadStream(filePath).pipe(res);
        return;
    }
    // 上传文件（multipart）
    if (pathname === "/api/shared/upload" && req.method === "POST") {
        const ct = req.headers["content-type"] || "";
        if (ct.includes("multipart/form-data")) {
            const chunks = [];
            req.on("data", (chunk) => chunks.push(chunk));
            req.on("end", () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const boundaryMatch = ct.match(/boundary=(.+)/);
                    if (!boundaryMatch)
                        return sendJson(res, { error: "无效请求" }, 400);
                    const { files } = parseMultipart(buffer, boundaryMatch[1]);
                    const uploaded = files.map(f => saveSharedUpload(f.filename, fs.readFileSync(f.savedPath)));
                    try {
                        files.forEach(f => fs.unlinkSync(f.savedPath));
                    }
                    catch { }
                    sendJson(res, { success: true, files: uploaded });
                }
                catch (e) {
                    sendJson(res, { error: e.message }, 400);
                }
            });
            return;
        }
        sendJson(res, { error: "需要 multipart/form-data" }, 400);
        return;
    }
    if (pathname === "/api/shared/write" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name, content } = JSON.parse(body);
                writeSharedFile(name, content);
                sendJson(res, { success: true });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/shared/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name } = JSON.parse(body);
                deleteSharedFile(name);
                sendJson(res, { success: true });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // === 文件浏览器 API ===
    if (pathname === "/api/filesystem/browse" && req.method === "GET") {
        const dir = parsed.query.dir || os.homedir();
        try {
            const items = fs.readdirSync(dir, { withFileTypes: true })
                .filter(item => !item.name.startsWith('.'))
                .map(item => ({
                name: item.name,
                path: path.join(dir, item.name),
                isDirectory: item.isDirectory(),
                isFile: item.isFile()
            }))
                .sort((a, b) => {
                if (a.isDirectory && !b.isDirectory)
                    return -1;
                if (!a.isDirectory && b.isDirectory)
                    return 1;
                return a.name.localeCompare(b.name);
            })
                .slice(0, 100);
            sendJson(res, { success: true, path: dir, items });
        }
        catch (e) {
            sendJson(res, { success: false, error: e.message }, 400);
        }
        return;
    }
    // 获取系统磁盘列表
    if (pathname === "/api/filesystem/drives" && req.method === "GET") {
        try {
            let drives = [];
            if (process.platform === 'win32') {
                // Windows: 检查 A-Z 盘符
                for (let i = 65; i <= 90; i++) {
                    const letter = String.fromCharCode(i);
                    const drivePath = `${letter}:\\`;
                    try {
                        fs.accessSync(drivePath);
                        drives.push({ name: letter, path: drivePath });
                    }
                    catch { }
                }
            }
            else {
                // Linux/Mac: 返回根目录
                drives.push({ name: '/', path: '/' });
            }
            sendJson(res, { success: true, drives, home: os.homedir() });
        }
        catch (e) {
            sendJson(res, { success: false, error: e.message }, 400);
        }
        return;
    }
    // === 终端 API ===
    if (pathname === "/api/terminal/exec" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { command, cwd } = JSON.parse(body);
                if (!command)
                    return sendJson(res, { error: "命令不能为空" }, 400);
                const workDir = cwd || os.homedir();
                console.log(`[终端] 执行命令: ${command} (目录: ${workDir})`);
                try {
                    const output = execSync(command, {
                        encoding: "utf-8",
                        cwd: workDir,
                        timeout: 30000,
                        maxBuffer: 5 * 1024 * 1024,
                        shell: true
                    });
                    sendJson(res, { success: true, output: output, cwd: workDir });
                }
                catch (e) {
                    sendJson(res, {
                        success: true,
                        output: (e.stdout || "") + (e.stderr || e.message),
                        cwd: workDir,
                        error: e.status ? `Exit code: ${e.status}` : e.message
                    });
                }
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 获取当前系统信息
    if (pathname === "/api/terminal/info" && req.method === "GET") {
        sendJson(res, {
            success: true,
            platform: process.platform,
            home: os.homedir(),
            cwd: process.cwd(),
            user: os.userInfo().username,
            shell: process.platform === 'win32' ? 'powershell' : 'bash'
        });
        return;
    }
    // === 任务派发 API ===
    if (pathname === "/api/tasks" && req.method === "GET") {
        return sendJson(res, { tasks: loadTasks() });
    }
    if (pathname === "/api/tasks/create" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const task = createTask(JSON.parse(body));
                sendJson(res, { success: true, task });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/tasks/update" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id, ...updates } = JSON.parse(body);
                const task = updateTask(id, updates);
                if (!task)
                    return sendJson(res, { error: "任务不存在" }, 404);
                sendJson(res, { success: true, task });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/tasks/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id } = JSON.parse(body);
                deleteTask(id);
                sendJson(res, { success: true });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 任务队列 API
    if (pathname === "/api/tasks/queue" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { task_id } = JSON.parse(body);
                if (!task_id)
                    return sendJson(res, { error: "缺少任务 ID" }, 400);
                const tasks = loadTasks();
                const task = tasks.find(t => t.id === task_id);
                if (!task)
                    return sendJson(res, { error: "任务不存在" }, 404);
                enqueueTask(task_id);
                sendJson(res, { success: true, message: "任务已加入队列", queue_status: getQueueStatus() });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 批量加入队列
    if (pathname === "/api/tasks/queue-batch" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { task_ids } = JSON.parse(body);
                if (!task_ids || !Array.isArray(task_ids))
                    return sendJson(res, { error: "缺少任务 ID 列表" }, 400);
                for (const id of task_ids) {
                    enqueueTask(id);
                }
                sendJson(res, { success: true, message: `${task_ids.length} 个任务已加入队列`, queue_status: getQueueStatus() });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 获取队列状态
    if (pathname === "/api/tasks/queue/status" && req.method === "GET") {
        return sendJson(res, getQueueStatus());
    }
    // 清空队列
    if (pathname === "/api/tasks/queue/clear" && req.method === "POST") {
        taskQueues.clear();
        sendJson(res, { success: true, message: "队列已清空" });
        return;
    }
    // === 任务日志 API ===
    // 获取任务日志
    if (pathname === "/api/tasks/logs" && req.method === "GET") {
        const taskId = parsed.query.task_id;
        const limit = parseInt(parsed.query.limit) || 50;
        if (!taskId)
            return sendJson(res, { error: "缺少任务 ID" }, 400);
        const logs = getTaskLogs(taskId, limit);
        return sendJson(res, { success: true, logs });
    }
    // 清空任务日志
    if (pathname === "/api/tasks/logs/clear" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { task_id } = JSON.parse(body);
                if (!task_id)
                    return sendJson(res, { error: "缺少任务 ID" }, 400);
                clearTaskLogs(task_id);
                sendJson(res, { success: true, message: "日志已清空" });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // === 飞书通知配置 API ===
    // 获取飞书配置
    if (pathname === "/api/feishu/config" && req.method === "GET") {
        const config = loadFeishuConfig();
        return sendJson(res, {
            config: {
                app_id: config.app_id || "",
                app_secret: config.app_secret || "",
                enabled: config.enabled !== false,
                authorized: config.authorized || false,
                authorized_user: config.authorized_user || null,
            }
        });
    }
    // 更新飞书配置
    if (pathname === "/api/feishu/config" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const updates = JSON.parse(body);
                const config = loadFeishuConfig();
                // 更新配置字段
                if (updates.app_id !== undefined)
                    config.app_id = updates.app_id;
                if (updates.app_secret !== undefined && updates.app_secret !== "")
                    config.app_secret = updates.app_secret;
                if (updates.webhook_url !== undefined)
                    config.webhook_url = updates.webhook_url;
                if (updates.sign_key !== undefined && updates.sign_key !== "******")
                    config.sign_key = updates.sign_key;
                if (updates.enabled !== undefined)
                    config.enabled = updates.enabled;
                if (updates.redirect_uri !== undefined)
                    config.redirect_uri = updates.redirect_uri;
                console.log("[飞书配置] 保存配置:", { app_id: config.app_id, app_secret: config.app_secret ? "***" : "空" });
                saveFeishuConfig(config);
                sendJson(res, { success: true, message: "飞书配置已保存" });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 获取 OAuth 授权 URL
    if (pathname === "/api/feishu/auth-url" && req.method === "GET") {
        const config = loadFeishuConfig();
        if (!config.app_id) {
            return sendJson(res, { error: "请先配置 App ID" }, 400);
        }
        const scopes = (config.scopes || FEISHU_SCOPES).join(" ");
        const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${config.app_id}&redirect_uri=${encodeURIComponent(config.redirect_uri)}&scope=${encodeURIComponent(scopes)}&state=ccm_auth`;
        return sendJson(res, { success: true, auth_url: authUrl });
    }
    // OAuth 回调处理
    if (pathname === "/api/feishu/callback" && req.method === "GET") {
        const code = parsed.query.code;
        const state = parsed.query.state;
        if (!code) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<h1>授权失败：缺少 code 参数</h1>");
            return;
        }
        const config = loadFeishuConfig();
        if (!config.app_id || !config.app_secret) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end("<h1>授权失败：未配置 App ID 或 Secret</h1>");
            return;
        }
        // 用 code 换取 user_access_token（使用 Promise 处理异步）
        getFeishuUserToken(config.app_id, config.app_secret, code).then(tokenData => {
            if (!tokenData) {
                res.writeHead(400, { "Content-Type": "text/html" });
                res.end("<h1>授权失败：获取 Token 失败</h1>");
                return;
            }
            // 保存 token
            config.user_access_token = tokenData.access_token;
            config.user_refresh_token = tokenData.refresh_token;
            config.token_expires_at = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
            config.authorized = true;
            // 获取用户信息
            return getFeishuUserInfo(tokenData.access_token).then(userInfo => {
                if (userInfo) {
                    config.authorized_user = {
                        name: userInfo.name,
                        open_id: userInfo.open_id,
                        avatar: userInfo.avatar_url
                    };
                }
                saveFeishuConfig(config);
                // 返回成功页面
                res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>飞书授权成功</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:50px">
            <h1 style="color:#22c55e">✅ 飞书授权成功！</h1>
            <p>用户：${userInfo?.name || '未知'}</p>
            <p>授权已生效，可以关闭此页面。</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
          </html>
        `);
            });
        }).catch(err => {
            console.error("[飞书授权] 回调处理失败:", err.message);
            if (!res.headersSent) {
                res.writeHead(500, { "Content-Type": "text/html" });
                res.end("<h1>授权失败：服务器错误</h1>");
            }
        });
        return;
    }
    // 撤销授权
    if (pathname === "/api/feishu/revoke" && req.method === "POST") {
        const config = loadFeishuConfig();
        config.authorized = false;
        config.user_access_token = "";
        config.user_refresh_token = "";
        config.token_expires_at = null;
        config.authorized_user = null;
        saveFeishuConfig(config);
        sendJson(res, { success: true, message: "授权已撤销" });
        return;
    }
    // 获取群聊列表（需要授权）
    if (pathname === "/api/feishu/chats" && req.method === "GET") {
        getValidFeishuToken().then(async (token) => {
            if (!token) {
                sendJson(res, { error: "未授权或 Token 无效，请先完成飞书授权" }, 401);
                return;
            }
            const chats = await getFeishuChatList(token);
            if (!res.headersSent) {
                sendJson(res, { success: true, chats: chats || [] });
            }
        }).catch(err => {
            console.error("[飞书] 获取群聊列表失败:", err.message);
            if (!res.headersSent) {
                sendJson(res, { error: "获取群聊列表失败" }, 500);
            }
        });
        return;
    }
    // 测试飞书通知
    if (pathname === "/api/feishu/test" && req.method === "POST") {
        const config = loadFeishuConfig();
        // 检查配置
        if (!config.app_id) {
            return sendJson(res, { error: "请先配置飞书 App ID" }, 400);
        }
        // 检查是否已授权
        const userId = config.authorized_user?.open_id;
        if (!userId) {
            return sendJson(res, { error: "请先扫码授权获取用户 ID" }, 400);
        }
        const testCard = {
            config: { wide_screen_mode: true },
            header: {
                title: { tag: "plain_text", content: "🔔 测试通知" },
                template: "blue"
            },
            elements: [
                {
                    tag: "div",
                    text: {
                        tag: "lark_md",
                        content: `**ccm 控制台通知测试**\n\n发送时间：${new Date().toLocaleString("zh-CN")}\n\n配置验证成功！✅`
                    }
                }
            ]
        };
        sendFeishuMessageToUser(userId, JSON.stringify(testCard), "interactive").then(success => {
            if (success) {
                sendJson(res, { success: true, message: "测试消息已发送！请检查飞书" });
            }
            else {
                sendJson(res, { error: "发送失败，请检查配置" }, 500);
            }
        }).catch(err => {
            console.error("[飞书] 测试通知失败:", err.message);
            sendJson(res, { error: "发送失败: " + err.message }, 500);
        });
        return;
    }
    // === MCP 工具 API ===
    if (pathname === "/api/mcp" && req.method === "GET") {
        return sendJson(res, { tools: loadMcpTools() });
    }
    if (pathname === "/api/mcp" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const tool = JSON.parse(body);
                if (!tool.name)
                    return sendJson(res, { error: "名称不能为空" }, 400);
                tool.type = "mcp";
                tool.created_at = tool.created_at || new Date().toISOString();
                saveMcpTool(tool);
                sendJson(res, { success: true, tool });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/mcp/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name } = JSON.parse(body);
                deleteMcpTool(name);
                sendJson(res, { success: true });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // === Skills API ===
    if (pathname === "/api/skills" && req.method === "GET") {
        return sendJson(res, { skills: loadSkills() });
    }
    if (pathname === "/api/skills" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const skill = JSON.parse(body);
                if (!skill.name)
                    return sendJson(res, { error: "名称不能为空" }, 400);
                skill.type = "skill";
                skill.created_at = skill.created_at || new Date().toISOString();
                saveSkill(skill);
                sendJson(res, { success: true, skill });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/skills/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name } = JSON.parse(body);
                deleteSkill(name);
                sendJson(res, { success: true });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // === 对话模板 API ===
    // 获取所有模板
    if (pathname === "/api/templates" && req.method === "GET") {
        const category = parsed.query.category;
        let templates = loadTemplates();
        if (category) {
            templates = templates.filter(t => t.category === category);
        }
        return sendJson(res, { templates });
    }
    // 获取单个模板
    if (pathname.match(/^\/api\/templates\/[\w-]+$/) && req.method === "GET") {
        const id = pathname.split("/").pop();
        const templates = loadTemplates();
        const template = templates.find(t => t.id === id);
        if (!template)
            return sendJson(res, { error: "模板不存在" }, 404);
        return sendJson(res, { template });
    }
    // 创建模板
    if (pathname === "/api/templates" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const template = createTemplate(JSON.parse(body));
                sendJson(res, { success: true, template });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 更新模板
    if (pathname.match(/^\/api\/templates\/[\w-]+$/) && req.method === "PUT") {
        const id = pathname.split("/").pop();
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const template = updateTemplate(id, JSON.parse(body));
                if (!template)
                    return sendJson(res, { error: "模板不存在" }, 404);
                sendJson(res, { success: true, template });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 删除模板
    if (pathname.match(/^\/api\/templates\/[\w-]+$/) && req.method === "DELETE") {
        const id = pathname.split("/").pop();
        deleteTemplate(id);
        sendJson(res, { success: true });
        return;
    }
    // 获取模板分类
    if (pathname === "/api/templates/categories" && req.method === "GET") {
        const categories = [
            { id: "development", name: "开发", icon: "💻" },
            { id: "maintenance", name: "维护", icon: "🔧" },
            { id: "review", name: "审查", icon: "🔍" },
            { id: "collaboration", name: "协作", icon: "🤝" },
            { id: "planning", name: "规划", icon: "📋" },
            { id: "custom", name: "自定义", icon: "✏️" }
        ];
        return sendJson(res, { categories });
    }
    // === 定时任务 API ===
    if (pathname === "/api/cron" && req.method === "GET") {
        return sendJson(res, { jobs: loadCronJobs() });
    }
    if (pathname === "/api/cron/create" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const job = createCronJob(JSON.parse(body));
                sendJson(res, { success: true, job });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/cron/update" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id, ...updates } = JSON.parse(body);
                const job = updateCronJob(id, updates);
                if (!job)
                    return sendJson(res, { error: "定时任务不存在" }, 404);
                sendJson(res, { success: true, job });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/cron/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id } = JSON.parse(body);
                deleteCronJob(id);
                sendJson(res, { success: true });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
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
            // 避免在词中间截断
            const lastSpace = text.lastIndexOf(" ");
            if (lastSpace > 8)
                text = text.substring(0, lastSpace);
        }
        return icon + text || "新会话";
    }
    // === 会话管理 API（文件夹格式 + 同步 cc-connect）===
    function getNextSessionId(projectName) {
        const dir = path.join(WEB_SESSIONS_DIR, projectName);
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
    // 创建新会话
    if (pathname === "/api/sessions/create" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, name } = JSON.parse(body);
                const dir = ensureWebSessionDir(project);
                const sid = getNextSessionId(project);
                const now = new Date();
                const pad = n => String(n).padStart(2, "0");
                const timeStr = `${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
                const count = fs.readdirSync(dir).filter(f => f.endsWith(".json")).length;
                const sessionName = name || `会话 ${count + 1} · ${timeStr}`;
                const sessionData = { id: sid, name: sessionName, agent_type: "claudecode", history: [], created_at: now.toISOString(), updated_at: now.toISOString() };
                fs.writeFileSync(path.join(dir, `${sid}.json`), JSON.stringify(sessionData, null, 2));
                syncToFilesystemToCc(project);
                sendJson(res, { success: true, sessionId: sid, name: sessionName });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 删除会话
    if (pathname === "/api/sessions/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, sessionId } = JSON.parse(body);
                const filePath = path.join(WEB_SESSIONS_DIR, project, `${sessionId}.json`);
                if (!fs.existsSync(filePath))
                    return sendJson(res, { error: "会话不存在" }, 404);
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
                sendJson(res, { success: true });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 重命名会话
    if (pathname === "/api/sessions/rename" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, sessionId, name } = JSON.parse(body);
                const filePath = path.join(WEB_SESSIONS_DIR, project, `${sessionId}.json`);
                if (!fs.existsSync(filePath))
                    return sendJson(res, { error: "会话不存在" }, 404);
                const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                data.name = name;
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                const ccFile = findCcSessionFile(project);
                if (ccFile) {
                    try {
                        const ccData = JSON.parse(fs.readFileSync(ccFile, "utf-8"));
                        if (ccData.sessions[sessionId]) {
                            ccData.sessions[sessionId].name = name;
                            fs.writeFileSync(ccFile, JSON.stringify(ccData, null, 2));
                        }
                    }
                    catch { }
                }
                sendJson(res, { success: true });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 自动命名会话（AI 生成标题）
    if (pathname === "/api/sessions/auto-name" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { project, sessionId, message, workDir } = JSON.parse(body);
                const filePath = path.join(getProjectSessionDir(project), `${sessionId}.json`);
                if (!fs.existsSync(filePath))
                    return sendJson(res, { error: "会话不存在" }, 404);
                let title = "";
                // 尝试用 AI 生成标题
                try {
                    const prompt = `根据以下消息生成简短中文标题（不超过15字，无引号无标点）：${message}`;
                    const tmpFile = path.join(UPLOAD_DIR, `_title_${Date.now()}.txt`);
                    fs.writeFileSync(tmpFile, prompt, "utf-8");
                    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
                    const result = execSync(`type "${tmpFile}" | claude -p`, {
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
                // AI 失败则用规则生成
                if (!title)
                    title = generateTitle(message);
                // 更新会话名称
                const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                data.name = title;
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                sendJson(res, { success: true, name: title });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // === 流式发送消息给 Agent（SSE）===
    if (pathname === "/api/send-stream" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, message } = JSON.parse(body);
                if (!project || !message)
                    return sendJson(res, { error: "参数不足" }, 400);
                const configs = getConfigs();
                const config = configs.find(c => c.name === project);
                if (!config)
                    return sendJson(res, { error: "项目不存在" }, 400);
                const info = getConfigInfo(config.path);
                const workDir = info[0]?.workDir;
                const agentType = info[0]?.agent || "claudecode";
                callAgentStream(project, message, workDir, agentType, res);
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // === 发送消息给 Agent ===
    if (pathname === "/api/send" && req.method === "POST") {
        const contentType = req.headers["content-type"] || "";
        async function handleSend(project, message, files) {
            // 获取项目 work_dir
            const configs = getConfigs();
            const config = configs.find(c => c.name === project);
            if (!config)
                return sendJson(res, { error: "项目不存在" }, 400);
            const info = getConfigInfo(config.path);
            const workDir = info[0]?.workDir;
            if (!workDir)
                return sendJson(res, { error: "无法获取项目目录" }, 400);
            // 构建完整消息
            let fullMessage = message || "";
            if (files && files.length > 0) {
                const fileList = files.map(f => `[文件: ${f.filename} -> ${f.savedPath}]`).join("\n");
                fullMessage = fullMessage ? `${fullMessage}\n\n${fileList}` : `请处理以下文件:\n${fileList}`;
            }
            if (!fullMessage)
                return sendJson(res, { error: "消息不能为空" }, 400);
            // 获取项目配置的 Agent 类型
            const agentType = getConfigInfo(config.path)[0]?.agent || "claudecode";
            const safeCwd = workDir.replace(/\\/g, "/");
            // 根据 Agent 类型调用不同的 CLI
            try {
                const tmpMsg = path.join(UPLOAD_DIR, `_msg_${Date.now()}.txt`);
                fs.writeFileSync(tmpMsg, fullMessage, "utf-8");
                let cmd;
                switch (agentType) {
                    case "cursor":
                        cmd = `type "${tmpMsg}" | agent -p`;
                        break;
                    case "gemini":
                        cmd = `type "${tmpMsg}" | gemini -p`;
                        break;
                    case "codex":
                        cmd = `type "${tmpMsg}" | codex -q`;
                        break;
                    case "claudecode":
                    default:
                        cmd = `type "${tmpMsg}" | claude -p`;
                        break;
                }
                const result = execSync(cmd, {
                    encoding: "utf-8",
                    timeout: 120000,
                    cwd: safeCwd,
                    shell: true,
                    maxBuffer: 10 * 1024 * 1024,
                });
                try {
                    fs.unlinkSync(tmpMsg);
                }
                catch { }
                return sendJson(res, { success: true, output: result });
            }
            catch (e) {
                return sendJson(res, { error: e.stdout || e.stderr || "发送失败" }, 500);
            }
        }
        // multipart（带文件）
        if (contentType.includes("multipart/form-data")) {
            const chunks = [];
            req.on("data", (chunk) => chunks.push(chunk));
            req.on("end", async () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const boundaryMatch = contentType.match(/boundary=(.+)/);
                    if (!boundaryMatch)
                        return sendJson(res, { error: "无效请求" }, 400);
                    const { files, fields } = parseMultipart(buffer, boundaryMatch[1]);
                    await handleSend(fields.project, fields.message, files);
                }
                catch (e) {
                    sendJson(res, { error: e.message }, 400);
                }
            });
            return;
        }
        // 纯文本 JSON
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { project, message } = JSON.parse(body);
                await handleSend(project, message, null);
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // === 群聊 API ===
    // 获取所有群聊
    if (pathname === "/api/groups" && req.method === "GET") {
        return sendJson(res, { groups: loadGroups() });
    }
    // 创建群聊（自动加入主 Agent）
    if (pathname === "/api/groups/create" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { name, members } = JSON.parse(body);
                const groups = loadGroups();
                const id = "g" + Date.now().toString(36);
                // 自动加入主 Agent（协调者）
                const allMembers = [
                    { project: "coordinator", role: "coordinator", agent: "claudecode" },
                    ...(members || [])
                ];
                const group = {
                    id, name, members: allMembers,
                    created_at: new Date().toISOString(),
                };
                groups.push(group);
                saveGroups(groups);
                sendJson(res, { success: true, group });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 更新群聊成员
    if (pathname === "/api/groups/members" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id, add, remove } = JSON.parse(body);
                const groups = loadGroups();
                const group = groups.find(g => g.id === id);
                if (!group)
                    return sendJson(res, { error: "群聊不存在" }, 404);
                if (add) {
                    for (const m of add) {
                        if (!group.members.find(x => x.project === m.project)) {
                            group.members.push(m);
                        }
                    }
                }
                if (remove) {
                    group.members = group.members.filter(m => !remove.includes(m.project) || m.project === "coordinator");
                }
                saveGroups(groups);
                sendJson(res, { success: true, group });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 删除群聊
    if (pathname === "/api/groups/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id } = JSON.parse(body);
                const groups = loadGroups().filter(g => g.id !== id);
                saveGroups(groups);
                try {
                    fs.unlinkSync(path.join(GROUP_MESSAGES_DIR, `${id}.json`));
                }
                catch { }
                sendJson(res, { success: true });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 重命名群聊
    if (pathname === "/api/groups/rename" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id, name } = JSON.parse(body);
                if (!name || !name.trim())
                    return sendJson(res, { error: "群聊名称不能为空" }, 400);
                const groups = loadGroups();
                const group = groups.find(g => g.id === id);
                if (!group)
                    return sendJson(res, { error: "群聊不存在" }, 404);
                group.name = name.trim();
                saveGroups(groups);
                sendJson(res, { success: true, group });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // === 群聊工具配置 API ===
    // 获取群聊工具配置
    if (pathname === "/api/groups/tools" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return sendJson(res, { error: "缺少群聊 ID" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group)
            return sendJson(res, { error: "群聊不存在" }, 404);
        return sendJson(res, { tools: group.tools || { mcp: [], skill: [] } });
    }
    // 更新群聊工具配置
    if (pathname === "/api/groups/tools" && req.method === "POST") {
        console.log("[群聊工具] 收到保存请求");
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                console.log("[群聊工具] 请求体:", body);
                const { group_id, tools } = JSON.parse(body);
                console.log("[群聊工具] 解析结果:", { group_id, tools });
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group) {
                    console.log("[群聊工具] 群聊不存在:", group_id);
                    return sendJson(res, { error: "群聊不存在" }, 404);
                }
                group.tools = tools;
                saveGroups(groups);
                console.log("[群聊工具] 保存成功:", group.tools);
                sendJson(res, { success: true, tools: group.tools });
            }
            catch (e) {
                console.error("[群聊工具] 错误:", e.message);
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // === 项目工具和共享文件 API ===
    const PROJECT_CONFIGS_FILE = path.join(CCM_DIR, "project-configs.json");
    function loadProjectConfigs() {
        try {
            if (fs.existsSync(PROJECT_CONFIGS_FILE)) {
                return JSON.parse(fs.readFileSync(PROJECT_CONFIGS_FILE, "utf-8"));
            }
        }
        catch (e) {
            console.error("加载项目配置失败:", e.message);
        }
        return {};
    }
    function saveProjectConfigs(configs) {
        fs.writeFileSync(PROJECT_CONFIGS_FILE, JSON.stringify(configs, null, 2));
    }
    // 获取项目工具配置
    if (pathname === "/api/projects/tools" && req.method === "GET") {
        const project = parsed.query.project;
        if (!project)
            return sendJson(res, { error: "缺少项目参数" }, 400);
        const configs = loadProjectConfigs();
        return sendJson(res, { tools: configs[project]?.tools || { mcp: [], skill: [] } });
    }
    // 更新项目工具配置
    if (pathname === "/api/projects/tools" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, tools } = JSON.parse(body);
                if (!project)
                    return sendJson(res, { error: "缺少项目参数" }, 400);
                const configs = loadProjectConfigs();
                if (!configs[project])
                    configs[project] = {};
                configs[project].tools = tools;
                saveProjectConfigs(configs);
                sendJson(res, { success: true, tools });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 获取项目共享文件
    if (pathname === "/api/projects/shared" && req.method === "GET") {
        const project = parsed.query.project;
        if (!project)
            return sendJson(res, { error: "缺少项目参数" }, 400);
        const configs = loadProjectConfigs();
        return sendJson(res, { files: configs[project]?.shared_files || [] });
    }
    // 添加项目共享文件
    if (pathname === "/api/projects/shared/add" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, name, content } = JSON.parse(body);
                if (!project || !name)
                    return sendJson(res, { error: "缺少参数" }, 400);
                const configs = loadProjectConfigs();
                if (!configs[project])
                    configs[project] = {};
                if (!configs[project].shared_files)
                    configs[project].shared_files = [];
                const existing = configs[project].shared_files.findIndex(f => f.name === name);
                if (existing >= 0) {
                    configs[project].shared_files[existing].content = content;
                    configs[project].shared_files[existing].updated_at = new Date().toISOString();
                }
                else {
                    configs[project].shared_files.push({
                        name, content,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }
                saveProjectConfigs(configs);
                sendJson(res, { success: true, files: configs[project].shared_files });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 删除项目共享文件
    if (pathname === "/api/projects/shared/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, name } = JSON.parse(body);
                if (!project || !name)
                    return sendJson(res, { error: "缺少参数" }, 400);
                const configs = loadProjectConfigs();
                if (configs[project]?.shared_files) {
                    configs[project].shared_files = configs[project].shared_files.filter(f => f.name !== name);
                    saveProjectConfigs(configs);
                }
                sendJson(res, { success: true });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // === 群聊共享文件 API ===
    // 获取群聊共享文件列表
    if (pathname === "/api/groups/shared" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return sendJson(res, { error: "缺少群聊 ID" }, 400);
        const groups = loadGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group)
            return sendJson(res, { error: "群聊不存在" }, 404);
        return sendJson(res, { files: group.shared_files || [] });
    }
    // 添加群聊共享文件
    if (pathname === "/api/groups/shared/add" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id, name, content } = JSON.parse(body);
                if (!name || !content)
                    return sendJson(res, { error: "文件名和内容不能为空" }, 400);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return sendJson(res, { error: "群聊不存在" }, 404);
                if (!group.shared_files)
                    group.shared_files = [];
                // 检查是否已存在，存在则更新
                const existing = group.shared_files.findIndex(f => f.name === name);
                if (existing >= 0) {
                    group.shared_files[existing].content = content;
                    group.shared_files[existing].updated_at = new Date().toISOString();
                }
                else {
                    group.shared_files.push({
                        name,
                        content,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }
                saveGroups(groups);
                sendJson(res, { success: true, files: group.shared_files });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 删除群聊共享文件
    if (pathname === "/api/groups/shared/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id, name } = JSON.parse(body);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return sendJson(res, { error: "群聊不存在" }, 404);
                if (!group.shared_files)
                    group.shared_files = [];
                group.shared_files = group.shared_files.filter(f => f.name !== name);
                saveGroups(groups);
                sendJson(res, { success: true, files: group.shared_files });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 从全局共享文件导入到群聊
    if (pathname === "/api/groups/shared/import" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id, file_names } = JSON.parse(body);
                if (!file_names || !Array.isArray(file_names))
                    return sendJson(res, { error: "请提供文件名列表" }, 400);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return sendJson(res, { error: "群聊不存在" }, 404);
                if (!group.shared_files)
                    group.shared_files = [];
                let imported = 0;
                for (const name of file_names) {
                    const filePath = path.join(SHARED_DIR, name);
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, "utf-8");
                        const existing = group.shared_files.findIndex(f => f.name === name);
                        if (existing >= 0) {
                            group.shared_files[existing].content = content;
                            group.shared_files[existing].updated_at = new Date().toISOString();
                        }
                        else {
                            group.shared_files.push({
                                name,
                                content,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            });
                        }
                        imported++;
                    }
                }
                saveGroups(groups);
                sendJson(res, { success: true, imported, files: group.shared_files });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 获取群聊消息
    if (pathname === "/api/groups/messages" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return sendJson(res, { error: "缺少群聊 ID" }, 400);
        const limit = parseInt(parsed.query.limit) || 100;
        const messages = getGroupMessages(groupId).slice(-limit);
        return sendJson(res, { messages });
    }
    // === 群聊日志系统 ===
    const GROUP_LOGS_FILE = path.join(CCM_DIR, "group-logs.json");
    function loadGroupLogs() {
        try {
            if (fs.existsSync(GROUP_LOGS_FILE)) {
                return JSON.parse(fs.readFileSync(GROUP_LOGS_FILE, "utf-8"));
            }
        }
        catch (e) {
            console.error("加载群聊日志失败:", e.message);
        }
        return {};
    }
    function saveGroupLogs(logs) {
        try {
            fs.writeFileSync(GROUP_LOGS_FILE, JSON.stringify(logs, null, 2));
        }
        catch (e) {
            console.error("保存群聊日志失败:", e.message);
        }
    }
    function addGroupLog(groupId, level, category, message, details = null) {
        const logs = loadGroupLogs();
        if (!logs[groupId])
            logs[groupId] = [];
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            category: category,
            message: message,
            details: details
        };
        logs[groupId].push(logEntry);
        // 限制每个群聊最多 500 条日志
        if (logs[groupId].length > 500) {
            logs[groupId] = logs[groupId].slice(-500);
        }
        saveGroupLogs(logs);
    }
    // 获取群聊日志
    if (pathname === "/api/groups/logs" && req.method === "GET") {
        const groupId = parsed.query.id;
        const limit = parseInt(parsed.query.limit) || 100;
        const category = parsed.query.category; // 可选过滤类别
        if (!groupId)
            return sendJson(res, { error: "缺少群聊 ID" }, 400);
        const logs = loadGroupLogs();
        let groupLogs = logs[groupId] || [];
        if (category) {
            groupLogs = groupLogs.filter(l => l.category === category);
        }
        return sendJson(res, { logs: groupLogs.slice(-limit) });
    }
    // 清空群聊日志
    if (pathname === "/api/groups/logs/clear" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { group_id } = JSON.parse(body);
                const logs = loadGroupLogs();
                delete logs[group_id];
                saveGroupLogs(logs);
                sendJson(res, { success: true });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 实时日志流 (SSE)
    if (pathname === "/api/groups/logs/stream" && req.method === "GET") {
        const groupId = parsed.query.id;
        if (!groupId)
            return sendJson(res, { error: "缺少群聊 ID" }, 400);
        // 设置 SSE 头
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        });
        // 发送初始连接消息
        res.write(`data: ${JSON.stringify({ type: "connected", message: "日志流已连接" })}\n\n`);
        // 获取初始日志数量
        const logs = loadGroupLogs();
        const initialCount = (logs[groupId] || []).length;
        let lastCount = initialCount;
        // 定期检查新日志
        const interval = setInterval(() => {
            try {
                const currentLogs = loadGroupLogs();
                const groupLogs = currentLogs[groupId] || [];
                if (groupLogs.length > lastCount) {
                    const newLogs = groupLogs.slice(lastCount);
                    for (const log of newLogs) {
                        res.write(`data: ${JSON.stringify({ type: "log", log })}\n\n`);
                    }
                    lastCount = groupLogs.length;
                }
            }
            catch (e) {
                res.write(`data: ${JSON.stringify({ type: "error", message: e.message })}\n\n`);
            }
        }, 1000); // 每秒检查一次
        // 客户端断开连接时清理
        req.on("close", () => {
            clearInterval(interval);
        });
        return;
    }
    // 在群聊中发消息（用户发给指定 Agent，Agent 回复也在群里）
    if (pathname === "/api/groups/send" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { group_id, target_project, message } = JSON.parse(body);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return sendJson(res, { error: "群聊不存在" }, 400);
                // 如果 target_project 是 "all" 或 undefined，群发给所有成员
                const isBroadcast = !target_project || target_project === "all";
                const targetMembers = isBroadcast
                    ? group.members.filter(m => m.project !== "coordinator")
                    : [group.members.find(m => m.project === target_project)].filter(Boolean);
                if (targetMembers.length === 0) {
                    return sendJson(res, { error: "没有找到目标项目" }, 400);
                }
                // 记录用户消息
                const userMsg = {
                    id: "m" + Date.now().toString(36),
                    role: "user",
                    target: isBroadcast ? "all" : target_project,
                    content: message,
                    timestamp: new Date().toISOString(),
                };
                appendGroupMessage(group_id, userMsg);
                // 记录日志
                addGroupLog(group_id, "info", "message", `用户发送消息给 ${isBroadcast ? '所有人' : target_project}`, {
                    message: message.substring(0, 200),
                    target: isBroadcast ? "all" : target_project,
                    is_broadcast: isBroadcast
                });
                // 获取项目配置（coordinator 使用第一个项目的目录）
                const configs = getConfigs();
                // 如果是群发，处理所有成员
                if (isBroadcast) {
                    // 流式输出
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                    });
                    res.write(`data: ${JSON.stringify({ type: "status", text: "🧠 群发中，所有 Agent 处理中..." })}\n\n`);
                    let allOutputs = [];
                    for (const member of targetMembers) {
                        const config = configs.find(c => c.name === member.project);
                        if (!config)
                            continue;
                        const info = getConfigInfo(config.path);
                        const workDir = info[0]?.workDir;
                        const agentType = info[0]?.agent || "claudecode";
                        // 构建 prompt
                        const recentMsgs = getGroupMessages(group_id).slice(-10);
                        const context = recentMsgs.map(m => {
                            const who = m.role === "user" ? `[用户 → ${m.target}]` : `[${m.agent || "Agent"}]`;
                            return `${who} ${m.content}`;
                        }).join("\n");
                        const memberList = group.members.map(m => m.project).filter(p => p !== member.project && p !== "coordinator").join(", ");
                        const atInstructions = memberList ? `\n\n群聊中还有其他 Agent：${memberList}。如果你需要其他 Agent 协助，在回复中用 @项目名 的格式提出请求。` : "";
                        // 获取群聊共享文件
                        let sharedFilesContext = "";
                        if (group.shared_files && group.shared_files.length > 0) {
                            // 判断是否是文本文件
                            const textExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.html', '.css', '.xml', '.yaml', '.yml', '.csv', '.log', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.sh', '.bat', '.toml', '.ini', '.conf', '.env'];
                            const isTextFile = (filename) => {
                                const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
                                return textExtensions.includes(ext);
                            };
                            const textFiles = group.shared_files.filter(f => isTextFile(f.name) && f.content);
                            const binaryFiles = group.shared_files.filter(f => !isTextFile(f.name));
                            if (textFiles.length > 0 || binaryFiles.length > 0) {
                                sharedFilesContext = "\n\n以下是群聊中的共享文件：";
                                if (textFiles.length > 0) {
                                    sharedFilesContext += "\n\n[文本文件 - 可直接读取]\n" +
                                        textFiles.map(f => `\n--- ${f.name} ---\n${f.content}`).join("\n");
                                }
                                if (binaryFiles.length > 0) {
                                    sharedFilesContext += "\n\n[二进制文件 - 仅列出文件名，无法直接读取内容]\n" +
                                        binaryFiles.map(f => `- ${f.name}`).join("\n");
                                }
                            }
                        }
                        // 获取群聊配置的工具
                        let toolsContext = "";
                        if (group.tools) {
                            const mcpTools = group.tools.mcp || [];
                            const skillTools = group.tools.skill || [];
                            if (mcpTools.length > 0 || skillTools.length > 0) {
                                toolsContext = "\n\n你当前可以使用的工具：";
                                if (mcpTools.length > 0) {
                                    toolsContext += "\n- MCP 服务器：" + mcpTools.join(", ");
                                }
                                if (skillTools.length > 0) {
                                    toolsContext += "\n- Skills：" + skillTools.join(", ");
                                }
                            }
                        }
                        const fullPrompt = `你是一个在群聊中协作的开发 Agent，项目: ${member.project}。${atInstructions}${toolsContext}${sharedFilesContext}\n以下是群聊最近的消息记录：\n${context}\n\n请回复用户刚才发给你的消息：${message}`;
                        res.write(`data: ${JSON.stringify({ type: "status", text: `🧠 ${member.project} 处理中...` })}\n\n`);
                        const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
                        const tmpMsg = path.join(UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
                        fs.writeFileSync(tmpMsg, fullPrompt, "utf-8");
                        let cmd;
                        switch (agentType) {
                            case "cursor":
                                cmd = `type "${tmpMsg}" | agent -p`;
                                break;
                            case "gemini":
                                cmd = `type "${tmpMsg}" | gemini -p`;
                                break;
                            case "codex":
                                cmd = `type "${tmpMsg}" | codex -q`;
                                break;
                            default:
                                cmd = `type "${tmpMsg}" | claude -p`;
                                break;
                        }
                        try {
                            const output = execSync(cmd, {
                                encoding: "utf-8",
                                timeout: 300000,
                                cwd: safeCwd,
                                shell: true,
                                maxBuffer: 10 * 1024 * 1024,
                            });
                            try {
                                fs.unlinkSync(tmpMsg);
                            }
                            catch { }
                            const trimmedOutput = output.trim();
                            allOutputs.push({ project: member.project, output: trimmedOutput });
                            // 发送每个 Agent 的回复
                            res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n\n【${member.project}】\n${trimmedOutput}` })}\n\n`);
                            // 记录到群聊消息
                            appendGroupMessage(group_id, {
                                id: "m" + Date.now().toString(36) + member.project,
                                role: "assistant", agent: member.project,
                                content: trimmedOutput,
                                timestamp: new Date().toISOString(),
                            });
                            // 检查 @mentions
                            const atMentions = trimmedOutput.match(/@[\w-]+/g) || [];
                            const validMentions = atMentions.filter(m => {
                                const name = m.slice(1);
                                return group.members.some(mem => mem.project === name);
                            });
                            if (validMentions.length > 0) {
                                console.log(`[群聊] Agent ${member.project} 的回复包含 @mentions: ${validMentions.join(", ")}`);
                                setTimeout(() => processCrossAgents(group_id, group, member.project, trimmedOutput, validMentions, configs), 1000);
                            }
                        }
                        catch (e) {
                            try {
                                fs.unlinkSync(tmpMsg);
                            }
                            catch { }
                            res.write(`data: ${JSON.stringify({ type: "chunk", text: `\n\n【${member.project}】\n错误: ${e.message}` })}\n\n`);
                        }
                    }
                    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
                    res.end();
                    return;
                }
                // 单个 Agent 模式
                const target_project_actual = targetMembers[0].project;
                let workDir, agentType;
                if (target_project_actual === "coordinator") {
                    const firstMember = group.members.find(m => m.project !== "coordinator");
                    const firstConfig = firstMember ? configs.find(c => c.name === firstMember.project) : configs[0];
                    workDir = firstConfig ? getConfigInfo(firstConfig.path)[0]?.workDir : process.cwd();
                    agentType = "claudecode";
                }
                else {
                    const config = configs.find(c => c.name === target_project_actual);
                    if (!config)
                        return sendJson(res, { error: "项目配置不存在" }, 400);
                    workDir = getConfigInfo(config.path)[0]?.workDir;
                    agentType = getConfigInfo(config.path)[0]?.agent || "claudecode";
                }
                // 构建带上下文的 prompt（包含群聊最近消息 + @ 协作指令）
                const recentMsgs = getGroupMessages(group_id).slice(-10);
                const context = recentMsgs.map(m => {
                    const who = m.role === "user" ? `[用户 → ${m.target}]` : `[${m.agent || "Agent"}]`;
                    return `${who} ${m.content}`;
                }).join("\n");
                const memberList = group.members.map(m => m.project).filter(p => p !== target_project_actual).join(", ");
                let atInstructions = "";
                if (target_project_actual === "coordinator") {
                    atInstructions = `\n\n你是群聊的主 Agent（协调者），负责分析用户需求、拆分任务、分配给其他 Agent。群聊中的开发 Agent 有：${memberList}。\n\n你的职责：\n1. 理解用户的需求\n2. 拆分成具体的开发任务\n3. 用 @项目名 的格式把任务分配给对应的 Agent\n4. 跟踪进度，协调各方\n\n示例回复：\n好的，我来拆分这个需求：\n@smart-live-Cloud 用户接口需要新增 user_avatar 字段\n@smart-live-app 用户页面需要展示头像，调用 /api/user 获取`;
                }
                else {
                    atInstructions = memberList ? `\n\n群聊中还有其他 Agent：${memberList}。如果你需要其他 Agent 协助，在回复中用 @项目名 的格式提出请求，例如：@smart-live-app 字段改了请适配前端。系统会自动把你的请求转发给对应的 Agent。` : "";
                }
                // 获取群聊共享文件
                let sharedFilesContext = "";
                if (group.shared_files && group.shared_files.length > 0) {
                    // 判断是否是文本文件
                    const textExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.html', '.css', '.xml', '.yaml', '.yml', '.csv', '.log', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.sh', '.bat', '.toml', '.ini', '.conf', '.env'];
                    const isTextFile = (filename) => {
                        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
                        return textExtensions.includes(ext);
                    };
                    const textFiles = group.shared_files.filter(f => isTextFile(f.name) && f.content);
                    const binaryFiles = group.shared_files.filter(f => !isTextFile(f.name));
                    if (textFiles.length > 0 || binaryFiles.length > 0) {
                        sharedFilesContext = "\n\n以下是群聊中的共享文件：";
                        if (textFiles.length > 0) {
                            sharedFilesContext += "\n\n[文本文件 - 可直接读取]\n" +
                                textFiles.map(f => `\n--- ${f.name} ---\n${f.content}`).join("\n");
                        }
                        if (binaryFiles.length > 0) {
                            sharedFilesContext += "\n\n[二进制文件 - 仅列出文件名，无法直接读取内容]\n" +
                                binaryFiles.map(f => `- ${f.name}`).join("\n");
                        }
                    }
                }
                // 获取群聊配置的工具
                let toolsContext = "";
                if (group.tools) {
                    const mcpTools = group.tools.mcp || [];
                    const skillTools = group.tools.skill || [];
                    if (mcpTools.length > 0 || skillTools.length > 0) {
                        toolsContext = "\n\n你当前可以使用的工具：";
                        if (mcpTools.length > 0) {
                            toolsContext += "\n- MCP 服务器：" + mcpTools.join(", ");
                        }
                        if (skillTools.length > 0) {
                            toolsContext += "\n- Skills：" + skillTools.join(", ");
                        }
                    }
                }
                // 获取项目级别的工具和共享文件
                const PROJECT_CONFIGS_FILE = path.join(CCM_DIR, "project-configs.json");
                let projectConfigs = {};
                try {
                    if (fs.existsSync(PROJECT_CONFIGS_FILE)) {
                        projectConfigs = JSON.parse(fs.readFileSync(PROJECT_CONFIGS_FILE, "utf-8"));
                    }
                }
                catch (e) { }
                const projectConfig = projectConfigs[target_project_actual] || {};
                // 项目工具
                if (projectConfig.tools) {
                    const projectMcp = projectConfig.tools.mcp || [];
                    const projectSkill = projectConfig.tools.skill || [];
                    if (projectMcp.length > 0 || projectSkill.length > 0) {
                        if (!toolsContext)
                            toolsContext = "\n\n你当前可以使用的工具：";
                        if (projectMcp.length > 0) {
                            toolsContext += "\n- MCP 服务器：" + projectMcp.join(", ");
                        }
                        if (projectSkill.length > 0) {
                            toolsContext += "\n- Skills：" + projectSkill.join(", ");
                        }
                    }
                }
                // 项目共享文件
                if (projectConfig.shared_files && projectConfig.shared_files.length > 0) {
                    const textExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.html', '.css', '.xml', '.yaml', '.yml', '.csv', '.log', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.sh', '.bat', '.toml', '.ini', '.conf', '.env'];
                    const isTextFile = (filename) => {
                        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
                        return textExtensions.includes(ext);
                    };
                    const projectTextFiles = projectConfig.shared_files.filter(f => isTextFile(f.name) && f.content);
                    const projectBinaryFiles = projectConfig.shared_files.filter(f => !isTextFile(f.name));
                    if (projectTextFiles.length > 0 || projectBinaryFiles.length > 0) {
                        sharedFilesContext += "\n\n[项目共享文件]";
                        if (projectTextFiles.length > 0) {
                            sharedFilesContext += "\n" + projectTextFiles.map(f => `\n--- ${f.name} ---\n${f.content}`).join("\n");
                        }
                        if (projectBinaryFiles.length > 0) {
                            sharedFilesContext += "\n二进制文件：" + projectBinaryFiles.map(f => f.name).join(", ");
                        }
                    }
                }
                const fullPrompt = `你是一个在群聊中协作的开发 Agent，项目: ${target_project_actual}。${atInstructions}${toolsContext}${sharedFilesContext}\n以下是群聊最近的消息记录：\n${context}\n\n请回复用户刚才发给你的消息：${message}`;
                // 检查是否请求流式输出
                const useStream = parsed.query.stream === "1" || req.headers["accept"] === "text/event-stream";
                if (useStream) {
                    // 流式输出
                    const safeCwd = (workDir || process.cwd()).replace(/\\/g, "/");
                    const tmpMsg = path.join(UPLOAD_DIR, `_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);
                    fs.writeFileSync(tmpMsg, fullPrompt, "utf-8");
                    let cmd;
                    switch (agentType) {
                        case "cursor":
                            cmd = `type "${tmpMsg}" | agent -p`;
                            break;
                        case "gemini":
                            cmd = `type "${tmpMsg}" | gemini -p`;
                            break;
                        case "codex":
                            cmd = `type "${tmpMsg}" | codex -q`;
                            break;
                        default:
                            cmd = `type "${tmpMsg}" | claude -p`;
                            break;
                    }
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                    });
                    res.write(`data: ${JSON.stringify({ type: "status", text: "🧠 Agent 正在思考..." })}\n\n`);
                    const child = spawn(cmd, [], { shell: true, cwd: safeCwd, stdio: ["pipe", "pipe", "pipe"] });
                    child.stdin.end();
                    let fullOutput = "";
                    let buffer = "";
                    child.stdout.on("data", (chunk) => {
                        const text = chunk.toString("utf-8");
                        fullOutput += text;
                        buffer += text;
                        if (buffer.length > 10) {
                            res.write(`data: ${JSON.stringify({ type: "chunk", text: buffer })}\n\n`);
                            buffer = "";
                        }
                    });
                    child.on("close", () => {
                        try {
                            fs.unlinkSync(tmpMsg);
                        }
                        catch { }
                        if (buffer)
                            res.write(`data: ${JSON.stringify({ type: "chunk", text: buffer })}\n\n`);
                        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
                        res.end();
                        // 记录到群聊消息
                        appendGroupMessage(group_id, {
                            id: "m" + Date.now().toString(36) + "a",
                            role: "assistant", agent: target_project_actual,
                            content: fullOutput.trim(),
                            timestamp: new Date().toISOString(),
                        });
                        // 记录日志
                        addGroupLog(group_id, "success", "response", `Agent ${target_project_actual} 回复完成`, {
                            agent: target_project_actual,
                            response_length: fullOutput.length,
                            response_preview: fullOutput.substring(0, 300)
                        });
                        // 异步处理跨 Agent 调用
                        console.log(`[群聊] Agent ${target_project_actual} 回复完成，检查 @mentions...`);
                        console.log(`[群聊] 输出内容 (前500字符): ${fullOutput.substring(0, 500)}`);
                        // 使用更宽松的正则匹配 @mentions
                        const atMentions = fullOutput.match(/@[\w-]+/g) || [];
                        // 过滤掉不是群聊成员的 mentions
                        const validMentions = atMentions.filter(m => {
                            const name = m.slice(1);
                            return group.members.some(member => member.project === name);
                        });
                        console.log(`[群聊] 检测到 @mentions: ${atMentions.join(", ")}`);
                        console.log(`[群聊] 有效的 @mentions (群聊成员): ${validMentions.join(", ")}`);
                        if (validMentions.length > 0) {
                            console.log(`[群聊] 触发跨 Agent 协作处理`);
                            setImmediate(() => processCrossAgents(group_id, group, target_project_actual, fullOutput, validMentions, configs));
                        }
                        else {
                            console.log(`[群聊] 未检测到有效的 @mentions，跳过跨 Agent 协作`);
                        }
                    });
                    child.on("error", (err) => {
                        try {
                            fs.unlinkSync(tmpMsg);
                        }
                        catch { }
                        res.write(`data: ${JSON.stringify({ type: "error", text: err.message })}\n\n`);
                        res.end();
                    });
                    setTimeout(() => {
                        try {
                            child.kill();
                        }
                        catch { }
                        try {
                            fs.unlinkSync(tmpMsg);
                        }
                        catch { }
                        res.write(`data: ${JSON.stringify({ type: "error", text: "Agent 响应超时" })}\n\n`);
                        res.end();
                    }, 300000);
                    return;
                }
                // 非流式：普通调用
                console.log(`[群聊] 非流式调用 Agent ${target_project_actual}...`);
                const output = callAgent(target_project_actual, fullPrompt, workDir, agentType, 300000);
                console.log(`[群聊] Agent ${target_project_actual} 回复: ${output.substring(0, 200)}...`);
                appendGroupMessage(group_id, {
                    id: "m" + Date.now().toString(36) + "a",
                    role: "assistant", agent: target_project_actual,
                    content: output,
                    timestamp: new Date().toISOString(),
                });
                const atMentions = output.match(/@[\w-]+/g) || [];
                // 过滤掉不是群聊成员的 mentions
                const validMentions = atMentions.filter(m => {
                    const name = m.slice(1);
                    return group.members.some(member => member.project === name);
                });
                console.log(`[群聊] 检测到 @mentions: ${atMentions.join(", ")}`);
                console.log(`[群聊] 有效的 @mentions (群聊成员): ${validMentions.join(", ")}`);
                if (validMentions.length > 0) {
                    console.log(`[群聊] 触发跨 Agent 协作处理`);
                    sendJson(res, { success: true, reply: output, cross_pending: true });
                    setImmediate(() => processCrossAgents(group_id, group, target_project_actual, output, validMentions, configs));
                    return;
                }
                sendJson(res, { success: true, reply: output });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 500);
            }
        });
        return;
    }
    // 群发消息（发给群里所有 Agent）
    if (pathname === "/api/groups/broadcast" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { group_id, message } = JSON.parse(body);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return sendJson(res, { error: "群聊不存在" }, 400);
                // 记录用户消息
                appendGroupMessage(group_id, {
                    id: "m" + Date.now().toString(36),
                    role: "user", target: "all", content: message,
                    timestamp: new Date().toISOString(),
                });
                const replies = [];
                const configs = getConfigs();
                for (const member of group.members) {
                    const config = configs.find(c => c.name === member.project);
                    if (!config)
                        continue;
                    const info = getConfigInfo(config.path);
                    const workDir = info[0]?.workDir;
                    const agentType = info[0]?.agent || "claudecode";
                    const recentMsgs = getGroupMessages(group_id).slice(-10);
                    const context = recentMsgs.map(m => {
                        const who = m.role === "user" ? `[用户 → ${m.target}]` : `[${m.agent || "Agent"}]`;
                        return `${who} ${m.content}`;
                    }).join("\n");
                    // 获取群聊共享文件
                    let sharedFilesContext = "";
                    if (group.shared_files && group.shared_files.length > 0) {
                        // 判断是否是文本文件
                        const textExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.html', '.css', '.xml', '.yaml', '.yml', '.csv', '.log', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.sh', '.bat', '.toml', '.ini', '.conf', '.env'];
                        const isTextFile = (filename) => {
                            const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
                            return textExtensions.includes(ext);
                        };
                        const textFiles = group.shared_files.filter(f => isTextFile(f.name) && f.content);
                        const binaryFiles = group.shared_files.filter(f => !isTextFile(f.name));
                        if (textFiles.length > 0 || binaryFiles.length > 0) {
                            sharedFilesContext = "\n\n以下是群聊中的共享文件：";
                            if (textFiles.length > 0) {
                                sharedFilesContext += "\n\n[文本文件 - 可直接读取]\n" +
                                    textFiles.map(f => `\n--- ${f.name} ---\n${f.content}`).join("\n");
                            }
                            if (binaryFiles.length > 0) {
                                sharedFilesContext += "\n\n[二进制文件 - 仅列出文件名，无法直接读取内容]\n" +
                                    binaryFiles.map(f => `- ${f.name}`).join("\n");
                            }
                        }
                    }
                    // 获取群聊配置的工具
                    let toolsContext = "";
                    if (group.tools) {
                        const mcpTools = group.tools.mcp || [];
                        const skillTools = group.tools.skill || [];
                        if (mcpTools.length > 0 || skillTools.length > 0) {
                            toolsContext = "\n\n你当前可以使用的工具：";
                            if (mcpTools.length > 0) {
                                toolsContext += "\n- MCP 服务器：" + mcpTools.join(", ");
                            }
                            if (skillTools.length > 0) {
                                toolsContext += "\n- Skills：" + skillTools.join(", ");
                            }
                        }
                    }
                    const fullPrompt = `你是群聊中的 ${member.project} Agent。${toolsContext}${sharedFilesContext}\n群聊记录：\n${context}\n\n请回复：${message}`;
                    const output = callAgent(member.project, fullPrompt, workDir, agentType, 300000);
                    appendGroupMessage(group_id, {
                        id: "m" + Date.now().toString(36) + member.project,
                        role: "assistant", agent: member.project, content: output,
                        timestamp: new Date().toISOString(),
                    });
                    replies.push({ project: member.project, reply: output });
                }
                sendJson(res, { success: true, replies });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 500);
            }
        });
        return;
    }
    // === 多 Agent 协作 API ===
    // 智能任务分解
    if (pathname === "/api/groups/decompose" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { group_id, requirement } = JSON.parse(body);
                const groups = loadGroups();
                const group = groups.find(g => g.id === group_id);
                if (!group)
                    return sendJson(res, { error: "群聊不存在" }, 400);
                const configs = getConfigs();
                const members = group.members.filter(m => m.project !== "coordinator");
                const memberList = members.map(m => `${m.project}(${m.agent})`).join(", ");
                // 构建分解 prompt
                const decomposePrompt = `你是一个项目协调者，负责将开发需求拆分成具体的子任务。

群聊中的开发 Agent 有：${memberList}

请将以下需求拆分成具体的开发任务，返回 JSON 格式：
{
  "tasks": [
    {
      "title": "任务标题",
      "description": "任务描述",
      "target_project": "目标项目名",
      "priority": "high/normal/low",
      "estimated_time": "预估时间"
    }
  ]
}

需求：${requirement}

注意：
1. 每个任务要具体可执行
2. 根据项目职责分配任务（前端做UI、后端做接口等）
3. 联调任务分配给 coordinator
4. 只返回 JSON，不要其他内容`;
                // 调用协调者 Agent
                const firstMember = members[0];
                const firstConfig = firstMember ? configs.find(c => c.name === firstMember.project) : configs[0];
                const workDir = firstConfig ? getConfigInfo(firstConfig.path)[0]?.workDir : process.cwd();
                const output = callAgent("coordinator", decomposePrompt, workDir, "claudecode", 120000);
                // 解析 JSON 结果
                let tasks = [];
                try {
                    const jsonMatch = output.match(/\{[\s\S]*"tasks"[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        tasks = parsed.tasks || [];
                    }
                }
                catch (e) {
                    console.log("任务分解 JSON 解析失败:", e.message);
                }
                // 自动创建任务
                const createdTasks = tasks.map(t => createTask({
                    title: t.title,
                    description: t.description || "",
                    target_project: t.target_project || "coordinator",
                    priority: t.priority || "normal"
                }));
                // 记录到群聊消息
                appendGroupMessage(group_id, {
                    id: "m" + Date.now().toString(36) + "decompose",
                    role: "assistant",
                    agent: "coordinator",
                    content: `📋 需求分解完成，共 ${createdTasks.length} 个任务：\n${createdTasks.map((t, i) => `${i + 1}. [${t.target_project}] ${t.title}`).join("\n")}`,
                    timestamp: new Date().toISOString(),
                });
                sendJson(res, { success: true, tasks: createdTasks, raw_output: output });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 500);
            }
        });
        return;
    }
    // 自动任务分配和执行
    if (pathname === "/api/tasks/auto-assign" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { task_id, group_id } = JSON.parse(body);
                const tasks = loadTasks();
                const task = tasks.find(t => t.id === task_id);
                if (!task)
                    return sendJson(res, { error: "任务不存在" }, 404);
                const configs = getConfigs();
                const config = configs.find(c => c.name === task.target_project);
                if (!config)
                    return sendJson(res, { error: "项目配置不存在" }, 400);
                const info = getConfigInfo(config.path);
                const workDir = info[0]?.workDir;
                const agentType = info[0]?.agent || "claudecode";
                // 更新任务状态
                updateTask(task_id, { status: "in_progress" });
                // 构建执行 prompt
                const executePrompt = `你正在执行一个开发任务，请完成它。

任务标题：${task.title}
任务描述：${task.description || "无"}

请直接开始实现，完成后回复 "✅ 任务完成" 并简要说明实现内容。`;
                // 异步执行任务
                const taskResult = callAgent(task.target_project, executePrompt, workDir, agentType, 300000);
                // 检查是否完成
                const isCompleted = taskResult.includes("✅") || taskResult.includes("完成") || taskResult.includes("done");
                // 更新任务状态
                updateTask(task_id, {
                    status: isCompleted ? "done" : "in_progress",
                    result: taskResult.substring(0, 500)
                });
                // 如果有群聊，记录结果
                if (group_id) {
                    appendGroupMessage(group_id, {
                        id: "m" + Date.now().toString(36) + "task",
                        role: "assistant",
                        agent: task.target_project,
                        content: `📋 任务执行${isCompleted ? "完成" : "中"}：${task.title}\n${taskResult.substring(0, 300)}`,
                        timestamp: new Date().toISOString(),
                    });
                }
                sendJson(res, { success: true, task, completed: isCompleted, result: taskResult });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 500);
            }
        });
        return;
    }
    // 批量自动执行任务
    if (pathname === "/api/tasks/auto-execute-all" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { group_id } = JSON.parse(body);
                const tasks = loadTasks().filter(t => t.status === "pending");
                if (tasks.length === 0) {
                    return sendJson(res, { success: true, message: "没有待执行的任务" });
                }
                const results = [];
                for (const task of tasks) {
                    const configs = getConfigs();
                    const config = configs.find(c => c.name === task.target_project);
                    if (!config)
                        continue;
                    const info = getConfigInfo(config.path);
                    const workDir = info[0]?.workDir;
                    const agentType = info[0]?.agent || "claudecode";
                    updateTask(task.id, { status: "in_progress" });
                    const executePrompt = `开发任务：${task.title}\n${task.description || ""}\n\n请完成实现，完成后回复 "✅ 任务完成"。`;
                    try {
                        const result = callAgent(task.target_project, executePrompt, workDir, agentType, 300000);
                        const isCompleted = result.includes("✅") || result.includes("完成");
                        updateTask(task.id, {
                            status: isCompleted ? "done" : "in_progress",
                            result: result.substring(0, 500)
                        });
                        results.push({ task_id: task.id, title: task.title, completed: isCompleted });
                    }
                    catch (e) {
                        results.push({ task_id: task.id, title: task.title, completed: false, error: e.message });
                    }
                }
                sendJson(res, { success: true, results });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 500);
            }
        });
        return;
    }
    // 多 Agent 代码审查
    if (pathname === "/api/review" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { group_id, project, diff, reviewers } = JSON.parse(body);
                if (!diff)
                    return sendJson(res, { error: "请提供代码变更内容" }, 400);
                const configs = getConfigs();
                const reviewPrompt = `请审查以下代码变更，从你的专业角度给出意见：

项目：${project}
代码变更：
\`\`\`
${diff}
\`\`\`

请从以下角度审查：
1. 代码质量
2. 潜在 bug
3. 安全问题
4. 性能影响
5. 与你的项目的兼容性

返回 JSON 格式：
{
  "issues": [
    {
      "severity": "high/medium/low",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "overall": "总体评价"
}`;
                // 并行调用多个 Agent 审查
                const reviewResults = [];
                for (const reviewer of (reviewers || [])) {
                    const config = configs.find(c => c.name === reviewer);
                    if (!config)
                        continue;
                    const info = getConfigInfo(config.path);
                    const workDir = info[0]?.workDir;
                    const agentType = info[0]?.agent || "claudecode";
                    try {
                        const result = callAgent(reviewer, reviewPrompt, workDir, agentType, 120000);
                        reviewResults.push({ reviewer, result });
                    }
                    catch (e) {
                        reviewResults.push({ reviewer, error: e.message });
                    }
                }
                // 记录到群聊
                if (group_id) {
                    appendGroupMessage(group_id, {
                        id: "m" + Date.now().toString(36) + "review",
                        role: "assistant",
                        agent: "coordinator",
                        content: `🔍 代码审查完成：${project}\n${reviewResults.map(r => `【${r.reviewer}】${r.result?.substring(0, 200) || r.error}`).join("\n\n")}`,
                        timestamp: new Date().toISOString(),
                    });
                }
                sendJson(res, { success: true, reviews: reviewResults });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 500);
            }
        });
        return;
    }
    // === 代码变更查看器 API ===
    // 获取项目 Git 状态
    if (pathname === "/api/git/status" && req.method === "GET") {
        const project = parsed.query.project;
        if (!project)
            return sendJson(res, { error: "缺少项目参数" }, 400);
        const configs = getConfigs();
        const config = configs.find(c => c.name === project);
        if (!config)
            return sendJson(res, { error: "项目不存在" }, 404);
        const info = getConfigInfo(config.path);
        const workDir = info[0]?.workDir;
        if (!workDir)
            return sendJson(res, { error: "项目目录不存在" }, 400);
        try {
            // 检查是否是 git 仓库
            execSync("git rev-parse --is-inside-work-tree", { cwd: workDir, stdio: "pipe" });
            // 获取 git 状态
            const status = execSync("git status --porcelain", {
                encoding: "utf-8",
                cwd: workDir,
                stdio: ["pipe", "pipe", "pipe"]
            });
            const branch = execSync("git branch --show-current", {
                encoding: "utf-8",
                cwd: workDir,
                stdio: ["pipe", "pipe", "pipe"]
            }).trim();
            const files = status.split("\n")
                .filter(line => line.trim())
                .map(line => {
                const statusCode = line.substring(0, 2).trim();
                const filePath = line.substring(3).trim();
                let statusText = "";
                let statusColor = "";
                if (statusCode === "M" || statusCode === "MM") {
                    statusText = "已修改";
                    statusColor = "#facc15";
                }
                else if (statusCode === "A") {
                    statusText = "新增";
                    statusColor = "#22c55e";
                }
                else if (statusCode === "D") {
                    statusText = "已删除";
                    statusColor = "#ef4444";
                }
                else if (statusCode === "R") {
                    statusText = "重命名";
                    statusColor = "#a78bfa";
                }
                else if (statusCode === "??") {
                    statusText = "未跟踪";
                    statusColor = "#64748b";
                }
                else {
                    statusText = statusCode;
                    statusColor = "#94a3b8";
                }
                return { path: filePath, status: statusCode, statusText, statusColor };
            });
            sendJson(res, { success: true, branch, files, total: files.length });
        }
        catch (e) {
            sendJson(res, { success: false, error: "不是 Git 仓库或 Git 未安装: " + e.message });
        }
        return;
    }
    // 获取文件 diff
    if (pathname === "/api/git/diff" && req.method === "GET") {
        const project = parsed.query.project;
        const filePath = parsed.query.file;
        const staged = parsed.query.staged === "true";
        if (!project || !filePath)
            return sendJson(res, { error: "缺少参数" }, 400);
        const configs = getConfigs();
        const config = configs.find(c => c.name === project);
        if (!config)
            return sendJson(res, { error: "项目不存在" }, 404);
        const info = getConfigInfo(config.path);
        const workDir = info[0]?.workDir;
        try {
            const stagedFlag = staged ? "--staged" : "";
            const diff = execSync(`git diff ${stagedFlag} "${filePath}"`, {
                encoding: "utf-8",
                cwd: workDir,
                stdio: ["pipe", "pipe", "pipe"],
                maxBuffer: 10 * 1024 * 1024
            });
            // 解析 diff 为结构化数据
            const lines = diff.split("\n");
            const hunks = [];
            let currentHunk = null;
            for (const line of lines) {
                if (line.startsWith("@@")) {
                    if (currentHunk)
                        hunks.push(currentHunk);
                    const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)/);
                    currentHunk = {
                        header: line,
                        oldStart: parseInt(match[1]),
                        oldLines: parseInt(match[2] || 1),
                        newStart: parseInt(match[3]),
                        newLines: parseInt(match[4] || 1),
                        context: match[5]?.trim() || "",
                        changes: []
                    };
                }
                else if (currentHunk) {
                    if (line.startsWith("+")) {
                        currentHunk.changes.push({ type: "add", content: line.substring(1) });
                    }
                    else if (line.startsWith("-")) {
                        currentHunk.changes.push({ type: "remove", content: line.substring(1) });
                    }
                    else {
                        currentHunk.changes.push({ type: "context", content: line.substring(1) });
                    }
                }
            }
            if (currentHunk)
                hunks.push(currentHunk);
            sendJson(res, { success: true, file: filePath, hunks, raw: diff });
        }
        catch (e) {
            sendJson(res, { success: false, error: "获取 diff 失败: " + e.message });
        }
        return;
    }
    // 提交更改
    if (pathname === "/api/git/commit" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, message, files } = JSON.parse(body);
                if (!project || !message)
                    return sendJson(res, { error: "缺少参数" }, 400);
                const configs = getConfigs();
                const config = configs.find(c => c.name === project);
                if (!config)
                    return sendJson(res, { error: "项目不存在" }, 404);
                const info = getConfigInfo(config.path);
                const workDir = info[0]?.workDir;
                // 添加文件到暂存区
                if (files && files.length > 0) {
                    for (const file of files) {
                        execSync(`git add "${file}"`, { cwd: workDir, stdio: "pipe" });
                    }
                }
                else {
                    execSync("git add -A", { cwd: workDir, stdio: "pipe" });
                }
                // 提交
                const commitMsg = message.replace(/"/g, '\\"');
                execSync(`git commit -m "${commitMsg}"`, {
                    encoding: "utf-8",
                    cwd: workDir,
                    stdio: ["pipe", "pipe", "pipe"]
                });
                sendJson(res, { success: true, message: "提交成功" });
            }
            catch (e) {
                sendJson(res, { success: false, error: "提交失败: " + e.message });
            }
        });
        return;
    }
    // 回滚更改
    if (pathname === "/api/git/rollback" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, file, staged } = JSON.parse(body);
                if (!project || !file)
                    return sendJson(res, { error: "缺少参数" }, 400);
                const configs = getConfigs();
                const config = configs.find(c => c.name === project);
                if (!config)
                    return sendJson(res, { error: "项目不存在" }, 404);
                const info = getConfigInfo(config.path);
                const workDir = info[0]?.workDir;
                if (staged) {
                    // 取消暂存
                    execSync(`git restore --staged "${file}"`, { cwd: workDir, stdio: "pipe" });
                }
                else {
                    // 回滚工作区更改
                    execSync(`git restore "${file}"`, { cwd: workDir, stdio: "pipe" });
                }
                sendJson(res, { success: true, message: "回滚成功" });
            }
            catch (e) {
                sendJson(res, { success: false, error: "回滚失败: " + e.message });
            }
        });
        return;
    }
    // 获取提交历史
    if (pathname === "/api/git/log" && req.method === "GET") {
        const project = parsed.query.project;
        const limit = parseInt(parsed.query.limit) || 20;
        if (!project)
            return sendJson(res, { error: "缺少项目参数" }, 400);
        const configs = getConfigs();
        const config = configs.find(c => c.name === project);
        if (!config)
            return sendJson(res, { error: "项目不存在" }, 404);
        const info = getConfigInfo(config.path);
        const workDir = info[0]?.workDir;
        try {
            const log = execSync(`git log --pretty=format:"%H|%h|%an|%ae|%at|%s" -n ${limit}`, { encoding: "utf-8", cwd: workDir, stdio: ["pipe", "pipe", "pipe"] });
            const commits = log.split("\n")
                .filter(line => line.trim())
                .map(line => {
                const [hash, shortHash, author, email, timestamp, message] = line.split("|");
                return {
                    hash,
                    shortHash,
                    author,
                    email,
                    timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
                    message
                };
            });
            sendJson(res, { success: true, commits });
        }
        catch (e) {
            sendJson(res, { success: false, error: "获取提交历史失败: " + e.message });
        }
        return;
    }
    // 协作统计 API
    if (pathname === "/api/collaboration/stats" && req.method === "GET") {
        const tasks = loadTasks();
        const groups = loadGroups();
        const stats = {
            total_tasks: tasks.length,
            pending_tasks: tasks.filter(t => t.status === "pending").length,
            in_progress_tasks: tasks.filter(t => t.status === "in_progress").length,
            done_tasks: tasks.filter(t => t.status === "done").length,
            completion_rate: tasks.length > 0 ? Math.round(tasks.filter(t => t.status === "done").length / tasks.length * 100) : 0,
            groups_count: groups.length,
            recent_activities: []
        };
        // 获取最近活动
        for (const group of groups.slice(0, 3)) {
            const messages = getGroupMessages(group.id).slice(-5);
            for (const msg of messages) {
                stats.recent_activities.push({
                    group: group.name,
                    agent: msg.agent || "user",
                    content: msg.content?.substring(0, 100),
                    timestamp: msg.timestamp
                });
            }
        }
        stats.recent_activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        stats.recent_activities = stats.recent_activities.slice(0, 10);
        return sendJson(res, stats);
    }
    // 测试 @mention 检测
    if (pathname === "/api/test/mentions" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { text, group_id } = JSON.parse(body);
                // 检测 @mentions
                const atMentions = text.match(/@[\w-]+/g) || [];
                // 如果提供了 group_id，过滤出有效的 mentions
                let validMentions = atMentions;
                if (group_id) {
                    const groups = loadGroups();
                    const group = groups.find(g => g.id === group_id);
                    if (group) {
                        validMentions = atMentions.filter(m => {
                            const name = m.slice(1);
                            return group.members.some(member => member.project === name);
                        });
                    }
                }
                sendJson(res, {
                    success: true,
                    input: text,
                    all_mentions: atMentions,
                    valid_mentions: validMentions,
                    extracted_messages: validMentions.map(m => {
                        const name = m.slice(1);
                        const regex = new RegExp(`@${name}\\s+([^@]+?)(?=\\s*@|$)`, "is");
                        const match = text.match(regex);
                        return {
                            mention: m,
                            target: name,
                            message: match ? match[1].trim() : text.substring(0, 200)
                        };
                    })
                });
            }
            catch (e) {
                sendJson(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 404
    sendJson(res, { error: "Not Found" }, 404);
}
// 启动服务器
function startServer(port) {
    const server = http.createServer(handleRequest);
    server.listen(port, () => {
        console.log(`\n╔══════════════════════════════════════╗`);
        console.log(`║     ccm Web 控制台                    ║`);
        console.log(`╚══════════════════════════════════════╝\n`);
        console.log(`  地址: http://localhost:${port}`);
        console.log(`  按 Ctrl+C 停止\n`);
    });
    return server;
}
// 直接运行或被 require
if (require.main === module) {
    const PORT = parseInt(process.argv[2]) || 3080;
    startServer(PORT);
}
module.exports = { startServer };
//# sourceMappingURL=server.js.map