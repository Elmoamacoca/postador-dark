/* ============================================ PROPOSTA C: A GRADE DE HORAS

   A DECISAO DESTA PROPOSTA: o que o calendario esconde nao e' o dia, e' a HORA. O
   agendador espalha a saida dentro de uma janela e sorteia ate' 22 minutos de
   deslocamento entre contas; sem ver a hora, ninguem percebe que a conta so' publica
   de manha, nem que duas contas caem no mesmo horario.

   NO MES cada dia carrega uma fita de 6h a 24h com um ponto por saida: bate o olho e
   ve' o horario do mes inteiro. NO GANTT a hora vira o eixo de cima a baixo, o dia
   vira coluna, e as quatro semanas cabem na tela sem rolagem lateral.

   O QUE ELA CUSTA: e' a mais analitica das tres e a que menos mostra o conteudo. A
   capa so' aparece quando se abre o dia.
   ========================================================================== */
(function () {
  var C = window.CAL;
  var mes = new Date(C.HOJE.getFullYear(), C.HOJE.getMonth(), 1);
  var DE = -13, ATE = 14;
  var MARCAS = [24, 21, 18, 15, 12, 9, 6];

  window.CAL_PINTAR = pintar;

  function pintar() {
    var u = C.escolhida();
    var r = C.resumo(u);
    var palco = document.getElementById('cal-palco');
    var noMes = C.visao() === 'mes';

    palco.innerHTML =
      '<div class="hr-topo">' + C.seletor() + C.abas() +
        '<div class="hr-nums">' +
          num(r.saiu, 'Já Saíram') + num(r.vem, 'Marcados', 'vem') +
          num(r.vazios, 'Dias Vazios Nos Próximos 14', r.vazios ? 'mau' : '') +
        '</div>' +
      '</div>' +
      '<div class="caixa solta hr-caixa">' +
        (noMes ? barraMes() + grade(u) : barraGantt(u) + gantt(u)) +
      '</div>';
  }

  function num(valor, rot, tom) {
    return '<div class="hr-n' + (tom ? ' ' + tom : '') + '"><b>' + valor + '</b>' +
      '<span>' + rot + '</span></div>';
  }

  function legenda(u) {
    if (u === C.REDE) {
      return '<div class="cl-legenda">' + C.CONTAS.map(function (c) {
        return '<span class="cl-lg"><i style="background:' + C.corDe(c.u) +
          '"></i>@' + C.seguro(c.u) + '</span>';
      }).join('') +
        '<span class="cl-lg hr-nota">Vazio já saiu, cheio ainda vem</span></div>';
    }
    return '<div class="cl-legenda">' +
      '<span class="cl-lg"><i style="background:var(--soft)"></i>Já Saiu</span>' +
      '<span class="cl-lg"><i style="background:var(--accent)"></i>Marcado</span>' +
      '<span class="cl-lg tracado"><i></i>Dia Vazio</span></div>';
  }

  function barraMes() {
    return '<div class="hr-barra">' +
      '<button class="bt mini" type="button" data-ir="hoje">Hoje</button>' +
      '<button class="hr-seta" type="button" data-ir="-1" aria-label="Mês anterior">' +
        '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>' +
      '<button class="hr-seta" type="button" data-ir="1" aria-label="Próximo mês">' +
        '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>' +
      '<b class="hr-titulo">' + C.MES[mes.getMonth()] + ' De ' + mes.getFullYear() +
      '</b><span class="hr-sub">Cada fita é um dia das 6h às 24h; os riscos são 12h ' +
      'e 18h</span>' +
      legenda(C.escolhida()) + '</div>';
  }

  function barraGantt(u) {
    var a = C.faixa(DE, DE)[0], b = C.faixa(ATE, ATE)[0];
    return '<div class="hr-barra">' +
      '<b class="hr-titulo">' + a.getDate() + ' De ' + C.MES[a.getMonth()] + ' A ' +
        b.getDate() + ' De ' + C.MES[b.getMonth()] + '</b>' +
      '<span class="hr-sub">Cada ponto é uma saída, na altura da hora</span>' +
      legenda(u) + '</div>';
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
      if (vivos) semanas.push(linha.join(''));
    }
    return '<div class="hr-dias">' +
        C.DIAS.map(function (x) { return '<span>' + x + '</span>'; }).join('') +
      '</div><div class="hr-grade">' + semanas.join('') + '</div>';
  }

  function celula(d, lista) {
    var deFora = d.getMonth() !== mes.getMonth();
    var hoje = C.mesmoDia(d, C.HOJE);
    var vazio = d > C.HOJE && !lista.length && !deFora;
    lista = lista.slice().sort(function (a, b) {
      return new Date(a.quando) - new Date(b.quando);
    });

    return '<button type="button" class="hr-cel' + (deFora ? ' fora' : '') +
      (hoje ? ' hoje' : '') + '" data-dia="' + C.chaveDia(d) + '">' +
      '<span class="hr-cab"><b>' + d.getDate() + '</b>' +
        (lista.length ? '<em>' + lista.length + '</em>' : '') + '</span>' +
      (lista.length
        ? '<span class="hr-fita">' + lista.map(function (s) {
            /* COM A REDE, a COR diz de quem e' e o PREENCHIMENTO diz se ja' foi: ponto
               cinza no passado apagava a conta e desmentia a legenda logo acima. */
            return '<i class="hr-p' + (s.estado === 'programado' ? ' vem' : '') +
              (C.escolhida() === C.REDE ? ' rede' : '') +
              '" style="left:' + (C.fracaoHora(s.quando) * 100).toFixed(1) + '%;' +
              '--cor:' + C.corDe(s.conta) + '" title="' + C.hora(s.quando) + ' · ' +
              C.seguro(C.rotulo(s)) + '"></i>';
          }).join('') + '</span>' +
          '<span class="hr-faixa">' + C.hora(lista[0].quando) +
          (lista.length > 1 ? ' até ' + C.hora(lista[lista.length - 1].quando) : '') +
          '</span>'
        : (vazio ? '<span class="hr-fita seca"></span>' +
                   '<span class="hr-faixa mau">Sem Nada</span>' : '')) +
    '</button>';
  }

  /* ----------------------------------------------------------------- o gantt */
  function gantt(u) {
    var dias = C.faixa(DE, ATE);
    var mapa = C.porDia(u);
    var rede = u === C.REDE;

    return '<div class="hr-g">' +
      '<div class="hr-g-eixo">' + MARCAS.map(function (h) {
        return '<span style="bottom:' + ((h - 6) / 18 * 100).toFixed(2) + '%">' + h +
          'h</span>';
      }).join('') + '</div>' +
      '<div class="hr-g-meio">' +
        '<div class="hr-g-regua">' + dias.map(function (d) {
          return '<div class="hr-g-dia' + (C.mesmoDia(d, C.HOJE) ? ' hoje' : '') +
            (C.fds(d) ? ' fds' : '') + '"><b>' + d.getDate() + '</b><span>' +
            C.DIAS[d.getDay()][0] + '</span></div>';
        }).join('') + '</div>' +
        '<div class="hr-g-campo">' + dias.map(function (d) {
          var lista = mapa[C.chaveDia(d)] || [];
          return '<button type="button" class="hr-g-col' + (C.fds(d) ? ' fds' : '') +
            (C.mesmoDia(d, C.HOJE) ? ' hoje' : '') +
            '" data-dia="' + C.chaveDia(d) + '">' +
            lista.map(function (s) { return ponto(s, rede); }).join('') + '</button>';
        }).join('') + '</div>' +
        /* A REGUA DE BURACO fecha o quadro por baixo: um traco por dia, e o dia futuro
           sem nada aparece tracejado. E' onde a tela responde "onde vou parar". */
        '<div class="hr-g-pe">' + dias.map(function (d) {
          var lista = mapa[C.chaveDia(d)] || [];
          return '<div class="hr-g-marca' + (lista.length ? '' :
            (d > C.HOJE ? ' vazio' : ' nada')) +
            (lista.some(function (s) { return s.estado === 'programado'; })
              ? ' vem' : '') + '"></div>';
        }).join('') + '</div>' +
      '</div>' +
    '</div>';
  }

  /* DUAS CONTAS NO MESMO HORARIO se cobririam no centro da coluna: com a rede
     escolhida, cada conta ganha a sua trilha dentro da coluna. */
  function ponto(s, rede) {
    var i = 0;
    for (var k = 0; k < C.CONTAS.length; k++) if (C.CONTAS[k].u === s.conta) i = k;
    var desloca = rede ? (i - (C.CONTAS.length - 1) / 2) * 10 : 0;
    return '<i class="hr-g-p' + (s.estado === 'programado' ? ' vem' : '') +
      (rede ? ' rede' : '') +
      '" style="bottom:' + (C.fracaoHora(s.quando) * 100).toFixed(2) + '%;' +
      'left:calc(50% + ' + desloca.toFixed(1) + 'px);--cor:' + C.corDe(s.conta) +
      '" title="' + C.hora(s.quando) + ' · @' + C.seguro(s.conta) + ' · ' +
      C.seguro(C.rotulo(s)) + '"></i>';
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
