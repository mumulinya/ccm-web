import * as crypto from "crypto";

export const NATIVE_SESSION_CONTINUATION_EVIDENCE_SCHEMA = "ccm-native-session-continuation-evidence-v1";
export const NATIVE_CONTINUATION_CAPABILITY_PROFILE_SCHEMA = "ccm-native-continuation-capability-profile-v1";

const NATIVE_CONTINUATION_PROFILES: Record<string, any> = {
  claudecode: {
    provider: "claudecode",
    aliases: ["claudecode", "claude-code", "claude_code", "cc", "claude"],
    sessionResume: true,
    resumeAckPolicy: "exit_success",
    sessionIdOrigin: "ccm_assigned",
    nativeFork: false,
    forkStrategy: "scratchpad_new_session",
  },
  cursor: {
    provider: "cursor",
    aliases: ["cursor", "agent", "cursor-agent"],
    sessionResume: true,
    resumeAckPolicy: "provider_output",
    sessionIdOrigin: "provider_output",
    nativeFork: false,
    forkStrategy: "scratchpad_new_session",
  },
  codex: {
    provider: "codex",
    aliases: ["codex"],
    sessionResume: true,
    resumeAckPolicy: "provider_output",
    sessionIdOrigin: "provider_output",
    nativeFork: false,
    forkStrategy: "scratchpad_new_session",
  },
  gemini: {
    provider: "gemini",
    aliases: ["gemini"],
    sessionResume: false,
    resumeAckPolicy: "unsupported",
    sessionIdOrigin: "none",
    nativeFork: false,
    forkStrategy: "scratchpad_new_session",
  },
  qoder: {
    provider: "qoder",
    aliases: ["qoder", "qoder-cli"],
    sessionResume: false,
    resumeAckPolicy: "unsupported",
    sessionIdOrigin: "none",
    nativeFork: false,
    forkStrategy: "scratchpad_new_session",
  },
};

export function getNativeContinuationCapabilityProfile(provider: any) {
  const raw = String(provider || "").trim().toLowerCase();
  const source = Object.values(NATIVE_CONTINUATION_PROFILES).find(profile => profile.provider === raw || profile.aliases.includes(raw));
  const profile = source || {
    provider: raw || "unknown",
    aliases: [],
    sessionResume: false,
    resumeAckPolicy: "unsupported",
    sessionIdOrigin: "none",
    nativeFork: false,
    forkStrategy: "scratchpad_new_session",
  };
  return {
    schema: NATIVE_CONTINUATION_CAPABILITY_PROFILE_SCHEMA,
    version: 1,
    provider: profile.provider,
    sessionResume: profile.sessionResume === true,
    resumeAckPolicy: String(profile.resumeAckPolicy || "unsupported"),
    sessionIdOrigin: String(profile.sessionIdOrigin || "none"),
    nativeFork: profile.nativeFork === true,
    forkStrategy: String(profile.forkStrategy || "scratchpad_new_session"),
  };
}

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result: any, key) => {
    if (value[key] !== undefined) result[key] = canonical(value[key]);
    return result;
  }, {});
}

function checksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

function evidenceChecksum(evidence: any) {
  const payload = { ...(evidence || {}) };
  delete payload.evidenceChecksum;
  delete payload.checksumValid;
  return checksum(payload);
}

export function buildNativeSessionContinuationEvidence(input: any = {}) {
  const profile = getNativeContinuationCapabilityProfile(input.provider || input.runtime || input.agentType || input.agent_type || "");
  const requestedNativeSessionId = String(input.requestedNativeSessionId || input.requested_native_session_id || "").trim();
  const returnedNativeSessionId = String(input.returnedNativeSessionId || input.returned_native_session_id || "").trim();
  const providerOutputContractEvidence = input.providerOutputContractEvidence || input.provider_output_contract_evidence || null;
  const providerRuntimeVersionSnapshot = input.providerRuntimeVersionSnapshot
    || input.provider_runtime_version_snapshot
    || providerOutputContractEvidence?.runtimeVersionSnapshot
    || null;
  const expectedProviderContractId = String(input.expectedProviderContractId || input.expected_provider_contract_id || "").trim();
  const observedProviderContractId = String(providerOutputContractEvidence?.providerContractId || providerOutputContractEvidence?.provider_contract_id || "").trim();
  const providerContractId = observedProviderContractId || (!expectedProviderContractId ? `pcc_legacy_${profile.provider}` : "");
  const providerContractEvidenceMode = observedProviderContractId ? "versioned" : providerContractId ? "legacy_migration" : "missing";
  const providerRuntimeVersionStatus = String(providerRuntimeVersionSnapshot?.status || providerOutputContractEvidence?.runtimeVersionStatus || "unobserved");
  const providerRuntimeVersion = String(providerRuntimeVersionSnapshot?.semanticVersion || providerRuntimeVersionSnapshot?.versionText || providerOutputContractEvidence?.runtimeVersion || "");
  const providerRuntimeIdentityChecksum = String(providerRuntimeVersionSnapshot?.executableIdentityChecksum || providerOutputContractEvidence?.runtimeIdentityChecksum || "");
  const providerOutputContractStatus = String(providerOutputContractEvidence?.status || (returnedNativeSessionId ? "missing_contract_evidence" : "not_observed"));
  const providerOutputContractProviderMatched = !!providerOutputContractEvidence
    && String(providerOutputContractEvidence.provider || "") === profile.provider;
  const providerOutputContractSessionMatched = !!returnedNativeSessionId
    && String(providerOutputContractEvidence?.sessionId || providerOutputContractEvidence?.trustedSessionId || "") === returnedNativeSessionId;
  const providerOutputContractRecognized = providerOutputContractStatus === "recognized"
    && providerOutputContractProviderMatched
    && providerOutputContractSessionMatched
    && Number(providerOutputContractEvidence?.recognizedContractEventCount || 0) > 0;
  const nativeResumeRequested = input.nativeResumeRequested === true || input.native_resume_requested === true;
  const nativeForkRequested = input.nativeForkRequested === true || input.native_fork_requested === true;
  const runnerSuccess = input.runnerSuccess === true || input.runner_success === true;
  const effectiveNativeSessionId = returnedNativeSessionId || requestedNativeSessionId;
  const evidenceSource = returnedNativeSessionId
    ? providerOutputContractRecognized ? "provider_output" : "provider_output_unverified"
    : nativeResumeRequested && requestedNativeSessionId && runnerSuccess
      ? "provider_resume_exit_success"
      : requestedNativeSessionId ? "request_fallback" : "missing";
  const providerReturnMatchedRequest = !!returnedNativeSessionId
    && !!requestedNativeSessionId
    && returnedNativeSessionId === requestedNativeSessionId;
  const sourceAllowedByProfile = evidenceSource === "provider_output"
    ? profile.sessionResume === true && (profile.resumeAckPolicy !== "provider_output" || providerOutputContractRecognized)
    : evidenceSource === "provider_resume_exit_success" && profile.resumeAckPolicy === "exit_success";
  const providerContractTransition = !!expectedProviderContractId
    && !!providerContractId
    && expectedProviderContractId !== providerContractId;
  const providerContractCurrentEvidenceVerified = !!providerContractId
    && (providerRuntimeVersionStatus === "ok" || (!expectedProviderContractId && providerRuntimeVersionStatus === "unobserved"))
    && (profile.resumeAckPolicy === "provider_output" ? providerOutputContractRecognized : runnerSuccess);
  const providerContractContinuityVerified = providerContractCurrentEvidenceVerified
    && (!providerContractTransition
      || (profile.resumeAckPolicy === "provider_output" ? providerReturnMatchedRequest : runnerSuccess));
  const nativeContinuationAcknowledged = runnerSuccess
    && nativeResumeRequested
    && !nativeForkRequested
    && profile.sessionResume === true
    && !!requestedNativeSessionId
    && sourceAllowedByProfile
    && providerContractContinuityVerified
    && (providerReturnMatchedRequest || (!returnedNativeSessionId && evidenceSource === "provider_resume_exit_success"));
  const evidence: any = {
    schema: NATIVE_SESSION_CONTINUATION_EVIDENCE_SCHEMA,
    version: 4,
    provider: profile.provider,
    runnerRequestId: String(input.runnerRequestId || input.runner_request_id || ""),
    requestedNativeSessionId,
    returnedNativeSessionId,
    effectiveNativeSessionId,
    nativeResumeRequested,
    nativeForkRequested,
    runnerSuccess,
    evidenceSource,
    providerOutputContractEvidence,
    providerOutputContractStatus,
    providerOutputContractProviderMatched,
    providerOutputContractSessionMatched,
    providerOutputContractRecognized,
    providerOutputFormatFingerprint: String(providerOutputContractEvidence?.formatFingerprint || ""),
    providerRuntimeVersionSnapshot,
    providerRuntimeVersionStatus,
    providerRuntimeVersion,
    providerRuntimeIdentityChecksum,
    expectedProviderContractId,
    providerContractId,
    providerContractEvidenceMode,
    providerContractTransition,
    providerContractCurrentEvidenceVerified,
    providerContractContinuityVerified,
    continuationCapabilityProfile: profile,
    resumeAckPolicy: profile.resumeAckPolicy,
    sourceAllowedByProfile,
    providerReturnMatchedRequest,
    nativeContinuationAcknowledged,
    nativeSessionReusable: providerContractContinuityVerified && (profile.resumeAckPolicy === "exit_success"
      ? !!requestedNativeSessionId && runnerSuccess
      : !!returnedNativeSessionId && providerOutputContractRecognized),
    compatibilityStatus: nativeForkRequested && profile.nativeFork !== true
      ? "native_fork_unsupported"
      : nativeResumeRequested && profile.sessionResume !== true
        ? "native_resume_unsupported"
        : nativeResumeRequested && profile.resumeAckPolicy === "provider_output" && providerOutputContractStatus === "output_format_drift"
          ? "provider_output_format_drift"
        : nativeResumeRequested && profile.resumeAckPolicy === "provider_output" && !providerOutputContractRecognized
            ? "provider_output_contract_unverified"
        : nativeResumeRequested && providerContractTransition && !providerContractContinuityVerified
          ? "provider_runtime_contract_transition_unverified"
          : nativeResumeRequested && providerContractTransition && providerContractContinuityVerified
            ? "provider_runtime_contract_transition_verified"
          : nativeResumeRequested && !providerContractCurrentEvidenceVerified
            ? "provider_runtime_contract_unverified"
        : nativeResumeRequested && !sourceAllowedByProfile
          ? "resume_evidence_insufficient"
          : nativeContinuationAcknowledged ? "acknowledged" : "not_requested",
    observedAt: String(input.observedAt || input.observed_at || new Date().toISOString()),
  };
  evidence.evidenceChecksum = evidenceChecksum(evidence);
  return evidence;
}

export function verifyNativeSessionContinuationEvidence(evidence: any, expected: any = {}) {
  const issues: string[] = [];
  if (evidence?.schema !== NATIVE_SESSION_CONTINUATION_EVIDENCE_SCHEMA || Number(evidence?.version || 0) !== 4) issues.push("schema_invalid");
  if (String(evidence?.evidenceChecksum || "") !== evidenceChecksum(evidence)) issues.push("checksum_invalid");
  const allowedSources = new Set(["provider_output", "provider_output_unverified", "provider_resume_exit_success", "request_fallback", "missing"]);
  if (!allowedSources.has(String(evidence?.evidenceSource || ""))) issues.push("evidence_source_invalid");
  for (const [key, aliases] of Object.entries({
    provider: ["provider", "runtime", "agentType", "agent_type"],
    runnerRequestId: ["runnerRequestId", "runner_request_id"],
    requestedNativeSessionId: ["requestedNativeSessionId", "requested_native_session_id"],
    expectedProviderContractId: ["expectedProviderContractId", "expected_provider_contract_id", "providerContractId", "provider_contract_id"],
  })) {
    const expectedValue = (aliases as string[]).map(alias => expected?.[alias]).find(value => String(value || "").trim());
    const normalizedExpected = key === "provider" && expectedValue
      ? getNativeContinuationCapabilityProfile(expectedValue).provider
      : expectedValue;
    if (normalizedExpected && String(evidence?.[key] || "") !== String(normalizedExpected)) issues.push(`${key}_mismatch`);
  }
  const rebuilt = buildNativeSessionContinuationEvidence({
    provider: evidence?.provider,
    runnerRequestId: evidence?.runnerRequestId,
    requestedNativeSessionId: evidence?.requestedNativeSessionId,
    returnedNativeSessionId: evidence?.returnedNativeSessionId,
    providerOutputContractEvidence: evidence?.providerOutputContractEvidence,
    providerRuntimeVersionSnapshot: evidence?.providerRuntimeVersionSnapshot,
    expectedProviderContractId: evidence?.expectedProviderContractId,
    nativeResumeRequested: evidence?.nativeResumeRequested === true,
    nativeForkRequested: evidence?.nativeForkRequested === true,
    runnerSuccess: evidence?.runnerSuccess === true,
    observedAt: evidence?.observedAt,
  });
  for (const key of [
    "effectiveNativeSessionId",
    "evidenceSource",
    "providerOutputContractStatus",
    "providerOutputContractProviderMatched",
    "providerOutputContractSessionMatched",
    "providerOutputContractRecognized",
    "providerOutputFormatFingerprint",
    "providerRuntimeVersionStatus",
    "providerRuntimeVersion",
    "providerRuntimeIdentityChecksum",
    "expectedProviderContractId",
    "providerContractId",
    "providerContractEvidenceMode",
    "providerContractTransition",
    "providerContractCurrentEvidenceVerified",
    "providerContractContinuityVerified",
    "resumeAckPolicy",
    "sourceAllowedByProfile",
    "providerReturnMatchedRequest",
    "nativeContinuationAcknowledged",
    "nativeSessionReusable",
    "compatibilityStatus",
  ]) {
    if (evidence?.[key] !== rebuilt[key]) issues.push(`${key}_invalid`);
  }
  if (JSON.stringify(canonical(evidence?.continuationCapabilityProfile || {})) !== JSON.stringify(canonical(rebuilt.continuationCapabilityProfile))) {
    issues.push("continuation_capability_profile_invalid");
  }
  return { valid: issues.length === 0, issues };
}
