/* ============================================================================
   A ABA DE ANALYTICS: o desempenho de UMA conta por vez.

   NUNCA UMA VISAO GLOBAL. Cada perfil e' um negocio proprio, e somar tres perfis
   num numero so' nao ajuda a decidir nada. A tela desce na ordem em que a pergunta
   aparece: quem e' esta conta, como ela vem indo, o que puxou, e por fim a lista
   inteira do que saiu, com a publicacao isolada num painel lateral.

   O DESENHO E' O DA SALA DE CONTROLE do portal, a tela-regua da casa. As classes
   `rs-*` vem de la', trazidas pelo `04-analytics.css`, que e' gerado pelo
   `docs/propostas/analytics/portar.py`. Nada de componente novo inventado aqui:
   cartao, cartao de numero, pilula de variacao, lista com barra e segmentado sao
   os mesmos, com o mesmo nome.

   O DADO VEM DA ROTA `analytics/estado`, que fala com a API oficial do Instagram.
   O guardado do servidor serve por quinze minutos; o botao Atualizar e' quem fura
   essa espera.

   AS ARMADILHAS QUE ESTE ARQUIVO JA' CONHECE:

   1. Grafico sem largura nao desenha e nao avisa. Por isso o ResizeObserver.
   2. Linha de lista que e' `<button>` precisa de `color:inherit`, senao o navegador
      pinta o numero com a cor de botao do sistema, que e' preta, e ele some no tema
      escuro.
   3. O painel lateral mora no `body` e nao pode usar a classe `.rs-palco` para
      herdar cor: ela e' `position:fixed;inset:0` e joga o painel para a esquerda.
   4. Serie de evento (alcance, visualizacao) tem zero nos dias sem publicacao. Isso
      e' verdade e fica: buraco mentiria sobre o ritmo.
   ========================================================================== */
(function () {
  'use strict';

  var contas = [];            // as contas ligadas, para o trocador
  var conta = null;           // a escolhida
  var dado = null;            // a resposta de `analytics/estado`
  var dias = 30, metrica = 'alc', formato = '', busca = '';
  var ordem = 'alc', invertido = false, pagina = 1;
  var POR = 8;
  var grafico = null, carregou = false, buscando = false;

  /* ------------------------------------------------------------- numeros e datas */
  function n(v) { return (v || 0).toLocaleString('pt-BR'); }

  function enxuto(x) {
    return Math.abs(x - Math.round(x)) < .05 ? String(Math.round(x))
      : x.toFixed(1).replace('.', ',');
  }

  function curto(v) {
    v = v || 0;
    if (v >= 1000000) return enxuto(v / 1000000) + ' mi';
    if (v >= 1000) return enxuto(v / 1000) + ' mil';
    return String(Math.round(v));
  }

  function pct(v) { return (v || 0).toFixed(1).replace('.', ',') + '%'; }
  function segundos(v) { return (v || 0).toFixed(1).replace('.', ',') + 's'; }

  var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
             'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  /* Data sem hora o navegador le' como UTC, e no fuso de Brasilia isso volta um
     dia: "17 ago" vira "16 ago". Por isso a hora entra na marra. */
  function data(iso) {
    return new Date(String(iso).length === 10 ? iso + 'T00:00:00' : iso);
  }

  function dia(iso) {
    var d = data(iso);
    return ('0' + d.getDate()).slice(-2) + ' ' + MES[d.getMonth()];
  }

  function dataHora(iso) {
    var d = data(iso);
    return dia(iso) + ' · ' + ('0' + d.getHours()).slice(-2) + 'h'
      + ('0' + d.getMinutes()).slice(-2);
  }

  function idade(iso) {
    var h = (new Date() - data(iso)) / 86400000;
    if (h < 1) return 'hoje';
    if (h < 2) return 'ontem';
    if (h < 30) return Math.round(h) + ' dias';
    if (h < 60) return 'há 1 mês';
    return 'há ' + Math.round(h / 30) + ' meses';
  }

  function seguro(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function maiuscula(s) {
    return String(s || '').replace(/(^|\s)(\S)/g, function (x, a, b) {
      return a + b.toUpperCase();
    });
  }

  function nomeFmt(p) { return p.fmt === 'reel' ? 'Reel' : 'Carrossel'; }
  function capa(p) { return 'analytics/capa?id=' + encodeURIComponent(p.id); }

  function ico(d, cls) {
    return '<svg class="rs-i ' + (cls || 's') + '" viewBox="0 0 24 24">' + d + '</svg>';
  }
  var ICO = {
    alc: '<circle cx="12" cy="12" r="3"/><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/>',
    vis: '<path d="M4 4v16h16"/><path d="M8 16v-5M13 16V7M18 16v-8"/>',
    inter: '<path d="M20.8 6.6a5 5 0 0 0-7.1 0L12 8.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1Z"/>',
    saiu: '<rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M3 10h18M8 2v4M16 2v4"/>',
    cima: '<path d="M7 17 17 7M9 7h8v8"/>',
    baixo: '<path d="M7 7l10 10M17 9v8H9"/>',
    reto: '<path d="M5 12h14"/>'
  };

  function marcaFmt(p) {
    return p.fmt === 'reel'
      ? '<i><svg viewBox="0 0 24 24" fill="#fff"><path d="m9 7 8 5-8 5V7Z"/></svg></i>'
      : '<i><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4">'
        + '<rect x="4" y="4" width="11" height="11" rx="2"/>'
        + '<path d="M19 8v9a2 2 0 0 1-2 2H8"/></svg></i>';
  }

  /* -------------------------------------------------------- traco suave (bezier)
     Uma serie diaria sobe e desce forte, e ligada em reta vira serra. O controle da
     curva e' TRAVADO entre os dois pontos vizinhos, entao ela nao inventa um pico
     nem um vale que o dado nao tem. */
  function tracoSuave(pontos) {
    if (!pontos.length) return '';
    if (pontos.length === 1) return 'M' + pontos[0][0] + ' ' + pontos[0][1];
    var d = 'M' + pontos[0][0].toFixed(1) + ' ' + pontos[0][1].toFixed(1);
    for (var i = 0; i < pontos.length - 1; i++) {
      var p0 = pontos[i === 0 ? 0 : i - 1], p1 = pontos[i], p2 = pontos[i + 1];
      var p3 = pontos[i + 2 < pontos.length ? i + 2 : i + 1];
      var t = 0.34;
      var c1x = p1[0] + (p2[0] - p0[0]) * t / 2;
      var c1y = p1[1] + (p2[1] - p0[1]) * t / 2;
      var c2x = p2[0] - (p3[0] - p1[0]) * t / 2;
      var c2y = p2[1] - (p3[1] - p1[1]) * t / 2;
      var alto = Math.min(p1[1], p2[1]), baixo = Math.max(p1[1], p2[1]);
      c1y = Math.max(Math.min(c1y, baixo), alto);
      c2y = Math.max(Math.min(c2y, baixo), alto);
      d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' '
        + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }

  /* Com teto cru o eixo sai "822, 1,6 mil, 2,5 mil": numero quebrado que ninguem le'
     de relance. O teto sobe ate' o proximo degrau redondo. */
  function tetoRedondo(v) {
    if (v <= 0) return 1;
    var potencia = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
    var passo = v / potencia;
    var degrau = passo <= 1 ? 1 : passo <= 2 ? 2 : passo <= 2.5 ? 2.5
      : passo <= 4 ? 4 : passo <= 5 ? 5 : 10;
    return degrau * potencia;
  }

  /* =========================================================== o motor de grafico */
  function Grafico(alvo) {
    var dados = [];
    var balao = document.createElement('div');
    balao.className = 'gr-balao';
    alvo.appendChild(balao);
    var guia = document.createElement('i');
    guia.className = 'gr-guia';
    alvo.appendChild(guia);

    function pintar() {
      var larg = alvo.clientWidth, alt = alvo.clientHeight || 250;
      if (!larg || !dados.length) return;      // sem largura nao se desenha
      var esq = 52, dir = 14, topo = 18, base = alt - 30;
      var max = Math.max.apply(null, dados.map(function (p) { return p.v; }));
      var miudo = max > 0 && max <= 4;
      var teto = max <= 0 ? 1 : (miudo ? Math.ceil(max) : tetoRedondo(max * 1.1));
      var passo = dados.length > 1 ? (larg - esq - dir) / (dados.length - 1) : 0;

      function x(i) { return esq + i * passo; }
      function y(v) { return topo + (base - topo) * (1 - v / teto); }

      var pontos = dados.map(function (p, i) { return [x(i), y(p.v)]; });
      var traco = tracoSuave(pontos);
      var area = traco + ' L' + x(dados.length - 1).toFixed(1) + ' ' + base
        + ' L' + x(0).toFixed(1) + ' ' + base + ' Z';

      var degraus = miudo ? Math.max(Math.ceil(teto), 1) : 4;
      var reguas = '', rotulosY = '';
      for (var k = 0; k <= degraus; k++) {
        var v = teto / degraus * k, yy = y(v);
        reguas += '<line x1="' + esq + '" x2="' + (larg - dir) + '" y1="' + yy.toFixed(1)
          + '" y2="' + yy.toFixed(1) + '" class="gr-regua' + (k ? '' : ' gr-base')
          + '"/>';
        rotulosY += '<text x="' + (esq - 12) + '" y="' + (yy + 4).toFixed(1)
          + '" class="gr-rot gr-rot-y">' + curto(Math.round(v)) + '</text>';
      }
      var rotulosX = '', quantos = Math.min(6, dados.length);
      for (var j = 0; j < quantos; j++) {
        var idx = Math.round(j * (dados.length - 1) / (quantos - 1 || 1));
        rotulosX += '<text x="' + x(idx).toFixed(1) + '" y="' + (alt - 7)
          + '" class="gr-rot gr-rot-x">' + dia(dados[idx].dia) + '</text>';
      }

      alvo.querySelectorAll('svg').forEach(function (s) { s.remove(); });
      alvo.insertAdjacentHTML('afterbegin',
        '<svg class="gr-svg" viewBox="0 0 ' + larg + ' ' + alt + '" width="' + larg
        + '" height="' + alt + '">'
        + '<defs><linearGradient id="gr-tinta" x1="0" x2="0" y1="0" y2="1">'
        + '<stop offset="0%" stop-color="var(--accent)" stop-opacity=".26"/>'
        + '<stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>'
        + '</linearGradient></defs>'
        + reguas + rotulosY + rotulosX
        + '<path d="' + area + '" class="gr-area"/>'
        + '<path d="' + traco + '" class="gr-linha"/>'
        + '<circle class="gr-pt" r="5" cx="-99" cy="-99"/>'
        + '<rect x="0" y="0" width="' + larg + '" height="' + alt
        + '" fill="transparent" class="gr-captura"/></svg>');

      var svg = alvo.querySelector('svg');
      var pt = svg.querySelector('.gr-pt');
      svg.addEventListener('mousemove', function (ev) {
        var caixa = svg.getBoundingClientRect();
        var escala = caixa.width / larg;
        var i = Math.max(0, Math.min(dados.length - 1,
          Math.round(((ev.clientX - caixa.left) / escala - esq) / (passo || 1))));
        var p = dados[i];
        balao.innerHTML = '<b>' + n(p.v) + '</b><span>' + dia(p.dia)
          + (p.posts != null ? ' · ' + p.posts + (p.posts === 1 ? ' publicação'
            : ' publicações') : '') + '</span>';
        balao.style.left = Math.min(Math.max(x(i) * escala, 76),
          caixa.width - 76) + 'px';
        balao.style.top = (y(p.v) * escala - 14) + 'px';
        balao.classList.add('on');
        guia.style.left = (x(i) * escala) + 'px';
        guia.style.top = (topo * escala) + 'px';
        guia.style.height = ((base - topo) * escala) + 'px';
        guia.classList.add('on');
        pt.setAttribute('cx', x(i)); pt.setAttribute('cy', y(p.v));
      });
      svg.addEventListener('mouseleave', function () {
        balao.classList.remove('on');
        guia.classList.remove('on');
        pt.setAttribute('cx', -99); pt.setAttribute('cy', -99);
      });
    }

    this.dar = function (d) { dados = d; pintar(); };
    if (window.ResizeObserver) new ResizeObserver(pintar).observe(alvo);
    else window.addEventListener('resize', pintar);
  }

  /* ------------------------------------------------------------------ a serie */
  function serie() {
    if (metrica === 'seg') {
      return (dado.curva || []).slice(-(dias || 30)).map(function (p) {
        return { dia: p[0], v: p[1] };
      });
    }
    var fim = new Date(); fim.setHours(0, 0, 0, 0);
    var quantos = dias || 90, saida = [];
    for (var i = quantos - 1; i >= 0; i--) {
      var d = new Date(fim.getTime() - i * 86400000);
      var chave = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
        + '-' + ('0' + d.getDate()).slice(-2);
      var doDia = (dado.posts || []).filter(function (p) {
        var q = data(p.quando);
        return q.getFullYear() + '-' + ('0' + (q.getMonth() + 1)).slice(-2)
          + '-' + ('0' + q.getDate()).slice(-2) === chave;
      });
      saida.push({
        dia: chave, posts: doDia.length,
        v: doDia.reduce(function (t, p) { return t + (p[metrica] || 0); }, 0)
      });
    }
    return saida;
  }

  /* ============================================== o trocador de conta (combobox)
     Ancorado A DIREITA: o botao vive no canto direito do cabecalho, e ancorado a
     esquerda o balao saia da tela. Busca dentro, teclado como manda a especificacao
     de combobox: setas andam, Enter escolhe, Esc fecha. */
  function trocador() {
    var alvo = document.getElementById('an-troca');
    var filtro = '', marcado = 0;

    function retrato(c, cls) {
      return '<span class="' + cls + '">'
        + (c.avatar ? '<img src="' + seguro(c.avatar) + '" alt="">' : '') + '</span>';
    }

    alvo.innerHTML =
      '<div class="cb">'
      + '<button class="cb-bt" type="button" aria-haspopup="listbox" '
      + 'aria-expanded="false">' + retrato(conta, 'cb-av')
      + '<span class="cb-txt"><b>@' + seguro(conta.arroba) + '</b>'
      + '<small>' + (conta.mercado ? seguro(maiuscula(conta.mercado))
        : 'sem mercado definido') + '</small></span>'
      + '<svg class="cb-cv" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>'
      + '</button>'
      + '<div class="cb-m" hidden>'
      + '<div class="cb-busca">'
      + '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/>'
      + '<path d="m20 20-3.2-3.2"/></svg>'
      + '<input type="text" placeholder="Procurar conta" aria-label="Procurar conta">'
      + '</div><div class="cb-lista" role="listbox"></div>'
      + '<div class="cb-pe">' + contas.length
      + (contas.length === 1 ? ' conta ligada' : ' contas ligadas') + '</div>'
      + '</div></div>';

    var raiz = alvo.querySelector('.cb');
    var bt = raiz.querySelector('.cb-bt');
    var menu = raiz.querySelector('.cb-m');
    var campo = raiz.querySelector('.cb-busca input');
    var lista = raiz.querySelector('.cb-lista');

    function vistas() {
      var f = filtro.trim().toLowerCase();
      if (!f) return contas;
      return contas.filter(function (c) {
        return (c.arroba + ' ' + (c.mercado || '')).toLowerCase().indexOf(f) >= 0;
      });
    }

    function pintarLista() {
      var v = vistas();
      if (marcado >= v.length) marcado = Math.max(v.length - 1, 0);
      lista.innerHTML = v.length ? v.map(function (c, i) {
        return '<button class="cb-o' + (c.arroba === conta.arroba ? ' sel' : '')
          + (i === marcado ? ' mrc' : '') + '" role="option" data-u="'
          + seguro(c.arroba) + '" data-i="' + i + '">' + retrato(c, 'cb-av peq')
          + '<span class="cb-txt"><b>@' + seguro(c.arroba) + '</b><small>'
          + (c.mercado ? seguro(maiuscula(c.mercado)) : 'sem mercado definido')
          + '</small></span>'
          + (c.arroba === conta.arroba ? '<svg class="cb-ok" viewBox="0 0 24 24">'
            + '<path d="M20 6 9 17l-5-5"/></svg>' : '') + '</button>';
      }).join('') : '<div class="cb-vazio">Nenhuma conta com esse texto.</div>';
      lista.querySelectorAll('.cb-o').forEach(function (b) {
        b.addEventListener('click', function () { escolher(b.dataset.u); });
        b.addEventListener('mousemove', function () {
          marcado = +b.dataset.i;
          lista.querySelectorAll('.cb-o').forEach(function (x) {
            x.classList.toggle('mrc', x === b);
          });
        });
      });
    }

    function abrir(sim) {
      menu.hidden = !sim;
      raiz.classList.toggle('aberto', sim);
      bt.setAttribute('aria-expanded', String(sim));
      if (sim) {
        filtro = ''; campo.value = ''; marcado = 0; pintarLista();
        setTimeout(function () { campo.focus(); }, 30);
      }
    }

    function escolher(u) {
      abrir(false);
      if (u === conta.arroba) return;
      conta = contas.filter(function (c) { return c.arroba === u; })[0];
      pagina = 1; busca = '';
      document.getElementById('an-busca').value = '';
      fecharPainel();
      trocador();
      carregar();
    }

    bt.addEventListener('click', function (e) { e.stopPropagation(); abrir(menu.hidden); });
    campo.addEventListener('input', function () {
      filtro = this.value; marcado = 0; pintarLista();
    });
    campo.addEventListener('keydown', function (e) {
      var v = vistas();
      if (e.key === 'ArrowDown') marcado = Math.min(marcado + 1, v.length - 1);
      else if (e.key === 'ArrowUp') marcado = Math.max(marcado - 1, 0);
      else if (e.key === 'Enter') { if (v[marcado]) escolher(v[marcado].arroba); return; }
      else if (e.key === 'Escape') { abrir(false); bt.focus(); return; }
      else return;
      e.preventDefault(); pintarLista();
      var m = lista.querySelector('.mrc');
      if (m) m.scrollIntoView({ block: 'nearest' });
    });
    menu.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () { abrir(false); });
    pintarLista();
  }

  /* ------------------------------------------------------------- as pinturas */
  function pintarPerfil() {
    document.getElementById('an-av').innerHTML = conta.avatar
      ? '<img src="' + seguro(conta.avatar) + '" alt="">' : '';
    document.getElementById('an-nome').textContent = '@' + conta.arroba;
    /* O NOME E' O ARROBA: a Meta nao devolve nome de exibicao para estas contas, e
       inventar um seria escrever na tela o que ninguem digitou. O MERCADO vem do que
       ele digitou na aba de Contas; sem mercado, a tela diz que falta preencher. */
    document.getElementById('an-sub').innerHTML =
      '<span class="pino ok">Conectada</span><span class="sep"></span>'
      + (conta.mercado
        ? '<span class="rs-rot3">' + seguro(maiuscula(conta.mercado)) + '</span>'
        : '<span class="rs-rot3" style="opacity:.7">Sem mercado definido</span>')
      + '<span class="sep"></span><span class="rs-rot3">Ligada em '
      + dia(conta.ligada_em) + '</span>';
    document.getElementById('an-num').innerHTML =
      '<div><b class="rs-tn">' + n(dado.seguidores) + '</b>'
      + '<span class="rs-rot1">Seguidores</span></div>'
      + '<div><b class="rs-tn">' + n(dado.publicacoes) + '</b>'
      + '<span class="rs-rot1">Publicações</span></div>';
    document.getElementById('an-lido').textContent = dado.coletado_em
      ? 'lido às ' + dataHora(dado.coletado_em).split('· ')[1] : '';
  }

  /* Cartao de numero: rotulo pequeno, NUMERO GRANDE e a pilula de variacao. Sem
     grafico dentro, por ordem dele: o grafico vive no bloco de grafico. */
  function pintarKpis() {
    var r = dado.resumo || {};
    var cartoes = [
      { rot: 'Alcance', ic: ICO.alc, v: n(r.alcance), d: r.var_alcance,
        pe: 'med. ' + curto(r.mediana_alcance) },
      { rot: 'Visualizações', ic: ICO.vis, v: n(r.visualizacoes), d: r.var_visualizacoes,
        pe: r.publicados + (r.publicados === 1 ? ' post' : ' posts') },
      { rot: 'Interações', ic: ICO.inter, v: n(r.interacoes), d: r.var_interacoes,
        pe: pct(r.engajamento) + ' eng.' },
      { rot: 'Publicações', ic: ICO.saiu, v: n(r.publicados), d: r.var_publicados,
        pe: r.tempo_medio ? segundos(r.tempo_medio) + ' médios' : 'no período' }
    ];
    document.getElementById('an-kpis').innerHTML = cartoes.map(function (k) {
      var cls = k.d == null ? 'fl' : k.d > 0.5 ? 'up' : k.d < -0.5 ? 'dw' : 'fl';
      var seta = k.d == null ? ICO.reto : k.d > 0.5 ? ICO.cima
        : k.d < -0.5 ? ICO.baixo : ICO.reto;
      var pilula = k.d == null ? ''
        : '<span class="rs-delta ' + cls + '">' + ico(seta, 'xs')
          + (k.d > 0 ? '+' : '') + k.d + '%</span>';
      return '<div class="rs-cd rs-kpi">'
        + '<div class="cab">' + ico(k.ic, 's')
        + '<span class="rs-rot2">' + k.rot + '</span></div>'
        + '<div class="num rs-tn">' + k.v + '</div>'
        + '<div class="lin"><span>' + pilula
        + '<span class="rs-delta-pe">' + k.pe + '</span></span></div></div>';
    }).join('');
  }

  function pintarGrafico() {
    if (!grafico) grafico = new Grafico(document.getElementById('an-grafico'));
    grafico.dar(serie());
  }

  /* PERIODO VAZIO NAO E' DEFEITO, mas parece um. Uma conta que publicou ha' tres
     meses abre "30 dias" com quatro zeros e uma tela morta, e ele leu isso como bug.
     Entao o vazio DIZ o que aconteceu e oferece o caminho: ver o periodo inteiro. */
  function vazioExplicado() {
    if (!dado.total_posts) {
      return '<p class="rs-sem">Esta conta ainda não publicou nada.</p>';
    }
    if (!dado.ultima) return '<p class="rs-sem">Nada saiu no período.</p>';
    return '<p class="rs-sem">Nada saiu neste período. A última publicação foi '
      + idade(dado.ultima) + ', em ' + dia(dado.ultima) + '.'
      + ' <button class="an-vertudo" type="button">Ver o período inteiro</button></p>';
  }

  function ligarVerTudo(alvo) {
    var b = alvo.querySelector('.an-vertudo');
    if (b) b.addEventListener('click', function () {
      document.querySelector('#an-periodo [data-d="0"]').click();
    });
  }

  function pintarTops() {
    var lista = (dado.posts || []).slice()
      .sort(function (a, b) { return b.alc - a.alc; }).slice(0, 5);
    var alvo = document.getElementById('an-tops');
    if (!lista.length) {
      alvo.innerHTML = vazioExplicado();
      ligarVerTudo(alvo);
      return;
    }
    var max = Math.max.apply(null, lista.map(function (p) { return p.alc; })
      .concat([1]));
    var total = (dado.resumo || {}).alcance || 1;
    alvo.innerHTML = '<div class="rs-lista">' + lista.map(function (p) {
      return '<button class="rs-li an-l" data-id="' + seguro(p.id) + '">'
        + '<span class="lg"><img src="' + capa(p) + '" alt="">' + marcaFmt(p) + '</span>'
        + '<span class="nm"><b>' + seguro(p.legenda || 'Sem legenda') + '</b>'
        + nomeFmt(p) + ' · ' + idade(p.quando) + '</span>'
        + '<span class="vl rs-tn">' + n(p.alc)
        + '<small>' + pct(p.alc / total * 100) + ' do período</small></span>'
        + '<span class="rs-li-tr"><i style="width:' + (p.alc / max * 100).toFixed(1)
        + '%;background:linear-gradient(90deg,'
        + 'color-mix(in srgb,var(--rs-1) 45%,transparent),var(--rs-1))"></i></span>'
        + '</button>';
    }).join('') + '</div>';
    alvo.querySelectorAll('.an-l').forEach(function (b) {
      b.addEventListener('click', function () { abrir(b.dataset.id); });
      ligarPrevia(b, achar(b.dataset.id));
    });
  }

  function pintarFormatos() {
    var lista = dado.posts || [];
    var alvo = document.getElementById('an-fmt');
    if (!lista.length) {
      alvo.innerHTML = vazioExplicado();
      ligarVerTudo(alvo);
      return;
    }
    var reels = lista.filter(function (p) { return p.fmt === 'reel'; });
    var carr = lista.filter(function (p) { return p.fmt !== 'reel'; });
    function medio(l) {
      return l.length ? Math.round(l.reduce(function (t, p) {
        return t + (p.alc || 0);
      }, 0) / l.length) : 0;
    }
    var maior = Math.max(medio(reels), medio(carr), 1);
    function item(nome, l, cor) {
      var m = medio(l);
      return '<div class="rs-li semi"><span class="nm"><b>' + nome + '</b>'
        + l.length + (l.length === 1 ? ' publicação' : ' publicações') + '</span>'
        + '<span class="vl rs-tn">' + n(m) + '<small>alcance médio</small></span>'
        + '<span class="rs-li-tr"><i style="width:' + (m / maior * 100).toFixed(1)
        + '%;background:linear-gradient(90deg,color-mix(in srgb,' + cor
        + ' 45%,transparent),' + cor + ')"></i></span></div>';
    }
    var pe = '';
    if (reels.length && carr.length) {
      var venc = medio(reels) >= medio(carr) ? 'Reel' : 'Carrossel';
      var quanto = Math.max(medio(reels), medio(carr))
        / Math.max(Math.min(medio(reels), medio(carr)), 1);
      pe = '<div class="an-pe">No período, <b>' + venc + '</b> entrega <b>'
        + quanto.toFixed(1).replace('.', ',') + 'x</b> mais alcance por publicação '
        + 'nesta conta.</div>';
    }
    /* FORMATO SEM PUBLICACAO NAO GANHA LINHA. "Carrossel 0, alcance medio 0" ocupa
       espaco para dizer que nao aconteceu nada, e o que nao aconteceu nao decide
       nada. Mesma regra da lista da sala de controle. */
    alvo.innerHTML = '<div class="rs-lista">'
      + (reels.length ? item('Reel', reels, 'var(--rs-1)') : '')
      + (carr.length ? item('Carrossel', carr, 'var(--rs-2)') : '')
      + '</div>' + pe;
  }

  /* --------------------------------------------------------------- a previa */
  var previa = null, previaTempo = null;

  function ligarPrevia(elemento, post) {
    if (!post) return;
    elemento.addEventListener('mouseenter', function () {
      clearTimeout(previaTempo);
      previaTempo = setTimeout(function () { mostrarPrevia(elemento, post); }, 240);
    });
    elemento.addEventListener('mouseleave', function () {
      clearTimeout(previaTempo); esconderPrevia();
    });
  }

  function mostrarPrevia(elemento, post) {
    if (!previa) {
      previa = document.createElement('div');
      previa.className = 'prev';
      document.body.appendChild(previa);
    }
    previa.innerHTML =
      '<div class="prev-capa"><img src="' + capa(post) + '" alt="">'
      + (post.fmt === 'reel'
        ? '<div class="prev-play"><i><svg viewBox="0 0 24 24">'
          + '<path d="m8 5 12 7-12 7V5Z"/></svg></i></div>'
          + (post.medio ? '<span class="prev-dur">' + segundos(post.medio)
            + ' médios</span>' : '')
        : '')
      + '</div><div class="prev-b">'
      + '<div class="lin">Alcance<b>' + n(post.alc) + '</b></div>'
      + '<div class="lin">Visualizações<b>' + n(post.vis) + '</b></div>'
      + '<div class="lin">Engajamento<b>' + pct(post.eng) + '</b></div>'
      + '<div class="lin">Salvamentos<b>' + n(post.sal) + '</b></div>'
      + '</div>';

    var caixa = elemento.getBoundingClientRect(), largura = 230, folga = 12;
    var esquerda = caixa.right + folga;
    if (esquerda + largura > window.innerWidth - 8) {
      esquerda = caixa.left - largura - folga;
    }
    previa.style.left = Math.max(esquerda, 8) + 'px';
    previa.style.top = Math.min(Math.max(caixa.top - 30, 12),
      window.innerHeight - previa.offsetHeight - 12) + 'px';
    previa.classList.add('on');
  }

  function esconderPrevia() { if (previa) previa.classList.remove('on'); }

  /* ------------------------------------------------------------- o painel lateral
     O "side peek": entra pela direita, deixa a lista visivel atras e tem seta para
     andar de publicacao em publicacao sem fechar. Dentro dele nao ha' desenho novo:
     cada numero e' o cartao `.rs-kpi`, com a comparacao contra a mediana da propria
     conta dentro da pilula. */
  var painel = null, andarAtual = null;

  function abrir(ident) {
    var lista = filtradas();
    var post = achar(ident);
    if (!post) return;
    esconderPrevia();
    var i = Math.max(lista.map(function (p) { return p.id; }).indexOf(ident), 0);
    if (!painel) {
      painel = document.createElement('div');
      painel.className = 'sp-fora';
      painel.innerHTML = '<div class="sp-veu"></div>'
        + '<aside class="sp" role="dialog" aria-label="Métricas da publicação"></aside>';
      document.body.appendChild(painel);
      painel.querySelector('.sp-veu').addEventListener('click', fecharPainel);
      document.addEventListener('keydown', function (e) {
        if (!painel.classList.contains('on')) return;
        if (e.key === 'Escape') fecharPainel();
        if (e.key === 'ArrowDown' && andarAtual) { e.preventDefault(); andarAtual(1); }
        if (e.key === 'ArrowUp' && andarAtual) { e.preventDefault(); andarAtual(-1); }
      });
    }
    var pos = i;
    andarAtual = function (passo) {
      var j = pos + passo;
      if (j < 0 || j >= lista.length) return;
      pos = j;
      pintarPainel(lista[j], j, lista);
    };
    pintarPainel(lista[i], i, lista);
    /* Reflow forcado no lugar de requestAnimationFrame: com a janela em segundo
       plano o navegador segura o rAF, e o painel ficava montado e invisivel. */
    void painel.offsetHeight;
    painel.classList.add('on');
  }

  function fecharPainel() { if (painel) painel.classList.remove('on'); }

  function mediana(campo) {
    var v = (dado.posts || []).map(function (p) { return p[campo] || 0; })
      .sort(function (a, b) { return a - b; });
    if (!v.length) return 0;
    var m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
  }

  function pintarPainel(post, i, lista) {
    var med = {
      alc: mediana('alc'), vis: mediana('vis'), inter: mediana('inter'),
      sal: mediana('sal'), cmp: mediana('cmp'), cur: mediana('cur'),
      com: mediana('com')
    };
    function cartao(rot, valor, v, m) {
      var pilula = '';
      if (m) {
        var r = v / m;
        var cls = r >= 1.15 ? 'up' : (r <= .85 ? 'dw' : 'fl');
        var seta = r >= 1.15 ? ICO.cima : r <= .85 ? ICO.baixo : ICO.reto;
        var txt = r >= 1 ? r.toFixed(1).replace('.', ',') + 'x'
          : '-' + Math.round((1 - r) * 100) + '%';
        pilula = '<span class="rs-delta ' + cls + '">' + ico(seta, 'xs') + txt
          + '</span><span class="rs-delta-pe">contra a mediana</span>';
      }
      return '<div class="rs-cd rs-kpi sp-k"><span class="rs-rot2">' + rot + '</span>'
        + '<div class="num rs-tn">' + valor + '</div>'
        + '<div class="lin"><span>' + pilula + '</span></div></div>';
    }

    painel.querySelector('.sp').innerHTML =
      '<header class="sp-cab"><div class="sp-andar">'
      + '<button class="sp-ic" data-andar="-1"' + (i === 0 ? ' disabled' : '')
      + ' aria-label="Publicação anterior">'
      + '<svg viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"/></svg></button>'
      + '<button class="sp-ic" data-andar="1"'
      + (i === lista.length - 1 ? ' disabled' : '')
      + ' aria-label="Próxima publicação">'
      + '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>'
      + '<span class="sp-pos rs-tn">' + (i + 1) + ' de ' + lista.length + '</span>'
      + (post.endereco ? '<a class="sp-ic" href="' + seguro(post.endereco)
        + '" target="_blank" rel="noopener" aria-label="Abrir no Instagram">'
        + '<svg viewBox="0 0 24 24"><path d="M15 4h5v5"/><path d="M20 4 13 11"/>'
        + '<path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4"/>'
        + '</svg></a>' : '')
      + '<button class="sp-ic sp-x" aria-label="Fechar">'
      + '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
      + '</div>'
      + '<div class="sp-topo"><span class="sp-mini">'
      + '<img src="' + capa(post) + '" alt="">' + marcaFmt(post) + '</span>'
      + '<div class="sp-tit"><h3>' + seguro(post.legenda || 'Sem legenda') + '</h3>'
      + '<p class="rs-rot3">' + nomeFmt(post) + ' · ' + dataHora(post.quando)
      + ' · @' + seguro(dado.arroba) + '</p></div></div></header>'
      + '<div class="sp-corpo">'
      + '<div class="sp-grade">'
      + cartao('Alcance', n(post.alc), post.alc, med.alc)
      + cartao('Visualizações', n(post.vis), post.vis, med.vis)
      + '</div>'
      + '<div class="sp-secao rs-rot2">Como A Audiência Reagiu</div>'
      + '<div class="sp-grade">'
      + cartao('Curtidas', n(post.cur), post.cur, med.cur)
      + cartao('Comentários', n(post.com), post.com, med.com)
      + cartao('Salvamentos', n(post.sal), post.sal, med.sal)
      + cartao('Compartilhamentos', n(post.cmp), post.cmp, med.cmp)
      + '</div>'
      + (post.fmt === 'reel' && post.medio
        ? '<div class="sp-secao rs-rot2">Quanto Do Vídeo Foi Assistido</div>'
          + '<div class="rs-cd sp-ret"><div class="sp-ret-topo">'
          + '<b class="rs-tn">' + segundos(post.medio) + '</b>'
          + '<span class="rs-rot3">tempo médio assistido</span></div></div>'
        : '')
      + '<div class="sp-secao rs-rot2">O Que Isto Rendeu</div>'
      + '<div class="sp-grade">'
      + cartao('Interações', n(post.inter), post.inter, med.inter)
      + cartao('Engajamento', pct(post.eng), 0, 0)
      + '</div></div>';

    painel.querySelector('.sp-x').addEventListener('click', fecharPainel);
    painel.querySelectorAll('[data-andar]').forEach(function (b) {
      b.addEventListener('click', function () { andarAtual(+b.dataset.andar); });
    });
    var corpo = painel.querySelector('.sp-corpo');
    corpo.scrollTop = 0;
    corpo.classList.remove('entra');
    void corpo.offsetHeight;
    corpo.classList.add('entra');
  }

  /* ---------------------------------------------------------------- a tabela */
  function achar(ident) {
    return (dado.posts || []).filter(function (p) { return p.id === ident; })[0];
  }

  function filtradas() {
    var lista = (dado.posts || []).slice();
    if (formato) lista = lista.filter(function (p) {
      return formato === 'reel' ? p.fmt === 'reel' : p.fmt !== 'reel';
    });
    if (busca) {
      var b = busca.toLowerCase();
      lista = lista.filter(function (p) {
        return (p.legenda || '').toLowerCase().indexOf(b) >= 0;
      });
    }
    lista.sort(function (x, y) {
      var a = ordem === 'quando' ? data(x.quando) : x[ordem];
      var b2 = ordem === 'quando' ? data(y.quando) : y[ordem];
      return invertido ? a - b2 : b2 - a;
    });
    return lista;
  }

  function pintarTabela() {
    var lista = filtradas(), total = lista.length;
    var paginas = Math.max(Math.ceil(total / POR), 1);
    if (pagina > paginas) pagina = paginas;
    var ini = (pagina - 1) * POR, pedaco = lista.slice(ini, ini + POR);

    document.getElementById('an-linhas').innerHTML = pedaco.length
      ? pedaco.map(function (p) {
        return '<tr data-id="' + seguro(p.id) + '">'
          + '<td><div class="an-post"><span class="an-mini">'
          + '<img src="' + capa(p) + '" alt="">' + marcaFmt(p) + '</span>'
          + '<div class="an-post-txt"><b>' + seguro(p.legenda || 'Sem legenda') + '</b>'
          + '<span>' + nomeFmt(p) + '</span></div></div></td>'
          + '<td><b style="font-size:13px">' + dia(p.quando) + '</b><br>'
          + '<span class="rs-rot3" style="font-size:11.5px">' + idade(p.quando)
          + '</span></td>'
          + '<td class="n destaque rs-tn">' + n(p.alc) + '</td>'
          + '<td class="n rs-tn">' + n(p.vis) + '</td>'
          + '<td class="n rs-tn">' + pct(p.eng) + '</td>'
          + '<td class="n rs-tn">' + n(p.sal) + '</td>'
          + '<td class="n"><button class="an-bt" data-id="' + seguro(p.id) + '">'
          + '<span>Abrir</span>'
          + '<svg viewBox="0 0 24 24"><path d="M15 4h5v5"/><path d="M20 4 13 11"/>'
          + '<path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4"/>'
          + '</svg></button></td></tr>';
      }).join('')
      : '<tr><td colspan="7"><div class="vazio">'
        + ((busca || formato) ? 'Nenhuma publicação com esses filtros.'
          : vazioExplicado()) + '</div></td></tr>';

    document.getElementById('an-conta-pag').textContent = total
      ? (ini + 1) + ' a ' + Math.min(ini + POR, total) + ' de ' + total + ' publicações'
      : 'Nenhuma publicação';

    var b = '<button class="an-pg" data-p="' + (pagina - 1) + '"'
      + (pagina === 1 ? ' disabled' : '')
      + '><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>';
    for (var i = 1; i <= paginas; i++) {
      b += '<button class="an-pg' + (i === pagina ? ' on' : '') + '" data-p="' + i
        + '">' + i + '</button>';
    }
    b += '<button class="an-pg" data-p="' + (pagina + 1) + '"'
      + (pagina === paginas ? ' disabled' : '')
      + '><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>';
    document.getElementById('an-paginas').innerHTML = b;

    document.querySelectorAll('#an-paginas .an-pg').forEach(function (x) {
      x.addEventListener('click', function () { pagina = +x.dataset.p; pintarTabela(); });
    });
    document.querySelectorAll('#an-linhas .an-bt').forEach(function (x) {
      x.addEventListener('click', function (e) { e.stopPropagation(); abrir(x.dataset.id); });
    });
    document.querySelectorAll('#an-linhas .an-mini').forEach(function (m) {
      ligarPrevia(m, achar(m.closest('tr').dataset.id));
    });
    ligarVerTudo(document.getElementById('an-linhas'));
  }

  /* -------------------------------------------------------------- o carregamento */
  function tudo() {
    pintarPerfil(); pintarKpis(); pintarGrafico(); pintarTops();
    pintarFormatos(); pintarTabela();
  }

  function esqueleto(texto) {
    document.getElementById('an-kpis').innerHTML =
      '<div class="rs-cd rs-kpi" style="grid-column:1/-1">'
      + '<span class="rs-rot2">' + texto + '</span></div>';
  }

  function carregar(atualizar) {
    if (buscando) return;
    buscando = true;
    var bt = document.getElementById('an-atualizar');
    bt.disabled = true;
    if (!dado) esqueleto('Perguntando ao Instagram');
    fetch('analytics/estado?u=' + encodeURIComponent(conta.arroba)
      + '&dias=' + dias + (atualizar ? '&atualizar=1' : ''))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        buscando = false; bt.disabled = false;
        if (d.erro) {
          esqueleto('A Meta recusou: ' + seguro(d.erro));
          return;
        }
        dado = d;
        tudo();
      })
      .catch(function () {
        buscando = false; bt.disabled = false;
        esqueleto('Não deu para falar com o servidor');
      });
  }

  function segmentado(id, aoEscolher) {
    document.getElementById(id).addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      this.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on'); aoEscolher(b);
    });
  }

  segmentado('an-periodo', function (b) {
    dias = +b.dataset.d; pagina = 1; carregar();
  });
  segmentado('an-metrica', function (b) { metrica = b.dataset.m; pintarGrafico(); });
  segmentado('an-formato', function (b) {
    formato = b.dataset.f; pagina = 1; pintarTabela();
  });

  document.querySelectorAll('#pag-analytics .an-ord').forEach(function (th) {
    th.addEventListener('click', function () {
      if (ordem === th.dataset.o) invertido = !invertido;
      else { ordem = th.dataset.o; invertido = false; }
      document.querySelectorAll('#pag-analytics .an-ord').forEach(function (x) {
        x.classList.toggle('on', x === th);
        x.querySelector('i').textContent = (x === th && invertido) ? '↑' : '↓';
      });
      pagina = 1; pintarTabela();
    });
  });

  document.getElementById('an-busca').addEventListener('input', function () {
    busca = this.value.trim(); pagina = 1; pintarTabela();
  });
  document.getElementById('an-atualizar').addEventListener('click', function () {
    carregar(true);
  });
  window.addEventListener('scroll', esconderPrevia, { passive: true });

  /* A ABA SO' BUSCA QUANDO ABRE. Carregar no boot faria toda entrada no painel
     gastar cota da Meta por uma tela que ninguem esta' olhando. */
  window.abrirAnalytics = function () {
    if (carregou) return;
    carregou = true;
    esqueleto('Carregando as contas');
    Promise.all([
      fetch('contas/estado').then(function (r) { return r.json(); }),
      fetch('contas/meta').then(function (r) { return r.json(); })
        .catch(function () { return { contas: {} }; })
    ]).then(function (r) {
      var estado = r[0], meta = (r[1] || {}).contas || {};
      contas = (estado.contas || []).map(function (c) {
        return {
          arroba: c.arroba,
          avatar: c.avatar,
          ligada_em: c.ligada_em,
          mercado: (meta[c.arroba] || {}).mercado || ''
        };
      });
      if (!contas.length) {
        esqueleto('Nenhuma conta ligada ainda');
        return;
      }
      conta = contas[0];
      trocador();
      carregar();
    }).catch(function () {
      carregou = false;
      esqueleto('Não deu para ler as contas');
    });
  };
})();
