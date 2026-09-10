/* ===================================================== PROPOSTA B: A GAVETA

   A DECISAO DESTA PROPOSTA: o cartao da conta nao vira lista. Ele mostra so' o
   veredito em tres numeros e a barra de folego, e o material inteiro vive numa
   JANELA LARGA, que e' a janela que a aba de Contas ja' usa para testar conexao.

   POR QUE ELA EXISTE: a ficha continua limpa e comparavel entre as contas, que e' o
   que uma aba de Contas serve para fazer. E quando voce quer mesmo mexer no material,
   ganha a tela inteira: grade de capas, busca, filtro e paginacao, sem o aperto dos
   398 pixels do cartao.

   O QUE ELA CUSTA: um clique a mais para ver o material, e uma janela a manter.

   DE ONDE VEM CADA PECA:
     .ct-jan.larga    a janela de 680, ja' usada em Testar Conexao
     .ct-seg          o segmentado
     .ct-busca        a busca da barra de filtros da aba
     .mid-capa        a miniatura 9x16 da aba de Analytics
     .tab / paginacao  o rodape de paginas, da tabela de Analytics
   ========================================================================== */
(function () {
  var M = window.MID;
  var estado = {};   /* filtro, busca e pagina, por conta */
  var POR_PAGINA = 12;

  var GAVETAS = [
    { v: 'tudo', r: 'Tudo' },
    { v: 'publicado', r: 'Foram Ao Ar' },
    { v: 'programado', r: 'Marcados' },
    { v: 'guardado', r: 'Guardados' }
  ];

  function est(u) {
    if (!estado[u]) estado[u] = { filtro: 'tudo', busca: '', pagina: 1 };
    return estado[u];
  }

  window.CONTA_MIDIAS = function () { return ''; };

  /* ------------------------------------------------------------- o cartao */
  window.CORPO_MIDIAS = function (c) {
    var u = c.arroba;
    var t = M.contas(u);
    var f = M.folego(u);
    var pasta = M.pastaDe(u);
    var total = t.publicado + t.programado + t.guardado;
    var usado = t.publicado + t.programado;
    var quanto = total ? Math.round(usado / total * 100) : 0;

    return '' +
      '<div class="gv-nums">' +
        num('Foram Ao Ar', t.publicado, 'foi') +
        num('Marcados', t.programado, 'marcado') +
        num('Guardados', t.guardado, '') +
      '</div>' +

      '<div class="gv-barra" title="' + quanto + '% do material desta conta já foi usado">' +
        '<i style="width:' + quanto + '%"></i></div>' +
      '<div class="gv-legenda">' +
        '<span><b>' + quanto + '%</b> Do Material Já Foi Usado</span>' +
        '<span title="' + f.nota + '">' + (f.sobra
          ? 'Resta Para <b>' + f.rotulo + '</b>'
          : 'Sem Material Em Pé') + '</span>' +
      '</div>' +

      '<div class="gv-pasta">' +
        '<span class="gv-pasta-n">' + M.escapar(M.maiuscula(pasta.nome)) + '</span>' +
        '<button class="gv-ligar" type="button" data-ligar-pasta="' + M.escapar(u) +
        '">Trocar Pasta</button>' +
      '</div>' +

      '<button class="ct-bt gv-abrir" type="button" data-abrir-midias="' +
        M.escapar(u) + '"><span class="txt">' +
        '<svg class="mrc" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.9" stroke-linecap="round"><rect x="3" y="4" width="18" ' +
        'height="16" rx="2"/><path d="M3 9h18M9 9v11"/></svg>' +
        'Abrir As ' + total + ' Mídias</span><span class="circ"></span></button>';
  };

  function num(rot, valor, tom) {
    return '<div class="gv-n' + (tom ? ' ' + tom : '') + '">' +
      '<b>' + valor + '</b><span>' + rot + '</span></div>';
  }

  /* -------------------------------------------------------------- a janela */
  function abrir(u) {
    var c = window.CT_JANELA.contaDe(u);
    window.CT_JANELA.abrir(
      window.CT_JANELA.cabConta(c, 'Mídias desta conta'),
      corpoJanela(u), pe(u), true);
  }

  function corpoJanela(u) {
    var e = est(u);
    var t = M.contas(u);
    var lista = filtrar(u);
    var paginas = Math.max(Math.ceil(lista.length / POR_PAGINA), 1);
    if (e.pagina > paginas) e.pagina = paginas;
    var fatia = lista.slice((e.pagina - 1) * POR_PAGINA, e.pagina * POR_PAGINA);

    return '<div class="gv-topo">' +
        '<div class="ct-seg" data-filtro="' + M.escapar(u) + '">' +
          GAVETAS.map(function (g) {
            var n = g.v === 'tudo'
              ? t.publicado + t.programado + t.guardado : t[g.v];
            return '<button type="button" data-f="' + g.v + '"' +
              (e.filtro === g.v ? ' class="on"' : '') + '>' + g.r +
              '<span class="n">' + n + '</span></button>';
          }).join('') +
        '</div>' +
        '<label class="ct-busca gv-busca">' +
          '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/>' +
          '<path d="M20 20l-3.5-3.5"/></svg>' +
          '<input type="text" placeholder="Buscar arquivo" data-busca="' +
          M.escapar(u) + '" value="' + M.escapar(e.busca) + '" autocomplete="off">' +
        '</label>' +
      '</div>' +

      (fatia.length
        ? '<div class="gv-grade">' + fatia.map(quadro).join('') + '</div>'
        : '<div class="gv-vazio">Nada aqui com esse filtro.</div>') +

      (paginas > 1
        ? '<div class="gv-paginas" data-pag="' + M.escapar(u) + '">' +
            '<button type="button" data-ir="' + (e.pagina - 1) + '"' +
              (e.pagina === 1 ? ' disabled' : '') + '>Anterior</button>' +
            '<span>Página <b>' + e.pagina + '</b> de <b>' + paginas + '</b> · ' +
            lista.length + ' Mídias</span>' +
            '<button type="button" data-ir="' + (e.pagina + 1) + '"' +
              (e.pagina === paginas ? ' disabled' : '') + '>Próxima</button>' +
          '</div>'
        : '<div class="gv-paginas so-conta"><span>' + lista.length +
          ' Mídias</span></div>');
  }

  function pe(u) {
    return '<button class="ct-bt" type="button" data-ligar-pasta="' + M.escapar(u) +
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
    /* SEM DATA VAI PARA O FIM: o guardado nunca saiu, entao ele nao disputa ordem
       com quem tem data. Ordenar tudo por `quando` jogaria a prateleira para cima. */
    return lista.sort(function (a, b) {
      if (!a.quando && !b.quando) return a.nome.localeCompare(b.nome);
      if (!a.quando) return 1;
      if (!b.quando) return -1;
      return new Date(b.quando) - new Date(a.quando);
    });
  }

  function quadro(m) {
    var pin = m.estado === 'publicado'
      ? '<span class="mid-pin foi"><i></i>' + M.dia(m.quando) + '</span>'
      : (m.estado === 'programado'
        ? '<span class="mid-pin marcado"><i></i>Sai ' + M.dia(m.quando) + '</span>'
        : '<span class="mid-pin guardado"><i></i>Guardado</span>');

    return '<figure class="gv-q" data-mid="' + M.escapar(m.id) + '">' +
      '<span class="mid-capa gv-capa"><img src="' + M.capa(m.capa) + '" alt="">' +
        '<span class="dur">' + M.seg(m.dur) + '</span></span>' +
      '<figcaption>' + pin +
        '<b>' + M.escapar(M.pedaco(m.legenda || m.nome, 40)) + '</b>' +
        '<span>' + M.escapar(m.nome) +
          (m.exemplo ? ' <i class="mid-ex" title="Exemplo"></i>' : '') + '</span>' +
        (m.estado === 'publicado'
          ? '<span class="gv-vis"><b>' + M.curto(m.vis) + '</b> Visualizações · <b>' +
            M.curto(m.alc) + '</b> Alcançadas</span>'
          : '<span class="gv-vis">' + M.mb(m.mb) + '</span>') +
      '</figcaption></figure>';
  }

  function repintar(u) {
    window.CT_JANELA.trocar(corpoJanela(u), pe(u));
    M.ligarTudo(document.getElementById('ct-jan-corpo'));
  }

  /* -------------------------------------------------------------- eventos */
  document.addEventListener('click', function (e) {
    var ab = e.target.closest('[data-abrir-midias]');
    if (ab) { abrir(ab.dataset.abrirMidias); return; }

    var f = e.target.closest('[data-filtro] button');
    if (f) {
      var u = f.closest('[data-filtro]').dataset.filtro;
      est(u).filtro = f.dataset.f;
      est(u).pagina = 1;
      repintar(u);
      return;
    }
    var p = e.target.closest('[data-pag] button');
    if (p && !p.disabled) {
      var uu = p.closest('[data-pag]').dataset.pag;
      est(uu).pagina = Number(p.dataset.ir);
      repintar(uu);
    }
  });

  document.addEventListener('input', function (e) {
    var b = e.target.closest('[data-busca]');
    if (!b) return;
    var u = b.dataset.busca;
    est(u).busca = b.value;
    est(u).pagina = 1;
    repintar(u);
    /* O redesenho troca o campo, entao o foco e o cursor voltam na mao. */
    var novo = document.querySelector('[data-busca="' + u + '"]');
    if (novo) { novo.focus(); novo.setSelectionRange(novo.value.length, novo.value.length); }
  });

  document.addEventListener('DOMContentLoaded', function () { M.ligarCasca(); });
})();
