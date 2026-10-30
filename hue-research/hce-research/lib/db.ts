import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { SOURCE_DDL } from "./source-ddl.mjs";

// Một tệp SQLite dùng chung cho xác thực (Better Auth) và dữ liệu ứng dụng.
// Triển khai nhiều máy chủ/nhiều bản sao: thay bằng PostgreSQL.
const file = process.env.HCE_DB_PATH || path.join(process.cwd(), "data", "hce.db");
fs.mkdirSync(path.dirname(file), { recursive: true });

const g = globalThis as unknown as { __hceDb?: Database.Database };
export const db = (g.__hceDb ??= (() => {
  const d = new Database(file);
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  return d;
})());

db.exec(SOURCE_DDL);

db.exec(`
  CREATE TABLE IF NOT EXISTS user_data (
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    json TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, key)
  );
  CREATE TABLE IF NOT EXISTS usage (
    day TEXT NOT NULL,
    subject TEXT NOT NULL,
    n INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, subject)
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at INTEGER NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    detail TEXT
  );
  CREATE TABLE IF NOT EXISTS job_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    status TEXT NOT NULL,
    steps TEXT NOT NULL DEFAULT '[]',
    note TEXT
  );
`);

export function audit(userId: string | null, action: string, detail?: string) {
  db.prepare("INSERT INTO audit_log (at, user_id, action, detail) VALUES (?,?,?,?)").run(Date.now(), userId, action, detail?.slice(0, 500) ?? null);
}

/** Tăng bộ đếm trong ngày và trả về số đã dùng sau khi tăng; không tăng nếu đã chạm giới hạn. */
export function takeQuota(subject: string, limit: number): { ok: boolean; used: number } {
  const day = new Date().toISOString().slice(0, 10);
  const tx = db.transaction(() => {
    const row = db.prepare("SELECT n FROM usage WHERE day=? AND subject=?").get(day, subject) as { n: number } | undefined;
    const used = row?.n ?? 0;
    if (used >= limit) return { ok: false, used };
    db.prepare("INSERT INTO usage (day, subject, n) VALUES (?,?,1) ON CONFLICT(day, subject) DO UPDATE SET n = n + 1").run(day, subject);
    return { ok: true, used: used + 1 };
  });
  return tx();
}
