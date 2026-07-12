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
exports.isPetRunning = isPetRunning;
exports.launchPet = launchPet;
exports.stopPet = stopPet;
exports.handlePetsApi = handlePetsApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const utils_1 = require("../../core/utils");
const PET_WEB_ASSETS_DIR = path.join(utils_1.PUBLIC_DIR, "pets");
const PET_DESKTOP_ASSETS_DIR = path.resolve(__dirname, "..", "..", "..", "pet", "assets");
const MAX_PET_ASSET_BYTES = 2 * 1024 * 1024;
function isPetRunning() {
    if (!fs.existsSync(utils_1.PET_PID_FILE_GLOBAL))
        return false;
    const pid = fs.readFileSync(utils_1.PET_PID_FILE_GLOBAL, "utf-8").trim();
    try {
        process.kill(parseInt(pid), 0);
        return true;
    }
    catch {
        try {
            fs.unlinkSync(utils_1.PET_PID_FILE_GLOBAL);
        }
        catch { }
        return false;
    }
}
function findElectronBin() {
    const petExe = path.resolve(__dirname, "..", "..", "..", "pet", "node_modules", "electron", "dist", "electron.exe");
    if (fs.existsSync(petExe))
        return petExe;
    const mainExe = path.resolve(__dirname, "..", "..", "..", "node_modules", "electron", "dist", "electron.exe");
    if (fs.existsSync(mainExe))
        return mainExe;
    const petBin = path.resolve(__dirname, "..", "..", "..", "pet", "node_modules", ".bin", "electron");
    if (fs.existsSync(petBin))
        return petBin;
    const mainBin = path.resolve(__dirname, "..", "..", "..", "node_modules", ".bin", "electron");
    if (fs.existsSync(mainBin))
        return mainBin;
    return null;
}
function launchPet(port) {
    try {
        if (isPetRunning())
            return { success: false, error: "桌面宠物已在运行" };
        const petDir = path.resolve(__dirname, "..", "..", "..", "pet");
        if (!fs.existsSync(path.join(petDir, "main.js")))
            return { success: false, error: "宠物应用未安装" };
        const electronBin = findElectronBin();
        const cmd = electronBin || "npx";
        const args = electronBin ? [petDir] : ["electron", petDir];
        const child = (0, child_process_1.spawn)(cmd, args, {
            detached: true,
            stdio: "ignore",
            shell: !electronBin,
            windowsHide: false,
            env: { ...process.env, CCM_PORT: String(port) }
        });
        child.on("error", (err) => console.error("[pet]", err.message));
        child.unref();
        fs.writeFileSync(utils_1.PET_PID_FILE_GLOBAL, String(child.pid));
        return { success: true, pid: child.pid };
    }
    catch (e) {
        return { success: false, error: e.message };
    }
}
function stopPet() {
    if (!fs.existsSync(utils_1.PET_PID_FILE_GLOBAL))
        return { success: false, error: "桌面宠物未在运行" };
    const pid = fs.readFileSync(utils_1.PET_PID_FILE_GLOBAL, "utf-8").trim();
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
        fs.unlinkSync(utils_1.PET_PID_FILE_GLOBAL);
    }
    catch { }
    return { success: true };
}
function normalizePetAssetPath(assetPath) {
    const normalized = String(assetPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (!normalized || normalized.includes("..") || path.isAbsolute(normalized))
        return "";
    const ext = path.extname(normalized).toLowerCase();
    if (ext !== ".svg" && ext !== ".png")
        return "";
    if (normalized.split("/").some(part => !/^[\w.-]+$/.test(part)))
        return "";
    return normalized;
}
function writePetAsset(assetPath, sourcePath) {
    const safePath = normalizePetAssetPath(assetPath);
    if (!safePath)
        throw new Error("无效的宠物资源路径");
    const stat = fs.statSync(sourcePath);
    if (stat.size <= 0)
        throw new Error("上传文件为空");
    if (stat.size > MAX_PET_ASSET_BYTES)
        throw new Error("上传文件不能超过 2MB");
    const contentBuffer = fs.readFileSync(sourcePath);
    const ext = path.extname(safePath).toLowerCase();
    if (ext === ".svg") {
        const content = contentBuffer.toString("utf-8");
        if (!/<svg[\s>]/i.test(content))
            throw new Error("请上传有效的 SVG 文件");
        if (/<script[\s>]/i.test(content) || /\son\w+\s*=/i.test(content)) {
            throw new Error("SVG 不能包含脚本或内联事件");
        }
    }
    const devWebAssetsDir = path.resolve(utils_1.PUBLIC_DIR, "..", "..", "ccm-web-vue", "public", "pets");
    const targets = [
        { root: PET_WEB_ASSETS_DIR, file: path.join(PET_WEB_ASSETS_DIR, safePath) },
        { root: PET_DESKTOP_ASSETS_DIR, file: path.join(PET_DESKTOP_ASSETS_DIR, safePath) },
    ];
    if (fs.existsSync(devWebAssetsDir)) {
        targets.push({ root: devWebAssetsDir, file: path.join(devWebAssetsDir, safePath) });
    }
    for (const target of targets) {
        const relative = path.relative(target.root, target.file);
        if (relative.startsWith("..") || path.isAbsolute(relative))
            throw new Error("资源路径越界");
        fs.mkdirSync(path.dirname(target.file), { recursive: true });
        fs.writeFileSync(target.file, contentBuffer);
    }
    return safePath;
}
function handlePetsApi(pathname, req, res, parsed, ctx) {
    if (pathname === "/api/pets/agents" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, agents: ctx.getPetAgents() });
        return true;
    }
    if (pathname === "/api/pets/navigate" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const data = JSON.parse(body || "{}");
                const agent = String(data.agent || "").trim();
                if (!agent)
                    return (0, utils_1.sendJson)(res, { success: false, error: "缺少 agent" }, 400);
                const target = ctx.getPetNavigationTarget(agent);
                const event = ctx.broadcastPetNavigation(agent, target);
                (0, utils_1.sendJson)(res, {
                    success: true,
                    target,
                    url: event.url,
                    workspaceOpen: ctx.petWorkspaceClientsSize > 0,
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/pets/action-strategy" && req.method === "GET") {
        (0, utils_1.sendJson)(res, {
            success: true,
            project: ctx.getProjectPetActionStrategy ? ctx.getProjectPetActionStrategy() : { idle: [], active: [], idleCycleSeconds: 0 },
        });
        return true;
    }
    if (pathname === "/api/pets/config" && req.method === "GET") {
        try {
            if (fs.existsSync(utils_1.PETS_FILE)) {
                return (0, utils_1.sendJson)(res, JSON.parse(fs.readFileSync(utils_1.PETS_FILE, "utf-8")));
            }
        }
        catch { }
        (0, utils_1.sendJson)(res, { configs: {}, positions: {} });
        return true;
    }
    if (pathname === "/api/pets/config" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                fs.writeFileSync(utils_1.PETS_FILE, JSON.stringify(JSON.parse(body), null, 2));
                ctx.broadcastPetConfigChanged();
                (0, utils_1.sendJson)(res, { success: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/pets/assets/upload" && req.method === "POST") {
        (async () => {
            let upload = null;
            try {
                const contentType = String(req.headers["content-type"] || "");
                const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                if (!boundary)
                    return (0, utils_1.sendJson)(res, { success: false, error: "请使用 multipart/form-data 上传" }, 400);
                const buffer = await (0, utils_1.collectRequestBuffer)(req);
                const { files, fields } = (0, utils_1.parseMultipart)(buffer, boundary);
                upload = files.find(f => f.field === "file") || files[0];
                if (!upload?.savedPath)
                    return (0, utils_1.sendJson)(res, { success: false, error: "缺少 SVG 文件" }, 400);
                const assetPath = writePetAsset(fields.assetPath, upload.savedPath);
                ctx.broadcastPetConfigChanged();
                (0, utils_1.sendJson)(res, {
                    success: true,
                    assetPath,
                    url: `/pets/${assetPath}?v=${Date.now()}`
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
            finally {
                if (upload?.savedPath) {
                    try {
                        fs.unlinkSync(upload.savedPath);
                    }
                    catch { }
                }
            }
        })();
        return true;
    }
    if (pathname === "/api/pets/launch" && req.method === "POST") {
        (0, utils_1.sendJson)(res, launchPet(ctx.PORT));
        return true;
    }
    if (pathname === "/api/pets/close" && req.method === "POST") {
        (0, utils_1.sendJson)(res, stopPet());
        return true;
    }
    if (pathname === "/api/pets/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { running: isPetRunning() });
        return true;
    }
    return false;
}
//# sourceMappingURL=pets.js.map