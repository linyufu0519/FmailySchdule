// js/calendar.js
// 月曆計算與國定假日查詢；核心函式為純函式，方便在 Node 測試中直接驗證。

/**
 * 將日期格式化為 "YYYY-MM-DD" 字串（依本地時區，不受時區位移影響）。
 * @param {Date} date
 */
export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 產生某年某月的月曆格子（週日為每週第一天），含上下月補齊的日期。
 * @param {number} year
 * @param {number} month 0-based（0=一月）
 * @returns {{date: Date, dateKey: string, inMonth: boolean}[]} 攤平為單一陣列，長度為 7 的倍數
 */
export function buildMonthGrid(year, month) {
  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekday = firstDayOfMonth.getDay(); // 0=週日
  const gridStart = new Date(year, month, 1 - startWeekday);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    cells.push({
      date,
      dateKey: toDateKey(date),
      inMonth: date.getMonth() === month && date.getFullYear() === year,
    });
  }
  return cells;
}

export function formatYearMonth(year, month) {
  return `${year}年${month + 1}月`;
}

export function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * 查詢某日期的國定假日名稱。
 * @param {string} dateKey "YYYY-MM-DD"
 * @param {object} holidaysData 由 holidays.json 載入的物件，key 為年度字串
 * @returns {string|null}
 */
export function getHolidayName(dateKey, holidaysData) {
  if (!holidaysData) return null;
  const year = dateKey.slice(0, 4);
  const list = holidaysData[year];
  if (!list) return null;
  const found = list.find((h) => h.date === dateKey);
  return found ? found.name : null;
}

let cachedHolidays = null;

/** 從 js/holidays.json 載入假日資料（失敗時安全回傳空物件，不影響月曆顯示）。 */
export async function loadHolidays() {
  if (cachedHolidays) return cachedHolidays;
  try {
    const res = await fetch(new URL("./holidays.json", import.meta.url));
    cachedHolidays = res.ok ? await res.json() : {};
  } catch (error) {
    cachedHolidays = {};
  }
  return cachedHolidays;
}
