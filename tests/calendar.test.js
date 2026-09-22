// tests/calendar.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { buildMonthGrid, toDateKey, formatYearMonth, getHolidayName } from "../js/calendar.js";

test("buildMonthGrid 產生的格數為 7 的倍數，且涵蓋整個月份", () => {
  const grid = buildMonthGrid(2026, 0); // 2026年1月，1號為星期四
  assert.equal(grid.length % 7, 0);
  const inMonthDates = grid.filter((c) => c.inMonth).map((c) => c.date.getDate());
  assert.equal(inMonthDates.length, 31);
  assert.equal(inMonthDates[0], 1);
  assert.equal(inMonthDates[inMonthDates.length - 1], 31);
});

test("buildMonthGrid 第一格必為週日", () => {
  const grid = buildMonthGrid(2026, 1); // 2026年2月
  assert.equal(grid[0].date.getDay(), 0);
});

test("toDateKey 格式為 YYYY-MM-DD", () => {
  assert.equal(toDateKey(new Date(2026, 0, 5)), "2026-01-05");
});

test("formatYearMonth 顯示年月", () => {
  assert.equal(formatYearMonth(2026, 0), "2026年1月");
});

test("getHolidayName 能查到已知的國定假日", () => {
  const holidays = { 2026: [{ date: "2026-01-01", name: "元旦" }] };
  assert.equal(getHolidayName("2026-01-01", holidays), "元旦");
  assert.equal(getHolidayName("2026-01-02", holidays), null);
});

test("getHolidayName 對未提供的年度回傳 null", () => {
  assert.equal(getHolidayName("2030-01-01", { 2026: [] }), null);
  assert.equal(getHolidayName("2026-01-01", null), null);
});
