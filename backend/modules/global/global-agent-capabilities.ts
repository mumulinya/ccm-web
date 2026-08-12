const compact = (value: any) => String(value || "").replace(/\s+/g, "").trim();

/** Product-level reply for capability questions. It deliberately bypasses the model. */
export const GLOBAL_AGENT_CAPABILITY_REPLY = [
  "我负责把你的需求推进到可确认的结果：分析项目、修改代码、运行验证，并协调多个项目或群聊中的执行成员。",
  "",
  "你可以直接让我：",
  "- 修复指定项目的功能或 Bug",
  "- 检查项目为什么启动、构建或测试失败",
  "- 分析多个项目的依赖和影响范围",
  "- 把跨项目需求分派给项目或群聊，并跟进进度",
  "- 查看、恢复、停止或重新核验任务",
  "",
  "例如：\"修复 smart-live-ui 的登录问题\"、\"检查这几个项目为什么启动失败\"、\"把这个需求分派给前端和后端项目\"。涉及代码时，我会先确认目标和权限，再在对应项目的自动化会话中执行、验证并汇报结果。",
].join("\n");

export function isGlobalAgentCapabilityQuestion(value: any) {
  const text = compact(value).replace(/[？?！!。,.，、：:]/g, "");
  if (!text || text.length > 42) return false;
  return /^(?:(?:你|您|这个|全局)?(?:的)?(?:全局)?(?:agent|助手))?(?:会什么|能做什么|可以做什么|有什么能力|能干什么|可以帮我做什么|是干嘛的|做什么的)$/i.test(text)
    || /^(?:全局\s*agent|全局助手)(?:会什么|能做什么|可以做什么|有什么能力|是干嘛的|做什么的)$/i.test(text);
}
