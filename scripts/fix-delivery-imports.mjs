#!/usr/bin/env node
import fs from "fs";

const p1 = "backend/agents/delivery-report-part-01-part-01.ts";
const p2 = "backend/agents/delivery-report-part-01-part-02.ts";
let s1 = fs.readFileSync(p1, "utf8");
let s2 = fs.readFileSync(p2, "utf8");

const needed = [
  "asArray",
  "collectFailedDeliveryVerificationEvidence",
  "collectFailedIndependentReviewEvidence",
  "collectIncompleteDeliveryVerificationEvidence",
  "collectIncompleteIndependentReviewEvidence",
  "collectRawDeliveryIndependentReviewEvidence",
  "collectWeakMissingDeliveryVerificationEvidence",
  "collectWeakPassedIndependentReviewEvidence",
  "firstBoolean",
  "firstObject",
  "formatDeliveryIndependentReviewEvidence",
  "getNestedReport",
  "uniqueDeliveryLines",
  "uniqueDeliveryStrings",
];

for (const n of needed) {
  const re = new RegExp(`^(async )?function ${n}\\b`, "m");
  if (re.test(s1)) {
    s1 = s1.replace(re, (m) => `export ${m}`);
    console.log("exported", n);
  }
}
fs.writeFileSync(p1, s1);

s2 = s2.replace(/import\s*\{[\s\S]*?\}\s*from\s*["']\.\/delivery-report-part-01-part-01["'];\n*/g, "");
const lines = s2.split(/\r?\n/);
let insertAt = 0;
for (let i = 0; i < lines.length; i++) {
  if (/^import\s/.test(lines[i])) {
    if (lines[i].includes("{") && !lines[i].includes("}")) {
      while (i < lines.length && !lines[i].includes("}")) i++;
    }
    insertAt = i + 1;
  }
}
const imp = `import {\n  ${needed.join(",\n  ")},\n} from "./delivery-report-part-01-part-01";`;
lines.splice(insertAt, 0, imp, "");
fs.writeFileSync(p2, lines.join("\n"));
console.log("delivery imports fixed");
