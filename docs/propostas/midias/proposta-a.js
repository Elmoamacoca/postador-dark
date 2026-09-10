/* ================================================== PROPOSTA A: A PRATELEIRA

   A DECISAO DESTA PROPOSTA: tudo acontece DENTRO do cartao da conta, sem abrir nada.
   A sub-aba vira uma prateleira com tres gavetas (Foram Ao Ar, Marcados, Guardados),
   e a lista rola dentro do proprio cartao.

   POR QUE ELA EXISTE: e' a leitura mais rapida das tres. Um clique na sub-aba e o
   material esta' na tela, na mesma ficha em que voce ja' estava olhando o estado da
   conta. Nada de janela, nada de ir e voltar.

   O QUE ELA CUSTA: o cartao tem 398 pixels de largura minima, entao cada linha carrega
   pouca coisa. Lote grande vira rolagem longa.

   DE ONDE VEM CADA PECA (recorte, nao desenho novo):
     .ct-seg          o segmentado, o mesmo da tira de sub-abas da ficha
     .ct-par          a linha de rotulo e valor, da aba Identidade
     .ct-bt / .circ   o botao animado da casa
     .mid-capa        a miniatura 9x16, da tabela da aba de Analytics
     .prev            a previa ao passar o mouse, aprovada em 09/09
   ========================================================================== */
(function () {
  var M = window.MID;
  var gaveta = {};   /* a gaveta aberta, por conta */

  var GAVETAS = [
    { v: 'publicado', r: 'Foram Ao Ar' },
    { v: 'programado', r: 'Marcados' },
    { v: 'guardado', r: 'Guardados' }
  ];

  window.CONTA_MIDIAS = function (c) {
    var t = M.contas(c.arroba);
    var n = t.publicado + t.programado + t.guardado;
    return n ? '<span class="n">' + n + '</span>' : '';
  };

  window.CORPO_MIDIAS = function (c) {
    var u = c.arroba;
    var qual = gaveta[u] || 'publicado';
    var t = M.contas(u);
    var pasta = M.pastaDe(u);
    var f = M.folego(u);

    var lista = M.porEstado(u, qual);
    lista = qual === 'guardado'
      ? M.ordenar(lista, 'nome', false)
      : M.ordenar(lista, 'quando', qual === 'publicado');

    return '' +
      /* 1. a pasta que abastece esta conta */
      '<div class="pr-pasta">' +
        '<span class="pr-pasta-ic"><svg viewBox="0 0 24 24">' +
        '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5' +
        'a2 2 0 0 1-2-2Z"/></svg></span>' +
        '<span class="pr-pasta-n"><b>' + M.escapar(M.maiuscula(pasta.nome)) + '</b>' +
        '<span>' + (t.publicado + t.programado + t.guardado) + ' Vídeos Anotados' +
        '</span></span>' +
        '<button class="ct-ic" type="button" data-ligar-pasta="' + M.escapar(u) +
        '" title="Trocar a pasta desta conta">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
        'stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>' +
      '</div>' +

      /* 2. as tres gavetas */
      '<div class="ct-seg pr-seg" data-gaveta="' + M.escapar(u) + '">' +
        GAVETAS.map(function (g) {
          return '<button type="button" data-g="' + g.v + '"' +
            (qual === g.v ? ' class="on"' : '') + '>' + g.r +
            '<span class="n">' + t[g.v] + '</span></button>';
        }).join('') +
      '</div>' +

      /* 3. a lista, rolando dentro do cartao */
      '<div class="pr-lista mid-rolo">' +
        (lista.length ? lista.map(linha).join('')
          : '<div class="pr-vazio">' + vazio(qual) + '</div>') +
      '</div>' +

      /* 4. o folego, que e' a pergunta que uma prateleira responde */
      '<div class="pr-pe">' +
        (f.sobra
          ? '<b>' + f.sobra + '</b> Em Pé, Dá Para <b>' + f.rotulo + '</b>' +
            ' <span class="pr-chute">' + f.nota + '</span>'
          : 'Sem Material Em Pé Para Esta Conta') +
      '</div>';
  };

  function vazio(qual) {
    if (qual === 'publicado') return 'Nada saiu desta conta ainda.';
    if (qual === 'programado') return 'Nenhum vídeo marcado para sair.';
    return 'A prateleira desta conta está vazia.';
  }

  function linha(m) {
    var dir = m.estado === 'publicado'
      ? '<b>' + M.curto(m.vis) + '</b><span>Visualizações</span>'
      : (m.estado === 'programado'
        ? '<b>' + M.hora(m.quando) + '</b><span>' + M.dia(m.quando) + '</span>'
        : '<b>' + M.seg(m.dur) + '</b><span>' + M.mb(m.mb) + '</span>');

    return '<div class="pr-li" data-mid="' + M.escapar(m.id) + '">' +
      '<span class="mid-capa m"><img src="' + M.capa(m.capa) + '" alt=""></span>' +
      '<span class="pr-txt">' +
        '<b>' + M.escapar(M.pedaco(m.legenda || m.nome, 34)) + '</b>' +
        '<span>' + (m.estado === 'guardado'
          ? M.escapar(m.nome)
          : M.idade(m.quando) + ' · ' + M.escapar(M.pedaco(m.nome, 18))) +
          (m.exemplo ? ' <i class="mid-ex" title="Exemplo"></i>' : '') +
        '</span>' +
      '</span>' +
      '<span class="pr-dir">' + dir + '</span>' +
    '</div>';
  }

  /* A gaveta e' clique de tela, entao ela redesenha a ficha inteira, que e' o que o
     motor da aba ja' sabe fazer com a tira de sub-abas. */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-gaveta] button');
    if (!b) return;
    gaveta[b.closest('[data-gaveta]').dataset.gaveta] = b.dataset.g;
    window.CT_JANELA.redesenhar();
  });

  document.addEventListener('DOMContentLoaded', function () { M.ligarCasca(); });
})();
