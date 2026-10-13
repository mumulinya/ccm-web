"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskIntakeSubmissionKey = taskIntakeSubmissionKey;
exports.taskIntakeSubmissionFingerprint = taskIntakeSubmissionFingerprint;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
function taskIntakeSubmissionKey(payload) {
    return String(payload.idempotency_key || payload.idempotencyKey || (payload.client_message_id || payload.clientMessageId
        ? `intake-message:${payload.client_message_id || payload.clientMessageId}` : ""));
}
async function taskIntakeSubmissionFingerprint(payload, files) {
    const attachments = [];
    for (const file of files) {
        const digest = (0, crypto_1.createHash)("sha256");
        for await (const chunk of (0, fs_1.createReadStream)(file.savedPath))
            digest.update(chunk);
        attachments.push({ name: file.filename, size: file.size, checksum: digest.digest("hex") });
    }
    return (0, crypto_1.createHash)("sha256").update(JSON.stringify({ payload: { ...payload, idempotency_key: undefined, idempotencyKey: undefined }, files: attachments })).digest("hex");
}
//# sourceMappingURL=task-intake-request-identity.js.map