import * as fs from "fs";
import * as path from "path";

const SAFE_SCRIPT_NAME = /^[A-Za-z0-9:_-]+$/;
const PREFERRED_SCRIPTS = ["build", "test", "typecheck", "type-check", "check:types", "check", "lint"];

function packageManagerFor(workDir: string, manifest: any) {
  const declared = String(manifest?.packageManager || "").split("@")[0].toLowerCase();
  if (["npm", "pnpm", "yarn", "bun"].includes(declared)) return declared;
  if (fs.existsSync(path.join(workDir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(workDir, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(workDir, "bun.lock")) || fs.existsSync(path.join(workDir, "bun.lockb"))) return "bun";
  return "npm";
}

function usableScript(name: string, value: any) {
  const body = String(value || "").trim();
  return SAFE_SCRIPT_NAME.test(name) && !!body && !/no test specified/i.test(body);
}

/**
 * Deterministically discovers existing verification scripts without executing
 * package lifecycle hooks or inventing commands. Explicit project configuration
 * remains authoritative; this is only the safe fallback when it is absent.
 */
export function discoverProjectVerificationCommands(workDir = "", maxCommands = 4) {
  const root = String(workDir || "").trim();
  if (!root) return [];
  const packageFile = path.join(root, "package.json");
  if (!fs.existsSync(packageFile)) return [];
  try {
    const manifest = JSON.parse(fs.readFileSync(packageFile, "utf-8").replace(/^\uFEFF/, ""));
    const scripts = manifest?.scripts && typeof manifest.scripts === "object" ? manifest.scripts : {};
    const manager = packageManagerFor(root, manifest);
    const selected: string[] = [];
    const semanticGroups = [
      ["build"],
      ["test:unit", "unit", "test"],
      ["typecheck", "type-check", "check:types", "types", "tsc"],
      ["check"],
      ["lint", "eslint"],
    ];
    for (const names of semanticGroups) {
      const script = names.find(name => usableScript(name, scripts[name]));
      if (!script) continue;
      const command = `${manager} run ${script}`;
      if (!selected.includes(command)) selected.push(command);
      if (selected.length >= Math.max(1, Math.min(8, maxCommands))) break;
    }
    if (!selected.length) {
      for (const name of PREFERRED_SCRIPTS) {
        if (!usableScript(name, scripts[name])) continue;
        selected.push(`${manager} run ${name}`);
        if (selected.length >= Math.max(1, Math.min(8, maxCommands))) break;
      }
    }
    return selected;
  } catch {
    return [];
  }
}
