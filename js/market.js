// マーケットの描画（出品カードの一覧と、自分の出品）
import { state } from "./state.js";
import { $, esc } from "./helpers.js";
import { currentUser } from "./auth.js";

export const yen = (price) => `¥${Number(price).toLocaleString("ja-JP")}`;
export const billingLabel = (billing) => (billing === "monthly" ? "月額" : "買い切り");
export const priceText = (listing) =>
  `${yen(listing.price)}${listing.billing === "monthly" ? " / 月" : ""}`;

// 購入ボタンの状態（ボタンの文字と、押せるかどうか）
function buyButton(listing, user) {
  const owned = state.licenses.find((license) => license.listingId === listing.id);

  if (listing.sellerId === user?.id) return `<button class="secondary-button" disabled>あなたの出品</button>`;
  if (owned && owned.status === "active") {
    return `<button class="secondary-button" disabled>${listing.billing === "monthly" ? "契約中" : "購入済み"}</button>`;
  }
  if (owned) return `<button class="secondary-button" disabled>解約済み</button>`;
  return `<button class="primary-button" data-buy="${listing.id}">購入する</button>`;
}

export function renderMarket() {
  const user = currentUser();
  const query = ($("#marketSearch")?.value || "").toLowerCase();
  const filter = $("#marketFilter")?.value || "all";

  const rows = state.listings.filter(
    (listing) =>
      listing.status === "active" &&
      (filter === "all" || listing.billing === filter) &&
      `${listing.name} ${listing.description} ${listing.seller} ${listing.category}`
        .toLowerCase()
        .includes(query),
  );

  $("#marketCount").textContent = `${rows.length}件`;
  $("#marketGrid").innerHTML =
    rows
      .map((listing) =>
        [
          `<article class="panel market-card">`,
          `<div class="market-card-head">`,
          `<h3>${esc(listing.name)}</h3>`,
          `<span class="badge ${listing.billing === "monthly" ? "warning" : "active"}">${billingLabel(listing.billing)}</span>`,
          `</div>`,
          `<p class="market-desc">${esc(listing.description)}</p>`,
          `<div class="list-sub">${esc(listing.category)} ・ 出品者: ${esc(listing.seller)}</div>`,
          `<div class="market-card-foot">`,
          `<strong class="market-price">${esc(priceText(listing))}</strong>`,
          buyButton(listing, user),
          `</div>`,
          `</article>`,
        ].join(""),
      )
      .join("") || '<p class="empty">該当する出品はありません</p>';

  const mine = state.listings.filter((listing) => listing.sellerId === user?.id);
  $("#myListingsTable").innerHTML =
    mine
      .map((listing) => {
        const active = listing.status === "active";
        return [
          `<tr>`,
          `<td><strong>${esc(listing.name)}</strong><div class="list-sub">${esc(listing.description)}</div></td>`,
          `<td>${billingLabel(listing.billing)}</td>`,
          `<td>${esc(priceText(listing))}</td>`,
          `<td><span class="badge ${active ? "active" : "inactive"}">${active ? "出品中" : "取り下げ中"}</span></td>`,
          `<td><div class="row-actions">`,
          `<button class="link-button" data-listing-toggle="${listing.id}">${active ? "取り下げ" : "再出品"}</button>`,
          `</div></td>`,
          `</tr>`,
        ].join("");
      })
      .join("") || '<tr><td class="empty" colspan="5">まだ出品していません</td></tr>';
}
