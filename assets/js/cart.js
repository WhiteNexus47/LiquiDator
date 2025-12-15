// CART PAGE SCRIPT (Updated with qty, free delivery logic)

window.addEventListener("DOMContentLoaded", async () => {
  // Header/footer already loaded by main.js
  renderCartItems();
  updateSummary();
  updateCartBadge();
});

function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function renderCartItems() {
  const list = document.getElementById("cartList");
  const cart = getCart();

  if (cart.length === 0) {
    list.innerHTML = `<p class='empty'>Your cart is empty.</p>`;
    return;
  }

  list.innerHTML = cart
    .map(
      (item, index) => `
      <div class="cart-row">
        <img src="${item.image}" class="cart-img" />

        <div class="cart-info">
          <h4>${item.name}</h4>
          <p class="price">$${item.price}</p>

          <div class="qty-box">
            <button onclick="changeQty(${index}, -1)">-</button>
            <span>${item.qty}</span>
            <button onclick="changeQty(${index}, 1)">+</button>
          </div>
        </div>

        <button class="remove-btn" onclick="removeItem(${index})">Remove</button>
      </div>
    `
    )
    .join("");
}

function changeQty(index, amount) {
  const cart = getCart();
  cart[index].qty += amount;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCartItems();
  updateSummary();
  updateCartBadge();
}

function removeItem(i) {
  const cart = getCart();
  cart.splice(i, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCartItems();
  updateSummary();
  updateCartBadge();
}

function updateSummary() {
  const totalBox = document.getElementById("cartTotal");
  const deliveryMsg = document.getElementById("deliveryMsg");
  const progressFill = document.getElementById("progressFill");

  const cart = getCart();
  let price = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  let delivery = price >= 1000 ? 0 : cart.length > 0 ? 15 : 0;
  let unlockAmount = price >= 1000 ? 0 : 1000 - price;

  // ---- Progress bar percentage ----
  let progress = Math.min((price / 1000) * 100, 100);
  progressFill.style.width = progress + "%";

  // ---- Message update ----
  if (price >= 1000) {
    deliveryMsg.innerHTML = `<span class="green">🎉 Free Delivery Unlocked!</span>`;
  } else {
    deliveryMsg.innerHTML = `Add <strong>$${unlockAmount}</strong> more for free delivery`;
  }

  // ---- Price summary ----
  totalBox.innerHTML = `
    <p>Price (${cart.length} items): <strong>$${price}</strong></p>
    <p>Delivery Charges: $${delivery}</p>
    <hr />
    <p class='big'>Total Amount: <strong>$${price + delivery}</strong></p>
  `;
}
