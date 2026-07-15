#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const reportRoot = path.join(repoRoot, "scratch", "internal-skill-boundary-selftest");
const isolatedHome = path.join(reportRoot, "home");
const templateRoot = path.join(repoRoot, "ccm-package", "templates", "skills");
fs.rmSync(reportRoot, { recursive: true, force: true });
fs.mkdirSync(isolatedHome, { recursive: true });
process.env.USERPROFILE = isolatedHome;
process.env.HOME = isolatedHome;
process.env.CCM_ROLE_SKILL_TEMPLATE_ROOT = templateRoot;

const catalog = require("../ccm-package/dist/skills/internal-skill-catalog.js");
const db = require("../ccm-package/dist/core/db.js");
const roleSkills = require("../ccm-package/dist/skills/role-skills.js");
const toolsModule = require("../ccm-package/dist/modules/tools/tools.js");
const marketplace = require("../ccm-package/dist/modules/tools/marketplace.js");

assert.ok(path.resolve(db.SKILL_PACKAGES_DIR).startsWith(path.resolve(isolatedHome)), "self-test did not isolate the external Skill directory");
const names = Object.values(catalog.CCM_ROLE_SKILL_NAMES);
assert.equal(names.length, 14);

const firstName = names[0];
const legacyCopy = path.join(db.SKILL_PACKAGES_DIR, firstName);
fs.mkdirSync(legacyCopy, { recursive: true });
fs.writeFileSync(path.join(legacyCopy, "SKILL.md"), "legacy copy", "utf-8");

const installation = roleSkills.ensureRoleSkillsInstalled({ force: true });
assert.equal(installation.available.length, 14);
assert.equal(fs.existsSync(legacyCopy), false, "legacy internal copy remained in the external package directory");

const records = db.loadSkills();
const internalRecords = records.filter(item => item.origin === "internal");
assert.equal(internalRecords.length, 14);
for (const record of internalRecords) {
  assert.equal(record.immutable, true);
  assert.equal(record.deletable, false);
  assert.equal(record.editable, false);
  assert.equal(record.disableable, false);
  assert.equal(record.scope, "ccm-internal");
  assert.equal(record.sourceType, "builtin");
  assert.ok(path.resolve(record.packagePath).startsWith(path.resolve(templateRoot) + path.sep));
  assert.equal(path.resolve(record.packagePath).startsWith(path.resolve(db.SKILL_PACKAGES_DIR) + path.sep), false);
  assert.ok(fs.existsSync(record.skillFile));
}

assert.throws(() => db.saveSkill({ name: firstName, enabled: false }), /不能修改、停用或覆盖/);
assert.throws(() => db.deleteSkill(firstName), /不能删除/);
assert.ok(fs.existsSync(path.join(templateRoot, firstName, "SKILL.md")), "failed mutation removed package-owned SKILL.md");

const metadataFile = path.join(db.SKILLS_DIR, `${firstName}.json`);
fs.unlinkSync(metadataFile);
roleSkills.ensureRoleSkillsInstalled({ force: true });
assert.ok(fs.existsSync(metadataFile), "startup reconciliation did not repair internal metadata");

const externalName = "boundary-external-skill";
const externalPackage = path.join(db.SKILL_PACKAGES_DIR, externalName);
fs.mkdirSync(externalPackage, { recursive: true });
fs.writeFileSync(path.join(externalPackage, "SKILL.md"), `---\nname: ${externalName}\ndescription: isolated external Skill\n---\n\nRun the external workflow.\n`, "utf-8");
db.saveSkill({
  name: externalName,
  type: "skill",
  prompt: "Run the external workflow.",
  enabled: true,
  packagePath: externalPackage,
  origin: "external",
  scope: "external",
  sourceType: "marketplace",
});
db.saveSkill({ ...db.loadSkills().find(item => item.name === externalName), enabled: false });
assert.equal(db.loadSkills().find(item => item.name === externalName)?.enabled, false);

const fakeReservedCopy = path.join(db.SKILL_PACKAGES_DIR, names[1]);
fs.mkdirSync(fakeReservedCopy, { recursive: true });
fs.writeFileSync(path.join(fakeReservedCopy, "SKILL.md"), `---\nname: ${names[1]}\ndescription: reserved collision\n---\n`, "utf-8");
const customizations = toolsModule.loadCustomSkills();
assert.ok(customizations.some(item => item.name === externalName), "external Skill was not visible in customization scan");
assert.equal(customizations.some(item => catalog.isCcmInternalSkillName(item.name)), false, "internal Skill leaked into external customization scan");

for (const mode of ["install", "update"]) {
  await assert.rejects(
    marketplace.installMarketplaceItemWithStore({ type: "skill", name: firstName, prompt: "reserved" }, {}, mode),
    /不能从商城安装或覆盖|不能通过商城更新或覆盖/,
  );
}
await assert.rejects(
  marketplace.uninstallMarketplaceItemWithStore({ type: "skill", name: firstName }),
  /不能通过商城卸载/,
);

async function requestSkillApi(pathname, { method = "POST", payload = null, parsed = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = new PassThrough();
    req.method = method;
    const response = { status: 0, body: "" };
    const res = {
      writeHead(status) { response.status = status; },
      end(body = "") {
        response.body = String(body || "");
        resolve(response);
      },
    };
    try {
      assert.equal(toolsModule.handleToolsAndMetricsApi(pathname, req, res, parsed), true);
      req.end(payload === null ? "" : JSON.stringify(payload));
    } catch (error) {
      reject(error);
    }
  });
}

const manualResponse = await requestSkillApi("/api/skills/manual", {
  method: "GET",
  parsed: { query: { name: firstName } },
});
const editResponse = await requestSkillApi("/api/skills", { payload: { name: firstName, enabled: false } });
const deleteResponse = await requestSkillApi("/api/skills/delete", { payload: { name: firstName } });
assert.equal(manualResponse.status, 200);
assert.equal(JSON.parse(manualResponse.body).skill.readOnly, true);
assert.match(JSON.parse(manualResponse.body).skill.content, new RegExp(`name:\\s*${firstName}`));
assert.equal(editResponse.status, 403);
assert.equal(deleteResponse.status, 403);
assert.equal(JSON.parse(editResponse.body).code, "CCM_INTERNAL_SKILL_IMMUTABLE");
assert.equal(JSON.parse(deleteResponse.body).code, "CCM_INTERNAL_SKILL_IMMUTABLE");

db.deleteSkill(externalName);
assert.equal(db.loadSkills().some(item => item.name === externalName), false);
assert.equal(fs.existsSync(externalPackage), false);

const uiSource = fs.readFileSync(path.join(repoRoot, "frontend", "src", "components", "tools", "ToolsConfig.vue"), "utf-8");
assert.match(uiSource, /v-for="tool in internalSkills"/);
assert.match(uiSource, /随项目和 npm 包发布，系统自动维护，不能停用、编辑或删除/);
assert.match(uiSource, /openCatalogSkillManual\(tool\)/);
assert.match(uiSource, /查看说明/);
assert.match(uiSource, /v-for="tool in externalSkills"/);
assert.match(uiSource, /toggleEnabled\('skill', tool\)/);
assert.match(uiSource, /deleteTool\('skill', tool\.name\)/);

const report = {
  ok: true,
  generatedAt: new Date().toISOString(),
  internalSkillCount: internalRecords.length,
  packageRoot: templateRoot,
  externalRoot: db.SKILL_PACKAGES_DIR,
  legacyCopyRemoved: !fs.existsSync(legacyCopy),
  metadataRepaired: fs.existsSync(metadataFile),
  apiStatuses: { manual: manualResponse.status, edit: editResponse.status, delete: deleteResponse.status },
  externalLifecycle: "create-update-delete",
  customizationNames: customizations.map(item => item.name),
};
fs.writeFileSync(path.join(reportRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf-8");
console.log(JSON.stringify(report, null, 2));
