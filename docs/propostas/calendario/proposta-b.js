/* ===================================================== PROPOSTA B: AS RAIAS

   A DECISAO DESTA PROPOSTA: abandonar a grade de mes. O tempo corre para a direita,
   um dia por coluna, e cada conta tem a SUA RAIA. Com uma conta escolhida, sobra uma
   raia so'; com Toda A Rede, as raias empilham e a colisao de horario entre contas
   fica visivel, que e' a unica coisa que a rede so' mostra junta.

   POR QUE ELA EXISTE: mes esconde ritmo. Aqui a semana passada e a proxima estao na
   mesma tela, o buraco vira coluna vazia, e o risco de HOJE separa o que saiu do que
   vai sair. E' a visao de quem opera varias contas.

   O QUE ELA CUSTA: e' a mais estranha das tres para quem espera um calendario, e
   exige rolagem lateral quando o periodo cresce.
   ========================================================================== */
(function () {
  var C = window.CAL;
  var DE = -13, ATE = 14;          /* dias em volta de hoje */

  window.CAL_PINTAR = pintar;

  function dias() {
    var fora = [];
    for (var i = DE; i <= ATE; i++) {
      fora.push(new Date(C.HOJE.getFullYear(), C.HOJE.getMonth(),
                         C.HOJE.getDate() + i));
    }
    return fora;
  }

  function pintar() {
    var u = C.escolhida();
    var r = C.resumo(u);
    var lista = u === C.REDE ? C.CONTAS : [C.contaDe(u)];
    var palco = document.getElementById('cal-palco');

    palco.innerHTML =
      '<div class="rx-topo">' + C.seletor() +
        '<div class="rx-resumo">' +
          '<span><b>' + r.saiu + '</b> Já Saíram</span>' +
          '<span class="vem"><b>' + r.vem + '</b> Marcados</span>' +
          '<span' + (r.vazios ? ' class="mau"' : '') + '><b>' + r.vazios +
            '</b> Dias Vazios À Frente</span>' +
        '</div>' +
      '</div>' +

      '<div class="caixa solta rx-caixa">' +
        '<div class="rx-rolo">' +
          '<div class="rx-quadro">' +
            regua() +
            lista.map(function (c) { return raia(c); }).join('') +
          '</div>' +
        '</div>' +
      '</div>';

    /* NASCE NO HOJE: quem abre quer saber o que vem, nao o que passou.

       O ALVO E' A COLUNA, E NAO O RISCO. O risco (`.rx-hoje`) mora DENTRO da coluna,
       que e' `position:relative`: o `offsetLeft` dele e' relativo a ela, e dava 38
       pixels em vez dos 1200 da coluna no quadro. A faixa nascia no comeco, mostrando
       o mes passado. */
    var rolo = palco.querySelector('.rx-rolo');
    var coluna = palco.querySelector('.rx-dia.hoje');
    if (rolo && coluna) {
      rolo.scrollLeft = Math.max(coluna.offsetLeft - rolo.clientWidth * 0.42, 0);
    }
  }

  function regua() {
    return '<div class="rx-linha rx-regua">' +
      '<div class="rx-quem"></div>' +
      dias().map(function (d) {
        var hoje = C.mesmoDia(d, C.HOJE);
        var virada = d.getDate() === 1 || d === dias()[0];
        return '<div class="rx-dia' + (hoje ? ' hoje' : '') +
          (d.getDay() === 0 || d.getDay() === 6 ? ' fds' : '') + '">' +
          '<b>' + d.getDate() + '</b><span>' + C.DIAS[d.getDay()] + '</span>' +
          (virada ? '<em>' + C.MES3[d.getMonth()] + '</em>' : '') +
          (hoje ? '<i class="rx-hoje"></i>' : '') + '</div>';
      }).join('') + '</div>';
  }

  function raia(c) {
    var mapa = C.porDia(c.u);
    return '<div class="rx-linha">' +
      '<div class="rx-quem">' + C.face(c, 'cl-av') +
        '<span><b>@' + C.seguro(c.u) + '</b><span>' +
        (c.mercado ? C.seguro(C.maiuscula(c.mercado)) : 'Sem Mercado') +
        '</span></span></div>' +
      dias().map(function (d) {
        var lista = (mapa[C.chaveDia(d)] || []).slice().sort(function (a, b) {
          return new Date(a.quando) - new Date(b.quando);
        });
        var futuro = d > C.HOJE;
        return '<button type="button" class="rx-cel' +
          (C.mesmoDia(d, C.HOJE) ? ' hoje' : '') +
          (futuro && !lista.length ? ' vazio' : '') +
          (d.getDay() === 0 || d.getDay() === 6 ? ' fds' : '') +
          '" data-dia="' + C.chaveDia(d) + '">' +
          (lista.length ? lista.slice(0, 2).map(function (s) {
            return '<span class="rx-p' + (s.estado === 'programado' ? ' vem' : '') +
              '" style="--cor:' + C.corDe(s.conta) + '">' +
              (s.capa != null ? '<img src="' + C.capa(s.capa) + '" alt="">' : '') +
              '<em>' + C.hora(s.quando).replace('h', ':') + '</em></span>';
          }).join('') + (lista.length > 2
            ? '<span class="rx-mais">+' + (lista.length - 2) + '</span>' : '')
            : '') +
        '</button>';
      }).join('') + '</div>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    C.ligarCasca();
    pintar();
  });
})();
