/* ============================================================================
   O QUE AS PROPOSTAS DA ABA DE ANALYTICS COMPARTILHAM.

   Aqui NAO mora desenho de tela: mora o que seria burrice reescrever em cada
   proposta. Numero formatado, data, o motor de grafico, a minicurva dos cartoes,
   o trocador de conta com busca e o painel lateral da publicacao.

   O GRAFICO E' DESENHADO A MAO, em SVG. Nao entra biblioteca: a aba de Contas ja'
   teve ECharts e ele mandou tirar. Tres armadilhas medidas valem aqui: grafico sem
   largura nao desenha e nao avisa (por isso o ResizeObserver), valor zero nao pode
   virar barra de altura minima, e serie curta com teto de sobra gera eixo "0 0 1 1".

   REFINO DE 09/09/2026, depois da primeira rodada. Ele aprovou a arquitetura da
   proposta A e reprovou o acabamento, item por item: grafico e cartao mal feitos,
   trocador de conta vazando da tela e sem busca, botao fora do padrao da casa,
   tema escuro quebrado e a janela abrindo no centro. O que mudou aqui:

   1. A curva do grafico virou SUAVE (bezier travada), com linha-guia vertical e
      balao que acompanha o cursor, em vez de uma serra de bicos.
   2. O trocador virou COMBOBOX: busca dentro do balao, teclado (setas, Enter, Esc)
      e alinhamento a direita, porque alinhado a esquerda ele saia 84px para fora
      da tela, medido.
   3. A janela do post virou PAINEL LATERAL, o "side peek" do Notion: entra pela
      direita, 520px, e deixa a lista visivel atras. Guiado pelo que Emplifi e
      PatternFly publicam sobre painel lateral (piso de 420px, transicao de 200 a
      300ms) e pelo comportamento do proprio Notion (setas para andar entre os
      registros sem fechar).
   ========================================================================== */
(function () {
  'use strict';

  var D = window.DADOS;
  var CAPAS = D.capas || [];

  /* ------------------------------------------------------------- numeros e datas */
  function n(v) { return (v || 0).toLocaleString('pt-BR'); }

  /* Regua de eixo com "1,0 mil" polui; quando o numero e' redondo a virgula sai. */
  function curto(v) {
    v = v || 0;
    if (v >= 1000000) return enxuto(v / 1000000) + ' mi';
    if (v >= 1000) return enxuto(v / 1000) + ' mil';
    return String(Math.round(v));
  }

  function enxuto(x) {
    return (Math.abs(x - Math.round(x)) < .05 ? String(Math.round(x))
      : x.toFixed(1).replace('.', ','));
  }

  function pct(v) { return (v || 0).toFixed(1).replace('.', ',') + '%'; }
  function seg(v) { return (v || 0).toFixed(1).replace('.', ',') + 's'; }

  var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
             'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  /* Data sem hora ("2026-08-17") o navegador le' como UTC, e no fuso de Brasilia
     isso volta um dia: "16 ago". Por isso a hora entra na marra. */
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
    var h = (data(D.hoje) - data(iso)) / 86400000;
    if (h < 1) return 'hoje';
    if (h < 2) return 'ontem';
    if (h < 30) return Math.round(h) + ' dias';
    if (h < 60) return 'há 1 mês';
    return 'há ' + Math.round(h / 30) + ' meses';
  }

  function capa(i) { return CAPAS[i % (CAPAS.length || 1)] || ''; }

  function escapar(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function nomeFmt(p) { return p.fmt === 'reel' ? 'Reel' : 'Carrossel'; }

  /* --------------------------------------------------------------- recorte de tempo */
  function janela(conta, dias) {
    if (!dias) return conta.posts.slice();
    var corte = data(D.hoje).getTime() - dias * 86400000;
    return conta.posts.filter(function (p) {
      return data(p.quando).getTime() >= corte;
    });
  }

  function soma(lista, campo) {
    return lista.reduce(function (t, p) { return t + (p[campo] || 0); }, 0);
  }

  function mediana(lista, campo) {
    if (!lista.length) return 0;
    var v = lista.map(function (p) { return p[campo] || 0; }).sort(function (a, b) {
      return a - b;
    });
    var m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
  }

  /* ------------------------------------------------------ o resumo de uma conta */
  function resumo(conta, dias) {
    var atual = janela(conta, dias);
    var antes = [];
    if (dias) {
      var fim = data(D.hoje).getTime() - dias * 86400000;
      var ini = fim - dias * 86400000;
      antes = conta.posts.filter(function (p) {
        var t = data(p.quando).getTime();
        return t >= ini && t < fim;
      });
    }
    function variar(campo) {
      var a = soma(atual, campo), b = soma(antes, campo);
      if (!b) return null;
      return Math.round((a - b) / b * 100);
    }
    var alc = soma(atual, 'alc');
    return {
      posts: atual,
      alcance: alc,
      visualizacoes: soma(atual, 'vis'),
      interacoes: soma(atual, 'inter'),
      seguidores: soma(atual, 'seg'),
      engajamento: alc ? soma(atual, 'inter') / alc * 100 : 0,
      retencao: atual.length
        ? atual.reduce(function (t, p) { return t + p.ret; }, 0) / atual.length : 0,
      medianaAlcance: mediana(atual, 'alc'),
      varAlcance: variar('alc'),
      varVis: variar('vis'),
      varInter: variar('inter'),
      varSeg: variar('seg')
    };
  }

  /* --------------------------------------------------------------- serie do grafico */
  function serie(conta, dias, campo) {
    if (campo === 'seg-total') {
      return conta.curva.slice(-(dias || 30)).map(function (p) {
        return { dia: p[0], v: p[1] };
      });
    }
    var fim = data(D.hoje); fim.setHours(0, 0, 0, 0);
    var saida = [];
    for (var i = (dias || 30) - 1; i >= 0; i--) {
      var d = new Date(fim.getTime() - i * 86400000);
      var chave = d.toISOString().slice(0, 10);
      var doDia = conta.posts.filter(function (p) {
        return p.quando.slice(0, 10) === chave;
      });
      saida.push({ dia: chave, v: soma(doDia, campo), posts: doDia.length });
    }
    return saida;
  }

  /* -------------------------------------------------------- traco suave (bezier)
     Uma serie diaria de alcance sobe e desce forte, e ligada em reta vira serra.
     O controle da curva e' TRAVADO entre os dois pontos vizinhos: assim a curva
     nao inventa um pico nem um vale que o dado nao tem. */
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

  /* ------------------------------------------------------------- a minicurva
     COPIADA DA SALA DE CONTROLE do Portal (`componentes/rastreio/comum.tsx`),
     que e' a tela que ele apontou como regua: 92 por 30, gradiente proprio,
     traco de 1,9 e um ponto no fim. Peca da casa nao se imita, usa-se a fonte.

     Cada minicurva precisa do SEU identificador de gradiente: id repetido faz a
     segunda curva ser pintada com a cor da primeira. E serie toda em zero nao vira
     desenho, porque reta colorida no meio do cartao parece dado. */
  var contaSpark = 0;

  function minicurva(vals, largura, altura, cor) {
    if (!vals.length || !vals.some(function (v) { return v > 0; })) return '';
    largura = largura || 92; altura = altura || 30;
    cor = cor || 'var(--rs-1, var(--accent))';
    var max = Math.max.apply(null, vals.concat([1]));
    var dx = largura / Math.max(1, vals.length - 1);
    var pts = vals.map(function (v, i) {
      return [i * dx, altura - 2.5 - (v / max) * (altura - 7)];
    });
    var linha = pts.map(function (p, i) {
      return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
    }).join('');
    contaSpark += 1;
    var gid = 'sp' + contaSpark;
    var fim = pts[pts.length - 1];
    return '<svg class="rs-spark" viewBox="0 0 ' + largura + ' ' + altura + '" '
      + 'preserveAspectRatio="none" aria-hidden="true">'
      + '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="' + cor + '" stop-opacity=".34"/>'
      + '<stop offset="1" stop-color="' + cor + '" stop-opacity="0"/>'
      + '</linearGradient></defs>'
      + '<path d="' + linha + 'L' + largura + ' ' + altura + 'L0 ' + altura + 'Z" '
      + 'fill="url(#' + gid + ')"/>'
      + '<path d="' + linha + '" fill="none" stroke="' + cor + '" stroke-width="1.9" '
      + 'vector-effect="non-scaling-stroke" stroke-linejoin="round"/>'
      + '<circle cx="' + fim[0].toFixed(1) + '" cy="' + fim[1].toFixed(1) + '" r="2.2" '
      + 'fill="' + cor + '" vector-effect="non-scaling-stroke"/></svg>';
  }

  /* ------------------------------------------------------------- teto redondo
     Com teto cru o eixo saia "822, 1,6 mil, 2,5 mil": numero quebrado que ninguem
     le' de relance. O teto sobe ate' o proximo degrau redondo (1, 2, 2,5 ou 5 vezes
     uma potencia de dez) e a regua vira 1 mil, 2 mil, 3 mil, 4 mil. */
  function tetoRedondo(v) {
    if (v <= 0) return 1;
    var potencia = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
    var passo = v / potencia;
    var degrau = passo <= 1 ? 1 : passo <= 2 ? 2 : passo <= 2.5 ? 2.5
      : passo <= 4 ? 4 : passo <= 5 ? 5 : 10;
    return degrau * potencia;
  }

  /* =========================================================== o motor de grafico */
  function Grafico(alvo, opcoes) {
    var dados = [], op = opcoes || {};
    var balao = document.createElement('div');
    balao.className = 'gr-balao';
    alvo.appendChild(balao);
    var guia = document.createElement('i');
    guia.className = 'gr-guia';
    alvo.appendChild(guia);

    function pintar() {
      var larg = alvo.clientWidth, alt = op.altura || 240;
      if (!larg || !dados.length) return;              // sem largura nao se desenha
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

      var barras = '';
      if (op.barras) {
        var lb = Math.max(Math.min(passo * .56, 22), 3);
        barras = dados.map(function (p, i) {
          if (!p.v) return '';                        // zero e' zero, nao vira barra
          return '<rect x="' + (x(i) - lb / 2).toFixed(1) + '" y="' + y(p.v).toFixed(1)
            + '" width="' + lb.toFixed(1) + '" height="' + (base - y(p.v)).toFixed(1)
            + '" rx="3" class="gr-barra" data-i="' + i + '"/>';
        }).join('');
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
        + (op.barras ? barras
          : '<path d="' + area + '" class="gr-area"/>'
            + '<path d="' + traco + '" class="gr-linha"/>'
            + '<circle class="gr-pt" r="5" cx="-99" cy="-99"/>')
        + '<rect x="0" y="0" width="' + larg + '" height="' + alt
        + '" fill="transparent" class="gr-captura"/>'
        + '</svg>');

      var svg = alvo.querySelector('svg');
      var pt = svg.querySelector('.gr-pt');
      svg.addEventListener('mousemove', function (ev) {
        var caixa = svg.getBoundingClientRect();
        var escala = caixa.width / larg;
        var px = (ev.clientX - caixa.left) / escala;
        var i = Math.max(0, Math.min(dados.length - 1,
          Math.round((px - esq) / (passo || 1))));
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
        if (pt) { pt.setAttribute('cx', x(i)); pt.setAttribute('cy', y(p.v)); }
        svg.querySelectorAll('.gr-barra').forEach(function (c) {
          c.classList.toggle('on', +c.dataset.i === i);
        });
      });
      svg.addEventListener('mouseleave', function () {
        balao.classList.remove('on');
        guia.classList.remove('on');
        if (pt) { pt.setAttribute('cx', -99); pt.setAttribute('cy', -99); }
        svg.querySelectorAll('.on').forEach(function (c) { c.classList.remove('on'); });
      });
    }

    this.dar = function (d) { dados = d; pintar(); };
    if (window.ResizeObserver) new ResizeObserver(pintar).observe(alvo);
    else window.addEventListener('resize', pintar);
  }

  /* ================================================ o painel lateral da publicacao
     Ele pediu o "side peek" do Notion: entra pela direita, deixa a lista visivel
     atras, e tem seta para andar de publicacao em publicacao sem fechar. Largura de
     520px (acima do piso de 420 que a Emplifi publica), transicao de 260ms (dentro
     da faixa de 200 a 300 que os guias recomendam), Esc fecha, clique fora fecha. */
  var painel = null, andarAtual = null;

  function abrirPainel(post, conta, lista) {
    lista = (lista && lista.length) ? lista : conta.posts;
    var i = Math.max(lista.indexOf(post), 0);
    if (!painel) {
      painel = document.createElement('div');
      painel.className = 'sp-fora';
      painel.innerHTML = '<div class="sp-veu"></div><aside class="sp" role="dialog" '
        + 'aria-label="Métricas da publicação"></aside>';
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
      pintarPainel(lista[j], conta, j, lista);
    };
    pintarPainel(lista[i], conta, i, lista);
    /* Reflow forcado no lugar de requestAnimationFrame: com a janela em segundo
       plano o navegador SEGURA o rAF, e o painel ficava montado e invisivel. Ler
       offsetHeight fecha o quadro na hora e a transicao ainda acontece. */
    void painel.offsetHeight;
    painel.classList.add('on');
  }

  function fecharPainel() {
    if (painel) painel.classList.remove('on');
  }

  function pintarPainel(post, conta, i, lista) {
    var med = {
      alc: mediana(conta.posts, 'alc'), vis: mediana(conta.posts, 'vis'),
      inter: mediana(conta.posts, 'inter'), sal: mediana(conta.posts, 'sal'),
      cmp: mediana(conta.posts, 'cmp'), cur: mediana(conta.posts, 'cur'),
      com: mediana(conta.posts, 'com')
    };
    function contra(v, m) {
      if (!m) return '<span class="sp-cmp igual">sem base de comparação</span>';
      var r = v / m;
      var classe = r >= 1.15 ? 'sobe' : (r <= .85 ? 'desce' : 'igual');
      var txt = r >= 1 ? r.toFixed(1).replace('.', ',') + 'x a mediana'
        : Math.round((1 - r) * 100) + '% abaixo da mediana';
      return '<span class="sp-cmp ' + classe + '">' + txt + '</span>';
    }
    function bloco(rot, valor, cmp) {
      return '<div class="sp-num"><span>' + rot + '</span><b>' + valor + '</b>'
        + (cmp || '') + '</div>';
    }

    painel.querySelector('.sp').innerHTML =
      '<header class="sp-cab">'
      + '<div class="sp-andar">'
      + '<button class="sp-ic" data-andar="-1"' + (i === 0 ? ' disabled' : '')
      + ' aria-label="Publicação anterior">'
      + '<svg viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"/></svg></button>'
      + '<button class="sp-ic" data-andar="1"'
      + (i === lista.length - 1 ? ' disabled' : '')
      + ' aria-label="Próxima publicação">'
      + '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>'
      + '<span class="sp-pos">' + (i + 1) + ' de ' + lista.length + '</span>'
      + '<button class="sp-ic sp-x" aria-label="Fechar">'
      + '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
      + '</div>'
      + '<h3>' + escapar(post.legenda) + '</h3>'
      + '<p>' + nomeFmt(post) + ' · ' + dataHora(post.quando) + ' · @'
      + escapar(conta.u) + (post.exemplo
        ? ' · <span class="an-selo-ex">Exemplo</span>' : '') + '</p>'
      + '</header>'
      + '<div class="sp-corpo">'
      + '<div class="sp-capa">'
      + '<img src="' + capa(post.capa) + '" alt="">'
      + selo(post)
      + '<span class="sp-eng"><b>' + pct(post.eng) + '</b>'
      + '<span>Engajamento Sobre Alcance</span></span>'
      + '</div>'
      + '<div class="sp-grade">'
      + bloco('Alcance', n(post.alc), contra(post.alc, med.alc))
      + bloco('Visualizações', n(post.vis), contra(post.vis, med.vis))
      + '</div>'
      + '<div class="sp-tit">Como A Audiência Reagiu</div>'
      + '<div class="sp-grade">'
      + bloco('Curtidas', n(post.cur), contra(post.cur, med.cur))
      + bloco('Comentários', n(post.com), contra(post.com, med.com))
      + bloco('Salvamentos', n(post.sal), contra(post.sal, med.sal))
      + bloco('Compartilhamentos', n(post.cmp), contra(post.cmp, med.cmp))
      + '</div>'
      + (post.fmt === 'reel'
        ? '<div class="sp-tit">Quanto Do Vídeo Foi Assistido</div>'
          + '<div class="sp-ret"><div class="sp-ret-barra"><i style="width:'
          + Math.min(post.ret, 100) + '%"></i></div>'
          + '<div class="sp-ret-pe"><b>' + seg(post.medio) + '</b> de <b>'
          + seg(post.dur) + '</b>, ou seja <b>' + pct(post.ret)
          + '</b> do vídeo</div></div>'
        : '')
      + '<div class="sp-tit">O Que Isto Rendeu</div>'
      + '<div class="sp-grade">'
      + bloco('Interações', n(post.inter), contra(post.inter, med.inter))
      + bloco('Seguidores Ganhos', n(post.seg), '')
      + '</div>'
      + '</div>';

    painel.querySelector('.sp-x').addEventListener('click', fecharPainel);
    painel.querySelectorAll('[data-andar]').forEach(function (b) {
      b.addEventListener('click', function () { andarAtual(+b.dataset.andar); });
    });
    painel.querySelector('.sp-corpo').scrollTop = 0;
  }

  /* O selo de formato mora sobre a capa em toda peca que mostra publicacao: sem
     ele, reel e carrossel viram a mesma imagem parada. */
  function selo(post) {
    return '<span class="sp-fmt' + (post.fmt === 'reel' ? ' reel' : '') + '">'
      + (post.fmt === 'reel'
        ? '<svg viewBox="0 0 24 24"><path d="m10 8 6 4-6 4V8Z" fill="currentColor" '
          + 'stroke="none"/></svg>Reel'
        : '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="13" height="13" rx="2.4"/>'
          + '<path d="M20 8v11a2 2 0 0 1-2 2H7"/></svg>Carrossel')
      + '</span>';
  }

  /* ============================================== o trocador de conta com busca
     Ele cobrou tres coisas: o balao saia da tela, faltava busca e o desenho estava
     solto. Agora e' um combobox alinhado A DIREITA (o botao vive no canto direito
     do cabecalho), com campo de busca, teclado e estado vazio. Segue a
     especificacao WAI-ARIA de combobox: setas andam, Enter escolhe, Esc fecha. */
  function trocador(alvo, contas, atual, aoTrocar) {
    var filtro = '', marcado = 0;

    function retrato(c, classe) {
      return '<span class="' + classe + '">' + (c.avatar
        ? '<img src="' + c.avatar + '" alt="">' : '') + '</span>';
    }

    alvo.innerHTML =
      '<div class="cb">'
      + '<button class="cb-bt" type="button" aria-haspopup="listbox" '
      + 'aria-expanded="false">'
      + retrato(atual, 'cb-av')
      + '<span class="cb-txt"><b>@' + escapar(atual.u) + '</b>'
      + '<small>' + escapar(atual.nome) + '</small></span>'
      + '<svg class="cb-cv" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>'
      + '</button>'
      + '<div class="cb-m" hidden>'
      + '<div class="cb-busca">'
      + '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/>'
      + '<path d="m20 20-3.2-3.2"/></svg>'
      + '<input type="text" placeholder="Procurar conta" aria-label="Procurar conta">'
      + '</div>'
      + '<div class="cb-lista" role="listbox"></div>'
      + '<div class="cb-pe">' + contas.length + ' contas ligadas ao Postador</div>'
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
        return (c.u + ' ' + c.nome + ' ' + c.mercado).toLowerCase().indexOf(f) >= 0;
      });
    }

    function pintarLista() {
      var v = vistas();
      if (marcado >= v.length) marcado = Math.max(v.length - 1, 0);
      lista.innerHTML = v.length ? v.map(function (c, i) {
        return '<button class="cb-o' + (c.u === atual.u ? ' sel' : '')
          + (i === marcado ? ' mrc' : '') + '" role="option" data-u="'
          + escapar(c.u) + '" data-i="' + i + '">'
          + retrato(c, 'cb-av peq')
          + '<span class="cb-txt"><b>@' + escapar(c.u) + '</b>'
          + '<small>' + n(c.seguidores) + ' seguidores · ' + escapar(c.mercado)
          + '</small></span>'
          + (c.u === atual.u ? '<svg class="cb-ok" viewBox="0 0 24 24">'
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

    function escolher(u) { abrir(false); aoTrocar(u); }

    bt.addEventListener('click', function (e) {
      e.stopPropagation(); abrir(menu.hidden);
    });
    campo.addEventListener('input', function () {
      filtro = this.value; marcado = 0; pintarLista();
    });
    campo.addEventListener('keydown', function (e) {
      var v = vistas();
      if (e.key === 'ArrowDown') { marcado = Math.min(marcado + 1, v.length - 1); }
      else if (e.key === 'ArrowUp') { marcado = Math.max(marcado - 1, 0); }
      else if (e.key === 'Enter') { if (v[marcado]) escolher(v[marcado].u); return; }
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

  /* ------------------------------------------------------------- menu e tema */
  function ligarMoldura() {
    var raiz = document.documentElement;
    var botao = document.getElementById('botao-menu');
    if (botao) botao.addEventListener('click', function () {
      var fechado = raiz.getAttribute('data-menu') !== 'aberto';
      raiz.setAttribute('data-menu', fechado ? 'aberto' : 'fechado');
      botao.setAttribute('aria-expanded', String(fechado));
    });
    var chave = document.getElementById('chave');
    if (chave) chave.addEventListener('click', function () {
      var escuro = raiz.getAttribute('data-theme') === 'dark';
      raiz.setAttribute('data-theme', escuro ? 'light' : 'dark');
      chave.setAttribute('aria-checked', String(!escuro));
    });
    document.querySelectorAll('.menu .mi').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.classList.contains('ativo')) return;
        avisar('Nesta maquete só a aba de Analytics está montada.');
      });
    });
  }

  var aviso;
  function avisar(texto) {
    if (!aviso) {
      aviso = document.createElement('div');
      aviso.className = 'an-torrada';
      document.body.appendChild(aviso);
    }
    aviso.textContent = texto;
    aviso.classList.add('on');
    clearTimeout(avisar.t);
    avisar.t = setTimeout(function () { aviso.classList.remove('on'); }, 2600);
  }

  window.AN = {
    D: D, n: n, curto: curto, pct: pct, seg: seg, dia: dia, dataHora: dataHora,
    idade: idade, capa: capa, escapar: escapar, nomeFmt: nomeFmt, selo: selo,
    janela: janela, soma: soma, mediana: mediana, resumo: resumo, serie: serie,
    Grafico: Grafico, minicurva: minicurva, abrirJanela: abrirPainel,
    abrirPainel: abrirPainel, fecharPainel: fecharPainel, trocador: trocador,
    ligarMoldura: ligarMoldura, avisar: avisar
  };
})();
