/* ==================================== O COMPARTILHADO DAS TRES PROPOSTAS DO PAINEL
   RODADA 2, de 11/09/2026. A primeira foi reprovada com duas palavras: texto demais
   e grafico de menos. Entao aqui:

     1. TODO BLOCO E' UM DESENHO. Numero solto so' aparece dentro do cartao que tem
        grafico, nunca como bloco proprio.
     2. TEXTO E' ROTULO, nao frase. Nada de paragrafo explicando a tela.
     3. O DESEMPENHO ENTRA JUNTO da operacao, decisao dele: visualizacao, curtida,
        comentario e engajamento por publicacao, com hora e formato.

   A caixa de desenhos, toda com peca ja' existente na casa:
     motor()     o motor de grafico do painel (`window.montarGrafico`, `casa.js`)
     rosca()     anel com o numero no meio (`.rs-ec.rosca`, `.rs-ec-mid`)
     colunas()   barras verticais com rotulo proprio
     barrasH()   ranking com trilho (`.rs-li`, `.rs-li-tr`)
     funil()     o funil da sala de controle (`.rs-fun`)
     calor()     o mapa de calor da sala (`.rs-hm`)
     spark()     a minicurva (`.spark`)
   ========================================================================== */
(function () {
  var D = window.DADOS_PN || {};
  var CONTAS = D.contas || [];
  var RESUMO = D.resumo || {};
  var SERIE = D.serie || [];
  var POSTS = D.posts || [];
  var PASTAS = D.pastas || [];

  var HOJE = new Date(D.hoje || new Date().toISOString().slice(0, 19));
  var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
             'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var CORES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)',
               'var(--chart-5)'];

  function n(v) { return (v || 0).toLocaleString('pt-BR'); }
  function curto(v) {
    v = v || 0;
    if (v >= 1000000) return (v / 1000000).toFixed(1).replace('.', ',') + ' mi';
    if (v >= 1000) return (v / 1000).toFixed(1).replace('.', ',') + ' mil';
    return String(Math.round(v));
  }
  function seguro(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function hora(iso) {
    var d = new Date(String(iso).slice(0, 19));
    return ('0' + d.getHours()).slice(-2) + 'h';
  }
  function data(iso) {
    if (!iso) return '';
    var t = String(iso).slice(0, 19).replace(' ', 'T');
    if (t.length === 10) t += 'T12:00:00';
    var d = new Date(t);
    return d.getDate() + ' ' + MES[d.getMonth()];
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
    if (q < 30) return q + ' dias';
    if (q < 60) return 'um mês';
    return Math.round(q / 30) + ' meses';
  }
  function plural(q, um, muitos) { return q === 1 ? um : muitos; }

  var ICO = {
    conta: '<circle cx="12" cy="8.5" r="3.6"/><path d="M4.5 20c0-3.7 3.3-6 7.5-6s7.5 2.3 7.5 6"/>',
    fila: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    video: '<rect x="2.5" y="5" width="13" height="14" rx="2.5"/><path d="m16 12 5.5-3.5v7L16 12Z"/>',
    olho: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/>',
    coracao: '<path d="M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6c0 5-7.5 9.4-7.5 9.4Z"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alerta: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 4.3 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/>',
    pasta: '<path d="M3 7.5A2 2 0 0 1 5 5.5h3.8l2 2.6H19a2 2 0 0 1 2 2v7.4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    saida: '<path d="M12 19V5M5 12l7-7 7 7"/>'
  };
  function ic(nome, tam) {
    return '<svg class="rs-i' + (tam ? ' ' + tam : '') + '" viewBox="0 0 24 24">'
      + (ICO[nome] || '') + '</svg>';
  }

  /* ------------------------------------------------------ a cabeca de um cartao */
  function cab(titulo, dir) {
    return '<div class="rs-cd-h"><h3>' + seguro(titulo) + '</h3>'
      + (dir ? '<div class="rs-dir">' + dir + '</div>' : '') + '</div>';
  }
  function seg(id, itens, atual) {
    return '<div class="rs-seg" id="' + id + '">' + itens.map(function (i) {
      return '<button type="button" data-v="' + i[0] + '"'
        + (String(i[0]) === String(atual) ? ' class="on"' : '') + '>' + i[1] + '</button>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------- a minicurva */
  function spark(vals, cor) {
    if (!vals || vals.length < 2) return '';
    var max = Math.max.apply(null, vals) || 1;
    var L = 100, A = 34, p = [];
    vals.forEach(function (v, i) {
      p.push([(i / (vals.length - 1)) * L, A - 3 - (v / max) * (A - 7)]);
    });
    var linha = p.map(function (q, i) {
      return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1);
    }).join(' ');
    return '<svg class="spark pn-sp" viewBox="0 0 ' + L + ' ' + A + '" '
      + 'preserveAspectRatio="none" aria-hidden="true"'
      + (cor ? ' style="--accent:' + cor + '"' : '') + '>'
      + '<path class="spark-area" d="' + linha + ' L' + L + ' ' + A + ' L0 ' + A + 'Z"/>'
      + '<path class="spark-linha" d="' + linha + '"/></svg>';
  }

  /* ----------------------------------------------------------------- a rosca
     O CONTORNO E' O DA SALA (`.rs-ec.rosca` com o numero no meio em HTML, porque
     dentro do desenho ele saia cortado). O anel e' arco de SVG. */
  function rosca(fatias, centro, rotulo) {
    var total = fatias.reduce(function (t, f) { return t + f.v; }, 0);
    var R = 54, r = 36, cx = 70, cy = 70, ang = -Math.PI / 2, partes = '';
    if (!total) {
      partes = '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r) / 2)
        + '" fill="none" stroke="var(--rs-trilho)" stroke-width="' + (R - r) + '"/>';
    } else {
      fatias.forEach(function (f) {
        if (!f.v) return;
        var a = (f.v / total) * Math.PI * 2;
        var fim = ang + a, grande = a > Math.PI ? 1 : 0;
        var x1 = cx + R * Math.cos(ang), y1 = cy + R * Math.sin(ang);
        var x2 = cx + R * Math.cos(fim), y2 = cy + R * Math.sin(fim);
        var x3 = cx + r * Math.cos(fim), y3 = cy + r * Math.sin(fim);
        var x4 = cx + r * Math.cos(ang), y4 = cy + r * Math.sin(ang);
        partes += '<path d="M' + x1 + ' ' + y1 + ' A' + R + ' ' + R + ' 0 ' + grande
          + ' 1 ' + x2 + ' ' + y2 + ' L' + x3 + ' ' + y3 + ' A' + r + ' ' + r + ' 0 '
          + grande + ' 0 ' + x4 + ' ' + y4 + 'Z" fill="' + f.cor + '"><title>'
          + seguro(f.rot) + ': ' + n(f.v) + '</title></path>';
        ang = fim;
      });
    }
    return '<div class="rs-rosca-w pn-rosca">'
      + '<svg viewBox="0 0 140 140" class="pn-rosca-sv">' + partes + '</svg>'
      + '<div class="rs-ec-mid"><b class="rs-tn">' + centro + '</b><span>'
      + seguro(rotulo) + '</span></div></div>'
      + '<div class="rs-ec-leg">' + fatias.map(function (f) {
        return '<span class="pn-lg"><i style="background:' + f.cor + '"></i>'
          + seguro(f.rot) + ' <b class="rs-tn">' + n(f.v) + '</b></span>';
      }).join('') + '</div>';
  }

  /* --------------------------------------------------------------- as colunas
     Barra vertical com rotulo proprio: hora do dia, dia da semana, formato. O
     motor da casa desenha serie no tempo; estas sao categorias. */
  function colunas(itens, alt) {
    var max = Math.max.apply(null, itens.map(function (i) { return i.v; })) || 1;
    var A = alt || 132;
    return '<div class="pn-col" style="--alt:' + A + 'px">' + itens.map(function (i) {
      var h = i.v ? Math.max(3, Math.round((i.v / max) * A)) : 0;
      return '<span class="pn-col-b" title="' + seguro(i.rot) + ': ' + n(i.v) + '">'
        + '<b class="rs-tn">' + (i.v ? n(i.v) : '') + '</b>'
        + '<i style="height:' + h + 'px' + (i.cor ? ';background:' + i.cor : '') + '"></i>'
        + '<u>' + seguro(i.rot) + '</u></span>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------- o ranking com trilho */
  function barrasH(itens) {
    var max = Math.max.apply(null, itens.map(function (i) { return i.v; })) || 1;
    return '<div class="rs-lista">' + itens.map(function (i) {
      return '<div class="rs-li"><span class="lg">' + (i.logo
        ? '<img src="' + i.logo + '" alt="">' : ic(i.ico || 'video', 'xs'))
        + '</span><span class="nm"><b>' + seguro(i.rot) + '</b>' + seguro(i.pe || '')
        + '</span><span class="vl rs-tn">' + n(i.v)
        + (i.un ? '<small>' + seguro(i.un) + '</small>' : '') + '</span>'
        + '<span class="rs-li-tr"><i style="width:' + Math.max(2, (i.v / max) * 100)
        + '%;background:' + (i.cor || 'var(--accent)') + '"></i></span></div>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------------- o funil */
  function funil(passos) {
    var topo = passos[0] ? passos[0].v : 0;
    return '<div class="rs-fun">' + passos.map(function (p, i) {
      var pct = topo ? (p.v / topo) * 100 : 0;
      var proximo = passos[i + 1];
      var linha = '<div class="rs-fun-r' + (p.trava ? ' trava' : '') + '">'
        + '<span class="lb"><span class="lbi">' + ic(p.ico, 'xs') + '</span>'
        + seguro(p.rot) + '</span>'
        + '<span class="sil"><i style="--w:' + Math.max(pct, 1.5) + '%;background:'
        + (p.cor || 'var(--accent)') + '"></i></span>'
        + '<span class="vl"><b class="rs-tn">' + n(p.v) + '</b><small>'
        + (topo ? Math.round(pct) + '%' : '—') + '</small></span></div>';
      if (!proximo) return linha;
      var q = topo ? (proximo.v / topo) * 100 : 0;
      return linha + '<div class="rs-fun-q"><span></span>'
        + '<span class="sil"><i style="--w:' + Math.max(pct, 1.5) + '%;--b:'
        + Math.max(q, 1.5) + '%;background:var(--rs-trilho)"></i></span>'
        + '<span class="q">' + (p.v ? Math.round((proximo.v / p.v) * 100) + '%' : '—')
        + '</span></div>';
    }).join('') + '</div>';
  }

  /* -------------------------------------------------------- o mapa de calor */
  function calor(quantos) {
    var serie = SERIE.slice(-(quantos || 91));
    var max = Math.max.apply(null, serie.map(somaDia)) || 1;
    var semanas = [], atual = [];
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
    var linhas = '';
    for (var d = 0; d < 7; d++) {
      linhas += '<span class="hl">' + (d === 1 ? 'seg' : d === 3 ? 'qua'
        : d === 5 ? 'sex' : '') + '</span>' + semanas.map(function (s) {
        var p = s[d];
        if (!p) return '<i style="visibility:hidden"></i>';
        var q = somaDia(p);
        var forca = q ? (0.3 + 0.7 * (q / max)) : 0;
        return '<i title="' + data(p.dia) + ': ' + (q ? n(q) + ' '
          + plural(q, 'publicação', 'publicações') : 'nada') + '"' + (forca
          ? ' style="background:color-mix(in srgb,var(--accent) '
            + Math.round(forca * 100) + '%,var(--rs-trilho))"' : '') + '></i>';
      }).join('');
    }
    var meses = '', visto = '';
    semanas.forEach(function (s) {
      var p = s.find(function (x) { return x; });
      var m = p ? MES[new Date(p.dia + 'T12:00:00').getMonth()] : '';
      meses += '<span>' + (m && m !== visto ? m : '') + '</span>';
      if (m) visto = m;
    });
    var grade = 'grid-template-columns:34px repeat(' + semanas.length + ',1fr)';
    return '<div class="rs-hm-w"><div class="rs-hm pn-hm" style="' + grade + '">'
      + linhas + '</div><div class="rs-hm-x pn-hm" style="' + grade + '"><span></span>'
      + meses + '</div></div>';
  }
  function somaDia(p) {
    var c = p.contas || {}, t = 0;
    for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k)) t += c[k] || 0;
    return t;
  }

  /* ---------------------------------------------------------------- o motor */
  var seq = 0;
  function motor(alvo, conf) {
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

  function porSemana(corte) {
    var fora = [], atual = null;
    corte.forEach(function (p) {
      var d = new Date(p.dia + 'T12:00:00');
      var seg2 = new Date(d.getTime() - ((d.getDay() + 6) % 7) * 86400000);
      var chave = seg2.toISOString().slice(0, 10);
      if (!atual || atual.dia !== chave) { atual = { dia: chave, contas: {} };
        fora.push(atual); }
      var c = p.contas || {};
      for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k)) {
        atual.contas[k] = (atual.contas[k] || 0) + (c[k] || 0);
      }
    });
    return fora;
  }
  function agregado(q) { return q > 31; }

  function seriePorConta(quantos, tipo) {
    var corte = SERIE.slice(-quantos);
    if (agregado(quantos)) corte = porSemana(corte);
    return CONTAS.map(function (c, i) {
      var vals = corte.map(function (p) {
        return [p.dia + 'T12:00:00', (p.contas || {})[c.u] || 0];
      });
      var soma = vals.reduce(function (t, v) { return t + v[1]; }, 0);
      var vale = vals.length > (tipo === 'barra' ? 0 : 1);
      return { k: '@' + c.u, rot: '@' + c.u, cor: CORES[i % CORES.length],
               total: vale ? String(soma) : '—', sozinha: false,
               vals: vale ? vals : [], ligada: vale, logo: c.avatar,
               motivo: 'nenhuma publicação desta conta na janela' };
    });
  }

  /* A SERIE DE VISUALIZACAO caminha junto da de publicacao: e' o que o desempenho
     acrescenta a' home. Uma semana sem post tem zero, e zero aqui e' verdade. */
  function serieViews(quantos) {
    var corte = SERIE.slice(-quantos);
    if (agregado(quantos)) corte = porSemana(corte);
    var balde = {};
    POSTS.forEach(function (p) {
      var d = p.quando.slice(0, 10);
      if (agregado(quantos)) {
        var x = new Date(d + 'T12:00:00');
        d = new Date(x.getTime() - ((x.getDay() + 6) % 7) * 86400000)
          .toISOString().slice(0, 10);
      }
      balde[d] = (balde[d] || 0) + p.views;
    });
    var vals = corte.map(function (p) {
      return [p.dia + 'T12:00:00', balde[p.dia] || 0];
    });
    var soma = vals.reduce(function (t, v) { return t + v[1]; }, 0);
    return { k: 'views', rot: 'Visualizações', cor: 'var(--chart-2)',
             total: curto(soma), vals: vals, ligada: true,
             motivo: 'sem visualização na janela' };
  }
  function dominio(quantos) {
    var corte = SERIE.slice(-quantos);
    if (agregado(quantos)) corte = porSemana(corte);
    if (!corte.length) return null;
    var a = Date.parse(corte[0].dia + 'T12:00:00');
    var b = Date.parse(corte[corte.length - 1].dia + 'T12:00:00');
    return a === b ? [a - 43200000, b + 43200000] : [a, b];
  }

  /* ---------------------------------------------------------- baldes de tempo */
  function porHora() {
    var b = [];
    for (var h = 0; h < 24; h++) b.push({ rot: h, v: 0 });
    POSTS.forEach(function (p) {
      b[new Date(p.quando).getHours()].v += 1;
    });
    // so' as horas com movimento mais a vizinhanca, senao sao 24 colunas vazias
    var vivos = b.filter(function (x) { return x.v; }).map(function (x) { return x.rot; });
    if (!vivos.length) return b.filter(function (x, i) { return i % 3 === 0; })
      .map(function (x) { return { rot: x.rot + 'h', v: 0 }; });
    var de = Math.max(0, Math.min.apply(null, vivos) - 2);
    var ate = Math.min(23, Math.max.apply(null, vivos) + 2);
    return b.slice(de, ate + 1).map(function (x) {
      return { rot: x.rot + 'h', v: x.v };
    });
  }
  function porDiaSemana() {
    var b = SEM.map(function (s) { return { rot: s, v: 0 }; });
    POSTS.forEach(function (p) { b[new Date(p.quando).getDay()].v += 1; });
    return b;
  }
  function porViews() {
    return POSTS.slice().sort(function (a, b) { return b.views - a.views; })
      .slice(0, 6).map(function (p, i) {
        return { rot: (p.legenda || 'Sem legenda').slice(0, 46),
                 pe: '@' + p.conta + ' · ' + data(p.quando) + ' · ' + hora(p.quando),
                 v: p.views, un: 'visualizações',
                 cor: CORES[i === 0 ? 0 : 1] };
      });
  }

  /* ----------------------------------------------------------------- o funil */
  function funilAcervo() {
    var guardados = RESUMO.acervo || 0;
    var prateleira = RESUMO.prateleira || 0;
    return funil([
      { rot: 'No Drive', ico: 'pasta', v: guardados, cor: 'var(--chart-2)' },
      { rot: 'Na Prateleira', ico: 'video', v: prateleira, cor: 'var(--chart-1)' },
      { rot: 'Programados', ico: 'fila', v: RESUMO.fila || 0,
        cor: 'var(--chart-3)', trava: !RESUMO.fila },
      { rot: 'Publicados', ico: 'saida', v: RESUMO.publicados || 0,
        cor: 'var(--accent)' }
    ]);
  }

  /* ------------------------------------------------------------- o que trava */
  function travas() {
    var lista = [];
    CONTAS.forEach(function (c) {
      if (!c.ligada) lista.push({ ico: 'alerta', tom: 'am',
        rot: '@' + c.u + ' desligada', pe: 'fora do ar na última leitura',
        botao: 'Ver', forte: true });
    });
    CONTAS.forEach(function (c) {
      if (c.erros) lista.push({ ico: 'alerta', tom: 'am',
        rot: '@' + c.u + ' com erro de envio', pe: c.erros + ' recusados pela Meta',
        botao: 'Ver' });
    });
    CONTAS.forEach(function (c) {
      if (!c.ligada || c.fila) return;
      lista.push({ ico: 'relogio', tom: c.prateleira ? 'am' : '',
        rot: '@' + c.u + ' sem fila',
        pe: c.prateleira ? n(c.prateleira) + ' guardados, nenhum programado'
                         : 'nada programado',
        botao: 'Programar', forte: c.prateleira > 0 });
    });
    PASTAS.forEach(function (p) {
      if (p.total) return;
      lista.push({ ico: 'pasta', tom: '', rot: p.nome + ' vazia',
        pe: 'ligada' + (p.conta ? ' em @' + p.conta : '') + ', sem vídeo',
        botao: 'Ver' });
    });
    return lista;
  }
  function listaTravas(itens) {
    if (!itens.length) {
      return '<div class="rs-sem"><b>Nada travado</b>A rede está de pé e com fila.</div>';
    }
    return '<div class="rs-fita">' + itens.map(function (e) {
      return '<div class="rs-ev pn-ev"><span class="ic ' + (e.tom || '') + '">'
        + ic(e.ico, 's') + '</span><span class="c"><b>' + seguro(e.rot) + '</b>'
        + '<span>' + seguro(e.pe) + '</span></span>'
        + '<span class="pn-ev-dir"><button class="bt mini' + (e.forte ? ' forte' : '')
        + '" type="button">' + seguro(e.botao) + '</button></span></div>';
    }).join('') + '</div>';
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
    var r = RESUMO;
    document.getElementById('pn-dia').textContent =
      SEM[HOJE.getDay()] + ', ' + HOJE.getDate() + ' ' + MES[HOJE.getMonth()] + ' · '
      + (r.total - r.caidas) + ' de ' + r.total + ' de pé · ' + n(r.fila)
      + ' na fila · ' + n(r.prateleira) + ' guardados · ' + curto(r.views)
      + ' visualizações';
  }

  window.PN = {
    D: D, CONTAS: CONTAS, RESUMO: RESUMO, SERIE: SERIE, POSTS: POSTS, PASTAS: PASTAS,
    HOJE: HOJE, CORES: CORES, SEM: SEM,
    n: n, curto: curto, seguro: seguro, data: data, hora: hora, dias: dias,
    idade: idade, plural: plural, ic: ic, cab: cab, seg: seg,
    spark: spark, rosca: rosca, colunas: colunas, barrasH: barrasH, funil: funil,
    calor: calor, motor: motor, somaDia: somaDia,
    seriePorConta: seriePorConta, serieViews: serieViews, dominio: dominio,
    porHora: porHora, porDiaSemana: porDiaSemana, porViews: porViews,
    funilAcervo: funilAcervo, travas: travas, listaTravas: listaTravas,
    casca: casca
  };
})();
