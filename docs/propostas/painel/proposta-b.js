/* ======================================================= PROPOSTA B · O TANQUE
   A LEITURA E' DE VOLUME, e nao de caminho. A pergunta que esta tela responde
   primeiro e' "quanto combustivel ainda tem, e ate' quando". Por isso a peca
   maior e' o medidor de autonomia, e a esteira entra pequena, em pe', do lado.

   A DIFERENCA PARA A PROPOSTA A nao e' de cor: e' de ordem. La' o caminho manda
   e o volume explica; aqui o volume manda e o caminho explica.
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
    + '<p class="pn-sub">Quanto material tem no tanque, e até quando ele dura.</p>'
    + '</div><div class="rs-dir">'
    + '<span class="rs-rot3" id="pn-lido"></span>'
    + '<button class="bt" id="pn-atualizar" type="button">'
    + M.ico('refresh-cw', 'xs') + 'Atualizar</button>'
    + '<button class="btn brasa" id="pn-programar" type="button">'
    + '<svg class="seta seta-esq" viewBox="0 0 24 24"><use href="#i-seta"/></svg>'
    + '<span class="txt"><svg class="ag-selo" aria-hidden="true">'
    + '<use href="#i-agenda"/></svg>Programar</span><span class="circ"></span>'
    + '<svg class="seta seta-dir" viewBox="0 0 24 24"><use href="#i-seta"/></svg>'
    + '</button></div></div>';

  /* ------------------------------------------------- O TANQUE: a peca grande
     Medidor gigante a' esquerda, e a' direita a esteira em pe', que e' a peca do
     funil DA PROPRIA SALA (`S.funil`), com a queda entre estacoes e a marcacao
     do gargalo. Nao e' o mesmo desenho da proposta A, que usa o funil deitado. */
  var estacoes = P.estacoes();
  var tanque = '<div class="pn-b-topo">'
    + '<div class="rs-cd pn-b-med"><div class="rs-cd-h"><h3>O Tanque</h3>'
    + '<div class="rs-dir">'
    + seg('pn-ritmo', P.RITMOS.map(function (r) { return [r, r + '/dia']; }), ritmo)
    + '</div></div><div class="rs-cd-b">'
    + '<div class="pn-b-med-g" id="pn-medidor"></div>'
    + '<div class="pn-b-num" id="pn-num"></div></div></div>'
    + cartao('Onde O Vídeo Está',
        '<span class="rs-rot3">' + S.fmt(R.acervo) + ' no livro</span>',
        '<div id="pn-funil"></div>', 'pn-b-fun')
    + '</div>';

  /* -------------------------------------------------------- a curva de queima */
  var queima = cartao('A Queima Do Estoque',
    '<span class="rs-rot3">' + S.fmt(E.prateleira || 0)
      + ' na prateleira hoje</span>',
    '<div class="rs-ec baixo" id="pn-queima"></div>'
    + '<div class="rs-ec-leg" id="pn-queima-leg"></div>');

  /* -------------------------------------------------------------- as levas
     Tres leituras do mesmo acervo, lado a lado: quanto cada leva pesa (rosca),
     quanto de cada uma ja' foi gasto (barra) e o gasto do acervo inteiro (arco). */
  var levas = P.levasOrdenadas();
  var comMaterial = levas.filter(function (x) { return x.total; });
  /* COM UMA LEVA SO', a rosca vira um anel inteiro de uma cor, que nao informa
     nada. Ai' a leitura util e' outra: ha' quanto tempo cada caixa esta' ligada
     sem andar. Material encalhado e' o defeito que esta tela existe para achar. */
  var umaSo = comMaterial.length < 2;
  var rosca = cartao(umaSo ? 'Há Quanto Tempo Está Ligada' : 'O Peso De Cada Leva',
    umaSo ? '<span class="rs-rot3">em dias</span>' : '',
    levas.length
      ? '<div class="rs-ec rosca" id="pn-rosca"></div>'
      : '<p class="rs-sem"><b>Nenhuma leva ligada</b>Ligue uma pasta para o '
        + 'material entrar no livro.</p>');

  var gasto = cartao('Quanto Já Foi Gasto', '',
    '<div class="pn-b-arco" id="pn-arco"></div>'
    + '<p class="pn-b-nota" id="pn-arco-nota"></p>');

  var consumo = cartao('Leva Por Leva', '',
    levas.length
      ? P.listaCaixas(levas.map(function (x) {
          return { nome: x.nome, videos: x.total, ligada: true, conta: x.conta };
        }))
      : '<p class="rs-sem"><b>Sem material</b>Nada foi anotado no livro-caixa.</p>');

  /* ------------------------------------------------------------- a maquina */
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
            + '" type="button">' + t.botao + '</button></span></div>';
        }).join('') + '</div>'
      : '<p class="rs-sem"><b>Nada trava a máquina</b>Tem material, tem fila e a '
        + 'fonte responde.</p>', 'estica');

  palco.innerHTML = topo + tanque + queima
    + '<div class="rs-tit"><span class="rs-rot1">O Acervo</span>'
    + '<span class="rs-rot3">' + R.levas + (R.levas === 1 ? ' leva ligada'
        : ' levas ligadas') + ' · ' + S.pct(R.gasto) + ' usado</span></div>'
    + '<div class="rs-grade rs-g3">' + rosca + gasto + consumo + '</div>'
    + '<div class="rs-grade rs-g21">' + maq + lista + '</div>';

  /* ------------------------------------------------------------------ pintar */
  function pintaMedidor() {
    var d = P.autonomia(ritmo) || 0, teto = P.tetoAutonomia();
    M.grafMedidor(document.getElementById('pn-medidor'), {
      valor: Math.min(d, teto), max: teto, passos: 4, cor: S.corVar(1),
      rotulo: 'dias no ritmo de ' + ritmo + ' por dia',
      texto: function (x) { return S.fmt(x); }
    });
    document.getElementById('pn-num').innerHTML =
      [['Na Prateleira', S.fmt(E.prateleira || 0), 'box'],
       ['Acaba Em', P.autonomia(ritmo) != null ? P.acaba(ritmo) : '—', 'clock'],
       ['Ritmo Medido', (P.ritmoMedido() || 0).toLocaleString('pt-BR') + '/dia', 'zap'],
       ['Parada Há', R.parada ? R.parada + ' dias' : '—', 'circle-slash']]
      .map(function (x) {
        return '<div class="pn-p"><span class="rs-rot2">' + M.ico(x[2], 'xs') + x[0]
          + '</span><div class="num rs-tn">' + x[1] + '</div></div>';
      }).join('');
  }
  function pintaFunil() {
    document.getElementById('pn-funil').innerHTML =
      S.funil(estacoes, S.corVar(1))
      + (E.erro
          ? '<div class="pn-b-erro">' + M.ico('triangle-alert', 'xs')
            + '<b>' + S.fmt(E.erro) + '</b> caíram fora da esteira com erro</div>'
          : '<div class="pn-b-ok">' + M.ico('disc', 'xs')
            + 'Nenhum vídeo caiu fora da esteira</div>');
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
  function pintaAcervo() {
    if (levas.length) {
      if (umaSo) {
        S.grafBarraH(document.getElementById('pn-rosca'),
          levas.map(function (x) { return [x.nome, x.dias]; }),
          S.corVar(4), 'Dias Ligada');
      } else {
        S.grafRosca(document.getElementById('pn-rosca'),
          comMaterial.slice(0, 5).map(function (x, i) {
            return { nome: x.nome, valor: x.total, cor: S.corVar((i % 5) + 1) };
          }));
      }
    }
    M.grafArco(document.getElementById('pn-arco'), {
      valor: R.gasto, max: 100, cor: S.corVar(3),
      texto: function (x) { return Math.round(x) + '%'; }
    });
    document.getElementById('pn-arco-nota').innerHTML =
      R.gasto ? '<b>' + S.fmt(E.programado + E.publicado) + '</b> de '
          + S.fmt(R.acervo) + ' vídeos já saíram da prateleira'
        : 'Nenhum vídeo saiu da prateleira ainda. O acervo está inteiro.';
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

  pintaMedidor(); pintaFunil(); pintaQueima(); pintaAcervo(); pintaMaquina();
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
  ligarSeg('pn-ritmo', function (v) { ritmo = v; pintaMedidor(); pintaQueima(); });
  ligarSeg('pn-janela', function (v) { janela = v; pintaMaquina(); });

  var lido = document.getElementById('pn-lido');
  function carimbo() {
    var a = new Date();
    lido.textContent = 'lido às ' + ('0' + a.getHours()).slice(-2) + ':'
      + ('0' + a.getMinutes()).slice(-2);
  }
  carimbo();
  document.getElementById('pn-atualizar').addEventListener('click', function () {
    carimbo(); pintaMedidor(); pintaFunil(); pintaQueima(); pintaAcervo();
    pintaMaquina();
  });
})();
