/**
 * Rastreamento UTM / UTMify
 * Lê parâmetros da URL no 1º acesso, persiste em localStorage + cookie (30 dias)
 * e expõe getStoredUTM() para enviar no POST /api/v1/transactions.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "bravopay_utm";
  const COOKIE_NAME = "bravopay_utm";
  const COOKIE_MAX_AGE_DAYS = 30;

  const UTM_KEYS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "fbclid",
    "ttclid",
    "gclid",
  ];

  function onlyText(value) {
    return String(value || "").trim();
  }

  /** Lê UTMs e click IDs da query string atual */
  function readParamsFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    let hasAny = false;

    UTM_KEYS.forEach((key) => {
      const value = onlyText(params.get(key));
      if (value) {
        utm[key] = value;
        hasAny = true;
      }
    });

    return hasAny ? utm : null;
  }

  function saveToLocalStorage(utm) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
    } catch {
      /* ignore quota / modo privado */
    }
  }

  function saveToCookie(utm) {
    try {
      const encoded = encodeURIComponent(JSON.stringify(utm));
      const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
      document.cookie = `${COOKIE_NAME}=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax`;
    } catch {
      /* ignore */
    }
  }

  function loadFromLocalStorage() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function loadFromCookie() {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    if (!match) return null;
    try {
      return JSON.parse(decodeURIComponent(match[1]));
    } catch {
      return null;
    }
  }

  function saveUTM(utm) {
    if (!utm) return;
    saveToLocalStorage(utm);
    saveToCookie(utm);
  }

  function loadUTM() {
    return loadFromLocalStorage() || loadFromCookie();
  }

  /**
   * Converte chaves utm_* para o formato esperado pela API BravoPay:
   * { source, medium, campaign, content, term, fbclid, ttclid, gclid }
   */
  function toBravopayPayload(stored) {
    if (!stored) return null;

    const payload = {};
    if (stored.utm_source) payload.source = stored.utm_source;
    if (stored.utm_medium) payload.medium = stored.utm_medium;
    if (stored.utm_campaign) payload.campaign = stored.utm_campaign;
    if (stored.utm_content) payload.content = stored.utm_content;
    if (stored.utm_term) payload.term = stored.utm_term;
    if (stored.fbclid) payload.fbclid = stored.fbclid;
    if (stored.ttclid) payload.ttclid = stored.ttclid;
    if (stored.gclid) payload.gclid = stored.gclid;

    return Object.keys(payload).length > 0 ? payload : null;
  }

  function init() {
    const fromUrl = readParamsFromUrl();
    if (fromUrl) {
      saveUTM(fromUrl);
    }
  }

  window.BravopayUTM = {
    getStoredUTM: loadUTM,
    toBravopayPayload,
  };

  init();
})();
