# Firebase 雲端同步設定教學（繁體中文）

本站預設是**完全靜態的網站**：不設定任何東西也能開啟，但因為家庭行事曆需要「全家共用同一份
資料、任何裝置登入後都能看到最新行程」，因此**新增/編輯行程與成員一定要先設定 Firebase 並登入**
才能使用；未設定時只會顯示「離線模式，尚未設定雲端同步」的提示，畫面本身不會出錯或空白。

---

## 這套雲端同步的運作方式

- 使用 **Firebase Authentication（Email/Password）** 做帳號登入，**全家共用一組帳號密碼**即可，
  不需要每個成員各自申請帳號。
- 使用 **Cloud Firestore** 儲存資料，路徑為：
  - `family/{familyId}/members/{memberId}`：家庭成員（姓名、簡稱、顏色）
  - `family/{familyId}/events/{eventId}`：行程（內容、成員、時間、重複規則）
  - `familyId` 目前寫死為 `default`（單一家庭使用情境），之後如需支援多個家庭，可在
    `js/cloud-sync.js` 的 `FAMILY_ID` 常數調整。
- 前端透過 Firebase 官方 CDN 的 **Web modular SDK**（`https://www.gstatic.com/firebasejs/...`）
  以 ES module 動態載入，**不需要 npm 建置流程**，可以直接部署到 GitHub Pages。
- 沒有設定 Firebase，或設定檔還是範本裡的佔位字串（`YOUR_API_KEY` 等），網站會自動偵測到
  「尚未設定」，安全地顯示離線提示，**不會有任何錯誤訊息**，也不會嘗試對外發送任何網路請求。
- 登入狀態使用 Firebase Auth 的 `browserLocalPersistence`，同一台裝置重新整理頁面或關閉瀏覽器
  再打開都會保持登入；換一台裝置時需要重新用同一組帳密登入一次。

---

## 步驟一：建立 Firebase 專案

1. 開啟 [Firebase 主控台](https://console.firebase.google.com/)，登入 Google 帳號。
2. 點選「新增專案」，輸入專案名稱（例如 `wangmi-family-calendar`），依畫面指示完成建立。
3. Google Analytics 可以選擇「不啟用」，本站用不到。

## 步驟二：新增 Web 應用程式，取得 firebaseConfig

1. 進入專案後，點選左上角齒輪圖示 →「專案設定」。
2. 在「一般」頁籤下方找到「你的應用程式」，點選 `</>`（網頁）圖示新增一個 Web App。
3. 輸入應用程式暱稱（例如 `wangmi-calendar-web`），**不需要**勾選「同時設定 Firebase Hosting」。
4. 建立完成後，畫面會顯示一組 `firebaseConfig`，長得像這樣：

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "wangmi-family-calendar.firebaseapp.com",
     projectId: "wangmi-family-calendar",
     storageBucket: "wangmi-family-calendar.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef1234567890",
   };
   ```

   請先複製保留，稍後會用到。

   > **安全性說明**：這組 `firebaseConfig`（尤其 `apiKey`）依 Firebase 官方文件設計上就是
   > 「公開的用戶端識別碼」，可以放心出現在前端程式碼中。真正保護資料的是下面步驟四的
   > **Firestore Security Rules** 與 **Authentication**，不是隱藏這組設定。
   > 但 **Service Account JSON、任何 private key，絕對不能**放進本專案的任何檔案或 commit
   > 到 Git，那些是完全不同的伺服器端機密。

## 步驟三：啟用 Email/Password 登入

1. 左側選單「Authentication」→「Sign-in method」（或「登入方式」）。
2. 選擇「Email/Password」，點選「啟用」，儲存。
3. 這一步之後，就可以在網站上用**全家共用**的同一組 Email/密碼「註冊」與「登入」。
4. 建議只註冊一次（第一次使用時點「註冊」），之後所有家庭成員都用同一組帳密「登入」即可，
   不需要每個人分別註冊。

## 步驟四：建立 Firestore Database 與 Security Rules

1. 左側選單「Firestore Database」→「建立資料庫」。
2. 選擇「以正式環境模式啟動」（Production mode），選一個離你近的地區（例如 `asia-east1`）。
3. 建立完成後，切到「規則」（Rules）頁籤，貼上以下規則並「發布」：

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

   這個規則的意思是：**只要是已登入的使用者（`request.auth != null`），就能讀寫這個家庭的
   全部資料**。因為全家共用同一組帳號，不需要再比對特定 uid；未登入者完全無法讀取或寫入
   任何資料。

## 步驟五：填入本機的設定檔

1. 在專案的 `js/` 資料夾下，複製 `js/firebase-config.example.js`，另存新檔為
   `js/firebase-config.js`（這個檔名已經列在 `.gitignore`，不會被一般 `git add .` 誤加入）。
2. 打開 `js/firebase-config.js`，把步驟二取得的 `firebaseConfig` 內容貼進去，取代所有
   `YOUR_...` 佔位字串。
3. 本機用瀏覽器開啟 `index.html`（建議用本地伺服器，例如 `python -m http.server`，避免
   `file://` 開啟時瀏覽器阻擋 ES module），應該會看到畫面上方「帳號」列的狀態文字從
   「離線模式，尚未設定雲端同步」變成「雲端同步已啟用，尚未登入」。

## 步驟六：部署到 GitHub Pages 並啟用雲端同步

GitHub Pages 是直接把 Git 分支內容當作靜態網站發布，因此 `js/firebase-config.js` 若被
`.gitignore` 排除，**不會出現在部署站台上**，雲端同步在正式站台上就不會啟用（仍會安全地
顯示離線提示，不影響其他功能）。

如果你想讓「正式部署的 GitHub Pages 網站」也能使用雲端同步，有兩種做法：

### 做法 A（最簡單，適合這個專案規模）

在已經填好真實設定值的 `js/firebase-config.js`，用 `git add -f` 強制加入版本控制並 commit：

```bash
git add -f js/firebase-config.js
git commit -m "chore: 加入正式環境 Firebase 設定"
git push origin main
```

如同步驟二說明，`firebaseConfig` 本身設計上可公開，安全性由 Firestore Rules 與
Authentication 把關，因此這個做法是安全的。`.gitignore` 排除它只是為了避免多人開發、
多環境測試時，不小心把「暫時測試用/尚未填寫」的設定誤加入版本控制而已。

### 做法 B（進階，需要 CI/CD）

改用 GitHub Actions，在部署流程中從 GitHub Secrets 讀出設定值，於建置時動態產生
`js/firebase-config.js` 再發布到 `gh-pages` 分支。此做法可以完全不把設定值放進 Git 歷史，
但需要額外的 workflow 設定，超出本階段「純靜態、無建置」的範圍，之後有需要可以再擴充。

## 步驟七：註冊共用帳號並新增第一位家庭成員

1. 部署完成、確認雲端同步已啟用後，在畫面上方「帳號」列輸入家長打算共用的 Email 與密碼
   （至少 6 碼），點選「註冊（首次使用）」。
2. 註冊成功後會自動登入，狀態文字會顯示「雲端同步完成（你的 Email）」。
3. 點選「成員管理」，新增家庭成員（姓名、簡稱、顏色），之後新增行程時就能選擇這些成員了。
4. 之後在任一台裝置開啟同一個網址，用同一組 Email／密碼登入，就能看到、新增、編輯同一份
   家庭行事曆資料。

---

## 常見問題

**Q：忘記填 Firebase 設定會怎樣？**
A：完全不影響網站開啟，只是「新增/編輯」相關按鈕會提示「尚未設定 Firebase，請參考
FIREBASE_SETUP.md」，月曆本身仍可正常瀏覽（顯示為空）。

**Q：全家真的只需要一組帳號密碼嗎？**
A：是的，設計上就是全家共用一組帳號，方便每個人在自己的手機/電腦登入同一份行事曆，
不需要幫每個家庭成員各自申請帳號。

**Q：可以只登入不新增資料，只是想看看效果嗎？**
A：可以，登入後畫面上方會顯示「雲端同步完成」，即使不特別操作也能確認串接是否成功。
