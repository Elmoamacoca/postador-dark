# -*- coding: utf-8 -*-
"""Monta as tres propostas de layout da ABA PAINEL, a home do Postador.

O TERRITORIO DA HOME, fechado na rodada 4 (11/09/2026), depois de seis layouts
reprovados por repetirem as outras abas:

    Calendario = QUANDO sai (mes, gantt, levas no tempo).
    Analytics  = COMO foi depois que saiu (alcance, visualizacao, engajamento).
    Contas     = QUEM sao os perfis (token, vinculo, ficha).
    Painel     = A MAQUINA: tem material? ela anda? onde emperra?

A unidade desta tela e' o VIDEO, e nao a conta nem a publicacao. Por isso o pacote
nao carrega ficha de perfil, nao carrega gantt e nao carrega numero de desempenho.

O QUE E' REAL: tudo. O livro-caixa, o estado de cada video, as levas ligadas, a
arvore da fonte e a serie de 90 dias saem do painel NO AR, logado, pela captura
abaixo. Nada e' inventado, e onde o numero e' zero a tela diz por que.

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
    # O ACERVO INTEIRO, VIDEO A VIDEO. E' a materia-prima desta home: `contas/midias`
    # devolve, por conta, cada arquivo com estado bruto (prateleira, baixado,
    # programado, publicado, erro), tamanho, leva, subpasta e o motivo do erro. Sem
    # isso a esteira so' teria o total de cada pasta, e nao o caminho de cada peca.
    pac['acervo'] = {}
    for c in pac['rede']['contas']:
        try:
            pac['acervo'][c['arroba']] = ler('contas/midias?conta=' + c['arroba'])
        except Exception:
            pac['acervo'][c['arroba']] = {'midias': []}
    # O DESEMPENHO DE CADA PERFIL, pela mesma rota que a aba de Analytics usa. Daqui
    # saem visualizacao, alcance, interacao, tempo medio assistido e a curva de
    # seguidores, publicacao por publicacao. A HOME NAO REPETE O ANALYTICS: la' e'
    # UMA conta por vez, em profundidade; aqui e' a REDE INTEIRA, comparada.
    pac['desempenho'] = {}
    for c in pac['rede']['contas']:
        try:
            pac['desempenho'][c['arroba']] = ler(
                'analytics/estado?u=' + c['arroba'] + '&dias=90')
        except Exception:
            pac['desempenho'][c['arroba']] = {}
    # O ANDAR DE CIMA DA FONTE: o que existe no Drive e ainda nao foi ligado. E' o
    # unico jeito de a home dizer se falta material la' fora ou se falta ligar o que
    # ja' esta' la'. Sem isso, "acervo zero" e "acervo nao ligado" viram a mesma tela.
    try:
        pac['drive'] = ler('midia/navegar')
    except Exception:
        pac['drive'] = {'pastas': [], 'trilha': []}
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
    """O pacote da ESTEIRA. So' agrega o que veio do painel no ar.

    A UNIDADE DESTA TELA E' O VIDEO, e nao a conta nem a publicacao. Por isso o
    pacote nao carrega ficha de perfil, gantt nem numero de desempenho: quem responde
    por aquilo sao as outras tres abas.
    """
    rede = reais['rede']
    pastas = reais.get('pastas') or []
    saidas = sorted([s for s in reais.get('saidas') or [] if s.get('quando')],
                    key=lambda s: s['quando'])

    # ------------------------------------------------------------------- as levas
    # A leva e' a caixa de material: uma pasta ligada, com dono, e o estado de cada
    # video dela. E' a linha de base de tudo nesta tela.
    levas = []
    for p in pastas:
        total = p.get('total') or 0
        prat = p.get('prateleira') or 0
        prog = p.get('programados') or 0
        pub = p.get('publicados') or 0
        err = p.get('erro') or 0
        ligada = (p.get('ligada_em') or '')[:10]
        dias = 0
        if ligada:
            try:
                dias = (HOJE.date() - datetime.strptime(ligada, '%Y-%m-%d').date()).days
            except ValueError:
                dias = 0
        levas.append({
            'nome': p.get('nome') or 'Sem nome', 'conta': p.get('conta') or '',
            'id': p.get('id') or '', 'caminho': p.get('caminho') or '',
            'total': total, 'prateleira': prat, 'programados': prog,
            'publicados': pub, 'erro': err,
            'ligada_em': ligada, 'dias': dias,
            'gasto': round(((pub + prog) / total) * 100) if total else 0,
        })
    levas.sort(key=lambda x: -x['total'])

    # ---------------------------------------------------------------- a esteira
    # As cinco estacoes do livro-caixa, na ordem em que o video anda. `baixado` e'
    # separado de `programado` de proposito: e' nele que a esteira costuma emperrar,
    # porque o arquivo ja' desceu e ainda nao tem hora marcada.
    esteira = {'prateleira': 0, 'programado': 0, 'publicado': 0, 'erro': 0}
    for x in levas:
        esteira['prateleira'] += x['prateleira']
        esteira['programado'] += x['programados']
        esteira['publicado'] += x['publicados']
        esteira['erro'] += x['erro']

    # ------------------------------------------------------- o tempo de maquina
    # 90 dias de retrato diario: em quantos deles a maquina publicou alguma coisa.
    # Nao e' desempenho de conta, e' tempo de maquina rodando.
    maquina = [{'dia': d['dia'],
                'saidas': sum((d.get('contas') or {}).values()),
                'ativas': d.get('publicando') or 0,
                'paradas': (d.get('paradas') or 0) + (d.get('caidas') or 0)}
               for d in rede['serie']]
    rodou = sum(1 for d in maquina if d['saidas'])
    saiu90 = sum(d['saidas'] for d in maquina)

    # quanto tempo faz que nada sai
    ultimo = saidas[-1]['quando'][:10] if saidas else ''
    parada = 0
    if ultimo:
        try:
            parada = (HOJE.date() - datetime.strptime(ultimo, '%Y-%m-%d').date()).days
        except ValueError:
            parada = 0

    # ------------------------------------------------------------------- a fonte
    est = reais.get('estado') or {}
    drive = reais.get('drive') or {}
    fora = [{'nome': p.get('nome') or '', 'videos': p.get('videos'),
             'ligada': bool(p.get('ligada'))} for p in (drive.get('pastas') or [])]

    # --------------------------------------------------------------- os perfis
    # Um por conta, com as ETIQUETAS que ele digitou na aba de Contas: sao elas que
    # alimentam o filtro do topo. Publicacao por publicacao vem crua, para a tela
    # recortar por periodo sem pedir de novo ao servidor.
    meta = (reais.get('meta') or {}).get('contas') or {}
    des = reais.get('desempenho') or {}
    perfis = []
    for c in rede['contas']:
        a = c['arroba']
        d = des.get(a) or {}
        m = meta.get(a) or {}
        eti = m.get('etiquetas') or []
        if isinstance(eti, str):
            eti = [x.strip() for x in eti.split(',') if x.strip()]
        posts = []
        for p in (d.get('posts') or []):
            posts.append({
                'perfil': a, 'sc': p.get('sc') or '', 'fmt': p.get('fmt') or 'reel',
                'quando': (p.get('quando') or '')[:19],
                'legenda': p.get('legenda') or '',
                'vis': p.get('vis') or 0, 'alc': p.get('alc') or 0,
                'cur': p.get('cur') or 0, 'com': p.get('com') or 0,
                'sal': p.get('sal') or 0, 'cmp': p.get('cmp') or 0,
                'inter': p.get('inter') or 0, 'medio': p.get('medio') or 0,
                'eng': p.get('eng') or 0,
                'endereco': p.get('endereco') or '',
            })
        posts.sort(key=lambda p: p['quando'])
        dono = [x for x in levas if x['conta'] == a]
        perfis.append({
            'u': a, 'nome': c.get('nome') or a, 'retrato': c.get('avatar') or '',
            'ligada': bool(c.get('ligada')),
            'mercado': m.get('mercado') or '', 'etiquetas': eti,
            'seguidores': d.get('seguidores') or 0,
            'curva': d.get('curva') or [],
            'ultima': (d.get('ultima') or '')[:19],
            'guardados': sum(x['prateleira'] for x in dono),
            'agendados': sum(x['programados'] for x in dono),
            'pastas': len(dono),
            'posts': posts,
        })

    acervo = sum(x['total'] for x in levas)
    return {
        'hoje': HOJE.strftime('%Y-%m-%dT%H:%M:%S'),
        'perfis': perfis,
        'esteira': esteira,
        'levas': levas,
        'maquina': maquina,
        'saidas': [{'titulo': s.get('titulo') or 'Publicação',
                    'conta': s.get('conta') or '',
                    'quando': (s.get('quando') or '')[:19],
                    'estado': s.get('estado') or 'publicado'} for s in saidas],
        'fonte': {'fonte': est.get('fonte') or '', 'pronta': bool(est.get('pronta')),
                  'motivo': est.get('motivo') or '', 'raiz': est.get('raiz') or '',
                  'robo': est.get('robo') or '',
                  'nome': ((drive.get('trilha') or [{}])[0] or {}).get('nome') or '',
                  'pastas': fora},
        'resumo': {
            'acervo': acervo,
            'prateleira': esteira['prateleira'],
            'fila': esteira['programado'],
            'publicados': esteira['publicado'],
            'erro': esteira['erro'],
            'levas': len(levas),
            'vazias': sum(1 for x in levas if not x['total']),
            'semdono': sum(1 for x in levas if not x['conta']),
            'gasto': round((sum(x['publicados'] + x['programados'] for x in levas)
                            / acervo) * 100) if acervo else 0,
            'saiu90': saiu90, 'rodou': rodou, 'parada': parada, 'ultimo': ultimo,
            'ritmo': round(saiu90 / 90.0, 2),
            'foraligado': sum(1 for p in fora if not p['ligada']),
            'perfis': len(perfis),
            'seguidores': sum(p['seguidores'] for p in perfis),
        },
        # todas as etiquetas que existem, para o filtro do topo
        'etiquetas': sorted({e for p in perfis for e in p['etiquetas']}),
        'mercados': sorted({p['mercado'] for p in perfis if p['mercado']}),
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
    # A pagina usa `.rs` de verdade, que ja' empilha em coluna com respiro de 18.
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
    NOMES = {'a': 'A Rede', 'b': 'Lado A Lado', 'c': 'O Quadro'}
    letras = [x for x in ('a', 'b', 'c') if (AQUI / ('proposta-' + x + '.js')).exists()]
    for letra in letras:
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
    print('acervo', r['acervo'], '| prateleira', r['prateleira'], '| fila', r['fila'],
          '| publicados', r['publicados'], '| erro', r['erro'],
          '| levas', r['levas'], '| parada ha', r['parada'], 'dias',
          '| saiu em 90', r['saiu90'])


if __name__ == '__main__':
    main()
