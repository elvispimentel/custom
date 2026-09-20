import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const c=await b.newContext({viewport:{width:390,height:844}});
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
const U='file:///root/entrega/jogador-consciente/out/autorretrato-do-jogador.html';
await p.goto(U+'?utm_source=ig');
const T=async n=>{await p.waitForTimeout(250);await p.screenshot({path:`../out/v8-${n}.png`});};
await T('0-cartaz');
const t0=Date.now();
await p.click('#b-iniciar');
for(let k=0;k<40;k++){await p.waitForTimeout(250);if(await p.$('.escolha'))break;}
await p.click('[data-g="f"]');
for(let k=0;k<60;k++){await p.waitForTimeout(300);if(await p.$('#i-nome'))break;}
console.log('abertura ate o nome:',((Date.now()-t0)/1000).toFixed(1),'s');
await p.fill('#i-nome','Ana Prado'); await p.click('#b1a');
await p.waitForTimeout(2500); await T('1-boasvindas');
console.log('boas-vindas:', await p.$$eval('.i-bl', n=>n.map(x=>x.textContent)));
for(let k=0;k<40;k++){await p.waitForTimeout(300);if(await p.$('#i-dia'))break;}
await p.fill('#i-dia','22'); await p.selectOption('#i-mes','7'); await p.fill('#i-ano','1984');
await p.click('#b1b'); await p.waitForTimeout(500);
await p.click('[data-ir="3"]'); await p.waitForTimeout(300);
await p.fill('#i-hora','14:30'); await p.fill('#i-cid','Florian'); await p.waitForTimeout(400);
await p.click('.aclist div'); await p.click('#b3'); await p.waitForTimeout(400);
for(let k=0;k<20;k++){const bs=await p.$$('.lk button[data-v="4"]');for(const x of bs)await x.click();
  const g=await p.$('#b4'); if(!g)break; await g.click(); await p.waitForTimeout(150);
  if(await p.$('#i-mail'))break;}
await p.fill('#i-mail','a@b.com'); await p.check('#c-rel'); await p.check('#c-mai');
const t1=Date.now(); await p.click('#b5');
await p.waitForTimeout(6000); await T('2-historia');
console.log('blocos da historia na tela:', await p.$$eval('.i-bl',n=>n.length));
let fim=false;
for(let k=0;k<400;k++){await p.waitForTimeout(500);
  if(await p.evaluate(()=>{const i=document.getElementById('instr');return !i||!i.classList.contains('on');})){fim=true;break;}}
console.log('historia durou',((Date.now()-t1)/1000).toFixed(0),'s | terminou:',fim);
await p.waitForTimeout(800); await T('3-etapa6');
await p.fill('#i-refl','A parte do Sol na casa 8.');
await p.click('#b-ficha'); await p.waitForTimeout(900); await T('4-ficha');
console.log('ficha aberta:',await p.evaluate(()=>document.getElementById('ficha').classList.contains('on')));
console.log('ficha tem historia:',await p.evaluate(()=>document.querySelectorAll('#f-corpo .mv').length),'movimentos');
console.log('ficha tem dados:',await p.evaluate(()=>!!document.querySelector('#f-corpo .kv')));
await p.click('#f-volta'); await p.waitForTimeout(600);
await p.click('#b7');
for(let k=0;k<160;k++){await p.waitForTimeout(500);if(await p.$('.c-nm'))break;}
await T('5-etapa7');
console.log('etapa 7:',await p.evaluate(()=>document.querySelector('.c-nm')&&document.querySelector('.c-nm').textContent));
const fila=await p.evaluate(()=>JSON.parse(localStorage.getItem('jc_fila_eventos')||'[]'));
console.log('EVENTOS:',[...new Set(fila.map(e=>e.event_name))].join(', '));
console.log('ERROS:',errs.length?errs:'nenhum');
await b.close();
