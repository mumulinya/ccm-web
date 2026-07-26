"use strict";
// Compatibility helpers for callers that still import the former local intent module.
// Natural-language routing is model-only. These helpers normalize syntax or resolve
// explicit entity identifiers; they never infer an action, authorization, or intent.
Object.defineProperty(exports, "__esModule", { value: true });
exports.RANDOM_MUSIC_KEYWORD = void 0;
exports.normalizeText = normalizeText;
exports.stripActionWords = stripActionWords;
exports.parseMusicKeyword = parseMusicKeyword;
exports.findProjectName = findProjectName;
exports.findAllProjectNames = findAllProjectNames;
exports.findGroup = findGroup;
exports.findAllGroups = findAllGroups;
exports.resolveImplicitCurrentProject = resolveImplicitCurrentProject;
exports.buildLocalDevelopmentTargets = buildLocalDevelopmentTargets;
exports.hasExplicitDevelopmentExecutionIntent = hasExplicitDevelopmentExecutionIntent;
exports.hasExplicitGlobalWriteAuthorization = hasExplicitGlobalWriteAuthorization;
exports.inferLocalConversationFallback = inferLocalConversationFallback;
exports.inferLocalGlobalAction = inferLocalGlobalAction;
exports.chineseNumberToInt = chineseNumberToInt;
exports.normalizeCronHour = normalizeCronHour;
exports.guessCronSchedule = guessCronSchedule;
exports.createActionBlockSafeStreamer = createActionBlockSafeStreamer;
exports.RANDOM_MUSIC_KEYWORD = "__random__";
function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
function stripActionWords(value) {
    return normalizeText(value);
}
function parseMusicKeyword(message) {
    return normalizeText(message);
}
function explicitEntityMatches(message, values) {
    const lower = normalizeText(message).toLowerCase();
    return values.filter(value => {
        const candidate = String(value || "").trim();
        return !!candidate && lower.includes(candidate.toLowerCase());
    });
}
function findProjectName(message, projects) {
    return explicitEntityMatches(message, projects)[0] || "";
}
function findAllProjectNames(message, projects) {
    return explicitEntityMatches(message, projects);
}
function findGroup(message, groups) {
    return findAllGroups(message, groups)[0] || null;
}
function findAllGroups(message, groups) {
    const lower = normalizeText(message).toLowerCase();
    return groups.filter(group => [group?.id, group?.name].some(value => {
        const candidate = String(value || "").trim();
        return !!candidate && lower.includes(candidate.toLowerCase());
    }));
}
function resolveImplicitCurrentProject(_message, _projects) {
    return "";
}
function buildLocalDevelopmentTargets(message, projects, groups) {
    return [
        ...findAllGroups(message, groups).map((group) => ({ type: "group", group_id: group.id, reason: "explicit_entity_reference", task: message })),
        ...findAllProjectNames(message, projects).map(project => ({ type: "project", project, reason: "explicit_entity_reference", task: message })),
    ];
}
function hasExplicitDevelopmentExecutionIntent(_message) {
    return false;
}
function hasExplicitGlobalWriteAuthorization(_message) {
    return false;
}
function inferLocalConversationFallback(_message) {
    return null;
}
function inferLocalGlobalAction(_message, _projects, _groups, _resources = {}) {
    return null;
}
function chineseNumberToInt(value) {
    const text = String(value || "").trim();
    return /^\d+$/.test(text) ? Number(text) : Number.NaN;
}
function normalizeCronHour(raw, _text) {
    const hour = chineseNumberToInt(raw);
    return Number.isNaN(hour) ? Number.NaN : Math.max(0, Math.min(23, hour));
}
function guessCronSchedule(message) {
    const explicit = normalizeText(message);
    return /^(?:[0-9*,/\-?]+\s+){4}[0-9*,/\-?]+$/.test(explicit) ? explicit : "";
}
function createActionBlockSafeStreamer(emit) {
    const actionMarker = "```action";
    const fenceMarker = "```";
    let buffer = "";
    let insideAction = false;
    const drain = (final = false) => {
        while (buffer) {
            if (insideAction) {
                const closeIndex = buffer.indexOf(fenceMarker);
                if (closeIndex >= 0) {
                    buffer = buffer.slice(closeIndex + fenceMarker.length);
                    insideAction = false;
                    continue;
                }
                if (final)
                    buffer = "";
                else
                    buffer = buffer.slice(Math.max(0, buffer.length - (fenceMarker.length - 1)));
                return;
            }
            const actionIndex = buffer.indexOf(actionMarker);
            if (actionIndex >= 0) {
                if (actionIndex > 0)
                    emit(buffer.slice(0, actionIndex));
                buffer = buffer.slice(actionIndex + actionMarker.length);
                insideAction = true;
                continue;
            }
            if (final) {
                emit(buffer);
                buffer = "";
                return;
            }
            const safeLength = Math.max(0, buffer.length - (actionMarker.length - 1));
            if (safeLength > 0) {
                emit(buffer.slice(0, safeLength));
                buffer = buffer.slice(safeLength);
            }
            return;
        }
    };
    return {
        push(text) { buffer += String(text || ""); drain(false); },
        finish() { drain(true); },
    };
}
//# sourceMappingURL=global-agent-local-intent.js.map