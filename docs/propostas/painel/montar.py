# -*- coding: utf-8 -*-
"""Monta as tres propostas de layout da ABA PAINEL, a home do Postador.

O QUE A HOME RESPONDE, e que NAO E' o que a aba de Analytics responde:

    Analytics = DESEMPENHO de uma conta (seguidores, alcance, visualizacao).
    Painel    = ESTADO DA OPERACAO da rede inteira: a rede esta' de pe'? vai sair
                conteudo? tem material guardado? o que esta' travando agora?

Nada aqui repete a ficha de perfil nem a tabela de publicacoes do Analytics.

O QUE E' REAL: tudo. As contas, o estado de cada uma, a fila, o acervo do livro-caixa,
as publicacoes que a Meta conhece e a serie de 90 dias saem do painel NO AR, logado,
pela captura abaixo. Nada e' inventado, e onde o numero e' zero a tela diz por que.

Rodar na raiz do repositorio:
    python docs/propostas/painel/montar.py --capturar
    python docs/propostas/painel/montar.py
"""
import base64
import json
import pathlib
import shutil
import sys
from datetime import datetime

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
PORTAL = pathlib.Path.home() / 'repos' / 'borusa-iscas'
REAIS = AQUI / 'reais.json'
BASE = 'https://postador.borusa.com.br/'
HOJE = datetime.now().replace(second=0, microsecond=0)

# As folhas que entram, na ordem numerica que e' lei no painel. Ficam de fora as abas
# que esta tela nao usa (calendario, janela de post, programar e foco).
# O `11-programar.css` entra por causa do `.ag-selo`, o selo de agenda de dentro do
# botao animado: sem ele o simbolo sobe em tamanho natural e o botao vira um cartaz.
ORDEM = ['01-base.css', '02-menu.css', '03-componentes.css', '04-analytics.css',
         '06-midias.css', '08-filtros.css', '10-painel.css', '11-programar.css',
         '13-contas.css']

# A FOLHA DO ANALYTICS E' ESCOPADA POR `#pag-analytics`. Trocando o escopo por uma
# classe, a mesma folha vale nesta pagina sem copiar uma linha de estilo: cartao de
# indicador (`.rs-cd.rs-kpi`), pilula de variacao (`.rs-delta`), segmentado
# (`.rs-seg`), mapa de calor (`.rs-hm`), fita de eventos (`.rs-ev`) e o motor de
# grafico (`.gr`) chegam prontos.
ESCOPO = ('#pag-analytics', '.rs-casa')

# O motor de grafico e as utilidades moram em `00-comum.js` desde o corte de 09/09.
# Aqui ele e' COPIADO inteiro, e a copia e' conferida: peca que ja' existe no painel
# nao se reescreve.
PRECISA = ['window.montarGrafico', 'window.tempoUtil', 'window.montarPaginacao']


def capturar():
    """Le' o painel no ar, logado, e grava `reais.json`."""
    import http.cookiejar
    import urllib.request
    senha = (RAIZ / 'senha.txt').read_text(encoding='utf-8').strip()
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    op.open(urllib.request.Request(
        BASE + 'entrar', data=json.dumps({'usuario': 'gabriel', 'senha': senha}).encode(),
        headers={'Content-Type': 'application/json'}), timeout=30).read()

    def ler(rota):
        with op.open(BASE + rota, timeout=180) as r:
            return json.loads(r.read().decode('utf-8'))

    pac = {'rede': ler('painel/rede'), 'pastas': ler('midia/ligadas')['pastas'],
           'saidas': ler('calendario/saidas')['saidas'], 'meta': ler('contas/meta'),
           'estado': ler('midia/estado')}
    # O DESEMPENHO ENTRA NA HOME por decisao dele em 11/09/2026, depois de reprovar a
    # primeira rodada por falta de grafico: so' com operacao (2 contas, fila zero) nao
    # ha' o que desenhar. Daqui saem visualizacao, curtida, comentario e engajamento
    # por publicacao, o formato e a hora de cada saida.
    pac['contas'] = {}
    for c in pac['rede']['contas']:
        try:
            pac['contas'][c['arroba']] = ler('conta?u=' + c['arroba'])
        except Exception:
            pac['contas'][c['arroba']] = {}
    # O RETRATO JA' VEM EMBUTIDO na resposta de `painel/rede`, como `data:image/jpeg`.
    # Tratar isso como endereco e tentar baixar zerava o campo em silencio, e as tres
    # propostas apareciam sem retrato nenhum. So' baixa o que for endereco de verdade.
    for c in pac['rede']['contas']:
        end = c.get('avatar') or ''
        if end and not end.startswith('data:'):
            try:
                with op.open(BASE + end, timeout=60) as r:
                    c['avatar'] = ('data:image/jpeg;base64,'
                                   + base64.b64encode(r.read()).decode())
            except Exception:
                c['avatar'] = ''
    REAIS.write_text(json.dumps(pac, ensure_ascii=False), encoding='utf-8')
    print('reais.json', round(REAIS.stat().st_size / 1024), 'KB')


def dados(reais):
    """O pacote que as tres propostas leem. So' agrega o que veio do painel."""
    rede = reais['rede']
    pastas = reais.get('pastas') or []
    saidas = sorted([s for s in reais.get('saidas') or [] if s.get('quando')],
                    key=lambda s: s['quando'])
    meta = (reais.get('meta') or {}).get('contas') or {}

    # prateleira e acervo por conta: o livro-caixa guarda pasta, e pasta pertence a
    # uma conta so' (decisao dele em 10/09).
    por_conta = {}
    for p in pastas:
        dono = p.get('conta') or ''
        alvo = por_conta.setdefault(dono, {'prateleira': 0, 'total': 0, 'pastas': 0,
                                           'vazias': 0})
        alvo['prateleira'] += p.get('prateleira') or 0
        alvo['total'] += p.get('total') or 0
        alvo['pastas'] += 1
        if not p.get('total'):
            alvo['vazias'] += 1

    # as publicacoes com os numeros de desempenho, conta a conta
    fichas = reais.get('contas') or {}
    posts = []
    for arroba, ficha in fichas.items():
        for p in (ficha.get('posts') or []):
            posts.append({
                'conta': arroba, 'sc': p.get('sc') or '', 'fmt': p.get('fmt') or 'reel',
                'quando': (p.get('quando') or '')[:19],
                'views': p.get('views') or 0, 'cur': p.get('cur') or 0,
                'com': p.get('com') or 0, 'eng': p.get('eng') or 0,
                'legenda': p.get('legenda') or '',
            })
    posts.sort(key=lambda p: p['quando'])

    contas = []
    for c in rede['contas']:
        a = c['arroba']
        # quantas saidas esta conta tem na serie de 90 dias, dia a dia
        serie = [[p['dia'], (p.get('contas') or {}).get(a, 0)] for p in rede['serie']]
        acervo = por_conta.get(a) or {'prateleira': 0, 'total': 0, 'pastas': 0,
                                      'vazias': 0}
        contas.append({
            'u': a, 'nome': c.get('nome') or a, 'avatar': c.get('avatar') or '',
            'ligada': bool(c.get('ligada')), 'fila': c.get('fila') or 0,
            'erros': c.get('erros24h') or 0, 'ultimo': c.get('ultimo') or '',
            'publicando': bool(c.get('publicando')),
            'mercado': (meta.get(a) or {}).get('mercado') or '',
            'etiquetas': (meta.get(a) or {}).get('etiquetas') or [],
            'prateleira': acervo['prateleira'], 'pastas': acervo['pastas'],
            'serie': serie,
            'posts90': sum(v for _, v in serie),
            'saidas': [s for s in saidas if s.get('conta') == a],
            'meus': [p for p in posts if p['conta'] == a],
            'mediana': (fichas.get(a) or {}).get('mediana') or 0,
            'percurso': (fichas.get(a) or {}).get('percurso') or {},
            'formatos': (fichas.get(a) or {}).get('formatos') or {},
        })

    # o acervo que nao esta' ligado a conta nenhuma continua contando para a rede
    prateleira = sum(p.get('prateleira') or 0 for p in pastas)
    return {
        'hoje': HOJE.strftime('%Y-%m-%dT%H:%M:%S'),
        'contas': contas,
        'resumo': dict(rede['resumo'], prateleira=prateleira,
                       fila=sum(c['fila'] for c in contas),
                       erros=sum(c['erros'] for c in contas),
                       posts90=sum(c['posts90'] for c in contas),
                       vazias=sum(1 for p in pastas if not p.get('total')),
                       views=sum(p['views'] for p in posts),
                       eng=sum(p['eng'] for p in posts),
                       publicados=len(posts),
                       acervo=sum(p.get('total') or 0 for p in pastas)),
        'serie': rede['serie'], 'semana': rede['semana'], 'posts': posts,
        'pastas': [{'nome': p.get('nome') or '', 'conta': p.get('conta') or '',
                    'total': p.get('total') or 0,
                    'prateleira': p.get('prateleira') or 0,
                    'programados': p.get('programados') or 0,
                    'publicados': p.get('publicados') or 0,
                    'erro': p.get('erro') or 0} for p in pastas],
        'saidas': [{'titulo': s.get('titulo') or 'Publicação', 'conta': s.get('conta'),
                    'quando': (s.get('quando') or '')[:19], 'fmt': s.get('fmt') or 'reel',
                    'estado': s.get('estado') or 'publicado', 'sc': s.get('sc') or ''}
                   for s in saidas],
        'fonte': reais.get('estado') or {},
    }


def css():
    pedacos = []
    for nome in ORDEM:
        folha = (RAIZ / 'painel' / 'estilo' / nome).read_text(encoding='utf-8')
        if nome == '04-analytics.css':
            if ESCOPO[0] not in folha:
                raise SystemExit('o escopo ' + ESCOPO[0] + ' sumiu do 04-analytics')
            folha = folha.replace(*ESCOPO)
        pedacos.append('/* ===== ' + nome + ' ===== */')
        pedacos.append(folha)
    (AQUI / 'painel.css').write_text('\n'.join(pedacos), encoding='utf-8')

    if not PORTAL.exists():
        raise SystemExit('falta o portal em ' + str(PORTAL))
    sala = (PORTAL / 'app' / '(painel)' / 'rastreamento'
            / 'rastreamento.css').read_text(encoding='utf-8')
    # AS VARIAVEIS DA SALA VIVEM EM `.rs`, e sem elas `--rs-trilho` chega vazio: o
    # mapa de calor sai transparente e o quadro some. A pagina desta proposta e'
    # `.rs-casa`, entao ela entra na mesma lista, nos dois temas. Cada seletor do
    # tema escuro e' qualificado um a um, como o proprio arquivo avisa.
    troca = [('.rs, .rs-palco, .rs-tip {', '.rs, .rs-palco, .rs-tip, .rs-casa {'),
             (':root[data-theme="dark"] .rs-tip {',
              ':root[data-theme="dark"] .rs-tip,\n'
              ':root[data-theme="dark"] .rs-casa {')]
    for de, para in troca:
        if de not in sala:
            raise SystemExit('o rastreamento.css mudou: nao achei ' + de)
        sala = sala.replace(de, para, 1)
    # `.rs` traz `display:flex` junto das variaveis; aqui quem manda no empilhamento
    # e' o `#pn-palco`, entao a pagina fica com o display dela.
    sala += ('\n/* ajuste desta pagina: a classe entrou so\' para herdar as variaveis */'
             '\n.rs-casa { display: block; gap: 0 }\n')
    (AQUI / 'sala.css').write_text(
        '/* ===== rastreamento.css: A SALA DE CONTROLE ===== */\n' + sala,
        encoding='utf-8')


def casa():
    """Copia o `00-comum.js` do painel e confere que o motor veio junto."""
    fonte = (RAIZ / 'painel' / 'codigo' / '00-comum.js').read_text(encoding='utf-8')
    for marca in PRECISA:
        if marca not in fonte:
            raise SystemExit('o 00-comum.js nao tem mais ' + marca)
    (AQUI / 'casa.js').write_text(fonte, encoding='utf-8')


# O PAINEL TEM O MOTOR DE GRAFICO MAS NAO TEM A FOLHA DELE. Medido em 11/09/2026: as
# classes que `montarGrafico` escreve (`.gaba`, `.gl`, `.gb`, `.gg`, `.gt`, o balao e a
# aba) NAO EXISTEM em `painel/estilo/`; elas ficaram no Social Tracker, que e' de onde
# o motor veio. E' por isso que o grafico da home no ar aparece com a aba chapada e o
# periodo sem controle. A folha e' RECORTADA de la', nao reescrita.
TRACKER = (pathlib.Path.home() / 'repos' / 'social-tracker' / 'telas'
           / 'estilo.bb7d50b95d.css')
CORTE = ('/* ======================================== o Chart, traduzido do shadcn',
         '/* -------- faixa 6')
GRAFICO_PRECISA = ['.gaba', '.gl{', '.gb{', '.gg{', '.grafico-balao', '.grafico-tela']


def grafico():
    if not TRACKER.exists():
        raise SystemExit('falta o Social Tracker em ' + str(TRACKER))
    fonte = TRACKER.read_text(encoding='utf-8')
    a = fonte.find(CORTE[0])
    b = fonte.find(CORTE[1], a + 1)
    if a < 0 or b < 0:
        raise SystemExit('o bloco do grafico mudou de marca no Social Tracker')
    bloco = fonte[a:b]
    for marca in GRAFICO_PRECISA:
        if marca not in bloco:
            raise SystemExit('o recorte do grafico perdeu ' + marca)
    # a regra do cartao modelo do tracker nao vale aqui: nesta tela o grafico ja' mora
    # dentro do `.rs-cd`, e a borda dupla so' engorda a peca.
    bloco = bloco.replace('.sinal-corpo.modelo .grafico', '.pn-nunca .grafico')
    (AQUI / 'grafico.css').write_text(
        '/* ===== RECORTADO de social-tracker/telas/estilo.bb7d50b95d.css =====\n'
        '   O motor (`window.montarGrafico`) veio do tracker e escreve estas classes.\n'
        '   O painel tem o motor e nao tem a folha: por isso o grafico da home no ar\n'
        '   sai sem estilo. Aqui ela entra copiada, sem uma linha reescrita. */\n'
        + bloco, encoding='utf-8')


def main():
    if '--capturar' in sys.argv:
        capturar()
    if not REAIS.exists():
        raise SystemExit('falta reais.json: rode com --capturar uma vez')

    css()
    casa()
    grafico()
    d = dados(json.loads(REAIS.read_text(encoding='utf-8')))
    (AQUI / 'dados.js').write_text(
        'window.DADOS_PN = ' + json.dumps(d, ensure_ascii=False) + ';\n',
        encoding='utf-8')

    molde = (AQUI / 'pagina.html').read_text(encoding='utf-8')
    NOMES = {'a': 'A Sala', 'b': 'O Mural', 'c': 'O Mosaico'}
    for letra in ('a', 'b', 'c'):
        pagina = (molde.replace('{{LETRA}}', letra.upper())
                  .replace('{{NOME}}', NOMES[letra])
                  .replace('{{ESTILO}}', (AQUI / ('proposta-' + letra + '.css'))
                           .read_text(encoding='utf-8'))
                  .replace('{{SCRIPT}}', (AQUI / ('proposta-' + letra + '.js'))
                           .read_text(encoding='utf-8')))
        for marca in ('{{LETRA}}', '{{NOME}}', '{{ESTILO}}', '{{SCRIPT}}'):
            if marca in pagina:
                raise SystemExit('molde nao preenchido: ' + marca)
        (AQUI / ('proposta-' + letra + '.html')).write_text(pagina, encoding='utf-8')

    for marca in ('marca-clara.png', 'marca-escura.png'):
        shutil.copy(RAIZ / 'painel' / marca, AQUI / marca)

    for nome in ('painel.css', 'sala.css', 'grafico.css', 'casa.js', 'dados.js'):
        p = AQUI / nome
        print(nome.ljust(11), round(p.stat().st_size / 1024), 'KB')
    r = d['resumo']
    print('contas', r['total'], '| de pé', r['total'] - r['caidas'],
          '| fila', r['fila'], '| prateleira', r['prateleira'],
          '| posts em 90 dias', r['posts90'], '| saídas', len(d['saidas']))


if __name__ == '__main__':
    main()
