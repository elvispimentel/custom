import {chromium} from 'playwright';
import {readFileSync,existsSync,statSync} from 'fs';
const JSPDF=readFileSync('/tmp/pdflib/node_modules/jspdf/dist/jspdf.umd.min.js','utf8');
const H2C=readFileSync('/tmp/pdflib/node_modules/html2canvas/dist/html2canvas.min.js','utf8');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const c=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true});
// as libs do CDN estão bloqueadas na caixa: sirvo as reais no lugar
await c.route('**/cdnjs.cloudflare.com/**', r=>{
  const u=r.request().url();
  r.fulfill({status:200,contentType:'application/javascript',
    body: u.includes('jspdf')?JSPDF:H2C});
});
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
await p.goto('file:///root/entrega/jogador-consciente/out/1-SITE-autorretrato.html');
await p.click('#b-iniciar');
for(let k=0;k<40;k++){await p.waitForTimeout(250);if(await p.$('.escolha'))break;}
await p.click('[data-g="f"]');
for(let k=0;k<60;k++){await p.waitForTimeout(300);if(await p.$('#i-nome'))break;}
await p.fill('#i-nome','Ana Prado'); await p.click('#b1a'); await p.waitForTimeout(2500);
for(let k=0;k<40;k++){await p.waitForTimeout(300);if(await p.$('#i-dia'))break;}
await p.fill('#i-dia','22'); await p.selectOption('#i-mes','7'); await p.fill('#i-ano','1984');
await p.click('#b1b'); await p.waitForTimeout(500);
await p.click('[data-ir="3"]'); await p.waitForTimeout(400);
await p.fill('#i-hora','14:30'); await p.fill('#i-cid','Florian'); await p.waitForTimeout(900);
await p.click('.aclist div'); await p.click('#b3'); await p.waitForTimeout(400);
for(let k=0;k<20;k++){const bs=await p.$$('.lk button[data-v="4"]');for(const x of bs)await x.click();
  const g=await p.$('#b4'); if(!g)break; await g.click(); await p.waitForTimeout(150);
  if(await p.$('#i-mail'))break;}
await p.fill('#i-mail','a@b.com'); await p.check('#c-rel');
if(await p.$('#c-mai')) await p.check('#c-mai');
await p.click('#b5'); await p.waitForTimeout(800);
if(await p.$('#b5')){console.log('b5 nao avancou:', await p.textContent('#i-mail-err').catch(()=>'')); await p.click('#b5');}
// pula a narrativa: clica em Pular, depois no Continuar do fim
for(let k=0;k<160;k++){
  await p.waitForTimeout(400);
  const aberto=await p.evaluate(()=>{const i=document.getElementById('instr');return !!i&&i.classList.contains('on');});
  if(!aberto)break;
  const seg=await p.$('.i-segue'); if(seg){await seg.click().catch(()=>{}); continue;}
  const pl=await p.$('.i-pular'); if(pl) await pl.click().catch(()=>{});
}
await p.waitForTimeout(1500);
for(let k=0;k<60;k++){await p.waitForTimeout(500);if(await p.$('#b-ficha'))break;}
if(!(await p.$('#b-ficha'))){
  console.log('etapa atual:', await p.evaluate(()=>document.body.innerText.slice(0,200)));
  await p.screenshot({path:'../out/pdf-onde-parou.png'}); await b.close(); process.exit(1);
}
await p.click('#b-ficha'); await p.waitForTimeout(1500);
const alturaPainel=await p.evaluate(()=>{const e=document.getElementById('f-corpo');
  return {scroll:e.scrollHeight, visivel:e.getBoundingClientRect().height};});
console.log('Ficha: altura real',alturaPainel.scroll,'px | visível na tela',Math.round(alturaPainel.visivel),'px');
const dl=p.waitForEvent('download',{timeout:60000});
await p.click('#f-pdf');
let arq=null;
try{ const d=await dl; arq='/root/entrega/jogador-consciente/out/ficha-teste.pdf'; await d.saveAs(arq);
  console.log('DOWNLOAD:', d.suggestedFilename()); }
catch(e){ console.log('SEM DOWNLOAD:',String(e).slice(0,120)); }
await p.waitForTimeout(500);
console.log('mensagem:', await p.textContent('#f-msg'));
console.log('ERROS:', errs.length?errs:'nenhum');
await b.close();
if(arq&&existsSync(arq))console.log('PDF:',Math.round(statSync(arq).size/1024),'KB');
