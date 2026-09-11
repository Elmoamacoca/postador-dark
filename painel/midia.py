# -*- coding: utf-8 -*-
"""A ABA DE MIDIA POR DENTRO: de onde vem a lista de pastas e onde ela fica anotada.

O QUE ESTA ABA FAZ, e o que ela nao faz. Ela **pre-seleciona pastas**. Nada mais. Ligar
uma pasta nao baixa video nenhum: so' anota, uma linha por arquivo, o que existe la'
dentro. Quem baixa e' a esteira, um dia antes de cada saida. O porque esta' escrito por
extenso na aba de Ajuda, pagina "Como o video vai ao ar", e nao se repete aqui.

AS TRES PECAS DESTE ARQUIVO:

  1. A FONTE. De onde a lista vem. Hoje existem duas: a pasta de disco (o Drive espelhado
     nesta maquina, ou uma pasta do servidor) e o Google Drive pela API. As duas
     respondem as mesmas tres perguntas: quais pastas tem aqui, quais videos tem nesta
     pasta, e me da os bytes deste arquivo.

     POR QUE ATRAS DE UMA INTERFACE. Porque a origem vai mudar e a tela nao pode saber
     disso. Hoje e' o Drive; amanha pode ser o lote da Ferramenta 1, que chega como pacote
     do GitHub. Trocar a origem tem que custar um arquivo novo aqui, e zero na tela.

  2. O LIVRO-CAIXA. Uma linha por video, guardada em SQLite. E' a fonte de verdade do
     sistema: qual video, de qual pasta, em que estado. Nao mora dentro do motor de
     proposito, porque o motor e' peca trocavel.

     POR QUE SQLITE E NAO UM JSON. Porque daqui a pouco quem escreve nele nao e' so' a
     tela: a esteira vai marcar "baixado", "programado", "publicado" enquanto voce
     navega. Dois programas escrevendo o mesmo JSON se atropelam. O banco resolve isso
     sem a gente inventar tranca.

  3. AS ROTAS. O que o navegador pede, e o que ele recebe de volta.

A CHAVE DE CADA VIDEO E' O CODIGO DO ARQUIVO, nunca o nome. Nome se repete entre pastas e
nome e' renomeado, e nos dois casos o mesmo video entraria duas vezes. No Google Drive
esse codigo e' de verdade e acompanha o arquivo para sempre. Na pasta de disco nao existe
codigo nenhum, entao ele e' derivado do caminho: serve para testar, mas renomear o arquivo
la' cria um item novo. E' a diferenca honesta entre as duas fontes.
"""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import urllib.parse
from pathlib import Path

PASTA = Path(__file__).parent
DADOS = PASTA / "dados"
BANCO = DADOS / "livro.db"
CONFIG = DADOS / "config.json"
def _chave_drive() -> Path:
    """Onde mora a credencial do Drive, na ordem: variavel de ambiente (o Docker),
    `dados/google_drive.json` (a VPS), cofre local do PC (o desenvolvimento)."""
    ambiente = os.environ.get("CHAVE_DRIVE")
    if ambiente:
        return Path(ambiente)
    na_pasta = DADOS / "google_drive.json"
    if na_pasta.exists():
        return na_pasta
    return Path(r"C:\Users\Gabri\.claude\secrets\google_drive.json")

# O motor so' aceita mp4. Os outros aparecem na contagem de "fora do formato" para voce
# saber que eles existem, e nao entram no livro.
ACEITOS = {".mp4"}
VIDEOS = ACEITOS | {".mov", ".webm", ".mkv", ".avi", ".m4v"}


# ============================================================== configuracao
def config() -> dict:
    padrao = {"fonte": "pasta", "raiz": r"G:\Meu Drive", "raiz_id": ""}
    try:
        padrao.update(json.loads(CONFIG.read_text(encoding="utf-8")))
    except Exception:
        pass
    return padrao


def gravar_config(novo: dict) -> dict:
    DADOS.mkdir(exist_ok=True)
    atual = config()
    atual.update(novo)
    CONFIG.write_text(json.dumps(atual, ensure_ascii=False, indent=1), encoding="utf-8")
    return atual


# ============================================================== o livro-caixa
def abrir() -> sqlite3.Connection:
    DADOS.mkdir(exist_ok=True)
    con = sqlite3.connect(BANCO)
    con.row_factory = sqlite3.Row
    con.executescript("""
        -- A PASTA PERTENCE A UM PERFIL. Decisao dele em 10/09/2026: cada pasta e' de
        -- uma conta so', e o vinculo nasce na hora de ligar, dentro da ficha dela.
        CREATE TABLE IF NOT EXISTS pasta (
            id TEXT PRIMARY KEY,      -- codigo da pasta na fonte
            nome TEXT NOT NULL,
            caminho TEXT NOT NULL,    -- so' para voce se localizar na tela
            fonte TEXT NOT NULL,
            conta TEXT,               -- o perfil dono desta pasta
            ligada_em TEXT NOT NULL
        );
        -- UM VIDEO SERVE UM PERFIL SO', tambem por decisao dele: por isso `conta` e'
        -- uma coluna, e nao uma tabela de usos. Ele e' preenchido ao LIGAR a pasta,
        -- herdando o dono dela, e nao so' quando alguem programa.
        CREATE TABLE IF NOT EXISTS video (
            id TEXT PRIMARY KEY,      -- codigo do arquivo. E' esta linha que impede repetir
            pasta_id TEXT NOT NULL,   -- a pasta LIGADA (a leva)
            sub_id TEXT,              -- a pasta do proprio corte, um nivel abaixo
            sub_nome TEXT,
            nome TEXT NOT NULL,
            tamanho INTEGER,
            capa TEXT,                -- endereco da miniatura na fonte (Drive)
            estado TEXT NOT NULL,     -- prateleira, baixado, programado, publicado, erro
            conta TEXT,               -- de qual conta este video e'
            quando TEXT,              -- a hora marcada da saida
            post_id TEXT,             -- o numero do post dentro do motor
            erro TEXT,
            visto_em TEXT NOT NULL
        );
        -- O QUE CADA CONTA E', para alem do numero. Mercado (ou nicho, e' a mesma
        -- coisa) e etiquetas. Servem para filtrar o calendario quando a rede crescer:
        -- com trinta contas, ver "todas" deixa de ser util.
        CREATE TABLE IF NOT EXISTS conta_meta (
            arroba TEXT PRIMARY KEY,
            mercado TEXT,
            etiquetas TEXT,          -- separadas por virgula, minusculas
            mexido_em TEXT
        );
        -- O PULSO DA REDE, um retrato por dia. A API do Instagram nao tem memoria e o
        -- painel precisa de linha, nao de ponto: sem guardar aqui, o grafico de contas
        -- publicando seria sempre um traco reto de um dia so'.
        CREATE TABLE IF NOT EXISTS pulso (
            dia TEXT PRIMARY KEY,     -- 2026-08-18
            publicando INTEGER NOT NULL,
            paradas INTEGER NOT NULL,
            caidas INTEGER NOT NULL,
            em TEXT NOT NULL
        );
        -- O RASCUNHO DA PROGRAMACAO. A pessoa escolhe conta, pasta e ritmo em passos, e
        -- pode sair no meio: o que ja' foi escolhido fica guardado aqui e a tela oferece
        -- continuar de onde parou.
        -- UM RASCUNHO POR CONTA. O lote e' de uma conta so', entao dois lotes em pe' ao
        -- mesmo tempo sao duas contas diferentes. Eles se acumulam ate' alguem apagar:
        -- sair no meio nunca apaga nada.
        CREATE TABLE IF NOT EXISTS rascunho (
            id INTEGER PRIMARY KEY,
            dados TEXT NOT NULL,      -- o que ja' foi escolhido, em json
            criado_em TEXT NOT NULL,
            mexido_em TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS video_por_pasta ON video (pasta_id);
        CREATE INDEX IF NOT EXISTS video_por_estado ON video (estado, quando);
    """)
    # A COLUNA DA CONTA NASCEU DEPOIS. Entrar por `ALTER` mantem o que ja' estava
    # gravado; recriar a tabela apagaria o rascunho de quem estava no meio de um lote.
    if "conta" not in {c[1] for c in con.execute("PRAGMA table_info(rascunho)")}:
        con.execute("ALTER TABLE rascunho ADD COLUMN conta TEXT")
        for l in con.execute("SELECT id, dados FROM rascunho").fetchall():
            try:
                quem = (json.loads(l["dados"]).get("escolha") or {}).get("conta")
            except Exception:
                quem = None
            con.execute("UPDATE rascunho SET conta=? WHERE id=?", (quem, l["id"]))
        con.execute("DELETE FROM rascunho WHERE conta IS NULL")
        con.commit()
    con.execute("CREATE UNIQUE INDEX IF NOT EXISTS rascunho_por_conta "
                "ON rascunho (conta)")
    # AS COLUNAS QUE NASCERAM DEPOIS. Entrar por `ALTER` preserva o que ja' esta'
    # gravado; recriar a tabela apagaria historico de publicacao.
    for tabela, coluna, tipo in (("pasta", "conta", "TEXT"),
                                 ("video", "sub_id", "TEXT"),
                                 ("video", "sub_nome", "TEXT"),
                                 ("video", "capa", "TEXT")):
        if coluna not in {c[1] for c in con.execute("PRAGMA table_info(" + tabela + ")")}:
            con.execute("ALTER TABLE " + tabela + " ADD COLUMN " + coluna + " " + tipo)
            con.commit()
    con.execute("CREATE INDEX IF NOT EXISTS video_por_conta ON video (conta, estado)")
    con.execute("CREATE INDEX IF NOT EXISTS pasta_por_conta ON pasta (conta)")
    return con


def agora() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def hoje_local() -> str:
    """O dia NO FUSO DO PAINEL (Sao Paulo). O carimbo `agora()` continua em UTC de
    proposito (hora absoluta de registro); mas 'que dia e hoje' e pergunta de fuso:
    numa VPS em UTC, o dia cru viraria amanha as 21h e o pulso cairia no dia errado."""
    from datetime import datetime
    from zoneinfo import ZoneInfo
    return datetime.now(ZoneInfo("America/Sao_Paulo")).date().isoformat()


# ============================================================== o que a conta e'
def meta_contas() -> dict:
    con = abrir()
    d = {r["arroba"]: {"mercado": r["mercado"] or "",
                       "etiquetas": [t for t in (r["etiquetas"] or "").split(",") if t]}
         for r in con.execute("SELECT * FROM conta_meta")}
    con.close()
    return d


def gravar_meta(arroba: str, mercado=None, etiquetas=None) -> dict:
    """Grava o que veio, e deixa o resto como estava.

    A tela manda so' o campo que voce mexeu. Sobrescrever o outro com vazio apagaria as
    etiquetas toda vez que voce trocasse o mercado.
    """
    arroba = (arroba or "").lstrip("@").strip().lower()
    if not arroba:
        return {"erro": "sem conta"}
    con = abrir()
    atual = con.execute("SELECT * FROM conta_meta WHERE arroba=?", (arroba,)).fetchone()
    m = atual["mercado"] if (mercado is None and atual) else (mercado or "")
    if etiquetas is None:
        e = atual["etiquetas"] if atual else ""
    else:
        limpas = []
        for t in etiquetas:
            t = str(t).strip().lower()
            if t and t not in limpas:
                limpas.append(t)
        e = ",".join(limpas)
    con.execute("INSERT INTO conta_meta (arroba, mercado, etiquetas, mexido_em) "
                "VALUES (?,?,?,?) ON CONFLICT(arroba) DO UPDATE SET "
                "mercado=excluded.mercado, etiquetas=excluded.etiquetas, "
                "mexido_em=excluded.mexido_em",
                (arroba, (m or "").strip(), e, agora()))
    con.commit()
    con.close()
    return {"arroba": arroba, "mercado": (m or "").strip(),
            "etiquetas": [t for t in e.split(",") if t]}


# ============================================================== as fontes
class FontePasta:
    """Uma pasta de disco. Serve para o Drive espelhado nesta maquina e para teste.

    O codigo do arquivo aqui e' inventado a partir do caminho, porque disco nao tem
    codigo. Isso e' bom o bastante para navegar e para provar a tela, e nao serve para a
    esteira no servidor, que nao enxerga o disco desta maquina.
    """

    nome = "pasta"

    def __init__(self, raiz: str):
        self.raiz = Path(raiz)

    def _codigo(self, caminho: Path) -> str:
        return "d" + hashlib.sha1(str(caminho).encode("utf-8")).hexdigest()[:16]

    def _de_codigo(self, codigo: str) -> Path:
        """O caminho nao cabe no codigo, entao ele viaja ao lado, ja' embutido no id."""
        if not codigo or codigo == "raiz":
            return self.raiz
        bruto = codigo.encode("utf-8")
        import base64
        try:
            return Path(base64.urlsafe_b64decode(bruto + b"==").decode("utf-8"))
        except Exception:
            return self.raiz

    def id_de(self, caminho: Path) -> str:
        import base64
        return base64.urlsafe_b64encode(str(caminho).encode("utf-8")).decode().rstrip("=")

    def pronta(self) -> tuple:
        if not self.raiz.exists():
            return False, f"a pasta {self.raiz} nao esta acessivel nesta maquina"
        return True, ""

    def caminho_de(self, pasta_id: str) -> Path:
        return self._de_codigo(pasta_id)

    def listar_pastas(self, pasta_id: str, contar: bool = True) -> list:
        aqui = self.caminho_de(pasta_id)
        saida = []
        try:
            itens = sorted(aqui.iterdir(), key=lambda x: x.name.lower())
        except Exception:
            return saida
        for x in itens:
            if not x.is_dir() or x.name.startswith("."):
                continue
            saida.append({"id": self.id_de(x), "nome": x.name,
                          "videos": self.contar(x) if contar else None,
                          "caminho": str(x)})
        return saida

    def contar(self, caminho: Path) -> int:
        try:
            return sum(1 for f in caminho.iterdir()
                       if f.is_file() and f.suffix.lower() in ACEITOS)
        except Exception:
            return 0

    def listar_videos(self, pasta_id: str) -> tuple:
        """Devolve (aceitos, fora_do_formato)."""
        aqui = self.caminho_de(pasta_id)
        aceitos, fora = [], 0
        try:
            itens = sorted(aqui.iterdir(), key=lambda x: x.name.lower())
        except Exception:
            return aceitos, fora
        for f in itens:
            if not f.is_file():
                continue
            ext = f.suffix.lower()
            if ext in ACEITOS:
                aceitos.append({"id": self.id_de(f), "nome": f.name,
                                "tamanho": f.stat().st_size})
            elif ext in VIDEOS:
                fora += 1
        return aceitos, fora

    def trilha(self, pasta_id: str) -> list:
        """O caminho de migalhas, da raiz ate a pasta aberta."""
        aqui = self.caminho_de(pasta_id)
        pedacos, atual = [], aqui
        while True:
            pedacos.append({"id": self.id_de(atual),
                            "nome": atual.name or str(atual)})
            if atual == self.raiz or atual.parent == atual:
                break
            atual = atual.parent
            if len(pedacos) > 12:
                break
        return list(reversed(pedacos))


class FonteDrive:
    """O Google Drive pela API. E' esta que a esteira no servidor vai usar.

    Ela fica dormindo enquanto o arquivo de credencial nao existir. Nao e' erro: e' o
    estado normal ate' a conta de robo ser criada e a pasta ser compartilhada com ela.
    """

    nome = "drive"

    def __init__(self, raiz_id: str = ""):
        # Sem pasta ma~e escolhida, a raiz e' "o que compartilharam comigo". Com uma pasta
        # ma~e escolhida, a tela ja' abre dentro dela e voce poupa um clique por visita.
        self.raiz_id = raiz_id or ""
        self._token = None
        self._nome = {}

    def pronta(self) -> tuple:
        # A chave se resolve A CADA USO, e nao no import: congelada, um arquivo que
        # nasce depois do servidor subir nunca seria visto.
        chave = _chave_drive()
        if not chave.exists():
            return False, f"falta a credencial de leitura do Drive em {chave}"
        return True, ""

    def robo(self) -> str:
        """O endereco do robo. Nao e' segredo: e' com ele que a pasta e' compartilhada."""
        try:
            return json.loads(_chave_drive().read_text(encoding="utf-8")).get(
                "client_email", "")
        except Exception:
            return ""

    # As chamadas ficam escritas mas so' rodam quando a credencial existir. Sem ela,
    # `pronta()` barra antes e a tela mostra o aviso em vez de um erro cru.
    def _cabecalho(self) -> dict:
        import time, urllib.request
        if self._token and self._token[1] > time.time() + 60:
            return {"Authorization": "Bearer " + self._token[0]}
        dados = json.loads(_chave_drive().read_text(encoding="utf-8"))
        from google.oauth2 import service_account          # noqa: import tardio
        import google.auth.transport.requests as pedidos
        cred = service_account.Credentials.from_service_account_info(
            dados, scopes=["https://www.googleapis.com/auth/drive.readonly"])
        cred.refresh(pedidos.Request())
        self._token = (cred.token, time.time() + 3000)
        return {"Authorization": "Bearer " + cred.token}

    def _consultar(self, params: dict) -> dict:
        import urllib.request
        url = "https://www.googleapis.com/drive/v3/files?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers=self._cabecalho())
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)

    def listar_pastas(self, pasta_id: str, contar: bool = True) -> list:
        """A raiz do robo NAO e' o Drive do Gabriel.

        Um robo tem Drive proprio, e ele nasce vazio. Pedir `root` devolveria nada, para
        sempre. O que ele enxerga do Drive de uma pessoa e' exatamente o que foi
        compartilhado com ele, e e' isso que a raiz mostra aqui. Dai' para baixo, e'
        navegacao normal por pasta pai.
        """
        pai = pasta_id or self.raiz_id
        if not pai or pai == "compartilhadas":
            q = ("sharedWithMe = true and "
                 "mimeType='application/vnd.google-apps.folder' and trashed=false")
        else:
            q = (f"'{pai}' in parents and "
                 "mimeType='application/vnd.google-apps.folder' and trashed=false")
        d = self._consultar({
            "q": q, "fields": "files(id,name)", "pageSize": 200,
            "orderBy": "name", "supportsAllDrives": "true",
            "includeItemsFromAllDrives": "true"})
        # CONTAR CUSTA UMA CHAMADA POR PASTA. Numa leva de 180 subpastas isso e' meio
        # minuto de espera so' para exibir um numero que a varredura ja' vai apurar.
        return [{"id": x["id"], "nome": x["name"],
                 "videos": self.contar(x["id"]) if contar else None,
                 "caminho": x["name"]} for x in d.get("files", [])]

    def _um(self, arquivo_id: str) -> dict:
        import urllib.request
        url = ("https://www.googleapis.com/drive/v3/files/" + arquivo_id +
               "?fields=id,name,parents&supportsAllDrives=true")
        req = urllib.request.Request(url, headers=self._cabecalho())
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)

    def contar(self, pasta_id: str) -> int:
        d = self._consultar({
            "q": f"'{pasta_id}' in parents and mimeType='video/mp4' and trashed=false",
            "fields": "files(id)", "pageSize": 1000, "supportsAllDrives": "true",
            "includeItemsFromAllDrives": "true"})
        return len(d.get("files", []))

    def listar_videos(self, pasta_id: str) -> tuple:
        d = self._consultar({
            "q": f"'{pasta_id}' in parents and trashed=false and "
                 "(mimeType contains 'video/')",
            "fields": "files(id,name,size,mimeType,thumbnailLink)", "pageSize": 1000,
            "orderBy": "name", "supportsAllDrives": "true",
            "includeItemsFromAllDrives": "true"})
        aceitos, fora = [], 0
        for x in d.get("files", []):
            if x.get("mimeType") == "video/mp4":
                aceitos.append({"id": x["id"], "nome": x["name"],
                                "tamanho": int(x.get("size") or 0),
                                "capa": x.get("thumbnailLink") or ""})
            else:
                fora += 1
        return aceitos, fora

    def videos_de_varias(self, pastas: list) -> dict:
        """Os videos de VARIAS pastas de uma vez, em lotes.

        POR QUE EM LOTE. A leva do Gabriel tem 180 subpastas, uma por corte. Perguntar
        pasta por pasta seria 180 idas ao Google so' para ligar uma leva, e a tela
        ficaria parada minutos. A API aceita varios pais numa consulta so', entao vao
        30 por vez: 6 chamadas no lugar de 180.

        O lote e' de 30 porque a consulta viaja na URL, e uma lista longa demais volta
        recusada por tamanho.
        """
        saida = {}
        for i in range(0, len(pastas), 30):
            lote = pastas[i:i + 30]
            alvo = " or ".join("'%s' in parents" % p for p in lote)
            try:
                d = self._consultar({
                    "q": "(" + alvo + ") and trashed=false and "
                         "(mimeType contains 'video/')",
                    "fields": "files(id,name,size,mimeType,parents,thumbnailLink)",
                    "pageSize": 1000, "orderBy": "name",
                    "supportsAllDrives": "true", "includeItemsFromAllDrives": "true"})
            except Exception:
                continue
            for x in d.get("files", []):
                if x.get("mimeType") != "video/mp4":
                    continue
                for pai in (x.get("parents") or []):
                    if pai in lote:
                        saida.setdefault(pai, []).append(
                            {"id": x["id"], "nome": x["name"],
                             "tamanho": int(x.get("size") or 0),
                             "capa": x.get("thumbnailLink") or ""})
        return saida

    def nome_de(self, pasta_id: str) -> str:
        if pasta_id not in self._nome:
            try:
                self._nome[pasta_id] = self._um(pasta_id).get("name", "")
            except Exception:
                self._nome[pasta_id] = ""
        return self._nome[pasta_id]

    def trilha(self, pasta_id: str) -> list:
        """Sobe de pasta em pasta ate onde o robo ainda enxerga.

        Acima da pasta compartilhada ele nao ve' nada, e a propria API recusa. Essa recusa
        e' o fim natural do caminho, nao um erro: e' ali que a permissao dele termina.
        """
        raiz = ({"id": self.raiz_id, "nome": self.nome_de(self.raiz_id)}
                if self.raiz_id else
                {"id": "compartilhadas", "nome": "Compartilhadas com o publicador"})
        if not pasta_id or pasta_id == "compartilhadas" or pasta_id == self.raiz_id:
            return [raiz]
        pedacos, atual, voltas = [], pasta_id, 0
        while atual and atual != self.raiz_id and voltas < 12:
            try:
                d = self._um(atual)
            except Exception:
                break
            pedacos.append({"id": d["id"], "nome": d.get("name", "")})
            pais = d.get("parents") or []
            atual = pais[0] if pais else ""
            voltas += 1
        return [raiz] + list(reversed(pedacos))


def varrer(f, pasta_id: str) -> tuple:
    """Todos os videos de uma pasta LIGADA: os que estao nela e os que estao nas
    subpastas dela.

    POR QUE DESCER UM NIVEL. No Drive do Gabriel a leva nao guarda arquivo, guarda
    pasta: `leva 31 de leisdamentemilionaria` tem 180 pastas numeradas, uma por corte,
    com um video dentro de cada. Lendo so' o andar de cima, ligar a leva encontrava
    ZERO video, e a prateleira nascia vazia.

    Devolve (lista, fora_do_formato). Cada video traz `sub_id` e `sub_nome`: e' a
    pasta DELE, e e' para la' que o botao do Drive aponta na tela.
    """
    aceitos, fora = f.listar_videos(pasta_id)
    saida = [dict(v, sub_id="", sub_nome="") for v in aceitos]

    subs = f.listar_pastas(pasta_id, contar=False)
    if not subs:
        return saida, fora

    if hasattr(f, "videos_de_varias"):
        por_pasta = f.videos_de_varias([s["id"] for s in subs])
        nomes = {s["id"]: s["nome"] for s in subs}
        for pai, videos in por_pasta.items():
            for v in videos:
                saida.append(dict(v, sub_id=pai, sub_nome=nomes.get(pai, "")))
        return saida, fora

    for s in subs:                                   # pasta de disco: leitura local
        try:
            vs, f2 = f.listar_videos(s["id"])
        except Exception:
            continue
        fora += f2
        for v in vs:
            saida.append(dict(v, sub_id=s["id"], sub_nome=s["nome"]))
    return saida, fora


def fonte():
    c = config()
    if c.get("fonte") == "drive":
        return FonteDrive(c.get("raiz_id", ""))
    return FontePasta(c.get("raiz", r"G:\Meu Drive"))


# ============================================================== o que a tela pede
def estado() -> dict:
    f = fonte()
    ok, motivo = f.pronta()
    c = config()
    d = {"fonte": f.nome, "pronta": ok, "motivo": motivo,
         "raiz": c.get("raiz", ""), "raiz_id": c.get("raiz_id", "")}
    if f.nome == "drive" and ok:
        # A tela precisa mostrar o endereco do robo quando nada foi compartilhado ainda,
        # senao o "esta vazio" nao diz o que fazer para deixar de estar.
        d["robo"] = f.robo()
    return d


def navegar(pasta_id: str, busca: str = "") -> dict:
    """As pastas de dentro de uma pasta, para a tela de escolher.

    CONTAR VIDEO CUSTA UMA IDA AO GOOGLE POR PASTA. Numa pasta com poucas subpastas
    isso e' barato e o numero ajuda a escolher. Dentro da leva 31, que tem 180, sao
    180 chamadas: a janela ficava em "Lendo o Drive" por quase um minuto. Acima do
    teto a contagem e' pulada, e a tela diz "abrir para ver o que tem" no lugar do
    numero. Quem apura de verdade e' a varredura, na hora de ligar.
    """
    f = fonte()
    ok, motivo = f.pronta()
    if not ok:
        return {"erro": motivo}
    pastas = f.listar_pastas(pasta_id, contar=False)
    if len(pastas) <= 25:
        for p in pastas:
            try:
                p["videos"] = f.contar(
                    p["id"] if f.nome == "drive" else Path(p["caminho"]))
            except Exception:
                p["videos"] = None
    if busca:
        b = busca.lower()
        pastas = [p for p in pastas if b in p["nome"].lower()]
    con = abrir()
    ligadas = {r["id"] for r in con.execute("SELECT id FROM pasta")}
    con.close()
    for p in pastas:
        p["ligada"] = p["id"] in ligadas
    return {"trilha": f.trilha(pasta_id), "pastas": pastas, "aqui": pasta_id or ""}


def ligadas(conta: str = "") -> list:
    """As pastas da prateleira, com a conta de cada estado.

    A contagem sai do livro, e nao de uma nova leitura da fonte: e' ela que sabe o que ja'
    foi programado. Reler a pasta e' um pedido separado, com botao proprio.

    COM `conta`, devolve so' as pastas daquele perfil. Pasta pertence a um perfil so'.
    """
    con = abrir()
    saida = []
    onde = "WHERE conta = ? " if conta else ""
    args = (conta.lower(),) if conta else ()
    for p in con.execute("SELECT * FROM pasta " + onde + "ORDER BY ligada_em DESC",
                         args):
        contas = {r["estado"]: r["n"] for r in con.execute(
            "SELECT estado, count(*) n FROM video WHERE pasta_id=? GROUP BY estado",
            (p["id"],))}
        saida.append({
            "id": p["id"], "nome": p["nome"], "caminho": p["caminho"],
            "fonte": p["fonte"], "ligada_em": p["ligada_em"],
            "conta": p["conta"],
            "total": sum(contas.values()),
            "prateleira": contas.get("prateleira", 0),
            "programados": contas.get("programado", 0) + contas.get("baixado", 0),
            "publicados": contas.get("publicado", 0),
            "erro": contas.get("erro", 0),
            "fora": p["caminho"] and 0,
        })
    con.close()
    return saida


def ligar(pasta_id: str, nome: str = "", caminho: str = "", conta: str = "") -> dict:
    """Anota os videos daquela pasta no livro, e os das subpastas dela. **Nao baixa
    nada.**

    Rodar de novo na mesma pasta e' seguro e e' esperado: o `INSERT OR IGNORE` faz o
    trabalho da trava. O que ja' esta' no livro fica como esta', inclusive o que ja' foi
    programado; o que e' novo entra na prateleira.

    A PASTA NASCE COM DONO. Um video serve um perfil so', entao ele ja' entra com a
    conta da pasta: sem isso, a prateleira seria da rede e a ficha da conta nao teria o
    que mostrar ate' alguem programar.
    """
    f = fonte()
    ok, motivo = f.pronta()
    if not ok:
        return {"erro": motivo}
    conta = (conta or "").replace("@", "").strip().lower()
    if not conta:
        return {"erro": "diga de qual conta e' esta pasta"}
    aceitos, fora = varrer(f, pasta_id)
    con = abrir()
    ja = {r["id"] for r in con.execute("SELECT id FROM video WHERE pasta_id=?", (pasta_id,))}
    novos = 0
    for v in aceitos:
        if v["id"] in ja:
            continue
        con.execute("INSERT OR IGNORE INTO video "
                    "(id, pasta_id, sub_id, sub_nome, nome, tamanho, capa, estado, "
                    " conta, visto_em) VALUES (?,?,?,?,?,?,?, 'prateleira', ?,?)",
                    (v["id"], pasta_id, v.get("sub_id") or "", v.get("sub_nome") or "",
                     v["nome"], v.get("tamanho"), v.get("capa") or "", conta, agora()))
        novos += 1
    if not nome:
        nome = Path(caminho).name if caminho else pasta_id
    con.execute("INSERT INTO pasta (id, nome, caminho, fonte, conta, ligada_em) "
                "VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET "
                "nome=excluded.nome, conta=excluded.conta",
                (pasta_id, nome, caminho or nome, f.nome, conta, agora()))
    con.commit()
    con.close()
    return {"novos": novos, "ja_tinha": len(ja), "fora": fora,
            "total": len(aceitos), "conta": conta}


def desligar(pasta_id: str) -> dict:
    """Tira a pasta da prateleira. O que ja' foi programado NAO some do livro.

    Desligar e' dizer "nao me ofereca mais essa pasta", e nao "apague o historico". Se o
    historico sumisse junto, um video ja' publicado poderia voltar a ser oferecido depois.
    """
    con = abrir()
    con.execute("DELETE FROM video WHERE pasta_id=? AND estado='prateleira'", (pasta_id,))
    sobrou = con.execute("SELECT count(*) n FROM video WHERE pasta_id=?",
                         (pasta_id,)).fetchone()["n"]
    if not sobrou:
        con.execute("DELETE FROM pasta WHERE id=?", (pasta_id,))
    else:
        con.execute("DELETE FROM pasta WHERE id=?", (pasta_id,))
    con.commit()
    con.close()
    return {"ok": True, "historico_mantido": sobrou}


# ============================================================== a miniatura
CAPAS = DADOS / "capas-midia"


def capa(video_id: str) -> bytes | None:
    """Os bytes da miniatura de um video, servidos pela casa.

    POR QUE NAO MANDAR O ENDERECO DO DRIVE DIRETO PARA A TELA. Porque o endereco de
    miniatura do Drive exige o token do robo e caduca: a grade nasceria cheia de
    quadrado quebrado. E' o mesmo caminho que o retrato da conta e a capa do post ja'
    fazem neste painel.

    Baixa uma vez e guarda. Miniatura de video nao muda.
    """
    if not video_id:
        return None
    CAPAS.mkdir(parents=True, exist_ok=True)
    guardada = CAPAS / (hashlib.sha1(video_id.encode()).hexdigest() + ".jpg")
    if guardada.exists():
        return guardada.read_bytes()

    con = abrir()
    linha = con.execute("SELECT capa FROM video WHERE id = ?", (video_id,)).fetchone()
    con.close()
    endereco = (linha["capa"] if linha else "") or ""
    if not endereco:
        return None

    import urllib.request
    f = fonte()
    cabecalho = {}
    try:
        cabecalho = f._cabecalho()          # so' o Drive tem token
    except Exception:
        pass
    try:
        with urllib.request.urlopen(
                urllib.request.Request(endereco, headers=cabecalho), timeout=30) as r:
            dados = r.read()
    except Exception:
        return None
    guardada.write_bytes(dados)
    return dados


# ====================================================== as midias de uma conta
def midias(conta: str) -> dict:
    """O que a sub-aba Midias da ficha mostra: tudo o que e' desta conta, em tres
    estados, mais a pasta de cada video para o botao do Drive.

    OS TRES ESTADOS SAO OS QUE ELE PEDIU: o que ja' foi ao ar, o que esta' marcado
    para sair e o que esta' guardado sem uso. Os cinco estados do livro se dobram em
    tres porque `baixado` e `erro` sao passos internos da esteira, e nao respostas a
    uma pergunta que alguem faz olhando um perfil.
    """
    conta = (conta or "").replace("@", "").strip().lower()
    con = abrir()
    linhas = con.execute(
        "SELECT id, pasta_id, sub_id, sub_nome, nome, tamanho, capa, estado, quando, "
        "       post_id, erro FROM video WHERE conta = ? ORDER BY quando DESC, nome",
        (conta,)).fetchall()
    pastas = {p["id"]: p["nome"] for p in
              con.execute("SELECT id, nome FROM pasta WHERE conta = ?", (conta,))}
    con.close()

    # O CODIGO CURTO DO POST, para o botao do Instagram. O livro guarda o numero do
    # post, e o endereco publico do Instagram usa o codigo curto: quem tem os dois
    # lado a lado e' o `analytics.json`, que a coleta ja' grava.
    curto = {}
    try:
        an = json.loads((PASTA / "analytics.json").read_text(encoding="utf-8"))
        for _, fundo in (an.get("fundo") or {}).items():
            for post in fundo.get("posts", []):
                if post.get("id") and post.get("sc"):
                    curto[str(post["id"])] = post["sc"]
    except Exception:
        pass

    dobra = {"publicado": "publicado", "programado": "programado",
             "baixado": "programado", "erro": "programado",
             "prateleira": "guardado"}
    fora = []
    for l in linhas:
        fora.append({
            "id": l["id"], "nome": l["nome"], "estado": dobra.get(l["estado"], "guardado"),
            "bruto": l["estado"], "quando": l["quando"], "erro": l["erro"],
            "mb": round((l["tamanho"] or 0) / 1048576.0, 1),
            # a capa vem pela casa, e nao pelo endereco do Drive: aquele endereco
            # expira e o navegador nao carrega imagem que exige token
            "capa": ("midia/capa?v=" + l["id"]) if l["capa"] else "",
            "leva": pastas.get(l["pasta_id"], ""), "leva_id": l["pasta_id"],
            # a pasta DO VIDEO: quando ele mora solto na leva, e' a propria leva
            "pasta": l["sub_nome"] or pastas.get(l["pasta_id"], ""),
            "pasta_id": l["sub_id"] or l["pasta_id"],
            "sc": curto.get(str(l["post_id"] or "")) or "",
        })
    return {"conta": conta, "midias": fora,
            "pastas": [{"id": k, "nome": v} for k, v in pastas.items()]}


def saidas() -> list:
    """Tudo que tem data marcada no livro-caixa, pronto para a aba de Calendario.

    POR QUE AQUI E NAO NO SERVIDOR. A tela do calendario precisa, por saida, do mesmo
    trio que a sub-aba Midias ja' resolve: a LEVA (no gantt ela vira barra, por ser a
    unica coisa nesta tela com inicio, fim e progresso), a PASTA DO PROPRIO CORTE (o
    botao do Drive, que aponta para a subpasta e nao para a leva) e a CAPA servida pela
    casa (o endereco do Drive expira). Duplicar essa juncao no servidor seria manter
    duas versoes da mesma regra.
    """
    con = abrir()
    linhas = con.execute(
        "SELECT id, pasta_id, sub_id, sub_nome, nome, capa, estado, quando, conta, "
        "       post_id FROM video WHERE quando IS NOT NULL ORDER BY quando"
    ).fetchall()
    pastas = {p["id"]: p["nome"] for p in
              con.execute("SELECT id, nome FROM pasta")}
    con.close()

    curto, vistas = {}, {}
    try:
        an = json.loads((PASTA / "analytics.json").read_text(encoding="utf-8"))
        for _, fundo in (an.get("fundo") or {}).items():
            for post in fundo.get("posts", []):
                if post.get("id"):
                    if post.get("sc"):
                        curto[str(post["id"])] = post["sc"]
                    vistas[str(post["id"])] = post.get("vis")
    except Exception:
        pass

    # O CALENDARIO SO' CONHECE DOIS ESTADOS: o que ja' foi ao ar e o que esta' na fila.
    # `baixado` e `erro` sao etapas do caminho ate' publicar, nao um terceiro lugar no
    # tempo, e a tela nao tem o que fazer com essa distincao.
    fora = []
    for l in linhas:
        ident = str(l["post_id"] or "")
        fora.append({
            "titulo": l["nome"], "nome": l["nome"], "conta": l["conta"],
            "quando": l["quando"],
            "estado": "publicado" if l["estado"] == "publicado" else "programado",
            "fmt": "reel",
            "sc": curto.get(ident) or None,
            "vis": vistas.get(ident),
            "leva": pastas.get(l["pasta_id"], ""), "leva_id": l["pasta_id"],
            "pasta_id": l["sub_id"] or l["pasta_id"],
            "capa": ("midia/capa?v=" + l["id"]) if l["capa"] else "",
        })
    return fora


# ============================================================== o pulso da rede
def gravar_pulso(publicando: int, paradas: int, caidas: int) -> dict:
    """Um retrato por dia, sobrescrito enquanto o dia corre.

    Sobrescrever e' de proposito: dentro do mesmo dia vale o ultimo estado conhecido,
    e nao a media. O que interessa na linha e' 'como a rede estava naquele dia'."""
    dia = hoje_local()
    con = abrir()
    con.execute("INSERT INTO pulso (dia, publicando, paradas, caidas, em) "
                "VALUES (?,?,?,?,?) ON CONFLICT(dia) DO UPDATE SET "
                "publicando=excluded.publicando, paradas=excluded.paradas, "
                "caidas=excluded.caidas, em=excluded.em",
                (dia, int(publicando), int(paradas), int(caidas), agora()))
    con.commit()
    con.close()
    return {"ok": True, "dia": dia}


def pulso(dias: int = 30) -> list:
    con = abrir()
    linhas = [dict(r) for r in con.execute(
        "SELECT dia, publicando, paradas, caidas FROM pulso "
        "ORDER BY dia DESC LIMIT ?", (max(1, min(dias, 365)),))]
    con.close()
    return list(reversed(linhas))


# ============================================================== o rascunho
def ler_rascunho() -> dict:
    con = abrir()
    fora = []
    for l in con.execute("SELECT * FROM rascunho ORDER BY mexido_em DESC"):
        try:
            dados = json.loads(l["dados"])
        except Exception:
            dados = {}
        fora.append({"id": l["id"], "conta": l["conta"], "dados": dados,
                     "mexido_em": l["mexido_em"]})
    con.close()
    return {"rascunhos": fora}


def gravar_rascunho(dados: dict) -> dict:
    """UM RASCUNHO POR CONTA. Voltar a mexer no lote da mesma conta continua o mesmo
    rascunho; comecar um lote de outra conta abre outro, e os dois ficam de pe'."""
    quem = ((dados.get("escolha") or {}).get("conta") or "").strip()
    if not quem:
        return {"erro": "rascunho sem conta nao e' rascunho"}
    con = abrir()
    agora_ = agora()
    con.execute("INSERT INTO rascunho (conta, dados, criado_em, mexido_em) "
                "VALUES (?,?,?,?) ON CONFLICT(conta) DO UPDATE SET "
                "dados=excluded.dados, mexido_em=excluded.mexido_em",
                (quem, json.dumps(dados, ensure_ascii=False), agora_, agora_))
    con.commit()
    con.close()
    return {"ok": True}


def apagar_rascunho(qual=None) -> dict:
    """Apagar e' sempre explicito: ou um id, ou o pedido de limpar tudo."""
    con = abrir()
    if qual in (None, "", "todos"):
        con.execute("DELETE FROM rascunho")
    else:
        con.execute("DELETE FROM rascunho WHERE id=?", (qual,))
    con.commit()
    con.close()
    return {"ok": True}


# ============================================================== as rotas
def responder(rota: str, consulta: dict, corpo: dict | None):
    """Devolve (objeto, codigo) ou None se a rota nao for daqui."""
    um = lambda k, p="": (consulta.get(k, [p])[0] or p)

    if rota == "midia/estado":
        return estado(), 200
    if rota == "midia/navegar":
        d = navegar(um("pasta"), um("busca"))
        return d, (400 if "erro" in d else 200)
    if rota == "midia/ligadas":
        return {"pastas": ligadas(um("u"))}, 200
    if rota == "midia/ligar" and corpo is not None:
        d = ligar(corpo.get("pasta", ""), corpo.get("nome", ""), corpo.get("caminho", ""),
                  corpo.get("conta", ""))
        return d, (400 if "erro" in d else 200)
    if rota == "contas/midias":
        return midias(um("u")), 200
    if rota == "midia/desligar" and corpo is not None:
        return desligar(corpo.get("pasta", "")), 200
    if rota == "contas/meta":
        if corpo is None:
            return {"contas": meta_contas()}, 200
        d = gravar_meta(corpo.get("arroba", ""), corpo.get("mercado"),
                        corpo.get("etiquetas"))
        return d, (400 if "erro" in d else 200)
    if rota == "painel/rascunho":
        if corpo is None:
            return ler_rascunho(), 200
        if corpo.get("apagar"):
            return apagar_rascunho(corpo.get("apagar")), 200
        return gravar_rascunho(corpo.get("dados") or {}), 200
    if rota == "painel/pulso":
        if corpo is None:
            return {"pulso": pulso(int(um("dias", "30") or 30))}, 200
        return gravar_pulso(corpo.get("publicando", 0), corpo.get("paradas", 0),
                            corpo.get("caidas", 0)), 200
    if rota == "midia/config" and corpo is not None:
        return gravar_config(corpo), 200
    return None
