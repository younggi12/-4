// ── 설정 ──────────────────────────────────
const DATA_FILE = "data/base.json";
const STORE = { lat: 37.3219, lng: 126.8309 };
const CART_KEY = "blueline_cart";

const CATEGORIES = {
  new:     { label: "NEW",     title: "신상품", badge: "new" },
  youth:   { label: "YOUTH",   title: "유소년", badge: "유소년" },
  ranking: { label: "RANKING", title: "랭킹",   badge: "순위" },
  brand:   { label: "BRAND",   title: "브랜드", badge: "브랜드" },
};

const $ = (sel) => document.querySelector(sel);
const price = (n) => `${Number(n).toLocaleString("ko-KR")}원`;

let products = [], currentCat = "new";

// ── 장바구니 저장(localStorage) ──────────────
function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function updateCartBadge() {
  const badge = $("#cartCount");
  if (badge) badge.textContent = getCart().length;
}

function pulseCartBadge() {
  const badge = $("#cartCount");
  if (!badge) return;
  badge.classList.remove("is-pulsing");
  void badge.offsetWidth;
  badge.classList.add("is-pulsing");
}

// ── 상품 (shop.html) ──────────────────────
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
  const countEl = $("#categoryCount");
  if (countEl) countEl.textContent = `총 ${list.length}개`;
  $("#productList").innerHTML = list.map((p) => `
    <article class="product-card">
      <a href="product.html?id=${p.id}" class="product-media">
        <img src="${p.image}" alt="${p.name}" />
        <div class="badge-row">
          ${cat === "ranking"
            ? `<span class="badge rank-badge">${p.rank}위</span>`
            : `<span class="badge">${info.badge}</span>`}
        </div>
      </a>
      <div class="product-body">
        <a href="product.html?id=${p.id}" class="product-title-link"><h3>${p.name}</h3></a>
        <p class="brand">${p.brand}</p>
        <div class="option-group">
          ${p.options.map((o) => `
            <div class="option-row">
              <span class="option-label">${o.name}</span>
              <div class="option-chips">
                ${o.values.map((v, vi) => `<button type="button" class="option-chip${vi === 0 ? " is-selected" : ""}" data-value="${v}">${v}</button>`).join("")}
              </div>
            </div>`).join("")}
        </div>
        <p class="price">${price(p.price)}</p>
        <button class="cart-button" data-id="${p.id}">장바구니 담기</button>
      </div>
    </article>`).join("");

  $("#productList").querySelectorAll(".product-card").forEach((card, i) => {
    card.classList.add("card-enter");
    card.style.animationDelay = `${i * 0.06}s`;
  });
}

function addToCart(id, card, qty = 1) {
  const p = products.find((x) => x.id === id);
  const opts = [...card.querySelectorAll(".option-row")].map((row) => {
    const label = row.querySelector(".option-label").textContent;
    const selected = row.querySelector(".option-chip.is-selected");
    return `${label}: ${selected ? selected.dataset.value : ""}`;
  });
  const cart = getCart();
  cart.push({ cartId: Date.now(), name: p.name, price: p.price, image: p.image, opts, qty });
  saveCart(cart);
  updateCartBadge();
}

function initShopPage() {
  const productList = $("#productList");
  if (!productList) return;

  const params = new URLSearchParams(window.location.search);
  const initialCat = params.get("cat");
  if (initialCat && CATEGORIES[initialCat]) {
    currentCat = initialCat;
    document.querySelectorAll(".nav-button").forEach((b) => {
      b.classList.toggle("active", b.dataset.category === initialCat);
    });
  }

  $(".category-nav").addEventListener("click", ({ target }) => {
    const btn = target.closest(".nav-button");
    if (!btn) return;
    document.querySelectorAll(".nav-button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderProducts(btn.dataset.category);
  });

  productList.addEventListener("click", ({ target }) => {
    const chip = target.closest(".option-chip");
    if (chip) {
      chip.closest(".option-chips").querySelectorAll(".option-chip").forEach((c) => c.classList.remove("is-selected"));
      chip.classList.add("is-selected");
      return;
    }
    const btn = target.closest(".cart-button");
    if (btn && !btn.disabled) {
      addToCart(Number(btn.dataset.id), btn.closest(".product-card"));
      pulseCartBadge();

      const original = btn.textContent;
      btn.textContent = "담았어요! ✓";
      btn.classList.add("is-added");
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("is-added");
        btn.disabled = false;
      }, 1100);
    }
  });

  loadProducts();
}

// ── 장바구니 (cart.html) ───────────────────
const SHIPPING_FEE = 3000;
const FREE_SHIPPING_MIN = 20000;

function renderCart() {
  const cart = getCart();
  const subtotal = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const shipping = cart.length === 0 || subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;

  $("#cartSubtotal").textContent = price(subtotal);
  const shippingEl = $("#cartShipping");
  if (shippingEl) {
    if (shipping === 0) {
      shippingEl.textContent = "무료";
      shippingEl.classList.add("is-free");
    } else {
      shippingEl.textContent = price(shipping);
      shippingEl.classList.remove("is-free");
    }
  }
  $("#cartTotal").textContent = price(subtotal + shipping);

  $("#cartList").innerHTML = cart.length
    ? cart.map((i) => `
        <article class="cart-item">
          <img src="${i.image}" alt="${i.name}" />
          <div class="cart-item-info">
            <h3>${i.name}</h3>
            <p>${[...i.opts, i.qty > 1 ? `수량 ${i.qty}개` : null].filter(Boolean).join(" · ")}</p>
            <strong>${price(i.price * (i.qty || 1))}</strong>
          </div>
          <button class="cart-item-remove" data-cid="${i.cartId}" type="button" aria-label="삭제">✕</button>
        </article>`).join("")
    : `<a href="shop.html" class="empty-cart-link">
        <img src="images/icon6.png" alt="장바구니가 비어 있습니다. 쇼핑하러 가기" class="empty-cart-image" />
      </a>`;
}

function initCartPage() {
  const cartList = $("#cartList");
  if (!cartList) return;

  cartList.addEventListener("click", ({ target }) => {
    const btn = target.closest("[data-cid]");
    if (!btn) return;
    const cart = getCart().filter((i) => i.cartId !== Number(btn.dataset.cid));
    saveCart(cart);
    renderCart();
    updateCartBadge();
  });

  const clearCartModal = $("#clearCartModal");

  $("#clearCartBtn")?.addEventListener("click", () => {
    if (getCart().length === 0) return;
    clearCartModal.classList.remove("hidden");
  });

  $("#clearCartCancel")?.addEventListener("click", () => {
    clearCartModal.classList.add("hidden");
  });

  $("#clearCartConfirm")?.addEventListener("click", () => {
    saveCart([]);
    renderCart();
    updateCartBadge();
    clearCartModal.classList.add("hidden");
  });

  const checkoutBtn = $("#checkoutBtn");
  const orderModal = $("#orderModal");

  checkoutBtn?.addEventListener("click", () => {
    const cart = getCart();
    if (cart.length === 0) {
      checkoutBtn.classList.add("shake");
      setTimeout(() => checkoutBtn.classList.remove("shake"), 500);
      return;
    }

    checkoutBtn.classList.remove("is-clicked");
    void checkoutBtn.offsetWidth;
    checkoutBtn.classList.add("is-clicked");

    checkoutBtn.disabled = true;

    setTimeout(() => {
      orderModal.classList.remove("hidden");
      saveCart([]);
      updateCartBadge();
    }, 1200);
  });

  $("#orderModalClose")?.addEventListener("click", () => {
    orderModal.classList.add("hidden");
    checkoutBtn.disabled = false;
    renderCart();
  });

  renderCart();
}

// ── 인트로 화면 (index.html) ───────────────
function initIntro() {
  const intro = $("#introScreen");
  if (!intro) return;

  if (sessionStorage.getItem("blueline_intro_shown")) {
    intro.classList.add("is-hidden");
    return;
  }
  sessionStorage.setItem("blueline_intro_shown", "1");

  document.body.classList.add("intro-active");

  setTimeout(() => {
    intro.classList.add("is-hidden");
    document.body.classList.remove("intro-active");
  }, 1900);
}

// ── 상품 상세 (product.html) ───────────────
async function initProductPage() {
  const container = $("#productDetail");
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("id"));

  const res = await fetch(DATA_FILE);
  const data = await res.json();
  products = data;
  const p = data.find((x) => x.id === id);

  if (!p) {
    container.innerHTML = `<p class="empty-cart">상품을 찾을 수 없습니다.</p>`;
    return;
  }

  $("#productDetailName").textContent = p.name;

  const badgeText = p.tags.includes("ranking") ? `${p.rank}위` : (CATEGORIES[p.tags[0]]?.badge || "");
  const badgeClass = p.tags.includes("ranking") ? "rank-badge" : "";

  container.innerHTML = `
    <div class="product-detail-media">
      ${badgeText ? `<span class="badge ${badgeClass} product-detail-badge">${badgeText}</span>` : ""}
      <img src="${p.image}" alt="${p.name}" />
    </div>
    <div class="product-detail-info">
      <p class="brand">${p.brand}</p>
      <h1>${p.name}</h1>
      <p class="price">${price(p.price)}</p>
      <div class="option-group">
        ${p.options.map((o) => `
          <div class="option-row">
            <span class="option-label">${o.name}</span>
            <div class="option-chips">
              ${o.values.map((v, vi) => `<button type="button" class="option-chip${vi === 0 ? " is-selected" : ""}" data-value="${v}">${v}</button>`).join("")}
            </div>
          </div>`).join("")}
      </div>
      <div class="product-detail-qty">
        <span class="option-label">수량</span>
        <div class="qty-stepper">
          <button type="button" class="qty-btn" data-action="minus">−</button>
          <span id="productQty" class="qty-value">1</span>
          <button type="button" class="qty-btn" data-action="plus">+</button>
        </div>
      </div>
      <button class="cart-button product-detail-cart-btn" data-id="${p.id}" type="button">장바구니 담기</button>
      <div class="product-detail-trust">
        <span><span class="trust-icon">🚚</span>무료배송</span>
        <span><span class="trust-icon">✅</span>정품보장</span>
        <span><span class="trust-icon">⚡</span>당일발송</span>
      </div>
      <a href="shop.html" class="product-detail-back">← 목록으로</a>
    </div>`;

  let qty = 1;
  const qtyValueEl = $("#productQty");

  container.addEventListener("click", ({ target }) => {
    const chip = target.closest(".option-chip");
    if (chip) {
      chip.closest(".option-chips").querySelectorAll(".option-chip").forEach((c) => c.classList.remove("is-selected"));
      chip.classList.add("is-selected");
      return;
    }

    const qtyBtn = target.closest(".qty-btn");
    if (qtyBtn) {
      qty = qtyBtn.dataset.action === "plus" ? Math.min(qty + 1, 99) : Math.max(qty - 1, 1);
      qtyValueEl.textContent = qty;
      return;
    }

    const btn = target.closest(".cart-button");
    if (btn && !btn.disabled) {
      addToCart(Number(btn.dataset.id), btn.closest(".product-detail-info"), qty);
      pulseCartBadge();

      const original = btn.textContent;
      btn.textContent = "담았어요! ✓";
      btn.classList.add("is-added");
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("is-added");
        btn.disabled = false;
      }, 1100);
    }
  });

  const relatedList = $("#relatedList");
  if (relatedList) {
    const related = data.filter((x) => x.brand === p.brand && x.id !== p.id).slice(0, 4);
    relatedList.innerHTML = related.map((rp) => `
      <a href="product.html?id=${rp.id}" class="product-card product-card-link">
        <div class="product-media">
          <img src="${rp.image}" alt="${rp.name}" />
        </div>
        <div class="product-body">
          <h3>${rp.name}</h3>
          <p class="brand">${rp.brand}</p>
          <p class="price">${price(rp.price)}</p>
        </div>
      </a>`).join("");
  }
}

// ── 랭킹 미리보기 (index.html) ─────────────
async function initRankingPreview() {
  const list = $("#rankingList");
  if (!list) return;

  const res = await fetch(DATA_FILE);
  const data = await res.json();
  const top = data
    .filter((p) => p.tags.includes("ranking"))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 8);

  const cardHTML = (p) => `
    <article class="product-card">
      <a href="product.html?id=${p.id}" class="product-media">
        <img src="${p.image}" alt="${p.name}" />
        <div class="badge-row"><span class="badge rank-badge">${p.rank}위</span></div>
      </a>
      <div class="product-body">
        <a href="product.html?id=${p.id}" class="product-title-link"><h3>${p.name}</h3></a>
        <p class="brand">${p.brand}</p>
        <p class="price">${price(p.price)}</p>
      </div>
    </article>`;

  // 끊김 없이 순환되도록 카드 세트를 두 번 이어붙임
  list.innerHTML = top.map(cardHTML).join("") + top.map(cardHTML).join("");

  const originalCards = Array.from(list.children).slice(0, top.length);
  originalCards.forEach((card, i) => {
    card.classList.add("rank-fade-init");
    card.style.transitionDelay = `${i * 0.18}s`;
  });

  const section = list.closest(".ranking-preview");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        originalCards.forEach((card) => card.classList.add("is-visible"));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  observer.observe(section);
}

// ── 배너 슬라이더 (index.html) ─────────────
let slideIndex = 0;
let slideTimer = null;

function showSlide(index) {
  const slides = document.querySelectorAll(".slide");
  const dots = document.querySelectorAll(".dot");
  slideIndex = (index + slides.length) % slides.length;
  slides.forEach((s, i) => s.classList.toggle("active", i === slideIndex));
  dots.forEach((d, i) => d.classList.toggle("active", i === slideIndex));
}

function startSliderAutoplay() {
  clearInterval(slideTimer);
  slideTimer = setInterval(() => showSlide(slideIndex + 1), 4000);
}

function initSlider() {
  const prev = $("#sliderPrev");
  const next = $("#sliderNext");
  if (!prev || !next) return;

  let prevRotation = 0;
  let nextRotation = 0;

  prev.addEventListener("click", () => {
    showSlide(slideIndex - 1);
    startSliderAutoplay();
    prevRotation -= 360;
    prev.style.transform = `translateY(-50%) rotate(${prevRotation}deg)`;
  });

  next.addEventListener("click", () => {
    showSlide(slideIndex + 1);
    startSliderAutoplay();
    nextRotation += 360;
    next.style.transform = `translateY(-50%) rotate(${nextRotation}deg)`;
  });

  document.querySelectorAll(".dot").forEach((dot) => {
    dot.addEventListener("click", () => { showSlide(Number(dot.dataset.index)); startSliderAutoplay(); });
  });

  startSliderAutoplay();
}

// ── 부드러운 스크롤 (모든 페이지 공통) ──────
function initSmoothScroll() {
  let current = window.scrollY;
  let target = window.scrollY;
  let ticking = false;
  const ease = 0.14; // 값이 작을수록 더 천천히 따라감

  function update() {
    current += (target - current) * ease;
    if (Math.abs(target - current) < 0.5) {
      current = target;
      ticking = false;
    } else {
      requestAnimationFrame(update);
    }
    window.scrollTo(0, current);
  }

  window.addEventListener("wheel", (e) => {
    e.preventDefault();
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    target = Math.max(0, Math.min(target + e.deltaY, maxScroll));
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: false });
}

// ── 섹션 스크롤 등장 효과 (재사용) ──────────
function initSectionReveal(sectionSelector, itemSelector, stagger) {
  const section = document.querySelector(sectionSelector);
  if (!section) return;
  const items = section.querySelectorAll(itemSelector);
  if (!items.length) return;

  items.forEach((el, i) => {
    el.classList.add("reveal-init");
    el.style.transitionDelay = `${i * stagger}s`;
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        items.forEach((el) => el.classList.add("is-visible"));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.25 });

  observer.observe(section);
}

// ── 페이지 전환 페이드 (모든 페이지 공통) ───
function initPageTransition() {
  document.body.classList.add("page-ready");

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    if (link.target === "_blank" || link.hasAttribute("download")) return;

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("//")) return;

    e.preventDefault();
    document.body.classList.remove("page-ready");
    document.body.classList.add("page-leaving");
    setTimeout(() => {
      window.location.href = href;
    }, 220);
  });
}

// ── 맨 위로 버튼 (모든 페이지 공통) ─────────
function initTopButton() {
  const btn = $("#topButton");
  if (!btn) return;

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      btn.classList.toggle("is-visible", window.scrollY > 400);
      ticking = false;
    });
  }, { passive: true });

  btn.addEventListener("click", () => {
    btn.classList.remove("is-bouncing");
    void btn.offsetWidth;
    btn.classList.add("is-bouncing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ── 매장 갤러리 드래그 스크롤 (index.html) ──
function initGalleryDrag() {
  const wrap = document.querySelector(".gallery-track-wrap");
  if (!wrap) return;

  let isDown = false;
  let startX = 0;
  let scrollStart = 0;

  wrap.addEventListener("mousedown", (e) => {
    isDown = true;
    wrap.classList.add("is-dragging");
    startX = e.pageX;
    scrollStart = wrap.scrollLeft;
  });

  window.addEventListener("mouseup", () => {
    isDown = false;
    wrap.classList.remove("is-dragging");
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    wrap.scrollLeft = scrollStart - (e.pageX - startX);
  });
}

// ── 지도 (location.html) ──────────────────
function initMap() {
  const mapEl = $("#map");
  if (!mapEl) return;

  if (window.kakao?.maps) {
    const pos = new kakao.maps.LatLng(STORE.lat, STORE.lng);
    const map = new kakao.maps.Map(mapEl, { center: pos, level: 3 });
    new kakao.maps.Marker({ position: pos }).setMap(map);
  } else {
    mapEl.innerHTML = `<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=126.8279%2C37.3199%2C126.8339%2C37.3239&layer=mapnik&marker=37.3219%2C126.8309" style="width:100%;height:100%;border:0;"></iframe>`;
  }
}

// ── 초기화 (모든 페이지 공통 진입점) ────────
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  initShopPage();
  initCartPage();
  initProductPage();
  initSlider();
  initMap();
  initRankingPreview();
  initIntro();
  initSmoothScroll();
  initTopButton();
  initPageTransition();
  initGalleryDrag();

  const introEl = $("#introScreen");
  const introPlaying = introEl && !introEl.classList.contains("is-hidden");
  const setupReveals = () => {
    initSectionReveal(".why-us", ".why-card", 0.1);
    initSectionReveal(".brand-strip", ".brand-card", 0.05);
  };
  if (introPlaying) {
    setTimeout(setupReveals, 2000);
  } else {
    setupReveals();
  }
});