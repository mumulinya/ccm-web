import {
  BrowserAuthenticationConfig,
  BrowserAuthenticationEvidence,
  BrowserCheckSpec,
  BrowserExistingSessionEvidence,
  BrowserExistingSessionEvidencePolicy,
  BrowserExistingSessionProvider,
} from "../types";

const MODE_ALIASES: Record<string, BrowserAuthenticationConfig["mode"]> = {
  existing: "existing_session",
  existing_session: "existing_session",
  existing_browser_session: "existing_session",
  authenticated_chrome: "existing_session",
  user_browser: "existing_session",
  oauth: "existing_session",
  sso: "existing_session",
};

const PROVIDER_ALIASES: Record<string, BrowserExistingSessionProvider> = {
  auto: "auto",
  claude_in_chrome: "claude-in-chrome",
  "claude-in-chrome": "claude-in-chrome",
  chrome_extension: "claude-in-chrome",
  chrome_devtools: "chrome-devtools",
  "chrome-devtools": "chrome-devtools",
  devtools: "chrome-devtools",
};

const EVIDENCE_POLICY_ALIASES: Record<string, BrowserExistingSessionEvidencePolicy> = {
  minimal: "minimal",
  private: "minimal",
  privacy_first: "minimal",
  full: "full",
  detailed: "full",
};

function normalizedToken(value: any) {
  return String(value || "").trim().toLowerCase().replace(/[\s]+/g, "_");
}

function objectValue(value: any) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function normalizeBrowserAuthenticationConfig(rawCheck: any) {
  if (
    rawCheck?.authentication !== undefined
    && (!rawCheck.authentication || typeof rawCheck.authentication !== "object" || Array.isArray(rawCheck.authentication))
  ) {
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
    return { config: undefined, errors: [] as string[] };
  }

  const errors: string[] = [];
  for (const key of ["credentials", "username", "email", "password", "token", "cookies", "origins", "storageState", "storage_state"]) {
    if (Object.prototype.hasOwnProperty.call(nested, key)) {
      errors.push(`Existing-session browser authentication must not contain raw ${key}; use the already authenticated browser profile.`);
    }
  }
  const mode = MODE_ALIASES[normalizedToken(rawMode)];
  if (!mode) errors.push(`Unsupported browser authentication mode "${String(rawMode)}".`);

  const rawProvider = nested.provider
    || nested.browserProvider
    || nested.browser_provider
    || rawCheck?.existingSessionProvider
    || rawCheck?.existing_session_provider
    || rawCheck?.authenticatedBrowserProvider
    || rawCheck?.authenticated_browser_provider
    || "auto";
  const provider = PROVIDER_ALIASES[normalizedToken(rawProvider)];
  if (!provider) errors.push(`Unsupported existing-session browser provider "${String(rawProvider)}".`);

  const rawEvidencePolicy = nested.evidencePolicy
    || nested.evidence_policy
    || nested.artifactPolicy
    || nested.artifact_policy
    || rawCheck?.existingSessionEvidencePolicy
    || rawCheck?.existing_session_evidence_policy
    || "minimal";
  const evidencePolicy = EVIDENCE_POLICY_ALIASES[normalizedToken(rawEvidencePolicy)];
  if (!evidencePolicy) errors.push(`Unsupported existing-session evidence policy "${String(rawEvidencePolicy)}".`);

  return {
    config: mode && provider && evidencePolicy
      ? { mode, provider, evidencePolicy } as BrowserAuthenticationConfig
      : undefined,
    errors,
  };
}

export function browserExistingSessionConfig(check: BrowserCheckSpec) {
  return check.authentication?.mode === "existing_session"
    ? {
        mode: "existing_session" as const,
        provider: check.authentication.provider || "auto",
        evidencePolicy: check.authentication.evidencePolicy || "minimal",
      }
    : null;
}

export function browserCheckUsesExistingSession(check: BrowserCheckSpec) {
  return Boolean(browserExistingSessionConfig(check));
}

export function browserExistingSessionUsesMinimalEvidence(check: BrowserCheckSpec) {
  return browserExistingSessionConfig(check)?.evidencePolicy === "minimal";
}

export function buildExistingSessionAuthenticationEvidence(
  existingSession: BrowserExistingSessionEvidence,
): BrowserAuthenticationEvidence {
  return {
    mode: "existing_session",
    credentialEnvNames: [],
    existingSession,
    ...(existingSession.evidencePolicy === "minimal" ? { sensitiveArtifactsSuppressed: true } : {}),
  };
}
