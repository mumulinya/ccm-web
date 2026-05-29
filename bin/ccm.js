#!/usr/bin/env node
// ccm - cc-connect 多项目管理器
// 用法: ccm                  交互式选择
//       ccm start all        启动所有项目
//       ccm start 1          启动指定项目
//       ccm stop all         停止所有项目
//       ccm stop 1           停止指定项目
//       ccm status           查看运行状态
//       ccm --list           列出所有配置
//       ccm --init           初始化配置目录

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const os = require("os");

const CCM_DIR = path.join(os.homedir(), ".cc-connect");
const CONFIGS_DIR = path.join(CCM_DIR, "configs");
const PID_DIR = path.join(CCM_DIR, "pids");
const LOG_DIR = path.join(CCM_DIR, "logs");
const PROJECTS_FILE = path.join(CCM_DIR, "projects.txt");

function ensureDirs() {
  [CCM_DIR, CONFIGS_DIR, PID_DIR, LOG_DIR].forEach((dir) => {
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

function startProject(config) {
  if (isRunning(config.name)) {
    console.log(`  ⚠ ${config.name} 已在运行中`);
    return;
  }

  const logFile = path.join(LOG_DIR, `${config.name}.log`);
  const logStream = fs.openSync(logFile, "w");

  const child = spawn("cc-connect", ["--config", config.path, "--force"], {
    stdio: ["ignore", logStream, logStream],
    shell: true,
    detached: true,
  });

  child.unref();
  fs.writeFileSync(path.join(PID_DIR, `${config.name}.pid`), String(child.pid));

  setTimeout(() => {
    if (isRunning(config.name)) {
      const projects = getConfigInfo(config.path);
      const platform = projects.map((p) => p.platform).join(", ");
      console.log(`  ✓ ${config.name} 已启动 (PID: ${child.pid}, 平台: ${platform})`);
    } else {
      console.log(`  ✗ ${config.name} 启动失败，查看日志: ${logFile}`);
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
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
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
    const isUp = running[config.name];
    const icon = isUp ? "🟢" : "⚪";
    const pidInfo = isUp ? ` (PID: ${isUp.pid})` : "";
    console.log(`  ${icon} [${config.index}] ${config.name.padEnd(25)} ${platform.padEnd(8)}${pidInfo}`);
    console.log(`     ${dir}`);
  }
  const runningCount = Object.keys(running).length;
  console.log(`\n运行中: ${runningCount}/${configs.length}`);
}

function initProject() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║     新建项目配置                      ║");
  console.log("╚══════════════════════════════════════╝\n");

  rl.question("项目名称 (英文，如 my-app): ", (name) => {
    rl.question("代码目录路径 (如 D:\\projects\\my-app): ", (workDir) => {
      rl.question("飞书 App ID: ", (appId) => {
        rl.question("飞书 App Secret: ", (appSecret) => {
          const template = `# cc-connect - ${name}
language = "zh"

[[projects]]
name = "${name}"
work_dir = "${workDir.replace(/\\/g, "\\\\")}"
admin_from = "*"

[projects.agent]
type = "claudecode"
mode = "default"

[projects.agent.options]
work_dir = "${workDir.replace(/\\/g, "\\\\")}"

[[projects.platforms]]
type = "feishu"

[projects.platforms.options]
app_id = "${appId}"
app_secret = "${appSecret}"
enable_feishu_card = true
thread_isolation = true
progress_style = "card"

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
          const configPath = path.join(CONFIGS_DIR, `config-${name}.toml`);
          fs.writeFileSync(configPath, template);

          // 更新 projects.txt
          let projectsContent = "";
          if (fs.existsSync(PROJECTS_FILE)) {
            projectsContent = fs.readFileSync(PROJECTS_FILE, "utf-8");
          }
          const lineNum = projectsContent.split("\n").filter((l) => l.trim()).length + 1;
          projectsContent += `\n${lineNum}. ${name} → ${workDir}`;
          fs.writeFileSync(PROJECTS_FILE, projectsContent.trim() + "\n");

          console.log(`\n✓ 配置已创建: ${configPath}`);
          console.log(`  启动: ccm start ${name}`);
          rl.close();
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
    const isUp = running[config.name];
    const icon = isUp ? "🟢" : "⚪";
    console.log(`  ${icon} [${config.index}] ${config.name.padEnd(25)} ${platform}`);
  }

  console.log(`\n  操作:`);
  console.log(`    输入编号 → 启动该项目`);
  console.log(`    stop 编号 → 停止该项目`);
  console.log(`    all → 启动所有项目`);
  console.log(`    stop all → 停止所有项目`);
  console.log(`    status → 查看状态`);
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

      const idx = parseInt(input);
      if (!isNaN(idx) && idx > 0) {
        const config = configs.find((c) => c.index === idx);
        if (config) {
          console.log();
          startProject(config);
          setTimeout(prompt, 2500);
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

if (args.includes("--list") || args.includes("-l")) {
  const configs = getConfigs();
  const running = getRunningStatus();
  console.log("\n可用配置:\n");
  for (const config of configs) {
    const projects = getConfigInfo(config.path);
    const platform = projects.map((p) => p.platform).join(", ");
    const dir = [...new Set(projects.map((p) => p.workDir))].join(", ");
    const icon = running[config.name] ? "🟢" : "⚪";
    console.log(`  ${icon} ${config.name}`);
    console.log(`     平台: ${platform}`);
    console.log(`     目录: ${dir}\n`);
  }
} else if (args.includes("--init")) {
  initProject();
} else if (args[0] === "status") {
  showStatus();
} else if (args[0] === "start" && args[1]) {
  const configs = getConfigs();
  if (args[1] === "all") {
    console.log("\n启动所有项目...\n");
    for (const config of configs) startProject(config);
  } else {
    const idx = parseInt(args[1]);
    const config = configs.find((c) => c.index === idx || c.name === args[1]);
    if (config) startProject(config);
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
  if (config) startProject(config);
  else console.log(`项目 "${args[0]}" 不存在，用 ccm --list 查看`);
} else {
  interactive();
}
