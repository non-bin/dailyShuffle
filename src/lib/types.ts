export interface UserProfile {
  display_name: string;
  email: string;
  id: string;
}

export function isUserProfile(x: any): x is UserProfile {
  if (typeof x.display_name === 'string' && typeof x.email === 'string' && typeof x.id === 'string') {
    return true;
  } else {
    return false;
  }
}

export interface User {
  accessToken?: string;
  email: string;
}

export function isUser(x: any): x is User {
  if (
    x &&
    typeof x === 'object' &&
    (typeof x.accessToken === 'string' || x.accessToken === null) &&
    typeof x.email === 'string'
  ) {
    return true;
  } else {
    return false;
  }
}

export interface Playlist {
  id: string;
  name: string;
  tracks: { total: number };
  external_urls: { spotify: string };
  snapshot_id: string;
}

export function isPlaylist(x: any): x is Playlist {
  if (
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    typeof x.tracks === 'object' &&
    typeof x.tracks.total === 'number' &&
    typeof x.external_urls === 'object' &&
    typeof x.external_urls.spotify === 'string' &&
    typeof x.snapshot_id === 'string'
  ) {
    return true;
  } else {
    return false;
  }
}

export function isPlaylists(x: any): x is Playlist[] {
  x.forEach((y: any) => {
    if (!isPlaylist(y)) {
      return false;
    }
  });
  return true;
}
