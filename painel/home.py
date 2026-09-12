# -*- coding: utf-8 -*-
"""O QUE A ABA PAINEL LE'. Uma rota so', `painel/home`, com tudo pronto.

POR QUE UMA ROTA SO' E NAO SEIS. A home precisa de sete leituras diferentes (a
rede, as pastas, a fonte, a arvore do Drive, o mercado e a etiqueta de cada
perfil, o desempenho de cada um e as saidas). Seis idas do navegador seriam seis
esperas em serie, cada uma desenhando um pedaco da tela em momento diferente, e a
pagina montaria aos solavancos. Aqui a juncao acontece de uma vez e a tela sobe
inteira.

O TERRITORIO DESTA ABA, fechado com ele em 12/09/2026:

    Calendario  responde QUANDO sai.
    Analytics   responde COMO foi, UMA conta por vez, em profundidade.
    Contas      responde QUEM sao os perfis.
    Painel      responde pela REDE INTEIRA, comparada perfil a perfil, mais o
                material que ainda nao foi publicado.

Desempenho aqui nao e' repeticao do Analytics: la' e' uma conta por vez, aqui e'
uma conta contra a outra.
"""
import json
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import contas
import midia

PASTA = os.path.dirname(os.path.abspath(__file__))
ANALYTICS = os.path.join(PASTA, "analytics.json")
FUSO = ZoneInfo("America/Sao_Paulo")


def _analytics():
    try:
        with open(ANALYTICS, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, ValueError):
        return {}


# ===========================================================================
# A REDE, dia a dia. Esta funcao era um metodo do servidor e veio para ca'
# inteira: a rota `painel/rede` continua existindo e continua respondendo o
# mesmo, porque a aba de Programar tambem le' dela.
# ===========================================================================
def rede():
    d = _analytics()
    perfis = d.get("perfis", [])
    fundo = d.get("fundo") or {}
    hoje = datetime.now(FUSO).date()

    # 1. quem publicou em cada um dos ultimos 90 dias, conta a conta
    por_dia, posts_dia, ultimo = {}, {}, {}
    for arroba, bloco in fundo.items():
        for post in bloco.get("posts", []):
            q = (post.get("quando") or "")[:10]
            if not q:
                continue
            por_dia.setdefault(q, set()).add(arroba)
            posts_dia.setdefault(q, {})
            posts_dia[q][arroba] = posts_dia[q].get(arroba, 0) + 1
            if q > ultimo.get(arroba, ""):
                ultimo[arroba] = q

    # 2. o que o livro-caixa sabe: fila e erro por conta
    fila, erros = {}, {}
    pastas = 0
    try:
        con = midia.abrir()
        for l in con.execute("SELECT conta, estado, COUNT(*) n FROM video "
                             "WHERE conta IS NOT NULL GROUP BY conta, estado"):
            if l["estado"] == "erro":
                erros[l["conta"]] = l["n"]
            elif l["estado"] in ("programado", "baixado"):
                fila[l["conta"]] = fila.get(l["conta"], 0) + l["n"]
        pastas = con.execute("SELECT COUNT(*) n FROM pasta").fetchone()["n"]
        quedas = {r["dia"]: r["caidas"] for r in con.execute(
            "SELECT dia, caidas FROM pulso")}
        con.close()
    except Exception:
        quedas = {}

    lista = []
    for perfil in perfis:
        a = perfil.get("u")
        ult = ultimo.get(a, "")
        recente = bool(ult) and (
            hoje - datetime.strptime(ult, "%Y-%m-%d").date()).days <= 2
        lista.append({
            "arroba": a, "nome": perfil.get("nome") or "",
            "avatar": perfil.get("avatar") or "",
            "ligada": bool(perfil.get("ativa", True)),
            "fila": fila.get(a, 0), "erros24h": erros.get(a, 0),
            "ultimo": ult, "publicando": bool(fila.get(a) or recente),
        })

    resumo = {
        "publicando": sum(1 for c in lista if c["publicando"]),
        "paradas": sum(1 for c in lista if c["ligada"] and not c["publicando"]),
        "caidas": sum(1 for c in lista if not c["ligada"]),
        "total": len(lista), "pastas": pastas,
    }

    serie = []
    for i in range(89, -1, -1):
        dia = (hoje - timedelta(days=i)).isoformat()
        publicando = len(por_dia.get(dia, ()))
        do_dia = posts_dia.get(dia, {})
        serie.append({"dia": dia, "publicando": publicando,
                      "paradas": max(len(lista) - publicando, 0),
                      "caidas": quedas.get(dia, 0),
                      "contas": {c["arroba"]: do_dia.get(c["arroba"], 0)
                                 for c in lista}})

    marcado, publicado, saidas_conta = {}, {}, {}
    for arroba, bloco in fundo.items():
        for post in bloco.get("posts", []):
            q = (post.get("quando") or "")[:10]
            publicado[q] = publicado.get(q, 0) + 1
            saidas_conta.setdefault(q, {})
            saidas_conta[q][arroba] = saidas_conta[q].get(arroba, 0) + 1
    try:
        con = midia.abrir()
        for l in con.execute("SELECT quando, estado, conta FROM video "
                             "WHERE quando IS NOT NULL"):
            q = (l["quando"] or "")[:10]
            if l["estado"] == "publicado":
                publicado[q] = publicado.get(q, 0) + 1
            else:
                marcado[q] = marcado.get(q, 0) + 1
            if l["conta"]:
                saidas_conta.setdefault(q, {})
                saidas_conta[q][l["conta"]] = saidas_conta[q].get(l["conta"], 0) + 1
        con.close()
    except Exception:
        pass
    semana = []
    for i in range(-30, 30):
        dia = (hoje + timedelta(days=i)).isoformat()
        do_dia = saidas_conta.get(dia, {})
        semana.append({"dia": dia, "publicados": publicado.get(dia, 0),
                       "programados": marcado.get(dia, 0),
                       "contas": {c["arroba"]: do_dia.get(c["arroba"], 0)
                                  for c in lista}})

    return {"contas": lista, "resumo": resumo, "serie": serie, "semana": semana}


# ===========================================================================
# O PACOTE DA HOME
# ===========================================================================
def _dias_desde(iso, hoje):
    if not iso:
        return 0
    try:
        return (hoje - datetime.strptime(iso[:10], "%Y-%m-%d").date()).days
    except ValueError:
        return 0


def _pastas(hoje):
    """As pastas de video escolhidas, com o estado de cada uma.

    A CONTAGEM SAI DO LIVRO, e nao de uma leitura nova do Drive: e' o livro que
    sabe o que ja' foi agendado e o que ja' saiu.
    """
    fora = []
    for p in midia.ligadas():
        total = p.get("total") or 0
        prog = p.get("programados") or 0
        pub = p.get("publicados") or 0
        ligada = (p.get("ligada_em") or "")[:10]
        fora.append({
            "nome": p.get("nome") or "Sem nome", "conta": p.get("conta") or "",
            "id": p.get("id") or "", "caminho": p.get("caminho") or "",
            "total": total, "prateleira": p.get("prateleira") or 0,
            "programados": prog, "publicados": pub, "erro": p.get("erro") or 0,
            "ligada_em": ligada, "dias": _dias_desde(ligada, hoje),
            "gasto": round(((pub + prog) / total) * 100) if total else 0,
        })
    fora.sort(key=lambda x: -x["total"])
    return fora


def _fonte(ver_drive):
    """O estado do Drive e o andar de cima dele.

    VER A ARVORE CUSTA UMA IDA AO GOOGLE e pode demorar. Por isso e' opcional: a
    home pede sem a arvore na abertura, e com a arvore quando alguem aperta
    Atualizar. Sem esse cuidado, a tela ficava cinco segundos em branco.
    """
    est = midia.estado()
    fora = {"fonte": est.get("fonte") or "", "pronta": bool(est.get("pronta")),
            "motivo": est.get("motivo") or "", "raiz": est.get("raiz") or "",
            "robo": est.get("robo") or "", "nome": "", "pastas": []}
    if not ver_drive or not fora["pronta"]:
        return fora
    try:
        arvore = midia.navegar("")
        fora["nome"] = ((arvore.get("trilha") or [{}])[0] or {}).get("nome") or ""
        fora["pastas"] = [{"nome": p.get("nome") or "", "videos": p.get("videos"),
                           "ligada": bool(p.get("ligada"))}
                          for p in (arvore.get("pastas") or [])]
    except Exception as e:
        fora["motivo"] = fora["motivo"] or (type(e).__name__ + ": " + str(e)[:120])
    return fora


def _perfis(r, pastas, dias):
    """Um bloco por perfil, com a etiqueta que ele digitou na aba de Contas e as
    publicacoes cruas do periodo.

    AS PUBLICACOES VIAJAM CRUAS de proposito: a tela recorta por sete, trinta ou
    noventa dias sem pedir de novo ao servidor, e o filtro de etiqueta recalcula
    tudo no navegador, na hora.
    """
    import analytics
    meta = midia.meta_contas() or {}
    fora = []
    for c in r["contas"]:
        a = c["arroba"]
        try:
            d = analytics.estado(a, dias)
        except Exception:
            d = {}
        m = meta.get(a) or {}
        eti = m.get("etiquetas") or []
        if isinstance(eti, str):
            eti = [x.strip() for x in eti.split(",") if x.strip()]
        posts = sorted([{
            "perfil": a, "sc": p.get("sc") or "", "fmt": p.get("fmt") or "reel",
            "quando": (p.get("quando") or "")[:19],
            "legenda": p.get("legenda") or "",
            "vis": p.get("vis") or 0, "alc": p.get("alc") or 0,
            "cur": p.get("cur") or 0, "com": p.get("com") or 0,
            "sal": p.get("sal") or 0, "cmp": p.get("cmp") or 0,
            "inter": p.get("inter") or 0, "medio": p.get("medio") or 0,
            "eng": p.get("eng") or 0, "endereco": p.get("endereco") or "",
        } for p in (d.get("posts") or [])], key=lambda p: p["quando"])
        meus = [x for x in pastas if x["conta"] == a]
        fora.append({
            "u": a, "nome": c.get("nome") or a, "retrato": c.get("avatar") or "",
            "ligada": bool(c.get("ligada")),
            "mercado": m.get("mercado") or "", "etiquetas": eti,
            "seguidores": d.get("seguidores") or 0,
            "curva": d.get("curva") or [],
            "ultima": (d.get("ultima") or "")[:19],
            "guardados": sum(x["prateleira"] for x in meus),
            "agendados": sum(x["programados"] for x in meus),
            "pastas": len(meus),
            "posts": posts,
        })
    return fora


def pacote(ver_drive=False, dias=90):
    """Tudo o que a aba Painel desenha, numa resposta so'."""
    hoje = datetime.now(FUSO)
    r = rede()
    pastas = _pastas(hoje.date())

    caminho = {"prateleira": 0, "programado": 0, "publicado": 0, "erro": 0}
    for x in pastas:
        caminho["prateleira"] += x["prateleira"]
        caminho["programado"] += x["programados"]
        caminho["publicado"] += x["publicados"]
        caminho["erro"] += x["erro"]

    # o tempo de maquina: em quantos dos ultimos 90 dias saiu alguma coisa
    maquina = [{"dia": d["dia"],
                "saidas": sum((d.get("contas") or {}).values()),
                "paradas": (d.get("paradas") or 0) + (d.get("caidas") or 0)}
               for d in r["serie"]]
    saiu90 = sum(d["saidas"] for d in maquina)
    rodou = sum(1 for d in maquina if d["saidas"])

    perfis = _perfis(r, pastas, dias)
    ultimo = ""
    for p in perfis:
        if p["ultima"] and p["ultima"][:10] > ultimo:
            ultimo = p["ultima"][:10]

    total = sum(x["total"] for x in pastas)
    return {
        "hoje": hoje.strftime("%Y-%m-%dT%H:%M:%S"),
        "perfis": perfis,
        "esteira": caminho,
        "levas": pastas,
        "maquina": maquina,
        "fonte": _fonte(ver_drive),
        "resumo": {
            "acervo": total,
            "prateleira": caminho["prateleira"],
            "fila": caminho["programado"],
            "publicados": caminho["publicado"],
            "erro": caminho["erro"],
            "levas": len(pastas),
            "vazias": sum(1 for x in pastas if not x["total"]),
            "semdono": sum(1 for x in pastas if not x["conta"]),
            "gasto": round((sum(x["publicados"] + x["programados"] for x in pastas)
                            / total) * 100) if total else 0,
            "saiu90": saiu90, "rodou": rodou, "ultimo": ultimo,
            "parada": _dias_desde(ultimo, hoje.date()),
            "ritmo": round(saiu90 / 90.0, 2),
            "perfis": len(perfis),
            "seguidores": sum(p["seguidores"] for p in perfis),
        },
        "etiquetas": sorted({e for p in perfis for e in p["etiquetas"]}),
        "mercados": sorted({p["mercado"] for p in perfis if p["mercado"]}),
    }
