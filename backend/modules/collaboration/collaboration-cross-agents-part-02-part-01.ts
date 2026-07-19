// Behavior-freeze split from collaboration-cross-agents-part-02.ts (part 1/2).

import * as path from "path";
import * as crypto from "crypto";
import type { TestAgentReport } from "../../test-agent/types";
import { buildDependencyOutputPacket } from "./collaboration-cross-agents-helpers";
import { executeMentionJobTryB, handleExecuteMentionJobCatch } from "./collaboration-cross-agents-part-03";

export type CrossAgentEnv = {
  deps: any;
  groupId: string;
  group: any;
  sourceProject: string;
  output: string;
  configs: any[];
  ctx: any;
  streamRes: any;
  depth: number;
  seenMentions: Set<string>;
  executionOrder: string;
  planMessageId: string;
  taskId: string;
  sourceTask: any;
  completedOutputsByAgent: Map<string, string[]>;
  processCrossAgents: typeof import("./collaboration-cross-agents").processCrossAgents;
  _locals?: any;
};
