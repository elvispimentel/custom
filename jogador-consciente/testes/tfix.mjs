import {chromium} from 'playwright';
import {readFileSync,existsSync,statSync} from 'fs';
const JSPDF=readFileSync('/tmp/pdflib/node_modules/jspdf/dist/jspdf.umd.min.js','utf8');
const H2C=readFileSync('/tmp/pdflib/node_modules/html2canvas/dist/html2canvas.min.js','utf8');
// um PNG 2x3 dourado, servindo de carta
const CARTA=readFileSync('/tmp/carta.png');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const c=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true});
await c.route('**/cdnjs.cloudflare.com/**', r=>r.fulfill({status:200,contentType:'application/javascript',
  body: r.request().url().includes('jspdf')?JSPDF:H2C}));
await c.route(/storage\/v1\/object\/public/, async r=>{ await new Promise(s=>setTimeout(s,700));  // simula 4G
  r.fulfill({status:200,contentType:'image/png',body:CARTA}); });
await c.route('**/pandavideo.com.br/**', r=>r.fulfill({status:200,contentType:'text/html',body:'<body style="margin:0;background:#111"></body>'}));
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
await p.addInitScript(()=>{ window.__FOTOS=[]; window.__IMGREQ=[];
  document.addEventListener('DOMContentLoaded',()=>{
    new MutationObserver(ms=>{ for(const m of ms) for(const n of m.addedNodes){
      if(n.nodeType===1 && n.className && String(n.className).indexOf('foto')>=0){
        window.__FOTOS.push({quando:Date.now(), html:n.outerHTML.slice(0,120)});
      }}}).observe(document.documentElement,{childList:true,subtree:true});
  });
});
await p.goto('file:///root/entrega/jogador-consciente/out/1-SITE-autorretrato.html?porta=5');
p.on('request',r=>{ if(/storage\/v1\/object\/public/.test(r.url())) console.log('  >> pediu imagem:', r.url().slice(-40)); });
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
await p.fill('#i-mail','ana@exemplo.com'); await p.fill('#i-tel','(48) 99911-2233');
await p.check('#c-rel'); if(await p.$('#c-mai')) await p.check('#c-mai');
await p.click('#b5'); await p.waitForTimeout(800);
if(await p.$('#b5')) await p.click('#b5');
// diagnóstico: o roteiro chega a montar blocos de imagem?
await p.waitForTimeout(1500);
console.log('DIAG |', JSON.stringify(await p.evaluate(()=>{
  const d=window.__DADOS_HIST;
  const out={temDados:!!d, temMapa:!!(d&&d.mapa), temTaro:!!(d&&d.mapa&&d.mapa.taro),
    temTp:!!(d&&d.tipologia), tipo:d&&d.tipologia&&d.tipologia.tipo};
  try{ out.urlArcano=(typeof urlArcano==='function')?'existe':'AUSENTE'; }catch(e){ out.urlArcano='fora de escopo'; }
  const i=document.getElementById('instr');
  out.instrAberto=!!i&&i.classList.contains('on');
  out.blocosAgora=document.querySelectorAll('#instr .i-bl').length;
  out.classes=[...document.querySelectorAll('#instr .i-bl')].map(b=>b.className).slice(0,8);
  return out;
}).catch(e=>({erro:String(e)}))));
// ---- a jornada: contar quantas cartas realmente apareceram
let cartasVistas=0, tirosDeTela=0;
for(let k=0;k<420;k++){
  await p.waitForTimeout(250);
  const ab=await p.evaluate(()=>{const i=document.getElementById('instr');return !!i&&i.classList.contains('on');});
  if(!ab)break;
  const st=await p.evaluate(()=>{
    const bl=[...document.querySelectorAll('#instr .i-bl.foto')];
    return {blocos:bl.length, imgs:bl.map(b=>{const i=b.querySelector('img');
      return i?{src:(i.src||'').slice(-28),comp:i.complete,w:i.naturalWidth}:null;})};
  }).catch(()=>({blocos:0,imgs:[]}));
  const carregada=st.imgs.some(i=>i&&i.comp&&i.w>0);
  if(carregada && tirosDeTela<2){ console.log('  carta NA TELA:',JSON.stringify(st)); await p.screenshot({path:`../out/fix-carta-${++tirosDeTela}.png`}); }
  const n=st.imgs.filter(i=>i&&i.comp&&i.w>0).length;
  if(n>cartasVistas){ cartasVistas=n; }
  const seg=await p.$('.i-segue'); if(seg){await seg.click().catch(()=>{});}
}
console.log('JORNADA | cartas que chegaram a aparecer:', cartasVistas, '(esperado: 2)');
console.log('JORNADA | blocos .foto criados:', JSON.stringify(await p.evaluate(()=>window.__FOTOS)));
console.log('ROTEIRO |', JSON.stringify(await p.evaluate(()=>window.__ROT)));
await p.waitForTimeout(1200);
// ---- etapa 6B
for(let k=0;k<40;k++){await p.waitForTimeout(400);if(await p.$('#b7'))break;}
const t6=await p.evaluate(()=>document.querySelector('.escuro-tela').innerText);
console.log('6B | tem "RPG quer dizer":', /RPG quer dizer/.test(t6));
console.log('6B | ordem correta (texto antes do P.S.):', t6.indexOf('RPG quer dizer') < t6.indexOf('P.S.'));
console.log('6B | frase da reflexão aparece', (t6.match(/mais bateu/g)||[]).length, 'vez(es) — esperado 1');
// ---- PDF
await p.click('#b-ficha'); await p.waitForTimeout(1500);
const dl=p.waitForEvent('download',{timeout:90000});
await p.click('#f-pdf');
let arq=null;
try{ const d=await dl; arq='/root/entrega/jogador-consciente/out/ficha-mobile.pdf'; await d.saveAs(arq); }
catch(e){ console.log('PDF | SEM DOWNLOAD:',String(e).slice(0,100)); }
await p.waitForTimeout(600);
console.log('PDF | mensagem:', await p.textContent('#f-msg'));
console.log('PDF | imagens no documento:', await p.$$eval('#f-corpo img',e=>e.filter(x=>x.complete&&x.naturalWidth>0).length));
await p.click('#f-volta'); await p.waitForTimeout(600);
// ---- etapa 7
await p.click('#b7');
for(let k=0;k<200;k++){await p.waitForTimeout(400);if(await p.$('#vvert'))break;}
const t7=await p.evaluate(()=>document.getElementById('t7-cx').innerText);
console.log('7 | tem "RPG quer dizer":', /RPG quer dizer/.test(t7), '(esperado: false)');
console.log('7 | tem "mais bateu":', /mais bateu/.test(t7), '(esperado: false)');
await p.screenshot({path:'../out/fix-etapa7.png'});
console.log('ERROS:', errs.length?errs:'nenhum');
await b.close();
if(arq&&existsSync(arq)) console.log('PDF |', Math.round(statSync(arq).size/1024),'KB');
