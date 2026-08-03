#!/usr/bin/env node
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
function fail(message, code = 1) {
    process.stderr.write(`${message}\n`);
    process.exit(code);
}
const [, , promptFile, command, encodedArgs = "W10="] = process.argv;
if (!promptFile || !command)
    fail("Usage: cli-prompt-runner <prompt-file> <command> <base64-json-args>");
let args = [];
try {
    const parsed = JSON.parse(Buffer.from(encodedArgs, "base64").toString("utf-8"));
    if (!Array.isArray(parsed))
        throw new Error("args must be an array");
    args = parsed.map(item => String(item));
}
catch (error) {
    fail(`Invalid CLI arg payload: ${error?.message || error}`);
}
let prompt = "";
try {
    prompt = fs.readFileSync(promptFile, "utf-8");
}
catch (error) {
    fail(`Failed to read prompt file: ${error?.message || error}`);
}
function resolveCommand(value) {
    if (process.platform !== "win32" || /[\\/]/.test(value) || /\.[a-z0-9]+$/i.test(value))
        return value;
    const where = (0, child_process_1.spawnSync)("where.exe", [value], {
        encoding: "utf-8",
        windowsHide: true,
        shell: false,
    });
    const candidates = String(where.stdout || "").split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    // npm on Windows installs both an extensionless POSIX shim and a .cmd shim.
    // Node cannot execute the former directly, even though where.exe lists it first.
    return candidates.find(candidate => /\.(?:exe|com|cmd|bat)$/i.test(candidate)) || candidates[0] || value;
}
const resolvedCommand = resolveCommand(command);
function resolveLaunch(commandPath) {
    if (process.platform !== "win32" || !/\.(?:cmd|bat)$/i.test(commandPath)) {
        return { command: commandPath, prefixArgs: [] };
    }
    let source = "";
    try {
        source = fs.readFileSync(commandPath, "utf-8");
    }
    catch { }
    const shimDir = path.dirname(commandPath);
    // npm command shims forward `%*` through cmd.exe. Using shell:true around
    // those shims reparses a prompt containing spaces and turns it into several
    // positional arguments. Resolve the generated shim to its real entrypoint so
    // every argv item reaches the CLI unchanged.
    const nodeEntry = source.match(/["']?%(?:dp0|SCRIPT_DIR)%[\\/]([^"'\r\n]+?\.js)["']?\s+%\*/i)?.[1];
    if (nodeEntry) {
        return {
            command: process.execPath,
            prefixArgs: [path.resolve(shimDir, nodeEntry.replace(/[\\/]+/g, path.sep))],
        };
    }
    const executableEntry = source.match(/["']?%(?:dp0|SCRIPT_DIR)%[\\/]([^"'\r\n]+?\.(?:exe|com))["']?\s+%\*/i)?.[1];
    if (executableEntry) {
        return {
            command: path.resolve(shimDir, executableEntry.replace(/[\\/]+/g, path.sep)),
            prefixArgs: [],
        };
    }
    const powershellEntry = source.match(/-File\s+["']?%(?:dp0|SCRIPT_DIR)%[\\/]([^"'\r\n]+?\.ps1)["']?\s+%\*/i)?.[1];
    if (powershellEntry) {
        return {
            command: path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
            prefixArgs: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.resolve(shimDir, powershellEntry.replace(/[\\/]+/g, path.sep))],
        };
    }
    fail(`Unsupported Windows command shim: ${path.basename(commandPath)}`);
    return { command: commandPath, prefixArgs: [] };
}
const launch = resolveLaunch(resolvedCommand);
const result = (0, child_process_1.spawnSync)(launch.command, [...launch.prefixArgs, ...args, prompt], {
    encoding: "utf-8",
    env: process.env,
    windowsHide: true,
    shell: false,
});
if (result.stdout)
    process.stdout.write(result.stdout);
if (result.stderr)
    process.stderr.write(result.stderr);
if (result.error)
    fail(result.error.message || String(result.error));
process.exit(result.status ?? 0);
//# sourceMappingURL=cli-prompt-runner.js.map