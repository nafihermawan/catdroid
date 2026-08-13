import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLogcatParser,
  extractActivity,
  parseRequest,
  parseResponse,
  stripPrefix,
} from '../server/logcatParser.js';

// ── Contoh baris logcat mentah (format `adb logcat -v time`) ──────────
// Format resmi `-v time`: "MM-DD HH:mm:ss.mmm P/tag(pid): pesan"
// (tanpa kolom PID terpisah — PID hanya ada di dalam "tag(pid)").
const PREFIX = '08-13 10:15:22.123';

const LOGIN_REQUEST_LINE =
  `${PREFIX} I/okhttp.OkHttpClient(23456): --> POST https://api.example.com/login`;
const LOGIN_REQUEST_BODY_LINE =
  `${PREFIX} I/okhttp.OkHttpClient(23456): {"username":"user","password":"secret","device":"Android"}`;
const LOGIN_REQUEST_END_LINE =
  `${PREFIX} I/okhttp.OkHttpClient(23456): --> END POST (73-byte body)`;

const LOGIN_RESPONSE_LINE =
  `${PREFIX} I/okhttp.OkHttpClient(23456): <-- 200 https://api.example.com/login (147ms)`;
const LOGIN_RESPONSE_HEADER_LINE =
  `${PREFIX} I/okhttp.OkHttpClient(23456): content-type: application/json`;
const LOGIN_RESPONSE_BODY_LINE =
  `${PREFIX} I/okhttp.OkHttpClient(23456): {"token":"abc123","user":{"name":"User"}}`;
const LOGIN_RESPONSE_END_LINE =
  `${PREFIX} I/okhttp.OkHttpClient(23456): <-- END HTTP (38-byte body)`;

const ACTIVITY_START_LINE =
  `${PREFIX} I/ActivityTaskManager(567): START u0 {cmp=com.example.myapp/com.example.myapp.screen.MainActivity}`;
const ACTIVITY_DISPLAYED_LINE =
  `${PREFIX} I/ActivityTaskManager(567): Displayed com.example.myapp/com.example.myapp.screen.MainActivity: +852ms`;

const NON_OKHTTP_LINE =
  `${PREFIX} D/eglCodecCommon(23456): setVertexArrayObject: set vao to 1 (0x1) 0 0`;

// helper: jalankan parser pada daftar baris, kumpulkan event
function run(lines, options) {
  const events = [];
  const parser = createLogcatParser({ onEvent: (e) => events.push(e), ...options });
  for (const line of lines) parser.processLine(line);
  return events;
}

test('stripPrefix menghapus prefix logcat', () => {
  assert.equal(
    stripPrefix(LOGIN_REQUEST_LINE),
    '--> POST https://api.example.com/login'
  );
});

test('extractActivity mengenali format START / Displayed / cmp=', () => {
  assert.equal(
    extractActivity(ACTIVITY_START_LINE),
    'com.example.myapp.screen.MainActivity'
  );
  assert.equal(
    extractActivity(ACTIVITY_DISPLAYED_LINE),
    'com.example.myapp.screen.MainActivity'
  );
  // Format "Displayed com.../.ui.HomeActivity"
  assert.equal(extractActivity('Displayed com.example.app/.ui.HomeActivity: +120ms'), '.ui.HomeActivity');
});

test('parseRequest dan parseResponse', () => {
  assert.deepEqual(parseRequest('--> POST https://api.example.com/login'), {
    method: 'POST',
    url: 'https://api.example.com/login',
  });
  assert.deepEqual(parseResponse('<-- 200 https://api.example.com/login (147ms)'), {
    status: 200,
    url: 'https://api.example.com/login',
    durationMs: 147,
  });
  assert.deepEqual(parseResponse('<-- 404 https://api.example.com/missing'), {
    status: 404,
    url: 'https://api.example.com/missing',
    durationMs: null,
  });
});

test('request dengan body: emit request, body (header dibuang), tanpa END body tidak keluar', () => {
  const events = run([
    LOGIN_REQUEST_LINE,
    LOGIN_REQUEST_BODY_LINE,
    LOGIN_REQUEST_END_LINE,
  ]);

  assert.equal(events.length, 2);
  assert.deepEqual(events[0], {
    type: 'request',
    id: 1,
    method: 'POST',
    url: 'https://api.example.com/login',
    message: '--> POST https://api.example.com/login',
  });
  assert.deepEqual(events[1], {
    type: 'body',
    id: 1,
    body: '{"username":"user","password":"secret","device":"Android"}',
  });
});

test('response dengan body: emit response lalu body', () => {
  const events = run([
    LOGIN_RESPONSE_LINE,
    LOGIN_RESPONSE_HEADER_LINE,
    LOGIN_RESPONSE_BODY_LINE,
    LOGIN_RESPONSE_END_LINE,
  ]);

  assert.equal(events.length, 2);
  assert.deepEqual(events[0], {
    type: 'response',
    id: 1,
    status: 200,
    url: 'https://api.example.com/login',
    durationMs: 147,
    message: '<-- 200 https://api.example.com/login (147ms)',
  });
  assert.deepEqual(events[1], {
    type: 'body',
    id: 1,
    body: '{"token":"abc123","user":{"name":"User"}}',
  });
});

test('transisi activity: emit event activity hanya saat nama berubah (dengan short name)', () => {
  // baris activity sebelum request — nama activity berubah dari null
  const events = run([
    ACTIVITY_START_LINE,
    LOGIN_REQUEST_LINE,
    LOGIN_REQUEST_END_LINE,
    ACTIVITY_DISPLAYED_LINE, // nama activity SAMA — tidak emit activity lagi
  ]);

  assert.equal(events.filter((e) => e.type === 'activity').length, 1);
  assert.deepEqual(
    events.find((e) => e.type === 'activity'),
    { type: 'activity', name: 'MainActivity' }
  );
});

test('baris non-OkHttp dan non-activity di-skip', () => {
  const events = run([NON_OKHTTP_LINE, '08-13 10:15:22.999 456 I/System.out(111): hello']);
  assert.equal(events.length, 0);
});

test('request tanpa body (END langsung) tidak emit body', () => {
  const events = run([
    LOGIN_REQUEST_LINE,
    `${PREFIX} I/okhttp.OkHttpClient(23456): --> END POST (0-byte body)`,
  ]);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'request');
});

test('body multi-baris digabung jadi satu baris (minified)', () => {
  const events = run([
    LOGIN_REQUEST_LINE,
    `${PREFIX} I/okhttp.OkHttpClient(23456): {"user": {`,
    `${PREFIX} I/okhttp.OkHttpClient(23456): "name": "Nafi"`,
    `${PREFIX} I/okhttp.OkHttpClient(23456): }}`,
    LOGIN_REQUEST_END_LINE,
  ]);
  assert.equal(events[1].type, 'body');
  assert.equal(events[1].body, '{"user": { "name": "Nafi" }}');
});
