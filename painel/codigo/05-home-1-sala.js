/* GERADO A PARTIR DE `docs/propostas/painel/sala.js`. Ordem numerica e lei.
   ============================================================================
   A SALA DE CONTROLE, PORTADA PARA O PAINEL.

   PORTE FIEL de `borusa-iscas/componentes/rastreio/` (comum.tsx, Graficos.tsx),
   a tela que ele mandou olhar em 11/09/2026 depois de reprovar seis layouts:
   "olha como está na aba de Analytics do repositório de iscas".

   O QUE EU TINHA ERRADO, e que este arquivo conserta:

   1. OS GRAFICOS ERAM SVG DESENHADO NA MAO. La' eles sao feitos com ECharts, e o
      comentario do arquivo original diz por que, com data: a cobranca de 27/08
      ("passo o mouse em cima e nao consigo ler nada, alem do grafico ter sido mal
      criado"). Dica ao passar o mouse, linha guia, escala, gradiente e animacao
      vem da biblioteca.
   2. EU PUS GRAFICO GRANDE DENTRO DO CARTAO DE NUMERO. No original a minicurva e'
      de 92 por 30, na linha de baixo, ao lado da pilula. E serie toda em zero NAO
      VIRA DESENHO: reta colorida parece dado.
   3. EU INVENTEI GRADE. A casa ja' tem `.rs-grade` com `.rs-g4`, `.rs-g21` e
      `.rs-g3`, e secao com titulo em `.rs-tit`.

   Nada aqui foi redesenhado: as opcoes de cada grafico sao as mesmas do original,
   traduzidas de TSX para JavaScript puro, que e' a base do painel.
   ========================================================================== */
(function () {
  'use strict';

  var S = {};

  /* ------------------------------------------------------------ numeros */
  S.fmt = function (n) { return Math.round(n || 0).toLocaleString('pt-BR'); };
  S.pct = function (n) {
    return (Math.round((n || 0) * 10) / 10).toLocaleString('pt-BR') + '%';
  };
  S.curto = function (v) {
    v = v || 0;
    if (v >= 1000000) return (v / 1000000).toFixed(1).replace('.', ',') + ' mi';
    if (v >= 1000) return (v / 1000).toFixed(1).replace('.', ',') + ' mil';
    return String(Math.round(v));
  };
  S.seguro = function (t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  /* -------------------------------------------------------------- as cores
     `corVar` devolve a variavel, e vai para CSS e SVG. `corDado` resolve para o
     valor de verdade, e serve so' para o que precisa de numero: canvas nao sabe o
     que e' `var()`. Passar `var(--rs-2)` para o grafico derruba a tela inteira, e
     foi assim que o painel da Prospeccao caiu em 01/09/2026. */
  /* A RAIZ DAS VARIAVEIS E' A PROPRIA ABA. Na maquete era `.rs-casa`; aqui e'
     `#pag-painel`, que leva a classe `rs` e por isso carrega `--rs-1` ate'
     `--rs-trilho`. Resolver na raiz do documento devolveria vazio, e o mapa de
     calor sairia transparente. */
  function raiz() {
    return document.getElementById('pag-painel') || document.documentElement;
  }
  S.corVar = function (n) { return 'var(--rs-' + n + ')'; };
  S.corDado = function (n) {
    return getComputedStyle(raiz()).getPropertyValue('--rs-' + n).trim() || '#3F7D53';
  };
  S.varTema = function (nome) {
    return getComputedStyle(raiz()).getPropertyValue(nome).trim();
  };
  S.corFraca = function (cor, p) {
    return 'color-mix(in srgb, ' + cor + ' ' + p + '%, transparent)';
  };
  S.tinta = function (cor) {
    if (!cor || cor.indexOf('var(') !== 0) return cor;
    var dentro = cor.slice(4, -1), v = dentro.indexOf(',');
    var nome = (v < 0 ? dentro : dentro.slice(0, v)).trim();
    var reserva = v < 0 ? '' : dentro.slice(v + 1).trim();
    return getComputedStyle(raiz()).getPropertyValue(nome).trim() || reserva || '#3F7D53';
  };
  S.alfa = function (cor, a) {
    var h = (cor || '').trim().replace('#', '');
    if (h.length < 6) return cor;
    return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16)
      + ',' + parseInt(h.slice(4, 6), 16) + ',' + a + ')';
  };

  /* ------------------------------------------------------------- simbolos */
  var LU = {
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    video: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>',
    send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    'triangle-alert': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    'arrow-up-right': '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    'arrow-down-right': '<path d="m7 7 10 10"/><path d="M17 7v10H7"/>',
    ellipsis: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
  };
  S.ico = function (nome, cls) {
    return '<svg class="rs-i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" '
      + 'aria-hidden="true">' + (LU[nome] || '') + '</svg>';
  };

  /* ----------------------------------------------------------- a minicurva
     92 por 30, com gradiente proprio por curva. SERIE TODA EM ZERO NAO VIRA
     DESENHO: reta colorida no meio do cartao parece dado. */
  var contaSpark = 0;
  S.sparkline = function (vals, cor, w, h, cls) {
    if (!vals || !vals.some(function (v) { return v > 0; })) return '';
    w = w || 92; h = h || 30;
    var max = Math.max.apply(null, vals.concat([1]));
    var dx = w / Math.max(1, vals.length - 1);
    var pts = vals.map(function (v, i) { return [i * dx, h - 2.5 - (v / max) * (h - 7)]; });
    var linha = pts.map(function (p, i) {
      return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('');
    var gid = 'sp' + (++contaSpark);
    var fim = pts[pts.length - 1] || [0, h];
    return '<svg class="' + (cls || 'rs-spark') + '" viewBox="0 0 ' + w + ' ' + h
      + '" preserveAspectRatio="none" aria-hidden="true">'
      + '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="' + cor + '" stop-opacity=".34"/>'
      + '<stop offset="1" stop-color="' + cor + '" stop-opacity="0"/></linearGradient></defs>'
      + '<path d="' + linha + 'L' + w + ' ' + h + 'L0 ' + h + 'Z" fill="url(#' + gid + ')"/>'
      + '<path d="' + linha + '" fill="none" stroke="' + cor + '" stroke-width="1.9" '
      + 'vector-effect="non-scaling-stroke" stroke-linejoin="round"/>'
      + '<circle cx="' + fim[0].toFixed(1) + '" cy="' + fim[1].toFixed(1) + '" r="2.2" '
      + 'fill="' + cor + '" vector-effect="non-scaling-stroke"/></svg>';
  };

  /* -------------------------------------------------------- cartao de numero */
  S.kpi = function (k) {
    var d = k.delta;
    var cls = d == null ? 'fl' : d > 0.5 ? 'up' : d < -0.5 ? 'dw' : 'fl';
    var seta = d == null ? 'ellipsis' : d > 0.5 ? 'arrow-up-right'
      : d < -0.5 ? 'arrow-down-right' : 'ellipsis';
    return '<div class="rs-cd rs-kpi">'
      + '<div class="cab">' + S.ico(k.ico, 's') + '<span class="rs-rot2">'
      + S.seguro(k.rot) + '</span></div>'
      + '<div class="num rs-tn">' + k.valor + '</div>'
      + '<div class="lin"><span>'
      + (d != null ? '<span class="rs-delta ' + cls + '">' + S.ico(seta, 'xs')
          + (d > 0 ? '+' : '') + Math.round(d) + '%</span>' : '')
      + (k.pe ? '<span class="rs-delta-pe">' + S.seguro(k.pe) + '</span>' : '')
      + '</span>'
      + (k.serie ? S.sparkline(k.serie, k.cor || S.corVar(1)) : '')
      + '</div></div>';
  };

  /* ------------------------------------------------------ lista com barra */
  S.lista = function (itens, base, vazio) {
    var com = itens.filter(function (i) { return i.valor > 0; });
    if (!com.length) {
      return '<p class="rs-sem">' + S.seguro(vazio || 'Sem movimento neste período.')
        + '</p>';
    }
    var max = Math.max.apply(null, itens.map(function (i) { return i.valor; }).concat([1]));
    var total = base != null ? base
      : itens.reduce(function (a, i) { return a + i.valor; }, 0);
    return '<div class="rs-lista">' + com.map(function (i) {
      var cor = i.cor || S.corVar(1);
      return '<div class="rs-li' + (i.marca ? '' : ' semi') + '">'
        + (i.marca ? '<span class="lg">' + i.marca + '</span>' : '')
        + '<span class="nm"><b>' + S.seguro(i.nome) + '</b>' + S.seguro(i.sub || '')
        + '</span><span class="vl rs-tn">' + S.fmt(i.valor) + '<small>'
        + S.pct(total ? (i.valor / total) * 100 : 0) + '</small></span>'
        + '<span class="rs-li-tr"><i style="width:'
        + ((i.valor / max) * 100).toFixed(1) + '%;background:linear-gradient(90deg,'
        + S.corFraca(cor, 55) + ',' + cor + ')"></i></span></div>';
    }).join('') + '</div>';
  };

  /* -------------------------------------------------------- a dica flutuante */
  S.mostraDica = function (e, html) {
    var d = document.getElementById('rs-tip');
    if (!d) return;
    d.innerHTML = html;
    d.style.opacity = '1';
    S.moveDica(e);
  };
  S.moveDica = function (e) {
    var d = document.getElementById('rs-tip');
    if (!d) return;
    var r = d.getBoundingClientRect();
    var x = e.clientX + 14, y = e.clientY - r.height - 12;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
    if (y < 8) y = e.clientY + 18;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
  };
  S.escondeDica = function () {
    var d = document.getElementById('rs-tip');
    if (d) d.style.opacity = '0';
  };
  /* um ouvinte so' para a pagina inteira: o mapa de calor e o funil desenham
     centenas de alvos, e um ouvinte por alvo seria centenas de nos esperando um
     gesto que quase nunca vem */
  S.ligarDicas = function (raizEl) {
    raizEl.addEventListener('pointerover', function (e) {
      var alvo = e.target.closest('[data-dica]');
      if (alvo) S.mostraDica(e, alvo.dataset.dica);
    });
    raizEl.addEventListener('pointermove', function (e) {
      if (e.target.closest('[data-dica]')) S.moveDica(e);
    });
    raizEl.addEventListener('pointerout', function (e) {
      if (e.target.closest('[data-dica]')) S.escondeDica();
    });
  };

  /* ----------------------------------------------------------------- o funil */
  S.funil = function (etapas, cor) {
    var topo = Math.max(1, (etapas[0] || {}).valor || 1);
    function larg(i) { return 9 + (etapas[i].valor / topo) * 91; }
    function op(i) { return 0.94 - i * 0.075; }
    var quedas = etapas.map(function (x, i) {
      return i && etapas[i - 1].valor > 0 ? 1 - x.valor / etapas[i - 1].valor : 0;
    });
    var maior = Math.max.apply(null, [0].concat(quedas.slice(1)));
    var pior = maior > 0 ? quedas.indexOf(maior) : -1;
    return '<div class="rs-fun">' + etapas.map(function (x, i) {
      var meio = '';
      if (i > 0) {
        meio = '<div class="rs-fun-q"><span class="q' + (i === pior ? ' pior' : '') + '">'
          + (i === pior ? S.ico('triangle-alert', 'xs') : '')
          + 'Caem ' + Math.round(quedas[i] * 100) + '%</span>'
          + '<span class="sil"><i style="--w:' + larg(i - 1).toFixed(1) + '%;--b:'
          + Math.min(100, (larg(i) / larg(i - 1)) * 100).toFixed(1) + '%;'
          + 'background:linear-gradient(180deg,'
          + S.corFraca(cor, Math.round((op(i - 1) - .03) * 100)) + ','
          + S.corFraca(cor, Math.round(op(i) * 100)) + ')"></i></span><span></span></div>';
      }
      return '<div>' + meio + '<div class="rs-fun-r' + (i === pior ? ' trava' : '')
        + '" data-dica="' + S.seguro('<b>' + x.rotulo + '</b><span>' + S.fmt(x.valor)
          + ' · ' + S.pct((x.valor / topo) * 100) + ' de quem entrou</span>') + '">'
        + '<span class="lb"><span class="lbi">' + S.ico(x.icone, 'xs') + '</span>'
        + S.seguro(x.rotulo) + '</span>'
        + '<span class="sil"><i style="--w:' + larg(i).toFixed(1) + '%;background:'
        + S.corFraca(cor, Math.round(op(i) * 100)) + '"></i></span>'
        + '<span class="vl"><b class="rs-tn">' + S.fmt(x.valor) + '</b>'
        + '<small class="rs-tn">' + S.pct((x.valor / topo) * 100) + '</small></span>'
        + '</div></div>';
    }).join('') + '</div>';
  };

  /* ------------------------------------------------------- o mapa de calor
     Dia da semana por hora, com escala em CINCO degraus: degrau se le', gradiente
     de um por cento nao. */
  var DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  S.heatmap = function (matriz, unidade) {
    var plano = [];
    matriz.forEach(function (l) { plano = plano.concat(l); });
    var vazio = !plano.some(function (v) { return v > 0; });
    var max = Math.max.apply(null, plano.concat([1]));
    var tintas = ['var(--rs-trilho)',
      'color-mix(in srgb, var(--rs-1) 22%, var(--rs-trilho))',
      'color-mix(in srgb, var(--rs-1) 45%, var(--rs-trilho))',
      'color-mix(in srgb, var(--rs-1) 72%, var(--rs-trilho))',
      'var(--rs-1)'];
    function degrau(a) { return a <= 0 ? 0 : a < .2 ? 1 : a < .45 ? 2 : a < .7 ? 3 : 4; }
    var un = unidade || ['publicação', 'publicações'];
    return '<div class="rs-hm-w">' + matriz.map(function (linha, d) {
      return '<div class="rs-hm"><span class="hl">' + DIAS[d] + '</span>'
        + linha.map(function (v, h) {
          return '<i style="background:' + tintas[degrau(v / max)] + '" data-dica="'
            + S.seguro('<b>' + DIAS[d] + ', ' + ('0' + h).slice(-2) + 'h às '
              + ('0' + (h + 1)).slice(-2) + 'h</b><span><span class="vv">' + v
              + '</span> ' + (v === 1 ? un[0] : un[1]) + '</span>') + '"></i>';
        }).join('') + '</div>';
    }).join('')
      + '<div class="rs-hm-x"><span></span>'
      + Array.from({ length: 24 }, function (_, i) {
        return '<span>' + (i % 3 === 0 ? i : '') + '</span>'; }).join('')
      + '</div><div class="rs-hm-esc"><span>Menos</span>'
      + tintas.map(function (t) { return '<i style="background:' + t + '"></i>'; }).join('')
      + '<span>Mais</span><span style="margin-left:auto">'
      + (vazio ? 'Sem ' + un[0] + ' neste período'
               : 'Pico: ' + max + ' ' + (max === 1 ? un[0] : un[1]))
      + '</span></div></div>';
  };

  /* =========================================================== OS GRAFICOS
     ECharts, como no original. A dica, a linha guia, a escala, o gradiente e a
     animacao vem da biblioteca: foi essa a cobranca de 27/08. */
  var vivos = [];
  /* QUADRO SEM LARGURA NAO INSTANCIA GRAFICO, e nao avisa. O cartao acabou de
     entrar na tela (a pagina anima a entrada de cada peca), e nesse instante a
     largura ainda e' zero: a tela sobe inteira sem um grafico sequer. O original
     resolve tentando de novo um instante depois, e aqui e' igual. */
  function montar(dom, receita) {
    if (!dom || !window.echarts) return null;
    var g = null;
    function pinta() {
      if (!dom.isConnected || !dom.clientWidth) return false;
      if (!g || g.isDisposed()) {
        g = window.echarts.init(dom, undefined, { renderer: 'canvas' });
        vivos.push({ g: g, dom: dom, receita: receita });
        new ResizeObserver(function () {
          if (g && !g.isDisposed() && dom.clientWidth) g.resize();
        }).observe(dom);
      }
      receita(g);
      return true;
    }
    if (!pinta()) {
      setTimeout(pinta, 60);
      setTimeout(pinta, 400);
      requestAnimationFrame(function () { requestAnimationFrame(pinta); });
    }
    return g;
  }
  /* O GRAFICO E' REDESENHADO QUANDO O TEMA TROCA, e nao so' quando o dado muda:
     as cores dele saem de variavel de CSS, e sem isso ele fica com a tinta do
     tema anterior. */
  new MutationObserver(function () {
    setTimeout(function () {
      vivos.forEach(function (v) {
        if (!v.g.isDisposed()) v.receita(v.g);
      });
    }, 340);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function comum() {
    var surf = S.varTema('--branco'), linha = S.varTema('--rule-solid');
    var linha2 = S.varTema('--rs-linha2');
    var txt = S.varTema('--ink'), txt2 = S.varTema('--muted'), txt3 = S.varTema('--soft');
    var reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
    return {
      surf: surf, linha: linha, linha2: linha2, txt: txt, txt2: txt2, txt3: txt3,
      animationDuration: reduz ? 0 : 560, animationEasing: 'cubicOut',
      textStyle: { fontFamily: 'Manrope, system-ui, sans-serif' },
      dica: {
        backgroundColor: surf, borderColor: linha2, borderWidth: 1, padding: [9, 12],
        textStyle: { color: txt, fontSize: 12, fontFamily: 'Manrope, system-ui, sans-serif' },
        extraCssText: 'border-radius:12px;box-shadow:' + S.varTema('--rs-sombra-g') + ';'
      }
    };
  }
  function linhaTip(cor, nome, valor, traco) {
    return '<div style="display:flex;align-items:center;gap:9px;margin-top:4px">'
      + '<i style="width:10px;height:' + (traco ? '0' : '10px') + ';border-radius:3px;'
      + 'flex:none;' + (traco ? 'border-top:2px dashed ' + cor : 'background:' + cor)
      + '"></i><span style="font-size:11.5px;font-weight:600;opacity:.75">' + nome
      + '</span><b style="margin-left:18px;font-variant-numeric:tabular-nums;'
      + 'font-weight:800">' + valor + '</b></div>';
  }
  function tituloTip(t) {
    return '<div style="font-size:12.5px;font-weight:800">' + t + '</div>';
  }

  /* A SERIE: a medida grande em linha com area, a contagem em BARRA, e o periodo
     anterior tracejado por tras. Eixo unico: com dois, a escala da direita ia de
     zero a um e uma publicacao virava barra do tamanho do grafico. */
  S.grafSerie = function (dom, serie, conf) {
    conf = conf || {};
    var nomeA = conf.nomeA || 'Visualizações', nomeB = conf.nomeB || 'Publicações';
    return montar(dom, function (g) {
      var c = comum();
      var a = S.tinta(conf.corA || S.corDado(1)), b = S.tinta(conf.corB || S.corDado(4));
      var eixo = serie.map(function (s) { return s.rot; });
      var va = serie.map(function (s) { return s.a; });
      var vb = serie.map(function (s) { return s.b; });
      var vant = serie.map(function (s) { return s.antes || 0; });
      var passo = Math.max(1, Math.ceil(eixo.length / 8));
      var suave = Math.max.apply(null, va.concat([0])) >= 20 ? 0.28 : 0;
      g.setOption({
        animationDuration: c.animationDuration, animationEasing: c.animationEasing,
        textStyle: c.textStyle,
        grid: { left: 4, right: 12, top: 18, bottom: 4, containLabel: true },
        tooltip: {
          trigger: 'axis', backgroundColor: c.dica.backgroundColor,
          borderColor: c.dica.borderColor, borderWidth: 1, padding: c.dica.padding,
          textStyle: c.dica.textStyle, extraCssText: c.dica.extraCssText,
          axisPointer: { type: 'line', lineStyle: { color: c.linha2, width: 1 }, z: 1 },
          formatter: function (ps) {
            if (!ps.length) return '';
            var m = {};
            ps.forEach(function (p) { m[p.seriesName] = p.value; });
            return tituloTip(ps[0].axisValue)
              + linhaTip(a, nomeA, S.fmt(m[nomeA] || 0))
              + linhaTip(b, nomeB, S.fmt(m[nomeB] || 0))
              + linhaTip(c.txt3, 'Período Anterior', S.fmt(m['Período Anterior'] || 0), true);
          }
        },
        xAxis: {
          type: 'category', boundaryGap: ['3%', '3%'], data: eixo,
          axisLine: { lineStyle: { color: c.linha } }, axisTick: { show: false },
          axisLabel: { color: c.txt3, fontSize: 10.5, fontWeight: 700,
            interval: passo - 1, margin: 12 }
        },
        yAxis: {
          type: 'value', minInterval: 1, splitLine: { lineStyle: { color: c.linha } },
          axisLine: { show: false }, axisTick: { show: false },
          axisLabel: { color: c.txt3, fontSize: 10.5, fontWeight: 600, margin: 10 }
        },
        series: [
          { name: 'Período Anterior', type: 'line', data: vant, smooth: suave,
            showSymbol: false, silent: true, z: 1,
            lineStyle: { color: c.txt3, width: 1.4, type: 'dashed', opacity: .7 } },
          { name: nomeA, type: 'line', data: va, smooth: suave, showSymbol: false, z: 3,
            lineStyle: { color: a, width: 2.6 },
            emphasis: { focus: 'series', scale: 1.6 },
            symbol: 'circle', symbolSize: 7,
            itemStyle: { color: a, borderColor: c.surf, borderWidth: 2 },
            areaStyle: { color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: S.alfa(a, .30) }, { offset: 1, color: S.alfa(a, 0) }]) } },
          { name: nomeB, type: 'bar', data: vb, z: 2, barMaxWidth: 18, barMinHeight: 2,
            itemStyle: { borderRadius: [3, 3, 0, 0],
              color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: S.alfa(b, .92) }, { offset: 1, color: S.alfa(b, .45) }]) },
            emphasis: { itemStyle: { color: b } } }
        ]
      }, true);
    });
  };
  S.legendaSerie = function (nomeA, nomeB, corA, corB, comAnterior) {
    return '<div class="rs-ec-leg"><span><i style="background:' + (corA || 'var(--rs-1)')
      + '"></i>' + nomeA + '</span><span><i class="bl" style="background:'
      + (corB || 'var(--rs-4)') + '"></i>' + nomeB + '</span>'
      + (comAnterior === false ? ''
         : '<span style="color:var(--soft)"><i class="tr"></i>Período Anterior</span>')
      + '</div>';
  };

  /* ------------------------------------------- barras deitadas com trilho */
  S.grafBarraH = function (dom, itens, cor, rotulo) {
    return montar(dom, function (g) {
      var c = comum();
      var k = S.tinta(cor || S.corDado(1));
      g.setOption({
        animationDuration: c.animationDuration, animationEasing: c.animationEasing,
        textStyle: c.textStyle,
        grid: { left: 2, right: 58, top: 6, bottom: 2, containLabel: true },
        tooltip: { trigger: 'item', backgroundColor: c.dica.backgroundColor,
          borderColor: c.dica.borderColor, borderWidth: 1, padding: c.dica.padding,
          textStyle: c.dica.textStyle, extraCssText: c.dica.extraCssText,
          formatter: function (p) {
            return tituloTip(p.name) + linhaTip(k, rotulo || 'Total', S.fmt(p.value));
          } },
        xAxis: { type: 'value', show: false },
        yAxis: { type: 'category', inverse: true,
          data: itens.map(function (i) { return i[0]; }),
          axisLine: { show: false }, axisTick: { show: false },
          axisLabel: { color: c.txt2, fontSize: 12, fontWeight: 700, margin: 10,
            width: 210, overflow: 'truncate' } },
        series: [{ type: 'bar', barWidth: 11,
          data: itens.map(function (i) { return i[1]; }),
          showBackground: true,
          backgroundStyle: { color: S.varTema('--rs-trilho'), borderRadius: 99 },
          itemStyle: { borderRadius: 99,
            color: new window.echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: S.alfa(k, .62) }, { offset: 1, color: k }]) },
          label: { show: true, position: 'right', distance: 9, color: c.txt,
            fontWeight: 800, fontSize: 12,
            formatter: function (p) { return S.fmt(p.value); } } }]
      }, true);
    });
  };

  /* ------------------------------------------------------------- colunas */
  S.grafColuna = function (dom, itens, cor, rotulo) {
    return montar(dom, function (g) {
      var c = comum();
      var k = S.tinta(cor || S.corDado(2));
      g.setOption({
        animationDuration: c.animationDuration, animationEasing: c.animationEasing,
        textStyle: c.textStyle,
        grid: { left: 2, right: 8, top: 14, bottom: 2, containLabel: true },
        tooltip: { trigger: 'axis', backgroundColor: c.dica.backgroundColor,
          borderColor: c.dica.borderColor, borderWidth: 1, padding: c.dica.padding,
          textStyle: c.dica.textStyle, extraCssText: c.dica.extraCssText,
          axisPointer: { type: 'shadow', shadowStyle: { color: S.alfa(k, .10) } },
          formatter: function (ps) {
            return tituloTip(ps[0].axisValue)
              + linhaTip(k, rotulo || 'Total', S.fmt(ps[0].value));
          } },
        xAxis: { type: 'category', data: itens.map(function (i) { return i[0]; }),
          axisLine: { lineStyle: { color: c.linha } }, axisTick: { show: false },
          axisLabel: { color: c.txt3, fontSize: 10.5, fontWeight: 700, margin: 10 } },
        yAxis: { type: 'value', minInterval: 1,
          splitLine: { lineStyle: { color: c.linha } },
          axisLine: { show: false }, axisTick: { show: false },
          axisLabel: { color: c.txt3, fontSize: 10.5, fontWeight: 600, margin: 8 } },
        series: [{ type: 'bar', barWidth: '56%',
          data: itens.map(function (i) { return i[1]; }),
          itemStyle: { borderRadius: [7, 7, 2, 2],
            color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: k }, { offset: 1, color: S.alfa(k, .45) }]) },
          emphasis: { itemStyle: { color: k } } }]
      }, true);
    });
  };

  /* ---------------------------------------------------------------- a rosca
     Legenda EMBAIXO, na horizontal, e o numero do meio em HTML por cima: dentro
     do grafico ele saia cortado. */
  S.grafRosca = function (dom, partes) {
    return montar(dom, function (g) {
      var c = comum();
      var total = partes.reduce(function (a, p) { return a + p.valor; }, 0) || 1;
      var mapa = {};
      partes.forEach(function (p) { mapa[p.nome] = S.pct((p.valor / total) * 100); });
      g.setOption({
        animationDuration: c.animationDuration, animationEasing: c.animationEasing,
        textStyle: c.textStyle,
        tooltip: { trigger: 'item', backgroundColor: c.dica.backgroundColor,
          borderColor: c.dica.borderColor, borderWidth: 1, padding: c.dica.padding,
          textStyle: c.dica.textStyle, extraCssText: c.dica.extraCssText,
          formatter: function (p) {
            return tituloTip(p.name) + linhaTip(p.color, 'Participação', S.pct(p.percent));
          } },
        legend: { orient: 'horizontal', bottom: 2, left: 'center', icon: 'roundRect',
          itemWidth: 9, itemHeight: 9, itemGap: 16, padding: [0, 4],
          formatter: function (nome) { return '{a|' + nome + '}{b|' + (mapa[nome] || '') + '}'; },
          textStyle: { rich: {
            a: { color: c.txt2, fontSize: 11.5, fontWeight: 600, fontFamily: 'Manrope, sans-serif' },
            b: { color: c.txt, fontSize: 11.5, fontWeight: 800, padding: [0, 0, 0, 6],
                 fontFamily: 'Manrope, sans-serif' } } } },
        series: [{ type: 'pie', radius: ['56%', '78%'], center: ['50%', '40%'],
          avoidLabelOverlap: true, label: { show: false }, labelLine: { show: false },
          itemStyle: { borderColor: c.surf, borderWidth: 3, borderRadius: 5 },
          emphasis: { scaleSize: 6,
            itemStyle: { shadowBlur: 14, shadowColor: 'rgba(0,0,0,.3)' } },
          data: partes.map(function (p) {
            return { name: p.nome, value: p.valor,
                     itemStyle: { color: S.tinta(p.cor) } }; }) }]
      }, true);
    });
  };

  /* AS PECAS INTERNAS SAEM PARA O `motor.js`, que desenha os graficos que esta
     home tem e a Sala nao tem (esteira, queima, medidor). Eles usam a MESMA
     montagem resiliente, a MESMA dica e o MESMO redesenho na troca de tema: e'
     por isso que ela sai daqui em vez de ser escrita de novo la'. */
  S.montar = montar;
  S.comum = comum;
  S.linhaTip = linhaTip;
  S.tituloTip = tituloTip;

  window.SALA = S;
})();
