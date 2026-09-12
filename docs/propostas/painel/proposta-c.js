/* ================================================== PROPOSTA C · O QUADRO
   A LEITURA E' DE PARADA UNICA. Tudo o que importa cabe na primeira tela: seis
   mostradores em fileira, o que esta' impedindo do lado direito fixo, e os
   graficos em grade de tres, sem secao comprida.

   E' a ordem de quem abre a home todo dia e nao quer rolar a pagina para
   descobrir se tem alguma coisa errada.
   ========================================================================== */
(function () {
  var S = window.SALA, M = window.MOTOR, P = window.PN, B = window.BL;
  var palco = document.getElementById('pn-palco');
  var janela = 90, ritmo = 3, jDia = 90;

  P.casca();

  function topo() {
    return '<div class="rs-topo"><div>'
      + '<h1 class="pn-h1">Painel</h1>'
      + '<p class="pn-sub">Tudo o que importa numa tela só.</p>'
      + '</div><div class="rs-dir">'
      + '<span class="rs-rot3" id="pn-lido"></span>'
      + B.seg('pn-janela', [[7, '7'], [30, '30'], [90, '90 dias']], janela)
      + '<button class="bt" id="pn-atualizar" type="button">'
      + M.ico('refresh-cw', 'xs') + 'Atualizar</button>'
      + '<button class="btn brasa" id="pn-programar" type="button">'
      + '<svg class="seta seta-esq" viewBox="0 0 24 24"><use href="#i-seta"/></svg>'
      + '<span class="txt"><svg class="ag-selo" aria-hidden="true">'
      + '<use href="#i-agenda"/></svg>Programar</span><span class="circ"></span>'
      + '<svg class="seta seta-dir" viewBox="0 0 24 24"><use href="#i-seta"/></svg>'
      + '</button></div></div>'
      + '<div class="pn-barra">' + P.barraFiltro('pn-filtro')
      + '<span class="pn-barra-n" id="pn-quem"></span></div>';
  }

  /* ------------------------------------------------------- OS MOSTRADORES
     Seis arcos. O arco NAO e' grafico dentro de cartao de numero: ele E' o
     numero, e o teto de cada um e' real, nunca inventado. */
  function instrumentos() {
    var r = P.resumoRede(janela), a = r.agora;
    var l = P.porPerfil(janela);
    var melhorEng = Math.max.apply(null, l.map(function (p) {
      return p.eng; }).concat([1]));
    var guard = P.guardados();
    var paradas = P.paradas();
    var total = paradas.reduce(function (t, x) { return t + x.valor; }, 0);
    var INST = [
      { id: 'g1', rot: 'Visualizações', ico: 'eye', cor: S.corVar(1),
        valor: a.vis, max: Math.max(a.vis, r.antes.vis, 1),
        texto: function () { return S.curto(a.vis); },
        pe: r.var_vis == null ? 'sem período anterior'
          : (r.var_vis > 0 ? '+' : '') + Math.round(r.var_vis)
            + '% contra o período anterior' },
      { id: 'g2', rot: 'Engajamento', ico: 'heart', cor: S.corVar(2),
        valor: a.eng, max: Math.max(10, Math.ceil(melhorEng)),
        texto: function () { return S.pct(a.eng); },
        pe: S.fmt(a.inter) + ' curtidas, comentários e salvos' },
      { id: 'g3', rot: 'Publicações', ico: 'send', cor: S.corVar(3),
        valor: a.n, max: Math.max(a.n, r.antes.n, 1),
        texto: function () { return S.fmt(a.n); },
        pe: 'em ' + janela + ' dias' },
      { id: 'g4', rot: 'Vídeos Guardados', ico: 'box', cor: S.corVar(4),
        valor: guard, max: Math.max(total, 1),
        texto: function () { return S.fmt(guard); },
        pe: 'de ' + S.fmt(total) + ' que estão no sistema' },
      { id: 'g5', rot: 'Dias Que Sobram', ico: 'gauge', cor: S.corVar(1),
        valor: 0, max: P.tetoSobram(), texto: null,
        pe: 'publicando ' + ritmo + ' por dia', vivo: true },
      { id: 'g6', rot: 'Perfis No Ar', ico: 'users', cor: S.corVar(2),
        valor: P.visiveis().filter(function (p) { return p.ligada; }).length,
        max: Math.max(1, P.visiveis().length),
        texto: function (x) { return S.fmt(x); },
        pe: 'de ' + P.visiveis().length + ' no filtro' }
    ];
    var html = '<div class="pn-c-inst">' + INST.map(function (i) {
      return '<div class="rs-cd pn-c-i"><div class="cab">' + M.ico(i.ico, 's')
        + '<span class="rs-rot2">' + i.rot + '</span></div>'
        + '<div class="pn-c-arco" id="pn-' + i.id + '"></div>'
        + '<div class="pe">' + S.seguro(i.pe) + '</div></div>';
    }).join('') + '</div>';
    return { html: html, pinta: function () {
      INST.forEach(function (i) {
        var v = i.vivo ? Math.min(P.sobram(ritmo) || 0, i.max) : i.valor;
        M.grafArco(document.getElementById('pn-' + i.id), {
          valor: v, max: i.max, cor: i.cor,
          texto: i.texto || function (x) { return S.fmt(x); }
        });
      });
    } };
  }

  function montar() {
    B.limpar();
    var inst = instrumentos();
    palco.innerHTML = topo()
      + inst.html
      + '<div class="rs-grade rs-g21">'
        + B.curvaGeral(janela, 'vis', 'pn-medida').html
        + B.impedimentos().html + '</div>'
      + '<div class="rs-grade rs-g3">'
        + B.crescendo(janela).html + B.viral(janela).html
        + B.mix(janela).html + '</div>'
      + '<div class="rs-grade rs-g3">'
        + B.duplo(janela).html + B.diaSemana(janela).html
        + B.hora(janela).html + '</div>'
      + B.tabelaPerfis(janela).html
      + '<div class="rs-grade rs-g3">'
        + B.caminho(false).html + B.queima(ritmo, 'pn-ritmo').html
        + B.material(false).html + '</div>'
      + '<div class="rs-grade rs-g21">'
        + B.porDia(jDia, 'pn-jdia').html + B.ultimas(janela).html + '</div>';

    inst.pinta();
    B.pintarTudo();
    S.ligarDicas(palco);
    ligar();
  }

  function ligar() {
    P.ligarFiltro('pn-filtro', montar);
    B.ligarSeg('pn-janela', function (v) { janela = v; montar(); });
    B.ligarSeg('pn-ritmo', function (v) { ritmo = v; montar(); });
    B.ligarSeg('pn-jdia', function (v) { jDia = v; montar(); });
    document.getElementById('pn-quem').textContent =
      P.visiveis().length + ' de ' + P.PERFIS.length
      + (P.PERFIS.length === 1 ? ' perfil' : ' perfis');
    var a = new Date();
    document.getElementById('pn-lido').textContent = 'lido às '
      + ('0' + a.getHours()).slice(-2) + ':' + ('0' + a.getMinutes()).slice(-2);
    document.getElementById('pn-atualizar').addEventListener('click', montar);
  }

  montar();
})();
