import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserStepResult,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { compactText, resolveUrl } from "../utils";

export type McpBrowserAdapterId = "playwright-mcp" | "claude-in-chrome" | "chrome-devtools" | "computer-use";

export interface McpBrowserAdapter {
  id: McpBrowserAdapterId;
  label: string;
  tools: string[];
  currentUrl: string;
  runAction: (project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number) => Promise<BrowserStepResult>;
  runAssertion: (assertion: BrowserAssertionSpec, signals: McpBrowserSignals, defaultTimeout: number) => Promise<BrowserStepResult>;
  readConsoleErrors: () => Promise<string[]>;
  readNetworkErrors: () => Promise<string[]>;
  captureScreenshot: (name: string) => Promise<string[]>;
}

export interface McpBrowserSignals {
  pageText: string;
  consoleErrors: string[];
  networkErrors: string[];
}

type Caller = (toolName: string, input: Record<string, any>) => Promise<any>;
type ComputerCoordinate = [number, number];

function has(tools: string[], pattern: RegExp) {
  return tools.some(tool => pattern.test(tool));
}

function pick(tools: string[], patterns: RegExp[]) {
  return tools.find(tool => patterns.some(pattern => pattern.test(tool)));
}

function stringifyOutput(output: any) {
  if (output === undefined || output === null) return "";
  if (typeof output === "string") return output;
  try { return JSON.stringify(output); } catch { return String(output); }
}

function extractToolText(output: any) {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return output.map(extractToolText).filter(Boolean).join("\n");
  if (output && typeof output === "object") {
    const parts: string[] = [];
    for (const key of ["text", "content", "markdown", "snapshot", "pageText", "result", "output"]) {
      if (typeof output[key] === "string") parts.push(output[key]);
    }
    if (Array.isArray(output.content)) parts.push(output.content.map(extractToolText).join("\n"));
    return parts.filter(Boolean).join("\n") || stringifyOutput(output);
  }
  return String(output ?? "");
}

function extractTabId(output: any): number | string | undefined {
  if (output === undefined || output === null) return undefined;
  if (typeof output === "number" || typeof output === "string") return output;
  if (typeof output === "object") {
    for (const key of ["tabId", "tab_id", "id", "activeTabId"]) {
      if (typeof output[key] === "number" || typeof output[key] === "string") return output[key];
    }
    if (output.tab && (typeof output.tab.id === "number" || typeof output.tab.id === "string")) return output.tab.id;
  }
  return undefined;
}

function emptyLike(text: string) {
  return /^(\[\]|{}|null|undefined|"")$/i.test(text.trim());
}

function targetInput(action: BrowserActionSpec) {
  const label = String(action.selector || action.text || action.value || "target");
  return {
    selector: action.selector,
    locator: action.locator || action.selector,
    testId: action.testId || action.test_id || action.dataTestId || action.data_testid,
    label: action.label,
    placeholder: action.placeholder,
    role: action.role,
    name: action.name,
    altText: action.altText || action.alt_text,
    title: action.title,
    element: label,
    ref: action.selector || label,
    text: String(action.value ?? action.text ?? ""),
    value: String(action.value ?? action.text ?? ""),
  };
}

function step(kind: "action" | "assertion", name: string, status: BrowserStepResult["status"], detail = "", error = ""): BrowserStepResult {
  return { kind, name, status, detail, ...(error ? { error } : {}) };
}

function isCoordinate(value: unknown): value is ComputerCoordinate {
  return Array.isArray(value)
    && value.length === 2
    && value.every(item => Number.isFinite(Number(item)));
}

function coordinateInput(action: BrowserActionSpec) {
  return isCoordinate(action.coordinate) ? { coordinate: [Number(action.coordinate[0]), Number(action.coordinate[1])] as ComputerCoordinate } : {};
}

function computerActionDetail(action: BrowserActionSpec) {
  const coordinate = isCoordinate(action.coordinate) ? `(${action.coordinate[0]},${action.coordinate[1]})` : "";
  return action.selector || action.text || action.value || action.url || coordinate;
}

function browserAddressShortcut() {
  return process.platform === "darwin" ? "command+l" : "ctrl+l";
}

function normalizeComputerUseApps(apps: BrowserActionSpec["apps"]) {
  if (!Array.isArray(apps)) return undefined;
  return apps
    .map(app => ({
      displayName: app.displayName,
      bundle_id: app.bundle_id || app.bundleId,
    }))
    .filter(app => app.displayName || app.bundle_id);
}

async function assertWithText(adapterName: string, assertion: BrowserAssertionSpec, signals: McpBrowserSignals): Promise<BrowserStepResult> {
  const expected = String(assertion.text || assertion.value || "");
  if (assertion.type === "consoleNoErrors") {
    return signals.consoleErrors.length
      ? step("assertion", `${adapterName}:consoleNoErrors`, "failed", "", signals.consoleErrors.slice(0, 3).join(" | "))
      : step("assertion", `${adapterName}:consoleNoErrors`, "passed");
  }
  if (assertion.type === "networkNoErrors") {
    return signals.networkErrors.length
      ? step("assertion", `${adapterName}:networkNoErrors`, "failed", "", signals.networkErrors.slice(0, 3).join(" | "))
      : step("assertion", `${adapterName}:networkNoErrors`, "passed");
  }
  if (assertion.type === "text" || assertion.type === "elementTextIncludes") {
    if (!expected) return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", "Missing expected text.");
    return signals.pageText.includes(expected)
      ? step("assertion", `${adapterName}:${assertion.type}`, "passed", expected)
      : step("assertion", `${adapterName}:${assertion.type}`, "failed", expected, `Expected page text to include "${expected}".`);
  }
  if (assertion.type === "visible") {
    const expectedVisible = String(assertion.text || assertion.value || assertion.selector || "");
    if (!expectedVisible) return step("assertion", `${adapterName}:visible`, "failed", "", "MCP visible assertion needs selector/text/value.");
    return signals.pageText.includes(expectedVisible)
      ? step("assertion", `${adapterName}:visible`, "passed", expectedVisible)
      : step("assertion", `${adapterName}:visible`, "failed", expectedVisible, `Could not verify visible target "${expectedVisible}" from page text.`);
  }
  if (assertion.type === "notVisible") {
    const expectedHidden = String(assertion.text || assertion.value || assertion.selector || "");
    if (!expectedHidden) return step("assertion", `${adapterName}:notVisible`, "failed", "", "MCP notVisible assertion needs selector/text/value.");
    return !signals.pageText.includes(expectedHidden)
      ? step("assertion", `${adapterName}:notVisible`, "passed", expectedHidden)
      : step("assertion", `${adapterName}:notVisible`, "failed", expectedHidden, `Target "${expectedHidden}" is still present in page text.`);
  }
  if (assertion.type === "titleIncludes") {
    return signals.pageText.includes(expected)
      ? step("assertion", `${adapterName}:titleIncludes`, "passed", expected)
      : step("assertion", `${adapterName}:titleIncludes`, "failed", expected, "MCP title assertion fell back to page text and did not match.");
  }
  if (assertion.type === "jsTruthy") {
    const expression = String(assertion.expression || assertion.text || assertion.value || "");
    const text = signals.pageText.trim();
    const supportsPageContentFallback = !expression || /document\.body|innerText|textContent|children|pageText/i.test(expression);
    if (!supportsPageContentFallback) {
      return step("assertion", `${adapterName}:jsTruthy`, "failed", expression, `MCP ${adapterName} cannot evaluate this JavaScript expression; use Playwright/Chrome DevTools or a text assertion.`);
    }
    return text && !emptyLike(text)
      ? step("assertion", `${adapterName}:jsTruthy`, "passed", `page text length=${text.length}`)
      : step("assertion", `${adapterName}:jsTruthy`, "failed", expression || "page content", "Expected page snapshot/text to be non-empty.");
  }
  return step("assertion", `${adapterName}:${assertion.type}`, "failed", "", `Assertion ${assertion.type} is not supported by ${adapterName}.`);
}

class PlaywrightMcpAdapter implements McpBrowserAdapter {
  id: McpBrowserAdapterId = "playwright-mcp";
  label = "Playwright MCP";
  currentUrl = "";
  constructor(public tools: string[], private call: Caller) {}

  async runAction(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number) {
    try {
      if (action.type === "goto") {
        const tool = pick(this.tools, [/__browser_navigate$/]);
        if (!tool) throw new Error("Missing browser_navigate.");
        const url = resolveUrl(project.targetUrl, action.url || "");
        await this.call(tool, { url });
        this.currentUrl = url;
        return step("action", "playwright:goto", "passed", url);
      }
      if (action.type === "reload") {
        const tool = pick(this.tools, [/__browser_navigate$/]);
        const url = resolveUrl(project.targetUrl, action.url || this.currentUrl || project.targetUrl);
        if (!tool) throw new Error("Missing browser_navigate.");
        if (!url) throw new Error("Cannot reload without a current URL or project targetUrl.");
        await this.call(tool, { url });
        this.currentUrl = url;
        return step("action", "playwright:reload", "passed", url);
      }
      if (action.type === "click") {
        const tool = pick(this.tools, [/__browser_click$/]);
        if (!tool) throw new Error("Missing browser_click.");
        await this.call(tool, targetInput(action));
        return step("action", "playwright:click", "passed", action.selector || action.text || "");
      }
      if (action.type === "fill") {
        const tool = pick(this.tools, [/__browser_type$/]);
        if (!tool) throw new Error("Missing browser_type.");
        await this.call(tool, targetInput(action));
        return step("action", "playwright:fill", "passed", action.selector || action.text || "");
      }
      if (action.type === "press") {
        const tool = pick(this.tools, [/__browser_press_key$/]);
        if (!tool) throw new Error("Missing browser_press_key.");
        await this.call(tool, { key: action.key || action.text || "Enter" });
        return step("action", "playwright:press", "passed", action.key || action.text || "Enter");
      }
      if (action.type === "waitForTimeout") {
        const tool = pick(this.tools, [/__browser_wait_for$/]);
        const ms = Math.min(Number(action.value || action.text || defaultTimeout || 1000), defaultTimeout);
        if (tool) await this.call(tool, { time: Math.max(1, Math.ceil(ms / 1000)) });
        else await new Promise(resolve => setTimeout(resolve, ms));
        return step("action", "playwright:waitForTimeout", "passed", `${ms}ms`);
      }
      if (action.type === "evaluate") {
        const tool = pick(this.tools, [/__browser_evaluate$/]);
        if (!tool) throw new Error("Missing browser_evaluate.");
        await this.call(tool, { function: String(action.text || action.value || "() => undefined") });
        return step("action", "playwright:evaluate", "passed");
      }
      return step("action", `playwright:${action.type}`, "failed", "", `Action ${action.type} is not mapped for Playwright MCP.`);
    } catch (error: any) {
      return step("action", `playwright:${action.type}`, "failed", action.selector || action.text || action.url || "", error.message || String(error));
    }
  }

  async runAssertion(assertion: BrowserAssertionSpec, signals: McpBrowserSignals) {
    if (assertion.type === "urlIncludes") {
      const expected = String(assertion.value || assertion.text || "");
      return this.currentUrl.includes(expected)
        ? step("assertion", "playwright:urlIncludes", "passed", expected)
        : step("assertion", "playwright:urlIncludes", "failed", expected, `Expected URL to include "${expected}", got "${this.currentUrl}".`);
    }
    return assertWithText("playwright", assertion, signals);
  }

  async readConsoleErrors() {
    const tool = pick(this.tools, [/__browser_console_messages$/, /__read_console_messages$/]);
    if (!tool) return [];
    const text = extractToolText(await this.call(tool, {}));
    return text && !emptyLike(text) ? [compactText(text, 1000)] : [];
  }

  async readNetworkErrors() {
    const tool = pick(this.tools, [/__browser_network_requests$/, /__read_network_requests$/]);
    if (!tool) return [];
    const text = extractToolText(await this.call(tool, {}));
    return text && /\b(4\d\d|5\d\d|failed|error)\b/i.test(text) ? [compactText(text, 1000)] : [];
  }

  async captureScreenshot(name: string) {
    const tool = pick(this.tools, [/__browser_take_screenshot$/]);
    if (!tool) return [];
    return [await this.call(tool, { filename: name, fullPage: true })];
  }

  async pageText() {
    const tool = pick(this.tools, [/__browser_snapshot$/]);
    if (!tool) return "";
    return extractToolText(await this.call(tool, {}));
  }
}

class ClaudeChromeAdapter implements McpBrowserAdapter {
  id: McpBrowserAdapterId = "claude-in-chrome";
  label = "Claude in Chrome";
  currentUrl = "";
  private tabId: number | string | undefined;
  constructor(public tools: string[], private call: Caller) {}

  private async ensureTab(url?: string) {
    if (this.tabId !== undefined) return this.tabId;
    const createTool = pick(this.tools, [/__tabs_create_mcp$/]);
    if (createTool) {
      const output = await this.call(createTool, url ? { url } : {});
      this.tabId = extractTabId(output);
    }
    return this.tabId;
  }

  private withTab(input: Record<string, any>) {
    return this.tabId !== undefined ? { ...input, tabId: this.tabId } : input;
  }

  async runAction(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number) {
    try {
      if (action.type === "goto") {
        const url = resolveUrl(project.targetUrl, action.url || "");
        await this.ensureTab(url);
        const tool = pick(this.tools, [/__navigate$/]);
        if (tool) await this.call(tool, this.withTab({ url }));
        this.currentUrl = url;
        return step("action", "claude-in-chrome:goto", "passed", url);
      }
      if (action.type === "reload") {
        const url = resolveUrl(project.targetUrl, action.url || this.currentUrl || project.targetUrl);
        await this.ensureTab(url);
        const tool = pick(this.tools, [/__navigate$/]);
        if (!tool) throw new Error("Missing navigate tool.");
        if (!url) throw new Error("Cannot reload without a current URL or project targetUrl.");
        await this.call(tool, this.withTab({ url }));
        this.currentUrl = url;
        return step("action", "claude-in-chrome:reload", "passed", url);
      }
      if (action.type === "click") {
        const tool = pick(this.tools, [/__computer$/]);
        if (!tool) throw new Error("Missing computer tool.");
        await this.call(tool, this.withTab({ action: "left_click", ref: action.selector || action.text || action.value }));
        return step("action", "claude-in-chrome:click", "passed", action.selector || action.text || "");
      }
      if (action.type === "fill") {
        const tool = pick(this.tools, [/__form_input$/, /__computer$/]);
        if (!tool) throw new Error("Missing input tool.");
        const payload = tool.endsWith("__computer")
          ? { action: "type", text: String(action.value ?? action.text ?? "") }
          : targetInput(action);
        await this.call(tool, this.withTab(payload));
        return step("action", "claude-in-chrome:fill", "passed", action.selector || action.text || "");
      }
      if (action.type === "waitForTimeout") {
        await new Promise(resolve => setTimeout(resolve, Math.min(Number(action.value || action.text || 1000), defaultTimeout)));
        return step("action", "claude-in-chrome:waitForTimeout", "passed");
      }
      if (action.type === "evaluate") {
        const tool = pick(this.tools, [/__javascript_tool$/]);
        if (!tool) throw new Error("Missing javascript_tool.");
        await this.call(tool, this.withTab({ text: String(action.text || action.value || "undefined") }));
        return step("action", "claude-in-chrome:evaluate", "passed");
      }
      return step("action", `claude-in-chrome:${action.type}`, "failed", "", `Action ${action.type} is not mapped for Claude in Chrome.`);
    } catch (error: any) {
      return step("action", `claude-in-chrome:${action.type}`, "failed", action.selector || action.text || action.url || "", error.message || String(error));
    }
  }

  async runAssertion(assertion: BrowserAssertionSpec, signals: McpBrowserSignals) {
    if (assertion.type === "urlIncludes") {
      const expected = String(assertion.value || assertion.text || "");
      return this.currentUrl.includes(expected)
        ? step("assertion", "claude-in-chrome:urlIncludes", "passed", expected)
        : step("assertion", "claude-in-chrome:urlIncludes", "failed", expected, `Expected URL to include "${expected}", got "${this.currentUrl}".`);
    }
    return assertWithText("claude-in-chrome", assertion, signals);
  }

  async readConsoleErrors() {
    const tool = pick(this.tools, [/__read_console_messages$/]);
    if (!tool) return [];
    const text = extractToolText(await this.call(tool, this.withTab({ onlyErrors: true })));
    return text && !emptyLike(text) ? [compactText(text, 1000)] : [];
  }

  async readNetworkErrors() {
    const tool = pick(this.tools, [/__read_network_requests$/]);
    if (!tool) return [];
    const text = extractToolText(await this.call(tool, this.withTab({})));
    return text && /\b(4\d\d|5\d\d|failed|error)\b/i.test(text) ? [compactText(text, 1000)] : [];
  }

  async captureScreenshot(name: string) {
    const tool = pick(this.tools, [/__gif_creator$/]);
    if (!tool) return [];
    return [await this.call(tool, this.withTab({ action: "capture_frame", name }))];
  }

  async pageText() {
    const tool = pick(this.tools, [/__get_page_text$/, /__read_page$/]);
    if (!tool) return "";
    return extractToolText(await this.call(tool, this.withTab({})));
  }
}

class ChromeDevtoolsAdapter implements McpBrowserAdapter {
  id: McpBrowserAdapterId = "chrome-devtools";
  label = "Chrome DevTools MCP";
  currentUrl = "";
  constructor(public tools: string[], private call: Caller) {}

  async runAction(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number) {
    try {
      if (action.type === "goto") {
        const url = resolveUrl(project.targetUrl, action.url || "");
        const createTool = pick(this.tools, [/__new_page$/]);
        const navTool = pick(this.tools, [/__navigate_page$/]);
        if (createTool) await this.call(createTool, { url });
        else if (navTool) await this.call(navTool, { url });
        else throw new Error("Missing new_page/navigate_page.");
        this.currentUrl = url;
        return step("action", "chrome-devtools:goto", "passed", url);
      }
      if (action.type === "reload") {
        const url = resolveUrl(project.targetUrl, action.url || this.currentUrl || project.targetUrl);
        const navTool = pick(this.tools, [/__navigate_page$/]);
        if (!navTool) throw new Error("Missing navigate_page.");
        if (!url) throw new Error("Cannot reload without a current URL or project targetUrl.");
        await this.call(navTool, { url });
        this.currentUrl = url;
        return step("action", "chrome-devtools:reload", "passed", url);
      }
      if (action.type === "click") {
        const tool = pick(this.tools, [/__click$/]);
        if (!tool) throw new Error("Missing click tool.");
        await this.call(tool, targetInput(action));
        return step("action", "chrome-devtools:click", "passed", action.selector || action.text || "");
      }
      if (action.type === "fill") {
        const tool = pick(this.tools, [/__fill$/, /__type$/]);
        if (!tool) throw new Error("Missing fill/type tool.");
        await this.call(tool, targetInput(action));
        return step("action", "chrome-devtools:fill", "passed", action.selector || action.text || "");
      }
      if (action.type === "evaluate") {
        const tool = pick(this.tools, [/__evaluate_script$/]);
        if (!tool) throw new Error("Missing evaluate_script.");
        await this.call(tool, { function: String(action.text || action.value || "() => undefined") });
        return step("action", "chrome-devtools:evaluate", "passed");
      }
      if (action.type === "waitForTimeout") {
        await new Promise(resolve => setTimeout(resolve, Math.min(Number(action.value || action.text || 1000), defaultTimeout)));
        return step("action", "chrome-devtools:waitForTimeout", "passed");
      }
      return step("action", `chrome-devtools:${action.type}`, "failed", "", `Action ${action.type} is not mapped for Chrome DevTools MCP.`);
    } catch (error: any) {
      return step("action", `chrome-devtools:${action.type}`, "failed", action.selector || action.text || action.url || "", error.message || String(error));
    }
  }

  async runAssertion(assertion: BrowserAssertionSpec, signals: McpBrowserSignals) {
    if (assertion.type === "urlIncludes") {
      const expected = String(assertion.value || assertion.text || "");
      return this.currentUrl.includes(expected)
        ? step("assertion", "chrome-devtools:urlIncludes", "passed", expected)
        : step("assertion", "chrome-devtools:urlIncludes", "failed", expected, `Expected URL to include "${expected}", got "${this.currentUrl}".`);
    }
    return assertWithText("chrome-devtools", assertion, signals);
  }

  async readConsoleErrors() {
    const tool = pick(this.tools, [/__list_console_messages$/]);
    if (!tool) return [];
    const text = extractToolText(await this.call(tool, {}));
    return text && /\b(error|exception|failed)\b/i.test(text) ? [compactText(text, 1000)] : [];
  }

  async readNetworkErrors() {
    const tool = pick(this.tools, [/__list_network_requests$/]);
    if (!tool) return [];
    const text = extractToolText(await this.call(tool, {}));
    return text && /\b(4\d\d|5\d\d|failed|error)\b/i.test(text) ? [compactText(text, 1000)] : [];
  }

  async captureScreenshot(name: string) {
    const tool = pick(this.tools, [/__take_screenshot$/]);
    if (!tool) return [];
    return [await this.call(tool, { filePath: name })];
  }

  async pageText() {
    const tool = pick(this.tools, [/__take_snapshot$/]);
    if (!tool) return "";
    return extractToolText(await this.call(tool, {}));
  }
}

class ComputerUseAdapter implements McpBrowserAdapter {
  id: McpBrowserAdapterId = "computer-use";
  label = "Computer Use MCP";
  currentUrl = "";
  constructor(public tools: string[], private call: Caller) {}

  private unsupported(kind: "action" | "assertion", type: string, reason: string): BrowserStepResult {
    return step(kind, `computer-use:${type}`, "failed", "", reason);
  }

  async runAction(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number) {
    try {
      if (action.type === "requestAccess") {
        const tool = pick(this.tools, [/__request_access$/]);
        if (!tool) throw new Error("Missing request_access tool.");
        const apps = normalizeComputerUseApps(action.apps);
        await this.call(tool, apps ? { apps } : {});
        return step("action", "computer-use:requestAccess", "passed", apps ? `${apps.length} apps` : "session access requested");
      }
      if (action.type === "openApplication") {
        const tool = pick(this.tools, [/__open_application$/]);
        if (!tool) throw new Error("Missing open_application tool.");
        const bundleId = String(action.bundle_id || action.bundleId || action.value || action.text || "").trim();
        if (!bundleId) throw new Error("openApplication requires bundleId/bundle_id.");
        await this.call(tool, { bundle_id: bundleId });
        return step("action", "computer-use:openApplication", "passed", bundleId);
      }
      if (action.type === "goto") {
        const keyTool = pick(this.tools, [/__key$/]);
        const typeTool = pick(this.tools, [/__type$/]);
        if (!keyTool || !typeTool) throw new Error("Computer Use goto needs key and type tools, with a browser already focused.");
        const url = resolveUrl(project.targetUrl, action.url || project.targetUrl);
        await this.call(keyTool, { text: browserAddressShortcut() });
        await this.call(typeTool, { text: url });
        await this.call(keyTool, { text: "enter" });
        this.currentUrl = url;
        return step("action", "computer-use:goto", "passed", `${url} typed into the active browser`);
      }
      if (action.type === "reload") {
        const keyTool = pick(this.tools, [/__key$/]);
        if (!keyTool) throw new Error("Missing key tool.");
        await this.call(keyTool, { text: "ctrl+r" });
        return step("action", "computer-use:reload", "passed", "browser refresh shortcut sent");
      }
      if (action.type === "click" || action.type === "check" || action.type === "uncheck") {
        const tool = pick(this.tools, [/__left_click$/]);
        if (!tool) throw new Error("Missing left_click tool.");
        const input = coordinateInput(action);
        if (!input.coordinate) throw new Error("Computer Use click requires action.coordinate [x,y]; selectors/text cannot be resolved without DOM access.");
        await this.call(tool, input);
        return step("action", `computer-use:${action.type}`, "passed", computerActionDetail(action));
      }
      if (action.type === "hover") {
        const tool = pick(this.tools, [/__mouse_move$/]);
        if (!tool) throw new Error("Missing mouse_move tool.");
        const input = coordinateInput(action);
        if (!input.coordinate) throw new Error("Computer Use hover requires action.coordinate [x,y].");
        await this.call(tool, input);
        return step("action", "computer-use:hover", "passed", computerActionDetail(action));
      }
      if (action.type === "fill") {
        const typeTool = pick(this.tools, [/__type$/]);
        if (!typeTool) throw new Error("Missing type tool.");
        const text = String(action.value ?? action.text ?? "");
        if (!text) throw new Error("fill requires value/text.");
        const input = coordinateInput(action);
        if (input.coordinate) {
          const clickTool = pick(this.tools, [/__left_click$/]);
          if (clickTool) await this.call(clickTool, input);
        } else if (action.selector) {
          throw new Error("Computer Use fill cannot resolve selectors; click a coordinate first or provide action.coordinate.");
        }
        await this.call(typeTool, { text });
        return step("action", "computer-use:fill", "passed", input.coordinate ? `${computerActionDetail(action)} then typed` : "typed into focused control");
      }
      if (action.type === "press") {
        const tool = pick(this.tools, [/__key$/]);
        if (!tool) throw new Error("Missing key tool.");
        const text = String(action.key || action.text || action.value || "enter");
        await this.call(tool, { text });
        return step("action", "computer-use:press", "passed", text);
      }
      if (action.type === "scroll") {
        const tool = pick(this.tools, [/__scroll$/]);
        if (!tool) throw new Error("Missing scroll tool.");
        const amount = Math.max(1, Number(action.amount || action.value || 1));
        const input = {
          direction: action.direction || "down",
          amount,
          ...coordinateInput(action),
        };
        await this.call(tool, input);
        return step("action", "computer-use:scroll", "passed", `${input.direction} x${amount}`);
      }
      if (action.type === "waitForTimeout") {
        const ms = Math.min(Number(action.duration || action.value || action.text || defaultTimeout || 1000), defaultTimeout);
        const seconds = Math.max(1, Math.ceil(ms / 1000));
        const tool = pick(this.tools, [/__wait$/]);
        if (tool) await this.call(tool, { duration: seconds });
        else await new Promise(resolve => setTimeout(resolve, seconds * 1000));
        return step("action", "computer-use:waitForTimeout", "passed", `${seconds}s`);
      }
      if (action.type === "waitForSelector" || action.type === "waitForText") {
        return this.unsupported("action", action.type, "Computer Use cannot wait on DOM selectors or page text. Use a browser-native MCP provider for DOM assertions.");
      }
      if (action.type === "evaluate") {
        return this.unsupported("action", "evaluate", "Computer Use cannot evaluate JavaScript in the page. Use Playwright, Claude in Chrome, or Chrome DevTools MCP.");
      }
      if (action.type === "selectOption") {
        return this.unsupported("action", "selectOption", "Computer Use cannot resolve select elements by selector; model it as coordinate click/type/key actions.");
      }
      return this.unsupported("action", action.type, `Action ${action.type} is not mapped for Computer Use MCP.`);
    } catch (error: any) {
      return step("action", `computer-use:${action.type}`, "failed", computerActionDetail(action), error.message || String(error));
    }
  }

  async runAssertion(assertion: BrowserAssertionSpec) {
    if (assertion.type === "urlIncludes") {
      const expected = String(assertion.value || assertion.text || "");
      return this.currentUrl && this.currentUrl.includes(expected)
        ? step("assertion", "computer-use:urlIncludes", "passed", expected)
        : step("assertion", "computer-use:urlIncludes", "failed", expected, `Expected best-effort URL to include "${expected}", got "${this.currentUrl || "unknown"}".`);
    }
    if (assertion.type === "consoleNoErrors" || assertion.type === "networkNoErrors") {
      return this.unsupported("assertion", assertion.type, "Computer Use MCP does not expose console or network telemetry.");
    }
    return this.unsupported("assertion", assertion.type, "Computer Use MCP cannot read DOM/page text; use screenshot evidence or a browser-native provider for this assertion.");
  }

  async readConsoleErrors() {
    return [];
  }

  async readNetworkErrors() {
    return [];
  }

  async captureScreenshot(name: string) {
    const tool = pick(this.tools, [/__screenshot$/]);
    if (!tool) return [];
    return [await this.call(tool, { name })];
  }

  async pageText() {
    return "";
  }
}

export function createMcpBrowserAdapter(tools: string[], call: Caller): McpBrowserAdapter | null {
  const browserTools = tools.filter(tool => /mcp__(playwright|claude-in-chrome|chrome|chrome-devtools|chromedevtools|computer-use)__/.test(tool));
  if (!browserTools.length) return null;
  if (has(browserTools, /mcp__playwright__browser_/)) return new PlaywrightMcpAdapter(browserTools, call);
  if (has(browserTools, /mcp__claude-in-chrome__/)) return new ClaudeChromeAdapter(browserTools, call);
  if (has(browserTools, /mcp__(chrome-devtools|chromedevtools|chrome)__(new_page|navigate_page|take_snapshot|click|fill|evaluate_script)/)) return new ChromeDevtoolsAdapter(browserTools, call);
  if (has(browserTools, /mcp__computer-use__/)) return new ComputerUseAdapter(browserTools, call);
  return null;
}
