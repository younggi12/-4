// ── 설정 ──────────────────────────────────
const DATA_FILE = "data/base.json";
const STORE = { lat: 37.3219, lng: 126.8309 };

const CATEGORIES = {
  new:     { label: "NEW",     title: "신상품", badge: "new" },
  youth:   { label: "YOUTH",   title: "유소년", badge: "유소년" },
  ranking: { label: "RANKING", title: "랭킹",   badge: "순위" },
  brand:   { label: "BRAND",   title: "브랜드", badge: "브랜드" },
};

const WEATHER_TEXT = {
  0:"맑음", 1:"대체로 맑음", 2:"구름 조금", 3:"흐림",
  45:"안개", 51:"약한 이슬비", 63:"비", 73:"눈", 95:"천둥번개",
};

const $ = (sel) => document.querySelector(sel);
const price = (n) => `${Number(n).toLocaleString("ko-KR")}원`;

let products = [], cart = [], currentCat = "new";

// ── 날짜·시간 ──────────────────────────────
function tickClock() {
  $("#datetime").textContent = new Date().toLocaleString("ko-KR", {
    year:"numeric", month:"long", day:"numeric",
    weekday:"long", hour:"2-digit", minute:"2-digit", second:"2-digit",
  });
}

// ── 날씨 ──────────────────────────────────
async function loadWeather(lat = STORE.lat, lng = STORE.lng) {
  try {
    const url = "https://api.open-meteo.com/v1/forecast"
      + "?latitude=" + lat
      + "&longitude=" + lng
      + "&current=temperature_2m,weather_code,wind_speed_10m"
      + "&timezone=Asia%2FSeoul";
    const res = await fetch(url);
    const { current: c } = await res.json();
    $("#weatherBox").textContent =
      `${WEATHER_TEXT[c.weather_code] ?? "날씨 정보"} · ${Math.round(c.temperature_2m)}°C · 바람 ${Math.round(c.wind_speed_10m)}km/h`;
  } catch {
    $("#weatherBox").textContent = "현재 날씨를 불러오지 못했습니다.";
  }
}

function initWeather() {
  loadWeather();
  navigator.geolocation?.getCurrentPosition(
    ({ coords }) => loadWeather(coords.latitude, coords.longitude),
    () => {},
  );
}

// ── 상품 ──────────────────────────────────
async function loadProducts() {
  const res = await fetch(DATA_FILE);
  products = await res.json();
  renderProducts(currentCat);
}

function renderProducts(cat) {
  currentCat = cat;
  const info = CATEGORIES[cat];
  const list = products
    .filter((p) => p.tags.includes(cat))
    .sort((a, b) => cat === "ranking" ? a.rank - b.rank : a.id - b.id);

  $("#categoryLabel").textContent = info.label;
  $("#categoryTitle").textContent = info.title;
  $("#productList").innerHTML = list.map((p) => `
    <article class="product-card">
      <img src="${p.image}" alt="${p.name}" />
      <div class="product-body">
        <div class="badge-row">
          ${cat === "ranking"
            ? `<span class="badge rank-badge">${p.rank}위</span>`
            : `<span class="badge">${info.badge}</span>`}
        </div>
        <h3>${p.name}</h3>
        <p class="brand">${p.brand}</p>
        <div class="option-group">
          ${p.options.map((o) => `
            <label><span>${o.name}</span>
              <select>${o.values.map((v) => `<option>${v}</option>`).join("")}</select>
            </label>`).join("")}
        </div>
        <p class="price">${price(p.price)}</p>
        <button class="cart-button" data-id="${p.id}">장바구니 담기</button>
      </div>
    </article>`).join("");
}

// ── 장바구니 ──────────────────────────────
function addToCart(id, card) {
  const p = products.find((x) => x.id === id);
  const opts = [...card.querySelectorAll(".option-group label")].map(
    (l) => `${l.querySelector("span").textContent}: ${l.querySelector("select").value}`
  );
  cart.push({ cartId: Date.now(), name: p.name, price: p.price, image: p.image, opts });
  renderCart();
}

function renderCart() {
  $("#cartTotal").textContent = price(cart.reduce((s, i) => s + i.price, 0));
  $("#cartList").innerHTML = cart.length
    ? cart.map((i) => `
        <article class="cart-item">
          <img src="${i.image}" alt="${i.name}" />
          <div><h3>${i.name}</h3><p>${i.opts.join(" · ")}</p><strong>${price(i.price)}</strong></div>
          <button data-cid="${i.cartId}">삭제</button>
        </article>`).join("")
    : `<p class="empty-cart">장바구니가 비어 있습니다.</p>`;
}

// ── 이벤트 ────────────────────────────────
function bindEvents() {
  $(".category-nav").addEventListener("click", ({ target }) => {
    const btn = target.closest(".nav-button");
    if (!btn) return;
    document.querySelectorAll(".nav-button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderProducts(btn.dataset.category);
  });

  $("#productList").addEventListener("click", ({ target }) => {
    const btn = target.closest(".cart-button");
    if (btn) addToCart(Number(btn.dataset.id), btn.closest(".product-card"));
  });

  $("#cartList").addEventListener("click", ({ target }) => {
    const btn = target.closest("[data-cid]");
    if (btn) { cart = cart.filter((i) => i.cartId !== Number(btn.dataset.cid)); renderCart(); }
  });
}

// ── 지도 ──────────────────────────────────
function initMap() {
  if (window.kakao?.maps) {
    const pos = new kakao.maps.LatLng(STORE.lat, STORE.lng);
    const map = new kakao.maps.Map($("#map"), { center: pos, level: 3 });
    new kakao.maps.Marker({ position: pos }).setMap(map);
  } else {
    $("#map").innerHTML = `<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=126.8279%2C37.3199%2C126.8339%2C37.3239&layer=mapnik&marker=37.3219%2C126.8309" style="width:100%;height:100%;border:0;"></iframe>`;
  }
}

// ── 초기화 ────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  tickClock();
  setInterval(tickClock, 1000);
  bindEvents();
  initWeather();
  loadProducts();
  initMap();
});