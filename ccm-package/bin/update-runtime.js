"use strict";

const { execFileSync, spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { readJson, writeJsonAtomic } = require("./service-runtime");

function now() { return new Date().toISOString(); }
function checksumFile(file, algorithm = "sha256", encoding = "hex") {
  const hash = crypto.createHash(algorithm);
  hash.update(fs.readFileSync(file));
  return hash.digest(encoding);
}

function appendHistory(transaction, state, detail = {}) {
  transaction.state = state;
  transaction.updated_at = now();
  transaction.history = Array.isArray(transaction.history) ? transaction.history : [];
  transaction.history.push({ state, at: transaction.updated_at, ...detail });
  return transaction;
}

function persist(file, transaction, state, detail = {}) {
  appendHistory(transaction, state, detail);
  writeJsonAtomic(file, transaction);
  return transaction;
}

function safeRemoveOwnedDirectory(directory, root) {
  const resolved = path.resolve(directory);
  const safeRoot = path.resolve(root);
  if (resolved === safeRoot || !resolved.startsWith(`${safeRoot}${path.sep}`)) throw new Error("拒绝清理更新目录之外的路径");
  if (!fs.existsSync(path.join(resolved, ".ccm-update-owned"))) throw new Error("更新暂存目录缺少CCM所有权标记");
  fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
}

function npmJson(npm, args, timeout = 90_000) {
  const output = execFileSync(npm.command, [...npm.prefix, ...args], {
    encoding: "utf-8",
    windowsHide: true,
    timeout,
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(String(output || "null"));
}

function runNpm(npm, args, options = {}) {
  return spawnSync(npm.command, [...npm.prefix, ...args], {
    encoding: "utf-8",
    windowsHide: true,
    timeout: Number(options.timeout || 10 * 60_000),
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, npm_config_audit: "false", npm_config_fund: "false", ...(options.env || {}) },
    stdio: options.inherit ? "inherit" : "pipe",
  });
}

function verifyIntegrity(tarball, integrity) {
  const raw = String(integrity || "");
  const match = raw.match(/^sha512-(.+)$/);
  if (!match) throw new Error("npm registry没有提供可用的SHA-512完整性证明");
  const actual = checksumFile(tarball, "sha512", "base64");
  if (actual !== match[1]) throw new Error("下载产物的SHA-512与npm registry不一致");
}

function assertNoLinks(root) {
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error(`安装产物包含符号链接：${path.relative(root, current)}`);
    if (stat.isDirectory()) for (const name of fs.readdirSync(current)) stack.push(path.join(current, name));
  }
}

function validateInstalledPackage(packageRoot, packageName, version) {
  const manifestFile = path.join(packageRoot, "package.json");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf-8"));
  if (manifest.name !== packageName || manifest.version !== version) throw new Error("隔离安装的包身份与目标版本不一致");
  for (const section of ["dependencies", "optionalDependencies", "peerDependencies"]) {
    for (const [name, spec] of Object.entries(manifest[section] || {})) {
      if (/^(?:file|link|workspace):/i.test(String(spec))) throw new Error(`发布依赖不允许使用本地引用：${name}`);
    }
  }
  const allowedScripts = new Set(["node bin/postinstall.js"]);
  for (const [name, script] of Object.entries(manifest.scripts || {})) {
    if (["preinstall", "install", "postinstall"].includes(name) && !allowedScripts.has(String(script))) {
      throw new Error(`安装包包含未经允许的生命周期脚本：${name}`);
    }
  }
  assertNoLinks(packageRoot);
  const bins = Object.values(manifest.bin || {}).map(value => path.join(packageRoot, String(value)));
  if (!bins.length || bins.some(file => !fs.existsSync(file))) throw new Error("安装包缺少CLI入口");
  if (process.platform !== "win32" && bins.some(file => (fs.statSync(file).mode & 0o111) === 0)) {
    throw new Error("CLI入口缺少可执行权限");
  }
  return { manifest, bins };
}

function packageRootInPrefix(prefix, packageName) {
  return path.join(prefix, "node_modules", ...packageName.split("/"));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

function runCli(cli, args, env, timeout = 120_000) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf-8",
    windowsHide: true,
    timeout,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
}

async function smokeInstalledPackage(packageRoot, stagingDir) {
  const cli = path.join(packageRoot, "bin", "ccm.js");
  const dataDir = path.join(stagingDir, "smoke-data");
  fs.mkdirSync(dataDir, { recursive: true });
  const env = {
    CCM_TASK_STORE_DIR: dataDir,
    CCM_STARTUP_PREPARE_LOCAL_EMBEDDING: "0",
    CCM_SERVER_LOCK_FILE: path.join(dataDir, "run", "ccm-server-instance.lock"),
    NO_COLOR: "1",
  };
  const doctor = runCli(cli, ["doctor", "--json"], env);
  if (doctor.status !== 0) throw new Error(`隔离doctor失败：${String(doctor.stderr || doctor.stdout || "").slice(-1200)}`);
  const port = await freePort();
  const start = runCli(cli, ["start", "--background", "--host", "127.0.0.1", "--port", String(port)], env, 60_000);
  if (start.status !== 0) throw new Error(`隔离启动失败：${String(start.stderr || start.stdout || "").slice(-1200)}`);
  const stop = runCli(cli, ["stop"], env, 60_000);
  if (stop.status !== 0) throw new Error(`隔离停止失败：${String(stop.stderr || stop.stdout || "").slice(-1200)}`);
  return { doctor: true, start_stop: true, port };
}

function resolveGlobalPackageRoot(npm, packageName) {
  const root = String(execFileSync(npm.command, [...npm.prefix, "root", "-g"], {
    encoding: "utf-8",
    windowsHide: true,
    timeout: 30_000,
  })).trim();
  return packageRootInPrefix(root, packageName);
}

function installGlobalTarball(npm, tarball) {
  const result = runNpm(npm, ["install", "-g", tarball, "--no-audit", "--no-fund"], { inherit: true });
  if (result.status !== 0) throw new Error(`全局安装失败，退出码 ${result.status}`);
}

function packExactVersion(npm, packageName, version, destination) {
  fs.mkdirSync(destination, { recursive: true });
  const packed = npmJson(npm, ["pack", `${packageName}@${version}`, "--pack-destination", destination, "--json"], 180_000);
  const filename = String(Array.isArray(packed) ? packed[0]?.filename : packed?.filename || "");
  const tarball = path.resolve(destination, filename);
  if (!filename || !tarball.startsWith(`${path.resolve(destination)}${path.sep}`) || !fs.existsSync(tarball)) {
    throw new Error(`无法取得 ${packageName}@${version} 的精确产物`);
  }
  return tarball;
}

async function prepareUpdate(context, requestedVersion) {
  const { ccmDir, currentVersion, npm, packageName, transactionFile } = context;
  const metadata = npmJson(npm, ["view", `${packageName}@${requestedVersion}`, "version", "dist.integrity", "dist.tarball", "--json"]);
  const version = String(metadata?.version || requestedVersion || "");
  if (!version || version !== requestedVersion) throw new Error("npm registry返回了不同的目标版本");
  const updatesRoot = path.join(ccmDir, "updates");
  fs.mkdirSync(updatesRoot, { recursive: true });
  const stagingDir = path.join(updatesRoot, `update-${Date.now().toString(36)}-${crypto.randomBytes(5).toString("hex")}`);
  fs.mkdirSync(stagingDir, { recursive: false });
  fs.writeFileSync(path.join(stagingDir, ".ccm-update-owned"), "ccm-update-v1\n", "utf-8");
  const transaction = {
    schema: "ccm-package-update-transaction-v1",
    id: `up_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`,
    package_name: packageName,
    previous_version: currentVersion,
    target_version: version,
    registry_integrity: String(metadata?.dist?.integrity || metadata?.integrity || ""),
    staging_directory: stagingDir,
    created_at: now(),
    history: [],
  };
  persist(transactionFile, transaction, "downloading");
  const packed = npmJson(npm, ["pack", `${packageName}@${version}`, "--pack-destination", stagingDir, "--json"], 180_000);
  const filename = String(Array.isArray(packed) ? packed[0]?.filename : packed?.filename || "");
  const tarball = path.resolve(stagingDir, filename);
  if (!filename || !tarball.startsWith(`${path.resolve(stagingDir)}${path.sep}`) || !fs.existsSync(tarball)) {
    throw new Error("npm没有生成可验证的更新tarball");
  }
  persist(transactionFile, transaction, "verifying", { tarball_sha256: checksumFile(tarball) });
  verifyIntegrity(tarball, transaction.registry_integrity);
  const prefix = path.join(stagingDir, "isolated-prefix");
  const install = runNpm(npm, ["install", "--prefix", prefix, tarball, "--no-audit", "--no-fund"]);
  if (install.status !== 0) throw new Error(`隔离安装失败：${String(install.stderr || install.stdout || "").slice(-1200)}`);
  const packageRoot = packageRootInPrefix(prefix, packageName);
  validateInstalledPackage(packageRoot, packageName, version);
  const smoke = await smokeInstalledPackage(packageRoot, stagingDir);
  transaction.tarball = tarball;
  transaction.tarball_sha256 = checksumFile(tarball);
  transaction.isolated_package_root = packageRoot;
  transaction.smoke = smoke;
  persist(transactionFile, transaction, "staged");
  return transaction;
}

async function switchPreparedUpdate(context, transaction) {
  const { npm, packageName, transactionFile, stopService, startService, launchConfiguration } = context;
  const installGlobal = context.installGlobalTarball || installGlobalTarball;
  const resolveGlobal = context.resolveGlobalPackageRoot || resolveGlobalPackageRoot;
  const validatePackage = context.validateInstalledPackage || validateInstalledPackage;
  const packVersion = context.packExactVersion || packExactVersion;
  if (transaction?.state !== "staged") throw new Error("只有已完成隔离验证的更新可以切换");
  persist(transactionFile, transaction, "switching");
  const stopped = await stopService();
  if (stopped !== 0) throw new Error("当前服务未能安全停止，更新切换已中止");
  try {
    installGlobal(npm, transaction.tarball);
    persist(transactionFile, transaction, "validating");
    const installedRoot = resolveGlobal(npm, packageName);
    validatePackage(installedRoot, packageName, transaction.target_version);
    const started = await startService(installedRoot, launchConfiguration);
    if (started !== 0) throw new Error("新版本安装后健康检查失败");
    persist(transactionFile, transaction, "completed", { installed_package_root: installedRoot });
    return transaction;
  } catch (error) {
    transaction.switch_error = String(error?.message || error).slice(0, 2000);
    try {
      const rollbackRoot = path.join(transaction.staging_directory, "rollback");
      fs.mkdirSync(rollbackRoot, { recursive: true });
      const rollbackTarball = packVersion(npm, packageName, transaction.previous_version, rollbackRoot);
      installGlobal(npm, rollbackTarball);
      const previousRoot = resolveGlobal(npm, packageName);
      validatePackage(previousRoot, packageName, transaction.previous_version);
      const restarted = await startService(previousRoot, launchConfiguration);
      if (restarted !== 0) throw new Error("旧版本恢复后无法启动");
      persist(transactionFile, transaction, "rolled_back", { rollback_reason: transaction.switch_error });
    } catch (rollbackError) {
      transaction.rollback_error = String(rollbackError?.message || rollbackError).slice(0, 2000);
      persist(transactionFile, transaction, "recovery_required");
    }
    return transaction;
  }
}

async function rollbackInstalledUpdate(context, transaction) {
  const { npm, packageName, transactionFile, stopService, startService, launchConfiguration } = context;
  const installGlobal = context.installGlobalTarball || installGlobalTarball;
  const resolveGlobal = context.resolveGlobalPackageRoot || resolveGlobalPackageRoot;
  const validatePackage = context.validateInstalledPackage || validateInstalledPackage;
  const packVersion = context.packExactVersion || packExactVersion;
  if (!transaction?.previous_version) throw new Error("当前更新事务没有可恢复的旧版本");
  const rollbackRoot = path.join(transaction.staging_directory, `manual-rollback-${Date.now().toString(36)}`);
  fs.mkdirSync(rollbackRoot, { recursive: true });
  const tarball = packVersion(npm, packageName, transaction.previous_version, rollbackRoot);
  const stopped = await stopService();
  if (stopped !== 0) throw new Error("当前服务未能安全停止，回滚已中止");
  installGlobal(npm, tarball);
  const previousRoot = resolveGlobal(npm, packageName);
  validatePackage(previousRoot, packageName, transaction.previous_version);
  const started = await startService(previousRoot, launchConfiguration);
  if (started !== 0) {
    transaction.rollback_error = "旧版本安装成功但服务无法启动";
    persist(transactionFile, transaction, "recovery_required");
    return transaction;
  }
  persist(transactionFile, transaction, "rolled_back", { manual: true });
  return transaction;
}

function readUpdateTransaction(file) {
  return readJson(file, null);
}

module.exports = {
  prepareUpdate,
  packExactVersion,
  readUpdateTransaction,
  rollbackInstalledUpdate,
  safeRemoveOwnedDirectory,
  switchPreparedUpdate,
  validateInstalledPackage,
  verifyIntegrity,
};
