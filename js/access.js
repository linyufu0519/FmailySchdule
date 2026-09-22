// js/access.js
// 「隱藏連結」存取機制：不提供任何登入 UI，改由網址 ?key= 參數比對成功後，
// 自動用共用帳密靜默登入（使用者完全無感知，不會看到登入表單或錯誤訊息）。
// 設定值放在 js/access-config.js（.gitignore 排除，範本見 js/access-config.example.js），
// 讀取方式比照 js/cloud-sync.js 對 js/firebase-config.js 的作法：
// 檔案不存在或內容仍是範本佔位字串，一律視為「未設定」，安全地略過、不丟出例外。
import { matchesAccessKey } from "./access-config-status.js";

let cachedConfig; // undefined = 尚未嘗試讀取；null = 讀取失敗或不存在

async function loadAccessConfig() {
  if (cachedConfig !== undefined) return cachedConfig;
  try {
    const module = await import("./access-config.js");
    cachedConfig = module.accessConfig || null;
  } catch (error) {
    cachedConfig = null;
  }
  return cachedConfig;
}

/**
 * 依網址的 ?key= 參數與 access-config.js 設定，判斷是否應自動登入。
 * @param {string} search 通常傳入 window.location.search
 * @returns {Promise<{email:string,password:string}|null>} 可自動登入時回傳帳密，
 *   否則回傳 null（維持唯讀，呼叫端不應嘗試登入、也不應顯示任何錯誤）。
 */
export async function resolveAutoSignIn(search) {
  const config = await loadAccessConfig();
  if (!config) return null;
  const providedKey = new URLSearchParams(search || "").get("key") || "";
  if (!matchesAccessKey(config.secretKey, providedKey)) return null;
  const { sharedEmail, sharedPassword } = config;
  if (!sharedEmail || !sharedPassword) return null;
  return { email: sharedEmail, password: sharedPassword };
}
