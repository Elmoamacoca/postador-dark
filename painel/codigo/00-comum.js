/* ============================================================================
   O QUE VARIAS ABAS USAM.

   ESTAS PECAS MORAVAM DENTRO DE `02-analytics.js`, e isso custou uma tela quebrada:
   ao refazer a aba de Analytics em 09/09, o Painel perdeu o grafico e o Calendario
   perdeu o seletor de mercado, porque os dois chamavam funcoes que viviam na folha
   de OUTRA aba. Utilitario compartilhado mora em arquivo compartilhado, e este
   arquivo carrega antes de todos.

   O que tem aqui, e quem usa:
     etiquetaHTML       a etiqueta colorida de mercado
     montarSelect       o seletor da casa                     (01-nucleo, Calendario)
     montarPaginacao    a paginacao de tela
     arrastarParaRolar  arrastar a tira com o mouse
     tempoUtil          balde de tempo, grade e marcas de eixo
     montarGrafico      o motor de grafico do Social Tracker  (05-painel)
   ========================================================================== */
// GERADO PELO CORTE DO ARQUIVO UNICO (fase 2). Ordem numerica e lei.
window.etiquetaHTML = function(nome){
  var t = String(nome == null ? "" : nome);
  var seguro = t.replace(/&/g, "&amp;").replace(/</g, "&lt;")
                .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  var adulta = t.toLowerCase().indexOf("modelo") !== -1;
  var h = 0;
  for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 360;
  return '<span class="badge badge-etq' + (adulta ? ' adulto' : '') + '"' +
         (adulta ? '' : ' style="--etq-h:' + h + '"') + '>' +
         '<svg viewBox="0 0 24 24"><use href="#' +
         (adulta ? 'i-adulto' : 'i-etq') + '"/></svg>' + seguro + '</span>';
};

window.montarSelect = function(pre, opcoes, escolhido, aoEscolher){
  var gat = document.getElementById(pre + "g"), val = document.getElementById(pre + "v"),
      lis = document.getElementById(pre + "l"), gru = document.getElementById(pre + "gr");
  if (!gat || !lis) return function(){ return escolhido; };
  var atual = escolhido;
  var MARCA = '<span class="sel-marca"><svg viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>';
  function rotulo(v){
    var o = opcoes.filter(function(x){ return x.v === v; })[0];
    return o ? o.r : "";
  }
  function pintar(){
    gru.innerHTML = opcoes.map(function(o){
      return '<button class="sel-item" type="button" role="option" data-v="' +
        String(o.v).replace(/"/g, "&quot;") + '" aria-selected="' + (o.v === atual) +
        '"><span class="sel-item-texto">' + o.r + '</span>' +
        (o.v === atual ? MARCA : '') + '</button>';
    }).join("");
  }
  gat.addEventListener("click", function(){
    var abre = !lis.classList.contains("aberta");
    if (abre) pintar();
    lis.classList.toggle("aberta", abre);
    gat.setAttribute("aria-expanded", abre ? "true" : "false");
  });
  lis.addEventListener("click", function(ev){
    var b = ev.target.closest(".sel-item");
    if (!b) return;
    atual = b.dataset.v;
    val.textContent = rotulo(atual);
    lis.classList.remove("aberta");
    gat.setAttribute("aria-expanded", "false");
    aoEscolher(atual);
  });
  // Clicar fora fecha. O caminho do evento e' lido com `composedPath` porque a lista e'
  // reescrita a cada abertura, e `closest` num no' ja' descartado devolve nada.
  document.addEventListener("click", function(ev){
    var c = ev.composedPath ? ev.composedPath() : [ev.target];
    var dentro = c.some(function(x){
      return x && x.matches && x.matches("#" + pre + ", #" + pre + " *"); });
    if (!dentro){ lis.classList.remove("aberta");
                  gat.setAttribute("aria-expanded", "false"); }
  });
  val.textContent = rotulo(atual);
  return function(){ return atual; };
};

// A PAGINACAO E' DE TELA. Todos os itens ja' vieram dentro da pagina; virar de pagina e'
// esconder e mostrar, sem tocar a rede. Com cento e cinquenta publicacoes isso e'
// instantaneo. Quando o acervo passar de alguns milhares, e' aqui que entra a busca por
// pedaco: a marcacao continua a mesma, muda so' quem enche a lista.
window.montarPaginacao = function(pre, alvo, tam){
  var num = function(v){ return Math.round(v||0).toLocaleString("pt-BR"); };
  var id = function(s){ return document.getElementById(s); };
  var todos = [].slice.call(alvo.children), lista = todos, pag = 1;
  var conta = id(pre + "-conta"),
      bIni = id(pre + "-ini"), bAnt = id(pre + "-ant"),
      bProx = id(pre + "-prox"), bFim = id(pre + "-fim");
  function pintar(){
    var paginas = Math.max(1, Math.ceil(lista.length / tam));
    if (pag > paginas) pag = paginas;
    todos.forEach(function(el){ el.hidden = true; });
    lista.slice((pag - 1) * tam, (pag - 1) * tam + tam)
         .forEach(function(el){ el.hidden = false; });
    conta.textContent = "Pág. " + pag + "/" + paginas + " · " + num(lista.length) +
                        (lista.length === 1 ? " item" : " itens");
    // Quem entrou na pagina agora tambem precisa da animacao de entrada. Sem isto, a
    // pagina 2 aparece parada, porque o observador so' conhecia os nos do primeiro sorteio.
    if (window.olharPecas) window.olharPecas(alvo);
    bIni.disabled = bAnt.disabled = (pag === 1);
    bProx.disabled = bFim.disabled = (pag === paginas);
  }
  bIni.addEventListener("click", function(){ pag = 1; pintar(); });
  bAnt.addEventListener("click", function(){ pag = Math.max(1, pag - 1); pintar(); });
  bProx.addEventListener("click", function(){ pag = pag + 1; pintar(); });
  bFim.addEventListener("click", function(){
    pag = Math.max(1, Math.ceil(lista.length / tam)); pintar(); });
  pintar();
  return {
    tamanho: function(t){ tam = Number(t) || tam; pag = 1; pintar(); },
    // Reordenar e' recolocar os nos na ordem nova: a pagina 1 tem que mostrar o primeiro
    // da ordem escolhida, e nao o primeiro que foi escrito no HTML.
    definir: function(nova){
      lista = nova;
      nova.forEach(function(el){ alvo.appendChild(el); });
      pag = 1; pintar();
    }
  };
};

(function(){
  // O REEL RODA QUANDO O MOUSE PARA EM CIMA, e nao antes.
  //
  // ELE MORA AQUI, e nao na aba de Insights, porque as galerias do perfil usam o mesmo
  // cartao. Em reel isto nao e' enfeite: a capa que o Instagram oferece para reel tem 640
  // de largura contra 1080 do feed (medido em 16/08, e o endereco e' assinado com o
  // tamanho dentro, entao pedir maior devolve 403). O video e' a unica forma de ver aquele
  // reel nitido, e por isso ele acompanha o cartao para onde o cartao for. A animacao nao veio dentro da
  // pagina: ela e' buscada no primeiro passar de mouse daquele quadradinho e fica
  // guardada, entao a segunda vez e' instantanea. Uma galeria de oitenta reels abre com
  // zero animacao carregada, e so' custa o que o Gabriel realmente olhou.
  function rodar(cartao){
    var thumb = cartao.querySelector(".gthumb");
    if (!thumb || thumb.querySelector("video")) return;
    var v = document.createElement("video");
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
    v.preload = "auto"; v.className = "video";
    // O VIDEO NASCE INVISIVEL E SO' APARECE QUANDO TEM QUADRO PARA MOSTRAR.
    //
    // Ele entra por cima da imagem parada, e um video ainda vazio pinta o proprio fundo:
    // era isso o retangulo preto que aparecia ao passar o mouse. O quadro nao vem no
    // mesmo instante em que o elemento entra, entao entre um e outro o cartao ficava
    // preto justamente enquanto a pessoa olhava para ele.
    //
    // O `poster` cobre esse intervalo com a mesma imagem que ja' estava ali, e o
    // `loadeddata` so' revela o video quando existe imagem de verdade dentro dele.
    var img = thumb.querySelector("img.cheia");
    if (img && img.getAttribute("src")) v.poster = img.getAttribute("src");
    v.addEventListener("loadeddata", function(){ v.classList.add("pronto"); });
    v.src = cartao.dataset.mid;
    thumb.appendChild(v);
    var p = v.play();
    if (p && p.catch) p.catch(function(){});
  }
  function parar(cartao){
    var v = cartao.querySelector(".gthumb video");
    // O `src` e' limpo antes de tirar o no': sem isso o Chrome segue baixando o video
    // de um quadradinho que ninguem esta' mais olhando.
    if (v){ v.pause(); v.removeAttribute("src"); v.load(); v.remove(); }
  }
  document.addEventListener("mouseover", function(ev){
    var c = ev.target.closest ? ev.target.closest('.gpost[data-mov="1"]') : null;
    if (c) rodar(c);
  });
  document.addEventListener("mouseout", function(ev){
    var c = ev.target.closest ? ev.target.closest('.gpost[data-mov="1"]') : null;
    if (c && !c.contains(ev.relatedTarget)) parar(c);
  });
})();

// ARRASTA E ROLA, no lugar da barra de rolagem.
//
// ELE MORA AQUI, e nao na aba de Insights, porque TRES telas usam o gesto: o ranking
// dos Insights, a fita de recordes do perfil e a fita de stories. Este arquivo e' o
// pacote que as tres carregam, e uma copia por tela seria tres gestos que um dia
// divergem.
//
// A barra ocupava altura embaixo de cada faixa e, com tres faixas, virava tres barras
// cinzas na tela. Arrastar e' o gesto que a propria fila sugere: ela e' horizontal, e
// horizontal se empurra.
//
// O CLIQUE CONTINUA FUNCIONANDO. So' vira arrasto depois de cinco pixels de movimento;
// abaixo disso e' clique, e o cartao abre a publicacao como sempre. Sem esse limiar,
// todo clique com a mao tremida deixaria de abrir o post.
window.arrastarParaRolar = function(tira){
  // Sem fita nao ha' gesto: quem chama passa um `getElementById`,
  // que vem vazio quando a aba nao tem o que mostrar.
  if (!tira) return;
  var pegando = false, arrastou = false, x0 = 0, rolagem0 = 0;
  tira.addEventListener("mousedown", function(ev){
    if (ev.button !== 0) return;
    pegando = true; arrastou = false;
    x0 = ev.clientX; rolagem0 = tira.scrollLeft;
    tira.classList.add("pegando");
  });
  window.addEventListener("mousemove", function(ev){
    if (!pegando) return;
    var d = ev.clientX - x0;
    if (Math.abs(d) > 5) arrastou = true;
    if (arrastou){ tira.scrollLeft = rolagem0 - d; ev.preventDefault(); }
  });
  window.addEventListener("mouseup", function(){
    if (!pegando) return;
    pegando = false;
    tira.classList.remove("pegando");
    // Solta a trava um quadro depois, senao o clique que encerra o arrasto abriria o
    // post que estava debaixo do dedo no fim do movimento.
    if (arrastou) setTimeout(function(){ arrastou = false; }, 0);
  });
  tira.addEventListener("click", function(ev){
    if (arrastou){ ev.preventDefault(); ev.stopPropagation(); }
  }, true);
};

// ====================================================== O TEMPO, PARA TODOS OS DESENHOS
//
// TRES PERGUNTAS QUE TODO DESENHO DESTE SISTEMA FAZ, e que ate' 16/08 cada um respondia
// do seu jeito: em que unidade a janela e' contada, onde cada ponto cai no papel, e como
// a data e' escrita embaixo. Tres respostas diferentes para a mesma pergunta e' o comeco
// de tres desenhos que discordam entre si.
//
// A UNIDADE SAI DA JANELA ESCOLHIDA, e nao do que por acaso ha' de dado. Era esse o
// defeito: uma conta com cinco dias de leitura desenhava a mesma coisa em 30, 90, 180 e
// 365 dias, porque o vao dos dados era o mesmo nos quatro. Quem manda e' o periodo que a
// pessoa clicou; onde nao ha' dado, o desenho fica vazio e a barra de periodo avisa.
window.tempoUtil = (function(){
  function pad(n){ return ("0" + n).slice(-2); }
  // O carimbo do balde e' LOCAL, e nao UTC. Misturar os dois punha a publicacao das 22 h
  // no balde do dia seguinte para quem esta' a oeste de Greenwich.
  function carimbo(d){
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
           "T" + pad(d.getHours()) + ":00:00";
  }

  // A JANELA ESCOLHIDA DECIDE A UNIDADE. Os cortes sao os que deixam a contagem de
  // colunas legivel: 24 colunas em 24 h, 30 em 30 dias, 13 em 90, 26 em 180, 12 em um ano.
  var ESCADA = [
    {ate: 2,    passo: "hora",   rot: "por hora",   uni: "uma hora"},
    {ate: 45,   passo: "dia",    rot: "por dia",    uni: "um dia"},
    {ate: 200,  passo: "semana", rot: "por semana", uni: "uma semana"},
    {ate: 1e9,  passo: "mes",    rot: "por mês",    uni: "um mês"}
  ];
  function balde(dias){
    for (var i = 0; i < ESCADA.length; i++)
      if (dias <= ESCADA[i].ate) return ESCADA[i];
    return ESCADA[ESCADA.length - 1];
  }

  function inicio(quando, passo){
    var d = new Date(quando);
    if (isNaN(d)) return "";
    if (passo === "hora"){ d.setMinutes(0, 0, 0); }
    else if (passo === "dia"){ d.setHours(0, 0, 0, 0); }
    else if (passo === "mes"){ d.setHours(0, 0, 0, 0); d.setDate(1); }
    else { d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); }
    return carimbo(d);
  }
  function proximo(chave, passo){
    var d = new Date(chave);
    if (passo === "hora") d.setHours(d.getHours() + 1);
    else if (passo === "dia") d.setDate(d.getDate() + 1);
    else if (passo === "semana") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    return carimbo(d);
  }
  // TODAS AS COLUNAS DA JANELA, inclusive as vazias. Sem elas, uma conta que so' publicou
  // na terca teria uma coluna so' no meio de trinta dias de nada, e o desenho diria que a
  // janela inteira e' aquela terca.
  function grade(t0, t1, passo){
    var fora = [], k = inicio(t0, passo), guarda = 0;
    while (Date.parse(k) <= t1 && guarda++ < 500){
      fora.push(k);
      k = proximo(k, passo);
    }
    return fora;
  }
  // Soma os pares [quando, valor] dentro de cada coluna da grade.
  function somar(pares, passo, colunas){
    var mapa = {};
    (pares || []).forEach(function(p){
      var k = inicio(p[0], passo);
      if (k) mapa[k] = (mapa[k] || 0) + p[1];
    });
    if (!colunas) colunas = Object.keys(mapa).sort();
    return colunas.map(function(k){ return [k, mapa[k] || 0]; });
  }
  // O ultimo valor conhecido dentro de cada coluna (serve para nivel, e nao para soma).
  function ultimoDe(pares, passo, colunas){
    var mapa = {};
    (pares || []).forEach(function(p){
      var k = inicio(p[0], passo);
      if (k) mapa[k] = p[1];
    });
    return (colunas || Object.keys(mapa).sort()).map(function(k){
      return [k, mapa[k]]; }).filter(function(p){ return p[1] != null; });
  }

  var MES = ["jan", "fev", "mar", "abr", "mai", "jun",
             "jul", "ago", "set", "out", "nov", "dez"];
  // O rotulo CURTO de uma coluna, para caber embaixo dela na regua.
  function marcaCurta(chave, passo){
    var d = new Date(chave);
    if (isNaN(d)) return String(chave);
    var dm = pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
    if (passo === "hora") return dm + " " + pad(d.getHours()) + "h";
    if (passo === "mes")  return MES[d.getMonth()] + "/" + String(d.getFullYear()).slice(2);
    return dm;
  }
  function rotulo(chave, passo){
    var d = new Date(chave);
    if (isNaN(d)) return String(chave);
    var dm = pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
    if (passo === "hora") return dm + " " + pad(d.getHours()) + "h";
    if (passo === "mes")  return MES[d.getMonth()] + "/" + String(d.getFullYear()).slice(2);
    if (passo === "semana") return "semana de " + dm;
    return dm + "/" + String(d.getFullYear()).slice(2);
  }

  // AS MARCAS DA REGUA CAEM EM TEMPOS REDONDOS: 1 h, 6 h, um dia, uma semana, um mes, um
  // ano. Dividir o vao em oito partes iguais dava marca em "16:32" no meio de uma fileira
  // de dias, e uma regua com marca em hora quebrada nao e' regua.
  var PASSOS = [3600e3, 3 * 3600e3, 6 * 3600e3, 12 * 3600e3, 86400e3, 2 * 86400e3,
                7 * 86400e3, 14 * 86400e3, 30 * 86400e3, 90 * 86400e3, 365 * 86400e3];
  function marcas(t0, t1, larg, porRotulo){
    var cabem = Math.max(2, Math.floor(larg / (porRotulo || 100)));
    var minimo = (t1 - t0) / cabem, passoT = PASSOS[PASSOS.length - 1];
    for (var i = 0; i < PASSOS.length; i++)
      if (PASSOS[i] >= minimo){ passoT = PASSOS[i]; break; }
    var fora = [];
    // Mes e ano andam por calendario, e nao por trinta dias: "01/09, 01/10, 01/11" e'
    // regua; "01/09, 01/10, 31/10" e' o vao dividido por trinta.
    if (passoT >= 30 * 86400e3){
      var d = new Date(t0);
      d.setHours(0, 0, 0, 0); d.setDate(1);
      var salto = passoT >= 365 * 86400e3 ? 12 : (passoT >= 90 * 86400e3 ? 3 : 1);
      while (d.getTime() < t0) d.setMonth(d.getMonth() + salto);
      for (var g = 0; d.getTime() <= t1 && g < 200; g++){
        fora.push({t: d.getTime(),
                   rot: MES[d.getMonth()] + "/" + String(d.getFullYear()).slice(2)});
        d.setMonth(d.getMonth() + salto);
      }
      return fora;
    }
    var a = new Date(t0);
    a.setHours(0, 0, 0, 0);
    var tm = a.getTime();
    while (tm < t0 - passoT) tm += passoT;
    for (var h = 0; tm <= t1 && h < 400; h++, tm += passoT){
      if (tm < t0) continue;
      var x = new Date(tm);
      fora.push({t: tm, rot: passoT < 86400e3
        ? pad(x.getDate()) + "/" + pad(x.getMonth() + 1) + " " + pad(x.getHours()) + "h"
        : pad(x.getDate()) + "/" + pad(x.getMonth() + 1)});
    }
    return fora;
  }

  return {balde: balde, inicio: inicio, proximo: proximo, grade: grade,
          somar: somar, ultimoDe: ultimoDe, rotulo: rotulo, marcaCurta: marcaCurta,
          marcas: marcas, MES: MES};
})();

window.montarGrafico = function(raiz){
  // OS DADOS PODEM CHEGAR PRONTOS. Na aba de Insights a pagina e' escrita em Python e as
  // series viajam num `script` de JSON ao lado do desenho; no perfil, que e' escrito no
  // proprio navegador, elas ja' estao na memoria e passar por texto seria uma volta a toa.
  var dados = raiz.dadosProntos;
  if (!dados){
    var fonte = document.getElementById(raiz.dataset.dados);
    if (!fonte) return;
    dados = JSON.parse(fonte.textContent);
  }
  var tela  = raiz.querySelector(".grafico-tela"),
      balao = raiz.querySelector(".grafico-balao"),
      abas  = [].slice.call(raiz.querySelectorAll(".gaba"));
  // O EIXO E' O TEMPO quando todo ponto traz data, e nao a posicao na lista. Duas series
  // de tamanhos diferentes esticadas pela largura toda punham o ponto 3 de uma em cima do
  // ponto 18 da outra: duas curvas contando dias diferentes no mesmo lugar do papel.
  //
  // O DOMINIO PODE VIR DE FORA (`dados.dominio`), e e' assim que o periodo escolhido
  // manda no desenho: escolher 90 dias desenha 90 dias, mesmo que so' os ultimos cinco
  // tenham medida. Sem isso, 30, 90, 180 e 365 saiam identicos numa conta nova.
  function _t(p){ var v = Date.parse(p[0]); return isNaN(v) ? null : v; }
  var temTempo = dados.chaves.every(function(c){
    return !c.vals.length || c.vals.every(function(p){ return _t(p) != null; }); });
  var dt0 = null, dt1 = null;
  if (temTempo){
    if (dados.dominio){ dt0 = dados.dominio[0]; dt1 = dados.dominio[1]; }
    else {
      dados.chaves.forEach(function(c){
        c.vals.forEach(function(p){
          var v = _t(p);
          if (dt0 === null || v < dt0) dt0 = v;
          if (dt1 === null || v > dt1) dt1 = v;
        });
      });
    }
    if (dt0 === null || !(dt1 > dt0)) temTempo = false;
  }

  var ligadas = dados.chaves.filter(function(c){ return c.ligada && c.vals.length; })
                            .map(function(c){ return c.k; });
  if (!ligadas.length){
    var pri = dados.chaves.filter(function(c){ return c.vals.length; })[0];
    if (pri) ligadas = [pri.k];
  }
  var geo = null;

  function serie(k){
    for (var i = 0; i < dados.chaves.length; i++)
      if (dados.chaves[i].k === k) return dados.chaves[i];
    return null;
  }
  function vivas(){
    return ligadas.map(serie).filter(function(s){ return s && s.vals.length; });
  }
  function n(v){ return (v || 0).toLocaleString("pt-BR"); }
  // A CASA DECIMAL SAI DO PASSO DA REGUA, e nao do valor. Uma casa fixa escrevia
  // "104,4M" em cinco marcas seguidas: uma conta de cem milhoes que anda cinquenta mil
  // por leitura tem a regua inteira dentro da mesma primeira casa. E regua que repete o
  // mesmo rotulo nao e' regua.
  function curto(v, pa){
    var s = v < 0 ? "-" : "";
    v = Math.abs(v);
    pa = Math.abs(pa) || v;
    function corta(x, base){
      var casas = Math.max(0, Math.min(3,
        Math.ceil(-Math.log(pa / base) / Math.LN10)));
      return (x / base).toFixed(casas).replace(".", ",").replace(/,0+$/, "");
    }
    if (v >= 1e6) return s + corta(v, 1e6) + "M";
    if (v >= 1e3) return s + corta(v, 1e3) + "k";
    return s + n(Math.round(v));
  }
  function quando(iso){
    var s = String(iso);
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(s)) return s;
    var hora = s.slice(11, 16);
    // "00:00" e' o carimbo de uma COLUNA de dia, de semana ou de mes, e nao uma leitura
    // da meia-noite: escrever a hora ali inventaria uma precisao que a coluna nao tem.
    return s.slice(8, 10) + "/" + s.slice(5, 7) +
           (hora && hora !== "00:00" ? " · " + hora : "");
  }
  function passo(bruto){
    if (!(bruto > 0)) return 1;
    var p = Math.pow(10, Math.floor(Math.log(bruto) / Math.LN10)), r = bruto / p;
    return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * p;
  }

  // CADA SERIE TEM A PROPRIA ESCALA. Curtida anda na casa dos cento e sessenta mil e
  // comentario na dos mil: num eixo so', a curva de comentario vira uma linha reta
  // colada no chao e a comparacao nao diz nada. Com escala propria, o que se compara e'
  // o FORMATO das duas curvas, que e' a pergunta ("as duas subiram junto?"). Por isso o
  // eixo da esquerda so' mostra numero quando ha' uma serie escolhida: com duas ou mais,
  // numero ali seria de qual delas? O valor de verdade de cada uma esta' no balao.
  function escala(s, alt, topo){
    var vals = s.vals.map(function(v){ return v[1]; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    // SERIE TODA EM ZERO NAO DESENHA EIXO DE -1 A 1. Contagem nao tem valor negativo, e
    // "menos um post" nao existe: o chao e' o zero e o teto vira um.
    if (hi === lo && lo === 0){ hi = 1; }
    else if (hi === lo){ hi = lo + 1; lo = Math.min(lo - 1, 0); }
    var pa = passo((hi - lo) / 3);
    var piso = Math.floor(lo / pa) * pa, teto = Math.ceil(hi / pa) * pa;
    if (teto === piso) teto = piso + pa;
    return {piso: piso, teto: teto, pa: pa,
            y: function(v){ return topo + alt - alt * (v - piso) / (teto - piso); }};
  }

  function desenhar(){
    tela.innerHTML = "";
    esconder();
    var ss = vivas();
    if (!ss.length){
      var q = serie(ligadas[0]) || dados.chaves[0];
      tela.innerHTML = '<p class="grafico-sem">' +
        ((q && q.motivo) || "ainda sem série suficiente para o gráfico") + "</p>";
      geo = null;
      return;
    }
    var L = Math.max(260, Math.round(tela.clientWidth));
    var A = Math.max(220, Math.round(tela.clientHeight) || 300);
    // A DIREITA PRECISA DE FOLGA: a ultima data e' escrita a partir do ultimo ponto, e
    // com a folga velha de 14 pixels ela saia meia letra para fora do cartao.
    // O EIXO DA ESQUERDA ENCOLHE QUANDO O DESENHO E' ESTREITO. Com dois cartoes por
    // linha sobram uns 340 pixels de grafico: 56 so' para os numeros do eixo seriam um
    // sexto do desenho gasto em rotulo. Com duas ou mais series o eixo nem aparece, e ai'
    // a folga da esquerda e' so' a que a curva precisa para nao encostar na borda.
    var esq = ss.length === 1 ? (L < 480 ? 54 : 64) : 14;
    var dire = L < 480 ? 26 : 34, topo = 18, baixo = 28;
    var larg = L - esq - dire, alt = A - topo - baixo;
    var base = ss[0], ult = base.vals.length - 1;
    var barra = raiz.dataset.vista === "barra";

    // A VAGA E' O MENOR PASSO DE TEMPO entre dois pontos vizinhos, e e' dela que sai a
    // largura da barra. Com a largura tirada da CONTAGEM de pontos, trinta colunas numa
    // janela de trinta dias e cinco colunas numa de cinco dias saiam com a mesma
    // espessura, e o desenho perdia a nocao de quanto tempo cada coluna cobre.
    var vagaMs = Infinity, j2;
    if (temTempo)
      ss.forEach(function(s){
        for (j2 = 1; j2 < s.vals.length; j2++)
          vagaMs = Math.min(vagaMs, _t(s.vals[j2]) - _t(s.vals[j2 - 1]));
      });
    if (!(vagaMs > 0) || vagaMs === Infinity) vagaMs = (dt1 - dt0) / 30;
    var maxN = Math.max.apply(null, ss.map(function(s){ return s.vals.length; }));
    var vagaPx = temTempo ? larg * vagaMs / (dt1 - dt0) : larg / Math.max(1, maxN);
    var lb = barra ? Math.max(1.2, Math.min(46, vagaPx * .72 / ss.length)) : 0;
    var folga = barra ? Math.min(larg * .06, lb * ss.length / 2) : 0;

    // SERIE DE COLUNAS OU SERIE DE PONTOS? Uma serie agregada -- ganho por mes, publicacao
    // por semana -- tem o carimbo no COMECO da coluna, e a barra dela precisa cobrir a
    // coluna. Uma serie de pontos -- uma leitura, uma publicacao -- e' um instante, e a
    // barra fica centrada nele. O que separa as duas e' o passo: coluna tem passo
    // constante, ponto nao tem. Mes varia de 28 a 31 dias, entao a folga e' generosa.
    // O DESLOCAMENTO E' POR SERIE, e nao do desenho inteiro: um cartao pode ter a curva
    // de seguidores (pontos soltos no tempo) ao lado do ganho por mes (colunas). Medir os
    // dois com a mesma regua deslocaria a curva meio mes sem motivo.
    var algumaColuna = false;
    ss.forEach(function(s){
      s._desl = 0;
      if (!temTempo || s.vals.length < 2) return;
      var passos = [];
      for (var q = 1; q < s.vals.length; q++)
        passos.push(_t(s.vals[q]) - _t(s.vals[q - 1]));
      var mn = Math.min.apply(null, passos), mx = Math.max.apply(null, passos);
      // Coluna tem passo constante; ponto nao tem. Mes varia de 28 a 31 dias, entao a
      // folga e' generosa.
      if (mx <= mn * 1.6){
        s._coluna = mn;
        s._desl = larg * mn / (dt1 - dt0) / 2;
        algumaColuna = true;
      }
    });
    var x = temTempo
      ? function(i, s){
          var d = (s || base);
          var v = _t(d.vals[i]);
          // O PONTO DE UMA COLUNA MORA NO MEIO DELA. Carimbado no comeco, o ponto de
          // agosto cai no dia 1o e a curva anda meio mes atrasada em relacao ao rotulo.
          return esq + folga + (larg - 2 * folga) * (v - dt0) / (dt1 - dt0) +
                 (barra ? 0 : (d._desl || 0));
        }
      : function(i, s){
          var n = ((s || base).vals.length - 1) || 1;
          return esq + folga + (larg - 2 * folga) * i / n;
        };

    var grade = "", defs = "", areas = "", curvas = "", rot = "";
    var e0 = escala(base, alt, topo);
    var marcos = [];
    for (var v = e0.piso; v <= e0.teto + 1e-9; v += e0.pa) marcos.push(v);
    // O EIXO NÃO PODE REPETIR O MESMO RÓTULO. Encurtar 4.150 e 4.200 dá "4,2k" nos dois,
    // e aí a régua diz que dois traços diferentes valem o mesmo. Quando o encurtado
    // repete, todos voltam inteiros: é a mesma saída do rótulo de "de → para".
    var curtos = marcos.map(function(v){ return curto(v, e0.pa); });
    var repete = curtos.some(function(c, i){ return curtos.indexOf(c) !== i; });
    marcos.forEach(function(v, i){
      var yy = e0.y(v);
      grade += '<line class="gg" x1="' + esq + '" y1="' + yy.toFixed(1) +
               '" x2="' + (esq + larg) + '" y2="' + yy.toFixed(1) + '"/>';
      if (ss.length === 1)
        rot += '<text class="gt" x="' + (esq - 10) + '" y="' + (yy + 4).toFixed(1) +
               '" text-anchor="end">' + (repete ? n(v) : curtos[i]) + "</text>";
    });

    // O DEGRADE EMBAIXO DA CURVA E' DE TODAS AS SERIES, sempre. Eu tinha desligado ele
    // quando havia mais de uma, com medo de uma tampar a outra; o Gabriel viu isso como
    // o efeito sumindo ao escolher a segunda metrica, e ele tem razao. A saida certa nao
    // e' tirar o degrade, e' baixar a tinta dele quando ha' companhia: com duas ou mais,
    // ele entra pela metade da forca e as duas continuam se vendo.
    var forte = ss.length === 1 ? ".26" : ".13";
    var barras = "", marcas = "";

    // A LOGO DA SERIE, DENTRO DO DESENHO. Com uma linha por conta, legenda em texto
    // obriga a ir e voltar entre a fileira e a curva. O retrato na ponta resolve isso
    // de uma olhada. So' entra quando a serie traz `logo`.
    function selo(sr, cx, cy, k2){
      if (!sr.logo) return;
      // PRESA DENTRO DO PAPEL. Em cima da barra mais alta, ou na ponta de uma curva que
      // encosta no teto, o retrato saia pela borda e aparecia cortado ao meio.
      cx = Math.max(esq + 17, Math.min(cx, esq + larg - 17));
      cy = Math.max(topo + 17, Math.min(cy, topo + alt - 17));
      var id = (raiz.dataset.dados || "g") + "-selo" + k2;
      marcas += '<clipPath id="' + id + '"><circle cx="' + cx.toFixed(1) + '" cy="' +
        cy.toFixed(1) + '" r="13"/></clipPath>' +
        '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) +
        '" r="14.5" fill="var(--branco)" style="stroke:' + sr.cor + '" stroke-width="2.5"/>' +
        '<image href="' + sr.logo + '" x="' + (cx - 13).toFixed(1) + '" y="' +
        (cy - 13).toFixed(1) + '" width="26" height="26" clip-path="url(#' + id + ')" ' +
        'preserveAspectRatio="xMidYMid slice"/>';
    }
    ss.forEach(function(s, k){
      var e = escala(s, alt, topo), u = s.vals.length - 1;
      s._e = e; s._u = u;
      if (barra){
        // O CHAO E' O ZERO, PRESO DENTRO DA FAIXA DA REGUA. Numa serie que cruza o zero
        // ele fica no meio e a barra desce; numa que nunca chega perto dele -- cem
        // milhoes de seguidores que andam mil por dia -- ele e' o pe' do desenho, e o
        // rotulo do eixo ali do lado diz de onde a barra esta' saindo. Forcar o zero
        // nesse caso desenharia sessenta blocos identicos.
        var chao = e.y(Math.min(Math.max(0, e.piso), e.teto));
        var ultimoX = null;
        for (var b = 0; b <= u; b++){
          ultimoX = x(b, s) + s._desl - lb * ss.length / 2 + k * lb + lb / 2;
          // COLUNA DE ZERO NAO VIRA TRACO. Com a altura minima de um pixel, os onze
          // meses sem publicacao desenhavam onze risquinhos em cima do eixo, e a linha
          // do zero virava tracejado.
          if (!s.vals[b][1]) continue;
          var yv = e.y(s.vals[b][1]);
          s._ultimaBarra = [x(b, s) + s._desl - lb * ss.length / 2 + k * lb + lb / 2,
                            Math.min(yv, chao)];
          barras += '<rect class="gb" style="fill:' + s.cor + '" x="' +
            (x(b, s) + s._desl - lb * ss.length / 2 + k * lb).toFixed(1) + '" y="' +
            Math.min(yv, chao).toFixed(1) + '" width="' + lb.toFixed(1) +
            '" height="' + Math.max(1, Math.abs(yv - chao)).toFixed(1) +
            '" rx="' + Math.min(2, lb / 3).toFixed(1) + '"/>';
        }
        if (s._ultimaBarra) selo(s, s._ultimaBarra[0], s._ultimaBarra[1] - 15, k);
        else if (ultimoX !== null) selo(s, ultimoX, chao - 15, k);
        return;
      }
      var d = "M" + x(0, s).toFixed(1) + "," + e.y(s.vals[0][1]).toFixed(1);
      for (var j = 1; j <= u; j++){
        var m = (x(j-1, s) + x(j, s)) / 2;
        d += " C" + m.toFixed(1) + "," + e.y(s.vals[j-1][1]).toFixed(1) +
             " " + m.toFixed(1) + "," + e.y(s.vals[j][1]).toFixed(1) +
             " " + x(j, s).toFixed(1) + "," + e.y(s.vals[j][1]).toFixed(1);
      }
      s._d = d;
      // O NOME DO DEGRADE PRECISA SER UNICO NA PAGINA INTEIRA, e nao dentro do cartao.
      // `url(#nome)` procura o nome no documento todo e para no primeiro que encontra:
      // com dois cartoes lado a lado, os dois chamavam "grd0-334" e o segundo pintava
      // com o degrade do primeiro. Mexer numa metrica da conta A repintava a conta B.
      // O nome do proprio grafico ja' carrega o codigo da publicacao, entao serve de raiz.
      var g = raiz.dataset.dados + "-grd" + k;
      defs += '<linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + s.cor + '" stop-opacity="' + forte + '"/>' +
        '<stop offset="100%" stop-color="' + s.cor + '" stop-opacity=".02"/>' +
        "</linearGradient>";
      areas += '<path class="ga" fill="url(#' + g + ')" d="' + d + " L" +
        x(u, s).toFixed(1) + "," + (topo + alt) + " L" + x(0, s).toFixed(1) + "," +
        (topo + alt) + ' Z"/>';
      curvas += '<path class="gl" style="stroke:' + s.cor + '" d="' + d + '"/>';
      var pt = u;
      while (pt > 0 && !s.vals[pt][1]) pt--;
      selo(s, x(pt, s), e.y(s.vals[pt][1]), k);
    });
    var fundo = "<defs>" + defs + "</defs>" + grade + areas + barras;

    // A REGUA DE DATAS CAI EM TEMPOS REDONDOS, e e' a mesma regua da linha do tempo:
    // uma unica funcao responde por ela nos dois desenhos.
    var i;
    // A REGUA SEGUE AS COLUNAS quando existem colunas: o rotulo fica debaixo da barra a
    // que pertence, e nao na borda esquerda dela.
    var serieCol = null;
    ss.forEach(function(s){ if (s._coluna && (!serieCol || s.vals.length > serieCol.vals.length)) serieCol = s; });
    if (temTempo && serieCol){
      // O NOME DA UNIDADE SAI DO TAMANHO DA COLUNA, e nao da janela: uma coluna de trinta
      // dias e' um mes, e escrever "01/08" nela e' escrever o primeiro dia dela no lugar
      // do nome do mes.
      var diasCol = serieCol._coluna / 86400000;
      var passoCol = diasCol >= 27 ? "mes" : diasCol >= 6 ? "semana"
                   : diasCol >= .9 ? "dia" : "hora";
      var caber = Math.max(1, Math.ceil(serieCol.vals.length /
                                        Math.max(2, larg / (larg < 480 ? 74 : 96))));
      serieCol.vals.forEach(function(v, j){
        if (j % caber) return;
        var px = x(j, serieCol) + (barra ? serieCol._desl : 0);
        if (px < esq - 1 || px > esq + larg + 1) return;
        var anc = px - esq < 22 ? "start" : (esq + larg - px < 22 ? "end" : "middle");
        rot += '<text class="gt" x="' + px.toFixed(1) + '" y="' + (A - 8) +
               '" text-anchor="' + anc + '">' +
               window.tempoUtil.marcaCurta(v[0], passoCol) + "</text>";
      });
    } else if (temTempo){
      window.tempoUtil.marcas(dt0, dt1, larg, larg < 480 ? 74 : 96)
        .forEach(function(m){
          var px = esq + folga + (larg - 2 * folga) * (m.t - dt0) / (dt1 - dt0);
          var anc = px - esq < 22 ? "start" : (esq + larg - px < 22 ? "end" : "middle");
          rot += '<text class="gt" x="' + px.toFixed(1) + '" y="' + (A - 8) +
                 '" text-anchor="' + anc + '">' + m.rot + "</text>";
        });
    } else {
      var salto = Math.max(1, Math.ceil(base.vals.length /
                                        Math.max(2, Math.floor(larg / 74))));
      for (i = 0; i <= ult; i += salto){
        var px2 = x(i), anc2 = px2 - esq < 22 ? "start"
                            : (esq + larg - px2 < 22 ? "end" : "middle");
        rot += '<text class="gt" x="' + px2.toFixed(1) + '" y="' + (A - 8) +
               '" text-anchor="' + anc2 + '">' + base.vals[i][0] + "</text>";
      }
    }

    var pontas = ss.map(function(s, k){
      return '<circle class="gponto" data-k="' + k + '" r="4" style="display:none;' +
             'stroke:' + s.cor + '"/>';
    }).join("");
    // O MESMO CINTO DE SEGURANCA DA LINHA DO TEMPO. A regua fica fora dele, porque
    // mora nas beiradas.
    var corte = (raiz.dataset.dados || "g") + "-corte";
    tela.innerHTML =
      '<svg width="' + L + '" height="' + A + '" viewBox="0 0 ' + L + ' ' + A + '">' +
      '<defs><clipPath id="' + corte + '"><rect x="' + (esq - 1) + '" y="' + (topo - 8) +
      '" width="' + (larg + 2) + '" height="' + (alt + 16) + '"/></clipPath></defs>' +
      '<g clip-path="url(#' + corte + ')">' + fundo + curvas + '</g>' + marcas + rot +
      '<line class="gcursor" x1="0" y1="' + topo + '" x2="0" y2="' + (topo + alt) +
        '" style="display:none"/>' + pontas + "</svg>";
    geo = {ss: ss, x: x, esq: esq, larg: larg, ult: ult, base: base};
  }

  // LARGURA NOVA, DESENHO NOVO. O SVG nasce com a largura da caixa; quando o menu abre
  // ou fecha, ou a janela muda, a caixa encolhe e o desenho velho fica maior que ela.
  if (window.ResizeObserver && !raiz._olho){
    var lg = Math.round(tela.clientWidth), esperando;
    raiz._olho = new ResizeObserver(function(){
      var novo = Math.round(tela.clientWidth);
      if (!novo || Math.abs(novo - lg) < 8) return;
      lg = novo;
      clearTimeout(esperando);
      esperando = setTimeout(function(){ if (raiz.redesenhar) raiz.redesenhar(); }, 120);
    });
    raiz._olho.observe(tela);
  }

  function esconder(){
    balao.hidden = true;
    var c = tela.querySelector(".gcursor");
    if (c) c.style.display = "none";
    [].forEach.call(tela.querySelectorAll(".gponto"), function(o){ o.style.display = "none"; });
  }

  // O CURSOR PROCURA POR PIXEL, e nao por posicao na lista. Com o eixo no tempo, a
  // posicao na lista deixou de dizer onde o ponto esta': duas series podem ter contagens
  // diferentes cobrindo o mesmo vao.
  function perto(s, px){
    var i = 0, melhor = Infinity;
    for (var j = 0; j < s.vals.length; j++){
      var dx = Math.abs(geo.x(j, s) - px);
      if (dx < melhor){ melhor = dx; i = j; }
    }
    return i;
  }
  function mover(ev){
    if (!geo) return;
    var r = tela.getBoundingClientRect();
    var px = ev.clientX - r.left;
    var i = perto(geo.base, px);
    var vx = geo.x(i);
    var c = tela.querySelector(".gcursor");
    c.setAttribute("x1", vx); c.setAttribute("x2", vx); c.style.display = "";
    var linhas = "";
    geo.ss.forEach(function(s, k){
      var j = perto(s, vx);
      var o = tela.querySelector('.gponto[data-k="' + k + '"]');
      o.setAttribute("cx", geo.x(j, s)); o.setAttribute("cy", s._e.y(s.vals[j][1]));
      o.style.display = "";
      linhas += '<div class="glinha"><span class="gdot" style="background:' + s.cor +
                '"></span><span class="gnome">' + s.rot + '</span>' +
                '<span class="gval">' + n(s.vals[j][1]) + "</span></div>";
    });
    balao.innerHTML = '<div class="glabel">' + quando(geo.base.vals[i][0]) + "</div>" + linhas;
    balao.hidden = false;
    var lb = balao.offsetWidth, esq2 = vx + 14;
    if (esq2 + lb > r.width) esq2 = vx - lb - 14;
    balao.style.left = Math.max(0, esq2) + "px";
    balao.style.top = Math.max(0, (ev.clientY - r.top) - balao.offsetHeight - 14) + "px";
  }

  function pintarAbas(){
    abas.forEach(function(b){
      b.setAttribute("aria-selected", ligadas.indexOf(b.dataset.k) >= 0 ? "true" : "false");
    });
  }

  abas.forEach(function(b){
    b.addEventListener("click", function(){
      if (b.disabled) return;
      var k = b.dataset.k, i = ligadas.indexOf(k);
      // CLICAR SOMA E TIRA, e nao troca. E' o que permite comparar duas curvas no mesmo
      // desenho. A ultima escolhida nao sai: um grafico sem serie nenhuma nao existe.
      if (i >= 0){ if (ligadas.length > 1) ligadas.splice(i, 1); }
      else {
        // UMA METRICA QUE E' A SOMA DAS OUTRAS NAO DIVIDE O DESENHO COM ELAS. Engajamento
        // e' curtida mais comentario, e comentario e' um por cento do total: desenhado ao
        // lado de curtidas, ele vira uma segunda curva colada na primeira dizendo a mesma
        // coisa duas vezes, e foi o que o Gabriel viu como "nao traz". Escolher a soma
        // apaga as partes, e escolher uma parte apaga a soma.
        var nova = serie(k);
        if (nova && nova.sozinha) ligadas = [k];
        else {
          ligadas = ligadas.filter(function(x){
            var s = serie(x);
            return !(s && s.sozinha);
          });
          ligadas.push(k);
        }
      }
      pintarAbas();
      desenhar();
    });
  });
  tela.addEventListener("mousemove", mover);
  tela.addEventListener("mouseleave", esconder);
  raiz.redesenhar = desenhar;
  var antes = "";
  new ResizeObserver(function(){
    var m = Math.round(tela.clientWidth) + "x" + Math.round(tela.clientHeight);
    if (tela.clientWidth && m !== antes){ antes = m; desenhar(); }
  }).observe(tela);
  pintarAbas();
  desenhar();
};
