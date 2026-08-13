# CatDroid — OkHttp Traffic Viewer

Aplikasi web standalone untuk melihat logcat Android secara **real-time** dari browser,
fokus pada traffic OkHttp (request/response API) dengan grouping per activity — versi web
dari helper `test/helpers/logcatHelper.js` di project WebdriverIO.

## Fitur

- **Start/Stop capture** — bersihkan buffer device (`adb logcat -c`) lalu spawn
  `adb logcat -v time`, stream per-baris ke browser via WebSocket.
- **Tampilan real-time** — request, response, dan body muncul tanpa refresh; auto-scroll
  bisa di-toggle.
- **Filter keyword URL** — hanya baris yang mengandung keyword (mis. `10.10.0.2:5000`,
  `devapi.soulparking.co.id`) yang ditampilkan. Keyword **bisa diubah dari UI**.
- **Grouping per activity** — separator `## NamaActivity` muncul saat activity berubah.
- **Parsing OkHttp** — request (`--> METHOD url`), body request, response
  (`<-- STATUS url (durasi ms)`), dan body response. Header HTTP dibuang.
  Detail body tampil di panel samping (JSON prettified + syntax highlight + copy).
- **Export** — download hasil sebagai file `.log`.
- **Clear log** — kosongkan tampilan.

## Struktur

```
catdroid/
├── server/          # Express + WebSocket + logcat parser
│   ├── index.js
│   └── logcatParser.js
├── src/             # React frontend
│   ├── App.tsx
│   ├── components/  # LogViewer, FilterBar, DetailPanel
│   └── hooks/       # useLogcatStream
├── test/            # unit test logcatParser
├── package.json
└── README.md
```

## Prasyarat

1. **Node.js 18+** (tested dengan Node 20/22).
2. **Android platform-tools (adb)** — pastikan `adb` ada di PATH:
   ```bash
   adb version
   ```
   macOS: `brew install --cask android-platform-tools`
   Windows/Linux: unduh dari
   <https://developer.android.com/tools/releases/platform-tools> dan tambahkan ke PATH.
3. **Perangkat/emulator**:
   - **Emulator**: cukup jalankan AVD.
   - **Device fisik**: aktifkan **Developer options → USB debugging**, sambungkan kabel,
     dan konfirmasi dialog RSA di perangkat (`adb devices` harus menunjukkan `device`,
     bukan `unauthorized`).

## Cara menjalankan

```bash
cd catdroid
npm install
npm run dev
```

- Frontend Vite: **http://localhost:5173**
- Backend Express: **http://localhost:3001** (WS di `/ws`)

Klik **Start** di UI, buka halaman di app, dan traffic OkHttp akan tampil
dengan grouping per activity.

> Dev mode memakai Vite proxy — browser cukup membuka port 5173 saja.
> Semua request `/api` dan WebSocket `/ws` diteruskan otomatis ke backend.

## Cara pakai

### Alur umum (setiap sesi)

1. Pastikan device/emulator terhubung: `adb devices` → status `device`.
2. Buka http://localhost:5173.
3. Klik **Start** — buffer logcat device dibersihkan dulu (`adb logcat -c`),
   lalu streaming dimulai.
4. Buka / gunakan aplikasi di device — request & response OkHttp langsung
   muncul di daftar.
5. Klik salah satu log untuk lihat detail **Request Body** / **Response Body**
   (JSON prettified, tombol copy di pojok kanan atas code block).
6. Selesai: klik **Stop**, lalu **Export** untuk menyimpan hasil ke file `.log`,
   atau **Clear** untuk mengosongkan tampilan.

### Pakai dengan aplikasi lain (bukan SoulParking)

CatDroid menangkap traffic dari **aplikasi apa pun yang memakai OkHttp** —
yang perlu diganti cuma konfigurasi:

1. **App package** untuk grouping activity — set env saat start:
   ```bash
   ANDROID_APP_PACKAGE=com.example.myapp npm run dev
   ```
   (atau ubah default di `server/index.js`). Grouping `## Activity` hanya
   muncul untuk activity milik package ini.
2. **Filter URL** — ganti di kolom **Server / URL Filter** di UI dengan
   domain API aplikasi tersebut, mis. `api.myapp.com`. Bisa lebih dari satu,
   dipisah koma. Kosongkan untuk menampilkan semua traffic.
3. **Device dengan adb** — kalau pakai lebih dari satu device, `adb logcat`
   akan gagal; pastikan hanya satu device terhubung (atau atur `ADB_PATH`
   menunjuk adb tertentu).

> **Syarat penting:** aplikasi target **harus memakai OkHttp dengan logging
> aktif** — baris log `okhttp.OkHttpClient` harus muncul di logcat. Kalau app
> pakai library lain (mis. Retrofit tanpa interceptor logging, atau library
> networking non-OkHttp), traffic tidak akan terlihat. Untuk app berbasis
> Retrofit, pastikan ada `HttpLoggingInterceptor` level BASIC/HEADERS/BODY.

## Produksi

```bash
npm run build
npm start        # serve dist + API di http://localhost:3001
```

## Konfigurasi (env)

| Variable              | Default                          | Keterangan                                  |
| --------------------- | -------------------------------- | ------------------------------------------- |
| `ANDROID_APP_PACKAGE` | `id.spn.soulparkingofficer.dev`  | Package app untuk grouping activity         |
| `ADB_PATH`            | `adb`                            | Path biner adb (mis. `/opt/homebrew/bin/adb`) |
| `PORT`                | `3001`                           | Port server backend                         |

Keyword filter URL default di UI: `10.10.0.2:5000, devapi.soulparking.co.id`
— ubah langsung di kolom filter pada halaman.

## Test

```bash
npm test          # unit test logcatParser (node --test)
npm run typecheck # typecheck frontend
```

Unit test mencakup: request dengan body, response dengan body, transisi activity,
baris non-OkHttp yang harus di-skip, body multi-baris.

## Troubleshooting

- **"adb tidak ditemukan"** — install platform-tools atau set `ADB_PATH`.
- **"Tidak ada device Android terhubung"** — cek `adb devices`; nyalakan emulator
  atau sambungkan device dengan USB debugging.
- **"unauthorized"** — konfirmasi dialog USB debugging di perangkat, atau
  `adb kill-server && adb start-server` lalu ulangi.
- **Traffic tidak muncul** — pastikan app benar-benar memakai OkHttp dan log
  `okhttp.OkHttpClient` aktif (beberapa app mematikan logging di build release),
  dan keyword filter sesuai domain yang dipakai.
