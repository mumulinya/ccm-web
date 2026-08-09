"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectBrowserProviderPreflight = collectBrowserProviderPreflight;
exports.runBrowserVerificationWithProviders = runBrowserVerificationWithProviders;
const provider_types_1 = require("./provider-types");
const mcp_provider_1 = require("./mcp-provider");
const playwright_provider_1 = require("./playwright-provider");
const existing_session_1 = require("./existing-session");
const provider_routing_1 = require("./provider-routing");
const shared_1 = require("./shared");
const check_execution_coverage_1 = require("./check-execution-coverage");
const tool_call_timeout_1 = require("./tool-call-timeout");
const isolation_1 = require("../isolation");
const side_effect_policy_1 = require("../side-effect-policy");
function preferredProvider(workOrder, runtime) {
    return runtime.browserProvider || workOrder.options.browserProvider || "auto";
}
function orderedProviders(preferred) {
    return preferred === "mcp"
        ? [mcp_provider_1.McpBrowserProvider, playwright_provider_1.PlaywrightBrowserProvider]
        : preferred === "playwright"
            ? [playwright_provider_1.PlaywrightBrowserProvider, mcp_provider_1.McpBrowserProvider]
            : [playwright_provider_1.PlaywrightBrowserProvider, mcp_provider_1.McpBrowserProvider];
}
function availabilityToPreflight(provider, preferred, availability) {
    return {
        provider: provider.id,
        label: provider.label,
        preferred: preferred === provider.id || preferred === "auto",
        available: availability.available,
        reason: availability.reason,
        tools: availability.tools,
        diagnostics: availability.diagnostics,
    };
}
async function collectBrowserProviderPreflight(workOrder, runtime = {}) {
    if (!(0, shared_1.wantsBrowser)(workOrder))
        return [];
    const preferred = preferredProvider(workOrder, runtime);
    if (preferred === "none")
        return [];
    const context = { workOrder, runtime };
    const results = [];
    for (const provider of orderedProviders(preferred)) {
        try {
            results.push(availabilityToPreflight(provider, preferred, await provider.availability(context)));
        }
        catch (error) {
            results.push({
                provider: provider.id,
                label: provider.label,
                preferred: preferred === provider.id || preferred === "auto",
                available: false,
                reason: error.message || String(error),
            });
        }
    }
    return results;
}
async function runBrowserVerificationWithProviders(workOrder, runtime = {}) {
    if (!(0, shared_1.wantsBrowser)(workOrder))
        return [];
    const preferred = preferredProvider(workOrder, runtime);
    // runTestAgent 在启动任何浏览器资源前已经冻结执行计划。这里必须复用同一个 planId，
    // 否则 Provider 证据会绑定第二个随机计划，最终完整性核验会把真实结果判为越界。
    const plan = workOrder.metadata?.browserCheckExecutionPlan
        || (0, check_execution_coverage_1.buildBrowserCheckExecutionPlan)(workOrder, preferred);
    workOrder.metadata = {
        ...workOrder.metadata,
        browserCheckExecutionPlan: plan,
    };
    let providerResults;
    try {
        providerResults = preferred === "none"
            ? []
            : await runRoutedBrowserProviders(workOrder, runtime, preferred);
    }
    catch (error) {
        providerResults = [(0, provider_types_1.blockedBrowserResult)("none", "Browser provider orchestration", error?.message || String(error))];
    }
    const reconciled = (0, check_execution_coverage_1.reconcileBrowserCheckExecution)(plan, providerResults);
    workOrder.metadata = {
        ...workOrder.metadata,
        browserCheckExecutionCoverage: reconciled.summary,
    };
    return reconciled.results;
}
async function runRoutedBrowserProviders(workOrder, runtime, preferred) {
    const isolationPolicy = (0, isolation_1.testAgentPolicyContextFromWorkOrder)(workOrder);
    const policyDecision = (project, check) => isolationPolicy
        ? (0, side_effect_policy_1.evaluateTestAgentBrowserSideEffect)(check, { ...isolationPolicy, project })
        : null;
    const policyAllows = (project, check) => {
        const decision = policyDecision(project, check);
        return !decision || decision.allowed;
    };
    const hasExistingSessionChecks = workOrder.projects.some(project => (0, shared_1.checksForProject)(project, workOrder.acceptanceCriteria).some(check => (0, existing_session_1.browserCheckUsesExistingSession)(check) && policyAllows(project, check)));
    const hasStandardChecks = workOrder.projects.some(project => (0, shared_1.checksForProject)(project, workOrder.acceptanceCriteria).some(check => !(0, existing_session_1.browserCheckUsesExistingSession)(check) && policyAllows(project, check)));
    const results = [];
    const policyBlocked = workOrder.projects.flatMap(project => (0, shared_1.checksForProject)(project, workOrder.acceptanceCriteria)
        .map(check => ({ check, decision: policyDecision(project, check) }))
        .filter(item => item.decision && !item.decision.allowed)
        .map(item => {
        const blocked = (0, provider_types_1.blockedBrowserResult)("none", item.check.name || "Browser check", `副作用安全门阻止浏览器检查：${item.decision.reason}`);
        return {
            ...blocked,
            project: project.name,
            name: item.check.name || "Browser check",
            url: item.check.url || project.targetUrl || project.startupUrl || "",
            adversarial: item.check.adversarial === true,
            probeType: item.check.probeType || item.check.probe_type,
            context: { ...(item.check.context || {}), sideEffectPolicy: "blocked" },
        };
    }));
    if (hasStandardChecks) {
        const standardFilter = (_project, check) => !(0, existing_session_1.browserCheckUsesExistingSession)(check) && policyAllows(_project, check);
        if (preferred === "mcp") {
            const playwrightRequiredFilter = (_project, check, index) => standardFilter(_project, check, index)
                && policyAllows(_project, check)
                && (0, provider_routing_1.browserProviderRouteForCheck)(workOrder, check, preferred).provider === "playwright";
            const mcpCompatibleFilter = (_project, check, index) => standardFilter(_project, check, index)
                && policyAllows(_project, check)
                && (0, provider_routing_1.browserProviderRouteForCheck)(workOrder, check, preferred).provider === "mcp";
            if (hasChecksMatching(workOrder, mcpCompatibleFilter)) {
                results.push(...await runProviderChain(workOrder, runtime, [mcp_provider_1.McpBrowserProvider, playwright_provider_1.PlaywrightBrowserProvider], mcpCompatibleFilter));
            }
            if (hasChecksMatching(workOrder, playwrightRequiredFilter)) {
                results.push(...await runProviderChain(workOrder, runtime, [playwright_provider_1.PlaywrightBrowserProvider], playwrightRequiredFilter));
            }
        }
        else {
            results.push(...await runProviderChain(workOrder, runtime, orderedProviders(preferred), standardFilter));
        }
    }
    if (hasExistingSessionChecks) {
        results.push(...await runProviderChain(workOrder, runtime, [mcp_provider_1.McpBrowserProvider], (_project, check) => (0, existing_session_1.browserCheckUsesExistingSession)(check) && policyAllows(_project, check)));
    }
    if (policyBlocked.length)
        results.push(...policyBlocked);
    return results.length ? results : [(0, provider_types_1.blockedBrowserResult)("none", "Browser verification", "No browser checks were routed to a provider.")];
}
function hasChecksMatching(workOrder, checkFilter) {
    return workOrder.projects.some(project => (0, shared_1.checksForProject)(project, workOrder.acceptanceCriteria)
        .some((check, index) => checkFilter(project, check, index)));
}
async function runProviderChain(workOrder, runtime, providers, checkFilter) {
    const context = { workOrder, runtime, checkFilter };
    const blocked = [];
    for (const provider of providers) {
        const availability = await provider.availability(context);
        if (!availability.available) {
            blocked.push((0, provider_types_1.blockedBrowserResult)(provider.id, `${provider.label} availability`, availability.reason || "provider unavailable"));
            continue;
        }
        const results = await provider.run(context);
        if (results.some(tool_call_timeout_1.browserResultHasToolCallTimeout))
            return results;
        if (results.length && !results.every(item => item.status === "blocked"))
            return results;
        blocked.push(...results);
    }
    return blocked.length ? blocked : [(0, provider_types_1.blockedBrowserResult)("none", "Browser verification", "No browser provider was available.")];
}
//# sourceMappingURL=registry.js.map