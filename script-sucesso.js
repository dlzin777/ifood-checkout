/**
 * Tela /sucesso
 * - Clique no card = seleciona
 * - Continuar Resgate = animação de pagamento → checkout
 */
(() => {
  "use strict";

  const cards = Array.from(document.querySelectorAll(".success-reward-card"));
  const checkoutBtn = document.getElementById("btn-checkout");
  const timerEl = document.getElementById("timer");
  const toastEl = document.getElementById("toast");
  const leadNameEl = document.getElementById("lead-name");
  const pickModal = document.getElementById("pick-success-modal");
  const pickTitle = document.getElementById("pick-success-title");
  const pickText = document.getElementById("pick-success-text");
  const pickHint = document.getElementById("pick-success-hint");
  const pickSteps = Array.from(document.querySelectorAll(".pick-step"));

  const REWARD_LABELS = {
    bag: "Bag do iFood",
    bau: "Baú do iFood",
    kit_entregador: "Kit Entregador iFood",
  };

  let selectedId = null;
  let remainingSeconds = 5 * 60;
  let toastTimer = null;
  let navigating = false;

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
    }, 2600);
  }

  function setStepActive(stepNumber) {
    pickSteps.forEach((el) => {
      const n = Number(el.getAttribute("data-step"));
      el.classList.toggle("is-active", n === stepNumber);
      el.classList.toggle("is-done", n < stepNumber);
    });
  }

  function goToCheckoutWithAnimation(rewardId) {
    if (navigating) return;
    navigating = true;
    if (checkoutBtn) checkoutBtn.disabled = true;

    const label = REWARD_LABELS[rewardId] || "item";

    try {
      localStorage.setItem("estudo_selected_reward", rewardId);
      sessionStorage.setItem("estudo_checkout_enter", "1");
    } catch {
      /* ignore */
    }

    if (pickTitle) pickTitle.textContent = "Quase lá!";
    if (pickText) pickText.textContent = `${label} reservada. Vamos para o pagamento.`;
    if (pickHint) pickHint.textContent = "Validando seu resgate...";
    setStepActive(1);

    if (pickModal) {
      pickModal.classList.remove("hidden");
      pickModal.classList.remove("is-visible");
      void pickModal.offsetWidth;
      pickModal.classList.add("is-visible");
      document.body.classList.add("modal-open");
    }

    // Sequência de animação “para pagamento”
    setTimeout(() => {
      setStepActive(2);
      if (pickHint) pickHint.textContent = "Abrindo ambiente seguro de pagamento...";
      pickModal?.classList.add("is-paying");
    }, 900);

    setTimeout(() => {
      setStepActive(3);
      if (pickTitle) pickTitle.textContent = "Redirecionando...";
      if (pickHint) pickHint.textContent = "Carregando checkout / frete...";
    }, 1800);

    setTimeout(() => {
      window.location.href = "checkout.html";
    }, 2800);
  }

  function selectReward(card) {
    if (navigating) return;

    selectedId = card.getAttribute("data-reward-id");

    cards.forEach((el) => {
      const active = el === card;
      el.classList.toggle("is-selected", active);
      el.setAttribute("aria-pressed", active ? "true" : "false");
    });

    if (checkoutBtn) checkoutBtn.disabled = false;

    const label = REWARD_LABELS[selectedId] || "item";
    showToast(`${label} selecionada. Clique em Continuar Resgate.`, "success");
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function startTimer() {
    if (!timerEl) return;
    timerEl.textContent = formatTime(remainingSeconds);

    const tick = setInterval(() => {
      remainingSeconds -= 1;
      if (remainingSeconds <= 0) {
        remainingSeconds = 0;
        timerEl.textContent = formatTime(0);
        clearInterval(tick);
        showToast("O tempo deste lote expirou (simulação de estudo).");
        return;
      }
      timerEl.textContent = formatTime(remainingSeconds);
    }, 1000);
  }

  function initLeadName() {
    try {
      const saved = localStorage.getItem("estudo_lead_name");
      if (saved && leadNameEl) leadNameEl.textContent = saved;
    } catch {
      /* ignore */
    }
  }

  function init() {
    initLeadName();
    startTimer();

    cards.forEach((card) => {
      card.addEventListener("click", () => selectReward(card));
    });

    checkoutBtn?.addEventListener("click", () => {
      if (!selectedId) {
        showToast("Escolha 1 item para continuar.");
        return;
      }
      goToCheckoutWithAnimation(selectedId);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
