# Mota Lanches — site de pedidos

**Fome? É na Mota Lanches.**
Site: https://motalanches70-web.github.io/Mota-lanches-cardapio/

## Páginas
| Arquivo | O que é |
|---|---|
| `index.html` | Vitrine: cardápio com categorias, busca e barra da sacola |
| `produto.html` | Página do lanche: foto, tirar ingredientes, adicionais, "combina com", quantidade |
| `carrinho.html` | Sacola e finalização (entrega/retirada, pagamento, cupom) |
| `pedido.html` | Acompanhar o pedido e "Meus pedidos" |
| `admin.html` | Painel da loja (entra com o e-mail e a senha da loja) |
| `politica.html` | Política de privacidade |

## Pastas
```
assets/
  css/  variables.css  → cores e fontes (preto, branco, amarelo)
        style.css      → visual do site
        admin.css      → visual do painel
  js/   config.js      → endereço do Supabase e chave PÚBLICA
        cardapio.js    → cardápio reserva (usado só se o banco não responder)
        comum.js       → funções usadas em todas as páginas
        catalog.js     → vitrine e página do lanche
        cart.js        → sacola e finalização do pedido
        pedido.js      → acompanhar pedido
        admin.js       → painel
  img/  mascote.webp, icone.webp (site) · icone.png (ícone da aba) · banner.jpg (prévia do link)
```

## Como atualizar
1. No GitHub, abra o repositório e clique em **Add file → Upload files**.
2. Arraste **tudo que está dentro** da pasta `mota-lanches-site` (a pasta `assets` e os arquivos `.html`).
3. Clique em **Commit changes** e espere uns 2 minutos.
4. No celular/computador, atualize a página (Ctrl+F5).

## Segurança
- Aqui só fica a chave **pública** do Supabase. Nunca coloque senha, chave secreta ou `service_role` nestes arquivos.
- O total do pedido é calculado no banco (função `criar_pedido`), então ninguém consegue mudar o preço pelo navegador.
