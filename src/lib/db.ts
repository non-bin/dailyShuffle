/**
 * Daily Shuffle - lib/db.ts
 * Stores and interacts with persistent data like users and jobs
 *
 * Copyright (C) 2025  Alice Jacka, licensed under AGPL 3.0
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Database } from 'bun:sqlite';
import * as t from './types';
import * as s from './shuffler';

const db = new Database('dailyShuffle.sqlite', { create: true, strict: true });
db.query(
  `
    CREATE TABLE IF NOT EXISTS users (
      uid STRING PRIMARY KEY,
      email STRING NOT NULL,
      accessToken STRING,
      accessTokenExpiry INT,
      refreshToken STRING,
      sessionToken STRING,
      sessionTokenExpiry INT
    );
  `
).run();

db.query(
  `
    CREATE TABLE IF NOT EXISTS jobs (
      uid STRING REFERENCES users,
      sourcePID STRING,
      destinationPID STRING PRIMARY KEY
    );
  `
).run();

export function setUser(user: t.User) {
  db.query(
    'INSERT OR REPLACE INTO users (uid, email, accessToken, accessTokenExpiry, refreshToken, sessionToken, sessionTokenExpiry) VALUES (?, ?, ?, ?, ?, ?, ?);'
  ).run(
    user.uid,
    user.email,
    user.accessToken || null,
    user.accessTokenExpiry?.getTime() || null,
    user.refreshToken || null,
    user.sessionToken || null,
    user.sessionTokenExpiry?.getTime() || null
  );
}

export function getUser(uid: string): t.User | null {
  const res = db
    .query(
      'SELECT uid, email, accessToken, accessTokenExpiry, refreshToken, sessionToken, sessionTokenExpiry FROM users WHERE uid = ?;'
    )
    .get(uid);

  if (!res || typeof res !== 'object') return null;

  if (!('accessTokenExpiry' in res) || typeof res.accessTokenExpiry !== 'number')
    s.error(new TypeError('Invalid accessTokenExpiry!', { cause: res }));
  res.accessTokenExpiry = new Date(res.accessTokenExpiry);
  if (!('sessionTokenExpiry' in res) || typeof res.sessionTokenExpiry !== 'number')
    s.error(new TypeError('Invalid sessionTokenExpiry!', { cause: res }));
  res.sessionTokenExpiry = new Date(res.sessionTokenExpiry);

  if (!t.isUser(res)) s.error(new TypeError('Not an instance of User!', { cause: res }));

  return res;
}

export function setJob(job: t.Job) {
  db.query('INSERT OR REPLACE INTO jobs (uid, destinationPID, sourcePID) VALUES (?, ?, ?);').run(
    job.uid,
    job.destinationPID,
    job.sourcePID
  );
}

export function deleteJob(destinationPID: string) {
  const res = db.query('DELETE FROM jobs WHERE destinationPID = ? RETURNING destinationPID;').run(destinationPID);
  if (res.changes > 1) s.error(new Error('Invalid response!', { cause: { res, destinationPID } }));
  if (res.changes < 1) s.error(new Error('No such job!', { cause: { res, destinationPID } }));
}

export function getJob(destinationPID: string): t.Job | null {
  const res = db.query('SELECT uid, destinationPID, sourcePID FROM jobs WHERE destinationPID = ?;').get(destinationPID);

  if (!res || typeof res !== 'object') return null;

  if (!t.isJob(res)) s.error(new TypeError('Not an instance of Job!', { cause: res }));

  return res;
}

export function getUserJobs(uid: string): t.Job[] {
  const res = db.query('SELECT uid, destinationPID, sourcePID FROM jobs WHERE uid = ?;').all(uid);

  if (!res || typeof res !== 'object') return [];

  const out: t.Job[] = [];

  for (const job of res) {
    if (!t.isJob(job)) s.error(new TypeError('Not an instance of Job!', { cause: job }));

    out.push(job);
  }

  return out;
}

export function getAllJobs(): t.Job[] {
  const res = db.query('SELECT uid, destinationPID, sourcePID FROM jobs;').all();

  if (!res || typeof res !== 'object') return [];

  const out: t.Job[] = [];

  for (const job of res) {
    if (!t.isJob(job)) s.error(new TypeError('Not an instance of Job!', { cause: job }));

    out.push(job);
  }

  return out;
}

function updateSessionToken(uid: string, newSessionToken: string) {
  db.query('UPDATE users SET sessionToken = ? WHERE uid = ?;').run(newSessionToken, uid);
}

export function newSessionToken(req: Bun.BunRequest, uid: string): string {
  const sessionToken = crypto.randomUUID();
  req.cookies.set('sessionToken', sessionToken, { maxAge: 6 * 60 * 60 }); // 6h
  req.cookies.set('uid', uid, { maxAge: 6 * 60 * 60 }); // 6h

  updateSessionToken(uid, sessionToken);

  return sessionToken;
}
