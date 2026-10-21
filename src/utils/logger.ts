const ts = () => new Date().toISOString().replace("T", " ").substring(0, 19);

export interface LogEntry {
  type: "step" | "info" | "warn" | "error";
  msg: string;
  step?: number;
  total?: number;
  timestamp: string;
}

type LogListener = (entry: LogEntry) => void;
const listeners: Set<LogListener> = new Set();

export function addLogListener(listener: LogListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function broadcast(entry: LogEntry) {
  for (const listener of listeners) {
    try {
      listener(entry);
    } catch {
      // ignore listener errors
    }
  }
}

export const log = {
  step: (n: number, total: number, msg: string) => {
    const time = ts();
    console.log(`[${time}] [${n}/${total}] ${msg}`);
    broadcast({ type: "step", msg, step: n, total, timestamp: time });
  },
  info: (msg: string) => {
    const time = ts();
    console.log(`[${time}] ${msg}`);
    broadcast({ type: "info", msg, timestamp: time });
  },
  warn: (msg: string) => {
    const time = ts();
    console.warn(`[${time}] WARN ${msg}`);
    broadcast({ type: "warn", msg, timestamp: time });
  },
  error: (msg: string, err?: unknown) => {
    const time = ts();
    console.error(`[${time}] ERROR ${msg}`);
    if (err instanceof Error) console.error(err.stack);
    else if (err) console.error(err);
    broadcast({ type: "error", msg: `${msg}${err ? ` - ${err}` : ""}`, timestamp: time });
  },
};
