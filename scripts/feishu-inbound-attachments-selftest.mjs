import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-feishu-attachments-"));
process.env.CCM_TASK_STORE_DIR = path.join(root, "ccm-store");

const fail = (message) => { throw new Error(message); };

try {
  const distRoot = process.env.CCM_BACKEND_DIST_DIR
    ? path.resolve(process.env.CCM_BACKEND_DIST_DIR)
    : path.resolve(import.meta.dirname, "..", "ccm-package", "dist");
  const attachments = await import(pathToFileURL(path.join(distRoot, "integrations", "feishu-inbound-attachments.js")).href);

  const parsed = attachments.extractCcConnectInboundAttachmentPaths(
    "请总结这些资料\n(Files saved locally, please read them: C:\\project\\.cc-connect\\attachments\\需求.pdf, C:\\project\\.cc-connect\\attachments\\说明.docx)\n(Image files saved locally: C:\\project\\.cc-connect\\attachments\\页面.png)",
  );
  if (parsed.text !== "请总结这些资料" || parsed.refs.length !== 3) fail("cc-connect 附件提示解析失败");
  if (parsed.refs.filter(item => item.kind === "image").length !== 1) fail("图片与文件分类失败");

  const workDir = path.join(root, "project");
  const sourceDir = path.join(workDir, ".cc-connect", "attachments");
  fs.mkdirSync(sourceDir, { recursive: true });
  const sourceFile = path.join(sourceDir, "需求.txt");
  fs.writeFileSync(sourceFile, "飞书附件接管自测\n");
  const first = await attachments.resolveFeishuInboundAttachments({
    messageId: "fixture-message-1",
    localRefs: [{ kind: "file", path: sourceFile }],
    expectedWorkDir: workDir,
    source: "cc_connect_acp",
  });
  if (first.attachments.length !== 1 || first.failures.length !== 0) fail("本地附件未被接管");
  if (fs.existsSync(sourceFile)) fail("受控副本持久化后未清理 cc-connect 临时文件");
  const materialized = attachments.materializeFeishuInboundAttachments(first.attachments);
  if (materialized.length !== 1 || !fs.existsSync(materialized[0].savedPath)) fail("受控附件无法还原给需求解析器");
  if (!path.resolve(materialized[0].savedPath).startsWith(path.resolve(process.env.CCM_TASK_STORE_DIR))) fail("附件没有保存到隔离的 CCM 目录");
  const publicRows = attachments.publicFeishuInboundAttachments(first.attachments);
  if (JSON.stringify(publicRows).includes("storageKey") || JSON.stringify(publicRows).includes("savedPath")) fail("公开投影泄露内部存储字段");

  fs.writeFileSync(sourceFile, "飞书附件接管自测\n");
  const duplicate = await attachments.resolveFeishuInboundAttachments({
    messageId: "fixture-message-1",
    localRefs: [{ kind: "file", path: sourceFile }],
    expectedWorkDir: workDir,
    source: "cc_connect_acp",
  });
  if (duplicate.attachments[0]?.id !== first.attachments[0]?.id) fail("重复消息没有复用同一附件回执");

  const outside = path.join(root, "outside.txt");
  fs.writeFileSync(outside, "越界");
  const rejected = await attachments.resolveFeishuInboundAttachments({
    messageId: "fixture-message-2",
    localRefs: [{ kind: "file", path: outside }],
    expectedWorkDir: workDir,
    source: "cc_connect_acp",
  });
  if (rejected.attachments.length || !rejected.failures.length) fail("路径越界没有被拒绝");

  const executable = path.join(sourceDir, "危险.exe");
  fs.writeFileSync(executable, Buffer.from("MZfixture"));
  const blocked = await attachments.resolveFeishuInboundAttachments({
    messageId: "fixture-message-3",
    localRefs: [{ kind: "file", path: executable }],
    expectedWorkDir: workDir,
    source: "cc_connect_acp",
  });
  if (blocked.attachments.length || !/不允许/.test(blocked.failures[0]?.reason || "")) fail("危险文件类型没有被拒绝");

  console.log(JSON.stringify({
    ok: true,
    parsedRefs: parsed.refs.length,
    receiptId: first.attachments[0].id,
    duplicateId: duplicate.attachments[0].id,
    traversalRejected: rejected.failures.length === 1,
    executableRejected: blocked.failures.length === 1,
  }, null, 2));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
