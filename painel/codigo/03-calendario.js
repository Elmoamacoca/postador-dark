/* =====================================================================
   A ABA DE CALENDARIO

   ESTE ARQUIVO E' GERADO. Nao edite aqui: mexa em
   `docs/propostas/calendario/comum.js` ou `proposta-a.js` e rode
   `python docs/propostas/calendario/portar-js.py`.

   O DESENHO E' A PROPOSTA A, aprovada em 11/09/2026: o mes em linhas de texto e um
   gantt sobre as LEVAS, no molde do ClickUp, no mesmo alternador.

   POR QUE A LEVA E' A BARRA DO GANTT: e' a unica coisa nesta tela com duracao. Uma
   publicacao e' ponto no tempo, e ponto no tempo nao vira barra. A barra da leva e'
   segmentada: dia sem saida dentro do periodo vira corte, e e' assim que a agenda
   furada aparece.
   ===================================================================== */
/* ============================================ O COMPARTILHADO DO CALENDARIO
   O que as tres propostas usam por igual: os dados, o seletor de conta, o painel
   lateral de um dia e a casca (menu e tema).

   O SELETOR E' O DA ABA DE ANALYTICS, aprovado por ele em 09/09: combobox com busca,
   setas, Enter e Esc. A decisao de 10/09 e' que o calendario passa a ser POR CONTA,
   com "Toda A Rede" como escolha explicita dentro do mesmo seletor, porque o
   agendador desencontra o horario entre contas e conferir isso exige ve-las juntas.
   ========================================================================== */
(function () {
  var D = { contas: [], saidas: [] };
  /* A HORA VEM DO RELOGIO DE QUEM ABRE, e nao do instante em que a maquete foi gerada:
     senao o risco "Agora" do gantt fica parado na hora da geracao e desencontra do
     relogio dele em minutos. O DIA continua o dos dados, porque e' em volta dele que a
     agenda foi montada. */
  var HOJE = new Date();
  var CONTAS = [], SAIDAS = [];
  SAIDAS.forEach(function (s, i) { s.id = i; });   /* para a previa achar a saida */
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
  /* A CAPA JA' E' O ENDERECO QUE A CASA SERVE. O endereco do Drive expira e exige
     token, entao a miniatura foi baixada uma vez e e' servida por `midia/capa?v=`. */
  function capa(c) { return c ? String(c) : ''; }
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

  /* -------------------------------------------------------- os numeros que entram
     NUMERO QUE APARECE PRONTO PARECE MAQUETE. Ele apontou isso em 11/09: a faixa de
     indicadores parecia colada na tela. Todo numero marcado com `data-num` sobe de
     zero ate' o valor, com desaceleracao, e so' quando o valor MUDA: repintar o gantt
     ao arrastar nao pode fazer a faixa inteira piscar a cada dia percorrido.

     Quem pede menos movimento no sistema nao recebe animacao nenhuma. */
  var ultimos = {};

  function fmtNum(v, dec) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: dec,
                                       maximumFractionDigits: dec });
  }

  function animarNumeros(raiz) {
    var quieto = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    raiz.querySelectorAll('[data-num]').forEach(function (el) {
      var chave = el.dataset.chave || el.dataset.num;
      var fim = parseFloat(el.dataset.num);
      var dec = Number(el.dataset.dec || 0);
      var sinal = el.dataset.sinal || '';
      var texto = function (v) { return sinal + fmtNum(v, dec); };

      if (quieto || ultimos[chave] === fim) {
        el.textContent = texto(fim);
        ultimos[chave] = fim;
        return;
      }
      ultimos[chave] = fim;

      /* O VALOR FINAL ENTRA PRIMEIRO, e a contagem comeca dentro do primeiro quadro.
         Navegador com a aba oculta PAUSA `requestAnimationFrame`: comecando em zero, o
         numero ficava preso no zero ate' a aba voltar a vista. E' o mesmo tipo de
         armadilha da transicao pausada que ja' custou uma tela nesta sessao. */
      var t0 = null, dur = 620;
      el.textContent = texto(fim);
      requestAnimationFrame(function passo(t) {
        if (t0 === null) { t0 = t; el.textContent = texto(0); }
        var k = Math.min((t - t0) / dur, 1);
        el.textContent = texto(fim * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(passo);
      });
    });
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
    var c = contaDe(escolhida);
    return '<div class="cb" id="cl-sel">' +
      '<button class="cb-bt" type="button" id="cl-sel-bt" aria-haspopup="listbox" ' +
      'aria-expanded="false">' +
        face(c, 'cb-av') +
        '<span class="cb-txt"><b>@' + seguro(c.u) + '</b><small>' +
        (c.mercado ? seguro(maiuscula(c.mercado)) : 'sem mercado definido') +
        '</small></span>' +
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

  /* SEM "TODA A REDE". Ele cortou a opcao em 11/09: o calendario e' de uma conta por
     vez, ponto. O codigo que trata a rede continua de pe' para nao quebrar as outras
     duas propostas, mas ela deixa de ser escolhivel aqui. */
  function opcoes(busca) {
    var lista = CONTAS.slice();
    if (busca) {
      var q = busca.toLowerCase().replace('@', '');
      lista = lista.filter(function (c) {
        return (c.u + ' ' + (c.mercado || '')).toLowerCase().indexOf(q) >= 0;
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
        face(c, 'cb-av') +
        '<span class="cb-txt"><b>@' + seguro(c.u) + '</b>' +
        '<small>' + (c.mercado ? seguro(maiuscula(c.mercado))
                               : 'sem mercado definido') + '</small></span>' +
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

  var ICO_IG = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" ' +
    'rx="5"/><circle cx="12" cy="12" r="3.6"/><path d="M17.4 6.7h.01"/></svg>';
  var ICO_OLHO = '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12' +
    's-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

  /* AS ACOES SAO A FILA `.bc-acoes` DA SUB-ABA MIDIAS, com os mesmos botoes de 34.

     A REGRA QUE ELE PEDIU EM 11/09: se ja' foi ao ar, o caminho e' o Instagram; se
     ainda esta' na fila, o caminho e' o Drive. E sempre a previa.

     O QUE O SISTEMA PERMITE HOJE: as 180 midias do painel estao TODAS guardadas, e
     nenhuma tem codigo de publicacao; as 8 saidas que a Meta conhece tem codigo mas
     nao vieram de pasta ligada. Entao o botao que nao tem para onde ir aparece
     desligado, dizendo por que: promessa de botao e' pior que botao ausente. */
  function acoes(s, tamanho) {
    var cls = tamanho === 'peq' ? ' peq' : '';
    var fora = '<button type="button" class="mid-ac' + cls +
      '" data-previa="' + s.id + '" title="Ver a prévia do conteúdo">' +
      ICO_OLHO + '</button>';

    if (s.estado === 'publicado') {
      fora += s.sc
        ? '<a class="mid-ac' + cls + '" target="_blank" rel="noopener" ' +
          'href="https://www.instagram.com/reel/' + seguro(s.sc) + '/" ' +
          'title="Ver a publicação no Instagram">' + ICO_IG + '</a>'
        : '<span class="mid-ac' + cls + ' morto" title="Saída de exemplo: não existe ' +
          'publicação no Instagram para abrir">' + ICO_IG + '</span>';
    }
    if (s.pasta_id) {
      fora += '<a class="mid-drive como-bt' + cls + '" target="_blank" rel="noopener" ' +
        'href="https://drive.google.com/drive/folders/' + seguro(s.pasta_id) + '" ' +
        'title="Abrir no Drive a pasta deste vídeo" ' +
        'aria-label="Abrir no Drive a pasta deste vídeo">' + LOGO_DRIVE + '</a>';
    } else if (s.estado === 'programado') {
      fora += '<span class="mid-drive como-bt' + cls + ' morto" title="Esta saída não ' +
        'veio de uma pasta ligada, então não há pasta para abrir">' +
        LOGO_DRIVE + '</span>';
    }
    return '<div class="bc-acoes">' + fora + '</div>';
  }

  /* ------------------------------------------------------------------- a previa
     A CAPA E' O QUE A CASA TEM. O video mora no Drive e a Meta nao devolve arquivo de
     reel; entao a previa mostra a miniatura em tamanho grande, os dados da saida e os
     dois caminhos, e diz de onde vem o que esta' na tela. */
  function abrirPrevia(id) {
    var s = SAIDAS[Number(id)];
    if (!s) return;
    var alvo = document.getElementById('cl-previa');
    if (!alvo) {
      alvo = document.createElement('div');
      alvo.id = 'cl-previa';
      alvo.className = 'cl-prev';
      alvo.hidden = true;
      document.body.appendChild(alvo);
    }
    alvo.innerHTML =
      '<div class="cl-prev-cx">' +
        '<button class="cl-prev-x" type="button" data-previa-fechar aria-label="Fechar">' +
          '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
        '<div class="cl-prev-capa">' +
          (s.capa != null ? '<img src="' + capa(s.capa) + '" alt="">'
                          : '<span class="cl-prev-sem">' + icoFilme() + '</span>') +
        '</div>' +
        '<div class="cl-prev-lado">' +
          (s.estado === 'programado'
            ? '<span class="mid-pin marcado"><i></i>Agendado</span>'
            : '<span class="mid-pin foi"><i></i>Publicado</span>') +
          '<h3 class="bc-nome">' + seguro(rotulo(s)) + '</h3>' +
          '<div class="bc-pares">' +
            par('Conta', '@' + s.conta) +
            par(s.estado === 'programado' ? 'Sai' : 'Saiu',
                dia(s.quando) + ' · ' + hora(s.quando)) +
            par('Leva', maiuscula(s.leva || '—')) +
            (s.nome ? par('Arquivo', s.nome, true) : '') +
            (s.vis != null ? par('Visualizações', n(s.vis)) : '') +
          '</div>' +
          acoes(s) +
          '<p class="cl-prev-nota">A prévia mostra a capa do vídeo, que é o que o ' +
            'painel guarda. O arquivo abre no Drive.' +
            (s.exemplo ? ' Esta saída é exemplo.' : '') + '</p>' +
        '</div>' +
      '</div>';
    alvo.hidden = false;
    void alvo.offsetHeight;
    alvo.classList.add('on');
  }

  function fecharPrevia() {
    var alvo = document.getElementById('cl-previa');
    if (!alvo) return;
    alvo.classList.remove('on');
    setTimeout(function () {
      if (!alvo.classList.contains('on')) alvo.hidden = true;
    }, 220);
  }

  document.addEventListener('click', function (e) {
    var p = e.target.closest('[data-previa]');
    if (p) { e.stopPropagation(); abrirPrevia(p.dataset.previa); return; }
    if (e.target.closest('[data-previa-fechar]') ||
        (e.target.id === 'cl-previa')) fecharPrevia();
  });
  document.addEventListener('keydown', function (e) {
    var alvo = document.getElementById('cl-previa');
    if (e.key === 'Escape' && alvo && !alvo.hidden) {
      e.stopPropagation();
      fecharPrevia();
    }
  }, true);

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
    /* CLIQUE NUMA ACAO NAO E' CLIQUE NO DIA. A fila de acoes mora dentro de linhas que
       carregam `data-dia`, e sem esta guarda abrir a previa abria o painel do dia
       junto, por tras dela. */
    if (e.target.closest('.bc-acoes')) return;
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
    capa: capa, corDe: corDe, contaDe: contaDe, face: face, acoes: acoes,
    saidasDe: saidasDe, porDia: porDia, resumo: resumo,
    levas: levas, gruposDeLeva: gruposDeLeva,
    abas: abas, visao: function () { return visao; },
    animarNumeros: animarNumeros,
    faixa: faixa, fds: fds, fracaoHora: fracaoHora, semanas: semanas,
    seletor: seletor, escolhida: function () { return escolhida; },
    abrirDia: abrirDia, linhaDoDia: linhaDoDia, torrada: torrada,
    ligarCasca: ligarCasca
  };

  /* -------------------------------------------------------- o que abre a aba */
  function esqueleto(texto) {
    var palco = document.getElementById('cal-palco');
    if (palco) palco.innerHTML = '<div class="rs-cd pa-gt-sem">' + seguro(texto) +
      '</div>';
  }

  var carregou = false;

  window.abrirCalendario = function () {
    if (carregou) return;
    carregou = true;
    esqueleto('Carregando a agenda');
    Promise.all([
      fetch('calendario/saidas', { cache: 'no-store' })
        .then(function (r) { return r.json(); }),
      fetch('contas/estado', { cache: 'no-store' })
        .then(function (r) { return r.json(); }),
      fetch('contas/meta', { cache: 'no-store' }).then(function (r) { return r.json(); })
        .catch(function () { return { contas: {} }; })
    ]).then(function (r) {
      var meta = (r[2] || {}).contas || {};
      CONTAS = ((r[1] || {}).contas || []).map(function (c) {
        return {
          u: c.arroba, nome: c.nome || c.arroba, avatar: c.avatar || '',
          tipo: c.tipo || '', estado: c.estado || 'viva',
          mercado: (meta[c.arroba] || {}).mercado || ''
        };
      });
      if (!CONTAS.length) {
        esqueleto('Nenhuma conta ligada ainda.');
        return;
      }
      SAIDAS = ((r[0] || {}).saidas || []).filter(function (s) { return s.quando; });
      SAIDAS.forEach(function (s, i) { s.id = i; });
      escolhida = CONTAS[0].u;
      if (window.CAL_PINTAR) window.CAL_PINTAR();
    }).catch(function () {
      carregou = false;
      esqueleto('Não deu para ler a agenda. Atualize a página.');
    });
  };
})();

/* ============================================== PROPOSTA A: A PAUTA (v5)

   O QUE ELA E': o mes em linhas de texto, e um gantt de verdade sobre as levas. A
   tela usa as pecas do painel (`.rs-cd.rs-kpi`, `.rs-topo`, `.rs-seg`, `.cb`,
   `.bc-pares`, `.mid-pin`); aqui so' vive o que nao existe la'.

   A RODADA DE 11/09, segunda leva de correcoes:
   1. Indicadores sem grafico, com o rodape em pilula de variacao.
   2. O disco preto em volta do dia de hoje saiu: virou faixa na cor da casa.
   3. O gantt ganhou escala (Hoje, Semana, Quinzena, Mes), passou a ocupar a largura
      inteira e perdeu a barra de rolagem do rodape.
   4. O painel do dia deixou de ser seco: capa grande, pares e acoes, como o painel
      lateral da sub-aba Midias.
   5. `HOJE` passou a ser o dia de verdade, e nao uma data escrita a mao.
   ========================================================================== */
(function () {
  var C = window.CAL;
  var mes = new Date(C.HOJE.getFullYear(), C.HOJE.getMonth(), 1);
  var escala = 'semana';                       /* hoje | semana | quinzena | mes */
  var piscar = null;                           /* dia a piscar depois de pintar */
  var abertas = {};                            /* levas com as publicacoes a vista */
  var desloc = 0;                              /* dias andados no gantt, com o arrasto */

  window.CAL_PINTAR = pintar;

  function pintar() {
    var u = C.escolhida();
    var palco = document.getElementById('cal-palco');
    var noMes = C.visao() === 'mes';

    /* O SELETOR DE CONTA VAI PARA O CANTO DIREITO DO CABECALHO, exatamente onde a aba
       de Analytics o poe. Ele estava no meio do conteudo, virando mais um bloco. */
    document.getElementById('cal-troca').innerHTML = C.seletor();

    palco.innerHTML =
      '<div class="rs rs-casa cal-pilha">' +
        barra(noMes) +
        indicadores(u) +
        '<div class="rs-cd">' +
          (noMes ? grade(u) : gantt(u)) +
        '</div>' +
      '</div>';

    /* NAO HA' MAIS ROLAGEM NO GANTT: o quadro trabalha em porcentagem e a janela cabe
       inteira na largura, em qualquer escala. Some com ela a barra de rolagem do
       rodape, e some junto o velho erro de nascer no lugar errado. */

    C.animarNumeros(palco);

    if (piscar) {
      var alvo = palco.querySelector('[data-dia="' + piscar + '"]');
      if (alvo) {
        alvo.classList.add('pisca');
        alvo.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      piscar = null;
    }
  }

  /* ------------------------------------------------------------ os indicadores
     SEM GRAFICO. Ele mandou tirar em 11/09, e estava certo: indicador de topo e' um
     numero que se le' de relance, e eu tinha enfiado uma serie de catorze barras
     dentro de cada cartao. O cartao aqui e' o `.rs-cd.rs-kpi` do painel, o mesmo que
     a aba de Analytics usa: rotulo, numero e uma linha de contexto. Nada mais. */
  var ICO = {
    saiu: '<path d="M20 6 9 17l-5-5"/>',
    fila: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/>' +
          '<path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    ritmo: '<path d="M4 19V9M10 19V5M16 19v-7M22 19h-20"/>',
    cob: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3.2 2"/>'
  };

  /* O RODAPE DO CARTAO E' O DO PAINEL: pilula de variacao `.rs-delta` mais a linha de
     contexto `.rs-delta-pe`. Ele reclamou que o rodape estava pequeno e seco, e estava:
     eu so' tinha posto a linha de texto, sem a pilula que da' corpo e diz se o numero
     melhorou ou piorou. */
  function indicadores(u) {
    var r = C.resumo(u);
    return '<div class="rs-grade rs-g4">' +
      cartao(ICO.saiu, 'Publicados', num('pub', r.publicados),
        delta('d-pub', r.publicados, r.publicadosAntes), 'nos últimos 14 dias') +
      cartao(ICO.fila, 'Agendados', num('ag', r.agendados),
        r.folego != null && r.folego > 0
          ? '<span class="rs-delta fl">' + num('fol', r.folego) +
            ' dias de fôlego</span>' : '',
        'nos próximos 14 dias') +
      cartao(ICO.ritmo, 'Cadência',
        num('cad', r.cadencia, 1) + ' <small>por dia</small>',
        delta('d-cad', r.cadencia, r.cadenciaAntes), 'média de 14 dias') +
      cartao(ICO.cob, 'Cobertura',
        num('cob', r.cobertos) + ' <small>de ' + r.janela + ' dias</small>',
        '<span class="rs-delta ' + (r.vazios ? 'dw' : 'up') + '">' +
          num('d-cob', Math.round(r.cobertos / r.janela * 100)) + '%</span>',
        r.vazios
          ? (r.vazios === 1 ? 'um dia vazio, em ' : r.vazios + ' dias vazios, ') +
            (r.vazios === 1 ? '' : 'o primeiro em ') +
            C.dia(C.chaveDia(r.primeiroVazio))
          : 'nenhum dia vazio à frente') +
    '</div>';
  }

  /* TODO NUMERO DESTA FAIXA SOBE DE ZERO na entrada, e so' quando o valor muda. A
     chave e' o que diz ao contador que aquele numero e' o mesmo de antes. */
  function num(chave, valor, dec, sinal) {
    return '<b data-num="' + valor + '" data-chave="' + chave + '"' +
      (dec ? ' data-dec="' + dec + '"' : '') +
      (sinal ? ' data-sinal="' + sinal + '"' : '') + '>' +
      valor.toLocaleString('pt-BR', { minimumFractionDigits: dec || 0,
                                      maximumFractionDigits: dec || 0 }) + '</b>';
  }

  /* A VARIACAO CONTRA O PERIODO ANTERIOR, nas mesmas tres faces do Analytics: subiu,
     caiu ou ficou igual. Sem base de comparacao a pilula nao entra. */
  function delta(chave, agora, antes) {
    if (!antes) return '';
    var v = Math.round((agora / antes - 1) * 100);
    var cls = v > 2 ? 'up' : v < -2 ? 'dw' : 'fl';
    var seta = v > 2 ? 'm6 15 6-6 6 6' : v < -2 ? 'm6 9 6 6 6-6' : 'M5 12h14';
    /* O NUMERO E O SINAL DE PORCENTO FICAM NO MESMO ITEM: soltos, o espacamento da
       pilula entrava entre os dois e saia "+68 %". */
    return '<span class="rs-delta ' + cls + '"><svg viewBox="0 0 24 24">' +
      '<path d="' + seta + '"/></svg><span class="rs-delta-v">' +
      num(chave, v, 0, v > 0 ? '+' : '') + '%</span></span>';
  }

  function cartao(ico, rot, valor, pilula, pe) {
    return '<div class="rs-cd rs-kpi">' +
      '<div class="cab"><svg class="pa-ki" viewBox="0 0 24 24">' + ico + '</svg>' +
        '<span class="rs-rot2">' + rot + '</span></div>' +
      '<div class="num rs-tn">' + valor + '</div>' +
      '<div class="lin"><span>' + pilula +
        '<span class="rs-delta-pe">' + pe + '</span></span></div></div>';
  }

  /* -------------------------------------------------------------------- a barra
     E' o `.rs-topo` do painel: rotulo a esquerda, controles a direita, e o alternador
     no `.rs-seg` que a aba de Analytics ja' usa para o periodo. */
  function barra(noMes) {
    return '<div class="rs-topo">' +
      '<span class="rs-rot2">' + (noMes ? 'Mês' : 'Período') + '</span>' +
      '<div class="rs-dir">' + C.abas() +
      (noMes
        ? '<button class="bt" type="button" data-ir="hoje">Hoje</button>' +
          '<div class="rs-seg pa-nav">' +
            '<button type="button" data-ir="-1" aria-label="Mês anterior">' +
              '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>' +
            '<button type="button" data-ir="1" aria-label="Próximo mês">' +
              '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>' +
          '</div>' +
          '<span class="rs-rot3">' + C.MES[mes.getMonth()] + ' de ' +
            mes.getFullYear() + '</span>'
        : '<button class="bt" type="button" data-andar="0">Hoje</button>' +
          '<div class="rs-seg pa-nav">' +
            '<button type="button" data-andar="-1" aria-label="Período anterior">' +
              '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>' +
            '<button type="button" data-andar="1" aria-label="Próximo período">' +
              '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>' +
          '</div>' +
          '<div class="rs-seg">' +
            ESCALAS.map(function (e) {
              return '<button type="button" data-escala="' + e.v + '"' +
                (escala === e.v ? ' class="on"' : '') + '>' + e.r + '</button>';
            }).join('') + '</div>' +
          '<span class="rs-rot3">' + faixaDita() + '</span>') +
      '</div></div>';
  }

  /* ------------------------------------------------------------------- o mes */
  function grade(u) {
    var mapa = C.porDia(u);
    var primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    var comeco = new Date(primeiro);
    comeco.setDate(1 - primeiro.getDay());
    var semanas = [];
    for (var s = 0; s < 6; s++) {
      var linha = [], vivos = 0;
      for (var i = 0; i < 7; i++) {
        var d = new Date(comeco.getFullYear(), comeco.getMonth(),
                         comeco.getDate() + s * 7 + i);
        if (d.getMonth() === mes.getMonth()) vivos++;
        linha.push(celula(d, mapa[C.chaveDia(d)] || []));
      }
      /* Semana inteira de outro mes nao entra: era uma faixa de 112 pixels de nada. */
      if (vivos) semanas.push(linha.join(''));
    }
    return '<div class="pa-dias">' +
        C.DIAS.map(function (x) { return '<span>' + x + '</span>'; }).join('') +
      '</div><div class="pa-grade">' + semanas.join('') + '</div>';
  }

  function celula(d, lista) {
    var deFora = d.getMonth() !== mes.getMonth();
    var hoje = C.mesmoDia(d, C.HOJE);
    var vazio = d > C.HOJE && !lista.length && !deFora;
    lista = lista.slice().sort(function (a, b) {
      return new Date(a.quando) - new Date(b.quando);
    });

    return '<button type="button" class="pa-cel' + (deFora ? ' fora' : '') +
      (hoje ? ' hoje' : '') + '" data-dia="' + C.chaveDia(d) + '">' +
      '<span class="pa-num">' + d.getDate() + '</span>' +
      (lista.length
        ? '<span class="pa-lista">' + lista.slice(0, 3).map(item).join('') +
          (lista.length > 3
            ? '<span class="pa-mais">Mais ' + (lista.length - 3) + '</span>' : '') +
          '</span>'
        : (vazio ? '<span class="pa-slot">Sem Nada</span>' : '')) +
    '</button>';
  }

  function item(s) {
    return '<span class="pa-li' + (s.estado === 'programado' ? ' vem' : '') + '">' +
      '<i style="background:' + C.corDe(s.conta) + '"></i>' +
      '<b>' + C.hora(s.quando).replace('h', ':') + '</b>' +
      '<span>' + C.seguro(C.rotulo(s)) + '</span>' +
      (s.exemplo ? '<em class="mid-ex"></em>' : '') + '</span>';
  }

  /* ================================================================= O GANTT

     O DE ANTES NAO ERA UM GANTT: era o mes deitado. Gantt precisa de coisa COM
     DURACAO, e a unica coisa com duracao aqui e' a LEVA: ela comeca, termina e tem
     progresso.

     O MOLDE E' O DO CLICKUP, conferido na documentacao deles: dois paineis (lista a
     esquerda, linha do tempo a direita); regua de dois niveis; ESCALA TROCAVEL; barra
     por item, do inicio ao fim; barra de resumo no grupo, do menor inicio ao maior
     fim, com o percentual concluido; fim de semana sombreado; e o risco de hoje.

     TUDO EM PORCENTAGEM, E NAO EM PIXEL: assim o quadro ocupa a largura inteira em
     qualquer escala, e a barra de rolagem do rodape deixa de existir. Ele pediu as
     duas coisas em 11/09, e sao a mesma coisa.

     O QUE NAO COPIEI: dependencia entre barras. Uma publicacao nao espera a outra.
     ====================================================================== */
  var ESCALAS = [
    { v: 'hoje', r: 'Hoje', dias: 1, de: 0 },
    { v: 'semana', r: 'Semana', dias: 7, de: -2 },
    { v: 'quinzena', r: 'Quinzena', dias: 15, de: -5 },
    { v: 'mes', r: 'Mês', dias: 30, de: -10 }
  ];
  var HORA_DE = 6, HORA_ATE = 24;        /* a janela util do dia, na escala de horas */

  function daEscala() {
    for (var i = 0; i < ESCALAS.length; i++) {
      if (ESCALAS[i].v === escala) return ESCALAS[i];
    }
    return ESCALAS[1];
  }

  function periodo() {
    var e = daEscala();
    var a = new Date(C.HOJE.getFullYear(), C.HOJE.getMonth(),
                     C.HOJE.getDate() + e.de + desloc);
    var b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + e.dias - 1,
                     23, 59, 59);
    return { de: a, ate: b, dias: e.dias, hora: e.v === 'hoje' };
  }

  function faixaDita() {
    var p = periodo();
    if (p.hora) {
      return p.de.getDate() + ' de ' + C.MES[p.de.getMonth()] + ', das ' + HORA_DE +
        'h às ' + HORA_ATE + 'h';
    }
    return p.de.getDate() + ' ' + C.MES3[p.de.getMonth()] + ' a ' + p.ate.getDate() +
      ' ' + C.MES3[p.ate.getMonth()];
  }

  /* A POSICAO DE UM INSTANTE dentro do quadro, de 0 a 1. Na escala de horas o eixo e'
     o relogio do dia; nas outras, o calendario. */
  function pos(p, d) {
    if (p.hora) {
      var h = d.getHours() + d.getMinutes() / 60;
      return (h - HORA_DE) / (HORA_ATE - HORA_DE);
    }
    var um = 86400000;
    var base = new Date(p.de.getFullYear(), p.de.getMonth(), p.de.getDate());
    var alvo = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((alvo - base) / um) / p.dias;
  }
  function pct(v) { return (Math.max(0, Math.min(1, v)) * 100).toFixed(3) + '%'; }
  function passo(p) { return p.hora ? 1 / (HORA_ATE - HORA_DE) : 1 / p.dias; }

  function gantt(u) {
    var p = periodo();
    var grupos = C.gruposDeLeva(u).map(function (g) {
      var dentro = g.levas.filter(function (l) {
        return l.fim >= p.de && l.inicio <= p.ate;
      }).map(function (l) {
        /* NA ESCALA DE HORAS a leva vale pelo que ela solta HOJE: barra ocupando o dia
           inteiro nao diz nada sobre o relogio. */
        if (!p.hora) return l;
        var doDia = l.itens.filter(function (s) {
          return C.mesmoDia(C.data(s.quando), C.HOJE);
        });
        if (!doDia.length) return null;
        return {
          chave: l.chave, conta: l.conta, nome: l.nome, exemplo: l.exemplo,
          itens: doDia, dias: l.dias, total: doDia.length,
          feitos: doDia.filter(function (s) {
            return s.estado === 'publicado';
          }).length,
          inicio: C.data(doDia[0].quando),
          fim: C.data(doDia[doDia.length - 1].quando)
        };
      }).filter(Boolean);
      if (!dentro.length) return null;
      var total = 0, feitos = 0;
      dentro.forEach(function (l) { total += l.total; feitos += l.feitos; });
      return {
        conta: g.conta, levas: dentro, total: total, feitos: feitos,
        inicio: dentro.reduce(function (a, l) { return l.inicio < a ? l.inicio : a; },
                              dentro[0].inicio),
        fim: dentro.reduce(function (a, l) { return l.fim > a ? l.fim : a; },
                           dentro[0].fim)
      };
    }).filter(Boolean);

    /* O VAZIO TEM DE DIZER QUAL VAZIO E'. "Troque a escala" so' ajuda quando existe
       algo fora da janela; com a agenda inteira vazia, mandar trocar a escala e'
       mandar procurar o que nao existe. */
    if (!grupos.length) {
      var todas = C.saidasDe(u);
      if (!todas.length) {
        return '<div class="pa-gt-sem"><b>Nenhuma saída nesta conta.</b><span>' +
          'Ligue uma pasta na ficha da conta para as levas aparecerem aqui.' +
          '</span></div>';
      }
      var perto = todas.slice().sort(function (a, b) {
        return Math.abs(C.data(a.quando) - C.HOJE) - Math.abs(C.data(b.quando) - C.HOJE);
      })[0];
      return '<div class="pa-gt-sem"><b>Nada nesta janela.</b><span>' +
        'A saída mais próxima é ' + C.dia(perto.quando) + ' de ' +
        C.data(perto.quando).getFullYear() + '. Ande no tempo arrastando o quadro, ' +
        'ou abra o Mês.</span></div>';
    }

    return '<div class="pa-gt">' +
      '<div class="pa-gt-lista">' +
        '<div class="pa-gt-cab"><span>Conta e leva</span>' +
          '<span class="pa-gt-c">Saídas</span></div>' +
        grupos.map(function (g) { return linhasDaLista(g, p); }).join('') +
      '</div>' +
      '<div class="pa-gt-quadro">' +
        regua(p) +
        '<div class="pa-gt-campo">' +
          fundo(p) +
          grupos.map(function (g) { return barras(g, p); }).join('') +
          risco(p) +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ----------------------------------------------------- o painel da esquerda
     TRES NIVEIS, como a hierarquia do ClickUp: conta, leva e PUBLICACAO. Ele pediu em
     11/09 para ver as publicacoes dentro do gantt, nem que virasse muita linha; entao
     a leva abre e cada saida do periodo ganha a linha dela. Abre e fecha pela seta,
     porque um mes de tres contas passa de noventa linhas. */
  function doPeriodo(l, p) {
    return l.itens.filter(function (s) {
      var d = C.data(s.quando);
      return d >= p.de && d <= p.ate;
    });
  }

  function linhasDaLista(g, p) {
    return '<div class="pa-gt-grupo" data-grupo="' + C.seguro(g.conta.u) + '">' +
      '<div class="pa-gt-li conta">' +
        '<svg class="pa-gt-seta" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>' +
        C.face(g.conta, 'cb-av peq') +
        '<span class="pa-gt-nome"><b>@' + C.seguro(g.conta.u) + '</b><span>' +
          g.levas.length + (g.levas.length === 1 ? ' leva' : ' levas') + '</span>' +
        '</span>' +
        '<span class="pa-gt-c"><b>' + g.feitos + '</b>/' + g.total + '</span>' +
      '</div>' +
      g.levas.map(function (l) {
        var itens = doPeriodo(l, p);
        var abre = !!abertas[l.chave];
        return '<button type="button" class="pa-gt-li leva' + (abre ? ' abre' : '') +
          '" data-leva="' + C.seguro(l.chave) + '" aria-expanded="' +
          (abre ? 'true' : 'false') + '">' +
          '<svg class="pa-gt-seta" viewBox="0 0 24 24">' +
            '<path d="m9 18 6-6-6-6"/></svg>' +
          '<span class="pa-gt-losango" style="--cor:' + C.corDe(l.conta) + '"></span>' +
          '<span class="pa-gt-nome"><b>' + C.seguro(C.maiuscula(l.nome)) +
            (l.exemplo ? ' <em class="mid-ex"></em>' : '') + '</b><span>' +
            itens.length + (itens.length === 1 ? ' saída nesta janela'
                                               : ' saídas nesta janela') +
          '</span></span>' +
          '<span class="pa-gt-c"><b>' + l.feitos + '</b>/' + l.total + '</span>' +
        '</button>' +
        (abre ? itens.map(function (s) {
          return '<div class="pa-gt-li post" data-dia="' + C.chaveDia(C.data(s.quando)) +
            '">' +
            '<span class="pa-gt-ponto' +
              (s.estado === 'programado' ? ' vem' : '') +
              '" style="--cor:' + C.corDe(s.conta) + '"></span>' +
            '<span class="pa-gt-nome"><b>' + C.seguro(C.rotulo(s)) + '</b><span>' +
              C.dia(s.quando) + ' · ' + C.hora(s.quando) + '</span></span>' +
            /* O CAMINHO DO CONTEUDO NA PROPRIA LINHA: previa sempre, Instagram para o
               que ja' foi ao ar, Drive para o que ainda esta' na fila. O estado deixa
               de precisar de pilula aqui, porque o losango ao lado ja' diz. */
            C.acoes(s, 'peq') +
          '</div>';
        }).join('') : '') +
        '';
      }).join('') +
    '</div>';
  }

  /* ------------------------------------------------------------- a linha do tempo */
  function colunas(p) {
    var fora = [], i;
    if (p.hora) {
      for (i = HORA_DE; i < HORA_ATE; i++) {
        fora.push({ rot: i + 'h', sub: '', fds: false,
                    agora: i === C.HOJE.getHours() });
      }
      return fora;
    }
    for (i = 0; i < p.dias; i++) {
      var d = new Date(p.de.getFullYear(), p.de.getMonth(), p.de.getDate() + i);
      fora.push({ rot: String(d.getDate()), sub: C.DIAS[d.getDay()],
                  fds: C.fds(d), agora: C.mesmoDia(d, C.HOJE),
                  dia: C.chaveDia(d), mes: d.getMonth(), ano: d.getFullYear() });
    }
    return fora;
  }

  function regua(p) {
    var cols = colunas(p);
    var topo;
    if (p.hora) {
      topo = '<div class="pa-gt-mes" style="width:100%"><span>' +
        p.de.getDate() + ' de ' + C.MES[p.de.getMonth()] + ' de ' +
        p.de.getFullYear() + '</span></div>';
    } else {
      var blocos = [], atual = null;
      cols.forEach(function (c) {
        var chave = c.ano + '-' + c.mes;
        if (chave !== atual) {
          atual = chave;
          blocos.push({ rot: C.MES[c.mes] + ' ' + c.ano, n: 0 });
        }
        blocos[blocos.length - 1].n++;
      });
      topo = blocos.map(function (b) {
        return '<div class="pa-gt-mes" style="width:' + pct(b.n / p.dias) + '">' +
          '<span>' + b.rot + '</span></div>';
      }).join('');
    }

    /* O DIA DA SEMANA SOME quando a coluna fica estreita: letra espremida vira borrao. */
    var miudo = !p.hora && p.dias > 16;
    return '<div class="pa-gt-regua">' +
      '<div class="pa-gt-meses">' + topo + '</div>' +
      '<div class="pa-gt-dias">' + cols.map(function (c) {
        return '<div class="pa-gt-d' + (c.fds ? ' fds' : '') +
          (c.agora ? ' hoje' : '') + '">' +
          '<b>' + c.rot + '</b>' +
          (c.sub && !miudo ? '<span>' + c.sub[0] + '</span>' : '') + '</div>';
      }).join('') + '</div>' +
    '</div>';
  }

  function fundo(p) {
    return '<div class="pa-gt-fundo">' + colunas(p).map(function (c) {
      return '<div class="pa-gt-col' + (c.fds ? ' fds' : '') +
        (c.agora ? ' hoje' : '') + '"' +
        (c.dia ? ' data-dia="' + c.dia + '"' : '') + '></div>';
    }).join('') + '</div>';
  }

  function risco(p) {
    var v = p.hora
      ? (C.HOJE.getHours() + C.HOJE.getMinutes() / 60 - HORA_DE) / (HORA_ATE - HORA_DE)
      : pos(p, C.HOJE) + passo(p) / 2;
    if (v < 0 || v > 1) return '';
    return '<div class="pa-gt-risco" style="left:' + pct(v) + '">' +
      '<span>' + (p.hora ? 'Agora' : 'Hoje') + '</span></div>';
  }

  function barras(g, p) {
    return '<div class="pa-gt-faixas">' +
      '<div class="pa-gt-faixa conta">' +
        fita(g.inicio, g.fim, p,
          '<div class="pa-gt-resumo" style="--cor:' + C.corDe(g.conta.u) + '">' +
            '<i style="width:' + Math.round(g.feitos / g.total * 100) + '%"></i>' +
          '</div>' +
          '<span class="pa-gt-rot">' +
            Math.round(g.feitos / g.total * 100) + '%</span>') +
      '</div>' +
      g.levas.map(function (l) {
        var fora = '<div class="pa-gt-faixa">' +
          fita(l.inicio, l.fim, p, corpoDaLeva(l, p)) + '</div>';
        if (!abertas[l.chave]) return fora;
        /* A LINHA DE UMA PUBLICACAO: um marco no instante dela, clicavel, que abre o
           painel daquele dia. Sem isso a saida existia na lista e nao na linha do
           tempo, que e' justamente onde ele quer ve-la. */
        return fora + doPeriodo(l, p).map(function (s) {
          var d = C.data(s.quando);
          /* O MARCO CAI NA HORA, e nao no meio do dia: dentro da coluna ele desliza
             pela fracao do relogio, entao duas saidas do mesmo dia nao se cobrem e a
             hora escrita ao lado bate com o lugar. */
          var x = p.hora ? pos(p, d)
            : pos(p, d) + passo(p) * (0.14 + 0.72 * C.fracaoHora(s.quando));
          return '<div class="pa-gt-faixa post">' +
            '<button type="button" class="pa-gt-marco' +
              (s.estado === 'programado' ? ' vem' : '') +
              (p.dias > 16 ? ' so-marca' : '') +
              '" style="left:' + pct(x) + ';--cor:' + C.corDe(s.conta) + '" ' +
              'data-dia="' + C.chaveDia(d) + '" title="' + C.hora(s.quando) + ' · ' +
              C.seguro(C.rotulo(s)) + '">' +
              '<i></i><em>' + C.hora(s.quando).replace('h', ':') + '</em></button>' +
          '</div>';
        }).join('');
      }).join('') +
    '</div>';
  }

  /* A PONTA CORTADA: leva que comeca antes da janela ou termina depois nao finge que
     cabe. A fita encosta na borda e ganha a marca de que continua. */
  function fita(de, ate, p, dentro) {
    var a = pos(p, de), b = pos(p, ate) + (p.hora ? 0 : passo(p));
    var largura = Math.max(Math.min(b, 1) - Math.max(a, 0), p.hora ? 0.02 : 0.005);
    /* O ROTULO VIRA PARA DENTRO quando a barra termina perto da borda direita: fora
       dali ele saia do quadro e fazia nascer uma rolagem que nao deveria existir. */
    var apertado = Math.max(a, 0) + largura > 0.74;
    return '<div class="pa-gt-fita' + (a < 0 ? ' corta-esq' : '') +
      (b > 1 ? ' corta-dir' : '') + (apertado ? ' rot-dentro' : '') +
      '" style="left:' + pct(a) + ';width:' + pct(largura) + '">' + dentro + '</div>';
  }

  /* A BARRA DA LEVA TEM BURACO: dia sem saida dentro do periodo vira corte, e a agenda
     furada aparece como falha na barra. O bloco quebra tambem na fronteira de hoje,
     para o que ainda nao foi ao ar nao parecer feito. */
  function corpoDaLeva(l, p) {
    var a = Math.max(pos(p, l.inicio), 0);
    var b = Math.min(pos(p, l.fim) + (p.hora ? 0 : passo(p)), 1);
    var vao = Math.max(b - a, 0.0001);

    if (p.hora) {
      /* Na escala de horas cada saida e' um pino no relogio, e nao um bloco de dia. */
      return '<div class="pa-gt-barra fina" style="--cor:' + C.corDe(l.conta) + '">' +
        '<span class="pa-gt-trilho"></span>' +
        l.itens.map(function (s) {
          var x = (pos(p, C.data(s.quando)) - a) / vao;
          return '<span class="pa-gt-pino' +
            (s.estado === 'programado' ? ' vem' : '') + '" style="left:' + pct(x) +
            '" title="' + C.hora(s.quando) + ' · ' + C.seguro(C.rotulo(s)) +
            '"></span>';
        }).join('') + '</div>' +
        '<span class="pa-gt-rot">' + l.feitos + ' de ' + l.total + '</span>';
    }

    var blocos = [], aberto = null;
    var d0 = new Date(l.inicio.getFullYear(), l.inicio.getMonth(), l.inicio.getDate());
    var d1 = new Date(l.fim.getFullYear(), l.fim.getMonth(), l.fim.getDate());
    for (var d = d0; d <= d1;
         d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      if (d < p.de || d > p.ate) continue;
      var tem = !!l.dias[C.chaveDia(d)];
      var vem = d > C.HOJE;
      if (tem && aberto && aberto.vem === vem) {
        aberto.ate = new Date(d.getTime());
      } else {
        if (aberto) { blocos.push(aberto); aberto = null; }
        if (tem) {
          aberto = { de: new Date(d.getTime()), ate: new Date(d.getTime()), vem: vem };
        }
      }
    }
    if (aberto) blocos.push(aberto);

    var pedacos = blocos.map(function (bl) {
      var x = (pos(p, bl.de) - a) / vao;
      var w = (pos(p, bl.ate) + passo(p) - pos(p, bl.de)) / vao;
      return '<span class="pa-gt-bloco' + (bl.vem ? ' vem' : '') +
        '" style="left:' + pct(x) + ';width:' + pct(w) + '"></span>';
    }).join('');
    return '<div class="pa-gt-barra" style="--cor:' + C.corDe(l.conta) + '">' +
      pedacos + '</div>' +
      '<span class="pa-gt-rot">' + l.feitos + ' de ' + l.total + '</span>';
  }

  /* ------------------------------------------------------------------ eventos */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ir]');
    if (b) {
      if (b.dataset.ir === 'hoje') {
        /* O BOTAO HOJE TEM DE DEVOLVER RESPOSTA. Antes, quem ja' estava em setembro
           clicava e nada mudava na tela. Agora o dia pisca tres vezes. */
        mes = new Date(C.HOJE.getFullYear(), C.HOJE.getMonth(), 1);
        piscar = C.chaveDia(C.HOJE);
      } else {
        mes = new Date(mes.getFullYear(), mes.getMonth() + Number(b.dataset.ir), 1);
      }
      pintar();
      return;
    }
    var s = e.target.closest('[data-escala]');
    if (s && s.dataset.escala !== escala) { escala = s.dataset.escala; pintar(); return; }
    var lv = e.target.closest('[data-leva]');
    if (lv) {
      var k = lv.dataset.leva;
      if (abertas[k]) delete abertas[k]; else abertas[k] = true;
      pintar();
      return;
    }
    var an = e.target.closest('[data-andar]');
    if (an) {
      var n = Number(an.dataset.andar);
      /* A SETA ANDA MEIA JANELA, e nao uma inteira: pulando o periodo todo, perde-se a
         emenda entre o que estava na tela e o que entrou. */
      desloc = n === 0 ? 0
        : desloc + n * Math.max(Math.round(daEscala().dias / 2), 1);
      pintar();
    }
  });

  /* ---------------------------------------------------------------- o arrasto
     ARRASTAR O QUADRO ANDA NO TEMPO. Como a linha do tempo cabe inteira na largura,
     nao ha' rolagem para levar o periodo: o arrasto converte os pixels percorridos em
     DIAS e desloca a janela. Um dia de deslocamento por coluna percorrida.

     So' o botao esquerdo, e so' fora dos botoes: arrastar comecando num marco tem de
     continuar sendo um clique nele. */
  (function ligarArrasto() {
    var pegando = null;

    document.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      var campo = e.target.closest('.pa-gt-campo');
      if (!campo || e.target.closest('button,a')) return;
      var cols = daEscala().dias;
      pegando = {
        x: e.clientX, base: desloc,
        porDia: campo.getBoundingClientRect().width / cols
      };
      campo.classList.add('arrastando');
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!pegando) return;
      var dias = Math.round((pegando.x - e.clientX) / pegando.porDia);
      if (pegando.base + dias === desloc) return;
      desloc = pegando.base + dias;
      pintar();
      var campo = document.querySelector('.pa-gt-campo');
      if (campo) campo.classList.add('arrastando');
    });

    document.addEventListener('mouseup', function () {
      if (!pegando) return;
      pegando = null;
      var campo = document.querySelector('.pa-gt-campo');
      if (campo) campo.classList.remove('arrastando');
    });
  })();

  document.addEventListener('DOMContentLoaded', function () {
    C.ligarCasca();
    pintar();
  });
})();
