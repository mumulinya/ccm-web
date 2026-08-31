"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDevelopmentSourceGrounding = validateDevelopmentSourceGrounding;
function clean(value) {
    return String(value || "").trim();
}
function cleanList(value) {
    return Array.from(new Set((Array.isArray(value) ? value : [])
        .map(item => clean(item))
        .filter(Boolean)));
}
/**
 * Validates existing source-evidence receipts. This is deliberately not a new
 * evidence format: callers keep using their current evidence manifests and
 * pass only the fields required by the common dispatch gate.
 */
function validateDevelopmentSourceGrounding(input) {
    if (input.requiresCodeChanges !== true) {
        return { ready: true, issues: [], groundedProjects: [], contentStored: false };
    }
    const issues = [];
    const requestedProjects = cleanList(input.targetProjects);
    const rows = (Array.isArray(input.projects) ? input.projects : [])
        .filter(row => clean(row?.project));
    const byProject = new Map(rows.map(row => [clean(row.project), row]));
    if (!requestedProjects.length)
        issues.push("开发任务缺少明确的目标项目");
    if (!clean(input.sourceManifestChecksum))
        issues.push("开发任务缺少源码证据 manifest checksum");
    const groundedProjects = [];
    for (const project of requestedProjects) {
        const row = byProject.get(project);
        if (!row) {
            issues.push(`${project}：没有源码证据`);
            continue;
        }
        if (!clean(row.manifestChecksum))
            issues.push(`${project}：缺少项目源码 manifest checksum`);
        const manifestFiles = Math.max(0, Number(row.manifestFiles ?? -1));
        const selectedPaths = cleanList(row.selectedPaths);
        const files = (Array.isArray(row.files) ? row.files : [])
            .filter(file => clean(file?.path));
        const selectedSet = new Set(selectedPaths);
        const verifiedFiles = files.filter(file => (selectedSet.has(clean(file.path))
            && !!clean(file.checksum)
            && !!clean(file.evidenceId)));
        const explicitEmptyProject = manifestFiles === 0 || clean(row.status) === "empty_project";
        if (!selectedPaths.length || !verifiedFiles.length) {
            if (!(input.allowEmptyProjects === true && explicitEmptyProject)) {
                issues.push(`${project}：未读取实现入口、直接相关实现或测试/配置，不能派发开发任务`);
                continue;
            }
        }
        if (selectedPaths.some(path => !verifiedFiles.some(file => clean(file.path) === path))) {
            issues.push(`${project}：选中的源码文件缺少路径、checksum 或 evidenceId`);
            continue;
        }
        groundedProjects.push(project);
    }
    return {
        ready: issues.length === 0 && groundedProjects.length === requestedProjects.length,
        issues: Array.from(new Set(issues)),
        groundedProjects,
        contentStored: false,
    };
}
//# sourceMappingURL=development-source-grounding.js.map