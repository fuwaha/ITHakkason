// 決済画面（ダミー）。購入を確定したらtrue、戻る・Escならfalseを返す
import { $, esc } from "./helpers.js";
import { billingLabel, priceText } from "./market.js";

export function askCheckout(listing) {
  const screen = $("#checkoutScreen");
  if (!screen.classList.contains("hidden")) return Promise.resolve(false); // すでに開いているとき

  const row = (label, value) =>
    `<div class="checkout-row"><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
  $("#checkoutSummary").innerHTML = [
    row("商品名", listing.name),
    row("販売方法", billingLabel(listing.billing)),
    row("出品者", listing.seller),
  ].join("");
  $("#checkoutTotal").textContent = priceText(listing);
  screen.classList.remove("hidden");
  $("#checkoutSubmit").focus();

  return new Promise((resolve) => {
    const finish = (result) => {
      $("#checkoutForm").removeEventListener("submit", onSubmit);
      $("#checkoutBack").removeEventListener("click", onBack);
      document.removeEventListener("keydown", onKey);
      screen.classList.add("hidden");
      resolve(result);
    };
    const onSubmit = (event) => {
      event.preventDefault();
      finish(true);
    };
    const onBack = () => finish(false);
    const onKey = (event) => {
      if (event.key === "Escape") finish(false);
    };

    $("#checkoutForm").addEventListener("submit", onSubmit);
    $("#checkoutBack").addEventListener("click", onBack);
    document.addEventListener("keydown", onKey);
  });
}
