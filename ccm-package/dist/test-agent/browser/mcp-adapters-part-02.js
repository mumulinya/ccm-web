"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChromeDevtoolsAdapter = exports.ClaudeChromeAdapter = exports.PlaywrightMcpAdapter = void 0;
const utils_1 = require("../utils");
const console_assertions_1 = require("./console-assertions");
const recovery_1 = require("./recovery");
const mcp_adapters_part_01_1 = require("./mcp-adapters-part-01");
class PlaywrightMcpAdapter {
    tools;
    call;
    id = "playwright-mcp";
    label = "Playwright MCP";
    currentUrl = "";
    constructor(tools, call) {
        this.tools = tools;
        this.call = call;
    }
    async readLiveUrl() {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__browser_evaluate$/]);
        if (!tool)
            return null;
        const text = (0, mcp_adapters_part_01_1.extractToolText)(await this.call(tool, { function: "() => location.href" }));
        const url = (0, mcp_adapters_part_01_1.extractUrlFromObservation)(text);
        if (url)
            this.currentUrl = url;
        return url || null;
    }
    async runAction(project, action, defaultTimeout) {
        try {
            if (action.type === "uploadFile") {
                return (0, mcp_adapters_part_01_1.step)("action", "playwright:uploadFile", "failed", "", "Playwright MCP cannot verify local file uploads from TestAgent; use the Playwright provider for this action.");
            }
            if (action.type === "dragTo") {
                return (0, mcp_adapters_part_01_1.step)("action", "playwright:dragTo", "failed", "", "Playwright MCP drag/drop is not mapped for TestAgent; use the Playwright provider for this action.");
            }
            if (action.type === "doubleClick" || action.type === "rightClick") {
                return (0, mcp_adapters_part_01_1.step)("action", `playwright:${action.type}`, "failed", "", `Playwright MCP ${action.type} is not mapped for TestAgent; use the Playwright provider for this action.`);
            }
            if (action.type === "focus") {
                return (0, mcp_adapters_part_01_1.step)("action", "playwright:focus", "failed", "", "Playwright MCP focus is not mapped for TestAgent; use the Playwright provider for deterministic DOM focus.");
            }
            if (action.type === "setClipboard") {
                return (0, mcp_adapters_part_01_1.step)("action", "playwright:setClipboard", "failed", "", "Playwright MCP clipboard write is not mapped for TestAgent; use the Playwright provider for this action.");
            }
            if ((0, mcp_adapters_part_01_1.isCookieAction)(action)) {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__browser_evaluate$/]);
                if (!tool)
                    throw new Error("Missing browser_evaluate.");
                await this.call(tool, { function: (0, mcp_adapters_part_01_1.cookieActionScript)(action) });
                return (0, mcp_adapters_part_01_1.step)("action", `playwright:${action.type}`, "passed", (0, mcp_adapters_part_01_1.cookieActionDetail)(action));
            }
            if ((0, mcp_adapters_part_01_1.isStorageAction)(action)) {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__browser_evaluate$/]);
                if (!tool)
                    throw new Error("Missing browser_evaluate.");
                await this.call(tool, { function: (0, mcp_adapters_part_01_1.storageActionScript)(action) });
                return (0, mcp_adapters_part_01_1.step)("action", `playwright:${action.type}`, "passed", (0, mcp_adapters_part_01_1.storageActionDetail)(action));
            }
            if ((0, mcp_adapters_part_01_1.isNetworkStateAction)(action)) {
                return (0, mcp_adapters_part_01_1.step)("action", `playwright:${action.type}`, "failed", "", "Playwright MCP does not expose browser context offline/online emulation to TestAgent; use the Playwright provider for this action.");
            }
            if (action.type === "goto") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__browser_navigate$/]);
                if (!tool)
                    throw new Error("Missing browser_navigate.");
                const url = (0, utils_1.resolveUrl)(project.targetUrl, action.url || "");
                await this.call(tool, { url });
                this.currentUrl = url;
                return (0, mcp_adapters_part_01_1.step)("action", "playwright:goto", "passed", url);
            }
            if (action.type === "reload") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__browser_navigate$/]);
                const url = (0, utils_1.resolveUrl)(project.targetUrl, action.url || this.currentUrl || project.targetUrl);
                if (!tool)
                    throw new Error("Missing browser_navigate.");
                if (!url)
                    throw new Error("Cannot reload without a current URL or project targetUrl.");
                await this.call(tool, { url });
                this.currentUrl = url;
                return (0, mcp_adapters_part_01_1.step)("action", "playwright:reload", "passed", url);
            }
            if (action.type === "click") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__browser_click$/]);
                if (!tool)
                    throw new Error("Missing browser_click.");
                await this.call(tool, (0, mcp_adapters_part_01_1.targetInput)(action));
                return (0, mcp_adapters_part_01_1.step)("action", "playwright:click", "passed", action.selector || action.text || "");
            }
            if (action.type === "fill") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__browser_type$/]);
                if (!tool)
                    throw new Error("Missing browser_type.");
                await this.call(tool, (0, mcp_adapters_part_01_1.targetInput)(action));
                return (0, mcp_adapters_part_01_1.step)("action", "playwright:fill", "passed", action.selector || action.text || "");
            }
            if (action.type === "typeText") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__browser_type$/]);
                if (!tool)
                    throw new Error("Missing browser_type.");
                await this.call(tool, (0, mcp_adapters_part_01_1.targetInput)(action));
                return (0, mcp_adapters_part_01_1.step)("action", "playwright:typeText", "passed", (0, mcp_adapters_part_01_1.typedTextDetail)(action));
            }
            if (action.type === "press") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__browser_press_key$/]);
                if (!tool)
                    throw new Error("Missing browser_press_key.");
                const key = (0, mcp_adapters_part_01_1.pressKeyText)(action);
                await this.call(tool, { key });
                return (0, mcp_adapters_part_01_1.step)("action", "playwright:press", "passed", key);
            }
            if (action.type === "waitForTimeout") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__browser_wait_for$/]);
                const ms = Math.min(Number(action.value || action.text || defaultTimeout || 1000), defaultTimeout);
                if (tool)
                    await this.call(tool, { time: Math.max(1, Math.ceil(ms / 1000)) });
                else
                    await new Promise(resolve => setTimeout(resolve, ms));
                return (0, mcp_adapters_part_01_1.step)("action", "playwright:waitForTimeout", "passed", `${ms}ms`);
            }
            if (action.type === "waitForUrl") {
                return await (0, mcp_adapters_part_01_1.waitForMcpUrl)("playwright", this.currentUrl, action, defaultTimeout, () => this.readLiveUrl());
            }
            if (action.type === "evaluate") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__browser_evaluate$/]);
                if (!tool)
                    throw new Error("Missing browser_evaluate.");
                const output = await this.call(tool, { function: String(action.text || action.value || "() => undefined") });
                return (0, mcp_adapters_part_01_1.evaluateActionResult)("playwright", action, output);
            }
            return (0, mcp_adapters_part_01_1.step)("action", `playwright:${action.type}`, "failed", "", `Action ${action.type} is not mapped for Playwright MCP.`);
        }
        catch (error) {
            return (0, mcp_adapters_part_01_1.step)("action", `playwright:${action.type}`, "failed", action.selector || action.text || action.url || "", error.message || String(error));
        }
    }
    async runAssertion(assertion, signals, defaultTimeout) {
        if (assertion.type === "urlEquals" || assertion.type === "urlIncludes" || assertion.type === "urlNotIncludes") {
            return (0, mcp_adapters_part_01_1.assertWithLiveUrl)("playwright", assertion, () => this.readLiveUrl());
        }
        return (0, mcp_adapters_part_01_1.assertWithText)("playwright", assertion, signals, defaultTimeout);
    }
    async readConsoleMessages() {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__browser_console_messages$/, /__read_console_messages$/]);
        if (!tool)
            return [];
        const text = (0, mcp_adapters_part_01_1.extractToolText)(await this.call(tool, {}));
        return text && !(0, mcp_adapters_part_01_1.emptyLike)(text) ? (0, console_assertions_1.normalizeBrowserConsoleLines)((0, utils_1.compactText)(text, 4000).split(/\r?\n/)) : [];
    }
    async readConsoleErrors() {
        return (0, console_assertions_1.filterBrowserConsoleErrorLines)(await this.readConsoleMessages());
    }
    async readNetworkErrors() {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__browser_network_requests$/, /__read_network_requests$/]);
        if (!tool)
            return [];
        const text = (0, mcp_adapters_part_01_1.extractToolText)(await this.call(tool, {}));
        return text && /\b(4\d\d|5\d\d|failed|error)\b/i.test(text) ? [(0, utils_1.compactText)(text, 1000)] : [];
    }
    async readNetworkRequests() {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__browser_network_requests$/, /__read_network_requests$/]);
        if (!tool)
            return [];
        const text = (0, mcp_adapters_part_01_1.extractToolText)(await this.call(tool, {}));
        return text && !(0, mcp_adapters_part_01_1.emptyLike)(text) ? (0, utils_1.compactText)(text, 4000).split(/\r?\n/).filter(Boolean) : [];
    }
    async captureScreenshot(name) {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__browser_take_screenshot$/]);
        if (!tool)
            return [];
        return [await this.call(tool, { filename: name, fullPage: true })];
    }
    async pageText() {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__browser_snapshot$/]);
        if (!tool)
            return "";
        return (0, mcp_adapters_part_01_1.extractToolText)(await this.call(tool, {}));
    }
}
exports.PlaywrightMcpAdapter = PlaywrightMcpAdapter;
class ClaudeChromeAdapter {
    tools;
    call;
    id = "claude-in-chrome";
    label = "Claude in Chrome";
    currentUrl = "";
    tabId;
    tabReady = false;
    tabContextChecked = false;
    tabCount;
    createdNewTab = false;
    recoveryTracker = new recovery_1.BrowserRecoveryTracker("claude-in-chrome");
    constructor(tools, call) {
        this.tools = tools;
        this.call = call;
    }
    async readLiveUrl() {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__javascript_tool$/]);
        if (!tool)
            return null;
        const text = (0, mcp_adapters_part_01_1.extractToolText)(await this.callTabTool(tool, { text: "location.href" }, "observation:url", true));
        const url = (0, mcp_adapters_part_01_1.extractUrlFromObservation)(text);
        if (url)
            this.currentUrl = url;
        return url || null;
    }
    async readTabContext(required, force = false) {
        if (this.tabContextChecked && !force)
            return;
        const contextTool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__tabs_context_mcp$/]);
        if (!contextTool) {
            if (required)
                throw new Error("Existing authenticated Chrome verification requires tabs_context_mcp.");
            return;
        }
        const output = await this.call(contextTool, {});
        this.tabContextChecked = true;
        this.tabCount = (0, mcp_adapters_part_01_1.extractTabCount)(output);
    }
    async prepareExistingSession(url) {
        await this.readTabContext(true);
        if (!(0, mcp_adapters_part_01_1.pick)(this.tools, [/__tabs_create_mcp$/])) {
            throw new Error("Existing authenticated Chrome verification requires tabs_create_mcp so TestAgent can avoid reusing the user's current tab.");
        }
        await this.ensureTab(url);
    }
    existingSessionContextEvidence() {
        return {
            provider: "claude-in-chrome",
            tabContextChecked: this.tabContextChecked,
            ...(this.tabCount !== undefined ? { tabCount: this.tabCount } : {}),
            createdNewTab: this.createdNewTab,
        };
    }
    browserRecoveryEvidence() {
        return this.recoveryTracker.evidence();
    }
    async ensureTab(url) {
        if (this.tabReady)
            return this.tabId;
        await this.readTabContext(false);
        const createTool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__tabs_create_mcp$/]);
        if (createTool) {
            const output = await this.call(createTool, url ? { url } : {});
            this.tabId = (0, mcp_adapters_part_01_1.extractTabId)(output);
            this.tabReady = true;
            this.createdNewTab = true;
        }
        return this.tabId;
    }
    withTab(input) {
        return this.tabId !== undefined ? { ...input, tabId: this.tabId } : input;
    }
    async recoverTab(url, onProgress) {
        this.tabId = undefined;
        this.tabReady = false;
        await this.readTabContext(true, true);
        onProgress?.({ contextRefreshed: true, createdNewTab: false });
        await this.ensureTab(url || this.currentUrl);
        if (!this.tabReady)
            throw new Error("Browser recovery could not create a new tab.");
        onProgress?.({ contextRefreshed: true, createdNewTab: true });
        return { contextRefreshed: true, createdNewTab: true };
    }
    async callTabTool(tool, input, operation, retrySafe, recoveryUrl) {
        try {
            return await this.call(tool, this.withTab(input));
        }
        catch (error) {
            const trigger = (0, recovery_1.browserRecoveryTrigger)(error);
            if (!trigger)
                throw error;
            if (!retrySafe) {
                this.recoveryTracker.record({
                    operation,
                    trigger,
                    retrySafe: false,
                    status: "not_retried",
                    contextRefreshed: false,
                    createdNewTab: false,
                });
                throw new Error((0, recovery_1.browserRecoveryFailureMessage)(trigger, "not_retried"));
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
            }
            catch {
                this.recoveryTracker.record({
                    operation,
                    trigger,
                    retrySafe: true,
                    status: "failed",
                    contextRefreshed,
                    createdNewTab,
                });
                throw new Error((0, recovery_1.browserRecoveryFailureMessage)(trigger, "failed"));
            }
        }
    }
    async runAction(project, action, defaultTimeout) {
        try {
            if (action.type === "uploadFile") {
                return (0, mcp_adapters_part_01_1.step)("action", "claude-in-chrome:uploadFile", "failed", "", "Claude in Chrome MCP cannot verify local file uploads from TestAgent; use the Playwright provider for this action.");
            }
            if (action.type === "dragTo") {
                return (0, mcp_adapters_part_01_1.step)("action", "claude-in-chrome:dragTo", "failed", "", "Claude in Chrome MCP drag/drop is not mapped for TestAgent; use the Playwright provider for this action.");
            }
            if (action.type === "doubleClick" || action.type === "rightClick") {
                return (0, mcp_adapters_part_01_1.step)("action", `claude-in-chrome:${action.type}`, "failed", "", `Claude in Chrome MCP ${action.type} is not mapped for TestAgent; use the Playwright provider for this action.`);
            }
            if (action.type === "focus") {
                return (0, mcp_adapters_part_01_1.step)("action", "claude-in-chrome:focus", "failed", "", "Claude in Chrome MCP focus is not mapped for TestAgent; use the Playwright provider for deterministic DOM focus.");
            }
            if (action.type === "setClipboard") {
                return (0, mcp_adapters_part_01_1.step)("action", "claude-in-chrome:setClipboard", "failed", "", "Claude in Chrome MCP clipboard write is not mapped for TestAgent; use the Playwright provider for this action.");
            }
            if ((0, mcp_adapters_part_01_1.isCookieAction)(action)) {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__javascript_tool$/]);
                if (!tool)
                    throw new Error("Missing javascript_tool.");
                await this.callTabTool(tool, { text: (0, mcp_adapters_part_01_1.cookieActionScript)(action) }, `action:${action.type}`, false);
                return (0, mcp_adapters_part_01_1.step)("action", `claude-in-chrome:${action.type}`, "passed", (0, mcp_adapters_part_01_1.cookieActionDetail)(action));
            }
            if ((0, mcp_adapters_part_01_1.isStorageAction)(action)) {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__javascript_tool$/]);
                if (!tool)
                    throw new Error("Missing javascript_tool.");
                await this.callTabTool(tool, { text: (0, mcp_adapters_part_01_1.storageActionScript)(action) }, `action:${action.type}`, false);
                return (0, mcp_adapters_part_01_1.step)("action", `claude-in-chrome:${action.type}`, "passed", (0, mcp_adapters_part_01_1.storageActionDetail)(action));
            }
            if ((0, mcp_adapters_part_01_1.isNetworkStateAction)(action)) {
                return (0, mcp_adapters_part_01_1.step)("action", `claude-in-chrome:${action.type}`, "failed", "", "Claude in Chrome MCP does not expose browser context offline/online emulation to TestAgent; use the Playwright provider for this action.");
            }
            if (action.type === "goto") {
                const url = (0, utils_1.resolveUrl)(project.targetUrl, action.url || "");
                await this.ensureTab(url);
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__navigate$/]);
                if (tool)
                    await this.callTabTool(tool, { url }, "action:goto", true, url);
                this.currentUrl = url;
                return (0, mcp_adapters_part_01_1.step)("action", "claude-in-chrome:goto", "passed", url);
            }
            if (action.type === "reload") {
                const url = (0, utils_1.resolveUrl)(project.targetUrl, action.url || this.currentUrl || project.targetUrl);
                await this.ensureTab(url);
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__navigate$/]);
                if (!tool)
                    throw new Error("Missing navigate tool.");
                if (!url)
                    throw new Error("Cannot reload without a current URL or project targetUrl.");
                await this.callTabTool(tool, { url }, "action:reload", false, url);
                this.currentUrl = url;
                return (0, mcp_adapters_part_01_1.step)("action", "claude-in-chrome:reload", "passed", url);
            }
            if (action.type === "click") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__computer$/]);
                if (!tool)
                    throw new Error("Missing computer tool.");
                await this.callTabTool(tool, { action: "left_click", ref: action.selector || action.text || action.value }, "action:click", false);
                return (0, mcp_adapters_part_01_1.step)("action", "claude-in-chrome:click", "passed", action.selector || action.text || "");
            }
            if (action.type === "fill") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__form_input$/, /__computer$/]);
                if (!tool)
                    throw new Error("Missing input tool.");
                const payload = tool.endsWith("__computer")
                    ? { action: "type", text: String(action.value ?? action.text ?? "") }
                    : (0, mcp_adapters_part_01_1.targetInput)(action);
                await this.callTabTool(tool, payload, "action:fill", false);
                return (0, mcp_adapters_part_01_1.step)("action", "claude-in-chrome:fill", "passed", action.selector || action.text || "");
            }
            if (action.type === "typeText") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__form_input$/, /__computer$/]);
                if (!tool)
                    throw new Error("Missing input tool.");
                const payload = tool.endsWith("__computer")
                    ? { action: "type", text: (0, mcp_adapters_part_01_1.typedText)(action) }
                    : (0, mcp_adapters_part_01_1.targetInput)(action);
                await this.callTabTool(tool, payload, "action:typeText", false);
                return (0, mcp_adapters_part_01_1.step)("action", "claude-in-chrome:typeText", "passed", (0, mcp_adapters_part_01_1.typedTextDetail)(action));
            }
            if (action.type === "waitForTimeout") {
                await new Promise(resolve => setTimeout(resolve, Math.min(Number(action.value || action.text || 1000), defaultTimeout)));
                return (0, mcp_adapters_part_01_1.step)("action", "claude-in-chrome:waitForTimeout", "passed");
            }
            if (action.type === "waitForUrl") {
                return await (0, mcp_adapters_part_01_1.waitForMcpUrl)("claude-in-chrome", this.currentUrl, action, defaultTimeout, () => this.readLiveUrl());
            }
            if (action.type === "evaluate") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__javascript_tool$/]);
                if (!tool)
                    throw new Error("Missing javascript_tool.");
                const output = await this.callTabTool(tool, { text: String(action.text || action.value || "undefined") }, "action:evaluate", false);
                return (0, mcp_adapters_part_01_1.evaluateActionResult)("claude-in-chrome", action, output);
            }
            return (0, mcp_adapters_part_01_1.step)("action", `claude-in-chrome:${action.type}`, "failed", "", `Action ${action.type} is not mapped for Claude in Chrome.`);
        }
        catch (error) {
            return (0, mcp_adapters_part_01_1.step)("action", `claude-in-chrome:${action.type}`, "failed", action.selector || action.text || action.url || "", error.message || String(error));
        }
    }
    async runAssertion(assertion, signals, defaultTimeout) {
        if (assertion.type === "urlEquals" || assertion.type === "urlIncludes" || assertion.type === "urlNotIncludes") {
            return (0, mcp_adapters_part_01_1.assertWithLiveUrl)("claude-in-chrome", assertion, () => this.readLiveUrl());
        }
        return (0, mcp_adapters_part_01_1.assertWithText)("claude-in-chrome", assertion, signals, defaultTimeout);
    }
    async readConsoleMessages() {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__read_console_messages$/]);
        if (!tool)
            return [];
        const text = (0, mcp_adapters_part_01_1.extractToolText)(await this.callTabTool(tool, {}, "telemetry:console", true));
        return text && !(0, mcp_adapters_part_01_1.emptyLike)(text) ? (0, console_assertions_1.normalizeBrowserConsoleLines)((0, utils_1.compactText)(text, 4000).split(/\r?\n/)) : [];
    }
    async readConsoleErrors() {
        return (0, console_assertions_1.filterBrowserConsoleErrorLines)(await this.readConsoleMessages());
    }
    async readNetworkErrors() {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__read_network_requests$/]);
        if (!tool)
            return [];
        const text = (0, mcp_adapters_part_01_1.extractToolText)(await this.callTabTool(tool, {}, "telemetry:network", true));
        return text && /\b(4\d\d|5\d\d|failed|error)\b/i.test(text) ? [(0, utils_1.compactText)(text, 1000)] : [];
    }
    async readNetworkRequests() {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__read_network_requests$/]);
        if (!tool)
            return [];
        const text = (0, mcp_adapters_part_01_1.extractToolText)(await this.callTabTool(tool, {}, "telemetry:network", true));
        return text && !(0, mcp_adapters_part_01_1.emptyLike)(text) ? (0, utils_1.compactText)(text, 4000).split(/\r?\n/).filter(Boolean) : [];
    }
    async captureScreenshot(name) {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__gif_creator$/]);
        if (!tool)
            return [];
        return [await this.callTabTool(tool, { action: "capture_frame", name }, "evidence:screenshot", true)];
    }
    async pageText() {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__get_page_text$/, /__read_page$/]);
        if (!tool)
            return "";
        return (0, mcp_adapters_part_01_1.extractToolText)(await this.callTabTool(tool, {}, "observation:page_text", true));
    }
}
exports.ClaudeChromeAdapter = ClaudeChromeAdapter;
class ChromeDevtoolsAdapter {
    tools;
    call;
    id = "chrome-devtools";
    label = "Chrome DevTools MCP";
    currentUrl = "";
    tabContextChecked = false;
    tabCount;
    createdNewTab = false;
    recoveryTracker = new recovery_1.BrowserRecoveryTracker("chrome-devtools");
    constructor(tools, call) {
        this.tools = tools;
        this.call = call;
    }
    async readLiveUrl() {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__evaluate_script$/]);
        if (!tool)
            return null;
        const text = (0, mcp_adapters_part_01_1.extractToolText)(await this.callPageTool(tool, { function: "() => location.href" }, "observation:url", true));
        const url = (0, mcp_adapters_part_01_1.extractUrlFromObservation)(text);
        if (url)
            this.currentUrl = url;
        return url || null;
    }
    async readPageContext() {
        const listTool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__list_pages$/]);
        if (!listTool)
            throw new Error("Existing authenticated Chrome DevTools verification requires list_pages.");
        const output = await this.call(listTool, {});
        this.tabContextChecked = true;
        this.tabCount = (0, mcp_adapters_part_01_1.extractTabCount)(output);
    }
    async createPage(url) {
        if (!(0, mcp_adapters_part_01_1.pick)(this.tools, [/__new_page$/])) {
            throw new Error("Existing authenticated Chrome DevTools verification requires new_page so TestAgent can avoid reusing the user's current page.");
        }
        await this.call((0, mcp_adapters_part_01_1.pick)(this.tools, [/__new_page$/]), url ? { url } : {});
        this.createdNewTab = true;
        this.currentUrl = url || "";
    }
    async prepareExistingSession(url) {
        await this.readPageContext();
        await this.createPage(url);
    }
    existingSessionContextEvidence() {
        return {
            provider: "chrome-devtools",
            tabContextChecked: this.tabContextChecked,
            ...(this.tabCount !== undefined ? { tabCount: this.tabCount } : {}),
            createdNewTab: this.createdNewTab,
        };
    }
    browserRecoveryEvidence() {
        return this.recoveryTracker.evidence();
    }
    async recoverPage(url, onProgress) {
        await this.readPageContext();
        onProgress?.({ contextRefreshed: true, createdNewTab: false });
        await this.createPage(url || this.currentUrl);
        onProgress?.({ contextRefreshed: true, createdNewTab: true });
        return { contextRefreshed: true, createdNewTab: true };
    }
    async callPageTool(tool, input, operation, retrySafe, recoveryUrl) {
        try {
            return await this.call(tool, input);
        }
        catch (error) {
            const trigger = (0, recovery_1.browserRecoveryTrigger)(error);
            if (!trigger)
                throw error;
            if (!retrySafe) {
                this.recoveryTracker.record({
                    operation,
                    trigger,
                    retrySafe: false,
                    status: "not_retried",
                    contextRefreshed: false,
                    createdNewTab: false,
                });
                throw new Error((0, recovery_1.browserRecoveryFailureMessage)(trigger, "not_retried"));
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
            }
            catch {
                this.recoveryTracker.record({
                    operation,
                    trigger,
                    retrySafe: true,
                    status: "failed",
                    contextRefreshed,
                    createdNewTab,
                });
                throw new Error((0, recovery_1.browserRecoveryFailureMessage)(trigger, "failed"));
            }
        }
    }
    async runAction(project, action, defaultTimeout) {
        try {
            if (action.type === "uploadFile") {
                return (0, mcp_adapters_part_01_1.step)("action", "chrome-devtools:uploadFile", "failed", "", "Chrome DevTools MCP cannot verify local file uploads from TestAgent; use the Playwright provider for this action.");
            }
            if (action.type === "dragTo") {
                return (0, mcp_adapters_part_01_1.step)("action", "chrome-devtools:dragTo", "failed", "", "Chrome DevTools MCP drag/drop is not mapped for TestAgent; use the Playwright provider for this action.");
            }
            if (action.type === "doubleClick" || action.type === "rightClick") {
                return (0, mcp_adapters_part_01_1.step)("action", `chrome-devtools:${action.type}`, "failed", "", `Chrome DevTools MCP ${action.type} is not mapped for TestAgent; use the Playwright provider for this action.`);
            }
            if (action.type === "focus") {
                return (0, mcp_adapters_part_01_1.step)("action", "chrome-devtools:focus", "failed", "", "Chrome DevTools MCP focus is not mapped for TestAgent; use the Playwright provider for deterministic DOM focus.");
            }
            if (action.type === "setClipboard") {
                return (0, mcp_adapters_part_01_1.step)("action", "chrome-devtools:setClipboard", "failed", "", "Chrome DevTools MCP clipboard write is not mapped for TestAgent; use the Playwright provider for this action.");
            }
            if ((0, mcp_adapters_part_01_1.isCookieAction)(action)) {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__evaluate_script$/]);
                if (!tool)
                    throw new Error("Missing evaluate_script.");
                await this.callPageTool(tool, { function: (0, mcp_adapters_part_01_1.cookieActionScript)(action) }, `action:${action.type}`, false);
                return (0, mcp_adapters_part_01_1.step)("action", `chrome-devtools:${action.type}`, "passed", (0, mcp_adapters_part_01_1.cookieActionDetail)(action));
            }
            if ((0, mcp_adapters_part_01_1.isStorageAction)(action)) {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__evaluate_script$/]);
                if (!tool)
                    throw new Error("Missing evaluate_script.");
                await this.callPageTool(tool, { function: (0, mcp_adapters_part_01_1.storageActionScript)(action) }, `action:${action.type}`, false);
                return (0, mcp_adapters_part_01_1.step)("action", `chrome-devtools:${action.type}`, "passed", (0, mcp_adapters_part_01_1.storageActionDetail)(action));
            }
            if ((0, mcp_adapters_part_01_1.isNetworkStateAction)(action)) {
                return (0, mcp_adapters_part_01_1.step)("action", `chrome-devtools:${action.type}`, "failed", "", "Chrome DevTools MCP offline/online emulation is not mapped for TestAgent; use the Playwright provider for this action.");
            }
            if (action.type === "goto") {
                const url = (0, utils_1.resolveUrl)(project.targetUrl, action.url || "");
                const createTool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__new_page$/]);
                const navTool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__navigate_page$/]);
                if (!this.createdNewTab && createTool) {
                    await this.call(createTool, { url });
                    this.createdNewTab = true;
                }
                else if (navTool && this.currentUrl !== url)
                    await this.callPageTool(navTool, { url }, "action:goto", true, url);
                else if (this.currentUrl !== url)
                    throw new Error("Missing navigate_page.");
                this.currentUrl = url;
                return (0, mcp_adapters_part_01_1.step)("action", "chrome-devtools:goto", "passed", url);
            }
            if (action.type === "reload") {
                const url = (0, utils_1.resolveUrl)(project.targetUrl, action.url || this.currentUrl || project.targetUrl);
                const navTool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__navigate_page$/]);
                if (!navTool)
                    throw new Error("Missing navigate_page.");
                if (!url)
                    throw new Error("Cannot reload without a current URL or project targetUrl.");
                await this.callPageTool(navTool, { url }, "action:reload", false, url);
                this.currentUrl = url;
                return (0, mcp_adapters_part_01_1.step)("action", "chrome-devtools:reload", "passed", url);
            }
            if (action.type === "click") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__click$/]);
                if (!tool)
                    throw new Error("Missing click tool.");
                await this.callPageTool(tool, (0, mcp_adapters_part_01_1.targetInput)(action), "action:click", false);
                return (0, mcp_adapters_part_01_1.step)("action", "chrome-devtools:click", "passed", action.selector || action.text || "");
            }
            if (action.type === "fill") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__fill$/, /__type$/]);
                if (!tool)
                    throw new Error("Missing fill/type tool.");
                await this.callPageTool(tool, (0, mcp_adapters_part_01_1.targetInput)(action), "action:fill", false);
                return (0, mcp_adapters_part_01_1.step)("action", "chrome-devtools:fill", "passed", action.selector || action.text || "");
            }
            if (action.type === "typeText") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__type$/]);
                if (!tool)
                    throw new Error("Missing type tool.");
                await this.callPageTool(tool, (0, mcp_adapters_part_01_1.targetInput)(action), "action:typeText", false);
                return (0, mcp_adapters_part_01_1.step)("action", "chrome-devtools:typeText", "passed", (0, mcp_adapters_part_01_1.typedTextDetail)(action));
            }
            if (action.type === "evaluate") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__evaluate_script$/]);
                if (!tool)
                    throw new Error("Missing evaluate_script.");
                const output = await this.callPageTool(tool, { function: String(action.text || action.value || "() => undefined") }, "action:evaluate", false);
                return (0, mcp_adapters_part_01_1.evaluateActionResult)("chrome-devtools", action, output);
            }
            if (action.type === "waitForTimeout") {
                await new Promise(resolve => setTimeout(resolve, Math.min(Number(action.value || action.text || 1000), defaultTimeout)));
                return (0, mcp_adapters_part_01_1.step)("action", "chrome-devtools:waitForTimeout", "passed");
            }
            if (action.type === "waitForUrl") {
                return await (0, mcp_adapters_part_01_1.waitForMcpUrl)("chrome-devtools", this.currentUrl, action, defaultTimeout, () => this.readLiveUrl());
            }
            return (0, mcp_adapters_part_01_1.step)("action", `chrome-devtools:${action.type}`, "failed", "", `Action ${action.type} is not mapped for Chrome DevTools MCP.`);
        }
        catch (error) {
            return (0, mcp_adapters_part_01_1.step)("action", `chrome-devtools:${action.type}`, "failed", action.selector || action.text || action.url || "", error.message || String(error));
        }
    }
    async runAssertion(assertion, signals, defaultTimeout) {
        if (assertion.type === "urlEquals" || assertion.type === "urlIncludes" || assertion.type === "urlNotIncludes") {
            return (0, mcp_adapters_part_01_1.assertWithLiveUrl)("chrome-devtools", assertion, () => this.readLiveUrl());
        }
        return (0, mcp_adapters_part_01_1.assertWithText)("chrome-devtools", assertion, signals, defaultTimeout);
    }
    async readConsoleMessages() {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__list_console_messages$/]);
        if (!tool)
            return [];
        const text = (0, mcp_adapters_part_01_1.extractToolText)(await this.callPageTool(tool, {}, "telemetry:console", true));
        return text && !(0, mcp_adapters_part_01_1.emptyLike)(text) ? (0, console_assertions_1.normalizeBrowserConsoleLines)((0, utils_1.compactText)(text, 4000).split(/\r?\n/)) : [];
    }
    async readConsoleErrors() {
        return (0, console_assertions_1.filterBrowserConsoleErrorLines)(await this.readConsoleMessages());
    }
    async readNetworkErrors() {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__list_network_requests$/]);
        if (!tool)
            return [];
        const text = (0, mcp_adapters_part_01_1.extractToolText)(await this.callPageTool(tool, {}, "telemetry:network", true));
        return text && /\b(4\d\d|5\d\d|failed|error)\b/i.test(text) ? [(0, utils_1.compactText)(text, 1000)] : [];
    }
    async readNetworkRequests() {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__list_network_requests$/]);
        if (!tool)
            return [];
        const text = (0, mcp_adapters_part_01_1.extractToolText)(await this.callPageTool(tool, {}, "telemetry:network", true));
        return text && !(0, mcp_adapters_part_01_1.emptyLike)(text) ? (0, utils_1.compactText)(text, 4000).split(/\r?\n/).filter(Boolean) : [];
    }
    async captureScreenshot(name) {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__take_screenshot$/]);
        if (!tool)
            return [];
        return [await this.callPageTool(tool, { filePath: name }, "evidence:screenshot", true)];
    }
    async pageText() {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__take_snapshot$/]);
        if (!tool)
            return "";
        return (0, mcp_adapters_part_01_1.extractToolText)(await this.callPageTool(tool, {}, "observation:page_text", true));
    }
}
exports.ChromeDevtoolsAdapter = ChromeDevtoolsAdapter;
//# sourceMappingURL=mcp-adapters-part-02.js.map