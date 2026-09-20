import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
import re, io, os
def strip(path):
    s = open(path, encoding='utf-8').read()
    s = re.sub(r'^import .*?;\s*$', '', s, flags=re.M|re.S)
    s = re.sub(r"^import\s*\{[^}]*\}\s*from\s*'[^']*';\s*$", '', s, flags=re.M|re.S)
    s = re.sub(r'^export const ', 'const ', s, flags=re.M)
    s = re.sub(r'^export function ', 'function ', s, flags=re.M)
    s = re.sub(r'^export ', '', s, flags=re.M)
    return s
out = io.StringIO()
out.write("/* ==== Motor de Oráculos — O Jogo da Vida ==== */\n(function(global){\n'use strict';\nconst Astro = global.Astronomy;\n")
for f in ['src/tabelas.mjs','src/psicometria.mjs','src/motor.mjs']:
    out.write("\n/* ---- %s ---- */\n" % f)
    out.write(strip(os.path.join('engine', f)))
out.write("""
global.Oraculos = { mapaCompleto, posicoes, casas, portaoDe, signoDe, desenhoHumano, geneKeys,
  kinMaia, numerologia, arcanoTaro, dataDesign, localParaUTC,
  IPIP50, ENEAGRAMA_ITENS, ENEAGRAMA_NOMES, ENEAGRAMA_PAIXAO, perfilPsicometrico,
  bigFive, tipologia4Letras, temperamento, eneagrama,
  RODA_PORTOES, INICIO_RODA, CENTROS, PORTAO_CENTRO, CANAIS, SIGNOS, ARCANOS,
  TABELAS_NUMEROLOGIA, CORPOS_HD };
})(typeof window !== 'undefined' ? window : globalThis);
""")
open('src/motor.browser.js','w',encoding='utf-8').write(out.getvalue())
print('motor.browser.js', os.path.getsize('src/motor.browser.js')//1024, 'KB')
