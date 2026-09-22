// js/events.js
// 行程資料結構、重複規則展開、時段衝突偵測。核心邏輯為純函式，方便測試。
import { parseDateKey } from "./calendar.js";

// 重複行程固定展開次數：本次 + 接下來 4 次，共 5 次（週/月皆同邏輯，不無限展開）
const MAX_RECURRING_OCCURRENCES = 5;

/** 從 event.startAt / endAt ("YYYY-MM-DDTHH:MM") 拆出日期與時間字串 */
export function getEventDateKey(event) {
  return event.startAt.slice(0, 10);
}
export function getEventStartTime(event) {
  return event.startAt.slice(11, 16);
}
export function getEventEndTime(event) {
  return event.endAt.slice(11, 16);
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * 判斷某筆行程（含重複規則）在指定日期是否有出現一次。
 * @param {object} event { startAt, isRecurring, recurrenceRule, exceptions }
 * @param {string} dateKey "YYYY-MM-DD"
 */
export function occursOnDate(event, dateKey) {
  const anchorKey = getEventDateKey(event);
  if (dateKey < anchorKey) return false;
  if (Array.isArray(event.exceptions) && event.exceptions.includes(dateKey)) return false;

  if (!event.isRecurring || !event.recurrenceRule || event.recurrenceRule === "none") {
    return dateKey === anchorKey;
  }

  const anchorDate = parseDateKey(anchorKey);
  const targetDate = parseDateKey(dateKey);

  if (event.recurrenceRule === "weekly") {
    if (anchorDate.getDay() !== targetDate.getDay()) return false;
    const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
    const weeksDiff = Math.round((targetDate.getTime() - anchorDate.getTime()) / MS_PER_WEEK);
    // 固定展開「本次 + 未來4週」共5次，不再無限展開
    return weeksDiff >= 0 && weeksDiff <= MAX_RECURRING_OCCURRENCES - 1;
  }
  if (event.recurrenceRule === "monthly") {
    const anchorDay = anchorDate.getDate();
    const targetDay = targetDate.getDate();
    const isLastDayOfTargetMonth = targetDay === daysInMonth(targetDate.getFullYear(), targetDate.getMonth());
    const matchesDay =
      anchorDay > daysInMonth(targetDate.getFullYear(), targetDate.getMonth())
        ? isLastDayOfTargetMonth // 若原始日期(如31日)在目標月份不存在，順延對齊到該月最後一天
        : anchorDay === targetDay;
    if (!matchesDay) return false;
    const monthsDiff =
      (targetDate.getFullYear() - anchorDate.getFullYear()) * 12 + (targetDate.getMonth() - anchorDate.getMonth());
    // 固定展開「本次 + 未來4個月」共5次，不再無限展開
    return monthsDiff >= 0 && monthsDiff <= MAX_RECURRING_OCCURRENCES - 1;
  }
  return false;
}

/**
 * 展開一批行程在指定日期範圍內實際出現的所有「單次」清單。
 * @returns {Array<{event: object, dateKey: string}>}
 */
export function expandEventsInRange(events, startKey, endKey) {
  const occurrences = [];
  for (const event of events) {
    let cursor = parseDateKey(startKey < getEventDateKey(event) ? getEventDateKey(event) : startKey);
    const end = parseDateKey(endKey);
    while (cursor <= end) {
      const key = toKey(cursor);
      if (occursOnDate(event, key)) occurrences.push({ event, dateKey: key });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }
  }
  return occurrences;
}

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 依日期分組，回傳 { dateKey: [{event, dateKey}] }，每組依開始時間排序 */
export function groupOccurrencesByDate(occurrences) {
  const map = {};
  for (const occ of occurrences) {
    if (!map[occ.dateKey]) map[occ.dateKey] = [];
    map[occ.dateKey].push(occ);
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => getEventStartTime(a.event).localeCompare(getEventStartTime(b.event)));
  }
  return map;
}

function timeRangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

/**
 * 在指定日期，偵測與現有行程是否有成員 + 時段重疊（僅提醒，不阻擋儲存）。
 * @param {string} dateKey 欲儲存行程實際發生的日期
 * @param {string} startTime "HH:MM"
 * @param {string} endTime "HH:MM"
 * @param {string[]} memberIds
 * @param {object[]} allEvents 目前所有行程（不含正在編輯的這筆）
 * @param {string|null} excludeEventId 編輯時排除自己
 * @returns {object[]} 衝突的行程清單
 */
export function detectConflicts(dateKey, startTime, endTime, memberIds, allEvents, excludeEventId) {
  const conflicts = [];
  for (const event of allEvents) {
    if (excludeEventId && event.id === excludeEventId) continue;
    if (!occursOnDate(event, dateKey)) continue;
    const sharedMembers = (event.memberIds || []).some((id) => memberIds.includes(id));
    if (!sharedMembers) continue;
    if (timeRangesOverlap(startTime, endTime, getEventStartTime(event), getEventEndTime(event))) {
      conflicts.push(event);
    }
  }
  return conflicts;
}

/** 產生固定長度的行程摘要，超過長度以「...」表示可展開 */
export function summarizeTitle(title, maxLen = 24) {
  if (!title) return "";
  if (title.length <= maxLen) return title;
  return `${title.slice(0, maxLen)}...`;
}
