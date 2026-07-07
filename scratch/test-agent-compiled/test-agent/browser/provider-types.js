"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockedBrowserResult = blockedBrowserResult;
const utils_1 = require("../utils");
function blockedBrowserResult(provider, name, error) {
    const at = (0, utils_1.nowIso)();
    return {
        provider,
        project: "",
        name,
        url: "",
        status: "blocked",
        startedAt: at,
        finishedAt: at,
        durationMs: 0,
        steps: [],
        screenshots: [],
        consoleErrors: [],
        pageErrors: [],
        networkErrors: [],
        error,
    };
}
