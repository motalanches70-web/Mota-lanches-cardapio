/* Funções usadas em todas as páginas */
const C = window.MOTA;

function dinheiro(v) {
  return "R$ " + Number(v || 0).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function esc(t) {
  return String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function slug(t) { return String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

// Conexão com o Supabase (só se a configuração estiver preenchida)
let banco = null;
if (C.SUPABASE_URL && C.SUPABASE_CHAVE_PUBLICA && window.supabase) {
  banco = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_CHAVE_PUBLICA);
}

function linkWhats(texto, numero) {
  const n = String(numero || C.WHATSAPP).replace(/\D/g, "");
  return "https://wa.me/" + n + (texto ? "?text=" + encodeURIComponent(texto) : "");
}

function guardar(chave, valor) { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) {} }
function ler(chave, padrao) { try { const v = localStorage.getItem(chave); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } }

const ICONES = {
  "Combos": "🔥", "Mais vendidos": "🏆", "Lanches de Hambúrguer": "🍔", "Lanche Caseiro": "👑", "Lanches de Carne": "🥩",
  "Lanches de Frango": "🍗", "Lanches Especiais": "⭐", "Omeletes": "🍳", "Macarrão na Chapa": "🍝",
  "Porções de Batata (500g)": "🍟", "Bebidas": "🥤"
};
function iconeCategoria(nome) { return ICONES[nome] || "🍽️"; }

/* Carrega o cardápio: do Supabase (se ligado) ou do arquivo cardapio.js */
async function carregarDados() {
  if (!banco) {
    return {
      online: false,
      cfg: { nome: C.NOME, whatsapp: C.WHATSAPP, whatsapp2: "", chave_pix: C.CHAVE_PIX, pix_tipo: C.PIX_TIPO || "telefone", pix_nome: C.PIX_NOME || "", pix_cidade: C.PIX_CIDADE || "",
             frase: C.SLOGAN, endereco: "", horario: "", horarios: null, instagram: "", desconto_pix: 0, aberta: true, taxa_modo: "unica", taxa_unica: Number(C.TAXA_ENTREGA || 0) },
      categorias: CARDAPIO.map(cat => ({
        nome: cat.categoria,
        itens: cat.itens.filter(i => i.ativo !== false).map(i => ({
          tipo: "produto", id: i.id, nome: i.nome, desc: i.desc, preco: i.preco, precoAntigo: null,
          esgotado: false, foto: null, maisVendido: false, opcoes: !(window.SEM_OPCOES || []).includes(cat.categoria),
          combina: (window.SEM_OPCOES || []).includes(cat.categoria)
        }))
      })),
      adicionais: (window.ADICIONAIS || []).map((a, n) => ({ id: n + 1, nome: a.nome, preco: a.preco })),
      bairros: []
    };
  }
  const [cfg, cats, prods, adds, combos, bairros] = await Promise.all([
    banco.from("config").select("*").eq("id", 1).maybeSingle(),
    banco.from("categorias").select("*").order("ordem").order("nome"),
    banco.from("produtos").select("*").eq("ativo", true).order("ordem").order("nome"),
    banco.from("adicionais").select("*").eq("ativo", true).order("ordem").order("nome"),
    banco.from("combos").select("*").eq("ativo", true).order("criado_em"),
    banco.from("bairros").select("*").order("nome")
  ]);
  if (prods.error) throw prods.error;
  const nomes = {};
  (prods.data || []).forEach(p => nomes[p.id] = p);
  const categorias = [];
  const combosAtivos = (combos.data || []);
  let catCombos = null;
  if (combosAtivos.length) {
    catCombos = ({
      nome: "Combos",
      itens: combosAtivos.map(c => ({
        tipo: "combo", id: c.id, nome: "Combo " + c.nome,
        desc: c.descricao || c.itens.map(x => x.qtd + "x " + (nomes[x.produto_id] ? nomes[x.produto_id].nome : "item")).join(" + "),
        preco: Number(c.preco), precoAntigo: null, opcoes: false, foto: null, maisVendido: false,
        esgotado: c.itens.some(x => !nomes[x.produto_id] || nomes[x.produto_id].em_falta || (nomes[x.produto_id].estoque !== null && nomes[x.produto_id].estoque < x.qtd))
      }))
    });
  }
  const itensProd = (prods.data || []).map(p => {
    const oferta = p.preco_oferta !== null && Number(p.preco_oferta) < Number(p.preco);
    return {
      tipo: "produto", id: p.id, nome: p.nome, desc: p.descricao, categoria: p.categoria,
      preco: Number(oferta ? p.preco_oferta : p.preco), precoAntigo: oferta ? Number(p.preco) : null,
      opcoes: p.tem_opcoes, foto: p.foto_url || null, maisVendido: !!p.mais_vendido, combina: !!p.combina,
      esgotado: p.em_falta || (p.estoque !== null && p.estoque <= 0)
    };
  });
  const top = itensProd.filter(i => i.maisVendido && !i.esgotado);
  if (top.length) categorias.push({ nome: "Mais vendidos", itens: top });
  const ordemCats = (cats.data || []).map(c => c.nome);
  itensProd.forEach(i => { if (!ordemCats.includes(i.categoria)) ordemCats.push(i.categoria); });
  ordemCats.forEach(nome => {
    const itens = itensProd.filter(i => i.categoria === nome);
    if (itens.length) categorias.push({ nome, itens });
  });
  if (catCombos) categorias.push(catCombos);  // combos ficam por último
  const c = cfg.data || {};
  return {
    online: true,
    cfg: {
      nome: c.nome || C.NOME, whatsapp: c.whatsapp || C.WHATSAPP, whatsapp2: c.whatsapp2 || "",
      chave_pix: c.chave_pix || "", pix_tipo: c.pix_tipo || "telefone", pix_nome: c.pix_nome || "", pix_cidade: c.pix_cidade || "",
      frase: c.frase || C.SLOGAN, endereco: c.endereco || "", horario: c.horario || "", horarios: c.horarios || null, instagram: c.instagram || "",
      desconto_pix: Number(c.desconto_pix || 0), aberta: c.aberta !== false,
      taxa_modo: c.taxa_modo || "unica", taxa_unica: Number(c.taxa_unica || 0)
    },
    categorias,
    adicionais: (adds.data || []).map(a => ({ id: a.id, nome: a.nome, preco: Number(a.preco) })),
    bairros: (bairros.data || []).map(b => ({ id: b.id, nome: b.nome, taxa: Number(b.taxa) }))
  };
}

const NOMES_STATUS = {
  novo: "Pedido recebido",
  andamento: "Em preparo",
  finalizado: "Pronto",
  cancelado: "Cancelado"
};

/* ---------- Horário de funcionamento (hora de Brasília) ---------- */
const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
const DIAS_NOMES = { dom: "Dom", seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb" };
function agoraBrasilia() {
  const p = {};
  new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(new Date()).forEach(x => p[x.type] = x.value);
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { dia, min: (Number(p.hour) % 24) * 60 + Number(p.minute) };
}
const paraMin = t => { const [h, m] = String(t || "0:0").split(":").map(Number); return h * 60 + (m || 0); };
function temHorario(h) { return !!h && DIAS_CURTOS.some(k => h[k] && h[k].aberto); }
function dentroDoHorario(h) {
  if (!temHorario(h)) return true;
  const { dia, min } = agoraBrasilia();
  const hoje = h[DIAS_CURTOS[dia]], ontem = h[DIAS_CURTOS[(dia + 6) % 7]];
  if (hoje && hoje.aberto) {
    const a = paraMin(hoje.abre), f = paraMin(hoje.fecha);
    if (a < f ? (min >= a && min < f) : min >= a) return true;
  }
  if (ontem && ontem.aberto && paraMin(ontem.abre) >= paraMin(ontem.fecha) && min < paraMin(ontem.fecha)) return true;
  return false;
}
function horaCurta(t) { const [h, m] = String(t).split(":"); return Number(h) + "h" + (m && m !== "00" ? m : ""); }
function textoHorario(h) {
  if (!temHorario(h)) return "";
  const ordem = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
  const grupos = [];
  ordem.forEach(k => {
    const d = h[k]; if (!d || !d.aberto) return;
    const faixa = horaCurta(d.abre) + "–" + horaCurta(d.fecha);
    const ult = grupos[grupos.length - 1];
    if (ult && ult.faixa === faixa && ordem.indexOf(ult.fim) === ordem.indexOf(k) - 1) ult.fim = k;
    else grupos.push({ ini: k, fim: k, faixa });
  });
  return grupos.map(g => (g.ini === g.fim ? DIAS_NOMES[g.ini] : DIAS_NOMES[g.ini] + " a " + DIAS_NOMES[g.fim].toLowerCase()) + " " + g.faixa).join(" · ");
}
function telVisivel(n) {
  const d = String(n || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

/* ---------- Pix copia e cola (padrão do Banco Central) ---------- */
function crc16(s) {
  let c = 0xFFFF;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF;
  }
  return c.toString(16).toUpperCase().padStart(4, "0");
}
function pixCopiaCola(cfg, valor, txid) {
  if (!cfg.chave_pix) return "";
  const f = (id, v) => id + String(v.length).padStart(2, "0") + v;
  const limpa = (t, n) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toUpperCase().slice(0, n).trim();
  let k = String(cfg.chave_pix).trim();
  if (cfg.pix_tipo === "telefone") { k = k.replace(/\D/g, ""); if (!k.startsWith("55")) k = "55" + k; k = "+" + k; }
  else if (cfg.pix_tipo === "cpf" || cfg.pix_tipo === "cnpj") k = k.replace(/\D/g, "");
  else if (cfg.pix_tipo === "email") k = k.toLowerCase();
  const conta = f("00", "br.gov.bcb.pix") + f("01", k);
  const id = String(txid || "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const p = f("00", "01") + f("26", conta) + f("52", "0000") + f("53", "986") +
    (valor > 0 ? f("54", Number(valor).toFixed(2)) : "") + f("58", "BR") +
    f("59", limpa(cfg.pix_nome, 25) || "MOTA LANCHES") + f("60", limpa(cfg.pix_cidade.split("-")[0], 15) || "BRASIL") +
    f("62", f("05", id)) + "6304";
  return p + crc16(p);
}
async function copiarTexto(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch (e) {
    const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (x) {} a.remove(); return ok;
  }
}
function caixaPix(cfg, valor, txid) {
  const cod = pixCopiaCola(cfg, valor, txid);
  if (!cod) return "";
  return `<div class="pix-caixa">
    <div><strong>💠 Pague com Pix</strong> — ${dinheiro(valor)}</div>
    <div class="dica">Copie o código e cole no app do seu banco, em "Pix copia e cola".</div>
    <textarea class="campo pix-codigo" readonly rows="3">${esc(cod)}</textarea>
    <button class="btn-principal btn-copiar-pix" data-codigo="${esc(cod)}" style="margin-top:8px">📋 Copiar código Pix</button>
    <div class="dica" style="margin-top:6px">Chave: ${esc(cfg.chave_pix)}${cfg.pix_nome ? " · " + esc(cfg.pix_nome) : ""}</div>
  </div>`;
}
document.addEventListener("click", async e => {
  const b = e.target.closest(".btn-copiar-pix"); if (!b) return;
  const ok = await copiarTexto(b.dataset.codigo);
  b.textContent = ok ? "✅ Código copiado!" : "Selecione o código acima e copie";
  setTimeout(() => b.textContent = "📋 Copiar código Pix", 2500);
});
