/**
 * Daily Shuffle - lib/api.ts
 * Interacts with the Spotify API for everything except authentication (see lib/auth.ts for that)
 *
 * Copyright (C) 2025  Alice Jacka
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import * as s from './shuffler';
import * as t from './types';

/** Users are limited to 11000 playlists, and 11000 tracks in each https://developer.spotify.com/documentation/web-api/reference/create-playlist */
const MAX_LOOPS = 300;

export async function fetchUserProfile(accessToken: string): Promise<t.UserProfile> {
  const result = await fetch('https://api.spotify.com/v1/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((res) => res.json());

  if (!t.isUserProfile(result)) {
    s.error(new Error('Server response was not a UserProfile!', { cause: result }));
  }

  return result;
}

export async function fetchUserPlaylists(accessToken: string): Promise<t.Playlist[]> {
  let items: t.Playlist[] = [];

  // Fetch the first 50 from this endpoint
  let next = 'https://api.spotify.com/v1/me/playlists?limit=50';
  for (let i = 0; i < MAX_LOOPS; i++) {
    const result = await fetch(next, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((res) => res.json());

    if (result && typeof result === 'object' && 'items' in result && t.isListOf(result.items, t.isPlaylist)) {
      items = items.concat(result.items);

      if ('next' in result && typeof result.next === 'string') {
        // Then get the next page using the endpoint provided in the response
        next = result.next;
      } else {
        return items;
      }
    } else {
      s.error(
        new Error('Server response was not a list of Playlists!', {
          cause: result,
        }),
      );
    }
  }

  s.error(new Error(`Looped more than ${MAX_LOOPS} times!`, { cause: items }));
}

export async function createPlaylist(
  accessToken: string,
  uid: string,
  name: string,
  description: string = '',
  publicAccess: boolean = true,
): Promise<t.Playlist> {
  const result = await fetch(`https://api.spotify.com/v1/users/${uid}/playlists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ name, description, public: publicAccess }),
  }).then((res) => res.json());

  if (t.isPlaylist(result)) {
    return result;
  }

  s.error(new Error('Server response was not a Playlist!', { cause: result }));
}

export async function fetchPlaylist(accessToken: string, pid: string): Promise<t.Playlist> {
  const result = await fetch(`https://api.spotify.com/v1/playlists/${pid}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((res) => res.json());

  if (!t.isPlaylist(result)) {
    s.error(new Error('Server response was not a Playlist!', { cause: result }));
  }

  return result;
}

/**
 * @returns The list of track URIs in the playlist
 */
export async function fetchPlaylistTracks(accessToken: string, pid: string): Promise<string[]> {
  let items: string[] = [];
  let next = `https://api.spotify.com/v1/playlists/${pid}/tracks?limit=50&fields=next,items(track(uri))`;
  for (let i = 0; i < MAX_LOOPS; i++) {
    const result = await fetch(next, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((res) => res.json());

    if (result && typeof result === 'object' && 'items' in result && Array.isArray(result.items)) {
      for (const item of result.items) {
        if ('track' in item) {
          if (item.track && typeof item.track === 'object' && 'uri' in item.track && typeof item.track.uri === 'string')
            items.push(item.track.uri);
          else s.log(`Invalid track in ${pid}, ignoring`, true, item);
        } else
          s.error(
            new Error('Server response was not a list of Playlists!', {
              cause: item,
            }),
          );
      }

      if ('next' in result && typeof result.next === 'string') {
        next = result.next;
      } else {
        return items;
      }
    } else {
      s.error(
        new Error('Server response was not a list of Playlists!', {
          cause: result,
        }),
      );
    }
  }

  s.error(new Error(`Looped more than ${MAX_LOOPS} times!`, { cause: items }));
}

/**
 * @returns New snapshot_id
 */
export async function updatePlaylistTracks(accessToken: string, pid: string, tracksURIs: string[]): Promise<string> {
  let snapshotId = '';

  // Initial chunk
  const result = await fetch(`https://api.spotify.com/v1/playlists/${pid}/tracks`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ uris: tracksURIs.slice(0, 100) }),
  }).then((res) => res.json());

  if (!(result && typeof result === 'object' && 'snapshot_id' in result && typeof result.snapshot_id === 'string'))
    s.error(
      new Error('Server response did not contain a snapshot_id!', {
        cause: result,
      }),
    );

  snapshotId = result.snapshot_id;

  // Leftovers
  for (let i = 100; i < tracksURIs.length; i += 100) {
    const result = await fetch(`https://api.spotify.com/v1/playlists/${pid}/tracks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ uris: tracksURIs.slice(i, i + 100) }),
    }).then((res) => res.json());

    if (!(result && typeof result === 'object' && 'snapshot_id' in result && typeof result.snapshot_id === 'string'))
      s.error(
        new Error('Server response did not contain a snapshot_id!', {
          cause: result,
        }),
      );

    snapshotId = result.snapshot_id;
  }

  return snapshotId;
}
