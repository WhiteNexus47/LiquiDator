/* =============================
   LOAD HEADER & FOOTER
============================= */
async function loadComponent(id, file) {
  const el = document.getElementById(id);
  if (!el) return;

  const response = await fetch(file);
  const html = await response.text();
  el.innerHTML = html;
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadComponent("header", "components/header.html");
  await loadComponent("footer", "components/footer.html");

  initCartButton();

  try {
    const productList = await loadProducts();
    const latest = productList.slice(-4); // last items
    renderProducts(latest, "latestList");
  } catch (err) {
    console.warn("Could not load products for latest list", err);
  }

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  initHeaderScroll();
  initMenuToggle();
  initActiveNavLinks();
  initBackToTop();
  initSlideshow();
  adjustArrows();
});

/* =============================
   SHOP CONTROLS SCROLL BEHAVIOR
   - when user scrolls past threshold, the controls get
     `.scrolled-controls` and positioned below the header
   - if mobile menu is open, keep controls hidden behind it
============================= */
/* (shop controls scroll behavior removed) */

function initCartButton() {
  const cartBtn = document.getElementById("cart-btn");
  if (!cartBtn) return;

  cartBtn.addEventListener("click", () => {
    window.location.href = "cart.html";
  });

  updateCartBadge();
}

/* =============================
   HEADER SCROLL EFFECT
============================= */
function initHeaderScroll() {
  const header = document.getElementById("main-header");
  if (!header) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 70) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });
}

/* =============================
   ACTIVE NAV LINKS
   - mark the current page link as active for accessibility
============================= */
function initActiveNavLinks() {
  const links = document.querySelectorAll(".nav-desktop a, .nav-mobile a");
  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  links.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const hrefPath = href.split("/").pop() || "index.html";

    if (hrefPath === currentPath) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    } else {
      link.classList.remove("active");
      link.removeAttribute("aria-current");
    }
  });
}

/* =============================
   MOBILE MENU TOGGLE
============================= */
function initMenuToggle() {
  const menuBtn = document.getElementById("menuToggle");
  const mobileMenu = document.getElementById("mobileMenu");

  if (!menuBtn || !mobileMenu) return;

  // Toggle open/close
  menuBtn.addEventListener("click", () => {
    menuBtn.classList.toggle("active");
    mobileMenu.classList.toggle("open");
  });

  // Close when clicking any link inside mobile menu
  document.querySelectorAll(".nav-mobile a").forEach((link) => {
    link.addEventListener("click", () => {
      menuBtn.classList.remove("active");
      mobileMenu.classList.remove("open");
    });
  });
}

// =====================
// REDUCE SLIDE ARROWS ON SMALL DEVICES
// =====================
function adjustArrows() {
  const arrows = document.querySelectorAll(".slide-arrow");

  if (window.innerWidth <= 600) {
    arrows.forEach((a) => {
      a.style.fontSize = "1.5rem";
      a.style.padding = "3px 6px";
    });
  } else {
    arrows.forEach((a) => {
      a.style.fontSize = "";
      a.style.padding = "";
    });
  }
}
window.addEventListener("resize", adjustArrows);

/* =============================
   BACK TO TOP BUTTON
============================= */
function initBackToTop() {
  let btn = document.createElement("button");
  btn.id = "backToTop";
  btn.textContent = "↑";
  btn.style.display = "none";
  document.body.appendChild(btn);

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", () => {
    btn.style.display = window.scrollY > 300 ? "flex" : "none";
  });
}

/* =============================
   HERO SLIDESHOW
============================= */
function initSlideshow() {
  const slides = document.querySelectorAll(".hero-slideshow .slide");
  if (slides.length === 0) return; // No slideshow on this page

  const nextBtn = document.querySelector(".slide-arrow.right");
  const prevBtn = document.querySelector(".slide-arrow.left");

  let index = 0;

  function showSlide(n) {
    slides.forEach((slide) => slide.classList.remove("current"));
    slides[n].classList.add("current");
  }

  function nextSlide() {
    index = (index + 1) % slides.length;
    showSlide(index);
  }

  function prevSlide() {
    index = (index - 1 + slides.length) % slides.length;
    showSlide(index);
  }

  if (nextBtn) nextBtn.addEventListener("click", nextSlide);
  if (prevBtn) prevBtn.addEventListener("click", prevSlide);

  // Auto change slide every 6 seconds
  setInterval(nextSlide, 6000);
}
