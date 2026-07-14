const ACTION_SIGNALS = [
  /(?:帮我|给我|请|麻烦|需要|开始|继续).{0,28}(?:实现|新增|添加|修改|修复|删除|优化|重构|接入|配置|部署|测试|检查|创建|开发|完成|生成|编写|补充|对接|支持|运行|执行|跑|改|加|做|写)/i,
  /(?:实现|新增|添加|修改|修复|删除|优化|重构|接入|配置|部署|测试|检查|创建|开发|完成|生成|编写|补充|对接|支持|运行|执行|跑).{0,44}(?:功能|接口|页面|组件|代码|项目|文件|数据库|服务|测试|配置|bug|API)/i,
  /(?:把|将).{1,90}(?:改成|修改为|接入|迁移|重构|删掉|删除|加上|加入|换成|拆成|合并)/i,
  /(?:报错|错误|bug|失败|不能用|崩溃|异常).{0,44}(?:修|修复|看一下|排查|解决|处理)/i,
]

export const inferProjectChatMode = (message = '') => (
  ACTION_SIGNALS.some(pattern => pattern.test(String(message || '').trim())) ? 'task' : 'conversation'
)

export const shouldShowProjectTaskCard = (message = {}) => {
  const mode = String(message.messageMode || message.message_mode || '').trim().toLowerCase()
  if (Number(message.fileChanges?.count || 0) > 0) return true
  if (mode) return mode === 'task'
  return inferProjectChatMode(message.requestText || '') === 'task'
}
