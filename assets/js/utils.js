async function loadProducts() {
  const response = await fetch("data/product.json");
  return await response.json();
}

async function renderProducts(items, containerId) {
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

  // Build HTML by fetching ratings per item sequentially to avoid
  // a race of unresolved promises inside .map()
  const parts = [];
  for (const item of items) {
    let rating = 0;
    let count = 0;
    try {
      const res = await getProductRating(item.id);
      rating = res.rating || 0;
      count = res.count || 0;
    } catch (e) {
      // ignore and show zeros
    }

    parts.push(
      (() => {
        // Truncate name
        const rawName = String(item.name || "Untitled");
        const name = (
          rawName.length > 16 ? rawName.slice(0, 40).trim() + "..." : rawName
        ).toUpperCase();

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
      <article class="product-card" data-product-id="${
        item.id
      }" onclick="openProduct(${item.id})" tabindex="0">

        <div class="p-media">
          <img src="${item.image}" alt="${name}" />
          <!-- Share Button -->
          <button class="p-share-btn" title="Share Product" onclick="event.stopPropagation(); shareProduct(${
            item.id
          })">
            <i class='bx  bx-paper-plane'></i> 
          </button>
        </div>

        <div class="p-body">
          ${tag}
          <h3 class="p-name">${name}</h3>

          <div class="p-rating-box">
            <span class="rating-value">${(rating || 0).toFixed(
              1
            )}<p class="star" style="display:inline; color: gold;">★</p></span>
            <span class="rating-count">| ${count}</span>
          </div>

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
      })()
    );
  }

  container.innerHTML = parts.join("");
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

  // Limit to 6 items
  viewed = viewed.slice(0, 6);

  localStorage.setItem("recentlyViewed", JSON.stringify(viewed));
}

async function shareProduct(id) {
  const list = await loadProducts();
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
    const list = await loadProducts();
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

function renderAverage(reviews) {
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  const avg = reviews.length ? (total / reviews.length).toFixed(1) : "—";

  // Prefer dedicated ID if present, otherwise update summary UI on product page
  const el = document.querySelector("#ratingAverage");
  if (el) {
    el.innerHTML = `<span class="avg-rating">${avg}</span><span> | ${reviews.length} reviews</span>`;
    return;
  }

  const avgEl = document.querySelector(".reviews-summary .avg-rating");
  const countEl = document.querySelector(".reviews-summary .review-count");
  if (avgEl) avgEl.textContent = reviews.length ? `${avg}` : "—";
  if (countEl) countEl.textContent = `Based on ${reviews.length} reviews`;
}

async function getProductRating(productId) {
  if (typeof supabase === "undefined" || !supabase) {
    return { rating: 0, count: 0 };
  }
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("product_id", productId);
  if (error || !data || !data.length) {
    return { rating: 0, count: 0 };
  }

  const total = data.reduce((s, r) => s + r.rating, 0);
  const avg = total / data.length;

  return {
    rating: avg,
    count: data.length,
  };
}

window.addEventListener("reviewAdded", async (e) => {
  const productId = e.detail.productId;

  // Find the card for this product
  const card = document.querySelector(
    `.product-card[onclick*="(${productId})"]`
  );

  if (!card) return;

  // Re-fetch rating
  const { rating, count } = await getProductRating(productId);

  // Update UI
  const ratingBox = card.querySelector(".p-rating-box");
  if (ratingBox) {
    ratingBox.innerHTML = `
      <span class="rating-value">
        ${rating.toFixed(1)}
        <span class="star" style="color: gold;">★</span>
      </span>
      <span class="rating-count">| ${count}</span>
    `;
  }
});
