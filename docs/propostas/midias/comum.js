/* ============================================================ O COMPARTILHADO
   O que as tres propostas da sub-aba Midias usam por igual: os dados, o disfarce de
   servidor, o menu, o tema, a previa ao passar o mouse e as contas de material.

   O DISFARCE DE SERVIDOR existe porque a maquete carrega o `07-contas.js` DE VERDADE,
   e ele fala com o painel por `fetch`. Aqui o `fetch` e' interceptado e responde com o
   estado real, lido do painel no ar pelo `montar.py`. Assim a ficha desenha exatamente
   o que desenha em producao, sem uma linha reescrita.
   ========================================================================== */
(function () {
  var D = window.DADOS_MIDIAS || {};
  var CAPAS = D.capas || [];
  var HOJE = new Date(D.hoje || '2026-09-10T11:00:00');

  /* ---------------------------------------------------------------- numeros */
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
  function seg(v) { return (v || 0).toFixed(0) + 's'; }
  function mb(v) { return String((v || 0).toFixed(1)).replace('.', ',') + ' MB'; }

  /* ------------------------------------------------------------------ datas */
  /* DATA SEM HORA E' LIDA COMO UTC pelo navegador, e o fuso de Sao Paulo empurra
     para o dia anterior: "17 ago" virava "16 ago". Por isso o T00:00:00. */
  function data(iso) {
    if (!iso) return null;
    var s = String(iso);
    return new Date(s.length <= 10 ? s + 'T00:00:00' : s);
  }
  var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
             'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  function dia(iso) {
    var d = data(iso);
    return d ? d.getDate() + ' ' + MES[d.getMonth()] : '—';
  }
  function hora(iso) {
    var d = data(iso);
    if (!d) return '';
    return String(d.getHours()).padStart(2, '0') + 'h' +
           String(d.getMinutes()).padStart(2, '0');
  }
  function diaHora(iso) {
    return iso ? dia(iso) + ' · ' + hora(iso) : '—';
  }
  function idade(iso) {
    var d = data(iso);
    if (!d) return '';
    var dias = Math.round((HOJE - d) / 86400000);
    if (dias === 0) return 'hoje';
    if (dias === 1) return 'ontem';
    if (dias === -1) return 'amanhã';
    if (dias < 0) return 'em ' + (-dias) + ' dias';
    if (dias < 31) return 'há ' + dias + ' dias';
    var meses = Math.round(dias / 30.4);
    return 'há ' + meses + (meses === 1 ? ' mês' : ' meses');
  }

  /* ------------------------------------------------------------------ texto */
  function escapar(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  /* TODA PALAVRA DE TELA COM INICIAL MAIUSCULA, regra da casa. */
  function maiuscula(s) {
    return String(s || '').replace(/(^|\s)(\S)/g, function (x, a, b) {
      return a + b.toUpperCase();
    });
  }
  function capa(i) { return CAPAS[i % (CAPAS.length || 1)] || ''; }
  function pedaco(t, quanto) {
    t = String(t || '');
    return t.length > quanto ? t.slice(0, quanto - 1).trim() + '…' : t;
  }

  /* ----------------------------------------------------------- as midias */
  var ROTULO = { publicado: 'Foi Ao Ar', programado: 'Marcado', guardado: 'Guardado' };

  function midiasDe(u) { return (D.midias || {})[u] || []; }
  function porEstado(u, estado) {
    return midiasDe(u).filter(function (m) { return m.estado === estado; });
  }
  function contas(u) {
    return {
      publicado: porEstado(u, 'publicado').length,
      programado: porEstado(u, 'programado').length,
      guardado: porEstado(u, 'guardado').length
    };
  }
  function pastaDe(u) { return (D.donos || {})[u] || { nome: '—' }; }

  /* O ESTOQUE EM DIAS. E' a pergunta que uma prateleira responde: quanto tempo esta
     conta ainda anda sozinha. O ritmo sai do que ela publicou nos ultimos 30 dias;
     conta sem historico assume um por dia, e a tela diz que assumiu. */
  function folego(u) {
    var saiu = porEstado(u, 'publicado').filter(function (m) {
      var d = data(m.quando);
      return d && (HOJE - d) / 86400000 <= 30;
    }).length;
    /* RITMO MAGRO NAO VIRA PREVISAO. Com duas saidas em trinta dias, a conta honesta
       dava "405 dias", que e' um numero verdadeiro e inutil. Abaixo de quatro saidas
       no mes a tela assume um por dia e diz que assumiu. */
    var porDia = saiu >= 4 ? saiu / 30 : null;
    var sobra = contas(u).guardado + contas(u).programado;
    var dias = Math.round(sobra / (porDia || 1));
    return {
      porDia: porDia, sobra: sobra, dias: dias, estimado: !porDia,
      rotulo: !sobra ? '' : (dias > 90 ? 'Mais De 90 Dias'
        : dias + (dias === 1 ? ' Dia' : ' Dias')),
      nota: porDia ? 'no ritmo desta conta' : 'assumindo 1 por dia'
    };
  }

  function ordenar(lista, campo, desc) {
    return lista.slice().sort(function (a, b) {
      var x = a[campo], y = b[campo];
      if (x == null) return 1;
      if (y == null) return -1;
      if (typeof x === 'string') return desc ? y.localeCompare(x) : x.localeCompare(y);
      return desc ? y - x : x - y;
    });
  }

  /* --------------------------------------------------- o disfarce de servidor */
  var META = {};
  (function () {
    var m = (D.meta || {}).contas || {};
    for (var k in m) META[k] = { mercado: m[k].mercado || '',
                                 etiquetas: m[k].etiquetas || [] };
  })();
  window.metaDe = function (a) {
    a = String(a).replace('@', '').toLowerCase();
    if (!META[a]) META[a] = { mercado: '', etiquetas: [] };
    return META[a];
  };
  window.lerMeta = function () { return Promise.resolve(META); };
  window.gravarMeta = function (a, campos) {
    var alvo = window.metaDe(a);
    if ('mercado' in campos) alvo.mercado = campos.mercado;
    if ('etiquetas' in campos) alvo.etiquetas = campos.etiquetas;
    return Promise.resolve({ arroba: a, mercado: alvo.mercado,
                             etiquetas: alvo.etiquetas });
  };

  var original = window.fetch;
  window.fetch = function (endereco, opcoes) {
    var rota = String(endereco).split('?')[0].replace(/^\//, '');
    function ok(obj) {
      return Promise.resolve({ ok: true, status: 200,
        json: function () { return Promise.resolve(obj); } });
    }
    if (rota === 'contas/estado' || rota === 'contas/testar') return ok(D.estado);
    if (rota === 'contas/meta') {
      if (opcoes && opcoes.method === 'POST') {
        var c = JSON.parse(opcoes.body || '{}');
        return window.gravarMeta(c.arroba, c).then(ok);
      }
      return ok({ contas: META });
    }
    if (rota === 'perfis') {
      return ok({ perfis: (D.estado.contas || []).map(function (c) {
        return { u: c.arroba, avatar: c.avatar }; }) });
    }
    if (rota === 'contas/prontidao') return ok({ pronto: true });
    if (rota === 'midia/ligadas') return ok(D.pastas);
    if (rota === 'midia/navegar') return ok(D.drive);
    if (rota.indexOf('contas/') === 0 || rota.indexOf('midia/') === 0) {
      torrada('Maquete: esta ação não dispara nada de verdade.');
      return ok(D.estado);
    }
    return original.apply(window, arguments);
  };

  /* ------------------------------------------------------------------ torrada */
  var relogioTorrada = null;
  function torrada(texto) {
    var t = document.getElementById('mid-torrada');
    if (!t) {
      t = document.createElement('div');
      t.id = 'mid-torrada';
      t.className = 'mid-torrada';
      document.body.appendChild(t);
    }
    t.textContent = texto;
    t.classList.add('on');
    clearTimeout(relogioTorrada);
    relogioTorrada = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  /* ------------------------------------------------------------------ previa */
  /* A MESMA PECA DA ABA DE ANALYTICS, que ele aprovou em 09/09. Copiada com o
     conteudo trocado: aqui o que interessa e' o arquivo, nao a metrica. */
  var previa = null, relogio = null;
  function ligarPrevia(elemento, m) {
    if (!m) return;
    elemento.addEventListener('mouseenter', function () {
      clearTimeout(relogio);
      relogio = setTimeout(function () { mostrarPrevia(elemento, m); }, 220);
    });
    elemento.addEventListener('mouseleave', function () {
      clearTimeout(relogio); esconderPrevia();
    });
  }
  function mostrarPrevia(elemento, m) {
    if (!previa) {
      previa = document.createElement('div');
      previa.className = 'prev';
      document.body.appendChild(previa);
    }
    previa.innerHTML =
      '<div class="prev-capa"><img src="' + capa(m.capa) + '" alt="">' +
      '<div class="prev-play"><i><svg viewBox="0 0 24 24">' +
      '<path d="m8 5 12 7-12 7V5Z"/></svg></i></div>' +
      '<span class="prev-dur">' + seg(m.dur) + '</span></div>' +
      '<div class="prev-b">' +
      '<div class="lin">Arquivo<b>' + escapar(pedaco(m.nome, 18)) + '</b></div>' +
      '<div class="lin">Tamanho<b>' + mb(m.mb) + '</b></div>' +
      (m.estado === 'publicado'
        ? '<div class="lin">Visualizações<b>' + n(m.vis) + '</b></div>' +
          '<div class="lin">Saiu<b>' + dia(m.quando) + '</b></div>'
        : m.estado === 'programado'
          ? '<div class="lin">Sai<b>' + diaHora(m.quando) + '</b></div>'
          : '<div class="lin">Estado<b>Sem uso</b></div>') +
      (m.legenda ? '<div class="prev-leg">' + escapar(pedaco(m.legenda, 90)) +
        '</div>' : '') + '</div>';

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

  /* Liga a previa em tudo que nasceu com `data-mid` depois de um redesenho. */
  function ligarTudo(raiz) {
    (raiz || document).querySelectorAll('[data-mid]').forEach(function (el) {
      if (el.dataset.prevLigada) return;
      el.dataset.prevLigada = '1';
      var u = el.closest('[data-conta]');
      var lista = midiasDe(u ? u.dataset.conta : '');
      var m = lista.filter(function (x) { return x.id === el.dataset.mid; })[0];
      ligarPrevia(el, m);
    });
  }

  /* -------------------------------------------------------- a janela grande */
  var IC = {
    agenda: '<rect x="3" y="5" width="18" height="16" rx="2.5"/>' +
            '<path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
    ig: '<rect x="3" y="3" width="18" height="18" rx="5"/>' +
        '<circle cx="12" cy="12" r="3.6"/><path d="M17.4 6.7h.01"/>'
  };

  /* A LOGO DO DRIVE, nas cores dela. Pedido dele em 10/09: o botao que leva ao
     arquivo tem que ser reconhecivel de longe, e desenho de linha nao e'. Ela vem
     com `fill` proprio, entao nao herda a cor do botao como os outros icones. */
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

  /* O ENDERECO DA PASTA NO DRIVE. E' a pasta, e nao o arquivo: foi o que ele pediu,
     e e' o que serve, porque de dentro dela ele ve' a leva inteira. */
  function pastaNoDrive(m) {
    return m && m.pasta_id
      ? 'https://drive.google.com/drive/folders/' + m.pasta_id : '';
  }

  function botaoDrive(m, classe) {
    var endereco = pastaNoDrive(m);
    if (!endereco) return '';
    return '<a class="mid-drive ' + (classe || '') + '" href="' + endereco +
      '" target="_blank" rel="noopener" title="Abrir a pasta ' +
      escapar(m.pasta) + ' no Drive" aria-label="Abrir a pasta no Google Drive">' +
      LOGO_DRIVE + '</a>';
  }

  /* SO' AS ACOES QUE EXISTEM. Abrir no Drive (o arquivo tem id de la'), mandar para o
     assistente de programar (o botao ja' existe na ficha) e ver no Instagram (so' se
     o post saiu e tem codigo). Nada de botao que nao tem back atras. */
  function acoes(m) {
    function bt(simbolo, titulo, ligado, acao) {
      return '<button class="mid-ac" type="button" title="' + titulo + '"' +
        (ligado ? ' data-acao-mid="' + acao + '"' : ' disabled') +
        '><svg viewBox="0 0 24 24">' + IC[simbolo] + '</svg></button>';
    }
    return '<span class="mid-acoes">' +
      botaoDrive(m, 'como-bt') +
      bt('agenda', 'Programar este vídeo', m.estado !== 'publicado', 'programar') +
      bt('ig', 'Ver a publicação no Instagram', !!m.sc, 'instagram') +
      '</span>';
  }

  function abrirGrande(cab, corpo, rodape) {
    window.CT_JANELA.abrir(cab, corpo, rodape, true);
    document.getElementById('ct-jan').classList.add('enorme');
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-acao-mid]');
    if (!a) return;
    torrada({
      programar: 'Maquete: aqui este vídeo entraria no assistente de programar.',
      instagram: 'Maquete: aqui a publicação abriria no Instagram.'
    }[a.dataset.acaoMid] || 'Maquete: ação desligada.');
  });

  /* ------------------------------------------------------- a janela de pasta */
  /* LIGAR PASTA PERDEU A CASA quando a aba de Midia saiu do menu. Aqui ela volta
     para dentro da ficha da conta, que e' onde ele decidiu que a pasta mora: uma
     pasta pertence a UM perfil. A navegacao e' a mesma do painel, com trilha. */
  function abrirLigarPasta(u) {
    if (!window.CT_JANELA) return;
    var c = window.CT_JANELA.contaDe(u);
    var pastas = (D.drive || {}).pastas || [];
    var corpo =
      '<div class="lp">' +
      '<p class="lp-p">Escolha no Drive a pasta que vai abastecer <b>@' + escapar(u) +
      '</b>. Ligar não baixa vídeo nenhum: só anota o que existe lá dentro.</p>' +
      '<div class="lp-trilha">' +
      escapar(((D.drive || {}).trilha || []).map(function (t) { return t.nome; })
        .join(' / ') || 'Meu Drive') + '</div>' +
      '<div class="lp-lista">' + (pastas.length ? pastas.map(function (p) {
        return '<div class="lp-li"><span class="lp-ic">' +
          '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8' +
          'a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg></span>' +
          '<span class="lp-nome"><b>' + escapar(p.nome) + '</b>' +
          '<span>' + (p.videos != null ? p.videos + ' vídeos' : 'pasta do Drive') +
          '</span></span>' +
          '<button class="ct-bt mini" type="button" data-ligar="' + escapar(p.id) +
          '"><span class="txt">Ligar</span><span class="circ"></span></button></div>';
      }).join('') : '<div class="lp-vazio">Nenhuma pasta encontrada no Drive.</div>') +
      '</div></div>';
    window.CT_JANELA.abrir(
      window.CT_JANELA.cabConta(c, 'Ligar uma pasta de vídeos'), corpo,
      '<span class="ct-jan-nota">Uma pasta pertence a um perfil só.</span>' +
      '<button class="ct-bt" type="button" data-ct-fechar><span class="txt">' +
      'Fechar</span><span class="circ"></span></button>', true);
  }

  document.addEventListener('click', function (e) {
    var lig = e.target.closest('[data-ligar]');
    if (lig) {
      torrada('Maquete: aqui a pasta seria ligada a este perfil.');
      window.CT_JANELA.fechar();
    }
    var abrir = e.target.closest('[data-ligar-pasta]');
    if (abrir) abrirLigarPasta(abrir.dataset.ligarPasta);
  });

  /* --------------------------------------------------------- menu e tema */
  function ligarCasca() {
    var chave = document.getElementById('chave');
    var raiz = document.documentElement;
    if (chave) {
      chave.addEventListener('click', function () {
        var escuro = raiz.getAttribute('data-theme') === 'dark';
        raiz.setAttribute('data-theme', escuro ? 'light' : 'dark');
        chave.setAttribute('aria-checked', escuro ? 'false' : 'true');
      });
    }
    var botao = document.getElementById('botao-menu');
    if (botao) {
      botao.addEventListener('click', function () {
        var aberto = raiz.getAttribute('data-menu') !== 'fechado';
        raiz.setAttribute('data-menu', aberto ? 'fechado' : 'aberto');
        botao.setAttribute('aria-expanded', aberto ? 'false' : 'true');
      });
    }
    document.querySelectorAll('.menu .mi').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.pag === 'contas') return;
        torrada('Maquete: só a aba de Contas está montada aqui.');
      });
    });

    /* A FICHA SE REDESENHA INTEIRA a cada clique de sub-aba, e a previa vive presa a
       elementos que acabaram de nascer. Observar o container e' mais confiavel do que
       lembrar de religar em cada caminho que redesenha. */
    var caixa = document.getElementById('ct-fichas');
    if (caixa && window.MutationObserver) {
      new MutationObserver(function () { ligarTudo(caixa); })
        .observe(caixa, { childList: true, subtree: true });
    }

    /* A LUPA DA CAPA: clicar na miniatura mostra o quadro grande. Video de verdade a
       maquete nao tem, entao o que existe e' a capa. */
    var lupa = document.getElementById('mid-lupa');
    document.addEventListener('click', function (e) {
      /* A LUPA SO' AGE ONDE A CAPA NAO E' BOTAO. Na grade, a capa ja' abre o painel
         do video: sem esta trava, um clique abria os dois ao mesmo tempo. */
      var alvo = e.target.closest('.mid-capa');
      if (alvo && (alvo.closest('button') || alvo.closest('a'))) alvo = null;
      if (alvo && lupa) {
        var img = alvo.querySelector('img');
        lupa.querySelector('img').src = img ? img.src : '';
        lupa.hidden = false;
        void lupa.offsetHeight;
        lupa.classList.add('on');
        return;
      }
      if (lupa && !lupa.hidden && e.target.closest('#mid-lupa')) {
        lupa.classList.remove('on');
        setTimeout(function () { lupa.hidden = true; }, 190);
      }
    });

    /* NO PAINEL QUEM ABRE A ABA E' O MENU, que chama `abrirContas` ao trocar de
       pagina. Aqui a aba ja' nasce aberta, entao o chamado e' na mao. */
    if (window.abrirContas) window.abrirContas();
  }

  window.MID = {
    D: D, HOJE: HOJE, ROTULO: ROTULO,
    n: n, curto: curto, seg: seg, mb: mb,
    dia: dia, hora: hora, diaHora: diaHora, idade: idade, data: data,
    escapar: escapar, maiuscula: maiuscula, pedaco: pedaco, capa: capa,
    midiasDe: midiasDe, porEstado: porEstado, contas: contas, pastaDe: pastaDe,
    folego: folego, ordenar: ordenar,
    ligarPrevia: ligarPrevia, ligarTudo: ligarTudo, torrada: torrada,
    abrirLigarPasta: abrirLigarPasta, ligarCasca: ligarCasca,
    acoes: acoes, abrirGrande: abrirGrande, IC: IC,
    botaoDrive: botaoDrive, pastaNoDrive: pastaNoDrive
  };
})();
