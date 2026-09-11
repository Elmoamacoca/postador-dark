/* ================================================== PROPOSTA A · A SALA
   Oito desenhos, nenhum bloco so' de texto:
     faixa    quatro cartoes com numero e minicurva
     ritmo    publicacao e visualizacao por semana, no motor da casa
     acervo   rosca dos 180 guardados
     calor    mapa de calor de 90 dias
     hora     colunas por hora de saida
     ranking  as publicacoes por visualizacao
     funil    do Drive ate' o publicado
     travas   a lista curta do que trava, cada uma com o botao
   ========================================================================== */
(function () {
  var P = window.PN;
  var palco = document.getElementById('pn-palco');
  var janela = 90, medida = 'views', vista = 'area';

  function mini(k) {
    return '<section class="rs-cd pn-a-mini">' + P.cab(k.rot)
      + '<div class="rs-cd-b"><div class="pn-tit"><b class="rs-tn">' + k.valor + '</b>'
      + '<span>' + P.seguro(k.pe) + '</span></div>'
      + (k.curva || '') + '</div></section>';
  }

  /* A MINICURVA OLHA 90 DIAS, e nao 30: a rede publicou em junho e parou, entao a
     janela de 30 desenha uma linha reta em todos os quatro cartoes. */
  function curvaDe(pegar) { return P.spark(P.SERIE.slice(-90).map(pegar)); }
  function porDia(campo) {
    return function (p) {
      var t = 0;
      P.POSTS.forEach(function (x) {
        if (x.quando.slice(0, 10) === p.dia) t += x[campo]; });
      return t;
    };
  }

  /* AS DUAS MEDIDAS NAO DIVIDEM O MESMO DESENHO: 245 visualizacoes e 1 publicacao na
     mesma regua achatam a publicacao contra o chao. O segmentado escolhe qual medida
     o grafico mostra, como na aba de Analytics. */
  function pintarRitmo() {
    var alvo = document.getElementById('a-ritmo');
    var series = medida === 'views' ? [P.serieViews(janela)]
      : P.seriePorConta(janela, vista);
    P.motor(alvo, { tipo: vista, dominio: P.dominio(janela), series: series });
    document.getElementById('a-leg').innerHTML = series.map(function (s) {
      return '<span><i style="background:' + s.cor + '"></i>' + P.seguro(s.rot)
        + '</span>';
    }).join('');
  }

  function montar() {
    var R = P.RESUMO;
    var views30 = P.POSTS.filter(function (p) { return P.dias(p.quando) <= 30; })
      .reduce(function (t, p) { return t + p.views; }, 0);

    palco.innerHTML =
      '<div class="pn-a-faixa">'
      + mini({ rot: 'Publicações', valor: P.n(R.publicados), pe: 'em 90 dias',
               curva: curvaDe(P.somaDia) })
      + mini({ rot: 'Visualizações', valor: P.curto(R.views),
               pe: P.n(views30) + ' nos últimos 30',
               curva: curvaDe(porDia('views')) })
      + mini({ rot: 'Engajamento', valor: P.n(R.eng), pe: 'curtida e comentário',
               curva: curvaDe(porDia('eng')) })
      /* O QUARTO NAO TEM CURVA, E E' DE PROPOSITO: a fila e' um estoque, nao uma
         serie, e curva de fila zerada desenha uma linha reta que nao diz nada. O
         trilho mostra quanto do acervo ja' saiu. */
      + '<section class="rs-cd pn-a-mini">' + P.cab('Fila')
      + '<div class="rs-cd-b"><div class="pn-tit"><b class="rs-tn">' + P.n(R.fila)
      + '</b><span>de ' + P.n(R.prateleira) + ' guardados</span></div>'
      + '<div class="rs-li-tr" style="margin-top:16px"><i style="width:'
      + Math.max(2, Math.round((R.publicados / Math.max(R.acervo, 1)) * 100))
      + '%;background:var(--accent)"></i></div>'
      + '<div class="pn-leg"><span>' + P.n(R.publicados) + ' publicados de '
      + P.n(R.acervo) + ' no drive</span></div></div></section>'
      + '</div>'

      + '<div class="pn-a-2">'
      + '<section class="rs-cd">' + P.cab('O ritmo',
          P.seg('a-med', [['views', 'Visualizações'], ['posts', 'Publicações']], medida)
          + P.seg('a-jan', [[30, '30 dias'], [90, '90']], janela))
      + '<div class="rs-cd-b"><div class="pn-graf pn-alto" id="a-ritmo"></div>'
      + '<div class="pn-leg" id="a-leg"></div></div></section>'
      + '<section class="rs-cd">' + P.cab('O acervo')
      + '<div class="rs-cd-b">' + P.rosca([
          { rot: 'Prateleira', v: R.prateleira, cor: 'var(--chart-1)' },
          { rot: 'Programados', v: R.fila, cor: 'var(--chart-3)' },
          { rot: 'Publicados', v: R.publicados, cor: 'var(--chart-2)' }
        ], P.n(R.acervo), 'no drive') + '</div></section>'
      + '</div>'

      + '<div class="pn-a-3">'
      + '<section class="rs-cd">' + P.cab('Os dias com publicação',
          '<span class="rs-rot3">90 dias</span>')
      + '<div class="rs-cd-b">' + P.calor(91) + '</div></section>'
      + '<section class="rs-cd">' + P.cab('A hora de saída')
      + '<div class="rs-cd-b">' + P.colunas(P.porHora(), 148) + '</div></section>'
      + '</div>'

      + '<div class="pn-a-3">'
      + '<section class="rs-cd">' + P.cab('As publicações por visualização')
      + '<div class="rs-cd-b">' + P.barrasH(P.porViews()) + '</div></section>'
      + '<section class="rs-cd">' + P.cab('Do Drive até o ar')
      + '<div class="rs-cd-b">' + P.funilAcervo() + '</div></section>'
      + '</div>'

      + '<section class="rs-cd">' + P.cab('O que trava',
          '<span class="rs-pil ' + (P.travas().length ? 'bl' : 'no') + '">'
          + P.travas().length + '</span>')
      + '<div class="rs-cd-b">' + P.listaTravas(P.travas()) + '</div></section>';

    pintarRitmo();
    function liga(id, aoTrocar) {
      document.getElementById(id).addEventListener('click', function (e) {
        var b = e.target.closest('[data-v]'); if (!b) return;
        aoTrocar(b.dataset.v);
        this.querySelectorAll('[data-v]').forEach(function (o) {
          o.classList.toggle('on', o === b);
        });
        pintarRitmo();
      });
    }
    liga('a-jan', function (v) { janela = parseInt(v, 10); });
    liga('a-med', function (v) {
      medida = v;
      /* publicacao e' contagem de dia: coluna. visualizacao e' volume: curva. */
      vista = v === 'posts' ? 'barra' : 'area';
    });
  }

  P.casca();
  montar();
  document.getElementById('pn-atualizar').addEventListener('click', montar);
})();
