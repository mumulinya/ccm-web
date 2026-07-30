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
exports.getProcessIdentityFingerprint = getProcessIdentityFingerprint;
exports.acquireCcmServerInstanceLock = acquireCcmServerInstanceLock;
exports.releaseCcmServerInstanceLock = releaseCcmServerInstanceLock;
exports.inspectCcmServerInstanceLock = inspectCcmServerInstanceLock;
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
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
function sha256(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}
function executableIdentity(pid) {
    try {
        if (process.platform === "win32") {
            const script = [
                `$p=Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}"`,
                "if($null -eq $p){exit 3}",
                "$v=[ordered]@{created=$p.CreationDate.ToUniversalTime().ToString('o');executable=$p.ExecutablePath;command=$p.CommandLine}|ConvertTo-Json -Compress",
                "Write-Output $v",
            ].join(";");
            return String((0, child_process_1.execFileSync)("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
                encoding: "utf-8",
                windowsHide: true,
                timeout: 4_000,
            })).trim();
        }
        return String((0, child_process_1.execFileSync)("ps", ["-p", String(pid), "-o", "lstart=", "-o", "command="], {
            encoding: "utf-8",
            timeout: 4_000,
        })).trim();
    }
    catch {
        return "";
    }
}
function getProcessIdentityFingerprint(pid = process.pid) {
    const identity = executableIdentity(pid);
    return identity ? sha256(identity) : "";
}
function entryIdentity() {
    const entryPath = path.resolve(process.argv[1] || "");
    try {
        const stat = fs.lstatSync(entryPath);
        if (!stat.isFile() || stat.isSymbolicLink())
            return { entryPath, checksum: "" };
        return { entryPath, checksum: sha256(fs.readFileSync(entryPath)) };
    }
    catch {
        return { entryPath, checksum: "" };
    }
}
function getLockFile() {
    if (process.env.CCM_SERVER_LOCK_FILE)
        return path.resolve(process.env.CCM_SERVER_LOCK_FILE);
    const storeDir = path.resolve(process.env.CCM_TASK_STORE_DIR || path.join(os.homedir(), ".cc-connect"));
    return path.join(storeDir, "run", "ccm-server-instance.lock");
}
function readOwner(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return null;
    }
}
function archiveDeadLock(file) {
    if (!fs.existsSync(file))
        return true;
    const owner = readOwner(file);
    const localOwner = !owner?.hostname || String(owner.hostname) === os.hostname();
    if (!localOwner || processAlive(Number(owner?.pid || 0)))
        return false;
    try {
        const archiveDir = path.join(path.dirname(file), "stale");
        fs.mkdirSync(archiveDir, { recursive: true });
        const archive = path.join(archiveDir, `${path.basename(file)}.${Date.now()}.${crypto.randomBytes(3).toString("hex")}.json`);
        fs.renameSync(file, archive);
        return true;
    }
    catch {
        return false;
    }
}
function acquireCcmServerInstanceLock(port, listenHost = "127.0.0.1", options = {}) {
    const file = getLockFile();
    const entry = entryIdentity();
    const token = crypto.randomBytes(24).toString("hex");
    const identity = {
        schema: "ccm-service-instance-v2",
        instance_id: `ccmi_${Date.now().toString(36)}_${crypto.randomBytes(8).toString("hex")}`,
        boot_id: String(options.bootId || `boot_${os.hostname()}_${process.pid}_${crypto.randomBytes(6).toString("hex")}`),
        token,
        pid: process.pid,
        process_fingerprint: getProcessIdentityFingerprint(process.pid),
        entry_checksum: entry.checksum,
        entry_path: entry.entryPath,
        port,
        listen_host: listenHost,
        public_origin: String(options.publicOrigin || ""),
        launch_mode: options.launchMode || "unknown",
        package_version: String(options.packageVersion || ""),
        hostname: os.hostname(),
        acquired_at: new Date().toISOString(),
        data_directory: path.dirname(path.dirname(file)),
    };
    if (!identity.process_fingerprint || !identity.entry_checksum) {
        throw new Error("无法建立可核验的 CCM 进程身份，拒绝启动");
    }
    if (process.env.CCM_ALLOW_SHARED_DATA_DIR === "1") {
        return { bypassed: true, file, token, pid: process.pid, port, listenHost, identity };
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const fd = fs.openSync(file, "wx", 0o600);
            try {
                fs.writeFileSync(fd, `${JSON.stringify(identity, null, 2)}\n`, "utf-8");
                fs.fsyncSync(fd);
            }
            finally {
                fs.closeSync(fd);
            }
            return { file, token, pid: process.pid, port, listenHost, identity };
        }
        catch (error) {
            if (error?.code !== "EEXIST")
                throw error;
            if (attempt === 0 && archiveDeadLock(file))
                continue;
            const current = readOwner(file) || {};
            const ownership = processAlive(Number(current.pid || 0)) ? "ownership_unproven" : "stale_lock_unrecoverable";
            const next = new Error(`同一数据目录已有CCM实例记录`
                + `${current.pid ? `（PID ${current.pid}` : ""}`
                + `${current.port ? `，端口 ${current.port}` : ""}`
                + `${current.pid ? "）" : ""}，状态：${ownership}`);
            next.code = ownership;
            throw next;
        }
    }
    throw new Error("无法获取 CCM 数据目录实例锁");
}
function releaseCcmServerInstanceLock(lock) {
    if (!lock || lock.bypassed)
        return false;
    const current = readOwner(lock.file);
    if (!current
        || String(current.schema || "") !== "ccm-service-instance-v2"
        || String(current.instance_id || "") !== lock.identity.instance_id
        || String(current.token || "") !== lock.token
        || Number(current.pid || 0) !== lock.pid)
        return false;
    try {
        fs.unlinkSync(lock.file);
        return true;
    }
    catch {
        return false;
    }
}
function inspectCcmServerInstanceLock() {
    const file = getLockFile();
    const owner = readOwner(file);
    const alive = !!owner && String(owner.hostname || "") === os.hostname() && processAlive(Number(owner.pid || 0));
    const fingerprint = alive ? getProcessIdentityFingerprint(Number(owner.pid || 0)) : "";
    const identityVerified = !!(alive
        && owner?.schema === "ccm-service-instance-v2"
        && owner?.process_fingerprint
        && fingerprint
        && fingerprint === owner.process_fingerprint);
    return {
        file,
        present: fs.existsSync(file),
        owner,
        active: identityVerified,
        process_alive: alive,
        identity_verified: identityVerified,
        ownership_state: identityVerified ? "verified" : alive ? "ownership_unproven" : owner ? "stale" : "absent",
    };
}
//# sourceMappingURL=server-instance-lock.js.map