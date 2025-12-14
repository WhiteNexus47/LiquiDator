async function loadProducts() {
  const response = await fetch("data/product.json");
  return await response.json();
}

function renderProducts(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `
			<div class="no-results">
				<h3>No products found</h3>
			</div>
		`;
    return;
  }

  const currentCart = JSON.parse(localStorage.getItem("cart")) || [];

  container.innerHTML = items
    .map((item) => {
      // Truncate name
      const rawName = String(item.name || "Untitled");
      const name =
        rawName.length > 16 ? rawName.slice(0, 20).trim() + "..." : rawName;

      // Price & old price
      const price = item.price != null ? item.price : "-";
      const oldPrice = item.oldPrice || null;

      let discountHTML = "";
      if (oldPrice && oldPrice > price) {
        const discount = Math.round((1 - price / oldPrice) * 100);
        discountHTML = `
        <div class="p-discount">
          <span class="p-discount-arrow">▼ ${discount}%</span>
          <span class="p-old-price">$${oldPrice}</span>
        </div>
      `;
      }

      // Ratings
      const rating = item.rating || 0;
      const ratingCount = item.ratingCount || 0;

      // Tag
      const tag = item.tag ? `<span class="p-tag">${item.tag}</span>` : "";

      // Cart state
      const inCart = currentCart.find((c) => c.id === item.id);
      const btnText = inCart ? "Remove" : "Add To Cart";
      // Inline onclick action for the button (string inserted into template)
      const btnAction = inCart
        ? `removeFromCartById(${item.id})`
        : `addToCartById(${item.id})`;
      const addedClass = inCart ? " added" : "";

      return `
      <article class="product-card" onclick="openProduct(${
        item.id
      })" tabindex="0">

        <div class="p-media">
          <img src="${item.image}" alt="${name}" />
          <!-- Share Button -->
          <button class="p-share-btn" title="Share Product" onclick="event.stopPropagation(); shareProduct(${
            item.id
          })">
            <i class='bx  bx-paper-plane'></i> 
          </button>
          <!-- ★ Rating Box -->
          <div class="p-rating-box">
            <span class="rating-value">${rating.toFixed(
              1
            )}<p class="star" style="display:inline; color: gold;">★</p></span>
            <span class="rating-count">| ${ratingCount}</span>
          </div>
        </div>

        <div class="p-body">
          ${tag}
          <h3 class="p-name">${name}</h3>

          <div class="p-price-box">
            ${discountHTML}
            <span class="price">$${price}</span>
          </div>

          <div class="p-actions">
            <button class="add-btn${addedClass}"
              onclick="event.stopPropagation(); ${btnAction}">${btnText}</button>
          </div>
        </div>

      </article>
    `;
    })
    .join("");
}

function addRecentlyViewed(product) {
  let viewed = JSON.parse(localStorage.getItem("recentlyViewed")) || [];

  // Remove duplicates
  viewed = viewed.filter((p) => p.id !== product.id);

  // Add to top
  viewed.unshift({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.image,
  });

  // Limit to 4 items
  viewed = viewed.slice(0, 6);

  localStorage.setItem("recentlyViewed", JSON.stringify(viewed));
}

async function shareProduct(id) {
  const data = await fetch("data/product.json");
  const list = await data.json();
  const item = list.find((p) => p.id == id);

  if (!item) return;

  const productUrl = window.location.origin + "/product.html?id=" + id;
  const shopUrl = window.location.origin;

  const message = `${item.name}
Price: $${item.price}
${item.description}
${item.highlights ? item.highlights.map((p) => "• " + p).join("\n") : ""}
View product:
${productUrl}

Visit shop:
${shopUrl}
`;

  // Share image, text, links if supported
  if (navigator.share) {
    try {
      await navigator.share({
        title: item.name,
        text: message,
        url: productUrl,
      });
      return;
    } catch (err) {}
  }

  // Fallback (WhatsApp)
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
}

async function addToCartById(id) {
  try {
    const data = await fetch("data/product.json");
    const list = await data.json();
    const item = list.find((p) => p.id == id);
    if (!item) return alert("Product not found");

    if (typeof addToCart === "function") {
      addToCart(item);
    } else {
      let cart = JSON.parse(localStorage.getItem("cart")) || [];
      const existing = cart.find((c) => c.id === item.id);
      if (existing) existing.qty += 1;
      else cart.push({ ...item, qty: 1 });
      localStorage.setItem("cart", JSON.stringify(cart));
    }

    updateCartBadge();

    const btn = document.querySelector(`button.add-btn[onclick*="(${id})"]`);
    if (btn) {
      btn.textContent = "Remove";
      btn.classList.add("added");
      btn.disabled = false;
      btn.setAttribute(
        "onclick",
        `event.stopPropagation(); removeFromCartById(${id})`
      );
    }
    try {
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (e) {}
  } catch (err) {
    console.error(err);
    alert("Could not add to cart");
  }
}

function removeFromCartById(id) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart = cart.filter((c) => c.id !== id);
  localStorage.setItem("cart", JSON.stringify(cart));

  updateCartBadge();
  window.dispatchEvent(new Event("cartUpdated"));

  // Update button UI live
  const btn = document.querySelector(`button.add-btn[onclick*="${id}"]`);
  if (btn) {
    btn.textContent = "Add To Cart";
    btn.classList.remove("added");
    btn.setAttribute(
      "onclick",
      `event.stopPropagation(); addToCartById(${id})`
    );
  }
}

function updateCartBadge() {
  const badge = document.getElementById("cart-count");
  const totalEl = document.getElementById("cart-total");

  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (badge) badge.textContent = cart.length;

  if (totalEl) {
    const total = cart.reduce((sum, c) => {
      const price = Number(c.price) || 0;
      const qty = Number(c.qty) || 1;
      return sum + price * qty;
    }, 0);

    // Format: no cents if whole number, otherwise two decimals
    const formatted =
      total % 1 === 0 ? total.toLocaleString() : total.toFixed(2);
    totalEl.textContent = `$${formatted}`;
  }
}

window.addEventListener("cartUpdated", () => {
  updateCartBadge();
});

window.addEventListener("storage", (e) => {
  if (e.key === "cart") updateCartBadge();
});

function qs(selector) {
  return document.querySelector(selector);
}
