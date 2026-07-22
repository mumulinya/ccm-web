#!/usr/bin/env node
// cc-web - cc-connect Web 管理界面
// 用法: cc-web              启动 Web 控制台
//       cc-web start        启动 Web 服务器
//       cc-web start all    启动所有项目
//       cc-web stop all     停止所有项目
//       cc-web status       查看运行状态

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const os = require("os");

const CCM_DIR = path.join(os.homedir(), ".cc-connect");
const CONFIGS_DIR = path.join(CCM_DIR, "configs");
const PID_DIR = path.join(CCM_DIR, "pids");
const LOG_DIR = path.join(CCM_DIR, "logs");
const TEMP_DIR = path.join(CCM_DIR, "temp");
const PROJECTS_FILE = path.join(CCM_DIR, "projects.txt");

function resolveCcConnectLauncher() {
  if (process.platform === "win32") {
    for (const entry of String(process.env.PATH || "").split(path.delimiter)) {
      const base = entry.replace(/^"|"$/g, "").trim();
      if (!base) continue;
      const executable = path.join(base, "node_modules", "cc-connect", "bin", "cc-connect.exe");
      if (fs.existsSync(executable)) return { command: executable, shell: false };
    }
    return { command: "cc-connect", shell: true };
  }
  return { command: "cc-connect", shell: false };
}

// 支持的 Agent 列表
const AGENTS = [
  { type: "claudecode", name: "Claude Code", modes: ["default", "acceptEdits", "plan", "auto", "bypassPermissions"], defaultMode: "default" },
  { type: "cursor", name: "Cursor", modes: ["default", "force", "plan", "ask"], defaultMode: "default" },
  { type: "gemini", name: "Gemini CLI", modes: ["default", "auto_edit", "yolo", "plan"], defaultMode: "yolo" },
  { type: "codex", name: "Codex", modes: ["suggest", "auto-edit", "full-auto", "yolo"], defaultMode: "full-auto" },
  { type: "opencode", name: "OpenCode", modes: ["default", "auto", "plan"], defaultMode: "default" },
  { type: "qoder", name: "Qoder CLI", modes: ["default", "yolo"], defaultMode: "default" },
];

// 支持的平台列表
const PLATFORMS = [
  { type: "feishu", name: "飞书", hasQrSetup: true, fields: ["app_id", "app_secret"] },
  { type: "lark", name: "Lark (国际版飞书)", hasQrSetup: true, fields: ["app_id", "app_secret"] },
  { type: "weixin", name: "微信", hasQrSetup: false, fields: ["token", "base_url", "account_id"] },
  { type: "telegram", name: "Telegram", hasQrSetup: false, fields: ["token"] },
  { type: "slack", name: "Slack", hasQrSetup: false, fields: ["bot_token", "app_token"] },
  { type: "discord", name: "Discord", hasQrSetup: false, fields: ["token"] },
  { type: "dingtalk", name: "钉钉", hasQrSetup: false, fields: ["token"] },
];

function ensureDirs() {
  [CCM_DIR, CONFIGS_DIR, PID_DIR, LOG_DIR, TEMP_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function getConfigs() {
  if (!fs.existsSync(CONFIGS_DIR)) return [];
  return fs
    .readdirSync(CONFIGS_DIR)
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
      if (currentProject && currentProject.name) projects.push(currentProject);
      currentProject = {};
      inPlatformsBlock = false;
    }
    if (currentProject && trimmed.startsWith("name = "))
      currentProject.name = trimmed.split("=")[1].trim().replace(/"/g, "");
    if (currentProject && trimmed.startsWith("work_dir = "))
      currentProject.workDir = trimmed.split("=")[1].trim().replace(/"/g, "");
    if (trimmed === "[[projects.platforms]]") {
      inPlatformsBlock = true;
    } else if (trimmed.startsWith("[") && !trimmed.startsWith("[projects.platforms")) {
      inPlatformsBlock = false;
    }
    if (currentProject && inPlatformsBlock && trimmed.startsWith("type = ")) {
      const pt = trimmed.split("=")[1].trim().replace(/"/g, "");
      const map = { weixin: "微信", feishu: "飞书", telegram: "Telegram", slack: "Slack", discord: "Discord" };
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

// 获取当前配置中的 agent type
function getCurrentAgent(configPath) {
  const content = fs.readFileSync(configPath, "utf-8");
  const match = content.match(/\[projects\.agent\][\s\S]*?type\s*=\s*"([^"]+)"/);
  return match ? match[1] : "claudecode";
}

// 生成临时配置，替换 agent type
function generateTempConfig(configPath, newAgentType) {
  let content = fs.readFileSync(configPath, "utf-8");

  // 找到 agent 定义，替换 type
  content = content.replace(
    /(\[projects\.agent\]\s*\n\s*type\s*=\s*)"[^"]+"/g,
    `$1"${newAgentType}"`
  );

  // 移除 [projects.agent.options] 下的 mode 行（不同 agent 的 mode 值不同）
  // 保留其他 options
  const agentInfo = AGENTS.find(a => a.type === newAgentType);
  if (agentInfo) {
    content = content.replace(
      /(\[projects\.agent\.options\][\s\S]*?mode\s*=\s*)"[^"]+"/g,
      `$1"${agentInfo.defaultMode}"`
    );
  }

  // 写入临时文件
  const baseName = path.basename(configPath, ".toml");
  const tempPath = path.join(TEMP_DIR, `${baseName}-${newAgentType}.toml`);
  fs.writeFileSync(tempPath, content);
  return tempPath;
}

function getRunningStatus() {
  const status = {};
  if (!fs.existsSync(PID_DIR)) return status;
  for (const f of fs.readdirSync(PID_DIR)) {
    if (!f.endsWith(".pid")) continue;
    const name = f.replace(".pid", "");
    const pidFile = path.join(PID_DIR, f);
    const pid = fs.readFileSync(pidFile, "utf-8").trim();
    try {
      process.kill(parseInt(pid), 0);
      status[name] = { running: true, pid };
    } catch {
      try { fs.unlinkSync(pidFile); } catch {}
    }
  }
  return status;
}

function isRunning(name) {
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

function startProject(config, agentType) {
  const displayName = agentType ? `${config.name} (${agentType})` : config.name;

  if (isRunning(config.name)) {
    console.log(`  ⚠ ${config.name} 已在运行中，先停止再切换 Agent`);
    return;
  }

  let configPath = config.path;

  // 如果指定了不同的 agent，生成临时配置
  if (agentType) {
    const currentAgent = getCurrentAgent(config.path);
    if (currentAgent !== agentType) {
      configPath = generateTempConfig(config.path, agentType);
      console.log(`  → 切换 Agent: ${currentAgent} → ${agentType}`);
    }
  }

  const logFile = path.join(LOG_DIR, `${config.name}.log`);
  const logStream = fs.openSync(logFile, "w");

  const launcher = resolveCcConnectLauncher();
  const child = spawn(launcher.command, ["--config", configPath, "--force"], {
    stdio: ["ignore", logStream, logStream],
    shell: launcher.shell,
    detached: true,
    windowsHide: true,
  });

  child.unref();
  fs.writeFileSync(path.join(PID_DIR, `${config.name}.pid`), String(child.pid));

  setTimeout(() => {
    if (isRunning(config.name)) {
      const projects = getConfigInfo(configPath);
      const platform = projects.map((p) => p.platform).join(", ");
      const agent = agentType || getCurrentAgent(config.path);
      console.log(`  ✓ ${config.name} 已启动 (PID: ${child.pid}, Agent: ${agent}, 平台: ${platform})`);
    } else {
      console.log(`  ✗ ${displayName} 启动失败，查看日志: ${logFile}`);
    }
  }, 2000);
}

function stopProject(name) {
  const pidFile = path.join(PID_DIR, `${name}.pid`);
  if (!fs.existsSync(pidFile)) {
    console.log(`  ⚠ ${name} 未在运行`);
    return;
  }
  const pid = fs.readFileSync(pidFile, "utf-8").trim();
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /T /F /PID ${pid}`, { stdio: "ignore" });
    } else {
      process.kill(parseInt(pid), "SIGTERM");
    }
    console.log(`  ✓ ${name} 已停止`);
  } catch {
    console.log(`  ⚠ ${name} 进程已不存在`);
  }
  try { fs.unlinkSync(pidFile); } catch {}
}

function showStatus() {
  const configs = getConfigs();
  const running = getRunningStatus();

  console.log("\n项目状态:\n");
  for (const config of configs) {
    const projects = getConfigInfo(config.path);
    const platform = projects.map((p) => p.platform).join(", ");
    const dir = [...new Set(projects.map((p) => p.workDir))].join(", ");
    const agent = getCurrentAgent(config.path);
    const isUp = running[config.name];
    const icon = isUp ? "🟢" : "⚪";
    const pidInfo = isUp ? ` (PID: ${isUp.pid})` : "";
    console.log(`  ${icon} [${config.index}] ${config.name.padEnd(20)} Agent: ${agent.padEnd(12)} ${platform.padEnd(6)}${pidInfo}`);
    console.log(`     ${dir}`);
  }
  const runningCount = Object.keys(running).length;
  console.log(`\n运行中: ${runningCount}/${configs.length}`);
}

// Agent 选择菜单
function selectAgent(config, callback) {
  const currentAgent = getCurrentAgent(config.path);

  console.log(`\n选择 Agent (当前: ${currentAgent}):\n`);
  AGENTS.forEach((agent, i) => {
    const isCurrent = agent.type === currentAgent;
    const mark = isCurrent ? " ← 当前" : "";
    console.log(`  [${i + 1}] ${agent.name.padEnd(15)} (${agent.type})${mark}`);
  });
  console.log(`  [0] 使用当前 Agent\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question("选择 Agent 编号: ", (answer) => {
    const idx = parseInt(answer);
    rl.close();

    if (idx === 0 || isNaN(idx)) {
      callback(null); // 使用当前
    } else if (idx >= 1 && idx <= AGENTS.length) {
      callback(AGENTS[idx - 1].type);
    } else {
      console.log("无效选择，使用当前 Agent");
      callback(null);
    }
  });
}

function generateConfig(name, workDir, selectedAgent, selectedPlatform, platformOptions) {
  // 构建平台选项
  const optionsLines = Object.entries(platformOptions)
    .map(([k, v]) => `${k} = "${v}"`)
    .join("\n");

  // 飞书/Lark 特有选项
  const extraOptions = (selectedPlatform.type === "feishu" || selectedPlatform.type === "lark")
    ? "\nenable_feishu_card = true\nthread_isolation = true\nprogress_style = \"card\""
    : "";

  return `# cc-connect - ${name}
language = "zh"

[[projects]]
name = "${name}"
work_dir = "${workDir.replace(/\\/g, "\\\\")}"
admin_from = "*"

[projects.agent]
type = "${selectedAgent.type}"
mode = "${selectedAgent.defaultMode}"

[projects.agent.options]
work_dir = "${workDir.replace(/\\/g, "\\\\")}"

[[projects.platforms]]
type = "${selectedPlatform.type}"

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
}

function finalizeConfig(name, workDir) {
  let projectsContent = "";
  if (fs.existsSync(PROJECTS_FILE)) {
    projectsContent = fs.readFileSync(PROJECTS_FILE, "utf-8");
  }
  const lineNum = projectsContent.split("\n").filter((l) => l.trim()).length + 1;
  projectsContent += `\n${lineNum}. ${name} → ${workDir}`;
  fs.writeFileSync(PROJECTS_FILE, projectsContent.trim() + "\n");
}

function setupFeishuQrCode(name, configPath) {
  console.log("\n正在启动飞书扫码配置...\n");
  try {
    execSync(`cc-connect feishu setup --project "${name}" --config "${configPath}"`, {
      stdio: "inherit",
      timeout: 600000,
    });
    console.log("\n✓ 飞书机器人配置完成");
    return true;
  } catch (err) {
    console.log("\n✗ 扫码配置失败或已取消");
    return false;
  }
}

function promptPlatformConfig(rl, selectedPlatform, callback) {
  // 飞书/Lark 支持扫码
  if (selectedPlatform.hasQrSetup) {
    console.log(`\n${selectedPlatform.name}机器人配置方式:\n`);
    console.log("  [1] 扫码创建新机器人（推荐）");
    console.log("  [2] 绑定已有机器人（手动输入凭证）");

    rl.question("\n选择 (默认 1): ", (choice) => {
      if (choice === "2") {
        promptPlatformFields(rl, selectedPlatform, callback);
      } else {
        callback({ qrSetup: true });
      }
    });
  } else {
    // 其他平台直接输入凭证
    console.log(`\n请输入 ${selectedPlatform.name} 凭证:\n`);
    promptPlatformFields(rl, selectedPlatform, callback);
  }
}

function promptPlatformFields(rl, selectedPlatform, callback) {
  const fields = selectedPlatform.fields;
  const options = {};
  let i = 0;

  const fieldLabels = {
    app_id: "App ID",
    app_secret: "App Secret",
    token: "Bot Token",
    base_url: "Base URL",
    account_id: "Account ID",
    bot_token: "Bot Token",
    app_token: "App Token",
  };

  function askNext() {
    if (i >= fields.length) {
      callback(options);
      return;
    }
    const field = fields[i];
    const label = fieldLabels[field] || field;
    rl.question(`${label}: `, (value) => {
      options[field] = value;
      i++;
      askNext();
    });
  }
  askNext();
}

function initProject() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║     新建项目配置                      ║");
  console.log("╚══════════════════════════════════════╝\n");

  // 选择 Agent
  console.log("① 选择 Agent:\n");
  AGENTS.forEach((agent, i) => {
    const mark = agent.type === "claudecode" ? " ← 默认" : "";
    console.log(`  [${i + 1}] ${agent.name.padEnd(15)} (${agent.type})${mark}`);
  });

  rl.question("\nAgent 编号 (默认 1): ", (agentAnswer) => {
    const agentIdx = parseInt(agentAnswer) || 1;
    const selectedAgent = AGENTS[agentIdx - 1] || AGENTS[0];

    // 选择平台
    console.log("\n② 选择平台:\n");
    PLATFORMS.forEach((platform, i) => {
      const mark = platform.type === "feishu" ? " ← 默认" : "";
      const qrTag = platform.hasQrSetup ? " [支持扫码]" : "";
      console.log(`  [${i + 1}] ${platform.name.padEnd(18)} (${platform.type})${qrTag}${mark}`);
    });

    rl.question("\n平台编号 (默认 1): ", (platformAnswer) => {
      const platformIdx = parseInt(platformAnswer) || 1;
      const selectedPlatform = PLATFORMS[platformIdx - 1] || PLATFORMS[0];

      rl.question("\n③ 项目名称 (英文，如 my-app): ", (name) => {
        rl.question("④ 代码目录路径 (如 D:\\projects\\my-app): ", (workDir) => {

          promptPlatformConfig(rl, selectedPlatform, (platformOptions) => {
            if (platformOptions.qrSetup) {
              // 扫码方式
              rl.close();
              const placeholderOptions = {};
              selectedPlatform.fields.forEach(f => placeholderOptions[f] = `PLACEHOLDER_${f.toUpperCase()}`);
              const template = generateConfig(name, workDir, selectedAgent, selectedPlatform, placeholderOptions);
              const configPath = path.join(CONFIGS_DIR, `config-${name}.toml`);
              fs.writeFileSync(configPath, template);

              const success = setupFeishuQrCode(name, configPath);
              if (success) {
                finalizeConfig(name, workDir);
                console.log(`\n✓ 项目配置完成`);
                console.log(`  Agent: ${selectedAgent.name}`);
                console.log(`  平台: ${selectedPlatform.name}`);
                console.log(`  启动: ccm start ${name}`);
              } else {
                try { fs.unlinkSync(configPath); } catch {}
                console.log("\n配置已取消");
              }
            } else {
              // 手动输入凭证
              const template = generateConfig(name, workDir, selectedAgent, selectedPlatform, platformOptions);
              const configPath = path.join(CONFIGS_DIR, `config-${name}.toml`);
              fs.writeFileSync(configPath, template);
              finalizeConfig(name, workDir);

              console.log(`\n✓ 配置已创建: ${configPath}`);
              console.log(`  Agent: ${selectedAgent.name}`);
              console.log(`  平台: ${selectedPlatform.name}`);
              console.log(`  启动: ccm start ${name}`);
              rl.close();
            }
          });
        });
      });
    });
  });
}

function interactive() {
  const configs = getConfigs();
  const running = getRunningStatus();

  if (configs.length === 0) {
    console.log("\n还没有项目配置，运行 ccm --init 创建第一个项目\n");
    return;
  }

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║     cc-connect 项目管理器            ║");
  console.log("╚══════════════════════════════════════╝\n");

  for (const config of configs) {
    const projects = getConfigInfo(config.path);
    const platform = projects.map((p) => p.platform).join(", ");
    const agent = getCurrentAgent(config.path);
    const isUp = running[config.name];
    const icon = isUp ? "🟢" : "⚪";
    console.log(`  ${icon} [${config.index}] ${config.name.padEnd(20)} ${agent.padEnd(12)} ${platform}`);
  }

  console.log(`\n  操作:`);
  console.log(`    输入编号 → 启动该项目（可选 Agent）`);
  console.log(`    stop 编号 → 停止该项目`);
  console.log(`    all → 启动所有项目`);
  console.log(`    stop all → 停止所有项目`);
  console.log(`    status → 查看状态`);
  console.log(`    agents → 查看支持的 Agent 列表`);
  console.log(`    init → 新建项目`);
  console.log(`    0 → 退出\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  function prompt() {
    rl.question("ccm> ", (answer) => {
      const input = answer.trim().toLowerCase();

      if (input === "0" || input === "exit" || input === "quit") {
        rl.close();
        return;
      }

      if (input === "status") {
        showStatus();
        prompt();
        return;
      }

      if (input === "agents") {
        console.log("\n支持的 Agent:\n");
        AGENTS.forEach((a, i) => {
          console.log(`  [${i + 1}] ${a.name.padEnd(15)} ${a.type.padEnd(14)} 模式: ${a.modes.join(", ")}`);
        });
        console.log();
        prompt();
        return;
      }

      if (input === "init") {
        rl.close();
        initProject();
        return;
      }

      if (input === "all") {
        console.log("\n启动所有项目...\n");
        for (const config of configs) startProject(config);
        setTimeout(prompt, 2500);
        return;
      }

      if (input === "stop all") {
        console.log("\n停止所有项目...\n");
        for (const config of configs) stopProject(config.name);
        prompt();
        return;
      }

      if (input.startsWith("stop ")) {
        const target = input.replace("stop ", "").trim();
        const idx = parseInt(target);
        const config = configs.find((c) => c.index === idx);
        if (config) {
          stopProject(config.name);
        } else {
          console.log("无效编号");
        }
        prompt();
        return;
      }

      // 启动项目
      const idx = parseInt(input);
      if (!isNaN(idx) && idx > 0) {
        const config = configs.find((c) => c.index === idx);
        if (config) {
          // 弹出 Agent 选择
          rl.close();
          selectAgent(config, (agentType) => {
            console.log();
            startProject(config, agentType);
            // 重新创建 rl 继续交互
            setTimeout(() => interactive(), 2500);
          });
        } else {
          console.log("无效编号");
          prompt();
        }
        return;
      }

      console.log("无效输入");
      prompt();
    });
  }

  prompt();
}

// 主入口
ensureDirs();
const args = process.argv.slice(2);

if (args[0] === "interactive") {
  interactive();
} else if (args.includes("--list") || args.includes("-l")) {
  const configs = getConfigs();
  const running = getRunningStatus();
  console.log("\n可用配置:\n");
  for (const config of configs) {
    const projects = getConfigInfo(config.path);
    const platform = projects.map((p) => p.platform).join(", ");
    const dir = [...new Set(projects.map((p) => p.workDir))].join(", ");
    const agent = getCurrentAgent(config.path);
    const icon = running[config.name] ? "🟢" : "⚪";
    console.log(`  ${icon} ${config.name}`);
    console.log(`     Agent: ${agent}`);
    console.log(`     平台: ${platform}`);
    console.log(`     目录: ${dir}\n`);
  }
} else if (args.includes("--init")) {
  initProject();
} else if (args[0] === "status") {
  showStatus();
} else if (args[0] === "agents") {
  console.log("\n支持的 Agent:\n");
  AGENTS.forEach((a, i) => {
    console.log(`  [${i + 1}] ${a.name.padEnd(15)} ${a.type.padEnd(14)} 模式: ${a.modes.join(", ")}`);
  });
  console.log();
} else if (args[0] === "pet") {
  const petDir = path.join(__dirname, "..", "pet");
  const petPidFile = path.join(CCM_DIR, "pids", "pet.pid");
  const ccmPort = args.includes("--port") ? parseInt(args[args.indexOf("--port") + 1]) : 3080;
  if (args[1] === "stop") {
    if (!fs.existsSync(petPidFile)) { console.log("桌面宠物未在运行"); process.exit(0); }
    const pid = fs.readFileSync(petPidFile, "utf-8").trim();
    try {
      if (process.platform === "win32") execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      else process.kill(parseInt(pid), "SIGTERM");
    } catch {}
    try { fs.unlinkSync(petPidFile); } catch {}
    console.log("桌面宠物已关闭");
  } else {
    if (fs.existsSync(petPidFile)) {
      const pid = fs.readFileSync(petPidFile, "utf-8").trim();
      try { process.kill(parseInt(pid), 0); console.log("桌面宠物已在运行"); process.exit(0); } catch {}
    }
    if (!fs.existsSync(path.join(petDir, "main.js"))) {
      console.log("宠物应用未安装，请先运行: cd pet && npm install");
      process.exit(1);
    }
    const petExe = path.join(petDir, "node_modules", "electron", "dist", "electron.exe");
    const mainExe = path.join(__dirname, "..", "node_modules", "electron", "dist", "electron.exe");
    const petBin = path.join(petDir, "node_modules", ".bin", "electron");
    const mainBin = path.join(__dirname, "..", "node_modules", ".bin", "electron");
    const electronBin = fs.existsSync(petExe) ? petExe : fs.existsSync(mainExe) ? mainExe : fs.existsSync(petBin) ? petBin : fs.existsSync(mainBin) ? mainBin : null;
    const cmd = electronBin || "npx";
    const args2 = electronBin ? [petDir] : ["electron", petDir];
    const child = spawn(cmd, args2, {
      detached: true,
      stdio: "ignore",
      shell: !electronBin,
      windowsHide: true,
      env: { ...process.env, CCM_PORT: String(ccmPort) }
    });
    child.unref();
    if (!fs.existsSync(path.dirname(petPidFile))) fs.mkdirSync(path.dirname(petPidFile), { recursive: true });
    fs.writeFileSync(petPidFile, String(child.pid));
    console.log("桌面宠物已启动！");
  }
} else if (args[0] === "web") {
  const port = args.includes("--port") ? parseInt(args[args.indexOf("--port") + 1]) : 3080;
  const { startServer } = require("../dist/server.js");
  startServer(port);
} else if (args[0] === "start" && (!args[1] || args[1].startsWith("-"))) {
  // ccm start → 启动 Web 控制台（前端 + 后端，前端由 server.js 从 public/ 目录直接 serve）
  const port = args.includes("--port") ? parseInt(args[args.indexOf("--port") + 1]) : 3080;

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║     cc-web 控制台                     ║");
  console.log("╚══════════════════════════════════════╝\n");
  console.log(`访问: http://localhost:${port}\n`);

  const { startServer } = require("../dist/server.js");
  startServer(port);
} else if (args[0] === "start" && args[1] && !args[1].startsWith("-")) {
  const configs = getConfigs();
  if (args[1] === "all") {
    console.log("\n启动所有项目...\n");
    for (const config of configs) startProject(config, args[2]);
  } else {
    const idx = parseInt(args[1]);
    const config = configs.find((c) => c.index === idx || c.name === args[1]);
    if (config) startProject(config, args[2]);
    else console.log("项目不存在");
  }
} else if (args[0] === "stop" && args[1]) {
  const configs = getConfigs();
  if (args[1] === "all") {
    console.log("\n停止所有项目...\n");
    for (const config of configs) stopProject(config.name);
    try {
      if (process.platform === "win32") {
        execSync("taskkill /F /IM cc-connect.exe", { stdio: "ignore" });
      }
    } catch {}
  } else {
    const idx = parseInt(args[1]);
    const config = configs.find((c) => c.index === idx || c.name === args[1]);
    if (config) stopProject(config.name);
    else console.log("项目不存在");
  }
} else if (args.length > 0 && !args[0].startsWith("-")) {
  const configs = getConfigs();
  const config = configs.find((c) => c.name === args[0]);
  if (config) startProject(config, args[1]);
  else console.log(`项目 "${args[0]}" 不存在，用 cc-web --list 查看`);
} else {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║     cc-web - cc-connect 管理工具      ║");
  console.log("╚══════════════════════════════════════╝\n");
  console.log("用法:");
  console.log("  ccm start              启动 Web 控制台（前端 + 后端）");
  console.log("  ccm start <项目名>      启动指定项目");
  console.log("  ccm start all           启动所有项目");
  console.log("  ccm stop  <项目名>      停止指定项目");
  console.log("  ccm stop  all           停止所有项目");
  console.log("  ccm web                 仅启动后端 API 服务");
  console.log("  ccm pet                 启动桌面宠物");
  console.log("  ccm pet stop            关闭桌面宠物");
  console.log("  ccm status              查看运行状态");
  console.log("  ccm --list              列出所有配置");
  console.log("  ccm --init              初始化新项目");
  console.log("  ccm agents              查看支持的 Agent\n");
}
