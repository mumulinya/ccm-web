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
exports.discoverProjectVerificationCommands = discoverProjectVerificationCommands;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SAFE_SCRIPT_NAME = /^[A-Za-z0-9:_-]+$/;
const PREFERRED_SCRIPTS = ["build", "test", "typecheck", "type-check", "check:types", "check", "lint"];
function packageManagerFor(workDir, manifest) {
    const declared = String(manifest?.packageManager || "").split("@")[0].toLowerCase();
    if (["npm", "pnpm", "yarn", "bun"].includes(declared))
        return declared;
    if (fs.existsSync(path.join(workDir, "pnpm-lock.yaml")))
        return "pnpm";
    if (fs.existsSync(path.join(workDir, "yarn.lock")))
        return "yarn";
    if (fs.existsSync(path.join(workDir, "bun.lock")) || fs.existsSync(path.join(workDir, "bun.lockb")))
        return "bun";
    return "npm";
}
function usableScript(name, value) {
    const body = String(value || "").trim();
    return SAFE_SCRIPT_NAME.test(name) && !!body && !/no test specified/i.test(body);
}
/**
 * Deterministically discovers existing verification scripts without executing
 * package lifecycle hooks or inventing commands. Explicit project configuration
 * remains authoritative; this is only the safe fallback when it is absent.
 */
function discoverProjectVerificationCommands(workDir = "", maxCommands = 4) {
    const root = String(workDir || "").trim();
    if (!root)
        return [];
    const packageFile = path.join(root, "package.json");
    if (!fs.existsSync(packageFile))
        return [];
    try {
        const manifest = JSON.parse(fs.readFileSync(packageFile, "utf-8").replace(/^\uFEFF/, ""));
        const scripts = manifest?.scripts && typeof manifest.scripts === "object" ? manifest.scripts : {};
        const manager = packageManagerFor(root, manifest);
        const selected = [];
        const semanticGroups = [
            ["build"],
            ["test:unit", "unit", "test"],
            ["typecheck", "type-check", "check:types", "types", "tsc"],
            ["check"],
            ["lint", "eslint"],
        ];
        for (const names of semanticGroups) {
            const script = names.find(name => usableScript(name, scripts[name]));
            if (!script)
                continue;
            const command = `${manager} run ${script}`;
            if (!selected.includes(command))
                selected.push(command);
            if (selected.length >= Math.max(1, Math.min(8, maxCommands)))
                break;
        }
        if (!selected.length) {
            for (const name of PREFERRED_SCRIPTS) {
                if (!usableScript(name, scripts[name]))
                    continue;
                selected.push(`${manager} run ${name}`);
                if (selected.length >= Math.max(1, Math.min(8, maxCommands)))
                    break;
            }
        }
        return selected;
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=project-verification-discovery.js.map