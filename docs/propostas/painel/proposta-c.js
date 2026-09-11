/* ================================================== PROPOSTA C · O MOSAICO
   Bento de graficos, no molde do Stats Bento e do Advanced Stats do 21st.dev. Nove
   blocos, todos com desenho: ritmo, acervo, contas, dia da semana, hora, calor,
   funil, ranking e travas.
   ========================================================================== */
(function () {
  var P = window.PN;
  var palco = document.getElementById('pn-palco');
  var janela = 90, medida = 'views';

  /* UMA MEDIDA POR VEZ NO DESENHO. Visualizacao chega a 4 mil e publicacao a uma por
     dia: na mesma regua, a publicacao vira uma linha colada no chao. O motor escala
     pela primeira serie, entao juntar as duas tambem estoura a de cima para fora do
     quadro. O segmentado escolhe, como na aba de Analytics. */
  function pintarRitmo() {
    var alvo = document.getElementById('c-ritmo');
    var vista = medida === 'posts' ? 'barra' : 'area';
    var series = medida === 'views' ? [P.serieViews(janela)]
      : P.seriePorConta(janela, vista);
    P.motor(alvo, { tipo: vista, dominio: P.dominio(janela), series: series });
    document.getElementById('c-leg').innerHTML = series.map(function (s) {
      return '<span><i style="background:' + s.cor + '"></i>' + P.seguro(s.rot)
        + '</span>';
    }).join('');
  }

  function montar() {
    var R = P.RESUMO;
    var contas = P.CONTAS.map(function (c, i) {
      var meus = c.meus || [];
      return { rot: '@' + c.u, logo: c.avatar,
               pe: P.n(meus.length) + ' ' + P.plural(meus.length, 'publicação',
                    'publicações') + ' · ' + P.n(c.prateleira) + ' guardados',
               v: meus.reduce(function (t, p) { return t + p.views; }, 0),
               un: 'visualizações', cor: P.CORES[i % P.CORES.length] };
    });

    palco.innerHTML = '<div class="pn-c-bento">'

      + '<section class="rs-cd pn-c-heroi">' + P.cab('O ritmo da rede',
          P.seg('c-med', [['views', 'Visualizações'], ['posts', 'Publicações']], medida)
          + P.seg('c-jan', [[30, '30 dias'], [90, '90']], janela))
      + '<div class="rs-cd-b"><div class="pn-c-tit"><b class="rs-tn">'
      + P.curto(R.views) + '</b><span class="rs-rot2">visualizações</span>'
      + '<b class="rs-tn">' + P.n(R.publicados) + '</b>'
      + '<span class="rs-rot2">publicações</span>'
      + '<b class="rs-tn">' + P.n(R.eng) + '</b>'
      + '<span class="rs-rot2">engajamento</span></div>'
      + '<div class="pn-graf pn-alto" id="c-ritmo"></div>'
      + '<div class="pn-leg" id="c-leg"></div></div></section>'

      + '<section class="rs-cd pn-c-lado">' + P.cab('O acervo')
      + '<div class="rs-cd-b">' + P.rosca([
          { rot: 'Prateleira', v: R.prateleira, cor: 'var(--chart-1)' },
          { rot: 'Programados', v: R.fila, cor: 'var(--chart-3)' },
          { rot: 'Publicados', v: R.publicados, cor: 'var(--chart-2)' }
        ], P.n(R.acervo), 'no drive') + '</div></section>'

      + '<section class="rs-cd pn-c-terco">' + P.cab('O dia da semana')
      + '<div class="rs-cd-b">' + P.colunas(P.porDiaSemana(), 128) + '</div></section>'

      + '<section class="rs-cd pn-c-terco">' + P.cab('A hora de saída')
      + '<div class="rs-cd-b">' + P.colunas(P.porHora(), 128) + '</div></section>'

      + '<section class="rs-cd pn-c-terco">' + P.cab('Do Drive até o ar')
      + '<div class="rs-cd-b">' + P.funilAcervo() + '</div></section>'

      + '<section class="rs-cd pn-c-cheia">' + P.cab('Os dias com publicação',
          '<span class="rs-rot3">90 dias</span>')
      + '<div class="rs-cd-b">' + P.calor(91) + '</div></section>'

      + '<section class="rs-cd pn-c-meia">' + P.cab('As contas por visualização')
      + '<div class="rs-cd-b">' + P.barrasH(contas) + '</div></section>'

      + '<section class="rs-cd pn-c-meia">' + P.cab('As publicações por visualização')
      + '<div class="rs-cd-b">' + P.barrasH(P.porViews().slice(0, 4))
      + '</div></section>'

      + '<section class="rs-cd pn-c-cheia">' + P.cab('O que trava',
          '<span class="rs-pil ' + (P.travas().length ? 'bl' : 'no') + '">'
          + P.travas().length + '</span>')
      + '<div class="rs-cd-b">' + P.listaTravas(P.travas()) + '</div></section>'

      + '</div>';

    pintarRitmo();
    document.getElementById('c-jan').addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      janela = parseInt(b.dataset.v, 10);
      this.querySelectorAll('[data-v]').forEach(function (o) {
        o.classList.toggle('on', o === b); });
      pintarRitmo();
    });
    document.getElementById('c-med').addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      medida = b.dataset.v;
      this.querySelectorAll('[data-v]').forEach(function (o) {
        o.classList.toggle('on', o === b); });
      pintarRitmo();
    });
  }

  P.casca();
  montar();
  document.getElementById('pn-atualizar').addEventListener('click', montar);
})();
