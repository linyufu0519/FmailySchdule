// js/app.js
// 主流程：月曆渲染、Modal 控制、表單互動、搜尋、匿名登入串接。
import { initTheme } from "./theme.js";
import { buildMonthGrid, formatYearMonth, toDateKey, loadHolidays, getHolidayName } from "./calendar.js";
import {
  expandEventsInRange,
  groupOccurrencesByDate,
  getEventStartTime,
  getEventEndTime,
  detectConflicts,
  summarizeTitle,
} from "./events.js";
import { renderMemberRowHTML, renderMemberCheckboxHTML, readableTextColor, validateInitial, escapeHtml } from "./members.js";
import * as cloud from "./cloud-sync.js";
import { resolveFamilyId } from "./access.js";
import { addToDeviceCalendar } from "./ics-export.js";

const state = {
  today: new Date(),
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  members: [],
  events: [],
  holidays: {},
  currentUser: null,
  cloudEnabled: false,
  unsubMembers: null,
  unsubEvents: null,
};

const el = (id) => document.getElementById(id);

// ---------- Toast ----------
let toastTimer = null;
function showToast(message) {
  const toast = el("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

// ---------- Modal helpers ----------
function openModal(id) {
  el(id).classList.remove("hidden");
}
function closeModal(id) {
  el(id).classList.add("hidden");
}
document.querySelectorAll("[data-close-modal]").forEach((btn) => {
  btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
});
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (evt) => {
    if (evt.target === overlay) overlay.classList.add("hidden");
  });
});

function openConfirm(message, actions) {
  el("confirm-message").textContent = message;
  const actionsEl = el("confirm-actions");
  actionsEl.innerHTML = "";
  actions.forEach(({ label, className, onClick }) => {
    const btn = document.createElement("button");
    btn.className = `btn ${className || "btn-secondary"}`;
    btn.textContent = label;
    btn.addEventListener("click", () => {
      closeModal("modal-confirm");
      onClick();
    });
    actionsEl.appendChild(btn);
  });
  openModal("modal-confirm");
}

// ---------- 深色模式 ----------
initTheme(el("btn-theme-toggle"));

// ---------- 假日資料 ----------
loadHolidays().then((data) => {
  state.holidays = data;
  renderCalendar();
});

// ---------- 資料變更即重新渲染 ----------
function onMembersChanged(members) {
  state.members = members.sort((a, b) => (a.name || "").localeCompare(b.name || "", "zh-Hant"));
  renderMembersView();
  renderCalendar();
}
function onEventsChanged(events) {
  state.events = events;
  renderCalendar();
}

// ---------- Firebase / 家庭連結匿名登入 ----------
async function bootCloud() {
  const familyId = resolveFamilyId(window.location.search);
  if (!familyId) {
    el("auth-status").textContent = "唯讀模式（連結缺少或無效）";
    return;
  }

  const { enabled } = await cloud.initCloud();
  state.cloudEnabled = enabled;
  if (!enabled) {
    el("auth-status").textContent = "離線模式，尚未設定雲端同步（見 FIREBASE_SETUP.md）";
    return;
  }
  cloud.setFamilyId(familyId);
  el("auth-status").textContent = "正在連線...";
  cloud.subscribeAuthState((user) => {
    state.currentUser = user;
    updateAuthUI();
    if (state.unsubMembers) state.unsubMembers();
    if (state.unsubEvents) state.unsubEvents();
    if (user) {
      state.unsubMembers = cloud.subscribeMembers(onMembersChanged, () => showToast("讀取成員資料失敗"));
      state.unsubEvents = cloud.subscribeEvents(onEventsChanged, () => showToast("讀取行程資料失敗"));
    } else {
      state.members = [];
      state.events = [];
      renderMembersView();
      renderCalendar();
    }
  });
  try {
    await cloud.signInAnonymously();
  } catch (error) {
    el("auth-status").textContent = "唯讀模式（雲端連線失敗）";
  }
}
bootCloud();

function updateAuthUI() {
  if (!state.cloudEnabled) return;
  const loggedIn = !!state.currentUser;
  el("auth-status").textContent = loggedIn ? "已連線（可編輯）" : "正在連線...";
}

function requireLogin() {
  if (!state.cloudEnabled) {
    showToast("尚未設定 Firebase，請參考 FIREBASE_SETUP.md");
    return false;
  }
  if (!state.currentUser) {
    showToast("目前為唯讀模式，請使用有效的家庭專屬連結");
    return false;
  }
  return true;
}

// ---------- 月曆渲染 ----------
function renderCalendar() {
  el("calendar-title").textContent = formatYearMonth(state.year, state.month);
  const grid = buildMonthGrid(state.year, state.month);
  const rangeStart = grid[0].dateKey;
  const rangeEnd = grid[grid.length - 1].dateKey;
  const occurrences = expandEventsInRange(state.events, rangeStart, rangeEnd);
  const byDate = groupOccurrencesByDate(occurrences);

  const container = el("calendar-grid");
  container.innerHTML = "";
  grid.forEach((cell) => {
    const dayOccurrences = byDate[cell.dateKey] || [];
    const holidayName = getHolidayName(cell.dateKey, state.holidays);
    const isToday = cell.dateKey === toDateKey(state.today);

    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day";
    if (!cell.inMonth) dayEl.classList.add("other-month");
    if (isToday) dayEl.classList.add("is-today");
    if (dayOccurrences.length > 0) dayEl.classList.add("has-events");
    dayEl.dataset.dateKey = cell.dateKey;

    const memberIds = uniqueMemberIds(dayOccurrences);
    const chipsHTML = renderMemberChips(memberIds);

    dayEl.innerHTML = `
      <span class="day-number">${cell.date.getDate()}</span>
      ${holidayName ? `<span class="holiday-name">${escapeHtml(holidayName)}</span>` : ""}
      <span class="member-chips">${chipsHTML}</span>
    `;
    dayEl.addEventListener("click", () => openDayEventsModal(cell.dateKey));
    container.appendChild(dayEl);
  });
}

function uniqueMemberIds(occurrences) {
  const ids = [];
  occurrences.forEach((occ) => {
    (occ.event.memberIds || []).forEach((id) => {
      if (!ids.includes(id)) ids.push(id);
    });
  });
  return ids;
}

function renderMemberChips(memberIds) {
  const MAX_CHIPS = 4;
  const visible = memberIds.slice(0, MAX_CHIPS);
  let html = visible
    .map((id) => {
      const member = state.members.find((m) => m.id === id);
      if (!member) return "";
      return `<span class="member-chip" style="color:${member.color}">${escapeHtml(member.initial)}</span>`;
    })
    .join("");
  if (memberIds.length > MAX_CHIPS) {
    html += `<span class="member-chip overflow">+${memberIds.length - MAX_CHIPS}</span>`;
  }
  return html;
}

el("btn-prev-month").addEventListener("click", () => changeMonth(-1));
el("btn-next-month").addEventListener("click", () => changeMonth(1));
function changeMonth(delta) {
  const d = new Date(state.year, state.month + delta, 1);
  state.year = d.getFullYear();
  state.month = d.getMonth();
  renderCalendar();
}

// ---------- 當日行程 Modal ----------
let currentDayKey = null;
function openDayEventsModal(dateKey) {
  currentDayKey = dateKey;
  const [y, m, d] = dateKey.split("-").map(Number);
  el("day-events-title").textContent = `${y}年${m}月${d}日 行程`;
  // 修正：先前遺漏開啟 Modal，導致點日期後清單已渲染卻看不到畫面
  openModal("modal-day-events");

  const occurrences = expandEventsInRange(state.events, dateKey, dateKey);
  occurrences.sort((a, b) => getEventStartTime(a.event).localeCompare(getEventStartTime(b.event)));

  const list = el("day-events-list");
  list.innerHTML = "";
  if (occurrences.length === 0) {
    list.innerHTML = `<li class="day-event-item">這一天還沒有行程</li>`;
  }
  occurrences.forEach(({ event, dateKey }) => {
    const memberNames = (event.memberIds || [])
      .map((id) => state.members.find((m) => m.id === id))
      .filter(Boolean);
    const memberChips = memberNames
      .map((m) => `<span class="member-chip" style="color:${m.color}">${escapeHtml(m.initial)}</span>`)
      .join(" ");
    const summary = summarizeTitle(event.title);
    const needsMore = summary !== event.title;

    const li = document.createElement("li");
    li.className = "day-event-item";
    li.innerHTML = `
      <div class="event-time">${getEventStartTime(event)} ～ ${getEventEndTime(event)}${event.isRecurring ? "（重複）" : ""}</div>
      <div class="event-summary">${escapeHtml(summary)}${needsMore ? ` <span class="more-link" data-action="detail">...詳細</span>` : ""}</div>
      <div class="event-meta">
        ${memberChips}
      </div>
      <div class="event-actions">
        <button class="btn btn-secondary" data-action="calendar">加入手機行事曆</button>
        <button class="btn btn-link" data-action="calendar-setup">iPhone 首次設定</button>
        <button class="btn btn-secondary" data-action="edit">編輯</button>
        <button class="btn btn-danger" data-action="delete">刪除</button>
      </div>
    `;
    li.querySelector('[data-action="detail"]')?.addEventListener("click", () => openEventDetail(event, dateKey));
    li.querySelector('.event-summary').addEventListener("click", (e) => {
      if (e.target.dataset.action !== "detail") openEventDetail(event, dateKey);
    });
    li.querySelector('[data-action="calendar"]').addEventListener("click", () => {
      addToDeviceCalendar(withMemberNames(event), dateKey);
    });
    li.querySelector('[data-action="calendar-setup"]').addEventListener("click", openCalendarSetup);
    li.querySelector('[data-action="edit"]').addEventListener("click", () => openEventForm({ event, dateKey }));
    li.querySelector('[data-action="delete"]').addEventListener("click", () => confirmDeleteEvent(event, dateKey));
    list.appendChild(li);
  });
}

function withMemberNames(event) {
  const memberNames = (event.memberIds || [])
    .map((id) => state.members.find((member) => member.id === id)?.name)
    .filter(Boolean);
  return { ...event, memberNames };
}

function openEventDetail(event, occurrenceDateKey) {
  const memberNames = (event.memberIds || [])
    .map((id) => state.members.find((m) => m.id === id))
    .filter(Boolean)
    .map((m) => m.name)
    .join("、");
  el("event-detail-body").innerHTML = `
    <p><strong>時間：</strong>${getEventStartTime(event)} ～ ${getEventEndTime(event)}</p>
    <p><strong>成員：</strong>${escapeHtml(memberNames || "無")}</p>
    <p><strong>重複規則：</strong>${recurrenceLabel(event)}</p>
    <p class="detail-content"><strong>內容：</strong>${escapeHtml(event.title)}</p>
    <button class="btn btn-secondary" data-action="calendar">加入手機行事曆</button>
    <button class="btn btn-link" data-action="calendar-setup">iPhone 首次設定</button>
  `;
  el("event-detail-body")
    .querySelector('[data-action="calendar"]')
    .addEventListener("click", () => addToDeviceCalendar(withMemberNames(event), occurrenceDateKey));
  el("event-detail-body")
    .querySelector('[data-action="calendar-setup"]')
    .addEventListener("click", openCalendarSetup);
  openModal("modal-event-detail");
}

function openCalendarSetup() {
  openModal("modal-calendar-setup");
}

function recurrenceLabel(event) {
  if (!event.isRecurring) return "不重複";
  return event.recurrenceRule === "weekly" ? "每週" : event.recurrenceRule === "monthly" ? "每月" : "不重複";
}

el("btn-add-event-in-day").addEventListener("click", () => {
  if (!requireLogin()) return;
  closeModal("modal-day-events");
  openEventForm({ dateKey: currentDayKey });
});
el("btn-add-event").addEventListener("click", () => {
  if (!requireLogin()) return;
  openEventForm({ dateKey: toDateKey(new Date(state.year, state.month, state.today.getDate())) });
});

function confirmDeleteEvent(event, occurrenceDateKey) {
  if (!requireLogin()) return;
  if (event.isRecurring) {
    openConfirm(`「${summarizeTitle(event.title, 20)}」為重複行程，要刪除本次還是整個系列？`, [
      {
        label: "刪除本次",
        className: "btn-danger",
        onClick: async () => {
          const exceptions = [...(event.exceptions || []), occurrenceDateKey];
          await cloud.updateEvent(event.id, { exceptions });
          showToast("已刪除本次行程");
          openDayEventsModal(currentDayKey);
        },
      },
      {
        label: "刪除全部",
        className: "btn-danger",
        onClick: async () => {
          await cloud.deleteEvent(event.id);
          showToast("已刪除整個重複系列");
          closeModal("modal-day-events");
        },
      },
      { label: "取消", className: "btn-secondary", onClick: () => {} },
    ]);
  } else {
    openConfirm("確定要刪除這筆行程嗎？此動作無法復原。", [
      {
        label: "確定刪除",
        className: "btn-danger",
        onClick: async () => {
          await cloud.deleteEvent(event.id);
          showToast("已刪除行程");
          openDayEventsModal(currentDayKey);
        },
      },
      { label: "取消", className: "btn-secondary", onClick: () => {} },
    ]);
  }
}

// ---------- 新增/編輯行程表單 ----------
function openEventForm({ event, dateKey }) {
  const form = el("event-form");
  form.reset();
  el("event-conflict-warning").classList.add("hidden");
  el("btn-delete-event").classList.toggle("hidden", !event);
  el("event-form-title").textContent = event ? "編輯行程" : "新增行程";
  el("event-id").value = event ? event.id : "";
  el("event-date").value = event ? event.startAt.slice(0, 10) : dateKey;
  el("event-start-time").value = event ? getEventStartTime(event) : "09:00";
  el("event-end-time").value = event ? getEventEndTime(event) : "10:00";
  el("event-content").value = event ? event.title : "";
  el("event-recurrence").value = event && event.isRecurring ? event.recurrenceRule : "none";
  // 每次開啟表單都重置「結束時間是否已被使用者手動改過」的追蹤旗標
  endTimeManuallyEdited = false;

  const checkedIds = event ? event.memberIds || [] : [];
  el("event-members-checkboxes").innerHTML = state.members
    .map((m) => renderMemberCheckboxHTML(m, checkedIds.includes(m.id)))
    .join("");

  openModal("modal-event-form");
}

function getFormMemberIds() {
  return Array.from(el("event-members-checkboxes").querySelectorAll("input[type=checkbox]:checked")).map((i) => i.value);
}

// 開始時間變更時，若使用者尚未手動改過結束時間，自動帶入「開始時間 + 1小時」
let endTimeManuallyEdited = false;
function addOneHour(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = Math.min(h * 60 + m + 60, 23 * 60 + 59);
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
el("event-start-time").addEventListener("input", () => {
  if (!endTimeManuallyEdited && el("event-start-time").value) {
    el("event-end-time").value = addOneHour(el("event-start-time").value);
  }
});
el("event-end-time").addEventListener("input", () => {
  endTimeManuallyEdited = true;
});

// 即時衝突偵測：欄位變動時檢查一次
["event-date", "event-start-time", "event-end-time"].forEach((id) => {
  el(id).addEventListener("change", checkConflictPreview);
});
el("event-members-checkboxes").addEventListener("change", checkConflictPreview);

function checkConflictPreview() {
  const dateKey = el("event-date").value;
  const startTime = el("event-start-time").value;
  const endTime = el("event-end-time").value;
  const memberIds = getFormMemberIds();
  if (!dateKey || !startTime || !endTime || memberIds.length === 0) {
    el("event-conflict-warning").classList.add("hidden");
    return;
  }
  const excludeId = el("event-id").value || null;
  const conflicts = detectConflicts(dateKey, startTime, endTime, memberIds, state.events, excludeId);
  el("event-conflict-warning").classList.toggle("hidden", conflicts.length === 0);
}

function upsertLocalEvent(newEvent) {
  const idx = state.events.findIndex((e) => e.id === newEvent.id);
  if (idx >= 0) {
    state.events = [...state.events.slice(0, idx), newEvent, ...state.events.slice(idx + 1)];
  } else {
    state.events = [...state.events, newEvent];
  }
}

el("event-form").addEventListener("submit", async (evt) => {
  evt.preventDefault();
  if (!requireLogin()) return;

  const id = el("event-id").value || null;
  const dateKey = el("event-date").value;
  const startTime = el("event-start-time").value;
  const endTime = el("event-end-time").value;
  if (endTime <= startTime) {
    showToast("結束時間需晚於開始時間");
    return;
  }
  const memberIds = getFormMemberIds();
  const title = el("event-content").value.trim();
  const recurrenceValue = el("event-recurrence").value;
  const now = new Date().toISOString();

  const existing = id ? state.events.find((e) => e.id === id) : null;
  const payload = {
    title,
    memberIds,
    startAt: `${dateKey}T${startTime}`,
    endAt: `${dateKey}T${endTime}`,
    isRecurring: recurrenceValue !== "none",
    recurrenceRule: recurrenceValue,
    exceptions: existing ? existing.exceptions || [] : [],
    updatedAt: now,
    createdAt: existing ? existing.createdAt : now,
  };

  try {
    let savedId = id;
    if (id) {
      await cloud.updateEvent(id, payload);
      showToast("行程已更新");
    } else {
      savedId = await cloud.addEvent(payload);
      showToast("行程已新增");
    }
    // 樂觀更新本地狀態，不等待 Firestore onSnapshot 回傳，
    // 確保儲存後立即重新開啟當天行程 Modal 就能看到最新內容。
    upsertLocalEvent({ ...payload, id: savedId });
    closeModal("modal-event-form");
    renderCalendar();
    openDayEventsModal(dateKey);
  } catch (error) {
    showToast("儲存失敗，請稍後再試");
  }
});

el("btn-delete-event").addEventListener("click", () => {
  const id = el("event-id").value;
  const event = state.events.find((e) => e.id === id);
  if (!event) return;
  closeModal("modal-event-form");
  confirmDeleteEvent(event, el("event-date").value);
});

// ---------- 成員管理 ----------
el("btn-manage-members").addEventListener("click", () => {
  el("view-calendar").classList.add("hidden");
  el("view-members").classList.remove("hidden");
});
el("btn-back-to-calendar").addEventListener("click", () => {
  el("view-members").classList.add("hidden");
  el("view-calendar").classList.remove("hidden");
});

function renderMembersView() {
  const list = el("members-list");
  list.innerHTML = state.members.length
    ? state.members.map(renderMemberRowHTML).join("")
    : `<li class="member-row">尚未新增任何成員</li>`;
  list.querySelectorAll(".btn-edit-member").forEach((btn) => {
    btn.addEventListener("click", () => openMemberForm(state.members.find((m) => m.id === btn.dataset.memberId)));
  });
}

el("btn-add-member").addEventListener("click", () => {
  if (!requireLogin()) return;
  openMemberForm(null);
});

function openMemberForm(member) {
  el("member-form").reset();
  el("member-form-title").textContent = member ? "編輯成員" : "新增成員";
  el("member-id").value = member ? member.id : "";
  el("member-name").value = member ? member.name : "";
  el("member-initial").value = member ? member.initial : "";
  el("member-color").value = member ? member.color : "#3b82f6";
  el("btn-delete-member").classList.toggle("hidden", !member);
  openModal("modal-member-form");
}

el("member-form").addEventListener("submit", async (evt) => {
  evt.preventDefault();
  if (!requireLogin()) return;
  const initial = el("member-initial").value.trim();
  if (!validateInitial(initial)) {
    showToast("簡稱限輸入 1 個字元");
    return;
  }
  const id = el("member-id").value || null;
  const payload = {
    name: el("member-name").value.trim(),
    initial,
    color: el("member-color").value,
  };
  try {
    if (id) {
      await cloud.updateMember(id, payload);
      showToast("成員已更新");
    } else {
      await cloud.addMember(payload);
      showToast("成員已新增");
    }
    closeModal("modal-member-form");
  } catch (error) {
    showToast("儲存失敗，請稍後再試");
  }
});

el("btn-delete-member").addEventListener("click", () => {
  const id = el("member-id").value;
  const member = state.members.find((m) => m.id === id);
  if (!member) return;
  closeModal("modal-member-form");
  openConfirm(`確定要刪除成員「${member.name}」嗎？此動作無法復原。`, [
    {
      label: "確定刪除",
      className: "btn-danger",
      onClick: async () => {
        await cloud.deleteMember(id);
        showToast("成員已刪除");
      },
    },
    { label: "取消", className: "btn-secondary", onClick: () => {} },
  ]);
});

// ---------- 搜尋 ----------
el("btn-search-toggle").addEventListener("click", () => {
  el("search-panel").classList.toggle("hidden");
});

el("btn-search").addEventListener("click", runSearch);
el("search-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") runSearch();
});

function runSearch() {
  const keyword = el("search-input").value.trim().toLowerCase();
  const resultsEl = el("search-results");
  if (!keyword) {
    resultsEl.innerHTML = "";
    return;
  }
  const rangeStart = toDateKey(new Date(state.today.getFullYear() - 1, state.today.getMonth(), 1));
  const rangeEnd = toDateKey(new Date(state.today.getFullYear() + 1, state.today.getMonth(), 1));
  const occurrences = expandEventsInRange(state.events, rangeStart, rangeEnd);

  const matched = occurrences.filter(({ event }) => {
    const memberNames = (event.memberIds || [])
      .map((id) => state.members.find((m) => m.id === id))
      .filter(Boolean)
      .map((m) => m.name.toLowerCase());
    return event.title.toLowerCase().includes(keyword) || memberNames.some((n) => n.includes(keyword));
  });
  matched.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  resultsEl.innerHTML = matched.length
    ? matched
        .map(
          ({ event, dateKey }) =>
            `<li data-date-key="${dateKey}">${dateKey}　${escapeHtml(summarizeTitle(event.title, 18))}</li>`
        )
        .join("")
    : `<li>找不到符合的行程</li>`;

  resultsEl.querySelectorAll("li[data-date-key]").forEach((li) => {
    li.addEventListener("click", () => {
      const [y, m] = li.dataset.dateKey.split("-").map(Number);
      state.year = y;
      state.month = m - 1;
      renderCalendar();
      el("search-panel").classList.add("hidden");
      openDayEventsModal(li.dataset.dateKey);
    });
  });
}

// 初次渲染（假日資料載入前先畫出空月曆，避免畫面空白）
renderCalendar();
