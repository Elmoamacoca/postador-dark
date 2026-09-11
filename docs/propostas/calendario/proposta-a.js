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

    if (!grupos.length) {
      return '<div class="pa-gt-sem">Nada nesta janela. Troque a escala ali em cima.' +
        '</div>';
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
