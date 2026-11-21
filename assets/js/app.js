/* Cardápio, sacola e envio do pedido */
const $ = id => document.getElementById(id);
let D = null;                       // dados do cardápio (carregados do banco ou do cardapio.js)
let todosItens = {}, adicionaisPorId = {};
let sacola = ler("mota_sacola", []);
let itemAtual = null, qtdAtual = 1, semAtual = new Set(), addAtual = {};
let ingrAtual = [], temTirar = false, temAdd = false, temCombina = false;
let combinaLista = [], combinaAtual = {};
let tipo = "entrega", pagamento = "", tipoCartao = "", cupomAtual = null; // {codigo, pct}

const chaveItem = (tipo, id) => tipo + ":" + id;
const itemDaLinha = l => todosItens[chaveItem(l.tipo, l.id)];

function ingredientes(item) {
  return String(item.desc || "").split(",").map(t => t.trim().replace(/\.$/, ""))
    .filter(t => t && !/^p[ãa]o$/i.test(t) && !/^porção/i.test(t));
}
function precoUnit(l) { return itemDaLinha(l).preco + l.add.reduce((s, a) => s + a.preco * a.qtd, 0); }
function textoAdd(add) { return add.map(a => (a.qtd > 1 ? a.qtd + "x " : "") + a.nome).join(", "); }

/* ---------- Carregar dados ---------- */
async function iniciar() {
  try {
    D = await carregarDados();
  } catch (e) {
    $("cardapio").innerHTML = `<p class="vazio">Não conseguimos carregar o cardápio. Confira a internet e recarregue a página.</p>`;
    return;
  }
  todosItens = {};
  D.categorias.forEach(c => c.itens.forEach(i => todosItens[chaveItem(i.tipo, i.id)] = i));
  adicionaisPorId = {};
  D.adicionais.forEach(a => adicionaisPorId[a.id] = a);
  // acerta a sacola guardada com os preços de agora
  sacola = sacola.filter(l => itemDaLinha({ tipo: l.tipo || "produto", id: l.id })).map(l => ({
    tipo: l.tipo || "produto", id: l.id, qtd: l.qtd, obs: l.obs || "", sem: l.sem || [],
    add: (l.add || []).filter(a => adicionaisPorId[a.id]).map(a => ({ id: a.id, nome: adicionaisPorId[a.id].nome, qtd: a.qtd, preco: adicionaisPorId[a.id].preco }))
  }));
  guardar("mota_sacola", sacola);

  const cfg = D.cfg;
  $("slogan").textContent = cfg.frase || C.SLOGAN;
  const txtHorario = cfg.horario || textoHorario(cfg.horarios);
  $("horarioLoja").textContent = txtHorario ? "🕒 " + txtHorario : "";
  const insta = String(cfg.instagram || "").replace(/^@/, "");
  $("rodape").innerHTML = `
    <img class="rodape-mascote" src="assets/img/icone.png" alt="Mascote da Mota Lanches">
    <p class="rodape-marca"><span>MOTA LANCHES</span> · <em>${esc(cfg.frase || C.SLOGAN)}</em></p>
    ${txtHorario ? `<p>${esc(txtHorario)}</p>` : ""}
    <p>Atendimento pelo WhatsApp <a href="${linkWhats("Olá, Mota Lanches!", cfg.whatsapp)}" target="_blank">${esc(telVisivel(cfg.whatsapp))}</a>${cfg.whatsapp2 ? ` · <a href="${linkWhats("Olá, Mota Lanches!", cfg.whatsapp2)}" target="_blank">${esc(telVisivel(cfg.whatsapp2))}</a>` : ""}</p>
    ${insta ? `<p>Instagram <a href="https://instagram.com/${encodeURIComponent(insta)}" target="_blank">@${esc(insta)}</a></p>` : ""}
    ${cfg.endereco ? `<p>${esc(cfg.endereco)}</p>` : ""}
    <p><a class="rodape-politica" href="politica.html">Política de privacidade</a></p>`;
  $("blocoCupom").classList.toggle("escondido", !D.online);
  mostrarLoja();
  desenharCardapio($("busca").value);
  atualizarBarra();
}

let estavaAberta = null;
async function atualizarLoja() {
  if (!D) return;
  if (banco) {
    const { data } = await banco.from("config").select("aberta,horarios").eq("id", 1).maybeSingle();
    if (data) { D.cfg.aberta = data.aberta; D.cfg.horarios = data.horarios; }
  }
  const agora = lojaAbertaAgora();
  if (agora !== estavaAberta) { estavaAberta = agora; mostrarLoja(); desenharCardapio($("busca").value); }
}
function lojaAbertaAgora() { return D.cfg.aberta && dentroDoHorario(D.cfg.horarios); }
function mostrarLoja() {
  const aberta = lojaAbertaAgora();
  $("statusLoja").textContent = aberta ? "Aberto agora" : "Fechado agora";
  $("statusLoja").classList.toggle("fechada", !aberta);
  $("avisoFechada").classList.toggle("escondido", aberta);
  const txt = D.cfg.horario || textoHorario(D.cfg.horarios);
  $("avisoFechada").textContent = "Estamos fechados agora. Você pode olhar o cardápio" + (txt ? " — nosso horário: " + txt + "." : ", mas os pedidos voltam quando abrirmos.");
  $("fazerPedido").disabled = !aberta;
}

/* ---------- Cardápio ---------- */
function desenharCardapio(filtro = "") {
  if (!D) return;
  const f = slug(filtro).replace(/-/g, " ").trim();
  let html = "", nav = "";
  D.categorias.forEach(cat => {
    const itens = cat.itens.filter(i => !f || slug(i.nome + " " + i.desc + " " + cat.nome).replace(/-/g, " ").includes(f));
    if (!itens.length) return;
    const id = "cat-" + slug(cat.nome);
    nav += `<a href="#${id}">${iconeCategoria(cat.nome)} ${esc(cat.nome)}</a>`;
    html += `<section class="secao" id="${id}"><h2>${esc(cat.nome)}</h2><div class="lista">`;
    itens.forEach(i => {
      const q = sacola.filter(l => l.tipo === i.tipo && l.id === i.id).reduce((s, l) => s + l.qtd, 0);
      html += `<div class="item ${i.esgotado ? "esgotado" : ""}">
        ${i.foto ? `<img class="item-foto" src="${esc(i.foto)}" alt="" loading="lazy">` : ""}
        <div class="item-info">
          ${i.maisVendido ? `<span class="selo-top">⭐ Mais vendido</span>` : ""}
          <h3>${esc(i.nome)}${i.precoAntigo ? `<span class="selo-oferta">OFERTA</span>` : ""}${q ? `<span class="qtd-badge">${q}</span>` : ""}</h3>
          ${i.desc ? `<p>${esc(i.desc)}</p>` : ""}
          <div class="preco">${i.precoAntigo ? `<span class="preco-antigo">${dinheiro(i.precoAntigo)}</span>` : ""}${dinheiro(i.preco)}</div>
        </div>
        ${i.esgotado ? `<span class="selo-esgotado">Esgotado</span>`
          : `<button class="btn-add" data-chave="${esc(chaveItem(i.tipo, i.id))}" aria-label="Adicionar ${esc(i.nome)}" ${lojaAbertaAgora() ? "" : "disabled"}>+</button>`}
      </div>`;
    });
    html += `</div></section>`;
  });
  $("cardapio").innerHTML = html || `<p class="vazio">Nenhum lanche encontrado com "${esc(filtro)}".</p>`;
  $("categorias").innerHTML = nav;
}

$("cardapio").addEventListener("click", e => {
  const b = e.target.closest(".btn-add");
  if (b) abrirItem(b.dataset.chave);
});
$("busca").addEventListener("input", e => desenharCardapio(e.target.value));

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

/* ---------- Janela do item ---------- */
function abrirItem(chave) {
  itemAtual = todosItens[chave]; if (!itemAtual) return;
  qtdAtual = 1; semAtual = new Set(); addAtual = {}; combinaAtual = {};
  $("itemNome").textContent = itemAtual.nome;
  $("itemDesc").textContent = itemAtual.desc;
  $("itemFoto").classList.toggle("escondido", !itemAtual.foto);
  if (itemAtual.foto) $("itemFoto").src = itemAtual.foto;
  $("itemObs").value = "";
  ingrAtual = itemAtual.opcoes ? ingredientes(itemAtual) : [];
  temTirar = ingrAtual.length > 0;
  temAdd = itemAtual.opcoes && D.adicionais.length > 0;
  // "Combina com": itens marcados no painel (batatas, bebidas...), menos o próprio item
  const vistos = new Set();
  combinaLista = [];
  D.categorias.forEach(c => c.itens.forEach(i => {
    const k = chaveItem(i.tipo, i.id);
    if (i.combina && !i.esgotado && !vistos.has(k) && k !== chaveItem(itemAtual.tipo, itemAtual.id)) { vistos.add(k); combinaLista.push(i); }
  }));
  temCombina = itemAtual.opcoes && combinaLista.length > 0;
  $("passo1").classList.toggle("escondido", !temTirar);
  $("passo2").classList.toggle("escondido", !temAdd);
  $("passo3").classList.toggle("escondido", !temCombina);
  $("passos").classList.toggle("escondido", [temTirar, temAdd, temCombina].filter(Boolean).length < 2);
  desenharTirar(); desenharAdds(); desenharCombina(); atualizarItem();
  irEtapa(temTirar ? 1 : temAdd ? 2 : temCombina ? 3 : 0);
  abrir("janelaItem");
  document.querySelector("#janelaItem .janela").scrollTop = 0;
}
function desenharAdds() {
  $("listaAdd").innerHTML = D.adicionais.map(a => {
    const q = addAtual[a.id] || 0;
    return `<div class="add-linha ${q ? "com" : ""}">
      <div><strong>${esc(a.nome)}</strong><br><span class="add-preco">+ ${dinheiro(a.preco)}</span></div>
      <div class="add-ctrl">
        ${q ? `<button data-add="${a.id}" data-d="-1" aria-label="Tirar">−</button><strong>${q}</strong>` : ""}
        <button class="mais-add" data-add="${a.id}" data-d="1" aria-label="Adicionar ${esc(a.nome)}">+</button>
      </div></div>`;
  }).join("");
}
$("listaAdd").addEventListener("click", e => {
  const b = e.target.closest("button[data-add]"); if (!b) return;
  const id = b.dataset.add;
  addAtual[id] = Math.max(0, Math.min(5, (addAtual[id] || 0) + Number(b.dataset.d)));
  if (!addAtual[id]) delete addAtual[id];
  desenharAdds(); atualizarItem(); contarAbas();
});
function desenharTirar() {
  $("listaTirar").innerHTML = ingrAtual.map((t, n) => {
    const sem = semAtual.has(t);
    return `<div class="add-linha ${sem ? "tirado" : ""}">
      <div><strong>${esc(t[0].toUpperCase() + t.slice(1))}</strong><br><span class="add-preco">${sem ? "✕ Sem " + esc(t) : "✓ No lanche"}</span></div>
      <div class="add-ctrl">
        ${sem ? `<button class="mais-add" data-tirar="${n}" aria-label="Colocar ${esc(t)} de volta">+</button>`
              : `<button class="menos-tirar" data-tirar="${n}" aria-label="Tirar ${esc(t)}">−</button>`}
      </div></div>`;
  }).join("");
  $("semResumo").textContent = semAtual.size ? "✕ Sem " + [...semAtual].join(", ") : "";
  contarAbas();
}
$("listaTirar").addEventListener("click", e => {
  const b = e.target.closest("button[data-tirar]"); if (!b) return;
  const t = ingrAtual[b.dataset.tirar];
  if (semAtual.has(t)) semAtual.delete(t); else semAtual.add(t);
  desenharTirar();
});
function desenharCombina() {
  $("listaCombina").innerHTML = combinaLista.map(i => {
    const k = chaveItem(i.tipo, i.id), q = combinaAtual[k] || 0;
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
$("listaCombina").addEventListener("click", e => {
  const b = e.target.closest("button[data-comb]"); if (!b) return;
  const k = b.dataset.comb;
  combinaAtual[k] = Math.max(0, Math.min(20, (combinaAtual[k] || 0) + Number(b.dataset.d)));
  if (!combinaAtual[k]) delete combinaAtual[k];
  desenharCombina(); atualizarItem(); contarAbas();
});
function contarAbas() {
  const nAdd = Object.values(addAtual).reduce((s, q) => s + q, 0);
  const nComb = Object.values(combinaAtual).reduce((s, q) => s + q, 0);
  $("passo1").textContent = "Tirar ingredientes" + (semAtual.size ? ` (${semAtual.size})` : "");
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
  const janela = document.querySelector("#janelaItem .janela");
  const alvo = $("etapa" + n);
  const destino = janela.scrollTop + alvo.getBoundingClientRect().top - janela.getBoundingClientRect().top - $("passos").offsetHeight - 16;
  janela.scrollTo({ top: Math.max(0, destino), behavior: "smooth" });
});
function linhaAtual() {
  return {
    tipo: itemAtual.tipo, id: itemAtual.id, qtd: qtdAtual, obs: $("itemObs").value.trim(),
    sem: [...semAtual],
    add: Object.keys(addAtual).map(id => ({ id: Number(id), nome: adicionaisPorId[id].nome, qtd: addAtual[id], preco: adicionaisPorId[id].preco }))
  };
}
function totalCombina() {
  return Object.keys(combinaAtual).reduce((s, k) => s + todosItens[k].preco * combinaAtual[k], 0);
}
function atualizarItem() {
  $("itemQtd").textContent = qtdAtual;
  $("confirmarItem").textContent = "Adicionar · " + dinheiro(precoUnit(linhaAtual()) * qtdAtual + totalCombina());
}
$("mais").onclick = () => { if (qtdAtual < 30) qtdAtual++; atualizarItem(); };
$("menos").onclick = () => { if (qtdAtual > 1) qtdAtual--; atualizarItem(); };
$("confirmarItem").onclick = () => {
  const chave = l => JSON.stringify([l.tipo, l.id, l.obs, l.sem.slice().sort(), l.add.map(a => a.id + "x" + a.qtd).sort()]);
  const juntar = nova => {
    const igual = sacola.find(l => chave(l) === chave(nova));
    if (igual) igual.qtd += nova.qtd; else sacola.push(nova);
  };
  juntar(linhaAtual());
  // o que o cliente escolheu em "Combina com" entra na sacola como item separado
  Object.keys(combinaAtual).forEach(k => {
    const i = todosItens[k];
    juntar({ tipo: i.tipo, id: i.id, qtd: combinaAtual[k], obs: "", sem: [], add: [] });
  });
  salvarSacola();
  fechar("janelaItem");
};

/* ---------- Sacola e valores ---------- */
function salvarSacola() { guardar("mota_sacola", sacola); desenharCardapio($("busca").value); atualizarBarra(); }

function contas() {
  const sub = sacola.reduce((s, l) => s + precoUnit(l) * l.qtd, 0);
  const descCupom = cupomAtual ? Math.round(sub * cupomAtual.pct) / 100 : 0;
  const descPix = pagamento === "Pix" && D.cfg.desconto_pix > 0 ? Math.round((sub - descCupom) * D.cfg.desconto_pix) / 100 : 0;
  let taxa = 0;
  if (tipo === "entrega") taxa = D.cfg.taxa_unica || 0;   // uma taxa só para a cidade toda
  return { sub, descCupom, descPix, taxa, total: sub - descCupom - descPix + taxa };
}

function atualizarBarra() {
  const qtd = sacola.reduce((s, l) => s + l.qtd, 0);
  $("barraSacola").classList.toggle("escondido", qtd === 0);
  $("qtdSacola").textContent = qtd;
  $("totalBarra").textContent = dinheiro(D ? contas().sub : 0);
}


function desenharSacola() {
  if (!sacola.length) {
    $("itensSacola").innerHTML = `<p class="vazio">Sua sacola está vazia.</p>`;
    $("areaFinalizar").classList.add("escondido");
    return;
  }
  $("areaFinalizar").classList.remove("escondido");
  $("itensSacola").innerHTML = sacola.map((l, n) => {
    const i = itemDaLinha(l);
    return `<div class="linha-item">
      <div style="flex:1">
        <div class="nome">${esc(i.nome)}</div>
        ${l.sem.length ? `<div class="sem">✕ Sem ${esc(l.sem.join(", "))}</div>` : ""}
        ${l.add.length ? `<div class="add">+ ${esc(textoAdd(l.add))}</div>` : ""}
        ${l.obs ? `<div class="obs">📝 ${esc(l.obs)}</div>` : ""}
        <div class="mini-contador"><button data-n="${n}" data-acao="-">−</button><strong>${l.qtd}</strong><button data-n="${n}" data-acao="+">+</button></div>
      </div>
      <div class="valor">${dinheiro(precoUnit(l) * l.qtd)}</div>
    </div>`;
  }).join("");
  atualizarResumo();
}
$("itensSacola").addEventListener("click", e => {
  const b = e.target.closest("button[data-n]"); if (!b) return;
  const l = sacola[b.dataset.n];
  l.qtd += b.dataset.acao === "+" ? 1 : -1;
  if (l.qtd <= 0) sacola.splice(b.dataset.n, 1);
  salvarSacola(); desenharSacola();
  if (!sacola.length) setTimeout(() => fechar("janelaSacola"), 600);
});

function atualizarResumo() {
  const c = contas();
  $("rSubtotal").textContent = dinheiro(c.sub);
  $("linhaCupom").classList.toggle("escondido", !c.descCupom);
  $("rCupomNome").textContent = cupomAtual ? `Cupom ${cupomAtual.codigo} (${cupomAtual.pct}%)` : "Cupom";
  $("rCupom").textContent = "− " + dinheiro(c.descCupom);
  $("linhaPix").classList.toggle("escondido", !c.descPix);
  $("rPixNome").textContent = `Desconto no Pix (${D.cfg.desconto_pix}%)`;
  $("rPix").textContent = "− " + dinheiro(c.descPix);
  $("linhaTaxa").classList.toggle("escondido", tipo !== "entrega");
  $("rTaxa").textContent = c.taxa > 0 ? dinheiro(c.taxa) : "a combinar";
  $("avisoTaxa").innerHTML = D.cfg.taxa_unica > 0 ? `🛵 Taxa de entrega: <strong>${dinheiro(D.cfg.taxa_unica)}</strong>` : "🛵 Taxa de entrega: <strong>a combinar</strong>";
  $("rTotal").textContent = dinheiro(c.total);
  $("camposEntrega").classList.toggle("escondido", tipo !== "entrega");
  $("campoTroco").classList.toggle("escondido", pagamento !== "Dinheiro");
  $("campoCartao").classList.toggle("escondido", pagamento !== "Cartão");
  $("avisoMaquininha").classList.toggle("escondido", tipo !== "entrega");
  const pix = $("campoPix"), chave = D.cfg.chave_pix;
  pix.classList.toggle("escondido", pagamento !== "Pix" || !chave);
  pix.innerHTML = chave ? `<div class="pix">Chave Pix: <strong>${esc(chave)}</strong><br><span class="dica">Depois de fazer o pedido aparece o <strong>Pix copia e cola</strong> com o valor certinho. Pode pagar na hora ou na entrega.</span></div>` : "";
  const ret = $("enderecoRetirada");
  ret.classList.toggle("escondido", tipo !== "retirada" || !D.cfg.endereco);
  ret.innerHTML = D.cfg.endereco ? `<div class="pix">📍 Retire em: <strong>${esc(D.cfg.endereco)}</strong></div>` : "";
}

function escolha(grupo, cb) {
  $(grupo).addEventListener("click", e => {
    const b = e.target.closest(".opcao"); if (!b) return;
    $(grupo).querySelectorAll(".opcao").forEach(o => o.classList.toggle("marcada", o === b));
    cb(b.dataset.valor); atualizarResumo();
  });
}
escolha("opTipo", v => tipo = v);
escolha("opPagamento", v => pagamento = v);
escolha("opCartao", v => tipoCartao = v);
const pagamentoFinal = () => pagamento === "Cartão" ? "Cartão de " + tipoCartao : pagamento;

$("aplicarCupom").onclick = async () => {
  const codigo = $("cupom").value.trim().toUpperCase();
  const msg = $("msgCupom");
  if (!codigo) { cupomAtual = null; msg.textContent = ""; atualizarResumo(); return; }
  if (!banco) return;
  $("aplicarCupom").disabled = true;
  const { data, error } = await banco.rpc("validar_cupom", { p_codigo: codigo });
  $("aplicarCupom").disabled = false;
  if (error || data === null || data === undefined) {
    cupomAtual = null; msg.style.color = "#ff8a8d"; msg.textContent = "Cupom inválido ou vencido.";
  } else {
    cupomAtual = { codigo, pct: Number(data) }; msg.style.color = "#8fe3a9";
    msg.textContent = `Cupom aplicado: ${String(data).replace(".", ",")}% de desconto!`;
  }
  atualizarResumo();
};

$("abrirSacola").onclick = () => {
  const d = ler("mota_cliente", {});
  ["nome", "telefone", "rua", "numero", "bairro", "referencia"].forEach(k => { if (d[k] && !$(k).value) $(k).value = d[k]; });
  $("erroPedido").textContent = "";
  desenharSacola(); abrir("janelaSacola");
};

/* ---------- Abrir/fechar janelas ---------- */
function abrir(id) { $(id).classList.remove("escondido"); document.body.style.overflow = "hidden"; }
function fechar(id) { $(id).classList.add("escondido"); document.body.style.overflow = ""; }
document.querySelectorAll("[data-fechar]").forEach(b => b.onclick = () => fechar(b.dataset.fechar));
document.querySelectorAll(".fundo").forEach(f => f.addEventListener("click", e => { if (e.target === f) fechar(f.id); }));

/* ---------- Enviar pedido ---------- */
function montarMensagem(p, c, numero) {
  let t = `*Pedido Mota Lanches*${numero ? " #" + numero : ""}\n\n`;
  p.itensTexto.forEach(i => {
    t += `${i.qtd}x ${i.nome} — ${dinheiro(i.preco * i.qtd)}\n`;
    if (i.sem.length) t += `   SEM: ${i.sem.join(", ")}\n`;
    if (i.add.length) t += `   ADICIONAL: ${textoAdd(i.add)}\n`;
    if (i.obs) t += `   _Obs.: ${i.obs}_\n`;
  });
  t += `\nSubtotal: ${dinheiro(c.sub)}\n`;
  if (c.descCupom) t += `Cupom ${p.cupom}: − ${dinheiro(c.descCupom)}\n`;
  if (c.descPix) t += `Desconto Pix: − ${dinheiro(c.descPix)}\n`;
  if (p.tipo === "entrega") t += `Entrega: ${c.taxa > 0 ? dinheiro(c.taxa) : "a combinar"}\n`;
  t += `*Total: ${dinheiro(c.total)}*\n\n`;
  t += `Nome: ${p.cliente_nome}\nWhatsApp: ${p.telefone}\n`;
  t += p.tipo === "entrega" ? `Entregar em: ${p.endereco} — ${p.bairroNome}${p.referencia ? " (" + p.referencia + ")" : ""}\n` : `Vou retirar na loja\n`;
  t += `Pagamento: ${p.pagamento}${p.troco_para ? " (troco para " + dinheiro(p.troco_para) + ")" : ""}${p.pagamento.startsWith("Cartão") && p.tipo === "entrega" ? " — levar maquininha" : ""}\n`;
  if (p.observacao) t += `Obs.: ${p.observacao}\n`;
  return t;
}

const ERROS = {
  LOJA_FECHADA: "A loja acabou de fechar. Tente de novo mais tarde.",
  FORA_DO_HORARIO: "Estamos fora do horário de funcionamento agora. Tente de novo quando abrirmos.",
  CUPOM_INVALIDO: "O cupom não vale mais. Apague o cupom e tente de novo.",
  ITEM_INDISPONIVEL: "Um item da sua sacola não está mais disponível. Recarregue a página.",
  BAIRRO_INVALIDO: "Escolha o bairro de novo, por favor.",
  DADOS_INVALIDOS: "Confira seus dados (nome, WhatsApp e endereço)."
};

$("fazerPedido").onclick = async () => {
  const erro = $("erroPedido"); erro.textContent = "";
  const v = k => $(k).value.trim();
  if (!lojaAbertaAgora()) return erro.textContent = "A loja está fechada agora.";
  if (v("nome").length < 2) return erro.textContent = "Escreva seu nome.";
  if (v("telefone").replace(/\D/g, "").length < 10) return erro.textContent = "Escreva seu WhatsApp com DDD.";
  if (tipo === "entrega") {
    if (v("rua").length < 3) return erro.textContent = "Escreva a rua para entrega.";
    if (!v("numero")) return erro.textContent = "Escreva o número da casa (ou \"s/n\").";
    if (v("bairro").length < 2) return erro.textContent = "Escreva o bairro para entrega.";
  }
  if (!pagamento) return erro.textContent = "Escolha a forma de pagamento.";
  if (pagamento === "Cartão" && !tipoCartao) return erro.textContent = "Escolha se o cartão é de crédito ou débito.";
  const c = contas();
  const troco = parseFloat(v("troco").replace(",", ".")) || null;
  if (pagamento === "Dinheiro" && troco && troco < c.total) return erro.textContent = "O valor do troco precisa ser maior que o total.";

  const entrega = tipo === "entrega";
  const pedido = {
    cliente_nome: v("nome"), telefone: v("telefone"), tipo,
    endereco: entrega ? v("rua") + ", " + v("numero") : null,
    bairro_id: null,
    bairro: entrega ? v("bairro") : null,
    referencia: entrega ? v("referencia") : null,
    pagamento: pagamentoFinal(), troco_para: pagamento === "Dinheiro" ? troco : null,
    cupom: cupomAtual ? cupomAtual.codigo : null,
    observacao: v("obsGeral"),
    itens: sacola.map(l => ({ tipo: l.tipo, id: l.id, qtd: l.qtd, obs: l.obs, sem: l.sem, add: l.add.map(a => ({ id: a.id, qtd: a.qtd })) }))
  };
  const extra = {
    bairroNome: v("bairro"),
    itensTexto: sacola.map(l => ({ nome: itemDaLinha(l).nome, preco: precoUnit(l), qtd: l.qtd, obs: l.obs, sem: l.sem, add: l.add }))
  };
  guardar("mota_cliente", { nome: pedido.cliente_nome, telefone: pedido.telefone, rua: v("rua"), numero: v("numero"), bairro: v("bairro"), referencia: v("referencia") });

  const botao = $("fazerPedido");
  botao.disabled = true; botao.textContent = "Enviando...";
  const mensagem = montarMensagem(Object.assign({}, pedido, extra), c);

  // Sem Supabase configurado: o pedido vai pelo WhatsApp
  if (!banco) {
    botao.disabled = false; botao.textContent = "Fazer pedido";
    $("areaFinalizar").classList.add("escondido");
    $("itensSacola").innerHTML = `<div class="vazio" style="color:#fff">
        <p style="font-size:40px">✅</p>
        <p><strong>Falta só um toque!</strong><br>Envie o pedido para a Mota Lanches pelo WhatsApp:</p>
        <a class="btn-whats" id="enviarWhats" target="_blank" href="${linkWhats(mensagem, D.cfg.whatsapp)}">Enviar pedido no WhatsApp</a>
      </div>${pagamento === "Pix" ? caixaPix(D.cfg, c.total, "MOTA") : ""}`;
    $("enviarWhats").onclick = () => { sacola = []; salvarSacola(); setTimeout(() => fechar("janelaSacola"), 800); };
    return;
  }

  const { data, error } = await banco.rpc("criar_pedido", { p: pedido });
  if (error || !data || !data.length) {
    botao.disabled = false; botao.textContent = "Fazer pedido";
    const m = error ? error.message || "" : "";
    const cod = Object.keys(ERROS).find(k => m.includes(k));
    if (m.includes("SEM_ESTOQUE")) {
      erro.textContent = "Acabou o estoque de: " + m.split("SEM_ESTOQUE:")[1] + ". Diminua a quantidade ou escolha outro item.";
    } else if (cod) {
      erro.textContent = ERROS[cod];
    } else {
      erro.innerHTML = `Não conseguimos enviar. <a href="${linkWhats(mensagem, D.cfg.whatsapp)}" target="_blank">Clique aqui para pedir pelo WhatsApp</a>.`;
    }
    return;
  }
  const { pedido_id, pedido_numero, pedido_total } = data[0];

  if (C.NTFY_TOPICO) {
    fetch("https://ntfy.sh/" + encodeURIComponent(C.NTFY_TOPICO), {
      method: "POST",
      headers: { Title: "Novo pedido #" + pedido_numero, Tags: "hamburger" },
      body: `${pedido.cliente_nome} - ${dinheiro(pedido_total)} - ${entrega ? "Entrega" : "Retirada"}`
    }).catch(() => {});
  }

  // guarda a mensagem completa do pedido neste celular, para o botão "Enviar também no WhatsApp"
  guardar("mota_msg_" + pedido_id, montarMensagem(Object.assign({}, pedido, extra), Object.assign({}, c, { total: Number(pedido_total) }), pedido_numero));
  const meus = ler("mota_meus_pedidos", []);
  meus.unshift({ id: pedido_id, numero: pedido_numero, data: new Date().toISOString(), total: pedido_total });
  guardar("mota_meus_pedidos", meus.slice(0, 20));
  sacola = []; guardar("mota_sacola", sacola);
  location.href = "pedido.html?id=" + pedido_id;
};

iniciar();
setInterval(atualizarLoja, 60000);
