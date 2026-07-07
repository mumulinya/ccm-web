"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testAgentCliUsage = testAgentCliUsage;
exports.parseTestAgentCliArgs = parseTestAgentCliArgs;
exports.cliOverrides = cliOverrides;
const BROWSER_PROVIDERS = new Set(["auto", "playwright", "mcp", "none"]);
function testAgentCliUsage() {
    return [
        "Usage: node dist/test-agent/cli.js <work-order.json> [options]",
        "       node dist/test-agent/cli.js --from-handoff <handoff.json> [options]",
        "       node dist/test-agent/cli.js --verify-artifacts <artifact-manifest.json> [--summary|--json]",
        "",
        "Options:",
        "  --validate-only              Validate the work order contract without executing checks.",
        "  --from-handoff <file>        Build a work order from a group-main-agent handoff JSON file.",
        "  --verify-artifacts <file>    Verify an artifact-manifest.json integrity bundle.",
        "  --summary                    Print a concise human summary instead of the full JSON report.",
        "  --json                       Print full JSON output. This is the default execution output.",
        "  --artifact-dir <dir>         Override report/artifact output directory.",
        "  --browser-provider <name>    Override browser provider: auto, playwright, mcp, none.",
        "  --no-auto-discover           Disable package.json verification command discovery.",
        "  -h, --help                   Show this help.",
    ].join("\n");
}
function readValue(args, index, flag) {
    const arg = args[index];
    const prefix = `${flag}=`;
    if (arg.startsWith(prefix))
        return { value: arg.slice(prefix.length), consumed: 1 };
    return { value: args[index + 1], consumed: 2 };
}
function parseTestAgentCliArgs(args) {
    const options = {
        workOrderPath: "",
        handoffPath: "",
        verifyArtifactsPath: "",
        help: false,
        validateOnly: false,
        summary: false,
        json: true,
    };
    const errors = [];
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (arg === "-h" || arg === "--help") {
            options.help = true;
        }
        else if (arg === "--validate-only") {
            options.validateOnly = true;
        }
        else if (arg === "--verify-artifacts" || arg.startsWith("--verify-artifacts=")) {
            const { value, consumed } = readValue(args, i, "--verify-artifacts");
            if (!value || value.startsWith("--"))
                errors.push("--verify-artifacts requires an artifact manifest file.");
            else
                options.verifyArtifactsPath = value;
            i += consumed - 1;
        }
        else if (arg === "--from-handoff" || arg.startsWith("--from-handoff=")) {
            const { value, consumed } = readValue(args, i, "--from-handoff");
            if (!value || value.startsWith("--"))
                errors.push("--from-handoff requires a handoff JSON file.");
            else
                options.handoffPath = value;
            i += consumed - 1;
        }
        else if (arg === "--summary") {
            options.summary = true;
            options.json = false;
        }
        else if (arg === "--json") {
            options.json = true;
            options.summary = false;
        }
        else if (arg === "--no-auto-discover") {
            options.autoDiscoverVerificationCommands = false;
        }
        else if (arg === "--artifact-dir" || arg.startsWith("--artifact-dir=")) {
            const { value, consumed } = readValue(args, i, "--artifact-dir");
            if (!value || value.startsWith("--"))
                errors.push("--artifact-dir requires a directory value.");
            else
                options.artifactDir = value;
            i += consumed - 1;
        }
        else if (arg === "--browser-provider" || arg.startsWith("--browser-provider=")) {
            const { value, consumed } = readValue(args, i, "--browser-provider");
            if (!value || value.startsWith("--"))
                errors.push("--browser-provider requires one of: auto, playwright, mcp, none.");
            else if (!BROWSER_PROVIDERS.has(value))
                errors.push(`Unsupported browser provider "${value}".`);
            else
                options.browserProvider = value;
            i += consumed - 1;
        }
        else if (arg.startsWith("--")) {
            errors.push(`Unknown option: ${arg}`);
        }
        else if (!options.workOrderPath) {
            options.workOrderPath = arg;
        }
        else {
            errors.push(`Unexpected argument: ${arg}`);
        }
    }
    if (!options.help && !options.workOrderPath && !options.handoffPath && !options.verifyArtifactsPath)
        errors.push("Missing work order JSON path.");
    if (options.verifyArtifactsPath && options.workOrderPath)
        errors.push("--verify-artifacts cannot be combined with a work order path.");
    if (options.verifyArtifactsPath && options.handoffPath)
        errors.push("--verify-artifacts cannot be combined with --from-handoff.");
    if (options.handoffPath && options.workOrderPath)
        errors.push("--from-handoff cannot be combined with a work order path.");
    if (options.verifyArtifactsPath && options.validateOnly)
        errors.push("--verify-artifacts cannot be combined with --validate-only.");
    return { options, errors };
}
function cliOverrides(options) {
    return {
        ...(options.artifactDir ? { artifactDir: options.artifactDir } : {}),
        ...(options.browserProvider ? { browserProvider: options.browserProvider } : {}),
        ...(options.autoDiscoverVerificationCommands === false ? { autoDiscoverVerificationCommands: false } : {}),
    };
}
