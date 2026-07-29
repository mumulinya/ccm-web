import {
  BROWSER_ACTION_ALIASES,
  BROWSER_ACTION_TYPES,
  BROWSER_ASSERTION_ALIASES,
  BROWSER_ASSERTION_TYPES,
} from "./work-order-aliases";
import { BrowserActionSpec, BrowserAssertionSpec, BrowserCheckSpec, WorkOrderIssue } from "./types";

// 规划模型此前只被告知“使用 Playwright 风格的动作和断言”，没有字段表，
// 只能靠猜字段名；猜错的检查会在归一化阶段被静默丢弃。
// 这里把真实契约明确写给模型，并在合并前做一次校验，丢弃项转成可见 issue。

const ACTION_TYPE_LIST = Array.from(BROWSER_ACTION_TYPES).sort();
const ASSERTION_TYPE_LIST = Array.from(BROWSER_ASSERTION_TYPES).sort();

export function browserCheckContractPrompt() {
  return [
    "Browser check schema (use these exact field names; unknown fields are dropped):",
    "{",
    '  "name": "short human-readable check name",',
    '  "url": "absolute URL to open (defaults to the project target URL)",',
    '  "screenshot": true,',
    '  "coversAcceptanceCriteria": ["exact text of the acceptance criteria this check proves"],',
    '  "actions": [{"type": "<action>", ...locator, "value": "text for fill/typeText/press/waitForTimeout"}],',
    '  "assertions": [{"type": "<assertion>", ...locator, "text": "expected text", "urlIncludes": "fragment"}]',
    "}",
    `Allowed action types: ${ACTION_TYPE_LIST.join(", ")}.`,
    `Allowed assertion types: ${ASSERTION_TYPE_LIST.join(", ")}.`,
    "Locator fields on actions and assertions (pick the most stable one available):",
    '  "testId" | "label" | "placeholder" | "role" + "name" | "text" | "selector".',
    "Prefer role+name or label over raw CSS selectors.",
    "Always set screenshot: true so the acceptance evidence includes a full-page capture.",
    "Always set coversAcceptanceCriteria so each screenshot can be traced back to the criterion it proves.",
    "Every browser check must contain at least one assertion; checks without assertions are rejected.",
  ].join("\n");
}

function canonicalActionType(value: any) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (BROWSER_ACTION_TYPES.has(raw)) return raw;
  const alias = BROWSER_ACTION_ALIASES[raw.toLowerCase()];
  return alias && BROWSER_ACTION_TYPES.has(alias) ? alias : "";
}

function canonicalAssertionType(value: any) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (BROWSER_ASSERTION_TYPES.has(raw)) return raw;
  const alias = BROWSER_ASSERTION_ALIASES[raw.toLowerCase()];
  return alias && BROWSER_ASSERTION_TYPES.has(alias) ? alias : "";
}

function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}

export interface PlannedBrowserCheckValidation {
  checks: BrowserCheckSpec[];
  issues: WorkOrderIssue[];
  droppedChecks: number;
  droppedActions: number;
  droppedAssertions: number;
}

/**
 * 校验规划模型产出的浏览器检查：丢弃无法识别的动作/断言，
 * 保留仍有断言的检查，并强制打开截图与验收标准绑定。
 */
export function validatePlannedBrowserChecks(
  raw: any,
  projectName: string,
  acceptanceCriteria: string[] = [],
): PlannedBrowserCheckValidation {
  const issues: WorkOrderIssue[] = [];
  const checks: BrowserCheckSpec[] = [];
  let droppedChecks = 0;
  let droppedActions = 0;
  let droppedAssertions = 0;
  const knownCriteria = new Set(acceptanceCriteria.map(item => String(item || "").trim()).filter(Boolean));

  asArray(raw).forEach((candidate: any, index: number) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      droppedChecks += 1;
      issues.push({
        severity: "warning",
        code: "agentic_browser_check_invalid",
        message: `${projectName}: planned browser check #${index + 1} is not an object and was dropped.`,
      });
      return;
    }
    const actions: BrowserActionSpec[] = [];
    for (const action of asArray(candidate.actions)) {
      const type = canonicalActionType(action?.type || action?.action || action?.kind);
      if (!type) {
        droppedActions += 1;
        continue;
      }
      actions.push({ ...action, type } as BrowserActionSpec);
    }
    const assertions: BrowserAssertionSpec[] = [];
    for (const assertion of asArray(candidate.assertions).concat(asArray(candidate.expectations))) {
      const type = canonicalAssertionType(assertion?.type || assertion?.assertion || assertion?.kind);
      if (!type) {
        droppedAssertions += 1;
        continue;
      }
      assertions.push({ ...assertion, type } as BrowserAssertionSpec);
    }
    if (!assertions.length) {
      droppedChecks += 1;
      issues.push({
        severity: "warning",
        code: "agentic_browser_check_without_assertion",
        message: `${projectName}: planned browser check "${String(candidate.name || `#${index + 1}`)}" had no recognizable assertion and was dropped.`,
      });
      return;
    }
    const covers = asArray(candidate.coversAcceptanceCriteria || candidate.covers_acceptance_criteria)
      .map((item: any) => String(item || "").trim())
      .filter(Boolean)
      .filter(item => !knownCriteria.size || knownCriteria.has(item));
    checks.push({
      ...candidate,
      name: String(candidate.name || `Planned browser check ${index + 1}`).slice(0, 200),
      actions,
      assertions,
      // 截图是验收证据的主要载体，规划层不允许关闭。
      screenshot: candidate.screenshot !== false,
      ...(covers.length ? { coversAcceptanceCriteria: covers } : {}),
    } as BrowserCheckSpec);
  });

  if (droppedActions || droppedAssertions) {
    issues.push({
      severity: "warning",
      code: "agentic_browser_check_partially_dropped",
      message: `${projectName}: dropped ${droppedActions} unrecognized browser action(s) and ${droppedAssertions} unrecognized assertion(s) from the planned checks.`,
    });
  }
  return { checks, issues, droppedChecks, droppedActions, droppedAssertions };
}
