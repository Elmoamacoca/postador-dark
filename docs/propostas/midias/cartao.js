/* ================================================ O CARTAO DA PROPOSTA B
   APROVADO POR ELE EM 10/09/2026. O cartao da conta nao vira lista: mostra tres
   numeros, a barra de quanto material ja' foi usado, a pasta e um botao. Fica igual
   nas tres propostas de pop-up; o que muda daqui para frente e' so' a janela.

   Cada pop-up define `window.ABRIR_MIDIAS(arroba)`.
   ========================================================================== */
(function () {
  var M = window.MID;

  window.CONTA_MIDIAS = function () { return ''; };

  window.CORPO_MIDIAS = function (c) {
    var u = c.arroba;
    var t = M.contas(u);
    var f = M.folego(u);
    var pasta = M.pastaDe(u);
    var total = t.publicado + t.programado + t.guardado;
    var usado = t.publicado + t.programado;
    var quanto = total ? Math.round(usado / total * 100) : 0;

    return '' +
      '<div class="gv-nums">' +
        num('Foram Ao Ar', t.publicado, 'foi') +
        num('Marcados', t.programado, 'marcado') +
        num('Guardados', t.guardado, '') +
      '</div>' +

      '<div class="gv-barra" title="' + quanto +
        '% do material desta conta já foi usado"><i style="width:' + quanto +
        '%"></i></div>' +
      '<div class="gv-legenda">' +
        '<span><b>' + quanto + '%</b> Do Material Já Foi Usado</span>' +
        '<span title="' + f.nota + '">' + (f.sobra
          ? 'Resta Para <b>' + f.rotulo + '</b>'
          : 'Sem Material Em Pé') + '</span>' +
      '</div>' +

      '<div class="gv-pasta">' +
        '<span class="gv-pasta-n">' + M.escapar(M.maiuscula(pasta.nome)) + '</span>' +
        '<button class="gv-ligar" type="button" data-ligar-pasta="' + M.escapar(u) +
        '">Trocar Pasta</button>' +
      '</div>' +

      '<button class="ct-bt gv-abrir" type="button" data-abrir-midias="' +
        M.escapar(u) + '"><span class="txt">' +
        '<svg class="mrc" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.9" stroke-linecap="round"><rect x="3" y="4" width="18" ' +
        'height="16" rx="2"/><path d="M3 9h18M9 9v11"/></svg>' +
        'Abrir As ' + total + ' Mídias</span><span class="circ"></span></button>';
  };

  function num(rot, valor, tom) {
    return '<div class="gv-n' + (tom ? ' ' + tom : '') + '">' +
      '<b>' + valor + '</b><span>' + rot + '</span></div>';
  }

  document.addEventListener('click', function (e) {
    var ab = e.target.closest('[data-abrir-midias]');
    if (ab && window.ABRIR_MIDIAS) window.ABRIR_MIDIAS(ab.dataset.abrirMidias);
  });

  document.addEventListener('DOMContentLoaded', function () { M.ligarCasca(); });
})();
