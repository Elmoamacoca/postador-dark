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
  var HOJE = new Date(D.hoje || '2026-09-10T12:00:00');
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
  /* O RESUMO QUE O CALENDARIO RESPONDE: quanto ja' saiu, quanto vem, e quantos dias
     dos proximos catorze estao vazios. O buraco e' o que a tela existe para achar. */
  function resumo(u) {
    var lista = saidasDe(u);
    var saiu = lista.filter(function (s) { return s.estado === 'publicado'; }).length;
    var vem = lista.filter(function (s) { return s.estado === 'programado'; }).length;
    var mapa = porDia(u), vazios = 0, proximo = null;
    for (var i = 0; i < 14; i++) {
      var d = new Date(HOJE.getFullYear(), HOJE.getMonth(), HOJE.getDate() + i);
      var doDia = (mapa[chaveDia(d)] || []).filter(function (s) {
        return s.estado === 'programado';
      });
      if (!doDia.length) { vazios++; if (!proximo) proximo = d; }
    }
    return { saiu: saiu, vem: vem, vazios: vazios, primeiroVazio: proximo };
  }

  /* ------------------------------------------------- as duas visoes da mesma aba
     A DECISAO DE 10/09, segunda rodada: o calendario nao escolhe entre mes e gantt,
     ele tem os dois, no mesmo lugar, sobre a mesma conta. Mes responde "que dia",
     gantt responde "em que ritmo". Trocar de visao nao troca de conta nem de mes. */
  var visao = 'mes';

  function abas() {
    return '<div class="cl-visao" role="tablist">' +
      [['mes', 'Mês', icoMes()], ['gantt', 'Gantt', icoGantt()]].map(function (v) {
        return '<button type="button" role="tab" data-visao="' + v[0] + '"' +
          ' aria-selected="' + (visao === v[0] ? 'true' : 'false') + '"' +
          (visao === v[0] ? ' class="on"' : '') + '>' + v[2] + v[1] + '</button>';
      }).join('') + '</div>';
  }
  function icoMes() {
    return '<svg viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="16" ' +
      'rx="2.4"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>';
  }
  function icoGantt() {
    return '<svg viewBox="0 0 24 24"><path d="M4 6.5h9M4 12h15M4 17.5h6"/></svg>';
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

  function seletor() {
    var c = escolhida === REDE ? null : contaDe(escolhida);
    return '<div class="cl-sel" id="cl-sel">' +
      '<button class="cl-sel-bt" type="button" id="cl-sel-bt" aria-haspopup="listbox" ' +
      'aria-expanded="false">' +
        (c ? face(c, 'cl-av') : '<span class="cl-av cl-rede">' + icoRede() + '</span>') +
        '<span class="cl-sel-txt"><b>' + (c ? '@' + seguro(c.u) : 'Toda A Rede') +
        '</b><span>' + (c ? (c.mercado ? seguro(maiuscula(c.mercado))
                                       : 'Sem Mercado Definido')
                          : CONTAS.length + ' Contas Ligadas') + '</span></span>' +
        '<svg class="cl-sel-cv" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>' +
      '</button>' +
      '<div class="cl-sel-cx" id="cl-sel-cx" hidden>' +
        '<label class="cl-sel-busca"><svg viewBox="0 0 24 24">' +
          '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
          '<input type="text" id="cl-sel-q" placeholder="Buscar conta pelo arroba" ' +
          'autocomplete="off" spellcheck="false"></label>' +
        '<div class="cl-sel-lista" id="cl-sel-lista" role="listbox"></div>' +
      '</div></div>';
  }

  function face(c, classe) {
    return c.avatar
      ? '<img class="' + classe + '" src="' + seguro(c.avatar) + '" alt="">'
      : '<span class="' + classe + '" style="background:' + corDe(c.u) + '">' +
        seguro(c.u.slice(0, 2).toUpperCase()) + '</span>';
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
      return '<button type="button" class="cl-op' +
        (c.u === escolhida ? ' on' : '') + (i === marcado ? ' marcado' : '') +
        '" data-conta="' + seguro(c.u) + '" role="option">' +
        (c.u === REDE ? '<span class="cl-av cl-rede">' + icoRede() + '</span>'
                      : face(c, 'cl-av')) +
        '<span class="cl-op-txt"><b>' +
        (c.u === REDE ? 'Toda A Rede' : '@' + seguro(c.u)) + '</b>' +
        '<span>' + (c.u === REDE ? CONTAS.length + ' contas'
          : (c.mercado ? seguro(maiuscula(c.mercado)) : 'Sem mercado definido')) +
        '</span></span><span class="cl-op-n">' + quantas + '</span></button>';
    }).join('') : '<div class="cl-op-sem">Nenhuma conta com esse nome.</div>';
  }

  function abrirSeletor(abre) {
    var cx = document.getElementById('cl-sel-cx');
    var bt = document.getElementById('cl-sel-bt');
    if (!cx) return;
    aberto = abre;
    cx.hidden = !abre;
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
      var alvo = document.querySelector('.cl-op.marcado');
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

    peek.innerHTML =
      '<div class="cl-peek-cab">' +
        '<div class="cl-peek-quem"><b>' + d.getDate() + ' De ' + MES[d.getMonth()] +
        '</b><span>' + DIAS[d.getDay()] + ' · ' +
        (lista.length ? lista.length + (lista.length === 1 ? ' saída' : ' saídas')
                      : 'Nada marcado') + '</span></div>' +
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

  function linhaDoDia(s) {
    var c = contaDe(s.conta);
    return '<div class="cl-li' + (s.estado === 'programado' ? ' vem' : '') + '">' +
      '<span class="cl-li-hora">' + hora(s.quando) + '</span>' +
      (s.capa != null
        ? '<span class="cl-li-capa"><img src="' + capa(s.capa) + '" alt=""></span>'
        : '<span class="cl-li-capa sem"></span>') +
      '<span class="cl-li-txt"><b>' + seguro(pedaco(s.titulo, 42)) + '</b>' +
        '<span><i style="background:' + corDe(s.conta) + '"></i>@' +
        seguro(s.conta) + (s.nome ? ' · ' + seguro(pedaco(s.nome, 22)) : '') +
        (s.exemplo ? ' <em class="mid-ex" title="Exemplo"></em>' : '') +
        '</span></span>' +
      '<span class="cl-li-dir">' + (s.estado === 'publicado'
        ? (s.vis != null ? '<b>' + curto(s.vis) + '</b><span>Visualizações</span>'
                         : '<span class="mid-pin foi"><i></i>Foi Ao Ar</span>')
        : '<span class="mid-pin marcado"><i></i>Marcado</span>') + '</span>' +
    '</div>';
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
    abas: abas, visao: function () { return visao; },
    faixa: faixa, fds: fds, fracaoHora: fracaoHora, semanas: semanas,
    seletor: seletor, escolhida: function () { return escolhida; },
    abrirDia: abrirDia, linhaDoDia: linhaDoDia, torrada: torrada,
    ligarCasca: ligarCasca
  };
})();
