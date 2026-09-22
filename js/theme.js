// js/theme.js
// 深色模式切換：讀寫 localStorage，套用 <html data-theme="dark|light">
const STORAGE_KEY = "wangmi-theme";

export function initTheme(toggleBtn) {
  const saved = localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  applyTheme(theme);

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("btn-theme-toggle");
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}
