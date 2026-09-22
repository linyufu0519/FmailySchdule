// js/firebase-config-status.js
// 純函式：判斷目前是否已經填好一組「看起來有效」的 Firebase 設定。
// 不依賴瀏覽器或 Firebase SDK，因此可以在 Node 測試中直接驗證，
// 也是「未設定雲端同步時必須優雅回退」的判斷依據。

const REQUIRED_KEYS = ["apiKey", "authDomain", "projectId", "appId"];

/**
 * @param {object|null|undefined} config 由 js/firebase-config.js 匯出的 firebaseConfig
 * @returns {boolean} 是否可視為已完成設定（非佔位字串、必要欄位齊全）
 */
export function isFirebaseConfigured(config) {
  if (!config || typeof config !== "object") return false;
  return REQUIRED_KEYS.every((key) => {
    const value = config[key];
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    if (trimmed.length === 0) return false;
    // js/firebase-config.example.js 範本裡的佔位字串一律視為「尚未設定」
    if (/^YOUR_/i.test(trimmed)) return false;
    return true;
  });
}

export const FIREBASE_CONFIG_REQUIRED_KEYS = REQUIRED_KEYS;
