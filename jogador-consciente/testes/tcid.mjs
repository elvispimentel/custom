import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const U='file:///root/entrega/jogador-consciente/out/1-SITE-autorretrato.html';

async function ate3(servidor){
  const c=await b.newContext({viewport:{width:390,height:844}});
  const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  if(servidor) await p.route('**/functions/v1/cidades*',r=>r.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify([
      {nome:'Lisbon',pais:'PT',admin1:'14',lat:38.72509,lon:-9.1498,tz:'Europe/Lisbon',pop:517802},
      {nome:'Lisburn',pais:'GB',admin1:'NIR',lat:54.52,lon:-6.03,tz:'Europe/London',pop:77506}])}));
  else await p.route('**/functions/v1/cidades*',r=>r.abort());
  await p.goto(U);
  await p.click('#b-iniciar');
  for(let k=0;k<40;k++){await p.waitForTimeout(250);if(await p.$('.escolha'))break;}
  await p.click('[data-g="f"]');
  for(let k=0;k<60;k++){await p.waitForTimeout(300);if(await p.$('#i-nome'))break;}
  await p.fill('#i-nome','Ana Prado'); await p.click('#b1a'); await p.waitForTimeout(2500);
  for(let k=0;k<40;k++){await p.waitForTimeout(300);if(await p.$('#i-dia'))break;}
  await p.fill('#i-dia','22'); await p.selectOption('#i-mes','7'); await p.fill('#i-ano','1984');
  await p.click('#b1b'); await p.waitForTimeout(500);
  await p.click('[data-ir="3"]'); await p.waitForTimeout(400);
  return {p,errs};
}

// 1) servidor fora do ar — a lista do Brasil tem que continuar funcionando
{
  const {p,errs}=await ate3(false);
  await p.fill('#i-hora','14:30');
  await p.fill('#i-cid','Florian'); await p.waitForTimeout(1200);
  console.log('OFFLINE | itens:', await p.$$eval('.aclist div',n=>n.map(x=>x.textContent)));
  await p.click('.aclist div'); await p.waitForTimeout(200);
  console.log('OFFLINE | escolhida:', await p.inputValue('#i-cid'), '| fuso:', await p.textContent('#tzf'));
  console.log('OFFLINE | erros:', errs.length?errs:'nenhum');
}
// 2) servidor respondendo — mundo entra na lista
{
  const {p,errs}=await ate3(true);
  await p.fill('#i-hora','14:30');
  await p.fill('#i-cid','Lisb'); await p.waitForTimeout(1500);
  console.log('MUNDO | itens:', await p.$$eval('.aclist div',n=>n.map(x=>x.textContent)));
  const alvo=await p.$$('.aclist div');
  let iL=0; const txts=await p.$$eval('.aclist div',n=>n.map(x=>x.textContent));
  for(let i=0;i<txts.length;i++) if(txts[i].indexOf('Lisbon')>=0) iL=i;
  await alvo[iL].click(); await p.waitForTimeout(200);
  console.log('MUNDO | escolhida:', await p.inputValue('#i-cid'), '| fuso:', await p.textContent('#tzf'));
  await p.click('#b3'); await p.waitForTimeout(400);
  console.log('MUNDO | avancou da etapa 3?', !(await p.$('#i-cid')));
  console.log('MUNDO | erros:', errs.length?errs:'nenhum');
  await p.screenshot({path:'../out/cid-mundo.png'});
}
await b.close();
