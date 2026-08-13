import { spawn, execFile } from 'child_process';
import readline from 'readline';

// ── Konfigurasi default (bisa di-override via constructor/env) ────────
const DEFAULT_ADB_PATH = 'adb';
const DEFAULT_APP_PACKAGE =
  process.env.ANDROID_APP_PACKAGE || 'com.example.myapp';

// Strip prefix logcat "MM-DD HH:mm:ss.mmm I/tag(pid):" → sisa pesan.
// Format `-v time`: "08-11 15:45:10.990 I/okhttp.OkHttpClient(16720): pesan"
export function stripPrefix(line) {
  return line.replace(/^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} \w?\/[^(]+\(\d+\): /, '');
}

// Ambil nama activity dari baris log transisi (beberapa format umum).
//   Displayed com.example.myapp/.ui.LoginActivity: +1s234ms
//   START u0 {cmp=com.example.myapp/.screen.MainActivity}
//   Displayed com.../.ui.HomeActivity
export function extractActivity(line) {
  const m =
    line.match(/Displayed\s+[^/]+\/([^:\s{]+)/) ||
    line.match(/cmp=[^/]+\/([^\s}]+)/) ||
    line.match(/START\s+[^/]+\/([^\s{]+)/);
  return m ? m[1] : null;
}

// Parse baris request OkHttp: "--> POST https://api..." → { method, url }
export function parseRequest(msg) {
  const m = msg.match(/^--> (\w+)\s+(.+)$/);
  return m ? { method: m[1], url: m[2] } : { method: null, url: null };
}

// Parse baris response OkHttp: "<-- 200 https://api... (47ms)" → { status, url, durationMs }
export function parseResponse(msg) {
  const m = msg.match(/^<-- (\d{3})\s+(.+?)\s+\((\d+)ms\)$/) || msg.match(/^<-- (\d{3})\s+(.+)$/);
  return m
    ? { status: Number(m[1]), url: m[2], durationMs: m[3] ? Number(m[3]) : null }
    : { status: null, url: null, durationMs: null };
}

// State machine per baris logcat — logika disalin dari
// test/helpers/logcatHelper.js (project WebdriverIO), tapi mengirim
// objek terstruktur ke callback onEvent, bukan menulis string ke file.
export function createLogcatParser({
  adbPath = DEFAULT_ADB_PATH,
  appPackage = DEFAULT_APP_PACKAGE,
  onEvent = () => {},
} = {}) {
  let proc = null;
  let lineReader = null;
  let manualStop = false;

  // State antar baris (sama persis dengan helper asli)
  let collectingBody = false;
  let bodyBuffer = [];
  let currentActivity = null;
  // Id exchange untuk memasangkan body request/response dengan barisnya.
  let exchangeId = 0;

  const emit = (event) => onEvent(event);

  // Ambil nama activity dari baris transisi; emit separator saat berubah.
  function noteActivity(line) {
    if (!line.includes('ActivityTaskManager') && !line.includes('ActivityManager')) return;
    if (!line.includes(appPackage)) return;
    const name = extractActivity(line);
    if (!name) return;
    if (name !== currentActivity) {
      currentActivity = name;
      // Nama pendek: bagian setelah titik terakhir (mis. SPNLoginActivity)
      emit({ type: 'activity', name: name.split('.').pop() });
    }
  }

  // Emit body terkumpul sebagai SATU baris (JSON minified), lalu reset.
  function flushBody() {
    if (bodyBuffer.length > 0) {
      const raw = bodyBuffer.join(' ').replace(/\s+/g, ' ').trim();
      emit({ type: 'body', id: exchangeId, body: raw });
    }
    bodyBuffer = [];
  }

  // Proses satu baris mentah dari stream `adb logcat -v time`.
  function processLine(line) {
    if (!line) return;

    // Pantau perpindahan activity (untuk grouping per halaman)
    noteActivity(line);

    // Baris dari log lain (bukan OkHttp) — lewati
    if (!line.includes('okhttp.OkHttpClient')) return;

    const msg = stripPrefix(line);

    // Penanda akhir request/response OkHttp: "--> END POST (47-byte body)"
    // atau "<-- END HTTP (3285-byte body)". Flush body & tutup fase.
    if (msg.includes('--> END') || msg.includes('<-- END')) {
      collectingBody = false;
      flushBody();
      return;
    }

    // Request baru: "--> METHOD url" — mulai fase body (request)
    if (msg.startsWith('--> ')) {
      collectingBody = true;
      exchangeId += 1;
      const { method, url } = parseRequest(msg);
      emit({ type: 'request', id: exchangeId, method, url, message: msg });
      return;
    }

    // Ringkasan response: "<-- STATUS url (durasi ms)" — mulai fase body (response)
    if (msg.startsWith('<-- ')) {
      collectingBody = true;
      // Kalau response datang tanpa request aktif (mis. cache / stream parsing
      // terlewat), naikkan id supaya body punya pasangan exchange.
      if (exchangeId === 0) exchangeId = 1;
      const { status, url, durationMs } = parseResponse(msg);
      emit({ type: 'response', id: exchangeId, status, url, durationMs, message: msg });
      return;
    }

    // Saat collectingBody, kumpulkan baris body — buang header HTTP
    if (collectingBody) {
      // Header HTTP: "name: value" — skip
      if (/^[a-zA-Z-]+: /.test(msg)) return;
      bodyBuffer.push(msg.trim());
    }
  }

  function runCmd(cmd, args) {
    return new Promise((resolve, reject) => {
      execFile(cmd, args, { timeout: 10000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr.trim() || err.message));
        else resolve(stdout);
      });
    });
  }

  // Cek adb & device sebelum capture. Throw error dengan pesan jelas.
  async function checkAdb() {
    try {
      await runCmd(adbPath, ['version']);
    } catch (_) {
      throw new Error(
        `adb tidak ditemukan (path: "${adbPath}"). Install Android platform-tools ` +
          `atau set env ADB_PATH, lalu restart server.`
      );
    }

    const out = await runCmd(adbPath, ['devices']);
    const devices = out
      .split('\n')
      .slice(1)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.split(/\s+/));

    const authorized = devices.filter(([, state]) => state === 'device');
    const pending = devices.filter(([, state]) => state === 'unauthorized');
    if (authorized.length === 0) {
      if (pending.length > 0) {
        throw new Error(
          'Device Android terdeteksi tapi status "unauthorized". ' +
            'Periksa dialog konfirmasi USB debugging di perangkat, atau revoke & ulangi.'
        );
      }
      throw new Error(
        'Tidak ada device Android terhubung. Nyalakan emulator atau sambungkan ' +
          'perangkat dengan USB debugging aktif, lalu coba Start lagi.'
      );
    }
  }

  async function start() {
    if (proc) return { ok: true, alreadyRunning: true };

    await checkAdb();

    // Bersihkan buffer logcat device dulu — supaya stream (live) tidak mulai
    // dari log lama yang sudah ada di buffer.
    try {
      await runCmd(adbPath, ['logcat', '-c']);
    } catch (_) {
      // abaikan — device mungkin baru saja disconnect
    }

    manualStop = false;
    collectingBody = false;
    bodyBuffer = [];
    currentActivity = null;
    exchangeId = 0;

    proc = spawn(adbPath, ['logcat', '-v', 'time'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderrChunks = [];
    proc.stderr.on('data', (d) => {
      stderrChunks.push(d.toString());
    });

    proc.on('error', (err) => {
      proc = null;
      emit({
        type: 'error',
        message: `Gagal menjalankan adb: ${err.message}`,
      });
    });

    proc.on('close', (code) => {
      if (!manualStop) {
        const stderr = stderrChunks.join('').trim();
        if (/no devices|device .* not found|not found/i.test(stderr)) {
          emit({
            type: 'error',
            message:
              'Koneksi adb terputus (device tidak terdeteksi lagi). ' +
              'Periksa kabel/emulator lalu Start ulang.',
          });
        } else {
          emit({ type: 'status', message: `logcat berhenti (exit code ${code})` });
        }
      }
      proc = null;
      emit({ type: 'stopped' });
    });

    lineReader = readline.createInterface({
      input: proc.stdout,
      crlfDelay: Infinity,
    });
    lineReader.on('line', processLine);

    emit({ type: 'status', message: 'Capture dimulai — streaming logcat…' });
    return { ok: true };
  }

  function stop() {
    if (proc) {
      manualStop = true;
      proc.kill();
      if (lineReader) lineReader.close();
    }
    proc = null;
    lineReader = null;
    emit({ type: 'status', message: 'Capture dihentikan.' });
    emit({ type: 'stopped' });
  }

  return {
    processLine,
    start,
    stop,
    get running() {
      return proc !== null;
    },
  };
}
