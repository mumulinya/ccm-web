"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactReviewSource = redactReviewSource;
function redactReviewSource(value) {
    return value.replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
        .replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16}|xox[baprs]-[A-Za-z0-9-]{16,})\b/g, '[REDACTED_SECRET]')
        .replace(/((?:api[_-]?key|token|secret|password|authorization)["'`]?\s*[=:]\s*["'`]?)[^\s"'`,;]{8,}/gi, '$1[REDACTED_SECRET]');
}
//# sourceMappingURL=redaction.js.map