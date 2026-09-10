/* ==================================================== PROPOSTA C: A ESTEIRA

   A DECISAO DESTA PROPOSTA: a sub-aba nao e' lista nem numero, e' TEMPO. As capas
   entram numa faixa em ordem de data, com um risco de HOJE no meio: a esquerda do
   risco esta' o que ja' saiu, a direita o que vai sair, e no fim da faixa a pilha do
   que ainda esta' guardado.

   POR QUE ELA EXISTE: e' a unica das tres que responde de olhada a pergunta que
   importa numa rede de perfis: ate' quando esta conta anda sozinha. Buraco na agenda
   vira buraco na faixa, e conta que vai secar aparece antes de secar.

   O QUE ELA CUSTA: e' a mais densa de desenhar e a que menos texto mostra por item.
   Para achar UM arquivo pelo nome, ela e' a pior das tres.

   DE ONDE VEM CADA PECA:
     .ct-seg          o segmentado (aqui vira o filtro de periodo)
     .mid-capa        a miniatura 9x16 da aba de Analytics
     .prev            a previa ao passar o mouse
     arrastar-para-rolar   o mesmo gesto da tira de 30 dias da ficha
   ========================================================================== */
(function () {
  var M = window.MID;

  window.CONTA_MIDIAS = function (c) {
    var t = M.contas(c.arroba);
    return t.programado ? '<span class="n">' + t.programado + '</span>' : '';
  };

  window.CORPO_MIDIAS = function (c) {
    var u = c.arroba;
    var t = M.contas(u);
    var f = M.folego(u);
    var pasta = M.pastaDe(u);

    var saiu = M.ordenar(M.porEstado(u, 'publicado'), 'quando', false);
    var vai = M.ordenar(M.porEstado(u, 'programado'), 'quando', false);
    var guardado = M.porEstado(u, 'guardado');

    var faixa =
      saiu.map(function (m) { return quadro(m, 'saiu'); }).join('') +
      '<div class="es-hoje"><i></i><span>Hoje</span></div>' +
      (vai.length
        ? vai.map(function (m) { return quadro(m, 'vai'); }).join('')
        : '<div class="es-sem">Nada Marcado</div>') +
      (guardado.length ? pilha(u, guardado) : '');

    setTimeout(function () { centrarNoHoje(u); }, 0);

    return '' +
      '<div class="es-cab">' +
        '<span class="es-pasta">' + M.escapar(M.maiuscula(pasta.nome)) + '</span>' +
        '<button class="es-ligar" type="button" data-ligar-pasta="' + M.escapar(u) +
        '">Trocar</button>' +
      '</div>' +

      '<div class="es-faixa mid-rolo" data-esteira="' + M.escapar(u) + '">' +
        '<div class="es-trilho">' + faixa + '</div>' +
      '</div>' +

      '<div class="es-pe">' +
        '<div class="es-pe-n"><b>' + t.publicado + '</b><span>Foram Ao Ar</span></div>' +
        '<div class="es-pe-n"><b>' + t.programado + '</b><span>Marcados</span></div>' +
        '<div class="es-pe-n"><b>' + t.guardado + '</b><span>Guardados</span></div>' +
        '<div class="es-pe-f" title="' + f.nota + '">' + (f.sobra
          ? 'Anda Sozinha Por <b>' + f.rotulo + '</b>'
          : 'Sem Material Em Pé') + '</div>' +
      '</div>';
  };

  function quadro(m, lado) {
    var pe = lado === 'saiu'
      ? '<b>' + M.curto(m.vis) + '</b><span>' + M.dia(m.quando) + '</span>'
      : '<b>' + M.hora(m.quando) + '</b><span>' + M.dia(m.quando) + '</span>';
    return '<div class="es-q ' + lado + '" data-mid="' + M.escapar(m.id) + '">' +
      '<span class="mid-capa es-capa"><img src="' + M.capa(m.capa) + '" alt="">' +
        '<span class="dur">' + M.seg(m.dur) + '</span></span>' +
      '<span class="es-q-pe">' + pe +
        (m.exemplo ? '<i class="mid-ex" title="Exemplo"></i>' : '') + '</span>' +
    '</div>';
  }

  function pilha(u, guardado) {
    return '<button class="es-pilha" type="button" data-guardados="' + M.escapar(u) +
      '">' +
      '<span class="es-pilha-capas">' +
        guardado.slice(0, 3).map(function (m, i) {
          return '<img src="' + M.capa(m.capa) + '" alt="" style="--i:' + i + '">';
        }).join('') +
      '</span>' +
      '<b>+' + guardado.length + '</b><span>Guardados</span></button>';
  }

  /* A FAIXA NASCE NO HOJE, e nao no comeco. Quem abre a sub-aba quer saber o que vem,
     nao o que passou ha' tres meses. */
  function centrarNoHoje(u) {
    var faixa = document.querySelector('[data-esteira="' + u + '"]');
    if (!faixa) return;
    var marco = faixa.querySelector('.es-hoje');
    if (!marco) return;
    faixa.scrollLeft = Math.max(marco.offsetLeft - faixa.clientWidth * 0.42, 0);
  }

  /* ARRASTAR PARA ROLAR, o mesmo gesto que a tira de 30 dias da ficha ja' usa. */
  var arrastando = null;
  document.addEventListener('mousedown', function (e) {
    var faixa = e.target.closest('.es-faixa');
    if (!faixa || e.target.closest('button')) return;
    arrastando = { faixa: faixa, x: e.clientX, esquerda: faixa.scrollLeft, andou: 0 };
    faixa.classList.add('puxando');
  });
  document.addEventListener('mousemove', function (e) {
    if (!arrastando) return;
    var d = e.clientX - arrastando.x;
    arrastando.andou = Math.max(arrastando.andou, Math.abs(d));
    arrastando.faixa.scrollLeft = arrastando.esquerda - d;
  });
  document.addEventListener('mouseup', function () {
    if (!arrastando) return;
    arrastando.faixa.classList.remove('puxando');
    arrastando = null;
  });

  /* --------------------------------------------- a janela dos guardados */
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-guardados]');
    if (!g) return;
    var u = g.dataset.guardados;
    var c = window.CT_JANELA.contaDe(u);
    var lista = M.ordenar(M.porEstado(u, 'guardado'), 'nome', false);
    window.CT_JANELA.abrir(
      window.CT_JANELA.cabConta(c, 'Guardados, sem uso'),
      '<div class="es-grade">' + lista.map(function (m) {
        return '<figure class="es-gq" data-mid="' + M.escapar(m.id) + '">' +
          '<span class="mid-capa es-capa"><img src="' + M.capa(m.capa) + '" alt="">' +
          '<span class="dur">' + M.seg(m.dur) + '</span></span>' +
          '<figcaption><b>' + M.escapar(m.nome) + '</b>' +
          '<span>' + M.mb(m.mb) +
          (m.exemplo ? ' <i class="mid-ex" title="Exemplo"></i>' : '') +
          '</span></figcaption></figure>';
      }).join('') + '</div>',
      '<span class="ct-jan-nota">' + lista.length +
      ' vídeos anotados e ainda sem uso.</span>' +
      '<button class="ct-bt" type="button" data-ct-fechar>' +
      '<span class="txt">Fechar</span><span class="circ"></span></button>', true);
    M.ligarTudo(document.getElementById('ct-jan-corpo'));
  });

  document.addEventListener('DOMContentLoaded', function () { M.ligarCasca(); });
})();
