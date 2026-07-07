"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.planVerificationCommands = planVerificationCommands;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("./utils");
const SCRIPT_NAME_PATTERN = /^[A-Za-z0-9:_-]+$/;
function readPackageJson(workDir) {
    const packageJsonPath = path.join(workDir, "package.json");
    if (!fs.existsSync(packageJsonPath))
        return { packageJsonPath, manifest: null };
    try {
        return { packageJsonPath, manifest: JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) };
    }
    catch {
        return { packageJsonPath, manifest: null, parseFailed: true };
    }
}
function packageManagerFor(workDir, manifest) {
    const packageManager = String(manifest?.packageManager || "").split("@")[0];
    if (["npm", "pnpm", "yarn", "bun"].includes(packageManager))
        return packageManager;
    if (fs.existsSync(path.join(workDir, "pnpm-lock.yaml")))
        return "pnpm";
    if (fs.existsSync(path.join(workDir, "yarn.lock")))
        return "yarn";
    if (fs.existsSync(path.join(workDir, "bun.lock")) || fs.existsSync(path.join(workDir, "bun.lockb")))
        return "bun";
    return "npm";
}
function commandFor(packageManager, script) {
    return `${packageManager} run ${script}`;
}
function scriptLooksUsable(name, value) {
    if (!SCRIPT_NAME_PATTERN.test(name))
        return false;
    const text = String(value || "").toLowerCase();
    if (!text.trim())
        return false;
    if (text.includes("no test specified"))
        return false;
    return true;
}
function firstScript(scripts, names) {
    return names.find(name => scriptLooksUsable(name, scripts[name]));
}
function candidateGroups(requiredChecks) {
    const groups = [];
    if ((0, utils_1.hasRequiredCheck)(requiredChecks, /(^|[_:-])build($|[_:-])|build/i)) {
        groups.push({ reason: "build", scripts: ["build"] });
    }
    if ((0, utils_1.hasRequiredCheck)(requiredChecks, /unit[_:-]?tests?|tests?|test[_:-]?suite/i)) {
        groups.push({ reason: "unit_tests", scripts: ["test:unit", "unit", "test"] });
    }
    if ((0, utils_1.hasRequiredCheck)(requiredChecks, /type[_:-]?check|typescript|tsc|types/i)) {
        groups.push({ reason: "typecheck", scripts: ["typecheck", "type-check", "check:types", "types", "tsc"] });
    }
    if ((0, utils_1.hasRequiredCheck)(requiredChecks, /lint|eslint/i)) {
        groups.push({ reason: "lint", scripts: ["lint", "eslint"] });
    }
    if ((0, utils_1.hasRequiredCheck)(requiredChecks, /browser[_:-]?e2e|(^|[_:-])e2e($|[_:-])|playwright|cypress/i)) {
        groups.push({ reason: "browser_e2e", scripts: ["test:e2e", "e2e", "playwright", "test:playwright", "cypress"] });
    }
    const seen = new Set();
    return groups.filter(group => {
        const key = `${group.reason}:${group.scripts.join(",")}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function uniqueCommands(commands) {
    const seen = new Set();
    return commands.filter(command => {
        const key = command.trim().toLowerCase();
        if (!key || seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function planProjectCommands(project, requiredChecks) {
    const groups = candidateGroups(requiredChecks);
    if (!groups.length)
        return { project, planned: [], issues: [] };
    const { packageJsonPath, manifest, parseFailed } = readPackageJson(project.workDir);
    const issues = [];
    if (!manifest || typeof manifest !== "object") {
        issues.push({
            severity: "warning",
            code: parseFailed ? "package_json_parse_failed" : "package_json_missing",
            message: parseFailed
                ? `Could not parse package.json while auto-discovering verification commands: ${packageJsonPath}`
                : `No package.json found while auto-discovering verification commands: ${packageJsonPath}`,
            project: project.name,
        });
        return { project, planned: [], issues };
    }
    const scripts = manifest.scripts && typeof manifest.scripts === "object" ? manifest.scripts : {};
    const packageManager = packageManagerFor(project.workDir, manifest);
    const existing = new Set(project.verificationCommands.map(command => command.trim().toLowerCase()));
    const planned = [];
    const commands = [...project.verificationCommands];
    for (const group of groups) {
        const script = firstScript(scripts, group.scripts);
        if (!script) {
            issues.push({
                severity: "warning",
                code: "verification_script_missing",
                message: `No package.json script found for required check "${group.reason}". Tried: ${group.scripts.join(", ")}.`,
                project: project.name,
            });
            continue;
        }
        const command = commandFor(packageManager, script);
        const key = command.trim().toLowerCase();
        if (existing.has(key))
            continue;
        existing.add(key);
        commands.push(command);
        planned.push({
            project: project.name,
            command,
            script,
            reason: group.reason,
            source: packageJsonPath,
            packageManager,
        });
    }
    return {
        project: {
            ...project,
            verificationCommands: uniqueCommands(commands),
        },
        planned,
        issues,
    };
}
function planVerificationCommands(workOrder, issues = []) {
    if (!workOrder.options.autoDiscoverVerificationCommands) {
        return { workOrder, issues, plannedCommands: [] };
    }
    const plannedCommands = [];
    const nextIssues = [...issues];
    const projects = workOrder.projects.map(project => {
        const result = planProjectCommands(project, workOrder.requiredChecks);
        plannedCommands.push(...result.planned);
        nextIssues.push(...result.issues);
        return result.project;
    });
    const projectsWithPlannedCommands = new Set(plannedCommands.map(item => item.project));
    const filteredIssues = nextIssues.filter(issue => {
        if (issue.code !== "no_executable_checks" || !issue.project)
            return true;
        return !projectsWithPlannedCommands.has(issue.project);
    });
    return {
        workOrder: {
            ...workOrder,
            projects,
            metadata: {
                ...workOrder.metadata,
                autoDiscoveredVerificationCommands: plannedCommands,
            },
        },
        issues: filteredIssues,
        plannedCommands,
    };
}
//# sourceMappingURL=command-planner.js.map