import * as crypto from "crypto";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { readJsonWithBackup, writeJsonAtomic } from "../../core/atomic-json-file";

const RESOURCE_PACKAGE = "@mumulinya167/ccm-pet-assets";
const OPTIONAL_SKINS = new Set(["clawd", "cloudling", "calico", "ghost", "robot"]);
const ROOT = path.join(CCM_DIR, "pet-assets");
const STATUS_FILE = path.join(ROOT, "status.json");
let prepareFlight: Promise<any> | null = null;

function runtimeVersion() {
  try { return String(require("../../../package.json")?.version || ""); } catch { return ""; }
}

function sha256(file: string) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function packageRoot(prefix: string) {
  return path.join(prefix, "node_modules", ...RESOURCE_PACKAGE.split("/"));
}

export function validatePetAssetManifest(root: string, expectedVersion: string) {
  const manifestFile = path.join(root, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf-8"));
  if (manifest.schema !== "ccm-pet-assets-manifest-v1" || manifest.version !== expectedVersion) {
    throw new Error("宠物资源包版本与CCM版本不一致");
  }
  for (const row of manifest.files || []) {
    const relative = String(row.path || "").replace(/\\/g, "/");
    if (!relative || relative.includes("..") || path.isAbsolute(relative)) throw new Error("宠物资源清单包含越界路径");
    const file = path.resolve(root, "assets", relative);
    const assetsRoot = path.resolve(root, "assets");
    if (!file.startsWith(`${assetsRoot}${path.sep}`)) throw new Error("宠物资源路径越界");
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== Number(row.size || -1) || sha256(file) !== row.sha256) {
      throw new Error(`宠物资源校验失败：${relative}`);
    }
  }
  return manifest;
}

function runNpmInstall(prefix: string, spec: string) {
  return new Promise<void>((resolve, reject) => {
    const command = process.platform === "win32" ? "npm.cmd" : "npm";
    const child = spawn(command, ["install", "--prefix", prefix, spec, "--ignore-scripts", "--no-audit", "--no-fund"], {
      shell: false,
      windowsHide: true,
      env: { ...process.env, npm_config_audit: "false", npm_config_fund: "false" },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    const timer = setTimeout(() => {
      try { child.kill("SIGTERM"); } catch {}
      reject(new Error("宠物资源包下载超时"));
    }, 180_000);
    timer.unref?.();
    child.stderr?.on("data", chunk => { stderr = `${stderr}${chunk}`.slice(-2000); });
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("exit", code => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`宠物资源包下载失败（npm ${code}）：${stderr.trim()}`));
    });
  });
}

function copyVerifiedAssets(sourceRoot: string, manifest: any, destination: string) {
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
  fs.mkdirSync(temporary, { recursive: true });
  fs.writeFileSync(path.join(temporary, ".ccm-pet-assets-owned"), `${manifest.version}\n`, "utf-8");
  for (const row of manifest.files || []) {
    const relative = String(row.path || "").replace(/\//g, path.sep);
    const source = path.join(sourceRoot, "assets", relative);
    const target = path.join(temporary, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  fs.writeFileSync(path.join(temporary, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  if (fs.existsSync(destination)) {
    const backup = `${destination}.previous`;
    try { fs.rmSync(backup, { recursive: true, force: true }); } catch {}
    fs.renameSync(destination, backup);
  }
  fs.renameSync(temporary, destination);
}

export function getPetAssetPackStatus() {
  const version = runtimeVersion();
  const activeRoot = path.join(ROOT, "versions", version);
  const status = readJsonWithBackup<any>(STATUS_FILE, null);
  return {
    schema: "ccm-pet-assets-status-v1",
    package: RESOURCE_PACKAGE,
    version,
    state: status?.version === version ? status.state : fs.existsSync(path.join(activeRoot, "manifest.json")) ? "ready" : "not_installed",
    active_root: activeRoot,
    available_skins: status?.version === version && status.state === "ready" ? status.available_skins || [] : [],
    error: status?.version === version ? status.error || "" : "",
    updated_at: status?.updated_at || "",
  };
}

export async function prepareOfficialPetAssets(skin: unknown) {
  const skinId = String(skin || "").trim().toLowerCase();
  if (skinId === "yuexinmiao") return { success: true, bundled: true, skin: skinId };
  if (!OPTIONAL_SKINS.has(skinId)) throw new Error("该宠物不是可下载的CCM官方皮肤");
  const current = getPetAssetPackStatus();
  if (current.state === "ready" && current.available_skins.includes(skinId)) return { success: true, cached: true, ...current };
  if (prepareFlight) return prepareFlight;
  prepareFlight = (async () => {
    const version = runtimeVersion();
    if (!version) throw new Error("无法确定CCM版本，拒绝下载宠物资源");
    fs.mkdirSync(ROOT, { recursive: true });
    writeJsonAtomic(STATUS_FILE, { schema: "ccm-pet-assets-status-v1", version, state: "downloading", updated_at: new Date().toISOString() });
    const staging = path.join(ROOT, "staging", `${version}-${Date.now().toString(36)}`);
    fs.mkdirSync(staging, { recursive: true });
    fs.writeFileSync(path.join(staging, ".ccm-pet-assets-owned"), `${version}\n`, "utf-8");
    try {
      await runNpmInstall(staging, `${RESOURCE_PACKAGE}@${version}`);
      const installedRoot = packageRoot(staging);
      const manifest = validatePetAssetManifest(installedRoot, version);
      if (!Array.isArray(manifest.skins) || !manifest.skins.includes(skinId)) throw new Error("资源包不包含所选宠物");
      const destination = path.join(ROOT, "versions", version);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      copyVerifiedAssets(installedRoot, manifest, destination);
      const status = {
        schema: "ccm-pet-assets-status-v1",
        version,
        state: "ready",
        available_skins: manifest.skins,
        manifest_checksum: crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex"),
        updated_at: new Date().toISOString(),
      };
      writeJsonAtomic(STATUS_FILE, status);
      return { success: true, skin: skinId, ...status };
    } catch (error: any) {
      writeJsonAtomic(STATUS_FILE, {
        schema: "ccm-pet-assets-status-v1",
        version,
        state: "failed",
        error: String(error?.message || error).slice(0, 2000),
        updated_at: new Date().toISOString(),
      });
      throw error;
    } finally {
      try { fs.rmSync(staging, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
    }
  })().finally(() => { prepareFlight = null; });
  return prepareFlight;
}

export function resolveDownloadedPetAsset(relativePath: string) {
  const safe = String(relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!safe || safe.includes("..") || path.isAbsolute(safe)) return "";
  const status = getPetAssetPackStatus();
  if (status.state !== "ready") return "";
  const file = path.resolve(status.active_root, safe);
  const root = path.resolve(status.active_root);
  if (!file.startsWith(`${root}${path.sep}`)) return "";
  try {
    const stat = fs.lstatSync(file);
    return stat.isFile() && !stat.isSymbolicLink() ? file : "";
  } catch {
    return "";
  }
}
