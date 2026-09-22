// tests/access-config-status.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { matchesAccessKey } from "../js/access-config-status.js";

test("網址帶入的 key 與設定值相符時比對成功", () => {
  assert.equal(matchesAccessKey("my-secret-key-123", "my-secret-key-123"), true);
});

test("網址帶入的 key 與設定值不符時比對失敗", () => {
  assert.equal(matchesAccessKey("my-secret-key-123", "wrong-key"), false);
});

test("缺少任一方時比對失敗（不觸發登入）", () => {
  assert.equal(matchesAccessKey("my-secret-key-123", ""), false);
  assert.equal(matchesAccessKey("my-secret-key-123", null), false);
  assert.equal(matchesAccessKey("my-secret-key-123", undefined), false);
  assert.equal(matchesAccessKey("", "my-secret-key-123"), false);
  assert.equal(matchesAccessKey(null, "my-secret-key-123"), false);
});

test("範本佔位字串（YOUR_ 開頭）一律視為未設定", () => {
  assert.equal(matchesAccessKey("YOUR_SECRET_KEY", "YOUR_SECRET_KEY"), false);
});

test("首尾空白會先被 trim 再比對", () => {
  assert.equal(matchesAccessKey("  my-secret-key-123  ", "my-secret-key-123"), true);
});
