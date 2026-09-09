/* ============================================================================
   O QUE AS TRES PROPOSTAS DA ABA DE ANALYTICS COMPARTILHAM.

   Aqui NAO mora desenho de tela: mora o que seria burrice reescrever tres vezes.
   Numero formatado, data, o motor de grafico em SVG e a janela do post. Cada
   proposta monta a sua tela com estas pecas, e e' por isso que elas podem ser
   arquiteturas diferentes sem virarem sistemas diferentes.

   O GRAFICO E' DESENHADO A MAO, em SVG. Nao entra biblioteca: a aba de Contas ja'
   teve ECharts e ele mandou tirar. Duas armadilhas medidas naquela rodada valem
   aqui: grafico sem largura nao desenha e nao avisa (por isso o ResizeObserver),
   e valor zero nao pode virar barra de altura minima (zero e' zero).
   ========================================================================== */
(function () {
  'use strict';

  var D = window.DADOS;
  var CAPAS = D.capas || [];

  /* ------------------------------------------------------------- numeros e datas */
  function n(v) { return (v || 0).toLocaleString('pt-BR'); }

  function curto(v) {
    v = v || 0;
    if (v >= 1000000) return (v / 1000000).toFixed(v >= 10000000 ? 0 : 1)
      .replace('.', ',') + ' mi';
    if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1)
      .replace('.', ',') + ' mil';
    return String(v);
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

  /* --------------------------------------------------------------- recorte de tempo
     O periodo corta a lista de publicacoes. Quem manda e' a data do post, e nao um
     campo guardado: assim trocar o periodo muda tabela, numero e grafico juntos. */
  function janela(conta, dias) {
    if (!dias) return conta.posts.slice();
    var corte = new Date(D.hoje).getTime() - dias * 86400000;
    return conta.posts.filter(function (p) {
      return new Date(p.quando).getTime() >= corte;
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

  /* ------------------------------------------------------ o resumo de uma conta
     Os quatro numeros que decidem alguma coisa. Tudo o mais e' vaidade e fica de
     fora: seguidor total, por exemplo, nao diz se a semana foi boa. */
  function resumo(conta, dias) {
    var atual = janela(conta, dias);
    var antes = [];
    if (dias) {
      var fim = new Date(D.hoje).getTime() - dias * 86400000;
      var ini = fim - dias * 86400000;
      antes = conta.posts.filter(function (p) {
        var t = new Date(p.quando).getTime();
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

  /* --------------------------------------------------------------- serie do grafico
     Uma coluna por dia dentro do periodo, somando o que saiu naquele dia. Dia sem
     publicacao vale zero de verdade, e nao um buraco: buraco mente sobre ritmo. */
  function serie(conta, dias, campo) {
    if (campo === 'seg-total') {
      return conta.curva.slice(-(dias || 30)).map(function (p) {
        return { dia: p[0], v: p[1] };
      });
    }
    var fim = new Date(D.hoje); fim.setHours(0, 0, 0, 0);
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

  /* =========================================================== o motor de grafico */
  function Grafico(alvo, opcoes) {
    var dados = [], op = opcoes || {};
    var balao = document.createElement('div');
    balao.className = 'gr-balao';
    alvo.appendChild(balao);

    function pintar() {
      var larg = alvo.clientWidth, alt = op.altura || 240;
      if (!larg || !dados.length) return;              // sem largura nao se desenha
      var pe = op.area ? 34 : 26;
      var esq = 46, dir = 12, topo = 16, base = alt - pe;
      var max = Math.max.apply(null, dados.map(function (p) { return p.v; }));
      /* Serie pequena (ritmo de publicacao vai a 1 ou 2 por dia) com teto de sobra
         gera eixo "0 0 1 1", que parece defeito. Ate' 4, o teto e os degraus sao
         inteiros; acima disso vale a folga de 16% no topo. */
      var miudo = max > 0 && max <= 4;
      var teto = max <= 0 ? 1 : (miudo ? Math.ceil(max) : max * 1.16);
      var passo = dados.length > 1 ? (larg - esq - dir) / (dados.length - 1) : 0;

      function x(i) { return esq + i * passo; }
      function y(v) { return topo + (base - topo) * (1 - v / teto); }

      var linha = dados.map(function (p, i) {
        return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1);
      }).join(' ');
      var area = linha + ' L' + x(dados.length - 1).toFixed(1) + ' ' + base
        + ' L' + x(0).toFixed(1) + ' ' + base + ' Z';

      /* Com teto baixo (ritmo de publicacao vai a 1 ou 2 por dia) tres degraus dao
         "0 0 1 1" no eixo, que parece defeito. Abaixo de 4 o degrau vira inteiro. */
      var degraus = miudo ? Math.max(Math.ceil(teto), 1) : 3;
      var reguas = '', rotulosY = '';
      for (var k = 0; k <= degraus; k++) {
        var v = teto / degraus * k, yy = y(v);
        reguas += '<line x1="' + esq + '" x2="' + (larg - dir) + '" y1="' + yy.toFixed(1)
          + '" y2="' + yy.toFixed(1) + '" class="gr-regua"/>';
        rotulosY += '<text x="' + (esq - 10) + '" y="' + (yy + 4).toFixed(1)
          + '" class="gr-rot gr-rot-y">' + curto(Math.round(v)) + '</text>';
      }
      var rotulosX = '', quantos = Math.min(6, dados.length);
      for (var j = 0; j < quantos; j++) {
        var idx = Math.round(j * (dados.length - 1) / (quantos - 1 || 1));
        rotulosX += '<text x="' + x(idx).toFixed(1) + '" y="' + (alt - 8)
          + '" class="gr-rot gr-rot-x">' + dia(dados[idx].dia) + '</text>';
      }

      var pontos = dados.map(function (p, i) {
        return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.v).toFixed(1)
          + '" r="3.5" class="gr-pt" data-i="' + i + '"/>';
      }).join('');

      var barras = '';
      if (op.barras) {
        var larguraBarra = Math.max(Math.min(passo * .58, 26), 3);
        barras = dados.map(function (p, i) {
          if (!p.v) return '';                        // zero e' zero, nao vira barra
          var h = base - y(p.v);
          return '<rect x="' + (x(i) - larguraBarra / 2).toFixed(1) + '" y="'
            + y(p.v).toFixed(1) + '" width="' + larguraBarra.toFixed(1) + '" height="'
            + h.toFixed(1) + '" rx="3" class="gr-barra" data-i="' + i + '"/>';
        }).join('');
      }

      alvo.querySelectorAll('svg').forEach(function (s) { s.remove(); });
      alvo.insertAdjacentHTML('afterbegin',
        '<svg class="gr-svg" viewBox="0 0 ' + larg + ' ' + alt + '" width="' + larg
        + '" height="' + alt + '">'
        + '<defs><linearGradient id="gr-tinta" x1="0" x2="0" y1="0" y2="1">'
        + '<stop offset="0%" stop-color="var(--accent)" stop-opacity=".22"/>'
        + '<stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>'
        + '</linearGradient></defs>'
        + reguas + rotulosY + rotulosX
        + (op.barras ? barras
          : '<path d="' + area + '" class="gr-area"/><path d="' + linha + '" class="gr-linha"/>')
        + (op.barras ? '' : pontos)
        + '<rect x="' + esq + '" y="0" width="' + Math.max(larg - esq - dir, 1)
        + '" height="' + alt + '" fill="transparent" class="gr-captura"/>'
        + '</svg>');

      var svg = alvo.querySelector('svg');
      svg.addEventListener('mousemove', function (ev) {
        var caixa = svg.getBoundingClientRect();
        var px = ev.clientX - caixa.left;
        var i = Math.max(0, Math.min(dados.length - 1,
          Math.round((px - esq) / (passo || 1))));
        var p = dados[i];
        balao.innerHTML = '<b>' + curto(p.v) + '</b><span>' + dia(p.dia)
          + (p.posts != null ? ' · ' + p.posts + (p.posts === 1 ? ' publicação'
            : ' publicações') : '') + '</span>';
        balao.style.left = Math.min(Math.max(x(i), 60), larg - 60) + 'px';
        balao.style.top = Math.max(y(p.v) - 14, 6) + 'px';
        balao.classList.add('on');
        svg.querySelectorAll('.gr-pt,.gr-barra').forEach(function (c) {
          c.classList.toggle('on', +c.dataset.i === i);
        });
      });
      svg.addEventListener('mouseleave', function () {
        balao.classList.remove('on');
        svg.querySelectorAll('.on').forEach(function (c) { c.classList.remove('on'); });
      });
    }

    this.dar = function (d) { dados = d; pintar(); };
    if (window.ResizeObserver) new ResizeObserver(pintar).observe(alvo);
    else window.addEventListener('resize', pintar);
  }

  /* ============================================================ a janela do post
     A pergunta que ela responde: este post foi bom, e por que? Numero solto nao
     responde isso, entao cada metrica vem com a comparacao contra a mediana da
     propria conta. E' a conta competindo com ela mesma. */
  function abrirJanela(post, conta) {
    var lista = conta.posts;
    var med = {
      alc: mediana(lista, 'alc'), vis: mediana(lista, 'vis'),
      inter: mediana(lista, 'inter'), sal: mediana(lista, 'sal'),
      cmp: mediana(lista, 'cmp'), cur: mediana(lista, 'cur'),
      com: mediana(lista, 'com')
    };
    function contra(v, m) {
      if (!m) return '';
      var r = v / m;
      var classe = r >= 1.15 ? 'sobe' : (r <= .85 ? 'desce' : 'igual');
      var txt = r >= 1 ? (r).toFixed(1).replace('.', ',') + 'x a mediana'
        : (Math.round((1 - r) * 100)) + '% abaixo da mediana';
      return '<span class="jn-cmp ' + classe + '">' + txt + '</span>';
    }
    function bloco(rot, valor, comparacao) {
      return '<div class="jn-num"><span>' + rot + '</span><b>' + valor + '</b>'
        + (comparacao || '') + '</div>';
    }

    var caixa = document.createElement('div');
    caixa.className = 'jn-fundo';
    caixa.innerHTML =
      '<div class="jn" role="dialog" aria-label="Métricas da publicação">'
      + '<div class="jn-cab">'
      + '<div class="jn-tit"><h3>' + escapar(post.legenda) + '</h3>'
      + '<p>' + (post.fmt === 'reel' ? 'Reel' : 'Carrossel') + ' · '
      + dataHora(post.quando) + ' · @' + escapar(conta.u)
      + (post.exemplo ? ' · <span class="jn-ex">Exemplo</span>' : '') + '</p></div>'
      + '<button class="jn-x" aria-label="Fechar">'
      + '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
      + '</div>'
      + '<div class="jn-corpo">'
      + '<div class="jn-capa">'
      + (capa(post.capa) ? '<img src="' + capa(post.capa) + '" alt="">'
        : '<div class="jn-sem"></div>')
      + '<div class="jn-capa-pe"><b>' + pct(post.eng) + '</b>'
      + '<span>Engajamento Sobre Alcance</span></div>'
      + '</div>'
      + '<div class="jn-lado">'
      + '<div class="jn-grade">'
      + bloco('Alcance', n(post.alc), contra(post.alc, med.alc))
      + bloco('Visualizações', n(post.vis), contra(post.vis, med.vis))
      + bloco('Interações', n(post.inter), contra(post.inter, med.inter))
      + bloco('Seguidores Ganhos', n(post.seg), '')
      + '</div>'
      + '<div class="jn-linha-tit">Como A Audiência Reagiu</div>'
      + '<div class="jn-grade quatro">'
      + bloco('Curtidas', n(post.cur), contra(post.cur, med.cur))
      + bloco('Comentários', n(post.com), contra(post.com, med.com))
      + bloco('Salvamentos', n(post.sal), contra(post.sal, med.sal))
      + bloco('Compartilhamentos', n(post.cmp), contra(post.cmp, med.cmp))
      + '</div>'
      + '<div class="jn-linha-tit">Quanto Do Vídeo Foi Assistido</div>'
      + '<div class="jn-ret">'
      + '<div class="jn-ret-barra"><i style="width:' + Math.min(post.ret, 100)
      + '%"></i></div>'
      + '<div class="jn-ret-pe"><b>' + seg(post.medio) + '</b> de <b>' + seg(post.dur)
      + '</b>, ou seja <b>' + pct(post.ret) + '</b> do vídeo</div>'
      + '</div>'
      + '</div></div></div>';

    document.body.appendChild(caixa);
    requestAnimationFrame(function () { caixa.classList.add('on'); });
    function fechar() {
      caixa.classList.remove('on');
      setTimeout(function () { caixa.remove(); }, 200);
      document.removeEventListener('keydown', tecla);
    }
    function tecla(e) { if (e.key === 'Escape') fechar(); }
    caixa.querySelector('.jn-x').addEventListener('click', fechar);
    caixa.addEventListener('click', function (e) { if (e.target === caixa) fechar(); });
    document.addEventListener('keydown', tecla);
  }

  /* ------------------------------------------------------- o trocador de conta
     A aba e' de UMA conta por vez. O trocador e' o `ct-dd` da aba de Contas, que
     ja passou pela regua dele: nada de componente novo aqui. */
  function trocador(alvo, contas, atual, aoTrocar) {
    function retrato(c) {
      return c.avatar ? '<img src="' + c.avatar + '" alt="">' : '<i class="pt"></i>';
    }
    alvo.innerHTML =
      '<div class="ct-dd an-dd">'
      + '<button class="ct-dd-bt an-dd-bt" type="button">'
      + '<span class="an-dd-av">' + retrato(atual) + '</span>'
      + '<span class="an-dd-txt"><b>@' + escapar(atual.u) + '</b>'
      + '<small>' + escapar(atual.nome) + '</small></span>'
      + '<svg class="cv" viewBox="0 0 24 24" width="14" height="14" fill="none" '
      + 'stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>'
      + '</button>'
      + '<div class="ct-dd-m an-dd-m" hidden>'
      + contas.map(function (c) {
        return '<button class="ct-dd-o an-dd-o' + (c.u === atual.u ? ' on' : '')
          + '" data-u="' + escapar(c.u) + '"><span class="an-dd-av">' + retrato(c)
          + '</span><span class="an-dd-txt"><b>@' + escapar(c.u) + '</b>'
          + '<small>' + n(c.seguidores) + ' seguidores · ' + escapar(c.mercado)
          + '</small></span></button>';
      }).join('')
      + '</div></div>';

    var raiz = alvo.querySelector('.ct-dd');
    /* O balao da casa abre pelo atributo `hidden`, e nao por classe: e' assim que
       o `13-contas.css` o desenha, e inventar uma classe nova deixaria o balao
       sempre aberto. */
    var balao = raiz.querySelector('.ct-dd-m');
    raiz.querySelector('.ct-dd-bt').addEventListener('click', function (e) {
      e.stopPropagation();
      balao.hidden = !balao.hidden;
      raiz.classList.toggle('aberto', !balao.hidden);
    });
    raiz.querySelectorAll('.ct-dd-o').forEach(function (b) {
      b.addEventListener('click', function () {
        balao.hidden = true;
        aoTrocar(b.dataset.u);
      });
    });
    document.addEventListener('click', function () {
      balao.hidden = true;
      raiz.classList.remove('aberto');
    });
  }

  /* ------------------------------------------------------------- menu e tema
     Copiados do painel para a maquete se comportar como a tela de verdade. */
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
    idade: idade, capa: capa, escapar: escapar, janela: janela, soma: soma,
    mediana: mediana, resumo: resumo, serie: serie, Grafico: Grafico,
    abrirJanela: abrirJanela, trocador: trocador, ligarMoldura: ligarMoldura,
    avisar: avisar
  };
})();
