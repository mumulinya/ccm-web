import {
  BrowserAuthenticationEvidence,
  BrowserCheckResult,
} from "../types";

export interface BrowserAuthenticationSummary {
  configuredChecks: number;
  managedChecks: number;
  existingSessionChecks: number;
  passedChecks: number;
  failedChecks: number;
  blockedChecks: number;
  authenticatedSessions: number;
  credentialEnvNames: string[];
  storageStateCount: number;
  sensitiveArtifactSuppressionCount: number;
  existingSessionProviders: string[];
  minimalEvidenceChecks: number;
  fullEvidenceChecks: number;
  tabContextCheckedChecks: number;
  newTabChecks: number;
}

function resultAuthenticationEvidence(result: BrowserCheckResult) {
  return [
    ...(result.authentication ? [result.authentication] : []),
    ...(result.browserSessions || []).flatMap(session => session.authentication ? [session.authentication] : []),
  ];
}

export function buildBrowserAuthenticationSummary(results: BrowserCheckResult[]): BrowserAuthenticationSummary {
  const configured = results.filter(result => resultAuthenticationEvidence(result).length > 0);
  const evidence = configured.flatMap(resultAuthenticationEvidence);
  const credentialEnvNames = Array.from(new Set(
    evidence.flatMap(item => item.credentialEnvNames || []),
  )).sort();
  const storageStates = new Set(
    evidence
      .map(item => item.storageState?.sha256 || "")
      .filter(Boolean),
  );
  const managedChecks = configured.filter(result =>
    resultAuthenticationEvidence(result).some(item => item.mode !== "existing_session")
  );
  const existingSessionChecks = configured.filter(result =>
    resultAuthenticationEvidence(result).some(item => item.mode === "existing_session")
  );
  const existingSessionEvidence = evidence
    .map(item => item.existingSession)
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  return {
    configuredChecks: configured.length,
    managedChecks: managedChecks.length,
    existingSessionChecks: existingSessionChecks.length,
    passedChecks: configured.filter(result => result.status === "passed").length,
    failedChecks: configured.filter(result => result.status === "failed").length,
    blockedChecks: configured.filter(result => result.status === "blocked").length,
    authenticatedSessions: configured.reduce(
      (sum, result) => sum + (result.browserSessions || []).filter(session => session.authentication).length,
      0,
    ),
    credentialEnvNames,
    storageStateCount: storageStates.size,
    sensitiveArtifactSuppressionCount: configured.filter(result =>
      result.authentication?.sensitiveArtifactsSuppressed
      || (result.browserSessions || []).some(session => session.authentication?.sensitiveArtifactsSuppressed)
    ).length,
    existingSessionProviders: Array.from(new Set(existingSessionEvidence.map(item => item.provider))).sort(),
    minimalEvidenceChecks: existingSessionChecks.filter(result =>
      resultAuthenticationEvidence(result).some(item => item.existingSession?.evidencePolicy === "minimal")
    ).length,
    fullEvidenceChecks: existingSessionChecks.filter(result =>
      resultAuthenticationEvidence(result).some(item => item.existingSession?.evidencePolicy === "full")
    ).length,
    tabContextCheckedChecks: existingSessionChecks.filter(result =>
      resultAuthenticationEvidence(result).some(item => item.existingSession?.tabContextChecked)
    ).length,
    newTabChecks: existingSessionChecks.filter(result =>
      resultAuthenticationEvidence(result).some(item => item.existingSession?.createdNewTab)
    ).length,
  };
}

export function formatBrowserAuthenticationEvidence(evidence?: BrowserAuthenticationEvidence) {
  if (!evidence) return "none";
  if (evidence.mode === "existing_session" && evidence.existingSession) {
    const existing = evidence.existingSession;
    return [
      "mode=existing_session",
      `provider=${existing.provider}`,
      `evidencePolicy=${existing.evidencePolicy}`,
      `tabContextChecked=${existing.tabContextChecked ? "yes" : "no"}`,
      `newTab=${existing.createdNewTab ? "yes" : "no"}`,
      `observations=pageText:${existing.pageTextObserved ? "yes" : "no"},console:${existing.consoleMessageCount},network:${existing.networkRequestCount}`,
      existing.screenshotSuppressed ? "screenshotSuppressed=yes" : "",
      existing.transcriptDetailsSuppressed ? "transcriptDetailsSuppressed=yes" : "",
      evidence.sensitiveArtifactsSuppressed ? "sensitiveArtifactsSuppressed=yes" : "",
    ].filter(Boolean).join("; ");
  }
  const storage = evidence.storageState;
  const credentialEnvNames = evidence.credentialEnvNames || [];
  return [
    "mode=managed",
    `credentialEnvNames=${credentialEnvNames.length ? credentialEnvNames.join(",") : "none"}`,
    storage
      ? `storageState=${storage.fileName} bytes=${storage.sizeBytes} cookies=${storage.cookieCount} origins=${storage.originCount} sha256=${storage.sha256.slice(0, 12)}`
      : "",
    evidence.sensitiveArtifactsSuppressed ? "sensitiveArtifactsSuppressed=yes" : "",
  ].filter(Boolean).join("; ");
}

export function formatBrowserAuthenticationSummaryLine(summary: BrowserAuthenticationSummary) {
  return [
    `checks:${summary.configuredChecks}`,
    `managed:${summary.managedChecks}`,
    `existingSession:${summary.existingSessionChecks}`,
    `passed:${summary.passedChecks}`,
    `failed:${summary.failedChecks}`,
    `blocked:${summary.blockedChecks}`,
    `sessions:${summary.authenticatedSessions}`,
    `credentialEnvNames:${summary.credentialEnvNames.length}`,
    `storageStates:${summary.storageStateCount}`,
    `artifactSuppressions:${summary.sensitiveArtifactSuppressionCount}`,
    `existingProviders:${summary.existingSessionProviders.join(",") || "none"}`,
    `minimal:${summary.minimalEvidenceChecks}`,
    `full:${summary.fullEvidenceChecks}`,
    `tabContext:${summary.tabContextCheckedChecks}`,
    `newTabs:${summary.newTabChecks}`,
  ].join(" ");
}
