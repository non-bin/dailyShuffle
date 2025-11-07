import { Database } from 'bun:sqlite';
import * as t from './types';

const db = new Database('dailyShuffle.sqlite', { create: true, strict: true });
db.query(
  `
    CREATE TABLE IF NOT EXISTS users (
      uid STRING PRIMARY KEY,
      email STRING NOT NULL,
      accessToken STRING,
      accessTokenExpiry INT,
      refreshToken STRING
    );
  `
).run();

db.query(
  `
    CREATE TABLE IF NOT EXISTS jobs (
      uid STRING REFERENCES users,
      sourcePID STRING,
      destinationPID STRING PRIMARY KEY,
      nextRun INT
    );
  `
).run();

export function setUser(user: t.User) {
  db.query(
    'INSERT OR REPLACE INTO users (uid, email, accessToken, accessTokenExpiry, refreshToken) VALUES (?, ?, ?, ?, ?);'
  ).run(
    user.uid,
    user.email,
    user.accessToken || null,
    user.accessTokenExpiry?.getTime() || null,
    user.refreshToken || null
  );
}

export function getUser(uid: string): t.User | null {
  const res = db
    .query('SELECT uid, email, accessToken, accessTokenExpiry, refreshToken FROM users WHERE uid = ?;')
    .get(uid);

  if (!res || typeof res !== 'object') return null;

  if (!('accessTokenExpiry' in res) || typeof res.accessTokenExpiry !== 'number')
    throw new TypeError('Invalid accessTokenExpiry!');
  res.accessTokenExpiry = new Date(res.accessTokenExpiry);

  if (!t.isUser(res)) throw new TypeError('Not an instance of User!', { cause: res });

  return res;
}

export function setJob(job: t.Job) {
  db.query('INSERT OR REPLACE INTO jobs (uid, destinationPID, sourcePID, nextRun) VALUES (?, ?, ?, ?);').run(
    job.uid,
    job.destinationPID,
    job.sourcePID,
    job.nextRun.getTime()
  );
}

export function getJob(destinationPID: string): t.Job | null {
  const res = db
    .query('SELECT uid, destinationPID, sourcePID, nextRun FROM jobs WHERE destinationPID = ?;')
    .get(destinationPID);

  if (!res || typeof res !== 'object') return null;

  if (!('nextRun' in res) || typeof res.nextRun !== 'number') throw new TypeError('Invalid nextRun!');
  res.nextRun = new Date(res.nextRun);

  if (!t.isJob(res)) throw new TypeError('Not an instance of Job!', { cause: res });

  return res;
}

export function getUserJobs(uid: string): t.Job[] {
  const res = db.query('SELECT uid, destinationPID, sourcePID, nextRun FROM jobs WHERE uid = ?;').all(uid);

  if (!res || typeof res !== 'object') return [];

  const out: t.Job[] = [];

  res.forEach((job) => {
    if (!job || typeof job !== 'object' || !('nextRun' in job) || typeof job.nextRun !== 'number')
      throw new TypeError('Invalid nextRun!');
    job.nextRun = new Date(job.nextRun);

    if (!t.isJob(job)) throw new TypeError('Not an instance of Job!', { cause: job });

    out.push(job);
  });

  return out;
}

export function getAllJobs(): t.Job[] {
  const res = db.query('SELECT uid, destinationPID, sourcePID, nextRun FROM jobs;').all();

  if (!res || typeof res !== 'object') return [];

  const out: t.Job[] = [];

  res.forEach((job) => {
    if (!job || typeof job !== 'object' || !('nextRun' in job) || typeof job.nextRun !== 'number')
      throw new TypeError('Invalid nextRun!');
    job.nextRun = new Date(job.nextRun);

    if (!t.isJob(job)) throw new TypeError('Not an instance of Job!', { cause: job });

    out.push(job);
  });

  return out;
}
