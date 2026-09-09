# -*- coding: utf-8 -*-
"""Monta os arquivos gerados das propostas de layout da aba de Analytics.

POR QUE ESTE SCRIPT EXISTE. A maquete tem que ser a tela real: mesmo CSS, mesmas
classes, mesmos dados. Copiar estilo na mao para dentro de um HTML de proposta faria
a maquete envelhecer no dia seguinte. Aqui ela se remonta a partir da fonte. Mesmo
metodo do `docs/propostas/contas/montar.py`, que ja passou pela regua dele.

O QUE ELE GERA (tudo fora do git, ver .gitignore):
  painel.css   os blocos de estilo do painel, na ordem numerica que e' lei
  dados.js     as tres contas de verdade, os posts reais que existem e o restante
               como EXEMPLO declarado, para a tabela ter volume de julgar
  marca-*.png  a marca, copiada de painel/

O QUE E' REAL E O QUE E' EXEMPLO. Real: as tres contas (arroba, identificador,
tipo, validade), os 7 reels do @borusaof com data, curtida, comentario e
visualizacao, e as miniaturas. Exemplo: alcance, salvamento, compartilhamento e
tempo assistido, que a coleta viva ainda nao busca. Todo post de exemplo carrega
`exemplo:true` e a tela mostra isso na cara.

Rodar na raiz do repositorio:  python docs/propostas/analytics/montar.py
"""
import json
import pathlib
import random
import shutil
from datetime import datetime, timedelta

RAIZ = pathlib.Path(__file__).resolve().parents[3]
SAIDA = pathlib.Path(__file__).resolve().parent

# A ORDEM E' LEI: os blocos se concatenam em ordem numerica e reproduzem o painel.
# `11-programar.css` entra por causa do botao Programar do menu: sem ele o circulo
# animado do botao nasce esticado e a maquete parece quebrada.
ORDEM = ['01-base.css', '02-menu.css', '03-componentes.css', '08-filtros.css',
         '10-painel.css', '11-programar.css', '13-contas.css']

# Medido na rota `contas/estado` do painel no ar, em 09/09/2026.
CONTAS = [
    {"u": "borusaof", "nome": "Borusa Digital", "igId": "17841438934092410",
     "mercado": "Corte De Podcast", "seguidores": 3, "publicacoes": 7,
     "desde": "2026-08-17", "dias": 34, "tipo": "Criador De Mídia"},
    {"u": "macrofoco.br", "nome": "Macro Foco", "igId": "17841455201219116",
     "mercado": "Notícia", "seguidores": 118, "publicacoes": 24,
     "desde": "2026-08-17", "dias": 49, "tipo": "Criador De Mídia"},
    {"u": "perdeunovar", "nome": "Perdeu No Var", "igId": "17841455211390963",
     "mercado": "Futebol", "seguidores": 402, "publicacoes": 31,
     "desde": "2026-08-29", "dias": 49, "tipo": "Criador De Mídia"},
]

LEGENDAS = [
    "O corte que ninguém esperava dessa conversa",
    "Ele falou isso na cara do entrevistador",
    "A parte que viralizou fora do episódio",
    "Três minutos que explicam o mercado inteiro",
    "O erro que quase todo mundo comete aqui",
    "Ninguém avisou que era assim que funcionava",
    "A pergunta que travou o convidado",
    "O número que ninguém mostra nesse assunto",
    "Isso mudou depois da nova regra",
    "A resposta curta para a dúvida de sempre",
    "O detalhe que passa batido no lance",
    "Quem assistiu até o fim entendeu o ponto",
]


def main():
    pedacos = []
    for nome in ORDEM:
        pedacos.append('/* ===== ' + nome + ' ===== */')
        pedacos.append((RAIZ / 'painel' / 'estilo' / nome).read_text(encoding='utf-8'))
    (SAIDA / 'painel.css').write_text('\n'.join(pedacos), encoding='utf-8')

    d = json.loads((RAIZ / 'painel' / 'analytics.json').read_text(encoding='utf-8'))
    retrato = {p['u']: p.get('avatar', '') for p in d.get('perfis', [])}
    capas = [m.get('mini', '') for m in (d.get('previas') or {}).get('borusaof', [])
             if m.get('mini')]
    reais = (d.get('fundo') or {}).get('borusaof', {}).get('posts', [])

    contas = []
    for c in CONTAS:
        c = dict(c, avatar=retrato.get(c['u'], retrato.get('borusaof', '')))
        c['posts'] = posts_da_conta(c, reais, capas)
        c['curva'] = curva(c)
        contas.append(c)

    # As capas moram numa lista so' e o post guarda o indice: repetir o base64 em
    # cada linha inchava o arquivo de 300 KB para 1,3 MB.
    dados = {"hoje": "2026-09-09T14:00:00", "capas": capas, "contas": contas}
    (SAIDA / 'dados.js').write_text(
        'window.DADOS = ' + json.dumps(dados, ensure_ascii=False) + ';\n',
        encoding='utf-8')

    for marca in ('marca-clara.png', 'marca-escura.png'):
        shutil.copy(RAIZ / 'painel' / marca, SAIDA / marca)
    for nome in ('painel.css', 'dados.js'):
        print(nome.ljust(11), round((SAIDA / nome).stat().st_size / 1024), 'KB')


def posts_da_conta(conta, reais, capas):
    """Os 7 reels reais entram para o @borusaof. O resto e' exemplo declarado, com
    numero plausivel: a tabela precisa de volume para se julgar paginacao e ordem."""
    rnd = random.Random(conta['u'])
    saida = []
    if conta['u'] == 'borusaof':
        for i, p in enumerate(reais):
            quando = p.get('quando', '')[:19]
            vis = p.get('views') or 0
            saida.append(post(sc=p.get('sc'), quando=quando, fmt=p.get('fmt', 'reel'),
                              legenda=p.get('legenda') or LEGENDAS[i % len(LEGENDAS)],
                              capa=i % max(len(capas), 1),
                              vis=vis, cur=p.get('cur') or 0, com=p.get('com') or 0,
                              rnd=rnd, exemplo=False))
    quantos = 34 - len(saida)
    base = datetime(2026, 9, 8, 19, 30)
    for i in range(quantos):
        quando = base - timedelta(days=i * 1.37, hours=rnd.randint(0, 9))
        vis = int(rnd.lognormvariate(6.6, 1.15)) + 40
        saida.append(post(sc='EX' + conta['u'][:3].upper() + str(i).zfill(2),
                          quando=quando.strftime('%Y-%m-%dT%H:%M:%S'),
                          fmt='reel' if i % 7 else 'carrossel',
                          legenda=LEGENDAS[(i + len(saida)) % len(LEGENDAS)],
                          capa=(i + 3) % max(len(capas), 1),
                          vis=vis, cur=None, com=None, rnd=rnd, exemplo=True))
    saida.sort(key=lambda p: p['quando'], reverse=True)
    return saida


def post(sc, quando, fmt, legenda, capa, vis, cur, com, rnd, exemplo):
    """As metricas profundas seguem a lista que a API oficial entrega para estas
    contas: alcance, visualizacao, tempo assistido, curtida, comentario, salvamento
    e compartilhamento. Quando o dado real nao existe, o numero e' plausivel e o
    post vai marcado como exemplo."""
    alc = max(int(vis * rnd.uniform(.52, .86)), 12)
    cur = cur if cur is not None else int(alc * rnd.uniform(.012, .075))
    com = com if com is not None else int(cur * rnd.uniform(.02, .18))
    sal = int(alc * rnd.uniform(.004, .038))
    cmp_ = int(alc * rnd.uniform(.002, .026))
    seg = int(alc * rnd.uniform(0, .012))
    medio = round(rnd.uniform(4.2, 17.4), 1)
    dur = round(medio * rnd.uniform(1.5, 3.4), 1)
    inter = cur + com + sal + cmp_
    return {
        "sc": sc, "quando": quando, "fmt": fmt, "legenda": legenda, "capa": capa,
        "vis": vis, "alc": alc, "cur": cur, "com": com, "sal": sal, "cmp": cmp_,
        "seg": seg, "medio": medio, "dur": dur, "inter": inter,
        "eng": round(inter / alc * 100, 1) if alc else 0,
        "ret": round(min(medio / dur * 100, 99.4), 1) if dur else 0,
        "exemplo": exemplo,
    }


def curva(conta):
    """Seguidores dia a dia nos ultimos 30 dias. Exemplo declarado: hoje ninguem
    grava esse pulso, e a tela precisa de uma linha para se julgar.

    A LINHA TERMINA NO NUMERO REAL DA CONTA. A primeira versao sorteava passo a
    passo e depois forcava o ultimo ponto: a @borusaof subia ate' 32 e despencava
    para 3 no ultimo dia, um degrau que so' existia no gerador."""
    rnd = random.Random('curva' + conta['u'])
    fim = conta['seguidores']
    ini = max(round(fim * 0.72), 0)
    ruido = max((fim - ini) * .22, .45)
    base = datetime(2026, 8, 11)
    pontos = []
    for i in range(30):
        alvo = ini + (fim - ini) * i / 29
        v = max(round(alvo + rnd.uniform(-ruido, ruido)), 0)
        pontos.append([(base + timedelta(days=i)).strftime('%Y-%m-%d'), v])
    pontos[-1][1] = fim
    return pontos


if __name__ == '__main__':
    main()
