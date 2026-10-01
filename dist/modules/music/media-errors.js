"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicMediaError = publicMediaError;
/** Never expose FFmpeg inputs, signed URLs, credentials or managed disk paths. */
function publicMediaError(error) {
    return String(error?.message || '媒体处理失败')
        .replace(/https?:\/\/\S+/gi, '[媒体地址]')
        .replace(/[A-Za-z]:[\\/][^\r\n"'<>]*/g, '[受管路径]')
        .replace(/(?:\/(?:home|Users|tmp|var)\/)[^\r\n"'<> ]*/g, '[受管路径]')
        .replace(/((?:cookie|token|sessionid|authorization)\s*[:=]\s*)[^\s;]+/gi, '$1[redacted]')
        .slice(0, 350);
}
//# sourceMappingURL=media-errors.js.map