import { TestAgentOptions } from "./types";

export interface TestAgentCliOptions {
  workOrderPath: string;
  handoffPath: string;
  verifyArtifactsPath: string;
  selfTestMatrix: boolean;
  selfTestNames: string[];
  selfTestPattern?: string;
  selfTestTimeoutMs?: number;
  selfTestStopOnFailure?: boolean;
  selfTestModulePath?: string;
  help: boolean;
  validateOnly: boolean;
  planOnly: boolean;
  invocationJson: boolean;
  summary: boolean;
  json: boolean;
  artifactDir?: string;
  browserProvider?: TestAgentOptions["browserProvider"];
  autoDiscoverVerificationCommands?: boolean;
}

export interface TestAgentCliParseResult {
  options: TestAgentCliOptions;
  errors: string[];
}

const BROWSER_PROVIDERS = new Set(["auto", "playwright", "mcp", "none"]);

export function testAgentCliUsage() {
  return [
    "Usage: node dist/test-agent/cli.js <work-order.json> [options]",
    "       node dist/test-agent/cli.js --from-handoff <handoff.json> [options]",
    "       node dist/test-agent/cli.js --verify-artifacts <artifact-manifest.json> [--summary|--json]",
    "       node dist/test-agent/cli.js --self-test-matrix [--self-test <name>] [--summary|--json]",
    "",
    "Options:",
    "  --validate-only              Validate the work order contract without executing checks.",
    "  --plan-only                  Print the normalized execution plan without running checks.",
    "  --invocation-json            Print the validated invocation result, including canAccept and artifact verification.",
    "  --from-handoff <file>        Build a work order from a group-main-agent handoff JSON file.",
    "  --verify-artifacts <file>    Verify an artifact-manifest.json integrity bundle.",
    "  --self-test-matrix           Run exported TestAgent self-tests in isolated child processes.",
    "  --self-test <name>           Run one named self-test export. Repeat or comma-separate names.",
    "  --self-test-pattern <text>   Run discovered self-tests whose names include text.",
    "  --self-test-timeout-ms <ms>  Per-self-test timeout in milliseconds.",
    "  --self-test-stop-on-failure  Stop the matrix after the first failed self-test.",
    "  --self-test-module <file>    Override the compiled self-test module path.",
    "  --summary                    Print a concise human summary instead of the full JSON report.",
    "  --json                       Print full JSON output. This is the default execution output.",
    "  --artifact-dir <dir>         Override report/artifact output directory.",
    "  --browser-provider <name>    Override browser provider: auto, playwright, mcp, none.",
    "  --no-auto-discover           Disable package.json verification command discovery.",
    "  -h, --help                   Show this help.",
  ].join("\n");
}

function readValue(args: string[], index: number, flag: string) {
  const arg = args[index];
  const prefix = `${flag}=`;
  if (arg.startsWith(prefix)) return { value: arg.slice(prefix.length), consumed: 1 };
  return { value: args[index + 1], consumed: 2 };
}

function appendListValues(target: string[], value: string) {
  for (const item of value.split(",")) {
    const trimmed = item.trim();
    if (trimmed) target.push(trimmed);
  }
}

function parsePositiveInteger(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseTestAgentCliArgs(args: string[]): TestAgentCliParseResult {
  const options: TestAgentCliOptions = {
    workOrderPath: "",
    handoffPath: "",
    verifyArtifactsPath: "",
    selfTestMatrix: false,
    selfTestNames: [],
    help: false,
    validateOnly: false,
    planOnly: false,
    invocationJson: false,
    summary: false,
    json: true,
  };
  const errors: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "--validate-only") {
      options.validateOnly = true;
    } else if (arg === "--plan-only") {
      options.planOnly = true;
    } else if (arg === "--invocation-json") {
      options.invocationJson = true;
    } else if (arg === "--verify-artifacts" || arg.startsWith("--verify-artifacts=")) {
      const { value, consumed } = readValue(args, i, "--verify-artifacts");
      if (!value || value.startsWith("--")) errors.push("--verify-artifacts requires an artifact manifest file.");
      else options.verifyArtifactsPath = value;
      i += consumed - 1;
    } else if (arg === "--self-test-matrix") {
      options.selfTestMatrix = true;
    } else if (arg === "--self-test" || arg === "--self-test-name" || arg.startsWith("--self-test=") || arg.startsWith("--self-test-name=")) {
      const flag = arg.startsWith("--self-test-name") ? "--self-test-name" : "--self-test";
      const { value, consumed } = readValue(args, i, flag);
      if (!value || value.startsWith("--")) errors.push(`${flag} requires a self-test export name.`);
      else appendListValues(options.selfTestNames, value);
      i += consumed - 1;
    } else if (arg === "--self-test-pattern" || arg.startsWith("--self-test-pattern=")) {
      const { value, consumed } = readValue(args, i, "--self-test-pattern");
      if (!value || value.startsWith("--")) errors.push("--self-test-pattern requires a text value.");
      else options.selfTestPattern = value;
      i += consumed - 1;
    } else if (arg === "--self-test-timeout-ms" || arg.startsWith("--self-test-timeout-ms=")) {
      const { value, consumed } = readValue(args, i, "--self-test-timeout-ms");
      const parsed = value && !value.startsWith("--") ? parsePositiveInteger(value) : null;
      if (!parsed) errors.push("--self-test-timeout-ms requires a positive integer millisecond value.");
      else options.selfTestTimeoutMs = parsed;
      i += consumed - 1;
    } else if (arg === "--self-test-stop-on-failure") {
      options.selfTestStopOnFailure = true;
    } else if (arg === "--self-test-module" || arg === "--self-test-module-path" || arg.startsWith("--self-test-module=") || arg.startsWith("--self-test-module-path=")) {
      const flag = arg.startsWith("--self-test-module-path") ? "--self-test-module-path" : "--self-test-module";
      const { value, consumed } = readValue(args, i, flag);
      if (!value || value.startsWith("--")) errors.push(`${flag} requires a self-test module file.`);
      else options.selfTestModulePath = value;
      i += consumed - 1;
    } else if (arg === "--from-handoff" || arg.startsWith("--from-handoff=")) {
      const { value, consumed } = readValue(args, i, "--from-handoff");
      if (!value || value.startsWith("--")) errors.push("--from-handoff requires a handoff JSON file.");
      else options.handoffPath = value;
      i += consumed - 1;
    } else if (arg === "--summary") {
      options.summary = true;
      options.json = false;
    } else if (arg === "--json") {
      options.json = true;
      options.summary = false;
    } else if (arg === "--no-auto-discover") {
      options.autoDiscoverVerificationCommands = false;
    } else if (arg === "--artifact-dir" || arg.startsWith("--artifact-dir=")) {
      const { value, consumed } = readValue(args, i, "--artifact-dir");
      if (!value || value.startsWith("--")) errors.push("--artifact-dir requires a directory value.");
      else options.artifactDir = value;
      i += consumed - 1;
    } else if (arg === "--browser-provider" || arg.startsWith("--browser-provider=")) {
      const { value, consumed } = readValue(args, i, "--browser-provider");
      if (!value || value.startsWith("--")) errors.push("--browser-provider requires one of: auto, playwright, mcp, none.");
      else if (!BROWSER_PROVIDERS.has(value)) errors.push(`Unsupported browser provider "${value}".`);
      else options.browserProvider = value as TestAgentOptions["browserProvider"];
      i += consumed - 1;
    } else if (arg.startsWith("--")) {
      errors.push(`Unknown option: ${arg}`);
    } else if (!options.workOrderPath) {
      options.workOrderPath = arg;
    } else {
      errors.push(`Unexpected argument: ${arg}`);
    }
  }

  if (!options.help && !options.workOrderPath && !options.handoffPath && !options.verifyArtifactsPath && !options.selfTestMatrix) errors.push("Missing work order JSON path.");
  if (options.verifyArtifactsPath && options.workOrderPath) errors.push("--verify-artifacts cannot be combined with a work order path.");
  if (options.verifyArtifactsPath && options.handoffPath) errors.push("--verify-artifacts cannot be combined with --from-handoff.");
  if (options.handoffPath && options.workOrderPath) errors.push("--from-handoff cannot be combined with a work order path.");
  if (options.verifyArtifactsPath && options.validateOnly) errors.push("--verify-artifacts cannot be combined with --validate-only.");
  if (options.verifyArtifactsPath && options.planOnly) errors.push("--verify-artifacts cannot be combined with --plan-only.");
  if (options.selfTestMatrix && options.workOrderPath) errors.push("--self-test-matrix cannot be combined with a work order path.");
  if (options.selfTestMatrix && options.handoffPath) errors.push("--self-test-matrix cannot be combined with --from-handoff.");
  if (options.selfTestMatrix && options.verifyArtifactsPath) errors.push("--self-test-matrix cannot be combined with --verify-artifacts.");
  if (options.selfTestMatrix && options.validateOnly) errors.push("--self-test-matrix cannot be combined with --validate-only.");
  if (options.selfTestMatrix && options.planOnly) errors.push("--self-test-matrix cannot be combined with --plan-only.");
  if (!options.selfTestMatrix && options.selfTestNames.length) errors.push("--self-test requires --self-test-matrix.");
  if (!options.selfTestMatrix && options.selfTestPattern) errors.push("--self-test-pattern requires --self-test-matrix.");
  if (!options.selfTestMatrix && options.selfTestTimeoutMs) errors.push("--self-test-timeout-ms requires --self-test-matrix.");
  if (!options.selfTestMatrix && options.selfTestStopOnFailure) errors.push("--self-test-stop-on-failure requires --self-test-matrix.");
  if (!options.selfTestMatrix && options.selfTestModulePath) errors.push("--self-test-module requires --self-test-matrix.");
  if (options.validateOnly && options.planOnly) errors.push("--validate-only cannot be combined with --plan-only.");
  if (options.invocationJson && options.planOnly) errors.push("--invocation-json cannot be combined with --plan-only.");
  if (options.invocationJson && options.validateOnly) errors.push("--invocation-json cannot be combined with --validate-only.");
  if (options.invocationJson && options.summary) errors.push("--invocation-json cannot be combined with --summary.");
  if (options.invocationJson && (options.verifyArtifactsPath || options.selfTestMatrix)) errors.push("--invocation-json requires a handoff or work order.");
  return { options, errors };
}

export function cliOverrides(options: TestAgentCliOptions): Partial<TestAgentOptions> {
  return {
    ...(options.artifactDir ? { artifactDir: options.artifactDir } : {}),
    ...(options.browserProvider ? { browserProvider: options.browserProvider } : {}),
    ...(options.autoDiscoverVerificationCommands === false ? { autoDiscoverVerificationCommands: false } : {}),
  };
}
