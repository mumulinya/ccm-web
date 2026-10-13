"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replayCursorOffset = replayCursorOffset;
/** Replay ties retain stage order. A cursor into that sequence must resume
 * after its actual row, rather than reordering equal timestamps by ID. */
function replayCursorOffset(events, at, id) {
    const exact = events.findIndex(event => event.at === at && event.id === id);
    if (exact >= 0)
        return exact + 1;
    const next = events.findIndex(event => event.at > at || (event.at === at && event.id > id));
    return next < 0 ? events.length : next;
}
//# sourceMappingURL=task-replay-cursor.js.map