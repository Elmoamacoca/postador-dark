/* ======================================================= PROPOSTA A · A REDE
   A LEITURA COMECA PELO RESULTADO. Primeiro os numeros da rede inteira, depois
   quem esta' crescendo, o ultimo viral e a comparacao perfil a perfil. So' no
   fim vem o material que ainda nao saiu.

   E' a ordem de quem abre a home para saber COMO FOI.
   ========================================================================== */
(function () {
  var S = window.SALA, M = window.MOTOR, P = window.PN, B = window.BL;
  var palco = document.getElementById('pn-palco');
  var janela = 90, medida = 'vis', ritmo = 3, jDia = 90;

  P.casca();

  function topo() {
    return '<div class="rs-topo"><div>'
      + '<h1 class="pn-h1">Painel</h1>'
      + '<p class="pn-sub">Como a rede está indo, e o que ainda não saiu.</p>'
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

  function montar() {
    B.limpar();
    palco.innerHTML = topo()
      + B.numeros(janela).html
      + '<div class="rs-grade rs-g21">'
        + B.curvaGeral(janela, medida, 'pn-medida').html
        + B.crescendo(janela).html + '</div>'
      + B.viral(janela).html
      + B.secao('Os Perfis', P.rotuloFiltro())
      + B.tabelaPerfis(janela).html
      + '<div class="rs-grade rs-g21">'
        + B.duplo(janela).html + B.mix(janela).html + '</div>'
      + '<div class="rs-grade rs-g3">'
        + B.melhores(janela, 6).html + B.tempo(janela).html
        + B.seguidores().html + '</div>'
      + B.secao('Quando Publicar', 'pelo que já saiu')
      + '<div class="rs-grade rs-g21">'
        + B.diaSemana(janela).html + B.hora(janela).html + '</div>'
      + B.calor(janela).html
      + B.secao('O Material Que Ainda Não Saiu',
                S.fmt(P.guardados()) + ' vídeos guardados')
      + '<div class="rs-grade rs-g21">'
        + B.caminho(true).html + B.sobra(ritmo).html + '</div>'
      + '<div class="rs-grade rs-g21">'
        + B.queima(ritmo, 'pn-ritmo').html + B.pastas().html + '</div>'
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
    var med = document.getElementById('pn-medida');
    if (med) {
      med.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-v]');
        if (!b) return;
        medida = b.dataset.v;
        montar();
      });
    }
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
