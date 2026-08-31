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
exports.runReadonlyInspectionSandbox = runReadonlyInspectionSandbox;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const managed_process_tree_1 = require("../system/managed-process-tree");
const ROOT = path.join(process.env.CCM_INSPECTION_SANDBOX_DIR || path.join(os.homedir(), ".ccm"), "inspection-sandboxes");
const EXCLUDED = new Set([".git", "node_modules", "dist", "build", "coverage", ".next", ".nuxt", ".output", "target", ".venv", "venv"]);
const SENSITIVE = /(?:^|[-_.])(?:credentials?|secrets?|private[-_.]?key|access[-_.]?key|service[-_.]?account)(?:[-_.]|$)|^\.env(?:\.|$)|^\.(?:npmrc|pypirc|netrc)$|\.(?:pem|p12|pfx|key|keystore|jks)$/i;
function hash(value) { return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex"); }
function run(executable, args, cwd, signal, timeoutMs = 30_000) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted)
            return reject(Object.assign(new Error("只读诊断沙箱已取消"), { code: "ABORT_ERR" }));
        const child = (0, child_process_1.spawn)(executable, args, {
            cwd,
            shell: false,
            windowsHide: true,
            detached: process.platform !== "win32",
            env: {
                PATH: process.env.PATH || "",
                SystemRoot: process.env.SystemRoot || "",
                WINDIR: process.env.WINDIR || "",
                HOME: cwd,
                USERPROFILE: cwd,
                GIT_CONFIG_NOSYSTEM: "1",
                GIT_TERMINAL_PROMPT: "0",
                GIT_ASKPASS: "",
                NO_PROXY: "*",
                HTTP_PROXY: "http://127.0.0.1:9",
                HTTPS_PROXY: "http://127.0.0.1:9",
            },
            stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        let settled = false;
        let timedOut = false;
        const finish = (error, code = -1) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            signal?.removeEventListener("abort", abort);
            if (error)
                reject(error);
            else
                resolve({ exitCode: code, stdout, stderr, timedOut });
        };
        const stop = async () => { if (child.pid)
            await (0, managed_process_tree_1.terminateManagedProcessTree)(child, { gracefulTimeoutMs: 250, forceTimeoutMs: 1_500 }); };
        const abort = () => { void stop().finally(() => finish(Object.assign(new Error("只读诊断沙箱已取消"), { code: "ABORT_ERR" }))); };
        const timer = setTimeout(() => { timedOut = true; void stop(); }, Math.max(500, timeoutMs));
        timer.unref?.();
        signal?.addEventListener("abort", abort, { once: true });
        child.stdout?.on("data", chunk => { stdout += String(chunk); });
        child.stderr?.on("data", chunk => { stderr += String(chunk); });
        child.once("error", error => finish(error));
        child.once("close", code => finish(undefined, Number(code ?? -1)));
    });
}
function safeCopyTree(source, target) {
    const stack = [{ source, target }];
    while (stack.length) {
        const row = stack.pop();
        fs.mkdirSync(row.target, { recursive: true });
        for (const entry of fs.readdirSync(row.source, { withFileTypes: true })) {
            if (entry.isSymbolicLink() || EXCLUDED.has(entry.name.toLowerCase()) || SENSITIVE.test(entry.name))
                continue;
            const from = path.join(row.source, entry.name);
            const to = path.join(row.target, entry.name);
            if (entry.isDirectory())
                stack.push({ source: from, target: to });
            else if (entry.isFile())
                fs.copyFileSync(from, to);
        }
    }
}
function safeRemoveSnapshot(snapshot) {
    const base = path.resolve(ROOT);
    const target = path.resolve(snapshot);
    if (path.dirname(target) !== base || !path.basename(target).startsWith("snapshot-"))
        throw new Error("拒绝清理非诊断沙箱目录");
    fs.rmSync(target, { recursive: true, force: true });
}
async function createSnapshot(sourceRoot, signal) {
    if (signal?.aborted)
        throw Object.assign(new Error("只读诊断沙箱已取消"), { code: "ABORT_ERR" });
    fs.mkdirSync(ROOT, { recursive: true });
    const snapshot = fs.mkdtempSync(path.join(ROOT, "snapshot-"));
    let git = false;
    if (fs.existsSync(path.join(sourceRoot, ".git"))) {
        const cloned = await run("git", ["clone", "--shared", "--no-hardlinks", "--no-checkout", "--", sourceRoot, snapshot], ROOT, signal, 30_000).catch(() => null);
        if (cloned?.exitCode === 0) {
            git = true;
            await run("git", ["checkout", "--force", "HEAD", "--"], snapshot, signal, 30_000).catch(() => null);
            for (const entry of fs.readdirSync(snapshot, { withFileTypes: true }))
                if (entry.name !== ".git")
                    fs.rmSync(path.join(snapshot, entry.name), { recursive: true, force: true });
        }
    }
    safeCopyTree(sourceRoot, snapshot);
    return { snapshot, git };
}
function snapshotState(root) {
    const rows = [];
    const stack = [root];
    while (stack.length && rows.length < 100_000) {
        const dir = stack.pop();
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name === ".git" || entry.isSymbolicLink())
                continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory())
                stack.push(full);
            else if (entry.isFile()) {
                const stat = fs.statSync(full);
                rows.push([path.relative(root, full).replace(/\\/g, "/"), stat.size, Math.floor(stat.mtimeMs)]);
            }
        }
    }
    return hash(rows.sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}
async function runReadonlyInspectionSandbox(input) {
    const created = await createSnapshot(fs.realpathSync(input.sourceRoot), input.signal);
    const before = snapshotState(created.snapshot);
    try {
        const result = await run(input.executable, input.args, created.snapshot, input.signal, input.timeoutMs);
        const after = snapshotState(created.snapshot);
        const workspaceMutationDetected = before !== after;
        const rawOut = Buffer.from(result.stdout);
        const rawErr = Buffer.from(result.stderr);
        const truncated = rawOut.length > input.maxBytes || rawErr.length > input.maxBytes;
        const receipt = {
            schema: "ccm-readonly-inspection-sandbox-receipt-v1",
            projectId: input.projectId,
            repoStateChecksum: input.repoStateChecksum,
            snapshotChecksum: hash({ before, projectId: input.projectId, repoStateChecksum: input.repoStateChecksum }),
            containment: "os_isolated",
            networkAllowed: false,
            workspaceMutationDetected,
            resourceLimitExceeded: result.timedOut || truncated,
            contentStored: false,
        };
        return {
            exitCode: result.exitCode,
            stdout: rawOut.subarray(0, input.maxBytes).toString("utf8"),
            stderr: rawErr.subarray(0, input.maxBytes).toString("utf8"),
            durationMs: 0,
            truncated,
            workspaceChanged: workspaceMutationDetected,
            sandboxReceipt: receipt,
        };
    }
    finally {
        safeRemoveSnapshot(created.snapshot);
    }
}
//# sourceMappingURL=readonly-inspection-sandbox.js.map