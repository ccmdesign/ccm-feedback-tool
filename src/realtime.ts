/**
 * Minimal Supabase Realtime client — subscribes to postgres_changes for a
 * single project_name filter on ccm_widget_annotations. Hand-rolled over the
 * native WebSocket API to avoid pulling in @supabase/supabase-js.
 *
 * Wire format reference: https://supabase.com/docs/guides/realtime/protocol
 */

interface RealtimeOptions {
  url: string;
  apiKey: string;
  table: string;
  schema?: string;
  filter: string;
  onInsert: (row: Record<string, unknown>) => void;
  onUpdate: (row: Record<string, unknown>) => void;
  onDelete: (row: Record<string, unknown>) => void;
  log?: (...args: unknown[]) => void;
}

const HEARTBEAT_MS = 25_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private destroyed = false;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempt = 0;
  private refCounter = 1;
  private readonly topic: string;
  private readonly log: (...args: unknown[]) => void;

  constructor(private readonly opts: RealtimeOptions) {
    this.topic = `realtime:${opts.schema ?? "public"}:${opts.table}`;
    this.log = opts.log ?? (() => {});
  }

  connect(): void {
    if (this.destroyed) return;
    const wsUrl = `${this.opts.url.replace(/^http/, "ws").replace(/\/$/, "")}/realtime/v1/websocket?apikey=${encodeURIComponent(this.opts.apiKey)}&vsn=1.0.0`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      this.log("realtime ws constructor error", err);
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.addEventListener("open", () => {
      this.reconnectAttempt = 0;
      this.send({
        topic: this.topic,
        event: "phx_join",
        payload: {
          config: {
            postgres_changes: [
              {
                event: "*",
                schema: this.opts.schema ?? "public",
                table: this.opts.table,
                filter: this.opts.filter,
              },
            ],
          },
          access_token: this.opts.apiKey,
        },
        ref: String(this.refCounter++),
      });
      this.heartbeat = setInterval(() => {
        this.send({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(this.refCounter++) });
      }, HEARTBEAT_MS);
      this.log("realtime connected");
    });

    ws.addEventListener("message", (e) => this.handleMessage(e.data));

    ws.addEventListener("close", () => {
      this.cleanupSocket();
      if (!this.destroyed) this.scheduleReconnect();
    });

    ws.addEventListener("error", (err) => {
      this.log("realtime ws error", err);
    });
  }

  private cleanupSocket(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
    this.ws = null;
  }

  private scheduleReconnect(): void {
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempt, RECONNECT_MAX_MS);
    this.reconnectAttempt += 1;
    setTimeout(() => {
      if (!this.destroyed) this.connect();
    }, delay);
  }

  private send(msg: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(msg));
    } catch (err) {
      this.log("realtime send error", err);
    }
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== "string") return;
    let msg: { event?: string; payload?: Record<string, unknown> };
    try {
      msg = JSON.parse(raw) as typeof msg;
    } catch {
      return;
    }
    if (msg.event !== "postgres_changes") return;
    const payload = msg.payload as { data?: Record<string, unknown> } | undefined;
    const data = payload?.data;
    if (!data) return;
    const type = data.type as string | undefined;
    const record = (data.record ?? data.old_record) as Record<string, unknown> | undefined;
    if (!record) return;
    if (type === "INSERT") this.opts.onInsert(record);
    else if (type === "UPDATE") this.opts.onUpdate(record);
    else if (type === "DELETE") this.opts.onDelete(record);
  }

  destroy(): void {
    this.destroyed = true;
    this.cleanupSocket();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }
  }
}
