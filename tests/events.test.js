// tests/events.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { occursOnDate, expandEventsInRange, groupOccurrencesByDate, detectConflicts, summarizeTitle } from "../js/events.js";

function makeEvent(overrides) {
  return {
    id: "e1",
    title: "測試行程",
    memberIds: ["m1"],
    startAt: "2026-01-05T09:00",
    endAt: "2026-01-05T10:00",
    category: "other",
    isRecurring: false,
    recurrenceRule: "none",
    exceptions: [],
    ...overrides,
  };
}

test("不重複行程只在原始日期出現", () => {
  const event = makeEvent({});
  assert.equal(occursOnDate(event, "2026-01-05"), true);
  assert.equal(occursOnDate(event, "2026-01-12"), false);
  assert.equal(occursOnDate(event, "2026-01-04"), false); // 早於原始日期
});

test("每週重複行程在相同星期幾出現", () => {
  const event = makeEvent({ isRecurring: true, recurrenceRule: "weekly" });
  assert.equal(occursOnDate(event, "2026-01-05"), true);
  assert.equal(occursOnDate(event, "2026-01-12"), true); // 一週後同星期
  assert.equal(occursOnDate(event, "2026-01-13"), false); // 隔天不同星期
});

test("每月重複行程在相同日期出現，超出天數時對齊月底", () => {
  const event = makeEvent({ startAt: "2026-01-31T09:00", endAt: "2026-01-31T10:00", isRecurring: true, recurrenceRule: "monthly" });
  assert.equal(occursOnDate(event, "2026-01-31"), true);
  assert.equal(occursOnDate(event, "2026-02-28"), true); // 2月無31日，順延至月底
  assert.equal(occursOnDate(event, "2026-03-31"), true);
});

test("exceptions 中列出的日期即使符合規則也不出現（刪除本次）", () => {
  const event = makeEvent({ isRecurring: true, recurrenceRule: "weekly", exceptions: ["2026-01-12"] });
  assert.equal(occursOnDate(event, "2026-01-05"), true);
  assert.equal(occursOnDate(event, "2026-01-12"), false);
  assert.equal(occursOnDate(event, "2026-01-19"), true);
});

test("expandEventsInRange 展開範圍內所有出現次數並可依日期分組", () => {
  const event = makeEvent({ isRecurring: true, recurrenceRule: "weekly" });
  const occurrences = expandEventsInRange([event], "2026-01-01", "2026-01-31");
  const dateKeys = occurrences.map((o) => o.dateKey);
  assert.deepEqual(dateKeys, ["2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26"]);

  const grouped = groupOccurrencesByDate(occurrences);
  assert.ok(Array.isArray(grouped["2026-01-05"]));
});

test("detectConflicts 偵測同成員同時段重疊", () => {
  const existing = makeEvent({ id: "e1", memberIds: ["m1"], startAt: "2026-01-05T09:00", endAt: "2026-01-05T10:00" });
  const conflicts = detectConflicts("2026-01-05", "09:30", "10:30", ["m1"], [existing], null);
  assert.equal(conflicts.length, 1);
});

test("detectConflicts 不同成員或不同時段不算衝突", () => {
  const existing = makeEvent({ id: "e1", memberIds: ["m1"], startAt: "2026-01-05T09:00", endAt: "2026-01-05T10:00" });
  assert.equal(detectConflicts("2026-01-05", "10:00", "11:00", ["m1"], [existing], null).length, 0); // 相接不重疊
  assert.equal(detectConflicts("2026-01-05", "09:30", "10:30", ["m2"], [existing], null).length, 0); // 不同成員
});

test("detectConflicts 排除正在編輯的自己", () => {
  const existing = makeEvent({ id: "e1", memberIds: ["m1"], startAt: "2026-01-05T09:00", endAt: "2026-01-05T10:00" });
  assert.equal(detectConflicts("2026-01-05", "09:00", "10:00", ["m1"], [existing], "e1").length, 0);
});

test("summarizeTitle 超過長度會截斷並加上刪節號", () => {
  const long = "a".repeat(30);
  assert.equal(summarizeTitle(long, 24), "a".repeat(24) + "...");
  assert.equal(summarizeTitle("短內容", 24), "短內容");
});
