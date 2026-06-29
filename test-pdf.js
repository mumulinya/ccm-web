const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function test() {
  const KNOWLEDGE_DIR = path.join(
    process.env.USERPROFILE || "C:/Users/admin",
    ".cc-connect",
    "knowledge"
  );
  console.log("Dir: ", KNOWLEDGE_DIR);
  const files = fs.readdirSync(KNOWLEDGE_DIR);
  console.log("Files: ", files);
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    console.log("File ext: ", ext);
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(path.join(KNOWLEDGE_DIR, file));
      console.log("dataBuffer length: ", dataBuffer.length);
      try {
        const data = await pdfParse(dataBuffer);
        console.log("Parsed length: ", data.text.length);
        console.log("Snippet: ", data.text.slice(0, 100));
      } catch (e) {
        console.log("Parse Error: ", e);
      }
    }
  }
}
test();
