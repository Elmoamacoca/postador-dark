/* ================================================ A SUB-ABA MIDIAS DA FICHA

   O LAYOUT E' O POP-UP C, aprovado por ele em 10/09/2026, sem uma virgula de
   diferenca: o cartao mostra tres numeros, a barra de uso, a pasta e um botao; o
   botao abre uma janela quase do tamanho do monitor, com barra lateral de filtro a
   esquerda, grade agrupada POR MES no meio, e o detalhe do video entrando pela
   direita num painel que empurra a grade.

   DE ONDE VEM CADA PECA. A janela e' a da aba de Contas, emprestada pelo
   `window.CT_JANELA`. A previa ao passar o mouse e a torrada sao as do
   `04-analytics.css`, ja' no painel. O desenho proprio esta' no `06-midias.css`, que
   e' GERADO por `docs/propostas/midias/portar.py` a partir da maquete aprovada.

   AS TRES DECISOES DELE QUE ESTE ARQUIVO OBEDECE:
     1. Um video serve UM perfil so'.
     2. Uma pasta pertence a UM perfil, e se liga aqui dentro, na ficha.
     3. A lista mostra TRES estados: foram ao ar, marcados e guardados.

   O botao do Drive de cada video abre A PASTA DAQUELE CORTE, e nao a da leva: no
   Drive dele cada corte mora na propria pasta, e apontar para a leva foi o erro que
   ele pegou na maquete.
   ========================================================================== */
(function () {
  var tela = document.getElementById('pag-contas');
  if (!tela) return;

  var CACHE = {};        /* midias por conta, como vieram do servidor */
  var estado = {};       /* filtro, busca e video aberto, por conta */
  var pedindo = {};

  var FILTROS = [
    { v: 'tudo', r: 'Tudo' },
    { v: 'publicado', r: 'Foram Ao Ar' },
    { v: 'programado', r: 'Marcados' },
    { v: 'guardado', r: 'Guardados' }
  ];
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho',
               'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  function est(u) {
    if (!estado[u]) estado[u] = { filtro: 'tudo', busca: '', aberto: null };
    return estado[u];
  }

  /* ------------------------------------------------------------- utilidades */
  function n(v) { return (v || 0).toLocaleString('pt-BR'); }
  function curto(v) {
    v = v || 0;
    if (v >= 1000000) return enxuto(v / 1000000) + ' mi';
    if (v >= 1000) return enxuto(v / 1000) + ' mil';
    return n(v);
  }
  function enxuto(x) {
    var s = x >= 10 ? Math.round(x) : Math.round(x * 10) / 10;
    return String(s).replace('.', ',');
  }
  function mb(v) { return String((v || 0).toFixed(1)).replace('.', ',') + ' MB'; }
  function seguro(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
             .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* TODA PALAVRA DE TELA COM INICIAL MAIUSCULA, regra da casa. */
  function maiuscula(s) {
    return String(s || '').replace(/(^|\s)(\S)/g, function (x, a, b) {
      return a + b.toUpperCase();
    });
  }
  function pedaco(t, quanto) {
    t = String(t || '');
    return t.length > quanto ? t.slice(0, quanto - 1).trim() + '…' : t;
  }
  /* DATA SEM HORA E' LIDA COMO UTC pelo navegador, e o fuso empurra para o dia
     anterior: "17 ago" virava "16 ago". Por isso o T00:00:00. */
  function data(iso) {
    if (!iso) return null;
    var s = String(iso);
    return new Date(s.length <= 10 ? s + 'T00:00:00' : s);
  }
  var MES3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
              'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  function dia(iso) {
    var d = data(iso);
    return d ? d.getDate() + ' ' + MES3[d.getMonth()] : '—';
  }
  function hora(iso) {
    var d = data(iso);
    if (!d) return '';
    return String(d.getHours()).padStart(2, '0') + 'h' +
           String(d.getMinutes()).padStart(2, '0');
  }
  function seg(v) { return (v || 0).toFixed(0) + 's'; }

  function midiasDe(u) { return CACHE[u] ? CACHE[u].midias : []; }
  function pastasDe(u) { return CACHE[u] ? CACHE[u].pastas : []; }
  function porEstado(u, qual) {
    return midiasDe(u).filter(function (m) { return m.estado === qual; });
  }
  function contas(u) {
    return {
      publicado: porEstado(u, 'publicado').length,
      programado: porEstado(u, 'programado').length,
      guardado: porEstado(u, 'guardado').length
    };
  }

  /* O ESTOQUE EM DIAS. E' a pergunta que uma prateleira responde: quanto tempo esta
     conta ainda anda sozinha.

     RITMO MAGRO NAO VIRA PREVISAO: com duas saidas em trinta dias, a conta honesta
     dava "405 dias", que e' verdadeiro e inutil. Abaixo de quatro saidas no mes a
     tela assume um por dia e diz que assumiu. */
  function folego(u) {
    var agora = new Date();
    var saiu = porEstado(u, 'publicado').filter(function (m) {
      var d = data(m.quando);
      return d && (agora - d) / 86400000 <= 30;
    }).length;
    var porDia = saiu >= 4 ? saiu / 30 : null;
    var t = contas(u);
    var sobra = t.guardado + t.programado;
    var dias = Math.round(sobra / (porDia || 1));
    return {
      sobra: sobra,
      rotulo: !sobra ? '' : (dias > 90 ? 'Mais De 90 Dias'
        : dias + (dias === 1 ? ' Dia' : ' Dias')),
      nota: porDia ? 'no ritmo desta conta' : 'assumindo 1 por dia'
    };
  }

  /* ----------------------------------------------------------------- a capa */
  /* Video da prateleira nao tem capa da Meta: a miniatura vem do Drive, servida pela
     casa. Sem miniatura, o quadro mostra a marca do arquivo em vez de um buraco. */
  function capa(m, classe) {
    if (m.capa) {
      return '<span class="mid-capa ' + classe + '">' +
        '<img src="/' + seguro(m.capa) + '" alt="" loading="lazy" ' +
        'onerror="this.parentNode.classList.add(\'sem\');this.remove()">' +
        '<span class="dur">' + mb(m.mb) + '</span></span>';
    }
    return '<span class="mid-capa sem ' + classe + '">' +
      '<svg viewBox="0 0 24 24"><path d="M4 5.5h16v13H4z"/>' +
      '<path d="m10 9.5 5 2.5-5 2.5z"/></svg>' +
      '<span class="dur">' + mb(m.mb) + '</span></span>';
  }

  /* ------------------------------------------------------------ o carregamento */
  function carregar(u, forcar) {
    if (CACHE[u] && !forcar) return Promise.resolve(CACHE[u]);
    if (pedindo[u]) return pedindo[u];
    pedindo[u] = fetch('/contas/midias?u=' + encodeURIComponent(u),
                       { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        CACHE[u] = { midias: d.midias || [], pastas: d.pastas || [] };
        pedindo[u] = null;
        return CACHE[u];
      })
      .catch(function () {
        CACHE[u] = { midias: [], pastas: [], falhou: true };
        pedindo[u] = null;
        return CACHE[u];
      });
    return pedindo[u];
  }

  /* ================================================================ O CARTAO */
  window.CORPO_MIDIAS = function (c) {
    var u = c.arroba;
    if (!CACHE[u]) {
      carregar(u).then(function () {
        if (window.CT_JANELA) window.CT_JANELA.redesenhar();
      });
      return '<div class="md-carregando">Lendo o material desta conta…</div>';
    }
    if (CACHE[u].falhou) {
      return '<div class="md-carregando">Não consegui ler o material desta conta.' +
        ' <button class="gv-ligar" type="button" data-reler-midias="' + seguro(u) +
        '">Tentar de novo</button></div>';
    }

    var t = contas(u);
    var f = folego(u);
    var pastas = pastasDe(u);
    var total = t.publicado + t.programado + t.guardado;
    var usado = t.publicado + t.programado;
    var quanto = total ? Math.round(usado / total * 100) : 0;

    if (!pastas.length) {
      return '<div class="md-vazio">' +
        '<p><b>Nenhuma pasta ligada a esta conta.</b></p>' +
        '<p>Uma pasta pertence a um perfil só. Ligue a pasta da leva e o material ' +
        'aparece aqui.</p>' +
        '<button class="ct-bt verde" type="button" data-ligar-pasta="' + seguro(u) +
        '"><span class="txt">Ligar Uma Pasta</span><span class="circ"></span>' +
        '</button></div>';
    }

    return '' +
      '<div class="gv-nums">' +
        num('Foram Ao Ar', t.publicado, 'foi') +
        num('Marcados', t.programado, 'marcado') +
        num('Guardados', t.guardado, '') +
      '</div>' +

      '<div class="gv-barra" title="' + quanto +
        '% do material desta conta já foi usado"><i style="width:' + quanto +
        '%"></i></div>' +
      '<div class="gv-legenda">' +
        '<span><b>' + quanto + '%</b> Do Material Já Foi Usado</span>' +
        '<span title="' + f.nota + '">' + (f.sobra
          ? 'Resta Para <b>' + f.rotulo + '</b>'
          : 'Sem Material Em Pé') + '</span>' +
      '</div>' +

      '<div class="gv-pasta">' +
        '<span class="gv-pasta-n">' + seguro(maiuscula(pastas[0].nome)) +
          (pastas.length > 1 ? ' e mais ' + (pastas.length - 1) : '') + '</span>' +
        '<button class="gv-ligar" type="button" data-ligar-pasta="' + seguro(u) +
        '">Ligar Pasta</button>' +
      '</div>' +

      '<button class="ct-bt gv-abrir" type="button" data-abrir-midias="' +
        seguro(u) + '"><span class="txt">' +
        '<svg class="mrc" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.9" stroke-linecap="round"><rect x="3" y="4" width="18" ' +
        'height="16" rx="2"/><path d="M3 9h18M9 9v11"/></svg>' +
        'Abrir As ' + total + ' Mídias</span><span class="circ"></span></button>';
  };

  function num(rot, valor, tom) {
    return '<div class="gv-n' + (tom ? ' ' + tom : '') + '">' +
      '<b>' + valor + '</b><span>' + rot + '</span></div>';
  }

  /* ================================================================ A JANELA */
  function abrirMidias(u) {
    var c = window.CT_JANELA.contaDe(u);
    window.CT_JANELA.abrir(window.CT_JANELA.cabConta(c, 'Mídias desta conta'),
      corpoJanela(u), rodape(u), true);
    var jan = document.getElementById('ct-jan');
    jan.classList.add('enorme', 'inteira');
    pintarGrade(u);
  }

  function corpoJanela(u) {
    var e = est(u);
    var t = contas(u);
    var f = folego(u);
    var pastas = pastasDe(u);
    return '' +
      '<div class="ar">' +
        '<nav class="ar-lado">' +
          '<div class="ar-pasta">' +
            '<span class="ar-rot">' +
              (pastas.length > 1 ? 'As Pastas Desta Conta' : 'A Pasta Desta Conta') +
            '</span>' +
            pastas.map(function (p) {
              return '<b>' + seguro(maiuscula(p.nome)) + '</b>';
            }).join('') +
            '<button class="ar-trocar" type="button" data-ligar-pasta="' + seguro(u) +
            '">Ligar Outra</button>' +
          '</div>' +
          '<div class="ar-filtros" data-filtro="' + seguro(u) + '">' +
            FILTROS.map(function (x) {
              var q = x.v === 'tudo' ? t.publicado + t.programado + t.guardado : t[x.v];
              return '<button type="button" data-f="' + x.v + '"' +
                (e.filtro === x.v ? ' class="on"' : '') + '>' +
                '<span>' + x.r + '</span><b>' + q + '</b></button>';
            }).join('') +
          '</div>' +
          '<div class="ar-folego">' + (f.sobra
            ? '<b>' + f.rotulo + '</b><span>De material em pé, ' + f.nota + '</span>'
            : '<b>Vazia</b><span>Sem material em pé</span>') + '</div>' +
        '</nav>' +

        '<div class="ar-meio">' +
          '<div class="ar-topo">' +
            '<label class="ct-busca ar-busca">' +
              '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/>' +
              '<path d="M20 20l-3.5-3.5"/></svg>' +
              '<input type="text" placeholder="Buscar pelo nome do arquivo ou da ' +
              'pasta" data-busca="' + seguro(u) + '" autocomplete="off" ' +
              'spellcheck="false" value="' + seguro(e.busca) + '">' +
            '</label>' +
            '<span class="ar-conta" data-conta-linhas="' + seguro(u) + '"></span>' +
          '</div>' +
          '<div class="ar-corpo mid-rolo" data-grade="' + seguro(u) + '"></div>' +
        '</div>' +

        '<aside class="ar-peek" data-peek="' + seguro(u) + '"></aside>' +
      '</div>';
  }

  function rodape(u) {
    return '<span class="ct-jan-nota">Uma pasta pertence a um perfil só.</span>' +
      '<button class="ct-bt" type="button" data-reler-midias="' + seguro(u) +
      '"><span class="txt">Reler A Pasta</span><span class="circ"></span></button>' +
      '<button class="ct-bt" type="button" data-ct-fechar>' +
      '<span class="txt">Fechar</span><span class="circ"></span></button>';
  }

  function filtrar(u) {
    var e = est(u);
    var lista = midiasDe(u);
    if (e.filtro !== 'tudo') {
      lista = lista.filter(function (m) { return m.estado === e.filtro; });
    }
    if (e.busca) {
      var q = e.busca.toLowerCase();
      lista = lista.filter(function (m) {
        return (m.nome + ' ' + (m.pasta || '')).toLowerCase().indexOf(q) >= 0;
      });
    }
    /* SEM DATA VAI PARA O FIM: guardado nunca saiu, entao ele nao disputa ordem com
       quem tem data. Ordenar tudo por data jogaria a prateleira para cima. */
    return lista.slice().sort(function (a, b) {
      if (!a.quando && !b.quando) return a.nome.localeCompare(b.nome);
      if (!a.quando) return 1;
      if (!b.quando) return -1;
      return new Date(b.quando) - new Date(a.quando);
    });
  }

  /* AGRUPAR POR MES E' O QUE DA' CHAO A UMA GRADE GRANDE. Sem cabecalho, cem capas
     viram um tapete sem referencia; com ele, a rolagem tem marco. O que nunca saiu
     nao tem mes, e cai num grupo proprio no fim. */
  function grupos(lista) {
    var fora = [], mapa = {}, ordem = [];
    lista.forEach(function (m) {
      if (!m.quando) { fora.push(m); return; }
      var d = data(m.quando);
      var chave = d.getFullYear() + '-' + d.getMonth();
      if (!mapa[chave]) { mapa[chave] = []; ordem.push(chave); }
      mapa[chave].push(m);
    });
    var saida = ordem.map(function (k) {
      var p = k.split('-');
      return { titulo: MESES[Number(p[1])] + ' De ' + p[0], itens: mapa[k] };
    });
    if (fora.length) saida.push({ titulo: 'Sem Data, Nunca Usados', itens: fora });
    return saida;
  }

  function pintarGrade(u) {
    var alvo = document.querySelector('[data-grade="' + u + '"]');
    if (!alvo) return;
    var lista = filtrar(u);
    alvo.innerHTML = lista.length
      ? grupos(lista).map(function (g) {
        return '<section class="ar-grupo">' +
          '<h4>' + g.titulo + '<span>' + g.itens.length + '</span></h4>' +
          '<div class="ar-grade">' + g.itens.map(quadro).join('') + '</div>' +
        '</section>';
      }).join('')
      : '<div class="ar-vazio">Nada aqui com esse filtro.</div>';

    var conta = document.querySelector('[data-conta-linhas="' + u + '"]');
    if (conta) {
      conta.textContent = lista.length + (lista.length === 1 ? ' mídia' : ' mídias') +
        ' de ' + midiasDe(u).length;
    }
    ligarPrevias(alvo, u);
  }

  /* O QUADRO E' UMA CAIXA, e nao um botao.

     Ele carrega DOIS destinos: o corpo abre o painel do video, e a logo do Drive abre
     a pasta numa aba nova. Endereco dentro de botao e' HTML invalido, e o navegador
     desmonta a marcacao; por isso o botao cobre a face e o endereco fica por cima. */
  function quadro(m) {
    var pe = m.estado === 'publicado'
      ? '<b>' + dia(m.quando) + '</b><span>' + hora(m.quando) + '</span>'
      : (m.estado === 'programado'
        ? '<b>' + hora(m.quando) + '</b><span>' + dia(m.quando) + '</span>'
        : '<b>' + mb(m.mb) + '</b><span>Sem uso</span>');
    return '<div class="ar-q" data-mid="' + seguro(m.id) + '">' +
      '<button type="button" class="ar-q-face" data-abrir-peek="' + seguro(m.id) +
        '" title="' + seguro(m.nome) + '">' +
        capa(m, 'ar-capa') +
        '<span class="ar-e ' + m.estado + '"></span>' +
        '<span class="ar-q-pe">' + pe + '</span>' +
      '</button>' +
      botaoDrive(m, 'ar-drive') +
    '</div>';
  }

  /* --------------------------------------------------------- o painel lateral */
  function abrirPeek(u, id) {
    var alvo = document.querySelector('[data-peek="' + u + '"]');
    var m = midiasDe(u).filter(function (x) { return x.id === id; })[0];
    if (!alvo || !m) return;
    est(u).aberto = id;

    var pin = m.estado === 'publicado'
      ? '<span class="mid-pin foi"><i></i>Foi Ao Ar</span>'
      : (m.estado === 'programado'
        ? '<span class="mid-pin marcado"><i></i>Marcado</span>'
        : '<span class="mid-pin guardado"><i></i>Guardado</span>');

    alvo.innerHTML =
      '<div class="ar-peek-cab">' +
        '<button class="ar-peek-x" type="button" data-fechar-peek aria-label="Fechar">' +
          '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
        '<div class="ar-peek-setas">' +
          '<button type="button" data-andar="-1" aria-label="Anterior">' +
            '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>' +
          '<button type="button" data-andar="1" aria-label="Próximo">' +
            '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>' +
        '</div>' +
      '</div>' +
      '<div class="ar-peek-corpo mid-rolo">' +
        '<div class="ar-peek-capa">' +
          (m.capa ? '<img src="/' + seguro(m.capa) + '" alt="">'
                  : '<span class="ar-peek-sem"><svg viewBox="0 0 24 24">' +
                    '<path d="M4 5.5h16v13H4z"/><path d="m10 9.5 5 2.5-5 2.5z"/>' +
                    '</svg></span>') +
        '</div>' +
        '<div class="ar-peek-quem">' + pin +
          (m.bruto === 'erro' ? '<span class="mid-pin erro"><i></i>Falhou</span>' : '') +
        '</div>' +
        '<h4 class="bc-nome">' + seguro(m.nome) + '</h4>' +
        (m.erro ? '<p class="bc-leg erro">' + seguro(m.erro) + '</p>' : '') +
        '<div class="bc-pares">' +
          par('Leva', maiuscula(m.leva)) +
          par('Pasta Do Vídeo', m.pasta, true) +
          par('Peso', mb(m.mb)) +
          (m.quando ? par(m.estado === 'publicado' ? 'Saiu' : 'Sai',
                          dia(m.quando) + ' · ' + hora(m.quando)) : '') +
        '</div>' +
        '<div class="bc-acoes">' + acoes(m, u) + '</div>' +
      '</div>';

    /* QUEM ABRE E' A COLUNA DO GRID, no `.ar`. Nao se usa transicao aqui: navegador
       com a janela oculta PAUSA transicao, e transicao pausada trava o valor no ponto
       de partida, vencendo ate' `!important`. Ja' custou uma tela que nao recuava. */
    alvo.closest('.ar').classList.add('com-peek');
    alvo.classList.add('on');
    document.querySelectorAll('.ar-q').forEach(function (q) {
      q.classList.toggle('on', q.dataset.mid === id);
    });
  }

  function fecharPeek(u) {
    var alvo = document.querySelector('[data-peek="' + u + '"]');
    if (!alvo) return;
    alvo.classList.remove('on');
    alvo.closest('.ar').classList.remove('com-peek');
    est(u).aberto = null;
    document.querySelectorAll('.ar-q.on').forEach(function (q) {
      q.classList.remove('on');
    });
  }

  function andar(u, passo) {
    var lista = filtrar(u);
    var i = lista.map(function (m) { return m.id; }).indexOf(est(u).aberto);
    var novo = lista[i + passo];
    if (!novo) return;
    abrirPeek(u, novo.id);
    var q = document.querySelector('[data-abrir-peek="' + novo.id + '"]');
    if (q) q.scrollIntoView({ block: 'nearest' });
  }

  function par(rot, valor, quebra) {
    return '<div class="bc-par' + (quebra ? ' quebra' : '') + '"><span>' + rot +
      '</span><b>' + seguro(valor) + '</b></div>';
  }

  /* ------------------------------------------------------------- as acoes */
  /* A LOGO DO DRIVE, nas cores dela. Pedido dele em 10/09: o botao que leva ao
     arquivo tem que ser reconhecivel de longe, e desenho de linha nao e'. */
  var LOGO_DRIVE =
    '<svg class="mid-drive-logo" viewBox="0 0 87.3 78" aria-hidden="true">' +
    '<path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8' +
      'H0c0 1.55.4 3.1 1.2 4.5z"/>' +
    '<path fill="#00ac47" d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44' +
      'A9.06 9.06 0 0 0 0 53h27.5z"/>' +
    '<path fill="#ea4335" d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5' +
      'c.8-1.4 1.2-2.95 1.2-4.5H59.798l5.852 11.5z"/>' +
    '<path fill="#00832d" d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4' +
      'c-1.6 0-3.15.45-4.5 1.2z"/>' +
    '<path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8' +
      'c1.6 0 3.15-.45 4.5-1.2z"/>' +
    '<path fill="#ffba00" d="M73.4 26.5 60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25' +
      'l16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"/></svg>';

  /* O DESTINO E' A PASTA DAQUELE CORTE. No Drive dele a leva nao guarda arquivo,
     guarda 180 pastas numeradas com um video dentro de cada; apontar para a leva foi
     o erro que ele pegou na maquete. */
  function botaoDrive(m, classe) {
    if (!m.pasta_id) return '';
    return '<a class="mid-drive ' + classe + '" target="_blank" rel="noopener" ' +
      'href="https://drive.google.com/drive/folders/' + seguro(m.pasta_id) + '" ' +
      'title="Abrir no Drive a pasta deste vídeo: ' + seguro(m.pasta) + '" ' +
      'aria-label="Abrir no Drive a pasta deste vídeo">' + LOGO_DRIVE + '</a>';
  }

  /* SO' AS ACOES QUE EXISTEM DE VERDADE: abrir no Drive, mandar para o assistente de
     programar e ver a publicacao no Instagram. Botao sem back atras vira promessa. */
  function acoes(m, u) {
    var ig = m.sc
      ? '<a class="mid-ac" href="https://www.instagram.com/reel/' + seguro(m.sc) +
        '/" target="_blank" rel="noopener" title="Ver a publicação no Instagram">' +
        '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/>' +
        '<circle cx="12" cy="12" r="3.6"/><path d="M17.4 6.7h.01"/></svg></a>'
      : '<button class="mid-ac" type="button" disabled ' +
        'title="Sem publicação no Instagram"><svg viewBox="0 0 24 24">' +
        '<rect x="3" y="3" width="18" height="18" rx="5"/>' +
        '<circle cx="12" cy="12" r="3.6"/><path d="M17.4 6.7h.01"/></svg></button>';

    return '<span class="mid-acoes">' +
      botaoDrive(m, 'como-bt') +
      '<button class="mid-ac" type="button" data-programar-conta="' + seguro(u) +
        '"' + (m.estado === 'publicado' ? ' disabled title="Este vídeo já saiu"'
                                        : ' title="Programar esta conta"') + '>' +
        '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2.5"/>' +
        '<path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg></button>' +
      ig + '</span>';
  }

  /* ---------------------------------------------------------------- a previa */
  /* A MESMA PECA DA ABA DE ANALYTICS, que ele aprovou em 09/09. O desenho dela mora
     no `04-analytics.css`: copiar seria manter duas previas. */
  var previa = null, relogio = null;
  function ligarPrevias(raiz, u) {
    raiz.querySelectorAll('[data-mid]').forEach(function (el) {
      if (el.dataset.prevLigada) return;
      el.dataset.prevLigada = '1';
      var m = midiasDe(u).filter(function (x) { return x.id === el.dataset.mid; })[0];
      if (!m || !m.capa) return;
      el.addEventListener('mouseenter', function () {
        clearTimeout(relogio);
        relogio = setTimeout(function () { mostrarPrevia(el, m); }, 220);
      });
      el.addEventListener('mouseleave', function () {
        clearTimeout(relogio);
        if (previa) previa.classList.remove('on');
      });
    });
  }
  function mostrarPrevia(elemento, m) {
    if (!previa) {
      previa = document.createElement('div');
      previa.className = 'prev';
      document.body.appendChild(previa);
    }
    previa.innerHTML =
      '<div class="prev-capa"><img src="/' + seguro(m.capa) + '" alt="">' +
      '<span class="prev-dur">' + mb(m.mb) + '</span></div>' +
      '<div class="prev-b">' +
      '<div class="lin">Estado<b>' + (m.estado === 'publicado' ? 'Foi Ao Ar'
        : (m.estado === 'programado' ? 'Marcado' : 'Guardado')) + '</b></div>' +
      (m.quando ? '<div class="lin">' +
        (m.estado === 'publicado' ? 'Saiu' : 'Sai') + '<b>' + dia(m.quando) +
        '</b></div>' : '') +
      '<div class="prev-leg">' + seguro(m.pasta) + '</div></div>';

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

  /* ------------------------------------------------------- a janela de pasta */
  /* LIGAR PASTA MORA AQUI porque a pasta pertence a um perfil: a aba de Midia saiu do
     menu em 10/09 justamente por ser configuracao sem dono. */
  var navegando = {};

  function abrirLigarPasta(u, pastaId) {
    var c = window.CT_JANELA.contaDe(u);
    navegando[u] = pastaId || '';
    window.CT_JANELA.abrir(
      window.CT_JANELA.cabConta(c, 'Ligar uma pasta de vídeos'),
      '<div class="lp"><div class="lp-carregando">Lendo o Drive…</div></div>',
      '<span class="ct-jan-nota">Uma pasta pertence a um perfil só.</span>' +
      '<button class="ct-bt" type="button" data-ct-fechar>' +
      '<span class="txt">Fechar</span><span class="circ"></span></button>', true);
    document.getElementById('ct-jan').classList.remove('enorme', 'inteira');

    fetch('/midia/navegar?pasta=' + encodeURIComponent(navegando[u] || '') +
          '&busca=', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { pintarDrive(u, d); })
      .catch(function () {
        pintarDrive(u, { erro: 'Não consegui falar com o Drive.' });
      });
  }

  function pintarDrive(u, d) {
    var caixa = document.querySelector('.lp');
    if (!caixa) return;
    if (d.erro) {
      caixa.innerHTML = '<div class="lp-vazio">' + seguro(d.erro) + '</div>';
      return;
    }
    var trilha = (d.trilha || []).map(function (t, i, todos) {
      return '<button type="button" data-ir-pasta="' + seguro(t.id) + '" ' +
        'data-conta="' + seguro(u) + '"' +
        (i === todos.length - 1 ? ' class="on"' : '') + '>' +
        seguro(t.nome) + '</button>';
    }).join('<i>/</i>');

    caixa.innerHTML =
      '<p class="lp-p">Escolha no Drive a pasta que vai abastecer <b>@' + seguro(u) +
      '</b>. Ligar não baixa vídeo nenhum: anota o que existe na pasta <b>e nas ' +
      'subpastas dela</b>, que é onde os cortes moram.</p>' +
      '<div class="lp-trilha">' + trilha + '</div>' +
      '<div class="lp-lista">' + ((d.pastas || []).length
        ? d.pastas.map(function (p) {
          return '<div class="lp-li">' +
            '<button class="lp-abrir" type="button" data-ir-pasta="' + seguro(p.id) +
              '" data-conta="' + seguro(u) + '">' +
              '<span class="lp-ic"><svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2' +
              'h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg></span>' +
              '<span class="lp-nome"><b>' + seguro(p.nome) + '</b>' +
              '<span>' + (p.videos ? p.videos + ' vídeos aqui dentro'
                                   : 'abrir para ver o que tem') + '</span></span>' +
            '</button>' +
            '<button class="ct-bt mini" type="button" data-ligar="' + seguro(p.id) +
            '" data-nome="' + seguro(p.nome) + '" data-conta="' + seguro(u) +
            '"><span class="txt">Ligar</span><span class="circ"></span></button>' +
          '</div>';
        }).join('')
        : '<div class="lp-vazio">Nenhuma pasta aqui dentro.</div>') +
      '</div>';
  }

  function ligarPasta(u, pastaId, nome, botao) {
    if (botao) { botao.disabled = true; botao.classList.add('esperando'); }
    fetch('/midia/ligar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pasta: pastaId, nome: nome, conta: u })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.erro) { torrada(d.erro); return; }
        torrada('Pasta ligada a @' + u + ': ' + (d.novos || 0) +
                (d.novos === 1 ? ' vídeo anotado' : ' vídeos anotados') + '.');
        window.CT_JANELA.fechar();
        return carregar(u, true).then(function () {
          window.CT_JANELA.redesenhar();
        });
      })
      .catch(function () { torrada('Não consegui ligar a pasta.'); })
      .then(function () {
        if (botao) { botao.disabled = false; botao.classList.remove('esperando'); }
      });
  }

  /* A TORRADA E' A DO PAINEL (`.an-torrada`, do `04-analytics.css`). Desenhar uma
     segunda seria manter duas. */
  var relogioTorrada = null;
  function torrada(texto) {
    var t = document.getElementById('an-torrada');
    if (!t) {
      t = document.createElement('div');
      t.id = 'an-torrada';
      t.className = 'an-torrada';
      document.body.appendChild(t);
    }
    t.textContent = texto;
    t.classList.add('on');
    clearTimeout(relogioTorrada);
    relogioTorrada = setTimeout(function () { t.classList.remove('on'); }, 3200);
  }

  /* ---------------------------------------------------------------- eventos */
  document.addEventListener('click', function (e) {
    var ab = e.target.closest('[data-abrir-midias]');
    if (ab) { abrirMidias(ab.dataset.abrirMidias); return; }

    var f = e.target.closest('[data-filtro] button');
    if (f) {
      var u = f.closest('[data-filtro]').dataset.filtro;
      est(u).filtro = f.dataset.f;
      f.parentNode.querySelectorAll('button').forEach(function (b) {
        b.classList.toggle('on', b === f);
      });
      pintarGrade(u);
      return;
    }
    var q = e.target.closest('[data-abrir-peek]');
    if (q) {
      abrirPeek(q.closest('.ar').querySelector('[data-peek]').dataset.peek,
                q.dataset.abrirPeek);
      return;
    }
    var x = e.target.closest('[data-fechar-peek]');
    if (x) { fecharPeek(x.closest('[data-peek]').dataset.peek); return; }

    var a = e.target.closest('[data-andar]');
    if (a) { andar(a.closest('[data-peek]').dataset.peek, Number(a.dataset.andar));
             return; }

    var lp = e.target.closest('[data-ligar-pasta]');
    if (lp) { abrirLigarPasta(lp.dataset.ligarPasta, ''); return; }

    var ir = e.target.closest('[data-ir-pasta]');
    if (ir) { abrirLigarPasta(ir.dataset.conta, ir.dataset.irPasta); return; }

    var liga = e.target.closest('[data-ligar]');
    if (liga) {
      ligarPasta(liga.dataset.conta, liga.dataset.ligar, liga.dataset.nome, liga);
      return;
    }
    var reler = e.target.closest('[data-reler-midias]');
    if (reler) {
      var quem = reler.dataset.relerMidias;
      var pastas = pastasDe(quem);
      if (!pastas.length) { abrirLigarPasta(quem, ''); return; }
      torrada('Relendo a pasta de @' + quem + '…');
      ligarPasta(quem, pastas[0].id, pastas[0].nome, reler);
      return;
    }
    /* PROGRAMAR leva ao assistente, que e' o caminho que ja' existe na ficha. */
    var pr = e.target.closest('[data-programar-conta]');
    if (pr && !pr.disabled) {
      var botao = document.querySelector('.ct-f[data-conta="' +
        pr.dataset.programarConta + '"] [data-acao="programar"]');
      window.CT_JANELA.fechar();
      if (botao) botao.click();
    }
  });

  document.addEventListener('input', function (e) {
    var b = e.target.closest('[data-busca]');
    if (!b) return;
    est(b.dataset.busca).busca = b.value;
    pintarGrade(b.dataset.busca);
  });

  document.addEventListener('keydown', function (e) {
    var peek = document.querySelector('[data-peek].on');
    if (!peek) return;
    if (e.key === 'Escape') { fecharPeek(peek.dataset.peek); return; }
    if (e.target.closest('input')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); andar(peek.dataset.peek, 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); andar(peek.dataset.peek, -1); }
  });
})();
