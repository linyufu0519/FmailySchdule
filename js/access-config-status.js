// js/access-config-status.js
// 純函式：比對網址帶入的 ?key= 是否與 access-config.js 設定的密鑰相符。
// 拆成獨立檔案是為了能在 Node 測試中直接驗證比對邏輯，不依賴瀏覽器或 Firebase。

/**
 * @param {string|null|undefined} secretKey access-config.js 設定的密鑰
 * @param {string|null|undefined} providedKey 網址 ?key= 帶入的值
 * @returns {boolean} 是否比對成功，成功才應觸發自動登入
 */
export function matchesAccessKey(secretKey, providedKey) {
  if (typeof secretKey !== "string" || typeof providedKey !== "string") return false;
  const secret = secretKey.trim();
  const provided = providedKey.trim();
  if (secret.length === 0 || provided.length === 0) return false;
  // 範本裡的佔位字串一律視為「尚未設定」，避免忘記填寫時被意外比對成功
  if (/^YOUR_/i.test(secret)) return false;
  return secret === provided;
}
