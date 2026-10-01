"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELEGATED_SOURCE_EVIDENCE_GUIDANCE = exports.SOURCE_EVIDENCE_GUIDANCE = void 0;
/** Shared claim/evidence policy; reading choices remain with the model. */
exports.SOURCE_EVIDENCE_GUIDANCE = [
    "Match evidence to the claim: documentation supports stated purpose, not verified behavior or code quality. For diagnosis, review or changes, inspect the relevant implementation, callers, effective configuration/overrides and tests as needed. Test files alone do not prove tests passed.",
    "Resolve missing context, incomplete code units, referenced dependencies and conflicting evidence before concluding. A missing selected field or a partial search does not prove repository-wide absence. Distinguish observed facts from inference; if a gap cannot be resolved, limit the conclusion to the checked scope and identify what remains unverified.",
    "Correctness and requested coverage take priority over token savings. Explicit complete review and required instruction-document reads must not be replaced by samples. Stop expanding only when the requested conclusion is supported; do not infer whole-project correctness from a few files.",
].join("\n");
exports.DELEGATED_SOURCE_EVIDENCE_GUIDANCE = `${exports.SOURCE_EVIDENCE_GUIDANCE}\nA signed receipt proves provenance, not completeness. Reuse it only for the facts and scope it supports. Request a focused follow-up from the authorized Agent for unresolved facts or contradictions, carrying the specific gaps instead of repeating a broad inquiry. If the delegated read budget cannot cover the request, report the remaining scope; never claim a complete review.`;
//# sourceMappingURL=source-evidence-guidance.js.map