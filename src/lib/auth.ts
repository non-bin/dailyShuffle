/**
 * Daily Shuffle - lib/auth.ts
 * Handle authentication with the Spotify API
 *
 * Copyright (C) 2025  Alice Jacka, licensed under AGPL 3.0
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as api from './api';
import * as db from './db';
import * as s from './shuffler';
import * as t from './types';

/** Permissions to request from the Spotify API */
const SCOPE = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';

// Env vars
const REDIRECT_URL = process.env.DAILYSHUFFLE_REDIRECT_URL || 'http://127.0.0.1:8080/callback';
const CLIENT_ID = process.env.DAILYSHUFFLE_CLIENT_ID || '';
if (CLIENT_ID.length === 0) {
  s.error(new Error('Please set DAILYSHUFFLE_CLIENT_ID'));
}
const CLIENT_SECRET = process.env.DAILYSHUFFLE_CLIENT_SECRET || '';
if (CLIENT_SECRET.length === 0) {
  s.error(new Error('Please set DAILYSHUFFLE_CLIENT_SECRET'));
}

const AUTHORIZATION = 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');

/** Stores nonces used to auth with the Spotify API */
let verifiers: ({ verifier: string; expiry: Date } | null)[] = [];

/** Remove expired nonces */
export function cleanVerifiers() {
  const now = new Date();

  for (let i = 0; i < verifiers.length; i++) {
    const x = verifiers[i];
    if (!x || x.expiry < now) {
      verifiers[i] = null;
    }
  }
}

/**
 * @param expiry Default is 15 minutes
 */
function addVerifier(verifier: string, expiry: Date = new Date(Date.now() + 15 * 60 * 1000)): number {
  for (let i = 0; i < verifiers.length; i++) {
    if (!verifiers[i]) {
      verifiers[i] = { verifier, expiry };
      return i;
    }
  }

  return verifiers.push({ verifier, expiry }) - 1;
}

function removeVerifier(index: number): string | null {
  const entry = verifiers[index];
  verifiers[index] = null;

  if (!entry || entry.expiry < new Date()) return null;
  return entry.verifier;
}

/**
 * Redirect the user to Spotify api authentication, which will then redirect to {@link completeAuth}
 */
export async function redirectToAuth(req: Bun.BunRequest) {
  const verifier = randomString(128);
  req.cookies.set('verifier', addVerifier(verifier).toString(), { maxAge: 60 * 15 }); // 15 minutes
  const challenge = await generateCodeChallenge(verifier);

  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('response_type', 'code');
  params.append('redirect_uri', REDIRECT_URL);
  params.append('scope', SCOPE);
  params.append('code_challenge_method', 'S256');
  params.append('code_challenge', challenge);

  const res = new Response();

  return Response.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
}

/**
 * Process the response from Spotify api authentication, and save the user to the database
 */
export async function completeAuth(req: Bun.BunRequest) {
  try {
    const verifierIndex = req.cookies.get('verifier');
    if (!verifierIndex) {
      s.error(new Error('No verifier! Maybe your session expired'));
    }
    const verifier = removeVerifier(Number.parseInt(verifierIndex));
    if (!verifier) {
      s.error(new Error('No verifier! Maybe your session expired'));
    }

    const code = new URLSearchParams(new URL(req.url).search).get('code');

    if (!code) {
      return new Response('No code!', { status: 500 });
    }

    const accessTokenResponse = await getInitialAccessToken(verifier, code);
    const profile = await api.fetchUserProfile(accessTokenResponse.access_token);
    const sessionToken = db.newSessionToken(req, profile.id);

    db.setUser({
      uid: profile.id,
      email: profile.email,
      accessToken: accessTokenResponse.access_token,
      accessTokenExpiry: new Date(Date.now() + accessTokenResponse.expires_in * 1000),
      refreshToken: accessTokenResponse.refresh_token,
      sessionToken,
      sessionTokenOld: undefined, // clear
      sessionTokenExpiry: new Date(Date.now() + 6 * 60 * 60 * 1000) // 6h
    });

    return Response.redirect('/');
  } catch (err) {
    s.error(err, false);

    return new Response(Error.isError(err) ? `ERROR: ${err.message}` : 'UNKNOWN', { status: 500 });
  }
}

/** Used as a nonce during Spotify API authentication */
function randomString(length: number) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Get the first access token after authenticating
 */
async function getInitialAccessToken(verifier: string, code: string): Promise<t.AccessTokenResponse> {
  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', REDIRECT_URL);
  params.append('code_verifier', verifier);

  const result = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then((res) => res.json());

  if (t.isAccessTokenResponse(result)) {
    return result;
  }

  s.error(new Error('Server response did not contain an accessToken!', { cause: result }));
}

/**
 * Get a new access token using the refresh token from the last one
 */
export async function refreshAccessToken(refreshToken: string): Promise<t.AccessTokenResponse> {
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);

  const result = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': AUTHORIZATION },
    body: params
  }).then((res) => res.json());

  if (t.isAccessTokenResponse(result)) {
    return result;
  }

  s.error(new Error('Server response did not contain an accessToken!', { cause: result }));
}
