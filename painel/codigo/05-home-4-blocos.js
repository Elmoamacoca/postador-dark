/* GERADO A PARTIR DE `docs/propostas/painel/blocos.js`. Ordem numerica e lei.
   ================================================= OS BLOCOS DA HOME DO POSTADOR
   Cada bloco e' um cartao pronto: devolve o HTML e sabe se pintar. As tres
   propostas escolhem QUAIS blocos entram e em QUE ORDEM, e e' nisso que elas se
   diferenciam. Assim a peca e' a mesma nas tres e a leitura e' diferente em cada
   uma, em vez de tres telas iguais com cores trocadas.

   PALAVRA SIMPLES em todo rotulo: video guardado, video agendado, ja' publicado,
   pessoas alcancadas, dias que sobram. Nada de esteira, prateleira ou acervo.
   ========================================================================== */
(function () {
  var S = window.SALA, M = window.MOTOR, P = window.PN;
  var B = {};
  var pinturas = [];

  /* --------------------------------------------------------------- utilidades */
  function cartao(titulo, dir, corpo, cls) {
    return '<div class="rs-cd' + (cls ? ' ' + cls : '') + '">'
      + '<div class="rs-cd-h"><h3>' + titulo + '</h3>'
      + '<div class="rs-dir">' + (dir || '') + '</div></div>'
      + '<div class="rs-cd-b">' + corpo + '</div></div>';
  }
  B.cartao = cartao;
  B.secao = function (rotulo, direita) {
    return '<div class="rs-tit"><span class="rs-rot1">' + rotulo + '</span>'
      + '<span class="rs-rot3">' + (direita || '') + '</span></div>';
  };
  B.seg = function (id, opcoes, vivo) {
    return '<div class="rs-seg" id="' + id + '">' + opcoes.map(function (o) {
      return '<button type="button" data-v="' + o[0] + '"'
        + (String(o[0]) === String(vivo) ? ' class="on"' : '') + '>' + o[1]
        + '</button>';
    }).join('') + '</div>';
  };
  B.ligarSeg = function (id, aoTrocar) {
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
  };
  function vazio(titulo, recado) {
    return '<p class="rs-sem"><b>' + titulo + '</b>' + recado + '</p>';
  }
  B.vazio = vazio;
  function retrato(p, tam) {
    var t = tam || 28;
    if (p.retrato) {
      return '<img class="pn-rt" style="width:' + t + 'px;height:' + t + 'px" src="'
        + p.retrato + '" alt="">';
    }
    return '<span class="pn-rt vaz" style="width:' + t + 'px;height:' + t + 'px">'
      + (p.u || '?').slice(0, 1).toUpperCase() + '</span>';
  }
  B.retrato = retrato;
  function pinta(f) { pinturas.push(f); }
  B.pintarTudo = function () {
    pinturas.forEach(function (f) { try { f(); } catch (e) { /* segue */ } });
  };
  B.limpar = function () { pinturas = []; };

  /* ============================================================ OS NUMEROS
     Quatro cartoes de numero. A minicurva de 92 por 30 so' entra onde ha' serie
     de verdade: grafico grande dentro de cartao de numero foi reprovado. */
  B.numeros = function (janela) {
    var r = P.resumoRede(janela), a = r.agora;
    var serie = P.serieRede(janela).map(function (x) { return x.a; });
    var nPub = P.serieRede(janela).map(function (x) { return x.b; });
    return { html: '<div class="rs-grade rs-g4">'
      + S.kpi({ rot: 'Visualizações', ico: 'eye', valor: S.curto(a.vis),
          delta: r.var_vis, pe: r.var_vis == null ? 'sem período anterior' : '',
          serie: serie, cor: S.corVar(1) })
      + S.kpi({ rot: 'Pessoas Alcançadas', ico: 'users', valor: S.curto(a.alc),
          delta: r.var_alc, pe: r.var_alc == null ? 'sem período anterior' : '',
          serie: serie, cor: S.corVar(2) })
      + S.kpi({ rot: 'Curtidas E Comentários', ico: 'heart',
          valor: S.curto(a.inter), delta: r.var_inter,
          pe: S.fmt(a.cur) + ' curtidas · ' + S.fmt(a.com) + ' comentários',
          cor: S.corVar(3) })
      + S.kpi({ rot: 'Publicações', ico: 'send', valor: S.fmt(a.n),
          delta: r.var_n, serie: nPub,
          pe: a.n ? S.pct(a.eng) + ' de engajamento' : 'nada publicado no período',
          cor: S.corVar(4) })
      + '</div>', pinta: function () {} };
  };

  /* ============================================ VISUALIZACOES, DIA A DIA */
  B.curvaGeral = function (janela, medida, idSeg) {
    var serie = P.serieRede(janela, medida || 'vis');
    var nome = medida === 'alc' ? 'Pessoas Alcançadas'
      : medida === 'inter' ? 'Curtidas E Comentários' : 'Visualizações';
    var dir = idSeg ? B.seg(idSeg, [['vis', 'Visualizações'],
      ['alc', 'Alcance'], ['inter', 'Interações']], medida || 'vis') : '';
    var html = cartao('O Desempenho Dia A Dia', dir,
      serie.length
        ? '<div class="rs-ec" id="pn-curva"></div>'
          + S.legendaSerie(nome, 'Publicações', S.corVar(1), S.corVar(4),
              P.temAnterior(janela))
        : vazio('Nada publicado neste período',
            'Escolha um período maior no topo, ou agende um vídeo para a fila '
            + 'começar a andar.'), 'estica');
    pinta(function () {
      if (!serie.length) return;
      S.grafSerie(document.getElementById('pn-curva'), serie,
        { nomeA: nome, nomeB: 'Publicações',
          corA: S.corVar(1), corB: S.corVar(4) });
    });
    return { html: html };
  };

  /* ================================================== QUEM ESTA' CRESCENDO */
  B.crescendo = function (janela) {
    var c = P.crescimento(janela);
    var itens = c.lista.map(function (p) {
      return ['@' + p.u, c.base ? Math.round(p.var_vis) : Math.round(p.mediaVis)];
    });
    var temNumero = itens.some(function (i) { return i[1]; });
    var html = cartao('Quem Está Crescendo',
      '<span class="rs-rot3">' + (c.base ? 'contra o período anterior'
        : 'média por publicação') + '</span>',
      temNumero
        ? '<div class="rs-ec baixo" id="pn-cresce"></div>'
          + '<p class="pn-nota">' + (c.base
              ? 'Quanto cada perfil subiu ou caiu em visualizações, comparado com '
                + 'o período anterior de mesmo tamanho.'
              : 'Ainda não há período anterior para comparar. Por enquanto, a '
                + 'ordem é a média de visualizações por publicação.') + '</p>'
        : vazio('Ainda não dá para comparar',
            'Nenhum perfil filtrado publicou o bastante neste período.'), 'estica');
    pinta(function () {
      if (!temNumero) return;
      /* SEM BASE DE COMPARACAO NAO SE USA O DESENHO DE VARIACAO: barra que sai
         do zero para os dois lados le'-se como "subiu" e "caiu", e media por
         publicacao nao sobe nem cai. Ai' a peca certa e' a barra comum. */
      if (c.base) {
        M.grafVariacao(document.getElementById('pn-cresce'), itens, '%');
      } else {
        S.grafBarraH(document.getElementById('pn-cresce'), itens, S.corVar(1),
                     'Média Por Publicação');
      }
    });
    return { html: html };
  };

  /* ======================================================== O ULTIMO VIRAL
     Viral com regra, e nao no olho: a publicacao mais recente que fez pelo menos
     o dobro da mediana de visualizacao do periodo. */
  B.viral = function (janela) {
    var v = P.viral(janela);
    if (!v) {
      return { html: cartao('O Último Viral', '',
        vazio('Nenhuma publicação no período',
          'Sem publicação não há como saber o que estourou.')) };
    }
    var p = v.post;
    var html = cartao('O Último Viral',
      '<span class="rs-pil ' + (v.estourou ? 'no' : 'pa') + '">'
        + (v.estourou ? v.quantas.toFixed(1).replace('.', ',') + 'x a média'
                      : 'nada estourou ainda') + '</span>',
      '<div class="pn-viral">'
      + '<div class="pn-viral-c"><div class="pn-viral-q">'
      + M.ico('zap', 'g') + '</div>'
      + '<div class="pn-viral-t"><b>' + S.seguro(p.legenda || 'Sem legenda')
      + '</b><span>@' + S.seguro(p.perfil) + ' · '
      + (p.fmt === 'carrossel' ? 'Carrossel' : 'Reel') + ' · '
      + P.idade(p.quando) + '</span></div>'
      + (p.endereco ? '<a class="bt mini" target="_blank" rel="noopener" href="'
          + S.seguro(p.endereco) + '">Abrir No Instagram</a>' : '')
      + '</div>'
      + '<div class="pn-viral-n">'
      + [['Visualizações', S.fmt(p.vis)], ['Pessoas Alcançadas', S.fmt(p.alc)],
         ['Curtidas', S.fmt(p.cur)], ['Comentários', S.fmt(p.com)],
         ['Salvamentos', S.fmt(p.sal)],
         ['Engajamento', S.pct(p.eng)]].map(function (x) {
        return '<div class="pn-p"><span class="rs-rot2">' + x[0] + '</span>'
          + '<div class="num rs-tn">' + x[1] + '</div></div>';
      }).join('') + '</div>'
      + '<div class="pn-viral-b"><span class="rs-rot2">Contra A Mediana Do '
      + 'Período</span><div class="rs-ec" style="height:96px" id="pn-viral-g">'
      + '</div></div></div>');
    pinta(function () {
      M.grafDuplo(document.getElementById('pn-viral-g'),
        ['Esta publicação', 'Mediana do período'],
        [{ nome: 'Visualizações', cor: S.corVar(1),
           vals: [p.vis, v.mediana] }]);
    });
    return { html: html };
  };

  /* ==================================================== A TABELA DOS PERFIS */
  B.tabelaPerfis = function (janela) {
    var l = P.porPerfil(janela).sort(function (a, b) { return b.vis - a.vis; });
    var html = cartao('Os Perfis, Lado A Lado',
      '<span class="rs-rot3">' + l.length + (l.length === 1 ? ' perfil' : ' perfis')
        + '</span>',
      l.length
        ? '<div class="rs-rolx"><table class="rs-tab"><thead><tr>'
          + ['Perfil', 'Seguidores', 'Publicações', 'Visualizações',
             'Pessoas Alcançadas', 'Curtidas E Comentários', 'Engajamento',
             'Vídeos Guardados', 'Última Publicação'].map(function (t, i) {
            return '<th' + (i ? ' class="num"' : '') + '><span class="th">' + t
              + '</span></th>';
          }).join('') + '</tr></thead><tbody>'
          + l.map(function (p) {
            return '<tr><td class="nm">' + retrato(p, 24)
              + '<span class="tx">@' + S.seguro(p.u)
              + (p.mercado ? '<small> · ' + S.seguro(p.mercado) + '</small>' : '')
              + '</span></td>'
              + '<td class="num">' + S.fmt(p.seguidores) + '</td>'
              + '<td class="num">' + S.fmt(p.n) + '</td>'
              + '<td class="num">' + S.fmt(p.vis) + '</td>'
              + '<td class="num">' + S.fmt(p.alc) + '</td>'
              + '<td class="num">' + S.fmt(p.inter) + '</td>'
              + '<td class="num">' + (p.alc ? S.pct(p.eng) : '—') + '</td>'
              + '<td class="num">' + S.fmt(p.guardados) + '</td>'
              + '<td class="num">' + P.idade(p.ultima) + '</td></tr>';
          }).join('') + '</tbody></table></div>'
        : vazio('Nenhum perfil neste filtro',
            'Escolha outra etiqueta no topo da página.'));
    return { html: html };
  };

  /* ================================================ DE ONDE VEM A INTERACAO */
  B.mix = function (janela) {
    var partes = P.mixInteracao(janela);
    var total = partes.reduce(function (t, x) { return t + x.valor; }, 0);
    var html = cartao('De Onde Vem A Interação', '',
      total
        ? '<div class="pn-rosca"><div class="rs-ec rosca" id="pn-mix"></div>'
          + '<div class="rs-ec-mid"><b class="rs-tn">' + S.curto(total)
          + '</b><span>NO TOTAL</span></div></div>'
        : vazio('Nenhuma interação no período',
            'Curtida, comentário, salvamento e compartilhamento aparecem aqui.'));
    pinta(function () {
      if (!total) return;
      S.grafRosca(document.getElementById('pn-mix'), partes);
    });
    return { html: html };
  };

  /* ============================================ AS PUBLICACOES QUE RENDERAM */
  B.melhores = function (janela, quantas) {
    var l = P.melhores(janela, quantas || 6);
    var html = cartao('As Publicações Que Mais Renderam',
      '<span class="rs-rot3">por visualização</span>',
      l.length
        ? S.lista(l.map(function (p, i) {
            return { nome: (p.legenda || 'Sem legenda').slice(0, 52),
                     sub: '@' + p.perfil + ' · ' + P.idade(p.quando),
                     valor: p.vis, cor: S.corVar((i % 5) + 1) };
          }), null, 'Nada publicado no período.')
        : vazio('Nada publicado no período',
            'O ranking aparece assim que sair a primeira publicação.'));
    return { html: html };
  };

  /* ==================================================== A NUVEM DE PUBLICACOES */
  B.nuvem = function (janela) {
    var l = P.posts(janela).filter(function (p) { return p.alc; });
    var html = cartao('Cada Publicação, Alcance Contra Engajamento',
      '<span class="rs-rot3">o tamanho da bolha é a visualização</span>',
      l.length
        ? '<div class="rs-ec" id="pn-nuvem"></div>'
        : vazio('Sem publicação medida no período',
            'A bolha só aparece quando o Instagram devolve o alcance.'), 'estica');
    pinta(function () {
      if (!l.length) return;
      M.grafNuvem(document.getElementById('pn-nuvem'), l);
    });
    return { html: html };
  };

  /* ============================================ PERFIL A PERFIL, DUAS MEDIDAS */
  B.duplo = function (janela) {
    var l = P.porPerfil(janela).sort(function (a, b) { return b.vis - a.vis; });
    var temNumero = l.some(function (p) { return p.vis || p.alc; });
    var html = cartao('Alcance E Visualização, Perfil A Perfil', '',
      temNumero
        ? '<div class="rs-ec baixo" id="pn-duplo"></div>'
        : vazio('Sem número no período',
            'Nenhum perfil filtrado publicou neste período.'), 'estica');
    pinta(function () {
      if (!temNumero) return;
      M.grafDuplo(document.getElementById('pn-duplo'),
        l.map(function (p) { return '@' + p.u; }),
        [{ nome: 'Visualizações', cor: S.corVar(1),
           vals: l.map(function (p) { return p.vis; }) },
         { nome: 'Pessoas Alcançadas', cor: S.corVar(2),
           vals: l.map(function (p) { return p.alc; }) }]);
    });
    return { html: html };
  };

  /* =================================================== TEMPO MEDIO ASSISTIDO */
  B.tempo = function (janela) {
    var l = P.porPerfil(janela).filter(function (p) { return p.tempo; });
    var html = cartao('Quanto Tempo Assistem', '<span class="rs-rot3">em '
      + 'segundos, média por vídeo</span>',
      l.length
        ? '<div class="rs-ec baixo" id="pn-tempo"></div>'
        : vazio('Sem medição de tempo',
            'O Instagram só devolve o tempo médio para vídeo.'));
    pinta(function () {
      if (!l.length) return;
      S.grafBarraH(document.getElementById('pn-tempo'),
        l.map(function (p) { return ['@' + p.u, Math.round(p.tempo * 10) / 10]; }),
        S.corVar(4), 'Segundos');
    });
    return { html: html };
  };

  /* ================================================ MELHOR DIA E MELHOR HORA */
  B.diaSemana = function (janela) {
    var d = P.porDiaSemana(janela);
    var tem = d.some(function (x) { return x[1]; });
    var html = cartao('O Melhor Dia Da Semana',
      '<span class="rs-rot3">visualizações somadas</span>',
      tem ? '<div class="rs-ec baixo" id="pn-dsem"></div>'
          : vazio('Sem publicação no período', 'Nada para comparar por dia.'));
    pinta(function () {
      if (!tem) return;
      S.grafColuna(document.getElementById('pn-dsem'), d, S.corVar(2),
                   'Visualizações');
    });
    return { html: html };
  };
  B.hora = function (janela) {
    var d = P.porHora(janela);
    var tem = d.some(function (x) { return x[1]; });
    var html = cartao('A Melhor Hora Do Dia',
      '<span class="rs-rot3">visualizações somadas</span>',
      tem ? '<div class="rs-ec baixo" id="pn-hora"></div>'
          : vazio('Sem publicação no período', 'Nada para comparar por hora.'));
    pinta(function () {
      if (!tem) return;
      S.grafColuna(document.getElementById('pn-hora'), d, S.corVar(3),
                   'Visualizações');
    });
    return { html: html };
  };
  B.calor = function (janela) {
    var m = P.matrizHora(janela);
    var html = cartao('Em Que Dia E Hora Sai Publicação',
      '<span class="rs-rot3">cada quadrado é uma hora</span>',
      S.heatmap(m, ['publicação', 'publicações']));
    return { html: html };
  };

  /* ========================================================= OS SEGUIDORES */
  B.seguidores = function () {
    var c = P.curvaSeguidores();
    var total = P.visiveis().reduce(function (t, p) {
      return t + p.seguidores; }, 0);
    var html = cartao('Seguidores',
      '<span class="rs-rot3">' + S.fmt(total) + ' somando os perfis</span>',
      c.length >= 2
        ? '<div class="rs-ec baixo" id="pn-seg"></div>'
        : vazio('Só há uma leitura de seguidores',
            'A contagem começou em ' + (c.length ? c[0].rot : 'agora')
            + '. A linha aparece a partir da segunda leitura.'));
    pinta(function () {
      if (c.length < 2) return;
      S.grafSerie(document.getElementById('pn-seg'), c,
        { nomeA: 'Seguidores', nomeB: 'Publicações',
          corA: S.corVar(2), corB: S.corVar(4) });
    });
    return { html: html };
  };

  /* ===================================================== O CAMINHO DO VIDEO */
  B.caminho = function (deitado) {
    var e = P.paradas();
    var total = e.reduce(function (t, x) { return t + x.valor; }, 0);
    var html = cartao('O Caminho Do Vídeo',
      '<span class="rs-rot3">' + S.fmt(total) + ' vídeos no sistema</span>',
      (deitado
        ? '<div class="rs-ec baixo" id="pn-caminho"></div>'
        : '<div id="pn-caminho"></div>')
      + '<div class="rs-ec-leg">' + e.map(function (x) {
        return '<span><i style="background:' + x.cor + '"></i>' + x.rotulo
          + '</span>';
      }).join('')
      + (P.ESTEIRA.erro ? '<span style="color:var(--rs-neg)">'
          + '<i style="background:var(--rs-neg)"></i>' + S.fmt(P.ESTEIRA.erro)
          + ' recusados pelo Instagram</span>' : '')
      + '<span style="margin-left:auto;color:var(--soft)">'
      + (e[1].valor || e[2].valor ? 'o vídeo está andando'
                                 : 'nada passou da primeira parada') + '</span>'
      + '</div>', deitado ? '' : 'estica');
    pinta(function () {
      var dom = document.getElementById('pn-caminho');
      if (!dom) return;
      if (deitado) M.grafEsteira(dom, e);
      else dom.innerHTML = S.funil(e, S.corVar(1));
    });
    return { html: html };
  };

  /* ============================================== QUANTOS DIAS DE VIDEO SOBRAM */
  B.sobra = function (ritmo) {
    var html = cartao('Quantos Dias De Vídeo Sobram',
      '<span class="rs-rot3">no ritmo escolhido</span>',
      '<div class="pn-med" id="pn-sobra"></div>'
      + '<div class="pn-tri" id="pn-sobra-pe"></div>', 'estica');
    pinta(function () {
      var d = P.sobram(ritmo) || 0, teto = P.tetoSobram();
      M.grafMedidor(document.getElementById('pn-sobra'), {
        valor: Math.min(d, teto), max: teto, passos: 4, cor: S.corVar(1),
        rotulo: 'dias, publicando ' + ritmo + ' por dia',
        texto: function (x) { return S.fmt(x); }
      });
      document.getElementById('pn-sobra-pe').innerHTML =
        [['Vídeos Guardados', S.fmt(P.guardados())],
         ['Acaba Em', P.sobram(ritmo) != null ? P.acaba(ritmo) : '—'],
         ['Média Por Dia', (P.ritmoMedido() || 0).toLocaleString('pt-BR')]]
        .map(function (x) {
          return '<div class="pn-p"><span class="rs-rot2">' + x[0] + '</span>'
            + '<div class="num rs-tn">' + x[1] + '</div></div>';
        }).join('');
    });
    return { html: html };
  };

  /* =========================================== QUANDO O VIDEO GUARDADO ACABA */
  B.queima = function (ritmo, idSeg) {
    var html = cartao('Quando O Vídeo Guardado Acaba',
      B.seg(idSeg, P.RITMOS.map(function (r) {
        return [r, r + ' por dia']; }), ritmo),
      '<div class="rs-ec baixo" id="pn-queima"></div>'
      + '<div class="rs-ec-leg" id="pn-queima-leg"></div>', 'estica');
    pinta(function () {
      M.grafQueima(document.getElementById('pn-queima'), P.guardados(),
                   P.RITMOS, ritmo, 120);
      document.getElementById('pn-queima-leg').innerHTML =
        P.RITMOS.map(function (r, i) {
          var d = P.sobram(r);
          return '<span' + (r === ritmo ? '' : ' style="color:var(--soft)"')
            + '><i style="background:' + S.corVar((i % 5) + 1)
            + (r === ritmo ? '' : ';opacity:.45') + '"></i>' + r + ' por dia · '
            + (d != null ? S.fmt(d) + (d === 1 ? ' dia' : ' dias') : '—')
            + '</span>';
        }).join('');
    });
    return { html: html };
  };

  /* ===================================================== AS PASTAS DE VIDEO */
  B.pastas = function () {
    var pilha = P.pilhaDasPastas();
    var altura = Math.max(160, pilha.linhas.length * 48 + 46);
    var html = cartao('As Pastas De Vídeo',
      '<span class="rs-rot3">' + S.fmt(P.pastas().reduce(function (t, x) {
        return t + x.total; }, 0)) + ' vídeos</span>',
      pilha.linhas.length
        ? '<div class="rs-ec" style="height:' + altura + 'px" id="pn-pilha"></div>'
        : vazio('Nenhuma pasta escolhida',
            'Escolha uma pasta do Drive na aba de Mídia para os vídeos entrarem.'));
    pinta(function () {
      if (!pilha.linhas.length) return;
      M.grafPilha(document.getElementById('pn-pilha'), pilha.linhas, pilha.series);
    });
    return { html: html };
  };

  /* =========================================================== O MATERIAL */
  B.material = function (grande) {
    var mat = P.material();
    var html = cartao('O Material No Drive',
      '<span class="rs-pil ' + (P.FONTE.pronta ? 'no' : 'bl') + '">'
        + (P.FONTE.pronta ? 'Drive respondendo' : 'Drive fora') + '</span>',
      (!mat.length
        ? vazio('Nada visível no Drive',
            S.seguro(P.FONTE.motivo || 'O Drive respondeu sem pastas.'))
        : mat.length >= 3
          ? '<div class="' + (grande ? 'pn-c-mapa' : 'rs-ec baixo')
            + '" id="pn-mapa"></div>'
          : P.listaCaixas(mat))
      + '<div class="rs-ec-leg"><span><i style="background:' + S.corVar(1)
      + '"></i>Já no sistema</span><span style="color:var(--soft)">'
      + '<i class="pn-vaz"></i>Só no Drive</span>'
      + '<span style="margin-left:auto;color:var(--soft)">'
      + S.seguro(P.FONTE.raiz || '') + '</span></div>', 'estica');
    pinta(function () {
      if (mat.length >= 3) M.grafMapa(document.getElementById('pn-mapa'), mat);
    });
    return { html: html };
  };

  /* ============================================== PUBLICACOES POR DIA (90 DIAS) */
  B.porDia = function (janela, idSeg) {
    var html = cartao('Publicações Por Dia',
      idSeg ? B.seg(idSeg, [[30, '30 dias'], [90, '90 dias']], janela) : '',
      '<div class="rs-ec baixo" id="pn-pordia"></div>'
      + '<div class="rs-ec-leg" id="pn-pordia-leg"></div>', 'estica');
    pinta(function () {
      M.grafMaquina(document.getElementById('pn-pordia'),
                    P.publicacoesPorDia(janela));
      var rodou = P.diasComSaida(janela);
      document.getElementById('pn-pordia-leg').innerHTML =
        '<span><i style="background:' + S.corVar(1) + '"></i>Vídeos Publicados'
        + '</span><span style="color:var(--soft)"><i class="tr"></i>'
        + 'Perfis Sem Publicar</span>'
        + '<span style="margin-left:auto;color:var(--soft)">' + rodou + ' de '
        + janela + (rodou === 1 ? ' dia com publicação' : ' dias com publicação')
        + '</span>';
    });
    return { html: html };
  };

  /* ==================================================== O QUE ESTA' IMPEDINDO */
  B.impedimentos = function () {
    var l = P.impedimentos();
    var html = cartao('O Que Está Impedindo',
      '<span class="rs-pil ' + (l.length ? 'pa' : 'no') + '">'
        + (l.length ? l.length + (l.length > 1 ? ' abertos' : ' aberto')
                    : 'nada aberto') + '</span>',
      l.length
        ? '<div class="rs-fita">' + l.map(function (t) {
            return '<div class="rs-ev"><span class="ic ' + (t.cl || '') + '">'
              + M.ico(t.ico, 's') + '</span><span class="c"><b>'
              + S.seguro(t.titulo) + '</b><span>' + S.seguro(t.desc)
              + '</span></span><span class="q"><button class="bt mini'
              + (t.grave ? ' forte' : '') + '" type="button">' + t.botao
              + '</button></span></div>';
          }).join('') + '</div>'
        : vazio('Nada está impedindo',
            'Tem vídeo guardado, tem vídeo agendado e o Drive responde.'),
      'estica');
    return { html: html };
  };

  /* ======================================================= O QUE SAIU POR ULTIMO */
  B.ultimas = function (janela) {
    var l = P.ultimas(janela);
    var html = cartao('O Que Saiu Por Último',
      '<span class="rs-rot3">' + l.length
        + (l.length === 1 ? ' publicação' : ' publicações') + '</span>',
      l.length
        ? '<div class="rs-fita">' + l.slice(0, 14).map(function (f) {
            return '<div class="rs-ev"><span class="ic ' + f.cl + '">'
              + M.ico(f.ico, 's') + '</span><span class="c"><b>'
              + S.seguro(f.titulo) + '</b><span>' + S.seguro(f.sub)
              + '</span></span><span class="q"><b>' + f.q1 + '</b><span>'
              + f.q2 + '</span></span></div>';
          }).join('') + '</div>'
        : vazio('Nada saiu no período',
            'Assim que um vídeo for publicado ele aparece aqui.'), 'estica');
    return { html: html };
  };

  window.BL = B;
})();
