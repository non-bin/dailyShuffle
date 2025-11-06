import * as t from './types';

export const CLIENT_ID = process.env.SPOTIFY_API_CLIENT_ID || '';
if (CLIENT_ID.length === 0) {
  throw new Error('Please set SPOTIFY_API_CLIENT_ID');
}

export async function fetchProfile(token: string): Promise<t.UserProfile> {
  const result = await fetch('https://api.spotify.com/v1/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  }).then((res) => res.json());

  if (!t.isUserProfile(result)) {
    console.error('Server response was not a UserProfile!', result);

    throw new Error('Server response was not a UserProfile!');
  }

  return result;
}

export async function fetchUserPlaylists(token: string): Promise<t.Playlist[]> {
  // FIXME: pagination
  const result = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  }).then((res) => res.json());

  if (result && typeof result === 'object' && 'items' in result && t.isPlaylists(result.items)) {
    return result.items;
  }

  console.error('Server response was not a list of Playlists!', result);
  throw new Error('Server response was not a list of Playlists!');
}
