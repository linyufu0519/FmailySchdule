// js/cloud-sync.js
// 瀏覽器端 Firebase 串接層（Auth + Firestore，Web modular SDK 走官方 CDN）。
// 本檔案只負責跟 Firebase 溝通（登入狀態、Firestore CRUD/監聽），不含 UI 邏輯，
// UI 綁定與畫面更新在 js/app.js。
//
// 未設定 js/firebase-config.js（或內容仍是佔位字串）時，getCloudAvailability()
// 會回傳 configured:false，呼叫端（js/app.js）應優雅回退為「離線提示模式」，
// 不應該讓例外往外丟、也不會嘗試載入 Firebase SDK CDN（避免離線環境噴網路錯誤）。
//
// 若這裡使用的 SDK 版本號未來已經過舊，請至 https://firebase.google.com/docs/web/setup
// 確認最新的 CDN 網址並更新下方常數即可，不需要改動其他檔案。
import { isFirebaseConfigured } from "./firebase-config-status.js";

const SDK_VERSION = "10.12.2";
const FIREBASE_APP_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`;
const FIREBASE_AUTH_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`;
const FIREBASE_FIRESTORE_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`;

// 全家共用單一家庭資料，先寫死一個 familyId；若未來要支援多家庭，
// 可以改為登入後從使用者 profile 讀取，其餘程式碼不需變動。
export const FAMILY_ID = "default";

let cachedConfig; // undefined = 尚未嘗試讀取；null = 讀取失敗或不存在
let app = null;
let auth = null;
let db = null;
let authModule = null;
let firestoreModule = null;

async function loadConfig() {
  if (cachedConfig !== undefined) return cachedConfig;
  try {
    // js/firebase-config.js 已列入 .gitignore；若部署站台上不存在此檔，
    // 動態 import 會因為 404 而 reject，這裡一律 catch 起來當作「未設定」。
    const module = await import("./firebase-config.js");
    cachedConfig = module.firebaseConfig || null;
  } catch (error) {
    cachedConfig = null;
  }
  return cachedConfig;
}

export async function getCloudAvailability() {
  const config = await loadConfig();
  return { configured: isFirebaseConfigured(config), config };
}

async function loadFirebaseSdk() {
  const [{ initializeApp }, authMod, firestoreMod] = await Promise.all([
    import(/* webpackIgnore: true */ FIREBASE_APP_URL),
    import(/* webpackIgnore: true */ FIREBASE_AUTH_URL),
    import(/* webpackIgnore: true */ FIREBASE_FIRESTORE_URL),
  ]);
  return { initializeApp, authMod, firestoreMod };
}

/**
 * 初始化雲端同步。若尚未設定 Firebase，回傳 { enabled:false } 且不會發出任何網路請求
 * （不會嘗試載入 Firebase SDK CDN），確保離線模式完全不依賴網路。
 * 登入狀態使用 browserLocalPersistence，重整頁面或關閉瀏覽器後仍保持登入。
 */
export async function initCloud() {
  const { configured, config } = await getCloudAvailability();
  if (!configured) return { enabled: false };

  const { initializeApp, authMod, firestoreMod } = await loadFirebaseSdk();
  authModule = authMod;
  firestoreModule = firestoreMod;
  app = initializeApp(config);
  auth = authModule.getAuth(app);
  db = firestoreModule.getFirestore(app);
  try {
    await authModule.setPersistence(auth, authModule.browserLocalPersistence);
  } catch (error) {
    // 部分瀏覽器隱私模式可能不支援，仍可正常使用記憶體內的登入狀態
  }
  return { enabled: true };
}

export function subscribeAuthState(callback) {
  if (!auth || !authModule) return () => {};
  return authModule.onAuthStateChanged(auth, callback);
}

export async function signUpWithEmail(email, password) {
  if (!auth) throw new Error("雲端同步尚未啟用");
  return authModule.createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithEmail(email, password) {
  if (!auth) throw new Error("雲端同步尚未啟用");
  return authModule.signInWithEmailAndPassword(auth, email, password);
}

export async function signOutCloud() {
  if (!auth) return;
  return authModule.signOut(auth);
}

function membersCollection() {
  return firestoreModule.collection(db, "family", FAMILY_ID, "members");
}
function eventsCollection() {
  return firestoreModule.collection(db, "family", FAMILY_ID, "events");
}

/** 監聽成員清單即時變化，callback 收到最新的成員陣列（含文件 id）。 */
export function subscribeMembers(callback, onError) {
  if (!db) return () => {};
  return firestoreModule.onSnapshot(
    membersCollection(),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

/** 監聽行程清單即時變化，callback 收到最新的行程陣列（含文件 id）。 */
export function subscribeEvents(callback, onError) {
  if (!db) return () => {};
  return firestoreModule.onSnapshot(
    eventsCollection(),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export async function addMember(data) {
  const ref = await firestoreModule.addDoc(membersCollection(), data);
  return ref.id;
}
export async function updateMember(id, data) {
  await firestoreModule.setDoc(firestoreModule.doc(db, "family", FAMILY_ID, "members", id), data, { merge: true });
}
export async function deleteMember(id) {
  await firestoreModule.deleteDoc(firestoreModule.doc(db, "family", FAMILY_ID, "members", id));
}

export async function addEvent(data) {
  const ref = await firestoreModule.addDoc(eventsCollection(), data);
  return ref.id;
}
export async function updateEvent(id, data) {
  await firestoreModule.setDoc(firestoreModule.doc(db, "family", FAMILY_ID, "events", id), data, { merge: true });
}
export async function deleteEvent(id) {
  await firestoreModule.deleteDoc(firestoreModule.doc(db, "family", FAMILY_ID, "events", id));
}
