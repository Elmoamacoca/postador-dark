/* ============================================ O COMPARTILHADO DO CALENDARIO
   O que as tres propostas usam por igual: os dados, o seletor de conta, o painel
   lateral de um dia e a casca (menu e tema).

   O SELETOR E' O DA ABA DE ANALYTICS, aprovado por ele em 09/09: combobox com busca,
   setas, Enter e Esc. A decisao de 10/09 e' que o calendario passa a ser POR CONTA,
   com "Toda A Rede" como escolha explicita dentro do mesmo seletor, porque o
   agendador desencontra o horario entre contas e conferir isso exige ve-las juntas.
   ========================================================================== */
(function () {
  var D = window.DADOS_CAL || {};
  /* A HORA VEM DO RELOGIO DE QUEM ABRE, e nao do instante em que a maquete foi gerada:
     senao o risco "Agora" do gantt fica parado na hora da geracao e desencontra do
     relogio dele em minutos. O DIA continua o dos dados, porque e' em volta dele que a
     agenda foi montada. */
  var HOJE = (function () {
    var base = new Date(D.hoje || '2026-09-11T12:00:00');
    var real = new Date();
    if (real.getFullYear() === base.getFullYear() &&
        real.getMonth() === base.getMonth() && real.getDate() === base.getDate()) {
      return real;
    }
    return base;
  })();
  var CONTAS = D.contas || [];
  var CAPAS = D.capas || [];
  var SAIDAS = D.saidas || [];
  var REDE = '*';

  var escolhida = CONTAS.length ? CONTAS[0].u : REDE;

  /* ------------------------------------------------------------- utilidades */
  function n(v) { return (v || 0).toLocaleString('pt-BR'); }
  function curto(v) {
    v = v || 0;
    if (v >= 1000) return String(Math.round(v / 100) / 10).replace('.', ',') + ' mil';
    return n(v);
  }
  function seguro(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
             .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function maiuscula(s) {
    return String(s || '').replace(/(^|\s)(\S)/g, function (x, a, b) {
      return a + b.toUpperCase();
    });
  }
  function pedaco(t, quanto) {
    t = String(t || '');
    return t.length > quanto ? t.slice(0, quanto - 1).trim() + '…' : t;
  }
  /* O ROTULO CURTO DE UMA SAIDA. O nome de arquivo e'
     `001 - leisdamentemilionaria - Dal3n-KJp4e.mp4`: cortado em dezesseis letras, todo
     dia da grade vira "001 - leisdam…" e a coluna para de dizer qualquer coisa. O que
     distingue um corte do outro e' o numero; a leva fica no painel do dia. */
  function rotulo(s) {
    var m = String(s.nome || '').match(/^\s*(\d{1,4})\b/);
    if (m) return 'Corte ' + m[1];
    return pedaco(s.nome || s.titulo || 'Publicação', 18);
  }

  /* DATA SEM HORA E' LIDA COMO UTC, e o fuso empurra para o dia anterior. */
  function data(iso) {
    if (!iso) return null;
    var s = String(iso);
    return new Date(s.length <= 10 ? s + 'T00:00:00' : s);
  }
  var MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho',
             'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var MES3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
              'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  function chaveDia(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }
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
  function mesmoDia(a, b) { return chaveDia(a) === chaveDia(b); }
  function capa(i) {
    return i == null ? '' : (CAPAS[i % (CAPAS.length || 1)] || '');
  }
  function contaDe(u) {
    return CONTAS.filter(function (c) { return c.u === u; })[0] || { u: u, nome: u };
  }
  /* A COR DA CONTA vem da posicao na lista, e e' a mesma em toda a tela: legenda,
     ponto no dia e raia. Cor sorteada por tela daria a mesma conta em duas cores. */
  var CORES = ['#3F7D53', '#B2823A', '#4A6FA5', '#8C5A9E', '#B23A3A'];
  function corDe(u) {
    for (var i = 0; i < CONTAS.length; i++) if (CONTAS[i].u === u) return CORES[i % 5];
    return CORES[0];
  }

  /* ------------------------------------------------------------- as saidas */
  function saidasDe(u) {
    return u === REDE ? SAIDAS
      : SAIDAS.filter(function (s) { return s.conta === u; });
  }
  function porDia(u) {
    var mapa = {};
    saidasDe(u).forEach(function (s) {
      var d = data(s.quando);
      if (!d) return;
      (mapa[chaveDia(d)] = mapa[chaveDia(d)] || []).push(s);
    });
    return mapa;
  }
  /* ---------------------------------------------------------- os indicadores
     "Já Saíram" e "Marcados" nao sao nome de indicador, sao legenda de botao, e ele
     reprovou os dois em 11/09. O vocabulario abaixo e' o que as ferramentas de
     agendamento usam de verdade: PUBLICADOS e AGENDADOS sao o par de estado do
     Etus e da mLabs; CADENCIA e' o termo de mercado para ritmo de publicacao;
     COBERTURA e' quantos dos proximos catorze dias tem publicacao, que e' a pergunta
     que "dias vazios" tentava fazer e fazia mal, porque numero solto nao diz do que.
     Todo indicador aqui carrega valor, unidade e periodo. */
  var JANELA_FRENTE = 14, JANELA_TRAS = 14;

  function resumo(u) {
    var lista = saidasDe(u);
    var saiu = lista.filter(function (s) { return s.estado === 'publicado'; }).length;
    var vem = lista.filter(function (s) { return s.estado === 'programado'; }).length;
    var mapa = porDia(u), vazios = 0, proximo = null, cobertos = 0;
    var i, d;
    for (i = 0; i < JANELA_FRENTE; i++) {
      d = new Date(HOJE.getFullYear(), HOJE.getMonth(), HOJE.getDate() + i);
      var doDia = (mapa[chaveDia(d)] || []).filter(function (s) {
        return s.estado === 'programado';
      });
      if (doDia.length) cobertos++;
      else { vazios++; if (!proximo) proximo = d; }
    }
    /* AS QUATRO MEDIDAS OLHAM A MESMA JANELA de catorze dias, para tras e para frente.
       Misturar "total de sempre" com "proximos catorze" poe numeros que nao se
       comparam lado a lado, e foi metade do que tornava a faixa antiga sem sentido. */
    var publicados = 0, agendados = 0;
    for (i = 1; i <= JANELA_TRAS; i++) {
      d = new Date(HOJE.getFullYear(), HOJE.getMonth(), HOJE.getDate() - i);
      publicados += (mapa[chaveDia(d)] || []).length;
    }
    for (i = 0; i < JANELA_FRENTE; i++) {
      d = new Date(HOJE.getFullYear(), HOJE.getMonth(), HOJE.getDate() + i);
      agendados += (mapa[chaveDia(d)] || []).filter(function (s) {
        return s.estado === 'programado';
      }).length;
    }
    /* AS DUAS SEMANAS ANTERIORES, so' para a pilula de variacao ter contra o que
       comparar. Indicador sem base de comparacao e' numero solto. */
    var publicadosAntes = 0;
    for (i = JANELA_TRAS + 1; i <= JANELA_TRAS * 2; i++) {
      d = new Date(HOJE.getFullYear(), HOJE.getMonth(), HOJE.getDate() - i);
      publicadosAntes += (mapa[chaveDia(d)] || []).length;
    }
    var cadencia = publicados / JANELA_TRAS;
    return {
      publicadosAntes: publicadosAntes,
      cadenciaAntes: publicadosAntes / JANELA_TRAS,
      saiu: saiu, vem: vem, vazios: vazios, primeiroVazio: proximo,
      publicados: publicados, agendados: agendados,
      cadencia: cadencia, cobertos: cobertos, janela: JANELA_FRENTE,
      /* FOLEGO: quantos dias a fila ainda cobre no ritmo atual. E' o mesmo nome que o
         Painel ja' usa, e por isso nao se traduz duas vezes na mesma casa. */
      folego: cadencia > 0 ? Math.round(vem / cadencia) : null,
      totalPublicados: saiu, totalAgendados: vem
    };
  }

  /* ------------------------------------------------------------------ as levas
     A LEVA E' A UNICA COISA COM DURACAO nesta tela: comeca, termina e tem progresso.
     Publicacao e' ponto no tempo, e ponto no tempo nao vira barra de gantt. */
  function levas(u) {
    var mapa = {}, ordem = [];
    saidasDe(u).forEach(function (s) {
      var chave = s.conta + '|' + (s.leva || 'Sem leva');
      if (!mapa[chave]) {
        mapa[chave] = {
          chave: chave, conta: s.conta, nome: s.leva || 'Sem leva',
          leva_id: s.leva_id || '', exemplo: !!s.leva_exemplo,
          itens: [], dias: {}
        };
        ordem.push(chave);
      }
      mapa[chave].itens.push(s);
      mapa[chave].dias[chaveDia(data(s.quando))] = true;
    });
    return ordem.map(function (k) {
      var l = mapa[k];
      l.itens.sort(function (a, b) { return new Date(a.quando) - new Date(b.quando); });
      l.inicio = data(l.itens[0].quando);
      l.fim = data(l.itens[l.itens.length - 1].quando);
      l.total = l.itens.length;
      l.feitos = l.itens.filter(function (s) {
        return s.estado === 'publicado';
      }).length;
      return l;
    }).sort(function (a, b) { return a.inicio - b.inicio; });
  }

  /* Os grupos do gantt: uma conta, as levas dela, e a barra de resumo que vai do
     primeiro ao ultimo dia de tudo que esta' dentro. E' o rollup do ClickUp. */
  function gruposDeLeva(u) {
    var todas = levas(u);
    var contas = u === REDE ? CONTAS.map(function (c) { return c.u; }) : [u];
    return contas.map(function (uu) {
      var minhas = todas.filter(function (l) { return l.conta === uu; });
      if (!minhas.length) return null;
      var total = 0, feitos = 0;
      minhas.forEach(function (l) { total += l.total; feitos += l.feitos; });
      return {
        conta: contaDe(uu), levas: minhas, total: total, feitos: feitos,
        inicio: minhas[0].inicio,
        fim: minhas.reduce(function (a, l) { return l.fim > a ? l.fim : a; },
                           minhas[0].fim)
      };
    }).filter(Boolean);
  }

  /* ------------------------------------------------- as duas visoes da mesma aba
     A DECISAO DE 10/09, segunda rodada: o calendario nao escolhe entre mes e gantt,
     ele tem os dois, no mesmo lugar, sobre a mesma conta. Mes responde "que dia",
     gantt responde "em que ritmo". Trocar de visao nao troca de conta nem de mes. */
  var visao = 'mes';

  /* O ALTERNADOR E' O `.rs-seg` DA CASA, o mesmo que a aba de Analytics usa para o
     periodo. Eu tinha desenhado um proprio, com icone e altura diferentes: peca nova
     onde ja' havia peca aprovada e' o que vinha deixando a tela fora do tom. */
  function abas() {
    return '<div class="rs-seg" role="tablist">' +
      [['mes', 'Mês'], ['gantt', 'Gantt']].map(function (v) {
        return '<button type="button" role="tab" data-visao="' + v[0] + '"' +
          ' aria-selected="' + (visao === v[0] ? 'true' : 'false') + '"' +
          (visao === v[0] ? ' class="on"' : '') + '>' + v[1] + '</button>';
      }).join('') + '</div>';
  }

  document.addEventListener('click', function (e) {
    var v = e.target.closest('[data-visao]');
    if (!v || v.dataset.visao === visao) return;
    visao = v.dataset.visao;
    if (window.CAL_PINTAR) window.CAL_PINTAR();
  });

  /* A FAIXA DO GANTT: dias corridos em volta de hoje, e nao o mes fechado. Gantt que
     comeca no dia 1 esconde o ritmo justamente na virada do mes. */
  function faixa(de, ate) {
    var fora = [];
    for (var i = de; i <= ate; i++) {
      fora.push(new Date(HOJE.getFullYear(), HOJE.getMonth(), HOJE.getDate() + i));
    }
    return fora;
  }
  function fds(d) { return d.getDay() === 0 || d.getDay() === 6; }
  /* A MESMA FAIXA QUEBRADA EM SEMANAS. Gantt de uma conta so' e' uma tira de 70 pixels
     perdida no branco: com uma conta, a raia que vale comparar e' a SEMANA, e ai' o
     quadro enche e da' para bater segunda contra segunda. Com a rede, a raia volta a
     ser a conta. */
  function semanas(de, ate) {
    var a = new Date(HOJE.getFullYear(), HOJE.getMonth(), HOJE.getDate() + de);
    a.setDate(a.getDate() - a.getDay());
    var fim = new Date(HOJE.getFullYear(), HOJE.getMonth(), HOJE.getDate() + ate);
    var fora = [];
    while (a <= fim) {
      var linha = [];
      for (var i = 0; i < 7; i++) {
        linha.push(new Date(a.getFullYear(), a.getMonth(), a.getDate() + i));
      }
      fora.push(linha);
      a = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 7);
    }
    return fora;
  }
  /* A HORA COMO FRACAO DO DIA UTIL (6h as 24h), para posicionar ponto e barra. */
  function fracaoHora(iso) {
    var d = data(iso);
    if (!d) return 0;
    var h = d.getHours() + d.getMinutes() / 60;
    return Math.max(0, Math.min(1, (h - 6) / 18));
  }

  /* --------------------------------------------------------- o seletor de conta */
  var aberto = false, marcado = 0;

  /* O SELETOR E' O COMBOBOX `.cb` DO PAINEL, copiado da aba de Analytics que ja' esta'
     no ar: mesma marcacao, mesmas classes, mesmo lugar (canto direito do cabecalho da
     pagina). O que eu tinha feito antes era um controle novo com as mesmas funcoes e
     medidas diferentes, e ele reprovou duas vezes. */
  function seletor() {
    var c = escolhida === REDE ? null : contaDe(escolhida);
    return '<div class="cb" id="cl-sel">' +
      '<button class="cb-bt" type="button" id="cl-sel-bt" aria-haspopup="listbox" ' +
      'aria-expanded="false">' +
        (c ? face(c, 'cb-av') : '<span class="cb-av cl-rede">' + icoRede() + '</span>') +
        '<span class="cb-txt"><b>' + (c ? '@' + seguro(c.u) : 'Toda A Rede') +
        '</b><small>' + (c ? (c.mercado ? seguro(maiuscula(c.mercado))
                                        : 'sem mercado definido')
                           : CONTAS.length + ' contas ligadas') + '</small></span>' +
        '<svg class="cb-cv" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>' +
      '</button>' +
      '<div class="cb-m" id="cl-sel-cx" hidden>' +
        '<label class="cb-busca"><svg viewBox="0 0 24 24" fill="none" ' +
          'stroke="currentColor" stroke-width="2">' +
          '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
          '<input type="text" id="cl-sel-q" placeholder="Buscar conta pelo arroba" ' +
          'autocomplete="off" spellcheck="false"></label>' +
        '<div class="cb-lista" id="cl-sel-lista" role="listbox"></div>' +
      '</div></div>';
  }

  function face(c, classe) {
    return c.avatar
      ? '<span class="' + classe + '"><img src="' + seguro(c.avatar) + '" alt=""></span>'
      : '<span class="' + classe + ' cl-inicial" style="background:' + corDe(c.u) +
        '">' + seguro(c.u.slice(0, 2).toUpperCase()) + '</span>';
  }
  function icoRede() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M4 12h16"/>' +
      '<path d="M12 4a12 12 0 0 1 0 16a12 12 0 0 1 0-16"/></svg>';
  }

  function opcoes(busca) {
    var lista = [{ u: REDE, nome: 'Toda A Rede' }].concat(CONTAS);
    if (busca) {
      var q = busca.toLowerCase().replace('@', '');
      lista = lista.filter(function (c) {
        return c.u === REDE ? 'toda a rede'.indexOf(q) >= 0
          : (c.u + ' ' + (c.mercado || '')).toLowerCase().indexOf(q) >= 0;
      });
    }
    return lista;
  }

  function pintarLista(busca) {
    var caixa = document.getElementById('cl-sel-lista');
    if (!caixa) return;
    var lista = opcoes(busca);
    marcado = Math.min(marcado, Math.max(lista.length - 1, 0));
    caixa.innerHTML = lista.length ? lista.map(function (c, i) {
      var quantas = c.u === REDE ? SAIDAS.length : saidasDe(c.u).length;
      return '<button type="button" class="cb-o' +
        (c.u === escolhida ? ' sel' : '') + (i === marcado ? ' mrc' : '') +
        '" data-conta="' + seguro(c.u) + '" role="option">' +
        (c.u === REDE ? '<span class="cb-av peq cl-rede">' + icoRede() + '</span>'
                      : face(c, 'cb-av peq')) +
        '<span class="cb-txt"><b>' +
        (c.u === REDE ? 'Toda A Rede' : '@' + seguro(c.u)) + '</b>' +
        '<small>' + (c.u === REDE ? CONTAS.length + ' contas'
          : (c.mercado ? seguro(maiuscula(c.mercado)) : 'sem mercado definido')) +
        '</small></span>' +
        (c.u === escolhida ? '<svg class="cb-ok" viewBox="0 0 24 24">' +
          '<path d="M20 6 9 17l-5-5"/></svg>'
          : '<span class="cl-op-n rs-tn">' + quantas + '</span>') + '</button>';
    }).join('') : '<div class="cb-vazio">Nenhuma conta com esse nome.</div>';
  }

  function abrirSeletor(abre) {
    var cx = document.getElementById('cl-sel-cx');
    var bt = document.getElementById('cl-sel-bt');
    if (!cx) return;
    aberto = abre;
    cx.hidden = !abre;
    document.getElementById('cl-sel').classList.toggle('aberto', abre);
    bt.setAttribute('aria-expanded', abre ? 'true' : 'false');
    if (abre) {
      marcado = 0;
      pintarLista('');
      var q = document.getElementById('cl-sel-q');
      q.value = '';
      q.focus();
    }
  }

  document.addEventListener('click', function (e) {
    var bt = e.target.closest('#cl-sel-bt');
    if (bt) { abrirSeletor(!aberto); return; }
    var op = e.target.closest('[data-conta]');
    if (op) {
      escolhida = op.dataset.conta;
      abrirSeletor(false);
      if (window.CAL_PINTAR) window.CAL_PINTAR();
      return;
    }
    if (aberto && !e.target.closest('#cl-sel')) abrirSeletor(false);
  });

  document.addEventListener('input', function (e) {
    if (e.target.id !== 'cl-sel-q') return;
    marcado = 0;
    pintarLista(e.target.value);
  });

  /* SETA, ENTER E ESC, como manda o padrao de combobox. Sem isso o seletor e' um
     menu bonito que exige o mouse. */
  document.addEventListener('keydown', function (e) {
    if (!aberto) return;
    var lista = opcoes(document.getElementById('cl-sel-q').value);
    if (e.key === 'Escape') { e.preventDefault(); abrirSeletor(false); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      marcado = Math.max(0, Math.min(lista.length - 1,
        marcado + (e.key === 'ArrowDown' ? 1 : -1)));
      pintarLista(document.getElementById('cl-sel-q').value);
      var alvo = document.querySelector('.cb-o.mrc');
      if (alvo) alvo.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Enter' && lista[marcado]) {
      e.preventDefault();
      escolhida = lista[marcado].u;
      abrirSeletor(false);
      if (window.CAL_PINTAR) window.CAL_PINTAR();
    }
  });

  /* ------------------------------------------------------ o painel de um dia */
  /* A MESMA PECA DA SUB-ABA MIDIAS, aprovada em 10/09: entra pela direita, tem seta
     para andar e fecha no Esc. Aqui ele mostra o DIA, e nao um video. */
  var diaAberto = null;

  function abrirDia(chave) {
    var peek = document.getElementById('cl-peek');
    var fundo = document.getElementById('cl-fundo');
    var mapa = porDia(escolhida);
    var lista = (mapa[chave] || []).slice().sort(function (a, b) {
      return new Date(a.quando) - new Date(b.quando);
    });
    var d = data(chave);
    diaAberto = chave;

    var jaFoi = lista.filter(function (s) { return s.estado === 'publicado'; }).length;
    var naFila = lista.length - jaFoi;

    peek.innerHTML =
      '<div class="cl-peek-cab">' +
        '<div class="cl-peek-quem"><b>' + d.getDate() + ' De ' + MES[d.getMonth()] +
        '</b><span>' + DIAS[d.getDay()] +
        (mesmoDia(d, HOJE) ? ' · Hoje' : '') + '</span>' +
        (lista.length ? '<span class="cl-peek-pins">' +
          (jaFoi ? '<span class="mid-pin foi"><i></i>' + jaFoi +
            ' Publicados</span>' : '') +
          (naFila ? '<span class="mid-pin marcado"><i></i>' + naFila +
            ' Agendados</span>' : '') + '</span>' : '') +
        '</div>' +
        '<div class="cl-peek-setas">' +
          '<button type="button" data-dia-andar="-1" aria-label="Dia anterior">' +
            '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>' +
          '<button type="button" data-dia-andar="1" aria-label="Próximo dia">' +
            '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>' +
          '<button type="button" data-dia-fechar aria-label="Fechar">' +
            '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
        '</div>' +
      '</div>' +
      '<div class="cl-peek-corpo">' + (lista.length
        ? lista.map(linhaDoDia).join('')
        : '<div class="cl-peek-vazio"><p><b>Nada sai neste dia.</b></p>' +
          '<p>Dia vazio na agenda é conta parada. Programe um lote para preencher.' +
          '</p><button class="ct-bt verde" type="button"><span class="txt">' +
          'Programar Publicações</span><span class="circ"></span></button></div>') +
      '</div>';
    peek.hidden = false;
    fundo.hidden = false;
    void peek.offsetHeight;
    peek.classList.add('on');
    fundo.classList.add('on');
    document.querySelectorAll('[data-dia]').forEach(function (x) {
      x.classList.toggle('aberto', x.dataset.dia === chave);
    });
  }

  /* A LOGO DO DRIVE, a mesma peca da sub-aba Midias implantada em 10/09. Ele pediu em
     11/09 que o painel do dia tambem levasse ao arquivo, e o destino e' A PASTA
     DAQUELE CORTE: no Drive dele a leva nao guarda video, guarda 180 pastas com um
     video dentro de cada. */
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

  /* AS ACOES SAO A FILA `.bc-acoes` DA SUB-ABA MIDIAS, com os mesmos botoes de 34: a
     logo do Drive na caixa `.como-bt` e o atalho para o Instagram quando a publicacao
     existe la'. Botao sem back atras nao entra. */
  function acoes(s) {
    var fora = '';
    if (s.pasta_id) {
      fora += '<a class="mid-drive como-bt" target="_blank" rel="noopener" ' +
        'href="https://drive.google.com/drive/folders/' + seguro(s.pasta_id) + '" ' +
        'title="Abrir no Drive a pasta deste vídeo" ' +
        'aria-label="Abrir no Drive a pasta deste vídeo">' + LOGO_DRIVE + '</a>';
    }
    if (s.sc) {
      fora += '<a class="mid-ac" target="_blank" rel="noopener" ' +
        'href="https://www.instagram.com/reel/' + seguro(s.sc) + '/" ' +
        'title="Ver a publicação no Instagram">' +
        '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/>' +
        '<circle cx="12" cy="12" r="3.6"/><path d="M17.4 6.7h.01"/></svg></a>';
    }
    return fora ? '<div class="bc-acoes">' + fora + '</div>' : '';
  }

  function par(rot, valor, quebra) {
    return '<div class="bc-par' + (quebra ? ' quebra' : '') + '"><span>' + rot +
      '</span><b>' + seguro(valor) + '</b></div>';
  }

  /* A LINHA DO PAINEL DO DIA. A primeira versao punha a hora numa coluna de 44 pixels
     colada na capa, o nome de arquivo inteiro no meio e o numero de visualizacoes na
     ponta: tres pesos iguais disputando a mesma linha, sem nada mandando. Agora a HORA
     e' a ancora, com o fio de agenda ligando uma saida na outra; o nome curto manda no
     meio; e a direita ficam so' duas coisas, o estado e o caminho para o arquivo. */
  /* A SAIDA DENTRO DO PAINEL DO DIA.

     A versao anterior era uma linha magra com hora, capinha e um rotulo: ele chamou de
     seca, e era. O desenho agora e' o do painel lateral da sub-aba Midias, que ele
     aprovou em 10/09: capa com tamanho, `.bc-nome` para o titulo, `.bc-pares` para os
     dados e `.bc-acoes` para o caminho ate' o arquivo. A hora fica de fora, na coluna
     da agenda, porque aqui ela e' a ordem e nao um dado a mais. */
  function linhaDoDia(s) {
    var vem = s.estado === 'programado';
    return '<div class="cl-li' + (vem ? ' vem' : '') + '">' +
      '<span class="cl-li-quando"><b>' + hora(s.quando).replace('h', ':') + '</b>' +
        '<i class="cl-li-fio"></i></span>' +
      '<div class="cl-li-corpo">' +
        '<div class="cl-li-topo">' +
          (s.capa != null
            ? '<span class="cl-li-capa"><img src="' + capa(s.capa) + '" alt=""></span>'
            : '<span class="cl-li-capa sem">' + icoFilme() + '</span>') +
          '<div class="cl-li-txt">' +
            (vem ? '<span class="mid-pin marcado"><i></i>Agendado</span>'
                 : '<span class="mid-pin foi"><i></i>Publicado</span>') +
            '<h4 class="bc-nome">' + seguro(rotulo(s)) + '</h4>' +
            '<span class="cl-li-quem"><i style="background:' + corDe(s.conta) +
              '"></i>@' + seguro(s.conta) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="bc-pares">' +
          par('Leva', maiuscula(s.leva || '—')) +
          (s.nome ? par('Arquivo', pedaco(s.nome, 34)) : '') +
          (s.vis != null ? par('Visualizações', n(s.vis)) : '') +
        '</div>' +
        acoes(s) +
        (s.exemplo
          ? '<span class="cl-li-ex"><em class="mid-ex"></em>Exemplo</span>' : '') +
      '</div>' +
    '</div>';
  }

  function icoFilme() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round"><rect x="3" y="4" width="18" ' +
      'height="16" rx="2.5"/><path d="M7 4v16M17 4v16M3 12h18"/></svg>';
  }

  function fecharDia() {
    var peek = document.getElementById('cl-peek');
    var fundo = document.getElementById('cl-fundo');
    peek.classList.remove('on');
    fundo.classList.remove('on');
    diaAberto = null;
    document.querySelectorAll('[data-dia].aberto').forEach(function (x) {
      x.classList.remove('aberto');
    });
    setTimeout(function () {
      if (!peek.classList.contains('on')) { peek.hidden = true; fundo.hidden = true; }
    }, 260);
  }

  document.addEventListener('click', function (e) {
    var abrir = e.target.closest('[data-dia]');
    if (abrir) { abrirDia(abrir.dataset.dia); return; }
    if (e.target.closest('[data-dia-fechar]') || e.target.closest('#cl-fundo')) {
      fecharDia(); return;
    }
    var andar = e.target.closest('[data-dia-andar]');
    if (andar && diaAberto) {
      var d = data(diaAberto);
      d.setDate(d.getDate() + Number(andar.dataset.diaAndar));
      abrirDia(chaveDia(d));
    }
  });
  document.addEventListener('keydown', function (e) {
    if (!diaAberto) return;
    if (e.key === 'Escape') { fecharDia(); return; }
    if (e.target.closest('input')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      var d = data(diaAberto);
      d.setDate(d.getDate() + (e.key === 'ArrowRight' ? 1 : -1));
      abrirDia(chaveDia(d));
    }
  });

  /* ------------------------------------------------------------ menu e tema */
  function ligarCasca() {
    var raiz = document.documentElement;
    var chave = document.getElementById('chave');
    if (chave) chave.addEventListener('click', function () {
      var escuro = raiz.getAttribute('data-theme') === 'dark';
      raiz.setAttribute('data-theme', escuro ? 'light' : 'dark');
      chave.setAttribute('aria-checked', escuro ? 'false' : 'true');
    });
    var botao = document.getElementById('botao-menu');
    if (botao) botao.addEventListener('click', function () {
      var ab = raiz.getAttribute('data-menu') !== 'fechado';
      raiz.setAttribute('data-menu', ab ? 'fechado' : 'aberto');
      botao.setAttribute('aria-expanded', ab ? 'false' : 'true');
    });
    document.querySelectorAll('.menu .mi').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.pag !== 'calendario') torrada('Maquete: só o Calendário está ' +
          'montado aqui.');
      });
    });
  }

  var relogio = null;
  function torrada(texto) {
    var t = document.getElementById('cl-torrada');
    if (!t) {
      t = document.createElement('div');
      t.id = 'cl-torrada';
      t.className = 'an-torrada cl-torrada';
      document.body.appendChild(t);
    }
    t.textContent = texto;
    t.classList.add('on');
    clearTimeout(relogio);
    relogio = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }

  window.CAL = {
    D: D, HOJE: HOJE, CONTAS: CONTAS, REDE: REDE, MES: MES, MES3: MES3, DIAS: DIAS,
    n: n, curto: curto, seguro: seguro, maiuscula: maiuscula, pedaco: pedaco,
    rotulo: rotulo,
    data: data, dia: dia, hora: hora, chaveDia: chaveDia, mesmoDia: mesmoDia,
    capa: capa, corDe: corDe, contaDe: contaDe, face: face,
    saidasDe: saidasDe, porDia: porDia, resumo: resumo,
    levas: levas, gruposDeLeva: gruposDeLeva,
    abas: abas, visao: function () { return visao; },
    faixa: faixa, fds: fds, fracaoHora: fracaoHora, semanas: semanas,
    seletor: seletor, escolhida: function () { return escolhida; },
    abrirDia: abrirDia, linhaDoDia: linhaDoDia, torrada: torrada,
    ligarCasca: ligarCasca
  };
})();
