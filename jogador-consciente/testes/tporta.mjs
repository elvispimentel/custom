import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});

async function ate7(c,p,porta){
  await p.goto('file:///root/entrega/jogador-consciente/out/1-SITE-autorretrato.html?porta='+porta);
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
  await p.fill('#i-mail','ana@exemplo.com'); await p.check('#c-rel');
  if(await p.$('#c-mai')) await p.check('#c-mai');
  await p.click('#b5'); await p.waitForTimeout(800);
  if(await p.$('#b5')) await p.click('#b5');
  for(let k=0;k<200;k++){ await p.waitForTimeout(300);
    const ab=await p.evaluate(()=>{const i=document.getElementById('instr');return !!i&&i.classList.contains('on');});
    if(!ab)break;
    const pl=await p.$('.i-pular'); if(pl){ await pl.click().catch(()=>{}); }
    const seg=await p.$('.i-segue'); if(seg) await seg.click().catch(()=>{});
  }
  await p.waitForTimeout(1000);
  for(let k=0;k<40;k++){await p.waitForTimeout(400);if(await p.$('#b7'))break;}
  await p.click('#b7');
  for(let k=0;k<200;k++){await p.waitForTimeout(300);if(await p.$('#vvert'))break;}
}
const rota=async c=>{
  await c.route('**/pandavideo.com.br/**',r=>{
    const u=r.request().url();
    if(u.includes('api.v2.js')) return r.fulfill({status:200,contentType:'application/javascript',
      body:`window.PandaPlayer=function(id,o){var self=this;
        setTimeout(function(){ o.onReady&&o.onReady({}); },200);
        // manda UM evento e cala — era o caso que travava o contador
        setTimeout(function(){ o.onEvent&&o.onEvent({message:{type:'play',currentTime:1}}); },600);
        this.loadWindowScreen=function(){};};
       (window.pandascripttag||[]).forEach(function(f){f();});
       window.pandascripttag={push:function(f){f();}};`});
    return r.fulfill({status:200,contentType:'text/html',body:'<body style="margin:0;background:#111"></body>'});
  });
  await c.route(/storage\/v1\/object\/public/,r=>r.fulfill({status:200,contentType:'image/png',body:Buffer.from('')}));
};

// 1) API manda um evento e cala — a oferta TEM que abrir pelo relógio
{
  const c=await b.newContext({viewport:{width:390,height:844}}); await rota(c);
  const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await ate7(c,p,8);
  const t0=Date.now();
  let abriu=false;
  for(let k=0;k<40;k++){ await p.waitForTimeout(500);
    abriu=await p.evaluate(()=>{const o=document.getElementById('oferta');return !!o&&!o.hidden;});
    if(abriu) break; }
  console.log('API MUDA | oferta abriu:', abriu, '| depois de', ((Date.now()-t0)/1000).toFixed(0),'s (porta=8)');
  console.log('API MUDA | ERROS:', errs.length?errs:'nenhum');
  // volta para a etapa 6 e retorna: a oferta tem que continuar aberta
  await p.click('#b-volta6'); await p.waitForTimeout(900);
  await p.click('#b7'); await p.waitForTimeout(1500);
  console.log('AO VOLTAR | oferta continua aberta:',
    await p.evaluate(()=>{const o=document.getElementById('oferta');return !!o&&!o.hidden&&o.classList.contains('on');}));
  console.log('AO VOLTAR | embed:', await p.getAttribute('#vvert iframe','src'));
  await c.close();
}
await b.close();
