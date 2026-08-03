import continuityModule from "../ccm-package/dist/system/main-agent-post-compact-continuity.js";

const { runMainAgentPostCompactContinuitySelfTest } = continuityModule;

const result = runMainAgentPostCompactContinuitySelfTest();
if (!result?.pass) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  pass: true,
  schema: result.manifest?.schema,
  restoredSkills: result.restored?.restoredSkillNames || [],
  restoredMcp: result.restored?.loadedToolNames || [],
  isolated: result.isolated?.status,
  changedSkill: result.changedSkill?.dropped || [],
  changedSchema: result.changedSchema?.dropped || [],
}, null, 2));
