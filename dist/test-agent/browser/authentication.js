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
exports.browserActionValueEnvName = browserActionValueEnvName;
exports.isValidBrowserEnvironmentName = isValidBrowserEnvironmentName;
exports.browserActionSupportsEnvironmentValue = browserActionSupportsEnvironmentValue;
exports.resolveBrowserActionValue = resolveBrowserActionValue;
exports.browserCheckAuthenticationActions = browserCheckAuthenticationActions;
exports.browserSessionAuthenticationActions = browserSessionAuthenticationActions;
exports.browserAuthenticationEnvNames = browserAuthenticationEnvNames;
exports.browserCheckAuthenticationEnvNames = browserCheckAuthenticationEnvNames;
exports.browserCheckHasStorageState = browserCheckHasStorageState;
exports.browserCheckRequiresAuthentication = browserCheckRequiresAuthentication;
exports.browserCheckRequiresManagedAuthentication = browserCheckRequiresManagedAuthentication;
exports.resolveBrowserSecretBindings = resolveBrowserSecretBindings;
exports.redactBrowserSensitiveText = redactBrowserSensitiveText;
exports.browserStorageStatePath = browserStorageStatePath;
exports.loadBrowserStorageState = loadBrowserStorageState;
exports.buildBrowserAuthenticationEvidence = buildBrowserAuthenticationEvidence;
exports.browserAuthenticationEvidenceErrors = browserAuthenticationEvidenceErrors;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const existing_session_1 = require("./existing-session");
const ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_STORAGE_STATE_BYTES = 5 * 1024 * 1024;
const ENV_VALUE_ACTIONS = new Set([
    "fill",
    "selectOption",
    "setClipboard",
    "setCookie",
    "setLocalStorage",
    "setSessionStorage",
    "typeText",
]);
function browserActionValueEnvName(action) {
    return String(action.valueEnv
        || action.value_env
        || action.textEnv
        || action.text_env
        || action.contentEnv
        || action.content_env
        || "").trim();
}
function isValidBrowserEnvironmentName(value) {
    return ENV_NAME_PATTERN.test(String(value || ""));
}
function browserActionSupportsEnvironmentValue(action) {
    return ENV_VALUE_ACTIONS.has(action.type);
}
function directActionValue(action) {
    if (action.value !== undefined)
        return { provided: true, value: String(action.value) };
    if (action.text !== undefined)
        return { provided: true, value: String(action.text) };
    if (action.content !== undefined)
        return { provided: true, value: String(action.content) };
    return { provided: false, value: "" };
}
function resolveBrowserActionValue(project, action) {
    const envName = browserActionValueEnvName(action);
    if (envName) {
        const projectHasValue = Object.prototype.hasOwnProperty.call(project.env || {}, envName);
        const raw = projectHasValue ? project.env[envName] : process.env[envName];
        if (raw === undefined) {
            throw new Error(`Browser action ${action.type} requires environment variable "${envName}", but it is not defined.`);
        }
        return {
            value: String(raw),
            provided: true,
            source: "environment",
            envName,
        };
    }
    const direct = directActionValue(action);
    return {
        ...direct,
        source: direct.provided ? "literal" : "none",
    };
}
function actionsFromSessionStep(step) {
    if (!step || typeof step !== "object")
        return [];
    if (step.action)
        return [step.action];
    if (Array.isArray(step.parallel))
        return step.parallel.flatMap(actionsFromSessionStep);
    return [];
}
function actionsFromNamedSessionStep(step, sessionName) {
    if (!step || typeof step !== "object")
        return [];
    if (step.action && String(step.session || "").trim().toLowerCase() === sessionName.toLowerCase()) {
        return [step.action];
    }
    if (Array.isArray(step.parallel)) {
        return step.parallel.flatMap((item) => actionsFromNamedSessionStep(item, sessionName));
    }
    return [];
}
function browserCheckAuthenticationActions(check) {
    return [
        ...(check.actions || []),
        ...(check.sessions || []).flatMap(session => session.setupActions || session.setup_actions || []),
        ...(check.sessionSteps || check.session_steps || []).flatMap(actionsFromSessionStep),
    ];
}
function browserSessionAuthenticationActions(check, session) {
    return [
        ...(session.setupActions || session.setup_actions || []),
        ...(check.sessionSteps || check.session_steps || [])
            .flatMap(step => actionsFromNamedSessionStep(step, session.name)),
    ];
}
function browserAuthenticationEnvNames(actions) {
    return Array.from(new Set(actions.map(browserActionValueEnvName).filter(Boolean))).sort();
}
function browserCheckAuthenticationEnvNames(check) {
    return browserAuthenticationEnvNames(browserCheckAuthenticationActions(check));
}
function browserCheckHasStorageState(check) {
    return Boolean(browserStorageStatePath(check)
        || (check.sessions || []).some(session => browserStorageStatePath(session)));
}
function browserCheckRequiresAuthentication(check) {
    return browserCheckRequiresManagedAuthentication(check) || (0, existing_session_1.browserCheckUsesExistingSession)(check);
}
function browserCheckRequiresManagedAuthentication(check) {
    return browserCheckAuthenticationEnvNames(check).length > 0 || browserCheckHasStorageState(check);
}
function resolveBrowserSecretBindings(project, actions) {
    const bindings = [];
    const seen = new Set();
    for (const action of actions) {
        const envName = browserActionValueEnvName(action);
        if (!envName || seen.has(envName))
            continue;
        const resolved = resolveBrowserActionValue(project, action);
        bindings.push({ envName, value: resolved.value });
        seen.add(envName);
    }
    return bindings;
}
function redactBrowserSensitiveText(value, bindings) {
    let text = String(value ?? "");
    const ordered = bindings
        .filter(binding => binding.value)
        .sort((left, right) => right.value.length - left.value.length);
    for (const binding of ordered) {
        text = text.split(binding.value).join(`[redacted:${binding.envName}]`);
    }
    return text;
}
function browserStorageStatePath(source) {
    return String(source.storageStatePath
        || source.storage_state_path
        || source.authStatePath
        || source.auth_state_path
        || "").trim();
}
function storageStateEvidence(filePath, content, parsed) {
    return {
        source: "file",
        fileName: path.basename(filePath),
        sizeBytes: content.length,
        sha256: crypto.createHash("sha256").update(content).digest("hex"),
        cookieCount: Array.isArray(parsed.cookies) ? parsed.cookies.length : 0,
        originCount: Array.isArray(parsed.origins) ? parsed.origins.length : 0,
    };
}
function storageStateSecretBindings(parsed) {
    const candidates = [];
    for (const [index, cookie] of (Array.isArray(parsed.cookies) ? parsed.cookies : []).entries()) {
        const name = String(cookie?.name || `COOKIE_${index + 1}`).replace(/[^A-Za-z0-9_]/g, "_").toUpperCase();
        candidates.push({
            envName: `STORAGE_STATE_COOKIE_${name}`,
            value: String(cookie?.value || ""),
        });
    }
    for (const [originIndex, origin] of (Array.isArray(parsed.origins) ? parsed.origins : []).entries()) {
        for (const [itemIndex, item] of (Array.isArray(origin?.localStorage) ? origin.localStorage : []).entries()) {
            const name = String(item?.name || `ITEM_${itemIndex + 1}`).replace(/[^A-Za-z0-9_]/g, "_").toUpperCase();
            candidates.push({
                envName: `STORAGE_STATE_ORIGIN_${originIndex + 1}_${name}`,
                value: String(item?.value || ""),
            });
        }
    }
    const seen = new Set();
    return candidates.filter(candidate => {
        if (!candidate.value || seen.has(candidate.value))
            return false;
        seen.add(candidate.value);
        return true;
    });
}
function loadBrowserStorageState(project, source) {
    const configuredPath = browserStorageStatePath(source);
    if (!configuredPath)
        return null;
    const filePath = path.isAbsolute(configuredPath)
        ? path.resolve(configuredPath)
        : path.resolve(project.workDir, configuredPath);
    let content;
    try {
        content = fs.readFileSync(filePath);
    }
    catch (error) {
        throw new Error(`Browser storage state file could not be read: ${path.basename(filePath)} (${error.message || String(error)}).`);
    }
    if (content.length > MAX_STORAGE_STATE_BYTES) {
        throw new Error(`Browser storage state file ${path.basename(filePath)} exceeds ${MAX_STORAGE_STATE_BYTES} bytes.`);
    }
    let parsed;
    try {
        parsed = JSON.parse(content.toString("utf-8"));
    }
    catch {
        throw new Error(`Browser storage state file ${path.basename(filePath)} is not valid JSON.`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`Browser storage state file ${path.basename(filePath)} must contain a JSON object.`);
    }
    if (parsed.cookies !== undefined && !Array.isArray(parsed.cookies)) {
        throw new Error(`Browser storage state file ${path.basename(filePath)} has a non-array cookies field.`);
    }
    if (parsed.origins !== undefined && !Array.isArray(parsed.origins)) {
        throw new Error(`Browser storage state file ${path.basename(filePath)} has a non-array origins field.`);
    }
    return {
        path: filePath,
        evidence: storageStateEvidence(filePath, content, parsed),
        secretBindings: storageStateSecretBindings(parsed),
    };
}
function buildBrowserAuthenticationEvidence(input) {
    const credentialEnvNames = Array.from(new Set(input.credentialEnvNames || [])).filter(Boolean).sort();
    if (!credentialEnvNames.length && !input.storageState)
        return undefined;
    return {
        mode: "managed",
        credentialEnvNames,
        ...(input.storageState ? { storageState: input.storageState } : {}),
        ...(input.sensitiveArtifactsSuppressed ? { sensitiveArtifactsSuppressed: true } : {}),
    };
}
function browserAuthenticationEvidenceErrors(evidence, label) {
    const errors = [];
    for (const key of ["path", "cookies", "origins", "value", "values", "token", "password", "username"]) {
        if (Object.prototype.hasOwnProperty.call(evidence, key)) {
            errors.push(`${label}.${key} must not contain raw credentials or authentication state.`);
        }
    }
    const names = evidence.credentialEnvNames || [];
    if (new Set(names).size !== names.length)
        errors.push(`${label}.credentialEnvNames contains duplicates.`);
    if (names.some(name => !isValidBrowserEnvironmentName(name)))
        errors.push(`${label}.credentialEnvNames contains an invalid environment variable name.`);
    const storage = evidence.storageState;
    if (storage) {
        if (storage.source !== "file")
            errors.push(`${label}.storageState.source must be file.`);
        if (!storage.fileName || path.basename(storage.fileName) !== storage.fileName)
            errors.push(`${label}.storageState.fileName must be a base file name.`);
        if (!/^[a-f0-9]{64}$/i.test(storage.sha256 || ""))
            errors.push(`${label}.storageState.sha256 is not a SHA-256 digest.`);
        if (!Number.isInteger(storage.sizeBytes) || storage.sizeBytes < 0)
            errors.push(`${label}.storageState.sizeBytes must be non-negative.`);
        if (!Number.isInteger(storage.cookieCount) || storage.cookieCount < 0)
            errors.push(`${label}.storageState.cookieCount must be non-negative.`);
        if (!Number.isInteger(storage.originCount) || storage.originCount < 0)
            errors.push(`${label}.storageState.originCount must be non-negative.`);
        for (const key of ["path", "cookies", "origins", "value", "values", "token", "password", "username"]) {
            if (Object.prototype.hasOwnProperty.call(storage, key))
                errors.push(`${label}.storageState.${key} must not contain raw authentication state.`);
        }
    }
    const mode = evidence.mode || (evidence.existingSession ? "existing_session" : "managed");
    if (mode === "existing_session") {
        if (names.length)
            errors.push(`${label}.credentialEnvNames must be empty for existing-session authentication.`);
        if (storage)
            errors.push(`${label}.storageState is not allowed for existing-session authentication.`);
        const existing = evidence.existingSession;
        if (!existing) {
            errors.push(`${label}.existingSession is required for existing-session authentication.`);
        }
        else {
            if (existing.provider !== "claude-in-chrome" && existing.provider !== "chrome-devtools") {
                errors.push(`${label}.existingSession.provider is not a supported authenticated Chrome provider.`);
            }
            if (existing.evidencePolicy !== "minimal" && existing.evidencePolicy !== "full") {
                errors.push(`${label}.existingSession.evidencePolicy must be minimal or full.`);
            }
            if (typeof existing.tabContextChecked !== "boolean")
                errors.push(`${label}.existingSession.tabContextChecked must be boolean.`);
            if (existing.tabCount !== undefined && (!Number.isInteger(existing.tabCount) || existing.tabCount < 0)) {
                errors.push(`${label}.existingSession.tabCount must be non-negative.`);
            }
            if (typeof existing.createdNewTab !== "boolean")
                errors.push(`${label}.existingSession.createdNewTab must be boolean.`);
            if (typeof existing.pageTextObserved !== "boolean")
                errors.push(`${label}.existingSession.pageTextObserved must be boolean.`);
            if (!Number.isInteger(existing.consoleMessageCount) || existing.consoleMessageCount < 0) {
                errors.push(`${label}.existingSession.consoleMessageCount must be non-negative.`);
            }
            if (!Number.isInteger(existing.networkRequestCount) || existing.networkRequestCount < 0) {
                errors.push(`${label}.existingSession.networkRequestCount must be non-negative.`);
            }
            for (const key of ["tabId", "tab_id", "url", "urls", "title", "titles", "pageText", "page_text", "consoleMessages", "networkRequests"]) {
                if (Object.prototype.hasOwnProperty.call(existing, key)) {
                    errors.push(`${label}.existingSession.${key} must not contain raw tab or page data.`);
                }
            }
            if (existing.evidencePolicy === "minimal") {
                if (!evidence.sensitiveArtifactsSuppressed) {
                    errors.push(`${label}.sensitiveArtifactsSuppressed must be true for minimal existing-session evidence.`);
                }
                if (!existing.transcriptDetailsSuppressed) {
                    errors.push(`${label}.existingSession.transcriptDetailsSuppressed must be true for minimal existing-session evidence.`);
                }
            }
        }
    }
    else if (evidence.existingSession) {
        errors.push(`${label}.existingSession is not allowed for managed authentication.`);
    }
    return errors;
}
//# sourceMappingURL=authentication.js.map