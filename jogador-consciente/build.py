import os, datetime
os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.makedirs('out', exist_ok=True)
VERSAO=open('VERSAO',encoding='utf-8').read().strip()
DATA=datetime.date.today().strftime('%d/%m/%Y')
tpl=open('src/page2.tpl.html',encoding='utf-8').read()
tpl=tpl.replace('/*__VERSAO__*/','v'+VERSAO).replace('/*__DATA__*/',DATA)
parts={
 '/*__ASTRO__*/':open('vendor/astronomy.browser.min.js',encoding='utf-8').read(),
 '/*__MOTOR__*/':open('src/motor.browser.js',encoding='utf-8').read(),
 '/*__CIDADES__*/':'window.CIDADES='+open('src/cidades.json',encoding='utf-8').read()+';',
 '/*__NARR__*/':open('src/narrativa.js',encoding='utf-8').read(),
 '/*__APP__*/':open('src/app4.js',encoding='utf-8').read(),
}
for k,v in parts.items():
    assert k in tpl,k
    tpl=tpl.replace(k,v)
tpl=tpl.replace('/*__VERSAO__*/','v'+VERSAO)  # carimbo dentro do app4.js
open('out/autorretrato-jogador-v2.html','w',encoding='utf-8').write(tpl)
i=tpl.index('</style>')+len('</style>')
head,body=tpl[:i],tpl[i:]
std=('<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
 '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
 '<meta name="theme-color" content="#0f0e0c">\n'
 '<meta property="og:title" content="Autorretrato do Jogador — RPG, O Jogador Consciente">\n'
 '<meta property="og:description" content="O jogo da sua vida profissional. Um retrato de quem você é agora — calculado a partir do seu nascimento e das suas respostas.">\n'
 '<meta property="og:type" content="website">\n'+head+'\n</head>\n<body>\n'+body+'\n</body>\n</html>\n')
open('out/autorretrato-do-jogador.html','w',encoding='utf-8').write(std)
print('build ok — v'+VERSAO+' ('+DATA+') — '+str(len(std)//1024)+' KB')

# --- os dois arquivos que vão para o ar ---
META_APP = ('<meta name="apple-mobile-web-app-capable" content="yes">\n'
 '<meta name="mobile-web-app-capable" content="yes">\n'
 '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
 '<meta name="apple-mobile-web-app-title" content="O Jogador Consciente">\n'
 '<link rel="manifest" href="/manifest.json">\n'
 '<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n'
 '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">\n'
 '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">\n')
open('out/1-SITE-autorretrato.html','w',encoding='utf-8').write(std)
lov = std.replace('<meta property="og:type" content="website">',
                  '<meta property="og:type" content="website">\n'+META_APP, 1)
lov = lov.replace('<style>','<style>\nhtml,body{overscroll-behavior:none}\nbody{-webkit-tap-highlight-color:transparent}\n',1)
open('out/2-LOVABLE-index.html','w',encoding='utf-8').write(lov)
print('  out/1-SITE-autorretrato.html  (Hostinger / qualquer host estático)')
print('  out/2-LOVABLE-index.html      (Lovable — com manifest e ícones)')
