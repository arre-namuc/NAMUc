// src/firebase.js
// Firebase 초기화 및 데이터 CRUD 헬퍼

import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection, doc,
  getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp,
  query, orderBy, limit, addDoc,
} from "firebase/firestore";
import {
  getStorage,
  ref, uploadBytes, getDownloadURL, deleteObject,
} from "firebase/storage";

// ── Firebase 앱 초기화 ──────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// 환경변수가 없으면 로컬 메모리 모드로 동작 (개발/테스트용)
const isConfigured = !!import.meta.env.VITE_FIREBASE_PROJECT_ID;

let app, db, storage, auth;
if (isConfigured) {
  app     = initializeApp(firebaseConfig);
  db      = getFirestore(app);
  storage = getStorage(app);
  auth    = getAuth(app);
}

export { db, storage, auth, isConfigured };

// ── Google 로그인 ─────────────────────────────────────────

/** Google 팝업 로그인 */
export async function signInWithGoogle() {
  if (!isConfigured) throw new Error("Firebase 미설정");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  return result.user; // { uid, email, displayName, photoURL }
}

/** 로그아웃 */
export async function signOutUser() {
  if (!isConfigured) return;
  await signOut(auth);
}

/** 인증 상태 구독 */
export function onAuthChange(callback) {
  if (!isConfigured) { callback(null); return () => {}; }
  return onAuthStateChanged(auth, callback);
}

// ── 프로젝트 CRUD ────────────────────────────────────────

/** 전체 프로젝트 실시간 구독 */
export function subscribeProjects(callback) {
  if (!isConfigured) return () => {};
  return onSnapshot(collection(db, "projects"), (snap) => {
    const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(projects);
  }, (error) => {
    console.error("Projects 구독 오류:", error);
  });
}

/** undefined 값 제거 (Firestore 호환) */
function cleanUndefined(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(cleanUndefined);
  if (typeof obj === "object" && obj.constructor === Object) {
    const cleaned = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) cleaned[k] = cleanUndefined(v);
    }
    return cleaned;
  }
  return obj;
}

/** 프로젝트 저장 (생성/수정 통합) */
export async function saveProject(project) {
  if (!isConfigured) return;
  const { id, ...data } = project;
  await setDoc(doc(db, "projects", id), {
    ...cleanUndefined(data),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/** 프로젝트 삭제 */
export async function deleteProject(projectId) {
  if (!isConfigured) return;
  await deleteDoc(doc(db, "projects", projectId));
}

// ── 파일 업로드 ──────────────────────────────────────────

/**
 * 증빙 파일 업로드
 * @param {string} projectId
 * @param {string} voucherId
 * @param {File}   file
 * @returns {Promise<{name, url, type, size}>}
 */
export async function uploadVoucherFile(projectId, voucherId, file) {
  if (!isConfigured) {
    // 로컬 fallback: base64 data URL 반환
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: file.name,
        url:  reader.result,   // base64 data URL
        type: file.type,
        size: file.size,
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const path      = `vouchers/${projectId}/${voucherId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { name: file.name, url, type: file.type, size: file.size, path };
}


/** 피드백 이미지 업로드 */
export async function uploadFeedbackImage(projectId, feedbackId, file) {
  if (!isConfigured) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, url: reader.result, type: file.type, size: file.size });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  const path = `feedbacks/${projectId}/${feedbackId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { name: file.name, url, type: file.type, size: file.size, path };
}

/** 파일 삭제 */
export async function deleteVoucherFile(filePath) {
  if (!isConfigured || !filePath) return;
  try {
    await deleteObject(ref(storage, filePath));
  } catch (e) {
    console.warn("파일 삭제 실패:", e);
  }
}

// ── 회사 설정 ────────────────────────────────────────────

/** 회사 설정 실시간 구독 */
export function subscribeCompany(callback) {
  if (!isConfigured) return () => {};
  return onSnapshot(doc(db, "settings", "company"), (snap) => {
    if (snap.exists()) callback(snap.data());
  }, (error) => {
    console.error("Company 구독 오류:", error);
  });
}

/** 회사 설정 저장 */
export async function saveCompany(data) {
  if (!isConfigured) return;
  await setDoc(doc(db, "settings", "company"), {
    ...cleanUndefined(data),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── 구성원 관리 ──────────────────────────────────────────

/** 구성원 전체 실시간 구독 */
export function subscribeMembers(callback) {
  if (!isConfigured) return () => {};
  return onSnapshot(collection(db, "members"), (snap) => {
    const members = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    callback(members.sort((a,b) => (a.order||0) - (b.order||0)));
  }, (error) => {
    console.error("Members 구독 오류:", error);
  });
}

/** 구성원 저장 (생성/수정 통합) */
export async function saveMember(member) {
  if (!isConfigured) return;
  const { id, ...data } = member;
  await setDoc(doc(db, "members", String(id)), {
    ...cleanUndefined(data),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/** 구성원 삭제 */
export async function deleteMember(memberId) {
  if (!isConfigured) return;
  await deleteDoc(doc(db, "members", String(memberId)));
}

// ── 채팅 ─────────────────────────────────────────────────

/**
 * 채팅방 ID 생성
 * - 프로젝트방: "proj_{projId}"
 * - DM: "dm_{낮은id}_{높은id}"
 */
export function getRoomId(type, a, b) {
  if (type === "proj") return `proj_${a}`;
  const sorted = [String(a), String(b)].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
}

/** 메시지 전송 */
export async function sendMessage(roomId, { text, from, fromName, type="text" }) {
  if (!isConfigured) return;
  await addDoc(collection(db, "chats", roomId, "messages"), {
    text, from, fromName, type,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, "chats", roomId), {
    lastMsg: text,
    lastAt:  serverTimestamp(),
    lastFrom: fromName,
  }, { merge: true });
}

/** 메시지 실시간 구독 (최근 100개) */
export function subscribeMessages(roomId, callback) {
  if (!isConfigured) {
    callback([]);
    return () => {};
  }
  const q = query(
    collection(db, "chats", roomId, "messages"),
    orderBy("createdAt", "asc"),
    limit(100)
  );
  return onSnapshot(q, snap => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(msgs);
  });
}

/** 채팅방 목록 구독 */
export function subscribeRooms(callback) {
  if (!isConfigured) { callback({}); return () => {}; }
  return onSnapshot(collection(db, "chats"), snap => {
    const rooms = {};
    snap.docs.forEach(d => { rooms[d.id] = d.data(); });
    callback(rooms);
  });
}

// ── 오피스 데이터 ─────────────────────────────────────────

/** 오피스 데이터 실시간 구독 */
export function subscribeOffice(callback) {
  if (!isConfigured) { callback({}); return () => {}; }
  return onSnapshot(doc(db, "settings", "office"), (snap) => {
    if (snap.exists()) callback(snap.data());
    else callback({});
  }, (error) => {
    console.error("Office 구독 오류:", error);
  });
}

/** 오피스 데이터 저장 */
export async function saveOffice(data) {
  if (!isConfigured) return;
  await setDoc(doc(db, "settings", "office"), {
    ...cleanUndefined(data),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── CRM 외주업체 (Firestore + Storage) ─────────────────

/** 외주업체 목록 실시간 구독 */
export function subscribeVendors(callback) {
  if (!isConfigured) { callback(null); return () => {}; }
  return onSnapshot(
    query(collection(db, "vendors"), orderBy("name")),
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (err) => { console.error("Vendors 구독 오류:", err); callback(null); }
  );
}

/** 외주업체 저장 (신규/수정) */
export async function saveVendorToFirestore(vendor) {
  if (!isConfigured) return vendor;
  const id = vendor.id || "v" + Date.now();
  const data = { ...cleanUndefined(vendor), id, updatedAt: serverTimestamp() };
  await setDoc(doc(db, "vendors", id), data, { merge: true });
  return data;
}

/** 외주업체 삭제 */
export async function deleteVendorFromFirestore(vendorId) {
  if (!isConfigured) return;
  await deleteDoc(doc(db, "vendors", vendorId));
}

/** 업체 서류 업로드 (사업자등록증, 통장사본, 신분증) */
export async function uploadVendorDoc(vendorId, docType, file) {
  if (!isConfigured) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: file.name, url: reader.result, type: file.type, size: file.size,
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  const path = `vendors/${vendorId}/${docType}_${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { name: file.name, url, type: file.type, size: file.size, path };
}
