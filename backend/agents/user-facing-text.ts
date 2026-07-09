export function compactUserFacingText(value: any, max = 260) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export function sanitizeMainAgentRoleLanguage(value: any) {
  return String(value || "")
    .replace(/全局\s*监工/g, "全局任务跟进")
    .replace(/监工中/g, "持续跟进中")
    .replace(/监工状态/g, "持续跟进状态")
    .replace(/异步监工/g, "持续跟进")
    .replace(/持久监工/g, "持续跟进")
    .replace(/全局主\s*Agent/g, "我")
    .replace(/全局\s*Agent/g, "我")
    .replace(/群聊主\s*Agent/g, "协作群")
    .replace(/项目\s*Agent/g, "项目执行成员")
    .replace(/主\s*Agent\s*验收/g, "最终验收")
    .replace(/主\s*Agent\s*复盘/g, "最终复盘")
    .replace(/主\s*Agent\s*说明/g, "处理说明")
    .replace(/主\s*Agent/g, "我")
    .replace(/子\s*Agent/g, "执行成员")
    .replace(/目标\s*Agent/g, "目标执行成员")
    .replace(/执行\s*Agent/g, "执行成员")
    .replace(/下游\s*Agent/g, "下游执行目标")
    .replace(/\bCoordinator\b/g, "我")
    .replace(/\bWorker\b/g, "执行成员")
    .replace(/^Agent(?=\s*(正在|已|遇到|执行|返回|回复))/g, "我")
    .replace(/([^A-Za-z])Agent(?=\s*(正在|已|遇到|执行|返回|回复))/g, "$1我");
}

export function sanitizeUserFacingTerminology(value: any) {
  return String(value || "")
    .replace(/最终\s*收尾\s*门禁/g, "最终收尾检查")
    .replace(/交付\s*门禁/g, "交付验收")
    .replace(/验收\s*门禁/g, "验收检查")
    .replace(/完成\s*门禁/g, "完成检查")
    .replace(/合并\s*门禁/g, "合并前检查")
    .replace(/测试\s*和\s*合并\s*门禁/g, "测试和合并检查")
    .replace(/路径\s*门禁/g, "路径范围检查")
    .replace(/权限\s*门禁/g, "权限检查")
    .replace(/记忆\s*派发\s*门禁/g, "记忆派发检查")
    .replace(/压缩后\s*重注入\s*门禁/g, "压缩后重注入检查")
    .replace(/门禁\s*通过/g, "验收通过")
    .replace(/门禁\s*未通过/g, "验收未通过")
    .replace(/未过\s*门禁/g, "未通过验收")
    .replace(/记忆\s*gate\s*引用/gi, "记忆使用声明")
    .replace(/重注入\s*gate\s*引用/gi, "重注入声明")
    .replace(/gate\/候选引用\/使用状态/gi, "声明/候选使用状态")
    .replace(/\bgate\b/gi, "检查项")
    .replace(/门禁/g, "检查")
    .replace(/回执/g, "结果说明");
}

export function sanitizeUserFacingProtocolTerms(value: any) {
  return String(value || "")
    .replace(/\bACK\b/g, "接单说明")
    .replace(/接单确认/g, "接单说明")
    .replace(/API\s*microcompact\s*edit\s*plan/gi, "上下文压缩计划")
    .replace(/API\s*microcompact/gi, "上下文压缩")
    .replace(/\bmicrocompact\b/gi, "上下文压缩")
    .replace(/native[_\s-]*applied/gi, "已实际应用")
    .replace(/\bnative\s*apply\b/gi, "实际应用")
    .replace(/\badvisory\b/gi, "参考使用")
    .replace(/\bignored\b/gi, "未使用")
    .replace(/\bused\b/gi, "已使用")
    .replace(/\bverified\b/gi, "已核对")
    .replace(/used\s*\/\s*ignored\s*\/\s*verified/gi, "已使用/未使用/已核对");
}

export function sanitizeMainAgentUserFacingText(value: any) {
  return sanitizeMainAgentRoleLanguage(
    sanitizeUserFacingProtocolTerms(
      sanitizeUserFacingTerminology(value),
    ),
  )
    .replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, "$1$2")
    .replace(/\s{2,}/g, " ")
    .trim();
}
