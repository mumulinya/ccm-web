import * as crypto from "crypto";
import {
  BrowserActionEffectEvidence,
  BrowserActionEffectSignal,
  BrowserActionEffectSnapshot,
  BrowserActionSpec,
  BrowserCheckResult,
  BrowserStepResult,
} from "../types";

export const BROWSER_ACTION_EFFECT_SIGNALS: BrowserActionEffectSignal[] = [
  "url",
  "title",
  "page_text",
  "dom",
  "network",
  "dialog",
  "popup",
  "download",
];

export interface BrowserActionEffectObservation {
  url?: string;
  title?: string;
  pageText?: string;
  dom?: string;
  networkCount?: number;
  dialogCount?: number;
  popupCount?: number;
  downloadCount?: number;
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizedSignals(action: BrowserActionSpec) {
  const configured = action.effectSignals || action.effect_signals || [];
  const source = configured.length ? configured : BROWSER_ACTION_EFFECT_SIGNALS;
  return BROWSER_ACTION_EFFECT_SIGNALS.filter(signal => source.includes(signal));
}

export function browserActionEffectRequired(action: BrowserActionSpec) {
  return action.verifyEffect === true
    || action.verify_effect === true
    || action.expectEffect === true
    || action.expect_effect === true;
}

export function browserActionEffectSession(action: BrowserActionSpec) {
  return String(action.effectSession || action.effect_session || "").trim();
}

export function browserActionEffectTimeout(action: BrowserActionSpec, fallback: number) {
  const configured = Number(
    action.effectTimeoutMs
    || action.effect_timeout_ms
    || action.timeoutMs
    || action.timeout_ms
    || fallback,
  );
  if (!Number.isFinite(configured) || configured <= 0) return 3_000;
  return Math.max(100, Math.min(10_000, configured));
}

export function buildBrowserActionEffectSnapshot(
  observation: BrowserActionEffectObservation,
  requestedSignals: BrowserActionEffectSignal[],
): BrowserActionEffectSnapshot {
  const snapshot: BrowserActionEffectSnapshot = {};
  if (requestedSignals.includes("url") && observation.url !== undefined) snapshot.urlSha256 = sha256(String(observation.url));
  if (requestedSignals.includes("title") && observation.title !== undefined) snapshot.titleSha256 = sha256(String(observation.title));
  if (requestedSignals.includes("page_text") && observation.pageText !== undefined) snapshot.pageTextSha256 = sha256(String(observation.pageText));
  if (requestedSignals.includes("dom") && observation.dom !== undefined) snapshot.domSha256 = sha256(String(observation.dom));
  if (requestedSignals.includes("network") && observation.networkCount !== undefined) snapshot.networkCount = observation.networkCount;
  if (requestedSignals.includes("dialog") && observation.dialogCount !== undefined) snapshot.dialogCount = observation.dialogCount;
  if (requestedSignals.includes("popup") && observation.popupCount !== undefined) snapshot.popupCount = observation.popupCount;
  if (requestedSignals.includes("download") && observation.downloadCount !== undefined) snapshot.downloadCount = observation.downloadCount;
  return snapshot;
}

function observedSignals(snapshot: BrowserActionEffectSnapshot): BrowserActionEffectSignal[] {
  const signals: BrowserActionEffectSignal[] = [];
  if (snapshot.urlSha256) signals.push("url");
  if (snapshot.titleSha256) signals.push("title");
  if (snapshot.pageTextSha256) signals.push("page_text");
  if (snapshot.domSha256) signals.push("dom");
  if (snapshot.networkCount !== undefined) signals.push("network");
  if (snapshot.dialogCount !== undefined) signals.push("dialog");
  if (snapshot.popupCount !== undefined) signals.push("popup");
  if (snapshot.downloadCount !== undefined) signals.push("download");
  return signals;
}

function changedSignals(
  before: BrowserActionEffectSnapshot,
  after: BrowserActionEffectSnapshot,
): BrowserActionEffectSignal[] {
  const changed: BrowserActionEffectSignal[] = [];
  if (before.urlSha256 && after.urlSha256 && before.urlSha256 !== after.urlSha256) changed.push("url");
  if (before.titleSha256 && after.titleSha256 && before.titleSha256 !== after.titleSha256) changed.push("title");
  if (before.pageTextSha256 && after.pageTextSha256 && before.pageTextSha256 !== after.pageTextSha256) changed.push("page_text");
  if (before.domSha256 && after.domSha256 && before.domSha256 !== after.domSha256) changed.push("dom");
  if (before.networkCount !== undefined && after.networkCount !== undefined && before.networkCount !== after.networkCount) changed.push("network");
  if (before.dialogCount !== undefined && after.dialogCount !== undefined && before.dialogCount !== after.dialogCount) changed.push("dialog");
  if (before.popupCount !== undefined && after.popupCount !== undefined && before.popupCount !== after.popupCount) changed.push("popup");
  if (before.downloadCount !== undefined && after.downloadCount !== undefined && before.downloadCount !== after.downloadCount) changed.push("download");
  return changed;
}

function signalList(value: any): BrowserActionEffectSignal[] {
  return Array.isArray(value)
    ? value.filter(signal => BROWSER_ACTION_EFFECT_SIGNALS.includes(signal))
    : [];
}

function sameSignalList(left: BrowserActionEffectSignal[], right: BrowserActionEffectSignal[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function snapshotErrors(snapshot: BrowserActionEffectSnapshot | Record<string, any>, label: string) {
  const errors: string[] = [];
  const allowed = new Set([
    "urlSha256",
    "titleSha256",
    "pageTextSha256",
    "domSha256",
    "networkCount",
    "dialogCount",
    "popupCount",
    "downloadCount",
  ]);
  for (const key of Object.keys(snapshot || {})) {
    if (!allowed.has(key)) errors.push(`${label}.${key} is not permitted; action-effect snapshots may contain only digests and counts.`);
  }
  for (const key of ["urlSha256", "titleSha256", "pageTextSha256", "domSha256"] as const) {
    const value = snapshot?.[key];
    if (value !== undefined && !/^[a-f0-9]{64}$/i.test(String(value))) {
      errors.push(`${label}.${key} must be a SHA-256 digest.`);
    }
  }
  for (const key of ["networkCount", "dialogCount", "popupCount", "downloadCount"] as const) {
    const value = snapshot?.[key];
    if (value !== undefined && (!Number.isInteger(value) || Number(value) < 0)) {
      errors.push(`${label}.${key} must be a non-negative integer.`);
    }
  }
  return errors;
}

export function browserActionEffectEvidenceErrors(
  evidence: BrowserActionEffectEvidence | Record<string, any> | undefined,
  label = "browser action effect",
) {
  const errors: string[] = [];
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return [`${label} must be an object.`];
  }
  const allowedEvidenceKeys = new Set([
    "provider",
    "actionIndex",
    "session",
    "effectSession",
    "actionType",
    "status",
    "timeoutMs",
    "startedAt",
    "finishedAt",
    "durationMs",
    "requestedSignals",
    "observedSignals",
    "changedSignals",
    "before",
    "after",
    "detailSuppressed",
  ]);
  for (const key of Object.keys(evidence)) {
    if (!allowedEvidenceKeys.has(key)) {
      errors.push(`${label}.${key} is not permitted; action-effect evidence may contain only bounded summary metadata.`);
    }
  }
  if (evidence.provider !== "playwright" && evidence.provider !== "mcp") {
    errors.push(`${label}.provider must be playwright or mcp.`);
  }
  if (!Number.isInteger(evidence.actionIndex) || Number(evidence.actionIndex) < 0) {
    errors.push(`${label}.actionIndex must be a non-negative integer.`);
  }
  if (evidence.session !== undefined && !String(evidence.session || "").trim()) {
    errors.push(`${label}.session must be a non-empty string when present.`);
  }
  if (evidence.effectSession !== undefined && !String(evidence.effectSession || "").trim()) {
    errors.push(`${label}.effectSession must be a non-empty string when present.`);
  }
  if (!String(evidence.actionType || "").trim()) errors.push(`${label}.actionType is required.`);
  if (!Number.isFinite(evidence.timeoutMs) || Number(evidence.timeoutMs) < 100 || Number(evidence.timeoutMs) > 10_000) {
    errors.push(`${label}.timeoutMs must be between 100 and 10000.`);
  }
  if (!Number.isFinite(evidence.durationMs) || Number(evidence.durationMs) < 0) {
    errors.push(`${label}.durationMs must be non-negative.`);
  }
  const started = Date.parse(String(evidence.startedAt || ""));
  const finished = Date.parse(String(evidence.finishedAt || ""));
  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) {
    errors.push(`${label} must contain valid ordered startedAt/finishedAt timestamps.`);
  } else if (Number(evidence.durationMs) !== finished - started) {
    errors.push(`${label}.durationMs must match startedAt/finishedAt.`);
  }

  const requested = signalList(evidence.requestedSignals);
  const observed = signalList(evidence.observedSignals);
  const changed = signalList(evidence.changedSignals);
  for (const [key, raw, normalized] of [
    ["requestedSignals", evidence.requestedSignals, requested],
    ["observedSignals", evidence.observedSignals, observed],
    ["changedSignals", evidence.changedSignals, changed],
  ] as const) {
    if (!Array.isArray(raw) || raw.length !== normalized.length) {
      errors.push(`${label}.${key} contains an unsupported signal.`);
    }
    if (new Set(normalized).size !== normalized.length) {
      errors.push(`${label}.${key} must not contain duplicates.`);
    }
    const canonical = BROWSER_ACTION_EFFECT_SIGNALS.filter(signal => normalized.includes(signal));
    if (!sameSignalList(normalized, canonical)) errors.push(`${label}.${key} must use canonical signal order.`);
  }
  if (!requested.length) errors.push(`${label}.requestedSignals must not be empty.`);
  if (observed.some(signal => !requested.includes(signal))) {
    errors.push(`${label}.observedSignals must be a subset of requestedSignals.`);
  }
  if (changed.some(signal => !observed.includes(signal))) {
    errors.push(`${label}.changedSignals must be a subset of observedSignals.`);
  }

  const before = evidence.before && typeof evidence.before === "object" && !Array.isArray(evidence.before) ? evidence.before : {};
  const after = evidence.after && typeof evidence.after === "object" && !Array.isArray(evidence.after) ? evidence.after : {};
  errors.push(...snapshotErrors(before, `${label}.before`));
  errors.push(...snapshotErrors(after, `${label}.after`));
  if (evidence.detailSuppressed) {
    if (Object.keys(before).length || Object.keys(after).length) {
      errors.push(`${label} suppressed detail must not retain before/after digests or counts.`);
    }
  } else {
    const expectedObserved = BROWSER_ACTION_EFFECT_SIGNALS.filter(signal =>
      observedSignals(before).includes(signal) || observedSignals(after).includes(signal)
    );
    const expectedChanged = changedSignals(before, after);
    if (!sameSignalList(observed, expectedObserved)) {
      errors.push(`${label}.observedSignals does not match before/after snapshots.`);
    }
    if (!sameSignalList(changed, expectedChanged)) {
      errors.push(`${label}.changedSignals does not match before/after snapshots.`);
    }
  }
  const expectedStatus = changed.length ? "changed" : observed.length ? "unchanged" : "unavailable";
  if (evidence.status !== expectedStatus) {
    errors.push(`${label}.status must match observed and changed signals.`);
  }
  return errors;
}

export function browserActionEffectResultErrors(
  result: BrowserCheckResult | Record<string, any>,
  label = "browser result",
) {
  const effects = Array.isArray(result?.actionEffects) ? result.actionEffects : [];
  const errors = effects.flatMap((effect, index) =>
    browserActionEffectEvidenceErrors(effect, `${label}.actionEffects[${index}]`)
  );
  const actionIndexes = effects.map(effect => Number(effect.actionIndex));
  if (new Set(actionIndexes).size !== actionIndexes.length) {
    errors.push(`${label}.actionEffects must not contain duplicate actionIndex values.`);
  }
  const effectSteps = (Array.isArray(result?.steps) ? result.steps : [])
    .filter((step: BrowserStepResult) =>
      step.name === "assert:actionEffect" || step.name.endsWith(":assert:actionEffect")
    );
  const actionSteps = (Array.isArray(result?.steps) ? result.steps : [])
    .filter((step: BrowserStepResult) => step.kind === "action");
  const sessionNames = new Set(
    (Array.isArray(result?.browserSessions) ? result.browserSessions : [])
      .map((session: any) => String(session?.name || "").trim())
      .filter(Boolean)
  );
  if (effectSteps.length !== effects.length) {
    errors.push(`${label} action-effect assertion step count must match actionEffects.`);
  }
  for (const [index, effect] of effects.entries()) {
    const expectedStepStatus = effect.status === "changed" ? "passed" : "failed";
    if (effectSteps[index]?.status !== expectedStepStatus) {
      errors.push(`${label}.steps action-effect status does not match actionEffects[${index}].status.`);
    }
    const actionStep = actionSteps[effect.actionIndex];
    if (!actionStep || !String(actionStep.name || "").endsWith(`:${effect.actionType}`)) {
      errors.push(`${label}.actionEffects[${index}] does not match its action step.`);
    }
    if (sessionNames.size && !effect.session) {
      errors.push(`${label}.actionEffects[${index}] requires a session for a multi-session browser result.`);
    }
    if (effect.session && sessionNames.size && !sessionNames.has(effect.session)) {
      errors.push(`${label}.actionEffects[${index}].session does not match a browser session.`);
    }
    if (effect.effectSession && !effect.session) {
      errors.push(`${label}.actionEffects[${index}].effectSession requires an actor session.`);
    }
    if (effect.effectSession && effect.session && effect.effectSession === effect.session) {
      errors.push(`${label}.actionEffects[${index}].effectSession must differ from its actor session.`);
    }
    if (effect.effectSession && !sessionNames.has(effect.effectSession)) {
      errors.push(`${label}.actionEffects[${index}].effectSession does not match a browser session.`);
    }
    if (effect.session) {
      const prefix = `session:${effect.session}:`;
      if (!String(actionStep?.name || "").startsWith(prefix)) {
        errors.push(`${label}.actionEffects[${index}].session does not match its action step.`);
      }
      if (!String(effectSteps[index]?.name || "").startsWith(prefix)) {
        errors.push(`${label}.actionEffects[${index}].session does not match its assertion step.`);
      }
    } else if (String(effectSteps[index]?.name || "").startsWith("session:")) {
      errors.push(`${label}.actionEffects[${index}] is missing session-scoped evidence.`);
    }
    const effectStepDetail = String(effectSteps[index]?.detail || "");
    const detailEffectSession = /(?:^|;\s*)effectSession=([^;]+)(?:;|$)/.exec(effectStepDetail)?.[1]?.trim();
    if (effect.effectSession && detailEffectSession !== effect.effectSession) {
      errors.push(`${label}.actionEffects[${index}].effectSession does not match its assertion step detail.`);
    }
    if (!effect.effectSession && detailEffectSession) {
      errors.push(`${label}.actionEffects[${index}] assertion step contains an unexpected effectSession.`);
    }
  }
  if (result?.status === "passed" && effects.some(effect => effect.status !== "changed")) {
    errors.push(`${label} cannot pass with an unchanged or unavailable action effect.`);
  }
  return errors;
}

function effectStep(evidence: BrowserActionEffectEvidence): BrowserStepResult {
  const detail = [
    `action=${evidence.actionType}`,
    evidence.effectSession ? `effectSession=${evidence.effectSession}` : "",
    `observed=${evidence.observedSignals.join(",") || "none"}`,
    `changed=${evidence.changedSignals.join(",") || "none"}`,
    `timeoutMs=${evidence.timeoutMs}`,
  ].join("; ");
  if (evidence.status === "changed") {
    return { kind: "assertion", name: "assert:actionEffect", status: "passed", detail };
  }
  const error = evidence.status === "unavailable"
    ? "Browser provider could not observe any configured action-effect signal."
    : `Browser action ${evidence.actionType} completed, but no configured page-state effect was observed.`;
  return { kind: "assertion", name: "assert:actionEffect", status: "failed", detail, error };
}

export async function verifyBrowserActionEffect(input: {
  provider: BrowserActionEffectEvidence["provider"];
  action: BrowserActionSpec;
  actionIndex: number;
  session?: string;
  effectSession?: string;
  defaultTimeout: number;
  beforeObservation: BrowserActionEffectObservation;
  capture: () => Promise<BrowserActionEffectObservation>;
  rethrowCaptureError?: (error: any) => boolean;
}) {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const requestedSignals = normalizedSignals(input.action);
  const timeoutMs = browserActionEffectTimeout(input.action, input.defaultTimeout);
  const before = buildBrowserActionEffectSnapshot(input.beforeObservation, requestedSignals);
  let after = before;
  let changed: BrowserActionEffectSignal[] = [];
  const deadline = started + timeoutMs;
  do {
    let observation: BrowserActionEffectObservation = {};
    try {
      observation = await input.capture();
    } catch (error: any) {
      if (input.rethrowCaptureError?.(error)) throw error;
    }
    after = buildBrowserActionEffectSnapshot(observation, requestedSignals);
    changed = changedSignals(before, after);
    if (changed.length) break;
    if (Date.now() >= deadline) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  } while (true);

  const observed = Array.from(new Set([
    ...observedSignals(before),
    ...observedSignals(after),
  ]));
  const finished = Date.now();
  const evidence: BrowserActionEffectEvidence = {
    provider: input.provider,
    actionIndex: input.actionIndex,
    ...(input.session ? { session: input.session } : {}),
    ...(input.effectSession ? { effectSession: input.effectSession } : {}),
    actionType: input.action.type,
    status: changed.length ? "changed" : observed.length ? "unchanged" : "unavailable",
    timeoutMs,
    startedAt,
    finishedAt: new Date(finished).toISOString(),
    durationMs: finished - started,
    requestedSignals,
    observedSignals: observed,
    changedSignals: changed,
    before,
    after,
  };
  return {
    evidence,
    step: effectStep(evidence),
  };
}

export function suppressBrowserActionEffectDetails(
  evidence: BrowserActionEffectEvidence[],
) {
  return evidence.map(item => ({
    ...item,
    before: {},
    after: {},
    detailSuppressed: true,
  }));
}
