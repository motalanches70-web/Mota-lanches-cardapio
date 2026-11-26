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
  NTFY_TOPICO: "",

  // ---- Lembrete da mensalidade do site (aparece só no painel da loja) ----
  // Aparece alguns dias antes do vencimento e some sozinho depois.
  MENSALIDADE: {
    ATIVO: true,             // true = mostrar o lembrete
    DIA_VENCIMENTO: 21,      // dia do mês em que vence
    VALOR: 50.00,            // valor da mensalidade
    AVISAR_DIAS_ANTES: 2,    // começa a avisar quantos dias antes
    AVISAR_DIAS_DEPOIS: 5,   // continua avisando quantos dias depois (atrasada)
    CHAVE_PIX: "16994253489", // sua chave Pix para receber
    NOME: "Cristian de Freitas Pereira", // seu nome (aparece junto da chave)
    WHATSAPP: "5516994253489" // seu WhatsApp: 55 + DDD + número (opcional)
  }
};
