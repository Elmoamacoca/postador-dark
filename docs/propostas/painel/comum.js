/* ==================================== O QUE AS PROPOSTAS DO PAINEL COMPARTILHAM
   RODADA 4, de 11/09/2026.

   O TERRITORIO DESTA ABA, decidido depois da reprovacao das seis anteriores: o
   Painel e' a SALA DE MAQUINAS do Postador, e a unidade dele e' o VIDEO.

     Calendario  responde QUANDO sai.
     Analytics   responde COMO foi depois que saiu.
     Contas      responde QUEM sao os perfis.
     Painel      responde se a maquina tem material, se ela anda, e onde emperra.

   Por isso aqui nao ha' ficha de perfil, nao ha' gantt e nao ha' visualizacao. O
   que existe e' o caminho do arquivo: Prateleira, Fila, No Ar, e o Erro que cai
   fora da esteira. Este arquivo so' calcula; quem desenha e' `sala.js` (as pecas
   da Sala De Controle) e `motor.js` (os graficos proprios desta tela).
   ========================================================================== */
(function () {
  var D = window.DADOS_PN || {};
  var S = window.SALA;

  var LEVAS = D.levas || [];
  var ESTEIRA = D.esteira || {};
  var RESUMO = D.resumo || {};
  var MAQUINA = D.maquina || [];
  var SAIDAS = D.saidas || [];
  var FONTE = D.fonte || {};
  var HOJE = new Date(D.hoje || new Date().toISOString().slice(0, 19));
  var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
             'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  /* DATA DE DEZ CARACTERES E' LIDA COMO UTC pelo navegador, e no fuso do Brasil
     isso devolve o dia anterior. O meio-dia resolve sem depender de biblioteca. */
  function data(iso) {
    var t = String(iso || '');
    return new Date(t.length === 10 ? t + 'T12:00:00' : t);
  }
  function dia(iso) {
    var d = data(String(iso).slice(0, 10));
    return d.getDate() + ' ' + MES[d.getMonth()];
  }
  function dias(iso) {
    if (!iso) return null;
    var d = data(String(iso).slice(0, 10));
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

  /* ------------------------------------------------------------- A ESTEIRA
     As estacoes na ordem em que o video anda. `Erro` nao e' estacao: e' o que cai
     fora do caminho, e por isso sai do funil e vira trava. */
  function estacoes() {
    return [
      { rotulo: 'Na Prateleira', valor: ESTEIRA.prateleira || 0, chave: 'prateleira',
        icone: 'box', cor: S.corVar(1),
        nota: 'Arquivo anotado no livro-caixa, sem hora marcada. É o combustível.' },
      { rotulo: 'Na Fila', valor: ESTEIRA.programado || 0, chave: 'programado',
        icone: 'calendar', cor: S.corVar(2),
        nota: 'Já tem hora marcada e espera o relógio. Sai sozinho quando chega a vez.' },
      { rotulo: 'No Ar', valor: ESTEIRA.publicado || 0, chave: 'publicado',
        icone: 'send', cor: S.corVar(3),
        nota: 'A Meta aceitou e o vídeo está publicado. Sai da esteira aqui.' }
    ];
  }

  /* ------------------------------------------------------------- O RITMO
     Quantos videos a maquina consegue queimar por dia. O ritmo medido sai dos 90
     dias lidos; os outros sao alvos, para a conta de autonomia responder "e se". */
  var RITMOS = [1, 2, 3, 5];
  function ritmoMedido() { return RESUMO.ritmo || 0; }
  function autonomia(ritmo) {
    var e = ESTEIRA.prateleira || 0;
    if (!ritmo) return null;
    return Math.floor(e / ritmo);
  }
  /* O TETO DO MEDIDOR sai do ritmo mais lento da lista, e nao de um numero
     redondo escolhido a dedo: com teto fixo em um ano, o ponteiro de sessenta
     dias fica encolhido num canto e a leitura se perde. */
  function tetoAutonomia() {
    var maior = autonomia(RITMOS[0]) || 0;
    return Math.max(30, Math.ceil(maior / 30) * 30);
  }
  function acaba(ritmo) {
    var d = autonomia(ritmo);
    if (d == null) return '';
    var f = new Date(HOJE.getTime() + d * 86400000);
    return f.getDate() + ' ' + MES[f.getMonth()]
      + (f.getFullYear() !== HOJE.getFullYear() ? ' de ' + f.getFullYear() : '');
  }

  /* ---------------------------------------------------------- O TEMPO DE MAQUINA
     Ate' 31 dias, um ponto por dia; acima disso, por semana. Noventa colunas de no
     maximo uma saida viram um pente, e pente nao se le'. */
  function maquina(janela) {
    var corte = MAQUINA.slice(-janela);
    if (janela <= 31) return corte;
    var fora = [], atual = null;
    corte.forEach(function (p) {
      var d = data(p.dia);
      var seg = new Date(d.getTime() - ((d.getDay() + 6) % 7) * 86400000);
      var chave = seg.toISOString().slice(0, 10);
      if (!atual || atual.dia !== chave) {
        atual = { dia: chave, saidas: 0, paradas: 0, n: 0 };
        fora.push(atual);
      }
      atual.saidas += p.saidas;
      atual.paradas += p.paradas;
      atual.n += 1;
    });
    return fora.map(function (p) {
      return { dia: p.dia, saidas: p.saidas, paradas: Math.round(p.paradas / p.n) };
    });
  }
  function diasRodando(janela) {
    return MAQUINA.slice(-janela).filter(function (d) { return d.saidas; }).length;
  }

  /* ------------------------------------------------------------- AS LEVAS */
  function levasOrdenadas() {
    return LEVAS.slice().sort(function (a, b) { return b.total - a.total; });
  }
  function pilhaDasLevas() {
    var l = levasOrdenadas();
    return {
      linhas: l.map(function (x) { return x.nome; }),
      series: [
        { nome: 'Na Prateleira', cor: S.corVar(1),
          vals: l.map(function (x) { return x.prateleira; }) },
        { nome: 'Na Fila', cor: S.corVar(2),
          vals: l.map(function (x) { return x.programados; }) },
        { nome: 'No Ar', cor: S.corVar(3),
          vals: l.map(function (x) { return x.publicados; }) },
        { nome: 'Com Erro', cor: S.corVar(5),
          vals: l.map(function (x) { return x.erro; }) }
      ]
    };
  }

  /* ------------------------------------------------------------ O MATERIAL
     Junta as duas contagens numa lista so'. Pasta LIGADA vale pelo livro-caixa,
     que e' quem sabe o que ja' andou; pasta que ainda esta' solta na fonte vale
     pela contagem do Drive. Sem juntar, a leva com 180 videos no livro aparece
     com zero, porque na fonte ela guarda pasta, e nao arquivo. */
  function material() {
    var vistas = {};
    var fora = LEVAS.map(function (x) {
      vistas[x.nome] = 1;
      return { nome: x.nome, videos: x.total, ligada: true, conta: x.conta };
    });
    (FONTE.pastas || []).forEach(function (p) {
      if (vistas[p.nome]) return;
      fora.push({ nome: p.nome, videos: p.videos || 0, ligada: false, conta: '' });
    });
    return fora.sort(function (a, b) { return b.videos - a.videos; });
  }

  /* A LISTA DAS CAIXAS. A `S.lista` da Sala esconde quem esta' em zero, e aqui
     zero e' informacao: pasta ligada e vazia e' uma trava, nao uma ausencia. */
  function listaCaixas(itens) {
    if (!itens.length) return '<p class="rs-sem">Nenhuma pasta na fonte.</p>';
    var max = Math.max.apply(null, itens.map(function (i) {
      return i.videos; }).concat([1]));
    return '<div class="rs-lista">' + itens.map(function (i) {
      var cor = i.ligada ? S.corVar(1) : S.corVar(4);
      return '<div class="rs-li semi' + (i.videos ? '' : ' pn-zero') + '">'
        + '<span class="nm"><b>' + S.seguro(i.nome) + '</b>'
        + S.seguro(i.ligada ? (i.conta ? 'ligada em @' + i.conta
                                       : 'ligada, sem perfil')
                            : 'só no Drive, fora do livro') + '</span>'
        + '<span class="vl rs-tn">' + S.fmt(i.videos) + '<small>'
        + (i.videos ? 'vídeos' : 'vazia') + '</small></span>'
        + '<span class="rs-li-tr"><i style="width:'
        + ((i.videos / max) * 100).toFixed(1) + '%;background:linear-gradient(90deg,'
        + S.corFraca(cor, 55) + ',' + cor + ')"></i></span></div>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------- O QUE TRAVA A MAQUINA
     Cada linha e' um motivo de nada estar saindo agora, do mais grave para o menos,
     e cada uma leva o botao que resolve. Lista vazia e' a tela que se quer ver. */
  function travas() {
    var l = [];
    if (!FONTE.pronta) {
      l.push({ ico: 'plug', cl: 'am', titulo: 'A Fonte De Vídeo Não Responde',
        desc: FONTE.motivo || 'O Drive não respondeu na última leitura',
        botao: 'Abrir Mídia', grave: true });
    }
    if (ESTEIRA.erro) {
      l.push({ ico: 'triangle-alert', cl: 'am',
        titulo: S.fmt(ESTEIRA.erro) + (ESTEIRA.erro > 1 ? ' Vídeos Recusados'
                                                        : ' Vídeo Recusado'),
        desc: 'O envio voltou com erro e o motivo está gravado no livro-caixa',
        botao: 'Ver O Erro', grave: true });
    }
    if (!ESTEIRA.programado && ESTEIRA.prateleira) {
      l.push({ ico: 'calendar', cl: 'am', titulo: 'Nenhum Vídeo Na Fila',
        desc: S.fmt(ESTEIRA.prateleira) + ' guardados na prateleira e nada com hora '
          + 'marcada. A esteira para na primeira estação.',
        botao: 'Programar', grave: true });
    }
    if (!ESTEIRA.prateleira) {
      l.push({ ico: 'box', cl: 'am', titulo: 'A Prateleira Está Vazia',
        desc: 'Sem material anotado no livro não há o que programar',
        botao: 'Ligar Uma Pasta', grave: true });
    }
    LEVAS.forEach(function (x) {
      if (x.total) return;
      l.push({ ico: 'folder', cl: '', titulo: 'A Leva ' + x.nome + ' Está Vazia',
        desc: 'Ligada ' + idade(x.ligada_em) + ' e nenhum vídeo foi anotado nela',
        botao: 'Ver A Pasta' });
    });
    LEVAS.forEach(function (x) {
      if (!x.total || x.conta) return;
      l.push({ ico: 'circle-slash', cl: '', titulo: 'A Leva ' + x.nome + ' Não Tem Dono',
        desc: 'Sem perfil ligado, o material dela não pode ser programado',
        botao: 'Escolher O Perfil' });
    });
    (FONTE.pastas || []).forEach(function (p) {
      if (p.ligada) return;
      l.push({ ico: 'hard-drive', cl: '', titulo: 'A Pasta ' + p.nome + ' Não Foi Ligada',
        desc: 'Está no Drive e ainda não entrou no livro-caixa',
        botao: 'Ligar' });
    });
    return l;
  }

  /* A fita: o que a maquina fez por ultimo, do mais novo para o mais velho. */
  function fita() {
    return SAIDAS.slice().reverse().map(function (p) {
      return { ico: 'send', cl: 'ok', titulo: p.titulo || 'Publicação',
        sub: 'Saiu por @' + p.conta,
        q1: idade(p.quando), q2: 'entregue à Meta' };
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
    LEVAS: LEVAS, ESTEIRA: ESTEIRA, RESUMO: RESUMO, MAQUINA: MAQUINA,
    SAIDAS: SAIDAS, FONTE: FONTE, HOJE: HOJE, RITMOS: RITMOS,
    dia: dia, dias: dias, idade: idade,
    estacoes: estacoes, ritmoMedido: ritmoMedido, autonomia: autonomia, acaba: acaba,
    tetoAutonomia: tetoAutonomia,
    maquina: maquina, diasRodando: diasRodando, material: material,
    listaCaixas: listaCaixas,
    levasOrdenadas: levasOrdenadas, pilhaDasLevas: pilhaDasLevas,
    travas: travas, fita: fita, casca: casca
  };
})();
