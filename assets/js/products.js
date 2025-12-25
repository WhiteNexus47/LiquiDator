/* =============================
  PAGE INITIALIZATION
============================ */
let product = null;
let pageProducts = [];
let selectedRating = 0; // single global rating state

window.addEventListener("DOMContentLoaded", async () => {
  // header/footer are loaded by main.js; avoid re-loading and duplicate handlers
  if (typeof updateCartBadge === "function") updateCartBadge();

  pageProducts = await loadProducts();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  product = pageProducts.find((p) => p.id == id);
  if (!product) return;

  renderProduct();
  await renderProductRating();
  renderVariants();
  renderSimilar();
  updateAddBtnState();

  // Initialize star input and load reviews
  initStarInput();
  await loadReviews();
  const openReviews = document.getElementById("openReviews");
  const dropReviews = document.getElementById("Dropreviews");

  openReviews.addEventListener("click", () => {
    openReviews.classList.toggle("open");
    dropReviews.classList.toggle("open");
  });
  openReviews.setAttribute("tabindex", "0");
  openReviews.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openReviews.click();
    }
  });
  // Wire review form submit (single place)
  const f = document.getElementById("reviewForm");
  if (f) {
    f.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("reviewName").value.trim();
      const email = document.getElementById("reviewEmail").value.trim();
      const reviewText = document.getElementById("reviewText").value.trim();

      if (!name || !email || !reviewText) {
        await uiAlert("Please fill all review fields.");
      }

      if (!selectedRating) {
        await uiAlert("Please select a rating.");
      }

      const productId = getProductId();
      if (!productId) await uiAlert("Product ID missing");

      try {
        // Insert as array for consistency
        const { data, error } = await supabase.from("reviews").insert([
          {
            product_id: Number(productId),
            name,
            email,
            rating: selectedRating,
            review: reviewText,
          },
        ]);

        if (error) throw error;

        // Reset UI
        f.reset();
        selectedRating = 0;
        highlightStars(0);

        // Reload reviews (this will also dispatch reviewAdded)
        await loadReviews();

        await uiAlert("Thank you — your review has been submitted.");
      } catch (err) {
        console.error("Review submit failed", err);
        await uiAlert("Could not submit review. Please try again later.");
      }
    });
  }
});

/* =============================
   RENDER PRODUCT DETAILS
============================ */
function renderProduct() {
  const mainImageEl = document.getElementById("mainImage");
  if (mainImageEl && product && product.image) mainImageEl.src = product.image;

  const productNameEl = document.getElementById("productName");
  if (productNameEl && product) productNameEl.textContent = product.name;

  const productDescEl = document.getElementById("productDesc");
  if (productDescEl && product) productDescEl.textContent = product.description;

  const productTagEl = document.getElementById("productTag");
  if (productTagEl && product) productTagEl.textContent = product.tag;
  addRecentlyViewed(product);

  const highlightsBox = document.getElementById("productHighlights");
  if (highlightsBox) {
    highlightsBox.innerHTML = "";
    if (product && product.highlights && product.highlights.length) {
      product.highlights.forEach((point) => {
        const li = document.createElement("li");
        li.textContent = point;
        highlightsBox.appendChild(li);
      });
    }
  }

  /* PRICE + DISCOUNT */
  const priceBox = document.getElementById("priceBox");
  if (priceBox) {
    let discountHTML = "";
    if (product && product.oldPrice && product.oldPrice > product.price) {
      const discount = Math.round((1 - product.price / product.oldPrice) * 100);
      discountHTML = `
      <span class="discount-badge">▼ ${discount}%</span>
      <span class="old-price">$${product.oldPrice}</span>
    `;
    }
    priceBox.innerHTML = `${discountHTML}<span class="product-price">$${product.price}</span>`;
  }

  /* SAVE CALCULATION */
  const saveBox = document.getElementById("saveBox");
  if (saveBox) {
    if (product && product.oldPrice && product.oldPrice > product.price) {
      const saved = product.oldPrice - product.price;
      const percent = Math.round((saved / product.oldPrice) * 100);
      saveBox.textContent = `You save $${saved} (${percent}%)`;
    } else {
      saveBox.style.display = "none";
    }
  }

  /* QTY SELECTOR */
  let qty = 1;
  const qtyValue = document.getElementById("qtyValue");
  const btn = document.getElementById("addToCartBtn");
  const mobileBtn = document.getElementById("mobileCartBtn");
  if (qtyValue) qtyValue.textContent = qty;

  const qtyPlus = document.getElementById("qtyPlus");
  const qtyMinus = document.getElementById("qtyMinus");
  if (qtyPlus)
    qtyPlus.onclick = () => {
      qty++;
      if (qtyValue) qtyValue.textContent = qty;
    };

  if (qtyMinus)
    qtyMinus.onclick = () => {
      if (qty > 1) qty--;
      if (qtyValue) qtyValue.textContent = qty;
    };

  const handleCartAction = () => {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const exists = cart.find((c) => c.id === product.id);

    if (exists) {
      cart = cart.filter((c) => c.id !== product.id);
      localStorage.setItem("cart", JSON.stringify(cart));
      updateCartBadge();
      updateAddBtnState();
      return;
    }

    for (let i = 0; i < qty; i++) addToCart(product);
    updateAddBtnState();
  };

  if (btn) btn.onclick = handleCartAction;
  if (mobileBtn) mobileBtn.onclick = handleCartAction;

  updateAddBtnState();
}

async function renderProductRating() {
  const productId = getProductId();
  if (!productId || typeof getProductRating !== "function") return;

  const { rating, count } = await getProductRating(Number(productId));

  const ratingBoxEl = document.getElementById("ratingBox");
  if (ratingBoxEl) {
    if (count && count > 0) {
      ratingBoxEl.innerHTML = `
        <span class="rating-value">${rating.toFixed(
          1
        )}<span style="color: gold">★</span></span>
        <span class="rating-count">| ${count}</span>
      `;
    } else {
      ratingBoxEl.innerHTML = `
        <span class="rating-value">—</span>
        <span class="rating-count">| 0</span>
      `;
    }
  }
}

function updateAddBtnState() {
  const btn = document.getElementById("addToCartBtn");
  const mobileBtn = document.getElementById("mobileCartBtn");

  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const inCart = cart.find((c) => c.id === product.id);

  if (inCart) {
    if (btn) {
      btn.textContent = "Remove";
      btn.disabled = false;
      btn.style.background = "white";
      btn.style.color = "var(--brown)";
      btn.style.border = "1px solid var(--brown)";
    }
    if (mobileBtn) {
      mobileBtn.textContent = "Remove";
      mobileBtn.classList.add("remove");
    }
  } else {
    if (btn) {
      btn.textContent = "Add to Cart";
      btn.disabled = false;
      btn.style.background = "var(--brown)";
      btn.style.color = "white";
      btn.style.border = "none";
    }
    if (mobileBtn) {
      mobileBtn.textContent = "Add to Cart";
      mobileBtn.classList.remove("remove");
    }
  }
}

function renderVariants() {
  const list = document.getElementById("variantList");
  if (!list) return;
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
  document
    .querySelectorAll(".variant-list img")
    .forEach((i) => i.classList.toggle("active", i.src === newSrc));

  if (!main) return;
  main.style.opacity = 0;
  setTimeout(() => {
    main.src = newSrc;
    main.style.opacity = 1;
  }, 100);
}

function renderSimilar() {
  const container = document.getElementById("similarList");
  if (!container) return;

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
          <img src="${item.image}" loading="lazy" alt="${item.name}" />
          <button class="sim-view">View</button>
        </div>
        <div class="sim-body">
          <h4>${item.name.slice(0, 60)}...</h4>
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
    existing.qty += 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartBadge();
}

/* =============================
   STAR RATING INPUT
============================ */
function initStarInput() {
  const container = document.getElementById("starInput");
  if (!container) return;

  container.innerHTML = "";

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.textContent = "★";
    star.dataset.value = i;

    // Hover preview
    star.addEventListener("mouseenter", () => highlightStars(i));

    // Click to select
    star.addEventListener("click", () => {
      selectedRating = i;
      highlightStars(i);
    });

    container.appendChild(star);
  }

  // Reset hover when leaving container
  container.addEventListener("mouseleave", () => {
    highlightStars(selectedRating);
  });
}

function highlightStars(rating) {
  document.querySelectorAll("#starInput span").forEach((star) => {
    const value = Number(star.dataset.value);
    star.classList.toggle("active", value <= rating);
  });
}

/* =============================
   REVIEWS: LOAD / RENDER
============================ */
async function loadReviews(productIdArg) {
  const productId = productIdArg ?? getProductId();
  if (!productId) return;

  const { data, error } = await supabase
    .from("reviews")
    .select("rating, review, name, created_at")
    .eq("product_id", Number(productId))
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Could not load reviews", error);
    return;
  }

  // Reset form UI if present (only on reload after submit)
  const f = document.getElementById("reviewForm");
  if (f) {
    try {
      f.reset();
    } catch (e) {}
    selectedRating = 0;
    highlightStars(0);
  }

  renderReviews(data || []);
  renderAverage(data || []);
  await renderProductRating();

  // Notify other parts of the site (product cards) that reviews changed
  window.dispatchEvent(
    new CustomEvent("reviewAdded", {
      detail: { productId: Number(productId) },
    })
  );
}

function renderReviews(reviews) {
  const container = document.querySelector("#reviewsList");
  if (!container) return;
  container.innerHTML = "";

  reviews.forEach((r) => {
    const div = document.createElement("div");
    div.className = "review";

    const strong = document.createElement("strong");
    strong.textContent = r.name || "Anonymous";

    const stars = document.createElement("div");
    stars.className = "review-stars";
    const rating = Number(r.rating) || 0;
    stars.textContent = rating.toFixed(1);

    const p = document.createElement("p");
    p.textContent = r.review || "";

    const small = document.createElement("small");
    const ts = r.created_at ? new Date(r.created_at) : new Date();
    small.textContent = ts.toLocaleDateString();

    div.appendChild(strong);
    div.appendChild(stars);
    div.appendChild(p);
    div.appendChild(small);

    container.appendChild(div);
  });
}

/* =============================
   FULLSCREEN IMAGE VIEW
============================ */
const modal = document.getElementById("imageModal");
const modalImg = document.getElementById("modalImage");

document.getElementById("mainImage")?.addEventListener("click", () => {
  if (!modal || !modalImg) return;
  modalImg.src = document.getElementById("mainImage").src;
  modal.classList.add("active");
});

modal?.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.remove("active");
});

document.querySelector(".image-close")?.addEventListener("click", () => {
  modal?.classList.remove("active");
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") modal?.classList.remove("active");
});

/* =============================
   VARIANT NAVIGATION
============================ */
document.querySelector(".variant-nav.prev")?.addEventListener("click", () => {
  document.getElementById("variantList").scrollBy({
    left: -120,
    behavior: "smooth",
  });
});

document.querySelector(".variant-nav.next")?.addEventListener("click", () => {
  document.getElementById("variantList").scrollBy({
    left: 120,
    behavior: "smooth",
  });
});

function renderStars(value) {
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += i <= Math.round(value) ? "★" : "☆";
  }
  return `<span class="stars">${stars}</span>`;
}

function getProductId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

/* =============================
   LISTENER: update product-card ratings when reviewAdded
   (this code expects utils.js to have registered this listener)
============================ */
// Note: reviewAdded handling for updating product-card ratings is provided
// centrally in `utils.js`. Removed duplicate listener here to avoid
// running the same update twice.
