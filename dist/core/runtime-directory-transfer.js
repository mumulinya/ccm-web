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
exports.samePath = exports.pathKey = void 0;
exports.insidePath = insidePath;
exports.canonicalDirectory = canonicalDirectory;
exports.looksLikeCcm = looksLikeCcm;
exports.scanData = scanData;
exports.validateDirectory = validateDirectory;
exports.copyAndVerify = copyAndVerify;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const promises_1 = require("stream/promises");
const stream_1 = require("stream");
const runtime_directory_config_1 = require("./runtime-directory-config");
const pathKey = (p) => process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p);
exports.pathKey = pathKey;
const samePath = (a, b) => (0, exports.pathKey)(a) === (0, exports.pathKey)(b);
exports.samePath = samePath;
function insidePath(child, parent) {
    const relative = path.relative((0, exports.pathKey)(parent), (0, exports.pathKey)(child));
    return !relative || relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
function canonicalDirectory(value) {
    if (typeof value !== 'string' || !value.trim() || value.includes('\0') || value.length > 32767 || !path.isAbsolute(value))
        throw new Error('请输入有效的绝对目录路径');
    if (process.platform === 'win32' && value.trim().startsWith('\\\\'))
        throw new Error('请使用本机磁盘常规路径，不支持网络共享或设备路径');
    const resolved = path.resolve(value.trim());
    let existing = resolved;
    while (!fs.existsSync(existing) && path.dirname(existing) !== existing)
        existing = path.dirname(existing);
    // Junctions and symlinks are resolved before any containment decisions.
    const real = fs.realpathSync.native(existing);
    return path.resolve(real, path.relative(existing, resolved));
}
function looksLikeCcm(directory) {
    return fs.existsSync(path.join(directory, 'ccm.db')) || fs.existsSync(path.join(directory, 'auth/users.json')) || fs.existsSync(path.join(directory, 'project-configs.json'));
}
const transient = (relative) => {
    const value = relative.replace(/\\/g, '/');
    return value === 'run/ccm-server-instance.lock' || value === 'run/data-directory-reservation.json' || value.startsWith('pids/') || value === 'updates/desktop-preparation.json'
        || value === 'updates/data-directory-preparation.json' || /(?:\.lock|\.sock|\.tmp)$/.test(value);
};
function scanData(directory, relative = '', files = []) {
    if (!fs.existsSync(directory))
        return files;
    for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
        const rel = path.join(relative, entry.name);
        if (transient(rel))
            continue;
        const file = path.join(directory, rel), stat = fs.lstatSync(file);
        if (stat.isSymbolicLink())
            throw new Error(`请先移除数据目录内的链接或 Junction：${rel}`);
        if (stat.isDirectory())
            scanData(directory, rel, files);
        else if (stat.isFile())
            files.push({ path: rel, bytes: stat.size });
        else
            throw new Error(`不支持迁移的特殊文件：${rel}`);
    }
    return files;
}
function validateDirectory(targetInput, source, options = {}) {
    const target = canonicalDirectory(targetInput), current = canonicalDirectory(source);
    if ((0, exports.samePath)(target, path.parse(target).root))
        throw new Error('不能使用磁盘根目录');
    if (insidePath(target, current) || insidePath(current, target))
        throw new Error('目标不能是当前数据目录、其子目录或父目录');
    const packageRoot = options.packageRoot || path.resolve(__dirname, '../..');
    for (const forbidden of [packageRoot, process.env.WINDIR, process.env.ProgramFiles, process.env['ProgramFiles(x86)'], ...(process.platform === 'win32' ? [] : ['/etc', '/usr', '/bin', '/sbin', '/proc', '/sys', '/dev'])].filter(Boolean)) {
        if (insidePath(target, forbidden))
            throw new Error('不能使用系统目录或 CCM 安装目录');
    }
    if (insidePath((0, runtime_directory_config_1.runtimeConfigFile)(), target) || insidePath((0, runtime_directory_config_1.runtimeConfigFile)(), current))
        throw new Error('启动配置必须保存在活动数据目录之外');
    if (process.platform === 'win32' && target.startsWith('\\\\'))
        throw new Error('首版数据迁移仅支持本机磁盘，不支持网络共享');
    let parent = target;
    while (!fs.existsSync(parent))
        parent = path.dirname(parent);
    if (!fs.statSync(parent).isDirectory())
        throw new Error('目标路径不是文件夹');
    fs.accessSync(parent, fs.constants.R_OK | fs.constants.W_OK);
    // Probe the nearest existing parent, never create the user's target during validation.
    const probe = path.join(parent, `.ccm-write-probe-${crypto.randomUUID()}`);
    try {
        fs.writeFileSync(probe, '', { flag: 'wx', mode: 0o600 });
    }
    finally {
        if (fs.existsSync(probe))
            fs.unlinkSync(probe);
    }
    const entries = fs.existsSync(target) ? fs.readdirSync(target) : [];
    const existingCcmData = !!entries.length && looksLikeCcm(target);
    if (entries.length && (!options.allowExisting || !existingCcmData))
        throw new Error(existingCcmData ? '目标已有 CCM 数据，请选择使用现有数据；迁移不会覆盖已有数据' : '请选择空目录，不能覆盖其他文件');
    const files = scanData(current), estimatedBytes = files.reduce((sum, file) => sum + file.bytes, 0);
    const stats = fs.statfsSync(parent), freeBytes = Number(stats.bavail) * Number(stats.bsize);
    if (freeBytes < estimatedBytes + 64 * 1024 * 1024)
        throw new Error('目标磁盘可用空间不足（需预留至少 64 MiB）');
    return { source: current, target, exists: fs.existsSync(target), existingCcmData, estimatedBytes, files: files.length, freeBytes, writable: true };
}
async function hashFile(file) {
    const hash = crypto.createHash('sha256');
    for await (const chunk of fs.createReadStream(file))
        hash.update(chunk);
    return hash.digest('hex');
}
async function copyAndVerify(source, staging, onProgress = () => { }) {
    const entries = scanData(source), manifest = [];
    let bytes = 0;
    for (const entry of entries) {
        const from = path.join(source, entry.path), to = path.join(staging, entry.path);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        const hash = crypto.createHash('sha256');
        await (0, promises_1.pipeline)(fs.createReadStream(from), new stream_1.Transform({ transform(chunk, _encoding, callback) { hash.update(chunk); callback(null, chunk); } }), fs.createWriteStream(to, { flags: 'wx', mode: 0o600 }));
        const sha256 = hash.digest('hex');
        if (sha256 !== await hashFile(to) || sha256 !== await hashFile(from) || fs.statSync(to).size !== entry.bytes)
            throw new Error(`复制校验失败：${entry.path}`);
        manifest.push({ ...entry, sha256 });
        bytes += entry.bytes;
        onProgress(manifest.length, bytes);
    }
    if (JSON.stringify(scanData(source)) !== JSON.stringify(entries))
        throw new Error('复制期间源数据发生变化，取消切换');
    (0, runtime_directory_config_1.atomicJson)(path.join(staging, 'migration-manifest.json'), { schema: 'ccm-runtime-directory-manifest-v1', source, createdAt: new Date().toISOString(), files: manifest });
    return { copiedFiles: entries.length, copiedBytes: bytes, manifest };
}
//# sourceMappingURL=runtime-directory-transfer.js.map