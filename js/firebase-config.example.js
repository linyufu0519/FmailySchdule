// js/firebase-config.example.js
// ------------------------------------------------------------------
// 這是可以放心 commit 到 Git 的「範本檔」。
// 使用步驟：
//   1. 複製這個檔案，另存為 js/firebase-config.js（同一個資料夾）
//   2. 到 Firebase 主控台 → 專案設定 → 你的 Web 應用程式 → 複製 firebaseConfig
//   3. 貼到下面對應欄位，取代 "YOUR_..." 佔位字串
//
// 安全性說明（重要）：
//   firebaseConfig 裡的 apiKey / appId 等欄位，設計上就是「公開的用戶端識別碼」，
//   Firebase 官方文件也明確說明可以出現在前端程式碼中，本身不是機密。
//   真正的存取控制來自「Firebase Authentication + Firestore Security Rules」，
//   不是靠隱藏這組設定。因此本站雖然在 .gitignore 排除了 js/firebase-config.js，
//   目的只是避免本機測試/尚未填寫的暫存設定被誤加入版本控制，
//   若要讓 GitHub Pages 正式站台啟用雲端同步，可以在部署用的分支上用
//   `git add -f js/firebase-config.js` 明確加入這個檔案（詳見 FIREBASE_SETUP.md）。
//
//   絕對不要把 Service Account JSON 或任何 private key 放進這個檔案或整個 repo，
//   那些是伺服器端機密，跟這裡的 firebaseConfig 完全不同。
// ------------------------------------------------------------------
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
