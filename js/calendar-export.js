import { buildIcsContent } from "./ics-export.js";

// 產生 ICS 並上傳 Firebase Storage，成功後於「目前頁面」導向下載網址
// （不開新分頁，使用者可用瀏覽器返回鍵回到行事曆）。
export function openCalendarExport({
  event,
  occurrenceDateKey,
  familyId,
  uploader,
  windowObject = window,
  setLoading = () => {},
  onError = () => {},
}) {
  setLoading(true);

  const uploadPromise = Promise.resolve().then(() => {
    const icsContent = buildIcsContent(event, occurrenceDateKey);
    return uploader(familyId, "event.ics", icsContent);
  });

  return uploadPromise
    .then((downloadUrl) => {
      windowObject.location.assign(downloadUrl);
      return downloadUrl;
    })
    .catch((error) => {
      onError(error);
      throw error;
    })
    .finally(() => setLoading(false));
}
