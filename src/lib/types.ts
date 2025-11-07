export type bunServeHandler = Bun.Serve.Handler<Bun.BunRequest, Bun.Server<undefined>, Response>;

export function isListOf<T>(x: any, typeGuard: (x: any) => x is T): x is T[] {
  x.forEach((y: any) => {
    if (!typeGuard(y)) {
      return false;
    }
  });
  return true;
}

export interface UserProfile {
  display_name: string;
  email: string;
  id: string;
}

export function isUserProfile(x: any): x is UserProfile {
  if (x && typeof x === 'object' && 'string' && typeof x.email === 'string' && typeof x.id === 'string') {
    return true;
  } else {
    return false;
  }
}

export interface User {
  uid: string;
  email: string;
  accessToken?: string;
  tokenExpiry?: Date;
  refreshToken?: string;
}

export function isUser(x: any): x is User {
  if (
    x &&
    typeof x === 'object' &&
    typeof x.uid === 'string' &&
    typeof x.email === 'string' &&
    (typeof x.accessToken === 'string' || x.accessToken === null) &&
    (x.tokenExpiry instanceof Date || x.tokenExpiry === null) &&
    (typeof x.refreshToken === 'string' || x.refreshToken === null)
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
    x &&
    typeof x === 'object' &&
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

export interface AccessTokenResponse {
  access_token: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}

export function isAccessTokenResponse(x: any): x is AccessTokenResponse {
  if (
    x &&
    typeof x === 'object' &&
    typeof x.access_token === 'string' &&
    typeof x.scope === 'string' &&
    typeof x.expires_in === 'number' &&
    typeof x.refresh_token === 'string'
  ) {
    return true;
  } else {
    return false;
  }
}
