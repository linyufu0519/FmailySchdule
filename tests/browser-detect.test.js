import test from "node:test";
import assert from "node:assert/strict";
import { isLineInAppBrowser } from "../js/browser-detect.js";

const LINE_IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Line/13.15.0";
const LINE_ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.0.0 Mobile Safari/537.36 Line/13.15.0";
const LINE_UPPERCASE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LINE/13.15.0";
const SAFARI_IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36";
const DESKTOP_CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";

test("isLineInAppBrowser 對 LINE iOS UA 回傳 true", () => {
  assert.equal(isLineInAppBrowser(LINE_IOS_UA), true);
});

test("isLineInAppBrowser 對 LINE Android UA 回傳 true", () => {
  assert.equal(isLineInAppBrowser(LINE_ANDROID_UA), true);
});

test("isLineInAppBrowser 對大寫 LINE/ 標記也回傳 true", () => {
  assert.equal(isLineInAppBrowser(LINE_UPPERCASE_UA), true);
});

test("isLineInAppBrowser 對 Safari/Chrome/桌面瀏覽器回傳 false", () => {
  assert.equal(isLineInAppBrowser(SAFARI_IOS_UA), false);
  assert.equal(isLineInAppBrowser(CHROME_ANDROID_UA), false);
  assert.equal(isLineInAppBrowser(DESKTOP_CHROME_UA), false);
});

test("isLineInAppBrowser 對缺少或空 UA 回傳 false", () => {
  assert.equal(isLineInAppBrowser(""), false);
  assert.equal(isLineInAppBrowser(undefined), false);
  assert.equal(isLineInAppBrowser(null), false);
});
