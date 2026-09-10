# -*- coding: utf-8 -*-
"""Leva a maquete aprovada da aba de Analytics para dentro do painel.

POR QUE ISTO E' UM SCRIPT, e nao um copiar e colar. A folha da aba e' feita de tres
partes: a SALA DE CONTROLE recortada do portal, o compartilhado das propostas e o
especifico da proposta A. Colar as tres a mao faria a aba envelhecer no dia em que o
portal mudasse. Aqui ela se remonta a partir da fonte.

O ESCOPO E' O QUE IMPEDE UMA ABA DE QUEBRAR A OUTRA. `.vazio` e `.pf` ja' existem em
outras folhas do painel (calendario, programar, contas, filtros), e a mesma classe
com desenho diferente derruba a tela vizinha. Entao tudo que e' desta aba nasce
prefixado com `#pag-analytics`. Ficam de fora, de proposito, so' as pecas que moram
no `body` para se posicionarem pela janela: o painel lateral, a previa e o aviso.

Gera:  painel/estilo/04-analytics.css

Rodar na raiz do repositorio:  python docs/propostas/analytics/portar.py
"""
import pathlib
import re

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
PORTAL = pathlib.Path.home() / 'repos' / 'borusa-iscas'
ALVO = RAIZ / 'painel' / 'estilo' / '04-analytics.css'

# Quem mora no `body` nao pode ser escopado: escopado, chegaria la' sem estilo.
LIVRES = ('.sp', '.prev', '.an-torrada', ':root', 'html', 'body', 'from', 'to', '@')

CABECA = """/* =====================================================================
   A ABA DE ANALYTICS

   ESTA FOLHA E' GERADA. Nao edite aqui: mexa na fonte e rode
   `python docs/propostas/analytics/portar.py`. Ela e' a soma de tres partes:

     1. A SALA DE CONTROLE do portal (`rastreamento.css` do repo borusa-iscas), a
        tela que ele elegeu como regua de qualidade em 29/08. Dela vem o cartao com
        sombra dupla, o cartao de numero, a pilula de variacao, a lista com barra, o
        segmentado e as cores de dado, com o tema escuro pronto.
     2. O compartilhado das propostas (`comum.css`): grafico em SVG, combobox de
        conta com busca e o painel lateral da publicacao.
     3. O especifico desta aba, escopado em `#pag-analytics`.

   TRES ARMADILHAS JA' MEDIDAS FICAM REGISTRADAS AQUI:

   - O painel lateral e a previa moram no `body`, para se posicionarem pela janela, e
     la' as variaveis `--rs-*` nao existem: a pilula ficava sem cor e o numero saia
     PRETO no tema escuro. Por isso o seletor de variaveis e' estendido a `.sp` e
     `.prev`. Nao se resolve isso com a classe `.rs-palco`: ela e'
     `position:fixed;inset:0` e joga o painel para a esquerda da tela.
   - Linha de lista que e' `<button>` precisa de `color:inherit`. Sem isso o
     navegador aplica a cor de texto de botao do sistema, que e' preta, e o numero
     desaparece no tema escuro.
   - `.vazio` e `.pf` existem em outras folhas do painel: por isso o escopo.
   ===================================================================== */

"""


def escopar(css: str, escopo: str) -> str:
    """Prefixa cada seletor com o escopo, respeitando quem mora no `body`.

    Escrito na mao de proposito: puxar um pre-processador para prefixar uma folha
    seria trocar uma dependencia nova por trinta linhas de leitura simples."""
    saida, i, n = [], 0, len(css)
    while i < n:
        # comentario passa inteiro
        if css.startswith('/*', i):
            fim = css.find('*/', i + 2)
            fim = n if fim < 0 else fim + 2
            saida.append(css[i:fim])
            i = fim
            continue
        # bloco arroba (media, keyframes, supports): o conteudo vai sem tocar
        if css[i] == '@':
            fim = css.find('{', i)
            if fim < 0:
                saida.append(css[i:])
                break
            profundidade, j = 1, fim + 1
            while j < n and profundidade:
                if css[j] == '{':
                    profundidade += 1
                elif css[j] == '}':
                    profundidade -= 1
                j += 1
            saida.append(css[i:j])
            i = j
            continue
        fim = css.find('{', i)
        if fim < 0:
            saida.append(css[i:])
            break
        j = css.find('}', fim)
        j = n if j < 0 else j + 1
        corpo = css[fim:j]

        # O COMENTARIO NAO E' SELETOR. Entre o fim de uma regra e o inicio da
        # proxima quase sempre ha' um comentario, e prefixar aquilo inteiro produzia
        # `#pag-analytics /* ... */` picotado por virgulas: seletor invalido, e o
        # navegador joga fora O BLOCO SEGUINTE. Foi assim que o painel lateral e a
        # tabela chegaram ao ar sem estilo nenhum, em 09/09. O comentario sai antes,
        # e volta na frente do seletor ja' escopado.
        bruto = css[i:fim]
        comentarios = re.findall(r'/\*.*?\*/', bruto, re.S)
        seletor = re.sub(r'/\*.*?\*/', '', bruto, flags=re.S).strip()
        if seletor:
            partes = []
            for parte in seletor.split(','):
                p = parte.strip()
                if not p or p.startswith(LIVRES):
                    partes.append(p)
                else:
                    partes.append(escopo + ' ' + p)
            seletor = ',\n'.join(partes)
        saida.append((chr(10).join(comentarios) + chr(10) if comentarios else '')
                     + seletor + corpo)
        i = j
    return ''.join(saida)


def main():
    if not PORTAL.exists():
        raise SystemExit('falta o clone do portal em ' + str(PORTAL))

    sala = (PORTAL / 'app' / '(painel)' / 'rastreamento'
            / 'rastreamento.css').read_text(encoding='utf-8')
    # As pecas que viajam para o `body` precisam das mesmas variaveis.
    sala = sala.replace('.rs, .rs-palco, .rs-tip {',
                        '.rs, .rs-palco, .rs-tip, .sp, .prev {')
    escuro = ':root[data-theme="dark"] '
    sala = sala.replace(escuro + '.rs-tip {',
                        escuro + '.rs-tip,' + chr(10)
                        + escuro + '.sp,' + chr(10)
                        + escuro + '.prev {')

    comum = (AQUI / 'comum.css').read_text(encoding='utf-8')
    pagina = (AQUI / 'proposta-a.html').read_text(encoding='utf-8')
    proprio = re.search(r'<style>(.*?)</style>', pagina, re.S).group(1)

    ALVO.write_text(
        CABECA
        + '/* ====== 1. a sala de controle, recortada do portal ====== */' + chr(10)
        + sala + chr(10)
        + '/* ====== 2. o compartilhado das propostas ====== */' + chr(10)
        + escopar(comum, '#pag-analytics') + chr(10)
        + '/* ====== 3. o especifico desta aba ====== */' + chr(10)
        + escopar(proprio, '#pag-analytics'),
        encoding='utf-8')
    print('04-analytics.css', round(ALVO.stat().st_size / 1024), 'KB')


if __name__ == '__main__':
    main()
