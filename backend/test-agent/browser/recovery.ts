import {
  BrowserRecoveryEvidence,
  BrowserRecoveryEvent,
  BrowserRecoveryStatus,
  BrowserRecoveryTrigger,
} from "../types";

export const MAX_BROWSER_SESSION_RECOVERY_ATTEMPTS = 1;

const STALE_TAB_PATTERNS = [
  /\b(tab|page|target)\b.{0,80}\b(not found|does not exist|invalid|closed|detached|gone|no longer exists)\b/i,
  /\b(no such|cannot find|unable to find)\b.{0,40}\b(tab|page|target)\b/i,
  /\btarget closed\b/i,
];

const NAVIGATION_CONTEXT_PATTERNS = [
  /\bexecution context\b.{0,80}\b(destroyed|lost|invalid)\b/i,
  /\bframe\b.{0,80}\b(detached|navigated|no longer exists)\b/i,
  /\bnavigation\b.{0,80}\b(context lost|interrupted because.*closed)\b/i,
];

const TRANSPORT_PATTERNS = [
  /\b(browser extension|mcp|transport|connection|session)\b.{0,80}\b(disconnected|closed|not connected|no response|unavailable)\b/i,
  /\bchannel closed\b/i,
];

export function browserRecoveryTrigger(error: any): BrowserRecoveryTrigger | null {
  const message = String(error?.message || error || "");
  if (STALE_TAB_PATTERNS.some(pattern => pattern.test(message))) return "stale_tab";
  if (NAVIGATION_CONTEXT_PATTERNS.some(pattern => pattern.test(message))) return "navigation_context_lost";
  if (TRANSPORT_PATTERNS.some(pattern => pattern.test(message))) return "transport_disconnected";
  return null;
}

export function browserRecoveryFailureMessage(
  trigger: BrowserRecoveryTrigger,
  status: BrowserRecoveryStatus,
) {
  if (status === "not_retried") {
    return `Browser session ${trigger} was detected, but the operation was not retried because it may have side effects.`;
  }
  return `Browser session recovery for ${trigger} failed during the single safe recovery attempt.`;
}

export class BrowserRecoveryTracker {
  private events: BrowserRecoveryEvent[] = [];

  constructor(
    private provider: BrowserRecoveryEvent["provider"],
    private maxAttempts = MAX_BROWSER_SESSION_RECOVERY_ATTEMPTS,
  ) {}

  record(input: Omit<BrowserRecoveryEvent, "provider" | "attempt">) {
    this.events.push({
      provider: this.provider,
      attempt: 1,
      ...input,
    });
  }

  evidence(): BrowserRecoveryEvidence | undefined {
    if (!this.events.length) return undefined;
    return {
      maxAttempts: this.maxAttempts,
      attempted: this.events.length,
      recovered: this.events.filter(event => event.status === "recovered").length,
      failed: this.events.filter(event => event.status === "failed").length,
      notRetried: this.events.filter(event => event.status === "not_retried").length,
      events: this.events.map(event => ({ ...event })),
    };
  }
}
