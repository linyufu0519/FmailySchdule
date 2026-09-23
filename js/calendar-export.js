import { buildIcsContent } from "./ics-export.js";

function showPreparingMessage(previewWindow) {
  if (!previewWindow?.document?.body) return;
  previewWindow.document.title = "正在準備行事曆";
  previewWindow.document.body.textContent = "正在準備行事曆…";
}

export function openCalendarExport({
  event,
  occurrenceDateKey,
  familyId,
  uploader,
  windowObject = window,
  setLoading = () => {},
  onError = () => {},
}) {
  const previewWindow = windowObject.open("", "_blank");
  showPreparingMessage(previewWindow);
  setLoading(true);

  const uploadPromise = Promise.resolve().then(() => {
    const icsContent = buildIcsContent(event, occurrenceDateKey);
    return uploader(familyId, "event.ics", icsContent);
  });

  return uploadPromise
    .then((downloadUrl) => {
      if (previewWindow) {
        previewWindow.location.replace(downloadUrl);
      } else {
        windowObject.location.href = downloadUrl;
      }
      return downloadUrl;
    })
    .catch((error) => {
      previewWindow?.close();
      onError(error);
      throw error;
    })
    .finally(() => setLoading(false));
}
