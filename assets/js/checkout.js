// ============================
// CHECKOUT PAGE SCRIPT (FINAL)
// ============================
// Requires window.CONFIG to be loaded by main.js
let pendingOrder = null;
let loadingTimeout = null;

function scrollToField(el) {
  if (!el) return;
  const container =
    document.getElementById("leftInfoMain") ||
    document.querySelector(".left-info-main");

  if (container && container.scrollHeight > container.clientHeight) {
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();

    container.scrollBy({
      top: eRect.top - cRect.top - container.clientHeight / 2,
      behavior: "smooth",
    });
  } else {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  el.focus({ preventScroll: true });
}

// Form refs
let cFirstName, cLastName, cEmail, cStreet, cCity, cZip, cCountry, cAdditional;

const FIELDS_TO_SAVE = [
  "cFirstName",
  "cLastName",
  "cEmail",
  "cCountry",
  "cStreet",
  "cCity",
  "cZip",
];

window.addEventListener("DOMContentLoaded", async () => {
  if (window.configReady) {
    await window.configReady;
  }

  FIELDS_TO_SAVE.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("input", () => {
      const saved = JSON.parse(localStorage.getItem("checkoutInfo")) || {};
      saved[id] = el.value;
      localStorage.setItem("checkoutInfo", JSON.stringify(saved));
    });
  });

  // Absolute safety fallback
  window.CONFIG = window.CONFIG || {};

  cFirstName = document.getElementById("cFirstName");
  cLastName = document.getElementById("cLastName");
  cEmail = document.getElementById("cEmail");
  cStreet = document.getElementById("cStreet");
  cCity = document.getElementById("cCity");
  cZip = document.getElementById("cZip");
  cCountry = document.getElementById("cCountry");
  cAdditional = document.getElementById("cAdditional");

  const savedInfo = JSON.parse(localStorage.getItem("checkoutInfo")) || {};
  Object.entries(savedInfo).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = value;
  });

  renderCheckoutItems();
  updateTotal();
  if (typeof updateCartBadge === "function") {
    updateCartBadge();
  }
  hideLoading();
  disableCheckoutButtons(false);

  const placeBtn = document.getElementById("placeOrderBtn");
  if (placeBtn) placeBtn.addEventListener("click", openModal);

  const emailBtn = document.getElementById("sendEmailBtn");
  if (emailBtn) {
    emailBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      sendOrder("email");
    });
  }

  const waBtn = document.getElementById("sendWhatsappBtn");
  if (waBtn) {
    waBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      sendOrder("whatsapp");
    });
  }
});

function showFieldError(input, message) {
  clearFieldError(input);

  input.classList.add("input-error");

  const error = document.createElement("div");
  error.className = "field-error";
  error.textContent = message;

  const parent = input.closest(".input-group, .name-field") || input.parentElement || document.body;
  parent.appendChild(error);
}

function clearFieldError(input) {
  if (!input) return;

  input.classList.remove("input-error");

  const parent = input.closest(".input-group, .name-field");
  const existing = parent?.querySelector(".field-error");
  if (existing) existing.remove();
}

// ----------------------------
// Modal helpers
// ----------------------------
async function openModal() {
  // HARD STOP: do not proceed if validation fails
  const order = await buildOrderPayload();
  if (!order) return;

  console.log("openModal: built order", order);

  const ok = window.uiConfirm
    ? await uiConfirm("Do you want to place this order and proceed?", "Confirm Order")
    : confirm("Do you want to place this order and proceed?");
  if (!ok) return;

  pendingOrder = order;
  console.log("openModal: pendingOrder set", pendingOrder);
  document.getElementById("messageModal")?.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("messageModal")?.classList.add("hidden");
}

// ----------------------------
// Cart helpers
// ----------------------------
function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function renderCheckoutItems() {
  const container = document.getElementById("checkoutItems");
  if (!container) return;
  const cart = getCart();

  if (!cart.length) {
    container.innerHTML = `<p class="empty">Your cart is empty.</p>`;
    return;
  }

  container.innerHTML = cart
    .map(
      (item) => `
      <div class="checkout-row">
        <div class="img-box">
          <img src="${item.image}" alt="${item.name}">
          <span class="count">${item.qty}</span>
        </div>
        <div class="checkout-info">
          <h4>${item.name}</h4>
          <p>Qty: ${item.qty} × $${item.price}</p>
          <p class="subtotal">Subtotal: $${item.qty * item.price}</p>
        </div>
      </div>
    `
    )
    .join("");
}

function updateTotal() {
  const totalEl = document.getElementById("checkoutTotal");
  if (!totalEl) return;
  const cart = getCart();
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  totalEl.textContent = total.toFixed(2);
}

// ----------------------------
// Build order payload
// ----------------------------
async function buildOrderPayload() {
  const first = cFirstName.value.trim();
  const last = cLastName.value.trim();
  const email = cEmail.value.trim();
  const street = cStreet.value.trim();
  const city = cCity.value.trim();
  const zip = cZip.value.trim();
  const country = cCountry.value.trim();
  const additional = cAdditional.value.trim();

  const paymentMethod = document.querySelector(
    'input[name="paymentMethod"]:checked'
  )?.value;

  let valid = true;
  let firstInvalid = null;

  function invalidateField(input, message) {
    showFieldError(input, message);
    if (!firstInvalid) firstInvalid = input;
    valid = false;
  }

  // Clear previous errors
  [cFirstName, cLastName, cEmail, cStreet, cCity, cZip, cCountry].forEach(
    clearFieldError
  );

  if (!first) invalidateField(cFirstName, "First name is required");
  if (!last) invalidateField(cLastName, "Last name is required");
  if (!email) invalidateField(cEmail, "Email or contact is required");
  if (!country) invalidateField(cCountry, "Country is required");
  if (!street) invalidateField(cStreet, "Street address is required");
  if (!city) invalidateField(cCity, "City is required");
  if (!zip) invalidateField(cZip, "ZIP / Postcode is required");

  if (!valid) {
    scrollToField(firstInvalid);
    return null;
  }

  if (!paymentMethod) {
    await uiAlert("Please select a payment method.");
    const pm = document.querySelector(".payment-methods");
    if (pm) scrollToField(pm);
    return null;
  }

  const shippingConfirm = document.getElementById("shippingConfirm");
  const confirmWrapper =
    shippingConfirm?.closest(".delivery-confirm") ||
    document.querySelector(".delivery-confirm") ||
    document.body;

  // Remove previous error
  confirmWrapper.querySelector(".field-error")?.remove();

  if (!shippingConfirm || !shippingConfirm.checked) {
    const error = document.createElement("div");
    error.className = "field-error";
    error.textContent = "You must confirm shipping terms to proceed";
    confirmWrapper.appendChild(error);

    scrollToField(shippingConfirm || confirmWrapper);
    return null;
  }

  const cart = getCart();
  if (!cart.length) {
    await uiAlert("Your cart is empty.");
    return null;
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  return {
    orderId: "LD-" + Date.now(),
    date: new Date().toLocaleString(),
    currency: "USD",
    customer: {
      name: `${first} ${last}`,
      email,
    },
    address:
      `${street}, ${city}, ${zip}, ${country}` +
      (additional ? ` — ${additional}` : ""),
    paymentMethod,
    items: cart.map((i) => ({
      name: i.name,
      qty: i.qty,
      price: i.price,
    })),
    total: total.toFixed(2),
  };
}

// ----------------------------
// Canonical order message
// ----------------------------
function buildOrderMessage(order) {
  const itemLines = order.items
    .map((i) => `- ${i.name} × ${i.qty} = $${(i.price * i.qty).toFixed(2)}`)
    .join("\n");

  return `
NEW ORDER — Prime Liquidators

Order ID: ${order.orderId}
Order Date: ${order.date}

--------------------------------
CUSTOMER DETAILS
Name   : ${order.customer.name}
Email  : ${order.customer.email}

DELIVERY ADDRESS
${order.address}

PAYMENT METHOD
${order.paymentMethod}

ORDER ITEMS
${itemLines}

--------------------------------
ORDER TOTAL
TOTAL : $${order.total}

STATUS
Payment pending — we will confirm your order and shipping costs after verification.
`.trim();
}

// ----------------------------
// Send order
// ----------------------------
async function sendOrder(channel) {
  let order = pendingOrder;
  if (!order) {
    order = await buildOrderPayload();
    if (!order) return;
    pendingOrder = order;
  }

  closeModal();
  disableCheckoutButtons(true);
  showLoading();

  const message = buildOrderMessage(order);

  try {
    if (channel === "whatsapp") {
      openWhatsappOrder(message);
    }

    if (channel === "email") {
      openEmailOrder(message);
    }

      // Clear cart safely
    localStorage.removeItem("cart");
    // refresh UI
    renderCheckoutItems();
    updateTotal();
    if (typeof updateCartBadge === "function") updateCartBadge();

    // DO NOT force redirect immediately
    // Let the external app take over
    setTimeout(async () => {
      hideLoading();
      await uiAlert(
        "Order process initiated. Please complete the order in the opened app."
      );
      window.location.href = "shop.html";
    }, 1200);
  } catch (err) {
    hideLoading();
    disableCheckoutButtons(false);
    await uiAlert("Could not open email or WhatsApp.");
  }
}

function showLoading() {
  const overlay = document.getElementById("loadingOverlay");
  const cancelBtn = document.getElementById("loadingCancelBtn");
  const text = document.getElementById("loadingText");

  cancelBtn?.classList.add("hidden");
  if (text) text.textContent = "Processing your order…";

  overlay?.classList.remove("hidden");

  // After 10 seconds, allow escape
  loadingTimeout = setTimeout(() => {
    if (text) text.textContent = "This is taking longer than expected.";
    cancelBtn?.classList.remove("hidden");
  }, 10000);
}

function hideLoading() {
  clearTimeout(loadingTimeout);
  loadingTimeout = null;

  const overlay = document.getElementById("loadingOverlay");
  overlay?.classList.add("hidden");
}

function disableCheckoutButtons(disabled = true) {
  const place = document.getElementById("placeOrderBtn");
  const email = document.getElementById("sendEmailBtn");
  const wa = document.getElementById("sendWhatsappBtn");

  if (place) place.disabled = disabled;
  if (email) email.disabled = disabled;
  if (wa) wa.disabled = disabled;
}

function openWhatsappOrder(message) {
  const phone = window.CONFIG?.WHATSAPP_TO;
  if (!phone) {
    uiAlert("WhatsApp contact is not configured.");
    return;
  }

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

function openEmailOrder(message) {
  const email = window.CONFIG?.EMAIL_TO;
  if (!email) {
    uiAlert("Email contact is not configured.");
    return;
  }

  const subject = "New Order – Prime Liquidators";
  const body = encodeURIComponent(message);

  window.location.href = `mailto:${email}?subject=${encodeURIComponent(
    subject
  )}&body=${body}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const cancelBtn = document.getElementById("loadingCancelBtn");
  if (!cancelBtn) return;

  cancelBtn.addEventListener("click", () => {
    hideLoading();
    disableCheckoutButtons(false);
  });
});
