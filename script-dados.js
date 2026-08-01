/**
 * Formulário de dados pessoais — máscaras + validação (estudo de UI)
 *
 * Fluxo:
 * - Continuar (válido) → endereco.html
 * - Recusar / voltar (back) → modal de cupom
 * - "Usar cupom e pagar mais barato" → processando.html (vídeo)
 */
(() => {
  "use strict";

  const form = document.getElementById("personal-form");
  const fullname = document.getElementById("fullname");
  const cpf = document.getElementById("cpf");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");
  const birthdate = document.getElementById("birthdate");
  const errorBox = document.getElementById("personal-error");
  const toastEl = document.getElementById("toast");
  const couponModal = document.getElementById("coupon-modal");
  const btnCouponApply = document.getElementById("btn-coupon-apply");

  let toastTimer = null;
  let couponShown = false;
  let allowLeave = false;

  function showToast(message) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.remove("hidden", "toast--show");
    void toastEl.offsetWidth;
    toastEl.classList.add("toast--show");
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("toast--show");
      setTimeout(() => toastEl.classList.add("hidden"), 220);
    }, 2600);
  }

  function showInlineError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
  }

  function clearInlineError() {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
  }

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function maskCPF(input) {
    let v = onlyDigits(input.value).slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    input.value = v;
  }

  function maskPhone(input) {
    let v = onlyDigits(input.value).slice(0, 11);
    if (v.length > 10) {
      v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
    } else if (v.length > 6) {
      v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else if (v.length > 2) {
      v = v.replace(/(\d{2})(\d{0,5})/, "($1) $2");
    } else {
      v = v.replace(/(\d{0,2})/, "($1");
    }
    input.value = v.trim().replace(/\($/, "");
  }

  function maskDate(input) {
    let v = onlyDigits(input.value).slice(0, 8);
    if (v.length > 4) v = v.replace(/(\d{2})(\d{2})(\d{0,4})/, "$1/$2/$3");
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,2})/, "$1/$2");
    input.value = v;
  }

  function validateCPF(cpfStr) {
    const digits = onlyDigits(cpfStr);
    if (digits.length !== 11) return false;
    if (/^(\d)\1+$/.test(digits)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== Number(digits[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    return rest === Number(digits[10]);
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || "").trim());
  }

  function isValidPhone(value) {
    const d = onlyDigits(value);
    return d.length === 10 || d.length === 11;
  }

  function isValidDate(value) {
    const m = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return false;
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;
    if (year < 1920 || year > new Date().getFullYear() - 16) return false;
    const dt = new Date(year, month - 1, day);
    return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
  }

  function goToVideo(withCoupon) {
    allowLeave = true;
    try {
      if (withCoupon) {
        const existing = sessionStorage.getItem("estudo_coupon");
        if (!existing) {
          sessionStorage.setItem(
            "estudo_coupon",
            JSON.stringify({ code: "FRETE5", amountOff: 5, appliedAt: Date.now() })
          );
        }
      }
    } catch {
      /* ignore */
    }
    window.location.href = "processando.html";
  }

  function showCouponModal() {
    if (!couponModal) return;
    couponShown = true;
    couponModal.classList.remove("hidden");
    couponModal.classList.remove("coupon-anim-in");
    void couponModal.offsetWidth;
    couponModal.classList.add("coupon-anim-in");
    document.body.classList.add("modal-open");
    history.pushState({ estudoGuard: true }, "", location.href);
  }

  function hideCouponModal() {
    if (!couponModal) return;
    couponModal.classList.add("hidden");
    couponModal.classList.remove("coupon-anim-in");
    document.body.classList.remove("modal-open");
  }

  /** Ao tentar sair/voltar (= recusar), mostra a promoção */
  function setupRefuseGuard() {
    history.pushState({ estudoGuard: true }, "", location.href);

    window.addEventListener("popstate", () => {
      if (allowLeave) return;

      history.pushState({ estudoGuard: true }, "", location.href);

      if (!couponShown) {
        showCouponModal();
        showToast("Oferta especial liberada para você");
        return;
      }

      // Segunda recusa: reforça a oferta (R$ 10)
      const title = document.getElementById("coupon-title");
      const message = document.getElementById("coupon-message");
      const subtitle = document.getElementById("coupon-subtitle");
      const badge = document.getElementById("coupon-badge");
      if (badge) badge.textContent = "ULTIMA CHANCE";
      if (title) title.textContent = "Tem certeza que nao quer R$ 10,00 de desconto?";
      if (message) {
        message.textContent =
          "Aplicamos mais R$ 5,00 e seu desconto total no frete agora e de R$ 10,00.";
      }
      if (subtitle) subtitle.textContent = "Cupom de R$ 10 valido apenas nesta sessao";
      if (btnCouponApply) btnCouponApply.textContent = "Usar cupom de R$ 10 agora";
      try {
        sessionStorage.setItem(
          "estudo_coupon",
          JSON.stringify({ code: "FRETE10", amountOff: 10, appliedAt: Date.now() })
        );
      } catch {
        /* ignore */
      }
      showCouponModal();
    });
  }

  function init() {
    // Formulário sempre começa vazio (sem dados salvos)
    cpf?.addEventListener("input", () => maskCPF(cpf));
    phone?.addEventListener("input", () => maskPhone(phone));
    birthdate?.addEventListener("input", () => maskDate(birthdate));

    btnCouponApply?.addEventListener("click", () => {
      hideCouponModal();
      showToast("Cupom aplicado! Indo para o vídeo...");
      setTimeout(() => goToVideo(true), 350);
    });

    setupRefuseGuard();

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      clearInlineError();

      const nameValue = fullname?.value.trim() || "";
      const cpfValue = cpf?.value.trim() || "";
      const emailValue = email?.value.trim() || "";
      const phoneValue = phone?.value.trim() || "";
      const birthValue = birthdate?.value.trim() || "";

      if (nameValue.length < 3) {
        showInlineError("Por favor, digite seu nome completo.");
        return;
      }
      if (!isValidDate(birthValue)) {
        showInlineError("Digite uma data válida (DD/MM/AAAA).");
        return;
      }
      if (!validateCPF(cpfValue)) {
        showInlineError("CPF inválido. Verifique os números digitados.");
        return;
      }
      if (!isValidEmail(emailValue)) {
        showInlineError("Digite um e-mail válido.");
        return;
      }
      if (!isValidPhone(phoneValue)) {
        showInlineError("Digite um telefone válido com DDD.");
        return;
      }

      const firstName = nameValue.split(/\s+/)[0];
      try {
        localStorage.setItem(
          "estudo_personal",
          JSON.stringify({
            name: nameValue,
            cpf: cpfValue,
            email: emailValue,
            phone: phoneValue,
            birth: birthValue,
          })
        );
        localStorage.setItem("estudo_lead_name", firstName);
      } catch {
        /* ignore */
      }

      showToast("Dados salvos. Continuando...");
      setTimeout(() => {
        allowLeave = true;
        window.location.href = "endereco.html";
      }, 450);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
