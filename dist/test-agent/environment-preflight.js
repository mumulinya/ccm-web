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
exports.preflightVerificationEnvironment = preflightVerificationEnvironment;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const utils_1 = require("./utils");
const registry_1 = require("./browser/registry");
const shared_1 = require("./browser/shared");
const authentication_1 = require("./browser/authentication");
const acceptance_workspace_1 = require("../agents/acceptance-workspace");
const verification_identity_1 = require("./verification-identity");
const command_preflight_1 = require("./command-preflight");
function programAvailable(executable, workDir, env) {
    const directories = path.isAbsolute(executable) || executable.includes("/") || executable.includes("\\") ? [""] : String(env.PATH || env.Path || "").split(path.delimiter);
    const extensions = process.platform === "win32" && !path.extname(executable) ? ["", ...String(env.PATHEXT || ".COM;.EXE;.BAT;.CMD").split(";")] : [""];
    return directories.some(dir => extensions.some(ext => {
        const file = dir ? path.join(dir, executable + ext) : path.resolve(workDir, executable + ext);
        try {
            return fs.statSync(file).isFile();
        }
        catch {
            return false;
        }
    }));
}
/** No subprocess, model call, installation, login or target request. */
async function preflightVerificationEnvironment(workOrder, runtime, phase) {
    const failures = [];
    const fail = (project, code, kind, stage) => failures.push({ project, status: "blocked", failure_code: code, failure_kind: kind, failure_stage: stage });
    const configurations = [];
    const identity = (0, verification_identity_1.testAgentVerificationIdentity)(workOrder.taskId);
    if (identity.status === "conflict")
        fail("", "verification_identity_conflict", "reconciliation", "safety_gate");
    for (const project of workOrder.projects) {
        const env = (0, utils_1.buildTestAgentSubprocessEnv)({ ...project.env, ...runtime.runtimeProjectEnvironments?.[project.name] });
        let root = "";
        try {
            root = await fs.promises.realpath(project.workDir);
            const allowed = await Promise.all((runtime.allowedWorkDirs || []).map(dir => fs.promises.realpath(dir).catch(() => "")));
            if (!allowed.some(dir => dir && (root === dir || (!path.isAbsolute(path.relative(dir, root)) && !path.relative(dir, root).split(path.sep).includes("..")))))
                fail(project.name, "workspace_not_authorized", "permission", "safety_gate");
        }
        catch (error) {
            if (["EACCES", "EPERM"].includes(error?.code))
                fail(project.name, "workspace_permission_denied", "permission", "safety_gate");
            else
                fail(project.name, "workspace_missing", "environment", "program_start");
        }
        const commands = [...project.verificationCommands, ...(project.devServerCommand ? [project.devServerCommand] : [])];
        for (const command of commands) {
            const invocation = (0, utils_1.verificationCommandInvocation)(command);
            if (invocation.error)
                fail(project.name, "command_invocation_invalid", "criteria_conflict", "safety_gate");
            else if (!programAvailable(invocation.executable, project.workDir, env))
                fail(project.name, "program_not_found", "environment", "program_start");
            else {
                const dependency = (0, command_preflight_1.commandDependencyPreflight)(command, project.workDir);
                if (dependency)
                    failures.push({ project: project.name, status: "blocked", ...dependency });
            }
        }
        for (const url of [project.targetUrl, project.startupUrl].filter(Boolean)) {
            if (!(0, utils_1.validateTestAgentUrl)(url).valid)
                fail(project.name, "test_target_not_authorized", "permission", "safety_gate");
        }
        for (const check of (0, shared_1.checksForProject)(project, workOrder.acceptanceCriteria)) {
            const references = (0, authentication_1.browserCheckAuthenticationEnvNames)(check);
            for (const name of references)
                if (!env[name])
                    fail(project.name, "credential_reference_unavailable", "permission", "authentication");
            for (const source of [check, ...(check.sessions || [])])
                if ((0, authentication_1.browserStorageStatePath)(source)) {
                    try {
                        const configured = (0, authentication_1.browserStorageStatePath)(source);
                        const relative = path.relative(project.workDir, path.resolve(project.workDir, configured));
                        (0, acceptance_workspace_1.pathInside)(project.workDir, relative);
                        (0, authentication_1.loadBrowserStorageState)({ ...project, env: env }, source);
                    }
                    catch {
                        fail(project.name, "authentication_state_unavailable", "evidence", "authentication");
                    }
                }
        }
        configurations.push({ name: project.name, root, commands, targetUrl: project.targetUrl, startupUrl: project.startupUrl, checks: project.browserChecks, credentialNames: Object.keys(env).sort() });
    }
    const providers = (0, shared_1.wantsBrowser)(workOrder) ? await (0, registry_1.collectBrowserProviderPreflight)(workOrder, runtime) : [];
    if ((0, shared_1.wantsBrowser)(workOrder) && !providers.some(provider => provider.available))
        fail("", "browser_capability_unavailable", "evidence", "program_start");
    const bindingChecksum = (0, crypto_1.createHash)("sha256").update(JSON.stringify({ identity, workOrderId: workOrder.id,
        revision: workOrder.metadata?.acceptanceContract?.revision, configurations })).digest("hex");
    return { schema: "ccm-test-agent-preflight-v1", phase, status: failures.length ? "blocked" : "passed", identity, bindingChecksum, failures, providers };
}
//# sourceMappingURL=environment-preflight.js.map