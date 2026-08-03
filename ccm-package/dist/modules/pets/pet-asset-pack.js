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
exports.validatePetAssetManifest = validatePetAssetManifest;
exports.resolvePetAssetNpmInvocation = resolvePetAssetNpmInvocation;
exports.getPetAssetPackStatus = getPetAssetPackStatus;
exports.prepareOfficialPetAssets = prepareOfficialPetAssets;
exports.resolveDownloadedPetAsset = resolveDownloadedPetAsset;
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const RESOURCE_PACKAGE = "@mumulinya167/ccm-pet-assets";
const OPTIONAL_SKINS = new Set(["clawd", "cloudling", "calico", "ghost", "robot"]);
const ROOT = path.join(utils_1.CCM_DIR, "pet-assets");
const STATUS_FILE = path.join(ROOT, "status.json");
let prepareFlight = null;
function runtimeVersion() {
    try {
        return String(require("../../../package.json")?.version || "");
    }
    catch {
        return "";
    }
}
function sha256(file) {
    return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function packageRoot(prefix) {
    return path.join(prefix, "node_modules", ...RESOURCE_PACKAGE.split("/"));
}
function validatePetAssetManifest(root, expectedVersion) {
    const manifestFile = path.join(root, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf-8"));
    if (manifest.schema !== "ccm-pet-assets-manifest-v1" || manifest.version !== expectedVersion) {
        throw new Error("宠物资源包版本与CCM版本不一致");
    }
    for (const row of manifest.files || []) {
        const relative = String(row.path || "").replace(/\\/g, "/");
        if (!relative || relative.includes("..") || path.isAbsolute(relative))
            throw new Error("宠物资源清单包含越界路径");
        const file = path.resolve(root, "assets", relative);
        const assetsRoot = path.resolve(root, "assets");
        if (!file.startsWith(`${assetsRoot}${path.sep}`))
            throw new Error("宠物资源路径越界");
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== Number(row.size || -1) || sha256(file) !== row.sha256) {
            throw new Error(`宠物资源校验失败：${relative}`);
        }
    }
    return manifest;
}
function resolvePetAssetNpmInvocation(platform = process.platform) {
    if (platform !== "win32")
        return { command: "npm", prefixArgs: [] };
    const candidates = [
        process.env.npm_execpath,
        path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    ].filter(Boolean);
    const npmCli = candidates.find(candidate => {
        try {
            return fs.lstatSync(candidate).isFile();
        }
        catch {
            return false;
        }
    });
    if (!npmCli)
        throw new Error("找不到可用的 npm CLI，无法下载宠物资源包");
    return { command: process.execPath, prefixArgs: [npmCli] };
}
function runNpmInstall(prefix, spec) {
    return new Promise((resolve, reject) => {
        let invocation;
        try {
            invocation = resolvePetAssetNpmInvocation();
        }
        catch (error) {
            reject(error);
            return;
        }
        const child = (0, child_process_1.spawn)(invocation.command, [
            ...invocation.prefixArgs,
            "install", "--prefix", prefix, spec, "--ignore-scripts", "--no-audit", "--no-fund",
        ], {
            shell: false,
            windowsHide: true,
            env: { ...process.env, npm_config_audit: "false", npm_config_fund: "false" },
            stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";
        const timer = setTimeout(() => {
            try {
                child.kill("SIGTERM");
            }
            catch { }
            reject(new Error("宠物资源包下载超时"));
        }, 180_000);
        timer.unref?.();
        child.stderr?.on("data", chunk => { stderr = `${stderr}${chunk}`.slice(-2000); });
        child.once("error", error => { clearTimeout(timer); reject(error); });
        child.once("exit", code => {
            clearTimeout(timer);
            if (code === 0)
                resolve();
            else
                reject(new Error(`宠物资源包下载失败（npm ${code}）：${stderr.trim()}`));
        });
    });
}
function copyVerifiedAssets(sourceRoot, manifest, destination) {
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
        try {
            fs.rmSync(backup, { recursive: true, force: true });
        }
        catch { }
        fs.renameSync(destination, backup);
    }
    fs.renameSync(temporary, destination);
}
function getPetAssetPackStatus() {
    const version = runtimeVersion();
    const activeRoot = path.join(ROOT, "versions", version);
    const status = (0, atomic_json_file_1.readJsonWithBackup)(STATUS_FILE, null);
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
async function prepareOfficialPetAssets(skin) {
    const skinId = String(skin || "").trim().toLowerCase();
    if (skinId === "yuexinmiao")
        return { success: true, bundled: true, skin: skinId };
    if (!OPTIONAL_SKINS.has(skinId))
        throw new Error("该宠物不是可下载的CCM官方皮肤");
    const current = getPetAssetPackStatus();
    if (current.state === "ready" && current.available_skins.includes(skinId))
        return { success: true, cached: true, ...current };
    if (prepareFlight)
        return prepareFlight;
    prepareFlight = (async () => {
        const version = runtimeVersion();
        if (!version)
            throw new Error("无法确定CCM版本，拒绝下载宠物资源");
        fs.mkdirSync(ROOT, { recursive: true });
        (0, atomic_json_file_1.writeJsonAtomic)(STATUS_FILE, { schema: "ccm-pet-assets-status-v1", version, state: "downloading", updated_at: new Date().toISOString() });
        const staging = path.join(ROOT, "staging", `${version}-${Date.now().toString(36)}`);
        fs.mkdirSync(staging, { recursive: true });
        fs.writeFileSync(path.join(staging, ".ccm-pet-assets-owned"), `${version}\n`, "utf-8");
        try {
            await runNpmInstall(staging, `${RESOURCE_PACKAGE}@${version}`);
            const installedRoot = packageRoot(staging);
            const manifest = validatePetAssetManifest(installedRoot, version);
            if (!Array.isArray(manifest.skins) || !manifest.skins.includes(skinId))
                throw new Error("资源包不包含所选宠物");
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
            (0, atomic_json_file_1.writeJsonAtomic)(STATUS_FILE, status);
            return { success: true, skin: skinId, ...status };
        }
        catch (error) {
            (0, atomic_json_file_1.writeJsonAtomic)(STATUS_FILE, {
                schema: "ccm-pet-assets-status-v1",
                version,
                state: "failed",
                error: String(error?.message || error).slice(0, 2000),
                updated_at: new Date().toISOString(),
            });
            throw error;
        }
        finally {
            try {
                fs.rmSync(staging, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
            }
            catch { }
        }
    })().finally(() => { prepareFlight = null; });
    return prepareFlight;
}
function resolveDownloadedPetAsset(relativePath) {
    const safe = String(relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (!safe || safe.includes("..") || path.isAbsolute(safe))
        return "";
    const status = getPetAssetPackStatus();
    if (status.state !== "ready")
        return "";
    const file = path.resolve(status.active_root, safe);
    const root = path.resolve(status.active_root);
    if (!file.startsWith(`${root}${path.sep}`))
        return "";
    try {
        const stat = fs.lstatSync(file);
        return stat.isFile() && !stat.isSymbolicLink() ? file : "";
    }
    catch {
        return "";
    }
}
//# sourceMappingURL=pet-asset-pack.js.map