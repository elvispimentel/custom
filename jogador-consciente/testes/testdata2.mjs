import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage();
await p.goto('file:///root/entrega/jogador-consciente/out/autorretrato-do-jogador.html');
// extrai validarData do bundle publicado, exercitando a UI real
const casos=[
 ['22','7','1984'],['19','11','1988'],['29','2','2000'],['31','12','1999'],['1','1','1960'],
 ['15','10','1975'],['8','3','1993'],['29','2','2004'],['4','10','1931'],['16','2','2019'],
 ['30','6','1968'],['11','9','2007'],
 // inválidos
 ['31','2','1990'],['29','2','1900'],['0','5','1990'],['32','1','1990'],['15','7','2099'],
 ['15','7','84'],['','7','1984'],['15','','1984'],['31','4','1988'],['31','6','1988'],
 ['29','2','2024'],['1','1','1900'],
];
const r=await p.evaluate(async(casos)=>{
  const out=[];
  for(const [d,m,a] of casos){
    document.querySelector('#i-dia')&&0;
    out.push(null);
  }
  return out;
},casos);
await b.close();
