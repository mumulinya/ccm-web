"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.browserProviderRouteForCheck = browserProviderRouteForCheck;
const existing_session_1 = require("./existing-session");
const provider_gaps_1 = require("./provider-gaps");
function browserProviderRouteForCheck(workOrder, check, preferredOverride) {
    const preferred = preferredOverride || workOrder.options.browserProvider || "auto";
    if (preferred === "none")
        return { provider: "none", reason: "provider_disabled" };
    if ((0, existing_session_1.browserCheckUsesExistingSession)(check)) {
        return { provider: "mcp", reason: "existing_authenticated_session" };
    }
    if (preferred === "mcp" && (0, provider_gaps_1.browserCheckRequiresPlaywright)(workOrder, check)) {
        return { provider: "playwright", reason: "capability_requires_playwright" };
    }
    if (preferred === "mcp")
        return { provider: "mcp", reason: "preferred_provider" };
    if (preferred === "playwright")
        return { provider: "playwright", reason: "preferred_provider" };
    return { provider: "playwright", reason: "auto_default" };
}
//# sourceMappingURL=provider-routing.js.map