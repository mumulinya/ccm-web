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
exports.CODEX_DEVELOPER_INSTRUCTIONS_MIN_VERSION = exports.PROVIDER_MEMORY_CHANNEL_EVIDENCE_SCHEMA = void 0;
exports.getProviderMemoryChannelCapability = getProviderMemoryChannelCapability;
exports.prepareProviderMemoryChannel = prepareProviderMemoryChannel;
exports.bindProviderMemoryChannelLaunch = bindProviderMemoryChannelLaunch;
exports.acknowledgeProviderMemoryChannelLaunch = acknowledgeProviderMemoryChannelLaunch;
exports.verifyProviderMemoryChannelEvidence = verifyProviderMemoryChannelEvidence;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const trusted_memory_prompt_envelope_1 = require("./trusted-memory-prompt-envelope");
const native_continuation_1 = require("./native-continuation");
exports.PROVIDER_MEMORY_CHANNEL_EVIDENCE_SCHEMA = "ccm-provider-memory-channel-evidence-v1";
exports.CODEX_DEVELOPER_INSTRUCTIONS_MIN_VERSION = "0.115.0";
function normalizeProvider(value) {
    const provider = String(value || "").trim().toLowerCase();
    if (["claude", "claude-code", "claude_code", "cc", "claudecode"].includes(provider))
        return "claudecode";
    if (["cursor", "cursor-agent", "agent"].includes(provider))
        return "cursor";
    return provider || "claudecode";
}
function checksum(value) {
    const canonical = (input) => Array.isArray(input)
        ? input.map(canonical)
        : input && typeof input === "object"
            ? Object.keys(input).sort().reduce((result, key) => {
                if (input[key] !== undefined)
                    result[key] = canonical(input[key]);
                return result;
            }, {})
            : input;
    const serialized = typeof value === "string" ? value : JSON.stringify(canonical(value || {}));
    return crypto.createHash("sha256").update(serialized).digest("hex");
}
function evidenceChecksum(value) {
    const payload = { ...(value || {}) };
    delete payload.evidence_checksum;
    delete payload.checksum_valid;
    delete payload.issues;
    return checksum(payload);
}
function acknowledgementPolicy(providerInput) {
    const provider = normalizeProvider(providerInput);
    if (provider === "codex")
        return "structured_thread_started";
    if (provider === "cursor")
        return "structured_session_event";
    if (provider === "claudecode")
        return "process_exit_success";
    return "process_exit_success";
}
function semanticVersionAtLeast(actual, minimum) {
    const parse = (value) => String(value || "").match(/\b(\d+)\.(\d+)\.(\d+)\b/)?.slice(1).map(Number) || [];
    const left = parse(actual);
    const right = parse(minimum);
    if (left.length !== 3 || right.length !== 3)
        return false;
    for (let index = 0; index < 3; index += 1) {
        if (left[index] !== right[index])
            return left[index] > right[index];
    }
    return true;
}
function getProviderMemoryChannelCapability(providerInput, options = {}) {
    const provider = normalizeProvider(providerInput);
    const nativeSystemPromptSupported = provider === "claudecode";
    const runtimeVersion = String(options.runtimeVersionSnapshot?.semanticVersion || options.runtimeVersionSnapshot?.versionText || "");
    const nativeDeveloperInstructionsSupported = provider === "codex"
        && semanticVersionAtLeast(runtimeVersion, exports.CODEX_DEVELOPER_INSTRUCTIONS_MIN_VERSION);
    return {
        provider,
        nativeSystemPromptSupported,
        nativeDeveloperInstructionsSupported,
        channel: nativeSystemPromptSupported
            ? "native_system_prompt_file"
            : nativeDeveloperInstructionsSupported ? "native_developer_instructions_config" : "trusted_user_prompt_envelope",
        authorityRole: nativeSystemPromptSupported ? "system" : nativeDeveloperInstructionsSupported ? "developer" : "user",
        nativeFlag: nativeSystemPromptSupported ? "--append-system-prompt-file" : nativeDeveloperInstructionsSupported ? "developer_instructions" : "",
        runtimeVersion,
        minimumRuntimeVersion: provider === "codex" ? exports.CODEX_DEVELOPER_INSTRUCTIONS_MIN_VERSION : "",
    };
}
function prepareProviderMemoryChannel(providerInput, renderedPrompt, expected = {}) {
    const provider = normalizeProvider(providerInput);
    const originalPrompt = String(renderedPrompt || "");
    const envelope = (0, trusted_memory_prompt_envelope_1.verifyTrustedMemoryPromptEnvelope)(originalPrompt);
    const required = expected.required === true;
    const issues = [...envelope.issues];
    if (!required && !envelope.present)
        issues.length = 0;
    if (required && !envelope.valid)
        issues.push("provider_memory_channel_trusted_envelope_invalid");
    if (expected.envelopeChecksum && String(expected.envelopeChecksum) !== String(envelope.contentChecksum || "")) {
        issues.push("provider_memory_channel_envelope_checksum_mismatch");
    }
    if (expected.sourceChecksum && String(expected.sourceChecksum) !== String(envelope.sourceChecksum || "")) {
        issues.push("provider_memory_channel_source_checksum_mismatch");
    }
    const capability = getProviderMemoryChannelCapability(provider, { runtimeVersionSnapshot: expected.runtimeVersionSnapshot });
    const useNativeSystem = envelope.valid && capability.nativeSystemPromptSupported;
    const useNativeDeveloper = envelope.valid && capability.nativeDeveloperInstructionsSupported;
    const systemPrompt = useNativeSystem ? envelope.envelopeText : "";
    const developerPrompt = useNativeDeveloper ? envelope.envelopeText : "";
    const useNativeAuthority = useNativeSystem || useNativeDeveloper;
    const authorityLabel = useNativeSystem ? "system prompt" : "developer instructions";
    const userPrompt = useNativeAuthority
        ? `${originalPrompt.slice(0, envelope.envelopeStartOffset)}[CCM trusted memory is attached through the Provider ${authorityLabel}.]${originalPrompt.slice(envelope.envelopeEndOffset)}`
        : originalPrompt;
    const status = issues.length
        ? "blocked"
        : !envelope.present
            ? "not_required"
            : "prepared";
    return {
        provider,
        required,
        status,
        issues: [...new Set(issues)],
        originalPrompt,
        userPrompt,
        systemPrompt,
        developerPrompt,
        envelope,
        channel: envelope.present ? capability.channel : "none",
        authorityRole: envelope.present ? capability.authorityRole : "none",
        nativeSystemPromptSupported: capability.nativeSystemPromptSupported,
        nativeDeveloperInstructionsSupported: capability.nativeDeveloperInstructionsSupported,
        nativeFlag: capability.nativeFlag,
        runtimeVersion: capability.runtimeVersion,
        minimumRuntimeVersion: capability.minimumRuntimeVersion,
        ready: status !== "blocked",
    };
}
function bindProviderMemoryChannelLaunch(prepared, input = {}) {
    const command = String(input.command || "");
    const systemPromptFile = String(input.systemPromptFile || "");
    const developerInstructionsFile = String(input.developerInstructionsFile || "");
    const issues = [...(Array.isArray(prepared?.issues) ? prepared.issues : [])];
    let systemPromptFileChecksum = "";
    let systemPromptFileBound = prepared?.channel !== "native_system_prompt_file";
    let commandChannelBound = prepared?.channel !== "native_system_prompt_file";
    if (prepared?.channel === "native_system_prompt_file") {
        try {
            const fileContent = fs.readFileSync(systemPromptFile, "utf-8");
            systemPromptFileChecksum = checksum(fileContent);
            systemPromptFileBound = fileContent === String(prepared.systemPrompt || "")
                && systemPromptFileChecksum === checksum(String(prepared.systemPrompt || ""));
        }
        catch {
            issues.push("provider_memory_channel_system_prompt_file_unreadable");
        }
        commandChannelBound = !!systemPromptFile
            && command.includes("--append-system-prompt-file")
            && command.includes(systemPromptFile);
        if (!systemPromptFileBound)
            issues.push("provider_memory_channel_system_prompt_file_mismatch");
        if (!commandChannelBound)
            issues.push("provider_memory_channel_command_unbound");
    }
    let developerInstructionsFileChecksum = "";
    let developerInstructionsFileBound = prepared?.channel !== "native_developer_instructions_config";
    if (prepared?.channel === "native_developer_instructions_config") {
        try {
            const fileContent = fs.readFileSync(developerInstructionsFile, "utf-8");
            developerInstructionsFileChecksum = checksum(fileContent);
            developerInstructionsFileBound = fileContent === String(prepared.developerPrompt || "")
                && developerInstructionsFileChecksum === checksum(String(prepared.developerPrompt || ""));
        }
        catch {
            issues.push("provider_memory_channel_developer_instructions_file_unreadable");
        }
        commandChannelBound = !!developerInstructionsFile
            && command.includes("codex-prompt-runner.js")
            && command.includes(developerInstructionsFile);
        if (!developerInstructionsFileBound)
            issues.push("provider_memory_channel_developer_instructions_file_mismatch");
        if (!commandChannelBound)
            issues.push("provider_memory_channel_command_unbound");
    }
    if (prepared?.channel === "trusted_user_prompt_envelope"
        && String(prepared.userPrompt || "") !== String(prepared.originalPrompt || "")) {
        issues.push("provider_memory_channel_user_fallback_prompt_changed");
    }
    const payload = {
        schema: exports.PROVIDER_MEMORY_CHANNEL_EVIDENCE_SCHEMA,
        version: 2,
        status: issues.length ? "blocked" : prepared?.status === "not_required" ? "not_required" : "ready",
        provider: String(prepared?.provider || ""),
        required: prepared?.required === true,
        channel: String(prepared?.channel || "none"),
        authority_role: String(prepared?.authorityRole || "none"),
        native_system_prompt_supported: prepared?.nativeSystemPromptSupported === true,
        native_developer_instructions_supported: prepared?.nativeDeveloperInstructionsSupported === true,
        original_prompt_checksum: checksum(String(prepared?.originalPrompt || "")),
        provider_user_prompt_checksum: checksum(String(prepared?.userPrompt || "")),
        provider_system_prompt_checksum: prepared?.systemPrompt ? checksum(String(prepared.systemPrompt)) : "",
        provider_developer_prompt_checksum: prepared?.developerPrompt ? checksum(String(prepared.developerPrompt)) : "",
        trusted_envelope_checksum: String(prepared?.envelope?.contentChecksum || ""),
        trusted_envelope_source_checksum: String(prepared?.envelope?.sourceChecksum || ""),
        trusted_envelope_chars: Number(prepared?.envelope?.contentChars || 0),
        trusted_envelope_unique: Number(prepared?.envelope?.rawBeginCount || 0) === 1 && Number(prepared?.envelope?.rawEndCount || 0) === 1,
        system_prompt_file_checksum: systemPromptFileChecksum,
        system_prompt_file_bound: systemPromptFileBound,
        developer_instructions_file_checksum: developerInstructionsFileChecksum,
        developer_instructions_file_bound: developerInstructionsFileBound,
        command_channel_bound: commandChannelBound,
        command_checksum: checksum(command),
        runner_request_id: String(input.runnerRequestId || ""),
        provider_runtime_version: String(input.runtimeVersionSnapshot?.semanticVersion || input.runtimeVersionSnapshot?.versionText || ""),
        provider_runtime_status: String(input.runtimeVersionSnapshot?.status || ""),
        provider_runtime_identity_checksum: String(input.runtimeVersionSnapshot?.executableIdentityChecksum || ""),
        acknowledgement_policy: acknowledgementPolicy(prepared?.provider),
        acknowledgement_status: prepared?.status === "not_required" ? "not_required" : "pending",
        acknowledgement_required: false,
        acknowledgement_checksum: "",
        launch_evidence_checksum: "",
        execution_succeeded: false,
        runner_started: false,
        exit_code: null,
        provider_output_contract_checksum: "",
        provider_output_contract_status: "",
        provider_output_contract_id: "",
        provider_output_contract_event: "",
        provider_output_session_id: "",
        native_continuation_evidence_checksum: "",
        prepared_at: new Date().toISOString(),
    };
    return {
        ...payload,
        issues: [...new Set(issues)],
        evidence_checksum: evidenceChecksum(payload),
    };
}
function acknowledgeProviderMemoryChannelLaunch(evidence, input = {}) {
    const provider = normalizeProvider(evidence?.provider);
    const policy = acknowledgementPolicy(provider);
    const outputContract = input.providerOutputContractEvidence || input.nativeContinuationEvidence?.providerOutputContractEvidence || null;
    const executionSucceeded = input.executionSucceeded === true;
    const runnerStarted = input.runnerStarted !== false;
    const exitCode = input.exitCode === undefined ? null : input.exitCode;
    const issues = (Array.isArray(evidence?.issues) ? evidence.issues : [])
        .filter((issue) => !String(issue || "").startsWith("provider_memory_channel_acknowledgement_"));
    if (!executionSucceeded)
        issues.push("provider_memory_channel_acknowledgement_execution_failed");
    if (!runnerStarted)
        issues.push("provider_memory_channel_acknowledgement_runner_not_started");
    if (typeof exitCode === "number" && exitCode !== 0)
        issues.push("provider_memory_channel_acknowledgement_exit_nonzero");
    if (policy === "structured_thread_started" || policy === "structured_session_event") {
        const expectedEvent = policy === "structured_thread_started" ? "thread.started" : "";
        if (outputContract?.status !== "recognized")
            issues.push("provider_memory_channel_acknowledgement_output_contract_unrecognized");
        if (String(outputContract?.provider || "") !== provider)
            issues.push("provider_memory_channel_acknowledgement_output_provider_mismatch");
        if (!String(outputContract?.trustedSessionId || ""))
            issues.push("provider_memory_channel_acknowledgement_session_missing");
        if (expectedEvent && String(outputContract?.matchedEventType || "") !== expectedEvent)
            issues.push("provider_memory_channel_acknowledgement_event_mismatch");
        if (String(outputContract?.runtimeIdentityChecksum || "") !== String(evidence?.provider_runtime_identity_checksum || "")) {
            issues.push("provider_memory_channel_acknowledgement_runtime_identity_mismatch");
        }
        const continuation = (0, native_continuation_1.verifyNativeSessionContinuationEvidence)(input.nativeContinuationEvidence, {
            provider,
            runnerRequestId: evidence?.runner_request_id,
        });
        if (!continuation.valid || input.nativeContinuationEvidence?.providerOutputContractRecognized !== true) {
            issues.push("provider_memory_channel_acknowledgement_native_session_unverified");
        }
    }
    const acknowledgementCore = {
        policy,
        provider,
        runner_request_id: String(evidence?.runner_request_id || ""),
        launch_evidence_checksum: String(evidence?.evidence_checksum || ""),
        execution_succeeded: executionSucceeded,
        runner_started: runnerStarted,
        exit_code: exitCode,
        provider_output_contract_checksum: outputContract ? checksum(outputContract) : "",
        provider_output_contract_status: String(outputContract?.status || ""),
        provider_output_contract_id: String(outputContract?.providerContractId || ""),
        provider_output_contract_event: String(outputContract?.matchedEventType || ""),
        provider_output_session_id: String(outputContract?.trustedSessionId || ""),
        native_continuation_evidence_checksum: String(input.nativeContinuationEvidence?.evidenceChecksum || ""),
        acknowledged_at: String(input.acknowledgedAt || new Date().toISOString()),
    };
    const next = {
        ...(evidence || {}),
        version: 2,
        status: issues.length ? "blocked" : evidence?.status === "not_required" ? "not_required" : "ready",
        acknowledgement_policy: policy,
        acknowledgement_status: issues.length ? "unverified" : evidence?.status === "not_required" ? "not_required" : "acknowledged",
        acknowledgement_required: input.required === true,
        acknowledgement_checksum: checksum(acknowledgementCore),
        launch_evidence_checksum: acknowledgementCore.launch_evidence_checksum,
        execution_succeeded: executionSucceeded,
        runner_started: runnerStarted,
        exit_code: exitCode,
        provider_output_contract_checksum: acknowledgementCore.provider_output_contract_checksum,
        provider_output_contract_status: acknowledgementCore.provider_output_contract_status,
        provider_output_contract_id: acknowledgementCore.provider_output_contract_id,
        provider_output_contract_event: acknowledgementCore.provider_output_contract_event,
        provider_output_session_id: acknowledgementCore.provider_output_session_id,
        native_continuation_evidence_checksum: acknowledgementCore.native_continuation_evidence_checksum,
        acknowledged_at: acknowledgementCore.acknowledged_at,
        issues: [...new Set(issues)],
    };
    return { ...next, evidence_checksum: evidenceChecksum(next) };
}
function verifyProviderMemoryChannelEvidence(evidence, expected = {}) {
    const issues = [];
    if (evidence?.schema !== exports.PROVIDER_MEMORY_CHANNEL_EVIDENCE_SCHEMA || ![1, 2].includes(Number(evidence?.version || 0)))
        issues.push("provider_memory_channel_schema_invalid");
    if (!String(evidence?.evidence_checksum || "") || String(evidence.evidence_checksum) !== evidenceChecksum(evidence))
        issues.push("provider_memory_channel_checksum_invalid");
    const provider = normalizeProvider(expected.provider === undefined ? evidence?.provider : expected.provider);
    if (String(evidence?.provider || "") !== provider)
        issues.push("provider_memory_channel_provider_mismatch");
    const originalPromptChecksum = expected.originalPrompt !== undefined
        ? checksum(String(expected.originalPrompt || ""))
        : String(expected.originalPromptChecksum || "");
    if (originalPromptChecksum && String(evidence?.original_prompt_checksum || "") !== originalPromptChecksum)
        issues.push("provider_memory_channel_prompt_mismatch");
    if (expected.envelopeChecksum !== undefined && String(evidence?.trusted_envelope_checksum || "") !== String(expected.envelopeChecksum || ""))
        issues.push("provider_memory_channel_envelope_mismatch");
    if (expected.sourceChecksum !== undefined && String(evidence?.trusted_envelope_source_checksum || "") !== String(expected.sourceChecksum || ""))
        issues.push("provider_memory_channel_source_mismatch");
    if (expected.runnerRequestId !== undefined && String(evidence?.runner_request_id || "") !== String(expected.runnerRequestId || ""))
        issues.push("provider_memory_channel_runner_request_mismatch");
    const required = expected.required === true || evidence?.required === true;
    if (expected.originalPrompt !== undefined) {
        const replay = prepareProviderMemoryChannel(provider, String(expected.originalPrompt || ""), {
            required,
            envelopeChecksum: expected.envelopeChecksum,
            sourceChecksum: expected.sourceChecksum,
            runtimeVersionSnapshot: {
                semanticVersion: String(evidence?.provider_runtime_version || ""),
                status: String(evidence?.provider_runtime_status || ""),
            },
        });
        if (String(evidence?.channel || "") !== String(replay.channel || ""))
            issues.push("provider_memory_channel_replay_channel_mismatch");
        if (String(evidence?.authority_role || "") !== String(replay.authorityRole || ""))
            issues.push("provider_memory_channel_replay_role_mismatch");
        if (String(evidence?.provider_user_prompt_checksum || "") !== checksum(replay.userPrompt))
            issues.push("provider_memory_channel_replay_user_prompt_mismatch");
        const replaySystemChecksum = replay.systemPrompt ? checksum(replay.systemPrompt) : "";
        if (String(evidence?.provider_system_prompt_checksum || "") !== replaySystemChecksum)
            issues.push("provider_memory_channel_replay_system_prompt_mismatch");
        const replayDeveloperChecksum = replay.developerPrompt ? checksum(replay.developerPrompt) : "";
        if (String(evidence?.provider_developer_prompt_checksum || "") !== replayDeveloperChecksum)
            issues.push("provider_memory_channel_replay_developer_prompt_mismatch");
    }
    if (required && String(evidence?.status || "") !== "ready")
        issues.push("provider_memory_channel_not_ready");
    if (required && evidence?.trusted_envelope_unique !== true)
        issues.push("provider_memory_channel_envelope_not_unique");
    if (provider === "claudecode" && required) {
        if (String(evidence?.channel || "") !== "native_system_prompt_file" || String(evidence?.authority_role || "") !== "system")
            issues.push("provider_memory_channel_native_system_missing");
        if (evidence?.system_prompt_file_bound !== true || evidence?.command_channel_bound !== true || !String(evidence?.provider_system_prompt_checksum || ""))
            issues.push("provider_memory_channel_native_launch_unbound");
    }
    else if (provider === "codex" && required) {
        const capability = getProviderMemoryChannelCapability(provider, {
            runtimeVersionSnapshot: { semanticVersion: evidence?.provider_runtime_version },
        });
        if (capability.nativeDeveloperInstructionsSupported) {
            if (String(evidence?.channel || "") !== "native_developer_instructions_config" || String(evidence?.authority_role || "") !== "developer")
                issues.push("provider_memory_channel_native_developer_missing");
            if (evidence?.developer_instructions_file_bound !== true || evidence?.command_channel_bound !== true || !String(evidence?.provider_developer_prompt_checksum || ""))
                issues.push("provider_memory_channel_native_developer_launch_unbound");
        }
        else {
            if (String(evidence?.channel || "") !== "trusted_user_prompt_envelope" || String(evidence?.authority_role || "") !== "user")
                issues.push("provider_memory_channel_version_fallback_invalid");
            if (String(evidence?.provider_user_prompt_checksum || "") !== String(evidence?.original_prompt_checksum || ""))
                issues.push("provider_memory_channel_version_fallback_unbound");
        }
    }
    else if (required) {
        if (String(evidence?.channel || "") !== "trusted_user_prompt_envelope" || String(evidence?.authority_role || "") !== "user")
            issues.push("provider_memory_channel_user_fallback_invalid");
        if (String(evidence?.provider_user_prompt_checksum || "") !== String(evidence?.original_prompt_checksum || ""))
            issues.push("provider_memory_channel_user_fallback_unbound");
    }
    const acknowledgementRequired = expected.requireAcknowledgement === true || evidence?.acknowledgement_required === true;
    if (acknowledgementRequired) {
        const policy = acknowledgementPolicy(provider);
        if (Number(evidence?.version || 0) < 2)
            issues.push("provider_memory_channel_acknowledgement_schema_missing");
        if (String(evidence?.acknowledgement_policy || "") !== policy)
            issues.push("provider_memory_channel_acknowledgement_policy_mismatch");
        if (String(evidence?.acknowledgement_status || "") !== "acknowledged")
            issues.push("provider_memory_channel_acknowledgement_missing");
        if (evidence?.execution_succeeded !== true || evidence?.runner_started !== true)
            issues.push("provider_memory_channel_acknowledgement_execution_unverified");
        if (typeof evidence?.exit_code === "number" && evidence.exit_code !== 0)
            issues.push("provider_memory_channel_acknowledgement_exit_nonzero");
        if (expected.executionSucceeded === false)
            issues.push("provider_memory_channel_acknowledgement_delivery_failed");
        const acknowledgementCore = {
            policy: String(evidence?.acknowledgement_policy || ""),
            provider: String(evidence?.provider || ""),
            runner_request_id: String(evidence?.runner_request_id || ""),
            launch_evidence_checksum: String(evidence?.launch_evidence_checksum || ""),
            execution_succeeded: evidence?.execution_succeeded === true,
            runner_started: evidence?.runner_started === true,
            exit_code: evidence?.exit_code === undefined ? null : evidence.exit_code,
            provider_output_contract_checksum: String(evidence?.provider_output_contract_checksum || ""),
            provider_output_contract_status: String(evidence?.provider_output_contract_status || ""),
            provider_output_contract_id: String(evidence?.provider_output_contract_id || ""),
            provider_output_contract_event: String(evidence?.provider_output_contract_event || ""),
            provider_output_session_id: String(evidence?.provider_output_session_id || ""),
            native_continuation_evidence_checksum: String(evidence?.native_continuation_evidence_checksum || ""),
            acknowledged_at: String(evidence?.acknowledged_at || ""),
        };
        if (!String(evidence?.launch_evidence_checksum || "") || String(evidence?.acknowledgement_checksum || "") !== checksum(acknowledgementCore)) {
            issues.push("provider_memory_channel_acknowledgement_checksum_invalid");
        }
        const launchProjection = {
            ...(evidence || {}),
            status: evidence?.channel === "none" ? "not_required" : "ready",
            acknowledgement_status: evidence?.channel === "none" ? "not_required" : "pending",
            acknowledgement_required: false,
            acknowledgement_checksum: "",
            launch_evidence_checksum: "",
            execution_succeeded: false,
            runner_started: false,
            exit_code: null,
            provider_output_contract_checksum: "",
            provider_output_contract_status: "",
            provider_output_contract_id: "",
            provider_output_contract_event: "",
            provider_output_session_id: "",
            native_continuation_evidence_checksum: "",
        };
        delete launchProjection.acknowledged_at;
        if (String(evidence?.launch_evidence_checksum || "") !== evidenceChecksum(launchProjection)) {
            issues.push("provider_memory_channel_acknowledgement_launch_evidence_invalid");
        }
        if (policy === "structured_thread_started" || policy === "structured_session_event") {
            const outputContract = expected.providerOutputContractEvidence || expected.nativeContinuationEvidence?.providerOutputContractEvidence || null;
            if (!outputContract || String(evidence?.provider_output_contract_checksum || "") !== checksum(outputContract)) {
                issues.push("provider_memory_channel_acknowledgement_output_contract_mismatch");
            }
            if (outputContract?.status !== "recognized" || String(outputContract?.provider || "") !== provider) {
                issues.push("provider_memory_channel_acknowledgement_output_contract_unverified");
            }
            if (String(evidence?.provider_output_session_id || "") !== String(outputContract?.trustedSessionId || "")) {
                issues.push("provider_memory_channel_acknowledgement_session_mismatch");
            }
            if (policy === "structured_thread_started" && String(outputContract?.matchedEventType || "") !== "thread.started") {
                issues.push("provider_memory_channel_acknowledgement_event_unverified");
            }
            if (String(outputContract?.runtimeIdentityChecksum || "") !== String(evidence?.provider_runtime_identity_checksum || "")) {
                issues.push("provider_memory_channel_acknowledgement_runtime_unbound");
            }
            const continuation = (0, native_continuation_1.verifyNativeSessionContinuationEvidence)(expected.nativeContinuationEvidence, {
                provider,
                runnerRequestId: evidence?.runner_request_id,
            });
            if (!continuation.valid || expected.nativeContinuationEvidence?.providerOutputContractRecognized !== true) {
                issues.push("provider_memory_channel_acknowledgement_native_session_unverified");
            }
            if (String(evidence?.native_continuation_evidence_checksum || "") !== String(expected.nativeContinuationEvidence?.evidenceChecksum || "")) {
                issues.push("provider_memory_channel_acknowledgement_native_session_mismatch");
            }
        }
    }
    return {
        valid: issues.length === 0,
        issues: [...new Set(issues)],
        required,
        status: String(evidence?.status || "missing"),
        channel: String(evidence?.channel || "none"),
        authorityRole: String(evidence?.authority_role || "none"),
        nativeSystemPrompt: String(evidence?.channel || "") === "native_system_prompt_file" && String(evidence?.authority_role || "") === "system",
        nativeDeveloperInstructions: String(evidence?.channel || "") === "native_developer_instructions_config" && String(evidence?.authority_role || "") === "developer",
        fallbackUserPrompt: String(evidence?.channel || "") === "trusted_user_prompt_envelope" && String(evidence?.authority_role || "") === "user",
        acknowledgementRequired,
        acknowledgementStatus: String(evidence?.acknowledgement_status || "missing"),
        acknowledged: String(evidence?.acknowledgement_status || "") === "acknowledged",
        acknowledgementPolicy: String(evidence?.acknowledgement_policy || ""),
    };
}
//# sourceMappingURL=provider-memory-channel.js.map