import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCalendarStoragePath,
  buildCalendarUploadMetadata,
  sanitizeCalendarFileName,
} from "../js/cloud-sync.js";

const FAMILY_ID = "Family_1234567890_Abcdefghijklmn";
const UUID_A = "123e4567-e89b-12d3-a456-426614174000";
const UUID_B = "123e4567-e89b-12d3-a456-426614174001";

test("Storage 路徑只含 familyId、UUID 與安全檔名", () => {
  const path = buildCalendarStoragePath(FAMILY_ID, "event.ics", UUID_A);

  assert.equal(path, `calendar-exports/${FAMILY_ID}/${UUID_A}-event.ics`);
  assert.doesNotMatch(path, /家庭聚餐|媽媽|小希希/);
});

test("不同 UUID 產生不同 Storage 路徑，不覆蓋既有檔案", () => {
  assert.notEqual(
    buildCalendarStoragePath(FAMILY_ID, "event.ics", UUID_A),
    buildCalendarStoragePath(FAMILY_ID, "event.ics", UUID_B)
  );
});

test("檔名過濾非 ASCII 與 header/path 危險字元", () => {
  assert.equal(sanitizeCalendarFileName('家庭行程\r\n"x".ics'), "x_.ics");
  assert.equal(sanitizeCalendarFileName("event"), "event.ics");
});

test("拒絕不合法 familyId 與 UUID", () => {
  assert.throws(
    () => buildCalendarStoragePath("short", "event.ics", UUID_A),
    /家庭識別碼格式不正確/
  );
  assert.throws(
    () => buildCalendarStoragePath(FAMILY_ID, "event.ics", "not-a-uuid"),
    /匯出檔案識別碼格式不正確/
  );
});

test("上傳 metadata 使用精確 calendar MIME 與安全 ASCII disposition", () => {
  assert.deepEqual(buildCalendarUploadMetadata("2026-09-23T03:00:00.000Z"), {
    contentType: "text/calendar",
    contentDisposition: 'attachment; filename="event.ics"',
    customMetadata: { createdAt: "2026-09-23T03:00:00.000Z" },
  });
});
