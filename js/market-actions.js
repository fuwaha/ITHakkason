// マーケットの操作（購入・出品の取り下げ・月額ライセンスの解約と再開）
import { nextId, save, state, usedCount } from "./state.js";
import { $, addMonths, notify, todayString } from "./helpers.js";
import { currentUser } from "./auth.js";
import { addLog } from "./logs.js";
import { render } from "./render.js";
import { openForm } from "./forms.js";
import { billingLabel } from "./market.js";
import { askCheckout } from "./checkout.js";
import { askConfirm } from "./confirm.js";

$("#addListingButton").addEventListener("click", () => openForm("listing"));

// 購入: ツールとライセンスを作ってライセンス管理に入れる（決済はダミー）
async function buy(listing) {
  const user = currentUser();
  if (listing.sellerId === user?.id) return notify("自分の出品は購入できません。", true);

  const owned = state.licenses.find((license) => license.listingId === listing.id);
  if (owned) {
    return notify(
      owned.status === "active"
        ? "すでに契約中（購入済み）です。"
        : "解約済みの契約があります。ライセンス管理から再開できます。",
      true,
    );
  }
  if (!(await askCheckout(listing))) return;

  let tool = state.tools.find((item) => item.name === listing.name);
  if (!tool) {
    tool = {
      id: nextId(state.tools),
      name: listing.name,
      provider: listing.seller,
      category: listing.category,
      status: "active",
    };
    state.tools.push(tool);
  }

  const monthly = listing.billing === "monthly";
  state.licenses.push({
    id: nextId(state.licenses),
    toolId: tool.id,
    name: `${listing.name}（${billingLabel(listing.billing)}）`,
    quantity: 1,
    renewal: monthly ? addMonths(todayString(), 1) : "",
    status: "active",
    billing: listing.billing,
    price: listing.price,
    listingId: listing.id,
  });

  addLog("購入", listing.name);
  save();
  notify("購入しました。ライセンス管理に追加されました。");
  render();
}

// 出品の取り下げ・再出品（出品者本人だけ）
function toggleListing(listing) {
  if (listing.sellerId !== currentUser()?.id) return notify("自分の出品だけ操作できます。", true);

  listing.status = listing.status === "active" ? "withdrawn" : "active";
  addLog(listing.status === "active" ? "再出品" : "取り下げ", listing.name);
  save();
  notify(listing.status === "active" ? "再出品しました" : "取り下げました");
  render();
}

// 月額ライセンスの解約・再開（管理者でなくてもいつでもできる）
async function toggleLicense(license) {
  if (license.billing !== "monthly") return;

  if (license.status === "active") {
    if (usedCount(license.id) > 0) {
      return notify("割り当て中のため解約できません。先に返却してください。", true);
    }
    const confirmed = await askConfirm({
      title: "月額ライセンスの解約",
      message: `${license.name} を解約しますか？あとから再開できます。\n※設定されている次の更新日までライセンスは継続します。`,
      okLabel: "解約する",
      danger: true,
    });

    if (!confirmed) return;

    license.status = "inactive";
    license.renewal = "";
    addLog("解約", license.name);
    notify("解約しました");
  } else {
    license.status = "active";
    license.renewal = addMonths(todayString(), 1);
    addLog("再開", license.name);
    notify("再開しました");
  }
  save();
  render();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-buy], [data-listing-toggle], [data-license-toggle]");
  if (!target) return;

  if (target.dataset.buy) {
    return buy(state.listings.find((item) => item.id === Number(target.dataset.buy)));
  }
  if (target.dataset.listingToggle) {
    return toggleListing(state.listings.find((item) => item.id === Number(target.dataset.listingToggle)));
  }
  toggleLicense(state.licenses.find((item) => item.id === Number(target.dataset.licenseToggle)));
});
