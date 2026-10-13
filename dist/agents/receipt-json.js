"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readReceiptJsonObject = readReceiptJsonObject;
/** Read one complete JSON object, respecting braces inside JSON strings.
 * Trailing verification records or narration are separate protocol records. */
function readReceiptJsonObject(text) {
    const start = text.indexOf("{");
    if (start < 0)
        return null;
    let depth = 0, quoted = false, escaped = false;
    const end = Math.min(text.length, start + 1024 * 1024);
    for (let index = start; index < end; index++) {
        const char = text[index];
        if (quoted) {
            if (escaped)
                escaped = false;
            else if (char === "\\")
                escaped = true;
            else if (char === '"')
                quoted = false;
        }
        else if (char === '"')
            quoted = true;
        else if (char === "{")
            depth++;
        else if (char === "}" && --depth === 0) {
            try {
                return JSON.parse(text.slice(start, index + 1));
            }
            catch {
                return null;
            }
        }
    }
    return null;
}
//# sourceMappingURL=receipt-json.js.map