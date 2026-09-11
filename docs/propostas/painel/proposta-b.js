/* ================================================== PROPOSTA B · O MOSAICO
   UMA PERGUNTA MANDA NA TELA: vai sair alguma coisa? O bloco grande responde com o
   numero da fila e com o caminho para mudar isso. Em volta, os blocos menores dizem
   com o que se conta: contas de pe, prateleira, erro e o ritmo dos ultimos 30 dias.
   Embaixo, os dias em que saiu alguma coisa e a lista do que ja' saiu.
   ========================================================================== */
(function () {
  var P = window.PN;
  var palco = document.getElementById('pn-palco');
  var R = P.RESUMO;

  function heroi() {
    var fila = R.fila || 0;
    var frase = fila
      ? '<b>' + P.n(fila) + '</b> ' + P.plural(fila, 'vídeo tem', 'vídeos têm')
        + ' data marcada. É o que vai sair sem ninguém mexer.'
      : 'Nenhum vídeo tem data marcada. Enquanto a fila estiver zerada, <b>nada sai '
        + 'sozinho</b>, mesmo com a rede de pé e com a prateleira cheia.';
    return '<section class="rs-cd pn-b-heroi"><div class="rs-cd-h">'
      + '<h3>Vai sair alguma coisa?</h3>'
      + '<span class="rs-pil ' + (fila ? 'no' : 'bl') + '">'
      + (fila ? 'fila andando' : 'fila vazia') + '</span></div>'
      + '<div class="rs-cd-b">'
      + '<div class="pn-b-num rs-tn">' + P.n(fila) + '</div>'
      + '<p class="pn-b-frase">' + frase + '</p>'
      + '<div class="pn-b-acao">'
      + '<button class="btn brasa" type="button" style="--btn-larg:230px">'
      + '<svg class="seta seta-esq" viewBox="0 0 24 24"><use href="#i-seta"/></svg>'
      + '<span class="txt"><svg class="ag-selo" aria-hidden="true">'
      + '<use href="#i-agenda"/></svg>Programar publicações</span>'
      + '<span class="circ"></span>'
      + '<svg class="seta seta-dir" viewBox="0 0 24 24"><use href="#i-seta"/></svg>'
      + '</button>'
      + '<span class="rs-rot3">' + (R.prateleira
        ? P.n(R.prateleira) + ' vídeos esperando' : 'sem vídeo guardado') + '</span>'
      + '</div></div></section>';
  }

  function prateleira() {
    var usados = P.PASTAS.reduce(function (t, p) {
      return t + (p.programados || 0) + (p.publicados || 0); }, 0);
    var total = P.PASTAS.reduce(function (t, p) { return t + (p.total || 0); }, 0) || 1;
    var pct = Math.round((usados / total) * 100);
    return '<section class="rs-cd pn-b-larga"><div class="rs-cd-h">'
      + '<h3>A prateleira</h3><span class="rs-rot3">' + P.PASTAS.length + ' '
      + P.plural(P.PASTAS.length, 'pasta ligada', 'pastas ligadas') + '</span></div>'
      + '<div class="rs-cd-b"><div class="pn-b-lin"><span><b>' + P.n(R.prateleira || 0)
      + '</b> vídeos prontos e sem uso</span><span>' + pct + '% do acervo já usado'
      + '</span></div><div class="rs-li-tr"><i style="width:' + Math.max(pct, 1)
      + '%;background:var(--accent)"></i></div>'
      + '<div class="rs-lista" style="margin-top:14px">' + P.PASTAS.map(function (p) {
        return '<div class="rs-li semi"><span class="nm"><b>' + P.seguro(p.nome)
          + '</b>' + (p.conta ? '@' + P.seguro(p.conta) : 'sem conta ligada')
          + '</span><span class="vl rs-tn">' + P.n(p.prateleira)
          + '<small>na prateleira</small></span></div>';
      }).join('') + '</div></div></section>';
  }

  function bloco(k) { return P.kpi(k).replace('rs-cd rs-kpi', 'rs-cd rs-kpi pn-b-terco'); }

  function montar() {
    var m = P.medidas();
    var travas = P.travas();

    palco.innerHTML =
      '<div class="pn-b-bento">'
      + heroi()
      + prateleira()
      + bloco(m[0])                       /* contas de pé */
      + bloco(m[3])                       /* últimos 30 dias, com a minicurva */
      + bloco({ rot: 'Erros De Envio', ico: 'alerta', valor: P.n(R.erros || 0),
                pil: R.erros ? 'precisa de você' : 'nenhum',
                tom: R.erros ? 'dw' : '',
                pe: R.erros ? 'vídeos recusados pela Meta' : 'nada foi recusado' })
      + '</div>'

      + '<div class="pn-b-duas">'
      + '<section class="rs-cd"><div class="rs-cd-h">'
      + '<h3>Os dias em que saiu alguma coisa</h3>'
      + '<span class="rs-rot3">últimos 90 dias</span></div>'
      + '<div class="rs-cd-b"><p class="pn-abre">Cada quadrinho é um dia, e a força da '
      + 'cor é o tanto que saiu nele.</p>' + P.mapaCalor(91)
      + '<div style="margin-top:16px">' + P.leituraCalor(91) + '</div></div></section>'
      + '<section class="rs-cd"><div class="rs-cd-h"><h3>O que aconteceu</h3>'
      + '<span class="rs-pil ' + (travas.length ? 'bl' : 'no') + '">'
      + (travas.length ? travas.length + ' ' + P.plural(travas.length, 'trava', 'travas')
                       : 'nada travado') + '</span></div>'
      + '<div class="rs-cd-b">'
      + P.fita(travas.map(function (t) {
          return { ico: t.ico, tom: 'am', titulo: t.titulo, desc: t.desc,
                   botao: t.botao, forte: t.forte, vai: t.vai };
        }).concat(P.saidasRecentes(6)))
      + '</div></section></div>';
  }

  P.casca();
  montar();
  document.getElementById('pn-atualizar').addEventListener('click', montar);
})();
