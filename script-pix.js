/**
 * Tela PIX — integração BravoPay
 * Cria cobrança PIX via backend, exibe QR + copia-e-cola, polling a cada 3s.
 */
(() => {
  "use strict";

  const cfg = window.BRAVOPAY_CONFIG || {};
  const POLL_INTERVAL_MS = cfg.POLL_INTERVAL_MS || 3000;
  const SUCCESS_URL = cfg.SUCCESS_URL || "/obrigado";
  const TOTAL_SECONDS = 10 * 60;

  const pixCodeEl = document.getElementById("pix-code");
  const timerEl = document.getElementById("pix-timer");
  const progressBar = document.getElementById("pix-progress-bar");
  const amountEl = document.getElementById("pix-amount");
  const orderIdEl = document.getElementById("pix-order-id");
  const orderTitleEl = document.getElementById("pix-order-title");
  const orderImageEl = document.getElementById("pix-order-image");
  const statusEl = document.getElementById("pix-status");
  const qrSection = document.getElementById("pix-qr-section");
  const qrCanvas = document.getElementById("pix-qr-canvas");
  const toastEl = document.getElementById("toast");

  let remaining = TOTAL_SECONDS;
  let toastTimer = null;
  let pollIntervalId = null;

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
    toastEl.classList.remove("hidden", "toast--show", "toast--success", "toast--error");
    if (variant === "success") toastEl.classList.add("toast--success");
    if (variant === "error") toastEl.classList.add("toast--error");
    void toastEl.offsetWidth;
    toastEl.classList.add("toast--show");
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("toast--show");
      setTimeout(() => toastEl.classList.add("hidden"), 220);
    }, 3200);
  }

  function formatTime(sec) {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  /** Formata telefone BR para a API: 5511999999999 */
  function formatPhoneBR(phone) {
    let digits = onlyDigits(phone);
    if (digits.startsWith("55") && digits.length >= 12) return digits;
    if (digits.length === 11 || digits.length === 10) return `55${digits}`;
    return digits;
  }

  function setStatusLabel(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function startTimer() {
    remaining = TOTAL_SECONDS;

    if (timerEl) timerEl.textContent = formatTime(remaining);
    if (progressBar) progressBar.style.width = "100%";

    const tick = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = 0;
        clearInterval(tick);
        setStatusLabel("Tempo esgotado");
        showToast("O PIX expirou. Atualize a página para gerar um novo pagamento.", "error");
      }
      if (timerEl) timerEl.textContent = formatTime(remaining);
      if (progressBar) progressBar.style.width = `${(remaining / TOTAL_SECONDS) * 100}%`;
    }, 1000);
  }

  function getCheckoutData() {
    let personal = JSON.parse(localStorage.getItem("estudo_personal") || "null");
    const checkout = JSON.parse(localStorage.getItem("estudo_checkout") || "null");
    const bump = JSON.parse(localStorage.getItem("estudo_bump") || "null");

    if (!checkout || checkout.shippingPrice == null) {
      window.location.href = "checkout.html";
      return null;
    }

    if (!personal?.name || !personal?.email || !personal?.phone || !personal?.cpf) {
      window.location.href = "dados.html";
      return null;
    }

    const shipping = Number(checkout.shippingPrice || 0);
    const extra = Number(checkout.rewardExtra || 0);
    const bumpAmount = bump?.selected ? Number(bump.price || 0) : 0;
    const amount = shipping + extra + bumpAmount;

    const productId = String(
      checkout.productId ||
        localStorage.getItem("bravopay_product_id") ||
        cfg.PRODUCT_ID ||
        ""
    ).trim();

    return {
      personal,
      checkout,
      amount,
      amountCents: Math.round(amount * 100),
      rewardId: checkout.rewardId || localStorage.getItem("estudo_selected_reward") || "bag",
      externalReference: checkout.externalReference || `pedido_${Date.now()}`,
      productId,
      utm: window.BravopayUTM?.toBravopayPayload?.(window.BravopayUTM.getStoredUTM()),
    };
  }

  function saveTransactionCache(data) {
    try {
      localStorage.setItem("bravopay_transaction", JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }

  function formatApiError(response, data, rawText) {
    if (response.status === 404 || response.status === 405) {
      return (
        "Backend não encontrado. Rode npm start e acesse http://localhost:3000 " +
        "(não abra o HTML pelo Live Server ou arquivo local)."
      );
    }

    const bravoMessage =
      data?.details?.message ||
      data?.details?.error ||
      (typeof data?.details === "string" ? data.details : null);

    if (data?.error) {
      return bravoMessage ? `${data.error} (${bravoMessage})` : data.error;
    }

    if (rawText && !rawText.trimStart().startsWith("<")) {
      return rawText.slice(0, 240);
    }

    return "Erro ao criar transação BravoPay.";
  }

  async function createBravoTransaction(payload) {
    let response;
    try {
      response = await fetch("/api/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error(
        "Não foi possível contactar o servidor. Confira se npm start está rodando em http://localhost:3000."
      );
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(formatApiError(response, data, text));
    }

    return data;
  }

  async function fetchTransactionStatus(transactionId) {
    const response = await fetch(`/api/transactions/${encodeURIComponent(transactionId)}`);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(data?.error || text || "Erro ao consultar status.");
    }
    return data;
  }

  /** Gera QR Code a partir de pix.copy_paste usando a lib qrcode (CDN) */
  async function renderQrCode(copyPaste) {
    if (!qrCanvas || !copyPaste) return;

    if (typeof QRCode === "undefined") {
      console.warn("Lib QRCode não carregou (CDN). O copia-e-cola ainda funciona.");
      return false;
    }

    try {
      await QRCode.toCanvas(qrCanvas, copyPaste, {
        width: 220,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      return true;
    } catch (err) {
      console.warn("Falha ao gerar QR:", err);
      return false;
    }
  }

  function renderPixData(orderId, amount, rewardName, copyPaste) {
    if (pixCodeEl) pixCodeEl.value = copyPaste || "";
    if (amountEl) amountEl.textContent = money(amount);
    if (orderIdEl) orderIdEl.textContent = orderId;
    if (orderTitleEl) orderTitleEl.textContent = rewardName;
    void renderQrCode(copyPaste);
  }

  async function copyCode() {
    const pixText = pixCodeEl?.value || "";
    if (!pixText) {
      showToast("Nenhum código PIX disponível.", "error");
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pixText);
      } else {
        pixCodeEl.select();
        document.execCommand("copy");
      }
      showToast("Código PIX copiado! Cole no app do seu banco.", "success");
    } catch {
      showToast("Copie manualmente o código acima.", "error");
    }
  }

  async function pollStatus(transactionId) {
    try {
      const transaction = await fetchTransactionStatus(transactionId);
      const status = String(transaction.status || "PENDING").toUpperCase();

      setStatusLabel(
        status === "PAID"
          ? "Pagamento confirmado"
          : `Aguardando pagamento (${status})`
      );

      saveTransactionCache({
        transaction_id: transaction.id || transactionId,
        status,
        updated_at: Date.now(),
      });

      if (status === "PAID") {
        clearInterval(pollIntervalId);
        showToast("Pagamento confirmado! Redirecionando...", "success");
        setTimeout(() => {
          window.location.href = SUCCESS_URL;
        }, 1500);
        return true;
      }

      if (["EXPIRED", "FAILED", "CANCELED", "REFUNDED"].includes(status)) {
        clearInterval(pollIntervalId);
        showToast(`Pagamento ${status}. Gere um novo PIX.`, "error");
        return true;
      }

      return false;
    } catch (error) {
      console.warn("Polling:", error);
      return false;
    }
  }

  async function createTransaction(checkoutData) {
    const payload = {
      amount_cents: checkoutData.amountCents,
      method: "pix",
      customer: {
        name: checkoutData.personal.name,
        email: checkoutData.personal.email,
        phone: formatPhoneBR(checkoutData.personal.phone),
        cpf: onlyDigits(checkoutData.personal.cpf),
      },
      external_reference: checkoutData.externalReference,
    };

    // product_id: obrigatório para UTMify atribuir corretamente
    if (checkoutData.productId) {
      payload.product_id = checkoutData.productId;
    }

    // UTMs sempre enviados quando disponíveis (atribuição UTMify)
    if (checkoutData.utm) {
      payload.utm = checkoutData.utm;
    }

    const transaction = await createBravoTransaction(payload);

    const cache = {
      transaction_id: transaction.id,
      external_reference: checkoutData.externalReference,
      status: transaction.status,
      amount_cents: transaction.amount_cents,
      pix: transaction.pix,
      created_at: transaction.created_at,
    };
    saveTransactionCache(cache);
    return { transaction, cache };
  }

  async function init() {
    const checkoutData = getCheckoutData();
    if (!checkoutData) return;

    const rewardNames = {
      bag: "Bag do iFood",
      bau: "Baú do iFood",
      kit_entregador: "Kit Entregador iFood",
    };
    const rewardName = rewardNames[checkoutData.rewardId] || "Item iFood";

    if (orderTitleEl) orderTitleEl.textContent = rewardName;
    if (orderImageEl) {
      orderImageEl.src = "https://resgate-sua-bag.netlify.app/assets/bagfoto.webp";
      orderImageEl.alt = rewardName;
    }
    if (amountEl) amountEl.textContent = money(checkoutData.amount);

    document.getElementById("btn-copy-pix")?.addEventListener("click", copyCode);
    document.getElementById("btn-copy-pix-icon")?.addEventListener("click", copyCode);
    document.getElementById("btn-show-pix-qr")?.addEventListener("click", () => {
      if (!qrSection) return;
      const hidden = qrSection.classList.contains("hidden");
      qrSection.classList.toggle("hidden", !hidden);
      qrSection.setAttribute("aria-hidden", String(!hidden));
      // Re-render ao abrir: cobre falha inicial da lib ou canvas ainda oculto
      if (hidden && pixCodeEl?.value) {
        void renderQrCode(pixCodeEl.value);
      }
    });

    try {
      setStatusLabel("Criando cobrança PIX...");
      const { transaction } = await createTransaction(checkoutData);

      if (!transaction?.pix?.copy_paste) {
        throw new Error("A BravoPay não retornou o código PIX (copy_paste).");
      }

      renderPixData(
        checkoutData.externalReference,
        checkoutData.amount,
        rewardName,
        transaction.pix.copy_paste
      );

      setStatusLabel("Aguardando pagamento");
      showToast("PIX gerado. Copie o código ou escaneie o QR.", "success");

      startTimer();

      if (pollIntervalId) clearInterval(pollIntervalId);
      pollIntervalId = setInterval(() => pollStatus(transaction.id), POLL_INTERVAL_MS);
      await pollStatus(transaction.id);
    } catch (error) {
      setStatusLabel("Erro ao gerar PIX");
      showToast(error.message || "Falha ao criar pagamento.", "error");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
