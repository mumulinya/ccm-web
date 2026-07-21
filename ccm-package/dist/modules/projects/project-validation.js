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
exports.PROJECT_PLATFORMS = exports.PROJECT_AGENT_TYPES = void 0;
exports.validateProjectName = validateProjectName;
exports.validateSessionId = validateSessionId;
exports.validateSharedFileName = validateSharedFileName;
exports.validateAgentType = validateAgentType;
exports.validateProjectPlatform = validateProjectPlatform;
exports.validateWorkDirectory = validateWorkDirectory;
exports.resolveContainedPath = resolveContainedPath;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const catalog_1 = require("../../agents/catalog");
const INVALID_PROJECT_CHARS = /[\\/:*?"<>|\u0000-\u001f]/;
const INVALID_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
exports.PROJECT_AGENT_TYPES = catalog_1.PROJECT_AGENT_TYPES;
exports.PROJECT_PLATFORMS = ["feishu", "lark", "weixin", "telegram", "slack", "discord"];
function validateProjectName(value) {
    const name = String(value ?? "");
    if (!name || name !== name.trim())
        throw new Error("项目名称不能为空，且首尾不能有空格");
    if (name.length > 80)
        throw new Error("项目名称不能超过 80 个字符");
    if (name === "." || name === ".." || name.includes(".."))
        throw new Error("项目名称不能包含连续句点");
    if (INVALID_PROJECT_CHARS.test(name) || INVALID_WINDOWS_NAMES.test(name) || /[. ]$/.test(name)) {
        throw new Error("项目名称包含不安全字符");
    }
    return name;
}
function validateSessionId(value) {
    const sessionId = String(value ?? "").trim();
    if (!SESSION_ID_PATTERN.test(sessionId) || sessionId === "." || sessionId === ".." || sessionId.includes("..")) {
        throw new Error("会话 ID 格式无效");
    }
    return sessionId;
}
function validateSharedFileName(value) {
    const name = String(value ?? "").trim();
    if (!name || name.length > 160 || /[\\/:*?"<>|\u0000-\u001f]/.test(name) || name === "." || name === ".." || name.includes("..")) {
        throw new Error("共享文件名称格式无效");
    }
    return name;
}
function validateAgentType(value, fallback = "claudecode") {
    const type = String(value || fallback).trim();
    if (!exports.PROJECT_AGENT_TYPES.includes(type))
        throw new Error("不支持的 Agent 类型");
    return type;
}
function validateProjectPlatform(value, fallback = "feishu") {
    const platform = String(value || fallback).trim();
    if (!exports.PROJECT_PLATFORMS.includes(platform))
        throw new Error("不支持的项目通道");
    return platform;
}
function validateWorkDirectory(value) {
    const workDir = String(value ?? "").trim();
    if (!workDir)
        throw new Error("项目目录不能为空");
    if (!path.isAbsolute(workDir))
        throw new Error("项目目录必须是绝对路径");
    const resolved = path.resolve(workDir);
    if (!fs.existsSync(resolved))
        throw new Error("项目目录不存在");
    if (!fs.statSync(resolved).isDirectory())
        throw new Error("项目目录不是文件夹");
    return resolved;
}
function resolveContainedPath(root, ...parts) {
    const resolvedRoot = path.resolve(root);
    const candidate = path.resolve(resolvedRoot, ...parts);
    const relative = path.relative(resolvedRoot, candidate);
    if (relative.startsWith("..") || path.isAbsolute(relative))
        throw new Error("路径超出允许范围");
    return candidate;
}
//# sourceMappingURL=project-validation.js.map