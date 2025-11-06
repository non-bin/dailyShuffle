import { Database } from 'bun:sqlite';

const CLIENT_ID = process.env.SPOTIFY_API_CLIENT_ID;
if (!CLIENT_ID || CLIENT_ID.length === 0) {
  throw new Error('Please set SPOTIFY_API_CLIENT_ID');
}

const db = new Database('users.sqlite', { create: true, strict: true });
db.query(`CREATE TABLE IF NOT EXISTS users (uid STRING PRIMARY KEY, accessToken STRING, email STRING NOT NULL);`).run();

const server = Bun.serve({
  port: 5173,
  routes: {
    '/': (req) => {
      return redirectToAuth(req);
    },

    '/callback': (req) => {
      return completeAuth(req);
    },

    '/test': (req) => {
      return test(req);
    }
  },

  fetch(req) {
    return new Response('Not Found', { status: 404 });
  }
});

console.log(`Server running at ${server.url}`);

async function test(req: Bun.BunRequest) {
  const uid = new URLSearchParams(new URL(req.url).search).get('uid');

  if (!uid) return new Response('Missing uid parameter', { status: 400 });
  const user = getUser(uid);
  if (!user) return new Response('Unknown uid', { status: 401 });
  if (!user.accessToken) return new Response('User is not authenticated', { status: 401 });

  return Response.json(await fetchProfile(user.accessToken));
}

async function completeAuth(req: Bun.BunRequest) {
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
    const profile = await fetchProfile(accessToken);

    setUser(profile.id, { accessToken, email: profile.email });

    return Response.json(profile);
  } catch (err) {
    console.error(err);

    return new Response(Error.isError(err) ? `ERROR: ${err.message}` : 'UNKNOWN', { status: 500 });
  }
}

async function redirectToAuth(req: Bun.BunRequest) {
  const verifier = generateCodeVerifier(128);
  req.cookies.set('verifier', verifier, { maxAge: 60 * 15 }); // 15 minutes
  const challenge = await generateCodeChallenge(verifier);

  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('response_type', 'code');
  params.append('redirect_uri', 'http://127.0.0.1:5173/callback');
  params.append('scope', 'user-read-private user-read-email');
  params.append('code_challenge_method', 'S256');
  params.append('code_challenge', challenge);

  const res = new Response();

  return Response.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
}

function generateCodeVerifier(length: number) {
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

async function getAccessToken(verifier: string, code: string): Promise<string> {
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

  if (result && typeof result === 'object' && 'access_token' in result) {
    return result.access_token as string;
  }

  throw new Error('No access_token!');
}

async function fetchProfile(token: string): Promise<UserProfile> {
  const result = await fetch('https://api.spotify.com/v1/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` }
  }).then((res) => res.json());

  if (!isUserProfile(result)) {
    console.error('Server response was not a UserProfile!', result);

    throw new Error('Server response was not a UserProfile!');
  }

  return result;
}

function setUser(uid: string, user: User) {
  db.query('INSERT OR REPLACE INTO users (uid, accessToken, email) VALUES (?, ?, ?);').run(
    uid,
    user.accessToken || null,
    user.email
  );
}

function getUser(uid: string): User | null {
  const res = db.query('SELECT accessToken, email FROM users WHERE uid = ?').get(uid);
  if (isUser(res)) {
    return res;
  }

  return null;
}

// Types //

function isUserProfile(input: any): input is UserProfile {
  if (typeof input.display_name === 'string' && typeof input.email === 'string' && typeof input.id === 'string') {
    return true;
  } else {
    return false;
  }
}

interface UserProfile {
  display_name: string;
  email: string;
  id: string;
}

function isUser(input: any): input is User {
  if (
    input &&
    typeof input === 'object' &&
    'accessToken' in input &&
    (typeof input.accessToken === 'string' || input.accessToken === null) &&
    typeof input.email === 'string'
  ) {
    return true;
  } else {
    return false;
  }
}

interface User {
  accessToken?: string;
  email: string;
}
