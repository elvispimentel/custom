import {mapaCompleto} from '../engine/src/motor.mjs';
const C={nome:'Teste',tz:'America/Sao_Paulo',lat:-27.5954,lon:-48.548};
const D=[['1984-07-22','14:30'],['1988-11-19','06:05'],['2000-02-29','00:00'],['1999-12-31','23:59'],
['1960-01-01','12:00'],['1975-10-15','18:45'],['1993-03-08','03:20'],['2004-02-29','21:10'],
['1931-10-04','12:00'],['2019-02-16','09:00'],['1968-06-30','23:00'],['2007-09-11','11:11']];
const out=D.map(([d,h])=>{
  const [a,m,di]=d.split('-').map(Number); const [ho,mi]=h.split(':').map(Number);
  const r=mapaCompleto({...C,ano:a,mes:m,dia:di,hora:ho,minuto:mi});
  return [d,h,r.desenhoHumano.tipo,r.desenhoHumano.perfil,r.desenhoHumano.autoridade,
    r.desenhoHumano.portoes.join('/'),r.astral.planetas.Sol.signo,r.astral.planetas.Sol.casa,r.astral.ascendente.signo,
    r.taro.numero+'-'+r.taro.arcano,r.kin?r.kin.kin:'-'].join(' | ');
});
console.log(out.join('\n'));
