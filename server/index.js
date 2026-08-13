import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { createLogcatParser } from './logcatParser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3001;
const ADB_PATH = process.env.ADB_PATH || 'adb';
const APP_PACKAGE =
  process.env.ANDROID_APP_PACKAGE || 'id.spn.soulparkingofficer.dev';

const app = express();
app.use(express.json());

const server = http.createServer(app);

// ── WebSocket: stream event logcat ke semua client yang terhubung ────
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(event) {
  const data = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(data);
  }
}

const parser = createLogcatParser({
  adbPath: ADB_PATH,
  appPackage: APP_PACKAGE,
  onEvent: broadcast,
});

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'status', message: 'Terhubung ke server logcat.' }));
  if (parser.running) {
    ws.send(JSON.stringify({ type: 'running', running: true }));
  }
});

// ── REST: config & kontrol capture ────────────────────────────────────
app.get('/api/config', (_req, res) => {
  res.json({ adbPath: ADB_PATH, appPackage: APP_PACKAGE });
});

app.post('/api/start', async (_req, res) => {
  if (parser.running) return res.json({ ok: true, running: true });
  try {
    await parser.start();
    broadcast({ type: 'running', running: true });
    res.json({ ok: true, running: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/stop', (_req, res) => {
  parser.stop();
  broadcast({ type: 'running', running: false });
  res.json({ ok: true, running: false });
});

// ── Serve frontend build (production) ─────────────────────────────────
const distDir = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`CatDroid server running on http://localhost:${PORT}`);
  console.log(`  adb path   : ${ADB_PATH}`);
  console.log(`  app package: ${APP_PACKAGE}`);
});
