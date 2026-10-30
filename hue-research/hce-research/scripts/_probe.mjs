import fs from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
const data = new Uint8Array(fs.readFileSync(process.argv[2]));
const doc = await getDocument({ data, verbosity: 0 }).promise;
for (let p = 1; p <= doc.numPages; p++) {
  const tc = await (await doc.getPage(p)).getTextContent();
  const items = tc.items.filter((i) => i.str.trim() && !/^Evaluation/.test(i.str));
  if (!items.some((i) => /^178\s/.test(i.str))) continue;
  console.log("page", p);
  for (const i of items.sort((a, b) => b.transform[5] - a.transform[5])) console.log(Math.round(i.transform[5]), Math.round(i.transform[4]), JSON.stringify(i.str));
}
