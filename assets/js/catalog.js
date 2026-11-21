/* Mota Lanches — vitrine (index.html) e página do lanche (produto.html).
   Precisa do cart.js carregado antes. */

function ingredientes(item) {
  return String(item.desc || "").split(",").map(t => t.trim().replace(/\.$/, ""))
    .filter(t => t && !/^p[ãa]o$/i.test(t) && !/^porção/i.test(t));
}
// itens marcados como "Combina com" no painel (batatas, bebidas...), menos o próprio item
function listaCombina(item) {
  const vistos = new Set(), lista = [], propria = chaveItem(item.tipo, item.id);
  D.categorias.forEach(c => c.itens.forEach(i => {
    const k = chaveItem(i.tipo, i.id);
    if (i.combina && !i.esgotado && !vistos.has(k) && k !== propria) { vistos.add(k); lista.push(i); }
  }));
  return lista;
}
// o lanche tem escolhas (tirar, adicionais, combina)? Se não tiver, o + coloca direto na sacola
function temEscolhas(item) {
  return !!item.opcoes && (ingredientes(item).length > 0 || D.adicionais.length > 0 || listaCombina(item).length > 0);
}
function avisoRapido(texto) {
  let el = $("avisoAdd");
  if (!el) { el = document.createElement("div"); el.id = "avisoAdd"; el.className = "aviso-add"; document.body.appendChild(el); }
  el.textContent = texto; el.style.opacity = "1";
  clearTimeout(el._t); el._t = setTimeout(() => el.style.opacity = "0", 1800);
}

/* =====================================================================
   Vitrine — index.html
   ===================================================================== */
if ($("cardapio")) {
  window.aoMudarSacola = () => { desenharCardapio($("busca").value); atualizarBarra(); };

  function mostrarLoja() {
    const aberta = lojaAbertaAgora();
    $("statusLoja").textContent = aberta ? "Aberto agora" : "Fechado agora";
    $("statusLoja").classList.toggle("fechada", !aberta);
    $("avisoFechada").classList.toggle("escondido", aberta);
    const txt = D.cfg.horario || textoHorario(D.cfg.horarios);
    $("avisoFechada").textContent = "Estamos fechados agora. Você pode olhar o cardápio" + (txt ? " — nosso horário: " + txt + "." : ", mas os pedidos voltam quando abrirmos.");
  }

  function desenharCardapio(filtro = "") {
    if (!D) return;
    const f = slug(filtro).replace(/-/g, " ").trim();
    const aberta = lojaAbertaAgora();
    let html = "", nav = "";
    D.categorias.forEach(cat => {
      const itens = cat.itens.filter(i => !f || slug(i.nome + " " + i.desc + " " + cat.nome).replace(/-/g, " ").includes(f));
      if (!itens.length) return;
      const id = "cat-" + slug(cat.nome);
      nav += `<a href="#${id}">${iconeCategoria(cat.nome)} ${esc(cat.nome)}</a>`;
      html += `<section class="secao" id="${id}"><h2>${esc(cat.nome)}</h2><div class="lista">`;
      itens.forEach(i => {
        const k = chaveItem(i.tipo, i.id);
        const q = sacola.filter(l => l.tipo === i.tipo && l.id === i.id).reduce((s, l) => s + l.qtd, 0);
        html += `<div class="item ${i.esgotado ? "esgotado" : ""}" data-ver="${esc(k)}">
          ${i.foto ? `<img class="item-foto" src="${esc(i.foto)}" alt="" loading="lazy">` : ""}
          <div class="item-info">
            ${i.maisVendido ? `<span class="selo-top">⭐ Mais vendido</span>` : ""}
            <h3>${esc(i.nome)}${i.precoAntigo ? `<span class="selo-oferta">OFERTA</span>` : ""}${q ? `<span class="qtd-badge">${q}</span>` : ""}</h3>
            ${i.desc ? `<p>${esc(i.desc)}</p>` : ""}
            <div class="preco">${i.precoAntigo ? `<span class="preco-antigo">${dinheiro(i.precoAntigo)}</span>` : ""}${dinheiro(i.preco)}</div>
          </div>
          ${i.esgotado ? `<span class="selo-esgotado">Esgotado</span>`
            : `<button class="btn-add" data-chave="${esc(k)}" aria-label="Adicionar ${esc(i.nome)}" ${aberta ? "" : "disabled"}>+</button>`}
        </div>`;
      });
      html += `</div></section>`;
    });
    $("cardapio").innerHTML = html || `<p class="vazio">Nenhum lanche encontrado com "${esc(filtro)}".</p>`;
    $("categorias").innerHTML = nav;
  }

  function atualizarBarra() {
    const qtd = qtdNaSacola();
    $("barraSacola").classList.toggle("escondido", qtd === 0);
    $("qtdSacola").textContent = qtd;
    $("totalBarra").textContent = dinheiro(D ? subtotalSacola() : 0);
  }

  // toque no "+": sem escolhas vai direto para a sacola; com escolhas abre a página do lanche
  // toque no resto do card: abre a página do lanche
  $("cardapio").addEventListener("click", e => {
    const b = e.target.closest(".btn-add");
    if (b) {
      const item = todosItens[b.dataset.chave]; if (!item) return;
      if (temEscolhas(item)) { location.href = "produto.html?item=" + encodeURIComponent(b.dataset.chave); return; }
      juntarNaSacola({ tipo: item.tipo, id: item.id, qtd: 1, obs: "", sem: [], add: [] });
      salvarSacola();
      avisoRapido("✓ " + item.nome + " na sacola");
      return;
    }
    const card = e.target.closest(".item[data-ver]");
    if (card && !card.classList.contains("esgotado")) location.href = "produto.html?item=" + encodeURIComponent(card.dataset.ver);
  });
  $("busca").addEventListener("input", e => desenharCardapio(e.target.value));
  // voltou da página do lanche: mostra o aviso "na sacola"
  window.addEventListener("pageshow", e => {
    const aviso = sessionStorage.getItem("mota_aviso");
    if (e.persisted && aviso) { sessionStorage.removeItem("mota_aviso"); avisoRapido(aviso); }
  });

  // toque numa categoria: rola a página até ela
  let rolandoAte = 0;
  $("categorias").addEventListener("click", e => {
    const a = e.target.closest("a"); if (!a) return;
    e.preventDefault();
    const secao = document.getElementById(a.getAttribute("href").slice(1));
    if (!secao) return;
    const topo = secao.getBoundingClientRect().top + window.scrollY - $("categorias").offsetHeight - 8;
    marcarCategoria(secao.id);
    rolandoAte = Date.now() + 900;
    window.scrollTo({ top: Math.max(0, topo), behavior: "smooth" });
  });
  function marcarCategoria(id) {
    const barra = $("categorias");
    barra.querySelectorAll("a").forEach(a => {
      const on = a.getAttribute("href") === "#" + id;
      if (on && !a.classList.contains("ativa")) barra.scrollTo({ left: a.offsetLeft - (barra.clientWidth - a.offsetWidth) / 2, behavior: "smooth" });
      a.classList.toggle("ativa", on);
    });
  }
  window.addEventListener("scroll", () => {
    if (Date.now() < rolandoAte) return;
    const limite = $("categorias").offsetHeight + 30;
    let atual = null;
    document.querySelectorAll(".secao").forEach(s => { if (s.getBoundingClientRect().top < limite) atual = s.id; });
    marcarCategoria(atual);
  }, { passive: true });

  (async () => {
    try { await prepararDados(); }
    catch (e) { $("cardapio").innerHTML = `<p class="vazio">Não conseguimos carregar o cardápio. Confira a internet e recarregue a página.</p>`; return; }
    const cfg = D.cfg;
    $("slogan").textContent = cfg.frase || C.SLOGAN;
    const txtHorario = cfg.horario || textoHorario(cfg.horarios);
    $("horarioLoja").textContent = txtHorario ? "🕒 " + txtHorario : "";
    montarRodape();
    mostrarLoja();
    desenharCardapio($("busca").value);
    atualizarBarra();
    const aviso = sessionStorage.getItem("mota_aviso");
    if (aviso) { sessionStorage.removeItem("mota_aviso"); avisoRapido(aviso); }
    vigiarLoja(() => { mostrarLoja(); desenharCardapio($("busca").value); });
  })();
}

/* =====================================================================
   Página do lanche — produto.html?item=produto:12
   ===================================================================== */
if ($("paginaProduto")) {
  let item = null, qtd = 1, sem = new Set(), adds = {}, comb = {};
  let ingr = [], combLista = [], temTirar = false, temAdd = false, temComb = false;

  window.aoMudarSacola = () => {
    const n = qtdNaSacola();
    $("qtdTopo").textContent = n ? " (" + n + ")" : "";
  };

  function desenharTirar() {
    $("listaTirar").innerHTML = ingr.map((t, n) => {
      const tirado = sem.has(t);
      return `<div class="add-linha ${tirado ? "tirado" : ""}">
        <div><strong>${esc(t[0].toUpperCase() + t.slice(1))}</strong><br><span class="add-preco">${tirado ? "✕ Sem " + esc(t) : "✓ No lanche"}</span></div>
        <div class="add-ctrl">
          ${tirado ? `<button class="mais-add" data-tirar="${n}" aria-label="Colocar ${esc(t)} de volta">+</button>`
                   : `<button class="menos-tirar" data-tirar="${n}" aria-label="Tirar ${esc(t)}">−</button>`}
        </div></div>`;
    }).join("");
    $("semResumo").textContent = sem.size ? "✕ Sem " + [...sem].join(", ") : "";
    contarAbas();
  }
  function desenharAdds() {
    $("listaAdd").innerHTML = D.adicionais.map(a => {
      const q = adds[a.id] || 0;
      return `<div class="add-linha ${q ? "com" : ""}">
        <div><strong>${esc(a.nome)}</strong><br><span class="add-preco">+ ${dinheiro(a.preco)}</span></div>
        <div class="add-ctrl">
          ${q ? `<button data-add="${a.id}" data-d="-1" aria-label="Tirar">−</button><strong>${q}</strong>` : ""}
          <button class="mais-add" data-add="${a.id}" data-d="1" aria-label="Adicionar ${esc(a.nome)}">+</button>
        </div></div>`;
    }).join("");
  }
  function desenharCombina() {
    $("listaCombina").innerHTML = combLista.map(i => {
      const k = chaveItem(i.tipo, i.id), q = comb[k] || 0;
      return `<div class="add-linha ${q ? "com" : ""}">
        <div style="display:flex;gap:10px;align-items:center;min-width:0">
          ${i.foto ? `<img class="combina-foto" src="${esc(i.foto)}" alt="">` : ""}
          <div><strong>${esc(i.nome)}</strong><br><span class="add-preco">+ ${dinheiro(i.preco)}</span></div>
        </div>
        <div class="add-ctrl">
          ${q ? `<button data-comb="${esc(k)}" data-d="-1" aria-label="Tirar">−</button><strong>${q}</strong>` : ""}
          <button class="mais-add" data-comb="${esc(k)}" data-d="1" aria-label="Adicionar ${esc(i.nome)}">+</button>
        </div></div>`;
    }).join("");
  }
  $("listaTirar").addEventListener("click", e => {
    const b = e.target.closest("button[data-tirar]"); if (!b) return;
    const t = ingr[b.dataset.tirar];
    if (sem.has(t)) sem.delete(t); else sem.add(t);
    desenharTirar();
  });
  $("listaAdd").addEventListener("click", e => {
    const b = e.target.closest("button[data-add]"); if (!b) return;
    const id = b.dataset.add;
    adds[id] = Math.max(0, Math.min(5, (adds[id] || 0) + Number(b.dataset.d)));
    if (!adds[id]) delete adds[id];
    desenharAdds(); atualizarBotao(); contarAbas();
  });
  $("listaCombina").addEventListener("click", e => {
    const b = e.target.closest("button[data-comb]"); if (!b) return;
    const k = b.dataset.comb;
    comb[k] = Math.max(0, Math.min(20, (comb[k] || 0) + Number(b.dataset.d)));
    if (!comb[k]) delete comb[k];
    desenharCombina(); atualizarBotao(); contarAbas();
  });
  function contarAbas() {
    const nAdd = Object.values(adds).reduce((s, q) => s + q, 0);
    const nComb = Object.values(comb).reduce((s, q) => s + q, 0);
    $("passo1").textContent = "Tirar ingredientes" + (sem.size ? ` (${sem.size})` : "");
    $("passo2").textContent = "Adicionais" + (nAdd ? ` (${nAdd})` : "");
    $("passo3").textContent = "Combina com" + (nComb ? ` (${nComb})` : "");
  }
  function irEtapa(n) {
    [1, 2, 3].forEach(k => {
      $("etapa" + k).classList.toggle("escondido", n !== k);
      $("passo" + k).classList.toggle("atual", n === k);
    });
  }
  $("passos").addEventListener("click", e => {
    const b = e.target.closest("button[data-etapa]"); if (!b) return;
    const n = Number(b.dataset.etapa);
    irEtapa(n);
    const destino = $("etapa" + n).getBoundingClientRect().top + window.scrollY - $("passos").offsetHeight - $("topoMini").offsetHeight - 16;
    window.scrollTo({ top: Math.max(0, destino), behavior: "smooth" });
  });

  function linhaAtual() {
    return {
      tipo: item.tipo, id: item.id, qtd, obs: $("itemObs").value.trim(),
      sem: [...sem],
      add: Object.keys(adds).map(id => ({ id: Number(id), nome: adicionaisPorId[id].nome, qtd: adds[id], preco: adicionaisPorId[id].preco }))
    };
  }
  const totalCombina = () => Object.keys(comb).reduce((s, k) => s + todosItens[k].preco * comb[k], 0);
  function atualizarBotao() {
    $("itemQtd").textContent = qtd;
    const botao = $("confirmarItem");
    if (item.esgotado) { botao.disabled = true; botao.textContent = "Esgotado no momento"; return; }
    if (!lojaAbertaAgora()) { botao.disabled = true; botao.textContent = "Loja fechada agora"; return; }
    botao.disabled = false;
    botao.textContent = "Adicionar · " + dinheiro(precoUnit(linhaAtual()) * qtd + totalCombina());
  }
  $("mais").onclick = () => { if (qtd < 30) qtd++; atualizarBotao(); };
  $("menos").onclick = () => { if (qtd > 1) qtd--; atualizarBotao(); };

  $("confirmarItem").onclick = () => {
    juntarNaSacola(linhaAtual());
    // o que o cliente escolheu em "Combina com" entra na sacola como item separado
    Object.keys(comb).forEach(k => {
      const i = todosItens[k];
      juntarNaSacola({ tipo: i.tipo, id: i.id, qtd: comb[k], obs: "", sem: [], add: [] });
    });
    salvarSacola();
    sessionStorage.setItem("mota_aviso", "✓ " + item.nome + " na sacola");
    // volta para o cardápio no mesmo lugar em que o cliente estava
    if (document.referrer && new URL(document.referrer).pathname === new URL("index.html", location.href).pathname && history.length > 1) history.back();
    else location.href = "index.html";
  };

  (async () => {
    try { await prepararDados(); }
    catch (e) { $("conteudoProduto").innerHTML = `<p class="vazio">Não conseguimos carregar. Confira a internet e recarregue a página.</p>`; return; }
    window.aoMudarSacola();
    montarRodape();
    const p = new URLSearchParams(location.search);
    const chave = p.get("item") || (p.get("id") ? chaveItem(p.get("tipo") || "produto", p.get("id")) : "");
    item = todosItens[chave];
    if (!item) {
      $("conteudoProduto").innerHTML = `<div class="vazio"><p style="font-size:40px">🍔</p><p>Esse item não está mais no cardápio.</p>
        <a class="btn-principal" style="display:block;text-decoration:none;text-align:center" href="index.html">Ver o cardápio</a></div>`;
      return;
    }
    document.title = item.nome + " | Mota Lanches";
    $("itemNome").textContent = item.nome;
    $("itemDesc").textContent = item.desc || "";
    $("itemFoto").classList.toggle("escondido", !item.foto);
    if (item.foto) { $("itemFoto").src = item.foto; $("itemFoto").alt = item.nome; }
    $("itemSelos").innerHTML = (item.maisVendido ? `<span class="selo-top">⭐ Mais vendido</span>` : "") + (item.precoAntigo ? `<span class="selo-oferta" style="margin-left:0">OFERTA</span>` : "");
    $("itemPreco").innerHTML = (item.precoAntigo ? `<span class="preco-antigo">${dinheiro(item.precoAntigo)}</span>` : "") + dinheiro(item.preco);

    ingr = item.opcoes ? ingredientes(item) : [];
    combLista = item.opcoes ? listaCombina(item) : [];
    temTirar = ingr.length > 0;
    temAdd = !!item.opcoes && D.adicionais.length > 0;
    temComb = combLista.length > 0;
    $("passo1").classList.toggle("escondido", !temTirar);
    $("passo2").classList.toggle("escondido", !temAdd);
    $("passo3").classList.toggle("escondido", !temComb);
    $("passos").classList.toggle("escondido", [temTirar, temAdd, temComb].filter(Boolean).length < 2);
    desenharTirar(); desenharAdds(); desenharCombina(); contarAbas();
    irEtapa(temTirar ? 1 : temAdd ? 2 : temComb ? 3 : 0);
    atualizarBotao();
    vigiarLoja(atualizarBotao);
  })();
}
