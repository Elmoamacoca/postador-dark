/* ==================================== O COMPARTILHADO DAS TRES PROPOSTAS DO PAINEL
   Aqui nao se inventa componente. Tudo que aparece na tela e' peca que ja' esta' no
   ar: cartao de indicador (`.rs-cd.rs-kpi`), pilula de variacao (`.rs-delta`),
   segmentado (`.rs-seg`), minicurva (`.spark`), mapa de calor (`.rs-hm`), fita de
   eventos (`.rs-ev`), lista com trilho (`.rs-li`) e o motor de grafico do painel
   (`window.montarGrafico`, copiado inteiro em `casa.js`).

   O QUE MUDA DE UMA PROPOSTA PARA A OUTRA E' O ARRANJO, nao a peca.
   ========================================================================== */
(function () {
  var D = window.DADOS_PN || {};
  var CONTAS = D.contas || [];
  var RESUMO = D.resumo || {};
  var SERIE = D.serie || [];
  var SAIDAS = D.saidas || [];
  var PASTAS = D.pastas || [];

  /* O DIA VEM DOS DADOS; a HORA, do relogio de quem abre. */
  var HOJE = new Date(D.hoje || new Date().toISOString().slice(0, 19));
  var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
             'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  var CORES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)',
               'var(--chart-5)'];

  function n(v) { return (v || 0).toLocaleString('pt-BR'); }
  function seguro(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* DATA SEM HORA E' LIDA COMO UTC pelo navegador, e ai' `2026-06-21` vira 20 de
     junho no fuso de Sao Paulo. O dia do painel e' o dia daqui, entao a hora entra
     fixada ao meio-dia antes de virar data. */
  function data(iso) {
    if (!iso) return '';
    var t = String(iso).slice(0, 19).replace(' ', 'T');
    if (t.length === 10) t += 'T12:00:00';
    var d = new Date(t);
    return d.getDate() + ' de ' + MES[d.getMonth()];
  }
  function dias(iso) {
    if (!iso) return null;
    var d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
    var h = new Date(HOJE.getTime()); h.setHours(12, 0, 0, 0);
    return Math.round((h - d) / 86400000);
  }
  function idade(iso) {
    var q = dias(iso);
    if (q == null) return 'nunca';
    if (q <= 0) return 'hoje';
    if (q === 1) return 'ontem';
    if (q < 30) return 'há ' + q + ' dias';
    if (q < 60) return 'há um mês';
    return 'há ' + Math.round(q / 30) + ' meses';
  }
  function plural(q, um, muitos) { return q === 1 ? um : muitos; }

  /* ------------------------------------------------------------------- icones
     Os mesmos tracos da casa: 24 por 24, sem preenchimento, ponta redonda. */
  var ICO = {
    conta: '<circle cx="12" cy="8.5" r="3.6"/><path d="M4.5 20c0-3.7 3.3-6 7.5-6s7.5 2.3 7.5 6"/>',
    fila: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    video: '<rect x="2.5" y="5" width="13" height="14" rx="2.5"/><path d="m16 12 5.5-3.5v7L16 12Z"/>',
    saida: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    alerta: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 4.3 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    ok: '<path d="M4 12.5 9.5 18 20 6.5"/>',
    pasta: '<path d="M3 7.5A2 2 0 0 1 5 5.5h3.8l2 2.6H19a2 2 0 0 1 2 2v7.4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    curva: '<path d="M3 15c3 0 4-8 7-8s4 6 7 6 4-4 4-4"/>',
    barra: '<path d="M4 20V10M10 20V4M16 20v-7M22 20v-3"/>'
  };
  function ic(nome, tam) {
    return '<svg class="rs-i' + (tam ? ' ' + tam : '') + '" viewBox="0 0 24 24">'
      + (ICO[nome] || '') + '</svg>';
  }

  /* ------------------------------------------------------- o cartao de indicador
     A PECA E' A DO ANALYTICS NO AR (`.rs-cd.rs-kpi`), com a mesma ordem: rotulo em
     cima, numero grande, e a linha de baixo com a pilula e a leitura em portugues. */
  function kpi(k) {
    var pilula = k.pil
      ? '<span class="rs-delta ' + (k.tom || '') + '">' + (k.pilIco ? ic(k.pilIco, 'xs') : '')
        + seguro(k.pil) + '</span>' : '';
    return '<div class="rs-cd rs-kpi' + (k.classe ? ' ' + k.classe : '') + '">'
      + '<div class="cab">' + ic(k.ico, 's')
      + '<span class="rs-rot2">' + seguro(k.rot) + '</span></div>'
      + '<div class="num rs-tn">' + k.valor + '</div>'
      + '<div class="lin"><span>' + pilula
      + '<span class="rs-delta-pe">' + seguro(k.pe) + '</span></span>'
      + (k.spark || '') + '</div></div>';
  }

  /* ------------------------------------------------------------- a minicurva
     O estilo ja' existe (`.spark`, `.spark-linha`, `.spark-area` do 04-analytics);
     aqui so' se calcula o caminho. */
  function spark(vals, desce) {
    if (!vals || vals.length < 2) return '';
    var max = Math.max.apply(null, vals) || 1;
    var L = 92, A = 30, p = [];
    vals.forEach(function (v, i) {
      p.push([(i / (vals.length - 1)) * L, A - 3 - (v / max) * (A - 7)]);
    });
    var linha = p.map(function (q, i) {
      return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1);
    }).join(' ');
    return '<svg class="rs-spark spark' + (desce ? ' desce' : '') + '" viewBox="0 0 '
      + L + ' ' + A + '" preserveAspectRatio="none" aria-hidden="true">'
      + '<path class="spark-area" d="' + linha + ' L' + L + ' ' + A + ' L0 ' + A + 'Z"/>'
      + '<path class="spark-linha" d="' + linha + '"/></svg>';
  }

  /* ------------------------------------------------------------ o mapa de calor
     A PECA E' A DA SALA DE CONTROLE (`.rs-hm`). Aqui a grade e' de semanas: uma
     coluna por semana, uma linha por dia da semana, como o quadro de contribuicao.
     Ele responde a pergunta que a home faz: EM QUAIS DIAS SAIU ALGUMA COISA. */
  function mapaCalor(quantos) {
    var serie = SERIE.slice(-(quantos || 91));
    var max = Math.max.apply(null, serie.map(function (p) {
      return somaDia(p);
    })); max = max || 1;
    var semanas = [], atual = [];
    // o quadro comeca no domingo da primeira semana, para a linha do dia bater
    var primeiro = new Date(serie[0].dia + 'T12:00:00');
    for (var v = 0; v < primeiro.getDay(); v++) atual.push(null);
    serie.forEach(function (p) {
      atual.push(p);
      if (atual.length === 7) { semanas.push(atual); atual = []; }
    });
    if (atual.length) {
      while (atual.length < 7) atual.push(null);
      semanas.push(atual);
    }
    var col = ['seg', 'qua', 'sex'];
    var linhas = '';
    for (var d = 0; d < 7; d++) {
      var celulas = semanas.map(function (s) {
        var p = s[d];
        if (!p) return '<i style="visibility:hidden"></i>';
        var q = somaDia(p);
        var forca = q ? (0.28 + 0.72 * (q / max)) : 0;
        var dica = data(p.dia) + ': ' + (q ? n(q) + ' ' + plural(q, 'publicação', 'publicações')
                                            : 'nada saiu');
        return '<i title="' + dica + '"' + (forca
          ? ' style="background:color-mix(in srgb,var(--accent) ' + Math.round(forca * 100)
            + '%,var(--rs-trilho))"' : '') + '></i>';
      }).join('');
      var rot = (d === 1 ? 'seg' : d === 3 ? 'qua' : d === 5 ? 'sex' : '');
      linhas += '<span class="hl">' + rot + '</span>' + celulas;
    }
    var meses = '', visto = '';
    semanas.forEach(function (s) {
      var p = s.find(function (x) { return x; });
      var m = p ? MES[new Date(p.dia + 'T12:00:00').getMonth()] : '';
      meses += '<span>' + (m && m !== visto ? m : '') + '</span>';
      if (m) visto = m;
    });
    // A CELULA E' QUADRADA, e por isso a coluna e' fixa: esticada em `1fr` numa tela
    // de 1400 ela vira um retangulo de 77 por 17 e o quadro deixa de ser mapa.
    var grade = 'grid-template-columns:34px repeat(' + semanas.length + ',22px)';
    return '<div class="rs-hm-w"><div class="rs-hm pn-hm" style="' + grade + '">'
      + linhas
      + '</div><div class="rs-hm-x pn-hm" style="' + grade + '"><span></span>'
      + meses + '</div>'
      + '<div class="rs-hm-esc"><span>nada</span>'
      + [0, .3, .55, .8, 1].map(function (f) {
        return '<i style="background:' + (f ? 'color-mix(in srgb,var(--accent) '
          + Math.round(f * 100) + '%,var(--rs-trilho))' : 'var(--rs-trilho)') + '"></i>';
      }).join('') + '<span>o dia mais cheio</span></div></div>';
  }
  /* O QUADRO SOZINHO NAO EXPLICA NADA: ao lado dele vai a leitura em portugues, que
     e' o que faz decidir. Tres frases, todas contadas do mesmo dado do quadro. */
  function leituraCalor(quantos) {
    var serie = SERIE.slice(-(quantos || 91));
    var total = serie.reduce(function (t, p) { return t + somaDia(p); }, 0);
    var cheio = serie.slice().sort(function (a, b) { return somaDia(b) - somaDia(a); })[0];
    var seco = 0, maior = 0, fim = null;
    serie.forEach(function (p) {
      if (somaDia(p)) { seco = 0; return; }
      seco++;
      if (seco > maior) { maior = seco; fim = p.dia; }
    });
    var porSemana = [0, 0, 0, 0, 0, 0, 0];
    serie.forEach(function (p) {
      porSemana[new Date(p.dia + 'T12:00:00').getDay()] += somaDia(p);
    });
    var forte = porSemana.indexOf(Math.max.apply(null, porSemana));
    var itens = [];
    itens.push(['O dia mais cheio', total
      ? n(somaDia(cheio)) + ' ' + plural(somaDia(cheio), 'publicação', 'publicações')
        + ' em ' + data(cheio.dia)
      : 'nenhum dia teve publicação']);
    itens.push(['A maior seca', maior
      ? maior + ' dias seguidos sem nada' + (fim ? ', até ' + data(fim) : '')
      : 'nenhum dia em branco']);
    itens.push(['O dia forte da semana', total
      ? DIAS[forte] + ', com ' + n(porSemana[forte]) + ' de ' + n(total)
      : 'sem base para dizer']);
    return '<div class="rs-lista">' + itens.map(function (i) {
      return '<div class="rs-li semi"><span class="nm"><b>' + i[0] + '</b>' + i[1]
        + '</span></div>';
    }).join('') + '</div>';
  }

  function somaDia(p) {
    var c = p.contas || {}, t = 0;
    for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k)) t += c[k] || 0;
    return t;
  }

  /* ---------------------------------------------------------------- o grafico
     O MESMO MOTOR DA HOME NO AR: `window.montarGrafico`, com a marcacao que o
     `05-painel.js` usa (abas por conta, tela e balao). */
  var seq = 0;
  function grafico(alvo, conf) {
    var abas = conf.series.map(function (m) {
      return '<button type="button" class="gaba" data-k="' + seguro(m.k) + '" role="tab"'
        + ' style="--cor-serie:' + m.cor + '" aria-selected="' + (m.ligada ? 'true' : 'false')
        + '"' + (m.vals.length ? '' : ' disabled') + '><span>' + seguro(m.rot)
        + '</span><b>' + m.total + '</b></button>';
    }).join('');
    alvo.innerHTML = '<div class="grafico" data-dados="pn-g' + (++seq) + '" '
      + 'data-vista="' + (conf.tipo || 'area') + '">'
      + '<div class="grafico-abas" role="tablist">' + abas + '</div>'
      + '<div class="grafico-tela"></div>'
      + '<div class="grafico-balao" hidden></div></div>';
    var g = alvo.querySelector('.grafico');
    g.dadosProntos = { chaves: conf.series, dominio: conf.dominio };
    window.montarGrafico(g);
    return g;
  }
  /* JANELA LONGA AGREGA POR SEMANA. Com 90 colunas de um dia e no maximo uma
     publicacao em cada, o desenho vira um pente: toda barra sobe ate' o teto e a
     altura para de significar quantidade. Por semana, a altura volta a dizer quanto
     saiu. Ate' 31 dias fica dia a dia, que e' a escala em que se opera. */
  function porSemana(corte) {
    var fora = [], atual = null;
    corte.forEach(function (p) {
      var d = new Date(p.dia + 'T12:00:00');
      var seg = new Date(d.getTime() - ((d.getDay() + 6) % 7) * 86400000);
      var chave = seg.toISOString().slice(0, 10);
      if (!atual || atual.dia !== chave) {
        atual = { dia: chave, contas: {} };
        fora.push(atual);
      }
      var c = p.contas || {};
      for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k)) {
        atual.contas[k] = (atual.contas[k] || 0) + (c[k] || 0);
      }
    });
    return fora;
  }
  function agregado(quantos) { return quantos > 31; }

  function seriePorConta(quantos, tipo) {
    var corte = SERIE.slice(-quantos);
    if (agregado(quantos)) corte = porSemana(corte);
    return CONTAS.map(function (c, i) {
      var vals = corte.map(function (p) {
        return [p.dia + 'T12:00:00', (p.contas || {})[c.u] || 0];
      });
      var soma = vals.reduce(function (t, v) { return t + v[1]; }, 0);
      var vale = vals.length > (tipo === 'barra' ? 0 : 1);
      return {
        k: '@' + c.u, rot: '@' + c.u, cor: CORES[i % CORES.length],
        total: vale ? String(soma) : '—', sozinha: false, vals: vale ? vals : [],
        motivo: 'nenhuma publicação desta conta na janela', ligada: vale, logo: c.avatar
      };
    });
  }
  function dominio(quantos) {
    var corte = SERIE.slice(-quantos);
    if (agregado(quantos)) corte = porSemana(corte);
    if (!corte.length) return null;
    var a = Date.parse(corte[0].dia + 'T12:00:00');
    var b = Date.parse(corte[corte.length - 1].dia + 'T12:00:00');
    return a === b ? [a - 43200000, b + 43200000] : [a, b];
  }

  /* ------------------------------------------------------------- o que trava
     A LISTA E' A DA HOME NO AR (`pendencias()` do 05-painel.js), com o acervo
     entrando junto: o painel tem video guardado e fila vazia, e e' esse o no' de
     hoje. Cada item carrega o botao que resolve. */
  function travas() {
    var lista = [];
    CONTAS.forEach(function (c) {
      if (!c.ligada) lista.push({
        grave: true, ico: 'alerta', titulo: '@' + c.u + ' está desligada',
        desc: 'A conta saiu do ar na leitura mais recente da API do Instagram.',
        botao: 'Ver a conta', forte: true, vai: 'contas'
      });
    });
    CONTAS.forEach(function (c) {
      if (c.erros) lista.push({
        grave: true, ico: 'alerta',
        titulo: '@' + c.u + ' tem ' + c.erros + ' ' + plural(c.erros, 'vídeo', 'vídeos')
          + ' com erro',
        desc: 'O envio foi recusado. O motivo de cada um está no livro-caixa.',
        botao: 'Ver', vai: 'contas'
      });
    });
    CONTAS.forEach(function (c) {
      if (!c.ligada || c.fila) return;
      lista.push({
        grave: c.prateleira > 0, ico: c.prateleira > 0 ? 'alerta' : 'relogio',
        titulo: '@' + c.u + ' está sem fila',
        desc: c.prateleira
          ? n(c.prateleira) + ' vídeos guardados nesta conta e nenhum programado. '
            + 'O último post saiu ' + idade(c.ultimo) + '.'
          : (c.ultimo ? 'Nada programado. O último post saiu ' + idade(c.ultimo) + '.'
                      : 'Nada programado e nenhum post lido nesta conta.'),
        botao: 'Programar', forte: c.prateleira > 0, vai: 'programar'
      });
    });
    PASTAS.forEach(function (p) {
      if (p.total) return;
      lista.push({
        grave: false, ico: 'pasta',
        titulo: 'A pasta ' + p.nome + ' está vazia',
        desc: 'Ela está ligada' + (p.conta ? ' em @' + p.conta : '')
          + ', mas não tem nenhum vídeo dentro.',
        botao: 'Ver a pasta', vai: 'contas'
      });
    });
    if (!PASTAS.length) lista.push({
      grave: true, ico: 'pasta', titulo: 'Nenhuma pasta de vídeo ligada',
      desc: 'Sem pasta, não há de onde puxar arquivo e nada pode ser programado.',
      botao: 'Ligar uma pasta', forte: true, vai: 'contas'
    });
    return lista;
  }

  /* A fita de eventos (`.rs-ev`), do jeito da sala de controle. */
  function fita(itens) {
    if (!itens.length) {
      return '<div class="rs-sem"><b>Nada aqui</b>Quando alguma coisa sair ou travar, '
        + 'ela aparece nesta lista.</div>';
    }
    return '<div class="rs-fita">' + itens.map(function (e) {
      var dir = e.botao
        ? '<button class="bt mini' + (e.forte ? ' forte' : '') + '" type="button">'
          + seguro(e.botao) + '</button>'
        : (e.lado ? '<span class="rs-rot3">' + seguro(e.lado) + '</span>' : '');
      return '<div class="rs-ev pn-ev">'
        + '<span class="ic ' + (e.tom || '') + '">' + ic(e.ico, 's') + '</span>'
        + '<span class="c"><b>' + seguro(e.titulo) + '</b><span>'
        + seguro(e.desc) + '</span></span>'
        + '<span class="pn-ev-dir">' + dir + '</span></div>';
    }).join('') + '</div>';
  }

  /* Os eventos reais: o que a Meta conhece, do mais novo para o mais velho. */
  function saidasRecentes(quantas) {
    return SAIDAS.slice().reverse().slice(0, quantas || 8).map(function (s) {
      return {
        ico: 'saida', tom: 'ok', titulo: s.titulo,
        desc: '@' + s.conta + ' · ' + (s.fmt === 'carrossel' ? 'Carrossel' : 'Reel'),
        lado: idade(s.quando)
      };
    });
  }

  /* ------------------------------------------------------------ os indicadores
     AS QUATRO MEDIDAS DA HOME. Nenhuma repete o Analytics: ali se pergunta como a
     conta foi; aqui, se a operacao anda. */
  function medidas() {
    var dePe = (RESUMO.total || 0) - (RESUMO.caidas || 0);
    var ultima = SAIDAS.length ? SAIDAS[SAIDAS.length - 1] : null;
    var porDia = CONTAS.length || 1;
    var folego = Math.floor((RESUMO.fila || 0) / porDia);
    var ultimos30 = SERIE.slice(-30).reduce(function (t, p) { return t + somaDia(p); }, 0);
    var anteriores30 = SERIE.slice(-60, -30).reduce(function (t, p) {
      return t + somaDia(p); }, 0);
    return [
      {
        rot: 'Contas De Pé', ico: 'conta', valor: dePe + ' de ' + (RESUMO.total || 0),
        pil: RESUMO.caidas ? RESUMO.caidas + ' caída' : 'nenhuma caída',
        tom: RESUMO.caidas ? 'dw' : '', pe: RESUMO.erros ? n(RESUMO.erros) + ' com erro de envio'
          : 'sem erro de envio',
        classe: RESUMO.caidas ? '' : ''
      },
      {
        rot: 'Fila Programada', ico: 'fila', valor: n(RESUMO.fila || 0),
        pil: folego ? folego + ' ' + plural(folego, 'dia', 'dias') + ' de fôlego'
                    : 'fôlego zerado',
        tom: RESUMO.fila ? 'up' : 'dw',
        pe: RESUMO.fila ? 'vídeos com data marcada' : 'nada vai sair sozinho'
      },
      {
        rot: 'Prateleira', ico: 'video', valor: n(RESUMO.prateleira || 0),
        pil: (PASTAS.length || 0) + ' ' + plural(PASTAS.length, 'pasta', 'pastas'),
        pe: RESUMO.prateleira ? 'vídeos prontos e sem uso' : 'nenhum vídeo guardado'
      },
      {
        /* A MINICURVA SO' ENTRA QUANDO HA' CURVA. Com um dia de publicacao em trinta,
           ela desenha um espeto e ainda rouba a largura da frase, que e' quem
           explica. Sem curva, o cartao fica com a leitura inteira. */
        rot: 'Últimos 30 Dias', ico: 'saida', valor: n(ultimos30),
        pil: anteriores30 ? (ultimos30 - anteriores30 >= 0 ? '+' : '')
          + n(ultimos30 - anteriores30) + ' contra os 30 antes' : 'sem base antes',
        tom: ultimos30 >= anteriores30 ? 'up' : 'dw',
        pe: ultima ? 'última ' + idade(ultima.quando) : 'nada saiu ainda',
        spark: SERIE.slice(-30).filter(function (p) { return somaDia(p); }).length >= 4
          ? spark(SERIE.slice(-30).map(somaDia), ultimos30 < anteriores30) : ''
      }
    ];
  }

  /* A frase do cabecalho: o estado da operacao em uma linha. */
  function frase() {
    var d = DIAS[HOJE.getDay()] + ', ' + HOJE.getDate() + ' de '
      + ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto',
         'setembro', 'outubro', 'novembro', 'dezembro'][HOJE.getMonth()] + '. ';
    if (RESUMO.caidas) return d + 'Tem conta fora do ar.';
    if (!RESUMO.fila && RESUMO.prateleira) {
      return d + n(RESUMO.prateleira) + ' vídeos guardados e nenhum programado: '
        + 'hoje nada sai sozinho.';
    }
    if (!RESUMO.fila) return d + 'Nenhuma publicação programada.';
    return d + 'A rede de pé e a fila andando.';
  }

  /* ------------------------------------------------------------- menu e tema */
  function casca() {
    var raiz = document.documentElement;
    var chave = document.getElementById('chave');
    var icone = document.getElementById('tema-icone');
    function pintaIcone(escuro) {
      icone.innerHTML = escuro
        ? '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>'
        : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2'
          + 'M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>';
    }
    function troca() {
      var escuro = raiz.getAttribute('data-theme') === 'dark';
      raiz.classList.add('trocando-tema');
      raiz.setAttribute('data-theme', escuro ? 'light' : 'dark');
      chave.setAttribute('aria-checked', String(!escuro));
      pintaIcone(!escuro);
      setTimeout(function () { raiz.classList.remove('trocando-tema'); }, 320);
    }
    pintaIcone(false);
    chave.addEventListener('click', troca);
    var botao = document.getElementById('botao-menu');
    botao.addEventListener('click', function () {
      var aberto = raiz.getAttribute('data-menu') !== 'fechado';
      raiz.setAttribute('data-menu', aberto ? 'fechado' : 'aberto');
      botao.setAttribute('aria-expanded', String(!aberto));
    });
    document.getElementById('pn-lido').textContent = 'lido às '
      + ('0' + HOJE.getHours()).slice(-2) + ':' + ('0' + HOJE.getMinutes()).slice(-2);
    document.getElementById('pn-dia').textContent = frase();
  }

  window.PN = {
    D: D, CONTAS: CONTAS, RESUMO: RESUMO, SERIE: SERIE, SAIDAS: SAIDAS, PASTAS: PASTAS,
    HOJE: HOJE, CORES: CORES,
    n: n, seguro: seguro, data: data, dias: dias, idade: idade, plural: plural,
    ic: ic, kpi: kpi, spark: spark, mapaCalor: mapaCalor, leituraCalor: leituraCalor,
    somaDia: somaDia,
    grafico: grafico, seriePorConta: seriePorConta, dominio: dominio,
    travas: travas, fita: fita, saidasRecentes: saidasRecentes, medidas: medidas,
    casca: casca
  };
})();
