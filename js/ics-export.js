const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

function escapeIcsText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function compactDateTime(dateKey, time) {
  return `${dateKey.replaceAll("-", "")}T${time.replace(":", "")}00`;
}

function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function daysBetween(startKey, endKey) {
  const toUtc = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(endKey) - toUtc(startKey)) / 86400000);
}

/**
 * 產生單次事件的 iCalendar 內容。時間使用 floating local time，不加 TZID 或 Z。
 * event.memberNames 可由 UI 注入，供 DESCRIPTION 顯示。
 */
export function buildIcsContent(event, occurrenceDateKey) {
  const originalStartDate = event.startAt.slice(0, 10);
  const originalEndDate = event.endAt.slice(0, 10);
  const occurrenceEndDate = addDays(
    occurrenceDateKey,
    Math.max(0, daysBetween(originalStartDate, originalEndDate))
  );
  const startTime = event.startAt.slice(11, 16);
  const endTime = event.endAt.slice(11, 16);
  const memberNames = Array.isArray(event.memberNames) ? event.memberNames.filter(Boolean) : [];
  const description = memberNames.length ? `參與成員：${memberNames.join("、")}` : "";
  const uidId = String(event.id || "event").replace(/[^A-Za-z0-9_-]/g, "-");
  const uid = `${uidId}-${occurrenceDateKey}@wangmi-family-calendar`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WangMi Family Calendar//ZH-TW",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${occurrenceDateKey.replaceAll("-", "")}T000000Z`,
    `DTSTART:${compactDateTime(occurrenceDateKey, startTime)}`,
    `DTEND:${compactDateTime(occurrenceEndDate, endTime)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function buildIcsFilename(event, occurrenceDateKey) {
  const safeTitle = String(event.title || "行程")
    .replace(INVALID_FILENAME_CHARS, "_")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 30) || "行程";
  return `${safeTitle}_${occurrenceDateKey}.ics`;
}

export function isIosDevice(userAgent) {
  return /iP(hone|ad|od)/.test(userAgent || "");
}

export function buildShortcutPayload(event, occurrenceDateKey) {
  const originalStartDate = event.startAt.slice(0, 10);
  const originalEndDate = event.endAt.slice(0, 10);
  const occurrenceEndDate = addDays(
    occurrenceDateKey,
    Math.max(0, daysBetween(originalStartDate, originalEndDate))
  );
  const memberNames = Array.isArray(event.memberNames) ? event.memberNames.filter(Boolean) : [];

  return {
    title: event.title,
    startAt: `${occurrenceDateKey}T${event.startAt.slice(11, 16)}:00`,
    endAt: `${occurrenceEndDate}T${event.endAt.slice(11, 16)}:00`,
    notes: memberNames.length ? `參與成員：${memberNames.join("、")}` : "",
  };
}

export function buildShortcutUrl(event, occurrenceDateKey, shortcutName = "新增家庭行程") {
  const payload = JSON.stringify(buildShortcutPayload(event, occurrenceDateKey));
  return `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName)}&input=text&text=${encodeURIComponent(payload)}`;
}

export function addToDeviceCalendar(event, occurrenceDateKey) {
  if (isIosDevice(navigator.userAgent)) {
    window.location.href = buildShortcutUrl(event, occurrenceDateKey);
    return;
  }

  const icsContent = buildIcsContent(event, occurrenceDateKey);
  const blob = new Blob([icsContent], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildIcsFilename(event, occurrenceDateKey);
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
