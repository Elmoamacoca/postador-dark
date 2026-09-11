/* ================================================== PROPOSTA C · A RÉGUA
   A rede nao aparece somada. Cada conta tem a ficha dela no trilho da esquerda, com
   o estado, os tres numeros que decidem e a curva de 30 dias. O corpo da direita le'
   em ordem de tempo: o que trava agora, o que saiu antes, e o ritmo por baixo.
   ========================================================================== */
(function () {
  var P = window.PN;
  var palco = document.getElementById('pn-palco');
  var filtro = 'tudo';

  function ficha(c, i) {
    var vals = c.serie.slice(-30).map(function (v) { return v[1]; });
    var ultimos30 = vals.reduce(function (t, v) { return t + v; }, 0);
    var estado = !c.ligada ? ['bl', 'Caída']
      : c.fila ? ['no', 'Publicando'] : ['pa', 'Parada'];
    return '<section class="rs-cd"><div class="rs-cd-b" style="padding-top:15px">'
      + '<div class="pn-c-topo">'
      + (c.avatar ? '<img src="' + c.avatar + '" alt="">' : '')
      + '<span class="nm"><b>@' + P.seguro(c.u) + '</b>'
      + '<span class="rs-rot3">' + P.seguro(c.mercado || c.nome || 'sem mercado')
      + '</span></span>'
      + '<span class="rs-pil ' + estado[0] + '">' + estado[1] + '</span></div>'
      + '<div class="pn-c-tres">'
      + '<div><span class="rs-rot2">Fila</span><div class="vl">'
      + (c.fila ? P.n(c.fila) : '—') + '</div></div>'
      + '<div><span class="rs-rot2">Guardados</span><div class="vl">'
      + (c.prateleira ? P.n(c.prateleira) : '—') + '</div></div>'
      + '<div><span class="rs-rot2">30 Dias</span><div class="vl">'
      + (ultimos30 ? P.n(ultimos30) : '—') + '</div></div></div>'
      + (ultimos30 ? '<div class="pn-c-sp">' + P.spark(vals) + '</div>' : '')
      + '<div class="pn-c-pe"><span class="rs-rot3">'
      + (c.ultimo ? 'última saída ' + P.idade(c.ultimo) : 'nunca publicou')
      + '</span><button class="bt mini' + (c.fila ? '' : ' forte') + '" type="button">'
      + (c.fila ? 'Ver a fila' : 'Programar') + '</button></div>'
      + '</div></section>';
  }

  function eventos() {
    var travas = P.travas().map(function (t) {
      return { tipo: 'trava', ico: t.ico, tom: 'am', titulo: t.titulo, desc: t.desc,
               botao: t.botao, forte: t.forte, vai: t.vai };
    });
    var saidas = P.saidasRecentes(12).map(function (s) {
      s.tipo = 'saida'; return s;
    });
    var lista = filtro === 'travas' ? travas
      : filtro === 'saidas' ? saidas : travas.concat(saidas);
    return P.fita(lista);
  }

  function montar() {
    var m = P.medidas();
    var travas = P.travas();

    palco.innerHTML = '<div class="pn-c">'
      + '<div class="pn-c-trilho">' + P.CONTAS.map(ficha).join('') + '</div>'
      + '<div class="pn-c-corpo">'
      + '<div class="pn-c-med">' + [m[1], m[2], m[3]].map(P.kpi).join('') + '</div>'

      + '<section class="rs-cd"><div class="rs-cd-h"><h3>A linha do tempo</h3>'
      + '<div class="rs-dir"><div class="rs-seg" id="c-f">'
      + [['tudo', 'Tudo'], ['travas', 'O Que Trava'], ['saidas', 'O Que Saiu']]
        .map(function (i) {
          return '<button type="button" data-v="' + i[0] + '"'
            + (i[0] === filtro ? ' class="on"' : '') + '>' + i[1] + '</button>';
        }).join('') + '</div></div></div>'
      + '<div class="rs-cd-b"><p class="pn-abre">De cima para baixo: primeiro o que '
      + 'precisa de você hoje, depois o que já saiu. '
      + (travas.length ? '<b>' + travas.length + '</b> '
          + P.plural(travas.length, 'trava aberta', 'travas abertas') + '.'
          : 'Nenhuma trava aberta.') + '</p>'
      + '<div id="c-fita">' + eventos() + '</div></div></section>'

      + '<section class="rs-cd"><div class="rs-cd-h"><h3>O ritmo, conta a conta</h3>'
      + '<span class="rs-rot3">últimos 90 dias</span></div>'
      + '<div class="rs-cd-b"><div class="pn-graf pn-medio" id="c-graf"></div>'
      + '<div class="pn-leg" id="c-leg"></div></div></section>'
      + '</div></div>';

    P.grafico(document.getElementById('c-graf'), {
      tipo: 'barra', dominio: P.dominio(90), series: P.seriePorConta(90, 'barra')
    });
    document.getElementById('c-leg').innerHTML = P.CONTAS.map(function (c, i) {
      return '<span><i style="background:' + P.CORES[i % P.CORES.length] + '"></i>@'
        + P.seguro(c.u) + '</span>';
    }).join('');

    document.getElementById('c-f').addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      filtro = b.dataset.v;
      this.querySelectorAll('[data-v]').forEach(function (o) {
        o.classList.toggle('on', o === b);
      });
      document.getElementById('c-fita').innerHTML = eventos();
    });
  }

  P.casca();
  montar();
  document.getElementById('pn-atualizar').addEventListener('click', montar);
})();
