# -*- coding: utf-8 -*-
"""Publica as tres propostas da ABA PAINEL, uma por endereco.

Uma pagina por proposta, endereco fixo, e republicar no MESMO nome mantem o endereco
antigo valendo. O token sai de `.claude/secrets/vercel_token.txt`, que guarda
`NOME=valor`: mandar o arquivo inteiro devolve 403 sem explicar nada.

Rodar:  python docs/propostas/painel/publicar.py
"""
import base64
import json
import pathlib
import sys
import urllib.request

AQUI = pathlib.Path(__file__).resolve().parent
COFRE = pathlib.Path.home() / '.claude' / 'secrets' / 'vercel_token.txt'
JUNTOS = ['painel.css', 'sala.css', 'grafico.css', 'comum.css',
          'casa.js', 'sala.js', 'comum.js', 'dados.js',
          'marca-clara.png', 'marca-escura.png']
PROPOSTAS = {
    'borusa-painel-a': 'proposta-a.html',
    'borusa-painel-b': 'proposta-b.html',
    'borusa-painel-c': 'proposta-c.html',
}


def token():
    for linha in COFRE.read_text(encoding='utf-8').splitlines():
        if linha.startswith('#') or '=' not in linha:
            continue
        return linha.split('=', 1)[1].strip()
    raise SystemExit('token da Vercel nao encontrado')


def publicar(tk, projeto, pagina):
    arquivos = [{'file': 'index.html',
                 'data': base64.b64encode((AQUI / pagina).read_bytes()).decode(),
                 'encoding': 'base64'}]
    for nome in JUNTOS:
        arquivos.append({'file': nome,
                         'data': base64.b64encode((AQUI / nome).read_bytes()).decode(),
                         'encoding': 'base64'})
    corpo = json.dumps({'name': projeto, 'files': arquivos, 'target': 'production',
                        'projectSettings': {'framework': None}}).encode()
    req = urllib.request.Request('https://api.vercel.com/v13/deployments', data=corpo,
                                 headers={'Authorization': 'Bearer ' + tk,
                                          'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=300) as r:
        d = json.load(r)
    return d.get('id'), 'https://' + projeto + '.vercel.app'


def main():
    tk = token()
    for projeto, pagina in PROPOSTAS.items():
        if not (AQUI / pagina).exists():
            continue
        try:
            ident, endereco = publicar(tk, projeto, pagina)
            print(projeto.ljust(18), 'ok  ', endereco, ident)
        except urllib.error.HTTPError as e:
            print(projeto.ljust(18), 'FALHOU', e.code,
                  e.read()[:300].decode('utf-8', 'ignore'))
            sys.exit(1)


if __name__ == '__main__':
    main()
