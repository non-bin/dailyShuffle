/**
 * Daily Shuffle - lib/types.ts
 * TypeScript object type definitions
 *
 * Copyright (C) 2025  Alice Jacka
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

export function isListOf<T>(x: any, typeGuard: (x: any) => x is T): x is T[] {
  for (const y of x) {
    if (!typeGuard(y)) {
      return false;
    }
  }
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
  accessTokenExpiry?: Date;
  refreshToken?: string;
  sessionToken?: string;
  sessionTokenOld?: string;
  sessionTokenExpiry?: Date;
}

export function isUser(x: any): x is User {
  if (
    x
    && typeof x === 'object'
    && typeof x.uid === 'string'
    && typeof x.email === 'string'
    && (typeof x.accessToken === 'string' || x.accessToken === null)
    && (x.accessTokenExpiry instanceof Date || x.accessTokenExpiry === null)
    && (typeof x.refreshToken === 'string' || x.refreshToken === null)
    && (typeof x.sessionToken === 'string' || x.sessionToken === null)
    && (typeof x.sessionTokenOld === 'string' || x.sessionTokenOld === null)
    && (x.sessionTokenExpiry instanceof Date || x.sessionTokenExpiry === null)
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
    x
    && typeof x === 'object'
    && typeof x.id === 'string'
    && typeof x.name === 'string'
    && typeof x.tracks === 'object'
    && typeof x.tracks.total === 'number'
    && typeof x.external_urls === 'object'
    && typeof x.external_urls.spotify === 'string'
    && typeof x.snapshot_id === 'string'
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
    x
    && typeof x === 'object'
    && typeof x.access_token === 'string'
    && typeof x.scope === 'string'
    && typeof x.expires_in === 'number'
    && typeof x.refresh_token === 'string'
  ) {
    return true;
  } else {
    return false;
  }
}

export interface Job {
  uid: string;
  destinationPID: string;
  sourcePID: string;
}

export function isJob(x: any): x is Job {
  if (
    x
    && typeof x === 'object'
    && typeof x.uid === 'string'
    && typeof x.destinationPID === 'string'
    && typeof x.sourcePID === 'string'
  ) {
    return true;
  } else {
    return false;
  }
}

export interface JobWithNames extends Job {
  sourceName: string;
  destinationName: string;
}

export function isJobWithNames(x: any): x is JobWithNames {
  if (
    isJob(x)
    && 'sourceName' in x
    && typeof x.sourceName === 'string'
    && 'destinationName' in x
    && typeof x.destinationName === 'string'
  ) {
    return true;
  } else {
    return false;
  }
}
