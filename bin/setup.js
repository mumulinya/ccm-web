#!/usr/bin/env node
// ccm 初始化安装脚本

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");
const readline = require("readline");
const { ensureCcmRuntimeHomeMigration, resolveCcmRuntimeHome, rewriteActiveRuntimePaths } = require("./runtime-home");

const runtimeMigration = ensureCcmRuntimeHomeMigration();
rewriteActiveRuntimePaths(resolveCcmRuntimeHome());
if (runtimeMigration.status === "failed") console.warn(`[CCM] 运行数据迁移未完成，旧目录保留：${runtimeMigration.error}`);

const CCM_DIR = resolveCcmRuntimeHome();
const CONFIGS_DIR = path.join(CCM_DIR, "configs");
const PID_DIR = path.join(CCM_DIR, "pids");
const LOG_DIR = path.join(CCM_DIR, "logs");
const PACKAGE_DIR = path.resolve(__dirname, "..");
const MCP_DIR = path.join(PACKAGE_DIR, "mcp-feishu");
const MIN_CC_CONNECT_VERSION = "1.4.1";

function parseVersion(value) {
  const match = String(value || "").match(/(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : null;
}

function versionAtLeast(actual, minimum) {
  const left = parseVersion(actual);
  const right = parseVersion(minimum);
  if (!left || !right) return false;
  for (let index = 0; index < 3; index++) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return true;
}

console.log("\n╔══════════════════════════════════════╗");
console.log("║     ccm 安装程序                      ║");
console.log("╚══════════════════════════════════════╝\n");

// 1. 创建目录
console.log("[1/6] 创建目录结构...");
[CCM_DIR, CONFIGS_DIR, PID_DIR, LOG_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  ✓ ${dir}`);
  } else {
    console.log(`  ✓ ${dir} (已存在)`);
  }
});

// 2. 检查 cc-connect
console.log("\n[2/6] 检查 cc-connect...");
let bundledCcConnectVersion = "";
try {
  const packageFile = require.resolve("cc-connect/package.json", { paths: [PACKAGE_DIR] });
  bundledCcConnectVersion = String(require(packageFile).version || "");
} catch {}
if (versionAtLeast(bundledCcConnectVersion, MIN_CC_CONNECT_VERSION)) {
  console.log(`  ✓ 包内 cc-connect v${bundledCcConnectVersion}`);
} else {
  try {
    const version = execSync("cc-connect --version", { encoding: "utf-8" }).trim();
    if (!versionAtLeast(version, MIN_CC_CONNECT_VERSION)) {
      console.log(`  ! ${version} 版本过旧，正在升级到 ${MIN_CC_CONNECT_VERSION}+...`);
      execSync(`npm install -g cc-connect@^${MIN_CC_CONNECT_VERSION}`, { stdio: "inherit" });
      console.log("  ✓ cc-connect 已升级");
    } else {
      console.log(`  ✓ ${version}`);
    }
  } catch {
    console.log("  ✗ 未安装，正在安装...");
    try {
      execSync(`npm install -g cc-connect@^${MIN_CC_CONNECT_VERSION}`, { stdio: "inherit" });
      console.log("  ✓ 安装成功");
    } catch {
      console.log("  ✗ 安装失败，请手动运行: npm install -g cc-connect@^1.4.1");
    }
  }
}

// 3. 安装飞书 MCP 依赖
console.log("\n[3/6] 安装飞书 MCP 依赖...");
if (fs.existsSync(MCP_DIR)) {
  const mcpNodeModules = path.join(MCP_DIR, "node_modules");
  if (!fs.existsSync(mcpNodeModules)) {
    try {
      execSync("npm install", { cwd: MCP_DIR, stdio: "inherit" });
      console.log("  ✓ 依赖安装完成");
    } catch {
      console.log("  ✗ 依赖安装失败，请手动运行: cd mcp-feishu && npm install");
    }
  } else {
    console.log("  ✓ 依赖已存在");
  }

  // 创建 .env 模板
  const envFile = path.join(MCP_DIR, ".env");
  if (!fs.existsSync(envFile)) {
    fs.writeFileSync(envFile, "FEISHU_APP_ID=\nFEISHU_APP_SECRET=\n");
    console.log("  ✓ 已创建 .env 模板（需填写凭证）");
  } else {
    console.log("  ✓ .env 已存在");
  }
} else {
  console.log("  ⚠ mcp-feishu 目录不存在，跳过");
}

// 4. 配置 Claude Code MCP
console.log("\n[4/6] 配置 Claude Code MCP...");
const claudeMcpPath = path.join(os.homedir(), ".claude", ".mcp.json");
const mcpConfig = {
  command: "node",
  args: [path.join(MCP_DIR, "dist", "index.js").replace(/\\/g, "/")],
};

try {
  let claudeMcp = {};
  if (fs.existsSync(claudeMcpPath)) {
    claudeMcp = JSON.parse(fs.readFileSync(claudeMcpPath, "utf-8"));
  }
  if (!claudeMcp.mcpServers) claudeMcp.mcpServers = {};
  claudeMcp.mcpServers["feishu"] = mcpConfig;
  fs.writeFileSync(claudeMcpPath, JSON.stringify(claudeMcp, null, 2));
  console.log(`  ✓ Claude Code MCP 已配置: ${claudeMcpPath}`);
} catch (e) {
  console.log(`  ✗ 配置失败: ${e.message}`);
}

// 5. 配置 Cursor MCP
console.log("\n[5/6] 配置 Cursor MCP...");
const cursorMcpPath = path.join(os.homedir(), ".cursor", "mcp.json");
const cursorMcpConfig = {
  command: "node",
  args: [path.join(MCP_DIR, "dist", "index.js").replace(/\\/g, "/")],
  env: {
    FEISHU_APP_ID: "",
    FEISHU_APP_SECRET: "",
  },
};

try {
  let cursorMcp = {};
  if (fs.existsSync(cursorMcpPath)) {
    cursorMcp = JSON.parse(fs.readFileSync(cursorMcpPath, "utf-8"));
  }
  if (!cursorMcp.mcpServers) cursorMcp.mcpServers = {};
  cursorMcp.mcpServers["feishu"] = cursorMcpConfig;
  fs.writeFileSync(cursorMcpPath, JSON.stringify(cursorMcp, null, 2));
  console.log(`  ✓ Cursor MCP 已配置: ${cursorMcpPath}`);
} catch (e) {
  console.log(`  ✗ 配置失败: ${e.message}`);
}

// 6. 创建 projects.txt
console.log("\n[6/6] 初始化项目列表...");
const projectsFile = path.join(CCM_DIR, "projects.txt");
if (!fs.existsSync(projectsFile)) {
  fs.writeFileSync(projectsFile, "可用项目列表：\n\n");
  console.log("  ✓ 创建 projects.txt");
} else {
  console.log("  ✓ projects.txt 已存在");
}

// 完成
console.log("\n═══════════════════════════════════════");
console.log(" 安装完成！");
console.log("═══════════════════════════════════════\n");
console.log("  接下来：");
console.log("");
console.log("  1. 填写飞书凭证:");
console.log(`     编辑 ${path.join(MCP_DIR, ".env")}`);
console.log("     填入 FEISHU_APP_ID 和 FEISHU_APP_SECRET");
console.log("");
console.log("  2. 创建项目:");
console.log("     ccm --init");
console.log("");
console.log("  3. 或者扫码创建飞书机器人:");
console.log("     cc-connect feishu setup --project 项目名 --config 配置文件路径");
console.log("");
console.log("  4. 启动:");
console.log("     ccm start all");
console.log("");
