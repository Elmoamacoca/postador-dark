/* ==================================================== PROPOSTA A: A AGENDA

   A DECISAO DESTA PROPOSTA: continuar sendo um mes, porque mes e' como se pensa
   agenda, mas um mes DE UMA CONTA e com cara de conteudo. Cada dia mostra as
   miniaturas do que sai, e nao um texto; o dia vazio diz que esta' vazio; e clicar
   num dia abre o painel lateral com as saidas daquele dia, hora a hora.

   POR QUE ELA EXISTE: e' a mudanca mais curta partindo do que ja' esta' no ar. A
   grade do mes ja' existe no painel; o que muda e' o seletor no topo, a capa dentro
   do dia e o painel lateral.

   O QUE ELA CUSTA: mes so' cabe um mes. Para ver o ritmo de tres semanas atras e a
   proxima ao mesmo tempo, ela obriga a virar a pagina.
   ========================================================================== */
(function () {
  var C = window.CAL;
  var mes = new Date(C.HOJE.getFullYear(), C.HOJE.getMonth(), 1);

  window.CAL_PINTAR = pintar;

  function pintar() {
    var u = C.escolhida();
    var r = C.resumo(u);
    var palco = document.getElementById('cal-palco');

    palco.innerHTML =
      '<div class="ag-topo">' +
        C.seletor() +
        '<div class="ag-nums">' +
          num(r.saiu, 'Já Saíram') +
          num(r.vem, 'Marcados', 'vem') +
          num(r.vazios, 'Dias Vazios Nos Próximos 14', r.vazios ? 'mau' : '') +
        '</div>' +
      '</div>' +

      '<div class="caixa solta ag-caixa">' +
        '<div class="ag-barra">' +
          '<button class="bt mini" type="button" data-ir="hoje">Hoje</button>' +
          '<button class="ag-seta" type="button" data-ir="-1" aria-label="Mês anterior">' +
            '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>' +
          '<button class="ag-seta" type="button" data-ir="1" aria-label="Próximo mês">' +
            '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>' +
          '<b class="ag-titulo">' + C.MES[mes.getMonth()] + ' De ' +
            mes.getFullYear() + '</b>' +
          '<div class="cl-legenda">' +
            '<span class="cl-lg"><i style="background:var(--soft)"></i>Já Saiu</span>' +
            '<span class="cl-lg"><i style="background:var(--accent)"></i>Marcado</span>' +
            '<span class="cl-lg tracado"><i></i>Dia Vazio</span>' +
          '</div>' +
        '</div>' +
        grade(u) +
      '</div>';
  }

  function num(valor, rot, tom) {
    return '<div class="ag-n' + (tom ? ' ' + tom : '') + '"><b>' + valor + '</b>' +
      '<span>' + rot + '</span></div>';
  }

  function grade(u) {
    var mapa = C.porDia(u);
    var primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    var comeco = new Date(primeiro);
    comeco.setDate(1 - primeiro.getDay());          /* comeca no domingo */
    var celulas = [];
    for (var i = 0; i < 42; i++) {
      var d = new Date(comeco.getFullYear(), comeco.getMonth(), comeco.getDate() + i);
      celulas.push(celula(d, mapa[C.chaveDia(d)] || []));
    }
    return '<div class="ag-dias">' +
        C.DIAS.map(function (x) { return '<span>' + x + '</span>'; }).join('') +
      '</div><div class="ag-grade">' + celulas.join('') + '</div>';
  }

  function celula(d, lista) {
    var deFora = d.getMonth() !== mes.getMonth();
    var hoje = C.mesmoDia(d, C.HOJE);
    var futuro = d > C.HOJE;
    var vem = lista.filter(function (s) { return s.estado === 'programado'; }).length;
    /* O VAZIO SO' E' AVISO NO FUTURO. Dia passado sem post e' historia; dia futuro sem
       post e' conta que vai parar, e e' isso que a tela precisa gritar. */
    var vazioQueImporta = futuro && !lista.length && !deFora;

    return '<button type="button" class="ag-cel' + (deFora ? ' fora' : '') +
      (hoje ? ' hoje' : '') + (vazioQueImporta ? ' vazio' : '') +
      '" data-dia="' + C.chaveDia(d) + '">' +
      '<span class="ag-num">' + d.getDate() + (hoje ? '<i>Hoje</i>' : '') + '</span>' +
      (lista.length
        ? '<span class="ag-capas">' +
            lista.slice(0, 3).map(function (s) {
              return '<span class="ag-capa' +
                (s.estado === 'programado' ? ' vem' : '') + '">' +
                (s.capa != null ? '<img src="' + C.capa(s.capa) + '" alt="">' : '') +
                '<em>' + C.hora(s.quando).replace('h', ':') + '</em></span>';
            }).join('') +
            (lista.length > 3 ? '<span class="ag-mais">+' + (lista.length - 3) +
              '</span>' : '') +
          '</span>' +
          (vem ? '<span class="ag-pe vem">' + vem + ' Marcados</span>'
               : '<span class="ag-pe">' + lista.length + ' Saíram</span>')
        : (vazioQueImporta ? '<span class="ag-vazio">Sem Nada</span>' : '')) +
    '</button>';
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ir]');
    if (!b) return;
    if (b.dataset.ir === 'hoje') {
      mes = new Date(C.HOJE.getFullYear(), C.HOJE.getMonth(), 1);
    } else {
      mes = new Date(mes.getFullYear(), mes.getMonth() + Number(b.dataset.ir), 1);
    }
    pintar();
  });

  document.addEventListener('DOMContentLoaded', function () {
    C.ligarCasca();
    pintar();
  });
})();
