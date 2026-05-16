import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  collection, collectionGroup, addDoc, onSnapshot, query, orderBy,
  deleteDoc, doc, updateDoc, serverTimestamp, setDoc, getDocs
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import "./styles/main.css";

// ── ICONS ──────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16 }) => {
  const icons = {
    plus:       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    trash:      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
    edit:       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    wallet:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 3l-4 4-4-4"/><circle cx="16" cy="13" r="1" fill="currentColor"/></svg>,
    arrow_down: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
    arrow_up:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
    user:       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    chart:      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    close:      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    check:      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
    logout:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    download:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    calendar:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    grid:       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    search:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    menu:       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    sort_asc:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="5 15 12 8 19 15"/></svg>,
    sort_desc:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="5 9 12 16 19 9"/></svg>,
    sort_none:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"><polyline points="5 9 12 6 19 9"/><polyline points="5 15 12 18 19 15"/></svg>,
    alert:      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="10.29 3.86 1.82 18 22.18 18 13.71 3.86 10.29 3.86"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    exchange:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
    eye:        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    eye_off:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
    file_text:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    info:       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    shield:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    users:      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  };
  return icons[name] || null;
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = "lengocthang.mb@gmail.com";
const DEFAULT_USD_RATE = 25400;
const fmtVND = (n) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0)) + " đ";
const fmtUSD = (n) => "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat("vi-VN").format(n || 0);
const fmtDate = (row) => {
  if (row?.ngay) return new Date(row.ngay + "T00:00:00").toLocaleDateString("vi-VN");
  if (!row?.createdAt) return "";
  const d = row.createdAt.toDate ? row.createdAt.toDate() : new Date(row.createdAt);
  return d.toLocaleDateString("vi-VN");
};
const getRowDate = (r) => {
  if (r.ngay) return new Date(r.ngay + "T00:00:00");
  if (r.createdAt?.toDate) return r.createdAt.toDate();
  return new Date();
};
const todayISO = () => new Date().toISOString().split("T")[0];

// Fix Vietnamese capitalization: split on spaces instead of using \b\w
const normalizeName = (s) =>
  (s || "Không rõ").trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ") || "Không rõ";

// Extract game name from account string (e.g. "lord 35" → "Lord")
const extractGame = (account) => {
  const first = (account || "Khác").trim().split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

// ── EXPORT HELPERS ────────────────────────────────────────────────────────────
const downloadFile = (content, filename, mime) => {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportJSON = (chiRows, nhanRows) => {
  const payload = { exportedAt: new Date().toISOString(), exportedBy: auth.currentUser?.email, chi: chiRows, nhan: nhanRows };
  downloadFile(JSON.stringify(payload, null, 2), `bills-backup-${todayISO()}.json`, "application/json");
};

const exportCSV = (chiRows, nhanRows) => {
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const chiHeader = "Ngày,Account,Số Tiền,Tiền Tệ,Người Mua,Ghi Chú,Hoàn Tiền";
  const nhanHeader = "Ngày,Số Tiền,Tiền Tệ,Người Chuyển,Ghi Chú";
  const lines = [
    "=== DANH SÁCH CHI ===", chiHeader,
    ...chiRows.map(r => [esc(r.ngay || fmtDate(r)), esc(r.account), r.soTien||0, esc(r.currency), esc(r.nguoiMua), esc(r.ghiChu), r.cancelled ? "Có" : ""].join(",")),
    "", "=== NHẬP QUỸ ===", nhanHeader,
    ...nhanRows.map(r => [esc(r.ngay || fmtDate(r)), r.soTien||0, esc(r.currency), esc(r.nguoiChuyen), esc(r.ghiChu)].join(",")),
  ];
  downloadFile("﻿" + lines.join("\r\n"), `bills-export-${todayISO()}.csv`, "text/csv;charset=utf-8;");
};

// ── CONFIG ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Tổng Quan",  icon: "chart" },
  { id: "chi",       label: "Chi",         icon: "arrow_down" },
  { id: "nhan",      label: "Nhập Quỹ",    icon: "arrow_up" },
  { id: "staff",     label: "Nhân Viên",   icon: "user" },
];
const PAGE_TITLES = {
  dashboard: "Tổng Quan",
  chi:       "Danh Sách Chi",
  nhan:      "Nhập Quỹ",
  staff:     "Nhân Viên",
  admin:     "Admin — Hệ Thống",
};

// Bar colors for game chart
const GAME_COLORS = [
  "#4f8ef7","#a78bfa","#05d890","#fbbf24","#ff4d6d",
  "#38bdf8","#fb7185","#34d399","#f472b6","#60a5fa",
];

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]             = useState("dashboard");
  const [user, setUser]           = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [chiRows, setChiRows]     = useState([]);
  const [nhanRows, setNhanRows]   = useState([]);
  const [modal, setModal]         = useState(null);
  const [confirm, setConfirm]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [toasts, setToasts]       = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [usdRate, setUsdRate] = useState(() => {
    const saved = localStorage.getItem("usdRate");
    return saved ? Number(saved) : DEFAULT_USD_RATE;
  });
  const [rateEditing, setRateEditing] = useState(false);
  const [rateDraft, setRateDraft]     = useState(String(usdRate));
  const rateRef = useRef(null);

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`
  );

  const [chiSearch,  setChiSearch]  = useState("");
  const [nhanSearch, setNhanSearch] = useState("");
  const [chiSort,    setChiSort]    = useState({ col: "date", asc: false });
  const [nhanSort,   setNhanSort]   = useState({ col: "date", asc: false });
  const [showCancelled, setShowCancelled] = useState(true);

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  // ── Auth — write user profile to users/{uid} doc so admin can list all users ──
  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        const profile = {
          email: u.email,
          displayName: u.displayName || "",
          lastSeen: serverTimestamp(),
        };
        // Write to users/{uid} so admin can list via getDocs(collection(db,"users"))
        try { await setDoc(doc(db, "users", u.uid), profile, { merge: true }); } catch {}
        // Also write to registeredUsers as fallback
        try { await setDoc(doc(db, "registeredUsers", u.uid), profile, { merge: true }); } catch {}
      }
    });
  }, []);

  // ── Firestore — user data + shared settings ──
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const qChi  = query(collection(db, `users/${uid}/chi`),  orderBy("createdAt","desc"));
    const qNhan = query(collection(db, `users/${uid}/nhan`), orderBy("createdAt","desc"));
    const u1 = onSnapshot(qChi,  s => { setChiRows(s.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); });
    const u2 = onSnapshot(qNhan, s => setNhanRows(s.docs.map(d=>({id:d.id,...d.data()}))));
    // Subscribe to admin-set USD rate (shared across all users)
    const u3 = onSnapshot(doc(db, "settings", "rates"), snap => {
      if (snap.exists() && snap.data().usdRate) {
        const rate = snap.data().usdRate;
        setUsdRate(rate);
        localStorage.setItem("usdRate", String(rate));
      }
    }, () => {}); // silent on permission error
    return () => { u1(); u2(); u3(); };
  }, [user]);

  // ── Close export dropdown on outside click ──
  useEffect(() => {
    const handler = e => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Toast helpers ──
  const pushToast = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  // ── USD Rate save (admin only — writes to Firestore so all users get updated) ──
  const commitRate = async () => {
    const n = parseInt(rateDraft.replace(/\D/g, ""), 10);
    if (n > 0) {
      setUsdRate(n);
      localStorage.setItem("usdRate", String(n));
      try {
        await setDoc(doc(db, "settings", "rates"), { usdRate: n }, { merge: true });
        pushToast(`Đã cập nhật tỷ giá cho tất cả: 1 USD = ${fmtNum(n)} đ`);
      } catch {
        pushToast(`Đã cập nhật tỷ giá: 1 USD = ${fmtNum(n)} đ`);
      }
    }
    setRateEditing(false);
  };

  // ── Filter by month ──
  const inMonth = useCallback(r => {
    if (!filterMonth) return true;
    const d = getRowDate(r);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}` === filterMonth;
  }, [filterMonth]);

  const filteredChi  = useMemo(() => chiRows.filter(inMonth),  [chiRows, inMonth]);
  const filteredNhan = useMemo(() => nhanRows.filter(inMonth), [nhanRows, inMonth]);

  const activeChi    = useMemo(() => filteredChi.filter(r => !r.cancelled), [filteredChi]);
  const cancelledChi = useMemo(() => filteredChi.filter(r => r.cancelled),  [filteredChi]);

  const totalChiVND  = useMemo(() => activeChi.filter(r=>r.currency==="VND").reduce((s,r)=>s+(r.soTien||0),0), [activeChi]);
  const totalChiUSD  = useMemo(() => activeChi.filter(r=>r.currency==="USD").reduce((s,r)=>s+(r.soTien||0),0), [activeChi]);
  const totalNhanVND = useMemo(() => filteredNhan.filter(r=>r.currency==="VND").reduce((s,r)=>s+(r.soTien||0),0), [filteredNhan]);
  const totalNhanUSD = useMemo(() => filteredNhan.filter(r=>r.currency==="USD").reduce((s,r)=>s+(r.soTien||0),0), [filteredNhan]);
  const conVND = totalNhanVND - totalChiVND;
  const conUSD = totalNhanUSD - totalChiUSD;

  // staffStats: count VND and USD accounts separately then sum
  const staffStats = useMemo(() => {
    const s = {};
    activeChi.forEach(r => {
      const name = normalizeName(r.nguoiMua);
      if (!s[name]) s[name] = { vnd:0, usd:0, vndCount:0, usdCount:0 };
      if (r.currency==="VND") { s[name].vnd += r.soTien||0; s[name].vndCount++; }
      else                    { s[name].usd += r.soTien||0; s[name].usdCount++; }
    });
    return s;
  }, [activeChi]);

  const nhanStats = useMemo(() => {
    const s = {};
    filteredNhan.forEach(r => {
      const name = normalizeName(r.nguoiChuyen);
      if (!s[name]) s[name] = { vnd:0, usd:0 };
      if (r.currency==="VND") s[name].vnd += r.soTien||0; else s[name].usd += r.soTien||0;
    });
    return s;
  }, [filteredNhan]);

  // Game ranking chart — all data (not month-filtered), top 10 by purchase count
  const gameStats = useMemo(() => {
    const stats = {};
    chiRows.filter(r => !r.cancelled).forEach(r => {
      const name = extractGame(r.account);
      if (!stats[name]) stats[name] = { count: 0, vnd: 0, usd: 0 };
      stats[name].count++;
      if (r.currency === "VND") stats[name].vnd += r.soTien || 0;
      else stats[name].usd += r.soTien || 0;
    });
    return Object.entries(stats)
      .map(([name, s]) => ({ name, count: s.count, total: s.vnd + s.usd * usdRate }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [chiRows, usdRate]);

  // ── Search + Sort ──
  const applySearch = (rows, q, fields) =>
    !q ? rows : rows.filter(r => fields.some(f => (r[f]||"").toLowerCase().includes(q.toLowerCase())));

  const applySort = (rows, { col, asc }) => {
    if (!col) return rows;
    return [...rows].sort((a, b) => {
      let va, vb;
      if (col==="date")   { va=getRowDate(a).getTime(); vb=getRowDate(b).getTime(); }
      else if (col==="amount") { va=a.soTien||0; vb=b.soTien||0; }
      else { va=(a[col]||"").toLowerCase(); vb=(b[col]||"").toLowerCase(); }
      if (va < vb) return asc ? -1 : 1;
      if (va > vb) return asc ? 1 : -1;
      return 0;
    });
  };

  const toggleSort = (setSort, col) =>
    setSort(prev => prev.col===col ? { col, asc:!prev.asc } : { col, asc:true });

  const chiBase    = showCancelled ? filteredChi : activeChi;
  const displayChi  = applySort(applySearch(chiBase,     chiSearch,  ["account","nguoiMua","ghiChu"]), chiSort);
  const displayNhan = applySort(applySearch(filteredNhan, nhanSearch, ["nguoiChuyen","ghiChu"]), nhanSort);

  // ── CRUD ──
  const saveRecord = async (collName, data, id) => {
    try {
      const path = `users/${user.uid}/${collName}`;
      if (id) await updateDoc(doc(db, path, id), { ...data, updatedAt: serverTimestamp() });
      else    await addDoc(collection(db, path), { ...data, createdAt: serverTimestamp() });
      setModal(null);
      pushToast(id ? "Đã cập nhật giao dịch" : "Đã thêm giao dịch mới");
    } catch (e) {
      pushToast("Lỗi: " + e.message, "error");
    }
  };

  const deleteRecord = (collName, id) => {
    setConfirm({
      title:   "Xác nhận xóa",
      message: "Bạn có chắc muốn xóa giao dịch này? Thao tác không thể hoàn tác.",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, `users/${user.uid}/${collName}`, id));
          pushToast("Đã xóa giao dịch");
        } catch (e) {
          pushToast("Lỗi khi xóa: " + e.message, "error");
        }
        setConfirm(null);
      },
    });
  };

  // ── Export handlers ──
  const handleExportJSON = () => { exportJSON(chiRows, nhanRows); pushToast("Đã tải xuống file JSON"); setExportOpen(false); };
  const handleExportCSV  = () => { exportCSV(chiRows, nhanRows);  pushToast("Đã tải xuống file CSV (mở bằng Excel)"); setExportOpen(false); };

  if (authLoading) return <div className="auth-loading"><div className="spinner"/>Đang tải...</div>;
  if (!user)       return <LoginScreen />;

  const isAdmin      = user.email === ADMIN_EMAIL;
  const userInitial  = (user.email||"U")[0].toUpperCase();

  return (
    <div className="app">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}/>}

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-icon"><Icon name="wallet" size={18}/></div>
          <div className="brand-text">BILLS TRACKER<span>Finance Manager</span></div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Menu</div>
          {TABS.map(t => (
            <button key={t.id} className={`nav-btn ${tab===t.id?"active":""}`}
              onClick={() => { setTab(t.id); setSidebarOpen(false); }}>
              <span className="nav-icon"><Icon name={t.icon} size={16}/></span>
              {t.label}
            </button>
          ))}
          {isAdmin && (
            <button className={`nav-btn ${tab==="admin"?"active":""}`}
              onClick={() => { setTab("admin"); setSidebarOpen(false); }}>
              <span className="nav-icon"><Icon name="shield" size={16}/></span>
              Admin
            </button>
          )}
        </nav>

        {/* USD Rate — admin only */}
        {isAdmin && (
          <div className="sidebar-rate">
            <div className="rate-label"><Icon name="exchange" size={12}/> Tỷ Giá USD <span style={{color:"var(--yellow)",fontSize:9,marginLeft:4}}>ADMIN</span></div>
            {rateEditing ? (
              <div className="rate-edit-row">
                <input
                  ref={rateRef}
                  className="rate-input"
                  value={rateDraft}
                  onChange={e => setRateDraft(e.target.value)}
                  onKeyDown={e => { if(e.key==="Enter") commitRate(); if(e.key==="Escape") setRateEditing(false); }}
                  onBlur={commitRate}
                  autoFocus
                />
                <span className="rate-suffix">đ</span>
              </div>
            ) : (
              <button className="rate-display" onClick={() => { setRateDraft(String(usdRate)); setRateEditing(true); }}>
                <span className="rate-value">{fmtNum(usdRate)} đ</span>
                <span className="rate-edit-hint">click để sửa</span>
              </button>
            )}
          </div>
        )}

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{userInitial}</div>
            <div className="user-details">
              <span className="user-email-text">{user.email}</span>
              <span className="user-role">{isAdmin ? "Admin" : "Thành viên"}</span>
            </div>
            <button className="btn-logout-icon" onClick={() => signOut(auth)} title="Đăng xuất">
              <Icon name="logout" size={14}/>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main-content">
        <header className="topbar">
          <button className="btn-hamburger" onClick={() => setSidebarOpen(o=>!o)}>
            <Icon name="menu" size={18}/>
          </button>
          <h1 className="page-title">{PAGE_TITLES[tab] || tab}</h1>
          <div className="topbar-controls">
            {tab !== "admin" && (
              <>
                <div className="month-chip">
                  <Icon name="calendar" size={13}/>
                  <span className="month-chip-label">Tháng</span>
                  <input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} className="month-input"/>
                </div>
                <button className="btn-all" onClick={() => setFilterMonth("")}>Tất Cả</button>
              </>
            )}

            <div className="export-wrap" ref={exportRef}>
              <button className="btn-export" onClick={() => setExportOpen(o=>!o)}>
                <Icon name="download" size={13}/>
                <span>Xuất</span>
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {exportOpen && (
                <div className="export-dropdown">
                  <button className="export-item" onClick={handleExportJSON}>
                    <Icon name="download" size={14}/>
                    <div>
                      <div className="export-item-name">JSON</div>
                      <div className="export-item-desc">Backup toàn bộ dữ liệu</div>
                    </div>
                  </button>
                  <button className="export-item" onClick={handleExportCSV}>
                    <Icon name="file_text" size={14}/>
                    <div>
                      <div className="export-item-name">CSV</div>
                      <div className="export-item-desc">Mở trong Excel / Sheets</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content">
          {loading && tab !== "admin" && <div className="loading"><div className="spinner"/>Đang tải dữ liệu...</div>}

          {/* ── SUMMARY CARDS (not on admin tab) ── */}
          {!loading && tab !== "admin" && (
            <div className="summary-row">
              <div className="sum-card red">
                <div className="sum-card-header">
                  <div className="sum-label">Tổng Chi</div>
                  <div className="sum-card-icon"><Icon name="arrow_down" size={17}/></div>
                </div>
                <div className="sum-value">{fmtVND(totalChiVND)}</div>
                <div className="sum-sub">USD: {fmtUSD(totalChiUSD)}</div>
                {cancelledChi.length > 0 && (
                  <div className="sum-note">({cancelledChi.length} hoàn tiền đã loại trừ)</div>
                )}
              </div>

              <div className="sum-card green">
                <div className="sum-card-header">
                  <div className="sum-label">Tổng Nhập</div>
                  <div className="sum-card-icon"><Icon name="arrow_up" size={17}/></div>
                </div>
                <div className="sum-value">{fmtVND(totalNhanVND)}</div>
                <div className="sum-sub">USD: {fmtUSD(totalNhanUSD)}</div>
              </div>

              <div className={`sum-card ${conVND>=0?"blue":"red"}`}>
                <div className="sum-card-header">
                  <div className="sum-label">Còn Lại</div>
                  <div className="sum-card-icon"><Icon name="wallet" size={17}/></div>
                </div>
                <div className="sum-value">{fmtVND(conVND)}</div>
                <div className={`sum-sub ${conUSD>=0?"pos":"neg"}`}>USD: {fmtUSD(conUSD)}</div>
              </div>
            </div>
          )}

          {/* ── DASHBOARD ── */}
          {tab==="dashboard" && !loading && (
            <>
              {/* Game ranking list */}
              <div className="section">
                <div className="section-header">
                  <span className="section-title">Top Game Thu Mua</span>
                  <span style={{fontSize:11,color:"var(--text-dim)"}}>Tất cả thời gian · {gameStats.length} game</span>
                </div>
                {gameStats.length === 0 ? <EmptyState text="Chưa có dữ liệu"/> : (
                  <div className="game-rank-list">
                    {gameStats.map((g, i) => {
                      const maxCount = gameStats[0].count;
                      const pct = Math.round((g.count / maxCount) * 100);
                      return (
                        <div key={g.name} className="game-rank-item">
                          <span className="game-rank-pos" style={{color: GAME_COLORS[i % GAME_COLORS.length]}}>#{i+1}</span>
                          <span className="game-rank-name">{g.name}</span>
                          <div className="game-rank-bar-wrap">
                            <div className="game-rank-bar" style={{width:`${pct}%`, background: GAME_COLORS[i % GAME_COLORS.length]}}/>
                          </div>
                          <span className="game-rank-count">{g.count} lần</span>
                          <span className="game-rank-total">{fmtVND(g.total)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="section">
                <div className="section-header"><span className="section-title">Thống Kê Nhanh</span></div>
                <div className="stats-grid">
                  <StatBox label="Giao dịch chi"   value={chiRows.length}                 unit="giao dịch" color="red"/>
                  <StatBox label="Giao dịch nhập"  value={nhanRows.length}                unit="giao dịch" color="green"/>
                  <StatBox label="Nhân viên"        value={Object.keys(staffStats).length} unit="người"     color="blue"/>
                  <StatBox label="Người nhập quỹ"  value={Object.keys(nhanStats).length}  unit="người"     color="yellow"/>
                </div>
              </div>

              <div className="section">
                <div className="section-header"><span className="section-title">Nhân Viên Thu Mua</span></div>
                {Object.keys(staffStats).length===0 ? <EmptyState text="Chưa có dữ liệu"/> : (
                  <table className="data-table">
                    <thead><tr>
                      <th>Tên</th><th>Số Acc</th>
                      <th style={{textAlign:"right"}}>Chi VND</th>
                      <th style={{textAlign:"right"}}>Chi USD</th>
                      <th style={{textAlign:"right"}}>Tổng Quy Đổi</th>
                    </tr></thead>
                    <tbody>
                      {Object.entries(staffStats).sort((a,b)=>(b[1].vnd+b[1].usd*usdRate)-(a[1].vnd+a[1].usd*usdRate)).map(([name,s]) => (
                        <tr key={name}>
                          <td><span className="badge blue">{name}</span></td>
                          <td><span className="badge purple">{s.vndCount + s.usdCount} acc</span></td>
                          <td className="num red-text">{fmtVND(s.vnd)}</td>
                          <td className="num yellow-text">{fmtUSD(s.usd)}</td>
                          <td className="num red-text">{fmtVND(s.vnd+s.usd*usdRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="section">
                <div className="section-header"><span className="section-title">Người Nhập Quỹ</span></div>
                {Object.keys(nhanStats).length===0 ? <EmptyState text="Chưa có dữ liệu"/> : (
                  <table className="data-table">
                    <thead><tr>
                      <th>Tên</th>
                      <th style={{textAlign:"right"}}>Nhập VND</th>
                      <th style={{textAlign:"right"}}>Nhập USD</th>
                      <th style={{textAlign:"right"}}>Tổng Quy Đổi</th>
                    </tr></thead>
                    <tbody>
                      {Object.entries(nhanStats).sort((a,b)=>(b[1].vnd+b[1].usd*usdRate)-(a[1].vnd+a[1].usd*usdRate)).map(([name,s]) => (
                        <tr key={name}>
                          <td><span className="badge green">{name}</span></td>
                          <td className="num green-text">{fmtVND(s.vnd)}</td>
                          <td className="num yellow-text">{fmtUSD(s.usd)}</td>
                          <td className="num green-text">{fmtVND(s.vnd+s.usd*usdRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* ── CHI TAB ── */}
          {tab==="chi" && !loading && (
            <div className="section">
              <div className="section-header">
                <span className="section-title">
                  Danh Sách Chi &nbsp;<span className="badge purple">{displayChi.length}</span>
                  {cancelledChi.length>0 && <span className="badge red" style={{marginLeft:6}}>{cancelledChi.length} hoàn</span>}
                </span>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <button
                    className={`btn-toggle ${showCancelled?"active":""}`}
                    onClick={() => setShowCancelled(v=>!v)}
                    title={showCancelled ? "Ẩn giao dịch hoàn tiền" : "Hiện giao dịch hoàn tiền"}
                  >
                    <Icon name={showCancelled?"eye":"eye_off"} size={13}/>
                    <span>Hoàn Tiền</span>
                  </button>
                  <button className="btn-add" onClick={() => setModal({type:"chi",data:null})}>
                    <Icon name="plus" size={13}/> Thêm Mới
                  </button>
                </div>
              </div>
              <div className="table-toolbar">
                <div className="search-box">
                  <Icon name="search" size={14}/>
                  <input value={chiSearch} onChange={e=>setChiSearch(e.target.value)} placeholder="Tìm account, người mua, ghi chú..."/>
                  {chiSearch && <button onClick={()=>setChiSearch("")} className="search-clear"><Icon name="close" size={12}/></button>}
                </div>
              </div>
              {displayChi.length===0 ? <EmptyState text={chiSearch?"Không tìm thấy kết quả":"Chưa có giao dịch chi nào"}/> : (
                <table className="data-table">
                  <thead><tr>
                    <SortTh label="Ngày"      col="date"     sort={chiSort} onSort={c=>toggleSort(setChiSort,c)}/>
                    <SortTh label="Account"   col="account"  sort={chiSort} onSort={c=>toggleSort(setChiSort,c)}/>
                    <th style={{textAlign:"right"}}>VND</th>
                    <th style={{textAlign:"right"}}>USD</th>
                    <SortTh label="Người Mua" col="nguoiMua" sort={chiSort} onSort={c=>toggleSort(setChiSort,c)}/>
                    <th>Ghi Chú</th>
                    <th style={{width:72}}></th>
                  </tr></thead>
                  <tbody>
                    {displayChi.map(r => (
                      <tr key={r.id} className={r.cancelled?"cancelled":""}>
                        <td className="date-cell">{fmtDate(r)}</td>
                        <td>
                          <span className="acc-name">{r.account}</span>
                          {r.cancelled && <span className="badge red" style={{marginLeft:6,fontSize:10}}>Hoàn</span>}
                        </td>
                        <td className="num red-text">{r.currency==="VND"?fmtVND(r.soTien):"—"}</td>
                        <td className="num yellow-text">{r.currency==="USD"?fmtUSD(r.soTien):"—"}</td>
                        <td><span className="badge blue">{r.nguoiMua}</span></td>
                        <td className="note-cell" title={r.ghiChu}>{r.ghiChu}</td>
                        <td className="actions">
                          <button className="icon-btn" onClick={()=>setModal({type:"chi",data:r})}><Icon name="edit" size={13}/></button>
                          <button className="icon-btn danger" onClick={()=>deleteRecord("chi",r.id)}><Icon name="trash" size={13}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {displayChi.length>0 && (
                <div className="table-footer">
                  <span>{displayChi.length} giao dịch</span>
                  <span>VND: <b className="red-text">{fmtVND(displayChi.filter(r=>!r.cancelled&&r.currency==="VND").reduce((s,r)=>s+(r.soTien||0),0))}</b></span>
                  <span>USD: <b className="yellow-text">{fmtUSD(displayChi.filter(r=>!r.cancelled&&r.currency==="USD").reduce((s,r)=>s+(r.soTien||0),0))}</b></span>
                </div>
              )}
            </div>
          )}

          {/* ── NHAN TAB ── */}
          {tab==="nhan" && !loading && (
            <div className="section">
              <div className="section-header">
                <span className="section-title">Nhập Quỹ &nbsp;<span className="badge purple">{displayNhan.length}</span></span>
                <button className="btn-add" onClick={()=>setModal({type:"nhan",data:null})}>
                  <Icon name="plus" size={13}/> Thêm Mới
                </button>
              </div>
              <div className="table-toolbar">
                <div className="search-box">
                  <Icon name="search" size={14}/>
                  <input value={nhanSearch} onChange={e=>setNhanSearch(e.target.value)} placeholder="Tìm người chuyển, ghi chú..."/>
                  {nhanSearch && <button onClick={()=>setNhanSearch("")} className="search-clear"><Icon name="close" size={12}/></button>}
                </div>
              </div>
              {displayNhan.length===0 ? <EmptyState text={nhanSearch?"Không tìm thấy kết quả":"Chưa có giao dịch nhập quỹ nào"}/> : (
                <table className="data-table">
                  <thead><tr>
                    <SortTh label="Ngày"         col="date"        sort={nhanSort} onSort={c=>toggleSort(setNhanSort,c)}/>
                    <th style={{textAlign:"right"}}>Số Tiền</th>
                    <th>Loại</th>
                    <SortTh label="Người Chuyển" col="nguoiChuyen" sort={nhanSort} onSort={c=>toggleSort(setNhanSort,c)}/>
                    <th>Ghi Chú</th>
                    <th style={{width:72}}></th>
                  </tr></thead>
                  <tbody>
                    {displayNhan.map(r => (
                      <tr key={r.id}>
                        <td className="date-cell">{fmtDate(r)}</td>
                        <td className="num green-text">{r.currency==="USD"?fmtUSD(r.soTien):fmtVND(r.soTien)}</td>
                        <td><span className={`badge ${r.currency==="USD"?"yellow":"green"}`}>{r.currency}</span></td>
                        <td><span className="badge green">{r.nguoiChuyen}</span></td>
                        <td className="note-cell" title={r.ghiChu}>{r.ghiChu}</td>
                        <td className="actions">
                          <button className="icon-btn" onClick={()=>setModal({type:"nhan",data:r})}><Icon name="edit" size={13}/></button>
                          <button className="icon-btn danger" onClick={()=>deleteRecord("nhan",r.id)}><Icon name="trash" size={13}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {displayNhan.length>0 && (
                <div className="table-footer">
                  <span>{displayNhan.length} giao dịch</span>
                  <span>VND: <b className="green-text">{fmtVND(displayNhan.filter(r=>r.currency==="VND").reduce((s,r)=>s+(r.soTien||0),0))}</b></span>
                  <span>USD: <b className="yellow-text">{fmtUSD(displayNhan.filter(r=>r.currency==="USD").reduce((s,r)=>s+(r.soTien||0),0))}</b></span>
                </div>
              )}
            </div>
          )}

          {/* ── STAFF TAB ── */}
          {tab==="staff" && !loading && (
            <div className="section">
              <div className="section-header"><span className="section-title">Chi Tiết Nhân Viên</span></div>
              {Object.keys(staffStats).length===0 ? <EmptyState text="Chưa có dữ liệu cho tháng này"/> : (
                <div className="staff-grid">
                  {Object.entries(staffStats).sort((a,b)=>(b[1].vnd+b[1].usd*usdRate)-(a[1].vnd+a[1].usd*usdRate)).map(([name,s]) => (
                    <div key={name} className="staff-card">
                      <div className="staff-card-header">
                        <div className="staff-avatar">{name[0]}</div>
                        <div><div className="staff-name">{name}</div><div className="staff-role">Thu Mua</div></div>
                      </div>
                      <div className="staff-rows">
                        <div className="staff-row">
                          <span>Số Acc</span>
                          <span className="num">
                            {s.vndCount + s.usdCount}
                            <span style={{fontSize:10,color:"var(--text-dim)",marginLeft:4}}>
                              ({s.vndCount} VND + {s.usdCount} USD)
                            </span>
                          </span>
                        </div>
                        <div className="staff-row"><span>Chi VND</span><span className="num red-text">{fmtVND(s.vnd)}</span></div>
                        <div className="staff-row"><span>Chi USD</span><span className="num yellow-text">{fmtUSD(s.usd)}</span></div>
                        <div className="staff-row total"><span>Tổng Quy Đổi</span><span className="num red-text">{fmtVND(s.vnd+s.usd*usdRate)}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ADMIN TAB ── */}
          {tab==="admin" && isAdmin && (
            <AdminPage usdRate={usdRate} />
          )}
        </div>
      </div>

      {/* ── MODAL ── */}
      {modal && (
        <Modal type={modal.type} data={modal.data} onClose={()=>setModal(null)}
          onSave={(data,id) => saveRecord(modal.type==="chi"?"chi":"nhan", data, id)}/>
      )}

      {/* ── CONFIRM DIALOG ── */}
      {confirm && (
        <ConfirmDialog title={confirm.title} message={confirm.message}
          onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>
      )}

      {/* ── TOASTS ── */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type||"success"}`}>
            <Icon name={t.type==="error"?"alert":"check"} size={14}/>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── COMPONENTS ────────────────────────────────────────────────────────────────

function SortTh({ label, col, sort, onSort }) {
  const active = sort.col === col;
  return (
    <th onClick={() => onSort(col)} style={{cursor:"pointer",userSelect:"none"}} className="sortable-th">
      <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
        {label}
        <span style={{color:active?"#4f8ef7":"inherit"}}>
          <Icon name={active?(sort.asc?"sort_asc":"sort_desc"):"sort_none"} size={11}/>
        </span>
      </span>
    </th>
  );
}

function StatBox({ label, value, unit, color }) {
  return (
    <div className={`stat-box ${color}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-unit">{unit}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon name="grid" size={20}/></div>
      <span>{text}</span>
    </div>
  );
}

// ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e=>e.stopPropagation()}>
        <div className="confirm-icon-wrap">
          <Icon name="alert" size={24}/>
        </div>
        <div className="confirm-title">{title}</div>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>Hủy</button>
          <button className="btn-danger" onClick={onConfirm}>Xóa</button>
        </div>
      </div>
    </div>
  );
}

// ── ADMIN PAGE ────────────────────────────────────────────────────────────────

function AdminPage({ usdRate }) {
  const [userList,   setUserList]   = useState([]);
  const [allChi,     setAllChi]     = useState({});
  const [allNhan,    setAllNhan]    = useState({});
  const [adminLoad,  setAdminLoad]  = useState(true);
  const [adminError, setAdminError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Collection group queries — fetch ALL chi/nhan docs across every user
        const [chiSnap, nhanSnap] = await Promise.all([
          getDocs(collectionGroup(db, "chi")),
          getDocs(collectionGroup(db, "nhan")),
        ]);

        // Group by UID extracted from document path: users/{uid}/chi/{docId}
        const chiMap = {}, nhanMap = {};
        chiSnap.forEach(d => {
          const uid = d.ref.parent.parent.id;
          if (!chiMap[uid]) chiMap[uid] = [];
          chiMap[uid].push({ id: d.id, ...d.data() });
        });
        nhanSnap.forEach(d => {
          const uid = d.ref.parent.parent.id;
          if (!nhanMap[uid]) nhanMap[uid] = [];
          nhanMap[uid].push({ id: d.id, ...d.data() });
        });

        setAllChi(chiMap);
        setAllNhan(nhanMap);

        // Build user list from all UIDs that have data
        const allUids = [...new Set([...Object.keys(chiMap), ...Object.keys(nhanMap)])];

        // Try to get emails from users/{uid} docs or registeredUsers
        const emailMap = {};
        const lastSeenMap = {};
        try {
          const uSnap = await getDocs(collection(db, "users"));
          uSnap.forEach(d => { emailMap[d.id] = d.data().email; lastSeenMap[d.id] = d.data().lastSeen; });
        } catch {}
        try {
          const rSnap = await getDocs(collection(db, "registeredUsers"));
          rSnap.forEach(d => {
            if (!emailMap[d.id]) emailMap[d.id] = d.data().email;
            if (!lastSeenMap[d.id]) lastSeenMap[d.id] = d.data().lastSeen;
          });
        } catch {}

        setUserList(allUids.map(uid => ({
          uid,
          email:    emailMap[uid]    || uid,
          lastSeen: lastSeenMap[uid] || null,
        })));
      } catch (e) {
        setAdminError(e.message);
      } finally {
        setAdminLoad(false);
      }
    };
    load();
  }, []);

  const allChiFlat  = useMemo(() => Object.values(allChi).flat(),  [allChi]);
  const allNhanFlat = useMemo(() => Object.values(allNhan).flat(), [allNhan]);
  const activeFlat  = useMemo(() => allChiFlat.filter(r => !r.cancelled), [allChiFlat]);

  const totChiVND  = useMemo(() => activeFlat.filter(r=>r.currency==="VND").reduce((s,r)=>s+(r.soTien||0),0), [activeFlat]);
  const totChiUSD  = useMemo(() => activeFlat.filter(r=>r.currency==="USD").reduce((s,r)=>s+(r.soTien||0),0), [activeFlat]);
  const totNhanVND = useMemo(() => allNhanFlat.filter(r=>r.currency==="VND").reduce((s,r)=>s+(r.soTien||0),0), [allNhanFlat]);
  const totNhanUSD = useMemo(() => allNhanFlat.filter(r=>r.currency==="USD").reduce((s,r)=>s+(r.soTien||0),0), [allNhanFlat]);
  const conVND = totNhanVND - totChiVND;
  const conUSD = totNhanUSD - totChiUSD;

  const topGames = useMemo(() => {
    const stats = {};
    activeFlat.forEach(r => {
      const name = extractGame(r.account);
      if (!stats[name]) stats[name] = 0;
      stats[name]++;
    });
    return Object.entries(stats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [activeFlat]);

  if (adminLoad) return <div className="loading"><div className="spinner"/>Đang tải dữ liệu admin...</div>;

  if (adminError) return (
    <div className="section">
      <div className="section-header"><span className="section-title">Lỗi Kết Nối Admin</span></div>
      <div style={{padding:"20px 24px"}}>
        <div className="login-error">{adminError}</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Global summary */}
      <div className="summary-row">
        <div className="sum-card red">
          <div className="sum-card-header">
            <div className="sum-label">Tổng Chi · All Users</div>
            <div className="sum-card-icon"><Icon name="arrow_down" size={17}/></div>
          </div>
          <div className="sum-value">{fmtVND(totChiVND)}</div>
          <div className="sum-sub">USD: {fmtUSD(totChiUSD)}</div>
        </div>
        <div className="sum-card green">
          <div className="sum-card-header">
            <div className="sum-label">Tổng Nhập · All Users</div>
            <div className="sum-card-icon"><Icon name="arrow_up" size={17}/></div>
          </div>
          <div className="sum-value">{fmtVND(totNhanVND)}</div>
          <div className="sum-sub">USD: {fmtUSD(totNhanUSD)}</div>
        </div>
        <div className={`sum-card ${conVND>=0?"blue":"red"}`}>
          <div className="sum-card-header">
            <div className="sum-label">Còn Lại · Tổng</div>
            <div className="sum-card-icon"><Icon name="wallet" size={17}/></div>
          </div>
          <div className="sum-value">{fmtVND(conVND)}</div>
          <div className={`sum-sub ${conUSD>=0?"pos":"neg"}`}>USD: {fmtUSD(conUSD)}</div>
        </div>
      </div>

      {/* Per-user breakdown */}
      <div className="section">
        <div className="section-header">
          <span className="section-title">
            Chi Tiết Từng User &nbsp;
            <span className="badge purple">{userList.length} users</span>
          </span>
          <span style={{fontSize:11,color:"var(--text-dim)"}}>Tất cả thời gian</span>
        </div>
        {userList.length === 0 ? <EmptyState text="Chưa có user đăng ký (cần cập nhật Firestore rules)"/> : (
          <div style={{overflowX:"auto"}}>
            <table className="data-table">
              <thead><tr>
                <th>Email</th>
                <th>Lần Cuối</th>
                <th style={{textAlign:"right"}}>Giao Dịch</th>
                <th style={{textAlign:"right"}}>Chi VND</th>
                <th style={{textAlign:"right"}}>Chi USD</th>
                <th style={{textAlign:"right"}}>Nhập VND</th>
                <th style={{textAlign:"right"}}>Còn Lại</th>
              </tr></thead>
              <tbody>
                {userList.map(u => {
                  const chi  = allChi[u.uid]  || [];
                  const nhan = allNhan[u.uid] || [];
                  const act  = chi.filter(r=>!r.cancelled);
                  const cVND = act.filter(r=>r.currency==="VND").reduce((s,r)=>s+(r.soTien||0),0);
                  const cUSD = act.filter(r=>r.currency==="USD").reduce((s,r)=>s+(r.soTien||0),0);
                  const nVND = nhan.filter(r=>r.currency==="VND").reduce((s,r)=>s+(r.soTien||0),0);
                  const nUSD = nhan.filter(r=>r.currency==="USD").reduce((s,r)=>s+(r.soTien||0),0);
                  const bal  = (nVND - cVND) + (nUSD - cUSD) * usdRate;
                  const seen = u.lastSeen?.toDate
                    ? u.lastSeen.toDate().toLocaleDateString("vi-VN")
                    : "—";
                  return (
                    <tr key={u.uid}>
                      <td><span className="badge blue">{u.email}</span></td>
                      <td className="date-cell">{seen}</td>
                      <td className="num">{chi.length}</td>
                      <td className="num red-text">{fmtVND(cVND)}</td>
                      <td className="num yellow-text">{fmtUSD(cUSD)}</td>
                      <td className="num green-text">{fmtVND(nVND)}</td>
                      <td className={`num ${bal>=0?"green-text":"red-text"}`}>{fmtVND(bal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top games across all users */}
      {topGames.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Top Game Toàn Hệ Thống</span>
            <span style={{fontSize:11,color:"var(--text-dim)"}}>{activeFlat.length} giao dịch · {topGames.length} game</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={Math.max(200, topGames.length * 46 + 30)}>
              <BarChart layout="vertical" data={topGames} margin={{left:10, right:54, top:6, bottom:6}}>
                <XAxis type="number" tick={{fill:"#4e5880",fontSize:11,fontFamily:"IBM Plex Mono"}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{fill:"#8b96c0",fontSize:12,fontFamily:"Be Vietnam Pro"}} axisLine={false} tickLine={false} width={86}/>
                <Tooltip
                  cursor={{fill:"rgba(255,255,255,0.04)"}}
                  contentStyle={{background:"#13162a",border:"1px solid #252d4a",borderRadius:9,fontSize:12,color:"#e8eaf6",padding:"8px 14px"}}
                  formatter={(v) => [v + " lần", "Số lần mua"]}
                  labelStyle={{color:"#8b96c0",marginBottom:4}}
                />
                <Bar dataKey="count" radius={[0,4,4,0]} maxBarSize={28}>
                  {topGames.map((_, i) => <Cell key={i} fill={GAME_COLORS[i % GAME_COLORS.length]}/>)}
                  <LabelList dataKey="count" position="right" style={{fill:"#8b96c0",fontSize:11,fontFamily:"IBM Plex Mono",fontWeight:600}}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </>
  );
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function Modal({ type, data, onClose, onSave }) {
  const isChi = type === "chi";
  const existingDate = data?.ngay
    || (data?.createdAt?.toDate ? data.createdAt.toDate().toISOString().split("T")[0] : todayISO());
  const [form, setForm] = useState({
    account:     data?.account     || "",
    soTien:      data?.soTien      || "",
    currency:    data?.currency    || "VND",
    nguoiMua:    data?.nguoiMua    || "",
    nguoiChuyen: data?.nguoiChuyen || "",
    ghiChu:      data?.ghiChu      || "",
    cancelled:   data?.cancelled   || false,
    ngay:        existingDate,
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:undefined})); };

  const validate = () => {
    const e = {};
    if (!form.ngay)                        e.ngay = "Vui lòng chọn ngày";
    if (!form.soTien || Number(form.soTien) <= 0) e.soTien = "Vui lòng nhập số tiền hợp lệ";
    if (isChi && !form.account.trim())     e.account = "Vui lòng nhập tên account";
    if (isChi && !form.nguoiMua.trim())    e.nguoiMua = "Vui lòng nhập người mua";
    if (!isChi && !form.nguoiChuyen.trim()) e.nguoiChuyen = "Vui lòng nhập người chuyển";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const payload = { ...form, soTien: parseFloat(String(form.soTien).replace(/,/g,"")) || 0 };
    if (!isChi) { delete payload.account; delete payload.nguoiMua; }
    if (isChi)  { delete payload.nguoiChuyen; }
    onSave(payload, data?.id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{data?"Chỉnh Sửa":"Thêm Mới"} — {isChi?"Chi":"Nhập Quỹ"}</div>
            <div className="modal-title-sub">{isChi?"Ghi nhận chi phí mua acc":"Ghi nhận tiền nhập quỹ"}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={15}/></button>
        </div>
        <div className="modal-body">
          <div className="fields-row">
            <Field label="Ngày" error={errors.ngay}>
              <input type="date" value={form.ngay} onChange={e=>set("ngay",e.target.value)} className={errors.ngay?"input-error":""}/>
            </Field>
            <Field label="Tiền Tệ">
              <select value={form.currency} onChange={e=>set("currency",e.target.value)}>
                <option value="VND">VND — Việt Nam Đồng</option>
                <option value="USD">USD — US Dollar</option>
              </select>
            </Field>
          </div>
          <Field label="Số Tiền" error={errors.soTien}>
            <input type="number" value={form.soTien} onChange={e=>set("soTien",e.target.value)}
              placeholder={form.currency==="VND"?"0 đ":"0.00 $"} className={errors.soTien?"input-error":""}
              min="0" step={form.currency==="VND"?"1000":"0.01"}/>
          </Field>
          {isChi && (
            <Field label="Tên Account" error={errors.account}>
              <input value={form.account} onChange={e=>set("account",e.target.value)}
                placeholder="vd: lord 35, nikke 14..." className={errors.account?"input-error":""}/>
            </Field>
          )}
          {isChi
            ? <Field label="Người Mua" error={errors.nguoiMua}>
                <input value={form.nguoiMua} onChange={e=>set("nguoiMua",e.target.value)}
                  placeholder="vd: H.Hiếu, C.Hùng..." className={errors.nguoiMua?"input-error":""}/>
              </Field>
            : <Field label="Người Chuyển" error={errors.nguoiChuyen}>
                <input value={form.nguoiChuyen} onChange={e=>set("nguoiChuyen",e.target.value)}
                  placeholder="vd: A2 Chuyển, Nhập..." className={errors.nguoiChuyen?"input-error":""}/>
              </Field>
          }
          <Field label="Ghi Chú">
            <input value={form.ghiChu} onChange={e=>set("ghiChu",e.target.value)} placeholder="Ghi chú thêm (tuỳ chọn)..."/>
          </Field>
          {isChi && (
            <label className="checkbox-label">
              <input type="checkbox" checked={form.cancelled} onChange={e=>set("cancelled",e.target.checked)}/>
              Đánh dấu Cancel / Hoàn Tiền
            </label>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Hủy</button>
          <button className="btn-save" onClick={handleSave}><Icon name="check" size={14}/> Lưu</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="field">
      {label && <label className={error?"label-error":""}>{label}{error&&<span className="field-error-msg"> — {error}</span>}</label>}
      {children}
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError("Vui lòng nhập đầy đủ thông tin"); return; }
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("Email hoặc mật khẩu không đúng");
      setLoading(false);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-logo-icon"><Icon name="wallet" size={26}/></div>
          <div className="login-title">BILLS TRACKER</div>
          <div className="login-sub">Đăng nhập để quản lý tài chính</div>
        </div>
        <div className="login-fields">
          <Field label="Email">
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="your@email.com" onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoFocus/>
          </Field>
          <Field label="Mật Khẩu">
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
          </Field>
          {error && <div className="login-error">{error}</div>}
          <button className="btn-login" onClick={handleLogin} disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng Nhập"}
          </button>
        </div>
      </div>
    </div>
  );
}
