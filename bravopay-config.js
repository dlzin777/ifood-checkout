/**
 * Configuração central BravoPay
 * ─────────────────────────────
 * Cole aqui o product_id do dashboard (https://bravopay.club/dashboard/produtos)
 * se você usa UTMify. Sem isso, a venda pode cair num produto "ghost" e a
 * UTMify não atribui corretamente ao anúncio.
 *
 * Prioridade do product_id na criação da transação:
 *   1. Valor salvo no checkout (estudo_checkout.productId)
 *   2. BRAVOPAY_PRODUCT_ID abaixo (fallback fixo)
 */
window.BRAVOPAY_CONFIG = {
  /** Cole o ID do produto BravoPay aqui, ex: "prod_abc123" */
  PRODUCT_ID: "",

  /** Intervalo de polling do status PIX (ms) */
  POLL_INTERVAL_MS: 3000,

  /** URL de redirecionamento após pagamento confirmado */
  SUCCESS_URL: "/obrigado",
};
