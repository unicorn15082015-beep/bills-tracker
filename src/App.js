import React, { useState, useEffect } from "react";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  deleteDoc, doc, updateDoc, serverTimestamp
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import "./styles/main.css";

// ─── ICONS (inline SVG để không cần thư viện) ────────────────────────────────
const Icon = ({ name, size = 16 }) => {
  const icons = {
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    wallet: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 3l-4 4-4-4"/><circle cx="16" cy="13" r="1" fill="currentColor"/></svg>,
    arrow_down: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
    arrow_up: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    chart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    close: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  };
  return icons[name] || null;
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const USD_RATE = 25400; // tỷ giá mặc định VND/USD
const fmtVND = (n) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0)) + " đ";
const fmtUSD = (n) => "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(n || 0);
const fmtDate = (row) => {
  if (row?.ngay) return new Date(row.ngay + "T00:00:00").toLocaleDateString("vi-VN");
  if (!row?.createdAt) return "";
  const d = row.createdAt.toDate ? row.createdAt.toDate() : new Date(row.createdAt);
  return d.toLocaleDateString("vi-VN");
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);
  const [chiRows, setChiRows] = useState([]);
  const [nhanRows, setNhanRows] = useState([]);
  const [modal, setModal] = useState(null); // { type: 'chi'|'nhan', data: null|{...} }
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`);

  // ── Realtime listeners ──
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const qChi = query(collection(db, `users/${uid}/chi`), orderBy("createdAt", "desc"));
    const unsubChi = onSnapshot(qChi, (snap) => {
      setChiRows(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const qNhan = query(collection(db, `users/${uid}/nhan`), orderBy("createdAt", "desc"));
    const unsubNhan = onSnapshot(qNhan, (snap) => {
      setNhanRows(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubChi(); unsubNhan(); };
  }, [user]);

  // ── Filter by month ──
  const getRowDate = (r) => {
    if (r.ngay) return new Date(r.ngay + "T00:00:00");
    if (r.createdAt?.toDate) return r.createdAt.toDate();
    return new Date();
  };
  const inMonth = (r) => {
    if (!filterMonth) return true;
    const d = getRowDate(r);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    return ym === filterMonth;
  };
  const filteredChi = chiRows.filter(inMonth);
  const filteredNhan = nhanRows.filter(inMonth);

  // ── Aggregates (VND và USD tách biệt hoàn toàn) ──
  const totalChiVND = filteredChi.filter(r => r.currency === "VND").reduce((s, r) => s + (r.soTien || 0), 0);
  const totalChiUSD = filteredChi.filter(r => r.currency === "USD").reduce((s, r) => s + (r.soTien || 0), 0);
  const totalNhanVND = filteredNhan.filter(r => r.currency === "VND").reduce((s, r) => s + (r.soTien || 0), 0);
  const totalNhanUSD = filteredNhan.filter(r => r.currency === "USD").reduce((s, r) => s + (r.soTien || 0), 0);
  const conVND = totalNhanVND - totalChiVND;
  const conUSD = totalNhanUSD - totalChiUSD;

  // Staff stats
  const staffStats = {};
  filteredChi.forEach(r => {
    const name = (r.nguoiMua || "Không rõ").trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    if (!staffStats[name]) staffStats[name] = { vnd: 0, usd: 0, accCount: 0 };
    if (r.currency === "VND") staffStats[name].vnd += r.soTien || 0;
    else staffStats[name].usd += r.soTien || 0;
    staffStats[name].accCount += 1;
  });

  const nhanStats = {};
  filteredNhan.forEach(r => {
    const name = (r.nguoiChuyen || "Không rõ").trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    if (!nhanStats[name]) nhanStats[name] = { vnd: 0, usd: 0 };
    if (r.currency === "VND") nhanStats[name].vnd += r.soTien || 0;
    else nhanStats[name].usd += r.soTien || 0;
  });

  // ── CRUD ──
  const saveRecord = async (collName, data, id) => {
    const uid = user.uid;
    const path = `users/${uid}/${collName}`;
    if (id) {
      await updateDoc(doc(db, path, id), { ...data, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, path), { ...data, createdAt: serverTimestamp() });
    }
    setModal(null);
  };

  const deleteRecord = async (collName, id) => {
    if (window.confirm("Xác nhận xóa?")) {
      const uid = user.uid;
      await deleteDoc(doc(db, `users/${uid}/${collName}`, id));
    }
  };

  const tabs = [
    { id: "dashboard", label: "Tổng Quan", icon: "chart" },
    { id: "chi", label: "Chi", icon: "arrow_down" },
    { id: "nhan", label: "Nhập Quỹ", icon: "arrow_up" },
    { id: "staff", label: "Nhân Viên", icon: "user" },
  ];

  if (authLoading) return <div className="auth-loading">Đang tải...</div>;
  if (!user) return <LoginScreen />;

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <div className="header-brand">
          <Icon name="wallet" size={22} />
          <span>BILLS TRACKER</span>
        </div>
        <div className="header-user">
          <span className="user-email">{user.email}</span>
          <button className="btn-logout" onClick={() => signOut(auth)}>Đăng xuất</button>
        </div>
        <nav className="tab-nav">
          {tabs.map(t => (
            <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} size={15} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="month-filter">
          <span className="month-label">Tháng</span>
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="month-input"
          />
          <button className="month-all-btn" onClick={() => setFilterMonth("")}>Tất cả</button>
        </div>
      </header>

      {/* SUMMARY BAR */}
      <div className="summary-bar">
        <div className="sum-card red">
          <div className="sum-label">Tổng Chi VND</div>
          <div className="sum-value">{fmtVND(totalChiVND)}</div>
          <div className="sum-sub2">Chi USD: {fmtUSD(totalChiUSD)}</div>
        </div>
        <div className="sum-card green">
          <div className="sum-label">Tổng Nhập VND</div>
          <div className="sum-value">{fmtVND(totalNhanVND)}</div>
          <div className="sum-sub2">Nhập USD: {fmtUSD(totalNhanUSD)}</div>
        </div>
        <div className={`sum-card ${conVND >= 0 ? "blue" : "red"}`}>
          <div className="sum-label">Còn VND</div>
          <div className="sum-value">{fmtVND(conVND)}</div>
          <div className={`sum-sub2 ${conUSD >= 0 ? "green-text" : "red-text"}`}>Còn USD: {fmtUSD(conUSD)}</div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="main">
        {loading && <div className="loading">Đang tải dữ liệu...</div>}

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div className="section">
            <h2 className="section-title">Thống Kê Nhanh</h2>
            <div className="stats-grid">
              <StatBox label="Tổng giao dịch chi" value={chiRows.length} unit="giao dịch" color="red" />
              <StatBox label="Tổng giao dịch nhập" value={nhanRows.length} unit="giao dịch" color="green" />
              <StatBox label="Số nhân viên" value={Object.keys(staffStats).length} unit="người" color="blue" />
              <StatBox label="Người nhập quỹ" value={Object.keys(nhanStats).length} unit="người" color="yellow" />
            </div>

            <h2 className="section-title" style={{marginTop: 32}}>Nhân Viên Thu Mua</h2>
            <table className="data-table">
              <thead>
                <tr><th>Tên</th><th>Số Acc</th><th>Chi VND</th><th>Chi USD</th><th>Tổng (VND quy đổi)</th></tr>
              </thead>
              <tbody>
                {Object.entries(staffStats).map(([name, s]) => (
                  <tr key={name}>
                    <td><span className="badge blue">{name}</span></td>
                    <td className="num">{s.accCount}</td>
                    <td className="num red-text">{fmtVND(s.vnd)}</td>
                    <td className="num red-text">{fmtUSD(s.usd)}</td>
                    <td className="num red-text">{fmtVND(s.vnd + s.usd * USD_RATE)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2 className="section-title" style={{marginTop: 32}}>Người Nhập Quỹ</h2>
            <table className="data-table">
              <thead>
                <tr><th>Tên</th><th>Nhập VND</th><th>Nhập USD</th><th>Tổng (VND quy đổi)</th></tr>
              </thead>
              <tbody>
                {Object.entries(nhanStats).map(([name, s]) => (
                  <tr key={name}>
                    <td><span className="badge green">{name}</span></td>
                    <td className="num green-text">{fmtVND(s.vnd)}</td>
                    <td className="num green-text">{fmtUSD(s.usd)}</td>
                    <td className="num green-text">{fmtVND(s.vnd + s.usd * USD_RATE)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CHI */}
        {tab === "chi" && (
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">Danh Sách Chi</h2>
              <button className="btn-add" onClick={() => setModal({ type: "chi", data: null })}>
                <Icon name="plus" size={14} /> Thêm
              </button>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Ngày</th><th>Account</th><th>Số Tiền VND</th><th>Số Tiền USD</th><th>Người Mua</th><th>Ghi Chú</th><th></th></tr>
              </thead>
              <tbody>
                {filteredChi.map(r => (
                  <tr key={r.id} className={r.cancelled ? "cancelled" : ""}>
                    <td>{fmtDate(r)}</td>
                    <td><span className="acc-name">{r.account}</span></td>
                    <td className="num red-text">{r.currency === "VND" ? fmtVND(r.soTien) : ""}</td>
                    <td className="num yellow-text">{r.currency === "USD" ? fmtUSD(r.soTien) : ""}</td>
                    <td><span className="badge blue">{r.nguoiMua}</span></td>
                    <td className="note-cell">{r.ghiChu}</td>
                    <td className="actions">
                      <button className="icon-btn" onClick={() => setModal({ type: "chi", data: r })}><Icon name="edit" size={13}/></button>
                      <button className="icon-btn danger" onClick={() => deleteRecord("chi", r.id)}><Icon name="trash" size={13}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* NHAN */}
        {tab === "nhan" && (
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">Nhập Quỹ</h2>
              <button className="btn-add" onClick={() => setModal({ type: "nhan", data: null })}>
                <Icon name="plus" size={14} /> Thêm
              </button>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Ngày</th><th>Số Tiền</th><th>Tiền Tệ</th><th>Người Chuyển</th><th>Ghi Chú</th><th></th></tr>
              </thead>
              <tbody>
                {filteredNhan.map(r => (
                  <tr key={r.id}>
                    <td>{fmtDate(r)}</td>
                    <td className="num green-text">{r.currency === "USD" ? fmtUSD(r.soTien) : fmtVND(r.soTien)}</td>
                    <td><span className={`badge ${r.currency === "USD" ? "yellow" : "green"}`}>{r.currency}</span></td>
                    <td><span className="badge green">{r.nguoiChuyen}</span></td>
                    <td className="note-cell">{r.ghiChu}</td>
                    <td className="actions">
                      <button className="icon-btn" onClick={() => setModal({ type: "nhan", data: r })}><Icon name="edit" size={13}/></button>
                      <button className="icon-btn danger" onClick={() => deleteRecord("nhan", r.id)}><Icon name="trash" size={13}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* STAFF */}
        {tab === "staff" && (
          <div className="section">
            <h2 className="section-title">Chi Tiết Nhân Viên Thu Mua</h2>
            <div className="staff-grid">
              {Object.entries(staffStats).map(([name, s]) => (
                <div key={name} className="staff-card">
                  <div className="staff-avatar">{name[0]}</div>
                  <div className="staff-name">{name}</div>
                  <div className="staff-rows">
                    <div className="staff-row"><span>Số Acc</span><span className="num">{s.accCount}</span></div>
                    <div className="staff-row"><span>Chi VND</span><span className="num red-text">{fmtVND(s.vnd)}</span></div>
                    <div className="staff-row"><span>Chi USD</span><span className="num red-text">{fmtUSD(s.usd)}</span></div>
                    <div className="staff-row total"><span>Tổng</span><span className="num red-text">{fmtVND(s.vnd + s.usd * USD_RATE)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL */}
      {modal && (
        <Modal
          type={modal.type}
          data={modal.data}
          onClose={() => setModal(null)}
          onSave={(data, id) => saveRecord(modal.type === "chi" ? "chi" : "nhan", data, id)}
        />
      )}
    </div>
  );
}

// ─── STAT BOX ────────────────────────────────────────────────────────────────
function StatBox({ label, value, unit, color }) {
  return (
    <div className={`stat-box ${color}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-unit">{unit}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function Modal({ type, data, onClose, onSave }) {
  const isChi = type === "chi";
  const todayStr = new Date().toISOString().split("T")[0];
  const existingDate = data?.ngay || (data?.createdAt?.toDate ? data.createdAt.toDate().toISOString().split("T")[0] : todayStr);
  const [form, setForm] = useState({
    account: data?.account || "",
    soTien: data?.soTien || "",
    currency: data?.currency || "VND",
    nguoiMua: data?.nguoiMua || "",
    nguoiChuyen: data?.nguoiChuyen || "",
    ghiChu: data?.ghiChu || "",
    cancelled: data?.cancelled || false,
    ngay: existingDate,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    const payload = {
      ...form,
      soTien: parseFloat(String(form.soTien).replace(/,/g, "")) || 0,
    };
    if (!isChi) delete payload.account;
    if (!isChi) delete payload.nguoiMua;
    if (isChi) delete payload.nguoiChuyen;
    onSave(payload, data?.id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>{data ? "Sửa" : "Thêm"} {isChi ? "Chi" : "Nhập Quỹ"}</span>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={16}/></button>
        </div>
        <div className="modal-body">
          <Field label="Ngày">
            <input type="date" value={form.ngay} onChange={e => set("ngay", e.target.value)} />
          </Field>
          {isChi && (
            <Field label="Tên Account">
              <input value={form.account} onChange={e => set("account", e.target.value)} placeholder="lord 35, nikke 14..." />
            </Field>
          )}
          <Field label="Số Tiền">
            <input type="number" value={form.soTien} onChange={e => set("soTien", e.target.value)} placeholder="0" />
          </Field>
          <Field label="Tiền Tệ">
            <select value={form.currency} onChange={e => set("currency", e.target.value)}>
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </select>
          </Field>
          {isChi ? (
            <Field label="Người Mua">
              <input value={form.nguoiMua} onChange={e => set("nguoiMua", e.target.value)} placeholder="H.Hiếu, C.Hùng..." />
            </Field>
          ) : (
            <Field label="Người Chuyển">
              <input value={form.nguoiChuyen} onChange={e => set("nguoiChuyen", e.target.value)} placeholder="A2 Chuyển, Nhập..." />
            </Field>
          )}
          <Field label="Ghi Chú">
            <input value={form.ghiChu} onChange={e => set("ghiChu", e.target.value)} placeholder="Ghi chú thêm..." />
          </Field>
          {isChi && (
            <Field label="">
              <label className="checkbox-label">
                <input type="checkbox" checked={form.cancelled} onChange={e => set("cancelled", e.target.checked)} />
                Cancel / Hoàn Tiền
              </label>
            </Field>
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

function Field({ label, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError("Vui lòng nhập đầy đủ thông tin"); return; }
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError("Email hoặc mật khẩu không đúng");
      setLoading(false);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-box">
        <div className="login-logo">
          <span style={{fontSize:28}}>💰</span>
          <div className="login-title">BILLS TRACKER</div>
          <div className="login-sub">Đăng nhập để tiếp tục</div>
        </div>
        <div className="login-fields">
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
          </div>
          <div className="field">
            <label>Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="btn-login" onClick={handleLogin} disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </div>
      </div>
    </div>
  );
}
