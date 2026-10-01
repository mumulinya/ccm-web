"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.explicitPromptBlockKind = explicitPromptBlockKind;
/** Maps explicit CCM prompt metadata to cache-stability classes. This keeps
 * scope-specific catalogs and loaded skills out of the shared public prefix;
 * no keyword inference is used for these explicit tags. */
function explicitPromptBlockKind(message) {
    const part = String(message?.promptPart || message?.prompt_part || "").trim().toLowerCase();
    if (!part)
        return null;
    if (part === "public_header")
        return "system";
    if (["identity", "stable_policy", "protocol"].includes(part))
        return "rules";
    if (part === "tool_catalog")
        return "mcp";
    if (["dynamic_context", "scope_private"].includes(part))
        return "dynamic_context";
    if (part === "skill")
        return "skill";
    if (part === "recovery")
        return "recovery";
    return null;
}
//# sourceMappingURL=provider-prefix-classification.js.map