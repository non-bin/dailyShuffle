import * as api from './api';
import * as db from './db';
import * as t from './types';

const CLIENT_ID = process.env.SPOTIFY_API_CLIENT_ID || '';
if (CLIENT_ID.length === 0) {
  throw new Error('Please set SPOTIFY_API_CLIENT_ID');
}
const CLIENT_SECRET = process.env.SPOTIFY_API_CLIENT_SECRET || '';
if (CLIENT_SECRET.length === 0) {
  throw new Error('Please set SPOTIFY_API_CLIENT_SECRET');
}
const AUTHORIZATION = 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64');

/**
 * Redirect the user to Spotify api authentication, which will then redirect to {@link completeAuth}
 */
export async function redirectToAuth(req: Bun.BunRequest) {
  const verifier = randomString(128);
  req.cookies.set('verifier', verifier, { maxAge: 60 * 15 }); // 15 minutes
  const challenge = await generateCodeChallenge(verifier);

  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('response_type', 'code');
  params.append('redirect_uri', 'http://127.0.0.1:5173/callback');
  params.append('scope', 'user-read-private user-read-email playlist-modify-private');
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
    const verifier = req.cookies.get('verifier');
    if (!verifier) {
      throw new Error('No verifier! Maybe your session expired');
    }

    const code = new URLSearchParams(new URL(req.url).search).get('code');

    if (!code) {
      return new Response('No code!', { status: 500 });
    }

    const res = await getInitialAccessToken(verifier, code);

    const profile = await api.fetchProfile(res.access_token);

    db.setUser({
      uid: profile.id,
      email: profile.email,
      accessToken: res.access_token,
      tokenExpiry: new Date(Date.now() + res.expires_in * 1000),
      refreshToken: res.refresh_token
    });

    return Response.json(profile);
  } catch (err) {
    console.error(err);

    return new Response(Error.isError(err) ? `ERROR: ${err.message}` : 'UNKNOWN', { status: 500 });
  }
}

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
  params.append('redirect_uri', 'http://127.0.0.1:5173/callback');
  params.append('code_verifier', verifier);

  const result = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then((res) => res.json());

  if (t.isAccessTokenResponse(result)) {
    return result;
  }

  throw new Error('No access_token!');
}

/**
 * Returns the access token from the db if it's still valid, otherwise gets a new one with {@link refreshAccessToken}
 */
export async function getAccessToken(uid: string, expiryWindowMinutes: number = 5): Promise<string> {
  const user = db.getUser(uid);
  if (!user) throw new Error('Unknown uid!');

  if (user.accessToken && user.tokenExpiry && user.tokenExpiry > new Date(Date.now() + expiryWindowMinutes * 60000)) {
    return user.accessToken;
  }

  if (user.refreshToken) {
    const res = await refreshAccessToken(user.refreshToken);

    user.accessToken = res.access_token;
    user.tokenExpiry = new Date(Date.now() + res.expires_in * 1000);
    user.refreshToken = res.refresh_token;

    db.setUser(user);

    return (await res).access_token;
  }

  throw new Error('Not authenticated!');
}

/**
 * Get a new access token using the refresh token from the last one
 */
async function refreshAccessToken(refreshToken: string): Promise<t.AccessTokenResponse> {
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

  throw new Error('No access_token!');
}
