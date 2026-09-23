# Firebase 雲端同步設定教學（繁體中文）

本站是純靜態 GitHub Pages 網站，使用 **Firebase Anonymous Auth** 驗證連線，並把網址中的
`?key=` 直接作為 Firestore 的 `familyId`。程式碼、設定檔與 Git 歷史中都不應保存家庭 key、
Email 或密碼。

## 運作方式

- 合法網址格式：`https://你的網址/?key=<家庭密鑰>`
- key 必須為 **32～128 字元**，且只允許英文字母、數字、底線 `_`、連字號 `-`。
- 實務上請使用密碼產生器建立 **至少 32 碼**的隨機字串。
- key 合法時，網站呼叫 Firebase `signInAnonymously()`，並讀寫：
  - `family/{key}/members/{memberId}`
  - `family/{key}/events/{eventId}`
- 缺少 key 或格式不合法時，網站維持「唯讀模式（連結缺少或無效）」；不初始化 Firebase、
  不嘗試登入，也不讀寫 Firestore。
- 不同 key 對應不同家庭資料路徑。沒有「與伺服器設定值比對」的步驟，因此任何格式合法但不同
  的 key 都會開啟另一個全新的空白家庭空間。

## 重要安全通知

舊版曾把共用 Email、密碼與固定 `secretKey` 放入公開版本庫。那些值已視為外洩，**不可再使用**：

1. 立即到 Firebase Console → Authentication → Users，刪除舊共用 Email/Password 使用者，
   或至少立刻更改其密碼。
2. Authentication → Sign-in method 停用 Email/Password（若沒有其他系統使用）。
3. 產生一組全新的 32 碼以上隨機家庭 key；不要沿用舊 `secretKey`。
4. 新 key 只能透過家庭群組私訊分享完整網址，不可貼到公開 Issue、PR、社群或截圖中。

> Git commit 歷史無法靠「刪除目前檔案」消除既有內容，因此撤銷舊帳號憑證是必要動作。

此方案仍屬於「知道高強度網址 key 即可存取」的共用連結機制，不是使用者級別授權。現行
Firestore Rules 只確認請求已登入，資料隔離依賴 familyId（也就是 URL key）足夠隨機且不公開。
Firebase Web `firebaseConfig` 是公開用戶端設定，不是秘密；Service Account JSON 或 private key
則絕對不可放入本專案。

## 步驟一：建立 Firebase 專案與 Web App

1. 開啟 [Firebase Console](https://console.firebase.google.com/)並建立專案。
2. 專案設定 →「你的應用程式」→ 新增 Web App。
3. 複製畫面顯示的 `firebaseConfig`。

## 步驟二：啟用 Anonymous Authentication

1. Firebase Console → Authentication → Sign-in method。
2. 選擇 **Anonymous（匿名）**，按「啟用」並儲存。
3. 若本專案不再有其他用途，停用 Email/Password 並依上方安全通知撤銷舊共用帳號。

## 步驟三：建立 Firestore 與發布 Rules

Firestore Database 建議以正式環境模式建立。Rules 可使用：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /family/{familyId}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

此規則允許任何已登入（包含匿名登入）的使用者操作其知道路徑的家庭資料。它不會驗證 familyId
是否屬於該匿名 uid；因此必須使用不可猜測的新 key，且不可沿用容易猜到的 `default` 或舊密鑰。

## 步驟四：設定 firebase-config.js

複製 `js/firebase-config.example.js` 為 `js/firebase-config.js`，填入 Firebase Web App 設定：

```js
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

專案已將此檔列入 `.gitignore`，但 GitHub Pages 需能取得此公開設定檔。沒有 CI/CD 注入時，可明確
檢查內容只有 Firebase Web 公開設定後再執行：

```bash
git add -f js/firebase-config.js
git commit -m "chore: 更新正式環境 Firebase Web 設定"
git push origin main
```

**不需要也不應建立 `js/access-config.js`。**

## 步驟五：建立與分享家庭網址

用密碼產生器建立至少 32 碼、只含 `[A-Za-z0-9_-]` 的隨機字串。例如：

```text
https://linyufu0519.github.io/FmailySchdule/?key=<你的全新高強度家庭密鑰>
```

不要把真實 key 寫進 README、程式碼、commit、PR 或 Issue。透過家庭群組私訊分享完整網址。
更換 key 會建立新的空白 Firestore 路徑；若要保留既有資料，需要在 Firebase Console 手動搬移
資料後，再刪除舊的低強度 `family/default` 資料。

## 驗證

1. 不帶 key：顯示「唯讀模式（連結缺少或無效）」，不登入、不讀取資料。
2. 帶不合法 key（過短或含 `/`、空白、中文字）：同樣維持唯讀且不報錯。
3. 帶合法的新 key：匿名登入後顯示「已連線（可編輯）」；可新增成員與行程，重新整理仍可讀取。
4. 換另一個合法 key：應看到獨立的空白家庭空間。

## 常見問題

**為什麼不能繼續用舊帳密？**

因為它曾被提交到公開 repo，應視為已外洩。刪除目前檔案不能讓 Git 歷史中的值失效，必須撤銷
舊帳號或更改密碼。

**網址沒有 key 時可以看到家庭資料嗎？**

不可以。程式不會初始化 Firebase 或訂閱 Firestore，只會顯示空白月曆與唯讀提示。

**key 外流怎麼辦？**

產生全新的高強度 key，將資料搬到新的 `family/{newKey}` 路徑、刪除舊路徑，再分享新網址。
