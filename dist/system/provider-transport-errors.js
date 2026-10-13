"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPermanentProviderTlsError = isPermanentProviderTlsError;
const CERTIFICATE_ERRORS = new Set(['DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'CERT_HAS_EXPIRED',
    'CERT_NOT_YET_VALID', 'ERR_TLS_CERT_ALTNAME_INVALID', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY']);
/** 确定性证书校验失败无法由相同端点的传输回退或普通重试修复。 */
function isPermanentProviderTlsError(error) {
    const seen = new Set();
    let current = error;
    while (current && !seen.has(current)) {
        seen.add(current);
        if (CERTIFICATE_ERRORS.has(String(current.code || ''))
            || /self[- ]signed certificate|certificate has expired|unable to verify (?:the )?first certificate|certificate.*not yet valid|hostname.*does not match.*certificate/i.test(String(current.message || '')))
            return true;
        current = current.cause;
    }
    return false;
}
//# sourceMappingURL=provider-transport-errors.js.map