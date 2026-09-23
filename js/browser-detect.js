// 純函式：判斷目前是否在 LINE 內建瀏覽器（WebView）中執行。
// LINE 的 in-app browser 無法把 text/calendar 正確交給系統行事曆處理，
// 需要在點擊「加入手機行事曆」前先攔截，改顯示「請用 Safari 開啟」提示。
export function isLineInAppBrowser(userAgent) {
  return /\bLine\//i.test(String(userAgent || ""));
}
