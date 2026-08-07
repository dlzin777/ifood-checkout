/**
 * Meta Pixel — PageView em todas as páginas + eventos por etapa do funil.
 */
(() => {
  "use strict";

  const pixelId = String(window.META_PIXEL_CONFIG?.PIXEL_ID || "").trim();
  if (!pixelId) return;

  if (!window.fbq) {
    const n = (window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!window._fbq) window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const first = document.getElementsByTagName("script")[0];
    first.parentNode.insertBefore(script, first);
  }

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");

  function track(event, params) {
    if (typeof window.fbq !== "function") return;
    window.fbq("track", event, params || {});
  }

  function getCheckoutTotal() {
    try {
      const checkout = JSON.parse(localStorage.getItem("estudo_checkout") || "null");
      const bump = JSON.parse(localStorage.getItem("estudo_bump") || "null");
      if (!checkout) return null;

      const shipping = Number(checkout.shippingPrice || 0);
      const extra = Number(checkout.rewardExtra || 0);
      const bumpAmount = bump?.selected ? Number(bump.price || 0) : 0;
      return shipping + extra + bumpAmount;
    } catch {
      return null;
    }
  }

  function runPageEvents() {
    const page = document.body?.dataset?.page;
    if (page !== "obrigado") return;

    const value = getCheckoutTotal();
    const params = { currency: "BRL" };
    if (value != null) params.value = value;
    track("Purchase", params);
  }

  window.MetaPixel = { track, getCheckoutTotal };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runPageEvents);
  } else {
    runPageEvents();
  }
})();
