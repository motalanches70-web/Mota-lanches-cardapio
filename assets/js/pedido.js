/* Página "Meu pedido": mostra em que etapa o pedido está */
const caixa = document.getElementById("conteudo");
const id = new URLSearchParams(location.search).get("id");
let ultimoHtml = "";

function listaMeusPedidos() {
  const meus = ler("mota_meus_pedidos", []);
  if (!meus.length) {
    caixa.innerHTML = `<div class="cartao"><p class="vazio">Você ainda não fez pedidos por este celular.</p>
      <a class="btn-whats" href="index.html" style="background:var(--amarelo);color:var(--preto)">Ver cardápio</a></div>`;
    return;
  }
  caixa.innerHTML = `<h2 style="margin-top:18px">Meus pedidos</h2>` + meus.map(p => `
    <a class="cartao" style="display:flex;justify-content:space-between;text-decoration:none" href="pedido.html?id=${encodeURIComponent(p.id)}">
      <span><strong>Pedido #${esc(p.numero)}</strong><br><span class="dica">${new Date(p.data).toLocaleString("pt-BR")}</span></span>
      <span style="font-weight:800;color:var(--amarelo)">${dinheiro(p.total)}</span>
    </a>`).join("");
}

async function mostrarPedido() {
  if (!banco) { caixa.innerHTML = `<p class="vazio">Acompanhamento ainda não configurado.</p>`; return; }
  const { data, error } = await banco.rpc("ver_pedido", { p_id: id });
  if (error || !data || !data.length) {
    caixa.innerHTML = `<div class="cartao"><p class="vazio">Pedido não encontrado.</p></div>`;
    return;
  }
  const p = data[0];
  const etapas = ["novo", "andamento", "finalizado"];
  const nomes = { novo: "Pedido recebido", andamento: "Em preparo", finalizado: p.tipo === "entrega" ? "Pronto! Saiu para entrega" : "Pronto para retirar" };
  const pos = p.status === "finalizado" ? etapas.length : etapas.indexOf(p.status);
  const msg = `Olá! Sobre o meu pedido #${p.numero} na Mota Lanches...`;
  const cfgRes = await banco.from("config").select("*").eq("id", 1).maybeSingle();
  const cfgLoja = cfgRes.data || {};
  const whats = cfgLoja.whatsapp || C.WHATSAPP;
  const msgPedido = ler("mota_msg_" + id, "");

  const html = `
    <div class="cartao">
      <div class="dica">Seu pedido</div>
      <div class="num-pedido">#${esc(p.numero)}</div>
      <div class="dica">${new Date(p.criado_em).toLocaleString("pt-BR")} · ${p.tipo === "entrega" ? "Entrega" : "Retirada na loja"} · <strong>${dinheiro(p.total)}</strong></div>
      ${p.status === "cancelado"
        ? `<p class="cancelado">❌ Este pedido foi cancelado. Se tiver dúvida, fale com a loja.</p>`
        : `<ul class="etapas">${etapas.map((e, n) => `
            <li class="${n <= pos ? "feita" : ""} ${n === pos ? "atual" : ""}">
              <span class="bola">${n < pos ? "✓" : n + 1}</span>${nomes[e]}
            </li>`).join("")}</ul>`}
      ${p.status === "cancelado" ? "" : p.pagamento === "Pix"
        ? (p.pago ? `<p class="pago-ok">✅ Pix concluído</p>` : `<p class="pago-espera">⏳ Aguardando Pix</p>` +
            (cfgLoja.chave_pix ? `<div class="pix pix-chave" style="margin-top:10px"><span>Chave Pix: <strong>${esc(cfgLoja.chave_pix)}</strong></span>
              <button class="btn-sec" type="button" data-copiar-chave="${esc(["telefone", "cpf", "cnpj"].includes(cfgLoja.pix_tipo) ? String(cfgLoja.chave_pix).replace(/\D/g, "") : String(cfgLoja.chave_pix).trim())}">📋 Copiar</button></div>` : ""))
        : (p.pago ? `<p class="pago-ok">✅ Pagamento confirmado pela loja</p>` : "")}
      <p class="dica" style="margin-top:8px">Esta página se atualiza sozinha.</p>
    </div>
    ${msgPedido && p.status !== "cancelado" ? `<a class="btn-whats" target="_blank" href="${linkWhats(msgPedido, whats)}">📲 Enviar pedido também no WhatsApp da loja</a>` : ""}
    <a class="btn-whats" target="_blank" href="${linkWhats(msg, whats)}">💬 Falar com a loja no WhatsApp</a>`;
  if (html !== ultimoHtml) { caixa.innerHTML = html; ultimoHtml = html; }
}

// copiar a chave Pix
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-copiar-chave]"); if (!b) return;
  const ok = await copiarTexto(b.dataset.copiarChave);
  b.textContent = ok ? "✅ Copiada!" : "Copie a chave ao lado";
  setTimeout(() => b.textContent = "📋 Copiar", 2500);
});

if (id) { mostrarPedido(); setInterval(mostrarPedido, 15000); }
else listaMeusPedidos();
