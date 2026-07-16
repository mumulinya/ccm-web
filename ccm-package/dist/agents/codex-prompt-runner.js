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
const [, , promptFile, developerInstructionsFile = "", encodedArgs = "W10="] = process.argv;
if (!promptFile)
    fail("Usage: codex-prompt-runner <prompt-file> <developer-instructions-file> <base64-json-args>");
function readRequiredFile(file, label) {
    try {
        return fs.readFileSync(file, "utf-8");
    }
    catch (error) {
        fail(`Failed to read ${label}: ${error?.message || error}`);
    }
}
let args = [];
try {
    const parsed = JSON.parse(Buffer.from(encodedArgs, "base64").toString("utf-8"));
    if (!Array.isArray(parsed))
        throw new Error("args must be an array");
    args = parsed.map(item => String(item));
}
catch (error) {
    fail(`Invalid Codex CLI arg payload: ${error?.message || error}`);
}
const prompt = readRequiredFile(promptFile, "prompt file");
if (developerInstructionsFile) {
    const instructions = readRequiredFile(developerInstructionsFile, "developer instructions file");
    if (!instructions.trim())
        fail("Developer instructions file is empty");
    const configArg = `developer_instructions=${JSON.stringify(instructions)}`;
    const insertionIndex = args[0] === "exec" && args[1] === "resume" ? 2 : 1;
    args.splice(insertionIndex, 0, "--config", configArg);
}
function resolveCodexLaunch() {
    if (process.platform !== "win32")
        return { command: "codex", prefixArgs: [], shell: false };
    const where = (0, child_process_1.spawnSync)("where.exe", ["codex"], { encoding: "utf-8", windowsHide: true, shell: false });
    const candidates = String(where.stdout || "").split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    for (const candidate of candidates) {
        if (/\.exe$/i.test(candidate))
            return { command: candidate, prefixArgs: [], shell: false };
        if (/\.cmd$/i.test(candidate)) {
            const npmEntry = path.join(path.dirname(candidate), "node_modules", "@openai", "codex", "bin", "codex.js");
            if (fs.existsSync(npmEntry))
                return { command: process.execPath, prefixArgs: [npmEntry], shell: false };
        }
    }
    const cmd = candidates.find(candidate => /\.cmd$/i.test(candidate)) || "codex.cmd";
    return { command: cmd, prefixArgs: [], shell: true };
}
const launch = resolveCodexLaunch();
const result = (0, child_process_1.spawnSync)(launch.command, [...launch.prefixArgs, ...args], {
    encoding: "utf-8",
    env: process.env,
    input: prompt,
    windowsHide: true,
    shell: launch.shell,
});
if (result.stdout)
    process.stdout.write(result.stdout);
if (result.stderr)
    process.stderr.write(result.stderr);
if (result.error)
    fail(result.error.message || String(result.error));
process.exit(result.status ?? 0);
//# sourceMappingURL=codex-prompt-runner.js.map