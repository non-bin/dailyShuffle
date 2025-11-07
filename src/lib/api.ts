import * as t from './types';

export async function fetchProfile(accessToken: string): Promise<t.UserProfile> {
  const result = await fetch('https://api.spotify.com/v1/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` }
  }).then((res) => res.json());

  if (!t.isUserProfile(result)) {
    console.error('Server response was not a UserProfile!', result);

    throw new Error('Server response was not a UserProfile!');
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
      throw new Error('Server response was not a list of Playlists!');
    }
  } while (next);

  return items;
}

export async function createPlaylist(
  accessToken: string,
  uid: string,
  name: string,
  description: string,
  publicAccess: boolean = true
): Promise<t.Playlist> {
  const params = new URLSearchParams();
  params.append('name', name);
  params.append('description', description);
  params.append('public', publicAccess ? 'true' : 'false');

  const result = await fetch(`https://api.spotify.com/v1/users/${uid}/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    body: params
  }).then((res) => res.json());

  if (t.isPlaylist(result)) {
    return result;
  }

  throw new Error('No access_token!');
}
