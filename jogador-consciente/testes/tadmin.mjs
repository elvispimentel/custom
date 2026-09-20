import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const fake='file:///tmp/fake2.js';
import {readFileSync} from 'fs';
const stub=readFileSync('/tmp/fake2.js','utf8');
for(const [nome,w,h] of [['mobile',390,844],['desktop',1280,900]]){
  const c=await b.newContext({viewport:{width:w,height:h}});
  await c.addInitScript(stub);
  const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///root/entrega/jogador-consciente/admin/admin.html');
  await p.fill('#i-email','pimentel.8f@gmail.com'); await p.fill('#i-senha','x');
  await p.click('#b-entrar'); await p.waitForTimeout(1600);
  await p.screenshot({path:`../out/adm-${nome}-painel.png`,fullPage:nome==='mobile'});
  console.log(nome,'| cartoes:',await p.$$eval('.num b',n=>n.map(x=>x.textContent)).catch(()=>'ERRO'));
  await p.click('[data-aba="funil"]'); await p.waitForTimeout(300);
  console.log(nome,'| etapas do funil:',await p.$$eval('#funil .et',n=>n.length));
  await p.screenshot({path:`../out/adm-${nome}-funil.png`,fullPage:nome==='mobile'});
  await p.click('[data-aba="crm"]'); await p.waitForTimeout(300);
  console.log(nome,'| linhas:',await p.$$eval('#linhas tr',n=>n.length),'|',await p.textContent('#conta'));
  await p.fill('#i-busca','tokyo'); await p.waitForTimeout(200);
  console.log(nome,'| busca "tokyo":',await p.$$eval('#linhas tr td.nome',n=>n.map(x=>x.textContent.trim())));
  await p.fill('#i-busca',''); await p.selectOption('#i-filtro','parou'); await p.waitForTimeout(200);
  console.log(nome,'| filtro nao-concluiram:',await p.$$eval('#linhas tr td.nome',n=>n.map(x=>x.textContent.trim())));
  await p.selectOption('#i-filtro',''); await p.waitForTimeout(200);
  await p.click('#linhas tr'); await p.waitForTimeout(600);
  await p.screenshot({path:`../out/adm-${nome}-ficha.png`,fullPage:nome==='mobile'});
  console.log(nome,'| ficha:',await p.$eval('#detalhe-in h2',e=>e.textContent),
    '| citacao:',!!(await p.$('.citacao')),'| eventos:',await p.$$eval('.ev',n=>n.length),
    '| notas:',await p.$$eval('.nota',n=>n.length),'| LGPD:',!!(await p.$('#b-apagar')));
  const larg=await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
  console.log(nome,'| rolagem horizontal na pagina:',larg,'| ERROS:',errs.length?errs:'nenhum');
  await c.close();
}
await b.close();
