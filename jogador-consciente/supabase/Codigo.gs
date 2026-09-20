/**
 * O JOGADOR CONSCIENTE — ponte Supabase → Planilha
 * Cole isto em Extensões ▸ Apps Script da sua planilha e publique como app da web.
 * Cada jogador vira uma linha. Se o jogador já existe, a linha dele é atualizada
 * no lugar — a planilha é um espelho, não um empilhamento.
 */

var ABA = 'Jogadores';

var COLUNAS = [
  ['player_id',          'ID'],
  ['created_at',         'Entrou em'],
  ['updated_at',         'Última atividade'],
  ['nome',               'Nome'],
  ['email',              'E-mail'],
  ['whatsapp',           'WhatsApp'],
  ['genero',             'Avatar'],
  ['data_nascimento',    'Nascimento'],
  ['hora_nascimento',    'Hora'],
  ['hora_incerta',       'Hora incerta'],
  ['cidade',             'Cidade'],
  ['uf',                 'UF/País'],
  ['timezone',           'Fuso'],
  ['current_stage',      'Etapa'],
  ['reflection_selected','O que mais tocou'],
  ['autorretrato_em',    'Concluiu o autorretrato'],
  ['utm_source',         'Origem'],
  ['utm_medium',         'Meio'],
  ['utm_campaign',       'Campanha'],
  ['app_versao',         'Versão do app']
];

function doPost(e) {
  var trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try {
    var corpo = JSON.parse(e.postData.contents || '{}');
    var linhas = corpo.linhas || [];
    var aba = preparar_();
    var ids = aba.getRange(2, 1, Math.max(aba.getLastRow() - 1, 1), 1).getValues();
    var onde = {};
    for (var i = 0; i < ids.length; i++) if (ids[i][0]) onde[ids[i][0]] = i + 2;

    for (var k = 0; k < linhas.length; k++) {
      var j = linhas[k];
      var valores = COLUNAS.map(function (c) {
        var v = j[c[0]];
        return (v === null || v === undefined) ? '' : v;
      });
      var linha = onde[j.player_id];
      if (linha) {
        aba.getRange(linha, 1, 1, valores.length).setValues([valores]);
      } else {
        aba.appendRow(valores);
        onde[j.player_id] = aba.getLastRow();
      }
    }
    return ok_({ ok: true, gravadas: linhas.length });
  } catch (erro) {
    return ok_({ ok: false, erro: String(erro) });
  } finally {
    trava.releaseLock();
  }
}

function doGet() { return ok_({ ok: true, vivo: true }); }

function preparar_() {
  var pl = SpreadsheetApp.getActiveSpreadsheet();
  var aba = pl.getSheetByName(ABA) || pl.insertSheet(ABA);
  if (aba.getLastRow() === 0) {
    aba.appendRow(COLUNAS.map(function (c) { return c[1]; }));
    aba.getRange(1, 1, 1, COLUNAS.length).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return aba;
}

function ok_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
