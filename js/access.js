// js/access.js
// URL key 同時作為家庭識別碼；前端不保存任何帳密或固定密鑰。
const FAMILY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

/**
 * 驗證家庭 key。只允許適合 Firestore 文件路徑的安全字元。
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidFamilyKey(value) {
  return typeof value === "string" && FAMILY_KEY_PATTERN.test(value);
}

/**
 * 從網址解析 familyId；缺少或格式不合法時回傳 null。
 * @param {string} search 通常傳入 window.location.search
 * @returns {string|null}
 */
export function resolveFamilyId(search) {
  const familyId = new URLSearchParams(search || "").get("key");
  return isValidFamilyKey(familyId) ? familyId : null;
}
