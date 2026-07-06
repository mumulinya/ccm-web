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
exports.buildGlobalAgentToolDefinitions = buildGlobalAgentToolDefinitions;
exports.loadGlobalAgentPermissionRules = loadGlobalAgentPermissionRules;
exports.saveGlobalAgentPermissionRule = saveGlobalAgentPermissionRule;
exports.deleteGlobalAgentPermissionRule = deleteGlobalAgentPermissionRule;
exports.evaluateGlobalAgentPermission = evaluateGlobalAgentPermission;
exports.loadGlobalAgentHooks = loadGlobalAgentHooks;
exports.saveGlobalAgentHook = saveGlobalAgentHook;
exports.deleteGlobalAgentHook = deleteGlobalAgentHook;
exports.runGlobalAgentHooks = runGlobalAgentHooks;
exports.initializeGlobalAgentRuntimeRun = initializeGlobalAgentRuntimeRun;
exports.updateGlobalAgentTodoLedger = updateGlobalAgentTodoLedger;
exports.markGlobalAgentToolTodo = markGlobalAgentToolTodo;
exports.recordGlobalAgentRuntimeOutput = recordGlobalAgentRuntimeOutput;
exports.getGlobalAgentRuntimeRunState = getGlobalAgentRuntimeRunState;
exports.getGlobalAgentBackgroundOutput = getGlobalAgentBackgroundOutput;
exports.buildGlobalAgentSessionDebug = buildGlobalAgentSessionDebug;
exports.runGlobalAgentRuntimeSelfTest = runGlobalAgentRuntimeSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("./utils");
const RUNTIME_DIR = path.join(utils_1.CCM_DIR, "global-agent-runtime");
const PERMISSIONS_FILE = path.join(RUNTIME_DIR, "permissions.json");
const HOOKS_FILE = path.join(RUNTIME_DIR, "hooks.json");
const RUNS_FILE = path.join(RUNTIME_DIR, "runs.json");
const MAX_RUN_STATES = 160;
const MAX_OUTPUT_ITEMS = 120;
function now() {
    return new Date().toISOString();
}
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
    if (fs.existsSync(file)) {
        try {
            fs.copyFileSync(file, `${file}.bak`);
        }
        catch { }
    }
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function readJson(file, fallback) {
    for (const candidate of [file, `${file}.bak`]) {
        try {
            if (fs.existsSync(candidate))
                return JSON.parse(fs.readFileSync(candidate, "utf-8"));
        }
        catch { }
    }
    return fallback;
}
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (value && typeof value === "object")
        return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
    return value;
}
function hashId(prefix, value) {
    return `${prefix}_${crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex").slice(0, 14)}`;
}
function compact(value, max = 4000) {
    let text = "";
    try {
        text = typeof value === "string" ? value : JSON.stringify(value);
    }
    catch {
        text = String(value);
    }
    return text.length > max ? { truncated: true, preview: text.slice(0, max), original_chars: text.length } : value;
}
function toolTitle(name) {
    return String(name || "").split("_").filter(Boolean).map(part => part[0]?.toUpperCase() + part.slice(1)).join(" ") || "Tool";
}
function schemaForSpec(spec) {
    const properties = {};
    for (const key of spec.required || []) {
        properties[key] = {
            type: key === "targets" || key === "files" ? "array" : "string",
            description: `${spec.name}.${key}`,
        };
    }
    properties.operation = properties.operation || { type: "string" };
    return {
        type: "object",
        additionalProperties: true,
        required: spec.required || [],
        properties,
    };
}
function buildGlobalAgentToolDefinitions(specs) {
    return specs.map(spec => ({
        name: spec.name,
        description: spec.description,
        inputSchema: schemaForSpec(spec),
        required: spec.required || [],
        risk: typeof spec.risk === "string" ? spec.risk : "dynamic",
        renderer: {
            kind: /inspect|list|query|review/.test(spec.name) ? "read_result" : /manage|create|send|orchestrate|commit/.test(spec.name) ? "action_receipt" : "default",
            title: toolTitle(spec.name),
        },
        permissionScope: spec.name.replace(/_.*/, "") || spec.name,
    }));
}
function loadGlobalAgentPermissionRules() {
    const data = readJson(PERMISSIONS_FILE, { version: 1, rules: [] });
    return (Array.isArray(data?.rules) ? data.rules : [])
        .filter((rule) => rule?.id && rule.tool && ["allow", "deny"].includes(rule.decision))
        .filter((rule) => !rule.expires_at || Date.parse(rule.expires_at) > Date.now())
        .map((rule) => ({
        id: String(rule.id),
        tool: String(rule.tool),
        target: rule.target ? String(rule.target) : "",
        decision: rule.decision,
        risk: rule.risk,
        reason: String(rule.reason || ""),
        actor: String(rule.actor || "local-user"),
        created_at: rule.created_at || now(),
        updated_at: rule.updated_at || rule.created_at || now(),
        expires_at: rule.expires_at || "",
    }));
}
function saveGlobalAgentPermissionRule(input) {
    const tool = String(input.tool || "").trim();
    if (!tool)
        throw new Error("权限规则缺少 tool");
    const decision = String(input.decision || "allow");
    if (!["allow", "deny"].includes(decision))
        throw new Error("权限规则 decision 必须是 allow 或 deny");
    const store = readJson(PERMISSIONS_FILE, { version: 1, rules: [] });
    const rules = Array.isArray(store.rules) ? store.rules : [];
    const id = input.id || hashId("gap", { tool, target: input.target || "", decision });
    const existing = rules.findIndex((rule) => rule.id === id);
    const record = {
        id,
        tool,
        target: String(input.target || ""),
        decision,
        risk: input.risk,
        reason: String(input.reason || ""),
        actor: String(input.actor || "local-user"),
        created_at: existing >= 0 ? rules[existing].created_at || now() : now(),
        updated_at: now(),
        expires_at: input.expires_at || "",
    };
    if (existing >= 0)
        rules[existing] = record;
    else
        rules.unshift(record);
    writeJsonAtomic(PERMISSIONS_FILE, { version: 1, rules: rules.slice(0, 200), updated_at: now() });
    return record;
}
function deleteGlobalAgentPermissionRule(id) {
    const store = readJson(PERMISSIONS_FILE, { version: 1, rules: [] });
    const before = Array.isArray(store.rules) ? store.rules : [];
    const rules = before.filter((rule) => rule.id !== id);
    writeJsonAtomic(PERMISSIONS_FILE, { version: 1, rules, updated_at: now() });
    return { deleted: before.length !== rules.length };
}
function targetText(args) {
    return [
        args?.project,
        args?.group_id || args?.groupId,
        args?.id,
        args?.name,
        args?.operation,
        ...(Array.isArray(args?.targets) ? args.targets.map((item) => item?.project || item?.group_id || item?.name || item?.id) : []),
    ].filter(Boolean).join(" ");
}
function evaluateGlobalAgentPermission(input) {
    const rules = loadGlobalAgentPermissionRules();
    const target = targetText(input.args);
    const matches = rules.filter(rule => {
        if (rule.tool !== "*" && rule.tool !== input.tool)
            return false;
        if (rule.risk && rule.risk !== "dynamic" && rule.risk !== input.risk)
            return false;
        if (rule.target && !target.includes(rule.target) && !input.signature.includes(rule.target))
            return false;
        return true;
    });
    const denied = matches.find(rule => rule.decision === "deny");
    const allowed = matches.find(rule => rule.decision === "allow");
    const result = {
        allowed: !!allowed && !denied,
        denied: !!denied,
        rule: denied || allowed || null,
        target,
    };
    recordGlobalAgentRuntimePermission(input.run, { tool: input.tool, risk: input.risk, signature: input.signature, result });
    return result;
}
function loadGlobalAgentHooks() {
    const data = readJson(HOOKS_FILE, { version: 1, hooks: [] });
    return (Array.isArray(data?.hooks) ? data.hooks : [])
        .filter((hook) => hook?.id && hook.enabled !== false && ["pre_tool_use", "post_tool_use"].includes(hook.phase))
        .map((hook) => ({
        id: String(hook.id),
        enabled: hook.enabled !== false,
        phase: hook.phase,
        tool: String(hook.tool || ""),
        effect: hook.effect === "block" ? "block" : "annotate",
        message: String(hook.message || ""),
        actor: String(hook.actor || "local-user"),
        created_at: hook.created_at || now(),
        updated_at: hook.updated_at || hook.created_at || now(),
    }));
}
function saveGlobalAgentHook(input) {
    const phase = String(input.phase || "pre_tool_use");
    if (!["pre_tool_use", "post_tool_use"].includes(phase))
        throw new Error("Hook phase 必须是 pre_tool_use 或 post_tool_use");
    const effect = input.effect === "block" ? "block" : "annotate";
    const store = readJson(HOOKS_FILE, { version: 1, hooks: [] });
    const hooks = Array.isArray(store.hooks) ? store.hooks : [];
    const id = input.id || hashId("gah", { phase, tool: input.tool || "", effect, message: input.message || "" });
    const existing = hooks.findIndex((hook) => hook.id === id);
    const record = {
        id,
        enabled: input.enabled !== false,
        phase,
        tool: String(input.tool || ""),
        effect,
        message: String(input.message || ""),
        actor: String(input.actor || "local-user"),
        created_at: existing >= 0 ? hooks[existing].created_at || now() : now(),
        updated_at: now(),
    };
    if (existing >= 0)
        hooks[existing] = record;
    else
        hooks.unshift(record);
    writeJsonAtomic(HOOKS_FILE, { version: 1, hooks: hooks.slice(0, 200), updated_at: now() });
    return record;
}
function deleteGlobalAgentHook(id) {
    const store = readJson(HOOKS_FILE, { version: 1, hooks: [] });
    const before = Array.isArray(store.hooks) ? store.hooks : [];
    const hooks = before.filter((hook) => hook.id !== id);
    writeJsonAtomic(HOOKS_FILE, { version: 1, hooks, updated_at: now() });
    return { deleted: before.length !== hooks.length };
}
function runGlobalAgentHooks(phase, input) {
    const fired = loadGlobalAgentHooks()
        .filter(hook => hook.phase === phase)
        .filter(hook => !hook.tool || hook.tool === "*" || hook.tool === input.tool)
        .map(hook => ({ id: hook.id, phase, tool: hook.tool || "*", effect: hook.effect, message: hook.message, at: now() }));
    const blocked = fired.find(item => item.effect === "block");
    if (fired.length)
        recordGlobalAgentRuntimeHook(input.run, { phase, tool: input.tool, risk: input.risk, fired, blocked: blocked || null, observation: compact(input.observation, 1000) });
    return { blocked: !!blocked, message: blocked?.message || "", fired };
}
function loadRunStore() {
    const data = readJson(RUNS_FILE, { version: 1, runs: [] });
    return { version: 1, runs: Array.isArray(data?.runs) ? data.runs : [] };
}
function saveRunState(state) {
    const store = loadRunStore();
    const index = store.runs.findIndex(item => item.run_id === state.run_id);
    if (index >= 0)
        store.runs[index] = state;
    else
        store.runs.unshift(state);
    store.runs = store.runs.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))).slice(0, MAX_RUN_STATES);
    writeJsonAtomic(RUNS_FILE, store);
}
function getRunState(run) {
    const store = loadRunStore();
    return store.runs.find(item => item.run_id === run.id) || {
        run_id: run.id,
        trace_id: run.trace_id,
        session_id: run.session_id,
        status: run.status,
        todos: [],
        output: [],
        hooks: [],
        permissions: [],
        compaction_boundaries: [],
        updated_at: now(),
    };
}
function initializeGlobalAgentRuntimeRun(run) {
    const state = getRunState(run);
    state.status = run.status;
    state.trace_id = run.trace_id;
    state.session_id = run.session_id;
    state.updated_at = now();
    saveRunState(state);
    return state;
}
function updateGlobalAgentTodoLedger(run, plan = [], activeTool = "") {
    const state = getRunState(run);
    const existingByText = new Map(state.todos.map(todo => [todo.text, todo]));
    const next = plan.map((text, index) => {
        const clean = String(text || "").trim().slice(0, 500);
        const previous = existingByText.get(clean);
        return {
            id: previous?.id || hashId("todo", { run: run.id, text: clean }),
            text: clean,
            status: previous?.status || (index === 0 ? "in_progress" : "pending"),
            tool: previous?.tool || activeTool || "",
            updated_at: now(),
        };
    }).filter(todo => todo.text);
    const carriedDone = state.todos.filter(todo => todo.status === "done" && !next.some(item => item.id === todo.id)).slice(-12);
    state.todos = [...carriedDone, ...next].slice(-30);
    state.status = run.status;
    state.updated_at = now();
    saveRunState(state);
    return state.todos;
}
function markGlobalAgentToolTodo(run, tool, status, text = "") {
    const state = getRunState(run);
    const target = state.todos.find(todo => todo.status === "in_progress") || state.todos.find(todo => todo.tool === tool) || null;
    if (target) {
        target.status = status;
        target.tool = tool || target.tool;
        target.updated_at = now();
    }
    else if (text || tool) {
        state.todos.push({ id: hashId("todo", { run: run.id, tool, text }), text: text || `执行 ${tool}`, status, tool, updated_at: now() });
    }
    state.todos = state.todos.slice(-30);
    state.status = run.status;
    state.updated_at = now();
    saveRunState(state);
    return state.todos;
}
function recordGlobalAgentRuntimeOutput(run, event) {
    const state = getRunState(run);
    state.output.push({ at: now(), ...compact(event, 3000) });
    state.output = state.output.slice(-MAX_OUTPUT_ITEMS);
    state.status = run.status;
    state.updated_at = now();
    saveRunState(state);
}
function recordGlobalAgentRuntimeHook(run, event) {
    const state = getRunState(run);
    state.hooks.push({ at: now(), ...compact(event, 2000) });
    state.hooks = state.hooks.slice(-80);
    state.updated_at = now();
    saveRunState(state);
}
function recordGlobalAgentRuntimePermission(run, event) {
    const state = getRunState(run);
    state.permissions.push({ at: now(), ...compact(event, 2000) });
    state.permissions = state.permissions.slice(-80);
    state.updated_at = now();
    saveRunState(state);
}
function getGlobalAgentRuntimeRunState(runId) {
    return loadRunStore().runs.find(item => item.run_id === runId) || null;
}
function getGlobalAgentBackgroundOutput(runId) {
    const state = getGlobalAgentRuntimeRunState(runId);
    return { run_id: runId, output: state?.output || [], todos: state?.todos || [], hooks: state?.hooks || [], permissions: state?.permissions || [] };
}
function buildGlobalAgentSessionDebug(run) {
    if (!run)
        return null;
    const state = getGlobalAgentRuntimeRunState(run.id);
    return {
        run_id: run.id,
        trace_id: run.trace_id,
        session_id: run.session_id,
        status: run.status,
        phase: run.phase,
        pending_tool: run.pending_tool || null,
        last_step: run.steps.at(-1) || null,
        resume_count: run.resume_count,
        model_calls: run.model_calls,
        tool_calls: run.tool_calls,
        todos: state?.todos || [],
        hooks: state?.hooks?.slice(-10) || [],
        permissions: state?.permissions?.slice(-10) || [],
        output_tail: state?.output?.slice(-10) || [],
        reasoning: {
            plan_version: run.reasoning_loop?.plan_version || 0,
            assertions: run.reasoning_loop?.assertions?.slice(-12) || [],
            deviations: run.reasoning_loop?.deviations?.slice(-8) || [],
            recovery_checks: run.reasoning_loop?.recovery_checks?.slice(-8) || [],
        },
    };
}
function runGlobalAgentRuntimeSelfTest(specs) {
    const definitions = buildGlobalAgentToolDefinitions(specs);
    const fakeRun = {
        id: `runtime_selftest_${Date.now()}`,
        trace_id: "trace_runtime_selftest",
        session_id: "self-test",
        status: "running",
        phase: "execute",
        steps: [],
        resume_count: 0,
        model_calls: 0,
        tool_calls: 0,
        pending_tool: null,
        reasoning_loop: { plan_version: 1, assertions: [], deviations: [], recovery_checks: [] },
    };
    initializeGlobalAgentRuntimeRun(fakeRun);
    updateGlobalAgentTodoLedger(fakeRun, ["检查系统", "执行工具"], "inspect_system");
    markGlobalAgentToolTodo(fakeRun, "inspect_system", "done");
    recordGlobalAgentRuntimeOutput(fakeRun, { type: "tool_completed", tool: "inspect_system", observation: { success: true } });
    const debug = buildGlobalAgentSessionDebug(fakeRun);
    const checks = {
        toolDefinitionsHaveSchemas: definitions.length === specs.length && definitions.every(item => item.inputSchema?.type === "object" && item.renderer?.kind),
        todoLedgerPersists: (debug?.todos || []).length > 0,
        backgroundOutputPersists: getGlobalAgentBackgroundOutput(fakeRun.id).output.length > 0,
        debugSnapshotIncludesRuntime: !!debug?.output_tail?.length && Array.isArray(debug.permissions),
    };
    return { pass: Object.values(checks).every(Boolean), checks, definitions: definitions.slice(0, 3), debug };
}
//# sourceMappingURL=global-agent-runtime.js.map