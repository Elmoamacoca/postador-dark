/* ==================================== O QUE AS PROPOSTAS DO PAINEL COMPARTILHAM
   RODADA 3, de 11/09/2026. As seis anteriores foram reprovadas, e o motivo estava
   na tela que ele mandou olhar: a Sala De Controle do portal. Quem desenha agora e'
   `sala.js`, porte fiel das pecas de la'. Aqui ficam so' os DADOS e a casca.
   ========================================================================== */
(function () {
  var D = window.DADOS_PN || {};
  var S = window.SALA;

  var CONTAS = D.contas || [];
  var RESUMO = D.resumo || {};
  var SERIE = D.serie || [];
  var POSTS = D.posts || [];
  var PASTAS = D.pastas || [];
  var HOJE = new Date(D.hoje || new Date().toISOString().slice(0, 19));
  var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
             'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  function dia(iso) {
    var t = String(iso).slice(0, 10);
    var d = new Date(t + 'T12:00:00');
    return d.getDate() + ' ' + MES[d.getMonth()];
  }
  function dias(iso) {
    if (!iso) return null;
    var d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
    var h = new Date(HOJE.getTime()); h.setHours(12, 0, 0, 0);
    return Math.round((h - d) / 86400000);
  }
  function idade(iso) {
    var q = dias(iso);
    if (q == null) return 'nunca';
    if (q <= 0) return 'hoje';
    if (q === 1) return 'ontem';
    if (q < 30) return 'há ' + q + ' dias';
    if (q < 60) return 'há um mês';
    return 'há ' + Math.round(q / 30) + ' meses';
  }
  function somaDia(p) {
    var c = p.contas || {}, t = 0;
    for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k)) t += c[k] || 0;
    return t;
  }
  function viewsNoDia(d) {
    var t = 0;
    POSTS.forEach(function (p) { if (p.quando.slice(0, 10) === d) t += p.views; });
    return t;
  }
  function engNoDia(d) {
    var t = 0;
    POSTS.forEach(function (p) { if (p.quando.slice(0, 10) === d) t += p.eng; });
    return t;
  }

  /* A SERIE DO GRAFICO GRANDE. Ate' 31 dias, um ponto por dia; acima, por semana,
     porque 90 colunas de no maximo uma publicacao viram um pente. O PERIODO
     ANTERIOR so' existe quando ha' historico para ele: a leitura cobre 90 dias, e
     entao a janela de 30 tem os 30 de tras para comparar, e a de 90 nao tem. */
  function serieGrafico(janela) {
    var porSemana = janela > 31;
    var corte = SERIE.slice(-janela);
    var antes = janela > 31 ? [] : SERIE.slice(-(janela * 2), -janela);
    function balde(lista) {
      var fora = [], atual = null;
      lista.forEach(function (p) {
        var chave = p.dia, rot = dia(p.dia);
        if (porSemana) {
          var d = new Date(p.dia + 'T12:00:00');
          var seg = new Date(d.getTime() - ((d.getDay() + 6) % 7) * 86400000);
          chave = seg.toISOString().slice(0, 10);
          rot = dia(chave);
        }
        if (!atual || atual.chave !== chave) {
          atual = { chave: chave, rot: rot, a: 0, b: 0 };
          fora.push(atual);
        }
        atual.b += somaDia(p);
        atual.a += viewsNoDia(p.dia);
      });
      return fora;
    }
    var frente = balde(corte), tras = balde(antes);
    return frente.map(function (p, i) {
      return { rot: p.rot, a: p.a, b: p.b,
               antes: tras.length ? (tras[i] ? tras[i].a : 0) : 0 };
    });
  }
  function temAnterior(janela) { return janela <= 31 && SERIE.length >= janela * 2; }

  /* A MATRIZ DO MAPA DE CALOR: sete dias por vinte e quatro horas. */
  function matrizHora() {
    var m = [];
    for (var d = 0; d < 7; d++) {
      m.push(Array.from({ length: 24 }, function () { return 0; }));
    }
    POSTS.forEach(function (p) {
      var q = new Date(p.quando);
      m[q.getDay()][q.getHours()] += 1;
    });
    return m;
  }

  function porDiaSemana() {
    var b = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(function (s) {
      return [s, 0]; });
    POSTS.forEach(function (p) { b[new Date(p.quando).getDay()][1] += 1; });
    return b;
  }
  function porHora() {
    var b = [];
    for (var h = 0; h < 24; h++) b.push([h, 0]);
    POSTS.forEach(function (p) { b[new Date(p.quando).getHours()][1] += 1; });
    var vivos = b.filter(function (x) { return x[1]; }).map(function (x) { return x[0]; });
    if (!vivos.length) return b.map(function (x) { return [x[0] + 'h', 0]; }).slice(8, 22);
    var de = Math.max(0, Math.min.apply(null, vivos) - 2);
    var ate = Math.min(23, Math.max.apply(null, vivos) + 2);
    return b.slice(de, ate + 1).map(function (x) { return [x[0] + 'h', x[1]]; });
  }
  function topPublicacoes(quantas) {
    return POSTS.slice().sort(function (a, b) { return b.views - a.views; })
      .slice(0, quantas || 6)
      .map(function (p) {
        return [(p.legenda || 'Sem legenda').slice(0, 42), p.views];
      });
  }

  /* O QUE TRAVA: a mesma lista da home no ar, cada linha com o botao que resolve. */
  function travas() {
    var lista = [];
    CONTAS.forEach(function (c) {
      if (!c.ligada) lista.push({ ico: 'triangle-alert', cl: 'am',
        titulo: '@' + c.u + ' Está Desligada',
        desc: 'Fora do ar na leitura mais recente da API', botao: 'Ver A Conta' });
    });
    CONTAS.forEach(function (c) {
      if (c.erros) lista.push({ ico: 'triangle-alert', cl: 'am',
        titulo: '@' + c.u + ' Com Erro De Envio',
        desc: c.erros + ' vídeos recusados pela Meta', botao: 'Ver' });
    });
    CONTAS.forEach(function (c) {
      if (!c.ligada || c.fila) return;
      lista.push({ ico: 'clock', cl: c.prateleira ? 'am' : '',
        titulo: '@' + c.u + ' Está Sem Fila',
        desc: c.prateleira
          ? S.fmt(c.prateleira) + ' guardados e nenhum programado · último post '
            + idade(c.ultimo)
          : 'Nada programado · último post ' + idade(c.ultimo),
        botao: 'Programar' });
    });
    PASTAS.forEach(function (p) {
      if (p.total) return;
      lista.push({ ico: 'folder', cl: '', titulo: 'A Pasta ' + p.nome + ' Está Vazia',
        desc: 'Ligada' + (p.conta ? ' em @' + p.conta : '') + ', sem nenhum vídeo',
        botao: 'Ver A Pasta' });
    });
    return lista;
  }

  /* A fita: o que acabou de acontecer, do mais novo para o mais velho. */
  function fita() {
    return POSTS.slice().reverse().map(function (p) {
      return { ico: 'play', cl: 'ok', titulo: p.legenda || 'Sem legenda',
               sub: '@' + p.conta + ' · ' + (p.fmt === 'carrossel' ? 'Carrossel' : 'Reel'),
               q1: idade(p.quando), q2: S.fmt(p.views) + ' visualizações' };
    });
  }

  function casca() {
    var raiz = document.documentElement;
    var chave = document.getElementById('chave');
    var icone = document.getElementById('tema-icone');
    function pintaIcone(escuro) {
      icone.innerHTML = escuro
        ? '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>'
        : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2'
          + 'M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>';
    }
    pintaIcone(false);
    chave.addEventListener('click', function () {
      var escuro = raiz.getAttribute('data-theme') === 'dark';
      raiz.classList.add('trocando-tema');
      raiz.setAttribute('data-theme', escuro ? 'light' : 'dark');
      chave.setAttribute('aria-checked', String(!escuro));
      pintaIcone(!escuro);
      setTimeout(function () { raiz.classList.remove('trocando-tema'); }, 320);
    });
    var botao = document.getElementById('botao-menu');
    botao.addEventListener('click', function () {
      var aberto = raiz.getAttribute('data-menu') !== 'fechado';
      raiz.setAttribute('data-menu', aberto ? 'fechado' : 'aberto');
      botao.setAttribute('aria-expanded', String(!aberto));
    });
  }

  window.PN = {
    CONTAS: CONTAS, RESUMO: RESUMO, SERIE: SERIE, POSTS: POSTS, PASTAS: PASTAS,
    HOJE: HOJE, dia: dia, dias: dias, idade: idade, somaDia: somaDia,
    viewsNoDia: viewsNoDia, engNoDia: engNoDia,
    serieGrafico: serieGrafico, temAnterior: temAnterior, matrizHora: matrizHora,
    porDiaSemana: porDiaSemana, porHora: porHora, topPublicacoes: topPublicacoes,
    travas: travas, fita: fita, casca: casca
  };
})();
