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
exports.stopPet = exports.launchPet = exports.isPetRunning = void 0;
exports.readPetConfig = readPetConfig;
exports.runPetAssetSecuritySelfTest = runPetAssetSecuritySelfTest;
exports.maybeAutoStartPet = maybeAutoStartPet;
exports.handlePetsApi = handlePetsApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const utils_1 = require("../../core/utils");
const pet_activity_coordinator_1 = require("./pet-activity-coordinator");
const atomic_json_file_1 = require("../../core/atomic-json-file");
const user_notifications_1 = require("../../system/user-notifications");
const pet_asset_pack_1 = require("./pet-asset-pack");
const pet_runtime_1 = require("./pet-runtime");
Object.defineProperty(exports, "launchPet", { enumerable: true, get: function () { return pet_runtime_1.launchPet; } });
Object.defineProperty(exports, "stopPet", { enumerable: true, get: function () { return pet_runtime_1.stopPet; } });
Object.defineProperty(exports, "isPetRunning", { enumerable: true, get: function () { return pet_runtime_1.isPetRunning; } });
const pet_asset_storage_1 = require("./pet-asset-storage");
const PET_WEB_ASSETS_DIR = pet_asset_storage_1.PET_CUSTOM_ASSETS_DIR;
const MAX_PET_ASSET_BYTES = 2 * 1024 * 1024;
function emptyPetConfig() {
    return {
        schema: "ccm-pet-config-v2",
        revision: 0,
        configs: {},
        positions: {},
        customTypes: [],
        settings: { autoStart: false, webFallback: true, agentProgressMode: "milestones" },
        updatedAt: new Date(0).toISOString(),
    };
}
function normalizePetConfig(value) {
    const fallback = emptyPetConfig();
    return {
        schema: "ccm-pet-config-v2",
        revision: Math.max(0, Number(value?.revision) || 0),
        configs: value?.configs && typeof value.configs === "object" && !Array.isArray(value.configs) ? value.configs : {},
        positions: value?.positions && typeof value.positions === "object" && !Array.isArray(value.positions) ? value.positions : {},
        customTypes: Array.isArray(value?.customTypes) ? value.customTypes : [],
        settings: {
            autoStart: value?.settings?.autoStart === true,
            webFallback: value?.settings?.webFallback !== false,
            agentProgressMode: value?.settings?.agentProgressMode === "terminal_only" ? "terminal_only" : "milestones",
        },
        updatedAt: String(value?.updatedAt || fallback.updatedAt),
    };
}
function readPetConfig() {
    return normalizePetConfig((0, atomic_json_file_1.readJsonWithBackup)(utils_1.PETS_FILE, emptyPetConfig()));
}
function mergePetConfigPatch(current, patch) {
    const next = normalizePetConfig({
        ...current,
        configs: { ...current.configs },
        positions: { ...current.positions },
        settings: { ...current.settings },
        customTypes: current.customTypes,
    });
    if (patch?.configs && typeof patch.configs === "object" && !Array.isArray(patch.configs)) {
        for (const [agent, value] of Object.entries(patch.configs)) {
            if (!/^[a-zA-Z0-9._:-]{1,160}$/.test(agent))
                throw new Error("宠物Agent标识无效");
            if (value === null)
                delete next.configs[agent];
            else
                next.configs[agent] = { ...(next.configs[agent] || {}), ...value };
        }
    }
    if (patch?.positions && typeof patch.positions === "object" && !Array.isArray(patch.positions)) {
        for (const [agent, value] of Object.entries(patch.positions)) {
            if (!/^[a-zA-Z0-9._:-]{1,160}$/.test(agent))
                throw new Error("宠物Agent标识无效");
            if (value === null)
                delete next.positions[agent];
            else {
                const x = Number(value?.x);
                const y = Number(value?.y);
                if (!Number.isFinite(x) || !Number.isFinite(y))
                    throw new Error("宠物位置无效");
                next.positions[agent] = { x: Math.round(x), y: Math.round(y) };
            }
        }
    }
    if (patch?.settings && typeof patch.settings === "object" && !Array.isArray(patch.settings)) {
        if (typeof patch.settings.autoStart === "boolean")
            next.settings.autoStart = patch.settings.autoStart;
        if (typeof patch.settings.webFallback === "boolean")
            next.settings.webFallback = patch.settings.webFallback;
        if (patch.settings.agentProgressMode !== undefined) {
            const mode = String(patch.settings.agentProgressMode || "milestones");
            if (!["milestones", "terminal_only"].includes(mode))
                throw new Error("宠物 Agent 进度模式无效");
            next.settings.agentProgressMode = mode;
        }
    }
    if (Array.isArray(patch?.customTypes))
        next.customTypes = patch.customTypes;
    next.revision = current.revision + 1;
    next.updatedAt = new Date().toISOString();
    return next;
}
function savePetConfigPatch(expectedRevision, patch) {
    return (0, atomic_json_file_1.withFileLock)(utils_1.PETS_FILE, () => {
        const current = readPetConfig();
        if (Number(expectedRevision) !== current.revision) {
            const error = new Error("宠物配置已经变化，请刷新后重试");
            error.code = "state_drift";
            error.current = current;
            throw error;
        }
        const next = mergePetConfigPatch(current, patch);
        (0, atomic_json_file_1.writeJsonAtomic)(utils_1.PETS_FILE, next);
        return next;
    });
}
function syncGeneratedPetDisplayNames(customTypes) {
    const list = Array.isArray(customTypes) ? customTypes : [];
    for (const skin of list) {
        const id = String(skin?.id || "").trim();
        const name = String(skin?.name || "").trim();
        if (!/^[a-zA-Z0-9._-]+$/.test(id) || !name)
            continue;
        if (!(skin?.generated || Number(skin?.spriteVersionNumber) === 2))
            continue;
        const relativeDir = path.join("generated", id);
        const targets = [path.join(PET_WEB_ASSETS_DIR, relativeDir, "pet.json")];
        for (const file of targets) {
            try {
                if (!fs.existsSync(file))
                    continue;
                const manifest = JSON.parse(fs.readFileSync(file, "utf-8"));
                if (String(manifest.displayName || "") === name)
                    continue;
                fs.writeFileSync(file, JSON.stringify({ ...manifest, displayName: name, id }, null, 2), "utf-8");
            }
            catch { }
        }
    }
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
function validatePngAsset(content) {
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (content.length < 24 || !content.subarray(0, 8).equals(signature) || content.toString("ascii", 12, 16) !== "IHDR") {
        throw new Error("请上传有效的 PNG 文件");
    }
    const width = content.readUInt32BE(16);
    const height = content.readUInt32BE(20);
    if (!width || !height || width > 4096 || height > 4096) {
        throw new Error("PNG 尺寸必须在 1 至 4096 像素之间");
    }
}
function validateSvgAsset(content) {
    if (!/^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(content))
        throw new Error("请上传有效的 SVG 文件");
    if (/<\s*(?:script|foreignObject|iframe|object|embed|audio|video|style)\b/i.test(content)) {
        throw new Error("SVG 包含不允许的元素");
    }
    if (/<!DOCTYPE|<!ENTITY|\son[a-z]+\s*=|javascript\s*:|data\s*:\s*text\/html/i.test(content)) {
        throw new Error("SVG 包含脚本、实体或内联事件");
    }
    const references = [...content.matchAll(/\b(?:href|xlink:href)\s*=\s*["']([^"']+)["']/gi)].map(match => match[1].trim());
    if (references.some(value => value && !value.startsWith("#")))
        throw new Error("SVG 不能引用外部资源");
    const cssUrls = [...content.matchAll(/url\(\s*["']?([^)"']+)/gi)].map(match => match[1].trim());
    if (cssUrls.some(value => value && !value.startsWith("#")))
        throw new Error("SVG 不能引用外部 CSS 资源");
}
function collectPetUploadBuffer(req) {
    return new Promise((resolve, reject) => {
        const limit = MAX_PET_ASSET_BYTES + 512 * 1024;
        const chunks = [];
        let size = 0;
        let settled = false;
        const timer = setTimeout(() => {
            if (settled)
                return;
            settled = true;
            reject(new Error("宠物资源上传超时"));
            req.destroy();
        }, 20_000);
        timer.unref?.();
        req.on("data", (chunk) => {
            if (settled)
                return;
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += buffer.length;
            if (size > limit) {
                settled = true;
                clearTimeout(timer);
                reject(new Error("上传请求不能超过 2.5MB"));
                req.destroy();
                return;
            }
            chunks.push(buffer);
        });
        req.on("end", () => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            resolve(Buffer.concat(chunks));
        });
        req.on("error", error => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            reject(error);
        });
    });
}
function writePetAsset(assetPath, sourcePath) {
    const safePath = normalizePetAssetPath(assetPath);
    if (!safePath)
        throw new Error("无效的宠物资源路径");
    const stat = fs.lstatSync(sourcePath);
    if (!stat.isFile() || stat.isSymbolicLink())
        throw new Error("宠物资源必须是普通文件");
    if (stat.size <= 0)
        throw new Error("上传文件为空");
    if (stat.size > MAX_PET_ASSET_BYTES)
        throw new Error("上传文件不能超过 2MB");
    const contentBuffer = fs.readFileSync(sourcePath);
    const ext = path.extname(safePath).toLowerCase();
    if (ext === ".svg") {
        const content = contentBuffer.toString("utf-8");
        validateSvgAsset(content);
    }
    else {
        validatePngAsset(contentBuffer);
    }
    const checksum = crypto.createHash("sha256").update(contentBuffer).digest("hex");
    const targets = [
        { root: PET_WEB_ASSETS_DIR, file: path.join(PET_WEB_ASSETS_DIR, safePath) },
    ];
    for (const target of targets) {
        const relative = path.relative(target.root, target.file);
        if (relative.startsWith("..") || path.isAbsolute(relative))
            throw new Error("资源路径越界");
        fs.mkdirSync(path.dirname(target.file), { recursive: true });
        const temp = `${target.file}.${process.pid}.${Date.now()}.tmp`;
        fs.writeFileSync(temp, contentBuffer, { flag: "wx" });
        try {
            fs.renameSync(temp, target.file);
        }
        catch {
            try {
                fs.unlinkSync(target.file);
            }
            catch { }
            fs.renameSync(temp, target.file);
        }
        const immutableFile = path.join(target.root, ".immutable", checksum, path.basename(safePath));
        fs.mkdirSync(path.dirname(immutableFile), { recursive: true });
        if (!fs.existsSync(immutableFile))
            fs.writeFileSync(immutableFile, contentBuffer, { flag: "wx" });
    }
    return { assetPath: safePath, checksum };
}
function runPetAssetSecuritySelfTest() {
    const png = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
    png.write("IHDR", 12, "ascii");
    png.writeUInt32BE(64, 16);
    png.writeUInt32BE(64, 20);
    const checks = {};
    try {
        validatePngAsset(png);
        checks.validPng = true;
    }
    catch {
        checks.validPng = false;
    }
    try {
        validatePngAsset(Buffer.from("not-png"));
        checks.invalidPngRejected = false;
    }
    catch {
        checks.invalidPngRejected = true;
    }
    try {
        validateSvgAsset('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z"/></svg>');
        checks.validSvg = true;
    }
    catch {
        checks.validSvg = false;
    }
    try {
        validateSvgAsset('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        checks.scriptRejected = false;
    }
    catch {
        checks.scriptRejected = true;
    }
    try {
        validateSvgAsset('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/a.png"/></svg>');
        checks.externalReferenceRejected = false;
    }
    catch {
        checks.externalReferenceRejected = true;
    }
    checks.traversalRejected = normalizePetAssetPath("../outside.svg") === "";
    checks.unsupportedExtensionRejected = normalizePetAssetPath("pet.exe") === "";
    return { pass: Object.values(checks).every(Boolean), checks };
}
// === 暴露供外部查询进程状态 ===
async function maybeAutoStartPet(port) {
    const enabled = readPetConfig().settings.autoStart;
    const desktopAvailable = process.platform === "win32"
        || process.platform === "darwin"
        || !!process.env.DISPLAY
        || !!process.env.WAYLAND_DISPLAY;
    if (!enabled)
        return { success: true, skipped: true, reason: "disabled" };
    if (!desktopAvailable)
        return { success: true, skipped: true, reason: "desktop_unavailable" };
    if ((0, pet_runtime_1.isPetRunning)())
        return { success: true, skipped: true, reason: "already_running" };
    const binding = (0, pet_runtime_1.savedPetBinding)();
    if (!binding)
        return { success: true, skipped: true, reason: "login_required" };
    const result = await (0, pet_runtime_1.launchPet)(port, binding);
    if (!result.success)
        console.warn(`[桌面宠物] 自动启动失败：${result.error}`);
    return result;
}
function handlePetsApi(pathname, req, res, parsed, ctx) {
    if (pathname === "/api/pets/assets/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, ...(0, pet_asset_pack_1.getPetAssetPackStatus)() });
        return true;
    }
    if (pathname === "/api/pets/assets/prepare" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
            if (Buffer.byteLength(body, "utf-8") > 32 * 1024)
                req.destroy();
        });
        req.on("end", () => {
            let payload = {};
            try {
                payload = JSON.parse(body || "{}");
            }
            catch {
                return (0, utils_1.sendJson)(res, { success: false, error: "请求格式无效" }, 400);
            }
            (0, pet_asset_pack_1.prepareOfficialPetAssets)(payload.skin)
                .then(result => (0, utils_1.sendJson)(res, result))
                .catch((error) => (0, utils_1.sendJson)(res, {
                success: false,
                error: error?.message || "宠物资源准备失败",
                code: "PET_ASSET_PREPARE_FAILED",
                status: (0, pet_asset_pack_1.getPetAssetPackStatus)(),
            }, 503));
        });
        return true;
    }
    if (pathname === "/api/pets/runtime/bootstrap" && req.method === "GET") {
        const isDesktopPet = req.ccmAuth?.kind === "internal" && req.ccmAuth?.caller === "desktop-pet";
        const channel = isDesktopPet ? "desktop_pet" : "web_pet";
        const recipientUserIds = [(0, pet_runtime_1.petRequestUserId)(req)].filter(Boolean);
        let config = { schema: "ccm-pet-config-v2", revision: 0, configs: {}, positions: {}, customTypes: [] };
        try {
            if (fs.existsSync(utils_1.PETS_FILE))
                config = { ...config, ...JSON.parse(fs.readFileSync(utils_1.PETS_FILE, "utf-8")) };
        }
        catch { }
        const pending = (0, user_notifications_1.listPendingPetDeliveries)({ channel, recipient_user_ids: recipientUserIds, limit: 30 })
            .map(item => (0, user_notifications_1.projectPetNotification)(item.notification, item.delivery));
        (0, utils_1.sendJson)(res, {
            success: true,
            runtime: {
                version: 2,
                channel,
                authenticated: true,
                generated_at: new Date().toISOString(),
            },
            agents: ctx.getPetAgents(),
            config,
            notifications: pending,
        });
        return true;
    }
    const deliveryAckMatch = pathname.match(/^\/api\/pets\/runtime\/deliveries\/([^/]+)\/ack$/);
    if (deliveryAckMatch && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
            if (Buffer.byteLength(body, "utf-8") > 32 * 1024)
                req.destroy();
        });
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const acknowledged = (0, user_notifications_1.acknowledgePetDelivery)(decodeURIComponent(deliveryAckMatch[1]), String(payload.client_id || "pet-client"));
                (0, utils_1.sendJson)(res, { success: acknowledged }, acknowledged ? 200 : 404);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || "确认通知失败" }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/pets/agents" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, agents: ctx.getPetAgents() });
        return true;
    }
    if (pathname === "/api/pets/self-test" && req.method === "GET") {
        const activity = (0, pet_activity_coordinator_1.runPetActivityCoordinatorSelfTest)();
        (0, utils_1.sendJson)(res, { success: true, pass: activity.pass, activity });
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
        (0, utils_1.sendJson)(res, readPetConfig());
        return true;
    }
    if (pathname === "/api/pets/config" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body);
                const saved = (0, atomic_json_file_1.withFileLock)(utils_1.PETS_FILE, () => {
                    const current = readPetConfig();
                    const next = normalizePetConfig({
                        ...payload,
                        revision: current.revision + 1,
                        updatedAt: new Date().toISOString(),
                    });
                    (0, atomic_json_file_1.writeJsonAtomic)(utils_1.PETS_FILE, next);
                    return next;
                });
                syncGeneratedPetDisplayNames(saved.customTypes);
                ctx.broadcastPetConfigChanged();
                (0, utils_1.sendJson)(res, { success: true, config: saved });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/pets/config" && req.method === "PATCH") {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
            if (Buffer.byteLength(body, "utf-8") > 256 * 1024)
                req.destroy();
        });
        req.on("end", () => {
            try {
                const payload = JSON.parse(body || "{}");
                const saved = savePetConfigPatch(Number(payload.revision), payload.patch || {});
                syncGeneratedPetDisplayNames(saved.customTypes);
                ctx.broadcastPetConfigChanged();
                (0, utils_1.sendJson)(res, { success: true, config: saved });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, {
                    success: false,
                    error: error?.message || "保存宠物配置失败",
                    code: error?.code || "PET_CONFIG_INVALID",
                    current: error?.current,
                }, error?.code === "state_drift" ? 409 : 400);
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
                const buffer = await collectPetUploadBuffer(req);
                const { files, fields } = (0, utils_1.parseMultipart)(buffer, boundary);
                upload = files.find(f => f.field === "file") || files[0];
                if (!upload?.savedPath)
                    return (0, utils_1.sendJson)(res, { success: false, error: "缺少 SVG 文件" }, 400);
                const stored = writePetAsset(fields.assetPath, upload.savedPath);
                ctx.broadcastPetConfigChanged();
                (0, utils_1.sendJson)(res, {
                    success: true,
                    assetPath: stored.assetPath,
                    checksum: stored.checksum,
                    url: `/pets/${stored.assetPath}?v=${stored.checksum.slice(0, 12)}`
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
        void (0, pet_runtime_1.launchPet)(ctx.PORT, req.ccmAuth?.kind === "browser" ? { userId: req.ccmAuth.userId, sessionId: req.ccmAuth.sessionId } : {}).then(result => (0, utils_1.sendJson)(res, result));
        return true;
    }
    if (pathname === "/api/pets/close" && req.method === "POST") {
        void (0, pet_runtime_1.stopPet)().then(result => (0, utils_1.sendJson)(res, result));
        return true;
    }
    if (pathname === "/api/pets/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { running: (0, pet_runtime_1.isPetRunning)(), runtime: (0, pet_runtime_1.readPetRuntimeIdentity)() });
        return true;
    }
    return false;
}
//# sourceMappingURL=pets.js.map