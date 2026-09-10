/* ===================================================== PROPOSTA A: A PAUTA

   A DECISAO DESTA PROPOSTA: tirar a miniatura de dentro da grade. Corte de podcast
   e' escuro; miniatura de 26 pixels vira um retangulo preto, e tres lado a lado com
   a hora em tarja por cima viram uma faixa de sujeira. Foi isso que ficou horroroso
   na primeira rodada. Aqui cada saida e' uma LINHA: risco na cor da conta, hora e
   nome curto. A capa continua existindo, mas no painel do dia, onde ela tem tamanho.

   OS DOIS MODOS: `Mês` responde "que dia", `Gantt` responde "em que ritmo". Trocar de
   modo nao troca de conta.

   O QUE ELA CUSTA: e' a menos visual das tres. Quem quer reconhecer o video pela
   imagem tem de abrir o dia.
   ========================================================================== */
(function () {
  var C = window.CAL;
  var mes = new Date(C.HOJE.getFullYear(), C.HOJE.getMonth(), 1);
  var DE = -13, ATE = 14;                      /* a faixa do gantt, em volta de hoje */

  window.CAL_PINTAR = pintar;

  function pintar() {
    var u = C.escolhida();
    var r = C.resumo(u);
    var palco = document.getElementById('cal-palco');
    var noMes = C.visao() === 'mes';

    palco.innerHTML =
      '<div class="pa-topo">' + C.seletor() + C.abas() +
        '<div class="pa-nums">' +
          num(r.saiu, 'Já Saíram') + num(r.vem, 'Marcados', 'vem') +
          num(r.vazios, 'Dias Vazios Nos Próximos 14', r.vazios ? 'mau' : '') +
        '</div>' +
      '</div>' +
      '<div class="caixa solta pa-caixa">' +
        (noMes ? barraMes() + grade(u) : barraGantt(u) + gantt(u)) +
      '</div>';

    if (!noMes && u === C.REDE) nascerNoHoje(palco);
  }

  function num(valor, rot, tom) {
    return '<div class="pa-n' + (tom ? ' ' + tom : '') + '"><b>' + valor + '</b>' +
      '<span>' + rot + '</span></div>';
  }

  function legenda() {
    return '<div class="cl-legenda">' +
      '<span class="cl-lg"><i style="background:var(--soft)"></i>Já Saiu</span>' +
      '<span class="cl-lg"><i style="background:var(--accent)"></i>Marcado</span>' +
      '<span class="cl-lg tracado"><i></i>Dia Vazio</span></div>';
  }

  function barraMes() {
    return '<div class="pa-barra">' +
      '<button class="bt mini" type="button" data-ir="hoje">Hoje</button>' +
      '<button class="pa-seta" type="button" data-ir="-1" aria-label="Mês anterior">' +
        '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>' +
      '<button class="pa-seta" type="button" data-ir="1" aria-label="Próximo mês">' +
        '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>' +
      '<b class="pa-titulo">' + C.MES[mes.getMonth()] + ' De ' + mes.getFullYear() +
      '</b>' + legenda() + '</div>';
  }

  function barraGantt(u) {
    /* O TITULO TEM DE DIZER O QUE ESTA' NA TELA. Por semanas o quadro comeca no
       domingo anterior e termina no sabado seguinte, e nao nos dias soltos da faixa. */
    var a, b;
    if (u === C.REDE) {
      a = C.faixa(DE, DE)[0];
      b = C.faixa(ATE, ATE)[0];
    } else {
      var sems = C.semanas(DE, ATE);
      a = sems[0][0];
      b = sems[sems.length - 1][6];
    }
    return '<div class="pa-barra">' +
      '<b class="pa-titulo">' + a.getDate() + ' De ' + C.MES[a.getMonth()] + ' A ' +
        b.getDate() + ' De ' + C.MES[b.getMonth()] + '</b>' +
      '<span class="pa-sub">' + (u === C.REDE ? 'Uma raia por conta, dia a dia'
        : 'Uma raia por semana, para bater segunda contra segunda') + '</span>' +
      legenda() + '</div>';
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
      /* SEMANA INTEIRA DE OUTRO MES NAO ENTRA. A ultima fileira do mes passado era
         uma faixa de 112 pixels de nada, e faixa de nada e' o que deixa a tela feia. */
      if (vivos) semanas.push(linha.join(''));
    }
    return '<div class="pa-dias">' +
        C.DIAS.map(function (x) { return '<span>' + x + '</span>'; }).join('') +
      '</div><div class="pa-grade">' + semanas.join('') + '</div>';
  }

  function celula(d, lista) {
    var deFora = d.getMonth() !== mes.getMonth();
    var hoje = C.mesmoDia(d, C.HOJE);
    var futuro = d > C.HOJE;
    var vazio = futuro && !lista.length && !deFora;
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

  /* A LINHA E' A PECA DESTA PROPOSTA: risco da conta, hora e nome. O passado fica
     neutro e o futuro leva a cor da casa, porque o que importa e' o que ainda da'
     para mudar. */
  function item(s) {
    return '<span class="pa-li' + (s.estado === 'programado' ? ' vem' : '') + '">' +
      '<i style="background:' + C.corDe(s.conta) + '"></i>' +
      '<b>' + C.hora(s.quando).replace('h', ':') + '</b>' +
      '<span>' + C.seguro(C.rotulo(s)) + '</span>' +
      (s.exemplo ? '<em class="mid-ex"></em>' : '') + '</span>';
  }

  /* ----------------------------------------------------------------- o gantt
     COM A REDE, a raia e' a conta e os dias correm para a direita. COM UMA CONTA, a
     raia e' a semana: uma tira sozinha no meio do branco foi o defeito da rodada
     passada, e semana contra semana e' o que responde "o ritmo caiu?". */
  function gantt(u) {
    return u === C.REDE ? porContas(u) : porSemanas(u);
  }

  function porSemanas(u) {
    var mapa = C.porDia(u);
    var sems = C.semanas(DE, ATE);
    var pico = 1;
    var totais = sems.map(function (dias) {
      var t = 0;
      dias.forEach(function (d) { t += (mapa[C.chaveDia(d)] || []).length; });
      pico = Math.max(pico, t);
      return t;
    });

    return '<div class="pa-s">' +
      '<div class="pa-s-linha pa-s-regua"><div class="pa-s-quem"></div>' +
        C.DIAS.map(function (x) {
          return '<div class="pa-s-rot">' + x + '</div>';
        }).join('') + '</div>' +
      sems.map(function (dias, i) {
        var agora = dias.some(function (d) { return C.mesmoDia(d, C.HOJE); });
        return '<div class="pa-s-linha' + (agora ? ' agora' : '') + '">' +
          '<div class="pa-s-quem">' +
            '<b>' + dias[0].getDate() + ' ' + C.MES3[dias[0].getMonth()] + ' a ' +
              dias[6].getDate() + ' ' + C.MES3[dias[6].getMonth()] + '</b>' +
            (agora ? '<em>Esta Semana</em>' : '') +
            '<span class="pa-s-vol"><i style="width:' +
              Math.round(totais[i] / pico * 100) + '%"></i></span>' +
            '<span class="pa-s-t">' + totais[i] +
              (totais[i] === 1 ? ' saída' : ' saídas') + '</span>' +
          '</div>' +
          dias.map(function (d) {
            return celulaSemana(d, mapa[C.chaveDia(d)] || []);
          }).join('') + '</div>';
      }).join('') + '</div>';
  }

  function celulaSemana(d, lista) {
    var vazio = d > C.HOJE && !lista.length;
    lista = lista.slice().sort(function (a, b) {
      return new Date(a.quando) - new Date(b.quando);
    });
    return '<button type="button" class="pa-s-cel' + (C.fds(d) ? ' fds' : '') +
      (C.mesmoDia(d, C.HOJE) ? ' hoje' : '') + '" data-dia="' + C.chaveDia(d) + '">' +
      '<span class="pa-num">' + d.getDate() + '</span>' +
      (lista.length
        ? '<span class="pa-lista">' + lista.slice(0, 3).map(item).join('') +
          (lista.length > 3
            ? '<span class="pa-mais">Mais ' + (lista.length - 3) + '</span>' : '') +
          '</span>'
        : (vazio ? '<span class="pa-slot">Sem Nada</span>' : '')) +
    '</button>';
  }

  function porContas(u) {
    var contas = C.CONTAS;
    var dias = C.faixa(DE, ATE);
    var mapa = C.porDia(u);
    var pico = 1;
    dias.forEach(function (d) {
      pico = Math.max(pico, (mapa[C.chaveDia(d)] || []).length);
    });

    return '<div class="pa-g"><div class="pa-g-rolo"><div class="pa-g-quadro">' +
      regua(dias) + volume(dias, mapa, pico) +
      contas.map(function (c) { return raia(c, dias); }).join('') +
    '</div></div></div>';
  }

  function regua(dias) {
    return '<div class="pa-g-linha pa-g-regua"><div class="pa-g-quem"></div>' +
      dias.map(function (d) {
        var virada = d.getDate() === 1;
        return '<div class="pa-g-dia' + (C.mesmoDia(d, C.HOJE) ? ' hoje' : '') +
          (C.fds(d) ? ' fds' : '') + '">' +
          '<b>' + d.getDate() + '</b><span>' + C.DIAS[d.getDay()] + '</span>' +
          (virada ? '<em>' + C.MES3[d.getMonth()] + '</em>' : '') + '</div>';
      }).join('') + '</div>';
  }

  /* A FAIXA DE VOLUME e' o que faz o gantt de UMA conta valer a pena: com uma raia
     so', a tira ficava perdida no branco. Aqui a altura da barra ja' conta o ritmo
     antes de ler qualquer nome. */
  function volume(dias, mapa, pico) {
    return '<div class="pa-g-linha pa-g-vol">' +
      '<div class="pa-g-quem"><span class="pa-g-rot">Por Dia</span></div>' +
      dias.map(function (d) {
        var lista = mapa[C.chaveDia(d)] || [];
        var vem = lista.some(function (s) { return s.estado === 'programado'; });
        var alt = lista.length ? Math.max(Math.round(lista.length / pico * 100), 14) : 0;
        return '<div class="pa-g-cvol' + (C.fds(d) ? ' fds' : '') +
          (C.mesmoDia(d, C.HOJE) ? ' hoje' : '') + '">' +
          (lista.length
            ? '<i class="pa-bar' + (vem ? ' vem' : '') + '" style="height:' + alt +
              '%"></i><em>' + lista.length + '</em>'
            : '<i class="pa-bar zero"></i>') + '</div>';
      }).join('') + '</div>';
  }

  function raia(c, dias) {
    var mapa = C.porDia(c.u);
    return '<div class="pa-g-linha pa-g-raia">' +
      '<div class="pa-g-quem">' + C.face(c, 'cl-av') +
        '<span><b>@' + C.seguro(c.u) + '</b><span>' +
        (c.mercado ? C.seguro(C.maiuscula(c.mercado)) : 'Sem Mercado') +
        '</span></span></div>' +
      dias.map(function (d) {
        var lista = (mapa[C.chaveDia(d)] || []).slice().sort(function (a, b) {
          return new Date(a.quando) - new Date(b.quando);
        });
        var vazio = d > C.HOJE && !lista.length;
        return '<button type="button" class="pa-g-cel' + (C.fds(d) ? ' fds' : '') +
          (C.mesmoDia(d, C.HOJE) ? ' hoje' : '') +
          '" data-dia="' + C.chaveDia(d) + '">' +
          (lista.length ? lista.slice(0, 4).map(item).join('') +
            (lista.length > 4
              ? '<span class="pa-mais">Mais ' + (lista.length - 4) + '</span>' : '')
            : (vazio ? '<span class="pa-slot">Sem Nada</span>' : '')) +
        '</button>';
      }).join('') + '</div>';
  }

  function nascerNoHoje(palco) {
    /* O ALVO E' A COLUNA DA REGUA, e nao o risco: risco mora dentro da coluna, que e'
       `position:relative`, e o `offsetLeft` dele volta relativo a ela. */
    var rolo = palco.querySelector('.pa-g-rolo');
    var col = palco.querySelector('.pa-g-dia.hoje');
    if (rolo && col) {
      rolo.scrollLeft = Math.max(col.offsetLeft - rolo.clientWidth * 0.34, 0);
    }
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ir]');
    if (!b) return;
    mes = b.dataset.ir === 'hoje'
      ? new Date(C.HOJE.getFullYear(), C.HOJE.getMonth(), 1)
      : new Date(mes.getFullYear(), mes.getMonth() + Number(b.dataset.ir), 1);
    pintar();
  });

  document.addEventListener('DOMContentLoaded', function () {
    C.ligarCasca();
    pintar();
  });
})();
