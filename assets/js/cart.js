/* Mota Lanches — sacola (fica guardada no celular do cliente)
   e página carrinho.html (finalizar o pedido).
   Usado em: index.html, produto.html e carrinho.html */
const $ = id => document.getElementById(id);
let D = null;                       // dados do cardápio (do banco ou do cardapio.js)
let todosItens = {}, adicionaisPorId = {};
let sacola = ler("mota_sacola", []);

const chaveItem = (tipo, id) => tipo + ":" + id;
const itemDaLinha = l => todosItens[chaveItem(l.tipo, l.id)];
function precoUnit(l) { return itemDaLinha(l).preco + l.add.reduce((s, a) => s + a.preco * a.qtd, 0); }
function textoAdd(add) { return add.map(a => (a.qtd > 1 ? a.qtd + "x " : "") + a.nome).join(", "); }
function lojaAbertaAgora() { return !!D && D.cfg.aberta && dentroDoHorario(D.cfg.horarios); }

/* ---------- Carregar dados (todas as páginas) ---------- */
async function prepararDados() {
  D = await carregarDados();
  todosItens = {};
  D.categorias.forEach(c => c.itens.forEach(i => todosItens[chaveItem(i.tipo, i.id)] = i));
  adicionaisPorId = {};
  D.adicionais.forEach(a => adicionaisPorId[a.id] = a);
  lerSacola();
  return D;
}
// lê a sacola guardada e acerta com os preços de agora
function lerSacola() {
  sacola = ler("mota_sacola", []);
  if (!D) return;
  sacola = sacola.filter(l => itemDaLinha({ tipo: l.tipo || "produto", id: l.id })).map(l => ({
    tipo: l.tipo || "produto", id: l.id, qtd: l.qtd, obs: l.obs || "", sem: l.sem || [],
    add: (l.add || []).filter(a => adicionaisPorId[a.id]).map(a => ({ id: a.id, nome: adicionaisPorId[a.id].nome, qtd: a.qtd, preco: adicionaisPorId[a.id].preco }))
  }));
  guardar("mota_sacola", sacola);
}
function salvarSacola() {
  guardar("mota_sacola", sacola);
  if (typeof aoMudarSacola === "function") aoMudarSacola();
}
// junta itens iguais (mesmo lanche, mesmas escolhas) numa linha só
function juntarNaSacola(nova) {
  const chave = l => JSON.stringify([l.tipo, l.id, l.obs, l.sem.slice().sort(), l.add.map(a => a.id + "x" + a.qtd).sort()]);
  const igual = sacola.find(l => chave(l) === chave(nova));
  if (igual) igual.qtd += nova.qtd; else sacola.push(nova);
}
const qtdNaSacola = () => sacola.reduce((s, l) => s + l.qtd, 0);
const subtotalSacola = () => sacola.reduce((s, l) => s + precoUnit(l) * l.qtd, 0);

// confere de minuto em minuto se a loja abriu/fechou
let estavaAberta = null;
async function vigiarLoja(aoMudar) {
  estavaAberta = lojaAbertaAgora();
  setInterval(async () => {
    if (!D) return;
    if (banco) {
      const { data } = await banco.from("config").select("aberta,horarios,entrega_gratis_ate").eq("id", 1).maybeSingle();
      if (data) { D.cfg.aberta = data.aberta; D.cfg.horarios = data.horarios; D.cfg.entrega_gratis_ate = data.entrega_gratis_ate; }
    }
    const agora = lojaAbertaAgora();
    if (agora !== estavaAberta) { estavaAberta = agora; aoMudar(); }
  }, 60000);
}

// rodapé com os dados da loja
function montarRodape() {
  const el = $("rodape"); if (!el || !D) return;
  const cfg = D.cfg;
  const txtHorario = cfg.horario || textoHorario(cfg.horarios);
  const insta = String(cfg.instagram || "").replace(/^@/, "");
  el.innerHTML = `
    <img class="rodape-mascote" src="assets/img/icone.webp" alt="Mascote da Mota Lanches">
    <p class="rodape-marca"><span>MOTA LANCHES</span> · <em>${esc(cfg.frase || C.SLOGAN)}</em></p>
    ${txtHorario ? `<p>${esc(txtHorario)}</p>` : ""}
    <p>Atendimento pelo WhatsApp <a href="${linkWhats("Olá, Mota Lanches!", cfg.whatsapp)}" target="_blank">${esc(telVisivel(cfg.whatsapp))}</a>${cfg.whatsapp2 ? ` · <a href="${linkWhats("Olá, Mota Lanches!", cfg.whatsapp2)}" target="_blank">${esc(telVisivel(cfg.whatsapp2))}</a>` : ""}</p>
    ${insta ? `<p>Instagram <a href="https://instagram.com/${encodeURIComponent(insta)}" target="_blank">@${esc(insta)}</a></p>` : ""}
    ${cfg.endereco ? `<p>${esc(cfg.endereco)}</p>` : ""}
    <p><a class="rodape-politica" href="politica.html">Política de privacidade</a></p>`;
}

// quando o cliente volta para a página pelo botão "voltar" do celular, relê a sacola
window.addEventListener("pageshow", e => {
  if (e.persisted && D) { lerSacola(); if (typeof aoMudarSacola === "function") aoMudarSacola(); }
});

/* =====================================================================
   Página carrinho.html — sacola e finalização do pedido
   ===================================================================== */
if ($("paginaCarrinho")) {
  let tipo = "entrega", pagamento = "", tipoCartao = "", cupomAtual = null; // cupom: {codigo, pct}

  const contas = () => {
    const sub = subtotalSacola();
    const descCupom = cupomAtual ? Math.round(sub * cupomAtual.pct) / 100 : 0;
    const descPix = pagamento === "Pix" && D.cfg.desconto_pix > 0 ? Math.round((sub - descCupom) * D.cfg.desconto_pix) / 100 : 0;
    const taxa = tipo === "entrega" && !entregaGratisAgora(D.cfg) ? (D.cfg.taxa_unica || 0) : 0;   // uma taxa só para a cidade toda
    return { sub, descCupom, descPix, taxa, total: sub - descCupom - descPix + taxa };
  };

  window.aoMudarSacola = desenharSacola;

  function mostrarLoja() {
    const aberta = lojaAbertaAgora();
    const txt = D.cfg.horario || textoHorario(D.cfg.horarios);
    $("avisoFechada").classList.toggle("escondido", aberta);
    $("avisoFechada").textContent = "Estamos fechados agora" + (txt ? " — nosso horário: " + txt + "." : ". Os pedidos voltam quando abrirmos.");
    $("fazerPedido").disabled = !aberta;
  }

  function desenharSacola() {
    if (!sacola.length) {
      $("itensSacola").innerHTML = `<div class="vazio"><p style="font-size:40px">🛍️</p><p>Sua sacola está vazia.</p>
        <a class="btn-principal" style="display:block;text-decoration:none;text-align:center" href="index.html">Ver o cardápio</a></div>`;
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
          <div class="mini-contador"><button data-n="${n}" data-acao="-" aria-label="Diminuir">−</button><strong>${l.qtd}</strong><button data-n="${n}" data-acao="+" aria-label="Aumentar">+</button></div>
        </div>
        <div class="valor">${dinheiro(precoUnit(l) * l.qtd)}</div>
      </div>`;
    }).join("") + `<a class="btn-sec" href="index.html" style="display:inline-block;margin-top:12px;text-decoration:none">+ Adicionar mais itens</a>`;
    atualizarResumo();
  }
  $("itensSacola").addEventListener("click", e => {
    const b = e.target.closest("button[data-n]"); if (!b) return;
    const l = sacola[b.dataset.n];
    l.qtd += b.dataset.acao === "+" ? 1 : -1;
    if (l.qtd <= 0) sacola.splice(b.dataset.n, 1);
    salvarSacola();
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
    const gratis = entregaGratisAgora(D.cfg);
    $("rTaxa").textContent = gratis ? "Grátis 🎉" : c.taxa > 0 ? dinheiro(c.taxa) : "a combinar";
    $("avisoTaxa").innerHTML = gratis ? `🎉 <strong>Entrega GRÁTIS</strong> até ${horaGratis(D.cfg)}!`
      : D.cfg.taxa_unica > 0 ? `🛵 Taxa de entrega: <strong>${dinheiro(D.cfg.taxa_unica)}</strong>` : "🛵 Taxa de entrega: <strong>a combinar</strong>";
    $("rTotal").textContent = dinheiro(c.total);
    $("camposEntrega").classList.toggle("escondido", tipo !== "entrega");
    $("campoTroco").classList.toggle("escondido", pagamento !== "Dinheiro");
    $("campoCartao").classList.toggle("escondido", pagamento !== "Cartão");
    $("avisoMaquininha").classList.toggle("escondido", tipo !== "entrega");
    const pix = $("campoPix"), chave = D.cfg.chave_pix;
    pix.classList.toggle("escondido", pagamento !== "Pix" || !chave);
    pix.innerHTML = chave ? `<div class="pix pix-chave"><span>Chave Pix: <strong>${esc(chave)}</strong></span>
      <button class="btn-sec" id="copiarChave" type="button">📋 Copiar</button></div>` : "";
    const ret = $("enderecoRetirada");
    ret.classList.toggle("escondido", tipo !== "retirada" || !D.cfg.endereco);
    ret.innerHTML = D.cfg.endereco ? `<div class="pix">📍 Retire em: <strong>${esc(D.cfg.endereco)}</strong></div>` : "";
  }

  // copia a chave Pix (telefone, CPF e CNPJ vão só com os números)
  $("campoPix").addEventListener("click", async e => {
    const b = e.target.closest("#copiarChave"); if (!b) return;
    let k = String(D.cfg.chave_pix).trim();
    if (["telefone", "cpf", "cnpj"].includes(D.cfg.pix_tipo)) k = k.replace(/\D/g, "");
    const ok = await copiarTexto(k);
    b.textContent = ok ? "✅ Copiada!" : "Copie a chave acima";
    setTimeout(() => b.textContent = "📋 Copiar", 2500);
  });

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
    if (p.tipo === "entrega") t += `Entrega: ${entregaGratisAgora(D.cfg) ? "GRÁTIS" : c.taxa > 0 ? dinheiro(c.taxa) : "a combinar"}\n`;
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
    BAIRRO_INVALIDO: "Confira o bairro, por favor.",
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
      $("itensSacola").innerHTML = `<div class="vazio">
          <p style="font-size:40px">✅</p>
          <p><strong>Falta só um toque!</strong><br>Envie o pedido para a Mota Lanches pelo WhatsApp:</p>
          <a class="btn-whats" id="enviarWhats" target="_blank" href="${linkWhats(mensagem, D.cfg.whatsapp)}">Enviar pedido no WhatsApp</a>
        </div>${pagamento === "Pix" ? caixaPix(D.cfg, c.total, "MOTA") : ""}`;
      $("enviarWhats").onclick = () => { sacola = []; guardar("mota_sacola", sacola); };
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

    // guarda a mensagem do pedido neste celular, para o botão "Enviar também no WhatsApp"
    guardar("mota_msg_" + pedido_id, montarMensagem(Object.assign({}, pedido, extra), Object.assign({}, c, { total: Number(pedido_total) }), pedido_numero));
    const meus = ler("mota_meus_pedidos", []);
    meus.unshift({ id: pedido_id, numero: pedido_numero, data: new Date().toISOString(), total: pedido_total });
    guardar("mota_meus_pedidos", meus.slice(0, 20));
    sacola = []; guardar("mota_sacola", sacola);
    location.href = "pedido.html?id=" + pedido_id;
  };

  (async () => {
    try { await prepararDados(); }
    catch (e) { $("itensSacola").innerHTML = `<p class="vazio">Não conseguimos carregar. Confira a internet e recarregue a página.</p>`; return; }
    const d = ler("mota_cliente", {});
    ["nome", "telefone", "rua", "numero", "bairro", "referencia"].forEach(k => { if (d[k] && !$(k).value) $(k).value = d[k]; });
    $("blocoCupom").classList.toggle("escondido", !D.online);
    montarRodape();
    desenharSacola();
    mostrarLoja();
    vigiarLoja(mostrarLoja);
    setInterval(atualizarResumo, 60000);   // a entrega grátis pode acabar
  })();
}
