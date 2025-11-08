import * as t from './types';
import * as auth from './auth';
import * as api from './api';
import * as db from './db';

/**
 * Returns the access token from the db if it's still valid, otherwise gets a new one with {@link refreshAccessToken}
 */
export async function getAccessToken(uid: string, expiryWindowMinutes: number = 5): Promise<string> {
  const user = db.getUser(uid);
  if (!user) throw new Error('Unknown uid!');

  if (
    user.accessToken &&
    user.accessTokenExpiry &&
    user.accessTokenExpiry > new Date(Date.now() + expiryWindowMinutes * 60000)
  ) {
    return user.accessToken;
  }

  if (user.refreshToken) {
    const res = await auth.refreshAccessToken(user.refreshToken);

    user.accessToken = res.access_token;
    user.accessTokenExpiry = new Date(Date.now() + res.expires_in * 1000);
    user.refreshToken = res.refresh_token;

    db.setUser(user);

    return (await res).access_token;
  }

  throw new Error('Not authenticated!');
}

/**
 * Shuffle an array in place
 * https://stackoverflow.com/a/2450976/10805855
 * https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
 */
export function shuffle(array: any[]) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
}

export async function runJob(job: t.Job) {
  const accessToken = await getAccessToken(job.uid);
  const tracks = await api.fetchPlaylistTracks(accessToken, job.sourcePID);
  shuffle(tracks);
  await api.updatePlaylistTracks(accessToken, job.destinationPID, tracks);
}

export function runAllJobs() {
  const jobs = db.getAllJobs();
  jobs.forEach(async (job) => {
    try {
      await runJob(job);
    } catch (err) {
      console.error('Error while processing job:', job);

      if (err instanceof Error) console.error('Cause:', err.cause);
      console.error(err);
    }
  });
}

/**
 * @returns uid
 */
export async function checkSessionToken(req: Bun.BunRequest): Promise<string | null> {
  const sessionToken = req.cookies.get('sessionToken');
  const uid = req.cookies.get('uid');

  if (!sessionToken || !uid) return null;

  const user = db.getUser(uid);
  const now = new Date();

  if (
    user &&
    user.sessionToken &&
    user.sessionTokenExpiry &&
    user.sessionToken === sessionToken &&
    user.sessionTokenExpiry > now
  ) {
    db.newSessionToken(req, uid);
    return uid;
  }

  return null;
}

export async function userPlaylists(uid: string | null): Promise<t.Playlist[] | null> {
  if (uid) {
    const accessToken = await getAccessToken(uid);
    if (accessToken) {
      return api.fetchUserPlaylists(accessToken);
    }
  }

  return null;
}

export async function userJobs(uid: string | null): Promise<t.Job[] | null> {
  if (uid) return db.getUserJobs(uid);

  return null;
}

export async function setJob(job: t.Job) {
  db.setJob(job);
}
