import * as crypto from "crypto";

export function createAgentParallelGroupId(input: {
  groupId: string;
  taskId?: string;
  planMessageId?: string;
  depth?: number;
  targets: string[];
}) {
  const identity = JSON.stringify({
    groupId: input.groupId,
    taskId: input.taskId || "",
    planMessageId: input.planMessageId || "",
    depth: Number(input.depth || 0),
    targets: input.targets,
  });
  return `agent-batch:${crypto.createHash("sha256").update(identity).digest("hex").slice(0, 20)}`;
}

export async function settleParallelAgentJobs<T>(
  mentions: T[],
  execute: (mention: T) => Promise<string[]>,
) {
  const settled = await Promise.allSettled(mentions.map(mention => execute(mention)));
  return settled.map((result, index) => ({
    mention: mentions[index],
    outputs: result.status === "fulfilled" ? result.value : [],
    error: result.status === "rejected" ? result.reason : null,
  }));
}
