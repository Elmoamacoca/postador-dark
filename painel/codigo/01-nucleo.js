// GERADO PELO CORTE DO ARQUIVO UNICO (fase 2). Ordem numerica e lei.
(function(){
  'use strict';
  var raiz = document.documentElement;

  /* ------------------------------------------------------------ tema */
  var chave = document.getElementById('chave'), icone = document.getElementById('tema-icone');
  var SOL = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>';
  var LUA = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';

  function pinta(t){
    raiz.setAttribute('data-theme', t);
    localStorage.setItem('pub-tema', t);
    chave.setAttribute('aria-checked', t === 'dark');
    icone.innerHTML = t === 'dark' ? LUA : SOL;
  }
  pinta(raiz.getAttribute('data-theme'));
  function troca(){
    raiz.classList.add('trocando-tema');
    pinta(raiz.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    setTimeout(function(){ raiz.classList.remove('trocando-tema'); }, 320);
  }
  chave.addEventListener('click', troca);
  icone.parentNode.addEventListener('click', function(e){
    if (e.target.closest('#chave')) return;
    troca();
  });

  /* -------------------------------------------------- abrir e fechar o menu
     O estado fica guardado: se voce fechar hoje, amanha ele abre fechado. */
  var botao = document.getElementById('botao-menu');
  botao.setAttribute('aria-expanded', raiz.getAttribute('data-menu') === 'aberto');
  botao.addEventListener('click', function(){
    var novo = raiz.getAttribute('data-menu') === 'aberto' ? 'fechado' : 'aberto';
    raiz.setAttribute('data-menu', novo);
    localStorage.setItem('pub-menu', novo);
    botao.setAttribute('aria-expanded', novo === 'aberto');
  });

  /* -------------------------------------------------------- troca de pagina */
  var menu = document.querySelector('.menu');
  function vaiPara(nome){
    menu.querySelectorAll('[data-pag]').forEach(function(b){
      b.classList.toggle('ativo', b.dataset.pag === nome);
    });
    document.querySelectorAll('.pagina').forEach(function(p){
      p.classList.toggle('ativa', p.id === 'pag-' + nome);
    });
    // A HOME REDIMENSIONA AO VOLTAR: enquanto ela esta' escondida a largura
    // e' zero, e o ECharts nao redesenha sozinho quando a aba reaparece.
    if (nome === 'painel' && window.abrirPainel) window.abrirPainel();
    if (nome === 'analytics' && window.abrirAnalytics) window.abrirAnalytics();
    if (nome === 'calendario' && window.abrirCalendario) window.abrirCalendario();
    if (nome === 'contas' && window.abrirContas) window.abrirContas();
    scrollTo({ top:0, behavior:'instant' });
  }
  menu.addEventListener('click', function(e){
    var b = e.target.closest('[data-pag]');
    if (b) vaiPara(b.dataset.pag);
  });
  document.querySelectorAll('[data-vai]').forEach(function(b){
    b.addEventListener('click', function(){ vaiPara(b.dataset.vai); });
  });



  /* A ABA DE MIDIA SAIU DAQUI EM 10/09/2026, por ordem dele.
     Ela nao mostrava video nenhum: era so' escolher pasta do Drive,
     configuracao feita uma vez, e isso nao sustenta um lugar no menu. O que
     interessa por conta virou a SUB-ABA MIDIAS da ficha, em `08-midias.js`,
     e ligar pasta mora la' dentro, porque pasta pertence a um perfil so'. */

  /* A ABA DE CALENDARIO SAIU DAQUI EM 11/09/2026, por ordem dele.

     O que morava aqui era o calendario traduzido do ReUI: mes, semana e lista, global,
     sem conta escolhida. A aba foi refeita e agora mora em `codigo/03-calendario.js`,
     com mes e gantt sobre uma conta por vez. Ficou fora do nucleo porque o nucleo e' a
     casca do painel, e uma aba inteira dentro dele e' uma aba que ninguem acha. */

  /* -------------------------------------------------------- fichas de filtro */
  document.querySelectorAll('.filtros').forEach(function(grupo){
    var blocos = [], atual = [];
    Array.prototype.forEach.call(grupo.children, function(el){
      if (el.classList.contains('rot-filtro') || el.classList.contains('sep')){
        if (atual.length) blocos.push(atual);
        atual = [];
      } else if (el.classList.contains('chip')) atual.push(el);
    });
    if (atual.length) blocos.push(atual);
    blocos.forEach(function(bloco){
      bloco.forEach(function(c){
        c.addEventListener('click', function(){
          bloco.forEach(function(o){ o.classList.remove('on'); });
          c.classList.add('on');
        });
      });
    });
  });

  /* AS DUAS LISTAS CHUMBADAS SAIRAM EM 29/08/2026.

     Eram `RASCUNHO`, com dez contas das quais OITO ERAM INVENTADAS (@dossie.frio,
     @linha.dagua e companhia), e `CONTAS`, com o retrato das duas contas reais
     congelado em 17/08 e mais de dez mil caracteres de imagem em base64. Nenhuma das
     duas era lida por ninguem: a tabela de Contas ja vinha de `/painel/rede` e o
     assistente de programar monta a lista dele. Ficavam sendo baixadas em toda
     visita, e dado inventado a um passo de aparecer na tela por engano.

     Quem responde hoje: `/contas/estado`, que pergunta a Meta de verdade. */

  /* Com retrato usa o retrato; sem retrato, as iniciais. As telas de rascunho ainda
     nao tem foto, e nao ha porque ter dois desenhos de perfil por causa disso. */
  function perfil(c){
    var face = c.avatar
      ? '<img class="av" src="' + c.avatar + '" alt="">'
      : '<span class="av" style="background:' + c.cor + '">' + c.ini + '</span>';
    var a = c.arroba.charAt(0) === '@' ? c.arroba : '@' + c.arroba;
    return '<div class="perfil">' + face + '<div><div class="nome">' + a +
           '</div><div class="pp">' + (c.nome || c.nicho || '') + '</div></div></div>';
  }

  /* O botao do Instagram e' o FlowButton da casa com o selo dentro, igual ao do Social
     Tracker. Sai em nova aba, com `noopener` porque a pagina de destino nao precisa de
     referencia de volta para esta. */
  function botaoIg(arroba){
    var u = arroba.replace('@', '');
    return '<a class="btn brasa" href="https://www.instagram.com/' + u + '/" ' +
           'target="_blank" rel="noopener" ' +
           'aria-label="Abrir ' + arroba + ' no Instagram">' +
           '<svg class="seta seta-esq" viewBox="0 0 24 24"><use href="#i-seta"/></svg>' +
           '<span class="txt">' +
             '<svg class="ig-selo" aria-hidden="true"><use href="#i-ig"/></svg>' +
             'Instagram</span>' +
           '<span class="circ"></span>' +
           '<svg class="seta seta-dir" viewBox="0 0 24 24"><use href="#i-seta"/></svg>' +
           '</a>';
  }


  /* ---------------------------------------- mercado e etiquetas por conta
     Dado que so existe porque o Gabriel digitou: nem a API do Instagram nem o
     motor sabem em que mercado uma conta joga. Mora no mesmo banco do
     livro-caixa, e e o que alimenta os filtros do calendario E os da aba de
     Contas. Por isso ele fica AQUI, no nucleo, e nao na folha de uma aba so. */
  var META = {};
  function metaDe(a){
    a = String(a).replace('@','').toLowerCase();
    if (!META[a]) META[a] = {mercado:'', etiquetas:[]};
    return META[a];
  }
  function gravarMeta(a, campos){
    var corpo = {arroba: String(a).replace('@','').toLowerCase()};
    if ('mercado' in campos) corpo.mercado = campos.mercado;
    if ('etiquetas' in campos) corpo.etiquetas = campos.etiquetas;
    return fetch('/contas/meta', {method:'POST',
        headers:{'Content-Type':'application/json'}, body: JSON.stringify(corpo)})
      .then(function(r){ return r.json(); })
      .then(function(d){
        if (d && d.arroba) META[d.arroba] = {mercado:d.mercado, etiquetas:d.etiquetas};
        if (window.recarregarFiltros) window.recarregarFiltros();
        return d;
      });
  }
  function lerMeta(){
    return fetch('/contas/meta', {cache:'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(d){ META = d.contas || {}; return META; })
      .catch(function(){ return META; });
  }

  /* O QUE O RESTO DA CASA PODE USAR. A aba de Contas mora em `07-contas.js` e
     precisa destas quatro pecas; expor e mais honesto que copiar. */
  window.perfilDe = perfil;
  window.botaoIg = botaoIg;
  window.metaDe = metaDe;
  window.gravarMeta = gravarMeta;
  window.lerMeta = lerMeta;

})();
