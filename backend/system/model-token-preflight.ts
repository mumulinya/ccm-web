import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getEncoding } from "js-tiktoken";
import { estimateTextTokens } from "./context-budget";
import { providerCacheCapabilityIdentity } from "./provider-cache-capability-registry";
import { withFileLock } from "../core/atomic-json-file";

type TokenCalibration = {
  schema: "ccm-model-token-calibration-v1";
  identityChecksum: string;
  samples: number;
  factor: number;
  lastEstimatedTokens: number;
  lastObservedTokens: number;
  updatedAt: string;
  checksum: string;
};

type TokenCalibrationSampleV2 = {
  estimatedTokens: number;
  observedTokens: number;
  ratio: number;
  positiveDriftTokens: number;
  recordedAt: string;
};

type TokenCalibrationV2 = {
  schema: "ccm-model-token-calibration-v2";
  version: 2;
  identityChecksum: string;
  providerIdentityChecksum: string;
  estimatorVersion: 2;
  samples: number;
  rejectedSamples: number;
  factor: number;
  p95Ratio: number;
  p95PositiveDriftTokens: number;
  recentSamples: TokenCalibrationSampleV2[];
  lastEstimatedTokens: number;
  lastObservedTokens: number;
  lastAcceptedAt: string;
  updatedAt: string;
  contentStored: false;
  checksum: string;
};

const ROOT = process.env.CCM_MODEL_TOKEN_PREFLIGHT_DIR
  ? path.resolve(process.env.CCM_MODEL_TOKEN_PREFLIGHT_DIR)
  : path.join(os.homedir(), ".cc-connect", "model-token-preflight");
const FILE = path.join(ROOT, "calibration.json");
const encodingCache = new Map<string, ReturnType<typeof getEncoding>>();
let registryCache: any = null;
let registryMtimeMs = -1;
const ESTIMATOR_VERSION = 2;
const MAX_RECENT_SAMPLES = 64;
const CALIBRATION_STALE_MS = 30 * 24 * 60 * 60 * 1000;
const CALIBRATION_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

function hash(value: any) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value ?? null)).digest("hex");
}

function checksum(value: any) {
  const copy = { ...(value || {}) };
  delete copy.checksum;
  return hash(copy);
}

function calibrationIdentityChecksum(providerIdentityChecksum: string) {
  return hash({ providerIdentityChecksum, estimatorVersion: ESTIMATOR_VERSION });
}

function percentile(values: number[], percentileValue: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1));
  return sorted[index];
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function text(value: any) {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value ?? null); } catch { return String(value || ""); }
}

function family(config: any) {
  const format = String(config?.format || "").toLowerCase();
  const provider = String(config?.provider || "").toLowerCase();
  const declared = String(config?.providerNativeCacheFamily || "").toLowerCase();
  if (declared === "openai" || format.includes("openai") || provider.includes("openai")) return "openai";
  if (declared === "anthropic" || format.includes("anthropic") || provider.includes("anthropic")) return "anthropic";
  if (declared === "gemini" || format.includes("gemini") || provider.includes("gemini")) return "gemini";
  return "compatible";
}

function encodingName(config: any) {
  const model = String(config?.model || "").toLowerCase();
  if (/gpt-5|gpt-4o|gpt-4\.1|\bo[134](?:-|$)/.test(model)) return "o200k_base";
  return "cl100k_base";
}

function readRegistry() {
  try {
    const mtimeMs = fs.existsSync(FILE) ? fs.statSync(FILE).mtimeMs : 0;
    if (registryCache && registryMtimeMs === mtimeMs) return registryCache;
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
    registryCache = ["ccm-model-token-calibration-registry-v1", "ccm-model-token-calibration-registry-v2"].includes(parsed?.schema) && parsed?.checksum === checksum(parsed)
      ? parsed
      : { schema: "ccm-model-token-calibration-registry-v2", version: 2, entries: {}, updatedAt: "", checksum: "" };
    registryMtimeMs = mtimeMs;
    return registryCache;
  } catch {
    registryCache = { schema: "ccm-model-token-calibration-registry-v2", version: 2, entries: {}, updatedAt: "", checksum: "" };
    registryMtimeMs = 0;
    return registryCache;
  }
}

function writeRegistry(registry: any) {
  fs.mkdirSync(ROOT, { recursive: true });
  const cutoff = Date.now() - CALIBRATION_RETENTION_MS;
  const entries = Object.fromEntries(Object.entries(registry?.entries || {}).filter(([, value]: any) => {
    const updatedAt = Date.parse(String(value?.lastAcceptedAt || value?.updatedAt || ""));
    return !Number.isFinite(updatedAt) || updatedAt >= cutoff;
  }));
  const next = { ...registry, schema: "ccm-model-token-calibration-registry-v2", version: 2, entries, updatedAt: new Date().toISOString(), checksum: "" };
  next.checksum = checksum(next);
  const temp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(next, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temp, FILE);
  registryCache = next;
  registryMtimeMs = fs.statSync(FILE).mtimeMs;
  try { fs.chmodSync(FILE, 0o600); } catch {}
}

function calibration(config: any): TokenCalibration | TokenCalibrationV2 | null {
  const identity = providerCacheCapabilityIdentity(config);
  const registry = readRegistry();
  const value = registry.entries?.[calibrationIdentityChecksum(identity.identityChecksum)] || registry.entries?.[identity.identityChecksum];
  if (!value || !["ccm-model-token-calibration-v1", "ccm-model-token-calibration-v2"].includes(value.schema) || value.checksum !== checksum(value)) return null;
  const acceptedAt = Date.parse(String(value.lastAcceptedAt || value.updatedAt || ""));
  if (Number.isFinite(acceptedAt) && acceptedAt < Date.now() - CALIBRATION_STALE_MS) return null;
  return value;
}

function rawTextTokens(value: any, config: any) {
  const source = text(value);
  if (family(config) === "openai") {
    try {
      const name = encodingName(config);
      const encoding = encodingCache.get(name) || getEncoding(name as any);
      encodingCache.set(name, encoding);
      return { tokens: Math.max(1, encoding.encode(source).length), strategy: `tiktoken:${name}` };
    } catch {}
  }
  const multiplier = family(config) === "anthropic" ? 1.06 : family(config) === "gemini" ? 1.03 : 1.08;
  return { tokens: Math.max(1, Math.ceil(estimateTextTokens(source) * multiplier)), strategy: `${family(config)}_model_family_estimate` };
}

export function estimateModelTextTokens(value: any, config: any = {}) {
  const raw = rawTextTokens(value, config);
  const learned = calibration(config);
  const factor = learned && learned.samples >= 2 ? Math.max(0.55, Math.min(2.5, Number(learned.factor || 1))) : 1;
  const p95Ratio = learned?.schema === "ccm-model-token-calibration-v2" ? Math.max(1, Number(learned.p95Ratio || 1)) : 1;
  const p95PositiveDriftTokens = learned?.schema === "ccm-model-token-calibration-v2" ? Math.max(0, Number(learned.p95PositiveDriftTokens || 0)) : 0;
  const calibratedTokens = Math.max(1, raw.tokens, Math.ceil(raw.tokens * factor), Math.ceil(raw.tokens * p95Ratio), Math.ceil(raw.tokens + p95PositiveDriftTokens));
  const safetyMargin = learned && learned.samples >= 5 ? 1.03 : family(config) === "openai" ? 1.02 : 1.08;
  return {
    schema: "ccm-model-token-preflight-v1",
    version: 1,
    providerFamily: family(config),
    model: String(config?.model || ""),
    strategy: learned && learned.samples >= 2 ? `${raw.strategy}+provider_usage_calibration` : raw.strategy,
    rawTokens: raw.tokens,
    calibrationFactor: factor,
    calibrationSamples: Number(learned?.samples || 0),
    calibrationRejectedSamples: Number((learned as any)?.rejectedSamples || 0),
    calibrationP95Ratio: p95Ratio,
    calibrationP95PositiveDriftTokens: p95PositiveDriftTokens,
    calibratedTokens,
    safetyAdjustedTokens: Math.max(1, Math.ceil(calibratedTokens * safetyMargin)),
    safetyMargin,
    confidence: raw.strategy.startsWith("tiktoken") ? learned && learned.samples >= 2 ? "high" : "medium" : learned && learned.samples >= 5 ? "high" : learned && learned.samples >= 2 ? "medium" : "low",
    contentStored: false,
  };
}

export function estimateModelMessagesTokens(messagesInput: any[], config: any = {}) {
  const messages = Array.isArray(messagesInput) ? messagesInput : [];
  const overhead = family(config) === "openai" ? 4 : 3;
  const rows = messages.map((message: any) => estimateModelTextTokens(message?.content ?? message, config));
  const rawTokens = rows.reduce((sum, row) => sum + row.rawTokens, 0) + messages.length * overhead + 3;
  const calibratedTokens = rows.reduce((sum, row) => sum + row.calibratedTokens, 0) + messages.length * overhead + 3;
  const safetyAdjustedTokens = rows.reduce((sum, row) => sum + row.safetyAdjustedTokens, 0) + messages.length * overhead + 3;
  return {
    schema: "ccm-model-message-token-preflight-v1",
    version: 1,
    providerFamily: family(config),
    model: String(config?.model || ""),
    strategy: [...new Set(rows.map(row => row.strategy))].join("+"),
    messageCount: messages.length,
    rawTokens,
    calibratedTokens,
    safetyAdjustedTokens,
    calibrationSamples: Math.max(0, ...rows.map(row => row.calibrationSamples)),
    confidence: rows.every(row => row.confidence === "high") ? "high" : rows.some(row => row.confidence === "low") ? "low" : "medium",
    contentStored: false,
  };
}

export function recordModelTokenCalibration(config: any, input: { estimatedTokens?: number; observedTokens?: number }) {
  const estimatedTokens = Math.max(0, Number(input.estimatedTokens || 0));
  const observedTokens = Math.max(0, Number(input.observedTokens || 0));
  if (!estimatedTokens || !observedTokens) return null;
  const identity = providerCacheCapabilityIdentity(config);
  return recordModelTokenCalibrationForIdentity(identity.identityChecksum, input);
}

export function recordModelTokenCalibrationForIdentity(identityChecksum: string, input: { estimatedTokens?: number; observedTokens?: number }) {
  const providerIdentityChecksum = String(identityChecksum || "");
  if (!/^[a-f0-9]{64}$/.test(providerIdentityChecksum)) return null;
  const estimatedTokens = Math.max(0, Number(input.estimatedTokens || 0));
  const observedTokens = Math.max(0, Number(input.observedTokens || 0));
  if (!estimatedTokens || !observedTokens) return null;
  const calibrationIdentity = calibrationIdentityChecksum(providerIdentityChecksum);
  return withFileLock(FILE, () => {
    const registry = readRegistry();
    const previous: any = registry.entries?.[calibrationIdentity] || registry.entries?.[providerIdentityChecksum] || null;
    const ratio = Math.max(0.55, Math.min(2.5, observedTokens / estimatedTokens));
    const previousSamples: TokenCalibrationSampleV2[] = Array.isArray(previous?.recentSamples) ? previous.recentSamples.slice(-MAX_RECENT_SAMPLES) : [];
    let accepted = true;
    if (previousSamples.length >= 8) {
      const ratios = previousSamples.map(sample => Number(sample.ratio || 0)).filter(value => value > 0);
      const center = median(ratios);
      const mad = median(ratios.map(value => Math.abs(value - center)));
      accepted = Math.abs(ratio - center) <= Math.max(0.08, mad * 3);
    }
    const recordedAt = new Date().toISOString();
    const sample: TokenCalibrationSampleV2 = {
      estimatedTokens: Math.floor(estimatedTokens),
      observedTokens: Math.floor(observedTokens),
      ratio: Math.round(ratio * 10_000) / 10_000,
      positiveDriftTokens: Math.max(0, Math.floor(observedTokens - estimatedTokens)),
      recordedAt,
    };
    const recentSamples = accepted ? [...previousSamples, sample].slice(-MAX_RECENT_SAMPLES) : previousSamples;
    const previousFactor = Number(previous?.factor || 0);
    const factor = accepted ? (previousFactor > 0 ? previousFactor * 0.75 + ratio * 0.25 : ratio) : (previousFactor || 1);
    const samples = Math.min(1000, Math.max(0, Number(previous?.samples || 0)) + (accepted ? 1 : 0));
    const value: TokenCalibrationV2 = {
      schema: "ccm-model-token-calibration-v2",
      version: 2,
      identityChecksum: calibrationIdentity,
      providerIdentityChecksum,
      estimatorVersion: 2,
      samples,
      rejectedSamples: Math.max(0, Number(previous?.rejectedSamples || 0)) + (accepted ? 0 : 1),
      factor: Math.round(factor * 10_000) / 10_000,
      p95Ratio: Math.max(1, Math.round(percentile(recentSamples.map(row => row.ratio), 0.95) * 10_000) / 10_000),
      p95PositiveDriftTokens: Math.max(0, Math.floor(percentile(recentSamples.map(row => row.positiveDriftTokens), 0.95))),
      recentSamples,
      lastEstimatedTokens: Math.floor(estimatedTokens),
      lastObservedTokens: Math.floor(observedTokens),
      lastAcceptedAt: accepted ? recordedAt : String(previous?.lastAcceptedAt || previous?.updatedAt || ""),
      updatedAt: recordedAt,
      contentStored: false,
      checksum: "",
    };
    value.checksum = checksum(value);
    const entries = { ...(registry.entries || {}) };
    delete entries[providerIdentityChecksum];
    entries[calibrationIdentity] = value;
    registry.entries = entries;
    writeRegistry(registry);
    return value;
  }, { timeoutMs: 30_000, retryMs: 20, staleMs: 2 * 60_000 });
}

export function readModelTokenCalibration(config: any) {
  const identity = providerCacheCapabilityIdentity(config);
  const value = calibration(config);
  return { identityChecksum: calibrationIdentityChecksum(identity.identityChecksum), providerIdentityChecksum: identity.identityChecksum, calibration: value, contentStored: false };
}

export function runModelTokenPreflightSelfTest() {
  const openai = estimateModelMessagesTokens([{ role: "user", content: "hello world" }], { format: "openai-compatible", model: "gpt-5" });
  const generic = estimateModelMessagesTokens([{ role: "user", content: "你好，世界" }], { format: "anthropic-compatible", model: "claude" });
  const checks = {
    openAiUsesLocalTokenizer: openai.strategy.includes("tiktoken:o200k_base"),
    genericUsesSafeFamilyEstimate: generic.strategy.includes("anthropic_model_family_estimate"),
    safetyMarginApplied: generic.safetyAdjustedTokens >= generic.calibratedTokens,
    noContentStored: openai.contentStored === false && generic.contentStored === false && !JSON.stringify([openai, generic]).includes("hello world"),
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
