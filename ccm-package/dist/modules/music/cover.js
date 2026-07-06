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
exports.handleMusicCoverApi = handleMusicCoverApi;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../../core/db");
const utils_1 = require("../../core/utils");
const library_1 = require("./library");
const RANDOM_COVER_URLS = [
    "http://www.dmoe.cc/random.php",
    "http://api.btstu.cn/sjbz/api.php?lx=dongman&format=images",
    "http://t.alcy.cc/acg",
    "http://api.amrno.com/api/acg",
];
function sendBuffer(res, buffer, contentType, cacheControl = "public, max-age=31536000") {
    res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": buffer.length,
        "Cache-Control": cacheControl,
    });
    res.end(buffer);
}
function sendDefaultCover(res, cachePath = "", preferredHash = "") {
    const animeCoversDir = path.join(utils_1.PUBLIC_DIR, "anime_covers");
    if (fs.existsSync(animeCoversDir)) {
        const files = fs.readdirSync(animeCoversDir).filter(f => f.endsWith(".jpg") || f.endsWith(".png"));
        if (files.length > 0) {
            let sum = 0;
            for (let i = 0; i < preferredHash.length; i++) {
                sum += preferredHash.charCodeAt(i);
            }
            const chosenFile = files[sum % files.length];
            const animePath = path.join(animeCoversDir, chosenFile);
            if (fs.existsSync(animePath)) {
                const buffer = fs.readFileSync(animePath);
                if (cachePath) {
                    try {
                        fs.writeFileSync(cachePath, buffer);
                    }
                    catch { }
                }
                sendBuffer(res, buffer, chosenFile.endsWith(".png") ? "image/png" : "image/jpeg");
                return;
            }
        }
    }
    const defaultPath = path.join(utils_1.PUBLIC_DIR, "room_window_bg.png");
    if (fs.existsSync(defaultPath)) {
        const buffer = fs.readFileSync(defaultPath);
        sendBuffer(res, buffer, "image/png", cachePath ? "public, max-age=60" : "no-cache");
        return;
    }
    res.writeHead(404);
    res.end("Not Found");
}
async function fetchRandomCover(timeoutMs) {
    for (const url of RANDOM_COVER_URLS) {
        try {
            const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
            if (resp.ok) {
                return {
                    buffer: Buffer.from(await resp.arrayBuffer()),
                    mimeType: resp.headers.get("content-type") || "image/jpeg",
                };
            }
        }
        catch { }
    }
    return null;
}
function handleMusicCoverApi(res, parsed) {
    const filename = parsed.query.file;
    if (filename && filename.includes("..")) {
        res.writeHead(400);
        res.end("Bad Request");
        return true;
    }
    if (!filename) {
        (async () => {
            const randomCover = await fetchRandomCover(3000);
            if (randomCover) {
                sendBuffer(res, randomCover.buffer, randomCover.mimeType, "no-cache");
                return;
            }
            sendDefaultCover(res);
        })();
        return true;
    }
    const filePath = path.join(library_1.MUSIC_DIR, filename);
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end("Not Found");
        return true;
    }
    const coversCacheDir = path.join(library_1.MUSIC_DIR, ".covers");
    if (!fs.existsSync(coversCacheDir)) {
        fs.mkdirSync(coversCacheDir, { recursive: true });
    }
    const hash = crypto.createHash("md5").update(filename).digest("hex");
    const cachePath = path.join(coversCacheDir, `${hash}.jpg`);
    if (fs.existsSync(cachePath)) {
        const buffer = fs.readFileSync(cachePath);
        sendBuffer(res, buffer, "image/jpeg");
        return true;
    }
    (async () => {
        const cfg = (0, db_1.loadMusicConfig)();
        const oldHttpProxy = process.env.HTTP_PROXY;
        const oldHttpsProxy = process.env.HTTPS_PROXY;
        if (cfg.proxy) {
            process.env.HTTP_PROXY = cfg.proxy;
            process.env.HTTPS_PROXY = cfg.proxy;
        }
        const cleanProxy = () => {
            if (cfg.proxy) {
                if (oldHttpProxy)
                    process.env.HTTP_PROXY = oldHttpProxy;
                else
                    delete process.env.HTTP_PROXY;
                if (oldHttpsProxy)
                    process.env.HTTPS_PROXY = oldHttpsProxy;
                else
                    delete process.env.HTTPS_PROXY;
            }
        };
        const fallbackToDefault = () => {
            cleanProxy();
            sendDefaultCover(res, cachePath, hash);
        };
        try {
            const randomCover = await fetchRandomCover(4500);
            if (randomCover) {
                fs.writeFileSync(cachePath, randomCover.buffer);
                cleanProxy();
                sendBuffer(res, randomCover.buffer, randomCover.mimeType);
            }
            else {
                fallbackToDefault();
            }
        }
        catch {
            fallbackToDefault();
        }
    })();
    return true;
}
//# sourceMappingURL=cover.js.map