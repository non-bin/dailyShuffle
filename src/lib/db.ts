import { Database } from 'bun:sqlite';
import * as t from "./types";

const db = new Database('users.sqlite', { create: true, strict: true });
db.query(`CREATE TABLE IF NOT EXISTS users (uid STRING PRIMARY KEY, accessToken STRING, email STRING NOT NULL);`).run();

export function setUser(uid: string, user: t.User) {
  db.query('INSERT OR REPLACE INTO users (uid, accessToken, email) VALUES (?, ?, ?);').run(
    uid,
    user.accessToken || null,
    user.email
  );
}

export function getUser(uid: string): t.User | null {
  const res = db.query('SELECT accessToken, email FROM users WHERE uid = ?').get(uid);
  if (t.isUser(res)) {
    return res;
  }

  return null;
}
