"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CCM_GROUP_READONLY_PER_PROJECT_MAX = exports.CCM_READONLY_TOOL_CONCURRENCY_DEFAULT = exports.CCM_READONLY_TOOL_CONCURRENCY_MAX = void 0;
exports.clampReadonlyToolConcurrency = clampReadonlyToolConcurrency;
exports.classifyReadonlyToolConcurrency = classifyReadonlyToolConcurrency;
exports.readonlyToolConcurrencyLimit = readonlyToolConcurrencyLimit;
exports.groupReadonlyProjectKey = groupReadonlyProjectKey;
exports.runReadonlyToolsAdaptive = runReadonlyToolsAdaptive;
exports.createReadonlyToolScheduler = createReadonlyToolScheduler;
exports.CCM_READONLY_TOOL_CONCURRENCY_MAX = 10;
exports.CCM_READONLY_TOOL_CONCURRENCY_DEFAULT = 10;
exports.CCM_GROUP_READONLY_PER_PROJECT_MAX = 2;
const HEAVY_TOOL_NAMES = new Set([
    "grep_text",
    "read_files",
    "analyze_change_impact",
    "find_related_tests",
    "inspect_dependency_graph",
    "inspect_public_contracts",
    "compare_project_contracts",
    "run_inspection_command",
]);
const MEDIUM_TOOL_NAMES = new Set([
    "read_file",
    "read_scope_instruction",
    "query_knowledge",
    "read_git_diff",
    "read_git_history",
    "read_git_blame",
    "discover_verification_commands",
]);
const LIGHT_TOOL_NAMES = new Set([
    "glob_files",
    "list_directory",
    "read_git_status",
    "read_runtime_status",
    "list_projects",
    "list_groups",
    "list_tasks",
    "list_cron_jobs",
]);
function clampReadonlyToolConcurrency(value, fallback = exports.CCM_READONLY_TOOL_CONCURRENCY_DEFAULT) {
    const numeric = Number(value);
    const resolved = Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
    return Math.max(1, Math.min(exports.CCM_READONLY_TOOL_CONCURRENCY_MAX, Math.floor(resolved)));
}
function classifyReadonlyToolConcurrency(tool) {
    const name = String(tool?.name || "").trim().toLowerCase();
    if (HEAVY_TOOL_NAMES.has(name))
        return "heavy";
    if (MEDIUM_TOOL_NAMES.has(name))
        return "medium";
    if (LIGHT_TOOL_NAMES.has(name) || /^(?:list|get|read).*(?:status|catalog|summary)$/.test(name))
        return "light";
    // Unknown tools have already passed the read-only policy, but their resource
    // cost is not proven. Keep useful concurrency without treating them as cheap.
    return "medium";
}
function readonlyToolConcurrencyLimit(tool, configuredLimit = exports.CCM_READONLY_TOOL_CONCURRENCY_DEFAULT) {
    const configured = clampReadonlyToolConcurrency(configuredLimit);
    const toolLimit = classifyReadonlyToolConcurrency(tool) === "heavy"
        ? 4
        : classifyReadonlyToolConcurrency(tool) === "medium"
            ? 6
            : exports.CCM_READONLY_TOOL_CONCURRENCY_MAX;
    return Math.min(configured, toolLimit);
}
function groupReadonlyProjectKey(tool) {
    const args = tool?.arguments || {};
    const values = [
        args.project_id,
        args.projectId,
        args.project,
        args.source_project,
        args.sourceProject,
        args.target_project,
        args.targetProject,
        args.producer_project,
        args.producerProject,
        args.consumer_project,
        args.consumerProject,
    ].map(value => String(value || "").trim()).filter(Boolean);
    return values.length ? Array.from(new Set(values)).sort().join("|") : undefined;
}
/**
 * Runs a proven-read-only batch with a CC-aligned ceiling and CCM resource
 * guards. Results retain model request order even when completion order differs.
 */
function runReadonlyToolsAdaptive(input) {
    if (!input.items.length)
        return Promise.resolve([]);
    const configuredLimit = clampReadonlyToolConcurrency(input.configuredLimit);
    const perKeyLimit = clampReadonlyToolConcurrency(input.perKeyLimit, configuredLimit);
    const results = new Array(input.items.length);
    const queue = input.items.map((item, index) => ({ item, index }));
    const active = [];
    const activeByKey = new Map();
    return new Promise((resolve, reject) => {
        let completed = 0;
        let settled = false;
        const launch = () => {
            if (settled)
                return;
            if (completed === input.items.length) {
                settled = true;
                resolve(results);
                return;
            }
            while (queue.length) {
                const head = queue[0];
                const headLimit = [head.item, ...active.map(row => row.item)]
                    .reduce((limit, item) => Math.min(limit, readonlyToolConcurrencyLimit(item, configuredLimit)), configuredLimit);
                if (active.length >= headLimit)
                    break;
                const candidateIndex = queue.findIndex(row => {
                    const rowKey = input.keyForItem?.(row.item);
                    if (rowKey && Number(activeByKey.get(rowKey) || 0) >= perKeyLimit)
                        return false;
                    const rowLimit = [row.item, ...active.map(activeRow => activeRow.item)]
                        .reduce((limit, item) => Math.min(limit, readonlyToolConcurrencyLimit(item, configuredLimit)), configuredLimit);
                    return active.length < rowLimit;
                });
                if (candidateIndex < 0)
                    break;
                const [candidate] = queue.splice(candidateIndex, 1);
                const key = input.keyForItem?.(candidate.item);
                const combinedLimit = [candidate.item, ...active.map(row => row.item)]
                    .reduce((limit, item) => Math.min(limit, readonlyToolConcurrencyLimit(item, configuredLimit)), configuredLimit);
                if (active.length >= combinedLimit)
                    break;
                active.push({ item: candidate.item, key });
                if (key)
                    activeByKey.set(key, Number(activeByKey.get(key) || 0) + 1);
                Promise.resolve(input.worker(candidate.item, candidate.index)).then(result => {
                    results[candidate.index] = result;
                    completed += 1;
                    const activeIndex = active.findIndex(row => row.item === candidate.item && row.key === key);
                    if (activeIndex >= 0)
                        active.splice(activeIndex, 1);
                    if (key) {
                        const next = Math.max(0, Number(activeByKey.get(key) || 0) - 1);
                        if (next)
                            activeByKey.set(key, next);
                        else
                            activeByKey.delete(key);
                    }
                    launch();
                }, error => {
                    if (settled)
                        return;
                    settled = true;
                    reject(error);
                });
            }
        };
        launch();
    });
}
function createReadonlyToolScheduler(configuredLimit = exports.CCM_READONLY_TOOL_CONCURRENCY_DEFAULT) {
    const limit = clampReadonlyToolConcurrency(configuredLimit);
    const queue = [];
    const active = [];
    const launch = () => {
        while (queue.length) {
            const candidate = queue[0];
            const combinedLimit = [candidate.item, ...active]
                .reduce((value, item) => Math.min(value, readonlyToolConcurrencyLimit(item, limit)), limit);
            if (active.length >= combinedLimit)
                return;
            queue.shift();
            active.push(candidate.item);
            Promise.resolve(candidate.worker()).then(value => {
                const index = active.indexOf(candidate.item);
                if (index >= 0)
                    active.splice(index, 1);
                candidate.resolve(value);
                launch();
            }, error => {
                const index = active.indexOf(candidate.item);
                if (index >= 0)
                    active.splice(index, 1);
                candidate.reject(error);
                launch();
            });
        }
    };
    return {
        run(item, worker) {
            return new Promise((resolve, reject) => {
                queue.push({ item, worker, resolve, reject });
                launch();
            });
        },
    };
}
//# sourceMappingURL=readonly-tool-concurrency.js.map