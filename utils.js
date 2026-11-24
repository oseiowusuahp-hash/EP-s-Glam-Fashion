export function escapeHTML(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isSafeImageUrl(url) {
  return typeof url === "string" && (url.startsWith("https://") || url.startsWith("data:image/"));
}

export function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("233") && digits.length === 12) return "0" + digits.slice(3);
  return digits;
}

export function formatYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseYMD(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatShortDate(ymd) {
  return parseYMD(ymd).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function formatPrettyDate(ymd) {
  return parseYMD(ymd).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function slotDocId(date, slot) {
  return `${date}__${slot.replace(/[^a-zA-Z0-9]/g, "-")}`;
}

export function showMsg(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = "block";
  el.textContent = msg;
}

export function hideMsg(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = "none";
}

export function buildLoyaltyCardHTML(client, isAdminMode) {
  const count = Math.min(10, Math.max(0, Number(client.loyaltyCount) || 0));
  const redeemed = Number(client.rewardsRedeemed) || 0;
  let circlesHTML = "";

  for (let i = 1; i <= 10; i++) {
    const ticked = i <= count;
    const tenth = i === 10;
    const nextVal = (ticked && i === count) ? i - 1 : i;
    circlesHTML += `
      <div class="stamp-circle ${ticked ? "ticked" : ""} ${tenth ? "tenth" : ""} ${isAdminMode ? "clickable" : ""}"
           ${isAdminMode ? `data-stamp="${nextVal}"` : ""}>
        ${tenth
          ? `<span>${ticked ? "✓" : "10"}</span><span class="stamp-sub">20% OFF</span>`
          : `<span>${ticked ? "✓" : i}</span>`
        }
      </div>
    `;
  }

  return `
    <div class="loyalty-card">
      <div class="loyalty-card-head">
        <div>
          <h4>EP's Glam &amp; Fashion Loyalty Card</h4>
          <small>${escapeHTML(client.name)} &bull; Rewards Redeemed: ${redeemed}</small>
        </div>
        <div class="loyalty-progress-pill">${count} / 10 Services</div>
      </div>
      <div class="stamps-grid">${circlesHTML}</div>
      ${count >= 10
        ? `<div class="reward-banner">🎉 <strong>10th Service Unlocked!</strong> ${isAdminMode ? "Client qualifies" : "You qualify"} for <strong>20% OFF</strong> this service!</div>`
        : `<div style="margin-top:16px; font-size:0.86rem; color:#e6d8cf;">${10 - count} more service${10 - count === 1 ? "" : "s"} left until your <strong>20% Discount</strong>!</div>`
      }
    </div>
  `;
}
  