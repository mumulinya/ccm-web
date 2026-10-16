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
exports.commandDependencyPreflight = commandDependencyPreflight;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("./utils");
const acceptance_workspace_1 = require("../agents/acceptance-workspace");
/** Inspect only files/programs explicitly named by this invocation. No package
 * execution, dependency installation, stderr guessing or repository scan. */
function commandDependencyPreflight(command, root) {
    const invocation = (0, utils_1.verificationCommandInvocation)(command);
    if (invocation.error)
        return null; // The caller owns invocation authorization.
    const executable = path.basename(invocation.executable).replace(/\.(exe|cmd|bat)$/i, "").toLowerCase();
    const missing = { failure_code: "required_dependency_unavailable", failure_stage: "program_start", failure_kind: "environment" };
    if (executable === "node") {
        const entry = invocation.args[0];
        if (entry && !entry.startsWith("-")) {
            let file;
            try {
                file = (0, acceptance_workspace_1.pathInside)(root, path.relative(root, path.resolve(root, entry)));
            }
            catch {
                return { failure_code: "command_entry_not_authorized", failure_stage: "safety_gate", failure_kind: "permission" };
            }
            try {
                if (!fs.statSync(file).isFile())
                    return { ...missing, failure_code: "command_entry_missing" };
            }
            catch {
                return { ...missing, failure_code: "command_entry_missing" };
            }
        }
    }
    if (["npm", "pnpm", "yarn"].includes(executable)) {
        const args = invocation.args;
        const script = args[0] === "run" || args[0] === "run-script" ? args[1] : ["test", "start"].includes(args[0]) ? args[0] : "";
        if (!script)
            return null;
        let manifest;
        try {
            const file = (0, acceptance_workspace_1.pathInside)(root, "package.json");
            if (fs.statSync(file).size > 512 * 1024)
                return null;
            manifest = JSON.parse(fs.readFileSync(file, "utf8"));
        }
        catch {
            return null;
        }
        if (typeof manifest.scripts?.[script] !== "string")
            return { failure_code: "declared_script_missing", failure_stage: "safety_gate", failure_kind: "criteria_conflict" };
        const nested = (0, utils_1.splitVerificationCommand)(manifest.scripts[script]);
        if (nested.error || !nested.tokens.length || nested.tokens.some(token => ["&&", "||", ";", "|"].includes(token)))
            return null;
        const tool = path.basename(nested.tokens[0]).replace(/\.(exe|cmd|bat)$/i, "");
        if (tool === "node")
            return commandDependencyPreflight(manifest.scripts[script], root);
        const declared = { ...manifest.dependencies, ...manifest.devDependencies, ...manifest.optionalDependencies };
        if (Object.prototype.hasOwnProperty.call(declared, tool)) {
            // Node package tools may be hoisted to an ancestor node_modules directory.
            let directory = root;
            while (true) {
                if (["", ".cmd", ".exe"].some(ext => fs.existsSync(path.join(directory, "node_modules", ".bin", tool + ext))))
                    return null;
                const parent = path.dirname(directory);
                if (parent === directory)
                    break;
                directory = parent;
            }
            return missing;
        }
    }
    return null;
}
//# sourceMappingURL=command-preflight.js.map