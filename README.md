# 旺咪家行事曆

全家共用的行事曆網站。純靜態網頁（HTML/CSS/JS，無需 build），Mobile-first RWD 設計，
資料透過 Firebase（Anonymous Auth + Firestore）雲端同步，未設定時會安全退回
離線提示模式，不影響瀏覽月曆。

## 功能清單

- **月曆首頁**：當月完整月曆（週日～週六），上一月／下一月切換，顯示年月標題。
- **行程提示**：有行程的日期數字放大變色，日期上方以各成員專屬顏色顯示簡稱（超過 4 位以
  `+N` 省略顯示）。
- **當日行程列表（Modal）**：依開始時間排序，每筆顯示固定長度摘要，超過長度顯示
  「...詳細」可展開完整內容（含成員、時間）；可從此處新增、編輯、刪除行程。
- **加入手機行事曆**：當日列表與行程詳情皆可將單次行程下載為標準 `.ics`；重複行程只匯出
  當下查看的那一次。iOS Safari 使用 `data:text/calendar` 直接開啟行事曆預覽；其他瀏覽器
  維持 Blob 檔案下載。
- **新增／編輯行程**：
  - 相關家庭成員複選（checkbox，僅顯示各自簡稱與顏色）
  - 開始／結束時間（同一天內；選好開始時間後，若尚未手動改過結束時間，會自動帶入
    「開始時間 + 1 小時」，仍可自行覆蓋）
  - 行程內容文字方塊
  - 重複規則（不重複／每週／每月）：每週固定展開「本次 + 未來 4 週」共 5 次，每月固定展開
    「本次 + 未來 4 個月」共 5 次，皆以規則展開方式顯示在月曆上，不需要真的存多筆資料；
    刪除時可選擇「刪除本次」或「刪除全部」
  - 儲存時若同一（些）成員在同時段已有其他行程重疊，會顯示衝突警示（僅提醒，不阻擋儲存）
  - 刪除行程需二次確認
- **家庭成員管理**：新增／編輯／刪除成員，簡稱限制 1 個字元，色票選擇簡稱顏色。
- **台灣國定假日標示**：月曆上以小字標示假日名稱（`js/holidays.json`，先建立 2026 年度資料，
  之後年度需手動更新）。
- **搜尋**：依關鍵字（行程內容）或成員姓名搜尋，列出符合的行程並可點擊跳轉到該月份日期。
- **深色模式**：右上角切換按鈕，記住使用者偏好（`localStorage`），套用在所有頁面元件。
- **家庭專屬連結**：不提供登入表單，合法的 `?key=家庭密鑰` 會直接作為 Firestore `familyId`，
  並透過 Firebase Anonymous Auth 靜默登入；缺少或格式不合法時維持唯讀且不連線（`js/access.js`）。

## 本機預覽

純靜態網站，建議用簡易 HTTP Server 開啟（ES module `import` 在 `file://` 開啟時會被瀏覽器
阻擋），例如：

```bash
# 在專案根目錄執行
python -m http.server 8080
# 瀏覽器開啟 http://localhost:8080
```

未設定 `js/firebase-config.js` 時也能正常開啟，會顯示「離線模式，尚未設定雲端同步」，
月曆瀏覽功能正常，僅新增/編輯資料的按鈕會提示需要先設定；網址未帶合法 `?key=`
則會顯示「唯讀模式（連結缺少或無效）」，不會初始化 Firebase 或讀寫 Firestore。

## Firebase 設定與雲端同步

請參考 [`FIREBASE_SETUP.md`](./FIREBASE_SETUP.md) 完成以下設定：

1. 建立 Firebase 專案、新增 Web 應用程式取得 `firebaseConfig`
2. 啟用 Anonymous（匿名）登入
3. 建立 Firestore Database 並設定 Security Rules
4. 複製 `js/firebase-config.example.js` 為 `js/firebase-config.js` 並填入設定值
5. 產生至少 32 碼的隨機家庭 key，僅透過完整網址私下分享，不存入任何程式檔
6. 部署到 GitHub Pages；正式站台只需發布可公開的 `firebase-config.js`

## 部署方式（GitHub Pages）

1. 將此 repo 推送到 GitHub。
2. 到 repo 的 Settings → Pages，Source 選擇要發布的分支（例如 `main`）與根目錄 `/`。
3. 幾分鐘後即可透過 GitHub Pages 網址開啟；若要啟用雲端同步，請參考上方
   `FIREBASE_SETUP.md` 步驟六。

## 專案結構

```
index.html                    月曆首頁 + 所有 Modal
css/style.css                 樣式（含 light/dark 主題變數、RWD）
js/app.js                     主流程：月曆渲染、Modal、表單、搜尋、匿名登入串接
js/calendar.js                月曆計算、假日查詢（純函式）
js/holidays.json              台灣國定假日資料（2026 年度）
js/events.js                  行程資料結構、重複規則展開、衝突偵測（純函式）
js/ics-export.js              單次行程 iCalendar 內容產生與下載
js/members.js                 成員顯示輔助函式
js/firebase-config-status.js  Firebase 設定完整性判斷（純函式）
js/firebase-config.example.js Firebase 設定範本（可 commit）
js/firebase-config.js         實際 Firebase 設定（.gitignore 排除，需自行建立）
js/access.js                  URL key 驗證與 familyId 解析（純函式）
js/cloud-sync.js              Firebase Auth + Firestore 封裝
js/theme.js                   深色模式切換
FIREBASE_SETUP.md             Firebase 設定教學
tests/                        純函式測試（Node 內建 test runner）+ 手動測試檢查清單
```

## 執行測試

`tests/` 內為 Node 內建 `node:test` 撰寫的純函式測試（假日查詢、重複規則展開、衝突偵測、
Firebase 設定完整性判斷、家庭 key 驗證與 familyId 設定），不需要額外安裝套件：

```bash
node --test
```

另有 `tests/MANUAL_CHECKLIST.md` 列出需要在瀏覽器實際操作驗證的項目（月曆互動、Modal、
深色模式、離線模式等）。

## 已知簡化事項

- `familyId` 由 URL 的 `?key=` 決定；任何合法但不同的 key 都會對應到獨立的家庭資料路徑。
- 編輯重複行程時，表單會以目前這次的日期作為新的規則起點；若需要更嚴謹的「單次修改不影響
  其他次」需求，可再擴充資料模型（例如逐次覆寫內容），目前僅支援「刪除本次／刪除全部」。
- 國定假日資料需逐年更新 `js/holidays.json`。
