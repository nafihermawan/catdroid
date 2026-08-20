# Integrasi CatDroid dengan Aplikasi Android Lain

Panduan agar traffic OkHttp dari **aplikasi Android lain** (app milikmu, bukan hanya
`com.example.myapp`) bisa tampil di CatDroid.

## Cara kerja singkat (penting dibaca dulu)

CatDroid **bukan proxy dan tidak menyadap jaringan**. Dia membaca log yang **ditulis
OkHttp sendiri** ke logcat melalui `HttpLoggingInterceptor`, lalu mem-parsing-nya.

Artinya, app target wajib memenuhi **3 syarat**:

1. Memakai **OkHttp** sebagai HTTP client (langsung atau lewat Retrofit).
2. Memasang **`HttpLoggingInterceptor`** dengan **tag logger bawaan**
   (`okhttp.OkHttpClient`) — CatDroid hanya memproses baris yang mengandung string ini.
3. Set level ke **`BODY`** kalau mau melihat isi body request/response.

---

## 1. Integrasi di app target

### Tambah dependency

`build.gradle.kts` (module `app`):

```kotlin
implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
```

Versi harus sama/mendekati versi OkHttp yang dipakai app (biasanya sudah ikut
transitif via Retrofit). Kotlin/Java:

```kotlin
// Kotlin
val logging = HttpLoggingInterceptor().apply {
    level = HttpLoggingInterceptor.Level.BODY
}
val client = OkHttpClient.Builder()
    .addInterceptor(logging)
    .build()
```

```java
// Java
HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
logging.setLevel(HttpLoggingInterceptor.Level.BODY);
OkHttpClient client = new OkHttpClient.Builder()
        .addInterceptor(logging)
        .build();
```

### Kalau app pakai Retrofit

Tinggal pakai `client` yang sama:

```kotlin
val retrofit = Retrofit.Builder()
    .baseUrl("https://api.target.com/")
    .client(client)
    .build()
```

### Level `HttpLoggingInterceptor` — yang didukung CatDroid

| Level    | yang muncul di CatDroid                                  |
| -------- | -------------------------------------------------------- |
| `BASIC`  | method, URL, status, durasi — **tanpa body**             |
| `HEADERS`| seperti BASIC + header (header tetap dibuang CatDroid)   |
| `BODY`   | seperti HEADERS + body request/response — **rekomendasi**|

### ⚠️ Jangan ganti tag logger

CatDroid memfilter baris yang mengandung `okhttp.OkHttpClient` (lihat
`server/logcatParser.js`). Jangan memakai `setLogger { }` dengan tag lain, karena
traffic app tersebut tidak akan terdeteksi sama sekali.

---

## 2. Konfigurasi CatDroid untuk app tersebut

Salin `.env.example` ke `.env` lalu sesuaikan:

```bash
cp .env.example .env
```

```env
# Package app target — untuk grouping per activity
ANDROID_APP_PACKAGE=com.target.app

# Keyword URL yang ditampilkan (bisa lebih dari satu, dipisah koma)
URL_FILTER_KEYWORDS=api.target.com
```

- `ANDROID_APP_PACKAGE` dipakai CatDroid untuk menampilkan separator
  `## NamaActivity` hanya untuk activity milik package ini.
- `URL_FILTER_KEYWORDS` menjadi default kolom filter; tetap bisa diubah dari UI
  tanpa restart server. Kosongkan untuk menampilkan semua traffic.

---

## 3. Verifikasi cepat (sebelum buka CatDroid)

Pastikan app benar-benar menulis log OkHttp ke logcat:

```bash
adb logcat -s okhttp.OkHttpClient
```

Pakai app tersebut (buka halaman yang memanggil API). Kalau muncul baris seperti:

```
--> POST https://api.target.com/v1/login
<-- 200 https://api.target.com/v1/login (437ms)
```

berarti siap. Kalau tidak muncul sama sekali, lanjut ke [Troubleshooting](#6-troubleshooting-khusus-app).

---

## 4. Alur pakai

1. Pastikan device/emulator terhubung: `adb devices` → status `device`.
2. Jalankan CatDroid: `npm install && npm run dev`, buka http://localhost:5173.
3. Klik **Start** (buffer logcat dibersihkan otomatis).
4. Di device, buka halaman app yang melakukan request API.
5. Traffic OkHttp tampil real-time; klik log untuk lihat Request/Response Body.
6. Selesai: **Stop**, lalu **Export** kalau ingin menyimpan ke file `.log`.

---

## 5. Contoh skenario

| App target            | `ANDROID_APP_PACKAGE`  | `URL_FILTER_KEYWORDS`    |
| --------------------- | ---------------------- | ------------------------ |
| E-commerce (tokokita) | `com.tokokita.app`     | `api.tokokita.com`       |
| Aplikasi internal QA  | `com.company.internal` | `10.10.0.2:5000, api.company.com` |
| App mock server lokal  | `com.example.mockapp`  | `localhost:8080`         |

---

## 6. Troubleshooting khusus app

- **Tidak ada traffic sama sekali** — cek `adb logcat -s okhttp.OkHttpClient`.
  Kalau baris `--> ...` tidak muncul, app tidak memakai OkHttp, interceptor tidak
  terpasang, atau tag logger diganti.
- **Traffic tampil tapi body kosong** — level interceptor masih `BASIC`/`HEADERS`;
  ganti ke `BODY`.
- **Berfungsi di build debug tapi hilang di release** — R8/ProGuard/minify biasanya
  membuang log. Solusi: pasang interceptor hanya di `buildType` debug, atau tambah
  keep rule:
  ```proguard
  -keep class okhttp3.logging.HttpLoggingInterceptor { *; }
  ```
  Banyak app juga memanggil `HttpLoggingInterceptor` hanya saat `BuildConfig.DEBUG`.
  Untuk sesi testing CatDroid, cukup gunakan **build debug**.
- **App memakai library non-OkHttp** (Volley, Ktor, `HttpURLConnection`, Retrofit
  tanpa interceptor logging) — tidak akan terlihat; CatDroid hanya membaca log OkHttp.
- **Lebih dari satu device terhubung** — `adb logcat` gagal; cabut device lain atau
  atur `ADB_PATH` menunjuk adb yang sesuai.
