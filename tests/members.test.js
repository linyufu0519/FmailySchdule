// tests/members.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { validateInitial, readableTextColor, escapeHtml, renderMemberCheckboxHTML } from "../js/members.js";

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

test("renderMemberCheckboxHTML 只顯示簡稱，不顯示全名", () => {
  const html = renderMemberCheckboxHTML({ id: "m1", name: "爸爸", initial: "爸", color: "#3b82f6" }, false);
  assert.ok(html.includes("爸"));
  assert.ok(!html.includes("爸爸"));
});
