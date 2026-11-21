/* Painel da Mota Lanches */
const $ = id => document.getElementById(id);
let secaoAtual = "pedidos", pedidos = [], vistos = null, timer = null;
let produtos = [], adicionais = [], cfg = {}, combos = [], itensCombo = [], editandoCombo = null;

/* ---------- Ajudantes ---------- */
function num(v) { const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", ".")); return isNaN(n) ? NaN : n; }
function inteiroOuNulo(v) { const t = String(v ?? "").trim(); if (!t) return null; const n = parseInt(t, 10); return isNaN(n) ? NaN : n; }
let toastTimer;
function aviso(msg, ruim) {
  const t = $("toast"); t.textContent = msg; t.classList.toggle("ruim", !!ruim); t.classList.remove("escondido");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add("escondido"), 2600);
}
function deuErro(error) { if (error) { console.error(error); aviso("Não deu certo. Confira a internet e tente de novo.", true); return true; } return false; }
function confirmar(msg) { try { return window.confirm(msg); } catch (e) { return true; } }
function dataHora(d) { return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
function hora(d) { return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
function textoAdd(add) { return (add || []).map(a => (a.qtd > 1 ? a.qtd + "x " : "") + a.nome).join(", "); }

/* ---------- Som de pedido novo (campainha "ding-dong") ---------- */
let audio;
let somLigado = ler("mota_som", true);
let jaTocou = new Set();          // pedidos que já tocaram a campainha
let novosPendentes = [];          // pedidos em "Novos"
function contextoSom() {
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  if (audio.state === "suspended") audio.resume().catch(() => {});
  return audio;
}
function nota(ctx, freq, inicio, dur, vol) {
  // sino: som principal + harmônicos, com batida forte e fim suave
  [[1, 1], [2.01, 0.35], [3.02, 0.15]].forEach(([mult, peso]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = freq * mult;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, inicio);
    g.gain.exponentialRampToValueAtTime(vol * peso, inicio + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
    o.start(inicio); o.stop(inicio + dur + 0.05);
  });
}
function tocar() {
  const ctx = contextoSom(); if (!ctx) return;
  const t = ctx.currentTime + 0.05;
  nota(ctx, 1318.5, t, 0.9, 0.55);        // ding (Mi)
  nota(ctx, 1046.5, t + 0.45, 1.3, 0.55); // dong (Dó)
  nota(ctx, 1318.5, t + 1.6, 0.9, 0.45);  // ding
  nota(ctx, 1046.5, t + 2.05, 1.3, 0.45); // dong
}
function mostrarBotaoSom() {
  $("somLiga").textContent = somLigado ? "🔔 Som ligado" : "🔕 Som desligado";
  $("somLiga").classList.toggle("som-off", !somLigado);
}
$("somLiga").onclick = () => { somLigado = !somLigado; guardar("mota_som", somLigado); mostrarBotaoSom(); if (somLigado) tocar(); };
// o navegador só deixa tocar som depois de um toque na tela
function conferirSomLiberado() {
  const preso = somLigado && (!audio || audio.state !== "running");
  $("avisoSom").classList.toggle("escondido", !preso);
}
document.addEventListener("pointerdown", () => { contextoSom(); setTimeout(conferirSomLiberado, 300); });
$("avisoSom").onclick = () => { tocar(); setTimeout(conferirSomLiberado, 300); };

// cada pedido novo toca a campainha 2 vezes ("ding-dong, ding-dong") e o som desliga sozinho
function atualizarAlarme() {
  const chegaram = novosPendentes.filter(id => !jaTocou.has(id));
  chegaram.forEach(id => jaTocou.add(id));
  if (chegaram.length && somLigado) { tocar(); setTimeout(conferirSomLiberado, 400); }
  $("faixaAlarme").classList.toggle("escondido", !novosPendentes.length);
  $("qtdNovosFaixa").textContent = novosPendentes.length === 1 ? "1 pedido novo esperando" : novosPendentes.length + " pedidos novos esperando";
}
$("verNovos").onclick = () => { document.querySelector('#menu [data-sec="pedidos"]').click(); };

/* ---------- Login ---------- */
async function iniciar() {
  if (!banco) { $("semConfig").classList.remove("escondido"); return; }
  const { data } = await banco.auth.getSession();
  if (data.session) entrarPainel(); else $("telaLogin").classList.remove("escondido");
}
$("entrar").onclick = async () => {
  $("erroLogin").textContent = "";
  $("entrar").disabled = true;
  const { error } = await banco.auth.signInWithPassword({ email: $("email").value.trim(), password: $("senha").value });
  $("entrar").disabled = false;
  if (error) { $("erroLogin").textContent = "E-mail ou senha incorretos."; return; }
  tocar(); // libera o som no navegador
  entrarPainel();
};
$("senha").addEventListener("keydown", e => { if (e.key === "Enter") $("entrar").click(); });
$("sair").onclick = async () => { await banco.auth.signOut(); location.reload(); };

async function entrarPainel() {
  const { data: ok } = await banco.rpc("is_admin");
  if (!ok) {
    await banco.auth.signOut();
    $("telaLogin").classList.remove("escondido");
    $("erroLogin").textContent = "Este e-mail não tem acesso ao painel.";
    return;
  }
  $("telaLogin").classList.add("escondido");
  $("telaPainel").classList.remove("escondido");
  await carregarConfig();
  carregarPedidos();
  carregarCardapio();
  carregarEstoque();
  clearInterval(timer); timer = setInterval(carregarPedidos, 10000);
  mostrarBotaoSom(); setTimeout(conferirSomLiberado, 500);
}

/* ---------- Menu ---------- */
$("menu").addEventListener("click", e => {
  const b = e.target.closest("button[data-sec]"); if (!b) return;
  secaoAtual = b.dataset.sec;
  document.querySelectorAll("#menu button").forEach(x => x.classList.toggle("ativa", x === b));
  document.querySelectorAll(".sec").forEach(s => s.classList.toggle("escondido", s.id !== "sec-" + secaoAtual));
  if (secaoAtual === "pedidos") { carregarPedidos(); document.title = "Painel | Mota Lanches"; }
  if (secaoAtual === "relatorios") gerarRelatorio();
  if (secaoAtual === "cardapio") carregarCardapio();
  if (secaoAtual === "estoque") carregarEstoque();
  if (secaoAtual === "promocoes") carregarPromocoes();
  if (secaoAtual === "combos") carregarCombos();
  if (secaoAtual === "config") carregarConfig();
  window.scrollTo(0, 0);
});

/* ---------- Config (loja aberta, numeração, bairros, dados da loja) ---------- */
const DIAS = [["seg", "Segunda"], ["ter", "Terça"], ["qua", "Quarta"], ["qui", "Quinta"], ["sex", "Sexta"], ["sab", "Sábado"], ["dom", "Domingo"]];

function telBanco(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d;
}

async function carregarConfig() {
  const { data } = await banco.from("config").select("*").eq("id", 1).maybeSingle();
  cfg = data || {};
  $("chaveLoja").checked = cfg.aberta !== false;
  $("textoLoja").textContent = $("chaveLoja").checked ? "Loja aberta" : "Loja fechada";
  $("descPix").value = String(cfg.desconto_pix ?? 0).replace(".", ",");
  if (secaoAtual === "config") preencherConfig();
}

function preencherConfig() {
  $("cfProximo").textContent = "Nº " + String(cfg.proximo_numero || 1).padStart(2, "0");
  $("taxaUnica").value = Number(cfg.taxa_unica || 0).toFixed(2).replace(".", ",");
  $("cfWhats").value = telVisivel(cfg.whatsapp);
  $("cfWhats2").value = telVisivel(cfg.whatsapp2);
  $("cfPix").value = cfg.chave_pix || "";
  $("cfPixTipo").value = cfg.pix_tipo || "telefone";
  $("cfPixNome").value = cfg.pix_nome || "";
  $("cfPixCidade").value = cfg.pix_cidade || "";
  $("cfFrase").value = cfg.frase || "";
  $("cfEndereco").value = cfg.endereco || "";
  $("cfHorario").value = cfg.horario || "";
  $("cfInsta").value = cfg.instagram || "";
  const h = cfg.horarios || {};
  $("cfHorarios").innerHTML = DIAS.map(([k, nome]) => {
    const d = h[k] || { aberto: false, abre: "18:00", fecha: "23:30" };
    return `<div class="dia ${d.aberto ? "" : "fechado"}" data-dia="${k}">
      <label class="check"><input type="checkbox" data-c="aberto" ${d.aberto ? "checked" : ""}> ${nome}</label>
      <input class="campo" type="time" data-c="abre" value="${esc(d.abre || "18:00")}">
      <span class="as">às</span>
      <input class="campo" type="time" data-c="fecha" value="${esc(d.fecha || "23:30")}">
    </div>`;
  }).join("");
}
$("cfHorarios").addEventListener("change", e => {
  if (e.target.dataset.c === "aberto") e.target.closest(".dia").classList.toggle("fechado", !e.target.checked);
});

async function salvarConfig(campos, msg) {
  const { error } = await banco.from("config").update(campos).eq("id", 1);
  if (deuErro(error)) return false;
  Object.assign(cfg, campos); aviso(msg || "Salvo!"); return true;
}
$("chaveLoja").onchange = async e => {
  const aberta = e.target.checked;
  if (!(await salvarConfig({ aberta }, aberta ? "Loja aberta para pedidos" : "Loja fechada"))) { e.target.checked = !aberta; return; }
  $("textoLoja").textContent = aberta ? "Loja aberta" : "Loja fechada";
};

$("cfSalvar").onclick = async () => {
  const whatsapp = telBanco($("cfWhats").value), whatsapp2 = telBanco($("cfWhats2").value);
  if (whatsapp.length < 12) return aviso("Confira o WhatsApp principal, com DDD. Ex.: (16) 99153-0000", true);
  if (whatsapp2 && whatsapp2.length < 12) return aviso("Confira o WhatsApp 2, com DDD.", true);
  const horarios = {};
  for (const linha of document.querySelectorAll("#cfHorarios .dia")) {
    const g = c => linha.querySelector(`[data-c="${c}"]`);
    const d = { aberto: g("aberto").checked, abre: g("abre").value || "18:00", fecha: g("fecha").value || "23:30" };
    if (d.aberto && d.abre === d.fecha) return aviso("Num dos dias o horário de abrir e fechar está igual.", true);
    horarios[linha.dataset.dia] = d;
  }
  let insta = $("cfInsta").value.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "").replace(/^@/, "");
  const b = $("cfSalvar"); b.disabled = true;
  await salvarConfig({
    whatsapp, whatsapp2, chave_pix: $("cfPix").value.trim(), pix_tipo: $("cfPixTipo").value,
    pix_nome: $("cfPixNome").value.trim(), pix_cidade: $("cfPixCidade").value.trim(),
    frase: $("cfFrase").value.trim(), endereco: $("cfEndereco").value.trim(),
    horarios, horario: $("cfHorario").value.trim(), instagram: insta ? "@" + insta : ""
  }, "Dados da loja salvos!");
  b.disabled = false;
  preencherConfig();
};

$("cfRecomecar").onclick = async () => {
  const { count, error } = await banco.from("pedidos").select("id", { count: "exact", head: true });
  if (deuErro(error)) return;
  if (count > 0) return aviso(`Ainda tem ${count} pedido(s) na lista. Cancele e exclua todos na aba 📋 Pedidos antes.`, true);
  if (!confirmar("Recomeçar a numeração? O próximo pedido será o Nº 01.")) return;
  const r = await banco.rpc("recomecar_numeracao");
  if (r.error && /TEM_PEDIDOS/.test(r.error.message)) return aviso("Ainda tem pedidos na lista. Exclua todos antes.", true);
  if (deuErro(r.error)) return;
  cfg.proximo_numero = 1; preencherConfig(); aviso("Pronto! O próximo pedido será o Nº 01.");
};

/* Taxa de entrega: um valor só para a cidade */
$("salvarTaxaUnica").onclick = async () => {
  const v = num($("taxaUnica").value || "0");
  if (isNaN(v) || v < 0) return aviso("Valor inválido.", true);
  if (await salvarConfig({ taxa_unica: v, taxa_modo: "unica" }, v > 0 ? `Taxa de entrega: ${dinheiro(v)}` : "Taxa de entrega: a combinar"))
    $("taxaUnica").value = v.toFixed(2).replace(".", ",");
};

/* =========================================================
   PEDIDOS
   ========================================================= */
async function carregarPedidos() {
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data, error } = await banco.from("pedidos").select("*")
    .or(`status.in.(novo,andamento),criado_em.gte."${desde}"`)
    .order("criado_em", { ascending: true }).limit(300);
  if (error) { if (/JWT|auth/i.test(error.message)) location.reload(); return; }
  pedidos = data;
  const novos = pedidos.filter(p => p.status === "novo");
  const ids = new Set(novos.map(p => p.id));
  const chegaram = vistos ? [...ids].filter(i => !vistos.has(i)) : [];
  if (chegaram.length && (document.hidden || secaoAtual !== "pedidos")) document.title = "🔔 Pedido novo! | Mota Lanches";
  vistos = ids;
  novosPendentes = [...ids];
  atualizarAlarme();
  $("nNovos").textContent = novos.length;
  $("nNovos").classList.toggle("escondido", !novos.length);
  $("horaAtualizacao").textContent = "última: " + hora(new Date());
  desenharPedidos(new Set(chegaram));
}

function mensagemCliente(p) {
  const nome = p.cliente_nome.split(" ")[0];
  const pix = String(p.pagamento) === "Pix" && p.status !== "cancelado" ? (p.pago ? " ✅ Pix concluído." : " ⏳ Aguardando o Pix.") : "";
  return mensagemBase(p, nome) + pix;
}
function mensagemBase(p, nome) {
  if (p.status === "novo") return `Olá, ${nome}! Recebemos seu pedido #${p.numero} na Mota Lanches. Total: ${dinheiro(p.total)}. Já já começamos a preparar! 🍔`;
  if (p.status === "andamento") return `Olá, ${nome}! Seu pedido #${p.numero} está sendo preparado. 🍔🔥`;
  if (p.status === "finalizado") return p.tipo === "entrega"
    ? `Olá, ${nome}! Seu pedido #${p.numero} saiu para entrega! 🛵 Total: ${dinheiro(p.total)}${p.pagamento === "Dinheiro" && p.troco_para ? ` (troco para ${dinheiro(p.troco_para)})` : ""}.`
    : `Olá, ${nome}! Seu pedido #${p.numero} está pronto para retirar! 🏪`;
  return `Olá, ${nome}. Infelizmente seu pedido #${p.numero} foi cancelado. Qualquer dúvida, é só chamar aqui.`;
}

function cartaoPedido(p, chegou) {
  const tel = String(p.telefone).replace(/\D/g, "");
  const whats = "https://wa.me/" + (tel.startsWith("55") ? tel : "55" + tel) + "?text=" + encodeURIComponent(mensagemCliente(p));
  let botoes = "";
  if (p.status === "novo") botoes += `<button class="b-andamento" data-st="andamento" data-id="${p.id}">▶ Em andamento</button>`;
  if (p.status === "andamento") botoes += `<button class="b-finalizar" data-st="finalizado" data-id="${p.id}">✓ Finalizar</button>`;
  if (p.status === "novo" || p.status === "andamento") botoes += `<button class="b-cancelar" data-st="cancelado" data-id="${p.id}">Cancelar</button>`;
  const ehPix = String(p.pagamento) === "Pix";
  if (p.status !== "cancelado") botoes += p.pago
    ? `<button class="b-despagar" data-pago="${p.id}" data-v="0">↩ ${ehPix ? "Voltar para aguardando Pix" : "Desmarcar pago"}</button>`
    : `<button class="b-pago" data-pago="${p.id}" data-v="1">✅ ${ehPix ? "Pix concluído" : "Marcar como pago"}</button>`;
  botoes += `<a class="b-whats" target="_blank" href="${whats}">💬 Avisar cliente pelo WhatsApp</a>`;
  // Pix ainda não pago: botões para mandar a chave/código Pix ao cliente
  const codPix = ehPix && !p.pago && p.status !== "cancelado" ? pixCopiaCola(Object.assign({ pix_nome: "", pix_cidade: "" }, cfg), Number(p.total), "MOTA" + p.numero) : "";
  if (codPix) {
    const nome = esc(p.cliente_nome.split(" ")[0]);
    const msgPix = `Olá, ${p.cliente_nome.split(" ")[0]}! Segue o Pix do seu pedido #${p.numero} na Mota Lanches.\n\n` +
      `Valor: *${dinheiro(p.total)}*\nChave Pix: ${cfg.chave_pix}${cfg.pix_nome ? "\nNome: " + cfg.pix_nome : ""}\n\n` +
      `Ou use o *Pix copia e cola* (copie o código abaixo e cole no app do banco):\n\n${codPix}`;
    botoes += `<a class="b-whats b-enviar-pix" target="_blank" href="https://wa.me/${tel.startsWith("55") ? tel : "55" + tel}?text=${encodeURIComponent(msgPix)}">💠 Enviar Pix para ${nome}</a>`;
    botoes += `<button class="b-copiar-pix btn-copiar-pix" data-codigo="${esc(codPix)}">📋 Copiar código Pix</button>`;
  }
  botoes += `<button class="b-print" data-imprimir="${p.id}" title="Imprimir comanda">🖨️</button>`;
  botoes += `<button class="b-excluir" data-excluir="${p.id}">Excluir</button>`;
  return `<div class="ped st-${p.status} ${chegou ? "chegou" : ""}" id="p-${p.id}">
    <div class="ped-topo"><span class="ped-num">#${p.numero}</span><span>${hora(p.criado_em)} · <strong>${p.tipo === "entrega" ? "🛵 ENTREGA" : "🏪 RETIRADA"}</strong></span></div>
    ${p.status === "cancelado" ? `<span class="selo-cancelado">CANCELADO</span>` : p.status === "finalizado" ? `<span class="selo-fim">FINALIZADO</span>` : ""}
    ${p.status === "cancelado" ? "" : String(p.pagamento) === "Pix"
      ? (p.pago ? `<span class="selo-pago">✅ PIX CONCLUÍDO</span>` : `<span class="selo-aguardando">⏳ AGUARDANDO PIX</span>`)
      : (p.pago ? `<span class="selo-pago">✅ PAGO</span>` : "")}
    <div style="margin-top:4px"><strong>${esc(p.cliente_nome)}</strong> · ${esc(p.telefone)}</div>
    ${p.tipo === "entrega" ? `<div>📍 ${esc(p.endereco)} — ${esc(p.bairro)}${p.referencia ? ` <span class="dica">(${esc(p.referencia)})</span>` : ""}</div>` : ""}
    <ul>${p.itens.map(i => `<li><strong>${i.qtd}x</strong> ${i.codigo ? `<span class="cod">${esc(i.codigo)}</span> ` : ""}${esc(i.nome)} <span class="dica">${dinheiro(i.preco * i.qtd)}</span>
      ${i.sem && i.sem.length ? `<div class="obs sem">✕ SEM ${esc(i.sem.join(", "))}</div>` : ""}
      ${i.add && i.add.length ? `<div class="obs add">+ ${esc(textoAdd(i.add))}</div>` : ""}
      ${i.obs ? `<div class="obs">📝 ${esc(i.obs)}</div>` : ""}</li>`).join("")}</ul>
    ${p.observacao ? `<div class="obs" style="margin:0 0 6px">📝 Pedido: ${esc(p.observacao)}</div>` : ""}
    <div>💳 ${esc(p.pagamento)}${p.troco_para ? ` — troco para <strong>${dinheiro(p.troco_para)}</strong> (devolver ${dinheiro(p.troco_para - p.total)})` : ""}</div>
    ${String(p.pagamento).startsWith("Cartão") && p.tipo === "entrega" ? `<div class="maquininha">🛵 LEVAR MAQUININHA</div>` : ""}
    ${Number(p.desconto) > 0 ? `<div class="dica">Desconto: − ${dinheiro(p.desconto)}${p.cupom ? ` (cupom ${esc(p.cupom)})` : ""}</div>` : ""}
    ${p.tipo === "entrega" ? `<div class="dica">Entrega: ${Number(p.taxa) > 0 ? dinheiro(p.taxa) : "a combinar"}</div>` : ""}
    <div style="font-size:18px;font-weight:800;color:var(--amarelo);margin-top:4px">Total ${dinheiro(p.total)}</div>
    <div class="acoes">${botoes}</div>
  </div>`;
}

function desenharPedidos(chegaram = new Set()) {
  const novo = pedidos.filter(p => p.status === "novo");
  const and = pedidos.filter(p => p.status === "andamento");
  const fim = pedidos.filter(p => p.status === "finalizado" || p.status === "cancelado").reverse();
  const vazio = `<p class="vazio">Nenhum pedido aqui.</p>`;
  $("colNovo").innerHTML = novo.map(p => cartaoPedido(p, chegaram.has(p.id))).join("") || vazio;
  $("colAndamento").innerHTML = and.map(p => cartaoPedido(p)).join("") || vazio;
  $("colFim").innerHTML = fim.map(p => cartaoPedido(p)).join("") || vazio;
  $("cNovo").textContent = novo.length; $("cAndamento").textContent = and.length; $("cFim").textContent = fim.length;
}

$("sec-pedidos").addEventListener("click", async e => {
  const imp = e.target.closest("[data-imprimir]");
  if (imp) {
    const el = $("p-" + imp.dataset.imprimir);
    el.classList.add("imprimindo"); try { window.print(); } catch (x) {} el.classList.remove("imprimindo");
    return;
  }
  const pg = e.target.closest("[data-pago]");
  if (pg) {
    const valor = pg.dataset.v === "1";
    pg.disabled = true;
    const { error } = await banco.from("pedidos").update({ pago: valor, pago_em: valor ? new Date().toISOString() : null }).eq("id", pg.dataset.pago);
    if (deuErro(error)) { pg.disabled = false; return; }
    const pd = pedidos.find(x => x.id === pg.dataset.pago);
    const pix = pd && String(pd.pagamento) === "Pix";
    aviso(valor ? (pix ? "✅ Pix concluído" : "Pedido marcado como pago ✅") : (pix ? "⏳ Voltou para aguardando Pix" : "Pagamento desmarcado"));
    carregarPedidos();
    return;
  }
  const ex = e.target.closest("[data-excluir]");
  if (ex) {
    const p = pedidos.find(x => x.id === ex.dataset.excluir);
    if (!confirmar(`Excluir o pedido #${p.numero} para sempre? Ele some também dos relatórios.`)) return;
    ex.disabled = true;
    if (!deuErro((await banco.from("pedidos").delete().eq("id", p.id)).error)) { aviso("Pedido excluído"); carregarPedidos(); }
    else ex.disabled = false;
    return;
  }
  const b = e.target.closest("button[data-st]"); if (!b) return;
  const p = pedidos.find(x => x.id === b.dataset.id);
  if (b.dataset.st === "cancelado" && !confirmar(`Cancelar o pedido #${p.numero}?`)) return;
  b.disabled = true;
  const { error } = await banco.from("pedidos").update({ status: b.dataset.st }).eq("id", b.dataset.id);
  if (deuErro(error)) { b.disabled = false; return; }
  carregarPedidos();
});
document.addEventListener("visibilitychange", () => { if (!document.hidden && secaoAtual === "pedidos") document.title = "Painel | Mota Lanches"; });

/* =========================================================
   RELATÓRIOS
   ========================================================= */
function periodo() {
  const v = $("relPeriodo").value, hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dia = 86400000;
  if (v === "hoje") return [hoje, new Date(+hoje + dia)];
  if (v === "ontem") return [new Date(+hoje - dia), hoje];
  if (v === "7") return [new Date(+hoje - 6 * dia), new Date(+hoje + dia)];
  if (v === "30") return [new Date(+hoje - 29 * dia), new Date(+hoje + dia)];
  if (v === "mes") return [new Date(hoje.getFullYear(), hoje.getMonth(), 1), new Date(+hoje + dia)];
  const de = $("relDe").value ? new Date($("relDe").value + "T00:00:00") : hoje;
  const ate = $("relAte").value ? new Date(+new Date($("relAte").value + "T00:00:00") + dia) : new Date(+hoje + dia);
  return [de, ate];
}
$("relPeriodo").onchange = () => {
  $("relDatas").classList.toggle("escondido", $("relPeriodo").value !== "custom");
  if ($("relPeriodo").value !== "custom") gerarRelatorio();
};
$("relGerar").onclick = () => gerarRelatorio();

async function buscarPeriodo() {
  const [de, ate] = periodo();
  const { data, error } = await banco.from("pedidos").select("*")
    .gte("criado_em", de.toISOString()).lt("criado_em", ate.toISOString())
    .order("criado_em", { ascending: true }).limit(5000);
  if (deuErro(error)) return null;
  return data;
}

async function gerarRelatorio() {
  $("relResultado").innerHTML = `<p class="vazio">Calculando...</p>`;
  const lista = await buscarPeriodo(); if (!lista) return;
  const validos = lista.filter(p => p.status !== "cancelado");
  const cancel = lista.length - validos.length;
  const soma = (arr, f) => arr.reduce((s, p) => s + Number(f(p) || 0), 0);
  const fat = soma(validos, p => p.total);
  const porPag = {}, porItem = {}, porDia = {}, porTipo = { entrega: 0, retirada: 0 };
  validos.forEach(p => {
    porPag[p.pagamento] = (porPag[p.pagamento] || 0) + Number(p.total);
    porTipo[p.tipo]++;
    const d = new Date(p.criado_em).toLocaleDateString("pt-BR");
    porDia[d] = porDia[d] || { n: 0, v: 0 }; porDia[d].n++; porDia[d].v += Number(p.total);
    p.itens.forEach(i => { porItem[i.nome] = porItem[i.nome] || { q: 0, v: 0 }; porItem[i.nome].q += i.qtd; porItem[i.nome].v += i.preco * i.qtd; });
  });
  const top = Object.entries(porItem).sort((a, b) => b[1].q - a[1].q).slice(0, 10);
  const maxQ = top.length ? top[0][1].q : 1;
  const card = (r, v) => `<div class="card"><div class="rotulo">${r}</div><div class="valor">${v}</div></div>`;
  $("relResultado").innerHTML = `
    <div class="cards">
      ${card("Faturamento", dinheiro(fat))}
      ${card("Pedidos", validos.length)}
      ${card("Ticket médio", dinheiro(validos.length ? fat / validos.length : 0))}
      ${card("Descontos dados", dinheiro(soma(validos, p => p.desconto)))}
      ${card("Taxas de entrega", dinheiro(soma(validos, p => p.taxa)))}
      ${card("Cancelados", cancel)}
    </div>
    <div class="cards">
      <div class="bloco" style="margin:0"><h3>Por pagamento</h3>
        ${Object.entries(porPag).map(([k, v]) => `<div class="linha-lista"><span>${esc(k)}</span><strong>${dinheiro(v)}</strong></div>`).join("") || `<p class="dica">Sem vendas.</p>`}
        <div class="linha-lista"><span>🛵 Entregas</span><strong>${porTipo.entrega}</strong></div>
        <div class="linha-lista"><span>🏪 Retiradas</span><strong>${porTipo.retirada}</strong></div>
      </div>
      <div class="bloco" style="margin:0;grid-column:span 2"><h3>Mais vendidos</h3>
        ${top.map(([n, x]) => `<div style="margin-top:8px"><div style="display:flex;justify-content:space-between"><span>${esc(n)}</span><span><strong>${x.q}</strong> · ${dinheiro(x.v)}</span></div>
          <div class="barra-h" style="width:${Math.max(4, x.q / maxQ * 100)}%"></div></div>`).join("") || `<p class="dica">Sem vendas.</p>`}
      </div>
    </div>
    <div class="bloco"><h3>Por dia</h3>
      <table class="tabela"><thead><tr><th>Dia</th><th class="num">Pedidos</th><th class="num">Faturamento</th></tr></thead><tbody>
      ${Object.entries(porDia).map(([d, x]) => `<tr><td>${d}</td><td class="num">${x.n}</td><td class="num">${dinheiro(x.v)}</td></tr>`).join("") || `<tr><td colspan="3" class="dica">Nenhum pedido no período.</td></tr>`}
      </tbody></table>
    </div>`;
}

$("relCsv").onclick = async () => {
  const lista = await buscarPeriodo(); if (!lista) return;
  if (!lista.length) return aviso("Nenhum pedido no período.", true);
  const c = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const n = v => Number(v || 0).toFixed(2).replace(".", ",");
  const linhas = [["Número", "Data", "Status", "Cliente", "Telefone", "Tipo", "Bairro", "Endereço", "Pagamento", "Itens", "Subtotal", "Desconto", "Cupom", "Taxa entrega", "Total"].map(c).join(";")];
  lista.forEach(p => linhas.push([
    p.numero, new Date(p.criado_em).toLocaleString("pt-BR"), p.status, p.cliente_nome, p.telefone, p.tipo, p.bairro || "", p.endereco || "", p.pagamento,
    p.itens.map(i => `${i.qtd}x ${i.nome}${i.sem && i.sem.length ? " (sem " + i.sem.join(", ") + ")" : ""}${i.add && i.add.length ? " (+ " + textoAdd(i.add) + ")" : ""}`).join(" | ")
  ].map(c).concat([n(p.subtotal), n(p.desconto), c(p.cupom || ""), n(p.taxa), n(p.total)]).join(";")));
  const [de, ate] = periodo();
  const nome = `pedidos-mota-${de.toISOString().slice(0, 10)}-a-${new Date(+ate - 1).toISOString().slice(0, 10)}.csv`;
  const blob = new Blob(["﻿" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

/* =========================================================
   CARDÁPIO (categorias, produtos com foto, em falta, adicionais)
   ========================================================= */
let categorias = [], editandoProduto = null, fotoNova = null, fotoRemover = false;

async function carregarCardapio() {
  const [c, p, a] = await Promise.all([
    banco.from("categorias").select("*").order("ordem").order("nome"),
    banco.from("produtos").select("*").order("ordem").order("nome"),
    banco.from("adicionais").select("*").order("ordem").order("nome")
  ]);
  if (deuErro(c.error || p.error || a.error)) return;
  categorias = c.data; produtos = p.data; adicionais = a.data;
  desenharCats(); desenharProdutos(); desenharAdicionais(); alertaEstoque(); preencherSelects();
}

function alertaEstoque() {
  const falta = produtos.filter(p => p.ativo && p.em_falta);
  $("nBaixo").textContent = falta.length; $("nBaixo").classList.toggle("escondido", !falta.length);
  $("alertaEstoque").innerHTML = falta.length
    ? `<div class="alerta" style="margin-top:12px"><strong>🚫 Em falta:</strong> ${falta.map(p => esc(p.nome)).join(" · ")}</div>` : "";
}

/* ----- Categorias ----- */
function desenharCats() {
  $("listaCats").innerHTML = categorias.map((c, n) => `<div class="cat-linha" data-nome="${esc(c.nome)}">
      <input class="campo" value="${esc(c.nome)}" data-campo="nome">
      <button class="icone-btn" data-acao="subir" ${n === 0 ? "disabled" : ""} aria-label="Subir">↑</button>
      <button class="icone-btn" data-acao="descer" ${n === categorias.length - 1 ? "disabled" : ""} aria-label="Descer">↓</button>
      <button class="icone-btn" data-acao="apagar" aria-label="Apagar">🗑️</button>
    </div>`).join("") || `<p class="dica">Nenhuma categoria.</p>`;
  $("jpCategoria").innerHTML = categorias.map(c => `<option value="${esc(c.nome)}">${esc(c.nome)}</option>`).join("");
}
$("listaCats").addEventListener("change", async e => {
  if (e.target.dataset.campo !== "nome") return;
  const linha = e.target.closest("[data-nome]"), antigo = linha.dataset.nome, novo = e.target.value.trim();
  if (!novo || novo === antigo) { e.target.value = antigo; return; }
  if (categorias.some(c => c.nome === novo)) { e.target.value = antigo; return aviso("Já existe uma categoria com esse nome.", true); }
  // os produtos da categoria acompanham o novo nome automaticamente
  if (deuErro((await banco.from("categorias").update({ nome: novo }).eq("nome", antigo)).error)) { e.target.value = antigo; return; }
  aviso("Categoria renomeada!"); carregarCardapio();
});
$("listaCats").addEventListener("click", async e => {
  const b = e.target.closest("button[data-acao]"); if (!b) return;
  const nome = b.closest("[data-nome]").dataset.nome, i = categorias.findIndex(c => c.nome === nome);
  if (b.dataset.acao === "apagar") {
    const qtd = produtos.filter(p => p.categoria === nome).length;
    if (qtd) return aviso(`Essa categoria tem ${qtd} item(ns). Mude eles de categoria ou apague antes.`, true);
    if (!confirmar(`Apagar a categoria "${nome}"?`)) return;
    if (!deuErro((await banco.from("categorias").delete().eq("nome", nome)).error)) { aviso("Categoria apagada"); carregarCardapio(); }
    return;
  }
  const j = b.dataset.acao === "subir" ? i - 1 : i + 1;
  if (j < 0 || j >= categorias.length) return;
  // renumera todas para garantir a ordem
  const nova = categorias.slice(); [nova[i], nova[j]] = [nova[j], nova[i]];
  b.disabled = true;
  const res = await Promise.all(nova.map((c, n) => c.ordem === (n + 1) * 10 ? { error: null } : banco.from("categorias").update({ ordem: (n + 1) * 10 }).eq("nome", c.nome)));
  if (deuErro(res.find(r => r.error)?.error)) return;
  carregarCardapio();
});
$("addCat").onclick = async () => {
  const nome = $("novaCat").value.trim();
  if (!nome) return aviso("Escreva o nome da categoria.", true);
  if (categorias.some(c => c.nome.toLowerCase() === nome.toLowerCase())) return aviso("Essa categoria já existe.", true);
  const ordem = Math.max(0, ...categorias.map(c => c.ordem)) + 10;
  if (deuErro((await banco.from("categorias").insert({ nome, ordem })).error)) return;
  $("novaCat").value = ""; aviso("Categoria criada!"); carregarCardapio();
};

/* ----- Produtos ----- */
function desenharProdutos() {
  const f = slug($("buscaProd").value).replace(/-/g, " ").trim();
  const visiveis = produtos.filter(p => !f || slug(p.nome + " " + p.descricao + " " + (p.codigo || "")).replace(/-/g, " ").includes(f));
  $("nProdutos").textContent = produtos.length;
  const nomesCat = categorias.map(c => c.nome);
  produtos.forEach(p => { if (!nomesCat.includes(p.categoria)) nomesCat.push(p.categoria); });
  $("listaProdutos").innerHTML = nomesCat.map(cat => {
    const lista = visiveis.filter(p => p.categoria === cat);
    if (!lista.length) return "";
    return `<div class="grupo-titulo">${iconeCategoria(cat)} ${esc(cat)}</div>` + lista.map(p => {
      return `<div class="prod ${p.ativo ? "" : "desligado"}" data-id="${esc(p.id)}">
        <div class="prod-foto">${p.foto_url ? `<img class="prod-foto" src="${esc(p.foto_url)}" alt="">` : "🍔"}</div>
        <div style="min-width:0">
          <div class="prod-nome">${esc(p.nome)}${!p.ativo ? `<span class="selo-mini cinza">FORA DO SITE</span>` : ""}${p.em_falta ? `<span class="selo-mini vermelho">EM FALTA</span>` : ""}${p.combina ? `<span class="selo-mini cinza">🍟 COMBINA COM</span>` : ""}${p.preco_oferta !== null ? `<span class="selo-mini vermelho">OFERTA ${dinheiro(p.preco_oferta)}</span>` : ""}</div>
          <div class="prod-desc">${dinheiro(p.preco)}${p.codigo ? " · Cód. " + esc(p.codigo) : ""}${p.descricao ? " · " + esc(p.descricao) : ""}</div>
        </div>
        <div class="prod-ctrl">
          <span class="rot" style="color:var(--verde)">$</span><input class="campo" data-campo="preco" value="${Number(p.preco).toFixed(2).replace(".", ",")}" inputmode="decimal" aria-label="Preço">
          <div class="flags">
            <label class="flag ${p.em_falta ? "on-falta" : ""}"><input type="checkbox" data-campo="em_falta" ${p.em_falta ? "checked" : ""}> Em falta</label>
            <label class="flag ${p.mais_vendido ? "on-top" : ""}"><input type="checkbox" data-campo="mais_vendido" ${p.mais_vendido ? "checked" : ""}> ⭐ Mais vendido</label>
          </div>
          <button class="btn-editar" data-acao="editar">Editar</button>
          <button class="icone-btn" data-acao="apagar" aria-label="Apagar">🗑️</button>
        </div>
      </div>`;
    }).join("");
  }).join("") || `<p class="vazio">Nenhum item encontrado.</p>`;
}
$("buscaProd").addEventListener("input", desenharProdutos);

// preço e marcações salvam sozinhos
$("listaProdutos").addEventListener("change", async e => {
  const campo = e.target.dataset.campo; if (!campo) return;
  const id = e.target.closest("[data-id]").dataset.id, p = produtos.find(x => x.id === id);
  let valor;
  if (campo === "preco") {
    valor = num(e.target.value);
    if (isNaN(valor) || valor < 0) { e.target.value = Number(p.preco).toFixed(2).replace(".", ","); return aviso("Preço inválido.", true); }
    if (p.preco_oferta !== null && p.preco_oferta >= valor) { e.target.value = Number(p.preco).toFixed(2).replace(".", ","); return aviso("O preço precisa ser maior que a oferta. Tire a oferta antes.", true); }
  } else valor = e.target.checked;
  const { error } = await banco.from("produtos").update({ [campo]: valor }).eq("id", id);
  if (deuErro(error)) { carregarCardapio(); return; }
  p[campo] = valor;
  const nomes = { preco: "Preço", em_falta: valor ? "Marcado em falta" : "Voltou ao cardápio", mais_vendido: valor ? "Agora é ⭐ Mais vendido" : "Saiu dos mais vendidos" };
  aviso(`${p.nome}: ${campo === "preco" ? "Preço salvo" : nomes[campo]}`);
  desenharProdutos(); alertaEstoque();
});
$("listaProdutos").addEventListener("click", async e => {
  const b = e.target.closest("button[data-acao]"); if (!b) return;
  const id = b.closest("[data-id]").dataset.id, p = produtos.find(x => x.id === id);
  if (b.dataset.acao === "editar") return abrirProduto(p);
  if (!confirmar(`Apagar "${p.nome}" do cardápio? (Para só esconder, use Editar → desmarque "Mostrar no site".)`)) return;
  if (deuErro((await banco.from("produtos").delete().eq("id", id)).error)) return;
  if (p.foto_url) apagarFoto(p.foto_url);
  aviso("Item apagado"); carregarCardapio();
});

/* ----- Janela novo / editar ----- */
function mostrarFotoPrev(url) {
  $("jpFotoPrev").innerHTML = url ? `<img src="${esc(url)}" alt="">` : "🍔";
  $("jpTirarFoto").classList.toggle("escondido", !url);
}
function abrirProduto(p) {
  editandoProduto = p || null; fotoNova = null; fotoRemover = false;
  $("jpTitulo").textContent = p ? "Editar " + p.nome : "Novo produto";
  $("jpNome").value = p ? p.nome : "";
  $("jpCategoria").value = p ? p.categoria : (categorias[0] ? categorias[0].nome : "");
  $("jpDesc").value = p ? p.descricao : "";
  $("jpPreco").value = p ? Number(p.preco).toFixed(2).replace(".", ",") : "";
  $("jpOferta").value = p && p.preco_oferta !== null ? Number(p.preco_oferta).toFixed(2).replace(".", ",") : "";
  $("jpCodigo").value = p ? (p.codigo || "") : proximoCodigo();
  $("jpOpcoes").checked = p ? p.tem_opcoes : true;
  $("jpAtivo").checked = p ? p.ativo : true;
  $("jpFalta").checked = p ? p.em_falta : false;
  $("jpTop").checked = p ? p.mais_vendido : false;
  $("jpCombina").checked = p ? !!p.combina : false;
  $("jpErro").textContent = ""; $("jpFoto").value = "";
  mostrarFotoPrev(p ? p.foto_url : null);
  $("janelaProduto").classList.remove("escondido");
  document.querySelector("#janelaProduto .janela").scrollTop = 0;
}
function proximoCodigo() {
  const maior = Math.max(0, ...produtos.map(x => parseInt(x.codigo, 10)).filter(n => !isNaN(n)));
  return String(maior + 1).padStart(2, "0");
}
function fecharProduto() { $("janelaProduto").classList.add("escondido"); }
$("btnNovoProduto").onclick = () => { if (!categorias.length) return aviso("Crie uma categoria primeiro.", true); abrirProduto(null); };
$("jpFechar").onclick = fecharProduto;
$("janelaProduto").addEventListener("click", e => { if (e.target.id === "janelaProduto") fecharProduto(); });

// diminui a foto antes de enviar (máx. 900px, JPG)
function reduzirFoto(arquivo) {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => {
      const max = 900, esc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => b ? ok(b) : erro(new Error("foto")), "image/jpeg", 0.82);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => erro(new Error("foto"));
    img.src = URL.createObjectURL(arquivo);
  });
}
$("jpFoto").addEventListener("change", async e => {
  const arq = e.target.files[0]; if (!arq) return;
  try {
    fotoNova = await reduzirFoto(arq); fotoRemover = false;
    mostrarFotoPrev(URL.createObjectURL(fotoNova));
  } catch (x) { aviso("Não deu para abrir essa foto. Tente outra.", true); }
});
$("jpTirarFoto").onclick = () => { fotoNova = null; fotoRemover = true; $("jpFoto").value = ""; mostrarFotoPrev(null); };

async function enviarFoto(blob, id) {
  const caminho = `produtos/${id}-${Date.now().toString(36)}.jpg`;
  const { error } = await banco.storage.from("fotos").upload(caminho, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return banco.storage.from("fotos").getPublicUrl(caminho).data.publicUrl;
}
function apagarFoto(url) {
  const marca = "/fotos/", i = String(url).indexOf(marca);
  if (i >= 0) banco.storage.from("fotos").remove([url.slice(i + marca.length)]).catch(() => {});
}

$("jpSalvar").onclick = async () => {
  const nome = $("jpNome").value.trim(), categoria = $("jpCategoria").value;
  const preco = num($("jpPreco").value);
  const oferta = $("jpOferta").value.trim() ? num($("jpOferta").value) : null;
  const codigo = $("jpCodigo").value.trim() || null;
  const erro = t => { $("jpErro").textContent = t; };
  if (!nome) return erro("Escreva o nome.");
  if (!categoria) return erro("Escolha a categoria.");
  if (isNaN(preco) || preco < 0) return erro("Preço inválido.");
  if (oferta !== null && (isNaN(oferta) || oferta < 0 || oferta >= preco)) return erro("A oferta precisa ser menor que o preço.");
  if (codigo && produtos.some(x => x.codigo === codigo && (!editandoProduto || x.id !== editandoProduto.id))) return erro("Já existe outro item com esse código.");
  $("jpSalvar").disabled = true; $("jpSalvar").textContent = "Salvando...";
  try {
    const p = editandoProduto;
    let id = p ? p.id : slug(nome) || "item";
    if (!p && produtos.some(x => x.id === id)) id += "-" + Date.now().toString(36);
    const dados = {
      nome, categoria, codigo, descricao: $("jpDesc").value.trim(), preco, preco_oferta: oferta,
      tem_opcoes: $("jpOpcoes").checked, ativo: $("jpAtivo").checked, em_falta: $("jpFalta").checked, mais_vendido: $("jpTop").checked, combina: $("jpCombina").checked
    };
    if (fotoNova) dados.foto_url = await enviarFoto(fotoNova, id);
    else if (fotoRemover) dados.foto_url = null;
    let res;
    if (p) {
      if (p.categoria !== categoria) dados.ordem = Math.max(0, ...produtos.filter(x => x.categoria === categoria).map(x => x.ordem)) + 10;
      res = await banco.from("produtos").update(dados).eq("id", id);
    } else {
      dados.id = id;
      dados.ordem = Math.max(0, ...produtos.filter(x => x.categoria === categoria).map(x => x.ordem), ...(produtos.some(x => x.categoria === categoria) ? [] : produtos.map(x => x.ordem))) + 10;
      res = await banco.from("produtos").insert(dados);
    }
    if (res.error) throw res.error;
    if (p && p.foto_url && (fotoNova || fotoRemover)) apagarFoto(p.foto_url);
    aviso(p ? `"${nome}" salvo!` : `"${nome}" entrou no cardápio!`);
    fecharProduto(); carregarCardapio();
  } catch (x) {
    console.error(x);
    erro("Não deu certo. Confira a internet e tente de novo.");
  } finally {
    $("jpSalvar").disabled = false; $("jpSalvar").textContent = "Salvar";
  }
};

/* ----- Adicionais ----- */
function desenharAdicionais() {
  $("listaAdicionais").innerHTML = adicionais.length ? `<table class="tabela"><thead><tr><th>Adicional</th><th>Preço (R$)</th><th>No site</th><th></th></tr></thead><tbody>` +
    adicionais.map(a => `<tr data-id="${a.id}" class="${a.ativo ? "" : "desligado"}">
      <td><input class="campo" data-campo="nome" value="${esc(a.nome)}"></td>
      <td><input class="campo" data-campo="preco" value="${String(a.preco).replace(".", ",")}" inputmode="decimal" style="max-width:100px"></td>
      <td><label class="check"><input type="checkbox" data-campo="ativo" ${a.ativo ? "checked" : ""}></label></td>
      <td class="num"><button class="mini sal" data-acao="salvar">Salvar</button> <button class="mini del" data-acao="apagar">Apagar</button></td>
    </tr>`).join("") + `</tbody></table>` : `<p class="dica">Nenhum adicional.</p>`;
}
$("listaAdicionais").addEventListener("click", async e => {
  const b = e.target.closest("button[data-acao]"); if (!b) return;
  const tr = b.closest("tr"), id = tr.dataset.id;
  if (b.dataset.acao === "apagar") {
    if (!confirmar("Apagar este adicional?")) return;
    if (!deuErro((await banco.from("adicionais").delete().eq("id", id)).error)) { aviso("Adicional apagado"); carregarCardapio(); }
    return;
  }
  const nome = tr.querySelector('[data-campo="nome"]').value.trim(), preco = num(tr.querySelector('[data-campo="preco"]').value);
  if (!nome || isNaN(preco) || preco < 0) return aviso("Confira o nome e o preço.", true);
  const { error } = await banco.from("adicionais").update({ nome, preco, ativo: tr.querySelector('[data-campo="ativo"]').checked }).eq("id", id);
  if (!deuErro(error)) { aviso("Adicional salvo!"); carregarCardapio(); }
});
$("naSalvar").onclick = async () => {
  const nome = $("naNome").value.trim(), preco = num($("naPreco").value);
  if (!nome || isNaN(preco) || preco < 0) return aviso("Escreva o nome e o preço.", true);
  const ordem = Math.max(0, ...adicionais.map(a => a.ordem)) + 10;
  if (deuErro((await banco.from("adicionais").insert({ nome, preco, ordem })).error)) return;
  $("naNome").value = ""; $("naPreco").value = ""; aviso("Adicional criado!"); carregarCardapio();
};

function preencherSelects() {
  const opts = produtos.map(p => `<option value="${esc(p.id)}">${esc(p.nome)} — ${dinheiro(p.preco)}</option>`).join("");
  $("ofProduto").innerHTML = `<option value="">Escolha o item</option>` + opts;
  $("cbProduto").innerHTML = `<option value="">Escolha o item</option>` + opts;
}

/* =========================================================
   ESTOQUE DE INGREDIENTES
   ========================================================= */
const UNIDADES = ["un", "kg", "g", "L", "ml", "pct", "cx", "lata", "pé", "fatias"];
let ingredientes = [];
$("niUnidade").innerHTML = UNIDADES.map(u => `<option>${u}</option>`).join("");

function numTela(v) { return v === null || v === undefined ? "" : String(Number(v)).replace(".", ","); }
function situacao(i) {
  if (i.avisar_em === null || i.avisar_em === undefined) return Number(i.quantidade) <= 0 ? "zerado" : "ok";
  if (Number(i.quantidade) <= 0) return "acabou";
  if (Number(i.quantidade) <= Number(i.avisar_em)) return "acabando";
  return "ok";
}

async function carregarEstoque() {
  const { data, error } = await banco.from("ingredientes").select("*").order("ordem").order("nome");
  if (error) return;
  ingredientes = data;
  avisoEstoque();
  if (secaoAtual === "estoque") desenharIngr();
}

function avisoEstoque() {
  const acabou = ingredientes.filter(i => situacao(i) === "acabou");
  const acabando = ingredientes.filter(i => situacao(i) === "acabando");
  const n = acabou.length + acabando.length;
  $("nEstoque").textContent = n; $("nEstoque").classList.toggle("escondido", !n);
  $("alertaIngr").innerHTML =
    (acabou.length ? `<div class="alerta" style="margin-top:12px"><strong>🚫 Acabou:</strong> ${acabou.map(i => esc(i.nome)).join(" · ")}</div>` : "") +
    (acabando.length ? `<div class="alerta" style="margin-top:8px;border-color:#ffb35c;background:rgba(255,179,92,.10)"><strong style="color:#ffb35c">⚠️ Acabando:</strong> ` +
      acabando.map(i => `${esc(i.nome)} (restam ${numTela(i.quantidade)} ${esc(i.unidade)})`).join(" · ") + `</div>` : "");
}

function desenharIngr() {
  const f = slug($("buscaIngr").value).replace(/-/g, " ").trim();
  const lista = ingredientes.filter(i => !f || slug(i.nome).replace(/-/g, " ").includes(f));
  $("nIngr").textContent = ingredientes.length;
  $("listaIngr").innerHTML = lista.map(i => {
    const st = situacao(i);
    const txt = { ok: "✓ Tem no estoque", zerado: "Estoque zerado", acabando: "⚠️ Acabando", acabou: "🚫 Acabou" }[st];
    return `<div class="ingr ${st === "acabando" ? "acabando" : st === "acabou" ? "acabou" : ""}" data-id="${i.id}">
      <div><div class="ingr-nome">${esc(i.nome)}</div><div class="ingr-status">${txt}</div></div>
      <div class="qtd-ctrl">
        <button data-acao="menos" aria-label="Tirar 1">−</button>
        <input class="campo" data-campo="quantidade" value="${numTela(i.quantidade)}" inputmode="decimal" aria-label="Quantidade">
        <button data-acao="mais" aria-label="Pôr 1">+</button>
      </div>
      <select class="campo" data-campo="unidade" aria-label="Unidade">${UNIDADES.concat(UNIDADES.includes(i.unidade) ? [] : [i.unidade]).map(u => `<option ${u === i.unidade ? "selected" : ""}>${esc(u)}</option>`).join("")}</select>
      <label class="avisar">Avisar quando ficar em <input class="campo" data-campo="avisar_em" value="${numTela(i.avisar_em)}" placeholder="—" inputmode="decimal"></label>
      <button class="icone-btn" data-acao="apagar" aria-label="Apagar ${esc(i.nome)}">🗑️</button>
    </div>`;
  }).join("") || `<p class="vazio">Nenhum ingrediente encontrado.</p>`;
}
$("buscaIngr").addEventListener("input", desenharIngr);

async function salvarIngr(i, campos, msg) {
  const { error } = await banco.from("ingredientes").update(campos).eq("id", i.id);
  if (deuErro(error)) { desenharIngr(); return; }
  Object.assign(i, campos);
  if (msg) aviso(msg);
  avisoEstoque(); desenharIngr();
}
$("listaIngr").addEventListener("change", e => {
  const campo = e.target.dataset.campo; if (!campo) return;
  const i = ingredientes.find(x => String(x.id) === e.target.closest("[data-id]").dataset.id);
  if (campo === "unidade") return salvarIngr(i, { unidade: e.target.value }, `${i.nome}: unidade salva`);
  const t = e.target.value.trim();
  if (campo === "avisar_em" && !t) return salvarIngr(i, { avisar_em: null }, `${i.nome}: sem aviso`);
  const v = num(t || "0");
  if (isNaN(v) || v < 0) { desenharIngr(); return aviso("Número inválido.", true); }
  salvarIngr(i, { [campo]: v }, campo === "quantidade" ? `${i.nome}: ${numTela(v)} ${i.unidade}` : `${i.nome}: avisa com ${numTela(v)} ${i.unidade}`);
});
$("listaIngr").addEventListener("click", async e => {
  const b = e.target.closest("button[data-acao]"); if (!b) return;
  const i = ingredientes.find(x => String(x.id) === b.closest("[data-id]").dataset.id);
  if (b.dataset.acao === "apagar") {
    if (!confirmar(`Apagar "${i.nome}" do estoque?`)) return;
    if (!deuErro((await banco.from("ingredientes").delete().eq("id", i.id)).error)) { aviso("Ingrediente apagado"); carregarEstoque(); }
    return;
  }
  const nova = Math.max(0, Math.round((Number(i.quantidade) + (b.dataset.acao === "mais" ? 1 : -1)) * 1000) / 1000);
  salvarIngr(i, { quantidade: nova });
});
$("niSalvar").onclick = async () => {
  const nome = $("niNome").value.trim();
  if (!nome) return aviso("Escreva o nome do ingrediente.", true);
  if (ingredientes.some(i => i.nome.toLowerCase() === nome.toLowerCase())) return aviso("Esse ingrediente já está na lista.", true);
  const ordem = Math.max(0, ...ingredientes.map(i => i.ordem || 0)) + 10;
  if (deuErro((await banco.from("ingredientes").insert({ nome, unidade: $("niUnidade").value, quantidade: 0, ordem })).error)) return;
  $("niNome").value = ""; aviso(`${nome} entrou no estoque!`); carregarEstoque();
};

/* =========================================================
   PROMOÇÕES (Pix, cupons, ofertas)
   ========================================================= */
async function carregarPromocoes() {
  if (!produtos.length) await carregarCardapio();
  $("descPix").value = String(cfg.desconto_pix ?? 0).replace(".", ",");
  carregarCupons(); desenharOfertas();
}
$("salvarPix").onclick = () => {
  const v = num($("descPix").value || "0");
  if (isNaN(v) || v < 0 || v > 50) return aviso("Use um número de 0 a 50.", true);
  salvarConfig({ desconto_pix: v }, v > 0 ? `Desconto no Pix: ${v}%` : "Desconto no Pix desligado");
};

async function carregarCupons() {
  const { data, error } = await banco.from("cupons").select("*").order("criado_em", { ascending: false });
  if (deuErro(error)) return;
  $("listaCupons").innerHTML = data.map(c => `<div class="linha-lista ${c.ativo ? "" : "desligado"}" data-codigo="${esc(c.codigo)}">
      <span><strong style="font-size:17px">${esc(c.codigo)}</strong> · ${String(c.percentual).replace(".", ",")}% OFF</span>
      <span class="acoes-mini">
        <label class="chave"><input type="checkbox" data-acao="ativo" ${c.ativo ? "checked" : ""}><span>${c.ativo ? "Ativo" : "Desativado"}</span></label>
        <button class="mini del" data-acao="apagar">Apagar</button>
      </span></div>`).join("") || `<p class="dica" style="margin-top:10px">Nenhum cupom criado.</p>`;
}
$("ncSalvar").onclick = async () => {
  const codigo = $("ncCodigo").value.trim().toUpperCase().replace(/\s/g, ""), pct = num($("ncPct").value);
  $("ncErro").textContent = "";
  if (!/^[A-Z0-9_-]{3,30}$/.test(codigo)) return $("ncErro").textContent = "Código: de 3 a 30 letras ou números, sem espaço.";
  if (isNaN(pct) || pct <= 0 || pct > 100) return $("ncErro").textContent = "Desconto: de 1 a 100%.";
  const { error } = await banco.from("cupons").insert({ codigo, percentual: pct });
  if (error && /duplicate|unique/i.test(error.message)) return $("ncErro").textContent = "Já existe um cupom com esse código.";
  if (deuErro(error)) return;
  $("ncCodigo").value = ""; $("ncPct").value = ""; aviso(`Cupom ${codigo} criado!`); carregarCupons();
};
$("listaCupons").addEventListener("change", async e => {
  if (e.target.dataset.acao !== "ativo") return;
  const codigo = e.target.closest("[data-codigo]").dataset.codigo;
  if (!deuErro((await banco.from("cupons").update({ ativo: e.target.checked }).eq("codigo", codigo)).error)) { aviso(e.target.checked ? "Cupom ativado" : "Cupom desativado"); carregarCupons(); }
});
$("listaCupons").addEventListener("click", async e => {
  const b = e.target.closest('button[data-acao="apagar"]'); if (!b) return;
  const codigo = b.closest("[data-codigo]").dataset.codigo;
  if (!confirmar(`Apagar o cupom ${codigo}?`)) return;
  if (!deuErro((await banco.from("cupons").delete().eq("codigo", codigo)).error)) { aviso("Cupom apagado"); carregarCupons(); }
});

function desenharOfertas() {
  const of = produtos.filter(p => p.preco_oferta !== null);
  $("listaOfertas").innerHTML = of.map(p => `<div class="linha-lista" data-id="${esc(p.id)}">
      <span><strong>${esc(p.nome)}</strong> · <span class="preco-antigo">${dinheiro(p.preco)}</span> <strong style="color:var(--amarelo)">${dinheiro(p.preco_oferta)}</strong></span>
      <button class="mini del" data-acao="tirar">Tirar oferta</button></div>`).join("") || `<p class="dica" style="margin-top:10px">Nenhum item em oferta.</p>`;
}
$("ofSalvar").onclick = async () => {
  const id = $("ofProduto").value, preco = num($("ofPreco").value), p = produtos.find(x => x.id === id);
  $("ofErro").textContent = "";
  if (!p) return $("ofErro").textContent = "Escolha o item.";
  if (isNaN(preco) || preco < 0 || preco >= Number(p.preco)) return $("ofErro").textContent = `O preço de oferta precisa ser menor que ${dinheiro(p.preco)}.`;
  if (deuErro((await banco.from("produtos").update({ preco_oferta: preco }).eq("id", id)).error)) return;
  $("ofPreco").value = ""; aviso(`${p.nome} em oferta!`); await carregarCardapio(); desenharOfertas();
};
$("listaOfertas").addEventListener("click", async e => {
  const b = e.target.closest('button[data-acao="tirar"]'); if (!b) return;
  const id = b.closest("[data-id]").dataset.id;
  if (deuErro((await banco.from("produtos").update({ preco_oferta: null }).eq("id", id)).error)) return;
  aviso("Oferta retirada"); await carregarCardapio(); desenharOfertas();
});

/* =========================================================
   COMBOS
   ========================================================= */
async function carregarCombos() {
  if (!produtos.length) await carregarCardapio();
  const { data, error } = await banco.from("combos").select("*").order("criado_em");
  if (deuErro(error)) return;
  combos = data;
  const nomeDe = id => (produtos.find(p => p.id === id) || { nome: "(item apagado)" }).nome;
  $("listaCombos").innerHTML = combos.map(c => `<div class="bloco ${c.ativo ? "" : "desligado"}" data-id="${esc(c.id)}">
      <div class="linha-lista" style="border:0;padding:0">
        <span><strong style="font-size:18px;color:var(--amarelo)">Combo ${esc(c.nome)}</strong> · <strong>${dinheiro(c.preco)}</strong></span>
        <span class="acoes-mini">
          <label class="chave"><input type="checkbox" data-acao="ativo" ${c.ativo ? "checked" : ""}><span>${c.ativo ? "No site" : "Fora do site"}</span></label>
          <button class="mini sal" data-acao="editar">Editar</button>
          <button class="mini del" data-acao="apagar">Apagar</button>
        </span>
      </div>
      <div class="dica">${c.itens.map(i => `${i.qtd}x ${esc(nomeDe(i.produto_id))}`).join(" + ")}${c.descricao ? " — " + esc(c.descricao) : ""}</div>
    </div>`).join("") || `<p class="vazio">Nenhum combo criado ainda.</p>`;
  desenharItensCombo();
}
function desenharItensCombo() {
  const precoDe = id => { const p = produtos.find(x => x.id === id); return p ? Number(p.preco) : 0; };
  $("cbItens").innerHTML = itensCombo.map((i, n) => `<div class="cb-item"><span>${i.qtd}x ${esc((produtos.find(p => p.id === i.produto_id) || {}).nome || "?")}</span>
    <button class="mini del" data-n="${n}">Tirar</button></div>`).join("") || `<p class="dica">Nenhum item ainda.</p>`;
  const soma = itensCombo.reduce((s, i) => s + precoDe(i.produto_id) * i.qtd, 0);
  $("cbSomaItens").textContent = itensCombo.length ? `Separados, esses itens custam ${dinheiro(soma)}.` : "";
}
$("cbItens").addEventListener("click", e => {
  const b = e.target.closest("button[data-n]"); if (!b) return;
  itensCombo.splice(b.dataset.n, 1); desenharItensCombo();
});
$("cbAddItem").onclick = () => {
  const id = $("cbProduto").value, qtd = inteiroOuNulo($("cbQtd").value) || 1;
  if (!id) return aviso("Escolha o item.", true);
  const ja = itensCombo.find(i => i.produto_id === id);
  if (ja) ja.qtd += qtd; else itensCombo.push({ produto_id: id, qtd });
  $("cbQtd").value = 1; desenharItensCombo();
};
function limparCombo() {
  editandoCombo = null; itensCombo = [];
  ["cbNome", "cbPreco", "cbDesc"].forEach(k => $(k).value = "");
  $("cbTitulo").textContent = "Novo combo"; $("cbCancelar").classList.add("escondido"); $("cbErro").textContent = "";
  desenharItensCombo();
}
$("cbCancelar").onclick = limparCombo;
$("cbSalvar").onclick = async () => {
  const nome = $("cbNome").value.trim(), preco = num($("cbPreco").value);
  $("cbErro").textContent = "";
  if (!nome) return $("cbErro").textContent = "Dê um nome ao combo.";
  if (isNaN(preco) || preco < 0) return $("cbErro").textContent = "Preço inválido.";
  if (!itensCombo.length) return $("cbErro").textContent = "Coloque pelo menos um item no combo.";
  const dados = { nome, preco, descricao: $("cbDesc").value.trim(), itens: itensCombo };
  const { error } = editandoCombo
    ? await banco.from("combos").update(dados).eq("id", editandoCombo)
    : await banco.from("combos").insert(Object.assign({ id: (slug(nome) || "combo") + "-" + Date.now().toString(36) }, dados));
  if (deuErro(error)) return;
  aviso(editandoCombo ? "Combo atualizado!" : `Combo ${nome} criado! Já aparece no site.`);
  limparCombo(); carregarCombos();
};
$("listaCombos").addEventListener("click", async e => {
  const b = e.target.closest("button[data-acao]"); if (!b) return;
  const id = b.closest("[data-id]").dataset.id, c = combos.find(x => x.id === id);
  if (b.dataset.acao === "editar") {
    editandoCombo = id; itensCombo = c.itens.map(i => ({ ...i }));
    $("cbNome").value = c.nome; $("cbPreco").value = String(c.preco).replace(".", ","); $("cbDesc").value = c.descricao || "";
    $("cbTitulo").textContent = "Editando combo " + c.nome; $("cbCancelar").classList.remove("escondido");
    desenharItensCombo(); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (b.dataset.acao === "apagar") {
    if (!confirmar(`Apagar o combo ${c.nome}?`)) return;
    if (!deuErro((await banco.from("combos").delete().eq("id", id)).error)) { aviso("Combo apagado"); carregarCombos(); }
  }
});
$("listaCombos").addEventListener("change", async e => {
  if (e.target.dataset.acao !== "ativo") return;
  const id = e.target.closest("[data-id]").dataset.id;
  if (!deuErro((await banco.from("combos").update({ ativo: e.target.checked }).eq("id", id)).error)) { aviso(e.target.checked ? "Combo no site" : "Combo fora do site"); carregarCombos(); }
});

iniciar();
