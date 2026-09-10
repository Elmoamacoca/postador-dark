# -*- coding: utf-8 -*-
"""A ABA DE ANALYTICS: o desempenho de UMA conta por vez.

O QUE ESTA ABA RESPONDE, e ela responde de uma conta so': esta conta vem crescendo,
o que ela publicou funcionou, e qual publicacao puxou o resultado. Visao global de
todas as contas juntas NAO existe aqui, por decisao dele: cada perfil e' um negocio
proprio, e somar tres perfis num numero so' nao ajuda a decidir nada.

DE ONDE VEM O DADO. Da API oficial do Instagram, com o token que ja' mora no cofre de
`contas.py`. Nao ha' raspagem, nao ha' arquivo montado a mao: o que a tela mostra e' o
que a Meta respondeu na ultima coleta.

  /me                        seguidores e quantas publicacoes existem
  /me/media                  a lista do que saiu, com curtida e comentario
  /{id}/insights             alcance, visualizacao, salvamento, compartilhamento
                             e, so' para reel, o tempo medio assistido

O QUE E' GUARDADO. Um arquivo por conta em `dados/analytics/<arroba>.json`, com a
lista de publicacoes e a CURVA DE SEGUIDORES, um ponto por dia. A curva e' o unico
dado que a Meta nao devolve olhando para tras: se ninguem gravar o numero de hoje,
ele se perde. Por isso toda coleta carimba o ponto do dia.

AS ARMADILHAS QUE ESTE ARQUIVO JA' CONHECE:

1. `ig_reels_avg_watch_time` vem em MILISSEGUNDOS. Ler como segundo faz um reel de
   sete segundos virar duas horas de tela.
2. A lista de metricas MUDA por versao da API e por tipo de midia: carrossel nao tem
   tempo assistido, e `impressions` morreu na v22. Pedir uma metrica que a conta nao
   tem derruba a resposta inteira, entao o pedido cai de metrica em metrica ate' a
   Meta aceitar, e o que sobrou fica anotado para a proxima chamada.
3. O endereco da capa que a Meta devolve EXPIRA, e o CDN dela recusa o pedido feito
   de outra pagina. Entao a capa e' baixada aqui e servida pela nossa casa, do mesmo
   jeito que `contas.py` ja' faz com o retrato do perfil.
4. F5 na tela nao pode virar chamada nova: a Meta tem teto por hora. O guardado serve
   por quinze minutos, e o botao de atualizar e' quem fura essa espera.
"""
import json
import os
import pathlib
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

import contas

PASTA = pathlib.Path(__file__).parent
DADOS = PASTA / "dados"
GUARDA = DADOS / "analytics"           # um arquivo por conta
CAPAS = DADOS / "capas"                # a miniatura de cada publicacao

VALIDADE = 15 * 60                     # por quanto tempo o guardado serve sozinho
QUANTAS = 60                           # quantas publicacoes a coleta traz por vez

# A ORDEM IMPORTA: a primeira lista e' a completa, e cada seguinte tira o que a Meta
# costuma recusar. A conta guarda qual funcionou, para nao pagar o pedagio de novo.
METRICAS_REEL = [
    "views,reach,saved,shares,likes,comments,total_interactions,ig_reels_avg_watch_time",
    "views,reach,saved,shares,likes,comments,ig_reels_avg_watch_time",
    "views,reach,saved,shares",
    "reach",
]
METRICAS_FOTO = [
    "views,reach,saved,shares,total_interactions",
    "views,reach,saved,shares",
    "reach",
]


def _agora():
    return datetime.now(timezone.utc)


def _hoje():
    return _agora().strftime("%Y-%m-%d")


def _ler(caminho, padrao):
    try:
        return json.loads(caminho.read_text(encoding="utf-8"))
    except Exception:
        return padrao


def _gravar(caminho, dados):
    """Escrita atomica: um arquivo pela metade aqui e' um historico perdido."""
    caminho.parent.mkdir(parents=True, exist_ok=True)
    temporario = caminho.with_suffix(".novo")
    temporario.write_text(json.dumps(dados, ensure_ascii=False), encoding="utf-8")
    os.replace(temporario, caminho)


def _arquivo(arroba: str) -> pathlib.Path:
    return GUARDA / (contas.limpo(arroba).replace("/", "_") + ".json")


def ler(arroba: str) -> dict:
    return _ler(_arquivo(arroba), {})


# ------------------------------------------------------------------ a capa
def _nome_da_capa(ident: str) -> str:
    return "".join(c for c in str(ident) if c.isalnum() or c in "-_")[:80]


def capa_em_disco(ident: str):
    nome = _nome_da_capa(ident)
    alvo = CAPAS / (nome + ".jpg")
    return alvo if nome and alvo.exists() else None


def _guardar_capa(ident: str, url: str) -> bool:
    """Baixa a miniatura UMA VEZ. O endereco da Meta expira e o CDN dela recusa o
    pedido vindo da nossa pagina: apontar a tag `img` para la' rende quadrado
    quebrado, medido nos retratos em 29/08."""
    nome = _nome_da_capa(ident)
    if not nome:
        return False
    alvo = CAPAS / (nome + ".jpg")
    if alvo.exists():
        return True
    if not url:
        return False
    try:
        pedido = urllib.request.Request(url, headers={"User-Agent": "postador"})
        with urllib.request.urlopen(pedido, timeout=20) as r:
            bytes_ = r.read(4 * 1024 * 1024)
        if not bytes_:
            return False
        CAPAS.mkdir(parents=True, exist_ok=True)
        novo = alvo.with_suffix(".novo")
        novo.write_bytes(bytes_)
        os.replace(novo, alvo)
        return True
    except Exception:
        return False       # capa e' enfeite: sem ela a linha continua de pe'


# --------------------------------------------------------------- a coleta
def _conta_do_cofre(arroba: str):
    alvo = contas.limpo(arroba)
    for c in contas.cofre().get("contas", []):
        if contas.limpo(c.get("arroba", "")) == alvo:
            return c
    return None


def _insights(ident: str, token: str, reel: bool, lembrete: dict):
    """Pede os numeros de uma publicacao. Cai de metrica em metrica ate' a Meta
    aceitar, e guarda no `lembrete` qual lista funcionou para esta conta."""
    listas = METRICAS_REEL if reel else METRICAS_FOTO
    chave = "reel" if reel else "foto"
    inicio = lembrete.get(chave, 0)
    for i in range(inicio, len(listas)):
        url = (contas.BASE + "/" + ident + "/insights?"
               + urllib.parse.urlencode({"metric": listas[i]}))
        ok, corpo = contas._chamar(url, token)
        if ok:
            lembrete[chave] = i
            saida = {}
            for item in corpo.get("data", []):
                valores = item.get("values") or [{}]
                saida[item.get("name")] = valores[0].get("value", 0)
            return saida
        texto = str(corpo).lower()
        if "metric" not in texto and "invalid" not in texto and "support" not in texto:
            return {}                      # erro de verdade (token, rede): desiste
    return {}


def coletar(arroba: str, forcar: bool = False) -> dict:
    """Busca na Meta e grava. Devolve o guardado, atualizado ou nao."""
    guardado = ler(arroba)
    idade = time.time() - guardado.get("carimbo", 0)
    if guardado and not forcar and idade < VALIDADE:
        return guardado

    conta = _conta_do_cofre(arroba)
    if not conta:
        return dict(guardado, erro="conta não está no cofre")
    token = conta.get("token")
    if not token:
        return dict(guardado, erro="conta sem acesso ligado")

    # 1. quem e' a conta hoje
    url = (contas.BASE + "/me?"
           + urllib.parse.urlencode({"fields": "username,followers_count,media_count"}))
    ok, eu = contas._chamar(url, token)
    if not ok:
        return dict(guardado, erro=contas._erro(eu), carimbo=guardado.get("carimbo", 0))
    seguidores = int(eu.get("followers_count") or 0)

    # 2. o que saiu
    campos = ("id,caption,media_type,media_product_type,timestamp,permalink,"
              "thumbnail_url,media_url,like_count,comments_count")
    url = (contas.BASE + "/me/media?"
           + urllib.parse.urlencode({"fields": campos, "limit": QUANTAS}))
    ok, lista = contas._chamar(url, token)
    if not ok:
        return dict(guardado, erro=contas._erro(lista))

    lembrete = dict(guardado.get("lembrete") or {})
    antigos = {p.get("id"): p for p in guardado.get("posts", [])}
    posts = []
    for m in lista.get("data", []):
        ident = m.get("id")
        reel = (m.get("media_product_type") or "").upper() == "REELS"
        velho = antigos.get(ident, {})
        # PUBLICACAO ANTIGA NAO SE PERGUNTA DE NOVO. Depois de duas semanas o numero
        # praticamente nao anda, e cada pedido desses gasta cota da Meta.
        quando = m.get("timestamp") or ""
        antiga = False
        try:
            idade_dias = (_agora() - datetime.strptime(
                quando, "%Y-%m-%dT%H:%M:%S%z")).days
            antiga = idade_dias > 14 and bool(velho)
        except Exception:
            pass
        n = velho.get("bruto") if antiga else _insights(ident, token, reel, lembrete)
        n = n or {}

        capa = m.get("thumbnail_url") or m.get("media_url") or ""
        _guardar_capa(ident, capa)

        alc = int(n.get("reach") or 0)
        vis = int(n.get("views") or 0)
        cur = int(m.get("like_count") or n.get("likes") or 0)
        com = int(m.get("comments_count") or n.get("comments") or 0)
        sal = int(n.get("saved") or 0)
        cmp_ = int(n.get("shares") or 0)
        inter = int(n.get("total_interactions") or (cur + com + sal + cmp_))
        # milissegundos: ler como segundo faz um reel de 7s virar duas horas de tela
        medio = round(float(n.get("ig_reels_avg_watch_time") or 0) / 1000.0, 1)
        posts.append({
            "id": ident,
            "sc": (m.get("permalink") or "").rstrip("/").rsplit("/", 1)[-1] or ident,
            "quando": quando,
            "fmt": "reel" if reel else "carrossel",
            "legenda": (m.get("caption") or "").strip().split("\n")[0][:140],
            "endereco": m.get("permalink") or "",
            "vis": vis, "alc": alc, "cur": cur, "com": com, "sal": sal, "cmp": cmp_,
            "inter": inter, "medio": medio,
            "eng": round(inter / alc * 100, 1) if alc else 0.0,
            "bruto": n,
        })

    # 3. a curva de seguidores: um ponto por dia, e o de hoje sempre atualiza
    curva = [p for p in (guardado.get("curva") or []) if p and p[0] != _hoje()]
    curva.append([_hoje(), seguidores])
    curva = curva[-180:]

    novo = {
        "arroba": contas.limpo(arroba),
        "ig_user_id": conta.get("ig_user_id") or eu.get("id"),
        "seguidores": seguidores,
        "publicacoes": int(eu.get("media_count") or len(posts)),
        "posts": posts,
        "curva": curva,
        "lembrete": lembrete,
        "coletado_em": _agora().isoformat(timespec="seconds"),
        "carimbo": time.time(),
        "erro": None,
    }
    _gravar(_arquivo(arroba), novo)
    return novo


# ---------------------------------------------------------------- a tela
def _dentro(post, dias):
    if not dias:
        return True
    try:
        quando = datetime.strptime(post.get("quando", ""), "%Y-%m-%dT%H:%M:%S%z")
    except Exception:
        return False
    return (_agora() - quando).days < dias


def estado(arroba: str, dias: int = 30, forcar: bool = False) -> dict:
    """O que a aba desenha: a conta, o resumo do periodo e as publicacoes.

    O RESUMO COMPARA COM O PERIODO ANTERIOR de mesmo tamanho. Sem base de comparacao
    a variacao vem NULA, e a tela escreve "sem base" em vez de inventar zero por
    cento, que leria como estabilidade.
    """
    d = coletar(arroba, forcar)
    posts = d.get("posts", [])
    atual = [p for p in posts if _dentro(p, dias)]

    anterior = []
    if dias:
        for p in posts:
            try:
                quando = datetime.strptime(p.get("quando", ""), "%Y-%m-%dT%H:%M:%S%z")
            except Exception:
                continue
            idade = (_agora() - quando).days
            if dias <= idade < dias * 2:
                anterior.append(p)

    def soma(lista, campo):
        return sum(int(p.get(campo) or 0) for p in lista)

    def variacao(campo):
        a, b = soma(atual, campo), soma(anterior, campo)
        return None if not b else round((a - b) / b * 100)

    def mediana(campo):
        v = sorted(int(p.get(campo) or 0) for p in atual)
        if not v:
            return 0
        meio = len(v) // 2
        return v[meio] if len(v) % 2 else round((v[meio - 1] + v[meio]) / 2)

    alcance = soma(atual, "alc")
    reels = [p for p in atual if p.get("fmt") == "reel"]
    com_tempo = [p for p in reels if p.get("medio")]
    return {
        "arroba": d.get("arroba", contas.limpo(arroba)),
        "seguidores": d.get("seguidores", 0),
        "publicacoes": d.get("publicacoes", len(posts)),
        "coletado_em": d.get("coletado_em"),
        "erro": d.get("erro"),
        "curva": d.get("curva", []),
        "dias": dias,
        "resumo": {
            "alcance": alcance,
            "visualizacoes": soma(atual, "vis"),
            "interacoes": soma(atual, "inter"),
            "publicados": len(atual),
            "engajamento": round(soma(atual, "inter") / alcance * 100, 1) if alcance else 0.0,
            "mediana_alcance": mediana("alc"),
            "tempo_medio": round(sum(p["medio"] for p in com_tempo) / len(com_tempo), 1)
            if com_tempo else 0.0,
            "var_alcance": variacao("alc"),
            "var_visualizacoes": variacao("vis"),
            "var_interacoes": variacao("inter"),
            "var_publicados": None if not anterior else round(
                (len(atual) - len(anterior)) / len(anterior) * 100),
        },
        "posts": [{k: v for k, v in p.items() if k != "bruto"} for p in atual],
    }
