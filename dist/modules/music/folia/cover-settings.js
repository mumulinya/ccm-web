"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readFoliaCoverSettings = readFoliaCoverSettings;
exports.saveFoliaCoverSettings = saveFoliaCoverSettings;
const accounts_1 = require("./accounts");
// 封面网络偏好与平台凭据分开存放；按 CCM 主体持久化，默认只直连。
function readFoliaCoverSettings(owner) {
    return { neteaseRelay: (0, accounts_1.account)(owner, 'cover-network').neteaseRelay === 'wsrv' ? 'wsrv' : 'off' };
}
function saveFoliaCoverSettings(owner, input) {
    if (!['off', 'wsrv'].includes(input?.neteaseRelay))
        throw new Error('无效的封面备用读取设置');
    (0, accounts_1.setAccount)(owner, 'cover-network', { neteaseRelay: input.neteaseRelay });
    return readFoliaCoverSettings(owner);
}
//# sourceMappingURL=cover-settings.js.map