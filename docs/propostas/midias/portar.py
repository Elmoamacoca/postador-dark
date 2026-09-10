# -*- coding: utf-8 -*-
"""Leva a maquete aprovada da sub-aba MIDIAS para dentro do painel.

POR QUE ISTO E' UM SCRIPT, e nao um copiar e colar. A folha da sub-aba e' a soma do
compartilhado das propostas (`comum.css`) com o especifico do pop-up C (`pop-c.css`),
que foi o aprovado em 10/09. Colar as duas a mao faria a tela envelhecer no dia em que
a maquete mudasse.

O QUE ELE CORTA. O `comum.css` traz a previa e a torrada porque a maquete precisa ser
autossuficiente; o painel JA' TEM as duas, vindas do `04-analytics.css`. Duas previas
sao duas manutencoes para o mesmo desenho, e a segunda diverge na primeira correcao.
O trecho a cortar esta' marcado na fonte com `@so-na-maquete`.

NAO HA' ESCOPO AQUI, ao contrario da folha de Analytics. As classes desta tela
(`ar-*`, `bc-*`, `mid-*`) nao existem em nenhuma outra folha do painel: foi conferido
antes, e o `conferir` recusa a folha se alguma delas aparecer noutro bloco.

Gera:  painel/estilo/06-midias.css

Rodar na raiz do repositorio:  python docs/propostas/midias/portar.py
"""
import pathlib
import re

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
ESTILO = RAIZ / 'painel' / 'estilo'
ALVO = ESTILO / '06-midias.css'

CABECA = """/* =====================================================================
   A SUB-ABA MIDIAS, dentro da ficha da conta

   ESTA FOLHA E' GERADA. Nao edite aqui: mexa em `docs/propostas/midias/comum.css`
   ou `pop-c.css` e rode `python docs/propostas/midias/portar.py`.

   O DESENHO E' O POP-UP C, aprovado por ele em 10/09/2026: janela quase do tamanho
   do monitor, barra lateral de filtro a esquerda, grade agrupada por mes no meio, e
   o detalhe do video entrando pela direita num painel que empurra a grade.

   TRES ARMADILHAS JA' MEDIDAS FICAM REGISTRADAS AQUI:

   - TRANSICAO PAUSADA TRAVA O VALOR. Navegador com a janela oculta pausa transicao,
     e transicao em curso vence tudo no CSS, ate' `!important` escrito na mao. A grade
     nao recuava com a classe certa aplicada. Por isso a coluna do painel NAO tem
     transicao: quem anima e' a opacidade do conteudo, que travada nao quebra layout.
   - A PREVIA E A TORRADA nao moram aqui: sao as do `04-analytics.css`, que ja'
     estavam no painel. Uma peca, uma folha.
   - ENDERECO DENTRO DE BOTAO e' HTML invalido e o navegador desmonta a marcacao. Por
     isso o quadro da grade e' uma caixa com um botao cobrindo a face e o endereco do
     Drive por cima dele.
   ===================================================================== */

"""

# As classes desta tela. Se qualquer uma aparecer noutra folha do painel, ha' colisao
# e a folha e' recusada: mexer nesta aba nao pode quebrar a vizinha.
PREFIXOS = ('.ar-', '.bc-', '.mid-')


def conferir(css: str) -> None:
    """RECUSA A FOLHA QUEBRADA, e recusa a folha que invade a vizinha.

    Na aba de Analytics um gerador produziu seletor invalido duas vezes, e nas duas o
    navegador jogou fora O BLOCO SEGUINTE sem reclamar: a aba subiu sem metade das
    regras. Erro de gerador morre aqui, e nao na tela dele.
    """
    problemas = []
    if css.count('{') != css.count('}'):
        problemas.append('chaves desbalanceadas: %d abrem, %d fecham'
                         % (css.count('{'), css.count('}')))
    if re.search(r'@so-na-maquete', css):
        problemas.append('o trecho so-da-maquete nao foi cortado')
    for alvo in ('.ar{', '.ar.com-peek{', '.ar-peek{', '.mid-drive', '.bc-par',
                 '.ct-jan.enorme', '.ct-jan.inteira'):
        if alvo not in css:
            problemas.append('sumiu do resultado: ' + alvo)
    if '.prev{' in css:
        problemas.append('a previa foi copiada de novo, e ela ja mora no analytics')

    # colisao com as outras folhas
    for outra in sorted(ESTILO.glob('*.css')):
        if outra.name in (ALVO.name, '06-midia.css'):
            continue
        texto = outra.read_text(encoding='utf-8')
        for p in PREFIXOS:
            achados = set(re.findall(re.escape(p) + r'[a-z0-9-]+', texto))
            usados = {a for a in achados if a in css}
            if usados:
                problemas.append('colide com %s: %s'
                                 % (outra.name, ', '.join(sorted(usados)[:4])))
    if problemas:
        raise SystemExit('FOLHA RECUSADA: ' + '; '.join(problemas))


def main():
    comum = (AQUI / 'comum.css').read_text(encoding='utf-8')
    corte = re.sub(r'/\* @so-na-maquete.*?@fim-so-na-maquete \*/', '', comum,
                   flags=re.S)
    if corte == comum:
        raise SystemExit('nao achei o trecho marcado com @so-na-maquete no comum.css')
    proprio = (AQUI / 'pop-c.css').read_text(encoding='utf-8')

    folha = (CABECA
             + '/* ====== 1. o compartilhado das propostas ====== */\n'
             + corte.strip() + '\n\n'
             + '/* ====== 2. o desenho do pop-up C, aprovado ====== */\n'
             + proprio.strip() + '\n\n'
             + '/* ====== 3. os estados que so existem no painel de verdade ====== */\n'
             + (AQUI / 'so-painel.css').read_text(encoding='utf-8').strip() + '\n')
    conferir(folha)
    ALVO.write_text(folha, encoding='utf-8')
    print(ALVO.name, round(ALVO.stat().st_size / 1024), 'KB',
          '|', folha.count('{'), 'regras')


if __name__ == '__main__':
    main()
