"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foliaProviderCookie = foliaProviderCookie;
// 固定 KuGou SDK 的 cookieToJson 按分号拆分但不 trim 键名。
// CCM 加密仓库保留标准 Cookie 格式，仅在内部 SDK 边界去掉键值对两侧空白。
function foliaProviderCookie(provider, value) {
    if (provider !== 'kugou')
        return value;
    return value.split(';').map(pair => pair.trim()).filter(Boolean).join(';');
}
//# sourceMappingURL=provider-cookie.js.map