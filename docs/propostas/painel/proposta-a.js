/* ====================================================== PROPOSTA A · A ESTEIRA
   A LEITURA E' HORIZONTAL: o video entra pela esquerda e sai publicado pela
   direita. A peca de cima e' a propria esteira, deitada, e tudo o que vem abaixo
   explica um pedaco dela: quanto material tem, quanto tempo dura, o que trava.

   NADA AQUI E' DE OUTRA ABA. Sem ficha de perfil, sem gantt, sem visualizacao.
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

  /* ------------------------------------------------------------------ o topo */
  var topo = '<div class="rs-topo"><div>'
    + '<h1 class="pn-h1">Painel</h1>'
    + '<p class="pn-sub">O caminho do vídeo, da pasta até o ar.</p></div>'
    + '<div class="rs-dir">'
    + '<span class="rs-rot3" id="pn-lido"></span>'
    + '<button class="bt" id="pn-atualizar" type="button">'
    + M.ico('refresh-cw', 'xs') + 'Atualizar</button>'
    + '<button class="btn brasa" id="pn-programar" type="button">'
    + '<svg class="seta seta-esq" viewBox="0 0 24 24"><use href="#i-seta"/></svg>'
    + '<span class="txt"><svg class="ag-selo" aria-hidden="true">'
    + '<use href="#i-agenda"/></svg>Programar</span>'
    + '<span class="circ"></span>'
    + '<svg class="seta seta-dir" viewBox="0 0 24 24"><use href="#i-seta"/></svg>'
    + '</button></div></div>';

  /* --------------------------------------------------------- os quatro numeros
     SEM GRAFICO DENTRO DO CARTAO DE NUMERO. A minicurva de 92 por 30 so' aparece
     onde existe serie de verdade; no resto, o cartao e' numero e pe'. */
  var saidasDia = P.MAQUINA.map(function (d) { return d.saidas; });
  var kpis = '<div class="rs-grade rs-g4">'
    + S.kpi({ rot: 'Na Prateleira', ico: 'box', valor: S.fmt(E.prateleira || 0),
        pe: R.levas + (R.levas === 1 ? ' leva ligada' : ' levas ligadas'),
        cor: S.corVar(1) })
    + S.kpi({ rot: 'Na Fila', ico: 'calendar', valor: S.fmt(E.programado || 0),
        pe: E.programado ? 'com hora marcada' : 'nada com hora marcada',
        cor: S.corVar(2) })
    + S.kpi({ rot: 'Saíram Em 90 Dias', ico: 'send', valor: S.fmt(R.saiu90 || 0),
        pe: P.diasRodando(90) + ' dias com saída', serie: saidasDia,
        cor: S.corVar(3) })
    + S.kpi({ rot: 'Máquina Parada Há', ico: 'clock',
        valor: R.parada ? S.fmt(R.parada) + ' dias' : '—',
        pe: R.ultimo ? 'último vídeo ' + P.idade(R.ultimo) : 'nenhum vídeo saiu ainda',
        cor: S.corVar(5) })
    + '</div>';

  /* ------------------------------------------------------- a esteira, deitada */
  var estacoes = P.estacoes();
  var esteira = cartao('A Esteira',
    '<span class="rs-rot3">' + S.fmt(R.acervo) + ' vídeos no livro-caixa</span>',
    '<div class="rs-ec baixo" id="pn-esteira"></div>'
    + '<div class="rs-ec-leg">' + estacoes.map(function (e) {
      return '<span><i style="background:' + e.cor + '"></i>' + e.rotulo + '</span>';
    }).join('')
    + (E.erro ? '<span style="color:var(--rs-neg)"><i style="background:'
        + 'var(--rs-neg)"></i>' + S.fmt(E.erro) + ' caíram fora com erro</span>' : '')
    + '<span style="margin-left:auto;color:var(--soft)">'
    + (E.programado || E.publicado
        ? S.pct(R.gasto) + ' do acervo já andou'
        : 'a esteira para na primeira estação') + '</span></div>');

  /* ------------------------------------------- quanto tempo o estoque dura */
  var queima = cartao('Quanto Tempo O Estoque Dura',
    seg('pn-ritmo', P.RITMOS.map(function (r) { return [r, r + '/dia']; }), ritmo),
    '<div class="rs-ec baixo" id="pn-queima"></div>'
    + '<div class="rs-ec-leg" id="pn-queima-leg"></div>', 'estica');

  var medidor = cartao('Autonomia', '',
    '<div class="pn-med" id="pn-medidor"></div>'
    + '<div class="rs-g-tri pn-tri" id="pn-autonomia"></div>', 'estica');

  /* ---------------------------------------------------------------- as caixas */
  var pilha = P.pilhaDasLevas();
  var altura = Math.max(160, pilha.linhas.length * 48 + 46);
  var caixas = cartao('As Levas, Estado Por Estado',
    '<span class="rs-rot3">' + S.pct(R.gasto) + ' do acervo já foi usado</span>',
    pilha.linhas.length
      ? '<div class="rs-ec" style="height:' + altura + 'px" id="pn-pilha"></div>'
      : '<p class="rs-sem"><b>Nenhuma leva ligada</b>Ligue uma pasta na aba de '
        + 'Mídia para o material entrar no livro-caixa.</p>');

  /* O MAPA SO' VALE COM TRES OU MAIS CAIXAS. Com uma, o treemap vira um
     retangulo ocupando o cartao inteiro, que nao diz nada: ai' a leitura certa
     e' a lista com barra, que e' peca da Sala. */
  var mat = P.material();
  var fonte = cartao('O Material',
    '<span class="rs-pil ' + (P.FONTE.pronta ? 'no' : 'bl') + '">'
      + (P.FONTE.pronta ? 'Drive de pé' : 'Drive fora') + '</span>',
    (!mat.length
      ? '<p class="rs-sem"><b>Nada visível na fonte</b>'
        + S.seguro(P.FONTE.motivo || 'A fonte respondeu sem pastas.') + '</p>'
      : mat.length >= 3
        ? '<div class="rs-ec baixo" id="pn-mapa"></div>'
        : P.listaCaixas(mat))
    + '<div class="rs-ec-leg"><span><i style="background:' + S.corVar(1)
    + '"></i>Ligada no livro</span><span style="color:var(--soft)">'
    + '<i class="pn-vaz"></i>Só no Drive</span>'
    + '<span style="margin-left:auto;color:var(--soft)">'
    + S.seguro(P.FONTE.raiz || '') + '</span></div>');

  /* ---------------------------------------------------- a maquina e as travas */
  var maq = cartao('O Tempo De Máquina',
    seg('pn-janela', [[30, '30 dias'], [90, '90 dias']], janela),
    '<div class="rs-ec baixo" id="pn-maquina"></div>'
    + '<div class="rs-ec-leg" id="pn-maq-leg"></div>', 'estica');

  var travas = P.travas();
  var lista = cartao('O Que Trava A Máquina',
    '<span class="rs-pil ' + (travas.length ? 'pa' : 'no') + '">'
      + (travas.length ? travas.length + (travas.length > 1 ? ' abertas' : ' aberta')
                       : 'nada aberto') + '</span>',
    travas.length
      ? '<div class="rs-fita">' + travas.map(function (t) {
          return '<div class="rs-ev"><span class="ic ' + (t.cl || '') + '">'
            + M.ico(t.ico, 's') + '</span><span class="c"><b>' + S.seguro(t.titulo)
            + '</b><span>' + S.seguro(t.desc) + '</span></span>'
            + '<span class="q"><button class="bt mini' + (t.grave ? ' forte' : '')
            + '" type="button" data-trava="' + S.seguro(t.titulo) + '">' + t.botao
            + '</button></span></div>';
        }).join('') + '</div>'
      : '<p class="rs-sem"><b>Nada trava a máquina</b>Tem material, tem fila e a '
        + 'fonte responde. Quando algo emperrar, aparece aqui com o botão que '
        + 'resolve.</p>', 'estica');

  palco.innerHTML = topo + kpis + esteira
    + '<div class="rs-grade rs-g21">' + queima + medidor + '</div>'
    + '<div class="rs-tit"><span class="rs-rot1">O Material</span>'
    + '<span class="rs-rot3">' + S.fmt(R.acervo) + ' vídeos em ' + R.levas
    + (R.levas === 1 ? ' leva' : ' levas') + '</span></div>'
    + '<div class="rs-grade rs-g21">' + caixas + fonte + '</div>'
    + '<div class="rs-grade rs-g21">' + maq + lista + '</div>';

  /* -------------------------------------------------------------- desenhar */
  function pintaEsteira() {
    M.grafEsteira(document.getElementById('pn-esteira'), estacoes);
  }
  function pintaQueima() {
    M.grafQueima(document.getElementById('pn-queima'), E.prateleira || 0,
                 P.RITMOS, ritmo, 120);
    document.getElementById('pn-queima-leg').innerHTML =
      P.RITMOS.map(function (r, i) {
        var d = P.autonomia(r);
        return '<span' + (r === ritmo ? '' : ' style="color:var(--soft)"')
          + '><i style="background:' + S.corVar((i % 5) + 1)
          + (r === ritmo ? '' : ';opacity:.45') + '"></i>' + r + ' por dia · '
          + (d != null ? S.fmt(d) + (d === 1 ? ' dia' : ' dias') : '—') + '</span>';
      }).join('');
  }
  function pintaMedidor() {
    var d = P.autonomia(ritmo) || 0, teto = P.tetoAutonomia();
    M.grafMedidor(document.getElementById('pn-medidor'), {
      valor: Math.min(d, teto), max: teto, passos: 4, cor: S.corVar(1),
      rotulo: 'dias de estoque',
      texto: function (x) { return S.fmt(x); }
    });
    document.getElementById('pn-autonomia').innerHTML =
      [['Ritmo Medido', (P.ritmoMedido() || 0).toLocaleString('pt-BR') + '/dia'],
       ['Acaba Em', P.autonomia(ritmo) != null ? P.acaba(ritmo) : '—'],
       ['Dias Rodando', P.diasRodando(90) + ' de 90']]
      .map(function (x) {
        return '<div class="pn-p"><span class="rs-rot2">' + x[0] + '</span>'
          + '<div class="num rs-tn">' + x[1] + '</div></div>';
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
    if (pilha.linhas.length) {
      M.grafPilha(document.getElementById('pn-pilha'), pilha.linhas, pilha.series);
    }
    if (mat.length >= 3) M.grafMapa(document.getElementById('pn-mapa'), mat);
  }

  pintaEsteira(); pintaQueima(); pintaMedidor(); pintaMaquina(); pintaResto();
  S.ligarDicas(palco);

  /* ------------------------------------------------------------ os controles */
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
  ligarSeg('pn-ritmo', function (v) { ritmo = v; pintaQueima(); pintaMedidor(); });
  ligarSeg('pn-janela', function (v) { janela = v; pintaMaquina(); });

  var lido = document.getElementById('pn-lido');
  function carimbo() {
    var a = new Date();
    lido.textContent = 'lido às ' + ('0' + a.getHours()).slice(-2) + ':'
      + ('0' + a.getMinutes()).slice(-2);
  }
  carimbo();
  document.getElementById('pn-atualizar').addEventListener('click', function () {
    carimbo(); pintaEsteira(); pintaQueima(); pintaMedidor(); pintaMaquina();
    pintaResto();
  });
})();
