/* =============================
  PAGE INITIALIZATION
============================= */
let product = null;
let pageProducts = [];

window.addEventListener("DOMContentLoaded", async () => {
  await loadComponent("header", "components/header.html");
  await loadComponent("footer", "components/footer.html");

  initCartButton();
  // Ensure header badge is in sync after header is injected
  if (typeof updateCartBadge === "function") updateCartBadge();

  pageProducts = await loadProducts();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  product = pageProducts.find((p) => p.id == id);

  if (!product) return;

  renderProduct();
  renderVariants();
  renderSimilar();
  updateAddBtnState();
});

/* =============================
   RENDER PRODUCT DETAILS
============================= */
function renderProduct() {
  document.getElementById("mainImage").src = product.image;
  document.getElementById("productName").textContent = product.name;
  document.getElementById("productDesc").textContent = product.description;
  document.getElementById("productTag").textContent = product.tag;
  addRecentlyViewed(product);

  const highlightsBox = document.getElementById("productHighlights");
  highlightsBox.innerHTML = "";

  if (product.highlights && product.highlights.length) {
    product.highlights.forEach((point) => {
      const li = document.createElement("li");
      li.textContent = point;
      highlightsBox.appendChild(li);
    });
  }
  /* PRICE + DISCOUNT */
  const priceBox = document.getElementById("priceBox");

  let discountHTML = "";
  if (product.oldPrice && product.oldPrice > product.price) {
    const discount = Math.round((1 - product.price / product.oldPrice) * 100);

    discountHTML = `
      <span class="discount-badge">▼ ${discount}%</span>
      <span class="old-price">$${product.oldPrice}</span>
    `;
  }

  priceBox.innerHTML = `
    ${discountHTML}
    <span class="product-price">$${product.price}</span>
  `;

  /* SAVE CALCULATION */
  const saveBox = document.getElementById("saveBox");
  if (product.oldPrice && product.oldPrice > product.price) {
    const saved = product.oldPrice - product.price;
    const percent = Math.round((saved / product.oldPrice) * 100);
    saveBox.textContent = `You save $${saved} (${percent}%)`;
  } else {
    saveBox.style.display = "none";
  }

  /* QTY SELECTOR */
  let qty = 1;
  const qtyValue = document.getElementById("qtyValue");
  const btn = document.getElementById("addToCartBtn");
  const mobileBtn = document.getElementById("mobileCartBtn");
  qtyValue.textContent = qty;

  document.getElementById("qtyPlus").onclick = () => {
    qty++;
    qtyValue.textContent = qty;
  };

  document.getElementById("qtyMinus").onclick = () => {
    if (qty > 1) qty--;
    qtyValue.textContent = qty;
  };

  const handleCartAction = () => {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const exists = cart.find((c) => c.id === product.id);

    if (exists) {
      // Remove product from cart
      cart = cart.filter((c) => c.id !== product.id);
      localStorage.setItem("cart", JSON.stringify(cart));
      updateCartBadge();
      updateAddBtnState();
      return;
    }

    // Add selected quantity
    for (let i = 0; i < qty; i++) addToCart(product);
    updateAddBtnState();
  };

  if (btn) btn.onclick = handleCartAction;
  if (mobileBtn) mobileBtn.onclick = handleCartAction;

  const rating = product.rating || 0;
  const ratingCount = product.ratingCount || 0;

  document.getElementById("ratingBox").innerHTML = `
    ${rating.toFixed(1)} ★ | ${ratingCount}
  `;

  updateAddBtnState();
}

function updateAddBtnState() {
  const btn = document.getElementById("addToCartBtn");
  const mobileBtn = document.getElementById("mobileCartBtn");

  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const inCart = cart.find((c) => c.id === product.id);

  if (inCart) {
    // Desktop button
    btn.textContent = "Remove";
    btn.disabled = false;
    btn.style.background = "white";
    btn.style.color = "var(--brown)";
    btn.style.border = "1px solid var(--brown)";

    // Mobile button
    if (mobileBtn) {
      mobileBtn.textContent = "Remove";
      mobileBtn.classList.add("remove");
    }
  } else {
    // Desktop button
    btn.textContent = "Add to Cart";
    btn.disabled = false;
    btn.style.background = "var(--brown)";
    btn.style.color = "white";
    btn.style.border = "none";

    // Mobile button
    if (mobileBtn) {
      mobileBtn.textContent = "Add to Cart";
      mobileBtn.classList.remove("remove");
    }
  }
}

function renderVariants() {
  const list = document.getElementById("variantList");
  list.innerHTML = "";

  const variants = product.variants?.length
    ? product.variants
    : [product.image];

  variants.forEach((src) => {
    const img = document.createElement("img");
    img.src = src;

    img.onclick = () => smoothImageSwitch(src);

    list.appendChild(img);
  });
}

function smoothImageSwitch(newSrc) {
  const main = document.getElementById("mainImage");
  main.style.opacity = 0;
  setTimeout(() => {
    main.src = newSrc;
    main.style.opacity = 1;
  }, 100);
}

function renderSimilar() {
  const container = document.getElementById("similarList");

  const similar = pageProducts.filter(
    (p) => p.tag === product.tag && p.id !== product.id
  );

  container.innerHTML = similar
    .map((item) => {
      let discountHTML = "";
      if (item.oldPrice && item.oldPrice > item.price) {
        const discount = Math.round((1 - item.price / item.oldPrice) * 100);
        discountHTML = `<span class="sim-discount">-${discount}%</span>`;
      }

      return `
      <article class="sim-card" onclick="openProduct(${item.id})">

        <div class="sim-media">
          ${discountHTML}
          <img src="${item.image}" alt="${item.name}" />
          <button class="sim-view">View</button>
        </div>

        <div class="sim-body">
          <h4>${item.name.slice(0, 38)}...</h4>
          <div class="sim-price">
            ${item.oldPrice ? `<span class="old">$${item.oldPrice}</span>` : ""}
            <span class="new">$${item.price}</span>
          </div>
        </div>

      </article>
    `;
    })
    .join("");
}

function openProduct(id) {
  window.location.href = `product.html?id=${id}`;
}

function addToCart(item) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  const existing = cart.find((c) => c.id === item.id);

  if (existing) {
    existing.qty += 1; // increment quantity
  } else {
    cart.push({ ...item, qty: 1 });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartBadge();
}
