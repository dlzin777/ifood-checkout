/**
 * TikTok Pixel — PageView em todas as páginas + eventos por etapa do funil.
 */
(() => {
  "use strict";

  const pixelId = String(window.TIKTOK_PIXEL_CONFIG?.PIXEL_ID || "").trim();
  if (!pixelId) return;

  if (!window.ttq) {
    (function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      var ttq = (w[t] = w[t] || []);
      ttq.methods = [
        "page",
        "track",
        "identify",
        "instances",
        "debug",
        "on",
        "off",
        "once",
        "ready",
        "alias",
        "group",
        "enableCookie",
        "disableCookie",
        "holdConsent",
        "revokeConsent",
        "grantConsent",
      ];
      ttq.setAndDefer = function (obj, method) {
        obj[method] = function () {
          obj.push([method].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (var i = 0; i < ttq.methods.length; i++) {
        ttq.setAndDefer(ttq, ttq.methods[i]);
      }
      ttq.instance = function (id) {
        var inst = ttq._i[id] || [];
        for (var n = 0; n < ttq.methods.length; n++) {
          ttq.setAndDefer(inst, ttq.methods[n]);
        }
        return inst;
      };
      ttq.load = function (e, n) {
        var r = "https://analytics.tiktok.com/i18n/pixel/events.js";
        var o = n && n.partner;
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = r;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        n = document.createElement("script");
        n.type = "text/javascript";
        n.async = true;
        n.src = r + "?sdkid=" + e + "&lib=" + t;
        e = document.getElementsByTagName("script")[0];
        e.parentNode.insertBefore(n, e);
      };
    })(window, document, "ttq");
  }

  window.ttq.load(pixelId);
  window.ttq.page();

  function withContentParams(params) {
    const payload = { ...(params || {}) };
    const value = payload.value;
    payload.content_id = payload.content_id || "bag-ifood";
    payload.content_type = payload.content_type || "product";
    payload.content_name = payload.content_name || "Bag iFood";
    payload.contents = payload.contents || [
      {
        content_id: payload.content_id,
        content_type: payload.content_type,
        content_name: payload.content_name,
        quantity: 1,
        price: value != null ? Number(value) : undefined,
      },
    ];
    return payload;
  }

  function track(event, params) {
    if (!window.ttq || typeof window.ttq.track !== "function") return;
    window.ttq.track(event, withContentParams(params));
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
    // CompletePayment = compra (TikTok); Purchase também ajuda no otimizador
    track("CompletePayment", params);
    track("Purchase", params);
  }

  window.TikTokPixel = { track, getCheckoutTotal };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runPageEvents);
  } else {
    runPageEvents();
  }
})();
