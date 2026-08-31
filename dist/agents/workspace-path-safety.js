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
exports.isWindowsReservedDevicePath = isWindowsReservedDevicePath;
exports.extractPorcelainPath = extractPorcelainPath;
exports.reservedPathsFromPorcelain = reservedPathsFromPorcelain;
exports.safeRelativePath = safeRelativePath;
const path = __importStar(require("path"));
// Windows device names are not valid repository paths.  Native agents can
// accidentally create one (for example `nul`) while running a shell command;
// Git then fails while staging the otherwise valid delivery.  Keep this check
// independent from the database so it can also be used by recovery code.
const WINDOWS_DEVICE_BASENAMES = /^(?:CON|PRN|AUX|NUL|CLOCK\$|COM[1-9]|LPT[1-9])(?:\..*)?$/i;
function isWindowsReservedDevicePath(value) {
    const normalized = String(value || "").replace(/\\/g, "/");
    return normalized.split("/").some(segment => {
        const basename = segment.replace(/[ .]+$/g, "");
        return WINDOWS_DEVICE_BASENAMES.test(basename);
    });
}
function extractPorcelainPath(line) {
    const raw = String(line || "").slice(3).trim();
    if (!raw)
        return "";
    // For renames Git prints `old -> new`; the new path is the one that must be
    // excluded from an add operation.
    return (raw.includes(" -> ") ? raw.split(" -> ").pop() : raw).trim().replace(/\\/g, "/");
}
function reservedPathsFromPorcelain(status) {
    return String(status || "")
        .split(/\r?\n/)
        .filter(Boolean)
        .map(extractPorcelainPath)
        .filter(filePath => filePath && isWindowsReservedDevicePath(filePath));
}
function safeRelativePath(value) {
    const normalized = String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
    if (!normalized || path.posix.isAbsolute(normalized) || normalized === ".." || normalized.startsWith("../") || normalized.includes("/../"))
        return "";
    return normalized;
}
//# sourceMappingURL=workspace-path-safety.js.map