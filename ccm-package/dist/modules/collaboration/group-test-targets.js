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
exports.listGroupTestTargets = listGroupTestTargets;
exports.publicGroupWithoutTestTargetSecrets = publicGroupWithoutTestTargetSecrets;
exports.saveGroupTestTarget = saveGroupTestTarget;
exports.deleteGroupTestTarget = deleteGroupTestTarget;
exports.resolveGroupTestTargets = resolveGroupTestTargets;
exports.resolveTargetStorageStatePath = resolveTargetStorageStatePath;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const credential_store_1 = require("../../core/credential-store");
const project_test_auth_1 = require("../projects/project-test-auth");
const group_orchestrator_1 = require("./group-orchestrator");
const storage_1 = require("./storage");
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
        throw new Error("测试目标地址必须以 http:// 或 https:// 开头");
    return url;
}
function targetChecksum(target, projectAuthChecksum = "") {
    return crypto.createHash("sha256").update(JSON.stringify({ target, projectAuthChecksum })).digest("hex");
}
function publicTarget(target, availableProjects) {
    return {
        ...target,
        projectAvailable: availableProjects.has(target.project),
        checksum: targetChecksum(target),
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
function groupProjectNames(group) {
    const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(group)?.project;
    return new Set((group?.members || [])
        .filter((member) => member?.project && member.project !== coordinator && member.role !== "coordinator")
        .map((member) => String(member.project)));
}
function normalizeStoredTarget(raw) {
    const now = new Date().toISOString();
    const kind = TARGET_KINDS.has(raw?.kind) ? raw.kind : "web";
    const mode = AUTH_MODES.has(raw?.auth?.mode) ? raw.auth.mode : "none";
    const fields = (Array.isArray(raw?.auth?.fields) ? raw.auth.fields : []).slice(0, MAX_AUTH_FIELDS).map((field) => ({
        id: cleanId(field?.id, "gtaf"),
        label: cleanText(field?.label, 80),
        envName: cleanText(field?.envName, 80).toUpperCase(),
        inputLabel: cleanText(field?.inputLabel, 120),
        valueRef: cleanText(field?.valueRef, 300),
    })).filter((field) => field.envName && ENV_NAME.test(field.envName));
    return {
        id: cleanId(raw?.id, "gtt"),
        project: cleanText(raw?.project, 160),
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
function findGroup(groupId) {
    const groups = (0, storage_1.loadGroups)();
    const group = groups.find((item) => item.id === groupId);
    if (!group)
        throw new Error("群聊不存在");
    return { groups, group };
}
function listGroupTestTargets(groupId) {
    const { groups, group } = findGroup(groupId);
    const before = JSON.stringify(group.test_targets || []);
    const targets = (Array.isArray(group.test_targets) ? group.test_targets : []).slice(0, MAX_TARGETS).map(normalizeStoredTarget);
    group.test_targets = targets;
    if (JSON.stringify(targets) !== before)
        (0, storage_1.saveGroups)(groups);
    const projects = groupProjectNames(group);
    const projectAuth = Object.fromEntries([...projects].map(project => {
        try {
            return [project, (0, project_test_auth_1.getProjectTestAuthProfile)(project)];
        }
        catch {
            return [project, { project, enabled: false, mode: "none" }];
        }
    }));
    return {
        schema: "ccm-group-test-targets-v1",
        groupId,
        projects: [...projects],
        projectAuth,
        targets: targets.map(target => ({
            ...publicTarget(target, projects),
            projectAuthConfigured: projectAuth[target.project]?.enabled === true,
            projectAuthMode: projectAuth[target.project]?.mode || "none",
        })),
    };
}
function publicGroupWithoutTestTargetSecrets(group) {
    if (!group || typeof group !== "object")
        return group;
    const { test_targets: testTargets, ...safeGroup } = group;
    return {
        ...safeGroup,
        test_target_count: Array.isArray(testTargets) ? testTargets.length : 0,
    };
}
function saveGroupTestTarget(groupId, input) {
    const { groups, group } = findGroup(groupId);
    const projects = groupProjectNames(group);
    const project = cleanText(input?.project, 160);
    if (!projects.has(project))
        throw new Error("测试目标只能绑定当前群聊中的项目");
    const name = cleanText(input?.name, 120);
    if (!name)
        throw new Error("测试目标名称不能为空");
    const stored = (Array.isArray(group.test_targets) ? group.test_targets : []).map(normalizeStoredTarget);
    const requestedId = cleanText(input?.id, 120);
    const index = requestedId ? stored.findIndex(target => target.id === requestedId) : -1;
    if (requestedId && index < 0)
        throw new Error("测试目标不存在或不属于当前群聊");
    if (index < 0 && stored.length >= MAX_TARGETS)
        throw new Error(`每个群聊最多配置 ${MAX_TARGETS} 个测试目标`);
    const previous = index >= 0 ? stored[index] : null;
    const now = new Date().toISOString();
    const authMode = AUTH_MODES.has(input?.auth?.mode) ? input.auth.mode : "none";
    const projectAuth = (0, project_test_auth_1.getProjectTestAuthProfile)(project);
    if (authMode !== "none" && (!projectAuth.enabled || projectAuth.mode !== authMode)) {
        throw new Error("请先在项目配置中启用对应的 TestAgent 登录方式");
    }
    const fields = [];
    const kind = TARGET_KINDS.has(input?.kind) ? input.kind : "web";
    const target = normalizeStoredTarget({
        id: previous?.id || cleanId("", "gtt"),
        project,
        name,
        kind,
        environment: input?.environment,
        enabled: input?.enabled,
        required: input?.required,
        baseUrl: normalizeUrl(input?.baseUrl),
        startupCommand: input?.startupCommand,
        verificationCommands: input?.verificationCommands,
        notes: input?.notes,
        auth: {
            mode: authMode,
            fields,
        },
        createdAt: previous?.createdAt || now,
        updatedAt: now,
    });
    if (index >= 0)
        stored[index] = target;
    else
        stored.push(target);
    group.test_targets = stored;
    (0, storage_1.saveGroups)(groups);
    const retainedRefs = new Set(fields.map(field => field.valueRef).filter(Boolean));
    for (const field of previous?.auth.fields || []) {
        if (field.valueRef && !retainedRefs.has(field.valueRef))
            (0, credential_store_1.deleteCredential)(field.valueRef);
    }
    return publicTarget(target, projects);
}
function deleteGroupTestTarget(groupId, targetId) {
    const { groups, group } = findGroup(groupId);
    const before = Array.isArray(group.test_targets) ? group.test_targets : [];
    const removed = before.find((target) => String(target?.id || "") === targetId);
    const next = before.filter((target) => String(target?.id || "") !== targetId);
    if (next.length === before.length)
        throw new Error("测试目标不存在或不属于当前群聊");
    group.test_targets = next;
    (0, storage_1.saveGroups)(groups);
    for (const field of normalizeStoredTarget(removed).auth.fields)
        (0, credential_store_1.deleteCredential)(field.valueRef);
    return { success: true, deletedId: targetId };
}
function resolveGroupTestTargets(groupId, projectNames = [], targetIds = []) {
    const { group } = findGroup(groupId);
    const projects = new Set(projectNames.map(String).filter(Boolean));
    const requestedIds = new Set(targetIds.map(String).filter(Boolean));
    const targets = (Array.isArray(group.test_targets) ? group.test_targets : []).map(normalizeStoredTarget);
    if (requestedIds.size && [...requestedIds].some(id => !targets.some(target => target.id === id))) {
        throw new Error("请求包含不属于当前群聊的测试目标");
    }
    return targets
        .filter(target => target.enabled && (!projects.size || projects.has(target.project)) && (!requestedIds.size || requestedIds.has(target.id) || target.required))
        .map((target) => {
        if (target.auth.mode === "none")
            return { ...target, checksum: targetChecksum(target), env: {} };
        const profile = (0, project_test_auth_1.resolveProjectTestAuthProfile)(target.project);
        if (!profile.enabled || profile.mode !== target.auth.mode)
            throw new Error(`测试目标“${target.name}”引用的项目登录配置不可用`);
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
function resolveTargetStorageStatePath(workDir, configuredPath) {
    const root = path.resolve(workDir);
    const resolved = path.resolve(root, configuredPath);
    const within = process.platform === "win32"
        ? resolved.toLowerCase().startsWith(`${root.toLowerCase()}${path.sep}`) || resolved.toLowerCase() === root.toLowerCase()
        : resolved.startsWith(`${root}${path.sep}`) || resolved === root;
    if (!within)
        throw new Error("Storage State 文件必须位于目标项目工作目录内");
    return resolved;
}
//# sourceMappingURL=group-test-targets.js.map