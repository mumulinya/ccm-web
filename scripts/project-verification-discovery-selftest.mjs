import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { discoverProjectVerificationCommands } = require("../ccm-package/dist/agents/project-verification-discovery.js");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-verification-discovery-"));
try {
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    private: true,
    scripts: {
      build: "node build.mjs",
      test: "node test.mjs",
      typecheck: "tsc --noEmit",
      lint: "eslint .",
      dev: "vite",
    },
  }));
  assert.deepEqual(
    discoverProjectVerificationCommands(root),
    ["npm run build", "npm run test", "npm run typecheck", "npm run lint"],
  );
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: { test: "echo Error: no test specified && exit 1" } }));
  assert.deepEqual(discoverProjectVerificationCommands(root), []);
  assert.deepEqual(discoverProjectVerificationCommands(path.join(root, "missing")), []);
  console.log("project verification discovery self-test passed");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
