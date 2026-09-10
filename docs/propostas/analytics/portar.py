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


def conferir(css: str) -> None:
    """RECUSA A FOLHA QUEBRADA. Duas vezes o escopador produziu seletor invalido (um
    comentario prefixado, um `@keyframes` picotado), e nas duas o navegador jogou
    fora O BLOCO SEGUINTE sem reclamar: a aba subiu sem o painel lateral. Erro de
    gerador tem que morrer aqui, e nao na tela dele."""
    problemas = []
    if re.search(r'#pag-analytics\s*/\*', css):
        problemas.append('comentario prefixado como seletor')
    if re.search(r'#pag-analytics\s*}', css):
        problemas.append('chave de fechamento prefixada')
    if re.search(r'#pag-analytics\s*(from|to)\s*{', css):
        problemas.append('quadro de animacao prefixado')
    if css.count('{') != css.count('}'):
        problemas.append('chaves desbalanceadas: %d abrem, %d fecham'
                         % (css.count('{'), css.count('}')))
    for alvo in ('.sp{', '.sp-fora{', '@keyframes spEntra'):
        if alvo not in css:
            problemas.append('sumiu do resultado: ' + alvo)
    if problemas:
        raise SystemExit('FOLHA RECUSADA: ' + '; '.join(problemas))


def escopar(css: str, escopo: str) -> str:
    """Prefixa cada seletor com o escopo, respeitando quem mora no `body`.

    Escrito na mao de proposito: puxar um pre-processador so' para prefixar uma folha
    seria trocar trinta linhas de leitura simples por uma dependencia nova. Em
    compensacao, o resultado passa pelo `conferir` antes de virar arquivo.

    O QUE ELE PRECISA RESPEITAR, e ja' errou nos tres:
      1. COMENTARIO entre regras nao e' seletor.
      2. BLOCO ARROBA (`@media`, `@keyframes`, `@supports`) tem chave dentro de
         chave, e o `@keyframes` nao pode ser escopado por dentro: `from` e `to` nao
         sao seletores de elemento.
      3. Espaco e quebra de linha antes do `@` nao podem esconder o bloco arroba.
    """
    saida, i, n = [], 0, len(css)
    while i < n:
        # 1. espaco solto e comentario passam inteiros
        if css[i].isspace():
            j = i
            while j < n and css[j].isspace():
                j += 1
            saida.append(css[i:j])
            i = j
            continue
        if css.startswith('/*', i):
            fim = css.find('*/', i + 2)
            fim = n if fim < 0 else fim + 2
            saida.append(css[i:fim])
            i = fim
            continue

        # 2. bloco arroba: consome do `@` ate' a chave que fecha, contando
        if css[i] == '@':
            abre = css.find('{', i)
            fim_linha = css.find(';', i)
            if abre < 0 or (0 <= fim_linha < abre):      # `@import`, `@charset`
                fim = n if fim_linha < 0 else fim_linha + 1
                saida.append(css[i:fim])
                i = fim
                continue
            profundidade, j = 1, abre + 1
            while j < n and profundidade:
                if css[j] == '{':
                    profundidade += 1
                elif css[j] == '}':
                    profundidade -= 1
                j += 1
            regra = css[i:abre]
            dentro = css[abre + 1:j - 1]
            # `@keyframes` vai inteiro; `@media` e afins tem seletor de verdade dentro
            if regra.lstrip('@').lower().startswith(('keyframes', 'font-face',
                                                     'property', 'counter-style')):
                saida.append(css[i:j])
            else:
                saida.append(regra + '{' + escopar(dentro, escopo) + '}')
            i = j
            continue

        # 3. regra comum
        abre = css.find('{', i)
        if abre < 0:
            saida.append(css[i:])
            break
        fecha = css.find('}', abre)
        fecha = n if fecha < 0 else fecha + 1
        bruto = css[i:abre]
        comentarios = re.findall(r'/\*.*?\*/', bruto, re.S)
        seletor = re.sub(r'/\*.*?\*/', '', bruto, flags=re.S).strip()
        partes = []
        for parte in seletor.split(','):
            p = parte.strip()
            if not p:
                continue
            partes.append(p if p.startswith(LIVRES) else escopo + ' ' + p)
        saida.append((chr(10).join(comentarios) + chr(10) if comentarios else '')
                     + (',' + chr(10)).join(partes) + css[abre:fecha])
        i = fecha
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

    folha = (
        CABECA
        + '/* ====== 1. a sala de controle, recortada do portal ====== */' + chr(10)
        + sala + chr(10)
        + '/* ====== 2. o compartilhado das propostas ====== */' + chr(10)
        + escopar(comum, '#pag-analytics') + chr(10)
        + '/* ====== 3. o especifico desta aba ====== */' + chr(10)
        + escopar(proprio, '#pag-analytics'))
    conferir(folha)
    ALVO.write_text(folha, encoding='utf-8')
    print('04-analytics.css', round(ALVO.stat().st_size / 1024), 'KB')


if __name__ == '__main__':
    main()
