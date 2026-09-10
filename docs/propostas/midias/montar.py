# -*- coding: utf-8 -*-
"""Monta os arquivos gerados das tres propostas da sub-aba MIDIAS da ficha da conta.

POR QUE ESTE SCRIPT EXISTE. A maquete tem que ser a tela real: mesmo CSS, mesmas
classes, mesmo motor. A sub-aba Midias nao vive sozinha, ela nasce DENTRO da ficha da
conta, entao a maquete carrega o `07-contas.js` DE VERDADE, com um unico enxerto: um
quarto botao na tira de sub-abas e um gancho para o corpo. Cada proposta define o seu
`window.CORPO_MIDIAS(c)`, e o resto da ficha (Estado, Diario, Identidade, rodape,
janelas) e' exatamente o que esta' no ar.

O QUE ELE GERA (tudo fora do git):
  painel.css   os blocos de estilo do painel, na ordem numerica que e' lei
  sala.css     a sala de controle do portal, para a capa e os numeros
  contas.js    copia enxertada do painel/codigo/07-contas.js
  dados.js     o estado real do painel no ar + as midias
  marca-*.png  a marca, copiada de painel/

O QUE E' REAL E O QUE E' EXEMPLO. Real: as tres contas com retrato, tipo, validade,
tira de 30 dias e diario, lidos do painel no ar; a pasta "Teste 123" ligada de
verdade; a pasta "leva 31 de leisdamentemilionaria" que existe no Drive dele; e as 7
publicacoes da @borusaof com data, legenda, visualizacao e miniatura. Exemplo
declarado: tudo o que e' arquivo de video, porque o livro-caixa esta' com ZERO videos
gravados. Todo item de exemplo carrega `exemplo:true` e a tela mostra isso na cara.

Rodar na raiz do repositorio:
    python docs/propostas/midias/montar.py --capturar   (rele o painel no ar)
    python docs/propostas/midias/montar.py              (so' monta)
"""
import base64
import json
import pathlib
import random
import shutil
import sys
from datetime import datetime, timedelta

RAIZ = pathlib.Path(__file__).resolve().parents[3]
SAIDA = pathlib.Path(__file__).resolve().parent
PORTAL = pathlib.Path.home() / 'repos' / 'borusa-iscas'
REAIS = SAIDA / 'reais.json'
BASE = 'https://postador.borusa.com.br/'

ORDEM = ['01-base.css', '02-menu.css', '03-componentes.css', '08-filtros.css',
         '10-painel.css', '11-programar.css', '13-contas.css']

HOJE = datetime(2026, 9, 10, 11, 0)

# Nomes de arquivo no formato que sai de uma leva de cortes. A pasta e' real: ela
# existe no Drive dele, foi lida agora pela rota `midia/navegar`.
PASTAS = {
    'borusaof': {'nome': 'leva 31 de leisdamentemilionaria', 'id': 'lv31'},
    'macrofoco.br': {'nome': 'macrofoco cortes setembro', 'id': 'mf09'},
    'perdeunovar': {'nome': 'perdeu novar leva 08', 'id': 'pn08'},
}

TEMAS = [
    'gancho do minuto 3', 'a virada da conversa', 'o numero que ninguem mostra',
    'resposta curta', 'o erro comum', 'a parte cortada', 'o dado que assusta',
    'pergunta que travou', 'o antes e depois', 'a regra nova',
    'o detalhe que passa batido', 'tres minutos de mercado',
]


# ============================================================ captura do ar
def capturar():
    """Le' o painel no ar, logado, e grava `reais.json`. Sem isto a maquete seria
    desenhada de cabeca, que foi exatamente o erro que ele pegou na rodada passada."""
    import http.cookiejar
    import urllib.request
    senha = (RAIZ / 'senha.txt').read_text(encoding='utf-8').strip()
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    op.open(urllib.request.Request(
        BASE + 'entrar', data=json.dumps({'usuario': 'gabriel', 'senha': senha}).encode(),
        headers={'Content-Type': 'application/json'}), timeout=30).read()

    def ler(rota, bruto=False):
        with op.open(BASE + rota, timeout=120) as r:
            dado = r.read()
        return dado if bruto else json.loads(dado.decode('utf-8'))

    pacote = {'estado': ler('contas/estado'), 'meta': ler('contas/meta'),
              'pastas': ler('midia/ligadas'), 'drive': ler('midia/navegar?pasta=&busca=')}
    # O RETRATO VIRA DATA URL. O endereco da Meta e' assinado e caduca; a maquete
    # publicada na Vercel nao tem como pedir a rota do painel, que exige sessao.
    for c in pacote['estado'].get('contas', []):
        if c.get('avatar'):
            try:
                bruto = ler(c['avatar'], bruto=True)
                c['avatar'] = 'data:image/jpeg;base64,' + base64.b64encode(bruto).decode()
            except Exception:
                c['avatar'] = ''
    REAIS.write_text(json.dumps(pacote, ensure_ascii=False), encoding='utf-8')
    print('reais.json', round(REAIS.stat().st_size / 1024), 'KB',
          '|', len(pacote['estado'].get('contas', [])), 'contas')


# ============================================================ as midias
def midias_da_conta(u, capas, publicados_reais):
    """Tres estados, que sao os tres que ele pediu ver: ja' foram ao ar, estao
    marcados para sair, e estao guardados sem uso.

    NADA AQUI E' REAL, e por isso tudo vai marcado. O livro-caixa do painel tem ZERO
    videos: a pasta esta' ligada mas nunca foi lida com arquivo dentro. A excecao sao
    as 7 publicacoes da @borusaof, que a Meta conhece e que entram com data, legenda,
    visualizacao e miniatura de verdade."""
    rnd = random.Random('midias' + u)
    pasta = PASTAS[u]['nome']
    fora = []

    # 1. o que ja' foi ao ar
    for i, p in enumerate(publicados_reais):
        quando = (p.get('quando') or '')[:19]
        fora.append(item(
            ident='real-' + str(p.get('sc') or i), nome=arquivo(rnd, i, u),
            estado='publicado', quando=quando, capa=i % max(len(capas), 1),
            legenda=p.get('legenda') or '', vis=p.get('views') or 0,
            alc=None, rnd=rnd, exemplo=False, pasta=pasta, sc=p.get('sc')))
    faltam = (9 if u == 'borusaof' else 6) - len(fora)
    for i in range(max(faltam, 0)):
        d = HOJE - timedelta(days=3 + i * 2.3, hours=rnd.randint(0, 8))
        fora.append(item(
            ident='ex-p-' + u + str(i), nome=arquivo(rnd, 40 + i, u), estado='publicado',
            quando=d.strftime('%Y-%m-%dT%H:%M:%S'), capa=(i + 2) % max(len(capas), 1),
            legenda=TEMAS[(i + 4) % len(TEMAS)], vis=int(rnd.lognormvariate(5.6, 1.0)) + 30,
            alc=None, rnd=rnd, exemplo=True, pasta=pasta, sc=None))

    # 2. o que esta' marcado para sair
    for i in range(4 if u != 'perdeunovar' else 2):
        d = HOJE + timedelta(days=i * 0.9 + 0.3, hours=rnd.randint(0, 5))
        fora.append(item(
            ident='ex-m-' + u + str(i), nome=arquivo(rnd, 60 + i, u), estado='programado',
            quando=d.strftime('%Y-%m-%dT%H:%M:%S'), capa=(i + 5) % max(len(capas), 1),
            legenda=TEMAS[(i + 1) % len(TEMAS)], vis=None, alc=None, rnd=rnd,
            exemplo=True, pasta=pasta, sc=None))

    # 3. o que esta' guardado, sem uso
    quantos = {'borusaof': 23, 'macrofoco.br': 31, 'perdeunovar': 7}[u]
    for i in range(quantos):
        fora.append(item(
            ident='ex-g-' + u + str(i), nome=arquivo(rnd, 80 + i, u), estado='guardado',
            quando=None, capa=(i + 1) % max(len(capas), 1),
            legenda='', vis=None, alc=None, rnd=rnd, exemplo=True, pasta=pasta, sc=None))
    return fora


def arquivo(rnd, i, u):
    return '%s-%s.mp4' % (u.split('.')[0][:9], str(1000 + i * 7 + rnd.randint(0, 6)))


def item(ident, nome, estado, quando, capa, legenda, vis, alc, rnd, exemplo, pasta, sc):
    dur = round(rnd.uniform(21, 68), 1)
    fora = {'id': ident, 'nome': nome, 'estado': estado, 'quando': quando,
            'capa': capa, 'legenda': legenda, 'pasta': pasta, 'sc': sc,
            'dur': dur, 'mb': round(rnd.uniform(4.2, 38.6), 1), 'exemplo': exemplo}
    if vis is not None:
        fora['vis'] = vis
        fora['alc'] = alc if alc is not None else max(int(vis * rnd.uniform(.55, .88)), 9)
        fora['inter'] = int(fora['alc'] * rnd.uniform(.01, .07))
    return fora


# ============================================================ o motor da ficha
def contas_js():
    """Copia o `07-contas.js` do painel com DOIS enxertos, e nada mais.

    Reescrever o arquivo para a maquete seria produzir uma segunda ficha, que diverge
    da primeira no dia seguinte. Os dois enxertos sao cirurgicos e o script CONFERE que
    aconteceram: se o arquivo do painel mudar de forma, isto para aqui e nao na tela."""
    fonte = (RAIZ / 'painel' / 'codigo' / '07-contas.js').read_text(encoding='utf-8')

    alvo1 = ("'>Identidade</button>' +")
    novo1 = ("'>Identidade</button>' +\n"
             "        '<button data-aba=\"midias\"' + (qual === 'midias' ? ' class=\"on\"' : '') +\n"
             "          '>Mídias' + (window.CONTA_MIDIAS ? window.CONTA_MIDIAS(c) : '') +\n"
             "          '</button>' +")
    alvo2 = ("var corpo = qual === 'diario' ? corpoDiario(c)\n"
             "      : (qual === 'identidade' ? corpoIdentidade(c) : corpoEstado(c));")
    novo2 = ("var corpo = qual === 'midias' && window.CORPO_MIDIAS ? window.CORPO_MIDIAS(c)\n"
             "      : (qual === 'diario' ? corpoDiario(c)\n"
             "      : (qual === 'identidade' ? corpoIdentidade(c) : corpoEstado(c)));")
    # A JANELA DA CASA E' DE DENTRO DO ARQUIVO. As tres propostas precisam dela (ligar
    # pasta, abrir a lista inteira), e desenhar uma segunda janela seria ter duas
    # janelas diferentes na primeira mudanca. Expor e' o que a implantacao real fara'.
    alvo3 = "  function janelaAberta(){ return !!JAN && !JAN.hidden; }"
    novo3 = (alvo3 + "\n"
             "  window.CT_JANELA = {abrir: function(a,b,c,d){ return abrirJanela(a,b,c,d); },\n"
             "    fechar: function(){ return fecharJanela(); },\n"
             "    trocar: function(a,b,c){ return trocarCorpo(a,b,c); },\n"
             "    cabConta: function(c,t){ return cabConta(c,t); },\n"
             "    cabSimples: function(s,t,u){ return cabSimples(s,t,u); },\n"
             "    rosto: function(c){ return rosto(c, indiceDe(c.arroba)); },\n"
             "    contaDe: function(u){ return (DADOS.contas||[]).filter(function(x){\n"
             "      return x.arroba === u; })[0]; },\n"
             "    redesenhar: function(){ desenhar(); }};")
    for alvo in (alvo1, alvo2, alvo3):
        if fonte.count(alvo) != 1:
            raise SystemExit('ENXERTO RECUSADO: nao achei exatamente uma vez -> '
                             + alvo[:60])
    fonte = fonte.replace(alvo1, novo1).replace(alvo2, novo2).replace(alvo3, novo3)
    cabeca = ('/* COPIA GERADA de painel/codigo/07-contas.js pelo montar.py das\n'
              '   propostas de Midias. Dois enxertos: o quarto botao da tira de\n'
              '   sub-abas e o gancho window.CORPO_MIDIAS. NAO EDITE AQUI. */\n')
    (SAIDA / 'contas.js').write_text(cabeca + fonte, encoding='utf-8')


def paginas(midias):
    """Costura as tres paginas a partir do molde `pagina.html`.

    UM MOLDE SO', e nao tres HTML completos: o miolo (menu, aba de Contas, janela) e'
    identico nas tres, e tres copias divergiriam na primeira correcao. Cada proposta
    entra com dois arquivos pequenos, `proposta-X.css` e `proposta-X.js`."""
    molde = (SAIDA / 'pagina.html').read_text(encoding='utf-8')
    reais = sum(1 for l in midias.values() for m in l if not m['exemplo'])
    total = sum(len(l) for l in midias.values())
    nota = ('As contas, os retratos, a tira de 30 dias e o diário são reais, lidos do '
            'painel no ar. Das ' + str(total) + ' mídias, ' + str(reais) + ' são as '
            'publicações que a Meta conhece; o resto é exemplo, marcado com o ponto '
            'cinza, porque o livro do painel ainda está com zero vídeos.')
    for letra in ('a', 'b', 'c'):
        pagina = (molde
                  .replace('{{LETRA}}', letra.upper())
                  .replace('{{NOTA}}', nota)
                  .replace('{{ESTILO}}',
                           (SAIDA / ('proposta-' + letra + '.css')).read_text(
                               encoding='utf-8'))
                  .replace('{{SCRIPT}}',
                           (SAIDA / ('proposta-' + letra + '.js')).read_text(
                               encoding='utf-8')))
        for marca in ('{{LETRA}}', '{{ESTILO}}', '{{SCRIPT}}', '{{NOTA}}'):
            if marca in pagina:
                raise SystemExit('molde nao preenchido: ' + marca)
        (SAIDA / ('proposta-' + letra + '.html')).write_text(pagina, encoding='utf-8')


def sala():
    if not PORTAL.exists():
        print('sala.css   PULADO, falta o clone em', PORTAL)
        return
    folha = ('/* ===== anda.css (repo borusa-iscas) ===== */\n'
             + (PORTAL / 'app' / 'anda.css').read_text(encoding='utf-8')
             + '\n/* ===== rastreamento.css: A SALA DE CONTROLE ===== */\n'
             + (PORTAL / 'app' / '(painel)' / 'rastreamento'
                / 'rastreamento.css').read_text(encoding='utf-8'))
    # As pecas que viajam para o `body` (a previa, a janela) precisam das variaveis.
    folha = folha.replace('.rs, .rs-palco, .rs-tip {',
                          '.rs, .rs-palco, .rs-tip, .prev, .ct-jan {')
    escuro = ':root[data-theme="dark"] '
    folha = folha.replace(escuro + '.rs-tip {',
                          escuro + '.rs-tip,\n' + escuro + '.prev,\n'
                          + escuro + '.ct-jan {')
    (SAIDA / 'sala.css').write_text(folha, encoding='utf-8')


def main():
    if '--capturar' in sys.argv:
        capturar()
    if not REAIS.exists():
        raise SystemExit('falta reais.json: rode com --capturar uma vez')

    pedacos = []
    for nome in ORDEM:
        pedacos.append('/* ===== ' + nome + ' ===== */')
        pedacos.append((RAIZ / 'painel' / 'estilo' / nome).read_text(encoding='utf-8'))
    (SAIDA / 'painel.css').write_text('\n'.join(pedacos), encoding='utf-8')

    reais = json.loads(REAIS.read_text(encoding='utf-8'))
    an = json.loads((RAIZ / 'painel' / 'analytics.json').read_text(encoding='utf-8'))
    capas = [m['mini'] for m in (an.get('previas') or {}).get('borusaof', [])
             if m.get('mini')]
    publicados = (an.get('fundo') or {}).get('borusaof', {}).get('posts', [])

    midias = {}
    for c in reais['estado'].get('contas', []):
        u = c['arroba']
        midias[u] = midias_da_conta(u, capas, publicados if u == 'borusaof' else [])

    dados = {
        'hoje': HOJE.strftime('%Y-%m-%dT%H:%M:%S'),
        'estado': reais['estado'], 'meta': reais['meta'],
        'pastas': reais['pastas'], 'drive': reais['drive'],
        'capas': capas, 'midias': midias,
        'donos': {u: PASTAS[u] for u in PASTAS},
    }
    (SAIDA / 'dados.js').write_text(
        'window.DADOS_MIDIAS = ' + json.dumps(dados, ensure_ascii=False) + ';\n',
        encoding='utf-8')

    contas_js()
    sala()
    paginas(midias)
    for marca in ('marca-clara.png', 'marca-escura.png'):
        shutil.copy(RAIZ / 'painel' / marca, SAIDA / marca)
    for nome in ('painel.css', 'sala.css', 'contas.js', 'dados.js'):
        p = SAIDA / nome
        if p.exists():
            print(nome.ljust(11), round(p.stat().st_size / 1024), 'KB')
    print('midias por conta:', {u: len(v) for u, v in midias.items()})


if __name__ == '__main__':
    main()
