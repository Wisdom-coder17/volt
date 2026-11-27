/* Seed data. Edit here to change the default catalogue (clear localStorage "volt_*" to reset). */
const SIZES = ["S", "M", "L", "XL"];
const CATEGORIES = ["Tees", "Hoodies", "Pants", "Jackets", "Caps", "Accessories"];
const AESTHETICS = ["Streetwear", "Old Money", "Y2K", "Formal", "Athleisure", "Vintage"];

const SEED_PRODUCTS = [
  { id: 1,  name: "Static Oversized Tee",  cat: "Tees",    price: 18000, stock: 30, color: "#c8ff00", isNew: true, featured: true },
  { id: 2,  name: "Void Graphic Tee",      cat: "Tees",    price: 16500, stock: 24, color: "#f2f2f2", isNew: true },
  { id: 3,  name: "Riot Boxy Tee",         cat: "Tees",    price: 17000, stock: 18, color: "#ff3d00" },
  { id: 4,  name: "Midnight Heavy Hoodie", cat: "Hoodies", price: 42000, stock: 15, color: "#4a4a4a", isNew: true, featured: true },
  { id: 5,  name: "Neon Zip Hoodie",       cat: "Hoodies", price: 46000, stock: 9,  color: "#c8ff00", featured: true },
  { id: 6,  name: "Concrete Pullover",     cat: "Hoodies", price: 39000, stock: 20, color: "#9a9a9a" },
  { id: 7,  name: "Cargo Utility Pants",   cat: "Pants",   price: 38000, stock: 22, color: "#6b7a58", isNew: true },
  { id: 8,  name: "Wide Leg Denim",        cat: "Pants",   price: 44000, stock: 12, color: "#3d52a0", featured: true },
  { id: 9,  name: "Track Pants",           cat: "Pants",   price: 29000, stock: 0,  color: "#7a3cff" },
  { id: 10, name: "Bomber Jacket",         cat: "Jackets", price: 68000, stock: 8,  color: "#ff3d00", isNew: true, featured: true },
  { id: 11, name: "Coach Windbreaker",     cat: "Jackets", price: 52000, stock: 14, color: "#2b2bff" },
  { id: 12, name: "Volt Dad Cap",          cat: "Caps",    price: 12000, stock: 40, color: "#c8ff00" },
  { id: 13, name: "Panel Snapback",        cat: "Caps",    price: 13500, stock: 35, color: "#f2f2f2", isNew: true }
];

const REVIEWS = [
  { name: "Tunde A.",  rating: 5, text: "The hoodie is unreal. Heavy, clean stitching, fits exactly like the photos." },
  { name: "Chioma E.", rating: 5, text: "Delivery to Lagos Island took two days. The bomber is my new favourite piece." },
  { name: "Ibrahim K.", rating: 4, text: "Great quality for the price. Wish the drops lasted longer before selling out." }
];

/* Photography (Unsplash). If offline or a URL fails, the SVG garment art underneath shows instead. */
const U = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=85`;
const IMG = {
  1: "1521572163474-6864f9cf17ab", 2: "1503342217505-b0a15ec3261c", 3: "1596755094514-f87e34085b2c",
  4: "1556821840-3a63f95609a7", 5: "1618354691373-d851c5c3a990", 6: "1576566588028-4147f3842f27",
  7: "1594633312681-425c7b97ccd1", 8: "1541099649105-f69ad21f3246", 9: "1509551388413-e18d0ac5d495",
  10: "1548126032-079a0fb0099d", 11: "1539533018447-63fcce2678e3", 12: "1588850561407-ed78c282e89b", 13: "1588850561407-ed78c282e89b"
};
const imgOf = p => p.img || (IMG[p.id] ? U(IMG[p.id]) : "");

/* ---- Catalogue extras: aesthetics, descriptions, colours, sizes (admin-added products can override any of these) ---- */
SEED_PRODUCTS.push(
  { id: 14, name: "Heritage Knit Polo",  cat: "Tees",        aes: "Old Money", price: 48000, stock: 16, color: "#e8e4d8", isNew: true },
  { id: 15, name: "Tailored Wool Blazer", cat: "Jackets",     aes: "Old Money", price: 65000, stock: 10, color: "#3b3b36", featured: true },
  { id: 16, name: "Pleated Trouser",      cat: "Pants",       aes: "Formal",    price: 41000, stock: 18, color: "#2b2b2b" },
  { id: 17, name: "Oxford Dress Shirt",   cat: "Tees",        aes: "Formal",    price: 33000, stock: 25, color: "#f2f2f2" },
  { id: 18, name: "Everyday Canvas Tote", cat: "Accessories", aes: "Vintage",   price: 22000, stock: 30, color: "#c8b9a5", isNew: true },
  { id: 19, name: "Mini Crossbody Bag",   cat: "Accessories", aes: "Y2K",       price: 28000, stock: 14, color: "#ff3d00" }
);
Object.assign(IMG, { 14: "1618354691373-d851c5c3a990", 15: "1591047139829-d91aecb6caea", 16: "1591195853828-11db59a44f6b", 17: "1596755094514-f87e34085b2c", 18: "1590874103328-eac38a683ce7", 19: "1584917865442-de89df76afd3" });
const AES = { 1: "Streetwear", 2: "Y2K", 3: "Streetwear", 4: "Streetwear", 5: "Athleisure", 6: "Vintage", 7: "Streetwear", 8: "Y2K", 9: "Athleisure", 10: "Vintage", 11: "Athleisure", 12: "Y2K", 13: "Streetwear" };
const DESC = {
  Tees: "Heavyweight cotton with a boxy, drop-shoulder fit. Pre-washed so it's soft from day one and holds its shape wash after wash.",
  Hoodies: "Brushed-back fleece with a roomy hood and dropped shoulders. Built heavy, cut oversized.",
  Pants: "Relaxed through the leg with a clean taper. Mid-weight fabric that drapes and moves with you.",
  Jackets: "A structured outer layer with a clean silhouette and durable hardware. Made to be worn on repeat.",
  Caps: "Six-panel cap with a curved brim and adjustable strap. One size fits most.",
  Accessories: "Everyday carry in durable fabric, finished with clean stitching and minimal branding."
};
const aesOf = p => p.aes || AES[p.id] || "Streetwear";
const descOf = p => p.desc || DESC[p.cat] || "Limited-run VOLT piece, cut and sewn in Lagos.";
const colorsOf = p => (p.colors && p.colors.length) ? p.colors : [{ n: "Signature", h: p.color || "#c8ff00" }, { n: "Black", h: "#111111" }, { n: "Bone", h: "#e8e4d8" }];
const sizesOf = p => ["Caps", "Accessories"].includes(p.cat) ? ["One size"] : SIZES;
