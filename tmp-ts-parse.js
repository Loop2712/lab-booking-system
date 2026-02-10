const ts = require('typescript');
const fs = require('fs');
const sourceText = fs.readFileSync('app/api/admin/term/import/route.ts','utf8');
const sf = ts.createSourceFile('import.ts', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const diags = sf.parseDiagnostics;
for (const d of diags) {
  const { line, character } = sf.getLineAndCharacterOfPosition(d.start || 0);
  console.log(`${line+1}:${character+1} - ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
}
