"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMcpBrowserAdapter = createMcpBrowserAdapter;
const utils_1 = require("../utils");
const aria_state_assertions_1 = require("./aria-state-assertions");
const mcp_adapters_part_01_1 = require("./mcp-adapters-part-01");
const mcp_adapters_part_02_1 = require("./mcp-adapters-part-02");
class ComputerUseAdapter {
    tools;
    call;
    id = "computer-use";
    label = "Computer Use MCP";
    currentUrl = "";
    constructor(tools, call) {
        this.tools = tools;
        this.call = call;
    }
    unsupported(kind, type, reason) {
        return (0, mcp_adapters_part_01_1.step)(kind, `computer-use:${type}`, "failed", "", reason);
    }
    async runAction(project, action, defaultTimeout) {
        try {
            if (action.type === "uploadFile") {
                return this.unsupported("action", "uploadFile", "Computer Use MCP cannot verify local file uploads from TestAgent; use the Playwright provider for this action.");
            }
            if (action.type === "dragTo") {
                return this.unsupported("action", "dragTo", "Computer Use MCP drag/drop is not mapped for TestAgent; use the Playwright provider for this action.");
            }
            if (action.type === "doubleClick" || action.type === "rightClick") {
                return this.unsupported("action", action.type, `Computer Use MCP ${action.type} is not mapped for TestAgent; use the Playwright provider for this action.`);
            }
            if (action.type === "focus") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__left_click$/]);
                if (!tool)
                    throw new Error("Missing left_click tool.");
                const input = (0, mcp_adapters_part_01_1.coordinateInput)(action);
                if (!input.coordinate)
                    throw new Error("Computer Use focus requires action.coordinate [x,y]; selectors/text cannot be resolved without DOM access.");
                await this.call(tool, input);
                return (0, mcp_adapters_part_01_1.step)("action", "computer-use:focus", "passed", (0, mcp_adapters_part_01_1.computerActionDetail)(action));
            }
            if (action.type === "setClipboard") {
                return this.unsupported("action", "setClipboard", "Computer Use MCP cannot write browser clipboard contents for TestAgent; use the Playwright provider for this action.");
            }
            if ((0, mcp_adapters_part_01_1.isCookieAction)(action)) {
                return this.unsupported("action", action.type, "Computer Use MCP cannot modify browser cookies from TestAgent; use Playwright or a JavaScript-capable browser provider.");
            }
            if ((0, mcp_adapters_part_01_1.isStorageAction)(action)) {
                return this.unsupported("action", action.type, "Computer Use MCP cannot modify Web Storage from TestAgent; use Playwright or a JavaScript-capable browser provider.");
            }
            if ((0, mcp_adapters_part_01_1.isNetworkStateAction)(action)) {
                return this.unsupported("action", action.type, "Computer Use MCP cannot emulate browser offline/online network state from TestAgent; use Playwright for this action.");
            }
            if (action.type === "requestAccess") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__request_access$/]);
                if (!tool)
                    throw new Error("Missing request_access tool.");
                const apps = (0, mcp_adapters_part_01_1.normalizeComputerUseApps)(action.apps);
                await this.call(tool, apps ? { apps } : {});
                return (0, mcp_adapters_part_01_1.step)("action", "computer-use:requestAccess", "passed", apps ? `${apps.length} apps` : "session access requested");
            }
            if (action.type === "openApplication") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__open_application$/]);
                if (!tool)
                    throw new Error("Missing open_application tool.");
                const bundleId = String(action.bundle_id || action.bundleId || action.value || action.text || "").trim();
                if (!bundleId)
                    throw new Error("openApplication requires bundleId/bundle_id.");
                await this.call(tool, { bundle_id: bundleId });
                return (0, mcp_adapters_part_01_1.step)("action", "computer-use:openApplication", "passed", bundleId);
            }
            if (action.type === "goto") {
                const keyTool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__key$/]);
                const typeTool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__type$/]);
                if (!keyTool || !typeTool)
                    throw new Error("Computer Use goto needs key and type tools, with a browser already focused.");
                const url = (0, utils_1.resolveUrl)(project.targetUrl, action.url || project.targetUrl);
                await this.call(keyTool, { text: (0, mcp_adapters_part_01_1.browserAddressShortcut)() });
                await this.call(typeTool, { text: url });
                await this.call(keyTool, { text: "enter" });
                // Do not trust intended URL as observed location; URL-gated flows must use Playwright.
                return (0, mcp_adapters_part_01_1.step)("action", "computer-use:goto", "blocked", url, "Computer Use cannot prove navigation without a live URL observation. Use Playwright for URL-gated flows.");
            }
            if (action.type === "reload") {
                const keyTool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__key$/]);
                if (!keyTool)
                    throw new Error("Missing key tool.");
                await this.call(keyTool, { text: "ctrl+r" });
                return (0, mcp_adapters_part_01_1.step)("action", "computer-use:reload", "passed", "browser refresh shortcut sent");
            }
            if (action.type === "click" || action.type === "check" || action.type === "uncheck") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__left_click$/]);
                if (!tool)
                    throw new Error("Missing left_click tool.");
                const input = (0, mcp_adapters_part_01_1.coordinateInput)(action);
                if (!input.coordinate)
                    throw new Error("Computer Use click requires action.coordinate [x,y]; selectors/text cannot be resolved without DOM access.");
                await this.call(tool, input);
                return (0, mcp_adapters_part_01_1.step)("action", `computer-use:${action.type}`, "passed", (0, mcp_adapters_part_01_1.computerActionDetail)(action));
            }
            if (action.type === "hover") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__mouse_move$/]);
                if (!tool)
                    throw new Error("Missing mouse_move tool.");
                const input = (0, mcp_adapters_part_01_1.coordinateInput)(action);
                if (!input.coordinate)
                    throw new Error("Computer Use hover requires action.coordinate [x,y].");
                await this.call(tool, input);
                return (0, mcp_adapters_part_01_1.step)("action", "computer-use:hover", "passed", (0, mcp_adapters_part_01_1.computerActionDetail)(action));
            }
            if (action.type === "fill") {
                const typeTool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__type$/]);
                if (!typeTool)
                    throw new Error("Missing type tool.");
                const text = String(action.value ?? action.text ?? "");
                if (!text)
                    throw new Error("fill requires value/text.");
                const input = (0, mcp_adapters_part_01_1.coordinateInput)(action);
                if (input.coordinate) {
                    const clickTool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__left_click$/]);
                    if (clickTool)
                        await this.call(clickTool, input);
                }
                else if (action.selector) {
                    throw new Error("Computer Use fill cannot resolve selectors; click a coordinate first or provide action.coordinate.");
                }
                await this.call(typeTool, { text });
                return (0, mcp_adapters_part_01_1.step)("action", "computer-use:fill", "passed", input.coordinate ? `${(0, mcp_adapters_part_01_1.computerActionDetail)(action)} then typed` : "typed into focused control");
            }
            if (action.type === "typeText") {
                const typeTool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__type$/]);
                if (!typeTool)
                    throw new Error("Missing type tool.");
                const text = (0, mcp_adapters_part_01_1.typedText)(action);
                if (!text)
                    throw new Error("typeText requires value/text.");
                const input = (0, mcp_adapters_part_01_1.coordinateInput)(action);
                if (input.coordinate) {
                    const clickTool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__left_click$/]);
                    if (clickTool)
                        await this.call(clickTool, input);
                }
                else if (action.selector) {
                    throw new Error("Computer Use typeText cannot resolve selectors; click a coordinate first or provide action.coordinate.");
                }
                await this.call(typeTool, { text });
                return (0, mcp_adapters_part_01_1.step)("action", "computer-use:typeText", "passed", input.coordinate ? `${(0, mcp_adapters_part_01_1.computerActionDetail)(action)} then typed ${text.length} chars` : `typed ${text.length} chars into focused control`);
            }
            if (action.type === "press") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__key$/]);
                if (!tool)
                    throw new Error("Missing key tool.");
                const text = (0, mcp_adapters_part_01_1.pressKeyText)(action, "enter");
                await this.call(tool, { text });
                return (0, mcp_adapters_part_01_1.step)("action", "computer-use:press", "passed", text);
            }
            if (action.type === "scroll") {
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__scroll$/]);
                if (!tool)
                    throw new Error("Missing scroll tool.");
                const amount = Math.max(1, Number(action.amount || action.value || 1));
                const input = {
                    direction: action.direction || "down",
                    amount,
                    ...(0, mcp_adapters_part_01_1.coordinateInput)(action),
                };
                await this.call(tool, input);
                return (0, mcp_adapters_part_01_1.step)("action", "computer-use:scroll", "passed", `${input.direction} x${amount}`);
            }
            if (action.type === "waitForTimeout") {
                const ms = Math.min(Number(action.duration || action.value || action.text || defaultTimeout || 1000), defaultTimeout);
                const seconds = Math.max(1, Math.ceil(ms / 1000));
                const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__wait$/]);
                if (tool)
                    await this.call(tool, { duration: seconds });
                else
                    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
                return (0, mcp_adapters_part_01_1.step)("action", "computer-use:waitForTimeout", "passed", `${seconds}s`);
            }
            if (action.type === "waitForSelector" || action.type === "waitForText") {
                return this.unsupported("action", action.type, "Computer Use cannot wait on DOM selectors or page text. Use a browser-native MCP provider for DOM assertions.");
            }
            if (action.type === "waitForUrl") {
                return await (0, mcp_adapters_part_01_1.waitForMcpUrl)("computer-use", this.currentUrl, action, defaultTimeout);
            }
            if (action.type === "evaluate") {
                return this.unsupported("action", "evaluate", "Computer Use cannot evaluate JavaScript in the page. Use Playwright, Claude in Chrome, or Chrome DevTools MCP.");
            }
            if (action.type === "selectOption") {
                return this.unsupported("action", "selectOption", "Computer Use cannot resolve select elements by selector; model it as coordinate click/type/key actions.");
            }
            return this.unsupported("action", action.type, `Action ${action.type} is not mapped for Computer Use MCP.`);
        }
        catch (error) {
            return (0, mcp_adapters_part_01_1.step)("action", `computer-use:${action.type}`, "failed", (0, mcp_adapters_part_01_1.computerActionDetail)(action), error.message || String(error));
        }
    }
    async runAssertion(assertion) {
        if (assertion.type === "urlEquals" || assertion.type === "urlIncludes" || assertion.type === "urlNotIncludes") {
            return (0, mcp_adapters_part_01_1.assertWithLiveUrl)("computer-use", assertion);
        }
        if (assertion.type === "consoleNoErrors"
            || assertion.type === "consoleIncludes"
            || assertion.type === "consoleNotIncludes"
            || assertion.type === "consoleNoWarnings"
            || assertion.type === "onlineState"
            || assertion.type === "browserOnline"
            || assertion.type === "browserOffline"
            || assertion.type === "accessibleNameEquals"
            || assertion.type === "accessibleNameIncludes"
            || assertion.type === "accessibleDescriptionEquals"
            || assertion.type === "accessibleDescriptionIncludes"
            || assertion.type === "ariaSnapshotIncludes"
            || (0, aria_state_assertions_1.isBrowserAriaStateAssertion)(assertion)
            || assertion.type === "networkNoErrors"
            || assertion.type === "networkRequest"
            || assertion.type === "networkResponse"
            || assertion.type === "networkRequestIncludes"
            || assertion.type === "networkResponseIncludes"
            || assertion.type === "networkRequestNot"
            || assertion.type === "networkResponseNot"
            || assertion.type === "networkRequestNotIncludes"
            || assertion.type === "networkResponseNotIncludes"
            || assertion.type === "popupOpened"
            || assertion.type === "popupUrlIncludes"
            || assertion.type === "popupTextIncludes"
            || assertion.type === "popupTitleIncludes") {
            return this.unsupported("assertion", assertion.type, "Computer Use MCP does not expose console, network, offline/online emulation, accessibility/ARIA DOM state, or popup page telemetry.");
        }
        return this.unsupported("assertion", assertion.type, "Computer Use MCP cannot read DOM/page text; use screenshot evidence or a browser-native provider for this assertion.");
    }
    async readConsoleErrors() {
        return [];
    }
    async readNetworkErrors() {
        return [];
    }
    async readNetworkRequests() {
        return [];
    }
    async captureScreenshot(name) {
        const tool = (0, mcp_adapters_part_01_1.pick)(this.tools, [/__screenshot$/]);
        if (!tool)
            return [];
        return [await this.call(tool, { name })];
    }
    async pageText() {
        return "";
    }
}
function createMcpBrowserAdapter(tools, call, options = {}) {
    const browserTools = tools.filter(tool => /mcp__(playwright|claude-in-chrome|chrome|chrome-devtools|chromedevtools|computer-use)__/.test(tool));
    if (!browserTools.length)
        return null;
    if (options.existingSession) {
        const preferred = options.preferredAdapter || "auto";
        if ((preferred === "auto" || preferred === "claude-in-chrome")
            && (0, mcp_adapters_part_01_1.has)(browserTools, /mcp__claude-in-chrome__/)) {
            return new mcp_adapters_part_02_1.ClaudeChromeAdapter(browserTools, call);
        }
        if ((preferred === "auto" || preferred === "chrome-devtools")
            && (0, mcp_adapters_part_01_1.has)(browserTools, /mcp__(chrome-devtools|chromedevtools|chrome)__(new_page|navigate_page|take_snapshot|click|fill|evaluate_script|list_pages)/)) {
            return new mcp_adapters_part_02_1.ChromeDevtoolsAdapter(browserTools, call);
        }
        return null;
    }
    if ((0, mcp_adapters_part_01_1.has)(browserTools, /mcp__playwright__browser_/))
        return new mcp_adapters_part_02_1.PlaywrightMcpAdapter(browserTools, call);
    if ((0, mcp_adapters_part_01_1.has)(browserTools, /mcp__claude-in-chrome__/))
        return new mcp_adapters_part_02_1.ClaudeChromeAdapter(browserTools, call);
    if ((0, mcp_adapters_part_01_1.has)(browserTools, /mcp__(chrome-devtools|chromedevtools|chrome)__(new_page|navigate_page|take_snapshot|click|fill|evaluate_script)/))
        return new mcp_adapters_part_02_1.ChromeDevtoolsAdapter(browserTools, call);
    if ((0, mcp_adapters_part_01_1.has)(browserTools, /mcp__computer-use__/))
        return new ComputerUseAdapter(browserTools, call);
    return null;
}
//# sourceMappingURL=mcp-adapters-part-03.js.map