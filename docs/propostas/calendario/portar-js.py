# -*- coding: utf-8 -*-
"""Leva o JS da maquete aprovada do CALENDARIO para dentro do painel.

MESMO MOTIVO DA FOLHA: a tela e' a soma de `comum.js` com `proposta-a.js`, e colar as
duas a mao faria a aba envelhecer no dia em que a maquete mudasse.

AS TRES DIFERENCAS ENTRE A MAQUETE E O PAINEL, e sao so' tres:

  1. OS DADOS. Na maquete tudo chega em `window.DADOS_CAL`, gravado pelo `montar.py`.
     No painel eles vem de tres rotas: `calendario/saidas`, `contas/estado` e
     `contas/meta`. O trecho de leitura e' substituido por um que busca.

  2. A CAPA. Na maquete `s.capa` e' um INDICE numa lista de imagens embutidas, porque
     a pagina precisa ser autossuficiente. No painel `s.capa` ja' e' o endereco que a
     casa serve (`midia/capa?v=...`), e o Drive nao serve direto: aquele endereco
     expira e exige token.

  3. O `HOJE`. Na maquete ele sai dos dados para a agenda de exemplo ficar em volta de
     um dia conhecido. No painel e' o relogio, e ponto.

Gera:  painel/codigo/03-calendario.js

Rodar na raiz do repositorio:  python docs/propostas/calendario/portar-js.py
"""
import pathlib
import re

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
ALVO = RAIZ / 'painel' / 'codigo' / '03-calendario.js'

CABECA = """/* =====================================================================
   A ABA DE CALENDARIO

   ESTE ARQUIVO E' GERADO. Nao edite aqui: mexa em
   `docs/propostas/calendario/comum.js` ou `proposta-a.js` e rode
   `python docs/propostas/calendario/portar-js.py`.

   O DESENHO E' A PROPOSTA A, aprovada em 11/09/2026: o mes em linhas de texto e um
   gantt sobre as LEVAS, no molde do ClickUp, no mesmo alternador.

   POR QUE A LEVA E' A BARRA DO GANTT: e' a unica coisa nesta tela com duracao. Uma
   publicacao e' ponto no tempo, e ponto no tempo nao vira barra. A barra da leva e'
   segmentada: dia sem saida dentro do periodo vira corte, e e' assim que a agenda
   furada aparece.
   ===================================================================== */
"""

# O trecho da maquete que le' dados embutidos, e o que entra no lugar dele no painel.
VELHO_DADOS = """(function () {
  var D = window.DADOS_CAL || {};"""

NOVO_DADOS = """(function () {
  var D = { contas: [], saidas: [] };"""


def trocar(texto, velho, novo, oque):
    if velho not in texto:
        raise SystemExit('nao achei na fonte: ' + oque)
    return texto.replace(velho, novo, 1)


def main():
    comum = (AQUI / 'comum.js').read_text(encoding='utf-8')
    propria = (AQUI / 'proposta-a.js').read_text(encoding='utf-8')

    # 1. o HOJE do painel e' o relogio, sem o desvio para o dia dos dados
    comum = re.sub(
        r'  var HOJE = \(function \(\) \{.*?\}\)\(\);',
        '  var HOJE = new Date();',
        comum, count=1, flags=re.S)
    if 'var HOJE = new Date();' not in comum:
        raise SystemExit('nao consegui trocar o HOJE')

    # 2. a capa ja' vem como endereco servido pela casa
    comum = trocar(
        comum,
        """  function capa(i) {
    return i == null ? '' : (CAPAS[i % (CAPAS.length || 1)] || '');
  }""",
        """  /* A CAPA JA' E' O ENDERECO QUE A CASA SERVE. O endereco do Drive expira e exige
     token, entao a miniatura foi baixada uma vez e e' servida por `midia/capa?v=`. */
  function capa(c) { return c ? String(c) : ''; }""",
        'a funcao da capa')
    # a linha INTEIRA, com a indentacao: tirar so' o texto deixa dois espacos orfaos
    # e a proxima troca deixa de casar
    comum = trocar(comum, '  var CAPAS = D.capas || [];\n', '', 'a lista de capas')

    # 3. os dados deixam de ser embutidos
    comum = trocar(comum, VELHO_DADOS, NOVO_DADOS, 'o bloco de dados')

    # 4. a maquete guarda `SAIDAS` numa constante; no painel a lista chega depois
    comum = trocar(
        comum,
        """  var CONTAS = D.contas || [];
  var SAIDAS = D.saidas || [];""",
        """  var CONTAS = [], SAIDAS = [];""",
        'as listas de conta e saida')

    corpo = comum.rstrip()
    if not corpo.endswith('})();'):
        raise SystemExit('o comum.js nao termina como esperado')
    corpo = corpo[:-len('})();')] + CARGA + '})();'

    saida = CABECA + corpo + chr(10) + chr(10) + propria
    conferir(saida)
    ALVO.write_text(saida, encoding='utf-8')
    print(ALVO.name, round(ALVO.stat().st_size / 1024), 'KB')


# O QUE ABRE A ABA. Segue o mesmo desenho do `abrirAnalytics`: carrega uma vez, e so'
# quando a aba e' aberta de fato. Ler a agenda de todas as contas na entrada do painel
# seria trabalho jogado fora em toda visita que nao passa por aqui.
CARGA = """
  /* -------------------------------------------------------- o que abre a aba */
  function esqueleto(texto) {
    var palco = document.getElementById('cal-palco');
    if (palco) palco.innerHTML = '<div class="rs-cd pa-gt-sem">' + seguro(texto) +
      '</div>';
  }

  var carregou = false;

  window.abrirCalendario = function () {
    if (carregou) return;
    carregou = true;
    esqueleto('Carregando a agenda');
    Promise.all([
      fetch('calendario/saidas', { cache: 'no-store' })
        .then(function (r) { return r.json(); }),
      fetch('contas/estado', { cache: 'no-store' })
        .then(function (r) { return r.json(); }),
      fetch('contas/meta', { cache: 'no-store' }).then(function (r) { return r.json(); })
        .catch(function () { return { contas: {} }; })
    ]).then(function (r) {
      var meta = (r[2] || {}).contas || {};
      CONTAS = ((r[1] || {}).contas || []).map(function (c) {
        return {
          u: c.arroba, nome: c.nome || c.arroba, avatar: c.avatar || '',
          tipo: c.tipo || '', estado: c.estado || 'viva',
          mercado: (meta[c.arroba] || {}).mercado || ''
        };
      });
      if (!CONTAS.length) {
        esqueleto('Nenhuma conta ligada ainda.');
        return;
      }
      SAIDAS = ((r[0] || {}).saidas || []).filter(function (s) { return s.quando; });
      SAIDAS.forEach(function (s, i) { s.id = i; });
      escolhida = CONTAS[0].u;
      if (window.CAL_PINTAR) window.CAL_PINTAR();
    }).catch(function () {
      carregou = false;
      esqueleto('Não deu para ler a agenda. Atualize a página.');
    });
  };
"""


def conferir(js: str) -> None:
    """RECUSA O ARQUIVO QUEBRADO antes de ele virar tela em branco."""
    problemas = []
    if js.count('{') != js.count('}'):
        problemas.append('chaves desbalanceadas: %d abrem, %d fecham'
                         % (js.count('{'), js.count('}')))
    if 'window.DADOS_CAL' in js:
        problemas.append('sobrou leitura dos dados embutidos da maquete')
    if 'CAPAS' in js:
        problemas.append('sobrou a lista de capas embutidas')
    for alvo in ('window.abrirCalendario', 'window.CAL_PINTAR', 'function gantt',
                 'function corpoDaLeva', 'function abrirPrevia', 'ligarArrasto'):
        if alvo not in js:
            problemas.append('sumiu do resultado: ' + alvo)
    if problemas:
        raise SystemExit('ARQUIVO RECUSADO: ' + '; '.join(problemas))


if __name__ == '__main__':
    main()
