# -*- coding: utf-8 -*-
"""Leva a maquete aprovada da aba de CALENDARIO para dentro do painel.

O DESENHO E' A PROPOSTA A, aprovada por ele em 11/09/2026 depois de oito rodadas: o
mes em linhas de texto e um gantt sobre as LEVAS, no molde do ClickUp, no mesmo
alternador.

POR QUE ISTO E' UM SCRIPT. A folha da aba e' a soma de `comum.css` com
`proposta-a.css`. Colar as duas a mao faria a tela envelhecer no dia em que a maquete
mudasse, e esta tela mudou oito vezes em um dia.

O QUE NAO ENTRA AQUI, E E' O PONTO: cartao de indicador, alternador segmentado, linha
de controle e combobox de conta NAO sao redesenhados. Eles vem do `04-analytics.css`,
que desde 11/09 escopa em `#pag-analytics` E `#pag-calendario`. Foi assim que a
estetica parou de falhar: peca que ja' existe no painel se copia, nao se refaz.

NAO HA' ESCOPO NESTA FOLHA. As classes daqui (`pa-*`, `cl-*`) nao existem em nenhuma
outra, e o `conferir` recusa a folha se alguma aparecer noutro bloco.

Gera:  painel/estilo/07-calendario.css

Rodar na raiz do repositorio:  python docs/propostas/calendario/portar.py
"""
import pathlib
import re

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
ESTILO = RAIZ / 'painel' / 'estilo'
ALVO = ESTILO / '07-calendario.css'

CABECA = """/* =====================================================================
   A ABA DE CALENDARIO

   ESTA FOLHA E' GERADA. Nao edite aqui: mexa em `docs/propostas/calendario/comum.css`
   ou `proposta-a.css` e rode `python docs/propostas/calendario/portar.py`.

   O DESENHO E' A PROPOSTA A, aprovada em 11/09/2026: o mes em linhas de texto e um
   gantt sobre as levas, no molde do ClickUp, no mesmo alternador.

   O QUE NAO ESTA' AQUI vem do `04-analytics.css`, que escopa em `#pag-analytics` e
   `#pag-calendario`: o cartao de indicador (`.rs-cd.rs-kpi`), o alternador (`.rs-seg`),
   a linha de controle (`.rs-topo`) e o combobox de conta (`.cb`). Eles nao foram
   redesenhados de proposito.

   ARMADILHAS JA' MEDIDAS, registradas para nao voltarem:

   1. O CABECALHO PRECISA DE `z-index`. `.pagina.ativa > *` recebe animacao de entrada,
      e animacao com `transform` cria contexto de empilhamento: sem isso o menu do
      combobox fica preso dentro do cabecalho e os cartoes passam por cima dele. A tela
      parece ter bug de clique, e o defeito e' de empilhamento.

   2. O GANTT TRABALHA EM PORCENTAGEM, e nao em pixel. E' o que faz o quadro ocupar a
      largura inteira em qualquer escala e o que elimina a barra de rolagem horizontal.

   3. O ROTULO DA BARRA FICA FORA DA FITA. Dentro dela ele roubava largura, e como os
      blocos sao posicionados sobre a largura total do periodo, a parte ja' publicada
      aparecia como um toco no comeco.
   ===================================================================== */
"""

# Classes que nao podem existir em outra folha do painel: se existirem, uma aba
# reescreve a outra sem avisar.
PREFIXOS = ('.pa-', '.cl-')


def conferir(css: str) -> None:
    """RECUSA A FOLHA QUEBRADA. Navegador descarta CSS invalido EM SILENCIO: uma chave
    a mais derruba o bloco seguinte e a aba sobe sem metade do desenho. Erro de gerador
    morre aqui, e nao na tela dele."""
    problemas = []
    if css.count('{') != css.count('}'):
        problemas.append('chaves desbalanceadas: %d abrem, %d fecham'
                         % (css.count('{'), css.count('}')))

    # as pecas sem as quais a aba nao e' a aba aprovada
    for alvo in ('.pa-grade{', '.pa-gt{', '.pa-gt-barra{', '.pa-gt-risco{',
                 '.cl-peek{', '.cl-prev{', '.pa-cel.hoje{', '@keyframes pa-pisca'):
        if alvo not in css:
            problemas.append('sumiu do resultado: ' + alvo)

    # colisao com as outras folhas da casa
    nossas = set(re.findall(r'\.(?:pa|cl)-[a-z0-9-]+', css))
    for outra in sorted(ESTILO.glob('*.css')):
        if outra.name == ALVO.name:
            continue
        texto = outra.read_text(encoding='utf-8')
        batem = sorted(c for c in nossas if re.search(re.escape(c) + r'[^a-z0-9-]',
                                                      texto))
        if batem:
            problemas.append('classe repetida em %s: %s'
                             % (outra.name, ', '.join(batem[:6])))

    if problemas:
        raise SystemExit('FOLHA RECUSADA: ' + '; '.join(problemas))


def main():
    comum = (AQUI / 'comum.css').read_text(encoding='utf-8')
    propria = (AQUI / 'proposta-a.css').read_text(encoding='utf-8')

    folha = (CABECA
             + '/* ====== 1. o compartilhado: painel do dia, previa, saida ====== */'
             + chr(10) + comum + chr(10)
             + '/* ====== 2. o especifico da aba: o mes e o gantt ====== */'
             + chr(10) + propria)
    conferir(folha)
    ALVO.write_text(folha, encoding='utf-8')
    print(ALVO.name, round(ALVO.stat().st_size / 1024), 'KB',
          '|', folha.count('{'), 'regras')


if __name__ == '__main__':
    main()
