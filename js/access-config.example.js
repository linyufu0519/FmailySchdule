// js/access-config.example.js
// ------------------------------------------------------------------
// 這是可以放心 commit 到 Git 的「範本檔」。
// 使用步驟：
//   1. 複製這個檔案，另存為 js/access-config.js（同一個資料夾）
//   2. 自己產生一組足夠長、足夠隨機的密鑰字串，填入 secretKey
//      （建議 20 碼以上英數字，例如用密碼產生器產生）
//   3. sharedEmail / sharedPassword 填入 Firebase Authentication 已註冊好的
//      全家共用帳號（見 FIREBASE_SETUP.md 步驟三、七）
//
// 安全性說明（重要，請務必詳讀）：
//   本專案已移除登入表單，改用「網址帶入密鑰」的隱藏連結機制：只要造訪網址時
//   帶對 ?key= 參數，就會自動用下面的共用帳密靜默登入。
//   這是「知道網址就能存取」的輕量防護（obscurity-based security），
//   並不是帳號等級的強驗證——任何拿到含密鑰完整網址的人都能讀寫本應用資料。
//   真正把關資料存取的仍然是 Firestore Security Rules（只允許已登入使用者
//   讀寫），密鑰本身只是「避免被隨便路過的人看到/誤觸」的門檻，不是無法破解
//   的保護機制，請自行評估外流風險，並只透過家庭群組私訊分享含密鑰的網址，
//   不要公開張貼（例如公開社群貼文、公開 GitHub Issue 等）。
// ------------------------------------------------------------------
export const accessConfig = {
  secretKey: "YOUR_SECRET_KEY", // 網址 ?key= 要比對的值，建議用一長串隨機英數字
  sharedEmail: "YOUR_SHARED_EMAIL",
  sharedPassword: "YOUR_SHARED_PASSWORD",
};
