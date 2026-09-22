// tests/firebase-config-status.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { isFirebaseConfigured } from "../js/firebase-config-status.js";

test("未提供設定時視為未設定", () => {
  assert.equal(isFirebaseConfigured(null), false);
  assert.equal(isFirebaseConfigured(undefined), false);
  assert.equal(isFirebaseConfigured({}), false);
});

test("範本佔位字串（YOUR_ 開頭）視為未設定", () => {
  const config = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    appId: "YOUR_APP_ID",
  };
  assert.equal(isFirebaseConfigured(config), false);
});

test("缺少必要欄位時視為未設定", () => {
  const config = {
    apiKey: "abc123",
    authDomain: "demo.firebaseapp.com",
    projectId: "demo-project",
  };
  assert.equal(isFirebaseConfigured(config), false);
});

test("完整且非佔位字串的設定視為已設定", () => {
  const config = {
    apiKey: "AIzaSyDemoKeyXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "demo-project.firebaseapp.com",
    projectId: "demo-project",
    storageBucket: "demo-project.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456",
  };
  assert.equal(isFirebaseConfigured(config), true);
});
