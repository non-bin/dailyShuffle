import * as api from "./api";
import * as db from "./db";

export async function redirectToAuth(req: Bun.BunRequest) {
  const verifier = generateCodeVerifier(128);
  req.cookies.set('verifier', verifier, { maxAge: 60 * 15 }); // 15 minutes
  const challenge = await generateCodeChallenge(verifier);

  const params = new URLSearchParams();
  params.append('client_id', api.CLIENT_ID);
  params.append('response_type', 'code');
  params.append('redirect_uri', 'http://127.0.0.1:5173/callback');
  params.append('scope', 'user-read-private user-read-email playlist-modify-private');
  params.append('code_challenge_method', 'S256');
  params.append('code_challenge', challenge);

  const res = new Response();

  return Response.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
}

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

    const accessToken = await getAccessToken(verifier, code);
    const profile = await api.fetchProfile(accessToken);

    db.setUser(profile.id, { accessToken, email: profile.email });

    return Response.json(profile);
  } catch (err) {
    console.error(err);

    return new Response(Error.isError(err) ? `ERROR: ${err.message}` : 'UNKNOWN', { status: 500 });
  }
}

export function generateCodeVerifier(length: number) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function getAccessToken(verifier: string, code: string): Promise<string> {
  const params = new URLSearchParams();
  params.append('client_id', api.CLIENT_ID);
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', 'http://127.0.0.1:5173/callback');
  params.append('code_verifier', verifier);

  const result = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then((res) => res.json());

  if (result && typeof result === 'object' && 'access_token' in result) {
    return result.access_token as string;
  }

  throw new Error('No access_token!');
}
