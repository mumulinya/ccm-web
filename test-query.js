const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const KNOWLEDGE_DIR = path.join(
  process.env.USERPROFILE || "C:/Users/admin",
  ".cc-connect",
  "knowledge"
);

function tokenize(text) {
  const lower = text.toLowerCase();
  const tokens = [];
  const regex = /([a-zA-Z0-9]+|[\u4e00-\u9fa5])/g;
  let match;
  while ((match = regex.exec(lower)) !== null) {
    tokens.push(match[1]);
  }
  return tokens;
}

let documentChunks = [];

async function rebuildIndex() {
  const chunks = [];
  if (!fs.existsSync(KNOWLEDGE_DIR)) return;
  const files = fs.readdirSync(KNOWLEDGE_DIR);
  
  for (const file of files) {
    const filePath = path.join(KNOWLEDGE_DIR, file);
    if (!fs.statSync(filePath).isFile()) continue;
    const ext = path.extname(file).toLowerCase();
    
    let content = "";
    if (ext === ".pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      content = data.text;
    } else {
      content = fs.readFileSync(filePath, "utf-8");
    }

    const chunkSize = 800;
    const overlap = 150;
    let start = 0;
    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      const chunkText = content.substring(start, end).trim();
      if (chunkText) {
        const tokens = tokenize(chunkText);
        const tf = {};
        for (const t of tokens) {
          tf[t] = (tf[t] || 0) + 1;
        }
        chunks.push({
          filename: file,
          text: chunkText,
          tokens: new Set(tokens),
          tf
        });
      }
      if (start + chunkSize >= content.length) break;
      start += (chunkSize - overlap);
    }
  }
  documentChunks = chunks;
  console.log(`Chunks built: ${chunks.length}`);
}

function queryKnowledgeBase(query, limit = 3) {
  const queryTokens = tokenize(query);
  console.log("Query Tokens:", queryTokens);
  if (queryTokens.length === 0 || documentChunks.length === 0) return "";
  
  const df = {};
  for (const t of queryTokens) {
    df[t] = 0;
    for (const chunk of documentChunks) {
      if (chunk.tokens.has(t)) df[t]++;
    }
  }
  console.log("DF:", df);
  
  const N = documentChunks.length;
  const scoredChunks = documentChunks.map(chunk => {
    let score = 0;
    for (const t of queryTokens) {
      if (chunk.tf[t]) {
        const tfVal = chunk.tf[t];
        const dfVal = df[t] || 0;
        const idfVal = Math.log(N / (dfVal + 1)) + 1;
        score += tfVal * idfVal;
      }
    }
    return { filename: chunk.filename, score };
  });
  
  const results = scoredChunks
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  console.log("Results:", results);
}

async function run() {
  await rebuildIndex();
  queryKnowledgeBase("配置");
  queryKnowledgeBase("Java");
}
run();
