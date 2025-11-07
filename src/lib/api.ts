import * as t from './types';
import * as auth from './auth';
import * as db from './db';
import { shuffle } from './helpers';

export async function fetchProfile(accessToken: string): Promise<t.UserProfile> {
  const result = await fetch('https://api.spotify.com/v1/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` }
  }).then((res) => res.json());

  if (!t.isUserProfile(result)) {
    throw new Error('Server response was not a UserProfile!', { cause: result });
  }

  return result;
}

export async function fetchUserPlaylists(token: string): Promise<t.Playlist[]> {
  let items: t.Playlist[] = [];
  let next = 'https://api.spotify.com/v1/me/playlists?limit=50';
  do {
    const result = await fetch(next, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    }).then((res) => res.json());

    if (result && typeof result === 'object' && 'items' in result && t.isListOf(result.items, t.isPlaylist)) {
      items = items.concat(result.items);

      if ('next' in result && typeof result.next === 'string') {
        next = result.next;
      } else {
        break;
      }
    } else {
      throw new Error('Server response was not a list of Playlists!', { cause: result });
    }
  } while (next);

  return items;
}

export async function createPlaylist(
  accessToken: string,
  uid: string,
  name: string,
  description: string = '',
  publicAccess: boolean = true
): Promise<t.Playlist> {
  const result = await fetch(`https://api.spotify.com/v1/users/${uid}/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify({ name, description, public: publicAccess })
  }).then((res) => res.json());

  if (t.isPlaylist(result)) {
    return result;
  }

  throw new Error('Server response was not a Playlist!', { cause: result });
}

export async function fetchPlaylist(pid: string, accessToken: string): Promise<t.Playlist> {
  const result = await fetch(`https://api.spotify.com/v1/playlists/${pid}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` }
  }).then((res) => res.json());

  if (!t.isPlaylist(result)) {
    throw new Error('Server response was not a Playlist!', { cause: result });
  }

  return result;
}

/**
 * @returns The list of track URIs in the playlist
 */
export async function fetchPlaylistTracks(token: string, pid: string): Promise<string[]> {
  let items: string[] = [];
  let next = `https://api.spotify.com/v1/playlists/${pid}/tracks?limit=50&fields=next,items(track(uri))`;
  do {
    const result = await fetch(next, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    }).then((res) => res.json());

    if (result && typeof result === 'object' && 'items' in result && Array.isArray(result.items)) {
      result.items.forEach((item) => {
        if (!('track' in item) || !('uri' in item.track) || typeof item.track.uri !== 'string') {
          throw new Error('Server response was not a list of Playlists!', { cause: item });
        }

        items.push(item.track.uri);
      });

      if ('next' in result && typeof result.next === 'string') {
        next = result.next;
      } else {
        break;
      }
    } else {
      throw new Error('Server response was not a list of Playlists!', { cause: result });
    }
  } while (next);

  return items;
}

/**
 * @returns New snapshot_id
 */
export async function updatePlaylistTracks(token: string, pid: string, tracksURIs: string[]): Promise<string> {
  let snapshotId = '';

  // Initial chunk
  const result = await fetch(`https://api.spotify.com/v1/playlists/${pid}/tracks`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ uris: tracksURIs.slice(0, 100) })
  }).then((res) => res.json());

  if (!(result && typeof result === 'object' && 'snapshot_id' in result && typeof result.snapshot_id === 'string'))
    throw new Error('Server response did not contain a snapshot_id!', { cause: result });

  snapshotId = result.snapshot_id;

  // Leftovers
  for (let i = 100; i < tracksURIs.length; i += 100) {
    const result = await fetch(`https://api.spotify.com/v1/playlists/${pid}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ uris: tracksURIs.slice(i, i + 100) })
    }).then((res) => res.json());

    if (!(result && typeof result === 'object' && 'snapshot_id' in result && typeof result.snapshot_id === 'string'))
      throw new Error('Server response did not contain a snapshot_id!', { cause: result });

    snapshotId = result.snapshot_id;
  }

  return snapshotId;
}

export async function runJob(job: t.Job) {
  const token = await auth.getAccessToken(job.uid);
  const tracks = await fetchPlaylistTracks(token, job.sourcePID);
  shuffle(tracks);
  await updatePlaylistTracks(token, job.destinationPID, tracks);
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
