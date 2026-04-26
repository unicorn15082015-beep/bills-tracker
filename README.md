# 💰 Bills Tracker

Ứng dụng theo dõi quỹ nội bộ — React + Firebase Firestore, deploy GitHub Pages.

---

## 📋 Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| **Tổng Quan** | Tổng Chi / Tổng Nhập / Số tiền còn lại (VND + USD quy đổi) |
| **Chi** | Thêm/sửa/xóa giao dịch chi, hỗ trợ VND và USD |
| **Nhập Quỹ** | Ghi nhận tiền nhập từng người chuyển |
| **Nhân Viên** | Thống kê từng nhân viên: số acc, tổng chi VND, tổng chi USD |
| **Realtime** | Dữ liệu đồng bộ realtime qua Firebase Firestore |

---

## 🚀 Cài đặt nhanh

### Bước 1 — Tạo Firebase project

1. Vào [Firebase Console](https://console.firebase.google.com)
2. **Create project** → đặt tên (vd: `bills-tracker`)
3. **Build → Firestore Database** → Create database → Start in test mode
4. **Project Settings** → **Your apps** → **Web app** → Copy config

### Bước 2 — Tạo file `.env`

```bash
cp .env.example .env
```

Mở `.env` và điền thông tin Firebase:

```
REACT_APP_FIREBASE_API_KEY=AIza...
REACT_APP_FIREBASE_AUTH_DOMAIN=bills-tracker.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=bills-tracker
REACT_APP_FIREBASE_STORAGE_BUCKET=bills-tracker.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Bước 3 — Chạy local

```bash
npm install
npm start
```

Mở http://localhost:3000

---

## 🌐 Deploy lên GitHub Pages

### Bước 1 — Tạo repo GitHub

```bash
git init
git add .
git commit -m "init: bills tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bills-tracker.git
git push -u origin main
```

### Bước 2 — Thêm Secrets vào GitHub

Vào **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

Thêm từng secret:
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`

### Bước 3 — Bật GitHub Pages

Vào **Settings → Pages → Source → GitHub Actions**

### Bước 4 — Deploy

Push code lên `main` là tự động deploy:

```bash
git push origin main
```

Link app: `https://YOUR_USERNAME.github.io/bills-tracker`

---

## 🗄️ Cấu trúc dữ liệu Firestore

### Collection `chi` (giao dịch chi)

```json
{
  "account": "lord 35",
  "soTien": 2100000,
  "currency": "VND",
  "nguoiMua": "H.Hiếu",
  "ghiChu": "",
  "cancelled": false,
  "createdAt": "Timestamp"
}
```

### Collection `nhan` (nhập quỹ)

```json
{
  "soTien": 20000000,
  "currency": "VND",
  "nguoiChuyen": "A2 Chuyển",
  "ghiChu": "",
  "createdAt": "Timestamp"
}
```

---

## 📁 Cấu trúc thư mục

```
bills-tracker/
├── .github/
│   └── workflows/
│       └── deploy.yml        ← GitHub Actions auto-deploy
├── public/
│   └── index.html
├── src/
│   ├── App.js                ← Component chính
│   ├── firebase.js           ← Firebase config
│   ├── index.js
│   └── styles/
│       └── main.css
├── .env.example              ← Template env (copy → .env)
├── .gitignore
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
└── package.json
```

---

## ⚙️ Tỷ giá USD

Tỷ giá USD mặc định là **25,400 VND/USD**.  
Để thay đổi, sửa dòng này trong `src/App.js`:

```js
const USD_RATE = 25400;
```

---

## 🔒 Bảo mật (production)

Sau khi ổn định, cập nhật `firestore.rules` để yêu cầu đăng nhập:

```js
allow read, write: if request.auth != null;
```

Và bật Firebase Authentication trong console.
