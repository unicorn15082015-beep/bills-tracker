import React, { useState, useEffect } from "react";
import {
  collection, addDoc, deleteDoc, doc, updateDoc, serverTimestamp
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onIdTokenChanged } from "firebase/auth";
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
const fmtVND = (n) => new Intl.NumberFormat("vi-VN").format(Math.round(n || 0)) + " đ";
const fmtUSD = (n) => "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(n || 0);
const fmtDate = (row) => {
  if (row?.ngay) return new Date(row.ngay + "T00:00:00").toLocaleDateString("vi-VN");
  if (!row?.createdAt) return "";
  const d = row.createdAt.toDate ? row.createdAt.toDate() : new Date(row.createdAt);
  return d.toLocaleDateString("vi-VN");
};

const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${process.env.REACT_APP_FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const RETRY_DELAY_MS = 500;
const MAX_TOKEN_ATTEMPTS = 5;
const ADMIN_UID = "76kdiqnd8sblIMR97u54RIXxZ5C2";
const WHITELIST_EMAILS = [
  "lengocthang.mb@gmail.com",
  "torostore.sell@gmail.com"
];

const parseFirestoreValue = (value) => {
  if (value === null) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return Number(value.doubleValue);
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return new Date(value.timestampValue).toISOString();
  if (value.mapValue) {
    const result = {};
    const fields = value.mapValue.fields || {};
    Object.entries(fields).forEach(([key, childValue]) => {
      result[key] = parseFirestoreValue(childValue);
    });
    return result;
  }
  if (value.arrayValue) {
    return (value.arrayValue.values || []).map(parseFirestoreValue);
  }
  return null;
};

const parseFirestoreDocument = (doc) => {
  const data = {};
  const fields = doc.fields || {};
  Object.entries(fields).forEach(([key, value]) => {
    data[key] = parseFirestoreValue(value);
  });
  if (data.createdAt && typeof data.createdAt === "string") {
    data.createdAt = new Date(data.createdAt);
  }
  return { id: doc.name.split("/").pop(), ...data };
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const loadCachedRows = (uid, key) => {
  try {
    const raw = window.localStorage.getItem(`${uid}_${key}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

const saveCachedRows = (uid, key, rows) => {
  try {
    window.localStorage.setItem(`${uid}_${key}`, JSON.stringify(rows));
  } catch (e) {
    // ignore local storage failures
  }
};

const getIdTokenWithRetry = async (user, retries = MAX_TOKEN_ATTEMPTS) => {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const forceRefresh = attempt === retries - 1;
      return await user.getIdToken(forceRefresh);
    } catch (error) {
      lastError = error;
      if (attempt < retries - 1) {
        await delay(RETRY_DELAY_MS);
      }
    }
  }
  throw lastError;
};

const fetchFirestoreCollection = async (path, token) => {
  const url = `${FIRESTORE_BASE_URL}/${path}?pageSize=300`;
  console.debug("Firestore REST fetch", { url, token: token ? "yes" : "no" });
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.debug("Firestore REST response", { status: response.status, statusText: response.statusText });
  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Firestore REST error ${response.status}: ${body}`);
    error.status = response.status;
    throw error;
  }
  const json = await response.json();
  console.debug("Firestore REST payload", json);
  return (json.documents || []).map(parseFirestoreDocument);
};

const fetchCollectionWithAuth = async (user, path) => {
  const token = await getIdTokenWithRetry(user);
  try {
    return await fetchFirestoreCollection(path, token);
  } catch (error) {
    if (error.status === 401) {
      const refreshToken = await user.getIdToken(true);
      return await fetchFirestoreCollection(path, refreshToken);
    }
    throw error;
  }
};

const getRowDate = (r) => {
  if (r.ngay) return new Date(r.ngay + "T00:00:00");
  if (r.createdAt instanceof Date) return r.createdAt;
  if (typeof r.createdAt === "string") return new Date(r.createdAt);
  if (r.createdAt?.toDate) return r.createdAt.toDate();
  return new Date();
};

const sortByOrderDateDesc = (rows) => [...rows].sort((a, b) => {
  const aTime = getRowDate(a).getTime();
  const bTime = getRowDate(b).getTime();
  return bTime - aTime;
});

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.uid !== ADMIN_UID && !WHITELIST_EMAILS.includes(user.email)) {
      signOut(auth);
    }
  }, [user]);

  const [orders, setOrders] = useState([]);
  const [teams, setTeams] = useState([]);
  const [forums, setForums] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [filterMonth, setFilterMonth] = useState(() => {
    const saved = window.localStorage.getItem("filterMonth");
    if (saved !== null) return saved;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [forumFilter, setForumFilter] = useState("all");

  const fetchData = async (currentUser) => {
    if (!currentUser) return;
    setLoading(true);
    setFetchError("");
    await delay(RETRY_DELAY_MS);
    try {
      const [ordersRes, teamsRes, forumsRes] = await Promise.all([
        fetchCollectionWithAuth(currentUser, "seller_orders"),
        fetchCollectionWithAuth(currentUser, "seller_teams"),
        fetchCollectionWithAuth(currentUser, "seller_forums"),
      ]);
      const sortedOrders = sortByOrderDateDesc(ordersRes);
      setOrders(sortedOrders);
      setTeams(teamsRes);
      setForums(forumsRes);
      if (currentUser?.uid) {
        saveCachedRows(currentUser.uid, "orders", sortedOrders);
        saveCachedRows(currentUser.uid, "teams", teamsRes);
        saveCachedRows(currentUser.uid, "forums", forumsRes);
      }
    } catch (error) {
      console.error("Failed to load Firestore data:", error);
      if (currentUser?.uid) {
        const cachedOrders = loadCachedRows(currentUser.uid, "orders");
        const cachedTeams = loadCachedRows(currentUser.uid, "teams");
        const cachedForums = loadCachedRows(currentUser.uid, "forums");
        if (cachedOrders.length || cachedTeams.length || cachedForums.length) {
          setOrders(cachedOrders);
          setTeams(cachedTeams);
          setForums(cachedForums);
          setFetchError("Dữ liệu đang hiển thị từ bộ nhớ đệm vì không tải được dữ liệu mới.");
        } else {
          setFetchError("Không thể tải dữ liệu. Vui lòng thử lại hoặc kiểm tra kết nối.");
        }
      } else {
        setFetchError("Không thể tải dữ liệu. Vui lòng thử lại hoặc kiểm tra kết nối.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchData(user);
    const refreshTimer = setTimeout(() => fetchData(user), 1200);
    return () => clearTimeout(refreshTimer);
  }, [user]);

  useEffect(() => {
    window.localStorage.setItem("filterMonth", filterMonth);
  }, [filterMonth]);

  const statusOptions = [
    "all",
    ...Array.from(new Set(orders.map((order) => order.trangThai).filter(Boolean))),
  ];
  const teamOptions = ["all", ...Array.from(new Set(teams.map((team) => team.name).filter(Boolean)))];
  const forumOptions = ["all", ...Array.from(new Set(forums.map((forum) => forum.name).filter(Boolean)))];

  const filteredOrders = orders.filter((order) => {
    const date = getRowDate(order);
    const ym = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
    const matchesMonth = !filterMonth || ym === filterMonth;
    const matchesStatus = statusFilter === "all" || order.trangThai === statusFilter;
    const matchesTeam = teamFilter === "all" || order.team === teamFilter;
    const matchesForum = forumFilter === "all" || order.forum === forumFilter;
    return matchesMonth && matchesStatus && matchesTeam && matchesForum;
  });

  const totalOrders = filteredOrders.length;
  const totalGiaNhap = filteredOrders.reduce((sum, order) => sum + (Number(order.giaNhap) || 0), 0);
  const totalGiaBan = filteredOrders.reduce((sum, order) => sum + (Number(order.giaBan) || 0), 0);
  const statusCounts = filteredOrders.reduce((acc, order) => {
    const key = order.trangThai || "Không rõ";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const saveOrder = async (data, id) => {
    if (id) {
      await updateDoc(doc(db, "seller_orders", id), { ...data, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, "seller_orders"), { ...data, createdAt: serverTimestamp() });
    }
    setModal(null);
    setTimeout(() => fetchData(user), 600);
  };

  const deleteOrder = async (id) => {
    if (window.confirm("Xác nhận xóa đơn hàng?")) {
      await deleteDoc(doc(db, "seller_orders", id));
      setTimeout(() => fetchData(user), 600);
    }
  };

  const tabs = [
    { id: "dashboard", label: "Tổng Quan", icon: "chart" },
    { id: "orders", label: "Đơn Hàng", icon: "arrow_up" },
    { id: "teams", label: "Teams", icon: "user" },
    { id: "forums", label: "Forums", icon: "wallet" },
  ];

  if (authLoading) return <div className="auth-loading">Đang tải...</div>;
  if (!user) return <LoginScreen />;

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <div className="header-brand">
          <Icon name="wallet" size={22} />
          <span>SELLER TRACKER</span>
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

      {fetchError && <div className="fetch-error">{fetchError}</div>}
      <div className="summary-bar">
        <div className="sum-card blue">
          <div className="sum-label">Tổng đơn</div>
          <div className="sum-value">{totalOrders}</div>
          <div className="sum-sub2">Teams: {teams.length} · Forums: {forums.length}</div>
        </div>
        <div className="sum-card red">
          <div className="sum-label">Tổng giá nhập</div>
          <div className="sum-value">{fmtVND(totalGiaNhap)}</div>
          <div className="sum-sub2">Giá nhập</div>
        </div>
        <div className="sum-card green">
          <div className="sum-label">Tổng giá bán</div>
          <div className="sum-value">{fmtUSD(totalGiaBan)}</div>
          <div className="sum-sub2">Giá bán</div>
        </div>
        <div className="sum-card yellow">
          <div className="sum-label">Pending</div>
          <div className="sum-value">{statusCounts.Pending || 0}</div>
          <div className="sum-sub2">Completed: {statusCounts.Completed || 0}</div>
        </div>
      </div>

      <main className="main">
        {loading && <div className="loading">Đang tải dữ liệu...</div>}

        {tab === "dashboard" && (
          <div className="section">
            <h2 className="section-title">Tổng Quan</h2>
            <div className="stats-grid">
              <StatBox label="Tổng đơn" value={totalOrders} unit="đơn" color="blue" />
              <StatBox label="Tổng giá nhập" value={fmtVND(totalGiaNhap)} unit="" color="red" />
              <StatBox label="Tổng giá bán" value={fmtUSD(totalGiaBan)} unit="" color="green" />
              <StatBox label="Pending" value={statusCounts.Pending || 0} unit="đơn" color="yellow" />
            </div>

            <h2 className="section-title" style={{ marginTop: 32 }}>Trạng thái đơn hàng</h2>
            <table className="data-table">
              <thead>
                <tr><th>Trạng thái</th><th>Số lượng</th></tr>
              </thead>
              <tbody>
                {Object.entries(statusCounts).map(([status, count]) => (
                  <tr key={status}>
                    <td>{status}</td>
                    <td className="num">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "orders" && (
          <div className="section">
            <div className="section-header">
              <h2 className="section-title">Danh Sách Đơn Hàng</h2>
              <button className="btn-add" onClick={() => setModal({ type: "order", data: null })}>
                <Icon name="plus" size={14} /> Thêm đơn
              </button>
            </div>
            <div className="filter-row">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status === "all" ? "Tất cả trạng thái" : status}</option>
                ))}
              </select>
              <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
                {teamOptions.map((team) => (
                  <option key={team} value={team}>{team === "all" ? "Tất cả team" : team}</option>
                ))}
              </select>
              <select value={forumFilter} onChange={(e) => setForumFilter(e.target.value)}>
                {forumOptions.map((forum) => (
                  <option key={forum} value={forum}>{forum === "all" ? "Tất cả forum" : forum}</option>
                ))}
              </select>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Ngày</th><th>ID ĐH</th><th>Giá nhập</th><th>Giá bán</th><th>Team</th><th>Forum</th><th>Link</th><th>Trạng thái</th><th></th></tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{fmtDate(order)}</td>
                    <td>{order.orderId || "-"}</td>
                    <td className="num red-text">{fmtVND(order.giaNhap)}</td>
                    <td className="num green-text">{fmtUSD(order.giaBan)}</td>
                    <td>{order.team || "-"}</td>
                    <td>{order.forum || "-"}</td>
                    <td>{order.link ? <a href={order.link} target="_blank" rel="noreferrer">Link</a> : "-"}</td>
                    <td><span className="badge yellow">{order.trangThai || "-"}</span></td>
                    <td className="actions">
                      <button className="icon-btn" onClick={() => setModal({ type: "order", data: order })}><Icon name="edit" size={13} /></button>
                      <button className="icon-btn danger" onClick={() => deleteOrder(order.id)}><Icon name="trash" size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "teams" && (
          <div className="section">
            <h2 className="section-title">Teams</h2>
            <table className="data-table">
              <thead>
                <tr><th>Tên Team</th><th>Ngày tạo</th></tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id}>
                    <td>{team.name}</td>
                    <td>{team.createdAt ? new Date(team.createdAt).toLocaleDateString("vi-VN") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "forums" && (
          <div className="section">
            <h2 className="section-title">Forums</h2>
            <table className="data-table">
              <thead>
                <tr><th>Tên Forum</th><th>Ngày tạo</th></tr>
              </thead>
              <tbody>
                {forums.map((forum) => (
                  <tr key={forum.id}>
                    <td>{forum.name}</td>
                    <td>{forum.createdAt ? new Date(forum.createdAt).toLocaleDateString("vi-VN") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modal && (
        <Modal
          type={modal.type}
          data={modal.data}
          onClose={() => setModal(null)}
          onSave={saveOrder}
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
  const todayStr = new Date().toISOString().split("T")[0];
  const existingDate = data?.ngay || (data?.createdAt?.toDate ? data.createdAt.toDate().toISOString().split("T")[0] : todayStr);
  const [form, setForm] = useState({
    orderId: data?.orderId || "",
    giaNhap: data?.giaNhap || "",
    giaBan: data?.giaBan || "",
    team: data?.team || "",
    forum: data?.forum || "",
    link: data?.link || "",
    trangThai: data?.trangThai || "Pending",
    ngay: existingDate,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    const payload = {
      ...form,
      giaNhap: parseFloat(String(form.giaNhap).replace(/,/g, "")) || 0,
      giaBan: parseFloat(String(form.giaBan).replace(/,/g, "")) || 0,
    };
    onSave(payload, data?.id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{data ? "Sửa" : "Thêm"} đơn hàng</span>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>
        <div className="modal-body">
          <Field label="Ngày">
            <input type="date" value={form.ngay} onChange={(e) => set("ngay", e.target.value)} />
          </Field>
          <Field label="Mã đơn hàng">
            <input value={form.orderId} onChange={(e) => set("orderId", e.target.value)} placeholder="ID đơn hàng" />
          </Field>
          <Field label="Giá nhập">
            <input type="number" value={form.giaNhap} onChange={(e) => set("giaNhap", e.target.value)} placeholder="0" />
          </Field>
          <Field label="Giá bán">
            <input type="number" value={form.giaBan} onChange={(e) => set("giaBan", e.target.value)} placeholder="0" />
          </Field>
          <Field label="Team">
            <input value={form.team} onChange={(e) => set("team", e.target.value)} placeholder="Team" />
          </Field>
          <Field label="Forum">
            <input value={form.forum} onChange={(e) => set("forum", e.target.value)} placeholder="Forum" />
          </Field>
          <Field label="Link">
            <input value={form.link} onChange={(e) => set("link", e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Trạng thái">
            <select value={form.trangThai} onChange={(e) => set("trangThai", e.target.value)}>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Issue">Issue</option>
            </select>
          </Field>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Hủy</button>
          <button className="btn-save" onClick={handleSave}><Icon name="check" size={14} /> Lưu</button>
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
      const credential = await signInWithEmailAndPassword(auth, email, password);
      if (credential.user.uid !== ADMIN_UID) {
        await signOut(auth);
        setError("Chỉ admin mới được phép đăng nhập bằng Email/Mật khẩu.");
        setLoading(false);
      }
    } catch (e) {
      setError("Email hoặc mật khẩu không đúng");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true); setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const signedUser = result.user;
      if (!WHITELIST_EMAILS.includes(signedUser.email)) {
        await signOut(auth);
        setError("Email chưa được phép truy cập.");
        setLoading(false);
      }
    } catch (e) {
      setError("Đăng nhập Google thất bại");
      setLoading(false);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-box">
        <div className="login-logo">
          <span style={{fontSize:28}}>💰</span>
          <div className="login-title">SELLER TRACKER</div>
          <div className="login-sub">Đăng nhập Google cho seller, Email/Mật khẩu cho admin</div>
        </div>
        <div className="login-fields">
          <button className="btn-login" onClick={handleGoogleLogin} disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập với Google"}
          </button>
          <div className="divider">hoặc</div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
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
