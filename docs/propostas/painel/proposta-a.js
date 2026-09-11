/* ================================================== PROPOSTA A · A TORRE
   A leitura desce em quatro andares:
     1. as quatro medidas da operacao
     2. o ritmo (grafico) com o que trava ao lado, porque uma coisa explica a outra
     3. os dias em que saiu alguma coisa, no mapa de calor
     4. a linha por conta, na tabela
   ========================================================================== */
(function () {
  var P = window.PN;
  var palco = document.getElementById('pn-palco');
  /* A COLUNA E' O PADRAO, e nao a curva: publicacao e' contagem de dia, nao medida
     continua. Com 8 dias cheios em 90, a curva vira dois espetos e um chao reto. */
  var janela = 90, vista = 'barra';

  function seg(id, itens, atual) {
    return '<div class="rs-seg" id="' + id + '">' + itens.map(function (i) {
      return '<button type="button" data-v="' + i[0] + '"'
        + (String(i[0]) === String(atual) ? ' class="on"' : '') + '>' + i[1] + '</button>';
    }).join('') + '</div>';
  }

  function notaRitmo() {
    var corte = P.SERIE.slice(-janela);
    var comPost = corte.filter(function (p) { return P.somaDia(p); }).length;
    var total = corte.reduce(function (t, p) { return t + P.somaDia(p); }, 0);
    if (!total) {
      return 'Nada saiu nos últimos <b>' + janela + ' dias</b>. A última publicação que '
        + 'a Meta conhece é de ' + P.data(P.SAIDAS[P.SAIDAS.length - 1].quando) + '.';
    }
    return '<b>' + P.n(total) + '</b> ' + P.plural(total, 'publicação', 'publicações')
      + ' em <b>' + comPost + '</b> ' + P.plural(comPost, 'dia', 'dias')
      + ' dentro da janela de ' + janela + '. Nos outros ' + (janela - comPost)
      + ' dias não saiu nada.'
      + (janela > 31 ? ' Cada coluna é uma semana.' : ' Cada coluna é um dia.');
  }

  function pintarGrafico() {
    var alvo = document.getElementById('a-graf');
    var total = P.SERIE.slice(-janela).reduce(function (t, p) {
      return t + P.somaDia(p); }, 0);
    /* JANELA VAZIA NAO PODE VIRAR DESENHO VAZIO. Com zero publicacao o motor ainda
       desenha o eixo, e um quadro de 250 pixels com tres datas e nada dentro parece
       tela quebrada. Aqui o vazio DIZ o que houve e oferece a saida. */
    if (!total) {
      var ultima = P.SAIDAS[P.SAIDAS.length - 1];
      alvo.innerHTML = '<div class="rs-sem"><b>Nada saiu nesta janela</b>'
        + (ultima ? 'A última publicação foi ' + P.idade(ultima.quando) + ', em '
            + P.data(ultima.quando) + ', na conta @' + P.seguro(ultima.conta) + '.'
          : 'Nenhuma publicação foi lida nestas contas.')
        + '</div>';
      document.getElementById('a-nota').innerHTML = notaRitmo();
      document.getElementById('a-leg').innerHTML = '';
      return;
    }
    var series = P.seriePorConta(janela, vista);
    P.grafico(alvo, { tipo: vista, dominio: P.dominio(janela), series: series });
    document.getElementById('a-nota').innerHTML = notaRitmo();
    document.getElementById('a-leg').innerHTML = P.CONTAS.map(function (c, i) {
      return '<span><i style="background:' + P.CORES[i % P.CORES.length] + '"></i>@'
        + P.seguro(c.u) + '</span>';
    }).join('');
  }

  function linhaConta(c) {
    var vals = c.serie.slice(-30).map(function (v) { return v[1]; });
    var ultimos30 = vals.reduce(function (t, v) { return t + v; }, 0);
    var estado = !c.ligada ? ['bl', 'Caída']
      : c.fila ? ['no', 'Publicando']
        : ['pa', 'Parada'];
    return '<tr><td class="nm"><span class="pn-a-av">'
      + (c.avatar ? '<img src="' + c.avatar + '" alt="">' : '')
      + '<span class="tx">@' + P.seguro(c.u) + '</span></span></td>'
      + '<td><span class="rs-pil ' + estado[0] + '">' + estado[1] + '</span></td>'
      + '<td class="num' + (c.fila ? '' : ' rs-vazio') + '">'
      + (c.fila ? P.n(c.fila) : '—') + '</td>'
      + '<td class="num' + (c.prateleira ? '' : ' rs-vazio') + '">'
      + (c.prateleira ? P.n(c.prateleira) : '—') + '</td>'
      + '<td class="num' + (ultimos30 ? '' : ' rs-vazio') + '">'
      + (ultimos30 ? P.n(ultimos30) : '—') + '</td>'
      + '<td>' + (c.ultimo ? P.idade(c.ultimo) + ' · ' + P.data(c.ultimo) : 'nunca')
      + '</td>'
      + '<td>' + (ultimos30 ? P.spark(vals) : '<span class="rs-vazio">—</span>') + '</td>'
      + '<td class="num"><button class="bt mini' + (c.fila ? '' : ' forte')
      + '" type="button">' + (c.fila ? 'Ver a fila' : 'Programar') + '</button></td></tr>';
  }

  function montar() {
    var travas = P.travas();
    var graves = travas.filter(function (t) { return t.grave; }).length;

    palco.innerHTML =
      '<div class="pn-a-med">' + P.medidas().map(P.kpi).join('') + '</div>'

      + '<div class="pn-a-duas">'
      + '<section class="rs-cd"><div class="rs-cd-h"><h3>O ritmo da rede</h3>'
      + '<div class="rs-dir">'
      + seg('a-jan', [[7, '7 dias'], [30, '30'], [90, '90']], janela)
      + seg('a-vis', [['area', 'Curva'], ['barra', 'Barras']], vista)
      + '</div></div><div class="rs-cd-b">'
      + '<p class="pn-abre" id="a-nota"></p>'
      + '<div class="pn-graf pn-alto" id="a-graf"></div>'
      + '<div class="pn-leg" id="a-leg"></div></div></section>'

      + '<section class="rs-cd"><div class="rs-cd-h"><h3>O que trava</h3>'
      + '<span class="rs-pil ' + (graves ? 'bl' : 'no') + '">'
      + (travas.length ? travas.length + ' ' + P.plural(travas.length, 'aberta', 'abertas')
                       : 'nada aberto') + '</span></div>'
      + '<div class="rs-cd-b"><p class="pn-abre">Cada linha traz o botão que resolve. '
      + 'A ordem é a da urgência: primeiro o que impede de publicar.</p>'
      + P.fita(travas.map(function (t) {
        return { ico: t.ico, tom: t.grave ? 'am' : '', titulo: t.titulo, desc: t.desc,
                 botao: t.botao, forte: t.forte, vai: t.vai };
      })) + '</div></section></div>'

      + '<section class="rs-cd"><div class="rs-cd-h"><h3>Os dias em que saiu alguma '
      + 'coisa</h3><span class="rs-rot3">últimos 90 dias</span></div>'
      + '<div class="rs-cd-b"><p class="pn-abre">Cada quadrinho é um dia. Quanto mais '
      + 'forte, mais publicações naquele dia. O vazio é o que esta tela existe para '
      + 'mostrar.</p><div class="pn-calor">' + P.mapaCalor(91)
      + '<div>' + P.leituraCalor(91) + '</div></div></div></section>'

      + '<section class="rs-cd"><div class="rs-cd-h"><h3>As contas</h3>'
      + '<span class="rs-rot3">' + P.CONTAS.length + ' '
      + P.plural(P.CONTAS.length, 'conta ligada', 'contas ligadas') + '</span></div>'
      + '<div class="rs-cd-b pn-a-tab"><table class="rs-tab"><thead><tr>'
      + '<th>Conta</th><th>Estado</th><th class="num">Fila</th>'
      + '<th class="num">Prateleira</th><th class="num">30 Dias</th>'
      + '<th>Última Saída</th><th>Ritmo</th><th class="num">Ação</th>'
      + '</tr></thead><tbody>'
      + P.CONTAS.map(linhaConta).join('') + '</tbody></table></div></section>';

    pintarGrafico();

    document.getElementById('a-jan').addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      janela = parseInt(b.dataset.v, 10);
      this.querySelectorAll('[data-v]').forEach(function (o) {
        o.classList.toggle('on', o === b);
      });
      pintarGrafico();
    });
    document.getElementById('a-vis').addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      vista = b.dataset.v;
      this.querySelectorAll('[data-v]').forEach(function (o) {
        o.classList.toggle('on', o === b);
      });
      pintarGrafico();
    });
  }

  P.casca();
  montar();
  document.getElementById('pn-atualizar').addEventListener('click', montar);
})();
