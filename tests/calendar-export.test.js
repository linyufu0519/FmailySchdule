import test from "node:test";
import assert from "node:assert/strict";
import { openCalendarExport } from "../js/calendar-export.js";

function makeEvent() {
  return {
    id: "event-123",
    title: "家庭聚餐",
    memberNames: ["媽媽"],
    startAt: "2026-09-23T18:30",
    endAt: "2026-09-23T20:00",
  };
}

function makePreviewWindow() {
  return {
    document: { title: "", body: { textContent: "" } },
    location: { replaced: "", replace(url) { this.replaced = url; } },
    closed: false,
    close() { this.closed = true; },
  };
}

test("同步開啟 placeholder，再開始非同步上傳並成功導向", async () => {
  const order = [];
  const preview = makePreviewWindow();
  const windowObject = {
    open() {
      order.push("open");
      return preview;
    },
    location: { href: "" },
  };
  const uploader = async (familyId, fileName, content) => {
    order.push("upload");
    assert.equal(familyId, "family-id");
    assert.equal(fileName, "event.ics");
    assert.match(content, /SUMMARY:家庭聚餐/);
    return "https://storage.example/event.ics";
  };

  const promise = openCalendarExport({
    event: makeEvent(),
    occurrenceDateKey: "2026-09-30",
    familyId: "family-id",
    uploader,
    windowObject,
  });

  assert.deepEqual(order, ["open"]);
  assert.equal(preview.document.body.textContent, "正在準備行事曆…");
  await promise;
  assert.deepEqual(order, ["open", "upload"]);
  assert.equal(preview.location.replaced, "https://storage.example/event.ics");
});

test("popup 被阻擋時完成上傳後改導向目前頁面", async () => {
  const windowObject = {
    open: () => null,
    location: { href: "" },
  };

  await openCalendarExport({
    event: makeEvent(),
    occurrenceDateKey: "2026-09-23",
    familyId: "family-id",
    uploader: async () => "https://storage.example/fallback.ics",
    windowObject,
  });

  assert.equal(windowObject.location.href, "https://storage.example/fallback.ics");
});

test("上傳失敗時關閉 placeholder、回報錯誤並解除 loading", async () => {
  const preview = makePreviewWindow();
  const error = new Error("upload failed");
  const errors = [];
  const loadingStates = [];

  await assert.rejects(
    () => openCalendarExport({
      event: makeEvent(),
      occurrenceDateKey: "2026-09-23",
      familyId: "family-id",
      uploader: async () => { throw error; },
      windowObject: { open: () => preview, location: { href: "" } },
      setLoading: (loading) => loadingStates.push(loading),
      onError: (received) => errors.push(received),
    }),
    /upload failed/
  );

  assert.equal(preview.closed, true);
  assert.deepEqual(errors, [error]);
  assert.deepEqual(loadingStates, [true, false]);
});
