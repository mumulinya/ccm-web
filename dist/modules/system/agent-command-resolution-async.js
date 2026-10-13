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
exports.commandExistsAsync = commandExistsAsync;
exports.resolveWindowsCommandPathAsync = resolveWindowsCommandPathAsync;
exports.resolveAntigravityCliCommandAsync = resolveAntigravityCliCommandAsync;
exports.resolveClaudeCodeCommandAsync = resolveClaudeCodeCommandAsync;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
function locate(command) {
    return new Promise(resolve => {
        (0, child_process_1.execFile)(process.platform === 'win32' ? 'where.exe' : 'which', [command], { encoding: 'utf8', windowsHide: true, timeout: 5000, maxBuffer: 1024 * 1024 }, (error, stdout) => {
            resolve(error ? [] : stdout.split(/\r?\n/).map(value => value.trim()).filter(Boolean));
        });
    });
}
async function commandExistsAsync(command) {
    if (/[\\/]/.test(command)) {
        try {
            return (await fs.promises.stat(command)).isFile();
        }
        catch {
            return false;
        }
    }
    return (await locate(command)).length > 0;
}
async function resolveWindowsCommandPathAsync(command) {
    if (process.platform !== 'win32' || /[\\/]/.test(command))
        return command;
    const candidates = await locate(command);
    return candidates.find(value => /\.(?:exe|com|cmd|bat)$/i.test(value)) || candidates[0] || command;
}
async function resolveAntigravityCliCommandAsync() {
    const explicit = String(process.env.CCM_ANTIGRAVITY_CLI_COMMAND || '').trim();
    if (explicit)
        return explicit;
    if (await commandExistsAsync('agy'))
        return resolveWindowsCommandPathAsync('agy');
    if (process.platform === 'win32') {
        const local = String(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'));
        const candidate = path.join(local, 'agy', 'bin', 'agy.exe');
        if (await commandExistsAsync(candidate))
            return candidate;
    }
    return 'agy';
}
async function resolveClaudeCodeCommandAsync() {
    const explicit = String(process.env.CCM_CLAUDE_CODE_COMMAND || process.env.CCM_CLAUDE_COMMAND || "").trim();
    if (explicit && await commandExistsAsync(explicit))
        return explicit;
    if (await commandExistsAsync("claude"))
        return resolveWindowsCommandPathAsync("claude");
    if (process.platform === "win32") {
        const pathEntries = String(process.env.Path || process.env.PATH || "")
            .split(path.delimiter)
            .map(item => item.trim().replace(/^"|"$/g, ""))
            .filter(Boolean);
        for (const directory of pathEntries) {
            try {
                const bundledBinary = path.join(directory, "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe");
                if (await commandExistsAsync(bundledBinary))
                    return bundledBinary;
                const names = await fs.promises.readdir(directory);
                const candidate = names
                    .filter(name => /^(?:\.claude\.cmd|claude\.cmd|claude\.exe)(?:[-_][A-Za-z0-9]+)?$/i.test(name))
                    .sort((a, b) => {
                    const aStable = /^claude\.(?:cmd|exe)$/i.test(a) ? 0 : 1;
                    const bStable = /^claude\.(?:cmd|exe)$/i.test(b) ? 0 : 1;
                    return aStable - bStable || a.localeCompare(b);
                })[0];
                if (candidate) {
                    const resolved = path.join(directory, candidate);
                    if (await commandExistsAsync(resolved))
                        return resolved;
                }
            }
            catch { }
        }
        // Production CCM may be started from a service/scheduled process whose
        // environment contains only the machine PATH.  npm's user/global prefix
        // (for example D:\\npm) can therefore be absent even though the Claude
        // Code package is installed and usable.  Resolve the bundled executable
        // from stable Node/npm sibling locations before reporting the CLI missing.
        const nodeRoot = path.dirname(process.execPath);
        const candidateRoots = Array.from(new Set([
            String(process.env.NPM_CONFIG_PREFIX || process.env.npm_config_prefix || "").trim(),
            path.join(nodeRoot, "..", "npm"),
            path.join(nodeRoot, "..", "node_modules"),
            path.join(String(process.env.APPDATA || ""), "npm"),
            path.join(String(process.env.LOCALAPPDATA || ""), "npm"),
        ].filter(Boolean).map(item => path.resolve(item))));
        for (const root of candidateRoots) {
            const candidates = [
                path.join(root, "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe"),
                path.join(root, "@anthropic-ai", "claude-code", "bin", "claude.exe"),
            ];
            for (const candidate of candidates) {
                if (await commandExistsAsync(candidate))
                    return candidate;
            }
        }
    }
    return "claude";
}
//# sourceMappingURL=agent-command-resolution-async.js.map