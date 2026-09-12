/* ============================================== PROPOSTA C · A SALA DE MÁQUINAS
   A LEITURA E' DE INSTRUMENTO. Em vez de uma peca grande mandando na tela, sao
   seis mostradores pequenos lado a lado, cada um com um arco proprio, e o mapa
   do material ocupando o centro. E' a tela mais densa das tres: serve para quem
   olha a home todo dia e quer bater o olho, nao para quem esta' entendendo o
   sistema pela primeira vez.

   O ARCO NAO E' GRAFICO DENTRO DE KPI: ele E' o numero. O valor mora no meio do
   arco, e o arco mostra o quanto daquilo esta' cheio.
   ========================================================================== */
(function () {
  var S = window.SALA, M = window.MOTOR, P = window.PN;
  var palco = document.getElementById('pn-palco');
  var R = P.RESUMO, E = P.ESTEIRA;
  var ritmo = 3, janela = 90;

  P.casca();

  function cartao(titulo, dir, corpo, cls) {
    return '<div class="rs-cd' + (cls ? ' ' + cls : '') + '">'
      + '<div class="rs-cd-h"><h3>' + titulo + '</h3>'
      + '<div class="rs-dir">' + (dir || '') + '</div></div>'
      + '<div class="rs-cd-b">' + corpo + '</div></div>';
  }
  function seg(id, opcoes, vivo) {
    return '<div class="rs-seg" id="' + id + '">' + opcoes.map(function (o) {
      return '<button type="button" data-v="' + o[0] + '"'
        + (String(o[0]) === String(vivo) ? ' class="on"' : '') + '>' + o[1]
        + '</button>';
    }).join('') + '</div>';
  }

  var topo = '<div class="rs-topo"><div>'
    + '<h1 class="pn-h1">Painel</h1>'
    + '<p class="pn-sub">Os instrumentos da máquina, num olhar só.</p>'
    + '</div><div class="rs-dir">'
    + '<span class="rs-rot3" id="pn-lido"></span>'
    + seg('pn-ritmo', P.RITMOS.map(function (r) { return [r, r + '/dia']; }), ritmo)
    + '<button class="bt" id="pn-atualizar" type="button">'
    + M.ico('refresh-cw', 'xs') + 'Atualizar</button>'
    + '<button class="btn brasa" id="pn-programar" type="button">'
    + '<svg class="seta seta-esq" viewBox="0 0 24 24"><use href="#i-seta"/></svg>'
    + '<span class="txt"><svg class="ag-selo" aria-hidden="true">'
    + '<use href="#i-agenda"/></svg>Programar</span><span class="circ"></span>'
    + '<svg class="seta seta-dir" viewBox="0 0 24 24"><use href="#i-seta"/></svg>'
    + '</button></div></div>';

  /* --------------------------------------------------------- os instrumentos
     Seis mostradores. O teto de cada um nao e' inventado: ou e' cem por cento,
     ou e' o proprio acervo, ou e' a janela lida. */
  var INST = [
    { id: 'i1', rot: 'Prateleira Cheia', ico: 'box', cor: S.corVar(1),
      valor: R.acervo ? (E.prateleira / R.acervo) * 100 : 0, max: 100,
      texto: function (x) { return Math.round(x) + '%'; },
      pe: S.fmt(E.prateleira) + ' de ' + S.fmt(R.acervo) + ' vídeos' },
    { id: 'i2', rot: 'Na Fila', ico: 'calendar', cor: S.corVar(2),
      valor: E.programado, max: Math.max(1, E.prateleira + E.programado),
      texto: function (x) { return S.fmt(x); },
      pe: E.programado ? 'com hora marcada' : 'nenhum vídeo com hora' },
    { id: 'i3', rot: 'Acervo Gasto', ico: 'fuel', cor: S.corVar(3),
      valor: R.gasto, max: 100,
      texto: function (x) { return Math.round(x) + '%'; },
      pe: S.fmt(E.programado + E.publicado) + ' saíram da prateleira' },
    { id: 'i4', rot: 'Dias Rodando', ico: 'zap', cor: S.corVar(4),
      valor: P.diasRodando(90), max: 90,
      texto: function (x) { return S.fmt(x); },
      pe: 'dos últimos 90 dias' },
    { id: 'i5', rot: 'Autonomia', ico: 'gauge', cor: S.corVar(1),
      valor: 0, max: P.tetoAutonomia(), texto: function (x) { return S.fmt(x); },
      pe: 'dias no ritmo escolhido', vivo: true },
    { id: 'i6', rot: 'Levas Com Dono', ico: 'layers', cor: S.corVar(2),
      valor: R.levas - R.semdono, max: Math.max(1, R.levas),
      texto: function (x) { return S.fmt(x); },
      pe: 'de ' + R.levas + (R.levas === 1 ? ' leva ligada' : ' levas ligadas') }
  ];
  var instrumentos = '<div class="pn-c-inst">' + INST.map(function (i) {
    return '<div class="rs-cd pn-c-i"><div class="cab">' + M.ico(i.ico, 's')
      + '<span class="rs-rot2">' + i.rot + '</span></div>'
      + '<div class="pn-c-arco" id="pn-' + i.id + '"></div>'
      + '<div class="pe" id="pn-' + i.id + '-pe">' + S.seguro(i.pe) + '</div></div>';
  }).join('') + '</div>';

  /* -------------------------------------------------- o centro: mapa e queima */
  var mat = P.material();
  var mapa = cartao('O Material, Pasta Por Pasta',
    '<span class="rs-pil ' + (P.FONTE.pronta ? 'no' : 'bl') + '">'
      + (P.FONTE.pronta ? 'Drive de pé' : 'Drive fora') + '</span>',
    (!mat.length
      ? '<p class="rs-sem"><b>Nada visível na fonte</b>'
        + S.seguro(P.FONTE.motivo || 'A fonte respondeu sem pastas.') + '</p>'
      : mat.length >= 3
        ? '<div class="pn-c-mapa" id="pn-mapa"></div>'
        : P.listaCaixas(mat))
    + '<div class="rs-ec-leg"><span><i style="background:' + S.corVar(1)
    + '"></i>Ligada no livro</span><span style="color:var(--soft)">'
    + '<i class="pn-vaz"></i>Só no Drive</span>'
    + '<span style="margin-left:auto;color:var(--soft)">'
    + S.seguro(P.FONTE.raiz || '') + '</span></div>', 'estica');

  var queima = cartao('A Queima', '',
    '<div class="rs-ec baixo" id="pn-queima"></div>'
    + '<div class="rs-ec-leg" id="pn-queima-leg"></div>', 'estica');

  /* ---------------------------------------------------------- o acervo
     AQUI NAO ENTRA A PILHA POR LEVA: o cartao de cima ja' mostra pasta por
     pasta, e repetir a mesma quebra duas vezes na mesma tela e' o defeito que
     esta rodada esta' corrigindo. O acervo aparece por ESTADO, em colunas. */
  var colunas = P.estacoes().map(function (e) { return [e.rotulo, e.valor]; });
  if (E.erro) colunas.push(['Com Erro', E.erro]);
  var levas = cartao('O Acervo Por Estado',
    '<span class="rs-rot3">' + S.fmt(R.acervo) + ' vídeos</span>',
    '<div class="rs-ec baixo" id="pn-colunas"></div>');

  var maq = cartao('O Tempo De Máquina',
    seg('pn-janela', [[30, '30 dias'], [90, '90 dias']], janela),
    '<div class="rs-ec baixo" id="pn-maquina"></div>'
    + '<div class="rs-ec-leg" id="pn-maq-leg"></div>', 'estica');

  /* --------------------------------------------------- as travas e a fita */
  var travas = P.travas();
  var lista = cartao('O Que Trava',
    '<span class="rs-pil ' + (travas.length ? 'pa' : 'no') + '">'
      + (travas.length ? travas.length : 'zero') + '</span>',
    travas.length
      ? '<div class="rs-fita">' + travas.map(function (t) {
          return '<div class="rs-ev"><span class="ic ' + (t.cl || '') + '">'
            + M.ico(t.ico, 's') + '</span><span class="c"><b>' + S.seguro(t.titulo)
            + '</b><span>' + S.seguro(t.desc) + '</span></span>'
            + '<span class="q"><button class="bt mini' + (t.grave ? ' forte' : '')
            + '" type="button">' + t.botao + '</button></span></div>';
        }).join('') + '</div>'
      : '<p class="rs-sem"><b>Nada trava</b>Tem material, tem fila e a fonte '
        + 'responde.</p>', 'estica');

  var fita = P.fita();
  var ultimas = cartao('O Que A Máquina Fez Por Último',
    '<span class="rs-rot3">' + fita.length + (fita.length === 1 ? ' saída'
      : ' saídas') + '</span>',
    fita.length
      ? '<div class="rs-fita">' + fita.slice(0, 12).map(function (f) {
          return '<div class="rs-ev"><span class="ic ' + f.cl + '">'
            + M.ico(f.ico, 's') + '</span><span class="c"><b>'
            + S.seguro(f.titulo) + '</b><span>' + S.seguro(f.sub) + '</span></span>'
            + '<span class="q"><b>' + f.q1 + '</b><span>' + f.q2
            + '</span></span></div>';
        }).join('') + '</div>'
      : '<p class="rs-sem"><b>Nenhuma saída registrada</b>Nada foi entregue à Meta '
        + 'por esta máquina ainda.</p>', 'estica');

  palco.innerHTML = topo + instrumentos
    + '<div class="rs-grade rs-g21">' + mapa + queima + '</div>'
    + '<div class="rs-grade rs-g21">' + levas + lista + '</div>'
    + '<div class="rs-grade rs-g21">' + maq + ultimas + '</div>';

  /* ------------------------------------------------------------------ pintar */
  function pintaInstrumentos() {
    INST.forEach(function (i) {
      var v = i.vivo ? Math.min(P.autonomia(ritmo) || 0, i.max) : i.valor;
      M.grafArco(document.getElementById('pn-' + i.id), {
        valor: v, max: i.max, cor: i.cor, texto: i.texto
      });
      if (i.vivo) {
        document.getElementById('pn-' + i.id + '-pe').textContent =
          'dias no ritmo de ' + ritmo + ' por dia';
      }
    });
  }
  function pintaQueima() {
    M.grafQueima(document.getElementById('pn-queima'), E.prateleira || 0,
                 P.RITMOS, ritmo, 120);
    document.getElementById('pn-queima-leg').innerHTML =
      P.RITMOS.map(function (r, i) {
        var d = P.autonomia(r);
        return '<span' + (r === ritmo ? '' : ' style="color:var(--soft)"')
          + '><i style="background:' + S.corVar((i % 5) + 1)
          + (r === ritmo ? '' : ';opacity:.45') + '"></i>' + r + '/dia · '
          + (d != null ? S.fmt(d) + 'd' : '—') + '</span>';
      }).join('');
  }
  function pintaMaquina() {
    M.grafMaquina(document.getElementById('pn-maquina'), P.maquina(janela));
    var rodou = P.diasRodando(janela);
    document.getElementById('pn-maq-leg').innerHTML =
      '<span><i style="background:' + S.corVar(1) + '"></i>Vídeos Que Saíram</span>'
      + '<span style="color:var(--soft)"><i class="tr"></i>Contas Sem Saída</span>'
      + '<span style="margin-left:auto;color:var(--soft)">' + rodou + ' de ' + janela
      + (rodou === 1 ? ' dia com saída' : ' dias com saída') + '</span>';
  }
  function pintaResto() {
    if (mat.length >= 3) M.grafMapa(document.getElementById('pn-mapa'), mat);
    S.grafColuna(document.getElementById('pn-colunas'), colunas, S.corVar(1),
                 'Vídeos');
  }

  pintaInstrumentos(); pintaQueima(); pintaMaquina(); pintaResto();
  S.ligarDicas(palco);

  function ligarSeg(id, aoTrocar) {
    var cx = document.getElementById(id);
    if (!cx) return;
    cx.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]');
      if (!b) return;
      [].forEach.call(cx.querySelectorAll('button'), function (o) {
        o.classList.toggle('on', o === b);
      });
      aoTrocar(parseInt(b.dataset.v, 10));
    });
  }
  ligarSeg('pn-ritmo', function (v) { ritmo = v; pintaInstrumentos(); pintaQueima(); });
  ligarSeg('pn-janela', function (v) { janela = v; pintaMaquina(); });

  var lido = document.getElementById('pn-lido');
  function carimbo() {
    var a = new Date();
    lido.textContent = 'lido às ' + ('0' + a.getHours()).slice(-2) + ':'
      + ('0' + a.getMinutes()).slice(-2);
  }
  carimbo();
  document.getElementById('pn-atualizar').addEventListener('click', function () {
    carimbo(); pintaInstrumentos(); pintaQueima(); pintaMaquina(); pintaResto();
  });
})();
