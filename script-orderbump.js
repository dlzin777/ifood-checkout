/**
 * Orderbump — Seguro Bag (após checkout)
 * Aceitar ou recusar → simula "Gerando pagamento..."
 */
(() => {
  "use strict";

  const BUMP_PRICE = 9.9;
  const REWARD_EXTRA = {
    bag: 0,
    bau: 39.9,
    kit_entregador: 97.9,
  };

  const totalEl = document.getElementById("bump-total");
  const monthlyEl = document.getElementById("bump-monthly");
  const btnAccept = document.getElementById("btn-bump-accept");
  const btnDecline = document.getElementById("btn-bump-decline");
  const loading = document.getElementById("bump-loading");
  const toastEl = document.getElementById("toast");

  let toastTimer = null;
  let submitting = false;

  function money(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function showToast(message, variant) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.remove("hidden", "toast--show", "toast--success");
    if (variant === "success") toastEl.classList.add("toast--success");
    void toastEl.offsetWidth;
    toastEl.classList.add("toast--show");
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("toast--show");
      setTimeout(() => toastEl.classList.add("hidden"), 220);
    }, 2800);
  }

  function calcBaseTotal() {
    let shipping = 0;
    let extra = 0;
    try {
      const checkout = JSON.parse(localStorage.getItem("estudo_checkout") || "null");
      if (checkout?.shippingPrice != null) shipping = Number(checkout.shippingPrice) || 0;
      const rewardId = localStorage.getItem("estudo_selected_reward") || "bag";
      extra = REWARD_EXTRA[rewardId] || 0;
    } catch {
      /* ignore */
    }
    return shipping + extra;
  }

  function finish(withBump) {
    if (submitting) return;
    submitting = true;

    btnAccept.disabled = true;
    btnDecline.disabled = true;
    loading?.classList.remove("hidden");
    loading?.setAttribute("aria-hidden", "false");

    try {
      localStorage.setItem(
        "estudo_bump",
        JSON.stringify({
          selected: withBump,
          price: withBump ? BUMP_PRICE : 0,
          title: "Seguro Bag",
          at: Date.now(),
        })
      );
    } catch {
      /* ignore */
    }

    const msg = withBump
      ? "Seguro adicionado! Gerando pagamento..."
      : "Continuando sem seguro...";

    showToast(msg, "success");

    // Estudo: após “Gerando pagamento...” vai para a tela PIX
    setTimeout(() => {
      window.location.href = "pix.html";
    }, 1600);
  }

  function init() {
    if (monthlyEl) monthlyEl.textContent = money(BUMP_PRICE);

    const base = calcBaseTotal();
    const withInsurance = base + BUMP_PRICE;
    if (totalEl) totalEl.textContent = money(withInsurance);

    btnAccept?.addEventListener("click", () => finish(true));
    btnDecline?.addEventListener("click", () => finish(false));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
