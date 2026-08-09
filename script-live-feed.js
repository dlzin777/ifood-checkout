/**
 * Feed ao vivo — fotos reais; no PIX prova social focada em "pagou o frete"
 */
(() => {
  "use strict";

  const STOCK_KEY = "estudo_bag_stock";
  const STOCK_CITY_KEY = "estudo_bag_stock_city";

  const PEOPLE = [
    { name: "Marcos Silva", img: "assets/feed-1.png" },
    { name: "Ricardo Mendes", img: "assets/feed-2.png" },
    { name: "Eduardo Costa", img: "assets/feed-3.png" },
    { name: "Paulo Henrique", img: "assets/feed-4.png" },
    { name: "Gabriel Almeida", img: "assets/feed-5.png" },
    { name: "José Carlos", img: "assets/feed-6.png" },
    { name: "André Souza", img: "assets/feed-7.png" },
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
  let payingNow = 14 + Math.floor(Math.random() * 10);
  let paidToday = 160 + Math.floor(Math.random() * 50);

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

  function pickPerson() {
    if (!peoplePool.length) return null;
    return peoplePool.pop();
  }

  function getStock() {
    try {
      const n = Number(sessionStorage.getItem(STOCK_KEY));
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

  function shortTime(mins) {
    if (mins < 1) return "agora mesmo";
    return mins === 1 ? "há 1 min" : `há ${mins} min`;
  }

  function buildPurchaseMessage(isPixPage) {
    const person = pickPerson();
    if (!person) return null;

    const item = pick(ITEMS);
    const mins = isPixPage ? Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 6);
    const city = getCity();
    const timeLabel = shortTime(mins);

    let left = getStock();
    if (left > 3 && Math.random() < 0.55) {
      left = setStock(left - 1);
    }

    if (isPixPage) {
      return {
        type: "paid",
        title: `${person.name} acabou de pagar o frete`,
        text: `${item} · ${city} · ${timeLabel}`,
        avatar: person.img,
        left,
        person,
        item,
        city,
        timeLabel,
      };
    }

    return {
      type: "buy",
      title: `${person.name} acabou de resgatar`,
      text: `${item} • ${city} • ${timeLabel}`,
      avatar: person.img,
      left,
      person,
      item,
      city,
      timeLabel,
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

    const initial = String(payload.person?.name || payload.title || "?")
      .trim()
      .charAt(0)
      .toUpperCase();
    const media = payload.avatar
      ? `<img class="live-feed-avatar" src="${payload.avatar}" alt="" width="40" height="40" onerror="this.style.display='none';this.nextElementSibling&&(this.nextElementSibling.hidden=false)"><span class="live-feed-avatar live-feed-avatar--initial" hidden aria-hidden="true">${initial}</span>`
      : `<span class="live-feed-avatar live-feed-avatar--initial" aria-hidden="true">${initial || "!"}</span>`;

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
    }, payload.type === "paid" ? 6200 : 5000);
  }

  function updateCounters() {
    const payingEl = document.getElementById("pix-paying-now");
    const paidEl = document.getElementById("pix-paid-today");
    payingNow = Math.max(10, Math.min(28, payingNow + (Math.random() < 0.55 ? 1 : -1)));
    if (Math.random() < 0.7) paidToday += 1;
    if (payingEl) payingEl.textContent = String(payingNow);
    if (paidEl) paidEl.textContent = String(paidToday);
  }

  function prependRecentPay(list, payload) {
    if (!list || !payload?.person) return;
    const li = document.createElement("li");
    li.className = "pix-recent-pay";
    const initial = String(payload.person.name || "?")
      .trim()
      .charAt(0)
      .toUpperCase();
    li.innerHTML = `
      <img src="${payload.person.img}" alt="" width="36" height="36" onerror="this.style.display='none';this.nextElementSibling&&(this.nextElementSibling.hidden=false)">
      <span class="pix-recent-pay__fallback" hidden aria-hidden="true">${initial}</span>
      <div class="pix-recent-pay__copy">
        <strong>${payload.person.name} pagou o frete</strong>
        <span>${payload.item} · ${payload.city} · ${payload.timeLabel}</span>
      </div>
      <em class="pix-recent-pay__ok">PIX OK</em>
    `;
    list.prepend(li);
    list.querySelectorAll(".pix-recent-pay").forEach((item, i) => {
      if (i >= 4) item.remove();
    });
    requestAnimationFrame(() => li.classList.add("is-in"));
  }

  function seedRecentPays(list) {
    if (!list) return;
    for (let i = 0; i < 3; i++) {
      const payload = buildPurchaseMessage(true);
      if (!payload) break;
      payload.timeLabel = shortTime(1 + i * 2);
      prependRecentPay(list, payload);
    }
  }

  function startLiveFeed() {
    const page = document.body?.getAttribute("data-page");
    if (page !== "checkout" && page !== "pix") return;

    const isPixPage = page === "pix";
    if (!sessionStorage.getItem(STOCK_KEY)) setStock(6);

    const host = ensureHost();
    const recentList = document.getElementById("pix-recent-pays");

    if (isPixPage) {
      updateCounters();
      seedRecentPays(recentList);
      setInterval(updateCounters, 8000);
    }

    const schedule = () => {
      let payload;
      if (isPixPage) {
        payload = peoplePool.length
          ? buildPurchaseMessage(true) || buildStockMessage()
          : buildStockMessage();
        if (payload.type === "paid") {
          prependRecentPay(recentList, payload);
          updateCounters();
        }
      } else {
        payload = peoplePool.length
          ? buildPurchaseMessage(false) || buildStockMessage()
          : buildStockMessage();
      }

      pushNotification(host, payload);

      const next = isPixPage
        ? 3500 + Math.random() * 3000
        : 9000 + Math.random() * 7000;
      setTimeout(schedule, next);
    };

    setTimeout(schedule, isPixPage ? 800 : 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startLiveFeed);
  } else {
    startLiveFeed();
  }
})();
