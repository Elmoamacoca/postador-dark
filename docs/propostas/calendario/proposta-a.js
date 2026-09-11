/* ============================================== PROPOSTA A: A PAUTA (v3)

   ELE ESCOLHEU ESTA em 11/09 e apontou seis defeitos. O que mudou:

   1. OS INDICADORES. "Já Saíram" e "Marcados" nao sao nome de indicador. Agora sao
      Publicados, Agendados, Cadência e Cobertura, os quatro na MESMA janela de catorze
      dias, cada um com valor, unidade e periodo.
   2. O BOTAO HOJE devolve resposta: volta ao mes de hoje e o dia pisca tres vezes.
   3. O PAINEL DO DIA leva ao Drive, na pasta daquele corte.
   4. O PAINEL DO DIA foi redesenhado: a hora virou ancora com fio de agenda.
   5. O GANTT virou gantt. O de antes era o mes deitado; este segue o molde do
      ClickUp: lista hierarquica a esquerda, regua de dois niveis, barra por LEVA com
      progresso, barra de resumo por conta e o risco de hoje atravessando tudo.
   6. O SELETOR DE CONTA virou controle de barra, e nao cartao solto.
   ========================================================================== */
(function () {
  var C = window.CAL;
  var mes = new Date(C.HOJE.getFullYear(), C.HOJE.getMonth(), 1);
  var escala = 'semana';                       /* semana | mes */
  var piscar = null;                           /* dia a piscar depois de pintar */

  window.CAL_PINTAR = pintar;

  function pintar() {
    var u = C.escolhida();
    var palco = document.getElementById('cal-palco');
    var noMes = C.visao() === 'mes';

    palco.innerHTML =
      indicadores(u) +
      '<div class="caixa solta pa-caixa">' +
        barra(noMes) +
        (noMes ? grade(u) : gantt(u)) +
      '</div>';

    /* O GANTT NASCE EM HOJE, e nao trinta dias atras: quem abre quer saber o que vem. */
    if (!noMes) {
      var rolo = palco.querySelector('.pa-gt-rolo');
      var col = palco.querySelector('.pa-gt-d.hoje');
      if (rolo && col) {
        rolo.scrollLeft = Math.max(col.offsetLeft - rolo.clientWidth * 0.34, 0);
      }
    }

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
     CADA DESENHO AQUI TEM DENOMINADOR. Barra sempre cheia e' enfeite: os dois
     primeiros mostram a DISTRIBUICAO dos catorze dias, dia a dia, e os dois ultimos
     mostram uma PROPORCAO que existe de verdade. */
  function indicadores(u) {
    var r = C.resumo(u);
    var antes = serie(u, -14, -1), frente = serie(u, 0, 13);
    var pico = Math.max.apply(null, antes.concat(frente).concat([1]));

    return '<div class="pa-kpis">' +
      cartao('Publicados', String(r.publicados), '',
        'Últimos 14 dias · pico de ' + pico + ' num dia',
        faisca(antes, pico, 'neutro')) +
      cartao('Agendados', String(r.agendados), '',
        r.folego != null && r.folego > 0
          ? 'Próximos 14 dias · fôlego de ' + r.folego + ' dias no ritmo atual'
          : 'Próximos 14 dias',
        faisca(frente, pico, 'vem')) +
      cartao('Cadência', r.cadencia.toFixed(1).replace('.', ','), 'por dia',
        'Média dos últimos 14 dias, contra o pico de ' + pico,
        barrinha(r.cadencia / pico, 'neutro')) +
      cartao('Cobertura',
        r.cobertos + '<span class="pa-k-de">/' + r.janela + '</span>', 'dias',
        r.vazios
          ? r.vazios + (r.vazios === 1 ? ' dia sem publicação, em '
                                       : ' dias sem publicação, o primeiro em ') +
            C.dia(C.chaveDia(r.primeiroVazio))
          : 'Nenhum dia sem publicação',
        barrinha(r.cobertos / r.janela, r.vazios ? 'mau' : 'bom'),
        r.vazios ? 'mau' : '') +
    '</div>';
  }

  function cartao(rot, valor, uni, pe, desenho, tom) {
    return '<div class="pa-k' + (tom ? ' ' + tom : '') + '">' +
      '<span class="pa-k-rot">' + rot + '</span>' +
      '<span class="pa-k-val"><b>' + valor + '</b>' +
        (uni ? '<em>' + uni + '</em>' : '') + '</span>' +
      desenho + '<span class="pa-k-pe">' + pe + '</span></div>';
  }

  function serie(u, de, ate) {
    var mapa = C.porDia(u), fora = [];
    C.faixa(de, ate).forEach(function (d) {
      fora.push((mapa[C.chaveDia(d)] || []).length);
    });
    return fora;
  }
  /* O DIA VAZIO E' UM TRACO NO CHAO, e nao um buraco: buraco na serie some e a conta
     de catorze dias deixa de fechar a olho. */
  function faisca(vals, pico, tom) {
    return '<span class="pa-k-faisca ' + tom + '">' + vals.map(function (v) {
      return '<i class="' + (v ? '' : 'zero') + '" style="height:' +
        (v ? Math.max(Math.round(v / pico * 100), 16) : 0) + '%"></i>';
    }).join('') + '</span>';
  }
  function barrinha(fracao, tom) {
    return '<span class="pa-k-barra ' + tom + '"><i style="width:' +
      Math.max(Math.round(fracao * 100), 2) + '%"></i></span>';
  }

  /* ------------------------------------------------------------------ a barra */
  function barra(noMes) {
    return '<div class="pa-barra">' + C.seletor() + '<i class="pa-div"></i>' +
      C.abas() + '<div class="pa-barra-dir">' +
      (noMes
        ? '<button class="pa-hoje" type="button" data-ir="hoje">Hoje</button>' +
          '<span class="pa-nav">' +
            '<button type="button" data-ir="-1" aria-label="Mês anterior">' +
              '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>' +
            '<button type="button" data-ir="1" aria-label="Próximo mês">' +
              '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>' +
          '</span>' +
          '<b class="pa-titulo">' + C.MES[mes.getMonth()] + ' De ' +
            mes.getFullYear() + '</b>'
        : '<span class="pa-escala">' +
            [['semana', 'Semana'], ['mes', 'Mês']].map(function (e) {
              return '<button type="button" data-escala="' + e[0] + '"' +
                (escala === e[0] ? ' class="on"' : '') + '>' + e[1] + '</button>';
            }).join('') + '</span>') +
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

     O DE ANTES NAO ERA UM GANTT: era o mes deitado, com o dia virando coluna e o
     conteudo do dia dentro dela. Gantt precisa de coisa COM DURACAO, e a unica coisa
     com duracao aqui e' a LEVA: ela comeca, termina e tem progresso.

     O MOLDE E' O DO CLICKUP, conferido na documentacao deles em 11/09:
     dois paineis (lista a esquerda, linha do tempo a direita); regua de dois niveis,
     mes em cima e dia embaixo; escala trocavel; barra por item, do inicio ao fim;
     barra de resumo no grupo, indo do menor inicio ao maior fim, com o percentual de
     concluido; fim de semana sombreado; e o risco vertical de hoje.

     O QUE NAO COPIEI: dependencia entre barras. Uma publicacao nao espera a outra, e
     seta entre elas seria enfeite mentindo sobre o sistema.
     ====================================================================== */
  /* A JANELA E' FIXA: trinta dias para tras, vinte e um para frente. Sem ela, as oito
     publicacoes reais de JUNHO esticavam o quadro ate' junho e abriam dois meses de
     branco no meio. Gantt trabalha em janela, e quem comeca antes dela aparece com a
     ponta cortada. */
  var G_DE = -30, G_ATE = 21;

  function gantt(u) {
    var dias = C.faixa(G_DE, G_ATE);
    var limite = { de: dias[0], ate: dias[dias.length - 1] };
    var grupos = C.gruposDeLeva(u).map(function (g) {
      var dentro = g.levas.filter(function (l) {
        return l.fim >= limite.de && l.inicio <= limite.ate;
      });
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
      return '<div class="pa-gt-sem">Nenhuma leva neste período.</div>';
    }
    var largura = escala === 'semana' ? 40 : 15;   /* pixels por dia */
    var total = dias.length * largura;

    return '<div class="pa-gt">' +
      '<div class="pa-gt-lista">' +
        '<div class="pa-gt-cab"><span>Conta e leva</span>' +
          '<span class="pa-gt-c">Saídas</span></div>' +
        grupos.map(linhasDaLista).join('') +
      '</div>' +
      '<div class="pa-gt-rolo"><div class="pa-gt-quadro" style="width:' + total +
        'px">' +
        regua(dias, largura) +
        '<div class="pa-gt-campo">' +
          fundo(dias, largura) +
          grupos.map(function (g) { return barras(g, dias, largura); }).join('') +
          risco(dias, largura) +
        '</div>' +
      '</div></div>' +
    '</div>';
  }

  function indice(dias, d) {
    var um = 86400000;
    var base = new Date(dias[0].getFullYear(), dias[0].getMonth(), dias[0].getDate());
    var alvo = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((alvo - base) / um);
  }
  function preso(dias, d) {
    return Math.max(0, Math.min(dias.length - 1, indice(dias, d)));
  }

  /* ----------------------------------------------------- o painel da esquerda */
  function linhasDaLista(g) {
    return '<div class="pa-gt-grupo" data-grupo="' + C.seguro(g.conta.u) + '">' +
      '<div class="pa-gt-li conta">' +
        '<svg class="pa-gt-seta" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>' +
        C.face(g.conta, 'cl-av') +
        '<span class="pa-gt-nome"><b>@' + C.seguro(g.conta.u) + '</b><span>' +
          g.levas.length + (g.levas.length === 1 ? ' leva' : ' levas') + '</span>' +
        '</span>' +
        '<span class="pa-gt-c"><b>' + g.feitos + '</b>/' + g.total + '</span>' +
      '</div>' +
      g.levas.map(function (l) {
        return '<div class="pa-gt-li leva" data-leva="' + C.seguro(l.chave) + '">' +
          '<span class="pa-gt-losango" style="--cor:' + C.corDe(l.conta) + '"></span>' +
          '<span class="pa-gt-nome"><b>' + C.seguro(C.maiuscula(l.nome)) +
            (l.exemplo ? ' <em class="mid-ex"></em>' : '') + '</b><span>' +
            C.dia(C.chaveDia(l.inicio)) + ' a ' + C.dia(C.chaveDia(l.fim)) +
          '</span></span>' +
          '<span class="pa-gt-c"><b>' + l.feitos + '</b>/' + l.total + '</span>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  /* ------------------------------------------------------------- a linha do tempo */
  function regua(dias, largura) {
    var meses = [], atual = null;
    dias.forEach(function (d) {
      var chave = d.getFullYear() + '-' + d.getMonth();
      if (chave !== atual) {
        atual = chave;
        meses.push({ rot: C.MES[d.getMonth()] + ' ' + d.getFullYear(), n: 0 });
      }
      meses[meses.length - 1].n++;
    });

    return '<div class="pa-gt-regua">' +
      '<div class="pa-gt-meses">' + meses.map(function (m) {
        return '<div class="pa-gt-mes" style="width:' + (m.n * largura) + 'px">' +
          '<span>' + m.rot + '</span></div>';
      }).join('') + '</div>' +
      '<div class="pa-gt-dias">' + dias.map(function (d) {
        var hoje = C.mesmoDia(d, C.HOJE);
        if (escala === 'mes') {
          /* NA ESCALA DE MES so' a segunda-feira leva rotulo: vinte e oito numeros em
             treze pixels vira borrao. */
          return '<div class="pa-gt-d' + (C.fds(d) ? ' fds' : '') +
            (hoje ? ' hoje' : '') + '" style="width:' + largura + 'px">' +
            (d.getDay() === 1 ? '<b>' + d.getDate() + '</b>' : '') + '</div>';
        }
        return '<div class="pa-gt-d' + (C.fds(d) ? ' fds' : '') +
          (hoje ? ' hoje' : '') + '" style="width:' + largura + 'px">' +
          '<b>' + d.getDate() + '</b><span>' + C.DIAS[d.getDay()][0] + '</span></div>';
      }).join('') + '</div>' +
    '</div>';
  }

  function fundo(dias, largura) {
    return '<div class="pa-gt-fundo">' + dias.map(function (d) {
      return '<div class="pa-gt-col' + (C.fds(d) ? ' fds' : '') +
        (C.mesmoDia(d, C.HOJE) ? ' hoje' : '') + '" style="width:' + largura +
        'px" data-dia="' + C.chaveDia(d) + '"></div>';
    }).join('') + '</div>';
  }

  function risco(dias, largura) {
    var x = (indice(dias, C.HOJE) + 0.5) * largura;
    return '<div class="pa-gt-risco" style="left:' + x + 'px">' +
      '<span>Hoje</span></div>';
  }

  function barras(g, dias, largura) {
    return '<div class="pa-gt-faixas">' +
      /* A BARRA DE RESUMO DA CONTA: do menor inicio ao maior fim de tudo que esta'
         dentro, com o percentual concluido. E' o rollup do ClickUp. */
      '<div class="pa-gt-faixa conta">' +
        fita(g.inicio, g.fim, dias, largura,
          '<div class="pa-gt-resumo" style="--cor:' + C.corDe(g.conta.u) + '">' +
            '<i style="width:' + Math.round(g.feitos / g.total * 100) + '%"></i>' +
          '</div>' +
          '<span class="pa-gt-rot">' +
            Math.round(g.feitos / g.total * 100) + '%</span>') +
      '</div>' +
      g.levas.map(function (l) {
        return '<div class="pa-gt-faixa">' +
          fita(l.inicio, l.fim, dias, largura, corpoDaLeva(l, dias, largura)) +
        '</div>';
      }).join('') +
    '</div>';
  }

  /* A PONTA CORTADA. Leva que comeca antes da janela ou termina depois dela nao pode
     fingir que cabe: a fita encosta na borda e ganha a marca de que continua. */
  function fita(de, ate, dias, largura, dentro) {
    var i = preso(dias, de), f = preso(dias, ate);
    var antes = indice(dias, de) < 0;
    var depois = indice(dias, ate) > dias.length - 1;
    return '<div class="pa-gt-fita' + (antes ? ' corta-esq' : '') +
      (depois ? ' corta-dir' : '') + '" style="left:' + (i * largura) +
      'px;width:' + ((f - i + 1) * largura) + 'px">' + dentro + '</div>';
  }

  /* A BARRA DA LEVA TEM BURACO. Dia sem saida dentro do periodo da leva vira corte na
     barra: e' assim que uma agenda furada aparece num gantt, e e' a pergunta que esta
     tela existe para responder. */
  function corpoDaLeva(l, dias, largura) {
    var i0 = preso(dias, l.inicio), i1 = preso(dias, l.fim);
    /* O BLOCO QUEBRA EM DOIS LUGARES: no dia sem saida, que e' o buraco de agenda, e
       na fronteira de hoje, para o que ainda nao foi ao ar nao aparecer como feito. */
    var blocos = [], aberto = null;
    for (var i = i0; i <= i1; i++) {
      var d = dias[i];
      var tem = !!l.dias[C.chaveDia(d)];
      var vem = d > C.HOJE;
      if (tem && aberto && aberto.vem === vem) {
        aberto.ate = i;
      } else {
        if (aberto) { blocos.push(aberto); aberto = null; }
        if (tem) aberto = { de: i, ate: i, vem: vem };
      }
    }
    if (aberto) blocos.push(aberto);
    var pedacos = blocos.map(function (b) {
      return '<span class="pa-gt-bloco' + (b.vem ? ' vem' : '') +
        '" style="left:' + ((b.de - i0) * largura) + 'px;width:' +
        ((b.ate - b.de + 1) * largura) + 'px"></span>';
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
    if (s && s.dataset.escala !== escala) { escala = s.dataset.escala; pintar(); }
  });

  document.addEventListener('DOMContentLoaded', function () {
    C.ligarCasca();
    pintar();
  });
})();
