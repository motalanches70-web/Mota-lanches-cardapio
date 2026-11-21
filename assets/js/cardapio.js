/* =========================================================
   CARDÁPIO DA MOTA LANCHES
   Para mudar um preço, troque só o número depois de "preco:".
   Use ponto no lugar da vírgula: 25.50 = R$ 25,50
   Para tirar um item do site por um tempo, mude "ativo: true" para "ativo: false".
   ========================================================= */
/* ADICIONAIS: aparecem para o cliente escolher nos lanches, omeletes e macarrão.
   ⚠️ PREÇOS DE EXEMPLO — troque pelos preços certos da Mota Lanches.
   Para tirar um adicional, apague a linha inteira dele. */
window.ADICIONAIS = [
  { nome: "Bacon", preco: 5.00 },
  { nome: "Ovo", preco: 3.00 },
  { nome: "Hambúrguer", preco: 6.00 },
  { nome: "Hambúrguer caseiro", preco: 10.00 },
  { nome: "Mussarela", preco: 4.00 },
  { nome: "Catupiry", preco: 4.00 },
  { nome: "Cheddar", preco: 4.00 },
  { nome: "Presunto", preco: 3.00 },
  { nome: "Salsicha", preco: 3.00 },
  { nome: "Milho", preco: 2.00 },
  { nome: "Batata palha", preco: 2.00 }
];

/* Categorias SEM adicionais e sem "tirar ingredientes" */
window.SEM_OPCOES = ["Porções de Batata (500g)", "Bebidas"];

window.CARDAPIO = [
  {
    categoria: "Lanches de Hambúrguer", icone: "🍔",
    itens: [
      { id: "x-burguer", nome: "X-Burguer", desc: "Pão, queijo, hambúrguer, catupiry", preco: 20.00, ativo: true },
      { id: "x-bacon", nome: "X-Bacon", desc: "Pão, bacon, queijo, hambúrguer, catupiry", preco: 20.00, ativo: true },
      { id: "x-bacon-egg", nome: "X-Bacon Egg", desc: "Pão, bacon, queijo, hambúrguer, ovo, catupiry", preco: 21.00, ativo: true },
      { id: "x-egg", nome: "X-Egg", desc: "Pão, queijo, hambúrguer, ovo, catupiry", preco: 20.00, ativo: true },
      { id: "x-salada", nome: "X-Salada", desc: "Pão, queijo, hambúrguer, alface, tomate, catupiry", preco: 20.00, ativo: true },
      { id: "x-salada-egg", nome: "X-Salada Egg", desc: "Pão, queijo, hambúrguer, ovo, alface, tomate, catupiry", preco: 21.00, ativo: true },
      { id: "x-salada-bacon", nome: "X-Salada Bacon", desc: "Pão, queijo, hambúrguer, bacon, alface, tomate, catupiry", preco: 21.00, ativo: true },
      { id: "x-salada-bacon-egg", nome: "X-Salada Bacon Egg", desc: "Pão, queijo, hambúrguer, bacon, ovo, alface, tomate, catupiry", preco: 22.00, ativo: true },
      { id: "x-tudo", nome: "X-Tudo", desc: "Pão, queijo, hambúrguer, ovo, presunto, milho, bacon, salsicha, alface, tomate, catupiry", preco: 25.00, ativo: true },
      { id: "x-tudo-duplo", nome: "X-Tudo Duplo", desc: "Pão, queijo, 2 hambúrgueres, ovo, presunto, milho, bacon, salsicha, alface, tomate, catupiry", preco: 28.00, ativo: true }
    ]
  },
  {
    categoria: "Lanche Caseiro", icone: "👑",
    itens: [
      { id: "x-caseiro", nome: "X-Caseiro", desc: "Pão, hambúrguer caseiro, mussarela, catupiry", preco: 30.00, ativo: true },
      { id: "x-caseiro-egg", nome: "X-Caseiro Egg", desc: "Pão, hambúrguer caseiro, ovo, mussarela, catupiry", preco: 32.00, ativo: true },
      { id: "x-caseiro-bacon", nome: "X-Caseiro Bacon", desc: "Pão, hambúrguer caseiro, bacon, mussarela, catupiry", preco: 32.00, ativo: true },
      { id: "x-caseiro-bacon-egg", nome: "X-Caseiro Bacon Egg", desc: "Pão, hambúrguer caseiro, bacon, ovo, mussarela, catupiry", preco: 33.00, ativo: true },
      { id: "x-caseiro-salada", nome: "X-Caseiro Salada", desc: "Pão, hambúrguer caseiro, alface, tomate, mussarela, catupiry", preco: 32.00, ativo: true },
      { id: "x-caseiro-salada-egg", nome: "X-Caseiro Salada Egg", desc: "Pão, hambúrguer caseiro, ovo, alface, tomate, mussarela, catupiry", preco: 33.00, ativo: true },
      { id: "x-caseiro-salada-bacon", nome: "X-Caseiro Salada Bacon", desc: "Pão, hambúrguer caseiro, bacon, alface, tomate, mussarela, catupiry", preco: 35.00, ativo: true },
      { id: "x-caseiro-salada-bacon-egg", nome: "X-Caseiro Salada Bacon Egg", desc: "Pão, hambúrguer caseiro, bacon, ovo, alface, tomate, mussarela, catupiry", preco: 38.00, ativo: true },
      { id: "x-caseiro-tudo", nome: "X-Caseiro Tudo", desc: "Pão, hambúrguer caseiro, presunto, ovo, mussarela, milho, bacon, salsicha, alface, tomate, catupiry", preco: 42.00, ativo: true },
      { id: "x-caseiro-tudo-duplo", nome: "X-Caseiro Tudo Duplo", desc: "Pão, 2 hambúrgueres caseiros, presunto, ovo, mussarela, milho, bacon, salsicha, alface, tomate, catupiry", preco: 45.00, ativo: true }
    ]
  },
  {
    categoria: "Lanches de Carne", icone: "🥩",
    itens: [
      { id: "x-churrasco", nome: "X-Churrasco", desc: "Pão, carne, mussarela, catupiry", preco: 25.00, ativo: true },
      { id: "x-churrasco-egg", nome: "X-Churrasco Egg", desc: "Pão, carne, ovo, mussarela, catupiry", preco: 26.00, ativo: true },
      { id: "x-churrasco-bacon", nome: "X-Churrasco Bacon", desc: "Pão, carne, bacon, mussarela, catupiry", preco: 26.00, ativo: true },
      { id: "x-churrasco-bacon-egg", nome: "X-Churrasco Bacon Egg", desc: "Pão, carne, bacon, ovo, mussarela, catupiry", preco: 27.00, ativo: true },
      { id: "x-churrasco-salada", nome: "X-Churrasco Salada", desc: "Pão, carne, alface, tomate, mussarela, catupiry", preco: 26.00, ativo: true },
      { id: "x-churrasco-salada-egg", nome: "X-Churrasco Salada Egg", desc: "Pão, carne, alface, tomate, ovo, mussarela, catupiry", preco: 28.00, ativo: true },
      { id: "x-churrasco-salada-bacon", nome: "X-Churrasco Salada Bacon", desc: "Pão, carne, alface, tomate, bacon, mussarela, catupiry", preco: 32.00, ativo: true },
      { id: "x-churrasco-salada-bacon-egg", nome: "X-Churrasco Salada Bacon Egg", desc: "Pão, carne, alface, tomate, ovo, bacon, mussarela, catupiry", preco: 33.00, ativo: true },
      { id: "x-churrasco-tudo", nome: "X-Churrasco Tudo", desc: "Pão, carne, queijo, ovo, presunto, milho, bacon, salsicha, alface, tomate, catupiry", preco: 35.00, ativo: true }
    ]
  },
  {
    categoria: "Lanches de Frango", icone: "🍗",
    itens: [
      { id: "x-frango", nome: "X-Frango", desc: "Pão, frango, mussarela, catupiry", preco: 25.00, ativo: true },
      { id: "x-frango-egg", nome: "X-Frango Egg", desc: "Pão, frango, ovo, mussarela, catupiry", preco: 26.00, ativo: true },
      { id: "x-frango-bacon", nome: "X-Frango Bacon", desc: "Pão, frango, bacon, mussarela, catupiry", preco: 26.00, ativo: true },
      { id: "x-frango-bacon-egg", nome: "X-Frango Bacon Egg", desc: "Pão, frango, bacon, ovo, mussarela, catupiry", preco: 28.00, ativo: true },
      { id: "x-frango-salada", nome: "X-Frango Salada", desc: "Pão, frango, alface, tomate, mussarela, catupiry", preco: 27.00, ativo: true },
      { id: "x-frango-salada-bacon", nome: "X-Frango Salada Bacon", desc: "Pão, frango, bacon, alface, tomate, ovo, mussarela, catupiry", preco: 28.00, ativo: true },
      { id: "x-frango-salada-egg", nome: "X-Frango Salada Egg", desc: "Pão, frango, ovo, alface, tomate, mussarela, catupiry", preco: 30.00, ativo: true },
      { id: "x-frango-tudo", nome: "X-Frango Tudo", desc: "Pão, frango, queijo, ovo, presunto, milho, bacon, salsicha, alface, tomate, catupiry", preco: 35.00, ativo: true }
    ]
  },
  {
    categoria: "Lanches Especiais", icone: "⭐",
    itens: [
      { id: "misto-quente", nome: "Misto Quente", desc: "Pão, presunto, queijo especial", preco: 18.00, ativo: true },
      { id: "misto-quente-especial", nome: "Misto Quente Especial", desc: "Pão, presunto, queijo, hambúrguer, catupiry", preco: 20.00, ativo: true },
      { id: "carne-e-queijo", nome: "Carne e Queijo", desc: "Pão, carne, queijo, tomate, catupiry", preco: 25.00, ativo: true },
      { id: "americano", nome: "Americano", desc: "Pão, hambúrguer, bacon, ovo, mussarela, catupiry", preco: 25.00, ativo: true },
      { id: "cachorro-quente", nome: "Cachorro Quente", desc: "Pão, salsicha, bacon, milho, tomate, catupiry, maionese, ketchup, batata palha", preco: 18.00, ativo: true },
      { id: "cachorro-quente-prensado", nome: "Cachorro Quente Prensado", desc: "Pão, salsicha, bacon, queijo, milho, tomate, catupiry, maionese, ketchup, batata palha", preco: 20.00, ativo: true }
    ]
  },
  {
    categoria: "Omeletes", icone: "🍳",
    itens: [
      { id: "omelete-carne", nome: "Omelete de Carne", desc: "Carne, bacon, tomate, milho, catupiry", preco: 45.00, ativo: true },
      { id: "omelete-frango", nome: "Omelete de Frango", desc: "Frango, bacon, tomate, milho, catupiry", preco: 45.00, ativo: true },
      { id: "omelete-presunto-queijo", nome: "Omelete de Presunto e Queijo", desc: "Presunto, queijo, tomate, milho, bacon, catupiry", preco: 43.00, ativo: true }
    ]
  },
  {
    categoria: "Macarrão na Chapa", icone: "🍝",
    itens: [
      { id: "macarrao-carne", nome: "Macarrão na Chapa de Carne", desc: "Carne, bacon, milho, tomate, catupiry", preco: 45.00, ativo: true },
      { id: "macarrao-frango", nome: "Macarrão na Chapa de Frango", desc: "Frango, bacon, milho, tomate, catupiry", preco: 45.00, ativo: true },
      { id: "macarrao-presunto-queijo", nome: "Macarrão na Chapa de Presunto e Queijo", desc: "Presunto, queijo, milho, bacon, tomate, catupiry", preco: 43.00, ativo: true }
    ]
  },
  {
    categoria: "Porções de Batata (500g)", icone: "🍟",
    itens: [
      { id: "batata-cheddar", nome: "Batata com Cheddar", desc: "Porção de 500g", preco: 45.00, ativo: true },
      { id: "batata-catupiry", nome: "Batata com Catupiry", desc: "Porção de 500g", preco: 45.00, ativo: true },
      { id: "batata-completa", nome: "Batata Completa (Catupiry e Cheddar)", desc: "Porção de 500g", preco: 48.00, ativo: true }
    ]
  },
  {
    categoria: "Bebidas", icone: "🥤",
    itens: [
      { id: "agua-sem-gas", nome: "Água sem gás", desc: "", preco: 5.00, ativo: true },
      { id: "agua-com-gas", nome: "Água com gás", desc: "", preco: 6.00, ativo: true },
      { id: "refri-lata", nome: "Refrigerante lata", desc: "", preco: 7.00, ativo: true },
      { id: "suco", nome: "Suco", desc: "", preco: 6.00, ativo: true },
      { id: "refri-1l", nome: "Refrigerante 1L", desc: "", preco: 10.00, ativo: true },
      { id: "refri-2l", nome: "Refrigerante 2L", desc: "", preco: 13.00, ativo: true }
    ]
  }
];
