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
exports.CCM_ROLE_SKILL_NAMES = void 0;
exports.ensureRoleSkillsInstalled = ensureRoleSkillsInstalled;
exports.isRoleSkillWorkRequest = isRoleSkillWorkRequest;
exports.selectRoleSkills = selectRoleSkills;
exports.buildSelectedSkillUsageDirective = buildSelectedSkillUsageDirective;
exports.buildModelSelectableSkillCatalog = buildModelSelectableSkillCatalog;
exports.buildRoleSkillPrompt = buildRoleSkillPrompt;
exports.runRoleSkillSelectionSelfTest = runRoleSkillSelectionSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("../core/db");
const internal_skill_catalog_1 = require("./internal-skill-catalog");
var internal_skill_catalog_2 = require("./internal-skill-catalog");
Object.defineProperty(exports, "CCM_ROLE_SKILL_NAMES", { enumerable: true, get: function () { return internal_skill_catalog_2.CCM_ROLE_SKILL_NAMES; } });
const ROLE_SKILL_CATALOG = internal_skill_catalog_1.CCM_INTERNAL_SKILL_CATALOG;
let installationChecked = false;
function templateRoot() {
    const configured = String(process.env.CCM_ROLE_SKILL_TEMPLATE_ROOT || "").trim();
    if (configured)
        return path.resolve(configured);
    return path.resolve(__dirname, "..", "..", "templates", "skills");
}
function listFiles(root, current = root) {
    if (!fs.existsSync(current))
        return [];
    return fs.readdirSync(current, { withFileTypes: true }).flatMap(entry => {
        const absolute = path.join(current, entry.name);
        return entry.isDirectory() ? listFiles(root, absolute) : [path.relative(root, absolute).replace(/\\/g, "/")];
    }).sort();
}
function packageFingerprint(root) {
    const digest = crypto.createHash("sha256");
    for (const relative of listFiles(root)) {
        digest.update(relative);
        digest.update(fs.readFileSync(path.join(root, relative)));
    }
    return digest.digest("hex").slice(0, 20);
}
function packageStats(root) {
    const files = listFiles(root);
    return {
        files: files.length,
        totalBytes: files.reduce((sum, relative) => sum + fs.statSync(path.join(root, relative)).size, 0),
    };
}
function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.${crypto.randomBytes(3).toString("hex")}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
    try {
        fs.renameSync(temporary, file);
    }
    catch {
        try {
            if (fs.existsSync(file))
                fs.unlinkSync(file);
        }
        catch { }
        fs.renameSync(temporary, file);
    }
}
function ensureRoleSkillsInstalled(options = {}) {
    if (installationChecked && !options.force)
        return { installed: [], available: ROLE_SKILL_CATALOG.map(item => item.name) };
    const sourceRoot = templateRoot();
    const installed = [];
    const available = [];
    fs.mkdirSync(db_1.SKILLS_DIR, { recursive: true });
    for (const definition of ROLE_SKILL_CATALOG) {
        const source = path.join(sourceRoot, definition.name);
        const sourceSkill = path.join(source, "SKILL.md");
        if (!fs.existsSync(sourceSkill))
            continue;
        const contentHash = packageFingerprint(source);
        available.push(definition.name);
        const catalogFile = path.join(db_1.SKILLS_DIR, `${definition.name}.json`);
        let previous = {};
        try {
            previous = JSON.parse(fs.readFileSync(catalogFile, "utf-8"));
        }
        catch { }
        if (contentHash !== previous?.contentHash || path.resolve(previous?.packagePath || "") !== path.resolve(source)) {
            installed.push(definition.name);
        }
        writeJsonAtomic(catalogFile, {
            ...previous,
            name: definition.name,
            type: "skill",
            description: definition.description,
            prompt: "",
            enabled: true,
            version: "1.0.0",
            author: "CCM",
            packagePath: source,
            skillFile: sourceSkill,
            packageStats: packageStats(source),
            contentHash,
            origin: "internal",
            scope: "ccm-internal",
            sourceType: "builtin",
            immutable: true,
            deletable: false,
            editable: false,
            disableable: false,
            systemManaged: true,
            roleSkill: true,
            marketplace: {
                source: { id: "ccm-role-skills", label: "CCM Role Skills", kind: "builtin", trust: "official" },
                itemId: `ccm-role-skills:skill:${definition.name}`,
                homepage: "",
            },
            updated_at: contentHash === previous?.contentHash && previous?.updated_at
                ? previous.updated_at
                : new Date().toISOString(),
        });
        // Older releases copied built-ins into the external package directory.
        // Reserved names now always resolve to the package-owned template above.
        const legacyCopy = path.join(db_1.SKILL_PACKAGES_DIR, definition.name);
        const relative = path.relative(path.resolve(db_1.SKILL_PACKAGES_DIR), path.resolve(legacyCopy));
        if (path.resolve(source) !== path.resolve(legacyCopy)
            && relative
            && !relative.startsWith("..")
            && !path.isAbsolute(relative)
            && fs.existsSync(legacyCopy)) {
            fs.rmSync(legacyCopy, { recursive: true, force: true });
        }
    }
    installationChecked = true;
    return { installed, available };
}
function skillBody(name) {
    ensureRoleSkillsInstalled();
    const skillPath = path.join(templateRoot(), name, "SKILL.md");
    if (!fs.existsSync(skillPath))
        return { skillPath, body: "" };
    const markdown = fs.readFileSync(skillPath, "utf-8").replace(/^\uFEFF/, "");
    const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
    return { skillPath, body };
}
function trustedWorkSource(source = "") {
    return /^(?:task|cron|mission|global-mission|daily[_-]?dev|auto[_-]?dev|rework|test-agent)/i.test(String(source || "").trim());
}
function isRoleSkillWorkRequest(message = "", options = {}) {
    void message;
    return options.forceWork === true
        || trustedWorkSource(options.source)
        || options.modelDecision?.actionRequired === true
        || (options.selectedSkillNames || options.modelDecision?.selectedSkills || []).length > 0;
}
function selectRoleSkills(role, taskText = "", options = {}) {
    ensureRoleSkillsInstalled();
    const work = role === "project-child-agent" || role === "test-agent" || isRoleSkillWorkRequest(taskText, options);
    const planAuthoring = options.planAuthoring === true
        && (role === "group-main-agent" || role === "project-main-agent");
    const planAuthoringOnly = planAuthoring && !work;
    if (!work && !planAuthoring)
        return [];
    const rows = [];
    const phase = options.phase || (role === "test-agent" ? "verification" : role === "project-child-agent" ? "execution" : "planning");
    const add = (name, kind, reason) => rows.push({ name, kind, reason });
    if (planAuthoring) {
        add(internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.implementationPlanAuthoring, "workflow", "The user selected plan authoring; this turn must produce a user-confirmable plan card.");
    }
    if (!planAuthoringOnly && role === "global-agent") {
        add(internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.global, "role", "Route and supervise work across groups and projects.");
    }
    if (!planAuthoringOnly && (role === "group-main-agent" || role === "project-main-agent")) {
        add(internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.group, "role", role === "project-main-agent" ? "Plan, dispatch, and review work for one project." : "Plan, dispatch, and review group work.");
        if (phase === "review" || phase === "summary") {
            add(internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.deliveryReviewRework, "workflow", "Review receipts and produce evidence-based rework when needed.");
            add(internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.receipt, "shared", "Read the unified child-Agent delivery receipt.");
            add(internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.evidence, "shared", "Map acceptance criteria to real evidence.");
        }
        else {
            add(internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.taskDecomposition, "workflow", "Decompose and route the current delivery work.");
        }
    }
    if (role === "project-child-agent") {
        add(internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.project, "role", "Implement and verify changes within the assigned scope.");
        add(internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.projectSourceResearch, "workflow", "Confirm current source and project conventions before editing.");
        add(internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.receipt, "shared", "Return an auditable receipt to the main Agent.");
    }
    if (role === "test-agent") {
        add(internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.test, "role", "Independently verify acceptance and reach conservative conclusions.");
        add(internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.evidence, "shared", "Bind acceptance criteria to reproducible evidence.");
    }
    const roleRoots = new Set([
        internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.global,
        internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.group,
        internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.project,
        internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.test,
    ]);
    const modelSelected = options.selectedSkillNames || options.modelDecision?.selectedSkills || [];
    const definitions = new Map(ROLE_SKILL_CATALOG.map(item => [item.name, item]));
    if (!planAuthoringOnly) {
        for (const rawName of modelSelected) {
            const name = String(rawName || "").trim();
            if (!definitions.has(name) || roleRoots.has(name))
                continue;
            if (name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.implementationPlanAuthoring && !planAuthoring)
                continue;
            add(name, name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.receipt || name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.evidence ? "shared" : "workflow", "Selected by the orchestration model from the complete task semantics.");
        }
    }
    const defaultMaxSkills = role === "project-child-agent" || role === "group-main-agent" || role === "project-main-agent" ? 6 : 4;
    const maxSkills = Math.max(1, Math.min(6, Number(options.maxSkills || defaultMaxSkills)));
    const seen = new Set();
    return rows.filter(row => !seen.has(row.name) && !!seen.add(row.name)).slice(0, maxSkills).map(row => {
        const loaded = skillBody(row.name);
        return {
            ...row,
            role,
            packagePath: path.join(templateRoot(), row.name),
            skillPath: loaded.skillPath,
            body: loaded.body,
        };
    });
}
function buildSelectedSkillUsageDirective(selected) {
    if (!selected.length)
        return "";
    return [
        "[CCM selected Skills for this work order]",
        "These Skills are assigned execution methods, not optional catalog entries. Read and apply each SKILL.md before work; read references only when needed.",
        ...selected.map(item => `- Skill:${item.name}: ${item.reason}`),
        "In CCM_AGENT_RECEIPT, report each Skill actually used under memoryUsed/Skill usage. If a selected Skill was not used, explain why; never fabricate usage.",
        "CCM_AGENT_RECEIPT is response data, not a workspace artifact. Return it in the final response or submit_result; never create a receipt file unless its path is explicitly authorized by the work order.",
    ].join("\n");
}
function buildModelSelectableSkillCatalog() {
    return [
        "[CCM model-selectable Skill catalog]",
        "Select at most six entries in workflowDecision.selectedSkills from the complete task semantics; never match mechanically by keyword.",
        ...ROLE_SKILL_CATALOG.map(item => `- ${item.name}: ${item.description}`),
    ].join("\n");
}
function buildRoleSkillPrompt(role, taskText = "", options = {}) {
    const selected = selectRoleSkills(role, taskText, options).filter(item => item.body);
    if (!selected.length)
        return { names: [], prompt: "", selected };
    const sections = selected.map(item => `## Skill:${item.name}\n${item.body}`);
    return {
        names: selected.map(item => item.name),
        prompt: `[CCM role Skills for this turn]\n${sections.join("\n\n")}`.slice(0, 12_000),
        selected,
    };
}
function runRoleSkillSelectionSelfTest() {
    const installation = ensureRoleSkillsInstalled({ force: true });
    const ordinaryGlobal = selectRoleSkills("global-agent", "你好，介绍一下你自己");
    const ordinaryGroup = selectRoleSkills("group-main-agent", "这个项目是做什么的？");
    const globalWork = selectRoleSkills("global-agent", "model-selected", { modelDecision: { actionRequired: true, selectedSkills: [internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.requirementIntake, internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.incidentDiagnosis] } });
    const groupWork = selectRoleSkills("group-main-agent", "model-selected", { source: "task", phase: "planning", selectedSkillNames: [internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessRuleModeling] });
    const groupWorkPlanMode = selectRoleSkills("group-main-agent", "model-selected", { source: "task", phase: "planning", planAuthoring: true, selectedSkillNames: [internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessRuleModeling] });
    const sneakyPlanSkill = selectRoleSkills("group-main-agent", "model-selected", { source: "task", phase: "planning", selectedSkillNames: [internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.implementationPlanAuthoring] });
    const groupReview = selectRoleSkills("group-main-agent", "model-selected", { forceWork: true, phase: "review", selectedSkillNames: [internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessScenarioAcceptance] });
    const contextualGroupWork = selectRoleSkills("group-main-agent", "那就以这个为目标");
    const planAuthoringOnly = selectRoleSkills("group-main-agent", "这个项目是做什么的？", { planAuthoring: true, phase: "planning" });
    const planAuthoringProjectOnly = selectRoleSkills("project-main-agent", "你好", { planAuthoring: true, phase: "planning" });
    const projectWork = selectRoleSkills("project-child-agent", "model-selected", { phase: "execution", selectedSkillNames: [internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.documentDrivenDelivery, internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.frontendVisualQa] });
    const incidentWork = selectRoleSkills("project-child-agent", "model-selected", { phase: "execution", selectedSkillNames: [internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.incidentDiagnosis] });
    const releaseWork = selectRoleSkills("project-child-agent", "model-selected", { phase: "release", selectedSkillNames: [internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.releaseReadiness] });
    const testWork = selectRoleSkills("test-agent", "model-selected", { phase: "verification", selectedSkillNames: [internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.frontendVisualQa] });
    const businessPlanning = selectRoleSkills("group-main-agent", "model-selected", { source: "task", phase: "planning", selectedSkillNames: [internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessRuleModeling] });
    const contractWork = selectRoleSkills("project-child-agent", "model-selected", { phase: "execution", selectedSkillNames: [internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.interfaceDataContract, internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessScenarioAcceptance] });
    const businessReview = selectRoleSkills("group-main-agent", "model-selected", { forceWork: true, phase: "review", selectedSkillNames: [internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessScenarioAcceptance] });
    const businessTest = selectRoleSkills("test-agent", "model-selected", { phase: "verification", selectedSkillNames: [internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessScenarioAcceptance] });
    const visualOnly = selectRoleSkills("project-child-agent", "model-selected", { phase: "execution", selectedSkillNames: [internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.frontendVisualQa] });
    const directProjectBusinessWork = selectRoleSkills("project-child-agent", "model-selected", { source: "project-chat", phase: "execution", selectedSkillNames: [internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessRuleModeling, internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.interfaceDataContract, internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessScenarioAcceptance] });
    const checks = {
        allPackagesInstalled: ROLE_SKILL_CATALOG.every(item => installation.available.includes(item.name)
            && fs.existsSync(path.join(templateRoot(), item.name, "SKILL.md"))
            && fs.existsSync(path.join(templateRoot(), item.name, "agents", "openai.yaml"))
            && fs.existsSync(path.join(db_1.SKILLS_DIR, `${item.name}.json`))),
        ordinaryGlobalLoadsNoWorkSkills: ordinaryGlobal.length === 0,
        ordinaryGroupLoadsNoWorkSkills: ordinaryGroup.length === 0,
        globalGetsOnlyRelevantSkills: globalWork[0]?.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.global
            && globalWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.requirementIntake)
            && globalWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.incidentDiagnosis)
            && !globalWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.group),
        groupGetsCoordinatorAndDecomposition: groupWork[0]?.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.group
            && groupWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.taskDecomposition)
            && !groupWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.implementationPlanAuthoring)
            && !groupWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.project),
        groupPlanModeGetsPlanSkill: groupWorkPlanMode.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.implementationPlanAuthoring)
            && groupWorkPlanMode.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.group)
            && groupWorkPlanMode.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.taskDecomposition),
        agentModeIgnoresModelPickedPlanSkill: !sneakyPlanSkill.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.implementationPlanAuthoring)
            && sneakyPlanSkill.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.group),
        groupReviewGetsReviewAndReceipt: groupReview.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.deliveryReviewRework)
            && groupReview.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.receipt)
            && !groupReview.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.implementationPlanAuthoring),
        contextualExecutionRequiresModelDecision: contextualGroupWork.length === 0,
        planAuthoringOnlyLoadsPlanSkill: planAuthoringOnly.length === 1
            && planAuthoringOnly[0]?.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.implementationPlanAuthoring
            && planAuthoringProjectOnly.length === 1
            && planAuthoringProjectOnly[0]?.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.implementationPlanAuthoring,
        projectGetsSourceReceiptAndMatchedWorkflows: projectWork[0]?.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.project
            && projectWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.projectSourceResearch)
            && projectWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.receipt)
            && projectWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.documentDrivenDelivery)
            && projectWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.frontendVisualQa),
        incidentTaskGetsDiagnosis: incidentWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.incidentDiagnosis),
        releaseTaskGetsReadiness: releaseWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.releaseReadiness),
        testAgentGetsVerifierEvidenceAndVisualQa: testWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.test)
            && testWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.evidence)
            && testWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.frontendVisualQa),
        businessPlanningGetsRuleModeling: businessPlanning.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessRuleModeling)
            && businessPlanning.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.taskDecomposition)
            && !businessPlanning.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.implementationPlanAuthoring),
        interfaceWorkGetsContractAndScenarioAcceptance: contractWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.interfaceDataContract)
            && contractWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessScenarioAcceptance),
        businessReviewGetsScenarioAcceptance: businessReview.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessScenarioAcceptance),
        businessTestGetsScenarioAcceptance: businessTest.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessScenarioAcceptance),
        visualOnlyAvoidsBusinessSkills: visualOnly.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.frontendVisualQa)
            && !visualOnly.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessRuleModeling)
            && !visualOnly.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.interfaceDataContract)
            && !visualOnly.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessScenarioAcceptance),
        directProjectGetsAllBusinessWorkflowSkills: directProjectBusinessWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessRuleModeling)
            && directProjectBusinessWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.interfaceDataContract)
            && directProjectBusinessWork.some(item => item.name === internal_skill_catalog_1.CCM_ROLE_SKILL_NAMES.businessScenarioAcceptance),
        selectionBudgetBounded: [globalWork, groupWork, groupWorkPlanMode, sneakyPlanSkill, groupReview, projectWork, incidentWork, releaseWork, testWork, businessPlanning, contractWork, businessReview, businessTest, visualOnly, directProjectBusinessWork, planAuthoringOnly, planAuthoringProjectOnly].every(items => items.length <= 6),
        usageDirectiveRequiresApplicationAndReceipt: buildSelectedSkillUsageDirective(projectWork).includes("not optional catalog entries")
            && buildSelectedSkillUsageDirective(projectWork).includes("CCM_AGENT_RECEIPT")
            && buildSelectedSkillUsageDirective(projectWork).includes("not a workspace artifact"),
    };
    return {
        pass: Object.values(checks).every(Boolean),
        checks,
        selections: {
            ordinaryGlobal: ordinaryGlobal.map(item => item.name),
            ordinaryGroup: ordinaryGroup.map(item => item.name),
            globalWork: globalWork.map(item => item.name),
            groupWork: groupWork.map(item => item.name),
            groupWorkPlanMode: groupWorkPlanMode.map(item => item.name),
            sneakyPlanSkill: sneakyPlanSkill.map(item => item.name),
            groupReview: groupReview.map(item => item.name),
            contextualGroupWork: contextualGroupWork.map(item => item.name),
            planAuthoringOnly: planAuthoringOnly.map(item => item.name),
            planAuthoringProjectOnly: planAuthoringProjectOnly.map(item => item.name),
            projectWork: projectWork.map(item => item.name),
            incidentWork: incidentWork.map(item => item.name),
            releaseWork: releaseWork.map(item => item.name),
            testWork: testWork.map(item => item.name),
            businessPlanning: businessPlanning.map(item => item.name),
            contractWork: contractWork.map(item => item.name),
            businessReview: businessReview.map(item => item.name),
            businessTest: businessTest.map(item => item.name),
            visualOnly: visualOnly.map(item => item.name),
            directProjectBusinessWork: directProjectBusinessWork.map(item => item.name),
        },
        installation,
    };
}
//# sourceMappingURL=role-skills.js.map