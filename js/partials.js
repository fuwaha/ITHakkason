// HTMLの部品（partials/*.html）を読み込んで、index.html の data-include の場所に差し込む
export async function loadPartials() {
  const slots = [...document.querySelectorAll("[data-include]")];

  await Promise.all(
    slots.map(async (slot) => {
      const path = slot.dataset.include;
      const res = await fetch(path);
      if (!res.ok) throw new Error(`${path} を読み込めません (${res.status})`);
      slot.outerHTML = await res.text();
    }),
  );
}
