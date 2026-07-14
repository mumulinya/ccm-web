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
exports.acquireFileLock = acquireFileLock;
exports.releaseFileLock = releaseFileLock;
exports.withFileLock = withFileLock;
exports.writeJsonAtomic = writeJsonAtomic;
exports.readJsonWithBackup = readJsonWithBackup;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const RETRYABLE_FILE_CODES = new Set(["EACCES", "EBUSY", "EEXIST", "ENOENT", "EPERM"]);
const sleepArray = new Int32Array(new SharedArrayBuffer(4));
function sleep(ms) {
    Atomics.wait(sleepArray, 0, 0, Math.max(1, ms));
}
function processAlive(pid) {
    if (!Number.isFinite(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function readLock(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return null;
    }
}
function removeStaleLock(file, staleMs) {
    const owner = readLock(file);
    let ageMs = Number.POSITIVE_INFINITY;
    try {
        ageMs = Date.now() - fs.statSync(file).mtimeMs;
    }
    catch { }
    const localOwner = String(owner?.hostname || "") === os.hostname();
    const stale = owner
        ? (!!owner.released_at || (localOwner ? !processAlive(Number(owner.pid || 0)) : ageMs >= staleMs))
        : ageMs >= staleMs;
    if (!stale)
        return false;
    try {
        fs.unlinkSync(file);
        return true;
    }
    catch {
        return false;
    }
}
function acquireFileLock(targetFile, options = {}) {
    const file = `${targetFile}.lock`;
    const timeoutMs = Math.max(1, Number(options.timeoutMs || 30_000));
    const retryMs = Math.max(1, Number(options.retryMs || 25));
    const staleMs = Math.max(1_000, Number(options.staleMs || 5 * 60_000));
    const deadline = Date.now() + timeoutMs;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    while (Date.now() <= deadline) {
        const token = crypto.randomBytes(16).toString("hex");
        try {
            const fd = fs.openSync(file, "wx", 0o600);
            try {
                fs.writeFileSync(fd, `${JSON.stringify({
                    schema: "ccm-exclusive-file-lock-v1",
                    token,
                    pid: process.pid,
                    hostname: os.hostname(),
                    acquired_at: new Date().toISOString(),
                })}\n`, "utf-8");
                fs.fsyncSync(fd);
            }
            finally {
                fs.closeSync(fd);
            }
            return { file, token, pid: process.pid };
        }
        catch (error) {
            if (String(error?.code || "") !== "EEXIST")
                throw error;
            removeStaleLock(file, staleMs);
            sleep(retryMs);
        }
    }
    const owner = readLock(file);
    throw new Error(`file lock timeout: ${targetFile}${owner?.pid ? ` (owner pid ${owner.pid})` : ""}`);
}
function releaseFileLock(handle) {
    const owner = readLock(handle.file);
    if (!owner || owner.token !== handle.token || Number(owner.pid || 0) !== handle.pid)
        return false;
    for (let attempt = 0; attempt < 12; attempt += 1) {
        try {
            fs.unlinkSync(handle.file);
            return true;
        }
        catch (error) {
            if (!RETRYABLE_FILE_CODES.has(String(error?.code || "")))
                break;
            sleep(10 * (attempt + 1));
        }
    }
    try {
        fs.writeFileSync(handle.file, `${JSON.stringify({ ...owner, released_at: new Date().toISOString() })}\n`, "utf-8");
    }
    catch { }
    return false;
}
function withFileLock(targetFile, operation, options = {}) {
    const handle = acquireFileLock(targetFile, options);
    try {
        return operation();
    }
    finally {
        releaseFileLock(handle);
    }
}
function renameWithRetry(source, target, attempts = 12) {
    let lastError = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            fs.renameSync(source, target);
            return;
        }
        catch (error) {
            lastError = error;
            if (!RETRYABLE_FILE_CODES.has(String(error?.code || "")))
                throw error;
            sleep(20 * (attempt + 1));
        }
    }
    throw lastError || new Error(`unable to rename ${source}`);
}
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const nonce = `${process.pid}.${Date.now()}.${crypto.randomBytes(5).toString("hex")}`;
    const temp = `${file}.${nonce}.tmp`;
    const displaced = `${file}.${nonce}.replace-backup`;
    const content = `${JSON.stringify(value, null, 2)}\n`;
    let fd = null;
    try {
        fd = fs.openSync(temp, "wx", 0o600);
        fs.writeFileSync(fd, content, "utf-8");
        fs.fsyncSync(fd);
    }
    finally {
        if (fd !== null)
            fs.closeSync(fd);
    }
    if (fs.existsSync(file)) {
        try {
            JSON.parse(fs.readFileSync(file, "utf-8"));
            fs.copyFileSync(file, `${file}.bak`);
        }
        catch { }
    }
    try {
        renameWithRetry(temp, file);
        return;
    }
    catch (replaceError) {
        // Windows can keep an existing target briefly locked. Preserve it while
        // moving the fully flushed replacement into the now-vacant pathname.
        let displacedExisting = false;
        try {
            if (fs.existsSync(file)) {
                renameWithRetry(file, displaced);
                displacedExisting = true;
            }
            renameWithRetry(temp, file);
            if (displacedExisting) {
                try {
                    fs.unlinkSync(displaced);
                }
                catch { }
            }
            return;
        }
        catch (fallbackError) {
            if (displacedExisting && !fs.existsSync(file) && fs.existsSync(displaced)) {
                try {
                    renameWithRetry(displaced, file);
                }
                catch { }
            }
            throw fallbackError || replaceError;
        }
        finally {
            try {
                if (fs.existsSync(temp))
                    fs.unlinkSync(temp);
            }
            catch { }
            try {
                if (fs.existsSync(displaced) && fs.existsSync(file))
                    fs.unlinkSync(displaced);
            }
            catch { }
        }
    }
}
function readJsonWithBackup(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch { }
    try {
        return JSON.parse(fs.readFileSync(`${file}.bak`, "utf-8"));
    }
    catch { }
    return fallback;
}
//# sourceMappingURL=atomic-json-file.js.map