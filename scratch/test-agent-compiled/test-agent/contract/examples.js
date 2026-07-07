"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEST_AGENT_WORK_ORDER_EXAMPLES = exports.TEST_AGENT_WEB_APP_WORK_ORDER_EXAMPLE = exports.TEST_AGENT_MINIMAL_WORK_ORDER_EXAMPLE = void 0;
exports.TEST_AGENT_MINIMAL_WORK_ORDER_EXAMPLE = {
    schema: "ccm-test-agent-work-order-v1",
    id: "test-agent-work-order-example-minimal",
    taskId: "task-example",
    groupId: "group-example",
    issuedBy: "group-main-agent",
    originalUserGoal: "Verify the delivered task has executable evidence.",
    acceptanceCriteria: [
        "The configured verification command passes.",
    ],
    requiredChecks: ["commands"],
    projects: [{
            name: "example-project",
            workDir: "C:\\path\\to\\project",
            verificationCommands: ["npm test"],
            agentSummary: "Project sub-agent reports the implementation is complete and ready for independent verification.",
        }],
    options: {
        verificationOnly: true,
        browserProvider: "none",
    },
    metadata: {
        handoffSource: "group-main-agent",
    },
};
exports.TEST_AGENT_WEB_APP_WORK_ORDER_EXAMPLE = {
    schema: "ccm-test-agent-work-order-v1",
    id: "test-agent-work-order-example-web",
    taskId: "task-web-login-flow",
    groupId: "group-web-project",
    issuedBy: "group-main-agent",
    originalUserGoal: "Build a web login flow and prove that users can sign in and see the dashboard.",
    acceptanceCriteria: [
        "The project builds without errors.",
        "The login page renders in a real browser.",
        "A valid login reaches the dashboard.",
        "The health API returns ok.",
        "An invalid login is rejected without a server error.",
        "No browser console errors are observed.",
        "A screenshot artifact is captured.",
    ],
    requiredChecks: [
        "build",
        "unit_tests",
        "browser_e2e",
        "console_errors",
        "screenshots",
        "api",
        "adversarial",
    ],
    projects: [{
            name: "web-app",
            workDir: "C:\\path\\to\\web-app",
            runCommand: "npm run dev -- --host 127.0.0.1",
            targetUrl: "http://127.0.0.1:5173",
            startupUrl: "http://127.0.0.1:5173/login",
            changedFiles: [
                "src/pages/Login.tsx",
                "src/pages/Dashboard.tsx",
            ],
            verificationCommands: [
                "npm run build",
            ],
            httpChecks: [{
                    name: "Health API",
                    url: "http://127.0.0.1:5173/api/health",
                    assertions: [
                        { type: "status", status: 200 },
                        { type: "jsonPathEquals", path: "status", value: "ok" },
                    ],
                }],
            adversarialHttpChecks: [{
                    name: "Invalid login",
                    probeType: "negative_auth",
                    method: "POST",
                    url: "http://127.0.0.1:5173/api/login",
                    json: { email: "bad@example.test", password: "wrong-password" },
                    assertions: [
                        { type: "status", status: [400, 401] },
                        { type: "textNotIncludes", text: "stack trace" },
                    ],
                }],
            adversarialBrowserProbeTemplates: [{
                    name: "Invalid login stays on login page",
                    kind: "invalid_form_input",
                    probeType: "negative_auth_ui",
                    url: "http://127.0.0.1:5173/login",
                    fields: [
                        { label: "Email", value: "bad@example.test" },
                        { label: "Password", value: "wrong-password" },
                    ],
                    submit: { role: "button", name: "Sign in" },
                    expectedUrlIncludes: "/login",
                    expectedText: "Invalid",
                    assertions: [
                        { type: "consoleNoErrors" },
                    ],
                    screenshot: true,
                }],
            browserChecks: [{
                    name: "Valid login reaches dashboard",
                    url: "http://127.0.0.1:5173/login",
                    actions: [
                        { type: "fill", label: "Email", value: "ada@example.test" },
                        { type: "fill", label: "Password", value: "correct horse battery staple" },
                        { type: "click", role: "button", name: "Sign in" },
                    ],
                    assertions: [
                        { type: "urlIncludes", text: "/dashboard" },
                        { type: "visible", role: "heading", name: "Dashboard" },
                        { type: "consoleNoErrors" },
                        { type: "networkNoErrors" },
                    ],
                    screenshot: true,
                }],
            agentSummary: "Project sub-agents report the login UI, dashboard route, and auth API are implemented.",
            risks: [
                "Auth behavior depends on local seeded credentials.",
            ],
        }],
    options: {
        verificationOnly: true,
        browserProvider: "auto",
        autoDiscoverVerificationCommands: true,
        failOnConsoleError: true,
        failOnHttpResourceError: true,
    },
    metadata: {
        handoffSource: "group-main-agent",
        completedByProjectAgents: ["frontend-agent", "api-agent"],
    },
};
exports.TEST_AGENT_WORK_ORDER_EXAMPLES = {
    minimal: exports.TEST_AGENT_MINIMAL_WORK_ORDER_EXAMPLE,
    webApp: exports.TEST_AGENT_WEB_APP_WORK_ORDER_EXAMPLE,
};
