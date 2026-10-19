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
exports.RUNTIME_CONFIG_SCHEMA = exports.DEFAULT_DATA_DIRECTORY = void 0;
exports.runtimeConfigFile = runtimeConfigFile;
exports.readJson = readJson;
exports.atomicJson = atomicJson;
exports.readDirectoryConfig = readDirectoryConfig;
exports.writeDirectoryConfig = writeDirectoryConfig;
exports.resolveDataDirectory = resolveDataDirectory;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
exports.DEFAULT_DATA_DIRECTORY = path.join(os.homedir(), '.ccm');
exports.RUNTIME_CONFIG_SCHEMA = 'ccm-runtime-config-v1';
function runtimeConfigFile() {
    return path.resolve(process.env.CCM_RUNTIME_CONFIG_FILE || path.join(process.env.APPDATA || process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'CCM', 'runtime-config.json'));
}
function readJson(file, fallback = null) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return fallback;
        throw new Error(`配置文件损坏或不可读：${file}`);
    }
}
function atomicJson(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    try {
        const fd = fs.openSync(temporary, 'wx', 0o600);
        try {
            fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n');
            fs.fsyncSync(fd);
        }
        finally {
            fs.closeSync(fd);
        }
        fs.renameSync(temporary, file);
    }
    finally {
        if (fs.existsSync(temporary))
            fs.unlinkSync(temporary);
    }
}
function readDirectoryConfig(file = runtimeConfigFile()) {
    const config = readJson(file);
    if (!config)
        return null;
    if (config.schema !== exports.RUNTIME_CONFIG_SCHEMA || typeof config.dataDirectory !== 'string' || !path.isAbsolute(config.dataDirectory))
        throw new Error('CCM 数据目录配置无效，请修复启动配置');
    return config;
}
function writeDirectoryConfig(directory, file = runtimeConfigFile()) {
    if (!path.isAbsolute(directory))
        throw new Error('数据目录必须为绝对路径');
    const config = { schema: exports.RUNTIME_CONFIG_SCHEMA, dataDirectory: path.resolve(directory), updatedAt: new Date().toISOString() };
    atomicJson(file, config);
    return config;
}
function resolveDataDirectory() {
    return path.resolve(process.env.CCM_TASK_STORE_DIR || readDirectoryConfig()?.dataDirectory || exports.DEFAULT_DATA_DIRECTORY);
}
//# sourceMappingURL=runtime-directory-config.js.map