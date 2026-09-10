/* ==================================================== POP-UP B: A BANCADA

   A DECISAO DESTA PROPOSTA: a janela se divide em duas. A esquerda e' a grade de
   capas, para escolher pelo que se ve; a direita e' a bancada, onde o video
   selecionado abre por inteiro, com capa grande, legenda, numeros e as acoes.

   POR QUE ELA EXISTE: e' a unica em que voce ve o item ESCOLHIDO sem perder a lista
   de vista. Na janela antiga, ver um video de perto exigia sair da lista; aqui os
   dois convivem, e a seta do teclado anda de um para o outro.

   O QUE ELA CUSTA: a grade fica com 340 pixels a menos, entao mostra menos capas por
   tela do que uma grade que ocupasse a janela inteira.
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

  function est(u) {
    if (!estado[u]) estado[u] = { filtro: 'tudo', busca: '', escolhido: null };
    return estado[u];
  }

  window.ABRIR_MIDIAS = function (u) {
    var c = window.CT_JANELA.contaDe(u);
    var lista = filtrar(u);
    est(u).escolhido = lista.length ? lista[0].id : null;
    M.abrirGrande(window.CT_JANELA.cabConta(c, 'Mídias desta conta'),
      corpo(u), rodape(u));
    pintarGrade(u);
  };

  function corpo(u) {
    var e = est(u);
    var t = M.contas(u);
    return '' +
      '<div class="bc">' +
        '<div class="bc-esq">' +
          '<div class="bc-barra">' +
            '<div class="ct-seg" data-filtro="' + M.escapar(u) + '">' +
              ABAS.map(function (a) {
                var n = a.v === 'tudo'
                  ? t.publicado + t.programado + t.guardado : t[a.v];
                return '<button type="button" data-f="' + a.v + '"' +
                  (e.filtro === a.v ? ' class="on"' : '') + '>' + a.r +
                  '<span class="n">' + n + '</span></button>';
              }).join('') +
            '</div>' +
            '<label class="ct-busca bc-busca">' +
              '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/>' +
              '<path d="M20 20l-3.5-3.5"/></svg>' +
              '<input type="text" placeholder="Buscar" data-busca="' + M.escapar(u) +
              '" autocomplete="off" spellcheck="false">' +
            '</label>' +
          '</div>' +
          '<div class="bc-grade mid-rolo" data-grade="' + M.escapar(u) + '"></div>' +
        '</div>' +
        '<aside class="bc-dir mid-rolo" data-bancada="' + M.escapar(u) + '"></aside>' +
      '</div>';
  }

  function rodape(u) {
    return '<span class="ct-jan-nota" data-conta-linhas="' + M.escapar(u) + '"></span>' +
      '<button class="ct-bt" type="button" data-ligar-pasta="' + M.escapar(u) +
      '"><span class="txt">Ligar Outra Pasta</span><span class="circ"></span></button>' +
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

  function pintarGrade(u) {
    var e = est(u);
    var alvo = document.querySelector('[data-grade="' + u + '"]');
    if (!alvo) return;
    var lista = filtrar(u);
    if (!lista.filter(function (m) { return m.id === e.escolhido; }).length) {
      e.escolhido = lista.length ? lista[0].id : null;
    }
    alvo.innerHTML = lista.length
      ? lista.map(function (m) {
        return '<button type="button" class="bc-q' +
          (m.id === e.escolhido ? ' on' : '') + '" data-escolher="' +
          M.escapar(m.id) + '" data-mid="' + M.escapar(m.id) + '">' +
          '<span class="mid-capa bc-capa"><img src="' + M.capa(m.capa) + '" alt="">' +
          '<span class="dur">' + M.seg(m.dur) + '</span></span>' +
          '<span class="bc-q-n">' + M.escapar(M.pedaco(m.nome, 15)) + '</span>' +
          '<span class="bc-q-e ' + m.estado + '"></span>' +
        '</button>';
      }).join('')
      : '<div class="bc-vazio">Nada aqui com esse filtro.</div>';

    var conta = document.querySelector('[data-conta-linhas="' + u + '"]');
    if (conta) {
      conta.textContent = lista.length + (lista.length === 1 ? ' mídia' : ' mídias') +
        (e.filtro === 'tudo' && !e.busca ? '' : ' de ' + M.midiasDe(u).length);
    }
    M.ligarTudo(alvo);
    pintarBancada(u);
  }

  function pintarBancada(u) {
    var e = est(u);
    var alvo = document.querySelector('[data-bancada="' + u + '"]');
    if (!alvo) return;
    var m = M.midiasDe(u).filter(function (x) { return x.id === e.escolhido; })[0];
    if (!m) {
      alvo.innerHTML = '<div class="bc-nada">Escolha um vídeo na grade.</div>';
      return;
    }
    var pin = m.estado === 'publicado'
      ? '<span class="mid-pin foi"><i></i>Foi Ao Ar</span>'
      : (m.estado === 'programado'
        ? '<span class="mid-pin marcado"><i></i>Marcado</span>'
        : '<span class="mid-pin guardado"><i></i>Guardado</span>');

    alvo.innerHTML =
      '<div class="bc-capa-g"><img src="' + M.capa(m.capa) + '" alt="">' +
        '<span class="bc-dur">' + M.seg(m.dur) + '</span></div>' +
      '<div class="bc-quem">' + pin +
        (m.exemplo ? '<span class="bc-selo"><i class="mid-ex"></i>Exemplo</span>' : '') +
      '</div>' +
      '<h4 class="bc-nome">' + M.escapar(m.nome) + '</h4>' +
      (m.legenda ? '<p class="bc-leg">' + M.escapar(m.legenda) + '</p>'
                 : '<p class="bc-leg vazia">Sem legenda escrita.</p>') +
      '<div class="bc-pares">' +
        par('Leva', M.maiuscula(m.leva)) +
        par('Pasta Do Vídeo', m.pasta, true) +
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
          '</div>'
        : '') +
      '<div class="bc-acoes">' + M.acoes(m) + '</div>';
  }

  function par(rot, valor, quebra) {
    return '<div class="bc-par' + (quebra ? ' quebra' : '') + '"><span>' + rot +
      '</span><b>' + M.escapar(valor) + '</b></div>';
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
    var q = e.target.closest('[data-escolher]');
    if (q) {
      var uu = q.closest('[data-grade]').dataset.grade;
      est(uu).escolhido = q.dataset.escolher;
      q.parentNode.querySelectorAll('.bc-q').forEach(function (x) {
        x.classList.toggle('on', x === q);
      });
      pintarBancada(uu);
    }
  });

  document.addEventListener('input', function (e) {
    var b = e.target.closest('[data-busca]');
    if (b) pintarGrade(b.dataset.busca);
    if (b) est(b.dataset.busca).busca = b.value;
  });

  /* AS SETAS ANDAM NA GRADE. Escolher com o mouse e depois comparar dois videos e' o
     uso real desta tela, e nele a mao nao devia sair do teclado. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var grade = document.querySelector('[data-grade]');
    if (!grade || document.getElementById('ct-jan').hidden) return;
    if (e.target.closest('input')) return;
    var u = grade.dataset.grade;
    var lista = filtrar(u);
    var i = lista.map(function (m) { return m.id; }).indexOf(est(u).escolhido);
    var novo = lista[i + (e.key === 'ArrowRight' ? 1 : -1)];
    if (!novo) return;
    e.preventDefault();
    est(u).escolhido = novo.id;
    grade.querySelectorAll('.bc-q').forEach(function (x) {
      x.classList.toggle('on', x.dataset.escolher === novo.id);
    });
    var alvo = grade.querySelector('.bc-q.on');
    if (alvo) alvo.scrollIntoView({ block: 'nearest' });
    pintarBancada(u);
  });
})();
