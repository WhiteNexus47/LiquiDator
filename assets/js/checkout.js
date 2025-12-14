// ============================
// CHECKOUT PAGE SCRIPT
// ============================
let pendingOrder = null;
// Form element refs (populated on DOMContentLoaded)
let cFirstName, cLastName, cEmail, cStreet, cCity, cZip, cCountry, cAdditional;

window.addEventListener("DOMContentLoaded", () => {
  // Cache form elements
  cFirstName = document.getElementById("cFirstName");
  cLastName = document.getElementById("cLastName");
  cEmail = document.getElementById("cEmail");
  cStreet = document.getElementById("cStreet");
  cCity = document.getElementById("cCity");
  cZip = document.getElementById("cZip");
  cCountry = document.getElementById("cCountry");
  cAdditional = document.getElementById("cAdditional");

  // Re-render when cart changes (other pages may update localStorage)
  window.addEventListener("cartUpdated", () => {
    renderCheckoutItems();
    updateTotal();
  });
  window.addEventListener("storage", (e) => {
    if (e.key === "cart") {
      renderCheckoutItems();
      updateTotal();
    }
  });
  renderCheckoutItems();
  updateTotal();
  updateCartBadge();

  document.getElementById("placeOrderBtn").addEventListener("click", openModal);

  document
    .getElementById("sendEmailBtn")
    .addEventListener("click", () => sendOrder("email"));

  document
    .getElementById("sendWhatsappBtn")
    .addEventListener("click", () => sendOrder("whatsapp"));
});

// ----------------------------
// Modal helpers
// ----------------------------
function openModal() {
  const order = buildOrderPayload();
  if (!order) return;

  pendingOrder = order;
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
  if (!container) return;

  const cart = getCart();
  if (!cart.length) {
    container.innerHTML = `<p class='empty'>Your cart is empty.</p>`;
    return;
  }

  container.innerHTML = cart
    .map(
      (item) => `
      <div class="checkout-row">
        <div class="img-box">
          <img src="${item.image}" alt="${item.name}"/>
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
  totalEl.textContent = total;
}

// ----------------------------
// Build order payload
// ----------------------------
function buildOrderPayload() {
  const first = cFirstName.value.trim();
  const last = cLastName.value.trim();
  const email = cEmail.value.trim();
  const street = cStreet.value.trim();
  const city = cCity.value.trim();
  const zip = cZip.value.trim();
  const country = cCountry.value.trim();
  const additional = cAdditional.value.trim();

  if (!first || !last || !email || !street || !city || !zip) {
    alert("Please fill all required fields.");
    return null;
  }

  const cart = getCart();
  if (!cart.length) {
    alert("Your cart is empty.");
    return null;
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  return {
    customer: {
      name: `${first} ${last}`,
      email,
    },
    address:
      `${street}, ${city} ${zip}, ${country}` +
      (additional ? ` — ${additional}` : ""),
    items: cart.map((i) => ({
      name: i.name,
      qty: i.qty,
      price: i.price,
      image: i.image,
    })),
    total,
  };
}

// ----------------------------
// Send order to backend
// ----------------------------
async function sendOrder(channel) {
  if (!pendingOrder) return;

  closeModal();

  try {
    const res = await fetch("/.netlify/functions/send_order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...pendingOrder,
        channel,
      }),
    });

    if (!res.ok) throw new Error("Order request failed");

    const data = await res.json();

    alert(`Order placed successfully!\nOrder ID: ${data.orderId}`);

    localStorage.removeItem("cart");
    window.location.href = "thankyou.html";
  } catch (err) {
    console.error(err);

    if (channel === "whatsapp") {
      const msg = buildWhatsAppFallbackMessage(pendingOrder);
      const number = "15307659545"; // business number
      const waUrl = `https://wa.me/${number}?text=${msg}`;

      alert(
        "Automatic WhatsApp sending failed.\nOpening WhatsApp so you can send the order manually."
      );

      window.open(waUrl, "_blank");
      return;
    }

    alert("Failed to send order. Please try again.");
  }
}

function buildWhatsAppFallbackMessage(order) {
  const lines = [
    "🛒 New Order",
    `Name: ${order.customer.name}`,
    `Email: ${order.customer.email}`,
    `Address: ${order.address}`,
    "",
    "Items:",
  ];

  order.items.forEach((i) => {
    lines.push(`• ${i.name} × ${i.qty} = $${i.price * i.qty}`);
  });

  lines.push("");
  lines.push(`Total: $${order.total}`);

  return encodeURIComponent(lines.join("\n"));
}
