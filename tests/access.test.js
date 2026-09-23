import test from "node:test";
import assert from "node:assert/strict";
import { isValidFamilyKey, resolveFamilyId } from "../js/access.js";
import { getFamilyId, setFamilyId } from "../js/cloud-sync.js";

test("接受至少 16 字元且只含安全字元的家庭 key", () => {
  assert.equal(isValidFamilyKey("Abcd_1234-efgh5678"), true);
  assert.equal(isValidFamilyKey("A".repeat(128)), true);
});

test("拒絕缺少、過短、過長或含不安全字元的家庭 key", () => {
  assert.equal(isValidFamilyKey(null), false);
  assert.equal(isValidFamilyKey("short-key"), false);
  assert.equal(isValidFamilyKey("A".repeat(129)), false);
  assert.equal(isValidFamilyKey("family/key-123456"), false);
  assert.equal(isValidFamilyKey("家庭密鑰1234567890"), false);
  assert.equal(isValidFamilyKey("family key 123456"), false);
});

test("從網址解析合法 familyId", () => {
  assert.equal(resolveFamilyId("?key=Abcd_1234-efgh5678"), "Abcd_1234-efgh5678");
  assert.equal(resolveFamilyId("?other=1"), null);
  assert.equal(resolveFamilyId("?key=invalid%2Fpath123456"), null);
});

test("雲端同步層可設定目前 familyId", () => {
  setFamilyId("Family_1234567890");
  assert.equal(getFamilyId(), "Family_1234567890");
  assert.throws(() => setFamilyId(""), /家庭識別碼不可為空/);
});

test("匿名登入包裝函式在雲端未初始化時明確失敗", async () => {
  const cloud = await import("../js/cloud-sync.js");
  await assert.rejects(() => cloud.signInAnonymously(), /雲端同步尚未啟用/);
});
