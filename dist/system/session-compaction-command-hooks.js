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
exports.listSessionCompactionCommandHooks = listSessionCompactionCommandHooks;
exports.saveSessionCompactionCommandHook = saveSessionCompactionCommandHook;
exports.deleteSessionCompactionCommandHook = deleteSessionCompactionCommandHook;
exports.readSessionCompactionCommandHookReceipts = readSessionCompactionCommandHookReceipts;
exports.projectSessionCompactionHookResults = projectSessionCompactionHookResults;
exports.runConfiguredSessionCompactionCommandHooks = runConfiguredSessionCompactionCommandHooks;
exports.inspectSessionCompactionHookCommand = inspectSessionCompactionHookCommand;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const utils_1 = require("../core/utils");
const db_1 = require("../core/db");
const atomic_json_file_1 = require("../core/atomic-json-file");
const storage_1 = require("../modules/collaboration/storage");
const managed_process_tree_1 = require("./managed-process-tree");
const CONFIG_FILE = path.join(utils_1.CCM_DIR, "session-compaction-hooks.json");
const RECEIPT_DIR = path.join(utils_1.CCM_DIR, "context-accounting", "session-compaction-hooks");
const SAFE_BINARIES = new Set(["rg", "rg.exe", "git", "git.exe"]);
const FORBIDDEN = /[|&;><`]|\$\(|\r|\n/;
function digest(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function configs() {
    const value = (0, atomic_json_file_1.readJsonWithBackup)(CONFIG_FILE, { schema: "ccm-session-compaction-hook-config-store-v1", hooks: [] });
    return Array.isArray(value?.hooks) ? value.hooks : [];
}
function safeConfig(input) {
    const scope = input?.scope === "group" || input?.scope === "project" ? input.scope : "global";
    const phase = input?.phase === "session_start" || input?.phase === "post_compact" ? input.phase : "pre_compact";
    const command = String(input?.command || "").trim();
    if (!command || command.length > 2_000)
        throw new Error("compaction_hook_command_invalid");
    const id = String(input?.id || `sch_${digest([scope, phase, input?.name, command, Date.now()]).slice(0, 20)}`).trim();
    if (!/^sch_[a-zA-Z0-9_-]{6,64}$/.test(id))
        throw new Error("compaction_hook_id_invalid");
    const triggers = Array.from(new Set((Array.isArray(input?.triggers) ? input.triggers : ["manual", "auto", "prompt_too_long"])
        .filter((value) => ["manual", "auto", "prompt_too_long"].includes(value))));
    return {
        id,
        name: String(input?.name || "压缩 Hook").trim().slice(0, 80),
        phase,
        scope,
        ...(String(input?.scopeId || input?.scope_id || "").trim() ? { scopeId: String(input?.scopeId || input?.scope_id).trim() } : {}),
        triggers: triggers.length ? triggers : ["manual"],
        ...(String(input?.projectId || input?.project_id || "").trim() ? { projectId: String(input?.projectId || input?.project_id).trim() } : {}),
        command,
        timeoutMs: Math.max(100, Math.min(30_000, Number(input?.timeoutMs || input?.timeout_ms || 5_000))),
        enabled: input?.enabled !== false,
    };
}
function listSessionCompactionCommandHooks(filter = {}) {
    return configs().filter(row => (!filter.scope || row.scope === filter.scope) && (!filter.scopeId || !row.scopeId || row.scopeId === filter.scopeId));
}
function saveSessionCompactionCommandHook(input) {
    const next = safeConfig(input);
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    return (0, atomic_json_file_1.withFileLock)(CONFIG_FILE, () => {
        const rows = configs().filter(row => row.id !== next.id);
        (0, atomic_json_file_1.writeJsonAtomic)(CONFIG_FILE, { schema: "ccm-session-compaction-hook-config-store-v1", hooks: [...rows, next].slice(-256) });
        return next;
    });
}
function deleteSessionCompactionCommandHook(idInput) {
    const id = String(idInput || "").trim();
    return (0, atomic_json_file_1.withFileLock)(CONFIG_FILE, () => {
        const rows = configs();
        const next = rows.filter(row => row.id !== id);
        (0, atomic_json_file_1.writeJsonAtomic)(CONFIG_FILE, { schema: "ccm-session-compaction-hook-config-store-v1", hooks: next });
        return { deleted: next.length !== rows.length, id };
    });
}
function tokenize(command) {
    if (FORBIDDEN.test(command))
        throw new Error("compaction_hook_shell_syntax_rejected");
    const tokens = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map(value => value.replace(/^("|')|("|')$/g, "")) || [];
    if (!tokens.length || !SAFE_BINARIES.has(String(tokens[0]).toLowerCase()))
        throw new Error("compaction_hook_binary_not_allowed");
    if (tokens.some(value => path.isAbsolute(value) || value === ".." || value.startsWith("../") || value.startsWith("..\\")))
        throw new Error("compaction_hook_path_out_of_scope");
    if (String(tokens[0]).toLowerCase().startsWith("git")) {
        const operation = String(tokens[1] || "").toLowerCase();
        if (!["status", "log", "diff", "ls-files", "show"].includes(operation))
            throw new Error("compaction_hook_git_operation_not_read_only");
        if (operation === "show" && tokens.some(value => /^.*:/.test(value) && !/^HEAD(?::|$)/.test(value)))
            throw new Error("compaction_hook_git_show_target_rejected");
    }
    return { file: tokens[0], args: tokens.slice(1) };
}
function projectRoot(projectId) {
    const configsByProject = (0, db_1.loadProjectConfigs)();
    const row = configsByProject?.[projectId];
    const root = path.resolve(String(row?.workDir || row?.work_dir || ""));
    if (!projectId || !row || !root || !fs.existsSync(root))
        throw new Error("compaction_hook_project_unavailable");
    return root;
}
function resolveHookCwd(config, input) {
    if (config.scope === "global") {
        const cwd = path.join(utils_1.CCM_DIR, "hook-runtime", "global");
        fs.mkdirSync(cwd, { recursive: true });
        return cwd;
    }
    const scopeId = String(input?.scopeId || input?.sessionId || "");
    if (config.scopeId && !scopeId.includes(config.scopeId))
        throw new Error("compaction_hook_scope_mismatch");
    const projectId = String(config.projectId || (config.scope === "project" ? scopeId.split(":")[0] : "")).trim();
    if (!projectId)
        throw new Error("compaction_hook_project_binding_required");
    if (config.scope === "group") {
        const groupId = String(config.scopeId || scopeId.split(":")[0] || "");
        const group = (0, storage_1.loadGroups)().find((row) => String(row?.id || "") === groupId);
        const projects = new Set((Array.isArray(group?.members) ? group.members : []).map((member) => String(member?.project || member?.projectId || member?.name || member || "")));
        if (!group || !projects.has(projectId))
            throw new Error("compaction_hook_group_project_not_authorized");
    }
    return projectRoot(projectId);
}
function redact(value) {
    return String(value || "")
        .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s]+/gi, "$1=[REDACTED]")
        .replace(/(?:sk|ghp|glpat|xox[baprs])[-_][A-Za-z0-9_-]{12,}/g, "[REDACTED]")
        .slice(0, 4_000);
}
function executeReadOnlyHook(config, cwd, signal) {
    const parsed = tokenize(config.command);
    return new Promise((resolve, reject) => {
        const started = Date.now();
        let settled = false;
        const finish = (error, stdout = "") => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timeout);
            signal?.removeEventListener("abort", abort);
            if (error)
                reject(error);
            else
                resolve({ stdout: redact(stdout), durationMs: Date.now() - started });
        };
        const child = (0, child_process_1.execFile)(parsed.file, parsed.args, { cwd, windowsHide: true, maxBuffer: 32 * 1024 }, (error, stdout, stderr) => {
            if (error)
                return finish(new Error(redact(stderr || error.message)));
            finish(null, stdout);
        });
        const stop = (reason) => { void (0, managed_process_tree_1.terminateManagedProcessTree)(child, { gracefulTimeoutMs: 250, forceTimeoutMs: 1_000 }); finish(new Error(reason)); };
        const abort = () => stop("compaction_hook_cancelled");
        const timeout = setTimeout(() => stop("compaction_hook_timeout"), config.timeoutMs);
        if (signal?.aborted)
            abort();
        else
            signal?.addEventListener("abort", abort, { once: true });
    });
}
function persistReceipt(input) {
    const file = path.join(RECEIPT_DIR, `${digest([input.scope, input.sessionId])}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    return (0, atomic_json_file_1.withFileLock)(file, () => {
        const current = (0, atomic_json_file_1.readJsonWithBackup)(file, { schema: "ccm-session-compaction-hook-receipt-ledger-v1", receipts: [] });
        const receipts = Array.isArray(current?.receipts) ? current.receipts : [];
        (0, atomic_json_file_1.writeJsonAtomic)(file, { schema: "ccm-session-compaction-hook-receipt-ledger-v1", receipts: [...receipts, input].slice(-512) });
        return input;
    });
}
function readSessionCompactionCommandHookReceipts(scopeInput, sessionIdInput) {
    const scope = scopeInput === "group" || scopeInput === "project" ? scopeInput : "global";
    const sessionId = String(sessionIdInput || "").trim();
    const file = path.join(RECEIPT_DIR, `${digest([scope, sessionId])}.json`);
    if (!sessionId || !fs.existsSync(file))
        return [];
    const current = (0, atomic_json_file_1.readJsonWithBackup)(file, { receipts: [] });
    return (Array.isArray(current?.receipts) ? current.receipts : []).filter((row) => {
        const core = { ...row };
        delete core.checksum;
        return row?.schema === "ccm-session-compaction-command-hook-receipt-v1"
            && row?.scope === scope
            && row?.sessionId === sessionId
            && row?.contentStored === false
            && row?.checksum === digest(core);
    });
}
function projectSessionCompactionHookResults(input) {
    const rows = Array.isArray(input) ? input : input && typeof input === "object" ? Object.values(input) : [];
    return rows.flatMap((entry) => Array.isArray(entry) ? entry : [entry]).filter(Boolean).map((entry) => ({
        schema: String(entry?.schema || "ccm-session-compaction-hook-result-v1"),
        phase: String(entry?.phase || ""),
        scope: String(entry?.scope || ""),
        sessionId: String(entry?.sessionId || ""),
        status: String(entry?.status || ""),
        reason: String(entry?.reason || "").slice(0, 240),
        results: (Array.isArray(entry?.results) ? entry.results : []).map((row) => ({
            hookId: String(row?.hookId || row?.id || ""),
            status: String(row?.status || ""),
            durationMs: Math.max(0, Number(row?.durationMs || 0)),
            outputChecksum: String(row?.outputChecksum || ""),
            reason: String(row?.reason || "").slice(0, 240),
            contentStored: false,
        })),
        contentStored: false,
    }));
}
async function runConfiguredSessionCompactionCommandHooks(phase, input) {
    const scope = input?.scope === "group" || input?.scope === "project" ? input.scope : "global";
    const trigger = ["manual", "auto", "prompt_too_long"].includes(String(input?.trigger || "")) ? String(input.trigger) : "auto";
    const selected = configs().filter(row => row.enabled && row.phase === phase && row.scope === scope && row.triggers.includes(trigger));
    const results = [];
    for (const config of selected) {
        const startedAt = new Date().toISOString();
        try {
            const cwd = resolveHookCwd(config, input);
            const execution = await executeReadOnlyHook(config, cwd, input?.signal);
            const result = {
                hookId: config.id,
                name: config.name,
                phase,
                status: "success",
                durationMs: execution.durationMs,
                outputChecksum: digest(execution.stdout),
                outputSummary: execution.stdout.slice(0, 1_200),
                ...(phase === "pre_compact" && execution.stdout.trim() ? { customInstructions: execution.stdout.trim().slice(0, 2_000) } : {}),
            };
            results.push(result);
        }
        catch (error) {
            results.push({ hookId: config.id, name: config.name, phase, status: "warning", durationMs: Math.max(0, Date.now() - Date.parse(startedAt)), reason: String(error?.message || error).slice(0, 240) });
        }
    }
    const receipt = {
        schema: "ccm-session-compaction-command-hook-receipt-v1",
        scope,
        sessionId: String(input?.sessionId || ""),
        phase,
        trigger,
        results: results.map(row => ({ hookId: row.hookId, status: row.status, durationMs: row.durationMs, outputChecksum: row.outputChecksum || "", reason: row.reason || "" })),
        recordedAt: new Date().toISOString(),
        contentStored: false,
    };
    if (results.length)
        persistReceipt({ ...receipt, checksum: digest(receipt) });
    return {
        schema: "ccm-session-compaction-hook-result-v1",
        phase,
        scope,
        sessionId: String(input?.sessionId || ""),
        status: results.some(row => row.status === "warning") ? "warning" : "success",
        results,
        customInstructions: results.map(row => row.customInstructions || "").filter(Boolean).join("\n\n").slice(0, 4_000),
        contentStored: false,
    };
}
function inspectSessionCompactionHookCommand(command) {
    try {
        return { safe: true, ...tokenize(command) };
    }
    catch (error) {
        return { safe: false, reason: String(error?.message || error) };
    }
}
//# sourceMappingURL=session-compaction-command-hooks.js.map