/* ================================================== PROPOSTA B · LADO A LADO
   A LEITURA COMECA PELA COMPARACAO. A primeira coisa da tela e' uma FICHA POR
   PERFIL, uma do lado da outra, cada uma com os proprios numeros e a propria
   minicurva. So' depois vem a rede somada e o material.

   E' a ordem de quem tem varios perfis e quer saber QUAL DELES vai bem.
   ========================================================================== */
(function () {
  var S = window.SALA, M = window.MOTOR, P = window.PN, B = window.BL;
  var palco = document.getElementById('pn-palco');
  var janela = 90, ritmo = 3, jDia = 90;

  P.casca();

  function topo() {
    return '<div class="rs-topo"><div>'
      + '<h1 class="pn-h1">Painel</h1>'
      + '<p class="pn-sub">Um perfil ao lado do outro, e o material de cada um.</p>'
      + '</div><div class="rs-dir">'
      + '<span class="rs-rot3" id="pn-lido"></span>'
      + '<button class="bt" id="pn-atualizar" type="button">'
      + M.ico('refresh-cw', 'xs') + 'Atualizar</button>'
      + '<button class="btn brasa" id="pn-programar" type="button">'
      + '<svg class="seta seta-esq" viewBox="0 0 24 24"><use href="#i-seta"/></svg>'
      + '<span class="txt"><svg class="ag-selo" aria-hidden="true">'
      + '<use href="#i-agenda"/></svg>Programar</span><span class="circ"></span>'
      + '<svg class="seta seta-dir" viewBox="0 0 24 24"><use href="#i-seta"/></svg>'
      + '</button></div></div>'
      + '<div class="pn-barra">' + P.barraFiltro('pn-filtro')
      + B.seg('pn-janela', [[7, '7 dias'], [30, '30 dias'], [90, '90 dias']],
              janela)
      + '<span class="pn-barra-n" id="pn-quem"></span></div>';
  }

  /* ---------------------------------------------------------- A FICHA DO PERFIL
     Retrato, arroba, etiqueta, cinco numeros e a minicurva de visualizacao. Uma
     por perfil, lado a lado. Esta e' a peca-assinatura desta proposta: nas
     outras duas o perfil so' aparece dentro de uma tabela ou de um grafico. */
  function fichas() {
    var l = P.porPerfil(janela).sort(function (a, b) { return b.vis - a.vis; });
    if (!l.length) {
      return B.cartao('Os Perfis', '', B.vazio('Nenhum perfil neste filtro',
        'Escolha outra etiqueta no topo da página.')).html;
    }
    return '<div class="pn-fichas">' + l.map(function (p, i) {
      var cor = S.corVar((i % 5) + 1);
      return '<div class="rs-cd pn-ficha">'
        + '<div class="pn-ficha-h">' + B.retrato(p, 40)
        + '<div class="pn-ficha-q"><b>@' + S.seguro(p.u) + '</b>'
        + '<span>' + S.seguro(p.mercado || 'sem mercado') + '</span></div>'
        + '<span class="rs-pil ' + (p.ligada ? 'no' : 'bl') + '">'
        + (p.ligada ? 'no ar' : 'fora') + '</span></div>'
        + (p.etiquetas.length
            ? '<div class="pn-eti">' + p.etiquetas.map(function (e) {
                return '<span class="rs-pil pa">' + S.seguro(e) + '</span>';
              }).join('') + '</div>'
            : '')
        + '<div class="pn-ficha-n">'
        + [['Seguidores', S.fmt(p.seguidores)],
           ['Publicações', S.fmt(p.n)],
           ['Visualizações', S.curto(p.vis)],
           ['Alcance', S.curto(p.alc)],
           ['Engajamento', p.alc ? S.pct(p.eng) : '—'],
           ['Guardados', S.fmt(p.guardados)]].map(function (x) {
          return '<div><span class="rs-rot2">' + x[0] + '</span>'
            + '<b class="rs-tn">' + x[1] + '</b></div>';
        }).join('') + '</div>'
        + '<div class="pn-ficha-c">'
        + (S.sparkline(p.serie, cor, 260, 44, 'pn-spark')
            || '<span class="pn-ficha-sem">sem publicação no período</span>')
        + '</div>'
        + '<div class="pn-ficha-pe"><span>Última publicação '
        + P.idade(p.ultima) + '</span>'
        + (p.var_vis != null
            ? '<span class="rs-delta ' + (p.var_vis > 0.5 ? 'up'
                : p.var_vis < -0.5 ? 'dw' : 'fl') + '">'
              + (p.var_vis > 0 ? '+' : '') + Math.round(p.var_vis) + '%</span>'
            : '<span class="rs-delta-pe">sem base para comparar</span>')
        + '</div></div>';
    }).join('') + '</div>';
  }

  function montar() {
    B.limpar();
    palco.innerHTML = topo()
      + fichas()
      + B.secao('A Rede Somada', P.rotuloFiltro())
      + B.numeros(janela).html
      + '<div class="rs-grade rs-g21">'
        + B.curvaGeral(janela, 'vis', 'pn-medida').html
        + B.viral(janela).html + '</div>'
      + '<div class="rs-grade rs-g3">'
        + B.crescendo(janela).html + B.mix(janela).html
        + B.tempo(janela).html + '</div>'
      + B.nuvem(janela).html
      + '<div class="rs-grade rs-g21">'
        + B.melhores(janela, 7).html + B.ultimas(janela).html + '</div>'
      + B.secao('Quando Publicar', 'pelo que já saiu')
      + '<div class="rs-grade rs-g21">'
        + B.diaSemana(janela).html + B.hora(janela).html + '</div>'
      + B.secao('O Material Que Ainda Não Saiu',
                S.fmt(P.guardados()) + ' vídeos guardados')
      + '<div class="rs-grade rs-g21">'
        + B.sobra(ritmo).html + B.caminho(false).html + '</div>'
      + '<div class="rs-grade rs-g21">'
        + B.queima(ritmo, 'pn-ritmo').html + B.material(false).html + '</div>'
      + '<div class="rs-grade rs-g21">'
        + B.porDia(jDia, 'pn-jdia').html + B.impedimentos().html + '</div>';

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
