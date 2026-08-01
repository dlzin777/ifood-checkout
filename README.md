# Checkout BravoPay (Node.js + Express)

Integração completa com gateway **BravoPay** para checkout PIX personalizado, com rastreamento UTM/UTMify e webhook server-side.

## Stack

- **Backend:** Node.js + Express (proxy seguro da API key)
- **Frontend:** HTML + JavaScript vanilla
- **QR Code:** [qrcode](https://www.npmjs.com/package/qrcode) via CDN

## Instalação

```bash
npm install
```

Copie `.env.example` para `.env` (já configurado com sua chave):

```env
BRAVOPAY_API_KEY=bp_live_xxxxx
PORT=3000
```

## Executar

```bash
npm start
```

Abra: `http://localhost:3000/checkout.html`

## Fluxo do checkout

1. **dados.html** — nome, e-mail, telefone, CPF
2. **checkout.html** — frete + product_id (UTMify)
3. **pix.html** — QR + copia-e-cola + polling a cada 3s
4. **/obrigado** — confirmação após `status = PAID`

## Product ID (UTMify)

Cole o ID em **um** destes lugares:

1. `bravopay-config.js` → `PRODUCT_ID: "prod_xxx"`
2. Campo "Product ID BravoPay" no checkout
3. Dashboard: https://bravopay.club/dashboard/produtos

## UTMs

O `script-utms.js` captura na URL:

`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`, `ttclid`, `gclid`

Persiste em **localStorage + cookie (30 dias)** e envia no campo `utm` de cada transação.

Teste: `http://localhost:3000/?utm_source=fb&utm_campaign=teste`

## Webhook (produção)

Cadastre em https://bravopay.club/dashboard/integracoes/webhooks:

```
https://SEU-DOMINIO.com/api/webhook
```

Eventos: `transaction.paid`, `transaction.refunded`, etc.

O servidor grava pagamentos confirmados em `data/paid-orders.json`. **Não confie só no polling do browser** — use o webhook para liberar produto/atualizar banco.

## Rotas da API local

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/create-transaction` | Cria PIX na BravoPay |
| GET | `/api/transactions/:id` | Consulta status (polling) |
| POST | `/api/webhook` | Recebe notificações BravoPay |
| GET | `/obrigado` | Página de sucesso |

## Segurança

- A API key **nunca** vai para o front-end — só no `.env` do servidor
- Não commite o `.env` (já está no `.gitignore`)
