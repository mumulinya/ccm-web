"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foliaImageMime = foliaImageMime;
// 网易云的 image/jpg 可能实际装载 PNG/WebP；只识别支持的图片签名，不把错误页当图片。
function foliaImageMime(value, buffer) {
    const mime = String(value || '').split(';')[0].trim().toLowerCase();
    if (mime !== 'image/jpg')
        return mime;
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
        return 'image/jpeg';
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
        return 'image/png';
    if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii')))
        return 'image/gif';
    if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP')
        return 'image/webp';
    if (buffer.length >= 16 && buffer.subarray(4, 8).toString('ascii') === 'ftyp' && ['avif', 'avis'].includes(buffer.subarray(8, 12).toString('ascii')))
        return 'image/avif';
    throw Error('音乐平台未返回有效封面');
}
//# sourceMappingURL=cover-image.js.map