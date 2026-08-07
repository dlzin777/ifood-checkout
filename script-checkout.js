/**
 * Checkout — resumo + frete (estudo de UI)
 * Usa ViaCEP (API pública) só para preencher endereço visualmente.
 * Sem pagamento real / PIX.
 */
(() => {
  "use strict";

  const REWARDS = {
    bag: { id: "bag", name: "Bag do iFood", extra: 0 },
    bau: { id: "bau", name: "Baú do iFood", extra: 39.9 },
    kit_entregador: { id: "kit_entregador", name: "Kit Entregador iFood", extra: 97.9 },
  };

  const BASE_FREIGHT = [
    { id: "economico", name: "Envio Econômico iFood", price: 22.9, eta: "5 a 8 dias úteis" },
    { id: "padrao", name: "Envio Padrão iFood", price: 28.9, eta: "3 a 5 dias úteis" },
    { id: "expresso", name: "Envio Prioritário iFood", price: 32.9, eta: "1 a 3 dias úteis" },
  ];

  const els = {
    name: document.getElementById("summary-name"),
    cpf: document.getElementById("summary-cpf"),
    birth: document.getElementById("summary-birth"),
    address: document.getElementById("summary-address"),
    cepSummary: document.getElementById("summary-cep"),
    cepInput: document.getElementById("checkout-cep"),
    btnCalc: document.getElementById("btn-calc-freight"),
    loading: document.getElementById("freight-loading"),
    freightAddress: document.getElementById("freight-address"),
    street: document.getElementById("freight-street"),
    city: document.getElementById("freight-city"),
    hint: document.getElementById("freight-hint"),
    options: document.getElementById("freight-options"),
    btnEditCep: document.getElementById("btn-edit-cep"),
    shippingTotal: document.getElementById("shipping-total"),
    shippingPrice: document.getElementById("shipping-total-price"),
    rewardExtra: document.getElementById("reward-extra-total"),
    rewardExtraPrice: document.getElementById("reward-extra-price"),
    rewardExtraLabel: document.getElementById("reward-extra-label"),
    grandTotal: document.getElementById("checkout-grand-total"),
    grandPrice: document.getElementById("checkout-grand-total-price"),
    nextStep: document.getElementById("checkout-next-step"),
    selectedShipping: document.getElementById("checkout-selected-shipping"),
    btnFinish: document.getElementById("btn-finish"),
    couponBanner: document.getElementById("coupon-banner"),
    headlineTitle: document.getElementById("checkout-headline-title"),
    toast: document.getElementById("toast"),
  };

  let reward = REWARDS.bag;
  let couponOff = 0;
  let selectedFreight = null;
  let toastTimer = null;

  function money(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function onlyDigits(v) {
    return String(v || "").replace(/\D/g, "");
  }

  function maskCep(input) {
    let v = onlyDigits(input.value).slice(0, 8);
    if (v.length > 5) v = v.replace(/(\d{5})(\d{0,3})/, "$1-$2");
    input.value = v;
  }

  function showToast(message, variant) {
    if (!els.toast) return;
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.remove("hidden", "toast--show", "toast--success");
    if (variant === "success") els.toast.classList.add("toast--success");
    void els.toast.offsetWidth;
    els.toast.classList.add("toast--show");
    toastTimer = setTimeout(() => {
      els.toast.classList.remove("toast--show");
      setTimeout(() => els.toast.classList.add("hidden"), 220);
    }, 2600);
  }

  function show(el) {
    if (!el) return;
    el.classList.remove("hidden");
    el.setAttribute("aria-hidden", "false");
  }

  function hide(el) {
    if (!el) return;
    el.classList.add("hidden");
    el.setAttribute("aria-hidden", "true");
  }

  function setSummaryValue(el, value) {
    if (!el) return;
    const text = String(value || "").trim();
    const row = el.closest(".summary-row");
    if (!text || text === "-") {
      el.textContent = "";
      if (row) row.classList.add("is-empty");
      return;
    }
    el.textContent = text;
    if (row) row.classList.remove("is-empty");
  }

  function formatAddress(addr) {
    if (!addr) return "";
    const parts = [];
    const street = addr.street || "";
    const number = addr.number && addr.number !== "S/N" ? addr.number : "";
    const neighborhood = addr.neighborhood || "";
    if (street && number) parts.push(`${street}, ${number}`);
    else if (street) parts.push(street);
    if (neighborhood) parts.push(neighborhood);
    if (addr.complement && addr.complement !== "Sem complemento") {
      parts.push(addr.complement);
    }
    return parts.filter(Boolean).join(" — ") || street || "";
  }

  function articleForReward(name) {
    const n = String(name || "").toLowerCase();
    if (n.startsWith("bag") || n.includes("bag ")) return "Sua";
    return "Seu";
  }

  function loadContext() {
    try {
      const personal = JSON.parse(localStorage.getItem("estudo_personal") || "null");
      setSummaryValue(els.name, personal?.name);
      setSummaryValue(els.cpf, personal?.cpf);
      setSummaryValue(els.birth, personal?.birth);

      const savedAddr = JSON.parse(localStorage.getItem("estudo_address") || "null");
      setSummaryValue(els.address, formatAddress(savedAddr) || savedAddr?.street);
      setSummaryValue(els.cepSummary, savedAddr?.cep);

      if (savedAddr?.cep && els.cepInput && !els.cepInput.value) {
        els.cepInput.value = savedAddr.cep;
      }

      const rewardId = localStorage.getItem("estudo_selected_reward") || "bag";
      reward = REWARDS[rewardId] || REWARDS.bag;

      if (els.headlineTitle) {
        els.headlineTitle.textContent = `${articleForReward(reward.name)} ${reward.name} já está reservad${articleForReward(reward.name) === "Sua" ? "a" : "o"}`;
      }

      if (reward.extra > 0) {
        if (els.rewardExtraLabel) {
          els.rewardExtraLabel.textContent = `Adicional do item (${reward.name})`;
        }
        if (els.rewardExtraPrice) els.rewardExtraPrice.textContent = money(reward.extra);
        show(els.rewardExtra);
      } else {
        hide(els.rewardExtra);
      }

      const coupon = JSON.parse(sessionStorage.getItem("estudo_coupon") || "null");
      if (coupon?.amountOff) {
        couponOff = Number(coupon.amountOff) || 0;
        if (els.couponBanner) {
          els.couponBanner.innerHTML = `<strong>Cupom ${coupon.code || "FRETE"}</strong><span>Desconto de ${money(couponOff)} no frete</span>`;
          show(els.couponBanner);
        }
      }

    } catch (err) {
      console.warn("Falha ao carregar resumo:", err);
    }
  }

  function freightOptionsWithCoupon() {
    return BASE_FREIGHT.map((opt) => {
      const original = opt.price;
      const price = couponOff ? Math.max(0, Math.round((original - couponOff) * 100) / 100) : original;
      return {
        ...opt,
        originalPrice: couponOff ? original : null,
        price,
      };
    });
  }

  function renderFreightOptions() {
    const list = freightOptionsWithCoupon();
    els.options.innerHTML = "";

    list.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "freight-option";
      btn.dataset.id = opt.id;
      btn.innerHTML = `
        <span class="freight-option__main">
          <span class="freight-option__title">${opt.name}</span>
          <span class="freight-option__eta">${opt.eta}</span>
        </span>
        <span class="freight-option__price">
          ${opt.originalPrice ? `<span class="freight-option__old">${money(opt.originalPrice)}</span>` : ""}
          <span>${money(opt.price)}</span>
        </span>
      `;
      btn.addEventListener("click", () => selectFreight(opt, btn));
      els.options.appendChild(btn);
    });

    show(els.hint);
    show(els.options);
  }

  function selectFreight(opt, btn) {
    selectedFreight = opt;
    document.querySelectorAll(".freight-option").forEach((el) => {
      el.classList.toggle("freight-option--active", el === btn);
    });

    if (els.shippingPrice) els.shippingPrice.textContent = money(opt.price);
    show(els.shippingTotal);

    const total = opt.price + (reward.extra || 0);
    if (els.grandPrice) els.grandPrice.textContent = money(total);
    show(els.grandTotal);

    if (els.selectedShipping) {
      els.selectedShipping.textContent = `${opt.name} — ${money(opt.price)}`;
    }
    if (els.nextStep) {
      els.nextStep.textContent = "Frete selecionado. Pode receber seu item agora.";
    }

    show(els.btnFinish);
  }

  async function calcFreight() {
    const cep = onlyDigits(els.cepInput?.value);
    if (cep.length !== 8) {
      showToast("Digite um CEP válido com 8 dígitos.");
      return;
    }

    hide(els.btnFinish);
    selectedFreight = null;
    hide(els.options);
    hide(els.hint);
    hide(els.shippingTotal);
    hide(els.grandTotal);
    show(els.loading);

    if (els.nextStep) els.nextStep.textContent = "Calculando frete...";
    if (els.selectedShipping) els.selectedShipping.textContent = "Frete ainda nao selecionado.";

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();

      if (data.erro) {
        throw new Error("CEP não encontrado");
      }

      const street = [data.logradouro, data.bairro].filter(Boolean).join(" — ") || "Endereço localizado";
      const city = `${data.localidade || ""} - ${data.uf || ""}`.trim();

      if (els.street) els.street.textContent = street;
      if (els.city) els.city.textContent = city;

      try {
        const prev = JSON.parse(localStorage.getItem("estudo_address") || "null") || {};
        localStorage.setItem(
          "estudo_address",
          JSON.stringify({
            ...prev,
            cep: els.cepInput.value,
            street: data.logradouro || prev.street || street,
            neighborhood: data.bairro || prev.neighborhood || "",
            city,
          })
        );
      } catch {
        /* ignore */
      }

      const savedAddr = JSON.parse(localStorage.getItem("estudo_address") || "null");
      setSummaryValue(els.address, formatAddress(savedAddr) || street);
      setSummaryValue(els.cepSummary, els.cepInput.value);

      show(els.freightAddress);
      renderFreightOptions();
      if (els.nextStep) els.nextStep.textContent = "Escolha uma opção de frete abaixo.";
      showToast("Frete calculado!", "success");
    } catch {
      const street = "Rua Exemplo, Centro";
      const city = "São Paulo - SP";
      if (els.street) els.street.textContent = street;
      if (els.city) els.city.textContent = city;
      setSummaryValue(els.address, street);
      setSummaryValue(els.cepSummary, els.cepInput.value);
      show(els.freightAddress);
      renderFreightOptions();
      showToast("CEP consultado (modo estudo). Escolha o frete.");
    } finally {
      hide(els.loading);
    }
  }

  function init() {
    loadContext();

    // Evita sobrescrever o resumo com "-" — loadContext já preencheu
    els.cepInput?.addEventListener("input", () => maskCep(els.cepInput));
    els.btnCalc?.addEventListener("click", calcFreight);
    els.btnEditCep?.addEventListener("click", () => {
      hide(els.freightAddress);
      hide(els.options);
      hide(els.hint);
      els.cepInput?.focus();
    });

    els.btnFinish?.addEventListener("click", () => {
      if (!selectedFreight) {
        showToast("Selecione uma opção de frete.");
        return;
      }

      const productId = String(window.BRAVOPAY_CONFIG?.PRODUCT_ID || "").trim();
      try {
        localStorage.setItem(
          "estudo_checkout",
          JSON.stringify({
            shippingId: selectedFreight.id,
            shippingName: selectedFreight.name,
            shippingPrice: selectedFreight.price,
            rewardId: reward.id,
            rewardExtra: reward.extra || 0,
            total: selectedFreight.price + (reward.extra || 0),
            productId,
            at: Date.now(),
          })
        );
      } catch {
        /* ignore */
      }

      showToast("Frete confirmado! Indo para o pagamento...", "success");
      setTimeout(() => {
        window.location.href = "pix.html";
      }, 500);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
