import { Database } from 'bun:sqlite';
import * as t from './types';

const db = new Database('dailyShuffle.sqlite', { create: true, strict: true });
db.query(
  `
    CREATE TABLE IF NOT EXISTS users (
      uid STRING PRIMARY KEY,
      email STRING NOT NULL,
      accessToken STRING,
      tokenExpiry NUMBER,
      refreshToken STRING
    );
  `
).run();

export function setUser(user: t.User) {
  db.query(
    'INSERT OR REPLACE INTO users (uid, email, accessToken, tokenExpiry, refreshToken) VALUES (?, ?, ?, ?, ?);'
  ).run(user.uid, user.email, user.accessToken || null, user.tokenExpiry?.getTime() || null, user.refreshToken || null);
}

export function getUser(uid: string): t.User | null {
  const res = db.query('SELECT uid, email, accessToken, tokenExpiry, refreshToken FROM users WHERE uid = ?').get(uid);

  if (!res || typeof res !== 'object') return null;

  if (!('tokenExpiry' in res) || typeof res.tokenExpiry !== 'number') throw new TypeError('Not an instance of User!');
  res.tokenExpiry = new Date(res.tokenExpiry);

  if (!t.isUser(res)) throw new TypeError('Not an instance of User!' + JSON.stringify(res));

  return res;
}
