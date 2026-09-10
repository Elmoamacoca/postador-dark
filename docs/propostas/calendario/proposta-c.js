/* ====================================================== PROPOSTA C: A FILA

   A DECISAO DESTA PROPOSTA: o calendario nao e' um quadro, e' uma FILA. As saidas
   descem em ordem de tempo, agrupadas por dia, com o risco de HOJE no meio; a
   esquerda, uma barra lateral com o mes em miniatura para saltar e os filtros.

   E' o mesmo desenho da sub-aba Midias que ele aprovou hoje: barra lateral estreita,
   corpo agrupado com cabecalho fixo, e o painel do dia entrando pela direita.

   POR QUE ELA EXISTE: e' a unica das tres em que a informacao de cada saida cabe
   inteira: hora, capa, conta, nome do arquivo e resultado, sem abrir nada. Para
   conferir a agenda de amanha antes de dormir, e' a mais rapida.

   O QUE ELA CUSTA: perde a nocao de forma do mes. Buraco de tres dias aparece como
   ausencia de bloco, e nao como espaco em branco no lugar onde deveria haver algo.
   ========================================================================== */
(function () {
  var C = window.CAL;
  var mes = new Date(C.HOJE.getFullYear(), C.HOJE.getMonth(), 1);
  var filtro = 'tudo';

  var FILTROS = [
    { v: 'tudo', r: 'Tudo' },
    { v: 'programado', r: 'O Que Vem' },
    { v: 'publicado', r: 'O Que Saiu' }
  ];

  window.CAL_PINTAR = pintar;

  function pintar() {
    var u = C.escolhida();
    var r = C.resumo(u);
    var palco = document.getElementById('cal-palco');

    palco.innerHTML =
      '<div class="fl">' +
        '<aside class="fl-lado">' +
          C.seletor() +
          '<div class="fl-filtros">' +
            FILTROS.map(function (f) {
              var q = f.v === 'tudo' ? r.saiu + r.vem
                : (f.v === 'programado' ? r.vem : r.saiu);
              return '<button type="button" data-f="' + f.v + '"' +
                (filtro === f.v ? ' class="on"' : '') + '><span>' + f.r +
                '</span><b>' + q + '</b></button>';
            }).join('') +
          '</div>' +
          miniMes(u) +
          '<div class="fl-buraco' + (r.vazios ? ' mau' : '') + '">' +
            '<b>' + r.vazios + '</b><span>' +
            (r.vazios ? 'Dias vazios nos próximos 14. O primeiro é ' +
                        C.dia(C.chaveDia(r.primeiroVazio)) + '.'
                      : 'Nenhum dia vazio nos próximos 14.') + '</span></div>' +
        '</aside>' +
        '<div class="fl-meio">' + corpo(u) + '</div>' +
      '</div>';

    var alvo = palco.querySelector('.fl-hoje');
    var rolo = palco.querySelector('.fl-corpo');
    if (alvo && rolo) rolo.scrollTop = Math.max(alvo.offsetTop - 90, 0);
  }

  function miniMes(u) {
    var mapa = C.porDia(u);
    var primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    var comeco = new Date(primeiro);
    comeco.setDate(1 - primeiro.getDay());
    var celulas = [];
    for (var i = 0; i < 42; i++) {
      var d = new Date(comeco.getFullYear(), comeco.getMonth(), comeco.getDate() + i);
      var lista = mapa[C.chaveDia(d)] || [];
      var vem = lista.some(function (s) { return s.estado === 'programado'; });
      celulas.push('<button type="button" class="fl-mini-d' +
        (d.getMonth() !== mes.getMonth() ? ' fora' : '') +
        (C.mesmoDia(d, C.HOJE) ? ' hoje' : '') +
        (lista.length ? (vem ? ' vem' : ' saiu') : '') +
        '" data-saltar="' + C.chaveDia(d) + '">' + d.getDate() + '</button>');
    }
    return '<div class="fl-mini">' +
      '<div class="fl-mini-cab">' +
        '<button type="button" data-mes="-1" aria-label="Mês anterior">' +
          '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>' +
        '<b>' + C.MES[mes.getMonth()] + ' ' + mes.getFullYear() + '</b>' +
        '<button type="button" data-mes="1" aria-label="Próximo mês">' +
          '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>' +
      '</div>' +
      '<div class="fl-mini-dias">' +
        C.DIAS.map(function (x) { return '<span>' + x[0] + '</span>'; }).join('') +
      '</div>' +
      '<div class="fl-mini-grade">' + celulas.join('') + '</div>' +
    '</div>';
  }

  function corpo(u) {
    var lista = C.saidasDe(u).filter(function (s) {
      return filtro === 'tudo' || s.estado === filtro;
    }).slice().sort(function (a, b) {
      return new Date(a.quando) - new Date(b.quando);
    });
    if (!lista.length) {
      return '<div class="fl-corpo"><div class="fl-vazio">Nada aqui com esse ' +
        'filtro.</div></div>';
    }

    var grupos = [], atual = null, jaMarcou = false, blocos = [];
    lista.forEach(function (s) {
      var chave = C.chaveDia(C.data(s.quando));
      if (chave !== atual) { atual = chave; grupos.push({ chave: chave, itens: [] }); }
      grupos[grupos.length - 1].itens.push(s);
    });

    grupos.forEach(function (g) {
      var d = C.data(g.chave);
      var futuro = d > C.HOJE;
      /* O RISCO DE HOJE entra ANTES do primeiro grupo futuro. E' o unico jeito de a
         fila dizer onde acaba o historico e comeca a agenda. */
      if (futuro && !jaMarcou) {
        jaMarcou = true;
        /* SO' "HOJE", SEM HORA. `toISOString` converte para UTC e o risco marcava
           15h00 num relogio que dizia 12h00: numero errado na tela e' pior que
           numero ausente. */
        blocos.push('<div class="fl-hoje"><i></i><span>Hoje</span><i></i></div>');
      }
      blocos.push(
        '<section class="fl-grupo">' +
          '<h4 data-dia="' + g.chave + '">' +
            '<b>' + d.getDate() + ' ' + C.MES3[d.getMonth()] + '</b>' +
            '<span>' + C.DIAS[d.getDay()] + '</span>' +
            '<em>' + g.itens.length +
            (g.itens.length === 1 ? ' saída' : ' saídas') + '</em>' +
          '</h4>' +
          g.itens.map(C.linhaDoDia).join('') +
        '</section>');
    });
    if (!jaMarcou) {
      blocos.push('<div class="fl-hoje"><i></i><span>Hoje</span><i></i></div>');
    }
    return '<div class="fl-corpo mid-rolo">' + blocos.join('') + '</div>';
  }

  document.addEventListener('click', function (e) {
    var f = e.target.closest('[data-f]');
    if (f) { filtro = f.dataset.f; pintar(); return; }
    var m = e.target.closest('[data-mes]');
    if (m) {
      mes = new Date(mes.getFullYear(), mes.getMonth() + Number(m.dataset.mes), 1);
      pintar();
      return;
    }
    var salto = e.target.closest('[data-saltar]');
    if (salto) {
      var alvo = document.querySelector('h4[data-dia="' + salto.dataset.saltar + '"]');
      if (alvo) alvo.scrollIntoView({ block: 'start', behavior: 'smooth' });
      else C.torrada('Nada marcado neste dia.');
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    C.ligarCasca();
    pintar();
  });
})();
