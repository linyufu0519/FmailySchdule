# Firebase 雲端同步設定教學（繁體中文）

本站預設是**完全靜態的網站**：不設定任何東西也能開啟，但因為家庭行事曆需要「全家共用同一份
資料、任何裝置都能看到最新行程」，因此**新增/編輯行程與成員一定要先設定 Firebase，並透過帶有
正確密鑰的隱藏連結進入**才能使用；未設定，或網址沒帶對密鑰時，只會顯示「離線模式，尚未設定
雲端同步」或「唯讀模式（無存取權限）」的提示，畫面本身不會出錯或空白，仍可正常瀏覽月曆。

---

## 這套雲端同步／存取控制的運作方式

- **不提供登入表單**，改用「隱藏連結」機制：網址帶入 `?key=一組密鑰` 且與設定值相符時，
  前端會自動用**全家共用的一組 Firebase Email/Password 帳號**靜默登入（使用者完全無感知，
  不會看到任何登入按鈕或輸入框）；沒帶 `key` 或帶錯，一律維持唯讀瀏覽，不嘗試登入、也不會
  顯示任何錯誤訊息。
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
  再打開都會保持登入；換一台裝置時需要重新用**帶有正確密鑰的網址**開啟一次才會自動登入。

### ⚠️ 安全性說明（請務必詳讀）

「隱藏連結」是一種**知道網址就能存取**的輕量防護（obscurity-based security），**並不是**
帳號等級的強驗證：任何拿到含密鑰完整網址的人，都能以共用帳號自動登入並讀寫資料。真正把關
資料存取的仍然是下面步驟四的 **Firestore Security Rules（只允許已登入使用者讀寫）**，密鑰
本身只是避免被隨便路過的人看到或誤觸的門檻，**不是無法被破解或猜到的保護機制**。請自行評估
密鑰外流的風險，並只透過家庭群組私訊分享含密鑰的完整網址，不要公開張貼（例如公開社群貼文、
公開 GitHub Issue、截圖網址列後隨手分享等）。若懷疑密鑰外流，可隨時更換 `access-config.js`
內的 `secretKey` 並重新部署、重新分享新網址即可失效舊連結。

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

## 步驟三：啟用 Email/Password 登入，並註冊全家共用帳號

1. 左側選單「Authentication」→「Sign-in method」（或「登入方式」）。
2. 選擇「Email/Password」，點選「啟用」，儲存。
3. 切到「Users」頁籤，點選「新增使用者」，手動建立**一組**全家共用的 Email／密碼帳號
   （因為畫面上已無註冊表單，這組帳號需要在 Firebase 主控台直接建立，或暫時用其他方式
   呼叫一次 `createUserWithEmailAndPassword` 完成註冊）。之後所有裝置都是透過隱藏連結
   靜默用同一組帳密登入，不需要、也無法在網站上另外註冊其他帳號。

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
3. 複製 `js/access-config.example.js`，另存新檔為 `js/access-config.js`（同樣已列在
   `.gitignore`），填入：
   - `secretKey`：自己產生的一長串隨機英數字（建議 20 碼以上，例如用密碼產生器）
   - `sharedEmail` / `sharedPassword`：步驟三建立的全家共用帳號
4. 本機用瀏覽器開啟 `index.html`（建議用本地伺服器，例如 `python -m http.server`，避免
   `file://` 開啟時瀏覽器阻擋 ES module）：
   - 不帶 `?key=` 開啟時，應該會看到畫面上方狀態文字從「離線模式，尚未設定雲端同步」
     變成「唯讀模式（無存取權限）」（表示 Firebase 已連上，但尚未自動登入）。
   - 開啟 `index.html?key=你設定的secretKey` 時，應該會自動靜默登入，狀態文字變成
     「已連線（可編輯）」，且能正常新增/編輯行程與成員。

## 步驟六：部署到 GitHub Pages 並啟用雲端同步／隱藏連結

GitHub Pages 是直接把 Git 分支內容當作靜態網站發布，因此 `js/firebase-config.js` 與
`js/access-config.js` 若被 `.gitignore` 排除，**不會出現在部署站台上**，雲端同步與自動登入
在正式站台上就不會啟用（仍會安全地顯示離線/唯讀提示，不影響其他功能）。

如果你想讓「正式部署的 GitHub Pages 網站」也能使用雲端同步與隱藏連結自動登入，有兩種做法：

### 做法 A（最簡單，適合這個專案規模）

在已經填好真實設定值的 `js/firebase-config.js` 與 `js/access-config.js`，用 `git add -f`
強制加入版本控制並 commit：

```bash
git add -f js/firebase-config.js js/access-config.js
git commit -m "chore: 加入正式環境 Firebase 設定與隱藏連結密鑰"
git push origin main
```

如同步驟二說明，`firebaseConfig` 本身設計上可公開，安全性由 Firestore Rules 與
Authentication 把關，因此這個做法是安全的。但 `js/access-config.js` 裡的
`sharedEmail`/`sharedPassword`/`secretKey` **性質不同**——這組資料一旦流出，任何人都能
直接登入讀寫全家的資料，請務必只把「含密鑰的完整網址」透過家庭群組私訊分享，不要公開
分享；`.gitignore` 排除這兩個檔案，只是為了避免多人開發、多環境測試時，不小心把「暫時
測試用/尚未填寫」的設定誤加入版本控制而已。

### 做法 B（進階，需要 CI/CD）

改用 GitHub Actions，在部署流程中從 GitHub Secrets 讀出設定值，於建置時動態產生
`js/firebase-config.js`、`js/access-config.js` 再發布到 `gh-pages` 分支。此做法可以完全
不把設定值放進 Git 歷史，但需要額外的 workflow 設定，超出本階段「純靜態、無建置」的範圍，
之後有需要可以再擴充。

## 步驟七：分享隱藏連結並新增第一位家庭成員

1. 部署完成、確認雲端同步已啟用後，在瀏覽器開啟
   `https://你的網址/?key=你設定的secretKey`，狀態文字應顯示「已連線（可編輯）」。
2. 點選「成員管理」，新增家庭成員（姓名、簡稱、顏色），之後新增行程時就能選擇這些成員了。
3. 把**含密鑰的完整網址**（例如透過家庭群組私訊）分享給其他家庭成員，他們用同一個連結
   開啟即可自動連上、直接讀寫同一份行事曆，不需要再輸入任何帳號密碼。
4. 若只是想瀏覽（例如分享給不需要編輯的親戚），可以只分享不含 `?key=` 的網址，對方會停留
   在唯讀模式，能看到月曆但無法新增/編輯。

---

## 常見問題

**Q：忘記填 Firebase 設定會怎樣？**
A：完全不影響網站開啟，只是「新增/編輯」相關按鈕會提示「尚未設定 Firebase，請參考
FIREBASE_SETUP.md」，月曆本身仍可正常瀏覽（顯示為空）。

**Q：網址忘記帶 `?key=`，或密鑰打錯了會怎樣？**
A：不會出現任何錯誤畫面，只會安靜地維持「唯讀模式（無存取權限）」，月曆仍可正常瀏覽，
只是新增/編輯/刪除的操作會被擋下並提示「請使用家人分享的專屬連結才能新增/編輯資料」。

**Q：這個機制安全嗎？密鑰會不會被猜到？**
A：這是「知道網址就能存取」的輕量防護，不是帳號等級的強驗證，本質上等同於「知道網址即可
編輯」的共用連結。只要密鑰夠長夠隨機、只透過私訊分享不公開，被隨機猜中的機率極低，但仍
建議不要把含密鑰的網址貼在任何公開場合。真正把關資料存取的是 Firestore Security Rules，
只有成功登入的請求才能讀寫。如果懷疑外流，重新產生一組 `secretKey` 並重新部署、重新分享
新網址，即可讓舊連結立刻失效。

**Q：全家真的只需要一組帳號密碼嗎？**
A：是的，設計上就是全家共用一組帳號，方便每個人開啟同一個隱藏連結就能使用同一份行事曆，
不需要幫每個家庭成員各自申請帳號，也完全不需要在畫面上輸入帳密。

**Q：可以只是想確認雲端同步有沒有連上，不特別操作嗎？**
A：可以，用帶密鑰的網址開啟後，畫面上方會顯示「已連線（可編輯）」，即使不特別操作也能
確認串接是否成功；沒帶或帶錯密鑰則會顯示「唯讀模式（無存取權限）」。
