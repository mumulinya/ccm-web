"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectAcceptanceFields = projectAcceptanceFields;
exports.projectAcceptanceStep = projectAcceptanceStep;
/** Carry explicit verification fields through the existing project-plan projection. */
function projectAcceptanceFields(source) {
    const fields = ["verification", "editablePaths", "readOnlyPaths", "cleanupPaths", "synchronizedFixturePaths"];
    return Object.fromEntries(fields.filter(k => Array.isArray(source?.[k])).map(k => [k, source[k]]));
}
function projectAcceptanceStep(item) {
    return { ...projectAcceptanceFields(item), acceptance: item.acceptanceCriteria || [] };
}
//# sourceMappingURL=project-acceptance-plan.js.map