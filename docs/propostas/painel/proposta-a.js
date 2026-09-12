/* ============================================================== PROPOSTA A
   A HOME DO POSTADOR NO DESENHO DA SALA DE CONTROLE.

   A composicao e' a da aba de Rastreamento do portal, bloco por bloco:
     topo         titulo, leitura do periodo e os filtros
     rs-g4        quatro cartoes de numero, com a minicurva de 92 por 30
     rs-g21       a serie grande + o funil
     secao        Comparar Contas, com a tabela
     rs-g3        rosca do acervo, ranking das publicacoes, lista das pastas
     rs-g3        dia da semana, hora de saida, engajamento
     cartao       mapa de calor de dia por hora
     rs-g21       a fita do que acabou de acontecer + o que trava
   ========================================================================== */
(function () {
  var P = window.PN, S = window.SALA;
  var palco = document.getElementById('pn-palco');
  /* O PADRAO E' 90 DIAS. A rede publicou em junho e parou: abrir em 30 dias mostra
     quatro zeros e uma tela morta, que e' o que ele leu como defeito na aba de
     Analytics em 09/09. */
  var janela = 90;

  function periodo() {
    return janela === 7 ? 'Últimos 7 Dias'
      : janela === 30 ? 'Últimos 30 Dias' : 'Últimos 90 Dias';
  }

  /* a variacao de uma medida contra a janela anterior, quando ela existe */
  function delta(pegar) {
    if (!P.temAnterior(janela)) return null;
    var frente = P.SERIE.slice(-janela).reduce(function (t, p) {
      return t + pegar(p); }, 0);
    var tras = P.SERIE.slice(-(janela * 2), -janela).reduce(function (t, p) {
      return t + pegar(p); }, 0);
    if (!tras) return null;
    return ((frente - tras) / tras) * 100;
  }
  function soma(pegar, quantos) {
    return P.SERIE.slice(-(quantos || janela)).reduce(function (t, p) {
      return t + pegar(p); }, 0);
  }

  function cartao(titulo, sub, corpo, classe) {
    return '<div class="rs-cd' + (classe ? ' ' + classe : '') + '">'
      + '<div class="rs-cd-h"><h3>' + titulo + '</h3>'
      + (sub ? '<span class="rs-rot3">' + sub + '</span>' : '') + '</div>'
      + '<div class="rs-cd-b">' + corpo + '</div></div>';
  }

  function tabelaContas() {
    return '<div class="rs-cd rs-rolx"><table class="rs-tab"><thead><tr>'
      + '<th><span class="th">Conta</span></th>'
      + '<th><span class="th">Estado</span></th>'
      + '<th class="num"><span class="th">Publicações</span></th>'
      + '<th class="num"><span class="th">Visualizações</span></th>'
      + '<th class="num"><span class="th">Engajamento</span></th>'
      + '<th class="num"><span class="th">Fila</span></th>'
      + '<th class="num"><span class="th">Guardados</span></th>'
      + '<th><span class="th">Última Saída</span></th>'
      + '</tr></thead><tbody>'
      + P.CONTAS.map(function (c) {
        var meus = c.meus || [];
        var views = meus.reduce(function (t, p) { return t + p.views; }, 0);
        var eng = meus.reduce(function (t, p) { return t + p.eng; }, 0);
        var est = !c.ligada ? ['bl', 'Caída'] : c.fila ? ['no', 'Publicando']
          : ['pa', 'Parada'];
        return '<tr><td class="nm"><span style="display:inline-flex;align-items:center;'
          + 'gap:9px">' + (c.avatar ? '<img src="' + c.avatar + '" alt="" '
            + 'style="width:26px;height:26px;border-radius:50%;object-fit:cover">' : '')
          + '<span class="tx">@' + S.seguro(c.u) + '</span></span></td>'
          + '<td><span class="rs-pil ' + est[0] + '">' + est[1] + '</span></td>'
          + '<td class="num">' + S.fmt(meus.length) + '</td>'
          + '<td class="num">' + S.fmt(views) + '</td>'
          + '<td class="num">' + S.fmt(eng) + '</td>'
          + '<td class="num' + (c.fila ? '' : ' rs-vazio') + '">'
          + (c.fila ? S.fmt(c.fila) : '—') + '</td>'
          + '<td class="num' + (c.prateleira ? '' : ' rs-vazio') + '">'
          + (c.prateleira ? S.fmt(c.prateleira) : '—') + '</td>'
          + '<td>' + (c.ultimo ? P.idade(c.ultimo) : 'nunca') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function montar() {
    var R = P.RESUMO;
    var sub = 'vs janela anterior';
    var serieViews = P.SERIE.slice(-janela).map(function (p) {
      return P.viewsNoDia(p.dia); });
    var seriePosts = P.SERIE.slice(-janela).map(P.somaDia);
    var serieEng = P.SERIE.slice(-janela).map(function (p) {
      return P.engNoDia(p.dia); });

    palco.innerHTML =
      '<div class="rs-topo"><div><h1>Painel</h1>'
      + '<p class="p">A rede inteira, junta. ' + periodo() + '.</p></div>'
      + '<div class="rs-dir">'
      + '<div class="rs-seg" id="pn-per">'
      + [[7, '7 Dias'], [30, '30 Dias'], [90, '90 Dias']].map(function (i) {
        return '<button type="button" data-v="' + i[0] + '"'
          + (i[0] === janela ? ' class="on"' : '') + '>' + i[1] + '</button>';
      }).join('') + '</div>'
      + '<button class="btn brasa" type="button">'
      + '<svg class="seta seta-esq" viewBox="0 0 24 24"><use href="#i-seta"/></svg>'
      + '<span class="txt"><svg class="ag-selo" aria-hidden="true">'
      + '<use href="#i-agenda"/></svg>Programar Publicações</span>'
      + '<span class="circ"></span>'
      + '<svg class="seta seta-dir" viewBox="0 0 24 24"><use href="#i-seta"/></svg>'
      + '</button></div></div>'

      + '<div class="rs-grade rs-g4">'
      + S.kpi({ rot: 'Publicações', ico: 'send', valor: S.fmt(soma(P.somaDia)),
                delta: delta(P.somaDia), serie: seriePosts, cor: S.corVar(4), pe: sub })
      + S.kpi({ rot: 'Visualizações', ico: 'eye',
                valor: S.fmt(soma(function (p) { return P.viewsNoDia(p.dia); })),
                delta: delta(function (p) { return P.viewsNoDia(p.dia); }),
                serie: serieViews, cor: S.corVar(1), pe: sub })
      + S.kpi({ rot: 'Engajamento', ico: 'heart',
                valor: S.fmt(soma(function (p) { return P.engNoDia(p.dia); })),
                delta: delta(function (p) { return P.engNoDia(p.dia); }),
                serie: serieEng, cor: S.corVar(3), pe: sub })
      + S.kpi({ rot: 'Fila Programada', ico: 'calendar', valor: S.fmt(R.fila),
                delta: null, pe: S.fmt(R.prateleira) + ' guardados' })
      + '</div>'

      + '<div class="rs-grade rs-g21">'
      + '<div class="rs-cd estica"><div class="rs-cd-h">'
      + '<h3>Visualizações E Publicações</h3><span class="rs-rot3">' + periodo()
      + '</span></div><div class="rs-cd-b">'
      + '<div class="rs-ec" id="pn-serie"></div>'
      + '<div id="pn-serie-leg"></div></div></div>'
      + cartao('Do Drive Até O Ar', 'Onde Trava', '<div id="pn-funil"></div>')
      + '</div>'

      + '<div class="rs-tit"><h2>Comparar Contas</h2></div>'
      + tabelaContas()

      + '<div class="rs-tit"><h2>O Conteúdo</h2>'
      + '<span class="rs-rot3">O Que Está Guardado E O Que Rendeu</span></div>'
      + '<div class="rs-grade rs-g3">'
      + cartao('Onde Está O Acervo', 'Vídeos',
          '<div class="rs-rosca-w"><div class="rs-ec rosca" id="pn-rosca"></div>'
          + '<div class="rs-ec-mid"><b class="rs-tn">' + S.fmt(R.acervo)
          + '</b><span>NO DRIVE</span></div></div>')
      + cartao('Publicações Por Visualização', 'Todas As Contas',
          '<div class="rs-ec" id="pn-top"></div>')
      + cartao('As Pastas Ligadas', 'Vídeos Na Prateleira',
          S.lista(P.PASTAS.map(function (p, i) {
            return { nome: p.nome, sub: p.conta ? '@' + p.conta : 'sem conta ligada',
                     valor: p.prateleira, cor: S.corVar((i % 5) + 1) };
          }), null, 'Nenhuma pasta com vídeo.'))
      + '</div>'

      + '<div class="rs-grade rs-g3">'
      + cartao('O Dia Da Semana', 'Publicações',
          '<div class="rs-ec baixo" id="pn-dsem"></div>')
      + cartao('A Hora De Saída', 'Publicações',
          '<div class="rs-ec baixo" id="pn-hora"></div>')
      + cartao('Engajamento Por Publicação', 'Curtida E Comentário',
          '<div class="rs-ec baixo" id="pn-eng"></div>')
      + '</div>'

      + cartao('Quando As Publicações Saem', 'Por Dia E Hora',
          S.heatmap(P.matrizHora()))

      + '<div class="rs-grade rs-g21">'
      + '<div class="rs-cd"><div class="rs-cd-h"><h3>Acabou De Acontecer</h3>'
      + '<span class="rs-rot3">As Últimas Publicações</span></div>'
      + '<div class="rs-fita">' + (P.fita().length ? P.fita().map(function (e) {
        return '<div class="rs-ev"><span class="ic ' + e.cl + '">' + S.ico(e.ico, 's')
          + '</span><div class="c"><b>' + S.seguro(e.titulo) + '</b><span>'
          + S.seguro(e.sub) + '</span></div><div class="q"><b>' + e.q1 + '</b><span>'
          + e.q2 + '</span></div></div>';
      }).join('') : '<p class="rs-sem">A fita enche sozinha com as publicações.</p>')
      + '</div></div>'
      + '<div class="rs-cd"><div class="rs-cd-h"><h3>O Que Trava</h3>'
      + '<span class="rs-rot3">Com O Botão Que Resolve</span></div>'
      + '<div class="rs-fita">' + (P.travas().length ? P.travas().map(function (t) {
        return '<div class="rs-ev"><span class="ic ' + t.cl + '">' + S.ico(t.ico, 's')
          + '</span><div class="c"><b>' + S.seguro(t.titulo) + '</b><span>'
          + S.seguro(t.desc) + '</span></div>'
          + '<div class="q"><button class="bt mini" type="button">' + t.botao
          + '</button></div></div>';
      }).join('') : '<p class="rs-sem"><b>Nada Travado</b>A rede está de pé e com fila.'
        + '</p>') + '</div></div>'
      + '</div>';

    desenhar();
    document.getElementById('pn-per').addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      janela = parseInt(b.dataset.v, 10);
      montar();
    });
  }

  function desenhar() {
    var R = P.RESUMO;
    S.grafSerie(document.getElementById('pn-serie'), P.serieGrafico(janela),
      { nomeA: 'Visualizações', nomeB: 'Publicações' });
    /* A LINHA TRACEJADA SO' ENTRA NA LEGENDA QUANDO EXISTE periodo anterior: a
       leitura cobre 90 dias, entao a janela de 90 nao tem os 90 de tras. */
    document.getElementById('pn-serie-leg').innerHTML =
      S.legendaSerie('Visualizações', 'Publicações', null, null,
                     P.temAnterior(janela));
    document.getElementById('pn-funil').innerHTML = S.funil([
      { rotulo: 'No Drive', icone: 'folder', valor: R.acervo },
      { rotulo: 'Na Prateleira', icone: 'video', valor: R.prateleira },
      { rotulo: 'Programados', icone: 'calendar', valor: R.fila },
      { rotulo: 'Publicados', icone: 'send', valor: R.publicados }
    ], S.corVar(1));
    S.grafRosca(document.getElementById('pn-rosca'), [
      { nome: 'Na Prateleira', valor: R.prateleira, cor: S.corVar(1) },
      { nome: 'Programados', valor: R.fila, cor: S.corVar(4) },
      { nome: 'Publicados', valor: R.publicados, cor: S.corVar(2) }
    ]);
    S.grafBarraH(document.getElementById('pn-top'), P.topPublicacoes(6),
      S.corDado(1), 'Visualizações');
    S.grafColuna(document.getElementById('pn-dsem'), P.porDiaSemana(),
      S.corDado(2), 'Publicações');
    S.grafColuna(document.getElementById('pn-hora'), P.porHora(),
      S.corDado(3), 'Publicações');
    S.grafBarraH(document.getElementById('pn-eng'),
      P.POSTS.slice().sort(function (a, b) { return b.eng - a.eng; }).slice(0, 6)
        .map(function (p) {
          return [(p.legenda || 'Sem legenda').slice(0, 38), p.eng]; }),
      S.corDado(4), 'Engajamento');
  }

  P.casca();
  S.ligarDicas(document.getElementById('pag-painel'));
  montar();
})();
