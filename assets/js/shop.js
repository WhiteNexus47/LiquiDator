let allProducts = [];
let filteredProducts = [];
let currentPage = 1;

window.addEventListener("DOMContentLoaded", async () => {
  allProducts = await loadProducts();
  filteredProducts = allProducts;

  renderProductsPage();
  setupShopControls();
  renderRecentlyViewed();
});

window.addEventListener("storage", (e) => {
  if (e.key === "recentlyViewed") renderRecentlyViewed();
});

function renderProductsPage(page = currentPage) {
  currentPage = page;
  const perPage = 12;
  const productContainer = document.getElementById("shopProductList");
  const paginationEl = document.getElementById("pagination");
  const noResultsContainer = document.getElementById("noResults");

  if (!filteredProducts.length) {
    productContainer.innerHTML = "";
    paginationEl.innerHTML = "";
    noResultsContainer.style.display = "flex";
    return;
  }

  noResultsContainer.style.display = "none";
  const itemsToShow = paginate(filteredProducts, page, perPage);
  renderProducts(itemsToShow, "shopProductList");
  hydrateRatings(itemsToShow);

  renderPagination(
    filteredProducts.length,
    perPage,
    "pagination",
    (page) => {
      currentPage = page;
      renderProductsPage(page);
    },
    page
  );
}

function renderRecentlyViewed() {
  const container = document.getElementById("recentList");
  const wrapper = document.getElementById("recentlyViewed");

  if (!container || !wrapper) return;

  const viewed = JSON.parse(localStorage.getItem("recentlyViewed")) || [];

  if (!viewed.length) {
    wrapper.style.display = "none";
    return;
  }

  wrapper.style.display = "block";

  container.innerHTML = viewed
    .map(
      (item) => `
      <div class="recent-item" onclick="openProduct(${item.id})">
        <img src="${item.image}" loading="lazy" alt="${item.name}">
        <div class="recent-info">
          <span>${item.name.slice(0, 28)}...</span>
          <small>$${item.price}</small>
        </div>
      </div>
    `
    )
    .join("");
}

function setupShopControls() {
  currentPage = 1;
  const filterBtn = document.getElementById("filterBtn");
  const categoryBtn = document.getElementById("categoryBtn");

  const filterPanel = document.getElementById("filterPanel");
  const categoryPanel = document.getElementById("categoryPanel");

  const inStockOnly = document.getElementById("inStockOnly");
  const lowToHigh = document.getElementById("LowToHigh");
  const newestFirst = document.getElementById("NewestFirst");
  const oldestFirst = document.getElementById("OldestFirst");
  const AtoZ = document.getElementById("AtoZ");
  const premiumOnly = document.getElementById("PremiumOnly");
  const trendingOnly = document.getElementById("TrendingOnly");

  const SORT_GROUP = [lowToHigh, newestFirst, oldestFirst, AtoZ];

  function uncheckOthers(current) {
    SORT_GROUP.forEach((cb) => {
      if (cb !== current) cb.checked = false;
    });
  }

  function closeAllDropdowns() {
    filterPanel.style.display = "none";
    categoryPanel.style.display = "none";
  }

  function applyAllFilters(initial = null) {
    let result = Array.isArray(initial) ? initial.slice() : [...allProducts];

    // In Stock
    if (inStockOnly.checked) {
      result = result.filter((p) => p.inStock === true);
    }

    // Premium
    if (premiumOnly.checked) {
      result = result.filter((p) => p.premium === true);
    }

    // Trending
    if (trendingOnly.checked) {
      result = result.filter((p) => p.trending === true);
    }

    // Sorting
    if (lowToHigh.checked) {
      result.sort((a, b) => a.price - b.price);
    }

    if (newestFirst.checked) {
      result.sort((a, b) => (b.created || 0) - (a.created || 0));
    }

    if (oldestFirst.checked) {
      result.sort((a, b) => (a.created || 0) - (b.created || 0));
    }

    if (AtoZ.checked) {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    filteredProducts = result;
    renderProductsPage(1);
  }

  [inStockOnly, premiumOnly, trendingOnly].forEach((cb) => {
    cb.addEventListener("change", applyAllFilters);
  });

  // Sorting checkboxes (mutually exclusive)
  SORT_GROUP.forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) uncheckOthers(cb);
      applyAllFilters();
    });
  });

  filterBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    if (filterPanel.style.display === "block") {
      closeAllDropdowns();
    } else {
      categoryPanel.style.display = "none";
      filterPanel.style.display = "block";
    }
  });

  categoryBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    if (categoryPanel.style.display === "block") {
      closeAllDropdowns();
    } else {
      filterPanel.style.display = "none";
      categoryPanel.style.display = "block";
    }
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (
      !e.target.closest(".dropdown-panel") &&
      !e.target.closest(".drop-btn")
    ) {
      closeAllDropdowns();
    }
  });

  // ===== APPLY PRICE FILTER =====
  document.getElementById("applyFilter").addEventListener("click", () => {
    const min = Number(document.getElementById("minPrice").value) || 0;
    const max = Number(document.getElementById("maxPrice").value) || Infinity;

    const priceFiltered = allProducts.filter(
      (p) => p.price >= min && p.price <= max
    );

    // Re-use the main applyAllFilters flow so price combines with other checkboxes/sorts
    applyAllFilters(priceFiltered);
    closeAllDropdowns();
    closeSidebar();
  });

  // ===== CATEGORY FILTER =====
  document.querySelectorAll("#categoryPanel span").forEach((span) => {
    span.addEventListener("click", () => {
      const cat = span.dataset.cat;

      if (cat == "all") {
        filteredProducts = [...allProducts];
      } else {
        filteredProducts = allProducts.filter((p) => p.tag === cat);
      }

      renderProductsPage(1);
      closeAllDropdowns();
      closeSidebar();
    });
  });

  // ===== SEARCH =====
  const shopSearch = document.getElementById("shopSearch");
  const liveResults = document.getElementById("liveResults");
  const openBtn = document.getElementById("openSidebarBtn");
  const sidebar = document.getElementById("shopSidebar");
  const closeBtn = document.getElementById("closeSidebarBtn");

  closeBtn.addEventListener("click", closeSidebar);

  openBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
    document.body.classList.toggle("no-scroll");
  });

  function closeSidebar() {
    sidebar.classList.remove("active");
    document.body.classList.remove("no-scroll");
  }

  // Debounce searches to avoid re-render storm while typing
  function debounce(fn, wait = 200) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  shopSearch.addEventListener(
    "input",
    debounce(() => {
      const text = shopSearch.value.toLowerCase().trim();

      if (text === "") {
        liveResults.style.display = "none";
        filteredProducts = allProducts;
        renderProductsPage();
        return;
      }

      const results = allProducts.filter((p) =>
        p.name.toLowerCase().includes(text)
      );

      if (results.length === 0) {
        liveResults.innerHTML = `<div class="live-empty">No results found</div>`;
        filteredProducts = [];
        renderProductsPage();
        liveResults.style.display = "block";
        return;
      }

      liveResults.innerHTML = results
        .slice(0, 6)
        .map(
          (r) => `
        <div class="live-item" data-name="${r.name}">
          ${r.name}
        </div>
      `
        )
        .join("");

      liveResults.style.display = "block";

      filteredProducts = results;
      renderProductsPage();
    })
  );

  shopSearch.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      liveResults.style.display = "none";
      closeSidebar();
    }
  });

  // Click handler for live results (added once)
  liveResults.addEventListener("click", (e) => {
    const item = e.target.closest(".live-item");
    if (!item) return;

    shopSearch.value = item.dataset.name;
    liveResults.style.display = "none";
    closeSidebar();
  });

  // Close live results when clicking outside
  document.addEventListener("click", (e) => {
    if (!shopSearch.contains(e.target)) {
      liveResults.style.display = "none";
    }
  });

  // When cart changes elsewhere, re-render products to update 'Added' state
  window.addEventListener("cartUpdated", () => {
    renderProductsPage(currentPage);
    if (typeof updateCartBadge === "function") updateCartBadge();
  });
}
