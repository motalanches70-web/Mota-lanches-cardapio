/* =========================================================
   CONFIGURAÇÕES DA MOTA LANCHES
   Para mudar algo do site, normalmente só precisa mexer AQUI.
   ========================================================= */
window.MOTA = {
  NOME: "Mota Lanches",
  SLOGAN: "Fome? É na Mota Lanches.",
  FRASE: "Aqui é qualidade e muito sabor!",

  // WhatsApp da loja: 55 + DDD + número, só números
  WHATSAPP: "5516991530000",
  EMAIL: "motalanches70@gmail.com",

  // Taxa de entrega em reais. Use 0 para "taxa combinada pelo WhatsApp".
  TAXA_ENTREGA: 0,

  // Chave Pix da loja (não é segredo: é a mesma que você passa para o cliente).
  // Deixe "" (vazio) se não quiser mostrar.
  CHAVE_PIX: "",

  // ---- Supabase (pedidos e painel) ----
  // Enquanto estiver vazio, os pedidos vão direto para o WhatsApp da loja.
  // Use SOMENTE a chave pública (anon / publishable). NUNCA a "service_role" ou "secret".
  SUPABASE_URL: "https://whdbyzfvxqtcgeiuuvqm.supabase.co",
  SUPABASE_CHAVE_PUBLICA: "sb_publishable_yEjdss-ewg3nuabyLlx_Uw_CmDTEt_g",

  // Aviso no celular pelo app ntfy (opcional). Ex.: "motalanches-pedidos-7391"
  NTFY_TOPICO: ""
};
