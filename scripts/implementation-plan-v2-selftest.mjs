#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const plan = require(path.join(root, "ccm-package", "dist", "agents", "implementation-plan.js"));
const source = fs.readFileSync(path.join(root, "backend", "agents", "implementation-plan.ts"), "utf8");
const skill = fs.readFileSync(path.join(root, "ccm-package", "templates", "skills", "ccm-implementation-plan-authoring", "SKILL.md"), "utf8");
assert.equal(plan.runImplementationPlanSelfTest().pass, true);
assert.match(source, /You are the CCM implementation planner/);
assert.match(source, /ccm-implementation-plan-v2/);
assert.match(skill, /Generate user-visible fields in the user's language/);
assert.match(skill, /sourceEvidenceIds/);
assert.match(skill, /revision/);
assert.doesNotMatch(skill, /隐藏思维/);
console.log("implementation-plan-v2-selftest: pass");
