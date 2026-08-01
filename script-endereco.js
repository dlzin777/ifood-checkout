/**
 * Endereço / CEP — após dados pessoais
 * Continuar solicitacao → processando.html (vídeo)
 */
(() => {
  "use strict";

  const cepInput = document.getElementById("cep-input");
  const btnBuscar = document.getElementById("btn-buscar-cep");
  const loading = document.getElementById("cep-loading");
  const errorBox = document.getElementById("cep-error");
  const addressResult = document.getElementById("address-result");
  const addressExtra = document.getElementById("address-extra");
  const freightBox = document.getElementById("freight-calculation");
  const streetEl = document.getElementById("addr-street");
  const cityEl = document.getElementById("addr-city");
  const numberEl = document.getElementById("addr-number");
  const complementEl = document.getElementById("addr-complement");
  const referenceEl = document.getElementById("addr-reference");
  const noNumber = document.getElementById("no-number");
  const noComplement = document.getElementById("no-complement");
  const btnConfirm = document.getElementById("btn-confirm-address");
  const toastEl = document.getElementById("toast");
  const stockLabel = document.getElementById("stock-left-label");

  const STOCK_KEY = "estudo_bag_stock";
  const STOCK_CITY_KEY = "estudo_bag_stock_city";
  const INITIAL_STOCK = 3;

  let toastTimer = null;
  let lastAddress = null;

  function getStock() {
    try {
      const n = Number(sessionStorage.getItem(STOCK_KEY));
      if (Number.isFinite(n) && n >= 1) return Math.min(3, Math.floor(n));
    } catch {
      /* ignore */
    }
    return INITIAL_STOCK;
  }

  function setStock(n, city) {
    const value = Math.max(1, Math.min(3, Math.floor(Number(n) || INITIAL_STOCK)));
    try {
      sessionStorage.setItem(STOCK_KEY, String(value));
      if (city) sessionStorage.setItem(STOCK_CITY_KEY, city);
    } catch {
      /* ignore */
    }
    return value;
  }

  function renderStockLabel(city) {
    const left = setStock(getStock() || INITIAL_STOCK, city || lastAddress?.city);
    if (stockLabel) {
      stockLabel.textContent =
        left === 1 ? "Resta apenas 1 bag" : `Restam apenas ${left} bags`;
    }
    return left;
  }

  function onlyDigits(v) {
    return String(v || "").replace(/\D/g, "");
  }

  function maskCep(input) {
    let v = onlyDigits(input.value).slice(0, 8);
    if (v.length > 5) v = v.replace(/(\d{5})(\d{0,3})/, "$1-$2");
    input.value = v;
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

  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
  }

  function clearError() {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
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
    }, 2600);
  }

  async function buscarCep() {
    clearError();
    const cep = onlyDigits(cepInput?.value);
    if (cep.length !== 8) {
      showError("Digite um CEP válido com 8 dígitos.");
      return;
    }

    hide(addressResult);
    hide(addressExtra);
    hide(freightBox);
    show(loading);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error("CEP nao encontrado");

      const street = data.logradouro || "Endereco localizado";
      const city = `${data.localidade || ""} - ${data.uf || ""}`.trim();
      lastAddress = {
        cep: cepInput.value,
        street,
        neighborhood: data.bairro || "",
        city,
      };

      if (streetEl) streetEl.textContent = street;
      if (cityEl) cityEl.textContent = city;
      showToast("CEP encontrado!", "success");
    } catch {
      lastAddress = {
        cep: cepInput.value,
        street: "Rua Exemplo, 123",
        neighborhood: "",
        city: "Sao Paulo - SP",
      };
      if (streetEl) streetEl.textContent = lastAddress.street;
      if (cityEl) cityEl.textContent = lastAddress.city;
      showToast("CEP consultado (modo estudo).");
    } finally {
      hide(loading);
      show(addressResult);
      show(addressExtra);
      show(freightBox);
      // Estoque da região — mesmo número usado no feed ao vivo depois
      if (!sessionStorage.getItem(STOCK_KEY)) {
        setStock(INITIAL_STOCK, lastAddress?.city);
      }
      renderStockLabel(lastAddress?.city);
    }
  }

  function validateExtra() {
    const semNumero = !!noNumber?.checked;
    const semComplemento = !!noComplement?.checked;
    const numero = numberEl?.value.trim() || "";
    const complemento = complementEl?.value.trim() || "";

    if (!semNumero && !numero) {
      showError("Informe o numero do endereco ou marque 'Endereco sem numero'.");
      return false;
    }
    if (!semComplemento && !complemento) {
      showError("Informe o complemento ou marque 'Endereco sem complemento'.");
      return false;
    }
    return true;
  }

  function confirmar() {
    clearError();
    if (!lastAddress) {
      showError("Verifique o CEP antes de continuar.");
      return;
    }
    if (!validateExtra()) return;

    const payload = {
      ...lastAddress,
      number: noNumber?.checked ? "S/N" : numberEl?.value.trim() || "",
      complement: noComplement?.checked ? "Sem complemento" : complementEl?.value.trim() || "",
      reference: referenceEl?.value.trim() || "",
    };

    try {
      const prev = JSON.parse(localStorage.getItem("estudo_address") || "null") || {};
      localStorage.setItem("estudo_address", JSON.stringify({ ...prev, ...payload }));
    } catch {
      /* ignore */
    }

    showToast("Endereco confirmado! Indo para o video...", "success");
    setTimeout(() => {
      window.location.href = "processando.html";
    }, 450);
  }

  function wireCheckboxes() {
    noNumber?.addEventListener("change", () => {
      if (!numberEl) return;
      numberEl.disabled = noNumber.checked;
      if (noNumber.checked) numberEl.value = "";
    });
    noComplement?.addEventListener("change", () => {
      if (!complementEl) return;
      complementEl.disabled = noComplement.checked;
      if (noComplement.checked) complementEl.value = "";
    });
  }

  function init() {
    try {
      const saved = JSON.parse(localStorage.getItem("estudo_address") || "null");
      if (saved?.cep && cepInput) cepInput.value = saved.cep;
    } catch {
      /* ignore */
    }

    cepInput?.addEventListener("input", () => maskCep(cepInput));
    btnBuscar?.addEventListener("click", buscarCep);
    btnConfirm?.addEventListener("click", confirmar);
    wireCheckboxes();

    cepInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        buscarCep();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
