// js/members.js
// 家庭成員資料的顯示輔助函式（CRUD 動作透過 js/cloud-sync.js 呼叫，UI 綁定在 js/app.js）。

export function validateInitial(initial) {
  return typeof initial === "string" && initial.trim().length === 1;
}

export function getMemberById(members, id) {
  return members.find((m) => m.id === id);
}

/** 依亮度決定簡稱文字在色塊上要用黑字或白字，確保可讀性 */
export function readableTextColor(hexColor) {
  const hex = (hexColor || "#3b82f6").replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const r = parseInt(full.substring(0, 2), 16) || 0;
  const g = parseInt(full.substring(2, 4), 16) || 0;
  const b = parseInt(full.substring(4, 6), 16) || 0;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#1f2430" : "#ffffff";
}

/** 產生成員管理頁單列 HTML */
export function renderMemberRowHTML(member) {
  const textColor = readableTextColor(member.color);
  return `
    <li class="member-row" data-member-id="${member.id}">
      <span class="member-avatar" style="background:${member.color}; color:${textColor}">${escapeHtml(member.initial)}</span>
      <span class="member-name">${escapeHtml(member.name)}</span>
      <button class="btn btn-secondary btn-edit-member" data-member-id="${member.id}">編輯</button>
    </li>`;
}

/** 產生新增/編輯行程表單裡的成員複選 chip HTML */
export function renderMemberCheckboxHTML(member, checked) {
  const textColor = readableTextColor(member.color);
  return `
    <label class="checkbox-chip" style="background:${checked ? member.color : "transparent"}; color:${checked ? textColor : "inherit"}; border-color:${member.color}">
      <input type="checkbox" value="${member.id}" ${checked ? "checked" : ""} />
      ${escapeHtml(member.initial)} ${escapeHtml(member.name)}
    </label>`;
}

export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
