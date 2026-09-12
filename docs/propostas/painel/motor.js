/* ==========================================================================
   MOTOR: os graficos que a ESTEIRA tem e a Sala De Controle nao tem.

   A Sala responde por desempenho (serie, rosca, ranking, mapa de calor) e o
   `sala.js` a traz inteira, portada. Esta tela responde por outra coisa: o
   caminho do video da pasta ate' o ar. Isso pede pecas que la' nao existem:

     esteira   o funil das quatro estacoes do livro-caixa, deitado
     queima    quanto tempo o estoque dura, em varios ritmos
     medidor   a autonomia num ponteiro so'
     pilha     a barra empilhada de uma leva, estado por estado
     ondas     o tempo de maquina, 90 dias

   TUDO AQUI E' ECHARTS e passa pela montagem do `sala.js` (`S.montar`): a
   mesma espera de largura, a mesma dica, o mesmo redesenho na troca de tema.
   Nada e' SVG desenhado na mao.
   ========================================================================== */
(function () {
  'use strict';
  var S = window.SALA;
  if (!S) return;
  var M = {};
  var ec = function () { return window.echarts; };

  /* ---------------------------------------------------------- simbolos novos */
  var LU = {
    box: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    fuel: '<line x1="3" x2="15" y1="22" y2="22"/><line x1="4" x2="14" y1="9" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/>',
    plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    disc: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"/><path d="m6.08 14.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"/>',
    'refresh-cw': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    'circle-slash': '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    'hard-drive': '<line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/>'
  };
  M.ico = function (nome, cls) {
    if (!LU[nome]) return S.ico(nome, cls);
    return '<svg class="rs-i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" '
      + 'aria-hidden="true">' + LU[nome] + '</svg>';
  };

  function base() {
    var c = S.comum();
    return {
      c: c,
      dica: {
        backgroundColor: c.dica.backgroundColor, borderColor: c.dica.borderColor,
        borderWidth: 1, padding: c.dica.padding, textStyle: c.dica.textStyle,
        extraCssText: c.dica.extraCssText
      }
    };
  }

  /* ====================================================== A ESTEIRA, DEITADA
     Funil nativo do ECharts, na horizontal: cada estacao e' um trapezio, e a
     largura cai na proporcao de quanto material chegou ate' la'. E' a peca que
     responde a pergunta desta home: onde o video parou. */
  M.grafEsteira = function (dom, estacoes) {
    return S.montar(dom, function (g) {
      var b = base(), c = b.c;
      var topo = Math.max.apply(null, estacoes.map(function (e) { return e.valor; })
        .concat([1]));
      g.setOption({
        animationDuration: c.animationDuration, animationEasing: c.animationEasing,
        textStyle: c.textStyle,
        tooltip: Object.assign({
          trigger: 'item',
          formatter: function (p) {
            var e = estacoes[p.dataIndex] || {};
            return S.tituloTip(p.name)
              + S.linhaTip(p.color, 'Vídeos', S.fmt(p.value))
              + S.linhaTip(c.txt3, 'De Quem Entrou',
                  S.pct(topo ? (p.value / topo) * 100 : 0))
              + (e.nota ? '<div style="margin-top:7px;font-size:11px;opacity:.7;'
                  + 'max-width:230px;white-space:normal;line-height:1.45">'
                  + S.seguro(e.nota) + '</div>' : '');
          }
        }, b.dica),
        series: [{
          type: 'funnel', orient: 'horizontal', funnelAlign: 'center',
          left: 6, right: 6, top: 16, bottom: 34, min: 0, max: topo,
          /* ESTACAO VAZIA NAO PODE PARECER CHEIA. Com `minSize` alto, zero vira
             um bloco de um quinto da tela e a tela mente. O minimo e' quase
             nada, e quem esta' em zero e' desenhado vazado, so' com o contorno. */
          minSize: '11%', maxSize: '100%', sort: 'none', gap: 10,
          label: { show: true, position: 'bottom', distance: 8, color: c.txt2,
            fontSize: 11.5, fontWeight: 700, lineHeight: 15,
            formatter: function (p) { return p.name + '\n' + S.fmt(p.value); } },
          labelLine: { show: false },
          itemStyle: { borderColor: c.surf, borderWidth: 2, borderRadius: 4 },
          emphasis: { label: { fontSize: 12.5, color: c.txt } },
          data: estacoes.map(function (e, i) {
            var k = S.tinta(e.cor || S.corDado(1));
            if (!e.valor) {
              return { name: e.rotulo, value: 0,
                itemStyle: { color: S.varTema('--rs-trilho'), borderColor: k,
                  borderWidth: 1.5, borderType: 'dashed', borderRadius: 4 } };
            }
            return { name: e.rotulo, value: e.valor,
              itemStyle: { color: new (ec().graphic.LinearGradient)(0, 0, 1, 0, [
                { offset: 0, color: S.alfa(k, 0.9 - i * 0.06) },
                { offset: 1, color: S.alfa(k, 0.55 - i * 0.05) }]) } };
          })
        }]
      }, true);
    });
  };

  /* ===================================================== A CURVA DE QUEIMA
     Quanto tempo o estoque dura. Uma linha por ritmo, e a area so' embaixo da
     linha do ritmo escolhido: cinco areas empilhadas viram borrao. */
  M.grafQueima = function (dom, estoque, ritmos, escolhido, dias) {
    dias = dias || 120;
    return S.montar(dom, function (g) {
      var b = base(), c = b.c;
      var eixo = [];
      for (var i = 0; i <= dias; i++) eixo.push(i);
      var series = ritmos.map(function (r, i) {
        var k = S.tinta(S.corDado((i % 5) + 1));
        var vivo = r === escolhido;
        var vals = eixo.map(function (d) { return Math.max(0, estoque - r * d); });
        return {
          name: r + (r === 1 ? ' por dia' : ' por dia'), type: 'line',
          data: vals, smooth: false, showSymbol: false, z: vivo ? 5 : 2,
          lineStyle: { color: k, width: vivo ? 2.8 : 1.4,
            opacity: vivo ? 1 : 0.45, type: vivo ? 'solid' : 'dashed' },
          areaStyle: vivo ? { color: new (ec().graphic.LinearGradient)(0, 0, 0, 1, [
            { offset: 0, color: S.alfa(k, 0.28) },
            { offset: 1, color: S.alfa(k, 0) }]) } : null
        };
      });
      g.setOption({
        animationDuration: c.animationDuration, animationEasing: c.animationEasing,
        textStyle: c.textStyle,
        grid: { left: 4, right: 14, top: 18, bottom: 4, containLabel: true },
        tooltip: Object.assign({
          trigger: 'axis',
          axisPointer: { type: 'line', lineStyle: { color: c.linha2, width: 1 }, z: 1 },
          formatter: function (ps) {
            if (!ps.length) return '';
            var t = S.tituloTip('Daqui a ' + ps[0].axisValue
              + (ps[0].axisValue === 1 ? ' dia' : ' dias'));
            ps.forEach(function (p) {
              t += S.linhaTip(p.color, p.seriesName, S.fmt(p.value) + ' na prateleira');
            });
            return t;
          }
        }, b.dica),
        xAxis: { type: 'category', boundaryGap: false, data: eixo,
          axisLine: { lineStyle: { color: c.linha } }, axisTick: { show: false },
          axisLabel: { color: c.txt3, fontSize: 10.5, fontWeight: 700, margin: 12,
            interval: Math.max(1, Math.round(dias / 8)) - 1,
            formatter: function (v) { return v + 'd'; } } },
        yAxis: { type: 'value', minInterval: 1,
          splitLine: { lineStyle: { color: c.linha } },
          axisLine: { show: false }, axisTick: { show: false },
          axisLabel: { color: c.txt3, fontSize: 10.5, fontWeight: 600, margin: 10 } },
        series: series
      }, true);
    });
  };

  /* ========================================================== O MEDIDOR
     Ponteiro unico. Serve para o que tem teto e leitura de relance: autonomia
     em dias, e o quanto da leva ja' foi gasto. */
  M.grafMedidor = function (dom, conf) {
    return S.montar(dom, function (g) {
      var b = base(), c = b.c;
      var k = S.tinta(conf.cor || S.corDado(1));
      var max = conf.max || 100;
      var v = Math.max(0, Math.min(max, conf.valor || 0));
      g.setOption({
        animationDuration: c.animationDuration + 300, animationEasing: 'cubicOut',
        textStyle: c.textStyle,
        series: [{
          type: 'gauge', startAngle: 208, endAngle: -28, min: 0, max: max,
          center: ['50%', '64%'], radius: '96%', splitNumber: conf.passos || 4,
          progress: { show: true, width: 15, roundCap: true,
            itemStyle: { color: new (ec().graphic.LinearGradient)(0, 0, 1, 0, [
              { offset: 0, color: S.alfa(k, 0.5) }, { offset: 1, color: k }]) } },
          pointer: { show: true, width: 4, length: '62%',
            itemStyle: { color: c.txt2 } },
          anchor: { show: true, size: 12, showAbove: true,
            itemStyle: { color: c.surf, borderColor: c.txt2, borderWidth: 2 } },
          axisLine: { roundCap: true,
            lineStyle: { width: 15, color: [[1, S.varTema('--rs-trilho')]] } },
          axisTick: { distance: -19, length: 4,
            lineStyle: { color: c.linha2, width: 1 } },
          splitLine: { distance: -21, length: 8,
            lineStyle: { color: c.linha2, width: 2 } },
          axisLabel: { distance: -13, color: c.txt3, fontSize: 9.5, fontWeight: 700,
            formatter: function (x) { return S.curto(x); } },
          title: { offsetCenter: [0, '34%'], color: c.txt3, fontSize: 11,
            fontWeight: 700 },
          detail: { offsetCenter: [0, '6%'], color: c.txt, fontSize: 30,
            fontWeight: 800, valueAnimation: true,
            formatter: function (x) { return conf.texto ? conf.texto(x) : S.curto(x); } },
          data: [{ value: v, name: conf.rotulo || '' }]
        }]
      }, true);
    });
  };

  /* ================================================ A PILHA, UMA POR LEVA
     Barra deitada empilhada: cada leva vira uma linha, e cada estado um pedaco
     dela. E' aqui que se ve' qual caixa ja' foi consumida e qual esta' intacta. */
  M.grafPilha = function (dom, linhas, series) {
    return S.montar(dom, function (g) {
      var b = base(), c = b.c;
      g.setOption({
        animationDuration: c.animationDuration, animationEasing: c.animationEasing,
        textStyle: c.textStyle,
        grid: { left: 2, right: 18, top: 4, bottom: 2, containLabel: true },
        tooltip: Object.assign({
          trigger: 'axis',
          axisPointer: { type: 'shadow', shadowStyle: { color: S.alfa(S.tinta(c.txt), .05) } },
          formatter: function (ps) {
            if (!ps.length) return '';
            var t = S.tituloTip(ps[0].name), soma = 0;
            ps.forEach(function (p) { soma += p.value || 0; });
            ps.forEach(function (p) {
              if (p.value) t += S.linhaTip(p.color, p.seriesName, S.fmt(p.value));
            });
            return t + S.linhaTip(c.txt3, 'Total Da Leva', S.fmt(soma));
          }
        }, b.dica),
        legend: { bottom: 0, left: 'center', icon: 'roundRect', itemWidth: 9,
          itemHeight: 9, itemGap: 14,
          textStyle: { color: c.txt2, fontSize: 11, fontWeight: 600,
            fontFamily: 'Manrope, sans-serif' } },
        xAxis: { type: 'value', show: false },
        yAxis: { type: 'category', inverse: true, data: linhas,
          axisLine: { show: false }, axisTick: { show: false },
          axisLabel: { color: c.txt2, fontSize: 12, fontWeight: 700, margin: 10,
            width: 200, overflow: 'truncate' } },
        series: series.map(function (s, i) {
          var k = S.tinta(s.cor || S.corDado(i + 1));
          return { name: s.nome, type: 'bar', stack: 'a', barWidth: 16,
            /* O TRILHO ENTRA NA PRIMEIRA SERIE: sem ele, a leva vazia vira uma
               linha em branco com o nome solto no meio do cartao. */
            showBackground: i === 0,
            backgroundStyle: { color: S.varTema('--rs-trilho'), borderRadius: 5 },
            data: s.vals, itemStyle: { color: k,
              borderRadius: i === 0 ? [5, 0, 0, 5] : (i === series.length - 1
                ? [0, 5, 5, 0] : 0) },
            emphasis: { focus: 'series' } };
        })
      }, true);
    });
  };

  /* ================================================= O TEMPO DE MAQUINA
     Noventa dias: coluna quando saiu alguma coisa, area apagada quando a
     maquina ficou parada. E' o unico grafico desta tela com eixo de tempo. */
  M.grafMaquina = function (dom, dias) {
    return S.montar(dom, function (g) {
      var b = base(), c = b.c;
      var k = S.tinta(S.corDado(1)), p = S.tinta(S.corDado(4));
      var eixo = dias.map(function (d) {
        return d.dia.slice(8) + '/' + d.dia.slice(5, 7);
      });
      g.setOption({
        animationDuration: c.animationDuration, animationEasing: c.animationEasing,
        textStyle: c.textStyle,
        grid: { left: 4, right: 12, top: 18, bottom: 4, containLabel: true },
        tooltip: Object.assign({
          trigger: 'axis',
          axisPointer: { type: 'line', lineStyle: { color: c.linha2, width: 1 }, z: 1 },
          formatter: function (ps) {
            if (!ps.length) return '';
            var m = {};
            ps.forEach(function (x) { m[x.seriesName] = x.value; });
            var saiu = m['Saíram'] || 0;
            return S.tituloTip(ps[0].axisValue)
              + S.linhaTip(k, 'Saíram', S.fmt(saiu) + (saiu ? '' : ' — máquina parada'))
              + S.linhaTip(p, 'Contas Sem Saída', S.fmt(m['Contas Sem Saída'] || 0), true);
          }
        }, b.dica),
        xAxis: { type: 'category', data: eixo, boundaryGap: ['2%', '2%'],
          axisLine: { lineStyle: { color: c.linha } }, axisTick: { show: false },
          axisLabel: { color: c.txt3, fontSize: 10.5, fontWeight: 700, margin: 12,
            interval: Math.max(1, Math.ceil(eixo.length / 9)) - 1 } },
        yAxis: { type: 'value', minInterval: 1,
          splitLine: { lineStyle: { color: c.linha } },
          axisLine: { show: false }, axisTick: { show: false },
          axisLabel: { color: c.txt3, fontSize: 10.5, fontWeight: 600, margin: 10 } },
        series: [
          { name: 'Contas Sem Saída', type: 'line', z: 1, silent: true,
            data: dias.map(function (d) { return d.paradas; }),
            showSymbol: false, smooth: 0.2,
            lineStyle: { color: p, width: 1.4, type: 'dashed', opacity: .7 },
            areaStyle: { color: new (ec().graphic.LinearGradient)(0, 0, 0, 1, [
              { offset: 0, color: S.alfa(p, .12) },
              { offset: 1, color: S.alfa(p, 0) }]) } },
          { name: 'Saíram', type: 'bar', z: 3, barMaxWidth: 14, barMinHeight: 0,
            data: dias.map(function (d) { return d.saidas; }),
            itemStyle: { borderRadius: [3, 3, 0, 0],
              color: new (ec().graphic.LinearGradient)(0, 0, 0, 1, [
                { offset: 0, color: S.alfa(k, .95) },
                { offset: 1, color: S.alfa(k, .45) }]) },
            emphasis: { itemStyle: { color: k } } }
        ]
      }, true);
    });
  };

  /* ================================================== O MAPA DO MATERIAL
     Treemap: cada retangulo e' uma pasta da fonte, e o tamanho e' quanto video
     tem dentro. Pasta ja' ligada e' cheia; pasta que ainda esta' solta la' fora
     e' vazada. Serve para ver material parado sem precisar abrir o Drive. */
  M.grafMapa = function (dom, itens) {
    return S.montar(dom, function (g) {
      var b = base(), c = b.c;
      g.setOption({
        animationDuration: c.animationDuration, animationEasing: c.animationEasing,
        textStyle: c.textStyle,
        tooltip: Object.assign({
          formatter: function (p) {
            var d = p.data || {};
            return S.tituloTip(p.name)
              + S.linhaTip(p.color, 'Vídeos', S.fmt(p.value))
              + S.linhaTip(c.txt3, 'Estado', d.ligada ? 'Ligada no livro' : 'Só no Drive');
          }
        }, b.dica),
        series: [{
          type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false },
          left: 0, right: 0, top: 0, bottom: 0, itemStyle: { borderWidth: 0, gapWidth: 4 },
          label: { show: true, formatter: function (p) {
            return '{n|' + p.name + '}\n{v|' + S.fmt(p.value) + ' vídeos}';
          }, rich: {
            n: { color: '#fff', fontSize: 12.5, fontWeight: 800, lineHeight: 18,
                 fontFamily: 'Manrope, sans-serif' },
            v: { color: 'rgba(255,255,255,.82)', fontSize: 11, fontWeight: 600,
                 fontFamily: 'Manrope, sans-serif' }
          }, position: 'insideTopLeft', padding: [10, 12] },
          data: itens.map(function (t, i) {
            var k = S.tinta(S.corDado((i % 5) + 1));
            return { name: t.nome, value: Math.max(1, t.videos || 0), ligada: t.ligada,
              itemStyle: { color: t.ligada ? k : S.alfa(k, .3),
                borderColor: k, borderWidth: t.ligada ? 0 : 1.5, borderRadius: 8 } };
          })
        }]
      }, true);
    });
  };

  /* ============================================ O INSTRUMENTO, para a grade
     Mostrador pequeno: arco unico, sem ponteiro, com o numero no meio. Cabe em
     cartao de 1/4 de largura e continua legivel, ao contrario do medidor
     grande. Nao e' KPI com grafico dentro: o arco E' o numero. */
  M.grafArco = function (dom, conf) {
    return S.montar(dom, function (g) {
      var b = base(), c = b.c;
      var k = S.tinta(conf.cor || S.corDado(1));
      var max = conf.max || 100;
      g.setOption({
        animationDuration: c.animationDuration + 200, animationEasing: 'cubicOut',
        textStyle: c.textStyle,
        series: [{
          type: 'gauge', startAngle: 90, endAngle: -270, min: 0, max: max,
          center: ['50%', '50%'], radius: '92%',
          /* EM ZERO O ARCO NAO DESENHA NADA. Com `roundCap`, um valor zerado
             vira uma bolinha solta no alto do circulo, que parece defeito. */
          progress: { show: (conf.valor || 0) > 0, width: 10, roundCap: true,
            itemStyle: { color: k } },
          pointer: { show: false },
          axisLine: { roundCap: true,
            lineStyle: { width: 10, color: [[1, S.varTema('--rs-trilho')]] } },
          axisTick: { show: false }, splitLine: { show: false },
          axisLabel: { show: false },
          title: { show: false },
          detail: { offsetCenter: [0, 0], color: c.txt, fontSize: 21, fontWeight: 800,
            valueAnimation: true,
            formatter: function (x) { return conf.texto ? conf.texto(x) : S.curto(x); } },
          data: [{ value: Math.max(0, Math.min(max, conf.valor || 0)) }]
        }]
      }, true);
    });
  };

  window.MOTOR = M;
})();
