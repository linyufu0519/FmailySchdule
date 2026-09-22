// tests/members.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { validateInitial, readableTextColor, escapeHtml } from "../js/members.js";

test("validateInitial 僅接受剛好 1 個字元", () => {
  assert.equal(validateInitial("爸"), true);
  assert.equal(validateInitial("A"), true);
  assert.equal(validateInitial(""), false);
  assert.equal(validateInitial("爸爸"), false);
  assert.equal(validateInitial(null), false);
});

test("readableTextColor 依背景亮度回傳可讀文字色", () => {
  assert.equal(readableTextColor("#ffffff"), "#1f2430"); // 淺色背景用深字
  assert.equal(readableTextColor("#000000"), "#ffffff"); // 深色背景用淺字
});

test("escapeHtml 避免 XSS 注入", () => {
  assert.equal(escapeHtml('<script>alert(1)</script>'), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.equal(escapeHtml(undefined), "");
});
