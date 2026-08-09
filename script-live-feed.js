/**
 * Feed ao vivo — fotos reais, nome e foto nunca se repetem na sessão
 */
(() => {
  "use strict";

  const STOCK_KEY = "estudo_bag_stock";
  const STOCK_CITY_KEY = "estudo_bag_stock_city";

  // Cada entrada = 1 nome + 1 foto (únicos)
  const PEOPLE = [
    { name: "Marcos Silva", img: "/assets/feed-1.png" },
    { name: "Ricardo Mendes", img: "/assets/feed-2.png" },
    { name: "Eduardo Costa", img: "/assets/feed-3.png" },
    { name: "Paulo Henrique", img: "/assets/feed-4.png" },
    { name: "Gabriel Almeida", img: "/assets/feed-5.png" },
    { name: "José Carlos", img: "/assets/feed-6.png" },
    { name: "André Souza", img: "/assets/feed-7.png" },
  ];

  const FALLBACK_CITIES = [
    "São Paulo - SP",
    "Guarulhos - SP",
    "Rio de Janeiro - RJ",
    "Belo Horizonte - MG",
    "Curitiba - PR",
    "Campinas - SP",
    "Salvador - BA",
    "Fortaleza - CE",
  ];

  const ITEMS = ["Bag do iFood", "Baú do iFood", "Kit Entregador"];

  let peoplePool = shuffle(PEOPLE);

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /** Nome + foto únicos — nunca reutiliza na mesma sessão */
  function pickPerson() {
    if (!peoplePool.length) return null;
    return peoplePool.pop();
  }

  function getStock() {
    try {
      const n = Number(sessionStorage.getItem(STOCK_KEY));
      // Mínimo 3 / máximo 6 — evita pressão de "última 1 bag"
      if (Number.isFinite(n) && n >= 1) return Math.min(6, Math.max(3, Math.floor(n)));
    } catch {
      /* ignore */
    }
    return 6;
  }

  function setStock(n) {
    const value = Math.max(3, Math.min(6, Math.floor(Number(n) || 6)));
    try {
      sessionStorage.setItem(STOCK_KEY, String(value));
    } catch {
      /* ignore */
    }
    return value;
  }

  function getCity() {
    try {
      const stored = sessionStorage.getItem(STOCK_CITY_KEY);
      if (stored && stored !== "sua região") return stored;
    } catch {
      /* ignore */
    }
    return pick(FALLBACK_CITIES);
  }

  function ensureHost() {
    let host = document.getElementById("live-feed");
    if (host) return host;
    host = document.createElement("div");
    host.id = "live-feed";
    host.className = "live-feed";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
    return host;
  }

  function buildPurchaseMessage() {
    const person = pickPerson();
    if (!person) return null;

    const item = pick(ITEMS);
    const mins = 1 + Math.floor(Math.random() * 6);
    const city = getCity();

    let left = getStock();
    if (left > 3 && Math.random() < 0.55) {
      left = setStock(left - 1);
    }

    return {
      type: "buy",
      title: `${person.name} acabou de resgatar`,
      text: `${item} • ${city} • há ${mins} min`,
      avatar: person.img,
      left,
    };
  }

  function buildStockMessage() {
    const left = getStock();
    const city = getCity();
    return {
      type: "stock",
      title: "Poucas bags nesta região",
      text: `Restam ${left} bags em ${city}. Garanta a sua agora.`,
      avatar: null,
    };
  }

  function createCard(payload) {
    const card = document.createElement("article");
    card.className = `live-feed-card live-feed-card--${payload.type}`;

    const media = payload.avatar
      ? `<img class="live-feed-avatar" src="${payload.avatar}" alt="" width="40" height="40">`
      : `<span class="live-feed-avatar live-feed-avatar--initial" aria-hidden="true">!</span>`;

    card.innerHTML = `
      ${media}
      <div class="live-feed-copy">
        <strong>${payload.title}</strong>
        <span>${payload.text}</span>
      </div>
    `;
    return card;
  }

  function pushNotification(host, payload) {
    const existing = host.querySelectorAll(".live-feed-card:not(.is-out)");
    if (existing.length >= 2) {
      const oldest = existing[existing.length - 1];
      oldest.classList.add("is-out");
      setTimeout(() => oldest.remove(), 400);
    }

    const card = createCard(payload);
    host.prepend(card);
    requestAnimationFrame(() => card.classList.add("is-in"));

    setTimeout(() => {
      card.classList.add("is-out");
      setTimeout(() => card.remove(), 400);
    }, 5000);
  }

  function nextPayload() {
    // Prioriza compra com foto real enquanto houver pessoas únicas
    if (peoplePool.length && Math.random() < 0.8) {
      return buildPurchaseMessage() || buildStockMessage();
    }
    return buildStockMessage();
  }

  function startLiveFeed() {
    const page = document.body?.getAttribute("data-page");
    if (page !== "checkout" && page !== "pix") return;

    if (!sessionStorage.getItem(STOCK_KEY)) setStock(6);

    const host = ensureHost();

    const schedule = () => {
      pushNotification(host, nextPayload());
      const next = 9000 + Math.random() * 7000;
      setTimeout(schedule, next);
    };

    setTimeout(schedule, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startLiveFeed);
  } else {
    startLiveFeed();
  }
})();
