import {
  BrowserCheckSpec,
  BrowserSessionComparisonStepSpec,
  BrowserSessionExecutableStepSpec,
  BrowserSessionLeafStepSpec,
  BrowserSessionParallelStepSpec,
  BrowserSessionSpec,
  BrowserSessionStepSpec,
  BrowserStepResult,
} from "../types";
import { browserActionEffectRequired, browserActionEffectSession } from "./action-effects";

export const MULTI_SESSION_BROWSER_PROBE_TYPE = "multi_session_browser_scenario";

export function browserSessionSteps(check: BrowserCheckSpec) {
  return check.sessionSteps || check.session_steps || [];
}

export function isBrowserSessionParallelStep(step: BrowserSessionStepSpec): step is BrowserSessionParallelStepSpec {
  return Array.isArray((step as BrowserSessionParallelStepSpec).parallel);
}

export function isBrowserSessionComparisonStep(step: BrowserSessionStepSpec): step is BrowserSessionComparisonStepSpec {
  return Boolean((step as BrowserSessionComparisonStepSpec).compare);
}

export function isBrowserSessionLeafStep(step: BrowserSessionStepSpec | BrowserSessionExecutableStepSpec): step is BrowserSessionLeafStepSpec {
  return !isBrowserSessionComparisonStep(step) && !isBrowserSessionParallelStep(step as BrowserSessionStepSpec);
}

export function flattenBrowserSessionSteps(check: BrowserCheckSpec): BrowserSessionExecutableStepSpec[] {
  return browserSessionSteps(check).flatMap(step => isBrowserSessionParallelStep(step) ? step.parallel : [step]);
}

export function browserSessionParallelGroupCount(check: BrowserCheckSpec) {
  return browserSessionSteps(check).filter(isBrowserSessionParallelStep).length;
}

export function hasMultiSessionBrowserScenario(check: BrowserCheckSpec) {
  return Boolean((check.sessions || []).length || browserSessionSteps(check).length);
}

export function validateMultiSessionBrowserScenario(check: BrowserCheckSpec) {
  const errors: string[] = [];
  const sessions = check.sessions || [];
  const steps = browserSessionSteps(check);
  if (sessions.length < 2) errors.push("Multi-session browser checks require at least two sessions.");
  if (!steps.length) errors.push("Multi-session browser checks require at least one session step.");
  if ((check.actions || []).length || (check.assertions || []).length) {
    errors.push("Multi-session browser checks cannot mix top-level actions/assertions with sessionSteps.");
  }

  const names = new Set<string>();
  for (const session of sessions) {
    const name = String(session.name || "").trim();
    if (!name) {
      errors.push("Each browser session requires a non-empty name.");
      continue;
    }
    const key = name.toLowerCase();
    if (names.has(key)) errors.push(`Browser session name ${JSON.stringify(name)} is duplicated.`);
    names.add(key);
  }

  const participating = new Set<string>();
  const validateSessionName = (session: string, label: string, participates = true) => {
    const normalized = String(session || "").trim();
    if (!normalized) {
      errors.push(`${label} requires a session name.`);
      return "";
    }
    if (!names.has(normalized.toLowerCase())) {
      errors.push(`${label} references unknown session ${JSON.stringify(normalized)}.`);
      return "";
    }
    if (participates) participating.add(normalized.toLowerCase());
    return normalized.toLowerCase();
  };
  const validateActionEffectTarget = (action: BrowserSessionLeafStepSpec["action"], actorSession: string, label: string) => {
    if (!action) return;
    const effectSession = browserActionEffectSession(action);
    if (!effectSession) return;
    if (!browserActionEffectRequired(action)) {
      errors.push(`${label} defines effectSession without enabling verifyEffect.`);
    }
    const target = validateSessionName(effectSession, `${label} effectSession`, false);
    if (target && target === String(actorSession || "").trim().toLowerCase()) {
      errors.push(`${label} effectSession must differ from the actor session.`);
    }
  };
  const validateLeaf = (step: BrowserSessionLeafStepSpec, label: string, groupSessions?: Set<string>) => {
    const session = validateSessionName(step.session, label);
    const hasAction = Boolean(step.action);
    const hasAssertion = Boolean(step.assertion);
    if (session) groupSessions?.add(session);
    if (hasAction === hasAssertion) errors.push(`${label} must contain exactly one action or assertion.`);
    validateActionEffectTarget(step.action, step.session, label);
  };
  for (const session of sessions) {
    for (const [actionIndex, action] of (session.setupActions || session.setup_actions || []).entries()) {
      validateActionEffectTarget(action, session.name, `Browser session ${JSON.stringify(session.name)} setup action ${actionIndex + 1}`);
    }
  }
  for (const [index, step] of steps.entries()) {
    if (isBrowserSessionParallelStep(step)) {
      if (step.parallel.length < 2) errors.push(`Browser parallel session step group ${index + 1} requires at least two steps.`);
      const groupSessions = new Set<string>();
      for (const [parallelIndex, parallelStep] of step.parallel.entries()) {
        validateLeaf(parallelStep, `Browser parallel session step ${index + 1}.${parallelIndex + 1}`, groupSessions);
      }
      if (step.parallel.length && groupSessions.size < 2) errors.push(`Browser parallel session step group ${index + 1} must involve at least two sessions.`);
    } else if (isBrowserSessionComparisonStep(step)) {
      const label = `Browser session comparison step ${index + 1}`;
      const left = validateSessionName(step.compare.leftSession, `${label} leftSession`);
      const right = validateSessionName(step.compare.rightSession, `${label} rightSession`);
      if (left && right && left === right) errors.push(`${label} must compare two distinct sessions.`);
      if (!["equals", "notEquals", "includes"].includes(step.compare.operator)) {
        errors.push(`${label} has unsupported operator ${JSON.stringify(step.compare.operator)}.`);
      }
      if (!String(step.compare.leftExpression || "").trim()) errors.push(`${label} requires leftExpression or expression.`);
      if (!String(step.compare.rightExpression || "").trim()) errors.push(`${label} requires rightExpression or expression.`);
      if (step.compare.timeoutMs !== undefined && (!Number.isFinite(step.compare.timeoutMs) || step.compare.timeoutMs <= 0)) {
        errors.push(`${label} timeoutMs must be a positive number.`);
      }
      if (step.compare.pollMs !== undefined && (!Number.isFinite(step.compare.pollMs) || step.compare.pollMs <= 0)) {
        errors.push(`${label} pollMs must be a positive number.`);
      }
    } else {
      validateLeaf(step, `Browser session step ${index + 1}`);
    }
  }
  if (steps.length && participating.size < 2) errors.push("Multi-session browser checks must execute steps in at least two sessions.");
  return errors;
}

export function browserSessionByName(sessions: BrowserSessionSpec[], name: string) {
  const key = String(name || "").trim().toLowerCase();
  return sessions.find(session => String(session.name || "").trim().toLowerCase() === key);
}

export function prefixBrowserSessionStep(session: string, step: BrowserStepResult): BrowserStepResult {
  return {
    ...step,
    name: `session:${session}:${step.name}`,
    detail: [`session=${session}`, step.detail || ""].filter(Boolean).join("; "),
  };
}

export function browserSessionScenarioMetadata(check: BrowserCheckSpec) {
  const sessions = check.sessions || [];
  const steps = flattenBrowserSessionSteps(check);
  return {
    multiSession: true,
    sessionCount: sessions.length,
    sessionNames: sessions.map(session => session.name),
    sessionStepCount: steps.length,
    parallelGroupCount: browserSessionParallelGroupCount(check),
    comparisonCount: steps.filter(isBrowserSessionComparisonStep).length,
  };
}

export function browserSessionInitialUrl(session: BrowserSessionSpec, fallback: string) {
  return String(session.url || fallback || "");
}
