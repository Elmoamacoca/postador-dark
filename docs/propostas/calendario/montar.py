# -*- coding: utf-8 -*-
"""Monta as tres propostas de layout da aba de CALENDARIO.

A DECISAO QUE AS TRES OBEDECEM, tomada por ele em 10/09/2026: o calendario deixa de
ser global e passa a ser POR CONTA, como o Analytics, com "Toda A Rede" como escolha
explicita dentro do mesmo seletor. A rede continua acessivel porque o agendador
sorteia ate' 22 minutos de deslocamento para duas contas nunca postarem no mesmo
minuto, e conferir isso exige ver as contas juntas.

O QUE E' REAL: as tres contas com retrato e tipo, lidas do painel no ar; as 8
publicacoes que a Meta conhece, com data, legenda e conta; e as 180 midias da
@borusaof que estao no livro-caixa desde a implantacao de hoje, com nome de arquivo e
miniatura de verdade.

O QUE E' EXEMPLO DECLARADO: toda saida FUTURA. A agenda do painel esta vazia (nada
programado ainda), e um calendario sem nada marcado nao da' para julgar. Cada saida
inventada carrega `exemplo:true` e a tela mostra isso na cara.

Rodar na raiz do repositorio:
    python docs/propostas/calendario/montar.py --capturar
    python docs/propostas/calendario/montar.py
"""
import base64
import json
import pathlib
import random
import shutil
import sys
from datetime import datetime, timedelta

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
PORTAL = pathlib.Path.home() / 'repos' / 'borusa-iscas'
REAIS = AQUI / 'reais.json'
BASE = 'https://postador.borusa.com.br/'

ORDEM = ['01-base.css', '02-menu.css', '03-componentes.css', '06-midias.css',
         '07-calendario.css', '08-filtros.css', '10-painel.css', '11-programar.css',
         '13-contas.css']

HOJE = datetime(2026, 9, 10, 12, 0)

# O RITMO DE CADA CONTA no exemplo. Sai da curva de aquecimento do agendador: conta
# nova nao entra em ritmo pleno, e por isso a mais nova leva menos por dia.
RITMO = {'borusaof': 3, 'macrofoco.br': 2, 'perdeunovar': 1}
# As janelas de horario em que cada conta publica, tambem do agendador.
JANELA = {'borusaof': (9, 21), 'macrofoco.br': (11, 22), 'perdeunovar': (13, 20)}


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

    pac = {'saidas': ler('calendario/saidas')['saidas'], 'estado': ler('contas/estado'),
           'meta': ler('contas/meta'), 'midias': ler('contas/midias?u=borusaof')['midias']}
    for c in pac['estado']['contas']:
        if c.get('avatar'):
            try:
                with op.open(BASE + c['avatar'], timeout=60) as r:
                    c['avatar'] = ('data:image/jpeg;base64,'
                                   + base64.b64encode(r.read()).decode())
            except Exception:
                c['avatar'] = ''
    capas = []
    for m in pac['midias'][:48]:
        if not m.get('capa'):
            continue
        try:
            with op.open(BASE + m['capa'], timeout=60) as r:
                capas.append('data:image/jpeg;base64,'
                             + base64.b64encode(r.read()).decode())
        except Exception:
            pass
    pac['capas'] = capas
    REAIS.write_text(json.dumps(pac, ensure_ascii=False), encoding='utf-8')
    print('reais.json', round(REAIS.stat().st_size / 1024), 'KB')


def agenda(reais):
    """A agenda que a maquete mostra: o que ja' saiu (real) e o que vai sair (exemplo).

    O FUTURO E' INVENTADO PORQUE A AGENDA ESTA VAZIA. Nada foi programado ainda neste
    painel: a esteira que publica sozinha nao existe desde 29/08. Um calendario sem
    nada marcado nao da' para julgar, entao as saidas futuras entram marcadas como
    exemplo, com o ritmo e a janela de horario que o agendador de verdade usa.
    """
    saidas = []
    for s in reais['saidas']:
        saidas.append({
            'titulo': s.get('titulo') or 'Publicação', 'conta': s.get('conta'),
            'quando': (s.get('quando') or '')[:19], 'estado': 'publicado',
            'sc': s.get('sc'), 'capa': None, 'nome': '', 'exemplo': False})

    midias = reais.get('midias') or []
    capas = reais.get('capas') or []
    n = [0]
    for conta in ('borusaof', 'macrofoco.br', 'perdeunovar'):
        rnd = random.Random('cal' + conta)
        de, ate = JANELA[conta]
        # 21 dias para tras e 14 para frente: o suficiente para o mes ter volume e
        # para o buraco de agenda aparecer.
        for passo in range(-21, 15):
            dia = HOJE + timedelta(days=passo)
            quantas = RITMO[conta]
            # SEXTA E SABADO SAO MAIS FRACOS na rede dele, entao o exemplo tambem cai:
            # calendario todo cheio esconde justamente o que a tela serve para achar.
            if dia.weekday() in (4, 5):
                quantas = max(quantas - 1, 0)
            if passo in (-9, -8, 2, 3):      # o buraco, de proposito
                quantas = 0
            for i in range(quantas):
                m = midias[n[0] % max(len(midias), 1)] if midias else {}
                n[0] += 1
                hora = de + round((ate - de) * (i + 0.5) / max(quantas, 1))
                minuto = rnd.randint(0, 59)
                quando = dia.replace(hour=min(hora, 23), minute=minuto, second=0)
                saidas.append({
                    'titulo': m.get('pasta') or 'Corte',
                    'nome': m.get('nome') or '',
                    'conta': conta,
                    'quando': quando.strftime('%Y-%m-%dT%H:%M:%S'),
                    'estado': 'publicado' if passo < 0 else 'programado',
                    'sc': None,
                    'capa': (n[0] - 1) % max(len(capas), 1) if capas else None,
                    'vis': int(rnd.lognormvariate(5.4, 1.0)) + 25 if passo < 0 else None,
                    'exemplo': True})
    saidas.sort(key=lambda s: s['quando'])
    return saidas


def main():
    if '--capturar' in sys.argv:
        capturar()
    if not REAIS.exists():
        raise SystemExit('falta reais.json: rode com --capturar uma vez')

    pedacos = []
    for nome in ORDEM:
        pedacos.append('/* ===== ' + nome + ' ===== */')
        pedacos.append((RAIZ / 'painel' / 'estilo' / nome).read_text(encoding='utf-8'))
    (AQUI / 'painel.css').write_text('\n'.join(pedacos), encoding='utf-8')

    if PORTAL.exists():
        folha = ('/* ===== rastreamento.css: A SALA DE CONTROLE ===== */\n'
                 + (PORTAL / 'app' / '(painel)' / 'rastreamento'
                    / 'rastreamento.css').read_text(encoding='utf-8'))
        folha = folha.replace('.rs, .rs-palco, .rs-tip {',
                              '.rs, .rs-palco, .rs-tip, .cl-peek {')
        escuro = ':root[data-theme="dark"] '
        folha = folha.replace(escuro + '.rs-tip {',
                              escuro + '.rs-tip,\n' + escuro + '.cl-peek {')
        (AQUI / 'sala.css').write_text(folha, encoding='utf-8')

    reais = json.loads(REAIS.read_text(encoding='utf-8'))
    contas = []
    for c in reais['estado']['contas']:
        m = (reais['meta'].get('contas') or {}).get(c['arroba']) or {}
        contas.append({'u': c['arroba'], 'nome': c.get('nome') or c['arroba'],
                       'avatar': c.get('avatar') or '', 'tipo': c.get('tipo') or '',
                       'mercado': m.get('mercado') or '',
                       'etiquetas': m.get('etiquetas') or [],
                       'estado': c.get('estado') or 'viva'})

    dados = {'hoje': HOJE.strftime('%Y-%m-%dT%H:%M:%S'), 'contas': contas,
             'capas': reais.get('capas') or [], 'saidas': agenda(reais)}
    (AQUI / 'dados.js').write_text(
        'window.DADOS_CAL = ' + json.dumps(dados, ensure_ascii=False) + ';\n',
        encoding='utf-8')

    molde = (AQUI / 'pagina.html').read_text(encoding='utf-8')
    reais_n = sum(1 for s in dados['saidas'] if not s['exemplo'])
    nota = ('As contas e as ' + str(reais_n) + ' publicações que a Meta conhece são '
            'reais, e os nomes de arquivo e as miniaturas vêm das 180 mídias que estão '
            'no painel. Toda saída futura é exemplo, porque a agenda ainda está vazia: '
            'nada foi programado até hoje.')
    for letra in ('a', 'b', 'c'):
        pagina = (molde.replace('{{LETRA}}', letra.upper()).replace('{{NOTA}}', nota)
                  .replace('{{ESTILO}}', (AQUI / ('proposta-' + letra + '.css'))
                           .read_text(encoding='utf-8'))
                  .replace('{{SCRIPT}}', (AQUI / ('proposta-' + letra + '.js'))
                           .read_text(encoding='utf-8')))
        for marca in ('{{LETRA}}', '{{ESTILO}}', '{{SCRIPT}}', '{{NOTA}}'):
            if marca in pagina:
                raise SystemExit('molde nao preenchido: ' + marca)
        (AQUI / ('proposta-' + letra + '.html')).write_text(pagina, encoding='utf-8')

    for marca in ('marca-clara.png', 'marca-escura.png'):
        shutil.copy(RAIZ / 'painel' / marca, AQUI / marca)
    for nome in ('painel.css', 'sala.css', 'dados.js'):
        p = AQUI / nome
        if p.exists():
            print(nome.ljust(11), round(p.stat().st_size / 1024), 'KB')
    print('saidas:', len(dados['saidas']), '| reais:', reais_n)


if __name__ == '__main__':
    main()
