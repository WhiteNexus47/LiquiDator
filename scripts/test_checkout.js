const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

async function run() {
  const html = fs.readFileSync(
    path.resolve(__dirname, "..", "checkout.html"),
    "utf8"
  );
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    beforeParse(window) {
      // mirror page console to node console for debugging
      window.console.log = (...args) => console.log("[PAGE LOG]", ...args);
      window.console.warn = (...args) => console.warn("[PAGE WARN]", ...args);
    },
  });

  // Wait for scripts to load
  await new Promise((r) => setTimeout(r, 200));

  const { window } = dom;
  const doc = window.document;

  // Evaluate the JS files so handlers are attached reliably in JSDOM
  const checkoutJs = fs.readFileSync(
    path.resolve(__dirname, "..", "assets", "js", "checkout.js"),
    "utf8"
  );
  const utilsJs = fs.readFileSync(
    path.resolve(__dirname, "..", "assets", "js", "utils.js"),
    "utf8"
  );
  const mainJs = fs.readFileSync(
    path.resolve(__dirname, "..", "assets", "js", "main.js"),
    "utf8"
  );

  try {
    window.eval(utilsJs);
  } catch (err) {
    console.error("utils eval failed", err);
  }
  try {
    window.eval(mainJs);
  } catch (err) {
    console.error("main eval failed", err);
  }
  try {
    window.eval(checkoutJs);
  } catch (err) {
    console.error("checkout eval failed", err);
  }

  // Re-dispatch DOMContentLoaded so the scripts can run their initialization
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));

  // Ensure form refs are present (if DOMContentLoaded handlers didn't run in this env)
  window.cFirstName = doc.getElementById("cFirstName");
  window.cLastName = doc.getElementById("cLastName");
  window.cEmail = doc.getElementById("cEmail");
  window.cStreet = doc.getElementById("cStreet");
  window.cCity = doc.getElementById("cCity");
  window.cZip = doc.getElementById("cZip");
  window.cCountry = doc.getElementById("cCountry");
  window.cAdditional = doc.getElementById("cAdditional");

  // Fill required fields
  doc.getElementById("cFirstName").value = "Test";
  doc.getElementById("cLastName").value = "User";
  doc.getElementById("cEmail").value = "test@example.com";
  doc.getElementById("cStreet").value = "1 Test St";
  doc.getElementById("cCity").value = "Testville";
  doc.getElementById("cZip").value = "12345";
  doc.getElementById("cCountry").value = "Testland";

  // Click Place Order
  doc.getElementById("placeOrderBtn").click();

  // Wait for uiConfirm modal to appear and confirm
  await new Promise((r) => setTimeout(r, 50));
  const confirmBtn = doc.getElementById("uiConfirmBtn");
  confirmBtn.click();

  await new Promise((r) => setTimeout(r, 50));

  // Now call sendOrder directly to simulate user pressing a channel button
  // Simulate pendingOrder being cleared (bug scenario)
  window.pendingOrder = null;

  // stub fetch to succeed so flow continues
  window.fetch = async () => ({ ok: true });

  await window.sendOrder("whatsapp");

  await new Promise((r) => setTimeout(r, 200));

  console.log(
    "messageModal hidden?",
    doc.getElementById("messageModal").classList.contains("hidden")
  );
  console.log(
    "loadingOverlay hidden?",
    doc.getElementById("loadingOverlay").classList.contains("hidden")
  );
  console.log("pendingOrder present?", !!window.pendingOrder);
}

run().catch((err) => console.error(err));
