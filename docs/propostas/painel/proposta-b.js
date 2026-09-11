/* ================================================== PROPOSTA B · O MURAL
   A rede nao aparece somada em cima: cada conta tem o cartao dela, com o grafico
   dentro, no molde do Crypto Dashboard do 21st.dev. Embaixo, os desenhos da rede:
   funil, dia da semana, hora, mapa de calor e ranking.
   ========================================================================== */
(function () {
  var P = window.PN;
  var palco = document.getElementById('pn-palco');

  function cartaoConta(c, i) {
    var meus = c.meus || [];
    var views = meus.reduce(function (t, p) { return t + p.views; }, 0);
    var eng = meus.reduce(function (t, p) { return t + p.eng; }, 0);
    var estado = !c.ligada ? ['bl', 'Caída'] : c.fila ? ['no', 'Publicando']
      : ['pa', 'Parada'];
    var cor = P.CORES[i % P.CORES.length];
    var vals = c.serie.slice(-90).map(function (v) { return v[1]; });
    var viewsDia = c.serie.slice(-90).map(function (v) {
      var t = 0;
      meus.forEach(function (p) {
        if (p.quando.slice(0, 10) === v[0]) t += p.views; });
      return t;
    });
    return '<section class="rs-cd"><div class="rs-cd-b" style="padding-top:15px">'
      + '<div class="pn-b-topo">'
      + (c.avatar ? '<img src="' + c.avatar + '" alt="">' : '')
      + '<span class="nm"><b>@' + P.seguro(c.u) + '</b><span class="rs-rot3">'
      + P.seguro(c.mercado || c.nome) + '</span></span>'
      + '<span class="rs-pil ' + estado[0] + '">' + estado[1] + '</span></div>'
      + '<div class="pn-b-num"><b class="rs-tn">' + P.curto(views) + '</b>'
      + '<span class="rs-rot2">visualizações</span></div>'
      + P.spark(viewsDia.some(function (v) { return v; }) ? viewsDia : vals, cor)
      + '<div class="pn-b-pes">'
      + '<div><span class="rs-rot2">Publicou</span><div class="vl rs-tn">'
      + P.n(meus.length) + '</div></div>'
      + '<div><span class="rs-rot2">Engajou</span><div class="vl rs-tn">'
      + P.n(eng) + '</div></div>'
      + '<div><span class="rs-rot2">Fila</span><div class="vl rs-tn">'
      + (c.fila ? P.n(c.fila) : '—') + '</div></div>'
      + '<div><span class="rs-rot2">Guardados</span><div class="vl rs-tn">'
      + (c.prateleira ? P.n(c.prateleira) : '—') + '</div></div>'
      + '</div></div></section>';
  }

  function montar() {
    var R = P.RESUMO;

    palco.innerHTML =
      '<div class="pn-b-contas">' + P.CONTAS.map(cartaoConta).join('') + '</div>'

      + '<div class="pn-b-tres">'
      + '<section class="rs-cd">' + P.cab('Do Drive até o ar')
      + '<div class="rs-cd-b">' + P.funilAcervo() + '</div></section>'
      + '<section class="rs-cd">' + P.cab('O dia da semana')
      + '<div class="rs-cd-b">' + P.colunas(P.porDiaSemana(), 150) + '</div></section>'
      + '<section class="rs-cd">' + P.cab('A hora de saída')
      + '<div class="rs-cd-b">' + P.colunas(P.porHora(), 150) + '</div></section>'
      + '</div>'

      + '<div class="pn-b-duas">'
      + '<section class="rs-cd">' + P.cab('Os dias com publicação',
          '<span class="rs-rot3">90 dias</span>')
      + '<div class="rs-cd-b">' + P.calor(91) + '</div></section>'
      + '<section class="rs-cd">' + P.cab('O acervo')
      + '<div class="rs-cd-b">' + P.rosca([
          { rot: 'Prateleira', v: R.prateleira, cor: 'var(--chart-1)' },
          { rot: 'Programados', v: R.fila, cor: 'var(--chart-3)' },
          { rot: 'Publicados', v: R.publicados, cor: 'var(--chart-2)' }
        ], P.n(R.acervo), 'no drive') + '</div></section>'
      + '</div>'

      + '<div class="pn-b-duas">'
      + '<section class="rs-cd">' + P.cab('As publicações por visualização')
      + '<div class="rs-cd-b">' + P.barrasH(P.porViews()) + '</div></section>'
      + '<section class="rs-cd">' + P.cab('O que trava',
          '<span class="rs-pil ' + (P.travas().length ? 'bl' : 'no') + '">'
          + P.travas().length + '</span>')
      + '<div class="rs-cd-b">' + P.listaTravas(P.travas()) + '</div></section>'
      + '</div>';
  }

  P.casca();
  montar();
  document.getElementById('pn-atualizar').addEventListener('click', montar);
})();
