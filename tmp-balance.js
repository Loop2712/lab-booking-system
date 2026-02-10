const fs=require('fs');
const text=fs.readFileSync('app/api/admin/term/import/route.ts','utf8');
const stack=[]; const pairs={')':'(',']':'[','}':'{'};
let line=1,col=0;
for (let i=0;i<text.length;i++){
  const ch=text[i];
  if (ch==='\n'){ line++; col=0; continue; }
  col++;
  if (ch==='{'||ch==='['||ch==='(') stack.push({ch,line,col});
  else if (ch===')'||ch===']'||ch==='}'){
    if (!stack.length){ console.log('extra closing',ch,'at',line,col); process.exit(0);} 
    const last=stack.pop();
    const open=last.ch; if (pairs[ch]!==open){ console.log('mismatch',open,'opened at',last.line,last.col,'closed by',ch,'at',line,col); process.exit(0);} 
  }
}
if (stack.length){ console.log('unclosed stack (last 5):'); console.log(stack.slice(-5)); }
