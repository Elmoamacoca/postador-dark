/* ==================================== O QUE AS PROPOSTAS DO PAINEL COMPARTILHAM
   RODADA 5, de 12/09/2026.

   O QUE MUDOU DA RODADA ANTERIOR, por pedido dele:
     1. DESEMPENHO DOS PERFIS entra na home. Quem cresce, o ultimo viral, o
        ranking, a comparacao entre perfis.
     2. FILTRO POR ETIQUETA, a mesma que ele cadastra na aba de Contas, e por
        mercado. Ele escolhe em cima e a tela inteira obedece.
     3. MUITO MAIS GRAFICO.
     4. PALAVRA SIMPLES. Nada de esteira, prateleira, acervo, autonomia, leva ou
        livro-caixa. Video guardado, video agendado, ja' publicado, dias que
        sobram, pasta de video.

   A DIFERENCA PARA A ABA DE ANALYTICS continua de pe', e e' a razao desta tela
   existir: la' e' UMA conta por vez, em profundidade; aqui e' a REDE INTEIRA,
   comparada perfil a perfil, mais o material que ainda nao foi publicado.
   ========================================================================== */
(function () {
  var D = window.DADOS_PN || {};
  var S = window.SALA;

  var PERFIS = D.perfis || [];
  var LEVAS = D.levas || [];
  var ESTEIRA = D.esteira || {};
  var RESUMO = D.resumo || {};
  var MAQUINA = D.maquina || [];
  var SAIDAS = D.saidas || [];
  var FONTE = D.fonte || {};
  var ETIQUETAS = D.etiquetas || [];
  var MERCADOS = D.mercados || [];
  var HOJE = new Date(D.hoje || new Date().toISOString().slice(0, 19));
  var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
             'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var DIAS_SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

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

  /* ====================================================== O FILTRO DO TOPO
     Uma escolha so' de cada vez: todos, uma etiqueta ou um mercado. Tudo o que a
     tela calcula passa por `visiveis()`, e por isso o filtro vale para a pagina
     inteira, e nao so' para um cartao. */
  var filtro = { tipo: 'todos', valor: '' };
  function escolher(tipo, valor) { filtro = { tipo: tipo, valor: valor || '' }; }
  function escolhaAtual() { return filtro; }
  function rotuloFiltro() {
    if (filtro.tipo === 'etiqueta') return 'etiqueta ' + filtro.valor;
    if (filtro.tipo === 'mercado') return filtro.valor;
    if (filtro.tipo === 'perfil') return '@' + filtro.valor;
    return 'todos os perfis';
  }
  function visiveis() {
    if (filtro.tipo === 'etiqueta') {
      return PERFIS.filter(function (p) {
        return p.etiquetas.indexOf(filtro.valor) >= 0; });
    }
    if (filtro.tipo === 'mercado') {
      return PERFIS.filter(function (p) { return p.mercado === filtro.valor; });
    }
    if (filtro.tipo === 'perfil') {
      return PERFIS.filter(function (p) { return p.u === filtro.valor; });
    }
    return PERFIS.slice();
  }

  /* ---------------------------------------------------------- as publicacoes */
  function postsDe(lista, janela, atras) {
    var fim = new Date(HOJE.getTime() - (atras || 0) * 86400000);
    var ini = new Date(fim.getTime() - janela * 86400000);
    var fora = [];
    lista.forEach(function (p) {
      p.posts.forEach(function (x) {
        var q = data(x.quando);
        if (q > ini && q <= fim) fora.push(x);
      });
    });
    return fora.sort(function (a, b) {
      return a.quando < b.quando ? -1 : 1; });
  }
  function posts(janela) { return postsDe(visiveis(), janela, 0); }
  function postsAntes(janela) { return postsDe(visiveis(), janela, janela); }

  function somar(lista) {
    var t = { vis: 0, alc: 0, inter: 0, cur: 0, com: 0, sal: 0, cmp: 0, n: 0,
              medio: 0, comTempo: 0 };
    lista.forEach(function (p) {
      t.vis += p.vis; t.alc += p.alc; t.inter += p.inter;
      t.cur += p.cur; t.com += p.com; t.sal += p.sal; t.cmp += p.cmp;
      t.n += 1;
      if (p.medio) { t.medio += p.medio; t.comTempo += 1; }
    });
    t.eng = t.alc ? (t.inter / t.alc) * 100 : 0;
    t.tempo = t.comTempo ? t.medio / t.comTempo : 0;
    return t;
  }
  /* A VARIACAO SO' EXISTE COM BASE DE COMPARACAO. Sem publicacao no periodo
     anterior ela vem nula, e o cartao escreve "sem base" em vez de zero por
     cento, que leria como estabilidade. */
  function variacao(agora, antes) {
    if (!antes) return null;
    return ((agora - antes) / antes) * 100;
  }
  function resumoRede(janela) {
    var a = somar(posts(janela)), b = somar(postsAntes(janela));
    return { agora: a, antes: b,
      var_vis: variacao(a.vis, b.vis), var_alc: variacao(a.alc, b.alc),
      var_inter: variacao(a.inter, b.inter), var_n: variacao(a.n, b.n) };
  }

  /* A SERIE DO GRAFICO GRANDE. Ate' 31 dias, um ponto por dia; acima, por semana,
     porque noventa colunas de no maximo uma publicacao viram um pente. */
  function serieRede(janela, medida) {
    medida = medida || 'vis';
    var porSemana = janela > 31;
    /* O EIXO NASCE INTEIRO, COM ZERO NOS DIAS SEM PUBLICACAO. Somando so' os dias
       que tiveram post, uma rede que publicou numa semana so' virava UM ponto: a
       linha nao tem segmento, o simbolo esta' escondido, e o cartao inteiro
       aparecia vazio com o eixo indo ate' cinco mil. */
    /* A CHAVE SE MONTA COM O RELOGIO LOCAL, nunca com `toISOString`. As 22h do
       Brasil ja' sao o dia seguinte em UTC: o esqueleto do eixo caia numa semana
       e a publicacao caia noutra, e o grafico saia com quatorze colunas zeradas. */
    function chaveDe(d) {
      var x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
      if (porSemana) {
        x = new Date(x.getTime() - ((x.getDay() + 6) % 7) * 86400000);
      }
      return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2)
        + '-' + ('0' + x.getDate()).slice(-2);
    }
    function esqueleto(atras) {
      var fim = new Date(HOJE.getTime() - atras * 86400000);
      var fora = [], vistas = {};
      for (var i = janela - 1; i >= 0; i--) {
        var d = new Date(fim.getTime() - i * 86400000);
        var k = chaveDe(d);
        if (vistas[k]) continue;
        vistas[k] = { chave: k, rot: dia(k), a: 0, b: 0 };
        fora.push(vistas[k]);
      }
      return { lista: fora, mapa: vistas };
    }
    function encher(base, lista) {
      lista.forEach(function (p) {
        var k = chaveDe(data(p.quando));
        var alvo = base.mapa[k];
        if (!alvo) return;
        alvo.a += p[medida] || 0;
        alvo.b += 1;
      });
      return base.lista;
    }
    var frente = encher(esqueleto(0), posts(janela));
    var tras = encher(esqueleto(janela), postsAntes(janela));
    return frente.map(function (p, i) {
      return { rot: p.rot, a: p.a, b: p.b,
               antes: tras.length ? (tras[i] ? tras[i].a : 0) : 0 };
    });
  }
  function temAnterior(janela) { return postsAntes(janela).length > 0; }

  /* ==================================================== OS PERFIS, COMPARADOS */
  function porPerfil(janela) {
    return visiveis().map(function (p) {
      var meus = p.posts.filter(function (x) {
        var q = dias(x.quando);
        return q != null && q <= janela;
      });
      var antes = p.posts.filter(function (x) {
        var q = dias(x.quando);
        return q != null && q > janela && q <= janela * 2;
      });
      var a = somar(meus), b = somar(antes);
      return {
        u: p.u, nome: p.nome, retrato: p.retrato, ligada: p.ligada,
        mercado: p.mercado, etiquetas: p.etiquetas, seguidores: p.seguidores,
        guardados: p.guardados, agendados: p.agendados, pastas: p.pastas,
        ultima: p.ultima, curva: p.curva,
        vis: a.vis, alc: a.alc, inter: a.inter, eng: a.eng, n: a.n,
        tempo: a.tempo, mediaVis: a.n ? a.vis / a.n : 0,
        var_vis: variacao(a.vis, b.vis), var_inter: variacao(a.inter, b.inter),
        serie: meus.map(function (x) { return x.vis; })
      };
    });
  }
  /* QUEM ESTA CRESCENDO. Com base de comparacao, e' a variacao de visualizacao
     contra o periodo anterior. Sem base, e' a media de visualizacao por
     publicacao: e' o que da' para dizer com honestidade. */
  function crescimento(janela) {
    var l = porPerfil(janela);
    var comBase = l.filter(function (p) { return p.var_vis != null; });
    if (comBase.length) {
      return { base: true, lista: comBase.sort(function (a, b) {
        return b.var_vis - a.var_vis; }) };
    }
    return { base: false, lista: l.slice().sort(function (a, b) {
      return b.mediaVis - a.mediaVis; }) };
  }

  /* O ULTIMO VIRAL. Viral aqui tem regra, e nao chute: a publicacao mais recente
     que fez pelo menos o DOBRO da mediana de visualizacao do periodo. Sem
     nenhuma acima do dobro, devolve a de maior visualizacao, dizendo que ela nao
     estourou. */
  function viral(janela) {
    var l = posts(janela);
    if (!l.length) return null;
    var v = l.map(function (p) { return p.vis; }).sort(function (a, b) {
      return a - b; });
    var meio = v.length >> 1;
    var mediana = v.length % 2 ? v[meio] : Math.round((v[meio - 1] + v[meio]) / 2);
    var acima = l.filter(function (p) { return mediana && p.vis >= mediana * 2; });
    var alvo = acima.length ? acima[acima.length - 1]
      : l.slice().sort(function (a, b) { return b.vis - a.vis; })[0];
    return { post: alvo, mediana: mediana, estourou: acima.length > 0,
      quantas: mediana ? alvo.vis / mediana : 0 };
  }

  function melhores(janela, quantos) {
    return posts(janela).slice().sort(function (a, b) { return b.vis - a.vis; })
      .slice(0, quantos || 6);
  }
  function mixInteracao(janela) {
    var t = somar(posts(janela));
    return [{ nome: 'Curtidas', valor: t.cur, cor: S.corVar(1) },
            { nome: 'Comentários', valor: t.com, cor: S.corVar(2) },
            { nome: 'Salvamentos', valor: t.sal, cor: S.corVar(3) },
            { nome: 'Compartilhamentos', valor: t.cmp, cor: S.corVar(4) }];
  }
  function porDiaSemana(janela) {
    var b = DIAS_SEM.map(function (s) { return [s, 0]; });
    posts(janela).forEach(function (p) { b[data(p.quando).getDay()][1] += p.vis; });
    return b;
  }
  function porHora(janela) {
    var b = [];
    for (var h = 0; h < 24; h++) b.push([h, 0]);
    posts(janela).forEach(function (p) { b[data(p.quando).getHours()][1] += p.vis; });
    var vivos = b.filter(function (x) { return x[1]; })
      .map(function (x) { return x[0]; });
    if (!vivos.length) return b.slice(8, 22).map(function (x) {
      return [x[0] + 'h', 0]; });
    var de = Math.max(0, Math.min.apply(null, vivos) - 2);
    var ate = Math.min(23, Math.max.apply(null, vivos) + 2);
    return b.slice(de, ate + 1).map(function (x) { return [x[0] + 'h', x[1]]; });
  }
  function matrizHora(janela) {
    var m = [];
    for (var d = 0; d < 7; d++) {
      m.push(Array.from({ length: 24 }, function () { return 0; }));
    }
    posts(janela).forEach(function (p) {
      var q = data(p.quando);
      m[q.getDay()][q.getHours()] += 1;
    });
    return m;
  }
  function curvaSeguidores() {
    var pontos = {};
    visiveis().forEach(function (p) {
      (p.curva || []).forEach(function (x) {
        pontos[x[0]] = (pontos[x[0]] || 0) + (x[1] || 0);
      });
    });
    return Object.keys(pontos).sort().map(function (k) {
      return { rot: dia(k), a: pontos[k], b: 0, antes: 0 }; });
  }

  /* ================================================== O MATERIAL QUE NAO SAIU
     As tres paradas do video ate' o ar. Nome de gente, e nao nome de sistema. */
  function paradas() {
    var v = visiveis();
    var so = filtro.tipo === 'todos'
      ? null : v.map(function (p) { return p.u; });
    function conta(campo) {
      if (!so) return ESTEIRA[campo] || 0;
      return LEVAS.reduce(function (t, x) {
        return t + (so.indexOf(x.conta) >= 0
          ? (campo === 'prateleira' ? x.prateleira
            : campo === 'programado' ? x.programados : x.publicados) : 0);
      }, 0);
    }
    return [
      { rotulo: 'Vídeos Guardados', valor: conta('prateleira'), icone: 'box',
        cor: S.corVar(1),
        nota: 'Já estão no sistema e ainda não têm dia e hora para sair.' },
      { rotulo: 'Vídeos Agendados', valor: conta('programado'), icone: 'calendar',
        cor: S.corVar(2),
        nota: 'Têm dia e hora marcados. Saem sozinhos quando chega a vez.' },
      { rotulo: 'Já Publicados', valor: conta('publicado'), icone: 'send',
        cor: S.corVar(3),
        nota: 'O Instagram aceitou e o vídeo está no ar.' }
    ];
  }
  function guardados() { return paradas()[0].valor; }

  var RITMOS = [1, 2, 3, 5];
  function ritmoMedido() { return RESUMO.ritmo || 0; }
  function sobram(ritmo) {
    if (!ritmo) return null;
    return Math.floor(guardados() / ritmo);
  }
  function tetoSobram() {
    return Math.max(30, Math.ceil((sobram(RITMOS[0]) || 0) / 30) * 30);
  }
  function acaba(ritmo) {
    var d = sobram(ritmo);
    if (d == null) return '';
    var f = new Date(HOJE.getTime() + d * 86400000);
    return f.getDate() + ' ' + MES[f.getMonth()]
      + (f.getFullYear() !== HOJE.getFullYear() ? ' de ' + f.getFullYear() : '');
  }

  /* --------------------------------------------------- as publicacoes por dia */
  function publicacoesPorDia(janela) {
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
  function diasComSaida(janela) {
    return MAQUINA.slice(-janela).filter(function (d) { return d.saidas; }).length;
  }

  /* ---------------------------------------------------- as pastas de video */
  function pastas() {
    var v = visiveis().map(function (p) { return p.u; });
    return LEVAS.filter(function (x) {
      return filtro.tipo === 'todos' || v.indexOf(x.conta) >= 0;
    }).slice().sort(function (a, b) { return b.total - a.total; });
  }
  function pilhaDasPastas() {
    var l = pastas();
    return {
      linhas: l.map(function (x) { return x.nome; }),
      series: [
        { nome: 'Guardados', cor: S.corVar(1),
          vals: l.map(function (x) { return x.prateleira; }) },
        { nome: 'Agendados', cor: S.corVar(2),
          vals: l.map(function (x) { return x.programados; }) },
        { nome: 'Publicados', cor: S.corVar(3),
          vals: l.map(function (x) { return x.publicados; }) },
        { nome: 'Com Erro', cor: S.corVar(5),
          vals: l.map(function (x) { return x.erro; }) }
      ]
    };
  }
  function material() {
    var vistas = {};
    var fora = pastas().map(function (x) {
      vistas[x.nome] = 1;
      return { nome: x.nome, videos: x.total, ligada: true, conta: x.conta };
    });
    if (filtro.tipo === 'todos') {
      (FONTE.pastas || []).forEach(function (p) {
        if (vistas[p.nome]) return;
        fora.push({ nome: p.nome, videos: p.videos || 0, ligada: false, conta: '' });
      });
    }
    return fora.sort(function (a, b) { return b.videos - a.videos; });
  }
  function listaCaixas(itens) {
    if (!itens.length) return '<p class="rs-sem">Nenhuma pasta de vídeo aqui.</p>';
    var max = Math.max.apply(null, itens.map(function (i) {
      return i.videos; }).concat([1]));
    return '<div class="rs-lista">' + itens.map(function (i) {
      var cor = i.ligada ? S.corVar(1) : S.corVar(4);
      return '<div class="rs-li semi' + (i.videos ? '' : ' pn-zero') + '">'
        + '<span class="nm"><b>' + S.seguro(i.nome) + '</b>'
        + S.seguro(i.ligada ? (i.conta ? 'do perfil @' + i.conta
                                       : 'sem perfil escolhido')
                            : 'está no Drive e ainda não entrou no sistema')
        + '</span>'
        + '<span class="vl rs-tn">' + S.fmt(i.videos) + '<small>'
        + (i.videos ? 'vídeos' : 'vazia') + '</small></span>'
        + '<span class="rs-li-tr"><i style="width:'
        + ((i.videos / max) * 100).toFixed(1) + '%;background:linear-gradient(90deg,'
        + S.corFraca(cor, 55) + ',' + cor + ')"></i></span></div>';
    }).join('') + '</div>';
  }

  /* ================================================= O QUE ESTA' IMPEDINDO
     Cada linha e' um motivo de nada estar saindo agora, e cada uma leva o botao
     que resolve. Lista vazia e' a tela que se quer ver. */
  function impedimentos() {
    var l = [];
    var p = paradas();
    if (!FONTE.pronta) {
      l.push({ ico: 'plug', cl: 'am', titulo: 'O Drive Não Está Respondendo',
        desc: FONTE.motivo || 'A última leitura do Drive não voltou',
        botao: 'Abrir Mídia', grave: true });
    }
    if (ESTEIRA.erro) {
      l.push({ ico: 'triangle-alert', cl: 'am',
        titulo: S.fmt(ESTEIRA.erro) + (ESTEIRA.erro > 1 ? ' Vídeos Recusados'
                                                        : ' Vídeo Recusado'),
        desc: 'O Instagram recusou o envio e o motivo está gravado',
        botao: 'Ver O Erro', grave: true });
    }
    if (!p[1].valor && p[0].valor) {
      l.push({ ico: 'calendar', cl: 'am', titulo: 'Nenhum Vídeo Agendado',
        desc: S.fmt(p[0].valor) + ' vídeos guardados e nenhum com dia e hora '
          + 'marcados. Nada vai sair sozinho.',
        botao: 'Programar', grave: true });
    }
    if (!p[0].valor) {
      l.push({ ico: 'box', cl: 'am', titulo: 'Não Há Vídeo Guardado',
        desc: 'Sem vídeo no sistema não há o que agendar',
        botao: 'Escolher Uma Pasta', grave: true });
    }
    visiveis().forEach(function (x) {
      if (x.ligada) return;
      l.push({ ico: 'plug', cl: 'am', titulo: 'O Perfil @' + x.u + ' Está Fora',
        desc: 'A última leitura do Instagram não encontrou este perfil no ar',
        botao: 'Ver O Perfil', grave: true });
    });
    pastas().forEach(function (x) {
      if (x.total) return;
      l.push({ ico: 'folder', cl: '',
        titulo: 'A Pasta ' + x.nome + ' Está Vazia',
        desc: 'Escolhida ' + idade(x.ligada_em) + ' e nenhum vídeo foi encontrado '
          + 'dentro dela', botao: 'Ver A Pasta' });
    });
    pastas().forEach(function (x) {
      if (!x.total || x.conta) return;
      l.push({ ico: 'circle-slash', cl: '',
        titulo: 'A Pasta ' + x.nome + ' Não Tem Perfil',
        desc: 'Sem perfil escolhido, os vídeos dela não podem ser agendados',
        botao: 'Escolher O Perfil' });
    });
    visiveis().forEach(function (x) {
      if (!x.ultima || dias(x.ultima) < 30) return;
      l.push({ ico: 'clock', cl: '',
        titulo: '@' + x.u + ' Não Publica ' + idade(x.ultima),
        desc: x.guardados ? S.fmt(x.guardados) + ' vídeos guardados esperando'
                          : 'e não tem vídeo guardado para usar',
        botao: 'Programar' });
    });
    return l;
  }

  /* A fita: o que saiu por ultimo, do mais novo para o mais velho. */
  function ultimas(janela) {
    return posts(janela || 90).slice().reverse().map(function (p) {
      return { ico: 'send', cl: 'ok', titulo: p.legenda || 'Sem legenda',
        sub: '@' + p.perfil + ' · ' + (p.fmt === 'carrossel' ? 'Carrossel' : 'Reel'),
        q1: idade(p.quando), q2: S.fmt(p.vis) + ' visualizações',
        link: p.endereco };
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

  /* ------------------------------------------------------- o filtro, em tela
     Uma fileira so': Todos, cada etiqueta, cada mercado. A etiqueta vem da aba de
     Contas, que e' onde ele a escreve. */
  function barraFiltro(id) {
    function bt(tipo, valor, rotulo, quantos) {
      var vivo = filtro.tipo === tipo && filtro.valor === valor;
      return '<button type="button" data-t="' + tipo + '" data-v="'
        + S.seguro(valor) + '"' + (vivo ? ' class="on"' : '') + '>'
        + S.seguro(rotulo) + '<b>' + quantos + '</b></button>';
    }
    function maiuscula(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
    var b = [bt('todos', '', 'Todos Os Perfis', PERFIS.length)];
    ETIQUETAS.forEach(function (e) {
      b.push(bt('etiqueta', e, maiuscula(e), PERFIS.filter(function (p) {
        return p.etiquetas.indexOf(e) >= 0; }).length));
    });
    MERCADOS.forEach(function (m) {
      b.push(bt('mercado', m, maiuscula(m), PERFIS.filter(function (p) {
        return p.mercado === m; }).length));
    });
    return '<div class="rs-seg pn-filtro" id="' + id + '">' + b.join('') + '</div>';
  }
  function ligarFiltro(id, aoTrocar) {
    var cx = document.getElementById(id);
    if (!cx) return;
    cx.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-t]');
      if (!b) return;
      [].forEach.call(cx.querySelectorAll('button'), function (o) {
        o.classList.toggle('on', o === b);
      });
      escolher(b.dataset.t, b.dataset.v);
      aoTrocar();
    });
  }

  window.PN = {
    PERFIS: PERFIS, LEVAS: LEVAS, ESTEIRA: ESTEIRA, RESUMO: RESUMO,
    MAQUINA: MAQUINA, SAIDAS: SAIDAS, FONTE: FONTE, HOJE: HOJE, RITMOS: RITMOS,
    ETIQUETAS: ETIQUETAS, MERCADOS: MERCADOS, DIAS_SEM: DIAS_SEM,
    dia: dia, dias: dias, idade: idade, data: data,
    escolher: escolher, escolhaAtual: escolhaAtual, rotuloFiltro: rotuloFiltro,
    visiveis: visiveis, barraFiltro: barraFiltro, ligarFiltro: ligarFiltro,
    posts: posts, postsAntes: postsAntes, somar: somar, resumoRede: resumoRede,
    serieRede: serieRede, temAnterior: temAnterior, porPerfil: porPerfil,
    crescimento: crescimento, viral: viral, melhores: melhores,
    mixInteracao: mixInteracao, porDiaSemana: porDiaSemana, porHora: porHora,
    matrizHora: matrizHora, curvaSeguidores: curvaSeguidores,
    paradas: paradas, guardados: guardados, ritmoMedido: ritmoMedido,
    sobram: sobram, tetoSobram: tetoSobram, acaba: acaba,
    publicacoesPorDia: publicacoesPorDia, diasComSaida: diasComSaida,
    pastas: pastas, pilhaDasPastas: pilhaDasPastas, material: material,
    listaCaixas: listaCaixas, impedimentos: impedimentos, ultimas: ultimas,
    casca: casca
  };
})();
