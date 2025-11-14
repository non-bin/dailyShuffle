/**
 * Daily Shuffle - lib/db.ts
 * Stores and interacts with persistent data like users and jobs
 *
 * Copyright (C) 2025  Alice Jacka
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { Database } from 'bun:sqlite';
import * as t from './types';
import * as s from './shuffler';

const DB_PATH = process.env.DAILYSHUFFLE_DB_PATH || 'dailyShuffle.sqlite';

const db = new Database(DB_PATH, { create: true, strict: true });
db.query(
  `
    CREATE TABLE IF NOT EXISTS users (
      uid STRING PRIMARY KEY,
      email STRING NOT NULL,
      accessToken STRING,
      accessTokenExpiry INT,
      refreshToken STRING,
      sessionToken STRING,
      sessionTokenOld STRING,
      sessionTokenExpiry INT
    );
  `,
).run();

db.query(
  `
    CREATE TABLE IF NOT EXISTS jobs (
      uid STRING REFERENCES users,
      sourcePID STRING,
      destinationPID STRING PRIMARY KEY
    );
  `,
).run();

export function setUser(user: t.User) {
  db.query(
    'INSERT OR REPLACE INTO users (uid, email, accessToken, accessTokenExpiry, refreshToken, sessionToken, sessionTokenOld, sessionTokenExpiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
  ).run(
    user.uid,
    user.email,
    user.accessToken || null,
    user.accessTokenExpiry?.getTime() || null,
    user.refreshToken || null,
    user.sessionToken || null,
    user.sessionTokenOld || null,
    user.sessionTokenExpiry?.getTime() || null,
  );
}

export function getUser(uid: string): t.User | null {
  const res = db
    .query(
      'SELECT uid, email, accessToken, accessTokenExpiry, refreshToken, sessionToken, sessionTokenOld, sessionTokenExpiry FROM users WHERE uid = ?;',
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
    job.sourcePID,
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

function updateSessionToken(uid: string, newSessionToken: string, expires: Date) {
  db.query(
    'UPDATE users SET sessionTokenOld = CASE WHEN sessionTokenExpiry > unixepoch("now")*1000 THEN sessionToken END, sessionToken = ?, sessionTokenExpiry = ? WHERE uid = ?;',
  ).run(newSessionToken, expires.getTime(), uid);
}

export function newSessionToken(req: Bun.BunRequest, uid: string): string {
  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 6 * 60 * 60);
  req.cookies.set('sessionToken', sessionToken, { expires }); // 6h
  req.cookies.set('uid', uid, { expires }); // 6h

  updateSessionToken(uid, sessionToken, expires);

  return sessionToken;
}

export function removeSessionTokens(uid: string) {
  db.query('UPDATE users SET sessionTokenOld = "", sessionToken = "", sessionTokenExpiry = 0 WHERE uid = ?;').run(uid);
}
