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

function makeWindowObject() {
  return {
    location: { assigned: "", assign(url) { this.assigned = url; } },
  };
}

test("上傳成功後於目前頁面導向下載網址，並正確恢復 loading", async () => {
  const windowObject = makeWindowObject();
  const loadingStates = [];
  const uploader = async (familyId, fileName, content) => {
    assert.equal(familyId, "family-id");
    assert.equal(fileName, "event.ics");
    assert.match(content, /SUMMARY:家庭聚餐/);
    return "https://storage.example/event.ics";
  };

  await openCalendarExport({
    event: makeEvent(),
    occurrenceDateKey: "2026-09-30",
    familyId: "family-id",
    uploader,
    windowObject,
    setLoading: (loading) => loadingStates.push(loading),
  });

  assert.equal(windowObject.location.assigned, "https://storage.example/event.ics");
  assert.deepEqual(loadingStates, [true, false]);
});

test("上傳失敗時不導向、回報錯誤並解除 loading", async () => {
  const windowObject = makeWindowObject();
  const error = new Error("upload failed");
  const errors = [];
  const loadingStates = [];

  await assert.rejects(
    () => openCalendarExport({
      event: makeEvent(),
      occurrenceDateKey: "2026-09-23",
      familyId: "family-id",
      uploader: async () => { throw error; },
      windowObject,
      setLoading: (loading) => loadingStates.push(loading),
      onError: (received) => errors.push(received),
    }),
    /upload failed/
  );

  assert.equal(windowObject.location.assigned, "");
  assert.deepEqual(errors, [error]);
  assert.deepEqual(loadingStates, [true, false]);
});

test("點擊後立即設定 loading，不等待上傳完成", async () => {
  const windowObject = makeWindowObject();
  const loadingStates = [];
  let resolveUpload;
  const uploader = () => new Promise((resolve) => {
    resolveUpload = resolve;
  });

  const promise = openCalendarExport({
    event: makeEvent(),
    occurrenceDateKey: "2026-09-23",
    familyId: "family-id",
    uploader,
    windowObject,
    setLoading: (loading) => loadingStates.push(loading),
  });

  assert.deepEqual(loadingStates, [true]);
  // uploader() 是在 microtask 中被呼叫的，先讓佇列跑一輪讓 resolveUpload 被賦值
  await Promise.resolve();
  resolveUpload("https://storage.example/event.ics");
  await promise;
  assert.deepEqual(loadingStates, [true, false]);
});
