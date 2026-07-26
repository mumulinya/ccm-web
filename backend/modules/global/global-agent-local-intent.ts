// Compatibility helpers for callers that still import the former local intent module.
// Natural-language routing is model-only. These helpers normalize syntax or resolve
// explicit entity identifiers; they never infer an action, authorization, or intent.

export type LocalIntentResult = { reply: string; action: any; intent?: Record<string, any> };

export const RANDOM_MUSIC_KEYWORD = "__random__";

export function normalizeText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function stripActionWords(value: string) {
  return normalizeText(value);
}

export function parseMusicKeyword(message: string) {
  return normalizeText(message);
}

function explicitEntityMatches(message: string, values: string[]) {
  const lower = normalizeText(message).toLowerCase();
  return values.filter(value => {
    const candidate = String(value || "").trim();
    return !!candidate && lower.includes(candidate.toLowerCase());
  });
}

export function findProjectName(message: string, projects: string[]) {
  return explicitEntityMatches(message, projects)[0] || "";
}

export function findAllProjectNames(message: string, projects: string[]) {
  return explicitEntityMatches(message, projects);
}

export function findGroup(message: string, groups: any[]) {
  return findAllGroups(message, groups)[0] || null;
}

export function findAllGroups(message: string, groups: any[]) {
  const lower = normalizeText(message).toLowerCase();
  return groups.filter(group => [group?.id, group?.name].some(value => {
    const candidate = String(value || "").trim();
    return !!candidate && lower.includes(candidate.toLowerCase());
  }));
}

export function resolveImplicitCurrentProject(_message: string, _projects: string[]) {
  return "";
}

export function buildLocalDevelopmentTargets(message: string, projects: string[], groups: any[]) {
  return [
    ...findAllGroups(message, groups).map((group: any) => ({ type: "group", group_id: group.id, reason: "explicit_entity_reference", task: message })),
    ...findAllProjectNames(message, projects).map(project => ({ type: "project", project, reason: "explicit_entity_reference", task: message })),
  ];
}

export function hasExplicitDevelopmentExecutionIntent(_message: string) {
  return false;
}

export function hasExplicitGlobalWriteAuthorization(_message: string) {
  return false;
}

export function inferLocalConversationFallback(_message: string): LocalIntentResult | null {
  return null;
}

export function inferLocalGlobalAction(_message: string, _projects: string[], _groups: any[], _resources: any = {}): LocalIntentResult | null {
  return null;
}

export function chineseNumberToInt(value: string) {
  const text = String(value || "").trim();
  return /^\d+$/.test(text) ? Number(text) : Number.NaN;
}

export function normalizeCronHour(raw: string, _text: string) {
  const hour = chineseNumberToInt(raw);
  return Number.isNaN(hour) ? Number.NaN : Math.max(0, Math.min(23, hour));
}

export function guessCronSchedule(message: string) {
  const explicit = normalizeText(message);
  return /^(?:[0-9*,/\-?]+\s+){4}[0-9*,/\-?]+$/.test(explicit) ? explicit : "";
}

export function createActionBlockSafeStreamer(emit: (text: string) => void) {
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
        if (final) buffer = "";
        else buffer = buffer.slice(Math.max(0, buffer.length - (fenceMarker.length - 1)));
        return;
      }
      const actionIndex = buffer.indexOf(actionMarker);
      if (actionIndex >= 0) {
        if (actionIndex > 0) emit(buffer.slice(0, actionIndex));
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
    push(text: string) { buffer += String(text || ""); drain(false); },
    finish() { drain(true); },
  };
}
