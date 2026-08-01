/**
 * Feed ao vivo — poucas notificações, estoque sincronizado com o CEP
 */
(() => {
  "use strict";

  const STOCK_KEY = "estudo_bag_stock";
  const STOCK_CITY_KEY = "estudo_bag_stock_city";

  const NAMES = [
    { name: "Carlos", img: "https://randomuser.me/api/portraits/men/11.jpg" },
    { name: "João", img: "https://randomuser.me/api/portraits/men/12.jpg" },
    { name: "Pedro", img: "https://randomuser.me/api/portraits/men/13.jpg" },
    { name: "Lucas", img: "https://randomuser.me/api/portraits/men/14.jpg" },
    { name: "Rafael", img: "https://randomuser.me/api/portraits/men/15.jpg" },
    { name: "Bruno", img: "https://randomuser.me/api/portraits/men/16.jpg" },
    { name: "Gustavo", img: "https://randomuser.me/api/portraits/men/17.jpg" },
    { name: "Felipe", img: "https://randomuser.me/api/portraits/men/18.jpg" },
    { name: "Matheus", img: "https://randomuser.me/api/portraits/men/19.jpg" },
    { name: "Thiago", img: "https://randomuser.me/api/portraits/men/20.jpg" },
    { name: "Daniel", img: "https://randomuser.me/api/portraits/men/21.jpg" },
    { name: "Guilherme", img: "https://randomuser.me/api/portraits/men/22.jpg" },
    { name: "Fábio", img: "https://randomuser.me/api/portraits/men/23.jpg" },
    { name: "André", img: "https://randomuser.me/api/portraits/men/24.jpg" },
    { name: "Henrique", img: "https://randomuser.me/api/portraits/men/25.jpg" },
    { name: "João Pedro", img: "https://randomuser.me/api/portraits/men/26.jpg" },
    { name: "Luiz", img: "https://randomuser.me/api/portraits/men/27.jpg" },
    { name: "Carlos Eduardo", img: "https://randomuser.me/api/portraits/men/28.jpg" },
    { name: "Bruno Henrique", img: "https://randomuser.me/api/portraits/men/29.jpg" },
    { name: "Rafael Augusto", img: "https://randomuser.me/api/portraits/men/30.jpg" },
  ];

  let namePool = [];

  const ITEMS = ["Bag do iFood", "Baú do iFood", "Kit Entregador"];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pickName() {
    if (!namePool.length) {
      namePool = NAMES.slice();
      for (let i = namePool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [namePool[i], namePool[j]] = [namePool[j], namePool[i]];
      }
    }
    return namePool.pop();
  }

  function getStock() {
    try {
      const n = Number(sessionStorage.getItem(STOCK_KEY));
      if (Number.isFinite(n) && n >= 1) return Math.min(3, Math.floor(n));
    } catch {
      /* ignore */
    }
    return 3;
  }

  function setStock(n) {
    const value = Math.max(1, Math.min(3, Math.floor(Number(n) || 3)));
    try {
      sessionStorage.setItem(STOCK_KEY, String(value));
    } catch {
      /* ignore */
    }
    return value;
  }

  function getCity() {
    try {
      return sessionStorage.getItem(STOCK_CITY_KEY) || "sua região";
    } catch {
      return "sua região";
    }
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

  function getInitial(name) {
    return String(name || "").trim().charAt(0).toUpperCase() || "?";
  }

  function buildPurchaseMessage() {
    const person = pickName();
    const item = pick(ITEMS);
    const mins = 1 + Math.floor(Math.random() * 6);
    const city = getCity();

    // Cada "compra" ao vivo baixa 1 do estoque compartilhado (mínimo 1)
    let left = getStock();
    if (left > 1 && Math.random() < 0.55) {
      left = setStock(left - 1);
    }

    const useImage = Math.random() > 0.25;
    return {
      type: "buy",
      title: `${person.name} acabou de resgatar`,
      text: `${item} • ${city} • há ${mins} min`,
      avatar: useImage ? person.img : null,
      initial: useImage ? null : getInitial(person.name),
      left,
    };
  }

  function buildStockMessage() {
    const left = getStock();
    const city = getCity();
    return {
      type: "stock",
      title: left === 1 ? "Última bag nesta região!" : "Estoque quase no fim",
      text:
        left === 1
          ? `Resta apenas 1 bag em ${city}. Garanta a sua agora.`
          : `Restam apenas ${left} bags em ${city}. Garanta a sua agora.`,
      avatar: null,
    };
  }

  function createCard(payload) {
    const card = document.createElement("article");
    card.className = `live-feed-card live-feed-card--${payload.type}`;

    const media = payload.avatar
      ? `<img class="live-feed-avatar" src="${payload.avatar}" alt="" width="40" height="40">`
      : `<span class="live-feed-avatar live-feed-avatar--initial" aria-hidden="true">${payload.initial || "A"}</span>`;

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
    // No máximo 2 cards visíveis
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

  function startLiveFeed() {
    const page = document.body?.getAttribute("data-page");
    if (page !== "checkout" && page !== "pix") return;

    // Garante estoque inicial (mesmo do CEP) se ainda não existir
    if (!sessionStorage.getItem(STOCK_KEY)) setStock(3);

    const host = ensureHost();

    // Menos frequente: 1 notificação por vez, intervalo maior
    const schedule = () => {
      const payload = Math.random() < 0.7
        ? buildPurchaseMessage()
        : buildStockMessage();
      pushNotification(host, payload);

      const next = 9000 + Math.random() * 7000; // ~9s a 16s
      setTimeout(schedule, next);
    };

    // Primeira só depois de alguns segundos
    setTimeout(schedule, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startLiveFeed);
  } else {
    startLiveFeed();
  }
})();
