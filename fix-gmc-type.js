const fs=require("fs");
const p="backend/modules/collaboration/group-memory-compaction-self-tests.ts";
let t=fs.readFileSync(p,"utf8");
if(!t.includes("import type { ConversationSummary }")) {
  t=t.replace(
    /\} from "\.\/group-memory-compaction";/,
    '} from "./group-memory-compaction";\nimport type { ConversationSummary } from "./group-memory-compaction";'
  );
  fs.writeFileSync(p,t);
  console.log("added import type");
} else console.log("already has import");
