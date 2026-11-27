"use strict";
/* VOLT storefront — vanilla JS. Sections: helpers · storage · cart · components · views · forms · events · init */

/* ========== Helpers ========== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => "₦" + Number(n).toLocaleString();
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fd = f => Object.fromEntries(new FormData(f));
const go = p => (location.hash = "#" + p);
let toastTimer;
const toast = m => {
  const t = $("#toast"); t.textContent = m; t.classList.add("on");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 2000);
};

/* ========== Storage / state (localStorage, prefix volt_) ========== */
const DB = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("volt_" + k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem("volt_" + k, JSON.stringify(v)); }
};
if (DB.get("ver", 0) < 2) { localStorage.removeItem("volt_products"); DB.set("ver", 2); }
const S = {
  products: DB.get("products", SEED_PRODUCTS),
  // Demo only: passwords are stored in plain text. Use a real backend + hashing in production.
  users: DB.get("users", [{ id: 1, name: "Admin", email: "admin@volt.com", pass: "admin123", role: "admin" }]),
  orders: DB.get("orders", []),
  cart: DB.get("cart", []),
  user: DB.get("session", null),
  last: null,
  save(k) { DB.set(k === "user" ? "session" : k, this[k]); }
};

/* ========== Cart ========== */
const cartLines = () => S.cart.map(i => ({ i, p: S.products.find(p => p.id == i.id) })).filter(x => x.p);
const Cart = {
  count: () => S.cart.reduce((a, i) => a + i.qty, 0),
  total: () => cartLines().reduce((a, { i, p }) => a + i.qty * p.price, 0),
  add(id, size) {
    const p = S.products.find(p => p.id == id);
    const it = S.cart.find(i => i.id == id && i.size == size);
    if (it && it.qty >= p.stock) return toast("Max stock reached");
    it ? it.qty++ : S.cart.push({ id, size, qty: 1 });
    this.sync(); toast("Added to bag");
    const c = $("#cc"); c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
  },
  set(id, size, d) {
    const it = S.cart.find(i => i.id == id && i.size == size), p = S.products.find(p => p.id == id);
    if (!it) return;
    if (d > 0 && it.qty >= p.stock) return toast("Max stock reached");
    it.qty += d;
    if (it.qty < 1) S.cart = S.cart.filter(i => i !== it);
    this.sync();
  },
  sync() { S.save("cart"); $("#cc").textContent = this.count(); renderDrawer(); const cp = $("#cartpage"); if (cp) cp.innerHTML = cartPageHTML(); }
};

/* ========== Components ========== */
const SHAPES = {
  Tees: "M30 20 L50 12 Q60 22 70 12 L90 20 L108 44 L92 54 L86 46 L86 108 L34 108 L34 46 L28 54 L12 44 Z",
  Hoodies: "M32 22 L48 12 Q60 30 72 12 L88 22 L112 56 L96 66 L88 56 L88 112 L32 112 L32 56 L24 66 L8 56 Z",
  Pants: "M34 10 L86 10 L92 112 L66 112 L60 46 L54 112 L28 112 Z",
  Jackets: "M30 16 L48 10 L60 22 L72 10 L90 16 L114 56 L98 66 L90 56 L90 112 L30 112 L30 56 L22 66 L6 56 Z",
  Caps: "M20 70 Q20 30 60 30 Q100 30 100 70 L116 76 Q116 84 96 82 L24 82 Q10 80 20 70 Z"
};
// Placeholder "fashion imagery": SVG garment in the product colour. Swap for <img> when you have photos.
const svgArt = p => `<svg viewBox="0 0 120 120" role="img" aria-label="${esc(p.name || p.cat)}"><rect width="120" height="120" fill="#1b1b1b"/><circle cx="60" cy="62" r="46" fill="#c8ff0014"/><path d="${SHAPES[p.cat] || SHAPES.Tees}" fill="${p.color}" stroke="#000" stroke-width="2" stroke-linejoin="round"/>${p.cat === "Caps" ? "" : `<text x="60" y="${p.cat === "Pants" ? 30 : 56}" text-anchor="middle" font-size="9" font-weight="900" fill="#000" opacity=".55" font-family="Arial">VOLT</text>`}</svg>`;

// Photo sits on top of the SVG garment, so if an image URL fails (or you're offline) the SVG still shows.
const art = p => { const src = imgOf(p); return svgArt(p) + (src ? `<img src="${src}" alt="${esc(p.name || p.cat)}" loading="lazy" onerror="this.remove()">` : ""); };

const card = p => `<article class="card reveal"><a class="ph" href="#/product?id=${p.id}">${art(p)}${p.isNew ? '<i class="tag">NEW</i>' : ""}${p.stock < 1 ? '<i class="tag out">SOLD OUT</i>' : ""}</a>
<div class="pi"><b><a href="#/product?id=${p.id}">${esc(p.name)}</a></b><span>${esc(p.cat)} · ${esc(aesOf(p))}</span>
<div class="row"><strong>${money(p.price)}</strong><select data-sz aria-label="Size">${sizesOf(p).map(s => `<option>${s}</option>`).join("")}</select></div>
<button class="btn sm" data-add="${p.id}" ${p.stock < 1 ? "disabled" : ""}>${p.stock < 1 ? "Sold out" : "Add to bag"}</button></div></article>`;

// Gallery: the product's own images, else its photo plus alternates from the same category (demo stand-ins for extra angles).
const gallery = p => {
  if (p.imgs && p.imgs.length) return p.imgs;
  const m = imgOf(p); if (!m) return [];
  const alt = S.products.filter(x => x.id !== p.id && x.cat === p.cat).map(imgOf).filter(u => u && u !== m);
  return [m, ...alt.slice(0, 2), U("1523398002811-999ca8dec234")].slice(0, 4);
};

// One cart line, shared by the drawer and the cart page.
const lineHTML = ({ p, i }) => `<div class="li"><a class="thumb" href="#/product?id=${p.id}">${art(p)}</a><div><b>${esc(p.name)}</b><small>Size ${esc(i.size)} · ${money(p.price)}</small>
<div class="qty"><button data-q="${p.id}|${i.size}|-1">−</button><span>${i.qty}</span><button data-q="${p.id}|${i.size}|1">+</button></div></div>
<button class="x" data-q="${p.id}|${i.size}|-999" aria-label="Remove">✕</button></div>`;
function cartPageHTML() {
  const L = cartLines(), t = Cart.total();
  if (!L.length) return '<p class="empty">Your cart is empty. <a href="#/shop">Shop now</a></p>';
  return `<div class="split"><div>${L.map(lineHTML).join("")}</div><div class="sum"><h3>Order summary</h3>
  <div class="l"><span>Subtotal</span><b>${money(t)}</b></div><div class="l"><span>Delivery</span><b>${t >= 100000 ? "Free" : "Calculated at checkout"}</b></div>
  <div class="tot" style="margin:16px 0"><span>Total</span><b>${money(t)}</b></div><a class="btn" href="#/checkout">Checkout ↗</a></div></div>`;
}

const stars = n => "★".repeat(n) + "☆".repeat(5 - n);
const reviewCard = r => `<div class="rev reveal"><div class="st">${stars(r.rating)}</div><p>“${esc(r.text)}”</p><div class="who"><span class="av">${esc(r.name[0])}</span><div><b>${esc(r.name)}</b><br><small class="mut">Verified customer</small></div></div></div>`;

function renderDrawer() {
  const L = cartLines();
  $("#drawer").innerHTML = `<div class="dh"><b>YOUR CART</b><button data-close aria-label="Close">✕</button></div>
  <div class="dl">${L.length ? L.map(lineHTML).join("") : '<p class="empty">Your cart is empty.</p>'}</div>
  <div class="df"><div class="tot"><span>Total</span><b>${money(Cart.total())}</b></div>${L.length ? '<a class="btn ghost" href="#/cart">View cart</a><a class="btn" href="#/checkout">Checkout ↗</a>' : ""}</div>`;
}

/* ========== Views (each returns an HTML string, or null after redirecting) ========== */
const Shop = {
  q: "", cat: "All", aes: "All", sort: "new", max: 70000,
  list() {
    const sorters = { new: (a, b) => b.id - a.id, low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price };
    return S.products
      .filter(p => (this.cat === "All" || p.cat === this.cat) && (this.aes === "All" || aesOf(p) === this.aes) && p.price <= this.max && p.name.toLowerCase().includes(this.q.toLowerCase()))
      .sort(sorters[this.sort]);
  },
  grid() { const l = this.list(); return l.length ? l.map(card).join("") : '<p class="empty">No products match your filters.</p>'; }
};

const authForm = t => `<section class="sec narrow"><h2>${t === "login" ? "Login" : "Create account"}</h2>
<form class="form" data-form="${t}">${t === "register" ? '<label>Name<input name="name" required></label>' : ""}
<label>Email<input name="email" type="email" required></label>
<label>Password<input name="pass" type="password" minlength="6" required></label>
<button class="btn">${t === "login" ? "Login" : "Register"}</button>
<p class="note">${t === "login" ? 'No account? <a href="#/register">Register</a><br>Demo admin: admin@volt.com / admin123' : 'Already registered? <a href="#/login">Login</a>'}</p></form></section>`;

const Views = {
  "/": () => {
    const pick = f => S.products.filter(f).slice(0, 4).map(card).join("");
    const head = (eb, h, link = "") => `<div class="sh"><div><p class="eyebrow">${eb}</p><h2>${h}</h2></div>${link}</div>`;
    return `<section class="hero"><div class="txt"><p class="eyebrow">DROP 07 — LAGOS</p><h1>Wear<br>the <em>noise.</em></h1>
      <p class="hc">Heavyweight streetwear. Limited runs. No restocks. Pieces that feel like you, only louder.</p>
      <div class="cta"><a class="btn" href="#/shop">Shop the drop ↗</a><a class="btn ghost" href="#/shop?cat=Hoodies">Hoodies</a></div></div>
      <div class="hero-img" role="img" aria-label="Model in monochrome streetwear"></div>
      <div class="cap"><span>01 / 03</span><span>Autumn — Winter collection</span></div><div class="scrl">SCROLL <span>↓</span></div></section>
    <div class="vs"><div>${"<span>✳ MADE TO BE LIVED IN</span><span>◌ LIMITED DROPS</span><span>↗ STYLE WITHOUT THE NOISE</span>".repeat(4)}</div></div>
    <section class="sec">${head("JUST LANDED", "New <em>arrivals.</em>", '<a class="tl" href="#/shop">Shop all ↗</a>')}<div class="grid">${pick(p => p.isNew)}</div></section>
    <section class="ed"><div class="ed-photo" role="img" aria-label="Clothing on a rail"></div><div class="ed-copy"><p class="eyebrow">LESS, BUT LOUDER</p><h2>Built heavy.<br><em>Made local.</em></h2><p>Heavyweight cotton, honest fits and small runs, cut and sewn in Lagos season after season.</p><a class="btn" href="#/about">Our story ↗</a></div></section>
    <section class="sec">${head("SHOP BY", "Collec<em>tions.</em>")}<div class="cols">${CATEGORIES.map(c => `<a class="col reveal" href="#/shop?cat=${c}">${art(S.products.find(p => p.cat === c) || { cat: c, color: "#c8ff00" })}<span>${c}</span></a>`).join("")}</div></section>
    <section class="sec">${head("EVERY MOOD", "Shop by <em>aesthetic.</em>")}<div class="cols">${AESTHETICS.map(a => `<a class="col reveal" href="#/shop?aes=${encodeURIComponent(a)}">${art(S.products.find(p => aesOf(p) === a) || { cat: "Tees", color: "#c8ff00" })}<span>${a}</span></a>`).join("")}</div></section>
    <section class="sec">${head("A BETTER KIND OF BASIC", "Find your <em>uniform.</em>", '<a class="tl" href="#/shop">Explore all ↗</a>')}<div class="grid">${pick(p => p.featured)}</div></section>
    <section class="sec"><div class="arr"><a class="arr-f" href="#/shop"><div class="arr-img"></div><div class="arr-o"><p class="eyebrow">THE NEW EDIT</p><h3>Room to<br><em>be loud.</em></h3><span class="ra">↗</span></div></a>
      <div class="arr-n"><span>VOL. 07 — THE DAILY EDIT</span><p>Heavy layers. Clean lines. Nothing extra.</p><a class="tl" href="#/shop">Meet the drop ↗</a></div></div></section>
    <section class="qb"><p class="eyebrow">A NOTE ON PERSONAL STYLE</p><blockquote>“The best thing you can wear<br>is <em>your own noise.</em>”</blockquote><span>VOLT, ALWAYS</span></section>
    <section class="sec">${head("KIND WORDS, WORN WELL", "Love, <em>in the details.</em>", '<div class="rs"><span class="st">★★★★★</span> 4.9 / 5 from our community</div>')}<div class="three">${REVIEWS.map(reviewCard).join("")}</div></section>
    <section class="nl"><div><p class="eyebrow">A LITTLE SOMETHING FOR YOUR INBOX</p><h2>Good drops, <em>first.</em></h2><p>First looks and 10% off your first order.</p></div>
      <form onsubmit="event.preventDefault();this.reset();toast('Subscribed. Welcome to VOLT')"><input type="email" placeholder="Your email address" required aria-label="Email"><button class="btn">Join us ↗</button></form></section>`;
  },

  "/shop": () => {
    const q = new URLSearchParams(location.hash.split("?")[1] || "");
    if (q.has("cat")) { Shop.cat = q.get("cat"); Shop.aes = "All"; }
    if (q.has("aes")) { Shop.aes = q.get("aes"); Shop.cat = "All"; }
    return `<section class="sec"><div class="sh"><div><p class="eyebrow">THE FULL EDIT</p><h2>Find your <em>uniform.</em></h2></div></div>
    <div class="tools"><label class="s"><input data-f="q" placeholder="Search products…" value="${esc(Shop.q)}"></label>
      <label>Sort<select data-f="sort"><option value="new">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label>
      <label>Max price <b id="mx">${money(Shop.max)}</b><input type="range" data-f="max" min="10000" max="70000" step="1000" value="${Shop.max}"></label></div>
    <div class="chips" id="chips">${["All", ...CATEGORIES].map(c => `<button data-cat="${c}" class="${Shop.cat === c ? "on" : ""}">${c}</button>`).join("")}</div>
    <div class="chips" id="aeschips">${["All", ...AESTHETICS].map(a => `<button data-aes="${a}" class="${Shop.aes === a ? "on" : ""}">${a}</button>`).join("")}</div>
    <div class="grid" id="grid">${Shop.grid()}</div></section>`;
  },

  "/product": () => {
    const id = +new URLSearchParams(location.hash.split("?")[1] || "").get("id");
    const p = S.products.find(x => x.id === id);
    if (!p) return '<section class="sec narrow"><h2>Not found</h2><p class="empty"><a href="#/shop">Back to shop</a></p></section>';
    const g = gallery(p), cols = colorsOf(p), sizes = sizesOf(p);
    const more = S.products.filter(x => x.id !== p.id && (aesOf(x) === aesOf(p) || x.cat === p.cat)).slice(0, 4).map(card).join("");
    return `<section class="sec"><a class="tl" href="#/shop">← Back to shop</a>
    <div class="pd"><div class="pg"><div class="pm">${svgArt(p)}${g[0] ? `<img id="pmi" src="${g[0]}" alt="${esc(p.name)}" onerror="this.remove()">` : ""}</div>
      ${g.length > 1 ? `<div class="pt">${g.map((u, i) => `<button data-gal="${u}" class="${i ? "" : "on"}" aria-label="Image ${i + 1}"><img src="${u}" alt="" onerror="this.parentNode.remove()"></button>`).join("")}</div>` : ""}</div>
    <div class="pc"><p class="eyebrow">${esc(aesOf(p))} · ${esc(p.cat)}</p><h1>${esc(p.name)}</h1><div class="pp">${money(p.price)}</div>
      <p class="mut">${esc(descOf(p))}</p>
      <h4>Colour: <span id="cn">${esc(cols[0].n)}</span></h4><div class="sws">${cols.map((c, i) => `<button class="sw${i ? "" : " on"}" data-col="${esc(c.n)}" style="background:${esc(c.h)}" title="${esc(c.n)}" aria-label="${esc(c.n)}"></button>`).join("")}</div>
      <h4>Size</h4><div class="szs">${sizes.map((z, i) => `<button class="sz${i === (sizes.length > 1 ? 1 : 0) ? " on" : ""}" data-size="${z}">${z}</button>`).join("")}</div>
      <button class="btn" data-padd="${p.id}" ${p.stock < 1 ? "disabled" : ""}>${p.stock < 1 ? "Sold out" : "Add to bag ↗"}</button>
      <ul class="det"><li>Heavyweight, pre-washed fabric</li><li>Free delivery in Lagos over ₦100,000</li><li>${p.stock < 1 ? "Currently sold out" : p.stock + " left in this drop"}</li></ul></div></div></section>
    ${more ? `<section class="sec"><div class="sh"><div><p class="eyebrow">KEEP LOOKING</p><h2>You may <em>also like.</em></h2></div></div><div class="grid">${more}</div></section>` : ""}`;
  },

  "/cart": () => `<section class="sec"><div class="sh"><div><p class="eyebrow">YOUR BAG</p><h2>Shopping <em>cart.</em></h2></div></div><div id="cartpage">${cartPageHTML()}</div></section>`,

  "/about": () => `<section class="sec split"><div><h2>About VOLT</h2><p class="mut" style="margin-top:18px">VOLT started in 2021 with a single hoodie and a borrowed sewing machine in Lagos. Today we design heavyweight, oversized streetwear in small batches, so every piece feels like a drop, not a catalogue item.</p>
    <p class="mut" style="margin-top:14px">We cut and sew locally, use premium cotton, and never restock a sold-out design.</p></div>
    <div class="stats"><div><b>50k+</b>Pieces sold</div><div><b>12</b>Drops</div><div><b>4.8★</b>Rating</div><div><b>48h</b>Lagos delivery</div></div></section>
    <section class="sec"><h2>What we stand for</h2><div class="three"><div class="rev reveal"><h3>Heavyweight</h3><p>400gsm fabrics built to last.</p></div><div class="rev reveal"><h3>Limited</h3><p>Small runs, no restocks.</p></div><div class="rev reveal"><h3>Local</h3><p>Designed and made in Nigeria.</p></div></div></section>`,

  "/login": () => authForm("login"),
  "/register": () => authForm("register"),

  "/profile": () => {
    const u = S.user; if (!u) { go("/login"); return null; }
    const os = S.orders.filter(o => o.email === u.email);
    return `<section class="sec split"><form class="form" data-form="profile"><h2>My profile</h2>
      <label>Name<input name="name" value="${esc(u.name)}" required></label><label>Email<input value="${esc(u.email)}" disabled></label><label>Phone<input name="phone" value="${esc(u.phone || "")}"></label><label>Delivery address<textarea name="address" rows="2">${esc(u.address || "")}</textarea></label>
      <div class="cta"><button class="btn">Save</button><button type="button" class="btn ghost" data-out>Logout</button></div></form>
      <div><h2>My orders</h2><br>${os.length ? os.map(o => `<div class="ord"><b>${o.id}</b> · ${o.date}<br>${o.items.map(i => `${i.qty}× ${esc(i.name)} (${i.size})`).join(", ")}<br><strong>${money(o.total)}</strong> — ${o.status}</div>`).join("") : '<p class="empty">No orders yet.</p>'}</div></section>`;
  },

  "/checkout": () => {
    const L = cartLines();
    if (!L.length) return '<section class="sec narrow"><h2>Checkout</h2><p class="empty">Your cart is empty. <a href="#/shop">Shop now</a></p></section>';
    const u = S.user || {};
    return `<section class="sec split"><form class="form" data-form="checkout"><h2>Checkout</h2>
      <label>Full name<input name="name" required value="${esc(u.name || "")}"></label><label>Email<input name="email" type="email" required value="${esc(u.email || "")}"></label>
      <label>Phone<input name="phone" required value="${esc(u.phone || "")}"></label><label>Delivery address<textarea name="address" rows="3" required>${esc(u.address || "")}</textarea></label>
      <label>Payment<select name="pay"><option>Pay on delivery</option><option>Card (demo)</option><option>Bank transfer</option></select></label>
      <button class="btn">Place order · ${money(Cart.total())}</button></form>
      <div class="sum"><h3>Order summary</h3>${L.map(({ p, i }) => `<div class="l"><span>${i.qty}× ${esc(p.name)} (${i.size})</span><b>${money(p.price * i.qty)}</b></div>`).join("")}<div class="tot" style="margin-top:14px"><span>Total</span><b>${money(Cart.total())}</b></div></div></section>`;
  },

  "/done": () => S.last ? `<section class="sec narrow"><h2>Order placed ✓</h2><p class="mut" style="margin:16px 0">Thanks ${esc(S.last.name)}! Your order <b style="color:var(--ac)">${S.last.id}</b> (${money(S.last.total)}) is being prepared.</p><a class="btn" href="#/shop">Keep shopping</a></section>` : (go("/"), null),

  "/admin": () => {
    if (S.user?.role !== "admin") return '<section class="sec narrow"><h2>Admin</h2><p class="empty">Admins only. <a href="#/login">Login</a></p></section>';
    const rev = S.orders.reduce((a, o) => a + o.total, 0), T = Admin.tab;
    const statuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
    const opts = (arr, v) => arr.map(x => `<option${x === v ? " selected" : ""}>${x}</option>`).join("");
    const spent = u => S.orders.filter(o => o.email === u.email).reduce((a, o) => a + o.total, 0);
    const panels = {
      products: `<h3>Add product</h3><form class="form row3" data-form="addProduct">
        <label>Name<input name="name" required></label><label>Category<select name="cat">${opts(CATEGORIES)}</select></label><label>Aesthetic<select name="aes">${opts(AESTHETICS)}</select></label>
        <label>Price (₦)<input name="price" type="number" min="0" required></label><label>Stock<input name="stock" type="number" min="0" required></label>
        <label class="span">Colours (Name:#hex, comma separated)<input name="colors" placeholder="Black:#111111, Sand:#c8b9a5"></label>
        <label class="span">Image URLs (comma separated, first is the main image)<input name="imgs" placeholder="https://…, https://…"></label>
        <label class="span">Description<textarea name="desc" rows="2"></textarea></label><button class="btn">Add product</button></form>
        <h3>Products</h3><div class="tw"><table><tr><th>Name</th><th>Category</th><th>Aesthetic</th><th>Price</th><th>Stock</th><th>Description</th><th></th></tr>
        ${S.products.map(p => `<tr><td><input type="text" value="${esc(p.name)}" data-pid="${p.id}" data-field="name"></td>
          <td><select data-pid="${p.id}" data-field="cat">${opts(CATEGORIES, p.cat)}</select></td><td><select data-pid="${p.id}" data-field="aes">${opts(AESTHETICS, aesOf(p))}</select></td>
          <td><input type="number" min="0" value="${p.price}" data-pid="${p.id}" data-field="price"></td><td><input type="number" min="0" value="${p.stock}" data-pid="${p.id}" data-field="stock"></td>
          <td><input type="text" value="${esc(descOf(p))}" data-pid="${p.id}" data-field="desc"></td><td><button class="del" data-del="${p.id}">Delete</button></td></tr>`).join("")}</table></div>`,
      orders: S.orders.length ? `<div class="tw"><table><tr><th>ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Date</th><th>Status</th></tr>
        ${S.orders.map(o => `<tr><td>${o.id}</td><td>${esc(o.name)}<br><small class="mut">${esc(o.email)} · ${esc(o.phone || "")}</small></td><td>${o.items.map(i => `${i.qty}× ${esc(i.name)} (${esc(i.size)})`).join("<br>")}</td><td>${money(o.total)}</td><td>${o.date}</td><td><select data-oid="${o.id}">${opts(statuses, o.status)}</select></td></tr>`).join("")}</table></div>` : '<p class="empty">No orders yet.</p>',
      customers: `<div class="tw"><table><tr><th>Name</th><th>Email</th><th>Role</th><th>Orders</th><th>Spent</th><th></th></tr>
        ${S.users.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td><select data-uid="${u.id}">${opts(["customer", "admin"], u.role)}</select></td><td>${S.orders.filter(o => o.email === u.email).length}</td><td>${money(spent(u))}</td><td>${u.id === S.user.id ? "" : `<button class="del" data-delu="${u.id}">Delete</button>`}</td></tr>`).join("")}</table></div>`
    };
    return `<section class="sec"><div class="adm-hero"><div><p class="eyebrow">ADMIN</p><h2>Dashboard</h2></div></div>
    <div class="stats"><div><b>${S.orders.length}</b>Orders</div><div><b>${money(rev)}</b>Revenue</div><div><b>${S.products.length}</b>Products</div><div><b>${S.users.length}</b>Customers</div></div>
    <div class="chips" style="margin-top:26px">${["products", "orders", "customers"].map(t => `<button data-tab="${t}" class="${T === t ? "on" : ""}">${t}</button>`).join("")}</div>${panels[T]}</section>`;
  }
};

/* ========== Auth & forms ========== */
function signIn(u) {
  S.user = { id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone || "", address: u.address || "" };
  S.save("user"); updateNav(); go(u.role === "admin" ? "/admin" : "/profile");
}
const Forms = {
  login(f) {
    const d = fd(f), u = S.users.find(x => x.email === d.email.toLowerCase() && x.pass === d.pass);
    u ? signIn(u) : toast("Wrong email or password");
  },
  register(f) {
    const d = fd(f), email = d.email.toLowerCase();
    if (S.users.some(u => u.email === email)) return toast("Email already registered");
    const u = { id: Date.now(), name: d.name, email, pass: d.pass, role: "customer" };
    S.users.push(u); S.save("users"); signIn(u);
  },
  profile(f) {
    const d = fd(f), extra = { name: d.name, phone: d.phone, address: d.address };
    Object.assign(S.user, extra);
    const u = S.users.find(x => x.id === S.user.id); if (u) Object.assign(u, extra);
    S.save("user"); S.save("users"); toast("Profile saved");
  },
  checkout(f) {
    const d = fd(f), L = cartLines();
    const o = {
      id: "V" + Date.now().toString().slice(-7), date: new Date().toLocaleDateString(), name: d.name, email: d.email.toLowerCase(),
      phone: d.phone, address: d.address, pay: d.pay, status: "Pending", total: Cart.total(),
      items: L.map(({ p, i }) => ({ name: p.name, size: i.size, qty: i.qty, price: p.price }))
    };
    L.forEach(({ p, i }) => (p.stock = Math.max(0, p.stock - i.qty)));
    S.orders.unshift(o); S.cart = []; S.last = o;
    ["orders", "cart", "products"].forEach(k => S.save(k));
    Cart.sync(); go("/done");
  },
  addProduct(f) {
    const d = fd(f), list = x => (x || "").split(",").map(v => v.trim()).filter(Boolean);
    const colors = list(d.colors).map(c => { const [n, h] = c.split(":"); return { n: n.trim(), h: (h || "#888888").trim() }; });
    const imgs = list(d.imgs);
    S.products.push({ id: Math.max(0, ...S.products.map(p => p.id)) + 1, name: d.name, cat: d.cat, aes: d.aes, price: +d.price, stock: +d.stock, color: colors[0]?.h || "#c8ff00", colors, imgs, img: imgs[0] || "", desc: d.desc, isNew: true });
    S.save("products"); route(); toast("Product added");
  }
};

/* ========== Router ========== */
const Admin = { tab: "products" };
const app = $("#app");
function route() {
  Dropdown.cur?.close();
  const path = location.hash.slice(1).split("?")[0] || "/";
  const html = (Views[path] || Views["/"])();
  if (html == null) return;
  app.innerHTML = html;
  app.classList.remove("in"); void app.offsetWidth; app.classList.add("in");
  window.scrollTo(0, 0);
  document.body.classList.remove("cart-open"); $("#nav").classList.remove("open"); $("#burger").setAttribute("aria-expanded", "false");
  $$("#nav a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + path));
  if (path === "/shop") $('[data-f="sort"]').value = Shop.sort;
  reveal();
}
function updateNav() {
  const u = S.user, a = $("#authLink");
  a.textContent = u ? "Account" : "Login"; a.href = u ? "#/profile" : "#/login";
  $("#adminLink").hidden = u?.role !== "admin";
}
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
const reveal = () => $$(".reveal:not(.in)").forEach(el => io.observe(el));

/* ========== Events (delegated) ========== */
document.addEventListener("click", e => {
  const t = e.target.closest("[data-add],[data-q],[data-cat],[data-aes],[data-padd],[data-gal],[data-col],[data-size],[data-tab],[data-delu],[data-close],[data-del],[data-out],#cartBtn,#burger");
  if (!t) return;
  if (t.dataset.add) Cart.add(+t.dataset.add, $("[data-sz]", t.closest(".card")).value);
  else if (t.dataset.q) { const [id, size, d] = t.dataset.q.split("|"); Cart.set(+id, size, +d); }
  else if (t.dataset.cat || t.dataset.aes) {
    if (t.dataset.cat) Shop.cat = t.dataset.cat; else Shop.aes = t.dataset.aes;
    $$("[data-cat]").forEach(b => b.classList.toggle("on", b.dataset.cat === Shop.cat));
    $$("[data-aes]").forEach(b => b.classList.toggle("on", b.dataset.aes === Shop.aes));
    $("#grid").innerHTML = Shop.grid(); reveal();
  }
  else if (t.dataset.padd) { const z = $(".sz.on", app), c = $(".sw.on", app); Cart.add(+t.dataset.padd, `${z.dataset.size} · ${c.dataset.col}`); }
  else if (t.dataset.gal) { $("#pmi").src = t.dataset.gal; $$(".pt button").forEach(b => b.classList.toggle("on", b === t)); }
  else if (t.dataset.col || t.dataset.size) {
    $$(t.dataset.col ? ".sw" : ".sz", app).forEach(b => b.classList.toggle("on", b === t));
    if (t.dataset.col) $("#cn").textContent = t.dataset.col;
  }
  else if (t.dataset.tab) { Admin.tab = t.dataset.tab; route(); }
  else if (t.dataset.delu) { if (confirm("Delete this customer?")) { S.users = S.users.filter(u => u.id != t.dataset.delu); S.save("users"); route(); } }
  else if (t.dataset.del) { if (confirm("Delete this product?")) { S.products = S.products.filter(p => p.id != t.dataset.del); S.save("products"); route(); } }
  else if (t.hasAttribute("data-out")) { S.user = null; S.save("user"); updateNav(); go("/"); }
  else if (t.id === "cartBtn") document.body.classList.add("cart-open");
  else if (t.id === "burger") t.setAttribute("aria-expanded", $("#nav").classList.toggle("open"));
  else if (t.hasAttribute("data-close")) document.body.classList.remove("cart-open");
});
document.addEventListener("input", e => {
  const k = e.target.dataset.f; if (!k) return;
  Shop[k] = k === "max" ? +e.target.value : e.target.value;
  if (k === "max") $("#mx").textContent = money(Shop.max);
  $("#grid").innerHTML = Shop.grid(); reveal();
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.pid) { S.products.find(p => p.id == t.dataset.pid)[t.dataset.field] = t.type === "number" ? Math.max(0, +t.value) : t.value; S.save("products"); toast("Updated"); }
  if (t.dataset.uid) { S.users.find(u => u.id == t.dataset.uid).role = t.value; S.save("users"); toast("Role updated"); }
  if (t.dataset.oid) { S.orders.find(o => o.id === t.dataset.oid).status = t.value; S.save("orders"); toast("Status updated"); }
});
document.addEventListener("submit", e => {
  const h = Forms[e.target.dataset.form];
  if (h) { e.preventDefault(); h(e.target); }
});

/* ========== Motion: card tilt, hero parallax, header state ========== */
document.addEventListener("mousemove", e => {
  const c = e.target.closest?.(".card"); if (!c || !c.classList.contains("in")) return;
  const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  c.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
});
document.addEventListener("mouseout", e => { const c = e.target.closest?.(".card"); if (c && !c.contains(e.relatedTarget)) c.style.transform = ""; });
window.addEventListener("scroll", () => {
  $("#hd").classList.toggle("s", scrollY > 20);
  const h = $(".hero-img"); if (h && scrollY < 900) h.style.translate = `0 ${scrollY * .12}px`;
}, { passive: true });

/* ========== Custom dropdowns ========== */
// Every <select> is replaced by a styled listbox. The native <select> stays hidden and in sync,
// so existing "input"/"change" handlers and FormData keep working unchanged.
const Dropdown = {
  cur: null,
  enhance(sel) {
    if (sel.dataset.dd) return; sel.dataset.dd = "1";
    const w = Object.assign(document.createElement("div"), { className: "dd" });
    const b = Object.assign(document.createElement("button"), { type: "button", className: "dd-b" });
    const l = Object.assign(document.createElement("ul"), { className: "dd-l" });
    b.setAttribute("aria-haspopup", "listbox"); b.setAttribute("aria-expanded", "false"); l.setAttribute("role", "listbox");
    if (sel.getAttribute("aria-label")) b.setAttribute("aria-label", sel.getAttribute("aria-label"));
    b.disabled = sel.disabled;
    sel.before(w); w.append(b, l, sel);
    let act = 0;
    const render = () => {
      l.innerHTML = [...sel.options].map((o, i) => `<li role="option" data-i="${i}" aria-selected="${i === sel.selectedIndex}">${esc(o.text)}</li>`).join("");
      b.textContent = sel.options[sel.selectedIndex]?.text || "";
    };
    const mark = i => { act = i; [...l.children].forEach((li, j) => li.classList.toggle("act", j === i)); l.children[i]?.scrollIntoView({ block: "nearest" }); };
    const close = () => {
      if (!l.classList.contains("open")) return;
      l.classList.remove("open"); w.classList.remove("open"); b.setAttribute("aria-expanded", "false");
      w.append(l); Dropdown.cur = null;
    };
    const open = () => {
      Dropdown.cur?.close(); render();
      document.body.append(l); l.classList.add("open"); // list lives in <body> while open so tables/cards never clip it
      const r = b.getBoundingClientRect(), room = innerHeight - r.bottom, up = room < l.offsetHeight + 12 && r.top > room;
      l.style.minWidth = r.width + "px";
      l.style.left = Math.max(8, Math.min(r.left, innerWidth - l.offsetWidth - 8)) + "px";
      l.style.top = up ? "auto" : r.bottom + 4 + "px"; l.style.bottom = up ? innerHeight - r.top + 4 + "px" : "auto";
      l.classList.toggle("up", up); w.classList.add("open"); b.setAttribute("aria-expanded", "true");
      Dropdown.cur = { close }; mark(Math.max(0, sel.selectedIndex));
    };
    const pick = i => {
      sel.selectedIndex = i;
      sel.dispatchEvent(new Event("input", { bubbles: true })); sel.dispatchEvent(new Event("change", { bubbles: true }));
      render(); close(); b.focus();
    };
    b.addEventListener("click", () => (l.classList.contains("open") ? close() : open()));
    l.addEventListener("click", e => { const li = e.target.closest("li"); if (li) pick(+li.dataset.i); });
    b.addEventListener("keyup", e => { if (e.key === " ") e.preventDefault(); });
    b.addEventListener("keydown", e => {
      const isOpen = l.classList.contains("open"), n = sel.options.length;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); isOpen ? mark((act + (e.key === "ArrowDown" ? 1 : n - 1)) % n) : open(); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); isOpen ? pick(act) : open(); }
      else if (e.key === "Escape" || e.key === "Tab") close();
      else if (e.key.length === 1 && isOpen) { const i = [...sel.options].findIndex((o, j) => j > act && o.text.toLowerCase().startsWith(e.key.toLowerCase())); if (i > -1) mark(i); }
    });
    render();
  }
};
const enhanceAll = root => root.querySelectorAll("select:not([data-dd])").forEach(x => Dropdown.enhance(x));
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) n.matches("select") ? Dropdown.enhance(n) : enhanceAll(n); }))).observe(document.body, { childList: true, subtree: true });
document.addEventListener("click", e => { if (Dropdown.cur && !e.target.closest(".dd, .dd-l")) Dropdown.cur.close(); });
window.addEventListener("scroll", e => { if (!e.target.closest?.(".dd-l")) Dropdown.cur?.close(); }, true);
window.addEventListener("resize", () => Dropdown.cur?.close());

/* ========== Init ========== */
window.addEventListener("hashchange", route);
window.addEventListener("load", () => setTimeout(() => $("#loader").classList.add("done"), 1200));
Cart.sync(); updateNav(); route();
