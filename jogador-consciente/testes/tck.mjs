import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const c=await b.newContext({viewport:{width:390,height:844}});
await c.route('**/pandavideo.com.br/**',r=>{
  const u=r.request().url();
  if(u.includes('api.v2.js')) return r.fulfill({status:200,contentType:'application/javascript',body:'window.PandaPlayer=function(){this.loadWindowScreen=function(){}};'});
  return r.fulfill({status:200,contentType:'text/html',body:'<body style="margin:0;background:#0d1117;color:#DFA943;font:13px monospace;display:grid;place-items:center;height:100vh">VÍDEO</body>'});
});
await c.route(/storage\/v1\/object\/public/,r=>r.fulfill({status:200,contentType:'image/png',body:Buffer.from('')}));
await c.route('**/pay.cakto.com.br/**',r=>r.fulfill({status:200,contentType:'text/html',
  body:'<body style="font:16px sans-serif;background:#fff;padding:40px">CHECKOUT CAKTO<br><br>Nome<br>E-mail<br>Cartão</body>'}));
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
await p.goto('file:///root/entrega/jogador-consciente/out/1-SITE-autorretrato.html?porta=4');
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
await p.click('#b5'); await p.waitForTimeout(800); if(await p.$('#b5')) await p.click('#b5');
for(let k=0;k<200;k++){ await p.waitForTimeout(300);
  const ab=await p.evaluate(()=>{const i=document.getElementById('instr');return !!i&&i.classList.contains('on');});
  if(!ab)break;
  const pl=await p.$('.i-pular'); if(pl) await pl.click().catch(()=>{});
  const seg=await p.$('.i-segue'); if(seg) await seg.click().catch(()=>{}); }
await p.waitForTimeout(1000);
for(let k=0;k<40;k++){await p.waitForTimeout(400);if(await p.$('#b7'))break;}
await p.click('#b7');
for(let k=0;k<200;k++){await p.waitForTimeout(300);if(await p.$('#vvert'))break;}
await p.waitForTimeout(600);
// ---- (1) recomeçar some / (2) tela não estica
const trav=await p.evaluate(()=>({
  reset: !!document.getElementById('reset') && getComputedStyle(document.getElementById('reset')).display,
  alturaPagina: document.documentElement.scrollHeight,
  janela: window.innerHeight,
  ofertaEscondida: document.getElementById('oferta').hidden
}));
console.log('TRAVADA |', JSON.stringify(trav));
console.log('TRAVADA | sobra de rolagem:', trav.alturaPagina-trav.janela, 'px');
await p.screenshot({path:'../out/ck-travada.png',fullPage:true});
// ---- oferta abre
for(let k=0;k<20;k++){ await p.waitForTimeout(500);
  if(await p.evaluate(()=>!document.getElementById('oferta').hidden)) break; }
await p.waitForTimeout(900);
const solta=await p.evaluate(()=>({alturaPagina:document.documentElement.scrollHeight,
  reset:getComputedStyle(document.getElementById('reset')).display}));
console.log('ABERTA  |', JSON.stringify(solta));
// ---- (3) tela de checkout
const bts=await p.$$('.im-go');
await bts[1].click(); await p.waitForTimeout(1500);
console.log('CHECKOUT | tela cheia?', await p.evaluate(()=>{
  const d=document.getElementById('ckt'); if(!d) return 'não existe';
  const r=d.getBoundingClientRect();
  return {visivel:d.classList.contains('on'), w:Math.round(r.width), h:Math.round(r.height),
    plano:document.getElementById('ckt-diz').textContent,
    src:(document.getElementById('ckt-ifr').src||'').slice(0,70)};
}));
await p.screenshot({path:'../out/ck-tela.png'});
await p.click('#ckt-x'); await p.waitForTimeout(700);
console.log('CHECKOUT | voltou:', await p.evaluate(()=>!document.getElementById('ckt').classList.contains('on')));
console.log('ERROS:', errs.length?errs:'nenhum');
await b.close();
