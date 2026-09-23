import test from "node:test";
import assert from "node:assert/strict";
import { buildIcsContent, buildIcsFilename, downloadIcs } from "../js/ics-export.js";

function makeEvent(overrides = {}) {
  return {
    id: "event-123",
    title: "家庭聚餐",
    memberNames: ["媽媽", "小希希"],
    startAt: "2026-09-23T18:30",
    endAt: "2026-09-23T20:00",
    ...overrides,
  };
}

test("產生標準 ICS 標頭、floating local time、成員與唯一 UID", () => {
  const ics = buildIcsContent(makeEvent(), "2026-09-30");

  assert.match(ics, /^BEGIN:VCALENDAR\r\nVERSION:2.0\r\n/);
  assert.match(ics, /DTSTART:20260930T183000\r\n/);
  assert.match(ics, /DTEND:20260930T200000\r\n/);
  assert.match(ics, /DTSTAMP:20260930T000000Z\r\n/);
  assert.match(ics, /SUMMARY:家庭聚餐\r\n/);
  assert.match(ics, /DESCRIPTION:參與成員：媽媽、小希希\r\n/);
  assert.match(ics, /UID:event-123-2026-09-30@wangmi-family-calendar\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  assert.doesNotMatch(ics, /TZID|DT(?:START|END):[^\r\n]*Z/);
});

test("重複行程只匯出指定 occurrence 日期", () => {
  const ics = buildIcsContent(makeEvent({ isRecurring: true, recurrenceRule: "weekly" }), "2026-10-07");

  assert.match(ics, /DTSTART:20261007T183000/);
  assert.match(ics, /DTEND:20261007T200000/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert.doesNotMatch(ics, /RRULE/);
});

test("跨日行程保留結束日期的日數差", () => {
  const event = makeEvent({
    startAt: "2026-09-23T23:30",
    endAt: "2026-09-24T01:00",
  });
  const ics = buildIcsContent(event, "2026-10-01");

  assert.match(ics, /DTSTART:20261001T233000/);
  assert.match(ics, /DTEND:20261002T010000/);
});

test("ICS 文字正確跳脫反斜線、逗號、分號與換行", () => {
  const event = makeEvent({
    title: "採買,牛奶;麵包\\清單\n第二行",
    memberNames: ["媽媽,阿姨", "小希;希"],
  });
  const ics = buildIcsContent(event, "2026-09-23");

  assert.match(ics, /SUMMARY:採買\\,牛奶\\;麵包\\\\清單\\n第二行/);
  assert.match(ics, /DESCRIPTION:參與成員：媽媽\\,阿姨、小希\\;希/);
});

test("下載檔名過濾危險字元並附加日期", () => {
  const filename = buildIcsFilename(makeEvent({ title: '晚餐/聚會:test*?"' }), "2026-09-23");
  assert.equal(filename, "晚餐_聚會_test____2026-09-23.ics");
});

test("downloadIcs 以 text/calendar Blob 與 download anchor 觸發下載", async () => {
  const originalDocument = globalThis.document;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  let capturedBlob;
  let appendedLink;
  let clicked = false;
  let revokedUrl;

  try {
    globalThis.document = {
      createElement: () => ({
        click: () => {
          clicked = true;
        },
        remove: () => {},
      }),
      body: {
        appendChild: (link) => {
          appendedLink = link;
        },
      },
    };
    URL.createObjectURL = (blob) => {
      capturedBlob = blob;
      return "blob:test-calendar";
    };
    URL.revokeObjectURL = (url) => {
      revokedUrl = url;
    };

    downloadIcs(makeEvent(), "2026-09-23");
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(clicked, true);
    assert.equal(appendedLink.href, "blob:test-calendar");
    assert.equal(appendedLink.download, "家庭聚餐_2026-09-23.ics");
    assert.equal(capturedBlob.type, "text/calendar;charset=utf-8");
    assert.match(await capturedBlob.text(), /SUMMARY:家庭聚餐/);
    assert.equal(revokedUrl, "blob:test-calendar");
  } finally {
    globalThis.document = originalDocument;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  }
});
