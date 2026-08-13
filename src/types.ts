// Tipe event yang dikirim server → frontend via WebSocket.
export type ServerEvent =
  | { type: 'activity'; name: string }
  | { type: 'request'; id: number; method: string | null; url: string | null; message: string }
  | {
      type: 'response';
      id: number;
      status: number | null;
      url: string | null;
      durationMs: number | null;
      message: string;
    }
  | { type: 'body'; id: number; body: string }
  | { type: 'status'; message: string }
  | { type: 'error'; message: string }
  | { type: 'running'; running: boolean }
  | { type: 'stopped' };

export interface LogEntry {
  /** Monotonic id unik per entry (untuk React key). */
  seq: number;
  type: 'activity' | 'request' | 'response' | 'body' | 'status' | 'error';
  /** Id exchange: memasangkan request/response dengan body-nya. */
  exchangeId?: number;
  name?: string;
  method?: string | null;
  url?: string | null;
  status?: number | null;
  durationMs?: number | null;
  body?: string;
  message?: string;
  timestamp: number;
}

/** Data ringkas untuk panel detail (samping) — hasil agregasi per exchange. */
export interface ExchangeDetail {
  id: number;
  method: string | null;
  url: string | null;
  status: number | null;
  durationMs: number | null;
  /** Sumber: activity terakhir sebelum exchange ini. */
  activity: string | null;
  requestBody: string | null;
  responseBody: string | null;
}
