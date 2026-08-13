# 🐱 Card Task — CatDroid

## Title

**CatDroid — Real-time Android OkHttp Traffic Viewer (Web)**

Versi web dari helper `logcatHelper.js` (project WebdriverIO) untuk melihat traffic
request/response API OkHttp dari logcat Android secara real-time di browser, dengan
gaya UI ala Chrome/Firefox DevTools Network.

## Goal

Membangun aplikasi web standalone (single-user, single-device) yang memungkinkan
developer Android melihat **semua request/response API OkHttp** dari aplikasi
secara real-time di browser — lengkap dengan grouping per activity/halaman,
filter URL yang bisa diubah, dan detail body request/response — tanpa perlu
membuka logcat mentah atau Android Studio.

**Kriteria sukses:**
- Backend berhasil spawn `adb logcat -v time` dan streaming per-baris ke browser via WebSocket.
- Frontend menampilkan log real-time: method, status (warna semantik), durasi, URL.
- Detail request/response body tampil menyamping dengan syntax highlight JSON + tombol copy.
- Grouping `## Activity` saat perpindahan halaman.
- Filter keyword URL dapat diubah dari UI (default: `10.10.0.2:5000`, `devapi.soulparking.co.id`).
- Error handling jelas untuk: adb tidak terpasang, device tidak terdeteksi, status unauthorized.
- Mobile-first responsive; desktop dua kolom (list kiri, detail kanan).

## Details

### Latar belakang

Helper asli menulis hasil parse ke file teks (`logcat.log`). Pekerjaan ini
mengubahnya menjadi aplikasi web real-time: state machine parser disalin dari
helper asli (stripPrefix, extractActivity, collectingBody/bodyBuffer) tetapi
mengirim objek terstruktur ke frontend.

### Stack

| Lapisan | Teknologi |
| --- | --- |
| Backend | Node.js + Express + `ws` (WebSocket) |
| Parser | State machine tiruan `logcatHelper.js`, `adb logcat -v time` |
| Frontend | Vite + React + TypeScript + Tailwind CSS |
| Test | `node --test` (unit test parser) |

### Fitur

- **Start/Stop capture** — `adb logcat -c` lalu spawn `adb logcat -v time`.
- **Real-time stream** — event via WebSocket, auto-scroll toggle.
- **Filter URL** — keyword editable dari UI.
- **Grouping per activity** — separator `## NamaActivity`.
- **Parsing OkHttp** — request/response/body, header HTTP dibuang.
- **Detail panel** — Request Body & Response Body, JSON prettified, syntax highlight, copy.
- **Export .log** & **Clear log**.

### Struktur

```
catdroid/
├── server/            # Express + WebSocket + parser (index.js, logcatParser.js)
├── src/               # React frontend
│   ├── App.tsx
│   ├── components/    # LogViewer, DetailPanel, FilterBar, badges
│   ├── hooks/         # useLogcatStream
│   └── utils/         # format.ts (JSON highlight)
├── test/              # unit test logcatParser
├── postcss.config.js  # Tailwind (penting — tanpa ini styling tidak ter-proses)
├── package.json
└── README.md
```

### Status

- [x] Backend: spawn adb, clear buffer, stream per-baris via WebSocket
- [x] Parser state machine (request/response/body/activity)
- [x] Unit test parser (9 test pass)
- [x] Frontend: log list + detail panel (DevTools-style, accent biru)
- [x] Filter keyword editable via UI
- [x] Export & Clear
- [x] Tailwind styling aktif (postcss.config.js)
- [ ] Validasi end-to-end dengan device/emulator nyata
