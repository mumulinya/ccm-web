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
exports.listProjectTestTargets = listProjectTestTargets;
exports.saveProjectTestTarget = saveProjectTestTarget;
exports.deleteProjectTestTarget = deleteProjectTestTarget;
exports.resolveProjectTestTargets = resolveProjectTestTargets;
exports.resolveProjectTargetStorageStatePath = resolveProjectTargetStorageStatePath;
exports.runProjectTestTargetsSelfTest = runProjectTestTargetsSelfTest;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const credential_store_1 = require("../../core/credential-store");
const db_1 = require("../../core/db");
const project_validation_1 = require("./project-validation");
const project_test_auth_1 = require("./project-test-auth");
const TARGET_KINDS = new Set(["web", "h5", "api", "hybrid_app", "native_app", "other"]);
const AUTH_MODES = new Set(["none", "credentials", "storage_state", "existing_session"]);
const ENV_NAME = /^[A-Z_][A-Z0-9_]*$/;
const MAX_TARGETS = 24;
const MAX_AUTH_FIELDS = 12;
function cleanText(value, max = 500) {
    return String(value || "").trim().slice(0, max);
}
function cleanId(value, prefix) {
    const id = cleanText(value, 120).replace(/[^a-zA-Z0-9._-]+/g, "-");
    return id || `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
}
function uniqueCommands(value) {
    return [...new Set((Array.isArray(value) ? value : [])
            .map(item => cleanText(item, 300))
            .filter(Boolean))].slice(0, 30);
}
function normalizeUrl(value) {
    const url = cleanText(value, 600).replace(/\/+$/, "");
    if (url && !/^https?:\/\//i.test(url))
        throw new Error("验收环境地址必须以 http:// 或 https:// 开头");
    return url;
}
function assertProject(project) {
    const name = (0, project_validation_1.validateProjectName)(project);
    if (!(0, db_1.getConfigs)().some(config => config.name === name))
        throw new Error("项目不存在");
    return name;
}
function targetChecksum(target, projectAuthChecksum = "") {
    return crypto.createHash("sha256").update(JSON.stringify({ target, projectAuthChecksum })).digest("hex");
}
function normalizeStoredTarget(raw, project) {
    const now = new Date().toISOString();
    const kind = TARGET_KINDS.has(raw?.kind) ? raw.kind : "web";
    const mode = AUTH_MODES.has(raw?.auth?.mode) ? raw.auth.mode : "none";
    const fields = (Array.isArray(raw?.auth?.fields) ? raw.auth.fields : []).slice(0, MAX_AUTH_FIELDS).map((field) => ({
        id: cleanId(field?.id, "ptaf"),
        label: cleanText(field?.label, 80),
        envName: cleanText(field?.envName, 80).toUpperCase(),
        inputLabel: cleanText(field?.inputLabel, 120),
        valueRef: cleanText(field?.valueRef, 300),
    })).filter((field) => field.envName && ENV_NAME.test(field.envName));
    return {
        id: cleanId(raw?.id, "ptt"),
        project,
        name: cleanText(raw?.name, 120),
        kind,
        environment: cleanText(raw?.environment, 80),
        enabled: raw?.enabled !== false,
        required: raw?.required === true,
        baseUrl: cleanText(raw?.baseUrl, 600).replace(/\/+$/, ""),
        startupCommand: cleanText(raw?.startupCommand, 500),
        verificationCommands: uniqueCommands(raw?.verificationCommands),
        notes: cleanText(raw?.notes, 800),
        auth: {
            mode,
            loginPath: cleanText(raw?.auth?.loginPath, 300),
            submitLabel: cleanText(raw?.auth?.submitLabel, 120) || "登录",
            successText: cleanText(raw?.auth?.successText, 200),
            successUrlIncludes: cleanText(raw?.auth?.successUrlIncludes, 300),
            storageStatePath: cleanText(raw?.auth?.storageStatePath, 500),
            existingSessionProvider: ["claude-in-chrome", "chrome-devtools"].includes(raw?.auth?.existingSessionProvider)
                ? raw.auth.existingSessionProvider
                : "auto",
            fields,
        },
        createdAt: cleanText(raw?.createdAt, 50) || now,
        updatedAt: cleanText(raw?.updatedAt, 50) || now,
    };
}
function publicTarget(target) {
    return {
        ...target,
        checksum: targetChecksum(target),
        projectAvailable: true,
        auth: {
            ...target.auth,
            fields: target.auth.fields.map(({ valueRef, ...field }) => ({
                ...field,
                hasValue: !!valueRef,
                credentialProtected: !!valueRef && (0, credential_store_1.isCredentialReference)(valueRef),
            })),
        },
    };
}
function loadStored(project) {
    const configs = (0, db_1.loadProjectConfigs)();
    const rows = Array.isArray(configs[project]?.test_targets) ? configs[project].test_targets : [];
    return { configs, targets: rows.slice(0, MAX_TARGETS).map((row) => normalizeStoredTarget(row, project)) };
}
function listProjectTestTargets(projectInput) {
    const project = assertProject(projectInput);
    const projectAuth = (0, project_test_auth_1.getProjectTestAuthProfile)(project);
    const { configs, targets } = loadStored(project);
    const before = JSON.stringify(configs[project]?.test_targets || []);
    if (!configs[project])
        configs[project] = {};
    configs[project].test_targets = targets;
    if (JSON.stringify(targets) !== before)
        (0, db_1.saveProjectConfigs)(configs);
    return {
        schema: "ccm-project-test-targets-v1",
        project,
        projects: [project],
        projectAuth,
        targets: targets.map(target => ({ ...publicTarget(target), projectAuthConfigured: projectAuth.enabled, projectAuthMode: projectAuth.mode })),
    };
}
function saveProjectTestTarget(projectInput, input) {
    const project = assertProject(projectInput);
    const { configs, targets } = loadStored(project);
    const name = cleanText(input?.name, 120);
    if (!name)
        throw new Error("验收环境名称不能为空");
    const requestedId = cleanText(input?.id, 120);
    const index = requestedId ? targets.findIndex(target => target.id === requestedId) : -1;
    if (requestedId && index < 0)
        throw new Error("验收环境不存在或不属于当前项目");
    if (index < 0 && targets.length >= MAX_TARGETS)
        throw new Error(`每个项目最多配置 ${MAX_TARGETS} 个验收环境`);
    const previous = index >= 0 ? targets[index] : null;
    const authMode = AUTH_MODES.has(input?.auth?.mode) ? input.auth.mode : "none";
    const projectAuth = (0, project_test_auth_1.getProjectTestAuthProfile)(project);
    if (authMode !== "none" && (!projectAuth.enabled || projectAuth.mode !== authMode)) {
        throw new Error("请先在项目配置中启用对应的 TestAgent 登录方式");
    }
    const fields = [];
    const now = new Date().toISOString();
    const target = normalizeStoredTarget({
        id: previous?.id || cleanId("", "ptt"),
        name,
        kind: TARGET_KINDS.has(input?.kind) ? input.kind : "web",
        environment: input?.environment,
        enabled: input?.enabled,
        required: input?.required,
        baseUrl: normalizeUrl(input?.baseUrl),
        startupCommand: input?.startupCommand,
        verificationCommands: input?.verificationCommands,
        notes: input?.notes,
        auth: { mode: authMode, fields },
        createdAt: previous?.createdAt || now,
        updatedAt: now,
    }, project);
    if (index >= 0)
        targets[index] = target;
    else
        targets.push(target);
    if (!configs[project])
        configs[project] = {};
    configs[project].test_targets = targets;
    (0, db_1.saveProjectConfigs)(configs);
    const retainedRefs = new Set(fields.map(field => field.valueRef).filter(Boolean));
    for (const field of previous?.auth.fields || [])
        if (field.valueRef && !retainedRefs.has(field.valueRef))
            (0, credential_store_1.deleteCredential)(field.valueRef);
    return publicTarget(target);
}
function deleteProjectTestTarget(projectInput, targetIdInput) {
    const project = assertProject(projectInput);
    const targetId = cleanText(targetIdInput, 120);
    const { configs, targets } = loadStored(project);
    const removed = targets.find(target => target.id === targetId);
    if (!removed)
        throw new Error("验收环境不存在或不属于当前项目");
    configs[project].test_targets = targets.filter(target => target.id !== targetId);
    (0, db_1.saveProjectConfigs)(configs);
    for (const field of removed.auth.fields)
        if (field.valueRef)
            (0, credential_store_1.deleteCredential)(field.valueRef);
    return { success: true, deletedId: targetId };
}
function resolveProjectTestTargets(projectInput, targetIds = []) {
    const project = assertProject(projectInput);
    const requestedIds = new Set(targetIds.map(String).filter(Boolean));
    const { targets } = loadStored(project);
    if (requestedIds.size && [...requestedIds].some(id => !targets.some(target => target.id === id))) {
        throw new Error("请求包含不属于当前项目的验收环境");
    }
    return targets
        .filter(target => target.enabled && (!requestedIds.size || requestedIds.has(target.id) || target.required))
        .map(target => {
        if (target.auth.mode === "none")
            return { ...target, checksum: targetChecksum(target), env: {} };
        const profile = (0, project_test_auth_1.resolveProjectTestAuthProfile)(project);
        if (!profile.enabled || profile.mode !== target.auth.mode)
            throw new Error(`验收环境“${target.name}”引用的项目登录配置不可用`);
        return {
            ...target,
            baseUrl: target.baseUrl || profile.baseUrl,
            auth: {
                mode: profile.mode,
                loginPath: profile.loginPath,
                submitLabel: profile.submitLabel,
                successText: profile.successText,
                successUrlIncludes: profile.successUrlIncludes,
                storageStatePath: profile.storageStatePath,
                existingSessionProvider: profile.existingSessionProvider,
                fields: profile.fields,
            },
            checksum: targetChecksum(target, profile.checksum),
            env: profile.env,
        };
    });
}
function resolveProjectTargetStorageStatePath(workDir, configuredPath) {
    const root = path.resolve((0, project_validation_1.validateWorkDirectory)(workDir));
    const resolved = path.resolve(root, configuredPath);
    const relative = path.relative(root, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative))
        throw new Error("Storage State 文件必须位于目标项目工作目录内");
    return resolved;
}
function runProjectTestTargetsSelfTest() {
    const normalized = normalizeStoredTarget({ name: "Web", kind: "web", baseUrl: "http://127.0.0.1:3000/" }, "demo");
    return {
        success: normalized.project === "demo" && normalized.baseUrl === "http://127.0.0.1:3000" && normalized.auth.mode === "none",
        checks: { exactProject: normalized.project === "demo", normalizedUrl: normalized.baseUrl === "http://127.0.0.1:3000" },
    };
}
//# sourceMappingURL=project-test-targets.js.map