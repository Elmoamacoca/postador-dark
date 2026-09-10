/* ==================================================== PROPOSTA B: O MURAL

   A DECISAO DESTA PROPOSTA: se a miniatura vai aparecer na grade, ela tem de ter
   tamanho. Na primeira rodada a capa entrava com 26 pixels e tarja de hora por cima,
   e o mes virava uma parede de retangulos pretos. Aqui a capa do dia PREENCHE a
   celula, o numero e a hora entram por cima em vidro, e o que era sujeira vira o
   contato visual do que a conta publica.

   OS DOIS MODOS: `Mês` e `Gantt`, no mesmo alternador, sobre a mesma conta.

   O QUE ELA CUSTA: e' a mais pesada das tres, e o dia com quatro saidas mostra a
   imagem de uma so'. Para saber o que sao as outras, abre o dia.
   ========================================================================== */
(function () {
  var C = window.CAL;
  var mes = new Date(C.HOJE.getFullYear(), C.HOJE.getMonth(), 1);
  var DE = -13, ATE = 14;

  window.CAL_PINTAR = pintar;

  function pintar() {
    var u = C.escolhida();
    var r = C.resumo(u);
    var palco = document.getElementById('cal-palco');
    var noMes = C.visao() === 'mes';

    palco.innerHTML =
      '<div class="mu-topo">' + C.seletor() + C.abas() +
        '<div class="mu-nums">' +
          num(r.saiu, 'Já Saíram') + num(r.vem, 'Marcados', 'vem') +
          num(r.vazios, 'Dias Vazios Nos Próximos 14', r.vazios ? 'mau' : '') +
        '</div>' +
      '</div>' +
      '<div class="caixa solta mu-caixa">' +
        (noMes ? barraMes() + grade(u) : barraGantt(u) + gantt(u)) +
      '</div>';

    if (!noMes && u === C.REDE) nascerNoHoje(palco);
  }

  function num(valor, rot, tom) {
    return '<div class="mu-n' + (tom ? ' ' + tom : '') + '"><b>' + valor + '</b>' +
      '<span>' + rot + '</span></div>';
  }

  function legenda() {
    return '<div class="cl-legenda">' +
      '<span class="cl-lg"><i style="background:var(--soft)"></i>Já Saiu</span>' +
      '<span class="cl-lg"><i style="background:var(--accent)"></i>Marcado</span>' +
      '<span class="cl-lg tracado"><i></i>Dia Vazio</span></div>';
  }

  function barraMes() {
    return '<div class="mu-barra">' +
      '<button class="bt mini" type="button" data-ir="hoje">Hoje</button>' +
      '<button class="mu-seta" type="button" data-ir="-1" aria-label="Mês anterior">' +
        '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>' +
      '<button class="mu-seta" type="button" data-ir="1" aria-label="Próximo mês">' +
        '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>' +
      '<b class="mu-titulo">' + C.MES[mes.getMonth()] + ' De ' + mes.getFullYear() +
      '</b>' + legenda() + '</div>';
  }

  function barraGantt(u) {
    /* O TITULO TEM DE DIZER O QUE ESTA' NA TELA: por semanas o quadro comeca no
       domingo anterior e termina no sabado seguinte. */
    var a, b;
    if (u === C.REDE) {
      a = C.faixa(DE, DE)[0];
      b = C.faixa(ATE, ATE)[0];
    } else {
      var sems = C.semanas(DE, ATE);
      a = sems[0][0];
      b = sems[sems.length - 1][6];
    }
    return '<div class="mu-barra">' +
      '<b class="mu-titulo">' + a.getDate() + ' De ' + C.MES[a.getMonth()] + ' A ' +
        b.getDate() + ' De ' + C.MES[b.getMonth()] + '</b>' +
      '<span class="mu-sub">' + (u === C.REDE ? 'Uma raia por conta, dia a dia'
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
      if (vivos) semanas.push(linha.join(''));   /* semana toda de outro mes nao entra */
    }
    return '<div class="mu-dias">' +
        C.DIAS.map(function (x) { return '<span>' + x + '</span>'; }).join('') +
      '</div><div class="mu-grade">' + semanas.join('') + '</div>';
  }

  function celula(d, lista) {
    var deFora = d.getMonth() !== mes.getMonth();
    var hoje = C.mesmoDia(d, C.HOJE);
    var futuro = d > C.HOJE;
    var vazio = futuro && !lista.length && !deFora;
    lista = lista.slice().sort(function (a, b) {
      return new Date(a.quando) - new Date(b.quando);
    });
    var capa = lista.filter(function (s) { return s.capa != null; })[0];
    var todoVem = lista.length && lista.every(function (s) {
      return s.estado === 'programado';
    });

    return '<button type="button" class="mu-cel' + (deFora ? ' fora' : '') +
      (hoje ? ' hoje' : '') + (capa ? ' tem' : '') + (todoVem ? ' vem' : '') +
      '" data-dia="' + C.chaveDia(d) + '">' +
      (capa ? '<img class="mu-fundo" src="' + C.capa(capa.capa) + '" alt="" ' +
              'loading="lazy"><span class="mu-veu"></span>' : '') +
      '<span class="mu-num">' + d.getDate() + '</span>' +
      (lista.length
        ? '<span class="mu-pe">' + lista.slice(0, 3).map(function (s) {
            return '<span class="mu-h' + (s.estado === 'programado' ? ' vem' : '') +
              '">' + C.hora(s.quando).replace('h', ':') + '</span>';
          }).join('') +
          (lista.length > 3 ? '<span class="mu-h mais">+' + (lista.length - 3) +
            '</span>' : '') + '</span>'
        : (vazio ? '<span class="mu-vazio">Sem Nada</span>' : '')) +
    '</button>';
  }

  /* ----------------------------------------------------------------- o gantt
     COM A REDE, a raia e' a conta. COM UMA CONTA, a raia e' a semana: raia unica no
     meio do branco foi o defeito da rodada passada. */
  function gantt(u) {
    return u === C.REDE ? porContas() : porSemanas(u);
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

    return '<div class="mu-s">' +
      '<div class="mu-s-linha mu-s-regua"><div class="mu-s-quem"></div>' +
        C.DIAS.map(function (x) {
          return '<div class="mu-s-rot">' + x + '</div>';
        }).join('') + '</div>' +
      sems.map(function (dias, i) {
        var agora = dias.some(function (d) { return C.mesmoDia(d, C.HOJE); });
        return '<div class="mu-s-linha' + (agora ? ' agora' : '') + '">' +
          '<div class="mu-s-quem">' +
            '<b>' + dias[0].getDate() + ' ' + C.MES3[dias[0].getMonth()] + ' a ' +
              dias[6].getDate() + ' ' + C.MES3[dias[6].getMonth()] + '</b>' +
            (agora ? '<em>Esta Semana</em>' : '') +
            '<span class="mu-s-vol"><i style="width:' +
              Math.round(totais[i] / pico * 100) + '%"></i></span>' +
            '<span class="mu-s-t">' + totais[i] +
              (totais[i] === 1 ? ' saída' : ' saídas') + '</span>' +
          '</div>' +
          dias.map(function (d) {
            var lista = (mapa[C.chaveDia(d)] || []).slice().sort(function (a, b) {
              return new Date(a.quando) - new Date(b.quando);
            });
            var vazio = d > C.HOJE && !lista.length;
            return '<button type="button" class="mu-s-cel' +
              (C.fds(d) ? ' fds' : '') + (C.mesmoDia(d, C.HOJE) ? ' hoje' : '') +
              '" data-dia="' + C.chaveDia(d) + '">' +
              '<span class="mu-s-num">' + d.getDate() + '</span>' +
              (lista.length
                /* DUAS CAPAS POR DIA, e nao tres: a coluna da semana tem 115 pixels
                   uteis, e a terceira empurrava a fileira para baixo, dobrando a
                   altura das cinco semanas. A que sobra vira contagem, e o dia
                   inteiro esta' a um clique. */
                ? '<span class="mu-s-fila">' + lista.slice(0, 2).map(cartao).join('') +
                  (lista.length > 2
                    ? '<span class="mu-g-mais">+' + (lista.length - 2) + '</span>' : '') +
                  '</span>'
                : (vazio ? '<span class="mu-vazio">Sem Nada</span>' : '')) +
            '</button>';
          }).join('') + '</div>';
      }).join('') + '</div>';
  }

  function porContas() {
    var dias = C.faixa(DE, ATE);
    return '<div class="mu-g-rolo"><div class="mu-g-quadro">' +
      regua(dias) +
      C.CONTAS.map(function (c) { return raia(c, dias); }).join('') +
    '</div></div>';
  }

  function regua(dias) {
    return '<div class="mu-g-linha mu-g-regua"><div class="mu-g-quem"></div>' +
      dias.map(function (d) {
        return '<div class="mu-g-dia' + (C.mesmoDia(d, C.HOJE) ? ' hoje' : '') +
          (C.fds(d) ? ' fds' : '') + '">' +
          '<b>' + d.getDate() + '</b><span>' + C.DIAS[d.getDay()] + '</span>' +
          (d.getDate() === 1
            ? '<em>' + C.MES3[d.getMonth()] + '</em>' : '') + '</div>';
      }).join('') + '</div>';
  }

  function raia(c, dias) {
    var mapa = C.porDia(c.u);
    return '<div class="mu-g-linha mu-g-raia">' +
      '<div class="mu-g-quem">' + C.face(c, 'cl-av') +
        '<span><b>@' + C.seguro(c.u) + '</b><span>' +
        (c.mercado ? C.seguro(C.maiuscula(c.mercado)) : 'Sem Mercado') +
        '</span></span></div>' +
      dias.map(function (d) {
        var lista = (mapa[C.chaveDia(d)] || []).slice().sort(function (a, b) {
          return new Date(a.quando) - new Date(b.quando);
        });
        var vazio = d > C.HOJE && !lista.length;
        return '<button type="button" class="mu-g-cel' + (C.fds(d) ? ' fds' : '') +
          (C.mesmoDia(d, C.HOJE) ? ' hoje' : '') +
          '" data-dia="' + C.chaveDia(d) + '">' +
          (lista.length ? lista.slice(0, 4).map(cartao).join('') +
            (lista.length > 4
              ? '<span class="mu-g-mais">Mais ' + (lista.length - 4) + '</span>' : '')
            : (vazio ? '<span class="mu-vazio">Sem Nada</span>' : '')) +
        '</button>';
      }).join('') + '</div>';
  }

  /* A HORA FICA FORA DA IMAGEM. Tarja preta sobre capa escura foi metade do problema
     estetico da primeira rodada: nao se lia a hora nem se via a capa. */
  function cartao(s) {
    return '<span class="mu-cart' + (s.estado === 'programado' ? ' vem' : '') + '">' +
      '<span class="mu-cart-im">' +
        (s.capa != null ? '<img src="' + C.capa(s.capa) + '" alt="" loading="lazy">'
                        : '') + '</span>' +
      '<em>' + C.hora(s.quando).replace('h', ':') +
      (s.exemplo ? '<i class="mid-ex"></i>' : '') + '</em></span>';
  }

  function nascerNoHoje(palco) {
    var rolo = palco.querySelector('.mu-g-rolo');
    var col = palco.querySelector('.mu-g-dia.hoje');
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
