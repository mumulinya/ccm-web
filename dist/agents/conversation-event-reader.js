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
exports.iterateConversationEvents = iterateConversationEvents;
exports.readConversationTailSequence = readConversationTailSequence;
const fs = __importStar(require("fs"));
const readline_1 = require("readline");
async function* iterateConversationEvents(file, turnId, attemptId, after) {
    const stream = fs.createReadStream(file, { encoding: 'utf8', highWaterMark: 64 * 1024 });
    const lines = (0, readline_1.createInterface)({ input: stream, crlfDelay: Infinity });
    try {
        for await (const line of lines) {
            try {
                const event = JSON.parse(line);
                if (event.turn_id === turnId && event.attempt_id === attemptId && Number(event.sequence) > after)
                    yield event;
            }
            catch { /* An interrupted final record is not a committed event. */ }
        }
    }
    catch (error) {
        if (error.code !== 'ENOENT')
            throw error;
    }
    finally {
        lines.close();
        stream.destroy();
    }
}
// Resume sequence allocation reads the tail instead of materializing every
// historical payload. Grow only when an unusually large final frame spans it.
function readConversationTailSequence(file, turnId, attemptId) {
    let fd;
    try {
        fd = fs.openSync(file, 'r');
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return 0;
        throw error;
    }
    try {
        const size = fs.fstatSync(fd).size;
        for (let length = Math.min(size, 64 * 1024); length > 0; length = Math.min(size, length * 2)) {
            const buffer = Buffer.allocUnsafe(length), start = size - length;
            fs.readSync(fd, buffer, 0, length, start);
            const lines = buffer.toString('utf8').split('\n');
            if (start)
                lines.shift();
            for (let index = lines.length - 1; index >= 0; index--) {
                try {
                    const event = JSON.parse(lines[index]);
                    if (event.turn_id === turnId && event.attempt_id === attemptId && Number.isSafeInteger(event.sequence))
                        return event.sequence;
                }
                catch { }
            }
            if (length === size)
                break;
        }
        return 0;
    }
    finally {
        fs.closeSync(fd);
    }
}
//# sourceMappingURL=conversation-event-reader.js.map