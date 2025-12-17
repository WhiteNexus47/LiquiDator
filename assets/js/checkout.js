// ============================
// CHECKOUT PAGE SCRIPT (FINAL)
// ============================
// Requires window.CONFIG to be loaded by main.js
let pendingOrder = null;
let loadingTimeout = null;

// Form refs
let cFirstName, cLastName, cEmail, cStreet, cCity, cZip, cCountry, cAdditional;

window.addEventListener("DOMContentLoaded", async () => {

  if (window.configReady) {
    await window.configReady;
  }

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

  renderCheckoutItems();
  updateTotal();
  if (typeof updateCartBadge === "function") {
    updateCartBadge();
  }
  hideLoading();
  disableCheckoutButtons(false);

  document.getElementById("placeOrderBtn").addEventListener("click", openModal);

  document.getElementById("sendEmailBtn").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    sendOrder("email");
  });

  document.getElementById("sendWhatsappBtn").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    sendOrder("whatsapp");
  });
});

// ----------------------------
// Modal helpers
// ----------------------------
async function openModal() {
  // HARD STOP: do not proceed if validation fails
  const order = await buildOrderPayload();
  if (!order) return;

  console.log("openModal: built order", order);

  const ok = await uiConfirm(
    "Do you want to place this order and proceed?",
    "Confirm Order"
  );
  if (!ok) return;

  pendingOrder = order;
  console.log("openModal: pendingOrder set", pendingOrder);
  document.getElementById("messageModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("messageModal").classList.add("hidden");
}

// ----------------------------
// Cart helpers
// ----------------------------
function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function renderCheckoutItems() {
  const container = document.getElementById("checkoutItems");
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

  if (!first || !last || !email || !street || !city || !zip || !country) {
    await uiAlert("Please fill all required fields.");
    return null;
  }

  if (!paymentMethod) {
    await uiAlert("Please select a payment method.");
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
NEW ORDER – Prime Liquidators

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
Payment pending – order will be confirmed after verification
`.trim();
}

// ----------------------------
// Send order
// ----------------------------
async function sendOrder(channel) {
  console.log("sendOrder called", channel, "pendingOrder:", pendingOrder);

  // If pendingOrder is missing (e.g. something cleared it), try to rebuild
  // the payload from the form so the user action still works.
  let order = pendingOrder;
  if (!order) {
    order = await buildOrderPayload();
    if (!order) {
      await uiAlert(
        "Order information is missing. Please complete the form and try again."
      );
      return;
    }
    pendingOrder = order;
  }

  closeModal();
  disableCheckoutButtons(true);
  showLoading();

  const message = buildOrderMessage(order);

  try {
    const endpoint =
      channel === "email"
        ? "/.netlify/functions/send_email"
        : "/.netlify/functions/send_whatsapp";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order: pendingOrder,
        message,
      }),
    });

    if (!res.ok) throw new Error("Backend failed");

    localStorage.removeItem("cart");
    window.location.href = "thankyou.html";
  } catch (err) {
    console.warn("Backend failed, using fallback", err);
    hideLoading();

    await uiAlert(
      "Automatic sending failed. We’ll open a manual option so your order is not lost.",
      "Manual Send"
    );

    if (channel === "whatsapp") {
      const phone = window.CONFIG?.WHATSAPP_TO;
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        "_blank"
      );
    } else {
      const email = window.CONFIG?.EMAIL_TO;
      if (email) {
        window.location.href = `mailto:${email}?subject=Order ${
          pendingOrder.orderId
        }&body=${encodeURIComponent(message)}`;
      } else {
        await uiAlert(
          "Email sending failed. Please use WhatsApp to complete your order."
        );
      }
    }
    disableCheckoutButtons(false);
  }
}

function showLoading() {
  const overlay = document.getElementById("loadingOverlay");
  const cancelBtn = document.getElementById("loadingCancelBtn");
  const text = document.getElementById("loadingText");

  cancelBtn.classList.add("hidden");
  text.textContent = "Processing your order…";

  overlay.classList.remove("hidden");

  // After 10 seconds, allow escape
  loadingTimeout = setTimeout(() => {
    text.textContent = "This is taking longer than expected.";
    cancelBtn.classList.remove("hidden");
  }, 10000);
}

function hideLoading() {
  clearTimeout(loadingTimeout);
  loadingTimeout = null;

  document.getElementById("loadingOverlay").classList.add("hidden");
}

function disableCheckoutButtons(disabled = true) {
  document.getElementById("placeOrderBtn").disabled = disabled;
  document.getElementById("sendEmailBtn").disabled = disabled;
  document.getElementById("sendWhatsappBtn").disabled = disabled;
}
