// Behavior-freeze split from mcp-adapters.ts (part 2/3).
import {
  BrowserActionSpec,
  BrowserAssertionSpec,
  BrowserExistingSessionProvider,
  BrowserRecoveryEvidence,
  BrowserStepResult,
  NormalizedTestAgentProjectTarget,
} from "../types";
import { compactText, resolveUrl } from "../utils";
import {
  browserNetworkAssertionDetail,
  browserNetworkAssertionHasExpectation,
  browserNetworkAssertionIsNegative,
  findMatchingBrowserNetworkLine,
} from "./network-assertions";
import {
  browserConsoleAssertionDetail,
  browserConsoleAssertionHasExpectation,
  browserConsoleAssertionIsNegative,
  browserConsoleAssertionSettleMs,
  filterBrowserConsoleErrorLines,
  normalizeBrowserConsoleLines,
  waitForAbsentBrowserConsoleLine,
  waitForBrowserConsoleLine,
} from "./console-assertions";
import { isBrowserAriaStateAssertion } from "./aria-state-assertions";
import { browserTargetDetail } from "./semantic-locator";
import {
  browserRecoveryFailureMessage,
  browserRecoveryTrigger,
  BrowserRecoveryTracker,
} from "./recovery";

import {
  Caller,
  McpBrowserAdapter,
  McpBrowserAdapterId,
  McpBrowserSignals,
  assertWithLiveUrl,
  assertWithText,
  cookieActionDetail,
  cookieActionScript,
  emptyLike,
  evaluateActionResult,
  extractTabCount,
  extractTabId,
  extractToolText,
  extractUrlFromObservation,
  isCookieAction,
  isNetworkStateAction,
  isStorageAction,
  pick,
  pressKeyText,
  step,
  storageActionDetail,
  storageActionScript,
  targetInput,
  typedText,
  typedTextDetail,
  waitForMcpUrl,
} from "./mcp-adapters-part-01";

export class PlaywrightMcpAdapter implements McpBrowserAdapter {
  id: McpBrowserAdapterId = "playwright-mcp";
  label = "Playwright MCP";
  currentUrl = "";
  constructor(public tools: string[], private call: Caller) {}

  private async readLiveUrl() {
    const tool = pick(this.tools, [/__browser_evaluate$/]);
    if (!tool) return null;
    const text = extractToolText(await this.call(tool, { function: "() => location.href" }));
    const url = extractUrlFromObservation(text);
    if (url) this.currentUrl = url;
    return url || null;
  }

  async runAction(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number) {
    try {
      if (action.type === "uploadFile") {
        return step("action", "playwright:uploadFile", "failed", "", "Playwright MCP cannot verify local file uploads from TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "dragTo") {
        return step("action", "playwright:dragTo", "failed", "", "Playwright MCP drag/drop is not mapped for TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "doubleClick" || action.type === "rightClick") {
        return step("action", `playwright:${action.type}`, "failed", "", `Playwright MCP ${action.type} is not mapped for TestAgent; use the Playwright provider for this action.`);
      }
      if (action.type === "focus") {
        return step("action", "playwright:focus", "failed", "", "Playwright MCP focus is not mapped for TestAgent; use the Playwright provider for deterministic DOM focus.");
      }
      if (action.type === "setClipboard") {
        return step("action", "playwright:setClipboard", "failed", "", "Playwright MCP clipboard write is not mapped for TestAgent; use the Playwright provider for this action.");
      }
      if (isCookieAction(action)) {
        const tool = pick(this.tools, [/__browser_evaluate$/]);
        if (!tool) throw new Error("Missing browser_evaluate.");
        await this.call(tool, { function: cookieActionScript(action) });
        return step("action", `playwright:${action.type}`, "passed", cookieActionDetail(action));
      }
      if (isStorageAction(action)) {
        const tool = pick(this.tools, [/__browser_evaluate$/]);
        if (!tool) throw new Error("Missing browser_evaluate.");
        await this.call(tool, { function: storageActionScript(action) });
        return step("action", `playwright:${action.type}`, "passed", storageActionDetail(action));
      }
      if (isNetworkStateAction(action)) {
        return step("action", `playwright:${action.type}`, "failed", "", "Playwright MCP does not expose browser context offline/online emulation to TestAgent; use the Playwright provider for this action.");
      }
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
      if (action.type === "typeText") {
        const tool = pick(this.tools, [/__browser_type$/]);
        if (!tool) throw new Error("Missing browser_type.");
        await this.call(tool, targetInput(action));
        return step("action", "playwright:typeText", "passed", typedTextDetail(action));
      }
      if (action.type === "press") {
        const tool = pick(this.tools, [/__browser_press_key$/]);
        if (!tool) throw new Error("Missing browser_press_key.");
        const key = pressKeyText(action);
        await this.call(tool, { key });
        return step("action", "playwright:press", "passed", key);
      }
      if (action.type === "waitForTimeout") {
        const tool = pick(this.tools, [/__browser_wait_for$/]);
        const ms = Math.min(Number(action.value || action.text || defaultTimeout || 1000), defaultTimeout);
        if (tool) await this.call(tool, { time: Math.max(1, Math.ceil(ms / 1000)) });
        else await new Promise(resolve => setTimeout(resolve, ms));
        return step("action", "playwright:waitForTimeout", "passed", `${ms}ms`);
      }
      if (action.type === "waitForUrl") {
        return await waitForMcpUrl("playwright", this.currentUrl, action, defaultTimeout, () => this.readLiveUrl());
      }
      if (action.type === "evaluate") {
        const tool = pick(this.tools, [/__browser_evaluate$/]);
        if (!tool) throw new Error("Missing browser_evaluate.");
        const output = await this.call(tool, { function: String(action.text || action.value || "() => undefined") });
        return evaluateActionResult("playwright", action, output);
      }
      return step("action", `playwright:${action.type}`, "failed", "", `Action ${action.type} is not mapped for Playwright MCP.`);
    } catch (error: any) {
      return step("action", `playwright:${action.type}`, "failed", action.selector || action.text || action.url || "", error.message || String(error));
    }
  }

  async runAssertion(assertion: BrowserAssertionSpec, signals: McpBrowserSignals, defaultTimeout: number) {
    if (assertion.type === "urlEquals" || assertion.type === "urlIncludes" || assertion.type === "urlNotIncludes") {
      return assertWithLiveUrl("playwright", assertion, () => this.readLiveUrl());
    }
    return assertWithText("playwright", assertion, signals, defaultTimeout);
  }

  async readConsoleMessages() {
    const tool = pick(this.tools, [/__browser_console_messages$/, /__read_console_messages$/]);
    if (!tool) return [];
    const text = extractToolText(await this.call(tool, {}));
    return text && !emptyLike(text) ? normalizeBrowserConsoleLines(compactText(text, 4000).split(/\r?\n/)) : [];
  }

  async readConsoleErrors() {
    return filterBrowserConsoleErrorLines(await this.readConsoleMessages());
  }

  async readNetworkErrors() {
    const tool = pick(this.tools, [/__browser_network_requests$/, /__read_network_requests$/]);
    if (!tool) return [];
    const text = extractToolText(await this.call(tool, {}));
    return text && /\b(4\d\d|5\d\d|failed|error)\b/i.test(text) ? [compactText(text, 1000)] : [];
  }

  async readNetworkRequests() {
    const tool = pick(this.tools, [/__browser_network_requests$/, /__read_network_requests$/]);
    if (!tool) return [];
    const text = extractToolText(await this.call(tool, {}));
    return text && !emptyLike(text) ? compactText(text, 4000).split(/\r?\n/).filter(Boolean) : [];
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

export class ClaudeChromeAdapter implements McpBrowserAdapter {
  id: McpBrowserAdapterId = "claude-in-chrome";
  label = "Claude in Chrome";
  currentUrl = "";
  private tabId: number | string | undefined;
  private tabReady = false;
  private tabContextChecked = false;
  private tabCount: number | undefined;
  private createdNewTab = false;
  private recoveryTracker = new BrowserRecoveryTracker("claude-in-chrome");
  constructor(public tools: string[], private call: Caller) {}

  private async readLiveUrl() {
    const tool = pick(this.tools, [/__javascript_tool$/]);
    if (!tool) return null;
    const text = extractToolText(await this.callTabTool(tool, { text: "location.href" }, "observation:url", true));
    const url = extractUrlFromObservation(text);
    if (url) this.currentUrl = url;
    return url || null;
  }

  private async readTabContext(required: boolean, force = false) {
    if (this.tabContextChecked && !force) return;
    const contextTool = pick(this.tools, [/__tabs_context_mcp$/]);
    if (!contextTool) {
      if (required) throw new Error("Existing authenticated Chrome verification requires tabs_context_mcp.");
      return;
    }
    const output = await this.call(contextTool, {});
    this.tabContextChecked = true;
    this.tabCount = extractTabCount(output);
  }

  async prepareExistingSession(url?: string) {
    await this.readTabContext(true);
    if (!pick(this.tools, [/__tabs_create_mcp$/])) {
      throw new Error("Existing authenticated Chrome verification requires tabs_create_mcp so TestAgent can avoid reusing the user's current tab.");
    }
    await this.ensureTab(url);
  }

  existingSessionContextEvidence() {
    return {
      provider: "claude-in-chrome" as const,
      tabContextChecked: this.tabContextChecked,
      ...(this.tabCount !== undefined ? { tabCount: this.tabCount } : {}),
      createdNewTab: this.createdNewTab,
    };
  }

  browserRecoveryEvidence() {
    return this.recoveryTracker.evidence();
  }

  private async ensureTab(url?: string) {
    if (this.tabReady) return this.tabId;
    await this.readTabContext(false);
    const createTool = pick(this.tools, [/__tabs_create_mcp$/]);
    if (createTool) {
      const output = await this.call(createTool, url ? { url } : {});
      this.tabId = extractTabId(output);
      this.tabReady = true;
      this.createdNewTab = true;
    }
    return this.tabId;
  }

  private withTab(input: Record<string, any>) {
    return this.tabId !== undefined ? { ...input, tabId: this.tabId } : input;
  }

  private async recoverTab(
    url?: string,
    onProgress?: (state: { contextRefreshed: boolean; createdNewTab: boolean }) => void,
  ) {
    this.tabId = undefined;
    this.tabReady = false;
    await this.readTabContext(true, true);
    onProgress?.({ contextRefreshed: true, createdNewTab: false });
    await this.ensureTab(url || this.currentUrl);
    if (!this.tabReady) throw new Error("Browser recovery could not create a new tab.");
    onProgress?.({ contextRefreshed: true, createdNewTab: true });
    return { contextRefreshed: true, createdNewTab: true };
  }

  private async callTabTool(
    tool: string,
    input: Record<string, any>,
    operation: string,
    retrySafe: boolean,
    recoveryUrl?: string,
  ) {
    try {
      return await this.call(tool, this.withTab(input));
    } catch (error: any) {
      const trigger = browserRecoveryTrigger(error);
      if (!trigger) throw error;
      if (!retrySafe) {
        this.recoveryTracker.record({
          operation,
          trigger,
          retrySafe: false,
          status: "not_retried",
          contextRefreshed: false,
          createdNewTab: false,
        });
        throw new Error(browserRecoveryFailureMessage(trigger, "not_retried"));
      }
      let contextRefreshed = false;
      let createdNewTab = false;
      try {
        await this.recoverTab(recoveryUrl, recovery => {
          contextRefreshed = recovery.contextRefreshed;
          createdNewTab = recovery.createdNewTab;
        });
        const output = await this.call(tool, this.withTab(input));
        this.recoveryTracker.record({
          operation,
          trigger,
          retrySafe: true,
          status: "recovered",
          contextRefreshed,
          createdNewTab,
        });
        return output;
      } catch {
        this.recoveryTracker.record({
          operation,
          trigger,
          retrySafe: true,
          status: "failed",
          contextRefreshed,
          createdNewTab,
        });
        throw new Error(browserRecoveryFailureMessage(trigger, "failed"));
      }
    }
  }

  async runAction(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number) {
    try {
      if (action.type === "uploadFile") {
        return step("action", "claude-in-chrome:uploadFile", "failed", "", "Claude in Chrome MCP cannot verify local file uploads from TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "dragTo") {
        return step("action", "claude-in-chrome:dragTo", "failed", "", "Claude in Chrome MCP drag/drop is not mapped for TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "doubleClick" || action.type === "rightClick") {
        return step("action", `claude-in-chrome:${action.type}`, "failed", "", `Claude in Chrome MCP ${action.type} is not mapped for TestAgent; use the Playwright provider for this action.`);
      }
      if (action.type === "focus") {
        return step("action", "claude-in-chrome:focus", "failed", "", "Claude in Chrome MCP focus is not mapped for TestAgent; use the Playwright provider for deterministic DOM focus.");
      }
      if (action.type === "setClipboard") {
        return step("action", "claude-in-chrome:setClipboard", "failed", "", "Claude in Chrome MCP clipboard write is not mapped for TestAgent; use the Playwright provider for this action.");
      }
      if (isCookieAction(action)) {
        const tool = pick(this.tools, [/__javascript_tool$/]);
        if (!tool) throw new Error("Missing javascript_tool.");
        await this.callTabTool(tool, { text: cookieActionScript(action) }, `action:${action.type}`, false);
        return step("action", `claude-in-chrome:${action.type}`, "passed", cookieActionDetail(action));
      }
      if (isStorageAction(action)) {
        const tool = pick(this.tools, [/__javascript_tool$/]);
        if (!tool) throw new Error("Missing javascript_tool.");
        await this.callTabTool(tool, { text: storageActionScript(action) }, `action:${action.type}`, false);
        return step("action", `claude-in-chrome:${action.type}`, "passed", storageActionDetail(action));
      }
      if (isNetworkStateAction(action)) {
        return step("action", `claude-in-chrome:${action.type}`, "failed", "", "Claude in Chrome MCP does not expose browser context offline/online emulation to TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "goto") {
        const url = resolveUrl(project.targetUrl, action.url || "");
        await this.ensureTab(url);
        const tool = pick(this.tools, [/__navigate$/]);
        if (tool) await this.callTabTool(tool, { url }, "action:goto", true, url);
        this.currentUrl = url;
        return step("action", "claude-in-chrome:goto", "passed", url);
      }
      if (action.type === "reload") {
        const url = resolveUrl(project.targetUrl, action.url || this.currentUrl || project.targetUrl);
        await this.ensureTab(url);
        const tool = pick(this.tools, [/__navigate$/]);
        if (!tool) throw new Error("Missing navigate tool.");
        if (!url) throw new Error("Cannot reload without a current URL or project targetUrl.");
        await this.callTabTool(tool, { url }, "action:reload", false, url);
        this.currentUrl = url;
        return step("action", "claude-in-chrome:reload", "passed", url);
      }
      if (action.type === "click") {
        const tool = pick(this.tools, [/__computer$/]);
        if (!tool) throw new Error("Missing computer tool.");
        await this.callTabTool(tool, { action: "left_click", ref: action.selector || action.text || action.value }, "action:click", false);
        return step("action", "claude-in-chrome:click", "passed", action.selector || action.text || "");
      }
      if (action.type === "fill") {
        const tool = pick(this.tools, [/__form_input$/, /__computer$/]);
        if (!tool) throw new Error("Missing input tool.");
        const payload = tool.endsWith("__computer")
          ? { action: "type", text: String(action.value ?? action.text ?? "") }
          : targetInput(action);
        await this.callTabTool(tool, payload, "action:fill", false);
        return step("action", "claude-in-chrome:fill", "passed", action.selector || action.text || "");
      }
      if (action.type === "typeText") {
        const tool = pick(this.tools, [/__form_input$/, /__computer$/]);
        if (!tool) throw new Error("Missing input tool.");
        const payload = tool.endsWith("__computer")
          ? { action: "type", text: typedText(action) }
          : targetInput(action);
        await this.callTabTool(tool, payload, "action:typeText", false);
        return step("action", "claude-in-chrome:typeText", "passed", typedTextDetail(action));
      }
      if (action.type === "waitForTimeout") {
        await new Promise(resolve => setTimeout(resolve, Math.min(Number(action.value || action.text || 1000), defaultTimeout)));
        return step("action", "claude-in-chrome:waitForTimeout", "passed");
      }
      if (action.type === "waitForUrl") {
        return await waitForMcpUrl("claude-in-chrome", this.currentUrl, action, defaultTimeout, () => this.readLiveUrl());
      }
      if (action.type === "evaluate") {
        const tool = pick(this.tools, [/__javascript_tool$/]);
        if (!tool) throw new Error("Missing javascript_tool.");
        const output = await this.callTabTool(tool, { text: String(action.text || action.value || "undefined") }, "action:evaluate", false);
        return evaluateActionResult("claude-in-chrome", action, output);
      }
      return step("action", `claude-in-chrome:${action.type}`, "failed", "", `Action ${action.type} is not mapped for Claude in Chrome.`);
    } catch (error: any) {
      return step("action", `claude-in-chrome:${action.type}`, "failed", action.selector || action.text || action.url || "", error.message || String(error));
    }
  }

  async runAssertion(assertion: BrowserAssertionSpec, signals: McpBrowserSignals, defaultTimeout: number) {
    if (assertion.type === "urlEquals" || assertion.type === "urlIncludes" || assertion.type === "urlNotIncludes") {
      return assertWithLiveUrl("claude-in-chrome", assertion, () => this.readLiveUrl());
    }
    return assertWithText("claude-in-chrome", assertion, signals, defaultTimeout);
  }

  async readConsoleMessages() {
    const tool = pick(this.tools, [/__read_console_messages$/]);
    if (!tool) return [];
    const text = extractToolText(await this.callTabTool(tool, {}, "telemetry:console", true));
    return text && !emptyLike(text) ? normalizeBrowserConsoleLines(compactText(text, 4000).split(/\r?\n/)) : [];
  }

  async readConsoleErrors() {
    return filterBrowserConsoleErrorLines(await this.readConsoleMessages());
  }

  async readNetworkErrors() {
    const tool = pick(this.tools, [/__read_network_requests$/]);
    if (!tool) return [];
    const text = extractToolText(await this.callTabTool(tool, {}, "telemetry:network", true));
    return text && /\b(4\d\d|5\d\d|failed|error)\b/i.test(text) ? [compactText(text, 1000)] : [];
  }

  async readNetworkRequests() {
    const tool = pick(this.tools, [/__read_network_requests$/]);
    if (!tool) return [];
    const text = extractToolText(await this.callTabTool(tool, {}, "telemetry:network", true));
    return text && !emptyLike(text) ? compactText(text, 4000).split(/\r?\n/).filter(Boolean) : [];
  }

  async captureScreenshot(name: string) {
    const tool = pick(this.tools, [/__gif_creator$/]);
    if (!tool) return [];
    return [await this.callTabTool(tool, { action: "capture_frame", name }, "evidence:screenshot", true)];
  }

  async pageText() {
    const tool = pick(this.tools, [/__get_page_text$/, /__read_page$/]);
    if (!tool) return "";
    return extractToolText(await this.callTabTool(tool, {}, "observation:page_text", true));
  }
}

export class ChromeDevtoolsAdapter implements McpBrowserAdapter {
  id: McpBrowserAdapterId = "chrome-devtools";
  label = "Chrome DevTools MCP";
  currentUrl = "";
  private tabContextChecked = false;
  private tabCount: number | undefined;
  private createdNewTab = false;
  private recoveryTracker = new BrowserRecoveryTracker("chrome-devtools");
  constructor(public tools: string[], private call: Caller) {}

  private async readLiveUrl() {
    const tool = pick(this.tools, [/__evaluate_script$/]);
    if (!tool) return null;
    const text = extractToolText(await this.callPageTool(tool, { function: "() => location.href" }, "observation:url", true));
    const url = extractUrlFromObservation(text);
    if (url) this.currentUrl = url;
    return url || null;
  }

  private async readPageContext() {
    const listTool = pick(this.tools, [/__list_pages$/]);
    if (!listTool) throw new Error("Existing authenticated Chrome DevTools verification requires list_pages.");
    const output = await this.call(listTool, {});
    this.tabContextChecked = true;
    this.tabCount = extractTabCount(output);
  }

  private async createPage(url?: string) {
    if (!pick(this.tools, [/__new_page$/])) {
      throw new Error("Existing authenticated Chrome DevTools verification requires new_page so TestAgent can avoid reusing the user's current page.");
    }
    await this.call(pick(this.tools, [/__new_page$/])!, url ? { url } : {});
    this.createdNewTab = true;
    this.currentUrl = url || "";
  }

  async prepareExistingSession(url?: string) {
    await this.readPageContext();
    await this.createPage(url);
  }

  existingSessionContextEvidence() {
    return {
      provider: "chrome-devtools" as const,
      tabContextChecked: this.tabContextChecked,
      ...(this.tabCount !== undefined ? { tabCount: this.tabCount } : {}),
      createdNewTab: this.createdNewTab,
    };
  }

  browserRecoveryEvidence() {
    return this.recoveryTracker.evidence();
  }

  private async recoverPage(
    url?: string,
    onProgress?: (state: { contextRefreshed: boolean; createdNewTab: boolean }) => void,
  ) {
    await this.readPageContext();
    onProgress?.({ contextRefreshed: true, createdNewTab: false });
    await this.createPage(url || this.currentUrl);
    onProgress?.({ contextRefreshed: true, createdNewTab: true });
    return { contextRefreshed: true, createdNewTab: true };
  }

  private async callPageTool(
    tool: string,
    input: Record<string, any>,
    operation: string,
    retrySafe: boolean,
    recoveryUrl?: string,
  ) {
    try {
      return await this.call(tool, input);
    } catch (error: any) {
      const trigger = browserRecoveryTrigger(error);
      if (!trigger) throw error;
      if (!retrySafe) {
        this.recoveryTracker.record({
          operation,
          trigger,
          retrySafe: false,
          status: "not_retried",
          contextRefreshed: false,
          createdNewTab: false,
        });
        throw new Error(browserRecoveryFailureMessage(trigger, "not_retried"));
      }
      let contextRefreshed = false;
      let createdNewTab = false;
      try {
        await this.recoverPage(recoveryUrl, recovery => {
          contextRefreshed = recovery.contextRefreshed;
          createdNewTab = recovery.createdNewTab;
        });
        const output = await this.call(tool, input);
        this.recoveryTracker.record({
          operation,
          trigger,
          retrySafe: true,
          status: "recovered",
          contextRefreshed,
          createdNewTab,
        });
        return output;
      } catch {
        this.recoveryTracker.record({
          operation,
          trigger,
          retrySafe: true,
          status: "failed",
          contextRefreshed,
          createdNewTab,
        });
        throw new Error(browserRecoveryFailureMessage(trigger, "failed"));
      }
    }
  }

  async runAction(project: NormalizedTestAgentProjectTarget, action: BrowserActionSpec, defaultTimeout: number) {
    try {
      if (action.type === "uploadFile") {
        return step("action", "chrome-devtools:uploadFile", "failed", "", "Chrome DevTools MCP cannot verify local file uploads from TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "dragTo") {
        return step("action", "chrome-devtools:dragTo", "failed", "", "Chrome DevTools MCP drag/drop is not mapped for TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "doubleClick" || action.type === "rightClick") {
        return step("action", `chrome-devtools:${action.type}`, "failed", "", `Chrome DevTools MCP ${action.type} is not mapped for TestAgent; use the Playwright provider for this action.`);
      }
      if (action.type === "focus") {
        return step("action", "chrome-devtools:focus", "failed", "", "Chrome DevTools MCP focus is not mapped for TestAgent; use the Playwright provider for deterministic DOM focus.");
      }
      if (action.type === "setClipboard") {
        return step("action", "chrome-devtools:setClipboard", "failed", "", "Chrome DevTools MCP clipboard write is not mapped for TestAgent; use the Playwright provider for this action.");
      }
      if (isCookieAction(action)) {
        const tool = pick(this.tools, [/__evaluate_script$/]);
        if (!tool) throw new Error("Missing evaluate_script.");
        await this.callPageTool(tool, { function: cookieActionScript(action) }, `action:${action.type}`, false);
        return step("action", `chrome-devtools:${action.type}`, "passed", cookieActionDetail(action));
      }
      if (isStorageAction(action)) {
        const tool = pick(this.tools, [/__evaluate_script$/]);
        if (!tool) throw new Error("Missing evaluate_script.");
        await this.callPageTool(tool, { function: storageActionScript(action) }, `action:${action.type}`, false);
        return step("action", `chrome-devtools:${action.type}`, "passed", storageActionDetail(action));
      }
      if (isNetworkStateAction(action)) {
        return step("action", `chrome-devtools:${action.type}`, "failed", "", "Chrome DevTools MCP offline/online emulation is not mapped for TestAgent; use the Playwright provider for this action.");
      }
      if (action.type === "goto") {
        const url = resolveUrl(project.targetUrl, action.url || "");
        const createTool = pick(this.tools, [/__new_page$/]);
        const navTool = pick(this.tools, [/__navigate_page$/]);
        if (!this.createdNewTab && createTool) {
          await this.call(createTool, { url });
          this.createdNewTab = true;
        }
        else if (navTool && this.currentUrl !== url) await this.callPageTool(navTool, { url }, "action:goto", true, url);
        else if (this.currentUrl !== url) throw new Error("Missing navigate_page.");
        this.currentUrl = url;
        return step("action", "chrome-devtools:goto", "passed", url);
      }
      if (action.type === "reload") {
        const url = resolveUrl(project.targetUrl, action.url || this.currentUrl || project.targetUrl);
        const navTool = pick(this.tools, [/__navigate_page$/]);
        if (!navTool) throw new Error("Missing navigate_page.");
        if (!url) throw new Error("Cannot reload without a current URL or project targetUrl.");
        await this.callPageTool(navTool, { url }, "action:reload", false, url);
        this.currentUrl = url;
        return step("action", "chrome-devtools:reload", "passed", url);
      }
      if (action.type === "click") {
        const tool = pick(this.tools, [/__click$/]);
        if (!tool) throw new Error("Missing click tool.");
        await this.callPageTool(tool, targetInput(action), "action:click", false);
        return step("action", "chrome-devtools:click", "passed", action.selector || action.text || "");
      }
      if (action.type === "fill") {
        const tool = pick(this.tools, [/__fill$/, /__type$/]);
        if (!tool) throw new Error("Missing fill/type tool.");
        await this.callPageTool(tool, targetInput(action), "action:fill", false);
        return step("action", "chrome-devtools:fill", "passed", action.selector || action.text || "");
      }
      if (action.type === "typeText") {
        const tool = pick(this.tools, [/__type$/]);
        if (!tool) throw new Error("Missing type tool.");
        await this.callPageTool(tool, targetInput(action), "action:typeText", false);
        return step("action", "chrome-devtools:typeText", "passed", typedTextDetail(action));
      }
      if (action.type === "evaluate") {
        const tool = pick(this.tools, [/__evaluate_script$/]);
        if (!tool) throw new Error("Missing evaluate_script.");
        const output = await this.callPageTool(tool, { function: String(action.text || action.value || "() => undefined") }, "action:evaluate", false);
        return evaluateActionResult("chrome-devtools", action, output);
      }
      if (action.type === "waitForTimeout") {
        await new Promise(resolve => setTimeout(resolve, Math.min(Number(action.value || action.text || 1000), defaultTimeout)));
        return step("action", "chrome-devtools:waitForTimeout", "passed");
      }
      if (action.type === "waitForUrl") {
        return await waitForMcpUrl("chrome-devtools", this.currentUrl, action, defaultTimeout, () => this.readLiveUrl());
      }
      return step("action", `chrome-devtools:${action.type}`, "failed", "", `Action ${action.type} is not mapped for Chrome DevTools MCP.`);
    } catch (error: any) {
      return step("action", `chrome-devtools:${action.type}`, "failed", action.selector || action.text || action.url || "", error.message || String(error));
    }
  }

  async runAssertion(assertion: BrowserAssertionSpec, signals: McpBrowserSignals, defaultTimeout: number) {
    if (assertion.type === "urlEquals" || assertion.type === "urlIncludes" || assertion.type === "urlNotIncludes") {
      return assertWithLiveUrl("chrome-devtools", assertion, () => this.readLiveUrl());
    }
    return assertWithText("chrome-devtools", assertion, signals, defaultTimeout);
  }

  async readConsoleMessages() {
    const tool = pick(this.tools, [/__list_console_messages$/]);
    if (!tool) return [];
    const text = extractToolText(await this.callPageTool(tool, {}, "telemetry:console", true));
    return text && !emptyLike(text) ? normalizeBrowserConsoleLines(compactText(text, 4000).split(/\r?\n/)) : [];
  }

  async readConsoleErrors() {
    return filterBrowserConsoleErrorLines(await this.readConsoleMessages());
  }

  async readNetworkErrors() {
    const tool = pick(this.tools, [/__list_network_requests$/]);
    if (!tool) return [];
    const text = extractToolText(await this.callPageTool(tool, {}, "telemetry:network", true));
    return text && /\b(4\d\d|5\d\d|failed|error)\b/i.test(text) ? [compactText(text, 1000)] : [];
  }

  async readNetworkRequests() {
    const tool = pick(this.tools, [/__list_network_requests$/]);
    if (!tool) return [];
    const text = extractToolText(await this.callPageTool(tool, {}, "telemetry:network", true));
    return text && !emptyLike(text) ? compactText(text, 4000).split(/\r?\n/).filter(Boolean) : [];
  }

  async captureScreenshot(name: string) {
    const tool = pick(this.tools, [/__take_screenshot$/]);
    if (!tool) return [];
    return [await this.callPageTool(tool, { filePath: name }, "evidence:screenshot", true)];
  }

  async pageText() {
    const tool = pick(this.tools, [/__take_snapshot$/]);
    if (!tool) return "";
    return extractToolText(await this.callPageTool(tool, {}, "observation:page_text", true));
  }
}
