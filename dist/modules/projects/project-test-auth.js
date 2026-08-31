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
exports.getProjectTestAuthProfile = getProjectTestAuthProfile;
exports.saveProjectTestAuthProfile = saveProjectTestAuthProfile;
exports.resolveProjectTestAuthProfile = resolveProjectTestAuthProfile;
exports.runProjectTestAuthContractSelfTest = runProjectTestAuthContractSelfTest;
const crypto = __importStar(require("crypto"));
const credential_store_1 = require("../../core/credential-store");
const db_1 = require("../../core/db");
const project_validation_1 = require("./project-validation");
const MODES = new Set(["none", "credentials", "storage_state", "existing_session"]);
function cleanText(value, max = 500) {
    return String(value || "").trim().slice(0, max);
}
function normalizeUrl(value) {
    const url = cleanText(value, 600).replace(/\/+$/, "");
    if (url && !/^https?:\/\//i.test(url))
        throw new Error("项目测试地址必须以 http:// 或 https:// 开头");
    return url;
}
function assertProject(projectInput) {
    const project = (0, project_validation_1.validateProjectName)(projectInput);
    if (!(0, db_1.getConfigs)().some(config => config.name === project))
        throw new Error("项目不存在");
    return project;
}
function normalizeStored(raw) {
    const mode = MODES.has(raw?.mode) ? raw.mode : "none";
    return {
        enabled: raw?.enabled === true && mode !== "none",
        mode,
        baseUrl: cleanText(raw?.baseUrl, 600).replace(/\/+$/, ""),
        loginPath: cleanText(raw?.loginPath, 300) || "/login",
        usernameLabel: cleanText(raw?.usernameLabel, 120) || "用户名",
        passwordLabel: cleanText(raw?.passwordLabel, 120) || "密码",
        submitLabel: cleanText(raw?.submitLabel, 120) || "登录",
        successText: cleanText(raw?.successText, 200),
        successUrlIncludes: cleanText(raw?.successUrlIncludes, 300),
        storageStatePath: cleanText(raw?.storageStatePath, 500),
        existingSessionProvider: ["claude-in-chrome", "chrome-devtools"].includes(raw?.existingSessionProvider)
            ? raw.existingSessionProvider
            : "auto",
        usernameRef: cleanText(raw?.usernameRef, 300),
        passwordRef: cleanText(raw?.passwordRef, 300),
        updatedAt: cleanText(raw?.updatedAt, 50),
    };
}
function checksum(profile) {
    return crypto.createHash("sha256").update(JSON.stringify(profile)).digest("hex");
}
function publicProfile(project, profile) {
    return {
        schema: "ccm-project-test-auth-v1",
        project,
        enabled: profile.enabled,
        mode: profile.mode,
        baseUrl: profile.baseUrl,
        loginPath: profile.loginPath,
        usernameLabel: profile.usernameLabel,
        passwordLabel: profile.passwordLabel,
        submitLabel: profile.submitLabel,
        successText: profile.successText,
        successUrlIncludes: profile.successUrlIncludes,
        storageStatePath: profile.storageStatePath,
        existingSessionProvider: profile.existingSessionProvider,
        usernameConfigured: !!profile.usernameRef,
        passwordConfigured: !!profile.passwordRef,
        credentialProtected: (!profile.usernameRef || (0, credential_store_1.isCredentialReference)(profile.usernameRef))
            && (!profile.passwordRef || (0, credential_store_1.isCredentialReference)(profile.passwordRef)),
        checksum: checksum(profile),
        updatedAt: profile.updatedAt,
    };
}
function getProjectTestAuthProfile(projectInput) {
    const project = assertProject(projectInput);
    const configs = (0, db_1.loadProjectConfigs)();
    return publicProfile(project, normalizeStored(configs[project]?.test_auth_profile));
}
function saveProjectTestAuthProfile(projectInput, input) {
    const project = assertProject(projectInput);
    const configs = (0, db_1.loadProjectConfigs)();
    if (!configs[project])
        configs[project] = {};
    const previous = normalizeStored(configs[project].test_auth_profile);
    const mode = MODES.has(input?.mode) ? input.mode : (input?.enabled === true ? "credentials" : "none");
    const enabled = input?.enabled === true && mode !== "none";
    const baseUrl = normalizeUrl(input?.baseUrl);
    const successText = cleanText(input?.successText, 200);
    const successUrlIncludes = cleanText(input?.successUrlIncludes, 300);
    const storageStatePath = cleanText(input?.storageStatePath, 500);
    const hasUsername = input?.clearUsername !== true && (!!cleanText(input?.username, 4000) || !!previous.usernameRef);
    const hasPassword = input?.clearPassword !== true && (!!cleanText(input?.password, 4000) || !!previous.passwordRef);
    if (enabled && mode === "credentials" && (!hasUsername || !hasPassword)) {
        throw new Error("启用账号登录时必须配置用户名和密码");
    }
    if (enabled && mode === "credentials" && !successText && !successUrlIncludes) {
        throw new Error("账号登录需要配置登录成功文本或登录后 URL 特征");
    }
    if (enabled && mode === "storage_state" && !storageStatePath) {
        throw new Error("Storage State 模式需要填写项目内状态文件路径");
    }
    let usernameRef = input?.clearUsername === true ? "" : previous.usernameRef;
    let passwordRef = input?.clearPassword === true ? "" : previous.passwordRef;
    const username = cleanText(input?.username, 4000);
    const password = cleanText(input?.password, 4000);
    if (username)
        usernameRef = (0, credential_store_1.protectCredential)(`project-test-auth:${project}`, "username", username);
    if (password)
        passwordRef = (0, credential_store_1.protectCredential)(`project-test-auth:${project}`, "password", password);
    const next = normalizeStored({
        ...previous,
        enabled,
        mode,
        baseUrl,
        loginPath: input?.loginPath,
        usernameLabel: input?.usernameLabel,
        passwordLabel: input?.passwordLabel,
        submitLabel: input?.submitLabel,
        successText,
        successUrlIncludes,
        storageStatePath,
        existingSessionProvider: input?.existingSessionProvider,
        usernameRef,
        passwordRef,
        updatedAt: new Date().toISOString(),
    });
    configs[project].test_auth_profile = next;
    (0, db_1.saveProjectConfigs)(configs);
    if (previous.usernameRef && previous.usernameRef !== next.usernameRef)
        (0, credential_store_1.deleteCredential)(previous.usernameRef);
    if (previous.passwordRef && previous.passwordRef !== next.passwordRef)
        (0, credential_store_1.deleteCredential)(previous.passwordRef);
    return publicProfile(project, next);
}
function resolveProjectTestAuthProfile(projectInput) {
    const project = assertProject(projectInput);
    const configs = (0, db_1.loadProjectConfigs)();
    const profile = normalizeStored(configs[project]?.test_auth_profile);
    const suffix = crypto.createHash("sha256").update(project).digest("hex").slice(0, 10).toUpperCase();
    const usernameEnv = `CCM_PROJECT_${suffix}_TEST_USERNAME`;
    const passwordEnv = `CCM_PROJECT_${suffix}_TEST_PASSWORD`;
    return {
        ...publicProfile(project, profile),
        fields: profile.mode === "credentials" ? [
            { id: "project-username", label: "用户名", envName: usernameEnv, inputLabel: profile.usernameLabel, valueRef: profile.usernameRef },
            { id: "project-password", label: "密码", envName: passwordEnv, inputLabel: profile.passwordLabel, valueRef: profile.passwordRef },
        ] : [],
        env: profile.enabled && profile.mode === "credentials" ? {
            [usernameEnv]: (0, credential_store_1.resolveCredential)(profile.usernameRef),
            [passwordEnv]: (0, credential_store_1.resolveCredential)(profile.passwordRef),
        } : {},
    };
}
function runProjectTestAuthContractSelfTest() {
    const stored = normalizeStored({
        enabled: true,
        mode: "credentials",
        baseUrl: "http://127.0.0.1:5173/",
        loginPath: "/login",
        usernameRef: "credential://username",
        passwordRef: "credential://password",
        successUrlIncludes: "/dashboard",
    });
    const visible = publicProfile("demo", stored);
    return {
        success: stored.baseUrl === "http://127.0.0.1:5173"
            && visible.usernameConfigured === true
            && visible.passwordConfigured === true
            && !("usernameRef" in visible)
            && !("passwordRef" in visible),
        checks: {
            normalizedBaseUrl: stored.baseUrl === "http://127.0.0.1:5173",
            credentialsReportedWithoutValues: visible.usernameConfigured === true
                && visible.passwordConfigured === true
                && !("usernameRef" in visible)
                && !("passwordRef" in visible),
        },
    };
}
//# sourceMappingURL=project-test-auth.js.map