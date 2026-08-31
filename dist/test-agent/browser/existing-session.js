"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBrowserAuthenticationConfig = normalizeBrowserAuthenticationConfig;
exports.browserExistingSessionConfig = browserExistingSessionConfig;
exports.browserCheckUsesExistingSession = browserCheckUsesExistingSession;
exports.browserExistingSessionUsesMinimalEvidence = browserExistingSessionUsesMinimalEvidence;
exports.buildExistingSessionAuthenticationEvidence = buildExistingSessionAuthenticationEvidence;
const MODE_ALIASES = {
    existing: "existing_session",
    existing_session: "existing_session",
    existing_browser_session: "existing_session",
    authenticated_chrome: "existing_session",
    user_browser: "existing_session",
    oauth: "existing_session",
    sso: "existing_session",
};
const PROVIDER_ALIASES = {
    auto: "auto",
    claude_in_chrome: "claude-in-chrome",
    "claude-in-chrome": "claude-in-chrome",
    chrome_extension: "claude-in-chrome",
    chrome_devtools: "chrome-devtools",
    "chrome-devtools": "chrome-devtools",
    devtools: "chrome-devtools",
};
const EVIDENCE_POLICY_ALIASES = {
    minimal: "minimal",
    private: "minimal",
    privacy_first: "minimal",
    full: "full",
    detailed: "full",
};
function normalizedToken(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s]+/g, "_");
}
function objectValue(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function normalizeBrowserAuthenticationConfig(rawCheck) {
    if (rawCheck?.authentication !== undefined
        && (!rawCheck.authentication || typeof rawCheck.authentication !== "object" || Array.isArray(rawCheck.authentication))) {
        return {
            config: undefined,
            errors: ["Browser authentication must be an object with mode/provider/evidencePolicy fields."],
        };
    }
    const nested = objectValue(rawCheck?.authentication || rawCheck?.auth);
    const rawMode = nested.mode
        || nested.authenticationMode
        || nested.authentication_mode
        || rawCheck?.authenticationMode
        || rawCheck?.authentication_mode
        || rawCheck?.authMode
        || rawCheck?.auth_mode;
    if (rawMode === undefined || rawMode === null || rawMode === "") {
        return { config: undefined, errors: [] };
    }
    const errors = [];
    for (const key of ["credentials", "username", "email", "password", "token", "cookies", "origins", "storageState", "storage_state"]) {
        if (Object.prototype.hasOwnProperty.call(nested, key)) {
            errors.push(`Existing-session browser authentication must not contain raw ${key}; use the already authenticated browser profile.`);
        }
    }
    const mode = MODE_ALIASES[normalizedToken(rawMode)];
    if (!mode)
        errors.push(`Unsupported browser authentication mode "${String(rawMode)}".`);
    const rawProvider = nested.provider
        || nested.browserProvider
        || nested.browser_provider
        || rawCheck?.existingSessionProvider
        || rawCheck?.existing_session_provider
        || rawCheck?.authenticatedBrowserProvider
        || rawCheck?.authenticated_browser_provider
        || "auto";
    const provider = PROVIDER_ALIASES[normalizedToken(rawProvider)];
    if (!provider)
        errors.push(`Unsupported existing-session browser provider "${String(rawProvider)}".`);
    const rawEvidencePolicy = nested.evidencePolicy
        || nested.evidence_policy
        || nested.artifactPolicy
        || nested.artifact_policy
        || rawCheck?.existingSessionEvidencePolicy
        || rawCheck?.existing_session_evidence_policy
        || "minimal";
    const evidencePolicy = EVIDENCE_POLICY_ALIASES[normalizedToken(rawEvidencePolicy)];
    if (!evidencePolicy)
        errors.push(`Unsupported existing-session evidence policy "${String(rawEvidencePolicy)}".`);
    return {
        config: mode && provider && evidencePolicy
            ? { mode, provider, evidencePolicy }
            : undefined,
        errors,
    };
}
function browserExistingSessionConfig(check) {
    return check.authentication?.mode === "existing_session"
        ? {
            mode: "existing_session",
            provider: check.authentication.provider || "auto",
            evidencePolicy: check.authentication.evidencePolicy || "minimal",
        }
        : null;
}
function browserCheckUsesExistingSession(check) {
    return Boolean(browserExistingSessionConfig(check));
}
function browserExistingSessionUsesMinimalEvidence(check) {
    return browserExistingSessionConfig(check)?.evidencePolicy === "minimal";
}
function buildExistingSessionAuthenticationEvidence(existingSession) {
    return {
        mode: "existing_session",
        credentialEnvNames: [],
        existingSession,
        ...(existingSession.evidencePolicy === "minimal" ? { sensitiveArtifactsSuppressed: true } : {}),
    };
}
//# sourceMappingURL=existing-session.js.map