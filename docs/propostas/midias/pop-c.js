/* =================================================== POP-UP C: O ARQUIVO

   A DECISAO DESTA PROPOSTA: parar de tratar isto como aviso e tratar como tela. A
   janela ocupa quase o monitor inteiro, com barra lateral de filtros a esquerda,
   grade agrupada POR MES no meio, e o detalhe entrando pela direita num painel que
   desliza, que e' a peca que ele aprovou na aba de Analytics em 09/09.

   POR QUE ELA EXISTE: e' a unica que aguenta a rede crescer. Com trinta contas e mil
   arquivos, lista e grade pequena viram rolagem infinita; agrupar por mes da' chao, e
   a barra lateral deixa o filtro sempre a vista, sem competir com o conteudo.

   O QUE ELA CUSTA: e' a mais pesada de todas. Ela cobre a ficha da conta por
   inteiro, entao voce sai do contexto em que estava.
   ========================================================================== */
(function () {
  var M = window.MID;
  var estado = {};

  var FILTROS = [
    { v: 'tudo', r: 'Tudo' },
    { v: 'publicado', r: 'Foram Ao Ar' },
    { v: 'programado', r: 'Marcados' },
    { v: 'guardado', r: 'Guardados' }
  ];
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho',
               'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  function est(u) {
    if (!estado[u]) estado[u] = { filtro: 'tudo', busca: '', aberto: null };
    return estado[u];
  }

  window.ABRIR_MIDIAS = function (u) {
    var c = window.CT_JANELA.contaDe(u);
    M.abrirGrande(window.CT_JANELA.cabConta(c, 'Mídias desta conta'),
      corpo(u), rodape(u));
    document.getElementById('ct-jan').classList.add('inteira');
    pintarGrade(u);
  };

  function corpo(u) {
    var e = est(u);
    var t = M.contas(u);
    var f = M.folego(u);
    var pasta = M.pastaDe(u);
    return '' +
      '<div class="ar">' +
        '<nav class="ar-lado">' +
          '<div class="ar-pasta">' +
            '<span class="ar-rot">A Pasta Desta Conta</span>' +
            '<b>' + M.escapar(M.maiuscula(pasta.nome)) + '</b>' +
            '<button class="ar-trocar" type="button" data-ligar-pasta="' +
            M.escapar(u) + '">Trocar</button>' +
          '</div>' +
          '<div class="ar-filtros" data-filtro="' + M.escapar(u) + '">' +
            FILTROS.map(function (x) {
              var n = x.v === 'tudo' ? t.publicado + t.programado + t.guardado : t[x.v];
              return '<button type="button" data-f="' + x.v + '"' +
                (e.filtro === x.v ? ' class="on"' : '') + '>' +
                '<span>' + x.r + '</span><b>' + n + '</b></button>';
            }).join('') +
          '</div>' +
          '<div class="ar-folego">' + (f.sobra
            ? '<b>' + f.rotulo + '</b><span>De material em pé, ' + f.nota + '</span>'
            : '<b>Vazia</b><span>Sem material em pé</span>') + '</div>' +
        '</nav>' +

        '<div class="ar-meio">' +
          '<div class="ar-topo">' +
            '<label class="ct-busca ar-busca">' +
              '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/>' +
              '<path d="M20 20l-3.5-3.5"/></svg>' +
              '<input type="text" placeholder="Buscar pelo nome ou pela legenda" ' +
              'data-busca="' + M.escapar(u) + '" autocomplete="off" ' +
              'spellcheck="false">' +
            '</label>' +
            '<span class="ar-conta" data-conta-linhas="' + M.escapar(u) + '"></span>' +
          '</div>' +
          '<div class="ar-corpo mid-rolo" data-grade="' + M.escapar(u) + '"></div>' +
        '</div>' +

        '<aside class="ar-peek" data-peek="' + M.escapar(u) + '"></aside>' +
      '</div>';
  }

  function rodape(u) {
    return '<span class="ct-jan-nota">Uma pasta pertence a um perfil só.</span>' +
      '<button class="ct-bt" type="button" data-ct-fechar>' +
      '<span class="txt">Fechar</span><span class="circ"></span></button>';
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
    return lista.slice().sort(function (a, b) {
      if (!a.quando && !b.quando) return a.nome.localeCompare(b.nome);
      if (!a.quando) return 1;
      if (!b.quando) return -1;
      return new Date(b.quando) - new Date(a.quando);
    });
  }

  /* AGRUPAR POR MES E' O QUE DA' CHAO A UMA GRADE GRANDE. Sem cabecalho, cem capas
     viram um tapete sem referencia; com ele, a rolagem tem marco. O que nunca saiu
     nao tem mes, e cai num grupo proprio no fim. */
  function grupos(lista) {
    var fora = [], mapa = {}, ordem = [];
    lista.forEach(function (m) {
      if (!m.quando) { fora.push(m); return; }
      var d = M.data(m.quando);
      var chave = d.getFullYear() + '-' + d.getMonth();
      if (!mapa[chave]) { mapa[chave] = []; ordem.push(chave); }
      mapa[chave].push(m);
    });
    var saida = ordem.map(function (k) {
      var p = k.split('-');
      return { titulo: MESES[Number(p[1])] + ' De ' + p[0], itens: mapa[k] };
    });
    if (fora.length) saida.push({ titulo: 'Sem Data, Nunca Usados', itens: fora });
    return saida;
  }

  function pintarGrade(u) {
    var alvo = document.querySelector('[data-grade="' + u + '"]');
    if (!alvo) return;
    var lista = filtrar(u);
    alvo.innerHTML = lista.length
      ? grupos(lista).map(function (g) {
        return '<section class="ar-grupo">' +
          '<h4>' + g.titulo + '<span>' + g.itens.length + '</span></h4>' +
          '<div class="ar-grade">' + g.itens.map(quadro).join('') + '</div>' +
        '</section>';
      }).join('')
      : '<div class="ar-vazio">Nada aqui com esse filtro.</div>';

    var conta = document.querySelector('[data-conta-linhas="' + u + '"]');
    if (conta) {
      conta.textContent = lista.length + (lista.length === 1 ? ' mídia' : ' mídias') +
        ' de ' + M.midiasDe(u).length;
    }
    M.ligarTudo(alvo);
  }

  /* O QUADRO E' UM `div`, e nao um `button`.

     Ele carrega DOIS destinos: o corpo abre o painel do video, e a logo do Drive
     abre a pasta numa aba nova. Endereco dentro de botao e' HTML invalido, e o
     navegador desmonta a marcacao; por isso o botao cobre o quadro e o endereco fica
     por cima dele. */
  function quadro(m) {
    var pe = m.estado === 'publicado'
      ? '<b>' + M.curto(m.vis) + '</b><span>Visualizações</span>'
      : (m.estado === 'programado'
        ? '<b>' + M.hora(m.quando) + '</b><span>' + M.dia(m.quando) + '</span>'
        : '<b>' + M.mb(m.mb) + '</b><span>Sem uso</span>');
    return '<div class="ar-q" data-mid="' + M.escapar(m.id) + '">' +
      '<button type="button" class="ar-q-face" data-abrir-peek="' + M.escapar(m.id) +
        '">' +
        '<span class="mid-capa ar-capa"><img src="' + M.capa(m.capa) + '" alt="">' +
          '<span class="dur">' + M.seg(m.dur) + '</span>' +
          '<span class="ar-e ' + m.estado + '"></span></span>' +
        '<span class="ar-q-pe">' + pe + '</span>' +
      '</button>' +
      M.botaoDrive(m, 'ar-drive') +
    '</div>';
  }

  /* --------------------------------------------------------- o painel lateral */
  function abrirPeek(u, id) {
    var alvo = document.querySelector('[data-peek="' + u + '"]');
    var m = M.midiasDe(u).filter(function (x) { return x.id === id; })[0];
    if (!alvo || !m) return;
    est(u).aberto = id;
    var pin = m.estado === 'publicado'
      ? '<span class="mid-pin foi"><i></i>Foi Ao Ar</span>'
      : (m.estado === 'programado'
        ? '<span class="mid-pin marcado"><i></i>Marcado</span>'
        : '<span class="mid-pin guardado"><i></i>Guardado</span>');

    alvo.innerHTML =
      '<div class="ar-peek-cab">' +
        '<button class="ar-peek-x" type="button" data-fechar-peek aria-label="Fechar">' +
          '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
        '<div class="ar-peek-setas">' +
          '<button type="button" data-andar="-1" aria-label="Anterior">' +
            '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>' +
          '<button type="button" data-andar="1" aria-label="Próximo">' +
            '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>' +
        '</div>' +
      '</div>' +
      '<div class="ar-peek-corpo mid-rolo">' +
        '<div class="ar-peek-capa"><img src="' + M.capa(m.capa) + '" alt="">' +
          '<span class="bc-dur">' + M.seg(m.dur) + '</span></div>' +
        '<div class="ar-peek-quem">' + pin +
          (m.exemplo ? '<span class="bc-selo"><i class="mid-ex"></i>Exemplo</span>'
                     : '') + '</div>' +
        '<h4 class="bc-nome">' + M.escapar(m.nome) + '</h4>' +
        (m.legenda ? '<p class="bc-leg">' + M.escapar(m.legenda) + '</p>'
                   : '<p class="bc-leg vazia">Sem legenda escrita.</p>') +
        '<div class="bc-pares">' +
          par('Pasta', M.maiuscula(m.pasta)) +
          par('Peso', M.mb(m.mb)) +
          par('Duração', M.seg(m.dur)) +
          (m.quando ? par(m.estado === 'publicado' ? 'Saiu' : 'Sai',
                          M.dia(m.quando) + ' · ' + M.hora(m.quando)) : '') +
        '</div>' +
        (m.estado === 'publicado'
          ? '<div class="bc-nums">' +
              bcNum('Visualizações', M.n(m.vis)) +
              bcNum('Alcance', M.n(m.alc)) +
              bcNum('Interações', M.n(m.inter)) +
            '</div>' : '') +
        '<div class="bc-acoes">' + M.acoes(m) + '</div>' +
      '</div>';
    /* A GRADE RECUA em vez de ficar por baixo: o painel cobria a ultima coluna de
       capas, e clicar num item escondia o vizinho que voce ia clicar depois. Quem
       abre e' a coluna do grid, no `.ar`; o `on` serve so' para a tela saber que ha'
       um painel aberto. */
    alvo.closest('.ar').classList.add('com-peek');
    alvo.classList.add('on');
    document.querySelectorAll('.ar-q').forEach(function (q) {
      q.classList.toggle('on', q.dataset.mid === id);
    });
  }

  function fecharPeek(u) {
    var alvo = document.querySelector('[data-peek="' + u + '"]');
    if (!alvo) return;
    alvo.classList.remove('on');
    alvo.closest('.ar').classList.remove('com-peek');
    est(u).aberto = null;
    document.querySelectorAll('.ar-q.on').forEach(function (q) {
      q.classList.remove('on');
    });
  }

  function andar(u, passo) {
    var lista = filtrar(u);
    var i = lista.map(function (m) { return m.id; }).indexOf(est(u).aberto);
    var novo = lista[i + passo];
    if (!novo) return;
    abrirPeek(u, novo.id);
    var q = document.querySelector('[data-abrir-peek="' + novo.id + '"]');
    if (q) q.scrollIntoView({ block: 'nearest' });
  }

  function par(rot, valor) {
    return '<div class="bc-par"><span>' + rot + '</span><b>' + M.escapar(valor) +
      '</b></div>';
  }
  function bcNum(rot, valor) {
    return '<div class="bc-num"><b>' + valor + '</b><span>' + rot + '</span></div>';
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
      pintarGrade(u);
      return;
    }
    var q = e.target.closest('[data-abrir-peek]');
    if (q) {
      abrirPeek(q.closest('.ar').querySelector('[data-peek]').dataset.peek,
                q.dataset.abrirPeek);
      return;
    }
    var x = e.target.closest('[data-fechar-peek]');
    if (x) {
      fecharPeek(x.closest('[data-peek]').dataset.peek);
      return;
    }
    var a = e.target.closest('[data-andar]');
    if (a) andar(a.closest('[data-peek]').dataset.peek, Number(a.dataset.andar));
  });

  document.addEventListener('input', function (e) {
    var b = e.target.closest('[data-busca]');
    if (!b) return;
    est(b.dataset.busca).busca = b.value;
    pintarGrade(b.dataset.busca);
  });

  document.addEventListener('keydown', function (e) {
    var peek = document.querySelector('[data-peek].on');
    if (!peek) return;
    if (e.key === 'Escape') { fecharPeek(peek.dataset.peek); return; }
    if (e.target.closest('input')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); andar(peek.dataset.peek, 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); andar(peek.dataset.peek, -1); }
  });
})();
