/* ============================================ POP-UP A: A LISTA DE TRABALHO

   O QUE ESTAVA ERRADO NA PRIMEIRA JANELA, medido em 10/09: 649 por 725 pixels num
   monitor de 1400, quatro colunas de 148, capa de 251 de altura, 36 videos empilhados
   numa area de 616 que rolava, paginacao de 12 competindo com essa rolagem, busca que
   redesenhava a janela inteira a cada tecla, e NENHUMA ACAO: dava para olhar e fechar.

   A DECISAO DESTA PROPOSTA: capa pequena e texto grande. Uma linha por video, do jeito
   que se lista arquivo: nome, estado, data, peso, resultado e as acoes na ponta.
   Cabecalho que ordena, rolagem continua sem paginacao, e a barra de filtro fixa no
   topo, que nunca sai da tela.

   POR QUE ELA EXISTE: e' a unica das tres em que voce acha UM arquivo pelo nome em
   dois segundos, e a que mostra mais itens por tela (14 contra 8 e 12).

   O QUE ELA CUSTA: e' a menos visual. Para escolher pelo que se ve, ela e' a pior.
   ========================================================================== */
(function () {
  var M = window.MID;
  var estado = {};

  var ABAS = [
    { v: 'tudo', r: 'Tudo' },
    { v: 'publicado', r: 'Foram Ao Ar' },
    { v: 'programado', r: 'Marcados' },
    { v: 'guardado', r: 'Guardados' }
  ];
  var COLUNAS = [
    { c: 'nome', r: 'Arquivo' },
    { c: 'estado', r: 'Estado' },
    { c: 'quando', r: 'Quando' },
    { c: 'mb', r: 'Peso' },
    { c: 'vis', r: 'Resultado' }
  ];

  function est(u) {
    if (!estado[u]) estado[u] = { filtro: 'tudo', busca: '', campo: 'quando',
                                  desc: true };
    return estado[u];
  }

  window.ABRIR_MIDIAS = function (u) {
    var c = window.CT_JANELA.contaDe(u);
    M.abrirGrande(window.CT_JANELA.cabConta(c, 'Mídias desta conta'),
      corpo(u), rodape(u));
    pintarLinhas(u);
  };

  function corpo(u) {
    var e = est(u);
    var t = M.contas(u);
    return '' +
      '<div class="lt-barra">' +
        '<div class="ct-seg" data-filtro="' + M.escapar(u) + '">' +
          ABAS.map(function (a) {
            var n = a.v === 'tudo' ? t.publicado + t.programado + t.guardado : t[a.v];
            return '<button type="button" data-f="' + a.v + '"' +
              (e.filtro === a.v ? ' class="on"' : '') + '>' + a.r +
              '<span class="n">' + n + '</span></button>';
          }).join('') +
        '</div>' +
        '<label class="ct-busca lt-busca">' +
          '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/>' +
          '<path d="M20 20l-3.5-3.5"/></svg>' +
          '<input type="text" placeholder="Buscar pelo nome ou pela legenda" ' +
          'data-busca="' + M.escapar(u) + '" autocomplete="off" spellcheck="false">' +
        '</label>' +
      '</div>' +

      '<div class="lt-quadro mid-rolo">' +
        '<table class="lt"><thead><tr>' +
          '<th class="lt-mini"></th>' +
          COLUNAS.map(function (col) {
            return '<th data-ord="' + col.c + '" class="lt-' + col.c +
              (e.campo === col.c ? ' on' : '') + '">' + col.r +
              '<svg viewBox="0 0 24 24" class="lt-seta' +
              (e.campo === col.c && !e.desc ? ' sobe' : '') + '">' +
              '<path d="m6 9 6 6 6-6"/></svg></th>';
          }).join('') +
          '<th class="lt-ac"></th>' +
        '</tr></thead><tbody data-linhas="' + M.escapar(u) + '"></tbody></table>' +
        '<div class="lt-vazio" data-vazio="' + M.escapar(u) + '" hidden>' +
        'Nada aqui com esse filtro.</div>' +
      '</div>';
  }

  function rodape(u) {
    return '<span class="ct-jan-nota" data-conta-linhas="' + M.escapar(u) +
      '"></span>' +
      '<button class="ct-bt" type="button" data-ligar-pasta="' + M.escapar(u) +
      '"><span class="txt">Ligar Outra Pasta</span><span class="circ"></span></button>' +
      '<button class="ct-bt" type="button" data-ct-fechar>' +
      '<span class="txt">Fechar</span><span class="circ"></span></button>';
  }

  /* A BUSCA NAO REDESENHA A JANELA. Na primeira versao cada tecla remontava tudo, o
     campo era recriado e o foco tinha que voltar na mao: piscava. Aqui so' o corpo da
     tabela e' repintado, e o input nunca sai do lugar. */
  function pintarLinhas(u) {
    var e = est(u);
    var alvo = document.querySelector('[data-linhas="' + u + '"]');
    if (!alvo) return;
    var lista = filtrar(u);
    alvo.innerHTML = lista.map(linha).join('');
    var vazio = document.querySelector('[data-vazio="' + u + '"]');
    if (vazio) vazio.hidden = !!lista.length;
    var conta = document.querySelector('[data-conta-linhas="' + u + '"]');
    if (conta) {
      conta.textContent = lista.length +
        (lista.length === 1 ? ' mídia nesta lista' : ' mídias nesta lista') +
        (e.filtro === 'tudo' && !e.busca ? '' : ' de ' + M.midiasDe(u).length);
    }
    M.ligarTudo(alvo);
  }

  function filtrar(u) {
    var e = est(u);
    var lista = M.midiasDe(u);
    if (e.filtro !== 'tudo') {
      lista = lista.filter(function (m) { return m.estado === e.filtro; });
    }
    if (e.busca) {
      var q = e.busca.toLowerCase();
      lista = lista.filter(function (m) {
        return (m.nome + ' ' + (m.legenda || '')).toLowerCase().indexOf(q) >= 0;
      });
    }
    var ordem = { publicado: 0, programado: 1, guardado: 2 };
    return lista.slice().sort(function (a, b) {
      var x = a[e.campo], y = b[e.campo];
      if (e.campo === 'estado') { x = ordem[x]; y = ordem[y]; }
      if (e.campo === 'quando') { x = x ? new Date(x) : null; y = y ? new Date(y) : null; }
      /* SEM VALOR VAI PARA O FIM SEMPRE, e nao inverte junto: guardado nao tem data
         nem resultado, e deixar ele subir ao inverter escondia o que interessa. */
      if (x == null && y == null) return a.nome.localeCompare(b.nome);
      if (x == null) return 1;
      if (y == null) return -1;
      if (typeof x === 'string') {
        return e.desc ? y.localeCompare(x) : x.localeCompare(y);
      }
      return e.desc ? y - x : x - y;
    });
  }

  function linha(m) {
    var pin = m.estado === 'publicado'
      ? '<span class="mid-pin foi"><i></i>Foi Ao Ar</span>'
      : (m.estado === 'programado'
        ? '<span class="mid-pin marcado"><i></i>Marcado</span>'
        : '<span class="mid-pin guardado"><i></i>Guardado</span>');

    return '<tr data-mid="' + M.escapar(m.id) + '">' +
      '<td class="lt-mini"><span class="mid-capa p">' +
        '<img src="' + M.capa(m.capa) + '" alt=""></span></td>' +
      '<td class="lt-nome"><b>' + M.escapar(m.nome) + '</b>' +
        (m.legenda ? '<span>' + M.escapar(M.pedaco(m.legenda, 62)) + '</span>' : '') +
      '</td>' +
      '<td class="lt-estado">' + pin +
        (m.exemplo ? '<i class="mid-ex" title="Exemplo"></i>' : '') + '</td>' +
      '<td class="lt-quando">' + (m.quando
        ? '<b>' + M.dia(m.quando) + '</b><span>' + M.hora(m.quando) + '</span>'
        : '<span class="lt-tr">—</span>') + '</td>' +
      '<td class="lt-mb"><b>' + M.mb(m.mb) + '</b><span>' + M.seg(m.dur) +
        '</span></td>' +
      '<td class="lt-vis">' + (m.estado === 'publicado'
        ? '<b>' + M.n(m.vis) + '</b><span>Visualizações</span>'
        : '<span class="lt-tr">—</span>') + '</td>' +
      '<td class="lt-ac">' + M.acoes(m) + '</td>' +
    '</tr>';
  }

  /* -------------------------------------------------------------- eventos */
  document.addEventListener('click', function (e) {
    var f = e.target.closest('[data-filtro] button');
    if (f) {
      var u = f.closest('[data-filtro]').dataset.filtro;
      est(u).filtro = f.dataset.f;
      f.parentNode.querySelectorAll('button').forEach(function (b) {
        b.classList.toggle('on', b === f);
      });
      pintarLinhas(u);
      return;
    }
    var th = e.target.closest('th[data-ord]');
    if (th) {
      var uu = th.closest('table').querySelector('[data-linhas]').dataset.linhas;
      var s = est(uu);
      if (s.campo === th.dataset.ord) { s.desc = !s.desc; }
      else { s.campo = th.dataset.ord; s.desc = true; }
      th.closest('tr').querySelectorAll('th[data-ord]').forEach(function (x) {
        x.classList.toggle('on', x === th);
        x.querySelector('.lt-seta').classList.toggle('sobe', x === th && !s.desc);
      });
      pintarLinhas(uu);
    }
  });

  document.addEventListener('input', function (e) {
    var b = e.target.closest('[data-busca]');
    if (!b) return;
    est(b.dataset.busca).busca = b.value;
    pintarLinhas(b.dataset.busca);
  });
})();
